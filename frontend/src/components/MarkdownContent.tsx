import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { sanitizeAiMarkdown } from '../utils/aiMathSanitizer';

interface Props {
  children: string;
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

  // Run the full normalization + sanitization pipeline
  const sanitized = sanitizeAiMarkdown(children ?? '');

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
      <span className={`katex-inline-host leading-snug ${className}`}>
        {mdNode}
      </span>
    );
  }

  return (
    <div className={`overflow-x-auto max-w-full ${className}`}>
      <div
        className={`
          prose ${proseSize} dark:prose-invert max-w-none
          prose-p:my-1 prose-p:leading-relaxed
          prose-headings:font-semibold
          prose-headings:text-slate-800 dark:prose-headings:text-slate-200
          prose-strong:text-slate-800 dark:prose-strong:text-slate-200
          ${codeColors}
          prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
          prose-code:before:content-none prose-code:after:content-none
          prose-ul:my-1 prose-li:my-0.5
          prose-blockquote:border-slate-300 dark:prose-blockquote:border-slate-600
          text-slate-700 dark:text-slate-300
        `}
      >
        {mdNode}
      </div>
    </div>
  );
}
