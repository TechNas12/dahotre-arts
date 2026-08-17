"use client";

import { useState, useActionState, useEffect, useMemo, useRef, Fragment } from "react";
import { Plus, Check, X, AlertTriangle, Trash2, Mail, Phone, MapPin, ChevronDown, ChevronRight, PackageOpen, Filter } from "lucide-react";
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
    import("react").then((React) => {
       React.startTransition(() => {
          performSearch(searchQuery, currentPage, pageSize, filterHasOrders);
       });
    });
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
        // Optimistic refresh (will be overwritten by realtime soon)
        import("react").then((React) => {
          React.startTransition(() => {
            performSearch(searchQuery, currentPage, pageSize, filterHasOrders);
          });
        });
      }
      if (updateState?.success) {
        setDrawerMode(null);
        import("react").then((React) => {
          React.startTransition(() => {
            performSearch(searchQuery, currentPage, pageSize, filterHasOrders);
          });
        });
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
      import("react").then((React) => {
        React.startTransition(() => {
          performSearch(searchQuery, currentPage, pageSize, filterHasOrders);
        });
      });
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

      <div className="flex-1 overflow-auto custom-scrollbar overflow-x-hidden md:overflow-x-auto">
        <table className="w-full text-left border-collapse block md:table">
          <thead className="bg-[#0A0A0A]/80 sticky top-0 z-10 backdrop-blur-sm hidden md:table-header-group border-b border-[#1F1F1F]">
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
          <tbody className="divide-y divide-[#1F1F1F]/50 block md:table-row-group">
            {pagedCustomers.length === 0 ? (
              <tr className="block md:table-row">
                <td colSpan={7} className="px-4 py-12 text-center text-[#737373] block md:table-cell">
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
                      className={`group hover:bg-[#1A1A1A] transition-colors cursor-pointer flex flex-col md:table-row p-4 md:p-0 border-b border-[#1F1F1F] md:border-0 relative ${isSelected ? "bg-orange-500/5 hover:bg-orange-500/10" : ""} ${isExpanded ? "bg-[#1A1A1A] border-y border-orange-500/20" : ""}`}
                    >
                      <td className="px-4 py-3 md:text-center absolute top-4 right-4 md:static md:w-auto" onClick={(e) => toggleExpand(e, customer.id)}>
                        <div className="flex justify-center text-[#737373] hover:text-[#F5F5F5]">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                      </td>
                      <td className="px-4 py-3 md:text-center absolute top-4 left-4 md:static md:w-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-center">
                          <Checkbox
                            checked={isSelected}
                            onChange={() => toggleSelect(customer.id)}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-1 md:py-3 pl-10 md:pl-4 flex md:table-cell justify-between items-center before:content-['Name'] md:before:content-none before:text-xs before:text-[#737373] before:font-bold font-medium text-[#F5F5F5]">{customer.name}</td>
                      <td className="px-4 py-1 md:py-3 pl-10 md:pl-4 flex md:table-cell justify-between items-center before:content-['Email'] md:before:content-none before:text-xs before:text-[#737373] before:font-bold text-[#A3A3A3]">
                        {customer.email ? (
                          <div className="flex items-center gap-1.5"><Mail className="w-3 h-3"/> {customer.email}</div>
                        ) : <span className="text-[#737373]">-</span>}
                      </td>
                      <td className="px-4 py-1 md:py-3 pl-10 md:pl-4 flex md:table-cell justify-between items-center before:content-['Phone'] md:before:content-none before:text-xs before:text-[#737373] before:font-bold text-[#A3A3A3]">
                        {customer.phone ? (
                          <div className="flex items-center gap-1.5"><Phone className="w-3 h-3"/> {customer.phone}</div>
                        ) : <span className="text-[#737373]">-</span>}
                      </td>
                      <td className="px-4 py-1 md:py-3 pl-10 md:pl-4 flex md:table-cell justify-between items-center before:content-['Address'] md:before:content-none before:text-xs before:text-[#737373] before:font-bold text-[#A3A3A3]">
                        {customer.address ? (
                           <div className="flex items-center gap-1.5 truncate max-w-[200px] text-right md:text-left"><MapPin className="w-3 h-3 shrink-0"/> <span className="truncate">{customer.address}</span></div>
                        ) : <span className="text-[#737373]">-</span>}
                      </td>
                      <td className="px-4 py-3 md:text-center flex justify-end items-center mt-2 md:mt-0 border-t border-[#1F1F1F] md:border-0 pt-3 md:pt-3" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isSuperadmin) return;
                            setSelectedIds(new Set([customer.id]));
                            setIsDeleteDialogOpen(true);
                          }}
                          disabled={!isSuperadmin}
                          className="p-1.5 text-[#737373] hover:text-red-400 hover:bg-red-400/10 rounded transition-colors opacity-100 md:opacity-0 group-hover:opacity-100 disabled:opacity-0 disabled:cursor-not-allowed"
                          title={!isSuperadmin ? "Only superadmins can delete customers" : "Delete Customer"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                    
                    {/* Expanded Orders Row */}
                    {isExpanded && (
                      <tr className="bg-[#111111] border-b border-[#1F1F1F] flex flex-col md:table-row w-full">
                        <td colSpan={7} className="p-0 block md:table-cell w-full">
                          <div className="px-4 md:px-14 py-4 animate-[fadeInDown_0.2s_ease-out] w-full">
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
                              <div className="overflow-hidden rounded-lg border border-[#1F1F1F] bg-[#0A0A0A] w-full">
                                <table className="w-full text-left text-sm text-[#A3A3A3] block md:table">
                                  <thead className="bg-[#111111] text-xs text-[#737373] hidden md:table-header-group">
                                    <tr>
                                      <th className="px-3 py-2 font-medium">Order No</th>
                                      <th className="px-3 py-2 font-medium">Date</th>
                                      <th className="px-3 py-2 font-medium">Status</th>
                                      <th className="px-3 py-2 font-medium">Items</th>
                                      <th className="px-3 py-2 font-medium text-right">Total (₹)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#1F1F1F] block md:table-row-group">
                                    {orders.map(order => (
                                      <tr key={order.id} className="hover:bg-[#1A1A1A] transition-colors flex flex-col md:table-row py-2 md:py-0 border-b border-[#1F1F1F] md:border-0 last:border-0">
                                        <td className="px-3 py-1 md:py-2 font-mono text-xs flex md:table-cell justify-between before:content-['Order_No'] md:before:content-none before:text-[#737373] before:font-medium">{order.order_no}</td>
                                        <td className="px-3 py-1 md:py-2 text-xs flex md:table-cell justify-between before:content-['Date'] md:before:content-none before:text-[#737373] before:font-medium">{new Date(order.order_date).toLocaleDateString()}</td>
                                        <td className="px-3 py-1 md:py-2 flex md:table-cell justify-between before:content-['Status'] md:before:content-none before:text-[#737373] before:font-medium">
                                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                                            ${order.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 
                                              order.status === 'CANCELLED' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                                              'bg-blue-500/10 text-blue-400 border border-blue-500/20'}
                                          `}>
                                            {order.status}
                                          </span>
                                        </td>
                                        <td className="px-3 py-1 md:py-2 text-xs text-[#A3A3A3] max-w-full md:max-w-[200px] truncate flex md:table-cell justify-between before:content-['Items'] md:before:content-none before:text-[#737373] before:font-medium text-right md:text-left">
                                          {order.items?.map(i => i.product?.name).join(", ")}
                                        </td>
                                        <td className="px-3 py-1 md:py-2 text-right font-medium text-[#F5F5F5] flex md:table-cell justify-between before:content-['Total'] md:before:content-none before:text-[#737373] before:font-medium">
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
