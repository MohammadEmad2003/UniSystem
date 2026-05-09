import React, { useState, useEffect, useCallback, useRef, memo } from "react";
import { useOutletContext } from "react-router-dom";
import { materialService, aiRagService, lectureService, studyOutputService, buildStudyOptionsKey } from "../../services";
import {
  FileText, Link2, Video, Image as ImageIcon, Upload, Download,
  ExternalLink, Trash2, Plus, X, BrainCircuit, Sparkles, Layers,
  BookOpen, FileQuestion, ChevronDown, ChevronUp, CheckCircle2,
  XCircle, RotateCcw, ArrowLeft, Trophy, AlertCircle, RotateCw,
  FileDown, Loader2, Clock, Database,
} from "lucide-react";
import type { Material, User } from "../../types";
import MarkdownContent from "../../components/MarkdownContent";
import {
  exportStudyContent,
  type AiResultData,
  type ExportMeta,
  type ExportFormat,
} from "../../utils/exportStudyContent";
import { normalizeFlashcardText } from "../../utils/aiMathSanitizer";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type QuizItem  = { type?: string; difficulty?: string; question: string; options: string[]; answer: string; explanation?: string };
type FlashItem = { focus_type?: string; front: string; back: string; example?: string | null };
type PageItem  = { page: number; summary: string };

type AiResult =
  | { type: "markdown";   title: string; content: string; action: string }
  | { type: "quiz";       title: string; items: QuizItem[];              action: string }
  | { type: "flashcards"; title: string; items: FlashItem[];             action: string }
  | { type: "pages";      title: string; pages: PageItem[];              action: string }
  | { type: "error";      title: string; content: string;                action: string };

interface Ctx { classId: string; user: User }

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function safeMaterialId(mat: Material): string {
  const m = mat as unknown as Record<string, unknown>;
  return String(m.material_id ?? m.Material_ID ?? m.id ?? "");
}

function stripFences(raw: string): string {
  return raw
    .replace(/^```(?:json|markdown|text)?\s*/i, "")
    .replace(/\s*```$/, "")
    .replace(/\\n/g, "\n")
    .trim();
}

function parseJsonSafe<T>(value: unknown): T | null {
  if (Array.isArray(value) || (value !== null && typeof value === "object")) return value as T;
  if (typeof value === "string") {
    try { return JSON.parse(stripFences(value)) as T; } catch { return null; }
  }
  return null;
}

function normaliseAnswer(answer: string, options: string[]): number {
  const up = (answer ?? "").trim().toUpperCase();
  // Match A/B/C/D letter — clamp to option count so True/False (2 opts) works
  const letters = ["A", "B", "C", "D"];
  const byLetter = letters.indexOf(up[0]);
  if (byLetter !== -1 && byLetter < options.length) return byLetter;
  return options.findIndex(o => o.trim().toUpperCase() === up);
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading Tips (rotated during AI thinking)
// ─────────────────────────────────────────────────────────────────────────────

const TIPS_BY_ACTION: Record<string, string[]> = {
  summary: [
    "🧠 AI is analyzing your material…",
    "📘 Extracting key concepts…",
    "✨ Synthesizing main ideas…",
    "📋 Building your overview…",
  ],
  notes: [
    "📝 Generating structured notes…",
    "🔍 Identifying key definitions…",
    "💡 Organizing concepts…",
    "🎓 Crafting your study guide…",
  ],
  quiz: [
    "⚡ Building quiz questions…",
    "🎯 Selecting testable concepts…",
    "📊 Designing distractors…",
    "✅ Validating answer keys…",
  ],
  flashcards: [
    "🃏 Extracting key terms…",
    "🔤 Pairing terms with definitions…",
    "📚 Creating flashcard deck…",
    "✨ Finalizing your cards…",
  ],
  pages: [
    "📄 Reading page by page…",
    "📖 Summarizing sections…",
    "🔎 Identifying highlights…",
    "📑 Assembling page summaries…",
  ],
};

function useRotatingTip(action: string | null) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!action) return;
    setIdx(0);
    const tips = TIPS_BY_ACTION[action] ?? TIPS_BY_ACTION.summary;
    const id = setInterval(() => setIdx(i => (i + 1) % tips.length), 2200);
    return () => clearInterval(id);
  }, [action]);
  if (!action) return "";
  const tips = TIPS_BY_ACTION[action] ?? TIPS_BY_ACTION.summary;
  return tips[idx];
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared: Section title with coloured accent
// ─────────────────────────────────────────────────────────────────────────────

function SectionLabel({ children, color = "cyan" }: { children: React.ReactNode; color?: string }) {
  const map: Record<string, string> = {
    cyan:    "bg-[#00e5ff]/10 text-[#00b8d4] dark:text-[#00e5ff] border-[#00e5ff]/20",
    blue:    "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    amber:   "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    pink:    "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
    violet:  "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
    red:     "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${map[color] ?? map.cyan}`}>
      {children}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Callout cards for summaries / notes
// ─────────────────────────────────────────────────────────────────────────────

function Callout({ icon, label, color, children }: {
  icon: string; label: string; color: string; children: React.ReactNode;
}) {
  const border: Record<string, string> = {
    blue:    "border-blue-500/30 bg-blue-500/5",
    amber:   "border-amber-500/30 bg-amber-500/5",
    emerald: "border-emerald-500/30 bg-emerald-500/5",
    red:     "border-red-500/30 bg-red-500/5",
    violet:  "border-violet-500/30 bg-violet-500/5",
    cyan:    "border-[#00e5ff]/30 bg-[#00e5ff]/5",
  };
  return (
    <div className={`my-3 rounded-xl border px-4 py-3 ${border[color] ?? border.cyan}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-base leading-none">{icon}</span>
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
      </div>
      <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Smart Markdown renderer — detects callout-prefixes in the LLM output
// ─────────────────────────────────────────────────────────────────────────────

const CALLOUT_RE = /^(📘|💡|⚠️|🚀|🔢|🧠)\s*/u;
const CALLOUT_MAP: Record<string, { icon: string; label: string; color: string }> = {
  "📘": { icon: "📘", label: "Main Concept",  color: "blue"    },
  "💡": { icon: "💡", label: "Key Idea",      color: "amber"   },
  "⚠️": { icon: "⚠️", label: "Important",     color: "red"     },
  "🚀": { icon: "🚀", label: "Fast Fact",     color: "violet"  },
  "🔢": { icon: "🔢", label: "Formula",       color: "cyan"    },
  "🧠": { icon: "🧠", label: "Memory Tip",    color: "emerald" },
};

function EnhancedMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const enhanced = lines.map((line, i) => {
    const match = line.match(CALLOUT_RE);
    if (match && match[1] && CALLOUT_MAP[match[1]]) {
      const { icon, label, color } = CALLOUT_MAP[match[1]];
      const text = line.replace(CALLOUT_RE, "").trim();
      if (text) {
        return (
          <Callout key={i} icon={icon} label={label} color={color}>
            {text}
          </Callout>
        );
      }
    }
    return null;
  });

  // Remove callout lines from markdown and render the rest normally
  const filtered = lines
    .filter(line => !line.match(CALLOUT_RE) || !line.replace(CALLOUT_RE, "").trim())
    .join("\n");

  return (
    <>
      {enhanced.filter(Boolean)}
      <MarkdownContent size="base" className="
        prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-slate-900 dark:prose-headings:text-white
        prose-h2:text-lg prose-h3:text-base prose-h2:mt-5 prose-h3:mt-4
        prose-a:text-[#00e5ff] prose-a:no-underline hover:prose-a:underline
        prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-800 prose-pre:rounded-xl prose-pre:shadow-lg
        prose-ul:my-2 prose-ol:my-2 prose-li:my-1
        prose-strong:text-slate-900 dark:prose-strong:text-white prose-strong:font-semibold
        prose-blockquote:border-[#00e5ff]/40 prose-blockquote:text-slate-500 dark:prose-blockquote:text-slate-400
        prose-table:text-sm prose-th:bg-slate-100 dark:prose-th:bg-slate-800 prose-th:font-semibold
        marker:text-slate-400 dark:marker:text-slate-500
      ">
        {filtered}
      </MarkdownContent>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Quiz Renderer — full interactive experience with inline explanations
// ─────────────────────────────────────────────────────────────────────────────

/** Shared explanation panel used in both active-quiz and review modes. */
function ExplanationPanel({ explanation, correctLabel, isCorrect }: {
  explanation: string;
  correctLabel: string;
  isCorrect: boolean;
}) {
  return (
    <div
      className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/50 overflow-visible"
      style={{ animation: "fadeSlideIn 0.25s ease both" }}
    >
      {/* Correct-answer banner */}
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700/60 ${
        isCorrect
          ? "bg-emerald-500/8 dark:bg-emerald-500/10"
          : "bg-red-500/8 dark:bg-red-500/10"
      }`}>
        {isCorrect
          ? <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
          : <XCircle      size={14} className="text-red-500 flex-shrink-0" />}
        <span className={`text-xs font-semibold ${isCorrect ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {isCorrect ? "Correct!" : "Incorrect"}
        </span>
        {!isCorrect && (
          <>
            <span className="text-slate-300 dark:text-slate-600 mx-1">·</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Correct answer: <span className="font-bold text-emerald-600 dark:text-emerald-400">{correctLabel}</span>
            </span>
          </>
        )}
      </div>
      {/* Explanation body */}
      <div className="px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Explanation</p>
        <MarkdownContent size="sm" className="text-slate-600 dark:text-slate-300">
          {explanation}
        </MarkdownContent>
      </div>
    </div>
  );
}

const QuizRenderer = memo(function QuizRenderer({ items, onRetry }: {
  items: QuizItem[];
  onRetry?: () => void;
}) {
  const [current, setCurrent]   = useState(0);
  const [selected, setSelected] = useState<Record<number, number>>({});
  // tracks which questions have had their explanation revealed
  const [revealed, setReveal]   = useState<Set<number>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const score = submitted
    ? items.reduce((acc, item, i) => acc + (selected[i] === normaliseAnswer(item.answer, item.options) ? 1 : 0), 0)
    : 0;

  const pct = Math.round((score / items.length) * 100);
  const grade = pct >= 90 ? "Excellent" : pct >= 70 ? "Good" : pct >= 50 ? "Fair" : "Keep Studying";
  const gradeColor = pct >= 90 ? "text-emerald-400" : pct >= 70 ? "text-[#00e5ff]" : pct >= 50 ? "text-amber-400" : "text-red-400";

  const reset = () => {
    setSelected({}); setReveal(new Set()); setSubmitted(false); setCurrent(0); setShowReview(false);
  };

  const q = items[current];
  const correctIdx = normaliseAnswer(q.answer, q.options);
  const progress = ((current + 1) / items.length) * 100;
  const allAnswered = Object.keys(selected).length === items.length;
  const hasAnsweredCurrent = selected[current] !== undefined;
  const isRevealedCurrent = revealed.has(current);

  const handleSelect = (oi: number) => {
    if (hasAnsweredCurrent) return; // lock after first answer
    setSelected(s => ({ ...s, [current]: oi }));
    setReveal(r => new Set([...r, current]));
  };

  // ── Score screen ────────────────────────────────────────────────────────
  if (submitted && !showReview) {
    return (
      <div className="flex flex-col items-center text-center py-8 animate-fade-in">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#00e5ff]/20 to-[#006080]/20 border-2 border-[#00e5ff]/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(0,229,255,0.15)]">
          <Trophy size={40} className={gradeColor} />
        </div>
        <div className={`text-5xl font-black mb-2 ${gradeColor}`}>{pct}%</div>
        <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{grade}!</div>
        <div className="text-slate-500 dark:text-slate-400 mb-2">
          {score} correct out of {items.length} questions
        </div>
        <div className="w-full max-w-xs h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden my-4">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${pct >= 70 ? "bg-gradient-to-r from-[#00b8d4] to-[#00e5ff]" : "bg-gradient-to-r from-amber-500 to-orange-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={() => setShowReview(true)}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
            Review Answers
          </button>
          <button onClick={reset}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00b8d4] to-[#0891b2] text-white text-sm font-semibold hover:opacity-90 transition-all flex items-center gap-2">
            <RotateCw size={14} /> Try Again
          </button>
          {onRetry && (
            <button onClick={onRetry}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold hover:opacity-90 transition-all flex items-center gap-2">
              <Sparkles size={14} /> New Quiz
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Review screen ───────────────────────────────────────────────────────
  if (submitted && showReview) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white">Answer Review</h3>
          <button onClick={reset} className="text-sm text-[#00b8d4] hover:text-[#00e5ff] flex items-center gap-1.5 font-medium">
            <RotateCw size={13} /> New attempt
          </button>
        </div>
        {items.map((item, qi) => {
          const ci = normaliseAnswer(item.answer, item.options);
          const si = selected[qi] ?? -1;
          const isCorrect = si === ci;
          const letters = ["A","B","C","D"];
          const correctLabel = item.options[ci]
            ? `${letters[ci]}. ${item.options[ci].replace(/^[A-D]\.\s*/i, "")}`
            : letters[ci];
          return (
            <div key={qi} className={`rounded-2xl border p-5 ${isCorrect ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
              {/* Question header */}
              <div className="flex items-start gap-2 mb-3">
                {isCorrect
                  ? <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  : <XCircle      size={18} className="text-red-500 flex-shrink-0 mt-0.5" />}
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <QuestionTypeBadge type={item.type} />
                    <DifficultyBadge difficulty={item.difficulty} />
                  </div>
                  <MarkdownContent size="sm" className="font-semibold text-slate-900 dark:text-white leading-relaxed prose-p:my-0">
                    {`${qi + 1}. ${item.question}`}
                  </MarkdownContent>
                </div>
              </div>
              {/* Options */}
              <div className="space-y-2 ml-6">
                {item.options.map((opt, oi) => {
                  const isCor = oi === ci;
                  const isSel = oi === si;
                  let cls = "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm border ";
                  if (isCor)      cls += "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium";
                  else if (isSel) cls += "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-300";
                  else            cls += "border-transparent text-slate-500 dark:text-slate-500";
                  const letter = letters[oi];
                  return (
                    <div key={oi} className={cls}>
                      <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold border border-current/30">
                        {letter}
                      </span>
                      <MarkdownContent inline className="flex-1">{opt}</MarkdownContent>
                      {isCor && <CheckCircle2 size={14} className="flex-shrink-0" />}
                      {isSel && !isCor && <XCircle size={14} className="flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>
              {/* Explanation — always shown in review */}
              {item.explanation && (
                <div className="ml-6 mt-1">
                  <ExplanationPanel
                    explanation={item.explanation}
                    correctLabel={correctLabel}
                    isCorrect={isCorrect}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ── Active quiz question ─────────────────────────────────────────────────
  const letters = ["A","B","C","D"];
  const correctLabel = q.options[correctIdx]
    ? `${letters[correctIdx]}. ${q.options[correctIdx].replace(/^[A-D]\.\s*/i, "")}`
    : letters[correctIdx];
  const selectedIsCorrect = selected[current] === correctIdx;

  return (
    <div className="animate-fade-in">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Question {current + 1} of {items.length}
            </span>
            <QuestionTypeBadge type={q.type} />
            <DifficultyBadge difficulty={q.difficulty} />
          </div>
          <span className="text-xs font-bold text-[#00b8d4] dark:text-[#00e5ff]">
            {Object.keys(selected).length}/{items.length} answered
          </span>
        </div>
        <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#00b8d4] to-[#00e5ff] rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="bg-white dark:bg-[#112240] rounded-2xl border border-slate-200 dark:border-slate-700/80 p-6 mb-4 shadow-sm">
        <div className="mb-6">
          <MarkdownContent size="base" className="font-bold text-slate-900 dark:text-white leading-relaxed prose-p:my-0 prose-strong:text-slate-900 dark:prose-strong:text-white">
            {q.question}
          </MarkdownContent>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {q.options.map((opt, oi) => {
            const isSelected  = selected[current] === oi;
            const isCorrectOpt = oi === correctIdx;
            const isWrongSel  = isSelected && !isCorrectOpt;

            let cls = "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-sm text-left transition-all duration-200 ";
            let circleCls = "w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold border transition-all ";

            if (!hasAnsweredCurrent) {
              // before answering
              cls += isSelected
                ? "border-[#00e5ff]/60 bg-[#00e5ff]/10 text-[#00b8d4] dark:text-[#00e5ff] shadow-[0_0_15px_rgba(0,229,255,0.1)]"
                : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-[#00e5ff]/30 hover:bg-[#00e5ff]/5 cursor-pointer";
              circleCls += isSelected
                ? "border-[#00e5ff]/60 bg-[#00e5ff]/20 text-[#00e5ff]"
                : "border-slate-300 dark:border-slate-600";
            } else {
              // after answering — lock & colour
              if (isCorrectOpt) {
                cls += "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium cursor-default";
                circleCls += "border-emerald-500/60 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400";
              } else if (isWrongSel) {
                cls += "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-300 cursor-default";
                circleCls += "border-red-500/60 bg-red-500/20 text-red-600 dark:text-red-400";
              } else {
                cls += "border-transparent text-slate-400 dark:text-slate-600 cursor-default opacity-60";
                circleCls += "border-slate-300 dark:border-slate-700";
              }
            }

            return (
              <button
                key={oi}
                onClick={() => handleSelect(oi)}
                disabled={hasAnsweredCurrent}
                className={cls}
              >
                <span className={circleCls}>{letters[oi]}</span>
                <MarkdownContent inline className="flex-1">{opt}</MarkdownContent>
                {hasAnsweredCurrent && isCorrectOpt && <CheckCircle2 size={16} className="flex-shrink-0 text-emerald-500" />}
                {hasAnsweredCurrent && isWrongSel   && <XCircle      size={16} className="flex-shrink-0 text-red-500" />}
                {!hasAnsweredCurrent && isSelected  && <CheckCircle2 size={16} className="flex-shrink-0 text-[#00e5ff]" />}
              </button>
            );
          })}
        </div>

        {/* Inline explanation — appears immediately after answering */}
        {isRevealedCurrent && q.explanation && (
          <ExplanationPanel
            explanation={q.explanation}
            correctLabel={correctLabel}
            isCorrect={selectedIsCorrect}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setCurrent(c => Math.max(0, c - 1))}
          disabled={current === 0}
          className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-400 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
        >
          ← Previous
        </button>

        <div className="flex gap-1.5">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === current ? "w-6 bg-[#00e5ff]" :
                selected[i] !== undefined
                  ? (selected[i] === normaliseAnswer(items[i].answer, items[i].options) ? "bg-emerald-400" : "bg-red-400")
                  : "bg-slate-300 dark:bg-slate-700"
              }`}
            />
          ))}
        </div>

        {current < items.length - 1 ? (
          <button
            onClick={() => setCurrent(c => c + 1)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={() => setSubmitted(true)}
            disabled={!allAnswered}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00b8d4] to-[#0891b2] text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-all shadow-[0_4px_15px_rgba(0,229,255,0.2)]"
          >
            Submit Quiz
          </button>
        )}
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Export menu
// ─────────────────────────────────────────────────────────────────────────────

const EXPORT_FORMATS: { fmt: ExportFormat; label: string; ext: string; icon: string }[] = [
  { fmt: "pdf", label: "Export as PDF",      ext: ".pdf", icon: "📄" },
  { fmt: "md",  label: "Export as Markdown", ext: ".md",  icon: "📝" },
  { fmt: "txt", label: "Export as Text",     ext: ".txt", icon: "🗒" },
];

function ExportMenu({
  result,
  meta,
  contentRef,
}: {
  result: AiResultData;
  meta: ExportMeta;
  contentRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const [open, setOpen]       = useState(false);
  const [busy, setBusy]       = useState<ExportFormat | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const menuRef               = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleExport = async (fmt: ExportFormat) => {
    setOpen(false);
    setBusy(fmt);
    setError(null);
    try {
      await exportStudyContent(result, meta, fmt, contentRef?.current);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Export failed";
      setError(msg);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={!!busy}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:border-[#00e5ff]/40 transition-all disabled:opacity-50"
        title="Export"
      >
        {busy
          ? <Loader2 size={13} className="animate-spin text-[#00b8d4]" />
          : <FileDown size={13} />}
        Export
        <span className="text-slate-400">▾</span>
      </button>

      {open && (
        <div
          className="absolute right-0 bottom-full mb-2 w-48 bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden z-50"
          style={{ animation: "fadeSlideIn 0.15s ease both" }}
        >
          <div className="px-3 pt-2.5 pb-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">
            Download
          </div>
          {EXPORT_FORMATS.map(({ fmt, label, ext, icon }) => (
            <button
              key={fmt}
              onClick={() => handleExport(fmt)}
              disabled={!!busy}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors disabled:opacity-40"
            >
              <span className="text-base leading-none">{icon}</span>
              <span className="flex-1">{label}</span>
              <span className="text-[10px] text-slate-400 font-mono">{ext}</span>
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="absolute right-0 top-full mt-1 text-[10px] text-red-500 bg-white dark:bg-[#112240] border border-red-200 dark:border-red-800/40 rounded-lg px-2 py-1 shadow whitespace-nowrap z-50">
          {error}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Badge helpers
// ─────────────────────────────────────────────────────────────────────────────

function DifficultyBadge({ difficulty }: { difficulty?: string }) {
  if (!difficulty || difficulty === "mixed") return null;
  const cfg: Record<string, string> = {
    easy:   "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    hard:   "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  };
  const label: Record<string, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${cfg[difficulty] ?? "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"}`}>
      {label[difficulty] ?? difficulty}
    </span>
  );
}

function QuestionTypeBadge({ type }: { type?: string }) {
  if (!type) return null;
  const cfg: Record<string, string> = {
    mcq:        "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    true_false: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  };
  const label: Record<string, string> = { mcq: "MCQ", true_false: "T/F" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${cfg[type] ?? "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"}`}>
      {label[type] ?? type}
    </span>
  );
}

function FocusTypeBadge({ focusType }: { focusType?: string | null }) {
  if (!focusType) return null;
  const cfg: Record<string, string> = {
    key_terms:   "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
    definitions: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    formulas:    "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
    mixed:       "bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20",
  };
  const label: Record<string, string> = {
    key_terms: "Term", definitions: "Definition", formulas: "Formula", mixed: "Mixed",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${cfg[focusType] ?? "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"}`}>
      {label[focusType] ?? focusType}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Flashcard Renderer — 3D flip with keyboard navigation
// ─────────────────────────────────────────────────────────────────────────────

const FlashcardRenderer = memo(function FlashcardRenderer({ items }: { items: FlashItem[] }) {
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());
  const [unknown, setUnknown] = useState<Set<number>>(new Set());

  const card = items[current];
  const total = items.length;
  const pct = Math.round(((current + 1) / total) * 100);

  const next = useCallback(() => { setCurrent(c => Math.min(total - 1, c + 1)); setFlipped(false); }, [total]);
  const prev = useCallback(() => { setCurrent(c => Math.max(0, c - 1)); setFlipped(false); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === " " || e.key === "Enter") { e.preventDefault(); setFlipped(f => !f); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev]);

  const markKnown = () => {
    setKnown(s => new Set([...s, current]));
    setUnknown(s => { const n = new Set(s); n.delete(current); return n; });
    next();
  };
  const markUnknown = () => {
    setUnknown(s => new Set([...s, current]));
    setKnown(s => { const n = new Set(s); n.delete(current); return n; });
    next();
  };

  return (
    <div className="flex flex-col items-center gap-6 animate-fade-in">
      {/* Stats row */}
      <div className="flex items-center gap-4 w-full max-w-lg">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500">
          <CheckCircle2 size={13} /> {known.size} known
        </div>
        <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#00b8d4] to-[#00e5ff] transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-red-400">
          <XCircle size={13} /> {unknown.size} review
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 font-medium">{current + 1} / {total}</span>
        <FocusTypeBadge focusType={card.focus_type} />
      </div>

      {/* Card flip container */}
      <div className="w-full max-w-lg" style={{ perspective: "1200px" }}>
        <div
          onClick={() => setFlipped(f => !f)}
          className="relative cursor-pointer select-none"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
            minHeight: 220,
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#112240] flex flex-col items-center justify-center p-8 shadow-lg"
            style={{ backfaceVisibility: "hidden" }}
          >
            <SectionLabel color="cyan">Term</SectionLabel>
            <div className="mt-5 text-center">
              <MarkdownContent size="base" className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{card.front}</MarkdownContent>
            </div>
            <p className="mt-5 text-xs text-slate-400">Tap to reveal answer · Space / Enter</p>
          </div>
          {/* Back */}
          <div
            className="absolute inset-0 rounded-2xl border border-[#00e5ff]/30 bg-gradient-to-br from-[#00e5ff]/5 to-[#006080]/5 dark:from-[#0a2540] dark:to-[#0f2038] flex flex-col items-center justify-center p-8 shadow-lg overflow-visible"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <SectionLabel color="emerald">Answer</SectionLabel>
            <div className="mt-5 text-center">
              <MarkdownContent size="base" className="text-slate-700 dark:text-slate-200 leading-relaxed prose-ul:text-left">{card.back}</MarkdownContent>
            </div>
            {card.example && (
              <div className="mt-3 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 text-center max-w-full">
                <span className="font-semibold">Example: </span>
                <MarkdownContent size="sm" className="inline">{card.example}</MarkdownContent>
              </div>
            )}
            <p className="mt-4 text-xs text-slate-400">Tap to flip back · ← / → to navigate</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={prev}
          disabled={current === 0}
          className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
        >
          ←
        </button>
        <button
          onClick={markUnknown}
          disabled={current >= total - 1 && !flipped}
          className="px-4 py-2 rounded-xl border border-red-500/30 text-red-500 text-sm font-semibold hover:bg-red-500/10 transition-all"
        >
          Review later
        </button>
        <button
          onClick={markKnown}
          className="px-4 py-2 rounded-xl border border-emerald-500/30 text-emerald-500 text-sm font-semibold hover:bg-emerald-500/10 transition-all"
        >
          Got it ✓
        </button>
        <button
          onClick={next}
          disabled={current >= total - 1}
          className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
        >
          →
        </button>
      </div>

      {/* Dot navigator */}
      <div className="flex gap-1.5 flex-wrap justify-center max-w-xs">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => { setCurrent(i); setFlipped(false); }}
            className={`w-2 h-2 rounded-full transition-all ${
              i === current ? "w-5 bg-[#00e5ff]" :
              known.has(i) ? "bg-emerald-400" :
              unknown.has(i) ? "bg-red-400" :
              "bg-slate-300 dark:bg-slate-700"
            }`}
          />
        ))}
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Page Summary Renderer
// ─────────────────────────────────────────────────────────────────────────────

const PageSummaryRenderer = memo(function PageSummaryRenderer({ pages }: { pages: PageItem[] }) {
  const [open, setOpen] = useState<Set<number>>(new Set([0]));
  const toggle = (i: number) => setOpen(s => {
    const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n;
  });
  return (
    <div className="space-y-2.5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <SectionLabel color="blue">📄 {pages.length} pages summarized</SectionLabel>
        <div className="flex gap-2">
          <button onClick={() => setOpen(new Set(pages.map((_, i) => i)))}
            className="text-xs text-[#00b8d4] hover:text-[#00e5ff] font-medium transition-colors">Expand all</button>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <button onClick={() => setOpen(new Set())}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium transition-colors">Collapse all</button>
        </div>
      </div>
      {pages.map((pg, i) => (
        <div key={i} className="bg-white dark:bg-[#112240] rounded-2xl border border-slate-200 dark:border-slate-700/80 overflow-visible transition-all">
          <button
            onClick={() => toggle(i)}
            className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#00e5ff]/10 border border-[#00e5ff]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-black text-[#00b8d4] dark:text-[#00e5ff]">{pg.page}</span>
            </div>
            <span className="flex-1 font-semibold text-slate-900 dark:text-white text-sm group-hover:text-[#00b8d4] dark:group-hover:text-[#00e5ff] transition-colors">
              Page {pg.page}
            </span>
            {open.has(i)
              ? <ChevronUp size={16} className="text-slate-400 flex-shrink-0" />
              : <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />}
          </button>
          {open.has(i) && (
            <div className="px-5 pb-5 pt-1 border-t border-slate-100 dark:border-slate-800 animate-fade-in">
              <EnhancedMarkdown content={pg.summary} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Notes / Summary Result — enhanced markdown layout
// ─────────────────────────────────────────────────────────────────────────────

const MarkdownResult = memo(function MarkdownResult({ content, action }: {
  content: string; action: string;
}) {
  const isError = content.startsWith("**Failed");
  if (isError) {
    return (
      <div className="flex flex-col items-center text-center py-12 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
          <AlertCircle size={28} className="text-red-500" />
        </div>
        <h3 className="font-bold text-slate-900 dark:text-white mb-1">Generation Failed</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
          The AI could not generate content. This usually means the material hasn't been indexed yet.
        </p>
      </div>
    );
  }

  const header = action === "notes"
    ? { icon: "📝", label: "Study Notes", color: "emerald" }
    : { icon: "📘", label: "Summary", color: "blue" };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-xl">{header.icon}</span>
        <SectionLabel color={header.color as "emerald" | "blue"}>{header.label}</SectionLabel>
        <span className="text-xs text-slate-400 ml-auto">AI Generated · Review before relying on</span>
      </div>
      <div className="bg-white dark:bg-[#112240] rounded-2xl border border-slate-200 dark:border-slate-700/80 p-6 shadow-sm">
        <EnhancedMarkdown content={content} />
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// AI Loader overlay
// ─────────────────────────────────────────────────────────────────────────────

function AiLoader({ action }: { action: string }) {
  const tip = useRotatingTip(action);
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/70 dark:bg-[#0a192f]/80 animate-fade-in">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full border-4 border-[#00e5ff]/10" />
        <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-t-[#00e5ff] border-r-[#00b8d4] border-b-transparent border-l-transparent animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles size={22} className="text-[#00e5ff] animate-pulse" />
        </div>
      </div>
      <div className="text-center px-6">
        <p className="text-base font-bold text-slate-900 dark:text-white mb-1 transition-all duration-500">
          {tip}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">This may take a moment for large materials</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Tool Options — per-tool configuration panels
// ─────────────────────────────────────────────────────────────────────────────

type AiToolOptions = Record<string, string | number | boolean>;

interface ToolCard {
  action: string; title: string; desc: string;
  icon: React.ReactNode; accent: string; glow: string; span?: boolean;
}

// Option values are snake_case to match the API exactly
const DEFAULT_OPTIONS: Record<string, AiToolOptions> = {
  quiz:       { count: 10, difficulty: "mixed",        question_type: "mcq" },
  flashcards: { count: 10, focus: "mixed",             include_examples: false },
  summary:    { length: "medium", format: "study_notes", include_formulas: true },
  pages:      { detail_level: "normal", include_key_terms: true, include_formulas: true },
  notes:      { notes_style: "bullet_notes", detail_level: "detailed", include_examples: true, include_formulas: true },
};

function OptionToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
      <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative w-10 h-6 rounded-full transition-colors duration-200 ${value ? "bg-[#00b8d4]" : "bg-slate-300 dark:bg-slate-600"}`}
      >
        <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${value ? "translate-x-4" : "translate-x-0"}`} />
      </button>
    </label>
  );
}

function OptionChips({ label, options, labels, value, onChange }: {
  label: string; options: string[]; labels?: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt, i) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
              value === opt
                ? "border-[#00e5ff]/60 bg-[#00e5ff]/10 text-[#00b8d4] dark:text-[#00e5ff]"
                : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-[#00e5ff]/30 hover:bg-[#00e5ff]/5"
            }`}
          >
            {labels?.[i] ?? opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function OptionCountChips({ label, options, value, onChange }: {
  label: string; options: number[]; value: number; onChange: (v: number) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all min-w-[2.5rem] ${
              value === opt
                ? "border-[#00e5ff]/60 bg-[#00e5ff]/10 text-[#00b8d4] dark:text-[#00e5ff]"
                : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-[#00e5ff]/30 hover:bg-[#00e5ff]/5"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

interface AiOptionsPanelProps {
  tool: ToolCard;
  options: AiToolOptions;
  onChange: (key: string, value: string | number | boolean) => void;
  onBack: () => void;
  onGenerate: () => void;
  loading: boolean;
}

function AiOptionsPanel({ tool, options, onChange, onBack, onGenerate, loading }: AiOptionsPanelProps) {
  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      {/* Tool header */}
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${tool.accent}`}>
          {tool.icon}
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white">{tool.title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Customize before generating</p>
        </div>
      </div>

      {/* Options by tool — keys match API snake_case exactly */}
      <div className="bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 space-y-5 mb-6">
        {tool.action === "quiz" && (
          <>
            <OptionCountChips label="Number of questions" options={[5, 10, 15, 20]} value={options.count as number} onChange={v => onChange("count", v)} />
            <OptionChips
              label="Difficulty"
              options={["easy", "medium", "hard", "mixed"]}
              labels={["Easy", "Medium", "Hard", "Mixed"]}
              value={options.difficulty as string}
              onChange={v => onChange("difficulty", v)}
            />
            <OptionChips
              label="Question type"
              options={["mcq", "true_false", "mixed"]}
              labels={["MCQ", "True / False", "Mixed"]}
              value={options.question_type as string}
              onChange={v => onChange("question_type", v)}
            />
          </>
        )}
        {tool.action === "flashcards" && (
          <>
            <OptionCountChips label="Number of cards" options={[5, 10, 15, 20, 30]} value={options.count as number} onChange={v => onChange("count", v)} />
            <OptionChips
              label="Focus on"
              options={["key_terms", "definitions", "formulas", "mixed"]}
              labels={["Key terms", "Definitions", "Formulas", "Mixed"]}
              value={options.focus as string}
              onChange={v => onChange("focus", v)}
            />
            <OptionToggle label="Include examples" value={options.include_examples as boolean} onChange={v => onChange("include_examples", v)} />
          </>
        )}
        {tool.action === "summary" && (
          <>
            <OptionChips
              label="Length"
              options={["short", "medium", "detailed"]}
              labels={["Short", "Medium", "Detailed"]}
              value={options.length as string}
              onChange={v => onChange("length", v)}
            />
            <OptionChips
              label="Format"
              options={["paragraph", "bullet_points", "study_notes"]}
              labels={["Paragraph", "Bullet points", "Study notes"]}
              value={options.format as string}
              onChange={v => onChange("format", v)}
            />
            <OptionToggle label="Include formulas & equations" value={options.include_formulas as boolean} onChange={v => onChange("include_formulas", v)} />
          </>
        )}
        {tool.action === "pages" && (
          <>
            <OptionChips
              label="Detail level per page"
              options={["brief", "normal", "detailed"]}
              labels={["Brief", "Normal", "Detailed"]}
              value={options.detail_level as string}
              onChange={v => onChange("detail_level", v)}
            />
            <OptionToggle label="Include key terms" value={options.include_key_terms as boolean} onChange={v => onChange("include_key_terms", v)} />
            <OptionToggle label="Include formulas & equations" value={options.include_formulas as boolean} onChange={v => onChange("include_formulas", v)} />
          </>
        )}
        {tool.action === "notes" && (
          <>
            <OptionChips
              label="Notes style"
              options={["cornell", "bullet_notes", "exam_revision"]}
              labels={["Cornell", "Bullet notes", "Exam revision"]}
              value={options.notes_style as string}
              onChange={v => onChange("notes_style", v)}
            />
            <OptionChips
              label="Detail level"
              options={["normal", "detailed", "very_detailed"]}
              labels={["Normal", "Detailed", "Very detailed"]}
              value={options.detail_level as string}
              onChange={v => onChange("detail_level", v)}
            />
            <OptionToggle label="Include examples" value={options.include_examples as boolean} onChange={v => onChange("include_examples", v)} />
            <OptionToggle label="Include formulas & equations" value={options.include_formulas as boolean} onChange={v => onChange("include_formulas", v)} />
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all disabled:opacity-40"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <button
          type="button"
          onClick={onGenerate}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00b8d4] to-[#0891b2] text-white text-sm font-bold hover:opacity-90 transition-all shadow-[0_4px_15px_rgba(0,229,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <><Sparkles size={15} /> Generate</>
          )}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool grid item
// ─────────────────────────────────────────────────────────────────────────────

const TOOLS: ToolCard[] = [
  {
    action: "summary", title: "Summarize Material", desc: "Get a concise overview of the document's core concepts.",
    icon: <FileText size={24} />, accent: "text-blue-500 bg-blue-500/10", glow: "hover:shadow-[0_8px_30px_rgba(59,130,246,0.15)] hover:border-blue-500/50",
  },
  {
    action: "pages", title: "Page-by-Page Summary", desc: "Break down the document page by page for detailed sequential reading.",
    icon: <BookOpen size={24} />, accent: "text-indigo-500 bg-indigo-500/10", glow: "hover:shadow-[0_8px_30px_rgba(99,102,241,0.15)] hover:border-indigo-500/50",
  },
  {
    action: "flashcards", title: "Flashcard Deck", desc: "Extract key terms and definitions into a ready-to-study format.",
    icon: <Layers size={24} />, accent: "text-pink-500 bg-pink-500/10", glow: "hover:shadow-[0_8px_30px_rgba(236,72,153,0.15)] hover:border-pink-500/50",
  },
  {
    action: "quiz", title: "Quiz Me", desc: "Test your knowledge with AI-generated multiple-choice questions.",
    icon: <FileQuestion size={24} />, accent: "text-amber-500 bg-amber-500/10", glow: "hover:shadow-[0_8px_30px_rgba(245,158,11,0.15)] hover:border-amber-500/50",
  },
  {
    action: "notes", title: "Comprehensive Notes", desc: "Turn this document into structured study notes with bullet points.",
    icon: <BrainCircuit size={24} />, accent: "text-emerald-500 bg-emerald-500/10", glow: "hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)] hover:border-emerald-500/50",
    span: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Material type config
// ─────────────────────────────────────────────────────────────────────────────

const typeIcons: Record<string, typeof FileText> = {
  pdf: FileText, link: Link2, video: Video, image: ImageIcon, document: FileText,
};
const typeColors: Record<string, string> = {
  pdf:      "bg-red-500/10 text-red-400",
  link:     "bg-blue-500/10 text-blue-400",
  video:    "bg-purple-500/10 text-purple-600",
  image:    "bg-green-500/10 text-green-500",
  document: "bg-amber-500/10 text-amber-400",
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ClassMaterialsTab() {
  const { classId, user } = useOutletContext<Ctx>();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [lectures, setLectures]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", url: "", type: "pdf" as Material["type"],
    summarize: "", file: null as File | null, lecture_id: "",
  });

  // AI state
  const [activeAiMaterial, setActiveAiMaterial] = useState<Material | null>(null);
  const [aiLoading, setAiLoading]   = useState<string | null>(null);
  const [aiResult, setAiResult]     = useState<AiResult | null>(null);
  const [lastAction, setLastAction] = useState<string>("");
  const [aiModalStep, setAiModalStep] = useState<"tools" | "options" | "result">("tools");
  const [selectedAiTool, setSelectedAiTool] = useState<ToolCard | null>(null);
  const [aiToolOptions, setAiToolOptions] = useState<AiToolOptions>({});
  const resultContentRef = useRef<HTMLDivElement>(null);
  // Cache state
  const [cacheInfo, setCacheInfo] = useState<{ updatedAt: string; wasRegenerated?: boolean } | null>(null);
  const [checkingCache, setCheckingCache] = useState(false);
  // Regenerate state (separate from aiLoading so old result stays visible)
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);

  /** Restore a cached AiResult from a saved content blob. */
  const restoreFromCache = useCallback((action: string, title: string, content: any): AiResult | null => {
    if (action === "summary" || action === "notes") {
      if (typeof content?.text === "string")
        return { type: "markdown", title, content: content.text, action };
    }
    if (action === "flashcards") {
      if (Array.isArray(content?.items) && content.items.length) {
        const items: FlashItem[] = content.items.map((c: any) => ({
          focus_type: c.focus_type ?? null,
          front:      normalizeFlashcardText(c.front ?? ""),
          back:       normalizeFlashcardText(c.back  ?? ""),
          example:    c.example ? normalizeFlashcardText(c.example) : null,
        }));
        return { type: "flashcards", title, items, action };
      }
    }
    if (action === "quiz") {
      if (Array.isArray(content?.items) && content.items.length)
        return { type: "quiz", title, items: content.items, action };
    }
    if (action === "pages") {
      if (Array.isArray(content?.pages) && content.pages.length)
        return { type: "pages", title, pages: content.pages, action };
    }
    return null;
  }, []);

  /** Serialise an AiResult into a content blob for storage. */
  function serializeResult(result: AiResult): any {
    if (result.type === "markdown" || result.type === "error")
      return { text: result.content };
    if (result.type === "flashcards")
      return { items: result.items };
    if (result.type === "quiz")
      return { items: result.items };
    if (result.type === "pages")
      return { pages: result.pages };
    return {};
  }

  const openAiToolOptions = useCallback(async (tool: ToolCard, mat: Material) => {
    setSelectedAiTool(tool);
    const opts = { ...DEFAULT_OPTIONS[tool.action] };
    setAiToolOptions(opts);
    setCacheInfo(null);

    // Check for a saved result with default options before showing options panel
    const mid = safeMaterialId(mat);
    setCheckingCache(true);
    try {
      const saved = await studyOutputService.get(classId, mid, tool.action, opts);
      if (saved) {
        const restored = restoreFromCache(tool.action, tool.title, saved.content);
        if (restored) {
          setLastAction(tool.action);
          setAiResult(restored);
          setAiModalStep("result");
          setCacheInfo({ updatedAt: saved.updated_at });
          return;
        }
      }
    } catch { /* ignore — just show options */ }
    finally { setCheckingCache(false); }

    setAiModalStep("options");
  }, [classId, restoreFromCache]);

  /**
   * Core AI generation — calls the correct endpoint for `action`, returns a
   * fully-built AiResult or throws. Does NOT touch component state directly so
   * it can be reused by both first-time generation and the Regenerate path.
   */
  const runGeneration = useCallback(async (
    mat: Material,
    action: string,
    title: string,
    opts: AiToolOptions,
    forceRefresh = false,
  ): Promise<AiResult> => {
    const mid = safeMaterialId(mat);
    console.log('[REGENERATE] request body:', { class_id: classId, material_id: mid, tool_type: action, options: opts, force_refresh: forceRefresh });

    if (action === "summary") {
      const res = await aiRagService.summarizeMaterial(classId, mid, opts, forceRefresh);
      const raw = res.data.summary ?? res.data.answer ?? "";
      console.debug("[StudyAI] summary field:", res.data.summary !== undefined ? "summary" : "answer", "len:", raw.length);
      return { type: "markdown", title, content: stripFences(String(raw)), action };
    }
    if (action === "notes") {
      const res = await aiRagService.getNotes(classId, mid, opts, forceRefresh);
      const raw = res.data.notes ?? res.data.answer ?? "";
      return { type: "markdown", title, content: stripFences(String(raw)), action };
    }
    if (action === "flashcards") {
      const res = await aiRagService.getFlashcards(classId, mid, opts, forceRefresh);
      const rawCards = parseJsonSafe<any[]>(res.data.flashcards) ?? [];
      const items: FlashItem[] = rawCards.map(c => ({
        focus_type: c.focus_type ?? null,
        front:      normalizeFlashcardText(c.front   ?? c.term       ?? ""),
        back:       normalizeFlashcardText(c.back    ?? c.definition ?? ""),
        example:    c.example ? normalizeFlashcardText(c.example) : null,
      })).filter(c => c.front && c.back);
      if (!items.length) throw new Error("No flashcards returned.");
      return { type: "flashcards", title, items, action };
    }
    if (action === "quiz") {
      const res = await aiRagService.getQuiz(classId, mid, opts, forceRefresh);
      const items = parseJsonSafe<QuizItem[]>(res.data.quiz) ?? [];
      if (!items.length) throw new Error("No quiz questions returned.");
      return { type: "quiz", title, items, action };
    }
    if (action === "pages") {
      const res = await aiRagService.getPageSummaries(classId, mid, opts, forceRefresh);
      const pages: PageItem[] = (res.data.page_summaries ?? res.data.summaries ?? []).map(
        (p: any) => ({ page: Number(p.page ?? p.page_number ?? 0), summary: stripFences(String(p.summary ?? "")) })
      );
      if (!pages.length) throw new Error("No page summaries returned.");
      return { type: "pages", title, pages, action };
    }
    throw new Error(`Unknown action: ${action}`);
  }, [classId]);

  /**
   * First-time generate (from options panel or tool card with no cache).
   * Checks the DB cache first; calls AI only when nothing is saved yet.
   */
  const handleAiAction = useCallback(async (
    mat: Material,
    action: string,
    title: string,
    opts?: AiToolOptions,
  ) => {
    const effectiveOpts = opts ?? DEFAULT_OPTIONS[action] ?? {};
    const mid = safeMaterialId(mat);

    setAiLoading(action);
    setLastAction(action);
    setAiResult(null);
    setCacheInfo(null);
    setAiModalStep("result");
    setRegenError(null);

    // Check DB cache first
    try {
      const saved = await studyOutputService.get(classId, mid, action, effectiveOpts);
      if (saved) {
        const restored = restoreFromCache(action, title, saved.content);
        if (restored) {
          console.log('[StudyAI] loaded from cache:', action);
          setAiResult(restored);
          setCacheInfo({ updatedAt: saved.updated_at });
          setAiLoading(null);
          return;
        }
      }
    } catch { /* cache miss — fall through */ }

    // No cache — generate fresh
    try {
      const generated = await runGeneration(mat, action, title, effectiveOpts);
      console.log('[StudyAI] generated fresh:', action);
      const now = new Date().toISOString();
      setCacheInfo({ updatedAt: now });
      setAiResult(generated);
      studyOutputService.save(classId, mid, action, effectiveOpts, serializeResult(generated))
        .catch(e => console.warn('[StudyAI] persist failed:', e.message));
    } catch (err: any) {
      setAiResult({ type: "error", title, content: `**Failed to generate content.**\n\n${err.message ?? "Unknown error"}`, action });
      setCacheInfo(null);
    } finally {
      setAiLoading(null);
    }
  }, [classId, restoreFromCache, runGeneration]);

  /**
   * Regenerate — always bypasses cache, keeps old result visible while working,
   * replaces on success, restores + shows toast on failure.
   */
  const handleRegenerate = useCallback(async () => {
    if (!activeAiMaterial || !selectedAiTool || regenerating) return;

    const action = lastAction || selectedAiTool.action;
    const title  = aiResult?.title ?? selectedAiTool.title;
    const opts   = { ...(aiToolOptions && Object.keys(aiToolOptions).length ? aiToolOptions : DEFAULT_OPTIONS[action] ?? {}) };
    const mid    = safeMaterialId(activeAiMaterial);

    console.log('[REGENERATE] clicked — action:', action, 'opts:', opts, 'material:', mid);
    console.log('[REGENERATE] force_refresh=true');

    const previousResult = aiResult;
    const previousCache  = cacheInfo;

    setRegenerating(true);
    setRegenError(null);
    // Keep aiResult intact so old content stays visible under the overlay

    try {
      console.log('[REGENERATE] body:', { class_id: classId, material_id: mid, action, opts, force_refresh: true });
      const generated = await runGeneration(activeAiMaterial, action, title, opts, true);
      console.log('[REGENERATE] response received — type:', generated.type);

      const now = new Date().toISOString();
      await studyOutputService.save(classId, mid, action, opts, serializeResult(generated))
        .catch(e => console.warn('[REGENERATE] persist failed:', e.message));

      setAiResult(generated);
      setCacheInfo({ updatedAt: now, wasRegenerated: true });
      console.log('[REGENERATE] UI state updated — wasRegenerated: true');
    } catch (err: any) {
      console.error('[REGENERATE] failed:', err.message);
      setAiResult(previousResult);
      setCacheInfo(previousCache);
      setRegenError("Could not regenerate. Your saved result is still available.");
      setTimeout(() => setRegenError(null), 5000);
    } finally {
      setRegenerating(false);
    }
  }, [activeAiMaterial, selectedAiTool, regenerating, lastAction, aiResult, aiToolOptions, cacheInfo, classId, runGeneration]);

  const closeAiModal = useCallback(() => {
    setActiveAiMaterial(null); setAiResult(null); setAiLoading(null);
    setAiModalStep("tools"); setSelectedAiTool(null); setAiToolOptions({});
    setCacheInfo(null); setCheckingCache(false);
    setRegenerating(false); setRegenError(null);
  }, []);

  useEffect(() => {
    Promise.all([materialService.getByClass(classId), lectureService.getByClass(classId)])
      .then(([m, l]) => { setMaterials(m.data); setLectures(l.data); })
      .finally(() => setLoading(false));
  }, [classId]);

  const handleUpload = async () => {
    if (!form.name.trim() || !form.lecture_id) { setUploadError("Name and Lecture are required"); return; }
    if (!form.file && !form.url.trim()) { setUploadError("Please provide either a file or a URL"); return; }
    setIsUploading(true); setUploadError(null);
    try {
      const res = await materialService.upload({
        ...form, class_id: classId, uploaded_by: user.user_id,
        document: form.file ? form.file.name : form.url || undefined,
        file: form.file || undefined,
      });
      setMaterials(prev => [res.data, ...prev]);
      setShowUpload(false);
      setForm({ name: "", url: "", type: "pdf", summarize: "", file: null, lecture_id: "" });
    } catch (err: any) {
      setUploadError(err.message || "Upload failed");
    } finally { setIsUploading(false); }
  };

  const handleDelete = async (matId: string) => {
    await materialService.delete(matId);
    setMaterials(prev => prev.filter(m => m.material_id !== matId));
  };

  const formatDate = (d: string) => {
    if (!d) return "Recently";
    const date = new Date(d);
    return isNaN(date.getTime()) ? "Recently" : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Upload button */}
      {user.role === "doctor" && (
        <div className="flex justify-end">
          <button onClick={() => setShowUpload(true)} className="btn-primary text-sm flex items-center gap-2">
            <Plus size={16} /> Upload Material
          </button>
        </div>
      )}

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setShowUpload(false)}>
          <div className="bg-slate-50 dark:bg-[#0a192f] border border-slate-300 dark:border-slate-700/50 rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.8)] w-full max-w-md p-6 animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Upload Material</h3>
              <button onClick={() => setShowUpload(false)} className="p-1 hover:bg-surface-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              {uploadError && <div className="p-3 bg-red-500/10 text-red-500 text-xs rounded-xl border border-red-500/20">{uploadError}</div>}
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Material name" className="input-field" />
              <select value={form.lecture_id} onChange={e => setForm({ ...form, lecture_id: e.target.value })} className="input-field">
                <option value="">Select Lecture</option>
                {lectures.map(l => <option key={l.lec_id} value={l.lec_id}>{l.title || `Lecture ${l.lec_id}`} ({l.date || l.day})</option>)}
              </select>
              <input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="URL or file path" className="input-field" />
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as Material["type"] })} className="input-field">
                <option value="pdf">PDF</option><option value="link">Link</option>
                <option value="video">Video</option><option value="document">Document</option><option value="image">Image</option>
              </select>
              <textarea value={form.summarize} onChange={e => setForm({ ...form, summarize: e.target.value })} placeholder="Summary (optional)" className="input-field resize-none" rows={2} />
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-[#00e5ff]/5 transition-colors">
                <Upload size={24} className={form.file ? "text-primary-500" : "text-surface-400 mb-2"} />
                <span className="text-sm text-slate-600 dark:text-slate-400 text-center">
                  {form.file ? `Selected: ${form.file.name}` : "Drag & drop files here, or click to browse"}
                </span>
                <input type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setForm(prev => ({ ...prev, name: prev.name || f.name, file: f })); }} />
              </label>
              <button onClick={handleUpload} disabled={isUploading} className="btn-primary w-full flex items-center justify-center gap-2">
                {isUploading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Materials list */}
      {materials.map((mat, i) => {
        const Icon = typeIcons[mat.type] || FileText;
        const colorClass = typeColors[mat.type] || typeColors.document;
        return (
          <div key={mat.material_id} className="card p-4 animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass} flex-shrink-0`}>
                <Icon size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">{mat.name}</h3>
                {mat.summarize && <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{mat.summarize}</p>}
                <div className="flex items-center gap-3 mt-2 text-xs text-surface-400">
                  <span className="badge bg-surface-100 text-slate-600 dark:text-slate-400 uppercase">{mat.type}</span>
                  <span>{formatDate(mat.uploaded_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {user.role === "student" && (
                  <>
                    <button
                      onClick={() => { setActiveAiMaterial(mat); setAiResult(null); setAiModalStep("tools"); setSelectedAiTool(null); setAiToolOptions({}); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#00e5ff]/10 to-[#00b8d4]/10 border border-[#00e5ff]/20 text-[#00b8d4] dark:text-[#00e5ff] hover:from-[#00e5ff]/20 hover:to-[#00b8d4]/20 text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_10px_rgba(0,229,255,0.05)] hover:shadow-[0_0_15px_rgba(0,229,255,0.15)]"
                    >
                      <Sparkles size={14} /> Study with AI
                    </button>
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700/50 mx-1" />
                  </>
                )}
                {mat.type === "link" || mat.type === "video"
                  ? <a href={mat.url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-surface-100 rounded-lg transition-colors text-slate-600 dark:text-slate-400"><ExternalLink size={16} /></a>
                  : <button className="p-2 hover:bg-surface-100 rounded-lg transition-colors text-slate-600 dark:text-slate-400"><Download size={16} /></button>
                }
                {user.role === "doctor" && (
                  <button onClick={() => handleDelete(mat.material_id)} className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-surface-400 hover:text-red-500">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {materials.length === 0 && (
        <div className="card p-12 text-center">
          <FileText size={48} className="mx-auto text-surface-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">No Materials Yet</h3>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {user.role === "doctor" ? "Upload materials for your students." : "No materials have been uploaded yet."}
          </p>
        </div>
      )}

      {/* ── Study with AI Modal ─────────────────────────────────────────────── */}
      {activeAiMaterial && (
        <div
          className="fixed inset-0 bg-slate-900/60 dark:bg-[#050b14]/80 z-[100] flex items-center justify-center p-4 sm:p-6"
          onClick={closeAiModal}
        >
          <div
            className="bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-slate-700/60 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_80px_rgba(0,0,0,0.8)] w-full max-w-4xl h-[90vh] flex flex-col animate-scale-in overflow-hidden relative"
            onClick={e => e.stopPropagation()}
          >
            {/* ── Modal Header ─────────────────────────────────────────────── */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-50 dark:from-[#0f2038] to-white dark:to-[#0a192f] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {(aiModalStep === "options" || aiModalStep === "result") && (
                  <button
                    onClick={() => {
                      if (aiModalStep === "result") {
                        setAiResult(null);
                        setAiModalStep(selectedAiTool ? "options" : "tools");
                      } else {
                        setAiModalStep("tools");
                        setSelectedAiTool(null);
                      }
                    }}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-all flex-shrink-0"
                  >
                    <ArrowLeft size={16} />
                  </button>
                )}
                <div className="w-10 h-10 rounded-2xl bg-[#00e5ff]/10 border border-[#00e5ff]/20 flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.1)] flex-shrink-0">
                  <Sparkles size={20} className="text-[#00e5ff]" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-slate-900 dark:text-white truncate">
                    {aiModalStep === "result" && aiResult ? aiResult.title :
                     aiModalStep === "options" && selectedAiTool ? selectedAiTool.title :
                     "Study with AI"}
                  </h2>
                  <p className="text-xs text-slate-400 truncate">{activeAiMaterial.name}</p>
                </div>
              </div>
              <button
                onClick={closeAiModal}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-all flex-shrink-0 ml-3"
              >
                <X size={18} />
              </button>
            </div>

            {/* ── Modal Body ───────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto relative">
              {/* Loading overlay */}
              {aiLoading && <AiLoader action={aiLoading} />}

              <div className="p-6 md:p-8">
                {aiModalStep === "tools" && (
                  /* ── Tool selection grid ──────────────────────────────── */
                  <div className="max-w-2xl mx-auto animate-fade-in">
                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        How would you like to study?
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400 text-sm">
                        {checkingCache
                          ? "Checking for saved results…"
                          : "Choose an AI tool to instantly extract knowledge from this material."}
                      </p>
                      {checkingCache && (
                        <div className="flex items-center justify-center gap-2 mt-3 text-xs text-[#00b8d4]">
                          <Loader2 size={12} className="animate-spin" />
                          <span>Loading saved result…</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {TOOLS.map(tool => (
                        <button
                          key={tool.action}
                          onClick={() => openAiToolOptions(tool, activeAiMaterial)}
                          disabled={!!aiLoading || checkingCache}
                          className={`group p-5 bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-700/80 rounded-2xl text-left flex gap-4 items-start transition-all disabled:opacity-50 disabled:cursor-not-allowed ${tool.glow} ${tool.span ? "sm:col-span-2 sm:max-w-md sm:mx-auto sm:w-full" : ""}`}
                        >
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform ${tool.accent}`}>
                            {tool.icon}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white mb-1 text-sm leading-tight">{tool.title}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{tool.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {aiModalStep === "options" && selectedAiTool && (
                  /* ── Options panel ────────────────────────────────────── */
                  <AiOptionsPanel
                    tool={selectedAiTool}
                    options={aiToolOptions}
                    onChange={(key, value) => setAiToolOptions(prev => ({ ...prev, [key]: value }))}
                    onBack={() => { setAiModalStep("tools"); setSelectedAiTool(null); }}
                    onGenerate={() => handleAiAction(activeAiMaterial, selectedAiTool.action, selectedAiTool.title, aiToolOptions)}
                    loading={!!aiLoading}
                  />
                )}

                {aiModalStep === "result" && aiResult && (
                  /* ── Result view ──────────────────────────────────────── */
                  <div className={`max-w-3xl mx-auto animate-fade-in relative transition-opacity duration-300 ${regenerating ? "opacity-50 pointer-events-none" : ""}`}>
                    <div ref={resultContentRef} className="overflow-visible">
                      {(aiResult.type === "markdown" || aiResult.type === "error") && (
                        <MarkdownResult content={aiResult.content} action={aiResult.action} />
                      )}
                      {aiResult.type === "quiz" && (
                        <QuizRenderer
                          items={aiResult.items}
                          onRetry={handleRegenerate}
                        />
                      )}
                      {aiResult.type === "flashcards" && (
                        <FlashcardRenderer items={aiResult.items} />
                      )}
                      {aiResult.type === "pages" && (
                        <PageSummaryRenderer pages={aiResult.pages} />
                      )}
                    </div>

                    {/* Cache / regenerate banner */}
                    {cacheInfo && (
                      <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/8 dark:bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400">
                        <Database size={11} className="flex-shrink-0" />
                        <span className="font-medium">
                          {cacheInfo.wasRegenerated ? "Regenerated just now" : "Loaded saved result"}
                        </span>
                        {!cacheInfo.wasRegenerated && (
                          <>
                            <span className="text-emerald-500/70 dark:text-emerald-500/50 mx-1">·</span>
                            <Clock size={10} className="flex-shrink-0" />
                            <span>
                              Generated {new Date(cacheInfo.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              {" at "}
                              {new Date(cacheInfo.updatedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Regenerate error toast */}
                    {regenError && (
                      <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500 dark:text-red-400">
                        <AlertCircle size={11} className="flex-shrink-0" />
                        <span>{regenError}</span>
                      </div>
                    )}

                    {/* Re-generate / change options / export */}
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-xs text-slate-400 flex items-center gap-1.5">
                        <BrainCircuit size={12} /> AI-generated · May contain inaccuracies
                      </p>
                      <div className="flex items-center gap-3 flex-wrap">
                        {selectedAiTool && (
                          <button
                            onClick={() => { setAiResult(null); setCacheInfo(null); setAiModalStep("options"); }}
                            disabled={!!aiLoading}
                            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors font-medium disabled:opacity-40"
                          >
                            <ArrowLeft size={12} /> Change options
                          </button>
                        )}
                        <button
                          onClick={handleRegenerate}
                          disabled={regenerating || !!aiLoading}
                          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-[#00b8d4] dark:hover:text-[#00e5ff] transition-colors font-medium disabled:opacity-40"
                        >
                          {regenerating
                            ? <><Loader2 size={12} className="animate-spin" /> Regenerating…</>
                            : <><RotateCcw size={12} /> Regenerate</>
                          }
                        </button>
                        {aiResult.type !== "error" && (
                          <ExportMenu
                            result={aiResult as AiResultData}
                            meta={{
                              materialName:    activeAiMaterial.name,
                              generatedAt:     cacheInfo ? new Date(cacheInfo.updatedAt) : new Date(),
                              selectedOptions: aiToolOptions as Record<string, unknown>,
                            } satisfies ExportMeta}
                            contentRef={resultContentRef}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
