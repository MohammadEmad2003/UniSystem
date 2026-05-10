import { Component, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { sanitizeAiMarkdown } from '../utils/aiMathSanitizer';

// Fallback: if ReactMarkdown + KaTeX throws for any reason, render plain text.
class MathErrorBoundary extends Component<
  { children: ReactNode; fallback: string },
  { caught: boolean }
> {
  state = { caught: false };
  static getDerivedStateFromError() { return { caught: true }; }
  componentDidCatch(error: Error) {
    console.warn('[MATH_RENDER] fallback', error);
  }
  componentDidUpdate(prevProps: Readonly<{ children: ReactNode; fallback: string }>) {
    if (this.state.caught && prevProps.fallback !== this.props.fallback) {
      this.setState({ caught: false });
    }
  }
  render() {
    if (this.state.caught) {
      return <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{this.props.fallback}</p>;
    }
    return this.props.children;
  }
}

interface Props {
  children?: ReactNode;
  content?: string;
  /** Extra Tailwind classes applied to the outer wrapper */
  className?: string;
  /** prose size variant — defaults to 'sm' */
  size?: 'sm' | 'base';
  /** colour theme for prose — defaults to 'slate' */
  theme?: 'slate' | 'violet';
  /**
   * inline — renders without block-level prose wrapper.
   * Use inside flex rows (e.g. quiz options) where a <div> would break layout.
   */
  inline?: boolean;
}

const MATH_RENDER_DEBUG = Boolean(import.meta.env.DEV);

function childrenToString(node: ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(childrenToString).join('');
  return '';
}

/**
 * Renders Markdown + LaTeX (KaTeX) consistently across all Study-with-AI surfaces.
 * KaTeX CSS is imported globally in main.tsx.
 *
 * Full pipeline (automatic — no per-callsite wiring needed):
 *   normalizeMathContent()  ← structural cleanup + math detection/wrapping
 *   sanitizeAiMarkdown()    ← environment upgrades, OCR fixes, brace-balance validation
 *   ReactMarkdown           ← remark-gfm + remark-math + rehype-katex
 *
 * KaTeX fallback: throwOnError:false means any remaining invalid formula renders
 * as a styled KaTeX error span (red text) rather than throwing. The upstream
 * validateMathSegment pass catches the most common cases and downgrades them to
 * backtick `code` spans before KaTeX ever sees them.
 */
export default function MarkdownContent({
  children,
  content,
  className = '',
  size = 'sm',
  theme = 'slate',
  inline = false,
}: Props) {
  const proseSize = size === 'base' ? 'prose-base' : 'prose-sm';

  const codeColors =
    theme === 'violet'
      ? 'prose-code:text-violet-600 dark:prose-code:text-violet-400 prose-code:bg-violet-100/60 dark:prose-code:bg-violet-900/30'
      : 'prose-code:text-[#00e5ff] prose-code:bg-[#00e5ff]/10';

  const contentColors =
    theme === 'violet'
      ? `
        prose-headings:text-white dark:prose-headings:text-violet-100
        prose-strong:text-white dark:prose-strong:text-violet-100
        prose-blockquote:border-violet-200/40 dark:prose-blockquote:border-violet-400/30
        prose-blockquote:text-violet-50/90 dark:prose-blockquote:text-violet-100/80
        text-violet-50 dark:text-violet-100
      `
      : `
        prose-headings:text-slate-800 dark:prose-headings:text-slate-200
        prose-strong:text-slate-800 dark:prose-strong:text-slate-200
        prose-blockquote:border-slate-300 dark:prose-blockquote:border-slate-600
        text-slate-700 dark:text-slate-300
      `;

  const raw = typeof content === 'string' ? content : childrenToString(children);
  const safeRaw = raw ?? '';

  if (MATH_RENDER_DEBUG) {
    console.log('[MATH_RENDER] raw:', safeRaw.slice(0, 300));
  }

  // Run the full normalization + sanitization pipeline
  const sanitized = sanitizeAiMarkdown(safeRaw);

  if (MATH_RENDER_DEBUG) {
    console.log('[MATH_RENDER] sanitized:', sanitized.slice(0, 300));
  }

  const mdNode = (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[
        [rehypeKatex, {
          throwOnError: false,
          strict: false,
          // errorColor renders broken formulas in amber instead of harsh red
          errorColor: '#d97706',
          // trust: allow \href etc. that some AI outputs emit
          trust: false,
        }],
      ]}
      components={inline ? {
        // In inline mode replace block <p> with <span> so it doesn't break flex layout
        p: ({ children: c }) => <span>{c}</span>,
      } : {
        // Block mode: style code blocks as monospace math fallback boxes
        code({ className: cls, children: c, ...rest }) {
          // remark-math marks display math blocks with language-math
          const isMathBlock = cls === 'language-math' || cls === 'math';
          if (isMathBlock) {
            // This should not normally reach here (rehype-katex handles it),
            // but as an ultimate fallback render a clean monospace box
            return (
              <div className="my-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-x-auto">
                <code className="font-mono text-xs text-slate-600 dark:text-slate-300 whitespace-pre">{c}</code>
              </div>
            );
          }
          return <code className={cls} {...rest}>{c}</code>;
        },
      }}
    >
      {sanitized}
    </ReactMarkdown>
  );

  if (inline) {
    return (
      <MathErrorBoundary fallback={sanitized || safeRaw}>
        <span className={`katex-inline-host leading-relaxed ${className}`}>
          {mdNode}
        </span>
      </MathErrorBoundary>
    );
  }

  return (
    <MathErrorBoundary fallback={sanitized || safeRaw}>
      <div className={`markdown-content max-w-full ${className}`}>
        <div
          className={`
            prose ${proseSize} dark:prose-invert max-w-none
            prose-p:my-1 prose-p:leading-relaxed
            prose-headings:font-semibold
            ${codeColors}
            ${contentColors}
            prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
            prose-code:before:content-none prose-code:after:content-none
            prose-ul:my-1 prose-li:my-0.5
            ${className}
          `}
        >
          {mdNode}
        </div>
      </div>
    </MathErrorBoundary>
  );
}
