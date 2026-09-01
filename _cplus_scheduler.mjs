// ══════════════════════════════════════════════════════════════════════════════════════════
//  THE CHARACTER+ SCHEDULER SUITE
//
//  Every assertion drives PRODUCTION's own exported functions inside the real page — the
//  scheduler is never reimplemented here, because a copy agrees with itself while disagreeing
//  with what ships. Zero model calls: this is a ledger, and a ledger is testable for free.
//
//  It also carries MUTATION CONTROLS. A suite that only shows green proves nothing about
//  whether it could ever go red, and this project has twice shipped a detector that could not
//  fail. Each control breaks one rule on purpose and asserts the suite notices.
// ══════════════════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core';
import { configBody, installSession, isAuthOrigin } from './_test_session_env.mjs';

let pass = 0, fail = 0;
const results = [];
const ok = (name, cond, detail) => {
  if (cond) { pass++; results.push(`  ✓ ${name}`); }
  else { fail++; results.push(`  ✗ ${name}${detail ? '\n      ' + String(detail).slice(0, 400) : ''}`); }
};

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
  return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });   // no model may be reached
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window.state && window._cpSchedule, { timeout: 60000 });

// A fresh story per case: the ledger is story-owned, and a case that inherited another case's
// history would be testing leakage rather than policy.
const fresh = async (storyId) => page.evaluate((sid) => {
  window.state.storyId = sid;
  window.state._relationshipLedger = null;
  return !!window._relLedger || true;
}, storyId);

const F = (id, cat) => ({ facet_id: id, category: cat });
const CAND = (label, facets, extra) => Object.assign({ label, facet_ids: facets }, extra || {});

// ── THE CONSTANTS COME FROM PRODUCTION, NOT FROM THIS FILE ────────────────────────────────
const K = await page.evaluate(() => window.__CP_SCHED);
ok('constants exported from production', K && K.cooldown === 2 && K.recurrenceFloor === 3
   && K.returnGap === 3 && K.maxPerScene === 2, JSON.stringify(K));

// ══ 0. THE SCHEDULER IS AN OBSERVER ══
// It read the ledger through a helper that CREATES one, so merely planning a scene materialised
// a relationship ledger that had not existed — and the Scene-1 candidate derivation is not
// indifferent to that: a role candidate vanished from the offer. Planning must leave the world
// exactly as it found it.
{
  const r = await page.evaluate(() => {
    window.state.storyId = 'sched-readonly';
    window.state._relationshipLedger = null;
    const before = window.state._relationshipLedger;
    const plan = window._cpSchedule([{ label: 'Someone Unknown', facet_ids: ['f:a'] }], { ordinal: 3, issue: 1 });
    return { before, after: window.state._relationshipLedger, status: plan.decisions[0].status };
  });
  ok('★ scheduling does NOT materialise a relationship ledger',
     r.before === null && r.after === null, `before=${r.before} after=${JSON.stringify(r.after)}`);
  ok('an unresolvable candidate still schedules as an introduction',
     r.status === 'REQUIRED', r.status);
}

// ══ 1. INTRODUCTION FLOOR ══
await fresh('sched-intro');
{
  const r = await page.evaluate(() => window._cpSchedule(
    [{ label: 'Mara Dunn', facet_ids: ['f:value', 'f:defense'] }], { ordinal: 1, issue: 1 }));
  const d = r.decisions[0];
  ok('unknown character → REQUIRED / introduction_floor',
     d.status === 'REQUIRED' && d.reason === 'introduction_floor', JSON.stringify(d));
  ok('introduction floor offers every facet as unspent',
     d.preferFacetIds.length === 2 && d.avoidFacetIds.length === 0, JSON.stringify(d.preferFacetIds));
}

// ══ 2. SCHEDULING ALONE MUTATES NOTHING ══
{
  const dump = await page.evaluate(() => window._cpSchedDump());
  ok('scheduling did NOT write a ledger row (commit happens after prose)',
     !dump || !dump.rows || Object.keys(dump.rows).length === 0, JSON.stringify(dump));
}

// ══ 3. COMMIT, THEN COOLDOWN ══
await fresh('sched-cooldown');
{
  const setup = await page.evaluate(() => {
    // A real entity, so the canonical id is a canonical id and not a label in disguise.
    const id = window._relEntityForName('Mara Dunn', { create: true });
    const c = window._cpCommitScene({ sceneUid: 'S1', ordinal: 1, issue: 1,
      delivered: [{ canonicalId: id, facet_id: 'f:value', category: 'value' }], appeared: [] });
    return { id, c, row: window._cpSchedRow(id) };
  });
  ok('commit records the spend on the canonical row',
     setup.c.ok && setup.row && setup.row.cplus_count === 1
     && setup.row.used_facet_ids.join() === 'f:value' && setup.row.used_categories.join() === 'value',
     JSON.stringify(setup.row));

  const s2 = await page.evaluate((id) => window._cpSchedule(
    [{ label: 'Mara Dunn', canonicalId: id, facet_ids: ['f:value', 'f:defense'] }], { ordinal: 2, issue: 1 }), setup.id);
  ok('one scene later → SUPPRESSED / cooldown',
     s2.decisions[0].status === 'SUPPRESSED' && s2.decisions[0].reason === 'cooldown', JSON.stringify(s2.decisions[0]));

  const s3 = await page.evaluate((id) => window._cpSchedule(
    [{ label: 'Mara Dunn', canonicalId: id, facet_ids: ['f:value', 'f:defense'] }], { ordinal: 3, issue: 1 }), setup.id);
  ok('at the cooldown boundary (2 scenes) still SUPPRESSED',
     s3.decisions[0].status === 'SUPPRESSED', JSON.stringify(s3.decisions[0]));

  const s4 = await page.evaluate((id) => window._cpSchedule(
    [{ label: 'Mara Dunn', canonicalId: id, facet_ids: ['f:value', 'f:defense'] }], { ordinal: 4, issue: 1 }), setup.id);
  ok('past the cooldown → ALLOWED', s4.decisions[0].status === 'ALLOWED', JSON.stringify(s4.decisions[0]));
  ok('novelty: the spent facet is in avoid, the unspent one in prefer',
     s4.decisions[0].avoidFacetIds.join() === 'f:value' && s4.decisions[0].preferFacetIds.join() === 'f:defense',
     JSON.stringify(s4.decisions[0]));
}

// ══ 4. OVERRIDES ══
await fresh('sched-override');
{
  const id = await page.evaluate(() => {
    const id = window._relEntityForName('Mara Dunn', { create: true });
    window._cpCommitScene({ sceneUid: 'S1', ordinal: 1, issue: 1,
      delivered: [{ canonicalId: id, facet_id: 'f:value', category: 'value' }], appeared: [] });
    return id;
  });
  const withOv = await page.evaluate((id) => window._cpSchedule(
    [{ label: 'Mara', canonicalId: id, facet_ids: ['f:value', 'f:defense'] }],
    { ordinal: 2, issue: 1, overrides: { Mara: 'contradiction' } }), id);
  ok('a contradiction override breaks cooldown → ALLOWED',
     withOv.decisions[0].status === 'ALLOWED' && /cooldown_override:contradiction/.test(withOv.decisions[0].reason),
     JSON.stringify(withOv.decisions[0]));

  const bogus = await page.evaluate((id) => window._cpSchedule(
    [{ label: 'Mara', canonicalId: id, facet_ids: ['f:value', 'f:defense'] }],
    { ordinal: 2, issue: 1, overrides: { Mara: 'because I said so' } }), id);
  ok('an unrecognised override reason is ignored, not honoured',
     bogus.decisions[0].status === 'SUPPRESSED', JSON.stringify(bogus.decisions[0]));

  const unbacked = await page.evaluate((id) => window._cpSchedule(
    [{ label: 'Mara', canonicalId: id, facet_ids: ['f:value'] }],
    { ordinal: 2, issue: 1, overrides: { Mara: 'new_facet' } }), id);
  ok('a new_facet override with no unspent facet is REFUSED',
     unbacked.decisions[0].status === 'SUPPRESSED' && unbacked.decisions[0].reason === 'cooldown_override_unbacked',
     JSON.stringify(unbacked.decisions[0]));
}

// ══ 5. RECURRENCE FLOOR OUTRANKS COOLDOWN ══
await fresh('sched-recurrence');
{
  const id = await page.evaluate(() => {
    const id = window._relEntityForName('Tom Reed', { create: true });
    window._cpCommitScene({ sceneUid: 'S1', ordinal: 1, issue: 1,
      delivered: [{ canonicalId: id, facet_id: 'f:value', category: 'value' }], appeared: [] });
    [2, 3, 4].forEach(n => window._cpCommitScene({ sceneUid: 'S' + n, ordinal: n, issue: 1,
      delivered: [], appeared: [{ canonicalId: id }] }));
    return id;
  });
  const row = await page.evaluate((id) => window._cpSchedRow(id), id);
  ok('three unrewarded appearances accrue on the row',
     row.meaningful_appearances_since_cplus === 3, JSON.stringify(row));
  const s = await page.evaluate((id) => window._cpSchedule(
    [{ label: 'Tom Reed', canonicalId: id, facet_ids: ['f:value', 'f:defense'] }], { ordinal: 5, issue: 1 }), id);
  ok('recurrence floor forces a beat → REQUIRED',
     s.decisions[0].status === 'REQUIRED' && s.decisions[0].reason === 'recurrence_floor', JSON.stringify(s.decisions[0]));

  // THE ORDERING CLAIM ITSELF: the floor must win while the cooldown is ALSO true.
  const clash = await page.evaluate((id) => {
    window._cpCommitScene({ sceneUid: 'S5', ordinal: 5, issue: 1,
      delivered: [{ canonicalId: id, facet_id: 'f:defense', category: 'defense' }], appeared: [] });
    [6, 7, 8].forEach(n => window._cpCommitScene({ sceneUid: 'S' + n, ordinal: n, issue: 1,
      delivered: [], appeared: [{ canonicalId: id }] }));
    // ordinal 6 is INSIDE the cooldown from the scene-5 beat, and the floor is also satisfied.
    return window._cpSchedule([{ label: 'Tom Reed', canonicalId: id, facet_ids: ['f:value', 'f:habit'] }],
      { ordinal: 6, issue: 1 });
  }, id);
  ok('floor beats cooldown when both apply',
     clash.decisions[0].status === 'REQUIRED' && clash.decisions[0].reason === 'recurrence_floor',
     JSON.stringify(clash.decisions[0]));
}

// ══ 6. RETURN AFTER ABSENCE / LATER ISSUE ══
await fresh('sched-return');
{
  const id = await page.evaluate(() => {
    const id = window._relEntityForName('Seren', { create: true });
    window._cpCommitScene({ sceneUid: 'S1', ordinal: 1, issue: 1,
      delivered: [{ canonicalId: id, facet_id: 'f:value', category: 'value' }], appeared: [] });
    return id;
  });
  const away = await page.evaluate((id) => window._cpSchedule(
    [{ label: 'Seren', canonicalId: id, facet_ids: ['f:value', 'f:defense'] }], { ordinal: 9, issue: 1 }), id);
  ok('a return after ≥3 scenes away → REQUIRED / return_after_absence',
     away.decisions[0].status === 'REQUIRED' && away.decisions[0].reason === 'return_after_absence',
     JSON.stringify(away.decisions[0]));
  const later = await page.evaluate((id) => window._cpSchedule(
    [{ label: 'Seren', canonicalId: id, facet_ids: ['f:value', 'f:defense'] }], { ordinal: 2, issue: 2 }), id);
  ok('a later issue → REQUIRED / return_later_issue',
     later.decisions[0].status === 'REQUIRED' && later.decisions[0].reason === 'return_later_issue',
     JSON.stringify(later.decisions[0]));
}

// ══ 6b. THE OPENING SCENE DOES NOT CONSULT HISTORY ══
// A row can exist at scene one only because a previous telling wrote it — a regenerate, a
// restored draft. Suppressing an introduction on that basis would open the story by withholding
// the beat that introduces the cast, which is the opposite of what the floor is for.
await fresh('sched-opening');
{
  const r = await page.evaluate(() => {
    const id = window._relEntityForName('Seren', { create: true });
    window._cpCommitScene({ sceneUid: 'OLD', ordinal: 1, issue: 1,
      delivered: [{ canonicalId: id, facet_id: 'f:value', category: 'value' }], appeared: [] });
    return { opening: window._cpSchedule([{ label: 'Seren', canonicalId: id, facet_ids: ['f:value', 'f:defense'] }],
               { ordinal: 1, issue: 1, opening: true }).decisions[0],
             normal:  window._cpSchedule([{ label: 'Seren', canonicalId: id, facet_ids: ['f:value', 'f:defense'] }],
               { ordinal: 1, issue: 1 }).decisions[0] };
  });
  ok('an opening scene ignores stale history → REQUIRED',
     r.opening.status === 'REQUIRED' && r.opening.opening === true, JSON.stringify(r.opening));
  ok('the SAME state outside an opening does suppress — so the opening flag is what changed it',
     r.normal.status === 'SUPPRESSED', JSON.stringify(r.normal));
  ok('an opening still reports the spent facet for novelty, it just does not veto',
     r.opening.avoidFacetIds.join() === 'f:value', JSON.stringify(r.opening.avoidFacetIds));
}

// An opening is still subject to density — that rule is about THIS scene, not earlier ones.
{
  const d = await page.evaluate(() => window._cpSchedule(
    [{ label: 'A', facet_ids: ['a'] }, { label: 'B', facet_ids: ['b'] }, { label: 'C', facet_ids: ['c'] }],
    { ordinal: 1, issue: 1, opening: true }));
  ok('density still staggers an opening with three candidates',
     d.decisions.filter(x => x.status === 'DEFERRED').length === 1,
     JSON.stringify(d.decisions.map(x => x.label + ':' + x.status)));
}

// ══ 7. DENSITY ══
await fresh('sched-density');
{
  const s = await page.evaluate(() => window._cpSchedule(
    [{ label: 'A', facet_ids: ['a1'] }, { label: 'B', facet_ids: ['b1'] }, { label: 'C', facet_ids: ['c1'] }],
    { ordinal: 1, issue: 1 }));
  const live = s.decisions.filter(d => d.status === 'REQUIRED' || d.status === 'ALLOWED');
  const def = s.decisions.filter(d => d.status === 'DEFERRED');
  ok('three introductions → two live, one deferred', live.length === 2 && def.length === 1,
     JSON.stringify(s.decisions.map(d => d.label + ':' + d.status)));
  ok('the deferred one names density, and remembers what it was deferred from',
     def[0].reason === 'density_cap' && def[0].deferredFrom === 'introduction_floor', JSON.stringify(def[0]));
  ok('deferral is deterministic — the last candidate is the one held back',
     def[0].label === 'C', def[0].label);

  // A DEFERRED character must keep accruing, or "staggered" quietly means "dropped".
  const kept = await page.evaluate(() => {
    const id = window._relEntityForName('C', { create: true });
    window._cpCommitScene({ sceneUid: 'D1', ordinal: 1, issue: 1, delivered: [], appeared: [{ canonicalId: id }] });
    return window._cpSchedRow(id);
  });
  ok('a deferred character still accrues a meaningful appearance',
     kept && kept.meaningful_appearances_since_cplus === 1, JSON.stringify(kept));
}

// ══ 7b. DENSITY MUST NOT BE SPENT ON A BEAT THAT CANNOT BE WRITTEN ══
// The Scene-1 candidate list carries people the scene proved nothing about, so their absence can
// be reported. Counting them against the two-beat cap pushed a fully grounded candidate out of
// the offer — the scene lost a real Character+ to hold a slot for an impossible one. The caller
// is what filters; this asserts the arithmetic the caller depends on.
await fresh('sched-density-realisable');
{
  const r = await page.evaluate(() => {
    const all = [{ label: 'Grounded A', facet_ids: ['a'] },
                 { label: 'Optionless', facet_ids: [] },
                 { label: 'Grounded B', facet_ids: ['b'] }];
    const naive = window._cpSchedule(all, { ordinal: 1, issue: 1, opening: true });
    const realisable = window._cpSchedule(all.filter(c => c.facet_ids.length),
      { ordinal: 1, issue: 1, opening: true });
    return { naive: naive.decisions.map(d => d.label + ':' + d.status),
             realisable: realisable.decisions.map(d => d.label + ':' + d.status) };
  });
  ok('CONTROL: counting an optionless candidate DOES push a grounded one out',
     r.naive.indexOf('Grounded B:DEFERRED') !== -1, JSON.stringify(r.naive));
  ok('filtering to realisable candidates keeps both grounded ones live',
     r.realisable.every(x => /:(REQUIRED|ALLOWED)$/.test(x)) && r.realisable.length === 2,
     JSON.stringify(r.realisable));
}

// ══ 7c. A DEFERRED CANDIDATE MUST ACTUALLY GET THE NEXT SLOT ══
// Deterministic ordering is what makes density a stagger rather than a cull — but determinism
// cuts both ways: if the ordering is stable AND the same characters keep coming due, the same
// third candidate is deferred forever and "staggered" quietly means "never". This walks three
// simultaneously-due candidates across consecutive scenes and asserts the deferred one is served
// next, out of the ledger rather than out of luck.
await fresh('sched-starvation');
{
  const r = await page.evaluate(() => {
    const ids = {};
    ['A', 'B', 'C'].forEach(n => { ids[n] = window._relEntityForName(n, { create: true }); });
    const cands = () => ['A', 'B', 'C'].map(n => ({ label: n, canonicalId: ids[n], facet_ids: ['f1:' + n, 'f2:' + n] }));
    const trace = [];
    // Scene 1 — an opening: all three are introductions, the cap serves two.
    const s1 = window._cpSchedule(cands(), { ordinal: 1, issue: 1, opening: true });
    trace.push({ scene: 1, d: s1.decisions.map(x => x.label + ':' + x.status) });
    // Commit what the cap allowed. The third was on stage and simply did not receive a beat.
    window._cpCommitScene({ sceneUid: 'S1', ordinal: 1, issue: 1,
      delivered: s1.decisions.filter(x => x.status !== 'DEFERRED')
        .map(x => ({ canonicalId: x.canonicalId, facet_id: x.preferFacetIds[0], category: 'value' })),
      appeared: s1.decisions.filter(x => x.status === 'DEFERRED').map(x => ({ canonicalId: x.canonicalId })) });
    const s2 = window._cpSchedule(cands(), { ordinal: 2, issue: 1 });
    trace.push({ scene: 2, d: s2.decisions.map(x => x.label + ':' + x.status + ':' + x.reason) });
    return { trace, s1: s1.decisions, s2: s2.decisions,
             rows: ['A', 'B', 'C'].map(n => ({ n, row: window._cpSchedRow(ids[n]) })) };
  });
  const deferred1 = r.s1.filter(d => d.status === 'DEFERRED').map(d => d.label);
  ok('scene 1: the cap serves two and defers exactly one',
     deferred1.length === 1 && r.s1.filter(d => d.status !== 'DEFERRED').length === 2, JSON.stringify(r.trace[0]));

  const held = deferred1[0];
  const next = r.s2.find(d => d.label === held);
  ok(`scene 2: the deferred candidate (${held}) is served, not deferred again`,
     next && (next.status === 'REQUIRED' || next.status === 'ALLOWED'), JSON.stringify(next));
  ok('scene 2: the two who were served are now on cooldown, which is what frees the slot',
     r.s2.filter(d => d.label !== held).every(d => d.status === 'SUPPRESSED' && d.reason === 'cooldown'),
     JSON.stringify(r.trace[1]));
  ok('the deferred candidate reached scene 2 with an appearance on the books, not a blank row',
     (r.rows.find(x => x.n === held).row || {}).meaningful_appearances_since_cplus === 1,
     JSON.stringify(r.rows.find(x => x.n === held)));
  ok('★ nobody is starved: across the two scenes all three are served exactly once',
     ['A', 'B', 'C'].every(n => {
       const inS1 = r.s1.find(d => d.label === n).status !== 'DEFERRED';
       const inS2 = ['REQUIRED', 'ALLOWED'].indexOf(r.s2.find(d => d.label === n).status) !== -1;
       return inS1 !== inS2;                      // served in exactly one of the two scenes
     }), JSON.stringify(r.trace));
}

// ══ 8. THE OFFER FILTER ══
await fresh('sched-filter');
{
  const r = await page.evaluate(() => {
    const opts = [{ option_id: 'OPT-1', recipient: 'A', facet_id: 'a1' },
                  { option_id: 'OPT-2', recipient: 'A', facet_id: 'a2' },
                  { option_id: 'OPT-3', recipient: 'B', facet_id: 'b1' }];
    const plan = { decisions: [{ label: 'A', status: 'ALLOWED', avoidFacetIds: ['a1'] },
                               { label: 'B', status: 'SUPPRESSED', avoidFacetIds: [] }] };
    return window._cpApplySchedule(opts, plan);
  });
  ok('a suppressed character has no offerable option', !r.some(o => o.recipient === 'B'), JSON.stringify(r));
  ok('novelty demotes the spent facet when an unspent one exists',
     r.length === 1 && r[0].facet_id === 'a2', JSON.stringify(r));
  ok('the renumbered offer keeps a link back to the composed option',
     r[0].option_id === 'OPT-1' && r[0].source_option_id === 'OPT-2', JSON.stringify(r[0]));

  const starve = await page.evaluate(() => {
    const opts = [{ option_id: 'OPT-1', recipient: 'A', facet_id: 'a1' }];
    const plan = { decisions: [{ label: 'A', status: 'REQUIRED', avoidFacetIds: ['a1'] }] };
    return window._cpApplySchedule(opts, plan);
  });
  ok('novelty never starves a REQUIRED character of their only option',
     starve.length === 1 && starve[0].facet_id === 'a1', JSON.stringify(starve));
}

// ══ 9. COMMIT IDEMPOTENCY AND REFUSAL ══
await fresh('sched-idem');
{
  const r = await page.evaluate(() => {
    const id = window._relEntityForName('Mara Dunn', { create: true });
    const a = window._cpCommitScene({ sceneUid: 'S1', ordinal: 1, issue: 1,
      delivered: [{ canonicalId: id, facet_id: 'f:value', category: 'value' }], appeared: [] });
    const b = window._cpCommitScene({ sceneUid: 'S1', ordinal: 1, issue: 1,
      delivered: [{ canonicalId: id, facet_id: 'f:value', category: 'value' }], appeared: [] });
    const noUid = window._cpCommitScene({ ordinal: 2, delivered: [{ canonicalId: id, facet_id: 'x' }] });
    return { a, b, noUid, row: window._cpSchedRow(id) };
  });
  ok('a repeated commit for the same scene uid is a noop',
     r.b.code === 'noop_already_committed' && r.row.cplus_count === 1, JSON.stringify(r.row));
  ok('a commit with no scene uid is refused (no idempotency key)',
     r.noUid.ok === false && r.noUid.code === 'no_scene_uid', JSON.stringify(r.noUid));
}

// ══ 10. IDENTITY — THE PART THAT CORRUPTS SILENTLY ══
await fresh('sched-identity');
{
  const r = await page.evaluate(() => {
    // Two different people who share a display name.
    const a = window._relEntityForName('Jordan', { create: true, canonicalId: 'cast-1' });
    const b = window._relEntityForName('Jordan', { create: true, canonicalId: 'cast-2' });
    window._cpCommitScene({ sceneUid: 'S1', ordinal: 1, issue: 1,
      delivered: [{ canonicalId: a, facet_id: 'f:value', category: 'value' }], appeared: [] });
    // A candidate carrying only the shared LABEL must not inherit either person's history.
    const byLabel = window._cpSchedule([{ label: 'Jordan', facet_ids: ['f:value'] }], { ordinal: 2, issue: 1 });
    // The candidate carrying the real id must.
    const byId = window._cpSchedule([{ label: 'Jordan', canonicalId: a, facet_ids: ['f:value'] }], { ordinal: 2, issue: 1 });
    return { a, b, distinct: a !== b, byLabel: byLabel.decisions[0], byId: byId.decisions[0] };
  });
  ok('two people sharing a name are two entities', r.distinct, `${r.a} / ${r.b}`);
  ok('an ambiguous label inherits NO history (fails closed to introduction)',
     r.byLabel.status === 'REQUIRED' && r.byLabel.reason === 'introduction_floor', JSON.stringify(r.byLabel));
  ok('the canonical id does carry the history',
     r.byId.status === 'SUPPRESSED' && r.byId.reason === 'cooldown', JSON.stringify(r.byId));
}

// ══ 11. SUPERSESSION — HISTORY FOLLOWS THE PERSON ══
await fresh('sched-supersede');
{
  const r = await page.evaluate(() => {
    // A role node hangs off an anchor and a slot from REL_SLOT_TYPE — the production signature,
    // not an invented one. `mentor` is a SOCIAL slot and belongs to a different constructor;
    // passing it here returned null and the case skipped itself, which is how a test proves
    // nothing while still looking present in the output.
    const roleId = window._relRoleEntity ? window._relRoleEntity(window._relPcId(), 'mother', { label: 'her mother' }) : null;
    if (!roleId) return { skipped: true };
    window._cpCommitScene({ sceneUid: 'S1', ordinal: 1, issue: 1,
      delivered: [{ canonicalId: roleId, facet_id: 'f:value', category: 'value' }], appeared: [] });
    const named = window._relEntityForName('Alaric', { create: true });
    const led = window.state._relationshipLedger;
    led.entities[roleId].supersededBy = named;                 // the role resolves to a person
    const viaRole = window._cpSchedule([{ label: 'the concierge', canonicalId: roleId, facet_ids: ['f:value'] }],
      { ordinal: 2, issue: 1 });
    return { roleId, named, viaRole: viaRole.decisions[0], row: window._cpSchedRow(roleId) };
  });
  ok('the supersession case actually constructed a role node', !r.skipped, 'role entity helper returned null');
  if (r.skipped) { /* the assertion above already failed loudly */ }
  else {
    ok('a superseded role resolves to the named person', r.viaRole.canonicalId === r.named,
       `${r.viaRole.canonicalId} vs ${r.named}`);
    ok('the reader of a superseded id sees the history it now belongs to',
       r.viaRole.status === 'SUPPRESSED', JSON.stringify(r.viaRole));
  }
}

// ══ 11b. MERGE — WHEN BOTH IDENTITIES ALREADY HAVE HISTORY ══
// The migration's hard case: a character accrued a record under a role AND under a name before
// the two were reconciled. Merging is not optional here — dropping either side loses beats the
// reader was actually shown.
await fresh('sched-merge');
{
  const r = await page.evaluate(() => {
    const roleId = window._relRoleEntity(window._relPcId(), 'mother', { label: 'her mother' });
    const named = window._relEntityForName('Alaric', { create: true });
    window._cpCommitScene({ sceneUid: 'R1', ordinal: 1, issue: 1,
      delivered: [{ canonicalId: roleId, facet_id: 'f:value', category: 'value' }], appeared: [] });
    window._cpCommitScene({ sceneUid: 'R2', ordinal: 2, issue: 1, delivered: [], appeared: [{ canonicalId: roleId }] });
    window._cpCommitScene({ sceneUid: 'N1', ordinal: 4, issue: 1,
      delivered: [{ canonicalId: named, facet_id: 'f:defense', category: 'defense' }], appeared: [] });
    window.state._relationshipLedger.entities[roleId].supersededBy = named;
    const row = window._cpSchedRow(named);
    return { roleId, named, row, dump: window._cpSchedDump() };
  });
  ok('both spent facets survive the merge',
     r.row.used_facet_ids.indexOf('f:value') !== -1 && r.row.used_facet_ids.indexOf('f:defense') !== -1,
     JSON.stringify(r.row.used_facet_ids));
  ok('both categories survive the merge',
     r.row.used_categories.indexOf('value') !== -1 && r.row.used_categories.indexOf('defense') !== -1,
     JSON.stringify(r.row.used_categories));
  ok('beat counts add up across the two identities', r.row.cplus_count === 2, JSON.stringify(r.row.cplus_count));
  ok('the most recent beat wins as a UNIT (uid and ordinal from the same row)',
     r.row.last_cplus_scene_uid === 'N1' && r.row.last_cplus_scene_ordinal === 4, JSON.stringify(r.row));
  ok('the donor row is removed, not left as a second copy of the person',
     !r.dump.rows[r.roleId] && !!r.dump.rows[r.named], Object.keys(r.dump.rows).join());
  ok('the merge records where the history came from',
     (r.row.mergedFrom || []).indexOf(r.roleId) !== -1, JSON.stringify(r.row.mergedFrom));

  // Appearances take the MAX, never the sum — the same scene can be counted under both names.
  const app = await page.evaluate(() => {
    window.state.storyId = 'sched-merge-app';
    window.state._relationshipLedger = null;
    const roleId = window._relRoleEntity(window._relPcId(), 'mother', { label: 'her mother' });
    const named = window._relEntityForName('Alaric', { create: true });
    window._cpCommitScene({ sceneUid: 'A1', ordinal: 1, issue: 1, delivered: [], appeared: [{ canonicalId: roleId }] });
    window._cpCommitScene({ sceneUid: 'A2', ordinal: 2, issue: 1, delivered: [], appeared: [{ canonicalId: roleId }] });
    window._cpCommitScene({ sceneUid: 'A3', ordinal: 3, issue: 1, delivered: [], appeared: [{ canonicalId: named }] });
    window.state._relationshipLedger.entities[roleId].supersededBy = named;
    return window._cpSchedRow(named);
  });
  ok('unrewarded appearances merge by MAX, not by sum (2 and 1 → 2)',
     app.meaningful_appearances_since_cplus === 2, JSON.stringify(app));
}

// ══ 12. STORY OWNERSHIP ══
{
  const r = await page.evaluate(() => {
    window.state.storyId = 'story-A';
    window.state._relationshipLedger = null;
    const id = window._relEntityForName('Mara Dunn', { create: true });
    window._cpCommitScene({ sceneUid: 'S1', ordinal: 1, issue: 1,
      delivered: [{ canonicalId: id, facet_id: 'f:value', category: 'value' }], appeared: [] });
    const inA = window._cpSchedule([{ label: 'Mara Dunn', canonicalId: id, facet_ids: ['f:value'] }], { ordinal: 2 });
    window.state.storyId = 'story-B';                      // a different story, same state object
    const inB = window._cpSchedule([{ label: 'Mara Dunn', canonicalId: id, facet_ids: ['f:value'] }], { ordinal: 2 });
    return { inA: inA.decisions[0], inB: inB.decisions[0], dumpB: window._cpSchedDump() };
  });
  ok('history applies inside its own story', r.inA.status === 'SUPPRESSED', JSON.stringify(r.inA));
  ok('★ history does NOT leak into another story',
     r.inB.status === 'REQUIRED' && r.inB.reason === 'introduction_floor', JSON.stringify(r.inB));
}

// ══ 13. SAVE / RESTORE ══
{
  const r = await page.evaluate(() => {
    window.state.storyId = 'story-persist';
    window.state._relationshipLedger = null;
    const id = window._relEntityForName('Mara Dunn', { create: true });
    window._cpCommitScene({ sceneUid: 'S1', ordinal: 1, issue: 1,
      delivered: [{ canonicalId: id, facet_id: 'f:value', category: 'value' }], appeared: [] });
    const snap = JSON.stringify(window.state._relationshipLedger);      // the save path's shape
    window.state._relationshipLedger = null;                            // reload
    window.state._relationshipLedger = JSON.parse(snap);
    return { after: window._cpSchedule([{ label: 'Mara Dunn', canonicalId: id, facet_ids: ['f:value'] }],
      { ordinal: 2, issue: 1 }).decisions[0], row: window._cpSchedRow(id) };
  });
  ok('the ledger survives a serialize/restore round trip',
     r.after.status === 'SUPPRESSED' && r.row && r.row.cplus_count === 1, JSON.stringify(r.row));
}

// ══ 14. MUTATION CONTROLS — can this suite go red at all? ══
{
  const m = await page.evaluate(() => {
    const out = {};
    window.state.storyId = 'story-mutate';
    window.state._relationshipLedger = null;
    const id = window._relEntityForName('Mara Dunn', { create: true });
    window._cpCommitScene({ sceneUid: 'S1', ordinal: 1, issue: 1,
      delivered: [{ canonicalId: id, facet_id: 'f:value', category: 'value' }], appeared: [] });
    // CONTROL A: corrupt the row's ordinal so the cooldown cannot be computed as recent.
    const row = window._cpSchedRow(id);
    const keep = row.last_cplus_scene_ordinal;
    row.last_cplus_scene_ordinal = -999;
    out.cooldownDetectable = window._cpSchedule([{ label: 'Mara Dunn', canonicalId: id, facet_ids: ['f:value'] }],
      { ordinal: 2, issue: 1 }).decisions[0].status;
    row.last_cplus_scene_ordinal = keep;
    // CONTROL B: erase the spend and confirm novelty stops reporting it.
    const keepF = row.used_facet_ids.slice();
    row.used_facet_ids = [];
    out.noveltyDetectable = window._cpSchedule([{ label: 'Mara Dunn', canonicalId: id, facet_ids: ['f:value', 'f:x'] }],
      { ordinal: 5, issue: 1 }).decisions[0].avoidFacetIds.length;
    row.used_facet_ids = keepF;
    out.noveltyRestored = window._cpSchedule([{ label: 'Mara Dunn', canonicalId: id, facet_ids: ['f:value', 'f:x'] }],
      { ordinal: 5, issue: 1 }).decisions[0].avoidFacetIds.length;
    return out;
  });
  ok('CONTROL: a corrupted last-beat ordinal stops the cooldown firing (the check is live)',
     m.cooldownDetectable !== 'SUPPRESSED', m.cooldownDetectable);
  ok('CONTROL: erasing the spend list empties the novelty avoid-set (the check is live)',
     m.noveltyDetectable === 0 && m.noveltyRestored === 1, JSON.stringify(m));
}

console.log(`\n${'═'.repeat(78)}\nCHARACTER+ SCHEDULER\n${'═'.repeat(78)}`);
console.log(results.join('\n'));
console.log(`${'─'.repeat(78)}\n ${pass} passed · ${fail} failed\n`);
await ctx.close().catch(() => {});
await browser.close().catch(() => {});
process.exit(fail ? 1 : 0);
