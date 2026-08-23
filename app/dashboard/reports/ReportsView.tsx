"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { 
  Banknote, 
  TrendingUp, 
  Package, 
  Users, 
  PieChart as PieChartIcon, 
  Calendar,
  Wallet,
  CreditCard,
  ShoppingCart,
  Percent,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  FileDown,
  Loader2,
  ClipboardCheck,
  Receipt,
  DollarSign,
  Clock,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Layers,
  Search,
  Printer,
  X,
  Award,
  Sparkles
} from "lucide-react";
import { createPortal } from "react-dom";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar,
  PieChart, Pie, Cell,
  ComposedChart, Line,
  LineChart, ReferenceLine
} from 'recharts';

import { 
  getReportCategories,
  getRevenuePaymentData,
  getSalesAnalyticsData,
  getInventoryData,
  getCustomerInsightsData,
  getProfitExpensesData,
  getEodReportData,
  EodReportData
} from "@/app/actions/reports";
import { 
  generateRevenuePdf,
  generateSalesPdf,
  generateInventoryPdf,
  generateCustomersPdf,
  generateProfitPdf,
  generateEodReportPdf
} from "@/lib/generateReportPdf";
import { EodPrintView } from "./EodPrintView";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#06b6d4'];

const TABS = [
  { id: 'revenue', label: 'Revenue & Payments', icon: Banknote },
  { id: 'sales', label: 'Sales Analytics', icon: TrendingUp },
  { id: 'inventory', label: 'Inventory Intelligence', icon: Package },
  { id: 'customers', label: 'Customer Insights', icon: Users },
  { id: 'profit', label: 'Profit & Expenses', icon: PieChartIcon },
  { id: 'eod', label: 'EOD Settlement', icon: ClipboardCheck },
];

export function ReportsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const [dateFrom, setDateFrom] = useState(searchParams.get("from") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("to") || "");

  // Category Filter State
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "ALL");

  const [activeTab, setActiveTab] = useState('revenue');
  
  // Revenue Chart Controls
  const [revChartType, setRevChartType] = useState<"area" | "bar" | "line">("area");
  const [showCash, setShowCash] = useState(true);
  const [showUpi, setShowUpi] = useState(true);
  const [showAvg, setShowAvg] = useState(false);
  
  const [isMounted, setIsMounted] = useState(false);

  // Data States
  const [revData, setRevData] = useState<any>(null);
  const [salesData, setSalesData] = useState<any>(null);
  const [invData, setInvData] = useState<any>(null);
  const [custData, setCustData] = useState<any>(null);
  const [profitData, setProfitData] = useState<any>(null);
  const [eodData, setEodData] = useState<EodReportData | null>(null);
  const [eodDate, setEodDate] = useState<string>(
    new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
  );
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<number, boolean>>({});
  const [eodSearchQuery, setEodSearchQuery] = useState("");

  // Additional local filter/view states
  const [txSearchQuery, setTxSearchQuery] = useState("");
  const [deadStockSearchQuery, setDeadStockSearchQuery] = useState("");
  const [salesMetricView, setSalesMetricView] = useState<"volume" | "revenue">("volume");
  const [salesCategoryMetric, setSalesCategoryMetric] = useState<"count" | "revenue" | "both">("both");
  const [topProductsSort, setTopProductsSort] = useState<"qty" | "revenue">("qty");

  useEffect(() => {
    setIsMounted(true);
    getReportCategories().then(setCategories);
  }, []);

  // Fetch logic
  useEffect(() => {
    startTransition(() => {
      // Clear data for the active tab so we see a loading state if filters change
      // Only fetch the active tab's data
      fetchTabData(activeTab, dateFrom, dateTo, eodDate, selectedCategory);
    });
  }, [dateFrom, dateTo, activeTab, eodDate, selectedCategory]);

  const fetchTabData = async (tab: string, from?: string, to?: string, targetEodDate?: string, catId?: string) => {
    const category = catId !== undefined ? catId : selectedCategory;
    if (tab === 'revenue') {
      setRevData(null);
      getRevenuePaymentData(from, to, category).then(setRevData);
    } else if (tab === 'sales') {
      setSalesData(null);
      getSalesAnalyticsData(from, to, category).then(setSalesData);
    } else if (tab === 'inventory') {
      setInvData(null);
      getInventoryData(category).then(setInvData);
    } else if (tab === 'customers') {
      setCustData(null);
      getCustomerInsightsData(from, to, category).then(setCustData);
    } else if (tab === 'profit') {
      setProfitData(null);
      getProfitExpensesData(from, to, category).then(setProfitData);
    } else if (tab === 'eod') {
      setEodData(null);
      getEodReportData(targetEodDate || eodDate, category).then(setEodData);
    }
  };

  const applyDates = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (dateFrom) params.set("from", dateFrom); else params.delete("from");
    if (dateTo) params.set("to", dateTo); else params.delete("to");
    if (selectedCategory && selectedCategory !== "ALL") params.set("category", selectedCategory); else params.delete("category");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const clearDates = () => {
    setDateFrom("");
    setDateTo("");
    setSelectedCategory("ALL");
    router.replace(pathname, { scroll: false });
  };

  const selectedCategoryName =
    selectedCategory === "ALL"
      ? "All Categories"
      : categories.find((c) => c.id.toString() === selectedCategory)?.name || "All Categories";

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      if (activeTab === 'revenue' && revData) {
        await generateRevenuePdf(revData, dateFrom, dateTo, selectedCategoryName);
      } else if (activeTab === 'sales' && salesData) {
        await generateSalesPdf(salesData, dateFrom, dateTo, selectedCategoryName);
      } else if (activeTab === 'inventory' && invData) {
        await generateInventoryPdf(invData, selectedCategoryName);
      } else if (activeTab === 'customers' && custData) {
        await generateCustomersPdf(custData, dateFrom, dateTo, selectedCategoryName);
      } else if (activeTab === 'profit' && profitData) {
        await generateProfitPdf(profitData, dateFrom, dateTo, selectedCategoryName);
      } else if (activeTab === 'eod' && eodData) {
        await generateEodReportPdf(eodData, eodDate, selectedCategoryName);
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const formatCurrency = (val: number) => `₹${Math.round(val || 0).toLocaleString('en-IN')}`;

  // --- Render Helpers ---

  const renderKPI = (
    title: string,
    value: string | number,
    icon: any,
    colorClass: string,
    sub?: string,
    trendBadge?: { text: string; type?: "positive" | "negative" | "neutral" }
  ) => {
    const Icon = icon;
    return (
      <div className="bg-[#121215]/90 border border-[#222227] hover:border-[#383842] rounded-2xl p-4 sm:p-5 shadow-lg shadow-black/20 flex flex-col justify-between min-h-[115px] sm:min-h-[130px] relative overflow-hidden group transition-all duration-200">
        <div className={`absolute -right-6 -top-6 w-28 h-28 rounded-full opacity-10 blur-2xl group-hover:opacity-25 transition-opacity pointer-events-none ${colorClass}`} />
        
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`p-2 rounded-xl bg-[#18181C] border border-[#26262E] ${colorClass} shrink-0 shadow-inner`}>
              <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <h3 className="text-xs sm:text-sm font-semibold text-[#A1A1AA] truncate tracking-wide">{title}</h3>
          </div>
          {trendBadge && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
              trendBadge.type === "positive" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
              trendBadge.type === "negative" ? "bg-red-500/10 text-red-400 border-red-500/20" :
              "bg-[#1E1E24] text-[#A1A1AA] border-[#2A2A32]"
            }`}>
              {trendBadge.text}
            </span>
          )}
        </div>

        <div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#FAFAFA] tracking-tight truncate font-mono">
            {value}
          </div>
          {sub && (
            <div className="text-[11px] sm:text-xs text-[#71717A] mt-1 line-clamp-1 font-medium">
              {sub}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 1. REVENUE & PAYMENTS TAB
  const renderRevenueTab = () => {
    if (!revData) return <Loading />;
    
    const avgRevenue = revData.chartData.length > 0 
      ? revData.chartData.reduce((sum: number, item: any) => sum + item.total, 0) / revData.chartData.length 
      : 0;

    const totalCollected = (revData.cashRev || 0) + (revData.upiRev || 0);
    const cashPct = totalCollected > 0 ? Math.round((revData.cashRev / totalCollected) * 100) : 0;
    const onlinePct = totalCollected > 0 ? 100 - cashPct : 0;

    const filteredTx = (revData.transactions || []).filter((t: any) => {
      if (!txSearchQuery) return true;
      const q = txSearchQuery.toLowerCase();
      return (
        t.orderNo?.toLowerCase().includes(q) ||
        t.customer?.toLowerCase().includes(q) ||
        t.mode?.toLowerCase().includes(q)
      );
    });

    return (
      <div className="space-y-6 animate-[fadeInUp_0.3s_ease-out_forwards]">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {renderKPI(
            "Total Revenue",
            formatCurrency(revData.totalRevenue),
            Banknote,
            "text-emerald-400",
            "From all non-cancelled orders",
            { text: "Realized", type: "positive" }
          )}
          {renderKPI(
            "Cash Received",
            formatCurrency(revData.cashRev),
            Wallet,
            "text-amber-400",
            `${cashPct}% of total collections`,
            { text: `${cashPct}%`, type: "neutral" }
          )}
          {renderKPI(
            "Online / UPI",
            formatCurrency(revData.upiRev),
            CreditCard,
            "text-blue-400",
            `${onlinePct}% of total collections`,
            { text: `${onlinePct}%`, type: "neutral" }
          )}
          {renderKPI(
            "Outstanding Dues",
            formatCurrency(revData.outstandingDues),
            AlertTriangle,
            "text-red-400",
            "Pending balance from orders",
            revData.outstandingDues > 0 ? { text: "Action Needed", type: "negative" } : { text: "All Clear", type: "positive" }
          )}
        </div>

        {/* Charts & Split Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Revenue Timeline */}
          <div className="lg:col-span-2 bg-[#121215]/90 border border-[#222227] rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#FAFAFA] tracking-tight flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                  Revenue Over Time
                </h3>
                <p className="text-xs text-[#71717A] mt-0.5">
                  Daily collections breakdown by payment mode
                </p>
              </div>

              {/* Chart Controls */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="flex items-center bg-[#18181C] border border-[#26262E] rounded-xl p-1">
                  <button
                    onClick={() => setRevChartType("area")}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                      revChartType === "area" ? "bg-orange-500 text-black shadow font-bold" : "text-[#A1A1AA] hover:text-[#FAFAFA]"
                    }`}
                  >
                    Area
                  </button>
                  <button
                    onClick={() => setRevChartType("bar")}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                      revChartType === "bar" ? "bg-orange-500 text-black shadow font-bold" : "text-[#A1A1AA] hover:text-[#FAFAFA]"
                    }`}
                  >
                    Bar
                  </button>
                  <button
                    onClick={() => setRevChartType("line")}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                      revChartType === "line" ? "bg-orange-500 text-black shadow font-bold" : "text-[#A1A1AA] hover:text-[#FAFAFA]"
                    }`}
                  >
                    Line
                  </button>
                </div>

                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-[#FAFAFA] bg-[#18181C] px-2.5 py-1.5 rounded-xl border border-[#26262E] hover:border-[#383842] transition-colors">
                  <input
                    type="checkbox"
                    checked={showCash}
                    onChange={(e) => setShowCash(e.target.checked)}
                    className="accent-amber-500 rounded"
                  />
                  <span className="text-amber-400 font-semibold">Cash</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-[#FAFAFA] bg-[#18181C] px-2.5 py-1.5 rounded-xl border border-[#26262E] hover:border-[#383842] transition-colors">
                  <input
                    type="checkbox"
                    checked={showUpi}
                    onChange={(e) => setShowUpi(e.target.checked)}
                    className="accent-blue-500 rounded"
                  />
                  <span className="text-blue-400 font-semibold">UPI / Online</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-[#FAFAFA] bg-[#18181C] px-2.5 py-1.5 rounded-xl border border-[#26262E] hover:border-[#383842] transition-colors">
                  <input
                    type="checkbox"
                    checked={showAvg}
                    onChange={(e) => setShowAvg(e.target.checked)}
                    className="accent-orange-500 rounded"
                  />
                  <span>Avg</span>
                </label>
              </div>
            </div>

            <div className="h-80 w-full">
              {revData.chartData.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-[#737373] text-sm gap-2">
                  <Receipt className="w-8 h-8 opacity-40 text-gray-500" />
                  <span>No payment collections recorded in this period.</span>
                </div>
              ) : revData.chartData.length === 1 || revChartType === 'bar' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revData.chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F1F24" vertical={false} />
                    <XAxis dataKey="date" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}`} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#0E0E11',
                        borderColor: '#26262E',
                        borderRadius: '0.75rem',
                        color: '#FAFAFA',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                        padding: '8px 12px',
                        fontSize: '12px'
                      }}
                      formatter={(val: any) => formatCurrency(Number(val))}
                    />
                    {showAvg && <ReferenceLine y={avgRevenue} stroke="#f59e0b" strokeDasharray="5 5" label={{ position: 'top', value: `Avg: ${formatCurrency(Math.round(avgRevenue))}`, fill: '#f59e0b', fontSize: 11 }} />}
                    {showCash && <Bar dataKey="cash" stackId="1" fill="#f59e0b" name="Cash" maxBarSize={45} radius={[0, 0, 0, 0]} />}
                    {showUpi && <Bar dataKey="upi" stackId="1" fill="#3b82f6" name="UPI / Online" maxBarSize={45} radius={[4, 4, 0, 0]} />}
                  </BarChart>
                </ResponsiveContainer>
              ) : revChartType === 'line' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revData.chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F1F24" vertical={false} />
                    <XAxis dataKey="date" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}`} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#0E0E11',
                        borderColor: '#26262E',
                        borderRadius: '0.75rem',
                        color: '#FAFAFA',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                        padding: '8px 12px',
                        fontSize: '12px'
                      }}
                      formatter={(val: any) => formatCurrency(Number(val))}
                    />
                    {showAvg && <ReferenceLine y={avgRevenue} stroke="#f59e0b" strokeDasharray="5 5" label={{ position: 'top', value: `Avg: ${formatCurrency(Math.round(avgRevenue))}`, fill: '#f59e0b', fontSize: 11 }} />}
                    {showCash && <Line type="monotone" dataKey="cash" stroke="#f59e0b" name="Cash" strokeWidth={2.5} dot={{ r: 3 }} />}
                    {showUpi && <Line type="monotone" dataKey="upi" stroke="#3b82f6" name="UPI / Online" strokeWidth={2.5} dot={{ r: 3 }} />}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revData.chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCashRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.7}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05}/>
                      </linearGradient>
                      <linearGradient id="colorUpiRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.7}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F1F24" vertical={false} />
                    <XAxis dataKey="date" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}`} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#0E0E11',
                        borderColor: '#26262E',
                        borderRadius: '0.75rem',
                        color: '#FAFAFA',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                        padding: '8px 12px',
                        fontSize: '12px'
                      }}
                      formatter={(val: any) => formatCurrency(Number(val))}
                    />
                    {showAvg && <ReferenceLine y={avgRevenue} stroke="#f59e0b" strokeDasharray="5 5" label={{ position: 'top', value: `Avg: ${formatCurrency(Math.round(avgRevenue))}`, fill: '#f59e0b', fontSize: 11 }} />}
                    {showCash && <Area type="monotone" dataKey="cash" stackId="1" stroke="#f59e0b" fill="url(#colorCashRev)" name="Cash" strokeWidth={2} />}
                    {showUpi && <Area type="monotone" dataKey="upi" stackId="1" stroke="#3b82f6" fill="url(#colorUpiRev)" name="UPI / Online" strokeWidth={2} />}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Right Column: Donut Breakdown Cards */}
          <div className="space-y-6 flex flex-col justify-between">
            {/* Payment Mode Donut */}
            <div className="bg-[#121215]/90 border border-[#222227] rounded-2xl p-5 shadow-xl flex flex-col flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-[#FAFAFA] flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-amber-400" />
                  Payment Mode Distribution
                </h3>
                <span className="text-xs font-mono text-emerald-400 font-bold">{formatCurrency(totalCollected)}</span>
              </div>

              {revData.paymentModeSplit?.some((e: any) => e.value > 0) ? (
                <>
                  <div className="h-32 my-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={revData.paymentModeSplit.filter((e: any) => e.value > 0)}
                          innerRadius="65%"
                          outerRadius="90%"
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {revData.paymentModeSplit.filter((e: any) => e.value > 0).map((e: any, i: number) => (
                            <Cell key={`cell-mode-${i}`} fill={e.name === 'CASH' ? '#f59e0b' : '#3b82f6'} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: '#0E0E11',
                            borderColor: '#26262E',
                            borderRadius: '0.75rem',
                            color: '#FAFAFA',
                            fontSize: '12px'
                          }}
                          formatter={(val: any) => formatCurrency(Number(val))}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2 mt-auto pt-2 border-t border-[#1F1F24]">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        <span className="text-[#A1A1AA] font-medium">Cash</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-[#71717A]">({cashPct}%)</span>
                        <span className="text-[#FAFAFA] font-bold">{formatCurrency(revData.cashRev)}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                        <span className="text-[#A1A1AA] font-medium">Online / UPI</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-[#71717A]">({onlinePct}%)</span>
                        <span className="text-[#FAFAFA] font-bold">{formatCurrency(revData.upiRev)}</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-[#737373] text-xs py-8">
                  No payment collections logged
                </div>
              )}
            </div>

            {/* Payment Type Donut */}
            <div className="bg-[#121215]/90 border border-[#222227] rounded-2xl p-5 shadow-xl flex flex-col flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-[#FAFAFA] flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-400" />
                  Settlement Breakdown
                </h3>
              </div>

              {revData.orderTypeSplit?.some((e: any) => e.value > 0) ? (
                <>
                  <div className="h-32 my-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={revData.orderTypeSplit.filter((e: any) => e.value > 0)}
                          innerRadius="65%"
                          outerRadius="90%"
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {revData.orderTypeSplit.filter((e: any) => e.value > 0).map((e: any, i: number) => (
                            <Cell key={`cell-type-${i}`} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: '#0E0E11',
                            borderColor: '#26262E',
                            borderRadius: '0.75rem',
                            color: '#FAFAFA',
                            fontSize: '12px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-1.5 mt-auto pt-2 border-t border-[#1F1F24]">
                    {revData.orderTypeSplit.filter((e: any) => e.value > 0).map((e: any, i: number) => (
                      <div key={e.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-[#A1A1AA] font-medium">{e.name}</span>
                        </div>
                        <span className="text-[#FAFAFA] font-bold font-mono">{e.value} txns</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-[#737373] text-xs py-8">
                  No payment transactions logged
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Transactions Table Log */}
        <div className="bg-[#121215]/90 border border-[#222227] rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 sm:p-5 border-b border-[#222227] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#18181C]/50">
            <div>
              <h3 className="text-base font-bold text-[#FAFAFA] flex items-center gap-2">
                <Receipt className="w-4 h-4 text-orange-400" />
                Payment Transactions Ledger
              </h3>
              <p className="text-xs text-[#71717A] mt-0.5">
                Showing {filteredTx.length} transaction records in this period
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
              <input
                type="text"
                placeholder="Filter transactions..."
                value={txSearchQuery}
                onChange={(e) => setTxSearchQuery(e.target.value)}
                className="w-full bg-[#111115] border border-[#26262E] focus:border-orange-500 text-xs text-[#FAFAFA] pl-8 pr-3 py-1.5 rounded-xl outline-none transition-all placeholder:text-[#52525B]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#141418] border-b border-[#222227] text-[11px] font-bold text-[#71717A] uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Order No</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Payment Mode</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F1F24] text-xs">
                {filteredTx.slice(0, 25).map((t: any, i: number) => (
                  <tr key={i} className="hover:bg-[#18181D]/60 transition-colors">
                    <td className="py-3 px-4 text-[#A1A1AA] whitespace-nowrap font-medium">{t.date}</td>
                    <td className="py-3 px-4 text-[#FAFAFA] font-mono font-semibold">{t.orderNo}</td>
                    <td className="py-3 px-4 text-[#D4D4D8] font-medium">{t.customer}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        t.mode === 'CASH'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}>
                        {t.mode}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">{formatCurrency(t.amount)}</td>
                  </tr>
                ))}
                {filteredTx.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#71717A] text-xs">
                      No transaction records match the current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {filteredTx.length > 25 && (
            <div className="p-3 text-center text-xs text-[#71717A] border-t border-[#1F1F24] bg-[#141418]">
              Showing first 25 of {filteredTx.length} transactions.
            </div>
          )}
        </div>
      </div>
    );
  };

  // 2. SALES ANALYTICS TAB
  const renderSalesTab = () => {
    if (!salesData) return <Loading />;
    
    const cancellationRate = salesData.totalOrders > 0
      ? ((salesData.cancelledOrders / (salesData.totalOrders + salesData.cancelledOrders)) * 100).toFixed(1)
      : "0.0";

    const topProductMaxRevenue = salesData.topProducts?.[0]?.revenue || 1;

    return (
      <div className="space-y-6 animate-[fadeInUp_0.3s_ease-out_forwards]">
        {/* Top KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {renderKPI(
            "Total Orders",
            salesData.totalOrders,
            ShoppingCart,
            "text-blue-400",
            "Successful non-cancelled orders",
            { text: "Orders", type: "neutral" }
          )}
          {renderKPI(
            "Avg Order Value (AOV)",
            formatCurrency(Math.round(salesData.avgOrderValue)),
            Percent,
            "text-emerald-400",
            "Revenue per order placed",
            { text: "Avg Ticket", type: "positive" }
          )}
          {renderKPI(
            "Total Units Sold",
            salesData.itemsSold,
            Package,
            "text-purple-400",
            "Units shipped & booked",
            { text: "Units", type: "neutral" }
          )}
          {renderKPI(
            "Cancelled Orders",
            salesData.cancelledOrders,
            XCircle,
            "text-red-400",
            `${cancellationRate}% cancellation rate`,
            salesData.cancelledOrders > 0 ? { text: `${cancellationRate}%`, type: "negative" } : { text: "0%", type: "positive" }
          )}
        </div>

        {/* Sales Visualizations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Activity Timeline & Top Products */}
          <div className="lg:col-span-2 space-y-6">
            {/* Orders Frequency Trend */}
            <div className="bg-[#121215]/90 border border-[#222227] rounded-2xl p-5 sm:p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#FAFAFA] tracking-tight flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-400" />
                    Orders Activity Timeline
                  </h3>
                  <p className="text-xs text-[#71717A] mt-0.5">
                    Daily order creation velocity
                  </p>
                </div>
              </div>

              <div className="h-64 w-full">
                {salesData.ordersOverTime.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-[#71717A] text-xs">
                    No order activity in this period.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesData.ordersOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F1F24" vertical={false} />
                      <XAxis dataKey="date" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: '#0E0E11',
                          borderColor: '#26262E',
                          borderRadius: '0.75rem',
                          color: '#FAFAFA',
                          fontSize: '12px'
                        }}
                        cursor={{ fill: '#1A1A20' }}
                      />
                      <Bar dataKey="count" name="Orders Placed" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={45} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Top 10 Products Leaderboard */}
            <div className="bg-[#121215]/90 border border-[#222227] rounded-2xl p-5 sm:p-6 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#FAFAFA] tracking-tight flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-400" />
                    Top 10 Selling Products
                  </h3>
                  <p className="text-xs text-[#71717A] mt-0.5">
                    {topProductsSort === "qty" ? "Ranked by physical unit sales count" : "Ranked by total revenue generated"}
                  </p>
                </div>

                <div className="flex items-center bg-[#18181C] border border-[#26262E] rounded-xl p-1">
                  <button
                    onClick={() => setTopProductsSort("qty")}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                      topProductsSort === "qty" ? "bg-orange-500 text-black shadow font-bold" : "text-[#A1A1AA] hover:text-[#FAFAFA]"
                    }`}
                  >
                    By Units Sold
                  </button>
                  <button
                    onClick={() => setTopProductsSort("revenue")}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                      topProductsSort === "revenue" ? "bg-orange-500 text-black shadow font-bold" : "text-[#A1A1AA] hover:text-[#FAFAFA]"
                    }`}
                  >
                    By Revenue
                  </button>
                </div>
              </div>

              {(() => {
                const productList = (topProductsSort === "qty" ? (salesData.topProductsByQty || salesData.topProducts) : salesData.topProducts) || [];
                const maxMetric = topProductsSort === "qty" ? (productList[0]?.qty || 1) : (salesData.topProducts?.[0]?.revenue || 1);

                return (
                  <div className="space-y-3.5">
                    {productList.map((p: any, i: number) => {
                      const sharePct = ((topProductsSort === "qty" ? p.qty : p.revenue) / maxMetric) * 100;
                      return (
                        <div key={i} className="p-3 bg-[#18181D]/60 hover:bg-[#1C1C22] border border-[#26262E] rounded-xl transition-all">
                          <div className="flex items-center justify-between gap-3 mb-1.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                                i === 0 ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                                i === 1 ? "bg-slate-400/20 text-slate-300 border border-slate-400/30" :
                                i === 2 ? "bg-amber-700/20 text-amber-500 border border-amber-700/30" :
                                "bg-[#22222A] text-[#A1A1AA]"
                              }`}>
                                {i + 1}
                              </span>
                              <span className="text-sm font-semibold text-[#FAFAFA] truncate">{p.name}</span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {topProductsSort === "qty" ? (
                                <>
                                  <span className="text-xs sm:text-sm font-extrabold text-indigo-400 font-mono px-2.5 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                                    {p.qty} units sold
                                  </span>
                                  <span className="text-xs text-[#71717A] font-mono hidden sm:inline">
                                    {formatCurrency(p.revenue)}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="text-xs text-[#A1A1AA] font-mono px-2 py-0.5 rounded-full bg-[#121215] border border-[#222227]">
                                    {p.qty} units
                                  </span>
                                  <span className="text-sm font-extrabold text-emerald-400 font-mono">
                                    {formatCurrency(p.revenue)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="h-1.5 w-full bg-[#0D0D10] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                topProductsSort === "qty"
                                  ? "bg-gradient-to-r from-indigo-500 to-blue-400"
                                  : "bg-gradient-to-r from-orange-500 to-amber-400"
                              }`}
                              style={{ width: `${sharePct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {productList.length === 0 && (
                      <div className="text-[#71717A] text-xs py-8 text-center">
                        No product sales logged in this period.
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Right Col: Category Breakdown with Sales Count & Revenue Pie Charts */}
          <div className="space-y-6 flex flex-col justify-between">
            {/* View Selector for Category Breakdown */}
            <div className="flex items-center justify-between bg-[#121215]/90 border border-[#222227] p-2 rounded-2xl shadow-md">
              <span className="text-xs font-semibold text-[#A1A1AA] pl-2">Category Charts:</span>
              <div className="flex items-center bg-[#18181C] border border-[#26262E] rounded-xl p-1">
                <button
                  onClick={() => setSalesCategoryMetric("both")}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                    salesCategoryMetric === "both" ? "bg-orange-500 text-black shadow font-bold" : "text-[#A1A1AA] hover:text-[#FAFAFA]"
                  }`}
                >
                  Both
                </button>
                <button
                  onClick={() => setSalesCategoryMetric("count")}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                    salesCategoryMetric === "count" ? "bg-orange-500 text-black shadow font-bold" : "text-[#A1A1AA] hover:text-[#FAFAFA]"
                  }`}
                >
                  Sales Count
                </button>
                <button
                  onClick={() => setSalesCategoryMetric("revenue")}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                    salesCategoryMetric === "revenue" ? "bg-orange-500 text-black shadow font-bold" : "text-[#A1A1AA] hover:text-[#FAFAFA]"
                  }`}
                >
                  Revenue
                </button>
              </div>
            </div>

            {/* 1. Category Sales Count Pie Chart (Units Sold) */}
            {(salesCategoryMetric === "both" || salesCategoryMetric === "count") && (
              <div className="bg-[#121215]/90 border border-[#222227] rounded-2xl p-5 shadow-xl flex flex-col flex-1">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-[#FAFAFA] tracking-tight flex items-center gap-2">
                      <Package className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
                      Sales Count by Category
                    </h3>
                    <p className="text-[11px] text-[#71717A]">
                      Units sold across categories
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                    {salesData.itemsSold} units
                  </span>
                </div>

                {salesData.categoryCountSplit?.length > 0 ? (
                  <>
                    <div className="h-44 my-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={salesData.categoryCountSplit}
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {salesData.categoryCountSplit.map((e: any, i: number) => (
                              <Cell key={`cell-cat-count-${i}`} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: '#0E0E11',
                              borderColor: '#26262E',
                              borderRadius: '0.75rem',
                              color: '#FAFAFA',
                              fontSize: '12px'
                            }}
                            formatter={(val: any) => `${val} units sold`}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-2 mt-2 pt-2 border-t border-[#1F1F24]">
                      {salesData.categoryCountSplit.map((e: any, i: number) => {
                        const pct = salesData.itemsSold > 0 ? Math.round((e.value / salesData.itemsSold) * 100) : 0;
                        return (
                          <div key={e.name} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                              <span className="font-semibold text-[#FAFAFA] truncate">{e.name}</span>
                            </div>
                            <div className="flex items-center gap-2 font-mono shrink-0">
                              <span className="text-[#71717A]">({pct}%)</span>
                              <span className="font-bold text-indigo-400">{e.value} units</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-[#71717A] text-xs py-8">
                    No category units sold logged.
                  </div>
                )}
              </div>
            )}

            {/* 2. Category Revenue Share Pie Chart (₹) */}
            {(salesCategoryMetric === "both" || salesCategoryMetric === "revenue") && (
              <div className="bg-[#121215]/90 border border-[#222227] rounded-2xl p-5 shadow-xl flex flex-col flex-1">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-[#FAFAFA] tracking-tight flex items-center gap-2">
                      <PieChartIcon className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                      Category Revenue Share
                    </h3>
                    <p className="text-[11px] text-[#71717A]">
                      Financial sales contribution per category
                    </p>
                  </div>
                </div>

                {salesData.categorySplit?.length > 0 ? (
                  <>
                    <div className="h-44 my-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={salesData.categorySplit}
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {salesData.categorySplit.map((e: any, i: number) => (
                              <Cell key={`cell-cat-rev-${i}`} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: '#0E0E11',
                              borderColor: '#26262E',
                              borderRadius: '0.75rem',
                              color: '#FAFAFA',
                              fontSize: '12px'
                            }}
                            formatter={(val: any) => formatCurrency(Number(val))}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-2 mt-2 pt-2 border-t border-[#1F1F24]">
                      {salesData.categorySplit.map((e: any, i: number) => (
                        <div key={e.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="font-semibold text-[#FAFAFA] truncate">{e.name}</span>
                          </div>
                          <span className="font-mono font-bold text-emerald-400 shrink-0">{formatCurrency(e.value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-[#71717A] text-xs py-8">
                    No category sales revenue available.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 3. INVENTORY INTELLIGENCE TAB
  const renderInventoryTab = () => {
    if (!invData) return <Loading />;

    const filteredDeadStock = (invData.deadStock || []).filter((p: any) => {
      if (!deadStockSearchQuery) return true;
      const q = deadStockSearchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
    });

    return (
      <div className="space-y-6 animate-[fadeInUp_0.3s_ease-out_forwards]">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {renderKPI(
            "Active SKUs",
            invData.totalSkus,
            Package,
            "text-blue-400",
            "Total catalog items",
            { text: "Catalog", type: "neutral" }
          )}
          {renderKPI(
            "Total Stock Units",
            invData.totalStockQty,
            Layers,
            "text-purple-400",
            "Physical items in stock",
            { text: "Units", type: "neutral" }
          )}
          {renderKPI(
            "Stock Valuation (Cost)",
            formatCurrency(invData.stockValue),
            Banknote,
            "text-emerald-400",
            "Total cost valuation of inventory",
            { text: "Asset Value", type: "positive" }
          )}
          {renderKPI(
            "Out of Stock",
            invData.outOfStock,
            AlertTriangle,
            "text-red-400",
            invData.outOfStock > 0 ? `${invData.outOfStock} items need reorder` : "All catalog items in stock",
            invData.outOfStock > 0 ? { text: "Restock", type: "negative" } : { text: "Optimal", type: "positive" }
          )}
        </div>

        {/* Stock Distribution & Fast Movers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Distribution */}
          <div className="bg-[#121215]/90 border border-[#222227] rounded-2xl p-5 sm:p-6 shadow-xl">
            <h3 className="text-base sm:text-lg font-bold text-[#FAFAFA] tracking-tight flex items-center gap-2 mb-1">
              <Layers className="w-5 h-5 text-blue-400" />
              Stock Distribution by Category
            </h3>
            <p className="text-xs text-[#71717A] mb-5">
              Breakdown of physical warehouse units
            </p>

            <div className="space-y-4">
              {invData.stockByCategory.map((c: any, i: number) => {
                const percentage = invData.totalStockQty > 0 ? (c.qty / invData.totalStockQty) * 100 : 0;
                return (
                  <div key={i} className="p-3 bg-[#18181D]/60 border border-[#26262E] rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#FAFAFA]">{c.name}</span>
                      <div className="flex items-center gap-2 font-mono font-bold">
                        <span className="text-[#71717A]">({percentage.toFixed(0)}%)</span>
                        <span className="text-blue-400">{c.qty} units</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-[#0D0D10] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {invData.stockByCategory.length === 0 && (
                <div className="text-[#71717A] text-xs py-8 text-center">No category inventory records.</div>
              )}
            </div>
          </div>

          {/* Fast Moving Velocity */}
          <div className="bg-[#121215]/90 border border-[#222227] rounded-2xl p-5 sm:p-6 shadow-xl">
            <h3 className="text-base sm:text-lg font-bold text-[#FAFAFA] tracking-tight flex items-center gap-2 mb-1">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Top Fast-Moving Products (Last 90d)
            </h3>
            <p className="text-xs text-[#71717A] mb-5">
              Highest turnover velocity items
            </p>

            <div className="space-y-2.5">
              {invData.fastMoving.map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[#18181D]/60 hover:bg-[#1E1E26] border border-[#26262E] transition-all">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-[10px] font-bold shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-xs sm:text-sm font-medium text-[#FAFAFA] truncate">{p.name}</span>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    {p.qtySold} sold
                  </span>
                </div>
              ))}
              {invData.fastMoving.length === 0 && (
                <div className="text-[#71717A] text-xs py-8 text-center">
                  No sales recorded in the last 90 days.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dead Stock Ledger */}
        <div className="bg-[#121215]/90 border border-[#222227] rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 sm:p-5 border-b border-[#222227] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#18181C]/50">
            <div>
              <h3 className="text-base font-bold text-[#FAFAFA] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Dead Stock Analysis
                <span className="text-xs font-normal text-[#71717A]">(&gt;90 days in stock with 0 sales)</span>
              </h3>
              <p className="text-xs text-[#71717A] mt-0.5">
                {filteredDeadStock.length} idle inventory items identified
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
              <input
                type="text"
                placeholder="Search dead stock..."
                value={deadStockSearchQuery}
                onChange={(e) => setDeadStockSearchQuery(e.target.value)}
                className="w-full bg-[#111115] border border-[#26262E] focus:border-orange-500 text-xs text-[#FAFAFA] pl-8 pr-3 py-1.5 rounded-xl outline-none transition-all placeholder:text-[#52525B]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#141418] border-b border-[#222227] text-[11px] font-bold text-[#71717A] uppercase tracking-wider">
                  <th className="py-3 px-4">Product Code</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4 text-right">Idle Stock Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F1F24] text-xs">
                {filteredDeadStock.slice(0, 20).map((p: any, i: number) => (
                  <tr key={i} className="hover:bg-[#18181D]/60 transition-colors">
                    <td className="py-3 px-4 text-amber-400 font-mono font-semibold">{p.code}</td>
                    <td className="py-3 px-4 text-[#FAFAFA] font-medium">{p.name}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-red-400">{p.stock} units</td>
                  </tr>
                ))}
                {filteredDeadStock.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-[#71717A] text-xs">
                      No dead stock items found! Inventory turnover is optimal.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {filteredDeadStock.length > 20 && (
            <div className="p-3 text-center text-xs text-[#71717A] border-t border-[#1F1F24] bg-[#141418]">
              Showing first 20 of {filteredDeadStock.length} dead stock items.
            </div>
          )}
        </div>
      </div>
    );
  };

  // 4. CUSTOMER INSIGHTS TAB
  const renderCustomersTab = () => {
    if (!custData) return <Loading />;

    const repeatRate = custData.totalCustomers > 0
      ? Math.round((custData.repeatCustomers / custData.totalCustomers) * 100)
      : 0;

    const maxCustomerSpend = custData.topCustomers?.[0]?.spend || 1;

    return (
      <div className="space-y-6 animate-[fadeInUp_0.3s_ease-out_forwards]">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {renderKPI(
            "Total Customers",
            custData.totalCustomers,
            Users,
            "text-blue-400",
            "Registered client base",
            { text: "Clients", type: "neutral" }
          )}
          {renderKPI(
            "New In Period",
            custData.newCustomers,
            TrendingUp,
            "text-emerald-400",
            "Newly acquired clients",
            { text: "Acquisitions", type: "positive" }
          )}
          {renderKPI(
            "Repeat Customers",
            custData.repeatCustomers,
            Award,
            "text-purple-400",
            `${repeatRate}% client loyalty rate`,
            { text: `${repeatRate}%`, type: "positive" }
          )}
          {renderKPI(
            "Avg Lifetime Spend",
            formatCurrency(Math.round(custData.avgLifetimeValue)),
            Banknote,
            "text-amber-400",
            "Average revenue per client",
            { text: "LTV", type: "neutral" }
          )}
        </div>

        {/* Growth Chart & VIP Spenders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Growth */}
          <div className="bg-[#121215]/90 border border-[#222227] rounded-2xl p-5 sm:p-6 shadow-xl">
            <h3 className="text-base sm:text-lg font-bold text-[#FAFAFA] tracking-tight flex items-center gap-2 mb-1">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              Customer Acquisition Timeline
            </h3>
            <p className="text-xs text-[#71717A] mb-5">
              New customer onboarding velocity
            </p>

            <div className="h-64 w-full">
              {custData.customerGrowth.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-[#71717A] text-xs">
                  No new customer signups in this period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={custData.customerGrowth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCustGrowth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.7}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F1F24" vertical={false} />
                    <XAxis dataKey="date" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#0E0E11',
                        borderColor: '#26262E',
                        borderRadius: '0.75rem',
                        color: '#FAFAFA',
                        fontSize: '12px'
                      }}
                    />
                    <Area type="monotone" dataKey="count" name="New Customers" stroke="#3b82f6" strokeWidth={2.5} fill="url(#colorCustGrowth)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Top 10 VIP Spenders */}
          <div className="bg-[#121215]/90 border border-[#222227] rounded-2xl p-5 sm:p-6 shadow-xl">
            <h3 className="text-base sm:text-lg font-bold text-[#FAFAFA] tracking-tight flex items-center gap-2 mb-1">
              <Award className="w-5 h-5 text-amber-400" />
              VIP Clients by Total Spend
            </h3>
            <p className="text-xs text-[#71717A] mb-5">
              Highest lifetime customer value accounts
            </p>

            <div className="space-y-3">
              {custData.topCustomers.map((c: any, i: number) => {
                const pct = (c.spend / maxCustomerSpend) * 100;
                return (
                  <div key={i} className="p-3 bg-[#18181D]/60 border border-[#26262E] rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                          i === 0 ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                          i === 1 ? "bg-slate-400/20 text-slate-300 border border-slate-400/30" :
                          i === 2 ? "bg-amber-700/20 text-amber-500 border border-amber-700/30" :
                          "bg-[#22222A] text-[#A1A1AA]"
                        }`}>
                          {i + 1}
                        </span>
                        <span className="font-semibold text-[#FAFAFA] truncate">{c.name}</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-400">{formatCurrency(c.spend)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#0D0D10] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {custData.topCustomers.length === 0 && (
                <div className="text-[#71717A] text-xs py-8 text-center">No customer spend records.</div>
              )}
            </div>
          </div>
        </div>

        {/* Top Outstanding Dues Ledger */}
        {custData.topOutstanding?.length > 0 && (
          <div className="bg-[#121215]/90 border border-red-900/40 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 sm:p-5 border-b border-red-900/30 flex items-center justify-between bg-red-950/20">
              <div>
                <h3 className="text-base font-bold text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  Outstanding Customer Receivables (Top 10)
                </h3>
                <p className="text-xs text-red-300/70 mt-0.5">
                  Accounts with overdue pending balances
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#141418] border-b border-[#222227] text-[11px] font-bold text-[#71717A] uppercase tracking-wider">
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4 text-right">Outstanding Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F1F24] text-xs">
                  {custData.topOutstanding.map((c: any, i: number) => (
                    <tr key={i} className="hover:bg-[#18181D]/60 transition-colors">
                      <td className="py-3 px-4 text-[#FAFAFA] font-medium">{c.name}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-red-400">{formatCurrency(c.owed)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 5. PROFIT & EXPENSES TAB
  const renderProfitTab = () => {
    if (!profitData) return <Loading />;

    return (
      <div className="space-y-6 animate-[fadeInUp_0.3s_ease-out_forwards]">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {renderKPI(
            "Gross Revenue",
            formatCurrency(profitData.totalRevenue),
            Banknote,
            "text-blue-400",
            "Total top-line sales",
            { text: "Sales", type: "neutral" }
          )}
          {renderKPI(
            "Operating Expenses",
            formatCurrency(profitData.totalExpenses),
            ArrowDownRight,
            "text-red-400",
            "Logged overhead costs",
            { text: "Costs", type: "negative" }
          )}
          {renderKPI(
            "Gross Profit",
            formatCurrency(profitData.grossProfit),
            TrendingUp,
            "text-emerald-400",
            `Gross Margin: ${profitData.grossMargin.toFixed(1)}%`,
            { text: `${profitData.grossMargin.toFixed(1)}%`, type: "positive" }
          )}
          {renderKPI(
            "Net Profit",
            formatCurrency(profitData.netProfit),
            Sparkles,
            "text-green-400",
            `Net Margin: ${profitData.netMargin.toFixed(1)}%`,
            profitData.netProfit >= 0 ? { text: `${profitData.netMargin.toFixed(1)}%`, type: "positive" } : { text: "Deficit", type: "negative" }
          )}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue vs Expenses & Margin Trend */}
          <div className="lg:col-span-2 space-y-6">
            {/* Revenue vs Expenses */}
            <div className="bg-[#121215]/90 border border-[#222227] rounded-2xl p-5 sm:p-6 shadow-xl">
              <h3 className="text-base sm:text-lg font-bold text-[#FAFAFA] tracking-tight flex items-center gap-2 mb-1">
                <Banknote className="w-5 h-5 text-emerald-400" />
                Revenue vs Operating Expenses
              </h3>
              <p className="text-xs text-[#71717A] mb-5">
                Financial performance comparison over time
              </p>

              <div className="h-64 w-full">
                {profitData.revenueVsExpenses.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-[#71717A] text-xs">
                    No financial revenue/expense records in this period.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={profitData.revenueVsExpenses} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorProfitRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.7}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                        </linearGradient>
                        <linearGradient id="colorProfitExp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.7}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F1F24" vertical={false} />
                      <XAxis dataKey="date" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: '#0E0E11',
                          borderColor: '#26262E',
                          borderRadius: '0.75rem',
                          color: '#FAFAFA',
                          fontSize: '12px'
                        }}
                        formatter={(val: any) => formatCurrency(Number(val))}
                      />
                      <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" fill="url(#colorProfitRev)" strokeWidth={2} />
                      <Area type="monotone" dataKey="expense" name="Expenses" stroke="#ef4444" fill="url(#colorProfitExp)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Profit Margin Trajectory */}
            <div className="bg-[#121215]/90 border border-[#222227] rounded-2xl p-5 sm:p-6 shadow-xl">
              <h3 className="text-base sm:text-lg font-bold text-[#FAFAFA] tracking-tight flex items-center gap-2 mb-1">
                <Percent className="w-5 h-5 text-blue-400" />
                Profit Margin Trajectory
              </h3>
              <p className="text-xs text-[#71717A] mb-5">
                Gross & Net profit margin percentages across dates
              </p>

              <div className="h-56 w-full">
                {profitData.marginTrend?.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-[#71717A] text-xs">
                    No margin trajectory records available.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={profitData.marginTrend} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F1F24" vertical={false} />
                      <XAxis dataKey="date" stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#6B7280" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: '#0E0E11',
                          borderColor: '#26262E',
                          borderRadius: '0.75rem',
                          color: '#FAFAFA',
                          fontSize: '12px'
                        }}
                        formatter={(val: any) => `${Number(val).toFixed(1)}%`}
                      />
                      <Line type="monotone" dataKey="grossMargin" name="Gross Margin" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="netMargin" name="Net Margin" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Right Col: Expense Breakdown */}
          <div className="bg-[#121215]/90 border border-[#222227] rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="mb-4">
                <h3 className="text-base font-bold text-[#FAFAFA] tracking-tight flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-red-400" />
                  Operating Expense Distribution
                </h3>
                <p className="text-xs text-[#71717A] mt-0.5">
                  Overhead expense categories
                </p>
              </div>

              {profitData.expenseBreakdown?.length > 0 ? (
                <>
                  <div className="h-52 my-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={profitData.expenseBreakdown}
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {profitData.expenseBreakdown.map((e: any, i: number) => (
                            <Cell key={`cell-exp-${i}`} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: '#0E0E11',
                            borderColor: '#26262E',
                            borderRadius: '0.75rem',
                            color: '#FAFAFA',
                            fontSize: '12px'
                          }}
                          formatter={(val: any) => formatCurrency(Number(val))}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-3 mt-4">
                    {profitData.expenseBreakdown.map((e: any, i: number) => (
                      <div key={e.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="font-semibold text-[#FAFAFA]">{e.name}</span>
                        </div>
                        <span className="font-mono font-bold text-red-400">{formatCurrency(e.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="py-16 text-center text-[#71717A] text-xs">
                  No operating expenses logged.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderEodTab = () => {
    if (!eodData) return <Loading />;

    const todayStr = new Date().toISOString().split("T")[0];
    const prevObj = new Date();
    prevObj.setDate(prevObj.getDate() - 1);
    const yesterdayStr = prevObj.toISOString().split("T")[0];

    const isToday = eodDate === todayStr;
    const isYesterday = eodDate === yesterdayStr;

    // Filter orders by search query
    const searchLower = eodSearchQuery.toLowerCase().trim();
    const filteredOrders = (eodData.orders || []).filter((o) => {
      if (!searchLower) return true;
      return (
        o.orderNo.toLowerCase().includes(searchLower) ||
        o.customerName.toLowerCase().includes(searchLower) ||
        o.customerPhone.includes(searchLower) ||
        o.items.some((i) => i.productName.toLowerCase().includes(searchLower) || i.productCode.toLowerCase().includes(searchLower))
      );
    });

    const toggleOrderExpanded = (orderId: number) => {
      setExpandedOrderIds((prev) => ({
        ...prev,
        [orderId]: !prev[orderId],
      }));
    };

    const cashPct = eodData.financials.totalCollected > 0
      ? Math.round((eodData.financials.totalCashCollected / eodData.financials.totalCollected) * 100)
      : 0;
    const onlinePct = eodData.financials.totalCollected > 0 ? 100 - cashPct : 0;

    return (
      <div className="space-y-6">
        {/* Settlement Date Selection Bar */}
        <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-[#A3A3A3]">
              <Calendar className="w-4 h-4 text-orange-500" />
              <span className="font-semibold text-[#F5F5F5]">Settlement Date:</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setEodDate(todayStr)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  isToday
                    ? "bg-orange-500 text-[#0A0A0A] shadow-sm font-bold"
                    : "bg-[#1A1A1A] text-[#A3A3A3] hover:text-[#F5F5F5] border border-[#2A2A2A]"
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setEodDate(yesterdayStr)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  isYesterday
                    ? "bg-orange-500 text-[#0A0A0A] shadow-sm font-bold"
                    : "bg-[#1A1A1A] text-[#A3A3A3] hover:text-[#F5F5F5] border border-[#2A2A2A]"
                }`}
              >
                Yesterday
              </button>
            </div>

            <div className="flex items-center gap-2 bg-[#18181C] border border-[#222227] rounded-xl px-2.5 py-1">
              <input
                type="date"
                value={eodDate}
                onChange={(e) => setEodDate(e.target.value)}
                onClick={(e) => {
                  try {
                    (e.target as HTMLInputElement).showPicker();
                  } catch (err) {}
                }}
                className="bg-transparent border-none text-xs text-[#FAFAFA] outline-none cursor-pointer"
                aria-label="Settlement audit date"
              />
            </div>

            <div className="text-xs text-[#737373] hidden md:inline">
              Viewing settlement audit for{" "}
              <span className="text-[#F5F5F5] font-semibold">
                {new Date(eodDate + "T12:00:00Z").toLocaleDateString("en-IN", {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-[#0A0A0A] px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Print report directly or Save as PDF via browser print dialog"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 bg-[#1A1A1A] hover:bg-[#252525] text-[#A3A3A3] hover:text-[#F5F5F5] border border-[#2A2A2A] px-3 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-50"
              title="Export generated PDF file"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Export PDF</span>
            </button>
          </div>
        </div>

        {/* Top 4 KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {renderKPI(
            "TOTAL GROSS SALES",
            formatCurrency(eodData.financials.totalSales),
            DollarSign,
            "text-orange-500",
            `${eodData.financials.totalOrdersCount} Orders (${eodData.financials.directOrdersCount} Direct + ${eodData.financials.bookingOrdersCount} Bookings)`
          )}
          {renderKPI(
            "CASH COLLECTED",
            formatCurrency(eodData.financials.totalCashCollected),
            Banknote,
            "text-emerald-500",
            "Physical Cash Received in Register"
          )}
          {renderKPI(
            "ONLINE / UPI COLLECTED",
            formatCurrency(eodData.financials.totalOnlineCollected),
            CreditCard,
            "text-blue-500",
            "UPI, QR & Bank Transfers"
          )}
          {renderKPI(
            "NEW DUES CREATED",
            formatCurrency(eodData.financials.totalDuesCreated),
            AlertTriangle,
            "text-rose-500",
            "Uncollected Balances to Settle on Pickup"
          )}
        </div>

        {/* Middle Section: Cash Drawer Reconciliation & Day-over-Day Growth */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cash Register & Collections Settlement */}
          <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-base font-bold text-[#F5F5F5]">
                    Cash Register & Collections
                  </h3>
                </div>
                <span className="text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Audit Ready
                </span>
              </div>

              <div className="space-y-3 mt-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#161616] border border-[#222222]">
                  <div className="text-sm text-[#A3A3A3]">
                    (+) Cash Sales & Advances
                  </div>
                  <div className="text-sm font-bold text-emerald-400">
                    +{formatCurrency(eodData.financials.totalCashCollected)}
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-[#161616] border border-[#222222]">
                  <div className="text-sm text-[#A3A3A3]">
                    (+) Online & UPI Collections
                  </div>
                  <div className="text-sm font-bold text-blue-400">
                    +{formatCurrency(eodData.financials.totalOnlineCollected)}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 mt-2">
                  <div>
                    <div className="text-xs font-semibold text-orange-400 uppercase tracking-wider">
                      Total Settlement Collected
                    </div>
                    <div className="text-xs text-[#737373] mt-0.5">
                      Total revenue collected at register today
                    </div>
                  </div>
                  <div className="text-2xl font-black text-orange-400">
                    {formatCurrency(eodData.financials.totalCollected)}
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-[#737373] mt-4 pt-3 border-t border-[#1F1F1F] flex items-center justify-between">
              <span>Formula: Cash Collected + Online / UPI Collected</span>
              <span>Dahotre Arts POS Settlement</span>
            </div>
          </div>

          {/* Day-over-Day Growth & Comparison */}
          <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  <h3 className="text-base font-bold text-[#F5F5F5]">
                    Day-over-Day Performance
                  </h3>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span
                    className={`font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                      eodData.growth.salesGrowthPct >= 0
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}
                  >
                    {eodData.growth.salesGrowthPct >= 0 ? (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    )}
                    {Math.abs(eodData.growth.salesGrowthPct).toFixed(1)}% vs Yesterday
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="p-3.5 rounded-xl bg-[#161616] border border-[#222222]">
                  <div className="text-xs text-[#737373]">Today Gross Sales</div>
                  <div className="text-lg font-bold text-[#F5F5F5] mt-1">
                    {formatCurrency(eodData.growth.todaySales)}
                  </div>
                  <div className="text-[11px] text-[#A3A3A3] mt-0.5">
                    {eodData.growth.todayOrders} Orders Placed
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#161616] border border-[#222222]">
                  <div className="text-xs text-[#737373]">Yesterday Sales</div>
                  <div className="text-lg font-bold text-[#A3A3A3] mt-1">
                    {formatCurrency(eodData.growth.yesterdaySales)}
                  </div>
                  <div className="text-[11px] text-[#737373] mt-0.5">
                    {eodData.growth.yesterdayOrders} Orders Placed
                  </div>
                </div>
              </div>

              {/* Payment Mode Distribution Bar */}
              <div className="mt-5">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-[#A3A3A3] font-medium">Payment Mode Share</span>
                  <span className="text-[#737373]">
                    {cashPct}% Cash &bull; {onlinePct}% Online
                  </span>
                </div>
                <div className="h-3 w-full bg-[#1F1F1F] rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${cashPct}%` }}
                    className="bg-emerald-500 h-full transition-all"
                    title={`Cash: ${cashPct}%`}
                  />
                  <div
                    style={{ width: `${onlinePct}%` }}
                    className="bg-blue-500 h-full transition-all"
                    title={`Online: ${onlinePct}%`}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#737373] mt-1.5">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Cash:{" "}
                    {formatCurrency(eodData.financials.totalCashCollected)}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500" /> Online:{" "}
                    {formatCurrency(eodData.financials.totalOnlineCollected)}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-[#737373] mt-4 pt-3 border-t border-[#1F1F1F]">
              Comparison against previous calendar day ({eodData.prevDate})
            </div>
          </div>
        </div>

        {/* Hourly Sales Distribution Chart */}
        <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-[#F5F5F5]">
                Hourly Sales Activity
              </h3>
              <p className="text-xs text-[#737373] mt-0.5">
                Store traffic and sales distribution across business hours
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#A3A3A3]">
              <Clock className="w-3.5 h-3.5 text-orange-500" /> 8:00 AM – 10:00 PM
            </div>
          </div>

          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eodData.hourlyActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" vertical={false} />
                <XAxis dataKey="hourLabel" stroke="#737373" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#737373"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: "#111111", borderColor: "#2A2A2A", borderRadius: "0.75rem" }}
                  formatter={(val: any) => [formatCurrency(Number(val)), "Sales"]}
                />
                <Bar dataKey="sales" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Today's Bookings & Product Reservations */}
        <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#1F1F1F]">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-orange-500" />
                <h3 className="text-base font-bold text-[#F5F5F5]">
                  Today&apos;s Bookings & Product Reservations
                </h3>
              </div>
              <p className="text-xs text-[#737373] mt-0.5">
                Breakdown of items reserved today with advance deposits
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] px-3 py-1.5 rounded-lg">
                <span className="text-[#737373]">New Bookings: </span>
                <span className="font-bold text-[#F5F5F5]">{eodData.bookings.totalCount}</span>
              </div>
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] px-3 py-1.5 rounded-lg">
                <span className="text-[#737373]">Booking Value: </span>
                <span className="font-bold text-orange-400">{formatCurrency(eodData.bookings.totalValue)}</span>
              </div>
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] px-3 py-1.5 rounded-lg">
                <span className="text-[#737373]">Advance Paid: </span>
                <span className="font-bold text-emerald-400">{formatCurrency(eodData.bookings.totalAdvance)}</span>
              </div>
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] px-3 py-1.5 rounded-lg">
                <span className="text-[#737373]">Due: </span>
                <span className="font-bold text-rose-400">{formatCurrency(eodData.bookings.totalDue)}</span>
              </div>
            </div>
          </div>

          {eodData.bookings.bookedProducts.length === 0 ? (
            <div className="text-center py-8 text-sm text-[#737373]">
              No product reservations or advance bookings were placed on this date.
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#1F1F1F] text-xs font-semibold text-[#A3A3A3]">
                    <th className="pb-3 pr-4">PRODUCT CODE</th>
                    <th className="pb-3 pr-4">PRODUCT NAME</th>
                    <th className="pb-3 pr-4">CATEGORY</th>
                    <th className="pb-3 pr-4">SIZE / VARIANT</th>
                    <th className="pb-3 pr-4 text-center">QTY RESERVED</th>
                    <th className="pb-3 text-right">TOTAL VALUE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F1F1F]/60">
                  {eodData.bookings.bookedProducts.map((p, idx) => (
                    <tr key={idx} className="hover:bg-[#161616] transition-colors">
                      <td className="py-3 pr-4 font-mono text-xs font-semibold text-orange-400">
                        {p.productCode || "-"}
                      </td>
                      <td className="py-3 pr-4 font-semibold text-[#F5F5F5]">
                        {p.name}
                      </td>
                      <td className="py-3 pr-4 text-xs text-[#A3A3A3]">
                        {p.category}
                      </td>
                      <td className="py-3 pr-4 text-xs text-[#D4D4D4]">
                        {p.sizeOrVariant}
                      </td>
                      <td className="py-3 pr-4 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                          {p.qty}
                        </span>
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-[#F5F5F5]">
                        {formatCurrency(p.totalValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Today's Detailed Orders Transactions Table */}
        <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-[#1F1F1F]">
            <div>
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-orange-500" />
                <h3 className="text-base font-bold text-[#F5F5F5]">
                  Today&apos;s Order Transactions
                </h3>
              </div>
              <p className="text-xs text-[#737373] mt-0.5">
                Comprehensive log of all {eodData.orders.length} orders placed on {eodDate}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search orders, customers..."
                  value={eodSearchQuery}
                  onChange={(e) => setEodSearchQuery(e.target.value)}
                  className="bg-[#1A1A1A] border border-[#2A2A2A] text-xs text-[#F5F5F5] rounded-lg pl-8 pr-3 py-1.5 outline-none focus:border-orange-500 w-full sm:w-[220px]"
                />
              </div>
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-sm text-[#737373]">
              No orders match the current search filter.
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#1F1F1F] text-xs font-semibold text-[#A3A3A3]">
                    <th className="pb-3 pr-3 w-8"></th>
                    <th className="pb-3 pr-4">ORDER NO & TIME</th>
                    <th className="pb-3 pr-4">CUSTOMER</th>
                    <th className="pb-3 pr-4">TYPE</th>
                    <th className="pb-3 pr-4">ITEMS SUMMARY</th>
                    <th className="pb-3 pr-4">PAYMENT SPLIT</th>
                    <th className="pb-3 pr-4 text-right">TOTAL</th>
                    <th className="pb-3 pr-4 text-right">PAID / DUE</th>
                    <th className="pb-3 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F1F1F]/60">
                  {filteredOrders.map((o) => {
                    const isExpanded = !!expandedOrderIds[o.id];
                    return (
                      <React.Fragment key={o.id}>
                        <tr
                          onClick={() => toggleOrderExpanded(o.id)}
                          className="hover:bg-[#161616] transition-colors cursor-pointer"
                        >
                          <td className="py-3 pr-2 text-center text-[#737373]">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-orange-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            <div className="font-mono text-xs font-bold text-[#F5F5F5]">
                              {o.orderNo}
                            </div>
                            <div className="text-[11px] text-[#737373] mt-0.5">
                              {o.timeStr} &bull; {o.userName}
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="font-semibold text-xs text-[#F5F5F5]">
                              {o.customerName}
                            </div>
                            <div className="text-[11px] text-[#737373] font-mono">
                              {o.customerPhone}
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                o.orderType === "BOOKING"
                                  ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                                  : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              }`}
                            >
                              {o.orderType}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-xs text-[#D4D4D4] max-w-[240px]">
                            {o.items.length === 0 ? (
                              <span className="text-[#737373]">No items</span>
                            ) : (
                              <div>
                                <span className="font-medium text-[#F5F5F5]">
                                  {o.items[0].productName}
                                </span>{" "}
                                <span className="text-orange-400 font-bold">
                                  &times;{o.items[0].quantity}
                                </span>
                                {o.items.length > 1 && (
                                  <span className="text-xs text-[#737373] ml-1">
                                    +{o.items.length - 1} more
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3 pr-4 text-xs">
                            <div className="flex flex-wrap gap-1">
                              {o.payments.map((p, pIdx) => (
                                <span
                                  key={pIdx}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium font-mono ${
                                    p.paymentMode === "CASH"
                                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                      : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                  }`}
                                >
                                  {p.paymentMode} {formatCurrency(p.amount)}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-right font-mono font-bold text-xs text-[#F5F5F5]">
                            {formatCurrency(o.totalAmount)}
                          </td>
                          <td className="py-3 pr-4 text-right font-mono text-xs">
                            <div className="text-emerald-400 font-semibold">
                              {formatCurrency(o.paidAmount)}
                            </div>
                            {o.dueAmount > 0 && (
                              <div className="text-rose-400 font-bold text-[11px]">
                                Due: {formatCurrency(o.dueAmount)}
                              </div>
                            )}
                          </td>
                          <td className="py-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                o.status === "COMPLETED"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : o.status === "PENDING"
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              }`}
                            >
                              {o.status}
                            </span>
                          </td>
                        </tr>

                        {/* Expanded Item Details */}
                        {isExpanded && (
                          <tr className="bg-[#0D0D0D]">
                            <td colSpan={9} className="p-4 border-b border-[#1F1F1F]">
                              <div className="pl-6 space-y-2">
                                <div className="text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider">
                                  Order Line Items Breakdown:
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                  {o.items.map((item) => (
                                    <div
                                      key={item.id}
                                      className="p-2.5 rounded-lg bg-[#141414] border border-[#222222] text-xs flex justify-between items-center"
                                    >
                                      <div>
                                        <div className="font-semibold text-[#F5F5F5]">
                                          {item.productName}
                                        </div>
                                        <div className="text-[11px] text-[#737373]">
                                          {item.productCode} &bull; {item.variantLabel}
                                        </div>
                                      </div>
                                      <div className="text-right font-mono">
                                        <div className="text-orange-400 font-bold">
                                          &times;{item.quantity}
                                        </div>
                                        <div className="text-[#A3A3A3]">
                                          {formatCurrency(item.subtotal)}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const Loading = () => (
    <div className="h-64 flex flex-col items-center justify-center text-[#737373] gap-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      Loading tab data...
    </div>
  );

  return (
    <div className="space-y-6 pb-12 max-w-[1600px] mx-auto">
      {/* Header & Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-[#0A0A0A]/90 backdrop-blur pt-2 pb-4 z-10 border-b border-[#1F1F1F] print-hide">
        <div>
          <h1 className="text-3xl font-bold text-[#F5F5F5] tracking-tight flex items-center gap-2">
            Reports
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 bg-[#121215] border border-[#222227] rounded-xl p-1.5 shadow-sm">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-[#18181C] border border-[#222227] rounded-xl px-2.5 py-1">
            <Layers className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <select
              className="bg-transparent border-none text-xs text-[#FAFAFA] outline-none cursor-pointer pr-1"
              value={selectedCategory}
              onChange={(e) => {
                const newCat = e.target.value;
                setSelectedCategory(newCat);
                const params = new URLSearchParams(searchParams.toString());
                if (newCat && newCat !== "ALL") params.set("category", newCat);
                else params.delete("category");
                router.replace(`${pathname}?${params.toString()}`, { scroll: false });
              }}
              title="Filter by category"
            >
              <option value="ALL" className="bg-[#18181C] text-[#FAFAFA]">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id.toString()} className="bg-[#18181C] text-[#FAFAFA]">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-px h-4 bg-[#222227] mx-0.5 hidden sm:block"></div>

          <select 
            className="ds-select !py-1 !text-xs !bg-[#18181C] rounded-lg"
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
          <div className="w-px h-4 bg-[#222227] mx-1 hidden sm:block"></div>
          <div className="flex items-center gap-1.5 flex-1 sm:flex-none bg-[#18181C] border border-[#222227] rounded-xl px-2.5 py-1">
            <Calendar className="w-3.5 h-3.5 text-[#71717A] hidden sm:block shrink-0" />
            <input 
              type="date" 
              className="bg-transparent border-none text-xs text-[#FAFAFA] outline-none cursor-pointer w-auto flex-1 min-w-[105px] sm:w-[110px]"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              onClick={e => { try { (e.target as HTMLInputElement).showPicker(); } catch(err) {} }}
              aria-label="Start date"
            />
            <span className="text-[#52525B] text-xs">-</span>
            <input 
              type="date" 
              className="bg-transparent border-none text-xs text-[#FAFAFA] outline-none cursor-pointer w-auto flex-1 min-w-[105px] sm:w-[110px]"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              onClick={e => { try { (e.target as HTMLInputElement).showPicker(); } catch(err) {} }}
              aria-label="End date"
            />
          </div>
          <button 
            onClick={applyDates}
            className="bg-orange-500 hover:bg-orange-400 text-[#0A0A0A] px-3 sm:px-4 py-1 text-xs sm:text-sm rounded transition-colors font-bold shadow-sm cursor-pointer shrink-0"
          >
            Apply
          </button>
          {(dateFrom || dateTo || (selectedCategory && selectedCategory !== "ALL")) && (
            <button 
              onClick={clearDates}
              className="text-[#A3A3A3] hover:text-[#F5F5F5] p-1 text-xs transition-colors print-hide cursor-pointer"
              title="Clear Filter"
              aria-label="Clear all filters"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="w-px h-4 bg-[#2A2A2A] mx-1 hidden sm:block print-hide"></div>
          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf || (activeTab === 'revenue' && !revData) || (activeTab === 'sales' && !salesData) || (activeTab === 'inventory' && !invData) || (activeTab === 'customers' && !custData) || (activeTab === 'profit' && !profitData) || (activeTab === 'eod' && !eodData)}
            className="flex items-center gap-1.5 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-[#F5F5F5] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded transition-colors text-xs sm:text-sm font-medium border border-[#2A2A2A] disabled:opacity-50 disabled:cursor-not-allowed print-hide cursor-pointer shrink-0"
          >
            {isGeneratingPdf ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <FileDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            <span className="inline">PDF</span>
          </button>
        </div>
      </div>

      {/* Horizontal Tab Bar */}
      <div className="flex overflow-x-auto custom-scrollbar border-b border-[#1F1F1F] pb-px -mx-4 px-4 sm:mx-0 sm:px-0">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-3 sm:py-4 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap outline-none cursor-pointer shrink-0 ${
                isActive 
                  ? 'border-orange-500 text-orange-500 bg-[#1A1A1A]/30' 
                  : 'border-transparent text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#1A1A1A]/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="pt-2 min-h-[500px]">
        {activeTab === 'revenue' && renderRevenueTab()}
        {activeTab === 'sales' && renderSalesTab()}
        {activeTab === 'inventory' && renderInventoryTab()}
        {activeTab === 'customers' && renderCustomersTab()}
        {activeTab === 'profit' && renderProfitTab()}
        {activeTab === 'eod' && renderEodTab()}
      </div>

      {/* High-Fidelity Print Portal for EOD */}
      {isMounted && activeTab === 'eod' && eodData && createPortal(
        <EodPrintView eodData={eodData} eodDate={eodDate} categoryName={selectedCategoryName} />,
        document.body
      )}

    </div>
  );
}

