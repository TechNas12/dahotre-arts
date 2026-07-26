export const dynamic = 'force-dynamic';

import { listExpenses } from "@/app/actions/expenses";
import ExpensesTable from "./ExpensesTable";
import { createClient } from "@/lib/supabase/server";

export default async function ExpensesPage() {
  const expenses = await listExpenses();
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role || user?.user_metadata?.role || "ADMIN";

  return (
    <div className="space-y-6 animate-[fadeInUp_0.4s_ease-out_forwards]">
      <div>
        <h1 className="text-3xl font-bold text-slate-50 tracking-tight">Expenses</h1>
        <p className="text-slate-400 mt-2">Track and manage your business expenses.</p>
      </div>

      <ExpensesTable initialExpenses={expenses} role={role} />
    </div>
  );
}
