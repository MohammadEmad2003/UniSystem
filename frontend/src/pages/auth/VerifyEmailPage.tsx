import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { authService } from "../../services";
import { CheckCircle2, XCircle, AlertCircle, ArrowRight } from "lucide-react";

export default function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const verifyAttempted = useRef(false);

  useEffect(() => {
    if (verifyAttempted.current) return;
    verifyAttempted.current = true;

    const verifyToken = async () => {
      if (!token) {
        setError("Invalid verification link");
        setLoading(false);
        return;
      }

      try {
        await authService.verifyEmail(token);
        setSuccess(true);
        setLoading(false);
      } catch (err: any) {
        // If it's the "Invalid verification token" error, we show our generic fallback
        setError(err.message || "Invalid token or email already verified.");
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="text-center py-8">
      {loading ? (
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-slate-200 dark:border-slate-800 border-t-[#00e5ff] rounded-full animate-spin mb-6" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Verifying Email
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            Please wait while we verify your email address...
          </p>
        </div>
      ) : success ? (
        <div className="flex flex-col items-center animate-scale-in">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
            Email Verified!
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-sm">
            Your email address has been successfully verified. Your account is
            now fully active.
          </p>
          <div className="flex justify-center w-full">
            <button
              onClick={() => navigate("/login")}
              className="btn-primary inline-flex items-center gap-2 px-8 py-3 group"
            >
              Continue to Login
              <ArrowRight
                size={18}
                className="transition-transform group-hover:translate-x-1"
              />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center animate-scale-in">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
            <XCircle size={40} className="text-red-500" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
            Verification Failed
          </h2>
          <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400 text-sm mb-8 max-w-sm w-full text-left">
            <AlertCircle size={20} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
          <div className="w-full ">
            <Link to="/login" className="btn-primary w-full justify-center">
              Back to Login
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
