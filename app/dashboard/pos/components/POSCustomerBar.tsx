"use client";

import { useState, useRef, useEffect } from "react";
import {
  User,
  UserCheck,
  UserPlus,
  Search,
  RotateCcw,
  X,
  Check,
  Phone,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { POSCustomerSelection } from "../types";

type POSCustomerBarProps = {
  selectedCustomer: POSCustomerSelection;
  onOpenCustomerModal: () => void;
  onSetWalkIn: () => void;
  onSelectCustomer: (selection: POSCustomerSelection) => void;
};

export default function POSCustomerBar({
  selectedCustomer,
  onOpenCustomerModal,
  onSetWalkIn,
  onSelectCustomer,
}: POSCustomerBarProps) {
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickPhone, setQuickPhone] = useState("");
  const [quickName, setQuickName] = useState("");
  const [quickCity, setQuickCity] = useState("");
  const [showMoreFields, setShowMoreFields] = useState(false);
  const [quickError, setQuickError] = useState("");

  const phoneInputRef = useRef<HTMLInputElement>(null);

  const isWalkIn = selectedCustomer.type === "WALK_IN";
  const isExisting = selectedCustomer.type === "EXISTING" && selectedCustomer.customer;
  const isNew = selectedCustomer.type === "NEW";

  useEffect(() => {
    if (isQuickAddOpen) {
      phoneInputRef.current?.focus();
    }
  }, [isQuickAddOpen]);

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim() || !quickPhone.trim()) {
      setQuickError("Both Phone and Name are required.");
      return;
    }

    onSelectCustomer({
      type: "NEW",
      name: quickName.trim(),
      phone: quickPhone.trim(),
      email: "",
      address: quickCity.trim(),
    });

    setIsQuickAddOpen(false);
    setQuickName("");
    setQuickPhone("");
    setQuickCity("");
    setQuickError("");
    setShowMoreFields(false);
  };

  return (
    <div className="bg-[#121215] border-b border-[#222227] shrink-0 rounded-t-2xl transition-all">
      {/* Main Bar */}
      <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
        {/* Customer Info Badge */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
              isExisting
                ? "bg-green-500/10 text-green-400 border-green-500/25"
                : isNew
                ? "bg-blue-500/10 text-blue-400 border-blue-500/25"
                : "bg-orange-500/10 text-orange-400 border-orange-500/25"
            }`}
          >
            {isExisting ? (
              <UserCheck className="w-4 h-4" />
            ) : isNew ? (
              <UserPlus className="w-4 h-4" />
            ) : (
              <User className="w-4 h-4" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#FAFAFA] truncate">
                {isExisting
                  ? selectedCustomer.customer!.name
                  : isNew
                  ? selectedCustomer.name || "New Customer"
                  : "Walk-in Customer"}
              </span>
              {isExisting ? (
                <span className="text-[10px] bg-green-500/15 text-green-400 font-semibold px-1.5 py-0.2 rounded border border-green-500/20">
                  Saved
                </span>
              ) : isNew ? (
                <span className="text-[10px] bg-blue-500/15 text-blue-400 font-semibold px-1.5 py-0.2 rounded border border-blue-500/20">
                  New
                </span>
              ) : null}
            </div>

            <p className="text-[11px] text-[#A1A1AA] truncate">
              {isExisting
                ? selectedCustomer.customer!.phone || "No phone"
                : isNew
                ? selectedCustomer.phone || "Details pending"
                : "Quick / Cash Sale (No Customer Info)"}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {!isWalkIn && (
            <button
              type="button"
              onClick={onSetWalkIn}
              className="p-1.5 text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#1E1E24] rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1"
              title="Switch back to Walk-in Customer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Walk-in</span>
            </button>
          )}

          {/* Quick Add Button */}
          <button
            type="button"
            onClick={() => {
              setIsQuickAddOpen(!isQuickAddOpen);
              setQuickError("");
            }}
            className={`px-2.5 py-1.5 font-medium text-xs rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
              isQuickAddOpen
                ? "bg-orange-500 text-white border-orange-400"
                : "bg-[#18181C] hover:bg-[#202026] text-[#FAFAFA] hover:text-orange-400 border-[#26262E]"
            }`}
            title="Quick add new customer inline without opening modal"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span className="font-bold">+ New</span>
          </button>

          {/* Search Existing Button */}
          <button
            type="button"
            onClick={() => {
              setIsQuickAddOpen(false);
              onOpenCustomerModal();
            }}
            className="px-2.5 py-1.5 bg-[#18181C] hover:bg-[#202026] text-orange-400 hover:text-orange-300 font-medium text-xs rounded-xl border border-[#26262E] hover:border-orange-500/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Search existing customers or view full directory"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>
        </div>
      </div>

      {/* Inline Quick Add Drawer */}
      {isQuickAddOpen && (
        <form
          onSubmit={handleQuickAddSubmit}
          className="p-3 bg-[#141418] border-t border-[#26262E] space-y-2 animate-[fadeIn_0.15s_ease-out]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold text-orange-400 tracking-wider flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5" />
              <span>Quick Register Customer (Fast Counter Add)</span>
            </span>
            <button
              type="button"
              onClick={() => setIsQuickAddOpen(false)}
              className="p-1 text-[#71717A] hover:text-[#FAFAFA] rounded-md transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Phone */}
            <div className="relative">
              <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
              <input
                ref={phoneInputRef}
                type="tel"
                placeholder="Phone (e.g. 9820112345) *"
                value={quickPhone}
                onChange={(e) => {
                  setQuickPhone(e.target.value);
                  setQuickError("");
                }}
                className="w-full pl-9 pr-3 py-1.5 bg-[#18181C] border border-[#2A2A32] focus:border-orange-500 rounded-xl text-xs text-[#FAFAFA] placeholder:text-[#52525B] outline-none font-mono"
              />
            </div>

            {/* Name */}
            <div className="relative">
              <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
              <input
                type="text"
                placeholder="Customer Name *"
                value={quickName}
                onChange={(e) => {
                  setQuickName(e.target.value);
                  setQuickError("");
                }}
                className="w-full pl-9 pr-3 py-1.5 bg-[#18181C] border border-[#2A2A32] focus:border-orange-500 rounded-xl text-xs text-[#FAFAFA] placeholder:text-[#52525B] outline-none"
              />
            </div>
          </div>

          {/* Optional Extra Fields (City / Address) */}
          {showMoreFields && (
            <div className="pt-1">
              <input
                type="text"
                placeholder="City / Area / Address (Optional)"
                value={quickCity}
                onChange={(e) => setQuickCity(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#18181C] border border-[#2A2A32] focus:border-orange-500 rounded-xl text-xs text-[#FAFAFA] placeholder:text-[#52525B] outline-none"
              />
            </div>
          )}

          {quickError && (
            <div className="text-[11px] text-red-400 font-medium px-1">{quickError}</div>
          )}

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setShowMoreFields(!showMoreFields)}
              className="text-[11px] text-[#71717A] hover:text-[#A1A1AA] flex items-center gap-1 cursor-pointer"
            >
              {showMoreFields ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  <span>Fewer fields</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  <span>+ Address / City</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsQuickAddOpen(false)}
                className="px-3 py-1 bg-[#18181C] hover:bg-[#202026] text-[#A1A1AA] text-xs font-bold rounded-lg cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save &amp; Select</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
