export const dynamic = 'force-dynamic';

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { listCustomers } from "@/app/actions/customers";
import CustomersTable from "./CustomersTable";

export default async function CustomersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = user.app_metadata?.role || user.user_metadata?.role || "ADMIN";

  let customers: any[] = [];
  try {
    customers = await listCustomers();
  } catch (e) {
    console.error("Failed to load customers:", e);
  }

  return (
    <div className="space-y-6 animate-[fadeInUp_0.4s_ease-out_forwards]">
      <div>
        <h1 className="text-3xl font-bold text-slate-50 tracking-tight">Customers</h1>
        <p className="text-slate-400 mt-2">Manage your customer database and contact information.</p>
      </div>

      <CustomersTable initialCustomers={customers} userRole={role} />
    </div>
  );
}
