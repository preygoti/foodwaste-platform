import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="min-h-screen min-h-[100dvh] w-full auth-page-mesh flex flex-col justify-center items-center px-3.5 sm:px-6 py-2 sm:py-8 text-[#0F291E] pt-safe pb-safe relative overflow-x-clip">
      {/* Ambient background light orbs for frosted glass refractions - full screen multi-color aurora that never cuts off */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-20 -left-20 w-80 sm:w-96 h-80 sm:h-96 bg-emerald-400/25 rounded-full blur-3xl animate-mesh-pulse" />
        <div className="absolute -top-20 -right-20 w-80 sm:w-96 h-80 sm:h-96 bg-gold-400/30 rounded-full blur-3xl animate-mesh-pulse-delayed" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-80 h-72 sm:h-80 bg-tomato-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 sm:w-96 h-80 sm:h-96 bg-gold-400/25 rounded-full blur-3xl animate-mesh-pulse-delayed" />
        <div className="absolute -bottom-20 -right-20 w-80 sm:w-96 h-80 sm:h-96 bg-emerald-400/30 rounded-full blur-3xl animate-mesh-pulse" />
      </div>

      <div className="w-full max-w-md my-auto space-y-2 sm:space-y-6 relative z-10">
        <div className="text-center">
          <Link to="/" className="font-display italic text-2xl sm:text-4xl text-[#0F291E] font-bold block mb-0.5 leading-tight">
            Harvest&nbsp;Ledger
          </Link>
          <p className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-[#0F291E]/60">
            Sign in to access your organization dashboard
          </p>
        </div>

        <div className="glass-modal rounded-xl sm:rounded-2xl p-4 sm:p-8 space-y-3 sm:space-y-6 shadow-xl border border-white/80">
          <div className="flex items-center justify-between pb-0.5">
            <h1 className="font-display text-base sm:text-2xl text-[#0F291E] font-semibold">
              Welcome Back
            </h1>
            <Link to="/register" className="sm:hidden text-[11px] text-emerald-700 font-semibold hover:text-emerald-800">
              Sign Up &rarr;
            </Link>
          </div>

          {error && (
            <div className="flex items-center gap-1.5 p-2 sm:p-3.5 rounded-lg sm:rounded-xl bg-tomato-500/10 border border-tomato-500/30 text-tomato-600 text-[11px] sm:text-sm font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-2.5 sm:space-y-4">
            <div>
              <label className="block text-[10px] sm:text-xs uppercase tracking-wide text-forest-800/80 font-semibold mb-0.5 sm:mb-1.5">
                Work Email Address
              </label>
              <input
                id="login_email"
                name="email"
                type="email"
                required
                autoComplete="username email"
                placeholder="you@organization.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-wheat-200 rounded-lg sm:rounded-xl px-3 py-1.5 sm:py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-forest-400 bg-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-0.5 sm:mb-1.5">
                <label htmlFor="login_password" className="block text-[10px] sm:text-xs uppercase tracking-wide text-forest-800/80 font-semibold">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[10px] sm:text-xs text-tomato-500 hover:text-tomato-600 font-medium"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="login_password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-wheat-200 rounded-lg sm:rounded-xl pl-3 pr-8 sm:pr-11 py-1.5 sm:py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-forest-400 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-forest-800/50 hover:text-forest-800 rounded-md hover:bg-wheat-100 transition-colors cursor-pointer touch-manipulation"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-forest-700" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#0F291E] hover:bg-[#166534] text-white rounded-lg sm:rounded-xl py-2 sm:py-3 text-xs sm:text-sm font-semibold disabled:opacity-50 transition-all shadow-md active:scale-[0.99] mt-1 sm:mt-2 cursor-pointer"
            >
              {busy ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          <p className="text-[11px] sm:text-sm text-[#0F291E]/60 text-center pt-1.5 sm:pt-2 border-t border-[#0F291E]/10">
            Don't have an account?{" "}
            <Link to="/register" className="text-emerald-700 font-semibold hover:text-emerald-800">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
