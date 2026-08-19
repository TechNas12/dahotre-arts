"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { 
  X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, 
  Download, Copy, Check, ExternalLink, Image as ImageIcon 
} from "lucide-react";
import { imagePresets } from "@/lib/cloudinary";

export type ImageViewerModalProps = {
  images: string[];
  initialIndex?: number;
  title?: string;
  subtitle?: string;
  isOpen: boolean;
  onClose: () => void;
};

export default function ImageViewerModal({
  images,
  initialIndex = 0,
  title,
  subtitle,
  isOpen,
  onClose,
}: ImageViewerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, images.length - 1)));
      setIsZoomed(false);
    }
  }, [isOpen, initialIndex, images.length]);

  const handleNext = useCallback(() => {
    if (images.length <= 1) return;
    setIsZoomed(false);
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const handlePrev = useCallback(() => {
    if (images.length <= 1) return;
    setIsZoomed(false);
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const handleCopyUrl = () => {
    const currentUrl = images[currentIndex];
    if (currentUrl && navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = async () => {
    const currentUrl = images[currentIndex];
    if (!currentUrl) return;
    try {
      const res = await fetch(currentUrl);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `product-image-${currentIndex + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(currentUrl, "_blank");
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, handleNext, handlePrev]);

  if (!mounted || !isOpen || images.length === 0) return null;

  const currentRawUrl = images[currentIndex];
  const currentOptimizedUrl = imagePresets.full(currentRawUrl);

  return createPortal(
    <div 
      className="fixed inset-0 z-[1000005] bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-[fadeIn_0.15s_ease-out]"
      onClick={onClose}
    >
      {/* Top Header Bar */}
      <div 
        className="flex items-center justify-between gap-4 z-10 shrink-0 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#1A1A1E] border border-[#2E2E38] flex items-center justify-center text-orange-400 shrink-0">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            {title && (
              <h3 className="text-base sm:text-lg font-bold text-[#F5F5F5] truncate">
                {title}
              </h3>
            )}
            <div className="flex items-center gap-3 text-xs text-[#8E8E93]">
              {images.length > 1 && (
                <span>
                  Photo <strong className="text-orange-400">{currentIndex + 1}</strong> of {images.length}
                </span>
              )}
              {subtitle && <span>• {subtitle}</span>}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsZoomed((prev) => !prev)}
            className={`p-2.5 rounded-xl border transition-colors ${
              isZoomed 
                ? "bg-orange-500/20 text-orange-400 border-orange-500/40" 
                : "bg-[#16161A] hover:bg-[#222228] text-[#A3A3A3] hover:text-[#F5F5F5] border-[#2A2A34]"
            }`}
            title={isZoomed ? "Zoom out (Fit to screen)" : "Zoom in (Original size)"}
          >
            {isZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={handleCopyUrl}
            className="p-2.5 rounded-xl border border-[#2A2A34] bg-[#16161A] hover:bg-[#222228] text-[#A3A3A3] hover:text-[#F5F5F5] transition-colors"
            title="Copy image link"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="p-2.5 rounded-xl border border-[#2A2A34] bg-[#16161A] hover:bg-[#222228] text-[#A3A3A3] hover:text-[#F5F5F5] transition-colors"
            title="Download image"
          >
            <Download className="w-4 h-4" />
          </button>

          <a
            href={currentRawUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-xl border border-[#2A2A34] bg-[#16161A] hover:bg-[#222228] text-[#A3A3A3] hover:text-[#F5F5F5] transition-colors"
            title="Open original in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl border border-[#33333E] bg-[#22222A] hover:bg-[#2E2E38] text-[#F5F5F5] transition-colors ml-2"
            title="Close viewer (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div 
        className="flex-1 flex items-center justify-center relative overflow-hidden my-4 min-h-0 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Navigation Previous Arrow */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-2 sm:left-4 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xl backdrop-blur-sm"
            title="Previous image (Left arrow)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Current Image */}
        <div 
          className={`relative max-w-full max-h-full transition-all duration-200 flex items-center justify-center ${
            isZoomed ? "overflow-auto cursor-zoom-out" : "cursor-zoom-in"
          }`}
          onClick={() => setIsZoomed((prev) => !prev)}
        >
          <img
            src={currentOptimizedUrl}
            alt={title || "Product image"}
            className={`rounded-xl object-contain shadow-2xl transition-transform duration-200 ${
              isZoomed 
                ? "max-w-none max-h-none scale-125" 
                : "max-w-[88vw] max-h-[72vh]"
            }`}
          />
        </div>

        {/* Navigation Next Arrow */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-2 sm:right-4 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xl backdrop-blur-sm"
            title="Next image (Right arrow)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip */}
      <div 
        className="shrink-0 z-10 flex items-center justify-center select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {images.length > 1 ? (
          <div className="flex items-center gap-2 p-2 bg-[#141418]/90 border border-[#24242E] rounded-2xl max-w-full overflow-x-auto custom-scrollbar backdrop-blur-md shadow-2xl">
            {images.map((url, idx) => {
              const isSelected = idx === currentIndex;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setIsZoomed(false);
                    setCurrentIndex(idx);
                  }}
                  className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                    isSelected 
                      ? "border-orange-500 scale-105 shadow-md shadow-orange-500/20" 
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img
                    src={imagePresets.thumbnail(url)}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-xs text-[#737373]">
            Click image or press <kbd className="bg-[#1F1F24] text-[#A3A3A3] px-1.5 py-0.5 rounded border border-[#2A2A32] text-[10px]">Esc</kbd> to exit
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
