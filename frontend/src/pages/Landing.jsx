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
} from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-wheat-50 text-forest-800 flex flex-col overflow-x-hidden">
      {/* ------------------------------------------------------------- */}
      {/* NAVIGATION HEADER                                             */}
      {/* ------------------------------------------------------------- */}
      <header className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        <div>
          <p className="font-display italic text-2xl sm:text-3xl text-forest-800 font-bold tracking-tight">
            Harvest&nbsp;Ledger
          </p>
          <p className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-forest-800/50">
            Surplus &amp; Food Redistribution
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/login"
            className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-forest-800 hover:text-forest-600 rounded-lg hover:bg-wheat-100 transition-colors"
          >
            Sign in
          </Link>
          <Link
            to="/register"
            className="px-3.5 sm:px-5 py-2 text-xs sm:text-sm font-medium bg-forest-800 text-wheat-50 rounded-lg hover:bg-forest-700 shadow-sm transition-all active:scale-[0.98]"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* HERO SECTION                                                  */}
      {/* ------------------------------------------------------------- */}
      <section className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 pb-16 sm:pb-24 grid md:grid-cols-12 gap-8 lg:gap-12 items-center">
        <div className="md:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-tomato-500/10 border border-tomato-500/20 text-tomato-600 font-mono text-xs">
            <span className="w-2 h-2 rounded-full bg-tomato-500 animate-pulse" />
            <span>AI-Driven Food Waste Intelligence</span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.08] text-forest-800 font-bold">
            Track what's about to be wasted, <span className="italic font-normal">before</span> it is.
          </h1>

          <p className="text-forest-800/70 text-base sm:text-lg leading-relaxed max-w-xl">
            A dual-sided web platform for food businesses and recipient non-profits — featuring expiry tracking, barcode &amp; QR scanning, bulk CSV imports, AI risk scoring, and a live redistribution marketplace.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-tomato-500 text-white rounded-xl font-medium text-sm sm:text-base hover:bg-tomato-600 shadow-sm transition-all active:scale-[0.99]"
            >
              <span>Register Your Organization</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center px-6 py-3.5 bg-white text-forest-800 border border-wheat-200 rounded-xl font-medium text-sm sm:text-base hover:bg-wheat-100 transition-all shadow-2xs"
            >
              Sign In to Dashboard
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-4 text-xs font-mono text-forest-800/60">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-forest-600" />
              Instant Barcode &amp; QR
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-forest-600" />
              Bulk CSV Import
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-forest-600" />
              0–100 AI Risk Scoring
            </span>
          </div>
        </div>

        {/* Live Ledger Preview Mock Card */}
        <div className="md:col-span-5">
          <div className="bg-white border border-wheat-200 rounded-2xl shadow-lg p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-wheat-100 pb-3">
              <p className="font-mono text-xs uppercase tracking-widest text-forest-800/60 font-semibold">
                Live Inventory Ledger
              </p>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-forest-50 text-forest-600 border border-forest-100">
                Auto-Synced
              </span>
            </div>

            <div className="space-y-3">
              {[
                {
                  name: "Whole Milk · 40L",
                  location: "Cold Storage A",
                  days: "2 days left",
                  risk: "HIGH RISK · 85",
                  color: "#c1442d",
                  bg: "rgba(193, 68, 45, 0.1)",
                },
                {
                  name: "Sourdough Loaves · 18",
                  location: "Bakery Rack 1",
                  days: "4 days left",
                  risk: "WATCH · 52",
                  color: "#b48d38",
                  bg: "rgba(180, 141, 56, 0.1)",
                },
                {
                  name: "Canned Chickpeas · 120",
                  location: "Dry Pantry B",
                  days: "180 days left",
                  risk: "FRESH · 12",
                  color: "#2d5940",
                  bg: "rgba(45, 89, 64, 0.1)",
                },
              ].map((row) => (
                <div
                  key={row.name}
                  className="p-3 rounded-xl bg-wheat-50/50 border border-wheat-200 flex items-center justify-between gap-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-forest-800">{row.name}</p>
                    <p className="text-[11px] text-forest-800/50">
                      {row.location} · <span className="font-medium text-forest-800/70">{row.days}</span>
                    </p>
                  </div>
                  <span
                    className="font-mono text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                    style={{ color: row.color, backgroundColor: row.bg }}
                  >
                    {row.risk}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-forest-800/60 border-t border-wheat-100">
              <span>Redistribution Target</span>
              <span className="font-mono font-semibold text-forest-800">100% Waste Avoidance</span>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* FEATURE PILLARS                                               */}
      {/* ------------------------------------------------------------- */}
      <section className="bg-white border-y border-wheat-200 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="font-mono text-xs uppercase tracking-widest text-tomato-500 font-semibold">
              End-to-End Workflow
            </span>
            <h2 className="font-display text-2xl sm:text-3xl text-forest-800 font-bold mt-1">
              Engineered for speed, compliance &amp; social impact
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                num: "01",
                icon: Upload,
                title: "Flexible Inventory Entry",
                desc: "Log items in seconds via camera barcode/QR scanner, bulk CSV upload with downloadable templates, or intuitive manual form.",
              },
              {
                num: "02",
                icon: Sparkles,
                title: "AI Waste Risk Scoring",
                desc: "Proprietary heuristics evaluate days-to-expiry vs. average daily consumption rate to calculate waste risks and optimal reorder quantities.",
              },
              {
                num: "03",
                icon: Store,
                title: "Redistribution Marketplace",
                desc: "Post surplus with one click. Verified non-profits claim items in real time, coordinate pickups, and track CO2e emissions avoided.",
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.num}
                  className="p-6 rounded-2xl bg-wheat-50/60 border border-wheat-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-mono text-xs font-bold text-tomato-500">{card.num}</span>
                      <div className="p-2 rounded-lg bg-forest-800 text-wheat-50">
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>
                    <h3 className="font-display text-lg text-forest-800 font-semibold mb-2">
                      {card.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-forest-800/70 leading-relaxed">
                      {card.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* FOOTER                                                        */}
      {/* ------------------------------------------------------------- */}
      <footer className="mt-auto py-8 text-center text-xs text-forest-800/50 font-mono">
        <p>Harvest Ledger — Intelligent Surplus Food Management &amp; Redistribution</p>
      </footer>
    </div>
  );
}
