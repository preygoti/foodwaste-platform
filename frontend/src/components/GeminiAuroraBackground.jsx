import React from "react";

/**
 * GeminiAuroraBackground
 * 
 * High-performance, GPU-accelerated, dynamic colorful background inspired by Google Gemini.
 * Features fluid animated mesh gradients, floating prismatic orbs (cobalt blue, violet,
 * magenta, electric cyan, and warm amber), and subtle luminous auras.
 * 
 * Designed to fit seamlessly inside ANY element across all screen sizes (mobile phones,
 * tablets, laptops, and desktop displays) with zero pointer-event interception.
 * 
 * @param {string} variant - 'subtle' | 'vibrant' | 'header' | 'card' | 'cosmic'
 * @param {string} className - Additional CSS classes
 * @param {boolean} glowOrbs - Whether to render floating animated light orbs
 * @param {React.ReactNode} children - Optional overlay content
 */
export default function GeminiAuroraBackground({
  variant = "subtle",
  className = "",
  glowOrbs = true,
  children,
}) {
  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 overflow-hidden pointer-events-none rounded-[inherit] select-none ${className}`}
    >
      {/* 1. Base Aurora Mesh Gradient Layer */}
      {variant === "vibrant" && (
        <div className="absolute inset-0 opacity-30 sm:opacity-40 gemini-mesh-bg mix-blend-overlay" />
      )}

      {variant === "header" && (
        <div className="absolute inset-0 opacity-40 sm:opacity-55 gemini-mesh-bg" />
      )}

      {variant === "cosmic" && (
        <div className="absolute inset-0 opacity-60 sm:opacity-75 gemini-mesh-dark" />
      )}

      {/* 2. Floating Prismatic Light Orbs */}
      {glowOrbs && (
        <div className="absolute inset-0 overflow-hidden">
          {/* Orb 1: Google Gemini Electric Cobalt / Sapphire */}
          <div
            className="gemini-orb-1 absolute -top-[20%] -left-[10%] w-[60%] sm:w-[45%] aspect-square rounded-full bg-gradient-to-br from-blue-500/40 via-indigo-600/35 to-blue-400/20 blur-2xl sm:blur-3xl transform-gpu"
          />

          {/* Orb 2: Google Gemini Radiant Violet / Orchid */}
          <div
            className="gemini-orb-2 absolute -bottom-[20%] -right-[10%] w-[65%] sm:w-[50%] aspect-square rounded-full bg-gradient-to-tl from-purple-600/40 via-fuchsia-500/30 to-violet-400/20 blur-2xl sm:blur-3xl transform-gpu"
          />

          {/* Orb 3: Google Gemini Electric Cyan / Mint Teal */}
          <div
            className="gemini-orb-3 absolute top-[25%] right-[15%] w-[45%] sm:w-[35%] aspect-square rounded-full bg-gradient-to-tr from-cyan-400/35 via-teal-400/25 to-emerald-400/15 blur-xl sm:blur-2xl transform-gpu"
          />

          {/* Orb 4: Subtle Warm Amber / Coral Flare (Center Glow) */}
          <div
            className="gemini-orb-1 absolute top-[40%] left-[30%] w-[35%] sm:w-[25%] aspect-square rounded-full bg-gradient-to-r from-amber-400/20 via-rose-400/25 to-pink-500/20 blur-xl sm:blur-2xl transform-gpu opacity-70"
          />
        </div>
      )}

      {/* 3. Subtle Frosted Glass Depth Shimmer */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/10 mix-blend-overlay" />

      {/* Optional Content Slot */}
      {children}
    </div>
  );
}
