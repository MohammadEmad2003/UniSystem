import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useOutletContext, useLocation } from 'react-router-dom';
import { realDiscussionService, realClassService } from '../../services/realServices';
import {
  Send, Sparkles, BookOpen, MessagesSquare, GraduationCap,
  Copy, Clock, CheckCircle2, ChevronDown, ChevronUp, Loader2,
  MessageSquarePlus, Bot,
} from 'lucide-react';
import MarkdownContent from '../../components/MarkdownContent';
import type { Question, Answer, User } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Ctx { classId: string; user: User }

// Pending optimistic message shown while RAG is running
interface PendingMsg {
  tempId: string;
  text: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Data mappers (same shape as before — no backend changes)
// ─────────────────────────────────────────────────────────────────────────────

function mapRawQuestion(q: any): Question {
  // normalizeKeys lowercases ALL keys: Questions_ID → questions_id, Class_ID → class_id, etc.
  // Fall through PascalCase → snake_case → normalised-lowercase so any format works.
  return {
    q_id:       String(q.questions_id  || q.Questions_ID  || q.q_id  || ''),
    class_id:   String(q.class_id      || q.Class_ID      || ''),
    text:       q.text       || q.Text       || '',
    user_id:    String(q.user_id   ?? q.User_ID   ?? ''),
    user_name:  q.user_name  || q.User_Name  || 'Unknown',
    user_role:  (q.user_role || q.User_Role  || 'student').toLowerCase() as any,
    user_image: q.user_image || q.User_Image,
    time:       q.time       || q.Time       || new Date().toISOString(),
    answers:    (q.answers || []).map(mapRawAnswer),
  };
}

function mapRawAnswer(a: any): Answer {
  // Same normalised-key handling as mapRawQuestion.
  return {
    a_id:            String(a.answer_id    || a.Answer_ID    || a.a_id    || Math.random()),
    question_id:     String(a.questions_id || a.Questions_ID || a.question_id || ''),
    text:            a.text    || a.Text    || '',
    user_id:         String(a.user_id  ?? a.User_ID  ?? ''),
    user_name:       a.user_name  || a.User_Name  || 'AI Assistant',
    user_role:       (a.user_role || a.User_Role  || 'ai').toLowerCase() as any,
    time:            a.time    || a.Time    || new Date().toISOString(),
    is_ai_generated: Boolean(a.is_ai_generated || a.Is_AI_Generated),
    source_type:     a.source_type || a.Source_Type || undefined,
    source_id:       a.source_id   || a.Source_ID   || undefined,
    confidence:      a.confidence  ?? a.Confidence  ?? undefined,
    ai_metadata:     a.ai_metadata || a.AI_Metadata || undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function formatTime(t: string): string {
  const d = new Date(t);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1)  return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24)  return `${diffHrs}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function isSameDay(a: string, b: string): boolean {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() &&
    da.getMonth()    === db.getMonth() &&
    da.getDate()     === db.getDate();
}

function dayLabel(t: string): string {
  const d = new Date(t);
  const now = new Date();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (isSameDay(t, now.toISOString()))       return 'Today';
  if (isSameDay(t, yesterday.toISOString())) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function initials(name: string): string {
  return name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// Avatar
// ─────────────────────────────────────────────────────────────────────────────

function Avatar({ name, role, size = 8 }: { name: string; role: string; size?: number }) {
  const sizeClass = `w-${size} h-${size}`;
  const gradient =
    role === 'doctor' ? 'from-emerald-400 to-emerald-600' :
    role === 'ai'     ? 'from-violet-500 to-indigo-600'   :
                        'from-[#00b8d4] to-[#0891b2]';
  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ fontSize: size <= 7 ? '10px' : size <= 9 ? '11px' : '13px' }}>
      {role === 'ai' ? <Bot size={size <= 7 ? 10 : 12} /> : initials(name)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Date separator
// ─────────────────────────────────────────────────────────────────────────────

function DateSep({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-2 select-none">
      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
      <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-600 px-2">
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AI status badges
// ─────────────────────────────────────────────────────────────────────────────

function SourceBadge({ sourceType }: { sourceType?: string }) {
  if (sourceType === 'previous_qa') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/30">
      <MessagesSquare size={8} />Previous Q&amp;A
    </span>
  );
  if (sourceType === 'material') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
      <BookOpen size={8} />From Material
    </span>
  );
  return null;
}

function QuestionStatusBadge({ q }: { q: Question }) {
  const hasAI     = q.answers.some(a => a.is_ai_generated);
  const hasHuman  = q.answers.some(a => !a.is_ai_generated);
  const hasDoctor = q.answers.some(a => a.user_role === 'doctor');
  const aiSrc     = q.answers.find(a => a.is_ai_generated)?.source_type;

  if (hasDoctor && !hasAI) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
      <GraduationCap size={8} />Instructor Reply
    </span>
  );
  if (hasAI && aiSrc === 'previous_qa') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/30">
      <MessagesSquare size={8} />Previous Q&amp;A
    </span>
  );
  if (hasAI && aiSrc === 'material') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
      <BookOpen size={8} />AI Answered
    </span>
  );
  if (hasHuman) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30">
      <CheckCircle2 size={8} />Answered
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
      <Clock size={8} />Waiting
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Copy button
// ─────────────────────────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
      title="Copy"
    >
      {copied ? <CheckCircle2 size={11} className="text-emerald-500" /> : <Copy size={11} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Answer bubble
// ─────────────────────────────────────────────────────────────────────────────

const AiAnswerBubble = memo(function AiAnswerBubble({ answer }: { answer: Answer }) {
  const [showSource, setShowSource] = useState(false);

  let meta: Record<string, any> = {};
  try { if (answer.ai_metadata) meta = JSON.parse(answer.ai_metadata); } catch { /* ignore */ }

  const sourceType = meta.source_type || answer.source_type;
  const isPrevQA   = sourceType === 'previous_qa';
  const matName    = meta.material_name;
  const page       = meta.page;

  return (
    <div className="flex flex-row-reverse items-start gap-2.5 group">
      {/* AI avatar */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md ring-2 ring-violet-500/20">
        <Sparkles size={14} className="text-white" />
      </div>

      <div className="flex-1 min-w-0 flex flex-col items-end">
        {/* Header */}
        <div className="flex flex-row-reverse items-center gap-2 mb-1.5">
          <span className="text-xs font-bold text-violet-700 dark:text-violet-400">AI Assistant</span>
          <SourceBadge sourceType={sourceType} />
          <span className="text-[10px] text-slate-400 font-medium">
            {formatTime(answer.time)}
          </span>
        </div>

        {/* Bubble body */}
        <div className="bg-violet-600 text-white dark:bg-violet-900/60 border border-violet-500/30 rounded-2xl rounded-tr-sm px-4 py-3 shadow-lg shadow-violet-500/10 w-fit max-w-[90%]">
          <MarkdownContent theme="violet" size="sm">{answer.text}</MarkdownContent>
        </div>

        {/* Footer actions + source */}
        <div className="flex flex-row-reverse items-center gap-3 mt-2 px-1">
          <CopyBtn text={answer.text} />
          {(matName || page != null) && (
            <button
              onClick={() => setShowSource(s => !s)}
              className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-violet-500 hover:text-violet-600 transition-colors"
            >
              Source Info
            </button>
          )}
        </div>

        {showSource && (
          <div className="mt-2 px-3 py-2 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/40 text-[10px] text-violet-700 dark:text-violet-300 animate-slide-down">
            {isPrevQA ? <p>Based on similar historical questions.</p> : (
              <>
                {matName && <p>Material: <span className="font-bold">{matName}</span></p>}
                {page != null && <p>Page: <span className="font-bold">{page}</span></p>}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// "Sent to doctor" waiting bubble
// ─────────────────────────────────────────────────────────────────────────────

function WaitingBubble() {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Clock size={12} className="text-amber-500" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Pending instructor review</span>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/20 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs text-amber-700 dark:text-amber-300 italic">
          Sent to instructor — you'll be notified when they reply.
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Thinking bubble (optimistic, shown while RAG call is in flight)
// ─────────────────────────────────────────────────────────────────────────────

function ThinkingBubble() {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
        <Sparkles size={11} className="text-white" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">AI Assistant</span>
          <span className="text-[10px] text-slate-400 animate-pulse">Checking previous answers and materials…</span>
        </div>
        <div className="bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-800/40 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Doctor / human answer bubble
// ─────────────────────────────────────────────────────────────────────────────

function HumanAnswerBubble({ answer }: { answer: Answer }) {
  const isDoctor = answer.user_role === 'doctor';
  return (
    <div className="flex flex-row-reverse items-start gap-2.5 group">
      <Avatar name={answer.user_name} role={answer.user_role} size={8} />
      <div className="flex-1 min-w-0 flex flex-col items-end">
        <div className="flex flex-row-reverse items-center gap-2 mb-1.5">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{answer.user_name}</span>
          {isDoctor && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-tighter">Instructor</span>
          )}
          <span className="text-[10px] text-slate-400 font-medium">{formatTime(answer.time)}</span>
        </div>
        <div className={`rounded-2xl rounded-tr-sm px-4 py-3 shadow-md w-fit max-w-[90%] border ${
          isDoctor
            ? 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/10'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
        }`}>
          <MarkdownContent size="sm">{answer.text}</MarkdownContent>
        </div>
        <div className="mt-2 flex flex-row-reverse">
          <CopyBtn text={answer.text} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline reply input (doctor / student reply under a question)
// ─────────────────────────────────────────────────────────────────────────────

function InlineReply({
  user, qId, onSubmit, onCancel,
}: {
  user: User; qId: string;
  onSubmit: (qId: string, text: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { ref.current?.focus(); }, []);

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await onSubmit(qId, trimmed);
      setText('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-start gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 mt-2">
      <Avatar name={`${user.f_name} ${user.l_name}`} role={user.role} size={7} />
      <div className="flex-1 flex flex-col gap-2">
        <textarea
          ref={ref}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit();
            if (e.key === 'Escape') onCancel();
          }}
          placeholder="Write a reply… (Ctrl+Enter to send)"
          rows={2}
          disabled={busy}
          className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-[#0a192f] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-[#00e5ff] focus:border-[#00e5ff] resize-none transition-all"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={submit}
            disabled={!text.trim() || busy}
            className="btn-primary py-1.5 px-4 text-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            Send
          </button>
          <button
            onClick={onCancel}
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Single question thread (question + all answers + optional reply)
// ─────────────────────────────────────────────────────────────────────────────

const QuestionThread = memo(function QuestionThread({
  q, currentUser, pendingTempId, highlighted, autoExpand,
  onReplySubmit,
}: {
  q: Question;
  currentUser: User;
  pendingTempId?: string;
  highlighted?: boolean;
  autoExpand?: boolean;
  onReplySubmit: (qId: string, text: string) => Promise<void>;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(autoExpand ?? false);
  
  const isOwnQuestion = q.user_id === currentUser.user_id;
  const isDoctor = currentUser.role === 'doctor' || currentUser.role === 'admin';
  const isQuestioner = q.user_role !== 'doctor';
  const waitingForDoctor = q.answers.length === 0 && !pendingTempId;
  const hasAnswers = q.answers.length > 0 || pendingTempId || waitingForDoctor;

  return (
    <div
      data-question-id={q.q_id}
      className={`group relative flex flex-col gap-2 transition-all duration-500 p-2 rounded-2xl ${highlighted ? 'ring-2 ring-primary-500/50 bg-primary-500/5 shadow-lg' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'}`}
      style={{ animation: 'chatFadeIn 0.3s ease-out both' }}
    >
      {/* ── Question bubble (Left Aligned) ─────────────────────────── */}
      <div className="flex items-start gap-3 max-w-[85%]">
        <Avatar name={q.user_name} role={q.user_role} size={9} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{q.user_name}</span>
            {q.user_role === 'doctor' && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-tighter">Instructor</span>
            )}
            <span className="text-[10px] text-slate-400 font-medium">{formatTime(q.time)}</span>
          </div>
          
          <div className={`px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm border ${
            isOwnQuestion 
              ? 'bg-primary-500 text-white border-primary-600' 
              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-100 dark:border-slate-700'
          }`}>
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words font-medium">{q.text}</p>
          </div>
          
          {/* Status Badge & Toggle Button */}
          <div className="flex items-center gap-3 mt-2">
            <QuestionStatusBadge q={q} />
            {hasAnswers && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary-500 hover:text-primary-600 transition-colors"
              >
                {isExpanded ? (
                  <><ChevronUp size={12} /> Hide</>
                ) : waitingForDoctor ? (
                  <><ChevronDown size={12} /> Pending instructor reply</>
                ) : (
                  <><ChevronDown size={12} /> View Replies ({q.answers.length})</>
                )}
              </button>
            )}
            {isDoctor && isQuestioner && !replyOpen && (
              <button 
                onClick={() => setReplyOpen(true)}
                className="text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-600 transition-colors"
              >
                Reply
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Answers / AI responses (Right Aligned / Collapsible) ─────── */}
      {isExpanded && hasAnswers && (
        <div className="ml-auto w-[90%] space-y-4 pt-2 animate-slide-down">
          {/* AI thinking spinner */}
          {pendingTempId && <ThinkingBubble />}

          {/* Waiting for doctor */}
          {!pendingTempId && isQuestioner && waitingForDoctor && <WaitingBubble />}

          {/* Rendered answers */}
          {q.answers.map((a, idx) => (
            <div 
              key={a.a_id} 
              className="flex justify-end animate-chatFadeIn" 
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="max-w-[95%] w-full">
                {a.is_ai_generated
                  ? <AiAnswerBubble answer={a} />
                  : <HumanAnswerBubble answer={a} />}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inline reply box */}
      {replyOpen && (
        <div className="ml-auto w-[90%] mt-2">
          <InlineReply
            user={currentUser}
            qId={q.q_id}
            onSubmit={async (qId, text) => {
              await onReplySubmit(qId, text);
              setReplyOpen(false);
              setIsExpanded(true); // Auto expand when replying
            }}
            onCancel={() => setReplyOpen(false)}
          />
        </div>
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Main chat component
// ─────────────────────────────────────────────────────────────────────────────

export default function ClassStreamTab() {
  const { classId, user } = useOutletContext<Ctx>();
  const location = useLocation();

  const [questions, setQuestions]   = useState<Question[]>([]);
  const [loading, setLoading]       = useState(true);
  const [input, setInput]           = useState('');
  const [sending, setSending]       = useState(false);
  const [pending, setPending]       = useState<PendingMsg | null>(null);
  const [highlightedQId, setHighlightedQId] = useState<string | null>(null);
  const [autoExpandQId, setAutoExpandQId] = useState<string | null>(null);

  const scrollRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);

  // ── Load persisted messages ─────────────────────────────────────────────

  const loadMessages = useCallback(async () => {
    try {
      const r = await realDiscussionService.getQuestions(classId);
      const list = (r.data as Question[]) || [];
      // realDiscussionService already maps keys; sort oldest-first so chat reads top→bottom
      const sorted = list.slice().sort(
        (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
      );
      setQuestions(sorted);
      console.log(`[CHAT] Loaded ${sorted.length} messages for class ${classId}`, sorted);
    } catch (e) {
      console.error('[CHAT] Failed to load messages', e);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // ── Scroll-to + highlight question from URL param ────────────────────────

  useEffect(() => {
    if (loading) return;
    const params = new URLSearchParams(location.search);
    const targetId = params.get('questionId');
    if (!targetId) return;

    setHighlightedQId(targetId);
    // Give the DOM a tick to render, then scroll the element into view
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-question-id="${targetId}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    // Remove highlight after 3 s
    const timer = setTimeout(() => setHighlightedQId(null), 3000);
    return () => clearTimeout(timer);
  }, [loading, location.search]);

  // ── Auto-scroll to bottom on new messages ───────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [questions, pending]);

  // ── Send question → RAG ─────────────────────────────────────────────────

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');

    const tempId = `temp_${Date.now()}`;
    setPending({ tempId, text });

    console.log(`[CHAT] Question submitted: "${text}"`);

    let newQId: string | null = null;
    try {
      const res = await realClassService.askAndSave(classId, text);
      const payload = (res.data ?? {}) as any;
      const status = payload.status;
      const rawQ = payload.question;

      console.log('[CHAT] RAG response payload:', payload);

      if (rawQ) {
        const q = mapRawQuestion(rawQ);
        newQId = q.q_id;
        setQuestions(prev => [...prev, q]);
        setAutoExpandQId(q.q_id);
        console.log(`[CHAT] Question added to stream — q_id=${q.q_id}, status=${status}`);
      } else {
        console.warn('[CHAT] askAndSave returned no question field — falling back to reload');
      }
    } catch (e) {
      console.error('[CHAT] RAG call failed', e);
    } finally {
      setPending(null);
      setSending(false);
    }

    // Re-sync with the server after a submit — guarantees the new question
    // (and its answer / "sent to doctor" state) shows up. Defensive: only overwrite
    // local state if the server returns a non-empty list, otherwise keep the
    // optimistic state so the user always sees their just-submitted question.
    try {
      const r = await realDiscussionService.getQuestions(classId);
      const serverList = (r.data as Question[]) || [];
      if (serverList.length > 0) {
        const sorted = serverList.slice().sort(
          (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
        );
        setQuestions(sorted);
        if (newQId) setAutoExpandQId(newQId);
        console.log(`[CHAT] Re-synced ${sorted.length} questions from server`);
      } else {
        console.warn('[CHAT] Server refetch returned empty — keeping optimistic state');
      }
    } catch (e) {
      console.error('[CHAT] Post-submit refetch failed', e);
    }
  };

  // ── Doctor / human reply ────────────────────────────────────────────────

  const handleReply = useCallback(async (qId: string, text: string) => {
    console.log(`[CHAT] Doctor reply submitted for question ${qId}`);
    const res = await realDiscussionService.postAnswer(qId, {
      user_id:   user.user_id,
      user_name: `${user.f_name} ${user.l_name}`,
      user_role: user.role,
      text,
    });
    const newAnswer = mapRawAnswer({
      ...res.data,
      User_Name: `${user.f_name} ${user.l_name}`,
      User_Role: user.role,
    });
    setQuestions(prev =>
      prev.map(q => q.q_id === qId
        ? { ...q, answers: [...q.answers, newAnswer] }
        : q
      )
    );
    console.log(`[CHAT] Reply saved and rendered for question ${qId}`);
  }, [user]);

  // ── Key handler for input ───────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Build chronological thread list with date separators ────────────────

  const threads: Array<{ type: 'sep'; label: string } | { type: 'q'; q: Question }> = [];
  let lastDay = '';
  for (const q of questions) {
    const day = dayLabel(q.time);
    if (day !== lastDay) {
      threads.push({ type: 'sep', label: day });
      lastDay = day;
    }
    threads.push({ type: 'q', q });
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes chatFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="flex flex-col h-[calc(100vh-160px)] max-w-3xl mx-auto">

        {/* ── Chat scroll area ──────────────────────────────── */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-1 py-4 space-y-5 scroll-smooth"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
              <Loader2 size={28} className="animate-spin text-[#00b8d4]" />
              <span className="text-sm">Loading conversation…</span>
            </div>
          ) : threads.length === 0 && !pending ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
              <div className="w-16 h-16 rounded-full bg-[#00e5ff]/10 border border-[#00e5ff]/20 flex items-center justify-center">
                <MessageSquarePlus size={28} className="text-[#00b8d4]" />
              </div>
              <p className="font-semibold text-slate-700 dark:text-slate-300">No messages yet</p>
              <p className="text-sm text-slate-500 dark:text-slate-500 max-w-xs">
                Ask a question — the AI will search previous answers and class materials before forwarding to the instructor.
              </p>
            </div>
          ) : (
            <>
              {threads.map((item, i) =>
                item.type === 'sep' ? (
                  <DateSep key={`sep-${i}`} label={item.label} />
                ) : (
                  <QuestionThread
                    key={item.q.q_id}
                    q={item.q}
                    currentUser={user}
                    pendingTempId={undefined}
                    highlighted={highlightedQId === item.q.q_id}
                    autoExpand={autoExpandQId === item.q.q_id}
                    onReplySubmit={handleReply}
                  />
                )
              )}

              {/* Optimistic pending question (shown while RAG runs) */}
              {pending && (
                <div style={{ animation: 'chatFadeIn 0.22s ease both' }}>
                  {/* Student question bubble */}
                  <div className="flex items-start gap-2.5">
                    <Avatar name={`${user.f_name} ${user.l_name}`} role={user.role} size={8} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {user.f_name} {user.l_name}
                        </span>
                        <span className="text-[10px] text-slate-400">just now</span>
                      </div>
                      <div className="bg-[#00e5ff]/10 border border-[#00e5ff]/20 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                        <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
                          {pending.text}
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* AI thinking below */}
                  <div className="ml-10 mt-2.5">
                    <ThinkingBubble />
                  </div>
                </div>
              )}
            </>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Sticky input bar ─────────────────────────────── */}
        <div className="shrink-0 pt-4 pb-4 bg-white/80 dark:bg-[#0a192f]/80 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800/60 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.05)]">
          <div className="flex items-end gap-3 max-w-2xl mx-auto px-2">
            <div className="flex-1 relative group">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  user.role === 'doctor'
                    ? 'Broadcast a message or ask the class…'
                    : 'Ask anything... AI will search materials instantly'
                }
                rows={1}
                disabled={sending}
                className="w-full pl-5 pr-14 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/50 resize-none transition-all shadow-inner"
                style={{ lineHeight: '1.5' }}
                onInput={e => {
                  const el = e.currentTarget;
                  el.style.height = 'auto';
                  el.style.height = Math.min(el.scrollHeight, 160) + 'px';
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="absolute right-2 bottom-2 w-10 h-10 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white flex items-center justify-center transition-all shadow-lg shadow-primary-500/20 active:scale-95"
                title="Send (Ctrl+Enter)"
              >
                {sending
                  ? <Loader2 size={18} className="animate-spin" />
                  : <Send size={18} />}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 mt-3">
             <p className="text-[10px] text-slate-400 font-medium">
                <span className="font-black text-slate-300 dark:text-slate-700 mr-1">CTRL+ENTER</span> to submit fast
             </p>
             <div className="h-1 w-1 rounded-full bg-slate-300" />
             <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                <Sparkles size={10} className="text-amber-500" /> AI automatically checks materials
             </p>
          </div>
        </div>
      </div>
    </>
  );
}
