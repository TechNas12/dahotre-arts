export const dynamic = 'force-dynamic';

import { Suspense } from "react";
import { listBookedProducts, searchBookingsAction, getBookingsKpiSummary } from "@/app/actions/bookings";
import { parsePaginationParams } from "@/lib/paginationHelper";
import BookingsView from "./BookingsView";

async function BookingsData({ searchParams }: { searchParams: { [key: string]: string | undefined } }) {
  const { page, pageSize } = parsePaginationParams(searchParams);
  const search = searchParams.search || '';
  const status = searchParams.status || 'ALL';
  const fulfillment = searchParams.fulfillment || 'ALL';
  const dateFrom = searchParams.dateFrom;
  const dateTo = searchParams.dateTo;
  const paymentMode = searchParams.paymentMode || 'ALL';

  const [
    kpiSummary,
    productsSummary,
    bookingsResult
  ] = await Promise.all([
    getBookingsKpiSummary(),
    listBookedProducts(),
    searchBookingsAction({
      search,
      page,
      pageSize,
      status,
      fulfillment,
      dateFrom,
      dateTo,
      paymentMode
    })
  ]);

  return (
    <BookingsView 
      initialKpiSummary={kpiSummary}
      initialProductsSummary={productsSummary}
      
      initialOrders={bookingsResult.data}
      totalCount={bookingsResult.totalCount}
      
      initialPage={page}
      initialPageSize={pageSize}
      initialSearch={search}
      initialStatus={status}
      initialFulfillment={fulfillment}
      initialDateFrom={dateFrom}
      initialDateTo={dateTo}
      initialPaymentMode={paymentMode}
    />
  );
}

export default async function BookingsPage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const searchParams = await props.searchParams;

  return (
    <div className="space-y-6 animate-[fadeInUp_0.4s_ease-out_forwards]">
      <div>
        <h1 className="text-3xl font-bold text-[#F5F5F5] tracking-tight">Bookings</h1>
        <p className="text-[#A3A3A3] mt-2">Manage your active bookings and reserved products.</p>
      </div>

      <Suspense fallback={
        <div className="w-full h-[600px] bg-[#111111] border border-[#1F1F1F] rounded-xl animate-pulse"></div>
      }>
        <BookingsData searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
