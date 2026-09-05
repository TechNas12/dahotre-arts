import { useEffect } from "react";

type UsePOSHotkeysOptions = {
  onFocusSearch?: () => void;
  onCheckout?: () => void;
  onEscape?: () => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
};

export function usePOSHotkeys({
  onFocusSearch,
  onCheckout,
  onEscape,
  searchInputRef,
}: UsePOSHotkeysOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if modifier keys like Alt are pressed
      if (e.altKey) return;

      // 1. Focus search with Ctrl+K or / (if not in an input/textarea)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef?.current?.focus();
        onFocusSearch?.();
        return;
      }

      if (e.key === "/" && !(document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA")) {
        e.preventDefault();
        searchInputRef?.current?.focus();
        onFocusSearch?.();
        return;
      }

      // 2. Quick checkout with Ctrl+Enter or F9
      if (((e.ctrlKey || e.metaKey) && e.key === "Enter") || e.key === "F9") {
        e.preventDefault();
        onCheckout?.();
        return;
      }

      // 3. Escape to close or clear
      if (e.key === "Escape") {
        onEscape?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onFocusSearch, onCheckout, onEscape, searchInputRef]);
}
