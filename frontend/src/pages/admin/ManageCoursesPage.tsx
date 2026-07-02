import { useState, useEffect } from 'react';
import { courseService, departmentService } from '../../services';
import { FolderOpen, Plus, Trash2, X, Link as LinkIcon, Info, ChevronRight } from 'lucide-react';
import type { Course, Department } from '../../types';
import { ListItemSkeleton } from '../../components/ui/Skeleton';

export default function ManageCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ course_code: '', name: '', credit_hours: '3', department_id: '' });

  // Prerequisite management state
  const [showPrereqModal, setShowPrereqModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [prereqs, setPrereqs] = useState<any[]>([]);
  const [newPrereqCode, setNewPrereqCode] = useState('');

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

  const openPrereqs = async (course: Course) => {
    setSelectedCourse(course);
    const res = await courseService.getPrerequisites(course.course_code);
    setPrereqs(res.data);
    setShowPrereqModal(true);
  };

  const addPrereq = async () => {
    if (!selectedCourse || !newPrereqCode) return;
    await courseService.addPrerequisite(selectedCourse.course_code, newPrereqCode);
    const res = await courseService.getPrerequisites(selectedCourse.course_code);
    setPrereqs(res.data);
    setNewPrereqCode('');
  };

  const removePrereq = async (prereqCode: string) => {
    if (!selectedCourse) return;
    await courseService.removePrerequisite(selectedCourse.course_code, prereqCode);
    setPrereqs(prev => prev.filter(p => p.Prereq_Course_Code !== prereqCode));
  };

  const getDeptName = (id: string | number) => departments.find(d => String(d.dept_id) === String(id))?.dept_name || String(id);

  if (loading) return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <ListItemSkeleton key={i} />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900 dark:text-white font-bold drop-shadow-md">Courses</h1><p className="text-slate-600 dark:text-slate-400 mt-1">Manage academic courses and prerequisites</p></div>
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
          <tbody className="divide-y divide-surface-100 dark:divide-slate-800">
            {courses.map((c, i) => (
              <tr key={c.course_code} className="hover:bg-slate-100 dark:hover:bg-white/5 animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                <td className="px-4 py-3"><span className="badge bg-primary-500/10 text-primary-500 font-mono font-bold tracking-tight">{c.course_code}</span></td>
                <td className="px-4 py-3 text-sm font-bold text-slate-800 dark:text-slate-200">{c.name}</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{c.credit_hours}h</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{getDeptName(c.department_id)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openPrereqs(c)} className="p-2 hover:bg-primary-500/10 rounded-xl text-primary-500 transition-colors flex items-center gap-2 text-xs font-bold" title="Manage Prerequisites">
                      <LinkIcon size={16} /> Prereqs
                    </button>
                    <button onClick={() => handleDelete(c.course_code)} className="p-2 hover:bg-rose-500/10 rounded-xl text-slate-400 hover:text-rose-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Course Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-8 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Add New Course</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Course Code</label>
                <input value={form.course_code} onChange={e => setForm({ ...form, course_code: e.target.value })} placeholder="e.g. CS101" className="input-field" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Course Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Intro to CS" className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Credits</label>
                  <input type="number" value={form.credit_hours} onChange={e => setForm({ ...form, credit_hours: e.target.value })} className="input-field" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Department</label>
                  <select value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })} className="input-field">
                    {departments.map(d => <option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={handleCreate} className="btn-primary w-full py-4 shadow-xl shadow-primary-500/20">Create Course</button>
            </div>
          </div>
        </div>
      )}

      {/* Prerequisites Modal */}
      {showPrereqModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowPrereqModal(false)}>
           <div className="bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg p-8 animate-scale-in" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500">
                       <LinkIcon size={24} />
                    </div>
                    <h3 className="text-xl font-bold">Prerequisites</h3>
                 </div>
                 <button onClick={() => setShowPrereqModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"><X size={20} /></button>
              </div>
              <p className="text-sm text-slate-500 mb-6">Manage courses required before taking <span className="text-primary-600 font-bold">{selectedCourse.name} ({selectedCourse.course_code})</span></p>

              <div className="space-y-6">
                 {/* Add New Prereq */}
                 <div className="flex gap-2">
                    <select 
                      value={newPrereqCode} 
                      onChange={e => setNewPrereqCode(e.target.value)}
                      className="input-field flex-1"
                    >
                      <option value="">Select a prerequisite course...</option>
                      {courses
                        .filter(c => c.course_code !== selectedCourse.course_code && !prereqs.some(p => p.Prereq_Course_Code === c.course_code))
                        .map(c => <option key={c.course_code} value={c.course_code}>{c.course_code} - {c.name}</option>)
                      }
                    </select>
                    <button onClick={addPrereq} disabled={!newPrereqCode} className="btn-primary px-6 disabled:opacity-50">Add</button>
                 </div>

                 {/* Current Prereqs List */}
                 <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Current Dependencies</h4>
                    {prereqs.length === 0 ? (
                       <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                          <Info size={32} className="mx-auto text-slate-300 mb-2" />
                          <p className="text-sm text-slate-400">No prerequisites defined for this course.</p>
                       </div>
                    ) : (
                      <div className="grid gap-2">
                        {prereqs.map(p => (
                          <div key={p.Prereq_Course_Code} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 group transition-all hover:shadow-md">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 shadow-sm group-hover:text-primary-500">
                                   <ChevronRight size={16} />
                                </div>
                                <div>
                                   <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{p.Name}</p>
                                   <p className="text-[10px] font-mono text-slate-500 uppercase">{p.Prereq_Course_Code}</p>
                                </div>
                             </div>
                             <button onClick={() => removePrereq(p.Prereq_Course_Code)} className="p-2 hover:bg-rose-500/10 rounded-xl text-slate-400 hover:text-rose-500 transition-colors">
                                <Trash2 size={16} />
                             </button>
                          </div>
                        ))}
                      </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
