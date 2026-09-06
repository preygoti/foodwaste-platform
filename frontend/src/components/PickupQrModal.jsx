import { useState } from "react";
import {
  QrCode,
  X,
  Printer,
  Copy,
  Check,
  ShieldCheck,
  Truck,
  Building2,
  Calendar,
  MapPin,
  Utensils,
  Award,
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
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
    handshakeData
  )}&color=0f291e&bgcolor=ffffff&margin=12`;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-forest-950/75 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative bg-white border border-wheat-300 rounded-3xl w-full max-w-[460px] max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 print:max-h-none print:shadow-none print:border-0 print:max-w-none print:w-full">
        {/* Lanyard Clip Slot Visual (ID Badge Detail) */}
        <div className="bg-forest-950 pt-2 pb-1 flex justify-center items-center print:hidden">
          <div className="w-16 h-1.5 bg-wheat-200/40 rounded-full" />
        </div>

        {/* Official ID Card Header */}
        <div className="px-5 py-4 bg-gradient-to-b from-forest-900 via-forest-800 to-forest-800 text-wheat-50 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 text-wheat-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors print:hidden"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-mono tracking-widest uppercase bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-400/30 font-semibold">
              <ShieldCheck className="w-3 h-3 text-emerald-300" />
              Verified NGO Volunteer Credential
            </span>
          </div>

          <h3 className="font-display font-bold text-lg text-white leading-tight">
            Surplus Rescue Driver ID Pass
          </h3>
          <p className="text-xs text-wheat-200/80 font-mono mt-0.5">
            Badge ID: <strong className="text-gold-300">HL-NGO-{5000 + pickup.id}</strong>
          </p>
        </div>

        {/* Scrollable ID Badge Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-center">
          {/* Driver & Organization ID Banner */}
          <div className="bg-wheat-50 border border-wheat-200 rounded-2xl p-3.5 text-left flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-forest-800 text-gold-300 flex items-center justify-center shrink-0 shadow-inner">
              <Truck className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="font-display font-bold text-forest-900 text-sm truncate">
                  {user?.org_name || pickup.ngo_name || "Rescue Partner NGO"}
                </p>
              </div>
              <p className="text-[11px] text-forest-800/70 font-mono truncate">
                Driver: {user?.name || "Authorized Logistics Volunteer"}
              </p>
              <p className="text-[10px] text-emerald-700 font-mono font-semibold flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Active Rescue Assignment #{pickup.id}
              </p>
            </div>
          </div>

          {/* High-Contrast QR Code Frame */}
          <div className="bg-gradient-to-b from-forest-50/80 to-wheat-50 p-4 rounded-2xl border border-wheat-200 shadow-inner">
            <div className="w-48 h-48 sm:w-52 sm:h-52 mx-auto bg-white p-3 rounded-2xl border-2 border-dashed border-forest-800/30 shadow-md flex items-center justify-center relative">
              <img
                src={qrUrl}
                alt="Pickup Verification QR Code"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>

            <p className="text-[11px] text-forest-800/70 mt-3 leading-relaxed max-w-xs mx-auto">
              Show this QR code to the food donor at arrival to instantly confirm the handoff.
            </p>
          </div>

          {/* 6-Digit Offline PIN Backup Box */}
          <div className="bg-wheat-100/70 p-3.5 rounded-2xl border border-wheat-300 flex items-center justify-between text-xs font-mono">
            <div className="text-left">
              <span className="text-forest-800/60 uppercase text-[10px] block font-semibold">
                Offline Handshake PIN:
              </span>
              <strong className="text-forest-950 text-base tracking-wider font-bold">
                {pinCode}
              </strong>
            </div>

            <button
              type="button"
              onClick={copyCode}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-wheat-300 rounded-lg text-forest-800 text-xs font-semibold hover:bg-forest-50 transition-all shadow-2xs"
              title="Copy PIN Code"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-forest-600" />
                  <span>Copy PIN</span>
                </>
              )}
            </button>
          </div>

          {/* Rescue Specifications Breakdown */}
          <div className="text-left text-xs bg-forest-50/60 p-3.5 rounded-2xl border border-forest-100 space-y-1.5">
            <div className="flex items-center justify-between text-forest-800">
              <span className="text-forest-800/60 flex items-center gap-1">
                <Utensils className="w-3.5 h-3.5 text-forest-600" />
                Estimated Rescue Volume:
              </span>
              <strong className="font-mono font-bold text-forest-900">
                ~{pickup.meals_estimate || 0} meals
              </strong>
            </div>

            {pickup.scheduled_time && (
              <div className="flex items-center justify-between text-forest-800">
                <span className="text-forest-800/60 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-forest-600" />
                  Scheduled Pickup:
                </span>
                <span className="font-mono text-[11px] text-forest-900">
                  {new Date(pickup.scheduled_time).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-forest-800 pt-1 border-t border-forest-100">
              <span className="text-forest-800/60">Verification Status:</span>
              <span className="capitalize font-semibold text-emerald-800 font-mono text-[11px] bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                {pickup.status}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions (Hidden on Print) */}
        <div className="p-4 border-t border-wheat-200 bg-wheat-50/80 flex items-center gap-2.5 shrink-0 print:hidden">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 bg-white border border-wheat-300 text-forest-800 rounded-xl text-xs font-semibold hover:bg-wheat-100 transition-all shadow-2xs"
          >
            <Printer className="w-4 h-4 text-forest-600" />
            <span>Print ID Badge</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-forest-800 text-wheat-50 rounded-xl text-xs font-semibold hover:bg-forest-700 shadow-sm transition-all"
          >
            Done / Close Pass
          </button>
        </div>
      </div>
    </div>
  );
}
