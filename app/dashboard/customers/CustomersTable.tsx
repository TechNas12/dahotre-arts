"use client";

import { useState, useActionState, useEffect, useMemo, Fragment } from "react";
import { Plus, Search, Check, X, AlertTriangle, Trash2, Mail, Phone, MapPin, ChevronDown, ChevronRight, PackageOpen } from "lucide-react";
import { Customer, createCustomerAction, updateCustomerAction, deleteCustomersAction } from "@/app/actions/customers";
import { getCustomerOrdersAction, Order } from "@/app/actions/orders";
import { createPortal } from "react-dom";
import { TablePagination, PageSize } from "@/app/dashboard/components/TablePagination";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

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
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [mounted, setMounted] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

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

  const currentPage = initialPage;
  const pageSize = initialPageSize as PageSize;

  // Flush state to URL
  const updateURL = (params: Record<string, string | number | undefined>) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === '' || value === 'ALL') {
        current.delete(key);
      } else {
        current.set(key, String(value));
      }
    });
    router.push(`${pathname}?${current.toString()}`, { scroll: false });
  };

  // Debounced Search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchQuery !== initialSearch) {
        updateURL({ search: searchQuery, page: 1 });
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handlePageChange = (page: number) => {
    updateURL({ page });
  };

  const handlePageSizeChange = (size: number) => {
    updateURL({ pageSize: size, page: 1 });
  };

  const pagedCustomers = initialCustomers;

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
      }
      if (updateState?.success) {
        setDrawerMode(null);
      }
      setSelectedIds(new Set());
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [addState, updateState]);

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
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full ds-input !pl-9"
            />
          </div>
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
        totalItems={totalCount}
        pageSize={pageSize}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      <div className="overflow-x-auto min-h-[300px] custom-scrollbar">
        <table className="w-full text-left text-sm text-[#F5F5F5] min-w-[800px]">
          <thead className="text-xs text-[#A3A3A3] uppercase bg-[#0A0A0A]/80 border-b border-[#1F1F1F]">
            <tr>
              <th className="px-4 py-4 w-12 text-center"></th>
              <th className="px-4 py-4 w-12 text-center">
                <div className="flex justify-center">
                  <Checkbox
                    checked={selectedIds.size === pagedCustomers.length && pagedCustomers.length > 0}
                    onChange={toggleSelectAll}
                  />
                </div>
              </th>
              <th className="px-4 py-4 font-medium">Name</th>
              <th className="px-4 py-4 font-medium">Email</th>
              <th className="px-4 py-4 font-medium">Phone</th>
              <th className="px-4 py-4 font-medium">Address</th>
              <th className="px-4 py-4 font-medium w-16 text-center">✏</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F1F1F]/50">
            {pagedCustomers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-[#737373]">
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
                      className={`group hover:bg-[#1A1A1A] transition-colors cursor-pointer ${isSelected ? "bg-orange-500/5 hover:bg-orange-500/10" : ""} ${isExpanded ? "bg-[#1A1A1A] border-y border-orange-500/20" : ""}`}
                    >
                      <td className="px-4 py-3 text-center" onClick={(e) => toggleExpand(e, customer.id)}>
                        <div className="flex justify-center text-[#737373] hover:text-[#F5F5F5]">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
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
                      <td className="px-4 py-3 font-medium text-[#F5F5F5]">{customer.name}</td>
                      <td className="px-4 py-3 text-[#A3A3A3]">
                        {customer.email ? (
                          <div className="flex items-center gap-1.5"><Mail className="w-3 h-3"/> {customer.email}</div>
                        ) : <span className="text-[#737373]">-</span>}
                      </td>
                      <td className="px-4 py-3 text-[#A3A3A3]">
                        {customer.phone ? (
                          <div className="flex items-center gap-1.5"><Phone className="w-3 h-3"/> {customer.phone}</div>
                        ) : <span className="text-[#737373]">-</span>}
                      </td>
                      <td className="px-4 py-3 text-[#A3A3A3]">
                        {customer.address ? (
                           <div className="flex items-center gap-1.5 truncate max-w-[200px]"><MapPin className="w-3 h-3 shrink-0"/> <span className="truncate">{customer.address}</span></div>
                        ) : <span className="text-[#737373]">-</span>}
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
                          className="p-1.5 text-[#737373] hover:text-red-400 hover:bg-red-400/10 rounded transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-0 disabled:cursor-not-allowed"
                          title={!isSuperadmin ? "Only superadmins can delete customers" : "Delete Customer"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                    
                    {/* Expanded Orders Row */}
                    {isExpanded && (
                      <tr className="bg-[#111111] border-b border-[#1F1F1F]">
                        <td colSpan={7} className="p-0">
                          <div className="px-14 py-4 animate-[fadeInDown_0.2s_ease-out]">
                            <h4 className="text-xs font-bold text-[#A3A3A3] uppercase tracking-wider mb-3 flex items-center gap-2">
                              <PackageOpen className="w-4 h-4" />
                              Order History
                            </h4>
                            
                            {isLoadingOrders && !customerOrders[customer.id] ? (
                              <div className="text-sm text-[#737373] py-2">Loading orders...</div>
                            ) : orders.length === 0 ? (
                              <div className="text-sm text-[#737373] py-2 bg-[#0A0A0A] rounded-lg text-center border border-[#1F1F1F]">
                                No past orders for this customer.
                              </div>
                            ) : (
                              <div className="overflow-hidden rounded-lg border border-[#1F1F1F] bg-[#0A0A0A]">
                                <table className="w-full text-left text-sm text-[#A3A3A3]">
                                  <thead className="bg-[#111111] text-xs text-[#737373]">
                                    <tr>
                                      <th className="px-3 py-2 font-medium">Order No</th>
                                      <th className="px-3 py-2 font-medium">Date</th>
                                      <th className="px-3 py-2 font-medium">Status</th>
                                      <th className="px-3 py-2 font-medium">Items</th>
                                      <th className="px-3 py-2 font-medium text-right">Total (₹)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#1F1F1F]">
                                    {orders.map(order => (
                                      <tr key={order.id} className="hover:bg-[#1A1A1A] transition-colors">
                                        <td className="px-3 py-2 font-mono text-xs">{order.order_no}</td>
                                        <td className="px-3 py-2 text-xs">{new Date(order.order_date).toLocaleDateString()}</td>
                                        <td className="px-3 py-2">
                                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                                            ${order.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 
                                              order.status === 'CANCELLED' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                                              'bg-blue-500/10 text-blue-400 border border-blue-500/20'}
                                          `}>
                                            {order.status}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 text-xs text-[#A3A3A3] max-w-[200px] truncate">
                                          {order.items?.map(i => i.product?.name).join(", ")}
                                        </td>
                                        <td className="px-3 py-2 text-right font-medium text-[#F5F5F5]">
                                          {order.total_amount.toFixed(2)}
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

      {/* Delete Confirmation Modal */}
      {mounted && isDeleteDialogOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeInUp_0.2s_ease-out_forwards]">
          <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#F5F5F5]">Delete Customers</h3>
                <p className="text-sm text-[#A3A3A3] mt-1">
                  Are you sure you want to delete {selectedIds.size} selected customer{selectedIds.size !== 1 && 's'}? This action cannot be undone.
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                {deleteError}
              </div>
            )}

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2 ds-btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting || !isSuperadmin}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors text-sm disabled:opacity-70 flex items-center gap-2"
              >
                {isDeleting ? "Deleting..." : "Delete Customers"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
