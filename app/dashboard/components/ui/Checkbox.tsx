"use client";

import { Check, Minus } from "lucide-react";

interface CheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  className?: string;
  ariaLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  label?: React.ReactNode;
  disabled?: boolean;
}

export function Checkbox({ 
  checked, 
  indeterminate = false,
  onChange, 
  className = "", 
  ariaLabel = "Select",
  size = 'md',
  label,
  disabled = false
}: CheckboxProps) {
  const sizeMap = {
    sm: { box: 'w-4 h-4 rounded-[5px]', icon: 'w-2.5 h-2.5', text: 'text-xs' },
    md: { box: 'w-[18px] h-[18px] rounded-[6px]', icon: 'w-3 h-3', text: 'text-sm' },
    lg: { box: 'w-5 h-5 rounded-lg', icon: 'w-3.5 h-3.5', text: 'text-sm' }
  };

  const currentSize = sizeMap[size] || sizeMap.md;
  const isSelected = checked || indeterminate;

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return;
    e.stopPropagation();
    onChange();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onChange();
    }
  };

  const box = (
    <div
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      aria-label={ariaLabel}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`${currentSize.box} flex items-center justify-center transition-all duration-200 border ds-focus shrink-0 select-none ${
        disabled
          ? "opacity-40 cursor-not-allowed bg-[#141417] border-[#222227]"
          : "cursor-pointer active:scale-95"
      } ${
        isSelected && !disabled
          ? "bg-gradient-to-tr from-orange-500 to-amber-500 border-orange-400 text-white shadow-[0_0_14px_rgba(249,115,22,0.45)]" 
          : "bg-[#18181C] border-[#2E2E36] text-transparent hover:border-orange-500/60 hover:bg-[#202026]"
      } ${className}`}
    >
      {indeterminate ? (
        <Minus className={`${currentSize.icon} stroke-[3.5] text-white animate-[scaleIn_0.15s_ease-out]`} />
      ) : (
        <Check 
          className={`${currentSize.icon} stroke-[3.5] text-white transition-transform duration-150 ${
            checked ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
          }`} 
        />
      )}
    </div>
  );

  if (label) {
    return (
      <label 
        onClick={handleClick}
        className={`inline-flex items-center gap-2.5 select-none ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${className}`}
      >
        {box}
        <span className={`${currentSize.text} font-medium text-[#E4E4E7] leading-none`}>
          {label}
        </span>
      </label>
    );
  }

  return box;
}
