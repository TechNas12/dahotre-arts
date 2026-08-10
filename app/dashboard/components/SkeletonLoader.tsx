"use client";

export function SkeletonLoader({ className = "", type = "rect" }: { className?: string, type?: "rect" | "circle" | "text" }) {
  const baseClass = "shimmer-loading rounded-lg";
  if (type === "circle") {
    return <div className={`rounded-full ${baseClass} ${className}`}></div>;
  }
  if (type === "text") {
    return <div className={`h-4 ${baseClass} ${className}`}></div>;
  }
  return <div className={`${baseClass} ${className}`}></div>;
}

