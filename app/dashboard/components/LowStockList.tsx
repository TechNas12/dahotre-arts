"use client";

import { SkeletonLoader } from "./SkeletonLoader";
import { AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";

type LowStockListProps = {
  data: { id: number; code: string; name: string; category: string; stock_qty: number }[];
  loading?: boolean;
  threshold: number;
  onThresholdChange: (val: number) => void;
};

export function LowStockList({ data, loading, threshold, onThresholdChange }: LowStockListProps) {
  return (
    <div className="ds-card overflow-hidden flex flex-col h-full">
      <div className="p-4 sm:p-5 border-b border-[#222227] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#FAFAFA] tracking-tight">Low Stock Alert</h2>
            <p className="text-[11px] text-[#71717A]">Items below threshold</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#71717A] hidden sm:inline font-medium">Limit:</span>
          <select 
            className="bg-[#18181C] border border-[#222227] text-[#FAFAFA] text-xs font-semibold rounded-xl px-2.5 py-1 outline-none focus:border-orange-500 cursor-pointer"
            value={threshold}
            onChange={(e) => onThresholdChange(Number(e.target.value))}
            aria-label="Stock threshold filter"
          >
            {[0, 1, 2, 3, 5, 10].map(val => (
              <option key={val} value={val}>≤ {val} units</option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-3 sm:p-4 flex-1 max-h-[320px] overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="space-y-3 p-2">
            <SkeletonLoader className="h-10 w-full rounded-xl" />
            <SkeletonLoader className="h-10 w-full rounded-xl" />
            <SkeletonLoader className="h-10 w-full rounded-xl" />
          </div>
        ) : data.length === 0 ? (
          <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-[#71717A] py-6 gap-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400/60" />
            <p className="text-sm font-medium text-emerald-400/90">All products are healthy & stocked</p>
            <p className="text-xs text-[#71717A]">No inventory below {threshold} units</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.map((item) => {
              const isZero = item.stock_qty === 0;
              return (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#18181C] transition-all border border-transparent hover:border-[#222227] cursor-pointer group"
                >
                  <div className="flex items-center gap-3 overflow-hidden min-w-0 pr-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                      isZero 
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    }`}>
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-[#FAFAFA] truncate group-hover:text-orange-400 transition-colors" title={item.name}>
                        {item.name}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-[#71717A]">
                        <span className="font-mono bg-[#18181C] px-1.5 py-0.5 rounded text-[10px] text-[#A1A1AA] border border-[#222227]">
                          {item.code}
                        </span>
                        <span className="truncate">{item.category}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 pl-2">
                    <span className={`font-bold font-mono px-2.5 py-1 rounded-xl text-xs border ${
                      isZero 
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_8px_rgba(239,68,68,0.2)]' 
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {isZero ? "OUT OF STOCK" : `${item.stock_qty} left`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
