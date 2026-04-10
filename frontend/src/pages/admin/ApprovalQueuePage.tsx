import { useState, useEffect } from 'react';
import { adminService } from '../../services';
import { ShieldCheck, CheckCircle, XCircle, FileText, User } from 'lucide-react';
import type { Student } from '../../types';

export default function ApprovalQueuePage() {
  const [pending, setPending] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getPendingStudents().then(r => setPending(r.data)).finally(() => setLoading(false));
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
        <h1 className="text-2xl font-bold text-surface-900">Student Approvals</h1>
        <p className="text-surface-500 mt-1">Review and approve student registrations</p>
      </div>

      {pending.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle size={48} className="mx-auto text-emerald-400 mb-4" />
          <h3 className="text-lg font-semibold text-surface-700">All Clear!</h3>
          <p className="text-surface-500 mt-1">No pending student registrations.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {pending.map((s, i) => (
            <div key={s.user_id} className="card p-5 animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold">
                    {s.f_name[0]}{s.l_name[0]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-surface-800">{s.f_name} {s.l_name}</h3>
                    <p className="text-sm text-surface-500">{s.email}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="badge bg-primary-50 text-primary-700">Level {s.academic_level}</span>
                      <span className="badge bg-surface-100 text-surface-600">SSN: {s.ssn.slice(0, 4)}****</span>
                      {s.document && (
                        <span className="badge bg-blue-50 text-blue-600 flex items-center gap-1">
                          <FileText size={12} /> {s.document}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-surface-400 mt-2">Registered: {new Date(s.created_at).toLocaleDateString()}</p>
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
