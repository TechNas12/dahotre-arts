"use client";

import { useEffect, useState } from "react";

export function LiveBadge({ isConnected }: { isConnected: boolean }) {
  const [show, setShow] = useState(false);
  
  useEffect(() => {
    // Small delay to prevent flashing on fast loads
    const timer = setTimeout(() => setShow(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  if (isConnected) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-[10px] font-bold text-green-400 tracking-wider uppercase" title="Live updates active">
        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
        Live
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-[#1A1A1A] border border-[#1F1F1F] rounded text-[10px] font-bold text-[#737373] tracking-wider uppercase" title="Live updates disconnected">
      <div className="w-1.5 h-1.5 rounded-full bg-[#737373]"></div>
      Offline
    </div>
  );
}
