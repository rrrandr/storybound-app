// ══════════════════════════════════════════════════════════════════════════════════════════
//  THE POST-RENDER RECONCILIATION BRIDGE
//
//  A legacy scene cannot be given a Character+ — that page is already read. What it must not do
//  is ERASE the fact that a character was in it. The bridge lets the post-render disclosure pass
//  record the appearance so a later authoritative scene inherits it.
//
//  It improves FUTURE scheduling only. It does not recover the missed opportunity inside the
//  legacy scene, and nothing here should be read as claiming otherwise.
// ══════════════════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core';
import { configBody, installSession, isAuthOrigin } from './_test_session_env.mjs';

let pass = 0, fail = 0; const log = [];
const ok = (n, c, d) => { if (c) { pass++; log.push(`  ✓ ${n}`); } else { fail++; log.push(`  ✗ ${n}${d ? '\n      ' + String(d).slice(0, 400) : ''}`); } };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext(); const page = await ctx.newPage();
await installSession(page);
let escaped = 0;
await page.route('**/*', async route => {
  const url = route.request().url(); const path = url.replace(/^https?:\/\/[^/]+/, '');
  if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (!/\/api\//.test(path)) return route.continue();
  if (/\/api\/config\b/.test(path)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  if (/\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini-proxy)\b/.test(path)) escaped++;
  return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window._cpCommitScene && window._cpSchedRow, { timeout: 60000 });

const fresh = (sid) => page.evaluate((s) => {
  const st = window.state;
  st.storyId = s; st._relationshipLedger = null;
  st.playerName = 'Ilse'; st.name = 'Ilse'; st.loveInterestName = 'Adan'; st.partnerName = 'Adan';
  const id = window._relEntityForName('Julian', { create: true });
  return { id };
}, sid);

// ══ 3. ONLY FINALIZED PROSE CREATES MEMORY ══
const FINAL = await page.evaluate(() => {
  const s = window.state;
  s.storyId = 'bridge-final'; s._relationshipLedger = null;
  const id = window._relEntityForName('Julian', { create: true });
  // A PLANNED appearance: the scheduler is consulted, the scene is never finalized.
  window._cpSchedule([{ label: 'Julian', canonicalId: id, facet_ids: [] }], { ordinal: 3, issue: 1 });
  const afterPlanning = window._cpSchedRow(id);
  // A FAILED page: no sceneUid to key it by.
  const noUid = window._cpCommitScene({ ordinal: 3, issue: 1, delivered: [], appeared: [{ canonicalId: id }] });
  // An EXTRACTION FAILURE: a name that resolves to nobody.
  const unresolved = window._cpCommitScene({ sceneUid: 'F1', ordinal: 3, issue: 1, delivered: [],
    appeared: [{ label: 'Somebody Nobody Knows', canonicalId: window._cpCanonicalIdFor({ label: 'Somebody Nobody Knows' }) }] });
  const afterFailures = window._cpSchedRow(id);
  // The finalized one.
  window._cpCommitScene({ sceneUid: 'S3', ordinal: 3, issue: 1, delivered: [], appeared: [{ canonicalId: id, presence: 'IN_PERSON' }] });
  return { afterPlanning, noUid, unresolved, after: window._cpSchedRow(id) };
});
ok('★ consulting the scheduler creates NO memory — planning is not finalizing',
   FINAL.afterPlanning === null, JSON.stringify(FINAL.afterPlanning));
ok('★ a commit with no scene uid is refused — a failed page cannot be keyed',
   FINAL.noUid.ok === false && FINAL.noUid.code === 'no_scene_uid', JSON.stringify(FINAL.noUid));
ok('★ an unresolvable name records NOTHING — a failed extraction is silent, not a guess',
   (FINAL.unresolved.appearances || []).length === 0
   && (FINAL.unresolved.unresolved || []).length === 1, JSON.stringify(FINAL.unresolved));
ok('only the finalized scene incremented the count',
   FINAL.after.meaningful_appearances_since_cplus === 1, JSON.stringify(FINAL.after.meaningful_appearances_since_cplus));

// ══ 4. RECONCILIATION, NOT REPLACEMENT ══
const REC = await page.evaluate(() => {
  const s = window.state;
  s.storyId = 'bridge-rec'; s._relationshipLedger = null;
  const id = window._relEntityForName('Julian', { create: true });
  // The authoritative stage records the appearance for scene 4…
  window._cpCommitScene({ sceneUid: 'S4', ordinal: 4, issue: 1, delivered: [],
    appeared: [{ canonicalId: id, presence: 'REPORTED' }] });
  const afterStage = JSON.parse(JSON.stringify(window._cpSchedRow(id)));
  // …and the post-render extractor reports the SAME scene.
  const second = window._cpCommitScene({ sceneUid: 'S4', ordinal: 4, issue: 1, delivered: [],
    appeared: [{ canonicalId: id, presence: 'IN_PERSON', source: 'disclosure_post_render' }] });
  return { afterStage, second, after: window._cpSchedRow(id) };
});
ok('★ two sightings of ONE scene produce ONE appearance',
   REC.after.meaningful_appearances_since_cplus === 1, JSON.stringify(REC.after.meaningful_appearances_since_cplus));
ok('★ the second sighting is a noop on the same scene uid, not a second occurrence',
   REC.second.code === 'noop_already_committed', JSON.stringify(REC.second.code));
ok('the mode recorded by the authoritative stage stands',
   REC.after.appearancesByMode.REPORTED === 1 && REC.after.appearancesByMode.IN_PERSON === 0,
   JSON.stringify(REC.after.appearancesByMode));

// ══ 5. MODES STAY DISTINCT; UNKNOWN NEVER BECOMES IN_PERSON ══
const MODE = await page.evaluate(() => {
  const s = window.state;
  s.storyId = 'bridge-mode'; s._relationshipLedger = null;
  const id = window._relEntityForName('Julian', { create: true });
  [['M1', 'IN_PERSON'], ['M2', 'RECALLED'], ['M3', 'REPORTED'], ['M4', 'ANTICIPATED'], ['M5', null]]
    .forEach(([uid, mode], i) => window._cpCommitScene({ sceneUid: uid, ordinal: i + 1, issue: 1,
      delivered: [], appeared: [{ canonicalId: id, presence: mode }] }));
  return window._cpSchedRow(id);
});
ok('★ all four modes are recorded distinctly',
   MODE.appearancesByMode.IN_PERSON === 1 && MODE.appearancesByMode.RECALLED === 1
   && MODE.appearancesByMode.REPORTED === 1 && MODE.appearancesByMode.ANTICIPATED === 1,
   JSON.stringify(MODE.appearancesByMode));
ok('★ an UNKNOWN mode is recorded as unknown — it never silently becomes IN_PERSON',
   MODE.appearancesByMode.unknown === 1 && MODE.appearancesByMode.IN_PERSON === 1,
   JSON.stringify(MODE.appearancesByMode));
ok('★ …and it DOES count toward the general appearance floor (5 sightings, 5 counted)',
   MODE.meaningful_appearances_since_cplus === 5, JSON.stringify(MODE.meaningful_appearances_since_cplus));

// ══ 6. IDENTITY SAFETY ══
const ID = await page.evaluate(() => {
  const s = window.state;
  s.storyId = 'bridge-id'; s._relationshipLedger = null;
  s.playerName = 'Ilse'; s.name = 'Ilse'; s.loveInterestName = 'Adan'; s.partnerName = 'Adan';
  const a = window._relEntityForName('Robin', { create: true, canonicalId: 'cast-a' });
  const b = window._relEntityForName('Robin', { create: true, canonicalId: 'cast-b' });
  window._cpCommitScene({ sceneUid: 'I1', ordinal: 1, issue: 1, delivered: [], appeared: [{ canonicalId: a, presence: 'IN_PERSON' }] });
  const sameName = { a: window._cpSchedRow(a).meaningful_appearances_since_cplus,
                     b: window._cpSchedRow(b) };
  // An ambiguous LABEL must record nothing rather than pick one.
  const amb = window._cpCommitScene({ sceneUid: 'I2', ordinal: 2, issue: 1, delivered: [],
    appeared: [{ label: 'Robin', canonicalId: window._cpCanonicalIdFor({ label: 'Robin' }) }] });
  // A renamed PC must not lose her history.
  const pc = window._relPcId();
  window._cpCommitScene({ sceneUid: 'I3', ordinal: 3, issue: 1, delivered: [], appeared: [{ canonicalId: pc, presence: 'IN_PERSON' }] });
  const beforeRename = window._cpSchedRow(pc).meaningful_appearances_since_cplus;
  s.playerName = 'Renamed'; s.name = 'Renamed';
  const afterRename = window._cpSchedRow(pc).meaningful_appearances_since_cplus;
  // A different story inherits nothing.
  s.storyId = 'bridge-id-other';
  const otherStory = window._cpSchedRow(a);
  return { sameName, amb, beforeRename, afterRename, otherStory };
});
ok('two people sharing a name never share an appearance',
   ID.sameName.a === 1 && ID.sameName.b === null, JSON.stringify(ID.sameName));
ok('★ an AMBIGUOUS label records nothing rather than cross-assigning',
   (ID.amb.appearances || []).length === 0, JSON.stringify(ID.amb));
ok('a renamed protagonist keeps her appearance history',
   ID.beforeRename === 1 && ID.afterRename === 1, JSON.stringify({ b: ID.beforeRename, a: ID.afterRename }));
ok('★ another story inherits no appearances', ID.otherStory === null, JSON.stringify(ID.otherStory));

// ══ 7. IDEMPOTENCY: RE-EXTRACTION, RESTORE, REOPEN ══
const IDEM = await page.evaluate(() => {
  const s = window.state;
  s.storyId = 'bridge-idem'; s._relationshipLedger = null;
  const id = window._relEntityForName('Julian', { create: true });
  const c = () => window._cpCommitScene({ sceneUid: 'X1', ordinal: 1, issue: 1, delivered: [],
    appeared: [{ canonicalId: id, presence: 'IN_PERSON' }] });
  c(); c(); c();                                  // re-extraction, page reopened, retry
  const afterRepeat = window._cpSchedRow(id).meaningful_appearances_since_cplus;
  const snap = JSON.stringify(s._relationshipLedger);
  s._relationshipLedger = JSON.parse(snap);       // restore
  c();                                            // and extraction runs again after restore
  const afterRestore = window._cpSchedRow(id).meaningful_appearances_since_cplus;
  const plan = window._cpSchedule([{ label: 'Julian', canonicalId: id, facet_ids: ['f1'] }], { ordinal: 2, issue: 1 });
  return { afterRepeat, afterRestore, status: plan.decisions[0].status };
});
ok('★ re-extraction, reopening and retry leave the count unchanged',
   IDEM.afterRepeat === 1, JSON.stringify(IDEM.afterRepeat));
ok('★ a restore followed by re-extraction is still one appearance',
   IDEM.afterRestore === 1, JSON.stringify(IDEM.afterRestore));
ok('…and the scheduler result is unchanged too', IDEM.status === 'REQUIRED', IDEM.status);

// ══ 8. THE CAUSAL REGRESSION ══
// A finalized LEGACY scene records Julian once; the NEXT authoritative scene inherits it.
const CAUSAL = await page.evaluate(() => {
  const run = (withBridge) => {
    const s = window.state;
    s.storyId = 'causal-' + (withBridge ? 'with' : 'without'); s._relationshipLedger = null;
    const id = window._relEntityForName('Julian', { create: true });
    // Scene 1: an authoritative scene gives him a beat.
    s._cpDirectedBeats = [{ character: 'Julian', facet_id: 'f:v', expressionMode: 'DISPLAY',
      visibleAction: 'a', pcInterpretation: 'b' }];
    window._cpCommitScene({ sceneUid: 'C1', ordinal: 1, issue: 1,
      delivered: [{ canonicalId: id, facet_id: 'f:v', category: 'value', verified: true }], appeared: [] });
    // Scenes 2,3,4: LEGACY. He is in the prose; only the bridge can see it.
    if (withBridge) {
      [2, 3, 4].forEach(n => window._cpCommitScene({ sceneUid: 'C' + n, ordinal: n, issue: 1,
        delivered: [], appeared: [{ canonicalId: id, presence: 'IN_PERSON', source: 'disclosure_post_render' }] }));
    }
    // Scene 5: authoritative again. What does the scheduler now think?
    const d = window._cpSchedule([{ label: 'Julian', canonicalId: id, facet_ids: ['f:v', 'f:x'] }],
      { ordinal: 5, issue: 1 }).decisions[0];
    return { status: d.status, reason: d.reason, appearances: (window._cpSchedRow(id) || {}).meaningful_appearances_since_cplus };
  };
  return { withBridge: run(true), withoutBridge: run(false) };
});
ok('★ WITH the bridge: three legacy appearances accumulate and the recurrence floor fires',
   CAUSAL.withBridge.appearances === 3 && CAUSAL.withBridge.status === 'REQUIRED'
   && CAUSAL.withBridge.reason === 'recurrence_floor', JSON.stringify(CAUSAL.withBridge));
ok('★ WITHOUT it: the same story records nothing and the floor never fires',
   CAUSAL.withoutBridge.appearances === 0 && CAUSAL.withoutBridge.reason !== 'recurrence_floor',
   JSON.stringify(CAUSAL.withoutBridge));
ok('★ the bridge changes the scheduler decision — that is the whole point',
   CAUSAL.withBridge.reason !== CAUSAL.withoutBridge.reason,
   JSON.stringify([CAUSAL.withBridge.reason, CAUSAL.withoutBridge.reason]));

// ══ ISSUE 2 CARRY ══
const ISSUE2 = await page.evaluate(() => {
  const s = window.state;
  s.storyId = 'bridge-issue'; s._relationshipLedger = null;
  const id = window._relEntityForName('Julian', { create: true });
  [1, 2].forEach(n => window._cpCommitScene({ sceneUid: 'J' + n, ordinal: n, issue: 1,
    delivered: [], appeared: [{ canonicalId: id, presence: 'IN_PERSON' }] }));
  const carried = JSON.stringify(s._relationshipLedger);
  s._relationshipLedger = null;                    // the reset
  s.issueNumber = 2;
  s._relationshipLedger = JSON.parse(carried);     // the carry
  return { after: window._cpSchedRow(id).meaningful_appearances_since_cplus,
           modes: window._cpSchedRow(id).appearancesByMode };
});
ok('★ appearances survive the Issue 2 carry with their modes intact',
   ISSUE2.after === 2 && ISSUE2.modes.IN_PERSON === 2, JSON.stringify(ISSUE2));
ok('zero requests escaped', escaped === 0, String(escaped));

console.log(`\n${'═'.repeat(80)}\nPOST-RENDER RECONCILIATION BRIDGE\n${'═'.repeat(80)}`);
console.log(log.join('\n'));
console.log(`${'─'.repeat(80)}\n ${pass} passed · ${fail} failed\n`);
await ctx.close().catch(() => {}); await browser.close().catch(() => {});
process.exit(fail ? 1 : 0);
