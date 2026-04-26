import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Sparkles, Send, X, Bot, User as UserIcon } from 'lucide-react';
import { aiService, classService } from '../services';
import type { Class } from '../types';

type Msg = { role: 'user' | 'assistant'; text: string; ts: number };

export default function AIChatPanel() {
  const { classId } = useParams<{ classId: string }>();
  const [open, setOpen] = useState(false);
  const [classCtx, setClassCtx] = useState<Class | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!classId) { setClassCtx(null); return; }
    classService.getById(classId).then(r => setClassCtx(r.data)).catch(() => setClassCtx(null));
  }, [classId]);

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading, open]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setMessages(m => [...m, { role: 'user', text: q, ts: Date.now() }]);
    setInput('');
    setLoading(true);
    try {
      const res = await aiService.ask(classId, q);
      const answer = (res.data as { answer?: string })?.answer || 'No answer returned.';
      setMessages(m => [...m, { role: 'assistant', text: answer, ts: Date.now() }]);
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', text: e instanceof Error ? e.message : 'Request failed', ts: Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {/* Floating action button — bottom right */}
      <button
        onClick={() => setOpen(v => !v)}
        title="AI Assistant"
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200
          ${open
            ? 'bg-surface-700 hover:bg-surface-800 text-white'
            : 'bg-gradient-to-br from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800 text-white shadow-primary-200'
          }`}
      >
        {open ? <X size={22} /> : <Sparkles size={22} />}
      </button>

      {/* Chat panel — slides up from bottom right */}
      <div
        className={`fixed bottom-24 right-6 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-surface-100 flex flex-col overflow-hidden transition-all duration-300
          ${open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}`}
        style={{ maxHeight: '70vh' }}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">AI Assistant</p>
            <p className="text-xs text-white/70 truncate">
              {classCtx ? classCtx.course_name : 'Open a class to get started'}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-surface-50" style={{ minHeight: '200px' }}>
          {messages.length === 0 && (
            <div className="text-center text-surface-400 text-xs py-8 flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center">
                <Bot size={24} className="text-primary-400" />
              </div>
              <p className="max-w-[200px] leading-relaxed">
                {classCtx
                  ? `Ask me anything about ${classCtx.course_name}`
                  : 'Ask me anything — academic questions, study tips, or open a class for course-specific answers'
                }
              </p>
            </div>
          )}
          {messages.map(m => (
            <div key={m.ts} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-primary-600 text-white' : 'bg-white border border-surface-200 text-surface-600'}`}>
                {m.role === 'user' ? <UserIcon size={12} /> : <Bot size={12} />}
              </div>
              <div className={`px-3 py-2 rounded-2xl text-sm max-w-[210px] whitespace-pre-wrap break-words leading-relaxed
                ${m.role === 'user'
                  ? 'bg-primary-600 text-white rounded-tr-sm'
                  : 'bg-white border border-surface-100 text-surface-800 rounded-tl-sm shadow-sm'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2 items-center">
              <div className="w-7 h-7 rounded-full bg-white border border-surface-200 flex items-center justify-center">
                <Bot size={12} className="text-surface-600" />
              </div>
              <div className="px-3 py-2.5 rounded-2xl rounded-tl-sm bg-white border border-surface-100 shadow-sm flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-surface-100 bg-white">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={classCtx ? `Ask about ${classCtx.course_name}…` : 'Ask anything…'}
              rows={2}
              className="flex-1 resize-none px-3 py-2 text-sm border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-surface-50"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="w-9 h-9 rounded-xl bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center disabled:opacity-40 transition-colors flex-shrink-0"
              title="Send (Enter)"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
