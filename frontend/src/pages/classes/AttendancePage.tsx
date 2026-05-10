import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../hooks/useAuthStore';
import { attendanceService, classService } from '../../services';
import { realAttendanceService } from '../../services/realServices';
import { getSocket } from '../../services/socketClient';
import {
  ArrowLeft, Users, Wifi, CheckCircle, XCircle, Clock,
  UserCheck, UserX, Radio, Trash2, RefreshCw, AlertCircle
} from 'lucide-react';
import type { Attendance, Student } from '../../types';

interface NfcScanEvent {
  uid: string;
  lec_id: number | string;
  room_id: number | string;
  time: string;
  studentName?: string;
}

interface AttendanceRow extends Omit<Attendance, 'lec_id'> {
  lec_id: string;
}

export default function AttendancePage() {
  const { classId, lectureId } = useParams<{ classId: string; lectureId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [nfcScans, setNfcScans] = useState<NfcScanEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const scansEndRef = useRef<HTMLDivElement>(null);

  const isDoctor = user?.role === 'doctor';

  const loadRecords = async () => {
    if (!lectureId) return;
    try {
      const res = await (attendanceService as any).getByLecture(lectureId);
      setRecords((res.data || []) as AttendanceRow[]);
    } catch {
      setError('Failed to load attendance records');
    }
  };

  const loadStudents = async () => {
    if (!classId || !isDoctor) return;
    try {
      const res = await classService.getStudents(classId);
      setStudents(res.data || []);
    } catch {
      // non-fatal
    }
  };

  useEffect(() => {
    Promise.all([loadRecords(), loadStudents()]).finally(() => setLoading(false));

    const socket = getSocket();

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);
    const onNfcScan = (data: NfcScanEvent) => {
      if (String(data.lec_id) === String(lectureId)) {
        setNfcScans(prev => [data, ...prev].slice(0, 50));
        // Refresh attendance table after a short delay to let backend process
        setTimeout(loadRecords, 1500);
      }
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
  }, [lectureId, classId]);

  useEffect(() => {
    scansEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [nfcScans]);

  const handleMarkPresent = async (studentId: string) => {
    if (!lectureId) return;
    setActionLoading(studentId); setActionError(null);
    try {
      await realAttendanceService.recordManual(lectureId, studentId);
      await loadRecords();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err.message || 'Failed to record attendance');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (studentId: string) => {
    if (!lectureId) return;
    setActionLoading(`del-${studentId}`); setActionError(null);
    try {
      await realAttendanceService.deleteByLectureAndStudent(lectureId, studentId);
      setRecords(prev => prev.filter(r => r.student_id !== studentId));
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err.message || 'Failed to remove record');
    } finally {
      setActionLoading(null);
    }
  };

  const attendedIds = new Set(records.map(r => r.student_id));
  const notAttended = students.filter(s => !attendedIds.has(s.user_id));

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/classes/${classId}/lectures`)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Attendance</h1>
            <p className="text-sm text-slate-500">Lecture #{lectureId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl ${socketConnected ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-slate-500/10 text-slate-500'}`}>
            <Radio size={12} className={socketConnected ? 'animate-pulse' : ''} />
            {socketConnected ? 'Live' : 'Offline'}
          </div>
          <button onClick={() => { loadRecords(); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors" title="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {actionError && (
        <div className="p-3 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 flex items-center gap-2">
          <AlertCircle size={16} /> {actionError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: NFC Live Feed */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold flex items-center gap-2">
                <Wifi size={16} className="text-primary-500" />
                NFC Live Feed
              </h2>
              <span className="text-xs text-slate-500">{nfcScans.length} scans</span>
            </div>

            {nfcScans.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Wifi size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs">Waiting for NFC scans...</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {nfcScans.map((scan, i) => (
                  <div key={i} className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 animate-slide-up">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-primary-600 dark:text-primary-400">{scan.uid}</span>
                      <span className="text-xs text-slate-400">{new Date(scan.time).toLocaleTimeString()}</span>
                    </div>
                    {scan.studentName && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{scan.studentName}</p>
                    )}
                  </div>
                ))}
                <div ref={scansEndRef} />
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="card p-4 space-y-3">
            <h2 className="font-semibold text-sm">Summary</h2>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-500/10 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{records.length}</p>
                <p className="text-xs text-slate-500 mt-0.5">Attended</p>
              </div>
              <div className="bg-red-500/10 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-red-500">{notAttended.length}</p>
                <p className="text-xs text-slate-500 mt-0.5">Absent</p>
              </div>
            </div>
            {records.some(r => r.early_check) && (
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <CheckCircle size={12} className="text-emerald-500" />
                {records.filter(r => r.early_check).length} early check-in
              </div>
            )}
            {records.some(r => r.late_check) && (
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <Clock size={12} className="text-amber-500" />
                {records.filter(r => r.late_check).length} late sign-out
              </div>
            )}
          </div>
        </div>

        {/* Right: Attendance Table */}
        <div className="lg:col-span-2 space-y-4">
          {/* Attended */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
              <UserCheck size={16} className="text-emerald-500" />
              <h2 className="font-semibold text-sm">Attended ({records.length})</h2>
            </div>
            {records.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Users size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No attendance records yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {records.map(r => (
                  <div key={r.student_id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-xs font-bold">
                        {(r.student_name?.[0] || '?').toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{r.student_name || r.student_id}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {r.early_check ? (
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5"><CheckCircle size={10} /> Check-in</span>
                          ) : null}
                          {r.late_check ? (
                            <span className="text-xs text-amber-500 flex items-center gap-0.5"><Clock size={10} /> Sign-out</span>
                          ) : null}
                          <span className="text-xs text-slate-400 capitalize">{r.method}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.time && <span className="text-xs text-slate-400">{new Date(r.time).toLocaleTimeString()}</span>}
                      {isDoctor && (
                        <button
                          onClick={() => handleDelete(r.student_id)}
                          disabled={actionLoading === `del-${r.student_id}`}
                          className="p-1.5 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors disabled:opacity-50"
                          title="Remove record"
                        >
                          {actionLoading === `del-${r.student_id}`
                            ? <div className="w-3.5 h-3.5 border border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                            : <Trash2 size={14} />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Absent - Doctor only */}
          {isDoctor && notAttended.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                <UserX size={16} className="text-red-400" />
                <h2 className="font-semibold text-sm">Absent ({notAttended.length})</h2>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {notAttended.map(s => (
                  <div key={s.user_id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 text-xs font-bold">
                        {(s.f_name?.[0] || '?').toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{s.f_name} {s.l_name}</p>
                        <p className="text-xs text-slate-400">{s.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleMarkPresent(s.user_id)}
                      disabled={actionLoading === s.user_id}
                      className="px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === s.user_id
                        ? <div className="w-3.5 h-3.5 border border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                        : <CheckCircle size={12} />}
                      Mark Present
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Student view: only see their own record */}
          {!isDoctor && records.length === 0 && (
            <div className="card p-8 text-center">
              <XCircle size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">No attendance recorded for this lecture yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
