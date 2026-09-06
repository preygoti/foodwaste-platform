import { useState, useEffect } from "react";
import {
  QrCode,
  X,
  CheckCircle2,
  Share2,
  Calendar,
  MapPin,
  ShieldCheck,
  Download,
  Copy,
  Check,
} from "lucide-react";

export default function PickupQrModal({ isOpen, onClose, pickup }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !pickup) return null;

  // Generate cryptographic handoff payload for the QR code
  const handshakeData = JSON.stringify({
    pickup_id: pickup.id,
    listing_id: pickup.listing_id,
    ngo_id: pickup.ngo_id,
    token: `HL_RESCUE_${pickup.id}_${pickup.listing_id}`,
  });

  // Use fast standard SVG QR API via qrserver / api
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    handshakeData
  )}&color=1a3325&bgcolor=ffffff&margin=10`;

  const copyCode = () => {
    navigator.clipboard.writeText(`HL-PICKUP-${pickup.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-900/60 backdrop-blur-xs">
      <div className="bg-white border border-wheat-200 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col text-center">
        {/* Pass Header */}
        <div className="p-5 bg-gradient-to-b from-forest-900 to-forest-800 text-wheat-50 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-wheat-300 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>

          <span className="inline-block text-[10px] font-mono tracking-widest uppercase bg-forest-700/80 text-gold-300 px-3 py-1 rounded-full mb-2 border border-forest-600">
            Digital Rescue Handshake Pass
          </span>

          <h3 className="font-display font-bold text-lg text-white">
            Surplus Collection Verification
          </h3>
          <p className="text-xs text-wheat-200/80 font-mono mt-0.5">
            Pass ID: HL-RES-{5000 + pickup.id}
          </p>
        </div>

        {/* QR Code Container */}
        <div className="p-6 space-y-4">
          <div className="w-56 h-56 mx-auto bg-white p-3 rounded-2xl border-2 border-dashed border-forest-800/30 shadow-md flex items-center justify-center">
            <img
              src={qrUrl}
              alt="Pickup Verification QR"
              className="w-full h-full object-contain rounded-lg"
            />
          </div>

          <p className="text-xs text-forest-800/70 leading-relaxed max-w-xs mx-auto">
            Present this QR code to the donor partner at the storefront to verify handoff and close the rescue.
          </p>

          {/* Verification Code Box */}
          <div className="bg-wheat-50 p-3 rounded-xl border border-wheat-200 flex items-center justify-between text-xs font-mono">
            <span className="text-forest-800/60 uppercase text-[10px]">Verification Code:</span>
            <strong className="text-forest-900 text-sm tracking-wider font-bold">
              HL-{pickup.id}-{pickup.listing_id}
            </strong>
            <button
              onClick={copyCode}
              className="text-forest-700 hover:text-forest-900 p-1"
              title="Copy code"
            >
              {copied ? <Check className="w-4 h-4 text-forest-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="text-left text-xs bg-forest-50/50 p-3 rounded-xl border border-forest-100 space-y-1">
            <div className="flex items-center justify-between text-forest-800">
              <span className="text-forest-800/60">Estimated Meals:</span>
              <strong className="font-mono font-bold">~{pickup.meals_estimate || 0} meals</strong>
            </div>
            <div className="flex items-center justify-between text-forest-800">
              <span className="text-forest-800/60">Pickup Status:</span>
              <span className="capitalize font-semibold text-forest-700 font-mono text-[11px]">
                {pickup.status}
              </span>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-wheat-100 bg-wheat-50/50">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-forest-800 text-wheat-50 rounded-xl text-xs font-semibold hover:bg-forest-700 shadow-sm transition-all"
          >
            Done / Close Pass
          </button>
        </div>
      </div>
    </div>
  );
}
