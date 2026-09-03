"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Search } from "lucide-react";

export interface DropdownOption {
  id: string | number | boolean;
  name: string;
  badge?: string;
  badgeColor?: string;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
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
  disabled?: boolean;
  id?: string;
}

export function Dropdown({ 
  name, 
  options, 
  value, 
  onChange, 
  compact = false, 
  className = "w-full",
  placeholder = "Select",
  searchable,
  disabled = false,
  id
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const selected = options.find(o => o.id === value);
  
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const shouldShowSearch = searchable ?? (options.length > 7);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(opt => 
      opt.name.toLowerCase().includes(q) || (opt.badge && opt.badge.toLowerCase().includes(q))
    );
  }, [options, search]);

  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 6,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 160)
      });
    }
  }, []);

  const toggleOpen = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
      setSearch("");
      const selIdx = filteredOptions.findIndex(o => o.id === value);
      setHighlightedIndex(selIdx >= 0 ? selIdx : 0);
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
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        buttonRef.current?.focus();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          const opt = filteredOptions[highlightedIndex];
          if (!opt.disabled) {
            onChange(opt.id);
            setIsOpen(false);
            buttonRef.current?.focus();
          }
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, highlightedIndex, filteredOptions, onChange]);

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, updatePosition]);

  const menu = isOpen && typeof document !== 'undefined' ? createPortal(
    <div
      ref={dropdownRef}
      style={{ top: coords.top, left: coords.left, width: coords.width }}
      className="ds-dropdown custom-scrollbar min-w-[180px] shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/[0.08] bg-[#141418]/98"
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
              onChange={e => {
                setSearch(e.target.value);
                setHighlightedIndex(0);
              }}
              placeholder="Search options..."
              className="w-full bg-[#121215] border border-[#26262B] text-xs text-[#FAFAFA] rounded-lg pl-8 pr-2 py-1.5 outline-none focus:border-orange-500/70"
              onClick={e => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      <div ref={listRef} className="space-y-0.5 max-h-56 overflow-y-auto custom-scrollbar">
        {filteredOptions.length === 0 ? (
          <div className="px-3 py-3 text-xs text-center text-[#71717A]">
            No options found
          </div>
        ) : (
          filteredOptions.map((opt, idx) => {
            const isSelected = value === opt.id;
            const isHighlighted = highlightedIndex === idx;
            const Icon = opt.icon;

            return (
              <div
                key={String(opt.id)}
                role="option"
                aria-selected={isSelected}
                aria-disabled={opt.disabled}
                onClick={(e) => { 
                  e.stopPropagation();
                  if (opt.disabled) return;
                  onChange(opt.id); 
                  setIsOpen(false); 
                }}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={`flex items-center justify-between ${
                  opt.disabled
                    ? 'opacity-40 cursor-not-allowed px-3 py-2 text-xs'
                    : isSelected 
                      ? 'ds-dropdown-option-active' 
                      : isHighlighted
                        ? 'bg-[#222228] text-[#FAFAFA] px-3 py-2 text-xs sm:text-sm font-medium rounded-xl cursor-pointer'
                        : 'ds-dropdown-option'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {Icon && <Icon className="w-3.5 h-3.5 shrink-0 text-orange-400" />}
                  <span className="truncate">{opt.name}</span>
                  {opt.badge && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${opt.badgeColor || 'bg-[#222228] text-[#A1A1AA]'}`}>
                      {opt.badge}
                    </span>
                  )}
                </div>
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
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={toggleOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
            e.preventDefault();
            toggleOpen();
          }
        }}
        className={`w-full ${compact ? 'py-1.5 px-3 text-xs' : 'py-2 px-3.5 text-sm'} ${
          disabled ? 'opacity-40 cursor-not-allowed bg-[#141417]' : 'cursor-pointer hover:bg-[#202026] hover:border-[#2E2E36]'
        } bg-[#18181C] border border-[#222227] text-[#FAFAFA] rounded-xl outline-none focus:border-orange-500/70 focus:ring-2 focus:ring-orange-500/20 transition-all flex items-center justify-between ds-focus shadow-sm`}
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
