"use client";

import { useState, useEffect, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getDashboardSummary, getLowStockProducts } from "@/app/actions/dashboard";
import { RevenueChart } from "./RevenueChart";
import { TopProductsList } from "./TopProductsList";
import { LowStockList } from "./LowStockList";
import { RecentOrdersList } from "./RecentOrdersList";
import { SkeletonLoader } from "./SkeletonLoader";
import { 
  Calendar, 
  Package, 
  ShoppingCart, 
  Plus, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  IndianRupee, 
  ArrowUpRight,
  Layers,
  X
} from "lucide-react";
import { useRealtimeTable } from "@/lib/supabase/realtime";
import { LiveBadge } from "./LiveBadge";

export function DashboardView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [dateFrom, setDateFrom] = useState(searchParams.get("from") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("to") || "");
  const [quickFilter, setQuickFilter] = useState<string>("");

  const [kpis, setKpis] = useState<any>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [chartGranularity, setChartGranularity] = useState<"day" | "week" | "month">("day");
  const [topProducts, setTopProducts] = useState<any>(null);
  
  const [todaySnap, setTodaySnap] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any>(null);
  const [dues, setDues] = useState<number | null>(null);

  const [lowStockThresh, setLowStockThresh] = useState(1);
  const [lowStockData, setLowStockData] = useState<any>(null);
  const [lowStockLoading, setLowStockLoading] = useState(true);

  // Extracted fetch function
  const fetchDashboardData = () => {
    startTransition(() => {
      getDashboardSummary(dateFrom || undefined, dateTo || undefined, chartGranularity).then((summary) => {
        setKpis(summary.kpis);
        setChartData(summary.chartData);
        setTopProducts(summary.topProducts);
        setTodaySnap(summary.todaySnap);
        setRecentOrders(summary.recentOrders);
        setDues(summary.dues);
      });
    });
  };

  const fetchLowStockData = () => {
    setLowStockLoading(true);
    getLowStockProducts(lowStockThresh).then((data) => {
      setLowStockData(data);
      setLowStockLoading(false);
    });
  };

  // Fetch core data on mount or date change
  useEffect(() => {
    fetchDashboardData();
  }, [dateFrom, dateTo, chartGranularity]);

  // Fetch low stock separately since it depends on its own threshold
  useEffect(() => {
    fetchLowStockData();
  }, [lowStockThresh]);

  // Realtime updates
  const { isConnected: isOrdersLive } = useRealtimeTable('orders', fetchDashboardData);
  const { isConnected: isPaymentsLive } = useRealtimeTable('payments', fetchDashboardData);
  const { isConnected: isProductsLive } = useRealtimeTable('products', () => {
    fetchDashboardData();
    fetchLowStockData();
  });

  const isConnected = isOrdersLive || isPaymentsLive || isProductsLive;

  const applyDates = (from = dateFrom, to = dateTo) => {
    const params = new URLSearchParams(searchParams.toString());
    if (from) params.set("from", from); else params.delete("from");
    if (to) params.set("to", to); else params.delete("to");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const clearDates = () => {
    setDateFrom("");
    setDateTo("");
    setQuickFilter("");
    router.replace(pathname, { scroll: false });
  };

  const handleQuickSelect = (val: string) => {
    setQuickFilter(val);
    const today = new Date();
    let from = "";
    let to = "";

    if (val === "today") {
      from = today.toISOString().split('T')[0];
      to = from;
    } else if (val === "week") {
      const start = new Date(today);
      start.setDate(today.getDate() - 7);
      from = start.toISOString().split('T')[0];
      to = today.toISOString().split('T')[0];
    } else if (val === "month") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      from = start.toISOString().split('T')[0];
      to = today.toISOString().split('T')[0];
    } else if (val === "all_time") {
      from = "";
      to = "";
    }

    setDateFrom(from);
    setDateTo(to);
    applyDates(from, to);
  };

  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;
  
  const loading = isPending || !kpis || !todaySnap || dues === null;

  return (
    <div className="space-y-6 pb-12 animate-[fadeInUp_0.4s_ease-out_forwards]">
      
      {/* Header & Date Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#121215] border border-[#222227] rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#FAFAFA] tracking-tight">
                Store Performance
              </h1>
              <p className="text-xs text-[#71717A]">Realtime analytics, inventory & orders</p>
            </div>
          </div>
          <LiveBadge isConnected={isConnected} />
        </div>

        {/* Quick Range & Custom Date Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Segmented Buttons */}
          <div className="flex items-center bg-[#18181C] p-1 rounded-xl border border-[#222227]">
            {[
              { id: "today", label: "Today" },
              { id: "week", label: "7 Days" },
              { id: "month", label: "This Month" },
              { id: "all_time", label: "All" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleQuickSelect(tab.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  quickFilter === tab.id
                    ? "bg-orange-500 text-white shadow-sm"
                    : "text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#222227]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Custom Date Picker Group */}
          <div className="flex items-center gap-1.5 bg-[#18181C] border border-[#222227] rounded-xl px-2.5 py-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-[#71717A] shrink-0" />
            <input 
              type="date" 
              className="bg-transparent border-none text-xs text-[#FAFAFA] outline-none cursor-pointer w-[105px]"
              value={dateFrom}
              onChange={e => {
                setDateFrom(e.target.value);
                setQuickFilter("");
              }}
              aria-label="Start Date"
            />
            <span className="text-[#52525B]">-</span>
            <input 
              type="date" 
              className="bg-transparent border-none text-xs text-[#FAFAFA] outline-none cursor-pointer w-[105px]"
              value={dateTo}
              onChange={e => {
                setDateTo(e.target.value);
                setQuickFilter("");
              }}
              aria-label="End Date"
            />
            <button 
              onClick={() => applyDates()}
              className="bg-orange-500 hover:bg-orange-600 text-white px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ml-1 shadow-sm"
            >
              Apply
            </button>
            {(dateFrom || dateTo) && (
              <button 
                onClick={clearDates}
                className="text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#222227] p-1 rounded-md transition-colors cursor-pointer"
                title="Clear Filter"
                aria-label="Clear date filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid: 2-column mobile layout */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-5">
        {/* Total Revenue */}
        <div className="ds-card p-3.5 sm:p-5 ds-card-hover flex flex-col justify-between min-h-[110px] sm:min-h-[135px] relative overflow-hidden group">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none" />
          
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider truncate">Revenue</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <IndianRupee className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>

          <div className="mt-1.5 sm:mt-2">
            {loading ? (
              <SkeletonLoader className="h-7 sm:h-8 w-28 sm:w-36 rounded-lg" />
            ) : (
              <div className="text-xl sm:text-3xl font-bold font-mono text-emerald-400 tracking-tight drop-shadow-[0_0_12px_rgba(16,185,129,0.25)] truncate">
                {formatCurrency(kpis.totalRevenue)}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-[#71717A] mt-1 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <span className="truncate">Cumulative period earnings</span>
          </div>
        </div>
        
        {/* Total Orders */}
        <div className="ds-card p-3.5 sm:p-5 ds-card-hover flex flex-col justify-between min-h-[110px] sm:min-h-[135px] relative overflow-hidden group">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-28 h-28 bg-sky-500/5 rounded-full blur-2xl group-hover:bg-sky-500/10 transition-colors pointer-events-none" />
          
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider truncate">Orders</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
              <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>

          <div className="mt-1.5 sm:mt-2">
            {loading ? (
              <SkeletonLoader className="h-7 sm:h-8 w-20 sm:w-24 rounded-lg" />
            ) : (
              <div className="text-xl sm:text-3xl font-bold font-mono text-[#FAFAFA] tracking-tight truncate">
                {kpis.totalOrders}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-[#71717A] mt-1 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
            <span className="truncate">Completed & pending</span>
          </div>
        </div>
        
        {/* Avg Order Value */}
        <div className="ds-card p-3.5 sm:p-5 ds-card-hover flex flex-col justify-between min-h-[110px] sm:min-h-[135px] relative overflow-hidden group">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-28 h-28 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors pointer-events-none" />
          
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider truncate">Avg. Order</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
              <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>

          <div className="mt-1.5 sm:mt-2">
            {loading ? (
              <SkeletonLoader className="h-7 sm:h-8 w-24 sm:w-32 rounded-lg" />
            ) : (
              <div className="text-xl sm:text-3xl font-bold font-mono text-[#FAFAFA] tracking-tight truncate">
                {formatCurrency(Math.round(kpis.avgOrderValue))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-[#71717A] mt-1 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
            <span className="truncate">Average cart size</span>
          </div>
        </div>
        
        {/* Total Pending Orders */}
        <div className="ds-card p-3.5 sm:p-5 ds-card-hover flex flex-col justify-between min-h-[110px] sm:min-h-[135px] relative overflow-hidden group">
          <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-28 h-28 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors pointer-events-none" />
          
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider truncate">Pending</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>

          <div className="mt-1.5 sm:mt-2">
            {loading ? (
              <SkeletonLoader className="h-7 sm:h-8 w-20 sm:w-24 rounded-lg" />
            ) : (
              <div className="text-xl sm:text-3xl font-bold font-mono text-amber-400 tracking-tight truncate">
                {kpis.totalPendingOrders}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-[#71717A] mt-1 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            <span className="truncate">Awaiting pickup/settlement</span>
          </div>
        </div>
      </div>

      {/* Today's Live Pulse & Snapshot Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-orange-500/10 via-[#18181C] to-[#121215] border border-orange-500/20 rounded-2xl px-5 py-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-ping" />
          <span className="text-xs font-bold text-orange-400 tracking-wider uppercase">Today's Pulse</span>
        </div>

        {loading ? (
          <SkeletonLoader className="h-5 w-72 rounded" />
        ) : (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <span className="text-[#A1A1AA]">Today's Revenue:</span>
              <span className="font-bold font-mono text-emerald-400">{formatCurrency(todaySnap.todayRevenue)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#A1A1AA]">Orders Today:</span>
              <span className="font-bold font-mono text-[#FAFAFA]">{todaySnap.todayOrders}</span>
            </div>
            {todaySnap.lastOrderTime && (
              <div className="flex items-center gap-2">
                <span className="text-[#A1A1AA]">Last Sale:</span>
                <span className="font-medium text-orange-300">
                  {new Date(todaySnap.lastOrderTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Outstanding Dues Banner */}
      {!loading && dues !== null && dues > 0 && (
        <div className="bg-gradient-to-r from-rose-500/15 via-rose-500/10 to-[#18181C] border border-rose-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <span className="text-sm text-[#FAFAFA]">
              You have <strong className="text-rose-400 font-mono">{formatCurrency(dues)}</strong> in outstanding balance across unpaid bookings and orders.
            </span>
          </div>
          <Link 
            href="/dashboard/orders?status=PENDING" 
            className="text-xs sm:text-sm text-rose-400 hover:text-rose-300 font-semibold inline-flex items-center gap-1 shrink-0 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-xl border border-rose-500/25 transition-all cursor-pointer"
          >
            Review Unpaid Orders <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols): Chart & Recent Orders */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <RevenueChart 
            data={chartData || []} 
            loading={isPending || !chartData} 
            granularity={chartGranularity} 
            onGranularityChange={setChartGranularity} 
          />
          
          <div className="flex-1">
             <RecentOrdersList data={recentOrders || []} loading={isPending || !recentOrders} />
          </div>
        </div>
        
        {/* Right Column (1 Col): Top Products & Low Stock Alerts */}
        <div className="flex flex-col gap-6">
          <div className="flex-1">
            <TopProductsList data={topProducts || []} loading={isPending || !topProducts} />
          </div>
          <div className="flex-1">
            <LowStockList 
              data={lowStockData || []} 
              loading={lowStockLoading} 
              threshold={lowStockThresh}
              onThresholdChange={setLowStockThresh}
            />
          </div>
        </div>
        
      </div>

      {/* Bottom Quick Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {/* Total Stock in Inventory */}
        <div className="ds-card p-4 flex items-center justify-between hover:border-[#2E2E36] transition-all">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">Total Stock</span>
          </div>
          {loading ? <SkeletonLoader className="h-6 w-16 rounded" /> : (
            <span className="font-bold text-[#FAFAFA] font-mono text-base">{kpis.totalStock.toLocaleString('en-IN')} units</span>
          )}
        </div>
        
        {/* Products Sold */}
        <div className="ds-card p-4 flex items-center justify-between hover:border-[#2E2E36] transition-all">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">Units Sold</span>
          </div>
          {loading ? <SkeletonLoader className="h-6 w-16 rounded" /> : (
            <span className="font-bold text-[#FAFAFA] font-mono text-base">{kpis.productsSold.toLocaleString('en-IN')} units</span>
          )}
        </div>
        
        {/* Quick Link: POS */}
        <Link 
          href="/dashboard/pos" 
          className="bg-gradient-to-r from-orange-500/10 to-orange-600/5 hover:from-orange-500/20 hover:to-orange-600/10 border border-orange-500/30 rounded-xl p-4 flex items-center justify-center gap-2 transition-all cursor-pointer group shadow-sm"
        >
          <Plus className="w-4 h-4 text-orange-400 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold text-orange-400 tracking-wide uppercase">Open POS Terminal</span>
        </Link>
        
        {/* Quick Link: Check Pending */}
        <Link 
          href="/dashboard/orders?status=PENDING" 
          className="bg-[#18181C] hover:bg-[#222227] border border-[#222227] hover:border-[#2E2E36] rounded-xl p-4 flex items-center justify-center gap-2 transition-all cursor-pointer group shadow-sm"
        >
          <Clock className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-semibold text-[#A1A1AA] group-hover:text-[#FAFAFA] tracking-wide uppercase">Manage Pending Orders</span>
        </Link>
      </div>

    </div>
  );
}
