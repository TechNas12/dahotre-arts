"use client";

import { useState } from "react";
import { X, PackagePlus, ArrowUpCircle, Loader2, Check } from "lucide-react";
import { Product, adjustProductStockAction } from "@/app/actions/products";
import { useRouter } from "next/navigation";

type POSQuickStockModalProps = {
  product: Product | null;
  onClose: () => void;
};

export default function POSQuickStockModal({
  product,
  onClose,
}: POSQuickStockModalProps) {
  const router = useRouter();
  const [variantIdx, setVariantIdx] = useState<number | null>(
    product?.variants && product.variants.length > 0 ? 0 : null
  );
  const [quantityStr, setQuantityStr] = useState("1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!product) return null;

  const currentStock =
    variantIdx != null && product.variants
      ? product.variants[variantIdx].stock_qty
      : product.stock_qty;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantityStr);
    if (isNaN(qty) || qty <= 0) {
      setErrorMsg("Please enter a valid quantity to add.");
      return;
    }

    setErrorMsg("");
    setIsSubmitting(true);

    const res = await adjustProductStockAction(product.id, variantIdx, qty);
    setIsSubmitting(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      router.refresh();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-[fadeIn_0.15s_ease-out]">
      <div className="bg-[#121215] border border-[#222227] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#222227] bg-[#141418] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-4 h-4 text-green-400" />
            <h4 className="text-sm font-bold text-[#FAFAFA]">Quick Stock Addition</h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#71717A] hover:text-[#FAFAFA] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          <div>
            <span className="text-xs font-bold text-orange-400 font-mono">
              {product.product_code}
            </span>
            <h5 className="text-sm font-semibold text-[#FAFAFA] truncate">{product.name}</h5>
          </div>

          {/* Variant Selector (if product has variants) */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-1">
              <label className="text-[11px] uppercase font-bold text-[#71717A]">
                Select Size / Variant
              </label>
              <select
                value={variantIdx ?? 0}
                onChange={(e) => setVariantIdx(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#18181C] border border-[#26262E] focus:border-green-500 rounded-xl text-xs text-[#FAFAFA] outline-none cursor-pointer"
              >
                {product.variants.map((v, idx) => (
                  <option key={idx} value={idx}>
                    {v.label} (Current Stock: {v.stock_qty})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quantity Input */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <label className="uppercase font-bold text-[#71717A]">Quantity to Add</label>
              <span className="text-[#A1A1AA]">Current: {currentStock}</span>
            </div>

            <div className="relative">
              <ArrowUpCircle className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-green-500" />
              <input
                type="number"
                min="1"
                placeholder="10"
                value={quantityStr}
                onChange={(e) => setQuantityStr(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#18181C] border border-[#26262E] focus:border-green-500 rounded-xl text-sm font-bold text-[#FAFAFA] outline-none font-mono"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
              {errorMsg}
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#18181C] hover:bg-[#202026] text-[#A1A1AA] text-xs font-bold rounded-xl cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-[0_0_16px_rgba(34,197,94,0.3)]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Add Stock</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
