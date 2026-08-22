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
} from "lucide-react";
import { useAuth } from "../AuthContext";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer whenever route changes
  useEffect(() => {
    setMobileMenuOpen(false);
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
    { to: "/dashboard/analytics", label: "Impact & Analytics", eyebrow: "03", icon: TrendingUp },
  ];

  const ngoLinks = [
    { to: "/dashboard/browse", label: "Available Surplus", eyebrow: "01", icon: Compass },
    { to: "/dashboard/pickups", label: "My Pickups", eyebrow: "02", icon: Truck },
    { to: "/dashboard/analytics", label: "Impact & Analytics", eyebrow: "03", icon: TrendingUp },
  ];

  const links = user?.role === "business" ? businessLinks : ngoLinks;

  const handleSignOut = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-wheat-50 text-forest-800 overflow-x-hidden">
      {/* ------------------------------------------------------------- */}
      {/* MOBILE STICKY TOPBAR (< 1024px)                               */}
      {/* ------------------------------------------------------------- */}
      <header className="lg:hidden sticky top-0 z-30 bg-forest-800 text-wheat-100 px-4 py-3 flex items-center justify-between border-b border-forest-600/60 shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-wheat-100 hover:bg-forest-700/80 active:bg-forest-600 transition-colors"
            aria-label="Open navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <Menu className="w-6 h-6" />
          </button>
          <div>
            <span className="font-display italic text-lg tracking-tight font-semibold block leading-none">
              Harvest Ledger
            </span>
            <span className="text-[10px] uppercase tracking-widest text-forest-100/60 font-mono">
              {user?.role === "business" ? "Business Portal" : "NGO Food Bank"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-mono capitalize bg-forest-700/80 text-wheat-100 border border-forest-600/50">
            {user?.role}
          </span>
          <button
            onClick={handleSignOut}
            className="p-2 text-wheat-100/70 hover:text-tomato-400 rounded-lg hover:bg-forest-700/50 transition-colors"
            title="Sign out"
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
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-forest-800 text-wheat-100 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Mobile Navigation"
      >
        {/* Drawer Header */}
        <div className="px-5 py-5 border-b border-forest-600/60 flex items-center justify-between">
          <div>
            <p className="font-display italic text-xl leading-tight font-semibold">
              Harvest Ledger
            </p>
            <p className="text-[10px] uppercase tracking-widest text-forest-100/60 font-mono mt-0.5">
              Surplus &amp; Redistribution
            </p>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-wheat-100/70 hover:text-white hover:bg-forest-700/60 active:bg-forest-600 transition-colors"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Badge in Drawer */}
        <div className="px-5 py-4 bg-forest-900/60 border-b border-forest-600/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-forest-700 flex items-center justify-center text-wheat-100 shrink-0">
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
            return (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-3 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-forest-600 text-white shadow-sm"
                      : "text-wheat-100/80 hover:bg-forest-600/40 hover:text-white"
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
      <aside className="hidden lg:flex w-64 shrink-0 bg-forest-800 text-wheat-100 flex-col self-stretch border-r border-forest-700/50 shadow-lg">
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
        <div className="px-6 py-4 bg-forest-900/50 border-b border-forest-600/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-forest-700 flex items-center justify-center text-wheat-100 shrink-0 border border-forest-600">
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
                  `flex items-center gap-3 px-3.5 py-3 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-forest-600 text-white shadow-sm font-semibold"
                      : "text-wheat-100/80 hover:bg-forest-600/40 hover:text-white"
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
        <div className="mt-auto px-6 py-5 border-t border-forest-600/60 bg-forest-900/30">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs uppercase tracking-wider font-semibold text-tomato-400 hover:text-tomato-300 hover:bg-forest-700/50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ------------------------------------------------------------- */}
      {/* MAIN CONTENT AREA                                             */}
      {/* ------------------------------------------------------------- */}
      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
