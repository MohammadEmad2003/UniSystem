import { useState, useEffect } from 'react';
import { courseService, departmentService } from '../../services';
import { FolderOpen, Plus, Trash2, X } from 'lucide-react';
import type { Course, Department } from '../../types';

export default function ManageCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ course_code: '', name: '', credit_hours: '3', department_id: '' });

  useEffect(() => {
    Promise.all([courseService.getAll(), departmentService.getAll()]).then(([c, d]) => {
      setCourses(c.data); setDepartments(d.data);
      if (d.data.length) setForm(f => ({ ...f, department_id: String(d.data[0].dept_id) }));
    }).catch(e => setError(e instanceof Error ? e.message : 'Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!form.course_code || !form.name) return;
    const res = await courseService.create({ ...form, credit_hours: Number(form.credit_hours) });
    setCourses(prev => [...prev, res.data]);
    setShowForm(false); setForm({ course_code: '', name: '', credit_hours: '3', department_id: String(departments[0]?.dept_id || '') });
  };

  const handleDelete = async (code: string) => {
    await courseService.delete(code);
    setCourses(prev => prev.filter(c => c.course_code !== code));
  };

  const getDeptName = (id: string | number) => departments.find(d => String(d.dept_id) === String(id))?.dept_name || String(id);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900 dark:text-white font-bold drop-shadow-md">Courses</h1><p className="text-slate-600 dark:text-slate-400 mt-1">Manage academic courses</p></div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2"><Plus size={18} /> Add Course</button>
      </div>

      {error && <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-sm">{error}</div>}

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead><tr className="bg-slate-100 dark:bg-[#050b14]">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Code</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Name</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Credits</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Department</th>
            <th className="px-4 py-3"></th>
          </tr></thead>
          <tbody className="divide-y divide-surface-100">
            {courses.map((c, i) => (
              <tr key={c.course_code} className="hover:bg-slate-100 dark:bg-[#050b14]/50 animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                <td className="px-4 py-3"><span className="badge bg-[#00e5ff]/10 text-[#00e5ff] font-mono">{c.course_code}</span></td>
                <td className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200">{c.name}</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{c.credit_hours}h</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{getDeptName(c.department_id)}</td>
                <td className="px-4 py-3"><button onClick={() => handleDelete(c.course_code)} className="p-2 hover:bg-red-500/10 rounded-lg text-surface-400 hover:text-red-500"><Trash2 size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-slate-50 dark:bg-[#0a192f] border border-slate-300 dark:border-slate-700/50 rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.8)] w-full max-w-md p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Course</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-surface-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input value={form.course_code} onChange={e => setForm({ ...form, course_code: e.target.value })} placeholder="Course Code (e.g., CS101)" className="input-field" />
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Course Name" className="input-field" />
              <input type="number" value={form.credit_hours} onChange={e => setForm({ ...form, credit_hours: e.target.value })} placeholder="Credit Hours" className="input-field" />
              <select value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })} className="input-field">
                {departments.map(d => <option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>)}
              </select>
              <button onClick={handleCreate} className="btn-primary w-full">Create Course</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


