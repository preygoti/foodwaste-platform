import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Truck,
  Calendar,
  Utensils,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Compass,
} from "lucide-react";
import Layout from "../components/Layout";
import { api } from "../api";

const STATUS_CONFIG = {
  pending: {
    color: "#b48d38",
    bg: "rgba(180, 141, 56, 0.08)",
    border: "rgba(180, 141, 56, 0.35)",
    label: "Pending Approval",
  },
  confirmed: {
    color: "#2d5940",
    bg: "rgba(45, 89, 64, 0.08)",
    border: "rgba(45, 89, 64, 0.35)",
    label: "Confirmed by Donor",
  },
  picked_up: {
    color: "#1f3a2e",
    bg: "rgba(31, 58, 46, 0.12)",
    border: "rgba(31, 58, 46, 0.4)",
    label: "Completed",
  },
  cancelled: {
    color: "#c1442d",
    bg: "rgba(193, 68, 45, 0.08)",
    border: "rgba(193, 68, 45, 0.35)",
    label: "Cancelled",
  },
};

export default function MyPickupsPage() {
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const load = () => {
    setLoading(true);
    api
      .myPickups()
      .then(setPickups)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const markPickedUp = async (id) => {
    setProcessingId(id);
    try {
      await api.updatePickup(id, { status: "picked_up" });
      load();
    } catch (err) {
      alert(`Error updating pickup: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const cancel = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this pickup request?")) return;
    setProcessingId(id);
    try {
      await api.updatePickup(id, { status: "cancelled" });
      load();
    } catch (err) {
      alert(`Error cancelling pickup: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Layout>
      <div className="mb-8">
        <span className="font-mono text-xs uppercase tracking-widest text-tomato-500 font-semibold block mb-1">
          Pickup Coordination
        </span>
        <h1 className="font-display text-2xl sm:text-3xl text-forest-800 font-semibold">
          Your Scheduled Pickups
        </h1>
        <p className="text-xs sm:text-sm text-forest-800/60 mt-1">
          Track donation requests, coordinate arrival times, and record completed food pickups.
        </p>
      </div>

      {loading ? (
        <div className="bg-white border border-wheat-200 rounded-xl p-12 text-center shadow-2xs">
          <RefreshCw className="w-6 h-6 animate-spin text-forest-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-forest-800">Loading your scheduled pickups...</p>
        </div>
      ) : pickups.length === 0 ? (
        <div className="bg-white border border-wheat-200 rounded-xl p-8 sm:p-12 text-center shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-forest-50 text-forest-700 flex items-center justify-center mx-auto mb-4 border border-forest-100">
            <Truck className="w-6 h-6 text-forest-600" />
          </div>
          <h3 className="font-display text-lg text-forest-800 font-semibold mb-1">
            No pickups scheduled yet
          </h3>
          <p className="text-xs sm:text-sm text-forest-800/60 max-w-sm mx-auto mb-6">
            Browse available surplus food from local businesses and request a pickup to rescue meals.
          </p>
          <Link
            to="/dashboard/browse"
            className="inline-flex items-center gap-2 px-4 py-2 bg-forest-800 text-wheat-50 rounded-lg text-xs sm:text-sm font-medium hover:bg-forest-700 shadow-sm transition-all"
          >
            <Compass className="w-4 h-4" />
            Browse Available Surplus
          </Link>
        </div>
      ) : (
        <div className="space-y-3.5">
          {pickups.map((p) => {
            const statusCfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.pending;
            const isFinished = p.status === "picked_up" || p.status === "cancelled";

            return (
              <div
                key={p.id}
                className="bg-white border border-wheat-200 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-xs transition-shadow"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="font-display text-base sm:text-lg text-forest-800 font-semibold">
                      Listing #{p.listing_id}
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

                  <div className="flex flex-wrap items-center gap-4 text-xs text-forest-800/70">
                    <span className="flex items-center gap-1 font-medium text-forest-600">
                      <Utensils className="w-3.5 h-3.5 shrink-0" />
                      ~{p.meals_estimate} meals estimated
                    </span>
                    {p.scheduled_time && (
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5 text-forest-800/40 shrink-0" />
                        {new Date(p.scheduled_time).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {!isFinished && (
                  <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-wheat-100 shrink-0">
                    <button
                      onClick={() => markPickedUp(p.id)}
                      disabled={processingId === p.id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-forest-800 text-wheat-50 rounded-lg text-xs font-semibold hover:bg-forest-700 disabled:opacity-50 transition-all shadow-2xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Mark Picked Up</span>
                    </button>
                    <button
                      onClick={() => cancel(p.id)}
                      disabled={processingId === p.id}
                      className="inline-flex items-center gap-1 px-3 py-2 text-tomato-500 hover:bg-tomato-500/10 rounded-lg text-xs font-medium transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
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
