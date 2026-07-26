"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Ensure user is SUPERADMIN
async function verifySuperadmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const role = user.app_metadata?.role || user.user_metadata?.role;
  if (role !== "SUPERADMIN") {
    throw new Error("Unauthorized: Only SUPERADMIN can perform this action");
  }
  
  return user;
}

export async function getActivityStats() {
  await verifySuperadmin();
  const adminClient = createAdminClient();

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const thisWeek = new Date(today);
  thisWeek.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)

  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  // Note: For large tables, aggregate queries should be optimized or materialized.
  // For small-to-medium datasets, count queries are fast enough.

  const [
    { count: totalCount },
    { count: todayCount },
    { count: thisWeekCount },
    { data: activeUsersData }
  ] = await Promise.all([
    adminClient.from("activity_logs").select("*", { count: 'exact', head: true }),
    adminClient.from("activity_logs").select("*", { count: 'exact', head: true }).gte('created_at', today.toISOString()),
    adminClient.from("activity_logs").select("*", { count: 'exact', head: true }).gte('created_at', thisWeek.toISOString()),
    // For unique users in last 30 days, we'll fetch distinct user_ids
    // Supabase JS doesn't have a distinct count natively, so we fetch the list and count distinct via JS.
    adminClient.from("activity_logs").select("user_id").gte('created_at', thirtyDaysAgo.toISOString())
  ]);

  const uniqueUsers = new Set(activeUsersData?.map(r => r.user_id)).size;

  return {
    totalActions: totalCount || 0,
    todayActions: todayCount || 0,
    thisWeekActions: thisWeekCount || 0,
    activeUsers: uniqueUsers
  };
}

export async function getActionTypeBreakdown() {
  await verifySuperadmin();
  const adminClient = createAdminClient();

  // Supabase RPC is best for grouping, but we can do a simple group by if we fetch all (or we can just fetch all types and group them).
  // Actually, Supabase doesn't natively support group by in JS client without RPC.
  // Given we might have thousands of rows, let's fetch only 'action' column and count in memory, or use RPC if we had one.
  // We'll fetch all actions (might be slow if millions, but fine for typical small ERPs).
  // To avoid memory limits, let's just fetch all 'action' fields.
  const { data, error } = await adminClient.from("activity_logs").select("action");
  
  if (error || !data) return [];

  const counts: Record<string, number> = {};
  for (const row of data) {
    counts[row.action] = (counts[row.action] || 0) + 1;
  }

  return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export async function getActivityOverTime(days = 14) {
  await verifySuperadmin();
  const adminClient = createAdminClient();

  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1);

  const { data, error } = await adminClient
    .from("activity_logs")
    .select("created_at")
    .gte("created_at", startDate.toISOString());

  if (error || !data) return [];

  const dailyCounts: Record<string, number> = {};
  
  // Initialize all days to 0
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    dailyCounts[dateStr] = 0;
  }

  for (const row of data) {
    const dateStr = row.created_at.split('T')[0];
    if (dailyCounts[dateStr] !== undefined) {
      dailyCounts[dateStr]++;
    }
  }

  return Object.entries(dailyCounts).map(([date, count]) => {
    // Format date nicely (e.g. "Mon 25")
    const d = new Date(date);
    return {
      date: d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
      count
    };
  });
}

export async function listAllUsers() {
  await verifySuperadmin();
  const adminClient = createAdminClient();
  const { data } = await adminClient.from("users").select("id, name, email").order("name");
  return data || [];
}

export async function getUserActivitySummary(userId: number) {
  await verifySuperadmin();
  const adminClient = createAdminClient();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);

  const [
    { count: ordersCount },
    { count: productsCount },
    { count: customersCount },
    { count: expensesCount },
    { data: recentActivity }
  ] = await Promise.all([
    adminClient.from("activity_logs").select("*", { count: 'exact', head: true }).eq("user_id", userId).eq("action", "ORDER_CREATED"),
    adminClient.from("activity_logs").select("*", { count: 'exact', head: true }).eq("user_id", userId).eq("action", "PRODUCT_ADDED"),
    adminClient.from("activity_logs").select("*", { count: 'exact', head: true }).eq("user_id", userId).eq("action", "CUSTOMER_ADDED"),
    adminClient.from("activity_logs").select("*", { count: 'exact', head: true }).eq("user_id", userId).eq("action", "EXPENSE_ADDED"),
    adminClient.from("activity_logs").select("created_at").eq("user_id", userId).gte("created_at", sevenDaysAgo.toISOString())
  ]);

  const dailyCounts: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    dailyCounts[dateStr] = 0;
  }

  if (recentActivity) {
    for (const row of recentActivity) {
      const dateStr = row.created_at.split('T')[0];
      if (dailyCounts[dateStr] !== undefined) {
        dailyCounts[dateStr]++;
      }
    }
  }

  const chartData = Object.entries(dailyCounts).map(([date, count]) => {
    const d = new Date(date);
    return {
      date: d.toLocaleDateString('en-US', { weekday: 'short' }),
      count
    };
  });

  return {
    ordersCreated: ordersCount || 0,
    productsAdded: productsCount || 0,
    customersAdded: customersCount || 0,
    expensesAdded: expensesCount || 0,
    chartData
  };
}

export type ActivityLog = {
  id: number;
  user_id: number;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  created_at: string;
  user?: { name: string } | null;
};

export async function listActivityLogs(
  page = 1,
  pageSize = 20,
  filters?: { userId?: number; action?: string; search?: string; from?: string; to?: string }
): Promise<{ data: ActivityLog[]; total: number }> {
  await verifySuperadmin();
  const adminClient = createAdminClient();

  let query = adminClient
    .from("activity_logs")
    .select(`*, user:users(name)`, { count: 'exact' });

  if (filters?.userId) query = query.eq("user_id", filters.userId);
  if (filters?.action) query = query.eq("action", filters.action);
  if (filters?.from) query = query.gte("created_at", `${filters.from}T00:00:00Z`);
  if (filters?.to) query = query.lte("created_at", `${filters.to}T23:59:59Z`);
  if (filters?.search) query = query.ilike("details", `%${filters.search}%`);

  const fromIndex = (page - 1) * pageSize;
  const toIndex = fromIndex + pageSize - 1;

  query = query.order("created_at", { ascending: false }).range(fromIndex, toIndex);

  const { data, count, error } = await query;

  if (error) {
    console.error("Error fetching logs:", error);
    return { data: [], total: 0 };
  }

  return {
    data: data.map((d: any) => ({
      ...d,
      user: Array.isArray(d.user) ? d.user[0] : d.user
    })) as ActivityLog[],
    total: count || 0
  };
}
