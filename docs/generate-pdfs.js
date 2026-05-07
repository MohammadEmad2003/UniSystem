/**
 * generate-pdfs.js
 *
 * Converts RAG documentation Markdown files into professional PDFs.
 * Strategy:
 *   1. Parse Markdown with `marked`.
 *   2. Detect ```mermaid``` fences, render each diagram to SVG via a
 *      headless Chromium page (Puppeteer + Mermaid.js CDN).
 *   3. Substitute rendered SVGs back into the HTML.
 *   4. Wrap in a full-featured HTML shell with cover page, TOC, and
 *      professional CSS.
 *   5. Export to PDF via Puppeteer's `page.pdf()`.
 *
 * Usage:  node generate-pdfs.js
 * Output: rag/architecture.pdf, rag/end-to-end-flow.pdf,
 *         rag/database-and-vector-schema.pdf
 */

const puppeteer = require('puppeteer');
const { marked }  = require('marked');
const fs   = require('fs');
const path = require('path');

// ── Documents to process ─────────────────────────────────────────────────────

const DOCS = [
  {
    src:   'rag/architecture.md',
    out:   'rag/architecture.pdf',
    title: 'System Architecture',
    subtitle: 'Component overview, layers, design decisions, and deployment topology',
  },
  {
    src:   'rag/end-to-end-flow.md',
    out:   'rag/end-to-end-flow.pdf',
    title: 'End-to-End Request Flow',
    subtitle: 'Ask flow, indexing pipeline, retrieval logic, and Study-with-AI tools',
  },
  {
    src:   'rag/database-and-vector-schema.md',
    out:   'rag/database-and-vector-schema.pdf',
    title: 'Database & Vector Schema',
    subtitle: 'SQLite tables, Qdrant collections, payloads, and index lifecycle',
  },
];

// ── Mermaid diagram renderer ──────────────────────────────────────────────────

/**
 * Renders a Mermaid diagram string to an SVG string using a headless browser.
 * We spin up one browser, reuse it for all diagrams, then close at the end.
 */
async function renderMermaidToSvg(browser, diagram) {
  const page = await browser.newPage();
  try {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    body { margin: 0; background: transparent; }
    #container { display: inline-block; padding: 8px; }
    svg { max-width: 100%; }
  </style>
</head>
<body>
  <div id="container">
    <div class="mermaid">${diagram.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
  </div>
  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: 'base',
      themeVariables: {
        primaryColor: '#dbeafe',
        primaryTextColor: '#1e3a5f',
        primaryBorderColor: '#3b82f6',
        lineColor: '#64748b',
        secondaryColor: '#f0fdf4',
        tertiaryColor: '#fefce8',
        background: '#ffffff',
        mainBkg: '#dbeafe',
        nodeBorder: '#3b82f6',
        clusterBkg: '#f8fafc',
        titleColor: '#0f172a',
        edgeLabelBackground: '#f1f5f9',
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '13px',
      },
      flowchart: { curve: 'basis', useMaxWidth: true },
      sequence: { useMaxWidth: true, boxMargin: 10 },
    });
  </script>
</body>
</html>`;

    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    // Wait for Mermaid to finish rendering
    await page.waitForSelector('svg', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 800));

    const svg = await page.evaluate(() => {
      const el = document.querySelector('svg');
      if (!el) return null;
      // Remove size constraints so it scales freely in the PDF
      el.removeAttribute('width');
      el.removeAttribute('height');
      el.setAttribute('style', 'max-width:100%; height:auto;');
      return el.outerHTML;
    });

    return svg;
  } catch (err) {
    console.warn(`  ⚠  Mermaid render failed: ${err.message.slice(0, 120)}`);
    return null;
  } finally {
    await page.close();
  }
}

// ── Markdown → HTML pipeline ──────────────────────────────────────────────────

/**
 * Configures `marked` with GFM, tables, and a custom renderer.
 * We do NOT handle ```mermaid``` fences here — they are extracted first,
 * replaced with placeholders, then re-injected as rendered SVG after parsing.
 */
function buildMarkedRenderer() {
  const renderer = new marked.Renderer();

  // Code blocks — dark theme
  renderer.code = (code, lang) => {
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    const langClass = lang ? ` language-${lang}` : '';
    const langLabel = lang ? `<span class="code-lang">${lang}</span>` : '';
    return `<div class="code-block">${langLabel}<pre><code class="${langClass}">${escaped}</code></pre></div>`;
  };

  // Blockquotes — styled callout
  renderer.blockquote = (quote) =>
    `<blockquote class="callout">${quote}</blockquote>`;

  // Tables — professional styling
  renderer.table = (header, body) =>
    `<div class="table-wrap"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>`;

  renderer.tablerow = (content) => `<tr>${content}</tr>`;
  renderer.tablecell = (content, flags) => {
    const tag = flags.header ? 'th' : 'td';
    return `<${tag}>${content}</${tag}>`;
  };

  // Headings — add anchor IDs for TOC
  renderer.heading = (text, level) => {
    const id = text
      .toLowerCase()
      .replace(/<[^>]+>/g, '')    // strip any inline HTML
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `<h${level} id="${id}">${text}</h${level}>`;
  };

  return renderer;
}

/**
 * Extract all ```mermaid``` fences from raw Markdown, replace with unique
 * placeholders, and return the cleaned text + the diagram array.
 */
function extractMermaidFences(md) {
  const diagrams = [];
  const cleaned  = md.replace(/```mermaid\n([\s\S]*?)```/g, (_, body) => {
    const idx = diagrams.length;
    diagrams.push(body.trim());
    return `<!--MERMAID_PLACEHOLDER_${idx}-->`;
  });
  return { cleaned, diagrams };
}

/**
 * Substitute rendered SVGs (or fallback code blocks) back into the HTML.
 */
function injectMermaidSvgs(html, svgs, rawDiagrams) {
  return html.replace(/<!--MERMAID_PLACEHOLDER_(\d+)-->/g, (_, i) => {
    const svg = svgs[parseInt(i)];
    if (svg) {
      return `<div class="mermaid-wrap">${svg}</div>`;
    }
    // Fallback — show code if render failed
    const escaped = rawDiagrams[parseInt(i)]
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<div class="code-block mermaid-fallback"><pre><code>${escaped}</code></pre></div>`;
  });
}

// ── TOC builder ───────────────────────────────────────────────────────────────

function buildToc(html) {
  const entries = [];
  const headingRe = /<h([2-3]) id="([^"]+)">([^<]+(?:<[^>]+>[^<]*<\/[^>]+>)?[^<]*)<\/h[2-3]>/g;
  let m;
  while ((m = headingRe.exec(html)) !== null) {
    entries.push({ level: parseInt(m[1]), id: m[2], text: m[3].replace(/<[^>]+>/g, '') });
  }
  if (!entries.length) return '';

  const items = entries.map(e => {
    const indent = e.level === 3 ? ' style="padding-left:1.5rem"' : '';
    return `<li${indent}><a href="#${e.id}">${e.text}</a></li>`;
  }).join('\n');

  return `
<nav class="toc-section">
  <div class="toc-header">Table of Contents</div>
  <ul class="toc-list">${items}</ul>
</nav>`;
}

// ── HTML shell ────────────────────────────────────────────────────────────────

function buildHtmlShell(bodyHtml, doc) {
  const now     = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  const toc     = buildToc(bodyHtml);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${doc.title} — RAG System Documentation</title>
  <style>
    /* ── Reset & base ───────────────────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    @page {
      size: A4;
      margin: 18mm 18mm 22mm 18mm;
      @bottom-center {
        content: counter(page) " / " counter(pages);
        font-family: "Segoe UI", system-ui, sans-serif;
        font-size: 8pt;
        color: #94a3b8;
      }
    }

    html {
      font-family: "Segoe UI", "Helvetica Neue", system-ui, sans-serif;
      font-size: 10.5pt;
      line-height: 1.75;
      color: #1e293b;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      max-width: 100%;
    }

    /* ── Cover page ─────────────────────────────────────────── */
    .cover {
      page-break-after: always;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 60px 64px;
      background: linear-gradient(160deg, #0f172a 0%, #1e3a5f 40%, #0c4a6e 100%);
      color: #ffffff;
      position: relative;
      overflow: hidden;
    }
    .cover::before {
      content: "";
      position: absolute;
      top: -120px; right: -120px;
      width: 500px; height: 500px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(56,189,248,0.18) 0%, transparent 70%);
    }
    .cover::after {
      content: "";
      position: absolute;
      bottom: -80px; left: -80px;
      width: 350px; height: 350px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%);
    }
    .cover-top {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 80px;
    }
    .cover-logo {
      width: 42px; height: 42px;
      background: linear-gradient(135deg, #38bdf8, #6366f1);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; font-weight: 900; color: #fff;
      flex-shrink: 0;
      letter-spacing: -1px;
    }
    .cover-brand {
      font-size: 10pt;
      font-weight: 700;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #94a3b8;
    }
    .cover-section-label {
      display: inline-block;
      background: rgba(56,189,248,0.15);
      border: 1px solid rgba(56,189,248,0.35);
      color: #38bdf8;
      font-size: 8pt;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      padding: 4px 14px;
      border-radius: 99px;
      margin-bottom: 20px;
    }
    .cover-title {
      font-size: 34pt;
      font-weight: 900;
      line-height: 1.1;
      color: #f1f5f9;
      margin-bottom: 16px;
      letter-spacing: -0.5px;
    }
    .cover-subtitle {
      font-size: 12pt;
      color: #94a3b8;
      line-height: 1.5;
      max-width: 520px;
      margin-bottom: 56px;
    }
    .cover-divider {
      width: 56px; height: 3px;
      background: linear-gradient(90deg, #38bdf8, #6366f1);
      border-radius: 99px;
      margin-bottom: 36px;
    }
    .cover-meta {
      display: flex;
      gap: 36px;
      flex-wrap: wrap;
    }
    .cover-meta-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .cover-meta-label {
      font-size: 7.5pt;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #64748b;
    }
    .cover-meta-value {
      font-size: 9.5pt;
      color: #cbd5e1;
      font-weight: 500;
    }
    .cover-footer {
      position: absolute;
      bottom: 40px;
      left: 64px;
      right: 64px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(255,255,255,0.08);
      padding-top: 16px;
      font-size: 8pt;
      color: #475569;
    }

    /* ── TOC ────────────────────────────────────────────────── */
    .toc-section {
      page-break-after: always;
      padding: 48px 0;
    }
    .toc-header {
      font-size: 22pt;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 28px;
      padding-bottom: 14px;
      border-bottom: 3px solid #e2e8f0;
    }
    .toc-list {
      list-style: none;
      padding: 0;
    }
    .toc-list li {
      border-bottom: 1px solid #f1f5f9;
    }
    .toc-list li a {
      display: block;
      padding: 9px 4px;
      color: #334155;
      text-decoration: none;
      font-size: 10pt;
      font-weight: 500;
      transition: color 0.15s;
    }
    .toc-list li a:hover { color: #0891b2; }
    .toc-list li[style*="padding-left"] a {
      font-size: 9.5pt;
      font-weight: 400;
      color: #64748b;
      padding-left: 0;
    }

    /* ── Body content ───────────────────────────────────────── */
    .doc-body {
      padding: 0;
    }

    /* ── Headings ───────────────────────────────────────────── */
    h1 {
      font-size: 22pt;
      font-weight: 900;
      color: #0f172a;
      margin: 48px 0 20px;
      padding-bottom: 12px;
      border-bottom: 3px solid #0891b2;
      line-height: 1.2;
      page-break-after: avoid;
    }
    h1:first-child { margin-top: 0; }

    h2 {
      font-size: 15pt;
      font-weight: 800;
      color: #0f172a;
      margin: 36px 0 14px;
      padding: 10px 0 10px 16px;
      border-left: 4px solid #0891b2;
      background: linear-gradient(90deg, #f0f9ff 0%, transparent 100%);
      border-radius: 0 6px 6px 0;
      page-break-after: avoid;
    }

    h3 {
      font-size: 12pt;
      font-weight: 700;
      color: #1e293b;
      margin: 28px 0 10px;
      padding-left: 12px;
      border-left: 3px solid #38bdf8;
      page-break-after: avoid;
    }

    h4 {
      font-size: 10.5pt;
      font-weight: 700;
      color: #334155;
      margin: 20px 0 8px;
    }

    /* ── Paragraphs & inline ────────────────────────────────── */
    p {
      margin: 10px 0;
      line-height: 1.78;
      color: #334155;
    }

    a { color: #0891b2; text-decoration: none; }
    a:hover { text-decoration: underline; }

    strong { color: #0f172a; font-weight: 700; }
    em     { color: #475569; }

    code {
      background: #f1f5f9;
      color: #be185d;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9pt;
      font-family: "Cascadia Code", "Fira Code", "Consolas", monospace;
      border: 1px solid #e2e8f0;
    }

    hr {
      border: none;
      border-top: 2px solid #e2e8f0;
      margin: 32px 0;
    }

    /* ── Lists ──────────────────────────────────────────────── */
    ul, ol {
      padding-left: 28px;
      margin: 10px 0;
    }
    li {
      margin: 5px 0;
      color: #334155;
      line-height: 1.7;
    }
    li > ul, li > ol { margin: 4px 0; }

    ul li::marker { color: #0891b2; }
    ol li::marker { color: #0891b2; font-weight: 700; }

    /* ── Code blocks ────────────────────────────────────────── */
    .code-block {
      background: #0f172a;
      border-radius: 10px;
      margin: 18px 0;
      overflow: hidden;
      page-break-inside: avoid;
      border: 1px solid #1e293b;
      box-shadow: 0 2px 8px rgba(0,0,0,0.18);
    }
    .code-lang {
      display: block;
      background: #1e293b;
      color: #64748b;
      font-size: 7.5pt;
      font-family: "Cascadia Code", "Fira Code", "Consolas", monospace;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 6px 16px;
      border-bottom: 1px solid #334155;
    }
    .code-block pre {
      margin: 0;
      padding: 18px 20px;
      overflow-x: auto;
    }
    .code-block code {
      background: transparent;
      color: #e2e8f0;
      padding: 0;
      border: none;
      font-size: 8.5pt;
      line-height: 1.65;
      font-family: "Cascadia Code", "Fira Code", "Consolas", monospace;
      white-space: pre;
    }

    /* SQL keyword colouring (approximate, no runtime highlighter needed) */
    .language-sql { color: #e2e8f0; }
    .language-js  { color: #e2e8f0; }

    /* ── Blockquotes / callouts ─────────────────────────────── */
    .callout {
      background: #fffbeb;
      border-left: 4px solid #f59e0b;
      border-radius: 0 8px 8px 0;
      padding: 14px 18px;
      margin: 18px 0;
      page-break-inside: avoid;
    }
    .callout p {
      margin: 6px 0;
      color: #78350f;
      font-size: 9.5pt;
    }
    .callout code {
      background: rgba(245,158,11,0.12);
      color: #92400e;
      border-color: rgba(245,158,11,0.3);
    }
    .callout strong { color: #92400e; }

    /* ── Tables ─────────────────────────────────────────────── */
    .table-wrap {
      overflow-x: auto;
      margin: 20px 0;
      border-radius: 10px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      page-break-inside: avoid;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
    }
    thead { background: #0f172a; }
    th {
      text-align: left;
      padding: 10px 14px;
      color: #f1f5f9;
      font-weight: 700;
      font-size: 8.5pt;
      letter-spacing: 0.05em;
      border-bottom: 2px solid #0891b2;
    }
    td {
      padding: 9px 14px;
      color: #334155;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: top;
      line-height: 1.5;
    }
    tr:nth-child(even) td { background: #f8fafc; }
    tr:last-child td { border-bottom: none; }
    td code {
      font-size: 8pt;
      white-space: nowrap;
    }

    /* ── Mermaid diagrams ───────────────────────────────────── */
    .mermaid-wrap {
      margin: 24px 0;
      padding: 24px;
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      text-align: center;
      page-break-inside: avoid;
      overflow: hidden;
    }
    .mermaid-wrap svg {
      max-width: 100%;
      height: auto;
    }
    .mermaid-fallback {
      background: #1e293b !important;
    }

    /* ── Page break helpers ─────────────────────────────────── */
    h1, h2 { page-break-before: auto; }
    .page-break { page-break-before: always; }

    /* ── Print footer ───────────────────────────────────────── */
    @media print {
      .cover { min-height: 100vh; }
    }
  </style>
</head>
<body>

<!-- ═══════════════════ COVER PAGE ═══════════════════ -->
<div class="cover">
  <div class="cover-top">
    <div class="cover-logo">U</div>
    <div class="cover-brand">UniSystem · Graduation Project</div>
  </div>

  <div class="cover-section-label">RAG System Documentation</div>
  <div class="cover-title">${doc.title}</div>
  <div class="cover-subtitle">${doc.subtitle}</div>
  <div class="cover-divider"></div>

  <div class="cover-meta">
    <div class="cover-meta-item">
      <span class="cover-meta-label">Project</span>
      <span class="cover-meta-value">UniSystem LMS</span>
    </div>
    <div class="cover-meta-item">
      <span class="cover-meta-label">Component</span>
      <span class="cover-meta-value">Retrieval-Augmented Generation</span>
    </div>
    <div class="cover-meta-item">
      <span class="cover-meta-label">Generated</span>
      <span class="cover-meta-value">${now}</span>
    </div>
    <div class="cover-meta-item">
      <span class="cover-meta-label">Stack</span>
      <span class="cover-meta-value">Qwen2.5 · Qdrant · FastAPI · Node.js</span>
    </div>
  </div>

  <div class="cover-footer">
    <span>UniSystem — AI-Enhanced Learning Management System</span>
    <span>Confidential — Graduation Project</span>
  </div>
</div>

<!-- ═══════════════════ TABLE OF CONTENTS ═══════════════════ -->
${toc}

<!-- ═══════════════════ DOCUMENT BODY ═══════════════════ -->
<div class="doc-body">
${bodyHtml}
</div>

</body>
</html>`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const docsDir = __dirname;

  console.log('\n📄  RAG Documentation PDF Generator\n' + '─'.repeat(48));

  console.log('🚀  Launching browser…');
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  // Configure marked
  marked.setOptions({
    gfm:    true,
    breaks: false,
    renderer: buildMarkedRenderer(),
  });

  try {
    for (const doc of DOCS) {
      const srcPath = path.join(docsDir, doc.src);
      const outPath = path.join(docsDir, doc.out);

      console.log(`\n📋  Processing: ${doc.src}`);

      // 1. Read source
      const md = fs.readFileSync(srcPath, 'utf8');

      // 2. Extract Mermaid fences
      const { cleaned, diagrams } = extractMermaidFences(md);
      console.log(`    ↳ Found ${diagrams.length} Mermaid diagram(s)`);

      // 3. Render each Mermaid diagram to SVG
      const svgs = [];
      for (let i = 0; i < diagrams.length; i++) {
        process.stdout.write(`    ↳ Rendering diagram ${i + 1}/${diagrams.length}…`);
        const svg = await renderMermaidToSvg(browser, diagrams[i]);
        svgs.push(svg);
        console.log(svg ? ' ✓' : ' ✗ (fallback)');
      }

      // 4. Convert cleaned Markdown → HTML
      const rawHtml = marked.parse(cleaned);

      // 5. Inject SVGs back
      const bodyHtml = injectMermaidSvgs(rawHtml, svgs, diagrams);

      // 6. Build full HTML shell
      const fullHtml = buildHtmlShell(bodyHtml, doc);

      // 7. Render to PDF
      console.log(`    ↳ Rendering PDF…`);
      const page = await browser.newPage();
      await page.setContent(fullHtml, { waitUntil: 'networkidle0', timeout: 30000 });
      await new Promise(r => setTimeout(r, 500)); // let any async rendering settle

      await page.pdf({
        path:              outPath,
        format:            'A4',
        printBackground:   true,
        displayHeaderFooter: true,
        headerTemplate:    '<span></span>',
        footerTemplate: `
          <div style="width:100%;font-family:'Segoe UI',system-ui,sans-serif;font-size:7.5pt;color:#94a3b8;padding:0 18mm;display:flex;justify-content:space-between;align-items:center;">
            <span>UniSystem RAG — ${doc.title}</span>
            <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
          </div>`,
        margin: { top: '18mm', right: '18mm', bottom: '22mm', left: '18mm' },
      });

      await page.close();
      console.log(`    ✅  Saved → ${doc.out}`);
    }
  } finally {
    await browser.close();
  }

  console.log('\n✨  All PDFs generated successfully!\n');
}

main().catch(err => {
  console.error('\n❌  Fatal error:', err);
  process.exit(1);
});
