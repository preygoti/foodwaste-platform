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
    <div className="min-h-[100dvh] bg-wheat-50 flex flex-col justify-center items-center px-4 sm:px-6 py-8 sm:py-12 text-forest-800 pt-safe pb-safe relative overflow-hidden">
      {/* Ambient background light orbs for frosted glass refractions */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-10 -left-10 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl animate-mesh-pulse" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-10 -right-10 w-96 h-96 bg-gold-400/25 rounded-full blur-3xl animate-mesh-pulse-delayed" />
      <div aria-hidden="true" className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-tomato-400/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center">
          <Link to="/" className="font-display italic text-3xl sm:text-4xl text-forest-800 font-bold block mb-1">
            Harvest&nbsp;Ledger
          </Link>
          <p className="text-xs font-mono uppercase tracking-widest text-forest-800/50">
            Sign in to access your organization dashboard
          </p>
        </div>

        <div className="glass-modal rounded-2xl p-6 sm:p-8 space-y-6">
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-tomato-500 hover:text-tomato-600 font-medium"
                >
                  Forgot Password?
                </Link>
              </div>
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
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
