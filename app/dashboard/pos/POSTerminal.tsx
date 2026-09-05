"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, ArrowLeft } from "lucide-react";
import { Product, Category } from "@/app/actions/products";
import { Customer } from "@/app/actions/customers";
import { createOrderAction, getOrderDetails } from "@/app/actions/orders";
import { generateBillPdf } from "@/lib/generateBillPdf";
import { useRealtimeTable } from "@/lib/supabase/realtime";
import ImageViewerModal from "@/app/dashboard/components/ui/ImageViewerModal";

// Types & Hooks
import {
  SaleType,
  OrderType,
  PaymentMode,
  PaymentType,
  POSCustomerSelection,
} from "./types";
import { usePOSCart, POS_DRAFT_STORAGE_KEY } from "./hooks/usePOSCart";
import { usePOSProducts } from "./hooks/usePOSProducts";
import { usePOSHotkeys } from "./hooks/usePOSHotkeys";

// Modular Components
import POSHeader from "./components/POSHeader";
import POSProductGrid from "./components/POSProductGrid";
import POSCustomerBar from "./components/POSCustomerBar";
import POSCustomerModal from "./components/POSCustomerModal";
import POSCart from "./components/POSCart";
import POSCheckoutPanel from "./components/POSCheckoutPanel";
import POSVariantModal from "./components/POSVariantModal";
import POSQuickStockModal from "./components/POSQuickStockModal";
import POSSuccessModal from "./components/POSSuccessModal";

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
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Realtime Supabase table sync
  useRealtimeTable("products", () => {
    router.refresh();
  });
  useRealtimeTable("customers", () => {
    router.refresh();
  });

  // Product hook
  const {
    searchQuery,
    setSearchQuery,
    activeCategoryId,
    setActiveCategoryId,
    viewMode,
    setViewMode,
    filteredProducts,
    categoryCounts,
    findExactProduct,
  } = usePOSProducts(initialProducts, categories);

  // Cart hook
  const {
    cart,
    setCart,
    toggleCartItem,
    addToCart,
    updateCartItemQty,
    setCartItemQty,
    updateCartItemPrice,
    removeCartItem,
    clearCart,
    isInCart,
    subtotal,
    totalDiscount,
    totalPieces,
  } = usePOSCart();

  // Customer state (Default: Mandatory entry for customer details)
  const [selectedCustomer, setSelectedCustomer] = useState<POSCustomerSelection>({
    type: "NEW",
    name: "",
    phone: "",
    email: "",
    address: "",
  });
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  // Order configuration
  const [saleType, setSaleType] = useState<SaleType>("RETAIL");
  const [orderType, setOrderType] = useState<OrderType>("PURCHASE");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("CASH");
  const [paymentType, setPaymentType] = useState<PaymentType>("FULL");
  const [advanceAmountStr, setAdvanceAmountStr] = useState("");
  const [orderNotes, setOrderNotes] = useState("");

  // Modals & UI States
  const [variantPickerProduct, setVariantPickerProduct] = useState<Product | null>(null);
  const [quickStockProduct, setQuickStockProduct] = useState<Product | null>(null);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [lastOrderSuccess, setLastOrderSuccess] = useState<{
    orderNo: string;
    orderId: number;
    totalAmount: number;
    customerName: string;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showMobileCart, setShowMobileCart] = useState(false);

  const isHydrated = useRef(false);

  // Restore draft state from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(POS_DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Required customer info is default: only restore if a real saved customer or valid name/phone exists
        if (
          parsed.selectedCustomer &&
          parsed.selectedCustomer.type !== "WALK_IN" &&
          (parsed.selectedCustomer.phone?.trim() || parsed.selectedCustomer.name?.trim())
        ) {
          setSelectedCustomer(parsed.selectedCustomer);
        } else {
          setSelectedCustomer({
            type: "NEW",
            name: "",
            phone: "",
            email: "",
            address: "",
          });
        }
        if (parsed.saleType) setSaleType(parsed.saleType);
        if (parsed.orderType) setOrderType(parsed.orderType);
        if (parsed.paymentMode) setPaymentMode(parsed.paymentMode);
        if (parsed.paymentType) setPaymentType(parsed.paymentType);
        if (parsed.advanceAmountStr !== undefined) setAdvanceAmountStr(parsed.advanceAmountStr);
        if (parsed.orderNotes !== undefined) setOrderNotes(parsed.orderNotes);
      }
    } catch (e) {
      console.error("Failed to restore POS draft from session:", e);
    } finally {
      isHydrated.current = true;
    }
  }, []);

  // Persist draft changes to sessionStorage
  useEffect(() => {
    if (!isHydrated.current) return;
    try {
      const draft = {
        selectedCustomer:
          selectedCustomer.type === "WALK_IN" ? null : selectedCustomer,
        cart,
        saleType,
        orderType,
        paymentMode,
        paymentType,
        advanceAmountStr,
        orderNotes,
      };
      sessionStorage.setItem(POS_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch (e) {
      // Ignore quota errors
    }
  }, [
    selectedCustomer,
    cart,
    saleType,
    orderType,
    paymentMode,
    paymentType,
    advanceAmountStr,
    orderNotes,
  ]);

  // Product click handler
  const handleProductClick = (product: Product) => {
    if (product.variants && product.variants.length > 0) {
      setVariantPickerProduct(product);
    } else {
      toggleCartItem(product);
    }
  };

  // Quick Barcode / SKU match addition on Enter key
  const handleBarcodeAdd = (product: Product) => {
    if (product.variants && product.variants.length > 0) {
      setVariantPickerProduct(product);
    } else {
      addToCart(product, undefined, 1);
    }
  };

  // Keyboard Shortcuts Handler
  usePOSHotkeys({
    searchInputRef,
    onCheckout: () => {
      if (cart.length > 0 && !isSubmitting) {
        handlePlaceOrder();
      }
    },
    onEscape: () => {
      if (isCustomerModalOpen) setIsCustomerModalOpen(false);
      else if (variantPickerProduct) setVariantPickerProduct(null);
      else if (quickStockProduct) setQuickStockProduct(null);
      else if (previewProduct) setPreviewProduct(null);
      else if (lastOrderSuccess) setLastOrderSuccess(null);
      else if (searchQuery) setSearchQuery("");
    },
  });

  // Reset entire POS state
  const handleResetTerminal = () => {
    clearCart();
    setSelectedCustomer({
      type: "NEW",
      name: "",
      phone: "",
      email: "",
      address: "",
    });
    setSaleType("RETAIL");
    setOrderType("PURCHASE");
    setPaymentMode("CASH");
    setPaymentType("FULL");
    setAdvanceAmountStr("");
    setOrderNotes("");
    setErrorMsg("");
    try {
      sessionStorage.removeItem(POS_DRAFT_STORAGE_KEY);
    } catch (e) {}
  };

  // Order Submission Handler
  const handlePlaceOrder = async () => {
    setErrorMsg("");

    if (cart.length === 0) {
      setErrorMsg("Cart is empty.");
      return;
    }

    // Validate selling prices
    for (const item of cart) {
      if (item.sellingPrice === "" || Number(item.sellingPrice) <= 0) {
        setErrorMsg(`Selling price for ${item.product.product_code} cannot be blank or zero.`);
        return;
      }
    }

    // Customer validation: Mandatory before Walk-in customer
    if (selectedCustomer.type !== "WALK_IN" && (!selectedCustomer.name?.trim() || !selectedCustomer.phone?.trim())) {
      setErrorMsg("Customer Phone and Name are required. Please enter customer details or click Walk-in to bypass.");
      return;
    }

    const actualPaymentType = orderType === "PURCHASE" ? "FULL" : paymentType;
    const paymentAmount =
      actualPaymentType === "FULL" ? subtotal : parseFloat(advanceAmountStr) || 0;

    if (actualPaymentType === "ADVANCE" && (paymentAmount <= 0 || paymentAmount >= subtotal)) {
      setErrorMsg("Advance payment amount must be greater than 0 and less than total amount.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      customerId:
        selectedCustomer.type === "EXISTING" ? selectedCustomer.customer?.id : undefined,
      newCustomerName:
        selectedCustomer.type === "NEW"
          ? selectedCustomer.name.trim()
          : selectedCustomer.type === "WALK_IN"
          ? "Walk-in Customer"
          : undefined,
      newCustomerPhone:
        selectedCustomer.type === "NEW"
          ? selectedCustomer.phone.trim()
          : undefined,
      newCustomerEmail:
        selectedCustomer.type === "NEW" && selectedCustomer.email
          ? selectedCustomer.email.trim()
          : undefined,
      orderType: actualPaymentType === "ADVANCE" ? "BOOKING" : orderType,
      saleType,
      discount: totalDiscount,
      totalAmount: subtotal,
      paymentMode,
      paymentType: actualPaymentType,
      paymentAmount,
      notes: orderNotes.trim() || undefined,
      items: cart.map((i) => ({
        productId: i.product.id,
        variantIndex: i.variantIndex,
        quantity: i.quantity,
        sellingPrice: Number(i.sellingPrice),
      })),
    };

    const res = await createOrderAction(payload);
    setIsSubmitting(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      const orderId = res.orderId || 0;
      const orderNo = res.orderNo || "";
      const customerDisplayName =
        selectedCustomer.type === "EXISTING"
          ? selectedCustomer.customer?.name || "Customer"
          : selectedCustomer.name || "Customer";

      // Show Success Modal
      setLastOrderSuccess({
        orderNo,
        orderId,
        totalAmount: subtotal,
        customerName: customerDisplayName,
      });

      // Auto-trigger invoice generation in background
      if (orderId) {
        getOrderDetails(orderId)
          .then((fullOrder) => {
            if (fullOrder) generateBillPdf(fullOrder).catch((err) => console.error("Auto print error:", err));
          })
          .catch((err) => console.error("Fetch order for invoice failed:", err));
      }

      // Reset cart and customer for the next order
      handleResetTerminal();
      router.refresh();
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 sm:gap-5 h-[calc(100vh-7.5rem)] min-h-[600px] overflow-hidden relative select-none">
      {/* ========================================================================= */}
      {/* LEFT PANEL: Product Catalog (60% Width)                                   */}
      {/* ========================================================================= */}
      <div
        className={`w-full lg:w-[60%] ds-card p-0 flex flex-col overflow-hidden h-full ${
          showMobileCart ? "hidden lg:flex" : "flex"
        }`}
      >
        {/* Header with Search, Category Filter Chips, View Toggle */}
        <POSHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchInputRef={searchInputRef}
          categories={categories}
          activeCategoryId={activeCategoryId}
          onSelectCategory={setActiveCategoryId}
          categoryCounts={categoryCounts}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onExactMatchAdd={handleBarcodeAdd}
          findExactProduct={findExactProduct}
          totalProductsCount={initialProducts.length}
          filteredCount={filteredProducts.length}
        />

        {/* Product Grid / List (Scrollable) */}
        <POSProductGrid
          products={filteredProducts}
          viewMode={viewMode}
          isInCart={isInCart}
          onProductClick={handleProductClick}
          onQuickStock={(e, p) => {
            e.stopPropagation();
            setQuickStockProduct(p);
          }}
          onZoom={(e, p) => {
            e.stopPropagation();
            setPreviewProduct(p);
          }}
          onClearFilters={() => {
            setSearchQuery("");
            setActiveCategoryId("ALL");
          }}
        />
      </div>

      {/* ========================================================================= */}
      {/* RIGHT PANEL: Customer Bar + Cart Items + Checkout Panel (40% Width)       */}
      {/* ========================================================================= */}
      <div
        className={`w-full lg:w-[40%] ds-card p-0 flex flex-col overflow-hidden h-full ${
          !showMobileCart ? "hidden lg:flex" : "flex"
        }`}
      >
        {/* Mobile Back Button (only shown on small screens when viewing cart) */}
        <div className="lg:hidden p-3 border-b border-[#222227] bg-[#121215] flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowMobileCart(false)}
            className="flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-[#FAFAFA] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Products</span>
          </button>
          <span className="text-xs font-bold text-orange-400">Order Terminal</span>
        </div>

        {/* 1. Customer Section (Always Open & Mandatory before Walk-in) */}
        <POSCustomerBar
          selectedCustomer={selectedCustomer}
          customers={initialCustomers}
          onOpenCustomerModal={() => setIsCustomerModalOpen(true)}
          onSetWalkIn={() =>
            setSelectedCustomer({
              type: "WALK_IN",
              name: "Walk-in Customer",
              phone: "",
              email: "",
              address: "",
            })
          }
          onSelectCustomer={setSelectedCustomer}
          hasValidationError={Boolean(
            errorMsg &&
              selectedCustomer.type !== "WALK_IN" &&
              (!selectedCustomer.name?.trim() || !selectedCustomer.phone?.trim())
          )}
        />

        {/* 2. Spacious Cart Items List (70%+ Vertical Height) */}
        <POSCart
          cart={cart}
          onUpdateQty={updateCartItemQty}
          onSetQty={setCartItemQty}
          onUpdatePrice={updateCartItemPrice}
          onRemoveItem={removeCartItem}
          onClearCart={clearCart}
        />

        {/* 3. Compact Checkout & Payment Summary */}
        <POSCheckoutPanel
          saleType={saleType}
          onSaleTypeChange={setSaleType}
          orderType={orderType}
          onOrderTypeChange={setOrderType}
          paymentMode={paymentMode}
          onPaymentModeChange={setPaymentMode}
          paymentType={paymentType}
          onPaymentTypeChange={setPaymentType}
          advanceAmountStr={advanceAmountStr}
          onAdvanceAmountChange={setAdvanceAmountStr}
          orderNotes={orderNotes}
          onOrderNotesChange={setOrderNotes}
          subtotal={subtotal}
          totalDiscount={totalDiscount}
          isSubmitting={isSubmitting}
          onSubmitOrder={handlePlaceOrder}
          cartEmpty={cart.length === 0}
          errorMsg={errorMsg}
        />
      </div>

      {/* ========================================================================= */}
      {/* MOBILE STICKY FLOATING CART BAR                                           */}
      {/* ========================================================================= */}
      {!showMobileCart && cart.length > 0 && (
        <div className="lg:hidden fixed bottom-20 left-4 right-4 z-50 animate-[fadeInUp_0.2s_ease-out]">
          <button
            type="button"
            onClick={() => setShowMobileCart(true)}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-3.5 rounded-2xl font-bold flex items-center justify-between border border-orange-400/30 cursor-pointer active:scale-[0.98] transition-all shadow-md"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 stroke-[2.5]" />
              <span>
                View Cart ({cart.length} item{cart.length !== 1 ? "s" : ""})
              </span>
            </div>
            <span className="text-base font-mono">₹{subtotal.toLocaleString("en-IN")}</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS                                                                    */}
      {/* ========================================================================= */}

      {/* 1. Customer Search / Add Modal */}
      <POSCustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        customers={initialCustomers}
        selectedCustomer={selectedCustomer}
        onSelectCustomer={setSelectedCustomer}
      />

      {/* 2. Variant / Size Picker Modal */}
      <POSVariantModal
        product={variantPickerProduct}
        onClose={() => setVariantPickerProduct(null)}
        onSelectVariant={(p, vIdx) => {
          toggleCartItem(p, vIdx);
          setVariantPickerProduct(null);
        }}
      />

      {/* 3. Quick Add Stock Modal */}
      <POSQuickStockModal
        product={quickStockProduct}
        onClose={() => setQuickStockProduct(null)}
      />

      {/* 4. Sale Success Modal with Instant Invoice Print */}
      <POSSuccessModal
        isOpen={Boolean(lastOrderSuccess)}
        orderNo={lastOrderSuccess?.orderNo || ""}
        orderId={lastOrderSuccess?.orderId || null}
        totalAmount={lastOrderSuccess?.totalAmount || 0}
        customerName={lastOrderSuccess?.customerName || "Customer"}
        onClose={() => setLastOrderSuccess(null)}
      />

      {/* 5. Fullscreen Image Viewer Modal */}
      {previewProduct && (
        <ImageViewerModal
          images={previewProduct.photo_urls || []}
          title={`${previewProduct.product_code} - ${previewProduct.name}`}
          subtitle={`₹${previewProduct.default_selling_price} • ${
            previewProduct.category_name || ""
          }`}
          isOpen={Boolean(previewProduct)}
          onClose={() => setPreviewProduct(null)}
        />
      )}
    </div>
  );
}
