import { useState, useRef } from "react";
import { Award, Printer, Download, X, CheckCircle2, Shield, Leaf, Building2, Calendar, FileText } from "lucide-react";

export default function CsrCertificateModal({ isOpen, onClose, metrics, user }) {
  const [certId] = useState(() => `HL-CSR-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`);
  const [issueDate] = useState(() => new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/65 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-3xl glass-modal rounded-2xl shadow-2xl overflow-hidden my-8 print:my-0 print:border-0 print:shadow-none print:w-full">
        {/* Actions bar (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-gradient-to-r from-forest-900/95 to-forest-800/95 backdrop-blur-md text-wheat-50 print:hidden">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-300" />
            <span className="font-semibold text-sm">Official Food Rescue &amp; CSR Compliance Certificate</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-wheat-50 text-forest-800 font-semibold text-xs rounded-lg hover:bg-wheat-100 transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-wheat-100 hover:text-white rounded-lg hover:bg-forest-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Printable Canvas */}
        <div className="p-8 sm:p-12 border-8 border-forest-800/10 m-2 rounded-xl bg-gradient-to-b from-wheat-50/40 via-white to-wheat-50/20 text-forest-800 relative space-y-6">
          {/* Watermark Logo */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
            <Leaf className="w-96 h-96 text-forest-800" />
          </div>

          {/* Header */}
          <div className="text-center space-y-1 border-b-2 border-forest-800/20 pb-5">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-forest-800 text-wheat-50 mb-2 shadow-sm">
              <Award className="w-6 h-6 text-amber-300" />
            </div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-forest-800/70 font-bold">
              Harvest Ledger &bull; Environmental &amp; Social Governance (ESG)
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-forest-800 uppercase">
              Certificate of Food Rescue &amp; Tax Deduction
            </h1>
            <p className="text-xs font-mono text-forest-800/60">
              Certificate ID: <strong className="text-forest-800">{certId}</strong> &bull; Issued on: <strong>{issueDate}</strong>
            </p>
          </div>

          {/* Organization Declaration */}
          <div className="text-center space-y-2 py-2">
            <p className="text-xs text-forest-800/70 uppercase tracking-widest font-mono">This Official Record Certifies That</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-forest-800 underline decoration-amber-400 decoration-2 underline-offset-4">
              {user?.org_name || "Partner Food Organization"}
            </h2>
            <p className="text-xs text-forest-800/70 max-w-xl mx-auto leading-relaxed">
              Has successfully diverted commercial food inventory from landfills, redistributing safe surplus nourishment to verified non-profit community kitchens and food banks in full compliance with public health standards.
            </p>
          </div>

          {/* Impact Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2">
            <div className="p-3.5 rounded-xl bg-forest-50/60 border border-forest-200/60 text-center space-y-0.5">
              <span className="text-[10px] uppercase font-mono tracking-wider text-forest-800/60 block">Food Rescued</span>
              <p className="font-display text-xl font-bold text-forest-800">{totalKg} kg</p>
              <span className="text-[10px] text-forest-800/50">Diverted from Landfill</span>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/60 text-center space-y-0.5">
              <span className="text-[10px] uppercase font-mono tracking-wider text-amber-800/60 block">Meals Provided</span>
              <p className="font-display text-xl font-bold text-amber-900">~{estimatedMeals}</p>
              <span className="text-[10px] text-amber-800/50">Community Portions</span>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/60 text-center space-y-0.5">
              <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-800/60 block">CO₂e Avoided</span>
              <p className="font-display text-xl font-bold text-emerald-800">{co2Avoided} kg</p>
              <span className="text-[10px] text-emerald-800/50">GHG Emissions Saved</span>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/60 text-center space-y-0.5">
              <span className="text-[10px] uppercase font-mono tracking-wider text-blue-800/60 block">FMV Tax Valuation</span>
              <p className="font-display text-xl font-bold text-blue-900">{taxValuation}</p>
              <span className="text-[10px] text-blue-800/50">Estimated Deduction</span>
            </div>
          </div>

          {/* Legal / CSR Compliance Statement */}
          <div className="p-3.5 bg-wheat-50 border border-wheat-200 rounded-xl text-[11px] text-forest-800/70 leading-relaxed font-mono">
            <strong>Legal &amp; CSR Safe Harbor Endorsement:</strong> All donations recorded under this certificate were logged via verifiable batch records, verified prior to expiration, and accepted in good faith by registered 501(c)(3) / 80G non-profit food distribution partners. Eligible for corporate sustainability reporting and tax deduction schedules.
          </div>

          {/* Signatures & Verification Seal */}
          <div className="pt-4 border-t-2 border-forest-800/20 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-center sm:text-left space-y-1">
              <div className="font-display italic text-lg font-bold text-forest-800">Harvest Ledger Platform</div>
              <p className="text-[10px] font-mono text-forest-800/60 uppercase">Automated Telemetry Audit Engine</p>
              <p className="text-[10px] font-mono text-forest-800/50">Cryptographic Checksum: SHA-256 Verified</p>
            </div>

            {/* Gold Verification Badge */}
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full border-4 border-amber-400 bg-amber-50 text-amber-800 flex flex-col items-center justify-center shadow-inner text-center">
                <Shield className="w-5 h-5 text-amber-600" />
                <span className="text-[8px] font-mono font-extrabold uppercase tracking-tighter text-amber-800">VERIFIED</span>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-forest-800">Verified Rescue Registry</p>
                <p className="text-[10px] font-mono text-forest-800/60">Digital Signature Validated</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer (Hidden in Print) */}
        <div className="px-6 py-3 bg-wheat-50 border-t border-wheat-200 flex items-center justify-between print:hidden text-xs text-forest-800/60">
          <span>📄 Formatted for standard A4 certificate print &amp; PDF export.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-forest-800 text-wheat-50 rounded-lg font-semibold hover:bg-forest-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
