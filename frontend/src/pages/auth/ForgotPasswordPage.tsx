import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authService } from "../../services";
import { Mail, AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      navigate('/check-reset-email', { state: { email } });
    } catch (err: any) {
      setError(err.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };
  const navigate = useNavigate();
  return (
    <div>
      <Link
        to="/login"
        className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-[#00e5ff] transition-colors mb-6"
      >
        <ArrowLeft size={16} className="mr-2" /> Back to login
      </Link>

      <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
        Forgot Password
      </h2>
      <p className="text-slate-600 dark:text-slate-400 mb-8 font-medium">
        Enter your email address and we'll send you a link to reset your
        password.
      </p>

      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-400 text-sm animate-fade-in shadow-[0_0_15px_rgba(239,68,68,0.2)]">
          <AlertCircle size={18} className="flex-shrink-0" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Email Address
          </label>
          <div className="relative">
            <Mail
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={20}
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field pl-12"
              placeholder="Enter your email"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !email}
          className="btn-primary w-full justify-center h-12 text-base font-semibold"
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            "Send Reset Link"
          )}
        </button>
      </form>
    </div>
  );
}
