"use client";

import { X, ShoppingBag } from "lucide-react";
import { Product } from "@/app/actions/products";

type POSVariantModalProps = {
  product: Product | null;
  onClose: () => void;
  onSelectVariant: (product: Product, variantIndex?: number) => void;
};

export default function POSVariantModal({
  product,
  onClose,
  onSelectVariant,
}: POSVariantModalProps) {
  if (!product) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-[fadeIn_0.15s_ease-out]">
      <div className="bg-[#121215] border border-[#222227] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#222227] bg-[#141418] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-orange-400" />
            <h4 className="text-sm font-bold text-[#FAFAFA]">Select Size / Variant</h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#71717A] hover:text-[#FAFAFA] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Product Info */}
        <div className="px-4 py-3 bg-[#18181C] border-b border-[#222227]">
          <h5 className="text-xs font-bold text-orange-400">{product.product_code}</h5>
          <p className="text-sm font-medium text-[#FAFAFA]">{product.name}</p>
        </div>

        {/* Options Grid */}
        <div className="p-4 space-y-2.5 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {/* Base Product Option */}
          <button
            type="button"
            onClick={() => onSelectVariant(product, undefined)}
            disabled={product.stock_qty <= 0}
            className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
              product.stock_qty > 0
                ? "bg-[#18181C] border-[#26262E] hover:border-orange-500 hover:bg-[#1E1E24]"
                : "bg-[#141418] border-[#222227] opacity-40 cursor-not-allowed"
            }`}
          >
            <div>
              <span className="text-xs font-bold text-[#FAFAFA] block">
                {product.height
                  ? product.base
                    ? `Base Size (${product.height}x${product.base} ft)`
                    : `Base Size (${product.height} ft)`
                  : "Base Size"}
              </span>
              <span className="text-[11px] text-[#A1A1AA] mt-0.5 block">
                Stock: {product.stock_qty} available
              </span>
            </div>

            <div className="text-right">
              <span className="text-sm font-bold text-orange-400 font-mono">
                ₹{product.default_selling_price.toLocaleString("en-IN")}
              </span>
              {product.stock_qty <= 0 && (
                <span className="text-[10px] text-red-400 font-bold uppercase block">
                  Out of Stock
                </span>
              )}
            </div>
          </button>

          {/* Variants Options */}
          {product.variants?.map((v, idx) => {
            const isOut = v.stock_qty <= 0;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectVariant(product, idx)}
                disabled={isOut}
                className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                  !isOut
                    ? "bg-[#18181C] border-[#26262E] hover:border-orange-500 hover:bg-[#1E1E24]"
                    : "bg-[#141418] border-[#222227] opacity-40 cursor-not-allowed"
                }`}
              >
                <div>
                  <span className="text-xs font-bold text-orange-400 block">{v.label}</span>
                  <span className="text-[11px] text-[#A1A1AA] mt-0.5 block">
                    Stock: {v.stock_qty} available
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-sm font-bold text-[#FAFAFA] font-mono">
                    ₹{v.selling_price.toLocaleString("en-IN")}
                  </span>
                  {isOut && (
                    <span className="text-[10px] text-red-400 font-bold uppercase block">
                      Out of Stock
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
