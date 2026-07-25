"use client";

import { SkeletonLoader } from "./SkeletonLoader";

type TopProductsListProps = {
  data: { name: string; revenue: number }[];
  loading?: boolean;
};

export function TopProductsList({ data, loading }: TopProductsListProps) {
  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-4 sm:p-5 border-b border-slate-800">
        <h2 className="text-lg font-bold text-slate-50">Top Products</h2>
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
          <div className="h-full flex items-center justify-center text-slate-500">No sales data</div>
        ) : (
          <div className="space-y-4">
            {data.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 font-medium w-4">{index + 1}.</span>
                  <span className="text-slate-200 font-medium truncate max-w-[180px] sm:max-w-[220px]" title={item.name}>
                    {item.name}
                  </span>
                </div>
                <span className="text-green-400 font-bold whitespace-nowrap">
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
