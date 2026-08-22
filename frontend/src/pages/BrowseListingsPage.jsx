import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api } from "../api";

export default function BrowseListingsPage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    api.browseListings().then(setListings).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const claim = async (listing) => {
    const meals = prompt(`Estimated meals from ${listing.quantity} ${listing.unit} of "${listing.title}"?`, Math.round(listing.quantity * 2.5));
    if (meals === null) return;
    try {
      await api.requestPickup({ listing_id: listing.id, meals_estimate: parseFloat(meals) || 0 });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <Layout>
      <p className="font-mono text-xs uppercase tracking-widest text-tomato-500 mb-2">
        Module 03 · Redistribution Marketplace
      </p>
      <h1 className="font-display text-3xl text-forest-800 mb-2">Available surplus</h1>
      <p className="text-sm text-forest-800/60 mb-8">
        Sorted by soonest expiry — the most urgent surplus rises to the top.
      </p>

      {error && <p className="text-sm text-tomato-500 mb-4">{error}</p>}
      {loading && <p className="text-sm text-forest-800/50">Loading…</p>}
      {!loading && listings.length === 0 && (
        <p className="text-sm text-forest-800/50">No surplus listed right now — check back soon.</p>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {listings.map((l) => (
          <div key={l.id} className="bg-white border border-wheat-200 rounded-lg p-5 flex flex-col">
            <p className="font-mono text-xs uppercase tracking-wide text-forest-800/40 mb-1">
              {l.category}
            </p>
            <p className="font-display text-lg text-forest-800 mb-1">{l.title}</p>
            <p className="text-sm text-forest-800/60 mb-1">{l.quantity} {l.unit} available</p>
            <p className="text-sm text-forest-800/60 mb-1">Expires {l.expiry_date}</p>
            <p className="text-sm text-forest-800/60 mb-4">Pickup: {l.pickup_location}</p>
            <p className="text-xs text-forest-800/40 mb-4">Posted by {l.business_name}</p>
            <button
              onClick={() => claim(l)}
              className="mt-auto bg-forest-800 text-wheat-50 rounded-md py-2 text-sm font-medium hover:bg-forest-600"
            >
              Request pickup
            </button>
          </div>
        ))}
      </div>
    </Layout>
  );
}
