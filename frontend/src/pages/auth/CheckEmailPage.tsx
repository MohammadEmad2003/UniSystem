import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { authService } from '../../services';
import { Mail, ArrowRight, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function CheckEmailPage() {
  const location = useLocation();
  const email = location.state?.email || '';
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleResend = async () => {
    if (!email) {
      setError('Email address not found. Please try logging in again.');
      return;
    }
    
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      await authService.resendVerification(email);
      setMessage('A new verification email has been sent!');
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-center py-4">
      <div className="flex flex-col items-center animate-scale-in">
        <div className="w-20 h-20 bg-[#00b8d4]/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(0,184,212,0.2)]">
          <Mail size={40} className="text-[#00b8d4]" />
        </div>
        
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Check Your Email</h2>
        
        <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-sm">
          We've sent a verification link to {email ? <span className="font-bold text-slate-900 dark:text-white">{email}</span> : 'your email address'}. 
          Please check your inbox and click the link to activate your account.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-400 text-sm w-full max-w-sm">
            <AlertCircle size={18} className="flex-shrink-0" /> <span className="text-left">{error}</span>
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 bg-emerald-900/30 border border-emerald-500/50 rounded-xl flex items-center gap-3 text-emerald-400 text-sm w-full max-w-sm">
            <CheckCircle2 size={18} className="flex-shrink-0" /> <span className="text-left">{message}</span>
          </div>
        )}

        <div className="space-y-4 w-full max-w-sm">
          <button 
            onClick={handleResend}
            disabled={loading}
            className="btn-primary w-full justify-center group"
          >
            {loading ? (
              <RefreshCw size={20} className="animate-spin" />
            ) : (
              <>Resend Verification Email</>
            )}
          </button>
          
          <Link to="/login" className="btn-secondary w-full justify-center group flex items-center gap-2">
            Back to Login <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
