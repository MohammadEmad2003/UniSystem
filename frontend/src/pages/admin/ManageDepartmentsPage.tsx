import { useState, useEffect } from 'react';
import { departmentService } from '../../services';
import { Building2, Plus, Pencil, Trash2, X } from 'lucide-react';
import type { Department } from '../../types';

export default function ManageDepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [name, setName] = useState('');

  useEffect(() => {
    departmentService.getAll()
      .then(r => setDepartments(r.data))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load departments'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!name.trim()) return;
    if (editing) {
      const res = await departmentService.update(editing.dept_id, { dept_name: name });
      setDepartments(prev => prev.map(d => d.dept_id === editing.dept_id ? res.data : d));
    } else {
      const res = await departmentService.create({ dept_name: name });
      setDepartments(prev => [...prev, res.data]);
    }
    setShowForm(false); setEditing(null); setName('');
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
          <h1 className="text-2xl font-bold text-surface-900">Departments</h1>
          <p className="text-surface-500 mt-1">Manage academic departments</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditing(null); setName(''); }} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Add Department
        </button>
      </div>

      {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}

      <div className="grid gap-4">
        {departments.map((d, i) => (
          <div key={d.dept_id} className="card p-4 flex items-center justify-between animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                <Building2 size={20} className="text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-surface-800">{d.dept_name}</h3>
                <p className="text-xs text-surface-400">ID: {d.dept_id}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(d)} className="p-2 hover:bg-surface-100 rounded-lg text-surface-500"><Pencil size={16} /></button>
              <button onClick={() => handleDelete(d.dept_id)} className="p-2 hover:bg-red-50 rounded-lg text-surface-400 hover:text-red-500"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{editing ? 'Edit' : 'Add'} Department</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-surface-100 rounded-lg"><X size={18} /></button>
            </div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Department name" className="input-field mb-4" autoFocus />
            <button onClick={handleSave} className="btn-primary w-full">{editing ? 'Update' : 'Create'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
