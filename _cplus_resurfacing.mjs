// ══════════════════════════════════════════════════════════════════════════════════════════
//  FACET-LEVEL RESURFACING — THE JESS LIFECYCLE
//
//  Character recurrence says who deserves a beat. It cannot say WHICH established truth has
//  gone quiet, and without that a character keeps earning beats while a signature the reader
//  was taught silently stops existing. This walks Jess's real arc: signature in Scene 1, two
//  other revelations at 4 and 9, and the question of what Scene 18 should do about it.
// ══════════════════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core';
import { configBody, installSession, isAuthOrigin } from './_test_session_env.mjs';

let pass = 0, fail = 0; const log = [];
const ok = (n, c, d) => { if (c) { pass++; log.push(`  ✓ ${n}`); } else { fail++; log.push(`  ✗ ${n}${d ? '\n      ' + String(d).slice(0, 420) : ''}`); } };

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
await page.waitForFunction(() => window._cpOverdueFacets && window._cpResurfaceSelection, { timeout: 60000 });

const K = await page.evaluate(() => window.__CP_RESURFACE);
ok('the quiet threshold comes from production', K && K.quietScenes === 3, JSON.stringify(K));

// ── THE ARC: signature at 1, episodic at 4, episodic at 9 ──
const ARC = await page.evaluate(() => {
  const s = window.state;
  s.storyId = 'jess-arc'; s._relationshipLedger = null;
  s.playerName = 'Ilse'; s.name = 'Ilse'; s.loveInterestName = 'Adan'; s.partnerName = 'Adan';
  delete s._starterId; s.is_starter_story = false;
  const id = window._relEntityForName('Jess', { create: true });
  window._attachPortfolio(id, [
    { category: 'value', canonical_truth: 'She leads with her decolletage to control where attention lands.',
      possible_pressures: [{ text: 'a room not centred on her', evidence_requires: 'room' }],
      forbidden_restatements: [{ forbid: 'naturally modest', why: 'inverts it' }] },
    { category: 'insecurity', canonical_truth: 'Her sympathy arrives loudest where someone is watching her give it.',
      possible_pressures: [{ text: 'a witnessed kindness', evidence_requires: 'watch' }],
      forbidden_restatements: [{ forbid: 'is fake', why: 'verdict' }] },
    { category: 'habit', canonical_truth: 'She stays past usefulness for anyone who kept her secret.',
      possible_pressures: [{ text: 'a debt of discretion', evidence_requires: 'secret' }],
      forbidden_restatements: [{ forbid: 'lets things go', why: 'inverts it' }] },
  ], { provenance: 'generated_cast' });
  const f = window._relLedger().entities[id].authorProfile.cPlusFacets.map(x => x.facet_id);
  const beat = (uid, ord, fid, persistence) => {
    s._cpDirectedBeats = [{ character: 'Jess', facet_id: fid, expressionMode: 'DISPLAY',
      visibleAction: 'act@' + ord, pcInterpretation: 'read@' + ord }];
    window._cpCommitScene({ sceneUid: uid, ordinal: ord, issue: 1,
      delivered: [{ canonicalId: id, facet_id: fid, category: 'x', verified: true, persistence: persistence }], appeared: [] });
  };
  beat('S1', 1, f[0], 'recurring_signature');     // the décolletage SIGNATURE
  beat('S4', 4, f[1], 'episodic');                // performative empathy
  beat('S9', 9, f[2], 'episodic');                // loyalty
  return { id, f,
    at4:  window._cpOverdueFacets(id, { ordinal: 4 }),
    at9:  window._cpOverdueFacets(id, { ordinal: 9 }),
    at18: window._cpOverdueFacets(id, { ordinal: 18 }) };
});

ok('at scene 4 the signature is not yet overdue (3 scenes quiet is the threshold)',
   ARC.at4.length === 1 && ARC.at4[0].sinceScenes === 3, JSON.stringify(ARC.at4));
ok('★ after the scene-4 and scene-9 revelations the SIGNATURE is overdue',
   ARC.at9.length === 1 && ARC.at9[0].facet_id === ARC.f[0] && ARC.at9[0].sinceScenes === 8,
   JSON.stringify(ARC.at9));
ok('★ …and at scene 18 it is the one overdue facet, 17 scenes quiet',
   ARC.at18.length === 1 && ARC.at18[0].facet_id === ARC.f[0] && ARC.at18[0].sinceScenes === 17,
   JSON.stringify(ARC.at18));
ok('★ the EPISODIC beats never become overdue — episodic promised nothing',
   !ARC.at18.some(x => x.facet_id === ARC.f[1] || x.facet_id === ARC.f[2]),
   JSON.stringify(ARC.at18.map(x => x.facet_id)));

// ── SCENE 18, GROUNDED: the overdue signature is preferred ──
const GROUNDED = await page.evaluate(({ id, f }) => {
  const opts = [{ option_id: 'OPT-1', recipient: 'Jess', facet_id: f[2] },
                { option_id: 'OPT-2', recipient: 'Jess', facet_id: f[0] }];   // the signature IS grounded here
  return window._cpResurfaceSelection(id, opts, { ordinal: 18 });
}, ARC);
ok('★ scene 18 WITH owned evidence: the overdue signature is selected',
   GROUNDED.selected && GROUNDED.selected.facet_id === ARC.f[0]
   && GROUNDED.selected.option_id === 'OPT-2' && GROUNDED.reason === 'grounded', JSON.stringify(GROUNDED));
ok('…and it is preferred over the other grounded option, not merely present',
   GROUNDED.selected.facet_id !== ARC.f[2], JSON.stringify(GROUNDED.selected));

// ── SCENE 18, UNGROUNDED: deferred, never manufactured ──
const UNGROUNDED = await page.evaluate(({ id, f }) => {
  const opts = [{ option_id: 'OPT-1', recipient: 'Jess', facet_id: f[2] }];   // signature NOT grounded
  return window._cpResurfaceSelection(id, opts, { ordinal: 18 });
}, ARC);
ok('★ scene 18 WITHOUT owned evidence: the signature is DEFERRED, not selected',
   UNGROUNDED.selected === null && UNGROUNDED.reason === 'deferred_ungrounded', JSON.stringify(UNGROUNDED));
ok('★ …the deferral names the reason — no scene evidence was manufactured for it',
   UNGROUNDED.deferred.length === 1 && UNGROUNDED.deferred[0].facet_id === ARC.f[0]
   && UNGROUNDED.deferred[0].reason === 'no_owned_evidence_this_scene', JSON.stringify(UNGROUNDED.deferred));
ok('…and it stays overdue for a later scene rather than being consumed',
   UNGROUNDED.overdue.length === 1 && UNGROUNDED.overdue[0].facet_id === ARC.f[0], JSON.stringify(UNGROUNDED.overdue));

// ── WHAT CANNOT BE OVERDUE ──
const NEVER = await page.evaluate(() => {
  const s = window.state;
  s.storyId = 'never-overdue'; s._relationshipLedger = null;
  const id = window._relEntityForName('Vale', { create: true });
  window._attachPortfolio(id, [
    { category: 'value', canonical_truth: 'LATENT never shown.',
      possible_pressures: [{ text: 'x', evidence_requires: 'x' }],
      forbidden_restatements: [{ forbid: 'is open', why: 'inverts' }] },
    { category: 'habit', canonical_truth: 'SUPERSEDED, once a signature.',
      possible_pressures: [{ text: 'y', evidence_requires: 'y' }],
      forbidden_restatements: [{ forbid: 'is rigid', why: 'inverts' }] },
  ], { provenance: 'generated_cast' });
  const f = window._relLedger().entities[id].authorProfile.cPlusFacets.map(x => x.facet_id);
  s._cpDirectedBeats = [{ character: 'Vale', facet_id: f[1], expressionMode: 'DISPLAY', visibleAction: 'a', pcInterpretation: 'b' }];
  window._cpCommitScene({ sceneUid: 'N1', ordinal: 1, issue: 1,
    delivered: [{ canonicalId: id, facet_id: f[1], category: 'habit', verified: true, persistence: 'recurring_signature' }], appeared: [] });
  const beforeEvolve = window._cpOverdueFacets(id, { ordinal: 10 });
  s._cpDirectedBeats = [{ character: 'Vale', facet_id: f[1], expressionMode: 'CONTRADICT', visibleAction: 'c', pcInterpretation: 'd' }];
  window._cpCommitScene({ sceneUid: 'N2', ordinal: 2, issue: 1,
    delivered: [{ canonicalId: id, facet_id: f[1], category: 'habit', verified: true, relation: 'evolved' }], appeared: [] });
  return { latentOverdue: window._cpOverdueFacets(id, { ordinal: 10 }).some(x => x.facet_id === f[0]),
           beforeEvolve: beforeEvolve.length, afterEvolve: window._cpOverdueFacets(id, { ordinal: 10 }).length };
});
ok('★ a LATENT facet is never overdue — the reader has not met it', NEVER.latentOverdue === false, JSON.stringify(NEVER));
ok('★ a SUPERSEDED signature stops being overdue — it no longer governs',
   NEVER.beforeEvolve === 1 && NEVER.afterEvolve === 0, JSON.stringify(NEVER));

// ── READ-ONLY, AND NOTHING DISPATCHED ──
const RO = await page.evaluate(({ id }) => {
  const s = window.state; s.storyId = 'jess-arc';
  const before = JSON.stringify(s._relationshipLedger);
  for (let i = 0; i < 3; i++) { window._cpOverdueFacets(id, { ordinal: 18 }); window._cpResurfaceSelection(id, [], { ordinal: 18 }); }
  return { same: JSON.stringify(s._relationshipLedger) === before };
}, ARC);
ok('resurfacing mutates nothing', RO.same === true, JSON.stringify(RO));
ok('zero requests escaped to a provider', escaped === 0, String(escaped));

console.log(`\n${'═'.repeat(78)}\nFACET-LEVEL RESURFACING — THE JESS LIFECYCLE\n${'═'.repeat(78)}`);
console.log(log.join('\n'));
console.log(`${'─'.repeat(78)}\n ${pass} passed · ${fail} failed\n`);
await ctx.close().catch(() => {}); await browser.close().catch(() => {});
process.exit(fail ? 1 : 0);
