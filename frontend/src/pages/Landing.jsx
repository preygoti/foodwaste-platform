import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="min-h-screen bg-wheat-50">
      <header className="max-w-6xl mx-auto px-8 py-6 flex items-center justify-between">
        <p className="font-display italic text-2xl text-forest-800">Harvest&nbsp;Ledger</p>
        <div className="flex gap-3">
          <Link
            to="/login"
            className="px-4 py-2 text-sm font-medium text-forest-800 hover:text-forest-600"
          >
            Sign in
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 text-sm font-medium bg-forest-800 text-wheat-50 rounded-md hover:bg-forest-600"
          >
            Get started
          </Link>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-8 pt-16 pb-24 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-tomato-500 mb-4">
            Days-to-expiry · 02 · high risk
          </p>
          <h1 className="font-display text-5xl leading-[1.05] text-forest-800 mb-6">
            Track what's about to be wasted, before it is.
          </h1>
          <p className="text-forest-800/70 text-lg leading-relaxed mb-8 max-w-md">
            A ledger for food businesses and recovery organizations — expiry
            tracking, AI-driven waste risk scores, and a live marketplace that
            matches surplus to the kitchens and food banks that need it.
          </p>
          <div className="flex gap-4">
            <Link
              to="/register"
              className="px-6 py-3 bg-tomato-500 text-white rounded-md font-medium hover:bg-tomato-600"
            >
              Register your organization
            </Link>
          </div>
        </div>

        <div className="bg-white border border-wheat-200 rounded-lg shadow-sm p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-forest-800/50 mb-4">
            Sample inventory ledger
          </p>
          {[
            { name: "Whole Milk · 40L", risk: "HIGH RISK", color: "#c1442d", days: "2 days left" },
            { name: "Sourdough Loaves · 18", risk: "WATCH", color: "#b48d38", days: "5 days left" },
            { name: "Canned Beans · 120", risk: "FRESH", color: "#2d5940", days: "180 days left" },
          ].map((row) => (
            <div key={row.name} className="flex items-center justify-between py-3 ledger-row">
              <div>
                <p className="text-sm font-medium text-forest-800">{row.name}</p>
                <p className="text-xs text-forest-800/50">{row.days}</p>
              </div>
              <span
                className="risk-stamp px-3 py-1 text-[10px]"
                style={{ color: row.color }}
              >
                {row.risk}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-8 pb-24 grid md:grid-cols-3 gap-8">
        {[
          {
            n: "01",
            title: "Track expiry, not spreadsheets",
            body: "Log inventory manually, via CSV, or barcode/QR scan. Every item carries a live days-to-expiry countdown.",
          },
          {
            n: "02",
            title: "AI waste-risk scoring",
            body: "Each item gets a 0–100 risk score from stock levels vs. usage and time-to-expiry, plus a smart reorder quantity.",
          },
          {
            n: "03",
            title: "Redistribute before it's lost",
            body: "Post surplus to a live marketplace. NGOs claim it, schedule pickup, and your impact dashboard tracks meals saved.",
          },
        ].map((f) => (
          <div key={f.n}>
            <p className="font-mono text-sm text-tomato-500 mb-2">{f.n}</p>
            <h3 className="font-display text-xl text-forest-800 mb-2">{f.title}</h3>
            <p className="text-sm text-forest-800/60 leading-relaxed">{f.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
