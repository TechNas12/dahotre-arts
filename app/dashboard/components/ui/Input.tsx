"use client";

import React, { forwardRef } from "react";
import { X } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ComponentType<{ className?: string }>;
  rightIcon?: React.ComponentType<{ className?: string }>;
  onClear?: () => void;
  error?: string;
  helperText?: string;
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    className = "",
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    onClear,
    value,
    error,
    helperText,
    label,
    id,
    disabled,
    ...props
  },
  ref
) {
  const showClear = Boolean(onClear && value && !disabled);

  return (
    <div className="w-full space-y-1">
      {label && (
        <label 
          htmlFor={id} 
          className="block text-xs font-semibold text-[#A1A1AA] select-none"
        >
          {label} {props.required && <span className="text-orange-400">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        {LeftIcon && (
          <div className="absolute left-3 flex items-center pointer-events-none text-[#71717A]">
            <LeftIcon className="w-4 h-4" />
          </div>
        )}

        <input
          ref={ref}
          id={id}
          value={value}
          disabled={disabled}
          className={`w-full bg-[#18181C] border text-sm text-[#FAFAFA] rounded-xl outline-none transition-all duration-200 placeholder:text-[#71717A] ds-focus ${
            LeftIcon ? "pl-9" : "pl-3.5"
          } ${
            showClear || RightIcon ? "pr-9" : "pr-3.5"
          } ${
            error 
              ? "border-red-500/80 focus:border-red-500 focus:ring-2 focus:ring-red-500/20" 
              : "border-[#222227] hover:border-[#2E2E36] focus:border-orange-500/70 focus:ring-2 focus:ring-orange-500/20"
          } ${
            disabled ? "opacity-50 cursor-not-allowed bg-[#141417]" : ""
          } py-2 ${className}`}
          {...props}
        />

        {showClear ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onClear?.();
            }}
            className="absolute right-2.5 p-1 rounded-md text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#222228] transition-colors cursor-pointer"
            title="Clear"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : RightIcon ? (
          <div className="absolute right-3 flex items-center pointer-events-none text-[#71717A]">
            <RightIcon className="w-4 h-4" />
          </div>
        ) : null}
      </div>

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
