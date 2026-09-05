"use client";

import { useState } from "react";
import { CheckCircle2, FileDown, Copy, Check, ArrowRight, Loader2 } from "lucide-react";
import { getOrderDetails } from "@/app/actions/orders";
import { generateBillPdf } from "@/lib/generateBillPdf";

type POSSuccessModalProps = {
  isOpen: boolean;
  orderNo: string;
  orderId: number | null;
  totalAmount: number;
  customerName: string;
  onClose: () => void;
};

export default function POSSuccessModal({
  isOpen,
  orderNo,
  orderId,
  totalAmount,
  customerName,
  onClose,
}: POSSuccessModalProps) {
  const [isGeneratingBill, setIsGeneratingBill] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleDownloadBill = async () => {
    if (!orderId) return;
    setIsGeneratingBill(true);
    try {
      const fullOrder = await getOrderDetails(orderId);
      if (fullOrder) {
        await generateBillPdf(fullOrder);
      }
    } catch (err) {
      console.error("Error generating invoice PDF:", err);
    } finally {
      setIsGeneratingBill(false);
    }
  };

  const handleCopyOrderNo = () => {
    if (orderNo) {
      navigator.clipboard.writeText(orderNo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-[#121215] border border-green-500/30 rounded-3xl shadow-[0_0_50px_rgba(34,197,94,0.15)] w-full max-w-sm overflow-hidden flex flex-col items-center p-6 text-center">
        {/* Celebration Icon */}
        <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mb-4 text-green-400 shadow-[0_0_24px_rgba(34,197,94,0.25)] animate-[scaleIn_0.2s_ease-out]">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <h3 className="text-xl font-bold text-[#FAFAFA] mb-1">Sale Completed!</h3>
        <p className="text-xs text-[#A1A1AA] mb-4">
          Order registered for <span className="text-[#FAFAFA] font-bold">{customerName}</span>
        </p>

        {/* Order Number Box */}
        <div className="w-full bg-[#18181C] border border-[#26262E] rounded-2xl p-3 mb-4 flex items-center justify-between">
          <div className="text-left">
            <span className="text-[10px] uppercase font-bold text-[#71717A] tracking-wider block">
              Order Number
            </span>
            <span className="text-sm font-bold font-mono text-orange-400">{orderNo}</span>
          </div>

          <button
            type="button"
            onClick={handleCopyOrderNo}
            className="p-2 bg-[#222228] hover:bg-[#2C2C34] text-[#A1A1AA] hover:text-[#FAFAFA] rounded-xl transition-colors cursor-pointer"
            title="Copy order number"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Amount Paid Box */}
        <div className="w-full bg-[#18181C] border border-[#26262E] rounded-2xl p-3 mb-6 flex items-center justify-between">
          <span className="text-xs font-semibold text-[#A1A1AA]">Amount Received</span>
          <span className="text-base font-bold text-[#FAFAFA] font-mono">
            ₹{totalAmount.toLocaleString("en-IN")}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-2.5">
          <button
            type="button"
            onClick={handleDownloadBill}
            disabled={isGeneratingBill || !orderId}
            className="w-full py-3 bg-[#1E1E24] hover:bg-[#282830] text-[#FAFAFA] hover:text-orange-400 border border-[#2E2E38] rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
          >
            {isGeneratingBill ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Invoice PDF...</span>
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4 text-orange-400" />
                <span>Print / Download Invoice</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-bold text-sm rounded-xl shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <span>Start Next Sale</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
