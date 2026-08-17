"use client";

import { LayoutDashboard, ShoppingCart, Users, Package, FileText, Bookmark } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();
  
  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "POS", href: "/dashboard/pos", icon: ShoppingCart },
    { name: "Bookings", href: "/dashboard/bookings", icon: Bookmark },
    { name: "Orders", href: "/dashboard/orders", icon: FileText },
    { name: "Products", href: "/dashboard/products", icon: Package },
    { name: "Customers", href: "/dashboard/customers", icon: Users },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#111111]/90 backdrop-blur-xl border-t border-[#1F1F1F] pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? "text-orange-500" : "text-[#737373] hover:text-[#A3A3A3]"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'fill-orange-500/10' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium tracking-wide">
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
