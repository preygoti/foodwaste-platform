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
  Eye,
  EyeOff,
  MapPin,
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
  const [showPassword, setShowPassword] = useState(false);

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

  // Guard against browser autofill mistakenly injecting an email address into the physical street address field
  useEffect(() => {
    if (form.address && form.address.includes("@")) {
      setForm((prev) => ({ ...prev, address: "" }));
    }
  }, [form.address]);

  const update = (k) => (e) => {
    const val = e.target.value;
    // Guard: A physical street address should never contain an email symbol (@)
    if (k === "address" && val.includes("@")) {
      return;
    }
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

    if (!form.org_name.trim()) {
      setError("Please enter your organization or store name.");
      return;
    }

    if (!form.email.trim()) {
      setError("Please enter your work email address.");
      return;
    }

    if (!isEmailVerified) {
      if (!otpSent) {
        setError("Please verify your email first: click 'Verify Email' above to receive your 6-digit confirmation code.");
      } else {
        setError("Please enter the 6-digit confirmation code sent to your email and click 'Confirm'.");
      }
      return;
    }

    if (!form.password || form.password.length < 6) {
      setError("Password must be at least 6 characters long.");
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
            Create an account for your business or non-profit
          </p>
        </div>

        <div className="bg-white/95 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl border border-[#0F291E]/10">
          <h1 className="font-display text-xl sm:text-2xl text-[#0F291E] font-semibold">
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

          <form onSubmit={onSubmit} className="space-y-4" autoComplete="on">
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

            {/* Organization / Store Name */}
            <div>
              <label htmlFor="reg_org_name" className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1.5">
                Organization / Store Name *
              </label>
              <input
                id="reg_org_name"
                name="organization"
                type="text"
                required
                autoComplete="organization"
                placeholder="e.g. Green Valley Grocers or City Food Rescue"
                value={form.org_name}
                onChange={update("org_name")}
                className="w-full border border-wheat-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400 bg-white"
              />
            </div>

            {/* Physical Street Address (Positioned under Organization details, with explicit street-address autocomplete & anti-autofill guards) */}
            <div>
              <label htmlFor="reg_address" className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1.5">
                Physical Street Address (for pickups &amp; dispatch)
              </label>
              <div className="relative">
                <input
                  id="reg_address"
                  name="street-address"
                  type="text"
                  autoComplete="street-address"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-form-type="address"
                  placeholder="e.g. 450 Market St, Suite 100, City, State"
                  value={form.address}
                  onChange={update("address")}
                  className="w-full border border-wheat-200 rounded-xl pl-9 pr-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400 bg-white"
                />
                <MapPin className="w-4 h-4 text-forest-800/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Email Address & Verification Section */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="reg_email" className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold">
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
                    id="reg_email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
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
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#0F291E] hover:bg-[#166534] text-white text-xs font-semibold rounded-xl disabled:opacity-50 transition-all shadow-2xs shrink-0 whitespace-nowrap cursor-pointer"
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
                        <Mail className="w-3.5 h-3.5 text-emerald-400" />
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

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-full bg-white border border-forest-300 rounded-lg px-3 py-2 text-center font-mono text-base sm:text-lg tracking-widest font-bold text-forest-900 focus:outline-none focus:ring-2 focus:ring-forest-500 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={otpVerifying || otpCode.trim().length !== 6}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 bg-forest-700 hover:bg-forest-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-all shadow-2xs shrink-0 w-full sm:w-auto"
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

            {/* Password (Positioned at bottom before submit button with new-password autocomplete) */}
            <div>
              <label htmlFor="reg_password" className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1.5">
                Password * (min 6 chars)
              </label>
              <div className="relative">
                <input
                  id="reg_password"
                  name="new-password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={update("password")}
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
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all shadow-md active:scale-[0.99] mt-2 bg-[#0F291E] hover:bg-[#166534] text-white disabled:opacity-50 cursor-pointer"
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                  <span>Register</span>
                </>
              )}
            </button>
          </form>

          <p className="text-xs sm:text-sm text-[#0F291E]/60 text-center pt-2 border-t border-[#0F291E]/10">
            Already have an account?{" "}
            <Link to="/login" className="text-emerald-700 font-semibold hover:text-emerald-800">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
