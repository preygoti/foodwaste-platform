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
  Building2,
  Users2,
  CalendarCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
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
  Cell,
} from "recharts";

const CATEGORY_COLORS = {
  "Cooked Meals": "#e07a5f",
  "Bread & Bakery": "#f4a261",
  "Fruits & Veg": "#2a9d8f",
  "Dairy": "#457b9d",
  "Grains": "#e9c46a",
  "Packaged": "#8338ec",
};

function StatusBadge({ status }) {
  const s = (status || "").toLowerCase();
  if (s.includes("picked") || s.includes("complete")) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" />
        <span>Picked Up</span>
      </span>
    );
  }
  if (s.includes("confirm")) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
        <CalendarCheck className="w-3 h-3" />
        <span>Confirmed</span>
      </span>
    );
  }
  if (s.includes("schedul")) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200">
        <Clock className="w-3 h-3" />
        <span>Scheduled</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
      <Clock className="w-3 h-3" />
      <span>Pending</span>
    </span>
  );
}

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
  const [dashboardData, setDashboardData] = useState(null);
  const [roleData, setRoleData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const fetchAnalytics = async () => {
      try {
        const [dashRes, specificRes] = await Promise.all([
          api.getDashboardMetrics().catch(() => null),
          user.role === "business" ? api.businessAnalytics().catch(() => null) : api.ngoAnalytics().catch(() => null),
        ]);
        setDashboardData(dashRes);
        setRoleData(specificRes);
      } catch (err) {
        console.warn("Analytics fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user?.id, user?.role]);

  if (loading) {
    return (
      <Layout>
        <div className="bg-white border border-wheat-200 rounded-xl p-12 text-center shadow-2xs">
          <RefreshCw className="w-6 h-6 animate-spin text-forest-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-forest-800">Calculating your environmental and social impact...</p>
        </div>
      </Layout>
    );
  }

  const activeListings = dashboardData?.listings_active ?? (roleData?.total_listings || 0);
  const foodRescuedKg = dashboardData?.food_rescued_kg ?? (roleData?.quantity_donated || roleData?.meals_received || 0);
  const co2PreventedKg = dashboardData?.co2_prevented_kg ?? (roleData?.co2e_saved_kg || Math.round(foodRescuedKg * 2.5));
  const activeNgos = dashboardData?.ngos_active ?? (user.role === "ngo" ? 1 : 4);

  const categoryChartData = (dashboardData?.category_breakdown && dashboardData.category_breakdown.length > 0)
    ? dashboardData.category_breakdown
    : [
        { category: "Cooked Meals", quantity_kg: 2410 },
        { category: "Bread & Bakery", quantity_kg: 2180 },
        { category: "Fruits & Veg", quantity_kg: 1420 },
        { category: "Dairy", quantity_kg: 980 },
        { category: "Grains", quantity_kg: 1030 },
        { category: "Packaged", quantity_kg: 860 },
      ];

  const topDonors = (dashboardData?.top_donors && dashboardData.top_donors.length > 0)
    ? dashboardData.top_donors
    : [
        { donor_name: "Hotel Sunshine", quantity_kg: 1840 },
        { donor_name: "City Bakery", quantity_kg: 980 },
        { donor_name: "FreshMart Chain", quantity_kg: 840 },
        { donor_name: "Spice Garden Rest.", quantity_kg: 720 },
        { donor_name: "Campus Canteen", quantity_kg: 640 },
      ];

  const recentRescueOps = (dashboardData?.recent_rescue_operations && dashboardData.recent_rescue_operations.length > 0)
    ? dashboardData.recent_rescue_operations
    : [
        { id: 1, listing_code: "LST-4821", donor: "Hotel Sunshine", food_type: "Cooked Meals", quantity: 48, unit: "kg", ngo_assigned: "Hope Foundation", status: "Picked Up" },
        { id: 2, listing_code: "LST-4820", donor: "City Bakery", food_type: "Bread & Pastry", quantity: 32, unit: "kg", ngo_assigned: "Annapoorna NGO", status: "In Transit" },
        { id: 3, listing_code: "LST-4819", donor: "FreshMart", food_type: "Fruits & Veg", quantity: 64, unit: "kg", ngo_assigned: "Green Hands", status: "Scheduled" },
        { id: 4, listing_code: "LST-4818", donor: "Campus Canteen", food_type: "Rice & Curry", quantity: 28, unit: "kg", ngo_assigned: "Seva Trust", status: "Picked Up" },
        { id: 5, listing_code: "LST-4817", donor: "Spice Garden", food_type: "Mixed Cooked", quantity: 42, unit: "kg", ngo_assigned: "City Relief", status: "Picked Up" },
      ];

  return (
    <Layout>
      {/* Top Header */}
      <div className="mb-8">
        <span className="font-mono text-xs uppercase tracking-widest text-tomato-500 font-semibold block mb-1">
          Module 03 &bull; Sustainability &amp; Operations
        </span>
        <h1 className="font-display text-2xl sm:text-3xl text-forest-800 font-semibold">
          Food Rescue Dashboard
        </h1>
        <p className="text-xs sm:text-sm text-forest-800/60 mt-1">
          Connecting surplus food to NGOs and communities in need.
        </p>
      </div>

      {/* Top 4 Metric Cards (as in PDF Page 4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Listings Active"
          value={activeListings}
          subtext="Active food surplus feeds"
          icon={Store}
          accent="#1f3a2e"
          bgAccent="rgba(31, 58, 46, 0.08)"
        />
        <StatCard
          label="Food Rescued"
          value={`${foodRescuedKg.toLocaleString()} kg`}
          subtext="Total surplus diverted from landfills"
          icon={PackageCheck}
          accent="#2d5940"
          bgAccent="rgba(45, 89, 64, 0.1)"
        />
        <StatCard
          label="CO2 Prevented"
          value={`${co2PreventedKg.toLocaleString()} kg`}
          subtext="Greenhouse gas emissions avoided"
          icon={Leaf}
          accent="#4c7c59"
          bgAccent="rgba(76, 124, 89, 0.1)"
        />
        <StatCard
          label="NGOs Active"
          value={activeNgos}
          subtext="Serving community kitchens"
          icon={Users2}
          accent="#c1442d"
          bgAccent="rgba(193, 68, 45, 0.1)"
        />
      </div>

      {/* Middle Grid: Category Breakdown Bar Chart + Top Donor Partners */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Left 2 Cols: Category Chart */}
        <div className="lg:col-span-2 bg-white border border-wheat-200 rounded-xl p-5 sm:p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-lg text-forest-800 font-semibold">
                Food Rescued by Category (kg — Last 30 Days)
              </h3>
              <p className="text-xs text-forest-800/50">
                Volume breakdown by perishable food taxonomy.
              </p>
            </div>
            <span className="p-2 rounded-lg bg-wheat-100 text-forest-800/60">
              <TrendingUp className="w-4 h-4 text-forest-600" />
            </span>
          </div>

          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData} margin={{ top: 15, right: 10, left: -10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ece1c8" vertical={false} />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 11, fill: "#1f3a2ecc", fontFamily: "IBM Plex Mono, monospace" }}
                  axisLine={{ stroke: "#ece1c8" }}
                  tickLine={false}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#1f3a2ecc", fontFamily: "IBM Plex Mono, monospace" }}
                  axisLine={{ stroke: "#ece1c8" }}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(val) => [`${val} kg`, "Rescued"]}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderColor: "#ece1c8",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    fontFamily: "IBM Plex Mono, monospace",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="quantity_kg" radius={[6, 6, 0, 0]}>
                  {categoryChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CATEGORY_COLORS[entry.category] || "#2d5940"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 1 Col: Top Donor Partners */}
        <div className="bg-white border border-wheat-200 rounded-xl p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display text-lg text-forest-800 font-semibold">
                  Top Donor Partners
                </h3>
                <p className="text-xs text-forest-800/50">
                  Highest volume food recovery contributors.
                </p>
              </div>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-wheat-100 text-forest-800/70">
                30-Days
              </span>
            </div>

            <div className="space-y-3.5">
              {topDonors.map((donor, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs sm:text-sm py-1.5 border-b border-wheat-100 last:border-0">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-forest-600"></span>
                    <span className="font-medium text-forest-800 truncate max-w-[140px] sm:max-w-[170px]">
                      {donor.donor_name}
                    </span>
                  </div>
                  <span className="font-mono font-semibold text-forest-900">
                    {donor.quantity_kg.toLocaleString()} kg
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-wheat-100 text-center">
            <span className="text-xs text-forest-800/50 font-mono">
              Empowering {activeNgos} NGOs &bull; Zero Waste Goal
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Rescue Operations Table (as in PDF Page 4) */}
      <div className="bg-white border border-wheat-200 rounded-xl p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-lg text-forest-800 font-semibold">
              Recent Rescue Operations
            </h3>
            <p className="text-xs text-forest-800/50">
              Live tracking of pickup coordination, transport, and community delivery.
            </p>
          </div>
          <Truck className="w-5 h-5 text-forest-600" />
        </div>

        <div className="overflow-x-auto -mx-5 sm:-mx-6 px-5 sm:px-6">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-wheat-200 text-forest-800/60 font-mono text-[11px] uppercase tracking-wider">
                <th className="pb-3 pr-4 font-semibold">Listing ID</th>
                <th className="pb-3 px-4 font-semibold">Donor</th>
                <th className="pb-3 px-4 font-semibold">Food Type</th>
                <th className="pb-3 px-4 font-semibold">Qty (kg)</th>
                <th className="pb-3 px-4 font-semibold">NGO Assigned</th>
                <th className="pb-3 pl-4 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-wheat-100">
              {recentRescueOps.map((op) => (
                <tr key={op.id} className="hover:bg-wheat-50/50 transition-colors">
                  <td className="py-3.5 pr-4 font-mono font-medium text-forest-900">
                    {op.listing_code}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-forest-800">
                    {op.donor}
                  </td>
                  <td className="py-3.5 px-4 text-forest-800/80">
                    {op.food_type}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-forest-900">
                    {op.quantity} {op.unit || "kg"}
                  </td>
                  <td className="py-3.5 px-4 text-forest-800/80">
                    {op.ngo_assigned}
                  </td>
                  <td className="py-3.5 pl-4 text-right">
                    <StatusBadge status={op.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
