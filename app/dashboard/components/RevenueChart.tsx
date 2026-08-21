"use client";

import { useState } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, LabelList } from "recharts";
import { SkeletonLoader } from "./SkeletonLoader";
import { BarChart3, TrendingUp } from "lucide-react";

type RevenueChartProps = {
  data: { date: string; revenue: number }[];
  loading?: boolean;
  granularity: "day" | "week" | "month";
  onGranularityChange: (val: "day" | "week" | "month") => void;
};

export function RevenueChart({ data, loading, granularity, onGranularityChange }: RevenueChartProps) {
  const [chartType, setChartType] = useState<"area" | "bar">("area");
  const [showAvg, setShowAvg] = useState(false);

  if (loading) {
    return (
      <div className="w-full h-[380px] flex items-center justify-center p-6 ds-card">
        <SkeletonLoader className="w-full h-full rounded-xl" />
      </div>
    );
  }

  const formatCurrency = (val: any) => `₹${(Number(val) || 0).toLocaleString('en-IN')}`;

  const avgRevenue = data.length > 0 
    ? data.reduce((sum, item) => sum + item.revenue, 0) / data.length 
    : 0;

  // Format date for X Axis
  const formattedData = data.map(d => {
    const dateObj = new Date(d.date);
    return {
      ...d,
      displayDate: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
  });

  return (
    <div className="ds-card overflow-hidden flex flex-col h-full">
      {/* Chart Header & Controls */}
      <div className="p-4 sm:p-5 border-b border-[#222227] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#FAFAFA] tracking-tight">Revenue Trends</h2>
            <p className="text-[11px] text-[#71717A]">Financial cashflow & sales volume</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Granularity Selector */}
          <div className="flex items-center bg-[#18181C] p-1 rounded-xl border border-[#222227] text-xs">
            {(["day", "week", "month"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => onGranularityChange(g)}
                className={`px-2.5 py-1 rounded-lg font-semibold capitalize transition-all cursor-pointer ${
                  granularity === g
                    ? "bg-orange-500 text-white shadow-sm"
                    : "text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#222227]"
                }`}
              >
                {g === "day" ? "Daily" : g === "week" ? "Weekly" : "Monthly"}
              </button>
            ))}
          </div>

          {/* Chart Type Toggle */}
          <div className="flex items-center bg-[#18181C] p-1 rounded-xl border border-[#222227] text-xs">
            <button
              type="button"
              onClick={() => setChartType("area")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                chartType === "area"
                  ? "bg-[#2E2E36] text-orange-400 shadow-sm"
                  : "text-[#A1A1AA] hover:text-[#FAFAFA]"
              }`}
            >
              Area
            </button>
            <button
              type="button"
              onClick={() => setChartType("bar")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                chartType === "bar"
                  ? "bg-[#2E2E36] text-orange-400 shadow-sm"
                  : "text-[#A1A1AA] hover:text-[#FAFAFA]"
              }`}
            >
              Bar
            </button>
          </div>

          {/* Show Average Toggle */}
          <label className="flex items-center gap-2 cursor-pointer text-xs text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors ml-1 bg-[#18181C] px-2.5 py-1.5 rounded-xl border border-[#222227]">
            <input 
              type="checkbox" 
              className="rounded border-[#2E2E36] text-orange-500 focus:ring-orange-500 bg-[#121215] cursor-pointer"
              checked={showAvg}
              onChange={e => setShowAvg(e.target.checked)}
            />
            <span>Avg Line</span>
          </label>
        </div>
      </div>
      
      {/* Chart Canvas */}
      <div className="p-4 sm:p-6 flex-1 min-h-[300px] w-full">
        {formattedData.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-[#71717A] py-12 gap-2">
            <BarChart3 className="w-8 h-8 opacity-40" />
            <p className="text-sm">No sales data found for the selected period</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "bar" ? (
              <BarChart data={formattedData} margin={{ top: 20, right: 10, left: 10, bottom: 10 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F97316" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#EA580C" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#222227" vertical={false} />
                <XAxis 
                  dataKey="displayDate" 
                  stroke="#71717A" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={10} 
                  fontFamily="'Fira Code', monospace" 
                />
                <YAxis 
                  stroke="#71717A" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={formatCurrency} 
                  fontFamily="'Fira Code', monospace" 
                />
                <Tooltip 
                  cursor={{ fill: '#18181C', opacity: 0.6 }}
                  contentStyle={{ 
                    backgroundColor: 'rgba(18, 18, 21, 0.9)', 
                    backdropFilter: 'blur(16px)', 
                    WebkitBackdropFilter: 'blur(16px)', 
                    borderColor: '#2E2E36', 
                    borderRadius: '12px', 
                    color: '#FAFAFA', 
                    fontFamily: "'Fira Code', monospace", 
                    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)' 
                  }}
                  formatter={(value: any) => [formatCurrency(value), "Revenue"]}
                />
                {showAvg && (
                  <ReferenceLine 
                    y={avgRevenue} 
                    stroke="#F59E0B" 
                    strokeDasharray="4 4" 
                    label={{ 
                      position: 'top', 
                      value: `Avg: ${formatCurrency(Math.round(avgRevenue))}`, 
                      fill: '#F59E0B', 
                      fontSize: 11, 
                      fontFamily: "'Fira Code', monospace" 
                    }} 
                  />
                )}
                <Bar dataKey="revenue" fill="url(#barGradient)" radius={[6, 6, 0, 0]} maxBarSize={44}>
                  <LabelList dataKey="revenue" position="top" formatter={formatCurrency} fill="#A1A1AA" fontSize={10} offset={8} fontFamily="'Fira Code', monospace" />
                </Bar>
              </BarChart>
            ) : (
              <AreaChart data={formattedData} margin={{ top: 20, right: 10, left: 10, bottom: 10 }}>
                <defs>
                  <linearGradient id="colorRevenueArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#222227" vertical={false} />
                <XAxis 
                  dataKey="displayDate" 
                  stroke="#71717A" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={10} 
                  fontFamily="'Fira Code', monospace" 
                />
                <YAxis 
                  stroke="#71717A" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={formatCurrency} 
                  fontFamily="'Fira Code', monospace" 
                />
                <Tooltip 
                  cursor={{ stroke: '#F97316', strokeWidth: 1, strokeDasharray: '4 4' }}
                  contentStyle={{ 
                    backgroundColor: 'rgba(18, 18, 21, 0.9)', 
                    backdropFilter: 'blur(16px)', 
                    WebkitBackdropFilter: 'blur(16px)', 
                    borderColor: '#2E2E36', 
                    borderRadius: '12px', 
                    color: '#FAFAFA', 
                    fontFamily: "'Fira Code', monospace", 
                    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)' 
                  }}
                  formatter={(value: any) => [formatCurrency(value), "Revenue"]}
                />
                {showAvg && (
                  <ReferenceLine 
                    y={avgRevenue} 
                    stroke="#F59E0B" 
                    strokeDasharray="4 4" 
                    label={{ 
                      position: 'top', 
                      value: `Avg: ${formatCurrency(Math.round(avgRevenue))}`, 
                      fill: '#F59E0B', 
                      fontSize: 11, 
                      fontFamily: "'Fira Code', monospace" 
                    }} 
                  />
                )}
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#F97316" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#colorRevenueArea)" 
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
