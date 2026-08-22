import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  Scan,
  Camera,
  X,
  CheckCircle2,
  AlertCircle,
  Keyboard,
  RefreshCw,
  Plus,
  Loader2,
  Sparkles,
} from "lucide-react";
import { api } from "../api";

const CATEGORIES = ["produce", "dairy", "bakery", "prepared", "canned", "frozen", "general"];

// Common food product barcodes for instant lookup & smart fill
const PRODUCT_BARCODE_LOOKUP = {
  "011110417004": { name: "Organic Whole Milk (1 Gallon)", category: "dairy", unit: "liter", defaultUsage: 2.0 },
  "072250037129": { name: "Whole Wheat Sandwich Bread", category: "bakery", unit: "loaves", defaultUsage: 1.5 },
  "024000162967": { name: "Canned Sweet Corn (340g)", category: "canned", unit: "cans", defaultUsage: 0.5 },
  "078742351865": { name: "Fresh Grade A Large Eggs (12pk)", category: "dairy", unit: "packs", defaultUsage: 1.0 },
  "038000359217": { name: "Crispy Corn Flakes Cereal", category: "general", unit: "boxes", defaultUsage: 0.8 },
  "041570054360": { name: "Plain Whole Milk Greek Yogurt", category: "dairy", unit: "tubs", defaultUsage: 1.0 },
  "011110865805": { name: "Fresh Gala Apples", category: "produce", unit: "kg", defaultUsage: 1.2 },
  "041303001402": { name: "Organic Firm Tofu (400g)", category: "prepared", unit: "packs", defaultUsage: 1.0 },
  "070470003006": { name: "Sharp Cheddar Cheese Block", category: "dairy", unit: "blocks", defaultUsage: 0.5 },
  "021000658831": { name: "Macaroni & Cheese Dinner", category: "general", unit: "boxes", defaultUsage: 1.0 },
  "890103000000": { name: "Premium Basmati Rice", category: "general", unit: "kg", defaultUsage: 1.5 },
  "890172518122": { name: "Whole Wheat Atta Flour", category: "general", unit: "kg", defaultUsage: 2.0 },
  "049000000443": { name: "Coca-Cola Zero Sugar (1.5L)", category: "general", unit: "bottles", defaultUsage: 1.0 },
  "028400070560": { name: "Lay's Classic Potato Chips", category: "general", unit: "bags", defaultUsage: 1.0 },
  "036000291452": { name: "Fresh Farm Strawberries (500g)", category: "produce", unit: "packs", defaultUsage: 1.5 },
};

function getSuggestedExpiryDate(category) {
  const date = new Date();
  let daysToAdd = 5;
  if (category === "produce") daysToAdd = 4;
  else if (category === "dairy") daysToAdd = 6;
  else if (category === "bakery") daysToAdd = 3;
  else if (category === "prepared") daysToAdd = 2;
  else if (category === "canned") daysToAdd = 180;
  else if (category === "frozen") daysToAdd = 90;
  date.setDate(date.getDate() + daysToAdd);
  return date.toISOString().split("T")[0];
}

export default function BarcodeScannerModal({ isOpen, onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState("camera"); // "camera" | "manual"
  const [scannerStarted, setScannerStarted] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [scannedCode, setScannedCode] = useState("");
  const [isSmartMatched, setIsSmartMatched] = useState(false);

  // Form state for confirming & saving product
  const [itemForm, setItemForm] = useState({
    name: "",
    category: "produce",
    quantity: "5",
    unit: "kg",
    expiry_date: getSuggestedExpiryDate("produce"),
    avg_daily_usage: "1",
    storage_location: "",
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const readerElementId = "harvest-qr-reader";

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      resetState();
      return;
    }

    if (activeTab === "camera" && !scannedCode) {
      // Short delay to ensure DOM element is mounted
      const timer = setTimeout(() => {
        startScanner();
      }, 150);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    }
  }, [isOpen, activeTab, scannedCode]);

  const resetState = () => {
    setScannedCode("");
    setIsSmartMatched(false);
    setCameraError("");
    setErrorMsg("");
    setSaveSuccess(false);
    setItemForm({
      name: "",
      category: "produce",
      quantity: "5",
      unit: "kg",
      expiry_date: getSuggestedExpiryDate("produce"),
      avg_daily_usage: "1",
      storage_location: "",
    });
  };

  const startScanner = async () => {
    setCameraError("");
    try {
      if (html5QrCodeRef.current) {
        await stopScanner();
      }

      const html5QrCode = new Html5Qrcode(readerElementId);
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          handleDetectedCode(decodedText);
        },
        () => {
          // ignore frame scanning failures
        }
      );

      setScannerStarted(true);
    } catch (err) {
      console.warn("Camera init error:", err);
      setScannerStarted(false);
      let msg = "Could not access camera.";
      if (err?.name === "NotAllowedError" || err?.message?.includes("Permission")) {
        msg = "Camera permission was denied. Please allow camera access or enter barcode manually.";
      } else if (err?.name === "NotFoundError" || err?.message?.includes("device")) {
        msg = "No camera found on this device. You can enter the barcode or item details manually.";
      } else if (window.isSecureContext === false) {
        msg = "Camera access requires HTTPS or localhost. Please enter barcode manually.";
      }
      setCameraError(msg);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn("Failed to stop scanner cleanly:", err);
      } finally {
        html5QrCodeRef.current = null;
        setScannerStarted(false);
      }
    }
  };

  const handleDetectedCode = async (code) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    // Provide sensory feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }

    await stopScanner();
    setScannedCode(cleanCode);
    resolveCodeInformation(cleanCode);
  };

  const resolveCodeInformation = (code) => {
    // 1. Try QR JSON parsing
    if (code.startsWith("{") && code.endsWith("}")) {
      try {
        const parsed = JSON.parse(code);
        const name = parsed.name || parsed.item_name || `Scanned Item (${code.slice(0, 10)})`;
        const cat = parsed.category || "general";
        const unit = parsed.unit || "kg";
        const qty = parsed.quantity ? String(parsed.quantity) : "5";
        const exp = parsed.expiry_date || getSuggestedExpiryDate(cat);
        const usage = parsed.avg_daily_usage ? String(parsed.avg_daily_usage) : "1";

        setItemForm({
          name,
          category: CATEGORIES.includes(cat) ? cat : "general",
          quantity: qty,
          unit,
          expiry_date: exp,
          avg_daily_usage: usage,
          storage_location: parsed.storage_location || "",
        });
        setIsSmartMatched(true);
        return;
      } catch (_) {}
    }

    // 2. Try lookup dictionary
    if (PRODUCT_BARCODE_LOOKUP[code]) {
      const match = PRODUCT_BARCODE_LOOKUP[code];
      setItemForm({
        name: match.name,
        category: match.category,
        quantity: "5",
        unit: match.unit,
        expiry_date: getSuggestedExpiryDate(match.category),
        avg_daily_usage: String(match.defaultUsage || 1),
        storage_location: "Main Storage",
      });
      setIsSmartMatched(true);
      return;
    }

    // 3. Fallback for unindexed barcode
    setIsSmartMatched(false);
    setItemForm((prev) => ({
      ...prev,
      name: `Item (Barcode: ${code})`,
      category: "general",
      expiry_date: getSuggestedExpiryDate("general"),
    }));
  };

  const handleManualCodeSubmit = (e) => {
    e.preventDefault();
    if (!scannedCode.trim()) return;
    resolveCodeInformation(scannedCode.trim());
  };

  const handleFormChange = (field) => (e) => {
    const val = e.target.value;
    setItemForm((prev) => {
      const updated = { ...prev, [field]: val };
      if (field === "category" && !prev.expiry_date) {
        updated.expiry_date = getSuggestedExpiryDate(val);
      }
      return updated;
    });
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSaving(true);
    try {
      await api.createInventoryItem({
        name: itemForm.name,
        category: itemForm.category,
        quantity: parseFloat(itemForm.quantity) || 1,
        unit: itemForm.unit || "kg",
        expiry_date: itemForm.expiry_date,
        avg_daily_usage: parseFloat(itemForm.avg_daily_usage) || 1.0,
        storage_location: itemForm.storage_location || "",
      });

      setSaveSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        handleModalClose();
      }, 1200);
    } catch (err) {
      setErrorMsg(err.message || "Failed to save item to inventory.");
    } finally {
      setSaving(false);
    }
  };

  const handleModalClose = async () => {
    await stopScanner();
    resetState();
    onClose();
  };

  const handleScanAnother = () => {
    resetState();
    setActiveTab("camera");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white border border-wheat-200 rounded-xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-wheat-200 bg-wheat-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-md bg-forest-800 text-wheat-50">
                <Scan className="w-4 h-4" />
              </span>
              <h2 className="font-display text-xl text-forest-800">Scan Barcode / QR</h2>
            </div>
            <p className="text-xs text-forest-800/60 mt-1">
              Quickly scan packaged items or QR codes to add to your inventory ledger.
            </p>
          </div>
          <button
            onClick={handleModalClose}
            className="p-2 text-forest-800/50 hover:text-forest-800 rounded-lg hover:bg-wheat-200/50 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[78vh] overflow-y-auto">
          {/* Mode Switcher Tabs (when code not yet confirmed) */}
          {!scannedCode && (
            <div className="grid grid-cols-2 gap-2 p-1 bg-wheat-100/70 rounded-lg border border-wheat-200">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("camera");
                  setCameraError("");
                }}
                className={`flex items-center justify-center gap-2 py-2 rounded-md text-xs font-medium transition-all ${
                  activeTab === "camera"
                    ? "bg-white text-forest-800 shadow-sm"
                    : "text-forest-800/60 hover:text-forest-800"
                }`}
              >
                <Camera className="w-4 h-4" />
                Live Camera
              </button>
              <button
                type="button"
                onClick={async () => {
                  await stopScanner();
                  setActiveTab("manual");
                }}
                className={`flex items-center justify-center gap-2 py-2 rounded-md text-xs font-medium transition-all ${
                  activeTab === "manual"
                    ? "bg-white text-forest-800 shadow-sm"
                    : "text-forest-800/60 hover:text-forest-800"
                }`}
              >
                <Keyboard className="w-4 h-4" />
                Manual Barcode
              </button>
            </div>
          )}

          {/* 1. Camera Viewfinder View */}
          {!scannedCode && activeTab === "camera" && (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden bg-forest-900 border border-forest-800 flex flex-col items-center justify-center min-h-[280px]">
                <div id={readerElementId} className="w-full max-w-sm overflow-hidden" />

                {/* Overlay instructions */}
                <div className="p-3 bg-forest-900/90 text-center w-full border-t border-forest-800">
                  <p className="text-xs font-mono text-wheat-100/80">
                    Align barcode or QR code inside the box to scan
                  </p>
                </div>
              </div>

              {cameraError && (
                <div className="p-4 rounded-lg bg-tomato-500/10 border border-tomato-500/30 text-tomato-600 space-y-3">
                  <div className="flex items-start gap-2 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{cameraError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await stopScanner();
                      setActiveTab("manual");
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-tomato-500 text-white rounded-md text-xs font-medium hover:bg-tomato-600 transition-colors shadow-sm"
                  >
                    <Keyboard className="w-3.5 h-3.5" />
                    Switch to Manual Entry
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 2. Manual Barcode Entry View */}
          {!scannedCode && activeTab === "manual" && (
            <form onSubmit={handleManualCodeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1">
                  Barcode / QR Digits
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. 011110417004"
                    value={scannedCode}
                    onChange={(e) => setScannedCode(e.target.value)}
                    className="flex-1 border border-wheat-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-forest-400"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-forest-800 text-wheat-50 rounded-lg text-sm font-medium hover:bg-forest-600 transition-colors shrink-0"
                  >
                    Lookup
                  </button>
                </div>
              </div>

              {/* Sample test barcodes helper */}
              <div className="p-3.5 rounded-lg bg-wheat-50 border border-wheat-200">
                <p className="text-xs font-medium text-forest-800 mb-2">Test with quick samples:</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(PRODUCT_BARCODE_LOOKUP).slice(0, 5).map(([code, p]) => (
                    <button
                      type="button"
                      key={code}
                      onClick={() => {
                        setScannedCode(code);
                        resolveCodeInformation(code);
                      }}
                      className="text-[11px] font-mono px-2 py-1 bg-white border border-wheat-200 rounded text-forest-800 hover:border-forest-600 transition-colors"
                    >
                      {p.name.split(" ")[0]} ({code.slice(0, 6)}...)
                    </button>
                  ))}
                </div>
              </div>
            </form>
          )}

          {/* 3. Product Confirmation & Details Form (shown after code detected) */}
          {scannedCode && (
            <form onSubmit={handleSaveItem} className="space-y-5 animate-in fade-in duration-200">
              {/* Detected barcode banner */}
              <div className="flex items-center justify-between p-3.5 rounded-lg bg-forest-50 border border-forest-100">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-md bg-forest-600 text-white">
                    {isSmartMatched ? <Sparkles className="w-3.5 h-3.5" /> : <Scan className="w-3.5 h-3.5" />}
                  </span>
                  <div>
                    <p className="font-mono text-xs font-semibold text-forest-800">
                      Code: {scannedCode}
                    </p>
                    <p className="text-[11px] text-forest-800/60">
                      {isSmartMatched ? "✨ Product auto-matched from catalog" : "Custom barcode detected"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleScanAnother}
                  className="inline-flex items-center gap-1 text-xs text-forest-600 hover:text-forest-800 font-medium"
                >
                  <RefreshCw className="w-3 h-3" />
                  Rescan
                </button>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={itemForm.name}
                    onChange={handleFormChange("name")}
                    className="w-full border border-wheat-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1">
                    Category *
                  </label>
                  <select
                    value={itemForm.category}
                    onChange={handleFormChange("category")}
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
                    Quantity & Unit *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      required
                      value={itemForm.quantity}
                      onChange={handleFormChange("quantity")}
                      className="w-24 border border-wheat-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-forest-400"
                    />
                    <input
                      type="text"
                      required
                      placeholder="e.g. kg, liter, packs"
                      value={itemForm.unit}
                      onChange={handleFormChange("unit")}
                      className="flex-1 border border-wheat-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1">
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={itemForm.expiry_date}
                    onChange={handleFormChange("expiry_date")}
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
                    value={itemForm.avg_daily_usage}
                    onChange={handleFormChange("avg_daily_usage")}
                    className="w-full border border-wheat-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-forest-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1">
                    Storage Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Refrigerator 2, Pantry Shelf B"
                    value={itemForm.storage_location}
                    onChange={handleFormChange("storage_location")}
                    className="w-full border border-wheat-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400"
                  />
                </div>
              </div>

              {/* Status Message */}
              {errorMsg && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-tomato-500/10 border border-tomato-500/30 text-tomato-600 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {saveSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Item added to inventory ledger!</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-wheat-200">
                <button
                  type="button"
                  onClick={handleScanAnother}
                  className="px-4 py-2 text-sm font-medium text-forest-800 hover:bg-wheat-200/50 rounded-lg transition-colors"
                >
                  Scan Another
                </button>
                <button
                  type="submit"
                  disabled={saving || saveSuccess}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium bg-forest-800 text-wheat-50 rounded-lg hover:bg-forest-600 disabled:opacity-50 transition-all shadow-sm"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Save to Inventory</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
