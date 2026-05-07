import { useState, useEffect } from 'react';
import { adminService, departmentService, courseService, classService } from '../../services';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  Building2,
  Search,
  Mail,
  ShieldCheck,
  CheckCircle,
  FolderOpen
} from 'lucide-react';
import { useAuthStore } from '../../hooks/useAuthStore';
import type { Student, Doctor, Course, Class, AdminStats } from '../../types';

export default function DeptManagementPage() {
  const { user } = useAuthStore();
  const deptId = (user as any)?.managed_departments?.[0];
  
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'students' | 'doctors' | 'courses'>('students');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!deptId) return;
    
    setLoading(true);
    Promise.all([
      adminService.getStats(deptId),
      adminService.getAllStudents(deptId),
      adminService.getAllDoctors(deptId),
      adminService.getAllCourses(deptId)
    ]).then(([sRes, stRes, dRes, cRes]) => {
      setStats(sRes.data);
      if (stRes.success) setStudents(stRes.data);
      if (dRes.success) setDoctors(dRes.data);
      if (cRes.success) setCourses(cRes.data);
    }).catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [deptId]);

  if (!deptId) return <div className="card p-12 text-center">No managed department found.</div>;
  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  const filteredData = () => {
    if (tab === 'students') return students.filter(s => `${s.f_name} ${s.l_name}`.toLowerCase().includes(searchTerm.toLowerCase()));
    if (tab === 'doctors') return doctors.filter(d => `${d.f_name} ${d.l_name}`.toLowerCase().includes(searchTerm.toLowerCase()));
    return courses.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-bold drop-shadow-md">Department Management</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Overseeing students, faculty, and curriculum</p>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button 
            onClick={() => setTab('students')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'students' ? 'bg-white dark:bg-slate-700 text-primary-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Students
          </button>
          <button 
            onClick={() => setTab('doctors')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'doctors' ? 'bg-white dark:bg-slate-700 text-primary-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Doctors
          </button>
          <button 
            onClick={() => setTab('courses')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'courses' ? 'bg-white dark:bg-slate-700 text-primary-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Courses
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 border-l-4 border-l-primary-500 animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Total Students</p>
              <h3 className="text-2xl font-black mt-1">{stats?.total_students || 0}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500">
              <GraduationCap size={20} />
            </div>
          </div>
        </div>
        <div className="card p-5 border-l-4 border-l-emerald-500 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Total Doctors</p>
              <h3 className="text-2xl font-black mt-1">{stats?.total_doctors || 0}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Users size={20} />
            </div>
          </div>
        </div>
        <div className="card p-5 border-l-4 border-l-violet-500 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Active Courses</p>
              <h3 className="text-2xl font-black mt-1">{stats?.total_courses || 0}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
              <FolderOpen size={20} />
            </div>
          </div>
        </div>
        <div className="card p-5 border-l-4 border-l-amber-500 animate-slide-up" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Total Classes</p>
              <h3 className="text-2xl font-black mt-1">{stats?.total_classes || 0}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <BookOpen size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="card p-0 overflow-hidden animate-fade-in">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={`Search ${tab}...`} 
              className="w-full bg-slate-100 dark:bg-slate-900 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary-500 transition-all" 
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Name</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{tab === 'courses' ? 'Code' : 'Email'}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{tab === 'courses' ? 'Hours' : (tab === 'students' ? 'Level' : 'Specialization')}</th>
                {tab === 'students' && <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">GPA</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredData().map((item: any) => (
                <tr key={item.user_id || item.course_code} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {tab !== 'courses' && (
                        <div className="w-8 h-8 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-500 text-xs font-bold">
                          {item.f_name?.[0]}{item.l_name?.[0]}
                        </div>
                      )}
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {tab === 'courses' ? item.name : `${item.f_name} ${item.l_name}`}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                    {tab === 'courses' ? item.course_code : item.email}
                  </td>
                  <td className="px-6 py-4">
                    <span className="badge bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {tab === 'courses' ? `${item.credit_hours} Hours` : (tab === 'students' ? `Level ${item.academic_level}` : item.specialization)}
                    </span>
                  </td>
                  {tab === 'students' && (
                    <td className="px-6 py-4">
                      <span className={`font-bold ${Number(item.total_gpa) >= 3 ? 'text-emerald-500' : 'text-slate-700 dark:text-slate-300'}`}>
                        {Number(item.total_gpa || 0).toFixed(2)}
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredData().length === 0 && (
            <div className="p-12 text-center text-slate-500">
              No {tab} found matching your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
