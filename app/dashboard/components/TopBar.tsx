"use client";

import { usePathname } from "next/navigation";
import { ChevronRight, Menu, PlusCircle, ShoppingCart } from "lucide-react";
import Link from "next/link";

export default function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  
  // Create breadcrumbs based on pathname
  const segments = pathname.split("/").filter(Boolean);
  const isPosPage = pathname === "/dashboard/pos";
  
  return (
    <header className="h-16 md:h-[72px] bg-[#121215]/80 backdrop-blur-xl border-b border-[#222227] sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 lg:px-8 transition-all duration-300">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-1 text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#18181C] transition-colors rounded-xl border border-transparent hover:border-[#2E2E36] active:scale-95 cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col justify-center min-w-0">
          <nav className="hidden sm:flex text-xs font-medium text-[#71717A]" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-1.5">
              {segments.map((segment, index) => {
                const isLast = index === segments.length - 1;
                const title = segment.charAt(0).toUpperCase() + segment.slice(1);
                const href = "/" + segments.slice(0, index + 1).join("/");
                
                return (
                  <li key={segment} className="flex items-center">
                    {index > 0 && <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-[#52525B] shrink-0" />}
                    {isLast ? (
                      <span className="text-[#FAFAFA] font-semibold" aria-current="page">
                        {title}
                      </span>
                    ) : (
                      <Link href={href} className="hover:text-[#FAFAFA] transition-colors">
                        {title}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
          {segments.length > 0 && (
            <h1 className="text-lg sm:text-xl font-bold text-[#FAFAFA] tracking-tight leading-tight truncate">
              {segments[segments.length - 1].charAt(0).toUpperCase() + segments[segments.length - 1].slice(1)}
            </h1>
          )}
        </div>
      </div>

      {/* Right Side Quick Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {!isPosPage && (
          <Link
            href="/dashboard/pos"
            className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-sm hover:shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all active:scale-95 cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4 shrink-0" />
            <span className="hidden xs:inline">New Sale / POS</span>
            <span className="xs:hidden">POS</span>
          </Link>
        )}
      </div>
    </header>
  );
}
