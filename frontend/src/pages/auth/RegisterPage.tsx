import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService, departmentService } from '../../services';
import { UserPlus, AlertCircle, Upload } from 'lucide-react';
import type { Department, AcademicLevel } from '../../types';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    f_name: '', l_name: '', email: '', password: '', confirm: '',
    ssn: '', academic_level: 1 as AcademicLevel, department_id: '',
  });
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docName, setDocName] = useState('');

  useEffect(() => {
    departmentService.getAll()
      .then(res => {
        const depts: Department[] = res.data || [];
        setDepartments(depts);
        if (depts.length) setForm(f => ({ ...f, department_id: String(depts[0].dept_id) }));
      })
      .catch(() => setError('Could not load departments. Please make sure the server is running.'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    setError('');
    setLoading(true);
    try {
      const { confirm: _confirm, ...formData } = form;
      await authService.register({ ...formData, document: docFile || undefined });
      navigate('/check-email', { state: { email: formData.email } });
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Create Account</h2>
      <p className="text-slate-600 dark:text-slate-400 mb-8 font-medium">Join the Capital University System</p>

      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-400 text-sm animate-fade-in shadow-[0_0_15px_rgba(239,68,68,0.2)]">
          <AlertCircle size={18} className="flex-shrink-0" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">First Name</label>
            <input value={form.f_name} onChange={e => setForm({ ...form, f_name: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">Last Name</label>
            <input value={form.l_name} onChange={e => setForm({ ...form, l_name: e.target.value })} className="input-field" required />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">Email</label>
          <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input-field" placeholder="email@capital.edu" required />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">SSN (National ID)</label>
          <input value={form.ssn} onChange={e => setForm({ ...form, ssn: e.target.value })} className="input-field" placeholder="14-digit national ID" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">Department</label>
            <select value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })} className="input-field cursor-pointer">
              {departments.length === 0 && <option value="">Loading...</option>}
              {departments.map(d => <option key={d.dept_id} value={String(d.dept_id)} className="bg-white dark:bg-[#111111]">{d.dept_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">Level</label>
            <select value={form.academic_level} onChange={e => setForm({ ...form, academic_level: Number(e.target.value) as AcademicLevel })} className="input-field cursor-pointer">
              <option value={1} className="bg-white dark:bg-[#111111]">Level 1</option>
              <option value={2} className="bg-white dark:bg-[#111111]">Level 2</option>
              <option value={3} className="bg-white dark:bg-[#111111]">Level 3</option>
              <option value={4} className="bg-white dark:bg-[#111111]">Level 4</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">Password</label>
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">Confirm</label>
            <input type="password" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} className="input-field" required />
          </div>
        </div>

        {/* Document upload */}
        <div className="pt-2">
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">National ID Document</label>
          <label className="flex items-center justify-center gap-3 p-5 border-2 border-dashed border-[#00b8d4]/30 rounded-2xl cursor-pointer hover:border-[#00e5ff] hover:bg-[#00b8d4]/5 transition-all duration-300">
            <Upload size={22} className="text-[#00b8d4]" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{docName || 'Click to upload document'}</span>
            <input type="file" className="hidden" onChange={e => { const f = e.target.files?.[0] || null; setDocFile(f); setDocName(f?.name || ''); }} />
          </label>
        </div>

        <div className="pt-4">
          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-lg">
            {loading ? <div className="w-6 h-6 border-2 border-[#0a192f]/30 border-t-[#0a192f] rounded-full animate-spin" /> : <><UserPlus size={20} /> LAUNCH REGISTRATION</>}
          </button>
        </div>
      </form>

      <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Already have an account? <Link to="/login" className="text-[#00e5ff] font-bold hover:text-white hover:drop-shadow-[0_0_8px_rgba(0,229,255,0.8)] transition-all">Sign In</Link>
        </p>
      </div>
    </div>
  );
}


