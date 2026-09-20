import { useState, useEffect } from "react";
import {
  Trash2,
  AlertTriangle,
  X,
  Loader2,
  Building2,
  Shield,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../AuthContext";

export default function DeleteAccountModal({ isOpen, onClose, onSuccess }) {
  const { user, deleteAccount } = useAuth();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Reset state whenever modal is opened/closed
  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setShowPassword(false);
      setError("");
      setIsDeleting(false);
      setIsSuccess(false);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen) return null;

  const handleDelete = async (e) => {
    e.preventDefault();
    if (!password || !password.trim()) {
      setError("Please enter your password to confirm account deletion.");
      return;
    }

    setError("");
    setIsDeleting(true);

    try {
      await deleteAccount(password.trim());
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess?.();
      }, 1200);
    } catch (err) {
      setError(err.message || "Failed to delete account. Please verify your password.");
      setIsDeleting(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-forest-950/70 backdrop-blur-md overflow-y-auto cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-rose-200 overflow-hidden my-auto flex flex-col animate-in fade-in zoom-in-95 duration-150 cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 border-b border-rose-100 bg-rose-50/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 border border-rose-200 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold text-rose-900 leading-tight">
                Delete Account
              </h2>
              <p className="text-[11px] font-mono uppercase tracking-wider text-rose-700/70">
                Danger Zone &bull; Permanent Action
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-forest-800/40 hover:text-forest-800 hover:bg-black/5 transition-colors disabled:opacity-30 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4">
          {isSuccess ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-[#0F291E]">
                Account Successfully Deleted
              </h3>
              <p className="text-xs sm:text-sm text-[#4B5563]">
                All associated data has been purged. Redirecting you to the home page...
              </p>
            </div>
          ) : (
            <>
              {/* Account Summary Banner */}
              <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#0F291E]/10 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-forest-800 text-wheat-100 flex items-center justify-center shrink-0">
                  {user?.role === "business" ? (
                    <Building2 className="w-4 h-4" />
                  ) : (
                    <Shield className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs sm:text-sm text-[#0F291E] truncate">
                    {user?.org_name || "Your Organization"}
                  </p>
                  <p className="text-[11px] font-mono text-[#4B5563] truncate">
                    {user?.email} &bull; <span className="capitalize">{user?.role}</span>
                  </p>
                </div>
              </div>

              {/* Warning Notice */}
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200/90 text-xs text-rose-800 space-y-1.5 leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold text-rose-900">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>This action is permanent and cannot be undone</span>
                </div>
                <p className="text-rose-800/90 text-[11px] sm:text-xs">
                  {user?.role === "business"
                    ? "Deleting your account will permanently destroy your organization profile, all inventory items, active surplus listings, and pickup history."
                    : "Deleting your account will permanently remove your NGO profile, all scheduled pickups, and impact reports."}
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-xl bg-rose-100 border border-rose-300 text-rose-800 text-xs font-medium animate-in fade-in duration-150">
                  {error}
                </div>
              )}

              {/* Password Confirmation Form */}
              <form onSubmit={handleDelete} className="space-y-4 pt-1">
                <div>
                  <label
                    htmlFor="delete_confirm_password"
                    className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1.5"
                  >
                    Confirm With Your Password *
                  </label>
                  <div className="relative">
                    <input
                      id="delete_confirm_password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      placeholder="Enter your current password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isDeleting}
                      className="w-full border border-wheat-300 rounded-xl pl-3.5 pr-11 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-forest-800/50 hover:text-forest-800 rounded-lg hover:bg-wheat-100 transition-colors cursor-pointer"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-wheat-200">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isDeleting}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[#4B5563] hover:text-[#0F291E] hover:bg-wheat-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isDeleting || !password.trim()}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.98] disabled:opacity-50 transition-all shadow-sm cursor-pointer"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Deleting Account...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete My Account</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
