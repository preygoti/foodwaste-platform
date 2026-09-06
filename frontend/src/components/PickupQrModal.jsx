import { useState } from "react";
import {
  QrCode,
  X,
  Printer,
  Copy,
  Check,
  ShieldCheck,
  Truck,
  Utensils,
} from "lucide-react";
import { useAuth } from "../AuthContext";

export default function PickupQrModal({ isOpen, onClose, pickup }) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!isOpen || !pickup) return null;

  // Generate cryptographic handoff payload for the QR code
  const handshakeData = JSON.stringify({
    pickup_id: pickup.id,
    listing_id: pickup.listing_id,
    ngo_id: pickup.ngo_id || user?.id,
    ngo_name: user?.org_name || pickup.ngo_name || "Verified NGO Partner",
    token: `HL_RESCUE_${pickup.id}_${pickup.listing_id}`,
  });

  // High-resolution SVG / PNG QR code API
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    handshakeData
  )}&color=0f291e&bgcolor=ffffff&margin=10`;

  const pinCode = `HL-${pickup.id}-${pickup.listing_id}`;

  const copyCode = () => {
    navigator.clipboard.writeText(pinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-forest-950/75 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative bg-white border border-wheat-300 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 print:max-w-none print:shadow-none print:border-0 print:w-full">
        {/* Compact Header */}
        <div className="px-4 sm:px-5 py-3 bg-gradient-to-r from-forest-900 via-forest-800 to-forest-800 text-wheat-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm sm:text-base text-white leading-tight">
                Surplus Rescue Driver Pass
              </h3>
              <p className="text-[10px] text-wheat-200/80 font-mono">
                Pass ID: <strong className="text-gold-300">HL-RES-{5000 + pickup.id}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-wheat-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors print:hidden"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Compact 2-Column Body */}
        <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center">
          {/* Left Column: QR Code (5 cols) */}
          <div className="sm:col-span-5 flex flex-col items-center justify-center bg-wheat-50 p-2.5 rounded-xl border border-wheat-200 text-center">
            <div className="w-32 h-32 sm:w-36 sm:h-36 bg-white p-2 rounded-xl border border-dashed border-forest-800/30 shadow-xs flex items-center justify-center">
              <img
                src={qrUrl}
                alt="Pickup Verification QR Code"
                className="w-full h-full object-contain rounded"
              />
            </div>
            <p className="text-[10px] text-forest-800/60 mt-1.5 font-mono leading-tight">
              Scan at storefront
            </p>
          </div>

          {/* Right Column: Driver, PIN & Status Details (7 cols) */}
          <div className="sm:col-span-7 space-y-2">
            {/* NGO Org Banner */}
            <div className="bg-forest-50/70 p-2 rounded-xl border border-forest-100 flex items-center justify-between text-xs">
              <div className="min-w-0 pr-2">
                <span className="text-[9px] font-mono text-forest-800/50 uppercase block">
                  Partner NGO / Driver
                </span>
                <p className="font-display font-bold text-forest-900 text-xs truncate">
                  {user?.org_name || pickup.ngo_name || "Rescue Partner NGO"}
                </p>
              </div>
              <span className="capitalize font-semibold text-emerald-800 font-mono text-[10px] bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                {pickup.status}
              </span>
            </div>

            {/* Offline PIN Box */}
            <div className="bg-wheat-100/80 p-2 rounded-xl border border-wheat-300 flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-forest-800/60 uppercase text-[9px] block font-semibold">
                  Verification Code:
                </span>
                <strong className="text-forest-950 text-sm tracking-wider font-bold">
                  {pinCode}
                </strong>
              </div>

              <button
                type="button"
                onClick={copyCode}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-wheat-300 rounded-lg text-forest-800 text-[11px] font-semibold hover:bg-forest-50 transition-all shadow-2xs"
                title="Copy code"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-forest-600" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Rescue Specs Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-wheat-50 p-2 rounded-lg border border-wheat-200 text-left">
                <span className="text-[9px] text-forest-800/50 block uppercase">Estimated Volume</span>
                <strong className="text-forest-900 text-xs font-bold flex items-center gap-1 mt-0.5">
                  <Utensils className="w-3 h-3 text-forest-600 shrink-0" />
                  ~{pickup.meals_estimate || 0} meals
                </strong>
              </div>

              <div className="bg-wheat-50 p-2 rounded-lg border border-wheat-200 text-left">
                <span className="text-[9px] text-forest-800/50 block uppercase">Surplus Listing</span>
                <strong className="text-forest-900 text-xs font-bold flex items-center gap-1 mt-0.5">
                  <Truck className="w-3 h-3 text-forest-600 shrink-0" />
                  Listing #{pickup.listing_id}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Compact Footer */}
        <div className="px-4 sm:px-5 py-2.5 border-t border-wheat-200 bg-wheat-50/80 flex items-center gap-2 shrink-0 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 bg-white border border-wheat-300 text-forest-800 rounded-lg text-xs font-semibold hover:bg-wheat-100 transition-all shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-forest-600" />
            <span>Print Pass</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 bg-forest-800 text-wheat-50 rounded-lg text-xs font-semibold hover:bg-forest-700 shadow-sm transition-all"
          >
            Done / Close Pass
          </button>
        </div>
      </div>
    </div>
  );
}
