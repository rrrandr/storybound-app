// ══════════════════════════════════════════════════════════════════════════════════════════
// CONTROLLED BEFORE/AFTER FOR THIS PROSE BATCH.
//
// Measures each EDITED BUILDER'S OWN OUTPUT with inputs frozen in this harness, against the
// same builder in git HEAD. Nothing is inferred from assembled-request sizes: those vary
// run-to-run with rotating exemplars and differ between stories, so they are not a saving.
//
//   _buildAttractionAnchorDirective  — ASYMMETRY ENFORCEMENT + STORY PULL CONSISTENCY merge
//   the Scene-1 OWNERSHIP block      — measured as delivered text, by extracting the literal
//                                      region between stable anchors from both versions and
//                                      substituting the SAME love-interest name in each.
//
// Every protected invariant in the touched regions is asserted on the AFTER text, so a saving
// that lost a requirement fails instead of reporting a number.
//
// usage: node _nf_prose_batch_controlled.mjs
// ══════════════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright-core';

const REPO = '/Users/romantsukerman/storybound-app';
const HEAD = execFileSync('git', ['-C', REPO, 'show', 'HEAD:public/app.js'], { maxBuffer: 1 << 30 }).toString();
const NOW = fs.readFileSync(REPO + '/public/app.js', 'utf-8');

// ── PART 1 — THE SCENE-1 OWNERSHIP BLOCK, AS DELIVERED TEXT ──
// The block lives inside a very large turn-prompt expression, so it is measured by extracting
// its source region between two anchors present in BOTH versions and reducing that region to
// the text an author receives: single-quoted literal contents concatenated, with every
// `state.loveInterestName || '…'` interpolation replaced by one fixed name in both arms.
const A_START = 'SCENE 1 OWNERSHIP + CAUSALITY';
const A_END = 'COGNITIVE INTERFERENCE TEST';
const NAME = 'Julian';

function deliveredRegion(src, label) {
  const i = src.indexOf(A_START), j = src.indexOf(A_END, i);
  if (i === -1 || j === -1) throw new Error(`anchors not found in ${label} (${i}/${j})`);
  const region = src.slice(src.lastIndexOf('\n', i), j);
  let text = '';
  for (const line of region.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('//')) continue;            // comments never ship
    // Every single-quoted literal on the line, unescaped, with interpolations as the name.
    const lits = t.match(/'(?:\\.|[^'\\])*'/g) || [];
    for (const lit of lits) {
      const body = lit.slice(1, -1);
      // A literal that IS the fallback inside an interpolation contributes the name instead.
      if (/^(the LI|The LI|LI|he|He)$/.test(body)) { continue; }
      text += body.replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
    }
    // One name substitution per `state.loveInterestName` occurrence on the line.
    const names = (t.match(/state\.loveInterestName/g) || []).length;
    text += NAME.repeat(names).replace(/Julian/g, 'Julian');
    if (names) text += '';
  }
  return text;
}

const beforeOwn = deliveredRegion(HEAD, 'HEAD');
const afterOwn = deliveredRegion(NOW, 'working tree');

// ── PART 2 — _buildAttractionAnchorDirective, RUN IN THE BROWSER WITH FROZEN STATE ──
// The builder reads window.state, so both arms are evaluated against the SAME frozen state in
// the same page: the HEAD version is recovered by extracting its source and evaluating it under
// a different name, so the two outputs differ only by this batch's edit.
function extractFn(src, name) {
  const at = src.indexOf('function ' + name);
  if (at === -1) throw new Error('fn not found: ' + name);
  let d = 0, started = false;
  for (let k = at; k < src.length; k++) {
    if (src[k] === '{') { d++; started = true; }
    else if (src[k] === '}') { d--; if (started && d === 0) return src.slice(at, k + 1); }
  }
  throw new Error('unbalanced: ' + name);
}

const FN = '_buildAttractionAnchorDirective';
const headFn = extractFn(HEAD, FN);
const nowFn = extractFn(NOW, FN);

// The builder reads a module-scope lookup table (app.js:43205). It is taken from each arm's own
// source so neither arm is evaluated against the other's data.
function extractVar(src, name) {
  const at = src.indexOf('var ' + name + ' = {');
  if (at === -1) throw new Error('var not found: ' + name);
  let d = 0, started = false;
  for (let k = at; k < src.length; k++) {
    if (src[k] === '{') { d++; started = true; }
    else if (src[k] === '}') { d--; if (started && d === 0) return src.slice(at, k + 1) + ';'; }
  }
  throw new Error('unbalanced var: ' + name);
}
// The module-scope CONSTANT TABLES the builder reads, discovered from the function body rather
// than listed by hand, and taken from each arm's OWN source so neither arm is evaluated against
// the other's data. A missing table would make the builder throw, which fails this harness.
const DEP_NAMES = [...new Set((nowFn.match(/\b_[A-Z][A-Z0-9_]{3,}\b/g) || []))]
  .filter((d) => NOW.includes('var ' + d + ' = {') && HEAD.includes('var ' + d + ' = {'));
const headDeps = DEP_NAMES.map((d) => extractVar(HEAD, d)).join('\n');
const nowDeps = DEP_NAMES.map((d) => extractVar(NOW, d)).join('\n');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent('<!doctype html><title>probe</title>');

// THE GATE MUST BE OPEN OR BOTH ARMS RETURN '' AND THE MEASUREMENT IS VACUOUS (app.js:43347
// returns early when neither the pull nor the world maps to an engine type). `picks.flavor`
// 'Obsession' is a real key of _ATTRACTION_ANCHOR_PULL_TRIGGERS, so the builder runs its body.
const FROZEN = {
  playerName: 'Nadia', loveInterestName: 'Julian', turnCount: 3,
  picks: { flavor: 'Obsession', pressure: '', worldSubtype: '' },
  worldSubtype: '', storyPull: null, archetype: { primary: 'ARMORED_FOX', modifier: null },
  renderMode: 'literary', storyLength: 'novella',
};

const sizes = await page.evaluate(({ arms, frozen }) => {
  const out = {};
  for (const [arm, deps, src] of arms) {
    window.state = JSON.parse(JSON.stringify(frozen));
    let fn;
    try { fn = eval('(function(){ ' + deps + ' return (' + src.replace(/^function\s+\w+/, 'function') + '); })()'); }
    catch (e) { out[arm] = { threw: 'compile: ' + e.message }; continue; }
    try { const t = String(fn() || ''); out[arm] = { chars: t.length, text: t }; }
    catch (e) { out[arm] = { threw: 'call: ' + e.message }; }
  }
  return out;
}, { arms: [['before', headDeps, headFn], ['after', nowDeps, nowFn]], frozen: FROZEN });
await browser.close();

// ── INVARIANTS THAT MUST SURVIVE THE SAVING ──
const ownChecks = [
  ['ownership split kept', /ROMANCE engine owns Scene 1's emotional center/],
  ['A-plot owns the complication', /the A-plot owns the COMPLICATION/],
  ['A-plot outputs are inputs, not substrate', /are INPUTS to the scene, never its substrate/],
  ['the substrate named', /the substrate is Dani's relationship/],
  ['plot happens to the relationship', /what HAPPENS to that relationship, not what generates it/],
  ['wrong order named, with its symptom', /finally surfaces in paragraph 6 or 7/],
  ['correct order named', /present in the room of her mind from the FIRST paragraphs/],
  ['complication arrives because of him', /BECAUSE OF him and lands on her BECAUSE OF him/],
  ['reader test ✓ kept verbatim', /Unfortunately, the plot is attached to him/],
  ['reader test ✗ kept verbatim', /Here is the plot\./],
  ['three paragraph roles kept', /\(a\) DIRECT[\s\S]*\(b\) REACTION[\s\S]*\(c\) COMPLICATION-FOR-LI/],
  ['role (c) keeps its because-clause', /NOT because the plot is intrinsically interesting/],
  ['paragraph test question kept', /Could I cut this paragraph without losing anything about/],
  ['paragraph test verdict kept', /plot machinery has overrun the opening/],
  ['bulk requirement kept', /must occupy the paragraph's BULK/],
  ['delete-last-sentence check kept', /Delete its last sentence/],
  ['tail-pivot swerve shapes kept', /Then again,/],
  ['tail-pivot conclusion kept', /tail-pivot is the sign that something else owned the paragraph/],
  ['offstage psychological centre', /must still be the PSYCHOLOGICAL CENTER/],
  ['all six valences kept', /anger, attraction, mistrust, anticipation, refusal or grief/],
  ['never absent, never decorative', /never ABSENT and never DECORATIVE/],
  ['person not information', /as a PERSON in her mind, not as INFORMATION about him/],
  ['decorative material named', /what he did to her father, what he has to lose are the DECORATIVE kind/],
  ['load-bearing material named', /are LOAD-BEARING, and the scene needs those/],
  ['rotation menu intact (11 items)', /remembering his voice[\s\S]*attraction despite mistrust/],
  ['rotation cadence kept', /one of these per ~2-3 paragraphs in the opening/],
  ['micro-scene definition kept', /one small thing he did in one small slice of time/],
  ['summary definition kept', /category-level statement about who he is/],
  ['dossiers line kept', /do not think in dossiers/],
  ['moments-vs-biography kept', /Moments create desire\. Summaries create biography\./],
  ['PREFER list kept', /a remembered FRAGMENT of dialogue/],
  ['AVOID list kept', /personality summary/],
  ['paired comparison kept', /EXPOSITION: "He had lied convincingly\."/],
  ['retired heading: ORDER OF OPERATIONS gone', /ORDER OF OPERATIONS/, 0],
  ['retired heading: THE READER TEST gone', /THE READER TEST/, 0],
  ['retired heading: TAIL-PIVOT gone', /TAIL-PIVOT IS NOT OWNERSHIP/, 0],
  ['retired heading: MICRO-SCENE vs EXPOSITION gone', /MICRO-SCENE vs EXPOSITION/, 0],
];

const asymText = (sizes.after && sizes.after.text) || '';
const asymChecks = [
  ['three axes kept', /INTERPRETATION of the situation[\s\S]*COST —[\s\S]*RESPONSE —/],
  ['same-thing / identical-read prohibition kept', /never want the same thing in the same way or read the situation identically/],
  ['simultaneous resolution still prohibited', /must also NOT resolve tension simultaneously/],
  ['shared epiphanies named', /shared epiphanies collapse asymmetry/],
  ['four acceptable patterns kept', /one PURSUES while the other RESISTS[\s\S]*THREAT, the other as NECESSITY/],
  ['same-beat detection kept', /IN THE SAME BEAT/],
  ['mutuality-not-symmetry kept', /Mutuality may emerge over time; symmetry may not/],
  ['pull subordinate to anchor kept', /amplify or distort the SAME anchor above/],
  ['pull-as-engine failure kept', /the pull functioning as an ENGINE/],
  ['repair instruction kept', /lands on THIS fracture, not a parallel one/],
  ['asymmetry override prohibition kept', /override the asymmetry above/],
  ['anchor persistence prohibition kept', /break anchor persistence/],
  ['no-exposition rule untouched', /No "he was drawn to her because\.\.\." expository paragraphs/],
  ['all four final validation tests untouched', /Test 1 \(character replacement\)[\s\S]*Test 4 \(engine removability\)/],
];

const P = console.log;
const fails = [];
function run(title, text, checks) {
  P('\n' + title);
  for (const [label, re, exp] of checks) {
    const hit = re.test(text);
    const ok = exp === 0 ? !hit : hit;
    if (!ok) fails.push(title + ' :: ' + label);
    P(`  ${ok ? '✓' : '✗'} ${label}`);
  }
}

P('CONTROLLED PROSE BATCH — frozen inputs, each builder measured on its own output');
P('\nSCENE-1 OWNERSHIP BLOCK (delivered text, same LI name in both arms)');
P(`  before : ${beforeOwn.length.toLocaleString()} chars`);
P(`  after  : ${afterOwn.length.toLocaleString()} chars`);
P(`  change : ${(afterOwn.length - beforeOwn.length).toLocaleString()} chars `
  + `(${(100 * (afterOwn.length - beforeOwn.length) / beforeOwn.length).toFixed(2)}%)`);

P('\n_buildAttractionAnchorDirective (evaluated against identical frozen state)');
if (sizes.before && sizes.before.threw) P('  before THREW: ' + sizes.before.threw);
if (sizes.after && sizes.after.threw) P('  after  THREW: ' + sizes.after.threw);
if (sizes.before && sizes.before.chars && sizes.after && sizes.after.chars) {
  P(`  before : ${sizes.before.chars.toLocaleString()} chars`);
  P(`  after  : ${sizes.after.chars.toLocaleString()} chars`);
  P(`  change : ${(sizes.after.chars - sizes.before.chars).toLocaleString()} chars `
    + `(${(100 * (sizes.after.chars - sizes.before.chars) / sizes.before.chars).toFixed(2)}%)`);
} else { fails.push('attraction-anchor arms did not both produce text'); }

run('OWNERSHIP BLOCK — REQUIREMENTS THAT MUST SURVIVE', afterOwn, ownChecks);
run('ASYMMETRY / STORY PULL — REQUIREMENTS THAT MUST SURVIVE', asymText, asymChecks);

fs.writeFileSync(REPO + '/_nf_prose_batch_out.txt',
  '=== OWNERSHIP BEFORE ===\n' + beforeOwn + '\n\n=== OWNERSHIP AFTER ===\n' + afterOwn
  + '\n\n=== ASYMMETRY BEFORE ===\n' + ((sizes.before && sizes.before.text) || '')
  + '\n\n=== ASYMMETRY AFTER ===\n' + asymText + '\n');

P('\n  before/after text written: _nf_prose_batch_out.txt');
if (fails.length) { P('\n  ' + fails.length + ' FAILURE(S):'); fails.forEach((f) => P('    ✗ ' + f)); process.exitCode = 1; }
else P('\n  ALL REQUIREMENT CHECKS PASSED.');
