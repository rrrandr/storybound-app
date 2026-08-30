// BODY-BIBLE DEDUPLICATION — do the PC and LI generators pay twice?
//
// The antagonist generator did: it guarded on a COMPLETED bible only, so two callers entering
// while the first request was in flight both saw an empty slot and both paid. _generatePCBodyBible
// and _generateLIBodyBible have the SAME shape and six call sites each, which makes this a
// concrete hypothesis rather than an architectural resemblance — and the PC/LI generators are
// MORE expensive to duplicate, because each one also drives the physical- and behavioral-canon
// decalcify gates, which make their own model calls.
//
// This measures before it fixes. The response is held open, two callers are started at once, and
// the requests are counted. One request per generator means no race; two means a duplicate PAID
// call on every path where two call sites can overlap.
//
// usage: node _body_bible_dedupe.mjs   (needs vercel dev on :3000) — no paid calls
import { chromium } from 'playwright-core';
import fs from 'fs';

const SRC = fs.readFileSync('public/app.js', 'utf8');
let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };

async function preflight(url = 'http://localhost:3000/') {
  try {
    const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 8000);
    const res = await fetch(url, { signal: ctl.signal }); clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!/<\s*script|<\s*html/i.test(await res.text())) throw new Error('not the app shell');
  } catch (e) {
    console.error(`\n  ✗ INFRASTRUCTURE: ${url} not serving the app (${e.message}).`);
    console.error('    npx vercel dev --listen 3000 — if hung: lsof -nP -iTCP:3000, kill that PID.\n');
    process.exit(2);
  }
}
await preflight();

// Each bible carries exactly what its own validator requires, plus the visual_anchor the author is
// told to open a character's first description on. A response production DISCARDS would leave the
// slot empty and turn "how many callers raced" into "how many times it retried".
const PC_BIBLE = {
  height: 'average', build: 'lean', hair: 'dark, cut blunt at the jaw', complexion: 'olive',
  eye_color: 'brown', signature_feature: 'a chipped front tooth she never had fixed',
  second_celebrated_feature: 'the back of her neck when her hair is up',
  stress_tic: 'she turns her grandmother\'s ring with her thumb',
  desire_tell: 'she goes very still and answers a beat late',
  visual_anchor: { focus: 'the mouth', detail: 'a chipped front tooth, visible when she forgets to hide it' },
};
const LI_BIBLE = {
  height: 'tall', build: 'broad through the shoulders', hair: 'black, overgrown',
  complexion: 'brown', eye_color: 'dark',
  signature_feature: 'a knuckle on his right hand that never set straight',
  voice_quality: 'low, and slower than the room expects',
  hands_quality: 'careful with small objects, careless with large ones',
  pc_keenly_notices: 'the knuckle, and that he never explains it',
  visual_anchor: { focus: 'the hands', detail: 'a knuckle that never set straight' },
};
const ANT_BIBLE = {
  archetype: 'BUREAUCRATIC_COLD', height: 'tall', build: 'spare', hair: 'iron-grey',
  complexion: 'winter-pale', eye_color: 'pale grey',
  signature_feature: 'an inkstain worn into one finger',
  control_tell: 'he sets a document down and does not let go of it',
  softness_seam: 'he keeps every hand-delivered letter, in order',
  visual_anchor: { focus: 'the hands', detail: 'an inkstain worn into one finger' },
};

console.log(`\n${'═'.repeat(88)}\nBODY-BIBLE DEDUPLICATION — one paid call per story, or two?\n${'═'.repeat(88)}\n`);

const browser = await chromium.launch({ headless: true });
let _closing = false;
const closeBrowser = async () => { if (_closing) return; _closing = true; try { await browser.close(); } catch (_) {} };
process.on('uncaughtException', async (e) => { await closeBrowser(); console.error(e); process.exit(1); });
process.on('unhandledRejection', async (e) => { await closeBrowser(); console.error(e); process.exit(1); });

// One probe = a fresh context, a held response, two concurrent callers, an exact request count.
async function probe({ who, mutateSrc, holdMs = 3000 }) {
  const ctx = await browser.newContext();
  try {
    const page = await ctx.newPage();
    page.setDefaultTimeout(120000); page.setDefaultNavigationTimeout(120000);
    // EVERY REQUEST HAS A NAME. "other" with no assertion on it is how paid post-processing hides:
    // the canon-decalcification gates each dispatch their own call, and they run BETWEEN the
    // primary response and the point where ownership used to be checked.
    const counts = { pc: 0, li: 0, ant: 0, physCanon: 0, behavCanon: 0, other: 0, unknown: [] };
    let phase = 'setup';                       // the probe stamps which phase each request belongs to
    const byPhase = {};                        // phase -> { kind: n }
    const bump = k => { counts[k]++; (byPhase[phase] = byPhase[phase] || {})[k] = ((byPhase[phase] || {})[k] || 0) + 1; };
    let targets = null;
    await page.route('**/app.js*', r => {
      let body = SRC;
      if (mutateSrc) { targets = body.split(mutateSrc.from).length - 1; body = body.replace(mutateSrc.from, mutateSrc.to); }
      return r.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8', body });
    });
    await page.route('**/api/**', async route => {
      const u = route.request().url();
      if (/\/api\/(config|geo|csp-report|beta-events)\b/.test(u)) return /* FULFILLED, NOT FORWARDED: a forwarded static endpoint spawns a @vercel/node runtime that is never reaped — they accumulate into gigabytes and wedge the dev server mid-suite. */ route.fulfill({ status:200, contentType:'application/json', body:'{}' });
      let b = null; try { b = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
      const sys = String(((b && b.messages || []).find(m => m.role === 'system') || {}).content || '');
      let out, held = false;
      if (/generating a PROTAGONIST BODY BIBLE/.test(sys))        { bump('pc');  held = true; out = PC_BIBLE; }
      else if (/generating a LOVE-INTEREST BODY BIBLE/.test(sys)) { bump('li');  held = true; out = LI_BIBLE; }
      else if (/generating an ANTAGONIST BODY BIBLE/.test(sys))   { bump('ant'); held = true; out = ANT_BIBLE; }
      else if (/revise physical-canon fields of a romance/.test(sys))   { bump('physCanon');  out = {}; }
      else if (/revise CALCIFIED shapes\/wording of a romance/.test(sys)) { bump('behavCanon'); out = {}; }
      else { bump('other'); out = { ok: true }; }
      if (held) await new Promise(r => setTimeout(r, holdMs));
      const content = JSON.stringify(out);
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ ok: true, content, choices: [{ message: { content } }] }) });
    });
    page.on('request', r => { if (/\/api\//.test(r.url()) && !/localhost|127\.0\.0\.1/.test(r.url())) counts.unknown.push(r.url()); });
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window._generatePCBodyBible === 'function'
                                  && typeof window._generateLIBodyBible === 'function', { timeout: 60000 });

    const setup = async () => page.evaluate(({ who }) => {
      const s = window.state;
      // EXPLICITLY ORDINARY. Famous Fate and no-romance both have their own gates, and leaving
      // either set would let an early return masquerade as deduplication.
      Object.assign(s, { storyId: 'bb-' + Math.random().toString(36).slice(2, 8),
        famousFate: null, playerName: 'Lirael', loveInterestName: 'Julian',
        world: 'modern', worldSubtype: 'city', picks: Object.assign({}, s.picks, {
          identity: { playerName: 'Lirael', playerGender: 'Female' }, world: 'Modern' }) });
      window.__bbFn = who === 'pc' ? window._generatePCBodyBible : window._generateLIBodyBible;
      window.__bbSlot = who === 'pc' ? 'pcBodyBible' : 'liBodyBible';
    }, { who });
    await setup();

    // Each phase is a separate evaluate so the harness can stamp which phase every request
    // belongs to. A per-phase census is the only way to see paid post-processing that runs
    // BETWEEN the primary response and the moment ownership is checked.
    phase = 'A_dedupe';
    const dedupe = await page.evaluate(async () => {
      const s = window.state; s[window.__bbSlot] = null;
      const both = await Promise.all([window.__bbFn(), window.__bbFn()]);
      return { resolved: both.filter(Boolean).length, same: both[0] === both[1], stored: !!s[window.__bbSlot] };
    });
    phase = 'B_retry';
    const retry = await page.evaluate(async () => {
      const s = window.state; s[window.__bbSlot] = null;
      const again = await window.__bbFn();
      return { ok: !!again, stored: !!s[window.__bbSlot] };
    });
    // C · THE STORY CHANGES while the request is in flight.
    phase = 'C_storyChanged';
    const ownership = await page.evaluate(async () => {
      const s = window.state; s[window.__bbSlot] = null;
      const prior = s.storyId;
      const inflight = window.__bbFn();
      s.storyId = 'bb-B-' + Math.random().toString(36).slice(2, 6);
      const late = await inflight;
      const out = { returned: late === null ? null : 'a bible', stored: !!s[window.__bbSlot] };
      s.storyId = prior;
      return out;
    });
    // D · THE SUBJECT changes inside the SAME story — the other half of the shared contract, and
    // the likelier one in play: a re-named protagonist or a re-cast love interest.
    phase = 'D_subjectChanged';
    const subject = await page.evaluate(async ({ who }) => {
      const s = window.state; s[window.__bbSlot] = null;
      const priorLi = s.loveInterestName, priorId = s.picks.identity;
      const inflight = window.__bbFn();
      if (who === 'pc') s.picks.identity = Object.assign({}, priorId, { playerName: 'Someone Else' });
      else s.loveInterestName = 'Someone Else';
      const late = await inflight;
      const out = { returned: late === null ? null : 'a bible', stored: !!s[window.__bbSlot] };
      s.loveInterestName = priorLi; s.picks.identity = priorId;
      return out;
    }, { who });
    phase = 'after';
    const res = { dedupe, retry, ownership, subject, byPhase };
    return { counts, targets, ...res };
  } finally { await ctx.close().catch(() => {}); }
}

for (const who of ['pc', 'li']) {
  const label = who.toUpperCase();
  const R = await probe({ who });
  const n = R.counts[who];
  console.log(` ${label} BODY BIBLE`);
  console.log(`   requests          : pc=${R.counts.pc} li=${R.counts.li} ant=${R.counts.ant} · escaped=${R.counts.unknown.length}`);
  console.log(`   probe             : ${JSON.stringify({ dedupe: R.dedupe, retry: R.retry, ownership: R.ownership, subject: R.subject })}`);
  console.log(`   by phase          : ${JSON.stringify(R.byPhase)}`);
  t(`${label} 1: two concurrent callers issue ONE paid request between them`,
    R.dedupe.resolved === 2 && R.dedupe.same === true && R.dedupe.stored === true,
    JSON.stringify(R.dedupe) + ` · requests for ${who}=${n} (one per phase is 4; 5 means A paid twice)`);
  t(`${label} 2: the request total is 4 — one per phase, none duplicated`,
    n === 4, `${who} requests = ${n} (want 4: concurrent pair + retry + story-change + subject-change)`);
  t(`${label} 3: a settled entry does not poison the next attempt`,
    R.retry.ok === true && R.retry.stored === true, JSON.stringify(R.retry));
  t(`${label} 4: a bible arriving after the STORY changed is not stored on the new story`,
    R.ownership.returned === null && R.ownership.stored === false, JSON.stringify(R.ownership));
  t(`${label} 5: …and the other half of the same contract — the SUBJECT changing inside one ` +
    `story is refused too`,
    R.subject.returned === null && R.subject.stored === false, JSON.stringify(R.subject));
  // ── THE PAID LEAK ──
  // Ownership used to be checked only at the store, AFTER the crisis re-roll and both
  // canon-decalcification gates — each of which dispatches its own paid call. A story or subject
  // change during the primary request therefore bought post-processing for a bible that was then
  // thrown away. The zero below is only evidence because phase A proves the gates DO fire when
  // the response is still owned.
  // The gates are calcification-driven, so they fire once the same values have been seen before —
  // in practice from phase B on, not on the very first generation. What matters is that they are
  // PRIMED by the time phases C and D run: they fired while ownership held, and did not fire once
  // it was lost.
  const gates = ph => ((R.byPhase[ph] || {}).physCanon || 0) + ((R.byPhase[ph] || {}).behavCanon || 0);
  t(`${label} 6: the decalcification gates DO run while the response is still owned ` +
    `(so their absence below is evidence, not an inert path)`,
    gates('A_dedupe') + gates('B_retry') > 0,
    `A=${gates('A_dedupe')} B=${gates('B_retry')} · ${JSON.stringify(R.byPhase)}`);
  t(`${label} 7: an obsolete response buys NOTHING — zero gate calls once the story changed`,
    gates('C_storyChanged') === 0, JSON.stringify(R.byPhase.C_storyChanged));
  t(`${label} 8: …and zero once the subject changed`,
    gates('D_subjectChanged') === 0, JSON.stringify(R.byPhase.D_subjectChanged));
  t(`${label} 9: nothing escaped the harness`, R.counts.unknown.length === 0,
    JSON.stringify(R.counts.unknown.slice(0, 2)));
  console.log('');
}

// ── THE GUARDS ARE MUTATION-CONTROLLED ──
// Both live in the ONE shared helper, so a single deletion exercises the guard all three
// generators depend on — which is the point of having one definition rather than three copies.
console.log(' MUTATION CONTROLS (the shared helper, driven through the PC generator)');
const gatesIn = (R, ph) => ((R.byPhase[ph] || {}).physCanon || 0) + ((R.byPhase[ph] || {}).behavCanon || 0);
for (const [label, from, to, check] of [
  ['the in-flight JOIN removed',
   'if (cur && cur.key === key) {', 'if (false) {',
   R => R.counts.pc > 4 && R.dedupe.same === false],
  ['the OWNERSHIP check removed',
   'if (!keyAtRequest || keyAtRequest === currentKey) return true;', 'if (true) return true;',
   R => R.ownership.stored === true && R.subject.stored === true],
  // The EARLY check is the one that stops paid post-processing of a response nobody will keep.
  // Its text is identical to the pre-storage check, so the marker carries its own comment — a
  // non-unique marker would delete one of the two and prove nothing about which.
  ['the EARLY (pre-gate) ownership check removed',
   `        // BEFORE the crisis re-roll and both canon-decalcification gates, all of which can dispatch
` +
   `        // paid calls of their own.
` +
   `        if (!_bodyBibleStillOwned('pc', _keyAtRequest, _bodyBibleScopeKey(_pcBibleSubject()))) return null;`,
   '        /* MUTATION CONTROL: the early ownership check is removed */',
   R => gatesIn(R, 'C_storyChanged') + gatesIn(R, 'D_subjectChanged') > 0
        // …and the bible is STILL correctly refused at the store — the leak is the money spent
        // getting there, not a wrong value landing on state.
        && R.ownership.stored === false && R.subject.stored === false],
]) {
  const M = await probe({ who: 'pc', mutateSrc: { from, to } });
  t(`MUT: with ${label}, the corresponding claim goes RED — so the green above is about the guard`,
    M.targets === 1 && check(M),
    `targets=${M.targets} requests=${M.counts.pc} gatesC=${gatesIn(M, 'C_storyChanged')} ` +
    `gatesD=${gatesIn(M, 'D_subjectChanged')} ` +
    `probe=${JSON.stringify({ dedupe: M.dedupe, ownership: M.ownership, subject: M.subject })}`);
}
console.log('');

console.log(`${'─'.repeat(88)}\n  ${pass} passed · ${fail} failed\n`);
await closeBrowser();
process.exit(fail ? 1 : 0);
