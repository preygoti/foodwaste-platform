import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Store,
  Clock,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Truck,
  RefreshCw,
  Package,
  Scan,
} from "lucide-react";
import Layout from "../components/Layout";
import VerifyQrModal from "../components/VerifyQrModal";
import { useAuth } from "../AuthContext";
import { api } from "../api";

const STATUS_CONFIG = {
  available: {
    color: "#2d5940",
    bg: "rgba(45, 89, 64, 0.08)",
    border: "rgba(45, 89, 64, 0.35)",
    label: "Available",
  },
  matched: {
    color: "#b48d38",
    bg: "rgba(180, 141, 56, 0.08)",
    border: "rgba(180, 141, 56, 0.35)",
    label: "Matched (Claimed)",
  },
  completed: {
    color: "#1f3a2e",
    bg: "rgba(31, 58, 46, 0.12)",
    border: "rgba(31, 58, 46, 0.4)",
    label: "Picked Up",
  },
  expired: {
    color: "#c1442d",
    bg: "rgba(193, 68, 45, 0.08)",
    border: "rgba(193, 68, 45, 0.35)",
    label: "Expired",
  },
};

export default function BusinessListingsPage() {
  const { user } = useAuth();
  const [listings, setListings] = useState(() => {
    const cached = api.getCached("my_listings");
    return Array.isArray(cached) ? cached : [];
  });
  const [pickupsByListing, setPickupsByListing] = useState({});
  const [loading, setLoading] = useState(() => !api.getCached("my_listings"));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);
  const [showVerifyQrModal, setShowVerifyQrModal] = useState(false);

  const load = (silent = false) => {
    if (user?.role !== "business") return;
    if (!silent && !api.getCached("my_listings")) {
      setLoading(true);
    } else if (silent) {
      setIsRefreshing(true);
    }

    api
      .myListings()
      .then(async (data) => {
        if (Array.isArray(data)) {
          setListings(data);
          const entries = await Promise.all(
            data.map(async (l) => [l.id, await api.listingPickups(l.id).catch(() => [])])
          );
          setPickupsByListing(Object.fromEntries(entries));
        }
      })
      .catch((err) => console.error("Error auto-syncing listings:", err))
      .finally(() => {
        if (!silent) setLoading(false);
        setIsRefreshing(false);
      });
  };

  useEffect(() => {
    if (user?.role === "business") {
      load(false);

      // Auto-poll every 3.5 seconds so incoming NGO pickup requests appear in real time without refreshing
      const interval = setInterval(() => {
        load(true);
      }, 3500);

      // Instant refresh on window focus / tab visibility
      const handleFocus = () => {
        load(true);
      };
      window.addEventListener("focus", handleFocus);
      document.addEventListener("visibilitychange", handleFocus);

      return () => {
        clearInterval(interval);
        window.removeEventListener("focus", handleFocus);
        document.removeEventListener("visibilitychange", handleFocus);
      };
    } else {
      setLoading(false);
    }
  }, [user?.id, user?.role]);

  if (user?.role && user.role !== "business") {
    return (
      <Layout>
        <div className="bg-white border border-wheat-200 rounded-xl p-8 sm:p-12 text-center shadow-2xs">
          <h2 className="font-display text-xl text-forest-800 font-semibold mb-2">
            Business Account Required
          </h2>
          <p className="text-xs sm:text-sm text-forest-800/60 max-w-md mx-auto mb-6">
            Surplus inventory listings are managed by Food Business accounts.
          </p>
          <Link
            to="/dashboard/browse"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-forest-800 text-wheat-50 rounded-lg text-xs sm:text-sm font-medium hover:bg-forest-700"
          >
            Go to Available Surplus
          </Link>
        </div>
      </Layout>
    );
  }

  const confirmPickup = async (pickupId) => {
    setConfirmingId(pickupId);
    try {
      await api.updatePickup(pickupId, { status: "confirmed" });
      load(true);
    } catch (err) {
      alert(`Error confirming pickup: ${err.message}`);
    } finally {
      setConfirmingId(null);
    }
  };

  const rejectPickup = async (pickupId) => {
    if (!window.confirm("Reject this pickup request? The food listing will return to available status for other NGOs.")) return;
    setConfirmingId(pickupId);
    try {
      await api.updatePickup(pickupId, { status: "cancelled" });
      load(true);
    } catch (err) {
      alert(`Error rejecting pickup: ${err.message}`);
    } finally {
      setConfirmingId(null);
    }
  };

  // Count total pending requests across all listings
  const totalPendingRequests = Object.values(pickupsByListing)
    .flat()
    .filter((p) => p.status === "pending").length;

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-mono text-xs uppercase tracking-widest text-tomato-500 font-semibold block">
              Module 03 · Redistribution Marketplace
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium text-emerald-800 bg-emerald-50 border border-emerald-200">
              <span className={`w-1.5 h-1.5 rounded-full bg-emerald-500 ${isRefreshing ? "animate-ping" : "animate-pulse"}`} />
              <span>{isRefreshing ? "Syncing..." : "Live Sync Active"}</span>
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl text-forest-800 font-semibold">
            Your Surplus Listings
          </h1>
          <p className="text-xs sm:text-sm text-forest-800/60 mt-1">
            Manage food surplus items made available to verified NGOs and food banks. Real-time requests sync automatically.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => load(false)}
            disabled={isRefreshing}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-wheat-100 text-forest-800 border border-wheat-300 rounded-xl text-xs sm:text-sm font-semibold shadow-2xs transition-all shrink-0 cursor-pointer disabled:opacity-60"
            title="Force refresh listings now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-emerald-600" : "text-forest-600"}`} />
            <span>{isRefreshing ? "Syncing..." : "Refresh"}</span>
          </button>

          <button
            onClick={() => setShowVerifyQrModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all shrink-0 cursor-pointer w-full sm:w-auto"
          >
            <Scan className="w-4 h-4 text-emerald-100" />
            <span>Verify Handshake QR</span>
          </button>
        </div>
      </div>

      {/* Pending Requests Alert Banner */}
      {totalPendingRequests > 0 && (
        <div className="mb-6 p-4 bg-amber-50/90 border border-amber-300 rounded-2xl flex items-center justify-between gap-4 shadow-xs animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-200/80 text-amber-900 flex items-center justify-center shrink-0 font-bold text-sm">
              🔔
            </div>
            <div>
              <h4 className="font-display font-bold text-sm text-amber-950">
                {totalPendingRequests} New NGO Pickup Request{totalPendingRequests > 1 ? "s" : ""} Waiting for Response!
              </h4>
              <p className="text-xs text-amber-900/80 mt-0.5">
                A verified NGO has requested surplus food. Review and click <strong>Accept &amp; Assign</strong> below to confirm.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex px-3 py-1 bg-amber-200 text-amber-950 rounded-lg text-xs font-mono font-bold shrink-0">
            Action Required
          </span>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-wheat-200 rounded-xl p-12 text-center shadow-2xs">
          <RefreshCw className="w-6 h-6 animate-spin text-forest-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-forest-800">Loading your listings...</p>
        </div>
      ) : listings.length === 0 ? (
        <div className="bg-white border border-wheat-200 rounded-xl p-8 sm:p-12 text-center shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-forest-50 text-forest-700 flex items-center justify-center mx-auto mb-4 border border-forest-100">
            <Store className="w-6 h-6 text-forest-600" />
          </div>
          <h3 className="font-display text-lg text-forest-800 font-semibold mb-1">
            No surplus listings posted yet
          </h3>
          <p className="text-xs sm:text-sm text-forest-800/60 max-w-sm mx-auto mb-6">
            Help local non-profits and reduce waste by posting near-expiry surplus items directly from your inventory.
          </p>
          <Link
            to="/dashboard/inventory"
            className="inline-flex items-center gap-2 px-4 py-2 bg-forest-800 text-wheat-50 rounded-lg text-xs sm:text-sm font-medium hover:bg-forest-700 shadow-sm transition-all"
          >
            <Package className="w-4 h-4" />
            Go to Inventory Ledger
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {listings.map((l) => {
            const statusCfg = STATUS_CONFIG[l.status] || STATUS_CONFIG.available;
            const rawPickups = pickupsByListing[l.id] || [];
            
            // Prioritize assigned/rescued partner; otherwise show active pending bids
            const assignedPickup = rawPickups.find((p) => p.status === "confirmed" || p.status === "picked_up");
            const pendingPickups = rawPickups.filter((p) => p.status === "pending");
            const displayedPickups = assignedPickup 
              ? [assignedPickup] 
              : pendingPickups.length > 0 
                ? pendingPickups 
                : rawPickups.filter((p) => p.status !== "cancelled");

            return (
              <div
                key={l.id}
                className="bg-white border border-wheat-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow"
              >
                <div>
                  {/* Top Bar: Category, PIN & Status Badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[11px] uppercase tracking-wide text-forest-800/60 px-2 py-0.5 rounded bg-wheat-100/70">
                        {l.category}
                      </span>
                      {l.verification_code && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md font-semibold" title="Unique 6-digit Handshake PIN">
                          PIN: <strong className="tracking-wider font-bold">{l.verification_code}</strong>
                        </span>
                      )}
                    </div>
                    <span
                      className="inline-flex items-center gap-1 font-mono font-semibold px-2.5 py-0.5 text-[11px] rounded-full tracking-wide border shadow-2xs shrink-0"
                      style={{
                        color: statusCfg.color,
                        backgroundColor: statusCfg.bg,
                        borderColor: statusCfg.border,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full inline-block"
                        style={{ backgroundColor: statusCfg.color }}
                      />
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* Title & Quantity */}
                  <h3 className="font-display text-lg text-forest-800 font-semibold mb-1">
                    {l.title}
                  </h3>
                  <p className="font-mono text-sm text-forest-800/80 mb-3">
                    <span className="font-semibold text-base">{l.quantity}</span> {l.unit}
                  </p>

                  {/* Details */}
                  <div className="space-y-1 text-xs text-forest-800/70 border-t border-wheat-100 pt-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-forest-600 shrink-0" />
                      <span>Expires: {l.expiry_date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-forest-600 shrink-0" />
                      <span className="truncate">Pickup: {l.pickup_location}</span>
                    </div>
                  </div>
                </div>

                {/* Pickup coordination section */}
                {displayedPickups.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-wheat-200 bg-forest-50/60 -mx-5 -mb-5 p-4 rounded-b-xl space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <p className="text-[11px] font-mono font-semibold uppercase tracking-wider text-forest-800/80 flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-forest-600" />
                        {assignedPickup ? "Assigned Rescue Partner" : `NGO Pickup Requests (${displayedPickups.length})`}
                      </p>
                      {displayedPickups.filter((p) => p.status === "pending").length > 1 && (
                        <span className="text-[11px] text-amber-800 bg-amber-100/90 border border-amber-200 px-2 py-0.5 rounded-md font-mono">
                          ⚡ {displayedPickups.filter((p) => p.status === "pending").length} competing NGO requests &bull; Accepting one auto-rejects others
                        </span>
                      )}
                    </div>
                    {displayedPickups.map((p) => (
                      <div
                        key={p.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-xl border border-wheat-200 text-xs shadow-2xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-forest-900 text-sm">
                              {p.ngo_name || "Partner NGO"}
                            </p>
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold whitespace-nowrap border shrink-0 ${
                                p.status === "confirmed"
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                  : p.status === "picked_up"
                                  ? "bg-forest-100 text-forest-800 border-forest-300"
                                  : p.status === "cancelled"
                                  ? "bg-rose-100 text-rose-800 border-rose-300"
                                  : "bg-amber-100 text-amber-800 border-amber-300"
                              }`}
                            >
                              {p.status === "confirmed" && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse inline-block" />
                              )}
                              {p.status === "pending"
                                ? "Pending Selection"
                                : p.status === "confirmed"
                                ? "Confirmed · Driver Assigned"
                                : p.status === "picked_up"
                                ? "Completed & Rescued"
                                : "Request Not Selected / Cancelled"}
                            </span>
                          </div>
                          <p className="text-forest-800/60 text-xs">
                            ~{p.meals_estimate} meals requested
                            {p.scheduled_time &&
                              ` · Scheduled: ${new Date(p.scheduled_time).toLocaleString(undefined, {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}`}
                          </p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          {p.status === "pending" && (
                            <>
                              <button
                                onClick={() => confirmPickup(p.id)}
                                disabled={confirmingId === p.id}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-all shadow-2xs"
                                title="Accept this NGO request (will assign listing and reject other pending requests)"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                                <span>Accept &amp; Assign</span>
                              </button>
                              <button
                                onClick={() => rejectPickup(p.id)}
                                disabled={confirmingId === p.id}
                                className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-tomato-600 hover:bg-tomato-50 rounded-lg text-xs font-medium transition-colors border border-transparent hover:border-tomato-200"
                                title="Decline this pickup request"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Decline</span>
                              </button>
                            </>
                          )}

                          {p.status === "confirmed" && (
                            <>
                              <button
                                onClick={() => setShowVerifyQrModal(true)}
                                className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-all shadow-2xs"
                              >
                                <Scan className="w-3.5 h-3.5" />
                                <span>Scan Driver QR</span>
                              </button>
                              <button
                                onClick={() => rejectPickup(p.id)}
                                disabled={confirmingId === p.id}
                                className="inline-flex items-center justify-center gap-1 px-2 py-1.5 text-tomato-600 hover:bg-tomato-50 rounded-lg text-xs font-medium transition-colors"
                                title="Cancel pickup"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Cancel</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Handshake QR Scanner Modal for Donor Businesses */}
      <VerifyQrModal
        isOpen={showVerifyQrModal}
        onClose={() => setShowVerifyQrModal(false)}
        onVerified={() => {
          load();
        }}
      />
    </Layout>
  );
}
