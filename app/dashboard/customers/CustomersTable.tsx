"use client";

import { useState, useActionState, useEffect, useMemo, Fragment } from "react";
import { Plus, Search, Check, X, AlertTriangle, Trash2, Mail, Phone, MapPin, ChevronDown, ChevronRight, PackageOpen } from "lucide-react";
import { Customer, createCustomerAction, updateCustomerAction, deleteCustomersAction } from "@/app/actions/customers";
import { getCustomerOrdersAction, Order } from "@/app/actions/orders";
import { createPortal } from "react-dom";

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={`w-4 h-4 rounded flex items-center justify-center cursor-pointer transition-colors border ${checked ? "bg-green-500 border-green-500 text-slate-950" : "bg-slate-900 border-slate-600 text-transparent hover:border-slate-500"
        }`}
    >
      <Check className="w-3 h-3 stroke-[3]" />
    </div>
  );
}

type DrawerMode = 'ADD' | 'EDIT' | null;

export default function CustomersTable({ initialCustomers, userRole }: { initialCustomers: Customer[], userRole: string }) {
  const [searchQuery, setSearchQuery] = useState("");
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

  const filteredCustomers = useMemo(() => {
    return initialCustomers.filter(customer => {
      const q = searchQuery.toLowerCase();
      return (
        customer.name.toLowerCase().includes(q) ||
        (customer.email && customer.email.toLowerCase().includes(q)) ||
        (customer.phone && customer.phone.toLowerCase().includes(q))
      );
    });
  }, [initialCustomers, searchQuery]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCustomers.map(c => c.id)));
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
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col relative">
      {/* Action Bar */}
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 bg-slate-900">
        <div className="flex items-center gap-3">
          <button
            onClick={() => drawerMode === 'ADD' ? setDrawerMode(null) : openDrawer('ADD')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${drawerMode === 'ADD'
              ? "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
              : "bg-green-500 hover:bg-green-600 text-slate-950 glow-green"
              }`}
          >
            {drawerMode === 'ADD' ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {drawerMode === 'ADD' ? "Close Form" : "New Customer"}
          </button>

          <button
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={selectedIds.size === 0 || !isSuperadmin}
            title={!isSuperadmin ? "Only superadmins can delete customers" : ""}
            className="flex items-center gap-2 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-700 hover:border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            Delete Selected {selectedIds.size > 0 && `(${selectedIds.size})`}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600 transition-all placeholder:text-slate-600"
            />
          </div>
        </div>
      </div>

      {/* Slide-out Add Customer Drawer */}
      {mounted && createPortal(
        <>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 bg-slate-950/60 z-[99990] transition-opacity duration-300 ${drawerMode !== null ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            onClick={() => setDrawerMode(null)}
          />

          {/* Drawer */}
          <div
            className={`fixed top-0 right-0 h-full w-full max-w-xl bg-slate-900 shadow-2xl z-[99999] border-l border-slate-800 transform transition-transform duration-300 ease-in-out flex flex-col ${drawerMode !== null ? "translate-x-0" : "translate-x-full"
              }`}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50 shrink-0">
              <h3 className="text-lg font-medium text-slate-50">
                {drawerMode === 'EDIT' ? "Edit Customer" : "Add New Customer"}
              </h3>
              <button onClick={() => setDrawerMode(null)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
              <form key={formKey} action={drawerMode === 'ADD' ? addAction : updateAction} className="flex flex-col gap-6" id="drawer-customer-form">
                
                {drawerMode === 'EDIT' && drawerCustomer && (
                  <input type="hidden" name="id" value={drawerCustomer.id} />
                )}

                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">Customer Name</label>
                  <input type="text" name="name" value={formName} onChange={e => setFormName(e.target.value)} required className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500/50" placeholder="e.g. John Doe" />
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Email Address</label>
                    <input type="email" name="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500/50" placeholder="john@example.com" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Phone Number</label>
                    <input type="tel" name="phone" value={formPhone} onChange={e => setFormPhone(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500/50" placeholder="+91 9876543210" />
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">Address</label>
                  <textarea name="address" value={formAddress} onChange={e => setFormAddress(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-green-500/50 min-h-[80px]" placeholder="Full physical address..." />
                </div>

              </form>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-800 bg-slate-900/50 space-y-3 shrink-0">
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
                  className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition-colors border border-slate-700 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="drawer-customer-form"
                  disabled={isAdding || isUpdating}
                  className="flex-1 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-slate-950 font-medium rounded-lg transition-colors disabled:opacity-70 text-sm glow-green flex items-center justify-center gap-2"
                >
                  {(isAdding || isUpdating) ? "Saving..." : <><Check className="w-4 h-4" /> Save</>}
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Table */}
      <div className="overflow-x-auto min-h-[300px]">
        <table className="w-full text-left text-sm text-slate-300 min-w-[800px]">
          <thead className="text-xs text-slate-400 uppercase bg-slate-950/50 border-b border-slate-800">
            <tr>
              <th className="px-4 py-4 w-12 text-center"></th>
              <th className="px-4 py-4 w-12 text-center">
                <div className="flex justify-center">
                  <Checkbox
                    checked={selectedIds.size === filteredCustomers.length && filteredCustomers.length > 0}
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
          <tbody className="divide-y divide-slate-800/50">
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  {searchQuery ? "No customers match your search." : "No customers found."}
                </td>
              </tr>
            ) : (
              filteredCustomers.map((customer) => {
                const isExpanded = expandedCustomerId === customer.id;
                const isSelected = selectedIds.has(customer.id);
                const orders = customerOrders[customer.id] || [];
                
                return (
                  <Fragment key={customer.id}>
                    <tr
                      onClick={() => openDrawer('EDIT', customer)}
                      className={`group hover:bg-slate-800/50 transition-colors cursor-pointer ${isSelected ? "bg-green-500/5 hover:bg-green-500/10" : ""} ${isExpanded ? "bg-slate-800/30" : ""}`}
                    >
                      <td className="px-4 py-3 text-center" onClick={(e) => toggleExpand(e, customer.id)}>
                        <div className="flex justify-center text-slate-500 hover:text-slate-300">
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
                      <td className="px-4 py-3 font-medium text-slate-200">{customer.name}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {customer.email ? (
                          <div className="flex items-center gap-1.5"><Mail className="w-3 h-3"/> {customer.email}</div>
                        ) : <span className="text-slate-600">-</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {customer.phone ? (
                          <div className="flex items-center gap-1.5"><Phone className="w-3 h-3"/> {customer.phone}</div>
                        ) : <span className="text-slate-600">-</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {customer.address ? (
                           <div className="flex items-center gap-1.5 truncate max-w-[200px]"><MapPin className="w-3 h-3 shrink-0"/> <span className="truncate">{customer.address}</span></div>
                        ) : <span className="text-slate-600">-</span>}
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
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-0 disabled:cursor-not-allowed"
                          title={!isSuperadmin ? "Only superadmins can delete customers" : "Delete Customer"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                    
                    {/* Expanded Orders Row */}
                    {isExpanded && (
                      <tr className="bg-slate-900/50 border-b border-slate-800">
                        <td colSpan={7} className="p-0">
                          <div className="px-14 py-4 animate-[fadeInDown_0.2s_ease-out]">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                              <PackageOpen className="w-4 h-4" />
                              Order History
                            </h4>
                            
                            {isLoadingOrders && !customerOrders[customer.id] ? (
                              <div className="text-sm text-slate-500 py-2">Loading orders...</div>
                            ) : orders.length === 0 ? (
                              <div className="text-sm text-slate-500 py-2 bg-slate-950/50 rounded-lg text-center border border-slate-800/50">
                                No past orders for this customer.
                              </div>
                            ) : (
                              <div className="overflow-hidden rounded-lg border border-slate-800/50 bg-slate-950/50">
                                <table className="w-full text-left text-sm text-slate-300">
                                  <thead className="bg-slate-900/50 text-xs text-slate-400">
                                    <tr>
                                      <th className="px-3 py-2 font-medium">Order No</th>
                                      <th className="px-3 py-2 font-medium">Date</th>
                                      <th className="px-3 py-2 font-medium">Status</th>
                                      <th className="px-3 py-2 font-medium">Items</th>
                                      <th className="px-3 py-2 font-medium text-right">Total (₹)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800/50">
                                    {orders.map(order => (
                                      <tr key={order.id} className="hover:bg-slate-900/50 transition-colors">
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
                                        <td className="px-3 py-2 text-xs text-slate-400 max-w-[200px] truncate">
                                          {order.items?.map(i => i.product?.name).join(", ")}
                                        </td>
                                        <td className="px-3 py-2 text-right font-medium text-slate-200">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-[fadeInUp_0.2s_ease-out_forwards]">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-50">Delete Customers</h3>
                <p className="text-sm text-slate-400 mt-1">
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
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition-colors border border-slate-700 text-sm disabled:opacity-50"
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
