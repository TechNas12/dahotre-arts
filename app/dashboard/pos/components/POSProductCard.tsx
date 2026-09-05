"use client";

import { Check, ShoppingBag, PackagePlus, ZoomIn } from "lucide-react";
import { Product } from "@/app/actions/products";
import { imagePresets } from "@/lib/cloudinary";

type POSProductCardProps = {
  product: Product;
  viewMode: "GRID" | "LIST";
  inCart: boolean;
  onAdd: (product: Product) => void;
  onQuickStock: (e: React.MouseEvent, product: Product) => void;
  onZoom: (e: React.MouseEvent, product: Product) => void;
};

export default function POSProductCard({
  product,
  viewMode,
  inCart,
  onAdd,
  onQuickStock,
  onZoom,
}: POSProductCardProps) {
  const hasVariants = Boolean(product.variants && product.variants.length > 0);
  const totalStock = hasVariants
    ? product.variants!.reduce((acc, v) => acc + (v.stock_qty || 0), 0)
    : product.stock_qty;
  const isOutOfStock = totalStock <= 0;
  const isLowStock = !isOutOfStock && totalStock <= 3;

  const minPrice = hasVariants
    ? Math.min(...product.variants!.map((v) => v.selling_price))
    : product.default_selling_price;
  const maxPrice = hasVariants
    ? Math.max(...product.variants!.map((v) => v.selling_price))
    : product.default_selling_price;

  // Grid Mode Render
  if (viewMode === "GRID") {
    return (
      <div
        onClick={() => onAdd(product)}
        className={`group relative rounded-2xl overflow-hidden flex flex-col bg-[#141418] border transition-all duration-200 cursor-pointer select-none ${
          isOutOfStock ? "opacity-60 border-[#222227]" : "hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.5)]"
        } ${
          inCart
            ? "border-orange-500 shadow-[0_0_16px_rgba(249,115,22,0.22)] ring-1 ring-orange-500/50"
            : "border-[#222227] hover:border-orange-500/40"
        }`}
      >
        {/* Image / Thumbnail Container */}
        <div className="aspect-[4/3] w-full bg-[#1A1A20] relative overflow-hidden flex items-center justify-center">
          {product.photo_urls && product.photo_urls.length > 0 ? (
            <img
              src={imagePresets.card(product.photo_urls[0])}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <ShoppingBag className="w-9 h-9 text-[#42424A]" />
          )}

          {/* Out of Stock Overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] flex items-center justify-center">
              <span className="bg-red-500/95 text-white text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full shadow-lg uppercase">
                Out of Stock
              </span>
            </div>
          )}

          {/* In Cart Indicator */}
          {inCart && !isOutOfStock && (
            <div className="absolute top-2.5 right-2.5 bg-gradient-to-tr from-orange-500 to-orange-400 text-slate-950 rounded-full p-1.5 shadow-[0_0_12px_rgba(249,115,22,0.5)] z-10 animate-[scaleIn_0.15s_ease-out]">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          )}

          {/* Hover Quick Action Buttons */}
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <button
              type="button"
              onClick={(e) => onQuickStock(e, product)}
              className="bg-[#121215]/90 hover:bg-[#18181C] text-[#FAFAFA] hover:text-green-400 p-1.5 rounded-lg shadow border border-white/10 backdrop-blur-md transition-colors"
              title="Quick Add Stock"
            >
              <PackagePlus className="w-3.5 h-3.5" />
            </button>
            {product.photo_urls && product.photo_urls.length > 0 && (
              <button
                type="button"
                onClick={(e) => onZoom(e, product)}
                className="bg-[#121215]/90 hover:bg-[#18181C] text-[#FAFAFA] hover:text-orange-400 p-1.5 rounded-lg shadow border border-white/10 backdrop-blur-md transition-colors"
                title="View image"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Content Details */}
        <div className="p-3 flex flex-col flex-1 justify-between gap-2">
          <div>
            <div className="flex items-start justify-between gap-1.5">
              <h4 className="text-xs sm:text-sm font-bold text-[#FAFAFA] truncate tracking-tight">
                {product.product_code}
              </h4>
              {hasVariants ? (
                <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20 whitespace-nowrap">
                  {product.variants!.length} sizes
                </span>
              ) : null}
            </div>

            <p className="text-[11px] text-[#A1A1AA] line-clamp-1 mt-0.5">
              {product.name}
              {product.height ? ` (${product.height}ft)` : ""}
            </p>
          </div>

          <div className="pt-2 border-t border-[#222227] flex items-center justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-xs sm:text-sm font-bold text-orange-400 font-mono">
                {hasVariants && minPrice !== maxPrice
                  ? `₹${minPrice.toLocaleString("en-IN")} - ₹${maxPrice.toLocaleString("en-IN")}`
                  : `₹${minPrice.toLocaleString("en-IN")}`}
              </span>
            </div>

            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                isOutOfStock
                  ? "bg-red-500/10 text-red-400 border border-red-500/20"
                  : isLowStock
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                  : "bg-[#1E1E24] text-[#A1A1AA]"
              }`}
            >
              Stock: {totalStock}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // List Mode Render
  return (
    <div
      onClick={() => onAdd(product)}
      className={`flex items-center gap-3.5 bg-[#141418] rounded-xl p-2.5 sm:p-3 border transition-all duration-200 cursor-pointer select-none group ${
        isOutOfStock ? "opacity-60 border-[#222227]" : "hover:border-orange-500/40 hover:bg-[#18181C]"
      } ${
        inCart
          ? "border-orange-500 bg-orange-500/5 shadow-[0_0_12px_rgba(249,115,22,0.15)] ring-1 ring-orange-500/40"
          : "border-[#222227]"
      }`}
    >
      {/* Thumbnail */}
      <div
        onClick={(e) => {
          if (product.photo_urls && product.photo_urls.length > 0) {
            e.stopPropagation();
            onZoom(e, product);
          }
        }}
        className="w-14 h-14 bg-[#1A1A20] rounded-lg shrink-0 overflow-hidden flex items-center justify-center relative group/img"
      >
        {product.photo_urls && product.photo_urls.length > 0 ? (
          <img
            src={imagePresets.thumbnail(product.photo_urls[0])}
            alt={product.name}
            className="w-full h-full object-cover group-hover/img:scale-105 transition-transform"
            loading="lazy"
          />
        ) : (
          <ShoppingBag className="w-6 h-6 text-[#52525B]" />
        )}
        {inCart && !isOutOfStock && (
          <div className="absolute inset-0 bg-orange-500/30 flex items-center justify-center">
            <Check className="w-5 h-5 text-orange-400 stroke-[3]" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-bold text-[#FAFAFA] truncate">{product.product_code}</h4>
          {hasVariants && (
            <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 px-1.5 py-0.2 rounded border border-orange-500/20">
              {product.variants!.length} sizes
            </span>
          )}
        </div>
        <p className="text-xs text-[#A1A1AA] truncate mt-0.5">
          {product.name}
          {product.height ? ` (${product.height}ft)` : ""}
        </p>
      </div>

      {/* Price & Stock */}
      <div className="text-right shrink-0">
        <div className="font-bold text-orange-400 text-sm font-mono">
          {hasVariants && minPrice !== maxPrice
            ? `₹${minPrice.toLocaleString("en-IN")} - ₹${maxPrice.toLocaleString("en-IN")}`
            : `₹${minPrice.toLocaleString("en-IN")}`}
        </div>
        <div className="text-[11px] text-[#A1A1AA] mt-0.5">
          {isOutOfStock ? (
            <span className="text-red-400 font-medium">Out of Stock</span>
          ) : (
            <span>Stock: {totalStock}</span>
          )}
        </div>
      </div>

      {/* Quick Add Stock Action */}
      <div className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => onQuickStock(e, product)}
          className="p-2 bg-[#1E1E24] hover:bg-[#282830] text-[#A1A1AA] hover:text-green-400 rounded-lg border border-[#2A2A32] transition-colors"
          title="Quick Add Stock"
        >
          <PackagePlus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
