"use client";

import { useState } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, LabelList } from "recharts";
import { SkeletonLoader } from "./SkeletonLoader";

type RevenueChartProps = {
  data: { date: string; revenue: number }[];
  loading?: boolean;
  granularity: "day" | "week" | "month";
  onGranularityChange: (val: "day" | "week" | "month") => void;
};

export function RevenueChart({ data, loading, granularity, onGranularityChange }: RevenueChartProps) {
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  const [showAvg, setShowAvg] = useState(false);

  if (loading) {
    return (
      <div className="w-full h-[350px] flex items-center justify-center p-6 bg-slate-900 border border-slate-800 rounded-xl">
        <SkeletonLoader className="w-full h-full" />
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
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm h-full flex flex-col overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-slate-50">Revenue Chart</h2>
          <select 
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 outline-none focus:border-green-500"
            value={granularity}
            onChange={e => onGranularityChange(e.target.value as "day" | "week" | "month")}
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </div>
        <div className="flex items-center gap-4">
          <select 
            className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded px-3 py-1.5 outline-none focus:border-green-500"
            value={chartType}
            onChange={e => setChartType(e.target.value as "bar" | "line")}
          >
            <option value="bar">Bar Chart</option>
            <option value="line">Line Chart</option>
          </select>

          <label className="flex items-center cursor-pointer text-sm text-slate-300 hover:text-slate-100 transition-colors">
            <input 
              type="checkbox" 
              className="mr-2 rounded border-slate-700 text-green-500 focus:ring-green-500 bg-slate-800"
              checked={showAvg}
              onChange={e => setShowAvg(e.target.checked)}
            />
            Show Average Line
          </label>
        </div>
      </div>
      
      <div className="p-4 sm:p-6 flex-1 min-h-[300px]">
        {formattedData.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-slate-500">No data available</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "bar" ? (
              <BarChart data={formattedData} margin={{ top: 20, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="displayDate" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatCurrency} />
                <Tooltip 
                  cursor={{ fill: '#334155', opacity: 0.2 }}
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                  formatter={(value: any) => [formatCurrency(value), "Revenue"]}
                />
                {showAvg && (
                  <ReferenceLine y={avgRevenue} stroke="#f59e0b" strokeDasharray="5 5" label={{ position: 'top', value: `Avg: ${formatCurrency(Math.round(avgRevenue))}`, fill: '#f59e0b', fontSize: 12 }} />
                )}
                <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={50}>
                  <LabelList dataKey="revenue" position="top" formatter={formatCurrency} fill="#94a3b8" fontSize={11} offset={8} />
                </Bar>
              </BarChart>
            ) : (
              <AreaChart data={formattedData} margin={{ top: 20, right: 10, left: 10, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorRevenueLine" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="displayDate" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatCurrency} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                  formatter={(value: any) => [formatCurrency(value), "Revenue"]}
                />
                {showAvg && (
                  <ReferenceLine y={avgRevenue} stroke="#f59e0b" strokeDasharray="5 5" label={{ position: 'top', value: `Avg: ${formatCurrency(Math.round(avgRevenue))}`, fill: '#f59e0b', fontSize: 12 }} />
                )}
                <Area type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenueLine)">
                   <LabelList dataKey="revenue" position="top" formatter={formatCurrency} fill="#94a3b8" fontSize={11} offset={8} />
                </Area>
              </AreaChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
