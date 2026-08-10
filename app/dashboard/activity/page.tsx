import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ActivityView from "./ActivityView";
import { 
  getActivityStats, 
  getActionTypeBreakdown, 
  getActivityOverTime,
  listAllUsers 
} from "@/app/actions/activity";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ActivityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = user.app_metadata?.role || user.user_metadata?.role;
  if (role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  // Fetch initial aggregate data
  const [stats, typeBreakdown, overTime, allUsers] = await Promise.all([
    getActivityStats(),
    getActionTypeBreakdown(),
    getActivityOverTime(14),
    listAllUsers()
  ]);

  return (
    <ActivityView 
      initialStats={stats}
      typeBreakdown={typeBreakdown}
      activityOverTime={overTime}
      allUsers={allUsers}
    />
  );
}


