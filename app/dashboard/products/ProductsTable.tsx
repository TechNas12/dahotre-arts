"use client";

import { useState, useActionState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, Edit2, X, Check, Search, AlertTriangle, Image as ImageIcon, ChevronDown, Filter, Printer } from "lucide-react";
import { createProductAction, updateProductAction, deleteProductsAction, Product, Category, getNextProductSequence, ProductVariant } from "@/app/actions/products";
import ImageUploader from "./ImageUploader";
import { generateLabelPdf, LabelPrintItem } from "@/lib/generateLabelPdf";

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={`w-4 h-4 rounded flex items-center justify-center cursor-pointer transition-colors border ${checked ? "bg-orange-500 border-orange-500 text-[#0A0A0A]" : "bg-[#1A1A1A] border-[#1F1F1F] text-transparent hover:border-[#2A2A2A]"
        }`}
    >
      <Check className="w-3 h-3 stroke-[3]" />
    </div>
  );
}

function Dropdown({ name, options, value, onChange, compact = false, className = "w-full" }: { name?: string, options: { id: string | number, name: string }[], value: string | number, onChange: (val: any) => void, compact?: boolean, className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find(o => o.id === value);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const toggleOpen = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (buttonRef.current?.contains(e.target as Node)) return;
      if (dropdownRef.current?.contains(e.target as Node)) return;
      setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const updatePosition = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setCoords({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width
        });
      }
    };
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen]);

  const menu = isOpen && typeof document !== 'undefined' ? createPortal(
    <div
      ref={dropdownRef}
      style={{ top: coords.top, left: coords.left, width: coords.width }}
      className="ds-dropdown"
    >
      {options.map(opt => (
        <div
          key={opt.id}
          onClick={() => { onChange(opt.id); setIsOpen(false); }}
          className={value === opt.id ? 'ds-dropdown-option-active' : 'ds-dropdown-option'}
        >
          {opt.name}
        </div>
      ))}
    </div>,
    document.body
  ) : null;

  return (
    <div className={className}>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        className={`w-full ${compact ? 'py-1.5' : ''} ds-select flex items-center justify-between`}
      >
        <span className="truncate pr-2">{selected?.name || "Select"}</span>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {menu}
    </div>
  );
}

export default function ProductsTable({
  initialProducts,
  categories,
}: {
  initialProducts: Product[];
  categories: Category[];
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [products, setProducts] = useState<Product[]>(initialProducts);

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<number | 'ALL'>('ALL');
  const [filterPrefix, setFilterPrefix] = useState<string | 'ALL'>('ALL');

  const availablePrefixes = useMemo(() => {
    const prefixes = new Set<string>();
    products.forEach(p => {
      const match = p.product_code.match(/^([a-zA-Z]+)/);
      if (match) prefixes.add(match[1].toUpperCase());
    });
    return Array.from(prefixes).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = products;

    if (filterCategory !== 'ALL') {
      result = result.filter(p => p.category_id === filterCategory);
    }

    if (filterPrefix !== 'ALL') {
      result = result.filter(p => {
        const match = p.product_code.match(/^([a-zA-Z]+)/);
        return match && match[1].toUpperCase() === filterPrefix;
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.product_code.toLowerCase().includes(query)
      );
    }

    return result;
  }, [products, searchQuery, filterCategory, filterPrefix]);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map((p) => p.id)));
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
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [addState, updateState, defaultCategoryId]);

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
    }
    setIsDeleting(false);
  };

  const [isGeneratingLabel, setIsGeneratingLabel] = useState(false);
  const [printModalItems, setPrintModalItems] = useState<LabelPrintItem[] | null>(null);

  const handlePrintLabelsClick = () => {
    const selectedProducts = filteredProducts.filter(p => selectedIds.has(p.id));
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
      <div className="p-4 border-b border-[#1F1F1F] flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 bg-[#111111]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => drawerMode === 'ADD' ? setDrawerMode(null) : openDrawer('ADD')}
            className={`flex items-center gap-2 rounded-lg text-sm transition-colors ${drawerMode === 'ADD'
              ? "ds-btn-ghost"
              : "ds-btn-primary"
              }`}
          >
            {drawerMode === 'ADD' ? <ChevronDown className="w-4 h-4 rotate-180" /> : <Plus className="w-4 h-4" />}
            {drawerMode === 'ADD' ? "Close Panel" : "Add Product"}
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
            onClick={handlePrintLabelsClick}
            disabled={selectedIds.size === 0 || isGeneratingLabel}
            className="flex items-center gap-2 bg-[#1A1A1A] hover:bg-blue-500/20 text-[#A3A3A3] hover:text-blue-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-[#1F1F1F] hover:border-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer className="w-4 h-4" />
            {isGeneratingLabel ? "Generating..." : `Print Labels ${selectedIds.size > 0 ? `(${selectedIds.size})` : ""}`}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="w-36">
              <Dropdown
                options={[{ id: 'ALL', name: 'All Categories' }, ...categories]}
                value={filterCategory}
                onChange={setFilterCategory}
                compact
              />
            </div>
            <div className="w-32">
              <Dropdown
                options={[{ id: 'ALL', name: 'All Prefixes' }, ...availablePrefixes.map(p => ({ id: p, name: `Prefix: ${p}` }))]}
                value={filterPrefix}
                onChange={setFilterPrefix}
                compact
              />
            </div>
          </div>
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-[#737373]" />
            </div>
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full ds-input !pl-9"
            />
          </div>
        </div>
      </div>



      {/* Table */}
      <div className="overflow-x-auto min-h-[300px] custom-scrollbar">
        <table className="w-full text-left text-sm text-[#F5F5F5] min-w-[900px]">
          <thead className="text-xs text-[#A3A3A3] uppercase bg-[#0A0A0A]/80 border-b border-[#1F1F1F]">
            <tr>
              <th className="px-4 py-4 w-12 text-center">
                <div className="flex justify-center">
                  <Checkbox
                    checked={selectedIds.size === filteredProducts.length && filteredProducts.length > 0}
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
              <th className="px-4 py-4 font-medium text-right">Stock</th>
              <th className="px-4 py-4 font-medium w-16 text-center">✏</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F1F1F]/50">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-[#737373]">
                  {searchQuery ? "No products match your search." : "No products found."}
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => {
                const isSelected = selectedIds.has(product.id);
                const firstImg = product.photo_urls && product.photo_urls.length > 0 ? product.photo_urls[0] : null;

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
                    <td className="px-4 py-2">
                      <div className="w-10 h-10 rounded bg-[#1A1A1A] border border-[#1F1F1F] overflow-hidden mx-auto flex items-center justify-center">
                        {firstImg ? (
                          <img src={firstImg} alt={product.name} className="w-full h-full object-cover" />
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
                    <td className="px-4 py-3 text-right text-[#A3A3A3]">₹{Number(product.cost_price).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-medium text-orange-400">₹{Number(product.default_selling_price).toFixed(2)}</td>
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
                <input type="number" step="0.01" name="base" value={formBase} onChange={e => setFormBase(e.target.value)} className="w-full ds-input" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#A3A3A3]">Height (ft)</label>
                <input type="number" step="0.01" name="height" value={formHeight} onChange={e => setFormHeight(e.target.value)} className="w-full ds-input" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#A3A3A3]">Stock Qty</label>
                <input type="number" name="stock_qty" value={formStockQty} onChange={e => setFormStockQty(e.target.value)} required min="0" className="w-full ds-input" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#A3A3A3]">Cost Price (₹)</label>
                <input type="number" name="cost_price" value={formCostPrice} onChange={e => setFormCostPrice(e.target.value)} required min="0" step="0.01" className="w-full ds-input" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <div className="flex justify-between items-end">
                  <label className="text-xs font-medium text-[#A3A3A3]">Default Sell Price (₹)</label>
                  {formMargin && <span className="text-[14px] font-medium text-orange-400 bg-orange-500/10 px-3 py-0.5 rounded-full">+{formMargin}% </span>}
                </div>
                <div className="relative">
                  <input type="number" name="default_selling_price" value={formSellingPrice} onChange={e => setFormSellingPrice(e.target.value)} required min="0" step="0.01" className="w-full ds-input" />
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
                  className="px-2 py-1 text-xs ds-btn-ghost flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Size
                </button>
              </div>
              <input type="hidden" name="variants" value={JSON.stringify(formVariants.filter(v => v.label && v.label.trim() !== "" && v.selling_price > 0))} />
              {formVariants.length > 0 ? (
                <div className="space-y-2">
                  {formVariants.map((v, idx) => (
                    <div key={idx} className="bg-[#1A1A1A] p-3 rounded-lg border border-[#1F1F1F] space-y-2 relative group">
                      <button type="button" onClick={() => setFormVariants(formVariants.filter((_, i) => i !== idx))} className="absolute top-2 right-2 text-[#737373] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
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
                          }} className="w-full ds-input p-1.5 text-xs" />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#737373] uppercase">Height(ft)</label>
                          <input type="number" step="0.01" value={v.height || ""} onChange={(e) => {
                            const newV = [...formVariants];
                            newV[idx].height = parseFloat(e.target.value) || 0;
                            newV[idx].label = newV[idx].base ? `H-${newV[idx].height} & B-${newV[idx].base}` : `H-${newV[idx].height}`;
                            setFormVariants(newV);
                          }} className="w-full ds-input p-1.5 text-xs" />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#737373] uppercase">Cost(₹)</label>
                          <input type="number" value={v.cost_price || ""} onChange={(e) => {
                            const newV = [...formVariants];
                            newV[idx].cost_price = parseFloat(e.target.value) || 0;
                            setFormVariants(newV);
                          }} className="w-full ds-input p-1.5 text-xs" />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#737373] uppercase">Sell(₹)</label>
                          <input type="number" value={v.selling_price || ""} onChange={(e) => {
                            const newV = [...formVariants];
                            newV[idx].selling_price = parseFloat(e.target.value) || 0;
                            setFormVariants(newV);
                          }} className="w-full ds-input p-1.5 text-xs" />
                        </div>
                        <div className="col-span-2 flex items-center justify-between">
                           <div className="w-1/2 pr-1">
                              <label className="text-[10px] text-[#737373] uppercase">Stock</label>
                              <input type="number" value={v.stock_qty || ""} onChange={(e) => {
                                const newV = [...formVariants];
                                newV[idx].stock_qty = parseInt(e.target.value) || 0;
                                setFormVariants(newV);
                              }} className="w-full ds-input p-1.5 text-xs" />
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
                <ImageUploader onUrlsChange={setFormPhotoUrls} existingUrls={formPhotoUrls} />
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
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 bg-black/60 z-[99999] flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#1F1F1F] rounded-xl shadow-2xl p-6 w-full max-w-md animate-[fadeIn_0.2s_ease-out]">
            <h3 className="text-lg font-bold text-[#F5F5F5] mb-2">Delete {selectedIds.size} Products?</h3>
            <p className="text-[#A3A3A3] mb-6 text-sm">
              This action cannot be undone. This will permanently delete the selected products from the database.
            </p>

            {deleteError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-red-400 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{deleteError}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2 ds-btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? "Deleting..." : "Delete Products"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Labels Modal */}
      {printModalItems && (
        <div className="fixed inset-0 bg-black/60 z-[99999] flex items-center justify-center p-4">
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
                      className="w-16 ds-input text-center"
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
        </div>
      )}

    </div>
  );
}
