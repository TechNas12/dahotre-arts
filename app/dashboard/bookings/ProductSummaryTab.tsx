"use client";

import { useState, Fragment, useMemo } from "react";
import { Package, ChevronRight, RefreshCw, Layers, Search, X, Printer } from "lucide-react";
import { BookedProductSummary } from "@/app/actions/bookings";
import { StatusBadge } from "@/app/dashboard/components/ui/StatusBadge";
import { LiveBadge } from "@/app/dashboard/components/LiveBadge";
import { Dropdown } from "@/app/dashboard/components/ui/Dropdown";
import { SearchInput } from "@/app/dashboard/components/SearchInput";

type ProductSummaryTabProps = {
  productsSummary: BookedProductSummary[];
  isConnected: boolean;
  isPending: boolean;
  onPrint?: () => void;
};

export function ProductSummaryTab({
  productsSummary,
  isConnected,
  isPending,
  onPrint,
}: ProductSummaryTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Get unique categories for filter
  const categories = useMemo(() => {
    const cats = new Set<string>();
    productsSummary.forEach(p => {
      if (p.category && p.category !== "-") cats.add(p.category);
    });
    return Array.from(cats);
  }, [productsSummary]);

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return productsSummary.filter(p => {
      const matchesCategory = selectedCategory === "ALL" || p.category === selectedCategory;
      if (!matchesCategory) return false;
      if (!query) return true;

      const matchesProduct = 
        p.name.toLowerCase().includes(query) ||
        p.productCode.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        p.sizeOrVariant.toLowerCase().includes(query);

      const matchesOrders = p.orders.some(o => 
        o.orderNo.toLowerCase().includes(query) ||
        o.customerName.toLowerCase().includes(query) ||
        o.status.toLowerCase().includes(query) ||
        o.fulfillmentStatus.toLowerCase().includes(query)
      );

      return matchesProduct || matchesOrders;
    });
  }, [productsSummary, selectedCategory, searchQuery]);

  const toggleExpandProduct = (key: string) => {
    const next = new Set(expandedProducts);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpandedProducts(next);
  };

  // Grand totals across filtered products
  const grandTotals = useMemo(() => {
    return filteredProducts.reduce(
      (acc, prod) => ({
        qty: acc.qty + prod.totalBookedQty,
        val: acc.val + prod.totalValue,
        paid: acc.paid + prod.totalPaid,
        due: acc.due + prod.totalDue,
      }),
      { qty: 0, val: 0, paid: 0, due: 0 }
    );
  }, [filteredProducts]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top Header / Bar */}
      <div className="p-4 border-b border-[#1F1F1F] bg-[#0A0A0A] shrink-0 flex flex-col gap-3">
        <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <LiveBadge isConnected={isConnected} />
            <div className="w-full md:w-80">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                isPending={isPending}
                placeholder="Search reserved products, codes, customers, sizes..."
              />
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <span className="text-xs text-[#A3A3A3] font-medium hidden lg:flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-orange-400" />
              {filteredProducts.length} items
            </span>
            {categories.length > 0 && (
              <Dropdown
                options={[
                  { id: 'ALL', name: 'All Categories' },
                  ...categories.map((cat) => ({ id: cat, name: cat }))
                ]}
                value={selectedCategory}
                onChange={(val) => setSelectedCategory(val)}
                className="w-44"
                compact
              />
            )}
            {onPrint && (
              <button
                onClick={onPrint}
                className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer shrink-0"
                title="Print Bookings Report"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Print</span>
              </button>
            )}
            {isPending && <RefreshCw className="w-4 h-4 text-orange-500 animate-spin" />}
          </div>
        </div>

        {searchQuery.trim() && (
          <div className="flex items-center justify-between bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded-xl text-xs mt-0.5 animate-[fadeIn_0.2s_ease-out]">
            <div className="flex items-center gap-2 text-orange-400">
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span>Found <strong className="text-[#FAFAFA] font-bold">{filteredProducts.length}</strong> reserved items matching &ldquo;{searchQuery}&rdquo;</span>
            </div>
            <button 
              onClick={() => setSearchQuery("")}
              className="text-orange-400 hover:text-white font-medium flex items-center gap-1 cursor-pointer transition-colors"
              title="Clear Search"
            >
              <X className="w-3.5 h-3.5" /> Clear search
            </button>
          </div>
        )}
      </div>

      {/* ─── MOBILE VIEW: DEDICATED TOUCH-FIRST PRODUCT SUMMARY CARDS ─── */}
      <div className="block md:hidden flex-1 overflow-y-auto custom-scrollbar">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-[#71717A] space-y-3">
            <Package className="w-12 h-12 mx-auto opacity-20 text-[#71717A]" />
            <p className="text-sm font-medium text-[#A1A1AA]">
              {productsSummary.length === 0 ? "No products have active bookings." : "No reserved products match your search."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#1F1F1F]/60 pb-20">
            {filteredProducts.map((prod) => {
              const uniqueKey = `${prod.productId}_${prod.variantIndex ?? 'null'}`;
              const isExpanded = expandedProducts.has(uniqueKey);

              return (
                <div
                  key={uniqueKey}
                  onClick={() => toggleExpandProduct(uniqueKey)}
                  className="p-3.5 hover:bg-[#16161A] active:bg-[#18181D] transition-colors cursor-pointer"
                >
                  {/* Card Header: Product Code + Category + Reserved Quantity */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-lg">
                        {prod.productCode}
                      </span>
                      {prod.category && prod.category !== "-" && (
                        <span className="text-[11px] text-[#A1A1AA] bg-[#18181C] border border-[#222227] px-2 py-0.5 rounded-md">
                          {prod.category}
                        </span>
                      )}
                    </div>

                    <span className="text-xs font-bold font-mono text-orange-400 bg-orange-500/15 border border-orange-500/30 px-2.5 py-0.5 rounded-lg">
                      {prod.totalBookedQty} reserved
                    </span>
                  </div>

                  {/* Product Name & Variant */}
                  <div className="mb-2.5">
                    <div className="text-sm font-semibold text-[#FAFAFA]">
                      {prod.name}
                    </div>
                    {prod.sizeOrVariant && prod.sizeOrVariant !== "-" && (
                      <div className="text-xs font-mono text-amber-400 mt-0.5">
                        Variant: {prod.sizeOrVariant}
                      </div>
                    )}
                  </div>

                  {/* Financials Breakdown */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#1F1F1F]/60 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#71717A] block">Total Value</span>
                      <span className="font-mono font-bold text-[#FAFAFA]">₹{prod.totalValue.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#71717A] block">Collected</span>
                      <span className="font-mono font-bold text-emerald-400">₹{prod.totalPaid.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#71717A] block">Balance</span>
                      <span className={`font-mono font-bold ${prod.totalDue > 0 ? "text-amber-400" : "text-[#71717A]"}`}>
                        ₹{prod.totalDue.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Contributing Bookings Accordion */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-[#222227] space-y-2 animate-[fadeIn_0.15s_ease-out]">
                      <div className="text-[10px] font-bold text-[#71717A] uppercase">
                        Booked by {prod.orders.length} orders:
                      </div>
                      <div className="space-y-1.5">
                        {prod.orders.map((ord) => (
                          <div
                            key={ord.orderId}
                            className="p-2.5 rounded-xl bg-[#18181C] border border-[#222227] flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-mono text-orange-400 font-bold">{ord.orderNo}</div>
                              <div className="text-[#FAFAFA] font-medium">{ord.customerName}</div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="font-mono font-bold text-orange-400 text-xs">Qty {ord.qty}</span>
                              <div className="flex items-center gap-1">
                                <StatusBadge status={ord.status} type="order" />
                                <StatusBadge status={ord.fulfillmentStatus} type="fulfillment" />
                              </div>
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

      {/* ─── DESKTOP VIEW: POWER SUMMARY TABLE ─── */}
      <div className="hidden md:block flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse table">
          <thead className="bg-[#0A0A0A] border-b border-[#1F1F1F] sticky top-0 z-10">
            <tr className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">
              <th className="p-3.5 w-10"></th>
              <th className="p-3.5">Code</th>
              <th className="p-3.5">Product Name</th>
              <th className="p-3.5">Category</th>
              <th className="p-3.5">Size / Variant</th>
              <th className="p-3.5 text-right">Qty Reserved</th>
              <th className="p-3.5 text-right">Total Value</th>
              <th className="p-3.5 text-right">Amount Paid</th>
              <th className="p-3.5 text-right">Balance Due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F1F1F] text-sm">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-[#71717A]">
                  {productsSummary.length === 0 ? "No products have active bookings." : "No reserved products match your search or filter."}
                </td>
              </tr>
            ) : (
              filteredProducts.map((prod) => {
                const uniqueKey = `${prod.productId}_${prod.variantIndex ?? 'null'}`;
                const isExpanded = expandedProducts.has(uniqueKey);

                return (
                  <Fragment key={uniqueKey}>
                    <tr
                      onClick={() => toggleExpandProduct(uniqueKey)}
                      className="hover:bg-[#141414] transition-colors cursor-pointer group"
                    >
                      <td className="p-3.5 text-center text-[#71717A]">
                        <ChevronRight
                          className={`w-4 h-4 transition-transform duration-200 ${
                            isExpanded ? "rotate-90 text-orange-400" : "group-hover:text-[#FAFAFA]"
                          }`}
                        />
                      </td>
                      <td className="p-3.5 font-mono text-xs font-bold text-orange-400">
                        {prod.productCode}
                      </td>
                      <td className="p-3.5 font-medium text-[#FAFAFA]">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-[#71717A]" />
                          {prod.name}
                        </div>
                      </td>
                      <td className="p-3.5 text-xs text-[#A1A1AA]">
                        {prod.category}
                      </td>
                      <td className="p-3.5 text-xs font-mono text-[#A1A1AA]">
                        {prod.sizeOrVariant}
                      </td>
                      <td className="p-3.5 text-right font-bold text-[#FAFAFA]">
                        <span className="bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full text-xs font-mono">
                          {prod.totalBookedQty} pcs
                        </span>
                      </td>
                      <td className="p-3.5 text-right text-[#FAFAFA] font-mono">
                        ₹{prod.totalValue.toLocaleString()}
                      </td>
                      <td className="p-3.5 text-right text-emerald-400 font-medium font-mono">
                        ₹{prod.totalPaid.toLocaleString()}
                      </td>
                      <td className="p-3.5 text-right font-bold font-mono">
                        <span className={prod.totalDue > 0 ? "text-amber-400" : "text-[#71717A]"}>
                          ₹{prod.totalDue.toLocaleString()}
                        </span>
                      </td>
                    </tr>

                    {/* Nested Orders Row */}
                    {isExpanded && (
                      <tr className="bg-[#0D0D0D]">
                        <td colSpan={9} className="p-4 pl-12">
                          <div className="bg-[#111111] rounded-xl border border-[#1F1F1F] p-3">
                            <h4 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider mb-2">
                              Contributing Bookings ({prod.orders.length} orders)
                            </h4>
                            <div className="space-y-1.5">
                              {prod.orders.map((ord) => (
                                <div
                                  key={ord.orderId}
                                  className="flex items-center justify-between p-2 rounded-lg bg-[#161616] text-xs"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="font-mono text-orange-400 font-medium">
                                      {ord.orderNo}
                                    </span>
                                    <span className="text-[#FAFAFA] font-medium">
                                      {ord.customerName}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-[#A1A1AA]">
                                      Qty: <strong className="text-[#FAFAFA] font-mono">{ord.qty}</strong>
                                    </span>
                                    <StatusBadge status={ord.status} type="order" />
                                    <StatusBadge status={ord.fulfillmentStatus} type="fulfillment" />
                                  </div>
                                </div>
                              ))}
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
          {filteredProducts.length > 0 && (
            <tfoot className="bg-[#0D0D0D] border-t-2 border-[#1F1F1F] font-bold text-sm">
              <tr>
                <td colSpan={5} className="p-3.5 text-right text-[#A1A1AA] uppercase text-xs">
                  Summary Totals ({filteredProducts.length} items):
                </td>
                <td className="p-3.5 text-right text-orange-400 font-mono">
                  {grandTotals.qty} pcs
                </td>
                <td className="p-3.5 text-right text-[#FAFAFA] font-mono">
                  ₹{grandTotals.val.toLocaleString()}
                </td>
                <td className="p-3.5 text-right text-emerald-400 font-mono">
                  ₹{grandTotals.paid.toLocaleString()}
                </td>
                <td className="p-3.5 text-right text-amber-400 font-mono">
                  ₹{grandTotals.due.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
