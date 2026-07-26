"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Helpers
async function verifyNotStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const role = user.app_metadata?.role || user.user_metadata?.role;
  if (role === "STAFF") throw new Error("Unauthorized: STAFF cannot access this resource.");
}
function applyDateFilter(query: any, from?: string, to?: string, dateColumn = "created_at") {
  if (from) query = query.gte(dateColumn, `${from}T00:00:00Z`);
  if (to) query = query.lte(dateColumn, `${to}T23:59:59Z`);
  return query;
}

// 1. Revenue & Payments
export async function getRevenuePaymentData(from?: string, to?: string) {
  await verifyNotStaff();
  const adminClient = createAdminClient();
  
  // payments has no created_at — join with orders to get order_date for filtering
  let paymentsQuery = adminClient
    .from("payments")
    .select("amount, payment_mode, payment_type, orders!inner(id, total_amount, status, created_at)");

  // Apply date filter on the joined orders table's created_at
  if (from) paymentsQuery = paymentsQuery.gte("orders.created_at", `${from}T00:00:00Z`);
  if (to) paymentsQuery = paymentsQuery.lte("orders.created_at", `${to}T23:59:59Z`);

  const { data: payments, error: paymentsError } = await paymentsQuery;
  
  if (paymentsError) {
    console.error("Payments fetch error:", paymentsError);
  }

  let totalRevenue = 0;
  let cashRev = 0;
  let upiRev = 0;

  // For stacked area chart: daily revenue by mode
  const dailyRev: Record<string, { cash: number, upi: number, total: number }> = {};
  const seenOrderIds = new Set<number>();
  
  payments?.forEach((p: any) => {
    const order = Array.isArray(p.orders) ? p.orders[0] : p.orders;
    if (!order) return;

    // Only sum revenue from COMPLETED orders, count it once per order
    if (order.status === "COMPLETED" && !seenOrderIds.has(order.id)) {
      seenOrderIds.add(order.id);
      totalRevenue += Number(order.total_amount) || 0;
    }

    const amt = Number(p.amount) || 0;
    if (p.payment_mode === "CASH") cashRev += amt;
    else if (p.payment_mode === "ONLINE") upiRev += amt;
    
    const dateStr = order.created_at ? order.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
    if (!dailyRev[dateStr]) dailyRev[dateStr] = { cash: 0, upi: 0, total: 0 };
    if (p.payment_mode === "CASH") dailyRev[dateStr].cash += amt;
    else if (p.payment_mode === "ONLINE") dailyRev[dateStr].upi += amt;
    dailyRev[dateStr].total += amt;
  });

  const chartData = Object.keys(dailyRev).sort().map(date => ({
    date: new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    cash: dailyRev[date].cash,
    upi: dailyRev[date].upi,
    total: dailyRev[date].total
  }));

  let advanceCount = 0;
  let fullCount = 0;
  payments?.forEach((p: any) => {
    if (p.payment_type === "ADVANCE") advanceCount++;
    else fullCount++;
  });

  return {
    totalRevenue,
    cashRev,
    upiRev,
    chartData,
    paymentModeSplit: [
      { name: 'CASH', value: cashRev },
      { name: 'ONLINE', value: upiRev }
    ],
    orderTypeSplit: [
      { name: 'Advance/Booking', value: advanceCount },
      { name: 'Full Payment', value: fullCount }
    ]
  };
}

// 2. Sales Analytics
export async function getSalesAnalyticsData(from?: string, to?: string) {
  await verifyNotStaff();
  const adminClient = createAdminClient();

  let ordersQuery = adminClient.from("orders").select("id, total_amount, status, created_at, order_items(quantity, subtotal, products(name, category_id))");
  ordersQuery = applyDateFilter(ordersQuery, from, to);
  const { data: orders } = await ordersQuery;

  let totalOrders = 0;
  let totalRevenue = 0;
  let itemsSold = 0;
  let cancelledOrders = 0;

  const dailyOrders: Record<string, number> = {};
  const productStats: Record<string, { revenue: number, qty: number }> = {};
  const categoryStats: Record<number, number> = {}; // category_id -> revenue

  orders?.forEach(o => {
    if (o.status === "CANCELLED") {
      cancelledOrders++;
    } else {
      totalOrders++;
      totalRevenue += (o.total_amount || 0);

      const dateStr = o.created_at ? o.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
      dailyOrders[dateStr] = (dailyOrders[dateStr] || 0) + 1;

      if (o.status === "COMPLETED") {
        o.order_items?.forEach((item: any) => {
          itemsSold += (item.quantity || 0);
          
          const p = Array.isArray(item.products) ? item.products[0] : item.products;
          const pName = p?.name || "Unknown Product";
          const pCat = p?.category_id;
          
          if (!productStats[pName]) productStats[pName] = { revenue: 0, qty: 0 };
          productStats[pName].revenue += (item.subtotal || 0);
          productStats[pName].qty += (item.quantity || 0);

          if (pCat) {
            categoryStats[pCat] = (categoryStats[pCat] || 0) + (item.subtotal || 0);
          }
        });
      }
    }
  });

  const ordersOverTime = Object.keys(dailyOrders).sort().map(date => ({
    date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    count: dailyOrders[date]
  }));

  const topProducts = Object.entries(productStats)
    .map(([name, stats]) => ({ name, revenue: stats.revenue, qty: stats.qty }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Fetch category names for the donut
  const catIds = Object.keys(categoryStats).map(Number);
  let categorySplit: any[] = [];
  if (catIds.length > 0) {
    const { data: categories } = await adminClient.from("categories").select("id, name").in("id", catIds);
    categorySplit = categories?.map(c => ({
      name: c.name,
      value: categoryStats[c.id]
    })) || [];
  }

  return {
    totalOrders,
    avgOrderValue: totalOrders > 0 ? (totalRevenue / totalOrders) : 0,
    itemsSold,
    cancelledOrders,
    ordersOverTime,
    topProducts,
    categorySplit
  };
}

// 3. Inventory Intelligence
export async function getInventoryData() {
  await verifyNotStaff();
  const adminClient = createAdminClient();

  const { data: products } = await adminClient.from("products").select("id, product_code, name, stock_qty, cost_price, category:categories(name)");
  
  let totalSkus = 0;
  let totalStockQty = 0;
  let stockValue = 0;
  let outOfStock = 0;
  const categoryDist: Record<string, number> = {};
  
  products?.forEach(p => {
    totalSkus++;
    const qty = p.stock_qty || 0;
    totalStockQty += qty;
    stockValue += (qty * (p.cost_price || 0));
    
    if (qty === 0) outOfStock++;
    
    const catName = Array.isArray(p.category) ? (p.category[0] as any)?.name : (p.category as any)?.name || "Unknown";
    categoryDist[catName] = (categoryDist[catName] || 0) + qty;
  });

  const stockByCategory = Object.entries(categoryDist).map(([name, qty]) => ({ name, qty })).sort((a,b) => b.qty - a.qty);

  // Fast-moving & Dead stock (Based on last 90 days)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data: orderItems } = await adminClient
    .from("order_items")
    .select("product_id, quantity, orders!inner(status, created_at)")
    .eq("orders.status", "COMPLETED")
    .gte("orders.created_at", ninetyDaysAgo.toISOString());

  const productSalesQty: Record<number, number> = {};
  orderItems?.forEach((item: any) => {
    productSalesQty[item.product_id] = (productSalesQty[item.product_id] || 0) + (item.quantity || 0);
  });

  const fastMoving = products?.map(p => ({
    name: p.name,
    qtySold: productSalesQty[p.id] || 0
  })).sort((a, b) => b.qtySold - a.qtySold).slice(0, 10).filter(p => p.qtySold > 0) || [];

  const deadStock = products?.filter(p => p.stock_qty > 0 && (!productSalesQty[p.id] || productSalesQty[p.id] === 0)).map(p => ({
    code: p.product_code,
    name: p.name,
    stock: p.stock_qty
  })) || [];

  return {
    totalSkus,
    totalStockQty,
    stockValue,
    outOfStock,
    stockByCategory,
    fastMoving,
    deadStock
  };
}

// 4. Customer Insights
export async function getCustomerInsightsData(from?: string, to?: string) {
  await verifyNotStaff();
  const adminClient = createAdminClient();

  const { count: totalCustomers } = await adminClient.from("customers").select("*", { count: 'exact', head: true });
  
  let newCustomersQuery = adminClient.from("customers").select("id", { count: 'exact' });
  newCustomersQuery = applyDateFilter(newCustomersQuery, from, to);
  const { data: newCustData, count: newCustomersCount } = await newCustomersQuery;
  const newCustomers = newCustomersCount || 0;

  // We need to fetch all non-cancelled orders in range to find repeat behavior and lifetime value
  let ordersQuery = adminClient.from("orders").select("customer_id, total_amount, created_at, payments(amount)").neq("status", "CANCELLED");
  // Don't filter by date yet for lifetime value calculation if we want lifetime value of ALL customers, but let's filter to range to see behavior in range.
  ordersQuery = applyDateFilter(ordersQuery, from, to);
  
  const { data: orders } = await ordersQuery;

  const customerSpend: Record<number, number> = {};
  const customerOrderCount: Record<number, number> = {};
  const customerDues: Record<number, number> = {};

  orders?.forEach(o => {
    if (!o.customer_id) return; // Skip walk-ins for some metrics
    
    customerSpend[o.customer_id] = (customerSpend[o.customer_id] || 0) + (o.total_amount || 0);
    customerOrderCount[o.customer_id] = (customerOrderCount[o.customer_id] || 0) + 1;
    
    const paid = o.payments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
    if ((o.total_amount || 0) > paid) {
      customerDues[o.customer_id] = (customerDues[o.customer_id] || 0) + ((o.total_amount || 0) - paid);
    }
  });

  let repeatCustomers = 0;
  Object.values(customerOrderCount).forEach(count => {
    if (count > 1) repeatCustomers++;
  });

  const totalRangeSpend = Object.values(customerSpend).reduce((sum, val) => sum + val, 0);
  const uniqueCustomersInRange = Object.keys(customerSpend).length;
  const avgLifetimeValue = uniqueCustomersInRange > 0 ? (totalRangeSpend / uniqueCustomersInRange) : 0;

  // Fetch names for top 10 spenders and top dues
  const topSpenderIds = Object.entries(customerSpend).sort((a,b) => b[1] - a[1]).slice(0, 10).map(e => Number(e[0]));
  const topDuesIds = Object.entries(customerDues).sort((a,b) => b[1] - a[1]).slice(0, 10).map(e => Number(e[0]));

  const fetchIds = Array.from(new Set([...topSpenderIds, ...topDuesIds]));
  let customerNames: Record<number, string> = {};
  if (fetchIds.length > 0) {
    const { data: custInfo } = await adminClient.from("customers").select("id, name").in("id", fetchIds);
    custInfo?.forEach(c => { customerNames[c.id] = c.name });
  }

  const topCustomers = topSpenderIds.map(id => ({
    name: customerNames[id] || "Unknown",
    spend: customerSpend[id]
  }));

  const topOutstanding = topDuesIds.map(id => ({
    name: customerNames[id] || "Unknown",
    owed: customerDues[id]
  }));

  // Customer Growth over time
  // For growth, we should look at customers created over the period
  let custGrowthQuery = adminClient.from("customers").select("created_at");
  custGrowthQuery = applyDateFilter(custGrowthQuery, from, to);
  const { data: custGrowthData } = await custGrowthQuery;
  
  const dailyGrowth: Record<string, number> = {};
  custGrowthData?.forEach(c => {
    const d = c.created_at ? c.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
    dailyGrowth[d] = (dailyGrowth[d] || 0) + 1;
  });
  
  const customerGrowth = Object.keys(dailyGrowth).sort().map(d => ({
    date: new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    count: dailyGrowth[d]
  }));

  return {
    totalCustomers: totalCustomers || 0,
    newCustomers,
    repeatCustomers,
    avgLifetimeValue,
    topCustomers,
    customerGrowth,
    topOutstanding
  };
}

// 5. Profit & Expenses
export async function getProfitExpensesData(from?: string, to?: string) {
  await verifyNotStaff();
  const adminClient = createAdminClient();

  // Revenue & COGS
  let ordersQuery = adminClient.from("orders").select("id, total_amount, created_at, order_items(quantity, products(cost_price))").eq("status", "COMPLETED");
  ordersQuery = applyDateFilter(ordersQuery, from, to);
  const { data: orders } = await ordersQuery;

  let totalRevenue = 0;
  let totalCOGS = 0; // Cost of Goods Sold
  const dailyRev: Record<string, number> = {};

  orders?.forEach(o => {
    totalRevenue += (o.total_amount || 0);
    const dateStr = o.created_at ? o.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
    dailyRev[dateStr] = (dailyRev[dateStr] || 0) + (o.total_amount || 0);

    o.order_items?.forEach((item: any) => {
      const p = Array.isArray(item.products) ? item.products[0] : item.products;
      const cp = p?.cost_price || 0;
      totalCOGS += (cp * (item.quantity || 0));
    });
  });

  const grossProfit = totalRevenue - totalCOGS;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  // Expenses
  let expensesQuery = adminClient.from("expenses").select("amount, description, datetime");
  // expenses uses `datetime` column
  expensesQuery = applyDateFilter(expensesQuery, from, to, "datetime");
  const { data: expenses } = await expensesQuery;

  let totalExpenses = 0;
  const dailyExp: Record<string, number> = {};
  const expCategories: Record<string, number> = {};

  expenses?.forEach(e => {
    const amt = e.amount || 0;
    totalExpenses += amt;
    const dateStr = e.datetime ? e.datetime.split('T')[0] : new Date().toISOString().split('T')[0];
    dailyExp[dateStr] = (dailyExp[dateStr] || 0) + amt;

    // Simple keyword based categorization for donut chart
    const desc = e.description.toLowerCase();
    let category = "Miscellaneous";
    if (desc.includes("rent")) category = "Rent";
    else if (desc.includes("transport") || desc.includes("travel") || desc.includes("fuel")) category = "Transport";
    else if (desc.includes("supply") || desc.includes("material")) category = "Supplies";
    else if (desc.includes("salary") || desc.includes("wage")) category = "Payroll";
    else if (desc.includes("bill") || desc.includes("electricity") || desc.includes("water") || desc.includes("utility")) category = "Utilities";

    expCategories[category] = (expCategories[category] || 0) + amt;
  });

  const netProfit = grossProfit - totalExpenses;
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const expenseBreakdown = Object.entries(expCategories)
    .map(([name, value]) => ({ name, value }))
    .sort((a,b) => b.value - a.value);

  // Combine Daily Data for area chart & margin line chart
  const allDates = Array.from(new Set([...Object.keys(dailyRev), ...Object.keys(dailyExp)])).sort();
  const revenueVsExpenses = allDates.map(d => ({
    date: new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: dailyRev[d] || 0,
    expense: dailyExp[d] || 0,
    grossMarginPct: dailyRev[d] ? (((dailyRev[d] || 0) - (dailyRev[d] ? (dailyRev[d]/totalRevenue)*totalCOGS : 0)) / dailyRev[d]) * 100 : 0, // approximation for daily margin
  }));

  // Actually, calculating daily margin accurately needs daily COGS. Let's calculate daily COGS.
  const dailyCOGS: Record<string, number> = {};
  orders?.forEach(o => {
    const dateStr = o.created_at ? o.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
    let cogs = 0;
    o.order_items?.forEach((item: any) => {
      const p = Array.isArray(item.products) ? item.products[0] : item.products;
      cogs += ((p?.cost_price || 0) * (item.quantity || 0));
    });
    dailyCOGS[dateStr] = (dailyCOGS[dateStr] || 0) + cogs;
  });

  const marginTrend = allDates.map(d => {
    const rev = dailyRev[d] || 0;
    const cogs = dailyCOGS[d] || 0;
    const exp = dailyExp[d] || 0;
    const dailyGross = rev - cogs;
    const dailyNet = dailyGross - exp;
    return {
      date: new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      grossMargin: rev > 0 ? (dailyGross / rev) * 100 : 0,
      netMargin: rev > 0 ? (dailyNet / rev) * 100 : 0,
    }
  });


  return {
    totalRevenue,
    totalExpenses,
    grossProfit,
    grossMargin,
    netProfit,
    netMargin,
    revenueVsExpenses,
    expenseBreakdown,
    marginTrend
  };
}
