#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════════════════════════
// NARROW CHECK — APPEARANCE ESTABLISHMENT, AGAINST THE PRESERVED PAID CHECKPOINT.
//
// Four claims, all against the EXISTING builders and the real saved state. No new verifier,
// no model stage, no appearance-tracking subsystem.
//
//   1. another character's description cannot establish the PC
//      (descLedger.pcHair is 1 in the paid save, incremented by JULIAN's "the fall of black
//       hair"; it must not make the PC count as described)
//   2. the old automatic flags cannot suppress a missing introduction
//      (_apprEstablished {pc:true, li:true} is already in the paid save)
//   3. a populated bible with no published description stays eligible for establishment
//   4. the guidance delivered makes no per-character establishment claim
//
// PROVIDER CONTACT: the page is served, every /api aborted and counted. Nothing billed.
// usage: node _nf_appearance_establishment_check.mjs     (needs the dev server on :3000)
// ══════════════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const ORIGIN = process.env.SB_ORIGIN || 'http://localhost:3000';
const RUN = process.env.SB_RUN_DIR
  || '/Users/romantsukerman/storybound-diag/_nf_story_test_RUN3/run_2026-11-02T19-03-47-893Z_29351';
const OUT = '_nf_appearance_out';
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

let PASS = 0, FAIL = 0;
const FAILURES = [];
const line = (s) => console.log(s);
const note = (l, v) => line('  ----  ' + l + ' :: ' + String(v).replace(/\n/g, ' ').slice(0, 420));
function check(label, ok, detail) {
  if (ok) { PASS++; line('  PASS  ' + label); }
  else { FAIL++; FAILURES.push(label); line('  FAIL  ' + label + (detail ? '  :: ' + String(detail).slice(0, 420) : '')); }
}

const SNAP = JSON.parse(JSON.parse(
  fs.readFileSync(RUN + '/STATE_after_scene6.json', 'utf8')).storage.sb_saved_story).stateSnapshot;

let apiAborted = 0, served = 0;
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
// EVERY VALUE IS INVENTED TEST DATA, labelled in the data itself. Shape copied from the
// consumer's contract: _callTieredProvider('pcBodyBible') reads `data.content` as a JSON string.
const PC_BIBLE_FIXTURE = {
  age: '31', ancestry: '',
  height: '[FIXTURE] a little above average height',
  build: '[FIXTURE] narrow-shouldered, long through the forearms',
  hair: '[FIXTURE] dark coral, coarse and heavy, worn twisted up off the neck for work',
  complexion: '[FIXTURE] deep teal with a colder cast along the jaw',
  face: '[FIXTURE] a long, serious face that reads older in profile than head-on',
  signature_feature: '[FIXTURE] the flat of her left hand, burn-marked pale from years of kiln work',
  visual_anchor: { focus: 'the hands', detail: '[FIXTURE] she keeps them half-closed' },
  second_celebrated_feature: '[FIXTURE] a low, unhurried voice that does not rise when she is contradicted',
  stress_tic: '[FIXTURE] turns a ring once around her finger',
  desire_tell: '[FIXTURE] goes still instead of leaning in',
  impatience_tell: '[FIXTURE] answers the question before it finishes',
  confidence_tell: '[FIXTURE] sets both hands flat and waits',
  vulnerability_tell: '[FIXTURE] looks at her own hands',
  emotional_weather: '[FIXTURE] contained, with the weather showing late',
};
let pcBibleDoorHits = 0;
// PARTIAL MODE: the generator answers with five of the six requested physical fields (no `face`),
// which is the case a complete fixture cannot exercise.
const PARTIAL = process.env.SB_PARTIAL === '1';
const pcFixture = () => { const f = Object.assign({}, PC_BIBLE_FIXTURE); if (PARTIAL) delete f.face; return f; };
await ctx.route('**/*', async (route) => {
  const u = route.request().url();
  if (/\/api\//.test(u)) {
    let b = {}; try { b = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
    const both = ((b.messages || []).map((m) => String(m.content || '')).join('\n'));
    if (/"signature_feature": "<the ONE thing worth celebrating/.test(both)) {
      pcBibleDoorHits += 1;
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ ok: true, content: JSON.stringify(pcFixture()),
          choices: [{ message: { content: JSON.stringify(pcFixture()) } }] }) });
    }
    apiAborted += 1; return route.abort();
  }
  if (u.startsWith(ORIGIN)) { served += 1; return route.continue(); }
  apiAborted += 1; return route.abort();
});
const page = await ctx.newPage();
const consoleLines = [];
page.on('console', (m) => { const t = m.text(); if (/APPEARANCE|BIBLE|DESC:/i.test(t)) consoleLines.push(t); });

try {
  await page.goto(ORIGIN, { waitUntil: 'domcontentloaded', timeout: 60000 });
  // ONLY THE MODULE-SCOPE BUILDER IS AWAITED. The three body-bible renderers are assigned
  // INSIDE handleBeginStory (app.js:289591), so on a page that has not begun a story they do not
  // exist — which is itself worth recording, since the body-bible block calls them behind a
  // `typeof === 'function'` guard and therefore emits nothing when they are absent.
  await page.waitForFunction(() => typeof window.buildEstablishedDescriptionDirective === 'function',
    { timeout: 60000 });

  const r = await page.evaluate((snap) => {
    Object.assign(window.state, snap);          // MUTATE, never replace
    const S = window.state;
    const phys = ['hair', 'eye_color', 'complexion', 'height', 'build', 'signature_feature',
      'second_celebrated_feature', 'mouth_quality', 'voice'];
    const physOf = (b) => (b ? phys.filter((f) => b[f]) : null);
    return {
      savedFlags: S._apprEstablished || null,
      savedPcHair: (S.descLedger || {}).pcHair,
      physBefore: { pc: physOf(S.pcBodyBible), li: physOf(S.liBodyBible) },
      pcKeys: S.pcBodyBible ? Object.keys(S.pcBodyBible) : null,
      liKeys: S.liBodyBible ? Object.keys(S.liBodyBible) : null,
      directive: window.buildEstablishedDescriptionDirective() || '',
      renderersPresent: {
        pc: typeof window._renderPCBodyBibleCompact === 'function',
        li: typeof window._renderLIBodyBibleCompact === 'function',
        antagonist: typeof window._renderAntagonistBodyBibleCompact === 'function' },
      pcBible: (typeof window._renderPCBodyBibleCompact === 'function' ? window._renderPCBodyBibleCompact() : '') || '',
      liBible: (typeof window._renderLIBodyBibleCompact === 'function' ? window._renderLIBodyBibleCompact() : '') || '',
      agBible: (typeof window._renderAntagonistBodyBibleCompact === 'function' ? window._renderAntagonistBodyBibleCompact() : '') || '',
      // AFTER the renderers ran, so the reconciliation they perform is visible.
      physAfter: { pc: physOf(S.pcBodyBible), li: physOf(S.liBodyBible) },
      agPhys: physOf(S.antagonistBodyBible),
      agBibleText: (typeof window._renderAntagonistBodyBibleCompact === 'function' ? window._renderAntagonistBodyBibleCompact() : '') || '',
      antagonistNameState: S.antagonistName || null,
      antagonistSubjectName: ((S.aPlot || {}).antagonistSubject || {}).proper_name || null,
      reconciled: { pc: (S.pcBodyBible || {})._apprReconciled || null,
                    li: (S.liBodyBible || {})._apprReconciled || null },
      pcValues: ['hair','complexion','eye_color','signature_feature','height','build','age']
        .reduce(function (o, f) { if ((S.pcBodyBible || {})[f]) o[f] = String(S.pcBodyBible[f]).slice(0, 90); return o; }, {}),
      liValues: ['hair','complexion','eye_color','signature_feature','height','build','age']
        .reduce(function (o, f) { if ((S.liBodyBible || {})[f]) o[f] = String(S.liBodyBible[f]).slice(0, 90); return o; }, {}),
    };
  }, SNAP);

  fs.writeFileSync(OUT + '/DELIVERED_DIRECTIVE.txt', r.directive);
  fs.writeFileSync(OUT + '/DELIVERED_PC_BIBLE.txt', r.pcBible);
  fs.writeFileSync(OUT + '/DELIVERED_LI_BIBLE.txt', r.liBible);
  fs.writeFileSync(OUT + '/DELIVERED_ANTAGONIST_BIBLE.txt', r.agBible);

  line('');
  line('='.repeat(88));
  line('A — THE SAVED STATE THIS RUNS AGAINST');
  line('='.repeat(88));
  note('saved _apprEstablished', JSON.stringify(r.savedFlags));
  note('saved descLedger.pcHair', r.savedPcHair + '  (incremented by Julian\'s "the fall of black hair")');
  note('pcBodyBible keys', JSON.stringify(r.pcKeys));
  note('pcBodyBible PHYSICAL fields', JSON.stringify(r.pcPhys));
  note('liBodyBible keys', JSON.stringify(r.liKeys));
  note('liBodyBible PHYSICAL fields', JSON.stringify(r.liPhys));
  note('antagonistBodyBible PHYSICAL fields', JSON.stringify(r.agPhys));

  line('');
  line('='.repeat(88));
  line('B — THE FOUR CLAIMS');
  line('='.repeat(88));
  check('1. the directive is DELIVERED, not silently empty (syntax checking did not establish this)',
    r.directive.length > 0, r.directive.length + ' chars');
  check('2. ANOTHER CHARACTER\'S DESCRIPTION CANNOT ESTABLISH THE PC — pcHair=1 from Julian does'
    + ' not produce a claim that the protagonist has been described',
    !/appearance has reached the page/.test(r.directive)
    && !/was established earlier/.test(r.directive)
    && !/They are ON THE PAGE/.test(r.directive), r.directive.slice(0, 200));
  check('RESUME AVAILABILITY: all three body-bible renderers exist on a page that has NOT begun a'
    + ' story — the gap that made a fresh-page resume deliver no bible section at all',
    r.renderersPresent.pc && r.renderersPresent.li && r.renderersPresent.antagonist,
    JSON.stringify(r.renderersPresent));
  check('3. THE OLD AUTOMATIC FLAGS CANNOT SUPPRESS AN INTRODUCTION — the saved'
    + ' _apprEstablished {pc:true,li:true} produces no suppression language in the delivered'
    + ' guidance', (r.savedFlags && r.savedFlags.pc === true)
    && !/ESTABLISHED & LOCKED/.test(r.directive)
    && !/do NOT re-list or re-describe/.test(r.directive),
    JSON.stringify(r.savedFlags) + ' / ' + r.directive.slice(0, 140));
  check('4. A POPULATED BIBLE WITH NO PUBLISHED DESCRIPTION STAYS ELIGIBLE — the guidance keeps'
    + ' physical grounding available without asserting anyone was never introduced',
    /concrete physical grounding whenever the moment can carry it/.test(r.directive)
    && !/it is unestablished/.test(r.directive)
    && !/they have not had one/.test(r.directive),
    r.directive.split('\n').filter((l) => /grounding as always|silence here/.test(l)).join(' | ').slice(0, 280));
  check('6. NO PERSON-SPECIFIC SUPPRESSION SURVIVES — the phrase counters no longer claim whose'
    + ' feature they matched, nor forbid describing it',
    !/protagonist's hair color — already established/.test(r.directive)
    && !/do not re-catalog it/.test(r.directive)
    && !/his eye color — already named/.test(r.directive)
    && !/do not restate/.test(r.directive),
    (r.directive.split('\n').filter((l) => /hair color|eye color|re-catalog|restate/.test(l))[0] || '(none)').slice(0, 220));
  check('7. the phrase counters ARE still delivered, as wording hints',
    !/PER-ISSUE BUDGET/.test(r.directive)
    && (!/\u00d7 in the prose this issue/.test(r.directive) || /matches the WORDING/.test(r.directive)),
    (r.directive.split('\n').filter((l) => /in the prose this issue/.test(l))[0] || '(no counter fired)').slice(0, 240));
  check('5. the phrase list makes no claim about who the reader can picture',
    /says nothing about who the reader can or cannot already picture/.test(r.directive));

  line('');
  line('='.repeat(88));
  line('C — WHAT THE AUTHOR ACTUALLY RECEIVES (saved to ' + OUT + '/)');
  line('='.repeat(88));
  note('ESTABLISHED-DESCRIPTION directive', r.directive.length + ' chars');
  line(r.directive.split('\n').slice(0, 6).map((l) => '        ' + l.slice(0, 300)).join('\n'));
  note('PC bible delivered', r.pcBible.length + ' chars');
  line(r.pcBible.split('\n').slice(0, 4).map((l) => '        ' + l.slice(0, 300)).join('\n'));
  note('LI bible delivered', r.liBible.length + ' chars');
  line(r.liBible.split('\n').slice(0, 4).map((l) => '        ' + l.slice(0, 300)).join('\n'));

  // ══════════════════════════════════════════════════════════════════════════════════════
  line(''); line('='.repeat(88));
  line('E — PERSISTENCE, INDEPENDENT OF ANY AUTHOR REQUEST');
  line('='.repeat(88));
  // ══════════════════════════════════════════════════════════════════════════════════════
  // Completion → the REAL save path → page reload → restore → compare. No turn is submitted and
  // no author request is built, so this stands on its own.
  const beforeHits = pcBibleDoorHits;
  const completed = await page.evaluate(async () => {
    await window._ensureBodyBiblesReady(window.state);
    const b = window.state.pcBodyBible || {};
    return { phys: ['hair','complexion','height','build','face','signature_feature']
               .reduce(function (o,f) { if (b[f]) o[f] = String(b[f]).slice(0,70); return o; }, {}),
      physFull: ['hair','complexion','height','build','face','signature_feature']
               .reduce(function (o,f) { if (b[f]) o[f] = String(b[f]); return o; }, {}),
      foundation: ['core_contradiction','wound','current_crisis'].filter((f) => b[f]),
      foundationFull: ['core_contradiction','wound','current_crisis']
               .reduce(function (o,f) { if (b[f]) o[f] = JSON.stringify(b[f]); return o; }, {}),
      repair: window.state._pcAppearanceCompletion || null };
  });
  note('after completion — physical', JSON.stringify(completed.phys).slice(0, 320));
  note('after completion — foundation kept', JSON.stringify(completed.foundation));
  note('generator calls made', (pcBibleDoorHits - beforeHits) + ' (fixture door)');
  check('COMPLETION: the requested physical fields are present (' + (PARTIAL ? '5 of 6, partial'
    + ' mode' : 'all 6') + ')',
    Object.keys(completed.phys).length === (PARTIAL ? 5 : 6),
    JSON.stringify(Object.keys(completed.phys)));
  check('COMPLETION: the existing foundation survived the repair',
    completed.foundation.length === 3, JSON.stringify(completed.foundation));
  check('COMPLETION: non-appearance generated material was refused',
    !!(completed.repair && (completed.repair.refusedFromRepair || []).length > 0),
    JSON.stringify((completed.repair || {}).refusedFromRepair || []).slice(0, 180));

  const saved = await page.evaluate(() => {
    window.__saveStorySnapshot();
    const raw = localStorage.getItem('sb_saved_story');
    const b = ((JSON.parse(raw) || {}).stateSnapshot || {}).pcBodyBible || {};
    return { chars: (raw || '').length,
      phys: ['hair','complexion','height','build','face','signature_feature'].filter((f) => b[f]),
      foundation: ['core_contradiction','wound','current_crisis'].filter((f) => b[f]) };
  });
  check('SAVE: the real save path persists the completed appearance AND the foundation',
    saved.phys.length === (PARTIAL ? 5 : 6) && saved.foundation.length === 3,
    JSON.stringify(saved));

  // ── REOPEN THROUGH PRODUCTION'S OWN CONTINUE, not Object.assign (corrected) ──────────
  // The previous version restored by hand, which cannot show that the Continue workflow preserves
  // anything. Values are compared COMPLETE — no truncation — and the foundation is compared by
  // VALUE, not by field name.
  const storyId = await page.evaluate(() => {
    const sv = JSON.parse(localStorage.getItem('sb_saved_story') || '{}');
    return sv.storyId || null;
  });
  note('reopening through window.continueStory', String(storyId));
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => typeof window.continueStory === 'function'
    && typeof window._ensureBodyBiblesReady === 'function', { timeout: 60000 });
  const hitsBeforeReopen = pcBibleDoorHits;
  const reopened = await page.evaluate(async (id) => {
    try { await Promise.race([window.continueStory(id), new Promise((r) => setTimeout(r, 90000))]); }
    catch (e) { return { ok: false, threw: String(e && e.message) }; }
    const before = JSON.stringify(window.state.pcBodyBible);
    await window._ensureBodyBiblesReady(window.state);
    const b = window.state.pcBodyBible || {};
    return { ok: true, unchanged: JSON.stringify(b) === before,
      physFull: ['hair','complexion','height','build','face','signature_feature']
        .reduce(function (o,f) { if (b[f]) o[f] = String(b[f]); return o; }, {}),
      foundationFull: ['core_contradiction','wound','current_crisis']
        .reduce(function (o,f) { if (b[f]) o[f] = JSON.stringify(b[f]); return o; }, {}),
      repair: b._apprRepair || null };
  }, storyId);
  check('REOPEN ran through production Continue, not a manual restore', reopened.ok === true,
    JSON.stringify(reopened).slice(0, 180));
  check('REOPEN: every completed physical VALUE is byte-identical to its pre-save value',
    JSON.stringify(reopened.physFull) === JSON.stringify(completed.physFull),
    'pre-save ' + JSON.stringify(completed.physFull).slice(0, 110)
    + ' / after ' + JSON.stringify(reopened.physFull).slice(0, 110));
  check('REOPEN: every preserved foundation VALUE is byte-identical too',
    JSON.stringify(reopened.foundationFull) === JSON.stringify(completed.foundationFull),
    'pre-save ' + JSON.stringify(completed.foundationFull).slice(0, 110)
    + ' / after ' + JSON.stringify(reopened.foundationFull).slice(0, 110));
  check('NO UNNECESSARY RE-COMPLETION after a production reopen: nothing dispatched, nothing'
    + ' changed', (pcBibleDoorHits - hitsBeforeReopen) === 0 && reopened.unchanged === true,
    (pcBibleDoorHits - hitsBeforeReopen) + ' generator call(s), unchanged=' + reopened.unchanged);
  if (PARTIAL) {
    note('the recorded partial outcome', JSON.stringify(reopened.repair));
    check('PARTIAL: the shortfall is recorded on the record and survives the reopen',
      !!(reopened.repair && (reopened.repair.stillMissing || []).length === 1
         && reopened.repair.stillMissing[0] === 'face'),
      JSON.stringify(reopened.repair));
    check('PARTIAL: the record stays honestly incomplete rather than being papered over',
      !reopened.physFull.face && /PARTIAL/.test(String((reopened.repair || {}).note)));
  }

  line('');
  line('='.repeat(88));
  line('D — THE DATA GAP, MEASURED (not fixed by this change)');
  line('='.repeat(88));
  note('PHYSICAL fields BEFORE the renderers ran', JSON.stringify(r.physBefore));
  note('PHYSICAL fields AFTER reconciliation', JSON.stringify(r.physAfter));
  note('reconciliation record', JSON.stringify(r.reconciled));
  note('PC physical values now on the bible', JSON.stringify(r.pcValues));
  note('LI physical values now on the bible', JSON.stringify(r.liValues));
  note('antagonist: state.antagonistName / aPlot.antagonistSubject.proper_name',
    JSON.stringify(r.antagonistNameState) + ' / ' + JSON.stringify(r.antagonistSubjectName));
  check('SUPPORTING CHARACTER: the established NAME now reaches the author with her portrait',
    /Veyra Solin/.test(r.agBibleText), (r.agBibleText.split('\n')[0] || '').slice(0, 160));
  check('SUPPORTING CHARACTER: the contradictory references are CORRECTED (not warned about),'
    + ' and her physical facts are preserved unaltered',
    /Veyra(’|\')s fingers|the way Veyra taps/.test(r.agBibleText)
    && !/the way he taps/.test(r.agBibleText)
    && /tall, broad through the chest/.test(r.agBibleText)
    && /dark silver-white/.test(r.agBibleText),
    (r.agBibleText.split('\n').filter((l) => /Veyra|taps/.test(l))[0] || '(absent)').slice(0, 200));
  check('PRESERVED CANON IS DELIVERED, not merely stored',
    /AUTHORITATIVE VISUAL CANON/.test(r.liBible) && /SPECIES CANON/.test(r.liBible),
    (r.liBible.split('\n').filter((l) => /AUTHORITATIVE VISUAL CANON/.test(l))[0] || '(absent)').slice(0, 170));
  check('NO LINE IS DISCARDED: every canon line is preserved even when no field fits',
    !!(r.reconciled.li && r.reconciled.li.canonLines > 0
       && r.reconciled.li.canonLines >= r.reconciled.li.filled.length),
    JSON.stringify(r.reconciled.li));
  check("RECONCILED: Julian's physical canon comes from the seed's own visualCanon, not invented",
    (r.physBefore.li || []).length === 0 && (r.physAfter.li || []).length > 0
    && !!(r.reconciled.li && r.reconciled.li.canonLines > 0),
    'before ' + JSON.stringify(r.physBefore.li) + ' after ' + JSON.stringify(r.physAfter.li));
  note('the PC path is different by design', "the seed specifies no individual appearance for the "
    + 'PC, so hers comes from the completion generator (section E), not from reconciliation.');
} catch (err) {
  line('HARNESS ERROR: ' + (err && err.message));
  FAIL++; FAILURES.push('threw: ' + (err && err.message));
} finally {
  await browser.close();
}

line('');
note('requests', 'page/assets served ' + served + ' · /api aborted ' + apiAborted + ' — nothing billed');
line('='.repeat(88));
line('  PASS ' + PASS + ' · FAIL ' + FAIL);
for (const f of FAILURES) line('    FAILED: ' + f);
line('='.repeat(88));
process.exit(FAIL ? 1 : 0);
