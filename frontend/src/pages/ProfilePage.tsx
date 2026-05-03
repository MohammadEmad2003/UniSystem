import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../hooks/useAuthStore';
import {
  Mail, GraduationCap, Clock, TrendingUp, CreditCard,
  Building2, Hash, LogOut, BookOpen, Shield, Star,
  CheckCircle, AlertCircle, User,
} from 'lucide-react';
import type { Student, Doctor, Admin } from '../types';

function InfoCard({ icon, label, value, color = 'primary' }: { icon: React.ReactNode; label: string; value: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    primary: 'bg-primary-50 text-primary-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
    rose: 'bg-rose-50 text-rose-600',
    surface: 'bg-surface-100 text-surface-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };
  return (
    <div className="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color] ?? colors.primary}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-surface-500 mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-surface-800 truncate">{value}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  if (!user) return null;

  const isStudent = user.role === 'student';
  const isDoctor = user.role === 'doctor';
  const isAdmin = user.role === 'admin';
  const student = user as Student;
  const doctor = user as Doctor;
  const admin = user as Admin;

  const initials = `${user.f_name?.[0] ?? ''}${user.l_name?.[0] ?? ''}`.toUpperCase();

  const roleColors = {
    student: 'from-blue-500 to-indigo-600',
    doctor: 'from-emerald-500 to-teal-600',
    admin: 'from-violet-500 to-purple-600',
  };

  const statusBadge = user.account_status === 'approved'
    ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700"><CheckCircle size={12} /> Active</span>
    : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700"><AlertCircle size={12} /> {user.account_status}</span>;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header card */}
      <div className="card overflow-hidden">
        <div className={`h-28 bg-gradient-to-r ${roleColors[user.role] ?? roleColors.student}`} />
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-12">
            <div className="flex items-end gap-4">
              <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${roleColors[user.role] ?? roleColors.student} flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-lg`}>
                {initials}
              </div>
              <div className="pb-1">
                <h2 className={`text-xl font-bold bg-gradient-to-r ${roleColors[user.role] ?? roleColors.student} bg-clip-text text-transparent`}>{user.f_name} {user.l_name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-surface-500 capitalize">{user.role}</span>
                  <span className="text-surface-300">·</span>
                  {statusBadge}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 pb-1">
              {isStudent && (
                <button
                  onClick={() => navigate('/classes')}
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  <BookOpen size={16} /> My Classes
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin/approvals')}
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  <Shield size={16} /> Admin Panel
                </button>
              )}
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 text-sm font-medium transition-colors"
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Logout confirmation */}
      {showLogoutConfirm && (
        <div className="card p-5 border border-red-100 bg-red-50/50">
          <p className="text-sm font-medium text-surface-800 mb-3">Are you sure you want to sign out?</p>
          <div className="flex gap-2">
            <button onClick={handleLogout} className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors">
              Yes, Sign Out
            </button>
            <button onClick={() => setShowLogoutConfirm(false)} className="px-4 py-2 rounded-xl border border-surface-200 text-surface-600 text-sm font-medium hover:bg-surface-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Info grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InfoCard icon={<Mail size={20} />} label="Email Address" value={user.email} color="primary" />
        <InfoCard icon={<User size={20} />} label="Account Role" value={<span className="capitalize">{user.role}</span>} color="surface" />

        {isStudent && (
          <>
            <InfoCard
              icon={<TrendingUp size={20} />}
              label="Cumulative GPA"
              value={
                <span className={`font-bold ${(student.total_gpa ?? 0) >= 3.5 ? 'text-emerald-600' : (student.total_gpa ?? 0) >= 2.5 ? 'text-amber-600' : 'text-red-500'}`}>
                  {(student.total_gpa ?? 0).toFixed(2)} / 4.00
                </span>
              }
              color="emerald"
            />
            <InfoCard icon={<Clock size={20} />} label="Credit Hours Completed" value={`${student.total_hours ?? 0} hrs`} color="violet" />
            <InfoCard icon={<GraduationCap size={20} />} label="Academic Level" value={`Level ${student.academic_level ?? '—'}`} color="amber" />
            <InfoCard
              icon={<CreditCard size={20} />}
              label="Payment Status"
              value={
                <span className={`capitalize ${student.payment_status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {student.payment_status ?? '—'}
                </span>
              }
              color="blue"
            />
            {student.ssn && (
              <InfoCard icon={<Hash size={20} />} label="National ID (SSN)" value={`${student.ssn.slice(0, 4)}${'•'.repeat(8)}`} color="rose" />
            )}
            {student.department_id && (
              <InfoCard icon={<Building2 size={20} />} label="Department ID" value={student.department_id} color="indigo" />
            )}
          </>
        )}

        {isDoctor && (
          <>
            <InfoCard icon={<Star size={20} />} label="Specialization" value={doctor.specialization || '—'} color="emerald" />
            <InfoCard icon={<Building2 size={20} />} label="Department" value={doctor.department_id || '—'} color="amber" />
          </>
        )}

        {isAdmin && (
          <>
            <InfoCard icon={<Shield size={20} />} label="Permissions Level" value={admin.permissions_level ?? 'Full Access'} color="violet" />
            <InfoCard icon={<CheckCircle size={20} />} label="Account Status" value={<span className="capitalize">{user.account_status}</span>} color="emerald" />
          </>
        )}
      </div>
    </div>
  );
}
