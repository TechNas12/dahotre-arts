"use client";

import { useState, useRef, useEffect } from "react";
import {
  User,
  UserCheck,
  UserPlus,
  Search,
  RotateCcw,
  Phone,
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import { Customer } from "@/app/actions/customers";
import { POSCustomerSelection } from "../types";

type POSCustomerBarProps = {
  selectedCustomer: POSCustomerSelection;
  customers: Customer[];
  onOpenCustomerModal: () => void;
  onSetWalkIn: () => void;
  onSelectCustomer: (selection: POSCustomerSelection) => void;
  hasValidationError?: boolean;
};

export default function POSCustomerBar({
  selectedCustomer,
  customers,
  onOpenCustomerModal,
  onSetWalkIn,
  onSelectCustomer,
  hasValidationError,
}: POSCustomerBarProps) {
  const [phone, setPhone] = useState(selectedCustomer.phone || "");
  const [name, setName] = useState(selectedCustomer.name || "");
  const [address, setAddress] = useState(selectedCustomer.address || "");
  const [showAddress, setShowAddress] = useState(Boolean(selectedCustomer.address));

  const phoneInputRef = useRef<HTMLInputElement>(null);

  const isWalkIn = selectedCustomer.type === "WALK_IN";
  const isExisting = selectedCustomer.type === "EXISTING" && selectedCustomer.customer;
  const isNew = selectedCustomer.type === "NEW";
  const isComplete = (phone.trim() && name.trim()) || isWalkIn;

  // Sync internal state when selectedCustomer changes externally (e.g. from modal or reset)
  useEffect(() => {
    if (selectedCustomer.type === "WALK_IN") {
      setPhone("");
      setName("");
      setAddress("");
    } else {
      setPhone(selectedCustomer.phone || "");
      setName(selectedCustomer.name || "");
      setAddress(selectedCustomer.address || "");
    }
  }, [selectedCustomer]);

  // Handle Phone input change with automatic lookup
  const handlePhoneChange = (val: string) => {
    setPhone(val);
    const cleanDigits = val.replace(/\D/g, "");

    // If at least 7-10 digits, search for an existing customer
    if (cleanDigits.length >= 7) {
      const match = customers.find((c) => {
        if (!c.phone) return false;
        const cDigits = c.phone.replace(/\D/g, "");
        return cDigits.endsWith(cleanDigits) || cleanDigits.endsWith(cDigits);
      });

      if (match) {
        setName(match.name || "");
        setAddress(match.address || "");
        onSelectCustomer({
          type: "EXISTING",
          customer: match,
          name: match.name || "",
          phone: val,
          email: match.email || "",
          address: match.address || "",
        });
        return;
      }
    }

    // Otherwise, treat as new customer entry
    onSelectCustomer({
      type: "NEW",
      name: name,
      phone: val,
      email: selectedCustomer.email || "",
      address: address,
    });
  };

  // Handle Name input change
  const handleNameChange = (val: string) => {
    setName(val);
    if (isExisting && val !== selectedCustomer.customer?.name) {
      // Switched away from existing customer
      onSelectCustomer({
        type: "NEW",
        name: val,
        phone: phone,
        email: "",
        address: address,
      });
    } else {
      onSelectCustomer({
        type: isExisting ? "EXISTING" : "NEW",
        customer: selectedCustomer.customer,
        name: val,
        phone: phone,
        email: selectedCustomer.email || "",
        address: address,
      });
    }
  };

  // Handle Address change
  const handleAddressChange = (val: string) => {
    setAddress(val);
    onSelectCustomer({
      ...selectedCustomer,
      address: val,
    });
  };

  const handleSwitchToEntry = () => {
    onSelectCustomer({
      type: "NEW",
      name: "",
      phone: "",
      email: "",
      address: "",
    });
    setTimeout(() => phoneInputRef.current?.focus(), 50);
  };

  return (
    <div
      className={`p-3 bg-[#121215] border-b transition-colors shrink-0 rounded-t-2xl space-y-2.5 ${
        hasValidationError && !isComplete
          ? "border-red-500/70 bg-red-500/[0.04]"
          : "border-[#222227]"
      }`}
    >
      {/* Row 1: Header, Status Badges & Action Buttons */}
      <div className="flex items-center justify-between gap-2">
        {/* Title & Status */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] uppercase font-bold text-[#A1A1AA] tracking-wider">
              Customer Info
            </span>
            <span className="text-red-400 font-bold text-xs" title="Mandatory customer entry">*</span>
          </div>

          {/* Dynamic Status Pill */}
          {isExisting ? (
            <span className="text-[10px] font-bold bg-green-500/15 text-green-400 px-2 py-0.5 rounded-md border border-green-500/25 flex items-center gap-1 truncate">
              <Check className="w-3 h-3 stroke-[3]" />
              <span>Registered Customer</span>
            </span>
          ) : isNew && (phone.trim() || name.trim()) ? (
            <span className="text-[10px] font-bold bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-md border border-blue-500/25 truncate">
              New Customer
            </span>
          ) : isWalkIn ? (
            <span className="text-[10px] font-bold bg-purple-500/15 text-purple-400 px-2 py-0.5 rounded-md border border-purple-500/25 truncate">
              Walk-in (Bypassed)
            </span>
          ) : (
            <span className="text-[10px] font-bold bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-md border border-amber-500/25 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              <span>Required</span>
            </span>
          )}
        </div>

        {/* Right Actions: Walk-in Bypass & Search Modal */}
        <div className="flex items-center gap-1.5 shrink-0">
          {!isWalkIn ? (
            <button
              type="button"
              onClick={onSetWalkIn}
              className="px-2.5 py-1 bg-[#18181C] hover:bg-[#202026] text-[#A1A1AA] hover:text-[#FAFAFA] font-medium text-[11px] rounded-lg border border-[#26262E] hover:border-[#383842] transition-colors cursor-pointer flex items-center gap-1"
              title="Bypass customer details if customer refuses to provide"
            >
              <RotateCcw className="w-3 h-3 text-[#71717A]" />
              <span>Walk-in</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSwitchToEntry}
              className="px-2.5 py-1 bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 font-bold text-[11px] rounded-lg border border-orange-500/30 transition-colors cursor-pointer flex items-center gap-1"
            >
              <UserPlus className="w-3 h-3" />
              <span>+ Enter Details</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenCustomerModal}
            className="px-2.5 py-1 bg-[#18181C] hover:bg-[#202026] text-orange-400 hover:text-orange-300 font-medium text-[11px] rounded-lg border border-[#26262E] hover:border-orange-500/40 transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
            title="Search directory by name or view customer history"
          >
            <Search className="w-3 h-3" />
            <span>Search</span>
          </button>
        </div>
      </div>

      {/* Row 2: Customer Inputs (Permanently Open & Visible) */}
      <div className="space-y-2">
        {isWalkIn && (
          <div className="px-2.5 py-1.5 bg-purple-500/10 border border-purple-500/25 rounded-xl flex items-center justify-between text-xs text-purple-300">
            <span className="flex items-center gap-1.5 text-[11px]">
              <User className="w-3.5 h-3.5 text-purple-400" />
              <span>Walk-in mode active for this sale (Customer info bypassed)</span>
            </span>
            <button
              type="button"
              onClick={handleSwitchToEntry}
              className="text-[11px] font-bold text-orange-400 hover:text-orange-300 cursor-pointer"
            >
              Require Customer Info
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Phone Number Input (Auto-detects registered customers) */}
          <div className="relative">
            <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
            <input
              ref={phoneInputRef}
              type="tel"
              placeholder={isWalkIn ? "Phone (Optional for Walk-in)" : "Phone Number *"}
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              className={`w-full pl-9 pr-7 py-1.5 bg-[#18181C] border rounded-xl text-xs text-[#FAFAFA] placeholder:text-[#52525B] outline-none font-mono transition-colors ${
                isExisting
                  ? "border-green-500/50 focus:border-green-500"
                  : isWalkIn
                  ? "border-purple-500/30 focus:border-purple-500"
                  : hasValidationError && !phone.trim()
                  ? "border-red-500 focus:border-red-400"
                  : "border-[#26262E] focus:border-orange-500"
              }`}
            />
            {isExisting && (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-green-400">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            )}
          </div>

          {/* Customer Name Input */}
          <div className="relative">
            <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
            <input
              type="text"
              placeholder={isWalkIn ? "Name (Walk-in Customer)" : "Customer Name *"}
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className={`w-full pl-9 pr-3 py-1.5 bg-[#18181C] border rounded-xl text-xs text-[#FAFAFA] placeholder:text-[#52525B] outline-none transition-colors ${
                isExisting
                  ? "border-green-500/50 focus:border-green-500"
                  : isWalkIn
                  ? "border-purple-500/30 focus:border-purple-500"
                  : hasValidationError && !name.trim()
                  ? "border-red-500 focus:border-red-400"
                  : "border-[#26262E] focus:border-orange-500"
              }`}
            />
          </div>
        </div>

          {/* Optional Expandable Address / City */}
          {showAddress && (
            <div className="animate-[fadeIn_0.1s_ease-out]">
              <input
                type="text"
                placeholder="City / Area / Address (Optional)"
                value={address}
                onChange={(e) => handleAddressChange(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#18181C] border border-[#26262E] focus:border-orange-500 rounded-xl text-xs text-[#FAFAFA] placeholder:text-[#52525B] outline-none"
              />
            </div>
          )}

          {/* Footer of Customer Bar: Toggle address / Validation hint */}
          <div className="flex items-center justify-between text-[10px] text-[#71717A] px-0.5">
            <button
              type="button"
              onClick={() => setShowAddress(!showAddress)}
              className="hover:text-[#A1A1AA] flex items-center gap-1 cursor-pointer transition-colors"
            >
              {showAddress ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  <span>Hide address</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  <span>+ Address / City (Optional)</span>
                </>
              )}
            </button>

            {hasValidationError && !isComplete && (
              <span className="text-red-400 font-medium flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" />
                <span>Phone &amp; Name required (or click Walk-in)</span>
              </span>
            )}
          </div>
        </div>
    </div>
  );
}
