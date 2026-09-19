#!/usr/bin/env node
// FIRST SACRIFICE — Attempt 8, CORRECTED CANDIDATE, HUMAN READ-THROUGH, PDF (Roman, 2026-09-20)
//
// Renders 08_corrected_candidate_from_pass1.json (the post-pass-1 state, re-validated under the
// reversed density policy — shrink-to-midpoint repair removed) plus an updated human craft
// read-through. Same technique as the prior Attempt 8 PDF (Playwright headless Chromium,
// print-to-PDF to Desktop) — writes to a NEW file, never overwrites the prior PDF or any historical
// artifact. NO provider/image call.
//
// usage: node _render_first_sacrifice_attempt8_corrected_candidate_pdf.mjs
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_first_sacrifice_draft_v7_attempt8_full_package');
const artifact = JSON.parse(fs.readFileSync(path.join(OUT_DIR, '08_corrected_candidate_from_pass1.json'), 'utf8'));
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

const FINDINGS = [
  {
    severity: 'Resolved — this candidate corrects the prior regression',
    title: 'Beat 10 now retains its real, distinct causal content',
    body: 'This is the post-pass-1 state: pass 1 (the real, genuine expansion of Slots 5, 11, 18, 19) never touched Beat 10, and the shrink-to-midpoint repair that later duplicated it is now removed from the pipeline. Beat 10 reads again as its own moment — Seren\'s wish beginning to curve and misalign toward Lirael, at 99 words — distinct from Beat 9\'s invocation-opening content, with no overlap. This is the beat the prior read-through flagged as a real defect; that defect no longer exists in this candidate.',
  },
  {
    severity: 'Working well',
    title: 'The 8 beats previously shrunk are back to their original, richer form',
    body: 'Beats 1, 2, 3, 6, 7, 8, 10, and 13 are Grok\'s original prose, never mechanically compressed. Re-reading them here: concrete, specific, no padding — "the weight of that fact settled behind my breastbone like a second pulse" (Beat 1), the particular timbre of a shared lullaby (Beat 6), Julian\'s stillness making "every other movement in the clearing feel slightly louder by comparison" (Beat 7). All of these run over the 90-word pacing guideline (marked inline below) but read as earned length, not bloat — nothing here is a defect.',
  },
  {
    severity: 'Note, not a defect',
    title: 'Pacing diagnostics are informational only',
    body: 'The 8 beats above are flagged inline as a non-blocking pacing note (real word count shown). This is a human-review signal, not a validator failure — it never blocked this candidate and never will.',
  },
  {
    severity: 'Working well',
    title: 'The four expand-to-midpoint beats (pass 1) still read as real content',
    body: 'Beats 5, 11, 18, and 19 — the Dohkar\'s call for the cost, Seren\'s spoken wish, Julian\'s stated intent to question Lirael, and the physical handoff of The Answer — were genuinely expanded by pass 1 and still carry real, specific content rather than filler. Unaffected by this correction.',
  },
  {
    severity: 'Note, not a defect',
    title: 'oasOpening carries a real, disclosed similarity to a withheld historical exemplar',
    body: 'Unchanged from the prior read-through: oasOpening (\"...hoping I would step forward and claim you as the one who needed rescue?\") shares a 6-word run with a withheld, never-rendered historical exemplar. Recorded as a non-blocking diagnostic — the \"rescue\" framing is independently required by this packet\'s own opening_frame_brief, so the resemblance is expected, not copied. The line itself reads well on its own terms.',
  },
];

function findingsHtml() {
  return FINDINGS.map(f => `<div class="finding ${f.severity.startsWith('Resolved') ? 'sev-good' : f.severity.startsWith('Working') ? 'sev-good' : 'sev-note'}">
    <div class="finding-sev">${esc(f.severity)}</div>
    <div class="finding-title">${esc(f.title)}</div>
    <div class="finding-body">${esc(f.body)}</div>
  </div>`).join('\n');
}

function beatHtml(b, i) {
  const n = i + 1;
  const words = wc(b.text);
  const longNote = pacingDiagnostics.has(i);
  return `<div class="beat${longNote ? ' beat-long' : ''}">
    <div class="beat-meta">Beat ${n} · ${esc(b.kind)} · image=${esc(b.image)} · ${words}w${longNote ? ' · pacing note: over 90w guideline (non-blocking)' : ''}</div>
    ${b.speaker ? `<div class="speaker">${esc(b.speaker)}</div>` : ''}
    <div class="beat-text">${esc(b.text)}</div>
  </div>`;
}

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; line-height: 1.6; max-width: 760px; margin: 0 auto; padding: 40px; }
  h1 { font-size: 22px; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 6px; }
  .subtitle { font-size: 13px; color: #555; margin-bottom: 24px; font-family: Menlo, monospace; }
  h2 { font-size: 17px; margin-top: 32px; border-bottom: 1px solid #ccc; padding-bottom: 5px; color: #222; }
  .status-box { background: #f7f5f0; border-left: 4px solid #666; padding: 12px 16px; margin: 16px 0; font-size: 13px; }
  .status-box b { color: #000; }
  .finding { margin: 14px 0; padding: 12px 16px; border-radius: 4px; border-left: 4px solid #999; background: #fafafa; }
  .finding.sev-good { border-left-color: #2e7d32; background: #f3f9f3; }
  .finding.sev-note { border-left-color: #b8860b; background: #fbf7ec; }
  .finding-sev { font-family: Menlo, monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #555; margin-bottom: 3px; }
  .finding-title { font-weight: bold; font-size: 14px; margin-bottom: 5px; }
  .finding-body { font-size: 12.5px; color: #333; }
  .beat { margin: 10px 0; padding: 10px 14px; border-left: 3px solid #ddd; }
  .beat-long { border-left: 3px solid #b8860b; background: #fbf9f3; }
  .beat-meta { font-family: Menlo, monospace; font-size: 10px; color: #888; margin-bottom: 4px; }
  .speaker { font-weight: bold; font-size: 12.5px; margin-bottom: 2px; }
  .beat-text { font-size: 13px; }
  .oas-block { margin: 16px 0; padding: 12px 16px; background: #f0f0f7; border-left: 3px solid #6a6a9a; }
  .oas-label { font-family: Menlo, monospace; font-size: 10px; color: #555; margin-bottom: 4px; }
</style></head><body>
<h1>First Sacrifice — Scene 1 Candidate, Attempt 8 (Corrected)</h1>
<div class="subtitle">Human craft read-through, updated · ${esc(artifact.generated_at)} · packet ${esc(artifact.packet_version)}</div>

<div class="status-box">
  <b>Status: validator-pass / unshipped.</b> This is the CORRECTED candidate — derived from the real post-pass-1 state after the shrink-to-midpoint repair pass was reversed for causing a real content regression (see the prior read-through PDF for that finding). The validator confirms structural and canon compliance; it does not certify prose quality — this document is that separate, human read.<br><br>
  Total: ${totalWords} words across 20 beats. Validator result: ${validation.ok ? '✅ ELIGIBLE (validation.ok === true)' : '❌ NOT ELIGIBLE'}. ${(validation.diagnostics && validation.diagnostics.length) ? validation.diagnostics.length + ' non-blocking diagnostics on file (pacing notes + one exemplar-similarity note — see below).' : ''} Not written to starter-scenes.js; not shipped anywhere.
</div>

<h2>Read-through findings</h2>
${findingsHtml()}

<h2>Scene 1 — full corrected candidate text</h2>
${beats.map(beatHtml).join('\n')}

<div class="oas-block">
  <div class="oas-label">oasOpening (Julian's authored opening line — live exchange follows, not rendered here)</div>
  <b>${esc(draft.oasOpening.speaker)}:</b> ${esc(draft.oasOpening.text)}
</div>

<div class="oas-block">
  <div class="oas-label">postInterruptionBeat (after the fixed interruption tail — crystallizes, does not decide)</div>
  ${esc(draft.postInterruptionBeat.text)}
</div>

</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
const desktopPath = path.join(os.homedir(), 'Desktop', 'First_Sacrifice_Attempt8_CorrectedCandidate_HumanReadThrough.pdf');
await page.pdf({ path: desktopPath, format: 'Letter', margin: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in' }, printBackground: true });
await browser.close();
console.log('PDF written to: ' + desktopPath);
