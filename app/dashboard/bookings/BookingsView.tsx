"use client";

import { useState, useActionState, useEffect, useMemo, Fragment, useRef } from "react";
import { createPortal } from "react-dom";
import { Package, Search, Bookmark, List, Download, CreditCard, ChevronRight, RefreshCw, X, Printer } from "lucide-react";
import { StatusBadge } from "@/app/dashboard/components/ui/StatusBadge";
import { Order } from "@/app/actions/orders";
import { BookedProductSummary, searchBookingsAction, listBookedProducts } from "@/app/actions/bookings";
import { TablePagination, PageSize, useTableQueryState } from "@/app/dashboard/components/TablePagination";
import { SearchInput } from "@/app/dashboard/components/SearchInput";
import { LiveBadge } from "@/app/dashboard/components/LiveBadge";
import { useRealtimeTable } from "@/lib/supabase/realtime";
import { useSearchParams } from "next/navigation";
import { BookingsPrintView } from "./BookingsPrintView";

// Optional: import existing UI components if needed (e.g. Dropdown, StatusDropdown, Checkbox, etc.)
// For brevity and independence, we'll keep the Bookings list simple or rely on HTML selects for filters.

type BookingsViewProps = {
  initialProductsSummary: BookedProductSummary[];
  
  initialOrders: Order[];
  totalCount: number;
  
  initialPage: number;
  initialPageSize: number;
  initialSearch: string;
  initialStatus: string;
  initialFulfillment: string;
  initialDateFrom?: string;
  initialDateTo?: string;
  initialPaymentMode: string;
};

export default function BookingsView({
  initialProductsSummary,
  initialOrders,
  totalCount,
  initialPage,
  initialPageSize,
  initialSearch,
  initialStatus,
  initialFulfillment,
  initialDateFrom,
  initialDateTo,
  initialPaymentMode
}: BookingsViewProps) {
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'LIST'>('SUMMARY');
  const [isPending, setIsPending] = useState(false);

  // --- TAB 1: Product Summary State ---
  const [productsSummary, setProductsSummary] = useState<BookedProductSummary[]>(initialProductsSummary);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  
  const refreshSummary = async () => {
    setIsPending(true);
    const data = await listBookedProducts();
    setProductsSummary(data);
    setIsPending(false);
  };

  const toggleExpandProduct = (key: string) => {
    const next = new Set(expandedProducts);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpandedProducts(next);
  };

  // --- TAB 2: Bookings List State ---
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [total, setTotal] = useState(totalCount);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // --- Print State ---
  const [printPageSize, setPrintPageSize] = useState<'A4' | 'A5'>('A4');
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const handlePrint = () => {
    document.documentElement.style.setProperty('--print-page-size', printPageSize);
    window.print();
  };

  const {
    searchQuery, setSearchQuery,
    currentPage, pageSize, updateURL,
    handlePageChange, handlePageSizeChange
  } = useTableQueryState({ 
    initialSearch, 
    initialPage, 
    initialPageSize 
  });

  const [filterStatus, setFilterStatus] = useState(initialStatus);
  const [filterPaymentMode, setFilterPaymentMode] = useState(initialPaymentMode);
  
  const performSearch = async (
    query: string, page: number, size: number, 
    status: string, payMode: string
  ) => {
    setIsPending(true);
    const result = await searchBookingsAction({
      search: query,
      page,
      pageSize: size,
      status,
      paymentMode: payMode
    });
    setOrders(result.data);
    setTotal(result.totalCount);
    setIsPending(false);
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      import("react").then((React) => {
        React.startTransition(() => {
           performSearch(searchQuery, currentPage, pageSize, filterStatus, filterPaymentMode);
        });
      });
    }, 200);
    return () => clearTimeout(handler);
  }, [searchQuery, currentPage, pageSize, filterStatus, filterPaymentMode]);

  const toggleExpandOrder = (id: number) => {
    const next = new Set(expandedRows);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedRows(next);
  };

  // --- REALTIME ---
  const handleRealtimeEvent = () => {
    import("react").then((React) => {
      React.startTransition(() => {
         if (activeTab === 'SUMMARY') refreshSummary();
         if (activeTab === 'LIST') performSearch(searchQuery, currentPage, pageSize, filterStatus, filterPaymentMode);
      });
    });
  };

  const { isConnected: isOrdersLive } = useRealtimeTable('orders', handleRealtimeEvent);
  const { isConnected: isOrderItemsLive } = useRealtimeTable('order_items', handleRealtimeEvent);
  const { isConnected: isPaymentsLive } = useRealtimeTable('payments', handleRealtimeEvent);
  const isConnected = isOrdersLive || isOrderItemsLive || isPaymentsLive;

  // --- TOTALS FOOTER (TAB 2) ---
  const summaryList = useMemo(() => {
    let totalAmt = 0;
    let cash = 0;
    let online = 0;
    orders.forEach(order => {
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
  }, [orders]);

  return (
    <div className="bg-[#111111] border border-[#1F1F1F] rounded-xl flex flex-col h-[calc(100vh-12rem)] shadow-sm overflow-hidden relative">
      
      {/* Tabs */}
      <div className="flex border-b border-[#1F1F1F] bg-[#0A0A0A]">
        <button 
          onClick={() => setActiveTab('SUMMARY')}
          className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'SUMMARY' ? 'text-orange-500 border-b-2 border-orange-500 bg-[#1A1A1A]/50' : 'text-[#737373] hover:text-[#A3A3A3] hover:bg-[#1A1A1A]'}`}
        >
          <Bookmark className="w-4 h-4" />
          Product Summary
        </button>
        <button 
          onClick={() => setActiveTab('LIST')}
          className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'LIST' ? 'text-orange-500 border-b-2 border-orange-500 bg-[#1A1A1A]/50' : 'text-[#737373] hover:text-[#A3A3A3] hover:bg-[#1A1A1A]'}`}
        >
          <List className="w-4 h-4" />
          Bookings List
        </button>
      </div>

      {activeTab === 'SUMMARY' && (
        <div className="flex-1 overflow-auto custom-scrollbar">
          <div className="p-4 border-b border-[#1F1F1F] flex items-center justify-between sticky top-0 bg-[#0A0A0A]/80 z-10 backdrop-blur-sm">
             <div className="flex items-center gap-4">
                <LiveBadge isConnected={isConnected} />
                <span className="text-sm text-[#A3A3A3] font-medium">Grouped by Product</span>
             </div>
             {isPending && <RefreshCw className="w-4 h-4 text-orange-500 animate-spin" />}
          </div>
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0A0A0A] border-b border-[#1F1F1F]">
              <tr className="text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider">
                <th className="p-4 w-10"></th>
                <th className="p-4">Code</th>
                <th className="p-4">Product</th>
                <th className="p-4">Category</th>
                <th className="p-4">Size/Variant</th>
                <th className="p-4 text-right">Qty Booked</th>
                <th className="p-4 text-right">Value</th>
                <th className="p-4 text-right">Paid</th>
                <th className="p-4 text-right">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F1F1F]/50">
              {productsSummary.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-[#737373]">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    No active bookings found.
                  </td>
                </tr>
              ) : (
                productsSummary.map(prod => {
                  const key = `${prod.productId}-${prod.variantIndex ?? 'base'}`;
                  const isExpanded = expandedProducts.has(key);
                  return (
                    <Fragment key={key}>
                      <tr className="hover:bg-[#1A1A1A] transition-colors group cursor-pointer" onClick={() => toggleExpandProduct(key)}>
                        <td className="p-4 text-center">
                          <button className="p-1 text-[#737373] hover:text-[#F5F5F5] hover:bg-[#2A2A2A] rounded transition-all">
                            <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          </button>
                        </td>
                        <td className="p-4 font-mono text-sm font-bold text-[#F5F5F5]">{prod.productCode}</td>
                        <td className="p-4 text-sm font-medium text-[#F5F5F5]">{prod.name}</td>
                        <td className="p-4 text-sm text-[#A3A3A3]">{prod.category}</td>
                        <td className="p-4 text-xs font-mono text-amber-400">{prod.sizeOrVariant}</td>
                        <td className="p-4 text-right font-bold text-orange-400 text-lg">{prod.totalBookedQty}</td>
                        <td className="p-4 text-right font-mono text-sm">₹{prod.totalValue.toLocaleString('en-IN')}</td>
                        <td className="p-4 text-right font-mono text-sm text-green-400">₹{Math.round(prod.totalPaid).toLocaleString('en-IN')}</td>
                        <td className="p-4 text-right font-mono text-sm font-bold text-amber-400">₹{Math.round(prod.totalDue).toLocaleString('en-IN')}</td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-[#1A1A1A]/20">
                          <td colSpan={2}></td>
                          <td colSpan={7} className="p-4 pt-0 pb-4">
                            <div className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg p-3 shadow-inner">
                              <h4 className="text-[10px] font-bold text-[#737373] uppercase mb-3">Orders Booking This Product</h4>
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-[#A3A3A3] border-b border-[#1F1F1F] text-[10px] uppercase tracking-wider">
                                    <th className="pb-2 font-bold text-left">Order No</th>
                                    <th className="pb-2 font-bold text-left">Customer</th>
                                    <th className="pb-2 font-bold text-left">Status</th>
                                    <th className="pb-2 font-bold text-right">Qty</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1F1F1F]/50">
                                  {prod.orders.map((o, idx) => (
                                    <tr key={idx} className="text-[#F5F5F5] hover:bg-[#111111]/80 transition-colors">
                                      <td className="py-2.5 font-mono text-xs">{o.orderNo}</td>
                                      <td className="py-2.5 text-xs">{o.customerName}</td>
                                      <td className="py-2.5">
                                        <StatusBadge status={o.status} />
                                      </td>
                                      <td className="py-2.5 text-right font-bold text-orange-400">{o.qty}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'LIST' && (
        <div className="flex flex-col h-full overflow-hidden">
          {/* Action Bar */}
          <div className="p-4 border-b border-[#1F1F1F] bg-[#0A0A0A] shrink-0 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
             <div className="flex items-center gap-4 w-full sm:w-auto">
               <LiveBadge isConnected={isConnected} />
               <div className="w-full sm:w-64">
                 <SearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    isPending={isPending}
                    placeholder="Search bookings..."
                 />
               </div>
             </div>
             <div className="flex items-center gap-2">
               <select 
                  className="bg-[#111111] border border-[#1F1F1F] text-sm text-[#F5F5F5] outline-none rounded-lg px-3 py-2 cursor-pointer"
                  value={printPageSize}
                  onChange={(e) => setPrintPageSize(e.target.value as 'A4' | 'A5')}
               >
                 <option value="A4">A4 Print</option>
                 <option value="A5">A5 Print</option>
               </select>
               <button
                  onClick={handlePrint}
                  className="ds-btn-primary flex items-center gap-2 h-[38px] px-3"
               >
                 <Printer className="w-4 h-4" />
                 Print
               </button>
               <select 
                  className="bg-[#111111] border border-[#1F1F1F] text-sm text-[#F5F5F5] outline-none rounded-lg px-3 py-2 cursor-pointer"
                  value={filterPaymentMode}
                  onChange={(e) => {
                     setFilterPaymentMode(e.target.value);
                     updateURL({ paymentMode: e.target.value === 'ALL' ? undefined : e.target.value, page: 1 });
                  }}
               >
                 <option value="ALL">All Payments</option>
                 <option value="CASH">Cash</option>
                 <option value="ONLINE">Online</option>
               </select>
               <select 
                  className="bg-[#111111] border border-[#1F1F1F] text-sm text-[#F5F5F5] outline-none rounded-lg px-3 py-2 cursor-pointer"
                  value={filterStatus}
                  onChange={(e) => {
                     setFilterStatus(e.target.value);
                     updateURL({ status: e.target.value === 'ALL' ? undefined : e.target.value, page: 1 });
                  }}
               >
                 <option value="ALL">All Status</option>
                 <option value="PENDING">Pending</option>
                 <option value="COMPLETED">Completed</option>
                 <option value="CANCELLED">Cancelled</option>
               </select>
             </div>
          </div>
          
          <TablePagination
            totalItems={total}
            pageSize={pageSize}
            currentPage={currentPage}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
          
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#0A0A0A]/80 sticky top-0 z-10 backdrop-blur-sm">
                <tr className="border-b border-[#1F1F1F] text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider">
                  <th className="p-4 w-10"></th>
                  <th className="p-4">Order No</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Created By</th>
                  <th className="p-4">Total</th>
                  <th className="p-4">Payments</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F1F1F]/50">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-[#737373]">
                      <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      No bookings found.
                    </td>
                  </tr>
                ) : (
                  orders.map(order => {
                    const isExpanded = expandedRows.has(order.id);
                    const orderDate = new Date(order.order_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
                    
                    return (
                      <Fragment key={order.id}>
                        <tr className="hover:bg-[#1A1A1A] transition-colors cursor-pointer" onClick={() => toggleExpandOrder(order.id)}>
                          <td className="p-4 text-center">
                            <button className="p-1 text-[#737373] hover:text-[#F5F5F5] hover:bg-[#2A2A2A] rounded transition-all">
                              <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            </button>
                          </td>
                          <td className="p-4 font-mono text-sm font-bold text-[#F5F5F5]">{order.order_no}</td>
                          <td className="p-4 text-sm text-[#F5F5F5] font-medium">{order.customer?.name || "Unknown"}</td>
                          <td className="p-4 text-sm text-[#A3A3A3]">{orderDate}</td>
                          <td className="p-4 text-sm font-medium text-[#A3A3A3]">
                             <span className="bg-[#1A1A1A] px-2 py-0.5 rounded text-xs">{order.user?.name || "Unknown"}</span>
                          </td>
                          <td className="p-4 text-sm font-bold text-[#F5F5F5]">₹{order.total_amount}</td>
                          <td className="p-4">
                            {(() => {
                               if (order.status === 'CANCELLED') return <div className="text-xs text-slate-500">-</div>;
                               const total = order.total_amount || 0;
                               const paid = order.payments?.reduce((acc, p) => acc + Number(p.amount), 0) || 0;
                               const cash = order.payments?.filter(p => p.payment_mode === 'CASH').reduce((acc, p) => acc + Number(p.amount), 0) || 0;
                               const online = order.payments?.filter(p => p.payment_mode === 'ONLINE').reduce((acc, p) => acc + Number(p.amount), 0) || 0;
                               const due = total - paid;
                               
                               return (
                                 <div className="flex flex-col gap-1 w-[120px]">
                                   {cash > 0 && <span className="text-[10px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded border border-green-500/20 whitespace-nowrap">💵 Cash ₹{cash}</span>}
                                   {online > 0 && <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20 whitespace-nowrap">📱 Online ₹{online}</span>}
                                   {due > 0 && order.status !== 'CANCELLED' && <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20 whitespace-nowrap">⚠ Due ₹{due}</span>}
                                 </div>
                               );
                            })()}
                          </td>
                          <td className="p-4">
                            <span className={`text-xs px-2 py-1 rounded font-bold ${
                              order.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                              order.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-slate-500/20 text-slate-400'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-900/30">
                            <td colSpan={2}></td>
                            <td colSpan={6} className="p-4 pt-0 pb-4">
                              {/* Omitted full item list for brevity, can be expanded if needed */}
                              <div className="text-xs text-slate-400 p-2 border border-slate-800 rounded bg-slate-950">
                                This order has {order.items?.length || 0} items. View in Orders tab for full details.
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
              {orders.length > 0 && (
                <tfoot className="bg-[#111111]/80 backdrop-blur-sm border-t-2 border-[#1F1F1F]">
                  <tr className="font-bold text-[#F5F5F5]">
                    <td colSpan={5} className="p-4 text-right uppercase text-xs tracking-wider text-[#A3A3A3]">Page Totals</td>
                    <td className="p-4 text-orange-400">₹{summaryList.totalAmt.toLocaleString('en-IN')}</td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1 w-[120px] font-mono text-xs">
                        {summaryList.cash > 0 && <span className="text-green-400">CASH: ₹{summaryList.cash.toLocaleString('en-IN')}</span>}
                        {summaryList.online > 0 && <span className="text-blue-400">ONL: ₹{summaryList.online.toLocaleString('en-IN')}</span>}
                        {summaryList.due > 0 && <span className="text-amber-400">DUE: ₹{summaryList.due.toLocaleString('en-IN')}</span>}
                      </div>
                    </td>
                    <td className="p-4"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
      {isMounted && createPortal(
        <BookingsPrintView 
          orders={orders}
          searchQuery={searchQuery}
          filterStatus={filterStatus}
          filterPaymentMode={filterPaymentMode}
        />,
        document.body
      )}
    </div>
  );
}
