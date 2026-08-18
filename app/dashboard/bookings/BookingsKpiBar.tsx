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
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 transition-opacity duration-200 ${isPending ? 'opacity-70' : 'opacity-100'}`}>
      
      {/* Card 1: Active Bookings */}
      <div className="bg-[#111111] border border-[#1F1F1F] hover:border-[#2A2A2A] rounded-xl p-4 transition-all shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#737373] uppercase tracking-wider">Active Bookings</span>
          <div className="p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg text-orange-400">
            <Bookmark className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-2xl font-bold font-mono text-[#F5F5F5]">{kpi.totalBookings}</span>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-medium">{kpi.pendingCount} Pending</span>
            {kpi.cancelledCount > 0 && (
              <span className="text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded font-medium">{kpi.cancelledCount} Cancelled</span>
            )}
          </div>
        </div>
      </div>

      {/* Card 2: Total Value */}
      <div className="bg-[#111111] border border-[#1F1F1F] hover:border-[#2A2A2A] rounded-xl p-4 transition-all shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#737373] uppercase tracking-wider">Total Booking Value</span>
          <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-2xl font-bold font-mono text-[#F5F5F5]">
            ₹{kpi.totalValue.toLocaleString("en-IN")}
          </span>
          <span className="text-[10px] text-[#A3A3A3] font-medium">Gross Total</span>
        </div>
      </div>

      {/* Card 3: Amount Paid */}
      <div className="bg-[#111111] border border-[#1F1F1F] hover:border-[#2A2A2A] rounded-xl p-4 transition-all shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#737373] uppercase tracking-wider">Amount Collected</span>
          <div className="p-2 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-green-400">
              ₹{kpi.totalPaid.toLocaleString("en-IN")}
            </span>
            <span className="text-xs font-bold text-green-400 font-mono">{paidPercent}%</span>
          </div>
          <div className="w-full bg-[#1F1F1F] h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-green-500 h-full transition-all duration-500" 
              style={{ width: `${paidPercent}%` }} 
            />
          </div>
        </div>
      </div>

      {/* Card 4: Due Amount */}
      <div className={`bg-[#111111] border rounded-xl p-4 transition-all shadow-sm ${kpi.totalDue > 0 ? 'border-amber-500/30 bg-amber-500/[0.02]' : 'border-[#1F1F1F] hover:border-[#2A2A2A]'}`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#737373] uppercase tracking-wider">Total Dues Pending</span>
          <div className={`p-2 rounded-lg ${kpi.totalDue > 0 ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-[#1A1A1A] text-[#737373]'}`}>
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className={`text-2xl font-bold font-mono ${kpi.totalDue > 0 ? 'text-amber-400' : 'text-[#F5F5F5]'}`}>
            ₹{kpi.totalDue.toLocaleString("en-IN")}
          </span>
          {kpi.totalDue > 0 && (
            <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
              Collect Balance
            </span>
          )}
        </div>
      </div>

    </div>
  );
}
