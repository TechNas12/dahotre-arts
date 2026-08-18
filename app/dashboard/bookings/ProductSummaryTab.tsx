"use client";

import { useState, Fragment, useMemo } from "react";
import { Package, ChevronRight, RefreshCw, Layers } from "lucide-react";
import { BookedProductSummary } from "@/app/actions/bookings";
import { StatusBadge } from "@/app/dashboard/components/ui/StatusBadge";
import { LiveBadge } from "@/app/dashboard/components/LiveBadge";

type ProductSummaryTabProps = {
  productsSummary: BookedProductSummary[];
  isConnected: boolean;
  isPending: boolean;
};

export function ProductSummaryTab({
  productsSummary,
  isConnected,
  isPending
}: ProductSummaryTabProps) {
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

  // Filter products by category
  const filteredProducts = useMemo(() => {
    if (selectedCategory === "ALL") return productsSummary;
    return productsSummary.filter(p => p.category === selectedCategory);
  }, [productsSummary, selectedCategory]);

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
      <div className="p-4 border-b border-[#1F1F1F] bg-[#0A0A0A] shrink-0 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <LiveBadge isConnected={isConnected} />
          <span className="text-xs text-[#A3A3A3] font-medium flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-orange-400" />
            Grouped by Reserved Product ({filteredProducts.length} items)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {categories.length > 0 && (
            <select
              className="bg-[#111111] border border-[#1F1F1F] text-xs text-[#F5F5F5] outline-none rounded-lg px-3 py-1.5 cursor-pointer hover:border-[#2A2A2A] transition-colors"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          )}
          {isPending && <RefreshCw className="w-4 h-4 text-orange-500 animate-spin" />}
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#0A0A0A] border-b border-[#1F1F1F] sticky top-0 z-10">
            <tr className="text-[11px] font-bold text-[#737373] uppercase tracking-wider">
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
          <tbody className="divide-y divide-[#1F1F1F]/50 text-sm">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-12 text-center text-[#737373]">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  No reserved products found for active bookings.
                </td>
              </tr>
            ) : (
              filteredProducts.map((prod) => {
                const key = `${prod.productId}-${prod.variantIndex ?? "base"}`;
                const isExpanded = expandedProducts.has(key);
                return (
                  <Fragment key={key}>
                    <tr
                      className={`hover:bg-[#1A1A1A]/80 transition-colors cursor-pointer ${
                        isExpanded ? "bg-[#1A1A1A]/40" : ""
                      }`}
                      onClick={() => toggleExpandProduct(key)}
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
                        {prod.productCode}
                      </td>
                      <td className="p-3.5 font-medium text-[#F5F5F5]">{prod.name}</td>
                      <td className="p-3.5 text-xs text-[#A3A3A3]">
                        <span className="bg-[#1A1A1A] px-2 py-0.5 rounded text-[11px] border border-[#1F1F1F]">
                          {prod.category}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-xs text-amber-400">
                        {prod.sizeOrVariant}
                      </td>
                      <td className="p-3.5 text-right font-bold text-orange-400 text-base font-mono">
                        {prod.totalBookedQty}
                      </td>
                      <td className="p-3.5 text-right font-mono text-xs font-semibold text-[#F5F5F5]">
                        ₹{prod.totalValue.toLocaleString("en-IN")}
                      </td>
                      <td className="p-3.5 text-right font-mono text-xs text-green-400">
                        ₹{Math.round(prod.totalPaid).toLocaleString("en-IN")}
                      </td>
                      <td className="p-3.5 text-right font-mono text-xs font-bold text-amber-400">
                        ₹{Math.round(prod.totalDue).toLocaleString("en-IN")}
                      </td>
                    </tr>

                    {/* Expanded Drawer showing associated orders */}
                    {isExpanded && (
                      <tr className="bg-[#0D0D0D]">
                        <td colSpan={2}></td>
                        <td colSpan={7} className="p-4 pt-1 pb-4">
                          <div className="bg-[#111111] border border-[#1F1F1F] rounded-lg p-3 shadow-inner">
                            <h4 className="text-[10px] font-bold text-[#737373] uppercase tracking-wider mb-2.5 flex items-center justify-between">
                              <span>Orders Reserving This Product ({prod.orders.length})</span>
                              <span className="text-orange-400">Total Qty: {prod.totalBookedQty}</span>
                            </h4>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-[#737373] border-b border-[#1F1F1F] text-[10px] uppercase font-semibold">
                                  <th className="pb-2 text-left">Order No</th>
                                  <th className="pb-2 text-left">Customer</th>
                                  <th className="pb-2 text-left">Status</th>
                                  <th className="pb-2 text-right">Reserved Qty</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#1F1F1F]/40">
                                {prod.orders.map((o, idx) => (
                                  <tr key={idx} className="text-[#F5F5F5] hover:bg-[#1A1A1A]">
                                    <td className="py-2 font-mono font-semibold text-orange-400">
                                      {o.orderNo}
                                    </td>
                                    <td className="py-2">{o.customerName}</td>
                                    <td className="py-2">
                                      <StatusBadge status={o.status} />
                                    </td>
                                    <td className="py-2 text-right font-bold font-mono text-orange-400">
                                      {o.qty}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
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
            <tfoot className="bg-[#0A0A0A] border-t-2 border-[#1F1F1F] font-mono text-xs sticky bottom-0 z-10">
              <tr className="text-[#F5F5F5] font-bold">
                <td colSpan={5} className="p-3.5 text-right uppercase text-[11px] text-[#737373]">
                  Filtered Totals ({filteredProducts.length} items)
                </td>
                <td className="p-3.5 text-right text-orange-400 text-sm font-bold">
                  {grandTotals.qty}
                </td>
                <td className="p-3.5 text-right">
                  ₹{grandTotals.val.toLocaleString("en-IN")}
                </td>
                <td className="p-3.5 text-right text-green-400">
                  ₹{Math.round(grandTotals.paid).toLocaleString("en-IN")}
                </td>
                <td className="p-3.5 text-right text-amber-400 font-bold">
                  ₹{Math.round(grandTotals.due).toLocaleString("en-IN")}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
