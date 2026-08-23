"use client";

import { useState, useActionState, useEffect, useMemo, useRef, useCallback, Fragment } from "react";
import { createPortal } from "react-dom";
import { Search, ChevronDown, Check, Trash2, Eye, X, ChevronRight, Package, User, CreditCard, Clock, CheckCircle2, AlertCircle, FileDown, Banknote, Filter } from "lucide-react";
import { deleteOrdersAction, Order, getOrderDetails, updateOrderStatusAction, addOrderPaymentAction, searchOrdersAction } from "@/app/actions/orders";
import { Product } from "@/app/actions/products";
import { generateBillPdf } from "@/lib/generateBillPdf";
import { TablePagination, PageSize, useTableQueryState } from "@/app/dashboard/components/TablePagination";
import { SearchInput } from "@/app/dashboard/components/SearchInput";
import { LiveBadge } from "@/app/dashboard/components/LiveBadge";
import { useRealtimeTable } from "@/lib/supabase/realtime";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import EditOrderModal from "./EditOrderModal";
import { Checkbox } from "@/app/dashboard/components/ui/Checkbox";
import { Dropdown } from "@/app/dashboard/components/ui/Dropdown";
import { StatusBadge } from "@/app/dashboard/components/ui/StatusBadge";



function StatusDropdown({ status, onChange }: { status: string; onChange: (val: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const toggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX, width: 140 });
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (buttonRef.current?.contains(e.target as Node)) return;
      if (dropdownRef.current?.contains(e.target as Node)) return;
      setIsOpen(false);
    };
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const updatePosition = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setCoords({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX, width: 140 });
      }
    };
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen]);

  const config: Record<string, { label: string, icon: any, color: string }> = {
    'COMPLETED': { label: 'COMPLETED', icon: CheckCircle2, color: 'text-green-400 bg-green-500/10 border-green-500/20 hover:bg-green-500/20' },
    'PENDING': { label: 'PENDING', icon: Clock, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20' },
    'CANCELLED': { label: 'CANCELLED', icon: AlertCircle, color: 'text-red-400 bg-red-500/10 border-red-500/20 hover:bg-red-500/20' }
  };
  const current = config[status] || config['PENDING'];
  const CurrentIcon = current.icon;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggleOpen}
        className={`inline-flex items-center gap-1 border px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase transition-colors outline-none focus:ring-2 focus:ring-slate-500/50 ${current.color}`}
      >
        <CurrentIcon className="w-3 h-3" />
        {current.label}
        <ChevronDown className={`w-3 h-3 ml-0.5 opacity-50 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && typeof document !== 'undefined' ? createPortal(
        <div
          ref={dropdownRef}
          style={{ top: coords.top, left: coords.left, width: coords.width }}
          className="ds-dropdown overflow-hidden"
        >
          {Object.keys(config).map(key => {
            const OptIcon = config[key].icon;
            return (
              <div
                key={key}
                onClick={(e) => { e.stopPropagation(); onChange(key); setIsOpen(false); }}
                className={status === key ? 'ds-dropdown-option-active flex items-center gap-2' : 'ds-dropdown-option flex items-center gap-2'}
              >
                <OptIcon className="w-3.5 h-3.5" />
                {config[key].label}
                {status === key && <Check className="w-3 h-3 ml-auto opacity-50" />}
              </div>
            );
          })}
        </div>,
        document.body
      ) : null}
    </>
  );
}

function FulfillmentDropdown({ status, onChange }: { status: string; onChange: (val: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const toggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX, width: 140 });
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (buttonRef.current?.contains(e.target as Node)) return;
      if (dropdownRef.current?.contains(e.target as Node)) return;
      setIsOpen(false);
    };
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const updatePosition = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setCoords({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX, width: 140 });
      }
    };
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen]);

  const config: Record<string, { label: string, icon: any, color: string }> = {
    'FULFILLED': { label: 'FULFILLED', icon: CheckCircle2, color: 'text-green-400 bg-green-500/10 border-green-500/20 hover:bg-green-500/20' },
    'PENDING': { label: 'PENDING', icon: Clock, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20' }
  };
  const current = config[status] || config['PENDING'];
  const CurrentIcon = current.icon;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggleOpen}
        className={`inline-flex items-center gap-1 border px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase transition-colors outline-none focus:ring-2 focus:ring-slate-500/50 ${current.color}`}
      >
        <CurrentIcon className="w-3 h-3" />
        {current.label}
        <ChevronDown className={`w-3 h-3 ml-0.5 opacity-50 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && typeof document !== 'undefined' ? createPortal(
        <div
          ref={dropdownRef}
          style={{ top: coords.top, left: coords.left, width: coords.width }}
          className="ds-dropdown overflow-hidden"
        >
          {Object.keys(config).map(key => {
            const OptIcon = config[key].icon;
            return (
              <div
                key={key}
                onClick={(e) => { e.stopPropagation(); onChange(key); setIsOpen(false); }}
                className={status === key ? 'ds-dropdown-option-active flex items-center gap-2' : 'ds-dropdown-option flex items-center gap-2'}
              >
                <OptIcon className="w-3.5 h-3.5" />
                {config[key].label}
                {status === key && <Check className="w-3 h-3 ml-auto opacity-50" />}
              </div>
            );
          })}
        </div>,
        document.body
      ) : null}
    </>
  );
}

export default function OrdersTable({ 
  initialOrders,  
  totalCount,
  initialPage = 1,
  initialPageSize = 25,
  initialSearch = "",
  initialStatus = "ALL",
  initialFulfillment = "ALL",
  initialDateFrom = "",
  initialDateTo = "",
  products
}: { 
  initialOrders: Order[],
  totalCount: number,
  initialPage?: number,
  initialPageSize?: number,
  initialSearch?: string,
  initialStatus?: string,
  initialFulfillment?: string,
  initialDateFrom?: string,
  initialDateTo?: string,
  products?: Product[],
}) {
  const router = useRouter();
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [activeOrders, setActiveOrders] = useState<Order[]>(initialOrders);
  const [total, setTotal] = useState(totalCount);
  const [isPending, setIsPending] = useState(false);
  const searchParams = useSearchParams();

  const [enrichedOrders, setEnrichedOrders] = useState<Record<number, Order>>({});
  const [removedIds, setRemovedIds] = useState<Set<number>>(new Set());

  const orders = useMemo(() => {
    return activeOrders
      .filter(o => !removedIds.has(o.id))
      .map(o => enrichedOrders[o.id] ? { ...o, ...enrichedOrders[o.id] } : o);
  }, [activeOrders, enrichedOrders, removedIds]);

  const {
    searchQuery,
    setSearchQuery,
    currentPage,
    pageSize,
    updateURL,
    handlePageChange,
    handlePageSizeChange,
  } = useTableQueryState({ initialSearch, initialPage, initialPageSize });

  const filterStatus = initialStatus || "ALL";
  const filterFulfillment = initialFulfillment || "ALL";
  
  // New filters
  const [filterPaymentMode, setFilterPaymentMode] = useState<string>(searchParams.get('paymentMode') || "ALL");
  const [filterOrderType, setFilterOrderType] = useState<string>(searchParams.get('orderType') || "ALL");

  // Filter change handlers
  const handleStatusChange = (val: string) => {
    updateURL({ status: val, page: 1 });
  };

  const handleFulfillmentChange = (val: string) => {
    updateURL({ fulfillment: val, page: 1 });
  };
  
  const handlePaymentModeChange = (val: string) => {
    setFilterPaymentMode(val);
    updateURL({ paymentMode: val === 'ALL' ? undefined : val, page: 1 });
  };
  
  const handleOrderTypeChange = (val: string) => {
    setFilterOrderType(val);
    updateURL({ orderType: val === 'ALL' ? undefined : val, page: 1 });
  };

  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);

  const applyDateFilter = () => {
    updateURL({ dateFrom, dateTo, page: 1 });
  };

  // Perform search locally
  const performSearch = async (
    query: string, page: number, size: number, 
    status: string, fulfillment: string, 
    dFrom: string, dTo: string,
    payMode: string, ordType: string
  ) => {
    setIsPending(true);
    const result = await searchOrdersAction({
      search: query,
      page,
      pageSize: size,
      status,
      fulfillment,
      dateFrom: dFrom,
      dateTo: dTo,
      paymentMode: payMode,
      orderType: ordType
    });
    setActiveOrders(result.data);
    setTotal(result.totalCount);
    setIsPending(false);
  };

  // Effect to trigger search when params change
  useEffect(() => {
    if (mounted) {
      const handler = setTimeout(() => {
         import("react").then((React) => {
            React.startTransition(() => {
               performSearch(searchQuery, currentPage, pageSize, filterStatus, filterFulfillment, dateFrom, dateTo, filterPaymentMode, filterOrderType);
            });
         });
      }, 200);
      return () => clearTimeout(handler);
    }
  }, [searchQuery, currentPage, pageSize, filterStatus, filterFulfillment, dateFrom, dateTo, filterPaymentMode, filterOrderType, mounted]);

  // Realtime updates (orders, order_items, and payments)
  const refreshOrders = useCallback(() => {
    performSearch(searchQuery, currentPage, pageSize, filterStatus, filterFulfillment, dateFrom, dateTo, filterPaymentMode, filterOrderType);
    router.refresh();
  }, [searchQuery, currentPage, pageSize, filterStatus, filterFulfillment, dateFrom, dateTo, filterPaymentMode, filterOrderType, router]);

  const { isConnected: isOrdersLive } = useRealtimeTable('orders', refreshOrders);
  const { isConnected: isItemsLive } = useRealtimeTable('order_items', refreshOrders);
  const { isConnected: isPaymentsLive } = useRealtimeTable('payments', refreshOrders);

  const isConnected = isOrdersLive || isItemsLive || isPaymentsLive;

  const pagedOrders = orders;

  const summary = useMemo(() => {
    let totalAmt = 0;
    let cash = 0;
    let online = 0;
    pagedOrders.forEach(order => {
      if (order.status !== 'CANCELLED') {
        totalAmt += Number(order.total_amount || 0);
        order.payments?.forEach(p => {
           if (p.payment_mode === 'CASH') cash += Number(p.amount);
           if (p.payment_mode === 'ONLINE') online += Number(p.amount);
        });
      }
    });
    const due = totalAmt - (cash + online);
    return { totalAmt, cash, online, due };
  }, [pagedOrders]);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const toggleSelectAll = () => {
    if (selectedIds.size === pagedOrders.length && pagedOrders.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(pagedOrders.map(o => o.id)));
  };
  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Expandable Rows
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const toggleExpand = async (orderId: number) => {
    const next = new Set(expandedRows);
    if (next.has(orderId)) {
      next.delete(orderId);
      setExpandedRows(next);
    } else {
      // Fetch details if not already loaded
      const order = orders.find(o => o.id === orderId);
      if (order && !order.items) {
        const fullDetails = await getOrderDetails(orderId);
        if (fullDetails) {
          setEnrichedOrders(prev => ({ ...prev, [orderId]: fullDetails }));
        }
      }
      next.add(orderId);
      setExpandedRows(next);
    }
  };

  // Drawer state
  const [drawerOrder, setDrawerOrder] = useState<Order | null>(null);
  const [isDrawerLoading, setIsDrawerLoading] = useState(false);
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editStatus, setEditStatus] = useState("");
  const [editFulfillment, setEditFulfillment] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);
  const [showFullEditModal, setShowFullEditModal] = useState(false);

  // Quick Collect State
  const [collectOrder, setCollectOrder] = useState<Order | null>(null);
  const [collectAmount, setCollectAmount] = useState<string>("");
  const [collectMode, setCollectMode] = useState<string>("CASH");
  const [isCollecting, setIsCollecting] = useState(false);

  const openQuickCollect = async (orderId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    let order = orders.find(o => o.id === orderId);
    if (!order?.payments) {
      const fullDetails = await getOrderDetails(orderId);
      if (fullDetails) {
        setEnrichedOrders(prev => ({ ...prev, [orderId]: fullDetails }));
        order = fullDetails;
      }
    }
    if (order) {
      setCollectOrder(order);
      const paid = order.payments?.reduce((acc, p) => acc + Number(p.amount), 0) || 0;
      const balance = Math.max(0, (order.total_amount || 0) - paid);
      setCollectAmount(balance.toString());
      setCollectMode("CASH");
    }
  };

  const handleQuickCollectSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectOrder || !collectAmount) return;
    
    if (!confirm(`Collecting ₹${collectAmount} via ${collectMode} for order ${collectOrder.order_no}. Confirm?`)) {
      return;
    }
    
    setIsCollecting(true);
    
    const amountNum = Number(collectAmount);
    await addOrderPaymentAction(collectOrder.id, amountNum, collectMode, "FINAL");
    
    const paidBefore = collectOrder.payments?.reduce((acc, p) => acc + Number(p.amount), 0) || 0;
    const newTotalPaid = paidBefore + amountNum;
    
    if (newTotalPaid >= (collectOrder.total_amount || 0) && collectOrder.status !== 'COMPLETED') {
      await updateOrderStatusAction(collectOrder.id, 'COMPLETED', collectOrder.fulfillment_status);
    }
    
    // Refresh details
    const fullDetails = await getOrderDetails(collectOrder.id);
    if (fullDetails) {
      setEnrichedOrders(prev => ({ ...prev, [collectOrder.id]: fullDetails }));
      
      if (fullDetails.order_type === 'BOOKING') {
         await generateBillPdf(fullDetails);
      }
    }
    
    setIsCollecting(false);
    setCollectOrder(null);
    performSearch(searchQuery, currentPage, pageSize, filterStatus, filterFulfillment, dateFrom, dateTo, filterPaymentMode, filterOrderType);
    router.refresh();
  };

  const handleDeleteOrder = async () => {
    if (!drawerOrder) return;
    if (!confirm(`Delete order ${drawerOrder.order_no}? This cannot be undone.`)) return;
    setIsDeletingOrder(true);
    const res = await deleteOrdersAction([drawerOrder.id]);
    if (res.success) {
      setRemovedIds(prev => new Set([...prev, drawerOrder.id]));
      closeDrawer();
      performSearch(searchQuery, currentPage, pageSize, filterStatus, filterFulfillment, dateFrom, dateTo, filterPaymentMode, filterOrderType);
      router.refresh();
    }
    setIsDeletingOrder(false);
  };

  const openDrawer = async (orderId: number) => {
    setIsDrawerLoading(true);
    setIsEditMode(false);
    const order = orders.find(o => o.id === orderId);
    if (order?.items && order?.payments) {
      setDrawerOrder(order);
    } else {
      const fullDetails = await getOrderDetails(orderId);
      if (fullDetails) {
        setEnrichedOrders(prev => ({ ...prev, [orderId]: fullDetails }));
        setDrawerOrder(fullDetails);
      }
    }
    setIsDrawerLoading(false);
  };
  const closeDrawer = () => {
    setDrawerOrder(null);
    setIsEditMode(false);
  };

  const handleInlineStatusUpdate = async (orderId: number, currentStatus: string, currentFulfillment: string, field: 'status' | 'fulfillment_status', newValue: string) => {
    if (field === 'status' && newValue === 'COMPLETED') {
      const order = orders.find(o => o.id === orderId);
      const totalPaid = order?.payments?.reduce((acc, p) => acc + Number(p.amount), 0) || 0;
      if (totalPaid < (order?.total_amount || 0)) {
        alert("Full payment is required to mark the order as COMPLETED.");
        return;
      }
    }

    // Optimistic update
    setEnrichedOrders(prev => {
      const existing = prev[orderId] || orders.find(o => o.id === orderId);
      if (!existing) return prev;
      return { ...prev, [orderId]: { ...existing, [field]: newValue } };
    });
    
    // Server update
    const newStatus = field === 'status' ? newValue : currentStatus;
    const newFulfillment = field === 'fulfillment_status' ? newValue : currentFulfillment;
    await updateOrderStatusAction(orderId, newStatus, newFulfillment);
  };

  const startEditMode = () => {
    if (!drawerOrder) return;
    setEditStatus(drawerOrder.status || "");
    setEditFulfillment(drawerOrder.fulfillment_status || "");
    const totalPaid = drawerOrder.payments?.reduce((acc, p) => acc + Number(p.amount), 0) || 0;
    const balance = (drawerOrder.total_amount || 0) - totalPaid;
    setPaymentAmount(balance > 0 ? balance.toString() : "");
    setPaymentMode("CASH");
    setIsEditMode(true);
  };

  const handleSaveEdit = async () => {
    if (!drawerOrder) return;
    
    const currentPaid = drawerOrder.payments?.reduce((acc, p) => acc + Number(p.amount), 0) || 0;
    const newPayment = Number(paymentAmount) || 0;
    const totalPaid = currentPaid + newPayment;
    const totalAmount = drawerOrder.total_amount || 0;

    if (editStatus === 'COMPLETED' && totalPaid < totalAmount) {
      alert("Full payment is required to mark the order as COMPLETED.");
      return;
    }

    setIsSaving(true);
    let updated = false;

    if (paymentAmount && Number(paymentAmount) > 0) {
      await addOrderPaymentAction(drawerOrder.id, Number(paymentAmount), paymentMode, "FINAL");
      updated = true;
    }

    if (editStatus !== drawerOrder.status || editFulfillment !== drawerOrder.fulfillment_status) {
      const res = await updateOrderStatusAction(drawerOrder.id, editStatus, editFulfillment);
      if (res.error) {
        alert(res.error);
      } else {
        updated = true;
      }
    }

    if (updated) {
      const fullDetails = await getOrderDetails(drawerOrder.id);
      if (fullDetails) {
        setEnrichedOrders(prev => ({ ...prev, [drawerOrder.id]: fullDetails }));
        setDrawerOrder(fullDetails);
        
        // Auto-print if payment was collected on a booking order
        if (paymentAmount && Number(paymentAmount) > 0 && fullDetails.order_type === 'BOOKING') {
          await generateBillPdf(fullDetails);
        }
      }
      performSearch(searchQuery, currentPage, pageSize, filterStatus, filterFulfillment, dateFrom, dateTo, filterPaymentMode, filterOrderType);
      router.refresh();
    }

    setIsEditMode(false);
    setIsSaving(false);
  };

  const handleDownloadBill = async (orderId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    let order = orders.find(o => o.id === orderId);
    if (!order || !order.items || !order.payments) {
      const fullDetails = await getOrderDetails(orderId);
      if (fullDetails) {
        setEnrichedOrders(prev => ({ ...prev, [orderId]: fullDetails }));
        order = fullDetails;
      }
    }
    if (order) {
      await generateBillPdf(order);
    }
  };

  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterStatus !== 'ALL') count++;
    if (filterFulfillment !== 'ALL') count++;
    if (filterPaymentMode !== 'ALL') count++;
    if (filterOrderType !== 'ALL') count++;
    if (dateFrom || dateTo) count++;
    return count;
  }, [filterStatus, filterFulfillment, filterPaymentMode, filterOrderType, dateFrom, dateTo]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
    setFilterPaymentMode("ALL");
    setFilterOrderType("ALL");
    setShowMobileFilters(false);
    updateURL({ search: undefined, dateFrom: undefined, dateTo: undefined, status: undefined, fulfillment: undefined, paymentMode: undefined, orderType: undefined, page: 1 });
  };

  // Bulk Delete
  const [deleteState, deleteAction, isDeleting] = useActionState(async (prevState: any, formData: FormData) => {
    const ids = Array.from(selectedIds);
    const res = await deleteOrdersAction(ids);
    if (res.success) setSelectedIds(new Set());
    return res;
  }, undefined);

  if (!mounted) return null;

  return (
    <div className="ds-card flex flex-col h-[calc(100vh-140px)] animate-[fadeInUp_0.5s_ease-out_forwards] relative overflow-hidden">
      
      {/* ─── HEADER / SEARCH & FILTERS ─── */}
      <div className="p-3.5 sm:p-4 border-b border-[#1F1F1F] flex flex-col gap-3 shrink-0 relative z-20 bg-[#121215]">
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 min-w-0">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              isPending={isPending}
              placeholder="Search by order no, customer, phone, product..."
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Mobile Filter Toggle */}
            <button
              type="button"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className={`md:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                showMobileFilters || activeFiltersCount > 0
                  ? "bg-orange-500/15 border-orange-500/40 text-orange-400"
                  : "bg-[#18181C] border-[#222227] text-[#A1A1AA] hover:text-[#FAFAFA]"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
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

        {/* Quick Order Type Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar no-scrollbar -mx-1 px-1">
          {[
            { id: 'ALL', label: `All Orders (${total})` },
            { id: 'BOOKING', label: 'Bookings' },
            { id: 'DIRECT', label: 'Direct Sales' },
          ].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleOrderTypeChange(t.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-all cursor-pointer ${
                filterOrderType === t.id
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-[0_0_12px_rgba(249,115,22,0.35)]'
                  : 'bg-[#18181C] text-[#A1A1AA] hover:text-[#FAFAFA] border border-[#222227] hover:border-[#2E2E36]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Secondary Filter Bar: Collapsible on Mobile, Inline on Desktop */}
        <div className={`${showMobileFilters ? 'flex' : 'hidden md:flex'} flex-wrap items-center gap-2.5 pt-2 border-t border-[#1F1F1F]/60 animate-[fadeIn_0.15s_ease-out]`}>
          <div className="flex items-center gap-2 bg-[#18181C] border border-[#222227] rounded-xl px-2.5 py-1 w-full sm:w-auto shadow-sm">
            <input 
              type="date" 
              value={dateFrom} 
              onChange={e => setDateFrom(e.target.value)} 
              className="bg-transparent text-[#FAFAFA] text-xs focus:outline-none py-1 w-[115px]"
              aria-label="From date"
            />
            <span className="text-[#52525B] text-xs font-medium">to</span>
            <input 
              type="date" 
              value={dateTo} 
              onChange={e => setDateTo(e.target.value)} 
              className="bg-transparent text-[#FAFAFA] text-xs focus:outline-none py-1 w-[115px]"
              aria-label="To date"
            />
            <button 
              onClick={applyDateFilter}
              className="p-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors cursor-pointer shadow-sm ml-auto sm:ml-0"
              title="Apply Date Filter"
              aria-label="Apply date filter"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>

          <Dropdown
            options={[
              { id: 'ALL', name: 'All Status' },
              { id: 'PENDING', name: 'Pending' },
              { id: 'COMPLETED', name: 'Completed' },
              { id: 'CANCELLED', name: 'Cancelled' }
            ]}
            value={filterStatus}
            onChange={handleStatusChange}
            className="w-32"
            compact
          />
          <Dropdown
            options={[
              { id: 'ALL', name: 'All Fulfillment' },
              { id: 'PENDING', name: 'Pending' },
              { id: 'FULFILLED', name: 'Fulfilled' }
            ]}
            value={filterFulfillment}
            onChange={handleFulfillmentChange}
            className="w-36"
            compact
          />
          <Dropdown
            options={[
              { id: 'ALL', name: 'All Payment' },
              { id: 'CASH', name: 'Cash' },
              { id: 'ONLINE', name: 'Online' }
            ]}
            value={filterPaymentMode}
            onChange={handlePaymentModeChange}
            className="w-32"
            compact
          />

          {(activeFiltersCount > 0 || searchQuery.trim()) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-xs text-[#71717A] hover:text-orange-400 px-2 py-1 transition-colors cursor-pointer ml-auto"
            >
              <X className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {searchQuery.trim() && (
          <div className="flex items-center justify-between bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded-xl text-xs animate-[fadeIn_0.2s_ease-out]">
            <div className="flex items-center gap-2 text-orange-400">
              <Search className="w-3.5 h-3.5" />
              <span>Found <strong className="text-[#FAFAFA]">{total}</strong> {total === 1 ? 'order' : 'orders'} matching &ldquo;{searchQuery}&rdquo;</span>
            </div>
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs text-orange-400 hover:text-orange-300 font-medium underline ml-2 cursor-pointer"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <TablePagination
        totalItems={total}
        pageSize={pageSize}
        currentPage={currentPage}
        onPageChange={(p) => { setSelectedIds(new Set()); handlePageChange(p); }}
        onPageSizeChange={(s) => { setSelectedIds(new Set()); handlePageSizeChange(s); }}
      />

      {/* ─── MOBILE VIEW: DEDICATED TOUCH-FIRST ORDER CARDS ─── */}
      <div className="block md:hidden flex-1 overflow-y-auto custom-scrollbar">
        {pagedOrders.length === 0 ? (
          <div className="p-12 text-center text-[#71717A] space-y-3">
            <Package className="w-12 h-12 mx-auto opacity-20 text-[#71717A]" />
            <p className="text-sm font-medium text-[#A1A1AA]">
              {searchQuery.trim() ? `No orders found matching "${searchQuery}".` : "No orders found."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#1F1F1F]/60 pb-28">
            {pagedOrders.map(order => {
              const isSelected = selectedIds.has(order.id);
              const orderDate = new Date(order.order_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
              
              const total = order.total_amount || 0;
              const paid = order.payments?.reduce((acc, p) => acc + Number(p.amount), 0) || 0;
              const cash = order.payments?.filter(p => p.payment_mode === 'CASH').reduce((acc, p) => acc + Number(p.amount), 0) || 0;
              const online = order.payments?.filter(p => p.payment_mode === 'ONLINE').reduce((acc, p) => acc + Number(p.amount), 0) || 0;
              const due = total - paid;
              const hasBalance = due > 0 && order.status !== 'CANCELLED';

              return (
                <div
                  key={order.id}
                  onClick={() => openDrawer(order.id)}
                  className={`p-3.5 transition-all duration-150 cursor-pointer active:bg-[#18181D] ${
                    isSelected ? 'bg-orange-500/10' : 'hover:bg-[#16161A]'
                  }`}
                >
                  {/* Top Bar: Checkbox + Order # + Order Type + Date */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2 min-w-0" onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onChange={() => toggleSelect(order.id)}
                      />
                      <span className="font-mono text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-lg shrink-0">
                        {order.order_no}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase ${
                        order.order_type === 'BOOKING'
                          ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                          : 'bg-[#18181C] text-[#A1A1AA] border-[#222227]'
                      }`}>
                        {order.order_type || 'DIRECT'}
                      </span>
                    </div>

                    <span className="text-[11px] text-[#71717A] font-mono shrink-0">
                      {orderDate}
                    </span>
                  </div>

                  {/* Customer Info & Status Dropdowns */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div>
                      <div className="text-sm font-semibold text-[#FAFAFA]">
                        {order.customer?.name || "Walk-in Customer"}
                      </div>
                      {order.customer?.phone && (
                        <a 
                          href={`tel:${order.customer.phone}`}
                          onClick={e => e.stopPropagation()}
                          className="text-xs text-[#71717A] hover:text-orange-400 font-mono flex items-center gap-1 mt-0.5 transition-colors"
                        >
                          <span>{order.customer.phone}</span>
                        </a>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <StatusDropdown 
                        status={order.status} 
                        onChange={(val) => handleInlineStatusUpdate(order.id, order.status, order.fulfillment_status, 'status', val)} 
                      />
                      <FulfillmentDropdown 
                        status={order.fulfillment_status} 
                        onChange={(val) => handleInlineStatusUpdate(order.id, order.status, order.fulfillment_status, 'fulfillment_status', val)} 
                      />
                    </div>
                  </div>

                  {/* Items Preview */}
                  {order.items && order.items.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      {order.items.slice(0, 3).map((item, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 text-[11px] bg-[#18181C] text-[#A1A1AA] px-2 py-0.5 rounded-lg border border-[#222227]">
                          <span className="font-mono text-orange-400 font-bold">{item.product?.product_code || ''}</span>
                          <span className="truncate max-w-[100px]">{item.product?.name || ''}</span>
                          <span className="text-[#71717A] font-semibold">×{item.quantity}</span>
                        </span>
                      ))}
                      {order.items.length > 3 && (
                        <span className="text-[10px] text-[#71717A] self-center">
                          +{order.items.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Total & Payment Badges */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#1F1F1F]/60">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-[#71717A]">Total Amount</div>
                      <div className={`text-base font-bold font-mono ${order.status === 'CANCELLED' ? 'text-[#71717A] line-through' : 'text-orange-400'}`}>
                        ₹{total.toLocaleString('en-IN')}
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-1.5">
                      {cash > 0 && <span className="text-[10px] font-medium bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/20">Cash ₹{cash.toLocaleString('en-IN')}</span>}
                      {online > 0 && <span className="text-[10px] font-medium bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-md border border-blue-500/20">Online ₹{online.toLocaleString('en-IN')}</span>}
                      {hasBalance && (
                        <span className="text-[10px] font-bold bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-md border border-amber-500/30 animate-pulse">
                          Due ₹{due.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center justify-end gap-2 mt-3 pt-2.5 border-t border-[#1F1F1F]/60" onClick={e => e.stopPropagation()}>
                    {hasBalance && (
                      <button 
                        onClick={(e) => openQuickCollect(order.id, e)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-xl text-xs font-bold transition-colors shadow-sm inline-flex items-center gap-1 cursor-pointer"
                      >
                        ₹ Collect
                      </button>
                    )}
                    <button 
                      onClick={(e) => handleDownloadBill(order.id, e)}
                      className="px-3 py-1.5 bg-[#18181C] hover:bg-[#222227] text-[#A1A1AA] hover:text-[#FAFAFA] rounded-xl text-xs font-medium transition-colors border border-[#222227] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <FileDown className="w-3.5 h-3.5 text-blue-400" />
                      <span>PDF</span>
                    </button>
                    <button 
                      onClick={() => openDrawer(order.id)}
                      className="px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-xl text-xs font-medium transition-colors border border-orange-500/20 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── DESKTOP VIEW: POWER DATA TABLE ─── */}
      <div className="hidden md:block flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse table">
          <thead className="bg-[#0A0A0A]/90 sticky top-0 z-10 backdrop-blur-md border-b border-[#1F1F1F]">
            <tr className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">
              <th className="px-3 py-3.5 w-10 text-center">
                <Checkbox checked={pagedOrders.length > 0 && selectedIds.size === pagedOrders.length} onChange={toggleSelectAll} />
              </th>
              <th className="px-2 py-3.5 w-8"></th>
              <th className="px-3 py-3.5">Order / Items</th>
              <th className="px-3 py-3.5">Customer</th>
              <th className="px-3 py-3.5">Date</th>
              <th className="px-3 py-3.5">Created By</th>
              <th className="px-3 py-3.5 text-right">Total</th>
              <th className="px-3 py-3.5">Payments</th>
              <th className="px-3 py-3.5">Status</th>
              <th className="px-3 py-3.5">Fulfillment</th>
              <th className="px-3 py-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F1F1F]/50">
            {pagedOrders.length === 0 ? (
              <tr>
                <td colSpan={11} className="p-12 text-center text-[#71717A]">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-20 text-[#71717A]" />
                  {searchQuery.trim() ? `No orders found matching "${searchQuery}".` : "No orders found."}
                </td>
              </tr>
            ) : (
              pagedOrders.map(order => {
                const isExpanded = expandedRows.has(order.id);
                const orderDate = new Date(order.order_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
                
                return (
                  <Fragment key={order.id}>
                    <tr className={`hover:bg-[#18181C] transition-colors ${selectedIds.has(order.id) ? 'bg-orange-500/5' : ''}`}>
                      <td className="px-3 py-3 text-center">
                        <Checkbox checked={selectedIds.has(order.id)} onChange={() => toggleSelect(order.id)} />
                      </td>
                      <td className="px-2 py-3 text-center">
                        <button onClick={() => toggleExpand(order.id)} className="p-1 text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#222227] rounded-lg transition-all cursor-pointer" title="View order items">
                          <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-mono text-sm font-bold text-[#FAFAFA] whitespace-nowrap">{order.order_no}</div>
                        {order.items && order.items.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1 max-w-[280px]">
                            {order.items.slice(0, 2).map((item, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1 text-[10px] bg-[#18181C] text-[#A1A1AA] px-1.5 py-0.5 rounded-md border border-[#222227]">
                                <span className="font-mono text-orange-400 font-bold">{item.product?.product_code || ''}</span>
                                <span className="truncate max-w-[90px]">{item.product?.name || ''}</span>
                                <span className="text-[#71717A]">×{item.quantity}</span>
                              </span>
                            ))}
                            {order.items.length > 2 && (
                              <span className="text-[10px] text-[#71717A] self-center">+{order.items.length - 2} more</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div>
                          <div className="text-sm text-[#FAFAFA] font-medium whitespace-nowrap">{order.customer?.name || "Unknown"}</div>
                          {order.customer?.phone && (
                            <div className="text-[11px] text-[#71717A] font-mono whitespace-nowrap">{order.customer.phone}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-xs text-[#A1A1AA] whitespace-nowrap">{orderDate}</div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="bg-[#18181C] text-[#71717A] px-2 py-0.5 rounded-md text-xs whitespace-nowrap">{order.user?.name || "Unknown"}</span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        {(() => {
                          if (order.status === 'CANCELLED') {
                            return <div className="text-sm font-bold text-[#71717A] line-through whitespace-nowrap">₹{order.total_amount}</div>;
                          }
                          const total = order.total_amount || 0;
                          return <div className="text-sm font-bold font-mono text-orange-400 whitespace-nowrap">₹{total.toLocaleString('en-IN')}</div>;
                        })()}
                      </td>
                      <td className="px-3 py-3">
                        {(() => {
                           if (order.status === 'CANCELLED') return <div className="text-xs text-[#71717A]">-</div>;
                           const total = order.total_amount || 0;
                           const paid = order.payments?.reduce((acc, p) => acc + Number(p.amount), 0) || 0;
                           const cash = order.payments?.filter(p => p.payment_mode === 'CASH').reduce((acc, p) => acc + Number(p.amount), 0) || 0;
                           const online = order.payments?.filter(p => p.payment_mode === 'ONLINE').reduce((acc, p) => acc + Number(p.amount), 0) || 0;
                           const due = total - paid;
                           
                           return (
                             <div className="flex flex-wrap justify-start gap-1">
                               {cash > 0 && <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-md border border-emerald-500/20 whitespace-nowrap">Cash ₹{cash.toLocaleString('en-IN')}</span>}
                               {online > 0 && <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded-md border border-blue-500/20 whitespace-nowrap">Online ₹{online.toLocaleString('en-IN')}</span>}
                               {due > 0 && order.status !== 'CANCELLED' && <span className="text-[10px] font-bold bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded-md border border-amber-500/30 whitespace-nowrap">Due ₹{due.toLocaleString('en-IN')}</span>}
                               {paid === 0 && due === 0 && <span className="text-xs text-[#71717A]">-</span>}
                             </div>
                           );
                        })()}
                      </td>
                      <td className="px-3 py-3">
                        <StatusDropdown 
                          status={order.status} 
                          onChange={(val) => handleInlineStatusUpdate(order.id, order.status, order.fulfillment_status, 'status', val)} 
                        />
                      </td>
                      <td className="px-3 py-3">
                        <FulfillmentDropdown 
                          status={order.fulfillment_status} 
                          onChange={(val) => handleInlineStatusUpdate(order.id, order.status, order.fulfillment_status, 'fulfillment_status', val)} 
                        />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex gap-1.5 justify-end items-center">
                          {(() => {
                            const paid = order.payments?.reduce((acc, p) => acc + Number(p.amount), 0) || 0;
                            const total = order.total_amount || 0;
                            const hasBalance = paid < total && order.status !== 'CANCELLED';
                            return hasBalance && (
                              <button 
                                onClick={(e) => openQuickCollect(order.id, e)}
                                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-xl text-xs font-bold transition-colors shadow-sm inline-flex items-center gap-1 cursor-pointer"
                              >
                                ₹ Collect
                              </button>
                            );
                          })()}
                          <button 
                            onClick={() => openDrawer(order.id)}
                            className="px-2.5 py-1 bg-[#18181C] hover:bg-[#222227] text-[#A1A1AA] hover:text-[#FAFAFA] rounded-xl text-xs font-medium transition-colors border border-[#222227] inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" /> View
                          </button>
                          <button 
                            onClick={(e) => handleDownloadBill(order.id, e)}
                            className="px-2.5 py-1 bg-[#18181C] hover:bg-[#222227] text-[#A1A1AA] hover:text-[#FAFAFA] rounded-xl text-xs font-medium transition-colors border border-[#222227] inline-flex items-center gap-1 cursor-pointer"
                          >
                            <FileDown className="w-3 h-3 text-blue-400" /> PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expanded Content */}
                    {isExpanded && (
                      <tr className="bg-[#18181C]/40">
                        <td colSpan={2}></td>
                        <td colSpan={9} className="p-4 pt-0 pb-4">
                          <div className="bg-[#0F0F12] border border-[#222227] rounded-xl p-3 shadow-inner w-full">
                            <h4 className="text-[10px] font-bold text-[#71717A] uppercase mb-2">Order Items</h4>
                            {order.items ? (
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-[#71717A] border-b border-[#222227] text-[10px] uppercase tracking-wider">
                                    <th className="pb-2 font-semibold text-left">Code</th>
                                    <th className="pb-2 font-semibold text-left">Product</th>
                                    <th className="pb-2 font-semibold text-left">Size</th>
                                    <th className="pb-2 font-semibold text-right">Qty</th>
                                    <th className="pb-2 font-semibold text-right">Price</th>
                                    <th className="pb-2 font-semibold text-right">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#222227]/60">
                                  {order.items.map((item, idx) => (
                                    <tr key={idx} className="text-[#FAFAFA] hover:bg-[#18181C]/80 transition-colors">
                                      <td className="py-2 font-mono text-xs text-orange-400">{item.product?.product_code}</td>
                                      <td className="py-2 text-xs font-medium">{item.product?.name}</td>
                                      <td className="py-2 text-xs font-mono text-amber-400">
                                        {item.variant_index != null && item.product?.variants ? item.product.variants[item.variant_index].label : (item.product?.height ? (item.product?.base ? `H-${item.product.height} B-${item.product.base}` : `H-${item.product.height}`) : "-")}
                                      </td>
                                      <td className="py-2 text-right font-bold text-orange-400 font-mono text-xs">{item.quantity}</td>
                                      <td className="py-2 text-right text-xs font-mono text-[#A1A1AA]">₹{item.selling_price}</td>
                                      <td className="py-2 text-right font-bold font-mono text-xs text-emerald-400">₹{item.subtotal}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <div className="text-xs text-[#71717A] py-2 animate-pulse">Loading items...</div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
          {pagedOrders.length > 0 && (
            <tfoot className="bg-[#0F0F12] border-t-2 border-[#222227]">
              <tr className="font-bold text-[#FAFAFA]">
                <td colSpan={6} className="p-4 text-right uppercase text-xs tracking-wider text-[#71717A]">
                  Page Totals
                </td>
                <td className="px-3 py-4 text-orange-400 text-right font-mono">
                  ₹{summary.totalAmt.toLocaleString('en-IN')}
                </td>
                <td className="px-3 py-4">
                  <div className="flex flex-col gap-0.5 font-mono text-xs text-left">
                    {summary.cash > 0 && <span className="text-emerald-400">CASH: ₹{summary.cash.toLocaleString('en-IN')}</span>}
                    {summary.online > 0 && <span className="text-blue-400">ONL: ₹{summary.online.toLocaleString('en-IN')}</span>}
                    {summary.due > 0 && <span className="text-amber-400">DUE: ₹{summary.due.toLocaleString('en-IN')}</span>}
                  </div>
                </td>
                <td colSpan={3} className="p-4"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* ─── FLOATING BULK ACTION BAR (MOBILE STICKY) ─── */}
      {selectedIds.size > 0 && (
        <div className="md:hidden fixed bottom-[74px] left-3 right-3 z-40 bg-[#16161A]/95 backdrop-blur-xl border border-orange-500/30 rounded-2xl p-3 shadow-[0_12px_40px_rgba(0,0,0,0.85)] flex items-center justify-between animate-[fadeInUp_0.2s_ease-out]">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedIds.size === pagedOrders.length && pagedOrders.length > 0}
              onChange={toggleSelectAll}
            />
            <span className="text-xs font-bold text-[#FAFAFA]">
              {selectedIds.size} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <form action={deleteAction} className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isDeleting}
                className="flex items-center gap-1 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? "Deleting..." : "Delete"}</span>
              </button>
            </form>

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

      {/* Desktop Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="hidden md:flex px-4 py-3 border-t border-[#1F1F1F] bg-[#111111]/50 shrink-0 items-center justify-between">
          <span className="text-sm text-[#A1A1AA]">{selectedIds.size} selected</span>
          <form action={deleteAction} className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isDeleting}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? "Deleting..." : "Delete Selected"}
            </button>
            {deleteState?.error && (
              <span className="text-xs text-red-400">{deleteState.error}</span>
            )}
          </form>
        </div>
      )}

      {/* Right Drawer */}
      {mounted && createPortal(
        <>
          {drawerOrder && (
            <div className="fixed inset-0 bg-black/60 z-40 animate-[fadeIn_0.2s_ease-out]" onClick={closeDrawer} />
          )}
          <div className={`fixed inset-y-0 right-0 w-full md:w-[600px] bg-[#111111] border-l border-[#1F1F1F] shadow-2xl z-50 transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col ${drawerOrder ? "translate-x-0" : "translate-x-full"}`}>
            {drawerOrder && (
              <>
                <div className="flex items-center justify-between p-5 border-b border-[#1F1F1F] shrink-0 bg-[#0A0A0A]">
                  <h2 className="text-lg font-bold text-[#F5F5F5] flex items-center gap-2">
                    <Package className="w-5 h-5 text-orange-500" /> Bill Details
                  </h2>
                  <div className="flex gap-2">
                    {!isEditMode ? (
                      <>
                        <button onClick={handleDeleteOrder} disabled={isDeletingOrder} className="p-2 text-[#737373] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete order">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => handleDownloadBill(drawerOrder.id, e)} className="p-2 text-[#737373] hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors" title="Download Bill">
                          <FileDown className="w-4 h-4" />
                        </button>
                        <button onClick={startEditMode} className="ds-btn-ghost flex items-center gap-1 text-sm">
                          Quick Edit
                        </button>
                        <button onClick={() => setShowFullEditModal(true)} className="ds-btn-primary flex items-center gap-1 text-sm">
                          Full Edit
                        </button>
                      </>
                    ) : (
                      <button onClick={handleSaveEdit} disabled={isSaving} className="ds-btn-primary text-sm disabled:opacity-50">
                        {isSaving ? "Saving..." : "Save"}
                      </button>
                    )}
                    <button onClick={closeDrawer} className="p-2 text-[#737373] hover:text-[#F5F5F5] hover:bg-[#2A2A2A] rounded-lg transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-6">
                  
                  {/* Order Meta */}
                  <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#1F1F1F] relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                      <Package className="w-16 h-16" />
                    </div>
                    <div className="relative z-10">
                      <p className="text-xs text-[#737373] font-bold uppercase tracking-wider mb-1">Order No</p>
                      <p className="font-mono text-xl font-bold text-[#F5F5F5]">{drawerOrder.order_no}</p>
                      <p className="text-sm text-[#A3A3A3] mt-2">{new Date(drawerOrder.order_date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                      <p className="text-xs text-[#737373] mt-1">Billed by: <span className="text-[#A3A3A3] font-medium">{drawerOrder.user?.name}</span></p>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div>
                    <h3 className="text-xs font-bold text-[#737373] uppercase tracking-wider mb-3 flex items-center gap-2"><User className="w-4 h-4" /> Customer</h3>
                    <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#1F1F1F] space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-[#A3A3A3]">Name</span>
                        <span className="text-sm font-bold text-[#F5F5F5]">{drawerOrder.customer?.name}</span>
                      </div>
                      {drawerOrder.customer?.phone && (
                        <div className="flex justify-between">
                          <span className="text-sm text-[#A3A3A3]">Phone</span>
                          <span className="text-sm text-[#F5F5F5]">{drawerOrder.customer.phone}</span>
                        </div>
                      )}
                      {drawerOrder.customer?.email && (
                        <div className="flex justify-between">
                          <span className="text-sm text-[#A3A3A3]">Email</span>
                          <span className="text-sm text-[#F5F5F5]">{drawerOrder.customer.email}</span>
                        </div>
                      )}
                      {drawerOrder.customer?.address && (
                        <div className="flex justify-between">
                          <span className="text-sm text-[#A3A3A3]">Address</span>
                          <span className="text-sm text-[#F5F5F5] text-right max-w-[200px]">{drawerOrder.customer.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Items */}
                  <div>
                    <h3 className="text-xs font-bold text-[#737373] uppercase tracking-wider mb-3 flex items-center gap-2"><Package className="w-4 h-4" /> Items</h3>
                    <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#1F1F1F]">
                      <div className="space-y-4">
                        {drawerOrder.items?.map((item, idx) => (
                          <div key={idx} className="flex justify-between">
                            <div>
                              <p className="text-sm font-bold text-[#F5F5F5]">{item.product?.product_code}</p>
                              <p className="text-xs text-[#A3A3A3]">{item.product?.name}</p>
                              {item.variant_index != null && item.product?.variants && (
                                <p className="text-[10px] font-bold text-amber-400 mt-0.5">{item.product.variants[item.variant_index].label}</p>
                              )}
                              <p className="text-xs text-[#737373] mt-1">{item.quantity} × ₹{item.selling_price}</p>
                            </div>
                            <div className="font-bold text-[#F5F5F5]">₹{item.subtotal}</div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-[#2A2A2A] space-y-2">
                        <div className="flex justify-between text-sm text-[#A3A3A3]">
                          <span>Subtotal</span>
                          <span>₹{(drawerOrder.total_amount || 0) + (drawerOrder.discount || 0)}</span>
                        </div>
                        {(drawerOrder.discount || 0) > 0 && (
                          <div className="flex justify-between text-sm text-green-500">
                            <span>Discount</span>
                            <span>- ₹{drawerOrder.discount}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-lg font-bold text-orange-400 pt-2 border-t border-[#1F1F1F] mt-2">
                          <span>Total</span>
                          <span>₹{drawerOrder.total_amount}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment */}
                  <div>
                    <h3 className="text-xs font-bold text-[#737373] uppercase tracking-wider mb-3 flex items-center gap-2"><CreditCard className="w-4 h-4" /> Payment Details</h3>
                    <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#1F1F1F] space-y-3">
                      {drawerOrder.payments?.map((pay, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 border-b border-[#2A2A2A] last:border-0 last:pb-0">
                          <div>
                            <p className="text-sm font-bold text-[#F5F5F5]">{pay.payment_mode}</p>
                            <p className="text-xs text-[#737373]">{pay.payment_type} payment</p>
                          </div>
                          <div className="font-bold text-orange-400">₹{pay.amount}</div>
                        </div>
                      ))}
                      
                      {isEditMode ? (
                        <div className="pt-4 border-t border-[#2A2A2A] space-y-4">
                          <h4 className="text-xs font-bold text-[#737373] uppercase tracking-wider mb-2">Update Order</h4>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-[#737373] mb-1">Status</label>
                              <select 
                                value={editStatus} 
                                onChange={e => setEditStatus(e.target.value)}
                                className="w-full ds-select"
                              >
                                <option value="PENDING">PENDING</option>
                                <option value="COMPLETED">COMPLETED</option>
                                <option value="CANCELLED">CANCELLED</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-[#737373] mb-1">Fulfillment</label>
                              <select 
                                value={editFulfillment} 
                                onChange={e => setEditFulfillment(e.target.value)}
                                className="w-full ds-select"
                              >
                                <option value="PENDING">PENDING</option>
                                <option value="FULFILLED">FULFILLED</option>
                              </select>
                            </div>
                          </div>

                          {(drawerOrder.total_amount || 0) > (drawerOrder.payments?.reduce((acc, p) => acc + Number(p.amount), 0) || 0) && (
                            <div className="mt-4 p-3 bg-[#0A0A0A] rounded-lg border border-[#1F1F1F]">
                              <label className="block text-xs font-bold text-[#A3A3A3] mb-2">Collect Balance Payment</label>
                              <div className="flex gap-2">
                                <input 
                                  type="number" 
                                  value={paymentAmount}
                                  onChange={e => setPaymentAmount(e.target.value)}
                                  placeholder="Amount"
                                  className="flex-1 ds-input"
                                />
                                <select 
                                  value={paymentMode}
                                  onChange={e => setPaymentMode(e.target.value)}
                                  className="w-28 ds-select"
                                >
                                  <option value="CASH">CASH</option>
                                  <option value="ONLINE">ONLINE</option>
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="pt-3 flex gap-2 justify-end">
                          <StatusBadge status={drawerOrder.status} />
                          <StatusBadge status={drawerOrder.fulfillment_status} />
                        </div>
                      )}
                    </div>
                  </div>
                  
                </div>
              </>
            )}
          </div>
        </>,
        document.body
      )}

      {collectOrder && mounted && createPortal(
        <div className="fixed inset-0 bg-black/60 z-[999999] flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#1F1F1F] rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            <div className="p-4 border-b border-[#1F1F1F] flex justify-between items-center bg-[#0A0A0A]">
              <h3 className="font-bold text-[#F5F5F5] flex items-center gap-2">
                <Banknote className="w-4 h-4 text-orange-400" />
                Collect Payment
              </h3>
              <button onClick={() => setCollectOrder(null)} className="text-[#737373] hover:text-[#F5F5F5]">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleQuickCollectSave} className="p-4 flex flex-col gap-4">
              <div className="bg-[#1A1A1A] p-3 rounded-lg border border-[#1F1F1F]">
                <div className="text-xs text-[#737373] mb-1">Order No.</div>
                <div className="font-mono text-sm font-bold text-[#F5F5F5]">{collectOrder.order_no}</div>
                <div className="text-xs text-[#737373] mt-2 mb-1">Customer</div>
                <div className="text-sm font-medium text-[#F5F5F5]">{collectOrder.customer?.name || "Unknown"}</div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-[#A3A3A3] mb-1">Balance Due (₹)</label>
                <input 
                  type="number" 
                  value={collectAmount}
                  onChange={e => setCollectAmount(e.target.value)}
                  className="w-full ds-input font-bold text-orange-400 text-lg"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-[#A3A3A3] mb-1">Payment Mode</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setCollectMode('CASH')} className={`flex-1 py-2 rounded-md border text-sm font-bold transition-colors ${collectMode === 'CASH' ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-[#1A1A1A] border-[#1F1F1F] text-[#A3A3A3] hover:border-[#2A2A2A]'}`}>CASH</button>
                  <button type="button" onClick={() => setCollectMode('ONLINE')} className={`flex-1 py-2 rounded-md border text-sm font-bold transition-colors ${collectMode === 'ONLINE' ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-[#1A1A1A] border-[#1F1F1F] text-[#A3A3A3] hover:border-[#2A2A2A]'}`}>ONLINE</button>
                </div>
              </div>

              <div className="mt-2">
                <button type="submit" disabled={isCollecting || !collectAmount || Number(collectAmount) <= 0} className="w-full ds-btn-primary py-2.5 disabled:opacity-50 flex items-center justify-center gap-2">
                  {isCollecting ? <div className="w-4 h-4 rounded-full border-2 border-orange-950/30 border-t-orange-950 animate-spin" /> : <Check className="w-4 h-4" />}
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {showFullEditModal && drawerOrder && mounted && products && (
        <EditOrderModal 
          order={drawerOrder} 
          products={products} 
          onClose={() => setShowFullEditModal(false)}
          onSuccess={(updatedOrder) => {
            setEnrichedOrders(prev => ({ ...prev, [updatedOrder.id]: updatedOrder }));
            setDrawerOrder(updatedOrder);
            setShowFullEditModal(false);
            performSearch(searchQuery, currentPage, pageSize, filterStatus, filterFulfillment, dateFrom, dateTo, filterPaymentMode, filterOrderType);
            router.refresh();
          }}
        />
      )}

    </div>
  );
}
