"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { X, Search, User, UserPlus, Phone, Mail, MapPin, Check, AlertCircle } from "lucide-react";
import { Customer } from "@/app/actions/customers";
import { POSCustomerSelection } from "../types";

type POSCustomerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  selectedCustomer: POSCustomerSelection;
  onSelectCustomer: (selection: POSCustomerSelection) => void;
};

export default function POSCustomerModal({
  isOpen,
  onClose,
  customers,
  selectedCustomer,
  onSelectCustomer,
}: POSCustomerModalProps) {
  const [activeTab, setActiveTab] = useState<"SEARCH" | "NEW">("SEARCH");
  const [searchQuery, setSearchQuery] = useState("");

  // New Customer Form State
  const [newName, setNewName] = useState(
    selectedCustomer.type === "NEW" ? selectedCustomer.name : ""
  );
  const [newPhone, setNewPhone] = useState(
    selectedCustomer.type === "NEW" ? selectedCustomer.phone : ""
  );
  const [newEmail, setNewEmail] = useState(
    selectedCustomer.type === "NEW" ? selectedCustomer.email : ""
  );
  const [newAddress, setNewAddress] = useState(
    selectedCustomer.type === "NEW" ? selectedCustomer.address : ""
  );
  const [formError, setFormError] = useState("");

  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab === "NEW") {
      if (newPhone && !newName) {
        nameInputRef.current?.focus();
      } else if (newName && !newPhone) {
        phoneInputRef.current?.focus();
      } else {
        phoneInputRef.current?.focus();
      }
    }
  }, [activeTab, newPhone, newName]);

  // Fast client-side fuzzy filter
  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return customers.slice(0, 30);

    const cleanQ = q.replace(/[\s\-_+()]/g, "");

    return customers
      .filter((c) => {
        const nameMatch = (c.name || "").toLowerCase().includes(q);
        const emailMatch = (c.email || "").toLowerCase().includes(q);
        const phoneMatch =
          c.phone &&
          (c.phone.includes(q) || c.phone.replace(/[\s\-_+()]/g, "").includes(cleanQ));

        return nameMatch || phoneMatch || emailMatch;
      })
      .slice(0, 50);
  }, [customers, searchQuery]);

  if (!isOpen) return null;

  const handleSelectExisting = (customer: Customer) => {
    onSelectCustomer({
      type: "EXISTING",
      customer,
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
    });
    onClose();
  };

  const handleSelectWalkIn = () => {
    onSelectCustomer({
      type: "WALK_IN",
      name: "Walk-in Customer",
      phone: "",
      email: "",
      address: "",
    });
    onClose();
  };

  const handleQuickRegisterWithQuery = (query: string) => {
    setActiveTab("NEW");
    setFormError("");
    if (/^\+?\d+$/.test(query)) {
      setNewPhone(query);
      setTimeout(() => nameInputRef.current?.focus(), 50);
    } else {
      setNewName(query);
      setTimeout(() => phoneInputRef.current?.focus(), 50);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      if (filteredCustomers.length === 1) {
        e.preventDefault();
        handleSelectExisting(filteredCustomers[0]);
      } else if (filteredCustomers.length === 0) {
        e.preventDefault();
        handleQuickRegisterWithQuery(searchQuery.trim());
      }
    }
  };

  const handleSaveNewCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) {
      setFormError("Name and Phone number are required.");
      return;
    }

    onSelectCustomer({
      type: "NEW",
      name: newName.trim(),
      phone: newPhone.trim(),
      email: newEmail.trim(),
      address: newAddress.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-[fadeIn_0.15s_ease-out]">
      <div className="bg-[#121215] border border-[#222227] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header with Tabs */}
        <div className="p-4 border-b border-[#222227] bg-[#141418] flex items-center justify-between">
          <div className="flex bg-[#18181C] p-1 rounded-xl border border-[#222227]">
            <button
              type="button"
              onClick={() => {
                setActiveTab("SEARCH");
                setFormError("");
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "SEARCH"
                  ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm"
                  : "text-[#71717A] hover:text-[#FAFAFA]"
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Find Customer</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("NEW");
                setFormError("");
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "NEW"
                  ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm"
                  : "text-[#71717A] hover:text-[#FAFAFA]"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ New Customer</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#1E1E24] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab 1: Search Existing Customers */}
        {activeTab === "SEARCH" && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-4 border-b border-[#222227] space-y-2.5 shrink-0">
              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A]" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search name or phone (press Enter to select/create)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="w-full bg-[#18181C] border border-[#26262E] focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-[#FAFAFA] rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none placeholder:text-[#52525B]"
                />
              </div>

              {/* Instant 1-Click Register Query Banner */}
              {searchQuery.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => handleQuickRegisterWithQuery(searchQuery.trim())}
                  className="w-full py-2 px-3 bg-gradient-to-r from-orange-500/15 to-amber-500/10 hover:from-orange-500/25 hover:to-amber-500/20 text-orange-400 hover:text-orange-300 rounded-xl border border-orange-500/30 text-xs font-bold transition-all flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>
                      {/^\+?\d+$/.test(searchQuery.trim())
                        ? `+ Add Phone "${searchQuery.trim()}" as New Customer`
                        : `+ Add Name "${searchQuery.trim()}" as New Customer`}
                    </span>
                  </div>
                  <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-mono">
                    Instant Add
                  </span>
                </button>
              )}

              {/* Fast 1-Click Walk-in Option */}
              <button
                type="button"
                onClick={handleSelectWalkIn}
                className="w-full py-2 px-3 bg-[#18181C] hover:bg-[#1E1E24] text-[#A1A1AA] hover:text-[#FAFAFA] rounded-xl border border-[#26262E] hover:border-[#32323C] text-xs font-semibold transition-all flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-orange-400" />
                  <span>Walk-in Customer (Quick Cash Sale - No Phone)</span>
                </div>
                <span className="text-[10px] bg-[#24242C] text-[#A1A1AA] px-2 py-0.5 rounded-full">
                  Cash Counter
                </span>
              </button>
            </div>

            {/* Matching Customer List */}
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar divide-y divide-[#1E1E24]">
              {filteredCustomers.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-[#71717A] mb-3">No matching customer found</p>
                  <button
                    type="button"
                    onClick={() => handleQuickRegisterWithQuery(searchQuery.trim())}
                    className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-[0_0_16px_rgba(249,115,22,0.3)] inline-flex items-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Register &quot;{searchQuery}&quot; as New Customer</span>
                  </button>
                </div>
              ) : (
                filteredCustomers.map((c) => {
                  const isSelected =
                    selectedCustomer.type === "EXISTING" && selectedCustomer.customer?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => handleSelectExisting(c)}
                      className={`p-3 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-orange-500/10 border border-orange-500/30"
                          : "hover:bg-[#18181C]"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h5 className="text-sm font-bold text-[#FAFAFA] truncate">{c.name}</h5>
                          {isSelected && (
                            <span className="text-[10px] bg-green-500/15 text-green-400 font-bold px-1.5 py-0.2 rounded border border-green-500/20">
                              Selected
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-[#A1A1AA]">
                          {c.phone && (
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3 text-[#71717A]" />
                              {c.phone}
                            </span>
                          )}
                          {c.email && (
                            <span className="flex items-center gap-1 truncate max-w-[180px]">
                              <Mail className="w-3 h-3 text-[#71717A]" />
                              {c.email}
                            </span>
                          )}
                          {c.address && (
                            <span className="flex items-center gap-1 truncate max-w-[200px]">
                              <MapPin className="w-3 h-3 text-[#71717A]" />
                              {c.address}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors ${
                          isSelected
                            ? "bg-orange-500 text-white"
                            : "bg-[#1E1E24] text-[#A1A1AA] hover:bg-[#282832] hover:text-[#FAFAFA]"
                        }`}
                      >
                        Select
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Register New Customer Form */}
        {activeTab === "NEW" && (
          <form onSubmit={handleSaveNewCustomer} className="p-4 space-y-3.5 flex-1 overflow-y-auto custom-scrollbar">
            {formError && (
              <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#A1A1AA] flex items-center gap-1">
                <span>Phone Number</span>
                <span className="text-red-400">*</span>
              </label>
              <input
                ref={phoneInputRef}
                type="tel"
                placeholder="e.g. +91 98201 12345"
                value={newPhone}
                onChange={(e) => {
                  setNewPhone(e.target.value);
                  setFormError("");
                }}
                className="w-full bg-[#18181C] border border-[#26262E] focus:border-orange-500 text-[#FAFAFA] rounded-xl px-3.5 py-2 text-sm outline-none font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#A1A1AA] flex items-center gap-1">
                <span>Customer Name</span>
                <span className="text-red-400">*</span>
              </label>
              <input
                ref={nameInputRef}
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setFormError("");
                }}
                className="w-full bg-[#18181C] border border-[#26262E] focus:border-orange-500 text-[#FAFAFA] rounded-xl px-3.5 py-2 text-sm outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#A1A1AA]">City / Address (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Dadar, Mumbai"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full bg-[#18181C] border border-[#26262E] focus:border-orange-500 text-[#FAFAFA] rounded-xl px-3.5 py-2 text-sm outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#A1A1AA]">Email (Optional)</label>
                <input
                  type="email"
                  placeholder="rahul@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-[#18181C] border border-[#26262E] focus:border-orange-500 text-[#FAFAFA] rounded-xl px-3.5 py-2 text-sm outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#222227] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[#18181C] hover:bg-[#202026] text-[#A1A1AA] font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-bold text-xs rounded-xl shadow-[0_0_16px_rgba(249,115,22,0.3)] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Save &amp; Use Customer</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
