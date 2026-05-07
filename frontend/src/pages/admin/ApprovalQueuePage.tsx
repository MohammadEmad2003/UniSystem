import { useState, useEffect } from 'react';
import { adminService } from '../../services';
import { CheckCircle, XCircle, FileText } from 'lucide-react';
import type { Student } from '../../types';

export default function ApprovalQueuePage() {
  const [pending, setPending] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminService.getPendingStudents()
      .then(r => setPending(r.data))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load pending students'))
      .finally(() => setLoading(false));
  }, []);

  const handleApprove = async (id: string) => {
    await adminService.approveStudent(id);
    setPending(prev => prev.filter(s => s.user_id !== id));
  };

  const handleReject = async (id: string) => {
    await adminService.rejectStudent(id);
    setPending(prev => prev.filter(s => s.user_id !== id));
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-bold drop-shadow-md">Student Approvals</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Review and approve student registrations</p>
      </div>

      {error && <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-sm">{error}</div>}

      {pending.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle size={48} className="mx-auto text-emerald-400 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">All Clear!</h3>
          <p className="text-slate-600 dark:text-slate-400 mt-1">No pending student registrations.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {pending.map((s, i) => (
            <div key={s.user_id} className="card p-5 animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold">
                    {(s.f_name?.[0] || '?').toUpperCase()}{(s.l_name?.[0] || '').toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">{s.f_name || ''} {s.l_name || ''}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{s.email || ''}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {s.academic_level && <span className="badge bg-[#00e5ff]/10 text-[#00e5ff]">Level {s.academic_level}</span>}
                      {s.ssn && <span className="badge bg-surface-100 text-slate-600 dark:text-slate-400">SSN: {String(s.ssn).slice(0, 4)}****</span>}
                      {s.document && (
                        <span className="badge bg-blue-500/10 text-blue-400 flex items-center gap-1">
                          <FileText size={12} /> {s.document}
                        </span>
                      )}
                    </div>
                    {s.created_at && <p className="text-xs text-surface-400 mt-2">Registered: {new Date(s.created_at).toLocaleDateString()}</p>}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => handleApprove(s.user_id)} className="btn-success text-sm flex items-center gap-1">
                    <CheckCircle size={16} /> Approve
                  </button>
                  <button onClick={() => handleReject(s.user_id)} className="btn-danger text-sm flex items-center gap-1">
                    <XCircle size={16} /> Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


