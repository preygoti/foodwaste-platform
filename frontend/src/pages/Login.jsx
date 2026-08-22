import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn, AlertCircle, Loader2 } from "lucide-react";
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
      setError(err.message || "Failed to sign in. Please verify your credentials.");
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
            Sign in to access your organization dashboard
          </p>
        </div>

        <div className="bg-white border border-wheat-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
          <h1 className="font-display text-xl sm:text-2xl text-forest-800 font-semibold">
            Welcome Back
          </h1>

          {error && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-tomato-500/10 border border-tomato-500/30 text-tomato-600 text-xs sm:text-sm font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1.5">
                Work Email Address
              </label>
              <input
                type="email"
                required
                placeholder="you@organization.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-wheat-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          <p className="text-xs sm:text-sm text-forest-800/60 text-center pt-2 border-t border-wheat-100">
            Don't have an account?{" "}
            <Link to="/register" className="text-tomato-500 font-semibold hover:text-tomato-600">
              Register Organization
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
