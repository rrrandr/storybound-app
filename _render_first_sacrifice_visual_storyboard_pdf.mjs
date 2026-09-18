#!/usr/bin/env node
// FIRST SACRIFICE — LOCKED VISUAL STORYBOARD, PDF (Roman, 2026-09-19)
//
// Same content and same real data sources as _render_first_sacrifice_visual_storyboard.mjs (the
// Markdown version) — this renders it as a styled PDF to the Desktop instead. NO provider/image
// calls: pure data render (packet + starter-scenes.js, both read-only) through a headless browser's
// print-to-PDF, the same technique already used this session for the Attempt-4 side-by-side PDF.
//
// usage: node _render_first_sacrifice_visual_storyboard_pdf.mjs
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKET = JSON.parse(fs.readFileSync(path.join(__dirname, '_first_sacrifice_source_packet.json'), 'utf8'));
const starterSrc = fs.readFileSync(path.join(__dirname, 'public/starter-scenes.js'), 'utf8');

const keyIdx = starterSrc.indexOf('starter_first_sacrifice:');
const braceStart = starterSrc.indexOf('{', keyIdx);
let depth = 0, i = braceStart, braceEnd = -1;
for (; i < starterSrc.length; i++) { if (starterSrc[i] === '{') depth++; else if (starterSrc[i] === '}') { depth--; if (depth === 0) { braceEnd = i; break; } } }
const REAL_PKG = new Function('return ' + starterSrc.slice(braceStart, braceEnd + 1))();

const sb = PACKET.scene1_visual_storyboard;
const bnt = PACKET.scene1_beat_number_template;
const realOcc = REAL_PKG.imageOccurrences;
const realAssets = {}; (REAL_PKG.imageAssets || []).forEach(a => { realAssets[a.id] = a; });

function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function assetKindLabel(beat) {
  if (beat.treatment === 'full') return 'intro';
  if (beat.treatment === 'quadrant') return 'quadrant ' + beat.quadrant + ' of interaction_sheet_1';
  return 'reuse (' + beat.treatment + ' crop)';
}
function kindLabel(beat, fn) {
  if (beat.kind === 'dialogue') return 'dialogue';
  if (beat.kind === 'narration_or_dialogue') return 'narration or dialogue';
  if (/^Free interiority/i.test(fn)) return 'narration — interiority';
  return 'narration';
}

const assetRows = Object.keys(realAssets).map(aid => {
  const occKeys = Object.keys(realOcc).filter(k => realOcc[k].assetId === aid);
  return `<tr><td class="mono">${esc(aid)}</td><td>${esc(realAssets[aid].kind)}</td><td>${esc(realAssets[aid].label)}</td><td class="mono">${occKeys.map(esc).join(', ')}</td></tr>`;
}).join('\n');

const beatRows = sb.beats.map(b => {
  const tmpl = bnt.slots[b.n - 1];
  const fn = (tmpl && tmpl.fn) || '';
  return `<tr>
    <td class="num">${b.n}</td>
    <td class="fn">${esc(fn)}</td>
    <td class="mono">${b.id ? esc(b.id) : '<span class="free">(free)</span>'}</td>
    <td class="mono">${esc(b.occurrence)}</td>
    <td class="mono">${esc(b.assetId)}</td>
    <td>${esc(assetKindLabel(b))}</td>
    <td class="mono">${esc(b.treatment)}${b.quadrant != null ? ' (q' + b.quadrant + ')' : ''}</td>
    <td>${esc(kindLabel(b, fn))}<br><span class="words">${b.wordRange[0]}-${b.wordRange[1]}w</span></td>
  </tr>`;
}).join('\n');

const oh = REAL_PKG.oasHandoff;
const reprise = sb.dohkar_reprise;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Georgia, serif; color: #1a1a1a; font-size: 9.5pt; line-height: 1.4; margin: 0; padding: 0 4px; }
  h1 { font-size: 17pt; margin: 0 0 4px; }
  h2 { font-size: 12.5pt; margin: 22px 0 8px; border-bottom: 1.5px solid #999; padding-bottom: 3px; }
  .meta { font-size: 8pt; color: #555; margin: 2px 0; }
  .meta b { color: #222; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0 10px; }
  th { background: #2b2b2b; color: #fff; text-align: left; padding: 4px 6px; font-size: 8pt; }
  td { border-bottom: 1px solid #ddd; padding: 4px 6px; vertical-align: top; font-size: 8pt; }
  tr:nth-child(even) td { background: #f7f6f2; }
  .mono { font-family: "SF Mono", Menlo, monospace; font-size: 7.6pt; color: #7a3b8f; white-space: nowrap; }
  .num { text-align: center; font-weight: bold; width: 22px; }
  .fn { max-width: 230px; }
  .words { color: #888; font-size: 7pt; }
  .free { color: #999; font-style: italic; }
  pre.timeline { background: #f7f6f2; border: 1px solid #ccc; padding: 10px 12px; font-size: 7.6pt; line-height: 1.45; font-family: "SF Mono", Menlo, monospace; overflow-x: auto; }
  .rhythm { font-size: 8.5pt; color: #333; margin: 8px 0 0; font-style: italic; }
  .reprise-box { background: #fff8ea; border: 1.5px solid #d9a441; border-radius: 4px; padding: 10px 14px; margin: 8px 0; }
  .reprise-box b { color: #8a5a00; }
  .footer { margin-top: 24px; font-size: 7.5pt; color: #999; border-top: 1px solid #ccc; padding-top: 6px; }
</style></head><body>

<h1>First Sacrifice — Locked Visual Storyboard</h1>
<div class="meta"><b>Packet:</b> _first_sacrifice_source_packet.json v${esc(PACKET.version)} — scene1_visual_storyboard section</div>
<div class="meta"><b>Runtime source cross-checked:</b> public/starter-scenes.js starter_first_sacrifice.imageAssets / imageOccurrences (real evaluation, not restated by hand)</div>
<div class="meta"><b>Consistency proof:</b> _first_sacrifice_visual_storyboard_control.mjs — 13/13 (structural agreement only; does NOT judge visual rhythm — that is this document's purpose)</div>
<div class="meta"><b>Generated:</b> ${new Date().toISOString().slice(0, 10)} — no provider or image call made to produce this document</div>

<h2>Asset roster (5 real assets)</h2>
<table><tr><th>Asset ID</th><th>Kind</th><th>Label</th><th>Used by occurrence(s)</th></tr>${assetRows}</table>
<p style="font-size:8.5pt;">9 occurrences resolve across those 5 assets: 4 solo intros (full), 4 quadrants of the ONE shared interaction sheet, and 1 reuse (the Dohkar reprise, below). <b>No ninth asset is ever created.</b></p>

<h2>Compact occurrence timeline</h2>
<pre class="timeline">  INTRODUCTIONS (beats 1-8)              INTERACTION SHEET (beats 9-20)            REPRISE
  ────────────────────────────           ──────────────────────────────            ───────
  [1] Lirael   (intro_lirael, full)       [9-10]  d1 — quadrant 0
  [2] Lirael   (intro_lirael, full)       [11-14] d2 — quadrant 1
  [3] Seren    (intro_seren,  full)       [15-17] d3 — quadrant 2                   [reprise] Dohkar
  [4] Seren    (intro_seren,  full)       [18-20] d4 — quadrant 3                     (intro_dohkar,
  [5] Dohkar   (intro_dohkar, full)                                                    close crop —
  [6] Dohkar   (intro_dohkar, full)       one shared 2x2 sheet asset                   SAME asset as
  [7] Julian   (intro_julian, full)       (interaction_sheet_1), split into              beats 5-6,
  [8] Julian   (intro_julian, full)       4 quadrants — ONE generation call             reused, not
                                          covers all 12 of these beats                  regenerated)</pre>
<p class="rhythm">Rhythm: 4 characters introduced solo (2 beats each) → one 12-beat, 4-quadrant dramatic sequence (the rite, the wish, the twist, the charge, The Answer) → the OAS handoff → live one-on-one → Dohkar's interruption reprises his OWN intro portrait at a tighter crop, not a new image.</p>

<h2>Beat-by-beat (all 20)</h2>
<table>
  <tr><th>#</th><th>Dramatic function</th><th>Coverage id</th><th>Occurrence</th><th>Asset</th><th>Type</th><th>Treatment</th><th>Text kind</th></tr>
  ${beatRows}
</table>

<h2>OAS handoff</h2>
<p style="font-size:8.5pt;">After beat 20, the scene hands off to the LIVE one-on-one (<span class="mono">endsAt: 'oas_interrupt'</span>). Cue: <i>"${esc(oh.cue)}"</i> — no image occurrence of its own; the reader is already looking at the d4 quadrant (beat 18-20's asset) when this fires.</p>
<p style="font-size:8.5pt;">The live OAS exchange is player-driven — not authored, not part of this storyboard.</p>

<h2>The Dohkar reprise (explicit)</h2>
<div class="reprise-box">
When the Dohkar interrupts the live interrogation, the scene shows him again — <b>this is the SAME intro_dohkar asset used at beats 5-6, cropped to a tighter "close" treatment.</b> It is occurrence <span class="mono">dohkar_interruption</span>, the 9th and final occurrence — there is no 9th generated image anywhere in this scene.
</div>
<table>
  <tr><th>Field</th><th>Value</th></tr>
  <tr><td>Occurrence id</td><td class="mono">${esc(reprise.occurrence)}</td></tr>
  <tr><td>Asset id</td><td class="mono">${esc(reprise.assetId)} (identical asset to beats 5-6, not regenerated)</td></tr>
  <tr><td>Treatment</td><td class="mono">${esc(reprise.treatment)} (a zero-cost crop, not a new generation)</td></tr>
  <tr><td>Placement</td><td style="font-size:8pt;">${esc(reprise.placement)}</td></tr>
  <tr><td>Real wiring</td><td style="font-size:7.6pt;">starter-scenes.js → oasHandoff.interruptionPortrait = '${esc(reprise.occurrence)}', mounted by _mountIntimateInterruption through the structured renderer (_mountImageOccurrence) — never markup in the interruption's authored prose.</td></tr>
</table>
<p style="font-size:8pt;">Also present alongside the reprise (unchanged, pre-existing): the d3 plate — the wide "assembly turns / charge" quadrant — as the establishing image for the interruption moment. The Dohkar close-up is additive, not a replacement.</p>

<div class="footer">This document is generated, not authored — _render_first_sacrifice_visual_storyboard_pdf.mjs. Re-run after any packet or starter-scenes.js change to this scene.</div>

</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
const desktopPath = path.join(os.homedir(), 'Desktop', 'First_Sacrifice_Visual_Storyboard.pdf');
await page.pdf({ path: desktopPath, format: 'Letter', landscape: true, margin: { top: '0.4in', bottom: '0.4in', left: '0.4in', right: '0.4in' }, printBackground: true });
await browser.close();
console.log('Wrote PDF to: ' + desktopPath);
console.log('No provider/image calls made.');
