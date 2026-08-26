import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound, Mail, Lock, AlertCircle, CheckCircle2, ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { api } from "../api";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password, 4: Success
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [devOtpHint, setDevOtpHint] = useState("");

  // Countdown timer effect
  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  // Step 1: Send OTP to Email
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setDevOtpHint("");
    setBusy(true);

    try {
      const res = await api.forgotPassword(email);
      setSuccessMsg(res.message || "Verification code sent to your email!");
      if (res.debug_otp) {
        setDevOtpHint(res.debug_otp);
      }
      setStep(2);
      setCountdown(60); // 60-second cooldown for resend
    } catch (err) {
      setError(err.message || "Failed to send verification code. Please check your email.");
    } finally {
      setBusy(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      await api.verifyOtp(email, otp);
      setSuccessMsg("Verification code confirmed! Please enter your new password.");
      setStep(3);
    } catch (err) {
      setError(err.message || "Invalid or expired verification code.");
    } finally {
      setBusy(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setBusy(true);
    try {
      await api.resetPassword(email, otp, newPassword);
      setStep(4);
    } catch (err) {
      setError(err.message || "Failed to reset password. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  // Resend OTP Action
  const handleResendOtp = async () => {
    if (countdown > 0 || busy) return;
    setError("");
    setBusy(true);
    try {
      const res = await api.forgotPassword(email);
      setSuccessMsg("A fresh verification code has been dispatched!");
      if (res.debug_otp) {
        setDevOtpHint(res.debug_otp);
      }
      setCountdown(60);
    } catch (err) {
      setError(err.message || "Failed to resend verification code.");
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
            Account Recovery &bull; Security Verification
          </p>
        </div>

        <div className="bg-white border border-wheat-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-between pb-4 border-b border-wheat-100 text-xs font-mono">
            <span className={`font-semibold ${step >= 1 ? "text-forest-800" : "text-forest-800/30"}`}>
              1. Email
            </span>
            <span className="text-wheat-300">&rarr;</span>
            <span className={`font-semibold ${step >= 2 ? "text-forest-800" : "text-forest-800/30"}`}>
              2. OTP Code
            </span>
            <span className="text-wheat-300">&rarr;</span>
            <span className={`font-semibold ${step >= 3 ? "text-forest-800" : "text-forest-800/30"}`}>
              3. New Password
            </span>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="flex items-start gap-2 p-3.5 rounded-xl bg-tomato-500/10 border border-tomato-500/30 text-tomato-600 text-xs sm:text-sm font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Development OTP Test Hint */}
          {devOtpHint && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-gold-400/15 border border-gold-500/30 text-forest-800 text-xs font-mono">
              <span>Verification Code: <strong className="text-forest-900 tracking-widest">{devOtpHint}</strong></span>
              <button
                type="button"
                onClick={() => setOtp(devOtpHint)}
                className="text-[11px] font-semibold text-tomato-600 underline hover:text-tomato-700"
              >
                Auto-fill
              </button>
            </div>
          )}

          {/* STEP 1: Enter Email */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <h2 className="font-display text-xl text-forest-800 font-semibold mb-1">
                  Forgot Password?
                </h2>
                <p className="text-xs text-forest-800/60 leading-relaxed">
                  Enter your registered work email. We will dispatch a 6-digit verification code to verify your identity.
                </p>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1.5">
                  Work Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-forest-800/40 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="you@organization.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-wheat-200 rounded-xl pl-10 pr-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400 bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={busy || !email.trim()}
                className="w-full inline-flex items-center justify-center gap-2 bg-forest-800 text-wheat-50 rounded-xl py-3 text-sm font-semibold hover:bg-forest-700 disabled:opacity-50 transition-all shadow-sm active:scale-[0.99] mt-2"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Dispatching OTP...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Send Verification Code</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: Enter OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <h2 className="font-display text-xl text-forest-800 font-semibold mb-1">
                  Enter Verification Code
                </h2>
                <p className="text-xs text-forest-800/60 leading-relaxed">
                  We've sent a 6-digit security OTP to <strong className="text-forest-800">{email}</strong>.
                </p>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1.5">
                  6-Digit OTP Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  pattern="[0-9]{6}"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="w-full border border-wheat-200 rounded-xl px-3.5 py-3 text-center text-xl tracking-[0.4em] font-mono font-bold focus:outline-none focus:ring-2 focus:ring-forest-400 bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={busy || otp.length < 6}
                className="w-full inline-flex items-center justify-center gap-2 bg-forest-800 text-wheat-50 rounded-xl py-3 text-sm font-semibold hover:bg-forest-700 disabled:opacity-50 transition-all shadow-sm active:scale-[0.99]"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <span>Confirm OTP Code</span>
                )}
              </button>

              <div className="flex items-center justify-between text-xs text-forest-800/60 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-forest-800/60 hover:text-forest-800 inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Change Email</span>
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={countdown > 0 || busy}
                  className="text-tomato-500 font-semibold hover:text-tomato-600 disabled:opacity-40"
                >
                  {countdown > 0 ? `Resend code in ${countdown}s` : "Resend OTP"}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Enter New Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <h2 className="font-display text-xl text-forest-800 font-semibold mb-1">
                  Create New Password
                </h2>
                <p className="text-xs text-forest-800/60 leading-relaxed">
                  Choose a secure password with at least 6 characters.
                </p>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-forest-800/40 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full border border-wheat-200 rounded-xl pl-10 pr-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-forest-800/40 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full border border-wheat-200 rounded-xl pl-10 pr-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400 bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={busy || !newPassword || !confirmPassword}
                className="w-full inline-flex items-center justify-center gap-2 bg-forest-800 text-wheat-50 rounded-xl py-3 text-sm font-semibold hover:bg-forest-700 disabled:opacity-50 transition-all shadow-sm active:scale-[0.99] mt-2"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Resetting Password...</span>
                  </>
                ) : (
                  <span>Update Password</span>
                )}
              </button>
            </form>
          )}

          {/* STEP 4: Success Card */}
          {step === 4 && (
            <div className="text-center space-y-4 py-3">
              <div className="w-14 h-14 rounded-full bg-forest-500/10 text-forest-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="font-display text-xl text-forest-800 font-semibold">
                Password Reset Complete!
              </h2>
              <p className="text-xs sm:text-sm text-forest-800/60 max-w-xs mx-auto">
                Your organization account password has been updated securely. You can now sign in with your new credentials.
              </p>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="w-full inline-flex items-center justify-center gap-2 bg-forest-800 text-wheat-50 rounded-xl py-3 text-sm font-semibold hover:bg-forest-700 transition-all shadow-sm active:scale-[0.99] mt-2"
              >
                Proceed to Sign In
              </button>
            </div>
          )}

          <div className="pt-2 border-t border-wheat-100 text-center">
            <Link
              to="/login"
              className="text-xs text-forest-800/60 hover:text-forest-800 inline-flex items-center gap-1 font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
