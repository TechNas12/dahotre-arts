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
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-50">Less Stock Products</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Threshold:</span>
          <select 
            className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded px-2 py-1 outline-none focus:border-red-500"
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
          <div className="h-full flex items-center justify-center text-slate-500 py-4">All products are well stocked</div>
        ) : (
          <div className="space-y-3">
            {data.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-800">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="flex flex-col">
                    <span className="text-slate-200 font-medium truncate" title={item.name}>
                      <span className="text-slate-400 mr-2">[{item.code}]</span>{item.name}
                    </span>
                    <span className="text-xs text-slate-500">{item.category}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pl-4">
                  <span className="text-xs text-slate-400 uppercase tracking-wider">Stock:</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-sm ${item.stock_qty === 0 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
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
