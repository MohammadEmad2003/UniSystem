import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { authService } from '../../services';
import { Lock, Eye, EyeOff, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Invalid reset token');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setError('');
    setLoading(true);
    try {
      await authService.resetPassword(token, password, confirmPassword);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={32} className="text-emerald-500" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Password Reset Successful</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-8 font-medium">
          Your password has been successfully updated. You can now log in with your new password.
        </p>
        <button onClick={() => navigate('/login')} className="btn-primary w-full justify-center">
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Create New Password</h2>
      <p className="text-slate-600 dark:text-slate-400 mb-8 font-medium">
        Please enter your new password below.
      </p>

      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-400 text-sm animate-fade-in shadow-[0_0_15px_rgba(239,68,68,0.2)]">
          <AlertCircle size={18} className="flex-shrink-0" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">New Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field pl-12 pr-12"
              placeholder="••••••••"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#00e5ff] transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Confirm New Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-field pl-12 pr-12"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !password || !confirmPassword}
          className="btn-primary w-full justify-center h-12 text-base font-semibold mt-2"
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Reset Password'
          )}
        </button>
      </form>
      
      <div className="mt-8 text-center">
        <Link to="/login" className="text-sm font-medium text-slate-500 hover:text-[#00e5ff] transition-colors">
          Back to login
        </Link>
      </div>
    </div>
  );
}
