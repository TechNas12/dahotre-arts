"use client";

import { SkeletonLoader } from "./SkeletonLoader";

type LowStockListProps = {
  data: { id: number; code: string; name: string; category: string; stock_qty: number }[];
  loading?: boolean;
  threshold: number;
  onThresholdChange: (val: number) => void;
};

export function LowStockList({ data, loading, threshold, onThresholdChange }: LowStockListProps) {
  return (
    <div className="bg-[#111111] border border-[#1F1F1F] rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-4 sm:p-5 border-b border-[#1F1F1F] flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#F5F5F5]">Less Stock Products</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#A3A3A3]">Threshold:</span>
          <select 
            className="bg-[#1A1A1A] border border-[#1F1F1F] text-[#F5F5F5] text-sm rounded px-2 py-1 outline-none focus:border-orange-500 cursor-pointer"
            value={threshold}
            onChange={(e) => onThresholdChange(Number(e.target.value))}
          >
            {[0, 1, 2, 3, 5, 10].map(val => (
              <option key={val} value={val}>{val}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="p-4 sm:p-5 flex-1 max-h-[300px] overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="space-y-4">
             <SkeletonLoader className="h-6 w-full" />
             <SkeletonLoader className="h-6 w-full" />
             <SkeletonLoader className="h-6 w-full" />
          </div>
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[#737373] py-4">All products are well stocked</div>
        ) : (
          <div className="space-y-3">
            {data.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-[#1A1A1A] transition-colors border border-transparent hover:border-[#2A2A2A] cursor-pointer group">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="flex flex-col">
                    <span className="text-[#F5F5F5] font-medium truncate group-hover:text-orange-400 transition-colors" title={item.name}>
                      <span className="text-[#A3A3A3] mr-2 font-mono">[{item.code}]</span>{item.name}
                    </span>
                    <span className="text-xs text-[#737373]">{item.category}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pl-4">
                  <span className="text-xs text-[#A3A3A3] uppercase tracking-wider">Stock:</span>
                  <span className={`font-bold font-mono px-2 py-0.5 rounded text-sm ${item.stock_qty === 0 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                    {item.stock_qty}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

