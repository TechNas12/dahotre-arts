"use client";

import { useState, useActionState, useEffect, useMemo, useRef, Fragment } from "react";
import { Plus, Check, X, AlertTriangle, Trash2, Mail, Phone, MapPin, ChevronDown, ChevronRight, PackageOpen, Filter, Pencil } from "lucide-react";
import { Customer, createCustomerAction, updateCustomerAction, deleteCustomersAction, searchCustomersAction } from "@/app/actions/customers";
import { getCustomerOrdersAction, Order } from "@/app/actions/orders";
import { createPortal } from "react-dom";
import { TablePagination, PageSize, useTableQueryState } from "@/app/dashboard/components/TablePagination";
import { SearchInput } from "@/app/dashboard/components/SearchInput";
import { LiveBadge } from "@/app/dashboard/components/LiveBadge";
import { useRealtimeTable } from "@/lib/supabase/realtime";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Checkbox } from "@/app/dashboard/components/ui/Checkbox";
import { Dropdown } from "@/app/dashboard/components/ui/Dropdown";
import { ConfirmDialog } from "@/app/dashboard/components/ui/ConfirmDialog";



type DrawerMode = 'ADD' | 'EDIT' | null;

export default function CustomersTable({ 
  initialCustomers, 
  userRole,
  totalCount,
  initialPage = 1,
  initialPageSize = 25,
  initialSearch = ""
}: { 
  initialCustomers: Customer[], 
  userRole: string,
  totalCount: number,
  initialPage?: number,
  initialPageSize?: number,
  initialSearch?: string
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Local state for instant search
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [total, setTotal] = useState(totalCount);
  const [isPending, setIsPending] = useState(false);

  const {
    searchQuery,
    setSearchQuery,
    currentPage,
    pageSize,
    handlePageChange,
    handlePageSizeChange,
    updateURL
  } = useTableQueryState({ initialSearch, initialPage, initialPageSize });

  // Has Orders Filter
  const searchParams = useSearchParams();
  const initialHasOrders = searchParams.get('hasOrders');
  const [filterHasOrders, setFilterHasOrders] = useState<boolean | 'ALL'>(
    initialHasOrders === 'true' ? true : initialHasOrders === 'false' ? false : 'ALL'
  );

  const handleHasOrdersChange = (val: boolean | 'ALL') => {
    setFilterHasOrders(val);
    updateURL({ hasOrders: val === 'ALL' ? undefined : String(val), page: 1 });
  };

  // Perform search locally
  const performSearch = async (query: string, page: number, size: number, hasOrders: boolean | 'ALL') => {
    setIsPending(true);
    const result = await searchCustomersAction({
      search: query,
      page,
      pageSize: size,
      hasOrders: hasOrders === 'ALL' ? undefined : hasOrders
    });
    setCustomers(result.data);
    setTotal(result.totalCount);
    setIsPending(false);
  };

  // Effect to trigger search when params change
  useEffect(() => {
    if (mounted) {
      const handler = setTimeout(() => {
         import("react").then((React) => {
            React.startTransition(() => {
               performSearch(searchQuery, currentPage, pageSize, filterHasOrders);
            });
         });
      }, 200); // 200ms debounce
      return () => clearTimeout(handler);
    }
  }, [searchQuery, currentPage, pageSize, filterHasOrders, mounted]);

  // Realtime updates
  const { isConnected } = useRealtimeTable('customers', () => {
    performSearch(searchQuery, currentPage, pageSize, filterHasOrders);
    router.refresh();
  });

  // Expandable Orders State
  const [expandedCustomerId, setExpandedCustomerId] = useState<number | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Record<number, Order[]>>({});
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  const toggleExpand = async (e: React.MouseEvent, customerId: number) => {
    e.stopPropagation();
    if (expandedCustomerId === customerId) {
      setExpandedCustomerId(null);
      return;
    }
    setExpandedCustomerId(customerId);
    
    if (!customerOrders[customerId]) {
      setIsLoadingOrders(true);
      const orders = await getCustomerOrdersAction(customerId);
      setCustomerOrders(prev => ({ ...prev, [customerId]: orders }));
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const pagedCustomers = customers;

  const toggleSelectAll = () => {
    if (selectedIds.size === pagedCustomers.length && pagedCustomers.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pagedCustomers.map(c => c.id)));
    }
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Drawer State (Unified for Add & Edit)
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [drawerCustomer, setDrawerCustomer] = useState<Customer | null>(null);

  const [addState, addAction, isAdding] = useActionState(createCustomerAction, undefined);
  const [updateState, updateAction, isUpdating] = useActionState(updateCustomerAction, undefined);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");
  
  const [formKey, setFormKey] = useState(Date.now()); 
  const [showSuccess, setShowSuccess] = useState(false);

  const openDrawer = (mode: DrawerMode, customer?: Customer) => {
    setDrawerMode(mode);
    setFormKey(Date.now());
    if (mode === 'EDIT' && customer) {
      setDrawerCustomer(customer);
      setFormName(customer.name);
      setFormEmail(customer.email || "");
      setFormPhone(customer.phone || "");
      setFormAddress(customer.address || "");
    } else {
      setDrawerCustomer(null);
      setFormName("");
      setFormEmail("");
      setFormPhone("");
      setFormAddress("");
    }
  };

  useEffect(() => {
    if (addState?.success || updateState?.success) {
      setShowSuccess(true);
      if (addState?.success) {
        setFormName("");
        setFormEmail("");
        setFormPhone("");
        setFormAddress("");
        setFormKey(Date.now());
        performSearch(searchQuery, currentPage, pageSize, filterHasOrders);
        router.refresh();
      }
      if (updateState?.success) {
        setDrawerMode(null);
        performSearch(searchQuery, currentPage, pageSize, filterHasOrders);
        router.refresh();
      }
      setSelectedIds(new Set());
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [addState, updateState, searchQuery, currentPage, pageSize, filterHasOrders, router]);

  // Delete State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const isSuperadmin = userRole === "SUPERADMIN";

  const handleDelete = async () => {
    if (!isSuperadmin) return;
    
    setIsDeleting(true);
    setDeleteError("");
    const ids = Array.from(selectedIds);
    const result = await deleteCustomersAction(ids);

    if (result.error) {
      setDeleteError(result.error);
    } else {
      setIsDeleteDialogOpen(false);
      setSelectedIds(new Set());
      performSearch(searchQuery, currentPage, pageSize, filterHasOrders);
      router.refresh();
    }
    setIsDeleting(false);
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
            {drawerMode === 'ADD' ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {drawerMode === 'ADD' ? "Close Form" : "New Customer"}
          </button>

          <button
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={selectedIds.size === 0 || !isSuperadmin}
            title={!isSuperadmin ? "Only superadmins can delete customers" : ""}
            className="flex items-center gap-2 bg-[#1A1A1A] hover:bg-red-500/20 text-[#A3A3A3] hover:text-red-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-[#1F1F1F] hover:border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            Delete Selected {selectedIds.size > 0 && `(${selectedIds.size})`}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#737373]" />
            <Dropdown
              options={[
                { id: 'ALL', name: 'All Customers' },
                { id: true, name: 'With Orders' },
                { id: false, name: 'No Orders' }
              ]}
              value={filterHasOrders}
              onChange={handleHasOrdersChange}
              compact
              className="w-[140px]"
            />
          </div>
          <div className="w-px h-6 bg-[#1F1F1F] hidden sm:block"></div>
          <div className="relative w-full sm:w-64">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              isPending={isPending}
              placeholder="Search customers..."
            />
          </div>
          <LiveBadge isConnected={isConnected} />
        </div>
      </div>

      {/* Slide-out Add Customer Drawer */}
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
                {drawerMode === 'EDIT' ? "Edit Customer" : "Add New Customer"}
              </h3>
              <button onClick={() => setDrawerMode(null)} className="p-2 hover:bg-[#2A2A2A] rounded-full text-[#737373] hover:text-[#F5F5F5] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <form key={formKey} action={drawerMode === 'ADD' ? addAction : updateAction} className="flex flex-col gap-6" id="drawer-customer-form">
                
                {drawerMode === 'EDIT' && drawerCustomer && (
                  <input type="hidden" name="id" value={drawerCustomer.id} />
                )}

                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#A3A3A3]">Customer Name</label>
                  <input type="text" name="name" value={formName} onChange={e => setFormName(e.target.value)} required className="w-full ds-input" placeholder="e.g. John Doe" />
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#A3A3A3]">Email Address</label>
                    <input type="email" name="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} className="w-full ds-input" placeholder="john@example.com" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#A3A3A3]">Phone Number</label>
                    <input type="tel" name="phone" value={formPhone} onChange={e => setFormPhone(e.target.value)} className="w-full ds-input" placeholder="+91 9876543210" />
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#A3A3A3]">Address</label>
                  <textarea name="address" value={formAddress} onChange={e => setFormAddress(e.target.value)} className="w-full ds-input min-h-[80px]" placeholder="Full physical address..." />
                </div>

              </form>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-[#1F1F1F] bg-[#111111] space-y-3 shrink-0">
              {(addState?.error || updateState?.error) && (
                <div className="p-2 rounded bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                  {addState?.error || updateState?.error}
                </div>
              )}
              {showSuccess && (
                <div className="p-2 rounded bg-green-500/10 border border-green-500/20 text-xs text-green-400 flex items-center gap-1.5 animate-[fadeIn_0.2s_ease-out]">
                  <Check className="w-3 h-3" />
                  Customer saved!
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
                  form="drawer-customer-form"
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

      <TablePagination
        totalItems={total}
        pageSize={pageSize}
        currentPage={currentPage}
        onPageChange={(p) => { setSelectedIds(new Set()); handlePageChange(p); }}
        onPageSizeChange={(s) => { setSelectedIds(new Set()); handlePageSizeChange(s); }}
      />

      {/* ─── MOBILE VIEW: DEDICATED TOUCH-FIRST CUSTOMER CARDS ─── */}
      <div className="block md:hidden flex-1 overflow-y-auto custom-scrollbar">
        {pagedCustomers.length === 0 ? (
          <div className="p-12 text-center text-[#71717A] space-y-3">
            <PackageOpen className="w-12 h-12 mx-auto opacity-20 text-[#71717A]" />
            <p className="text-sm font-medium text-[#A1A1AA]">
              {searchQuery ? "No customers match your search." : "No customers found."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#1F1F1F]/60 pb-28">
            {pagedCustomers.map((customer) => {
              const isExpanded = expandedCustomerId === customer.id;
              const isSelected = selectedIds.has(customer.id);
              const orders = customerOrders[customer.id] || [];

              // Initials
              const initials = customer.name
                .split(' ')
                .map(n => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase() || 'CU';

              return (
                <div
                  key={customer.id}
                  onClick={() => openDrawer('EDIT', customer)}
                  className={`p-3.5 transition-all duration-150 cursor-pointer active:bg-[#18181D] ${
                    isSelected ? 'bg-orange-500/10' : 'hover:bg-[#16161A]'
                  }`}
                >
                  {/* Card Top: Checkbox + Avatar + Name + Quick Edit */}
                  <div className="flex items-center justify-between gap-2.5 mb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleSelect(customer.id)}
                        />
                      </div>
                      <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center font-bold text-xs text-orange-400 shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-[#FAFAFA] truncate">
                          {customer.name}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={(e) => toggleExpand(e, customer.id)}
                        className={`p-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition-all cursor-pointer ${
                          isExpanded 
                            ? 'bg-orange-500/15 text-orange-400 border-orange-500/30' 
                            : 'bg-[#18181C] text-[#A1A1AA] border-[#222227] hover:text-[#FAFAFA]'
                        }`}
                        title="View Orders History"
                      >
                        <PackageOpen className="w-3.5 h-3.5 text-orange-400" />
                        <span>Orders</span>
                      </button>

                      {isSuperadmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedIds(new Set([customer.id]));
                            setIsDeleteDialogOpen(true);
                          }}
                          className="p-1.5 text-[#71717A] hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors cursor-pointer"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Contact Info (Phone, Email, Address) */}
                  <div className="space-y-1 text-xs">
                    {customer.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        <a
                          href={`tel:${customer.phone}`}
                          onClick={e => e.stopPropagation()}
                          className="font-mono text-[#FAFAFA] hover:text-orange-400 transition-colors"
                        >
                          {customer.phone}
                        </a>
                      </div>
                    )}

                    {customer.email && (
                      <div className="flex items-center gap-2 text-[#A1A1AA]">
                        <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}

                    {customer.address && (
                      <div className="flex items-center gap-2 text-[#71717A]">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{customer.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Expandable Order History Accordion */}
                  {isExpanded && (
                    <div 
                      className="mt-3 pt-3 border-t border-[#222227] space-y-2 animate-[fadeIn_0.15s_ease-out]"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="text-[10px] font-bold text-[#71717A] uppercase flex items-center justify-between">
                        <span>Past Orders ({orders.length})</span>
                      </div>

                      {isLoadingOrders && !customerOrders[customer.id] ? (
                        <div className="text-xs text-[#71717A] py-2 animate-pulse">Loading orders...</div>
                      ) : orders.length === 0 ? (
                        <div className="text-xs text-[#71717A] py-2 bg-[#18181C] rounded-xl text-center border border-[#222227]">
                          No past orders found for this customer.
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {orders.map(order => (
                            <div
                              key={order.id}
                              className="p-2.5 rounded-xl bg-[#18181C] border border-[#222227] flex items-center justify-between text-xs"
                            >
                              <div>
                                <div className="font-mono text-orange-400 font-bold">{order.order_no}</div>
                                <div className="text-[11px] text-[#71717A]">{new Date(order.order_date).toLocaleDateString()}</div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className="font-mono font-bold text-orange-400">₹{order.total_amount.toLocaleString('en-IN')}</span>
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  order.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                                  order.status === 'CANCELLED' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                                  'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                }`}>
                                  {order.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
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
              <th className="px-4 py-3.5 w-12 text-center"></th>
              <th className="px-4 py-3.5 w-12 text-center">
                <div className="flex justify-center">
                  <Checkbox
                    checked={selectedIds.size === pagedCustomers.length && pagedCustomers.length > 0}
                    onChange={toggleSelectAll}
                  />
                </div>
              </th>
              <th className="px-4 py-3.5">Name</th>
              <th className="px-4 py-3.5">Email</th>
              <th className="px-4 py-3.5">Phone</th>
              <th className="px-4 py-3.5">Address</th>
              <th className="px-4 py-3.5 w-16 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F1F1F]/50">
            {pagedCustomers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-[#71717A]">
                  {searchQuery ? "No customers match your search." : "No customers found."}
                </td>
              </tr>
            ) : (
              pagedCustomers.map((customer) => {
                const isExpanded = expandedCustomerId === customer.id;
                const isSelected = selectedIds.has(customer.id);
                const orders = customerOrders[customer.id] || [];
                
                return (
                  <Fragment key={customer.id}>
                    <tr
                      onClick={() => openDrawer('EDIT', customer)}
                      className={`group hover:bg-[#18181C] transition-colors cursor-pointer ${isSelected ? "bg-orange-500/5 hover:bg-orange-500/10" : ""} ${isExpanded ? "bg-[#18181C]/80" : ""}`}
                    >
                      <td className="px-4 py-3 text-center" onClick={(e) => toggleExpand(e, customer.id)}>
                        <div className="flex justify-center text-[#71717A] hover:text-[#FAFAFA] cursor-pointer">
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-orange-400" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-center">
                          <Checkbox
                            checked={isSelected}
                            onChange={() => toggleSelect(customer.id)}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-[#FAFAFA]">{customer.name}</td>
                      <td className="px-4 py-3 text-xs text-[#A1A1AA]">
                        {customer.email ? (
                          <div className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-blue-400"/> {customer.email}</div>
                        ) : <span className="text-[#71717A]">-</span>}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-[#FAFAFA]">
                        {customer.phone ? (
                          <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-orange-400"/> {customer.phone}</div>
                        ) : <span className="text-[#71717A]">-</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#A1A1AA]">
                        {customer.address ? (
                           <div className="flex items-center gap-1.5 truncate max-w-[240px]"><MapPin className="w-3 h-3 text-emerald-400 shrink-0"/> <span className="truncate">{customer.address}</span></div>
                        ) : <span className="text-[#71717A]">-</span>}
                      </td>
                      <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isSuperadmin) return;
                            setSelectedIds(new Set([customer.id]));
                            setIsDeleteDialogOpen(true);
                          }}
                          disabled={!isSuperadmin}
                          className="p-1.5 text-[#71717A] hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-0 disabled:cursor-not-allowed cursor-pointer"
                          title={!isSuperadmin ? "Only superadmins can delete customers" : "Delete Customer"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                    
                    {/* Expanded Orders Row */}
                    {isExpanded && (
                      <tr className="bg-[#0F0F12]">
                        <td colSpan={7} className="p-0">
                          <div className="px-14 py-4 animate-[fadeInDown_0.2s_ease-out]">
                            <h4 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-3 flex items-center gap-2">
                              <PackageOpen className="w-4 h-4 text-orange-400" />
                              Order History
                            </h4>
                            
                            {isLoadingOrders && !customerOrders[customer.id] ? (
                              <div className="text-xs text-[#71717A] py-2">Loading orders...</div>
                            ) : orders.length === 0 ? (
                              <div className="text-xs text-[#71717A] py-3 bg-[#18181C] rounded-xl text-center border border-[#222227]">
                                No past orders for this customer.
                              </div>
                            ) : (
                              <div className="overflow-hidden rounded-xl border border-[#222227] bg-[#121215]">
                                <table className="w-full text-left text-xs text-[#A1A1AA]">
                                  <thead className="bg-[#18181C] text-[11px] text-[#71717A] uppercase font-semibold">
                                    <tr>
                                      <th className="px-3 py-2.5">Order No</th>
                                      <th className="px-3 py-2.5">Date</th>
                                      <th className="px-3 py-2.5">Status</th>
                                      <th className="px-3 py-2.5">Items</th>
                                      <th className="px-3 py-2.5 text-right">Total (₹)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#222227]/60">
                                    {orders.map(order => (
                                      <tr key={order.id} className="hover:bg-[#18181C]/50 transition-colors">
                                        <td className="px-3 py-2.5 font-mono font-bold text-orange-400">{order.order_no}</td>
                                        <td className="px-3 py-2.5 text-xs text-[#A1A1AA]">{new Date(order.order_date).toLocaleDateString()}</td>
                                        <td className="px-3 py-2.5">
                                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                            order.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                                            order.status === 'CANCELLED' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                                            'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                          }`}>
                                            {order.status}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2.5 text-xs text-[#FAFAFA] max-w-[200px] truncate">
                                          {order.items?.map(i => i.product?.name).join(", ")}
                                        </td>
                                        <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-400">
                                          ₹{order.total_amount.toLocaleString('en-IN')}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
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

      {/* ─── FLOATING BULK ACTION BAR (MOBILE STICKY) ─── */}
      {selectedIds.size > 0 && (
        <div className="md:hidden fixed bottom-[74px] left-3 right-3 z-40 bg-[#16161A]/95 backdrop-blur-xl border border-orange-500/30 rounded-2xl p-3 shadow-[0_12px_40px_rgba(0,0,0,0.85)] flex items-center justify-between animate-[fadeInUp_0.2s_ease-out]">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedIds.size === pagedCustomers.length && pagedCustomers.length > 0}
              onChange={toggleSelectAll}
            />
            <span className="text-xs font-bold text-[#FAFAFA]">
              {selectedIds.size} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isSuperadmin && (
              <button
                type="button"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="flex items-center gap-1 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}

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

      {/* Delete Confirmation Modal */}
      {/* Delete Confirmation Modal */}
      {mounted && (
        <ConfirmDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleDelete}
          title="Delete Customers"
          message={`Are you sure you want to delete ${selectedIds.size} selected customer${selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone.`}
          confirmText="Delete Customers"
          isLoading={isDeleting}
          error={deleteError}
        />
      )}
    </div>
  );
}
