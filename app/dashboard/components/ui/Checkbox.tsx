"use client";

import { Check } from "lucide-react";

interface CheckboxProps {
  checked: boolean;
  onChange: () => void;
  className?: string;
  ariaLabel?: string;
  size?: 'sm' | 'md';
}

export function Checkbox({ 
  checked, 
  onChange, 
  className = "", 
  ariaLabel = "Select",
  size = 'md' 
}: CheckboxProps) {
  const sizeClasses = size === 'sm' ? 'w-4 h-4 rounded-[5px]' : 'w-4 h-4 sm:w-[18px] sm:h-[18px] rounded-[6px]';
  const iconSize = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3';

  return (
    <div
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={(e) => { 
        e.stopPropagation(); 
        onChange(); 
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onChange();
        }
      }}
      className={`${sizeClasses} flex items-center justify-center cursor-pointer transition-all duration-200 border ds-focus shrink-0 select-none ${
        checked 
          ? "bg-gradient-to-tr from-orange-500 to-amber-500 border-orange-400 text-white shadow-[0_0_12px_rgba(249,115,22,0.4)] scale-100" 
          : "bg-[#18181C] border-[#2E2E36] text-transparent hover:border-orange-500/50 hover:bg-[#202026] active:scale-90"
      } ${className}`}
    >
      <Check 
        className={`${iconSize} stroke-[3.5] transition-transform duration-150 ${
          checked ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
        }`} 
      />
    </div>
  );
}
