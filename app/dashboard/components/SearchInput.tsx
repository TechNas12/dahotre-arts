"use client";

import { useRef, useEffect } from "react";
import { Search, Loader2, X } from "lucide-react";

export function SearchInput({ 
  value, 
  onChange, 
  isPending, 
  placeholder = "Search...",
  id,
  className = ""
}: { 
  value: string; 
  onChange: (val: string) => void;
  isPending?: boolean;
  placeholder?: string;
  id?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Press '/' to search when not actively typing in an input/textarea
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className={`relative w-full ${className}`}>
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A] pointer-events-none transition-colors">
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
        ) : (
          <Search className="w-4 h-4" />
        )}
      </div>

      <input
        ref={inputRef}
        id={id}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#18181C] hover:bg-[#1C1C22] focus:bg-[#141418] border border-[#222227] hover:border-[#2E2E36] focus:border-orange-500/70 focus:ring-2 focus:ring-orange-500/20 text-[#FAFAFA] placeholder:text-[#71717A] text-sm rounded-xl pl-10 pr-9 py-2 outline-none transition-all duration-200 ds-focus shadow-inner"
      />

      {value && !isPending ? (
        <button
          type="button"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#222228] p-1 rounded-md transition-colors cursor-pointer"
          title="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      ) : !value ? (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:flex items-center">
          <kbd className="text-[10px] font-mono text-[#52525B] bg-[#141418] border border-[#26262E] px-1.5 py-0.5 rounded shadow-sm">
            /
          </kbd>
        </div>
      ) : null}
    </div>
  );
}
