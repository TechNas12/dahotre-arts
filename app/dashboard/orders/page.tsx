export const dynamic = 'force-dynamic';

import { Suspense } from "react";
import { listOrders } from "@/app/actions/orders";
import OrdersTable from "./OrdersTable";

async function OrdersData({ searchParams }: { searchParams: { [key: string]: string | undefined } }) {
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const pageSize = searchParams.pageSize ? parseInt(searchParams.pageSize, 10) : 25;
  const search = searchParams.search || '';
  const status = searchParams.status || 'ALL';
  const fulfillment = searchParams.fulfillment || 'ALL';

  const { data, totalCount } = await listOrders({
    page,
    pageSize,
    search,
    status,
    fulfillment
  });

  return (
    <OrdersTable 
      initialOrders={data} 
      totalCount={totalCount}
      initialPage={page}
      initialPageSize={pageSize}
      initialSearch={search}
      initialStatus={status}
      initialFulfillment={fulfillment}
    />
  );
}

export default async function OrdersPage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const searchParams = await props.searchParams;
  // Use a stringified key of searchParams so Suspense re-triggers when params change
  const suspenseKey = JSON.stringify(searchParams);

  return (
    <div className="space-y-6 animate-[fadeInUp_0.4s_ease-out_forwards]">
      <div>
        <h1 className="text-3xl font-bold text-[#F5F5F5] tracking-tight">Orders</h1>
        <p className="text-[#A3A3A3] mt-2">View and manage all orders placed from the POS terminal.</p>
      </div>

      <Suspense key={suspenseKey} fallback={
        <div className="w-full h-[600px] bg-[#111111] border border-[#1F1F1F] rounded-xl animate-pulse"></div>
      }>
        <OrdersData searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
