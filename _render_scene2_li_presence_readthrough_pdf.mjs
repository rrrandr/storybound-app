#!/usr/bin/env node
// SCENE 2 — LI-PRESENCE REPAIR, HUMAN READ-THROUGH, PDF (Roman, 2026-09-20)
//
// Renders the accepted-but-unshipped repaired Scene 2 candidate (scene2_repaired.json) as a
// readable artifact, with the four repaired Julian beats (idx 7, 11, 16, 22) shown original ->
// repaired. Same technique as the established First Sacrifice read-through convention
// (_render_first_sacrifice_attempt8_human_readthrough_pdf.mjs — Playwright headless Chromium,
// print-to-PDF, Desktop output, status-box framing). NO provider/image call. NO prose alteration —
// every beat rendered here is read verbatim from the two source JSON files, never rewritten.
//
// usage: node _render_scene2_li_presence_readthrough_pdf.mjs
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPAIRED = JSON.parse(fs.readFileSync(path.join(__dirname, '_scene2_li_presence_repair_out', 'scene2_repaired.json'), 'utf8'));
const ORIGINAL = JSON.parse(fs.readFileSync(path.join(__dirname, '_scene2_repair_replay_sample_out', 'scene2_raw_response.txt'), 'utf8'));
const FINAL_REPORT = JSON.parse(fs.readFileSync(path.join(__dirname, '_scene2_li_presence_repair_out', 'report_final.json'), 'utf8'));

function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

const REPAIRED_IDX = new Set(FINAL_REPORT.appliedEdits.map((e) => e.idx));
const originalByIdx = {};
ORIGINAL.beats.forEach((b) => { originalByIdx[b.idx] = b.text; });

function beatHtml(b) {
  const isRepaired = REPAIRED_IDX.has(b.idx);
  const spk = b.speaker || null;
  if (!isRepaired) {
    return `<div class="beat">
      <div class="beat-meta">Beat ${b.idx} · ${esc(b.kind || 'narration')}${spk ? ' · ' + esc(spk) : ''}</div>
      <div class="beat-text">${esc(b.text)}</div>
    </div>`;
  }
  return `<div class="beat beat-repaired">
    <div class="beat-meta">Beat ${b.idx} · ${esc(b.kind || 'narration')} · REPAIRED (Julian-presence pass)</div>
    <div class="diff-row"><span class="diff-label">ORIGINAL</span><span class="diff-text diff-original">${esc(originalByIdx[b.idx])}</span></div>
    <div class="diff-row"><span class="diff-label">REPAIRED</span><span class="diff-text diff-repaired">${esc(b.text)}</span></div>
  </div>`;
}

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; line-height: 1.6; max-width: 780px; margin: 0 auto; padding: 40px; }
  h1 { font-size: 22px; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 6px; }
  .subtitle { font-size: 13px; color: #555; margin-bottom: 24px; font-family: Menlo, monospace; }
  h2 { font-size: 17px; margin-top: 32px; border-bottom: 1px solid #ccc; padding-bottom: 5px; color: #222; }
  .status-box { background: #f7f5f0; border-left: 4px solid #666; padding: 12px 16px; margin: 16px 0; font-size: 13px; }
  .status-box b { color: #000; }
  .status-box .unshipped { color: #b03030; font-weight: bold; }
  .beat { margin: 10px 0; padding: 10px 14px; border-left: 3px solid #ddd; }
  .beat-repaired { border-left: 3px solid #2e7d32; background: #f3f9f3; }
  .beat-meta { font-family: Menlo, monospace; font-size: 10px; color: #888; margin-bottom: 6px; }
  .beat-text { font-size: 13px; }
  .diff-row { margin: 4px 0; }
  .diff-label { display: inline-block; width: 76px; font-family: Menlo, monospace; font-size: 9.5px; font-weight: bold; vertical-align: top; color: #666; }
  .diff-text { font-size: 13px; }
  .diff-original { color: #8a3030; text-decoration: line-through; text-decoration-color: #c99; }
  .diff-repaired { color: #1a1a1a; }
  .scene-meta { font-size: 12px; color: #555; margin: 10px 0 20px 0; padding: 10px 14px; background: #f0f0f7; border-left: 3px solid #6a6a9a; }
</style></head><body>
<h1>First Sacrifice — Scene 2, LI-Presence Repair Candidate</h1>
<div class="subtitle">Human read-through · rendered ${esc(new Date().toISOString())} · source: scene2_repaired.json</div>

<div class="status-box">
  Status: <b>accepted by the current mechanical/quality gates, <span class="unshipped">unshipped</span>.</b>
  This is not "approved" and not "final" — it is the state after the LI-presence-dominance
  detector (widened vocabulary, 2026-09-20) stopped flagging this candidate. That detector checks
  one specific defect (Julian's presence dominated by unanchored inert-negation forms); it does not
  certify overall prose quality. This document is the separate human read.<br><br>
  Real paid repair cost: $${FINAL_REPORT.originalPaidCostUsd.toFixed(6)} (grok-4-1-fast-reasoning,
  served as grok-4.3). Originally rejected by the detector's first (too narrow) anchor vocabulary;
  accepted after the vocabulary was corrected — re-validated dry, no new provider call for the
  acceptance itself. <b>Not written to starter-scenes.js. Not shipped anywhere. No prose was
  altered to build this artifact</b> — every line below is read verbatim from
  scene2_repaired.json (repaired beats) and scene2_raw_response.txt (original beats, comparison
  only).
</div>

<div class="scene-meta">
  Scene stake: ${esc(REPAIRED.sceneCharge && REPAIRED.sceneCharge.stake)}<br>
  social_staging_mode: ${esc(REPAIRED.visualState && REPAIRED.visualState.social_staging_mode)} ·
  attractionPresence: ${esc(REPAIRED.visualState && REPAIRED.visualState.attractionPresence)} ·
  li_expression: ${esc(REPAIRED.visualState && REPAIRED.visualState.li_expression)}<br>
  ${REPAIRED.beats.length} beats total · 4 repaired (idx ${FINAL_REPORT.appliedEdits.map((e) => e.idx).join(', ')}), shown original → repaired below · 22 unchanged
</div>

<h2>Scene 2 — full candidate text (repaired beats marked)</h2>
${REPAIRED.beats.map(beatHtml).join('\n')}

</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
const desktopPath = path.join(os.homedir(), 'Desktop', 'First_Sacrifice_Scene2_LIPresence_ReadThrough.pdf');
await page.pdf({ path: desktopPath, format: 'Letter', margin: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in' }, printBackground: true });
await browser.close();
console.log('PDF written to: ' + desktopPath);
