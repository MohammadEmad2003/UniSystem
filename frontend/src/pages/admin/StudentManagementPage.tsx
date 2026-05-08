import { useState, useEffect, useRef } from 'react';
import { adminService, departmentService } from '../../services';
import { realAdminService } from '../../services/realServices';
import { getSocket } from '../../services/socketClient';
import {
  Users,
  CheckCircle,
  XCircle,
  Search,
  UserPlus,
  X,
  CreditCard,
  Wifi,
  Link2,
  Radio
} from 'lucide-react';
import { useAuthStore } from '../../hooks/useAuthStore';
import type { Student, Department, AcademicLevel } from '../../types';

export default function StudentManagementPage() {
  const { token } = useAuthStore();
  const [students, setStudents] = useState<Student[]>([]);
  const [pending, setPending] = useState<Student[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tab, setTab] = useState<'approved' | 'pending' | 'link-card'>('approved');

  // Create Modal State
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    f_name: '', l_name: '', email: '', password: '',
    ssn: '', academic_level: 1 as AcademicLevel, department_id: ''
  });
  const [createError, setCreateError] = useState<string | null>(null);

  // Link Card State
  const [linkStudentId, setLinkStudentId] = useState('');
  const [linkNfcUid, setLinkNfcUid] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [recentScans, setRecentScans] = useState<{ uid: string; time: string }[]>([]);
  const linkStudentSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Socket.io for NFC scanning in Link Card tab
  useEffect(() => {
    if (tab !== 'link-card') return;
    const socket = getSocket();
    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);
    const onNfcScan = (data: { uid: string; time: string }) => {
      setRecentScans(prev => [data, ...prev].slice(0, 10));
      setLinkNfcUid(data.uid);
    };
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('nfc_scan', onNfcScan);
    if (socket.connected) setSocketConnected(true);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('nfc_scan', onNfcScan);
    };
  }, [tab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sRes, pRes, dRes] = await Promise.all([
        adminService.getAllStudents(),
        adminService.getPendingStudents(),
        departmentService.getAll()
      ]);
      setStudents(sRes.data);
      setPending(pRes.data);
      setDepartments(dRes.data);
    } catch (e) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    await adminService.approveStudent(id);
    fetchData(); // Refresh both lists
  };

  const handleReject = async (id: string) => {
    await adminService.rejectStudent(id);
    setPending(prev => prev.filter(s => s.user_id !== id));
  };

  const handleCreateStudent = async () => {
    setCreateError(null);
    try {
      const res = await adminService.createStudent(form);

      if (!res.success) throw new Error(res.message);
      
      setShowCreate(false);
      setForm({ f_name: '', l_name: '', email: '', password: '', ssn: '', academic_level: 1 as AcademicLevel, department_id: '' });
      fetchData();
    } catch (e: any) {
      setCreateError(e.message);
    }
  };

  const handleLinkCard = async () => {
    if (!linkStudentId.trim() || !linkNfcUid.trim()) return;
    setLinkLoading(true); setLinkError(null); setLinkSuccess(null);
    try {
      await realAdminService.linkCard(linkStudentId.trim(), linkNfcUid.trim());
      const student = students.find(s => s.user_id === linkStudentId.trim());
      setLinkSuccess(`Card linked to ${student ? `${student.f_name} ${student.l_name}` : `student #${linkStudentId}`}`);
      setLinkStudentId('');
      setLinkNfcUid('');
    } catch (err: any) {
      setLinkError(err?.response?.data?.message || err.message || 'Failed to link card');
    } finally {
      setLinkLoading(false);
    }
  };

  const filteredStudents = students.filter(s =>
    `${s.f_name} ${s.l_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white drop-shadow-md">Student Management</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Manage approvals, payments, and student records</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <UserPlus size={18} /> Add New Student
        </button>
      </div>

      {error && <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-sm">{error}</div>}

      {/* Stats and Tabs */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-[#050b14] rounded-2xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setTab('approved')}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${tab === 'approved' ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:text-primary-500'}`}
          >
            Approved ({students.length})
          </button>
          <button
            onClick={() => setTab('pending')}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${tab === 'pending' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-amber-500'}`}
          >
            Pending ({pending.length})
          </button>
          <button
            onClick={() => { setTab('link-card'); setLinkError(null); setLinkSuccess(null); }}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 ${tab === 'link-card' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-emerald-500'}`}
          >
            <CreditCard size={14} /> Link Card
          </button>
        </div>
        
        {tab === 'approved' && (
          <div className="relative w-full sm:w-64">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search students..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input-field pl-10 py-2 text-sm"
            />
          </div>
        )}
      </div>

      {tab === 'link-card' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Link Card Form */}
          <div className="card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link2 size={18} className="text-emerald-500" />
                <h2 className="font-semibold">Link NFC Card to Student</h2>
              </div>
              <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-xl ${socketConnected ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-slate-500/10 text-slate-500'}`}>
                <Radio size={11} className={socketConnected ? 'animate-pulse' : ''} />
                {socketConnected ? 'Scanner Live' : 'Scanner Offline'}
              </div>
            </div>

            {linkError && <div className="p-3 bg-red-500/10 text-red-500 text-sm rounded-xl border border-red-500/20">{linkError}</div>}
            {linkSuccess && <div className="p-3 bg-emerald-500/10 text-emerald-600 text-sm rounded-xl border border-emerald-500/20">{linkSuccess}</div>}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Student</label>
              <select
                value={linkStudentId}
                onChange={e => setLinkStudentId(e.target.value)}
                className="input-field"
              >
                <option value="">Select a student...</option>
                {students.map(s => (
                  <option key={s.user_id} value={s.user_id}>
                    {s.f_name} {s.l_name} — {s.email} {s.nfc_tag_id ? '(has card)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">NFC Card UID</label>
              <div className="relative">
                <Wifi size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={linkNfcUid}
                  onChange={e => setLinkNfcUid(e.target.value)}
                  placeholder="Auto-filled on card scan, or type manually"
                  className="input-field pl-9 font-mono"
                />
              </div>
              <p className="text-xs text-slate-400 ml-1">Tap a card on the NFC reader to auto-fill the UID above.</p>
            </div>

            <button
              onClick={handleLinkCard}
              disabled={linkLoading || !linkStudentId || !linkNfcUid}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {linkLoading
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><CreditCard size={16} /> Link Card</>}
            </button>
          </div>

          {/* Recent NFC Scans */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Radio size={16} className="text-primary-500" />
              <h2 className="font-semibold">Recent NFC Scans</h2>
              <span className="text-xs text-slate-400 ml-auto">{recentScans.length} scans</span>
            </div>
            {recentScans.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <Wifi size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No scans detected yet.</p>
                <p className="text-xs mt-1">Tap an NFC card on the reader.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentScans.map((scan, i) => (
                  <button
                    key={i}
                    onClick={() => setLinkNfcUid(scan.uid)}
                    className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 hover:border-primary-500/50 hover:bg-primary-500/5 transition-all text-left"
                  >
                    <span className="text-sm font-mono text-primary-600 dark:text-primary-400">{scan.uid}</span>
                    <span className="text-xs text-slate-400">{new Date(scan.time).toLocaleTimeString()}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : tab === 'pending' ? (
        <div className="grid gap-4">
          {pending.length === 0 ? (
             <div className="card p-12 text-center animate-scale-in">
                <CheckCircle size={48} className="mx-auto text-emerald-400 mb-4" />
                <h3 className="text-lg font-semibold">No Pending Approvals</h3>
                <p className="text-slate-500">All student registrations have been processed.</p>
             </div>
          ) : (
            pending.map((s, i) => (
              <div key={s.user_id} className="card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 font-bold">
                      {(s.f_name?.[0] || '?').toUpperCase()}{(s.l_name?.[0] || '').toUpperCase()}
                   </div>
                   <div>
                      <h3 className="font-bold">{s.f_name} {s.l_name}</h3>
                      <p className="text-sm text-slate-500">{s.email}</p>
                      <span className="badge bg-slate-100 dark:bg-slate-800 text-slate-500 mt-1">Level {s.academic_level}</span>
                   </div>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => handleApprove(s.user_id)} className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20">
                      <CheckCircle size={16} /> Approve
                   </button>
                   <button onClick={() => handleReject(s.user_id)} className="px-4 py-2 bg-rose-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20">
                      <XCircle size={16} /> Reject
                   </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#050b14] border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-400 tracking-wider">Student</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-400 tracking-wider">Academic Info</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-400 tracking-wider">Payment Status</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-400 tracking-wider text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.map((s) => (
                  <tr key={s.user_id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-500 font-bold">
                          {(s.f_name?.[0] || '?').toUpperCase()}{(s.l_name?.[0] || '').toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{s.f_name || ''} {s.l_name || ''}</p>
                          <p className="text-xs text-slate-500">{s.email || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <p className="text-sm font-medium">Level {s.academic_level || 0}</p>
                       <p className="text-xs text-slate-500 mt-0.5">SSN: {s.ssn || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4">
                       <span className={`badge ${
                         s.payment_status?.toLowerCase() === 'paid' ? 'bg-emerald-500/10 text-emerald-500' : 
                         s.payment_status?.toLowerCase() === 'partial' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'
                       }`}>
                          {s.payment_status || 'Unpaid'}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <p className="text-sm font-bold text-slate-700 dark:text-slate-300">${Number(s.paid_amount || 0).toLocaleString()} / ${Number(s.total_fees || 0).toLocaleString()}</p>
                       <div className="mt-1.5 w-32 ml-auto h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${Number(s.paid_amount || 0) >= Number(s.total_fees || 0) && Number(s.total_fees) > 0 ? 'bg-emerald-500' : 'bg-primary-500'}`}
                            style={{ width: `${Number(s.total_fees) > 0 ? Math.min(100, (Number(s.paid_amount || 0) / Number(s.total_fees)) * 100) : 0}%` }}
                          />
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
           <div className="bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg p-8 animate-scale-in" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500">
                       <UserPlus size={24} />
                    </div>
                    <h3 className="text-xl font-bold">Register Student</h3>
                 </div>
                 <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                    <X size={20} />
                 </button>
              </div>

              <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-xs font-bold text-slate-500 uppercase ml-1">First Name</label>
                       <input value={form.f_name} onChange={e => setForm({...form, f_name: e.target.value})} className="input-field" placeholder="John" />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-xs font-bold text-slate-500 uppercase ml-1">Last Name</label>
                       <input value={form.l_name} onChange={e => setForm({...form, l_name: e.target.value})} className="input-field" placeholder="Doe" />
                    </div>
                 </div>

                 <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Email Address</label>
                    <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input-field" placeholder="student@university.edu" />
                 </div>

                 <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Password</label>
                    <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="input-field" placeholder="••••••••" />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-xs font-bold text-slate-500 uppercase ml-1">SSN / National ID</label>
                       <input value={form.ssn} onChange={e => setForm({...form, ssn: e.target.value})} className="input-field" placeholder="123456789" />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-xs font-bold text-slate-500 uppercase ml-1">Academic Level</label>
                       <select value={form.academic_level} onChange={e => setForm({...form, academic_level: Number(e.target.value) as AcademicLevel})} className="input-field">
                          {[1,2,3,4].map(l => <option key={l} value={l}>Level {l}</option>)}
                       </select>
                    </div>
                 </div>

                 <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Department</label>
                    <select value={form.department_id} onChange={e => setForm({...form, department_id: e.target.value})} className="input-field">
                       <option value="">Select Department</option>
                       {departments.map(d => <option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>)}
                    </select>
                 </div>

                 {createError && <div className="p-3 rounded-xl bg-rose-500/10 text-rose-500 text-xs font-medium text-center">{createError}</div>}

                 <button onClick={handleCreateStudent} className="btn-primary w-full py-4 text-lg mt-4 shadow-xl shadow-primary-500/20">
                    Register & Approve Student
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
