import { useState, useEffect } from 'react';
import { departmentService, adminService } from '../../services';
import { Building2, Plus, Pencil, Trash2, X, GraduationCap, Clock } from 'lucide-react';
import { useAuthStore } from '../../hooks/useAuthStore';
import type { Department } from '../../types';
import { CardSkeleton } from '../../components/ui/Skeleton';

export default function ManageDepartmentsPage() {
  const { token } = useAuthStore();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [name, setName] = useState('');
  const [totalHours, setTotalHours] = useState('144');
  const [doctors, setDoctors] = useState<any[]>([]);
  const [headId, setHeadId] = useState('');

  useEffect(() => {
    Promise.all([
      departmentService.getAll(),
      adminService.getAllDoctors()
    ]).then(([deptRes, docRes]) => {
      setDepartments(deptRes.data);
      if (docRes.success) setDoctors(docRes.data);
    }).catch(e => setError(e instanceof Error ? e.message : 'Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!name.trim()) return;
    const hours = Number(totalHours) || 144;

    try {
      if (editing) {
        const res = await departmentService.update(editing.dept_id, { 
          dept_name: name,
          total_hours_required: hours,
          head_id: headId || undefined
        });
        setDepartments(prev => prev.map(d => d.dept_id === editing.dept_id ? res.data : d));
      } else {
        const payload: any = { 
          dept_name: name,
          total_hours_required: hours 
        };
        if (headId) payload.head_id = headId;
        const res = await departmentService.create(payload);
        setDepartments(prev => [...prev, res.data]);
      }
      setShowForm(false); setEditing(null); setName(''); setHeadId(''); setTotalHours('144');
    } catch (err: any) {
      alert(err.message || 'Failed to save department');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    await departmentService.delete(id);
    setDepartments(prev => prev.filter(d => d.dept_id !== id));
  };

  const startEdit = (d: any) => { 
    setEditing(d); 
    setName(d.dept_name); 
    setTotalHours(String(d.total_hours_required || 144));
    setHeadId(d.head_id || '');
    setShowForm(true); 
  };

  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Departments</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Configure academic divisions and graduation requirements</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditing(null); setName(''); setHeadId(''); setTotalHours('144'); }} className="btn-primary flex items-center gap-2 px-6 py-3 shadow-lg shadow-primary-500/30">
          <Plus size={20} /> Add New Department
        </button>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-500/10 text-red-500 font-bold text-center border border-red-500/20">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((d: any, i) => (
          <div key={d.dept_id} className="card p-6 group hover:border-primary-500/50 transition-all duration-300 animate-slide-up bg-white dark:bg-[#0a192f]" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-start justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500/10 to-indigo-600/10 flex items-center justify-center border border-primary-500/20">
                <Building2 size={28} className="text-primary-500" />
              </div>
              <div className="flex gap-1">
                <button onClick={() => startEdit(d)} className="p-2 hover:bg-primary-500/10 rounded-xl text-slate-400 hover:text-primary-500 transition-all"><Pencil size={18} /></button>
                <button onClick={() => handleDelete(d.dept_id)} className="p-2 hover:bg-red-500/10 rounded-xl text-slate-400 hover:text-red-500 transition-all"><Trash2 size={18} /></button>
              </div>
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{d.dept_name}</h3>
            
            <div className="space-y-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <GraduationCap size={16} className="text-indigo-500" />
                <span className="font-medium">Graduation: </span>
                <span className="font-bold text-slate-900 dark:text-white ml-auto">{d.total_hours_required || 144} Hours</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Clock size={16} className="text-emerald-500" />
                <span className="font-medium">Head: </span>
                <span className="font-bold text-slate-900 dark:text-white ml-auto">{d.head_name || 'Not Assigned'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-8 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">{editing ? 'Update' : 'New'} Department</h3>
                <p className="text-sm text-slate-500">Configure department details</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"><X size={24} /></button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500 ml-1">Department Name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Computer Science" className="input-field text-lg font-bold" autoFocus />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500 ml-1">Graduation Requirement (Total Hours)</label>
                <div className="relative">
                  <Clock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="number" value={totalHours} onChange={e => setTotalHours(e.target.value)} placeholder="144" className="input-field pl-12 text-lg font-bold" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500 ml-1">Head of Department</label>
                <select value={headId} onChange={e => setHeadId(e.target.value)} className="input-field font-bold">
                  <option value="">Select Head (Optional)</option>
                  {doctors.map(d => (
                    <option key={d.user_id} value={d.user_id}>{d.f_name} {d.l_name}</option>
                  ))}
                </select>
              </div>

              <button onClick={handleSave} className="btn-primary w-full py-4 text-lg font-bold shadow-xl shadow-primary-500/30 mt-4">
                {editing ? 'Save Changes' : 'Create Department'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


