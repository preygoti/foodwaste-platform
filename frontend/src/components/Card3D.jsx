import { useRef, useEffect, useCallback } from "react";

/**
 * High-performance 3D interactive card with native RAF Lerp Physics.
 * - Silky smooth, jitter-free 3D tilt tracking across all devices (Desktop, Laptop, Mobile, Tablet).
 * - Damped linear interpolation (Lerp) runs at native 60Hz/120Hz refresh rates.
 * - Guaranteed automatic return to flat resting root position (0deg, scale 1).
 * - Zero React re-renders, zero CSS transition conflicts -> 100% immune to multi-click hangs.
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

  // Physics state (Target vs Current for silky damped interpolation)
  const target = useRef({
    rotateX: 0,
    rotateY: 0,
    scale: 1,
    glareX: 50,
    glareY: 50,
    glareOpacity: 0,
  });

  const current = useRef({
    rotateX: 0,
    rotateY: 0,
    scale: 1,
    glareX: 50,
    glareY: 50,
    glareOpacity: 0,
  });

  const isRunningRef = useRef(false);
  const rafIdRef = useRef(null);
  const releaseTimerRef = useRef(null);
  const touchStartPosRef = useRef({ x: 0, y: 0 });
  const isScrollingRef = useRef(false);

  // Animation Loop with Damped Spring Physics (Lerp)
  const updateLoop = useCallback(() => {
    const c = current.current;
    const t = target.current;

    // Damping factor for silky smoothness (0.13 gives luxurious fluid motion)
    const factor = 0.13;

    c.rotateX += (t.rotateX - c.rotateX) * factor;
    c.rotateY += (t.rotateY - c.rotateY) * factor;
    c.scale += (t.scale - c.scale) * factor;
    c.glareOpacity += (t.glareOpacity - c.glareOpacity) * factor;
    c.glareX += (t.glareX - c.glareX) * factor;
    c.glareY += (t.glareY - c.glareY) * factor;

    // Apply transform directly to GPU compositor
    if (cardRef.current) {
      cardRef.current.style.transform = `perspective(1000px) rotateX(${c.rotateX.toFixed(2)}deg) rotateY(${c.rotateY.toFixed(2)}deg) scale(${c.scale.toFixed(3)})`;
    }

    if (glareRef.current) {
      glareRef.current.style.opacity = c.glareOpacity.toFixed(3);
      glareRef.current.style.background = `radial-gradient(circle at ${c.glareX.toFixed(1)}% ${c.glareY.toFixed(1)}%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 65%)`;
    }

    // Check if settled close enough to target
    const isSettled =
      Math.abs(t.rotateX - c.rotateX) < 0.01 &&
      Math.abs(t.rotateY - c.rotateY) < 0.01 &&
      Math.abs(t.scale - c.scale) < 0.001 &&
      Math.abs(t.glareOpacity - c.glareOpacity) < 0.005;

    if (isSettled) {
      // Snap to exact resting position when near zero
      if (t.rotateX === 0 && t.rotateY === 0 && t.scale === 1 && t.glareOpacity === 0) {
        c.rotateX = 0;
        c.rotateY = 0;
        c.scale = 1;
        c.glareOpacity = 0;
        if (cardRef.current) {
          cardRef.current.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)";
        }
        if (glareRef.current) {
          glareRef.current.style.opacity = "0";
        }
      }
      isRunningRef.current = false;
      rafIdRef.current = null;
    } else {
      rafIdRef.current = requestAnimationFrame(updateLoop);
    }
  }, []);

  const startLoop = useCallback(() => {
    if (!isRunningRef.current) {
      isRunningRef.current = true;
      rafIdRef.current = requestAnimationFrame(updateLoop);
    }
  }, [updateLoop]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
    };
  }, []);

  // Helper to calculate target tilt & glare from client coordinates
  const setTargetFromCoords = useCallback(
    (clientX, clientY, targetScale = 1.02, glareOpacity = 0.28) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, clientY - rect.top));

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      target.current.rotateX = Number((((y - centerY) / centerY) * -maxTilt).toFixed(2));
      target.current.rotateY = Number((((x - centerX) / centerX) * maxTilt).toFixed(2));
      target.current.glareX = Number(((x / rect.width) * 100).toFixed(1));
      target.current.glareY = Number(((y / rect.height) * 100).toFixed(1));
      target.current.scale = targetScale;
      target.current.glareOpacity = glareOpacity;

      startLoop();
    },
    [maxTilt, startLoop]
  );

  // Return smoothly to root position
  const resetToRoot = useCallback(
    (delay = 0) => {
      if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);

      const doReset = () => {
        target.current.rotateX = 0;
        target.current.rotateY = 0;
        target.current.scale = 1;
        target.current.glareOpacity = 0;
        startLoop();
      };

      if (delay <= 0) {
        doReset();
      } else {
        releaseTimerRef.current = setTimeout(doReset, delay);
      }
    },
    [startLoop]
  );

  const isHoverDevice = () => {
    return (
      typeof window !== "undefined" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches
    );
  };

  // Desktop Mouse Handlers
  const handlePointerMove = (e) => {
    if (!isHoverDevice() || e.pointerType === "touch") return;
    if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
    setTargetFromCoords(e.clientX, e.clientY, scale, 0.25);
  };

  const handlePointerLeave = (e) => {
    if (e.pointerType === "touch") return;
    resetToRoot(0);
  };

  // Mobile Touch Handlers
  const handleTouchStart = (e) => {
    isScrollingRef.current = false;
    if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);

    if (e.touches && e.touches[0]) {
      const touch = e.touches[0];
      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
      // Tactile touch down tilt
      setTargetFromCoords(touch.clientX, touch.clientY, 0.97, 0.35);
    }
  };

  const handleTouchMove = (e) => {
    if (isScrollingRef.current || !e.touches || !e.touches[0]) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);

    // If scrolling vertically, let native scroll take over smoothly
    if (dy > 12 && dy > dx * 1.2) {
      isScrollingRef.current = true;
      resetToRoot(0);
      return;
    }

    // Dynamic silky smooth 3D tilt tracking during touch drag
    setTargetFromCoords(touch.clientX, touch.clientY, scale, 0.3);
  };

  const handleTouchEnd = () => {
    // Unconditionally return smoothly to root resting position
    resetToRoot(200);
  };

  const handleTouchCancel = () => {
    resetToRoot(0);
  };

  // Click / Tap Handler (Works universally on all devices with dynamic smoothing)
  const handleClick = (e) => {
    if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);

    let clientX = e?.clientX;
    let clientY = e?.clientY;

    if (e?.touches && e.touches[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }

    const isTouch = !isHoverDevice() || e?.pointerType === "touch";

    if (typeof clientX === "number" && typeof clientY === "number" && (clientX !== 0 || clientY !== 0)) {
      setTargetFromCoords(clientX, clientY, isTouch ? 0.96 : Math.max(0.97, scale * 0.96), 0.38);
    } else {
      target.current.rotateX = -2.5;
      target.current.rotateY = 2;
      target.current.scale = isTouch ? 0.96 : Math.max(0.97, scale * 0.96);
      target.current.glareOpacity = 0.35;
      target.current.glareX = 50;
      target.current.glareY = 40;
      startLoop();
    }

    // Smooth return to resting root position for touch/click
    if (isTouch) {
      resetToRoot(220);
    } else {
      setTimeout(() => {
        target.current.scale = scale;
        startLoop();
      }, 150);
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
          className="pointer-events-none absolute inset-0 rounded-2xl pointer-events-none z-10"
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
