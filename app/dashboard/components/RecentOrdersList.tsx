"use client";

import Link from "next/link";
import { SkeletonLoader } from "./SkeletonLoader";
import { ArrowRight } from "lucide-react";

type RecentOrdersListProps = {
  data: { id: number; order_no: string; amount: number; status: string; customer_name: string }[];
  loading?: boolean;
};

export function RecentOrdersList({ data, loading }: RecentOrdersListProps) {
  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'PENDING': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'CANCELLED': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-[#A3A3A3] bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="bg-[#111111] border border-[#1F1F1F] rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-4 sm:p-5 border-b border-[#1F1F1F] flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#F5F5F5]">Recent Orders</h2>
        <Link href="/dashboard/orders" className="text-sm text-orange-500 hover:text-orange-400 flex items-center gap-1 transition-colors">
          View All <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="p-4 sm:p-5 flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="space-y-4">
             <SkeletonLoader className="h-10 w-full" />
             <SkeletonLoader className="h-10 w-full" />
             <SkeletonLoader className="h-10 w-full" />
             <SkeletonLoader className="h-10 w-full" />
             <SkeletonLoader className="h-10 w-full" />
          </div>
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[#737373] py-4">No recent orders</div>
        ) : (
          <div className="space-y-3">
            {data.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-[#1A1A1A] transition-colors border border-transparent hover:border-[#2A2A2A] cursor-pointer">
                <div className="flex flex-col">
                  <span className="font-mono font-bold text-[#F5F5F5]">
                    {item.order_no}
                  </span>
                  <span className="text-xs text-[#A3A3A3] truncate max-w-[150px]">{item.customer_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold font-mono text-[#F5F5F5]">{formatCurrency(item.amount)}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStatusColor(item.status)}`}>
                    {item.status}
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

