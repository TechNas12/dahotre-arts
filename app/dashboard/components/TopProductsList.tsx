"use client";

import { SkeletonLoader } from "./SkeletonLoader";
import { Award, Package } from "lucide-react";

type TopProductsListProps = {
  data: { name: string; revenue: number }[];
  loading?: boolean;
};

export function TopProductsList({ data, loading }: TopProductsListProps) {
  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;
  const maxRevenue = data.length > 0 ? Math.max(...data.map(d => d.revenue), 1) : 1;

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]";
      case 1:
        return "bg-slate-300/20 text-slate-200 border-slate-300/40";
      case 2:
        return "bg-amber-700/20 text-amber-400 border-amber-700/40";
      default:
        return "bg-[#18181C] text-[#71717A] border-[#222227]";
    }
  };

  return (
    <div className="ds-card overflow-hidden flex flex-col h-full">
      <div className="p-4 sm:p-5 border-b border-[#222227] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#FAFAFA] tracking-tight">Top Products</h2>
            <p className="text-[11px] text-[#71717A]">Highest grossing items</p>
          </div>
        </div>
      </div>
      
      <div className="p-4 sm:p-5 flex-1">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <SkeletonLoader className="h-5 w-40 rounded" />
                <SkeletonLoader className="h-5 w-20 rounded" />
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-[#71717A] gap-2">
            <Package className="w-8 h-8 opacity-40" />
            <p className="text-sm">No product sales yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((item, index) => {
              const share = Math.round((item.revenue / maxRevenue) * 100);
              return (
                <div key={index} className="flex flex-col gap-1.5 group cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span className={`w-5 h-5 flex items-center justify-center rounded-lg text-xs font-bold border shrink-0 ${getRankBadge(index)}`}>
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium text-[#FAFAFA] truncate group-hover:text-orange-400 transition-colors" title={item.name}>
                        {item.name}
                      </span>
                    </div>
                    <span className="text-sm font-bold font-mono text-orange-400 shrink-0">
                      {formatCurrency(item.revenue)}
                    </span>
                  </div>

                  {/* Visual Share Bar */}
                  <div className="w-full bg-[#18181C] h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-orange-500 to-amber-400 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${share}%` }}
                    />
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
