import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Package,
  Sparkles,
  Store,
  ShieldCheck,
  Building2,
  Clock,
  CheckCircle2,
  Leaf,
  Award,
  TrendingUp,
  MapPin,
  Truck,
  FileText,
  HeartHandshake,
  AlertTriangle,
  AlertCircle,
  BarChart3,
  Bell,
  Menu,
  X,
  Compass,
  Check,
  Flame,
  Activity,
  Layers,
  Search,
  Utensils,
} from "lucide-react";
import Card3D from "../components/Card3D";
import { api } from "../api";

/**
 * Custom hook for smooth scroll-triggered viewport entrance animations
 */
function useScrollReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, isVisible];
}

/**
 * Custom hook for count-up animation on numeric metrics
 */
function useCountUp(targetNumber, isVisible, duration = 1600) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isVisible || typeof targetNumber !== "number" || targetNumber <= 0) return;

    let start = 0;
    const end = targetNumber;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const progress = Math.min((currentTime - startTime) / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(ease * end));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    requestAnimationFrame(animate);
  }, [targetNumber, isVisible, duration]);

  return count;
}

export default function Landing() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const [platformMetrics, setPlatformMetrics] = useState(null);

  // Section reveal refs
  const [problemRef, problemVisible] = useScrollReveal(0.12);
  const [howItWorksRef, howItWorksVisible] = useScrollReveal(0.1);
  const [riskScoringRef, riskScoringVisible] = useScrollReveal(0.12);
  const [featuresRef, featuresVisible] = useScrollReveal(0.08);
  const [impactRef, impactVisible] = useScrollReveal(0.1);
  const [statementRef, statementVisible] = useScrollReveal(0.15);
  const [ctaRef, ctaVisible] = useScrollReveal(0.15);

  // Fetch real platform metrics if available
  useEffect(() => {
    api
      .getDashboardMetrics()
      .then((data) => {
        if (data && typeof data === "object") {
          setPlatformMetrics(data);
        }
      })
      .catch(() => {
        // Fallback gracefully if unauthenticated or endpoint is idle
      });
  }, []);

  // Handle escape key and body scroll lock for mobile menu
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    // Lock background scroll completely when mobile menu is open
    if (mobileMenuOpen) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  // Scrollspy: dynamically track active section based on scroll position
  useEffect(() => {
    const sectionIds = ["hero", "how-it-works", "features", "impact"];
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 140; // Offset for sticky header
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i]);
        if (el) {
          const top = el.offsetTop;
          if (scrollPosition >= top) {
            setActiveSection(sectionIds[i]);
            return;
          }
        }
      }
      setActiveSection("hero");
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Smooth scroll handler with sticky header height compensation
  const scrollToSection = (e, sectionId) => {
    if (e) e.preventDefault();
    setMobileMenuOpen(false);

    setTimeout(() => {
      if (sectionId === "hero") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        window.history.pushState(null, "", "#hero");
        setActiveSection("hero");
        return;
      }

      const element = document.getElementById(sectionId);
      if (element) {
        const headerOffset = 80;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth",
        });

        window.history.pushState(null, "", `#${sectionId}`);
        setActiveSection(sectionId);
      }
    }, 80);
  };

  const handleActionNavigation = (path) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  const handleToggleMenu = () => {
    setMobileMenuOpen((prev) => !prev);
  };

  const handleCloseMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#0F291E] flex flex-col overflow-x-clip selection:bg-[#166534] selection:text-white font-sans antialiased relative">
      {/* ------------------------------------------------------------- */}
      {/* NAVIGATION / HEADER                                           */}
      {/* ------------------------------------------------------------- */}
      <header
        className="sticky top-0 z-40 bg-[#FAF7F2] sm:bg-[#FAF7F2]/95 sm:backdrop-blur-md border-b border-[#0F291E]/10 transition-colors"
        style={{ transform: "translate3d(0, 0, 0)", WebkitTransform: "translate3d(0, 0, 0)", isolation: "isolate" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between">
          {/* LEFT SIDE: HL Logo + HARVEST LEDGER */}
          <Link
            to="/"
            onClick={(e) => scrollToSection(e, "hero")}
            className="flex items-center gap-2.5 sm:gap-3 group select-none shrink-0"
            aria-label="Harvest Ledger Home"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#166534] text-white flex items-center justify-center font-display italic font-bold text-base sm:text-lg shadow-sm group-hover:bg-[#15803D] transition-colors">
              HL
            </div>
            <div>
              <span className="font-display italic text-lg sm:text-xl font-bold tracking-tight text-[#0F291E] block leading-tight">
                HARVEST LEDGER
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase font-mono tracking-wider text-[#166534]/70 block -mt-0.5 font-semibold">
                Surplus &bull; Redistribution
              </span>
            </div>
          </Link>

          {/* CENTER: Desktop Navigation Links (Visible on Laptop & Desktop: lg:flex) */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-[#4B5563]">
            {[
              { id: "hero", label: "Home" },
              { id: "how-it-works", label: "How It Works" },
              { id: "features", label: "Features" },
              { id: "impact", label: "Impact" },
            ].map((item) => {
              const isActive = activeSection === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => scrollToSection(e, item.id)}
                  className={`relative py-1 transition-colors hover:text-[#166534] ${
                    isActive ? "text-[#166534] font-bold" : "text-[#4B5563]"
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute -bottom-1.5 left-0 right-0 h-0.5 bg-[#166534] rounded-full" />
                  )}
                </a>
              );
            })}
          </nav>

          {/* RIGHT SIDE: Action Buttons (Desktop) & Hamburger Menu (Mobile/Tablet) */}
          <div className="flex items-center gap-3">
            {/* Desktop Action Buttons (Visible on lg:flex) */}
            <div className="hidden lg:flex items-center gap-3">
              <Link
                to="/login"
                className="px-4 py-2 bg-white border border-[#0F291E]/15 text-[#0F291E] rounded-xl text-sm font-semibold hover:bg-[#F2F6F3] hover:border-[#166534]/40 active:bg-[#E5EFE7] transition-all shadow-xs"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#166534] hover:bg-[#15803D] active:bg-[#14532d] text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Mobile & Tablet Hamburger Menu Button (< lg) */}
            <button
              type="button"
              onClick={handleToggleMenu}
              className="lg:hidden w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[#0F291E] hover:bg-black/5 active:bg-black/10 transition-colors cursor-pointer select-none touch-manipulation"
              aria-label={mobileMenuOpen ? "Close Navigation Menu" : "Open Navigation Menu"}
              aria-expanded={mobileMenuOpen}
            >
              <Menu className="w-6 h-6 text-[#0F291E]" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Backdrop and Aside */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${
          mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          onClick={handleCloseMenu}
          onTouchMove={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="absolute inset-0 bg-black/40 backdrop-blur-xs touch-none overscroll-none"
          aria-hidden="true"
        />

        <aside
          className={`absolute inset-y-0 left-0 w-72 sm:w-80 max-w-[85vw] bg-[#FAF7F2] flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-out z-10 border-r border-[#0F291E]/10 overscroll-contain touch-pan-y ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
          onTouchMove={(e) => e.stopPropagation()}
        >
          <div className="p-5 sm:p-6 border-b border-[#0F291E]/10 flex items-center justify-between">
            <Link
              to="/"
              onClick={(e) => scrollToSection(e, "hero")}
              className="flex items-center gap-2.5 min-w-0"
            >
              <div className="w-8 h-8 rounded-lg bg-[#166534] text-white flex items-center justify-center font-display italic font-bold text-sm shadow-xs shrink-0">
                HL
              </div>
              <div className="min-w-0">
                <span className="font-display italic text-base font-bold text-[#0F291E] block leading-tight truncate">
                  HARVEST LEDGER
                </span>
                <span className="text-[9px] font-mono uppercase tracking-wider text-[#166534]/70 block truncate font-semibold">
                  Surplus &bull; Redistribution
                </span>
              </div>
            </Link>

            <button
              type="button"
              onClick={handleCloseMenu}
              className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-[#4B5563] hover:text-[#0F291E] hover:bg-black/5 active:bg-black/10 transition-colors cursor-pointer touch-manipulation shrink-0 ml-2"
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5 text-[#0F291E]" />
            </button>
          </div>

          <nav className="p-5 sm:p-6 space-y-2 flex-1 overflow-y-auto overscroll-contain touch-pan-y">
            {[
              { id: "hero", label: "Home" },
              { id: "how-it-works", label: "How It Works" },
              { id: "features", label: "Features" },
              { id: "impact", label: "Impact" },
            ].map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={(e) => scrollToSection(e, item.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-base font-semibold transition-all flex items-center justify-between cursor-pointer touch-manipulation ${
                    isActive
                      ? "bg-[#166534]/10 text-[#166534] border-l-4 border-[#166534] pl-3.5"
                      : "text-[#374151] hover:text-[#166534] hover:bg-[#166534]/5 active:bg-[#166534]/10"
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && <span className="w-2 h-2 rounded-full bg-[#166534]" />}
                </button>
              );
            })}
          </nav>

          <div className="p-5 sm:p-6 border-t border-[#0F291E]/10 space-y-3 bg-[#FAF7F2] mt-auto">
            <button
              type="button"
              onClick={() => handleActionNavigation("/login")}
              className="w-full py-3 px-4 bg-white border border-[#0F291E]/15 text-[#0F291E] rounded-xl text-sm font-semibold text-center hover:bg-[#F2F6F3] active:bg-[#E5EFE7] transition-colors cursor-pointer shadow-xs touch-manipulation"
            >
              Sign In
            </button>

            <button
              type="button"
              onClick={() => handleActionNavigation("/register")}
              className="w-full py-3 px-4 bg-[#166534] hover:bg-[#15803D] active:bg-[#14532d] text-white rounded-xl text-sm font-semibold text-center shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5 touch-manipulation"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </aside>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. HERO SECTION & 3. HERO VISUAL                              */}
      {/* ------------------------------------------------------------- */}
      <section id="hero" className="relative max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 pb-16 sm:pb-24 grid md:grid-cols-12 gap-8 lg:gap-12 items-center scroll-mt-24">
        {/* Left Hero Content */}
        <div className="md:col-span-7 space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full gemini-pill font-mono text-xs shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="gemini-gradient-text font-bold">HARVEST LEDGER &bull; SMART FOOD RESCUE PLATFORM</span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.08] text-[#0F291E] font-bold tracking-tight">
            Turn Surplus Food Into Real Impact.
          </h1>

          <p className="text-[#374151] text-base sm:text-lg leading-relaxed max-w-xl font-normal">
            Harvest Ledger is an AI-powered food waste management platform that helps restaurants, bakeries, and grocery stores track surplus food, predict waste risks, and connect with NGOs before food becomes waste.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#166534] text-white rounded-xl font-semibold text-sm sm:text-base hover:bg-[#15803D] shadow-md hover:shadow-lg transition-all active:scale-[0.99]"
            >
              <span>Start Rescuing Food</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#how-it-works"
              onClick={(e) => scrollToSection(e, "how-it-works")}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white border border-[#0F291E]/15 text-[#0F291E] rounded-xl font-semibold text-sm sm:text-base hover:bg-[#F2F6F3] shadow-xs transition-all active:scale-[0.99] cursor-pointer"
            >
              <span>See How It Works</span>
            </a>
          </div>

          <p className="text-xs font-mono uppercase tracking-widest text-[#166534]/70 pt-2 font-semibold">
            Track &bull; Rescue &bull; Redistribute
          </p>
        </div>

        {/* 3. HERO VISUAL: Modern Interactive Dashboard Preview */}
        <div className="md:col-span-5 relative animate-in fade-in zoom-in-95 duration-700">
          <Card3D maxTilt={7} scale={1.02}>
            <div className="relative gemini-border-glow rounded-2xl">
              {/* Subtle Floating Badge 1 (Top Left) */}
              <div className="absolute -top-3 left-2 sm:-left-3 z-20 flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 glass-forest text-white rounded-full shadow-lg text-[10px] sm:text-xs font-mono font-semibold animate-float-slow">
                <Leaf className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
                <span>Food Saved 🌱</span>
              </div>

              {/* Subtle Floating Badge 2 (Bottom Right) */}
              <div className="absolute -bottom-3 right-2 sm:-right-2 z-20 flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-[#166534] text-white rounded-full shadow-lg text-[10px] sm:text-xs font-mono font-semibold animate-float-delayed border border-white/20">
                <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                <span>Pickup Scheduled ✓</span>
              </div>

              {/* Subtle Floating Badge 3 (Repositioned to bottom-left on mobile to never overlap badge 1) */}
              <div className="absolute -bottom-3 left-2 sm:bottom-auto sm:-top-3 sm:left-auto sm:right-2 z-20 flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-white text-rose-800 rounded-full shadow-md text-[10px] sm:text-[11px] font-mono font-semibold border border-rose-200">
                <Flame className="w-3 h-3 text-rose-600" />
                <span>Risk Detected</span>
              </div>

              <div className="bg-white rounded-2xl shadow-xl border border-[#0F291E]/10 p-4 sm:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[#0F291E]/10 pb-3">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#166534]/70 block font-semibold truncate">
                      UI Visualizer &bull; Live Telemetry
                    </span>
                    <h3 className="font-display font-bold text-sm sm:text-base text-[#0F291E] truncate">
                      FOOD RESCUE STATUS
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-[#166534] border border-emerald-200 flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    Active
                  </span>
                </div>

                {/* 3 Metric Indicator Cards - Scaled for 320px+ */}
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center font-mono">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-rose-50 border border-rose-200 min-w-0">
                    <span className="text-[9px] sm:text-[10px] text-rose-700 uppercase block font-semibold leading-tight truncate">At Risk</span>
                    <strong className="text-xs sm:text-lg font-bold text-rose-800 block pt-0.5 truncate">12 Items</strong>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-xl bg-amber-50 border border-amber-200 min-w-0">
                    <span className="text-[9px] sm:text-[10px] text-amber-800 uppercase block font-semibold leading-tight truncate">Rescue Ready</span>
                    <strong className="text-xs sm:text-lg font-bold text-amber-900 block pt-0.5 truncate">8 Items</strong>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 min-w-0">
                    <span className="text-[9px] sm:text-[10px] text-emerald-800 uppercase block font-semibold leading-tight truncate">Rescued</span>
                    <strong className="text-xs sm:text-lg font-bold text-emerald-900 block pt-0.5 truncate">124 kg</strong>
                  </div>
                </div>

                {/* Sample Batch Ledger Row */}
                <div className="space-y-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#0F291E]/8 flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="font-bold text-[#0F291E] block text-xs">Fresh Milk (30L)</span>
                      <span className="text-[10px] text-[#4B5563]">Cold Storage A &bull; Expiry in 18h</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                      CRITICAL
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#0F291E]/8 flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="font-bold text-[#0F291E] block text-xs">Bakery Sourdough (15x)</span>
                      <span className="text-[10px] text-[#4B5563]">Bakery Rack &bull; Expiry in 2d</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                      MEDIUM
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-[11px] text-[#4B5563] border-t border-[#0F291E]/10 font-mono">
                  <span>Rescue Stream</span>
                  <span className="font-semibold text-[#166534]">Zero-Waste Connected</span>
                </div>
              </div>
            </div>
          </Card3D>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 4. PROBLEM SECTION                                            */}
      {/* ------------------------------------------------------------- */}
      <section ref={problemRef} className="py-16 sm:py-24 bg-[#F2F6F3] border-y border-[#0F291E]/8 scroll-mt-14 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 relative z-10">
          {/* Heading */}
          <div className={`text-center max-w-2xl mx-auto space-y-3 transition-all duration-700 ${
            problemVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}>
            <span className="font-mono text-xs uppercase tracking-widest text-tomato-600 font-bold">
              THE PROBLEM
            </span>
            <h2 className="font-display text-3xl sm:text-4xl text-[#0F291E] font-bold">
              Good Food Shouldn't Become Waste.
            </h2>
            <p className="text-sm sm:text-base text-[#4B5563] leading-relaxed">
              Every day, perfectly usable food can become waste simply because it is overlooked, expires before it can be used, or never reaches the people who need it.
            </p>
          </div>

          {/* 3 Problem Cards with Staggered Slide In */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className={`p-6 sm:p-7 rounded-2xl glass-card glass-card-hover space-y-3.5 ${
              problemVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-6"
            }`}>
              <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-700 border border-rose-200/80 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-[#0F291E]">
                Food Gets Forgotten
              </h3>
              <p className="text-sm text-[#4B5563] leading-relaxed">
                Surplus food can sit unnoticed until its expiry date gets dangerously close.
              </p>
            </div>

            {/* Card 2 */}
            <div className={`p-6 sm:p-7 rounded-2xl glass-card glass-card-hover space-y-3.5 delay-100 ${
              problemVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}>
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-[#0F291E]">
                Action Comes Too Late
              </h3>
              <p className="text-sm text-[#4B5563] leading-relaxed">
                Without clear visibility into expiry risk, teams lack clear visibility into which items need urgent redistribution.
              </p>
            </div>

            {/* Card 3 */}
            <div className={`p-6 sm:p-7 rounded-2xl glass-card glass-card-hover space-y-3.5 delay-200 ${
              problemVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6"
            }`}>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-[#166534] border border-emerald-200/80 flex items-center justify-center font-bold">
                <Truck className="w-5 h-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-[#0F291E]">
                Rescue Is Disconnected
              </h3>
              <p className="text-sm text-[#4B5563] leading-relaxed">
                Even when surplus food is available, finding the right pickup or redistribution opportunity can be difficult.
              </p>
            </div>
          </div>

          {/* Transition Statement */}
          <div className={`text-center pt-2 transition-all duration-700 delay-300 ${
            problemVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}>
            <p className="text-xs sm:text-sm font-semibold text-[#0F291E] bg-white border border-[#0F291E]/10 shadow-xs px-4 py-2.5 rounded-full inline-block">
              Harvest Ledger brings these steps together in one place.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 5. HOW IT WORKS (UNIFIED 5-STEP LIFECYCLE)                    */}
      {/* ------------------------------------------------------------- */}
      <section id="how-it-works" ref={howItWorksRef} className="py-16 sm:py-24 bg-[#FAF7F2] scroll-mt-24 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 relative z-10">
          {/* Heading */}
          <div className={`text-center max-w-2xl mx-auto space-y-3 transition-all duration-700 ${
            howItWorksVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}>
            <span className="font-mono text-xs uppercase tracking-widest text-[#166534] font-bold">
              HOW IT WORKS
            </span>
            <h2 className="font-display text-3xl sm:text-4xl text-[#0F291E] font-bold">
              Five Simple Steps. One Bigger Impact.
            </h2>
            <p className="text-sm sm:text-base text-[#4B5563] leading-relaxed">
              A seamless, predictable lifecycle connecting food businesses with verified community non-profits.
            </p>
          </div>

          {/* 5-Step Process Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              {
                num: "01",
                label: "Track",
                desc: "Log batch quantities, categories, and shelf-life in one central dashboard.",
                icon: Package,
              },
              {
                num: "02",
                label: "Identify",
                desc: "Automated 0–100 risk scoring spots expiry bottlenecks instantly.",
                icon: Sparkles,
              },
              {
                num: "03",
                label: "List",
                desc: "Publish near-expiry surplus to verified local non-profits in one click.",
                icon: Store,
              },
              {
                num: "04",
                label: "Rescue",
                desc: "Coordinate pickups smoothly with digital QR handshake verification.",
                icon: Truck,
              },
              {
                num: "05",
                label: "Measure",
                desc: "Track rescued meals, landfill diversion, and automated impact tracking.",
                icon: BarChart3,
              },
            ].map((step, idx) => {
              const StepIcon = step.icon;
              const isLastOnTablet = idx === 4;
              return (
                <div
                  key={step.num}
                  style={{ transitionDelay: `${idx * 80}ms` }}
                  className={`glass-card glass-card-hover rounded-2xl p-5 flex flex-col justify-between group ${
                    isLastOnTablet ? "sm:col-span-2 lg:col-span-1" : ""
                  } ${
                    howItWorksVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-6 scale-95"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-full bg-[#166534] text-white font-mono text-xs font-bold flex items-center justify-center shadow-xs">
                        {step.num}
                      </span>
                      <div className="p-2 rounded-xl bg-[#F0F5F1] text-[#166534] border border-[#166534]/15 group-hover:bg-[#166534] group-hover:text-white transition-colors">
                        <StepIcon className="w-4 h-4" />
                      </div>
                    </div>

                    <h3 className="font-display font-bold text-base text-[#0F291E] leading-snug">
                      {step.label}
                    </h3>

                    <p className="text-xs text-[#4B5563] leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 7. AI RISK SCORING SECTION                                    */}
      {/* ------------------------------------------------------------- */}
      <section ref={riskScoringRef} className="py-16 sm:py-24 bg-[#F2F6F3] border-y border-[#0F291E]/8 scroll-mt-14 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Content */}
            <div className={`md:col-span-6 space-y-5 transition-all duration-700 ${
              riskScoringVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-6"
            }`}>
              <span className="font-mono text-xs uppercase tracking-widest text-tomato-600 font-bold">
                SMART INSIGHTS
              </span>
              <h2 className="font-display text-3xl sm:text-4xl text-[#0F291E] font-bold leading-tight">
                Know What Needs Attention Before It's Too Late.
              </h2>
              <p className="text-sm sm:text-base text-[#4B5563] leading-relaxed">
                Harvest Ledger uses food risk scoring to help prioritize items based on factors such as expiry urgency, so teams can focus their attention where it matters most.
              </p>

              {/* 4 Clear, Meaningful Risk Levels Grid with Defined Contrast */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 bg-emerald-50 border border-emerald-200/90 rounded-xl space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    <span className="text-[11px] font-mono font-bold text-emerald-900 uppercase">LOW RISK</span>
                  </div>
                  <p className="text-xs text-emerald-800/80">Monitor normally</p>
                </div>
                <div className="p-3.5 bg-amber-50 border border-amber-200/90 rounded-xl space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-600" />
                    <span className="text-[11px] font-mono font-bold text-amber-900 uppercase">MEDIUM RISK</span>
                  </div>
                  <p className="text-xs text-amber-800/80">Keep an eye on expiry</p>
                </div>
                <div className="p-3.5 bg-orange-50 border border-orange-200/90 rounded-xl space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-orange-600" />
                    <span className="text-[11px] font-mono font-bold text-orange-900 uppercase">HIGH RISK</span>
                  </div>
                  <p className="text-xs text-orange-800/80">Action recommended</p>
                </div>
                <div className="p-3.5 bg-rose-50 border border-rose-200/90 rounded-xl space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                    <span className="text-[11px] font-mono font-bold text-rose-900 uppercase">CRITICAL</span>
                  </div>
                  <p className="text-xs text-rose-800/80">Immediate attention</p>
                </div>
              </div>
            </div>

            {/* Right Card: Premium Risk Score Visualizer Card */}
            <div className={`md:col-span-6 transition-all duration-700 delay-150 ${
              riskScoringVisible ? "opacity-100 translate-x-0 scale-100" : "opacity-0 translate-x-6 scale-95"
            }`}>
              <div className="glass-card rounded-3xl p-6 sm:p-8 space-y-5 font-mono border border-[#0F291E]/10 shadow-xl">
                <div className="flex items-center justify-between border-b border-[#0F291E]/10 pb-3">
                  <div>
                    <span className="text-[10px] text-[#166534]/70 uppercase block font-semibold">
                      Automated Risk Engine
                    </span>
                    <h3 className="font-bold text-sm sm:text-base text-[#0F291E]">FOOD RISK SCORE</h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                    HIGH PRIORITY
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-extrabold text-rose-600 font-display">85</span>
                  <span className="text-[#0F291E]/40 text-base font-bold">/ 100</span>
                </div>

                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl space-y-1">
                  <div className="flex items-center gap-1.5 text-rose-900 font-bold text-xs">
                    <Flame className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Expires Soon</span>
                  </div>
                  <p className="text-[11px] text-rose-800/90 leading-relaxed">
                    Recommended Action: Create a rescue listing and prioritize pickup.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between text-[11px] text-[#4B5563] border-t border-[#0F291E]/10">
                  <span>Batch #HL-9042</span>
                  <span>Calculated in Real Time</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 8. FEATURES SECTION                                           */}
      {/* ------------------------------------------------------------- */}
      <section id="features" ref={featuresRef} className="py-16 sm:py-24 bg-[#FAF7F2] scroll-mt-24 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 relative z-10">
          {/* Heading */}
          <div className={`text-center max-w-2xl mx-auto space-y-3 transition-all duration-700 ${
            featuresVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}>
            <span className="font-mono text-xs uppercase tracking-widest text-[#166534] font-bold">
              PLATFORM FEATURES
            </span>
            <h2 className="font-display text-3xl sm:text-4xl text-[#0F291E] font-bold">
              Everything You Need to Rescue More Food.
            </h2>
            <p className="text-sm sm:text-base text-[#4B5563] leading-relaxed">
              Designed to minimize waste, maximize rescue velocity, and provide clear operational visibility.
            </p>
          </div>

          {/* 6 Feature Cards Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                num: "01",
                title: "Smart Inventory Management",
                desc: "Track food quantities, categories, shelf life, and expiry information in one central place.",
                icon: Package,
              },
              {
                num: "02",
                title: "AI Demand Forecasting",
                desc: "Predict future food demand across 7, 14, and 30-day periods to help businesses make smarter inventory decisions.",
                icon: TrendingUp,
              },
              {
                num: "03",
                title: "Smart Waste Prediction",
                desc: "Identify food items at higher risk of becoming spoiled or expired before they become waste.",
                icon: AlertTriangle,
              },
              {
                num: "04",
                title: "Inventory Health Monitoring",
                desc: "Detect stockout risks and receive smart reorder alerts to keep inventory balanced.",
                icon: Activity,
              },
              {
                num: "05",
                title: "Advanced Analytics",
                desc: "Analyze sales trends, purchases, food waste, product performance, and financial impact in one dashboard.",
                icon: BarChart3,
              },
              {
                num: "06",
                title: "Surplus & Pickup Management",
                desc: "Create surplus listings, connect with NGOs, coordinate pickups, and verify handovers using secure QR codes.",
                icon: ShieldCheck,
              },
            ].map((feat, idx) => {
              const FeatIcon = feat.icon;
              return (
                <div
                  key={feat.title}
                  style={{ transitionDelay: `${idx * 60}ms` }}
                  className={`glass-card glass-card-hover rounded-2xl p-6 sm:p-7 flex flex-col justify-between group ${
                    featuresVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                  }`}
                >
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[#166534]/60 group-hover:text-[#166534]">
                        {feat.num}
                      </span>
                      <div className="p-2.5 rounded-xl bg-[#F0F5F1] text-[#166534] border border-[#166534]/15 group-hover:bg-[#166534] group-hover:text-white transition-colors">
                        <FeatIcon className="w-4 h-4" />
                      </div>
                    </div>
                    <h3 className="font-display font-bold text-base sm:text-lg text-[#0F291E]">
                      {feat.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 9. IMPACT SECTION                                             */}
      {/* ------------------------------------------------------------- */}
      <section id="impact" ref={impactRef} className="py-16 sm:py-24 bg-[#F2F6F3] border-y border-[#0F291E]/8 scroll-mt-24 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Heading */}
          <div className={`text-center max-w-2xl mx-auto space-y-3 transition-all duration-700 ${
            impactVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}>
            <span className="font-mono text-xs uppercase tracking-widest text-[#166534] font-bold">
              MEASURE THE DIFFERENCE
            </span>
            <h2 className="font-display text-3xl sm:text-4xl text-[#0F291E] font-bold">
              Every Rescue Counts.
            </h2>
            <p className="text-sm sm:text-base text-[#4B5563] leading-relaxed">
              Food rescue becomes more powerful when you can see the impact. Use your platform data to understand what is being saved, rescued, and completed.
            </p>
          </div>

          {/* 4 Impact Telemetry Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className={`glass-card glass-card-hover rounded-2xl p-6 space-y-2.5 transition-all duration-700 ${
              impactVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center mb-1">
                <Leaf className="w-4 h-4" />
              </div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#166534]/70 block font-semibold">
                Food Rescued
              </span>
              <p className="font-display font-bold text-2xl sm:text-3xl text-[#0F291E]">
                {platformMetrics?.total_food_rescued_kg ? `${platformMetrics.total_food_rescued_kg} kg` : "Track Impact"}
              </p>
              <p className="text-xs text-[#4B5563] leading-relaxed">
                Total surplus food successfully collected &amp; redistributed.
              </p>
            </div>

            <div className={`glass-card glass-card-hover rounded-2xl p-6 space-y-2.5 transition-all duration-700 delay-100 ${
              impactVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}>
              <div className="w-9 h-9 rounded-xl bg-forest-50 text-[#166534] border border-forest-200/80 flex items-center justify-center mb-1">
                <Truck className="w-4 h-4" />
              </div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#166534]/70 block font-semibold">
                Pickups Completed
              </span>
              <p className="font-display font-bold text-2xl sm:text-3xl text-[#0F291E]">
                {platformMetrics?.completed_pickups_count ? `${platformMetrics.completed_pickups_count}` : "Active Pickups"}
              </p>
              <p className="text-xs text-[#4B5563] leading-relaxed">
                Coordinated donor-to-NGO handoffs completed with secure QR verification.
              </p>
            </div>

            <div className={`glass-card glass-card-hover rounded-2xl p-6 space-y-2.5 transition-all duration-700 delay-200 ${
              impactVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center mb-1">
                <Activity className="w-4 h-4" />
              </div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#166534]/70 block font-semibold">
                Food At Risk Monitored
              </span>
              <p className="font-display font-bold text-2xl sm:text-3xl text-[#0F291E]">
                {platformMetrics?.items_at_risk_count ? `${platformMetrics.items_at_risk_count} Items` : "Risk Monitored"}
              </p>
              <p className="text-xs text-[#4B5563] leading-relaxed">
                Active perishable batches tracked with automated risk scoring.
              </p>
            </div>

            <div className={`glass-card glass-card-hover rounded-2xl p-6 space-y-2.5 transition-all duration-700 delay-300 ${
              impactVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}>
              <div className="w-9 h-9 rounded-xl bg-gold-50 text-gold-700 border border-gold-200/80 flex items-center justify-center mb-1">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#166534]/70 block font-semibold">
                Waste Reduction
              </span>
              <p className="font-display font-bold text-2xl sm:text-3xl text-[#0F291E]">
                {platformMetrics?.waste_reduction_rate ? `${platformMetrics.waste_reduction_rate}%` : "100% Goal"}
              </p>
              <p className="text-xs text-[#4B5563] leading-relaxed">
                Measurable reduction in commercial landfill disposal.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 10. VISUAL IMPACT STATEMENT                                   */}
      {/* ------------------------------------------------------------- */}
      <section ref={statementRef} className="py-20 sm:py-28 bg-[#0F291E] text-white text-center relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30" />
        <div className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 relative z-10 transition-all duration-700 ${
          statementVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}>
          <div className="w-11 h-11 rounded-full bg-[#166534] text-emerald-300 flex items-center justify-center mx-auto mb-2 shadow-lg border border-emerald-400/30">
            <Leaf className="w-5 h-5" />
          </div>

          <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
            Less Waste. More Rescue. Greater Impact.
          </h2>

          <p className="text-sm sm:text-base text-emerald-100/85 max-w-xl mx-auto leading-relaxed">
            Small actions across kitchens, businesses, organizations, and communities can create a meaningful difference.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 11. FINAL CTA                                                 */}
      {/* ------------------------------------------------------------- */}
      <section ref={ctaRef} className="py-16 sm:py-24 bg-[#FAF7F2] relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`bg-gradient-to-br from-[#123825] via-[#0F291E] to-[#0A1F16] text-white rounded-3xl p-8 sm:p-14 shadow-2xl border border-emerald-500/25 text-center relative overflow-hidden transition-all duration-700 ${
            ctaVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
              Ready to Rescue More Food?
            </h2>

            <p className="text-sm sm:text-base text-emerald-100/90 max-w-lg mx-auto leading-relaxed pt-3">
              Start tracking surplus food, prioritize what needs attention, and turn potential waste into meaningful impact.
            </p>

            <div className="pt-6">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-[#0F291E] font-bold text-sm sm:text-base rounded-xl hover:bg-emerald-50 shadow-lg hover:shadow-xl transition-all active:scale-[0.99]"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <p className="text-xs font-mono text-emerald-200/60 pt-3">
              Make every surplus item count.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 12. FOOTER                                                    */}
      {/* ------------------------------------------------------------- */}
      <footer className="py-14 px-5 sm:px-6 lg:px-8 bg-[#0B1E16] text-white border-t border-emerald-950 w-full">
        <div className="max-w-6xl w-full mx-auto space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-emerald-900/40 pb-8 text-center md:text-left w-full">
            <div className="space-y-1 text-center md:text-left w-full md:w-auto">
              <span className="font-display italic text-lg font-bold text-white block">
                HARVEST LEDGER
              </span>
              <p className="text-xs text-emerald-200/70 font-mono">
                Smart food rescue for a more sustainable future.
              </p>
            </div>

            <nav className="flex flex-wrap items-center justify-center md:justify-end gap-x-6 gap-y-2.5 text-xs font-semibold text-emerald-100/80 w-full md:w-auto">
              <Link to="/register" className="hover:text-white transition-colors py-1 px-1">
                Platform
              </Link>
              <a
                href="#how-it-works"
                onClick={(e) => scrollToSection(e, "how-it-works")}
                className="hover:text-white transition-colors py-1 px-1 cursor-pointer"
              >
                How It Works
              </a>
              <a
                href="#features"
                onClick={(e) => scrollToSection(e, "features")}
                className="hover:text-white transition-colors py-1 px-1 cursor-pointer"
              >
                Features
              </a>
              <a
                href="#impact"
                onClick={(e) => scrollToSection(e, "impact")}
                className="hover:text-white transition-colors py-1 px-1 cursor-pointer"
              >
                Impact
              </a>
            </nav>
          </div>

          {/* Founder & Engineering Credit for Google Knowledge Graph & Visibility */}
          <div
            itemScope
            itemType="https://schema.org/Person"
            className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-emerald-200/75 border-b border-emerald-900/40 pb-6 text-center md:text-left w-full"
          >
            <link itemProp="image" href="/founder-square.jpg" />
            <div className="space-y-1 text-center md:text-left max-w-2xl w-full md:w-auto">
              <span className="font-bold text-white text-sm block font-sans sm:font-mono text-center md:text-left">
                Founded &amp; Built by <span itemProp="name">Prey Goti</span>
              </span>
              <p className="text-xs text-emerald-100/80 leading-relaxed font-sans sm:font-mono text-center md:text-left">
                <span itemProp="jobTitle">Founder of Harvest Ledger and Full-Stack AI Engineer</span> focused on building technology for smarter food waste management and community redistribution.
              </p>
            </div>

            <div className="flex items-center justify-center md:justify-end gap-2.5 shrink-0 pt-1 md:pt-0 font-semibold text-xs w-full md:w-auto">
              <a
                href="https://www.linkedin.com/in/prey-goti-31a772318"
                target="_blank"
                rel="author noopener noreferrer"
                itemProp="sameAs"
                className="inline-flex items-center gap-1.5 text-emerald-300 hover:text-white transition-colors py-1 px-1"
                title="Prey Goti LinkedIn Profile"
              >
                <svg className="w-3.5 h-3.5 fill-current text-[#0a66c2]" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
                <span>LinkedIn</span>
              </a>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-emerald-300/60 font-mono text-center md:text-left w-full">
            <p className="text-center md:text-left leading-relaxed">
              &copy; {new Date().getFullYear()} HARVEST LEDGER &bull; Built to help turn surplus into impact.
            </p>
            <p className="text-[11px] text-emerald-300/40 text-center md:text-right leading-relaxed">
              Food Waste Management &bull; Community Redistribution
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
