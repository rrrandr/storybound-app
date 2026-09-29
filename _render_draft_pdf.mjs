#!/usr/bin/env node
// Renders _first_sacrifice_draft_v1/04_review_preview.md to a styled PDF on the Desktop.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const md = fs.readFileSync(path.join(__dirname, '_first_sacrifice_draft_v1/04_review_preview.md'), 'utf8');

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function inline(s) {
  s = escapeHtml(s);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
  return s;
}

const lines = md.split('\n');
let html = '';
let inList = false;
for (const raw of lines) {
  const line = raw;
  if (/^# /.test(line)) { html += `<h1>${inline(line.slice(2))}</h1>\n`; continue; }
  if (/^## /.test(line)) { if (inList) { html += '</ol>\n'; inList = false; } html += `<h2>${inline(line.slice(3))}</h2>\n`; continue; }
  if (/^> /.test(line)) { html += `<blockquote>${inline(line.slice(2))}</blockquote>\n`; continue; }
  if (/^\d+\.\s/.test(line)) {
    if (!inList) { html += '<ol>\n'; inList = true; }
    html += `<li>${inline(line.replace(/^\d+\.\s/, ''))}</li>\n`;
    continue;
  }
  if (/^-\s/.test(line)) { html += `<div class="bullet">• ${inline(line.slice(2))}</div>\n`; continue; }
  if (inList) { html += '</ol>\n'; inList = false; }
  if (line.trim() === '') { html += '\n'; continue; }
  html += `<p>${inline(line)}</p>\n`;
}
if (inList) html += '</ol>\n';

const page = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; line-height: 1.55; max-width: 720px; margin: 0 auto; padding: 40px; }
  h1 { font-size: 22px; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 18px; }
  h2 { font-size: 16px; margin-top: 28px; border-bottom: 1px solid #ccc; padding-bottom: 4px; color: #333; }
  p { font-size: 13px; margin: 6px 0; word-wrap: break-word; }
  blockquote { font-size: 14px; font-style: italic; margin: 6px 0 6px 0; padding: 8px 14px; background: #f7f5f0; border-left: 3px solid #999; }
  code { background: #eee; padding: 1px 5px; border-radius: 3px; font-family: Menlo, monospace; font-size: 11px; }
  .bullet { font-size: 12px; margin: 3px 0; color: #444; }
  ol { font-size: 13px; }
  li { margin: 6px 0; }
  strong { color: #000; }
</style></head><body>${html}</body></html>`;

const browser = await chromium.launch();
const pageObj = await browser.newPage();
await pageObj.setContent(page, { waitUntil: 'load' });
const desktopPath = path.join(os.homedir(), 'Desktop', 'First_Sacrifice_Draft_v1.pdf');
await pageObj.pdf({ path: desktopPath, format: 'Letter', margin: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in' }, printBackground: true });
await browser.close();
console.log('PDF written to: ' + desktopPath);
