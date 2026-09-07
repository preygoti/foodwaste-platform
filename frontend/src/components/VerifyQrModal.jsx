import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  Scan,
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  Check,
  Flame,
  Layers,
} from "lucide-react";
import { api } from "../api";

export default function VerifyQrModal({ isOpen, onClose, onVerified }) {
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [error, setError] = useState("");
  const scannerRef = useRef(null);

  useEffect(() => {
    if (!isOpen || successData) return;

    let html5QrCode = null;
    const scannerId = "handshake-qr-reader";

    // Small delay to ensure DOM element exists
    const timer = setTimeout(() => {
      try {
        html5QrCode = new Html5Qrcode(scannerId);
        scannerRef.current = html5QrCode;

        html5QrCode
          .start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 220, height: 220 } },
            (decodedText) => {
              handleQrScanSuccess(decodedText);
            },
            (errorMessage) => {
              // scanning frame ignore
            }
          )
          .then(() => setScanning(true))
          .catch((err) => {
            console.warn("Camera start failed, fallback to manual code entry:", err);
            setScanning(false);
          });
      } catch (e) {
        console.warn("Html5Qrcode init error:", e);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().then(() => scannerRef.current.clear());
        } catch (e) {}
        scannerRef.current = null;
      }
    };
  }, [isOpen, successData]);

  if (!isOpen) return null;

  function extractVerificationDetails(input) {
    if (!input) return { code: "", pickupId: null };
    const str = String(input).trim();

    // 1. JSON payload from QR
    if (str.startsWith("{") && str.endsWith("}")) {
      try {
        const parsed = JSON.parse(str);
        const code = parsed.verification_code || parsed.code || "";
        const pickupId = parsed.pickup_id ? parseInt(parsed.pickup_id) : null;
        return { code: String(code).trim(), pickupId };
      } catch (_) {}
    }

    // 2. Extract 6-digit numeric sequence if present
    const sixDigitsMatch = str.match(/\b\d{6}\b/);
    if (sixDigitsMatch) {
      return { code: sixDigitsMatch[0], pickupId: null };
    }

    // 3. Extract any digits
    const digitsOnly = str.replace(/\D/g, "");
    if (digitsOnly.length >= 6) {
      return { code: digitsOnly.slice(0, 6), pickupId: null };
    }

    // 4. Legacy HL-RES-5002 or HL-2
    if (/HL[-_]RES[-_](\d+)/i.test(str)) {
      const match = str.match(/HL[-_]RES[-_](\d+)/i);
      const num = parseInt(match[1]);
      return { code: str, pickupId: num > 5000 ? num - 5000 : num };
    }

    return { code: str, pickupId: null };
  }

  const handleQrScanSuccess = async (qrText) => {
    const { code, pickupId } = extractVerificationDetails(qrText);

    if (!code && !pickupId) {
      setError("Invalid QR Code payload. Please scan a valid Surplus Rescue QR pass or enter the 6-digit PIN.");
      return;
    }

    // Stop scanner
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (e) {}
    }

    submitVerification(code || qrText, pickupId);
  };

  const submitVerification = async (code, pickupId = null) => {
    setError("");
    setVerifying(true);
    try {
      const res = await api.verifyPickupByCode(code, pickupId);
      setSuccessData(res);
      if (onVerified) onVerified(res);
    } catch (err) {
      setError(err.message || "Invalid 6-digit verification code. Please check the Driver QR Pass.");
    } finally {
      setVerifying(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const trimmed = manualCode.trim();
    if (!trimmed) return;

    const { code, pickupId } = extractVerificationDetails(trimmed);
    if (!code && !pickupId) {
      setError("Please enter a valid 6-digit verification code (e.g. 582914).");
      return;
    }
    submitVerification(code || trimmed, pickupId);
  };

  const handleDone = () => {
    setSuccessData(null);
    setManualCode("");
    setError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-wheat-200 rounded-xl sm:rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-wheat-100 flex items-center justify-between bg-wheat-50/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-forest-800 text-gold-400 flex items-center justify-center shadow-2xs shrink-0">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-forest-800 text-base sm:text-lg">
                Verify Pickup Handshake
              </h3>
              <p className="text-[10px] sm:text-[11px] text-forest-800/60 font-mono">
                Scan Driver's QR Pass or enter their 6-digit PIN
              </p>
            </div>
          </div>
          <button
            onClick={handleDone}
            className="text-forest-800/40 hover:text-forest-800 p-1.5 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-tomato-500/10 border border-tomato-500/30 text-tomato-600 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successData ? (
            /* Success Verification Animation Screen */
            <div className="text-center py-4 space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="w-16 h-16 rounded-full bg-forest-500/10 text-forest-600 flex items-center justify-center mx-auto border-2 border-forest-600/30 animate-bounce">
                <CheckCircle2 className="w-10 h-10 text-forest-600" />
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-forest-700 bg-forest-100 px-3 py-1 rounded-full font-bold">
                  Handshake Verified ✓
                </span>
                <h3 className="font-display font-bold text-xl text-forest-800 mt-2">
                  Donation Successfully Completed!
                </h3>
                <p className="text-xs text-forest-800/70 mt-1">
                  Surplus transferred to <strong>{successData.ngo_name}</strong>
                </p>
                {successData.verification_code && (
                  <p className="text-[11px] font-mono text-emerald-800 mt-1">
                    Verified PIN: <strong className="font-bold tracking-wider">{successData.verification_code}</strong>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-wheat-50 p-3 rounded-xl border border-wheat-200">
                <div className="bg-white p-2.5 rounded-lg border border-wheat-200/80">
                  <span className="text-[10px] text-forest-800/50 block">FOOD RESCUED</span>
                  <strong className="text-forest-800 font-bold text-sm">
                    {successData.quantity} {successData.unit}
                  </strong>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-wheat-200/80">
                  <span className="text-[10px] text-forest-800/50 block">CO₂ AVOIDED</span>
                  <strong className="text-forest-800 font-bold text-sm">
                    {successData.co2_saved_kg} kg
                  </strong>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDone}
                className="w-full py-3 bg-forest-800 text-wheat-50 rounded-xl text-xs sm:text-sm font-semibold hover:bg-forest-700 shadow-sm transition-all cursor-pointer"
              >
                Close &amp; Update Ledger
              </button>
            </div>
          ) : (
            /* Scanner & Manual Input Screen */
            <div className="space-y-4">
              <div className="relative aspect-square max-w-[280px] mx-auto rounded-2xl overflow-hidden bg-black border border-wheat-200 shadow-inner">
                <div id="handshake-qr-reader" className="w-full h-full" />
                {verifying && (
                  <div className="absolute inset-0 bg-forest-900/80 backdrop-blur-xs flex flex-col items-center justify-center text-wheat-50 space-y-2 z-10">
                    <RefreshCw className="w-8 h-8 animate-spin text-gold-400" />
                    <p className="text-xs font-mono font-semibold">
                      Verifying 6-digit handshake PIN...
                    </p>
                  </div>
                )}
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-wheat-200"></div>
                <span className="flex-shrink mx-3 text-[10px] font-mono uppercase text-forest-800/50">
                  Or enter 6-digit verification code
                </span>
                <div className="flex-grow border-t border-wheat-200"></div>
              </div>

              {/* Manual Code Input Form */}
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter 6-digit PIN (e.g. 582914)"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="flex-1 text-xs border border-wheat-200 rounded-xl px-3 py-2 bg-wheat-50/40 focus:outline-none focus:ring-2 focus:ring-forest-400 font-mono tracking-wider"
                  maxLength={12}
                />
                <button
                  type="submit"
                  disabled={verifying || !manualCode.trim()}
                  className="px-4 py-2 bg-forest-800 text-wheat-50 rounded-xl text-xs font-semibold hover:bg-forest-700 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
                >
                  Verify
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
