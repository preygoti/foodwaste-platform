import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Upload,
  Scan,
  Search,
  Filter,
  Trash2,
  Share2,
  AlertTriangle,
  Calendar,
  Layers,
  MapPin,
  RefreshCw,
  X,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
  Clock,
  Ban,
  AlertOctagon,
  Flame,
} from "lucide-react";
import Layout from "../components/Layout";
import RiskStamp from "../components/RiskStamp";
import CsvUploadModal from "../components/CsvUploadModal";
import BarcodeScannerModal from "../components/BarcodeScannerModal";
import { useAuth } from "../AuthContext";
import { api } from "../api";

const CATEGORIES = ["produce", "dairy", "bakery", "prepared", "canned", "frozen", "general"];

const emptyForm = {
  name: "",
  category: "produce",
  quantity: "",
  unit: "kg",
  expiry_date: "",
  storage_location: "",
  avg_daily_usage: "1",
};

/** Hook to provide a ticking timer (every second) for live countdowns */
function useLiveTicker(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

/** Formats live remaining time until 23:59:59 of expiryDate */
function computeLiveExpiryCountdown(expiryDateStr, now) {
  if (!expiryDateStr) {
    return { text: "No date set", isExpired: false, urgent: false, warning: false };
  }

  const parts = expiryDateStr.split("-").map(Number);
  if (parts.length !== 3) {
    return { text: expiryDateStr, isExpired: false, urgent: false, warning: false };
  }

  const [year, month, day] = parts;
  // Expiry deadline is end-of-day in local time
  const targetTime = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
  const diffMs = targetTime - now.getTime();

  if (diffMs <= 0) {
    const pastMs = Math.abs(diffMs);
    const pastDays = Math.floor(pastMs / (1000 * 60 * 60 * 24));
    return {
      text: pastDays === 0 ? "Expired today" : `Expired ${pastDays}d ago`,
      isExpired: true,
      urgent: true,
      warning: false,
      diffMs,
    };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, "0");

  let formatted = "";
  if (days > 0) {
    formatted = `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  } else {
    formatted = `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  }

  return {
    text: formatted,
    isExpired: false,
    urgent: days < 1,
    warning: days <= 3,
    days,
    hours,
    minutes,
    seconds,
    diffMs,
  };
}

/** Live Countdown Badge Component */
function LiveCountdownBadge({ expiryDateStr, now }) {
  const cd = computeLiveExpiryCountdown(expiryDateStr, now);

  if (cd.isExpired) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-rose-100 text-rose-800 border border-rose-200">
        <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
        <span>{cd.text}</span>
      </span>
    );
  }

  if (cd.urgent) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-tomato-50 text-tomato-700 border border-tomato-200 animate-pulse">
        <Flame className="w-3.5 h-3.5 text-tomato-500 shrink-0" />
        <span>{cd.text} left</span>
      </span>
    );
  }

  if (cd.warning) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-amber-50 text-amber-800 border border-amber-200">
        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span>{cd.text} left</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono text-forest-800/80 bg-wheat-100/70 border border-wheat-200">
      <Clock className="w-3.5 h-3.5 text-forest-600 shrink-0" />
      <span>{cd.text} left</span>
    </span>
  );
}

export default function InventoryPage() {
  const { user } = useAuth();
  const now = useLiveTicker(1000); // 1-second reactive ticking
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Navigation tab: 'active' | 'expired'
  const [activeTab, setActiveTab] = useState("active");
  const [filter, setFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [listingModalItem, setListingModalItem] = useState(null);
  const [listingForm, setListingForm] = useState({ quantity: "", pickup_location: "" });
  const [listingSubmitting, setListingSubmitting] = useState(false);
  const [listingSuccessMsg, setListingSuccessMsg] = useState("");

  // Add Item form state
  const [form, setForm] = useState(emptyForm);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [addError, setAddError] = useState("");

  const load = () => {
    if (user?.role !== "business") return;
    setLoading(true);
    setError("");
    api
      .listInventory()
      .then((data) => setItems(data.sort((a, b) => a.days_to_expiry - b.days_to_expiry)))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setItems([]);
    if (user?.role === "business") {
      load();
    } else {
      setLoading(false);
    }
  }, [user?.id, user?.role]);

  // If authenticated as NGO, display clear role restriction
  if (user?.role && user.role !== "business") {
    return (
      <Layout>
        <div className="bg-white border border-wheat-200 rounded-xl p-8 sm:p-12 text-center shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-tomato-500/10 text-tomato-600 flex items-center justify-center mx-auto mb-4 border border-tomato-500/20">
            <ShieldAlert className="w-6 h-6 text-tomato-500" />
          </div>
          <h2 className="font-display text-xl text-forest-800 font-semibold mb-2">
            Business Account Required
          </h2>
          <p className="text-xs sm:text-sm text-forest-800/60 max-w-md mx-auto mb-6">
            The Inventory Ledger is restricted to Food Business accounts. Your account ({user.org_name}) is registered as an NGO / Food Bank.
          </p>
          <Link
            to="/dashboard/browse"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-forest-800 text-wheat-50 rounded-lg text-xs sm:text-sm font-medium hover:bg-forest-700 transition-all shadow-sm"
          >
            Go to Available Surplus
          </Link>
        </div>
      </Layout>
    );
  }

  const updateForm = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleCreateItem = async (e) => {
    e.preventDefault();
    setAddError("");
    setSubmittingAdd(true);
    try {
      await api.createInventoryItem({
        ...form,
        quantity: parseFloat(form.quantity),
        avg_daily_usage: parseFloat(form.avg_daily_usage || "1"),
      });
      setForm(emptyForm);
      setShowAddModal(false);
      load();
    } catch (err) {
      setAddError(err.message);
    } finally {
      setSubmittingAdd(false);
    }
  };

  const remove = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove/dispose "${name}" from inventory?`)) return;
    try {
      await api.deleteInventoryItem(id);
      load();
    } catch (err) {
      alert(`Failed to delete item: ${err.message}`);
    }
  };

  const openListingModal = (item) => {
    const cd = computeLiveExpiryCountdown(item.expiry_date, now);
    if (cd.isExpired || item.days_to_expiry <= 0) {
      alert("⚠️ Food Safety Restriction: Expired items cannot be published to the surplus marketplace. Please log for disposal or composting.");
      return;
    }
    setListingModalItem(item);
    setListingForm({
      quantity: String(item.quantity),
      pickup_location: item.storage_location || "Storefront / Main Entrance",
    });
    setListingSuccessMsg("");
  };

  const handleCreateListing = async (e) => {
    e.preventDefault();
    if (!listingModalItem) return;
    const cd = computeLiveExpiryCountdown(listingModalItem.expiry_date, now);
    if (cd.isExpired || listingModalItem.days_to_expiry <= 0) {
      alert("⚠️ Food Safety Restriction: Expired food items cannot be listed for donation.");
      return;
    }

    setListingSubmitting(true);
    try {
      await api.createListing({
        inventory_item_id: listingModalItem.id,
        title: listingModalItem.name,
        category: listingModalItem.category,
        quantity: parseFloat(listingForm.quantity),
        unit: listingModalItem.unit,
        expiry_date: listingModalItem.expiry_date,
        pickup_location: listingForm.pickup_location,
      });
      setListingSuccessMsg("Surplus item published to marketplace!");
      setTimeout(() => {
        setListingModalItem(null);
        setListingSuccessMsg("");
      }, 1200);
    } catch (err) {
      alert(`Failed to create listing: ${err.message}`);
    } finally {
      setListingSubmitting(false);
    }
  };

  // Segregate Active vs Expired items based on real-time countdown
  const { activeItems, expiredItems } = useMemo(() => {
    const active = [];
    const expired = [];
    for (const item of items) {
      const cd = computeLiveExpiryCountdown(item.expiry_date, now);
      if (cd.isExpired || item.days_to_expiry <= 0) {
        expired.push(item);
      } else {
        active.push(item);
      }
    }
    return { activeItems: active, expiredItems: expired };
  }, [items, now]);

  // Current tab items list
  const currentTabPool = activeTab === "active" ? activeItems : expiredItems;

  // Filtered & Searched items
  const filtered = currentTabPool.filter((item) => {
    const matchesRisk = filter === "all" || item.risk_level === filter;
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.storage_location && item.storage_location.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesRisk && matchesCategory && matchesSearch;
  });

  const highRiskCount = activeItems.filter((i) => i.risk_level === "high").length;
  const mediumRiskCount = activeItems.filter((i) => i.risk_level === "medium").length;
  const lowRiskCount = activeItems.filter((i) => i.risk_level === "low").length;
  const expiredTotalWeight = expiredItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

  return (
    <Layout>
      {/* ------------------------------------------------------------- */}
      {/* HEADER SECTION                                                */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-tomato-500 font-semibold">
              Module 01 &bull; Inventory &amp; Live Expiry Tracking
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl text-forest-800 font-semibold mt-1">
            Inventory Ledger
          </h1>
          <p className="text-xs sm:text-sm text-forest-800/60 mt-1">
            Real-time live shelf-life countdowns, AI waste risk scoring &amp; redistribution.
          </p>
        </div>

        {/* Action Button Group */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <button
            onClick={() => setShowScannerModal(true)}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium bg-white text-forest-800 border border-forest-600/30 hover:bg-forest-50 hover:border-forest-600 shadow-2xs transition-all active:scale-[0.98]"
          >
            <Scan className="w-4 h-4 text-forest-600" />
            <span>Scan Barcode / QR</span>
          </button>

          <button
            onClick={() => setShowCsvModal(true)}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium bg-white text-forest-800 border border-forest-600/30 hover:bg-forest-50 hover:border-forest-600 shadow-2xs transition-all active:scale-[0.98]"
          >
            <Upload className="w-4 h-4 text-forest-600" />
            <span>Upload CSV</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-medium bg-forest-800 text-wheat-50 hover:bg-forest-700 shadow-sm transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECTION TABS: ACTIVE INVENTORY vs EXPIRED ITEMS                */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-center gap-3 mb-6 border-b border-wheat-200 pb-3">
        <button
          onClick={() => {
            setActiveTab("active");
            setFilter("all");
          }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === "active"
              ? "bg-forest-800 text-wheat-50 shadow-sm"
              : "bg-white text-forest-800/70 border border-wheat-200 hover:bg-wheat-100/50"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Active Inventory</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-mono ${
              activeTab === "active" ? "bg-forest-700 text-wheat-100" : "bg-wheat-100 text-forest-800"
            }`}
          >
            {activeItems.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab("expired");
            setFilter("all");
          }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === "expired"
              ? "bg-rose-700 text-white shadow-sm"
              : "bg-white text-rose-700 border border-rose-200 hover:bg-rose-50"
          }`}
        >
          <AlertOctagon className="w-4 h-4 text-rose-500" />
          <span>Expired Items</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
              activeTab === "expired" ? "bg-rose-800 text-white" : "bg-rose-100 text-rose-700"
            }`}
          >
            {expiredItems.length}
          </span>
        </button>
      </div>

      {/* EXPIRED ITEMS NOTICE BANNER */}
      {activeTab === "expired" && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-900 shadow-2xs">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-xs sm:text-sm">
                Food Safety Quarantined Section ({expiredItems.length} expired items &bull; {expiredTotalWeight.toLocaleString()} kg total)
              </h4>
              <p className="text-xs text-rose-700/80 mt-0.5 leading-relaxed">
                Expired items are segregated to comply with health regulations and are <strong>strictly blocked from surplus donation</strong>. Please log disposal, composting, or bio-recycling.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SEARCH & FILTERS BAR                                          */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white border border-wheat-200 rounded-xl p-3 sm:p-4 mb-6 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-forest-800/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${activeTab === "active" ? "active inventory" : "expired items"}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-wheat-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-400 bg-wheat-50/30"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-forest-800/40 hover:text-forest-800"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-3.5 h-3.5 text-forest-800/50" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs sm:text-sm border border-wheat-200 rounded-lg px-2.5 py-2 bg-white text-forest-800 focus:outline-none focus:ring-2 focus:ring-forest-400 capitalize"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Risk Filter Chips (Only for Active tab) */}
        {activeTab === "active" && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-wheat-100">
            <span className="text-[11px] font-mono text-forest-800/50 uppercase tracking-wider mr-1">
              Risk Filter:
            </span>
            {[
              { key: "all", label: "All Active", count: activeItems.length },
              { key: "high", label: "High Risk (<48h)", count: highRiskCount, color: "text-tomato-500" },
              { key: "medium", label: "Watch (<5d)", count: mediumRiskCount, color: "text-gold-600" },
              { key: "low", label: "Fresh", count: lowRiskCount, color: "text-forest-600" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono transition-all border ${
                  filter === f.key
                    ? "bg-forest-800 text-wheat-50 border-forest-800 shadow-2xs font-semibold"
                    : "border-wheat-200 bg-white text-forest-800/70 hover:border-forest-600/50"
                }`}
              >
                <span>{f.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    filter === f.key ? "bg-forest-700 text-wheat-100" : "bg-wheat-100 text-forest-800/60"
                  }`}
                >
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ERROR ALERT                                                   */}
      {/* ------------------------------------------------------------- */}
      {error && (
        <div className="p-4 rounded-xl bg-tomato-500/10 border border-tomato-500/30 text-tomato-600 text-sm mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={load}
            className="text-xs font-semibold underline hover:text-tomato-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* INVENTORY CONTENT: DESKTOP TABLE & MOBILE CARDS              */}
      {/* ------------------------------------------------------------- */}
      {loading ? (
        <div className="bg-white border border-wheat-200 rounded-xl p-12 text-center shadow-2xs">
          <RefreshCw className="w-6 h-6 animate-spin text-forest-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-forest-800">Loading inventory records...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-wheat-200 rounded-xl p-8 sm:p-12 text-center shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-forest-50 text-forest-700 flex items-center justify-center mx-auto mb-4 border border-forest-100">
            {activeTab === "expired" ? (
              <CheckCircle2 className="w-6 h-6 text-forest-600" />
            ) : (
              <Layers className="w-6 h-6 text-forest-600" />
            )}
          </div>
          <h3 className="font-display text-lg text-forest-800 font-semibold mb-1">
            {activeTab === "expired"
              ? "Zero Expired Food Waste!"
              : items.length === 0
              ? "No inventory items recorded yet"
              : "No items match your filter"}
          </h3>
          <p className="text-xs sm:text-sm text-forest-800/60 max-w-sm mx-auto mb-6">
            {activeTab === "expired"
              ? "Great job! There are no expired items in your inventory ledger. All items are fresh or listed for redistribution."
              : items.length === 0
              ? "Start tracking your shelf-life and AI waste predictions by adding your first item or importing a CSV file."
              : "Try adjusting your search query or selecting 'All Items' to see all inventory."}
          </p>
          {activeTab === "active" && (
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-forest-800 text-wheat-50 rounded-lg text-xs sm:text-sm font-medium hover:bg-forest-700 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                Add First Item
              </button>
              <button
                onClick={() => setShowCsvModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-forest-800 border border-wheat-200 rounded-lg text-xs sm:text-sm font-medium hover:bg-wheat-50 transition-all"
              >
                <Upload className="w-4 h-4 text-forest-600" />
                Import CSV
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* DESKTOP TABLE VIEW (>= 768px) */}
          <div className="hidden md:block bg-white border border-wheat-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-wheat-100/70 border-b border-wheat-200 text-xs font-mono uppercase tracking-wider text-forest-800/60">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Item &amp; Category</th>
                    <th className="py-3 px-4 font-semibold">Quantity</th>
                    <th className="py-3 px-4 font-semibold">Live Expiry Countdown</th>
                    <th className="py-3 px-4 font-semibold">Reorder Advice</th>
                    <th className="py-3 px-4 font-semibold">Status &amp; Risk</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-wheat-200/80">
                  {filtered.map((item) => {
                    const cd = computeLiveExpiryCountdown(item.expiry_date, now);
                    const isItemExpired = cd.isExpired || item.days_to_expiry <= 0;

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isItemExpired ? "bg-rose-50/40 hover:bg-rose-50/70" : "hover:bg-wheat-50/50"
                        }`}
                      >
                        {/* Name & Metadata */}
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-forest-800 text-sm flex items-center gap-1.5">
                            {isItemExpired && <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />}
                            <span>{item.name}</span>
                          </p>
                          <p className="text-xs text-forest-800/50 flex items-center gap-2 mt-0.5 capitalize">
                            <span className="bg-wheat-100/70 px-2 py-0.5 rounded text-[11px] font-mono">
                              {item.category}
                            </span>
                            {item.storage_location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-forest-800/40" />
                                {item.storage_location}
                              </span>
                            )}
                          </p>
                        </td>

                        {/* Quantity */}
                        <td className="py-3.5 px-4 font-mono text-sm">
                          <span className="font-semibold">{item.quantity}</span>{" "}
                          <span className="text-forest-800/60 text-xs">{item.unit}</span>
                        </td>

                        {/* Live Expiry Countdown */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <p className="font-mono text-xs text-forest-800/60 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{item.expiry_date}</span>
                            </p>
                            <LiveCountdownBadge expiryDateStr={item.expiry_date} now={now} />
                          </div>
                        </td>

                        {/* Reorder Recommendation */}
                        <td className="py-3.5 px-4 font-mono text-xs">
                          {item.reorder_recommendation > 0 ? (
                            <span className="inline-flex items-center gap-1 text-forest-600 bg-forest-50 px-2 py-1 rounded border border-forest-100">
                              +{item.reorder_recommendation} {item.unit}
                            </span>
                          ) : (
                            <span className="text-forest-800/40 font-mono">&mdash;</span>
                          )}
                        </td>

                        {/* Risk Stamp / Expired Badge */}
                        <td className="py-3.5 px-4">
                          {isItemExpired ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              <Ban className="w-3 h-3" />
                              <span>EXPIRED</span>
                            </span>
                          ) : (
                            <RiskStamp level={item.risk_level} score={item.risk_score} />
                          )}
                        </td>

                        {/* Action buttons */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isItemExpired ? (
                              <button
                                onClick={() => remove(item.id, item.name)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-100 hover:bg-rose-200 border border-rose-300 rounded-lg transition-colors shadow-2xs"
                                title="Log disposal & remove"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Log Disposal</span>
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => openListingModal(item)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-forest-600 hover:text-forest-800 hover:bg-forest-50 rounded-md transition-colors"
                                  title="List as surplus on marketplace"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                  <span>List Surplus</span>
                                </button>
                                <button
                                  onClick={() => remove(item.id, item.name)}
                                  className="p-1.5 text-tomato-400 hover:text-tomato-600 hover:bg-tomato-500/10 rounded-md transition-colors"
                                  title="Delete item"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE CARDS VIEW (< 768px) */}
          <div className="md:hidden space-y-3.5">
            {filtered.map((item) => {
              const cd = computeLiveExpiryCountdown(item.expiry_date, now);
              const isItemExpired = cd.isExpired || item.days_to_expiry <= 0;

              return (
                <div
                  key={item.id}
                  className={`bg-white border rounded-xl p-4 shadow-2xs space-y-3 ${
                    isItemExpired
                      ? "border-rose-300 bg-rose-50/20"
                      : item.risk_level === "high"
                      ? "border-tomato-500/40 bg-gradient-to-r from-white via-white to-tomato-500/5"
                      : item.risk_level === "medium"
                      ? "border-gold-500/40"
                      : "border-wheat-200"
                  }`}
                >
                  {/* Top Row: Name, Category & Risk Stamp */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-forest-800 text-base leading-tight flex items-center gap-1.5">
                        {isItemExpired && <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />}
                        <span>{item.name}</span>
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-[11px] font-mono capitalize px-2 py-0.5 rounded bg-wheat-100 text-forest-800/70">
                          {item.category}
                        </span>
                        {item.storage_location && (
                          <span className="text-[11px] text-forest-800/50 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-forest-800/40" />
                            {item.storage_location}
                          </span>
                        )}
                      </div>
                    </div>
                    {isItemExpired ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-100 text-rose-800 border border-rose-300">
                        EXPIRED
                      </span>
                    ) : (
                      <RiskStamp level={item.risk_level} score={item.risk_score} />
                    )}
                  </div>

                  {/* Middle Info Grid */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-wheat-100 text-xs">
                    <div>
                      <span className="text-forest-800/50 text-[10px] uppercase font-mono block">
                        In Stock
                      </span>
                      <span className="font-mono font-semibold text-forest-800 text-sm">
                        {item.quantity} {item.unit}
                      </span>
                    </div>

                    <div>
                      <span className="text-forest-800/50 text-[10px] uppercase font-mono block">
                        Live Countdown
                      </span>
                      <div className="mt-0.5">
                        <LiveCountdownBadge expiryDateStr={item.expiry_date} now={now} />
                      </div>
                    </div>

                    {item.reorder_recommendation > 0 && !isItemExpired && (
                      <div className="col-span-2 pt-1">
                        <span className="text-[11px] font-mono text-forest-600 bg-forest-50 px-2 py-0.5 rounded border border-forest-100 inline-block">
                          💡 Reorder recommendation: +{item.reorder_recommendation} {item.unit}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-wheat-100">
                    {isItemExpired ? (
                      <button
                        onClick={() => remove(item.id, item.name)}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-100 hover:bg-rose-200 border border-rose-300 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Log Disposal &amp; Clear Item</span>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => openListingModal(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-forest-800 bg-forest-50 hover:bg-forest-100 rounded-lg border border-forest-100 transition-colors"
                        >
                          <Share2 className="w-3.5 h-3.5 text-forest-600" />
                          <span>List as Surplus</span>
                        </button>

                        <button
                          onClick={() => remove(item.id, item.name)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-tomato-500 hover:bg-tomato-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: ADD ITEM DIALOG                                      */}
      {/* ------------------------------------------------------------- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white border border-wheat-200 rounded-xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-5 border-b border-wheat-200 bg-wheat-50">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-md bg-forest-800 text-wheat-50">
                  <Plus className="w-4 h-4" />
                </span>
                <h2 className="font-display text-xl text-forest-800">Add Inventory Item</h2>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 text-forest-800/50 hover:text-forest-800 rounded-lg hover:bg-wheat-200/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {addError && (
                <div className="p-3 rounded-lg bg-tomato-500/10 border border-tomato-500/30 text-tomato-600 text-xs font-medium">
                  {addError}
                </div>
              )}

              <div>
                <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fresh Milk, Sourdough Loaf"
                  value={form.name}
                  onChange={updateForm("name")}
                  className="w-full border border-wheat-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={updateForm("category")}
                    className="w-full border border-wheat-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400 bg-white capitalize"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1">
                    Storage Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Walk-in Fridge #2"
                    value={form.storage_location}
                    onChange={updateForm("storage_location")}
                    className="w-full border border-wheat-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="0.1"
                    placeholder="e.g. 10"
                    value={form.quantity}
                    onChange={updateForm("quantity")}
                    className="w-full border border-wheat-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1">
                    Unit
                  </label>
                  <select
                    value={form.unit}
                    onChange={updateForm("unit")}
                    className="w-full border border-wheat-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400 bg-white"
                  >
                    <option value="kg">kg</option>
                    <option value="liters">liters</option>
                    <option value="units">units</option>
                    <option value="portions">portions</option>
                    <option value="boxes">boxes</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1">
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.expiry_date}
                    onChange={updateForm("expiry_date")}
                    className="w-full border border-wheat-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1">
                    Avg. Daily Usage
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.1"
                    placeholder="e.g. 2.5"
                    value={form.avg_daily_usage}
                    onChange={updateForm("avg_daily_usage")}
                    className="w-full border border-wheat-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400 bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-wheat-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs sm:text-sm font-medium text-forest-800/70 hover:text-forest-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-forest-800 text-wheat-50 hover:bg-forest-700 disabled:opacity-50 shadow-sm"
                >
                  {submittingAdd ? "Saving..." : "Add to Inventory"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: LIST SURPLUS DIALOG                                  */}
      {/* ------------------------------------------------------------- */}
      {listingModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white border border-wheat-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-5 border-b border-wheat-200 bg-wheat-50">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-md bg-forest-800 text-wheat-50">
                  <Share2 className="w-4 h-4" />
                </span>
                <h2 className="font-display text-xl text-forest-800">List as Surplus</h2>
              </div>
              <button
                onClick={() => setListingModalItem(null)}
                className="p-2 text-forest-800/50 hover:text-forest-800 rounded-lg hover:bg-wheat-200/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateListing} className="p-6 space-y-4">
              {listingSuccessMsg ? (
                <div className="p-4 rounded-xl bg-forest-500/10 border border-forest-500/30 text-forest-700 text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-forest-600 shrink-0" />
                  <span>{listingSuccessMsg}</span>
                </div>
              ) : (
                <>
                  <div className="p-3.5 rounded-xl bg-wheat-50 border border-wheat-200 text-xs text-forest-800 space-y-1">
                    <p className="font-semibold text-sm">{listingModalItem.name}</p>
                    <p className="text-forest-800/60 capitalize">
                      Category: {listingModalItem.category} &bull; Expiry: {listingModalItem.expiry_date}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1">
                      Surplus Quantity ({listingModalItem.unit}) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      min="0.1"
                      max={listingModalItem.quantity}
                      value={listingForm.quantity}
                      onChange={(e) => setListingForm({ ...listingForm, quantity: e.target.value })}
                      className="w-full border border-wheat-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400 bg-white"
                    />
                    <p className="text-[11px] text-forest-800/50 mt-1">
                      Available in inventory: {listingModalItem.quantity} {listingModalItem.unit}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1">
                      Pickup Location Address *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Front Counter, 123 Main St"
                      value={listingForm.pickup_location}
                      onChange={(e) =>
                        setListingForm({ ...listingForm, pickup_location: e.target.value })
                      }
                      className="w-full border border-wheat-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400 bg-white"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-wheat-200">
                    <button
                      type="button"
                      onClick={() => setListingModalItem(null)}
                      className="px-4 py-2 text-xs sm:text-sm font-medium text-forest-800/70 hover:text-forest-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={listingSubmitting}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-forest-800 text-wheat-50 hover:bg-forest-700 disabled:opacity-50 shadow-sm"
                    >
                      {listingSubmitting ? "Publishing..." : "Publish to Marketplace"}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* CSV UPLOAD MODAL */}
      <CsvUploadModal
        open={showCsvModal}
        onClose={() => setShowCsvModal(false)}
        onSuccess={() => {
          setShowCsvModal(false);
          load();
        }}
      />

      {/* BARCODE SCANNER MODAL */}
      <BarcodeScannerModal
        open={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onDetected={(data) => {
          setForm({
            ...emptyForm,
            name: data.name || "",
            category: data.category || "general",
            quantity: data.quantity ? String(data.quantity) : "1",
            unit: data.unit || "kg",
            expiry_date: data.expiry_date || "",
          });
          setShowScannerModal(false);
          setShowAddModal(true);
        }}
      />
    </Layout>
  );
}
