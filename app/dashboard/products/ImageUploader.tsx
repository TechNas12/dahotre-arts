"use client";

import { useState, useCallback, useRef } from "react";
import { UploadCloud, X, Loader2, Image as ImageIcon } from "lucide-react";

type ImageUploaderProps = {
  existingUrls?: string[];
  onUrlsChange: (urls: string[]) => void;
  compact?: boolean;
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
}: ImageUploaderProps) {
  const [urls, setUrls] = useState<string[]>(existingUrls);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  const uploadFile = async (file: File, id: string) => {
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
      // Simulate progress for UI since fetch doesn't have native upload progress
      const progressInterval = setInterval(() => {
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === id && f.progress < 90
              ? { ...f, progress: f.progress + 10 }
              : f
          )
        );
      }, 200);

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

      // Add to URLs and notify parent
      setUrls((prev) => {
        const newUrls = [...prev, newUrl];
        setTimeout(() => onUrlsChange(newUrls), 0);
        return newUrls;
      });

      // Remove from uploading list after a short delay
      setTimeout(() => {
        setUploadingFiles((prev) => prev.filter((f) => f.id !== id));
      }, 1000);
    } catch (err) {
      console.error(err);
      setUploadingFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, error: "Upload failed" } : f))
      );
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;

    const newUploads: UploadingFile[] = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => ({
        id: Math.random().toString(36).substring(7),
        file,
        progress: 0,
      }));

    if (newUploads.length === 0) return;

    setUploadingFiles((prev) => [...prev, ...newUploads]);

    newUploads.forEach((upload) => {
      uploadFile(upload.file, upload.id);
    });
  };

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
  }, []);

  return (
    <div className={`flex ${compact ? "flex-row items-center gap-2" : "flex-col gap-4"} h-full`}>
      {/* Dropzone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          flex items-center justify-center border-2 border-dashed rounded-xl cursor-pointer
          transition-colors duration-200
          ${
            isDragging
              ? "border-green-500 bg-green-500/10"
              : "border-slate-700 bg-slate-900 hover:border-slate-500 hover:bg-slate-800"
          }
          ${compact ? "w-12 h-12 p-0 shrink-0" : "w-full p-6 text-center"}
        `}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleFiles(e.target.files)}
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
        />
        {compact ? (
          <UploadCloud className="w-5 h-5 text-slate-400" />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <UploadCloud className="w-8 h-8 text-slate-400" />
            <div>
              <p className="text-sm font-medium text-slate-200">
                Drop images here
              </p>
              <p className="text-xs text-slate-500 mt-1">
                or click to browse
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Grid of uploaded + uploading */}
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
              className="relative group shrink-0 rounded-lg overflow-hidden border border-slate-700 bg-slate-800 flex-shrink-0"
              style={{ width: compact ? "48px" : "80px", height: compact ? "48px" : "80px" }}
            >
              <img
                src={url}
                alt={`Product ${i}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(url);
                }}
                className="absolute top-1 right-1 p-1 bg-red-500/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
              >
                <X className={compact ? "w-3 h-3" : "w-4 h-4"} />
              </button>
            </div>
          ))}

          {/* Uploading images */}
          {uploadingFiles.map((f) => (
            <div
              key={f.id}
              className="relative shrink-0 rounded-lg border border-slate-700 bg-slate-900 flex items-center justify-center flex-shrink-0"
              style={{ width: compact ? "48px" : "80px", height: compact ? "48px" : "80px" }}
            >
              {f.error ? (
                <div className="text-red-400 flex flex-col items-center">
                  <X className={compact ? "w-4 h-4" : "w-6 h-6"} />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Loader2 className={`${compact ? "w-4 h-4" : "w-6 h-6"} text-green-500 animate-spin`} />
                  {!compact && <span className="text-[10px] text-slate-400">{f.progress}%</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
