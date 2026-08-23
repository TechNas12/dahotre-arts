"use client";

import { useState, useActionState, useEffect, useMemo, useRef, useCallback, startTransition } from "react";
import { createPortal } from "react-dom";
import { 
  Plus, Trash2, Edit2, X, Check, Search, AlertTriangle, 
  Image as ImageIcon, ChevronDown, Filter, Printer, 
  SlidersHorizontal, Sparkles, Layers, Box, Eye, CheckSquare, Square, RotateCcw
} from "lucide-react";
import { 
  createProductAction, updateProductAction, deleteProductsAction, 
  Product, Category, getNextProductSequence, ProductVariant, searchProductsAction 
} from "@/app/actions/products";
import { generateLabelPdf, LabelPrintItem } from "@/lib/generateLabelPdf";
import ImageUploader from "./ImageUploader";
import { TablePagination, PageSize } from "@/app/dashboard/components/TablePagination";
import { SearchInput } from "@/app/dashboard/components/SearchInput";
import { LiveBadge } from "@/app/dashboard/components/LiveBadge";
import { useRealtimeTable } from "@/lib/supabase/realtime";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Checkbox } from "@/app/dashboard/components/ui/Checkbox";
import { Dropdown } from "@/app/dashboard/components/ui/Dropdown";
import { ConfirmDialog } from "@/app/dashboard/components/ui/ConfirmDialog";
import { imagePresets } from "@/lib/cloudinary";
import ImageViewerModal from "@/app/dashboard/components/ui/ImageViewerModal";

export default function ProductsTable({
  initialProducts,
  categories,
  totalCount,
  initialPage = 1,
  initialPageSize = 25,
  initialSearch = "",
  initialCategory
}: {
  initialProducts: Product[];
  categories: Category[];
  totalCount: number;
  initialPage?: number;
  initialPageSize?: number;
  initialSearch?: string;
  initialCategory?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [total, setTotal] = useState(totalCount);
  const [isPending, setIsPending] = useState(false);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);

  // Search & Filter (Local state synced to URL)
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [filterCategory, setFilterCategory] = useState<number | 'ALL'>(initialCategory || 'ALL');
  const [filterPrefix, setFilterPrefix] = useState<string>(searchParams.get('prefix') || '');
  
  // New Filters
  const [priceMin, setPriceMin] = useState<string>(searchParams.get('priceMin') || '');
  const [priceMax, setPriceMax] = useState<string>(searchParams.get('priceMax') || '');
  const [inStockOnly, setInStockOnly] = useState<boolean>(searchParams.get('inStockOnly') === 'true');
  
  // Mobile filter drawer / collapsible toggle
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const currentPage = initialPage;
  const pageSize = initialPageSize as PageSize;

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterPrefix) count++;
    if (priceMin || priceMax) count++;
    if (inStockOnly) count++;
    if (filterCategory !== 'ALL') count++;
    return count;
  }, [filterPrefix, priceMin, priceMax, inStockOnly, filterCategory]);

  // Flush state to URL
  const updateURL = useCallback((params: Record<string, string | number | boolean | undefined>) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === '' || value === 'ALL' || value === false) {
        current.delete(key);
      } else {
        current.set(key, String(value));
      }
    });
    startTransition(() => {
      router.push(`${pathname}?${current.toString()}`, { scroll: false });
    });
  }, [router, pathname, searchParams]);

  const performSearch = async (
    query: string, prefix: string, catId: number | 'ALL',
    page: number, size: number,
    pMin: string, pMax: string, stockOnly: boolean
  ) => {
    setIsPending(true);
    const result = await searchProductsAction({
      search: query,
      prefix: prefix || undefined,
      categoryId: catId === 'ALL' ? undefined : catId,
      page,
      pageSize: size,
      priceMin: pMin ? Number(pMin) : undefined,
      priceMax: pMax ? Number(pMax) : undefined,
      inStockOnly: stockOnly
    });
    setProducts(result.data);
    setTotal(result.totalCount);
    setIsPending(false);
  };

  // Debounced Search
  useEffect(() => {
    if (mounted) {
      const handler = setTimeout(() => {
         import("react").then((React) => {
            React.startTransition(() => {
               performSearch(searchQuery, filterPrefix, filterCategory, currentPage, pageSize, priceMin, priceMax, inStockOnly);
               updateURL({ search: searchQuery, prefix: filterPrefix, priceMin, priceMax, inStockOnly, page: 1 });
            });
         });
      }, 200);
      return () => clearTimeout(handler);
    }
  }, [searchQuery, filterPrefix, priceMin, priceMax, inStockOnly, currentPage, pageSize, filterCategory, mounted]);

  // Realtime updates
  const { isConnected } = useRealtimeTable('products', () => {
    performSearch(searchQuery, filterPrefix, filterCategory, currentPage, pageSize, priceMin, priceMax, inStockOnly);
    router.refresh();
  });

  const handleCategoryChange = (val: number | 'ALL') => {
    setFilterCategory(val);
    setSelectedIds(new Set());
    updateURL({ categoryId: val, page: 1 });
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setFilterPrefix("");
    setFilterCategory("ALL");
    setPriceMin("");
    setPriceMax("");
    setInStockOnly(false);
    setShowMobileFilters(false);
    updateURL({ search: undefined, prefix: undefined, categoryId: undefined, priceMin: undefined, priceMax: undefined, inStockOnly: undefined, page: 1 });
  };

  const handlePageChange = (page: number) => {
    setSelectedIds(new Set());
    updateURL({ page });
  };

  const handlePageSizeChange = (size: number) => {
    setSelectedIds(new Set());
    updateURL({ pageSize: size, page: 1 });
  };

  const pagedProducts = products;

  const toggleSelectAll = () => {
    if (selectedIds.size === pagedProducts.length && pagedProducts.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pagedProducts.map((p) => p.id)));
    }
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Drawer State (Unified for Add & Edit)
  type DrawerMode = 'ADD' | 'EDIT' | null;
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [drawerProduct, setDrawerProduct] = useState<Product | null>(null);

  const [addState, addAction, isAdding] = useActionState(createProductAction, undefined);
  const [updateState, updateAction, isUpdating] = useActionState(updateProductAction, undefined);

  const defaultCategoryId = useMemo(() => categories.find(c => c.name === 'MAKHAR')?.id || categories[0]?.id, [categories]);
  
  const [formPhotoUrls, setFormPhotoUrls] = useState<string[]>([]);
  const [formCategoryId, setFormCategoryId] = useState<number>(defaultCategoryId);
  const [formCodePrefix, setFormCodePrefix] = useState("");
  const [formCodeSuffix, setFormCodeSuffix] = useState("");
  const [formCostPrice, setFormCostPrice] = useState<string>("");
  const [formSellingPrice, setFormSellingPrice] = useState<string>("");
  const [formName, setFormName] = useState("");
  const [formStockQty, setFormStockQty] = useState("");
  const [formBase, setFormBase] = useState<string>("");
  const [formHeight, setFormHeight] = useState<string>("");
  const [formVariants, setFormVariants] = useState<ProductVariant[]>([]);
  const [isFetchingSequence, setIsFetchingSequence] = useState(false);
  const [formKey, setFormKey] = useState(Date.now()); 
  const [showSuccess, setShowSuccess] = useState(false);

  const formMargin = useMemo(() => {
    const cp = parseFloat(formCostPrice);
    const sp = parseFloat(formSellingPrice);
    if (cp > 0 && sp > cp) {
      return (((sp - cp) / cp) * 100).toFixed(1);
    }
    return null;
  }, [formCostPrice, formSellingPrice]);

  const handlePrefixChange = async (val: string) => {
    const prefix = val.toUpperCase();
    setFormCodePrefix(prefix);
    if (prefix.length > 0) {
      setIsFetchingSequence(true);
      const nextSeq = await getNextProductSequence(prefix);
      setFormCodeSuffix(nextSeq);
      setIsFetchingSequence(false);
    } else {
      setFormCodeSuffix("");
    }
  };

  const openDrawer = (mode: DrawerMode, product?: Product) => {
    setDrawerMode(mode);
    setFormKey(Date.now());
    if (mode === 'EDIT' && product) {
      setDrawerProduct(product);
      setFormName(product.name);
      setFormStockQty(product.stock_qty.toString());
      setFormCostPrice(product.cost_price.toString());
      setFormSellingPrice(product.default_selling_price.toString());
      setFormCategoryId(product.category_id);
      setFormPhotoUrls(product.photo_urls || []);
      setFormBase(product.base ? product.base.toString() : "");
      setFormHeight(product.height ? product.height.toString() : "");
      setFormVariants(product.variants || []);
      
      const match = product.product_code.match(/^([a-zA-Z]+)(.*)$/);
      if (match) {
        setFormCodePrefix(match[1].toUpperCase());
        setFormCodeSuffix(match[2]);
      } else {
        setFormCodePrefix(product.product_code.toUpperCase());
        setFormCodeSuffix("");
      }
    } else {
      setDrawerProduct(null);
      setFormName("");
      setFormStockQty("0");
      setFormCostPrice("");
      setFormSellingPrice("");
      setFormCategoryId(defaultCategoryId);
      setFormPhotoUrls([]);
      setFormBase("");
      setFormHeight("");
      setFormVariants([]);
      setFormCodePrefix("");
      setFormCodeSuffix("");
    }
  };

  useEffect(() => {
    if (addState?.success || updateState?.success) {
      setShowSuccess(true);
      if (addState?.success) {
        setFormPhotoUrls([]);
        setFormCategoryId(defaultCategoryId);
        setFormCodePrefix("");
        setFormCodeSuffix("");
        setFormCostPrice("");
        setFormSellingPrice("");
        setFormName("");
        setFormStockQty("0");
        setFormBase("");
        setFormHeight("");
        setFormVariants([]);
      } else {
        setFormKey(Date.now());
      }
      if (updateState?.success) {
        setDrawerMode(null);
      }
      setSelectedIds(new Set());
      performSearch(searchQuery, filterPrefix, filterCategory, currentPage, pageSize, priceMin, priceMax, inStockOnly);
      router.refresh();
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [addState, updateState, defaultCategoryId, searchQuery, filterPrefix, filterCategory, currentPage, pageSize, priceMin, priceMax, inStockOnly, router]);

  // Delete State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError("");
    const ids = Array.from(selectedIds);
    const result = await deleteProductsAction(ids);

    if (result.error) {
      setDeleteError(result.error);
    } else {
      setIsDeleteDialogOpen(false);
      setSelectedIds(new Set());
      performSearch(searchQuery, filterPrefix, filterCategory, currentPage, pageSize, priceMin, priceMax, inStockOnly);
      router.refresh();
    }
    setIsDeleting(false);
  };

  const [isGeneratingLabel, setIsGeneratingLabel] = useState(false);
  const [printModalItems, setPrintModalItems] = useState<LabelPrintItem[] | null>(null);

  const handlePrintLabelsClick = (customProduct?: Product) => {
    const selectedProducts = customProduct 
      ? [customProduct] 
      : pagedProducts.filter(p => selectedIds.has(p.id));

    if (selectedProducts.length === 0) return;

    const initialItems: LabelPrintItem[] = [];
    for (const p of selectedProducts) {
      if (p.variants && p.variants.length > 0) {
        initialItems.push({ product: p, count: 1 });
        for (let i = 0; i < p.variants.length; i++) {
           initialItems.push({ product: p, variantIndex: i, count: 1 }); 
        }
      } else {
        initialItems.push({ product: p, count: 1 });
      }
    }
    setPrintModalItems(initialItems);
  };

  const handleConfirmPrint = async () => {
    if (!printModalItems) return;
    const toPrint = printModalItems.filter(i => i.count > 0);
    if (toPrint.length === 0) {
       setPrintModalItems(null);
       return;
    }
    setIsGeneratingLabel(true);
    try {
      await generateLabelPdf(toPrint);
    } catch (err) {
      console.error("Failed to generate label", err);
    }
    setIsGeneratingLabel(false);
    setPrintModalItems(null);
  };

  return (
    <div className="ds-card flex flex-col relative overflow-hidden">
      
      {/* ─── ACTION & FILTER BAR ─── */}
      <div className="p-3.5 sm:p-4 border-b border-[#1F1F1F] flex flex-col gap-3 relative z-20 bg-[#121215]">
        
        {/* Top Controls: New Product, Bulk Buttons, Live Indicator */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            <button
              onClick={() => openDrawer('ADD')}
              className="flex items-center gap-1.5 ds-btn-primary rounded-xl text-xs sm:text-sm px-3.5 py-2 shrink-0 font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>New Product</span>
            </button>

            {/* Desktop-only action buttons */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={selectedIds.size === 0}
                className="flex items-center gap-1.5 bg-[#18181C] hover:bg-red-500/20 text-[#A1A1AA] hover:text-red-400 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors border border-[#222227] hover:border-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete {selectedIds.size > 0 && `(${selectedIds.size})`}</span>
              </button>

              <button
                onClick={() => handlePrintLabelsClick()}
                disabled={selectedIds.size === 0 || isGeneratingLabel}
                className="flex items-center gap-1.5 bg-[#18181C] hover:bg-[#222227] text-[#A1A1AA] hover:text-[#FAFAFA] px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors border border-[#222227] hover:border-[#2E2E36] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-blue-400" />
                <span>{isGeneratingLabel ? "Generating..." : `Print Labels ${selectedIds.size > 0 ? `(${selectedIds.size})` : ""}`}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Filter Toggle on Mobile */}
            <button
              type="button"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className={`md:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                showMobileFilters || activeFiltersCount > 0
                  ? "bg-orange-500/15 border-orange-500/40 text-orange-400"
                  : "bg-[#18181C] border-[#222227] text-[#A1A1AA] hover:text-[#FAFAFA]"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            <LiveBadge isConnected={isConnected} />
          </div>
        </div>

        {/* Search Bar + Quick Category Chips */}
        <div className="space-y-2.5">
          <div className="relative w-full">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              isPending={isPending}
              placeholder="Search by name, code (e.g. S01), category, variant, dimensions, price (₹)..."
            />
          </div>

          {/* Horizontally Scrollable Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar no-scrollbar -mx-1 px-1">
            <button
              type="button"
              onClick={() => handleCategoryChange('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-all cursor-pointer ${
                filterCategory === 'ALL'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-[0_0_12px_rgba(249,115,22,0.35)]'
                  : 'bg-[#18181C] text-[#A1A1AA] hover:text-[#FAFAFA] border border-[#222227] hover:border-[#2E2E36]'
              }`}
            >
              All ({totalCount})
            </button>
            {categories.map((c) => {
              const isSelected = filterCategory === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleCategoryChange(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-[0_0_12px_rgba(249,115,22,0.35)]'
                      : 'bg-[#18181C] text-[#A1A1AA] hover:text-[#FAFAFA] border border-[#222227] hover:border-[#2E2E36]'
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Filter Bar: Inline on Desktop, Collapsible on Mobile */}
        <div className={`${showMobileFilters ? 'flex' : 'hidden md:flex'} flex-wrap items-center gap-2.5 pt-2 border-t border-[#1F1F1F]/60 animate-[fadeIn_0.15s_ease-out]`}>
          
          {/* Prefix input */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-[#71717A] uppercase">Code</span>
            <input
              type="text"
              placeholder="Prefix (e.g. S)"
              value={filterPrefix}
              onChange={(e) => setFilterPrefix(e.target.value.toUpperCase())}
              className="w-24 ds-input py-1.5 px-2.5 text-xs uppercase"
            />
          </div>

          {/* Desktop Category Dropdown */}
          <div className="hidden md:block">
            <Dropdown
              options={[
                { id: 'ALL', name: 'All Categories' },
                ...categories.map(c => ({ id: c.id, name: c.name }))
              ]}
              value={filterCategory}
              onChange={handleCategoryChange}
              compact
              className="w-40"
            />
          </div>
          
          {/* Price Range */}
          <div className="flex items-center gap-1.5 bg-[#18181C] border border-[#222227] rounded-xl px-2.5 py-0.5 shadow-sm">
            <span className="text-[#71717A] text-xs">₹</span>
            <input
              type="number"
              placeholder="Min"
              value={priceMin}
              onChange={e => setPriceMin(e.target.value)}
              onWheel={e => e.currentTarget.blur()}
              className="w-14 sm:w-16 bg-transparent text-[#FAFAFA] text-xs focus:outline-none py-1.5 hide-arrows"
            />
            <span className="text-[#3F3F46]">-</span>
            <input
              type="number"
              placeholder="Max"
              value={priceMax}
              onChange={e => setPriceMax(e.target.value)}
              onWheel={e => e.currentTarget.blur()}
              className="w-14 sm:w-16 bg-transparent text-[#FAFAFA] text-xs focus:outline-none py-1.5 hide-arrows"
            />
          </div>
          
          {/* In Stock toggle */}
          <label className="flex items-center gap-2 cursor-pointer bg-[#18181C] border border-[#222227] px-3 py-1.5 rounded-xl hover:border-[#2E2E36] transition-colors shadow-sm">
            <Checkbox checked={inStockOnly} onChange={() => setInStockOnly(!inStockOnly)} />
            <span className="text-xs font-medium text-[#A1A1AA]">In Stock</span>
          </label>

          {/* Reset Filters button */}
          {(activeFiltersCount > 0 || searchQuery.trim()) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-xs text-[#71717A] hover:text-orange-400 px-2 py-1 transition-colors cursor-pointer ml-auto"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Search Results Summary Banner */}
        {searchQuery.trim() && (
          <div className="flex items-center justify-between bg-orange-500/10 border border-orange-500/20 px-3 py-2 rounded-xl text-xs animate-[fadeIn_0.2s_ease-out]">
            <div className="flex items-center gap-2 text-orange-400 truncate">
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Found <strong className="text-[#FAFAFA] font-bold">{total}</strong> products matching &ldquo;{searchQuery}&rdquo;</span>
            </div>
            <button 
              onClick={() => setSearchQuery("")}
              className="text-orange-400 hover:text-white font-medium flex items-center gap-1 cursor-pointer transition-colors shrink-0 ml-2"
              title="Clear Search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ─── MOBILE VIEW: DEDICATED TOUCH-FIRST PRODUCT CARDS ─── */}
      <div className="block md:hidden flex-1 overflow-y-auto custom-scrollbar">
        {pagedProducts.length === 0 ? (
          <div className="p-10 text-center text-[#71717A] space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#18181C] border border-[#222227] flex items-center justify-center mx-auto text-[#71717A]">
              <Box className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-[#A1A1AA]">
              {searchQuery ? "No products match your search." : "No products found."}
            </p>
            {activeFiltersCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-orange-400 hover:underline font-medium cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#1F1F1F]/60 pb-28">
            {pagedProducts.map((product) => {
              const isSelected = selectedIds.has(product.id);
              const firstImg = product.photo_urls && product.photo_urls.length > 0 ? product.photo_urls[0] : null;

              // Margin calculation
              const cost = Number(product.cost_price);
              const sell = Number(product.default_selling_price);
              let marginStr = "-";
              let marginColor = "text-[#71717A] bg-[#18181C] border-[#222227]";
              if (cost > 0 && sell > 0) {
                const marginPct = ((sell - cost) / cost) * 100;
                marginStr = `${marginPct.toFixed(1)}%`;
                if (marginPct >= 30) marginColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 font-bold";
                else if (marginPct >= 10) marginColor = "text-amber-400 bg-amber-500/10 border-amber-500/20 font-medium";
                else marginColor = "text-red-400 bg-red-500/10 border-red-500/20";
              }

              return (
                <div
                  key={product.id}
                  onClick={() => openDrawer('EDIT', product)}
                  className={`p-3.5 transition-all duration-150 cursor-pointer active:bg-[#18181D] ${
                    isSelected ? 'bg-orange-500/10' : 'hover:bg-[#16161A]'
                  }`}
                >
                  {/* Card Header: Checkbox + Code + Category + Stock Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2 min-w-0" onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onChange={() => toggleSelect(product.id)}
                      />
                      <span className="font-mono text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-lg shrink-0">
                        {product.product_code}
                      </span>
                      <span className="text-[11px] font-medium text-[#A1A1AA] bg-[#18181C] border border-[#222227] px-2 py-0.5 rounded-lg truncate max-w-[110px]">
                        {product.category_name}
                      </span>
                    </div>

                    {/* Stock Status Badge */}
                    <div className="shrink-0">
                      {product.stock_qty === 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                          Out of stock
                        </span>
                      ) : product.stock_qty <= 5 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          Low: {product.stock_qty} left
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          {product.stock_qty} in stock
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Body: Thumbnail + Product Name & Specs */}
                  <div className="flex gap-3">
                    {/* Thumbnail with expand preview on click */}
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (product.photo_urls && product.photo_urls.length > 0) {
                          setPreviewProduct(product);
                        }
                      }}
                      className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl bg-[#18181C] border border-[#222227] overflow-hidden shrink-0 relative flex items-center justify-center group"
                    >
                      {firstImg ? (
                        <>
                          <img 
                            src={imagePresets.thumbnail(firstImg)} 
                            alt={product.name} 
                            className="w-full h-full object-cover" 
                          />
                          {product.photo_urls && product.photo_urls.length > 1 && (
                            <span className="absolute bottom-1 right-1 text-[9px] font-bold bg-black/80 text-[#FAFAFA] px-1.5 py-0.5 rounded-md border border-white/10 backdrop-blur-xs">
                              +{product.photo_urls.length - 1}
                            </span>
                          )}
                        </>
                      ) : (
                        <ImageIcon className="w-6 h-6 text-[#71717A]" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-[#FAFAFA] line-clamp-2 leading-snug">
                          {product.name}
                        </h4>
                        
                        {/* Dimension / Variant details */}
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {product.variants && product.variants.length > 0 ? (
                            <span className="text-[10px] font-medium text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded-md">
                              {product.variants.length} Size Variants
                            </span>
                          ) : (product.height || product.base) ? (
                            <span className="text-[10px] font-mono text-[#A1A1AA] bg-[#18181C] border border-[#222227] px-1.5 py-0.5 rounded-md">
                              {product.height ? `H:${product.height}ft` : ''} {product.base ? `B:${product.base}ft` : ''}
                            </span>
                          ) : null}

                          {product.created_by_user?.name && (
                            <span className="text-[10px] text-[#71717A]">
                              by {product.created_by_user.name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Pricing & Profit Margin */}
                      <div className="flex items-baseline justify-between mt-2 pt-1.5 border-t border-[#1F1F1F]/40">
                        <div className="flex items-baseline gap-2">
                          <span className="text-base font-bold text-orange-400 font-mono">
                            ₹{sell.toLocaleString('en-IN')}
                          </span>
                          {cost > 0 && (
                            <span className="text-[11px] text-[#71717A] font-mono">
                              Cost: ₹{cost.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                        
                        {marginStr !== '-' && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${marginColor}`}>
                            +{marginStr} margin
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Quick Action Buttons */}
                  <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-[#1F1F1F]/60" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handlePrintLabelsClick(product)}
                      className="flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-[#FAFAFA] bg-[#18181C] hover:bg-[#222227] border border-[#222227] px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-blue-400" />
                      <span>Print Label</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openDrawer('EDIT', product)}
                        className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 px-3 py-1.5 rounded-xl transition-colors cursor-pointer font-medium"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedIds(new Set([product.id]));
                          setIsDeleteDialogOpen(true);
                        }}
                        className="p-1.5 text-[#71717A] hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-colors cursor-pointer"
                        title="Delete Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── DESKTOP VIEW: POWER DATA TABLE (>= md) ─── */}
      <div className="hidden md:block flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse table">
          <thead className="bg-[#0A0A0A]/90 sticky top-0 z-10 backdrop-blur-md border-b border-[#1F1F1F]">
            <tr>
              <th className="px-4 py-3.5 w-12 text-center">
                <div className="flex justify-center">
                  <Checkbox
                    checked={selectedIds.size === pagedProducts.length && pagedProducts.length > 0}
                    onChange={toggleSelectAll}
                  />
                </div>
              </th>
              <th className="px-4 py-3.5 w-16 text-center"><ImageIcon className="w-4 h-4 mx-auto text-[#71717A]" /></th>
              <th className="px-4 py-3.5 text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">Code</th>
              <th className="px-4 py-3.5 text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">Name</th>
              <th className="px-4 py-3.5 text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">Category</th>
              <th className="px-4 py-3.5 text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">Size (ft)</th>
              <th className="px-4 py-3.5 text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">Added By</th>
              <th className="px-4 py-3.5 text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider text-right">Cost (₹)</th>
              <th className="px-4 py-3.5 text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider text-right">Sell (₹)</th>
              <th className="px-4 py-3.5 text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider text-right">Margin</th>
              <th className="px-4 py-3.5 text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider text-right">Stock</th>
              <th className="px-4 py-3.5 text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider w-16 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F1F1F]/50">
            {pagedProducts.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-16 text-center text-[#71717A]">
                  <Box className="w-10 h-10 mx-auto mb-2 text-[#3F3F46]" />
                  <p className="text-sm font-medium text-[#A1A1AA]">
                    {searchQuery ? "No products match your search." : "No products found."}
                  </p>
                </td>
              </tr>
            ) : (
              pagedProducts.map((product) => {
                const isSelected = selectedIds.has(product.id);
                const firstImg = product.photo_urls && product.photo_urls.length > 0 ? product.photo_urls[0] : null;

                const cost = Number(product.cost_price);
                const sell = Number(product.default_selling_price);
                let marginStr = "-";
                let marginColor = "text-[#71717A]";
                if (cost > 0 && sell > 0) {
                  const marginPct = ((sell - cost) / cost) * 100;
                  marginStr = `${marginPct.toFixed(1)}%`;
                  if (marginPct >= 30) marginColor = "text-emerald-400 font-semibold";
                  else if (marginPct >= 10) marginColor = "text-amber-400 font-medium";
                  else marginColor = "text-red-400 font-medium";
                }

                return (
                  <tr
                    key={product.id}
                    onClick={() => openDrawer('EDIT', product)}
                    className={`transition-colors cursor-pointer group ${
                      isSelected ? 'bg-orange-500/5' : 'hover:bg-[#18181C]'
                    } ${drawerMode === 'EDIT' && drawerProduct?.id === product.id ? 'bg-[#18181C] border-y border-orange-500/30' : ''}`}
                  >
                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-center">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleSelect(product.id)}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                      <div 
                        onClick={() => product.photo_urls && product.photo_urls.length > 0 && setPreviewProduct(product)}
                        className={`w-10 h-10 rounded-xl bg-[#18181C] border border-[#222227] overflow-hidden mx-auto flex items-center justify-center transition-all ${
                          firstImg ? "cursor-pointer hover:border-orange-500 hover:scale-105 shadow-sm" : ""
                        }`}
                        title={firstImg ? "Click to view full image" : "No image"}
                      >
                        {firstImg ? (
                          <img src={imagePresets.thumbnail(firstImg)} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-[#71717A]" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-orange-400/90">{product.product_code}</td>
                    <td className="px-4 py-3 font-medium text-[#FAFAFA]">{product.name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-[#18181C] text-[#A1A1AA] border border-[#222227]">
                        {product.category_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#A1A1AA] text-xs font-mono max-w-[200px]">
                      {product.variants && product.variants.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-[#18181C] text-[#A1A1AA] border border-[#222227]">
                            {product.height ? (product.base ? `H-${product.height} B-${product.base}` : `H-${product.height}`) : "-"}
                          </span>
                          {product.variants.map((v, i) => (
                            <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20 whitespace-nowrap" title={`Stock: ${v.stock_qty} | ₹${v.selling_price}`}>
                              {v.label}
                            </span>
                          ))}
                        </div>
                      ) : (
                        product.height ? (product.base ? `H-${product.height} B-${product.base}` : `H-${product.height}`) : "-"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[#71717A]">
                        {product.created_by_user?.name || "Unknown"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-[#A1A1AA]">₹{cost.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs font-bold text-orange-400">₹{sell.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-xs">
                      <span className={`px-2 py-0.5 rounded-md bg-[#18181C] border border-[#222227] ${marginColor}`}>{marginStr}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-[#FAFAFA]">
                      <span className={`font-semibold ${product.stock_qty <= 5 ? (product.stock_qty === 0 ? 'text-red-400 font-bold' : 'text-amber-400') : 'text-emerald-400'}`}>
                        {product.stock_qty}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handlePrintLabelsClick(product)}
                          className="p-1.5 text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#222227] rounded-lg transition-colors cursor-pointer"
                          title="Print Label"
                        >
                          <Printer className="w-3.5 h-3.5 text-blue-400" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedIds(new Set([product.id]));
                            setIsDeleteDialogOpen(true);
                          }}
                          className="p-1.5 text-[#71717A] hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ─── FLOATING BULK ACTION BAR (MOBILE STICKY) ─── */}
      {selectedIds.size > 0 && (
        <div className="md:hidden fixed bottom-[74px] left-3 right-3 z-40 bg-[#16161A]/95 backdrop-blur-xl border border-orange-500/30 rounded-2xl p-3 shadow-[0_12px_40px_rgba(0,0,0,0.85)] flex items-center justify-between animate-[fadeInUp_0.2s_ease-out]">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedIds.size === pagedProducts.length && pagedProducts.length > 0}
              onChange={toggleSelectAll}
            />
            <span className="text-xs font-bold text-[#FAFAFA]">
              {selectedIds.size} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePrintLabelsClick()}
              disabled={isGeneratingLabel}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              onClick={() => setIsDeleteDialogOpen(true)}
              className="flex items-center gap-1 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>

            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-1.5 text-[#71717A] hover:text-[#FAFAFA] rounded-lg cursor-pointer"
              title="Deselect All"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─── PAGINATION ─── */}
      <TablePagination
        totalItems={totalCount}
        pageSize={pageSize}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      {/* ─── ADD / EDIT PRODUCT DRAWER (MOBILE FULL-SHEET OPTIMIZED) ─── */}
      {mounted && createPortal(
        <>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 bg-[#09090B]/80 z-[99990] transition-opacity duration-300 backdrop-blur-sm ${
              drawerMode !== null ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            onClick={() => setDrawerMode(null)}
          />

          {/* Drawer */}
          <div
            className={`fixed inset-y-0 right-0 h-full w-full sm:max-w-xl bg-[#121215] shadow-2xl z-[99999] border-l border-[#222227] transform transition-transform duration-300 ease-in-out flex flex-col ${
              drawerMode !== null ? "translate-x-0" : "translate-x-full"
            }`}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#222227] bg-[#0F0F12] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
                  <Box className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#FAFAFA]">
                    {drawerMode === 'EDIT' ? "Edit Product" : "Add New Product"}
                  </h3>
                  <p className="text-[11px] text-[#71717A]">
                    {drawerMode === 'EDIT' ? "Update product details and stock" : "Create a new catalog item"}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setDrawerMode(null)} 
                className="p-2 hover:bg-[#18181C] rounded-xl text-[#71717A] hover:text-[#FAFAFA] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar pb-safe">
              <form key={formKey} action={drawerMode === 'ADD' ? addAction : updateAction} className="flex flex-col gap-5" id="drawer-product-form">
                
                {drawerMode === 'EDIT' && drawerProduct && (
                  <input type="hidden" name="id" value={drawerProduct.id} />
                )}

                {/* Product Code */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#A1A1AA]">Product Code</label>
                  <div className="flex gap-2">
                    <input type="hidden" name="product_code" value={`${formCodePrefix}${formCodeSuffix}`} />
                    <input 
                      type="text" 
                      value={formCodePrefix} 
                      onChange={(e) => handlePrefixChange(e.target.value)} 
                      required 
                      className="w-1/3 ds-input uppercase font-mono text-center font-bold text-orange-400" 
                      placeholder="e.g. S" 
                    />
                    <div className="relative flex-1">
                      <input 
                        type="text" 
                        value={formCodeSuffix} 
                        onChange={(e) => setFormCodeSuffix(e.target.value)} 
                        required 
                        className={`w-full ds-input font-mono ${isFetchingSequence ? 'text-[#71717A]' : ''}`} 
                        placeholder="Number (e.g. 01)" 
                      />
                      {isFetchingSequence && (
                        <div className="absolute inset-y-0 right-3 flex items-center">
                          <div className="w-3.5 h-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Product Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#A1A1AA]">Product Name</label>
                  <input 
                    type="text" 
                    name="name" 
                    value={formName} 
                    onChange={e => setFormName(e.target.value)} 
                    required 
                    className="w-full ds-input" 
                    placeholder="e.g. Deluxe Royal Makhar" 
                  />
                </div>

                {/* Category Dropdown */}
                <div className="space-y-1.5 relative z-50">
                  <label className="text-xs font-semibold text-[#A1A1AA]">Category</label>
                  <Dropdown 
                    name="category_id" 
                    options={categories} 
                    value={formCategoryId} 
                    onChange={setFormCategoryId} 
                  />
                </div>

                {/* Dimensions, Stock & Pricing */}
                <div className="grid grid-cols-2 gap-3.5 bg-[#0F0F12] border border-[#222227] p-3.5 rounded-2xl">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#71717A] uppercase">Base (ft)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      name="base" 
                      value={formBase} 
                      onChange={e => setFormBase(e.target.value)} 
                      onWheel={e => e.currentTarget.blur()} 
                      className="w-full ds-input hide-arrows text-sm" 
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#71717A] uppercase">Height (ft)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      name="height" 
                      value={formHeight} 
                      onChange={e => setFormHeight(e.target.value)} 
                      onWheel={e => e.currentTarget.blur()} 
                      className="w-full ds-input hide-arrows text-sm" 
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#71717A] uppercase">Stock Qty</label>
                    <input 
                      type="number" 
                      name="stock_qty" 
                      value={formStockQty} 
                      onChange={e => setFormStockQty(e.target.value)} 
                      onWheel={e => e.currentTarget.blur()} 
                      required 
                      min="0" 
                      className="w-full ds-input hide-arrows text-sm font-semibold" 
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#71717A] uppercase">Cost Price (₹)</label>
                    <input 
                      type="number" 
                      name="cost_price" 
                      value={formCostPrice} 
                      onChange={e => setFormCostPrice(e.target.value)} 
                      onWheel={e => e.currentTarget.blur()} 
                      required 
                      min="0" 
                      step="0.01" 
                      className="w-full ds-input hide-arrows text-sm font-mono" 
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-1 col-span-2 pt-1 border-t border-[#1F1F1F]">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-[#FAFAFA]">Default Selling Price (₹)</label>
                      {formMargin && (
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                          +{formMargin}% Profit
                        </span>
                      )}
                    </div>
                    <input 
                      type="number" 
                      name="default_selling_price" 
                      value={formSellingPrice} 
                      onChange={e => setFormSellingPrice(e.target.value)} 
                      onWheel={e => e.currentTarget.blur()} 
                      required 
                      min="0" 
                      step="0.01" 
                      className="w-full ds-input hide-arrows text-base font-bold font-mono text-orange-400" 
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Size Variants */}
                <div className="space-y-2 border-t border-[#222227] pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-semibold text-[#FAFAFA]">Size Variants</label>
                      <p className="text-[11px] text-[#71717A]">Optional extra sizes with individual prices</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setFormVariants([...formVariants, { label: "", base: 0, height: 0, cost_price: 0, selling_price: 0, stock_qty: 0 }])}
                      className="px-2.5 py-1.5 text-xs ds-btn-ghost flex items-center gap-1.5 cursor-pointer rounded-xl font-medium"
                    >
                      <Plus className="w-3.5 h-3.5 text-orange-400" /> 
                      <span>Add Size</span>
                    </button>
                  </div>

                  <input type="hidden" name="variants" value={JSON.stringify(formVariants.filter(v => v.label && v.label.trim() !== "" && v.selling_price > 0))} />
                  
                  {formVariants.length > 0 ? (
                    <div className="space-y-2.5">
                      {formVariants.map((v, idx) => (
                        <div key={idx} className="bg-[#18181C] p-3.5 rounded-2xl border border-[#222227] space-y-2.5 relative group">
                          <button 
                            type="button" 
                            onClick={() => setFormVariants(formVariants.filter((_, i) => i !== idx))} 
                            className="absolute top-2.5 right-2.5 p-1 text-[#71717A] hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>

                          <div className="grid grid-cols-2 gap-2.5 pr-6">
                            <div>
                              <label className="text-[10px] font-semibold text-[#71717A] uppercase">Base (ft)</label>
                              <input 
                                type="number" 
                                step="0.01" 
                                value={v.base || ""} 
                                onChange={(e) => {
                                  const newV = [...formVariants];
                                  newV[idx].base = parseFloat(e.target.value) || 0;
                                  newV[idx].label = newV[idx].base ? `H-${newV[idx].height} & B-${newV[idx].base}` : `H-${newV[idx].height}`;
                                  setFormVariants(newV);
                                }} 
                                onWheel={e => e.currentTarget.blur()} 
                                className="w-full ds-input p-2 text-xs hide-arrows" 
                                placeholder="0.0"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-[#71717A] uppercase">Height (ft)</label>
                              <input 
                                type="number" 
                                step="0.01" 
                                value={v.height || ""} 
                                onChange={(e) => {
                                  const newV = [...formVariants];
                                  newV[idx].height = parseFloat(e.target.value) || 0;
                                  newV[idx].label = newV[idx].base ? `H-${newV[idx].height} & B-${newV[idx].base}` : `H-${newV[idx].height}`;
                                  setFormVariants(newV);
                                }} 
                                onWheel={e => e.currentTarget.blur()} 
                                className="w-full ds-input p-2 text-xs hide-arrows" 
                                placeholder="0.0"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-[#71717A] uppercase">Cost (₹)</label>
                              <input 
                                type="number" 
                                value={v.cost_price || ""} 
                                onChange={(e) => {
                                  const newV = [...formVariants];
                                  newV[idx].cost_price = parseFloat(e.target.value) || 0;
                                  setFormVariants(newV);
                                }} 
                                onWheel={e => e.currentTarget.blur()} 
                                className="w-full ds-input p-2 text-xs hide-arrows" 
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-[#71717A] uppercase">Sell (₹)</label>
                              <input 
                                type="number" 
                                value={v.selling_price || ""} 
                                onChange={(e) => {
                                  const newV = [...formVariants];
                                  newV[idx].selling_price = parseFloat(e.target.value) || 0;
                                  setFormVariants(newV);
                                }} 
                                onWheel={e => e.currentTarget.blur()} 
                                className="w-full ds-input p-2 text-xs font-semibold text-orange-400 hide-arrows" 
                                placeholder="0.00"
                              />
                            </div>
                            <div className="col-span-2 flex items-center justify-between gap-3 pt-1">
                               <div className="w-1/2">
                                  <label className="text-[10px] font-semibold text-[#71717A] uppercase">Stock</label>
                                  <input 
                                    type="number" 
                                    value={v.stock_qty || ""} 
                                    onChange={(e) => {
                                      const newV = [...formVariants];
                                      newV[idx].stock_qty = parseInt(e.target.value) || 0;
                                      setFormVariants(newV);
                                    }} 
                                    onWheel={e => e.currentTarget.blur()} 
                                    className="w-full ds-input p-2 text-xs hide-arrows" 
                                    placeholder="0"
                                  />
                               </div>
                               <div className="w-1/2 text-right pt-3">
                                 <span className="text-xs font-mono text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-lg">
                                   {v.label || '0x0ft'}
                                 </span>
                               </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-[#71717A] italic p-4 border border-[#222227] border-dashed rounded-2xl text-center bg-[#0F0F12]">
                      No size variants added. Uses product default base & height.
                    </div>
                  )}
                </div>

                {/* Photos */}
                <div className="space-y-1.5 border-t border-[#222227] pt-4">
                  <label className="text-xs font-semibold text-[#FAFAFA]">Photos</label>
                  <input type="hidden" name="photo_urls" value={JSON.stringify(formPhotoUrls)} />
                  <div className="min-h-[160px]">
                    <ImageUploader 
                      onUrlsChange={setFormPhotoUrls} 
                      existingUrls={formPhotoUrls} 
                      productName={formName}
                      productCode={`${formCodePrefix}${formCodeSuffix}`}
                    />
                  </div>
                </div>

              </form>
            </div>

            {/* Sticky Drawer Footer */}
            <div className="p-4 sm:p-5 border-t border-[#222227] bg-[#0F0F12] space-y-3 shrink-0 pb-safe">
              {(addState?.error || updateState?.error) && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{addState?.error || updateState?.error}</span>
                </div>
              )}
              {showSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2 animate-[fadeIn_0.2s_ease-out]">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Product saved successfully!</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDrawerMode(null)}
                  className="flex-1 ds-btn-ghost py-2.5 text-sm font-medium rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="drawer-product-form"
                  disabled={isAdding || isUpdating}
                  className="flex-1 ds-btn-primary py-2.5 text-sm font-semibold rounded-xl disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {(isAdding || isUpdating) ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> 
                      <span>Save Product</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* ─── DELETE CONFIRMATION MODAL ─── */}
      {mounted && (
        <ConfirmDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleDelete}
          title={`Delete ${selectedIds.size} Product${selectedIds.size === 1 ? '' : 's'}?`}
          message="This action cannot be undone. This will permanently delete the selected products from the database."
          confirmText="Delete Products"
          isLoading={isDeleting}
          error={deleteError}
        />
      )}

      {/* ─── PRINT LABELS MODAL ─── */}
      {mounted && printModalItems && createPortal(
        <div className="fixed inset-0 bg-black/75 z-[99999] flex items-start justify-center p-3.5 pt-12 sm:pt-20 backdrop-blur-sm">
          <div className="bg-[#121215] border border-[#222227] rounded-2xl shadow-2xl p-4 sm:p-6 w-full max-w-xl max-h-[90vh] flex flex-col animate-[fadeIn_0.2s_ease-out]">
            <div className="flex justify-between items-center mb-3 shrink-0">
              <h3 className="text-base sm:text-lg font-bold text-[#FAFAFA] flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-400" />
                Print Barcode Labels
              </h3>
              <button 
                onClick={() => setPrintModalItems(null)} 
                className="p-1.5 text-[#71717A] hover:text-[#FAFAFA] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-xs text-[#A1A1AA] mb-4 shrink-0">
              Set the number of label copies to print for each product & size variant.
            </p>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 pr-1 mb-4">
              {printModalItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-[#18181C] rounded-xl border border-[#222227]">
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="text-xs sm:text-sm font-bold text-[#FAFAFA] truncate">
                      {item.product.name} <span className="font-mono text-orange-400 font-medium">({item.product.product_code})</span>
                    </p>
                    {item.variantIndex != null && item.product.variants ? (
                       <p className="text-xs text-orange-400 mt-0.5">Size: {item.product.variants[item.variantIndex].label}</p>
                    ) : (
                       <p className="text-xs text-[#71717A] mt-0.5">Size: {item.product.height ? (item.product.base ? `H-${item.product.height} B-${item.product.base}` : `H-${item.product.height}`) : 'Base Size'}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="text-xs text-[#71717A]">Copies</label>
                    <input 
                      type="number" 
                      min="0"
                      value={item.count}
                      onChange={(e) => {
                        const count = parseInt(e.target.value) || 0;
                        const newItems = [...printModalItems];
                        newItems[idx].count = count;
                        setPrintModalItems(newItems);
                      }}
                      onWheel={e => e.currentTarget.blur()}
                      className="w-16 ds-input py-1.5 text-center font-mono font-bold hide-arrows"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-[#222227] shrink-0">
              <button
                onClick={() => setPrintModalItems(null)}
                className="px-4 py-2 ds-btn-ghost rounded-xl text-xs sm:text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPrint}
                disabled={isGeneratingLabel || printModalItems.filter(i => i.count > 0).length === 0}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors disabled:opacity-40 flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                {isGeneratingLabel ? "Generating..." : `Print ${printModalItems.reduce((acc, i) => acc + (i.count || 0), 0)} Labels`}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── IMAGE VIEWER MODAL ─── */}
      {previewProduct && (
        <ImageViewerModal
          images={previewProduct.photo_urls || []}
          title={`${previewProduct.product_code} - ${previewProduct.name}`}
          subtitle={`₹${previewProduct.default_selling_price} • ${previewProduct.category_name || ""}`}
          isOpen={!!previewProduct}
          onClose={() => setPreviewProduct(null)}
        />
      )}

    </div>
  );
}
