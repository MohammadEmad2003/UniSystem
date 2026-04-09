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
  const [docName, setDocName] = useState('');

  useEffect(() => {
    departmentService.getAll().then(res => {
      setDepartments(res.data);
      if (res.data.length) setForm(f => ({ ...f, department_id: res.data[0].dept_id }));
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    setError('');
    setLoading(true);
    try {
      await authService.register({ ...form, document: docName || undefined });
      navigate('/pending-approval');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-surface-900 mb-1">Create Account</h2>
      <p className="text-surface-500 mb-6">Register as a new student</p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-sm animate-fade-in">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">First Name</label>
            <input value={form.f_name} onChange={e => setForm({ ...form, f_name: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Last Name</label>
            <input value={form.l_name} onChange={e => setForm({ ...form, l_name: e.target.value })} className="input-field" required />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">Email</label>
          <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input-field" placeholder="email@capital.edu" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">SSN (National ID)</label>
          <input value={form.ssn} onChange={e => setForm({ ...form, ssn: e.target.value })} className="input-field" placeholder="14-digit national ID" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Department</label>
            <select value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })} className="input-field">
              {departments.map(d => <option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Level</label>
            <select value={form.academic_level} onChange={e => setForm({ ...form, academic_level: Number(e.target.value) as AcademicLevel })} className="input-field">
              <option value={1}>Level 1</option>
              <option value={2}>Level 2</option>
              <option value={3}>Level 3</option>
              <option value={4}>Level 4</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Password</label>
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Confirm</label>
            <input type="password" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} className="input-field" required />
          </div>
        </div>

        {/* Document upload */}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1">National ID Document</label>
          <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-surface-200 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 transition-colors">
            <Upload size={18} className="text-surface-400" />
            <span className="text-sm text-surface-500">{docName || 'Click to upload document'}</span>
            <input type="file" className="hidden" onChange={e => setDocName(e.target.files?.[0]?.name || '')} />
          </label>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
          {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><UserPlus size={18} /> Register</>}
        </button>
      </form>

      <p className="text-center text-sm text-surface-500 mt-6">
        Already have an account? <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-700">Sign In</Link>
      </p>
    </div>
  );
}
