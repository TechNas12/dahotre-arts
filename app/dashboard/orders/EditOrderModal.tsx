"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { 
  X, Plus, Minus, Search, CreditCard, Package, Check, Trash2, 
  Calendar, User, Phone, MapPin, 
  CheckCircle2, Clock, Ban, Truck, ShieldAlert, Sparkles, Copy
} from "lucide-react";
import { updateOrderAction, Order, EditOrderPayload, getOrderDetails } from "@/app/actions/orders";
import { Product } from "@/app/actions/products";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

export default function EditOrderModal({
  order,
  products,
  onClose,
  onSuccess,
}: {
  order: Order;
  products: Product[];
  onClose: () => void;
  onSuccess: (updatedOrder: Order) => void;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [copiedOrderNo, setCopiedOrderNo] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [status, setStatus] = useState<string>(order.status);
  const [fulfillmentStatus, setFulfillmentStatus] = useState<string>(order.fulfillment_status);
  
  // Clone items for editing
  const [items, setItems] = useState(() => 
    order.items?.map(i => ({
      ...i,
      _id: Math.random().toString(36).substring(2, 9), 
      sellingPriceStr: String(i.selling_price),
      quantity: Number(i.quantity) || 1
    })) || []
  );

  const [discountStr, setDiscountStr] = useState(() => {
    const itemSum = (order.items || []).reduce((acc, i) => acc + (parseFloat(String(i.selling_price)) || 0) * i.quantity, 0);
    const orderTotal = parseFloat(String(order.total_amount)) || 0;
    
    if (Math.abs(itemSum - orderTotal) < 0.1) {
      return "0";
    }
    return String(order.discount || 0);
  });

  // Clone payments for editing
  const [payments, setPayments] = useState(() =>
    order.payments?.map(p => ({
      ...p,
      amountStr: String(p.amount)
    })) || []
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Product Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchDropdownRef.current && 
        !searchDropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    return products.filter((p) => {
      const matchName = p.name?.toLowerCase().includes(query);
      const matchCode = p.product_code?.toLowerCase().includes(query);
      const matchCat = p.category_name?.toLowerCase().includes(query);
      return matchName || matchCode || matchCat;
    }).slice(0, 30);
  }, [products, searchQuery]);

  // Derived financial calculations
  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => {
      const price = parseFloat(item.sellingPriceStr) || 0;
      return acc + (item.quantity * price);
    }, 0);
  }, [items]);

  const discountVal = useMemo(() => {
    const d = parseFloat(discountStr);
    return isNaN(d) || d < 0 ? 0 : d;
  }, [discountStr]);

  const discountPercentage = useMemo(() => {
    if (subtotal <= 0 || discountVal <= 0) return 0;
    return Math.min(100, Math.round((discountVal / subtotal) * 100 * 10) / 10);
  }, [subtotal, discountVal]);

  const totalAmount = useMemo(() => {
    return Math.max(0, Math.round((subtotal - discountVal) * 100) / 100);
  }, [subtotal, discountVal]);

  const totalPaid = useMemo(() => {
    return payments.reduce((acc, p) => acc + (parseFloat(p.amountStr) || 0), 0);
  }, [payments]);

  const balanceDue = useMemo(() => {
    return Math.max(0, Math.round((totalAmount - totalPaid) * 100) / 100);
  }, [totalAmount, totalPaid]);

  // Keyboard shortcut handler (Ctrl+Enter to save, Esc to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isSearchOpen) {
          setIsSearchOpen(false);
        } else if (!isSubmitting) {
          onClose();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (!isSubmitting) {
          handleSave();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen, isSubmitting, items, status, fulfillmentStatus, discountStr, payments, totalAmount, totalPaid]);

  // Actions
  const updateItemQty = (id: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item._id === id) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const setItemDirectQty = (id: string, qtyStr: string) => {
    const val = parseInt(qtyStr, 10);
    setItems(prev => prev.map(item => {
      if (item._id === id) {
        return { ...item, quantity: isNaN(val) || val < 1 ? 1 : val };
      }
      return item;
    }));
  };

  const updateItemPrice = (id: string, val: string) => {
    setItems(prev => prev.map(item => {
      if (item._id === id) {
        return { ...item, sellingPriceStr: val };
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item._id !== id));
  };

  const addProduct = (product: Product, variantIndex?: number) => {
    const existing = items.find(i => i.product?.id === product.id && i.variant_index === variantIndex);
    if (existing) {
      updateItemQty(existing._id, 1);
    } else {
      const defaultPrice = variantIndex != null && product.variants ? product.variants[variantIndex].selling_price : product.default_selling_price;
      setItems(prev => [...prev, {
        _id: Math.random().toString(36).substring(2, 9),
        quantity: 1,
        selling_price: defaultPrice,
        sellingPriceStr: String(defaultPrice),
        subtotal: defaultPrice,
        variant_index: variantIndex ?? null,
        product: {
          id: product.id,
          product_code: product.product_code,
          name: product.name,
          base: product.base ?? null,
          height: product.height ?? null,
          variants: product.variants,
          cost_price: product.cost_price,
          default_selling_price: product.default_selling_price
        }
      }]);
    }
    setSearchQuery("");
    setIsSearchOpen(false);
  };

  const addPayment = (prefilledAmount?: number) => {
    const amt = prefilledAmount != null ? prefilledAmount : 0;
    setPayments(prev => [...prev, {
      id: -Math.random(),
      payment_mode: "CASH",
      payment_type: payments.length === 0 ? "ADVANCE" : "FINAL",
      amount: amt,
      amountStr: amt > 0 ? String(amt) : ""
    }]);
  };

  const settleFullBalance = () => {
    if (balanceDue <= 0) return;
    addPayment(balanceDue);
  };

  const updatePayment = (id: number, field: string, val: string) => {
    setPayments(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, [field]: val };
      }
      return p;
    }));
  };

  const removePayment = (id: number) => {
    setPayments(prev => prev.filter(p => p.id !== id));
  };

  const applyDiscountPreset = (type: "fixed" | "percent", val: number) => {
    if (type === "percent") {
      const computed = Math.round((subtotal * (val / 100)));
      setDiscountStr(String(computed));
    } else {
      setDiscountStr(String(val));
    }
  };

  const handleCopyOrderNo = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(order.order_no);
      setCopiedOrderNo(true);
      setTimeout(() => setCopiedOrderNo(false), 2000);
    }
  };

  const handleSave = async () => {
    setErrorMsg("");
    if (items.length === 0) {
      setErrorMsg("Order must have at least one product item.");
      return;
    }
    
    // Validate selling prices & cost prices
    for (const item of items) {
      const sp = parseFloat(item.sellingPriceStr);
      if (isNaN(sp) || sp < 0) {
        setErrorMsg(`Please enter a valid selling price for ${item.product?.product_code || 'item'}.`);
        return;
      }
      const cost = item.variant_index != null && item.product?.variants 
        ? item.product.variants[item.variant_index].cost_price 
        : item.product?.cost_price;
        
      if (cost !== undefined && cost !== null && sp < cost) {
        setErrorMsg(`Selling price for ${item.product?.product_code} (₹${sp}) cannot be lower than cost price (₹${cost}).`);
        return;
      }
    }

    if (discountVal > subtotal) {
      setErrorMsg(`Discount (₹${discountVal}) cannot exceed order subtotal (₹${subtotal}).`);
      return;
    }

    if (status === 'COMPLETED' && totalPaid < totalAmount) {
      setErrorMsg(`Order cannot be marked as COMPLETED until full payment is recorded (Balance remaining: ₹${balanceDue}).`);
      return;
    }

    setIsSubmitting(true);

    const newPayments = payments.filter(p => p.id < 0 && parseFloat(p.amountStr) > 0).map(p => ({
      amount: parseFloat(p.amountStr),
      paymentMode: p.payment_mode as "CASH" | "ONLINE",
      paymentType: p.payment_type as "FULL" | "ADVANCE" | "FINAL"
    }));

    const unchangedPaymentIds: number[] = [];
    const originalPayments = order.payments || [];
    
    for (const p of payments) {
      if (p.id > 0) {
        const orig = originalPayments.find(op => op.id === p.id);
        if (orig && (orig.amount !== parseFloat(p.amountStr) || orig.payment_mode !== p.payment_mode || orig.payment_type !== p.payment_type)) {
          // Modified payment -> recreate it
          newPayments.push({
            amount: parseFloat(p.amountStr),
            paymentMode: p.payment_mode as "CASH" | "ONLINE",
            paymentType: p.payment_type as "FULL" | "ADVANCE" | "FINAL"
          });
        } else {
          unchangedPaymentIds.push(p.id);
        }
      }
    }

    const payload: EditOrderPayload = {
      orderId: order.id,
      discount: discountVal,
      totalAmount,
      status,
      fulfillmentStatus,
      items: items.map(i => ({
        productId: i.product!.id,
        variantIndex: i.variant_index,
        quantity: i.quantity,
        sellingPrice: parseFloat(i.sellingPriceStr)
      })),
      existingPaymentIds: unchangedPaymentIds,
      newPayments
    };

    const res = await updateOrderAction(payload);
    if (res.error) {
      setErrorMsg(res.error);
      setIsSubmitting(false);
    } else {
      const freshData = await getOrderDetails(order.id);
      if (freshData) {
        onSuccess(freshData);
      } else {
        router.refresh();
        onClose();
      }
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-[fadeIn_0.15s_ease-out]">
      <div className="bg-[#0F0F10] border border-[#262626] rounded-2xl shadow-2xl w-[96vw] max-w-6xl xl:max-w-7xl h-[92vh] max-h-[94vh] flex flex-col overflow-hidden">
        
        {/* TOP HEADER */}
        <div className="px-6 py-4 border-b border-[#222222] bg-[#141416] flex flex-wrap justify-between items-center gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-center text-orange-400 shadow-sm shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg sm:text-xl font-bold text-[#F5F5F5] tracking-tight">
                  Edit Order
                </h2>
                <div className="flex items-center gap-1 bg-[#1E1E22] border border-[#2E2E34] px-2.5 py-0.5 rounded-md">
                  <span className="font-mono text-xs font-bold text-orange-400 tracking-wider">
                    {order.order_no}
                  </span>
                  <button 
                    onClick={handleCopyOrderNo} 
                    className="text-[#737373] hover:text-[#F5F5F5] transition-colors ml-1 cursor-pointer"
                    title="Copy Order No."
                  >
                    {copiedOrderNo ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#8E8E93] mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#737373]" />
                  {new Date(order.order_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                {order.user?.name && (
                  <span className="text-[#55555A]">• Billed by <strong className="text-[#A3A3A3] font-medium">{order.user.name}</strong></span>
                )}
              </div>
            </div>
          </div>

          {/* Customer Summary Capsule */}
          {order.customer && (
            <div className="hidden md:flex items-center gap-3 px-3.5 py-2 bg-[#1A1A1E] border border-[#2A2A30] rounded-xl text-xs">
              <div className="w-7 h-7 rounded-lg bg-[#24242A] text-orange-400 flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 max-w-[240px]">
                <div className="font-bold text-[#F5F5F5] truncate">{order.customer.name}</div>
                <div className="flex items-center gap-2 text-[#8E8E93] truncate">
                  {order.customer.phone && (
                    <a href={`tel:${order.customer.phone}`} className="hover:text-orange-400 flex items-center gap-0.5">
                      <Phone className="w-3 h-3 text-[#737373]" /> {order.customer.phone}
                    </a>
                  )}
                  {order.customer.address && (
                    <span className="truncate flex items-center gap-0.5" title={order.customer.address}>
                      <MapPin className="w-3 h-3 text-[#737373]" /> {order.customer.address}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Quick Header Close Action */}
          <div className="flex items-center gap-2">
            <button 
              onClick={onClose} 
              disabled={isSubmitting}
              className="text-[#8E8E93] hover:text-[#F5F5F5] p-2 rounded-xl hover:bg-[#24242A] transition-colors border border-transparent hover:border-[#333338] cursor-pointer"
              title="Close modal (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MAIN BODY: 2-COLUMN EXPANDED LAYOUT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-[#0A0A0B]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN: PRODUCT SEARCH & ORDER ITEMS (7 cols on lg, 8 cols on xl) */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-5">
              
              {/* Quick Inline Product Search Bar */}
              <div className="bg-[#141416] border border-[#24242A] rounded-xl p-3.5 relative shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-orange-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setIsSearchOpen(true);
                      }}
                      onFocus={() => {
                        if (searchQuery.trim()) setIsSearchOpen(true);
                      }}
                      placeholder="Type to search and add products by code, name, or category..."
                      className="w-full bg-[#1A1A1E] border border-[#2A2A32] focus:border-orange-500/80 focus:ring-2 focus:ring-orange-500/20 text-[#F5F5F5] placeholder-[#66666E] text-sm rounded-lg pl-10 pr-4 py-2.5 outline-none transition-all"
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => {
                          setSearchQuery("");
                          setIsSearchOpen(false);
                        }} 
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#F5F5F5] p-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  
                  <span className="text-xs text-[#737373] font-medium hidden sm:inline-block px-2">
                    {items.length} {items.length === 1 ? 'item' : 'items'} in order
                  </span>
                </div>

                {/* Instant Product Search Dropdown */}
                {isSearchOpen && (
                  <div 
                    ref={searchDropdownRef}
                    className="absolute left-0 right-0 top-full mt-2 z-50 bg-[#16161A] border border-[#2E2E38] rounded-xl shadow-2xl max-h-80 overflow-y-auto custom-scrollbar p-2 space-y-1.5 animate-[fadeIn_0.1s_ease-out]"
                  >
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((p) => (
                        <div 
                          key={p.id} 
                          className="p-3 bg-[#1D1D22] hover:bg-[#25252C] border border-[#282830] rounded-lg transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                                {p.product_code}
                              </span>
                              <span className="font-semibold text-sm text-[#F5F5F5] truncate">{p.name}</span>
                              {p.category_name && (
                                <span className="text-[10px] text-[#8E8E93] bg-[#2A2A32] px-1.5 py-0.5 rounded">
                                  {p.category_name}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-[#8E8E93] mt-1.5">
                              {p.cost_price !== undefined && (
                                <span>Cost: <strong className="text-[#A3A3A3]">₹{p.cost_price}</strong></span>
                              )}
                              <span>Stock: <strong className={p.stock_qty > 0 ? "text-emerald-400" : "text-rose-400"}>{p.stock_qty}</strong></span>
                            </div>
                          </div>

                          {/* Variants or Direct Add */}
                          {p.variants && p.variants.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {p.variants.map((v, vIdx) => (
                                <button
                                  key={vIdx}
                                  type="button"
                                  onClick={() => addProduct(p, vIdx)}
                                  className="px-2.5 py-1.5 bg-[#25252E] hover:bg-orange-500 hover:text-white border border-[#33333E] hover:border-orange-500 rounded-md text-xs transition-all flex items-center gap-1.5 text-[#E5E5EA] group cursor-pointer"
                                >
                                  <span className="font-medium">{v.label}</span>
                                  <span className="font-bold text-orange-400 group-hover:text-white">₹{v.selling_price}</span>
                                  <Plus className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold text-orange-400">
                                ₹{p.default_selling_price}
                              </span>
                              <button
                                type="button"
                                onClick={() => addProduct(p)}
                                className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" /> Add
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-[#737373]">
                        {searchQuery.trim() ? "No products match your search." : "Type above to search products."}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Order Items Table & Management */}
              <div className="bg-[#141416] border border-[#24242A] rounded-xl overflow-hidden shadow-sm flex flex-col">
                <div className="p-4 border-b border-[#222226] bg-[#18181C] flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#A3A3A3]">
                      Order Items ({items.length})
                    </h3>
                  </div>
                  <span className="text-xs text-[#737373]">
                    Click price to customize unit selling price
                  </span>
                </div>

                {/* Items List */}
                <div className="divide-y divide-[#1F1F24] max-h-[52vh] overflow-y-auto custom-scrollbar">
                  {items.map((item, idx) => {
                    const price = parseFloat(item.sellingPriceStr) || 0;
                    const itemLineSubtotal = price * item.quantity;
                    const costPrice = item.variant_index != null && item.product?.variants 
                      ? item.product.variants[item.variant_index].cost_price 
                      : item.product?.cost_price;
                    const isBelowCost = costPrice !== undefined && costPrice !== null && price < costPrice;
                    const profitPerUnit = costPrice !== undefined && costPrice !== null ? price - costPrice : null;

                    return (
                      <div 
                        key={item._id} 
                        className={`p-4 hover:bg-[#18181C] transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${isBelowCost ? 'bg-rose-950/10 border-l-2 border-l-rose-500' : ''}`}
                      >
                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                              {item.product?.product_code || 'ITEM'}
                            </span>
                            <span className="text-sm font-semibold text-[#F5F5F5] truncate">
                              {item.product?.name || 'Product'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {item.variant_index != null && item.product?.variants && item.product.variants[item.variant_index] && (
                              <span className="bg-[#24242C] text-[#D1D1D6] border border-[#33333E] text-[11px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-orange-400" />
                                {item.product.variants[item.variant_index].label}
                                {(item.product.variants[item.variant_index].base || item.product.variants[item.variant_index].height) && (
                                  <span className="text-[#8E8E93]">
                                    ({item.product.variants[item.variant_index].base}&quot; × {item.product.variants[item.variant_index].height}&quot;)
                                  </span>
                                )}
                              </span>
                            )}
                            
                            {costPrice !== undefined && costPrice !== null && (
                              <span className="text-[11px] text-[#737373]">
                                Cost: <span className="font-mono text-[#A3A3A3]">₹{costPrice}</span>
                              </span>
                            )}

                            {profitPerUnit !== null && (
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${profitPerUnit >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                                {profitPerUnit >= 0 ? `+₹${profitPerUnit} margin` : `Loss: ₹${Math.abs(profitPerUnit)}`}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Price, Qty & Line Total Controls */}
                        <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                          
                          {/* Unit Price Field */}
                          <div className="flex flex-col items-end">
                            <label className="text-[10px] font-bold text-[#737373] uppercase mb-1">
                              Unit Price (₹)
                            </label>
                            <div className="relative w-28">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[#737373]">₹</span>
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={item.sellingPriceStr}
                                onChange={(e) => updateItemPrice(item._id, e.target.value)}
                                onWheel={(e) => e.currentTarget.blur()}
                                className={`w-full pl-6 pr-2.5 py-1.5 bg-[#1A1A1E] border rounded-lg text-xs font-bold text-right outline-none transition-colors hide-arrows ${
                                  isBelowCost 
                                    ? 'border-rose-500 text-rose-400 focus:ring-1 focus:ring-rose-500' 
                                    : 'border-[#2E2E36] text-orange-400 focus:border-orange-500/80 focus:ring-1 focus:ring-orange-500/20'
                                }`}
                              />
                            </div>
                          </div>

                          {/* Ergonomic Quantity Stepper */}
                          <div className="flex flex-col items-center">
                            <label className="text-[10px] font-bold text-[#737373] uppercase mb-1">
                              Qty
                            </label>
                            <div className="flex items-center bg-[#1A1A1E] border border-[#2E2E36] rounded-lg h-8 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => updateItemQty(item._id, -1)}
                                disabled={item.quantity <= 1}
                                className="w-7 h-full flex items-center justify-center text-[#8E8E93] hover:text-[#F5F5F5] hover:bg-[#25252C] disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input 
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => setItemDirectQty(item._id, e.target.value)}
                                onWheel={(e) => e.currentTarget.blur()}
                                className="w-10 text-center bg-transparent border-none text-xs font-bold text-[#F5F5F5] focus:outline-none hide-arrows"
                              />
                              <button
                                type="button"
                                onClick={() => updateItemQty(item._id, 1)}
                                className="w-7 h-full flex items-center justify-center text-[#8E8E93] hover:text-[#F5F5F5] hover:bg-[#25252C] transition-colors cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Line Subtotal */}
                          <div className="flex flex-col items-end min-w-[70px]">
                            <label className="text-[10px] font-bold text-[#737373] uppercase mb-1">
                              Subtotal
                            </label>
                            <span className="text-sm font-bold text-emerald-400">
                              ₹{itemLineSubtotal.toLocaleString('en-IN')}
                            </span>
                          </div>

                          {/* Remove Item Button */}
                          <div className="pt-4">
                            <button
                              type="button"
                              onClick={() => removeItem(item._id)}
                              className="p-1.5 text-[#737373] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {items.length === 0 && (
                    <div className="py-12 px-4 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-[#1F1F24] text-[#737373] flex items-center justify-center mx-auto">
                        <Package className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#F5F5F5]">No items in this order</p>
                        <p className="text-xs text-[#737373] mt-1">
                          Use the search bar above to search and add products to this order.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: STATUS, FINANCIAL BREAKDOWN & PAYMENTS (5 cols on lg, 4 cols on xl) */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-5">
              
              {/* STATUS & FULFILLMENT CONTROLS */}
              <div className="bg-[#141416] border border-[#24242A] rounded-xl p-4 space-y-4 shadow-sm">
                <h3 className="text-xs font-bold text-[#A3A3A3] uppercase tracking-wider">
                  Order Status & Fulfillment
                </h3>

                <div className="space-y-3">
                  {/* Order Status Selector */}
                  <div>
                    <label className="block text-xs text-[#737373] mb-1.5 font-medium">Order Status</label>
                    <div className="grid grid-cols-3 gap-1.5 bg-[#1A1A1E] p-1 rounded-lg border border-[#2A2A32]">
                      <button
                        type="button"
                        onClick={() => setStatus("PENDING")}
                        className={`py-1.5 px-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          status === "PENDING"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-sm"
                            : "text-[#8E8E93] hover:text-[#F5F5F5]"
                        }`}
                      >
                        <Clock className="w-3 h-3" /> PENDING
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatus("COMPLETED")}
                        className={`py-1.5 px-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          status === "COMPLETED"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm"
                            : "text-[#8E8E93] hover:text-[#F5F5F5]"
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" /> COMPLETED
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatus("CANCELLED")}
                        className={`py-1.5 px-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          status === "CANCELLED"
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-sm"
                            : "text-[#8E8E93] hover:text-[#F5F5F5]"
                        }`}
                      >
                        <Ban className="w-3 h-3" /> CANCELLED
                      </button>
                    </div>
                  </div>

                  {/* Fulfillment Status Selector */}
                  <div>
                    <label className="block text-xs text-[#737373] mb-1.5 font-medium">Fulfillment Status</label>
                    <div className="grid grid-cols-2 gap-1.5 bg-[#1A1A1E] p-1 rounded-lg border border-[#2A2A32]">
                      <button
                        type="button"
                        onClick={() => setFulfillmentStatus("PENDING")}
                        className={`py-1.5 px-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          fulfillmentStatus === "PENDING"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-sm"
                            : "text-[#8E8E93] hover:text-[#F5F5F5]"
                        }`}
                      >
                        <Clock className="w-3 h-3" /> PENDING
                      </button>
                      <button
                        type="button"
                        onClick={() => setFulfillmentStatus("FULFILLED")}
                        className={`py-1.5 px-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          fulfillmentStatus === "FULFILLED"
                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-sm"
                            : "text-[#8E8E93] hover:text-[#F5F5F5]"
                        }`}
                      >
                        <Truck className="w-3 h-3" /> FULFILLED
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* FINANCIAL TOTALS & DISCOUNT */}
              <div className="bg-[#141416] border border-[#24242A] rounded-xl p-4 space-y-4 shadow-sm">
                <h3 className="text-xs font-bold text-[#A3A3A3] uppercase tracking-wider">
                  Order Summary
                </h3>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[#8E8E93]">Subtotal</span>
                    <span className="font-semibold text-[#F5F5F5]">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>

                  {/* Discount input with live percentage */}
                  <div className="space-y-2 pt-1 border-t border-[#1F1F24]">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-[#8E8E93]">Discount</span>
                        {discountPercentage > 0 && (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            {discountPercentage}% OFF
                          </span>
                        )}
                      </div>
                      <div className="relative w-32">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[#737373]">₹</span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={discountStr}
                          onChange={(e) => setDiscountStr(e.target.value)}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="w-full pl-6 pr-2.5 py-1.5 bg-[#1A1A1E] border border-[#2E2E36] focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/20 rounded-lg text-xs font-bold text-emerald-400 text-right outline-none hide-arrows"
                        />
                      </div>
                    </div>

                    {/* Quick discount preset pills */}
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <button 
                        type="button" 
                        onClick={() => applyDiscountPreset("fixed", 50)} 
                        className="text-[10px] bg-[#1A1A1E] hover:bg-[#25252E] text-[#8E8E93] hover:text-[#F5F5F5] border border-[#282830] px-2 py-0.5 rounded transition-colors cursor-pointer"
                      >
                        ₹50
                      </button>
                      <button 
                        type="button" 
                        onClick={() => applyDiscountPreset("fixed", 100)} 
                        className="text-[10px] bg-[#1A1A1E] hover:bg-[#25252E] text-[#8E8E93] hover:text-[#F5F5F5] border border-[#282830] px-2 py-0.5 rounded transition-colors cursor-pointer"
                      >
                        ₹100
                      </button>
                      <button 
                        type="button" 
                        onClick={() => applyDiscountPreset("percent", 5)} 
                        className="text-[10px] bg-[#1A1A1E] hover:bg-[#25252E] text-[#8E8E93] hover:text-[#F5F5F5] border border-[#282830] px-2 py-0.5 rounded transition-colors cursor-pointer"
                      >
                        5%
                      </button>
                      <button 
                        type="button" 
                        onClick={() => applyDiscountPreset("percent", 10)} 
                        className="text-[10px] bg-[#1A1A1E] hover:bg-[#25252E] text-[#8E8E93] hover:text-[#F5F5F5] border border-[#282830] px-2 py-0.5 rounded transition-colors cursor-pointer"
                      >
                        10%
                      </button>
                      {discountVal > 0 && (
                        <button 
                          type="button" 
                          onClick={() => setDiscountStr("0")} 
                          className="text-[10px] text-rose-400 hover:text-rose-300 px-1.5 py-0.5 cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Grand Total Display */}
                  <div className="flex justify-between items-center pt-3 border-t border-[#222226]">
                    <div>
                      <span className="text-xs text-[#737373] uppercase font-bold tracking-wider block">Grand Total</span>
                      <span className="text-xs text-[#8E8E93]">Including taxes & discounts</span>
                    </div>
                    <span className="text-2xl font-black text-orange-400 tracking-tight">
                      ₹{totalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* PAYMENT LEDGER & SETTLEMENT */}
              <div className="bg-[#141416] border border-[#24242A] rounded-xl p-4 space-y-4 shadow-sm">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-[#A3A3A3] uppercase tracking-wider flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 text-orange-400" /> Payment Records
                  </h3>
                  <button
                    type="button"
                    onClick={() => addPayment()}
                    className="text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Payment
                  </button>
                </div>

                {/* Paid vs Balance Progress */}
                <div className="bg-[#1A1A1E] border border-[#282830] rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#8E8E93]">Total Paid: <strong className="text-emerald-400 font-bold">₹{totalPaid.toLocaleString('en-IN')}</strong></span>
                    <span className="text-[#8E8E93]">Balance Due: <strong className={balanceDue > 0 ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>₹{balanceDue.toLocaleString('en-IN')}</strong></span>
                  </div>
                  
                  {/* Visual Progress Bar */}
                  <div className="w-full h-2 bg-[#282832] rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${totalPaid >= totalAmount ? 'bg-emerald-500' : 'bg-orange-500'}`}
                      style={{ width: `${totalAmount > 0 ? Math.min(100, Math.round((totalPaid / totalAmount) * 100)) : 0}%` }}
                    />
                  </div>

                  {/* One-click Settle Balance Button */}
                  {balanceDue > 0 && (
                    <button
                      type="button"
                      onClick={settleFullBalance}
                      className="w-full mt-1 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-md text-xs font-bold text-orange-400 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Settle Balance of ₹{balanceDue.toLocaleString('en-IN')}
                    </button>
                  )}
                </div>

                {/* Payments List */}
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {payments.map((pay) => (
                    <div 
                      key={pay.id} 
                      className="flex items-center gap-2 bg-[#1A1A1E] border border-[#282830] p-2 rounded-lg"
                    >
                      <select 
                        value={pay.payment_mode} 
                        onChange={(e) => updatePayment(pay.id, 'payment_mode', e.target.value)}
                        className="bg-[#121215] border border-[#2E2E36] rounded-md px-2 py-1.5 text-xs font-semibold text-[#F5F5F5] outline-none cursor-pointer"
                      >
                        <option value="CASH">CASH</option>
                        <option value="ONLINE">ONLINE</option>
                      </select>

                      <select 
                        value={pay.payment_type} 
                        onChange={(e) => updatePayment(pay.id, 'payment_type', e.target.value)}
                        className="flex-1 bg-[#121215] border border-[#2E2E36] rounded-md px-2 py-1.5 text-xs text-[#F5F5F5] outline-none cursor-pointer"
                      >
                        <option value="FULL">FULL</option>
                        <option value="ADVANCE">ADVANCE</option>
                        <option value="FINAL">FINAL</option>
                      </select>

                      <div className="relative w-28">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[#737373]">₹</span>
                        <input 
                          type="number"
                          step="any"
                          min="0"
                          value={pay.amountStr}
                          onChange={(e) => updatePayment(pay.id, 'amountStr', e.target.value)}
                          onWheel={(e) => e.currentTarget.blur()}
                          placeholder="0"
                          className="w-full pl-6 pr-2 py-1.5 bg-[#121215] border border-[#2E2E36] focus:border-orange-500 rounded-md text-xs font-bold text-orange-400 text-right outline-none hide-arrows"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removePayment(pay.id)}
                        className="p-1.5 text-[#737373] hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors cursor-pointer"
                        title="Remove payment record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {payments.length === 0 && (
                    <div className="text-center py-3 text-xs text-[#737373]">
                      No payment records added yet.
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="px-6 py-4 border-t border-[#222226] bg-[#141416] flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
          <div className="flex-1 w-full sm:w-auto">
            {errorMsg ? (
              <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/25 px-3 py-2 rounded-xl animate-[fadeIn_0.1s_ease-out]">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            ) : (
              <div className="text-xs text-[#737373] flex items-center gap-2">
                <span>Press <kbd className="bg-[#24242A] text-[#A3A3A3] px-1.5 py-0.5 rounded border border-[#33333C] text-[10px] font-mono">Ctrl+Enter</kbd> to save changes</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-[#2E2E36] bg-[#1A1A1E] hover:bg-[#24242A] text-sm font-medium text-[#A3A3A3] hover:text-[#F5F5F5] transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Saving Order...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
