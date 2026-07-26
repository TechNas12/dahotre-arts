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

export async function listExpenses(from?: string, to?: string): Promise<Expense[]> {
  const adminClient = createAdminClient();
  
  let query = adminClient
    .from("expenses")
    .select(`
      id,
      user_id,
      description,
      amount,
      datetime,
      user:users(name)
    `)
    .order("datetime", { ascending: false });

  if (from) {
    query = query.gte("datetime", `${from}T00:00:00Z`);
  }
  if (to) {
    query = query.lte("datetime", `${to}T23:59:59Z`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching expenses:", error);
    return [];
  }

  // Handle single object vs array for joins
  return data.map((d: any) => ({
    ...d,
    user: Array.isArray(d.user) ? d.user[0] : d.user
  })) as Expense[];
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

  revalidatePath("/dashboard/expenses");
  return { success: true };
}
