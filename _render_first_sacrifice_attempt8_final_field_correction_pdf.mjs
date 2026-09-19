#!/usr/bin/env node
// FIRST SACRIFICE — Attempt 8, FINAL THREE-FIELD CORRECTION, HUMAN READ-THROUGH, PDF
// (Roman, 2026-09-20 — auto-rendered per established standing instruction, no confirmation gate)
//
// Renders 13_final_field_correction.json (beat13/beat20/postInterruptionBeat surgically corrected,
// validation.ok === true) to a NEW, separate PDF — never overwrites any prior PDF or historical
// artifact. Same technique as the earlier Attempt 8 PDFs (Playwright headless Chromium, print-to-PDF
// to Desktop). NO provider/image call.
//
// usage: node _render_first_sacrifice_attempt8_final_field_correction_pdf.mjs
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_first_sacrifice_draft_v7_attempt8_full_package');
const artifact = JSON.parse(fs.readFileSync(path.join(OUT_DIR, '13_final_field_correction.json'), 'utf8'));
const draft = artifact.draft;
const validation = artifact.validation;

function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function wc(t) { return t.trim().split(/\s+/).filter(Boolean).length; }

const beats = draft.scene1Candidate.beats;
const totalWords = beats.reduce((n, b) => n + wc(b.text), 0);
const pacingDiagnostics = new Map((validation.diagnostics || []).filter(d => d.rule === 'narration_beat_pacing_long').map(d => {
  const m = d.detail.match(/beats\[(\d+)\] is (\d+) words/);
  return [Number(m[1]), Number(m[2])];
}));
const CORRECTED_BEAT_IDXS = new Set([12, 19]); // beat13, beat20 (0-indexed)

const FINDINGS = [
  {
    severity: 'Resolved',
    title: 'Continuity gap closed: postInterruptionBeat and beat 20 no longer carry the scorch-line callback',
    body: 'The prior corrected candidate (09_wish_twist_content_correction.json) still carried forward "the line of scorched grass" (postInterruptionBeat) and "the scorch line still visible in the grass" (beat 20) — the same banned attack-grammar/damage-residue vocabulary the 3 directly-depicting beats had already been corrected to avoid, just relocated to fields the earlier pass never scanned. Both are now replaced with neutral references to the moment/rite, with no other content changed.',
  },
  {
    severity: 'Resolved',
    title: 'Beat 13 causal-specificity: the wish\'s own object is now legible, and the danger is correctly attributed',
    body: 'The prior text ("...the loss Seren had named was already searching for a new anchor...") was abstract and misattributed the risk to Seren\'s own sacrificed memory relocating. The corrected beat now names that the rite is answering "the finding of the one I had lost" (the wish\'s deliberately-unnamed object) and states the danger explicitly: the fulfillment risks arriving "twisted by her need to be seen as the one who had given enough" — Seren\'s self-serving desire, not Seren\'s own loss, is what threatens to distort the outcome.',
  },
  {
    severity: 'Working well (unchanged from prior read-throughs)',
    title: 'Everything else in the scene is untouched by this pass',
    body: 'Only beat 13, beat 20, and postInterruptionBeat were replaced. Beats 1-12 and 14-19, oasOpening, scene1Coverage, and every other field are byte-identical to the prior corrected candidate.',
  },
];

function findingsHtml() {
  return FINDINGS.map(f => `<div class="finding sev-good">
    <div class="finding-sev">${esc(f.severity)}</div>
    <div class="finding-title">${esc(f.title)}</div>
    <div class="finding-body">${esc(f.body)}</div>
  </div>`).join('\n');
}

function beatHtml(b, i) {
  const n = i + 1;
  const words = wc(b.text);
  const longNote = pacingDiagnostics.has(i);
  const corrected = CORRECTED_BEAT_IDXS.has(i);
  return `<div class="beat${longNote ? ' beat-long' : ''}${corrected ? ' beat-corrected' : ''}">
    <div class="beat-meta">Beat ${n} · ${esc(b.kind)} · image=${esc(b.image)} · ${words}w${longNote ? ' · pacing note (non-blocking)' : ''}${corrected ? ' · CORRECTED THIS PASS' : ''}</div>
    ${b.speaker ? `<div class="speaker">${esc(b.speaker)}</div>` : ''}
    <div class="beat-text">${esc(b.text)}</div>
  </div>`;
}

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; line-height: 1.6; max-width: 760px; margin: 0 auto; padding: 40px; }
  h1 { font-size: 22px; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 6px; }
  .subtitle { font-size: 13px; color: #555; margin-bottom: 24px; font-family: Menlo, monospace; }
  h2 { font-size: 17px; margin-top: 32px; border-bottom: 1px solid #ccc; padding-bottom: 5px; color: #222; }
  .status-box { background: #f3f9f3; border-left: 4px solid #2e7d32; padding: 12px 16px; margin: 16px 0; font-size: 13px; }
  .status-box b { color: #000; }
  .finding { margin: 14px 0; padding: 12px 16px; border-radius: 4px; border-left: 4px solid #999; background: #fafafa; }
  .finding.sev-good { border-left-color: #2e7d32; background: #f3f9f3; }
  .finding-sev { font-family: Menlo, monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #555; margin-bottom: 3px; }
  .finding-title { font-weight: bold; font-size: 14px; margin-bottom: 5px; }
  .finding-body { font-size: 12.5px; color: #333; }
  .beat { margin: 10px 0; padding: 10px 14px; border-left: 3px solid #ddd; }
  .beat-long { border-left: 3px solid #b8860b; background: #fbf9f3; }
  .beat-corrected { border-left: 3px solid #2e7d32; background: #f3f9f3; }
  .beat-meta { font-family: Menlo, monospace; font-size: 10px; color: #888; margin-bottom: 4px; }
  .speaker { font-weight: bold; font-size: 12.5px; margin-bottom: 2px; }
  .beat-text { font-size: 13px; }
  .oas-block { margin: 16px 0; padding: 12px 16px; background: #f0f0f7; border-left: 3px solid #6a6a9a; }
  .oas-block.corrected { background: #f3f9f3; border-left: 3px solid #2e7d32; }
  .oas-label { font-family: Menlo, monospace; font-size: 10px; color: #555; margin-bottom: 4px; }
</style></head><body>
<h1>First Sacrifice — Scene 1 Candidate, Attempt 8 (Final Field-Corrected)</h1>
<div class="subtitle">Human craft read-through, auto-rendered · ${esc(artifact.generated_at)} · packet ${esc(artifact.packet_version)}</div>

<div class="status-box">
  <b>Status: ${validation.ok ? 'VALIDATOR-PASS (validation.ok === true)' : 'NOT ELIGIBLE'}.</b> The mechanical validator confirms structural, canon, continuity, and causal-specificity compliance across every field, including postInterruptionBeat and beat 20 — it does not certify prose quality; final approval remains a human read.<br><br>
  Total: ${totalWords} words across 20 beats. Corrected fields this pass: ${esc((artifact.corrected_fields || []).join(', '))}. Real correction cost: $${esc(artifact.generated_by && artifact.generated_by.real_cost_usd)}. Not written to starter-scenes.js; not shipped anywhere.
</div>

<h2>Read-through findings</h2>
${findingsHtml()}

<h2>Scene 1 — full corrected candidate text</h2>
${beats.map(beatHtml).join('\n')}

<div class="oas-block">
  <div class="oas-label">oasOpening (unchanged by this pass)</div>
  <b>${esc(draft.oasOpening.speaker)}:</b> ${esc(draft.oasOpening.text)}
</div>

<div class="oas-block corrected">
  <div class="oas-label">postInterruptionBeat — CORRECTED THIS PASS</div>
  ${esc(draft.postInterruptionBeat.text)}
</div>

</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
const desktopPath = path.join(os.homedir(), 'Desktop', 'First_Sacrifice_Attempt8_FinalFieldCorrection_HumanReadThrough.pdf');
await page.pdf({ path: desktopPath, format: 'Letter', margin: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in' }, printBackground: true });
await browser.close();
console.log('PDF written to: ' + desktopPath);
