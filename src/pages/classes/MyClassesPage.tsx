import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../hooks/useAuthStore';
import { classService } from '../../services';
import { Users, BookOpen, ArrowRight } from 'lucide-react';
import type { Class } from '../../types';

const gradients = [
  'from-primary-500 to-primary-700', 'from-violet-500 to-violet-700',
  'from-emerald-500 to-emerald-700', 'from-amber-500 to-amber-700',
  'from-rose-500 to-rose-700', 'from-cyan-500 to-cyan-700',
];

export default function MyClassesPage() {
  const { user } = useAuthStore();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = user.role === 'doctor'
      ? classService.getByDoctor(user.user_id)
      : classService.getByStudent(user.user_id);
    fetch.then(res => setClasses(res.data)).finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">My Classes</h1>
        <p className="text-surface-500 mt-1">{user?.role === 'doctor' ? 'Classes you are teaching' : 'Classes you are enrolled in'}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {classes.map((cls, i) => (
          <Link
            key={cls.class_id}
            to={`/classes/${cls.class_id}/stream`}
            className="card overflow-hidden group animate-slide-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            {/* Color header */}
            <div className={`h-28 bg-gradient-to-br ${gradients[i % gradients.length]} p-5 flex flex-col justify-end`}>
              <h3 className="text-lg font-bold text-white truncate">{cls.course_name}</h3>
              <p className="text-white/80 text-sm">{cls.course_code}</p>
            </div>
            <div className="p-5">
              <p className="text-sm text-surface-600 mb-3">{cls.doctor_name}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-surface-500">
                  <span className="flex items-center gap-1"><Users size={14} /> {cls.enrolled_count}/{cls.capacity}</span>
                  <span className="badge bg-primary-50 text-primary-700">{cls.semester}</span>
                  <span className="badge bg-surface-100 text-surface-600">Level {cls.level}</span>
                </div>
                <ArrowRight size={16} className="text-surface-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {classes.length === 0 && (
        <div className="card p-12 text-center">
          <BookOpen size={48} className="mx-auto text-surface-300 mb-4" />
          <h3 className="text-lg font-semibold text-surface-700">No Classes Yet</h3>
          <p className="text-surface-500 mt-1">{user?.role === 'student' ? 'You haven\'t enrolled in any classes yet.' : 'You haven\'t been assigned any classes.'}</p>
        </div>
      )}
    </div>
  );
}
