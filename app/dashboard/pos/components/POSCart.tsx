"use client";

import { ShoppingBag, Minus, Plus, Trash2, RotateCcw, AlertTriangle } from "lucide-react";
import { CartItem } from "../types";
import { imagePresets } from "@/lib/cloudinary";

type POSCartProps = {
  cart: CartItem[];
  onUpdateQty: (productId: number, delta: number, variantIndex?: number) => void;
  onSetQty: (productId: number, qty: number, variantIndex?: number) => void;
  onUpdatePrice: (productId: number, priceStr: string, variantIndex?: number) => void;
  onRemoveItem: (productId: number, variantIndex?: number) => void;
  onClearCart: () => void;
};

export default function POSCart({
  cart,
  onUpdateQty,
  onSetQty,
  onUpdatePrice,
  onRemoveItem,
  onClearCart,
}: POSCartProps) {
  const handleClearWithConfirm = () => {
    if (cart.length === 0) return;
    if (window.confirm("Are you sure you want to clear all items in the cart?")) {
      onClearCart();
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0F0F12]">
      {/* Cart Subheader */}
      <div className="px-3.5 py-2 border-b border-[#222227] flex items-center justify-between shrink-0 bg-[#121215]">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-orange-400" />
          <span className="text-xs font-bold text-[#FAFAFA] tracking-wide">
            CART ITEMS ({cart.length})
          </span>
        </div>

        {cart.length > 0 && (
          <button
            type="button"
            onClick={handleClearWithConfirm}
            className="flex items-center gap-1 text-[11px] text-[#71717A] hover:text-red-400 font-semibold px-2 py-0.5 rounded-lg hover:bg-[#1E1E24] transition-colors cursor-pointer"
            title="Clear all items in cart"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-3.5 custom-scrollbar space-y-2.5">
        {cart.length === 0 ? (
          <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 select-none">
            <div className="w-14 h-14 rounded-2xl bg-[#141418] border border-[#222227] flex items-center justify-center mb-3 text-[#3E3E48]">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <h5 className="text-sm font-bold text-[#A1A1AA] mb-1">Cart is empty</h5>
            <p className="text-xs text-[#52525B] max-w-[200px]">
              Click products or scan barcodes to add items here.
            </p>
          </div>
        ) : (
          cart.map((item) => {
            const hasVariant = item.variantIndex != null && item.product.variants;
            const variantObj = hasVariant ? item.product.variants![item.variantIndex!] : null;

            const defaultPrice = variantObj
              ? variantObj.selling_price
              : item.product.default_selling_price;
            const costPrice = variantObj ? variantObj.cost_price : item.product.cost_price;
            const maxStock = variantObj ? variantObj.stock_qty : item.product.stock_qty;

            const sp = typeof item.sellingPrice === "number" ? item.sellingPrice : 0;
            const isBelowCost = sp > 0 && sp < costPrice;
            const savedPerItem = defaultPrice - sp;
            const discountPct =
              defaultPrice > 0 && sp > 0 ? Math.round((savedPerItem / defaultPrice) * 100) : 0;
            const lineTotal = sp * item.quantity;

            return (
              <div
                key={`${item.product.id}-${item.variantIndex ?? "base"}`}
                className={`bg-[#141418] rounded-xl p-3 border transition-all duration-200 group relative ${
                  isBelowCost
                    ? "border-red-500/50 bg-red-500/[0.02]"
                    : "border-[#222227] hover:border-[#2E2E36]"
                }`}
              >
                {/* Top Row: Thumbnail + Code + Variant + Delete */}
                <div className="flex items-start gap-3">
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-lg bg-[#1A1A20] overflow-hidden shrink-0 flex items-center justify-center">
                    {item.product.photo_urls && item.product.photo_urls.length > 0 ? (
                      <img
                        src={imagePresets.thumbnail(item.product.photo_urls[0])}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ShoppingBag className="w-5 h-5 text-[#52525B]" />
                    )}
                  </div>

                  {/* Title & Info */}
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h5 className="text-xs font-bold text-[#FAFAFA] truncate">
                        {item.product.product_code}
                      </h5>
                      {variantObj && (
                        <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 px-1.5 py-0.2 rounded border border-orange-500/20">
                          {variantObj.label}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#A1A1AA] truncate mt-0.5">{item.product.name}</p>
                  </div>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.product.id, item.variantIndex)}
                    className="p-1 text-[#52525B] hover:text-red-400 rounded-md hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Bottom Row: Quantity Stepper + Selling Price + Line Total */}
                <div className="mt-3 pt-2.5 border-t border-[#1E1E24] flex items-center justify-between gap-2">
                  {/* Quantity Stepper */}
                  <div className="flex items-center bg-[#18181C] rounded-lg border border-[#26262E] p-0.5">
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.product.id, -1, item.variantIndex)}
                      disabled={item.quantity <= 1}
                      className="p-1.5 text-[#A1A1AA] hover:text-[#FAFAFA] disabled:opacity-30 disabled:hover:text-[#A1A1AA] transition-colors cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={maxStock}
                      value={item.quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val)) onSetQty(item.product.id, val, item.variantIndex);
                      }}
                      className="w-8 text-center text-xs font-bold text-[#FAFAFA] bg-transparent outline-none hide-arrows font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.product.id, 1, item.variantIndex)}
                      disabled={item.quantity >= maxStock}
                      className="p-1.5 text-[#A1A1AA] hover:text-[#FAFAFA] disabled:opacity-30 disabled:hover:text-[#A1A1AA] transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Price Override Input */}
                  <div className="flex items-center gap-1.5">
                    <div className="flex flex-col items-end">
                      {savedPerItem > 0 && discountPct > 0 && (
                        <div className="flex items-center gap-1 text-[10px]">
                          <span className="text-[#71717A] line-through font-mono">₹{defaultPrice}</span>
                          <span className="text-green-400 font-bold bg-green-500/10 px-1 rounded">
                            {discountPct}% OFF
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-orange-400">₹</span>
                        <input
                          type="number"
                          value={item.sellingPrice}
                          onChange={(e) =>
                            onUpdatePrice(item.product.id, e.target.value, item.variantIndex)
                          }
                          className={`w-20 px-2 py-1 bg-[#18181C] border rounded-lg text-xs font-bold text-right outline-none hide-arrows font-mono transition-colors ${
                            isBelowCost
                              ? "border-red-500 text-red-400 focus:ring-1 focus:ring-red-400"
                              : "border-[#26262E] text-orange-400 focus:border-orange-500"
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Line Total */}
                  <div className="text-right pl-2 border-l border-[#1E1E24] shrink-0">
                    <span className="text-[10px] text-[#71717A] block font-medium">Subtotal</span>
                    <span className="text-xs sm:text-sm font-bold text-[#FAFAFA] font-mono">
                      ₹{lineTotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Below Cost Warning */}
                {isBelowCost && (
                  <div className="mt-2 pt-1.5 border-t border-red-500/20 flex items-center gap-1.5 text-[10px] text-red-400 font-medium">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>
                      Below Cost Price (₹{costPrice.toLocaleString("en-IN")})! Loss: ₹
                      {(costPrice - sp).toLocaleString("en-IN")}/unit
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
