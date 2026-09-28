// Local markdown -> print-styled HTML -> PDF. No network, nothing published externally.
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright-core';

const SRC = process.argv[2];
const OUT = process.argv[3];

const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function inline(t) {
  const code = [];
  t = esc(t).replace(/`([^`]+)`/g, (_, c) => { code.push(c); return '@@C' + (code.length - 1) + '@@'; });
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  return t.replace(/@@C(\d+)@@/g, (_, i) => '<code>' + code[+i] + '</code>');
}
const cells = row => row.replace(/^\||\|$/g, '').split('|').map(c => c.trim());

function blocks(lines) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const L = lines[i];
    if (!L.trim()) { i++; continue; }

    if (/^```/.test(L)) {
      const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push('<pre><code>' + esc(buf.join('\n')) + '</code></pre>');
      continue;
    }
    let m;
    if ((m = L.match(/^(#{1,6})\s+(.*)$/))) {
      const n = m[1].length;
      out.push('<h' + n + '>' + inline(m[2]) + '</h' + n + '>');
      i++; continue;
    }
    if (/^---+\s*$/.test(L)) { out.push('<hr>'); i++; continue; }

    if (L.startsWith('>')) {
      const buf = [];
      while (i < lines.length && lines[i].startsWith('>')) buf.push(lines[i++].replace(/^>\s?/, ''));
      out.push('<blockquote>' + blocks(buf) + '</blockquote>');
      continue;
    }
    if (L.includes('|') && lines[i + 1] && /^\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1])) {
      const head = cells(L);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) rows.push(cells(lines[i++]));
      out.push('<table><thead><tr>' + head.map(h => '<th>' + inline(h) + '</th>').join('') +
        '</tr></thead><tbody>' +
        rows.map(r => '<tr>' + r.map(c => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') +
        '</tbody></table>');
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(L)) {
      const ordered = /^\s*\d+\./.test(L);
      const items = [];
      while (i < lines.length && lines[i].trim()) {
        const mm = lines[i].match(/^\s*(?:[-*]|\d+\.)\s+(.*)$/);
        if (mm) items.push(mm[1]);
        else if (items.length) items[items.length - 1] += ' ' + lines[i].trim();
        else break;
        i++;
      }
      const tag = ordered ? 'ol' : 'ul';
      out.push('<' + tag + '>' + items.map(t => '<li>' + inline(t) + '</li>').join('') + '</' + tag + '>');
      continue;
    }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|>|---+\s*$|```)/.test(lines[i]) &&
      !/^\s*([-*]|\d+\.)\s+/.test(lines[i])) buf.push(lines[i++]);
    out.push('<p>' + inline(buf.join(' ')) + '</p>');
  }
  return out.join('\n');
}

const md = fs.readFileSync(SRC, 'utf8');
const body = blocks(md.split('\n'));
const title = (md.match(/^#\s+(.*)$/m) || [, path.basename(SRC)])[1];

const CSS = `
@page { size: A4; margin: 18mm 16mm 20mm; }
:root { --ink:#1a1714; --soft:#5d564e; --rule:#ddd6cc; --accent:#7a2e1e; --wash:#faf7f2; }
* { box-sizing: border-box; }
body { margin:0; font: 10.2pt/1.55 "Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;
       color:var(--ink); background:#fff; }
h1,h2,h3,h4 { font-family:"Helvetica Neue",Helvetica,Arial,sans-serif; line-height:1.25;
       text-wrap:balance; margin:0 0 .4em; break-after:avoid; }
h1 { font-size:20pt; letter-spacing:-.4px; margin-top:0; padding-bottom:.35em; border-bottom:2px solid var(--ink); }
h2 { font-size:14pt; margin-top:1.7em; color:var(--accent); letter-spacing:-.2px; }
h3 { font-size:11.2pt; margin-top:1.4em; letter-spacing:-.1px;
     border-left:3px solid var(--accent); padding-left:.6em; }
h4 { font-size:10.2pt; margin-top:1.1em; color:var(--soft); text-transform:uppercase; letter-spacing:.06em; }
p { margin:0 0 .7em; orphans:3; widows:3; }
code { font:9pt/1.4 "SF Mono",Menlo,Consolas,monospace; background:var(--wash);
       border:1px solid var(--rule); border-radius:2px; padding:.02em .22em;
       text-transform:none; letter-spacing:0; }
pre { background:var(--wash); border:1px solid var(--rule); border-left:3px solid var(--soft);
      padding:.7em .9em; overflow:hidden; break-inside:avoid; }
pre code { background:none; border:0; padding:0; font-size:8.4pt; }
blockquote { margin:.9em 0; padding:.7em .95em; background:var(--wash);
             border:1px solid var(--rule); border-left:3px solid var(--accent);
             break-inside:avoid; font-size:9.7pt; }
blockquote > :last-child { margin-bottom:0; }
blockquote h2, blockquote h3, blockquote h4 { margin-top:0; border:0; padding:0; color:var(--accent); font-size:10.4pt; }
table { width:100%; border-collapse:collapse; margin:.8em 0 1em; font-size:8.9pt;
        break-inside:avoid; font-variant-numeric:tabular-nums; }
th,td { border:1px solid var(--rule); padding:.4em .55em; text-align:left; vertical-align:top; }
th { background:var(--wash); font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;
     font-size:8.2pt; text-transform:uppercase; letter-spacing:.05em; color:var(--soft); }
ul,ol { margin:0 0 .8em; padding-left:1.3em; }
li { margin-bottom:.3em; }
hr { border:0; border-top:1px solid var(--rule); margin:1.6em 0; }
`;

const html = '<!doctype html><html><head><meta charset="utf-8"><title>' + esc(title) +
  '</title><style>' + CSS + '</style></head><body>' + body + '</body></html>';

const tmp = path.join(process.env.TMPDIR || '/tmp', 'sheet_render.html');
fs.writeFileSync(tmp, html);

const footer = '<div style="width:100%;font:7.5pt -apple-system,Helvetica,sans-serif;color:#8a8279;' +
  'padding:0 16mm;display:flex;justify-content:space-between;">' +
  '<span>PROPOSED EDITORIAL CANON &mdash; not approved</span>' +
  '<span class="pageNumber"></span></div>';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('file://' + tmp, { waitUntil: 'load' });
await page.pdf({
  path: OUT, format: 'A4', printBackground: true,
  displayHeaderFooter: true, headerTemplate: '<div></div>', footerTemplate: footer,
  margin: { top: '18mm', bottom: '20mm', left: '16mm', right: '16mm' }
});
await browser.close();
console.log('wrote ' + OUT + '  (' + (fs.statSync(OUT).size / 1024).toFixed(0) + ' KB)');
