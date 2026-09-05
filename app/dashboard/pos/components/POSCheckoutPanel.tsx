"use client";

import { useState } from "react";
import {
  Banknote,
  CreditCard,
  StickyNote,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { SaleType, OrderType, PaymentMode, PaymentType } from "../types";

type POSCheckoutPanelProps = {
  saleType: SaleType;
  onSaleTypeChange: (val: SaleType) => void;
  orderType: OrderType;
  onOrderTypeChange: (val: OrderType) => void;
  paymentMode: PaymentMode;
  onPaymentModeChange: (val: PaymentMode) => void;
  paymentType: PaymentType;
  onPaymentTypeChange: (val: PaymentType) => void;
  advanceAmountStr: string;
  onAdvanceAmountChange: (val: string) => void;
  orderNotes: string;
  onOrderNotesChange: (val: string) => void;
  subtotal: number;
  totalDiscount: number;
  isSubmitting: boolean;
  onSubmitOrder: () => void;
  cartEmpty: boolean;
  errorMsg?: string;
};

export default function POSCheckoutPanel({
  saleType,
  onSaleTypeChange,
  orderType,
  onOrderTypeChange,
  paymentMode,
  onPaymentModeChange,
  paymentType,
  onPaymentTypeChange,
  advanceAmountStr,
  onAdvanceAmountChange,
  orderNotes,
  onOrderNotesChange,
  subtotal,
  totalDiscount,
  isSubmitting,
  onSubmitOrder,
  cartEmpty,
  errorMsg,
}: POSCheckoutPanelProps) {
  const [showNotes, setShowNotes] = useState(Boolean(orderNotes));

  const actualPaymentType = orderType === "PURCHASE" ? "FULL" : paymentType;
  const advanceNum = parseFloat(advanceAmountStr) || 0;
  const balanceDue = Math.max(0, subtotal - advanceNum);

  const applyAdvancePreset = (pct: number) => {
    const calculated = Math.round((subtotal * pct) / 100);
    onAdvanceAmountChange(calculated.toString());
  };

  return (
    <div className="p-3.5 sm:p-4 bg-[#121215] border-t border-[#222227] space-y-3 shrink-0 rounded-b-2xl shadow-[0_-8px_25px_rgba(0,0,0,0.5)]">
      {/* Segmented Controls Row 1: Sale Type + Order Type */}
      <div className="grid grid-cols-2 gap-2">
        {/* Retail vs Wholesale */}
        <div className="flex bg-[#18181C] p-0.5 rounded-xl border border-[#26262E]">
          <button
            type="button"
            onClick={() => onSaleTypeChange("RETAIL")}
            className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              saleType === "RETAIL"
                ? "bg-[#24242C] text-orange-400 shadow-sm"
                : "text-[#71717A] hover:text-[#FAFAFA]"
            }`}
          >
            Retail
          </button>
          <button
            type="button"
            onClick={() => onSaleTypeChange("WHOLESALE")}
            className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              saleType === "WHOLESALE"
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-sm"
                : "text-[#71717A] hover:text-[#FAFAFA]"
            }`}
          >
            Wholesale
          </button>
        </div>

        {/* Purchase vs Booking */}
        <div className="flex bg-[#18181C] p-0.5 rounded-xl border border-[#26262E]">
          <button
            type="button"
            onClick={() => onOrderTypeChange("PURCHASE")}
            className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              orderType === "PURCHASE"
                ? "bg-[#24242C] text-[#FAFAFA] shadow-sm"
                : "text-[#71717A] hover:text-[#FAFAFA]"
            }`}
          >
            Purchase
          </button>
          <button
            type="button"
            onClick={() => onOrderTypeChange("BOOKING")}
            className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              orderType === "BOOKING"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-sm"
                : "text-[#71717A] hover:text-[#FAFAFA]"
            }`}
          >
            Booking
          </button>
        </div>
      </div>

      {/* Segmented Controls Row 2: Payment Mode + Booking Payment Options */}
      <div className="flex items-center gap-2">
        {/* Cash vs Online */}
        <div className="flex bg-[#18181C] p-0.5 rounded-xl border border-[#26262E] flex-1">
          <button
            type="button"
            onClick={() => onPaymentModeChange("CASH")}
            className={`flex-1 py-1 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              paymentMode === "CASH"
                ? "bg-[#24242C] text-green-400 font-bold shadow-sm"
                : "text-[#71717A] hover:text-[#FAFAFA]"
            }`}
          >
            <Banknote className="w-3.5 h-3.5" />
            <span>Cash</span>
          </button>
          <button
            type="button"
            onClick={() => onPaymentModeChange("ONLINE")}
            className={`flex-1 py-1 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              paymentMode === "ONLINE"
                ? "bg-[#24242C] text-blue-400 font-bold shadow-sm"
                : "text-[#71717A] hover:text-[#FAFAFA]"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Online / UPI</span>
          </button>
        </div>

        {/* If Booking: Full vs Advance */}
        {orderType === "BOOKING" && (
          <div className="flex bg-[#18181C] p-0.5 rounded-xl border border-[#26262E] flex-1">
            <button
              type="button"
              onClick={() => onPaymentTypeChange("FULL")}
              className={`flex-1 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                paymentType === "FULL"
                  ? "bg-[#24242C] text-[#FAFAFA] font-bold shadow-sm"
                  : "text-[#71717A] hover:text-[#FAFAFA]"
              }`}
            >
              Full
            </button>
            <button
              type="button"
              onClick={() => onPaymentTypeChange("ADVANCE")}
              className={`flex-1 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                paymentType === "ADVANCE"
                  ? "bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30 shadow-sm"
                  : "text-[#71717A] hover:text-[#FAFAFA]"
              }`}
            >
              Advance
            </button>
          </div>
        )}
      </div>

      {/* Booking Advance Amount Input & Presets */}
      {orderType === "BOOKING" && paymentType === "ADVANCE" && (
        <div className="p-2.5 bg-[#18181C] rounded-xl border border-amber-500/25 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-amber-400">Advance Amount:</span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-orange-400 font-bold">₹</span>
              <input
                type="number"
                placeholder="0"
                value={advanceAmountStr}
                onChange={(e) => onAdvanceAmountChange(e.target.value)}
                className="w-24 px-2 py-0.5 bg-[#121215] border border-[#2E2E38] text-right font-bold text-sm text-[#FAFAFA] rounded-lg outline-none font-mono focus:border-amber-500"
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center justify-between gap-1 text-[10px]">
            <span className="text-[#71717A]">Quick %:</span>
            <div className="flex gap-1">
              {[25, 50, 75].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => applyAdvancePreset(pct)}
                  className="px-2 py-0.5 bg-[#22222A] hover:bg-[#2C2C36] text-[#A1A1AA] hover:text-[#FAFAFA] rounded font-mono font-semibold transition-colors cursor-pointer"
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Order Notes */}
      <div>
        <button
          type="button"
          onClick={() => setShowNotes(!showNotes)}
          className="flex items-center justify-between w-full text-[11px] text-[#71717A] hover:text-[#A1A1AA] transition-colors py-0.5 cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <StickyNote className="w-3 h-3 text-orange-400" />
            <span>Order Notes / Instructions {orderNotes ? "(1)" : ""}</span>
          </span>
          {showNotes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {showNotes && (
          <textarea
            value={orderNotes}
            onChange={(e) => onOrderNotesChange(e.target.value)}
            placeholder="Packaging requirements, delivery date, customer instructions..."
            rows={2}
            className="w-full mt-1 px-3 py-1.5 bg-[#18181C] border border-[#26262E] focus:border-orange-500 rounded-xl text-xs text-[#FAFAFA] placeholder:text-[#52525B] outline-none resize-none custom-scrollbar"
          />
        )}
      </div>

      {/* Financial Summary */}
      <div className="pt-2 border-t border-[#1E1E24] space-y-1 text-xs">
        <div className="flex justify-between text-[#71717A]">
          <span>Subtotal</span>
          <span className="font-mono">₹{(subtotal + totalDiscount).toLocaleString("en-IN")}</span>
        </div>

        {totalDiscount > 0 && (
          <div className="flex justify-between text-green-400">
            <span>Total Discount</span>
            <span className="font-mono">- ₹{totalDiscount.toLocaleString("en-IN")}</span>
          </div>
        )}

        <div className="flex justify-between items-baseline pt-1">
          <span className="text-sm font-bold text-[#FAFAFA]">Total Payable</span>
          <span className="text-xl font-bold text-orange-400 font-mono">
            ₹{subtotal.toLocaleString("en-IN")}
          </span>
        </div>

        {orderType === "BOOKING" && actualPaymentType === "ADVANCE" && advanceNum > 0 && (
          <div className="flex justify-between text-xs text-amber-400 pt-0.5 font-medium">
            <span>Balance Due</span>
            <span className="font-mono">₹{balanceDue.toLocaleString("en-IN")}</span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 leading-tight">
          {errorMsg}
        </div>
      )}

      {/* Complete Sale Action Button */}
      <button
        type="button"
        onClick={onSubmitOrder}
        disabled={cartEmpty || isSubmitting}
        className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-[#222227] text-white disabled:text-[#52525B] font-bold text-sm sm:text-base rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98] disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Processing Order...</span>
          </>
        ) : (
          <>
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Place Order (₹{subtotal.toLocaleString("en-IN")})</span>
            <span className="text-[10px] font-mono opacity-60 hidden sm:inline ml-1 font-normal">
              [Ctrl+Enter]
            </span>
          </>
        )}
      </button>
    </div>
  );
}
