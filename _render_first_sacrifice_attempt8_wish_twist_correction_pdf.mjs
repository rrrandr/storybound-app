#!/usr/bin/env node
// FIRST SACRIFICE — Attempt 8, WISH-TWIST CONTENT CORRECTION, HUMAN READ-THROUGH, PDF
// (Roman, 2026-09-20 — auto-rendered per explicit standing instruction, no confirmation gate)
//
// Renders 09_wish_twist_content_correction.json (attack-grammar removed, then dry-audited for
// causal-chain specificity) to a NEW, separate PDF — never overwrites any prior PDF or historical
// artifact. Same technique as the earlier Attempt 8 PDFs (Playwright headless Chromium,
// print-to-PDF to Desktop). NO provider/image call.
//
// usage: node _render_first_sacrifice_attempt8_wish_twist_correction_pdf.mjs
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_first_sacrifice_draft_v7_attempt8_full_package');
const artifact = JSON.parse(fs.readFileSync(path.join(OUT_DIR, '09_wish_twist_content_correction.json'), 'utf8'));
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
const specificityFlags = new Set((validation.diagnostics || []).filter(d => d.rule === 'wish_twist_causal_specificity').map(d => {
  const m = d.detail.match(/beats\[(\d+)\]/);
  return Number(m[1]);
}));

const FINDINGS = [
  {
    severity: 'Resolved',
    title: 'Attack-grammar violations are gone (real validator: 0 remaining)',
    body: 'The 3 beats previously depicting a dark seam / scorch-mark residue (wish_visibly_twists, twist_unnaturally_arrested, public_charge) have been replaced. The real, corrected candidate now passes wish_twist_wrong_visual_grammar with zero violations. Content preserved: the wish redirecting toward Lirael, the unexplained cessation, the Dohkar\'s charge grounded in what the rite/assembly perceived rather than physical evidence.',
  },
  {
    severity: 'Open — non-blocking, flagged for review',
    title: 'Causal-chain specificity: the twist beat still reads as somewhat abstract',
    body: 'A dry audit (and the packet\'s own new wish_twist_causal_specificity diagnostic) finds Beat 13 ("A cold directionality opened beneath my ribs, as though the loss Seren had named was already searching for a new anchor...") does not clearly name the wish\'s own object ("the one she lost") or use explicit wrong/dangerous-fulfillment language — it reads more like Seren\'s own sacrificed memory searching for a new home than like the wish itself (finding Lirael\'s lost one) being at risk of a wrong or horrible fulfillment. This is now a mechanically-flagged, non-blocking diagnostic — not a validator failure, not a re-run requirement — and the packet\'s own requirement text has been strengthened accordingly for any future correction pass. It does not affect ELIGIBLE/NOT ELIGIBLE status.',
  },
  {
    severity: 'Working well',
    title: 'Twist-unnaturally-arrested and public-charge beats read cleanly',
    body: 'Beat 14 ("The pull vanished without transition or cause...") is a clean, atmospheric unexplained-arrest beat with no mechanism, no rescuer, nothing left behind. Beat 15\'s Dohkar line ("...the rite answered by turning its weight toward the one who must conduct it") grounds the charge in the rite\'s own response rather than forensic evidence, as required.',
  },
  {
    severity: 'Working well (unchanged from prior read-throughs)',
    title: 'The rest of the scene is unaffected by this pass',
    body: 'Only the 3 flagged beats were touched by this correction. Beat 10\'s wish-curving content, the 7 shrink-repaired beats\' richer original prose, the 4 expand-repaired beats, oasOpening, and postInterruptionBeat are all unchanged from the prior corrected-candidate read-through.',
  },
];

function findingsHtml() {
  return FINDINGS.map(f => `<div class="finding ${f.severity.startsWith('Resolved') || f.severity.startsWith('Working') ? 'sev-good' : 'sev-open'}">
    <div class="finding-sev">${esc(f.severity)}</div>
    <div class="finding-title">${esc(f.title)}</div>
    <div class="finding-body">${esc(f.body)}</div>
  </div>`).join('\n');
}

function beatHtml(b, i) {
  const n = i + 1;
  const words = wc(b.text);
  const longNote = pacingDiagnostics.has(i);
  const specNote = specificityFlags.has(i);
  return `<div class="beat${longNote ? ' beat-long' : ''}${specNote ? ' beat-spec' : ''}">
    <div class="beat-meta">Beat ${n} · ${esc(b.kind)} · image=${esc(b.image)} · ${words}w${longNote ? ' · pacing note (non-blocking)' : ''}${specNote ? ' · causal-specificity flag (non-blocking, see finding above)' : ''}</div>
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
  .finding.sev-open { border-left-color: #b8860b; background: #fbf7ec; }
  .finding-sev { font-family: Menlo, monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #555; margin-bottom: 3px; }
  .finding-title { font-weight: bold; font-size: 14px; margin-bottom: 5px; }
  .finding-body { font-size: 12.5px; color: #333; }
  .beat { margin: 10px 0; padding: 10px 14px; border-left: 3px solid #ddd; }
  .beat-long { border-left: 3px solid #b8860b; background: #fbf9f3; }
  .beat-spec { border-left: 3px solid #c0392b; background: #fdf3f2; }
  .beat-meta { font-family: Menlo, monospace; font-size: 10px; color: #888; margin-bottom: 4px; }
  .speaker { font-weight: bold; font-size: 12.5px; margin-bottom: 2px; }
  .beat-text { font-size: 13px; }
  .oas-block { margin: 16px 0; padding: 12px 16px; background: #f0f0f7; border-left: 3px solid #6a6a9a; }
  .oas-label { font-family: Menlo, monospace; font-size: 10px; color: #555; margin-bottom: 4px; }
</style></head><body>
<h1>First Sacrifice — Scene 1 Candidate, Attempt 8 (Wish-Twist Corrected)</h1>
<div class="subtitle">Human craft read-through, auto-rendered · ${esc(artifact.generated_at)} · packet ${esc(artifact.packet_version)}</div>

<div class="status-box">
  <b>Status: validator-pass / unshipped.</b> The mechanical validator confirms structural, canon, and attack-grammar compliance — it does not certify prose quality, and this candidate carries one open, non-blocking craft flag (causal specificity, see below) alongside its passing status.<br><br>
  Total: ${totalWords} words across 20 beats. Corrected slots: ${esc((artifact.corrected_slots || []).join(', '))}. Real correction cost: $${esc(artifact.generated_by && artifact.generated_by.real_cost_usd)}. Validator result: ${validation.ok ? '✅ ELIGIBLE (validation.ok === true)' : '❌ NOT ELIGIBLE'}. Not written to starter-scenes.js; not shipped anywhere.
</div>

<h2>Read-through findings</h2>
${findingsHtml()}

<h2>Scene 1 — full corrected candidate text</h2>
${beats.map(beatHtml).join('\n')}

<div class="oas-block">
  <div class="oas-label">oasOpening (unchanged by this pass)</div>
  <b>${esc(draft.oasOpening.speaker)}:</b> ${esc(draft.oasOpening.text)}
</div>

<div class="oas-block">
  <div class="oas-label">postInterruptionBeat (unchanged by this pass)</div>
  ${esc(draft.postInterruptionBeat.text)}
</div>

</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
const desktopPath = path.join(os.homedir(), 'Desktop', 'First_Sacrifice_Attempt8_WishTwistCorrection_HumanReadThrough.pdf');
await page.pdf({ path: desktopPath, format: 'Letter', margin: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in' }, printBackground: true });
await browser.close();
console.log('PDF written to: ' + desktopPath);
