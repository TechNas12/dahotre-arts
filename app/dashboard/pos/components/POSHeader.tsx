"use client";

import { RefObject } from "react";
import { Search, ScanBarcode, LayoutGrid, List, X } from "lucide-react";
import { Category, Product } from "@/app/actions/products";

type POSHeaderProps = {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  categories: Category[];
  activeCategoryId: number | "ALL";
  onSelectCategory: (id: number | "ALL") => void;
  categoryCounts: Record<number | "ALL", number>;
  viewMode: "GRID" | "LIST";
  onViewModeChange: (mode: "GRID" | "LIST") => void;
  onExactMatchAdd?: (product: Product) => void;
  findExactProduct: (query: string) => Product | null;
  totalProductsCount: number;
  filteredCount: number;
};

export default function POSHeader({
  searchQuery,
  onSearchChange,
  searchInputRef,
  categories,
  activeCategoryId,
  onSelectCategory,
  categoryCounts,
  viewMode,
  onViewModeChange,
  onExactMatchAdd,
  findExactProduct,
  totalProductsCount,
  filteredCount,
}: POSHeaderProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      const exact = findExactProduct(searchQuery.trim());
      if (exact && onExactMatchAdd) {
        e.preventDefault();
        onExactMatchAdd(exact);
        onSearchChange("");
      }
    }
  };

  return (
    <div className="p-3.5 sm:p-4 border-b border-[#222227] bg-[#121215] z-10 space-y-3 shrink-0 rounded-t-2xl">
      {/* Top Search & Layout Switcher */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Search Bar with Barcode Scanner Indicator */}
        <div className="relative flex-1 group">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A] group-focus-within:text-orange-400 transition-colors" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search code, name, barcode (press Enter to add)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-[#18181C] border border-[#26262E] hover:border-[#32323C] focus:border-orange-500/80 focus:ring-2 focus:ring-orange-500/20 text-[#FAFAFA] rounded-xl pl-10 pr-24 py-2.5 text-sm transition-all duration-200 outline-none placeholder:text-[#52525B]"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-auto">
            {searchQuery ? (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="p-1 text-[#71717A] hover:text-[#FAFAFA] rounded-md transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
            <div
              className="flex items-center gap-1 text-[11px] font-mono text-[#71717A] bg-[#222227] px-1.5 py-0.5 rounded border border-[#2E2E36]"
              title="Barcode scan supported. Press Ctrl+K to focus"
            >
              <ScanBarcode className="w-3 h-3 text-orange-400/80" />
              <span className="hidden sm:inline">Ctrl+K</span>
            </div>
          </div>
        </div>

        {/* View Mode Toggle: Grid vs List */}
        <div className="flex bg-[#18181C] p-1 rounded-xl border border-[#222227] shrink-0">
          <button
            type="button"
            onClick={() => onViewModeChange("GRID")}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              viewMode === "GRID"
                ? "bg-[#222228] text-orange-400 shadow-sm"
                : "text-[#71717A] hover:text-[#FAFAFA]"
            }`}
            title="Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("LIST")}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              viewMode === "LIST"
                ? "bg-[#222228] text-orange-400 shadow-sm"
                : "text-[#71717A] hover:text-[#FAFAFA]"
            }`}
            title="List View"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category Pills with Item Counts */}
      <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 text-xs">
        <button
          type="button"
          onClick={() => onSelectCategory("ALL")}
          className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
            activeCategoryId === "ALL"
              ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-[0_0_16px_rgba(249,115,22,0.35)]"
              : "bg-[#18181C] text-[#A1A1AA] hover:bg-[#202026] hover:text-[#FAFAFA] border border-[#222227]"
          }`}
        >
          <span>All Items</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeCategoryId === "ALL"
                ? "bg-black/25 text-white"
                : "bg-[#222227] text-[#71717A]"
            }`}
          >
            {categoryCounts.ALL || totalProductsCount}
          </span>
        </button>

        {categories.map((c) => {
          const count = categoryCounts[c.id] ?? 0;
          const isActive = activeCategoryId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelectCategory(c.id)}
              className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-[0_0_16px_rgba(249,115,22,0.35)]"
                  : "bg-[#18181C] text-[#A1A1AA] hover:bg-[#202026] hover:text-[#FAFAFA] border border-[#222227]"
              }`}
            >
              <span>{c.name}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive ? "bg-black/25 text-white" : "bg-[#222227] text-[#71717A]"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
