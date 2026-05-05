import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../hooks/useAuthStore';
import { studentService, classService } from '../../services';
import { BookOpen, Clock, TrendingUp, Award, ArrowRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { StudentStats, Class } from '../../types';

const gpaHistory = [
  { sem: 'Fall 22', gpa: 3.1 }, { sem: 'Spr 23', gpa: 3.3 },
  { sem: 'Fall 23', gpa: 3.2 }, { sem: 'Spr 24', gpa: 3.5 },
  { sem: 'Fall 24', gpa: 3.4 }, { sem: 'Spr 25', gpa: 3.45 },
];

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      studentService.getStats(user.user_id),
      classService.getByStudent(user.user_id),
    ]).then(([s, c]) => {
      setStats(s.data);
      setClasses(c.data);
    }).finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  const statCards = [
    { label: 'GPA', value: stats?.gpa?.toFixed(2) || '0.00', icon: TrendingUp, color: 'from-primary-500 to-primary-600' },
    { label: 'Credit Hours', value: stats?.total_hours || 0, icon: Clock, color: 'from-emerald-500 to-emerald-600' },
    { label: 'Enrolled Classes', value: stats?.enrolled_classes || 0, icon: BookOpen, color: 'from-violet-500 to-violet-600' },
    { label: 'Upcoming Lectures', value: stats?.upcoming_lectures || 0, icon: Award, color: 'from-amber-500 to-amber-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-bold drop-shadow-md">Welcome back, {user?.f_name}! 👋</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Here's your academic overview</p>
      </div>

      {/* Stats Grid */}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GPA Chart */}
        <div className="lg:col-span-2 card p-6">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">GPA Trend</h2>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={gpaHistory}>
              <defs>
                <linearGradient id="gpaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="sem" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis domain={[0, 4]} tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
              <Area type="monotone" dataKey="gpa" stroke="#3b82f6" strokeWidth={2.5} fill="url(#gpaGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* My Classes Quick List */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">My Classes</h2>
            <Link to="/classes" className="text-sm text-[#00b8d4] hover:text-[#00e5ff] font-medium flex items-center gap-1">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {classes.slice(0, 4).map(cls => (
              <Link
                key={cls.class_id}
                to={`/classes/${cls.class_id}/stream`}
                className="block p-3 rounded-xl hover:bg-slate-100 dark:bg-[#050b14] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#00e5ff]/10 flex items-center justify-center text-[#00b8d4] font-bold text-xs">
                    {cls.course_code?.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-[#00b8d4] transition-colors">{cls.course_name}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{cls.doctor_name}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


