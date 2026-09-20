#!/usr/bin/env node
// SCENE 2 CAPABILITY RETRY #3 — HUMAN READ-THROUGH, PDF (Roman, 2026-09-20)
//
// Renders the real, paid retry-3 Scene 2 sample as a readable artifact — same technique as the
// established First Sacrifice read-through convention (Playwright headless Chromium,
// print-to-PDF, Desktop output, status-box framing). NO provider/image call. NO prose alteration —
// every beat below is read verbatim from scene2_raw_response_retry3.txt / the real planner
// response inside run_1789933193165.jsonl, never rewritten.
//
// usage: node _render_scene2_capability_retry3_pdf.mjs
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_scene2_repair_replay_sample_out');

const rawContent = fs.readFileSync(path.join(OUT_DIR, 'scene2_raw_response_retry3.txt'), 'utf8');
const fencedMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
const SCENE = JSON.parse(fencedMatch ? fencedMatch[1] : rawContent);

const events = fs.readFileSync(path.join(OUT_DIR, 'run_1789933193165.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const plannerResponse = events.find((e) => e.kind === 'response' && e.roleTag === 'scene2-structural-author' && e.responseBody && e.responseBody.model === 'ministral-8b-2512' && /tactical_move/.test(e.responseBody.choices[0].message.content || ''));
const plannerRaw = plannerResponse.responseBody.choices[0].message.content;
const plannerFenced = plannerRaw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
const PLANNER = JSON.parse(plannerFenced ? plannerFenced[1] : plannerRaw);

const authorResponse = events.find((e) => e.kind === 'response' && e.roleTag === 'scene2-structural-author' && e.responseBody && e.responseBody.model === 'grok-4.3');
const usage = authorResponse.responseBody.usage;
const authorCostUsd = usage.cost_in_usd_ticks * 1e-10;

function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function beatHtml(b) {
  const spk = b.speaker || null;
  const isDialogue = b.kind === 'dialogue';
  return `<div class="beat${isDialogue ? ' beat-dialogue' : ''}">
    <div class="beat-meta">Beat ${b.idx} · ${esc(b.kind || 'narration')}${spk ? ' · ' + esc(spk) : ''}</div>
    <div class="beat-text">${isDialogue ? '“' + esc(b.text) + '”' : esc(b.text)}</div>
  </div>`;
}

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; line-height: 1.6; max-width: 780px; margin: 0 auto; padding: 40px; }
  h1 { font-size: 22px; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 6px; }
  .subtitle { font-size: 13px; color: #555; margin-bottom: 24px; font-family: Menlo, monospace; }
  h2 { font-size: 17px; margin-top: 32px; border-bottom: 1px solid #ccc; padding-bottom: 5px; color: #222; }
  .status-box { background: #f7f5f0; border-left: 4px solid #666; padding: 12px 16px; margin: 16px 0; font-size: 13px; }
  .status-box b { color: #000; }
  .status-box .failed { color: #b03030; font-weight: bold; }
  .status-box .passed { color: #2e7d32; font-weight: bold; }
  .verdict-table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin: 12px 0; }
  .verdict-table td, .verdict-table th { border: 1px solid #ccc; padding: 6px 10px; text-align: left; vertical-align: top; }
  .verdict-table th { background: #eee; }
  .beat { margin: 10px 0; padding: 10px 14px; border-left: 3px solid #ddd; }
  .beat-dialogue { border-left: 3px solid #6a6a9a; background: #f4f4fa; }
  .beat-meta { font-family: Menlo, monospace; font-size: 10px; color: #888; margin-bottom: 6px; }
  .beat-text { font-size: 13px; }
  .scene-meta { font-size: 12px; color: #555; margin: 10px 0 20px 0; padding: 10px 14px; background: #f0f0f7; border-left: 3px solid #6a6a9a; }
  .planner-box { font-size: 12px; color: #333; margin: 10px 0 20px 0; padding: 10px 14px; background: #fafaf0; border-left: 3px solid #b08a2e; }
  .planner-box .label { font-weight: bold; color: #7a5a10; }
</style></head><body>
<h1>First Sacrifice — Scene 2, Capability Retry #3</h1>
<div class="subtitle">Human read-through · rendered ${esc(new Date().toISOString())} · source: scene2_raw_response_retry3.txt</div>

<div class="status-box">
  Status: <b>real, paid capability test — <span class="failed">FAILED full-scene adequacy</span>,
  not shipped, not patched, not approved prose.</b> This is the third real attempt at this exact
  scene (same Boundary Fate-card, same player Say/Do) after two structural fixes to the generator's
  planner (world-truth grounding + rhetorical-posture handling). It fixed the specific defects those
  two fixes targeted — see the verdict below — but still failed the automated adequacy check on a
  narrower, remaining gap.<br><br>
  Real cost: author call $${authorCostUsd.toFixed(6)} (grok-4-1-fast-reasoning, served as grok-4.3)
  · full run $0.127971 total, 4 requests, under the $0.45 / 8-request ceiling. Full account:
  <code>_scene2_capability_retry3_report_2026_09_20.md</code>.
</div>

<h2>What the planner decided (before any prose was written)</h2>
<div class="planner-box">
  <span class="label">Reader's actual input this turn (Fate-Card dialogue):</span> "I want you to
  burn for me, as the First-Favored did for the old gods."<br><br>
  <span class="label">Planner's posture_read:</span> ${esc(PLANNER.posture_read)}<br><br>
  <span class="label">Planner's chosen event (state_change):</span> ${esc(PLANNER.state_change)}<br><br>
  <span class="label">Forces choice:</span> ${esc(PLANNER.forces_choice)}
</div>

<h2>Verdict — evaluated in priority order</h2>
<table class="verdict-table">
  <tr><th>Check</th><th>Result</th></tr>
  <tr><td>1. Planner stopped literalizing "burn" into fire/ritual machinery</td><td class="passed">PASS</td></tr>
  <tr><td>2. Chose an event lane the seed's worldTruths actually sanction (accusation / preliminary review / political pressure)</td><td class="passed">PASS</td></tr>
  <tr><td>3. Author dramatized it without contradicting protected world facts (no relic-ownership violation, no invented magic)</td><td class="passed">PASS</td></tr>
  <tr><td>4a. Prose delivers real dialogue / interiority / LI pressure</td><td class="passed">Improved — 6 of 24 beats are dialogue, a first for this sample</td></tr>
  <tr><td>4b. Automated adequacy check (_detectSceneAdequacyFailure)</td><td class="failed">FAILED — see report for the two specific reasons (one likely a detector-vocabulary limit, one a real remaining ending-suspension gap)</td></tr>
</table>

<div class="scene-meta">
  Scene stake: ${esc(SCENE.sceneCharge && SCENE.sceneCharge.stake)}<br>
  ${SCENE.beats.length} beats total · ${SCENE.beats.filter((b) => b.kind === 'dialogue').length} dialogue · ${SCENE.beats.filter((b) => b.kind !== 'dialogue').length} narration
</div>

<h2>Scene 2 — full retry-3 text, verbatim</h2>
${SCENE.beats.map(beatHtml).join('\n')}

</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
const desktopPath = path.join(os.homedir(), 'Desktop', 'First_Sacrifice_Scene2_Retry3_ReadThrough.pdf');
await page.pdf({ path: desktopPath, format: 'Letter', margin: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in' }, printBackground: true });
await browser.close();
console.log('PDF written to: ' + desktopPath);
