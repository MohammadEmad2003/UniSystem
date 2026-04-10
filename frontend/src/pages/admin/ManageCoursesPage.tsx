import { useState, useEffect } from 'react';
import { courseService, departmentService } from '../../services';
import { FolderOpen, Plus, Trash2, X } from 'lucide-react';
import type { Course, Department } from '../../types';

export default function ManageCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ course_code: '', name: '', credit_hours: '3', department_id: '' });

  useEffect(() => {
    Promise.all([courseService.getAll(), departmentService.getAll()]).then(([c, d]) => {
      setCourses(c.data); setDepartments(d.data);
      if (d.data.length) setForm(f => ({ ...f, department_id: d.data[0].dept_id }));
    }).finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!form.course_code || !form.name) return;
    const res = await courseService.create({ ...form, credit_hours: Number(form.credit_hours) });
    setCourses(prev => [...prev, res.data]);
    setShowForm(false); setForm({ course_code: '', name: '', credit_hours: '3', department_id: departments[0]?.dept_id || '' });
  };

  const handleDelete = async (code: string) => {
    await courseService.delete(code);
    setCourses(prev => prev.filter(c => c.course_code !== code));
  };

  const getDeptName = (id: string) => departments.find(d => d.dept_id === id)?.dept_name || id;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-surface-900">Courses</h1><p className="text-surface-500 mt-1">Manage academic courses</p></div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2"><Plus size={18} /> Add Course</button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead><tr className="bg-surface-50">
            <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Code</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Name</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Credits</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Department</th>
            <th className="px-4 py-3"></th>
          </tr></thead>
          <tbody className="divide-y divide-surface-100">
            {courses.map((c, i) => (
              <tr key={c.course_code} className="hover:bg-surface-50/50 animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                <td className="px-4 py-3"><span className="badge bg-primary-50 text-primary-700 font-mono">{c.course_code}</span></td>
                <td className="px-4 py-3 text-sm font-medium text-surface-800">{c.name}</td>
                <td className="px-4 py-3 text-sm text-surface-600">{c.credit_hours}h</td>
                <td className="px-4 py-3 text-sm text-surface-600">{getDeptName(c.department_id)}</td>
                <td className="px-4 py-3"><button onClick={() => handleDelete(c.course_code)} className="p-2 hover:bg-red-50 rounded-lg text-surface-400 hover:text-red-500"><Trash2 size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
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
