import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Store,
  Clock,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Truck,
  RefreshCw,
  Package,
} from "lucide-react";
import Layout from "../components/Layout";
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
  const [listings, setListings] = useState([]);
  const [pickupsByListing, setPickupsByListing] = useState({});
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState(null);

  const load = () => {
    if (user?.role !== "business") return;
    setLoading(true);
    api
      .myListings()
      .then(async (data) => {
        setListings(data);
        const entries = await Promise.all(
          data
            .filter((l) => l.status !== "available")
            .map(async (l) => [l.id, await api.listingPickups(l.id)])
        );
        setPickupsByListing(Object.fromEntries(entries));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setListings([]);
    setPickupsByListing({});
    if (user?.role === "business") {
      load();
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
      load();
    } catch (err) {
      alert(`Error confirming pickup: ${err.message}`);
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <Layout>
      <div className="mb-8">
        <span className="font-mono text-xs uppercase tracking-widest text-tomato-500 font-semibold block mb-1">
          Module 03 · Redistribution Marketplace
        </span>
        <h1 className="font-display text-2xl sm:text-3xl text-forest-800 font-semibold">
          Your Surplus Listings
        </h1>
        <p className="text-xs sm:text-sm text-forest-800/60 mt-1">
          Manage food surplus items made available to verified NGOs and food banks.
        </p>
      </div>

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
            const pickups = pickupsByListing[l.id] || [];

            return (
              <div
                key={l.id}
                className="bg-white border border-wheat-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow"
              >
                <div>
                  {/* Top Bar: Category & Status Badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="font-mono text-[11px] uppercase tracking-wide text-forest-800/60 px-2 py-0.5 rounded bg-wheat-100/70">
                      {l.category}
                    </span>
                    <span
                      className="inline-flex items-center gap-1 font-mono font-semibold px-2.5 py-0.5 text-[11px] rounded-full tracking-wide border shadow-2xs"
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

                {/* Pickup coordination section if matched */}
                {pickups.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-wheat-200 bg-forest-50/50 -mx-5 -mb-5 p-4 rounded-b-xl space-y-2.5">
                    <p className="text-[11px] font-mono font-semibold uppercase tracking-wider text-forest-800/60 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-forest-600" />
                      Pickup Requests ({pickups.length})
                    </p>
                    {pickups.map((p) => (
                      <div
                        key={p.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white rounded-lg border border-forest-100 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-forest-800">
                            {p.ngo_name || "Partner NGO"}
                          </p>
                          <p className="text-forest-800/60 text-[11px]">
                            ~{p.meals_estimate} meals estimated · Status:{" "}
                            <span className="capitalize font-mono font-medium">{p.status}</span>
                          </p>
                        </div>
                        {p.status === "pending" && (
                          <button
                            onClick={() => confirmPickup(p.id)}
                            disabled={confirmingId === p.id}
                            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-forest-800 text-wheat-50 rounded-md text-xs font-medium hover:bg-forest-700 disabled:opacity-50 transition-all shrink-0"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Confirm Pickup</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
