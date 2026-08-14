export const dynamic = 'force-dynamic';

import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { listCustomers } from "@/app/actions/customers";
import CustomersTable from "./CustomersTable";

async function CustomersData({ role, searchParams }: { role: string, searchParams: { [key: string]: string | undefined } }) {
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const pageSize = searchParams.pageSize ? parseInt(searchParams.pageSize, 10) : 25;
  const search = searchParams.search || '';

  let customers: any[] = [];
  let totalCount = 0;
  
  try {
    const result = await listCustomers({ page, pageSize, search });
    customers = result.data;
    totalCount = result.totalCount;
  } catch (e) {
    console.error("Failed to load customers:", e);
  }
  
  return (
    <CustomersTable 
      initialCustomers={customers} 
      userRole={role}
      totalCount={totalCount}
      initialPage={page}
      initialPageSize={pageSize}
      initialSearch={search}
    />
  );
}

export default async function CustomersPage({ searchParams }: { searchParams: { [key: string]: string | undefined } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = user.app_metadata?.role || user.user_metadata?.role || "ADMIN";
  const suspenseKey = JSON.stringify(searchParams);

  return (
    <div className="space-y-6 animate-[fadeInUp_0.4s_ease-out_forwards]">
      <div>
        <h1 className="text-3xl font-bold text-[#F5F5F5] tracking-tight">Customers</h1>
        <p className="text-[#A3A3A3] mt-2">Manage your customer database and contact information.</p>
      </div>

      <Suspense key={suspenseKey} fallback={
        <div className="w-full h-[600px] bg-[#111111] border border-[#1F1F1F] rounded-xl animate-pulse"></div>
      }>
        <CustomersData role={role} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
