// READING COPY -> PDF, laid out for actually reading on a desktop. $0.
//
// No reportlab, pandoc, wkhtmltopdf or weasyprint on this machine — but playwright's Chromium is
// already here for the harness, and page.pdf() gives real typography control, which matters for a
// document whose whole purpose is to be read as prose.
//
// The markdown subset used by READING_COPY.md is rendered deliberately rather than by a general
// converter: headings, rules, the choice blockquotes, the questions table, bold, and prose. Screenplay
// speaker lines ("THE PRESIDING DOHKAR: ...") are styled as dialogue, because that is what they are.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { chromium } from 'playwright-core';

const SRC = process.argv[2]
  || '_fs_issue_corpus_out/run_2026-10-02T22-42-28-298Z/reading_packet/READING_COPY.md';
const OUT = process.argv[3] || path.join(os.homedir(), 'Desktop', 'The-First-Sacrifice-Issue-1.pdf');
if (!fs.existsSync(SRC)) { console.error('REFUSED: no reading copy at ' + SRC); process.exit(2); }
const md = fs.readFileSync(SRC, 'utf8');

const esc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (x) => esc(x)
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/\*([^*]+)\*/g, '<em>$1</em>')
  .replace(/`([^`]+)`/g, '<code>$1</code>');

// ── RENDER ──────────────────────────────────────────────────────────────────
const lines = md.split('\n');
let html = '';
let i = 0;
const flushQuote = (buf) => buf.length
  ? '<div class="choice">' + buf.map(l => '<p>' + inline(l) + '</p>').join('') + '</div>' : '';

while (i < lines.length) {
  const raw = lines[i];
  const line = raw.trimEnd();

  if (/^---+$/.test(line.trim())) { html += '<div class="sceneBreak"></div>'; i++; continue; }
  if (/^# /.test(line)) { html += '<h1>' + inline(line.slice(2)) + '</h1>'; i++; continue; }
  if (/^## /.test(line)) {
    const txt = line.slice(3);
    const isScene = /^Scene \d+$/.test(txt.trim());
    html += '<h2' + (isScene ? ' class="scene"' : '') + '>' + inline(txt) + '</h2>';
    i++; continue;
  }
  if (/^### /.test(line)) { html += '<h3>' + inline(line.slice(4)) + '</h3>'; i++; continue; }

  // The choice block, which is what makes the reading legible as a sequence of decisions.
  if (/^> /.test(line)) {
    const buf = [];
    while (i < lines.length && /^> ?/.test(lines[i])) { buf.push(lines[i].replace(/^> ?/, '')); i++; }
    html += flushQuote(buf.filter(x => x.trim()));
    continue;
  }

  // The questions table.
  if (/^\|/.test(line)) {
    const rows = [];
    while (i < lines.length && /^\|/.test(lines[i])) { rows.push(lines[i]); i++; }
    const cells = rows.filter(r => !/^\|[\s:|-]+\|$/.test(r.trim()))
      .map(r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
    if (cells.length) {
      html += '<table><thead><tr>'
        + cells[0].map(c => '<th>' + inline(c) + '</th>').join('')
        + '</tr></thead><tbody>'
        + cells.slice(1).map(r => '<tr>' + r.map(c => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('')
        + '</tbody></table>';
    }
    continue;
  }

  if (/^\d+\.\s/.test(line)) {
    const buf = [];
    while (i < lines.length && (/^\d+\.\s/.test(lines[i]) || /^\s{2,}\S/.test(lines[i]))) {
      if (/^\d+\.\s/.test(lines[i])) buf.push(lines[i].replace(/^\d+\.\s/, ''));
      else buf[buf.length - 1] += ' ' + lines[i].trim();
      i++;
    }
    html += '<ol>' + buf.map(x => '<li>' + inline(x) + '</li>').join('') + '</ol>';
    continue;
  }

  if (!line.trim()) { i++; continue; }

  // A paragraph: gather until a blank line. Screenplay speaker lines are their own class.
  const buf = [];
  while (i < lines.length && lines[i].trim() && !/^(#|>|\||---+$|\d+\.\s)/.test(lines[i].trim())) {
    buf.push(lines[i].trim()); i++;
  }
  const text = buf.join(' ');
  const speaker = text.match(/^([A-Z][A-Z' .’-]{2,40}):\s*(.+)$/);
  if (speaker) {
    html += '<p class="line"><span class="who">' + inline(speaker[1]) + '</span>'
      + '<span class="said">' + inline(speaker[2]) + '</span></p>';
  } else {
    html += '<p>' + inline(text) + '</p>';
  }
}

const doc = `<!doctype html><html><head><meta charset="utf-8"><style>
  @page { size: Letter; margin: 22mm 20mm 20mm 20mm; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font: 11.5pt/1.62 "Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;
         color: #1b1a18; margin: 0; }
  h1 { font-size: 23pt; line-height: 1.22; margin: 0 0 4pt; letter-spacing: -0.01em;
       text-wrap: balance; }
  h1 + p { color: #5b564e; font-size: 10.5pt; }
  h2 { font-size: 13pt; margin: 20pt 0 8pt; letter-spacing: 0.01em; }
  h2.scene { font: 600 9.5pt/1.2 ui-sans-serif,-apple-system,"Helvetica Neue",sans-serif;
             text-transform: uppercase; letter-spacing: 0.17em; color: #8a6a2f;
             border-bottom: 0.6pt solid #d9cdb4; padding-bottom: 5pt; margin: 0 0 13pt;
             break-after: avoid; }
  h3 { font-size: 11.5pt; margin: 15pt 0 5pt; }
  p { margin: 0 0 9.5pt; orphans: 2; widows: 2; }
  /* THE CHOICE THAT LED INTO THE SCENE — set apart, because the sequence of decisions is half of
     what the reader is being asked to judge. */
  .choice { border-left: 2pt solid #c9a227; background: #faf7ef; padding: 9pt 12pt 3pt;
            margin: 0 0 15pt; break-inside: avoid; }
  .choice p { font: italic 10.5pt/1.5 inherit; color: #4a4437; margin: 0 0 6pt; }
  /* Screenplay dialogue, kept as dialogue rather than flattened into prose. */
  /* A speaker and their line must not be split across a page: page 9 of the first render showed
     a bare quote whose name had stayed on the previous page. */
  .line { margin: 0 0 9.5pt; break-inside: avoid; }
  .who { display: block; font: 600 8.5pt/1.4 ui-sans-serif,-apple-system,sans-serif;
         letter-spacing: 0.13em; color: #6d6456; }
  .said { display: block; padding-left: 10pt; border-left: 1pt solid #e4ded1; }
  .sceneBreak { break-before: page; height: 0; }
  table { border-collapse: collapse; width: 100%; font-size: 9.5pt; margin: 10pt 0 14pt; }
  th, td { border: 0.5pt solid #cfc7b8; padding: 5pt 7pt; text-align: left; vertical-align: top; }
  th { background: #f4efe4; font: 600 8.5pt/1.3 ui-sans-serif,sans-serif;
       text-transform: uppercase; letter-spacing: 0.08em; }
  td { height: 22pt; }
  ol { padding-left: 18pt; margin: 0 0 12pt; }
  li { margin: 0 0 7pt; }
  code { font: 10pt ui-monospace,Menlo,monospace; background: #f2eee4; padding: 0 3pt;
         border-radius: 2pt; }
  strong { font-weight: 600; }
</style></head><body>${html}</body></html>`;

const tmp = path.join(os.tmpdir(), 'reading_copy_' + Date.now() + '.html');
fs.writeFileSync(tmp, doc);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('file://' + tmp, { waitUntil: 'load' });
await page.pdf({
  path: OUT, format: 'Letter', printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate: '<div style="width:100%;font:8pt ui-sans-serif,sans-serif;color:#9a9284;'
    + 'padding:0 20mm;display:flex;justify-content:space-between;">'
    + '<span>The First Sacrifice &mdash; Issue One, reading copy</span>'
    + '<span class="pageNumber"></span></div>',
  margin: { top: '22mm', bottom: '18mm', left: '20mm', right: '20mm' }
});
await browser.close();
try { fs.unlinkSync(tmp); } catch (_) {}
const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log('wrote ' + OUT + '  (' + kb + ' KB)');
