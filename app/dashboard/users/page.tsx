export const dynamic = 'force-dynamic';

import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { listUsers } from "@/app/actions/users";
import UsersTable from "./UsersTable";

async function UsersData({ currentUserId, searchParams }: { currentUserId: string, searchParams: { [key: string]: string | undefined } }) {
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const pageSize = searchParams.pageSize ? parseInt(searchParams.pageSize, 10) : 25;
  const search = searchParams.search || '';

  let users: any[] = [];
  let totalCount = 0;
  
  try {
    const result = await listUsers({ page, pageSize, search });
    users = result.data;
    totalCount = result.totalCount;
  } catch (e) {
    console.error("Failed to load users:", e);
  }
  
  return (
    <UsersTable 
      initialUsers={users} 
      currentUserId={currentUserId}
      totalCount={totalCount}
      initialPage={page}
      initialPageSize={pageSize}
      initialSearch={search}
    />
  );
}

export default async function UsersPage({ searchParams }: { searchParams: { [key: string]: string | undefined } }) {
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

  const suspenseKey = JSON.stringify(searchParams);

  return (
    <div className="space-y-6 animate-[fadeInUp_0.4s_ease-out_forwards]">
      <div>
        <h1 className="text-3xl font-bold text-[#F5F5F5] tracking-tight">Manage Users</h1>
        <p className="text-[#A3A3A3] mt-2">Add and manage staff access to the POS system.</p>
      </div>

      <Suspense key={suspenseKey} fallback={
        <div className="w-full h-[600px] bg-[#111111] border border-[#1F1F1F] rounded-xl animate-pulse"></div>
      }>
        <UsersData currentUserId={user.id} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
