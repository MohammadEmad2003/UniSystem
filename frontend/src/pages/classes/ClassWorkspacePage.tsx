import { useState, useEffect } from 'react';
import { useParams, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { classService } from '../../services';
import { useAuthStore } from '../../hooks/useAuthStore';
import { MessageSquare, FileText, Video, Users, Award, ArrowLeft } from 'lucide-react';
import type { Class } from '../../types';

export default function ClassWorkspacePage() {
  const { classId } = useParams<{ classId: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [cls, setCls] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classId) return;
    classService.getById(classId).then(res => setCls(res.data)).finally(() => setLoading(false));
  }, [classId]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;
  if (!cls) return <div className="text-center py-12 text-surface-500">Class not found</div>;

  const tabs = [
    { path: 'stream', label: 'Stream', icon: MessageSquare },
    { path: 'materials', label: 'Materials', icon: FileText },
    { path: 'lectures', label: 'Lectures', icon: Video },
    ...(user?.role === 'doctor' ? [{ path: 'students', label: 'Students', icon: Users }] : []),
    { path: 'grades', label: 'Grades', icon: Award },
  ];

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
      isActive
        ? 'border-primary-600 text-primary-600'
        : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-200'
    }`;

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="gradient-header -mx-6 -mt-6 px-6 py-8 mb-0">
        <button onClick={() => navigate('/classes')} className="flex items-center gap-2 text-white/70 hover:text-white text-sm mb-4 transition-colors">
          <ArrowLeft size={16} /> Back to Classes
        </button>
        <h1 className="text-2xl font-bold text-white">{cls.course_name}</h1>
        <div className="flex items-center gap-4 mt-2 text-white/80 text-sm">
          <span>{cls.course_code}</span>
          <span>•</span>
          <span>{cls.doctor_name}</span>
          <span>•</span>
          <span>{cls.semester} Semester</span>
          <span>•</span>
          <span className="flex items-center gap-1"><Users size={14} /> {cls.enrolled_count}/{cls.capacity}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white -mx-6 px-6 border-b border-surface-100 sticky top-[57px] z-10 overflow-x-auto">
        <div className="flex">
          {tabs.map(tab => (
            <NavLink key={tab.path} to={`/classes/${classId}/${tab.path}`} className={tabClass}>
              <tab.icon size={16} /> {tab.label}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="pt-6">
        <Outlet context={{ classId, cls, user }} />
      </div>
    </div>
  );
}
