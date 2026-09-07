import { useState, useRef, useEffect } from "react";
import {
  Camera,
  Upload,
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Calendar,
  Layers,
  ThermometerSnowflake,
  HelpCircle,
  Clock,
} from "lucide-react";
import { api } from "../api";

export default function AiVisionScannerModal({ isOpen, onClose, onAutofill }) {
  const [mode, setMode] = useState("camera"); // "camera" | "upload"
  const [imagePreview, setImagePreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [itemHint, setItemHint] = useState("");
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
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
      runAiInspection(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const runAiInspection = async (base64Img) => {
    setError("");
    setAnalyzing(true);
    setResult(null);

    try {
      const data = await api.inspectFreshness(base64Img, itemHint);
      setResult(data);
    } catch (err) {
      setError(err.message || "Failed to analyze food image with AI vision.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setImagePreview(null);
    setResult(null);
    setError("");
  };

  const handleApplyAutofill = () => {
    if (!result || !onAutofill) return;
    onAutofill({
      name: result.detected_name,
      category: result.detected_category,
      quantity: String(result.estimated_quantity),
      unit: result.unit,
      expiry_date: result.estimated_expiry_date,
      storage_location: result.suggested_storage,
      avg_daily_usage: "2",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-wheat-200 rounded-xl sm:rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh] my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-wheat-100 flex items-center justify-between bg-wheat-50/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-forest-800 text-gold-400 flex items-center justify-center shadow-2xs shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-forest-800 text-base sm:text-lg">
                AI Freshness &amp; Spoilage Inspector
              </h3>
              <p className="text-[10px] sm:text-[11px] text-forest-800/60 font-mono">
                Computer Vision Food Quality Grading &amp; Shelf-Life Predictor
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-forest-800/40 hover:text-forest-800 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-tomato-500/10 border border-tomato-500/30 text-tomato-600 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Item Hint Input (Optional) */}
          {!imagePreview && (
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-forest-800/70 mb-1">
                Optional Food Type Hint (e.g. "Tomatoes", "Bananas", "Milk", "Curry")
              </label>
              <input
                type="text"
                placeholder="Leave blank for auto-detection or type hint..."
                value={itemHint}
                onChange={(e) => setItemHint(e.target.value)}
                className="w-full text-xs sm:text-sm border border-wheat-200 rounded-xl px-3 py-2 bg-wheat-50/30 focus:outline-none focus:ring-2 focus:ring-forest-400"
              />
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
                  <span>Live Camera</span>
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
                  <span>Upload Photo</span>
                </button>
              </div>

              {/* Camera Preview */}
              {mode === "camera" && (
                <div className="relative aspect-video rounded-xl overflow-hidden bg-black flex items-center justify-center border border-wheat-200">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Bounding Box Scanner Overlay */}
                  <div className="absolute inset-8 border-2 border-dashed border-gold-400/80 rounded-xl pointer-events-none flex items-center justify-center animate-pulse">
                    <span className="bg-forest-900/80 text-wheat-100 text-[10px] font-mono px-2 py-0.5 rounded backdrop-blur-xs">
                      Align food in box
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCapture}
                    className="absolute bottom-3 bg-white text-forest-900 px-5 py-2 rounded-full font-semibold text-xs shadow-lg flex items-center gap-1.5 hover:bg-wheat-100 active:scale-95 transition-all"
                  >
                    <Camera className="w-4 h-4 text-forest-700" />
                    <span>Capture Snapshot</span>
                  </button>
                </div>
              )}

              {/* File Upload Dropzone */}
              {mode === "upload" && (
                <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-wheat-300 rounded-xl bg-wheat-50/40 hover:bg-wheat-100/50 cursor-pointer transition-all">
                  <Upload className="w-8 h-8 text-forest-600 mb-2" />
                  <span className="text-xs font-semibold text-forest-800">
                    Click to select food image
                  </span>
                  <span className="text-[11px] text-forest-800/50 font-mono mt-1">
                    PNG, JPG, WEBP up to 10MB
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
              <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-wheat-200">
                <img
                  src={imagePreview}
                  alt="Captured food item"
                  className="w-full h-full object-cover"
                />
                {analyzing && (
                  <div className="absolute inset-0 bg-forest-900/70 backdrop-blur-xs flex flex-col items-center justify-center text-wheat-50 space-y-2">
                    <RefreshCw className="w-8 h-8 animate-spin text-gold-400" />
                    <p className="text-xs font-mono font-semibold tracking-wider">
                      Analyzing pixel texture &amp; freshness grade...
                    </p>
                  </div>
                )}
              </div>

              {/* AI Analysis Cards */}
              {result && (
                <div className="space-y-3 animate-in fade-in duration-300">
                  <div className="p-3.5 rounded-xl bg-forest-50 border border-forest-200/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-forest-800/60 block">
                        Detected Item &amp; Category
                      </span>
                      <h4 className="font-display text-base font-bold text-forest-800">
                        {result.detected_name}
                      </h4>
                      <span className="text-xs text-forest-700 capitalize font-medium">
                        Category: {result.detected_category} &bull; Est. Qty: {result.estimated_quantity} {result.unit}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-mono uppercase text-forest-800/60 block">
                        Freshness Score
                      </span>
                      <div className="inline-flex items-center gap-1 font-mono text-lg font-bold text-forest-800">
                        <span>{result.freshness_score}%</span>
                      </div>
                      <span className={`block text-[10px] font-bold font-mono px-2 py-0.5 rounded-full mt-0.5 ${
                        result.freshness_score >= 85
                          ? "bg-forest-200 text-forest-900"
                          : result.freshness_score >= 70
                          ? "bg-amber-100 text-amber-900"
                          : "bg-rose-100 text-rose-900"
                      }`}>
                        {result.freshness_grade}
                      </span>
                    </div>
                  </div>

                  {/* AI Shelf Life & Storage Advice */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                    <div className="bg-wheat-50 p-2.5 rounded-xl border border-wheat-200/80">
                      <span className="text-[10px] text-forest-800/50 uppercase block flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-forest-600" />
                        <span>Predicted Expiry</span>
                      </span>
                      <strong className="text-forest-800 font-bold text-xs mt-0.5 block">
                        {result.estimated_expiry_date} ({result.estimated_days_to_expiry}d left)
                      </strong>
                    </div>

                    <div className="bg-wheat-50 p-2.5 rounded-xl border border-wheat-200/80">
                      <span className="text-[10px] text-forest-800/50 uppercase block flex items-center gap-1">
                        <ThermometerSnowflake className="w-3 h-3 text-forest-600" />
                        <span>Storage Advice</span>
                      </span>
                      <span className="text-forest-800 text-[11px] font-medium truncate block mt-0.5" title={result.suggested_storage}>
                        {result.suggested_storage}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-forest-800/70 bg-wheat-100/50 p-2.5 rounded-xl border border-wheat-200/60 leading-relaxed italic">
                    &ldquo;{result.quality_notes}&rdquo;
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-wheat-100 bg-wheat-50/30 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          {imagePreview ? (
            <>
              <button
                type="button"
                onClick={handleReset}
                className="w-full sm:w-auto px-3.5 py-2.5 sm:py-2 border border-wheat-200 rounded-xl text-xs font-medium text-forest-800 hover:bg-wheat-100 text-center"
              >
                Scan Another
              </button>

              {result && (
                <button
                  type="button"
                  onClick={handleApplyAutofill}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-forest-800 text-wheat-50 rounded-xl text-xs sm:text-sm font-semibold hover:bg-forest-700 shadow-sm transition-all active:scale-[0.98]"
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
              className="w-full py-2.5 border border-wheat-200 rounded-xl text-xs font-semibold text-forest-800 hover:bg-wheat-100 text-center"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
