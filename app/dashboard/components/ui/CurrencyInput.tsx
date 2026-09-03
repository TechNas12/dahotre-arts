"use client";

import React, { forwardRef } from "react";
import { IndianRupee, X } from "lucide-react";

export interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string | number;
  onChange: (val: string) => void;
  label?: string;
  error?: string;
  helperText?: string;
  quickAmounts?: number[];
  showQuickChips?: boolean;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(function CurrencyInput(
  {
    value,
    onChange,
    label,
    error,
    helperText,
    quickAmounts = [100, 500, 1000, 2000],
    showQuickChips = false,
    className = "",
    id,
    disabled,
    ...props
  },
  ref
) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, "");
    onChange(raw);
  };

  const addAmount = (addVal: number) => {
    const current = parseFloat(String(value)) || 0;
    onChange(String(current + addVal));
  };

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-[#A1A1AA] select-none">
          {label} {props.required && <span className="text-orange-400">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        <div className="absolute left-3 flex items-center pointer-events-none text-orange-400 font-bold">
          <IndianRupee className="w-4 h-4" />
        </div>

        <input
          ref={ref}
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          disabled={disabled}
          onChange={handleInputChange}
          placeholder="0.00"
          className={`w-full bg-[#18181C] border font-mono text-sm text-[#FAFAFA] rounded-xl outline-none pl-9 pr-8 py-2 transition-all duration-200 ds-focus ${
            error 
              ? "border-red-500/80 focus:border-red-500 focus:ring-2 focus:ring-red-500/20" 
              : "border-[#222227] hover:border-[#2E2E36] focus:border-orange-500/70 focus:ring-2 focus:ring-orange-500/20"
          } ${disabled ? "opacity-50 cursor-not-allowed bg-[#141417]" : ""} ${className}`}
          {...props}
        />

        {value && !disabled && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2.5 p-1 rounded-md text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#222228] transition-colors cursor-pointer"
            title="Clear"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {showQuickChips && !disabled && (
        <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto no-scrollbar">
          <span className="text-[10px] uppercase font-bold text-[#71717A] shrink-0 mr-0.5">+ Add:</span>
          {quickAmounts.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => addAmount(amt)}
              className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-lg bg-[#1C1C22] hover:bg-[#26262E] text-[#D4D4D8] hover:text-white border border-[#2B2B34] transition-all shrink-0 cursor-pointer active:scale-95"
            >
              +₹{amt}
            </button>
          ))}
        </div>
      )}

      {error ? (
        <p className="text-[11px] font-medium text-red-400 animate-[fadeIn_0.15s_ease-out]">
          {error}
        </p>
      ) : helperText ? (
        <p className="text-[11px] text-[#71717A]">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});
