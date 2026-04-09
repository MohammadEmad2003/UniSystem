import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { discussionService } from '../../services';
import { Send, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import type { Question, User } from '../../types';

interface Ctx { classId: string; user: User }

export default function ClassStreamTab() {
  const { classId, user } = useOutletContext<Ctx>();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [expandedQ, setExpandedQ] = useState<Set<string>>(new Set());

  useEffect(() => {
    discussionService.getQuestions(classId).then(r => {
      setQuestions(r.data);
      // Auto-expand questions with answers
      const expanded = new Set(r.data.filter(q => q.answers.length > 0).map(q => q.q_id));
      setExpandedQ(expanded);
    }).finally(() => setLoading(false));
  }, [classId]);

  const handlePost = async () => {
    if (!newText.trim()) return;
    const res = await discussionService.postQuestion({
      class_id: classId, user_id: user.user_id,
      user_name: `${user.f_name} ${user.l_name}`, user_role: user.role,
      text: newText,
    });
    setQuestions(prev => [res.data, ...prev]);
    setNewText('');
  };

  const handleReply = async (qId: string) => {
    if (!replyText.trim()) return;
    const res = await discussionService.postAnswer(qId, {
      user_id: user.user_id, user_name: `${user.f_name} ${user.l_name}`,
      user_role: user.role, text: replyText,
    });
    setQuestions(prev => prev.map(q => q.q_id === qId ? { ...q, answers: [...q.answers, res.data] } : q));
    setReplyTo(null);
    setReplyText('');
  };

  const toggleExpand = (qId: string) => {
    setExpandedQ(prev => { const n = new Set(prev); n.has(qId) ? n.delete(qId) : n.add(qId); return n; });
  };

  const formatTime = (t: string) => {
    const d = new Date(t);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' at ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* New post */}
      <div className="card p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {user.f_name[0]}{user.l_name[0]}
          </div>
          <div className="flex-1">
            <textarea
              value={newText}
              onChange={e => setNewText(e.target.value)}
              placeholder="Ask a question or share something with the class..."
              className="w-full px-4 py-3 rounded-xl bg-surface-50 border border-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none text-sm"
              rows={2}
            />
            <div className="flex justify-end mt-2">
              <button onClick={handlePost} disabled={!newText.trim()} className="btn-primary text-sm flex items-center gap-2">
                <Send size={14} /> Post
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Questions/Posts */}
      {questions.map(q => (
        <div key={q.q_id} className="card overflow-hidden animate-fade-in">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 ${q.user_role === 'doctor' ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' : 'bg-gradient-to-br from-primary-400 to-primary-600'}`}>
                {q.user_name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-surface-800">{q.user_name}</span>
                  {q.user_role === 'doctor' && <span className="badge bg-emerald-50 text-emerald-700 text-xs">Instructor</span>}
                  <span className="text-xs text-surface-400">{formatTime(q.time)}</span>
                </div>
                <p className="text-surface-700 mt-2 text-sm whitespace-pre-wrap">{q.text}</p>
              </div>
            </div>
          </div>

          {/* Answers toggle */}
          {q.answers.length > 0 && (
            <button
              onClick={() => toggleExpand(q.q_id)}
              className="w-full px-4 py-2 text-xs font-medium text-primary-600 bg-primary-50/50 hover:bg-primary-50 flex items-center gap-1 transition-colors"
            >
              {expandedQ.has(q.q_id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {q.answers.length} {q.answers.length === 1 ? 'reply' : 'replies'}
            </button>
          )}

          {/* Answers */}
          {expandedQ.has(q.q_id) && (
            <div className="bg-surface-50/50 border-t border-surface-100">
              {q.answers.map(a => (
                <div key={a.a_id} className="px-4 py-3 border-b border-surface-100 last:border-b-0">
                  <div className="flex items-start gap-3 ml-6">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0 ${a.user_role === 'doctor' ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' : 'bg-gradient-to-br from-primary-400 to-primary-600'}`}>
                      {a.user_name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-surface-800">{a.user_name}</span>
                        {a.user_role === 'doctor' && <span className="badge bg-emerald-50 text-emerald-700 text-xs">Instructor</span>}
                        <span className="text-xs text-surface-400">{formatTime(a.time)}</span>
                      </div>
                      <p className="text-surface-600 mt-1 text-sm">{a.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reply input */}
          <div className="px-4 py-3 border-t border-surface-100">
            {replyTo === q.q_id ? (
              <div className="flex items-center gap-2 ml-6">
                <input
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  className="flex-1 px-3 py-2 rounded-lg bg-surface-50 border border-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  onKeyDown={e => e.key === 'Enter' && handleReply(q.q_id)}
                  autoFocus
                />
                <button onClick={() => handleReply(q.q_id)} className="btn-primary text-sm py-2 px-3"><Send size={14} /></button>
                <button onClick={() => { setReplyTo(null); setReplyText(''); }} className="text-sm text-surface-500 hover:text-surface-700">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setReplyTo(q.q_id)} className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 ml-6">
                <MessageSquare size={14} /> Reply
              </button>
            )}
          </div>
        </div>
      ))}

      {questions.length === 0 && (
        <div className="card p-12 text-center">
          <MessageSquare size={48} className="mx-auto text-surface-300 mb-4" />
          <h3 className="text-lg font-semibold text-surface-700">No posts yet</h3>
          <p className="text-surface-500 mt-1">Be the first to start a discussion!</p>
        </div>
      )}
    </div>
  );
}
