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
          <h1 className="text-2xl font-bold text-surface-900">Browse Classes</h1>
          <p className="text-surface-500 mt-1">Enroll or drop classes</p>
        </div>
        <div className="relative w-full max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by course, code, or instructor"
            className="w-full pl-9 pr-3 py-2 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
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
                <h3 className="font-bold text-surface-900">{cls.course_name}</h3>
                <p className="text-sm text-surface-500">{cls.course_code}</p>
              </div>
              <div className="text-sm text-surface-600">{cls.doctor_name}</div>
              <div className="flex items-center gap-3 text-xs text-surface-500">
                <span className="flex items-center gap-1"><Users size={14} /> {cls.enrolled_count ?? 0}/{cls.capacity}</span>
                <span className="badge bg-primary-50 text-primary-700">{cls.semester}</span>
                <span className="badge bg-surface-100 text-surface-600">Level {cls.level}</span>
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
                      className="p-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
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
        <div className="card p-12 text-center text-surface-500">No classes match your search.</div>
      )}
    </div>
  );
}
