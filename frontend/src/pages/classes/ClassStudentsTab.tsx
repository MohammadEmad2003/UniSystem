import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { classService } from '../../services';
import { Users, GraduationCap, Mail } from 'lucide-react';
import type { Student, User } from '../../types';

interface Ctx { classId: string; user: User }

export default function ClassStudentsTab() {
  const { classId } = useOutletContext<Ctx>();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    classService.getStudents(classId).then(r => setStudents(r.data as Student[])).finally(() => setLoading(false));
  }, [classId]);

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Enrolled Students ({students.length})</h2>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-100 dark:bg-[#050b14]">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Student</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Level</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">GPA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {students.map((s, i) => (
              <tr key={s.user_id} className="hover:bg-slate-100 dark:bg-[#050b14]/50 transition-colors animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold text-xs">
                      {(s.f_name?.[0] || '?').toUpperCase()}{(s.l_name?.[0] || '').toUpperCase()}
                    </div>
                    <span className="font-medium text-sm text-slate-800 dark:text-slate-200">{s.f_name || ''} {s.l_name || ''}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1"><Mail size={14} /> {s.email || ''}</td>
                <td className="px-4 py-3"><span className="badge bg-[#00e5ff]/10 text-[#00e5ff]">Level {s.academic_level || 0}</span></td>
                <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">{(Number(s.total_gpa) || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {students.length === 0 && (
        <div className="card p-12 text-center">
          <Users size={48} className="mx-auto text-surface-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">No Students Enrolled</h3>
        </div>
      )}
    </div>
  );
}


