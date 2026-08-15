"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { logActivity } from "@/lib/logActivity";

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

  revalidateTag('orders', 'max');
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/pos");
  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard/customers");

  return { success: true, orderNo, orderId };
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
  customer: { name: string; phone?: string; email?: string; address?: string } | null;
  user: { name: string } | null;
  // Included in details
  items?: {
    quantity: number;
    selling_price: number;
    subtotal: number;
    variant_index?: number | null;
    product: {
      product_code: string;
      name: string;
      base: number | null;
      height: number | null;
      variants?: any[] | null;
    } | null;
  }[];
  payments?: {
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
      status,
      fulfillment_status,
      total_amount,
      discount,
      customer:customers(name, phone, email, address),
      user:users(name),
      payments(
        payment_mode,
        payment_type,
        amount
      )
    `, { count: 'exact' });

  if (params?.status && params.status !== 'ALL') {
    query = query.eq('status', params.status);
  }
  
  if (params?.fulfillment && params.fulfillment !== 'ALL') {
    query = query.eq('fulfillment_status', params.fulfillment);
  }

  // To search across joined tables, Supabase requires either RPC or complex views.
  // We can filter by order_no natively. For customer name, we would need to filter after fetching if we want true join search,
  // or use inner join on customers if search is provided.
  if (params?.search) {
    const searchStr = params.search.trim()
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');
    query = query.ilike('order_no', `"%${searchStr}%"`);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Error fetching orders:", error);
    return { data: [], totalCount: 0 };
  }

  type OrderJoinedRow = {
    status: string;
    customer?: { name: string; phone: string; email: string; address: string } | { name: string; phone: string; email: string; address: string }[];
    user?: { name: string } | { name: string }[];
    payments?: { payment_mode: string; payment_type: string; amount: number }[];
    [key: string]: any;
  };

  const formattedData = data.map((d: OrderJoinedRow) => ({
    ...d,
    customer: Array.isArray(d.customer) ? d.customer[0] : d.customer,
    user: Array.isArray(d.user) ? d.user[0] : d.user,
    order_type: d.status === 'PENDING' || d.payments?.some((p) => p.payment_type === 'ADVANCE') ? 'BOOKING' : 'DIRECT'
  })) as Order[];

  return { data: formattedData, totalCount: count || 0 };
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
      customer:customers(name, phone, email, address),
      user:users(name),
      payments(
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
          product_code,
          name,
          base,
          height,
          variants
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
      customer:customers(name, phone, email, address),
      user:users(name),
      items:order_items(
        quantity,
        selling_price,
        subtotal,
        variant_index,
        product:products(
          product_code,
          name,
          base,
          height,
          variants
        )
      ),
      payments(
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
