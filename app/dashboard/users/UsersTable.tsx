"use client";

import { useState, useActionState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, Edit2, X, Check, Search, AlertTriangle, Shield, ShieldAlert, Mail, Lock, User as UserIcon } from "lucide-react";
import { TablePagination, PageSize, useTableQueryState } from "@/app/dashboard/components/TablePagination";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { createUserAction, updateUserAction, deleteUsersAction } from "@/app/actions/users";
import { Checkbox } from "@/app/dashboard/components/ui/Checkbox";
import { ConfirmDialog } from "@/app/dashboard/components/ui/ConfirmDialog";

type UserItem = {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
};

export default function UsersTable({ 
  initialUsers, 
  currentUserId,
  totalCount,
  initialPage = 1,
  initialPageSize = 25,
  initialSearch = ""
}: { 
  initialUsers: UserItem[], 
  currentUserId: string,
  totalCount: number,
  initialPage?: number,
  initialPageSize?: number,
  initialSearch?: string
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [users, setUsers] = useState<UserItem[]>(initialUsers);

  // Update local state when props change (from server actions revalidating)
  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  const {
    searchQuery,
    setSearchQuery,
    currentPage,
    pageSize,
    handlePageChange,
    handlePageSizeChange,
  } = useTableQueryState({ initialSearch, initialPage, initialPageSize });

  const pagedUsers = users;

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelectAll = () => {
    if (selectedIds.size === pagedUsers.length && pagedUsers.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pagedUsers.map((u) => u.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Inline Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [updateState, updateAction, isUpdating] = useActionState(updateUserAction, undefined);

  const startEdit = (user: UserItem) => {
    setEditingId(user.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  useEffect(() => {
    if (updateState?.success) {
      setEditingId(null);
      setSelectedIds(new Set());
    }
  }, [updateState]);

  // Add User Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [addState, addAction, isAdding] = useActionState(createUserAction, undefined);

  useEffect(() => {
    if (addState?.success) {
      setIsDrawerOpen(false);
    }
  }, [addState]);

  // Delete Confirmation
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError("");
    const ids = Array.from(selectedIds);
    const result = await deleteUsersAction(ids);

    if (result.error) {
      setDeleteError(result.error);
    } else {
      setIsDeleteDialogOpen(false);
      setSelectedIds(new Set());
    }
    setIsDeleting(false);
  };

  return (
    <div className="bg-[#111111] border border-[#1F1F1F] rounded-xl overflow-hidden shadow-sm flex flex-col">
      {/* Action Bar */}
      <div className="p-4 border-b border-[#1F1F1F] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="group flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-[#0A0A0A] px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 hover:shadow-[0_0_15px_rgba(34,197,94,0.4)] hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90" />
            Add User
          </button>

          <button
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={selectedIds.size === 0}
            className="group flex items-center gap-2 bg-[#1A1A1A]/80 hover:bg-red-500/20 text-[#F5F5F5] hover:text-red-400 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 border border-[#2A2A2A] hover:border-red-500/30 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:hover:translate-y-0 disabled:active:scale-100 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
            Delete Selected {selectedIds.size > 0 && `(${selectedIds.size})`}
          </button>
        </div>

        <div className="relative w-full sm:w-72 group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors duration-300 group-focus-within:text-orange-500">
            <Search className="h-4 w-4 text-[#737373] transition-colors duration-300 group-focus-within:text-orange-500" />
          </div>
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-9 pr-3 py-2 bg-[#0A0A0A]/50 backdrop-blur-sm border border-[#2A2A2A] rounded-lg text-[#F5F5F5] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 focus:bg-[#111111] text-sm transition-all duration-300"
          />
        </div>
      </div>

        <TablePagination
          totalItems={totalCount}
          pageSize={pageSize}
          currentPage={currentPage}
          onPageChange={(p) => { setSelectedIds(new Set()); handlePageChange(p); }}
          onPageSizeChange={(s) => { setSelectedIds(new Set()); handlePageSizeChange(s); }}
        />

      <div className="flex-1 overflow-auto custom-scrollbar overflow-x-hidden md:overflow-x-auto">
        <table className="w-full text-left text-sm text-[#F5F5F5] block md:table">
          <thead className="text-xs text-[#A3A3A3] uppercase bg-[#111111]/80 backdrop-blur-md border-b border-[#1F1F1F] sticky top-0 z-10 hidden md:table-header-group">
            <tr>
              <th className="px-4 py-4 w-12 text-center">
                <Checkbox
                  checked={selectedIds.size === pagedUsers.length && pagedUsers.length > 0}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-4 py-4 font-medium">Name</th>
              <th className="px-4 py-4 font-medium">Email</th>
              <th className="px-4 py-4 font-medium w-36">Role</th>
              <th className="px-4 py-4 font-medium w-32 hidden sm:table-cell">Added</th>
              <th className="px-4 py-4 font-medium w-24 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F1F1F] block md:table-row-group">
            {pagedUsers.length === 0 ? (
              <tr className="block md:table-row">
                <td colSpan={6} className="px-4 py-12 text-center text-[#737373] block md:table-cell">
                  {searchQuery ? "No users match your search." : "No users found."}
                </td>
              </tr>
            ) : (
              pagedUsers.map((user) => {
                const isEditing = editingId === user.id;
                const isSelected = selectedIds.has(user.id);

                return (
                  <tr
                    key={user.id}
                    className={`group transition-all duration-200 border-b border-[#1F1F1F]/30 last:border-0 flex flex-col md:table-row p-4 md:p-0 relative ${isSelected ? 'bg-orange-500/10' : 'hover:bg-[#1A1A1A]/40'}`}
                  >
                    {isEditing ? (
                      /* EDIT MODE ROW */
                      <td colSpan={6} className="p-0 block md:table-cell">
                        <form action={updateAction} className="flex flex-col md:flex-row md:items-center w-full px-4 py-4 md:py-2 gap-4 md:gap-2 bg-[#1A1A1A]/50">
                          <input type="hidden" name="id" value={user.id} />
                          <div className="w-8 shrink-0 hidden md:block"></div>

                          <div className="flex-1 w-full md:w-auto">
                            <input
                              type="text"
                              name="name"
                              defaultValue={user.name}
                              required
                              placeholder="Name"
                              className="w-full px-3 py-2 md:py-1.5 bg-[#111111] border border-[#2A2A2A] rounded-md text-sm text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-orange-500"
                            />
                          </div>

                          <div className="flex-1 w-full md:w-auto">
                            <input
                              type="email"
                              name="email"
                              defaultValue={user.email}
                              required
                              placeholder="Email"
                              className="w-full px-3 py-2 md:py-1.5 bg-[#111111] border border-[#2A2A2A] rounded-md text-sm text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-orange-500"
                            />
                          </div>

                          <div className="w-full md:w-36 shrink-0">
                            <select
                              name="role"
                              defaultValue={user.role}
                              className="w-full px-3 py-2 md:py-1.5 bg-[#111111] border border-[#2A2A2A] rounded-md text-sm text-[#F5F5F5] focus:outline-none focus:ring-1 focus:ring-orange-500 appearance-none"
                            >
                              <option value="STAFF">STAFF</option>
                              <option value="ADMIN">ADMIN</option>
                              <option value="SUPERADMIN">SUPERADMIN</option>
                            </select>
                          </div>

                          <div className="w-32 shrink-0 hidden md:block text-[#737373] text-xs">
                            {new Date(user.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}
                          </div>

                          <div className="w-full md:w-24 shrink-0 flex items-center justify-end md:justify-end gap-2 pt-2 md:pt-0 border-t border-[#2A2A2A] md:border-0">
                            <button
                              type="submit"
                              disabled={isUpdating}
                              className="p-2 md:p-1.5 bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 rounded-md transition-colors disabled:opacity-50 flex-1 md:flex-none flex justify-center"
                              title="Save"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              disabled={isUpdating}
                              className="p-2 md:p-1.5 bg-[#2A2A2A] text-[#F5F5F5] hover:bg-slate-600 rounded-md transition-colors disabled:opacity-50 flex-1 md:flex-none flex justify-center"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </form>
                      </td>
                    ) : (
                      /* VIEW MODE ROW */
                      <>
                        <td className="px-4 py-3 md:text-center absolute top-4 right-4 md:static md:w-auto">
                          <Checkbox
                            checked={isSelected}
                            onChange={() => toggleSelect(user.id)}
                          />
                        </td>
                        <td className="px-4 py-1 md:py-3 font-medium text-[#F5F5F5] flex md:table-cell justify-between items-center before:content-['Name'] md:before:content-none before:text-xs before:text-[#737373] before:font-bold pr-12 md:pr-4">{user.name}
                          {user.id === currentUserId && <span className="ml-2 text-[10px] uppercase bg-[#1A1A1A] text-[#A3A3A3] px-1.5 py-0.5 rounded">You</span>}
                        </td>
                        <td className="px-4 py-1 md:py-3 text-[#A3A3A3] flex md:table-cell justify-between items-center before:content-['Email'] md:before:content-none before:text-xs before:text-[#737373] before:font-bold">{user.email}</td>
                        <td className="px-4 py-1 md:py-3 flex md:table-cell justify-between items-center before:content-['Role'] md:before:content-none before:text-xs before:text-[#737373] before:font-bold">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border shadow-sm backdrop-blur-sm transition-all duration-300 group-hover:scale-105 ${user.role === 'SUPERADMIN'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/30 shadow-purple-500/10'
                              : user.role === 'STAFF'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-amber-500/10'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-blue-500/10'
                            }`}>
                            {user.role === 'SUPERADMIN' ? <ShieldAlert className="w-3.5 h-3.5" /> : user.role === 'STAFF' ? <UserIcon className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                            {user.role}
                          </div>
                        </td>
                        <td className="px-4 py-1 md:py-3 text-[#737373] flex md:table-cell justify-between items-center before:content-['Added'] md:before:content-none before:text-xs before:text-[#737373] before:font-bold md:hidden sm:table-cell">
                          {new Date(user.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3 md:text-right flex justify-end mt-2 md:mt-0 border-t border-[#1F1F1F] md:border-0 pt-3 md:pt-3">
                          <button
                            onClick={() => startEdit(user)}
                            className="p-2 text-[#A3A3A3] hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-all duration-300 hover:scale-110 active:scale-95 inline-flex opacity-100 md:opacity-0 group-hover:opacity-100 focus:opacity-100 bg-[#1A1A1A] md:bg-transparent border border-[#2A2A2A] md:border-transparent"
                            title="Edit User"
                          >
                            <Edit2 className="w-4 h-4" /> <span className="ml-2 md:hidden text-xs">Edit</span>
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {updateState?.error && (
        <div className="p-3 m-4 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <p>{updateState.error}</p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {mounted && (
        <ConfirmDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleDelete}
          title="Delete Users"
          message={`Are you sure you want to delete ${selectedIds.size} selected user${selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone.`}
          confirmText="Delete Users"
          isLoading={isDeleting}
          error={deleteError}
        />
      )}

      {/* Add User Drawer (Slide-in) */}
      {mounted && createPortal(
        <>
          {/* Backdrop */}
          {isDrawerOpen && (
            <div
              className="fixed inset-0 bg-[#0A0A0A]/50 backdrop-blur-sm z-50 transition-opacity"
              onClick={() => setIsDrawerOpen(false)}
            />
          )}

          {/* Drawer */}
          <div
            className={`fixed top-0 right-0 h-full w-full max-w-xl bg-[#111111] border-l border-[#1F1F1F] z-50 transform transition-transform duration-300 ease-in-out shadow-2xl flex flex-col ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
              }`}
          >
            <div className="px-6 py-4 border-b border-[#1F1F1F] flex items-center justify-between shrink-0">
              <h3 className="text-lg font-semibold text-[#F5F5F5]">Add New User</h3>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="text-[#A3A3A3] hover:text-[#F5F5F5] transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              <form action={addAction} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#A3A3A3] uppercase tracking-wider">Full Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserIcon className="h-4 w-4 text-[#737373]" />
                    </div>
                    <input
                      name="name"
                      type="text"
                      required
                      placeholder="Sanket Dahotre"
                      className="block w-full pl-9 pr-3 py-2.5 bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg text-[#F5F5F5] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 text-sm transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#A3A3A3] uppercase tracking-wider">Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-[#737373]" />
                    </div>
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="john@example.com"
                      className="block w-full pl-9 pr-3 py-2.5 bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg text-[#F5F5F5] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 text-sm transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#A3A3A3] uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-[#737373]" />
                    </div>
                    <input
                      name="password"
                      type="password"
                      required
                      placeholder="••••••••"
                      className="block w-full pl-9 pr-3 py-2.5 bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg text-[#F5F5F5] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 text-sm transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#A3A3A3] uppercase tracking-wider">Role</label>
                  <select
                    name="role"
                    className="block w-full px-3 py-2.5 bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 text-sm appearance-none transition-colors"
                  >
                    <option value="STAFF">STAFF</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="SUPERADMIN">SUPERADMIN</option>
                  </select>
                </div>

                {addState?.error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>{addState.error}</p>
                  </div>
                )}

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isAdding}
                    className="w-full flex justify-center items-center px-4 py-2.5 bg-orange-500 hover:bg-green-600 text-[#0A0A0A] font-medium rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed text-sm glow-green"
                  >
                    {isAdding ? "Creating User..." : "Create User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}


