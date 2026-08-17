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
      <div className="w-full h-[350px] flex items-center justify-center p-6 bg-[#111111] border border-[#1F1F1F] rounded-xl">
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
    <div className="bg-[#111111] border border-[#1F1F1F] rounded-xl shadow-sm h-full flex flex-col overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-[#1F1F1F] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-[#F5F5F5]">Revenue Chart</h2>
          <select 
            className="bg-[#1A1A1A] border border-[#1F1F1F] text-[#F5F5F5] text-xs rounded px-2 py-1 outline-none focus:border-orange-500 cursor-pointer"
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
            className="bg-[#1A1A1A] border border-[#1F1F1F] text-[#F5F5F5] text-sm rounded px-3 py-1.5 outline-none focus:border-orange-500 cursor-pointer"
            value={chartType}
            onChange={e => setChartType(e.target.value as "bar" | "line")}
          >
            <option value="bar">Bar Chart</option>
            <option value="line">Line Chart</option>
          </select>

          <label className="flex items-center cursor-pointer text-sm text-[#A3A3A3] hover:text-[#F5F5F5] transition-colors">
            <input 
              type="checkbox" 
              className="mr-2 rounded border-[#1F1F1F] text-orange-500 focus:ring-orange-500 bg-[#1A1A1A]"
              checked={showAvg}
              onChange={e => setShowAvg(e.target.checked)}
            />
            Show Average Line
          </label>
        </div>
      </div>
      
      <div className="p-4 sm:p-6 flex-1 min-h-[300px]">
        {formattedData.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-[#737373]">No data available</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "bar" ? (
              <BarChart data={formattedData} margin={{ top: 20, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" vertical={false} />
                <XAxis dataKey="displayDate" stroke="#737373" fontSize={12} tickLine={false} axisLine={false} dy={10} fontFamily="'Fira Code', monospace" />
                <YAxis stroke="#737373" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatCurrency} fontFamily="'Fira Code', monospace" />
                <Tooltip 
                  cursor={{ fill: '#1A1A1A', opacity: 0.5 }}
                  contentStyle={{ backgroundColor: 'rgba(17, 17, 17, 0.7)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderColor: '#2A2A2A', borderRadius: '8px', color: '#F5F5F5', fontFamily: "'Fira Code', monospace", boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)' }}
                  formatter={(value: any) => [formatCurrency(value), "Revenue"]}
                />
                {showAvg && (
                  <ReferenceLine y={avgRevenue} stroke="#F59E0B" strokeDasharray="5 5" label={{ position: 'top', value: `Avg: ${formatCurrency(Math.round(avgRevenue))}`, fill: '#F59E0B', fontSize: 12, fontFamily: "'Fira Code', monospace" }} />
                )}
                <Bar dataKey="revenue" fill="#F97316" radius={[4, 4, 0, 0]} maxBarSize={50}>
                  <LabelList dataKey="revenue" position="top" formatter={formatCurrency} fill="#A3A3A3" fontSize={11} offset={8} fontFamily="'Fira Code', monospace" />
                </Bar>
              </BarChart>
            ) : (
              <AreaChart data={formattedData} margin={{ top: 20, right: 10, left: 10, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorRevenueLine" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" vertical={false} />
                <XAxis dataKey="displayDate" stroke="#737373" fontSize={12} tickLine={false} axisLine={false} dy={10} fontFamily="'Fira Code', monospace" />
                <YAxis stroke="#737373" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatCurrency} fontFamily="'Fira Code', monospace" />
                <Tooltip 
                  cursor={{ fill: '#1A1A1A', opacity: 0.5 }}
                  contentStyle={{ backgroundColor: 'rgba(17, 17, 17, 0.7)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderColor: '#2A2A2A', borderRadius: '8px', color: '#F5F5F5', fontFamily: "'Fira Code', monospace", boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)' }}
                  formatter={(value: any) => [formatCurrency(value), "Revenue"]}
                />
                {showAvg && (
                  <ReferenceLine y={avgRevenue} stroke="#F59E0B" strokeDasharray="5 5" label={{ position: 'top', value: `Avg: ${formatCurrency(Math.round(avgRevenue))}`, fill: '#F59E0B', fontSize: 12, fontFamily: "'Fira Code', monospace" }} />
                )}
                <Area type="monotone" dataKey="revenue" stroke="#F97316" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenueLine)">
                   <LabelList dataKey="revenue" position="top" formatter={formatCurrency} fill="#A3A3A3" fontSize={11} offset={8} fontFamily="'Fira Code', monospace" />
                </Area>
              </AreaChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

