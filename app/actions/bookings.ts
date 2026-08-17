"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { searchIndex } from "@/lib/opensearch";
import { Order } from "./orders";

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

export async function listBookedProducts(): Promise<BookedProductSummary[]> {
  const adminClient = createAdminClient();

  const { data: orders, error } = await adminClient
    .from("orders")
    .select(`
      id,
      order_no,
      status,
      fulfillment_status,
      customer:customers(name),
      payments(amount),
      items:order_items(
        product_id,
        variant_index,
        quantity,
        subtotal,
        product:products(
          id,
          product_code,
          name,
          base,
          height,
          variants
        )
      )
    `)
    .eq('order_type', 'BOOKING');

  if (error || !orders) {
    console.error("Error fetching bookings for products:", error);
    return [];
  }

  const productMap = new Map<string, BookedProductSummary>();

  orders.forEach(order => {
    const customerName = Array.isArray(order.customer) 
      ? (order.customer[0] as any)?.name 
      : (order.customer as any)?.name || "Unknown";

    const orderPaid = order.payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    
    // Proportional payment allocation
    const orderTotalValue = order.items?.reduce((sum, item) => sum + Number(item.subtotal), 0) || 1; // avoid div by 0
    const paymentRatio = Math.min(1, orderPaid / orderTotalValue);

    order.items?.forEach(item => {
      const prod = Array.isArray(item.product) ? item.product[0] : item.product;
      if (!prod) return;

      const key = `${prod.id}-${item.variant_index ?? 'base'}`;
      let sizeOrVariant = "-";
      if (item.variant_index != null && prod.variants && (prod.variants as any[])[item.variant_index]) {
        sizeOrVariant = (prod.variants as any[])[item.variant_index].label;
      } else if (prod.height) {
        sizeOrVariant = prod.base ? `H-${prod.height} B-${prod.base}` : `H-${prod.height}`;
      }

      if (!productMap.has(key)) {
        productMap.set(key, {
          productId: prod.id,
          variantIndex: item.variant_index,
          productCode: prod.product_code || '',
          name: prod.name || 'Unknown',
          category: '-',
          sizeOrVariant,
          totalBookedQty: 0,
          totalValue: 0,
          totalPaid: 0,
          totalDue: 0,
          orders: []
        });
      }

      const summary = productMap.get(key)!;
      summary.totalBookedQty += item.quantity;
      summary.totalValue += item.subtotal;
      
      const itemPaid = item.subtotal * paymentRatio;
      summary.totalPaid += itemPaid;
      summary.totalDue += (item.subtotal - itemPaid);

      summary.orders.push({
        orderId: order.id,
        orderNo: order.order_no,
        customerName,
        qty: item.quantity,
        status: order.status,
        fulfillmentStatus: order.fulfillment_status
      });
    });
  });

  return Array.from(productMap.values()).sort((a, b) => b.totalBookedQty - a.totalBookedQty);
}

export async function searchBookingsAction(params: {
  search?: string;
  page: number;
  pageSize: number;
  status?: string;
  fulfillment?: string;
  dateFrom?: string;
  dateTo?: string;
  paymentMode?: string;
}): Promise<{ data: Order[], totalCount: number }> {
  const adminClient = createAdminClient();
  const page = Math.max(1, Math.floor(params.page || 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(params.pageSize || 25)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = adminClient
    .from("orders")
    .select(`
      id,
      order_no,
      order_date,
      status,
      fulfillment_status,
      total_amount,
      discount,
      customer:customers(id, name, phone, email, address),
      user:users(name),
      payments(
        id,
        payment_mode,
        payment_type,
        amount
      )
    `, { count: 'exact' })
    .eq('order_type', 'BOOKING');

  if (params.status && params.status !== 'ALL') {
    query = query.eq('status', params.status);
  }
  if (params.fulfillment && params.fulfillment !== 'ALL') {
    query = query.eq('fulfillment_status', params.fulfillment);
  }
  if (params.dateFrom) {
    query = query.gte('order_date', params.dateFrom);
  }
  if (params.dateTo) {
    query = query.lte('order_date', params.dateTo);
  }

  // Handle Search
  if (params.search) {
    const searchStr = params.search.trim();
    if (searchStr) {
      const searchResult = await searchIndex("orders", searchStr, ["order_no", "customer_name", "customer_phone"]);
      if (searchResult !== null) {
        if (searchResult.ids.length === 0) return { data: [], totalCount: 0 };
        query = query.in("id", searchResult.ids);
      } else {
        const safeSearchStr = searchStr.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/%/g, '\\%').replace(/_/g, '\\_');
        query = query.ilike('order_no', `"%${safeSearchStr}%"`);
      }
    }
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error || !data) {
    console.error("Error fetching bookings list:", error);
    return { data: [], totalCount: 0 };
  }

  let finalData = data as unknown as Order[];

  // Handle Payment Mode filtering post-query since it's a joined table
  if (params.paymentMode && params.paymentMode !== 'ALL') {
    finalData = finalData.filter(order => {
      const payments = order.payments || [];
      if (params.paymentMode === 'CASH') return payments.some(p => p.payment_mode === 'CASH');
      if (params.paymentMode === 'ONLINE') return payments.some(p => p.payment_mode === 'ONLINE');
      return true;
    });
  }

  return { data: finalData, totalCount: count || finalData.length };
}
