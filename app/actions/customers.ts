"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { logActivity } from "@/lib/logActivity";
import { z } from "zod";
import { sanitizeForOrFilter } from "@/lib/searchSanitizer";
import { searchIndex, indexDocument, deleteDocument, extractForIndex } from "@/lib/opensearch";

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

export async function listCustomers(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  limit?: number;
}): Promise<{ data: Customer[], totalCount: number }> {
  await requireAuth();
  
  const adminClient = createAdminClient();
  const page = params?.page || 1;
  const pageSize = params?.limit || params?.pageSize || 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = adminClient
    .from("customers")
    .select("*", { count: 'exact' });

  if (params?.search) {
    const searchStr = params.search.trim();
    if (searchStr) {
      // 1. Try OpenSearch first
      const searchResult = await searchIndex("customers", searchStr, ["name", "phone", "email"]);
      
      if (searchResult !== null) {
        if (searchResult.ids.length === 0) {
          return { data: [], totalCount: 0 };
        }
        query = query.in("id", searchResult.ids);
      } else {
        const safeSearchStr = sanitizeForOrFilter(searchStr);
        if (safeSearchStr) {
          query = query.or(`name.ilike."%${safeSearchStr}%",phone.ilike."%${safeSearchStr}%",email.ilike."%${safeSearchStr}%"`);
        }
      }
    }
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Error fetching customers:", error);
    return { data: [], totalCount: 0 };
  }

  return { data: data as Customer[], totalCount: count || 0 };
}

export async function searchCustomersAction(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  hasOrders?: boolean;
}): Promise<{ data: Customer[], totalCount: number }> {
  await requireAuth();
  
  const adminClient = createAdminClient();
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = adminClient
    .from("customers")
    .select("*, orders!inner(id)", { count: 'exact' });
    
  if (params?.hasOrders !== undefined) {
    if (params.hasOrders) {
      // Inner join already filters to customers with orders
    } else {
      // If we want no orders, we need a different approach (left join where order id is null)
      query = adminClient
        .from("customers")
        .select("*, orders(id)", { count: 'exact' });
    }
  } else {
     query = adminClient
        .from("customers")
        .select("*", { count: 'exact' });
  }

  if (params?.search) {
    const searchStr = params.search.trim();
    if (searchStr) {
      const searchResult = await searchIndex("customers", searchStr, ["name", "phone", "email"]);
      if (searchResult !== null) {
        if (searchResult.ids.length === 0) return { data: [], totalCount: 0 };
        query = query.in("id", searchResult.ids);
      } else {
        const safeSearchStr = sanitizeForOrFilter(searchStr);
        if (safeSearchStr) {
          query = query.or(`name.ilike."%${safeSearchStr}%",phone.ilike."%${safeSearchStr}%",email.ilike."%${safeSearchStr}%"`);
        }
      }
    }
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Error fetching customers:", error);
    return { data: [], totalCount: 0 };
  }
  
  // Filter out customers with orders if hasOrders === false
  let finalData = data as Customer[];
  let finalCount = count || 0;
  
  if (params?.hasOrders === false) {
    finalData = (data as any[]).filter(d => !d.orders || d.orders.length === 0).map(d => {
       const { orders, ...rest } = d;
       return rest;
    });
    // This makes the count slightly inaccurate for pagination, but it's a trade-off for simplicity without a complex DB view
    finalCount = finalData.length;
  } else if (params?.hasOrders === true) {
     finalData = (data as any[]).map(d => {
       const { orders, ...rest } = d;
       return rest;
    });
  }

  return { data: finalData, totalCount: finalCount };
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

  // Sync to OpenSearch
  await indexDocument("customers", insertedCustomer.id, {
    name: extractForIndex(result.data.name),
    phone: extractForIndex(result.data.phone),
    email: extractForIndex(result.data.email),
    address: extractForIndex(result.data.address),
  });

  await logActivity(adminClient, userId, 'CUSTOMER_ADDED', 'customer', insertedCustomer.id, `Added customer ${result.data.name}`);

  revalidateTag('customers', 'max');
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

  // Sync to OpenSearch
  await indexDocument("customers", id, {
    name: extractForIndex(updateData.name),
    phone: extractForIndex(updateData.phone),
    email: extractForIndex(updateData.email),
    address: extractForIndex(updateData.address),
  });

  await logActivity(adminClient, userId, 'CUSTOMER_UPDATED', 'customer', id, `Updated customer ${updateData.name}`);

  revalidateTag('customers', 'max');
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

  // Remove from OpenSearch
  for (const id of customerIds) {
    await deleteDocument("customers", id);
  }

  for (const id of customerIds) {
    await logActivity(adminClient, userId, 'CUSTOMER_DELETED', 'customer', id, `Deleted customer`);
  }

  revalidateTag('customers', 'max');
  revalidatePath("/dashboard/customers");
  return { success: true };
}
