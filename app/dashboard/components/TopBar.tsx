"use client";

import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

export default function TopBar() {
  const pathname = usePathname();
  
  // Create breadcrumbs based on pathname
  // e.g. /dashboard/users -> Dashboard > Users
  const segments = pathname.split("/").filter(Boolean);
  
  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 sticky top-0 z-30 flex items-center px-6">
      <nav className="flex text-sm font-medium text-slate-400">
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
                  <span className="text-slate-200" aria-current="page">
                    {title}
                  </span>
                ) : (
                  <Link href={href} className="hover:text-slate-200 transition-colors">
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
