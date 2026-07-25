import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardView } from "./components/DashboardView";
import { Suspense } from "react";
import { SkeletonLoader } from "./components/SkeletonLoader";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <Suspense fallback={
      <div className="space-y-6 animate-pulse mt-8">
        <div className="flex justify-between">
          <SkeletonLoader className="h-10 w-48" />
          <SkeletonLoader className="h-10 w-64" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
           <SkeletonLoader className="h-32" />
           <SkeletonLoader className="h-32" />
           <SkeletonLoader className="h-32" />
           <SkeletonLoader className="h-32" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="lg:col-span-2"><SkeletonLoader className="h-80" /></div>
           <div className="space-y-6">
             <SkeletonLoader className="h-40" />
             <SkeletonLoader className="h-40" />
           </div>
        </div>
      </div>
    }>
      <DashboardView />
    </Suspense>
  );
}
