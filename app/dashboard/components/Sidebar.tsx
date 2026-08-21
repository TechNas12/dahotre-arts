"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MonitorSmartphone,
  ShoppingBag,
  Package,
  Users,
  Settings,
  ShieldAlert,
  LogOut,
  Sparkles,
  Receipt,
  Activity,
  BarChart3,
  Bookmark,
  X,
  ChevronRight
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";

type SidebarProps = {
  name: string;
  role: string;
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
};

export default function Sidebar({ name, role, isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname();
  const isSuperAdmin = role === "SUPERADMIN";

  const mainNavItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "POS", href: "/dashboard/pos", icon: MonitorSmartphone },
    { name: "Orders", href: "/dashboard/orders", icon: ShoppingBag },
    { name: "Bookings", href: "/dashboard/bookings", icon: Bookmark },
    { name: "Products", href: "/dashboard/products", icon: Package },
    { name: "Customers", href: "/dashboard/customers", icon: Users },
    { name: "Expenses", href: "/dashboard/expenses", icon: Receipt },
    { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
  ].filter(item => {
    if (role === "STAFF") {
      return !["Dashboard", "Expenses", "Reports"].includes(item.name);
    }
    return true;
  });

  const adminNavItems = [
    { name: "Users", href: "/dashboard/users", icon: ShieldAlert },
    { name: "Activity", href: "/dashboard/activity", icon: Activity },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop - Only visible on tablet/mobile when sidebar is open */}
      <div 
        className={`fixed inset-0 bg-black/75 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />
      
      {/* Sidebar - Slide-in on mobile and tablet, static on desktop */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#121215] border-r border-[#222227] flex flex-col h-screen transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isOpen ? "translate-x-0 shadow-[0_0_50px_rgba(0,0,0,0.8)]" : "-translate-x-full"
      }`}>
        {/* Brand Header */}
        <div className="h-16 md:h-[72px] flex items-center justify-between px-5 border-b border-[#222227] shrink-0 bg-[#121215]">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-xl flex items-center justify-center border border-orange-500/30 group-hover:border-orange-500/60 shadow-[0_0_15px_rgba(249,115,22,0.15)] transition-all duration-200">
              <Sparkles className="w-4 h-4 text-orange-400 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-[#FAFAFA] tracking-tight group-hover:text-orange-400 transition-colors">
                Dahotre Arts
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-[#71717A]">
                Retail POS & Studio
              </span>
            </div>
          </Link>
          <button 
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-2 text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#18181C] rounded-lg transition-colors cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-5 px-3 custom-scrollbar space-y-6">
          <div>
            <p className="px-3 text-[11px] font-bold text-[#71717A] uppercase tracking-wider mb-2">
              Main Menu
            </p>
            <nav className="space-y-1">
              {mainNavItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
                const exactActive = pathname === item.href && item.href === "/dashboard";
                const isItemActive = item.href === "/dashboard" ? exactActive : isActive;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden cursor-pointer ${
                      isItemActive
                        ? "bg-gradient-to-r from-orange-500/15 via-orange-500/10 to-transparent text-orange-400 shadow-[inset_0_0_12px_rgba(249,115,22,0.06)]"
                        : "text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#18181C] hover:translate-x-0.5"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={`w-4 h-4 transition-transform duration-200 ${isItemActive ? "text-orange-400" : "text-[#71717A] group-hover:scale-110 group-hover:text-orange-400/80"}`} />
                      <span>{item.name}</span>
                    </div>

                    {isItemActive ? (
                      <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-orange-500 rounded-r-full shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-[#3F3F46] opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {isSuperAdmin && (
            <div>
              <p className="px-3 text-[11px] font-bold text-[#71717A] uppercase tracking-wider mb-2">
                Administration
              </p>
              <nav className="space-y-1">
                {adminNavItems.map((item) => {
                  const isItemActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden cursor-pointer ${
                        isItemActive
                          ? "bg-gradient-to-r from-orange-500/15 via-orange-500/10 to-transparent text-orange-400 shadow-[inset_0_0_12px_rgba(249,115,22,0.06)]"
                          : "text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#18181C] hover:translate-x-0.5"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className={`w-4 h-4 transition-transform duration-200 ${isItemActive ? "text-orange-400" : "text-[#71717A] group-hover:scale-110 group-hover:text-orange-400/80"}`} />
                        <span>{item.name}</span>
                      </div>

                      {isItemActive ? (
                        <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-orange-500 rounded-r-full shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-[#3F3F46] opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}
        </div>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-[#222227] shrink-0 bg-[#0F0F12]">
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500/20 to-orange-400/10 border border-orange-500/30 flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-orange-400 font-bold text-sm">
                {(name || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#FAFAFA] truncate">{name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-orange-400/90">{role}</span>
              </div>
            </div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="group w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#18181C] hover:bg-[#222227] text-[#A1A1AA] hover:text-[#FAFAFA] rounded-xl text-xs font-semibold transition-all duration-200 border border-[#222227] hover:border-[#2E2E36] cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-y-0.5" />
              Sign Out
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
