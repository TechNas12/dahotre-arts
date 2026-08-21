"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Search } from "lucide-react";

export interface DropdownOption {
  id: string | number | boolean;
  name: string;
}

export interface DropdownProps {
  name?: string;
  options: DropdownOption[];
  value: any;
  onChange: (val: any) => void;
  compact?: boolean;
  className?: string;
  placeholder?: string;
  searchable?: boolean;
}

export function Dropdown({ 
  name, 
  options, 
  value, 
  onChange, 
  compact = false, 
  className = "w-full",
  placeholder = "Select",
  searchable
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = options.find(o => o.id === value);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const shouldShowSearch = searchable ?? (options.length > 7);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    return options.filter(opt => 
      opt.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search]);

  const toggleOpen = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 6,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 160)
      });
      setSearch("");
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (isOpen && shouldShowSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen, shouldShowSearch]);

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
          top: rect.bottom + window.scrollY + 6,
          left: rect.left + window.scrollX,
          width: Math.max(rect.width, 160)
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
      className="ds-dropdown custom-scrollbar min-w-[180px]"
      role="listbox"
    >
      {shouldShowSearch && (
        <div className="p-1.5 pb-2 border-b border-[#222227] mb-1">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-[#71717A] absolute left-2.5 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full bg-[#121215] border border-[#26262B] text-xs text-[#FAFAFA] rounded-lg pl-8 pr-2 py-1.5 outline-none focus:border-orange-500/70"
              onClick={e => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      <div className="space-y-0.5 max-h-56 overflow-y-auto custom-scrollbar">
        {filteredOptions.length === 0 ? (
          <div className="px-3 py-3 text-xs text-center text-[#71717A]">
            No options found
          </div>
        ) : (
          filteredOptions.map(opt => {
            const isSelected = value === opt.id;
            return (
              <div
                key={String(opt.id)}
                role="option"
                aria-selected={isSelected}
                onClick={() => { 
                  onChange(opt.id); 
                  setIsOpen(false); 
                }}
                className={`flex items-center justify-between ${
                  isSelected ? 'ds-dropdown-option-active' : 'ds-dropdown-option'
                }`}
              >
                <span className="truncate">{opt.name}</span>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-orange-400 shrink-0 ml-2 animate-[scaleIn_0.15s_ease-out]" />
                )}
              </div>
            );
          })
        )}
      </div>
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
        className={`w-full ${compact ? 'py-1.5 px-3 text-xs' : 'py-2 px-3.5 text-sm'} bg-[#18181C] hover:bg-[#202026] border border-[#222227] hover:border-[#2E2E36] text-[#FAFAFA] rounded-xl outline-none focus:border-orange-500/70 focus:ring-2 focus:ring-orange-500/20 transition-all flex items-center justify-between ds-focus cursor-pointer shadow-sm`}
      >
        <span className="truncate pr-2 font-medium">
          {selected?.name || placeholder}
        </span>
        <ChevronDown 
          className={`w-4 h-4 text-[#71717A] shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-orange-400" : ""
          }`} 
        />
      </button>
      {menu}
    </div>
  );
}
