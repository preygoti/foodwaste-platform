import { useEffect, useState } from "react";
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
} from "lucide-react";
import Layout from "../components/Layout";
import { useAuth } from "../AuthContext";
import { api } from "../api";

export default function BrowseListingsPage() {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Claim Dialog state
  const [selectedListing, setSelectedListing] = useState(null);
  const [mealsEstimate, setMealsEstimate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);

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
    setSelectedListing(listing);
    setMealsEstimate(String(Math.round(listing.quantity * 2.5)));
    // Default to tomorrow 10am
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    setScheduledTime(tomorrow.toISOString().slice(0, 16));
    setClaimSuccess(false);
  };

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (!selectedListing) return;
    setClaiming(true);
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
      alert(`Failed to claim surplus: ${err.message}`);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <Layout>
      <div className="mb-8">
        <span className="font-mono text-xs uppercase tracking-widest text-tomato-500 font-semibold block mb-1">
          Module 03 · Redistribution Marketplace
        </span>
        <h1 className="font-display text-2xl sm:text-3xl text-forest-800 font-semibold">
          Available Surplus Food
        </h1>
        <p className="text-xs sm:text-sm text-forest-800/60 mt-1">
          Ranked by urgency (soonest expiry first). Claim surplus to feed communities and prevent landfill waste.
        </p>
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
      ) : listings.length === 0 ? (
        <div className="bg-white border border-wheat-200 rounded-xl p-8 sm:p-12 text-center shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-forest-50 text-forest-700 flex items-center justify-center mx-auto mb-4 border border-forest-100">
            <Compass className="w-6 h-6 text-forest-600" />
          </div>
          <h3 className="font-display text-lg text-forest-800 font-semibold mb-1">
            No surplus available right now
          </h3>
          <p className="text-xs sm:text-sm text-forest-800/60 max-w-sm mx-auto mb-4">
            Partner food businesses regularly post surplus here as inventory shelf-life nears. Check back soon!
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
          {listings.map((l) => (
            <div
              key={l.id}
              className="bg-white border border-wheat-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="font-mono text-[11px] uppercase tracking-wide text-forest-800/60 px-2 py-0.5 rounded bg-wheat-100/70">
                    {l.category}
                  </span>
                  <span className="font-mono text-xs text-tomato-500 font-semibold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Expires {l.expiry_date}
                  </span>
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
                <p className="text-xs text-forest-800/70">
                  {selectedListing.quantity} {selectedListing.unit} · Expires {selectedListing.expiry_date}
                </p>
                <p className="text-xs text-forest-800/60 flex items-center gap-1 pt-1">
                  <MapPin className="w-3 h-3 text-forest-600 shrink-0" />
                  {selectedListing.pickup_location}
                </p>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1">
                  Estimated Meals Served *
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  value={mealsEstimate}
                  onChange={(e) => setMealsEstimate(e.target.value)}
                  className="w-full border border-wheat-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-forest-400"
                />
                <p className="text-[11px] text-forest-800/50 mt-1">
                  Used for calculating collective social &amp; environmental impact.
                </p>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1">
                  Proposed Pickup Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full border border-wheat-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-forest-400"
                />
              </div>

              {claimSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Pickup request sent to donor!</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-wheat-200">
                <button
                  type="button"
                  onClick={() => setSelectedListing(null)}
                  className="px-4 py-2 text-sm font-medium text-forest-800 hover:bg-wheat-200/50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={claiming || claimSuccess}
                  className="px-5 py-2 text-sm font-medium bg-forest-800 text-wheat-50 rounded-lg hover:bg-forest-700 disabled:opacity-50 transition-all shadow-sm"
                >
                  {claiming ? "Submitting..." : "Confirm Pickup Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
