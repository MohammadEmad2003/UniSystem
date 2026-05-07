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

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );

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
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={20} className="text-primary-500" />
            <h2 className="text-lg font-semibold">Payment Distribution</h2>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {paymentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => `$${value.toLocaleString()}`}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-[#050b14] border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Collection Rate</span>
              <span className="font-bold text-emerald-500">
                {stats?.total_expected ? Math.round((stats.total_paid / stats.total_expected) * 100) : 0}%
              </span>
            </div>
            <div className="mt-2 h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-1000" 
                style={{ width: `${stats?.total_expected ? (stats.total_paid / stats.total_expected) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Student Status */}
        <div className="card p-6 border-none bg-gradient-to-br from-white to-slate-50 dark:from-[#0a192f] dark:to-[#0d1b3e] shadow-xl">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 rounded-lg bg-primary-500/10 text-primary-500">
              <Users size={20} />
            </div>
            <h2 className="text-lg font-semibold">Registration Insights</h2>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={studentData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(59, 130, 246, 0.05)', radius: 10 }} 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} 
                />
                <Bar dataKey="count" radius={[10, 10, 0, 0]} barSize={40}>
                  {studentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
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
