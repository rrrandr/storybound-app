// ══════════════════════════════════════════════════════════════════════════════════════════
// THE CONSOLIDATED BLOCKS, CHECKED ON THE CG PATH'S OWN REQUESTS.
//
// Reads the artifacts the zero-provider CG census writes (_cg_ground_truth_census.mjs, which
// launches First Sacrifice through the real Library → Read → baked OAS → Go click path with
// render_mode 'staged_story_mode' and no mode override, every /api/** stubbed) and applies the
// same consolidated-requirement assertions the literary harnesses apply.
//
// PRESENCE-CONDITIONAL BY DESIGN. CG legitimately does not receive every literary block — some
// are gated on storyMode === 'literary'. So for each block:
//   · anchor ABSENT  → reported as "not on this path". Not a failure, and not a silent pass:
//                      the report says which blocks CG never sees.
//   · anchor PRESENT → every requirement of that block must hold, and blocks that must be
//                      delivered once must appear exactly once. A missing point is a FAILURE.
// Retired wording is checked unconditionally: it must be absent whether the block ships or not.
//
// usage: node _nf_cg_consolidation_check.mjs
// ══════════════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';

const DIR = '/Users/romantsukerman/storybound-app/_cg_ground_truth_census_out';

// Each captured CG request, as the census names it. A request the run did not produce is
// reported as missing rather than skipped quietly.
const REQUESTS = [
  ['CG SCREENPLAY', ['cg_screenplay_system.txt', 'cg_screenplay_user.txt']],
  ['CG SCAFFOLD', ['cg_scaffold_full.json']],
  ['OAS DIALOGUE', ['oas_dialogue_system.txt', 'oas_dialogue_user.txt']],
  ['AUTHOR', ['author_full.json']],
  // The OAS Say/Do entrance routes the reader's first turn into _handleIntimacyTurn →
  // _authorFullScenePolicy, which issues ONE logical author request across three provider
  // tiers (app.js:5231 / 5266 / 5293). The census records them as undeclared and blocks them;
  // tier 0 is the request as assembled, so it is the one checked. Tiers 1 and 2 are the same
  // text on fallback transports and are checked too, which also proves they do not diverge.
  ['CG OAS AUTHOR — tier 0 (/api/proxy)', ['undeclared_0__api_proxy.txt']],
  ['CG OAS AUTHOR — tier 1 (/api/mistral-proxy)', ['undeclared_1__api_mistral_proxy.txt']],
  ['CG OAS AUTHOR — tier 2 (/api/chatgpt-proxy)', ['undeclared_2__api_chatgpt_proxy.txt']],
];

// [anchor, deliveredOnce, [[label, needle, min]]]
const BLOCKS = [
  ['E+ consolidated paragraph', 'ENVIRONMENT+ IS NOT SYMBOLISM, AND IT IS NOT A SUBJECT', true, [
    ['naming is not meaning', 'does not make it mean anything'],
    ['a spoon is usually a spoon', 'a spoon is usually a spoon'],
    ['all seven routes incl. CHANGES', 'WANTS, FEARS, REMEMBERS, USES, AVOIDS, CHOOSES or CHANGES'],
    ['history is one route only', 'a history with it is one route, never the requirement'],
    ['ordinary scale qualifies', 'Scale is irrelevant'],
    ['practical/social/habitual/funny', 'practical, social, habitual or funny as readily as grave'],
    ['do not manufacture', 'Do not manufacture one'],
    ['plain grounding stays valid', 'ground the scene plainly and move on'],
    ['the gate sentence', 'No relationship, no beat.'],
  ]],
  ['sensory canon', 'are FACTS, not omens', true, [
    ['mean-nothing clause', 'mean nothing by themselves'],
    ['recurrence rule', 'Full sensory beat on first appearance only'],
  ]],
  ['gesture availability rule', 'WHAT THE NARRATOR CAN ACTUALLY SEE (HARD)', true, [
    ['perception AND felt body', 'perceived from where she is, or felt in her own body'],
    ['feet as the invention tell', 'Feet are the tell of an author inventing detail'],
    ['neither banned nor licensed', 'not separately banned and not separately licensed'],
    ['defers to REFLEX TELLS', 'under REFLEX TELLS'],
  ]],
  ['clarity merge', 'CLARITY IS THE FLOOR, AND IT IS NOT NEGOTIABLE', true, [
    ['conclusion vs sentence', 'letting them draw the CONCLUSION'],
    ['the named shape', 'THE SHAPE TO WATCH FOR'],
    ['earns-its-place qualification', 'Occasionally one earns its place'],
    ['paraphrase test', 'THE PARAPHRASE TEST'],
  ]],
  ['Scene-1 ownership merge', 'OWNERSHIP AND ORDER.', true, [
    ['inputs not substrate', 'are INPUTS to the scene, never its substrate'],
    ['wrong order with its symptom', 'finally surfaces in paragraph 6 or 7'],
    ['correct order', 'present in the room of her mind from the FIRST paragraphs'],
    ['reader test ✓', 'Unfortunately, the plot is attached to him'],
    ['bulk requirement', "must occupy the paragraph's BULK"],
    ['person not information', 'as a PERSON in her mind, not as INFORMATION about him'],
    ['decorative vs load-bearing', 'are LOAD-BEARING, and the scene needs those'],
  ]],
  ['asymmetry merge', 'ASYMMETRY ENFORCEMENT (HARD', true, [
    ['three axes', 'INTERPRETATION of the situation'],
    ['same-thing prohibition folded in', 'never want the same thing in the same way or read the situation identically'],
    ['simultaneous resolution still barred', 'must also NOT resolve tension simultaneously'],
    ['same-beat detection', 'IN THE SAME BEAT'],
    ['pull-as-engine failure', 'the pull functioning as an ENGINE'],
  ]],
  ['withheld-core lens', 'WITHHELD CORE — ', true, []],
  ['shared fusion demonstration', 'I kept my eyes on a mated pair of Veilwood trees', true, [
    ['its WHY IT WORKS', 'reveal the OBSERVER — in the same description, not after it'],
    ['its do-not-copy caution', 'A LABELLED DEMONSTRATION OF THE TECHNIQUE'],
  ]],
  ['restriction caveat', 'ON ANY RESTRICTION ABOVE WITH NO STRUCTURED BOUNDS', true, []],
];

// Retired wording — absent whether or not its block ships on this path.
const RETIRED = [
  ['E+ heading: AND DO NOT MANUFACTURE IT', 'AND DO NOT MANUFACTURE IT'],
  ['E+ heading: ANCIENT, MAGICAL, OR TRAGIC', 'IT DOES NOT HAVE TO BE ANCIENT, MAGICAL, OR TRAGIC'],
  ['E+ heading: RELATIONSHIP NOT SYMBOLIC', 'THE RELATIONSHIP DOES NOT HAVE TO BE SYMBOLIC'],
  ['ownership heading: ORDER OF OPERATIONS', 'ORDER OF OPERATIONS'],
  ['ownership heading: THE READER TEST', 'THE READER TEST'],
  ['ownership heading: TAIL-PIVOT', 'TAIL-PIVOT IS NOT OWNERSHIP'],
  ['ownership heading: MICRO-SCENE vs EXPOSITION', 'MICRO-SCENE vs EXPOSITION'],
  ['old 80/20 weighting claim', 'the 80/20 relationship-weighting applies'],
  ['old restriction caveat', 'ANY LIMIT STATED IN THE REASON BELOW STILL APPLIES'],
  ['stale anchors pointer', 'sensory anchors listed below'],
  ['fusion fallback alongside the shared bank', 'MORE FUSED, since this is the form to reach for'],
];

const P = console.log;
const fails = [];
let anyRequest = false;

// ── STALE ARTIFACTS ARE REFUSED (2026-10-28) ──
// The census output directory survives failed runs. After the entrance-affordance change the
// run aborted before making any CG request, leaving Sep-16 files in place that would have read
// as current CG coverage. Any artifact older than public/app.js cannot reflect the source being
// checked, so it is a hard failure rather than a silent pass.
const APP_MTIME = fs.statSync('/Users/romantsukerman/storybound-app/public/app.js').mtimeMs;
function freshOrFail(file) {
  const p = DIR + '/' + file;
  if (!fs.existsSync(p)) return false;
  if (fs.statSync(p).mtimeMs < APP_MTIME) {
    fails.push(`STALE ARTIFACT: ${file} predates public/app.js — re-run the CG census`);
    return false;
  }
  return true;
}

P('CONSOLIDATED BLOCKS ON THE CG PATH (staged_story_mode, zero provider)');
if (!fs.existsSync(DIR)) {
  P('\n  the CG census has not produced ' + DIR);
  P('  run: node _cg_ground_truth_census.mjs');
  process.exitCode = 1;
} else {
  for (const [name, files] of REQUESTS) {
    const parts = files.filter(freshOrFail).map((f) => fs.readFileSync(DIR + '/' + f, 'utf-8'));
    if (!parts.length) { P(`\n${name}: NOT CAPTURED by a current run`); continue; }
    anyRequest = true;
    const t = parts.join('\n');
    const n = (s) => t.split(s).length - 1;
    P(`\n${name}  (${t.length.toLocaleString()} chars)`);

    for (const [block, anchor, once, points] of BLOCKS) {
      const c = n(anchor);
      if (!c) { P(`  ·  ${block} — not on this path`); continue; }
      let bad = 0;
      if (once && c !== 1) { bad++; fails.push(`${name} :: ${block} delivered ${c}x, expected once`); }
      for (const [label, needle] of points) {
        if (!n(needle)) { bad++; fails.push(`${name} :: ${block} — missing requirement: ${label}`); }
      }
      P(`  ${bad ? '✗' : '✓'}  ${block} — delivered ${c}x, ${points.length} requirement(s) checked`
        + (bad ? `, ${bad} FAILED` : ''));
    }

    const retiredHits = RETIRED.filter(([, needle]) => n(needle));
    if (retiredHits.length) {
      retiredHits.forEach(([label]) => fails.push(`${name} :: retired wording still delivered: ${label}`));
      P(`  ✗  retired wording present: ${retiredHits.map(([l]) => l).join('; ')}`);
    } else {
      P(`  ✓  none of the ${RETIRED.length} retired wordings present`);
    }
  }
  if (!anyRequest) { fails.push('the census captured no CG request at all'); }
}

P('\n  NOT established by this harness: that CG prose is good, that the CG deck renders, or');
P('  that live planning picks the right cast. It establishes which consolidated instruction');
P('  blocks reach the CG caller, and that each one that does is intact and delivered once.');

if (fails.length) {
  P('\n  ' + fails.length + ' FAILURE(S):');
  fails.forEach((f) => P('    ✗ ' + f));
  process.exitCode = 1;
} else if (anyRequest) {
  P('\n  ALL CG CONSOLIDATION CHECKS PASSED.');
}
