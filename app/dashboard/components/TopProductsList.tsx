"use client";

import { SkeletonLoader } from "./SkeletonLoader";

type TopProductsListProps = {
  data: { name: string; revenue: number }[];
  loading?: boolean;
};

export function TopProductsList({ data, loading }: TopProductsListProps) {
  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  return (
    <div className="bg-[#111111] border border-[#1F1F1F] rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-4 sm:p-5 border-b border-[#1F1F1F]">
        <h2 className="text-lg font-bold text-[#F5F5F5]">Top Products</h2>
      </div>
      <div className="p-4 sm:p-5 flex-1">
        {loading ? (
          <div className="space-y-4">
             <SkeletonLoader className="h-6 w-full" />
             <SkeletonLoader className="h-6 w-full" />
             <SkeletonLoader className="h-6 w-full" />
             <SkeletonLoader className="h-6 w-full" />
             <SkeletonLoader className="h-6 w-full" />
          </div>
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[#737373]">No sales data</div>
        ) : (
          <div className="space-y-4">
            {data.map((item, index) => (
              <div key={index} className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-3">
                  <span className={`font-medium w-5 h-5 flex items-center justify-center rounded-full text-xs ${
                    index < 3 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'text-[#737373]'
                  }`}>
                    {index + 1}
                  </span>
                  <span className="text-[#F5F5F5] font-medium truncate max-w-[180px] sm:max-w-[220px] group-hover:text-orange-400 transition-colors" title={item.name}>
                    {item.name}
                  </span>
                </div>
                <span className="text-orange-500 font-bold font-mono whitespace-nowrap">
                  {formatCurrency(item.revenue)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

