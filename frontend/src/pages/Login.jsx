import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await login(email, password);
      navigate(user.role === "business" ? "/dashboard/inventory" : "/dashboard/browse");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-wheat-50 flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link to="/" className="font-display italic text-2xl text-forest-800 block mb-8 text-center">
          Harvest&nbsp;Ledger
        </Link>
        <div className="bg-white border border-wheat-200 rounded-lg shadow-sm p-8">
          <h1 className="font-display text-2xl text-forest-800 mb-6">Sign in</h1>
          {error && (
            <p className="text-sm text-tomato-500 bg-tomato-500/10 rounded-md px-3 py-2 mb-4">{error}</p>
          )}
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wide text-forest-800/60 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-wheat-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-forest-400"
              />
            </div>
            <button
              disabled={busy}
              className="w-full bg-forest-800 text-wheat-50 rounded-md py-2.5 font-medium hover:bg-forest-600 disabled:opacity-50"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <p className="text-sm text-forest-800/60 mt-6 text-center">
            No account?{" "}
            <Link to="/register" className="text-tomato-500 font-medium">
              Register your organization
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
