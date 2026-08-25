"use client";

import { useState, useTransition } from "react";
import {
  Printer,
  X,
  Package,
  ListOrdered,
  Calendar,
  Layers,
  ArrowUpDown,
  FileText,
  CheckCircle2,
  Info,
  Loader2,
} from "lucide-react";
import { Order } from "@/app/actions/orders";
import { BookedProductSummary, fetchBookingsForPrintAction } from "@/app/actions/bookings";
import { BookingsPrintConfig, PrintReportType } from "./BookingsPrintView";

type BookingsPrintModalProps = {
  isOpen: boolean;
  onClose: () => void;
  productsSummary: BookedProductSummary[];
  currentDateFrom?: string;
  currentDateTo?: string;
  currentStatus?: string;
  currentPaymentMode?: string;
  currentFulfillment?: string;
  currentSearch?: string;
  onExecutePrint: (config: BookingsPrintConfig, printOrders: Order[]) => void;
};

export function BookingsPrintModal({
  isOpen,
  onClose,
  productsSummary,
  currentDateFrom = "",
  currentDateTo = "",
  currentStatus = "ALL",
  currentPaymentMode = "ALL",
  currentFulfillment = "ALL",
  currentSearch = "",
  onExecutePrint,
}: BookingsPrintModalProps) {
  const [reportType, setReportType] = useState<PrintReportType>("BOOKINGS");
  const [dateFrom, setDateFrom] = useState<string>(currentDateFrom);
  const [dateTo, setDateTo] = useState<string>(currentDateTo);
  const [groupByDate, setGroupByDate] = useState<boolean>(true);
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const [pageSize, setPageSize] = useState<"A4" | "A5">("A4");
  const [activePreset, setActivePreset] = useState<"today" | "week" | "month" | "all" | "custom">(() => {
    if (!currentDateFrom && !currentDateTo) return "all";
    return "custom";
  });

  const [isLoading, startTransition] = useTransition();

  if (!isOpen) return null;

  // Preset Date Range Handlers
  const handlePresetSelect = (preset: "today" | "week" | "month" | "all") => {
    setActivePreset(preset);
    const today = new Date().toISOString().slice(0, 10);

    if (preset === "today") {
      setDateFrom(today);
      setDateTo(today);
    } else if (preset === "week") {
      const now = new Date();
      const dayOfWeek = (now.getDay() + 6) % 7; // Monday as start of week
      const monday = new Date(now);
      monday.setDate(now.getDate() - dayOfWeek);
      setDateFrom(monday.toISOString().slice(0, 10));
      setDateTo(today);
    } else if (preset === "month") {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      setDateFrom(monthStart);
      setDateTo(today);
    } else if (preset === "all") {
      setDateFrom("");
      setDateTo("");
    }
  };

  const handleCustomDateChange = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
    setActivePreset("custom");
  };

  const handlePrintSubmit = () => {
    startTransition(async () => {
      const config: BookingsPrintConfig = {
        reportType,
        dateFrom: reportType === "BOOKINGS" ? dateFrom : undefined,
        dateTo: reportType === "BOOKINGS" ? dateTo : undefined,
        groupByDate: reportType === "BOOKINGS" ? groupByDate : false,
        sortOrder,
        pageSize,
      };

      let printOrders: Order[] = [];

      if (reportType === "BOOKINGS") {
        printOrders = await fetchBookingsForPrintAction({
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          status: currentStatus,
          fulfillment: currentFulfillment,
          paymentMode: currentPaymentMode,
          search: currentSearch,
        });
      }

      onExecutePrint(config, printOrders);
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-[fadeIn_0.15s_ease-out]">
      <div
        className="bg-[#121215] border border-[#26262E] text-[#FAFAFA] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#222227] flex items-center justify-between bg-[#151519] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-500/15 border border-orange-500/30 rounded-xl text-orange-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#FAFAFA] leading-tight">
                Print Bookings Report
              </h2>
              <p className="text-xs text-[#8E8E93] mt-0.5">
                Configure your report layout, date range, and sorting options
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#222227] transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          {/* ─── SECTION 1: REPORT TYPE ─── */}
          <div>
            <label className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-orange-400" />
              1. Select Report Type
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option A: Booked Products List */}
              <button
                type="button"
                onClick={() => setReportType("PRODUCTS")}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                  reportType === "PRODUCTS"
                    ? "bg-orange-500/10 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.15)] ring-1 ring-orange-500/50"
                    : "bg-[#18181C] border-[#26262E] hover:border-[#383842] text-[#A1A1AA]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Package
                        className={`w-4 h-4 ${
                          reportType === "PRODUCTS" ? "text-orange-400" : "text-[#71717A]"
                        }`}
                      />
                      <span className="text-xs font-bold text-[#FAFAFA]">
                        Booked Products List
                      </span>
                    </div>
                    {reportType === "PRODUCTS" && (
                      <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-[#8E8E93] leading-relaxed">
                    Product code, name, variant, and total reserved quantity.
                  </p>
                </div>
                <div className="mt-3 text-[10px] font-mono text-orange-400/80 bg-[#121215] px-2 py-0.5 rounded border border-[#222227] w-fit">
                  {productsSummary.length} products
                </div>
              </button>

              {/* Option B: Bookings List (Full Orders) */}
              <button
                type="button"
                onClick={() => setReportType("BOOKINGS")}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                  reportType === "BOOKINGS"
                    ? "bg-orange-500/10 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.15)] ring-1 ring-orange-500/50"
                    : "bg-[#18181C] border-[#26262E] hover:border-[#383842] text-[#A1A1AA]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <ListOrdered
                        className={`w-4 h-4 ${
                          reportType === "BOOKINGS" ? "text-orange-400" : "text-[#71717A]"
                        }`}
                      />
                      <span className="text-xs font-bold text-[#FAFAFA]">
                        Bookings List (Orders)
                      </span>
                    </div>
                    {reportType === "BOOKINGS" && (
                      <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-[#8E8E93] leading-relaxed">
                    Order ID, products, customer name, contact phone, and dues.
                  </p>
                </div>
                <div className="mt-3 text-[10px] font-mono text-orange-400/80 bg-[#121215] px-2 py-0.5 rounded border border-[#222227] w-fit">
                  Full records
                </div>
              </button>
            </div>
          </div>

          {/* ─── SECTION 2: DATE RANGE ─── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-orange-400" />
                2. Date Range
              </label>

              {reportType === "PRODUCTS" && (
                <span className="text-[11px] text-amber-400/90 font-medium flex items-center gap-1">
                  <Info className="w-3 h-3" /> Not applicable
                </span>
              )}
            </div>

            {reportType === "PRODUCTS" ? (
              <div className="bg-[#18181C]/50 border border-[#26262E] rounded-xl p-3 text-xs text-[#71717A] flex items-center gap-2.5">
                <Info className="w-4 h-4 text-[#8E8E93] shrink-0" />
                <span>
                  The Booked Products List report summarizes all currently active bookings across the inventory. Date filtering is disabled.
                </span>
              </div>
            ) : (
              <div className="space-y-2.5 bg-[#18181C] p-3 rounded-xl border border-[#26262E]">
                {/* Preset Chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: "today", label: "Today" },
                    { id: "week", label: "This Week" },
                    { id: "month", label: "This Month" },
                    { id: "all", label: "All Time" },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handlePresetSelect(preset.id as any)}
                      className={`text-xs px-3 py-1 rounded-lg border transition-all cursor-pointer font-medium ${
                        activePreset === preset.id
                          ? "bg-orange-500/20 border-orange-500 text-orange-400 font-bold"
                          : "bg-[#121215] border-[#2E2E36] text-[#A1A1AA] hover:text-[#FAFAFA]"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Date Inputs */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-1">
                  <div className="flex items-center gap-1.5 bg-[#121215] border border-[#2E2E36] rounded-lg px-2.5 py-1.5 flex-1 text-xs">
                    <span className="text-[#71717A] font-medium">From:</span>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => handleCustomDateChange(e.target.value, dateTo)}
                      className="bg-transparent text-xs text-[#FAFAFA] outline-none [color-scheme:dark] w-full cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 bg-[#121215] border border-[#2E2E36] rounded-lg px-2.5 py-1.5 flex-1 text-xs">
                    <span className="text-[#71717A] font-medium">To:</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => handleCustomDateChange(dateFrom, e.target.value)}
                      className="bg-transparent text-xs text-[#FAFAFA] outline-none [color-scheme:dark] w-full cursor-pointer"
                    />
                  </div>

                  {(dateFrom || dateTo) && (
                    <button
                      type="button"
                      onClick={() => handlePresetSelect("all")}
                      className="text-xs text-[#8E8E93] hover:text-orange-400 px-2 py-1 transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ─── SECTION 3: GROUPING & SORTING ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Group by Date */}
            <div>
              <label className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-orange-400" />
                3. Grouping
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  reportType === "PRODUCTS"
                    ? "opacity-50 pointer-events-none bg-[#18181C]/40 border-[#222227]"
                    : groupByDate
                    ? "bg-orange-500/10 border-orange-500/40 text-[#FAFAFA]"
                    : "bg-[#18181C] border-[#26262E] text-[#A1A1AA]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={reportType === "BOOKINGS" && groupByDate}
                  disabled={reportType === "PRODUCTS"}
                  onChange={(e) => setGroupByDate(e.target.checked)}
                  className="mt-0.5 accent-orange-500 w-4 h-4 rounded cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold block text-[#FAFAFA]">
                    Group by Date
                  </span>
                  <span className="text-[11px] text-[#8E8E93] block mt-0.5">
                    Separates records with date headers & daily subtotals.
                  </span>
                </div>
              </label>
            </div>

            {/* Sort Order */}
            <div>
              <label className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-orange-400" />
                4. Sort Order
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSortOrder("DESC")}
                  className={`p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    sortOrder === "DESC"
                      ? "bg-orange-500/15 border-orange-500 text-orange-400 font-bold"
                      : "bg-[#18181C] border-[#26262E] text-[#8E8E93] hover:text-[#FAFAFA]"
                  }`}
                >
                  <span>Descending</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSortOrder("ASC")}
                  className={`p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    sortOrder === "ASC"
                      ? "bg-orange-500/15 border-orange-500 text-orange-400 font-bold"
                      : "bg-[#18181C] border-[#26262E] text-[#8E8E93] hover:text-[#FAFAFA]"
                  }`}
                >
                  <span>Ascending</span>
                </button>
              </div>
            </div>
          </div>

          {/* ─── SECTION 4: PAGE FORMAT ─── */}
          <div>
            <label className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5 text-orange-400" />
              5. Page Format
            </label>

            <div className="grid grid-cols-2 gap-2 bg-[#18181C] p-1.5 rounded-xl border border-[#26262E]">
              <button
                type="button"
                onClick={() => setPageSize("A4")}
                className={`py-2 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  pageSize === "A4"
                    ? "bg-[#2A2A32] text-orange-400 font-bold shadow-sm"
                    : "text-[#8E8E93] hover:text-[#FAFAFA]"
                }`}
              >
                <span>A4 (Standard)</span>
              </button>

              <button
                type="button"
                onClick={() => setPageSize("A5")}
                className={`py-2 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  pageSize === "A5"
                    ? "bg-[#2A2A32] text-orange-400 font-bold shadow-sm"
                    : "text-[#8E8E93] hover:text-[#FAFAFA]"
                }`}
              >
                <span>A5 (Compact)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[#222227] bg-[#151519] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#A1A1AA] hover:text-[#FAFAFA] bg-[#1E1E24] hover:bg-[#282832] transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handlePrintSubmit}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 shadow-md shadow-orange-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Preparing Print...</span>
              </>
            ) : (
              <>
                <Printer className="w-4 h-4" />
                <span>Print Report</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
