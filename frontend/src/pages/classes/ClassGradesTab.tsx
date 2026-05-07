import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { gradeService, classService } from '../../services';
import { useAuthStore } from '../../hooks/useAuthStore';
import { Award, Plus, X } from 'lucide-react';
import type { StudentGradeSummary, User, Grade, GradeType } from '../../types';

interface Ctx { classId: string; user: User }

export default function ClassGradesTab() {
  const { classId, user } = useOutletContext<Ctx>();
  const { user: authUser } = useAuthStore();
  const [summaries, setSummaries] = useState<StudentGradeSummary[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [myGrades, setMyGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ student_id: '', type: 'midterm' as GradeType, grade: '', max_grade: '40' });

  useEffect(() => {
    if (user.role === 'doctor') {
      Promise.all([
        gradeService.getByClass(classId),
        classService.getStudents(classId)
      ]).then(([g, s]) => {
        setSummaries(g.data);
        setStudents(s.data as any[]);
      }).finally(() => setLoading(false));
    } else if (authUser) {
      gradeService.getStudentClassGrades(classId, authUser.user_id).then(r => setMyGrades(r.data)).finally(() => setLoading(false));
    }
  }, [classId, user.role, authUser]);

  const handleAdd = async () => {
    if (!form.student_id || !form.grade) return;
    
    const g = Number(form.grade);
    const m = Number(form.max_grade);
    if (g > m) {
      setError(`Grade (${g}) cannot be greater than Max Grade (${m})`);
      return;
    }
    if (g < 0) {
      setError("Grade cannot be negative");
      return;
    }

    setIsAdding(true);
    setError(null);
    try {
      await gradeService.addGrade({
        class_id: classId,
        student_id: form.student_id,
        type: form.type,
        grade: g
      } as any);
      const res = await gradeService.getByClass(classId);
      setSummaries(res.data);
      setShowAdd(false);
      setForm({ student_id: '', type: 'midterm', grade: '', max_grade: '40' });
    } catch (err: any) {
      setError(err.message || 'Failed to add grade');
    } finally {
      setIsAdding(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  // Student view
  if (user.role === 'student') {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">My Grades</h2>
        {myGrades.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {myGrades.map((g, i) => (
              <div key={i} className="card p-4 animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="badge bg-[#00e5ff]/10 text-[#00e5ff] capitalize">{g.type}</span>
                  <span className="text-xs text-surface-400">{new Date(g.generated_at).toLocaleDateString()}</span>
                </div>
                <div className="text-3xl font-bold text-slate-900 dark:text-white font-bold drop-shadow-md">{(g.grade ?? 0)}<span className="text-lg text-surface-400">/{(g.max_grade ?? 0)}</span></div>
                <div className="mt-2 h-2 bg-surface-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all" style={{ width: `${((g.grade ?? 0) / (g.max_grade ?? 1)) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-12 text-center">
            <Award size={48} className="mx-auto text-surface-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">No Grades Yet</h3>
          </div>
        )}
      </div>
    );
  }

  // Doctor view
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Grade Management</h2>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-sm flex items-center gap-2">
          <Plus size={16} /> Add Grade
        </button>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-slate-50 dark:bg-[#0a192f] border border-slate-300 dark:border-slate-700/50 rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.8)] w-full max-w-md p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Grade</h3>
              <button onClick={() => setShowAdd(false)} className="p-1 hover:bg-surface-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              {error && <div className="p-3 bg-red-500/10 text-red-500 text-xs rounded-xl border border-red-500/20">{error}</div>}
              <select
                value={form.student_id}
                onChange={e => setForm({ ...form, student_id: e.target.value })}
                className="input-field"
              >
                <option value="">Select Student</option>
                {students.map(s => (
                  <option key={s.user_id} value={s.user_id}>
                    {s.f_name} {s.l_name} ({s.user_id})
                  </option>
                ))}
              </select>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as GradeType })} className="input-field">
                <option value="midterm">Midterm</option>
                <option value="final">Final</option>
                <option value="project">Project</option>
                <option value="practical">Practical</option>
                <option value="attendance">Attendance</option>
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })} placeholder="Grade" className="input-field" />
                <input type="number" value={form.max_grade} onChange={e => setForm({ ...form, max_grade: e.target.value })} placeholder="Max Grade" className="input-field" />
              </div>
              <button
                onClick={handleAdd}
                disabled={isAdding || !form.student_id}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {isAdding ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Add Grade'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-100 dark:bg-[#050b14]">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Student</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Midterm</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Project</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Practical</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Attendance</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Total</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">GPA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {summaries.map((s, i) => (
              <tr key={i} className="hover:bg-slate-100 dark:bg-[#050b14]/50 animate-fade-in">
                <td className="px-4 py-3 font-medium text-sm text-slate-800 dark:text-slate-200">{s.student_name}</td>
                <td className="px-4 py-3 text-center text-sm text-slate-600 dark:text-slate-400">{s.midterm ?? '—'}</td>
                <td className="px-4 py-3 text-center text-sm text-slate-600 dark:text-slate-400">{s.project ?? '—'}</td>
                <td className="px-4 py-3 text-center text-sm text-slate-600 dark:text-slate-400">{s.practical ?? '—'}</td>
                <td className="px-4 py-3 text-center text-sm text-slate-600 dark:text-slate-400">{s.attendance ?? '—'}</td>
                <td className="px-4 py-3 text-center font-semibold text-slate-800 dark:text-slate-200">{s.total}</td>
                <td className="px-4 py-3 text-center"><span className="badge bg-[#00e5ff]/10 text-[#00e5ff]">{(s.gpa || 0).toFixed(1)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {summaries.length === 0 && (
        <div className="card p-12 text-center">
          <Award size={48} className="mx-auto text-surface-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">No Grades Added Yet</h3>
        </div>
      )}
    </div>
  );
}


