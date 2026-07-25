"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { revalidatePath } from "next/cache";

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

  return { supabase, user };
}

// Ensure user is SUPERADMIN
async function verifySuperadmin() {
  const { user } = await requireAuth();
  
  const role = user.app_metadata?.role || user.user_metadata?.role;
  if (role !== "SUPERADMIN") {
    throw new Error("Unauthorized: Only SUPERADMIN can perform this action");
  }
  
  return user;
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
  try {
    await requireAuth();
    adminClient = createAdminClient();
  } catch (err: any) {
    return { error: err.message };
  }

  const result = customerSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { error } = await adminClient.from("customers").insert({
    name: result.data.name,
    email: result.data.email || null,
    phone: result.data.phone || null,
    address: result.data.address || null,
  });

  if (error) {
    return { error: error.message };
  }

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
  try {
    await requireAuth();
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

  revalidatePath("/dashboard/customers");
  return { success: true };
}

export async function deleteCustomersAction(customerIds: number[]): Promise<ActionState> {
  let adminClient;
  try {
    // ENFORCED GUARDRAIL: Only SUPERADMIN can delete customers
    await verifySuperadmin();
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

  revalidatePath("/dashboard/customers");
  return { success: true };
}
