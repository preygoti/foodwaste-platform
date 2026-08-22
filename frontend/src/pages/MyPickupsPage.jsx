import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api } from "../api";

const STATUS_COLOR = {
  pending: "#d4a94c",
  confirmed: "#2d5940",
  picked_up: "#1f3a2e",
  cancelled: "#c1442d",
};

export default function MyPickupsPage() {
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.myPickups().then(setPickups).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const markPickedUp = async (id) => {
    await api.updatePickup(id, { status: "picked_up" });
    load();
  };

  const cancel = async (id) => {
    await api.updatePickup(id, { status: "cancelled" });
    load();
  };

  return (
    <Layout>
      <p className="font-mono text-xs uppercase tracking-widest text-tomato-500 mb-2">
        Pickup coordination
      </p>
      <h1 className="font-display text-3xl text-forest-800 mb-8">Your pickups</h1>

      {loading && <p className="text-sm text-forest-800/50">Loading…</p>}
      {!loading && pickups.length === 0 && (
        <p className="text-sm text-forest-800/50">
          No pickups yet — browse available surplus and request one.
        </p>
      )}

      <div className="bg-white border border-wheat-200 rounded-lg overflow-hidden">
        {pickups.map((p) => (
          <div key={p.id} className="flex items-center justify-between px-5 py-4 ledger-row">
            <div>
              <p className="text-sm font-medium text-forest-800">Listing #{p.listing_id}</p>
              <p className="text-xs text-forest-800/50">~{p.meals_estimate} meals estimated</p>
            </div>
            <span
              className="risk-stamp px-3 py-1 text-[10px] capitalize"
              style={{ color: STATUS_COLOR[p.status] }}
            >
              {p.status.replace("_", " ")}
            </span>
            <div className="flex gap-3">
              {p.status !== "picked_up" && p.status !== "cancelled" && (
                <>
                  <button onClick={() => markPickedUp(p.id)} className="text-xs font-medium text-forest-600 hover:text-forest-800">
                    Mark picked up
                  </button>
                  <button onClick={() => cancel(p.id)} className="text-xs font-medium text-tomato-500 hover:text-tomato-600">
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
