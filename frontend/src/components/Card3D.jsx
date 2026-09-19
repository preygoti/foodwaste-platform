import { useRef, useEffect, useCallback } from "react";

/**
 * High-performance 3D interactive card.
 * - Dynamic 3D tilt tracking (X & Y axes + light reflection glare) on ALL devices:
 *   - Desktop / Laptop: Smooth 3D tilt following mouse cursor + hover reflection
 *   - Mobile / Tablet: Dynamic 3D tilt following touch position / tap location + glare flare
 * - GUARANTEED return to root position (0deg, scale 1) when touch/click releases
 * - Zero React re-renders (direct GPU transforms via refs) -> 100% hang-free on multi-clicks
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
  const touchStartPosRef = useRef({ x: 0, y: 0 });
  const isScrollingRef = useRef(false);

  // Check if device supports true hover (mouse / trackpad)
  const isHoverDevice = () => {
    return (
      typeof window !== "undefined" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches
    );
  };

  // Calculate dynamic 3D tilt angles and glare coordinates from client coordinates
  const calculateTilt = useCallback(
    (clientX, clientY) => {
      if (!cardRef.current) return null;
      const rect = cardRef.current.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;

      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, clientY - rect.top));

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = Number((((y - centerY) / centerY) * -maxTilt).toFixed(2));
      const rotateY = Number((((x - centerX) / centerX) * maxTilt).toFixed(2));
      const glareX = Number(((x / rect.width) * 100).toFixed(1));
      const glareY = Number(((y / rect.height) * 100).toFixed(1));

      return { rotateX, rotateY, glareX, glareY };
    },
    [maxTilt]
  );

  // Apply GPU transform directly to DOM
  const applyTilt = useCallback(
    (rotateX, rotateY, glareX, glareY, targetScale, transitionDuration, glareOpacity) => {
      if (!cardRef.current) return;
      cardRef.current.style.transition = `transform ${transitionDuration} cubic-bezier(0.22, 1, 0.36, 1)`;
      cardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${targetScale})`;

      if (glareRef.current) {
        glareRef.current.style.transition = `opacity ${transitionDuration} ease-out`;
        glareRef.current.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 65%)`;
        glareRef.current.style.opacity = String(glareOpacity);
      }
    },
    []
  );

  // Smoothly return card to default resting root position
  const resetToRoot = useCallback((delay = 0) => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }

    const doReset = () => {
      if (!cardRef.current) return;
      cardRef.current.style.transition = "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)";
      cardRef.current.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)";

      if (glareRef.current) {
        glareRef.current.style.transition = "opacity 0.35s ease-out";
        glareRef.current.style.opacity = "0";
      }
    };

    if (delay <= 0) {
      doReset();
    } else {
      resetTimerRef.current = setTimeout(doReset, delay);
    }
  }, []);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  // Desktop Mouse Handlers
  const handlePointerMove = (e) => {
    if (!isHoverDevice() || e.pointerType === "touch") return;
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);

    const tilt = calculateTilt(e.clientX, e.clientY);
    if (!tilt) return;
    applyTilt(tilt.rotateX, tilt.rotateY, tilt.glareX, tilt.glareY, scale, "0.1s", 0.25);
  };

  const handlePointerLeave = (e) => {
    if (e.pointerType === "touch") return;
    resetToRoot(0);
  };

  // Mobile / Touch Handlers (Dynamic touch tilt on all devices)
  const handleTouchStart = (e) => {
    isScrollingRef.current = false;
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);

    if (e.touches && e.touches[0]) {
      const touch = e.touches[0];
      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

      const tilt = calculateTilt(touch.clientX, touch.clientY);
      if (tilt) {
        // Dynamic tilt towards touch coordinate + tactile press
        applyTilt(tilt.rotateX, tilt.rotateY, tilt.glareX, tilt.glareY, 0.97, "0.12s", 0.35);
      }
    }
  };

  const handleTouchMove = (e) => {
    if (isScrollingRef.current || !e.touches || !e.touches[0]) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);

    // If user is scrolling vertically, release card tilt smoothly so page scroll is 100% fluid
    if (dy > 12 && dy > dx * 1.2) {
      isScrollingRef.current = true;
      resetToRoot(0);
      return;
    }

    // Dynamic 3D tilt follows finger across screen
    const tilt = calculateTilt(touch.clientX, touch.clientY);
    if (tilt) {
      applyTilt(tilt.rotateX, tilt.rotateY, tilt.glareX, tilt.glareY, scale, "0.08s", 0.3);
    }
  };

  const handleTouchEnd = () => {
    // UNCONDITIONALLY return to root resting position when touch lifts
    resetToRoot(200);
  };

  const handleTouchCancel = () => {
    resetToRoot(0);
  };

  // Click / Tap Handler (Works universally on all devices with dynamic coordinate calculation)
  const handleClick = (e) => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);

    let clientX = e?.clientX;
    let clientY = e?.clientY;

    if (e?.touches && e.touches[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }

    let tilt = null;
    if (typeof clientX === "number" && typeof clientY === "number" && (clientX !== 0 || clientY !== 0)) {
      tilt = calculateTilt(clientX, clientY);
    }

    // Dynamic tilt based on click location, or natural subtle center tilt
    const rotX = tilt ? tilt.rotateX : -2.5;
    const rotY = tilt ? tilt.rotateY : 2;
    const glX = tilt ? tilt.glareX : 50;
    const glY = tilt ? tilt.glareY : 40;

    const isTouch = !isHoverDevice() || e?.pointerType === "touch";

    // Immediate tactile dynamic press down
    applyTilt(rotX, rotY, glX, glY, isTouch ? 0.96 : Math.max(0.97, scale * 0.96), "0.1s", 0.38);

    // Smooth return
    if (isTouch) {
      // ON MOBILE / TOUCH DEVICES: GUARANTEED SMOOTH RETURN TO ROOT POSITION
      resetToRoot(180);
    } else {
      // On desktop with mouse: spring back to hover state
      setTimeout(() => {
        if (!cardRef.current) return;
        applyTilt(rotX, rotY, glX, glY, scale, "0.25s", 0.22);
      }, 120);
    }

    if (onClick) {
      onClick(e);
    }
  };

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
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
              "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 65%)",
            opacity: 0,
          }}
        />
      </div>
    </div>
  );
}
