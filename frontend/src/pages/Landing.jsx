import { useState, useId } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Scan,
  Upload,
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
  DollarSign,
  HeartHandshake,
  Users,
  Compass,
  ChevronDown,
  ChevronUp,
  Calculator,
  Globe2,
  Flame,
  Utensils,
  BarChart3,
  HelpCircle,
  ExternalLink,
  ShieldAlert,
  Zap,
} from "lucide-react";
import Card3D from "../components/Card3D";

export default function Landing() {
  // Interactive Calculator State
  const [wasteVolumeKg, setWasteVolumeKg] = useState(350);
  const [activeWorkflowTab, setActiveWorkflowTab] = useState(0);
  const [openFaq, setOpenFaq] = useState(null);

  // Dynamic calculations for the ROI Calculator
  const mealsProvided = Math.round(wasteVolumeKg * 2.5);
  const co2AvoidedKg = Math.round(wasteVolumeKg * 2.45);
  const taxReliefEst = Math.round(wasteVolumeKg * 140); // Approx ₹140 or equivalent currency / kg value
  const landfillSaved = Math.round(wasteVolumeKg * 25);

  const workflowSteps = [
    {
      num: "01",
      title: "Rapid Multi-Modal Ingestion",
      badge: "Module 01 · Ledger Ingestion",
      icon: Scan,
      desc: "Log batches in seconds. Use your device camera to scan 1D/2D barcodes with instant metadata lookup, upload bulk CSV spreadsheets with automated column mapping, or use our smart form.",
      highlights: [
        "Live camera barcode scanner (`html5-qrcode`)",
        "PapaParse client-side batch CSV processing",
        "Custom storage bin & shelf-life logging",
      ],
      mockup: {
        title: "Barcode Scanner Active",
        subtitle: "Camera OCR & Barcode Decoding",
        code: "8901030894512",
        detected: "Organic Greek Yogurt · 24 Units (Cold Room 2)",
      },
    },
    {
      num: "02",
      title: "AI Risk Engine & Freshness Scan",
      badge: "Module 02 · Predictive AI",
      icon: Sparkles,
      desc: "Our heuristic waste risk engine scores each inventory item from 0 to 100 based on expiry urgency and daily consumption velocity, accompanied by AI vision freshness inspection.",
      highlights: [
        "0–100 waste risk scoring engine",
        "Automated `Reorder +X` stock buffer advice",
        "Real-time reactive 1-second countdown tickers",
      ],
      mockup: {
        title: "AI Spoilage Prediction",
        subtitle: "Freshness Index: 94% (Grade A)",
        code: "RISK LEVEL: WATCH (Score 52)",
        detected: "Consume or list within 48h for 100% waste avoidance",
      },
    },
    {
      num: "03",
      title: "1-Click Surplus Marketplace",
      badge: "Module 03 · Redistribution",
      icon: Store,
      desc: "Instantly broadcast near-expiry inventory to verified local NGOs and food banks on our real-time radar map with dynamic GPS radius and turn-by-turn routing.",
      highlights: [
        "Live Radar Map powered by OpenStreetMap",
        "Multi-city address geocoding & Haversine distance",
        "Turn-by-turn Google Maps driving navigation",
      ],
      mockup: {
        title: "Surplus Broadcast Active",
        subtitle: "Available to 18 Verified Non-Profits Nearby",
        code: "RADIUS: 15 KM",
        detected: "40 Liters Milk & 18 Sourdough Loaves Ready for Pickup",
      },
    },
    {
      num: "04",
      title: "Digital QR Handshake & ESG Statement",
      badge: "Module 04 · Trust & Telemetry",
      icon: ShieldCheck,
      desc: "Coordinate pickups with competitive NGO requests. Once accepted, drivers present a cryptographic QR pass at storefront pickup to verify handoff and auto-generate ESG audit tax relief certificates.",
      highlights: [
        "Cryptographic Driver Rescue Pass (`HL-RES-XXXX`)",
        "Donor storefront QR camera verification",
        "Printable official ESG tax deduction audit statements",
      ],
      mockup: {
        title: "Handshake Verified 🎉",
        subtitle: "Chain of Custody Transferred to Helping Hands NGO",
        code: "PASS ID: HL-RES-5002",
        detected: "ESG Statement Generated: 100 kg Diverted (245 kg CO₂e Saved)",
      },
    },
  ];

  const faqs = [
    {
      q: "How does Harvest Ledger prevent edible food from reaching landfills?",
      a: "Harvest Ledger pairs predictive shelf-life tracking with a real-time redistribution marketplace. When food inventory nears its expiration date, businesses can post it with a single click. Verified local NGOs and food rescue charities receive immediate alerts, request the batch, and dispatch drivers for timely pickup.",
    },
    {
      q: "What is the Digital QR Rescue Handshake and how does it work?",
      a: "To eliminate fraud and maintain verifiable chain-of-custody, the platform generates a unique Digital Rescue Pass QR code for the NGO driver once the donor accepts their request. Upon arrival at the donor's storefront, the donor scans the driver's QR pass using our built-in camera scanner. This closes the rescue loop, releases the custody record, and logs compliance data.",
    },
    {
      q: "How are the ESG Tax Relief & Environmental metrics computed?",
      a: "Every verified food donation automatically calculates: 1) Fair-market valuation tax deduction credits, 2) Landfill disposal fees avoided by weight, 3) Meals provided (standard ratio of ~2.5 meals per kg), and 4) CO₂e greenhouse gas emissions prevented (based on EPA WARM landfill diversion emission factors of 2.45 kg CO₂e per kg of food).",
    },
    {
      q: "Is Harvest Ledger free for NGOs and community food banks?",
      a: "Yes! 100% of Harvest Ledger's NGO tools—including the Available Surplus Marketplace, Live Radar Map, Driver QR Passes, and Impact Analytics—are completely free for registered non-profit organizations, shelters, and community kitchens.",
    },
    {
      q: "How does the mandatory 6-digit email OTP verification protect users?",
      a: "During registration and password resets, the platform dispatches a secure 6-digit verification code to the user's work email (via Brevo HTTPS API or SMTP). This prevents unauthorized signups, ensures all donor and non-profit accounts are legitimate, and protects organization identity.",
    },
    {
      q: "Can I import large existing inventory databases using Excel or CSV?",
      a: "Yes! Harvest Ledger includes a bulk CSV Ingestion Engine. You can upload spreadsheets with hundreds of rows, download standardized CSV templates, map columns automatically, and validate date formats in real time with client-side zero-latency parsing.",
    },
  ];

  const toggleFaq = (idx) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  return (
    <div className="min-h-screen bg-wheat-50 text-forest-800 flex flex-col overflow-x-hidden selection:bg-forest-800 selection:text-wheat-100">
      {/* ------------------------------------------------------------- */}
      {/* STICKY NAVIGATION HEADER                                      */}
      {/* ------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 bg-wheat-50/90 backdrop-blur-md border-b border-wheat-200/80 transition-all">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="group flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-forest-800 text-wheat-50 flex items-center justify-center font-bold text-sm shadow-2xs group-hover:scale-105 transition-transform">
                HL
              </div>
              <div>
                <p className="font-display italic text-xl sm:text-2xl text-forest-800 font-bold tracking-tight leading-none">
                  Harvest&nbsp;Ledger
                </p>
                <p className="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-forest-800/50 mt-0.5">
                  AI Surplus &amp; Redistribution
                </p>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-5 text-xs font-semibold text-forest-800/70">
              <a href="#how-it-works" className="hover:text-forest-900 transition-colors">
                How It Works
              </a>
              <a href="#benefits" className="hover:text-forest-900 transition-colors">
                Key Benefits
              </a>
              <a href="#calculator" className="hover:text-forest-900 transition-colors">
                ROI Calculator
              </a>
              <a href="#environmental-impact" className="hover:text-forest-900 transition-colors">
                Environmental Impact
              </a>
              <a href="#faq" className="hover:text-forest-900 transition-colors">
                FAQ
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-forest-800 bg-white border border-wheat-300 rounded-xl hover:bg-wheat-100 transition-all shadow-2xs active:scale-[0.98]"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold bg-forest-800 text-wheat-50 border border-forest-800 rounded-xl hover:bg-forest-700 shadow-sm transition-all active:scale-[0.98] flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />
            </Link>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* HERO SECTION                                                  */}
      {/* ------------------------------------------------------------- */}
      <section className="relative max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 pb-14 sm:pb-20 grid md:grid-cols-12 gap-8 lg:gap-12 items-center">
        <div className="md:col-span-7 space-y-5 sm:space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-800/10 border border-forest-800/20 text-forest-800 font-mono text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>AI-Driven Food Waste Intelligence &bull; Live v2.0</span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.08] text-forest-800 font-bold tracking-tight">
            Stop Food Spoilage. <br />
            <span className="italic font-normal text-forest-700">Predict, Rescue &amp; Redistribute</span> Surplus.
          </h1>

          <p className="text-forest-800/75 text-base sm:text-lg leading-relaxed max-w-xl">
            A high-precision operating platform connecting commercial food businesses with verified non-profit networks. Features camera barcode scanning, AI waste risk scoring, live radar discovery, digital QR handshakes, and automated ESG tax deductions.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-forest-800 text-wheat-50 border border-forest-800 rounded-xl font-semibold text-sm sm:text-base hover:bg-forest-700 shadow-md transition-all active:scale-[0.99]"
            >
              <span>Register Organization Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-forest-800 border border-wheat-300 rounded-xl font-semibold text-sm sm:text-base hover:bg-wheat-100 transition-all shadow-2xs active:scale-[0.99]"
            >
              <Compass className="w-4 h-4 text-forest-600" />
              <span>Explore How It Works</span>
            </a>
          </div>

          {/* Quick Feature Tickers */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-6 pt-3 text-xs font-mono text-forest-800/70">
            <span className="flex items-center gap-1.5 bg-wheat-100/70 px-2.5 py-1 rounded-lg border border-wheat-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              1-Sec Expiry Countdowns
            </span>
            <span className="flex items-center gap-1.5 bg-wheat-100/70 px-2.5 py-1 rounded-lg border border-wheat-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Zero-Landfill Guarantee
            </span>
            <span className="flex items-center gap-1.5 bg-wheat-100/70 px-2.5 py-1 rounded-lg border border-wheat-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Official ESG Tax Statement
            </span>
          </div>
        </div>

        {/* 3D Live Mock Interactive Ledger Card */}
        <div className="md:col-span-5 relative">
          {/* Ambient 3D Floating Pill 1 (Top Left) */}
          <div className="absolute -top-4 -left-3 z-20 hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-forest-800 text-wheat-50 rounded-full shadow-lg text-xs font-mono font-semibold animate-float-slow border border-forest-600">
            <Leaf className="w-3.5 h-3.5 text-emerald-400" />
            <span>100% Landfill Diversion</span>
          </div>

          {/* Ambient 3D Floating Pill 2 (Bottom Right) */}
          <div className="absolute -bottom-4 -right-3 z-20 hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-tomato-500 text-white rounded-full shadow-lg text-xs font-mono font-semibold animate-float-delayed border border-tomato-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>Live AI Risk Matrix</span>
          </div>

          <Card3D maxTilt={8} scale={1.02}>
            <div className="bg-white border border-wheat-200 rounded-2xl shadow-xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-wheat-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="font-mono text-xs uppercase tracking-widest text-forest-800/80 font-bold">
                    Live Surplus Ledger
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-forest-50 text-forest-700 font-semibold border border-forest-100">
                  Real-Time &bull; Active
                </span>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    name: "Fresh Whole Milk · 40 Liters",
                    location: "Cold Storage B",
                    days: "14h 22m remaining",
                    risk: "CRITICAL · 88",
                    color: "#dc2626",
                    bg: "rgba(220, 38, 38, 0.1)",
                  },
                  {
                    name: "Artisan Sourdough · 25 Loaves",
                    location: "Bakery Bin 1",
                    days: "2d 06h remaining",
                    risk: "WATCH · 54",
                    color: "#d97706",
                    bg: "rgba(217, 119, 6, 0.1)",
                  },
                  {
                    name: "Organic Apples · 65 kg",
                    location: "Produce Bay A",
                    days: "4d 18h remaining",
                    risk: "FRESH · 18",
                    color: "#16a34a",
                    bg: "rgba(22, 163, 74, 0.1)",
                  },
                ].map((row) => (
                  <div
                    key={row.name}
                    className="p-3 rounded-xl bg-wheat-50/50 border border-wheat-200 flex items-center justify-between gap-2 hover:border-forest-400/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-forest-800 truncate">{row.name}</p>
                      <p className="text-[10px] sm:text-[11px] text-forest-800/60 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-forest-600 shrink-0" />
                        <span>{row.location} &bull; <strong className="text-forest-800">{row.days}</strong></span>
                      </p>
                    </div>
                    <span
                      className="font-mono text-[9px] sm:text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap shrink-0"
                      style={{ color: row.color, backgroundColor: row.bg }}
                    >
                      {row.risk}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-forest-800/60 border-t border-wheat-100 font-mono">
                <span className="flex items-center gap-1 text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  QR Handshake Ready
                </span>
                <span className="font-semibold text-forest-800 text-[11px]">~325 Meals Potential</span>
              </div>
            </div>
          </Card3D>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* LIVE PLATFORM TELEMETRY & IMPACT STATS                        */}
      {/* ------------------------------------------------------------- */}
      <section className="bg-forest-800 text-wheat-50 py-10 border-y border-forest-700 shadow-inner">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            <div className="space-y-1">
              <div className="text-2xl sm:text-4xl font-display font-bold text-white tracking-tight">
                148,500+
              </div>
              <p className="text-xs sm:text-sm text-wheat-200/80 font-mono uppercase tracking-wider">
                Nutritious Meals Rescued
              </p>
            </div>

            <div className="space-y-1">
              <div className="text-2xl sm:text-4xl font-display font-bold text-emerald-300 tracking-tight">
                371,250 kg
              </div>
              <p className="text-xs sm:text-sm text-wheat-200/80 font-mono uppercase tracking-wider">
                CO₂e Emissions Prevented
              </p>
            </div>

            <div className="space-y-1">
              <div className="text-2xl sm:text-4xl font-display font-bold text-gold-300 tracking-tight">
                ₹1.2 Cr+ / $145K
              </div>
              <p className="text-xs sm:text-sm text-wheat-200/80 font-mono uppercase tracking-wider">
                Tax Relief &amp; Waste Savings
              </p>
            </div>

            <div className="space-y-1">
              <div className="text-2xl sm:text-4xl font-display font-bold text-white tracking-tight">
                520+
              </div>
              <p className="text-xs sm:text-sm text-wheat-200/80 font-mono uppercase tracking-wider">
                Verified Donors &amp; Non-Profits
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* HOW IT WORKS: 4-STEP INTERACTIVE END-TO-END WORKFLOW         */}
      {/* ------------------------------------------------------------- */}
      <section id="how-it-works" className="py-16 sm:py-24 bg-white border-b border-wheat-200 scroll-mt-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="font-mono text-xs uppercase tracking-widest text-tomato-500 font-semibold">
              Step-By-Step Architecture
            </span>
            <h2 className="font-display text-3xl sm:text-4xl text-forest-800 font-bold">
              How Harvest Ledger Works
            </h2>
            <p className="text-xs sm:text-sm text-forest-800/70">
              A frictionless digital bridge connecting commercial kitchens, grocers, and community food rescue operations in real time.
            </p>
          </div>

          {/* Step Selector Tabs for Desktop / Mobile */}
          <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {workflowSteps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = activeWorkflowTab === idx;
              return (
                <button
                  key={step.num}
                  onClick={() => setActiveWorkflowTab(idx)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 border ${
                    isActive
                      ? "bg-forest-800 text-wheat-50 border-forest-800 shadow-sm"
                      : "bg-wheat-50/70 text-forest-800/70 border-wheat-200 hover:bg-wheat-100"
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold ${
                    isActive ? "bg-emerald-500 text-forest-900" : "bg-wheat-200 text-forest-800"
                  }`}>
                    {step.num}
                  </span>
                  <span>{step.title}</span>
                </button>
              );
            })}
          </div>

          {/* Active Step Showcase Card */}
          {(() => {
            const current = workflowSteps[activeWorkflowTab];
            const StepIcon = current.icon;
            return (
              <div className="bg-wheat-50/70 border border-wheat-200 rounded-3xl p-6 sm:p-10 grid md:grid-cols-12 gap-8 items-center shadow-sm">
                <div className="md:col-span-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-forest-800 text-gold-400 shadow-2xs">
                      <StepIcon className="w-5 h-5" />
                    </span>
                    <span className="font-mono text-xs uppercase tracking-wider text-forest-800/60 font-semibold">
                      {current.badge}
                    </span>
                  </div>

                  <h3 className="font-display text-2xl sm:text-3xl text-forest-800 font-bold">
                    {current.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-forest-800/75 leading-relaxed">
                    {current.desc}
                  </p>

                  <div className="space-y-2 pt-2">
                    {current.highlights.map((h, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-forest-800/80 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-6">
                  <div className="bg-white border border-wheat-300/80 rounded-2xl p-6 shadow-md space-y-4 font-mono text-xs">
                    <div className="flex items-center justify-between border-b border-wheat-100 pb-3">
                      <span className="font-bold text-forest-800 text-sm">{current.mockup.title}</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        VERIFIED
                      </span>
                    </div>

                    <div className="p-3 bg-wheat-50 rounded-xl border border-wheat-200 space-y-1">
                      <p className="text-[11px] text-forest-800/60">{current.mockup.subtitle}</p>
                      <p className="font-bold text-forest-800 text-sm">{current.mockup.code}</p>
                    </div>

                    <p className="text-forest-800/70 text-[11px] leading-relaxed">
                      💡 {current.mockup.detected}
                    </p>

                    <div className="pt-2 flex items-center justify-between text-[10px] text-forest-800/50 border-t border-wheat-100">
                      <span>Harvest Ledger Protocol</span>
                      <span>Secure Handshake ✓</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* DUAL-SIDED VALUE PROPOSITIONS (BUSINESS VS NGO)               */}
      {/* ------------------------------------------------------------- */}
      <section id="benefits" className="py-16 sm:py-24 bg-wheat-50 border-b border-wheat-200 scroll-mt-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="font-mono text-xs uppercase tracking-widest text-tomato-500 font-semibold">
              Tailored Value Propositions
            </span>
            <h2 className="font-display text-3xl sm:text-4xl text-forest-800 font-bold">
              Built for Donors &amp; Rescuers
            </h2>
            <p className="text-xs sm:text-sm text-forest-800/70">
              Whether you are a commercial grocery chain or a local community food pantry, Harvest Ledger solves your biggest operational challenges.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Donor Side Card */}
            <div className="bg-white border border-wheat-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-forest-800 text-wheat-50 flex items-center justify-center shadow-2xs">
                  <Building2 className="w-6 h-6 text-gold-400" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-forest-800">
                    For Food Businesses
                  </h3>
                  <p className="text-xs font-mono text-forest-800/60 uppercase">
                    Restaurants, Supermarkets, Bakeries &amp; Hotels
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-forest-800/80">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-wheat-50/50 border border-wheat-100">
                  <DollarSign className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-forest-800 block">ESG Tax Deduction Relief</strong>
                    <span className="text-forest-800/70 text-xs">
                      Claim fair-market charitable deductions with automated print-ready audit certificates.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-wheat-50/50 border border-wheat-100">
                  <TrendingUp className="w-5 h-5 text-forest-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-forest-800 block">Eliminate Waste Hauling Fees</strong>
                    <span className="text-forest-800/70 text-xs">
                      Dramatically reduce expensive commercial landfill tipping charges by donating edible surplus.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-wheat-50/50 border border-wheat-100">
                  <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-forest-800 block">Automated Expiry Radar</strong>
                    <span className="text-forest-800/70 text-xs">
                      Zero guesswork. AI scores perishables 0–100 and alerts kitchen staff before spoilage occurs.
                    </span>
                  </div>
                </div>
              </div>

              <Link
                to="/register"
                className="w-full inline-flex items-center justify-center gap-2 py-3 bg-forest-800 text-wheat-50 rounded-xl font-semibold text-xs sm:text-sm hover:bg-forest-700 shadow-2xs transition-all"
              >
                <span>Register as Food Donor</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* NGO Side Card */}
            <div className="bg-white border border-wheat-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-2xs">
                  <HeartHandshake className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-forest-800">
                    For Non-Profits &amp; Food Banks
                  </h3>
                  <p className="text-xs font-mono text-forest-800/60 uppercase">
                    NGOs, Community Kitchens &amp; Relief Pantries
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-forest-800/80">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-wheat-50/50 border border-wheat-100">
                  <Utensils className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-forest-800 block">Free High-Quality Nutritious Food</strong>
                    <span className="text-forest-800/70 text-xs">
                      Access fresh produce, dairy, bakery, and prepared meals daily to feed vulnerable communities.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-wheat-50/50 border border-wheat-100">
                  <Compass className="w-5 h-5 text-forest-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-forest-800 block">Live Radar Map with Turn-by-Turn GPS</strong>
                    <span className="text-forest-800/70 text-xs">
                      Discover available donations in your immediate neighborhood with distance radius filters.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-wheat-50/50 border border-wheat-100">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-forest-800 block">Driver QR Pass Verification</strong>
                    <span className="text-forest-800/70 text-xs">
                      Instant mobile digital pass with zero paperwork. Fast storefront verification at pickup.
                    </span>
                  </div>
                </div>
              </div>

              <Link
                to="/register"
                className="w-full inline-flex items-center justify-center gap-2 py-3 bg-emerald-800 text-white rounded-xl font-semibold text-xs sm:text-sm hover:bg-emerald-700 shadow-2xs transition-all"
              >
                <span>Register as Non-Profit Partner</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* INTERACTIVE IMPACT & TAX ROI CALCULATOR WIDGET               */}
      {/* ------------------------------------------------------------- */}
      <section id="calculator" className="py-16 sm:py-24 bg-white border-b border-wheat-200 scroll-mt-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-forest-900 via-forest-800 to-forest-900 text-wheat-50 rounded-3xl p-6 sm:p-12 shadow-xl border border-forest-700 grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs border border-emerald-400/30">
                <Calculator className="w-3.5 h-3.5" />
                <span>Interactive Waste &amp; Tax ROI Simulator</span>
              </div>

              <h2 className="font-display text-3xl sm:text-4xl font-bold text-white leading-tight">
                Estimate Your Monthly Food Recovery &amp; Tax Write-Off
              </h2>

              <p className="text-xs sm:text-sm text-wheat-200/80 leading-relaxed">
                Slide your organization's estimated monthly surplus volume to visualize the tangible social, environmental, and financial benefits generated by Harvest Ledger.
              </p>

              {/* Slider Input */}
              <div className="space-y-3 bg-forest-950/60 p-5 rounded-2xl border border-forest-700/60">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-wheat-300">Estimated Monthly Surplus Volume:</span>
                  <span className="text-emerald-300 font-bold text-base sm:text-lg">{wasteVolumeKg} kg / month</span>
                </div>

                <input
                  type="range"
                  min="50"
                  max="2500"
                  step="25"
                  value={wasteVolumeKg}
                  onChange={(e) => setWasteVolumeKg(Number(e.target.value))}
                  className="w-full h-2 bg-forest-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />

                <div className="flex justify-between text-[10px] font-mono text-wheat-400">
                  <span>50 kg (Small Cafe)</span>
                  <span>1,000 kg (Supermarket)</span>
                  <span>2,500 kg+ (Hotel/Distributor)</span>
                </div>
              </div>
            </div>

            {/* Dynamic Results Grid */}
            <div className="lg:col-span-6 grid grid-cols-2 gap-3.5 sm:gap-4">
              <div className="bg-forest-950/70 p-5 rounded-2xl border border-forest-700/80 space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-wheat-300/70 font-mono block">
                  Meals Provided to Community
                </span>
                <strong className="text-2xl sm:text-3xl font-display font-bold text-emerald-300 block">
                  ~{mealsProvided.toLocaleString()}
                </strong>
                <p className="text-[10px] text-wheat-400">~2.5 meals per kg food rescued</p>
              </div>

              <div className="bg-forest-950/70 p-5 rounded-2xl border border-forest-700/80 space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-wheat-300/70 font-mono block">
                  CO₂e Emissions Prevented
                </span>
                <strong className="text-2xl sm:text-3xl font-display font-bold text-white block">
                  {co2AvoidedKg.toLocaleString()} kg
                </strong>
                <p className="text-[10px] text-wheat-400">Methane prevented from decomposing</p>
              </div>

              <div className="bg-forest-950/70 p-5 rounded-2xl border border-forest-700/80 space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-wheat-300/70 font-mono block">
                  Est. ESG Tax Relief Credits
                </span>
                <strong className="text-2xl sm:text-3xl font-display font-bold text-gold-300 block">
                  ₹{taxReliefEst.toLocaleString()}
                </strong>
                <p className="text-[10px] text-wheat-400">Fair-market charitable write-off</p>
              </div>

              <div className="bg-forest-950/70 p-5 rounded-2xl border border-forest-700/80 space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-wheat-300/70 font-mono block">
                  Dumpster Fees Avoided
                </span>
                <strong className="text-2xl sm:text-3xl font-display font-bold text-white block">
                  ₹{landfillSaved.toLocaleString()}
                </strong>
                <p className="text-[10px] text-wheat-400">Direct waste management savings</p>
              </div>

              <div className="col-span-2 pt-2">
                <Link
                  to="/register"
                  className="w-full inline-flex items-center justify-center gap-2 py-3 bg-emerald-500 text-forest-950 rounded-xl font-bold text-xs sm:text-sm hover:bg-emerald-400 shadow-md transition-all active:scale-[0.99]"
                >
                  <span>Start Rescuing Food Today &bull; Free Registration</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* ENVIRONMENTAL & PLANET IMPACT BREAKDOWN                       */}
      {/* ------------------------------------------------------------- */}
      <section id="environmental-impact" className="py-16 sm:py-24 bg-wheat-50 border-b border-wheat-200 scroll-mt-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="font-mono text-xs uppercase tracking-widest text-tomato-500 font-semibold">
              Planet &amp; Climate Action
            </span>
            <h2 className="font-display text-3xl sm:text-4xl text-forest-800 font-bold">
              Why Food Waste Prevention Matters
            </h2>
            <p className="text-xs sm:text-sm text-forest-800/70">
              When food is discarded in landfills, it decomposes anaerobically into methane gas—a greenhouse gas 28 times more potent than carbon dioxide.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white border border-wheat-200 rounded-2xl p-6 space-y-3 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <Globe2 className="w-5 h-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-forest-800">
                8–10% of Global Emissions
              </h3>
              <p className="text-xs text-forest-800/70 leading-relaxed">
                Global food waste generates more emissions than the entire commercial aviation sector. Harvest Ledger directly closes this loop at the local store level.
              </p>
            </div>

            <div className="bg-white border border-wheat-200 rounded-2xl p-6 space-y-3 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <Leaf className="w-5 h-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-forest-800">
                100% Edible Surplus Diverted
              </h3>
              <p className="text-xs text-forest-800/70 leading-relaxed">
                By pairing real-time live countdowns with local NGO pickup coordination, edible inventory is consumed before shelf-life expires.
              </p>
            </div>

            <div className="bg-white border border-wheat-200 rounded-2xl p-6 space-y-3 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-forest-800">
                UN SDG 12.3 Alignment
              </h3>
              <p className="text-xs text-forest-800/70 leading-relaxed">
                Empowers organizations to achieve United Nations Sustainable Development Goal 12.3: halving per capita global food waste by 2030.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* FREQUENTLY ASKED QUESTIONS (INTERACTIVE ACCORDION)            */}
      {/* ------------------------------------------------------------- */}
      <section id="faq" className="py-16 sm:py-24 bg-white border-b border-wheat-200 scroll-mt-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-2">
            <span className="font-mono text-xs uppercase tracking-widest text-tomato-500 font-semibold">
              Got Questions?
            </span>
            <h2 className="font-display text-3xl sm:text-4xl text-forest-800 font-bold">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-forest-800/70">
              Everything you need to know about the Harvest Ledger food rescue ecosystem.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="border border-wheat-200 rounded-2xl overflow-hidden bg-wheat-50/40 transition-colors"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full flex items-center justify-between p-5 text-left text-sm font-bold text-forest-800 hover:bg-wheat-100/60 transition-colors gap-4"
                  >
                    <span>{faq.q}</span>
                    <span className="p-1 rounded-lg bg-white border border-wheat-200 text-forest-700 shrink-0">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-forest-800/75 leading-relaxed border-t border-wheat-200/60 bg-white/70 animate-in fade-in duration-150">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* FINAL CALL TO ACTION (CTA BANNER)                             */}
      {/* ------------------------------------------------------------- */}
      <section className="py-16 sm:py-20 bg-forest-800 text-wheat-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center justify-center mx-auto shadow-2xs">
            <Zap className="w-6 h-6" />
          </div>

          <h2 className="font-display text-3xl sm:text-5xl font-bold text-white tracking-tight">
            Ready to Build a Zero-Waste Food Operation?
          </h2>

          <p className="text-xs sm:text-base text-wheat-200/80 max-w-xl mx-auto leading-relaxed">
            Join hundreds of forward-thinking supermarkets, bakeries, cloud kitchens, and verified non-profit organizations creating a resilient, waste-free world.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-emerald-500 text-forest-950 rounded-xl font-bold text-sm sm:text-base hover:bg-emerald-400 shadow-lg transition-all active:scale-[0.99]"
            >
              <span>Create Free Account</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-forest-900 text-white border border-forest-700 rounded-xl font-semibold text-sm sm:text-base hover:bg-forest-950 transition-all shadow-sm active:scale-[0.99]"
            >
              <span>Sign In to Dashboard</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* RICH PADDED FOOTER                                            */}
      {/* ------------------------------------------------------------- */}
      <footer className="mt-auto py-12 px-4 sm:px-6 lg:px-8 border-t border-wheat-200 bg-white">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-wheat-100 pb-8">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-forest-800 text-wheat-50 flex items-center justify-center font-bold text-xs">
                  HL
                </div>
                <span className="font-display italic text-xl text-forest-800 font-bold">
                  Harvest Ledger
                </span>
              </div>
              <p className="text-xs text-forest-800/60 font-mono">
                AI-Powered Food Waste Management &amp; Redistribution Platform
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs font-semibold text-forest-800/70">
              <Link to="/register" className="hover:text-forest-900 transition-colors">
                Register Organization
              </Link>
              <Link to="/login" className="hover:text-forest-900 transition-colors">
                Sign In
              </Link>
              <a href="#how-it-works" className="hover:text-forest-900 transition-colors">
                Architecture
              </a>
              <a href="#calculator" className="hover:text-forest-900 transition-colors">
                ROI Calculator
              </a>
              <a href="#faq" className="hover:text-forest-900 transition-colors">
                FAQs
              </a>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-forest-800/50 font-mono">
            <p>
              &copy; {new Date().getFullYear()} Harvest Ledger &bull; Empowering Zero-Waste Communities Worldwide
            </p>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                All Systems Operational
              </span>
              <span>100% Open Standards</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
