"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, Plus, Minus, X, Check, ShoppingBag, CreditCard, Banknote, LayoutGrid, List, UserPlus, FileDown, Loader2, PackagePlus, ArrowUpCircle, ArrowLeft } from "lucide-react";
import { Product, Category, adjustProductStockAction } from "@/app/actions/products";
import { Customer } from "@/app/actions/customers";
import { createOrderAction, getOrderDetails } from "@/app/actions/orders";
import { generateBillPdf } from "@/lib/generateBillPdf";
import { useRouter } from "next/navigation";

type CartItem = {
  product: Product;
  quantity: number;
  sellingPrice: number | "";
  variantIndex?: number;
};

export default function POSTerminal({
  initialProducts,
  categories,
  initialCustomers,
}: {
  initialProducts: Product[];
  categories: Category[];
  initialCustomers: Customer[];
}) {
  const router = useRouter();

  // Left Panel State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<number | "ALL">("ALL");
  const [viewMode, setViewMode] = useState<"GRID" | "LIST">("GRID");

  // Right Panel State (Cart & Order)
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | "NEW">("NEW");
  
  // New Customer Form State
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");

  // Payment State
  const [orderType, setOrderType] = useState<"BOOKING" | "PURCHASE">("PURCHASE");
  const [paymentMode, setPaymentMode] = useState<"CASH" | "ONLINE">("CASH");
  const [paymentType, setPaymentType] = useState<"FULL" | "ADVANCE">("FULL");
  const [advanceAmountStr, setAdvanceAmountStr] = useState("");

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [customerAddedVisual, setCustomerAddedVisual] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<number | null>(null);
  const [isGeneratingBill, setIsGeneratingBill] = useState(false);

  // Variant Picker State
  const [variantPickerProduct, setVariantPickerProduct] = useState<Product | null>(null);

  // Stock Adjustment State
  const [adjustStockProduct, setAdjustStockProduct] = useState<Product | null>(null);
  const [adjustStockVariantIdx, setAdjustStockVariantIdx] = useState<number | null>(null);
  const [adjustStockQty, setAdjustStockQty] = useState<string>("1");
  const [isAdjustingStock, setIsAdjustingStock] = useState(false);
  const [adjustStockError, setAdjustStockError] = useState("");

  // Mobile Cart State
  const [showMobileCart, setShowMobileCart] = useState(false);

  // Sync selected customer data to form if existing customer is selected
  useEffect(() => {
    if (selectedCustomerId !== "NEW") {
      const c = initialCustomers.find(cust => cust.id === selectedCustomerId);
      if (c) {
        setNewCustomerName(c.name);
        setNewCustomerPhone(c.phone || "");
        setNewCustomerEmail(c.email || "");
        setNewCustomerAddress(c.address || "");
      }
    } else {
      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewCustomerEmail("");
      setNewCustomerAddress("");
    }
    setCustomerAddedVisual(false);
  }, [selectedCustomerId, initialCustomers]);

  // Computed Values
  const filteredProducts = useMemo(() => {
    return initialProducts.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.product_code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategoryId === "ALL" || p.category_id === activeCategoryId;
      return matchesSearch && matchesCategory;
    });
  }, [initialProducts, searchQuery, activeCategoryId]);

  const { subtotal, totalDiscount } = useMemo(() => {
    let sub = 0;
    let disc = 0;
    cart.forEach((item) => {
      const sp = typeof item.sellingPrice === "number" ? item.sellingPrice : 0;
      sub += sp * item.quantity;
      if (sp > 0 && sp < item.product.default_selling_price) {
        disc += (item.product.default_selling_price - sp) * item.quantity;
      }
    });
    return { subtotal: sub, totalDiscount: disc };
  }, [cart]);

  // If PURCHASE, force FULL payment
  const actualPaymentType = orderType === "PURCHASE" ? "FULL" : paymentType;
  const paymentAmount = actualPaymentType === "FULL" ? subtotal : parseFloat(advanceAmountStr) || 0;

  // Actions
  const handleAddClick = (product: Product) => {
    if (product.variants && product.variants.length > 0) {
      setVariantPickerProduct(product);
    } else {
      toggleCartItem(product);
    }
  };

  const toggleCartItem = (product: Product, variantIndex?: number) => {
    const stock = variantIndex != null && product.variants ? product.variants[variantIndex].stock_qty : product.stock_qty;
    if (stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id && item.variantIndex === variantIndex);
      if (existing) {
        return prev.filter((item) => !(item.product.id === product.id && item.variantIndex === variantIndex));
      }
      const sellingPrice = variantIndex != null && product.variants ? product.variants[variantIndex].selling_price : product.default_selling_price;
      return [...prev, { product, quantity: 1, sellingPrice, variantIndex }];
    });
    setVariantPickerProduct(null);
  };

  const updateCartItemQty = (productId: number, delta: number, variantIndex?: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId && item.variantIndex === variantIndex) {
          const stock = variantIndex != null && item.product.variants ? item.product.variants[variantIndex].stock_qty : item.product.stock_qty;
          const newQty = Math.max(1, Math.min(item.quantity + delta, stock));
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const updateCartItemPrice = (productId: number, priceStr: string, variantIndex?: number) => {
    const val = priceStr === "" ? "" : parseFloat(priceStr);
    if (typeof val === "number" && (isNaN(val) || val < 0)) return;
    setCart((prev) =>
      prev.map((item) => (item.product.id === productId && item.variantIndex === variantIndex ? { ...item, sellingPrice: val } : item))
    );
  };

  const removeCartItem = (productId: number, variantIndex?: number) => {
    setCart((prev) => prev.filter((item) => !(item.product.id === productId && item.variantIndex === variantIndex)));
  };
  
  const handleAddCustomerVisual = () => {
    if (!newCustomerName || !newCustomerPhone) {
      setErrorMsg("Name and Phone are required to add a customer.");
      return;
    }
    setErrorMsg("");
    setCustomerAddedVisual(true);
  };

  const handlePlaceOrder = async () => {
    setErrorMsg("");
    setSuccessMsg("");

    if (cart.length === 0) {
      setErrorMsg("Cart is empty");
      return;
    }
    
    // Validate selling prices
    for (const item of cart) {
       if (item.sellingPrice === "" || item.sellingPrice <= 0) {
          setErrorMsg(`Selling price for ${item.product.product_code} cannot be blank or zero.`);
          return;
       }
       if (item.sellingPrice < item.product.cost_price) {
          setErrorMsg(`Selling price for ${item.product.product_code} (₹${item.sellingPrice}) cannot be below its cost price (₹${item.product.cost_price}).`);
          return;
       }
    }
    
    // We require a customer. If selectedCustomerId === "NEW", name and phone must be provided.
    if (selectedCustomerId === "NEW" && (!newCustomerName || !newCustomerPhone)) {
      setErrorMsg("Customer Name and Phone are required");
      return;
    }
    
    if (actualPaymentType === "ADVANCE" && (paymentAmount <= 0 || paymentAmount >= subtotal)) {
      setErrorMsg("Advance amount must be > 0 and < total");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      customerId: selectedCustomerId !== "NEW" ? Number(selectedCustomerId) : undefined,
      newCustomerName,
      newCustomerPhone,
      newCustomerEmail,
      orderType,
      discount: totalDiscount,
      totalAmount: subtotal,
      paymentMode,
      paymentType: actualPaymentType,
      paymentAmount,
      items: cart.map(i => ({
        productId: i.product.id,
        variantIndex: i.variantIndex,
        quantity: i.quantity,
        sellingPrice: Number(i.sellingPrice) // Safely cast since we validated it above
      }))
    };

    const res = await createOrderAction(payload);
    
    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg(`Order placed successfully! (${res.orderNo})`);
      setLastOrderId(res.orderId || null);
      
      // Auto print bill immediately
      if (res.orderId) {
        setIsGeneratingBill(true);
        try {
          const fullOrder = await getOrderDetails(res.orderId);
          if (fullOrder) {
            await generateBillPdf(fullOrder);
          }
        } catch (err) {
          console.error("Auto-print failed:", err);
        }
        setIsGeneratingBill(false);
      }

      setCart([]);
      setSelectedCustomerId("NEW");
      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewCustomerEmail("");
      setNewCustomerAddress("");
      setCustomerAddedVisual(false);
      setOrderType("PURCHASE");
      setAdvanceAmountStr("");
      
      setTimeout(() => {
        setSuccessMsg("");
        setLastOrderId(null);
      }, 10000);
    }
    
    setIsSubmitting(false);
  };

  const handleDownloadBill = async () => {
    if (!lastOrderId) return;
    setIsGeneratingBill(true);
    const fullOrder = await getOrderDetails(lastOrderId);
    if (fullOrder) {
      await generateBillPdf(fullOrder);
    }
    setIsGeneratingBill(false);
  };

  const isInCart = (productId: number) => cart.some(item => item.product.id === productId);

  const handleAdjustStockSubmit = async () => {
    if (!adjustStockProduct) return;
    const qty = parseInt(adjustStockQty);
    if (isNaN(qty) || qty <= 0) {
      setAdjustStockError("Please enter a valid quantity to add.");
      return;
    }
    setAdjustStockError("");
    setIsAdjustingStock(true);
    
    const res = await adjustProductStockAction(adjustStockProduct.id, adjustStockVariantIdx, qty);
    setIsAdjustingStock(false);
    
    if (res.error) {
      setAdjustStockError(res.error);
    } else {
      setAdjustStockProduct(null);
      setAdjustStockVariantIdx(null);
      setAdjustStockQty("1");
      // The server action revalidates the path, but we can also trigger a router.refresh() if needed
      router.refresh();
    }
  };

  const openAdjustStock = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    setAdjustStockProduct(product);
    setAdjustStockVariantIdx(product.variants && product.variants.length > 0 ? 0 : null);
    setAdjustStockQty("1");
    setAdjustStockError("");
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 lg:h-[calc(100vh-130px)] pb-24 md:pb-0 relative">
      
      {/* LEFT PANEL: Products (60%) */}
      <div className={`w-full lg:flex-[6] h-[60vh] md:h-auto lg:h-auto ds-card p-0 flex flex-col overflow-hidden ${showMobileCart ? 'hidden lg:flex' : 'flex'}`}>
        
        {/* Search & Tabs (Fixed Top) */}
        <div className="p-4 border-b border-[#1F1F1F] bg-[#0A0A0A] z-10 space-y-4 shrink-0">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
              <input
                type="text"
                placeholder="Search products by name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full ds-input !pl-10"
              />
            </div>
            <div className="flex bg-[#1A1A1A] p-1 rounded-lg border border-[#1F1F1F]">
              <button 
                onClick={() => setViewMode("GRID")}
                className={`p-2 rounded-md transition-colors ${viewMode === "GRID" ? "bg-[#111111] text-orange-400" : "text-[#737373] hover:text-[#F5F5F5]"}`}
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setViewMode("LIST")}
                className={`p-2 rounded-md transition-colors ${viewMode === "LIST" ? "bg-[#111111] text-orange-400" : "text-[#737373] hover:text-[#F5F5F5]"}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
            <button
              onClick={() => setActiveCategoryId("ALL")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategoryId === "ALL" ? "bg-orange-500 text-[#0A0A0A] shadow-[0_0_15px_rgba(249,115,22,0.3)]" : "bg-[#1A1A1A] text-[#A3A3A3] hover:bg-[#2A2A2A]"
              }`}
            >
              All Products
            </button>
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveCategoryId(c.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCategoryId === c.id ? "bg-orange-500 text-[#0A0A0A] shadow-[0_0_15px_rgba(249,115,22,0.3)]" : "bg-[#1A1A1A] text-[#A3A3A3] hover:bg-[#2A2A2A]"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid/List (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar pb-[100px] lg:pb-4">
          {filteredProducts.length === 0 ? (
             <div className="text-center text-[#737373] mt-10">No products found.</div>
          ) : viewMode === "GRID" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4">
              {filteredProducts.map(product => {
                const inCart = isInCart(product.id);
                return (
                  <div 
                    key={product.id} 
                    onClick={() => handleAddClick(product)}
                    className={`bg-[#111111] rounded-lg overflow-hidden flex flex-col transition-all group cursor-pointer 
                      ${product.stock_qty <= 0 ? "opacity-60 border border-[#1F1F1F]" : ""}
                      ${inCart ? "border-2 border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.2)]" : "border border-[#1F1F1F] hover:border-orange-500/50"}
                    `}
                  >
                    <div className="aspect-[4/3] w-full bg-[#1A1A1A] relative overflow-hidden flex items-center justify-center">
                      <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                           onClick={(e) => openAdjustStock(e, product)}
                           className="bg-[#0A0A0A]/80 hover:bg-[#0A0A0A] text-[#F5F5F5] p-1.5 rounded shadow border border-[#2A2A2A] transition-colors flex items-center gap-1 backdrop-blur-sm"
                           title="Quick Add Stock"
                        >
                           <PackagePlus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {product.photo_urls && product.photo_urls.length > 0 ? (
                        <img src={product.photo_urls[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <ShoppingBag className="w-8 h-8 text-[#737373]" />
                      )}
                      {product.stock_qty <= 0 && (
                        <div className="absolute inset-0 bg-[#0A0A0A]/50 backdrop-blur-[2px] flex items-center justify-center">
                          <span className="bg-red-500/90 text-white text-[10px] sm:text-xs font-bold px-2 py-1 rounded shadow-lg">OUT OF STOCK</span>
                        </div>
                      )}
                      {inCart && product.stock_qty > 0 && (
                        <div className="absolute top-2 right-2 bg-orange-500 text-[#0A0A0A] rounded-full p-1 shadow-lg">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div className="p-2 sm:p-3 flex flex-col flex-1">
                      <h4 className="text-sm sm:text-base font-bold text-[#F5F5F5] mb-0.5 line-clamp-1">{product.product_code}</h4>
                      {product.variants && product.variants.length > 0 ? (
                        <div className="mb-2">
                          <span className="text-xs font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">{product.variants.length} sizes</span>
                        </div>
                      ) : (
                        <p className="text-[10px] sm:text-xs text-[#A3A3A3] line-clamp-2 mb-2 leading-snug">
                          {product.name} {product.height ? (product.base ? `(H-${product.height} B-${product.base})` : `(H-${product.height})`) : ""}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between mt-auto pt-2 border-t border-[#1F1F1F]">
                        {product.variants && product.variants.length > 0 ? (
                           <span className="font-bold text-orange-400 text-xs">
                             ₹{Math.min(...product.variants.map(v => v.selling_price))} - ₹{Math.max(...product.variants.map(v => v.selling_price))}
                           </span>
                        ) : (
                           <span className="font-bold text-orange-400">₹{product.default_selling_price}</span>
                        )}
                        <span className="text-xs text-[#A3A3A3] font-medium bg-[#1A1A1A] px-2 py-0.5 rounded">
                          Stock: {product.variants && product.variants.length > 0 ? product.variants.reduce((acc, v) => acc + v.stock_qty, 0) : product.stock_qty}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
             <div className="space-y-2">
                {filteredProducts.map(product => {
                  const inCart = isInCart(product.id);
                  return (
                    <div 
                      key={product.id} 
                      onClick={() => handleAddClick(product)}
                      className={`flex items-center gap-4 bg-[#111111] rounded-lg p-3 transition-colors cursor-pointer relative overflow-hidden group
                        ${product.stock_qty <= 0 ? "opacity-60 border border-[#1F1F1F]" : ""}
                        ${inCart ? "border-2 border-orange-500 bg-orange-500/5 shadow-[0_0_10px_rgba(249,115,22,0.1)]" : "border border-[#1F1F1F] hover:border-orange-500/50"}
                      `}
                    >
                      <div className="w-16 h-16 bg-[#1A1A1A] rounded shrink-0 overflow-hidden flex items-center justify-center relative">
                        {product.photo_urls && product.photo_urls.length > 0 ? (
                          <img src={product.photo_urls[0]} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <ShoppingBag className="w-6 h-6 text-[#737373]" />
                        )}
                        {inCart && product.stock_qty > 0 && (
                          <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center">
                             <Check className="w-6 h-6 text-orange-400 stroke-[3] drop-shadow-md" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                         <h4 className="text-lg font-bold text-[#F5F5F5]">{product.product_code}</h4>
                         {product.variants && product.variants.length > 0 ? (
                           <div className="mt-1">
                             <span className="text-xs font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">{product.variants.length} sizes</span>
                           </div>
                         ) : (
                           <p className="text-sm text-[#A3A3A3] truncate">
                              {product.name} {product.height ? (product.base ? `(H-${product.height} B-${product.base})` : `(H-${product.height})`) : ""}
                           </p>
                         )}
                      </div>
                      <div className="text-right">
                         {product.variants && product.variants.length > 0 ? (
                           <div className="font-bold text-orange-400 text-sm">
                             ₹{Math.min(...product.variants.map(v => v.selling_price))} - ₹{Math.max(...product.variants.map(v => v.selling_price))}
                           </div>
                         ) : (
                           <div className="font-bold text-orange-400">₹{product.default_selling_price}</div>
                         )}
                         <div className="text-xs text-[#A3A3A3] mt-1">
                           Stock: {product.variants && product.variants.length > 0 ? product.variants.reduce((acc, v) => acc + v.stock_qty, 0) : product.stock_qty}
                         </div>
                      </div>
                      <div className="flex flex-col items-end justify-center ml-2">
                        <button 
                           onClick={(e) => openAdjustStock(e, product)}
                           className="bg-[#1A1A1A] hover:bg-[#2A2A2A] text-[#A3A3A3] hover:text-[#F5F5F5] p-2 rounded transition-colors opacity-0 group-hover:opacity-100"
                           title="Quick Add Stock"
                        >
                           <PackagePlus className="w-4 h-4" />
                        </button>
                        {product.stock_qty <= 0 && (
                           <span className="bg-red-500/20 text-red-500 text-[10px] font-bold px-1.5 py-0.5 rounded mt-1">OUT OF STOCK</span>
                        )}
                      </div>
                    </div>
                  );
                })}
             </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Cart & Order (40%) */}
      <div className={`w-full lg:flex-[4] h-[80vh] md:h-auto lg:h-auto ds-card p-0 flex flex-col overflow-hidden ${!showMobileCart ? 'hidden lg:flex' : 'flex'}`}>
        
        {/* Customer Section (Fixed Top) */}
        <div className="p-4 border-b border-[#1F1F1F] bg-[#0A0A0A] shrink-0 flex flex-col gap-3">
          <div className="flex gap-2 relative">
            <Search className="w-5 h-5 absolute ml-3 mt-2 text-[#737373] pointer-events-none" />
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value === "NEW" ? "NEW" : Number(e.target.value))}
              className="flex-1 pl-10 pr-3 py-2 bg-[#111111] border border-[#1F1F1F] rounded-lg text-sm text-[#F5F5F5] focus:outline-none focus:border-orange-500 appearance-none cursor-pointer hover:border-[#2A2A2A] transition-colors"
            >
              <option value="NEW">+ Add New Customer</option>
              <option value="" disabled>--- Existing Customers ---</option>
              {initialCustomers.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-[#111111] rounded-lg border border-[#1F1F1F] space-y-3 relative">
            {selectedCustomerId !== "NEW" && (
              <div className="absolute inset-0 bg-[#0A0A0A]/40 z-10 rounded-lg cursor-not-allowed"></div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-[#737373] font-bold ml-1">Name</label>
                <input type="text" placeholder="Rahul Sharma" value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} className="w-full px-3 py-1.5 bg-[#1A1A1A] border border-[#1F1F1F] rounded text-sm text-[#F5F5F5] focus:outline-none focus:border-orange-500" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-[#737373] font-bold ml-1">Phone</label>
                <input type="tel" placeholder="+91..." value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)} className="w-full px-3 py-1.5 bg-[#1A1A1A] border border-[#1F1F1F] rounded text-sm text-[#F5F5F5] focus:outline-none focus:border-orange-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-[#737373] font-bold ml-1">Email</label>
                <input type="email" placeholder="rahul@example.com" value={newCustomerEmail} onChange={e => setNewCustomerEmail(e.target.value)} className="w-full px-3 py-1.5 bg-[#1A1A1A] border border-[#1F1F1F] rounded text-sm text-[#F5F5F5] focus:outline-none focus:border-orange-500" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-[#737373] font-bold ml-1">Address</label>
                <input type="text" placeholder="14, MG Road, Mumbai..." value={newCustomerAddress} onChange={e => setNewCustomerAddress(e.target.value)} className="w-full px-3 py-1.5 bg-[#1A1A1A] border border-[#1F1F1F] rounded text-sm text-[#F5F5F5] focus:outline-none focus:border-orange-500" />
              </div>
            </div>
            {selectedCustomerId === "NEW" && !customerAddedVisual && (
              <button 
                onClick={handleAddCustomerVisual}
                className="w-full py-1.5 mt-1 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-orange-400 font-medium rounded text-xs transition-colors flex items-center justify-center gap-1.5 border border-orange-500/30"
              >
                <UserPlus className="w-3.5 h-3.5" /> Save Customer Details
              </button>
            )}
            {selectedCustomerId === "NEW" && customerAddedVisual && (
               <div className="w-full py-1.5 mt-1 bg-green-500/10 text-green-400 font-medium rounded text-xs flex items-center justify-center gap-1.5 border border-green-500/20">
                 <Check className="w-3.5 h-3.5" /> Customer Details Ready
               </div>
            )}
          </div>
        </div>

        {/* Cart Header */}
        <div className="px-4 py-2 bg-[#0A0A0A] border-b border-[#1F1F1F] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowMobileCart(false)}
              className="lg:hidden p-1.5 mr-1 text-[#A3A3A3] hover:text-[#F5F5F5] bg-[#1A1A1A] rounded"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h3 className="text-sm font-semibold text-[#F5F5F5] flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" /> CART
            </h3>
          </div>
          <span className="text-xs bg-[#1A1A1A] text-[#A3A3A3] px-2 py-0.5 rounded-full">{cart.length} items</span>
        </div>

        {/* Cart Items (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[#737373]">
              <ShoppingBag className="w-12 h-12 mb-2 opacity-30" />
              <p className="text-sm">Add products to cart</p>
            </div>
          ) : (
            cart.map(item => {
              const defaultPrice = item.variantIndex != null && item.product.variants ? item.product.variants[item.variantIndex].selling_price : item.product.default_selling_price;
              const sp = typeof item.sellingPrice === "number" ? item.sellingPrice : 0;
              const saved = defaultPrice - sp;
              const discountPercent = (defaultPrice > 0 && sp > 0) ? Math.round((saved / defaultPrice) * 100) : 0;
              
              const isBelowCost = sp > 0 && sp < (item.variantIndex != null && item.product.variants ? item.product.variants[item.variantIndex].cost_price : item.product.cost_price);
              const maxStock = item.variantIndex != null && item.product.variants ? item.product.variants[item.variantIndex].stock_qty : item.product.stock_qty;
              
              return (
                <div key={`${item.product.id}-${item.variantIndex ?? 'base'}`} className={`bg-[#111111] p-3 rounded-lg border flex flex-col gap-2 relative group transition-colors ${isBelowCost ? "border-red-500/50" : "border-[#1F1F1F]"}`}>
                  <div className="flex justify-between items-start pr-6">
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-bold text-[#F5F5F5] leading-tight truncate">{item.product.product_code}</h5>
                      <p className="text-xs text-[#A3A3A3] mt-0.5 truncate">{item.product.name}</p>
                      {item.variantIndex != null && item.product.variants && (
                        <span className="inline-block mt-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] font-bold px-2 py-0.5 rounded">
                           {item.product.variants[item.variantIndex].label}
                        </span>
                      )}
                    </div>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-1 bg-[#1A1A1A] rounded border border-[#1F1F1F] shrink-0 ml-2 h-7">
                      <button onClick={() => updateCartItemQty(item.product.id, -1, item.variantIndex)} disabled={item.quantity <= 1} className="p-1 text-[#737373] hover:text-[#F5F5F5] disabled:opacity-30"><Minus className="w-3 h-3" /></button>
                      <span className="w-5 text-center text-xs font-semibold text-[#F5F5F5]">{item.quantity}</span>
                      <button onClick={() => updateCartItemQty(item.product.id, 1, item.variantIndex)} disabled={item.quantity >= maxStock} className="p-1 text-[#737373] hover:text-[#F5F5F5] disabled:opacity-30"><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>
                  
                  <div className="flex items-end justify-between mt-2 pt-2 border-t border-[#1F1F1F]">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#737373] uppercase font-medium">Original</span>
                        {saved > 0 && discountPercent > 0 && (
                          <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded">
                            {discountPercent}% OFF
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-[#737373] line-through decoration-[#737373]">₹{defaultPrice}</span>
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-[#737373] uppercase font-medium">Selling Price</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-orange-400 font-bold">₹</span>
                        <input 
                          type="number" 
                          value={item.sellingPrice}
                          onChange={(e) => updateCartItemPrice(item.product.id, e.target.value, item.variantIndex)}
                          className={`w-20 bg-[#1A1A1A] border rounded px-2 py-1 text-sm font-bold focus:outline-none hide-arrows text-right transition-colors
                            ${isBelowCost ? "border-red-500 text-red-400 focus:border-red-400 focus:ring-1 focus:ring-red-400" : "border-[#2A2A2A] text-orange-400 focus:border-orange-400 focus:ring-1 focus:ring-orange-400"}
                          `}
                        />
                      </div>
                      {isBelowCost && (
                         <span className="text-[10px] text-red-400 font-medium mt-1">Below Cost (₹{item.variantIndex != null && item.product.variants ? item.product.variants[item.variantIndex].cost_price : item.product.cost_price})!</span>
                      )}
                    </div>
                  </div>

                  <button 
                    onClick={() => removeCartItem(item.product.id, item.variantIndex)}
                    className="absolute top-2 right-2 p-1 text-[#737373] hover:text-red-400 rounded transition-colors opacity-0 group-hover:opacity-100 bg-[#0A0A0A]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Order Details & Payment (Fixed Bottom) */}
        <div className="border-t border-[#1F1F1F] bg-[#0A0A0A] p-4 shrink-0 space-y-4 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.5)]">
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex bg-[#111111] p-1 rounded-lg border border-[#1F1F1F] flex-1">
              <button 
                onClick={() => setOrderType("PURCHASE")}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${orderType === "PURCHASE" ? "bg-[#1A1A1A] text-[#F5F5F5]" : "text-[#737373] hover:text-[#F5F5F5]"}`}
              >
                PURCHASE
              </button>
              <button 
                onClick={() => setOrderType("BOOKING")}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${orderType === "BOOKING" ? "bg-[#1A1A1A] text-[#F5F5F5]" : "text-[#737373] hover:text-[#F5F5F5]"}`}
              >
                BOOKING
              </button>
            </div>
            
            <div className="flex bg-[#111111] p-1 rounded-lg border border-[#1F1F1F] flex-1">
               <button 
                onClick={() => setPaymentMode("CASH")}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${paymentMode === "CASH" ? "bg-[#1A1A1A] text-[#F5F5F5]" : "text-[#737373] hover:text-[#F5F5F5]"}`}
              >
                <Banknote className="w-3 h-3" /> CASH
              </button>
              <button 
                onClick={() => setPaymentMode("ONLINE")}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${paymentMode === "ONLINE" ? "bg-[#1A1A1A] text-[#F5F5F5]" : "text-[#737373] hover:text-[#F5F5F5]"}`}
              >
                <CreditCard className="w-3 h-3" /> ONLINE
              </button>
            </div>
          </div>

          {orderType === "BOOKING" && (
            <div className="flex items-center gap-3">
              <select 
                value={paymentType} 
                onChange={(e) => setPaymentType(e.target.value as "FULL" | "ADVANCE")}
                className="px-3 py-1.5 bg-[#1A1A1A] border border-[#1F1F1F] rounded-lg text-sm text-[#F5F5F5] focus:outline-none focus:border-orange-500 w-1/2"
              >
                <option value="FULL">Full Payment</option>
                <option value="ADVANCE">Advance Paid</option>
              </select>
              {paymentType === "ADVANCE" && (
                <div className="relative w-1/2">
                   <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737373] text-sm">₹</span>
                   <input 
                      type="number" 
                      placeholder="Amount" 
                      value={advanceAmountStr} 
                      onChange={e => setAdvanceAmountStr(e.target.value)} 
                      className="w-full pl-7 pr-3 py-1.5 bg-[#1A1A1A] border border-[#1F1F1F] rounded-lg text-sm text-[#F5F5F5] focus:outline-none focus:border-orange-500 hide-arrows"
                    />
                </div>
              )}
            </div>
          )}

          <div className="pt-3 border-t border-[#1F1F1F] space-y-1.5">
            <div className="flex justify-between text-sm text-[#737373]">
              <span>Subtotal</span>
              <span>₹{subtotal + totalDiscount}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-500">
                <span>Total Discount</span>
                <span>- ₹{totalDiscount}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold text-[#F5F5F5] pt-1">
              <span>Total</span>
              <span>₹{subtotal}</span>
            </div>
            {actualPaymentType === "ADVANCE" && paymentAmount > 0 && (
              <div className="flex justify-between text-sm text-orange-400 pt-1">
                <span>Balance Due</span>
                <span>₹{subtotal - paymentAmount}</span>
              </div>
            )}
          </div>

          {errorMsg && <div className="p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400 leading-tight">{errorMsg}</div>}
          {successMsg && (
            <div className="flex items-center justify-between p-2 bg-green-500/10 border border-green-500/20 rounded">
              <span className="text-xs text-green-400 flex items-center gap-1.5"><Check className="w-3 h-3"/>{successMsg}</span>
              {lastOrderId && (
                <button
                  onClick={handleDownloadBill}
                  disabled={isGeneratingBill}
                  className="flex items-center gap-1 bg-green-500 text-slate-950 px-2 py-1 rounded text-xs font-bold hover:bg-green-400 disabled:opacity-50 transition-colors"
                >
                  <FileDown className="w-3 h-3" />
                  {isGeneratingBill ? "..." : "Bill"}
                </button>
              )}
            </div>
          )}

          <button 
            onClick={handlePlaceOrder}
            disabled={cart.length === 0 || isSubmitting}
            className="w-full py-3.5 ds-btn-primary rounded-xl text-lg glow-orange flex items-center justify-center gap-2 mt-4"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Check className="w-5 h-5 stroke-[3]" />
                PLACE ORDER
              </>
            )}
          </button>
        </div>
      </div>

      {/* Variant Picker Modal */}
      {variantPickerProduct && (
        <div className="fixed inset-0 bg-black/60 z-[999999] flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#1F1F1F] rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            <div className="p-4 border-b border-[#1F1F1F] flex justify-between items-center bg-[#0A0A0A]">
              <h3 className="font-bold text-[#F5F5F5] flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-orange-400" />
                Select Size
              </h3>
              <button onClick={() => setVariantPickerProduct(null)} className="text-[#737373] hover:text-[#F5F5F5]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-sm font-bold text-[#F5F5F5] mb-2">{variantPickerProduct.name}</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Base Product Option */}
                <button
                  onClick={() => toggleCartItem(variantPickerProduct, undefined)}
                  disabled={variantPickerProduct.stock_qty <= 0}
                  className={`p-3 rounded-lg border text-left transition-colors flex flex-col justify-between h-full ${variantPickerProduct.stock_qty > 0 ? "bg-[#1A1A1A] border-[#1F1F1F] hover:border-orange-500" : "bg-[#0A0A0A] border-[#1F1F1F] opacity-50"}`}
                >
                  <span className="text-sm font-bold text-[#F5F5F5] block mb-1">
                    {variantPickerProduct.height ? (variantPickerProduct.base ? `H-${variantPickerProduct.height} B-${variantPickerProduct.base}` : `H-${variantPickerProduct.height}`) : "Base Size"}
                  </span>
                  <span className="text-xs text-[#A3A3A3] block mb-2">
                    ₹{variantPickerProduct.default_selling_price} (Stock: {variantPickerProduct.stock_qty})
                  </span>
                </button>

                {/* Added Variants Options */}
                {variantPickerProduct.variants?.map((v, idx) => (
                  <button
                    key={idx}
                    onClick={() => toggleCartItem(variantPickerProduct, idx)}
                    disabled={v.stock_qty <= 0}
                    className={`p-3 rounded-lg border text-left transition-colors flex flex-col justify-between h-full ${v.stock_qty > 0 ? "bg-[#1A1A1A] border-[#1F1F1F] hover:border-orange-500" : "bg-[#0A0A0A] border-[#1F1F1F] opacity-50"}`}
                  >
                    <span className="text-sm font-bold text-orange-400 block mb-1">{v.label}</span>
                    <span className="text-xs text-[#A3A3A3] block mb-2">
                      ₹{v.selling_price} (Stock: {v.stock_qty})
                    </span>
                    {v.stock_qty <= 0 && <span className="text-[10px] text-red-400 font-bold uppercase mt-auto">Out of Stock</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sticky Cart Button */}
      {!showMobileCart && cart.length > 0 && (
        <div className="lg:hidden fixed bottom-[80px] left-4 right-4 z-50">
          <button 
            onClick={() => setShowMobileCart(true)}
            className="w-full bg-orange-500 text-[#0A0A0A] p-4 rounded-xl font-bold flex items-center justify-between shadow-[0_0_30px_rgba(249,115,22,0.3)] border border-orange-400/50 transition-transform active:scale-[0.98]"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              <span>View Cart ({cart.length} item{cart.length !== 1 ? 's' : ''})</span>
            </div>
            <span>₹{subtotal.toLocaleString('en-IN')}</span>
          </button>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustStockProduct && (
        <div className="fixed inset-0 bg-black/60 z-[999999] flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#1F1F1F] rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-[fadeIn_0.1s_ease-out]">
            <div className="p-4 border-b border-[#1F1F1F] flex justify-between items-center bg-[#0A0A0A]">
              <h3 className="font-bold text-[#F5F5F5] flex items-center gap-2">
                <PackagePlus className="w-4 h-4 text-green-400" />
                Add Stock
              </h3>
              <button onClick={() => setAdjustStockProduct(null)} className="text-[#737373] hover:text-[#F5F5F5]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-[#F5F5F5]">{adjustStockProduct.product_code}</h4>
                <p className="text-xs text-[#A3A3A3]">{adjustStockProduct.name}</p>
              </div>

              {adjustStockProduct.variants && adjustStockProduct.variants.length > 0 && (
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-[#737373] font-bold ml-1">Select Variant</label>
                  <select 
                    value={adjustStockVariantIdx ?? 0}
                    onChange={(e) => setAdjustStockVariantIdx(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#1F1F1F] rounded text-sm text-[#F5F5F5] focus:outline-none focus:border-green-500"
                  >
                    {adjustStockProduct.variants.map((v, idx) => (
                      <option key={idx} value={idx}>
                        {v.label} (Current: {v.stock_qty})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-[#737373] font-bold ml-1">
                  Quantity to Add {(!adjustStockProduct.variants || adjustStockProduct.variants.length === 0) && `(Current: ${adjustStockProduct.stock_qty})`}
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <ArrowUpCircle className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-green-500" />
                    <input 
                      type="number" 
                      min="1"
                      placeholder="e.g. 10" 
                      value={adjustStockQty} 
                      onChange={e => setAdjustStockQty(e.target.value)} 
                      className="w-full pl-9 pr-3 py-2 bg-[#1A1A1A] border border-[#1F1F1F] rounded text-sm text-[#F5F5F5] focus:outline-none focus:border-green-500 font-bold"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAdjustStockSubmit();
                      }}
                    />
                  </div>
                </div>
              </div>

              {adjustStockError && <div className="p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">{adjustStockError}</div>}
              
              <button 
                onClick={handleAdjustStockSubmit}
                disabled={isAdjustingStock}
                className="w-full py-2.5 bg-green-500 hover:bg-green-600 text-[#0A0A0A] font-bold rounded flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isAdjustingStock ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Add Stock
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
