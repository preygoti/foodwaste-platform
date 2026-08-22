import { useEffect, useState } from "react";
import {
  TrendingUp,
  Leaf,
  Utensils,
  PackageCheck,
  Package,
  Layers,
  Store,
  RefreshCw,
} from "lucide-react";
import Layout from "../components/Layout";
import { useAuth } from "../AuthContext";
import { api } from "../api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";

function StatCard({ label, value, subtext, icon: Icon, accent, bgAccent }) {
  return (
    <div className="bg-white border border-wheat-200 rounded-xl p-5 shadow-2xs flex items-start justify-between">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-forest-800/50 font-mono">{label}</p>
        <p className="font-display text-2xl sm:text-3xl font-semibold" style={{ color: accent || "#1f3a2e" }}>
          {value}
        </p>
        {subtext && <p className="text-xs text-forest-800/60 mt-0.5">{subtext}</p>}
      </div>
      {Icon && (
        <div
          className="p-2.5 rounded-xl shrink-0"
          style={{ backgroundColor: bgAccent || "rgba(45, 89, 64, 0.08)", color: accent || "#2d5940" }}
        >
          <Icon className="w-5 h-5" />
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const call = user.role === "business" ? api.businessAnalytics : api.ngoAnalytics;
    call()
      .then(setData)
      .finally(() => setLoading(false));
  }, [user.role]);

  if (loading || !data) {
    return (
      <Layout>
        <div className="bg-white border border-wheat-200 rounded-xl p-12 text-center shadow-2xs">
          <RefreshCw className="w-6 h-6 animate-spin text-forest-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-forest-800">Calculating your environmental and social impact...</p>
        </div>
      </Layout>
    );
  }

  const chartData =
    user.role === "business"
      ? [
          { name: "Inventory", value: data.total_inventory_items },
          { name: "High Risk", value: data.high_risk_items },
          { name: "Listings", value: data.total_listings },
          { name: "Donations", value: data.completed_donations },
        ]
      : [
          { name: "Pickups", value: data.total_pickups },
          { name: "Completed", value: data.completed_pickups },
          { name: "Available", value: data.active_listings_nearby },
        ];

  return (
    <Layout>
      <div className="mb-8">
        <span className="font-mono text-xs uppercase tracking-widest text-tomato-500 font-semibold block mb-1">
          Analytics &amp; Impact
        </span>
        <h1 className="font-display text-2xl sm:text-3xl text-forest-800 font-semibold">
          Your Ecological &amp; Social Impact
        </h1>
        <p className="text-xs sm:text-sm text-forest-800/60 mt-1">
          Quantifying avoided carbon emissions, meals preserved, and inventory redistribution efficiency.
        </p>
      </div>

      {/* Impact Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {user.role === "business" ? (
          <>
            <StatCard
              label="Quantity Rescued"
              value={`${data.quantity_donated} units`}
              subtext="Total surplus food successfully donated"
              icon={PackageCheck}
              accent="#2d5940"
              bgAccent="rgba(45, 89, 64, 0.1)"
            />
            <StatCard
              label="CO2e Avoided"
              value={`${data.co2e_saved_kg} kg`}
              subtext="Greenhouse emissions kept out of landfills"
              icon={Leaf}
              accent="#4c7c59"
              bgAccent="rgba(76, 124, 89, 0.1)"
            />
            <StatCard
              label="Meals Provided"
              value={data.meals_redistributed}
              subtext="Nutritious meals delivered to families in need"
              icon={Utensils}
              accent="#c1442d"
              bgAccent="rgba(193, 68, 45, 0.1)"
            />
          </>
        ) : (
          <>
            <StatCard
              label="Meals Received"
              value={data.meals_received}
              subtext="Total meal portions served to community"
              icon={Utensils}
              accent="#2d5940"
              bgAccent="rgba(45, 89, 64, 0.1)"
            />
            <StatCard
              label="Completed Pickups"
              value={data.completed_pickups}
              subtext="Successful rescue collection operations"
              icon={PackageCheck}
              accent="#4c7c59"
              bgAccent="rgba(76, 124, 89, 0.1)"
            />
            <StatCard
              label="Available Surplus Nearby"
              value={data.active_listings_nearby}
              subtext="Live listings available for immediate pickup"
              icon={Store}
              accent="#c1442d"
              bgAccent="rgba(193, 68, 45, 0.1)"
            />
          </>
        )}
      </div>

      {/* Activity Overview Chart Card */}
      <div className="bg-white border border-wheat-200 rounded-xl p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-lg text-forest-800 font-semibold">
              Platform Activity Summary
            </h3>
            <p className="text-xs text-forest-800/50">
              Breakdown of records, status tracking, and fulfillment cycles.
            </p>
          </div>
          <span className="p-2 rounded-lg bg-wheat-100 text-forest-800/60">
            <TrendingUp className="w-4 h-4 text-forest-600" />
          </span>
        </div>

        <div className="w-full h-64 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ece1c8" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#1f3a2ecc", fontFamily: "IBM Plex Mono, monospace" }}
                axisLine={{ stroke: "#ece1c8" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#1f3a2ecc", fontFamily: "IBM Plex Mono, monospace" }}
                allowDecimals={false}
                axisLine={{ stroke: "#ece1c8" }}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderColor: "#ece1c8",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="value" fill="#2d5940" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Layout>
  );
}
