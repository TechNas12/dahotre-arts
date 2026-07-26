"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/logActivity";
import { z } from "zod";

export type ActionState = {
  error?: string;
  success?: boolean;
};

export type Customer = {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  created_at: string;
};

// Ensure user is authenticated
async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const adminClient = createAdminClient();
  const { data: dbUser } = await adminClient.from("users").select("id").eq("supabase_uid", user.id).single();
  let userId = dbUser?.id;
  
  if (!userId && user.email) {
     const { data: dbUserEmail } = await adminClient.from("users").select("id").eq("email", user.email).single();
     userId = dbUserEmail?.id;
  }
  
  if (!userId) {
     throw new Error("Your account is not fully linked to a staff profile.");
  }

  return { supabase, user, userId };
}

// Ensure user is SUPERADMIN
async function verifySuperadmin() {
  const { user, userId } = await requireAuth();
  
  const role = user.app_metadata?.role || user.user_metadata?.role;
  if (role !== "SUPERADMIN") {
    throw new Error("Unauthorized: Only SUPERADMIN can perform this action");
  }
  
  return { user, userId };
}

export async function listCustomers(): Promise<Customer[]> {
  await requireAuth(); // just to verify they are logged in
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching customers:", error);
    return [];
  }

  return data as Customer[];
}

const customerSchema = z.object({
  name: z.string().min(2, "Customer name must be at least 2 characters"),
  email: z.string().email("Invalid email address").or(z.literal("")),
  phone: z.string().or(z.literal("")),
  address: z.string().or(z.literal("")),
});

export async function createCustomerAction(
  prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  let adminClient;
  let userId;
  try {
    const auth = await requireAuth();
    userId = auth.userId;
    adminClient = createAdminClient();
  } catch (err: any) {
    return { error: err.message };
  }

  const result = customerSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { data: insertedCustomer, error } = await adminClient.from("customers").insert({
    name: result.data.name,
    email: result.data.email || null,
    phone: result.data.phone || null,
    address: result.data.address || null,
  }).select("id").single();

  if (error) {
    return { error: error.message };
  }

  await logActivity(adminClient, userId, 'CUSTOMER_ADDED', 'customer', insertedCustomer.id, `Added customer ${result.data.name}`);

  revalidatePath("/dashboard/customers");
  return { success: true };
}

const updateCustomerSchema = customerSchema.extend({
  id: z.coerce.number(),
});

export async function updateCustomerAction(
  prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  let adminClient;
  let userId;
  try {
    const auth = await requireAuth();
    userId = auth.userId;
    adminClient = createAdminClient();
  } catch (err: any) {
    return { error: err.message };
  }

  const result = updateCustomerSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { id, ...updateData } = result.data;

  const { error } = await adminClient
    .from("customers")
    .update({
      name: updateData.name,
      email: updateData.email || null,
      phone: updateData.phone || null,
      address: updateData.address || null,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  await logActivity(adminClient, userId, 'CUSTOMER_UPDATED', 'customer', id, `Updated customer ${updateData.name}`);

  revalidatePath("/dashboard/customers");
  return { success: true };
}

export async function deleteCustomersAction(customerIds: number[]): Promise<ActionState> {
  let adminClient;
  let userId;
  try {
    // ENFORCED GUARDRAIL: Only SUPERADMIN can delete customers
    const auth = await verifySuperadmin();
    userId = auth.userId;
    adminClient = createAdminClient();
  } catch (err: any) {
    return { error: err.message };
  }

  if (!customerIds || customerIds.length === 0) {
    return { error: "No customers selected for deletion." };
  }

  const { error } = await adminClient
    .from("customers")
    .delete()
    .in("id", customerIds);

  if (error) {
    return { error: `Failed to delete customers: ${error.message}` };
  }

  for (const id of customerIds) {
    await logActivity(adminClient, userId, 'CUSTOMER_DELETED', 'customer', id, `Deleted customer`);
  }

  revalidatePath("/dashboard/customers");
  return { success: true };
}
