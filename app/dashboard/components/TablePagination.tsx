"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

interface TablePaginationProps {
  totalItems: number;
  pageSize: PageSize;
  currentPage: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSize) => void;
}

export function TablePagination({
  totalItems,
  pageSize,
  currentPage,
  onPageChange,
  onPageSizeChange,
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const from = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-[#1F1F1F] bg-[#0A0A0A]/50 shrink-0 text-sm">
      {/* Left: rows-per-page + count */}
      <div className="flex items-center gap-3 text-[#A3A3A3]">
        <span className="hidden sm:inline whitespace-nowrap">Rows per page</span>
        <select
          value={pageSize}
          onChange={(e) => {
            onPageSizeChange(Number(e.target.value) as PageSize);
            onPageChange(1);
          }}
          className="bg-[#1A1A1A] border border-[#1F1F1F] text-[#F5F5F5] rounded-lg px-2 py-1 text-sm outline-none focus:border-orange-500/60 cursor-pointer"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span className="text-[#737373] whitespace-nowrap">
          {totalItems === 0 ? "No results" : `${from}–${to} of ${totalItems}`}
        </span>
      </div>

      {/* Right: page controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-md text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#1A1A1A] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="First page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-md text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#1A1A1A] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page number pills */}
        <div className="flex items-center gap-1 mx-1">
          {buildPageRange(currentPage, totalPages).map((item, i) =>
            item === "…" ? (
              <span key={`ellipsis-${i}`} className="px-1 text-[#737373]">…</span>
            ) : (
              <button
                key={item}
                onClick={() => onPageChange(item as number)}
                className={`min-w-[32px] h-8 rounded-md text-sm font-medium transition-colors ${
                  item === currentPage
                    ? "bg-orange-500 text-white shadow-sm"
                    : "text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#1A1A1A]"
                }`}
              >
                {item}
              </button>
            )
          )}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-md text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#1A1A1A] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-md text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#1A1A1A] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/** Build a compact page range with ellipsis, e.g. [1, 2, "…", 8, 9, 10] */
function buildPageRange(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "…")[] = [];
  const addPage = (p: number) => {
    if (!pages.includes(p)) pages.push(p);
  };

  addPage(1);
  if (current > 3) pages.push("…");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) addPage(p);
  if (current < total - 2) pages.push("…");
  addPage(total);

  return pages;
}

/** Hook to easily wire up pagination state with a filtered list */
export function usePagination<T>(items: T[], defaultPageSize: PageSize = 25) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(defaultPageSize);

  // Reset to page 1 whenever the items list changes (e.g. search/filter)
  const prevLengthRef = useRef(items.length);
  if (prevLengthRef.current !== items.length) {
    prevLengthRef.current = items.length;
    // We intentionally don't call setState here to avoid render loops;
    // effect below handles it.
  }

  const pagedItems = items.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handlePageSizeChange = (size: PageSize) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  return {
    pagedItems,
    currentPage,
    pageSize,
    totalItems: items.length,
    setCurrentPage,
    onPageSizeChange: handlePageSizeChange,
  };
}

// We need React hooks — import them at the top of the file.
import { useState, useRef } from "react";
