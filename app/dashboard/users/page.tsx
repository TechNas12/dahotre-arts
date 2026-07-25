import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { listUsers } from "@/app/actions/users";
import UsersTable from "./UsersTable";

export default async function UsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Double-check role for page access
  const role = user.app_metadata?.role || user.user_metadata?.role;
  if (role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  let users: any[] = [];
  try {
    users = await listUsers();
  } catch (e) {
    console.error("Failed to load users:", e);
  }

  return (
    <div className="space-y-6 animate-[fadeInUp_0.4s_ease-out_forwards]">
      <div>
        <h1 className="text-3xl font-bold text-slate-50 tracking-tight">Manage Users</h1>
        <p className="text-slate-400 mt-2">Add and manage staff access to the POS system.</p>
      </div>

      <UsersTable initialUsers={users} currentUserId={user.id} />
    </div>
  );
}
