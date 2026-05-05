import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../hooks/useAuthStore';
import { authService } from '../../services';
import { LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Quick login presets
  const presets = [
    { label: 'Student', email: 'ahmed.hassan@capital.edu' },
    { label: 'Doctor', email: 'mohamed.elsayed@capital.edu' },
    { label: 'Admin', email: 'admin@capital.edu' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authService.login(email, password);
      login(res.data.user, res.data.token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Welcome back</h2>
      <p className="text-slate-600 dark:text-slate-400 mb-8 font-medium">Sign in to your account</p>

      {/* Quick login */}
      <div className="flex gap-3 mb-8">
        {presets.map(p => (
          <button
            key={p.label}
            onClick={() => { setEmail(p.email); setPassword('password'); }}
            className="flex-1 py-2.5 px-3 text-xs font-bold uppercase tracking-wider bg-white dark:bg-[#111111] text-[#00b8d4] border border-[#00b8d4]/30 rounded-xl hover:bg-[#00b8d4]/10 transition-all duration-300"
          >
            {p.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-400 text-sm animate-fade-in shadow-[0_0_15px_rgba(239,68,68,0.2)]">
          <AlertCircle size={18} className="flex-shrink-0" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="input-field"
            placeholder="your.email@capital.edu"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input-field pr-12"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#00e5ff] transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>
        
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-lg"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-[#0a192f]/30 border-t-[#0a192f] rounded-full animate-spin" />
            ) : (
              <>
                <LogIn size={20} /> LAUNCH LOGIN
              </>
            )}
          </button>
        </div>
      </form>

      <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-[#00e5ff] font-bold hover:text-white hover:drop-shadow-[0_0_8px_rgba(0,229,255,0.8)] transition-all">Register</Link>
        </p>
      </div>
    </div>
  );
}


