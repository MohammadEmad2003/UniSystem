import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../hooks/useAuthStore';
import { doctorService, classService } from '../../services';
import { BookOpen, Users, Video, FileText, ArrowRight, MessageSquare, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { DoctorStats, Class } from '../../types';
import { DashboardSkeleton } from '../../components/ui/Skeleton';

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

  if (loading) return <DashboardSkeleton />;

  const statCards = [
    { label: 'My Classes', value: stats?.total_classes || 0, icon: BookOpen, color: 'from-primary-500 to-primary-600' },
    { label: 'Total Students', value: stats?.total_students || 0, icon: Users, color: 'from-emerald-500 to-emerald-600' },
    { label: 'Lectures Created', value: stats?.total_lectures || 0, icon: Video, color: 'from-violet-500 to-violet-600' },
    { label: 'Materials Uploaded', value: stats?.total_materials || 0, icon: FileText, color: 'from-amber-500 to-amber-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-bold drop-shadow-md">Welcome, Dr. {user?.l_name}! </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Manage your classes and students</p>
        </div>
        <div className="text-sm font-medium bg-[#00b8d4]/10 text-[#00b8d4] px-4 py-2 rounded-xl border border-[#00b8d4]/20 flex items-center gap-2 animate-pulse">
          <MessageSquare size={16} /> {stats?.recent_questions || 0} Unanswered Questions
        </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrollment Chart */}
        <div className="card p-6 border-none bg-white dark:bg-[#0a192f] shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white">Students per Class</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">Enrollment distribution across your classes</p>
            </div>
            <div className="p-2 rounded-lg bg-primary-500/10">
              <Users size={18} className="text-primary-500" />
            </div>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.class_enrollment_data || []}>
                <defs>
                  <linearGradient id="enrollGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00b8d4" stopOpacity={1} />
                    <stop offset="100%" stopColor="#0097a7" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  tick={{fontSize: 11, fontWeight: 'bold'}} 
                  stroke="#94a3b8" 
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{fontSize: 11, fontWeight: 'bold'}} 
                  stroke="#94a3b8" 
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                  contentStyle={{
                    borderRadius: "16px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                    padding: "12px"
                  }}
                />
                <Bar dataKey="students" name="Students" fill="url(#enrollGrad)" radius={[6, 6, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Upcoming Lectures */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Upcoming Lectures</h2>
            <Calendar size={20} className="text-[#00b8d4]" />
          </div>
          <div className="space-y-3">
            {stats?.upcoming_lectures.length ? stats.upcoming_lectures.map((lec, i) => (
              <div key={lec.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-[#050b14] border border-slate-200 dark:border-slate-800 hover:bg-surface-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-500 font-bold text-xs">
                    {lec.course}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{lec.title}</p>
                    <p className="text-xs text-slate-500">{new Date(lec.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                  </div>
                </div>
                <Link to={`/classes`} className="p-2 hover:bg-white rounded-lg text-primary-500 transition-colors">
                  <ArrowRight size={16} />
                </Link>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center h-full py-8 text-slate-500">
                <Calendar size={40} className="mb-2 opacity-20" />
                <p>No upcoming lectures scheduled</p>
              </div>
            )}
          </div>
        </div>
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


