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
import { Calendar, Package, ShoppingCart, Plus, Clock, FileText } from "lucide-react";

export function DashboardView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [dateFrom, setDateFrom] = useState(searchParams.get("from") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("to") || "");

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

  // Fetch core data on mount or date change
  useEffect(() => {
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
  }, [dateFrom, dateTo, chartGranularity]);

  // Fetch low stock separately since it depends on its own threshold
  useEffect(() => {
    setLowStockLoading(true);
    getLowStockProducts(lowStockThresh).then((data) => {
      setLowStockData(data);
      setLowStockLoading(false);
    });
  }, [lowStockThresh]);

  const applyDates = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (dateFrom) params.set("from", dateFrom); else params.delete("from");
    if (dateTo) params.set("to", dateTo); else params.delete("to");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const clearDates = () => {
    setDateFrom("");
    setDateTo("");
    router.replace(pathname, { scroll: false });
  };

  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;
  
  const loading = isPending || !kpis || !todaySnap || dues === null;

  return (
    <div className="space-y-6 pb-12 animate-[fadeInUp_0.4s_ease-out_forwards]">
      
      {/* Header & Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#F5F5F5] tracking-tight flex items-center gap-2">
            Dashboard
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 bg-[#111111] border border-[#1F1F1F] rounded-lg p-1.5 shadow-sm">
          <select 
            className="bg-[#1A1A1A] border-none text-sm text-[#F5F5F5] outline-none rounded px-2 py-1 cursor-pointer hover:bg-[#2A2A2A] transition-colors focus:ring-1 focus:ring-orange-500/50"
            onChange={(e) => {
              const val = e.target.value;
              const today = new Date();
              
              if (val === "today") {
                 const todayStr = today.toISOString().split('T')[0];
                 setDateFrom(todayStr);
                 setDateTo(todayStr);
              } else if (val === "week") {
                 const start = new Date(today);
                 start.setDate(today.getDate() - today.getDay());
                 setDateFrom(start.toISOString().split('T')[0]);
                 setDateTo(today.toISOString().split('T')[0]);
              } else if (val === "month") {
                 const start = new Date(today.getFullYear(), today.getMonth(), 1);
                 setDateFrom(start.toISOString().split('T')[0]);
                 setDateTo(today.toISOString().split('T')[0]);
              } else if (val === "all_time") {
                 setDateFrom("");
                 setDateTo("");
              } else if (val === "clear") {
                 setDateFrom("");
                 setDateTo("");
              }
              e.target.value = "";
            }}
          >
            <option value="">Quick Select</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all_time">All Time</option>
            <option value="clear">Clear</option>
          </select>
          <div className="w-px h-4 bg-[#2A2A2A] mx-1 hidden sm:block"></div>
          <Calendar className="w-4 h-4 text-[#A3A3A3] ml-1 hidden sm:block" />
          <input 
            type="date" 
            className="bg-transparent border-none text-sm text-[#F5F5F5] outline-none focus:ring-0 px-1 cursor-pointer w-full sm:w-[110px]"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            onClick={e => { try { (e.target as HTMLInputElement).showPicker(); } catch(err) {} }}
          />
          <span className="text-[#F5F5F5]0 hidden sm:inline">-</span>
          <input 
            type="date" 
            className="bg-transparent border-none text-sm text-[#F5F5F5] outline-none focus:ring-0 px-1 cursor-pointer w-full sm:w-[110px]"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            onClick={e => { try { (e.target as HTMLInputElement).showPicker(); } catch(err) {} }}
          />
          <button 
            onClick={applyDates}
            className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 px-3 py-1 text-sm rounded transition-colors ml-1 font-medium border border-orange-500/20 hover:border-orange-500/40 cursor-pointer"
          >
            Apply
          </button>
          {(dateFrom || dateTo) && (
            <button 
              onClick={clearDates}
              className="text-[#A3A3A3] hover:text-[#F5F5F5] px-2 py-1 text-sm transition-colors"
              title="Clear Filter"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Revenue */}
        <div className="bg-[#111111] border border-[#1F1F1F] rounded-xl p-5 shadow-sm flex flex-col justify-center min-h-[120px] hover:border-[#2A2A2A] transition-colors cursor-pointer group">
          <h3 className="text-sm font-medium text-[#A3A3A3] mb-2 group-hover:text-[#F5F5F5] transition-colors">Total Revenue</h3>
          {loading ? <SkeletonLoader className="h-8 w-32" /> : (
            <div className="text-3xl font-bold font-mono text-green-500">{formatCurrency(kpis.totalRevenue)}</div>
          )}
        </div>
        
        {/* Total Orders */}
        <div className="bg-[#111111] border border-[#1F1F1F] rounded-xl p-5 shadow-sm flex flex-col justify-center min-h-[120px] hover:border-[#2A2A2A] transition-colors cursor-pointer group">
          <h3 className="text-sm font-medium text-[#A3A3A3] mb-2 group-hover:text-[#F5F5F5] transition-colors">Total Orders</h3>
          {loading ? <SkeletonLoader className="h-8 w-24" /> : (
            <div className="text-3xl font-bold font-mono text-[#F5F5F5]">{kpis.totalOrders}</div>
          )}
        </div>
        
        {/* Avg Order Value */}
        <div className="bg-[#111111] border border-[#1F1F1F] rounded-xl p-5 shadow-sm flex flex-col justify-center min-h-[120px] hover:border-[#2A2A2A] transition-colors cursor-pointer group">
          <h3 className="text-sm font-medium text-[#A3A3A3] mb-2 group-hover:text-[#F5F5F5] transition-colors">Avg. Order Value</h3>
          {loading ? <SkeletonLoader className="h-8 w-32" /> : (
            <div className="text-3xl font-bold font-mono text-[#F5F5F5]">{formatCurrency(Math.round(kpis.avgOrderValue))}</div>
          )}
        </div>
        
        {/* Total Pending Orders */}
        <div className="bg-[#111111] border border-[#1F1F1F] rounded-xl p-5 shadow-sm flex flex-col justify-center min-h-[120px] hover:border-[#2A2A2A] transition-colors cursor-pointer group">
          <h3 className="text-sm font-medium text-[#A3A3A3] mb-2 group-hover:text-[#F5F5F5] transition-colors">Total Pending Orders</h3>
          {loading ? <SkeletonLoader className="h-8 w-24" /> : (
            <div className="text-3xl font-bold font-mono text-amber-500">{kpis.totalPendingOrders}</div>
          )}
        </div>
      </div>

      {/* Today's Snapshot Row */}
      <div className="flex flex-wrap items-center gap-6 bg-[#111111]/50 border border-[#1F1F1F]/50 rounded-lg px-5 py-3 shadow-inner">
        <span className="text-sm font-semibold text-blue-400 tracking-wider uppercase">Today's Snapshot</span>
        <div className="h-4 w-px bg-[#2A2A2A] hidden sm:block"></div>
        {loading ? (
          <SkeletonLoader className="h-5 w-64" />
        ) : (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div><span className="text-[#A3A3A3]">Revenue:</span> <span className="font-bold text-green-400">{formatCurrency(todaySnap.todayRevenue)}</span></div>
            <div><span className="text-[#A3A3A3]">Orders:</span> <span className="font-bold text-[#F5F5F5]">{todaySnap.todayOrders}</span></div>
            {todaySnap.lastOrderTime && (
              <div><span className="text-[#A3A3A3]">Last Order:</span> <span className="text-[#F5F5F5]">{new Date(todaySnap.lastOrderTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span></div>
            )}
          </div>
        )}
      </div>

      {/* Outstanding Dues Banner */}
      {!loading && dues !== null && dues > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-red-400" />
            <span className="text-[#F5F5F5]">You have <strong className="text-red-400">{formatCurrency(dues)}</strong> in outstanding dues across all orders.</span>
          </div>
          <Link href="/dashboard/orders?status=PENDING" className="text-sm text-red-400 hover:text-red-300 font-medium">
            View unpaid orders →
          </Link>
        </div>
      )}

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Chart & Recent */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <RevenueChart data={chartData || []} loading={isPending || !chartData} granularity={chartGranularity} onGranularityChange={setChartGranularity} />
          
          <div className="flex-1">
             <RecentOrdersList data={recentOrders || []} loading={isPending || !recentOrders} />
          </div>
        </div>
        
        {/* Right Column: Lists */}
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

      {/* Bottom Action Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {/* Total Stock */}
        <div className="bg-[#111111] border border-[#1F1F1F] rounded-xl p-4 shadow-sm flex items-center justify-between hover:border-[#2A2A2A] transition-colors cursor-pointer">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-blue-500" />
            <span className="font-medium text-[#A3A3A3]">Total Stock</span>
          </div>
          {loading ? <SkeletonLoader className="h-6 w-16" /> : (
            <span className="font-bold text-[#F5F5F5] font-mono text-lg">{kpis.totalStock.toLocaleString('en-IN')}</span>
          )}
        </div>
        
        {/* Products Sold */}
        <div className="bg-[#111111] border border-[#1F1F1F] rounded-xl p-4 shadow-sm flex items-center justify-between hover:border-[#2A2A2A] transition-colors cursor-pointer">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-5 h-5 text-purple-500" />
            <span className="font-medium text-[#A3A3A3]">Products Sold</span>
          </div>
          {loading ? <SkeletonLoader className="h-6 w-16" /> : (
            <span className="font-bold text-[#F5F5F5] font-mono text-lg">{kpis.productsSold.toLocaleString('en-IN')}</span>
          )}
        </div>
        
        {/* Create New Order Link */}
        <Link href="/dashboard/pos" className="bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#1F1F1F] rounded-xl p-4 shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer group">
          <Plus className="w-5 h-5 text-orange-500 group-hover:scale-110 transition-transform" />
          <span className="font-medium text-[#A3A3A3] group-hover:text-[#F5F5F5] transition-colors">Create New Order</span>
        </Link>
        
        {/* Check Pending Orders Link */}
        <Link href="/dashboard/orders?status=PENDING" className="bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#1F1F1F] rounded-xl p-4 shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer group">
          <Clock className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" />
          <span className="font-medium text-[#A3A3A3] group-hover:text-[#F5F5F5] transition-colors">Check Pending Orders</span>
        </Link>
      </div>

    </div>
  );
}

