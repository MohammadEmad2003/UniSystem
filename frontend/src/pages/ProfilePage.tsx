import { useAuthStore } from '../hooks/useAuthStore';
import { User, Mail, GraduationCap, Clock, TrendingUp, CreditCard, Building2, Hash } from 'lucide-react';
import type { Student, Doctor } from '../types';

export default function ProfilePage() {
  const { user } = useAuthStore();
  if (!user) return null;

  const isStudent = user.role === 'student';
  const isDoctor = user.role === 'doctor';
  const student = user as Student;
  const doctor = user as Doctor;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-surface-900">My Profile</h1>

      {/* Profile card */}
      <div className="card overflow-hidden">
        <div className="gradient-header h-32" />
        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-12">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-700 flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-lg">
              {user.f_name[0]}{user.l_name[0]}
            </div>
            <div className="pb-2">
              <h2 className="text-xl font-bold text-surface-900">{user.f_name} {user.l_name}</h2>
              <p className="text-surface-500 capitalize">{user.role}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center"><Mail size={20} className="text-primary-600" /></div>
          <div><p className="text-xs text-surface-500">Email</p><p className="text-sm font-medium text-surface-800">{user.email}</p></div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center"><User size={20} className="text-surface-600" /></div>
          <div><p className="text-xs text-surface-500">Role</p><p className="text-sm font-medium text-surface-800 capitalize">{user.role}</p></div>
        </div>

        {isStudent && (
          <>
            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center"><TrendingUp size={20} className="text-emerald-600" /></div>
              <div><p className="text-xs text-surface-500">GPA</p><p className="text-sm font-medium text-surface-800">{student.total_gpa.toFixed(2)}</p></div>
            </div>
            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center"><Clock size={20} className="text-violet-600" /></div>
              <div><p className="text-xs text-surface-500">Credit Hours</p><p className="text-sm font-medium text-surface-800">{student.total_hours}</p></div>
            </div>
            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><GraduationCap size={20} className="text-amber-600" /></div>
              <div><p className="text-xs text-surface-500">Academic Level</p><p className="text-sm font-medium text-surface-800">Level {student.academic_level}</p></div>
            </div>
            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><CreditCard size={20} className="text-blue-600" /></div>
              <div><p className="text-xs text-surface-500">Payment Status</p><p className={`text-sm font-medium capitalize ${student.payment_status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>{student.payment_status}</p></div>
            </div>
            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center"><Hash size={20} className="text-rose-600" /></div>
              <div><p className="text-xs text-surface-500">SSN</p><p className="text-sm font-medium text-surface-800">{student.ssn.slice(0, 4)}********</p></div>
            </div>
          </>
        )}

        {isDoctor && (
          <>
            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center"><GraduationCap size={20} className="text-emerald-600" /></div>
              <div><p className="text-xs text-surface-500">Specialization</p><p className="text-sm font-medium text-surface-800">{doctor.specialization}</p></div>
            </div>
            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><Building2 size={20} className="text-amber-600" /></div>
              <div><p className="text-xs text-surface-500">Department</p><p className="text-sm font-medium text-surface-800">{doctor.department_id}</p></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
