import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Compass,
  Calendar,
  MapPin,
  Building2,
  Utensils,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  ShieldAlert,
  Flame,
  Search,
  Filter,
  Map as MapIcon,
  LayoutGrid,
  Route,
} from "lucide-react";
import Layout from "../components/Layout";
import RescueMap from "../components/RescueMap";
import { useAuth } from "../AuthContext";
import { api } from "../api";

const CATEGORIES = ["produce", "dairy", "bakery", "prepared", "canned", "frozen", "general"];

/** Hook to provide a 1-second reactive ticking timer */
function useLiveTicker(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

/** Formats live remaining time until 23:59:59 of expiryDate */
function computeLiveExpiryCountdown(expiryDateStr, now) {
  if (!expiryDateStr) {
    return { text: "No date set", isExpired: false, urgent: false, warning: false };
  }

  const parts = expiryDateStr.split("-").map(Number);
  if (parts.length !== 3) {
    return { text: expiryDateStr, isExpired: false, urgent: false, warning: false };
  }

  const [year, month, day] = parts;
  const targetTime = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
  const diffMs = targetTime - now.getTime();

  if (diffMs <= 0) {
    const pastMs = Math.abs(diffMs);
    const pastDays = Math.floor(pastMs / (1000 * 60 * 60 * 24));
    return {
      text: pastDays === 0 ? "Expired today" : `Expired ${pastDays}d ago`,
      isExpired: true,
      urgent: true,
      warning: false,
      diffMs,
    };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, "0");

  let formatted = "";
  if (days > 0) {
    formatted = `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  } else {
    formatted = `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  }

  return {
    text: formatted,
    isExpired: false,
    urgent: days < 1,
    warning: days <= 3,
    days,
    hours,
    minutes,
    seconds,
    diffMs,
  };
}

/** Live Countdown Badge Component */
function LiveCountdownBadge({ expiryDateStr, now }) {
  const cd = computeLiveExpiryCountdown(expiryDateStr, now);

  if (cd.isExpired) {
    return null; // Expired items are filtered out entirely
  }

  if (cd.urgent) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-tomato-50 text-tomato-700 border border-tomato-200 animate-pulse">
        <Flame className="w-3.5 h-3.5 text-tomato-500 shrink-0" />
        <span>{cd.text} left</span>
      </span>
    );
  }

  if (cd.warning) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-amber-50 text-amber-800 border border-amber-200">
        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span>{cd.text} left</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono text-forest-800/80 bg-wheat-100/70 border border-wheat-200">
      <Clock className="w-3.5 h-3.5 text-forest-600 shrink-0" />
      <span>{cd.text} left</span>
    </span>
  );
}

export default function BrowseListingsPage() {
  const { user } = useAuth();
  const now = useLiveTicker(1000);
  const [listings, setListings] = useState(() => {
    const cached = api.getCached("browse_listings");
    return Array.isArray(cached) ? cached : [];
  });
  const [loading, setLoading] = useState(() => !api.getCached("browse_listings"));
  const [error, setError] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "map"
  const [selectedRadius, setSelectedRadius] = useState(25); // km

  // Claim Dialog state
  const [selectedListing, setSelectedListing] = useState(null);
  const [mealsEstimate, setMealsEstimate] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("10:00");
  const [claiming, setClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [claimError, setClaimError] = useState("");

  const [myPickupListingIds, setMyPickupListingIds] = useState(() => {
    const cached = api.getCached("my_pickups") || [];
    return new Set(
      Array.isArray(cached)
        ? cached
            .filter((p) => p.status === "pending" || p.status === "confirmed" || p.status === "picked_up")
            .map((p) => p.listing_id)
        : []
    );
  });

  const load = () => {
    if (user?.role !== "ngo") return;
    if (!api.getCached("browse_listings")) {
      setLoading(true);
    }
    setError("");
    Promise.all([
      api.browseListings(),
      api.myPickups().catch(() => [])
    ])
      .then(([browseData, pickupsData]) => {
        if (Array.isArray(browseData)) setListings(browseData);
        if (Array.isArray(pickupsData)) {
          setMyPickupListingIds(
            new Set(
              pickupsData
                .filter((p) => p.status === "pending" || p.status === "confirmed" || p.status === "picked_up")
                .map((p) => p.listing_id)
            )
          );
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user?.role === "ngo") {
      load();
      const interval = setInterval(load, 5000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [user?.id, user?.role]);

  if (user?.role && user.role !== "ngo") {
    return (
      <Layout>
        <div className="bg-white border border-wheat-200 rounded-xl p-8 sm:p-12 text-center shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-tomato-500/10 text-tomato-600 flex items-center justify-center mx-auto mb-4 border border-tomato-500/20">
            <ShieldAlert className="w-6 h-6 text-tomato-500" />
          </div>
          <h2 className="font-display text-xl text-forest-800 font-semibold mb-2">
            NGO / Food Bank Account Required
          </h2>
          <p className="text-xs sm:text-sm text-forest-800/60 max-w-md mx-auto mb-6">
            Browsing and claiming surplus donations is reserved for verified NGO and food bank partners.
          </p>
          <Link
            to="/dashboard/inventory"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-forest-800 text-wheat-50 rounded-lg text-xs sm:text-sm font-medium hover:bg-forest-700"
          >
            Go to Business Inventory
          </Link>
        </div>
      </Layout>
    );
  }

  const openClaimModal = (listing) => {
    const cd = computeLiveExpiryCountdown(listing.expiry_date, now);
    if (cd.isExpired) {
      alert("⚠️ Food Safety: This listing has already expired and cannot be claimed.");
      return;
    }

    setSelectedListing(listing);
    setMealsEstimate(String(Math.round(listing.quantity * 2.5)));
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const dd = String(tomorrow.getDate()).padStart(2, "0");
    setPickupDate(`${yyyy}-${mm}-${dd}`);
    setPickupTime("10:00");
    setClaimSuccess(false);
    setClaimError("");
  };

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (!selectedListing) return;
    setClaiming(true);
    setClaimError("");
    try {
      let finalIsoTime = null;
      if (pickupDate && pickupTime) {
        finalIsoTime = new Date(`${pickupDate}T${pickupTime}:00`).toISOString();
      }
      await api.requestPickup({
        listing_id: selectedListing.id,
        meals_estimate: parseFloat(mealsEstimate) || 0,
        scheduled_time: finalIsoTime,
      });
      setClaimSuccess(true);
      setTimeout(() => {
        setSelectedListing(null);
        setClaimSuccess(false);
        load();
      }, 1200);
    } catch (err) {
      setClaimError(err.message || "Failed to claim surplus.");
    } finally {
      setClaiming(false);
    }
  };

  // Filter out any expired listings in real-time, plus search/category filtering
  const activeUnexpiredListings = useMemo(() => {
    return listings.filter((l) => {
      // 0. Exclude listings already requested by this NGO (they are in My Pickups!)
      if (myPickupListingIds.has(l.id)) return false;

      // 1. Food safety: Exclude expired items
      const cd = computeLiveExpiryCountdown(l.expiry_date, now);
      if (cd.isExpired) return false;

      // 2. Category filter
      if (categoryFilter !== "all" && l.category !== categoryFilter) return false;

      // 3. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = l.title?.toLowerCase().includes(q);
        const matchesBiz = l.business_name?.toLowerCase().includes(q);
        const matchesLoc = l.pickup_location?.toLowerCase().includes(q);
        const matchesCat = l.category?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesBiz && !matchesLoc && !matchesCat) return false;
      }

      return true;
    });
  }, [listings, myPickupListingIds, now, categoryFilter, searchQuery]);

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-tomato-500 font-semibold block mb-1">
            Module 03 &bull; Redistribution Marketplace
          </span>
          <h1 className="font-display text-2xl sm:text-3xl text-forest-800 font-semibold">
            Available Surplus Food
          </h1>
          <p className="text-xs sm:text-sm text-forest-800/60 mt-1">
            Real-time edible surplus ranked by urgency (soonest expiry first). All items are active and safe for distribution.
          </p>
        </div>

        {/* View Mode Toggle Button Group */}
        <div className="flex items-center gap-1.5 p-1 bg-white border border-wheat-200 rounded-xl shadow-2xs shrink-0 font-mono text-xs w-full sm:w-auto">
          <button
            onClick={() => setViewMode("grid")}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg font-semibold transition-all ${
              viewMode === "grid"
                ? "bg-forest-800 text-wheat-50 shadow-2xs"
                : "text-forest-800/70 hover:text-forest-800 hover:bg-wheat-50"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Grid View</span>
          </button>
          <button
            onClick={() => setViewMode("map")}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg font-semibold transition-all ${
              viewMode === "map"
                ? "bg-forest-800 text-wheat-50 shadow-2xs"
                : "text-forest-800/70 hover:text-forest-800 hover:bg-wheat-50"
            }`}
          >
            <MapIcon className="w-3.5 h-3.5 text-gold-400" />
            <span>Live Radar Map</span>
          </button>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="bg-white border border-wheat-200 rounded-xl p-3 sm:p-4 mb-6 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-forest-800/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search surplus by food name, donor, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-wheat-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-400 bg-wheat-50/30"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-forest-800/40 hover:text-forest-800"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-3.5 h-3.5 text-forest-800/50" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs sm:text-sm border border-wheat-200 rounded-lg px-2.5 py-2 bg-white text-forest-800 focus:outline-none focus:ring-2 focus:ring-forest-400 capitalize"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Distance Radius Filter (Active in Map Mode) */}
        {viewMode === "map" && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-wheat-100 text-xs font-mono">
            <span className="text-forest-800/60 uppercase tracking-wider text-[11px] mr-1">
              Radar Search Radius:
            </span>
            {[5, 10, 25, 50].map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRadius(r)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                  selectedRadius === r
                    ? "bg-forest-800 text-wheat-50 border-forest-800 shadow-2xs"
                    : "bg-white text-forest-800/70 border-wheat-200 hover:border-forest-600/50"
                }`}
              >
                {r >= 50 ? "All Metro (>50 km)" : `Within ${r} km`}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-tomato-500/10 border border-tomato-500/30 text-tomato-600 text-sm mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={load} className="text-xs font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-wheat-200 rounded-xl p-12 text-center shadow-2xs">
          <RefreshCw className="w-6 h-6 animate-spin text-forest-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-forest-800">Checking for available surplus donations...</p>
        </div>
      ) : activeUnexpiredListings.length === 0 ? (
        <div className="bg-white border border-wheat-200 rounded-xl p-8 sm:p-12 text-center shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-forest-50 text-forest-700 flex items-center justify-center mx-auto mb-4 border border-forest-100">
            <Compass className="w-6 h-6 text-forest-600" />
          </div>
          <h3 className="font-display text-lg text-forest-800 font-semibold mb-1">
            No active surplus available right now
          </h3>
          <p className="text-xs sm:text-sm text-forest-800/60 max-w-sm mx-auto mb-4">
            Partner food businesses regularly post surplus here as inventory shelf-life nears. All expired items are filtered out. Check back soon!
          </p>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-4 py-2 bg-forest-800 text-wheat-50 rounded-lg text-xs sm:text-sm font-medium hover:bg-forest-700 shadow-sm transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Listings
          </button>
        </div>
      ) : viewMode === "map" ? (
        /* LIVE RADAR MAP VIEW */
        <RescueMap
          listings={activeUnexpiredListings}
          onClaimListing={openClaimModal}
          selectedRadius={selectedRadius}
        />
      ) : (
        /* CARD GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {activeUnexpiredListings.map((l) => (
            <div
              key={l.id}
              className="bg-white border border-wheat-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="font-mono text-[11px] uppercase tracking-wide text-forest-800/60 px-2 py-0.5 rounded bg-wheat-100/70">
                    {l.category}
                  </span>
                  <LiveCountdownBadge expiryDateStr={l.expiry_date} now={now} />
                </div>

                <h3 className="font-display text-lg text-forest-800 font-semibold mb-1">
                  {l.title}
                </h3>
                <p className="font-mono text-sm text-forest-800/80 mb-3">
                  <span className="font-semibold text-base">{l.quantity}</span> {l.unit} available
                </p>

                <div className="space-y-1.5 text-xs text-forest-800/70 border-t border-wheat-100 pt-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-forest-600 shrink-0" />
                    <span className="truncate">Donor: {l.business_name || "Food Business"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-forest-600 shrink-0" />
                    <span className="truncate">Location: {l.pickup_location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-forest-600 font-medium">
                    <Utensils className="w-3.5 h-3.5 shrink-0" />
                    <span>~{Math.round(l.quantity * 2.5)} meals potential</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-wheat-100">
                <button
                  onClick={() => openClaimModal(l)}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-forest-800 text-wheat-50 rounded-lg text-sm font-medium hover:bg-forest-700 active:scale-[0.99] transition-all shadow-2xs"
                >
                  <Utensils className="w-4 h-4" />
                  Request Pickup
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* ------------------------------------------------------------- */}
      {/* CLAIM SURPLUS MODAL (100% Contained, Mobile-First Layout)     */}
      {/* ------------------------------------------------------------- */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md overflow-x-hidden overflow-y-auto animate-in fade-in duration-150">
          <div 
            className="relative bg-white border border-wheat-200 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col box-border"
            style={{ width: "min(100%, 520px)", maxWidth: "100%" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-wheat-200 bg-gradient-to-r from-forest-900 via-forest-800 to-forest-800 text-wheat-50 shrink-0 overflow-hidden box-border">
              <div className="min-w-0 pr-2 flex-1">
                <span className="text-[10px] font-mono tracking-widest uppercase text-emerald-300 font-semibold block mb-0.5 truncate">
                  Redistribution Marketplace · Module 03
                </span>
                <h2 className="font-display text-base sm:text-lg font-bold text-white flex items-center gap-2 truncate">
                  <Utensils className="w-5 h-5 text-emerald-300 shrink-0" />
                  <span className="truncate">Claim Surplus Food</span>
                </h2>
                <p className="text-xs text-wheat-200/80 mt-0.5 truncate">
                  Schedule pickup for this surplus donation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedListing(null)}
                className="p-2 text-wheat-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors shrink-0"
                title="Close"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleClaimSubmit} className="p-4 sm:p-6 space-y-4 overflow-x-hidden overflow-y-auto box-border flex-1 max-h-[calc(100dvh-120px)]">
              {/* Item Info Card */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-wheat-50 border border-wheat-200 text-xs text-forest-800 space-y-2 box-border overflow-hidden w-full">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-forest-900 truncate">{selectedListing.title}</p>
                    <p className="text-forest-800/70 capitalize mt-0.5 text-xs truncate">
                      Category: <span className="font-medium text-forest-900">{selectedListing.category}</span> &bull; Stock: <strong className="text-forest-900">{selectedListing.quantity} {selectedListing.unit}</strong>
                    </p>
                  </div>
                  <div className="shrink-0">
                    <LiveCountdownBadge expiryDateStr={selectedListing.expiry_date} now={now} />
                  </div>
                </div>
                <div className="flex items-center gap-1 text-forest-800/70 border-t border-wheat-200/70 pt-2 text-xs min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-forest-600 shrink-0" />
                  <span className="truncate min-w-0">Pickup: <strong className="text-forest-900">{selectedListing.pickup_location}</strong></span>
                </div>
              </div>

              {claimError && (
                <div className="p-3 rounded-xl bg-tomato-500/10 border border-tomato-500/30 text-tomato-600 text-xs font-medium box-border">
                  {claimError}
                </div>
              )}

              {claimSuccess ? (
                <div className="p-4 rounded-xl bg-forest-500/10 border border-forest-500/30 text-forest-700 text-sm font-medium flex items-center gap-2 box-border">
                  <CheckCircle2 className="w-5 h-5 text-forest-600 shrink-0" />
                  <span>Pickup request submitted! Coordinating with donor...</span>
                </div>
              ) : (
                <>
                  {/* Field 1: Estimated Meal Portions */}
                  <div className="w-full box-border">
                    <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1">
                      Estimated Meal Portions *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      min="1"
                      placeholder="e.g. 25"
                      value={mealsEstimate}
                      onChange={(e) => setMealsEstimate(e.target.value)}
                      className="w-full block box-border border border-wheat-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400 bg-white"
                    />
                    <p className="text-[11px] text-forest-800/50 mt-1">
                      Based on ~2.5 community meals per unit.
                    </p>
                  </div>

                  {/* Field 2: Proposed Pickup Date */}
                  <div className="w-full box-border">
                    <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1">
                      Proposed Pickup Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                      className="w-full block box-border bg-white border border-wheat-200 rounded-xl px-3.5 py-2.5 text-sm text-forest-900 focus:outline-none focus:ring-2 focus:ring-forest-400 font-mono"
                    />
                  </div>

                  {/* Field 3: Proposed Pickup Time Window */}
                  <div className="w-full box-border">
                    <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1">
                      Proposed Pickup Time *
                    </label>
                    <select
                      required
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      className="w-full block box-border bg-white border border-wheat-200 rounded-xl px-3.5 py-2.5 text-sm text-forest-900 focus:outline-none focus:ring-2 focus:ring-forest-400 font-mono cursor-pointer"
                    >
                      <option value="08:00">08:00 AM — Morning Window</option>
                      <option value="09:00">09:00 AM — Morning Window</option>
                      <option value="10:00">10:00 AM — Standard Morning (Recommended)</option>
                      <option value="11:00">11:00 AM — Late Morning</option>
                      <option value="12:00">12:00 PM — Noon / Lunch Window</option>
                      <option value="13:00">01:00 PM — Early Afternoon</option>
                      <option value="14:00">02:00 PM — Afternoon Window</option>
                      <option value="15:00">03:00 PM — Mid-Afternoon</option>
                      <option value="16:00">04:00 PM — Late Afternoon</option>
                      <option value="17:00">05:00 PM — Evening Dispatch</option>
                      <option value="18:00">06:00 PM — Evening Window</option>
                      <option value="19:00">07:00 PM — Late Evening</option>
                      <option value="20:00">08:00 PM — Night Window</option>
                    </select>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-4 border-t border-wheat-200 w-full box-border">
                    <button
                      type="button"
                      onClick={() => setSelectedListing(null)}
                      className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-forest-800/70 hover:text-forest-800 rounded-xl bg-wheat-100 hover:bg-wheat-200 transition-colors text-center box-border"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={claiming}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-forest-800 text-wheat-50 hover:bg-forest-700 disabled:opacity-50 shadow-sm transition-all text-center box-border"
                    >
                      {claiming ? "Submitting..." : "Confirm Claim"}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
