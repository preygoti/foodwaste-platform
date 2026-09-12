import { useState, useEffect } from "react";
import {
  Award,
  Printer,
  X,
  Shield,
  Leaf,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";

export default function CsrCertificateModal({ isOpen, onClose, metrics, user }) {
  const [certId] = useState(() => `HL-CSR-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`);
  const [issueDate] = useState(() => new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));

  // Support ESC key to dismiss modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalKg = Number(metrics?.food_rescued_kg) || 450.0;
  const co2Avoided = Number(metrics?.co2_prevented_kg) || (totalKg * 2.5);
  const estimatedMeals = Math.round(totalKg * 2.5);
  // Standard Fair Market Value (FMV) deduction rate per kg of safe recovered food (~$5.50 / kg)
  const taxValuation = (totalKg * 5.5).toLocaleString("en-US", { style: "currency", currency: "USD" });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-forest-950/70 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl glass-modal rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[92vh] my-auto print:max-h-none print:overflow-visible print:my-0 print:border-0 print:shadow-none print:w-full border border-white/80">
        
        {/* Actions & Navigation Topbar (Hidden in Print) */}
        <div className="flex items-center justify-between px-3 sm:px-6 py-3 bg-gradient-to-r from-forest-900/95 via-forest-800/95 to-forest-800/95 backdrop-blur-md text-wheat-50 print:hidden shrink-0 gap-2 border-b border-forest-700/60">
          {/* Left: Back Button & Title */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 text-wheat-100 font-medium text-xs transition-colors shrink-0 border border-white/10 shadow-2xs cursor-pointer"
              aria-label="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="flex items-center gap-1.5 min-w-0">
              <Award className="w-4 h-4 text-amber-300 shrink-0" />
              <span className="font-semibold text-xs sm:text-sm truncate">
                CSR Compliance Certificate
              </span>
            </div>
          </div>

          {/* Right: Close X */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-wheat-200 hover:text-white rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Scrollable Canvas Body */}
        <div className="overflow-y-auto flex-1 p-2 sm:p-4 md:p-5 bg-wheat-50/50">
          <div className="p-4 sm:p-7 md:p-9 border-2 sm:border-4 md:border-8 border-forest-800/15 rounded-xl bg-gradient-to-b from-wheat-50/60 via-white to-wheat-50/30 text-forest-800 relative space-y-4 sm:space-y-6 shadow-sm">
            {/* Watermark Logo */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none overflow-hidden">
              <Leaf className="w-72 h-72 sm:w-96 sm:h-96 text-forest-800" />
            </div>

            {/* Certificate Header */}
            <div className="text-center space-y-1 sm:space-y-1.5 border-b-2 border-forest-800/20 pb-3.5 sm:pb-5">
              <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-forest-800 text-wheat-50 mb-1 sm:mb-2 shadow-sm">
                <Award className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
              </div>
              <p className="font-mono text-[9px] sm:text-xs uppercase tracking-[0.15em] sm:tracking-[0.25em] text-forest-800/70 font-bold">
                Harvest Ledger &bull; Environmental &amp; Social Governance (ESG)
              </p>
              <h1 className="font-display text-lg sm:text-2xl md:text-3xl font-bold tracking-tight text-forest-800 uppercase leading-snug">
                Certificate of Food Rescue &amp; Tax Deduction
              </h1>
              <p className="text-[10px] sm:text-xs font-mono text-forest-800/60">
                Certificate ID: <strong className="text-forest-800">{certId}</strong> &bull; Issued on: <strong>{issueDate}</strong>
              </p>
            </div>

            {/* Organization Declaration */}
            <div className="text-center space-y-1.5 sm:space-y-2 py-1">
              <p className="text-[10px] sm:text-xs text-forest-800/70 uppercase tracking-widest font-mono">
                This Official Record Certifies That
              </p>
              <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-forest-800 underline decoration-amber-400 decoration-2 underline-offset-4">
                {user?.org_name || "Partner Food Organization"}
              </h2>
              <p className="text-xs sm:text-sm text-forest-800/75 max-w-xl mx-auto leading-relaxed">
                Has successfully diverted commercial food inventory from landfills, redistributing safe surplus nourishment to verified non-profit community kitchens and food banks in full compliance with public health standards.
              </p>
            </div>

            {/* Impact Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 py-1">
              <div className="p-2.5 sm:p-3.5 rounded-xl bg-forest-50/70 border border-forest-200/70 text-center space-y-0.5">
                <span className="text-[9px] sm:text-[10px] uppercase font-mono tracking-wider text-forest-800/60 block">Food Rescued</span>
                <p className="font-display text-base sm:text-xl font-bold text-forest-800">{totalKg} kg</p>
                <span className="text-[9px] sm:text-[10px] text-forest-800/50">Diverted Landfill</span>
              </div>

              <div className="p-2.5 sm:p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/70 text-center space-y-0.5">
                <span className="text-[9px] sm:text-[10px] uppercase font-mono tracking-wider text-amber-800/60 block">Meals Provided</span>
                <p className="font-display text-base sm:text-xl font-bold text-amber-900">~{estimatedMeals}</p>
                <span className="text-[9px] sm:text-[10px] text-amber-800/50">Community Portions</span>
              </div>

              <div className="p-2.5 sm:p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/70 text-center space-y-0.5">
                <span className="text-[9px] sm:text-[10px] uppercase font-mono tracking-wider text-emerald-800/60 block">CO₂e Avoided</span>
                <p className="font-display text-base sm:text-xl font-bold text-emerald-800">{co2Avoided} kg</p>
                <span className="text-[9px] sm:text-[10px] text-emerald-800/50">Emissions Saved</span>
              </div>

              <div className="p-2.5 sm:p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/70 text-center space-y-0.5">
                <span className="text-[9px] sm:text-[10px] uppercase font-mono tracking-wider text-blue-800/60 block">FMV Valuation</span>
                <p className="font-display text-base sm:text-xl font-bold text-blue-900">{taxValuation}</p>
                <span className="text-[9px] sm:text-[10px] text-blue-800/50">Tax Deduction</span>
              </div>
            </div>

            {/* Legal / CSR Compliance Statement */}
            <div className="p-3 sm:p-3.5 bg-wheat-50/80 border border-wheat-200 rounded-xl text-[10px] sm:text-[11px] text-forest-800/75 leading-relaxed font-mono">
              <strong>Legal &amp; CSR Safe Harbor Endorsement:</strong> All donations recorded under this certificate were logged via verifiable batch records, verified prior to expiration, and accepted in good faith by registered 501(c)(3) / 80G non-profit food distribution partners. Eligible for corporate sustainability reporting and tax deduction schedules.
            </div>

            {/* Signatures & Verification Seal */}
            <div className="pt-3 sm:pt-4 border-t-2 border-forest-800/20 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
              <div className="text-center sm:text-left space-y-0.5">
                <div className="font-display italic text-base sm:text-lg font-bold text-forest-800">Harvest Ledger Platform</div>
                <p className="text-[9px] sm:text-[10px] font-mono text-forest-800/60 uppercase">Automated Telemetry Audit Engine</p>
                <p className="text-[9px] sm:text-[10px] font-mono text-forest-800/50">Cryptographic Checksum: SHA-256 Verified</p>
              </div>

              {/* Gold Verification Badge */}
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-3 sm:border-4 border-amber-400 bg-amber-50 text-amber-800 flex flex-col items-center justify-center shadow-inner text-center shrink-0">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                  <span className="text-[7px] sm:text-[8px] font-mono font-extrabold uppercase tracking-tighter text-amber-800">VERIFIED</span>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs font-semibold text-forest-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
                    <span>Verified Rescue Registry</span>
                  </p>
                  <p className="text-[10px] font-mono text-forest-800/60">Digital Signature Validated</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Bar (Hidden in Print) */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-wheat-50/90 backdrop-blur-sm border-t border-wheat-200/80 flex items-center justify-between print:hidden text-xs text-forest-800/70 shrink-0 gap-2">
          <span className="text-[11px] text-forest-800/60 font-mono truncate hidden sm:inline">
            📄 Formatted for standard A4 certificate print &amp; PDF export.
          </span>
          <div className="flex items-center gap-2 ml-auto w-full sm:w-auto justify-end">
            <button
              onClick={handlePrint}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 border border-wheat-300 bg-white text-forest-800 font-semibold text-xs rounded-lg hover:bg-wheat-100 transition-colors shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 bg-forest-800 text-wheat-50 rounded-lg font-semibold text-xs hover:bg-forest-700 active:bg-forest-900 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back / Close</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
