"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { logActivity } from "@/lib/logActivity";
import { z } from "zod";
import { sanitizeForIlike } from "@/lib/searchSanitizer";

export type ActionState = {
  error?: string;
  success?: boolean;
};

export type Expense = {
  id: number;
  user_id: number;
  description: string;
  amount: number;
  datetime: string;
  user?: { name: string } | null;
};

// Ensure user is authenticated and get internal user id
async function requireAuthAndGetDbUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const role = user.app_metadata?.role || user.user_metadata?.role;
  if (role === "STAFF") {
    throw new Error("Unauthorized: STAFF cannot access expenses.");
  }

  const adminClient = createAdminClient();
  
  // Get internal user id
  const { data: dbUser } = await adminClient
    .from("users")
    .select("id")
    .eq("supabase_uid", user.id)
    .single();

  let userId = dbUser?.id;
  
  // Fallback to email if supabase_uid is not set yet
  if (!userId && user.email) {
      const { data: dbUserEmail } = await adminClient
        .from("users")
        .select("id")
        .eq("email", user.email)
        .single();
      userId = dbUserEmail?.id;
  }
  
  if (!userId) {
      throw new Error("Your account is not fully linked to a staff profile. Please contact an administrator.");
  }

  return { supabase, user, userId, role: user.app_metadata?.role || user.user_metadata?.role };
}

export async function listExpenses(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  from?: string;
  to?: string;
}): Promise<{ data: Expense[], totalCount: number }> {
  await requireAuthAndGetDbUser();
  
  const adminClient = createAdminClient();
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 25;
  const fromLimit = (page - 1) * pageSize;
  const toLimit = fromLimit + pageSize - 1;

  let query = adminClient
    .from("expenses")
    .select(`
      id,
      user_id,
      description,
      amount,
      datetime,
      user:users(name)
    `, { count: 'exact' });

  // Use IST timezone offset (+05:30) for filtering
  const IST_OFFSET = "+05:30";

  if (params?.from) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(params.from)) {
      throw new Error("Invalid 'from' date format. Expected YYYY-MM-DD");
    }
    query = query.gte("datetime", `${params.from}T00:00:00${IST_OFFSET}`);
  }
  if (params?.to) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(params.to)) {
      throw new Error("Invalid 'to' date format. Expected YYYY-MM-DD");
    }
    query = query.lte("datetime", `${params.to}T23:59:59${IST_OFFSET}`);
  }

  if (params?.search) {
    const searchStr = sanitizeForIlike(params.search);
    if (searchStr) {
      query = query.ilike("description", `%${searchStr}%`);
    }
  }

  const { data, error, count } = await query
    .order("datetime", { ascending: false })
    .range(fromLimit, toLimit);

  if (error) {
    console.error("Error fetching expenses:", error);
    return { data: [], totalCount: 0 };
  }

  type ExpenseJoinedRow = {
    id: number;
    user_id: number;
    description: string;
    amount: number;
    datetime: string;
    user?: { name: string } | { name: string }[] | null;
  };

  const formattedData: Expense[] = data.map((d: ExpenseJoinedRow) => ({
    id: d.id,
    user_id: d.user_id,
    description: d.description,
    amount: d.amount,
    datetime: d.datetime,
    user: Array.isArray(d.user) ? d.user[0] : d.user
  }));

  return { data: formattedData, totalCount: count || 0 };
}

const expenseSchema = z.object({
  description: z.string().min(2, "Description is required"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  datetime: z.string().min(1, "Date and time are required"),
});

export async function createExpenseAction(
  prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  let userId;
  try {
    const authData = await requireAuthAndGetDbUser();
    userId = authData.userId;
  } catch (err: any) {
    return { error: err.message };
  }

  const result = expenseSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const adminClient = createAdminClient();

  // Handle local time vs UTC. The input will likely be YYYY-MM-DDTHH:mm. We just save it as ISO.
  const isoDatetime = new Date(result.data.datetime).toISOString();

  const { data: insertedExpense, error } = await adminClient.from("expenses").insert({
    user_id: userId,
    description: result.data.description,
    amount: result.data.amount,
    datetime: isoDatetime,
  }).select("id").single();

  if (error) {
    return { error: error.message };
  }

  await logActivity(adminClient, userId, 'EXPENSE_ADDED', 'expense', insertedExpense.id, `Added expense ₹${result.data.amount}`);

  revalidateTag('expenses', 'max');
  revalidatePath("/dashboard/expenses");
  return { success: true };
}

const updateExpenseSchema = expenseSchema.extend({
  id: z.coerce.number(),
});

export async function updateExpenseAction(
  prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  let userId;
  try {
    const authData = await requireAuthAndGetDbUser();
    userId = authData.userId;
  } catch (err: any) {
    return { error: err.message };
  }

  const result = updateExpenseSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { id, ...updateData } = result.data;
  const adminClient = createAdminClient();
  
  const isoDatetime = new Date(updateData.datetime).toISOString();

  const { error } = await adminClient
    .from("expenses")
    .update({
      description: updateData.description,
      amount: updateData.amount,
      datetime: isoDatetime,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  await logActivity(adminClient, userId, 'EXPENSE_UPDATED', 'expense', id, `Updated expense ₹${updateData.amount}`);

  revalidateTag('expenses', 'max');
  revalidatePath("/dashboard/expenses");
  return { success: true };
}

export async function deleteExpensesAction(expenseIds: number[]): Promise<ActionState> {
  let userId;
  try {
    const authData = await requireAuthAndGetDbUser();
    if (authData.role !== "SUPERADMIN") {
      return { error: "Unauthorized: Only SUPERADMIN can delete expenses." };
    }
    userId = authData.userId;
  } catch (err: any) {
    return { error: err.message };
  }

  if (!expenseIds || expenseIds.length === 0) {
    return { error: "No expenses selected for deletion." };
  }

  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("expenses")
    .delete()
    .in("id", expenseIds);

  if (error) {
    return { error: `Failed to delete expenses: ${error.message}` };
  }

  for (const id of expenseIds) {
    await logActivity(adminClient, userId, 'EXPENSE_DELETED', 'expense', id, `Deleted expense`);
  }

  revalidateTag('expenses', 'max');
  revalidatePath("/dashboard/expenses");
  return { success: true };
}
