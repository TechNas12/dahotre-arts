"use client";

import { Search, Loader2 } from "lucide-react";

export function SearchInput({ 
  value, 
  onChange, 
  isPending, 
  placeholder = "Search..." 
}: { 
  value: string; 
  onChange: (val: string) => void;
  isPending?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="relative w-full">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]">
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
        ) : (
          <Search className="w-4 h-4" />
        )}
      </div>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full ds-input !pl-9"
      />
    </div>
  );
}
