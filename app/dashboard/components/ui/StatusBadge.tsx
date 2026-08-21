import { CheckCircle2, Clock, XCircle, Package, AlertCircle, RefreshCw } from "lucide-react";

interface StatusBadgeProps {
  status: string;
  type?: 'order' | 'fulfillment' | 'payment';
  className?: string;
}

export function StatusBadge({ status, type = 'order', className = '' }: StatusBadgeProps) {
  const normStatus = (status || '').toUpperCase();

  if (type === 'order') {
    switch (normStatus) {
      case "COMPLETED":
        return (
          <span className={`bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full text-xs font-medium border border-emerald-500/20 inline-flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.08)] ${className}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
          </span>
        );
      case "PENDING":
        return (
          <span className={`bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-full text-xs font-medium border border-amber-500/20 inline-flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.08)] ${className}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <Clock className="w-3.5 h-3.5" /> Pending
          </span>
        );
      case "CANCELLED":
        return (
          <span className={`bg-rose-500/10 text-rose-400 px-2.5 py-1 rounded-full text-xs font-medium border border-rose-500/20 inline-flex items-center gap-1.5 ${className}`}>
            <XCircle className="w-3.5 h-3.5" /> Cancelled
          </span>
        );
      case "PARTIAL":
        return (
          <span className={`bg-sky-500/10 text-sky-400 px-2.5 py-1 rounded-full text-xs font-medium border border-sky-500/20 inline-flex items-center gap-1.5 ${className}`}>
            <RefreshCw className="w-3.5 h-3.5" /> Partial
          </span>
        );
      default:
        return <span className={`bg-[#18181C] text-[#A1A1AA] border border-[#222227] px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${className}`}>{status}</span>;
    }
  }

  if (type === 'fulfillment') {
    switch (normStatus) {
      case "UNFULFILLED":
        return (
          <span className={`bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1.5 ${className}`}>
            <Package className="w-3.5 h-3.5" /> Unfulfilled
          </span>
        );
      case "FULFILLED":
        return (
          <span className={`bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1.5 ${className}`}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Fulfilled
          </span>
        );
      case "PARTIAL":
        return (
          <span className={`bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1.5 ${className}`}>
            <Clock className="w-3.5 h-3.5" /> Partially Fulfilled
          </span>
        );
      default:
        return <span className={`text-[#A1A1AA] text-xs font-medium ${className}`}>{status}</span>;
    }
  }

  if (type === 'payment') {
    switch (normStatus) {
      case "PAID":
      case "FULL":
        return (
          <span className={`bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5 ${className}`}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Fully Paid
          </span>
        );
      case "ADVANCE":
      case "PARTIAL":
        return (
          <span className={`bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2.5 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5 ${className}`}>
            <Clock className="w-3.5 h-3.5" /> Advance Paid
          </span>
        );
      case "UNPAID":
      case "DUE":
        return (
          <span className={`bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5 ${className}`}>
            <AlertCircle className="w-3.5 h-3.5" /> Unpaid
          </span>
        );
      default:
        return <span className={`bg-[#18181C] text-[#A1A1AA] px-2 py-0.5 rounded text-xs font-medium ${className}`}>{status}</span>;
    }
  }
  
  return <span className={`bg-[#18181C] text-[#FAFAFA] border border-[#222227] px-2.5 py-1 rounded-full text-xs font-medium ${className}`}>{status}</span>;
}
