import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  Package,
  Store,
  TrendingUp,
  Compass,
  Truck,
  LogOut,
  Building2,
  Shield,
  BarChart3,
} from "lucide-react";
import { useAuth } from "../AuthContext";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer and restore scroll whenever route changes
  useEffect(() => {
    setMobileMenuOpen(false);
    document.body.style.overflow = "";
  }, [location.pathname]);

  // Handle escape key to close drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const businessLinks = [
    { to: "/dashboard/inventory", label: "Inventory", eyebrow: "01", icon: Package },
    { to: "/dashboard/listings", label: "Surplus Listings", eyebrow: "02", icon: Store },
    { to: "/dashboard/data-analytics", label: "Data Analytics", eyebrow: "03", icon: BarChart3 },
    { to: "/dashboard/analytics", label: "Impact & Analytics", eyebrow: "04", icon: TrendingUp },
  ];

  const ngoLinks = [
    { to: "/dashboard/browse", label: "Available Surplus", eyebrow: "01", icon: Compass },
    { to: "/dashboard/pickups", label: "My Pickups", eyebrow: "02", icon: Truck },
    { to: "/dashboard/analytics", label: "Impact & Analytics", eyebrow: "03", icon: TrendingUp },
  ];

  const links = user?.role === "business" ? businessLinks : user?.role === "ngo" ? ngoLinks : [];

  const handleSignOut = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-wheat-50 text-forest-800 overflow-x-clip">
      {/* ------------------------------------------------------------- */}
      {/* MOBILE STICKY TOPBAR (< 1024px)                               */}
      {/* ------------------------------------------------------------- */}
      <header className="lg:hidden sticky top-0 z-40 bg-forest-900/90 backdrop-blur-xl text-wheat-100 px-4 sm:px-6 py-3 flex items-center justify-between border-b border-forest-600/50 shadow-md">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-wheat-100 hover:bg-forest-700/80 active:bg-forest-600 transition-colors cursor-pointer select-none touch-manipulation relative z-10"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <span className="font-display italic text-base sm:text-lg tracking-tight font-semibold block leading-tight truncate">
              Harvest Ledger
            </span>
            <span className="text-[10px] uppercase tracking-wider text-forest-100/70 font-mono block truncate">
              {user?.role === "business" ? "Business Portal" : "NGO Food Bank"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-mono capitalize glass-pill-dark text-wheat-100">
            {user?.role}
          </span>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-9 h-9 flex items-center justify-center text-wheat-100/70 hover:text-tomato-400 rounded-xl hover:bg-forest-700/60 transition-colors cursor-pointer"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* MOBILE DRAWER BACKDROP & SIDEBAR (< 1024px)                    */}
      {/* ------------------------------------------------------------- */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-forest-950/60 backdrop-blur-md z-40 transition-opacity animate-in fade-in duration-200"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] glass-forest text-wheat-100 flex flex-col shadow-2xl transition-all duration-300 ease-in-out pb-safe border-r border-white/15 ${
          mobileMenuOpen
            ? "translate-x-0 opacity-100 pointer-events-auto visible"
            : "-translate-x-full opacity-0 pointer-events-none invisible"
        }`}
        aria-label="Mobile Navigation"
        aria-hidden={!mobileMenuOpen}
      >
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-forest-600/60 flex items-center justify-between">
          <div>
            <p className="font-display italic text-lg sm:text-xl leading-tight font-semibold">
              Harvest Ledger
            </p>
            <p className="text-[10px] uppercase tracking-widest text-forest-100/60 font-mono mt-0.5">
              Surplus &amp; Redistribution
            </p>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-wheat-100/70 hover:text-white hover:bg-forest-700/60 active:bg-forest-600 transition-colors"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Badge in Drawer */}
        <div className="px-5 py-4 bg-black/20 backdrop-blur-sm border-b border-forest-600/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-forest-700/90 flex items-center justify-center text-wheat-100 shrink-0 border border-forest-600/50">
              {user?.role === "business" ? (
                <Building2 className="w-4 h-4 text-forest-100" />
              ) : (
                <Shield className="w-4 h-4 text-forest-100" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{user?.org_name}</p>
              <p className="text-[11px] text-wheat-100/60 capitalize">{user?.role} account</p>
            </div>
          </div>
        </div>

        {/* Drawer Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {links.map((l) => {
            const Icon = l.icon;
            const isActive = location.pathname === l.to;
            return (
              <button
                key={l.to}
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  document.body.style.overflow = "";
                  navigate(l.to);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all text-left cursor-pointer select-none touch-manipulation ${
                  isActive
                    ? "bg-white/15 backdrop-blur-sm text-white border border-white/20 shadow-sm font-semibold"
                    : "text-wheat-100/80 hover:bg-white/10 hover:text-white active:bg-white/20"
                }`}
              >
                <span className="font-mono text-xs text-forest-100/50 w-5">{l.eyebrow}</span>
                <Icon className="w-4 h-4 text-forest-100/70" />
                <span className="flex-1">{l.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Drawer Footer */}
        <div className="px-5 py-4 border-t border-forest-600/60 bg-forest-900/30">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-tomato-400 bg-tomato-500/10 hover:bg-tomato-500/20 active:bg-tomato-500/30 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ------------------------------------------------------------- */}
      {/* DESKTOP PERMANENT SIDEBAR (>= 1024px)                         */}
      {/* ------------------------------------------------------------- */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-forest-900/90 backdrop-blur-2xl text-wheat-100 flex-col sticky top-0 h-screen overflow-y-auto border-r border-forest-700/60 shadow-xl">
        {/* Brand */}
        <div className="px-6 py-7 border-b border-forest-600/60">
          <p className="font-display italic text-2xl leading-tight font-semibold">
            Harvest&nbsp;Ledger
          </p>
          <p className="text-xs uppercase tracking-widest text-forest-100/60 font-mono mt-1">
            Surplus &amp; Redistribution
          </p>
        </div>

        {/* User Summary */}
        <div className="px-6 py-4 bg-black/20 backdrop-blur-sm border-b border-forest-600/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-forest-700/90 flex items-center justify-center text-wheat-100 shrink-0 border border-forest-600/50 shadow-2xs">
              {user?.role === "business" ? (
                <Building2 className="w-4.5 h-4.5 text-forest-100" />
              ) : (
                <Shield className="w-4.5 h-4.5 text-forest-100" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{user?.org_name}</p>
              <p className="text-xs text-wheat-100/60 capitalize">{user?.role} account</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="px-3 py-6 space-y-1.5">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-white/15 backdrop-blur-md text-white shadow-sm font-semibold border border-white/20"
                      : "text-wheat-100/80 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                <span className="font-mono text-xs text-forest-100/50 w-5">{l.eyebrow}</span>
                <Icon className="w-4 h-4 text-forest-100/70" />
                <span className="flex-1">{l.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Desktop Footer */}
        <div className="mt-auto px-6 py-5 border-t border-forest-600/60 bg-black/20 backdrop-blur-sm">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs uppercase tracking-wider font-semibold text-tomato-400 hover:text-tomato-300 hover:bg-forest-700/50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ------------------------------------------------------------- */}
      {/* MAIN CONTENT AREA                                             */}
      {/* ------------------------------------------------------------- */}
      <main className="flex-1 min-w-0 flex flex-col justify-between">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 flex-1">
          {children}
        </div>

        {/* Global Dashboard Footer with Responsive Padding */}
        <footer className="w-full border-t border-wheat-200/80 bg-wheat-100/40 py-4 px-4 sm:px-6 lg:px-8 mt-auto text-center font-mono">
          <div className="max-w-7xl mx-auto px-2">
            <p className="text-[11px] sm:text-xs text-forest-800/50 leading-relaxed">
              Harvest Ledger &bull; AI-Powered Food Waste Management &amp; Redistribution Platform
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
