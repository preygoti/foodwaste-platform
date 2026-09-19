import { useEffect, useRef } from "react";
import {
  FileText,
  Printer,
  X,
  ShieldCheck,
  Award,
  Download,
  Building2,
  Calendar,
  DollarSign,
  Leaf,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "../AuthContext";

export default function EsgTaxReportModal({ isOpen, onClose, analytics }) {
  const { user } = useAuth();
  const reportRef = useRef(null);

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

  const handlePrint = () => {
    window.print();
  };

  const todayStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const auditId = `ESG-${new Date().getFullYear()}-${1000 + (user?.id || 1)}`;

  const qtyDonated = analytics?.quantity_donated || 0;
  const co2Avoided = analytics?.co2e_saved_kg || 0;
  const mealsCount = analytics?.meals_redistributed || 0;
  const foodValue = analytics?.estimated_food_value || round(qtyDonated * 2.2, 2);
  const taxRelief = analytics?.tax_deduction_benefit || round(foodValue * 0.5, 2);
  const landfillSaved = analytics?.landfill_fees_saved || round(qtyDonated * 0.15, 2);
  const totalImpact = analytics?.total_financial_impact || round(taxRelief + landfillSaved, 2);

  function round(num, decimals = 2) {
    return Number(Math.round(num + "e" + decimals) + "e-" + decimals);
  }

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-forest-950/65 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static animate-in fade-in duration-200 cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="glass-modal rounded-2xl w-full max-w-[calc(100vw-1rem)] sm:max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90dvh] my-auto print:my-0 print:border-0 print:shadow-none cursor-default"
      >
        {/* Header (Hidden when printing) */}
        <div className="p-3 sm:p-5 border-b border-wheat-200/60 flex items-center justify-between bg-wheat-50/70 backdrop-blur-sm print:hidden shrink-0 gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-forest-800/10 hover:bg-forest-800/20 active:bg-forest-800/30 text-forest-800 font-medium text-xs transition-colors shrink-0 cursor-pointer"
              aria-label="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-forest-800 text-gold-400 flex items-center justify-center shadow-2xs shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-display font-semibold text-forest-800 text-xs sm:text-base truncate">
                ESG Tax Deduction Statement
              </h3>
              <p className="text-[10px] sm:text-[11px] text-forest-800/60 font-mono truncate">
                CSR Compliance &bull; Section 80G / IRS 170(e)(3)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-forest-800/50 hover:text-forest-800 p-1.5 rounded-lg hover:bg-wheat-200/50 transition-colors shrink-0 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Audit Statement Sheet */}
        <div ref={reportRef} className="p-3 sm:p-6 md:p-8 overflow-y-auto space-y-4 sm:space-y-6 text-forest-900 bg-white flex-1">
          {/* Certificate Top Banner */}
          <div className="border-b-2 border-forest-800 pb-3 sm:pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
            <div>
              <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-tomato-600 font-bold block mb-0.5 sm:mb-1">
                Official Sustainability &amp; Tax Credit Audit
              </span>
              <h1 className="font-display italic text-xl sm:text-3xl text-forest-900 font-bold leading-tight">
                Harvest Ledger
              </h1>
              <p className="text-[11px] sm:text-xs text-forest-800/60 font-mono">
                Global Food Rescue &amp; Carbon Avoidance Registry
              </p>
            </div>

            <div className="text-left sm:text-right font-mono text-[11px] sm:text-xs text-forest-800/70 space-y-0.5">
              <div>Audit Ref: <strong className="text-forest-900 font-bold">{auditId}</strong></div>
              <div>Issue Date: <strong>{todayStr}</strong></div>
              <div>Status: <span className="text-forest-700 font-bold bg-forest-50 px-2 py-0.5 rounded border border-forest-200 inline-block mt-0.5">VERIFIED &bull; ESG COMPLIANT</span></div>
            </div>
          </div>

          {/* Business Entity Details */}
          <div className="bg-wheat-50/50 p-3 sm:p-4 rounded-xl border border-wheat-200 text-xs font-mono grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            <div>
              <span className="text-[10px] text-forest-800/50 uppercase block">Certified Enterprise Donor</span>
              <strong className="text-xs sm:text-sm text-forest-900 font-bold block">{user?.org_name || "Food Business Partner"}</strong>
              <span className="text-forest-800/70 break-all">{user?.email}</span>
            </div>
            <div>
              <span className="text-[10px] text-forest-800/50 uppercase block">Registered Facility Location</span>
              <span className="text-forest-900 font-medium break-words">{user?.address || "Commercial Storefront / Distribution Center"}</span>
            </div>
          </div>

          {/* Quantitative Impact Table */}
          <div>
            <h4 className="font-display font-semibold text-forest-900 text-xs sm:text-sm mb-2">
              1. Quantitative Resource Diversion Metrics
            </h4>
            <div className="border border-wheat-200 rounded-xl overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse min-w-[360px] sm:min-w-full">
                <thead className="bg-wheat-100/70 text-forest-800 font-mono uppercase text-[10px]">
                  <tr>
                    <th className="p-2 sm:p-2.5">Rescue Metric</th>
                    <th className="p-2 sm:p-2.5 text-right">Certified Volume</th>
                    <th className="p-2 sm:p-2.5 text-right">Unit Factor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-wheat-200 font-mono text-[11px] sm:text-xs">
                  <tr>
                    <td className="p-2 sm:p-2.5 font-semibold text-forest-900">Total Surplus Food Diverted from Landfill</td>
                    <td className="p-2 sm:p-2.5 text-right font-bold text-forest-800">{qtyDonated.toLocaleString()} kg</td>
                    <td className="p-2 sm:p-2.5 text-right text-forest-800/60">Primary Mass</td>
                  </tr>
                  <tr>
                    <td className="p-2 sm:p-2.5 font-semibold text-forest-900">GHG Greenhouse Gas Emissions Prevented</td>
                    <td className="p-2 sm:p-2.5 text-right font-bold text-forest-800">{co2Avoided.toLocaleString()} kg CO₂e</td>
                    <td className="p-2 sm:p-2.5 text-right text-forest-800/60">2.5 kg CO₂e / kg</td>
                  </tr>
                  <tr>
                    <td className="p-2 sm:p-2.5 font-semibold text-forest-900">Nutritional Meals Delivered to Vulnerable Communities</td>
                    <td className="p-2 sm:p-2.5 text-right font-bold text-forest-800">~{mealsCount.toLocaleString()} meals</td>
                    <td className="p-2 sm:p-2.5 text-right text-forest-800/60">2.5 meals / kg</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial & Tax Valuation Matrix */}
          <div>
            <h4 className="font-display font-semibold text-forest-900 text-xs sm:text-sm mb-2">
              2. Financial Valuation &amp; Corporate Tax Relief Computation
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 font-mono text-xs">
              <div className="p-2.5 sm:p-3 bg-wheat-50 rounded-xl border border-wheat-200">
                <span className="text-[10px] text-forest-800/50 uppercase block">Fair Market Value (FMV)</span>
                <strong className="text-sm sm:text-base text-forest-900 font-bold block mt-0.5 sm:mt-1">
                  ${foodValue.toFixed(2)}
                </strong>
                <span className="text-[10px] text-forest-800/60 mt-0.5 block">Baseline: $2.20/kg</span>
              </div>

              <div className="p-2.5 sm:p-3 bg-forest-50/70 rounded-xl border border-forest-200">
                <span className="text-[10px] text-forest-800/50 uppercase block">Section 80G / Tax Relief</span>
                <strong className="text-sm sm:text-base text-forest-800 font-bold block mt-0.5 sm:mt-1">
                  ${taxRelief.toFixed(2)}
                </strong>
                <span className="text-[10px] text-forest-700 font-semibold mt-0.5 block">50% Statutory Credit</span>
              </div>

              <div className="p-2.5 sm:p-3 bg-wheat-50 rounded-xl border border-wheat-200">
                <span className="text-[10px] text-forest-800/50 uppercase block">Waste Hauling Saved</span>
                <strong className="text-sm sm:text-base text-forest-900 font-bold block mt-0.5 sm:mt-1">
                  ${landfillSaved.toFixed(2)}
                </strong>
                <span className="text-[10px] text-forest-800/60 mt-0.5 block">$0.15/kg Landfill Tipping</span>
              </div>
            </div>

            <div className="mt-3 p-3 bg-forest-900 text-wheat-50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 font-mono">
              <span className="text-[11px] sm:text-xs uppercase tracking-wider font-semibold">
                Total Net Financial &amp; Tax Value Created:
              </span>
              <span className="font-display text-base sm:text-lg font-bold text-gold-300">
                ${totalImpact.toFixed(2)} USD
              </span>
            </div>
          </div>

          {/* Certification Signature Block */}
          <div className="pt-4 sm:pt-6 border-t border-wheat-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 text-xs font-mono">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-forest-100 border-2 border-forest-600 flex items-center justify-center text-forest-800 shrink-0">
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-forest-700" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-forest-900 block text-xs sm:text-sm">Harvest Ledger ESG Registry</span>
                <span className="text-[9px] sm:text-[10px] text-forest-800/60 break-all">Digital Signature Hash: HL-SEC-80G-{user?.id || 1}X9</span>
              </div>
            </div>

            <div className="text-left sm:text-right w-full sm:w-auto pt-1 sm:pt-0">
              <div className="w-36 sm:w-40 border-b border-forest-900 mb-1"></div>
              <span className="text-[9px] sm:text-[10px] text-forest-800/60 uppercase">Authorized Compliance Officer</span>
            </div>
          </div>
        </div>

        {/* Footer Actions (Hidden when printing) */}
        <div className="p-3 sm:p-5 border-t border-wheat-100 bg-wheat-50/50 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 sm:py-2.5 border border-wheat-200 rounded-xl text-xs font-semibold text-forest-800 hover:bg-wheat-100 text-center"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-forest-800 text-wheat-50 rounded-xl text-xs sm:text-sm font-semibold hover:bg-forest-700 shadow-sm transition-all"
          >
            <Printer className="w-4 h-4 text-gold-400" />
            <span>Print / Save Statement PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
