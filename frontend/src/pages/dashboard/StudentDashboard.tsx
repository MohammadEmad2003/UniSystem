import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../hooks/useAuthStore';
import { studentService, classService } from '../../services';
import { BookOpen, Clock, TrendingUp, Award, ArrowRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { StudentStats, Class, Student } from '../../types';

const gpaHistory = [
  { sem: 'Fall 22', gpa: 3.1 }, { sem: 'Spr 23', gpa: 3.3 },
  { sem: 'Fall 23', gpa: 3.2 }, { sem: 'Spr 24', gpa: 3.5 },
  { sem: 'Fall 24', gpa: 3.4 }, { sem: 'Spr 25', gpa: 3.45 },
];

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [gpaData, setGpaData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      studentService.getStats(user.user_id),
      classService.getByStudent(user.user_id),
      studentService.getTranscript(user.user_id),
    ]).then(([s, c, t]) => {
      setStats(s.data);
      setClasses(c.data);
      
      // Transform transcript data for the chart
      const chartData = Object.entries(t.data || {}).map(([key, val]: any) => ({
        sem: key.replace('Level ', 'L'),
        gpa: parseFloat(val.semesterGPA)
      }));
      setGpaData(chartData);
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
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Welcome back, {user?.f_name}! </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1 font-medium italic">Level {(user as Student)?.academic_level} — {(user as Student)?.department_id}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <div key={i} className="animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
            {s.label === 'GPA' ? (
              <Link to="/transcript" className="block card p-5 border-none bg-white dark:bg-[#0a192f] hover:shadow-2xl hover:-translate-y-1 transition-all group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">{s.label}</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{s.value}</p>
                    <p className="text-[10px] text-primary-500 font-bold mt-2 group-hover:translate-x-1 transition-transform flex items-center gap-1">View Full Transcript <ArrowRight size={10} /></p>
                  </div>
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-lg`}>
                    <s.icon size={28} className="text-white" />
                  </div>
                </div>
              </Link>
            ) : (
              <div className="card p-5 border-none bg-white dark:bg-[#0a192f]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">{s.label}</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{s.value}</p>
                  </div>
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-lg`}>
                    <s.icon size={28} className="text-white" />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GPA Chart */}
        <div className="lg:col-span-2 card p-6 border-none bg-white dark:bg-[#0a192f] shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white">Academic Performance</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">Semester-wise GPA progression</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-500/10 text-primary-600 text-[10px] font-black uppercase">
               <TrendingUp size={14} /> Peak GPA: {Math.max(...gpaData.map(d => d.gpa), 0).toFixed(2)}
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={gpaData}>
              <defs>
                <linearGradient id="gpaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="sem" 
                tick={{ fontSize: 11, fontWeight: 'bold' }} 
                stroke="#94a3b8" 
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis 
                domain={[0, 4]} 
                tick={{ fontSize: 11, fontWeight: 'bold' }} 
                stroke="#94a3b8" 
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '16px', 
                  border: 'none',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                  padding: '12px'
                }} 
              />
              <Area 
                type="monotone" 
                dataKey="gpa" 
                stroke="#3b82f6" 
                strokeWidth={4} 
                fill="url(#gpaGrad)" 
                animationDuration={2000}
                dot={{ r: 6, fill: '#3b82f6', strokeWidth: 3, stroke: '#fff' }}
                activeDot={{ r: 8, fill: '#3b82f6', strokeWidth: 0 }}
              />
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


