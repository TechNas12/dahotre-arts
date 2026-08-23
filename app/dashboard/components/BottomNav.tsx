"use client";

import { LayoutDashboard, ShoppingCart, Users, Package, ShoppingBag, Bookmark, Menu } from "lucide-react";
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
        { name: "Products", href: "/dashboard/products", icon: Package },
        { name: "Orders", href: "/dashboard/orders", icon: ShoppingBag },
        { name: "Bookings", href: "/dashboard/bookings", icon: Bookmark },
      ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#121215]/90 backdrop-blur-2xl border-t border-[#222227] pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.6)]">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-all relative ${
                isActive ? "text-orange-400 font-semibold" : "text-[#71717A] hover:text-[#A1A1AA]"
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-orange-500/15' : ''}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-orange-400' : 'stroke-current'}`} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className="text-[10px] tracking-tight truncate max-w-[60px] text-center">
                {item.name}
              </span>
              {isActive && (
                <div className="absolute top-0 w-8 h-0.5 bg-orange-400 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.9)]" />
              )}
            </Link>
          );
        })}

        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="flex flex-col items-center justify-center flex-1 h-full space-y-1 text-[#71717A] hover:text-[#A1A1AA] transition-colors cursor-pointer"
          >
            <div className="p-1">
              <Menu className="w-5 h-5" strokeWidth={2} />
            </div>
            <span className="text-[10px] tracking-tight">More</span>
          </button>
        )}
      </div>
    </nav>
  );
}
