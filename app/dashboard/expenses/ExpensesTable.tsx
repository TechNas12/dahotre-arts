"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { Search, Plus, Calendar, Trash2, Edit, X, Check } from "lucide-react";
import { Expense, deleteExpensesAction, createExpenseAction, updateExpenseAction } from "@/app/actions/expenses";
import { TablePagination, PageSize } from "@/app/dashboard/components/TablePagination";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={`w-4 h-4 rounded flex items-center justify-center cursor-pointer transition-colors border ${checked ? "bg-orange-500 border-orange-500 text-[#0A0A0A]" : "bg-[#1A1A1A] border-[#1F1F1F] text-transparent hover:border-[#2A2A2A]"}`}
    >
      <Check className="w-3 h-3 stroke-[3]" />
    </div>
  );
}

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
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  
  useEffect(() => {
    setExpenses(initialExpenses);
  }, [initialExpenses]);

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [dateFrom, setDateFrom] = useState(initialFrom);
  const [dateTo, setDateTo] = useState(initialTo);
  
  const currentPage = initialPage;
  const pageSize = initialPageSize as PageSize;

  // Flush state to URL
  const updateURL = (params: Record<string, string | number | undefined>) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === '' || value === 'ALL') {
        current.delete(key);
      } else {
        current.set(key, String(value));
      }
    });
    router.push(`${pathname}?${current.toString()}`, { scroll: false });
  };

  // Debounced Search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchQuery !== initialSearch) {
        updateURL({ search: searchQuery, page: 1 });
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handleDateChange = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
    updateURL({ from, to, page: 1 });
  };

  const handlePageChange = (page: number) => {
    updateURL({ page });
  };

  const handlePageSizeChange = (size: number) => {
    updateURL({ pageSize: size, page: 1 });
  };

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

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

  const noOfExpenses = totalCount;

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
        setExpenses(prev => prev.filter(e => !selectedIds.has(e.id)));
        setSelectedIds(new Set());
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
        setExpenses(prev => prev.filter(e => e.id !== id));
        setSelectedIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }
    });
  };

  const openAddModal = () => {
    setEditingExpense(null);
    setIsModalOpen(true);
    setErrorMsg("");
  };

  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setIsModalOpen(true);
    setErrorMsg("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    const formData = new FormData(e.currentTarget);
    
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
        setIsModalOpen(false);
        // Optimistic refresh would be better, but for simplicity we reload the page or we could fetch again.
        // Let's just reload to get the fresh list with user names from server.
        window.location.reload();
      }
    });
  };

  const formatCurrency = (val: number) => `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6 relative">
      {/* Error Banner */}
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg flex items-center justify-between text-sm">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg("")} className="hover:text-red-300"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="ds-card p-5 border-none">
          <h3 className="text-sm font-medium text-[#A3A3A3] mb-2">Total Expense</h3>
          <div className="text-3xl font-bold text-[#F5F5F5]">{formatCurrency(totalExpense)}</div>
        </div>
        <div className="ds-card p-5 border-none">
          <h3 className="text-sm font-medium text-[#A3A3A3] mb-2">Weekly Expense</h3>
          <div className="text-3xl font-bold text-orange-400">{formatCurrency(weeklyExpense)}</div>
        </div>
        <div className="ds-card p-5 border-none">
          <h3 className="text-sm font-medium text-[#A3A3A3] mb-2">No of expenses</h3>
          <div className="text-3xl font-bold text-[#F5F5F5]">{noOfExpenses}</div>
        </div>
      </div>

      {/* Top Bar: Filters & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#111111] p-4 rounded-xl border border-[#1F1F1F]">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-[#737373]" />
            </div>
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full ds-input !pl-10"
            />
          </div>

          {/* Date Range */}
          <div className="flex flex-wrap items-center gap-2 bg-[#1A1A1A] border border-[#1F1F1F] rounded-lg p-1.5 w-full sm:w-auto px-2">
            <select 
              className="bg-[#111111] border border-[#1F1F1F] text-sm text-[#F5F5F5] outline-none rounded px-2 py-1 cursor-pointer hover:bg-[#1A1A1A] transition-colors focus:ring-1 focus:ring-orange-500/50"
              onChange={(e) => {
                const val = e.target.value;
                const today = new Date();
                
                if (val === "today") {
                   let f = ""; let t = "";
                   const todayStr = today.toISOString().split('T')[0];
                   f = todayStr; t = todayStr;
                   handleDateChange(f, t);
                } else if (val === "week") {
                   let f = ""; let t = "";
                   const start = new Date(today);
                   start.setDate(today.getDate() - today.getDay());
                   f = start.toISOString().split('T')[0];
                   t = today.toISOString().split('T')[0];
                   handleDateChange(f, t);
                } else if (val === "month") {
                   let f = ""; let t = "";
                   const start = new Date(today.getFullYear(), today.getMonth(), 1);
                   f = start.toISOString().split('T')[0];
                   t = today.toISOString().split('T')[0];
                   handleDateChange(f, t);
                } else if (val === "clear") {
                   handleDateChange("", "");
                }
                e.target.value = "";
              }}
            >
              <option value="">Quick Select</option>
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
              onClick={e => { try { (e.target as HTMLInputElement).showPicker(); } catch(err) {} }}
              className="bg-transparent border-none text-sm text-[#F5F5F5] outline-none focus:ring-0 w-full sm:w-[110px]"
            />
            <span className="text-[#737373] hidden sm:inline">-</span>
            <input 
              type="date" 
              value={dateTo}
              onChange={e => handleDateChange(dateFrom, e.target.value)}
              onClick={e => { try { (e.target as HTMLInputElement).showPicker(); } catch(err) {} }}
              className="bg-transparent border-none text-sm text-[#F5F5F5] outline-none focus:ring-0 w-full sm:w-[110px]"
            />
            {(dateFrom || dateTo) && (
              <button 
                onClick={() => handleDateChange("", "")}
                className="text-[#737373] hover:text-[#F5F5F5] ml-1 px-1"
                title="Clear Filter"
              >
                ✕
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
          <button
            onClick={openAddModal}
            className="flex-1 sm:flex-none ds-btn-primary flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
        </div>
      </div>
        <TablePagination
          totalItems={totalCount}
          pageSize={pageSize}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />

      <div className="ds-card p-0 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#111111] border-b border-[#1F1F1F] text-[#A3A3A3] text-xs uppercase tracking-wider">
                <th className="p-4 w-12 text-center">
                  {role === "SUPERADMIN" && (
                    <Checkbox
                      checked={selectedIds.size === pagedExpenses.length && pagedExpenses.length > 0}
                      onChange={handleSelectAll}
                    />
                  )}
                </th>
                <th className="p-4 font-medium">Date & Time</th>
                <th className="p-4 font-medium">Description</th>
                <th className="p-4 font-medium text-right">Amount</th>
                <th className="p-4 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F1F1F] text-sm">
              {pagedExpenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[#737373]">
                    No expenses found matching your criteria.
                  </td>
                </tr>
              ) : (
                pagedExpenses.map((expense) => {
                  const dateObj = new Date(expense.datetime);
                  const formattedDate = dateObj.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
                  const formattedTime = dateObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

                  return (
                    <tr 
                      key={expense.id}
                      className={`hover:bg-[#1A1A1A] transition-colors ${selectedIds.has(expense.id) ? "bg-orange-500/5" : ""}`}
                    >
                      <td className="p-4 text-center">
                        {role === "SUPERADMIN" && (
                          <Checkbox checked={selectedIds.has(expense.id)} onChange={() => handleSelect(expense.id)} />
                        )}
                      </td>
                      <td className="p-4 text-[#A3A3A3] whitespace-nowrap">
                        <div className="font-medium text-[#F5F5F5]">{formattedDate}</div>
                        <div className="text-xs text-[#737373]">{formattedTime}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-[#F5F5F5] font-medium">{expense.description}</div>
                        <div className="text-xs text-[#737373]">Added by: {expense.user?.name || 'Unknown'}</div>
                      </td>
                      <td className="p-4 text-right font-medium text-[#F5F5F5] whitespace-nowrap">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(expense)}
                            className="p-1.5 text-[#A3A3A3] hover:text-orange-400 bg-[#111111] hover:bg-orange-500/10 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {role === "SUPERADMIN" && (
                            <button
                              onClick={() => handleDeleteSingle(expense.id)}
                              disabled={isPending}
                              className="p-1.5 text-[#A3A3A3] hover:text-red-400 bg-[#111111] hover:bg-red-500/10 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
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

      <div className="ds-card p-0 overflow-hidden">
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-md bg-[#111111] border border-[#1F1F1F] rounded-2xl shadow-2xl overflow-hidden animate-[fadeInUp_0.2s_ease-out]">
            <div className="flex items-center justify-between p-5 border-b border-[#1F1F1F] bg-[#0A0A0A]">
              <h2 className="text-lg font-semibold text-[#F5F5F5]">
                {editingExpense ? "Edit Expense" : "Add Expense"}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-[#737373] hover:text-[#F5F5F5] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#A3A3A3] mb-1">Description *</label>
                <input
                  type="text"
                  name="description"
                  required
                  defaultValue={editingExpense?.description || ""}
                  placeholder="e.g. Paint brushes"
                  className="w-full ds-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#A3A3A3] mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  name="amount"
                  required
                  step="0.01"
                  min="0"
                  defaultValue={editingExpense?.amount || ""}
                  placeholder="0.00"
                  className="w-full ds-input hide-arrows"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#A3A3A3] mb-1">Date & Time *</label>
                <input
                  type="datetime-local"
                  name="datetime"
                  required
                  defaultValue={editingExpense 
                    ? new Date(new Date(editingExpense.datetime).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,16) 
                    : new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,16)}
                  className="w-full ds-input"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-[#1F1F1F] mt-6 bg-[#0A0A0A] -mx-5 -mb-5 px-5 pb-5 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 ds-btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 ds-btn-primary disabled:opacity-50"
                >
                  {isPending ? "Saving..." : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
