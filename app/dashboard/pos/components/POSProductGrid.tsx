"use client";

import { useState, useMemo } from "react";
import { Product } from "@/app/actions/products";
import POSProductCard from "./POSProductCard";
import { ShoppingBag, ChevronDown } from "lucide-react";

type POSProductGridProps = {
  products: Product[];
  viewMode: "GRID" | "LIST";
  isInCart: (productId: number) => boolean;
  onProductClick: (product: Product) => void;
  onQuickStock: (e: React.MouseEvent, product: Product) => void;
  onZoom: (e: React.MouseEvent, product: Product) => void;
  onClearFilters: () => void;
};

const INITIAL_DISPLAY_LIMIT = 48;
const LOAD_MORE_BATCH = 48;

export default function POSProductGrid({
  products,
  viewMode,
  isInCart,
  onProductClick,
  onQuickStock,
  onZoom,
  onClearFilters,
}: POSProductGridProps) {
  const [displayLimit, setDisplayLimit] = useState(INITIAL_DISPLAY_LIMIT);

  // Reset display limit when products list changes significantly
  const displayedProducts = useMemo(() => {
    return products.slice(0, displayLimit);
  }, [products, displayLimit]);

  const hasMore = displayLimit < products.length;

  if (products.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#18181C] border border-[#26262E] flex items-center justify-center mb-3 text-[#52525B]">
          <ShoppingBag className="w-7 h-7" />
        </div>
        <h4 className="text-base font-bold text-[#FAFAFA] mb-1">No products found</h4>
        <p className="text-xs text-[#71717A] max-w-xs mb-4">
          We couldn&apos;t find any products matching your search or category filter.
        </p>
        <button
          type="button"
          onClick={onClearFilters}
          className="px-4 py-2 bg-[#1E1E24] hover:bg-[#282832] text-orange-400 font-medium text-xs rounded-xl border border-[#2E2E38] transition-colors cursor-pointer"
        >
          Clear filters
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 custom-scrollbar">
      {viewMode === "GRID" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-3.5">
          {displayedProducts.map((product) => (
            <POSProductCard
              key={product.id}
              product={product}
              viewMode="GRID"
              inCart={isInCart(product.id)}
              onAdd={onProductClick}
              onQuickStock={onQuickStock}
              onZoom={onZoom}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {displayedProducts.map((product) => (
            <POSProductCard
              key={product.id}
              product={product}
              viewMode="LIST"
              inCart={isInCart(product.id)}
              onAdd={onProductClick}
              onQuickStock={onQuickStock}
              onZoom={onZoom}
            />
          ))}
        </div>
      )}

      {/* Progressive Load More to keep DOM light and 60fps fast */}
      {hasMore && (
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => setDisplayLimit((prev) => prev + LOAD_MORE_BATCH)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#18181C] hover:bg-[#202026] text-[#A1A1AA] hover:text-[#FAFAFA] font-medium text-xs rounded-xl border border-[#26262E] transition-all cursor-pointer shadow-sm"
          >
            <span>Load more products ({products.length - displayLimit} remaining)</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
