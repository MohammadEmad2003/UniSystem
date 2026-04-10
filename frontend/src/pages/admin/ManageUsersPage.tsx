import { useState, useEffect } from 'react';
import { adminService, departmentService } from '../../services';
import { UserPlus, X, Users, GraduationCap } from 'lucide-react';
import type { Student, Doctor, Department } from '../../types';

export default function ManageUsersPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'students' | 'doctors'>('doctors');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ f_name: '', l_name: '', email: '', password: '', specialization: '', department_id: '', permissions_level: 'admin', createType: 'doctor' as 'doctor' | 'admin' });

  useEffect(() => {
    Promise.all([
      adminService.getAllStudents(), adminService.getAllDoctors(), departmentService.getAll()
    ]).then(([s, d, dept]) => {
      setStudents(s.data); setDoctors(d.data); setDepartments(dept.data);
      if (dept.data.length) setForm(f => ({ ...f, department_id: dept.data[0].dept_id }));
    }).finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (form.createType === 'doctor') {
      const res = await adminService.createDoctor({ f_name: form.f_name, l_name: form.l_name, email: form.email, specialization: form.specialization, department_id: form.department_id });
      setDoctors(prev => [...prev, res.data]);
    } else {
      await adminService.createAdmin({ f_name: form.f_name, l_name: form.l_name, email: form.email, permissions_level: form.permissions_level });
    }
    setShowCreate(false);
    setForm({ f_name: '', l_name: '', email: '', password: '', specialization: '', department_id: departments[0]?.dept_id || '', permissions_level: 'admin', createType: 'doctor' });
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Manage Users</h1>
          <p className="text-surface-500 mt-1">Create and manage doctors and admins</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <UserPlus size={18} /> Create User
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('doctors')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === 'doctors' ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-600'}`}>
          <span className="flex items-center gap-2"><Users size={16} /> Doctors ({doctors.length})</span>
        </button>
        <button onClick={() => setTab('students')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === 'students' ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-600'}`}>
          <span className="flex items-center gap-2"><GraduationCap size={16} /> Students ({students.filter(s => s.account_status === 'approved').length})</span>
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase">{tab === 'doctors' ? 'Specialization' : 'Level'}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {(tab === 'doctors' ? doctors : students.filter(s => s.account_status === 'approved')).map((u: any) => (
              <tr key={u.user_id} className="hover:bg-surface-50/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-semibold">{u.f_name[0]}{u.l_name[0]}</div>
                    <span className="text-sm font-medium text-surface-800">{u.f_name} {u.l_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-surface-500">{u.email}</td>
                <td className="px-4 py-3 text-sm text-surface-600">{tab === 'doctors' ? u.specialization : `Level ${u.academic_level}`}</td>
                <td className="px-4 py-3"><span className="badge bg-emerald-50 text-emerald-700 capitalize">{u.account_status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create User</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-surface-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                <button onClick={() => setForm({ ...form, createType: 'doctor' })} className={`flex-1 py-2 rounded-lg text-sm font-medium ${form.createType === 'doctor' ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-600'}`}>Doctor</button>
                <button onClick={() => setForm({ ...form, createType: 'admin' })} className={`flex-1 py-2 rounded-lg text-sm font-medium ${form.createType === 'admin' ? 'bg-primary-600 text-white' : 'bg-surface-100 text-surface-600'}`}>Admin</button>
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
                  <select value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })} className="input-field">
                    {departments.map(d => <option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>)}
                  </select>
                </>
              )}
              <button onClick={handleCreate} className="btn-primary w-full">Create {form.createType === 'doctor' ? 'Doctor' : 'Admin'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
