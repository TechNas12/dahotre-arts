import { CheckCircle2, Clock, XCircle, Package } from "lucide-react";

interface StatusBadgeProps {
  status: string;
  type?: 'order' | 'fulfillment' | 'payment';
}

export function StatusBadge({ status, type = 'order' }: StatusBadgeProps) {
  if (type === 'order') {
    switch (status) {
      case "COMPLETED":
        return <span className="bg-green-500/10 text-green-400 px-2.5 py-1 rounded-full text-xs font-medium border border-green-500/20 inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Completed</span>;
      case "PENDING":
        return <span className="bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-full text-xs font-medium border border-amber-500/20 inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Pending</span>;
      case "CANCELLED":
        return <span className="bg-red-500/10 text-red-400 px-2.5 py-1 rounded-full text-xs font-medium border border-red-500/20 inline-flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> Cancelled</span>;
      default:
        return <span className="bg-[#1A1A1A] text-[#F5F5F5] px-2 py-0.5 rounded text-xs font-medium">{status}</span>;
    }
  }

  if (type === 'fulfillment') {
    switch (status) {
      case "UNFULFILLED":
        return <span className="text-[#737373] text-xs font-medium inline-flex items-center gap-1"><Package className="w-3.5 h-3.5" /> Unfulfilled</span>;
      case "FULFILLED":
        return <span className="text-green-400 text-xs font-medium inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Fulfilled</span>;
      default:
        return <span className="text-[#A3A3A3] text-xs font-medium">{status}</span>;
    }
  }
  
  return <span className="bg-[#1A1A1A] text-[#F5F5F5] px-2 py-0.5 rounded text-xs font-medium">{status}</span>;
}
