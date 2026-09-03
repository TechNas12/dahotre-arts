"use client";

import { useState, useEffect, useRef } from "react";
import { Calendar, X, ChevronDown, Check, Sparkles } from "lucide-react";
import { formatHumanDateRange } from "@/lib/formatDate";
import { createPortal } from "react-dom";

export interface DateRangeFilterProps {
  dateFrom?: string;
  dateTo?: string;
  onChange: (range: { dateFrom?: string; dateTo?: string }) => void;
  compact?: boolean;
  className?: string;
}

export function DateRangeFilter({
  dateFrom = "",
  dateTo = "",
  onChange,
  compact = false,
  className = ""
}: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempFrom, setTempFrom] = useState(dateFrom);
  const [tempTo, setTempTo] = useState(dateTo);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTempFrom(dateFrom);
    setTempTo(dateTo);
  }, [dateFrom, dateTo]);

  // Compute Active Preset
  const getTodayStr = () => new Date().toISOString().slice(0, 10);
  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  };
  const getLast7DaysStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  };
  const getThisMonthStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  };

  const isToday = dateFrom === getTodayStr() && dateTo === getTodayStr();
  const isYesterday = dateFrom === getYesterdayStr() && dateTo === getYesterdayStr();
  const isLast7Days = dateFrom === getLast7DaysStr() && dateTo === getTodayStr();
  const isThisMonth = dateFrom === getThisMonthStr() && dateTo === getTodayStr();
  const isAllTime = !dateFrom && !dateTo;
  const isFiltered = Boolean(dateFrom || dateTo);

  const applyPreset = (preset: "today" | "yesterday" | "last7" | "thisMonth" | "all") => {
    if (preset === "all") {
      onChange({ dateFrom: undefined, dateTo: undefined });
    } else if (preset === "today") {
      const today = getTodayStr();
      onChange({ dateFrom: today, dateTo: today });
    } else if (preset === "yesterday") {
      const yesterday = getYesterdayStr();
      onChange({ dateFrom: yesterday, dateTo: yesterday });
    } else if (preset === "last7") {
      onChange({ dateFrom: getLast7DaysStr(), dateTo: getTodayStr() });
    } else if (preset === "thisMonth") {
      onChange({ dateFrom: getThisMonthStr(), dateTo: getTodayStr() });
    }
    setIsOpen(false);
  };

  const handleApplyCustom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onChange({
      dateFrom: tempFrom || undefined,
      dateTo: tempTo || undefined
    });
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTempFrom("");
    setTempTo("");
    onChange({ dateFrom: undefined, dateTo: undefined });
    setIsOpen(false);
  };

  const toggleOpen = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 6,
        left: Math.max(8, rect.left + window.scrollX - 140),
        width: 320
      });
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (buttonRef.current?.contains(e.target as Node)) return;
      if (popoverRef.current?.contains(e.target as Node)) return;
      setIsOpen(false);
    };
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const activeLabel = formatHumanDateRange(dateFrom, dateTo);

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        className={`inline-flex items-center gap-2 rounded-xl transition-all duration-200 border cursor-pointer select-none ds-focus ${
          compact ? "py-1.5 px-3 text-xs" : "py-2 px-3.5 text-sm"
        } ${
          isFiltered
            ? "bg-orange-500/10 border-orange-500/30 text-orange-300 hover:bg-orange-500/15 shadow-[0_0_12px_rgba(249,115,22,0.15)]"
            : "bg-[#18181C] hover:bg-[#202026] border-[#222227] hover:border-[#2E2E36] text-[#A1A1AA] hover:text-[#FAFAFA]"
        }`}
      >
        <Calendar className={`w-3.5 h-3.5 ${isFiltered ? "text-orange-400" : "text-[#71717A]"}`} />
        <span className="font-medium truncate max-w-[190px]">
          {activeLabel}
        </span>
        {isFiltered && (
          <span 
            onClick={handleClear}
            className="p-0.5 -mr-1 rounded-md hover:bg-orange-500/20 text-orange-400/80 hover:text-orange-300 transition-colors"
            title="Clear date filter"
          >
            <X className="w-3 h-3" />
          </span>
        )}
        {!isFiltered && (
          <ChevronDown className={`w-3.5 h-3.5 text-[#71717A] transition-transform duration-200 ${isOpen ? "rotate-180 text-orange-400" : ""}`} />
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && typeof document !== "undefined" ? createPortal(
        <div
          ref={popoverRef}
          style={{ top: coords.top, left: coords.left, width: coords.width }}
          className="ds-dropdown p-3 space-y-3 z-[99999] shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/[0.1] bg-[#141418]/98"
        >
          {/* Quick Presets */}
          <div>
            <div className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider mb-1.5 px-1 flex items-center justify-between">
              <span>Quick Presets</span>
              <Sparkles className="w-3 h-3 text-orange-400/70" />
            </div>
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => applyPreset("all")}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all text-center ${
                  isAllTime ? "bg-orange-500/20 text-orange-300 border border-orange-500/30" : "bg-[#1C1C22] text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#24242C]"
                }`}
              >
                All Time
              </button>
              <button
                type="button"
                onClick={() => applyPreset("today")}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all text-center ${
                  isToday ? "bg-orange-500/20 text-orange-300 border border-orange-500/30" : "bg-[#1C1C22] text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#24242C]"
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => applyPreset("yesterday")}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all text-center ${
                  isYesterday ? "bg-orange-500/20 text-orange-300 border border-orange-500/30" : "bg-[#1C1C22] text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#24242C]"
                }`}
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => applyPreset("last7")}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all text-center ${
                  isLast7Days ? "bg-orange-500/20 text-orange-300 border border-orange-500/30" : "bg-[#1C1C22] text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#24242C]"
                }`}
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => applyPreset("thisMonth")}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all text-center col-span-2 ${
                  isThisMonth ? "bg-orange-500/20 text-orange-300 border border-orange-500/30" : "bg-[#1C1C22] text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#24242C]"
                }`}
              >
                This Month
              </button>
            </div>
          </div>

          <div className="h-px bg-[#26262E]" />

          {/* Custom Date Inputs */}
          <form onSubmit={handleApplyCustom} className="space-y-2">
            <div className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider px-1">
              Custom Date Range
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-[#A1A1AA] block mb-1 font-medium">From</label>
                <input
                  type="date"
                  value={tempFrom}
                  onChange={(e) => setTempFrom(e.target.value)}
                  className="w-full bg-[#121216] border border-[#2B2B34] text-xs text-[#FAFAFA] rounded-lg px-2 py-1.5 outline-none focus:border-orange-500/70"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#A1A1AA] block mb-1 font-medium">To</label>
                <input
                  type="date"
                  value={tempTo}
                  onChange={(e) => setTempTo(e.target.value)}
                  className="w-full bg-[#121216] border border-[#2B2B34] text-xs text-[#FAFAFA] rounded-lg px-2 py-1.5 outline-none focus:border-orange-500/70"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => applyPreset("all")}
                className="flex-1 py-1.5 px-3 rounded-lg text-xs font-medium bg-[#1C1C22] hover:bg-[#26262E] text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
              >
                Reset
              </button>
              <button
                type="submit"
                className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white shadow-sm transition-all active:scale-95"
              >
                Apply Range
              </button>
            </div>
          </form>
        </div>,
        document.body
      ) : null}
    </div>
  );
}
