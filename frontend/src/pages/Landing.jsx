import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-wheat-50 text-forest-800 flex flex-col overflow-x-clip selection:bg-forest-800 selection:text-wheat-50 font-sans antialiased relative">
      {/* Ambient background light orbs for frosted glass refractions */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/4 w-96 h-96 bg-emerald-400/15 rounded-full blur-3xl animate-mesh-pulse" />
      <div aria-hidden="true" className="pointer-events-none absolute top-48 right-10 w-80 h-80 bg-gold-400/20 rounded-full blur-3xl animate-mesh-pulse-delayed" />
      <div aria-hidden="true" className="pointer-events-none absolute top-[700px] -left-20 w-80 h-80 bg-emerald-300/15 rounded-full blur-3xl" />

      {/* ------------------------------------------------------------- */}
      {/* 1. NAVIGATION                                                 */}
      {/* ------------------------------------------------------------- */}
      <header className="sticky top-0 z-50 glass-header transition-all">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          {/* Brand */}
          <Link to="/" className="group flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-forest-800 text-wheat-50 flex items-center justify-center font-display italic font-bold text-sm shadow-2xs group-hover:scale-105 transition-transform">
              HL
            </div>
            <div>
              <span className="font-display italic text-lg sm:text-xl text-forest-800 font-bold tracking-tight block leading-none">
                HARVEST LEDGER
              </span>
              <span className="text-[10px] font-mono tracking-wider text-forest-800/60 block mt-0.5">
                Turn Surplus Into Impact
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-forest-800/75">
            <a href="#hero" className="hover:text-forest-950 transition-colors">
              Home
            </a>
            <a href="#how-it-works" className="hover:text-forest-950 transition-colors">
              How It Works
            </a>
            <a href="#features" className="hover:text-forest-950 transition-colors">
              Features
            </a>
            <a href="#impact" className="hover:text-forest-950 transition-colors">
              Impact
            </a>
          </nav>

          {/* Right Action & Mobile Menu Toggle */}
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="hidden sm:inline-flex px-3.5 py-1.5 text-xs font-semibold text-forest-800 hover:text-forest-950 hover:bg-wheat-100 rounded-lg transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-forest-800 text-wheat-50 rounded-xl hover:bg-forest-700 shadow-sm transition-all active:scale-[0.98]"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />
            </Link>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg text-forest-800 hover:bg-wheat-100 transition-colors"
              aria-label="Open Navigation Menu"
              aria-expanded={mobileMenuOpen}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Backdrop & Navigation */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-forest-950/60 backdrop-blur-md md:hidden animate-in fade-in duration-200"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="fixed inset-y-0 left-0 w-72 max-w-[80vw] glass-modal border-r border-wheat-200/80 shadow-2xl p-5 sm:p-6 flex flex-col justify-between box-border h-full max-h-[100dvh] overflow-y-auto pb-safe animate-in slide-in-from-left duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-wheat-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-forest-800 text-wheat-50 flex items-center justify-center font-display italic font-bold text-xs shadow-2xs">
                    HL
                  </div>
                  <div>
                    <span className="font-display italic text-base font-bold text-forest-800 block leading-tight">
                      HARVEST LEDGER
                    </span>
                    <span className="text-[10px] font-mono text-forest-800/60 block">
                      Turn Surplus Into Impact
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-forest-800/60 hover:text-forest-800 rounded-lg hover:bg-wheat-100 transition-colors"
                  aria-label="Close Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1.5 text-sm font-semibold text-forest-800">
                <a
                  href="#hero"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-lg hover:bg-wheat-50 transition-colors"
                >
                  Home
                </a>
                <a
                  href="#how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-lg hover:bg-wheat-50 transition-colors"
                >
                  How It Works
                </a>
                <a
                  href="#features"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-lg hover:bg-wheat-50 transition-colors"
                >
                  Features
                </a>
                <a
                  href="#impact"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-lg hover:bg-wheat-50 transition-colors"
                >
                  Impact
                </a>
              </nav>
            </div>

            <div className="space-y-2.5 pt-4 border-t border-wheat-100 mt-auto">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full inline-flex items-center justify-center py-2.5 border border-wheat-300 text-forest-800 font-semibold text-xs rounded-xl hover:bg-wheat-50 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 bg-forest-800 text-wheat-50 font-semibold text-xs rounded-xl hover:bg-forest-700 shadow-sm transition-colors"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. HERO SECTION & 3. HERO VISUAL                              */}
      {/* ------------------------------------------------------------- */}
      <section id="hero" className="relative max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 pb-16 sm:pb-24 grid md:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Hero Content */}
        <div className="md:col-span-7 space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-pill text-forest-800 font-mono text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="uppercase tracking-wider font-semibold">HARVEST LEDGER &bull; SMART FOOD RESCUE PLATFORM</span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.08] text-forest-800 font-bold tracking-tight">
            Turn Surplus Food Into Real Impact.
          </h1>

          <p className="text-forest-800/75 text-base sm:text-lg leading-relaxed max-w-xl">
            Harvest Ledger is the AI-driven commercial food waste management and surplus redistribution platform connecting restaurants, bakeries, and grocery stores with local NGOs — before it becomes waste.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-forest-800 text-wheat-50 border border-forest-800 rounded-xl font-semibold text-sm sm:text-base hover:bg-forest-700 shadow-md hover:shadow-lg transition-all active:scale-[0.99]"
            >
              <span>Start Rescuing Food</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 glass-card glass-card-hover text-forest-800 rounded-xl font-semibold text-sm sm:text-base transition-all active:scale-[0.99]"
            >
              <span>See How It Works</span>
            </a>
          </div>

          <p className="text-xs font-mono uppercase tracking-widest text-forest-800/50 pt-2">
            Track &bull; Rescue &bull; Redistribute
          </p>
        </div>

        {/* 3. HERO VISUAL: Modern Interactive Dashboard Preview */}
        <div className="md:col-span-5 relative animate-in fade-in zoom-in-95 duration-700">
          <Card3D maxTilt={7} scale={1.02}>
            <div className="relative">
              {/* Subtle Floating Badge 1 (Top Left - directly on top border) */}
              <div className="absolute -top-3 left-3 sm:-left-3 z-20 flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 glass-forest text-wheat-50 rounded-full shadow-lg text-[10px] sm:text-xs font-mono font-semibold animate-float-slow">
                <Leaf className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
                <span>Food Saved 🌱</span>
              </div>

              {/* Subtle Floating Badge 2 (Bottom Right - directly on bottom border) */}
              <div className="absolute -bottom-3 right-3 sm:-right-2 z-20 flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-emerald-600/90 backdrop-blur-md text-white rounded-full shadow-lg text-[10px] sm:text-xs font-mono font-semibold animate-float-delayed border border-white/20">
                <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                <span>Pickup Scheduled ✓</span>
              </div>

              {/* Subtle Floating Badge 3 (Top Right - directly on top border) */}
              <div className="absolute -top-3 right-3 sm:-right-2 z-20 flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 glass-pill text-rose-800 rounded-full shadow-md text-[10px] sm:text-[11px] font-mono font-semibold border-rose-200/80">
                <Flame className="w-3 h-3 text-rose-600" />
                <span>Risk Detected</span>
              </div>

              <div className="glass-card rounded-2xl shadow-xl p-4 sm:p-6 space-y-3.5 sm:space-y-4">
                <div className="flex items-center justify-between border-b border-wheat-200/60 pb-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-forest-800/50 block font-semibold">
                      UI Visualizer &bull; Live Telemetry
                    </span>
                    <h3 className="font-display font-bold text-sm sm:text-base text-forest-800">
                      FOOD RESCUE STATUS
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-50/80 backdrop-blur-sm text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active
                  </span>
                </div>

                {/* 3 Metric Indicator Cards */}
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center font-mono">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-rose-50/80 backdrop-blur-sm border border-rose-200/60">
                    <span className="text-[9px] sm:text-[10px] text-rose-800/70 uppercase block font-semibold leading-tight">Food At Risk</span>
                    <strong className="text-xs sm:text-lg font-bold text-rose-800 block pt-0.5">12 Items</strong>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-xl bg-amber-50/80 backdrop-blur-sm border border-amber-200/60">
                    <span className="text-[9px] sm:text-[10px] text-amber-800/70 uppercase block font-semibold leading-tight">Ready for Rescue</span>
                    <strong className="text-xs sm:text-lg font-bold text-amber-900 block pt-0.5">8 Items</strong>
                  </div>
                  <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-50/80 backdrop-blur-sm border border-emerald-200/60">
                    <span className="text-[9px] sm:text-[10px] text-emerald-800/70 uppercase block font-semibold leading-tight">Rescued This Month</span>
                    <strong className="text-xs sm:text-lg font-bold text-emerald-800 block pt-0.5">124 kg</strong>
                  </div>
                </div>

                {/* Sample Batch Ledger Row */}
                <div className="space-y-2 pt-1">
                  <div className="p-2 sm:p-2.5 rounded-xl bg-wheat-100/60 backdrop-blur-sm border border-wheat-200/80 flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="font-bold text-forest-800 block text-xs">Fresh Milk (30L)</span>
                      <span className="text-[10px] text-forest-800/60">Cold Storage A &bull; Expiry in 18h</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                      CRITICAL
                    </span>
                  </div>

                  <div className="p-2 sm:p-2.5 rounded-xl bg-wheat-100/60 backdrop-blur-sm border border-wheat-200/80 flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="font-bold text-forest-800 block text-xs">Bakery Sourdough (15x)</span>
                      <span className="text-[10px] text-forest-800/60">Bakery Rack &bull; Expiry in 2d</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                      MEDIUM
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-[11px] text-forest-800/60 border-t border-wheat-200/60 font-mono">
                  <span>Rescue Stream</span>
                  <span className="font-semibold text-forest-800">Zero-Waste Connected</span>
                </div>
              </div>
            </div>
          </Card3D>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 4. PROBLEM SECTION                                            */}
      {/* ------------------------------------------------------------- */}
      <section ref={problemRef} className="py-16 sm:py-24 bg-white/60 backdrop-blur-md border-y border-wheat-200/80 scroll-mt-14 relative">
        <div aria-hidden="true" className="pointer-events-none absolute top-10 right-1/4 w-72 h-72 bg-rose-400/10 rounded-full blur-3xl" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 relative z-10">
          {/* Heading */}
          <div className={`text-center max-w-2xl mx-auto space-y-3 transition-all duration-700 ${
            problemVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}>
            <span className="font-mono text-xs uppercase tracking-widest text-tomato-500 font-bold">
              THE PROBLEM
            </span>
            <h2 className="font-display text-3xl sm:text-4xl text-forest-800 font-bold">
              Good Food Shouldn't Become Waste.
            </h2>
            <p className="text-xs sm:text-sm text-forest-800/70 leading-relaxed">
              Every day, perfectly usable food can become waste simply because it is overlooked, expires before it can be used, or never reaches the people who need it.
            </p>
          </div>

          {/* 3 Problem Cards with Staggered Slide In */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className={`p-6 sm:p-7 rounded-2xl glass-card glass-card-hover space-y-3 shadow-2xs hover:shadow-md transition-all duration-700 ${
              problemVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-6"
            }`}>
              <div className="w-10 h-10 rounded-xl bg-rose-100/80 backdrop-blur-sm text-rose-700 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-forest-800">
                Food Gets Forgotten
              </h3>
              <p className="text-xs sm:text-sm text-forest-800/70 leading-relaxed">
                Surplus food can sit unnoticed until its expiry date gets dangerously close.
              </p>
            </div>

            {/* Card 2 */}
            <div className={`p-6 sm:p-7 rounded-2xl glass-card glass-card-hover space-y-3 shadow-2xs hover:shadow-md transition-all duration-700 delay-100 ${
              problemVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}>
              <div className="w-10 h-10 rounded-xl bg-amber-100/80 backdrop-blur-sm text-amber-800 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-forest-800">
                Action Comes Too Late
              </h3>
              <p className="text-xs sm:text-sm text-forest-800/70 leading-relaxed">
                Without clear visibility into expiry risk, teams lack clear visibility into which items need urgent redistribution.
              </p>
            </div>

            {/* Card 3 */}
            <div className={`p-6 sm:p-7 rounded-2xl glass-card glass-card-hover space-y-3 shadow-2xs hover:shadow-md transition-all duration-700 delay-200 ${
              problemVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6"
            }`}>
              <div className="w-10 h-10 rounded-xl bg-forest-100/80 backdrop-blur-sm text-forest-800 flex items-center justify-center font-bold">
                <Truck className="w-5 h-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-forest-800">
                Rescue Is Disconnected
              </h3>
              <p className="text-xs sm:text-sm text-forest-800/70 leading-relaxed">
                Even when surplus food is available, finding the right pickup or redistribution opportunity can be difficult.
              </p>
            </div>
          </div>

          {/* Transition Statement */}
          <div className={`text-center pt-2 transition-all duration-700 delay-300 ${
            problemVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}>
            <p className="text-xs sm:text-sm font-semibold text-forest-800 glass-pill px-4 py-2.5 rounded-full inline-block">
              Harvest Ledger brings these steps together in one place.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 5. HOW IT WORKS (UNIFIED 5-STEP LIFECYCLE)                    */}
      {/* ------------------------------------------------------------- */}
      <section id="how-it-works" ref={howItWorksRef} className="py-16 sm:py-24 bg-wheat-50/70 backdrop-blur-sm border-b border-wheat-200/80 scroll-mt-14 relative">
        <div aria-hidden="true" className="pointer-events-none absolute bottom-10 left-10 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 relative z-10">
          {/* Heading */}
          <div className={`text-center max-w-2xl mx-auto space-y-3 transition-all duration-700 ${
            howItWorksVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}>
            <span className="font-mono text-xs uppercase tracking-widest text-emerald-700 font-bold">
              HOW IT WORKS
            </span>
            <h2 className="font-display text-3xl sm:text-4xl text-forest-800 font-bold">
              Five Simple Steps. One Bigger Impact.
            </h2>
            <p className="text-xs sm:text-sm text-forest-800/70 leading-relaxed">
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
                desc: "Track rescued meals, landfill diversion, and automated ESG telemetry.",
                icon: BarChart3,
              },
            ].map((step, idx) => {
              const StepIcon = step.icon;
              return (
                <div
                  key={step.num}
                  style={{ transitionDelay: `${idx * 80}ms` }}
                  className={`glass-card glass-card-hover rounded-2xl p-5 flex flex-col justify-between shadow-2xs group ${
                    howItWorksVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-6 scale-95"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="w-7 h-7 rounded-full bg-forest-800 text-wheat-50 font-mono text-xs font-bold flex items-center justify-center shadow-xs">
                        {step.num}
                      </span>
                      <div className="p-2 rounded-lg bg-forest-50/80 backdrop-blur-sm text-forest-700 group-hover:bg-forest-800 group-hover:text-wheat-50 transition-colors">
                        <StepIcon className="w-4 h-4" />
                      </div>
                    </div>

                    <h3 className="font-display font-bold text-base text-forest-800 leading-snug">
                      {step.label}
                    </h3>

                    <p className="text-xs text-forest-800/70 leading-relaxed">
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
      <section ref={riskScoringRef} className="py-16 sm:py-24 bg-wheat-50 border-b border-wheat-200 scroll-mt-14 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Content */}
            <div className={`md:col-span-6 space-y-5 transition-all duration-700 ${
              riskScoringVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-6"
            }`}>
              <span className="font-mono text-xs uppercase tracking-widest text-tomato-500 font-bold">
                SMART INSIGHTS
              </span>
              <h2 className="font-display text-3xl sm:text-4xl text-forest-800 font-bold leading-tight">
                Know What Needs Attention Before It's Too Late.
              </h2>
              <p className="text-xs sm:text-sm text-forest-800/75 leading-relaxed">
                Harvest Ledger uses food risk scoring to help prioritize items based on factors such as expiry urgency, so teams can focus their attention where it matters most.
              </p>

              {/* 4 Example Risk Levels Grid */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 glass-card rounded-xl space-y-0.5">
                  <span className="text-[10px] font-mono font-bold text-forest-700 uppercase">LOW</span>
                  <p className="text-xs text-forest-800/70">Monitor normally</p>
                </div>
                <div className="p-3 glass-card rounded-xl space-y-0.5">
                  <span className="text-[10px] font-mono font-bold text-amber-700 uppercase">MEDIUM</span>
                  <p className="text-xs text-forest-800/70">Keep an eye on expiry</p>
                </div>
                <div className="p-3 glass-card rounded-xl space-y-0.5">
                  <span className="text-[10px] font-mono font-bold text-tomato-600 uppercase">HIGH</span>
                  <p className="text-xs text-forest-800/70">Action recommended</p>
                </div>
                <div className="p-3 glass-card rounded-xl space-y-0.5">
                  <span className="text-[10px] font-mono font-bold text-rose-700 uppercase">CRITICAL</span>
                  <p className="text-xs text-forest-800/70">Immediate attention</p>
                </div>
              </div>
            </div>

            {/* Right Card: Premium Risk Score Visualizer Card */}
            <div className={`md:col-span-6 transition-all duration-700 delay-150 ${
              riskScoringVisible ? "opacity-100 translate-x-0 scale-100" : "opacity-0 translate-x-6 scale-95"
            }`}>
              <div className="glass-card rounded-3xl p-6 sm:p-8 shadow-xl space-y-5 font-mono">
                <div className="flex items-center justify-between border-b border-wheat-200/60 pb-3">
                  <div>
                    <span className="text-[10px] text-forest-800/50 uppercase block font-semibold">
                      Automated Risk Engine
                    </span>
                    <h3 className="font-bold text-sm text-forest-800">FOOD RISK SCORE</h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100/90 backdrop-blur-sm text-rose-800 border border-rose-200/80">
                    HIGH PRIORITY
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-extrabold text-rose-600 font-display">85</span>
                  <span className="text-forest-800/40 text-base font-bold">/ 100</span>
                </div>

                <div className="p-3.5 bg-rose-50/80 backdrop-blur-sm border border-rose-200/80 rounded-2xl space-y-1">
                  <div className="flex items-center gap-1.5 text-rose-900 font-bold text-xs">
                    <Flame className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Expires Soon</span>
                  </div>
                  <p className="text-[11px] text-rose-800/80 leading-relaxed">
                    Recommended Action: Create a rescue listing and prioritize pickup.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between text-[11px] text-forest-800/50 border-t border-wheat-200/60">
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
      <section id="features" ref={featuresRef} className="py-16 sm:py-24 bg-white/60 backdrop-blur-md border-b border-wheat-200/80 scroll-mt-14 relative">
        <div aria-hidden="true" className="pointer-events-none absolute top-1/2 left-1/3 w-96 h-96 bg-gold-400/10 rounded-full blur-3xl" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 relative z-10">
          {/* Heading */}
          <div className={`text-center max-w-2xl mx-auto space-y-3 transition-all duration-700 ${
            featuresVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}>
            <span className="font-mono text-xs uppercase tracking-widest text-tomato-500 font-bold">
              PLATFORM FEATURES
            </span>
            <h2 className="font-display text-3xl sm:text-4xl text-forest-800 font-bold">
              Everything You Need to Rescue More Food.
            </h2>
            <p className="text-xs sm:text-sm text-forest-800/70 leading-relaxed">
              Designed to minimize waste, maximize rescue velocity, and provide clear operational visibility.
            </p>
          </div>

          {/* 6 Feature Cards Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                num: "01",
                title: "Smart Inventory Telemetry",
                desc: "Keep surplus batches organized with precision quantities, categories, and real-time shelf-life telemetry.",
                icon: Package,
              },
              {
                num: "02",
                title: "AI Freshness Inspector",
                desc: "Computer vision and automated multi-factor risk scoring to instantly assess perishable shelf-life.",
                icon: Sparkles,
              },
              {
                num: "03",
                title: "Zero-Waste Recipe Engine",
                desc: "Generate creative, safe culinary repurposing recipes from on-hand surplus to prevent food waste.",
                icon: Utensils,
              },
              {
                num: "04",
                title: "Live Radar Map & Routing",
                desc: "Interactive proximity mapping to spot nearby community partners, NGOs, and food banks instantly.",
                icon: Compass,
              },
              {
                num: "05",
                title: "Cryptographic QR Handshake",
                desc: "Secure pickup verification with one-time digital handshakes and chain-of-custody tracking.",
                icon: ShieldCheck,
              },
              {
                num: "06",
                title: "ESG & CSR Tax Certification",
                desc: "Automated tax receipts, landfill diversion analytics, and CSR compliance reports ready for audit.",
                icon: FileText,
              },
            ].map((feat, idx) => {
              const FeatIcon = feat.icon;
              return (
                <div
                  key={feat.title}
                  style={{ transitionDelay: `${idx * 60}ms` }}
                  className={`glass-card glass-card-hover rounded-2xl p-6 flex flex-col justify-between shadow-2xs group ${
                    featuresVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-forest-800/40 group-hover:text-forest-800">
                        {feat.num}
                      </span>
                      <div className="p-2.5 rounded-xl bg-white/80 backdrop-blur-sm border border-wheat-200/80 text-forest-700 group-hover:bg-forest-800 group-hover:text-wheat-50 transition-colors">
                        <FeatIcon className="w-4 h-4" />
                      </div>
                    </div>
                    <h3 className="font-display font-bold text-base sm:text-lg text-forest-800">
                      {feat.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-forest-800/70 leading-relaxed">
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
      <section id="impact" ref={impactRef} className="py-16 sm:py-24 bg-wheat-50/70 backdrop-blur-sm border-b border-wheat-200/80 scroll-mt-14 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Heading */}
          <div className={`text-center max-w-2xl mx-auto space-y-3 transition-all duration-700 ${
            impactVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}>
            <span className="font-mono text-xs uppercase tracking-widest text-emerald-700 font-bold">
              MEASURE THE DIFFERENCE
            </span>
            <h2 className="font-display text-3xl sm:text-4xl text-forest-800 font-bold">
              Every Rescue Counts.
            </h2>
            <p className="text-xs sm:text-sm text-forest-800/70 leading-relaxed">
              Food rescue becomes more powerful when you can see the impact. Use your platform data to understand what is being saved, rescued, and completed.
            </p>
          </div>

          {/* 4 Impact Telemetry Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className={`glass-card glass-card-hover rounded-2xl p-6 space-y-2 shadow-2xs transition-all duration-700 ${
              impactVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}>
              <div className="w-8 h-8 rounded-lg bg-emerald-100/80 backdrop-blur-sm text-emerald-700 flex items-center justify-center mb-1">
                <Leaf className="w-4 h-4" />
              </div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-forest-800/50 block font-semibold">
                Food Rescued
              </span>
              <p className="font-display font-bold text-2xl sm:text-3xl text-forest-800">
                {platformMetrics?.total_food_rescued_kg ? `${platformMetrics.total_food_rescued_kg} kg` : "Track Impact"}
              </p>
              <p className="text-xs text-forest-800/60 leading-relaxed">
                Total surplus food successfully collected &amp; redistributed.
              </p>
            </div>

            <div className={`glass-card glass-card-hover rounded-2xl p-6 space-y-2 shadow-2xs transition-all duration-700 delay-100 ${
              impactVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}>
              <div className="w-8 h-8 rounded-lg bg-forest-100/80 backdrop-blur-sm text-forest-700 flex items-center justify-center mb-1">
                <Truck className="w-4 h-4" />
              </div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-forest-800/50 block font-semibold">
                Pickups Completed
              </span>
              <p className="font-display font-bold text-2xl sm:text-3xl text-forest-800">
                {platformMetrics?.completed_pickups_count ? `${platformMetrics.completed_pickups_count}` : "Verified Handshakes"}
              </p>
              <p className="text-xs text-forest-800/60 leading-relaxed">
                Coordinated donor-to-NGO handoffs completed with digital pass verification.
              </p>
            </div>

            <div className={`glass-card glass-card-hover rounded-2xl p-6 space-y-2 shadow-2xs transition-all duration-700 delay-200 ${
              impactVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}>
              <div className="w-8 h-8 rounded-lg bg-amber-100/80 backdrop-blur-sm text-amber-700 flex items-center justify-center mb-1">
                <Activity className="w-4 h-4" />
              </div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-forest-800/50 block font-semibold">
                Food At Risk Monitored
              </span>
              <p className="font-display font-bold text-2xl sm:text-3xl text-forest-800">
                {platformMetrics?.items_at_risk_count ? `${platformMetrics.items_at_risk_count} Items` : "Live Telemetry"}
              </p>
              <p className="text-xs text-forest-800/60 leading-relaxed">
                Active perishable batches tracked with automated risk scoring.
              </p>
            </div>

            <div className={`glass-card glass-card-hover rounded-2xl p-6 space-y-2 shadow-2xs transition-all duration-700 delay-300 ${
              impactVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}>
              <div className="w-8 h-8 rounded-lg bg-gold-100/80 backdrop-blur-sm text-gold-700 flex items-center justify-center mb-1">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-forest-800/50 block font-semibold">
                Waste Reduction
              </span>
              <p className="font-display font-bold text-2xl sm:text-3xl text-forest-800">
                {platformMetrics?.waste_reduction_rate ? `${platformMetrics.waste_reduction_rate}%` : "100% Goal"}
              </p>
              <p className="text-xs text-forest-800/60 leading-relaxed">
                Measurable reduction in commercial landfill disposal.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 10. VISUAL IMPACT STATEMENT                                   */}
      {/* ------------------------------------------------------------- */}
      <section ref={statementRef} className="py-20 sm:py-28 bg-forest-900 text-wheat-50 text-center relative overflow-hidden border-y border-forest-800">
        <div className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 relative z-10 transition-all duration-700 ${
          statementVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}>
          <div className="w-10 h-10 rounded-full glass-forest text-emerald-300 flex items-center justify-center mx-auto mb-2">
            <Leaf className="w-5 h-5" />
          </div>

          <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
            Less Waste. More Rescue. Greater Impact.
          </h2>

          <p className="text-sm sm:text-base text-wheat-200/80 max-w-xl mx-auto leading-relaxed">
            Small actions across kitchens, businesses, organizations, and communities can create a meaningful difference.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 11. FINAL CTA                                                 */}
      {/* ------------------------------------------------------------- */}
      <section ref={ctaRef} className="py-16 sm:py-24 bg-white/60 backdrop-blur-md border-b border-wheat-200/80 relative">
        <div aria-hidden="true" className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-400/15 rounded-full blur-3xl" />
        <div className={`max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10 transition-all duration-700 ${
          ctaVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-forest-800 tracking-tight">
            Ready to Rescue More Food?
          </h2>

          <p className="text-xs sm:text-base text-forest-800/70 max-w-lg mx-auto leading-relaxed">
            Start tracking surplus food, prioritize what needs attention, and turn potential waste into meaningful impact.
          </p>

          <div className="pt-2">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-forest-800 text-wheat-50 font-bold text-sm sm:text-base rounded-xl hover:bg-forest-700 shadow-md hover:shadow-xl transition-all active:scale-[0.99]"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <p className="text-xs font-mono text-forest-800/50 pt-1">
            Make every surplus item count.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 12. FOOTER                                                    */}
      {/* ------------------------------------------------------------- */}
      <footer className="py-12 px-5 sm:px-6 lg:px-8 bg-wheat-50 border-t border-wheat-200 w-full">
        <div className="max-w-6xl w-full mx-auto space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-wheat-200/80 pb-8 text-center md:text-left w-full">
            <div className="space-y-1 text-center md:text-left w-full md:w-auto">
              <span className="font-display italic text-lg font-bold text-forest-800 block">
                HARVEST LEDGER
              </span>
              <p className="text-xs text-forest-800/60 font-mono">
                Smart food rescue for a more sustainable future.
              </p>
            </div>

            <nav className="flex flex-wrap items-center justify-center md:justify-end gap-x-6 gap-y-2.5 text-xs font-semibold text-forest-800/70 w-full md:w-auto">
              <Link to="/register" className="hover:text-forest-950 transition-colors py-1 px-1">
                Platform
              </Link>
              <a href="#how-it-works" className="hover:text-forest-950 transition-colors py-1 px-1">
                How It Works
              </a>
              <a href="#features" className="hover:text-forest-950 transition-colors py-1 px-1">
                Features
              </a>
              <a href="#impact" className="hover:text-forest-950 transition-colors py-1 px-1">
                Impact
              </a>
            </nav>
          </div>



          {/* 🌟 Founder & Engineering Credit for Google Knowledge Graph & Visibility */}
          <div
            itemScope
            itemType="https://schema.org/Person"
            className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-forest-800/75 border-b border-wheat-200/60 pb-6 text-center md:text-left w-full"
          >
            <link itemProp="image" href="/founder-square.jpg" />
            <div className="space-y-1 text-center md:text-left max-w-2xl w-full md:w-auto">
              <span className="font-bold text-forest-900 text-sm block font-sans sm:font-mono text-center md:text-left">
                Founded &amp; Built by <span itemProp="name">Prey Goti</span>
              </span>
              <p className="text-xs text-forest-800/80 leading-relaxed font-sans sm:font-mono text-center md:text-left">
                <span itemProp="jobTitle">Founder of Harvest Ledger and Full-Stack AI Engineer</span> focused on building technology for smarter food waste management and community redistribution.
              </p>
            </div>

            <div className="flex items-center justify-center md:justify-end gap-2.5 shrink-0 pt-1 md:pt-0 font-semibold text-xs w-full md:w-auto">
              <a
                href="https://www.linkedin.com/in/prey-goti-31a772318"
                target="_blank"
                rel="author noopener noreferrer"
                itemProp="sameAs"
                className="inline-flex items-center gap-1.5 text-forest-800 hover:text-[#0a66c2] transition-colors py-1 px-1"
                title="Prey Goti LinkedIn Profile"
              >
                <svg className="w-3.5 h-3.5 fill-current text-[#0a66c2]" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
                <span>LinkedIn</span>
              </a>

              <span className="text-forest-800/40 select-none">&bull;</span>

              <a
                href="https://github.com/preygoti"
                target="_blank"
                rel="author noopener noreferrer"
                itemProp="sameAs"
                className="inline-flex items-center gap-1.5 text-forest-800 hover:text-forest-950 transition-colors py-1 px-1"
                title="Prey Goti GitHub Profile"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span>GitHub</span>
              </a>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-forest-800/50 font-mono text-center md:text-left w-full">
            <p className="text-center md:text-left leading-relaxed">
              &copy; {new Date().getFullYear()} HARVEST LEDGER &bull; Built to help turn surplus into impact.
            </p>
            <p className="text-[11px] text-forest-800/40 text-center md:text-right leading-relaxed">
              Food Waste Management &bull; Community Redistribution
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
