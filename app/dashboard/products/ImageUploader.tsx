"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { 
  UploadCloud, X, Loader2, Image as ImageIcon, 
  ZoomIn, Clipboard, Trash2, Check 
} from "lucide-react";
import { imagePresets } from "@/lib/cloudinary";
import ImageViewerModal from "../components/ui/ImageViewerModal";

type ImageUploaderProps = {
  existingUrls?: string[];
  onUrlsChange: (urls: string[]) => void;
  compact?: boolean;
  productName?: string;
  productCode?: string;
};

type UploadingFile = {
  id: string;
  file: File;
  progress: number;
  url?: string;
  error?: string;
};

export default function ImageUploader({
  existingUrls = [],
  onUrlsChange,
  compact = false,
  productName,
  productCode,
}: ImageUploaderProps) {
  const [urls, setUrls] = useState<string[]>(existingUrls);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  // Sync internal urls if existingUrls changes from parent
  useEffect(() => {
    setUrls(existingUrls);
  }, [existingUrls]);

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  const uploadFile = useCallback(async (file: File, id: string) => {
    if (!cloudName || !uploadPreset) {
      setUploadingFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, error: "Cloudinary not configured" } : f))
      );
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    try {
      // Progress simulation for responsive feedback
      const progressInterval = setInterval(() => {
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === id && f.progress < 90
              ? { ...f, progress: f.progress + 15 }
              : f
          )
        );
      }, 150);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      clearInterval(progressInterval);

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      const data = await res.json();
      const newUrl = data.secure_url;

      setUploadingFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, progress: 100, url: newUrl } : f))
      );

      // Update state and inform parent
      setUrls((prev) => {
        const updated = [...prev, newUrl];
        setTimeout(() => onUrlsChange(updated), 0);
        return updated;
      });

      setTimeout(() => {
        setUploadingFiles((prev) => prev.filter((f) => f.id !== id));
      }, 800);
    } catch (err) {
      console.error("Image upload error:", err);
      setUploadingFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, error: "Upload failed" } : f))
      );
    }
  }, [cloudName, uploadPreset, onUrlsChange]);

  const handleFiles = useCallback((files: FileList | File[] | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles = fileArray.filter((file) => file.type.startsWith("image/"));

    if (validFiles.length === 0) return;

    const newUploads: UploadingFile[] = validFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      progress: 0,
    }));

    setUploadingFiles((prev) => [...prev, ...newUploads]);

    newUploads.forEach((upload) => {
      uploadFile(upload.file, upload.id);
    });
  }, [uploadFile]);

  // Global & scoped Clipboard Paste handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items || items.length === 0) return;

      const pastedFiles: File[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf("image") !== -1) {
          const file = item.getAsFile();
          if (file) {
            // Give pasted screenshots a clear filename
            const filename = `pasted-image-${Date.now()}-${i + 1}.${item.type.split("/")[1] || "png"}`;
            const renamedFile = new File([file], filename, { type: file.type });
            pastedFiles.push(renamedFile);
          }
        }
      }

      if (pastedFiles.length > 0) {
        e.preventDefault();
        handleFiles(pastedFiles);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handleFiles]);

  const handleRemove = (urlToRemove: string) => {
    const newUrls = urls.filter((url) => url !== urlToRemove);
    setUrls(newUrls);
    onUrlsChange(newUrls);
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const openViewer = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  return (
    <>
      <div className={`flex ${compact ? "flex-row items-center gap-2" : "flex-col gap-4"} h-full`}>
        {/* Dropzone & Paste Area */}
        <div
          ref={dropzoneRef}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            flex items-center justify-center border-2 border-dashed rounded-xl cursor-pointer
            transition-all duration-200 group relative
            ${
              isDragging
                ? "border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/10 scale-[1.01]"
                : "border-[#2A2A34] bg-[#141418] hover:border-orange-500/60 hover:bg-[#1A1A20]"
            }
            ${compact ? "w-12 h-12 p-0 shrink-0" : "w-full p-6 text-center"}
          `}
          title="Click to browse, drag & drop, or paste (Ctrl+V) from clipboard"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFiles(e.target.files)}
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
          />
          {compact ? (
            <UploadCloud className="w-5 h-5 text-[#8E8E93] group-hover:text-orange-400 transition-colors" />
          ) : (
            <div className="flex flex-col items-center gap-2.5 select-none">
              <div className="w-12 h-12 rounded-2xl bg-[#1E1E26] border border-[#2E2E3C] flex items-center justify-center text-orange-400 group-hover:scale-110 group-hover:bg-orange-500/10 transition-all shadow-sm">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#F5F5F5]">
                  Drop images here, or <span className="text-orange-400 underline underline-offset-2">browse files</span>
                </p>
                <p className="text-xs text-[#8E8E93] mt-1 flex items-center justify-center gap-1.5 flex-wrap">
                  <span>Supports JPG, PNG, WebP</span>
                  <span className="text-[#44444C]">•</span>
                  <span className="inline-flex items-center gap-1 bg-[#1E1E26] text-orange-400/90 border border-[#2E2E3C] px-1.5 py-0.5 rounded text-[11px] font-medium">
                    <Clipboard className="w-3 h-3" /> Paste clipboard (Ctrl+V)
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Grid of uploaded + uploading thumbnails */}
        {(urls.length > 0 || uploadingFiles.length > 0) && (
          <div
            className={`flex gap-3 overflow-x-auto pb-2 custom-scrollbar ${
              compact ? "flex-1 items-center" : "w-full"
            }`}
          >
            {/* Uploaded images */}
            {urls.map((url, i) => (
              <div
                key={`url-${i}`}
                onClick={() => openViewer(i)}
                className="relative group shrink-0 rounded-xl overflow-hidden border border-[#2A2A34] bg-[#1A1A20] hover:border-orange-500/60 transition-all cursor-pointer flex-shrink-0 shadow-sm"
                style={{ width: compact ? "48px" : "84px", height: compact ? "48px" : "84px" }}
              >
                <img
                  src={imagePresets.table(url)}
                  alt={`Product image ${i + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />

                {/* Hover overlay action buttons */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openViewer(i);
                    }}
                    className="p-1.5 bg-black/60 hover:bg-orange-500 text-white rounded-lg transition-colors shadow-md"
                    title="View full image"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(url);
                    }}
                    className="p-1.5 bg-black/60 hover:bg-rose-500 text-white rounded-lg transition-colors shadow-md"
                    title="Delete image"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* Uploading Progress Cards */}
            {uploadingFiles.map((f) => (
              <div
                key={f.id}
                className="relative shrink-0 rounded-xl border border-[#2E2E3C] bg-[#16161C] flex flex-col items-center justify-center flex-shrink-0 shadow-sm"
                style={{ width: compact ? "48px" : "84px", height: compact ? "48px" : "84px" }}
              >
                {f.error ? (
                  <div className="text-rose-400 flex flex-col items-center p-1 text-center">
                    <X className={compact ? "w-4 h-4" : "w-5 h-5"} />
                    {!compact && <span className="text-[9px] text-rose-400 mt-1">Failed</span>}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Loader2 className={`${compact ? "w-4 h-4" : "w-5 h-5"} text-orange-400 animate-spin`} />
                    {!compact && (
                      <span className="text-[10px] font-bold font-mono text-orange-400">
                        {f.progress}%
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full Product Image Lightbox Modal */}
      <ImageViewerModal
        images={urls}
        initialIndex={viewerIndex}
        title={productCode ? `${productCode} - ${productName || "Product Image"}` : productName || "Product Image"}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </>
  );
}
