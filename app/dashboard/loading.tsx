import { Loader2, Flower2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex-1 h-[60vh] flex flex-col items-center justify-center animate-[fadeInUp_0.4s_ease-out_forwards]">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-[#1F1F1F] animate-[spin_3s_linear_infinite] shadow-[0_0_30px_rgba(249,115,22,0.2)]" />
        <div className="w-16 h-16 rounded-full border-4 border-orange-500 border-t-transparent animate-spin absolute inset-0 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
      </div>
      <h2 className="text-lg font-semibold text-[#F5F5F5] mt-6 mb-2 tracking-wide">Wait On ...</h2>
      <p className="text-[#737373] text-sm animate-pulse flex items-center gap-1.5">
        Ganapati Bappa Morya
        <Flower2 className="w-4 h-4 text-orange-400" />
      </p>
    </div>
  );
}
