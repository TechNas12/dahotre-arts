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
// Replaces the old JS loop that did proportional payment allocation client-side.

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

// ─── RPC: Search / Paginated Bookings List ────────────────────────────────────
// Calls search_bookings() Postgres function for filtering, pagination, and joins.
// Falls back to OpenSearch for free-text search, then passes matched IDs into
// the RPC via a wrapper query if OpenSearch returns results.

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

  // ── OpenSearch fast-path ──
  // If a search term is provided, try OpenSearch first to get matching order IDs.
  // If it returns an empty result, short-circuit — no point hitting the DB.
  // If OpenSearch is unavailable (returns null), fall through to DB ILIKE search.
  let opensearchIds: number[] | null = null;

  if (searchStr) {
    const searchResult = await searchIndex("orders", searchStr, [
      "order_no",
      "customer_name",
      "customer_phone",
    ]);

    if (searchResult !== null) {
      if (searchResult.ids.length === 0) return { data: [], totalCount: 0 };
      opensearchIds = searchResult.ids as number[];
    }
    // searchResult === null → OpenSearch unavailable → let RPC do ILIKE
  }

  // ── If OpenSearch gave us IDs, fetch those orders directly (fast, exact) ──
  if (opensearchIds !== null) {
    // The search_bookings RPC doesn't accept a list of IDs directly,
    // so for the OpenSearch path we query the DB with a plain .select()
    // scoped to those IDs. This keeps the RPC simple and this path is rare.
    const { data, error } = await adminClient
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
      .in("id", opensearchIds)
      .order("created_at", { ascending: false });

    if (error || !data) {
      console.error("OpenSearch ID lookup error:", error);
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

    return { data: finalData as Order[], totalCount: finalData.length };
  }

  // ── Standard path: call search_bookings RPC ──
  const { data, error } = await adminClient.rpc("search_bookings", {
    p_search:       searchStr || null,
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
