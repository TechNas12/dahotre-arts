"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, Plus, Minus, X, Check, ShoppingBag, CreditCard, Banknote, LayoutGrid, List, UserPlus, FileDown } from "lucide-react";
import { Product, Category } from "@/app/actions/products";
import { Customer } from "@/app/actions/customers";
import { createOrderAction, getOrderDetails } from "@/app/actions/orders";
import { generateBillPdf } from "@/lib/generateBillPdf";

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

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 lg:h-[calc(100vh-130px)] pb-20 lg:pb-0">
      
      {/* LEFT PANEL: Products (60%) */}
      <div className="w-full lg:flex-[6] h-[60vh] lg:h-auto bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-sm">
        
        {/* Search & Tabs (Fixed Top) */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/95 z-10 space-y-4 shrink-0">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search products by name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all placeholder:text-slate-600"
              />
            </div>
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-700">
              <button 
                onClick={() => setViewMode("GRID")}
                className={`p-2 rounded-md transition-colors ${viewMode === "GRID" ? "bg-slate-800 text-green-400" : "text-slate-500 hover:text-slate-300"}`}
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setViewMode("LIST")}
                className={`p-2 rounded-md transition-colors ${viewMode === "LIST" ? "bg-slate-800 text-green-400" : "text-slate-500 hover:text-slate-300"}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            <button
              onClick={() => setActiveCategoryId("ALL")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategoryId === "ALL" ? "bg-green-500 text-slate-950 glow-green" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              All Products
            </button>
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveCategoryId(c.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCategoryId === c.id ? "bg-green-500 text-slate-950 glow-green" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid/List (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {filteredProducts.length === 0 ? (
             <div className="text-center text-slate-500 mt-10">No products found.</div>
          ) : viewMode === "GRID" ? (
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4">
              {filteredProducts.map(product => {
                const inCart = isInCart(product.id);
                return (
                  <div 
                    key={product.id} 
                    onClick={() => handleAddClick(product)}
                    className={`bg-slate-950 rounded-lg overflow-hidden flex flex-col transition-all group cursor-pointer 
                      ${product.stock_qty <= 0 ? "opacity-50 pointer-events-none border border-slate-800" : ""}
                      ${inCart ? "border-2 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.2)]" : "border border-slate-800 hover:border-green-500/50"}
                    `}
                  >
                    <div className="h-32 bg-slate-900 relative overflow-hidden flex items-center justify-center">
                      {product.photo_urls && product.photo_urls.length > 0 ? (
                        <img src={product.photo_urls[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <ShoppingBag className="w-8 h-8 text-slate-700" />
                      )}
                      {product.stock_qty <= 0 && (
                        <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center">
                          <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">OUT OF STOCK</span>
                        </div>
                      )}
                      {inCart && product.stock_qty > 0 && (
                        <div className="absolute top-2 right-2 bg-green-500 text-slate-950 rounded-full p-1 shadow-lg">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div className="p-3 flex flex-col flex-1">
                      <h4 className="text-lg font-bold text-slate-100 mb-0.5">{product.product_code}</h4>
                      {product.variants && product.variants.length > 0 ? (
                        <div className="mb-2">
                          <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{product.variants.length} sizes</span>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 line-clamp-1 mb-2">
                          {product.name} {product.height ? (product.base ? `(H-${product.height} B-${product.base})` : `(H-${product.height})`) : ""}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-800/50">
                        {product.variants && product.variants.length > 0 ? (
                           <span className="font-bold text-green-400 text-xs">
                             ₹{Math.min(...product.variants.map(v => v.selling_price))} - ₹{Math.max(...product.variants.map(v => v.selling_price))}
                           </span>
                        ) : (
                           <span className="font-bold text-green-400">₹{product.default_selling_price}</span>
                        )}
                        <span className="text-xs text-slate-500 font-medium bg-slate-900 px-2 py-0.5 rounded">
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
                      className={`flex items-center gap-4 bg-slate-950 rounded-lg p-3 transition-colors cursor-pointer relative overflow-hidden
                        ${product.stock_qty <= 0 ? "opacity-50 pointer-events-none border border-slate-800" : ""}
                        ${inCart ? "border-2 border-green-500 bg-green-500/5 shadow-[0_0_10px_rgba(34,197,94,0.1)]" : "border border-slate-800 hover:border-green-500/50"}
                      `}
                    >
                      <div className="w-16 h-16 bg-slate-900 rounded shrink-0 overflow-hidden flex items-center justify-center relative">
                        {product.photo_urls && product.photo_urls.length > 0 ? (
                          <img src={product.photo_urls[0]} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <ShoppingBag className="w-6 h-6 text-slate-700" />
                        )}
                        {inCart && product.stock_qty > 0 && (
                          <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                             <Check className="w-6 h-6 text-green-400 stroke-[3] drop-shadow-md" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                         <h4 className="text-lg font-bold text-slate-100">{product.product_code}</h4>
                         {product.variants && product.variants.length > 0 ? (
                           <div className="mt-1">
                             <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{product.variants.length} sizes</span>
                           </div>
                         ) : (
                           <p className="text-sm text-slate-400 truncate">
                              {product.name} {product.height ? (product.base ? `(H-${product.height} B-${product.base})` : `(H-${product.height})`) : ""}
                           </p>
                         )}
                      </div>
                      <div className="text-right">
                         {product.variants && product.variants.length > 0 ? (
                           <div className="font-bold text-green-400 text-sm">
                             ₹{Math.min(...product.variants.map(v => v.selling_price))} - ₹{Math.max(...product.variants.map(v => v.selling_price))}
                           </div>
                         ) : (
                           <div className="font-bold text-green-400">₹{product.default_selling_price}</div>
                         )}
                         <div className="text-xs text-slate-500 mt-1">
                           Stock: {product.variants && product.variants.length > 0 ? product.variants.reduce((acc, v) => acc + v.stock_qty, 0) : product.stock_qty}
                         </div>
                      </div>
                      {product.stock_qty <= 0 && (
                         <span className="bg-red-500/20 text-red-500 text-xs font-bold px-2 py-1 rounded ml-2">OUT OF STOCK</span>
                      )}
                    </div>
                  );
                })}
             </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Cart & Order (40%) */}
      <div className="w-full lg:flex-[4] h-[80vh] lg:h-auto bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-sm">
        
        {/* Customer Section (Fixed Top) */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/95 shrink-0 flex flex-col gap-3">
          <div className="flex gap-2">
            <Search className="w-5 h-5 absolute ml-3 mt-2 text-slate-500 pointer-events-none" />
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value === "NEW" ? "NEW" : Number(e.target.value))}
              className="flex-1 pl-10 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-green-500 appearance-none cursor-pointer"
            >
              <option value="NEW">+ Add New Customer</option>
              <option value="" disabled>--- Existing Customers ---</option>
              {initialCustomers.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-3 relative">
            {selectedCustomerId !== "NEW" && (
              <div className="absolute inset-0 bg-slate-950/40 z-10 rounded-lg cursor-not-allowed"></div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-slate-500 font-bold ml-1">Name</label>
                <input type="text" placeholder="Rahul Sharma" value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:border-green-500" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-slate-500 font-bold ml-1">Phone</label>
                <input type="tel" placeholder="+91..." value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)} className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:border-green-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-slate-500 font-bold ml-1">Email</label>
                <input type="email" placeholder="rahul@example.com" value={newCustomerEmail} onChange={e => setNewCustomerEmail(e.target.value)} className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:border-green-500" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-slate-500 font-bold ml-1">Address</label>
                <input type="text" placeholder="14, MG Road, Mumbai..." value={newCustomerAddress} onChange={e => setNewCustomerAddress(e.target.value)} className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:border-green-500" />
              </div>
            </div>
            {selectedCustomerId === "NEW" && !customerAddedVisual && (
              <button 
                onClick={handleAddCustomerVisual}
                className="w-full py-1.5 mt-1 bg-slate-800 hover:bg-slate-700 text-green-400 font-medium rounded text-xs transition-colors flex items-center justify-center gap-1.5 border border-green-500/30"
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
        <div className="px-4 py-2 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between shrink-0">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" /> CART
          </h3>
          <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">{cart.length} items</span>
        </div>

        {/* Cart Items (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600">
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
                <div key={`${item.product.id}-${item.variantIndex ?? 'base'}`} className={`bg-slate-950 p-3 rounded-lg border flex flex-col gap-2 relative group transition-colors ${isBelowCost ? "border-red-500/50" : "border-slate-800"}`}>
                  <div className="flex justify-between items-start pr-6">
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-bold text-slate-200 leading-tight truncate">{item.product.product_code}</h5>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{item.product.name}</p>
                      {item.variantIndex != null && item.product.variants && (
                        <span className="inline-block mt-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold px-2 py-0.5 rounded">
                           {item.product.variants[item.variantIndex].label}
                        </span>
                      )}
                    </div>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-1 bg-slate-900 rounded border border-slate-700 shrink-0 ml-2 h-7">
                      <button onClick={() => updateCartItemQty(item.product.id, -1, item.variantIndex)} disabled={item.quantity <= 1} className="p-1 text-slate-400 hover:text-slate-100 disabled:opacity-30"><Minus className="w-3 h-3" /></button>
                      <span className="w-5 text-center text-xs font-semibold text-slate-200">{item.quantity}</span>
                      <button onClick={() => updateCartItemQty(item.product.id, 1, item.variantIndex)} disabled={item.quantity >= maxStock} className="p-1 text-slate-400 hover:text-slate-100 disabled:opacity-30"><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>
                  
                  <div className="flex items-end justify-between mt-2 pt-2 border-t border-slate-800/50">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 uppercase font-medium">Original</span>
                        {saved > 0 && discountPercent > 0 && (
                          <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded">
                            {discountPercent}% OFF
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-slate-400 line-through decoration-slate-600">₹{defaultPrice}</span>
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-slate-500 uppercase font-medium">Selling Price</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-green-400 font-bold">₹</span>
                        <input 
                          type="number" 
                          value={item.sellingPrice}
                          onChange={(e) => updateCartItemPrice(item.product.id, e.target.value, item.variantIndex)}
                          className={`w-20 bg-slate-900 border rounded px-2 py-1 text-sm font-bold focus:outline-none hide-arrows text-right transition-colors
                            ${isBelowCost ? "border-red-500 text-red-400 focus:border-red-400 focus:ring-1 focus:ring-red-400" : "border-slate-600 text-green-400 focus:border-green-400 focus:ring-1 focus:ring-green-400"}
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
                    className="absolute top-2 right-2 p-1 text-slate-600 hover:text-red-400 rounded transition-colors opacity-0 group-hover:opacity-100 bg-slate-900"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Order Details & Payment (Fixed Bottom) */}
        <div className="border-t border-slate-800 bg-slate-900/95 p-4 shrink-0 space-y-4 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.5)]">
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 flex-1">
              <button 
                onClick={() => setOrderType("PURCHASE")}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${orderType === "PURCHASE" ? "bg-slate-800 text-slate-100" : "text-slate-500 hover:text-slate-300"}`}
              >
                PURCHASE
              </button>
              <button 
                onClick={() => setOrderType("BOOKING")}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${orderType === "BOOKING" ? "bg-slate-800 text-slate-100" : "text-slate-500 hover:text-slate-300"}`}
              >
                BOOKING
              </button>
            </div>
            
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 flex-1">
               <button 
                onClick={() => setPaymentMode("CASH")}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${paymentMode === "CASH" ? "bg-slate-800 text-slate-100" : "text-slate-500 hover:text-slate-300"}`}
              >
                <Banknote className="w-3 h-3" /> CASH
              </button>
              <button 
                onClick={() => setPaymentMode("ONLINE")}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${paymentMode === "ONLINE" ? "bg-slate-800 text-slate-100" : "text-slate-500 hover:text-slate-300"}`}
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
                className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-green-500 w-1/2"
              >
                <option value="FULL">Full Payment</option>
                <option value="ADVANCE">Advance Paid</option>
              </select>
              {paymentType === "ADVANCE" && (
                <div className="relative w-1/2">
                   <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₹</span>
                   <input 
                      type="number" 
                      placeholder="Amount" 
                      value={advanceAmountStr} 
                      onChange={e => setAdvanceAmountStr(e.target.value)} 
                      className="w-full pl-7 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-green-500 hide-arrows"
                    />
                </div>
              )}
            </div>
          )}

          <div className="pt-3 border-t border-slate-800/50 space-y-1.5">
            <div className="flex justify-between text-sm text-slate-400">
              <span>Subtotal</span>
              <span>₹{subtotal + totalDiscount}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-500">
                <span>Total Discount</span>
                <span>- ₹{totalDiscount}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold text-slate-50 pt-1">
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
            className="w-full py-3.5 bg-green-500 hover:bg-green-600 text-slate-950 font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed glow-green flex items-center justify-center gap-2"
          >
            {isSubmitting ? "Processing..." : (
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
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-green-400" />
                Select Size
              </h3>
              <button onClick={() => setVariantPickerProduct(null)} className="text-slate-500 hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-sm font-bold text-slate-200 mb-2">{variantPickerProduct.name}</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Base Product Option */}
                <button
                  onClick={() => toggleCartItem(variantPickerProduct, undefined)}
                  disabled={variantPickerProduct.stock_qty <= 0}
                  className={`p-3 rounded-lg border text-left transition-colors flex flex-col justify-between h-full ${variantPickerProduct.stock_qty > 0 ? "bg-slate-900 border-slate-700 hover:border-green-500" : "bg-slate-950 border-slate-800 opacity-50"}`}
                >
                  <span className="text-sm font-bold text-slate-200 block mb-1">
                    {variantPickerProduct.height ? (variantPickerProduct.base ? `H-${variantPickerProduct.height} B-${variantPickerProduct.base}` : `H-${variantPickerProduct.height}`) : "Base Size"}
                  </span>
                  <span className="text-xs text-slate-400 block mb-2">
                    ₹{variantPickerProduct.default_selling_price} (Stock: {variantPickerProduct.stock_qty})
                  </span>
                </button>

                {/* Added Variants Options */}
                {variantPickerProduct.variants?.map((v, idx) => (
                  <button
                    key={idx}
                    onClick={() => toggleCartItem(variantPickerProduct, idx)}
                    disabled={v.stock_qty <= 0}
                    className={`p-3 rounded-lg border text-left transition-colors flex flex-col justify-between h-full ${v.stock_qty > 0 ? "bg-slate-900 border-slate-700 hover:border-green-500" : "bg-slate-950 border-slate-800 opacity-50"}`}
                  >
                    <span className="text-sm font-bold text-amber-400 block mb-1">{v.label}</span>
                    <span className="text-xs text-slate-400 block mb-2">
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

    </div>
  );
}
