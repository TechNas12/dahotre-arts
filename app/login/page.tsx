"use client";

import { useState, useActionState } from "react";
import { Mail, Lock, Eye, EyeOff, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { loginAction } from "@/app/actions/auth";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  
  // Use React 19's useActionState for form handling
  const [state, action, isPending] = useActionState(loginAction, undefined);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#09090B] relative overflow-hidden p-4">
      {/* Ambient Radial Gradient Background Glow */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-orange-600/15 via-orange-500/10 to-transparent rounded-full blur-[120px]" />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-orange-950/20 rounded-full blur-[100px]" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-950/20 rounded-full blur-[100px]" />
      </div>

      <div className="z-10 w-full max-w-md animate-[fadeInUp_0.4s_ease-out_forwards]">
        {/* Login Card */}
        <div className="ds-glass-card rounded-3xl p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-white/[0.08] relative overflow-hidden">
          
          {/* Top Decorative Border Glow */}
          <div className="absolute top-0 left-12 right-12 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />

          {/* Brand Header */}
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-2xl flex items-center justify-center border border-orange-500/30 mb-4 shadow-[0_0_20px_rgba(249,115,22,0.2)]">
              <Sparkles className="w-7 h-7 text-orange-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#FAFAFA] tracking-tight">
              Dahotre Arts
            </h1>
            <p className="text-[#A1A1AA] mt-1.5 text-xs sm:text-sm">
              Point of Sale & Retail Studio
            </p>
          </div>

          {/* Form */}
          <form action={action} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] ml-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-[#71717A]" />
                </div>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="admin@dahotrearts.com"
                  className="ds-input block w-full pl-10 pr-3.5 py-2.5 rounded-xl !bg-[#18181C]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] ml-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-[#71717A]" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  placeholder="••••••••••••"
                  className="ds-input block w-full pl-10 pr-10 py-2.5 rounded-xl !bg-[#18181C]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#71717A] hover:text-[#FAFAFA] transition-colors ds-focus rounded-lg cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {state?.error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3 animate-[fadeIn_0.2s_ease-out]" aria-live="polite">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-rose-300 font-medium leading-relaxed">{state.error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="ds-btn-primary w-full flex items-center justify-center py-2.5 sm:py-3 px-4 rounded-xl text-sm font-semibold glow-orange disabled:opacity-60 disabled:cursor-not-allowed mt-2 ds-focus cursor-pointer"
            >
              {isPending ? (
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
              ) : null}
              {isPending ? "Signing In..." : "Sign In to Studio"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[#71717A] text-xs mt-6 font-medium">
          &copy; {new Date().getFullYear()} Dahotre Arts &bull; All rights reserved.
        </p>
      </div>
    </div>
  );
}
