export const dynamic = 'force-dynamic';

import { Suspense } from "react";
import { listExpenses } from "@/app/actions/expenses";
import ExpensesTable from "./ExpensesTable";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

async function ExpensesData({ role, searchParams }: { role: string, searchParams: { [key: string]: string | undefined } }) {
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const pageSize = searchParams.pageSize ? parseInt(searchParams.pageSize, 10) : 25;
  const search = searchParams.search || '';

  let expenses: any[] = [];
  let totalCount = 0;

  try {
    const result = await listExpenses({ page, pageSize, search });
    expenses = result.data;
    totalCount = result.totalCount;
  } catch (e) {
    console.error("Failed to load expenses:", e);
  }

  return (
    <ExpensesTable 
      initialExpenses={expenses} 
      role={role} 
      totalCount={totalCount}
      initialPage={page}
      initialPageSize={pageSize}
      initialSearch={search}
    />
  );
}

export default async function ExpensesPage({ searchParams }: { searchParams: { [key: string]: string | undefined } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role || user?.user_metadata?.role || "ADMIN";

  if (role === "STAFF") {
    redirect("/dashboard/pos");
  }

  const suspenseKey = JSON.stringify(searchParams);

  return (
    <div className="space-y-6 animate-[fadeInUp_0.4s_ease-out_forwards]">
      <div>
        <h1 className="text-3xl font-bold text-[#F5F5F5] tracking-tight">Expenses</h1>
        <p className="text-[#A3A3A3] mt-2">Track and manage your business expenses.</p>
      </div>

      <Suspense key={suspenseKey} fallback={
        <div className="w-full h-[600px] bg-[#111111] border border-[#1F1F1F] rounded-xl animate-pulse"></div>
      }>
        <ExpensesData role={role} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
