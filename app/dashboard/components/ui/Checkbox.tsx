import { Check } from "lucide-react";

interface CheckboxProps {
  checked: boolean;
  onChange: () => void;
  className?: string;
  ariaLabel?: string;
}

export function Checkbox({ checked, onChange, className = "", ariaLabel = "Select" }: CheckboxProps) {
  return (
    <div
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onChange();
        }
      }}
      className={`w-4 h-4 rounded flex items-center justify-center cursor-pointer transition-colors border ds-focus ${
        checked 
          ? "bg-orange-500 border-orange-500 text-[#0A0A0A]" 
          : "bg-[#1A1A1A] border-[#1F1F1F] text-transparent hover:border-[#2A2A2A]"
      } ${className}`}
    >
      <Check className="w-3 h-3 stroke-[3]" />
    </div>
  );
}
