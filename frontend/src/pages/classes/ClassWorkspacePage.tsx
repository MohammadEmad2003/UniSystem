import { useState, useEffect, useCallback } from 'react';
import { useParams, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { classService } from '../../services';
import { useAuthStore } from '../../hooks/useAuthStore';
import { MessageSquare, FileText, Video, Users, Award, ArrowLeft, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Class } from '../../types';

const AI_URL = (import.meta.env.VITE_AI_BASE_URL || 'http://127.0.0.1:9000').replace(/\/$/, '');

export default function ClassWorkspacePage() {
  const { classId } = useParams<{ classId: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [cls, setCls] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);
  const [reindexing, setReindexing] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const showToast = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const handleReindex = useCallback(async () => {
    if (!classId || reindexing) return;
    setReindexing(true);
    try {
      const res = await fetch(`${AI_URL}/rag/index/class/${classId}`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showToast(true, 'AI data re-indexed successfully');
    } catch {
      showToast(false, 'Failed to re-index AI data');
    } finally {
      setReindexing(false);
    }
  }, [classId, reindexing]);

  useEffect(() => {
    if (!classId) return;
    classService.getById(classId).then(res => setCls(res.data)).finally(() => setLoading(false));
  }, [classId]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;
  if (!cls) return <div className="text-center py-12 text-slate-600 dark:text-slate-400">Class not found</div>;

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
        ? 'border-primary-600 text-[#00b8d4]'
        : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:border-slate-700'
    }`;

  return (
    <div className="space-y-0">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[200] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-slide-in transition-all ${
          toast.ok
            ? 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-300'
            : 'bg-red-50 dark:bg-red-900/40 border-red-200 dark:border-red-700/50 text-red-700 dark:text-red-300'
        }`}>
          {toast.ok
            ? <CheckCircle2 size={16} className="flex-shrink-0" />
            : <AlertCircle   size={16} className="flex-shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="gradient-header -mx-6 -mt-6 px-6 py-8 mb-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <button onClick={() => navigate('/classes')} className="flex items-center gap-2 text-slate-500 dark:text-white/70 hover:text-slate-900 dark:hover:text-white text-sm mb-4 transition-colors">
              <ArrowLeft size={16} /> Back to Classes
            </button>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{cls.course_name}</h1>
            <div className="flex items-center gap-4 mt-2 text-slate-600 dark:text-white/80 text-sm flex-wrap">
              <span>{cls.course_code}</span>
              <span>•</span>
              <span>{cls.doctor_name}</span>
              <span>•</span>
              <span>{cls.semester} Semester</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Users size={14} /> {cls.enrolled_count}/{cls.capacity}</span>
            </div>
          </div>

          {/* Re-index button — doctor/admin only */}
          {(user?.role === 'doctor' || user?.role === 'admin') && (
            <button
              onClick={handleReindex}
              disabled={reindexing}
              className="flex-shrink-0 mt-8 flex items-center gap-2 px-4 py-2 rounded-xl border border-[#00e5ff]/30 bg-[#00e5ff]/10 text-[#00b8d4] dark:text-[#00e5ff] hover:bg-[#00e5ff]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-semibold shadow-sm"
              title="Refresh the AI knowledge base for this class"
            >
              <RefreshCw size={15} className={reindexing ? 'animate-spin' : ''} />
              {reindexing ? 'Re-indexing…' : 'Re-index AI Data'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/80 dark:bg-[#111111]/80 border border-slate-200 dark:border-slate-800 -mx-6 px-6 border-b border-slate-200 dark:border-slate-800 sticky top-[57px] z-10 overflow-x-auto">
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


