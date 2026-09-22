#!/usr/bin/env node
// TEMPTATION ATTEMPT 4 — FIRST FULL END-TO-END DRAFT — HUMAN READ-THROUGH, PDF (Roman, 2026-09-21)
//
// Renders the real, paid attempt-4 Temptation Scene 2 sample as a readable artifact — same
// technique as the established First Sacrifice read-through convention (Playwright headless
// Chromium, print-to-PDF, Desktop output, status-box framing). NO provider/image call. NO prose
// alteration — every beat below is read verbatim from scene2_raw_response_temptation.txt / the
// real planner response inside run_1790040773323.jsonl, never rewritten.
//
// usage: node _render_temptation_attempt4_readthrough_pdf.mjs
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_scene2_repair_replay_sample_out');

const rawContent = fs.readFileSync(path.join(OUT_DIR, 'scene2_raw_response_temptation.txt'), 'utf8');
const fencedMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
const SCENE = JSON.parse(fencedMatch ? fencedMatch[1] : rawContent);

const LOG_FILE = path.join(OUT_DIR, 'run_1790040773323.jsonl');
const events = fs.readFileSync(LOG_FILE, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const plannerResponse = events.find((e) => e.kind === 'response' && e.roleTag === 'scene2-structural-author' && e.real === true && e.responseBody && e.responseBody.usage && e.responseBody.usage.total_tokens === 7754);
const plannerRaw = plannerResponse.responseBody.choices[0].message.content;
const plannerFenced = plannerRaw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
const PLANNER = JSON.parse(plannerFenced ? plannerFenced[1] : plannerRaw);

const authorResponse = events.find((e) => e.kind === 'response' && e.roleTag === 'scene2-structural-author' && e.real === true && e.responseBody && e.responseBody.usage && e.responseBody.usage.total_tokens === 65218);
const authorCostUsd = authorResponse.responseBody.usage.cost_in_usd_ticks * 1e-10;

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
  .status-box .warn { color: #b07c10; font-weight: bold; }
  .status-box .passed { color: #2e7d32; font-weight: bold; }
  .verdict-table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin: 12px 0; }
  .verdict-table td, .verdict-table th { border: 1px solid #ccc; padding: 6px 10px; text-align: left; vertical-align: top; }
  .verdict-table th { background: #eee; }
  .verdict-table .strong { color: #2e7d32; font-weight: bold; }
  .verdict-table .mixed { color: #b07c10; font-weight: bold; }
  .beat { margin: 10px 0; padding: 10px 14px; border-left: 3px solid #ddd; }
  .beat-dialogue { border-left: 3px solid #6a6a9a; background: #f4f4fa; }
  .beat-meta { font-family: Menlo, monospace; font-size: 10px; color: #888; margin-bottom: 6px; }
  .beat-text { font-size: 13px; }
  .scene-meta { font-size: 12px; color: #555; margin: 10px 0 20px 0; padding: 10px 14px; background: #f0f0f7; border-left: 3px solid #6a6a9a; }
  .planner-box { font-size: 12px; color: #333; margin: 10px 0 20px 0; padding: 10px 14px; background: #fafaf0; border-left: 3px solid #b08a2e; }
  .planner-box .label { font-weight: bold; color: #7a5a10; }
  .cost-box { font-size: 11.5px; color: #333; margin: 10px 0 20px 0; padding: 10px 14px; background: #f0f7f0; border-left: 3px solid #4a8a4a; font-family: Menlo, monospace; }
  .cost-box .flag { color: #b03030; font-weight: bold; }
</style></head><body>
<h1>First Sacrifice — Scene 2, Temptation, Attempt 4 (first full end-to-end draft)</h1>
<div class="subtitle">Human read-through · rendered ${esc(new Date().toISOString())} · source: scene2_raw_response_temptation.txt</div>

<div class="status-box">
  Status: <b>real, paid capability test — <span class="passed">gate ACCEPTED, author ran, a full scene was delivered</span>.
  Honest quality read: <span class="warn">STRONG on landed action / consequence / continuity / forced choice, but a REAL, SPECIFIC weakness on Julian's engagement</span> —
  see the verdict table below. This is NOT an automatic "full success"; gate acceptance is mechanical evidence only.</b><br><br>
  Real cost: $0.1449127 total, 4 physical requests (planner $${(0.0108859).toFixed(7)}, author $${authorCostUsd.toFixed(7)},
  editorial-gravity auditor $0.0006234 [estimated], <span class="flag">image-style-extraction call $0.0452025 [estimated — OUT OF SCOPE, see report]</span>),
  under the $0.45 / 8-request ceiling. Full account: <code>_scene2_capability_temptation_attempt4_report_2026_09_21.md</code>.
</div>

<h2>What the planner decided (before any prose was written)</h2>
<div class="planner-box">
  <span class="label">Reader's actual Say/Do this turn:</span> SAY: "Then step forward, Julian. But
  do not call it rescue when you want me to ask." · DO: "I keep my hands folded at my waist and meet
  his eyes across Seren's bowed head, refusing to give the assembly the satisfaction of looking
  away."<br><br>
  <span class="label">Planner's posture_read:</span> ${esc(PLANNER.posture_read)}<br><br>
  <span class="label">Planner's chosen event (state_change):</span> ${esc(PLANNER.state_change)}<br><br>
  <span class="label">Lane posture modulation:</span> ${esc(PLANNER.lane_posture_modulation)}<br><br>
  <span class="label">Aftermath obligations (the promised consequence):</span> ${esc(PLANNER.aftermath_obligations)}<br><br>
  <span class="label">Forces choice:</span> ${esc(PLANNER.forces_choice)}
</div>

<h2>Verdict — the six criteria this run was authorized to evaluate</h2>
<table class="verdict-table">
  <tr><th>Criterion</th><th>Result</th></tr>
  <tr><td>1. Lirael's defensive action responds meaningfully to the submitted Say/Do</td><td class="mixed">PARTIAL — the concealment (mouth-band into sash) is a real, landed response to the Dohkar's pressure, but the Say/Do's specific physical beat (holding Julian's gaze, refusing to look away) is NOT delivered; her gaze in the scene stays on the sash/band, not Julian</td></tr>
  <tr><td>2. A consequential response that changes her situation and advances beyond the interrogation</td><td class="strong">PASS — the Dohkar's dialogue escalates from procedural ("the band is yours to return") to a direct, sharpened demand ("you have not spoken the stake that belongs to you"); a genuine institutional tightening, not a restage</td></tr>
  <tr><td>3. Dialogue, interiority, and specific dramatic development sufficient for a full scene</td><td class="mixed">PARTIAL — 24 beats, 2 lines of dialogue (both the Dohkar's; Lirael speaks none), terse staccato interiority consistent with the CG beat format; thinner than a prose scene but structurally complete</td></tr>
  <tr><td>4. Julian's relevant presence without overriding Lirael's agency</td><td class="mixed">WEAK — Julian appears only in background reaction shots (a wrist-scar script shift); he never responds to being addressed directly in the reader's own SAY line, and does not "step forward" as the reader asked</td></tr>
  <tr><td>5. Canon, continuity preserved</td><td class="strong">PASS — mouth-band, The Answer, Seren kneeling, the Dohkar's procedural role, all consistent with Scene 1's established facts</td></tr>
  <tr><td>6. A new consequential choice at the end</td><td class="strong">PASS — ends on "Claim the interference or let the assembly keep its assumption," the exact seed-declared decision axis</td></tr>
</table>

<div class="cost-box">
  Physical calls, in dispatch order:<br>
  1. grok-4-1-fast-non-reasoning (planner) — $0.0108859 — provider_ticks (verified)<br>
  2. grok-4-1-fast-reasoning (author) — $${authorCostUsd.toFixed(7)} — provider_ticks (verified)<br>
  3. ministral-8b-2512 (editorial "emotional gravity" auditor) — $0.0006234 — <span class="flag">estimated, not provider-verified</span><br>
  4. gpt-4o via chatgpt-proxy (image-STYLE-extraction prompt, from a reference image) — $0.0452025 — <span class="flag">estimated, not provider-verified; OUT OF THIS RUN'S AUTHORIZED SCOPE ("no image generation or image-style extraction")</span><br>
  Total: $0.1449127 / $0.45 ceiling. No actual image was generated — all real image-provider endpoints (BFL, Gemini, OpenAI image-gen) were aborted as undeclared throughout the run.
</div>

<div class="scene-meta">
  Scene stake: ${esc(SCENE.sceneCharge && SCENE.sceneCharge.stake)}<br>
  ${SCENE.beats.length} beats total · ${SCENE.beats.filter((b) => b.kind === 'dialogue').length} dialogue · ${SCENE.beats.filter((b) => b.kind !== 'dialogue').length} narration
</div>

<h2>Independent corroboration — the editorial "emotional gravity" auditor's own read</h2>
<div class="planner-box">
  A separate, pre-existing editorial mechanism (not built for this session, not consulted by me
  before forming the verdict above) independently scored this exact delivered scene:
  <b>desire_verdict: "COLD"</b> — "The protagonist is analyzing the ritual's stakes and her own moral
  position rather than wanting Julian; the scene runs on introspection and procedural tension, not
  desire." Julian's own gravity share: 30% (highest of any entity, but registered as
  "PLOT_FIXATION"/curiosity, not attraction). This independently corroborates criterion 4's verdict
  above — Julian is present and notable, but not engaged with directly.
</div>

<h2>Scene 2 — full attempt-4 text, verbatim</h2>
${SCENE.beats.map(beatHtml).join('\n')}

</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
const desktopPath = path.join(os.homedir(), 'Desktop', 'First_Sacrifice_Scene2_Temptation_Attempt4_ReadThrough.pdf');
await page.pdf({ path: desktopPath, format: 'Letter', margin: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in' }, printBackground: true });
await browser.close();
console.log('PDF written to: ' + desktopPath);
