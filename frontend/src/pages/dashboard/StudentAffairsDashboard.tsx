import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { adminService } from "../../services";
import {
  Users,
  GraduationCap,
  ShieldCheck,
  ArrowRight,
  DollarSign,
  Wallet,
  TrendingUp,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { DashboardSkeleton } from "../../components/ui/Skeleton";
import type { FinancialStats } from "../../types";

export default function StudentAffairsDashboard() {
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService
      .getFinancialStats()
      .then((res) => setStats(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;

  const paymentData = [
    { name: "Paid", value: stats?.total_paid || 0, color: "#10b981" },
    { name: "Outstanding", value: stats?.total_outstanding || 0, color: "#ef4444" },
  ];

  const studentData = [
    { name: "Approved", count: stats?.approved_students || 0, color: "#3b82f6" },
    { name: "Pending", count: stats?.pending_students || 0, color: "#f59e0b" },
  ];

  const cards = [
    {
      label: "Total Students",
      value: stats?.total_students || 0,
      icon: GraduationCap,
      color: "from-blue-500 to-blue-600",
    },
    {
      label: "Pending Approvals",
      value: stats?.pending_students || 0,
      icon: ShieldCheck,
      color: stats?.pending_students ? "from-amber-500 to-amber-600" : "from-emerald-500 to-emerald-600",
    },
    {
      label: "Collected Fees",
      value: `$${(stats?.total_paid || 0).toLocaleString()}`,
      icon: DollarSign,
      color: "from-emerald-500 to-emerald-600",
    },
    {
      label: "Outstanding",
      value: `$${(stats?.total_outstanding || 0).toLocaleString()}`,
      icon: Wallet,
      color: "from-rose-500 to-rose-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white drop-shadow-md">
          Student Affairs Dashboard
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Financial overview and student management
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <div key={i} className="card p-5 animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{c.label}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{c.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center shadow-lg`}>
                <c.icon size={22} className="text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Distribution */}
        <div className="card p-6 border-none bg-white dark:bg-[#0a192f] shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white">Payment Distribution</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">Collected vs outstanding fees overview</p>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <TrendingUp size={18} className="text-emerald-500" />
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  <linearGradient id="paidGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                  </linearGradient>
                  <linearGradient id="outstandingGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                    <stop offset="100%" stopColor="#dc2626" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <Pie
                  data={paymentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {paymentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? "url(#paidGrad)" : "url(#outstandingGrad)"} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `$${value.toLocaleString()}`}
                  contentStyle={{
                    borderRadius: "16px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                    padding: "12px"
                  }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle"/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-[#050b14] border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium">Collection Rate</span>
              <span className="font-bold text-emerald-500">
                {stats?.total_expected ? Math.round((stats.total_paid / stats.total_expected) * 100) : 0}%
              </span>
            </div>
            <div className="mt-2 h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-1000"
                style={{ width: `${stats?.total_expected ? (stats.total_paid / stats.total_expected) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Student Status */}
        <div className="card p-6 border-none bg-gradient-to-br from-white to-slate-50 dark:from-[#0a192f] dark:to-[#0d1b3e] shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white">Registration Insights</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">Student approval status breakdown</p>
            </div>
            <div className="p-2 rounded-lg bg-primary-500/10">
              <Users size={18} className="text-primary-500" />
            </div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={studentData}>
                <defs>
                  <linearGradient id="approvedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.8} />
                  </linearGradient>
                  <linearGradient id="pendingGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                    <stop offset="100%" stopColor="#d97706" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fontWeight: 'bold' }}
                  stroke="#94a3b8"
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold' }} stroke="#94a3b8" />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                  contentStyle={{
                    borderRadius: "16px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                    padding: "12px"
                  }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={50}>
                  {studentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? "url(#approvedGrad)" : "url(#pendingGrad)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-8 space-y-4">
             <Link to="/admin/student-management" className="group flex items-center justify-between p-5 rounded-2xl bg-white dark:bg-[#050b14] border border-slate-100 dark:border-slate-800 hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/5 transition-all duration-300">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500 group-hover:scale-110 transition-transform">
                    <GraduationCap size={24} />
                  </div>
                  <div>
                    <span className="block font-bold text-slate-800 dark:text-white">Central Student Hub</span>
                    <span className="text-xs text-slate-500 font-medium">Manage approvals, payments & records</span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-primary-500 group-hover:text-white transition-all">
                  <ArrowRight size={18} />
                </div>
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
