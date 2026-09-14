#!/usr/bin/env node
// _starter_pc_foundation_block_control.mjs
//
// OFFLINE control suite for _starterPcFoundationBlock (Roman, corrective follow-up, 2026-09-15):
// the fixed-starter source packet _generatePCBodyBibleUncached now receives, compiled ONLY from
// already-approved structured sources (seed PC bio/cPlusFacets, the LI's bio + relationship-
// scoped constraints, the baked Scene 1 package's structured fields, and any recorded reader
// posture) — never invented, never a raw-prose dump. Proves: the block is populated for a seeded
// fixed PC; corridor (no seed) is completely unaffected (returns ''); a DIFFERENT seeded story's
// block never carries another story's PC material (no cross-story leak); a Famous Fate story
// (no _starterId/STARTER_SEEDS entry, exactly how FF actually works) gets no block either; only
// approved fields appear — explicitly-excluded raw-prose fields (sceneSummary, ledgerSeeds,
// calcification) never leak in even when present on _bakedEmitted; the canonical-lock instruction
// text is always present whenever the block fires.
//
// Loaded by anchor-bounded slice of public/app.js. No server, no browser, no network, no provider
// call — every fixture is a plain local object.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_PATH = path.join(__dirname, 'public/app.js');
const SRC = fs.readFileSync(APP_PATH, 'utf8');

function sliceByAnchor(label, startAnchor, endAnchor) {
  const from = SRC.indexOf(startAnchor);
  if (from === -1) throw new Error(`ANCHOR DRIFT (${label}): start anchor not found: "${startAnchor.slice(0, 80)}"`);
  const to = SRC.indexOf(endAnchor, from + startAnchor.length);
  if (to === -1) throw new Error(`ANCHOR DRIFT (${label}): end anchor not found after start: "${endAnchor.slice(0, 80)}"`);
  return SRC.slice(from, to + endAnchor.length);
}

// _activeSeed is a ONE-LINE function; sliceByAnchor's start/end-anchor pairing doesn't fit a
// single-line extraction cleanly, so it's pulled directly by line instead.
function extractLine(startAnchor) {
  const from = SRC.indexOf(startAnchor);
  if (from === -1) throw new Error('ANCHOR DRIFT (active-seed-line): not found');
  const eol = SRC.indexOf('\n', from);
  return SRC.slice(from, eol === -1 ? undefined : eol);
}
const activeSeedLine = extractLine('function _activeSeed(s) {');

const blockSrc = sliceByAnchor('starter-pc-foundation-block',
  'function _starterPcFoundationBlock(s) {',
  "window._starterPcFoundationBlock = _starterPcFoundationBlock;") + ' } catch (_) {}';

const body = activeSeedLine + '\n' + blockSrc;
const factory = new Function('window', 'STARTER_SEEDS', body);

function freshSandbox(seeds) {
  const win = {};
  factory(win, seeds || {});
  return win;
}

let pass = 0, fail = 0; const fails = [];
function ok(label, cond, detail) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; fails.push(label + (detail ? ' — ' + detail : '')); console.log('  ✗ ' + label + (detail ? ' — ' + detail : '')); }
}
function section(title) { console.log('\n=== ' + title + ' ==='); }

// A REAL-SHAPED (not real-content) First-Sacrifice-like fixed-starter seed — same field names
// and structure as the real STARTER_SEEDS.starter_first_sacrifice (bio, cPlusFacets with
// facet_id/category/canonical_truth, an LI bio, relationship-scoped + doctrine-only constraints).
const FIRST_SACRIFICE_SEED = {
  cast: [
    { role: 'PC', name: 'Lirael', species: 'First Favored',
      bio: 'A young First Favored apprentice. Today is her first time SUPERVISING another person’s First Sacrifice.',
      cPlusFacets: [
        { facet_id: 'pc_untested_brilliance', category: 'competence', canonical_truth: 'She knows the procedure better than she has ever performed it.' },
        { facet_id: 'pc_fears_public_failure', category: 'fear', canonical_truth: 'Failing where it can be witnessed and recounted is not survivable to her.' },
      ] },
    { role: 'LI', name: 'Julian', species: 'First Favored',
      bio: 'An older First Favored: calm, quietly respected. Already knows something about the PC’s lineage.' },
  ],
  constraints: [
    'Julian must never read as suspicious before Scene 8.',
    'The PC must never consciously suspect Julian before the planner allows it.',
    'The author must never invent additional wish or Fate laws beyond worldTruths.',   // doctrine-only — must NOT appear in the relationship section
  ],
};

// A SECOND, unrelated seeded Fatelands story — different PC, different LI, different facts.
// Used to prove no cross-story leakage.
const OTHER_STORY_SEED = {
  cast: [
    { role: 'PC', name: 'Mira', species: 'Wilder', bio: 'A hunter estranged from her clan.',
      cPlusFacets: [{ facet_id: 'pc_distrusts_kindness', category: 'value', canonical_truth: 'She reads every kindness as a debt she will later owe.' }] },
    { role: 'LI', name: 'Kestrel', species: 'Kwisheen', bio: 'A trader who never names his real price.' },
  ],
  constraints: ['Kestrel must never reveal his true name before Scene 12.'],
};

function baseState(overrides) {
  return Object.assign({ _starterId: null, _bakedEmitted: null, _scenePosture: null }, overrides || {});
}

// ══════════════════════════════════════════════════════════════════════════════════
section('CONTROL 1 — a seeded fixed-starter PC produces a populated, correctly-scoped block');
{
  const win = freshSandbox({ starter_first_sacrifice: FIRST_SACRIFICE_SEED });
  const s = baseState({ _starterId: 'starter_first_sacrifice' });
  const block = win._starterPcFoundationBlock(s);
  ok('block is non-empty for a seeded fixed PC', !!block && block.length > 0);
  ok('carries the fixed identity (name)', /FIXED IDENTITY: Lirael, PC/.test(block));
  ok('carries the approved biography verbatim', block.indexOf('APPROVED BIOGRAPHY: A young First Favored apprentice') !== -1);
  ok('carries BOTH established cPlusFacets truths', block.indexOf('She knows the procedure better than she has ever performed it.') !== -1
    && block.indexOf('Failing where it can be witnessed and recounted is not survivable to her.') !== -1);
  ok('carries the LI\'s relationship-relevant bio', block.indexOf('Julian (love interest): An older First Favored') !== -1);
  ok('carries the relationship-scoped constraints', block.indexOf('Julian must never read as suspicious before Scene 8.') !== -1
    && block.indexOf('The PC must never consciously suspect Julian before the planner allows it.') !== -1);
  ok('does NOT carry the doctrine-only, non-relationship constraint (authorial rule, not a relationship fact)',
    block.indexOf('must never invent additional wish or Fate laws') === -1);
  ok('carries the explicit canonical-lock / no-contradiction instruction',
    /do NOT contradict it, do NOT invent additional facts/.test(block));
  ok('carries the explicit "may originate new material only for uncovered fields" permission',
    /originate NEW material for THAT field only/.test(block));
}

// ══════════════════════════════════════════════════════════════════════════════════
section('CONTROL 2 — corridor (no seed at all) is completely unaffected');
{
  const win = freshSandbox({ starter_first_sacrifice: FIRST_SACRIFICE_SEED });
  const s = baseState({ _starterId: null });   // corridor: no _starterId, no seed resolves
  const block = win._starterPcFoundationBlock(s);
  ok('corridor produces an EMPTY block (not merely blank-looking, structurally absent)', block === '');
}

// ══════════════════════════════════════════════════════════════════════════════════
section('CONTROL 3 — a seeded PC-less story (no PC cast entry) is unaffected');
{
  const win = freshSandbox({ npc_only_story: { cast: [{ role: 'LI', name: 'Someone', bio: 'x' }] } });
  const s = baseState({ _starterId: 'npc_only_story' });
  const block = win._starterPcFoundationBlock(s);
  ok('a seed with no PC cast entry produces an EMPTY block', block === '');
}

// ══════════════════════════════════════════════════════════════════════════════════
section('CONTROL 4 (NEGATIVE) — a DIFFERENT seeded Fatelands story never carries First Sacrifice/Lirael material');
{
  const win = freshSandbox({ starter_first_sacrifice: FIRST_SACRIFICE_SEED, other_story: OTHER_STORY_SEED });
  const s = baseState({ _starterId: 'other_story' });
  const block = win._starterPcFoundationBlock(s);
  ok('block is populated for its OWN story\'s own PC', block.indexOf('FIXED IDENTITY: Mira, PC') !== -1);
  ok('NEVER contains Lirael\'s name', block.indexOf('Lirael') === -1);
  ok('NEVER contains Julian\'s name', block.indexOf('Julian') === -1);
  ok('NEVER contains any First-Sacrifice-specific fact (untested brilliance / public failure)',
    block.indexOf('untested') === -1 && block.indexOf('public failure') === -1 && block.indexOf('procedure') === -1);
  ok('NEVER references the OTHER story\'s starter id', block.indexOf('starter_first_sacrifice') === -1);
  ok('DOES reference its own starter id', block.indexOf('other_story') !== -1);
}
{
  // Same check the OTHER direction — First Sacrifice's own block never carries Mira/Kestrel.
  const win = freshSandbox({ starter_first_sacrifice: FIRST_SACRIFICE_SEED, other_story: OTHER_STORY_SEED });
  const s = baseState({ _starterId: 'starter_first_sacrifice' });
  const block = win._starterPcFoundationBlock(s);
  ok('First Sacrifice\'s own block never contains the OTHER story\'s PC (Mira)', block.indexOf('Mira') === -1);
  ok('First Sacrifice\'s own block never contains the OTHER story\'s LI (Kestrel)', block.indexOf('Kestrel') === -1);
}

// ══════════════════════════════════════════════════════════════════════════════════
section('CONTROL 5 (NEGATIVE) — a Famous Fate story (no _starterId, exactly how FF actually works) gets no block');
{
  const win = freshSandbox({ starter_first_sacrifice: FIRST_SACRIFICE_SEED });
  // Famous Fate stories are NOT STARTER_SEEDS/_starterId-driven (state.fateMode/ffContract is a
  // separate mechanism entirely) — the real _activeSeed(s) gate (id && STARTER_SEEDS[id]) already
  // fails closed for them; this proves it directly rather than assuming it.
  const s = baseState({ _starterId: null, fateMode: 'famous_fate', ffContract: { character: { canonicalName: 'Someone Real' } } });
  const block = win._starterPcFoundationBlock(s);
  ok('a Famous Fate story (no _starterId) produces an EMPTY block — no First Sacrifice material, nothing invented for FF either', block === '');
}

// ══════════════════════════════════════════════════════════════════════════════════
section('CONTROL 6 — committed Scene 1 material: structured fields only, raw-prose fields explicitly excluded even when present');
{
  const win = freshSandbox({ starter_first_sacrifice: FIRST_SACRIFICE_SEED });
  const s = baseState({
    _starterId: 'starter_first_sacrifice',
    _bakedEmitted: {
      ledgerLine: 'Seren’s misaligned wish bent; the Dohkar charged Lirael publicly.',
      sceneSummary: 'RAW PROSE — a much longer paragraph that must never appear in the compact block, full of narrative color not committed fact.',
      openState: { location: 'the Veilwood ceremony clearing', timeOfDay: 'dawn', pcCondition: 'mouth-band torn away, publicly accused' },
      obligations: ['The Dohkar has charged her; he has not yet ruled.'],
      ledgerSeeds: [{ subject: 'Lirael', about: 'Julian', perception: 'RAW RELATIONAL PROSE — must never appear here' }],
      calcification: { phrases: ['a phrase that must never appear here'] },
    },
  });
  const block = win._starterPcFoundationBlock(s);
  ok('carries the committed ledgerLine', block.indexOf('Seren’s misaligned wish bent') !== -1);
  ok('carries the structured location/time', block.indexOf('Location: the Veilwood ceremony clearing; time: dawn') !== -1);
  ok('carries her structured condition', block.indexOf('Her condition now: mouth-band torn away, publicly accused') !== -1);
  ok('carries the structured obligation', block.indexOf('The Dohkar has charged her; he has not yet ruled.') !== -1);
  ok('NEVER carries sceneSummary (raw prose, explicitly excluded)', block.indexOf('RAW PROSE') === -1);
  ok('NEVER carries ledgerSeeds (relationally-framed prose, explicitly excluded)', block.indexOf('RAW RELATIONAL PROSE') === -1);
  ok('NEVER carries calcification', block.indexOf('a phrase that must never appear here') === -1);
}

// ══════════════════════════════════════════════════════════════════════════════════
section('CONTROL 7 — reader posture, when it exists, is carried; when absent, silently omitted (never awaited/required)');
{
  const win = freshSandbox({ starter_first_sacrifice: FIRST_SACRIFICE_SEED });
  const sNoPosture = baseState({ _starterId: 'starter_first_sacrifice' });
  const blockNoPosture = win._starterPcFoundationBlock(sNoPosture);
  ok('no posture section when none has been recorded yet', blockNoPosture.indexOf('SUBMITTED SAY/DO') === -1);

  const sWithPosture = baseState({ _starterId: 'starter_first_sacrifice',
    _scenePosture: { '2': { action: 'she holds her ground', dialogue: 'I did what the rite required.' } } });
  const blockWithPosture = win._starterPcFoundationBlock(sWithPosture);
  ok('posture is carried verbatim when it exists', blockWithPosture.indexOf('did: she holds her ground') !== -1
    && blockWithPosture.indexOf('said: "I did what the rite required."') !== -1);
}

console.log('\n' + '='.repeat(70));
console.log(`STARTER PC FOUNDATION BLOCK CONTROL: ${pass} passed, ${fail} failed`);
if (fail) { console.log('\nFAILURES:'); fails.forEach(function (f) { console.log('  - ' + f); }); process.exit(1); }
process.exit(0);
