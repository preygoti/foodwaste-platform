import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../AuthContext";
import { api } from "../api";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

function StatCard({ label, value, accent }) {
  return (
    <div className="bg-white border border-wheat-200 rounded-lg p-5">
      <p className="text-xs uppercase tracking-wide text-forest-800/50 mb-2">{label}</p>
      <p className="font-display text-3xl" style={{ color: accent || "#1f3a2e" }}>{value}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    const call = user.role === "business" ? api.businessAnalytics : api.ngoAnalytics;
    call().then(setData);
  }, [user.role]);

  if (!data) {
    return (
      <Layout>
        <p className="text-sm text-forest-800/50">Loading impact data…</p>
      </Layout>
    );
  }

  const chartData =
    user.role === "business"
      ? [
          { name: "Inventory items", value: data.total_inventory_items },
          { name: "High risk", value: data.high_risk_items },
          { name: "Listings posted", value: data.total_listings },
          { name: "Donations completed", value: data.completed_donations },
        ]
      : [
          { name: "Pickups requested", value: data.total_pickups },
          { name: "Pickups completed", value: data.completed_pickups },
          { name: "Listings available", value: data.active_listings_nearby },
        ];

  return (
    <Layout>
      <p className="font-mono text-xs uppercase tracking-widest text-tomato-500 mb-2">
        Analytics dashboard
      </p>
      <h1 className="font-display text-3xl text-forest-800 mb-8">Your impact</h1>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {user.role === "business" ? (
          <>
            <StatCard label="Quantity donated" value={`${data.quantity_donated} units`} accent="#2d5940" />
            <StatCard label="CO2e avoided" value={`${data.co2e_saved_kg} kg`} accent="#4c7c59" />
            <StatCard label="Meals redistributed" value={data.meals_redistributed} accent="#c1442d" />
          </>
        ) : (
          <>
            <StatCard label="Meals received" value={data.meals_received} accent="#2d5940" />
            <StatCard label="Completed pickups" value={data.completed_pickups} accent="#4c7c59" />
            <StatCard label="Surplus available now" value={data.active_listings_nearby} accent="#c1442d" />
          </>
        )}
      </div>

      <div className="bg-white border border-wheat-200 rounded-lg p-6">
        <p className="text-xs uppercase tracking-wide text-forest-800/50 mb-4">Activity overview</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ece1c8" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#1f3a2e99" }} />
            <YAxis tick={{ fontSize: 12, fill: "#1f3a2e99" }} allowDecimals={false} />
            <Tooltip contentStyle={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 12 }} />
            <Bar dataKey="value" fill="#2d5940" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Layout>
  );
}
