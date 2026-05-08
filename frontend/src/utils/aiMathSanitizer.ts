/**
 * aiMathSanitizer.ts
 *
 * Full normalization + sanitization pipeline for AI/RAG math output.
 *
 * Exported functions (call order matters — both are called by MarkdownContent):
 *
 *   normalizeMathContent(text)   ← NEW, replaces the old wrapBareLaTeX heuristic
 *     Phase A  Double-backslash collapse  (\\frac → \frac outside existing delimiters)
 *     Phase B  Standard delimiter upgrades  \[…\] → $$  \(…\) → $  \begin{eq}…\end{eq} → $$
 *     Phase C  Line-level math detection  — classifies each line in plain-text
 *              regions as "display math", "inline math fragment", or "prose",
 *              wraps accordingly, never touches lines that already have delimiters.
 *     Phase D  Inline-fragment wrapping  — within lines that survived Phase C as
 *              prose, find tokens that are unambiguously math and wrap them $…$.
 *
 *   sanitizeAiMarkdown(text)
 *     Calls normalizeMathContent first, then:
 *     Phase 1  environment / delimiter normalisation  (belt-and-suspenders after Phase B)
 *     Phase 2  OCR-artifact fixes in plain-text regions
 *     Phase 3  Per-segment structural validation — unbalanced braces / empty \frac
 *              → downgrade to `backtick` span so student sees the expression
 *              instead of a red KaTeX error box.
 *
 * MarkdownContent runs sanitizeAiMarkdown automatically, so all Study-with-AI
 * surfaces (summaries, notes, flashcards, quiz, page summaries, RAG answers)
 * get the full pipeline with no extra wiring.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** LaTeX command names recognised as math triggers. */
const LATEX_CMD_NAMES = [
  // Greek lowercase
  'alpha','beta','gamma','delta','epsilon','varepsilon',
  'zeta','eta','theta','vartheta','iota','kappa','lambda',
  'mu','nu','xi','pi','varpi','rho','varrho','sigma','varsigma',
  'tau','upsilon','phi','varphi','chi','psi','omega',
  // Greek uppercase
  'Gamma','Delta','Theta','Lambda','Xi','Pi','Sigma','Upsilon','Phi','Psi','Omega',
  // Operators / structures
  'frac','dfrac','tfrac','cfrac',
  'sqrt','root',
  'sum','prod','coprod','int','oint','iint','iiint','partial','nabla',
  'left','right','bigl','bigr','Bigl','Bigr','biggl','biggr','Biggl','Biggr',
  'infty','pm','mp','times','div','cdot','cdots','ldots','vdots','ddots',
  'leq','geq','neq','approx','equiv','sim','propto','simeq','cong',
  'forall','exists','in','notin','subset','supset','subseteq','supseteq','cup','cap',
  'rightarrow','leftarrow','Rightarrow','Leftarrow','Leftrightarrow','leftrightarrow',
  'to','mapsto','gets',
  'lim','limsup','liminf','log','ln','exp','sin','cos','tan','sec','csc','cot',
  'sinh','cosh','tanh','arcsin','arccos','arctan',
  'vec','hat','bar','dot','ddot','tilde','overline','underline','widehat','widetilde',
  'mathbf','mathrm','mathcal','mathbb','mathit','mathsf','text',
  'begin','end',
  'pmatrix','bmatrix','vmatrix','Vmatrix','matrix','cases',
  'underbrace','overbrace',
  'over','atop',
  'operatorname',
  // Misc
  'hbar','ell','Re','Im','angle','perp','parallel','prime','dagger',
] as const;

const CMD_ALT = LATEX_CMD_NAMES.join('|');

// Matches a single \cmd (with or without * suffix)
const ANY_CMD_RE = new RegExp(`\\\\(?:${CMD_ALT})\\b\\*?`);

// Matches $…$ or $$…$$ (already delimited math — skip these in plain-text passes)
const MATH_SPLIT_RE = /(\$\$[\s\S]*?\$\$|\$[^$\n]*?\$)/g;

// Matches \[…\] display blocks
const DISPLAY_BRACKET_RE = /\\\[([\s\S]*?)\\\]/g;
// Matches \(…\) inline
const INLINE_PAREN_RE    = /\\\(([\s\S]*?)\\\)/g;
// Matches named display environments
const DISPLAY_ENV_NAMES = [
  'equation\\*?','align\\*?','gather\\*?','multline\\*?',
  'eqnarray\\*?','flalign\\*?','alignat\\*?',
].join('|');
const ENV_RE = new RegExp(
  `\\\\begin\\{(?:${DISPLAY_ENV_NAMES})\\}([\\s\\S]*?)\\\\end\\{(?:${DISPLAY_ENV_NAMES})\\}`,
  'g',
);

// ─────────────────────────────────────────────────────────────────────────────
// Phase A helpers — double-backslash collapse outside existing delimiters
// ─────────────────────────────────────────────────────────────────────────────

const DBL_BACKSLASH_RE = new RegExp(`\\\\\\\\(${CMD_ALT})\\b`, 'g');

function collapseDblBackslash(text: string): string {
  // Only act on plain-text segments (not already-delimited math)
  return text.split(MATH_SPLIT_RE).map((part, i) => {
    if (i % 2 !== 0) return part; // inside $…$ already
    return part.replace(DBL_BACKSLASH_RE, '\\$1');
  }).join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase C — line-level math classifier
// ─────────────────────────────────────────────────────────────────────────────
//
// A LINE is treated as display-math if ALL of the following hold:
//   1. It is non-empty after trimming.
//   2. It does not look like a prose sentence (no sentence-ending punctuation
//      after a word, no article/preposition at the start).
//   3. It contains at least one strong math signal.
//   4. It does not start with a markdown heading/list marker.
//   5. It does not already start with $, $$, \[, \(.
//
// Strong math signals (any one is enough):
//   • A \cmd from LATEX_CMD_NAMES
//   • Subscript/superscript with braces:  _{…}  ^{…}
//   • Fraction-like notation without \frac:  a/b inside an expression
//   • Identifier followed by = followed by math tokens
//   • e^ (Euler form)
//   • Matrix row separator  \\  inside braces

/** Returns true if the line already starts with a math delimiter. */
function alreadyDelimited(line: string): boolean {
  const t = line.trim();
  return t.startsWith('$$') || t.startsWith('$') ||
         t.startsWith('\\[') || t.startsWith('\\(') ||
         t.startsWith('\\begin{');
}

/** Returns true if the line looks like normal prose. */
function looksLikeProse(line: string): boolean {
  const t = line.trim();
  // Markdown structural markers
  if (/^#{1,6}\s/.test(t)) return true;  // heading
  if (/^[-*+]\s/.test(t))  return true;  // bullet
  if (/^\d+\.\s/.test(t))  return true;  // ordered list
  if (/^>\s/.test(t))       return true;  // blockquote
  if (/^```/.test(t))       return true;  // code fence
  if (/^\|/.test(t))        return true;  // table row

  // Prose heuristics — sentence-like structures
  // Starts with an article / preposition / common word
  if (/^(?:the|a|an|in|of|for|to|is|are|was|were|this|that|these|those|it|we|you|they|when|where|note|since|given|let|if|and|or|but|so|then|thus|hence|therefore|as|with|by|from|on|at|into|through|during|before|after|above|below)\b/i.test(t)) return true;

  // Ends like a sentence (word + period/comma/colon NOT followed by a number)
  if (/[a-zA-Z]{3,}[.,;:!?]$/.test(t)) return true;

  // Long line with mostly letters and spaces (>60 chars, >70% alpha+space)
  if (t.length > 60) {
    const alphaSpace = (t.match(/[a-zA-Z\s]/g) || []).length;
    if (alphaSpace / t.length > 0.7) return true;
  }

  return false;
}

/** Returns true if the line contains strong enough math signals to wrap. */
function hasMathSignals(line: string): boolean {
  const t = line.trim();

  // Any LaTeX command
  if (ANY_CMD_RE.test(t)) return true;

  // Subscript/superscript with braces
  if (/[_^]\{/.test(t)) return true;

  // Subscript/superscript with single char  x_0  x^2
  if (/[a-zA-Z0-9][_^][a-zA-Z0-9]/.test(t)) return true;

  // Identifier = expression containing /  (e.g. D_k = 1/T_0)
  if (/[a-zA-Z]\w*\s*=\s*[^=].*\//.test(t)) return true;

  // e^ pattern (Euler exponent)
  if (/\be\^/.test(t)) return true;

  // Explicit math equals with operators on both sides
  if (/[a-zA-Z0-9_{}]+\s*=\s*[a-zA-Z0-9_{}\\()\[\]+\-*/^]+\s*[+\-*/\\]/.test(t)) return true;

  return false;
}

/**
 * Classify one plain-text line and return it with proper delimiters.
 * Never touches lines that already have $, \[, or \begin.
 */
function classifyLine(line: string): string {
  if (!line.trim()) return line;
  if (alreadyDelimited(line)) return line;
  if (looksLikeProse(line)) return line;
  if (!hasMathSignals(line)) return line;
  // Wrap as display math
  const inner = line.trim();
  console.debug('[MATH_NORM] display-wrap:', inner.slice(0, 80));
  return `$$${inner}$$`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase D — inline fragment wrapping within a single prose line
// ─────────────────────────────────────────────────────────────────────────────
//
// Finds tokens inside a prose line that are clearly math and wraps them $…$.
// Only acts if the token:
//   - contains a LaTeX command, OR
//   - looks like  identifier_subscript  or  identifier^superscript  (no spaces)
//   - AND is surrounded by word boundaries / spaces (not inside a word)
// Never wraps things already inside $…$.

// Token patterns for inline wrapping (ordered by specificity)
const INLINE_MATH_TOKENS: RegExp[] = [
  // \cmd followed by subscript/superscript chain e.g.  \omega_0  \alpha_{ij}
  new RegExp(`\\\\(?:${CMD_ALT})\\b\\*?(?:[_^][{a-zA-Z0-9]+|\\{[^}]*\\})*`, 'g'),
  // identifier with sub/superscript no spaces: D_k  x^2  T_0  f_{n}
  /\b[a-zA-Z][a-zA-Z0-9]*(?:[_^]\{[^}]+\}|[_^][a-zA-Z0-9])+/g,
  // e^{…} or e^x Euler form
  /\be\^(?:\{[^}]+\}|[a-zA-Z0-9])/g,
];

function wrapInlineTokens(line: string): string {
  // Split on already-delimited segments
  const parts = line.split(MATH_SPLIT_RE);
  return parts.map((part, i) => {
    if (i % 2 !== 0) return part; // already $…$ — leave alone
    if (!hasMathSignals(part)) return part;

    let s = part;
    // Apply each token pattern
    for (const re of INLINE_MATH_TOKENS) {
      re.lastIndex = 0;
      s = s.replace(re, (match) => {
        // Skip if this match is already inside delimiters (double-safety)
        if (match.startsWith('$')) return match;
        console.debug('[MATH_NORM] inline-wrap:', match);
        return `$${match}$`;
      });
    }
    return s;
  }).join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// normalizeMathContent — the main exported normalizer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Preprocessing pass that turns raw LLM math output into properly-delimited
 * KaTeX-renderable Markdown. Call this BEFORE remark-math / rehype-katex.
 *
 * Handles:
 *   • \\cmd → \cmd  (double-backslash collapse, outside existing delimiters)
 *   • \[…\] → $$…$$   \(…\) → $…$   \begin{equation}…\end → $$…$$
 *   • Line-level detection: whole-line math expressions → $$…$$
 *   • Inline fragment detection: D_k, \omega_0, e^{j\pi} → $…$
 *   • JSON-escaped newlines, surrounding code fences, JSON string quoting
 *   • "Key Term:" label prefixes
 *
 * Debug logs are emitted at console.debug level; in production builds these
 * are typically no-ops. Enable with `localStorage.debug = '*'` or check the
 * browser console (verbose level).
 */
export function normalizeMathContent(input: string): string {
  if (!input || typeof input !== 'string') return input ?? '';

  let text = input;
  let wrappedCount = 0;

  // ── Structural cleanup ──────────────────────────────────────────────────

  // Strip accidental JSON string quoting (entire response in "…")
  if (text.startsWith('"') && text.endsWith('"')) {
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === 'string') text = parsed;
    } catch { /* not valid JSON */ }
  }

  // Unescape JSON-encoded newlines / tabs
  text = text.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '');

  // Strip wrapping code fences
  text = text
    .replace(/^```(?:json|markdown|text|latex|md)?\s*\n/i, '')
    .replace(/\n```\s*$/i, '')
    .trim();

  // Strip "Key Term: " / "Term: " / "Definition: " label prefixes
  text = text.replace(/^(?:Key\s+Term|Term|Definition|Formula):\s*/im, '');

  // ── Phase A: double-backslash collapse ──────────────────────────────────
  text = collapseDblBackslash(text);

  // ── Phase B: standard delimiter upgrades ───────────────────────────────
  text = text
    .replace(ENV_RE,             (_m, inner: string) => `$$\n${inner.trim()}\n$$`)
    .replace(DISPLAY_BRACKET_RE, (_m, inner: string) => `$$\n${inner.trim()}\n$$`)
    .replace(INLINE_PAREN_RE,    (_m, inner: string) => `$${inner.trim()}$`);

  // ── Phase C + D: line-by-line processing in plain-text regions ─────────
  //
  // Split the text on already-delimited math so we never touch $…$ regions.
  // Each even index is plain text; odd index is a math token.

  const segments = text.split(MATH_SPLIT_RE);
  const processed = segments.map((seg, idx) => {
    if (idx % 2 !== 0) return seg; // already delimited — pass through

    // Process plain-text segment line by line
    const lines = seg.split('\n');
    const outLines = lines.map(line => {
      const before = line;

      // Phase C: try display-wrap the whole line
      const classified = classifyLine(line);
      if (classified !== before) {
        wrappedCount++;
        return classified;
      }

      // Phase D: inline-wrap individual tokens in prose lines
      const inlined = wrapInlineTokens(line);
      if (inlined !== before) wrappedCount++;
      return inlined;
    });

    return outLines.join('\n');
  });

  const result = processed.join('');

  if (wrappedCount > 0) {
    console.debug(`[MATH_NORM] wrapped ${wrappedCount} expression(s)`);
  }

  return result;
}

// Keep the old name as an alias so existing callers don't break.
export const normalizeAIOutput = normalizeMathContent;

// ─────────────────────────────────────────────────────────────────────────────
// Part 3 — Flashcard text normalizer
// ─────────────────────────────────────────────────────────────────────────────
//
// For flashcard front/back text: prefer readable Unicode + plain English over
// raw LaTeX. Falls back to "See the notes section…" if the formula is too
// complex to clean up safely.

// Patterns that should never appear in rendered flashcard text (also used by Part 6)
const BROKEN_LATEX_RE = /(?:^|[^$])\\(?:frac|sum|omega|int|left|right|begin|sqrt)\b/;

// Symbols that can be unicode-replaced rather than rendered as KaTeX
const UNICODE_SUBS: Array<[RegExp, string]> = [
  // Greek letters — LaTeX command → Unicode
  [/\$?\\omega_?\{?0\}?\$?/g,          'ω₀'],
  [/\$?\\omega_?\{?k\}?\$?/g,          'ωₖ'],
  [/\$?\\omega\b\$?/g,                  'ω'],
  [/\$?\\Omega\b\$?/g,                  'Ω'],
  [/\$?\\pi\b\$?/g,                     'π'],
  [/\$?\\theta\b\$?/g,                  'θ'],
  [/\$?\\alpha\b\$?/g,                  'α'],
  [/\$?\\beta\b\$?/g,                   'β'],
  [/\$?\\gamma\b\$?/g,                  'γ'],
  [/\$?\\delta\b\$?/g,                  'δ'],
  [/\$?\\Delta\b\$?/g,                  'Δ'],
  [/\$?\\mu\b\$?/g,                     'μ'],
  [/\$?\\sigma\b\$?/g,                  'σ'],
  [/\$?\\tau\b\$?/g,                    'τ'],
  [/\$?\\lambda\b\$?/g,                 'λ'],
  [/\$?\\phi\b\$?/g,                    'φ'],
  [/\$?\\infty\b\$?/g,                  '∞'],
  [/\$?\\sum\b\$?/g,                    'Σ'],
  [/\$?\\int\b\$?/g,                    '∫'],
  [/\$?\\pm\b\$?/g,                     '±'],
  [/\$?\\times\b\$?/g,                  '×'],
  [/\$?\\cdot\b\$?/g,                   '·'],
  [/\$?\\leq\b\$?/g,                    '≤'],
  [/\$?\\geq\b\$?/g,                    '≥'],
  [/\$?\\neq\b\$?/g,                    '≠'],
  [/\$?\\approx\b\$?/g,                 '≈'],
  [/\$?\\rightarrow\b\$?/g,             '→'],
  [/\$?\\leftarrow\b\$?/g,              '←'],
  // Common subscript identifiers → Unicode subscript
  [/\$?D_\{?k\}?\$?/g,                 'Dₖ'],
  [/\$?T_\{?0\}?\$?/g,                 'T₀'],
  [/\$?f_\{?0\}?\$?/g,                 'f₀'],
  [/\$?x_\{?0\}?\$?/g,                 'x₀'],
  [/\$?x_\{?n\}?\$?/g,                 'xₙ'],
  [/\$?x_\{?k\}?\$?/g,                 'xₖ'],
  [/\$?a_\{?n\}?\$?/g,                 'aₙ'],
  [/\$?b_\{?n\}?\$?/g,                 'bₙ'],
  [/\$?c_\{?n\}?\$?/g,                 'cₙ'],
  // Simple superscripts
  [/\$?x\^\{?2\}?\$?/g,                'x²'],
  [/\$?x\^\{?3\}?\$?/g,                'x³'],
  [/\$?n\^\{?2\}?\$?/g,                'n²'],
];

// Detect formulas too complex to unicode-replace (still contain LaTeX after unicode pass)
const COMPLEX_LATEX_RE = /\\(?:frac|sum|int|prod|lim|begin|left|right|sqrt|over|binom)\b/;

// Detect unmatched/broken lone dollar signs (single $ not followed by content + $)
const LONE_DOLLAR_RE = /(?<!\$)\$(?!\$)(?:[^$\n]{0,80}(?:\n[^$\n]{0,80}){0,3}(?!\$)|(?=\s)|$)/;

/**
 * Normalize text for display in flashcard front/back/example fields.
 *
 * Strategy (in order):
 *   1. Run the standard normalizeMathContent pass (handles \\cmd, \[…\] etc.)
 *   2. Replace common math symbols with Unicode equivalents (no KaTeX needed)
 *   3. If a $…$ block still contains complex LaTeX (frac, sum, int…) AND the
 *      surrounding text is a flashcard (short, single concept), replace with
 *      "See the notes section for the full formula."
 *   4. Strip any remaining lone unmatched $ signs.
 */
export function normalizeFlashcardText(input: string): string {
  if (!input || typeof input !== 'string') return input ?? '';

  // Step 1 — standard normalization
  let text = normalizeMathContent(input);

  // Step 2 — Unicode substitution (applied to entire string including $ segments)
  for (const [re, unicode] of UNICODE_SUBS) {
    text = text.replace(re, unicode);
  }

  // Step 3 — Replace remaining $…$ segments that still contain complex LaTeX
  text = text.replace(/\$\$[\s\S]*?\$\$|\$[^$\n]*?\$/g, (match) => {
    const inner = match.startsWith('$$') ? match.slice(2, -2) : match.slice(1, -1);
    if (COMPLEX_LATEX_RE.test(inner)) {
      // Too complex — replace with a readable fallback
      console.debug('[FLASH_NORM] complex formula replaced:', inner.slice(0, 60));
      return '*(see notes for formula)*';
    }
    // Simple enough — keep the $…$ for KaTeX (e.g. $f = 1/T$)
    return match;
  });

  // Step 4 — Strip lone unmatched $ that can't render
  const dollarCount = (text.match(/(?<!\$)\$(?!\$)/g) || []).length;
  if (dollarCount % 2 !== 0) {
    // Remove the last unmatched lone $ (scan from end)
    text = text.replace(/\$(?=[^$]*$)/, '');
  }

  // Step 5 — Final guard: if bare \cmd still visible outside delimiters, replace entire remaining $ blocks
  if (BROKEN_LATEX_RE.test(text)) {
    // Strip any remaining $…$ that contain complex LaTeX (missed by step 3)
    text = text.replace(/\$\$[\s\S]*?\$\$|\$[^$\n]*?\$/g, (match) => {
      const inner = match.startsWith('$$') ? match.slice(2, -2) : match.slice(1, -1);
      if (BROKEN_LATEX_RE.test(inner) || COMPLEX_LATEX_RE.test(inner)) {
        return '*(see notes for formula)*';
      }
      return match;
    });
    // Strip remaining bare \cmd outside $ (e.g. \omega_0 not wrapped)
    text = text.replace(/\\(?:frac|sum|omega|int|left|right|begin|sqrt|theta|pi|alpha|beta|gamma|delta|mu|sigma|lambda|phi|infty|prod|lim)\b[^$\n]*/g, '*(formula)*');
  }

  return text.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// OCR / artifact patterns
// ─────────────────────────────────────────────────────────────────────────────

interface OcrFix { re: RegExp; rep: string }

const PLAIN_OCR_FIXES: OcrFix[] = [
  // bare "heta" not preceded by backslash → \theta
  { re: /(?<!\\)\bheta\b/g,           rep: '\\theta' },
  // "To" used as T_0 before = or (
  { re: /\bTo\b(?=\s*[=(])/g,        rep: 'T_0'     },
  // T_o → T_0
  { re: /\bT_o\b/g,                   rep: 'T_0'     },
];

const MATH_OCR_FIXES: OcrFix[] = [
  // bare Dk / D k → D_k
  { re: /\bD\s+k\b/g,                 rep: 'D_k'        },
  // omega_o → \omega_0
  { re: /\\?omega_o\b/g,              rep: '\\omega_0'  },
  // w_0 / w0 → \omega_0
  { re: /\bw_?0\b/g,                  rep: '\\omega_0'  },
  // w_k / wk → \omega_k
  { re: /\bw_?k\b/g,                  rep: '\\omega_k'  },
  // double backslash before common commands inside math
  { re: /\\\\(theta|omega|pi|sum|int|frac|infty|cos|sin|delta)\b/g, rep: '\\$1' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Structural validators
// ─────────────────────────────────────────────────────────────────────────────

function braceBalance(formula: string): number {
  let depth = 0;
  for (let i = 0; i < formula.length; i++) {
    if (formula[i] === '\\') { i++; continue; }
    if (formula[i] === '{') depth++;
    else if (formula[i] === '}') depth--;
  }
  return depth;
}

function hasEmptyFrac(formula: string): boolean {
  return /\\frac\s*\{\s*\}\s*\{/.test(formula) ||
         /\\frac\s*\{[^}]*\}\s*\{\s*\}/.test(formula) ||
         /\\frac\s*\{\s*\}/.test(formula);
}

/**
 * Decide how to emit a math segment.
 * Returns { ok: true } for valid math, { ok: false, text } to downgrade to `code`.
 */
function validateMathSegment(
  raw: string,
  isDisplay: boolean,
): { ok: boolean; text: string } {
  const inner = (isDisplay ? raw.slice(2, -2) : raw.slice(1, -1)).trim();

  if (!inner) return { ok: false, text: '' };

  const balance = braceBalance(inner);
  if (balance !== 0) {
    console.debug('[MATH_NORM] downgrade (unbalanced braces):', inner.slice(0, 60));
    return { ok: false, text: `\`${inner}\`` };
  }
  if (hasEmptyFrac(inner)) {
    console.debug('[MATH_NORM] downgrade (empty \\frac):', inner.slice(0, 60));
    return { ok: false, text: `\`${inner}\`` };
  }

  return { ok: true, text: raw };
}

function fixMathOcr(inner: string): string {
  let s = inner;
  for (const { re, rep } of MATH_OCR_FIXES) s = s.replace(re, rep);
  return s;
}

// ─────────────────────────────────────────────────────────────────────────────
// Part 6 — Flashcard output validation
// ─────────────────────────────────────────────────────────────────────────────

// (BROKEN_LATEX_RE declared above in Part 3)
const UNMATCHED_DOLLAR_RE = /(?<!\$)\$(?!\$)(?:[^$]{0,120})?(?:\n|$)(?![^$]*\$)/m;

/**
 * Returns true if the text contains raw unrendered LaTeX that will look broken.
 * Use this as a guard to trigger normalizeFlashcardText fallback.
 */
export function hasRawLatex(text: string): boolean {
  if (BROKEN_LATEX_RE.test(text)) return true;
  // Count $ signs — odd number means unmatched
  const dollars = (text.match(/(?<!\$)\$(?!\$)/g) || []).length;
  if (dollars % 2 !== 0) return true;
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// sanitizeAiMarkdown — full pipeline entry point used by MarkdownContent
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full normalization + sanitization pipeline.
 * Called automatically by MarkdownContent — no manual wiring needed.
 */
export function sanitizeAiMarkdown(input: string): string {
  if (!input) return input;

  // Phase 0 — structural normalization + math detection/wrapping
  let text = normalizeMathContent(input);

  // Phase 1 — belt-and-suspenders: any \[…\] / \(…\) / \begin{} still left
  text = text
    .replace(ENV_RE,             (_m, inner: string) => `$$\n${inner.trim()}\n$$`)
    .replace(DISPLAY_BRACKET_RE, (_m, inner: string) => `$$\n${inner.trim()}\n$$`)
    .replace(INLINE_PAREN_RE,    (_m, inner: string) => `$${inner.trim()}$`);

  // Phase 2 — OCR artifact fixes in plain-text regions
  const parts = text.split(MATH_SPLIT_RE);
  const processed = parts.map((part, i) => {
    if (i % 2 === 0) {
      // plain text
      let s = part;
      for (const { re, rep } of PLAIN_OCR_FIXES) s = s.replace(re, rep);
      return s;
    }
    // math token — OCR fix then validate
    const isDisplay = part.startsWith('$$');
    const inner     = isDisplay ? part.slice(2, -2) : part.slice(1, -1);
    const fixed     = fixMathOcr(inner);
    const rebuilt   = isDisplay ? `$$${fixed}$$` : `$${fixed}$`;
    const result    = validateMathSegment(rebuilt, isDisplay);
    return result.text;
  });

  return processed.join('');
}
