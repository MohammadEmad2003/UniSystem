import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { lectureService } from '../../services';
import { Video, MapPin, Link2, Calendar, Clock, Plus, X, Wifi, Monitor } from 'lucide-react';
import type { Lecture, User } from '../../types';

interface Ctx { classId: string; user: User }

const typeConfig: Record<string, { icon: typeof Wifi; color: string; bg: string }> = {
  online: { icon: Wifi, color: 'text-green-600', bg: 'bg-green-50' },
  offline: { icon: Monitor, color: 'text-blue-600', bg: 'bg-blue-50' },
  hybrid: { icon: Video, color: 'text-purple-600', bg: 'bg-purple-50' },
};

export default function ClassLecturesTab() {
  const { classId, user } = useOutletContext<Ctx>();
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', day: 'Sunday', time: '09:00', type: 'offline' as Lecture['type'], room_id: '', meeting_link: '', date: '' });

  useEffect(() => {
    lectureService.getByClass(classId).then(r => setLectures(r.data)).finally(() => setLoading(false));
  }, [classId]);

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    const res = await lectureService.create({ ...form, class_id: classId });
    setLectures(prev => [...prev, res.data]);
    setShowCreate(false);
    setForm({ title: '', day: 'Sunday', time: '09:00', type: 'offline', room_id: '', meeting_link: '', date: '' });
  };

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {user.role === 'doctor' && (
        <div className="flex justify-end">
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm flex items-center gap-2">
            <Plus size={16} /> Create Lecture
          </button>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create Lecture</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-surface-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Lecture title" className="input-field" />
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="input-field" />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.day} onChange={e => setForm({ ...form, day: e.target.value })} className="input-field">
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} className="input-field" />
              </div>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as Lecture['type'] })} className="input-field">
                <option value="offline">Offline</option>
                <option value="online">Online</option>
                <option value="hybrid">Hybrid</option>
              </select>
              {(form.type === 'offline' || form.type === 'hybrid') && (
                <input value={form.room_id} onChange={e => setForm({ ...form, room_id: e.target.value })} placeholder="Room ID" className="input-field" />
              )}
              {(form.type === 'online' || form.type === 'hybrid') && (
                <input value={form.meeting_link} onChange={e => setForm({ ...form, meeting_link: e.target.value })} placeholder="Meeting link" className="input-field" />
              )}
              <button onClick={handleCreate} className="btn-primary w-full">Create Lecture</button>
            </div>
          </div>
        </div>
      )}

      {/* Lectures list */}
      {lectures.map((lec, i) => {
        const cfg = typeConfig[lec.type] || typeConfig.offline;
        const TypeIcon = cfg.icon;
        return (
          <div key={lec.lec_id} className="card p-4 animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${cfg.bg} flex-shrink-0`}>
                <TypeIcon size={22} className={cfg.color} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-surface-800">{lec.title || `Lecture ${lec.lec_id}`}</h3>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-surface-500">
                  <span className="flex items-center gap-1"><Calendar size={14} /> {lec.day}{lec.date ? ` • ${lec.date}` : ''}</span>
                  <span className="flex items-center gap-1"><Clock size={14} /> {lec.time}</span>
                  {lec.room_id && <span className="flex items-center gap-1"><MapPin size={14} /> {lec.room_id}</span>}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`badge ${cfg.bg} ${cfg.color} capitalize`}>{lec.type}</span>
                  {lec.meeting_link && (
                    <a href={lec.meeting_link} target="_blank" rel="noopener noreferrer" className="badge bg-green-50 text-green-600 hover:bg-green-100 transition-colors flex items-center gap-1">
                      <Link2 size={12} /> Join Meeting
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {lectures.length === 0 && (
        <div className="card p-12 text-center">
          <Video size={48} className="mx-auto text-surface-300 mb-4" />
          <h3 className="text-lg font-semibold text-surface-700">No Lectures Yet</h3>
          <p className="text-surface-500 mt-1">{user.role === 'doctor' ? 'Create your first lecture.' : 'No lectures have been scheduled.'}</p>
        </div>
      )}
    </div>
  );
}
