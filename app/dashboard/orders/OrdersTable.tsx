"use client";

import { useState, useActionState, useEffect, useMemo, useRef, Fragment } from "react";
import { createPortal } from "react-dom";
import { Search, ChevronDown, Check, Trash2, Eye, X, ChevronRight, Package, User, CreditCard, Clock, CheckCircle2, AlertCircle, FileDown, Banknote } from "lucide-react";
import { deleteOrdersAction, Order, getOrderDetails, updateOrderStatusAction, addOrderPaymentAction } from "@/app/actions/orders";
import { generateBillPdf } from "@/lib/generateBillPdf";

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={`w-4 h-4 rounded flex items-center justify-center cursor-pointer transition-colors border ${checked ? "bg-green-500 border-green-500 text-slate-950" : "bg-slate-900 border-slate-600 text-transparent hover:border-slate-500"}`}
    >
      <Check className="w-3 h-3 stroke-[3]" />
    </div>
  );
}

function Dropdown({ name, options, value, onChange, compact = false, className = "w-full" }: { name?: string, options: { id: string, name: string }[], value: string, onChange: (val: string) => void, compact?: boolean, className?: string }) {
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
    if (isOpen) document.addEventListener("mousedown", handleClick);
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
      className="absolute z-[99999] bg-slate-800 border border-slate-700 rounded-lg shadow-2xl py-1 max-h-60 overflow-y-auto animate-[fadeIn_0.1s_ease-out]"
    >
      {options.map(opt => (
        <div
          key={opt.id}
          onClick={() => { onChange(opt.id); setIsOpen(false); }}
          className={`px-3 py-2 text-sm cursor-pointer transition-colors ${value === opt.id ? 'text-green-400 bg-slate-900/80 font-medium' : 'text-slate-300 hover:bg-slate-700 hover:text-slate-100'}`}
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
        className={`w-full px-3 ${compact ? 'py-1.5' : 'py-2'} bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-50 flex items-center justify-between hover:border-slate-500 focus:ring-2 focus:ring-green-500/50 focus:outline-none`}
      >
        <span className="truncate pr-2">{selected?.name || "Select"}</span>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {menu}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'COMPLETED' || status === 'FULFILLED') {
    return <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase"><CheckCircle2 className="w-3 h-3" /> {status}</span>;
  }
  if (status === 'PENDING') {
    return <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase"><Clock className="w-3 h-3" /> {status}</span>;
  }
  if (status === 'CANCELLED') {
    return <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase"><AlertCircle className="w-3 h-3" /> {status}</span>;
  }
  return <span className="inline-flex items-center gap-1 bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase">{status}</span>;
}

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
          className="absolute z-[99999] bg-slate-800 border border-slate-700 rounded-lg shadow-2xl py-1 overflow-hidden animate-[fadeIn_0.1s_ease-out]"
        >
          {Object.keys(config).map(key => {
            const OptIcon = config[key].icon;
            return (
              <div
                key={key}
                onClick={(e) => { e.stopPropagation(); onChange(key); setIsOpen(false); }}
                className={`px-3 py-2 text-xs font-bold tracking-wide flex items-center gap-2 cursor-pointer transition-colors ${status === key ? 'bg-slate-900/80 ' + config[key].color.split(' ')[0] : 'text-slate-300 hover:bg-slate-700 hover:text-slate-100'}`}
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
          className="absolute z-[99999] bg-slate-800 border border-slate-700 rounded-lg shadow-2xl py-1 overflow-hidden animate-[fadeIn_0.1s_ease-out]"
        >
          {Object.keys(config).map(key => {
            const OptIcon = config[key].icon;
            return (
              <div
                key={key}
                onClick={(e) => { e.stopPropagation(); onChange(key); setIsOpen(false); }}
                className={`px-3 py-2 text-xs font-bold tracking-wide flex items-center gap-2 cursor-pointer transition-colors ${status === key ? 'bg-slate-900/80 ' + config[key].color.split(' ')[0] : 'text-slate-300 hover:bg-slate-700 hover:text-slate-100'}`}
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

export default function OrdersTable({ initialOrders }: { initialOrders: Order[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [orders, setOrders] = useState<Order[]>(initialOrders);
  useEffect(() => setOrders(initialOrders), [initialOrders]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterFulfillment, setFilterFulfillment] = useState<string>('ALL');

  const filteredOrders = useMemo(() => {
    let result = orders;
    if (filterStatus !== 'ALL') result = result.filter(o => o.status === filterStatus);
    if (filterFulfillment !== 'ALL') result = result.filter(o => o.fulfillment_status === filterFulfillment);
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(o => o.order_no.toLowerCase().includes(query) || o.customer?.name.toLowerCase().includes(query));
    }
    return result;
  }, [orders, searchQuery, filterStatus, filterFulfillment]);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredOrders.length && filteredOrders.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredOrders.map(o => o.id)));
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
          setOrders(prev => prev.map(o => o.id === orderId ? fullDetails : o));
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
        setOrders(prev => prev.map(o => o.id === orderId ? fullDetails : o));
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
      setOrders(prev => prev.map(o => o.id === collectOrder.id ? fullDetails : o));
    }
    
    setIsCollecting(false);
    setCollectOrder(null);
  };

  const handleDeleteOrder = async () => {
    if (!drawerOrder) return;
    if (!confirm(`Delete order ${drawerOrder.order_no}? This cannot be undone.`)) return;
    setIsDeletingOrder(true);
    const res = await deleteOrdersAction([drawerOrder.id]);
    if (res.success) {
      setOrders(prev => prev.filter(o => o.id !== drawerOrder.id));
      closeDrawer();
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
        setOrders(prev => prev.map(o => o.id === orderId ? fullDetails : o));
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
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return { ...o, [field]: newValue };
      }
      return o;
    }));
    
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
        setOrders(prev => prev.map(o => o.id === drawerOrder.id ? fullDetails : o));
        setDrawerOrder(fullDetails);
      }
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
        setOrders(prev => prev.map(o => o.id === orderId ? fullDetails : o));
        order = fullDetails;
      }
    }
    if (order) {
      generateBillPdf(order);
    }
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
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col h-[calc(100vh-140px)] animate-[fadeInUp_0.5s_ease-out_forwards]">
      
      {/* Header / Actions */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row gap-4 items-center justify-between shrink-0">
        <div className="relative w-full sm:w-96">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by order no or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all placeholder:text-slate-600"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Dropdown
            options={[
              { id: 'ALL', name: 'All Status' },
              { id: 'PENDING', name: 'Pending' },
              { id: 'COMPLETED', name: 'Completed' },
              { id: 'CANCELLED', name: 'Cancelled' }
            ]}
            value={filterStatus}
            onChange={setFilterStatus}
            className="w-36"
            compact
          />
          <Dropdown
            options={[
              { id: 'ALL', name: 'All Fulfillment' },
              { id: 'PENDING', name: 'Pending' },
              { id: 'FULFILLED', name: 'Fulfilled' }
            ]}
            value={filterFulfillment}
            onChange={setFilterFulfillment}
            className="w-36"
            compact
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-950/50 sticky top-0 z-10 backdrop-blur-sm">
            <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <th className="p-4 w-12 text-center">
                <Checkbox checked={filteredOrders.length > 0 && selectedIds.size === filteredOrders.length} onChange={toggleSelectAll} />
              </th>
              <th className="p-4 w-10"></th>
              <th className="p-4">Order No</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Date</th>
              <th className="p-4">Created By</th>
              <th className="p-4">Total</th>
              <th className="p-4">Status</th>
              <th className="p-4">Fulfillment</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-12 text-center text-slate-500">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  No orders found.
                </td>
              </tr>
            ) : (
              filteredOrders.map(order => {
                const isExpanded = expandedRows.has(order.id);
                const orderDate = new Date(order.order_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
                
                return (
                  <Fragment key={order.id}>
                    <tr className={`hover:bg-slate-800/20 transition-colors ${selectedIds.has(order.id) ? 'bg-green-500/5' : ''}`}>
                      <td className="p-4 text-center">
                        <Checkbox checked={selectedIds.has(order.id)} onChange={() => toggleSelect(order.id)} />
                      </td>
                      <td className="p-4 text-center">
                        <button onClick={() => toggleExpand(order.id)} className="p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded transition-all">
                          <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </button>
                      </td>
                      <td className="p-4">
                        <div className="font-mono text-sm font-bold text-slate-200">{order.order_no}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-slate-200 font-medium">{order.customer?.name || "Unknown"}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-slate-400">{orderDate}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-medium text-slate-400">
                           <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-xs">{order.user?.name || "Unknown"}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {(() => {
                          if (order.status === 'CANCELLED') {
                            return <div className="text-sm font-bold text-slate-500 line-through">₹{order.total_amount}</div>;
                          }
                          const paid = order.payments?.reduce((acc, p) => acc + Number(p.amount), 0) || 0;
                          const total = order.total_amount || 0;
                          if (paid >= total) {
                            return <div className="text-sm font-bold text-green-400">₹{total}</div>;
                          } else if (paid > 0) {
                            return <div className="text-sm font-bold text-amber-400" title="Partially Paid">₹{paid} <span className="text-slate-500 font-normal">/ ₹{total}</span></div>;
                          } else {
                            return <div className="text-sm font-bold text-red-400" title="Unpaid">₹0 <span className="text-slate-500 font-normal">/ ₹{total}</span></div>;
                          }
                        })()}
                      </td>
                      <td className="p-4">
                        <StatusDropdown 
                          status={order.status} 
                          onChange={(val) => handleInlineStatusUpdate(order.id, order.status, order.fulfillment_status, 'status', val)} 
                        />
                      </td>
                      <td className="p-4">
                        <FulfillmentDropdown 
                          status={order.fulfillment_status} 
                          onChange={(val) => handleInlineStatusUpdate(order.id, order.status, order.fulfillment_status, 'fulfillment_status', val)} 
                        />
                      </td>
                      <td className="p-4 text-right flex gap-2 justify-end">
                        {(() => {
                          const paid = order.payments?.reduce((acc, p) => acc + Number(p.amount), 0) || 0;
                          const total = order.total_amount || 0;
                          const hasBalance = paid < total && order.status !== 'CANCELLED';
                          return hasBalance && (
                            <button 
                              onClick={(e) => openQuickCollect(order.id, e)}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded text-xs font-bold transition-colors shadow-sm inline-flex items-center gap-1.5"
                            >
                              ₹ Collect
                            </button>
                          );
                        })()}
                        <button 
                          onClick={() => openDrawer(order.id)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium transition-colors border border-slate-700 hover:border-slate-500 inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                        <button 
                          onClick={(e) => handleDownloadBill(order.id, e)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium transition-colors border border-slate-700 hover:border-slate-500 inline-flex items-center gap-1.5"
                        >
                          <FileDown className="w-3.5 h-3.5" /> PDF
                        </button>
                      </td>
                    </tr>
                    
                    {/* Expanded Content */}
                    {isExpanded && (
                      <tr className="bg-slate-900/30">
                        <td colSpan={2}></td>
                        <td colSpan={7} className="p-4 pt-0 pb-4">
                          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Order Items</h4>
                            {order.items ? (
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-slate-500 border-b border-slate-800">
                                    <th className="pb-2 font-medium text-left">Code</th>
                                    <th className="pb-2 font-medium text-left">Product</th>
                                    <th className="pb-2 font-medium text-right">Qty</th>
                                    <th className="pb-2 font-medium text-right">Price</th>
                                    <th className="pb-2 font-medium text-right">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                  {order.items.map((item, idx) => (
                                    <tr key={idx} className="text-slate-300">
                                      <td className="py-2 font-mono text-xs">{item.product?.product_code}</td>
                                      <td className="py-2">{item.product?.name}</td>
                                      <td className="py-2 text-right">{item.quantity}</td>
                                      <td className="py-2 text-right">₹{item.selling_price}</td>
                                      <td className="py-2 text-right font-bold text-green-400">₹{item.subtotal}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <div className="text-sm text-slate-500 py-2 animate-pulse">Loading items...</div>
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
        </table>
      </div>

      {/* Footer / Bulk Actions */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50 shrink-0 flex items-center justify-between">
        <span className="text-sm text-slate-400">
          {filteredOrders.length} order(s) total
        </span>
        
        {selectedIds.size > 0 && (
          <form action={deleteAction} className="flex items-center gap-3 animate-[fadeIn_0.2s_ease-out]">
            <span className="text-sm font-medium text-slate-300">
              {selectedIds.size} selected
            </span>
            <button
              type="submit"
              disabled={isDeleting}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {isDeleting ? "Deleting..." : "Delete Selected"}
            </button>
            {deleteState?.error && (
              <span className="text-xs text-red-400">{deleteState.error}</span>
            )}
          </form>
        )}
      </div>

      {/* Right Drawer */}
      {mounted && createPortal(
        <>
          {drawerOrder && (
            <div className="fixed inset-0 bg-black/60 z-40 animate-[fadeIn_0.2s_ease-out]" onClick={closeDrawer} />
          )}
          <div className={`fixed inset-y-0 right-0 w-full md:w-[600px] bg-slate-900 border-l border-slate-700 shadow-2xl z-50 transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col ${drawerOrder ? "translate-x-0" : "translate-x-full"}`}>
            {drawerOrder && (
              <>
                <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0 bg-slate-900">
                  <h2 className="text-lg font-bold text-slate-50 flex items-center gap-2">
                    <Package className="w-5 h-5 text-green-400" /> Bill Details
                  </h2>
                  <div className="flex gap-2">
                    {!isEditMode ? (
                      <>
                        <button onClick={handleDeleteOrder} disabled={isDeletingOrder} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete order">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => handleDownloadBill(drawerOrder.id, e)} className="p-2 text-slate-500 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors" title="Download Bill">
                          <FileDown className="w-4 h-4" />
                        </button>
                        <button onClick={startEditMode} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors flex items-center gap-1 text-sm border border-slate-700">
                          Edit
                        </button>
                      </>
                    ) : (
                      <button onClick={handleSaveEdit} disabled={isSaving} className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-slate-950 font-bold rounded-lg transition-colors text-sm disabled:opacity-50">
                        {isSaving ? "Saving..." : "Save"}
                      </button>
                    )}
                    <button onClick={closeDrawer} className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-6">
                  
                  {/* Order Meta */}
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                      <Package className="w-16 h-16" />
                    </div>
                    <div className="relative z-10">
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Order No</p>
                      <p className="font-mono text-xl font-bold text-slate-100">{drawerOrder.order_no}</p>
                      <p className="text-sm text-slate-400 mt-2">{new Date(drawerOrder.order_date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                      <p className="text-xs text-slate-500 mt-1">Billed by: <span className="text-slate-300 font-medium">{drawerOrder.user?.name}</span></p>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2"><User className="w-4 h-4" /> Customer</h3>
                    <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-400">Name</span>
                        <span className="text-sm font-bold text-slate-200">{drawerOrder.customer?.name}</span>
                      </div>
                      {drawerOrder.customer?.phone && (
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-400">Phone</span>
                          <span className="text-sm text-slate-200">{drawerOrder.customer.phone}</span>
                        </div>
                      )}
                      {drawerOrder.customer?.email && (
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-400">Email</span>
                          <span className="text-sm text-slate-200">{drawerOrder.customer.email}</span>
                        </div>
                      )}
                      {drawerOrder.customer?.address && (
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-400">Address</span>
                          <span className="text-sm text-slate-200 text-right max-w-[200px]">{drawerOrder.customer.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Items */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2"><Package className="w-4 h-4" /> Items</h3>
                    <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                      <div className="space-y-4">
                        {drawerOrder.items?.map((item, idx) => (
                          <div key={idx} className="flex justify-between">
                            <div>
                              <p className="text-sm font-bold text-slate-200">{item.product?.product_code}</p>
                              <p className="text-xs text-slate-400">{item.product?.name}</p>
                              <p className="text-xs text-slate-500 mt-1">{item.quantity} × ₹{item.selling_price}</p>
                            </div>
                            <div className="font-bold text-slate-200">₹{item.subtotal}</div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
                        <div className="flex justify-between text-sm text-slate-400">
                          <span>Subtotal</span>
                          <span>₹{(drawerOrder.total_amount || 0) + (drawerOrder.discount || 0)}</span>
                        </div>
                        {(drawerOrder.discount || 0) > 0 && (
                          <div className="flex justify-between text-sm text-green-500">
                            <span>Discount</span>
                            <span>- ₹{drawerOrder.discount}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-lg font-bold text-green-400 pt-2 border-t border-slate-800/50 mt-2">
                          <span>Total</span>
                          <span>₹{drawerOrder.total_amount}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2"><CreditCard className="w-4 h-4" /> Payment Details</h3>
                    <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
                      {drawerOrder.payments?.map((pay, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0 last:pb-0">
                          <div>
                            <p className="text-sm font-bold text-slate-200">{pay.payment_mode}</p>
                            <p className="text-xs text-slate-500">{pay.payment_type} payment</p>
                          </div>
                          <div className="font-bold text-green-400">₹{pay.amount}</div>
                        </div>
                      ))}
                      
                      {isEditMode ? (
                        <div className="pt-4 border-t border-slate-800 space-y-4">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Update Order</h4>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Status</label>
                              <select 
                                value={editStatus} 
                                onChange={e => setEditStatus(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-md text-sm text-slate-200 p-2 outline-none focus:border-green-500"
                              >
                                <option value="PENDING">PENDING</option>
                                <option value="COMPLETED">COMPLETED</option>
                                <option value="CANCELLED">CANCELLED</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Fulfillment</label>
                              <select 
                                value={editFulfillment} 
                                onChange={e => setEditFulfillment(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-md text-sm text-slate-200 p-2 outline-none focus:border-green-500"
                              >
                                <option value="PENDING">PENDING</option>
                                <option value="FULFILLED">FULFILLED</option>
                              </select>
                            </div>
                          </div>

                          {(drawerOrder.total_amount || 0) > (drawerOrder.payments?.reduce((acc, p) => acc + Number(p.amount), 0) || 0) && (
                            <div className="mt-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                              <label className="block text-xs font-bold text-slate-400 mb-2">Collect Balance Payment</label>
                              <div className="flex gap-2">
                                <input 
                                  type="number" 
                                  value={paymentAmount}
                                  onChange={e => setPaymentAmount(e.target.value)}
                                  placeholder="Amount"
                                  className="flex-1 bg-slate-950 border border-slate-700 rounded-md text-sm text-slate-200 p-2 outline-none focus:border-green-500"
                                />
                                <select 
                                  value={paymentMode}
                                  onChange={e => setPaymentMode(e.target.value)}
                                  className="w-28 bg-slate-950 border border-slate-700 rounded-md text-sm text-slate-200 p-2 outline-none focus:border-green-500"
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
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <Banknote className="w-4 h-4 text-amber-400" />
                Collect Payment
              </h3>
              <button onClick={() => setCollectOrder(null)} className="text-slate-500 hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleQuickCollectSave} className="p-4 flex flex-col gap-4">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-xs text-slate-400 mb-1">Order No.</div>
                <div className="font-mono text-sm font-bold text-slate-200">{collectOrder.order_no}</div>
                <div className="text-xs text-slate-400 mt-2 mb-1">Customer</div>
                <div className="text-sm font-medium text-slate-200">{collectOrder.customer?.name || "Unknown"}</div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Balance Due (₹)</label>
                <input 
                  type="number" 
                  value={collectAmount}
                  onChange={e => setCollectAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-md text-lg font-bold text-amber-400 p-2 outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Payment Mode</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setCollectMode('CASH')} className={`flex-1 py-2 rounded-md border text-sm font-bold transition-colors ${collectMode === 'CASH' ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500'}`}>CASH</button>
                  <button type="button" onClick={() => setCollectMode('ONLINE')} className={`flex-1 py-2 rounded-md border text-sm font-bold transition-colors ${collectMode === 'ONLINE' ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500'}`}>ONLINE</button>
                </div>
              </div>

              <div className="mt-2">
                <button type="submit" disabled={isCollecting || !collectAmount || Number(collectAmount) <= 0} className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:hover:bg-amber-500 text-amber-950 font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                  {isCollecting ? <div className="w-4 h-4 rounded-full border-2 border-amber-950/30 border-t-amber-950 animate-spin" /> : <Check className="w-4 h-4" />}
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
