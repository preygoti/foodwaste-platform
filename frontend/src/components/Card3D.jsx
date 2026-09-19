import { useRef, useEffect, useCallback } from "react";

/**
 * High-performance 3D interactive card.
 * - Hardware-accelerated GPU transforms via direct DOM styling (Zero React re-render thrashing).
 * - Multi-tap / rapid-click protected: 100% hang-free, buttery-smooth on all devices.
 * - Desktop / Laptop: Smooth 3D tilt tracking cursor + dynamic glare.
 * - Mobile / Tablet / Touch: Tactile click spring pulse that ALWAYS returns to root position.
 */
export default function Card3D({
  children,
  className = "",
  maxTilt = 8,
  scale = 1.02,
  onClick,
}) {
  const cardRef = useRef(null);
  const glareRef = useRef(null);
  const resetTimerRef = useRef(null);
  const clickAnimTimerRef = useRef(null);

  // Helper to reset card to resting root position
  const resetToRoot = useCallback(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    if (!cardRef.current) return;

    cardRef.current.style.transition =
      "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)";
    cardRef.current.style.transform =
      "perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)";

    if (glareRef.current) {
      glareRef.current.style.transition = "opacity 0.35s ease-out";
      glareRef.current.style.opacity = "0";
    }
  }, []);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      if (clickAnimTimerRef.current) clearTimeout(clickAnimTimerRef.current);
    };
  }, []);

  // Desktop Hover: only when device supports true hover with fine pointer (mouse/trackpad)
  const isHoverDevice = () => {
    return (
      typeof window !== "undefined" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches
    );
  };

  const handlePointerMove = (e) => {
    // Only track cursor on mouse/fine pointer devices
    if (!isHoverDevice() || e.pointerType === "touch") return;
    if (!cardRef.current) return;

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }

    const rect = cardRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = (((y - centerY) / centerY) * -maxTilt).toFixed(2);
    const rotateY = (((x - centerX) / centerX) * maxTilt).toFixed(2);
    const glareX = ((x / rect.width) * 100).toFixed(1);
    const glareY = ((y / rect.height) * 100).toFixed(1);

    cardRef.current.style.transition = "transform 0.1s ease-out";
    cardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`;

    if (glareRef.current) {
      glareRef.current.style.transition = "opacity 0.15s ease-out";
      glareRef.current.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0) 65%)`;
      glareRef.current.style.opacity = "0.22";
    }
  };

  const handlePointerLeave = (e) => {
    if (e.pointerType === "touch") return;
    resetToRoot();
  };

  // Click / Tap Handler: Works on ALL devices (Mobile, Tablet, Laptop, Desktop)
  const handleClick = (e) => {
    if (!cardRef.current) return;

    // Clear any previous animation timers to handle rapid clicking flawlessly
    if (clickAnimTimerRef.current) clearTimeout(clickAnimTimerRef.current);
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);

    const isTouch = !isHoverDevice() || e?.pointerType === "touch";

    // Immediate tactile press down
    cardRef.current.style.transition =
      "transform 0.1s cubic-bezier(0.25, 1, 0.5, 1)";
    cardRef.current.style.transform = isTouch
      ? `perspective(1000px) rotateX(-2deg) rotateY(1deg) scale(0.96)`
      : `perspective(1000px) scale(${Math.max(0.97, scale * 0.96)})`;

    if (glareRef.current) {
      glareRef.current.style.transition = "opacity 0.1s ease-out";
      glareRef.current.style.opacity = "0.32";
    }

    // Spring back up
    clickAnimTimerRef.current = setTimeout(() => {
      if (!cardRef.current) return;

      if (isTouch) {
        // ON MOBILE / TOUCH DEVICES: ALWAYS RETURN SMOOTHLY TO ROOT POSITION
        cardRef.current.style.transition =
          "transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)";
        cardRef.current.style.transform =
          "perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)";

        if (glareRef.current) {
          glareRef.current.style.transition = "opacity 0.3s ease-out";
          glareRef.current.style.opacity = "0";
        }
      } else {
        // On desktop with mouse: spring back to hover scale
        cardRef.current.style.transition =
          "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)";
        cardRef.current.style.transform = `perspective(1000px) scale(${scale})`;
      }
    }, 130);

    if (onClick) {
      onClick(e);
    }
  };

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
      className={`relative perspective-1000 select-none cursor-pointer will-change-transform touch-manipulation ${className}`}
      style={{
        transform: "perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)",
        transformStyle: "preserve-3d",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* 3D Depth Card Content */}
      <div className="relative w-full h-full preserve-3d">
        {children}

        {/* Dynamic Light Glare Reflection */}
        <div
          ref={glareRef}
          className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300 z-10"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0) 65%)",
            opacity: 0,
          }}
        />
      </div>
    </div>
  );
}
