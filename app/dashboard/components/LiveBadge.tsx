"use client";

import { useEffect, useState } from "react";
import { Radio } from "lucide-react";

export function LiveBadge({ isConnected }: { isConnected: boolean }) {
  const [show, setShow] = useState(false);
  
  useEffect(() => {
    // Small delay to prevent flashing on fast loads
    const timer = setTimeout(() => setShow(true), 800);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  if (isConnected) {
    return (
      <div 
        className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/25 rounded-full text-[11px] font-semibold text-emerald-400 tracking-wider uppercase shadow-[0_0_12px_rgba(16,185,129,0.15)] animate-[scaleIn_0.2s_ease-out]" 
        title="Realtime sync connected to database"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        Realtime
      </div>
    );
  }

  return (
    <div 
      className="flex items-center gap-1.5 px-2.5 py-1 bg-[#18181C] border border-[#222227] rounded-full text-[11px] font-semibold text-[#71717A] tracking-wider uppercase" 
      title="Realtime updates offline"
    >
      <span className="inline-flex rounded-full h-2 w-2 bg-[#71717A]"></span>
      Offline
    </div>
  );
}
