import { useState, useEffect } from 'react';
import { classService, courseService, adminService } from '../../services';
import { BookOpen, Plus, Trash2, X, Users } from 'lucide-react';
import type { Class, Course, Doctor, Semester, AcademicLevel } from '../../types';

export default function ManageClassesPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ course_code: '', doctor_id: '', semester: 'Fall' as Semester, level: 1 as AcademicLevel, capacity: '30' });

  useEffect(() => {
    Promise.all([classService.getAll(), courseService.getAll(), adminService.getAllDoctors()]).then(([c, co, d]) => {
      setClasses(c.data); setCourses(co.data); setDoctors(d.data);
      if (co.data.length) setForm(f => ({ ...f, course_code: co.data[0].course_code }));
      if (d.data.length) setForm(f => ({ ...f, doctor_id: String(d.data[0].user_id) }));
    }).catch(e => setError(e instanceof Error ? e.message : 'Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    const res = await classService.create({ ...form, level: form.level, capacity: Number(form.capacity) });
    setClasses(prev => [...prev, res.data]);
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    await classService.delete(id);
    setClasses(prev => prev.filter(c => String(c.class_id) !== String(id)));
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900 dark:text-white font-bold drop-shadow-md">Classes</h1><p className="text-slate-600 dark:text-slate-400 mt-1">Manage class instances</p></div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2"><Plus size={18} /> Create Class</button>
      </div>

      {error && <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-sm">{error}</div>}

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead><tr className="bg-slate-100 dark:bg-[#050b14]">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Course</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Doctor</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Semester</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Level</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Students</th>
            <th className="px-4 py-3"></th>
          </tr></thead>
          <tbody className="divide-y divide-surface-100">
            {classes.map(c => (
              <tr key={c.class_id} className="hover:bg-slate-100 dark:bg-[#050b14]/50">
                <td className="px-4 py-3"><div><p className="text-sm font-medium text-slate-800 dark:text-slate-200">{c.course_name}</p><p className="text-xs text-surface-400">{c.course_code}</p></div></td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{c.doctor_name}</td>
                <td className="px-4 py-3"><span className="badge bg-[#00e5ff]/10 text-[#00e5ff]">{c.semester}</span></td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">Level {c.level}</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1"><Users size={14} /> {c.enrolled_count}/{c.capacity}</td>
                <td className="px-4 py-3"><button onClick={() => handleDelete(String(c.class_id))} className="p-2 hover:bg-red-500/10 rounded-lg text-surface-400 hover:text-red-500"><Trash2 size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-slate-50 dark:bg-[#0a192f] border border-slate-300 dark:border-slate-700/50 rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.8)] w-full max-w-md p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create Class</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-surface-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <select value={form.course_code} onChange={e => setForm({ ...form, course_code: e.target.value })} className="input-field">
                {courses.map(c => <option key={c.course_code} value={c.course_code}>{c.course_code} — {c.name}</option>)}
              </select>
              <select value={form.doctor_id} onChange={e => setForm({ ...form, doctor_id: e.target.value })} className="input-field">
                {doctors.map(d => <option key={d.user_id} value={d.user_id}>Dr. {d.f_name} {d.l_name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <select value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value as Semester })} className="input-field">
                  <option value="Fall">Fall</option><option value="Spring">Spring</option><option value="Summer">Summer</option>
                </select>
                <select value={form.level} onChange={e => setForm({ ...form, level: Number(e.target.value) as AcademicLevel })} className="input-field">
                  <option value={1}>Level 1</option><option value={2}>Level 2</option><option value={3}>Level 3</option><option value={4}>Level 4</option>
                </select>
              </div>
              <input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} placeholder="Capacity" className="input-field" />
              <button onClick={handleCreate} className="btn-primary w-full">Create Class</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


