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
} from "lucide-react";
import Layout from "../components/Layout";
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
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Claim Dialog state
  const [selectedListing, setSelectedListing] = useState(null);
  const [mealsEstimate, setMealsEstimate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [claimError, setClaimError] = useState("");

  const load = () => {
    if (user?.role !== "ngo") return;
    setLoading(true);
    setError("");
    api
      .browseListings()
      .then(setListings)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setListings([]);
    if (user?.role === "ngo") {
      load();
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
    tomorrow.setHours(10, 0, 0, 0);
    setScheduledTime(tomorrow.toISOString().slice(0, 16));
    setClaimSuccess(false);
    setClaimError("");
  };

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (!selectedListing) return;
    setClaiming(true);
    setClaimError("");
    try {
      await api.requestPickup({
        listing_id: selectedListing.id,
        meals_estimate: parseFloat(mealsEstimate) || 0,
        scheduled_time: scheduledTime ? new Date(scheduledTime).toISOString() : null,
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
  }, [listings, now, categoryFilter, searchQuery]);

  return (
    <Layout>
      <div className="mb-6">
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

      {/* Search & Category Filter Bar */}
      <div className="bg-white border border-wheat-200 rounded-xl p-3 sm:p-4 mb-6 shadow-2xs">
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
      ) : (
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
      {/* CLAIM SURPLUS MODAL                                           */}
      {/* ------------------------------------------------------------- */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-md bg-white border border-wheat-200 rounded-xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-5 border-b border-wheat-200 bg-wheat-50">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-md bg-forest-800 text-wheat-50">
                  <Utensils className="w-4 h-4" />
                </span>
                <h2 className="font-display text-xl text-forest-800">Claim Surplus Food</h2>
              </div>
              <button
                onClick={() => setSelectedListing(null)}
                className="p-2 text-forest-800/50 hover:text-forest-800 rounded-lg hover:bg-wheat-200/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleClaimSubmit} className="p-6 space-y-4">
              <div className="p-3.5 bg-forest-50 border border-forest-100 rounded-lg space-y-1">
                <p className="text-sm font-semibold text-forest-800">{selectedListing.title}</p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-forest-800/70">
                    {selectedListing.quantity} {selectedListing.unit}
                  </span>
                  <LiveCountdownBadge expiryDateStr={selectedListing.expiry_date} now={now} />
                </div>
                <p className="text-xs text-forest-800/60 flex items-center gap-1 pt-1">
                  <MapPin className="w-3 h-3 text-forest-600 shrink-0" />
                  {selectedListing.pickup_location}
                </p>
              </div>

              {claimError && (
                <div className="p-3 rounded-lg bg-tomato-500/10 border border-tomato-500/30 text-tomato-600 text-xs font-medium">
                  {claimError}
                </div>
              )}

              {claimSuccess ? (
                <div className="p-4 rounded-xl bg-forest-500/10 border border-forest-500/30 text-forest-700 text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-forest-600 shrink-0" />
                  <span>Pickup request submitted! Coordinating with donor...</span>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1">
                      Estimated Meal Portions
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="e.g. 50"
                      value={mealsEstimate}
                      onChange={(e) => setMealsEstimate(e.target.value)}
                      className="w-full border border-wheat-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400 bg-white"
                    />
                    <p className="text-[11px] text-forest-800/50 mt-1">
                      Based on standard portion multiplier (~2.5 meals/kg)
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1">
                      Proposed Pickup Time
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full border border-wheat-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400 bg-white"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-wheat-200">
                    <button
                      type="button"
                      onClick={() => setSelectedListing(null)}
                      className="px-4 py-2 text-xs sm:text-sm font-medium text-forest-800/70 hover:text-forest-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={claiming}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-forest-800 text-wheat-50 hover:bg-forest-700 disabled:opacity-50 shadow-sm"
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
