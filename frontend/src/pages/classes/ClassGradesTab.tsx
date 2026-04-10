import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { gradeService } from '../../services';
import { useAuthStore } from '../../hooks/useAuthStore';
import { Award, Plus, X } from 'lucide-react';
import type { StudentGradeSummary, User, Grade, GradeType } from '../../types';

interface Ctx { classId: string; user: User }

export default function ClassGradesTab() {
  const { classId, user } = useOutletContext<Ctx>();
  const { user: authUser } = useAuthStore();
  const [summaries, setSummaries] = useState<StudentGradeSummary[]>([]);
  const [myGrades, setMyGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ student_id: '', type: 'midterm' as GradeType, grade: '', max_grade: '40' });

  useEffect(() => {
    if (user.role === 'doctor') {
      gradeService.getByClass(classId).then(r => setSummaries(r.data)).finally(() => setLoading(false));
    } else if (authUser) {
      gradeService.getStudentClassGrades(classId, authUser.user_id).then(r => setMyGrades(r.data)).finally(() => setLoading(false));
    }
  }, [classId, user.role, authUser]);

  const handleAdd = async () => {
    await gradeService.addGrade({ class_id: classId, student_id: form.student_id, type: form.type, grade: Number(form.grade), max_grade: Number(form.max_grade) });
    gradeService.getByClass(classId).then(r => setSummaries(r.data));
    setShowAdd(false);
    setForm({ student_id: '', type: 'midterm', grade: '', max_grade: '40' });
  };

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  // Student view
  if (user.role === 'student') {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <h2 className="text-lg font-semibold text-surface-800">My Grades</h2>
        {myGrades.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {myGrades.map((g, i) => (
              <div key={i} className="card p-4 animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="badge bg-primary-50 text-primary-700 capitalize">{g.type}</span>
                  <span className="text-xs text-surface-400">{new Date(g.generated_at).toLocaleDateString()}</span>
                </div>
                <div className="text-3xl font-bold text-surface-900">{g.grade}<span className="text-lg text-surface-400">/{g.max_grade}</span></div>
                <div className="mt-2 h-2 bg-surface-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all" style={{ width: `${(g.grade / g.max_grade) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-12 text-center">
            <Award size={48} className="mx-auto text-surface-300 mb-4" />
            <h3 className="text-lg font-semibold text-surface-700">No Grades Yet</h3>
          </div>
        )}
      </div>
    );
  }

  // Doctor view
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-surface-800">Grade Management</h2>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-sm flex items-center gap-2">
          <Plus size={16} /> Add Grade
        </button>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Grade</h3>
              <button onClick={() => setShowAdd(false)} className="p-1 hover:bg-surface-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })} placeholder="Student ID" className="input-field" />
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
              <button onClick={handleAdd} className="btn-primary w-full">Add Grade</button>
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Student</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Midterm</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Project</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Practical</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Attendance</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500 uppercase">Total</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500 uppercase">GPA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {summaries.map((s, i) => (
              <tr key={i} className="hover:bg-surface-50/50 animate-fade-in">
                <td className="px-4 py-3 font-medium text-sm text-surface-800">{s.student_name}</td>
                <td className="px-4 py-3 text-center text-sm text-surface-600">{s.midterm ?? '—'}</td>
                <td className="px-4 py-3 text-center text-sm text-surface-600">{s.project ?? '—'}</td>
                <td className="px-4 py-3 text-center text-sm text-surface-600">{s.practical ?? '—'}</td>
                <td className="px-4 py-3 text-center text-sm text-surface-600">{s.attendance_grade ?? '—'}</td>
                <td className="px-4 py-3 text-center font-semibold text-surface-800">{s.total}</td>
                <td className="px-4 py-3 text-center"><span className="badge bg-primary-50 text-primary-700">{s.gpa.toFixed(1)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {summaries.length === 0 && (
        <div className="card p-12 text-center">
          <Award size={48} className="mx-auto text-surface-300 mb-4" />
          <h3 className="text-lg font-semibold text-surface-700">No Grades Added Yet</h3>
        </div>
      )}
    </div>
  );
}
