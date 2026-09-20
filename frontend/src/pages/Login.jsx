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
    <div className="min-h-screen min-h-[100dvh] w-full bg-[#FAF7F2] flex flex-col justify-start sm:justify-center items-center px-4 sm:px-6 py-8 sm:py-12 text-[#0F291E] pt-safe pb-safe relative overflow-x-clip">
      {/* Subtle warm ambient glow that seamlessly blends with the #FAF7F2 background */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-96 sm:w-[32rem] h-96 sm:h-[32rem] bg-[#166534]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 sm:w-[32rem] h-96 sm:h-[32rem] bg-[#166534]/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md my-auto space-y-6 relative z-10">
        <div className="text-center">
          <Link to="/" className="font-display italic text-3xl sm:text-4xl text-[#0F291E] font-bold block mb-1">
            Harvest&nbsp;Ledger
          </Link>
          <p className="text-xs font-mono uppercase tracking-widest text-[#0F291E]/60">
            Sign in to access your organization dashboard
          </p>
        </div>

        <div className="bg-white/95 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl border border-[#0F291E]/10">
          <h1 className="font-display text-xl sm:text-2xl text-[#0F291E] font-semibold">
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
                id="login_email"
                name="email"
                type="email"
                required
                autoComplete="username email"
                placeholder="you@organization.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-wheat-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400 bg-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login_password" className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-tomato-500 hover:text-tomato-600 font-medium"
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
                  className="w-full border border-wheat-200 rounded-xl pl-3.5 pr-11 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-forest-800/50 hover:text-forest-800 rounded-lg hover:bg-wheat-100 transition-colors cursor-pointer touch-manipulation"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-forest-700" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#0F291E] hover:bg-[#166534] text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50 transition-all shadow-md active:scale-[0.99] mt-2 cursor-pointer"
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 text-emerald-400" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          <p className="text-xs sm:text-sm text-[#0F291E]/60 text-center pt-2 border-t border-[#0F291E]/10">
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
