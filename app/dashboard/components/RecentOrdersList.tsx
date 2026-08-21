"use client";

import Link from "next/link";
import { SkeletonLoader } from "./SkeletonLoader";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { StatusBadge } from "./ui/StatusBadge";

type RecentOrdersListProps = {
  data: { id: number; order_no: string; amount: number; status: string; customer_name: string }[];
  loading?: boolean;
};

export function RecentOrdersList({ data, loading }: RecentOrdersListProps) {
  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  return (
    <div className="ds-card overflow-hidden flex flex-col h-full">
      <div className="p-4 sm:p-5 border-b border-[#222227] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#FAFAFA] tracking-tight">Recent Orders</h2>
            <p className="text-[11px] text-[#71717A]">Latest store transactions</p>
          </div>
        </div>

        <Link 
          href="/dashboard/orders" 
          className="text-xs text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1 transition-all group bg-orange-500/10 hover:bg-orange-500/15 px-3 py-1.5 rounded-xl border border-orange-500/20"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="p-3 sm:p-4 flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="space-y-3 p-2">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonLoader key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-[#71717A] py-6 gap-2">
            <ShoppingBag className="w-8 h-8 opacity-40" />
            <p className="text-sm">No recent orders yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.map((item) => {
              const initials = (item.customer_name || "G")
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();

              return (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-[#18181C] transition-all border border-transparent hover:border-[#222227] cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="w-8 h-8 rounded-xl bg-[#18181C] border border-[#222227] flex items-center justify-center text-xs font-bold text-orange-400 shrink-0 group-hover:border-orange-500/30 transition-colors">
                      {initials}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-mono font-bold text-sm text-[#FAFAFA] group-hover:text-orange-400 transition-colors truncate">
                        {item.order_no}
                      </span>
                      <span className="text-xs text-[#A1A1AA] truncate">
                        {item.customer_name || "Walk-in Guest"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-bold font-mono text-sm text-[#FAFAFA]">
                      {formatCurrency(item.amount)}
                    </span>
                    <StatusBadge status={item.status} type="order" />
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
