import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-wheat-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <Link to="/" className="font-display italic text-2xl text-forest-800 block mb-8 text-center">
          Harvest&nbsp;Ledger
        </Link>
        <div className="bg-white border border-wheat-200 rounded-lg shadow-sm p-8">
          <h1 className="font-display text-2xl text-forest-800 mb-6">Register your organization</h1>
          {error && (
            <p className="text-sm text-tomato-500 bg-tomato-500/10 rounded-md px-3 py-2 mb-4">{error}</p>
          )}
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {["business", "ngo"].map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setForm({ ...form, role: r })}
                  className={`border rounded-md py-2 text-sm font-medium capitalize ${
                    form.role === r
                      ? "border-forest-600 bg-forest-50 text-forest-800"
                      : "border-wheat-200 text-forest-800/50"
                  }`}
                >
                  {r === "business" ? "Food business" : "NGO / Food bank"}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-forest-800/60 mb-1">
                Organization name
              </label>
              <input
                required
                value={form.org_name}
                onChange={update("org_name")}
                className="w-full border border-wheat-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-forest-400"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-forest-800/60 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={update("email")}
                className="w-full border border-wheat-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-forest-400"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-forest-800/60 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={update("password")}
                className="w-full border border-wheat-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-forest-400"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-forest-800/60 mb-1">
                Address (for pickup / delivery)
              </label>
              <input
                value={form.address}
                onChange={update("address")}
                className="w-full border border-wheat-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-forest-400"
              />
            </div>
            <button
              disabled={busy}
              className="w-full bg-forest-800 text-wheat-50 rounded-md py-2.5 font-medium hover:bg-forest-600 disabled:opacity-50"
            >
              {busy ? "Creating account…" : "Create account"}
            </button>
          </form>
          <p className="text-sm text-forest-800/60 mt-6 text-center">
            Already registered?{" "}
            <Link to="/login" className="text-tomato-500 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
