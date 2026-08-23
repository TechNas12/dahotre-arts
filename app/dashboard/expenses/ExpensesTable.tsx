"use client";

import { useState, useTransition, useMemo, useEffect, useRef } from "react";
import {
  Search,
  Plus,
  Calendar,
  Trash2,
  Edit,
  X,
  Check,
  Receipt,
  Sparkles,
  Clock,
  ChevronDown,
  ChevronUp,
  Tag,
  RotateCcw,
  Zap,
  Coffee,
  Car,
  Wrench
} from "lucide-react";
import { Expense, deleteExpensesAction, createExpenseAction, updateExpenseAction } from "@/app/actions/expenses";
import { TablePagination, useTableQueryState } from "@/app/dashboard/components/TablePagination";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/app/dashboard/components/ui/Checkbox";
import { useRealtimeTable } from "@/lib/supabase/realtime";

const QUICK_TAGS = [
  { label: "Tea & Snacks", icon: Coffee },
  { label: "Transport", icon: Car },
  { label: "Tools", icon: Wrench }
];

const getLocalDatetimeString = (date?: Date) => {
  const d = date || new Date();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
};

export default function ExpensesTable({
  initialExpenses,
  role,
  totalCount,
  initialPage = 1,
  initialPageSize = 25,
  initialSearch = "",
  initialFrom = "",
  initialTo = ""
}: {
  initialExpenses: Expense[],
  role: string,
  totalCount: number,
  initialPage?: number,
  initialPageSize?: number,
  initialSearch?: string,
  initialFrom?: string,
  initialTo?: string
}) {
  const router = useRouter();

  const {
    searchQuery,
    setSearchQuery,
    currentPage,
    pageSize,
    updateURL,
    handlePageChange,
    handlePageSizeChange,
  } = useTableQueryState({ initialSearch, initialPage, initialPageSize });

  const [dateFrom, setDateFrom] = useState(initialFrom);
  const [dateTo, setDateTo] = useState(initialTo);

  const handleDateChange = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
    updateURL({ from, to, page: 1 });
  };

  const [removedIds, setRemovedIds] = useState<Set<number>>(new Set());

  const expenses = useMemo(() => {
    if (removedIds.size === 0) return initialExpenses;
    return initialExpenses.filter(e => !removedIds.has(e.id));
  }, [initialExpenses, removedIds]);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Realtime updates
  useRealtimeTable('expenses', () => {
    router.refresh();
  });

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Sticky Top Dock State
  const [isDockMinimized, setIsDockMinimized] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Form Fields State
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDatetime, setFormDatetime] = useState(getLocalDatetimeString());

  const descriptionInputRef = useRef<HTMLInputElement>(null);
  const stickyDockRef = useRef<HTMLDivElement>(null);

  const pagedExpenses = expenses;

  // KPIs
  const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const weeklyExpense = useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return expenses
      .filter(e => new Date(e.datetime) >= oneWeekAgo)
      .reduce((sum, e) => sum + Number(e.amount), 0);
  }, [expenses]);

  const noOfExpenses = expenses.length;

  const handleSelectAll = () => {
    if (selectedIds.size === pagedExpenses.length && pagedExpenses.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pagedExpenses.map(e => e.id)));
    }
  };

  const handleSelect = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} expense(s)?`)) return;

    startTransition(async () => {
      const res = await deleteExpensesAction(Array.from(selectedIds));
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setRemovedIds(prev => new Set([...prev, ...selectedIds]));
        setSelectedIds(new Set());
        router.refresh();
      }
    });
  };

  const handleDeleteSingle = (id: number) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    startTransition(async () => {
      const res = await deleteExpensesAction([id]);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setRemovedIds(prev => new Set([...prev, id]));
        router.refresh();
      }
    });
  };

  // Start Editing
  const startEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormDescription(expense.description);
    setFormAmount(expense.amount.toString());
    setFormDatetime(getLocalDatetimeString(new Date(expense.datetime)));
    setIsDockMinimized(false);
    setErrorMsg("");
    setSuccessMsg("");

    // Focus description input smoothly and scroll to top dock
    setTimeout(() => {
      descriptionInputRef.current?.focus();
      stickyDockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Cancel Editing
  const cancelEdit = () => {
    setEditingExpense(null);
    setFormDescription("");
    setFormAmount("");
    setFormDatetime(getLocalDatetimeString());
    setErrorMsg("");
  };

  const handleQuickTagClick = (tagLabel: string) => {
    setFormDescription(tagLabel);
    if (!formAmount) {
      const amountInput = document.getElementById("sticky-expense-amount");
      amountInput?.focus();
    } else {
      descriptionInputRef.current?.focus();
    }
  };

  const handleStickySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!formDescription.trim()) {
      setErrorMsg("Please enter a description for the expense.");
      descriptionInputRef.current?.focus();
      return;
    }

    const numAmount = parseFloat(formAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg("Please enter a valid expense amount greater than 0.");
      document.getElementById("sticky-expense-amount")?.focus();
      return;
    }

    const formData = new FormData();
    formData.append("description", formDescription.trim());
    formData.append("amount", formAmount.trim());
    formData.append("datetime", formDatetime || getLocalDatetimeString());

    startTransition(async () => {
      let res;
      if (editingExpense) {
        formData.append("id", editingExpense.id.toString());
        res = await updateExpenseAction(undefined, formData);
      } else {
        res = await createExpenseAction(undefined, formData);
      }

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        const addedDesc = formDescription.trim();
        const addedAmt = formAmount.trim();

        // Reset form for next entry
        setEditingExpense(null);
        setFormDescription("");
        setFormAmount("");
        setFormDatetime(getLocalDatetimeString());

        setSuccessMsg(editingExpense ? `Updated expense: "${addedDesc}" (₹${addedAmt})` : `Added expense: "${addedDesc}" (₹${addedAmt})`);

        // Clear success message after 4s
        setTimeout(() => setSuccessMsg(""), 4000);

        router.refresh();
      }
    });
  };

  const formatCurrency = (val: number) => `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-5 relative">
      {/* Notifications */}
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl flex items-center justify-between text-sm animate-[fadeIn_0.2s_ease-out]">
          <span className="font-medium">{errorMsg}</span>
          <button onClick={() => setErrorMsg("")} className="hover:text-red-300 p-1"><X className="w-4 h-4" /></button>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3.5 rounded-xl flex items-center justify-between text-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg("")} className="hover:text-emerald-300 p-1"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="ds-card p-5 border-none relative overflow-hidden group">
          <div className="absolute right-3 top-3 opacity-5 group-hover:opacity-10 transition-opacity">
            <Receipt className="w-16 h-16" />
          </div>
          <h3 className="text-xs font-semibold text-[#737373] uppercase tracking-wider mb-2">Total Expense (This Page)</h3>
          <div className="text-3xl font-bold text-[#F5F5F5]">{formatCurrency(totalExpense)}</div>
        </div>
        <div className="ds-card p-5 border-none relative overflow-hidden group">
          <div className="absolute right-3 top-3 opacity-5 group-hover:opacity-10 transition-opacity">
            <Sparkles className="w-16 h-16 text-orange-500" />
          </div>
          <h3 className="text-xs font-semibold text-[#737373] uppercase tracking-wider mb-2">Weekly Expense (This Page)</h3>
          <div className="text-3xl font-bold text-orange-400">{formatCurrency(weeklyExpense)}</div>
        </div>
        <div className="ds-card p-5 border-none relative overflow-hidden group">
          <div className="absolute right-3 top-3 opacity-5 group-hover:opacity-10 transition-opacity">
            <Clock className="w-16 h-16" />
          </div>
          <h3 className="text-xs font-semibold text-[#737373] uppercase tracking-wider mb-2">No of expenses (This Page)</h3>
          <div className="text-3xl font-bold text-[#F5F5F5]">{noOfExpenses}</div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ALWAYS-VISIBLE STICKY EXPENSE ADDITION DOCK ON TOP OF PAGE */}
      {/* ========================================================================= */}
      <div
        ref={stickyDockRef}
        className="sticky top-0 z-30 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pt-1"
      >
        <div className={`bg-[#111111]/95 backdrop-blur-2xl border ${editingExpense
            ? "border-orange-500 shadow-[0_4px_25px_rgba(249,115,22,0.25)]"
            : "border-[#262626] shadow-[0_8px_30px_rgba(0,0,0,0.6)]"
          } rounded-2xl overflow-hidden transition-all duration-200`}>

          {/* Header Bar of Sticky Menu */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#161616]/95 border-b border-[#222222]">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${editingExpense ? 'bg-orange-500 animate-pulse' : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'}`} />
              <span className="text-xs font-bold text-[#F5F5F5] flex items-center gap-1.5">
                {editingExpense ? (
                  <>
                    <Edit className="w-3.5 h-3.5 text-orange-400" />
                    <span>Edit Expense <span className="font-mono text-orange-400">#{editingExpense.id}</span></span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-orange-400 fill-orange-400/20" />
                    <span>Quick Add Expense</span>
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {editingExpense && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="text-[11px] text-[#A3A3A3] hover:text-[#F5F5F5] px-2.5 py-1 rounded-lg bg-[#222222] hover:bg-[#2A2A2A] transition-colors flex items-center gap-1 cursor-pointer font-medium"
                >
                  <RotateCcw className="w-3 h-3" /> Cancel Edit
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsDockMinimized(!isDockMinimized)}
                className="text-[#A3A3A3] hover:text-[#F5F5F5] p-1.5 rounded-lg hover:bg-[#222222] transition-colors cursor-pointer"
                title={isDockMinimized ? "Expand Dock" : "Minimize Dock"}
              >
                {isDockMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Quick Category Tag Chips */}
          {!isDockMinimized && (
            <div className="px-4 pt-2.5 pb-2 flex items-center gap-1.5 overflow-x-auto custom-scrollbar no-scrollbar whitespace-nowrap bg-[#0F0F0F]/80 border-b border-[#1F1F1F]">
              <span className="text-[10px] uppercase font-bold text-[#737373] mr-1 flex items-center gap-1 shrink-0">
                <Tag className="w-3 h-3 text-orange-400" /> Quick:
              </span>
              {QUICK_TAGS.map((tag) => {
                const IconComponent = tag.icon;
                return (
                  <button
                    key={tag.label}
                    type="button"
                    onClick={() => handleQuickTagClick(tag.label)}
                    className={`text-[11px] px-2.5 py-1 rounded-full border transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${formDescription === tag.label
                        ? "bg-orange-500/20 border-orange-500/50 text-orange-300 font-semibold shadow-sm"
                        : "bg-[#181818] border-[#262626] text-[#A3A3A3] hover:text-[#F5F5F5] hover:border-[#3A3A3A] hover:bg-[#222222]"
                      }`}
                  >
                    <IconComponent className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span>{tag.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Main Input Form */}
          {!isDockMinimized ? (
            <form onSubmit={handleStickySubmit} className="p-3 sm:p-4 bg-[#111111]/80">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">

                {/* Description Input */}
                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-semibold text-[#A3A3A3] mb-1">
                    Description *
                  </label>
                  <input
                    ref={descriptionInputRef}
                    type="text"
                    required
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="e.g. Paint brushes, tea, transport..."
                    className="w-full ds-input !py-2 !text-sm bg-[#161616] focus:bg-[#1A1A1A] focus:border-orange-500 focus:ring-1 focus:ring-orange-500/40"
                  />
                </div>

                {/* Amount Input */}
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-semibold text-[#A3A3A3] mb-1">
                    Amount (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400 font-bold text-sm pointer-events-none">
                      ₹
                    </span>
                    <input
                      id="sticky-expense-amount"
                      type="number"
                      required
                      step="0.01"
                      min="0.01"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full ds-input !pl-7 !py-2 !text-sm font-bold text-orange-400 bg-[#161616] focus:bg-[#1A1A1A] focus:border-orange-500 focus:ring-1 focus:ring-orange-500/40"
                    />
                  </div>
                </div>

                {/* Date & Time Picker */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-[#A3A3A3]">
                      Date & Time
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormDatetime(getLocalDatetimeString())}
                      className="text-[10px] text-orange-400 hover:text-orange-300 underline cursor-pointer"
                    >
                      Now
                    </button>
                  </div>
                  <input
                    type="datetime-local"
                    required
                    value={formDatetime}
                    onChange={(e) => setFormDatetime(e.target.value)}
                    className="w-full ds-input !py-2 !text-xs bg-[#161616] focus:bg-[#1A1A1A] focus:border-orange-500 text-[#F5F5F5]"
                  />
                </div>

                {/* Submit Action Button */}
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={isPending || !formDescription.trim() || !formAmount}
                    className={`w-full py-2 px-3 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer ${editingExpense
                        ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-stone-950"
                        : "ds-btn-primary"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isPending ? (
                      <div className="w-4 h-4 rounded-full border-2 border-stone-950/30 border-t-stone-950 animate-spin" />
                    ) : editingExpense ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Update Expense</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Add Expense (↵)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* Minimized Bar Summary */
            <div
              onClick={() => setIsDockMinimized(false)}
              className="p-3 flex items-center justify-between cursor-pointer hover:bg-[#181818] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#A3A3A3]">
                  {editingExpense ? (
                    <span className="text-orange-400 font-medium">Editing #{editingExpense.id}: {formDescription || editingExpense.description} (₹{formAmount || editingExpense.amount})</span>
                  ) : (
                    <span>Click to expand quick expense entry bar</span>
                  )}
                </span>
              </div>
              <button
                type="button"
                className="text-xs font-bold text-orange-400 flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                {editingExpense ? "Resume Edit" : "Add Expense"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Top Bar: Filters & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#111111] p-4 rounded-xl border border-[#1F1F1F]">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-[#737373]" />
            </div>
            <input
              type="text"
              placeholder="Search expenses by description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full ds-input !pl-10 !pr-8"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#F5F5F5] p-0.5 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Date Range */}
          <div className="flex flex-wrap items-center gap-2 bg-[#1A1A1A] border border-[#1F1F1F] rounded-lg p-1.5 w-full sm:w-auto px-2">
            <select
              className="bg-[#111111] border border-[#1F1F1F] text-xs font-medium text-[#F5F5F5] outline-none rounded px-2 py-1.5 cursor-pointer hover:bg-[#1A1A1A] transition-colors focus:ring-1 focus:ring-orange-500/50"
              onChange={(e) => {
                const val = e.target.value;
                const today = new Date();
                const getISTDate = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);

                if (val === "today") {
                  handleDateChange(getISTDate(today), getISTDate(today));
                } else if (val === "week") {
                  const start = new Date(today);
                  start.setDate(today.getDate() - today.getDay());
                  handleDateChange(getISTDate(start), getISTDate(today));
                } else if (val === "month") {
                  const start = new Date(today.getFullYear(), today.getMonth(), 1);
                  handleDateChange(getISTDate(start), getISTDate(today));
                } else if (val === "clear") {
                  handleDateChange("", "");
                }
                e.target.value = "";
              }}
            >
              <option value="">Quick Date</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="clear">Clear All</option>
            </select>
            <div className="w-px h-4 bg-[#2A2A2A] mx-1 hidden sm:block"></div>
            <Calendar className="w-4 h-4 text-[#737373] hidden sm:block" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => handleDateChange(e.target.value, dateTo)}
              onClick={e => { try { (e.target as HTMLInputElement).showPicker(); } catch (err) { } }}
              className="bg-transparent border-none text-xs text-[#F5F5F5] outline-none focus:ring-0 w-full sm:w-[110px]"
            />
            <span className="text-[#737373] hidden sm:inline">-</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => handleDateChange(dateFrom, e.target.value)}
              onClick={e => { try { (e.target as HTMLInputElement).showPicker(); } catch (err) { } }}
              className="bg-transparent border-none text-xs text-[#F5F5F5] outline-none focus:ring-0 w-full sm:w-[110px]"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => handleDateChange("", "")}
                className="text-[#737373] hover:text-[#F5F5F5] ml-1 p-0.5 rounded transition-colors cursor-pointer"
                title="Clear Filter"
                aria-label="Clear date filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {role === "SUPERADMIN" && selectedIds.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={isPending}
              className="flex items-center gap-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      <TablePagination
        totalItems={totalCount}
        pageSize={pageSize}
        currentPage={currentPage}
        onPageChange={(p) => { setSelectedIds(new Set()); handlePageChange(p); }}
        onPageSizeChange={(s) => { setSelectedIds(new Set()); handlePageSizeChange(s); }}
      />

      {/* ─── MOBILE VIEW: DEDICATED TOUCH-FIRST EXPENSE CARDS ─── */}
      <div className="block md:hidden flex-1 overflow-y-auto custom-scrollbar">
        {pagedExpenses.length === 0 ? (
          <div className="p-12 text-center text-[#71717A] space-y-3">
            <Receipt className="w-12 h-12 mx-auto opacity-20 text-[#71717A]" />
            <p className="text-sm font-medium text-[#A1A1AA]">
              {searchQuery ? "No expenses match your search." : "No expenses recorded."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#1F1F1F]/60 pb-28">
            {pagedExpenses.map((expense) => {
              const dateObj = new Date(expense.datetime);
              const formattedDate = dateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
              const formattedTime = dateObj.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
              const isSelected = selectedIds.has(expense.id);
              const isBeingEdited = editingExpense?.id === expense.id;

              return (
                <div
                  key={expense.id}
                  onClick={() => startEdit(expense)}
                  className={`p-3.5 transition-all duration-150 cursor-pointer active:bg-[#18181D] ${
                    isBeingEdited 
                      ? 'bg-orange-500/15 border-l-4 border-l-orange-500' 
                      : isSelected 
                        ? 'bg-orange-500/10' 
                        : 'hover:bg-[#16161A]'
                  }`}
                >
                  {/* Top Bar: Checkbox + Date & Time + Amount */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {role === "SUPERADMIN" && (
                        <div onClick={e => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleSelect(expense.id)}
                          />
                        </div>
                      )}
                      <span className="text-xs font-medium text-[#FAFAFA]">
                        {formattedDate}
                      </span>
                      <span className="text-[11px] text-[#71717A] font-mono">
                        {formattedTime}
                      </span>
                    </div>

                    <span className="font-mono text-base font-bold text-orange-400">
                      {formatCurrency(expense.amount)}
                    </span>
                  </div>

                  {/* Description & Added By */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="text-sm font-semibold text-[#FAFAFA]">
                      {expense.description}
                    </div>
                    {isBeingEdited && (
                      <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded font-bold uppercase shrink-0">
                        Editing
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-[#1F1F1F]/60">
                    <span className="text-[#71717A]">
                      Added by: <strong className="text-[#A1A1AA]">{expense.user?.name || 'Unknown'}</strong>
                    </span>

                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => startEdit(expense)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border cursor-pointer ${
                          isBeingEdited
                            ? "bg-orange-500 text-stone-950 border-orange-500 font-bold"
                            : "text-[#A1A1AA] hover:text-orange-400 bg-[#18181C] border-[#222227]"
                        }`}
                      >
                        <Edit className="w-3.5 h-3.5 inline mr-1" />
                        Edit
                      </button>

                      {role === "SUPERADMIN" && (
                        <button
                          onClick={() => handleDeleteSingle(expense.id)}
                          disabled={isPending}
                          className="p-1 text-[#71717A] hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors cursor-pointer"
                          title="Delete Expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── DESKTOP VIEW: POWER DATA TABLE ─── */}
      <div className="hidden md:block ds-card p-0 overflow-hidden border border-[#1F1F1F]">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse table">
            <thead className="bg-[#111111] text-[#A1A1AA] text-xs uppercase tracking-wider border-b border-[#1F1F1F]">
              <tr>
                <th className="px-4 py-4 w-12 text-center">
                  {role === "SUPERADMIN" && (
                    <Checkbox
                      checked={selectedIds.size === pagedExpenses.length && pagedExpenses.length > 0}
                      onChange={handleSelectAll}
                    />
                  )}
                </th>
                <th className="p-4 font-semibold">Date & Time</th>
                <th className="p-4 font-semibold">Description</th>
                <th className="p-4 font-semibold text-right">Amount</th>
                <th className="p-4 font-semibold text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F1F1F] text-sm">
              {pagedExpenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-[#71717A]">
                    <Receipt className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    No expenses found matching your criteria.
                  </td>
                </tr>
              ) : (
                pagedExpenses.map((expense) => {
                  const dateObj = new Date(expense.datetime);
                  const formattedDate = dateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                  const formattedTime = dateObj.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
                  const isSelected = selectedIds.has(expense.id);
                  const isBeingEdited = editingExpense?.id === expense.id;

                  return (
                    <tr
                      key={expense.id}
                      className={`hover:bg-[#18181C] transition-colors ${isBeingEdited
                          ? "bg-orange-500/10 border-l-4 border-l-orange-500"
                          : isSelected
                            ? "bg-orange-500/5"
                            : ""
                        }`}
                    >
                      <td className="px-4 py-3 text-center">
                        {role === "SUPERADMIN" && (
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleSelect(expense.id)}
                          />
                        )}
                      </td>
                      <td className="p-4 text-[#A1A1AA] whitespace-nowrap">
                        <div className="font-medium text-[#FAFAFA]">{formattedDate}</div>
                        <div className="text-xs text-[#71717A] font-mono">{formattedTime}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-[#FAFAFA] font-medium flex items-center gap-2">
                          {expense.description}
                          {isBeingEdited && (
                            <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded font-bold uppercase">
                              Editing
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#71717A] mt-0.5">Added by: {expense.user?.name || 'Unknown'}</div>
                      </td>
                      <td className="p-4 text-right font-bold text-[#FAFAFA] whitespace-nowrap">
                        <span className="text-orange-400 font-mono text-base">{formatCurrency(expense.amount)}</span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => startEdit(expense)}
                            className={`p-2 rounded-lg transition-colors border text-xs flex items-center gap-1 font-medium cursor-pointer ${isBeingEdited
                                ? "bg-orange-500 text-orange-950 border-orange-500 font-bold"
                                : "text-[#A1A1AA] hover:text-orange-400 bg-[#111111] hover:bg-orange-500/10 border-[#222227]"
                              }`}
                            title="Edit this expense"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          {role === "SUPERADMIN" && (
                            <button
                              onClick={() => handleDeleteSingle(expense.id)}
                              disabled={isPending}
                              className="p-2 text-[#71717A] hover:text-red-400 bg-[#111111] hover:bg-red-500/10 rounded-lg transition-colors border border-[#222227] cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── FLOATING BULK ACTION BAR (MOBILE STICKY) ─── */}
      {selectedIds.size > 0 && role === "SUPERADMIN" && (
        <div className="md:hidden fixed bottom-[74px] left-3 right-3 z-40 bg-[#16161A]/95 backdrop-blur-xl border border-orange-500/30 rounded-2xl p-3 shadow-[0_12px_40px_rgba(0,0,0,0.85)] flex items-center justify-between animate-[fadeInUp_0.2s_ease-out]">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedIds.size === pagedExpenses.length && pagedExpenses.length > 0}
              onChange={handleSelectAll}
            />
            <span className="text-xs font-bold text-[#FAFAFA]">
              {selectedIds.size} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDeleteSelected}
              disabled={isPending}
              className="flex items-center gap-1 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isPending ? "Deleting..." : "Delete"}</span>
            </button>

            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-1.5 text-[#71717A] hover:text-[#FAFAFA] rounded-lg cursor-pointer"
              title="Deselect All"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
