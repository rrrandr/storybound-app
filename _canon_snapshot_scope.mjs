// ══════════════════════════════════════════════════════════════════════════════════════════
//  THE CANON SNAPSHOT IS SCENE- AND INVOCATION-SCOPED
//
//  It was keyed on storyId ALONE, while its own comment said "BUILT ONCE PER INVOCATION". Two
//  consequences inside a single story:
//    · a later scene's author directive appended ANOTHER scene's canon block;
//    · a recorded REFUSAL (ok:false) stayed sticky and aborted an unrelated later scene.
//  The second is the dangerous one: it turns one scene's canon failure into a story-wide outage.
//
//  Driven through buildSkeletonDirective — the real author-directive builder.
// ══════════════════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core';
import fs from 'fs';
import { configBody, installSession, isAuthOrigin } from './_test_session_env.mjs';

let pass = 0, fail = 0;
const out = [];
const ok = (n, c, d) => { if (c) { pass++; out.push(`  ✓ ${n}`); }
  else { fail++; out.push(`  ✗ ${n}${d ? '\n      ' + String(d).slice(0, 620) : ''}`); } };

const SRC = fs.readFileSync('public/app.js', 'utf8');
const MUT = process.env.SB_MUT || '';
let body = SRC, targets = null;
if (MUT) {
  const [from, to] = MUT.split('@@TO@@');
  targets = body.split(from).length - 1;
  if (targets !== 1) { console.error(`\n  MUTATION MARKER NOT UNIQUE: ${targets}\n`); process.exit(2); }
  body = body.replace(from, to);
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const escaped = [];
await installSession(page);
await page.route('**/*', async route => {
  const url = route.request().url();
  const path = url.replace(/^https?:\/\/[^/]+/, '');
  if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (!/\/api\//.test(path)) return route.continue();
  if (/\/api\/config\b/.test(path)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
});
await page.route('**/app.js*', r => r.fulfill({ status: 200,
  contentType: 'application/javascript; charset=utf-8', body }));
page.on('request', r => { if (/\/api\//.test(r.url()) && !/localhost|127\.0\.0\.1/.test(r.url())) escaped.push(r.url()); });
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window.state && window.buildSkeletonDirective, { timeout: 60000 });

// A UNIQUE, IDENTIFIABLE CANON BLOCK. Every assertion below names THIS string, so "the snapshot
// was applied" can never be satisfied by some other text that happened to be in the directive.
const MARK = 'SNAPSHOT-FROM-SCENE-1-CANON-BLOCK-9f2a';

// snapSeq/curSeq now carry the ATTEMPT id, not the invocation sequence: identity is an opaque
// per-turn id the page carries, because scene number is shared by retries and continuations
// inherit Scene 1's invocation.
const probe = (snapScene, skelScene, snapSeq, curSeq, ok_, code) => page.evaluate(
  ([sSc, kSc, sSeq, cSeq, sOk, sCode, mark]) => {
    const s = window.state;
    s.storyId = 'snapscope-1';
    s._invocationSeq = cSeq;
    // OWNERSHIP BY CONTAINMENT: the projection travels INSIDE the skeleton it was built with.
    // The skeleton's own attempt id is the identity; a global slot is no longer consulted.
    s.sceneSkeleton = { character_plus: [], staged_characters: [{ name: 'Julian', presence_mode: 'PHYSICALLY_PRESENT' }],
                        environment_anchor: 'the harbour counter', _cpSceneNumber: kSc,
                        _cpAttemptId: 'cpa:' + cSeq,
                        _cpCanonSnapshot: { storyId: 'snapscope-1', sceneNumber: sSc, invocationSeq: sSeq,
                                            attemptId: 'cpa:' + sSeq, text: mark, entries: 2,
                                            ok: sOk, code: sCode } };
    // A stale GLOBAL is left behind on purpose: the reader must ignore it entirely.
    s._cpCanonSnapshot = { storyId: 'snapscope-1', sceneNumber: kSc, invocationSeq: cSeq,
                           attemptId: 'cpa:' + cSeq, text: 'GLOBAL-SLOT-MUST-NOT-BE-READ',
                           entries: 2, ok: false, code: 'projection_unavailable' };
    let threw = null, directive = '';
    try { directive = String(window.buildSkeletonDirective() || ''); }
    catch (e) { threw = String((e && e.message) || e); }
    return { threw, applied: directive.indexOf(mark) !== -1, len: directive.length,
             fault: s._cpCanonFault || null };
  }, [snapScene, skelScene, snapSeq, curSeq, ok_, code, MARK]);

// ══ 1. THE MATCHING CASE STILL WORKS ══
const M = await probe(1, 1, 7, 7, true, null);
ok('S1 ★ a snapshot for THIS scene and THIS invocation is applied — the fix does not simply disable the feature',
   M.applied === true && !M.threw, `applied=${M.applied} threw=${M.threw} len=${M.len}`);

// ══ 2. WRONG SCENE, SAME STORY ══
const W = await probe(1, 4, 7, 7, true, null);
ok('S2 ★ scene 1\'s canon block does NOT leak into scene 4\'s author directive',
   W.applied === false && !W.threw, `applied=${W.applied} threw=${W.threw}`);

// ══ 3. THE STICKY REFUSAL — THE DANGEROUS ONE ══
const R = await probe(1, 4, 7, 7, false, 'projection_unavailable');
ok('S3 ★ a REFUSAL recorded for scene 1 does not abort scene 4 — one scene\'s canon failure is not a story-wide outage',
   !R.threw, `threw=${R.threw}`);
const RSame = await probe(4, 4, 7, 7, false, 'projection_unavailable');
ok('S4 ★ …while a refusal recorded for THIS scene still stops the author, exactly as before',
   !!RSame.threw && /canon_projection_failed/.test(String(RSame.threw)), String(RSame.threw));

// ══ 4. AN ABANDONED INVOCATION'S SNAPSHOT ══
const A = await probe(4, 4, 7, 9, true, null);
ok('S5 ★ a snapshot from an ABANDONED ATTEMPT is not read by the attempt that replaced it',
   A.applied === false && !A.threw, `applied=${A.applied} threw=${A.threw}`);
const AR = await probe(4, 4, 7, 9, false, 'projection_unavailable');
ok('S6 ★ …and an abandoned attempt\'s REFUSAL cannot abort the live run either',
   !AR.threw, String(AR.threw));

// ══ 5. AN UNSTAMPED SKELETON IS TREATED AS ABSENT, NOT AS A REFUSAL ══
const U = await page.evaluate(([mark]) => {
  const s = window.state;
  s.storyId = 'snapscope-1'; s._invocationSeq = 7;
  s.sceneSkeleton = { character_plus: [], staged_characters: [{ name: 'Julian', presence_mode: 'PHYSICALLY_PRESENT' }],
                      environment_anchor: 'the harbour counter' };   // no _cpSceneNumber
  // No snapshot on the skeleton at all — an unwired path.
  s._cpCanonSnapshot = { storyId: 'snapscope-1', sceneNumber: 1, invocationSeq: 7, attemptId: 'cpa:7',
                         text: mark, entries: 2, ok: false, code: 'projection_unavailable' };
  let threw = null, directive = '';
  try { directive = String(window.buildSkeletonDirective() || ''); }
  catch (e) { threw = String((e && e.message) || e); }
  return { threw, applied: directive.indexOf(mark) !== -1 };
}, [MARK]);
ok('S7 an unstamped skeleton reads as ABSENT — unwired paths keep working and are never refused',
   U.applied === false && !U.threw, `applied=${U.applied} threw=${U.threw}`);

// ── THE GLOBAL SLOT IS NOT AN INPUT ──
// Every probe above leaves a stale global behind whose text is GLOBAL-SLOT-MUST-NOT-BE-READ and
// whose ok:false would abort the author if it were consulted. That none of them aborted, and that
// the matching case rendered the skeleton's OWN marker, is the proof the global is dead weight.
const G = await page.evaluate(() => {
  const s = window.state;
  s.storyId = 'snapscope-1'; s._invocationSeq = 7;
  s.sceneSkeleton = { character_plus: [], staged_characters: [{ name: 'Julian', presence_mode: 'PHYSICALLY_PRESENT' }],
                      environment_anchor: 'the harbour counter', _cpSceneNumber: 4, _cpAttemptId: 'cpa:live' };
  s._cpCanonSnapshot = { storyId: 'snapscope-1', sceneNumber: 4, invocationSeq: 7, attemptId: 'cpa:live',
                         text: 'GLOBAL-ONLY-MARKER', entries: 2, ok: false, code: 'projection_unavailable' };
  let threw = null, d = '';
  try { d = String(window.buildSkeletonDirective() || ''); } catch (e) { threw = String((e && e.message) || e); }
  return { threw, leaked: d.indexOf('GLOBAL-ONLY-MARKER') !== -1 };
});
ok('S8 ★ a snapshot present ONLY in the global slot is neither rendered nor able to abort the author',
   G.leaked === false && !G.threw, JSON.stringify(G));
ok('S9 nothing escaped to a paid provider', escaped.length === 0, JSON.stringify(escaped.slice(0, 3)));

console.log('\n' + out.join('\n'));
console.log(`\n  match=${M.applied} wrongScene=${W.applied} abandoned=${A.applied}`);
console.log(`  stickyRefusal(scene1→scene4)=${R.threw ? 'ABORTED' : 'no abort'} · sameScene=${RSame.threw ? 'aborted (correct)' : 'NO ABORT'}`);
if (MUT) console.log(`  MUTATION: targets=${targets}`);
console.log(`\n  ${pass} passed · ${fail} failed\n`);
await browser.close();
process.exit(fail ? 1 : 0);
