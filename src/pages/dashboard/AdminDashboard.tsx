import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services';
import { Users, GraduationCap, BookOpen, Building2, FolderOpen, ShieldCheck, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { AdminStats } from '../../types';

const deptData = [
  { name: 'CS', students: 45, doctors: 3 },
  { name: 'IS', students: 35, doctors: 2 },
  { name: 'AI', students: 28, doctors: 2 },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getStats().then(res => setStats(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  const statCards = [
    { label: 'Total Students', value: stats?.total_students || 0, icon: GraduationCap, color: 'from-primary-500 to-primary-600' },
    { label: 'Total Doctors', value: stats?.total_doctors || 0, icon: Users, color: 'from-emerald-500 to-emerald-600' },
    { label: 'Total Classes', value: stats?.total_classes || 0, icon: BookOpen, color: 'from-violet-500 to-violet-600' },
    { label: 'Departments', value: stats?.total_departments || 0, icon: Building2, color: 'from-amber-500 to-amber-600' },
    { label: 'Courses', value: stats?.total_courses || 0, icon: FolderOpen, color: 'from-rose-500 to-rose-600' },
    { label: 'Pending Approvals', value: stats?.pending_approvals || 0, icon: ShieldCheck, color: stats?.pending_approvals ? 'from-red-500 to-red-600' : 'from-green-500 to-green-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Admin Dashboard</h1>
        <p className="text-surface-500 mt-1">System overview and management</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((s, i) => (
          <div key={i} className="card p-5 animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-surface-500 font-medium">{s.label}</p>
                <p className="text-2xl font-bold text-surface-900 mt-1">{s.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center`}>
                <s.icon size={22} className="text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department chart */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-surface-800 mb-4">Students per Department</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={deptData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
              <Bar dataKey="students" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              <Bar dataKey="doctors" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick actions */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-surface-800 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            {stats?.pending_approvals ? (
              <Link to="/admin/approvals" className="flex items-center justify-between p-4 rounded-xl bg-red-50 border border-red-100 hover:bg-red-100 transition-colors">
                <div className="flex items-center gap-3">
                  <ShieldCheck size={20} className="text-red-500" />
                  <div>
                    <p className="font-medium text-red-700">{stats.pending_approvals} Pending Approvals</p>
                    <p className="text-xs text-red-500">Students waiting for account review</p>
                  </div>
                </div>
                <ArrowRight size={18} className="text-red-400" />
              </Link>
            ) : null}
            <Link to="/admin/users" className="flex items-center justify-between p-4 rounded-xl bg-surface-50 border border-surface-100 hover:bg-surface-100 transition-colors">
              <div className="flex items-center gap-3">
                <Users size={20} className="text-primary-500" />
                <span className="font-medium text-surface-700">Manage Users</span>
              </div>
              <ArrowRight size={18} className="text-surface-400" />
            </Link>
            <Link to="/admin/departments" className="flex items-center justify-between p-4 rounded-xl bg-surface-50 border border-surface-100 hover:bg-surface-100 transition-colors">
              <div className="flex items-center gap-3">
                <Building2 size={20} className="text-emerald-500" />
                <span className="font-medium text-surface-700">Manage Departments</span>
              </div>
              <ArrowRight size={18} className="text-surface-400" />
            </Link>
            <Link to="/admin/courses" className="flex items-center justify-between p-4 rounded-xl bg-surface-50 border border-surface-100 hover:bg-surface-100 transition-colors">
              <div className="flex items-center gap-3">
                <FolderOpen size={20} className="text-violet-500" />
                <span className="font-medium text-surface-700">Manage Courses</span>
              </div>
              <ArrowRight size={18} className="text-surface-400" />
            </Link>
            <Link to="/admin/classes" className="flex items-center justify-between p-4 rounded-xl bg-surface-50 border border-surface-100 hover:bg-surface-100 transition-colors">
              <div className="flex items-center gap-3">
                <BookOpen size={20} className="text-amber-500" />
                <span className="font-medium text-surface-700">Manage Classes</span>
              </div>
              <ArrowRight size={18} className="text-surface-400" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
