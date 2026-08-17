"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

interface DropdownOption {
  id: string | number | boolean;
  name: string;
}

interface DropdownProps {
  name?: string;
  options: DropdownOption[];
  value: any;
  onChange: (val: any) => void;
  compact?: boolean;
  className?: string;
  placeholder?: string;
}

export function Dropdown({ 
  name, 
  options, 
  value, 
  onChange, 
  compact = false, 
  className = "w-full",
  placeholder = "Select"
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find(o => o.id === value);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const toggleOpen = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (buttonRef.current?.contains(e.target as Node)) return;
      if (dropdownRef.current?.contains(e.target as Node)) return;
      setIsOpen(false);
    };
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const updatePosition = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setCoords({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width
        });
      }
    };
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen]);

  const menu = isOpen && typeof document !== 'undefined' ? createPortal(
    <div
      ref={dropdownRef}
      style={{ top: coords.top, left: coords.left, width: coords.width }}
      className="ds-dropdown"
      role="listbox"
    >
      {options.map(opt => (
        <div
          key={String(opt.id)}
          role="option"
          aria-selected={value === opt.id}
          onClick={() => { onChange(opt.id); setIsOpen(false); }}
          className={value === opt.id ? 'ds-dropdown-option-active' : 'ds-dropdown-option'}
        >
          {opt.name}
        </div>
      ))}
    </div>,
    document.body
  ) : null;

  return (
    <div className={`relative ${className}`}>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={toggleOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleOpen();
          }
        }}
        className={`w-full ${compact ? 'py-1.5 px-3' : 'p-2'} bg-[#1A1A1A] border border-[#1F1F1F] text-[#F5F5F5] rounded-lg text-sm outline-none hover:border-[#2A2A2A] transition-colors flex items-center justify-between ds-focus`}
      >
        <span className="truncate pr-2">{selected?.name || placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {menu}
    </div>
  );
}
