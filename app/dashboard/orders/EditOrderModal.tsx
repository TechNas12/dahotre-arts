"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Plus, Minus, Search, CreditCard, Package, Check, Trash2 } from "lucide-react";
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
  useEffect(() => setMounted(true), []);

  const [status, setStatus] = useState(order.status);
  const [fulfillmentStatus, setFulfillmentStatus] = useState(order.fulfillment_status);
  
  // Clone items for editing
  const [items, setItems] = useState(() => 
    order.items?.map(i => ({
      ...i,
      // Ensure we have a string/number ID that won't clash if we add new ones
      _id: Math.random().toString(), 
      sellingPriceStr: String(i.selling_price)
    })) || []
  );

  const [discountStr, setDiscountStr] = useState(() => {
    const itemSum = (order.items || []).reduce((acc, i) => acc + (parseFloat(String(i.selling_price)) || 0) * i.quantity, 0);
    const orderTotal = parseFloat(String(order.total_amount)) || 0;
    
    // If total_amount equals sum of items, the DB discount is an implicit item-level savings (from POS).
    // So there is no explicit order-level discount to show in the modal.
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

  // Product Picker state
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.product_code.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    }).slice(0, 50); // Limit for performance
  }, [products, searchQuery]);

  // Derived calculations
  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => {
      const price = parseFloat(item.sellingPriceStr) || 0;
      return acc + (item.quantity * price);
    }, 0);
  }, [items]);

  const totalAmount = useMemo(() => {
    const disc = parseFloat(discountStr) || 0;
    return Math.max(0, subtotal - disc);
  }, [subtotal, discountStr]);

  const totalPaid = useMemo(() => {
    return payments.reduce((acc, p) => acc + (parseFloat(p.amountStr) || 0), 0);
  }, [payments]);

  // Actions
  const updateItemQty = (id: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item._id === id) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
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
        _id: Math.random().toString(),
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
    setShowProductPicker(false);
  };

  const addPayment = () => {
    setPayments(prev => [...prev, {
      id: -Math.random(), // Negative ID for new payments
      payment_mode: "CASH",
      payment_type: "FINAL",
      amount: 0,
      amountStr: ""
    }]);
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

  const handleSave = async () => {
    setErrorMsg("");
    if (items.length === 0) {
      setErrorMsg("Order must have at least one item.");
      return;
    }
    
    // Validate selling prices
    for (const item of items) {
      const sp = parseFloat(item.sellingPriceStr);
      if (isNaN(sp) || sp < 0) {
        setErrorMsg(`Invalid selling price for ${item.product?.product_code}`);
        return;
      }
      const cost = item.variant_index != null && item.product?.variants ? item.product.variants[item.variant_index].cost_price : item.product?.cost_price;
      if (cost !== undefined && sp < cost) {
        setErrorMsg(`Selling price for ${item.product?.product_code} (₹${sp}) cannot be below cost price (₹${cost}).`);
        return;
      }
    }

    if (status === 'COMPLETED' && totalPaid < totalAmount) {
      setErrorMsg("Full payment is required to mark the order as COMPLETED.");
      return;
    }

    setIsSubmitting(true);

    const existingPaymentIds = payments.filter(p => p.id > 0).map(p => p.id);
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
      discount: parseFloat(discountStr) || 0,
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
      // Fetch fresh details and trigger success
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
    <div className="fixed inset-0 z-[999999] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#111111] border border-[#1F1F1F] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-[fadeInUp_0.2s_ease-out]">
        
        {/* Header */}
        <div className="p-5 border-b border-[#1F1F1F] bg-[#0A0A0A] flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold text-[#F5F5F5] flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-500" />
              Edit Order {order.order_no}
            </h2>
            <p className="text-sm text-[#A3A3A3] mt-1">
              Customer: <span className="font-medium text-[#F5F5F5]">{order.customer?.name}</span>
            </p>
          </div>
          <div className="flex gap-3 items-center">
            <button onClick={onClose} disabled={isSubmitting} className="text-[#737373] hover:text-[#F5F5F5] p-2 rounded-lg hover:bg-[#2A2A2A] transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-[#0A0A0A]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column (Items & Status) */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Status Section */}
              <div className="bg-[#111111] border border-[#1F1F1F] rounded-lg p-4">
                <h3 className="text-xs font-bold text-[#737373] uppercase tracking-wider mb-3">Order Status</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#737373] mb-1">Status</label>
                    <select value={status} onChange={e => setStatus(e.target.value)} className="w-full ds-select">
                      <option value="PENDING">PENDING</option>
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#737373] mb-1">Fulfillment</label>
                    <select value={fulfillmentStatus} onChange={e => setFulfillmentStatus(e.target.value)} className="w-full ds-select">
                      <option value="PENDING">PENDING</option>
                      <option value="FULFILLED">FULFILLED</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Items Section */}
              <div className="bg-[#111111] border border-[#1F1F1F] rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold text-[#737373] uppercase tracking-wider">Order Items</h3>
                  <button onClick={() => setShowProductPicker(true)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium transition-colors border border-slate-700 inline-flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Product
                  </button>
                </div>
                
                <div className="space-y-3">
                  {items.map((item, idx) => {
                    const price = parseFloat(item.sellingPriceStr) || 0;
                    return (
                      <div key={item._id} className="flex gap-3 items-center bg-[#1A1A1A] border border-[#1F1F1F] p-3 rounded-lg relative group">
                        <div className="flex-1 min-w-0">
                          <h5 className="text-sm font-bold text-[#F5F5F5]">{item.product?.product_code}</h5>
                          <p className="text-xs text-[#A3A3A3] truncate">{item.product?.name}</p>
                          {item.variant_index != null && item.product?.variants && (
                            <span className="inline-block mt-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] font-bold px-2 py-0.5 rounded">
                               {item.product.variants[item.variant_index].label}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-col items-center shrink-0 w-24">
                          <label className="text-[10px] text-[#737373] uppercase font-bold mb-1">Qty</label>
                          <div className="flex items-center gap-1 bg-[#111111] rounded border border-[#2A2A2A] h-7">
                            <button type="button" onClick={() => updateItemQty(item._id, -1)} disabled={item.quantity <= 1} className="p-1 text-[#737373] hover:text-[#F5F5F5] disabled:opacity-30"><Minus className="w-3 h-3" /></button>
                            <span className="w-6 text-center text-xs font-bold text-[#F5F5F5]">{item.quantity}</span>
                            <button type="button" onClick={() => updateItemQty(item._id, 1)} className="p-1 text-[#737373] hover:text-[#F5F5F5]"><Plus className="w-3 h-3" /></button>
                          </div>
                        </div>

                        <div className="flex flex-col items-end shrink-0 w-24">
                          <label className="text-[10px] text-[#737373] uppercase font-bold mb-1">Price (₹)</label>
                          <input 
                            type="number" 
                            value={item.sellingPriceStr}
                            onChange={(e) => updateItemPrice(item._id, e.target.value)}
                            className="w-full bg-[#111111] border border-[#2A2A2A] rounded px-2 py-1 text-xs font-bold text-orange-400 focus:outline-none focus:border-orange-400 hide-arrows text-right"
                          />
                        </div>

                        <div className="flex flex-col items-end shrink-0 w-20">
                          <label className="text-[10px] text-[#737373] uppercase font-bold mb-1">Subtotal</label>
                          <span className="text-sm font-bold text-green-400">₹{price * item.quantity}</span>
                        </div>

                        <button 
                          onClick={() => removeItem(item._id)}
                          className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                  {items.length === 0 && (
                     <div className="text-center p-6 text-slate-500 border border-dashed border-slate-700 rounded-lg">
                        No items in order. Please add products.
                     </div>
                  )}
                </div>
              </div>

            </div>

            {/* Right Column (Totals & Payments) */}
            <div className="space-y-6">
              
              {/* Totals */}
              <div className="bg-[#111111] border border-[#1F1F1F] rounded-lg p-4">
                <h3 className="text-xs font-bold text-[#737373] uppercase tracking-wider mb-3">Order Totals</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#A3A3A3]">Subtotal</span>
                    <span className="text-[#F5F5F5]">₹{subtotal}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-[#A3A3A3]">Discount (₹)</span>
                    <input 
                      type="number" 
                      value={discountStr}
                      onChange={e => setDiscountStr(e.target.value)}
                      className="w-24 bg-[#1A1A1A] border border-[#2A2A2A] rounded px-2 py-1 text-xs font-bold text-green-400 focus:outline-none focus:border-green-400 hide-arrows text-right"
                    />
                  </div>
                  
                  <div className="flex justify-between text-lg font-bold pt-3 border-t border-[#1F1F1F]">
                    <span className="text-[#F5F5F5]">Total</span>
                    <span className="text-orange-500">₹{totalAmount}</span>
                  </div>
                </div>
              </div>

              {/* Payments */}
              <div className="bg-[#111111] border border-[#1F1F1F] rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-bold text-[#737373] uppercase tracking-wider flex items-center gap-2"><CreditCard className="w-3.5 h-3.5" /> Payments</h3>
                  <button onClick={addPayment} className="text-xs text-orange-400 hover:text-orange-300 font-medium transition-colors">
                    + Add
                  </button>
                </div>
                
                <div className="space-y-2">
                  {payments.map((pay) => (
                    <div key={pay.id} className="flex gap-2 items-center bg-[#1A1A1A] border border-[#1F1F1F] p-2 rounded-lg relative group">
                      <select 
                        value={pay.payment_mode} 
                        onChange={e => updatePayment(pay.id, 'payment_mode', e.target.value)}
                        className="w-20 bg-[#111111] border border-[#2A2A2A] rounded px-1 py-1 text-xs text-[#F5F5F5] focus:outline-none"
                      >
                        <option value="CASH">CASH</option>
                        <option value="ONLINE">ONLINE</option>
                      </select>
                      
                      <select 
                        value={pay.payment_type} 
                        onChange={e => updatePayment(pay.id, 'payment_type', e.target.value)}
                        className="flex-1 bg-[#111111] border border-[#2A2A2A] rounded px-1 py-1 text-xs text-[#F5F5F5] focus:outline-none"
                      >
                        <option value="FULL">FULL</option>
                        <option value="ADVANCE">ADVANCE</option>
                        <option value="FINAL">FINAL</option>
                      </select>
                      
                      <div className="relative w-24">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-[#737373]">₹</span>
                        <input 
                          type="number" 
                          value={pay.amountStr}
                          onChange={e => updatePayment(pay.id, 'amountStr', e.target.value)}
                          className="w-full pl-5 pr-2 py-1 bg-[#111111] border border-[#2A2A2A] rounded text-xs font-bold text-orange-400 focus:outline-none focus:border-orange-400 hide-arrows"
                        />
                      </div>
                      
                      <button onClick={() => removePayment(pay.id)} className="p-1 text-[#737373] hover:text-red-400 transition-colors">
                         <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  
                  {payments.length === 0 && (
                    <div className="text-xs text-slate-500 py-2">No payments recorded.</div>
                  )}
                  
                  <div className="flex justify-between text-xs font-bold pt-2 mt-2 border-t border-[#1F1F1F]">
                    <span className="text-[#A3A3A3]">Total Paid</span>
                    <span className={totalPaid >= totalAmount ? "text-green-400" : "text-amber-400"}>
                       ₹{totalPaid} {totalPaid < totalAmount && <span className="font-normal text-slate-500 ml-1">/ ₹{totalAmount}</span>}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1F1F1F] bg-[#0A0A0A] flex justify-between items-center shrink-0">
           {errorMsg ? (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded">{errorMsg}</div>
           ) : <div />}
           
           <div className="flex gap-3">
             <button onClick={onClose} disabled={isSubmitting} className="ds-btn-ghost text-sm py-2">
               Cancel
             </button>
             <button onClick={handleSave} disabled={isSubmitting} className="ds-btn-primary text-sm py-2 flex items-center gap-2">
               {isSubmitting ? "Saving..." : <><Check className="w-4 h-4" /> Save Changes</>}
             </button>
           </div>
        </div>
      </div>

      {/* Product Picker Overlay */}
      {showProductPicker && (
        <div className="fixed inset-0 z-[1000000] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#1F1F1F] rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-[fadeIn_0.1s_ease-out]">
            <div className="p-4 border-b border-[#1F1F1F] bg-[#0A0A0A] flex gap-3 items-center">
              <Search className="w-5 h-5 text-[#737373]" />
              <input 
                type="text" 
                placeholder="Search products to add..." 
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none text-[#F5F5F5] focus:outline-none text-sm"
              />
              <button onClick={() => setShowProductPicker(false)} className="text-[#737373] hover:text-[#F5F5F5] p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
              {filteredProducts.map(p => (
                <div key={p.id} className="bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#1F1F1F] rounded-lg p-3 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                       <span className="font-bold text-[#F5F5F5] text-sm mr-2">{p.product_code}</span>
                       <span className="text-xs text-[#A3A3A3]">{p.name}</span>
                    </div>
                  </div>
                  
                  {p.variants && p.variants.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {p.variants.map((v, idx) => (
                        <button 
                          key={idx} 
                          onClick={() => addProduct(p, idx)}
                          className="text-[10px] bg-[#111111] border border-[#2A2A2A] hover:border-orange-500 text-[#F5F5F5] px-2 py-1 rounded transition-colors flex items-center gap-1"
                        >
                          <span className="text-orange-400 font-bold">{v.label}</span>
                          <span className="text-[#737373]">₹{v.selling_price}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 flex justify-between items-center">
                      <span className="text-xs text-orange-400 font-bold">₹{p.default_selling_price}</span>
                      <button 
                         onClick={() => addProduct(p)}
                         className="text-[10px] font-bold uppercase tracking-wide bg-orange-500 text-[#0A0A0A] hover:bg-orange-400 px-3 py-1 rounded transition-colors"
                      >
                         Add
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {filteredProducts.length === 0 && (
                <div className="text-center p-6 text-slate-500">No products found.</div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>,
    document.body
  );
}
