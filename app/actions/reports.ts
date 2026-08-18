"use server";

import { connection } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Helpers
async function verifyNotStaff() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const role = user.app_metadata?.role || user.user_metadata?.role;
    if (role === "STAFF") throw new Error("Unauthorized: STAFF cannot access this resource.");
  } catch (err: any) {
    if (err?.message?.startsWith("Unauthorized")) throw err;
  }
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

  // Fetch all non-cancelled orders to calculate true total revenue & outstanding dues
  let ordersQuery = adminClient
    .from("orders")
    .select("id, total_amount, status, created_at, payments(amount)");
  if (from) ordersQuery = ordersQuery.gte("created_at", `${from}T00:00:00Z`);
  if (to) ordersQuery = ordersQuery.lte("created_at", `${to}T23:59:59Z`);
  ordersQuery = ordersQuery.neq("status", "CANCELLED");

  // Fetch payments (joined with orders for date filtering on chart)
  let paymentsQuery = adminClient
    .from("payments")
    .select("amount, payment_mode, payment_type, orders!inner(id, order_no, total_amount, status, created_at, customers(name))");
  if (from) paymentsQuery = paymentsQuery.gte("orders.created_at", `${from}T00:00:00Z`);
  if (to) paymentsQuery = paymentsQuery.lte("orders.created_at", `${to}T23:59:59Z`);

  const [{ data: orders, error: ordersError }, { data: payments, error: paymentsError }] = await Promise.all([
    ordersQuery,
    paymentsQuery
  ]);

  if (ordersError) console.error("Orders fetch error:", ordersError);
  if (paymentsError) console.error("Payments fetch error:", paymentsError);

  // --- True Total Revenue: sum of total_amount for all non-cancelled orders ---
  let totalRevenue = 0;
  let totalOutstandingDues = 0;

  orders?.forEach((o: any) => {
    const orderTotal = Number(o.total_amount) || 0;
    totalRevenue += orderTotal;

    // Outstanding = order total minus what was actually paid
    const paid = o.payments?.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0) || 0;
    if (orderTotal > paid) {
      totalOutstandingDues += orderTotal - paid;
    }
  });

  // --- Cash/Online received (from payments table) ---
  let cashRev = 0;
  let upiRev = 0;

  // For stacked area chart: daily revenue by payment mode
  const dailyRev: Record<string, { cash: number, upi: number, total: number }> = {};

  payments?.forEach((p: any) => {
    const order = Array.isArray(p.orders) ? p.orders[0] : p.orders;
    if (!order) return;
    if (order.status === "CANCELLED") return;

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
  const transactions: any[] = [];

  payments?.forEach((p: any) => {
    if (p.payment_type === "ADVANCE") advanceCount++;
    else fullCount++;

    const order = Array.isArray(p.orders) ? p.orders[0] : p.orders;
    if (!order) return;
    if (order.status === "CANCELLED") return;
    
    const customer = Array.isArray(order.customers) ? order.customers[0] : order.customers;
    const custName = customer?.name || "Walk-in";
    const dateStr = p.created_at ? p.created_at : (order.created_at || new Date().toISOString());
    
    transactions.push({
      date: new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
      orderNo: order.order_no || "-",
      customer: custName,
      mode: p.payment_mode || "UNKNOWN",
      amount: Number(p.amount) || 0
    });
  });

  // Sort transactions by date descending
  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    totalRevenue,
    cashRev,
    upiRev,
    outstandingDues: totalOutstandingDues,
    chartData,
    paymentModeSplit: [
      { name: 'CASH', value: cashRev },
      { name: 'ONLINE', value: upiRev }
    ],
    orderTypeSplit: [
      { name: 'Advance/Booking', value: advanceCount },
      { name: 'Full Payment', value: fullCount }
    ],
    transactions
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

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const [
    { data: products },
    { data: orderItems }
  ] = await Promise.all([
    adminClient.from("products").select("id, product_code, name, stock_qty, cost_price, category:categories(name)"),
    adminClient
      .from("order_items")
      .select("product_id, quantity, orders!inner(status, created_at)")
      .eq("orders.status", "COMPLETED")
      .gte("orders.created_at", ninetyDaysAgo.toISOString())
  ]);

  const productSalesQty: Record<number, number> = {};
  orderItems?.forEach((item: any) => {
    productSalesQty[item.product_id] = (productSalesQty[item.product_id] || 0) + (item.quantity || 0);
  });

  let totalSkus = 0;
  let totalStockQty = 0;
  let stockValue = 0;
  let outOfStock = 0;
  const catStockMap: Record<string, number> = {};

  products?.forEach((p: any) => {
    totalSkus++;
    totalStockQty += (p.stock_qty || 0);
    stockValue += ((p.stock_qty || 0) * (p.cost_price || 0));
    if (p.stock_qty === 0) outOfStock++;
    
    const catName = p.category?.name || "Uncategorized";
    catStockMap[catName] = (catStockMap[catName] || 0) + (p.stock_qty || 0);
  });

  const stockByCategory = Object.entries(catStockMap).map(([name, qty]) => ({ name, qty }));

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

  let newCustomersQuery = adminClient.from("customers").select("id", { count: 'exact' });
  newCustomersQuery = applyDateFilter(newCustomersQuery, from, to);

  // We need to fetch all non-cancelled orders in range to find repeat behavior and lifetime value
  let ordersQuery = adminClient.from("orders").select("customer_id, total_amount, created_at, payments(amount)").neq("status", "CANCELLED");
  // Don't filter by date yet for lifetime value calculation if we want lifetime value of ALL customers, but let's filter to range to see behavior in range.
  ordersQuery = applyDateFilter(ordersQuery, from, to);
  
  let custGrowthQuery = adminClient.from("customers").select("created_at");
  custGrowthQuery = applyDateFilter(custGrowthQuery, from, to);

  const [
    { count: totalCustomers },
    { count: newCustomersCount },
    { data: orders },
    { data: custGrowthData }
  ] = await Promise.all([
    adminClient.from("customers").select("*", { count: 'exact', head: true }),
    newCustomersQuery,
    ordersQuery,
    custGrowthQuery
  ]);

  const newCustomers = newCustomersCount || 0;

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

  let expensesQuery = adminClient.from("expenses").select("amount, description, datetime");
  // expenses uses `datetime` column
  expensesQuery = applyDateFilter(expensesQuery, from, to, "datetime");

  const [
    { data: orders },
    { data: expenses }
  ] = await Promise.all([
    ordersQuery,
    expensesQuery
  ]);

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

// -----------------------------------------------------------------------------
// 6. End-of-Day (EOD) Settlement & Daily Audit Report
// -----------------------------------------------------------------------------

export type EodReportData = {
  date: string;
  prevDate: string;
  financials: {
    totalSales: number;
    totalDiscount: number;
    totalCashCollected: number;
    totalOnlineCollected: number;
    totalCollected: number;
    totalDuesCreated: number;
    totalOrdersCount: number;
    directOrdersCount: number;
    bookingOrdersCount: number;
    cancelledOrdersCount: number;
  };
  cashDrawer: {
    cashSales: number;
    onlineSales: number;
    totalCollected: number;
  };
  bookings: {
    totalCount: number;
    totalValue: number;
    totalAdvance: number;
    totalDue: number;
    bookedProducts: {
      productId: number;
      productCode: string;
      name: string;
      category: string;
      sizeOrVariant: string;
      qty: number;
      totalValue: number;
    }[];
  };
  growth: {
    todaySales: number;
    yesterdaySales: number;
    salesGrowthPct: number;
    todayOrders: number;
    yesterdayOrders: number;
    ordersGrowthPct: number;
    todayCollected: number;
    yesterdayCollected: number;
    collectedGrowthPct: number;
  };
  hourlyActivity: {
    hourLabel: string;
    sales: number;
    orders: number;
  }[];
  orders: {
    id: number;
    orderNo: string;
    orderDate: string;
    timeStr: string;
    status: string;
    fulfillmentStatus: string;
    orderType: string;
    totalAmount: number;
    discount: number;
    paidAmount: number;
    dueAmount: number;
    customerName: string;
    customerPhone: string;
    userName: string;
    payments: {
      id: number;
      paymentMode: string;
      paymentType: string;
      amount: number;
    }[];
    items: {
      id: number;
      productName: string;
      productCode: string;
      variantLabel: string;
      quantity: number;
      sellingPrice: number;
      subtotal: number;
    }[];
  }[];
};

export async function getEodReportData(dateStr?: string): Promise<EodReportData> {
  await verifyNotStaff();
  try {
    await connection();
  } catch {}
  const adminClient = createAdminClient();

  // Target date in Indian Standard Time (default to today IST)
  const targetDate =
    dateStr ||
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  
  // Previous date (1 day before targetDate in IST)
  const targetObj = new Date(`${targetDate}T12:00:00+05:30`);
  const prevObj = new Date(targetObj);
  prevObj.setDate(prevObj.getDate() - 1);
  const prevDate = prevObj.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  // Exact UTC timestamps for the full IST calendar day (00:00:00.000 to 23:59:59.999 IST)
  const fromIso = new Date(`${targetDate}T00:00:00+05:30`).toISOString();
  const toIso = new Date(`${targetDate}T23:59:59.999+05:30`).toISOString();

  const prevFromIso = new Date(`${prevDate}T00:00:00+05:30`).toISOString();
  const prevToIso = new Date(`${prevDate}T23:59:59.999+05:30`).toISOString();

  // Parallel fetch: Today's Orders & Yesterday's Orders (Expenses excluded per business rule)
  const [
    { data: ordersData, error: ordersError },
    { data: prevOrdersData, error: prevOrdersError },
  ] = await Promise.all([
    // Today's orders (within IST calendar day)
    adminClient
      .from("orders")
      .select(`
        id,
        order_no,
        order_date,
        created_at,
        status,
        fulfillment_status,
        total_amount,
        discount,
        order_type,
        customer:customers(id, name, phone, email, address),
        user:users(name),
        payments(id, payment_mode, payment_type, amount, payment_date),
        items:order_items(
          id,
          quantity,
          selling_price,
          subtotal,
          variant_index,
          product:products(
            id,
            product_code,
            name,
            base,
            height,
            variants,
            category:categories(name)
          )
        )
      `)
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .order("created_at", { ascending: false }),

    // Yesterday's orders for growth calculation
    adminClient
      .from("orders")
      .select("id, total_amount, status, created_at, payments(amount, payment_mode)")
      .gte("created_at", prevFromIso)
      .lte("created_at", prevToIso)
  ]);

  if (ordersError) console.error("Error fetching EOD orders:", ordersError);
  if (prevOrdersError) console.error("Error fetching Prev Day orders:", prevOrdersError);

  const rawOrders = ordersData || [];
  const rawPrevOrders = prevOrdersData || [];

  // 1. Compute Today's Financials
  let totalSales = 0;
  let totalDiscount = 0;
  let totalCashCollected = 0;
  let totalOnlineCollected = 0;
  let directOrdersCount = 0;
  let bookingOrdersCount = 0;
  let pendingOrdersCount = 0;
  let completedOrdersCount = 0;
  let cancelledOrdersCount = 0;

  // Bookings tracking
  let totalBookingsCount = 0;
  let totalBookingsValue = 0;
  let totalBookingsAdvance = 0;
  let totalBookingsDue = 0;
  const bookedProductMap = new Map<string, {
    productId: number;
    productCode: string;
    name: string;
    category: string;
    sizeOrVariant: string;
    qty: number;
    totalValue: number;
  }>();

  // Hourly buckets (08:00 - 22:00)
  const hourlySalesMap: Record<number, { sales: number; orders: number }> = {};
  for (let h = 8; h <= 22; h++) {
    hourlySalesMap[h] = { sales: 0, orders: 0 };
  }

  // Format orders list
  const formattedOrders = rawOrders.map((o: any) => {
    const isCancelled = o.status === "CANCELLED";
    const orderTotal = Number(o.total_amount) || 0;
    const orderDiscount = Number(o.discount) || 0;

    let orderPaid = 0;
    let orderCash = 0;
    let orderOnline = 0;

    const paymentsList = (o.payments || []).map((p: any) => {
      const amt = Number(p.amount) || 0;
      orderPaid += amt;
      if (p.payment_mode === "CASH") orderCash += amt;
      else if (p.payment_mode === "ONLINE") orderOnline += amt;

      return {
        id: p.id,
        paymentMode: p.payment_mode || "CASH",
        paymentType: p.payment_type || "FULL",
        amount: amt,
      };
    });

    const isBooking =
      o.order_type === "BOOKING" ||
      o.status === "PENDING" ||
      paymentsList.some((p: any) => p.paymentType === "ADVANCE");

    const orderTypeStr = isBooking ? "BOOKING" : "DIRECT";
    const orderDue = isCancelled ? 0 : Math.max(0, orderTotal - orderPaid);

    if (!isCancelled) {
      totalSales += orderTotal;
      totalDiscount += orderDiscount;
      totalCashCollected += orderCash;
      totalOnlineCollected += orderOnline;

      if (isBooking) {
        bookingOrdersCount++;
        totalBookingsCount++;
        totalBookingsValue += orderTotal;
        totalBookingsAdvance += orderPaid;
        totalBookingsDue += orderDue;
      } else {
        directOrdersCount++;
      }

      if (o.status === "PENDING") pendingOrdersCount++;
      else if (o.status === "COMPLETED") completedOrdersCount++;
    } else {
      cancelledOrdersCount++;
    }

    // Hourly aggregation (Calculated in Indian Standard Time IST)
    if (!isCancelled && o.created_at) {
      try {
        const orderDateObj = new Date(o.created_at);
        const istHourStr = orderDateObj.toLocaleString("en-US", {
          timeZone: "Asia/Kolkata",
          hour: "numeric",
          hour12: false,
        });
        const orderHour = parseInt(istHourStr, 10);
        if (!isNaN(orderHour)) {
          if (!hourlySalesMap[orderHour]) {
            hourlySalesMap[orderHour] = { sales: 0, orders: 0 };
          }
          hourlySalesMap[orderHour].sales += orderTotal;
          hourlySalesMap[orderHour].orders += 1;
        }
      } catch (err) {
        console.error("Error calculating IST hour for order:", err);
      }
    }

    // Process line items
    const itemsList = (o.items || []).map((item: any) => {
      const prod = Array.isArray(item.product) ? item.product[0] : item.product;
      const categoryName = Array.isArray(prod?.category)
        ? prod.category[0]?.name
        : prod?.category?.name || "-";

      let variantLabel = "-";
      if (item.variant_index != null && prod?.variants && (prod.variants as any[])[item.variant_index]) {
        variantLabel = (prod.variants as any[])[item.variant_index].label;
      } else if (prod?.height) {
        variantLabel = prod.base ? `H-${prod.height} B-${prod.base}` : `H-${prod.height}`;
      }

      const itemQty = Number(item.quantity) || 0;
      const itemSubtotal = Number(item.subtotal) || 0;

      // If this order is a booking and not cancelled, add to booked products summary
      if (isBooking && !isCancelled && prod) {
        const prodKey = `${prod.id}-${item.variant_index ?? "base"}`;
        if (!bookedProductMap.has(prodKey)) {
          bookedProductMap.set(prodKey, {
            productId: prod.id,
            productCode: prod.product_code || "",
            name: prod.name || "Unknown",
            category: categoryName,
            sizeOrVariant: variantLabel,
            qty: 0,
            totalValue: 0,
          });
        }
        const bSummary = bookedProductMap.get(prodKey)!;
        bSummary.qty += itemQty;
        bSummary.totalValue += itemSubtotal;
      }

      return {
        id: item.id,
        productName: prod?.name || "Product",
        productCode: prod?.product_code || "",
        variantLabel,
        quantity: itemQty,
        sellingPrice: Number(item.selling_price) || 0,
        subtotal: itemSubtotal,
      };
    });

    const timeStr = o.created_at
      ? new Date(o.created_at).toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "-";

    const customerObj = Array.isArray(o.customer) ? o.customer[0] : o.customer;
    const userObj = Array.isArray(o.user) ? o.user[0] : o.user;

    return {
      id: o.id,
      orderNo: o.order_no,
      orderDate: o.order_date,
      timeStr,
      status: o.status,
      fulfillmentStatus: o.fulfillment_status || "UNFULFILLED",
      orderType: orderTypeStr,
      totalAmount: orderTotal,
      discount: orderDiscount,
      paidAmount: orderPaid,
      dueAmount: orderDue,
      customerName: customerObj?.name || "Walk-in Customer",
      customerPhone: customerObj?.phone || "-",
      userName: userObj?.name || "Staff",
      payments: paymentsList,
      items: itemsList,
    };
  });

  // 2. Compute Settlement Collections
  const totalCollected = totalCashCollected + totalOnlineCollected;
  const totalDuesCreated = Math.max(0, totalSales - totalCollected);

  // 3. Compute Yesterday's Comparison for Growth
  let yesterdaySales = 0;
  let yesterdayCollected = 0;
  let yesterdayOrdersCount = 0;

  rawPrevOrders.forEach((o: any) => {
    if (o.status !== "CANCELLED") {
      yesterdaySales += Number(o.total_amount) || 0;
      yesterdayOrdersCount++;
      (o.payments || []).forEach((p: any) => {
        yesterdayCollected += Number(p.amount) || 0;
      });
    }
  });

  const salesGrowthPct =
    yesterdaySales > 0
      ? ((totalSales - yesterdaySales) / yesterdaySales) * 100
      : totalSales > 0
      ? 100
      : 0;

  const ordersGrowthPct =
    yesterdayOrdersCount > 0
      ? ((rawOrders.length - yesterdayOrdersCount) / yesterdayOrdersCount) * 100
      : rawOrders.length > 0
      ? 100
      : 0;

  const collectedGrowthPct =
    yesterdayCollected > 0
      ? ((totalCollected - yesterdayCollected) / yesterdayCollected) * 100
      : totalCollected > 0
      ? 100
      : 0;

  // 4. Hourly Activity Array (Ordered Chronologically)
  const hourlyActivity = Object.keys(hourlySalesMap)
    .map(Number)
    .sort((a, b) => a - b)
    .map((hNum) => {
      const label =
        hNum === 0
          ? "12 AM"
          : hNum < 12
          ? `${hNum} AM`
          : hNum === 12
          ? "12 PM"
          : `${hNum - 12} PM`;

      return {
        hourLabel: label,
        sales: hourlySalesMap[hNum].sales,
        orders: hourlySalesMap[hNum].orders,
      };
    });

  return {
    date: targetDate,
    prevDate,
    financials: {
      totalSales,
      totalDiscount,
      totalCashCollected,
      totalOnlineCollected,
      totalCollected,
      totalDuesCreated,
      totalOrdersCount: rawOrders.length,
      directOrdersCount,
      bookingOrdersCount,
      cancelledOrdersCount,
    },
    cashDrawer: {
      cashSales: totalCashCollected,
      onlineSales: totalOnlineCollected,
      totalCollected,
    },
    bookings: {
      totalCount: totalBookingsCount,
      totalValue: totalBookingsValue,
      totalAdvance: totalBookingsAdvance,
      totalDue: totalBookingsDue,
      bookedProducts: Array.from(bookedProductMap.values()).sort(
        (a, b) => b.qty - a.qty
      ),
    },
    growth: {
      todaySales: totalSales,
      yesterdaySales,
      salesGrowthPct,
      todayOrders: rawOrders.length,
      yesterdayOrders: yesterdayOrdersCount,
      ordersGrowthPct,
      todayCollected: totalCollected,
      yesterdayCollected,
      collectedGrowthPct,
    },
    hourlyActivity,
    orders: formattedOrders,
  };
}

