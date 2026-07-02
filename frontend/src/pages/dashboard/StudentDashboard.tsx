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
  const [transcriptData, setTranscriptData] = useState<any>(null);
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
      setTranscriptData(t.data);

      // Transform transcript data for the chart
      const chartData = Object.entries(t.data?.transcript || {}).map(([key, val]: any) => ({
        sem: key.replace('Level ', 'L'),
        gpa: parseFloat(val.semesterGPA) || 0
      }));
      setGpaData(chartData);
    }).finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  // Get academic standing from transcript data
  const academicStanding = transcriptData?.academicStanding || 'No Grades Yet';
  const standingColor = transcriptData?.standingColor || 'gray';
  const cumulativeGPA = transcriptData?.cumulativeGPA || 0;
  const honorRoll = transcriptData?.honorRoll || false;
  const totalFailedCourses = transcriptData?.totalFailedCourses || 0;

  // Calculate Peak GPA safely
  const peakGpa = gpaData.length > 0 ? Math.max(...gpaData.map(d => d.gpa || 0)) : 0;

  const statCards = [
    { label: 'GPA', value: stats?.gpa?.toFixed(2) || '0.00', icon: TrendingUp, color: 'from-primary-500 to-primary-600' },
    { label: 'Credit Hours', value: stats?.total_hours || 0, icon: Clock, color: 'from-emerald-500 to-emerald-600' },
    { label: 'Enrolled Classes', value: stats?.enrolled_classes || 0, icon: BookOpen, color: 'from-violet-500 to-violet-600' },
    { label: 'Upcoming Lectures', value: stats?.upcoming_lectures || 0, icon: Award, color: 'from-amber-500 to-amber-600' },
  ];

  // Color mapping for academic standing flags returned by backend
  const standingColors = {
    gold: 'from-amber-400 to-amber-500',
    blue: 'from-blue-400 to-blue-500',
    green: 'from-emerald-400 to-emerald-500',
    orange: 'from-orange-400 to-orange-500',
    red: 'from-red-400 to-red-500',
    gray: 'from-slate-400 to-slate-500'
  };

  const standingBgColor = standingColors[standingColor as keyof typeof standingColors] || 'from-slate-400 to-slate-500';

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
                    <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{cumulativeGPA.toFixed(2)}</p>
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

      {/* Academic Standing Banner */}
      <div className={`card p-4 border-none bg-gradient-to-r ${standingBgColor} text-white shadow-lg animate-slide-up`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Award size={24} className="text-white" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-90">Academic Standing</p>
              <p className="text-lg font-black">{academicStanding}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {honorRoll && (
              <div className="flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full">
                <Award size={14} />
                <span className="text-xs font-bold">Honor Roll</span>
              </div>
            )}
            {totalFailedCourses > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full">
                <span className="text-xs font-bold">{totalFailedCourses} Failed Course{totalFailedCourses > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>
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
              <TrendingUp size={14} /> Peak GPA: {peakGpa.toFixed(2)}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={gpaData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gpaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00e5ff" stopOpacity={0.5} />
                  <stop offset="50%" stopColor="#00b8d4" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#00b8d4" stopOpacity={0} />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
              <XAxis
                dataKey="sem"
                tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                dy={15}
              />
              <YAxis
                domain={[0, 4]}
                tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                dx={-10}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '16px',
                  border: '1px solid rgba(0, 229, 255, 0.2)',
                  backgroundColor: 'rgba(10, 25, 47, 0.9)',
                  backdropFilter: 'blur(8px)',
                  boxShadow: '0 10px 25px -5px rgba(0, 229, 255, 0.15)',
                  padding: '12px 20px',
                  color: '#fff',
                  fontWeight: 'bold'
                }}
                itemStyle={{ color: '#00e5ff' }}
                cursor={{ stroke: 'rgba(0, 229, 255, 0.2)', strokeWidth: 2, strokeDasharray: '5 5' }}
              />
              <Area
                type="monotone"
                dataKey="gpa"
                stroke="#00e5ff"
                strokeWidth={5}
                fill="url(#gpaGrad)"
                animationDuration={2500}
                filter="url(#glow)"
                dot={{ r: 6, fill: '#0a192f', strokeWidth: 3, stroke: '#00e5ff' }}
                activeDot={{ r: 8, fill: '#00e5ff', strokeWidth: 4, stroke: '#fff', style: { filter: 'drop-shadow(0px 0px 8px rgba(0,229,255,0.8))' } }}
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


