import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../hooks/useAuthStore';
import { doctorService, classService } from '../../services';
import { BookOpen, Users, Video, FileText, ArrowRight, MessageSquare } from 'lucide-react';
import type { DoctorStats, Class } from '../../types';

export default function DoctorDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DoctorStats | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      doctorService.getStats(user.user_id),
      classService.getByDoctor(user.user_id),
    ]).then(([s, c]) => {
      setStats(s.data);
      setClasses(c.data);
    }).finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  const statCards = [
    { label: 'My Classes', value: stats?.total_classes || 0, icon: BookOpen, color: 'from-primary-500 to-primary-600' },
    { label: 'Total Students', value: stats?.total_students || 0, icon: Users, color: 'from-emerald-500 to-emerald-600' },
    { label: 'Lectures Created', value: stats?.total_lectures || 0, icon: Video, color: 'from-violet-500 to-violet-600' },
    { label: 'Materials Uploaded', value: stats?.total_materials || 0, icon: FileText, color: 'from-amber-500 to-amber-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-bold drop-shadow-md">Welcome, Dr. {user?.l_name}! 👋</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Manage your classes and students</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <div key={i} className="card p-5 animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{s.label}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white font-bold drop-shadow-md mt-1">{s.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center`}>
                <s.icon size={22} className="text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Teaching Classes */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Teaching Classes</h2>
          <Link to="/classes" className="text-sm text-[#00b8d4] hover:text-[#00e5ff] font-medium flex items-center gap-1">
            View All <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map(cls => (
            <Link
              key={cls.class_id}
              to={`/classes/${cls.class_id}/stream`}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-primary-200 hover:bg-[#00e5ff]/10/50 transition-all group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-sm">
                  {cls.course_code?.slice(0, 4)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-[#00b8d4] transition-colors">{cls.course_name}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{cls.semester} • Level {cls.level}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1"><Users size={14} /> {cls.enrolled_count}/{cls.capacity}</span>
                <span className="flex items-center gap-1"><MessageSquare size={14} /> Active</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}


