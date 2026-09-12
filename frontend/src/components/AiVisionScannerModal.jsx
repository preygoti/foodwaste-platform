import { useState, useRef, useEffect } from "react";
import {
  Camera,
  Upload,
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Calendar,
  ThermometerSnowflake,
  Layers,
  ChevronRight,
  Edit3,
  Sliders,
  Tag,
  Zap,
  Leaf,
  Utensils,
  ShieldCheck,
  Flame,
  HeartHandshake,
  Info,
} from "lucide-react";
import LocationAutocompleteInput from "./LocationAutocompleteInput";
import { api } from "../api";

const CATEGORIES = [
  { id: "", label: "✨ Auto-Detect", color: "bg-forest-800 text-wheat-50" },
  { id: "produce", label: "🍎 Produce", color: "bg-emerald-700 text-emerald-50" },
  { id: "bakery", label: "🍞 Bakery", color: "bg-amber-700 text-amber-50" },
  { id: "dairy", label: "🥛 Dairy", color: "bg-sky-700 text-sky-50" },
  { id: "prepared", label: "🍛 Cooked Meals", color: "bg-orange-700 text-orange-50" },
  { id: "grains", label: "🍚 Grains & Pantry", color: "bg-stone-700 text-stone-50" },
  { id: "meat", label: "🥩 Meat & Protein", color: "bg-rose-700 text-rose-50" },
];

const QUICK_TAGS = [
  { name: "Bananas", category: "produce", icon: "🍌" },
  { name: "Apples", category: "produce", icon: "🍎" },
  { name: "Tomatoes", category: "produce", icon: "🍅" },
  { name: "Spinach", category: "produce", icon: "🥬" },
  { name: "Broccoli", category: "produce", icon: "🥦" },
  { name: "Whole Milk", category: "dairy", icon: "🥛" },
  { name: "Paneer / Cheese", category: "dairy", icon: "🧀" },
  { name: "Sourdough Bread", category: "bakery", icon: "🍞" },
  { name: "Biryani / Rice", category: "prepared", icon: "🍛" },
  { name: "Curry / Dal", category: "prepared", icon: "🍲" },
  { name: "Chicken Breast", category: "meat", icon: "🍗" },
  { name: "Potatoes / Onions", category: "produce", icon: "🥔" },
];

export default function AiVisionScannerModal({ isOpen, onClose, onAutofill }) {
  const [mode, setMode] = useState("camera"); // "camera" | "upload"
  const [selectedCategory, setSelectedCategory] = useState("");
  const [itemHint, setItemHint] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // Editable fields in result screen
  const [editedName, setEditedName] = useState("");
  const [editedCategory, setEditedCategory] = useState("produce");
  const [editedQty, setEditedQty] = useState("10");
  const [editedUnit, setEditedUnit] = useState("kg");
  const [editedExpiry, setEditedExpiry] = useState("");
  const [editedLocation, setEditedLocation] = useState("");

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Initialize camera stream when modal opens in camera mode
  useEffect(() => {
    if (!isOpen || mode !== "camera" || imagePreview) return;

    let active = true;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (active && videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
        }
      })
      .catch((err) => {
        console.warn("Camera access failed:", err);
        setMode("upload");
      });

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen, mode, imagePreview]);

  if (!isOpen) return null;

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setImagePreview(dataUrl);

    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    runAiInspection(dataUrl);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "").replace(/[_\-\+0-9]/g, " ").trim();
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
      runAiInspection(reader.result, nameWithoutExt);
    };
    reader.readAsDataURL(file);
  };

  const runAiInspection = async (base64Img, extraHint = "") => {
    setError("");
    setAnalyzing(true);
    setResult(null);

    const effectiveHint = [itemHint, selectedCategory, extraHint].filter(Boolean).join(" ");

    try {
      const data = await api.inspectFreshness(base64Img, effectiveHint);
      setResult(data);
      // Initialize editable state
      setEditedName(data.detected_name || "Fresh Food Item");
      setEditedCategory(data.detected_category || "produce");
      setEditedQty(String(data.estimated_quantity || 10));
      setEditedUnit(data.unit || "kg");
      setEditedExpiry(data.estimated_expiry_date || "");
      setEditedLocation("");
    } catch (err) {
      setError(err.message || "Failed to analyze food image with AI vision.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApplyAlternative = (alt) => {
    if (!alt) return;
    setEditedName(alt.name || editedName);
    setEditedCategory(alt.category || editedCategory);
    if (alt.unit) setEditedUnit(alt.unit);
    if (alt.estimated_quantity) setEditedQty(String(alt.estimated_quantity));
    if (alt.estimated_days_to_expiry) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + Number(alt.estimated_days_to_expiry));
      setEditedExpiry(targetDate.toISOString().split("T")[0]);
    }
  };

  const handleReset = () => {
    setImagePreview(null);
    setResult(null);
    setError("");
  };

  const handleApplyAutofill = () => {
    if (!onAutofill) return;
    onAutofill({
      name: editedName,
      category: editedCategory,
      quantity: editedQty,
      unit: editedUnit,
      expiry_date: editedExpiry,
      storage_location: editedLocation || "",
      avg_daily_usage: "2",
    });
    onClose();
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-forest-950/65 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200 cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="glass-modal rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[94vh] my-auto border border-white/80 cursor-default"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-wheat-200/50 flex items-center justify-between bg-gradient-to-r from-forest-900/95 to-forest-800/95 backdrop-blur-md text-wheat-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gold-400 text-forest-900 flex items-center justify-center shadow-sm shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-wheat-50 text-base sm:text-lg flex items-center gap-2">
                <span>AI Vision Food Scanner</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-gold-400/20 text-gold-300 border border-gold-400/30">
                  Multimodal v2.0
                </span>
              </h3>
              <p className="text-[10px] sm:text-[11px] text-wheat-200/80 font-mono">
                Computer Vision Food Classification, Freshness Grading &amp; Shelf-Life Predictor
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-wheat-300 hover:text-white p-1.5 rounded-lg transition-colors bg-white/10 hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-forest-900">
          {error && (
            <div className="p-3 rounded-xl bg-tomato-500/10 border border-tomato-500/30 text-tomato-600 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Configuration & Category Bar (Only before image capture) */}
          {!imagePreview && (
            <div className="space-y-2.5">
              {/* Category Pills */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-forest-800/70 mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-forest-600" />
                  <span>Category Target (Optional AI Focus)</span>
                </label>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-mono whitespace-nowrap transition-all border ${
                        selectedCategory === cat.id
                          ? "bg-forest-800 text-wheat-50 border-forest-800 shadow-2xs scale-[1.02]"
                          : "bg-wheat-50/60 text-forest-800/80 border-wheat-200 hover:bg-wheat-100"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Suggestion Chips */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-forest-800/70 mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-forest-600" />
                  <span>Quick Food Suggestions</span>
                </label>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {QUICK_TAGS.map((t) => (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => {
                        setItemHint(t.name);
                        setSelectedCategory(t.category);
                      }}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition-all flex items-center gap-1 ${
                        itemHint === t.name
                          ? "bg-gold-400 text-forest-900 border-gold-500 font-bold shadow-2xs"
                          : "bg-white text-forest-800/80 border-wheat-200 hover:border-forest-400 hover:bg-wheat-50"
                      }`}
                    >
                      <span>{t.icon}</span>
                      <span>{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Search / Hint Box */}
              <div>
                <input
                  type="text"
                  placeholder="Or type specific food name / batch hint (e.g. Samosas, Mangoes, Milk)..."
                  value={itemHint}
                  onChange={(e) => setItemHint(e.target.value)}
                  className="w-full text-xs sm:text-sm border border-wheat-200 rounded-xl px-3.5 py-2 bg-wheat-50/40 focus:outline-none focus:ring-2 focus:ring-forest-400 font-sans"
                />
              </div>
            </div>
          )}

          {/* Camera View / File Upload Stage */}
          {!imagePreview ? (
            <div className="space-y-3">
              {/* Mode Toggle */}
              <div className="flex items-center gap-2 border border-wheat-200 p-1 rounded-xl bg-wheat-50/50 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setMode("camera")}
                  className={`flex-1 py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    mode === "camera"
                      ? "bg-forest-800 text-wheat-50 shadow-2xs"
                      : "text-forest-800/70 hover:text-forest-800"
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Live Camera Scan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("upload")}
                  className={`flex-1 py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    mode === "upload"
                      ? "bg-forest-800 text-wheat-50 shadow-2xs"
                      : "text-forest-800/70 hover:text-forest-800"
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Image File</span>
                </button>
              </div>

              {/* Camera Preview with Scanner Laser & HUD Reticle */}
              {mode === "camera" && (
                <div className="relative aspect-video rounded-xl overflow-hidden bg-black flex items-center justify-center border-2 border-forest-800 shadow-inner">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  {/* High-Tech HUD Viewfinder Reticle */}
                  <div className="absolute inset-6 border border-gold-400/50 rounded-xl pointer-events-none flex flex-col justify-between p-2">
                    {/* Top HUD Indicators */}
                    <div className="flex items-center justify-between text-[10px] font-mono text-gold-300">
                      <span className="flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                        <span>AI VISION ACTIVE</span>
                      </span>
                      <span className="bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs">
                        30 FPS &bull; AUTO-FOCUS
                      </span>
                    </div>

                    {/* Center Crosshairs */}
                    <div className="self-center flex items-center justify-center w-12 h-12 border border-gold-400/30 rounded-full">
                      <div className="w-2 h-2 bg-gold-400 rounded-full" />
                    </div>

                    {/* Bottom HUD Hint */}
                    <div className="text-center">
                      <span className="bg-black/70 text-wheat-100 text-[10px] font-mono px-3 py-1 rounded-full backdrop-blur-xs border border-white/10">
                        Align food item inside frame
                      </span>
                    </div>
                  </div>

                  {/* Animated Glowing Laser Beam */}
                  <div className="absolute left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-gold-400 to-transparent shadow-[0_0_12px_#f59e0b] pointer-events-none animate-laser-scan" />

                  {/* Capture Button */}
                  <button
                    type="button"
                    onClick={handleCapture}
                    className="absolute bottom-3 bg-gradient-to-r from-gold-400 to-amber-500 text-forest-950 px-6 py-2.5 rounded-full font-bold text-xs shadow-xl flex items-center gap-2 hover:brightness-105 active:scale-95 transition-all border border-gold-300 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capture &amp; Analyze</span>
                  </button>
                </div>
              )}

              {/* File Upload Dropzone */}
              {mode === "upload" && (
                <label className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-wheat-300 hover:border-forest-600 rounded-2xl bg-wheat-50/40 hover:bg-wheat-100/50 cursor-pointer transition-all group">
                  <div className="w-12 h-12 rounded-2xl bg-forest-100 text-forest-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-forest-900">
                    Click or Drag &amp; Drop food photo
                  </span>
                  <span className="text-[11px] text-forest-800/60 font-mono mt-1">
                    Supports JPG, PNG, WEBP from phone camera or gallery
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          ) : (
            /* Analysis & Results Stage */
            <div className="space-y-4">
              {/* Image Preview / Loading Indicator */}
              <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-wheat-200">
                <img
                  src={imagePreview}
                  alt="Captured food item"
                  className="w-full h-full object-cover"
                />
                {analyzing && (
                  <div className="absolute inset-0 bg-forest-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-wheat-50 space-y-2.5">
                    <RefreshCw className="w-9 h-9 animate-spin text-gold-400" />
                    <p className="text-xs font-mono font-bold tracking-wider text-gold-300">
                      Processing Multimodal Computer Vision Neural Analysis...
                    </p>
                    <span className="text-[10px] text-wheat-200/70 font-mono">
                      Grading freshness, cellular integrity &amp; predicting shelf-life
                    </span>
                  </div>
                )}
              </div>

              {/* AI Analysis Cards */}
              {result && (
                <div className="space-y-3.5 animate-in fade-in duration-300">
                  {/* Primary Detection & Editable Food Name */}
                  <div className="p-4 rounded-xl bg-forest-50/90 border border-forest-200 shadow-2xs space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <span className="text-[10px] font-mono uppercase text-forest-800/60 block flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>AI Detected Item Name (Click to edit)</span>
                        </span>
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            className="font-display text-base sm:text-lg font-bold text-forest-900 bg-white border border-forest-300 rounded-lg px-2.5 py-1 w-full focus:outline-none focus:ring-2 focus:ring-forest-500"
                          />
                        </div>
                      </div>

                      {/* Freshness Score Pill */}
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono uppercase text-forest-800/60 block">
                          Freshness Score
                        </span>
                        <div className="inline-flex items-center gap-1 font-mono text-xl font-bold text-forest-900">
                          <span>{result.freshness_score}%</span>
                        </div>
                        <span
                          className={`block text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full mt-0.5 ${
                            result.freshness_score >= 85
                              ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                              : result.freshness_score >= 70
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : "bg-rose-100 text-rose-900 border border-rose-300"
                          }`}
                        >
                          {result.freshness_grade}
                        </span>
                      </div>
                    </div>

                    {/* AI Alternative Matches (Fast 1-click swap) */}
                    {result.alternatives && result.alternatives.length > 0 && (
                      <div className="pt-2 border-t border-forest-200/60">
                        <span className="text-[10px] font-mono text-forest-800/70 block mb-1">
                          💡 Alternative AI Matches (Click to switch):
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {result.alternatives.map((alt, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleApplyAlternative(alt)}
                              className={`text-[11px] font-mono px-2 py-1 rounded-md border transition-all ${
                                editedName === alt.name
                                  ? "bg-forest-800 text-wheat-50 border-forest-900 font-bold"
                                  : "bg-white text-forest-800 border-forest-200 hover:bg-forest-100"
                              }`}
                            >
                              <span>{alt.name}</span>
                              <span className="opacity-60 ml-1">({alt.confidence}%)</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quantity, Unit & Expiry Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                    <div className="bg-wheat-50 p-2.5 rounded-xl border border-wheat-200">
                      <label className="text-[10px] text-forest-800/60 uppercase block mb-1">
                        Category
                      </label>
                      <select
                        value={editedCategory}
                        onChange={(e) => setEditedCategory(e.target.value)}
                        className="w-full text-xs font-semibold bg-white border border-wheat-300 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-forest-400 capitalize"
                      >
                        <option value="produce">Produce (Fruits &amp; Veg)</option>
                        <option value="bakery">Bakery &amp; Bread</option>
                        <option value="dairy">Dairy &amp; Eggs</option>
                        <option value="prepared">Cooked Meals</option>
                        <option value="grains">Grains &amp; Pantry</option>
                        <option value="canned">Canned / Packaged</option>
                        <option value="meat">Meat &amp; Poultry</option>
                        <option value="seafood">Seafood</option>
                        <option value="general">General Groceries</option>
                      </select>
                    </div>

                    <div className="bg-wheat-50 p-2.5 rounded-xl border border-wheat-200">
                      <label className="text-[10px] text-forest-800/60 uppercase block mb-1">
                        Batch Quantity
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.5"
                          min="0.1"
                          value={editedQty}
                          onChange={(e) => setEditedQty(e.target.value)}
                          className="w-16 text-xs font-semibold bg-white border border-wheat-300 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-forest-400"
                        />
                        <select
                          value={editedUnit}
                          onChange={(e) => setEditedUnit(e.target.value)}
                          className="flex-1 text-xs font-semibold bg-white border border-wheat-300 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-forest-400"
                        >
                          <option value="kg">kg</option>
                          <option value="liter">liter</option>
                          <option value="loaves">loaves</option>
                          <option value="packs">packs</option>
                          <option value="boxes">boxes</option>
                          <option value="heads">heads</option>
                          <option value="portions">portions</option>
                          <option value="cans">cans</option>
                        </select>
                      </div>
                    </div>

                    <div className="bg-wheat-50 p-2.5 rounded-xl border border-wheat-200">
                      <label className="text-[10px] text-forest-800/60 uppercase block mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-forest-600" />
                        <span>Expiry Date</span>
                      </label>
                      <input
                        type="date"
                        value={editedExpiry}
                        onChange={(e) => setEditedExpiry(e.target.value)}
                        className="w-full text-xs font-semibold bg-white border border-wheat-300 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-forest-400"
                      />
                    </div>
                  </div>

                  {/* Physical Location Selection (City & State) */}
                  <div className="bg-wheat-50 p-3 rounded-xl border border-wheat-200 text-xs">
                    <LocationAutocompleteInput
                      label="Store / Warehouse Location (City, State)"
                      placeholder="e.g. Surat, Gujarat (or type manually)"
                      value={editedLocation}
                      onChange={setEditedLocation}
                    />
                    {result.suggested_storage && (
                      <div className="mt-2.5 pt-2 border-t border-wheat-200/80 flex items-center gap-1.5 text-[11px] text-forest-800/80 font-mono">
                        <ThermometerSnowflake className="w-3.5 h-3.5 text-forest-600 shrink-0" />
                        <span>AI Climate Advice: <strong className="text-forest-900">{result.suggested_storage}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Deep 360° Food Intelligence Panel */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Pro Shelf-Life Extension Tip */}
                    {result.storage_pro_tip && (
                      <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-emerald-900 font-mono text-[10px] font-bold uppercase">
                          <Leaf className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Shelf-Life Pro-Tip (+3-5 Days)</span>
                        </div>
                        <p className="text-[11px] text-emerald-950 leading-relaxed font-medium">
                          {result.storage_pro_tip}
                        </p>
                      </div>
                    )}

                    {/* Nutrition & Dietary Profile */}
                    {result.nutritional_profile && (
                      <div className="bg-sky-50/80 p-3 rounded-xl border border-sky-200 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-sky-900 font-mono text-[10px] font-bold uppercase">
                          <Zap className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                          <span>Nutritional &amp; Health Profile</span>
                        </div>
                        <p className="text-[11px] text-sky-950 leading-relaxed font-medium">
                          {result.nutritional_profile}
                        </p>
                        {result.dietary_flags && result.dietary_flags.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 pt-1">
                            {result.dietary_flags.map((flag, i) => (
                              <span
                                key={i}
                                className="bg-sky-100 text-sky-900 text-[10px] font-mono px-1.5 py-0.5 rounded border border-sky-300 font-semibold"
                              >
                                {flag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Zero-Waste Chef & Spoilage Prevention Card */}
                  {result.zero_waste_recipe && (
                    <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200 text-xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-amber-950 font-mono text-[10px] font-bold uppercase">
                          <Utensils className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>AI Zero-Waste Rescue Chef Idea</span>
                        </div>
                        {result.carbon_impact_saved && (
                          <span className="text-[10px] font-mono text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 font-semibold">
                            🌱 {result.carbon_impact_saved}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-amber-950 leading-relaxed font-medium">
                        {result.zero_waste_recipe}
                      </p>
                    </div>
                  )}

                  {/* AI Quality Notes */}
                  <p className="text-xs text-forest-800/80 bg-wheat-100/60 p-3 rounded-xl border border-wheat-200/80 leading-relaxed italic">
                    &ldquo;{result.quality_notes}&rdquo;
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-wheat-100 bg-wheat-50/50 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          {imagePreview ? (
            <>
              <button
                type="button"
                onClick={handleReset}
                className="w-full sm:w-auto px-4 py-2.5 border border-wheat-300 rounded-xl text-xs font-semibold text-forest-800 hover:bg-wheat-100 text-center cursor-pointer transition-colors"
              >
                Scan Another Item
              </button>

              {result && (
                <button
                  type="button"
                  onClick={handleApplyAutofill}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-forest-800 hover:bg-forest-700 text-wheat-50 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all active:scale-[0.98] cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-gold-400" />
                  <span>Autofill into Inventory Form</span>
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 border border-wheat-300 rounded-xl text-xs font-semibold text-forest-800 hover:bg-wheat-100 text-center cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
