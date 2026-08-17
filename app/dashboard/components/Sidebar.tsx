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
  BarChart3,
  Bookmark,
  X
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
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />
      
      {/* Sidebar - Hidden on mobile entirely (handled by BottomNav), slide-in on tablet, static on desktop */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#111111] border-r border-[#1F1F1F] flex flex-col h-screen transition-transform duration-300 ease-in-out lg:translate-x-0 hidden md:flex ${
        isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      }`}>
      {/* Logo Area */}
      <div className="h-16 md:h-[72px] flex items-center justify-between px-6 border-b border-[#1F1F1F] shrink-0">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-8 h-8 bg-[#1A1A1A] rounded-lg flex items-center justify-center border border-[#2A2A2A] group-hover:border-orange-500/50 transition-colors duration-200">
            <TrendingUp className="w-4 h-4 text-orange-500 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6" />
          </div>
          <span className="text-xl font-bold text-[#F5F5F5] tracking-tight">Dahotre Arts</span>
        </Link>
        <button 
          onClick={() => setIsOpen(false)}
          className="lg:hidden p-2 text-[#737373] hover:text-[#F5F5F5] hover:bg-[#1A1A1A] rounded-md transition-colors"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-6 px-3 custom-scrollbar">
        <div className="mb-6">
          <p className="px-3 text-xs font-semibold text-[#737373] uppercase tracking-wider mb-2">
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
                  className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-300 relative overflow-hidden cursor-pointer ${isItemActive
                    ? "bg-[rgba(249,115,22,0.10)] text-orange-400 font-medium shadow-[0_0_15px_rgba(249,115,22,0.05)]"
                    : "text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[rgba(249,115,22,0.02)] hover:shadow-[0_0_10px_rgba(249,115,22,0.05)] hover:translate-x-1"
                    }`}
                >
                  <item.icon className={`w-4 h-4 transition-transform duration-300 ${isItemActive ? "text-orange-400" : "text-[#737373] group-hover:scale-110 group-hover:text-orange-400/70"}`} />
                  {item.name}
                  {isItemActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-400 to-orange-600 shadow-[0_0_8px_rgba(249,115,22,0.6)] animate-[fadeIn_0.3s_ease-out]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {isSuperAdmin && (
          <div>
            <p className="px-3 text-xs font-semibold text-[#737373] uppercase tracking-wider mb-2">
              Administration
            </p>
            <nav className="space-y-1">
              {adminNavItems.map((item) => {
                const isItemActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-300 relative overflow-hidden cursor-pointer ${isItemActive
                      ? "bg-[rgba(249,115,22,0.10)] text-orange-400 font-medium shadow-[0_0_15px_rgba(249,115,22,0.05)]"
                      : "text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[rgba(249,115,22,0.02)] hover:shadow-[0_0_10px_rgba(249,115,22,0.05)] hover:translate-x-1"
                      }`}
                  >
                    <item.icon className={`w-4 h-4 transition-transform duration-300 ${isItemActive ? "text-orange-400" : "text-[#737373] group-hover:scale-110 group-hover:text-orange-400/70"}`} />
                    {item.name}
                    {isItemActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-400 to-orange-600 shadow-[0_0_8px_rgba(249,115,22,0.6)] animate-[fadeIn_0.3s_ease-out]" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* User Profile Area */}
      <div className="p-4 border-t border-[#1F1F1F] shrink-0 bg-[#0A0A0A]/50">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-9 h-9 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
            <span className="text-orange-400 font-medium text-sm">
              {name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#F5F5F5] truncate">{name}</p>
            <p className="text-xs text-[#737373] truncate">{role}</p>
          </div>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="group w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#1A1A1A] hover:bg-[#2A2A2A] text-[#A3A3A3] hover:text-[#F5F5F5] rounded-lg text-sm font-medium transition-colors duration-200 border border-[#1F1F1F] hover:shadow-md cursor-pointer"
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

