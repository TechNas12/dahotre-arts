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
  TrendingUp,
  Receipt,
  Activity,
  BarChart3
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
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar Content */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen transition-transform duration-300 ease-in-out transform lg:translate-x-0 lg:static lg:z-40 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
      {/* Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700 group-hover:border-green-500/50 transition-colors duration-300">
            <TrendingUp className="w-4 h-4 text-green-500 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" />
          </div>
          <span className="font-semibold tracking-tight text-slate-50">Dahotre Arts</span>
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-6 px-3 custom-scrollbar">
        <div className="mb-6">
          <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Main Menu
          </p>
          <nav className="space-y-1">
            {mainNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const exactActive = pathname === item.href && item.href === "/dashboard";
              const isItemActive = item.href === "/dashboard" ? exactActive : isActive;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 relative overflow-hidden ${isItemActive
                    ? "bg-slate-800 text-green-400 font-medium shadow-sm shadow-slate-900/50"
                    : "text-slate-400 hover:text-slate-50 hover:bg-slate-800/50 hover:translate-x-1"
                    }`}
                >
                  <item.icon className={`w-4 h-4 transition-transform duration-200 ${isItemActive ? "text-green-400" : "text-slate-400 group-hover:scale-110 group-hover:text-slate-300"}`} />
                  {item.name}
                  {isItemActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {isSuperAdmin && (
          <div>
            <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Administration
            </p>
            <nav className="space-y-1">
              {adminNavItems.map((item) => {
                const isItemActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 relative overflow-hidden ${isItemActive
                      ? "bg-slate-800 text-green-400 font-medium shadow-sm shadow-slate-900/50"
                      : "text-slate-400 hover:text-slate-50 hover:bg-slate-800/50 hover:translate-x-1"
                      }`}
                  >
                    <item.icon className={`w-4 h-4 transition-transform duration-200 ${isItemActive ? "text-green-400" : "text-slate-400 group-hover:scale-110 group-hover:text-slate-300"}`} />
                    {item.name}
                    {isItemActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* User Profile Area */}
      <div className="p-4 border-t border-slate-800 shrink-0 bg-slate-900/50">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-9 h-9 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
            <span className="text-green-400 font-medium text-sm">
              {name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{name}</p>
            <p className="text-xs text-slate-500 truncate">{role}</p>
          </div>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="group w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-50 rounded-lg text-sm font-medium transition-all duration-200 border border-slate-700 hover:shadow-md hover:border-slate-600 active:scale-[0.98]"
          >
            <LogOut className="w-4 h-4 transition-transform duration-200 group-hover:-translate-y-0.5" />
            Logout
          </button>
        </form>
      </div>
    </aside>
    </>
  );
}
