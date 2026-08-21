"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { logActivity } from "@/lib/logActivity";
import { searchIndex, deleteDocument, extractForIndex } from "@/lib/opensearch";
import { indexOrderInOpenSearch } from "@/lib/sync-opensearch";

async function requireInternalUser(adminClient: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const { data: dbUser } = await adminClient
      .from("users")
      .select("id")
      .eq("supabase_uid", user.id)
      .single();
      
  let userId = dbUser?.id;
  if (!userId && user.email) {
     const { data: dbUserEmail } = await adminClient
       .from("users")
       .select("id")
       .eq("email", user.email)
       .single();
     userId = dbUserEmail?.id;
  }
  
  if (!userId) {
     throw new Error("Your account is not fully linked to a staff profile.");
  }
  return userId;
}

export type ActionState = {
  error?: string;
  success?: boolean;
  orderNo?: string;
  orderId?: number;
};

// Generates an order number like ORD-YYYYMMDD-NNN
export async function generateOrderNumber(adminClient: any): Promise<string> {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
  const prefix = `ORD-${dateStr}-`;

  const { data, error } = await adminClient
    .from("orders")
    .select("order_no")
    .ilike("order_no", `${prefix}%`)
    .order("order_no", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Error fetching order sequence:", error);
    return `${prefix}001`;
  }

  if (data && data.length > 0) {
    const lastOrderNo = data[0].order_no;
    const lastSequenceStr = lastOrderNo.replace(prefix, "");
    const nextSequence = parseInt(lastSequenceStr, 10) + 1;
    return `${prefix}${nextSequence.toString().padStart(3, "0")}`;
  }

  return `${prefix}001`;
}

type OrderPayload = {
  customerId?: number;
  newCustomerName?: string;
  newCustomerPhone?: string;
  newCustomerEmail?: string;
  
  orderType: "BOOKING" | "PURCHASE";
  discount: number;
  totalAmount: number;
  
  items: {
    productId: number;
    variantIndex?: number | null;
    quantity: number;
    sellingPrice: number;
  }[];
  
  paymentMode: "CASH" | "ONLINE";
  paymentType: "FULL" | "ADVANCE";
  paymentAmount: number;
};

export async function createOrderAction(payload: OrderPayload): Promise<ActionState> {
  let adminClient;
  let userId;

  try {
    adminClient = createAdminClient();
    userId = await requireInternalUser(adminClient);
  } catch (err: any) {
    return { error: err.message };
  }

  if (payload.items.length === 0) {
    return { error: "Cart is empty." };
  }

  // Single RPC call — entire order creation runs atomically inside Postgres.
  // No round-trips between Next.js and Supabase for each step.
  const { data, error } = await adminClient.rpc('create_order_atomic', {
    p: {
      user_id: userId,
      customer_id: payload.customerId ?? null,
      new_customer_name: payload.newCustomerName ?? null,
      new_customer_phone: payload.newCustomerPhone ?? null,
      new_customer_email: payload.newCustomerEmail ?? null,
      order_type: payload.orderType,
      discount: payload.discount,
      total_amount: payload.totalAmount,
      payment_mode: payload.paymentMode,
      payment_type: payload.paymentType,
      payment_amount: payload.paymentAmount,
      items: payload.items.map(i => ({
        product_id: i.productId,
        variant_index: i.variantIndex ?? null,
        quantity: i.quantity,
        selling_price: i.sellingPrice,
      })),
    },
  });

  if (error) {
    console.error('create_order_atomic RPC error:', error);
    return { error: error.message };
  }

  const { order_id: orderId, order_no: orderNo } = data as { order_id: number; order_no: string };

  // Sync to OpenSearch (async background)
  indexOrderInOpenSearch(adminClient, orderId).catch(err => console.error("OpenSearch indexing error:", err));

  revalidateTag('orders', 'max');
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/pos");
  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard/customers");

  return { success: true, orderNo, orderId };
}

export type EditOrderPayload = {
  orderId: number;
  discount: number;
  totalAmount: number;
  status: string;
  fulfillmentStatus: string;
  items: {
    productId: number;
    variantIndex?: number | null;
    quantity: number;
    sellingPrice: number;
  }[];
  existingPaymentIds: number[];
  newPayments: {
    amount: number;
    paymentMode: "CASH" | "ONLINE";
    paymentType: "FULL" | "ADVANCE" | "FINAL";
  }[];
};

export async function updateOrderAction(payload: EditOrderPayload): Promise<ActionState> {
  const adminClient = createAdminClient();
  let userId;
  try {
    userId = await requireInternalUser(adminClient);
  } catch (err: any) {
    return { error: err.message };
  }

  if (payload.items.length === 0) {
    return { error: "Cart is empty." };
  }

  // Fetch current order details to get old items for stock adjustment
  const { data: oldOrder, error: orderFetchError } = await adminClient
    .from("orders")
    .select(`
      id, order_no,
      items:order_items(product_id, variant_index, quantity)
    `)
    .eq("id", payload.orderId)
    .single();

  if (orderFetchError || !oldOrder) {
    return { error: "Order not found." };
  }

  // --- 1. Adjust Stock (Reverse Old Items) ---
  for (const item of (oldOrder.items || [])) {
    const { data: prod } = await adminClient.from("products").select("stock_qty, variants").eq("id", item.product_id).single();
    if (prod) {
      if (item.variant_index != null && prod.variants) {
        const newVariants = [...prod.variants];
        if (newVariants[item.variant_index]) {
          newVariants[item.variant_index].stock_qty += item.quantity;
          await adminClient.from("products").update({ variants: newVariants }).eq("id", item.product_id);
        }
      } else {
        await adminClient.from("products").update({ stock_qty: prod.stock_qty + item.quantity }).eq("id", item.product_id);
      }
    }
  }

  // --- 2. Delete Old Order Items ---
  await adminClient.from("order_items").delete().eq("order_id", payload.orderId);

  // --- 3. Adjust Stock (Deduct New Items) and Insert New Items ---
  for (const item of payload.items) {
    const { data: prod } = await adminClient.from("products").select("stock_qty, variants").eq("id", item.productId).single();
    if (prod) {
      if (item.variantIndex != null && prod.variants) {
        const newVariants = [...prod.variants];
        if (newVariants[item.variantIndex]) {
          newVariants[item.variantIndex].stock_qty = Math.max(0, newVariants[item.variantIndex].stock_qty - item.quantity);
          await adminClient.from("products").update({ variants: newVariants }).eq("id", item.productId);
        }
      } else {
        await adminClient.from("products").update({ stock_qty: Math.max(0, prod.stock_qty - item.quantity) }).eq("id", item.productId);
      }
    }
    
    await adminClient.from("order_items").insert({
      order_id: payload.orderId,
      product_id: item.productId,
      quantity: item.quantity,
      selling_price: item.sellingPrice,
      subtotal: item.quantity * item.sellingPrice,
      variant_index: item.variantIndex ?? null,
    });
  }

  // --- 4. Update Payments ---
  if (payload.existingPaymentIds.length > 0) {
    // Delete payments not in existing list
    await adminClient.from("payments").delete().eq("order_id", payload.orderId).not("id", "in", `(${payload.existingPaymentIds.join(",")})`);
  } else {
    // Delete all payments if no existing ones are kept
    await adminClient.from("payments").delete().eq("order_id", payload.orderId);
  }

  for (const pay of payload.newPayments) {
    await adminClient.from("payments").insert({
      order_id: payload.orderId,
      amount: pay.amount,
      payment_mode: pay.paymentMode,
      payment_type: pay.paymentType,
    });
  }

  // --- 5. Update Order Record ---
  const { error: updateError } = await adminClient
    .from("orders")
    .update({
      discount: payload.discount,
      total_amount: payload.totalAmount,
      status: payload.status,
      fulfillment_status: payload.fulfillmentStatus,
    })
    .eq("id", payload.orderId);

  if (updateError) {
    return { error: updateError.message };
  }

  // --- 6. Sync OpenSearch and Log ---
  indexOrderInOpenSearch(adminClient, payload.orderId).catch(err => console.error("OpenSearch indexing error:", err));

  await logActivity(adminClient, userId, 'ORDER_EDITED', 'order', payload.orderId, `Edited order details, items, and payments`);

  revalidateTag('orders', 'max');
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/pos");
  revalidatePath("/dashboard/products");

  return { success: true, orderNo: oldOrder.order_no, orderId: payload.orderId };
}

export type Order = {
  id: number;
  order_no: string;
  order_date: string;
  order_type?: string;
  status: string;
  fulfillment_status: string;
  total_amount: number;
  discount: number;
  customer: { id: number; name: string; phone?: string; email?: string; address?: string } | null;
  user: { name: string } | null;
  // Included in details
  items?: {
    quantity: number;
    selling_price: number;
    subtotal: number;
    variant_index?: number | null;
    product: {
      id: number;
      product_code: string;
      name: string;
      base: number | null;
      height: number | null;
      variants?: any[] | null;
      stock_qty?: number;
      default_selling_price?: number;
      cost_price?: number;
    } | null;
  }[];
  payments?: {
    id: number;
    payment_mode: string;
    payment_type: string;
    amount: number;
  }[];
};

export async function listOrders(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  fulfillment?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<{ data: Order[], totalCount: number }> {
  const adminClient = createAdminClient();
  await requireInternalUser(adminClient);
  const page = Math.max(1, Math.floor(params?.page || 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(params?.pageSize || 25)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

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
      customer:customers(id, name, phone, email, address),
      user:users(name),
      payments(
        id,
        payment_mode,
        payment_type,
        amount
      ),
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
          stock_qty,
          default_selling_price,
          cost_price
        )
      )
    `, { count: 'exact' });

  if (params?.status && params.status !== 'ALL') {
    query = query.eq('status', params.status);
  }
  
  if (params?.fulfillment && params.fulfillment !== 'ALL') {
    query = query.eq('fulfillment_status', params.fulfillment);
  }

  if (params?.dateFrom) {
    query = query.gte('order_date', params.dateFrom);
  }

  if (params?.dateTo) {
    query = query.lte('order_date', params.dateTo);
  }

  if (params?.search) {
    const searchStr = params.search.trim();
    if (searchStr) {
      // 1. Try OpenSearch first across all fields
      const searchResult = await searchIndex("orders", searchStr, [
        "order_no",
        "customer_name",
        "customer_phone",
        "customer_email",
        "customer_address",
        "product_names",
        "product_codes",
        "category_names",
        "variant_labels",
        "staff_name",
        "amounts",
        "search_text"
      ]);
      
      let matchedOrderIds: number[] | null = null;
      if (searchResult !== null && searchResult.ids.length > 0) {
        matchedOrderIds = searchResult.ids;
      }

      // 2. If OpenSearch gave no results or is unavailable, run comprehensive multi-table DB search
      if (matchedOrderIds === null || matchedOrderIds.length === 0) {
        const safeSearchStr = searchStr
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"')
          .replace(/%/g, '\\%')
          .replace(/_/g, '\\_');

        const cleanAmountStr = searchStr.replace(/[₹,\s]/g, '').trim();
        const numVal = cleanAmountStr !== "" && !isNaN(Number(cleanAmountStr)) ? Number(cleanAmountStr) : null;

        const [ordersByNo, matchingCusts, matchingProds, matchingCategories, matchingUsers] = await Promise.all([
          adminClient.from("orders").select("id").ilike("order_no", `%${safeSearchStr}%`),
          adminClient.from("customers").select("id").or(`name.ilike.%${safeSearchStr}%,phone.ilike.%${safeSearchStr}%,email.ilike.%${safeSearchStr}%,address.ilike.%${safeSearchStr}%`),
          adminClient.from("products").select("id").or(`name.ilike.%${safeSearchStr}%,product_code.ilike.%${safeSearchStr}%`),
          adminClient.from("categories").select("id").ilike("name", `%${safeSearchStr}%`),
          adminClient.from("users").select("id").ilike("name", `%${safeSearchStr}%`)
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
          subResults.forEach(res => {
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

      if (!matchedOrderIds || matchedOrderIds.length === 0) {
        return { data: [], totalCount: 0 };
      }
      query = query.in("id", matchedOrderIds);
    }
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Error fetching orders:", error);
    return { data: [], totalCount: 0 };
  }

  type OrderJoinedRow = {
    id: number;
    order_no: string;
    order_date: string;
    status: string;
    fulfillment_status: string;
    total_amount: number;
    discount: number;
    customer?: { id: number; name: string; phone: string; email: string; address: string } | { id: number; name: string; phone: string; email: string; address: string }[];
    user?: { name: string } | { name: string }[];
    payments?: { id: number; payment_mode: string; payment_type: string; amount: number }[];
    items?: any[];
  };

  const formattedData: Order[] = (data as unknown as OrderJoinedRow[]).map((d) => ({
    id: d.id,
    order_no: d.order_no,
    order_date: d.order_date,
    status: d.status,
    fulfillment_status: d.fulfillment_status,
    total_amount: d.total_amount,
    discount: d.discount,
    customer: Array.isArray(d.customer) ? d.customer[0] : (d.customer || null),
    user: Array.isArray(d.user) ? d.user[0] : (d.user || null),
    payments: d.payments || [],
    order_type: d.status === 'PENDING' || d.payments?.some((p) => p.payment_type === 'ADVANCE') ? 'BOOKING' : 'DIRECT',
    items: (d.items || []).map((item: any) => ({
      ...item,
      product: Array.isArray(item.product) ? item.product[0] : item.product
    }))
  }));

  return { data: formattedData, totalCount: count || 0 };
}

export async function searchOrdersAction(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  fulfillment?: string;
  dateFrom?: string;
  dateTo?: string;
  paymentMode?: string;
  orderType?: string;
}): Promise<{ data: Order[], totalCount: number }> {
  // Leverage the existing listOrders to get the base data
  // Then we can filter in memory for paymentMode and orderType since Supabase 
  // complex inner joins on one-to-many relationships are tricky without RPCs
  const { data: baseOrders, totalCount: baseCount } = await listOrders({
    ...params,
    // We fetch a bit more to ensure we have enough after client-side filtering
    // In a real prod environment with huge datasets, we'd want an RPC or a View
    // but this is fine for now as pagination is small.
    pageSize: 1000 // Temporary workaround for in-memory filtering pagination
  });

  let filtered = baseOrders;

  if (params?.paymentMode && params.paymentMode !== 'ALL') {
    filtered = filtered.filter(o => 
      o.payments?.some(p => p.payment_mode === params.paymentMode)
    );
  }

  if (params?.orderType && params.orderType !== 'ALL') {
    filtered = filtered.filter(o => o.order_type === params.orderType);
  }

  const page = Math.max(1, Math.floor(params?.page || 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(params?.pageSize || 25)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize;

  return {
    data: filtered.slice(from, to),
    totalCount: filtered.length
  };
}

export async function getCustomerOrdersAction(customerId: number): Promise<Order[]> {
  const adminClient = createAdminClient();
  
  const { data, error } = await adminClient
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
      ),
      items:order_items(
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
          stock_qty,
          default_selling_price,
          cost_price
        )
      )
    `)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching customer orders:", error);
    return [];
  }

  return data.map((d: any) => ({
    ...d,
    customer: Array.isArray(d.customer) ? d.customer[0] : d.customer,
    user: Array.isArray(d.user) ? d.user[0] : d.user,
    order_type: d.status === 'PENDING' || d.payments?.some((p: any) => p.payment_type === 'ADVANCE') ? 'BOOKING' : 'DIRECT',
    items: d.items?.map((item: any) => ({
      ...item,
      product: Array.isArray(item.product) ? item.product[0] : item.product
    })) || []
  })) as Order[];
}

export async function getOrderDetails(orderId: number): Promise<Order | null> {
  const adminClient = createAdminClient();
  
  const { data, error } = await adminClient
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
      items:order_items(
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
          stock_qty,
          default_selling_price,
          cost_price
        )
      ),
      payments(
        id,
        payment_mode,
        payment_type,
        amount
      )
    `)
    .eq("id", orderId)
    .single();

  if (error || !data) {
    console.error("Error fetching order details:", error);
    return null;
  }

  return {
    ...data,
    customer: Array.isArray(data.customer) ? data.customer[0] : data.customer,
    user: Array.isArray(data.user) ? data.user[0] : data.user,
    order_type: data.status === 'PENDING' || data.payments?.some((p: any) => p.payment_type === 'ADVANCE') ? 'BOOKING' : 'DIRECT',
    // handle nested products array in case supabase returns it as array
    items: data.items?.map((item: any) => ({
      ...item,
      product: Array.isArray(item.product) ? item.product[0] : item.product
    }))
  } as Order;
}

export async function deleteOrdersAction(orderIds: number[]): Promise<ActionState> {
  if (!orderIds || orderIds.length === 0) {
    return { error: "No orders selected." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role || user?.user_metadata?.role;
  if (role === "STAFF") {
    return { error: "Unauthorized: STAFF cannot delete orders." };
  }

  const adminClient = createAdminClient();
  let userId;
  try {
    userId = await requireInternalUser(adminClient);
  } catch (err: any) {
    return { error: err.message };
  }

  // Due to possible foreign key constraints without cascade (like payments and order_items),
  // we might need to delete those first.
  const { error: itemsErr } = await adminClient.from("order_items").delete().in("order_id", orderIds);
  if (itemsErr) {
    console.error("Error deleting order items:", itemsErr);
    return { error: `Failed to delete order items: ${itemsErr.message}` };
  }

  const { error: paymentsErr } = await adminClient.from("payments").delete().in("order_id", orderIds);
  if (paymentsErr) {
    console.error("Error deleting payments:", paymentsErr);
    return { error: `Failed to delete payments: ${paymentsErr.message}` };
  }

  const { error } = await adminClient.from("orders").delete().in("id", orderIds);

  if (error) {
    console.error("Error deleting orders:", error);
    return { error: `Failed to delete orders: ${error.message}` };
  }

  // Remove from OpenSearch
  for (const id of orderIds) {
    await deleteDocument("orders", id);
  }

  await Promise.all(orderIds.map(id =>
    logActivity(adminClient, userId, 'ORDER_DELETED', 'order', id, `Deleted order`)
  ));

  revalidateTag('orders', 'max');
  revalidatePath("/dashboard/orders");
  return { success: true };
}

export async function updateOrderStatusAction(orderId: number, status: string, fulfillmentStatus: string): Promise<ActionState> {
  const adminClient = createAdminClient();
  let userId;
  try {
    userId = await requireInternalUser(adminClient);
  } catch (err: any) {
    return { error: err.message };
  }
  
  if (status === 'COMPLETED') {
    const { data: orderDetails } = await adminClient
      .from("orders")
      .select("total_amount, payments(amount)")
      .eq("id", orderId)
      .single();
      
    if (orderDetails) {
      const totalPaid = orderDetails.payments?.reduce((acc: number, p: any) => acc + Number(p.amount), 0) || 0;
      if (totalPaid < (orderDetails.total_amount || 0)) {
        return { error: "Full payment is required to mark the order as COMPLETED." };
      }
    }
  }

  const { error } = await adminClient
    .from("orders")
    .update({ status, fulfillment_status: fulfillmentStatus })
    .eq("id", orderId);

  if (error) {
    return { error: `Failed to update status: ${error.message}` };
  }

  // Update in OpenSearch (async background)
  indexOrderInOpenSearch(adminClient, orderId).catch(err => console.error("OpenSearch indexing error:", err));

  await logActivity(adminClient, userId, 'ORDER_STATUS_UPDATED', 'order', orderId, `Updated status to ${status}, fulfillment to ${fulfillmentStatus}`);

  revalidateTag('orders', 'max');
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function addOrderPaymentAction(orderId: number, amount: number, paymentMode: string, paymentType: string): Promise<ActionState> {
  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("payments")
    .insert({
      order_id: orderId,
      amount,
      payment_mode: paymentMode,
      payment_type: paymentType
    });

  if (error) {
    return { error: `Failed to add payment: ${error.message}` };
  }

  revalidateTag('orders', 'max');
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");
  return { success: true };
}
