"use client";

import { useState, useMemo, Fragment } from "react";
import { Package, ChevronRight, Printer, Phone, User, MapPin, CreditCard, ShoppingBag, AlertCircle, Banknote, Smartphone, AlertTriangle, Search, X, Calendar } from "lucide-react";
import { Order } from "@/app/actions/orders";
import { StatusBadge } from "@/app/dashboard/components/ui/StatusBadge";
import { TablePagination, PageSize } from "@/app/dashboard/components/TablePagination";
import { SearchInput } from "@/app/dashboard/components/SearchInput";
import { LiveBadge } from "@/app/dashboard/components/LiveBadge";
import { Dropdown } from "@/app/dashboard/components/ui/Dropdown";

type BookingsListTabProps = {
  orders: Order[];
  total: number;
  currentPage: number;
  pageSize: PageSize;
  searchQuery: string;
  filterStatus: string;
  filterPaymentMode: string;
  filterFulfillment: string;
  filterDateFrom: string;
  filterDateTo: string;
  printPageSize: 'A4' | 'A5';
  isConnected: boolean;
  isPending: boolean;
  onSearchChange: (q: string) => void;
  onStatusChange: (s: string) => void;
  onPaymentModeChange: (p: string) => void;
  onFulfillmentChange: (f: string) => void;
  onDateFromChange: (d: string) => void;
  onDateToChange: (d: string) => void;
  onDateRangePreset: (preset: "today" | "yesterday" | "all") => void;
  onPrintPageSizeChange: (size: 'A4' | 'A5') => void;
  onPrint: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSize) => void;
};

export function BookingsListTab({
  orders,
  total,
  currentPage,
  pageSize,
  searchQuery,
  filterStatus,
  filterPaymentMode,
  filterFulfillment,
  filterDateFrom,
  filterDateTo,
  printPageSize,
  isConnected,
  isPending,
  onSearchChange,
  onStatusChange,
  onPaymentModeChange,
  onFulfillmentChange,
  onDateFromChange,
  onDateToChange,
  onDateRangePreset,
  onPrintPageSizeChange,
  onPrint,
  onPageChange,
  onPageSizeChange,
}: BookingsListTabProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterStatus !== 'ALL') count++;
    if (filterPaymentMode !== 'ALL') count++;
    if (filterFulfillment !== 'ALL') count++;
    if (filterDateFrom || filterDateTo) count++;
    return count;
  }, [filterStatus, filterPaymentMode, filterFulfillment, filterDateFrom, filterDateTo]);

  const toggleExpandOrder = (id: number) => {
    const next = new Set(expandedRows);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedRows(next);
  };

  // Calculate Page Summary Totals
  const pageSummary = useMemo(() => {
    let totalAmt = 0;
    let cash = 0;
    let online = 0;

    orders.forEach((order) => {
      if (order.status !== "CANCELLED") {
        totalAmt += Number(order.total_amount || 0);
        order.payments?.forEach((p) => {
          if (p.payment_mode === "CASH") cash += Number(p.amount);
          if (p.payment_mode === "ONLINE") online += Number(p.amount);
        });
      }
    });

    const due = Math.max(0, totalAmt - (cash + online));
    return { totalAmt, cash, online, due };
  }, [orders]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Filters and Action Bar */}
      <div className="p-3.5 sm:p-4 border-b border-[#1F1F1F] bg-[#0A0A0A] shrink-0 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <LiveBadge isConnected={isConnected} />
            <div className="flex-1 max-w-md">
              <SearchInput
                value={searchQuery}
                onChange={onSearchChange}
                isPending={isPending}
                placeholder="Search bookings, customer, phone, code..."
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Mobile Filter Toggle */}
            <button
              type="button"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className={`md:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                showMobileFilters || activeFiltersCount > 0
                  ? "bg-orange-500/15 border-orange-500/40 text-orange-400"
                  : "bg-[#18181C] border-[#222227] text-[#A1A1AA]"
              }`}
            >
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Print controls */}
            <div className="flex items-center gap-1 bg-[#18181C] border border-[#222227] rounded-xl p-1 shadow-sm">
              <select
                className="bg-transparent text-xs text-[#FAFAFA] outline-none px-1.5 sm:px-2 py-1 cursor-pointer font-medium"
                value={printPageSize}
                onChange={(e) => onPrintPageSizeChange(e.target.value as 'A4' | 'A5')}
              >
                <option value="A4">A4</option>
                <option value="A5">A5</option>
              </select>
              <button
                onClick={onPrint}
                className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-2.5 sm:px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                title="Print Bookings List"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Print</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dropdown Filters (Collapsible on Mobile, inline on Desktop) */}
        <div className={`${showMobileFilters ? 'flex' : 'hidden md:flex'} flex-wrap items-center gap-2 pt-2 border-t border-[#1F1F1F]/60 animate-[fadeIn_0.15s_ease-out]`}>
          <Dropdown
            options={[
              { id: 'ALL', name: 'All Payments' },
              { id: 'CASH', name: 'Cash' },
              { id: 'ONLINE', name: 'Online' }
            ]}
            value={filterPaymentMode}
            onChange={onPaymentModeChange}
            className="w-32"
            compact
          />

          <Dropdown
            options={[
              { id: 'ALL', name: 'All Status' },
              { id: 'PENDING', name: 'Pending' },
              { id: 'CANCELLED', name: 'Cancelled' }
            ]}
            value={filterStatus}
            onChange={onStatusChange}
            className="w-32"
            compact
          />

          <Dropdown
            options={[
              { id: 'ALL', name: 'All Fulfillment' },
              { id: 'UNFULFILLED', name: 'Unfulfilled' },
              { id: 'FULFILLED', name: 'Fulfilled' }
            ]}
            value={filterFulfillment}
            onChange={onFulfillmentChange}
            className="w-36"
            compact
          />

          {/* Date Range Inputs */}
          <div className="flex items-center gap-1.5 bg-[#18181C] border border-[#222227] rounded-xl px-2.5 py-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              className="bg-transparent text-xs text-[#FAFAFA] outline-none [color-scheme:dark] cursor-pointer"
              title="From Date"
            />
            <span className="text-[#55555A] font-bold">-</span>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              className="bg-transparent text-xs text-[#FAFAFA] outline-none [color-scheme:dark] cursor-pointer"
              title="To Date"
            />
            {(filterDateFrom || filterDateTo) && (
              <button
                type="button"
                onClick={() => {
                  onDateFromChange('');
                  onDateToChange('');
                }}
                className="text-[#71717A] hover:text-[#FAFAFA] ml-0.5 p-0.5 rounded transition-colors cursor-pointer"
                title="Clear date filter"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onDateRangePreset("today")}
              className={`text-xs px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer font-medium ${
                filterDateFrom && filterDateFrom === filterDateTo && filterDateFrom === new Date().toISOString().slice(0, 10)
                  ? "bg-orange-500/20 border-orange-500/40 text-orange-400 font-bold"
                  : "bg-[#18181C] border-[#222227] text-[#8E8E93] hover:text-[#FAFAFA]"
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => onDateRangePreset("yesterday")}
              className={`text-xs px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer font-medium ${
                filterDateFrom && filterDateFrom === filterDateTo && filterDateFrom === new Date(Date.now() - 86400000).toISOString().slice(0, 10)
                  ? "bg-orange-500/20 border-orange-500/40 text-orange-400 font-bold"
                  : "bg-[#18181C] border-[#222227] text-[#8E8E93] hover:text-[#FAFAFA]"
              }`}
            >
              Yesterday
            </button>
          </div>

          {activeFiltersCount > 0 && (
            <button
              onClick={() => {
                onPaymentModeChange('ALL');
                onStatusChange('ALL');
                onFulfillmentChange('ALL');
                onDateFromChange('');
                onDateToChange('');
                setShowMobileFilters(false);
              }}
              className="text-xs text-orange-400 hover:underline font-medium ml-auto cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        {searchQuery.trim() && (
          <div className="flex items-center justify-between bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded-xl text-xs animate-[fadeIn_0.2s_ease-out]">
            <div className="flex items-center gap-2 text-orange-400">
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span>Found <strong className="text-[#FAFAFA] font-bold">{total}</strong> bookings matching &ldquo;{searchQuery}&rdquo;</span>
            </div>
            <button 
              onClick={() => onSearchChange("")}
              className="text-orange-400 hover:text-white font-medium flex items-center gap-1 cursor-pointer transition-colors"
              title="Clear Search"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          </div>
        )}
      </div>

      {/* Pagination Bar */}
      <TablePagination
        totalItems={total}
        pageSize={pageSize}
        currentPage={currentPage}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />

      {/* ─── MOBILE VIEW: DEDICATED TOUCH-FIRST BOOKING CARDS ─── */}
      <div className="block md:hidden flex-1 overflow-y-auto custom-scrollbar">
        {orders.length === 0 ? (
          <div className="p-12 text-center text-[#71717A] space-y-3">
            <Package className="w-12 h-12 mx-auto opacity-20 text-[#71717A]" />
            <p className="text-sm font-medium text-[#A1A1AA]">
              {searchQuery.trim() ? `No bookings found matching "${searchQuery}".` : "No bookings found matching current filters."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#1F1F1F]/60 pb-20">
            {orders.map((order) => {
              const isExpanded = expandedRows.has(order.id);
              const orderDate = new Date(order.order_date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });

              const totalAmt = Number(order.total_amount || 0);
              const paid = order.payments?.reduce((acc, p) => acc + Number(p.amount), 0) || 0;
              const cash = order.payments?.filter(p => p.payment_mode === 'CASH').reduce((acc, p) => acc + Number(p.amount), 0) || 0;
              const online = order.payments?.filter(p => p.payment_mode === 'ONLINE').reduce((acc, p) => acc + Number(p.amount), 0) || 0;
              const due = Math.max(0, totalAmt - paid);

              return (
                <div
                  key={order.id}
                  onClick={() => toggleExpandOrder(order.id)}
                  className="p-3.5 hover:bg-[#16161A] active:bg-[#18181D] transition-colors cursor-pointer"
                >
                  {/* Top Bar: Booking No + Date + Status Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-lg">
                        {order.order_no}
                      </span>
                      <span className="text-[11px] text-[#71717A] font-mono">
                        {orderDate}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={order.fulfillment_status} type="fulfillment" />
                      <StatusBadge status={order.status} />
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div>
                      <div className="text-sm font-semibold text-[#FAFAFA]">
                        {order.customer?.name || "Unknown Customer"}
                      </div>
                      {order.customer?.phone && (
                        <a 
                          href={`tel:${order.customer.phone}`}
                          onClick={e => e.stopPropagation()}
                          className="text-xs text-[#71717A] hover:text-orange-400 font-mono flex items-center gap-1 mt-0.5 transition-colors"
                        >
                          <Phone className="w-3 h-3 text-orange-400" />
                          <span>{order.customer.phone}</span>
                        </a>
                      )}
                    </div>

                    <span className="text-[11px] text-[#71717A] bg-[#18181C] px-2 py-0.5 rounded-md border border-[#222227]">
                      {order.user?.name || "Staff"}
                    </span>
                  </div>

                  {/* Items Preview */}
                  {order.items && order.items.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      {order.items.map((item, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 text-[11px] bg-[#18181C] text-[#A1A1AA] px-2 py-0.5 rounded-lg border border-[#222227]">
                          <span className="font-mono text-orange-400 font-bold">{item.product?.product_code || ''}</span>
                          <span className="truncate max-w-[110px]">{item.product?.name || ''}</span>
                          <span className="text-orange-400 font-semibold">×{item.quantity}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Financials & Payment summary */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#1F1F1F]/60">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-[#71717A]">Booking Total</div>
                      <div className="text-base font-bold font-mono text-orange-400">
                        ₹{totalAmt.toLocaleString("en-IN")}
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-1.5">
                      {cash > 0 && <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/20 font-mono">Cash ₹{cash.toLocaleString("en-IN")}</span>}
                      {online > 0 && <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-md border border-blue-500/20 font-mono">Online ₹{online.toLocaleString("en-IN")}</span>}
                      {due > 0 ? (
                        <span className="text-[10px] font-bold bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-md border border-amber-500/30 font-mono">
                          Due ₹{due.toLocaleString("en-IN")}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">Paid</span>
                      )}
                    </div>
                  </div>

                  {/* Expanded Mobile Details */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-[#222227] space-y-3 animate-[fadeIn_0.15s_ease-out]">
                      {order.customer?.address && (
                        <div className="bg-[#18181C] p-2.5 rounded-xl border border-[#222227] text-xs text-[#A1A1AA] flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{order.customer.address}</span>
                        </div>
                      )}

                      <div className="bg-[#18181C] rounded-xl border border-[#222227] p-2.5 space-y-2">
                        <div className="text-[10px] font-bold text-[#71717A] uppercase">Booked Items Details</div>
                        {order.items?.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-[#222227]/60 last:border-0">
                            <div>
                              <span className="font-mono text-orange-400 font-bold mr-1.5">{item.product?.product_code}</span>
                              <span className="text-[#FAFAFA]">{item.product?.name}</span>
                            </div>
                            <div className="font-mono text-right">
                              <span className="text-[#71717A] mr-2">Qty {item.quantity}</span>
                              <span className="font-bold text-emerald-400">₹{item.subtotal}</span>
                            </div>
                          </div>
                        ))}
                      </div>
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
          <thead className="bg-[#0A0A0A] border-b border-[#1F1F1F] sticky top-0 z-10">
            <tr className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">
              <th className="p-3.5 w-10"></th>
              <th className="p-3.5">Order No</th>
              <th className="p-3.5">Customer & Phone</th>
              <th className="p-3.5">Order Date</th>
              <th className="p-3.5">Created By</th>
              <th className="p-3.5 text-right">Total Amount</th>
              <th className="p-3.5">Payments & Dues</th>
              <th className="p-3.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F1F1F]/50 text-sm">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-12 text-center text-[#71717A]">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-20 text-[#71717A]" />
                  No bookings found matching current filters.
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const isExpanded = expandedRows.has(order.id);
                const orderDate = new Date(order.order_date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });

                const totalAmt = Number(order.total_amount || 0);
                const paid = order.payments?.reduce((acc, p) => acc + Number(p.amount), 0) || 0;
                const cash = order.payments?.filter(p => p.payment_mode === 'CASH').reduce((acc, p) => acc + Number(p.amount), 0) || 0;
                const online = order.payments?.filter(p => p.payment_mode === 'ONLINE').reduce((acc, p) => acc + Number(p.amount), 0) || 0;
                const due = Math.max(0, totalAmt - paid);

                return (
                  <Fragment key={order.id}>
                    <tr
                      className={`hover:bg-[#18181C] transition-colors cursor-pointer ${
                        isExpanded ? "bg-[#18181C]/60" : ""
                      }`}
                      onClick={() => toggleExpandOrder(order.id)}
                    >
                      <td className="p-3.5 text-center">
                        <button className="p-1 text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#222227] rounded-lg transition-all cursor-pointer">
                          <ChevronRight
                            className={`w-4 h-4 transition-transform duration-200 ${
                              isExpanded ? "rotate-90 text-orange-400" : ""
                            }`}
                          />
                        </button>
                      </td>
                      <td className="p-3.5 font-mono text-xs font-bold text-[#FAFAFA]">
                        {order.order_no}
                      </td>
                      <td className="p-3.5">
                        <div className="font-medium text-[#FAFAFA]">{order.customer?.name || "Unknown"}</div>
                        {order.customer?.phone && (
                          <div className="text-xs font-mono text-[#71717A] flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-[#A1A1AA]" />
                            {order.customer.phone}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-xs text-[#A1A1AA] whitespace-nowrap">{orderDate}</td>
                      <td className="p-3.5 text-xs text-[#A1A1AA]">
                        <span className="bg-[#18181C] px-2 py-0.5 rounded-md text-[11px] border border-[#222227]">
                          {order.user?.name || "Staff"}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono text-sm font-bold text-orange-400">
                        ₹{totalAmt.toLocaleString("en-IN")}
                      </td>
                      <td className="p-3.5">
                        {order.status === "CANCELLED" ? (
                          <span className="text-xs text-[#71717A]">-</span>
                        ) : (
                          <div className="flex flex-col gap-1 w-[130px]">
                            {cash > 0 && (
                              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-md border border-emerald-500/20 font-mono inline-flex items-center gap-1">
                                <Banknote className="w-3 h-3 shrink-0" /> Cash ₹{cash.toLocaleString("en-IN")}
                              </span>
                            )}
                            {online > 0 && (
                              <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded-md border border-blue-500/20 font-mono inline-flex items-center gap-1">
                                <Smartphone className="w-3 h-3 shrink-0" /> Online ₹{online.toLocaleString("en-IN")}
                              </span>
                            )}
                            {due > 0 ? (
                              <span className="text-[10px] font-bold bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded-md border border-amber-500/30 font-mono inline-flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 shrink-0" /> Due ₹{due.toLocaleString("en-IN")}
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-400 font-semibold">Fully Paid</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <StatusBadge status={order.status} />
                      </td>
                    </tr>

                    {/* Rich Detailed Order Drawer */}
                    {isExpanded && (
                      <tr className="bg-[#0F0F12]">
                        <td colSpan={2}></td>
                        <td colSpan={6} className="p-4 pt-1 pb-4">
                          <div className="bg-[#121215] border border-[#222227] rounded-xl p-4 space-y-4 shadow-inner">
                            
                            {/* Drawer Header */}
                            <div className="flex items-center justify-between pb-3 border-b border-[#222227]">
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-bold font-mono text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-lg border border-orange-500/20">
                                  {order.order_no}
                                </span>
                                <span className="text-xs text-[#A1A1AA]">
                                  Placed on {new Date(order.order_date).toLocaleString("en-IN")}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <StatusBadge status={order.fulfillment_status} type="fulfillment" />
                                <StatusBadge status={order.status} />
                              </div>
                            </div>

                            {/* Section 1: Customer Contact Info */}
                            <div className="bg-[#18181C] p-3 rounded-xl border border-[#222227] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-orange-400" />
                                <div>
                                  <div className="text-[10px] text-[#71717A] uppercase font-bold">Customer</div>
                                  <div className="text-[#FAFAFA] font-semibold">{order.customer?.name || "Unknown"}</div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-blue-400" />
                                <div>
                                  <div className="text-[10px] text-[#71717A] uppercase font-bold">Contact Phone</div>
                                  {order.customer?.phone ? (
                                    <a href={`tel:${order.customer.phone}`} className="text-blue-400 hover:underline font-mono">
                                      {order.customer.phone}
                                    </a>
                                  ) : (
                                    <div className="text-[#71717A]">-</div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-emerald-400" />
                                <div>
                                  <div className="text-[10px] text-[#71717A] uppercase font-bold">Address</div>
                                  <div className="text-[#A1A1AA] truncate max-w-[200px]" title={order.customer?.address || ''}>
                                    {order.customer?.address || "No address on file"}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Section 2: Items Table */}
                            <div className="space-y-2">
                              <div className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider flex items-center gap-2">
                                <ShoppingBag className="w-3.5 h-3.5 text-orange-400" />
                                Reserved Products ({order.items?.length || 0})
                              </div>
                              <div className="border border-[#222227] rounded-xl overflow-hidden">
                                <table className="w-full text-xs text-left">
                                  <thead className="bg-[#18181C] text-[#71717A] border-b border-[#222227]">
                                    <tr>
                                      <th className="p-2.5">Code</th>
                                      <th className="p-2.5">Product</th>
                                      <th className="p-2.5">Size/Variant</th>
                                      <th className="p-2.5 text-right">Qty</th>
                                      <th className="p-2.5 text-right">Price</th>
                                      <th className="p-2.5 text-right">Subtotal</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#222227]/60">
                                    {order.items?.map((item, iIdx) => (
                                      <tr key={iIdx} className="hover:bg-[#18181C]/50">
                                        <td className="p-2.5 font-mono text-orange-400 font-bold">
                                          {item.product?.product_code || "-"}
                                        </td>
                                        <td className="p-2.5 text-[#FAFAFA] font-medium">
                                          {item.product?.name || "Product"}
                                        </td>
                                        <td className="p-2.5 font-mono text-amber-400">
                                          {item.variant_index != null && item.product?.variants
                                            ? item.product.variants[item.variant_index].label
                                            : item.product?.height
                                            ? item.product?.base
                                              ? `H-${item.product.height} B-${item.product.base}`
                                              : `H-${item.product.height}`
                                            : "-"}
                                        </td>
                                        <td className="p-2.5 text-right font-mono font-bold text-orange-400">
                                          {item.quantity}
                                        </td>
                                        <td className="p-2.5 text-right font-mono text-[#A1A1AA]">
                                          ₹{Number(item.selling_price).toLocaleString("en-IN")}
                                        </td>
                                        <td className="p-2.5 text-right font-mono font-bold text-emerald-400">
                                          ₹{Number(item.subtotal).toLocaleString("en-IN")}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Section 3: Financial Summary & Payments */}
                            <div className="bg-[#18181C] p-3 rounded-xl border border-[#222227] flex flex-wrap items-center justify-between gap-4 text-xs">
                              <div className="flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-[#71717A]" />
                                <span className="text-[#71717A] font-medium">Payment History:</span>
                                <div className="flex flex-wrap items-center gap-2">
                                  {order.payments && order.payments.length > 0 ? (
                                    order.payments.map((p, pIdx) => (
                                      <span
                                        key={pIdx}
                                        className="bg-[#121215] border border-[#222227] px-2.5 py-1 rounded-md font-mono text-[11px]"
                                      >
                                        <span className="text-[#A1A1AA] mr-1">{p.payment_type || 'PAYMENT'}:</span>
                                        <span className={p.payment_mode === 'CASH' ? 'text-emerald-400 font-bold' : 'text-blue-400 font-bold'}>
                                          {p.payment_mode} ₹{Number(p.amount).toLocaleString("en-IN")}
                                        </span>
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-[#71717A] italic">No payments recorded</span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-4 font-mono">
                                <div>
                                  <span className="text-[#71717A] text-[10px] block uppercase">Collected</span>
                                  <span className="text-emerald-400 font-bold text-sm">
                                    ₹{paid.toLocaleString("en-IN")}
                                  </span>
                                </div>
                                <div className="border-l border-[#222227] pl-4">
                                  <span className="text-[#71717A] text-[10px] block uppercase">Balance Due</span>
                                  <span className={`font-bold text-sm ${due > 0 ? 'text-amber-400' : 'text-[#A1A1AA]'}`}>
                                    ₹{due.toLocaleString("en-IN")}
                                  </span>
                                </div>
                              </div>
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>

          {/* Footer Page Totals */}
          {orders.length > 0 && (
            <tfoot className="bg-[#0A0A0A] border-t-2 border-[#1F1F1F] font-mono text-xs sticky bottom-0 z-10">
              <tr className="text-[#FAFAFA] font-bold">
                <td colSpan={5} className="p-3.5 text-right uppercase text-[11px] text-[#71717A]">
                  Page Totals ({orders.length} orders)
                </td>
                <td className="p-3.5 text-right text-orange-400 text-sm">
                  ₹{pageSummary.totalAmt.toLocaleString("en-IN")}
                </td>
                <td className="p-3.5">
                  <div className="flex flex-col gap-0.5 text-[11px]">
                    {pageSummary.cash > 0 && <span className="text-emerald-400">CASH: ₹{pageSummary.cash.toLocaleString("en-IN")}</span>}
                    {pageSummary.online > 0 && <span className="text-blue-400">ONL: ₹{pageSummary.online.toLocaleString("en-IN")}</span>}
                    {pageSummary.due > 0 && <span className="text-amber-400 font-bold">DUE: ₹{pageSummary.due.toLocaleString("en-IN")}</span>}
                  </div>
                </td>
                <td className="p-3.5"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
