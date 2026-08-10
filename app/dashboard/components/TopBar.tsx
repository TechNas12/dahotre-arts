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
    <header className="h-16 bg-[#111111] border-b border-[#1F1F1F] sticky top-0 z-30 flex items-center px-4 sm:px-6 gap-3">
      <button 
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-2 text-[#A3A3A3] hover:text-[#F5F5F5] transition-colors rounded-md"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>
      <nav className="flex text-sm font-medium text-[#A3A3A3]">
        <ol className="flex items-center space-x-2">
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
                  <Link href={href} className="hover:text-[#F5F5F5] transition-colors">
                    {title}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </header>
  );
}

