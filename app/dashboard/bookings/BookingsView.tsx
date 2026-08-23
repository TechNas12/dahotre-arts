"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Bookmark, List, Bell, Sparkles } from "lucide-react";
import { Order } from "@/app/actions/orders";
import {
  BookedProductSummary,
  BookingsKpiSummary,
  searchBookingsAction,
  listBookedProducts,
  getBookingsKpiSummary,
} from "@/app/actions/bookings";
import { useTableQueryState } from "@/app/dashboard/components/TablePagination";
import { useRealtimeTable } from "@/lib/supabase/realtime";

import { BookingsKpiBar } from "./BookingsKpiBar";
import { ProductSummaryTab } from "./ProductSummaryTab";
import { BookingsListTab } from "./BookingsListTab";
import { BookingsPrintView } from "./BookingsPrintView";

type BookingsViewProps = {
  initialKpiSummary?: BookingsKpiSummary;
  initialProductsSummary: BookedProductSummary[];
  initialOrders: Order[];
  totalCount: number;

  initialPage: number;
  initialPageSize: number;
  initialSearch: string;
  initialStatus: string;
  initialFulfillment: string;
  initialDateFrom?: string;
  initialDateTo?: string;
  initialPaymentMode: string;
};

export default function BookingsView({
  initialKpiSummary,
  initialProductsSummary,
  initialOrders,
  totalCount,
  initialPage,
  initialPageSize,
  initialSearch,
  initialStatus,
  initialFulfillment,
  initialDateFrom,
  initialDateTo,
  initialPaymentMode,
}: BookingsViewProps) {
  const [activeTab, setActiveTab] = useState<"SUMMARY" | "LIST">("SUMMARY");
  const [isPending, setIsPending] = useState(false);

  // --- KPI State ---
  const [kpiSummary, setKpiSummary] = useState<BookingsKpiSummary>(
    initialKpiSummary || {
      totalBookings: totalCount,
      pendingCount: initialOrders.filter((o) => o.status === "PENDING").length,
      completedCount: initialOrders.filter((o) => o.status === "COMPLETED").length,
      cancelledCount: initialOrders.filter((o) => o.status === "CANCELLED").length,
      totalValue: initialOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
      totalPaid: initialOrders.reduce(
        (sum, o) => sum + (o.payments?.reduce((pSum, p) => pSum + Number(p.amount), 0) || 0),
        0
      ),
      totalDue: 0,
    }
  );

  // --- Product Summary State ---
  const [productsSummary, setProductsSummary] =
    useState<BookedProductSummary[]>(initialProductsSummary);

  // --- Bookings List State ---
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [total, setTotal] = useState(totalCount);

  // --- Filter & Pagination State ---
  const {
    searchQuery,
    setSearchQuery,
    currentPage,
    pageSize,
    updateURL,
    handlePageChange,
    handlePageSizeChange,
  } = useTableQueryState({
    initialSearch,
    initialPage,
    initialPageSize,
  });

  const [filterStatus, setFilterStatus] = useState(initialStatus);
  const [filterPaymentMode, setFilterPaymentMode] = useState(initialPaymentMode);
  const [filterFulfillment, setFilterFulfillment] = useState(initialFulfillment);
  const [filterDateFrom, setFilterDateFrom] = useState(initialDateFrom || "");
  const [filterDateTo, setFilterDateTo] = useState(initialDateTo || "");

  const handleDateRangePreset = (preset: "today" | "yesterday" | "all") => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    if (preset === "today") {
      setFilterDateFrom(today);
      setFilterDateTo(today);
      updateURL({ dateFrom: today, dateTo: today, page: 1 });
    } else if (preset === "yesterday") {
      setFilterDateFrom(yesterday);
      setFilterDateTo(yesterday);
      updateURL({ dateFrom: yesterday, dateTo: yesterday, page: 1 });
    } else {
      setFilterDateFrom("");
      setFilterDateTo("");
      updateURL({ dateFrom: undefined, dateTo: undefined, page: 1 });
    }
  };

  // --- Realtime Flash / Toast State ---
  const [realtimeToast, setRealtimeToast] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);

  // --- Print State ---
  const [printPageSize, setPrintPageSize] = useState<"A4" | "A5">("A4");
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const handlePrint = () => {
    document.documentElement.style.setProperty("--print-page-size", printPageSize);
    window.print();
  };

  // Refetch function for searches/filters
  const performSearch = async (
    query: string,
    page: number,
    size: number,
    status: string,
    payMode: string,
    fulfill: string,
    dFrom?: string,
    dTo?: string
  ) => {
    setIsPending(true);
    const result = await searchBookingsAction({
      search: query,
      page,
      pageSize: size,
      status,
      fulfillment: fulfill,
      paymentMode: payMode,
      dateFrom: dFrom || undefined,
      dateTo: dTo || undefined,
    });
    setOrders(result.data);
    setTotal(result.totalCount);
    setIsPending(false);
  };

  // Search & Filter effect debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      import("react").then((React) => {
        React.startTransition(() => {
          performSearch(
            searchQuery,
            currentPage,
            pageSize,
            filterStatus,
            filterPaymentMode,
            filterFulfillment,
            filterDateFrom,
            filterDateTo
          );
        });
      });
    }, 200);
    return () => clearTimeout(handler);
  }, [searchQuery, currentPage, pageSize, filterStatus, filterPaymentMode, filterFulfillment, filterDateFrom, filterDateTo]);

  // Full Refresh Function (for realtime updates)
  const refreshAllData = async (eventName?: string) => {
    setIsPending(true);
    setIsFlashing(true);
    
    const [newKpi, newProducts, newBookings] = await Promise.all([
      getBookingsKpiSummary(),
      listBookedProducts(),
      searchBookingsAction({
        search: searchQuery,
        page: currentPage,
        pageSize,
        status: filterStatus,
        fulfillment: filterFulfillment,
        paymentMode: filterPaymentMode,
        dateFrom: filterDateFrom || undefined,
        dateTo: filterDateTo || undefined,
      }),
    ]);

    setKpiSummary(newKpi);
    setProductsSummary(newProducts);
    setOrders(newBookings.data);
    setTotal(newBookings.totalCount);
    setIsPending(false);

    // Toast notification for realtime update
    const timestamp = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setRealtimeToast(`Bookings & inventory updated automatically (${timestamp})`);

    setTimeout(() => setIsFlashing(false), 1500);
    setTimeout(() => setRealtimeToast(null), 5000);
  };

  // Realtime Subscriptions
  const handleRealtimeEvent = (payload: any) => {
    import("react").then((React) => {
      React.startTransition(() => {
        refreshAllData(payload?.eventType);
      });
    });
  };

  const { isConnected: isOrdersLive } = useRealtimeTable("orders", handleRealtimeEvent);
  const { isConnected: isOrderItemsLive } = useRealtimeTable("order_items", handleRealtimeEvent);
  const { isConnected: isPaymentsLive } = useRealtimeTable("payments", handleRealtimeEvent);
  const isConnected = isOrdersLive || isOrderItemsLive || isPaymentsLive;

  return (
    <div className="space-y-4">
      {/* Realtime Toast Banner */}
      {realtimeToast && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-2.5 flex items-center justify-between animate-fade-in-up text-xs font-semibold text-orange-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-400 animate-spin" />
            <span>{realtimeToast}</span>
          </div>
          <span className="text-[10px] uppercase tracking-wider bg-orange-500/20 px-2 py-0.5 rounded text-orange-300 font-bold">
            Live Sync
          </span>
        </div>
      )}

      {/* KPI Stats Bar */}
      <BookingsKpiBar kpi={kpiSummary} isPending={isPending} />

      {/* Main View Panel with Realtime Glow Pulse */}
      <div
        className={`bg-[#111111] border rounded-xl flex flex-col h-[calc(100vh-20rem)] min-h-[500px] shadow-sm overflow-hidden relative transition-all duration-300 ${
          isFlashing ? "border-orange-500/80 shadow-[0_0_20px_rgba(249,115,22,0.25)]" : "border-[#1F1F1F]"
        }`}
      >
        {/* Navigation Tabs */}
        <div className="flex border-b border-[#1F1F1F] bg-[#0A0A0A] shrink-0">
          <button
            onClick={() => setActiveTab("SUMMARY")}
            className={`flex-1 py-3.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
              activeTab === "SUMMARY"
                ? "text-orange-500 border-b-2 border-orange-500 bg-[#1A1A1A]/60"
                : "text-[#737373] hover:text-[#A3A3A3] hover:bg-[#1A1A1A]/30"
            }`}
          >
            <Bookmark className="w-4 h-4" />
            Product Summary
          </button>
          <button
            onClick={() => setActiveTab("LIST")}
            className={`flex-1 py-3.5 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
              activeTab === "LIST"
                ? "text-orange-500 border-b-2 border-orange-500 bg-[#1A1A1A]/60"
                : "text-[#737373] hover:text-[#A3A3A3] hover:bg-[#1A1A1A]/30"
            }`}
          >
            <List className="w-4 h-4" />
            Bookings List ({total})
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "SUMMARY" ? (
            <ProductSummaryTab
              productsSummary={productsSummary}
              isConnected={isConnected}
              isPending={isPending}
            />
          ) : (
            <BookingsListTab
              orders={orders}
              total={total}
              currentPage={currentPage}
              pageSize={pageSize}
              searchQuery={searchQuery}
              filterStatus={filterStatus}
              filterPaymentMode={filterPaymentMode}
              filterFulfillment={filterFulfillment}
              filterDateFrom={filterDateFrom}
              filterDateTo={filterDateTo}
              printPageSize={printPageSize}
              isConnected={isConnected}
              isPending={isPending}
              onSearchChange={setSearchQuery}
              onStatusChange={(s) => {
                setFilterStatus(s);
                updateURL({ status: s === "ALL" ? undefined : s, page: 1 });
              }}
              onPaymentModeChange={(p) => {
                setFilterPaymentMode(p);
                updateURL({ paymentMode: p === "ALL" ? undefined : p, page: 1 });
              }}
              onFulfillmentChange={(f) => {
                setFilterFulfillment(f);
                updateURL({ fulfillment: f === "ALL" ? undefined : f, page: 1 });
              }}
              onDateFromChange={(d) => {
                setFilterDateFrom(d);
                updateURL({ dateFrom: d || undefined, page: 1 });
              }}
              onDateToChange={(d) => {
                setFilterDateTo(d);
                updateURL({ dateTo: d || undefined, page: 1 });
              }}
              onDateRangePreset={handleDateRangePreset}
              onPrintPageSizeChange={setPrintPageSize}
              onPrint={handlePrint}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
        </div>
      </div>

      {/* Print View Portal */}
      {isMounted &&
        createPortal(
          <BookingsPrintView
            orders={orders}
            searchQuery={searchQuery}
            filterStatus={filterStatus}
            filterPaymentMode={filterPaymentMode}
            filterFulfillment={filterFulfillment}
            filterDateFrom={filterDateFrom}
            filterDateTo={filterDateTo}
          />,
          document.body
        )}
    </div>
  );
}
