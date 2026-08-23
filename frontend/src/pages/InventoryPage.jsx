import { useEffect, useState } from "react";
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

export default function InventoryPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
    setItems([]); // Clear previous user's inventory immediately when user changes
    if (user?.role === "business") {
      load();
    } else {
      setLoading(false);
    }
  }, [user?.id, user?.role]);

  // If authenticated as NGO, display clear role restriction rather than rendering business controls
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
    if (!window.confirm(`Are you sure you want to remove "${name}" from inventory?`)) return;
    try {
      await api.deleteInventoryItem(id);
      load();
    } catch (err) {
      alert(`Failed to delete item: ${err.message}`);
    }
  };

  const openListingModal = (item) => {
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

  // Filtered & Searched items
  const filtered = items.filter((item) => {
    const matchesRisk = filter === "all" || item.risk_level === filter;
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.storage_location && item.storage_location.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesRisk && matchesCategory && matchesSearch;
  });

  const highRiskCount = items.filter((i) => i.risk_level === "high").length;
  const mediumRiskCount = items.filter((i) => i.risk_level === "medium").length;
  const lowRiskCount = items.filter((i) => i.risk_level === "low").length;

  return (
    <Layout>
      {/* ------------------------------------------------------------- */}
      {/* HEADER SECTION                                                */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-tomato-500 font-semibold">
              Module 01 · Inventory &amp; Expiry
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl text-forest-800 font-semibold mt-1">
            Inventory Ledger
          </h1>
          <p className="text-xs sm:text-sm text-forest-800/60 mt-1">
            Real-time shelf-life tracking, AI waste risk scoring &amp; redistribution.
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
      {/* SEARCH & FILTERS BAR                                          */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white border border-wheat-200 rounded-xl p-3 sm:p-4 mb-6 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-forest-800/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search items, categories, or storage..."
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

        {/* Risk Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-wheat-100">
          <span className="text-[11px] font-mono text-forest-800/50 uppercase tracking-wider mr-1">
            Risk Filter:
          </span>
          {[
            { key: "all", label: "All Items", count: items.length },
            { key: "high", label: "High Risk", count: highRiskCount, color: "text-tomato-500" },
            { key: "medium", label: "Watch", count: mediumRiskCount, color: "text-gold-600" },
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
            <Layers className="w-6 h-6 text-forest-600" />
          </div>
          <h3 className="font-display text-lg text-forest-800 font-semibold mb-1">
            {items.length === 0 ? "No inventory items recorded yet" : "No items match your filter"}
          </h3>
          <p className="text-xs sm:text-sm text-forest-800/60 max-w-sm mx-auto mb-6">
            {items.length === 0
              ? "Start tracking your shelf-life and AI waste predictions by adding your first item or importing a CSV file."
              : "Try adjusting your search query or selecting 'All Items' to see all inventory."}
          </p>
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
        </div>
      ) : (
        <>
          {/* DESKTOP TABLE VIEW (>= 768px) */}
          <div className="hidden md:block bg-white border border-wheat-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-wheat-100/70 border-b border-wheat-200 text-xs font-mono uppercase tracking-wider text-forest-800/60">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Item &amp; Details</th>
                    <th className="py-3 px-4 font-semibold">Quantity</th>
                    <th className="py-3 px-4 font-semibold">Expiry Date</th>
                    <th className="py-3 px-4 font-semibold">Reorder Advice</th>
                    <th className="py-3 px-4 font-semibold">Waste Risk</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-wheat-200/80">
                  {filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-wheat-50/50 transition-colors">
                      {/* Name & Metadata */}
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-forest-800 text-sm">{item.name}</p>
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

                      {/* Expiry Date */}
                      <td className="py-3.5 px-4">
                        <p className="font-mono text-sm">{item.expiry_date}</p>
                        <p
                          className={`text-xs font-medium ${
                            item.days_to_expiry <= 2
                              ? "text-tomato-500 font-semibold"
                              : item.days_to_expiry <= 5
                              ? "text-gold-600"
                              : "text-forest-800/50"
                          }`}
                        >
                          {item.days_to_expiry <= 0
                            ? "⚠️ Expired"
                            : `${item.days_to_expiry} day${item.days_to_expiry === 1 ? "" : "s"} left`}
                        </p>
                      </td>

                      {/* Reorder Recommendation */}
                      <td className="py-3.5 px-4 font-mono text-xs">
                        {item.reorder_recommendation > 0 ? (
                          <span className="inline-flex items-center gap-1 text-forest-600 bg-forest-50 px-2 py-1 rounded border border-forest-100">
                            +{item.reorder_recommendation} {item.unit}
                          </span>
                        ) : (
                          <span className="text-forest-800/40 font-mono">—</span>
                        )}
                      </td>

                      {/* Risk Stamp */}
                      <td className="py-3.5 px-4">
                        <RiskStamp level={item.risk_level} score={item.risk_score} />
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
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
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE CARDS VIEW (< 768px) */}
          <div className="md:hidden space-y-3.5">
            {filtered.map((item) => (
              <div
                key={item.id}
                className={`bg-white border rounded-xl p-4 shadow-2xs space-y-3 ${
                  item.risk_level === "high"
                    ? "border-tomato-500/40 bg-gradient-to-r from-white via-white to-tomato-500/5"
                    : item.risk_level === "medium"
                    ? "border-gold-500/40"
                    : "border-wheat-200"
                }`}
              >
                {/* Top Row: Name, Category & Risk Stamp */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-forest-800 text-base leading-tight">
                      {item.name}
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
                  <RiskStamp level={item.risk_level} score={item.risk_score} />
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
                      Expiry
                    </span>
                    <span
                      className={`font-mono text-sm font-semibold ${
                        item.days_to_expiry <= 2
                          ? "text-tomato-500"
                          : item.days_to_expiry <= 5
                          ? "text-gold-600"
                          : "text-forest-800"
                      }`}
                    >
                      {item.expiry_date}
                    </span>
                    <span className="text-[10px] text-forest-800/50 block">
                      ({item.days_to_expiry <= 0 ? "Expired" : `${item.days_to_expiry}d left`})
                    </span>
                  </div>

                  {item.reorder_recommendation > 0 && (
                    <div className="col-span-2 pt-1">
                      <span className="text-[11px] font-mono text-forest-600 bg-forest-50 px-2 py-0.5 rounded border border-forest-100 inline-block">
                        💡 Reorder recommendation: +{item.reorder_recommendation} {item.unit}
                      </span>
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-wheat-100">
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
                </div>
              </div>
            ))}
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
                  required
                  placeholder="e.g. Sourdough Loaves, Whole Milk, Fresh Tomatoes"
                  value={form.name}
                  onChange={updateForm("name")}
                  className="w-full border border-wheat-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1">
                    Category *
                  </label>
                  <select
                    value={form.category}
                    onChange={updateForm("category")}
                    className="w-full border border-wheat-200 rounded-lg px-3 py-2 text-sm capitalize focus:outline-none focus:ring-2 focus:ring-forest-400 bg-white"
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
                    Quantity &amp; Unit *
                  </label>
                  <div className="flex gap-2">
                    <input
                      required
                      type="number"
                      step="0.1"
                      min="0.1"
                      placeholder="Qty"
                      value={form.quantity}
                      onChange={updateForm("quantity")}
                      className="w-24 border border-wheat-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-forest-400"
                    />
                    <input
                      placeholder="kg, liter, packs"
                      value={form.unit}
                      onChange={updateForm("unit")}
                      className="flex-1 border border-wheat-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1">
                    Expiry Date *
                  </label>
                  <input
                    required
                    type="date"
                    value={form.expiry_date}
                    onChange={updateForm("expiry_date")}
                    className="w-full border border-wheat-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-forest-400"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1">
                    Avg. Daily Usage
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="1.0"
                    value={form.avg_daily_usage}
                    onChange={updateForm("avg_daily_usage")}
                    className="w-full border border-wheat-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-forest-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1">
                    Storage Location
                  </label>
                  <input
                    placeholder="e.g. Refrigerator 1, Dry Pantry Shelf 3"
                    value={form.storage_location}
                    onChange={updateForm("storage_location")}
                    className="w-full border border-wheat-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-wheat-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-forest-800 hover:bg-wheat-200/50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="px-5 py-2 text-sm font-medium bg-forest-800 text-wheat-50 rounded-lg hover:bg-forest-700 disabled:opacity-50 transition-all shadow-sm"
                >
                  {submittingAdd ? "Saving Item..." : "Save to Inventory"}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-md bg-white border border-wheat-200 rounded-xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-5 border-b border-wheat-200 bg-wheat-50">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-md bg-forest-800 text-wheat-50">
                  <Share2 className="w-4 h-4" />
                </span>
                <h2 className="font-display text-xl text-forest-800">List on Marketplace</h2>
              </div>
              <button
                onClick={() => setListingModalItem(null)}
                className="p-2 text-forest-800/50 hover:text-forest-800 rounded-lg hover:bg-wheat-200/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateListing} className="p-6 space-y-4">
              <div className="p-3.5 bg-forest-50 border border-forest-100 rounded-lg">
                <p className="text-xs font-semibold text-forest-800">{listingModalItem.name}</p>
                <p className="text-[11px] text-forest-800/60 mt-0.5">
                  Available in inventory: {listingModalItem.quantity} {listingModalItem.unit} (Expires {listingModalItem.expiry_date})
                </p>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1">
                  Surplus Quantity to Donate *
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max={listingModalItem.quantity}
                    required
                    value={listingForm.quantity}
                    onChange={(e) => setListingForm({ ...listingForm, quantity: e.target.value })}
                    className="w-32 border border-wheat-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-forest-400"
                  />
                  <span className="text-sm font-mono text-forest-800/70">{listingModalItem.unit}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1">
                  Pickup Location / Address *
                </label>
                <input
                  required
                  placeholder="e.g. 123 Market St, Loading Dock 2"
                  value={listingForm.pickup_location}
                  onChange={(e) => setListingForm({ ...listingForm, pickup_location: e.target.value })}
                  className="w-full border border-wheat-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400"
                />
              </div>

              {listingSuccessMsg && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{listingSuccessMsg}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-wheat-200">
                <button
                  type="button"
                  onClick={() => setListingModalItem(null)}
                  className="px-4 py-2 text-sm font-medium text-forest-800 hover:bg-wheat-200/50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={listingSubmitting || !!listingSuccessMsg}
                  className="px-5 py-2 text-sm font-medium bg-forest-800 text-wheat-50 rounded-lg hover:bg-forest-700 disabled:opacity-50 transition-all shadow-sm"
                >
                  {listingSubmitting ? "Publishing..." : "Publish Surplus"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3 & 4: CSV UPLOAD & BARCODE SCANNER                     */}
      {/* ------------------------------------------------------------- */}
      <CsvUploadModal
        isOpen={showCsvModal}
        onClose={() => setShowCsvModal(false)}
        onSuccess={load}
      />

      <BarcodeScannerModal
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onSuccess={load}
      />
    </Layout>
  );
}
