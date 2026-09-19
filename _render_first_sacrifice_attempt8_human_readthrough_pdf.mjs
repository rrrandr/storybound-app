#!/usr/bin/env node
// FIRST SACRIFICE — Attempt 8, HUMAN READ-THROUGH, PDF (Roman, 2026-09-20)
//
// Renders the final, twice-repaired Attempt 8 candidate (07_final_draft_after_pass2.json) plus a
// genuine human craft read-through (not a re-run of the mechanical validator) to a styled PDF on
// the Desktop — same technique already used this session for the storyboard/side-by-side PDFs
// (Playwright headless Chromium, print-to-PDF). NO provider/image call. Attempt 8 is
// validator-pass / unshipped: the validator certifies mechanical and canon compliance only, never
// prose quality — this read-through is the quality pass the validator cannot do.
//
// usage: node _render_first_sacrifice_attempt8_human_readthrough_pdf.mjs
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_first_sacrifice_draft_v7_attempt8_full_package');
const artifact = JSON.parse(fs.readFileSync(path.join(OUT_DIR, '07_final_draft_after_pass2.json'), 'utf8'));
const draft = artifact.draft;
const validation = JSON.parse(fs.readFileSync(path.join(OUT_DIR, '03_validation_result.json'), 'utf8'));

function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function wc(t) { return t.trim().split(/\s+/).filter(Boolean).length; }

const beats = draft.scene1Candidate.beats;
const totalWords = beats.reduce((n, b) => n + wc(b.text), 0);

// ── HUMAN READ-THROUGH FINDINGS (Roman's request, 2026-09-20) — genuine craft assessment, not a
// re-statement of the mechanical validator. The validator has already confirmed structural/canon
// compliance (130/130 own tests, real Attempt 8 result: validator-pass); none of that is repeated
// here as a quality claim. ──
const FINDINGS = [
  {
    severity: 'Real defect — recommend fixing before this candidate is used',
    title: 'Beat 10 duplicates Beat 9 and drops its required content',
    body: 'Beats 9 and 10 now say almost the same thing in different words: both describe Seren beginning the invocation in a "measured cadence," fear under Lirael\'s ribs receding, the "clearing remained... dawn light and grass," and Lirael breathing "behind the band." This is real, close paraphrase, not two distinct beats. It also loses real content: before the second bounded repair pass (which shrank Beat 10 from 99 words to fit the ceiling), Beat 10 described the wish beginning to curve and misalign — the actual moment this slot exists for ("Free interiority beat — Lirael\'s private state in the moment just before the wish bends," per the locked beat template). The repair pass\'s rewrite is mechanically compliant (right length, right image, right kind, no banned phrase, no exemplar match) but narratively regressed: it replaced load-bearing content with a redundant restatement. This is exactly the class of defect the validator cannot see — it only checks word counts, structure, and canon, never whether a beat says something new. Beat 10 has no mandatory required-content-beat id (it is a "free" interiority slot), so nothing is structurally missing from scene1Coverage — but the scene reads noticeably worse here, with two adjacent beats that add nothing to each other.',
  },
  {
    severity: 'Working well',
    title: 'The other seven repaired (shrink-to-midpoint) beats read cleanly',
    body: 'Beats 1, 2, 3, 6, 7, 8, and 13 were also rewritten by the second repair pass (all had overshot the 90-word ceiling) and, unlike Beat 10, all read as genuine compressions of the same content — tighter prose, same sensory beats, same information, no loss and no padding. Craft-wise these are a net improvement over their pre-repair versions: shorter sentences, less throat-clearing, same grounded physical detail (the sash, the mouth-band, Julian\'s stillness, the scorch line).',
  },
  {
    severity: 'Working well',
    title: 'The four expand-to-midpoint beats (pass 1) read as real content, not padding',
    body: 'Beats 5, 11, 18, and 19 (the Dohkar\'s call for the cost, Seren\'s spoken wish, Julian\'s stated intent to question Lirael, and the physical handoff of The Answer) were expanded by the first repair pass. All four now carry real, specific content rather than generic filler — Seren\'s wish line in particular does real double duty, both delivering the required in-world wish text and giving Lirael a clean, earned moment of recognizing Seren\'s performed virtue.',
  },
  {
    severity: 'Note, not a defect',
    title: 'oasOpening carries a real, disclosed similarity to a withheld historical exemplar',
    body: 'oasOpening (\"...hoping I would step forward and claim you as the one who needed rescue?\") shares a 6-word run with a withheld, never-rendered historical exemplar. This is recorded as a non-blocking diagnostic, not a violation — the \"rescue\" framing is independently and explicitly required by this packet\'s own opening_frame_brief, so the resemblance is expected, not copied. On a craft read, the line itself works: concrete observed behavior (the touched shoulder, the exchanged look), a real question, and Julian\'s predatory-confident register land as intended.',
  },
  {
    severity: 'Working well',
    title: 'Overall voice and pacing',
    body: 'First-person past tense holds consistently across all 20 beats with no POV breaks. The physical throughline (sash, mouth-band, the scorch line, The Answer\'s weight) gives the scene a coherent sensory spine. The escalation from ceremony to twist to public charge to Julian\'s intervention reads at a reasonable pace for a ~1,470-word scene. Dialogue beats are appropriately terse against the narration around them.',
  },
];

function findingsHtml() {
  return FINDINGS.map(f => `<div class="finding ${f.severity.startsWith('Real defect') ? 'sev-defect' : f.severity.startsWith('Working') ? 'sev-good' : 'sev-note'}">
    <div class="finding-sev">${esc(f.severity)}</div>
    <div class="finding-title">${esc(f.title)}</div>
    <div class="finding-body">${esc(f.body)}</div>
  </div>`).join('\n');
}

function beatHtml(b, i) {
  const n = i + 1;
  const words = wc(b.text);
  const flagged = n === 10;
  return `<div class="beat${flagged ? ' beat-flagged' : ''}">
    <div class="beat-meta">Beat ${n}${flagged ? ' — see finding above' : ''} · ${esc(b.kind)} · image=${esc(b.image)} · ${words}w</div>
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
  .finding.sev-defect { border-left-color: #b03030; background: #fdf3f3; }
  .finding.sev-good { border-left-color: #2e7d32; background: #f3f9f3; }
  .finding.sev-note { border-left-color: #b8860b; background: #fbf7ec; }
  .finding-sev { font-family: Menlo, monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #555; margin-bottom: 3px; }
  .finding-title { font-weight: bold; font-size: 14px; margin-bottom: 5px; }
  .finding-body { font-size: 12.5px; color: #333; }
  .beat { margin: 10px 0; padding: 10px 14px; border-left: 3px solid #ddd; }
  .beat-flagged { border-left: 3px solid #b03030; background: #fdf3f3; }
  .beat-meta { font-family: Menlo, monospace; font-size: 10px; color: #888; margin-bottom: 4px; }
  .speaker { font-weight: bold; font-size: 12.5px; margin-bottom: 2px; }
  .beat-text { font-size: 13px; }
  .oas-block { margin: 16px 0; padding: 12px 16px; background: #f0f0f7; border-left: 3px solid #6a6a9a; }
  .oas-label { font-family: Menlo, monospace; font-size: 10px; color: #555; margin-bottom: 4px; }
</style></head><body>
<h1>First Sacrifice — Scene 1 Candidate, Attempt 8</h1>
<div class="subtitle">Human craft read-through · ${esc(artifact.generated_at)} · packet ${esc(artifact.packet_version)}</div>

<div class="status-box">
  <b>Status: validator-pass / unshipped.</b> The mechanical validator confirms structural and canon compliance (20 beats, correct image order, provenance, object-fidelity, required-beat coverage, word-count floor/ceiling per slot) — it does <b>not</b> certify that the prose is good. This document is that separate, human read.<br><br>
  Total: ${totalWords} words across 20 beats. ${esc(validation.repairPassesRun)}/2 bounded repair passes were used (both now exhausted for this attempt) — final outcome: ${esc(validation.repairOutcome)}. ${(validation.finalValidation.diagnostics && validation.finalValidation.diagnostics.length) ? 'Non-blocking diagnostic on file: ' + esc(validation.finalValidation.diagnostics[0].rule) + ' (see finding below — expected, not evidence of copying).' : ''} Not written to starter-scenes.js; not shipped anywhere.
</div>

<h2>Read-through findings</h2>
${findingsHtml()}

<h2>Scene 1 — full candidate text</h2>
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
const desktopPath = path.join(os.homedir(), 'Desktop', 'First_Sacrifice_Attempt8_HumanReadThrough.pdf');
await page.pdf({ path: desktopPath, format: 'Letter', margin: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in' }, printBackground: true });
await browser.close();
console.log('PDF written to: ' + desktopPath);
