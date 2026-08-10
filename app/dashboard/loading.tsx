import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex-1 h-[60vh] flex flex-col items-center justify-center animate-[fadeInUp_0.4s_ease-out_forwards]">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-[#1F1F1F] animate-[spin_3s_linear_infinite]" />
        <div className="w-16 h-16 rounded-full border-4 border-orange-500 border-t-transparent animate-spin absolute inset-0" />
      </div>
      <h2 className="text-lg font-semibold text-[#F5F5F5] mt-6 mb-2 tracking-wide">Wait On ...</h2>
      <p className="text-[#737373] text-sm animate-pulse">Ganapati Bappa Morya.</p>
    </div>
  );
}
