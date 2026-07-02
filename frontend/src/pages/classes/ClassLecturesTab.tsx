import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { lectureService, attendanceService, roomService } from '../../services';
import {
  Video, MapPin, Link2, Calendar, Clock, Plus, X, Wifi, Monitor,
  Play, Square, Users, Copy, Check, Lock, Unlock, KeyRound
} from 'lucide-react';
import type { Lecture, User } from '../../types';
import { CardSkeleton, ListItemSkeleton } from '../../components/ui/Skeleton';

interface Ctx { classId: string; user: User }

const typeConfig: Record<string, { icon: typeof Wifi; color: string; bg: string }> = {
  Lecture: { icon: Monitor, color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-500/10' },
  Section: { icon: Video, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10' },
  Lab:     { icon: Monitor, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
  Online:  { icon: Wifi, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10' },
};

function LectureStatusBadge({ lec }: { lec: Lecture }) {
  if (lec.status === 'open') {
    const hasEnded = !!lec.end_time;
    return (
      <span className={`badge ${hasEnded ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'} flex items-center gap-1`}>
        <span className={`w-1.5 h-1.5 rounded-full ${hasEnded ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
        {hasEnded ? 'Closing (15 min)' : 'Live'}
      </span>
    );
  }
  // A lecture that was started and then closed has a start_time
  if (lec.status === 'closed' && lec.start_time) {
    return <span className="badge bg-slate-500/10 text-slate-500">Closed</span>;
  }
  // Not yet started (DB default is 'closed' but start_time is null)
  return <span className="badge bg-slate-400/10 text-slate-400">Scheduled</span>;
}

export default function ClassLecturesTab() {
  const { classId, user } = useOutletContext<Ctx>();
  const navigate = useNavigate();
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Online attendance join state (student)
  const [joinLecId, setJoinLecId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const [form, setForm] = useState({
    title: '', day: 'Sunday', time: '09:00',
    type: 'Lecture' as Lecture['type'],
    room_id: '', meeting_link: '', date: ''
  });

  const reload = () =>
    (lectureService as any).getByClass(classId).then((r: any) => setLectures(r.data)).finally(() => setLoading(false));

  useEffect(() => { reload(); }, [classId]);

  useEffect(() => {
    if (form.date && form.time && form.type !== 'Online') {
      setLoadingRooms(true);
      roomService.getEmpty(form.date, form.time)
        .then(r => {
          setAvailableRooms(r.data);
          if (r.data.length > 0 && !r.data.find(rm => rm.room_id === form.room_id)) {
            setForm(f => ({ ...f, room_id: r.data[0].room_id }));
          }
        })
        .finally(() => setLoadingRooms(false));
    }
  }, [form.date, form.time, form.type]);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.date) return;
    const selectedDate = new Date(form.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) { setError('Lecture date cannot be in the past'); return; }
    setIsCreating(true); setError(null);
    try {
      const res = await (lectureService as any).create({ ...form, class_id: classId });
      setLectures(prev => [...prev, res.data]);
      setShowCreate(false);
      setForm({ title: '', day: 'Sunday', time: '09:00', type: 'Lecture', room_id: '', meeting_link: '', date: '' });
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to create lecture');
    } finally {
      setIsCreating(false);
    }
  };

  const handleStart = async (lec: Lecture) => {
    setActionLoading(lec.lec_id); setActionError(null);
    try {
      const res = await (lectureService as any).start(lec.lec_id);
      setLectures(prev => prev.map(l =>
        l.lec_id === lec.lec_id
          ? { ...l, status: 'open', start_time: res.data.start_time, attendance_code: res.data.attendance_code }
          : l
      ));
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err.message || 'Failed to start lecture');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEnd = async (lec: Lecture) => {
    setActionLoading(lec.lec_id); setActionError(null);
    try {
      const res = await (lectureService as any).end(lec.lec_id);
      setLectures(prev => prev.map(l =>
        l.lec_id === lec.lec_id ? { ...l, end_time: res.data.end_time } : l
      ));
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err.message || 'Failed to end lecture');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (lecId: string) => {
    setActionLoading(lecId); setActionError(null);
    try {
      await (lectureService as any).delete(lecId);
      setLectures(prev => prev.filter(l => l.lec_id !== lecId));
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err.message || 'Failed to delete lecture');
    } finally {
      setActionLoading(null);
    }
  };

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleJoinOnline = async (lec: Lecture) => {
    if (!joinCode.trim()) return;
    setJoinLoading(true); setJoinError(null);
    try {
      await (attendanceService as any).onlineAttendance(lec.lec_id, joinCode.trim(), user.user_id);
      setJoinLecId(null); setJoinCode('');
    } catch (err: any) {
      setJoinError(err?.response?.data?.message || err.message || 'Invalid code or already recorded');
    } finally {
      setJoinLoading(false);
    }
  };

  if (loading) return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {user.role === 'doctor' && (
        <div className="flex items-center justify-between">
          {actionError && (
            <p className="text-sm text-red-500 bg-red-500/10 px-3 py-2 rounded-xl border border-red-500/20">{actionError}</p>
          )}
          <div className="ml-auto">
            <button onClick={() => setShowCreate(true)} className="btn-primary text-sm flex items-center gap-2">
              <Plus size={16} /> Create Lecture
            </button>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 pt-10 sm:pt-24" onClick={() => setShowCreate(false)}>
          <div className="bg-slate-50 dark:bg-[#0a192f] border border-slate-300 dark:border-slate-700/50 rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.8)] w-full max-w-md p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create Lecture</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-surface-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              {error && <div className="p-3 bg-red-500/10 text-red-500 text-xs rounded-xl border border-red-500/20">{error}</div>}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Title</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Lecture title" className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Date</label>
                  <input 
                    type="date" 
                    value={form.date} 
                    onChange={e => {
                      const d = e.target.value;
                      const dayName = d ? new Date(d).toLocaleDateString('en-US', { weekday: 'long' }) : 'Sunday';
                      setForm({ ...form, date: d, day: dayName });
                    }} 
                    className="input-field" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Day</label>
                  <select value={form.day} onChange={e => setForm({ ...form, day: e.target.value })} className="input-field">
                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Time</label>
                  <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} className="input-field" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Type</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as Lecture['type'] })} className="input-field">
                    <option value="Lecture">Lecture</option>
                    <option value="Section">Section</option>
                    <option value="Lab">Lab</option>
                    <option value="Online">Online</option>
                  </select>
                </div>
              </div>
              {form.type !== 'Online' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Select Available Room</label>
                  <select 
                    value={form.room_id} 
                    onChange={e => setForm({ ...form, room_id: e.target.value })} 
                    className="input-field"
                    disabled={loadingRooms || !form.date || !form.time}
                  >
                    {!form.date || !form.time ? (
                      <option value="">Select date & time first</option>
                    ) : loadingRooms ? (
                      <option value="">Loading available rooms...</option>
                    ) : availableRooms.length === 0 ? (
                      <option value="">No rooms available for this time</option>
                    ) : (
                      availableRooms.map(rm => (
                        <option key={rm.room_id} value={rm.room_id}>
                          {rm.room_name} ({rm.capacity} seats)
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}
              {form.type === 'Online' && (
                <input value={form.meeting_link} onChange={e => setForm({ ...form, meeting_link: e.target.value })} placeholder="Meeting link" className="input-field" />
              )}
              <button onClick={handleCreate} disabled={isCreating} className="btn-primary w-full flex items-center justify-center gap-2">
                {isCreating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create Lecture'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Online attendance join modal (student) */}
      {joinLecId && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => { setJoinLecId(null); setJoinCode(''); setJoinError(null); }}>
          <div className="bg-slate-50 dark:bg-[#0a192f] border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <KeyRound size={18} className="text-primary-500" />
                <h3 className="text-lg font-semibold">Enter Attendance Code</h3>
              </div>
              <button onClick={() => { setJoinLecId(null); setJoinCode(''); setJoinError(null); }} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              {joinError && <div className="p-3 bg-red-500/10 text-red-500 text-xs rounded-xl border border-red-500/20">{joinError}</div>}
              <input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. A3BX7Z"
                maxLength={6}
                className="input-field font-mono tracking-widest text-center text-lg uppercase"
                autoFocus
              />
              <button
                onClick={() => { const lec = lectures.find(l => l.lec_id === joinLecId); if (lec) handleJoinOnline(lec); }}
                disabled={joinLoading || joinCode.length < 4}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {joinLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Record Attendance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lectures list */}
      {lectures.map((lec, i) => {
        const typeKey = (lec.type || '').charAt(0).toUpperCase() + (lec.type || '').slice(1).toLowerCase();
        const cfg = typeConfig[typeKey] || typeConfig['Lecture'];
        const TypeIcon = cfg.icon;
        const isOpen = lec.status === 'open';
        const hasEnded = isOpen && !!lec.end_time;
        const busy = actionLoading === lec.lec_id;
        const isOnline = (lec.type || '').toLowerCase() === 'online';
        const isOffline = !isOnline;
        const scheduledDateTime = lec.date && lec.time
          ? new Date(`${lec.date}T${lec.time}`)
          : null;
        const tooEarly = isOffline && scheduledDateTime
          ? Date.now() < scheduledDateTime.getTime()
          : false;

        return (
          <div key={lec.lec_id} className="card p-4 animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${cfg.bg} flex-shrink-0`}>
                <TypeIcon size={22} className={cfg.color} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200">{lec.title || `Lecture ${lec.lec_id}`}</h3>
                  <LectureStatusBadge lec={lec} />
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1"><Calendar size={14} /> {lec.day}{lec.date ? ` • ${lec.date}` : ''}</span>
                  <span className="flex items-center gap-1"><Clock size={14} /> {lec.time}</span>
                  {lec.room_id && <span className="flex items-center gap-1"><MapPin size={14} /> {lec.room_id}</span>}
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`badge ${cfg.bg} ${cfg.color} capitalize`}>{lec.type}</span>
                  {lec.meeting_link && (
                    <a href={lec.meeting_link} target="_blank" rel="noopener noreferrer" className="badge bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 transition-colors flex items-center gap-1">
                      <Link2 size={12} /> Join Meeting
                    </a>
                  )}
                  {/* Show attendance code for open online lectures (doctor) */}
                  {user.role === 'doctor' && isOnline && isOpen && lec.attendance_code && (
                    <button
                      onClick={() => copyCode(lec.attendance_code!)}
                      className="badge bg-primary-500/10 text-primary-600 dark:text-primary-400 hover:bg-primary-500/20 transition-colors flex items-center gap-1 font-mono"
                    >
                      {copiedCode === lec.attendance_code ? <Check size={12} /> : <Copy size={12} />}
                      Code: {lec.attendance_code}
                    </button>
                  )}
                </div>

                {/* Doctor actions */}
                {user.role === 'doctor' && (
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {!isOpen && !lec.start_time && (
                      <button
                        onClick={() => !tooEarly && handleStart(lec)}
                        disabled={busy || tooEarly}
                        title={tooEarly && scheduledDateTime
                          ? `Available at ${scheduledDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} on ${scheduledDateTime.toLocaleDateString()}`
                          : undefined}
                        className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {busy ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : <Play size={12} />}
                        {tooEarly ? 'Not yet' : 'Start'}
                      </button>
                    )}
                    {isOpen && !hasEnded && (
                      <button
                        onClick={() => handleEnd(lec)}
                        disabled={busy}
                        className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-amber-600 transition-colors disabled:opacity-50"
                      >
                        {busy ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : <Square size={12} />}
                        End
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/classes/${classId}/attendance/${lec.lec_id}`)}
                      className="px-3 py-1.5 bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-primary-500/20 transition-colors"
                    >
                      <Users size={12} /> Attendance
                    </button>
                    {!isOpen && (
                      <button
                        onClick={() => handleDelete(lec.lec_id)}
                        disabled={busy}
                        className="px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                        title={lec.start_time ? 'Delete this closed lecture' : 'Delete this scheduled lecture'}
                      >
                        {busy ? <div className="w-3 h-3 border border-red-500/30 border-t-red-500 rounded-full animate-spin" /> : <X size={12} />}
                        Delete
                      </button>
                    )}
                  </div>
                )}

                {/* Student actions for open online lectures */}
                {user.role === 'student' && isOnline && isOpen && (
                  <div className="mt-3">
                    <button
                      onClick={() => { setJoinLecId(lec.lec_id); setJoinCode(''); setJoinError(null); }}
                      className="px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-500/20 transition-colors"
                    >
                      {hasEnded ? <Lock size={12} /> : <Unlock size={12} />}
                      {hasEnded ? 'Sign Out (grace period)' : 'Record Attendance'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {lectures.length === 0 && (
        <div className="card p-12 text-center">
          <Video size={48} className="mx-auto text-surface-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">No Lectures Yet</h3>
          <p className="text-slate-600 dark:text-slate-400 mt-1">{user.role === 'doctor' ? 'Create your first lecture.' : 'No lectures have been scheduled.'}</p>
        </div>
      )}
    </div>
  );
}
