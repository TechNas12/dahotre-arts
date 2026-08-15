"use client";

import { useState, useEffect, useTransition } from "react";
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
  ArrowDownRight
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar,
  PieChart, Pie, Cell,
  ComposedChart, Line,
  LineChart, ReferenceLine
} from 'recharts';

import { 
  getRevenuePaymentData,
  getSalesAnalyticsData,
  getInventoryData,
  getCustomerInsightsData,
  getProfitExpensesData
} from "@/app/actions/reports";

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#06b6d4'];

const TABS = [
  { id: 'revenue', label: 'Revenue & Payments', icon: Banknote },
  { id: 'sales', label: 'Sales Analytics', icon: TrendingUp },
  { id: 'inventory', label: 'Inventory Intelligence', icon: Package },
  { id: 'customers', label: 'Customer Insights', icon: Users },
  { id: 'profit', label: 'Profit & Expenses', icon: PieChartIcon },
];

export function ReportsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [dateFrom, setDateFrom] = useState(searchParams.get("from") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("to") || "");

  const [activeTab, setActiveTab] = useState('revenue');
  
  // Revenue Chart Controls
  const [revChartType, setRevChartType] = useState<"area" | "bar" | "line">("area");
  const [showCash, setShowCash] = useState(true);
  const [showUpi, setShowUpi] = useState(true);
  const [showAvg, setShowAvg] = useState(false);
  
  // Data States
  const [revData, setRevData] = useState<any>(null);
  const [salesData, setSalesData] = useState<any>(null);
  const [invData, setInvData] = useState<any>(null);
  const [custData, setCustData] = useState<any>(null);
  const [profitData, setProfitData] = useState<any>(null);

  // Fetch logic
  useEffect(() => {
    startTransition(() => {
      // Clear data for the active tab so we see a loading state if dates change
      // Only fetch the active tab's data
      fetchTabData(activeTab, dateFrom, dateTo);
    });
  }, [dateFrom, dateTo, activeTab]);

  const fetchTabData = async (tab: string, from?: string, to?: string) => {
    if (tab === 'revenue') {
      setRevData(null);
      getRevenuePaymentData(from, to).then(setRevData);
    } else if (tab === 'sales') {
      setSalesData(null);
      getSalesAnalyticsData(from, to).then(setSalesData);
    } else if (tab === 'inventory') {
      // Inventory doesn't strictly use dates except for some metrics, but we fetch it
      if (!invData) {
        setInvData(null);
        getInventoryData().then(setInvData);
      }
    } else if (tab === 'customers') {
      setCustData(null);
      getCustomerInsightsData(from, to).then(setCustData);
    } else if (tab === 'profit') {
      setProfitData(null);
      getProfitExpensesData(from, to).then(setProfitData);
    }
  };

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

  // --- Render Helpers ---

  const renderKPI = (title: string, value: string | number, icon: any, colorClass: string, sub?: string) => {
    const Icon = icon;
    return (
      <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-5 shadow-sm flex flex-col justify-center min-h-[120px] relative overflow-hidden group">
        <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-5 ${colorClass} blur-xl group-hover:opacity-20 transition-opacity`} />
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2 rounded-lg bg-[#0A0A0A] ${colorClass}`}>
            <Icon className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-medium text-[#A3A3A3]">{title}</h3>
        </div>
        <div className="text-3xl font-bold text-[#F5F5F5]">{value}</div>
        {sub && <div className="text-xs text-[#737373] mt-1">{sub}</div>}
      </div>
    );
  };

  const renderRevenueTab = () => {
    if (!revData) return <Loading />;
    
    const avgRevenue = revData.chartData.length > 0 
      ? revData.chartData.reduce((sum: number, item: any) => sum + item.total, 0) / revData.chartData.length 
      : 0;

    return (
      <div className="space-y-6 animate-[fadeInUp_0.3s_ease-out_forwards]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {renderKPI("Total Revenue", formatCurrency(revData.totalRevenue), Banknote, "text-green-400", "From all orders (excl. cancelled)")}
          {renderKPI("Cash Payments", formatCurrency(revData.cashRev), Wallet, "text-amber-400", "Actual cash received")}
          {renderKPI("Online Payments", formatCurrency(revData.upiRev), CreditCard, "text-blue-400", "Actual online received")}
          {renderKPI("Outstanding Dues", formatCurrency(revData.outstandingDues), AlertTriangle, "text-red-400", "Pending balance from orders")}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#111111] border border-[#1F1F1F] rounded-2xl p-6">
             <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
               <h3 className="text-lg font-bold text-[#F5F5F5]">Revenue Over Time</h3>
               <div className="flex flex-wrap items-center gap-4">
                 <select 
                   className="bg-[#1A1A1A] border border-[#2A2A2A] text-[#F5F5F5] text-xs rounded px-2 py-1 outline-none focus:border-green-500"
                   value={revChartType}
                   onChange={e => setRevChartType(e.target.value as any)}
                 >
                   <option value="area">Area</option>
                   <option value="bar">Bar</option>
                   <option value="line">Line</option>
                 </select>
                 <label className="flex items-center cursor-pointer text-xs text-[#F5F5F5] hover:text-[#F5F5F5] transition-colors">
                   <input 
                     type="checkbox" 
                     className="mr-1.5 rounded border-[#2A2A2A] text-amber-500 bg-[#1A1A1A] focus:ring-amber-500"
                     checked={showCash}
                     onChange={e => setShowCash(e.target.checked)}
                   />
                   Cash
                 </label>
                 <label className="flex items-center cursor-pointer text-xs text-[#F5F5F5] hover:text-[#F5F5F5] transition-colors">
                   <input 
                     type="checkbox" 
                     className="mr-1.5 rounded border-[#2A2A2A] text-blue-500 bg-[#1A1A1A] focus:ring-blue-500"
                     checked={showUpi}
                     onChange={e => setShowUpi(e.target.checked)}
                   />
                   UPI
                 </label>
                 <label className="flex items-center cursor-pointer text-xs text-[#F5F5F5] hover:text-[#F5F5F5] transition-colors">
                   <input 
                     type="checkbox" 
                     className="mr-1.5 rounded border-[#2A2A2A] text-green-500 bg-[#1A1A1A] focus:ring-green-500"
                     checked={showAvg}
                     onChange={e => setShowAvg(e.target.checked)}
                   />
                   Daily Avg
                 </label>
               </div>
             </div>
             <div className="h-80">
                {revData.chartData.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-[#F5F5F5]0 text-sm">No payment data in this period.</div>
                ) : revData.chartData.length === 1 || revChartType === 'bar' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revData.chartData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="date" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value/1000}k`} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.5rem', color: '#f8fafc' }} />
                      {showAvg && <ReferenceLine y={avgRevenue} stroke="#f59e0b" strokeDasharray="5 5" label={{ position: 'top', value: `Avg: ${formatCurrency(Math.round(avgRevenue))}`, fill: '#f59e0b', fontSize: 12 }} />}
                      {showCash && <Bar dataKey="cash" stackId="1" fill="#f59e0b" name="Cash" maxBarSize={50} />}
                      {showUpi && <Bar dataKey="upi" stackId="1" fill="#3b82f6" name="UPI" maxBarSize={50} />}
                    </BarChart>
                  </ResponsiveContainer>
                ) : revChartType === 'line' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revData.chartData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="date" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value/1000}k`} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.5rem', color: '#f8fafc' }} />
                      {showAvg && <ReferenceLine y={avgRevenue} stroke="#f59e0b" strokeDasharray="5 5" label={{ position: 'top', value: `Avg: ${formatCurrency(Math.round(avgRevenue))}`, fill: '#f59e0b', fontSize: 12 }} />}
                      {showCash && <Line type="monotone" dataKey="cash" stroke="#f59e0b" name="Cash" strokeWidth={2} dot={false} />}
                      {showUpi && <Line type="monotone" dataKey="upi" stroke="#3b82f6" name="UPI" strokeWidth={2} dot={false} />}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revData.chartData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorUpi" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="date" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value/1000}k`} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.5rem', color: '#f8fafc' }} />
                      {showAvg && <ReferenceLine y={avgRevenue} stroke="#f59e0b" strokeDasharray="5 5" label={{ position: 'top', value: `Avg: ${formatCurrency(Math.round(avgRevenue))}`, fill: '#f59e0b', fontSize: 12 }} />}
                      {showCash && <Area type="monotone" dataKey="cash" stackId="1" stroke="#f59e0b" fill="url(#colorCash)" name="Cash" />}
                      {showUpi && <Area type="monotone" dataKey="upi" stackId="1" stroke="#3b82f6" fill="url(#colorUpi)" name="UPI" />}
                    </AreaChart>
                  </ResponsiveContainer>
                )}
             </div>
          </div>
          
          <div className="space-y-6">
             <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-6 flex flex-col h-[190px]">
                <h3 className="text-sm font-bold text-[#F5F5F5] mb-2">Payment Mode</h3>
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={revData.paymentModeSplit} innerRadius="60%" outerRadius="90%" paddingAngle={5} dataKey="value">
                        {revData.paymentModeSplit.map((e: any, i: number) => (
                          <Cell key={`cell-${i}`} fill={e.name === 'CASH' ? '#f59e0b' : '#3b82f6'} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.5rem' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 text-xs font-medium text-[#A3A3A3] mt-2">
                   <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div>Cash</div>
                   <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div>UPI</div>
                </div>
             </div>

             <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-6 flex flex-col h-[190px]">
                <h3 className="text-sm font-bold text-[#F5F5F5] mb-2">Payment Type</h3>
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={revData.orderTypeSplit} innerRadius="60%" outerRadius="90%" paddingAngle={5} dataKey="value">
                        {revData.orderTypeSplit.map((e: any, i: number) => (
                          <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.5rem' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 text-xs font-medium text-[#A3A3A3] mt-2">
                   {revData.orderTypeSplit.map((e: any, i: number) => (
                     <div key={e.name} className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>{e.name}</div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSalesTab = () => {
    if (!salesData) return <Loading />;
    return (
      <div className="space-y-6 animate-[fadeInUp_0.3s_ease-out_forwards]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {renderKPI("Total Orders", salesData.totalOrders, ShoppingCart, "text-blue-400")}
          {renderKPI("Avg Order Value", formatCurrency(Math.round(salesData.avgOrderValue)), Percent, "text-green-400")}
          {renderKPI("Items Sold", salesData.itemsSold, Package, "text-purple-400")}
          {renderKPI("Cancelled Orders", salesData.cancelledOrders, XCircle, "text-red-400")}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
             <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-6">
                <h3 className="text-lg font-bold text-[#F5F5F5] mb-6">Orders Over Time</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesData.ordersOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="date" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.5rem', color: '#f8fafc' }} cursor={{ fill: '#1e293b' }} />
                      <Bar dataKey="count" name="Orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>

             <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-6">
                <h3 className="text-lg font-bold text-[#F5F5F5] mb-4">Top 10 Products</h3>
                <div className="space-y-4">
                  {salesData.topProducts.map((p: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                       <div className="flex items-center gap-3 w-1/2">
                         <div className="w-6 h-6 rounded bg-[#1A1A1A] flex items-center justify-center text-xs font-bold text-[#A3A3A3]">{i+1}</div>
                         <div className="truncate text-sm text-[#F5F5F5]">{p.name}</div>
                       </div>
                       <div className="w-1/4 text-right text-sm text-[#A3A3A3]">{p.qty} sold</div>
                       <div className="w-1/4 text-right text-sm font-bold text-green-400">{formatCurrency(p.revenue)}</div>
                    </div>
                  ))}
                  {salesData.topProducts.length === 0 && <div className="text-[#F5F5F5]0 text-sm py-4">No products sold in this period.</div>}
                </div>
             </div>
          </div>
          
          <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-6 flex flex-col h-full">
            <h3 className="text-lg font-bold text-[#F5F5F5] mb-6">Sales by Category</h3>
            <div className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={salesData.categorySplit} innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                    {salesData.categorySplit.map((e: any, i: number) => (
                      <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.5rem' }} 
                    formatter={(val: any) => formatCurrency(Number(val))}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex flex-col gap-2">
               {salesData.categorySplit.map((e: any, i: number) => (
                 <div key={e.name} className="flex items-center justify-between text-sm">
                   <div className="flex items-center gap-2">
                     <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                     <span className="text-[#F5F5F5]">{e.name}</span>
                   </div>
                   <span className="font-medium text-[#A3A3A3]">{formatCurrency(e.value)}</span>
                 </div>
               ))}
               {salesData.categorySplit.length === 0 && <div className="text-[#F5F5F5]0 text-sm">No data available.</div>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderInventoryTab = () => {
    if (!invData) return <Loading />;
    return (
      <div className="space-y-6 animate-[fadeInUp_0.3s_ease-out_forwards]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {renderKPI("Total SKUs", invData.totalSkus, Package, "text-blue-400")}
          {renderKPI("Total Stock Qty", invData.totalStockQty, Package, "text-purple-400")}
          {renderKPI("Stock Value (at cost)", formatCurrency(invData.stockValue), Banknote, "text-emerald-400")}
          {renderKPI("Out of Stock", invData.outOfStock, AlertTriangle, "text-red-400")}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-6">
            <h3 className="text-lg font-bold text-[#F5F5F5] mb-6">Stock Distribution by Category</h3>
            <div className="space-y-4">
               {invData.stockByCategory.map((c: any, i: number) => {
                 const percentage = invData.totalStockQty > 0 ? (c.qty / invData.totalStockQty) * 100 : 0;
                 return (
                   <div key={i} className="flex items-center gap-4">
                     <div className="w-24 truncate text-sm text-[#A3A3A3]" title={c.name}>{c.name}</div>
                     <div className="flex-1 h-3 bg-[#0A0A0A] rounded-full overflow-hidden">
                       <div className="h-full bg-blue-500 rounded-full" style={{ width: `${percentage}%` }}></div>
                     </div>
                     <div className="w-16 text-right text-sm font-bold text-[#F5F5F5]">{c.qty}</div>
                   </div>
                 );
               })}
               {invData.stockByCategory.length === 0 && <div className="text-[#F5F5F5]0 text-sm">No categories found.</div>}
            </div>
          </div>

          <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-6">
            <h3 className="text-lg font-bold text-[#F5F5F5] mb-4 flex items-center gap-2">
               Top 10 Fast-Moving (Last 90d)
            </h3>
            <div className="space-y-3">
              {invData.fastMoving.map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 rounded hover:bg-[#1A1A1A]/50">
                  <div className="text-sm text-[#F5F5F5] truncate pr-4">{p.name}</div>
                  <div className="text-sm font-bold text-green-400 whitespace-nowrap">{p.qtySold} sold</div>
                </div>
              ))}
              {invData.fastMoving.length === 0 && <div className="text-[#F5F5F5]0 text-sm">No sales in the last 90 days.</div>}
            </div>
          </div>
        </div>

        <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl overflow-hidden">
           <div className="p-6 border-b border-[#1F1F1F]">
             <h3 className="text-lg font-bold text-[#F5F5F5] flex items-center gap-2">
               Dead Stock
               <span className="text-xs font-normal text-[#F5F5F5]0 ml-2">(In stock, but 0 sales in last 90 days)</span>
             </h3>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#0A0A0A]/50">
                  <tr className="border-b border-[#1F1F1F] text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider">
                    <th className="p-4">Code</th>
                    <th className="p-4">Name</th>
                    <th className="p-4 text-right">Stock Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F1F1F]">
                   {invData.deadStock.slice(0, 20).map((p: any, i: number) => (
                     <tr key={i} className="hover:bg-[#1A1A1A]/30">
                       <td className="p-4 text-sm text-[#F5F5F5]">{p.code}</td>
                       <td className="p-4 text-sm text-[#F5F5F5]">{p.name}</td>
                       <td className="p-4 text-sm font-bold text-red-400 text-right">{p.stock}</td>
                     </tr>
                   ))}
                   {invData.deadStock.length === 0 && (
                     <tr><td colSpan={3} className="p-8 text-center text-[#F5F5F5]0">No dead stock found. Great job!</td></tr>
                   )}
                </tbody>
              </table>
              {invData.deadStock.length > 20 && (
                <div className="p-4 text-center text-sm text-[#F5F5F5]0 border-t border-[#1F1F1F]">Showing first 20 dead stock items.</div>
              )}
           </div>
        </div>
      </div>
    );
  };

  const renderCustomersTab = () => {
    if (!custData) return <Loading />;
    return (
      <div className="space-y-6 animate-[fadeInUp_0.3s_ease-out_forwards]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {renderKPI("Total Customers", custData.totalCustomers, Users, "text-blue-400")}
          {renderKPI("New Customers", custData.newCustomers, TrendingUp, "text-green-400", "In selected period")}
          {renderKPI("Repeat Customers", custData.repeatCustomers, Users, "text-purple-400", "Have >1 orders total")}
          {renderKPI("Avg Lifetime Spend", formatCurrency(Math.round(custData.avgLifetimeValue)), Banknote, "text-emerald-400", "For active customers")}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-6">
              <h3 className="text-lg font-bold text-[#F5F5F5] mb-6">Customer Growth</h3>
              <div className="h-64">
                {custData.customerGrowth.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-[#F5F5F5]0 text-sm">No new customers in this period.</div>
                ) : custData.customerGrowth.length === 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={custData.customerGrowth} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="date" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.5rem', color: '#f8fafc' }} />
                      <Bar dataKey="count" name="New Customers" fill="#3b82f6" maxBarSize={50} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={custData.customerGrowth} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="date" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.5rem', color: '#f8fafc' }} />
                      <Area type="monotone" dataKey="count" name="New Customers" stroke="#3b82f6" fill="url(#colorGrowth)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
           </div>

           <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-6">
              <h3 className="text-lg font-bold text-[#F5F5F5] mb-4 flex items-center gap-2">
                 Top 10 Customers (By Spend)
              </h3>
              <div className="space-y-4">
                 {custData.topCustomers.map((c: any, i: number) => {
                   const maxSpend = custData.topCustomers[0]?.spend || 1;
                   const pct = (c.spend / maxSpend) * 100;
                   return (
                     <div key={i} className="flex flex-col gap-1">
                       <div className="flex justify-between text-sm">
                         <span className="text-[#F5F5F5] font-medium">{c.name}</span>
                         <span className="text-green-400 font-bold">{formatCurrency(c.spend)}</span>
                       </div>
                       <div className="h-2 w-full bg-[#0A0A0A] rounded-full overflow-hidden">
                         <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }}></div>
                       </div>
                     </div>
                   );
                 })}
                 {custData.topCustomers.length === 0 && <div className="text-[#F5F5F5]0 text-sm">No customer data.</div>}
              </div>
           </div>
        </div>

        {custData.topOutstanding.length > 0 && (
          <div className="bg-[#111111] border border-red-900/50 rounded-2xl overflow-hidden">
             <div className="p-6 border-b border-[#1F1F1F] bg-red-950/20">
               <h3 className="text-lg font-bold text-red-400 flex items-center gap-2">
                 ⚠️ Outstanding Dues by Customer (Top 10)
               </h3>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#0A0A0A]/50">
                    <tr className="border-b border-[#1F1F1F] text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider">
                      <th className="p-4">Customer Name</th>
                      <th className="p-4 text-right">Amount Owed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F1F1F]">
                     {custData.topOutstanding.map((c: any, i: number) => (
                       <tr key={i} className="hover:bg-[#1A1A1A]/30">
                         <td className="p-4 text-sm font-medium text-[#F5F5F5]">{c.name}</td>
                         <td className="p-4 text-sm font-bold text-red-400 text-right">{formatCurrency(c.owed)}</td>
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

  const renderProfitTab = () => {
    if (!profitData) return <Loading />;
    return (
      <div className="space-y-6 animate-[fadeInUp_0.3s_ease-out_forwards]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {renderKPI("Total Revenue", formatCurrency(profitData.totalRevenue), Banknote, "text-blue-400")}
          {renderKPI("Total Expenses", formatCurrency(profitData.totalExpenses), ArrowDownRight, "text-red-400")}
          {renderKPI("Gross Profit", formatCurrency(profitData.grossProfit), TrendingUp, "text-green-400", `Margin: ${profitData.grossMargin.toFixed(1)}%`)}
          {renderKPI("Net Profit", formatCurrency(profitData.netProfit), Banknote, "text-emerald-400", `Margin: ${profitData.netMargin.toFixed(1)}%`)}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="lg:col-span-2 space-y-6">
              <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-6">
                 <h3 className="text-lg font-bold text-[#F5F5F5] mb-6">Revenue vs Expenses</h3>
                 <div className="h-64">
                    {profitData.revenueVsExpenses.length === 0 ? (
                      <div className="w-full h-full flex items-center justify-center text-[#F5F5F5]0 text-sm">No financial data in this period.</div>
                    ) : profitData.revenueVsExpenses.length === 1 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={profitData.revenueVsExpenses} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="date" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                          <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.5rem', color: '#f8fafc' }} />
                          <Bar dataKey="revenue" name="Revenue" fill="#10b981" maxBarSize={50} />
                          <Bar dataKey="expense" name="Expenses" fill="#ef4444" maxBarSize={50} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={profitData.revenueVsExpenses} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="date" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                          <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.5rem', color: '#f8fafc' }} />
                          <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" fill="url(#colorRev)" />
                          <Area type="monotone" dataKey="expense" name="Expenses" stroke="#ef4444" fill="url(#colorExp)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                 </div>
              </div>

              <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-6">
                 <h3 className="text-lg font-bold text-[#F5F5F5] mb-6">Profit Margin Trend</h3>
                 <div className="h-64">
                    {profitData.marginTrend.length === 0 ? (
                      <div className="w-full h-full flex items-center justify-center text-[#F5F5F5]0 text-sm">No margin data in this period.</div>
                    ) : profitData.marginTrend.length === 1 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={profitData.marginTrend} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="date" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                          <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.5rem', color: '#f8fafc' }} formatter={(val: any) => `${Number(val).toFixed(1)}%`} />
                          <Bar dataKey="grossMargin" name="Gross Margin" fill="#3b82f6" maxBarSize={50} />
                          <Bar dataKey="netMargin" name="Net Margin" fill="#10b981" maxBarSize={50} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={profitData.marginTrend} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="date" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                          <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.5rem', color: '#f8fafc' }} formatter={(val: any) => `${Number(val).toFixed(1)}%`} />
                          <Line type="monotone" dataKey="grossMargin" name="Gross Margin" stroke="#3b82f6" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="netMargin" name="Net Margin" stroke="#10b981" strokeWidth={2} dot={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                 </div>
              </div>
           </div>

           <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-6 flex flex-col h-full">
              <h3 className="text-lg font-bold text-[#F5F5F5] mb-6">Expense Breakdown</h3>
              <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={profitData.expenseBreakdown} innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                      {profitData.expenseBreakdown.map((e: any, i: number) => (
                        <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.5rem' }} 
                      formatter={(val: any) => formatCurrency(Number(val))}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                 {profitData.expenseBreakdown.map((e: any, i: number) => (
                   <div key={e.name} className="flex items-center justify-between text-sm">
                     <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                       <span className="text-[#F5F5F5]">{e.name}</span>
                     </div>
                     <span className="font-medium text-[#A3A3A3]">{formatCurrency(e.value)}</span>
                   </div>
                 ))}
                 {profitData.expenseBreakdown.length === 0 && <div className="text-[#F5F5F5]0 text-sm">No expenses logged.</div>}
              </div>
           </div>
        </div>
      </div>
    );
  };


  const Loading = () => (
    <div className="h-64 flex flex-col items-center justify-center text-[#F5F5F5]0 gap-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      Loading tab data...
    </div>
  );

  return (
    <div className="space-y-6 pb-12 max-w-[1600px] mx-auto">
      {/* Header & Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-[#020617] pt-2 pb-4 z-10 border-b border-[#1F1F1F]">
        <div>
          <h1 className="text-3xl font-bold text-[#F5F5F5] tracking-tight flex items-center gap-2">
            Reports
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 bg-[#111111] border border-[#2A2A2A] rounded-lg p-1.5 shadow-sm">
          <select 
            className="bg-[#1A1A1A] border-none text-sm text-[#F5F5F5] outline-none rounded px-2 py-1 cursor-pointer hover:bg-[#2A2A2A] transition-colors focus:ring-1 focus:ring-blue-500/50"
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
            className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-3 py-1 text-sm rounded transition-colors ml-1 font-medium border border-blue-500/20 hover:border-blue-500/40"
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

      {/* Horizontal Tab Bar */}
      <div className="flex overflow-x-auto custom-scrollbar border-b border-[#1F1F1F] pb-px">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap outline-none ${
                isActive 
                  ? 'border-blue-500 text-blue-400 bg-blue-500/5' 
                  : 'border-transparent text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#1A1A1A]/50'
              }`}
            >
              <Icon className="w-4 h-4" />
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
      </div>

    </div>
  );
}

