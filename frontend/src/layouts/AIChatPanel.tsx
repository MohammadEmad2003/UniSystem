import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Sparkles, Send, X, Bot, User as UserIcon } from "lucide-react";
import { aiService, classService } from "../services";
import type { Class } from "../types";

type Msg = { role: "user" | "assistant"; text: string; ts: number };

export default function AIChatPanel() {
  const { classId } = useParams<{ classId: string }>();
  const [open, setOpen] = useState(false);
  const [classCtx, setClassCtx] = useState<Class | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!classId) {
      setClassCtx(null);
      return;
    }
    classService
      .getById(classId)
      .then((r) => setClassCtx(r.data))
      .catch(() => setClassCtx(null));
  }, [classId]);

  useEffect(() => {
    if (open)
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
  }, [messages, loading, open]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setMessages((m) => [...m, { role: "user", text: q, ts: Date.now() }]);
    setInput("");
    setLoading(true);
    try {
      const res = await aiService.ask(classId, q);
      const answer =
        (res.data as { answer?: string })?.answer || "No answer returned.";
      setMessages((m) => [
        ...m,
        { role: "assistant", text: answer, ts: Date.now() },
      ]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: e instanceof Error ? e.message : "Request failed",
          ts: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* Floating action button — bottom right */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="AI Assistant"
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300
          ${open
            ? "bg-slate-100 dark:bg-[#1a1a24] hover:bg-slate-200 dark:hover:bg-[#232332] text-slate-900 dark:text-white"
            : "bg-[#00b8d4] hover:bg-[#00e5ff] text-[#050b14] shadow-[0_0_15px_rgba(0,229,255,0.5)] hover:shadow-[0_0_25px_rgba(0,229,255,0.8)] hover:-translate-y-1"
          }`}
      >
        {open ? <X size={22} /> : <Sparkles size={22} />}
      </button>

      {/* Chat panel — slides up from bottom right */}
      <div
        className={`fixed bottom-24 right-6 z-50 w-80 bg-white dark:bg-[#0a192f]/95 backdrop-blur-3xl rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_15px_50px_rgba(0,0,0,0.8)] border border-slate-200 dark:border-slate-700/50 flex flex-col overflow-hidden transition-all duration-500
          ${open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"}`}
        style={{ maxHeight: "70vh" }}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-100 dark:from-[#111111]/80 to-slate-50 dark:to-[#0a192f] border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#00e5ff]/10 border border-[#00e5ff]/30 flex items-center justify-center shadow-[0_0_10px_rgba(0,229,255,0.2)]">
            <Sparkles size={16} className="text-[#00e5ff]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-slate-900 dark:text-white drop-shadow-md">
              AI Assistant
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {classCtx ? classCtx.course_name : "Open a class to get started"}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 bg-white dark:bg-transparent"
          style={{ minHeight: "200px" }}
        >
          {messages.length === 0 && (
            <div className="text-center text-slate-500 dark:text-slate-400 text-xs py-8 flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-[#00e5ff]/10 border border-[#00e5ff]/20 flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.1)]">
                <Bot size={28} className="text-[#00e5ff]" />
              </div>
              <p className="max-w-[200px] leading-relaxed">
                {classCtx
                  ? `Ask me anything about ${classCtx.course_name}`
                  : "Ask me anything — academic questions, study tips, or open a class for course-specific answers"}
              </p>
            </div>
          )}
          {messages.map((m) => (
            <div
              key={m.ts}
              className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${m.role === "user" ? "bg-[#00e5ff] text-[#050b14]" : "bg-white dark:bg-[#111111] border border-[#00e5ff]/30 text-[#00e5ff] shadow-[0_0_8px_rgba(0,229,255,0.2)]"}`}
              >
                {m.role === "user" ? <UserIcon size={14} /> : <Bot size={14} />}
              </div>
              <div
                className={`px-4 py-2.5 rounded-2xl text-sm max-w-[210px] whitespace-pre-wrap break-words leading-relaxed
                ${m.role === "user"
                    ? "bg-[#00e5ff]/20 text-slate-900 dark:text-white border border-[#00e5ff]/30 rounded-tr-sm shadow-[0_0_10px_rgba(0,229,255,0.1)]"
                    : "bg-white dark:bg-[#111111] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-tl-sm shadow-md"
                  }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3 items-center">
              <div className="w-8 h-8 rounded-full bg-white dark:bg-[#111111] border border-[#00e5ff]/30 text-[#00e5ff] shadow-[0_0_8px_rgba(0,229,255,0.2)] flex items-center justify-center">
                <Bot size={14} />
              </div>
              <div className="px-4 py-3.5 rounded-2xl rounded-tl-sm bg-white dark:bg-[#111111] border border-slate-200 dark:border-slate-800 shadow-md flex gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-bounce shadow-[0_0_5px_#00e5ff]"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-bounce shadow-[0_0_5px_#00e5ff]"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-bounce shadow-[0_0_5px_#00e5ff]"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0a192f]">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={
                classCtx
                  ? `Ask about ${classCtx.course_name}…`
                  : "Ask anything…"
              }
              rows={2}
              className="flex-1 resize-none px-4 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#00e5ff] focus:border-[#00e5ff] bg-white dark:bg-[#111111] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-inner hover:border-slate-300 dark:hover:border-slate-500 transition-colors"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="w-10 h-10 rounded-xl bg-[#00b8d4] hover:bg-[#00e5ff] text-[#050b14] flex items-center justify-center disabled:opacity-40 transition-all flex-shrink-0 shadow-[0_0_10px_rgba(0,184,212,0.3)] disabled:shadow-none"
              title="Send (Enter)"
            >
              <Send size={16} className="ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
