import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../hooks/useAuthStore';
import {
  Mail, GraduationCap, Clock, TrendingUp, CreditCard,
  Building2, Hash, LogOut, BookOpen, Shield, Star,
  CheckCircle, AlertCircle, User, Camera, Loader2,
} from 'lucide-react';
import type { Student, Doctor, Admin } from '../types';

function InfoCard({ icon, label, value, color = 'primary' }: { icon: React.ReactNode; label: string; value: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    primary: 'bg-[#00e5ff]/10 text-[#00e5ff]',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    violet: 'bg-violet-500/10 text-violet-400',
    amber: 'bg-amber-500/10 text-amber-400',
    blue: 'bg-blue-500/10 text-blue-400',
    rose: 'bg-rose-500/10 text-rose-400',
    surface: 'bg-slate-50 dark:bg-[#0a192f] text-slate-600 dark:text-slate-400',
    indigo: 'bg-indigo-500/10 text-indigo-400',
  };
  return (
    <div className="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color] ?? colors.primary}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{value}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400"><CheckCircle size={12} /> Active</span>
    : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400"><AlertCircle size={12} /> {user.account_status}</span>;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const token = useAuthStore.getState().token;
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/profile-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Do NOT set Content-Type — browser sets it with the boundary for multipart/form-data
        },
        body: formData,
      });

      const result = await response.json();

      if (result.success === true || result.success === 'true' || result.success === 'success') {
        updateUser({ image_url: result.data.image_url });
      } else {
        throw new Error(result.message || 'Failed to upload image to server');
      }
    } catch (error: any) {
      alert(`Upload failed: ${error.message || 'Please try again.'}`);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header card */}
      <div className="card relative overflow-hidden">
        {/* Glowing background effects */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className={`absolute -top-32 -right-32 w-96 h-96 rounded-full blur-[100px] opacity-20 bg-gradient-to-br ${roleColors[user.role] ?? roleColors.student}`} />
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#ffffff]/5 to-transparent border-b border-white/5" />
        </div>
        
        <div className="relative px-6 py-8 sm:px-10 sm:py-12 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <div className="relative group">
            <div className={`absolute inset-0 rounded-2xl blur-xl opacity-50 bg-gradient-to-br ${roleColors[user.role] ?? roleColors.student} group-hover:opacity-80 transition-opacity duration-500`} />
            <div className={`relative w-28 h-28 rounded-2xl bg-gradient-to-br ${roleColors[user.role] ?? roleColors.student} flex items-center justify-center text-white text-4xl font-black border border-white/20 shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden`}>
              {user.image_url ? (
                <img src={user.image_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadingImage ? (
                <Loader2 size={16} className="animate-spin text-primary-500" />
              ) : (
                <Camera size={16} className="text-slate-600 dark:text-slate-400" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
          
          <div className="flex-1 mt-2">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white drop-shadow-md mb-2">{user.f_name} {user.l_name}</h2>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <span className="px-3 py-1 rounded-full bg-white dark:bg-[#111111]/80 border border-slate-300 dark:border-slate-700/50 text-sm font-bold text-slate-700 dark:text-slate-300 capitalize shadow-inner">
                {user.role}
              </span>
              {statusBadge}
            </div>
          </div>
        </div>
      </div>

      {/* Logout confirmation */}
      {showLogoutConfirm && (
        <div className="card p-5 border border-red-100 bg-red-500/10/50">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-3">Are you sure you want to sign out?</p>
          <div className="flex gap-2">
            <button onClick={handleLogout} className="px-4 py-2 rounded-xl bg-red-500/100 text-white text-sm font-medium hover:bg-red-600 transition-colors">
              Yes, Sign Out
            </button>
            <button onClick={() => setShowLogoutConfirm(false)} className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-slate-100 dark:bg-[#050b14] transition-colors">
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
                <span className={`font-bold ${(student.total_gpa ?? 0) >= 3.5 ? 'text-emerald-400' : (student.total_gpa ?? 0) >= 2.5 ? 'text-amber-400' : 'text-red-500'}`}>
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
                <span className={`capitalize ${student.payment_status === 'paid' ? 'text-emerald-400' : 'text-amber-400'}`}>
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


