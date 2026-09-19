import { useState, useRef, useCallback, useEffect } from "react";

/**
 * High-performance 3D interactive tilt card.
 * Works seamlessly across all devices:
 * - Desktop / Laptop: dynamic 3D tilt tracking cursor + light glare reflection
 * - Mobile / Tablet: smooth tactile tap feedback with GUARANTEED return to root position
 * - Multi-tap / rapid-click protected: uses RAF + timer deduplication to prevent browser hang
 */
export default function Card3D({ children, className = "", maxTilt = 8, scale = 1.02, onClick }) {
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50, opacity: 0 });
  const [isPressed, setIsPressed] = useState(false);

  const resetTimerRef = useRef(null);
  const pressTimerRef = useRef(null);
  const rafRef = useRef(null);
  const touchStartPosRef = useRef({ x: 0, y: 0 });
  const isScrollingRef = useRef(false);
  const isHoveredRef = useRef(false);

  // Clear all pending timeouts and animation frames
  const clearAllTimers = useCallback(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  // Guaranteed reset to default/root resting position
  const resetToRoot = useCallback((delay = 0) => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }

    const doReset = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setTilt({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50, opacity: 0 });
        setIsPressed(false);
      });
    };

    if (delay <= 0) {
      doReset();
    } else {
      resetTimerRef.current = setTimeout(doReset, delay);
    }
  }, []);

  const updateTiltFromCoords = useCallback(
    (clientX, clientY, glareOpacity = 0.18) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, clientY - rect.top));

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = Number((((y - centerY) / centerY) * -maxTilt).toFixed(2));
      const rotateY = Number((((x - centerX) / centerX) * maxTilt).toFixed(2));
      const glareX = Number(((x / rect.width) * 100).toFixed(2));
      const glareY = Number(((y / rect.height) * 100).toFixed(2));

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setTilt({
          rotateX,
          rotateY,
          glareX,
          glareY,
          opacity: glareOpacity,
        });
      });
    },
    [maxTilt]
  );

  // Desktop Mouse Handlers
  const handleMouseEnter = () => {
    isHoveredRef.current = true;
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  };

  const handleMouseMove = (e) => {
    isHoveredRef.current = true;
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    updateTiltFromCoords(e.clientX, e.clientY, 0.18);
  };

  const handleMouseLeave = () => {
    isHoveredRef.current = false;
    clearAllTimers();
    resetToRoot(0);
  };

  // Mobile Touch Handlers
  const handleTouchStart = (e) => {
    isScrollingRef.current = false;
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    if (e.touches && e.touches[0]) {
      touchStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      updateTiltFromCoords(e.touches[0].clientX, e.touches[0].clientY, 0.22);
    }
  };

  const handleTouchMove = (e) => {
    if (isScrollingRef.current || !e.touches || !e.touches[0]) return;
    const dx = Math.abs(e.touches[0].clientX - touchStartPosRef.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchStartPosRef.current.y);

    // If user is scrolling the page, release card tilt immediately so scroll is 100% fluid
    if (dx > 8 || dy > 8) {
      isScrollingRef.current = true;
      resetToRoot(0);
      return;
    }
    updateTiltFromCoords(e.touches[0].clientX, e.touches[0].clientY, 0.22);
  };

  const handleTouchEnd = () => {
    // If it was a scroll gesture, keep card at root
    if (isScrollingRef.current) {
      resetToRoot(0);
      return;
    }
    // On mobile tap, smoothly return to root resting position
    resetToRoot(250);
  };

  const handleTouchCancel = () => {
    resetToRoot(0);
  };

  // Universal Click / Tap Handler with Rapid-Click / Spam Protection
  const handleClick = (e) => {
    // Deduplicate and clear any active press timer
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }

    // Determine coords for tactile glare/tilt burst
    if (e && typeof e.clientX === "number" && (e.clientX !== 0 || e.clientY !== 0)) {
      updateTiltFromCoords(e.clientX, e.clientY, 0.28);
    } else if (e && e.touches && e.touches[0]) {
      updateTiltFromCoords(e.touches[0].clientX, e.touches[0].clientY, 0.28);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setTilt((prev) => ({
          ...prev,
          rotateX: -2.5,
          rotateY: 1.5,
          opacity: 0.25,
        }));
      });
    }

    // Trigger subtle tactile press
    setIsPressed(true);
    pressTimerRef.current = setTimeout(() => {
      setIsPressed(false);
      pressTimerRef.current = null;
    }, 140);

    // GUARANTEED root position reset for mobile/touch devices or after click
    if (!isHoveredRef.current) {
      resetToRoot(260);
    }

    if (onClick) {
      onClick(e);
    }
  };

  // Determine current scale
  const currentScale = isPressed
    ? Math.max(0.97, scale * 0.95)
    : isHoveredRef.current && tilt.opacity > 0
    ? scale
    : 1;

  return (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onClick={handleClick}
      className={`relative perspective-1000 select-none cursor-pointer will-change-transform touch-manipulation ${className}`}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale(${currentScale})`,
        transformStyle: "preserve-3d",
        transition: isPressed
          ? "transform 0.12s cubic-bezier(0.25, 1, 0.5, 1)"
          : "transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      {/* 3D Depth Card Content */}
      <div className="relative w-full h-full preserve-3d">
        {children}

        {/* Dynamic Light Glare Reflection */}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300 z-10"
          style={{
            background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 60%)`,
            opacity: tilt.opacity,
          }}
        />
      </div>
    </div>
  );
}
