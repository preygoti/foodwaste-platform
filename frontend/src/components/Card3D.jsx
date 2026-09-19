import { useState, useRef, useCallback } from "react";

/**
 * High-performance 3D interactive tilt card.
 * Works seamlessly across all devices:
 * - Desktop / Laptop: dynamic 3D tilt tracking cursor + light glare reflection
 * - Mobile / Tablet: touch-responsive tilt + tap spring bounce & glare burst
 * - Universal click/tap spring pulse for tactile feedback on all devices
 */
export default function Card3D({ children, className = "", maxTilt = 8, scale = 1.02, onClick }) {
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50, opacity: 0 });
  const [isPressed, setIsPressed] = useState(false);
  const resetTimerRef = useRef(null);

  const updateTiltFromCoords = useCallback((clientX, clientY, glareOpacity = 0.18) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, clientY - rect.top));

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -maxTilt;
    const rotateY = ((x - centerX) / centerX) * maxTilt;

    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;

    setTilt({
      rotateX: Number(rotateX.toFixed(2)),
      rotateY: Number(rotateY.toFixed(2)),
      glareX: Number(glareX.toFixed(2)),
      glareY: Number(glareY.toFixed(2)),
      opacity: glareOpacity,
    });
  }, [maxTilt]);

  const handleMouseMove = (e) => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    updateTiltFromCoords(e.clientX, e.clientY, 0.18);
  };

  const handleMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50, opacity: 0 });
    setIsPressed(false);
  };

  const handleTouchStart = (e) => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    if (e.touches && e.touches[0]) {
      updateTiltFromCoords(e.touches[0].clientX, e.touches[0].clientY, 0.28);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches && e.touches[0]) {
      updateTiltFromCoords(e.touches[0].clientX, e.touches[0].clientY, 0.28);
    }
  };

  const handleTouchEnd = () => {
    resetTimerRef.current = setTimeout(() => {
      setTilt({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50, opacity: 0 });
      setIsPressed(false);
    }, 350);
  };

  const handleClick = (e) => {
    // Tactile spring bounce & glare flare on click or tap across all devices
    if (e && (e.clientX !== undefined || (e.touches && e.touches[0]))) {
      const clientX = e.clientX ?? e.touches[0].clientX;
      const clientY = e.clientY ?? e.touches[0].clientY;
      updateTiltFromCoords(clientX, clientY, 0.35);
    } else {
      setTilt((prev) => ({
        ...prev,
        rotateX: -3,
        rotateY: 2,
        opacity: 0.35,
      }));
    }

    setIsPressed(true);
    setTimeout(() => {
      setIsPressed(false);
    }, 180);

    if (onClick) {
      onClick(e);
    }
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onClick={handleClick}
      className={`relative perspective-1000 select-none cursor-pointer will-change-transform ${className}`}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) ${
          isPressed ? `scale(${scale * 0.97})` : tilt.opacity > 0 ? `scale(${scale})` : "scale(1)"
        }`,
        transformStyle: "preserve-3d",
        transition: isPressed
          ? "transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)"
          : "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      }}
    >
      {/* 3D Depth Card Content */}
      <div className="relative w-full h-full preserve-3d">
        {children}

        {/* Dynamic Light Glare Reflection */}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300 z-10"
          style={{
            background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 60%)`,
            opacity: tilt.opacity,
          }}
        />
      </div>
    </div>
  );
}
