// LABEL-COVERAGE TRACE — read-only. No model call, no page, no code change, no fix.
//
// The question is NOT "can CG validate speakers?" It is whether a validated speaker identity is
// AVAILABLE TO THE EXTRACTOR when it evaluates accepted prose. The extractor's context
// (_tfoBuildExtractionContext) carries exactly two channels: `prose` as a FLAT STRING, and
// `rosterNames`. There is no beat array, no panel structure, no per-line attribution. So the only
// way a speaker identity can reach the extractor is the "Name: " prefix that _extractCGSceneText
// writes — and that branch is gated on `beat.dialogue`.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = '/Users/romantsukerman/storybound-app';
const LOSS = [/no memory of/i, /no recollection of/i, /does not remember/i, /cannot remember/i,
  /has forgotten/i, /don't remember/i, /have no memory of/i];
const RETAIN = [/\bremembers\b/i, /\brecalls\b/i, /still knows/i, /has not forgotten/i, /\bI remember\b/i, /\bI recall\b/i];

// EXACT mirror of public/app.js:_extractCGSceneText — the production reader-facing text builder.
function flattenAsProduction(plan) {
  const parts = [];
  (plan.beats || []).forEach((b) => {
    if (!b) return;
    const t = (typeof b.text === 'string' && b.text.trim()) ? b.text.trim()
      : (typeof b.captionText === 'string' && b.captionText.trim()) ? b.captionText.trim()
      : (typeof b.caption === 'string' && b.caption.trim()) ? b.caption.trim() : '';
    if (t) parts.push({ via: 'text', text: t });
    if (typeof b.dialogue === 'string' && b.dialogue.trim()) {
      const sp = (typeof b.speaker === 'string' && b.speaker.trim()) ? b.speaker.trim() : '';
      parts.push({ via: 'dialogue', speaker: sp, text: b.dialogue.trim() });
    }
  });
  return parts;
}

function findPlans() {
  const out = [];
  const walk = (dir, depth) => {
    if (depth > 3) return;
    let ents = []; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
    for (const e of ents) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== '.git') walk(full, depth + 1); continue; }
      if (!/\.(json|txt)$/.test(e.name)) continue;
      if (fs.statSync(full).size > 2_000_000) continue;
      let j; try { j = JSON.parse(fs.readFileSync(full, 'utf8')); } catch (_) { continue; }
      for (const p of [j, j && j.plan]) {
        if (p && Array.isArray(p.beats) && p.beats.length
          && p.beats.some((b) => b && (b.text || b.dialogue || b.caption || b.captionText))) {
          out.push({ file: path.relative(ROOT, full), plan: p });
        }
      }
    }
  };
  walk(path.join(ROOT, '_tempt_fate_fixtures'), 0);
  return out;
}

const T = { scenes: 0, dlgBeats: 0, dlgWithSpeaker: 0, labelReaching: 0, labelDropped: 0,
  narrParts: 0, narrQuoted: 0, lossAssert: 0, retainAssert: 0 };
console.log('=== 1-3. LABEL COVERAGE ACROSS RETAINED ACCEPTED SCENES ===\n');

for (const { file, plan } of findPlans()) {
  const beats = plan.beats || [];
  // Upstream truth: what the PLAN knows.
  const dlg = beats.filter((b) => b && b.kind === 'dialogue');
  const dlgSpk = dlg.filter((b) => typeof b.speaker === 'string' && b.speaker.trim());
  const dlgHasDialogueField = dlg.filter((b) => typeof b.dialogue === 'string' && b.dialogue.trim());
  // Downstream reality: what the EXTRACTOR gets.
  const parts = flattenAsProduction(plan);
  const reaching = parts.filter((p) => p.via === 'dialogue' && p.speaker);
  const narr = parts.filter((p) => p.via === 'text');
  const narrQuoted = narr.filter((p) => p.text.includes('"'));
  const lossA = narr.filter((p) => LOSS.some((r) => r.test(p.text)));
  const retA = narr.filter((p) => RETAIN.some((r) => r.test(p.text)));
  const dropped = dlgSpk.length - reaching.length;

  T.scenes++; T.dlgBeats += dlg.length; T.dlgWithSpeaker += dlgSpk.length;
  T.labelReaching += reaching.length; T.labelDropped += Math.max(0, dropped);
  T.narrParts += narr.length; T.narrQuoted += narrQuoted.length;
  T.lossAssert += lossA.length; T.retainAssert += retA.length;

  console.log(file);
  console.log('  PLAN (upstream)     : dialogue beats=' + dlg.length
    + '  with a speaker=' + dlgSpk.length + '  with a .dialogue field=' + dlgHasDialogueField.length);
  console.log('  EXTRACTOR (context) : speech parts with a label=' + reaching.length
    + '   LABELS DROPPED=' + Math.max(0, dropped));
  console.log('  narration parts=' + narr.length + '  (of which contain quoted speech=' + narrQuoted.length + ')');
  console.log('  narrator assertions: loss-marker=' + lossA.length + '  retention-marker=' + retA.length);
  if (dlgSpk.length) console.log('  speakers the PLAN knows: ' + JSON.stringify([...new Set(dlgSpk.map((b) => b.speaker))]));
  lossA.forEach((p) => console.log('    LOSS  → ' + JSON.stringify(p.text)));
  retA.forEach((p) => console.log('    RETAIN→ ' + JSON.stringify(p.text)));
  console.log('');
}

console.log('='.repeat(96));
console.log('TOTALS ACROSS ' + T.scenes + ' RETAINED ACCEPTED SCENES');
console.log('  1. speech claims with an authoritative persisted speaker identity');
console.log('     AVAILABLE TO THE EXTRACTOR ........................ ' + T.labelReaching + ' / ' + T.dlgBeats);
console.log('  2. explicit narrator assertions naming party + proposition');
console.log('     (loss) ............................................ ' + T.lossAssert);
console.log('     (retention) ....................................... ' + T.retainAssert);
console.log('  3a. unlabelled speech reaching the extractor as quoted');
console.log('      narration (attributable only by adjacency) ....... ' + T.narrQuoted);
console.log('  3b. UPSTREAM METADATA ABSENT FROM EXTRACTOR CONTEXT:');
console.log('      dialogue beats whose speaker the PLAN knows ...... ' + T.dlgWithSpeaker);
console.log('      of those, labels DROPPED before the extractor .... ' + T.labelDropped);
