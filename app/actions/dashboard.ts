"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

// --- Helpers ---
function applyDateFilter(query: any, from?: string, to?: string) {
  if (from) query = query.gte("order_date", from);
  if (to) query = query.lte("order_date", to);
  return query;
}

// --- Data Fetchers ---

export async function getDashboardData(dateFrom?: string, dateTo?: string) {
  const adminClient = createAdminClient();

  // 1. Orders and Revenue
  let query = adminClient.from("orders").select("total_amount, status");
  query = applyDateFilter(query, dateFrom, dateTo);
  const { data: orders } = await query;

  let totalRevenue = 0;
  let totalOrders = 0;
  let totalPendingOrders = 0;

  orders?.forEach(o => {
    if (o.status !== "CANCELLED") {
      totalOrders++;
      if (o.status === "COMPLETED") {
        totalRevenue += (o.total_amount || 0);
      } else if (o.status === "PENDING") {
        totalPendingOrders++;
      }
    }
  });

  const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;

  // 2. Stock and Sold Counts
  // Total stock is sum of all stock_qty in products
  const { data: products } = await adminClient.from("products").select("stock_qty");
  const totalStock = products?.reduce((sum, p) => sum + (p.stock_qty || 0), 0) || 0;

  // Total products sold in the given period (completed orders only)
  let soldQuery = adminClient.from("orders").select("status, order_items(quantity)");
  soldQuery = applyDateFilter(soldQuery, dateFrom, dateTo);
  const { data: soldOrders } = await soldQuery;

  let productsSold = 0;
  soldOrders?.forEach(o => {
    if (o.status === "COMPLETED") {
      o.order_items?.forEach((item: any) => {
        productsSold += (item.quantity || 0);
      });
    }
  });

  return {
    totalRevenue,
    totalOrders,
    avgOrderValue,
    totalPendingOrders,
    totalStock,
    productsSold
  };
}

export async function getRevenueChartData(dateFrom?: string, dateTo?: string, granularity: "day" | "week" | "month" = "day") {
  const adminClient = createAdminClient();
  let query = adminClient.from("orders").select("order_date, total_amount, status").eq("status", "COMPLETED");
  query = applyDateFilter(query, dateFrom, dateTo);
  const { data: orders } = await query;

  const grouped: Record<string, number> = {};
  orders?.forEach(o => {
    const d = new Date(o.order_date);
    let key = "";
    if (granularity === "day") {
      key = d.toISOString().split("T")[0]; // YYYY-MM-DD
    } else if (granularity === "week") {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(d.setDate(diff));
      key = "Week of " + weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } else {
      key = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }
    grouped[key] = (grouped[key] || 0) + (o.total_amount || 0);
  });

  const sortedDates = Object.keys(grouped).sort((a, b) => {
    if (granularity === "day") return a.localeCompare(b);
    return new Date(a.replace("Week of ", "")).getTime() - new Date(b.replace("Week of ", "")).getTime();
  });
  
  return sortedDates.map(date => ({
    date,
    revenue: grouped[date]
  }));
}

export async function getTopProducts(dateFrom?: string, dateTo?: string, limit = 5) {
  const adminClient = createAdminClient();
  let query = adminClient.from("orders").select("status, order_items(subtotal, products(name))").eq("status", "COMPLETED");
  query = applyDateFilter(query, dateFrom, dateTo);
  const { data: orders } = await query;
  
  const agg: Record<string, number> = {};
  orders?.forEach(o => {
    o.order_items?.forEach((item: any) => {
      const p = Array.isArray(item.products) ? item.products[0] : item.products;
      const pName = p?.name || "Unknown Product";
      agg[pName] = (agg[pName] || 0) + (item.subtotal || 0);
    });
  });

  return Object.entries(agg)
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a,b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export async function getLowStockProducts(threshold: number = 1) {
  const adminClient = createAdminClient();
  const { data: products } = await adminClient
    .from("products")
    .select("id, name, product_code, stock_qty, category:categories(name)")
    .lte("stock_qty", threshold)
    .order("stock_qty", { ascending: true });
    
  return products?.map(p => ({
    id: p.id,
    code: p.product_code,
    name: p.name,
    category: Array.isArray(p.category) ? p.category[0]?.name : p.category?.name || "Unknown",
    stock_qty: p.stock_qty,
  })) || [];
}

export async function getTodaySnapshot() {
  const adminClient = createAdminClient();
  const todayStr = new Date().toISOString().split("T")[0];
  
  const { data: orders } = await adminClient
    .from("orders")
    .select("total_amount, status, created_at")
    .gte("created_at", `${todayStr}T00:00:00Z`)
    .lte("created_at", `${todayStr}T23:59:59Z`)
    .order("created_at", { ascending: false });

  let todayRevenue = 0;
  let todayOrders = 0;
  let lastOrderTime = null;

  if (orders && orders.length > 0) {
    lastOrderTime = orders[0].created_at;
    orders.forEach(o => {
      if (o.status !== "CANCELLED") {
        todayOrders++;
        if (o.status === "COMPLETED") {
          todayRevenue += (o.total_amount || 0);
        }
      }
    });
  }

  return {
    todayRevenue,
    todayOrders,
    lastOrderTime
  };
}

export async function getRecentOrders(limit = 5) {
  const adminClient = createAdminClient();
  const { data: orders } = await adminClient
    .from("orders")
    .select("id, order_no, total_amount, status, customer:customers(name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  return orders?.map(o => ({
    id: o.id,
    order_no: o.order_no,
    amount: o.total_amount,
    status: o.status,
    customer_name: Array.isArray(o.customer) ? o.customer[0]?.name : o.customer?.name || "Walk-in Customer",
  })) || [];
}

export async function getOutstandingDues() {
  const adminClient = createAdminClient();
  const { data: orders } = await adminClient
    .from("orders")
    .select("total_amount, status, payments(amount)")
    .neq("status", "CANCELLED");

  let totalOutstanding = 0;

  orders?.forEach(o => {
    const paid = o.payments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
    if (o.total_amount > paid) {
      totalOutstanding += (o.total_amount - paid);
    }
  });

  return totalOutstanding;
}
