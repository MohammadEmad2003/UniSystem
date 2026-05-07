import { useState, useEffect } from 'react';
import { adminService, departmentService } from '../../services';
import { UserPlus, X, Users, GraduationCap, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../hooks/useAuthStore';
import type { Student, Doctor, Department, Admin } from '../../types';

export default function ManageUsersPage() {
  const { token, user } = useAuthStore();
  const role = user?.role?.toLowerCase() || (user as any)?.Role?.toLowerCase();
  const pLevel = Number((user as any)?.permissions_level || (user as any)?.Permissions_Level);
  const isAdminDean = role === 'admin' && pLevel === 1;

  const [students, setStudents] = useState<Student[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [tab, setTab] = useState<'students' | 'doctors' | 'admins'>('doctors');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ f_name: '', l_name: '', email: '', password: '', specialization: '', department_ids: [] as string[], permissions_level: '2', createType: 'doctor' as 'doctor' | 'admin' });

  useEffect(() => {
    Promise.all([
      adminService.getAllStudents(), 
      adminService.getAllDoctors(), 
      departmentService.getAll(),
      adminService.getAllAdmins()
    ]).then(([s, d, dept, a]) => {
      setStudents(s.data); 
      setDoctors(d.data); 
      setDepartments(dept.data);
      setAdmins(a.data || []);
      if (dept.data.length) setForm(f => ({ ...f, department_ids: [String(dept.data[0].dept_id)] }));
    }).catch(e => setError(e instanceof Error ? e.message : 'Failed to load users'))
      .finally(() => setLoading(false));
  }, [token, isAdminDean]);

  const handleCreate = async () => {
    setCreateError(null);
    try {
      if (form.createType === 'doctor') {
        const payload: any = { f_name: form.f_name, l_name: form.l_name, email: form.email, password: form.password, specialization: form.specialization, department_ids: form.department_ids };
        const res = await adminService.createDoctor(payload);
        if (!res.success) throw new Error(res.message);
        setDoctors(prev => [...prev, res.data]);
      } else {
        const payload: any = { f_name: form.f_name, l_name: form.l_name, email: form.email, password: form.password, permissions_level: Number(form.permissions_level) };
        const res = await adminService.createAdmin(payload);
        if (!res.success) throw new Error(res.message);
        setAdmins(prev => [...prev, res.data]);
      }
      setShowCreate(false);
      setForm({ f_name: '', l_name: '', email: '', password: '', specialization: '', department_ids: [], permissions_level: '2', createType: 'doctor' });
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create user');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white drop-shadow-md">Manage Users</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Create and manage doctors and admins</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <UserPlus size={18} /> Create User
        </button>
      </div>

      {error && <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-sm">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('doctors')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === 'doctors' ? 'bg-primary-600 text-white' : 'bg-surface-100 text-slate-600 dark:text-slate-400'}`}>
          <span className="flex items-center gap-2"><Users size={16} /> Doctors ({doctors.length})</span>
        </button>
        <button onClick={() => setTab('students')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === 'students' ? 'bg-primary-600 text-white' : 'bg-surface-100 text-slate-600 dark:text-slate-400'}`}>
          <span className="flex items-center gap-2"><GraduationCap size={16} /> Students ({students.filter(s => s.account_status === 'approved').length})</span>
        </button>
        <button onClick={() => setTab('admins')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === 'admins' ? 'bg-primary-600 text-white' : 'bg-surface-100 text-slate-600 dark:text-slate-400'}`}>
          <span className="flex items-center gap-2"><ShieldCheck size={16} /> Admins ({admins.length})</span>
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-100 dark:bg-[#050b14]">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">{tab === 'doctors' ? 'Specialization' : 'Level'}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Status</th>
              {tab === 'students' && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Payments</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {(tab === 'doctors' ? doctors : tab === 'admins' ? admins : students.filter(s => s.account_status === 'approved')).map((u: any) => (
              <tr key={u.user_id} className="hover:bg-slate-100 dark:bg-[#050b14]/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-semibold">
                      {u.f_name?.[0]}{u.l_name?.[0]}
                    </div>
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{u.f_name} {u.l_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{u.email}</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                  {tab === 'doctors' ? u.specialization : tab === 'admins' ? (u.permissions_level === 1 ? 'Dean' : 'Student Affairs') : `Level ${u.academic_level}`}
                </td>
                <td className="px-4 py-3"><span className="badge bg-emerald-500/10 text-emerald-400 capitalize">{u.account_status}</span></td>
                {tab === 'students' && (
                  <td className="px-4 py-3">
                    <div className="text-xs">
                      <span className={`badge ${u.payment_status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400' : u.payment_status === 'Partial' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'}`}>{u.payment_status || 'Unpaid'}</span>
                      <div className="mt-1 text-slate-500 dark:text-slate-400">Paid: {u.paid_amount || 0} / {u.total_fees || 0}</div>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-slate-50 dark:bg-[#0a192f] border border-slate-300 dark:border-slate-700/50 rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.8)] w-full max-w-md p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create User</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-surface-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                <button onClick={() => setForm({ ...form, createType: 'doctor' })} className={`flex-1 py-2 rounded-lg text-sm font-medium ${form.createType === 'doctor' ? 'bg-primary-600 text-white' : 'bg-surface-100 text-slate-600 dark:text-slate-400'}`}>Doctor</button>
                <button onClick={() => setForm({ ...form, createType: 'admin' })} className={`flex-1 py-2 rounded-lg text-sm font-medium ${form.createType === 'admin' ? 'bg-primary-600 text-white' : 'bg-surface-100 text-slate-600 dark:text-slate-400'}`}>Admin</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input value={form.f_name} onChange={e => setForm({ ...form, f_name: e.target.value })} placeholder="First Name" className="input-field" />
                <input value={form.l_name} onChange={e => setForm({ ...form, l_name: e.target.value })} placeholder="Last Name" className="input-field" />
              </div>
              <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email" className="input-field" />
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Password" className="input-field" />
              {form.createType === 'doctor' && (
                <>
                  <input value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })} placeholder="Specialization" className="input-field" />
                  <div className="text-sm text-slate-400 mb-2">Select Departments:</div>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                    {departments.map(d => {
                      const isSelected = form.department_ids.includes(String(d.dept_id));
                      return (
                        <button
                          key={d.dept_id}
                          type="button"
                          onClick={() => {
                            const id = String(d.dept_id);
                            const newIds = isSelected 
                              ? form.department_ids.filter(val => val !== id)
                              : [...form.department_ids, id];
                            setForm({ ...form, department_ids: newIds });
                          }}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                            isSelected 
                              ? 'bg-primary-600 border-primary-500 text-white shadow-lg shadow-primary-500/20' 
                              : 'bg-white dark:bg-[#050b14] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-primary-500/50'
                          }`}
                        >
                          {d.dept_name}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              {form.createType === 'admin' && (
                <div className="p-3 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-600 text-sm font-medium">
                  Note: New administrators are automatically assigned as Student Affairs (Level 2).
                </div>
              )}
              {createError && <div className="p-2 rounded-lg bg-red-500/10 text-red-400 text-xs">{createError}</div>}
              <button onClick={handleCreate} className="btn-primary w-full">Create {form.createType === 'doctor' ? 'Doctor' : 'Admin'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


