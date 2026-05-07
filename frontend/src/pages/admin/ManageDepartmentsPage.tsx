import { useState, useEffect } from 'react';
import { departmentService } from '../../services';
import { Building2, Plus, Pencil, Trash2, X } from 'lucide-react';
import { useAuthStore } from '../../hooks/useAuthStore';
import type { Department } from '../../types';

export default function ManageDepartmentsPage() {
  const { token } = useAuthStore();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [name, setName] = useState('');
  const [doctors, setDoctors] = useState<any[]>([]);
  const [headId, setHeadId] = useState('');

  useEffect(() => {
    Promise.all([
      departmentService.getAll(),
      fetch('http://localhost:3000/api/admin/doctors', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
    ]).then(([deptRes, docRes]) => {
      setDepartments(deptRes.data);
      if (docRes.success) setDoctors(docRes.data);
    }).catch(e => setError(e instanceof Error ? e.message : 'Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!name.trim()) return;
    if (editing) {
      const res = await departmentService.update(editing.dept_id, { dept_name: name });
      setDepartments(prev => prev.map(d => d.dept_id === editing.dept_id ? res.data : d));
    } else {
      const payload: any = { dept_name: name };
      if (headId) payload.head_id = headId;
      const res = await departmentService.create(payload);
      setDepartments(prev => [...prev, res.data]);
    }
    setShowForm(false); setEditing(null); setName(''); setHeadId('');
  };

  const handleDelete = async (id: string) => {
    await departmentService.delete(id);
    setDepartments(prev => prev.filter(d => d.dept_id !== id));
  };

  const startEdit = (d: Department) => { setEditing(d); setName(d.dept_name); setShowForm(true); };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-bold drop-shadow-md">Departments</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Manage academic departments</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditing(null); setName(''); setHeadId(''); }} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Add Department
        </button>
      </div>

      {error && <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-sm">{error}</div>}

      <div className="grid gap-4">
        {departments.map((d, i) => (
          <div key={d.dept_id} className="card p-4 flex items-center justify-between animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00e5ff]/10 flex items-center justify-center">
                <Building2 size={20} className="text-[#00b8d4]" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">{d.dept_name}</h3>
                <p className="text-xs text-surface-400">ID: {d.dept_id}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(d)} className="p-2 hover:bg-surface-100 rounded-lg text-slate-600 dark:text-slate-400"><Pencil size={16} /></button>
              <button onClick={() => handleDelete(d.dept_id)} className="p-2 hover:bg-red-500/10 rounded-lg text-surface-400 hover:text-red-500"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-slate-50 dark:bg-[#0a192f] border border-slate-300 dark:border-slate-700/50 rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.8)] w-full max-w-sm p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{editing ? 'Edit' : 'Add'} Department</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-surface-100 rounded-lg"><X size={18} /></button>
            </div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Department name" className="input-field mb-4" autoFocus />
            {!editing && (
              <select value={headId} onChange={e => setHeadId(e.target.value)} className="input-field mb-4">
                <option value="">Select Head of Department (Optional)</option>
                {doctors.map(d => (
                  <option key={d.user_id} value={d.user_id}>{d.f_name} {d.l_name}</option>
                ))}
              </select>
            )}
            <button onClick={handleSave} className="btn-primary w-full">{editing ? 'Update' : 'Create'}</button>
          </div>
        </div>
      )}
    </div>
  );
}


