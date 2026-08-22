import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus, AlertCircle, Loader2, Building2, Shield } from "lucide-react";
import { useAuth } from "../AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    org_name: "",
    email: "",
    password: "",
    role: "business",
    address: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await register(form);
      navigate(user.role === "business" ? "/dashboard/inventory" : "/dashboard/browse");
    } catch (err) {
      setError(err.message || "Failed to register. Please check your details.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-wheat-50 flex flex-col justify-center items-center px-4 sm:px-6 py-12 text-forest-800">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link to="/" className="font-display italic text-3xl text-forest-800 font-bold block mb-1">
            Harvest&nbsp;Ledger
          </Link>
          <p className="text-xs font-mono uppercase tracking-widest text-forest-800/50">
            Create an account for your business or non-profit
          </p>
        </div>

        <div className="bg-white border border-wheat-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
          <h1 className="font-display text-xl sm:text-2xl text-forest-800 font-semibold">
            Register Organization
          </h1>

          {error && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-tomato-500/10 border border-tomato-500/30 text-tomato-600 text-xs sm:text-sm font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Role Switcher */}
            <div>
              <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1.5">
                Account Type *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { role: "business", label: "Food Business", icon: Building2 },
                  { role: "ngo", label: "NGO / Food Bank", icon: Shield },
                ].map((item) => {
                  const Icon = item.icon;
                  const selected = form.role === item.role;
                  return (
                    <button
                      type="button"
                      key={item.role}
                      onClick={() => setForm({ ...form, role: item.role })}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-medium transition-all ${
                        selected
                          ? "border-forest-600 bg-forest-50 text-forest-800 font-semibold shadow-2xs"
                          : "border-wheat-200 bg-white text-forest-800/60 hover:bg-wheat-50"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${selected ? "text-forest-600" : "text-forest-800/40"}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1.5">
                Organization / Store Name *
              </label>
              <input
                required
                placeholder="e.g. Green Valley Grocers or City Food Rescue"
                value={form.org_name}
                onChange={update("org_name")}
                className="w-full border border-wheat-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1.5">
                Work Email Address *
              </label>
              <input
                type="email"
                required
                placeholder="coordinator@organization.org"
                value={form.email}
                onChange={update("email")}
                className="w-full border border-wheat-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1.5">
                Password * (min 6 chars)
              </label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={form.password}
                onChange={update("password")}
                className="w-full border border-wheat-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1.5">
                Physical Address (for pickups &amp; dispatch)
              </label>
              <input
                placeholder="e.g. 450 Market St, Suite 100, City, State"
                value={form.address}
                onChange={update("address")}
                className="w-full border border-wheat-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400 bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 bg-forest-800 text-wheat-50 rounded-xl py-3 text-sm font-semibold hover:bg-forest-700 disabled:opacity-50 transition-all shadow-sm active:scale-[0.99] mt-2"
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>

          <p className="text-xs sm:text-sm text-forest-800/60 text-center pt-2 border-t border-wheat-100">
            Already registered?{" "}
            <Link to="/login" className="text-tomato-500 font-semibold hover:text-tomato-600">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
