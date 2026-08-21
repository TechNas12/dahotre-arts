"use server";

import { connection } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchIndex } from "@/lib/opensearch";
import { Order } from "./orders";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BookedProductSummary = {
  productId: number;
  variantIndex: number | null;
  productCode: string;
  name: string;
  category: string;
  sizeOrVariant: string;
  totalBookedQty: number;
  totalValue: number;
  totalPaid: number;
  totalDue: number;
  orders: {
    orderId: number;
    orderNo: string;
    customerName: string;
    qty: number;
    status: string;
    fulfillmentStatus: string;
  }[];
};

export type BookingsKpiSummary = {
  totalBookings: number;
  pendingCount: number;
  completedCount: number;
  cancelledCount: number;
  totalValue: number;
  totalPaid: number;
  totalDue: number;
};

// ─── RPC: KPI Summary ─────────────────────────────────────────────────────────
// Calls get_bookings_kpi_summary() Postgres function.
// Returns aggregated counts and financial totals for the KPI bar.

export async function getBookingsKpiSummary(): Promise<BookingsKpiSummary> {
  // Opt out of Next.js Data Cache — always fetch fresh data from Supabase
  await connection();
  const adminClient = createAdminClient();

  const { data, error } = await adminClient.rpc("get_bookings_kpi_summary");

  if (error || !data) {
    console.error("RPC get_bookings_kpi_summary error:", error);
    return {
      totalBookings: 0,
      pendingCount: 0,
      completedCount: 0,
      cancelledCount: 0,
      totalValue: 0,
      totalPaid: 0,
      totalDue: 0,
    };
  }

  // RPC returns a JSON object — map snake_case keys to camelCase
  const d = data as any;
  return {
    totalBookings: Number(d.total_bookings ?? 0),
    pendingCount: Number(d.pending_count ?? 0),
    completedCount: Number(d.completed_count ?? 0),
    cancelledCount: Number(d.cancelled_count ?? 0),
    totalValue: Number(d.total_value ?? 0),
    totalPaid: Number(d.total_paid ?? 0),
    totalDue: Number(d.total_due ?? 0),
  };
}

// ─── RPC: Product Summary ─────────────────────────────────────────────────────
// Calls get_booked_products_summary() Postgres function.

export async function listBookedProducts(): Promise<BookedProductSummary[]> {
  // Opt out of Next.js Data Cache — always fetch fresh data from Supabase
  await connection();
  const adminClient = createAdminClient();

  const { data, error } = await adminClient.rpc("get_booked_products_summary");

  if (error || !data) {
    console.error("RPC get_booked_products_summary error:", error);
    return [];
  }

  // RPC returns a JSON array — map snake_case to camelCase
  const rows = (Array.isArray(data) ? data : []) as any[];

  return rows.map((row: any) => ({
    productId: Number(row.product_id),
    variantIndex: row.variant_index !== undefined ? row.variant_index : null,
    productCode: row.product_code ?? "",
    name: row.name ?? "Unknown",
    category: row.category ?? "-",
    sizeOrVariant: row.size_or_variant ?? "-",
    totalBookedQty: Number(row.total_booked_qty ?? 0),
    totalValue: Number(row.total_value ?? 0),
    totalPaid: Number(row.total_paid ?? 0),
    totalDue: Number(row.total_due ?? 0),
    orders: ((row.orders as any[]) ?? []).map((o: any) => ({
      orderId: Number(o.order_id),
      orderNo: o.order_no ?? "",
      customerName: o.customer_name ?? "Unknown",
      qty: Number(o.qty ?? 0),
      status: o.status ?? "",
      fulfillmentStatus: o.fulfillment_status ?? "",
    })),
  }));
}

// ─── Robust Search Bookings Helper ────────────────────────────────────────────

async function resolveBookingSearchIds(adminClient: any, searchStr: string): Promise<number[] | null> {
  const trimmed = searchStr.trim();
  if (!trimmed) return null;

  // 1. Try OpenSearch across all rich order fields
  const searchResult = await searchIndex("orders", trimmed, [
    "order_no",
    "customer_name",
    "customer_phone",
    "customer_email",
    "customer_address",
    "staff_name",
    "product_names",
    "product_codes",
    "category_names",
    "variant_labels",
    "payment_modes",
    "amounts",
    "search_text",
  ]);

  let matchedOrderIds: number[] | null = null;
  if (searchResult !== null && searchResult.ids.length > 0) {
    matchedOrderIds = searchResult.ids;
  }

  // 2. Comprehensive multi-table DB fallback search if OpenSearch gave no results or is unavailable
  if (matchedOrderIds === null || matchedOrderIds.length === 0) {
    const safeSearchStr = trimmed
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');

    const cleanAmountStr = trimmed.replace(/[₹,\s]/g, '').trim();
    const numVal = cleanAmountStr !== "" && !isNaN(Number(cleanAmountStr)) ? Number(cleanAmountStr) : null;

    const [ordersByNo, matchingCusts, matchingProds, matchingCategories, matchingUsers] = await Promise.all([
      adminClient.from("orders").select("id").ilike("order_no", `%${safeSearchStr}%`),
      adminClient.from("customers").select("id").or(`name.ilike.%${safeSearchStr}%,phone.ilike.%${safeSearchStr}%,email.ilike.%${safeSearchStr}%,address.ilike.%${safeSearchStr}%`),
      adminClient.from("products").select("id").or(`name.ilike.%${safeSearchStr}%,product_code.ilike.%${safeSearchStr}%`),
      adminClient.from("categories").select("id").ilike("name", `%${safeSearchStr}%`),
      adminClient.from("users").select("id").ilike("name", `%${safeSearchStr}%`),
    ]);

    const dbMatchedIds = new Set<number>();
    (ordersByNo.data || []).forEach((o: any) => dbMatchedIds.add(o.id));

    const custIds = (matchingCusts.data || []).map((c: any) => c.id);
    const prodIds = (matchingProds.data || []).map((p: any) => p.id);
    const catIds = (matchingCategories.data || []).map((cat: any) => cat.id);
    const userIds = (matchingUsers.data || []).map((u: any) => u.id);

    const subQueries: PromiseLike<any>[] = [];
    if (custIds.length > 0) {
      subQueries.push(adminClient.from("orders").select("id").in("customer_id", custIds));
    }
    if (prodIds.length > 0) {
      subQueries.push(adminClient.from("order_items").select("order_id").in("product_id", prodIds));
    }
    if (catIds.length > 0) {
      const { data: prodsInCats } = await adminClient.from("products").select("id").in("category_id", catIds);
      const catProdIds = (prodsInCats || []).map((p: any) => p.id);
      if (catProdIds.length > 0) {
        subQueries.push(adminClient.from("order_items").select("order_id").in("product_id", catProdIds));
      }
    }
    if (userIds.length > 0) {
      subQueries.push(adminClient.from("orders").select("id").in("user_id", userIds));
    }
    if (numVal !== null) {
      subQueries.push(adminClient.from("orders").select("id").or(`total_amount.eq.${numVal},discount.eq.${numVal}`));
      subQueries.push(adminClient.from("payments").select("order_id").eq("amount", numVal));
      subQueries.push(adminClient.from("order_items").select("order_id").or(`selling_price.eq.${numVal},subtotal.eq.${numVal}`));
    }

    if (subQueries.length > 0) {
      const subResults = await Promise.all(subQueries);
      subResults.forEach((res) => {
        (res.data || []).forEach((item: any) => {
          if (item.id) dbMatchedIds.add(item.id);
          if (item.order_id) dbMatchedIds.add(item.order_id);
        });
      });
    }

    if (matchedOrderIds === null) {
      matchedOrderIds = Array.from(dbMatchedIds);
    } else if (matchedOrderIds.length === 0 && dbMatchedIds.size > 0) {
      matchedOrderIds = Array.from(dbMatchedIds);
    }
  }

  return matchedOrderIds;
}

// ─── RPC: Search / Paginated Bookings List ────────────────────────────────────

export async function searchBookingsAction(params: {
  search?: string;
  page: number;
  pageSize: number;
  status?: string;
  fulfillment?: string;
  dateFrom?: string;
  dateTo?: string;
  paymentMode?: string;
}): Promise<{ data: Order[]; totalCount: number }> {
  // Opt out of Next.js Data Cache — always fetch fresh data from Supabase
  await connection();
  const adminClient = createAdminClient();

  const page = Math.max(1, Math.floor(params.page || 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(params.pageSize || 25)));
  const offset = (page - 1) * pageSize;

  const searchStr = (params.search || "").trim();

  // ── Robust Search Path ──
  if (searchStr) {
    const matchedIds = await resolveBookingSearchIds(adminClient, searchStr);
    if (matchedIds !== null) {
      if (matchedIds.length === 0) {
        return { data: [], totalCount: 0 };
      }

      // Query matched IDs with full joins
      let query = adminClient
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
              id, product_code, name, base, height, variants,
              category:categories(name)
            )
          )
        `)
        .in("id", matchedIds)
        .order("created_at", { ascending: false });

      if (params.dateFrom) {
        query = query.gte("created_at", `${params.dateFrom}T00:00:00.000Z`);
      }
      if (params.dateTo) {
        query = query.lte("created_at", `${params.dateTo}T23:59:59.999Z`);
      }

      const { data, error } = await query;

      if (error || !data) {
        console.error("Booking search lookup error:", error);
        return { data: [], totalCount: 0 };
      }

      let finalData = (data as unknown as (Order & { order_type?: string })[]).filter((order) => {
        const isBooking =
          order.order_type === "BOOKING" ||
          order.status === "PENDING" ||
          order.payments?.some((p: any) => p.payment_type === "ADVANCE");
        const totalPaid = order.payments?.reduce((acc: number, p: any) => acc + Number(p.amount), 0) || 0;
        const isCompletedAndPaid = order.status === "COMPLETED" && totalPaid >= (order.total_amount || 0);

        return isBooking && !isCompletedAndPaid;
      });

      // Apply post-query status filter if needed
      if (params.status && params.status !== "ALL") {
        finalData = finalData.filter((order) => order.status === params.status);
      }

      // Apply post-query fulfillment filter if needed
      if (params.fulfillment && params.fulfillment !== "ALL") {
        finalData = finalData.filter((order) => order.fulfillment_status === params.fulfillment);
      }

      // Apply post-query payment-mode filter
      if (params.paymentMode && params.paymentMode !== "ALL") {
        finalData = finalData.filter((order) => {
          const payments = order.payments || [];
          return payments.some((p) => p.payment_mode === params.paymentMode);
        });
      }

      const totalCount = finalData.length;
      const paged = finalData.slice(offset, offset + pageSize);

      return { data: paged as Order[], totalCount };
    }
  }

  // ── Standard path when no search query: call search_bookings RPC ──
  const { data, error } = await adminClient.rpc("search_bookings", {
    p_search:       null,
    p_status:       params.status || "ALL",
    p_fulfillment:  params.fulfillment || "ALL",
    p_payment_mode: params.paymentMode || "ALL",
    p_date_from:    params.dateFrom || null,
    p_date_to:      params.dateTo || null,
    p_limit:        pageSize,
    p_offset:       offset,
  });

  if (error || !data) {
    console.error("RPC search_bookings error:", error);
    return { data: [], totalCount: 0 };
  }

  const result = data as { data: any[]; total_count: number };
  const rawOrders = (result.data || []) as unknown as Order[];

  // Defensive filter: Ensure completed & fully paid orders never appear in active bookings
  const filteredData = rawOrders.filter((order) => {
    const totalPaid = order.payments?.reduce((acc: number, p: any) => acc + Number(p.amount), 0) || 0;
    const isCompletedAndPaid = order.status === "COMPLETED" && totalPaid >= (order.total_amount || 0);
    return !isCompletedAndPaid;
  });

  return {
    data: filteredData,
    totalCount: Number(result.total_count ?? filteredData.length),
  };
}
