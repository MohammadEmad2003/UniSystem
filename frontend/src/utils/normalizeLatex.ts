/**
 * normalizeLatex
 *
 * Converts LaTeX equation environments and delimiter pairs that KaTeX / remark-math
 * cannot handle natively into plain $...$ / $$...$$ Markdown math that remark-math
 * does understand.
 *
 * Transformations applied (in order):
 *
 *  1. \begin{equation*} ... \end{equation*}  →  $$ ... $$
 *  2. \begin{equation}  ... \end{equation}   →  $$ ... $$
 *  3. \begin{align*}    ... \end{align*}     →  $$ ... $$
 *  4. \begin{align}     ... \end{align}      →  $$ ... $$
 *  5. \[ ... \]                              →  $$ ... $$
 *  6. \( ... \)                              →  $ ... $
 *
 * Examples:
 *   in:  \begin{equation*} g(t)=\sum D_k e^{jk\omega_0t} \end{equation*}
 *   out: $$ g(t)=\sum D_k e^{jk\omega_0t} $$
 *
 *   in:  \[ D_k = \frac{1}{T_0} \int g(t) e^{-jk\omega_0 t}\,dt \]
 *   out: $$ D_k = \frac{1}{T_0} \int g(t) e^{-jk\omega_0 t}\,dt $$
 *
 *   in:  The formula \( e^{j\pi}+1=0 \) is elegant.
 *   out: The formula $ e^{j\pi}+1=0 $ is elegant.
 */

// Named environments that should become display (block) math
const DISPLAY_ENVS = [
  'equation\\*?',
  'align\\*?',
  'gather\\*?',
  'multline\\*?',
  'eqnarray\\*?',
  'flalign\\*?',
  'alignat\\*?',
].join('|');

// \begin{env} ... \end{env}  →  $$ ... $$
const ENV_RE = new RegExp(
  `\\\\begin\\{(?:${DISPLAY_ENVS})\\}([\\s\\S]*?)\\\\end\\{(?:${DISPLAY_ENVS})\\}`,
  'g',
);

// \[ ... \]  →  $$ ... $$   (may span multiple lines)
const DISPLAY_BRACKET_RE = /\\\[([\s\S]*?)\\\]/g;

// \( ... \)  →  $ ... $     (single-line preferred but handles multiline too)
const INLINE_PAREN_RE = /\\\(([\s\S]*?)\\\)/g;

export function normalizeLatex(text: string): string {
  if (!text) return text;

  return text
    // 1–4. Named environments → $$...$$
    .replace(ENV_RE, (_match, inner: string) => {
      const trimmed = inner.trim();
      return `$$\n${trimmed}\n$$`;
    })
    // 5. \[ ... \] → $$...$$
    .replace(DISPLAY_BRACKET_RE, (_match, inner: string) => {
      const trimmed = inner.trim();
      return `$$\n${trimmed}\n$$`;
    })
    // 6. \( ... \) → $...$
    .replace(INLINE_PAREN_RE, (_match, inner: string) => {
      return `$${inner.trim()}$`;
    });
}
