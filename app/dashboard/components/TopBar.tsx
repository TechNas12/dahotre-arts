"use client";

import { usePathname } from "next/navigation";
import { ChevronRight, Menu } from "lucide-react";
import Link from "next/link";

export default function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  
  // Create breadcrumbs based on pathname
  // e.g. /dashboard/users -> Dashboard > Users
  const segments = pathname.split("/").filter(Boolean);
  
  return (
    <header className="h-16 md:h-[72px] bg-[#111111] border-b border-[#1F1F1F] sticky top-0 z-30 flex items-center px-4 sm:px-6 gap-3 lg:gap-4 transition-all duration-300">
      <button 
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-2 text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#1A1A1A] transition-colors rounded-md active:scale-95"
        aria-label="Open sidebar menu"
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="flex flex-col justify-center min-w-0">
        <nav className="flex text-xs font-medium text-[#737373] hidden sm:flex" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-1.5">
            {segments.map((segment, index) => {
              const isLast = index === segments.length - 1;
              const title = segment.charAt(0).toUpperCase() + segment.slice(1);
            
            // Build the URL for this segment
            const href = "/" + segments.slice(0, index + 1).join("/");
            
            return (
              <li key={segment} className="flex items-center">
                {index > 0 && <ChevronRight className="w-4 h-4 mx-2 text-slate-600 shrink-0" />}
                {isLast ? (
                  <span className="text-[#F5F5F5]" aria-current="page">
                    {title}
                  </span>
                ) : (
                  <Link href={href} className="hover:text-[#F5F5F5] hover:underline transition-all">
                    {title}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      {segments.length > 0 && (
        <h1 className="text-lg sm:text-xl font-bold text-[#F5F5F5] leading-tight truncate">
          {segments[segments.length - 1].charAt(0).toUpperCase() + segments[segments.length - 1].slice(1)}
        </h1>
      )}
      </div>
    </header>
  );
}

