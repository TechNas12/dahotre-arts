"use client";

import { LayoutDashboard, ShoppingCart, Users, Package, ShoppingBag, Bookmark, BarChart3, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav({ 
  role, 
  onMenuClick 
}: { 
  role?: string; 
  onMenuClick?: () => void;
}) {
  const pathname = usePathname();
  
  const isStaff = role === "STAFF";

  const navItems = isStaff
    ? [
        { name: "POS", href: "/dashboard/pos", icon: ShoppingCart },
        { name: "Orders", href: "/dashboard/orders", icon: ShoppingBag },
        { name: "Bookings", href: "/dashboard/bookings", icon: Bookmark },
        { name: "Products", href: "/dashboard/products", icon: Package },
        { name: "Customers", href: "/dashboard/customers", icon: Users },
      ]
    : [
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { name: "POS", href: "/dashboard/pos", icon: ShoppingCart },
        { name: "Orders", href: "/dashboard/orders", icon: ShoppingBag },
        { name: "Bookings", href: "/dashboard/bookings", icon: Bookmark },
        { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
      ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#111111]/95 backdrop-blur-xl border-t border-[#1F1F1F] pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-colors relative ${
                isActive ? "text-orange-500 font-semibold" : "text-[#737373] hover:text-[#A3A3A3]"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'fill-orange-500/10 stroke-orange-500' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] tracking-tight truncate max-w-[56px] text-center">
                {item.name}
              </span>
              {isActive && (
                <div className="absolute top-0 w-8 h-0.5 bg-orange-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
              )}
            </Link>
          );
        })}

        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="flex flex-col items-center justify-center flex-1 h-full space-y-1 text-[#737373] hover:text-[#A3A3A3] transition-colors"
          >
            <Menu className="w-5 h-5" strokeWidth={2} />
            <span className="text-[10px] tracking-tight">More</span>
          </button>
        )}
      </div>
    </nav>
  );
}
