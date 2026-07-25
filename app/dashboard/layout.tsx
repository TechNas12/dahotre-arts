import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardLayout from "./components/DashboardLayout";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const name = user.user_metadata?.name || user.email;
  const role = user.app_metadata?.role || user.user_metadata?.role || "ADMIN";

  return (
    <DashboardLayout name={name} role={role}>
      {children}
    </DashboardLayout>
  );
}
