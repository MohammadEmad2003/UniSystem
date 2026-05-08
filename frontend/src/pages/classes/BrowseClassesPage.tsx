import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../hooks/useAuthStore';
import { classService, adminService, studentService } from '../../services';
import { Users, Search, Plus, Check, ArrowRight, Trash2, Clock, Info } from 'lucide-react';
import type { Class, Student } from '../../types';

export default function BrowseClassesPage() {
  const { user } = useAuthStore();
  const [allClasses, setAllClasses] = useState<Class[]>([]);
  const [enrolledClasses, setEnrolledClasses] = useState<Class[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Semesters and Limits
  const [semesterLimits, setSemesterLimits] = useState<any[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>('Fall');
  const [studentStats, setStudentStats] = useState<any>(null);

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [all, mine, limits, stats] = await Promise.all([
        classService.getAll(),
        classService.getByStudent(user.user_id),
        adminService.getAcademicLevelFees(),
        studentService.getStats(user.user_id)
      ]);
      setAllClasses(all.data ?? []);
      setEnrolledClasses(mine.data ?? []);
      setEnrolledIds(new Set((mine.data ?? []).map((c: Class) => String(c.class_id))));
      setSemesterLimits(limits.data as any[]);
      setStudentStats(stats.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.user_id]);

  const handleEnroll = async (classId: string) => {
    if (!user) return;
    setBusy(classId);
    setError(null);
    try {
      await classService.enrollStudent(classId, user.user_id);
      await refresh();
    } catch (e: any) {
      // Extract error message from response if available
      const msg = e.response?.data?.message?.msg || e.message || 'Enrollment failed';
      setError(msg);
    } finally {
      setBusy(null);
    }
  };

  const handleDrop = async (classId: string) => {
    if (!user) return;
    setBusy(`drop-${classId}`);
    setError(null);
    try {
      await classService.dropStudent(classId, user.user_id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Drop failed');
    } finally {
      setBusy(null);
    }
  };

  // Calculate current hours for selected semester
  const semesterEnrolledClasses = enrolledClasses.filter(c => c.semester === selectedSemester);
  const currentHours = semesterEnrolledClasses.reduce((sum, c) => sum + (c.credit_hours || 0), 0);

  // Get limit for selected semester
  const limitConfig = semesterLimits.find(l => l.Semester === selectedSemester && l.Academic_Level === (user as Student)?.academic_level);
  let maxHours = limitConfig?.Max_Hours || 18;

  // Apply Overload/Probation logic based on real-time GPA
  const currentGPA = studentStats?.gpa || 0;
  if (currentGPA >= 3.4) maxHours = 21;
  else if (currentGPA < 2.0 && currentGPA > 0) maxHours = 12;
  else maxHours = 18; // Default if not config found or standard GPA

  const filtered = allClasses.filter(c => {
    const semMatch = c.semester === selectedSemester;
    if (!semMatch) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.course_name?.toLowerCase().includes(q) ||
      c.course_code?.toLowerCase().includes(q) ||
      c.doctor_name?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row items-start justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Registration Center</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1 font-medium italic">Level {(user as Student)?.academic_level} — {(user as Student)?.department_id}</p>
        </div>
        <div className="relative w-full max-w-md">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by course or instructor..."
            className="input-field w-full pl-12 py-3.5 shadow-xl shadow-slate-200/50 dark:shadow-none"
          />
        </div>
      </div>

      {/* Semester & Hour Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Academic Term</h3>
          <div className="flex p-1.5 bg-slate-100 dark:bg-[#050b14] rounded-2xl border border-slate-200 dark:border-slate-800">
            {['Fall', 'Spring', 'Summer'].map(sem => (
              <button
                key={sem}
                onClick={() => setSelectedSemester(sem)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${selectedSemester === sem
                    ? 'bg-white dark:bg-[#0a192f] text-primary-600 shadow-md dark:text-white'
                    : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                {sem}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 card p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 transform group-hover:scale-110 transition-transform">
            <Clock size={120} />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                <Clock size={32} className="text-primary-400" />
              </div>
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Enrolled Hours ({selectedSemester})</p>
                <p className="text-3xl font-black">{currentHours} <span className="text-lg font-normal opacity-40">/ {maxHours} hrs</span></p>
              </div>
            </div>

            <div className="w-full md:w-64 space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase">
                <span className="text-slate-400">Load</span>
                <span>{Math.round((currentHours / maxHours) * 100)}%</span>
              </div>
              <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/5">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${currentHours >= maxHours ? 'bg-rose-500' :
                      currentHours >= maxHours - 3 ? 'bg-amber-500' : 'bg-primary-500'
                    }`}
                  style={{ width: `${Math.min(100, (currentHours / maxHours) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-3 animate-shake">
          <Info size={20} />
          <p className="font-bold text-sm">{error}</p>
        </div>
      )}

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(cls => {
          const id = String(cls.class_id);
          const isFull = (cls.enrolled_count ?? 0) >= cls.capacity;
          const isEnrolled = enrolledIds.has(id);
          const isEnrolling = busy === id;
          const isDropping = busy === `drop-${id}`;
          const reachesLimit = currentHours + (cls.credit_hours || 0) > maxHours;

          return (
            <div key={id} className={`card p-6 flex flex-col gap-4 group transition-all hover:shadow-2xl hover:-translate-y-1 ${isEnrolled ? 'border-primary-500/30 bg-primary-500/5' : ''}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-black text-xl text-slate-800 dark:text-white group-hover:text-primary-500 transition-colors leading-tight">{cls.course_name}</h3>
                  <p className="text-xs font-mono text-slate-400 uppercase tracking-widest mt-1">{cls.course_code}</p>
                </div>
                <div className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-black text-slate-500 dark:text-slate-400">
                  {cls.credit_hours}H
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                  <span className="text-[10px] font-bold text-slate-500">{cls.doctor_name?.[0]}</span>
                </div>
                <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{cls.doctor_name}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${isFull ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                  {cls.enrolled_count ?? 0} / {cls.capacity} Seats
                </span>
                <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Level {cls.level}
                </span>
              </div>

              <div className="mt-4 flex items-center gap-3">
                {isEnrolled ? (
                  <>
                    <Link
                      to={`/classes/${id}/stream`}
                      className="flex-1 btn-secondary py-3 flex items-center justify-center gap-2 text-xs font-bold"
                    >
                      <Check size={16} /> ENTER CLASS
                    </Link>
                    <button
                      onClick={() => handleDrop(id)}
                      disabled={isDropping}
                      className="w-12 h-12 flex items-center justify-center rounded-xl border-2 border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white transition-all disabled:opacity-50"
                    >
                      {isDropping ? <div className="w-4 h-4 border-2 border-rose-300 border-t-rose-600 rounded-full animate-spin" /> : <Trash2 size={18} />}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleEnroll(id)}
                    disabled={isFull || isEnrolling || reachesLimit}
                    className={`flex-1 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${reachesLimit ? 'bg-slate-100 text-slate-400 cursor-not-allowed' :
                        isFull ? 'bg-rose-100 text-rose-400' : 'bg-primary-500 text-white shadow-lg shadow-primary-500/30 active:scale-95'
                      }`}
                  >
                    {isEnrolling ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :
                      reachesLimit ? 'Hour Limit' :
                        isFull ? 'Class Full' : <><Plus size={18} /> Enroll Now</>}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && !error && (
        <div className="card p-20 text-center flex flex-col items-center gap-4">
          <Search size={48} className="text-slate-200" />
          <p className="text-slate-500 font-bold">No classes available for {selectedSemester} yet.</p>
        </div>
      )}
    </div>
  );
}
