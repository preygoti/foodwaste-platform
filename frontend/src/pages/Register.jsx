import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  UserPlus,
  AlertCircle,
  Loader2,
  Building2,
  Shield,
  Mail,
  CheckCircle2,
  KeyRound,
  RotateCw,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../AuthContext";
import { api } from "../api";

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

  // Email OTP verification state
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [debugOtp, setDebugOtp] = useState(null);
  const [otpSuccessMsg, setOtpSuccessMsg] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const update = (k) => (e) => {
    const val = e.target.value;
    setForm((prev) => ({ ...prev, [k]: val }));
    if (k === "email" && isEmailVerified && val.trim().toLowerCase() !== verifiedEmail) {
      setIsEmailVerified(false);
      setOtpSent(false);
      setOtpCode("");
      setOtpSuccessMsg("");
    }
  };

  const handleSendOtp = async () => {
    const emailToVerify = form.email.trim().toLowerCase();
    if (!emailToVerify || !emailToVerify.includes("@") || !emailToVerify.includes(".")) {
      setError("Please enter a valid work email address first.");
      return;
    }
    setError("");
    setOtpSuccessMsg("");
    setOtpSending(true);
    try {
      const res = await api.sendRegistrationOtp(emailToVerify);
      setOtpSent(true);
      setDebugOtp(res.debug_otp || null);
      setOtpSuccessMsg(res.message || "6-digit verification code sent to your email!");
      setCooldown(60);
    } catch (err) {
      setError(err.message || "Failed to send verification code. Please check your email.");
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e?.preventDefault?.();
    const code = otpCode.trim();
    if (code.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }
    setError("");
    setOtpVerifying(true);
    try {
      await api.verifyRegistrationOtp(form.email, code);
      setIsEmailVerified(true);
      setVerifiedEmail(form.email.trim().toLowerCase());
      setOtpSuccessMsg("✅ Email verified successfully!");
    } catch (err) {
      setError(err.message || "Invalid verification code. Please try again.");
    } finally {
      setOtpVerifying(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isEmailVerified) {
      setError("Please verify your email address with the 6-digit verification code before registering.");
      return;
    }

    setBusy(true);
    try {
      const user = await register({
        ...form,
        otp: otpCode.trim(),
      });
      navigate(user.role === "business" ? "/dashboard/inventory" : "/dashboard/browse");
    } catch (err) {
      setError(err.message || "Failed to register. Please check your details.");
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
            Create an account for your business or non-profit
          </p>
        </div>

        <div className="glass-modal rounded-2xl p-6 sm:p-8 space-y-6">
          <h1 className="font-display text-xl sm:text-2xl text-forest-800 font-semibold">
            Register Organization
          </h1>

          {error && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-tomato-500/10 border border-tomato-500/30 text-tomato-600 text-xs sm:text-sm font-medium animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {otpSuccessMsg && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs sm:text-sm font-medium animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{otpSuccessMsg}</span>
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

            {/* Email Address & Verification Section */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold">
                  Work Email Address *
                </label>
                {isEmailVerified && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Verified
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type="email"
                    required
                    disabled={isEmailVerified}
                    placeholder="coordinator@organization.org"
                    value={form.email}
                    onChange={update("email")}
                    className={`w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400 ${
                      isEmailVerified
                        ? "bg-emerald-50/50 border-emerald-300 text-emerald-900 font-medium cursor-not-allowed"
                        : "bg-white border-wheat-200"
                    }`}
                  />
                  {isEmailVerified && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEmailVerified(false);
                        setOtpSent(false);
                        setOtpCode("");
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-forest-700 hover:text-forest-900 underline"
                    >
                      Change
                    </button>
                  )}
                </div>

                {!isEmailVerified && (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={otpSending || cooldown > 0 || !form.email}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-forest-800 hover:bg-forest-700 text-wheat-50 text-xs font-semibold rounded-xl disabled:opacity-50 transition-all shadow-2xs shrink-0 whitespace-nowrap"
                  >
                    {otpSending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : cooldown > 0 ? (
                      <span>Resend ({cooldown}s)</span>
                    ) : (
                      <>
                        <Mail className="w-3.5 h-3.5" />
                        <span>{otpSent ? "Resend OTP" : "Verify Email"}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* OTP Code Input Box (Rendered when OTP is sent and not yet verified) */}
            {otpSent && !isEmailVerified && (
              <div className="p-4 rounded-xl bg-forest-50/80 border border-forest-200 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-forest-900">
                    <KeyRound className="w-4 h-4 text-forest-600" />
                    <span>Enter 6-Digit Email Code</span>
                  </div>
                  {debugOtp && (
                    <span className="text-[10px] font-mono font-bold bg-gold-400/20 text-forest-900 border border-gold-400/40 px-2 py-0.5 rounded-full">
                      Code: {debugOtp}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-forest-800/70">
                  We sent a 6-digit confirmation code to <strong>{form.email}</strong>.
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-full bg-white border border-forest-300 rounded-lg px-3 py-2 text-center font-mono text-lg tracking-widest font-bold text-forest-900 focus:outline-none focus:ring-2 focus:ring-forest-500 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={otpVerifying || otpCode.trim().length !== 6}
                    className="inline-flex items-center justify-center gap-1 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-all shadow-2xs shrink-0"
                  >
                    {otpVerifying ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirm</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

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
              disabled={busy || !isEmailVerified}
              className={`w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all shadow-sm active:scale-[0.99] mt-2 ${
                isEmailVerified
                  ? "bg-forest-800 text-wheat-50 hover:bg-forest-700 shadow-md"
                  : "bg-wheat-200 text-forest-800/40 cursor-not-allowed"
              }`}
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : isEmailVerified ? (
                <>
                  <UserPlus className="w-4 h-4 text-gold-400" />
                  <span>Complete Registration</span>
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  <span>Verify Email to Register</span>
                </>
              )}
            </button>
          </form>

          <p className="text-xs sm:text-sm text-forest-800/60 text-center pt-2 border-t border-wheat-100">
            Already have an account?{" "}
            <Link to="/login" className="text-tomato-500 font-semibold hover:text-tomato-600">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
