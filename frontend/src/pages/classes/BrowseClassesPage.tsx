import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../hooks/useAuthStore';
import { classService } from '../../services';
import { Users, Search, Plus, Check, ArrowRight, Trash2 } from 'lucide-react';
import type { Class } from '../../types';

export default function BrowseClassesPage() {
  const { user } = useAuthStore();
  const [allClasses, setAllClasses] = useState<Class[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [all, mine] = await Promise.all([
        classService.getAll(),
        classService.getByStudent(user.user_id),
      ]);
      setAllClasses(all.data ?? []);
      setEnrolledIds(new Set((mine.data ?? []).map((c: Class) => String(c.class_id))));
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enrollment failed');
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

  const filtered = allClasses.filter(c => {
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
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-bold drop-shadow-md">Browse Classes</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Enroll or drop classes</p>
        </div>
        <div className="relative w-full max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by course, code, or instructor"
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#111111]/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#00e5ff] focus:border-[#00e5ff] shadow-inner hover:border-slate-500 transition-colors"
          />
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(cls => {
          const id = String(cls.class_id);
          const isFull = (cls.enrolled_count ?? 0) >= cls.capacity;
          const isEnrolled = enrolledIds.has(id);
          const isEnrolling = busy === id;
          const isDropping = busy === `drop-${id}`;

          return (
            <div key={id} className="card p-5 flex flex-col gap-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white font-bold drop-shadow-md">{cls.course_name}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{cls.course_code}</p>
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">{cls.doctor_name}</div>
              <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1"><Users size={14} /> {cls.enrolled_count ?? 0}/{cls.capacity}</span>
                <span className="badge bg-[#00e5ff]/10 text-[#00e5ff]">{cls.semester}</span>
                <span className="badge bg-surface-100 text-slate-600 dark:text-slate-400">Level {cls.level}</span>
              </div>

              <div className="mt-auto flex items-center gap-2">
                {isEnrolled ? (
                  <>
                    <Link
                      to={`/classes/${id}/stream`}
                      className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm"
                    >
                      <Check size={15} /> Enrolled
                      <ArrowRight size={13} />
                    </Link>
                    <button
                      onClick={() => handleDrop(id)}
                      disabled={isDropping}
                      title="Drop class"
                      className="p-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                    >
                      {isDropping
                        ? <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                        : <Trash2 size={16} />
                      }
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleEnroll(id)}
                    disabled={isFull || isEnrolling}
                    className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isEnrolling
                      ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <><Plus size={16} /> {isFull ? 'Class Full' : 'Enroll'}</>
                    }
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && !error && (
        <div className="card p-12 text-center text-slate-600 dark:text-slate-400">No classes match your search.</div>
      )}
    </div>
  );
}


