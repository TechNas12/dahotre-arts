"use client";

import { useState, useMemo, Fragment } from "react";
import { Package, ChevronRight, Printer, Phone, User, MapPin, CreditCard, ShoppingBag, AlertCircle } from "lucide-react";
import { Order } from "@/app/actions/orders";
import { StatusBadge } from "@/app/dashboard/components/ui/StatusBadge";
import { TablePagination, PageSize } from "@/app/dashboard/components/TablePagination";
import { SearchInput } from "@/app/dashboard/components/SearchInput";
import { LiveBadge } from "@/app/dashboard/components/LiveBadge";

type BookingsListTabProps = {
  orders: Order[];
  total: number;
  currentPage: number;
  pageSize: PageSize;
  searchQuery: string;
  filterStatus: string;
  filterPaymentMode: string;
  filterFulfillment: string;
  printPageSize: 'A4' | 'A5';
  isConnected: boolean;
  isPending: boolean;
  onSearchChange: (q: string) => void;
  onStatusChange: (s: string) => void;
  onPaymentModeChange: (p: string) => void;
  onFulfillmentChange: (f: string) => void;
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
  printPageSize,
  isConnected,
  isPending,
  onSearchChange,
  onStatusChange,
  onPaymentModeChange,
  onFulfillmentChange,
  onPrintPageSizeChange,
  onPrint,
  onPageChange,
  onPageSizeChange,
}: BookingsListTabProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

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
      <div className="p-4 border-b border-[#1F1F1F] bg-[#0A0A0A] shrink-0 flex flex-col md:flex-row gap-3 justify-between items-start md:items-center">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <LiveBadge isConnected={isConnected} />
          <div className="w-full md:w-72">
            <SearchInput
              value={searchQuery}
              onChange={onSearchChange}
              isPending={isPending}
              placeholder="Search order no, customer, phone..."
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Payment Mode Filter */}
          <select
            className="bg-[#111111] border border-[#1F1F1F] text-xs text-[#F5F5F5] outline-none rounded-lg px-2.5 py-2 cursor-pointer hover:border-[#2A2A2A] transition-colors"
            value={filterPaymentMode}
            onChange={(e) => onPaymentModeChange(e.target.value)}
          >
            <option value="ALL">All Payments</option>
            <option value="CASH">Cash</option>
            <option value="ONLINE">Online</option>
          </select>

          {/* Status Filter */}
          <select
            className="bg-[#111111] border border-[#1F1F1F] text-xs text-[#F5F5F5] outline-none rounded-lg px-2.5 py-2 cursor-pointer hover:border-[#2A2A2A] transition-colors"
            value={filterStatus}
            onChange={(e) => onStatusChange(e.target.value)}
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* Fulfillment Filter */}
          <select
            className="bg-[#111111] border border-[#1F1F1F] text-xs text-[#F5F5F5] outline-none rounded-lg px-2.5 py-2 cursor-pointer hover:border-[#2A2A2A] transition-colors"
            value={filterFulfillment}
            onChange={(e) => onFulfillmentChange(e.target.value)}
          >
            <option value="ALL">All Fulfillment</option>
            <option value="UNFULFILLED">Unfulfilled</option>
            <option value="FULFILLED">Fulfilled</option>
          </select>

          {/* Print controls */}
          <div className="flex items-center gap-1 bg-[#111111] border border-[#1F1F1F] rounded-lg p-0.5">
            <select
              className="bg-transparent text-xs text-[#A3A3A3] outline-none px-2 py-1 cursor-pointer font-medium"
              value={printPageSize}
              onChange={(e) => onPrintPageSizeChange(e.target.value as 'A4' | 'A5')}
            >
              <option value="A4">A4</option>
              <option value="A5">A5</option>
            </select>
            <button
              onClick={onPrint}
              className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors shadow-sm"
              title="Print Bookings List"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Pagination Bar */}
      <TablePagination
        totalItems={total}
        pageSize={pageSize}
        currentPage={currentPage}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />

      {/* Bookings Table */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#0A0A0A] border-b border-[#1F1F1F] sticky top-0 z-10">
            <tr className="text-[11px] font-bold text-[#737373] uppercase tracking-wider">
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
                <td colSpan={8} className="p-12 text-center text-[#737373]">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
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
                      className={`hover:bg-[#1A1A1A]/80 transition-colors cursor-pointer ${
                        isExpanded ? "bg-[#1A1A1A]/40" : ""
                      }`}
                      onClick={() => toggleExpandOrder(order.id)}
                    >
                      <td className="p-3.5 text-center">
                        <button className="p-1 text-[#737373] hover:text-[#F5F5F5] hover:bg-[#2A2A2A] rounded transition-all">
                          <ChevronRight
                            className={`w-4 h-4 transition-transform duration-200 ${
                              isExpanded ? "rotate-90 text-orange-400" : ""
                            }`}
                          />
                        </button>
                      </td>
                      <td className="p-3.5 font-mono text-xs font-bold text-[#F5F5F5]">
                        {order.order_no}
                      </td>
                      <td className="p-3.5">
                        <div className="font-medium text-[#F5F5F5]">{order.customer?.name || "Unknown"}</div>
                        {order.customer?.phone && (
                          <div className="text-xs font-mono text-[#737373] flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-[#A3A3A3]" />
                            {order.customer.phone}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-xs text-[#A3A3A3] whitespace-nowrap">{orderDate}</td>
                      <td className="p-3.5 text-xs text-[#A3A3A3]">
                        <span className="bg-[#1A1A1A] px-2 py-0.5 rounded text-[11px] border border-[#1F1F1F]">
                          {order.user?.name || "Staff"}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono text-sm font-bold text-[#F5F5F5]">
                        ₹{totalAmt.toLocaleString("en-IN")}
                      </td>
                      <td className="p-3.5">
                        {order.status === "CANCELLED" ? (
                          <span className="text-xs text-slate-500">-</span>
                        ) : (
                          <div className="flex flex-col gap-1 w-[130px]">
                            {cash > 0 && (
                              <span className="text-[10px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded border border-green-500/20 font-mono">
                                💵 Cash ₹{cash.toLocaleString("en-IN")}
                              </span>
                            )}
                            {online > 0 && (
                              <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20 font-mono">
                                📱 Online ₹{online.toLocaleString("en-IN")}
                              </span>
                            )}
                            {due > 0 ? (
                              <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20 font-mono">
                                ⚠ Due ₹{due.toLocaleString("en-IN")}
                              </span>
                            ) : (
                              <span className="text-[10px] text-green-400 font-semibold">Fully Paid</span>
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
                      <tr className="bg-[#0D0D0D]">
                        <td colSpan={2}></td>
                        <td colSpan={6} className="p-4 pt-1 pb-4">
                          <div className="bg-[#111111] border border-[#1F1F1F] rounded-xl p-4 space-y-4 shadow-inner">
                            
                            {/* Drawer Header */}
                            <div className="flex items-center justify-between pb-3 border-b border-[#1F1F1F]">
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-bold font-mono text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded border border-orange-500/20">
                                  {order.order_no}
                                </span>
                                <span className="text-xs text-[#A3A3A3]">
                                  Placed on {new Date(order.order_date).toLocaleString("en-IN")}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <StatusBadge status={order.fulfillment_status} type="fulfillment" />
                                <StatusBadge status={order.status} />
                              </div>
                            </div>

                            {/* Section 1: Customer Contact Info */}
                            <div className="bg-[#0A0A0A] p-3 rounded-lg border border-[#1F1F1F] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-orange-400" />
                                <div>
                                  <div className="text-[10px] text-[#737373] uppercase font-bold">Customer</div>
                                  <div className="text-[#F5F5F5] font-semibold">{order.customer?.name || "Unknown"}</div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-blue-400" />
                                <div>
                                  <div className="text-[10px] text-[#737373] uppercase font-bold">Contact Phone</div>
                                  {order.customer?.phone ? (
                                    <a href={`tel:${order.customer.phone}`} className="text-blue-400 hover:underline font-mono">
                                      {order.customer.phone}
                                    </a>
                                  ) : (
                                    <div className="text-[#737373]">-</div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-green-400" />
                                <div>
                                  <div className="text-[10px] text-[#737373] uppercase font-bold">Address</div>
                                  <div className="text-[#A3A3A3] truncate max-w-[200px]" title={order.customer?.address || ''}>
                                    {order.customer?.address || "No address on file"}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Section 2: Reserved Items Table */}
                            <div>
                              <h4 className="text-[10px] font-bold text-[#737373] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <ShoppingBag className="w-3.5 h-3.5 text-orange-400" />
                                Reserved Products / Items ({order.items?.length || 0})
                              </h4>
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-[#737373] border-b border-[#1F1F1F] text-[10px] uppercase font-semibold">
                                    <th className="pb-1.5 text-left">Product Name</th>
                                    <th className="pb-1.5 text-left">Variant / Size</th>
                                    <th className="pb-1.5 text-right">Price</th>
                                    <th className="pb-1.5 text-right">Qty</th>
                                    <th className="pb-1.5 text-right">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1F1F1F]/40">
                                  {order.items?.map((item, idx) => {
                                    const prod = item.product;
                                    let variantLabel = "Base Item";
                                    if (item.variant_index != null && prod?.variants && (prod.variants as any[])[item.variant_index]) {
                                      variantLabel = (prod.variants as any[])[item.variant_index].label;
                                    } else if (prod?.height) {
                                      variantLabel = prod.base ? `H-${prod.height} B-${prod.base}` : `H-${prod.height}`;
                                    }

                                    return (
                                      <tr key={idx} className="text-[#F5F5F5]">
                                        <td className="py-2 font-medium">{prod?.name || "Unknown Product"}</td>
                                        <td className="py-2 text-amber-400 font-mono text-[11px]">{variantLabel}</td>
                                        <td className="py-2 text-right font-mono text-[#A3A3A3]">
                                          ₹{(item.selling_price || 0).toLocaleString("en-IN")}
                                        </td>
                                        <td className="py-2 text-right font-bold text-orange-400 font-mono">{item.quantity}</td>
                                        <td className="py-2 text-right font-mono font-bold text-[#F5F5F5]">
                                          ₹{(item.subtotal || 0).toLocaleString("en-IN")}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {/* Section 3: Payments & Balance breakdown */}
                            <div className="pt-3 border-t border-[#1F1F1F] flex flex-wrap items-center justify-between gap-3 text-xs">
                              <div className="flex items-center gap-3">
                                <CreditCard className="w-4 h-4 text-[#737373]" />
                                <span className="text-[#737373] font-medium">Payment History:</span>
                                <div className="flex flex-wrap items-center gap-2">
                                  {order.payments && order.payments.length > 0 ? (
                                    order.payments.map((p, pIdx) => (
                                      <span
                                        key={pIdx}
                                        className="bg-[#0A0A0A] border border-[#1F1F1F] px-2.5 py-1 rounded font-mono text-[11px]"
                                      >
                                        <span className="text-[#A3A3A3] mr-1">{p.payment_type || 'PAYMENT'}:</span>
                                        <span className={p.payment_mode === 'CASH' ? 'text-green-400 font-bold' : 'text-blue-400 font-bold'}>
                                          {p.payment_mode} ₹{Number(p.amount).toLocaleString("en-IN")}
                                        </span>
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-[#737373] italic">No payments recorded</span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-4 font-mono">
                                <div>
                                  <span className="text-[#737373] text-[10px] block uppercase">Collected</span>
                                  <span className="text-green-400 font-bold text-sm">
                                    ₹{paid.toLocaleString("en-IN")}
                                  </span>
                                </div>
                                <div className="border-l border-[#1F1F1F] pl-4">
                                  <span className="text-[#737373] text-[10px] block uppercase">Balance Due</span>
                                  <span className={`font-bold text-sm ${due > 0 ? 'text-amber-400' : 'text-[#A3A3A3]'}`}>
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
              <tr className="text-[#F5F5F5] font-bold">
                <td colSpan={5} className="p-3.5 text-right uppercase text-[11px] text-[#737373]">
                  Page Totals ({orders.length} orders)
                </td>
                <td className="p-3.5 text-right text-orange-400 text-sm">
                  ₹{pageSummary.totalAmt.toLocaleString("en-IN")}
                </td>
                <td className="p-3.5">
                  <div className="flex flex-col gap-0.5 text-[11px]">
                    {pageSummary.cash > 0 && <span className="text-green-400">CASH: ₹{pageSummary.cash.toLocaleString("en-IN")}</span>}
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
