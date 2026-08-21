"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2 } from "lucide-react";

type ConfirmDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  error?: string;
};

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = true,
  isLoading = false,
  error,
}: ConfirmDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, isLoading, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/75 z-[99999] flex items-center justify-center p-4 backdrop-blur-md animate-[fadeIn_0.15s_ease-out]"
      onClick={(e) => {
        if (e.target === overlayRef.current && !isLoading) onClose();
      }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
    >
      <div className="bg-[#121215] border border-[#2E2E36] rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] p-6 w-full max-w-md animate-[scaleIn_0.15s_ease-out] relative overflow-hidden">
        {/* Subtle accent glow */}
        <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-20 ${isDestructive ? 'bg-red-500' : 'bg-orange-500'}`} />

        <div className="flex items-start gap-4 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
            isDestructive 
              ? "bg-red-500/10 border-red-500/20 text-red-400" 
              : "bg-orange-500/10 border-orange-500/20 text-orange-400"
          }`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 id="dialog-title" className="text-lg font-bold text-[#FAFAFA] tracking-tight">
              {title}
            </h3>
            <p id="dialog-description" className="text-[#A1A1AA] mt-1 text-sm leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-[#A1A1AA] hover:text-[#FAFAFA] bg-[#18181C] hover:bg-[#222227] border border-[#222227] rounded-xl transition-all disabled:opacity-50 ds-focus cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-xl transition-all disabled:opacity-70 flex items-center gap-2 ds-focus cursor-pointer shadow-sm ${
              isDestructive
                ? "bg-red-600 hover:bg-red-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                : "ds-btn-primary"
            }`}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
