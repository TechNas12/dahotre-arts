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

  const safeSearchStr = trimmed
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');

  const cleanAmountStr = trimmed.replace(/[₹,\s]/g, '').trim();
  const numVal = cleanAmountStr !== "" && !isNaN(Number(cleanAmountStr)) ? Number(cleanAmountStr) : null;

  // Run OpenSearch search and primary DB search concurrently in parallel
  const [searchResult, [ordersByNo, matchingCusts, matchingProds, matchingCategories, matchingUsers]] = await Promise.all([
    searchIndex("orders", trimmed, [
      "order_no",
      "notes",
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
    ]),
    Promise.all([
      adminClient.from("orders").select("id").or(`order_no.ilike.%${safeSearchStr}%,notes.ilike.%${safeSearchStr}%,sale_type.ilike.%${safeSearchStr}%`),
      adminClient.from("customers").select("id").or(`name.ilike.%${safeSearchStr}%,phone.ilike.%${safeSearchStr}%,email.ilike.%${safeSearchStr}%,address.ilike.%${safeSearchStr}%`),
      adminClient.from("products").select("id").or(`name.ilike.%${safeSearchStr}%,product_code.ilike.%${safeSearchStr}%`),
      adminClient.from("categories").select("id").ilike("name", `%${safeSearchStr}%`),
      adminClient.from("users").select("id").ilike("name", `%${safeSearchStr}%`),
    ])
  ]);

  const allMatchedIds = new Set<number>();

  // 1. Add OpenSearch hits if any
  if (searchResult !== null && searchResult.ids.length > 0) {
    searchResult.ids.forEach((id: number) => allMatchedIds.add(id));
  }

  // 2. Add direct DB hits
  (ordersByNo.data || []).forEach((o: any) => allMatchedIds.add(o.id));

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
        if (item.id) allMatchedIds.add(item.id);
        if (item.order_id) allMatchedIds.add(item.order_id);
      });
    });
  }

  return Array.from(allMatchedIds);
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

      const lookupRes = await queryAndFilterMatchedBookings(adminClient, matchedIds, params);
      if (lookupRes.error) {
        return { data: [], totalCount: 0 };
      }

      const totalCount = lookupRes.data.length;
      const paged = lookupRes.data.slice(offset, offset + pageSize);

      return { data: paged, totalCount };
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

  // Defensive filter: Ensure completed & fully paid orders never appear in active bookings,
  // and wholesale orders NEVER appear in bookings
  const filteredData = rawOrders.filter((order) => {
    if (order.sale_type === "WHOLESALE") return false;
    const totalPaid = order.payments?.reduce((acc: number, p: any) => acc + Number(p.amount), 0) || 0;
    const isCompletedAndPaid = order.status === "COMPLETED" && totalPaid >= (order.total_amount || 0);
    return !isCompletedAndPaid;
  });

  return {
    data: filteredData,
    totalCount: Number(result.total_count ?? filteredData.length),
  };
}

// Helper to fetch complete unconstrained list of bookings with chunking (bypassing PostgREST 1000-row & RPC limits)
async function fetchCompleteBookingsList(
  adminClient: any,
  params: {
    matchedIds?: number[] | null;
    status?: string;
    fulfillment?: string;
    dateFrom?: string;
    dateTo?: string;
    paymentMode?: string;
  }
): Promise<Order[]> {
  const CHUNK_SIZE = 1000;
  let allRawOrders: any[] = [];
  let from = 0;
  let hasMore = true;

  // When matchedIds is provided (from search), if it's empty, return immediately
  if (params.matchedIds !== undefined && params.matchedIds !== null && params.matchedIds.length === 0) {
    return [];
  }

  while (hasMore) {
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
        notes,
        order_type,
        sale_type,
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
      .order("order_date", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + CHUNK_SIZE - 1);

    if (params.matchedIds && params.matchedIds.length > 0) {
      query = query.in("id", params.matchedIds);
    }

    if (params.status && params.status !== "ALL") {
      query = query.eq("status", params.status);
    }

    if (params.fulfillment && params.fulfillment !== "ALL") {
      query = query.eq("fulfillment_status", params.fulfillment);
    }

    // Wholesale orders should never appear in bookings
    query = query.neq("sale_type", "WHOLESALE");

    if (params.dateFrom) {
      query = query.gte("order_date", `${params.dateFrom}T00:00:00.000`);
    }

    if (params.dateTo) {
      query = query.lte("order_date", `${params.dateTo}T23:59:59.999`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("fetchCompleteBookingsList query error:", error);
      throw new Error(error.message || "Failed to fetch bookings list");
    }

    if (!data || data.length === 0) {
      break;
    }

    allRawOrders = allRawOrders.concat(data);

    if (data.length < CHUNK_SIZE) {
      hasMore = false;
    } else {
      from += CHUNK_SIZE;
    }
  }

  // Filter for active bookings qualification:
  // (order_type = 'BOOKING' OR status = 'PENDING' OR has advance payment)
  // Wholesale orders are NEVER included in bookings
  // AND NOT (status = 'COMPLETED' AND totalPaid >= total_amount)
  const qualifiedOrders = (allRawOrders as (Order & { order_type?: string })[]).filter((order) => {
    if (order.sale_type === "WHOLESALE") return false;

    const isBooking =
      order.order_type === "BOOKING" ||
      order.status === "PENDING" ||
      order.payments?.some((p: any) => p.payment_type === "ADVANCE");
    const totalPaid = order.payments?.reduce((acc: number, p: any) => acc + Number(p.amount), 0) || 0;
    const isCompletedAndPaid = order.status === "COMPLETED" && totalPaid >= (order.total_amount || 0);

    return isBooking && !isCompletedAndPaid;
  });

  // Filter paymentMode if specified
  if (params.paymentMode && params.paymentMode !== "ALL") {
    return qualifiedOrders.filter((order) =>
      order.payments?.some((p) => p.payment_mode === params.paymentMode)
    ) as Order[];
  }

  return qualifiedOrders as Order[];
}

// Helper to query matched order IDs with full joins and apply booking qualifications/filters
async function queryAndFilterMatchedBookings(
  adminClient: any,
  matchedIds: number[],
  params: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    fulfillment?: string;
    paymentMode?: string;
  }
): Promise<{ data: Order[]; error?: string }> {
  try {
    const data = await fetchCompleteBookingsList(adminClient, {
      ...params,
      matchedIds,
    });
    return { data };
  } catch (err: any) {
    console.error("Booking search lookup error:", err);
    return { data: [], error: err?.message || "Booking search lookup failed" };
  }
}

// ─── Print Action: Fetch all bookings matching criteria ───────────────────────

export type FetchBookingsForPrintResult = {
  orders: Order[];
  error?: string;
};

export async function fetchBookingsForPrintAction(params: {
  search?: string;
  status?: string;
  fulfillment?: string;
  dateFrom?: string;
  dateTo?: string;
  paymentMode?: string;
}): Promise<FetchBookingsForPrintResult> {
  await connection();
  const adminClient = createAdminClient();
  const searchStr = (params.search || "").trim();

  try {
    let matchedIds: number[] | null = null;

    // If search query is provided, resolve matched IDs
    if (searchStr) {
      matchedIds = await resolveBookingSearchIds(adminClient, searchStr);
      if (!matchedIds || matchedIds.length === 0) {
        return { orders: [] };
      }
    }

    // Fetch the complete bookings list without any 100-record or arbitrary limit
    const orders = await fetchCompleteBookingsList(adminClient, {
      ...params,
      matchedIds,
    });

    return { orders };
  } catch (error: any) {
    console.error("fetchBookingsForPrintAction error:", error);
    return { orders: [], error: error?.message || "Failed to load bookings for print" };
  }
}

