import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReportsView } from "./ReportsView";

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = user.app_metadata?.role || user.user_metadata?.role;
  if (role === "STAFF") {
    redirect("/dashboard/pos");
  }

  return (
    <ReportsView />
  );
}
