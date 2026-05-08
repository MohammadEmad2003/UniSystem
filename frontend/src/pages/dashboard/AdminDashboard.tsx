import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { adminService } from "../../services";
import {
  Users,
  GraduationCap,
  BookOpen,
  Building2,
  FolderOpen,
  ShieldCheck,
  ArrowRight,
  DollarSign,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAuthStore } from "../../hooks/useAuthStore";
import type { AdminStats } from "../../types";

const deptData = [
  { name: "CS", students: 45, doctors: 3 },
  { name: "IS", students: 35, doctors: 2 },
  { name: "AI", students: 28, doctors: 2 },
];

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const pLevel = Number((user as any)?.permissions_level || (user as any)?.Permissions_Level);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService
      .getStats()
      .then((res) => setStats(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );

  const statCards = [
    {
      label: "Total Students",
      value: stats?.total_students || 0,
      icon: GraduationCap,
      color: "from-primary-500 to-primary-600",
    },
    {
      label: "Total Doctors",
      value: stats?.total_doctors || 0,
      icon: Users,
      color: "from-emerald-500 to-emerald-600",
    },
    {
      label: "Total Classes",
      value: stats?.total_classes || 0,
      icon: BookOpen,
      color: "from-violet-500 to-violet-600",
    },
    {
      label: "Departments",
      value: stats?.total_departments || 0,
      icon: Building2,
      color: "from-amber-500 to-amber-600",
    },
    {
      label: "Courses",
      value: stats?.total_courses || 0,
      icon: FolderOpen,
      color: "from-rose-500 to-rose-600",
    },
  ];

  // Only show pending approvals if not Level 1 (Dean) OR if explicitly needed.
  // Actually, the user said it should be removed from the Dean.
  if (pLevel !== 1) {
    statCards.push({
      label: "Pending Approvals",
      value: stats?.pending_approvals || 0,
      icon: ShieldCheck,
      color: stats?.pending_approvals
        ? "from-red-500 to-red-600"
        : "from-green-500 to-green-600",
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-bold drop-shadow-md">
          Admin Dashboard
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          System overview and management
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((s, i) => (
          <div
            key={i}
            className="card p-5 animate-slide-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                  {s.label}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white font-bold drop-shadow-md mt-1">
                  {s.value}
                </p>
              </div>
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center`}
              >
                <s.icon size={22} className="text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department chart */}
        <div className="card p-6 border-none bg-white dark:bg-[#0a192f] shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white">
                Academic Distribution
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1">Student & Staff density per department</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary-500 shadow-sm" />
                <span className="text-[10px] font-bold text-slate-400 uppercase">Students</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm" />
                <span className="text-[10px] font-bold text-slate-400 uppercase">Doctors</span>
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats?.dept_stats || []}>
              <defs>
                <linearGradient id="barGrad1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0.8} />
                </linearGradient>
                <linearGradient id="barGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fontWeight: 'bold' }}
                stroke="#94a3b8"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fontWeight: 'bold' }}
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
              <Bar dataKey="students" name="Students" fill="url(#barGrad1)" radius={[6, 6, 0, 0]} barSize={25} />
              <Bar dataKey="doctors" name="Doctors" fill="url(#barGrad2)" radius={[6, 6, 0, 0]} barSize={25} />
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5" />
              <p className="text-xs text-slate-500 leading-relaxed">
                <strong className="text-slate-700 dark:text-slate-300">Blue Bars (Students):</strong> Represents the total volume of enrolled students in each major. Helps identify high-demand departments.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5" />
              <p className="text-xs text-slate-500 leading-relaxed">
                <strong className="text-slate-700 dark:text-slate-300">Green Bars (Doctors):</strong> Indicates the teaching staff capacity. Used to monitor student-to-doctor ratios for educational quality.
              </p>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="card p-6 border-none bg-white dark:bg-[#0a192f] shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white">
                Quick Actions
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1">Direct access to management modules</p>
            </div>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
              <FolderOpen size={18} className="text-slate-400" />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {/* Critical Alert for Pending Approvals */}
            {stats?.pending_approvals && pLevel !== 1 ? (
              <Link
                to="/admin/approvals"
                className="group relative flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 shadow-lg shadow-red-500/20 hover:scale-[1.02] transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white uppercase tracking-wider">
                      Pending Approvals
                    </p>
                    <p className="text-[10px] text-white/80 font-bold">
                      {stats.pending_approvals} accounts require your immediate review
                    </p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white group-hover:translate-x-1 transition-transform">
                  <ArrowRight size={16} />
                </div>
              </Link>
            ) : null}

            {/* Actions List (Vertical) */}
            <div className="flex flex-col gap-3">
              {[
                { to: "/admin/users", label: "User Management", desc: "Control accounts, roles & system access permissions", icon: Users, color: "from-blue-500 to-indigo-600" },
                { to: "/admin/departments", label: "Majors & Departments", desc: "Manage academic colleges and departmental structures", icon: Building2, color: "from-emerald-500 to-teal-600" },
                { to: "/admin/courses", label: "Course Catalog", desc: "Detailed curriculum management and course requirements", icon: FolderOpen, color: "from-violet-500 to-purple-600" },
                { to: "/admin/classes", label: "Class Schedules", desc: "Monitor active lectures, timing and student enrollment", icon: BookOpen, color: "from-amber-500 to-orange-600" },
                { to: "/admin/fees", label: "Financial Settings", desc: "Configure tuition fees and semester payment structures", icon: DollarSign, color: "from-rose-500 to-pink-600" }
              ].map((action, idx) => (
                <Link
                  key={idx}
                  to={action.to}
                  className="group p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 hover:shadow-2xl hover:border-transparent transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${action.color} flex items-center justify-center text-white shadow-lg shadow-black/5 group-hover:scale-110 transition-transform`}>
                        <action.icon size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800 dark:text-slate-200">{action.label}</p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">{action.desc}</p>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-200/50 dark:bg-slate-700/50 flex items-center justify-center text-slate-400 group-hover:bg-primary-500 group-hover:text-white transition-all">
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
