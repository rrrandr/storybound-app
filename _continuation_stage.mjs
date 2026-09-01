// ══════════════════════════════════════════════════════════════════════════════════════════
//  THE AUTHORITATIVE CONTINUATION STAGE
//
//  Character+ used to refuse every scene but the first, and the refusal was honest: a roster is
//  not a stage, and the only thing later scenes had was a name list scanned out of goal text.
//  This proves the replacement rule — a scene may be assigned psychology when, and only when,
//  something authoritative declared who is in it, by issued ref, with an explicit presence mode.
//
//  Every assertion drives PRODUCTION's own exported functions in the real page. Zero model calls.
// ══════════════════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core';
import { configBody, installSession, isAuthOrigin } from './_test_session_env.mjs';

let pass = 0, fail = 0;
const out = [];
const ok = (n, c, d) => { if (c) { pass++; out.push(`  ✓ ${n}`); } else { fail++; out.push(`  ✗ ${n}${d ? '\n      ' + String(d).slice(0, 460) : ''}`); } };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
await installSession(page);
await page.route('**/*', async route => {
  const url = route.request().url();
  const path = url.replace(/^https?:\/\/[^/]+/, '');
  if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (!/\/api\//.test(path)) return route.continue();
  if (/\/api\/config\b/.test(path)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window.state && window._sceneStageContract && window._cpNormalizeStage, { timeout: 60000 });

// Put the page in the seeded story so _activePlan resolves and the authored spine is live.
const setup = async (sceneNum) => page.evaluate((n) => {
  const s = window.state;
  const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
  Object.assign(s, { _starterId: def.id, is_starter_story: true, world: def.world,
    worldSubtype: def.worldSubtype, name: 'Lirael', playerName: 'Lirael',
    loveInterestName: 'Julian', partnerName: 'Julian', pov: 'first_person',
    storyId: 'contstage-' + n, turnCount: n - 1 });
  s._relationshipLedger = null;
  return true;
}, sceneNum);

const K = await page.evaluate(() => window.__CP_STAGE_CONTRACT);
ok('the contract constants come from production',
   K && K.v === 1 && K.presenceModes.join() === 'IN_PERSON,ANTICIPATED,RECALLED,REPORTED'
   && K.presentModes.join() === 'IN_PERSON', JSON.stringify(K));

// ══ 1. THE MIGRATED CONTINUATION IS AUTHORITATIVE AND GROUNDS ══
await setup(4);
const S4 = await page.evaluate(() => {
  const st = window._sceneStageContract(window.state, 4);
  return { ok: st.ok, fault: st.fault, source: st.source,
           authority: st.stageAuthority,
           onStage: (st.onStage || []).map(c => ({ id: c.id, presence: c.presence, authorized: c.authorized })),
           offStage: (st.offStage || []).map(c => ({ id: c.id, name: c.name, presence: c.presence })),
           facts: (st.eventFacts || []).map(f => ({ text: f.text.slice(0, 40), refs: (f.participants || []).map(p => p.ref + ':' + p.role), poisoned: !!f.refPoisoned })),
           refFaults: st.refFaults || [] };
});
ok('scene 4 has an AUTHORITATIVE stage', S4.authority && S4.authority.ok === true, JSON.stringify(S4.authority && S4.authority.code));
ok('the backend assigned a version and a fingerprint, and a provenance',
   S4.authority.version === 1 && /^stage:v1:/.test(S4.authority.fingerprint || '')
   && S4.authority.provenance === 'authored_seed_spine', JSON.stringify(S4.authority.fingerprint));
ok('every on-stage entry is AUTHORIZED and carries an issued ref',
   S4.onStage.length > 0 && S4.onStage.every(c => c.authorized === true && /^(pc|named|role|plot|cand):/.test(c.id)),
   JSON.stringify(S4.onStage));
ok('pc:self resolved to the real protagonist id, not the literal',
   S4.onStage.some(c => c.id === 'pc:lirael') && !S4.onStage.some(c => c.id === 'pc:self'), JSON.stringify(S4.onStage.map(c => c.id)));
ok('the owned facts survived ref validation unpoisoned',
   S4.facts.length === 3 && S4.facts.every(f => !f.poisoned) && S4.refFaults.length === 0,
   JSON.stringify(S4.facts));

// ══ 2. A NAME IN THE GOAL, ABSENT FROM THE STRUCTURED PARTICIPANTS, STAYS ABSENT ══
// Scene 4's goal names "the PC"; scene 5's goal is entirely about Julian. He is declared
// REPORTED here, so the strongest possible statement is available: even the person the next
// scene turns on is not in this room.
ok('★ Julian is named by the scene and is NOT in the room',
   !S4.onStage.some(c => c.id === 'named:julian')
   && S4.offStage.some(c => c.id === 'named:julian' && c.presence === 'REPORTED'),
   JSON.stringify({ on: S4.onStage.map(c => c.id), off: S4.offStage }));

// ══ 3. EVERY ABSENT MODE IS NON-PRESENT ══
const MODES = await page.evaluate(() => {
  const res = {};
  ['IN_PERSON', 'ANTICIPATED', 'RECALLED', 'REPORTED'].forEach(mode => {
    const norm = window._cpNormalizeStage({ v: 1, participants: [
      { ref: 'named:testperson', label: 'Test Person', presence: mode }] }, 'story-x', 4);
    res[mode] = { ok: norm.ok, present: window.__CP_STAGE_CONTRACT.presentModes.indexOf(mode) !== -1 };
  });
  return res;
});
['ANTICIPATED', 'RECALLED', 'REPORTED'].forEach(m => {
  ok(`${m} normalises but is NOT a present mode`, MODES[m].ok === true && MODES[m].present === false, JSON.stringify(MODES[m]));
});
ok('IN_PERSON is the only present mode', MODES.IN_PERSON.present === true, JSON.stringify(MODES.IN_PERSON));

// ══ 4. WHAT THE PREDICATE REFUSES ══
const REJ = await page.evaluate(() => {
  const N = window._cpNormalizeStage;
  return {
    bareName:   N({ v: 1, participants: [{ label: 'Mara Dunn', presence: 'IN_PERSON' }] }, 's', 4),
    slugNotRef: N({ v: 1, participants: [{ ref: 'mara_dunn', label: 'Mara', presence: 'IN_PERSON' }] }, 's', 4),
    noMode:     N({ v: 1, participants: [{ ref: 'named:mara', label: 'Mara' }] }, 's', 4),
    badMode:    N({ v: 1, participants: [{ ref: 'named:mara', label: 'Mara', presence: 'PRESENT' }] }, 's', 4),
    wrongV:     N({ v: 99, participants: [{ ref: 'named:mara', label: 'Mara', presence: 'IN_PERSON' }] }, 's', 4),
    empty:      N(null, 's', 4),
    good:       N({ v: 1, participants: [{ ref: 'named:mara', label: 'Mara', presence: 'IN_PERSON' }] }, 's', 4),
  };
});
ok('a bare name is refused', !REJ.bareName.ok && REJ.bareName.code === 'no_valid_participants', JSON.stringify(REJ.bareName.rejected));
ok('a slug that is not an issued ref is refused',
   !REJ.slugNotRef.ok && (REJ.slugNotRef.rejected[0] || {}).why === 'not_an_issued_ref', JSON.stringify(REJ.slugNotRef.rejected));
ok('★ a participant with NO explicit presence mode is refused, never defaulted to IN_PERSON',
   !REJ.noMode.ok && (REJ.noMode.rejected[0] || {}).why === 'no_explicit_presence_mode', JSON.stringify(REJ.noMode.rejected));
ok('an unrecognised presence mode is refused', !REJ.badMode.ok, JSON.stringify(REJ.badMode.rejected));
ok('a contract version mismatch is refused', !REJ.wrongV.ok && REJ.wrongV.code === 'stage_version_mismatch', JSON.stringify(REJ.wrongV));
ok('an absent stage is refused', !REJ.empty.ok && REJ.empty.code === 'no_structured_stage', JSON.stringify(REJ.empty));
ok('CONTROL: the same shape WITH a ref and a mode is accepted — so the refusals are about the defect',
   REJ.good.ok === true && !!REJ.good.fingerprint, JSON.stringify(REJ.good.code));

// ══ 5. LEGACY BARE NAMES SERVE THE OLD MACHINERY AND AUTHORISE NOTHING ══
await setup(7);
const S7 = await page.evaluate(() => {
  const st = window._sceneStageContract(window.state, 7);       // scene 7 is NOT migrated
  return { authority: st.stageAuthority,
           onStage: (st.onStage || []).map(c => ({ id: c.id, authorized: c.authorized })) };
});
ok('an unmigrated continuation has NO authority', S7.authority && S7.authority.ok === false, JSON.stringify(S7.authority));
ok('★ its bare-name participants still stage (old machinery keeps working) but are NOT authorized',
   S7.onStage.every(c => c.authorized !== true), JSON.stringify(S7.onStage));

// ══ 6. THE ADAPTER: THREE DISTINCT OUTCOMES ══
const ADAPT = await page.evaluate(() => {
  const call = (n, stage) => {
    const st = stage || window._sceneStageContract(window.state, n);
    const r = window._cPlusEligibleCandidates(window.state, { sceneNumber: n, stage: st });
    return { ok: r.ok, fault: r.fault, candidates: (r.candidates || []).map(c => c.label) };
  };
  const st4 = window._sceneStageContract(window.state, 4);
  // An authoritative stage whose facts own nobody: presence is valid, C+ simply grounds nothing.
  const stNoFacts = JSON.parse(JSON.stringify(st4));
  stNoFacts.eventFacts = [];
  return { migrated: call(4, st4), unmigrated: call(7), noFacts: call(4, stNoFacts) };
});
ok('scene 7 (no authoritative stage) — the adapter REFUSES the scene',
   ADAPT.unmigrated.ok === false && /no AUTHORITATIVE stage/.test(ADAPT.unmigrated.fault || ''), JSON.stringify(ADAPT.unmigrated.fault));
ok('scene 4 (authoritative stage) — the adapter accepts it',
   ADAPT.migrated.ok === true, JSON.stringify(ADAPT.migrated));
ok('★ authoritative stage with NO owned facts — accepted presence, and C+ simply grounds nothing',
   ADAPT.noFacts.ok === true, JSON.stringify(ADAPT.noFacts));

// ══ 7. RETRY AND RESTORE REUSE THE SAME FINGERPRINT ══
const FP = await page.evaluate(() => {
  const a = window._sceneStageContract(window.state, 4).stageAuthority.fingerprint;
  const b = window._sceneStageContract(window.state, 4).stageAuthority.fingerprint;    // retry
  // Restore: the whole state object round-trips through the save path's serialisation.
  const snap = JSON.stringify({ storyId: window.state.storyId, _starterId: window.state._starterId,
    turnCount: window.state.turnCount, playerName: window.state.playerName, name: window.state.name,
    loveInterestName: window.state.loveInterestName, partnerName: window.state.partnerName,
    pov: window.state.pov, world: window.state.world, worldSubtype: window.state.worldSubtype,
    is_starter_story: true });
  Object.keys(window.state).forEach(k => { if (k.indexOf('_scene') === 0) delete window.state[k]; });
  Object.assign(window.state, JSON.parse(snap));
  const c = window._sceneStageContract(window.state, 4).stageAuthority.fingerprint;    // restore
  // A DIFFERENT stage must NOT collide: one presence mode flipped is a different claim.
  const st = window._sceneStageContract(window.state, 4).stageAuthority;
  // Recomputation uses the CANONICAL form the contract exposes — the same refs the fingerprint
  // was taken over. Rebuilding from the resolved participants would compare a stage against a
  // differently-spelled copy of itself and call the difference a defect.
  const canon = st.canonical;
  const mutated = window._cpNormalizeStage({ v: 1, provenance: 'authored_seed_spine',
    participants: canon.participants.map((p, i) => i === 0 ? { ref: p.ref, label: p.label, presence: 'REPORTED' } : p),
    eventFacts: canon.eventFacts }, window.state.storyId, 4).fingerprint;
  // Order must NOT matter: the order a source lists people in is not who is on stage.
  const reordered = window._cpNormalizeStage({ v: 1, provenance: 'authored_seed_spine',
    participants: canon.participants.slice().reverse(), eventFacts: canon.eventFacts },
    window.state.storyId, 4).fingerprint;
  // And the canonical form must reproduce the fingerprint exactly as issued.
  const recomputed = window._cpNormalizeStage({ v: 1, provenance: 'authored_seed_spine',
    participants: canon.participants, eventFacts: canon.eventFacts }, window.state.storyId, 4).fingerprint;
  return { a, b, c, mutated, reordered, recomputed };
});
ok('a retry rebuilds the same fingerprint', FP.a === FP.b, `${FP.a} vs ${FP.b}`);
ok('★ a restore rebuilds the same fingerprint', FP.a === FP.c, `${FP.a} vs ${FP.c}`);
ok('CONTROL: flipping one presence mode CHANGES the fingerprint (it is not a constant)',
   FP.mutated && FP.mutated !== FP.a, `${FP.a} vs ${FP.mutated}`);
ok('re-ordering the participants does NOT change it — order is not identity',
   FP.reordered === FP.a, `${FP.a} vs ${FP.reordered}`);
ok('the canonical form reproduces the issued fingerprint exactly',
   FP.recomputed === FP.a, `${FP.a} vs ${FP.recomputed}`);

// ══ 8. AN UNKNOWN REF POISONS ONLY ITS OWN FACT ══
const POISON = await page.evaluate(() => {
  const st = window._sceneStageContract(window.state, 4);
  const auth = st.stageAuthority;
  const forged = JSON.parse(JSON.stringify(st));
  forged.eventFacts = [
    { text: 'A fact owned by someone this scene never staged',
      participants: [{ ref: 'named:nobody_here', role: 'actor', label: 'Nobody' }] },
    { text: 'A fact owned by a ref the stage really does carry',
      participants: [{ ref: auth.participants[1].ref, role: 'actor', label: auth.participants[1].label }] },
  ];
  // NO FALLBACK. An earlier version of this probe read `window._cpValidateStageRefs ? … : forged`,
  // the function was not exported, and the untouched object reported "not poisoned" — the probe
  // passed its neighbour assertion while proving nothing at all. Absence must fail loudly.
  if (typeof window._cpValidateStageRefs !== 'function') return { absent: true };
  const v = window._cpValidateStageRefs(forged);
  return { facts: (v.eventFacts || []).map(f => ({ poisoned: !!f.refPoisoned, refs: (f.participants || []).length })),
           faults: (v.refFaults || []).map(f => f.ref) };
});
ok('the production ref validator is reachable (no silent fallback)', !POISON.absent, 'window._cpValidateStageRefs is not exported');
ok('the fact with an unknown ref is poisoned and owns nobody',
   POISON.facts[0].poisoned === true && POISON.facts[0].refs === 0, JSON.stringify(POISON.facts[0]));
ok('★ the neighbouring good fact is untouched — poison does not spread',
   POISON.facts[1].poisoned === false && POISON.facts[1].refs === 1, JSON.stringify(POISON.facts[1]));
ok('the unknown ref is reported by name', POISON.faults.join() === 'named:nobody_here', JSON.stringify(POISON.faults));

console.log(`\n${'═'.repeat(78)}\nAUTHORITATIVE CONTINUATION STAGE\n${'═'.repeat(78)}`);
console.log(out.join('\n'));
console.log(`${'─'.repeat(78)}\n ${pass} passed · ${fail} failed\n`);
await ctx.close().catch(() => {});
await browser.close().catch(() => {});
process.exit(fail ? 1 : 0);
