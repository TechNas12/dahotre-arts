"use client";

import { useState, useActionState, useEffect, useMemo, useRef, useCallback, startTransition } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, Edit2, X, Check, Search, AlertTriangle, Image as ImageIcon, ChevronDown, Filter, Printer } from "lucide-react";
import { createProductAction, updateProductAction, deleteProductsAction, Product, Category, getNextProductSequence, ProductVariant, searchProductsAction } from "@/app/actions/products";
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

  const currentPage = initialPage;
  const pageSize = initialPageSize as PageSize;

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
               // Also sync to URL for shareability
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

  const handlePageChange = (page: number) => {
    setSelectedIds(new Set());
    updateURL({ page });
  };

  const handlePageSizeChange = (size: number) => {
    setSelectedIds(new Set());
    updateURL({ pageSize: size, page: 1 });
  };

  const pagedProducts = products;

  // Selection state is declared above (line 136)

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

  const handlePrintLabelsClick = () => {
    const selectedProducts = pagedProducts.filter(p => selectedIds.has(p.id));
    if (selectedProducts.length === 0) return;

    const initialItems: LabelPrintItem[] = [];
    for (const p of selectedProducts) {
      if (p.variants && p.variants.length > 0) {
        // Base product as the first option
        initialItems.push({ product: p, count: 1 });
        // Added variants
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
    <div className="ds-card flex flex-col relative">
      {/* Action Bar */}
      <div className="p-4 border-b border-[#1F1F1F] flex flex-col gap-4 relative z-20">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => openDrawer('ADD')}
              className="flex items-center gap-2 ds-btn-primary rounded-lg text-sm"
            >
              <Plus className="w-4 h-4" />
              New Product
            </button>

            <button
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-2 bg-[#1A1A1A] hover:bg-red-500/20 text-[#A3A3A3] hover:text-red-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-[#1F1F1F] hover:border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              Delete {selectedIds.size > 0 && `(${selectedIds.size})`}
            </button>

            <button
              onClick={() => handlePrintLabelsClick()}
              disabled={selectedIds.size === 0 || isGeneratingLabel}
              className="flex items-center gap-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-[#A3A3A3] hover:text-[#F5F5F5] px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-[#1F1F1F] hover:border-[#3A3A3A] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              {isGeneratingLabel ? "Generating..." : `Print Labels ${selectedIds.size > 0 ? `(${selectedIds.size})` : ""}`}
            </button>
          </div>
          <LiveBadge isConnected={isConnected} />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-80 md:w-96">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              isPending={isPending}
              placeholder="Search by name, code (e.g. S01), category, variant, dimensions, price (₹)..."
            />
          </div>
          
          <div className="w-px h-5 bg-[#1F1F1F] hidden sm:block"></div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Prefix..."
              value={filterPrefix}
              onChange={(e) => setFilterPrefix(e.target.value.toUpperCase())}
              className="w-24 ds-input py-1.5 px-3 text-sm"
            />
          </div>

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
          
          <div className="flex items-center gap-2 bg-[#18181C] border border-[#222227] rounded-xl px-2.5 shadow-sm">
            <span className="text-[#71717A] text-xs">₹</span>
            <input
              type="number"
              placeholder="Min"
              value={priceMin}
              onChange={e => setPriceMin(e.target.value)}
              onWheel={e => e.currentTarget.blur()}
              className="w-16 bg-transparent text-[#FAFAFA] text-sm focus:outline-none py-1.5 hide-arrows"
            />
            <span className="text-[#3F3F46]">-</span>
            <input
              type="number"
              placeholder="Max"
              value={priceMax}
              onChange={e => setPriceMax(e.target.value)}
              onWheel={e => e.currentTarget.blur()}
              className="w-16 bg-transparent text-[#FAFAFA] text-sm focus:outline-none py-1.5 hide-arrows"
            />
          </div>
          
          <label className="flex items-center gap-2 cursor-pointer bg-[#18181C] border border-[#222227] px-3 py-1.5 rounded-xl hover:border-[#2E2E36] transition-colors shadow-sm">
            <Checkbox checked={inStockOnly} onChange={() => setInStockOnly(!inStockOnly)} />
            <span className="text-xs sm:text-sm font-medium text-[#A1A1AA]">In Stock</span>
          </label>
        </div>

        {searchQuery.trim() && (
          <div className="flex items-center justify-between bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded-xl text-xs mt-1 animate-[fadeIn_0.2s_ease-out]">
            <div className="flex items-center gap-2 text-orange-400">
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span>Found <strong className="text-[#FAFAFA] font-bold">{total}</strong> products matching &ldquo;{searchQuery}&rdquo;</span>
            </div>
            <button 
              onClick={() => setSearchQuery("")}
              className="text-orange-400 hover:text-white font-medium flex items-center gap-1 cursor-pointer transition-colors"
              title="Clear Search"
            >
              <X className="w-3.5 h-3.5" /> Clear search
            </button>
          </div>
        )}
      </div>

      <TablePagination
        totalItems={totalCount}
        pageSize={pageSize}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      <div className="flex-1 overflow-auto custom-scrollbar overflow-x-hidden md:overflow-x-auto">
        <table className="w-full text-left border-collapse block md:table">
          <thead className="bg-[#0A0A0A]/80 sticky top-0 z-10 backdrop-blur-sm hidden md:table-header-group border-b border-[#1F1F1F]">
            <tr>
              <th className="px-4 py-4 w-12 text-center">
                <div className="flex justify-center">
                  <Checkbox
                    checked={selectedIds.size === pagedProducts.length && pagedProducts.length > 0}
                    onChange={toggleSelectAll}
                  />
                </div>
              </th>
              <th className="px-4 py-4 w-16 text-center"><ImageIcon className="w-4 h-4 mx-auto" /></th>
              <th className="px-4 py-4 font-medium">Code</th>
              <th className="px-4 py-4 font-medium">Name</th>
              <th className="px-4 py-4 font-medium">Category</th>
              <th className="px-4 py-4 font-medium">Size (ft)</th>
              <th className="px-4 py-4 font-medium">Added By</th>
              <th className="px-4 py-4 font-medium text-right">Cost (₹)</th>
              <th className="px-4 py-4 font-medium text-right">Sell (₹)</th>
              <th className="px-4 py-4 font-medium text-right">Margin</th>
              <th className="px-4 py-4 font-medium text-right">Stock</th>
              <th className="px-4 py-4 font-medium w-16 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F1F1F]/50 block md:table-row-group">
            {pagedProducts.length === 0 ? (
              <tr className="block md:table-row">
                <td colSpan={11} className="px-4 py-12 text-center text-[#737373] block md:table-cell">
                  {searchQuery ? "No products match your search." : "No products found."}
                </td>
              </tr>
            ) : (
              pagedProducts.map((product) => {
                const isSelected = selectedIds.has(product.id);
                const firstImg = product.photo_urls && product.photo_urls.length > 0 ? product.photo_urls[0] : null;

                // Margin calculation
                const cost = Number(product.cost_price);
                const sell = Number(product.default_selling_price);
                let marginStr = "-";
                let marginColor = "text-[#737373]";
                if (cost > 0 && sell > 0) {
                  const marginPct = ((sell - cost) / cost) * 100;
                  marginStr = `${marginPct.toFixed(1)}%`;
                  if (marginPct >= 30) marginColor = "text-green-400 font-medium";
                  else if (marginPct >= 10) marginColor = "text-amber-400 font-medium";
                  else marginColor = "text-red-400 font-medium";
                }

                return (
                  <tr
                    key={product.id}
                    onClick={() => openDrawer('EDIT', product)}
                    className={`transition-colors cursor-pointer group ${isSelected ? 'bg-orange-500/5' : 'hover:bg-[#1A1A1A]'} ${drawerMode === 'EDIT' && drawerProduct?.id === product.id ? 'bg-[#1A1A1A] border-y border-orange-500/20' : ''}`}
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
                        className={`w-10 h-10 rounded-lg bg-[#1A1A1A] border border-[#1F1F1F] overflow-hidden mx-auto flex items-center justify-center transition-all ${
                          firstImg ? "cursor-pointer hover:border-orange-500 hover:scale-105 shadow-sm" : ""
                        }`}
                        title={firstImg ? "Click to view full image" : "No image"}
                      >
                        {firstImg ? (
                          <img src={imagePresets.thumbnail(firstImg)} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-[#737373]" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#A3A3A3]">{product.product_code}</td>
                    <td className="px-4 py-3 font-medium text-[#F5F5F5]">{product.name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#1A1A1A] text-[#A3A3A3] border border-[#1F1F1F]">
                        {product.category_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#A3A3A3] text-xs font-mono max-w-[200px]">
                      {product.variants && product.variants.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#1A1A1A] text-[#A3A3A3] border border-[#1F1F1F]">
                            {product.height ? (product.base ? `H-${product.height} B-${product.base}` : `H-${product.height}`) : "-"}
                          </span>
                          {product.variants.map((v, i) => (
                            <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20 whitespace-nowrap" title={`Stock: ${v.stock_qty} | ₹${v.selling_price}`}>
                              {v.label}
                            </span>
                          ))}
                        </div>
                      ) : (
                        product.height ? (product.base ? `H-${product.height} B-${product.base}` : `H-${product.height}`) : "-"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[#737373] bg-[#0A0A0A]/50 px-2 py-1 rounded">
                        {product.created_by_user?.name || "Unknown"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-[#A3A3A3]">₹{cost.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-medium text-orange-400">₹{sell.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-xs">
                      <span className={`px-1.5 py-0.5 rounded bg-[#1A1A1A] border border-[#1F1F1F] ${marginColor}`}>{marginStr}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-[#F5F5F5]">
                      <span className={`${product.stock_qty <= 5 ? (product.stock_qty === 0 ? 'text-red-400 font-bold' : 'text-amber-400') : ''}`}>
                        {product.stock_qty}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setSelectedIds(new Set([product.id]));
                          setIsDeleteDialogOpen(true);
                        }}
                        className="p-1.5 text-[#737373] hover:text-red-400 hover:bg-red-400/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Slide-out Add Product Drawer */}
      {mounted && createPortal(
        <>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 bg-[#0A0A0A]/80 z-[99990] transition-opacity duration-300 backdrop-blur-sm ${drawerMode !== null ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            onClick={() => setDrawerMode(null)}
          />

          {/* Drawer */}
          <div
            className={`fixed top-0 right-0 h-full w-full max-w-xl bg-[#111111] shadow-2xl z-[99999] border-l border-[#1F1F1F] transform transition-transform duration-300 ease-in-out flex flex-col ${drawerMode !== null ? "translate-x-0" : "translate-x-full"
              }`}
          >
            <div className="flex items-center justify-between p-6 border-b border-[#1F1F1F] bg-[#0A0A0A] shrink-0">
              <h3 className="text-lg font-medium text-[#F5F5F5]">
                {drawerMode === 'EDIT' ? "Edit Product" : "Add New Product"}
              </h3>
              <button onClick={() => setDrawerMode(null)} className="p-2 hover:bg-[#2A2A2A] rounded-full text-[#737373] hover:text-[#F5F5F5] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <form key={formKey} action={drawerMode === 'ADD' ? addAction : updateAction} className="flex flex-col gap-5" id="drawer-product-form">
            
            {drawerMode === 'EDIT' && drawerProduct && (
              <input type="hidden" name="id" value={drawerProduct.id} />
            )}

            {/* Product Code */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#A3A3A3]">Product Code</label>
              <div className="flex gap-2">
                <input type="hidden" name="product_code" value={`${formCodePrefix}${formCodeSuffix}`} />
                <input type="text" value={formCodePrefix} onChange={(e) => handlePrefixChange(e.target.value)} required className="w-1/3 ds-input uppercase" placeholder="e.g. S" />
                <div className="relative flex-1">
                  <input type="text" value={formCodeSuffix} onChange={(e) => setFormCodeSuffix(e.target.value)} required className={`w-full ds-input ${isFetchingSequence ? 'text-[#737373]' : ''}`} placeholder="Number (e.g. 01)" />
                  {isFetchingSequence && <div className="absolute inset-y-0 right-3 flex items-center"><div className="w-3.5 h-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>}
                </div>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#A3A3A3]">Product Name</label>
              <input type="text" name="name" value={formName} onChange={e => setFormName(e.target.value)} required className="w-full ds-input" placeholder="e.g. Deluxe Makhar" />
            </div>

            {/* Category */}
            <div className="space-y-1.5 relative z-50">
              <label className="text-xs font-medium text-[#A3A3A3]">Category</label>
              <Dropdown name="category_id" options={categories} value={formCategoryId} onChange={setFormCategoryId} />
            </div>

            {/* Prices & Stock */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#A3A3A3]">Base (ft)</label>
                <input type="number" step="0.01" name="base" value={formBase} onChange={e => setFormBase(e.target.value)} onWheel={e => e.currentTarget.blur()} className="w-full ds-input hide-arrows" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#A3A3A3]">Height (ft)</label>
                <input type="number" step="0.01" name="height" value={formHeight} onChange={e => setFormHeight(e.target.value)} onWheel={e => e.currentTarget.blur()} className="w-full ds-input hide-arrows" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#A3A3A3]">Stock Qty</label>
                <input type="number" name="stock_qty" value={formStockQty} onChange={e => setFormStockQty(e.target.value)} onWheel={e => e.currentTarget.blur()} required min="0" className="w-full ds-input hide-arrows" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#A3A3A3]">Cost Price (₹)</label>
                <input type="number" name="cost_price" value={formCostPrice} onChange={e => setFormCostPrice(e.target.value)} onWheel={e => e.currentTarget.blur()} required min="0" step="0.01" className="w-full ds-input hide-arrows" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <div className="flex justify-between items-end">
                  <label className="text-xs font-medium text-[#A3A3A3]">Default Sell Price (₹)</label>
                  {formMargin && <span className="text-[14px] font-medium text-orange-400 bg-orange-500/10 px-3 py-0.5 rounded-full">+{formMargin}% </span>}
                </div>
                <div className="relative">
                  <input type="number" name="default_selling_price" value={formSellingPrice} onChange={e => setFormSellingPrice(e.target.value)} onWheel={e => e.currentTarget.blur()} required min="0" step="0.01" className="w-full ds-input hide-arrows" />
                </div>
              </div>
            </div>

            {/* Size Variants */}
            <div className="space-y-1.5 border-t border-[#2A2A2A] pt-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[#A3A3A3]">Size Variants</label>
                <button 
                  type="button" 
                  onClick={() => setFormVariants([...formVariants, { label: "", base: 0, height: 0, cost_price: 0, selling_price: 0, stock_qty: 0 }])}
                  className="px-2 py-1 text-xs ds-btn-ghost flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add Size
                </button>
              </div>
              <input type="hidden" name="variants" value={JSON.stringify(formVariants.filter(v => v.label && v.label.trim() !== "" && v.selling_price > 0))} />
              {formVariants.length > 0 ? (
                <div className="space-y-2">
                  {formVariants.map((v, idx) => (
                    <div key={idx} className="bg-[#1A1A1A] p-3 rounded-lg border border-[#1F1F1F] space-y-2 relative group">
                      <button type="button" onClick={() => setFormVariants(formVariants.filter((_, i) => i !== idx))} className="absolute top-2 right-2 text-[#737373] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <X className="w-4 h-4" />
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-[#737373] uppercase">Base(ft)</label>
                          <input type="number" step="0.01" value={v.base || ""} onChange={(e) => {
                            const newV = [...formVariants];
                            newV[idx].base = parseFloat(e.target.value) || 0;
                            newV[idx].label = newV[idx].base ? `H-${newV[idx].height} & B-${newV[idx].base}` : `H-${newV[idx].height}`;
                            setFormVariants(newV);
                          }} onWheel={e => e.currentTarget.blur()} className="w-full ds-input p-1.5 text-xs hide-arrows" />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#737373] uppercase">Height(ft)</label>
                          <input type="number" step="0.01" value={v.height || ""} onChange={(e) => {
                            const newV = [...formVariants];
                            newV[idx].height = parseFloat(e.target.value) || 0;
                            newV[idx].label = newV[idx].base ? `H-${newV[idx].height} & B-${newV[idx].base}` : `H-${newV[idx].height}`;
                            setFormVariants(newV);
                          }} onWheel={e => e.currentTarget.blur()} className="w-full ds-input p-1.5 text-xs hide-arrows" />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#737373] uppercase">Cost(₹)</label>
                          <input type="number" value={v.cost_price || ""} onChange={(e) => {
                            const newV = [...formVariants];
                            newV[idx].cost_price = parseFloat(e.target.value) || 0;
                            setFormVariants(newV);
                          }} onWheel={e => e.currentTarget.blur()} className="w-full ds-input p-1.5 text-xs hide-arrows" />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#737373] uppercase">Sell(₹)</label>
                          <input type="number" value={v.selling_price || ""} onChange={(e) => {
                            const newV = [...formVariants];
                            newV[idx].selling_price = parseFloat(e.target.value) || 0;
                            setFormVariants(newV);
                          }} onWheel={e => e.currentTarget.blur()} className="w-full ds-input p-1.5 text-xs hide-arrows" />
                        </div>
                        <div className="col-span-2 flex items-center justify-between">
                           <div className="w-1/2 pr-1">
                              <label className="text-[10px] text-[#737373] uppercase">Stock</label>
                              <input type="number" value={v.stock_qty || ""} onChange={(e) => {
                                const newV = [...formVariants];
                                newV[idx].stock_qty = parseInt(e.target.value) || 0;
                                setFormVariants(newV);
                              }} onWheel={e => e.currentTarget.blur()} className="w-full ds-input p-1.5 text-xs hide-arrows" />
                           </div>
                           <div className="w-1/2 pl-1 pt-4 text-right">
                             <span className="text-xs font-mono text-orange-400 bg-orange-500/10 px-2 py-1 rounded">{v.label || '0x0ft'}</span>
                           </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-[#737373] italic p-3 border border-[#1F1F1F] border-dashed rounded-lg text-center">No size variants added. Uses product's base/height.</div>
              )}
            </div>

            {/* Photos */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#A3A3A3]">Photos</label>
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

        {/* Footer */}
        <div className="p-5 border-t border-[#1F1F1F] bg-[#111111] space-y-3 shrink-0">
          {(addState?.error || updateState?.error) && (
            <div className="p-2 rounded bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              {addState?.error || updateState?.error}
            </div>
          )}
          {showSuccess && (
            <div className="p-2 rounded bg-green-500/10 border border-green-500/20 text-xs text-green-400 flex items-center gap-1.5 animate-[fadeIn_0.2s_ease-out]">
              <Check className="w-3 h-3" />
              Product saved!
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setDrawerMode(null)}
              className="flex-1 ds-btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="drawer-product-form"
              disabled={isAdding || isUpdating}
              className="flex-1 ds-btn-primary disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {(isAdding || isUpdating) ? "Saving..." : <><Check className="w-4 h-4" /> Save</>}
            </button>
          </div>
        </div>
      </div>
      </>,
      document.body
    )}

      {/* Delete Confirmation Modal */}
      {mounted && (
        <ConfirmDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleDelete}
          title={`Delete ${selectedIds.size} Products?`}
          message="This action cannot be undone. This will permanently delete the selected products from the database."
          confirmText="Delete Products"
          isLoading={isDeleting}
          error={deleteError}
        />
      )}

      {/* Print Labels Modal */}
      {mounted && printModalItems && createPortal(
        <div className="fixed inset-0 bg-black/60 z-[99999] flex items-start justify-center p-4 pt-16 sm:pt-24">
          <div className="bg-[#111111] border border-[#1F1F1F] rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col animate-[fadeIn_0.2s_ease-out]">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="text-lg font-bold text-[#F5F5F5] flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-400" />
                Print Labels
              </h3>
              <button onClick={() => setPrintModalItems(null)} className="text-[#737373] hover:text-[#F5F5F5]">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm text-[#A3A3A3] mb-4 shrink-0">Select the number of labels to print for each product variant.</p>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2 mb-4">
              {printModalItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg border border-[#1F1F1F]">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-sm font-bold text-[#F5F5F5]">{item.product.name} ({item.product.product_code})</p>
                    {item.variantIndex != null && item.product.variants ? (
                       <p className="text-xs text-orange-400 mt-1">Size: {item.product.variants[item.variantIndex].label}</p>
                    ) : (
                       <p className="text-xs text-[#A3A3A3] mt-1">Size: {item.product.height ? (item.product.base ? `H-${item.product.height} B-${item.product.base}` : `H-${item.product.height}`) : 'Base Size'}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-[#737373]">Copies</label>
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
                      className="w-16 ds-input text-center hide-arrows"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1F1F1F] shrink-0">
              <button
                onClick={() => setPrintModalItems(null)}
                className="px-4 py-2 ds-btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPrint}
                disabled={isGeneratingLabel || printModalItems.filter(i => i.count > 0).length === 0}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                {isGeneratingLabel ? "Generating..." : `Print ${printModalItems.reduce((acc, i) => acc + (i.count || 0), 0)} Labels`}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

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
