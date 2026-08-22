import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import RiskStamp from "../components/RiskStamp";
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
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  const load = () => {
    setLoading(true);
    api
      .listInventory()
      .then((data) => setItems(data.sort((a, b) => a.days_to_expiry - b.days_to_expiry)))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.createInventoryItem({
        ...form,
        quantity: parseFloat(form.quantity),
        avg_daily_usage: parseFloat(form.avg_daily_usage || "1"),
      });
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    if (!confirm("Remove this item?")) return;
    await api.deleteInventoryItem(id);
    load();
  };

  const postAsListing = async (item) => {
    const qty = prompt(`How many ${item.unit} of "${item.name}" to list as surplus?`, item.quantity);
    if (!qty) return;
    const location = prompt("Pickup location / address:");
    if (!location) return;
    await api.createListing({
      inventory_item_id: item.id,
      title: item.name,
      category: item.category,
      quantity: parseFloat(qty),
      unit: item.unit,
      expiry_date: item.expiry_date,
      pickup_location: location,
    });
    alert("Listed on the redistribution marketplace.");
  };

  const filtered = items.filter((i) => filter === "all" || i.risk_level === filter);

  return (
    <Layout>
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-tomato-500 mb-2">
            Module 01 · Inventory &amp; Expiry
          </p>
          <h1 className="font-display text-3xl text-forest-800">Inventory ledger</h1>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="px-4 py-2 bg-forest-800 text-wheat-50 rounded-md text-sm font-medium hover:bg-forest-600"
        >
          {showForm ? "Cancel" : "+ Add item"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white border border-wheat-200 rounded-lg p-6 mb-8 grid grid-cols-2 gap-4">
          {error && <p className="col-span-2 text-sm text-tomato-500">{error}</p>}
          <div>
            <label className="block text-xs uppercase tracking-wide text-forest-800/60 mb-1">Item name</label>
            <input required value={form.name} onChange={update("name")} className="w-full border border-wheat-200 rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-forest-800/60 mb-1">Category</label>
            <select value={form.category} onChange={update("category")} className="w-full border border-wheat-200 rounded-md px-3 py-2 capitalize">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-forest-800/60 mb-1">Quantity</label>
            <input required type="number" step="0.1" value={form.quantity} onChange={update("quantity")} className="w-full border border-wheat-200 rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-forest-800/60 mb-1">Unit</label>
            <input value={form.unit} onChange={update("unit")} className="w-full border border-wheat-200 rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-forest-800/60 mb-1">Expiry date</label>
            <input required type="date" value={form.expiry_date} onChange={update("expiry_date")} className="w-full border border-wheat-200 rounded-md px-3 py-2" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-forest-800/60 mb-1">Avg. daily usage</label>
            <input type="number" step="0.1" value={form.avg_daily_usage} onChange={update("avg_daily_usage")} className="w-full border border-wheat-200 rounded-md px-3 py-2" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs uppercase tracking-wide text-forest-800/60 mb-1">Storage location</label>
            <input value={form.storage_location} onChange={update("storage_location")} className="w-full border border-wheat-200 rounded-md px-3 py-2" />
          </div>
          <button className="col-span-2 bg-forest-800 text-wheat-50 rounded-md py-2.5 font-medium hover:bg-forest-600">
            Save item
          </button>
        </form>
      )}

      <div className="flex gap-2 mb-4">
        {["all", "high", "medium", "low"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-wide border ${
              filter === f ? "bg-forest-800 text-wheat-50 border-forest-800" : "border-wheat-200 text-forest-800/60"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="bg-white border border-wheat-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-3 px-5 py-3 text-xs uppercase tracking-wide text-forest-800/50 border-b border-wheat-200">
          <span>Item</span>
          <span>Quantity</span>
          <span>Expiry</span>
          <span>Reorder qty</span>
          <span>Risk</span>
          <span></span>
        </div>
        {loading && <p className="p-6 text-sm text-forest-800/50">Loading…</p>}
        {!loading && filtered.length === 0 && (
          <p className="p-6 text-sm text-forest-800/50">No items yet — add your first inventory item above.</p>
        )}
        {filtered.map((item) => (
          <div key={item.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-3 px-5 py-4 items-center ledger-row">
            <div>
              <p className="text-sm font-medium text-forest-800">{item.name}</p>
              <p className="text-xs text-forest-800/50 capitalize">{item.category} · {item.storage_location || "—"}</p>
            </div>
            <span className="font-mono text-sm">{item.quantity} {item.unit}</span>
            <div>
              <p className="font-mono text-sm">{item.expiry_date}</p>
              <p className="text-xs text-forest-800/50">{item.days_to_expiry} days left</p>
            </div>
            <span className="font-mono text-sm">
              {item.reorder_recommendation > 0 ? `${item.reorder_recommendation} ${item.unit}` : "—"}
            </span>
            <RiskStamp level={item.risk_level} score={item.risk_score} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => postAsListing(item)} className="text-xs font-medium text-forest-600 hover:text-forest-800">
                List surplus
              </button>
              <button onClick={() => remove(item.id)} className="text-xs font-medium text-tomato-500 hover:text-tomato-600">
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
