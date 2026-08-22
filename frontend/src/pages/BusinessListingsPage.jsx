import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api } from "../api";

const STATUS_COLOR = {
  available: "#2d5940",
  matched: "#d4a94c",
  completed: "#1f3a2e",
  expired: "#c1442d",
};

export default function BusinessListingsPage() {
  const [listings, setListings] = useState([]);
  const [pickupsByListing, setPickupsByListing] = useState({});
  const [loading, setLoading] = useState(true);

  const load = () => {
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

  useEffect(load, []);

  const confirmPickup = async (pickupId) => {
    await api.updatePickup(pickupId, { status: "confirmed" });
    load();
  };

  return (
    <Layout>
      <p className="font-mono text-xs uppercase tracking-widest text-tomato-500 mb-2">
        Module 03 · Redistribution Marketplace
      </p>
      <h1 className="font-display text-3xl text-forest-800 mb-8">Your surplus listings</h1>

      {loading && <p className="text-sm text-forest-800/50">Loading…</p>}
      {!loading && listings.length === 0 && (
        <p className="text-sm text-forest-800/50">
          No listings yet — go to Inventory and click "List surplus" on an item.
        </p>
      )}

      <div className="space-y-4">
        {listings.map((l) => (
          <div key={l.id} className="bg-white border border-wheat-200 rounded-lg p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-forest-800">{l.title}</p>
                <p className="text-xs text-forest-800/50 capitalize">
                  {l.quantity} {l.unit} · expires {l.expiry_date} · {l.pickup_location}
                </p>
              </div>
              <span
                className="risk-stamp px-3 py-1 text-[10px] capitalize"
                style={{ color: STATUS_COLOR[l.status] }}
              >
                {l.status}
              </span>
            </div>

            {pickupsByListing[l.id]?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-wheat-100 space-y-2">
                {pickupsByListing[l.id].map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-forest-800/70">
                      {p.ngo_name} · requested pickup · ~{p.meals_estimate} meals · status: {p.status}
                    </span>
                    {p.status === "pending" && (
                      <button
                        onClick={() => confirmPickup(p.id)}
                        className="text-xs font-medium text-forest-600 hover:text-forest-800"
                      >
                        Confirm pickup
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Layout>
  );
}
