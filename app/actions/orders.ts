"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
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

  let finalCustomerId = payload.customerId;

  // 1. Create customer if needed
  if (!finalCustomerId) {
    if (!payload.newCustomerName || !payload.newCustomerPhone) {
      return { error: "Customer details are required." };
    }
    
    const { data: newCust, error: custErr } = await adminClient
      .from("customers")
      .insert({
        name: payload.newCustomerName,
        phone: payload.newCustomerPhone,
        email: payload.newCustomerEmail || null,
      })
      .select("id")
      .single();
      
    if (custErr) return { error: `Customer creation failed: ${custErr.message}` };
    finalCustomerId = newCust.id;
  }

  // 2. Generate Order Number
  const orderNo = await generateOrderNumber(adminClient);
  
  // Status mapping
  const status = payload.orderType === "BOOKING" ? "PENDING" : "COMPLETED";
  const fulfillmentStatus = payload.orderType === "BOOKING" ? "PENDING" : "FULFILLED";

  // 3. Create Order
  const { data: newOrder, error: orderErr } = await adminClient
    .from("orders")
    .insert({
      order_no: orderNo,
      customer_id: finalCustomerId,
      user_id: userId,
      status: status,
      fulfillment_status: fulfillmentStatus,
      discount: payload.discount,
      total_amount: payload.totalAmount
    })
    .select("id")
    .single();

  if (orderErr) return { error: `Order creation failed: ${orderErr.message}` };
  
  const orderId = newOrder.id;

  // 4. Create Order Items and Deduct Stock
  const orderItemsData = payload.items.map(item => ({
    order_id: orderId,
    product_id: item.productId,
    quantity: item.quantity,
    selling_price: item.sellingPrice,
    subtotal: item.quantity * item.sellingPrice
  }));

  const { error: itemsErr } = await adminClient
    .from("order_items")
    .insert(orderItemsData);

  if (itemsErr) return { error: `Order items failed: ${itemsErr.message}` };

  // Deduct Stock
  for (const item of payload.items) {
    // We need to fetch current stock first or use an RPC if available. 
    // We will do a read/write here.
    const { data: prod } = await adminClient.from("products").select("stock_qty").eq("id", item.productId).single();
    if (prod) {
      const newStock = Math.max(0, prod.stock_qty - item.quantity);
      await adminClient.from("products").update({ stock_qty: newStock }).eq("id", item.productId);
    }
  }

  // 5. Record Payment
  const { error: payErr } = await adminClient
    .from("payments")
    .insert({
      order_id: orderId,
      amount: payload.paymentAmount,
      payment_mode: payload.paymentMode,
      payment_type: payload.paymentType
    });

  if (payErr) return { error: `Payment creation failed: ${payErr.message}` };

  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/pos");
  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard/customers");

  await logActivity(adminClient, userId, 'ORDER_CREATED', 'order', orderId, `Order #${orderNo}`);

  return { success: true, orderNo, orderId };
}

export type Order = {
  id: number;
  order_no: string;
  order_date: string;
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
    product: {
      product_code: string;
      name: string;
    } | null;
  }[];
  payments?: {
    payment_mode: string;
    payment_type: string;
    amount: number;
  }[];
};

export async function listOrders(): Promise<Order[]> {
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
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching orders:", error);
    return [];
  }

  // Map supabase response to our exact type. 
  // It returns arrays for 1-1 joins if standard schema foreign keys are used without singular inference in types.
  // Actually, standard supabase-js single fk selects return single object or array depending on the setup. 
  // We'll handle both just in case.
  return data.map((d: any) => ({
    ...d,
    customer: Array.isArray(d.customer) ? d.customer[0] : d.customer,
    user: Array.isArray(d.user) ? d.user[0] : d.user
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
        product:products(
          product_code,
          name
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

  for (const id of orderIds) {
    await logActivity(adminClient, userId, 'ORDER_DELETED', 'order', id, `Deleted order`);
  }

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

  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");
  return { success: true };
}
