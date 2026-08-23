"use client";

import { Bookmark, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";
import { BookingsKpiSummary } from "@/app/actions/bookings";

type BookingsKpiBarProps = {
  kpi: BookingsKpiSummary;
  isPending?: boolean;
};

export function BookingsKpiBar({ kpi, isPending }: BookingsKpiBarProps) {
  const paidPercent = kpi.totalValue > 0 
    ? Math.min(100, Math.round((kpi.totalPaid / kpi.totalValue) * 100))
    : 0;

  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 transition-opacity duration-200 ${isPending ? 'opacity-70' : 'opacity-100'}`}>
      
      {/* Card 1: Active Bookings */}
      <div className="bg-[#121215] border border-[#222227] hover:border-[#2E2E36] rounded-2xl p-3 sm:p-4 transition-all shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-xs font-semibold text-[#71717A] uppercase tracking-wider">Bookings</span>
          <div className="p-1.5 sm:p-2 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-400">
            <Bookmark className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline justify-between gap-1 flex-wrap">
          <span className="text-xl sm:text-2xl font-bold font-mono text-[#FAFAFA]">{kpi.totalBookings}</span>
          <div className="flex items-center gap-1 text-[10px]">
            <span className="text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md font-medium">{kpi.pendingCount} Pend</span>
          </div>
        </div>
      </div>

      {/* Card 2: Total Value */}
      <div className="bg-[#121215] border border-[#222227] hover:border-[#2E2E36] rounded-2xl p-3 sm:p-4 transition-all shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-xs font-semibold text-[#71717A] uppercase tracking-wider">Total Value</span>
          <div className="p-1.5 sm:p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline justify-between gap-1">
          <span className="text-lg sm:text-2xl font-bold font-mono text-[#FAFAFA]">
            ₹{kpi.totalValue.toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      {/* Card 3: Amount Paid */}
      <div className="bg-[#121215] border border-[#222227] hover:border-[#2E2E36] rounded-2xl p-3 sm:p-4 transition-all shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-xs font-semibold text-[#71717A] uppercase tracking-wider">Collected</span>
          <div className="p-1.5 sm:p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-lg sm:text-2xl font-bold font-mono text-emerald-400">
              ₹{kpi.totalPaid.toLocaleString("en-IN")}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-emerald-400 font-mono">{paidPercent}%</span>
          </div>
          <div className="w-full bg-[#18181C] h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full transition-all duration-500" 
              style={{ width: `${paidPercent}%` }} 
            />
          </div>
        </div>
      </div>

      {/* Card 4: Due Amount */}
      <div className={`border rounded-2xl p-3 sm:p-4 transition-all shadow-sm flex flex-col justify-between ${kpi.totalDue > 0 ? 'bg-amber-500/[0.04] border-amber-500/30' : 'bg-[#121215] border-[#222227] hover:border-[#2E2E36]'}`}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-xs font-semibold text-[#71717A] uppercase tracking-wider">Dues Pending</span>
          <div className={`p-1.5 sm:p-2 rounded-xl ${kpi.totalDue > 0 ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-[#18181C] text-[#71717A]'}`}>
            <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline justify-between gap-1">
          <span className={`text-lg sm:text-2xl font-bold font-mono ${kpi.totalDue > 0 ? 'text-amber-400' : 'text-[#FAFAFA]'}`}>
            ₹{kpi.totalDue.toLocaleString("en-IN")}
          </span>
        </div>
      </div>

    </div>
  );
}
