import { useState, useEffect } from 'react';
import { useAuthStore } from '../../hooks/useAuthStore';
import { studentService } from '../../services';
import { 
  GraduationCap, 
  Calendar, 
  BookOpen, 
  TrendingUp, 
  Download,
  Award,
  ChevronRight,
  Printer
} from 'lucide-react';

interface TranscriptCourse {
  course_code: string;
  course_name: string;
  credit_hours: number;
  gpa: number;
  letter?: string;
  max_grade?: number;
  midterm: number;
  project: number;
  practical: number;
  attendance: number;
  final: number | null;
}

interface SemesterRecord {
  semester: string;
  level: number;
  courses: TranscriptCourse[];
  semesterGPA: string;
  totalHours: number;
  totalPoints: number;
}

type TranscriptData = Record<string, SemesterRecord>;

export default function TranscriptPage() {
  const { user } = useAuthStore();
  const [transcript, setTranscript] = useState<TranscriptData | null>(null);
  const [cumulativeGPA, setCumulativeGPA] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    studentService.getTranscript(user.user_id)
      .then(res => {
        if (res.success) {
          setTranscript(res.data.transcript || null);
          setCumulativeGPA(res.data.cumulativeGPA || 0);
          setTotalHours(res.data.totalHours || 0);
        } else {
          throw new Error(res.message);
        }
      })
      .catch(() => setError('Failed to load academic transcript'))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  if (error) return (
    <div className="card p-12 text-center">
      <Award size={48} className="mx-auto text-slate-300 mb-4" />
      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">{error}</h3>
      <p className="text-slate-500 mt-2">Please contact student affairs if the problem persists.</p>
    </div>
  );

  const semesters = Object.keys(transcript || {}).sort((a, b) => {
     // Sort by level then semester (Fall < Spring)
     const levelA = parseInt(a.match(/Level (\d+)/)?.[1] || '0');
     const levelB = parseInt(b.match(/Level (\d+)/)?.[1] || '0');
     if (levelA !== levelB) return levelA - levelB;
     return a.includes('Fall') ? -1 : 1;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary-600 flex items-center justify-center text-white shadow-xl shadow-primary-500/20">
            <GraduationCap size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white drop-shadow-sm font-bold">Academic Transcript</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Official record of your university performance</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2 border-2">
            <Printer size={18} /> Print
          </button>
          <button onClick={() => window.print()} className="btn-primary flex items-center gap-2 shadow-lg shadow-primary-500/20">
            <Download size={18} /> Download PDF
          </button>
        </div>
      </div>

      {/* Profile Overview Card */}
      <div className="card p-6 border-none shadow-xl bg-gradient-to-r from-primary-600 to-indigo-700 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8">
           <div className="space-y-1">
             <p className="text-primary-100 text-xs font-bold uppercase tracking-widest">Student Name</p>
             <p className="text-xl font-bold">{user?.f_name} {user?.l_name}</p>
           </div>
           <div className="space-y-1">
             <p className="text-primary-100 text-xs font-bold uppercase tracking-widest">Cumulative GPA</p>
             <div className="flex items-center gap-2">
               <p className="text-3xl font-black">{cumulativeGPA.toFixed(2)}</p>
               <TrendingUp size={20} className="text-emerald-400" />
             </div>
           </div>
           <div className="space-y-1">
             <p className="text-primary-100 text-xs font-bold uppercase tracking-widest">Total Earned Hours</p>
             <p className="text-3xl font-black">
               {totalHours} <span className="text-lg font-normal opacity-70">hrs</span>
             </p>
           </div>
        </div>
      </div>

      {/* Transcript Body */}
      <div className="space-y-8 print:space-y-4">
        {semesters.length === 0 ? (
          <div className="card p-12 text-center border-dashed border-2">
             <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
             <p className="text-slate-500 font-medium text-lg">No records found. Start your academic journey by registering for classes.</p>
          </div>
        ) : (
          semesters.map((key) => {
            const sem = transcript![key] as SemesterRecord;
            return (
              <div key={key} className="space-y-4 animate-slide-up">
                <div className="flex items-center justify-between px-2">
                   <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-500">
                        <Calendar size={18} />
                     </div>
                     <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{key}</h2>
                   </div>
                   <div className="flex gap-4">
                      <div className="text-right">
                         <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Semester GPA</p>
                         <p className="text-lg font-black text-primary-600 dark:text-primary-400">{sem.semesterGPA}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Hours</p>
                         <p className="text-lg font-black text-slate-700 dark:text-slate-300">{sem.totalHours}</p>
                      </div>
                   </div>
                </div>

                <div className="card overflow-hidden p-0 border-slate-200 dark:border-slate-800 shadow-lg">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-[#050b14] border-b border-slate-200 dark:border-slate-800">
                        <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider">Course</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider text-center">Hours</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider text-center">Grade</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider text-center">Letter</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider text-right">Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {sem.courses.map((c: TranscriptCourse) => (
                        <tr key={c.course_code} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-200">{c.course_name}</p>
                              <p className="text-xs text-slate-500 font-mono">{c.course_code}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-slate-600 dark:text-slate-400">
                            {c.credit_hours}
                          </td>
                          <td className="px-6 py-4 text-center">
                             {c.final !== null ? (
                               <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-black text-sm ${
                                 c.gpa >= 3.7 ? 'bg-emerald-500/10 text-emerald-600' :
                                 c.gpa >= 2.0 ? 'bg-primary-500/10 text-primary-600' : 'bg-rose-500/10 text-rose-600'
                               }`}>
                                 {c.gpa.toFixed(1)}
                               </span>
                             ) : (
                               <span className="text-xs font-bold text-amber-500 uppercase tracking-widest italic bg-amber-500/10 px-3 py-1 rounded-full">In Progress</span>
                             )}
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-200">
                            {c.letter || '—'}
                          </td>
                          <td className="px-6 py-4 text-right">
                             <p className="font-black text-slate-800 dark:text-slate-200">
                               {c.final !== null ? (c.gpa * c.credit_hours).toFixed(2) : '-'}
                             </p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer / Instructions */}
      <div className="text-center pt-8 border-t border-slate-200 dark:border-slate-800">
        <p className="text-xs text-slate-400 leading-relaxed max-w-2xl mx-auto italic">
          This transcript is an unofficial document provided for student reference. Official transcripts for external use must be requested from the University Registrar's office and bear the official seal.
        </p>
      </div>
    </div>
  );
}
