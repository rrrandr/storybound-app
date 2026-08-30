// PORTFOLIO PROVIDER — schema, validation, attachment, status, selectability. No paid calls.
//
// The failure this exists to prevent is a portfolio that PERSISTS correctly and is INVISIBLE to
// the selector. Writing to entity.authorProfile.cPlusFacets changes nothing until a provider
// emits index entries, so every test here drives the chain:
//
//   validated portfolio → atomic attachment → provider → _facetsForCharacter
//                       → _facetSourceCoverage → planner packet → ONE truth to the author
//
// usage: node _portfolio_provider.mjs   (needs vercel dev on :3000)
import { chromium } from 'playwright-core';
import fs from 'fs';

const SRC = fs.readFileSync('public/app.js', 'utf8');
let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };

async function preflight(url = 'http://localhost:3000/') {
  try {
    const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 8000);
    const res = await fetch(url, { signal: ctl.signal }); clearTimeout(timer);
    const body = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!/<\s*script|<\s*html/i.test(body)) throw new Error('not the app shell');
  } catch (e) {
    console.error(`\n  ✗ INFRASTRUCTURE: ${url} not serving the app (${e.message}).`);
    console.error('    npx vercel dev --listen 3000 — if hung: lsof -nP -iTCP:3000, kill that PID.\n');
    process.exit(2);
  }
}
await preflight();

console.log(`\n${'═'.repeat(88)}\nPORTFOLIO PROVIDER — persisted is not the same as SELECTABLE\n${'═'.repeat(88)}\n`);

const browser = await chromium.launch({ headless: true });
let _closing = false;
const closeBrowser = async () => { if (_closing) return; _closing = true; try { await browser.close(); } catch (_) {} };
process.on('uncaughtException', async (e) => { await closeBrowser(); console.error(e); process.exit(1); });
process.on('unhandledRejection', async (e) => { await closeBrowser(); console.error(e); process.exit(1); });
process.on('exit', () => { try { browser.close(); } catch (_) {} });

const ctx = await browser.newContext();
try {
  const page = await ctx.newPage();
  page.setDefaultTimeout(120000); page.setDefaultNavigationTimeout(120000);
  let paid = 0;
  await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: SRC }));
  await page.route('**/api/**', async route => {
    const u = route.request().url();
    if (/\/api\/(config|geo|csp-report|beta-events)\b/.test(u)) return /* FULFILLED, NOT FORWARDED: a forwarded static endpoint spawns a @vercel/node runtime that is never reaped — they accumulate into gigabytes and wedge the dev server mid-suite. */ route.fulfill({ status:200, contentType:'application/json', body:'{}' });
    if (/proxy|chat|complet|grok|mistral/i.test(u)) paid++;
    return route.fulfill({ status:200, contentType:'application/json', body:'{"ok":true}' });
  });
  await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
  await page.waitForFunction(() => window._validatePortfolioResponse && window._attachPortfolio
    && window._markPortfolioFailed && window._facetsForCharacter && window._facetSourceCoverage,
    { timeout:60000 });

  const R = await page.evaluate(() => {
    const s = window.state;
    const out = {};
    // FIVE GENUINELY DIFFERENT TRUTHS, modelled on the approved standard: different categories
    // AND different subjects — the ceremony, his standing, a child's error, the price he paid,
    // and who arrived with nothing.
    const F = (category, truth, w1, e1, w2, e2) => ({
      category, canonical_truth: truth,
      applicability_conditions: [{ text: w1, evidence_requires: e1 }, { text: w2, evidence_requires: e2 }],
      forbidden_restatements: [{ forbid: 'is ' + category, why: 'the truth stated, not shown' }]
    });
    const GOOD = [
      F('worldview',     'Routine ceremony rarely deserves his full attention, and he barely disguises it.', 'a rite performed many times', 'rite|liturgy|ceremon', 'a step nobody checks', 'order|step|clause'),
      F('insecurity',    'Public honour paid to a peer makes him newly attentive to rank and merit.', 'a peer the room defers to', 'defer|regard|watching', 'someone younger holding standing', 'younger|senior|standing'),
      F('habit',         'With children he turns mistakes and even play into lessons, always.', 'a youth doing a thing badly', 'youth|child|first time', 'an error he could still fix', 'error|wrong|mistake'),
      F('contradiction', 'In questions of sacrifice he assumes an authority others have not earned.', 'an offering named aloud', 'offering|memory|cost', 'a cost he judges too small', 'cost|price|paid'),
      F('value',         'With people who have little and cannot confer status he becomes unexpectedly kind.', 'someone who came with nothing', 'barefoot|nothing|guest', 'a person placed beneath the room', 'beneath|edge|apart')
    ];
    const ROSTER = () => ({ subject_ref: out.cid, required_facet_count: 5 });
    const reset = (id) => {
      Object.assign(s, { storyId: id, _relationshipLedger: null, name: 'Lirael', playerName: 'Lirael',
        _characterDisclosureLedger: {}, aPlot: null });
      out.cid = window._relPlotRoleEntity('aplot:pf', 'primary_antagonist',
        { label: 'the presiding Dohkar', provenance: 'aplot_antagonist' });
    };

    // ── THE ACCEPTANCE PATH ──
    reset('acc-1');
    const rec = () => ({ id: out.cid, label: 'the presiding Dohkar', aliases: ['the presiding Dohkar'] });
    out.beforeFacets = window._facetsForCharacter(rec(), s, { sceneNumber: 1 }).length;
    out.beforeCoverage = window._facetSourceCoverage([{ id: out.cid, label: 'the presiding Dohkar',
      kind: 'role', aliases: ['the presiding Dohkar'] }], s, { sceneNumber: 1 });
    const v = window._validatePortfolioResponse({ characterPortfolios: [{ subject_ref: out.cid, facets: GOOD }] }, ROSTER());
    out.validated = { ok: v.ok, code: v.code, n: v.facets ? v.facets.length : 0, errors: v.errors };
    out.attached = window._attachPortfolio(out.cid, v.facets, { provenance: 'generated_cast' });
    const after = window._facetsForCharacter(rec(), s, { sceneNumber: 1 });
    out.afterFacets = after.length;
    out.afterIds = after.map(f => f.facet_id);
    out.afterCats = after.map(f => f.category);
    out.afterCoverage = window._facetSourceCoverage([{ id: out.cid, label: 'the presiding Dohkar',
      kind: 'role', aliases: ['the presiding Dohkar'] }], s, { sceneNumber: 1 });
    out.status = window._relLedger().entities[out.cid].authorProfile.status;
    out.pressuresPresent = after.every(f => (f.pressures || []).length >= 2
      && (f.pressures || []).every(p => !!p.evidence_requires));

    // ── IDS ARE BACKEND-DERIVED AND STABLE UNDER REORDER ──
    reset('acc-2');
    const shuffled = [GOOD[3], GOOD[0], GOOD[4], GOOD[1], GOOD[2]];
    const v2 = window._validatePortfolioResponse({ characterPortfolios: [{ subject_ref: out.cid, facets: shuffled }] }, ROSTER());
    window._attachPortfolio(out.cid, v2.facets, {});
    out.reorderIds = window._facetsForCharacter(rec(), s, { sceneNumber: 1 }).map(f => f.facet_id).sort();

    // ── REJECTIONS ──
    const V = (payload) => window._validatePortfolioResponse(payload, ROSTER());
    out.rej = {
      absent:        V({ issueArcs: [] }).code,
      notArray:      V({ characterPortfolios: {} }).code,
      invented:      V({ characterPortfolios: [{ subject_ref: 'plot:made:up', facets: GOOD }] }).code,
      duplicate:     V({ characterPortfolios: [{ subject_ref: out.cid, facets: GOOD }, { subject_ref: out.cid, facets: GOOD }] }).code,
      wrongCount:    V({ characterPortfolios: [{ subject_ref: out.cid, facets: GOOD.slice(0, 3) }] }).code,
      dupCategory:   V({ characterPortfolios: [{ subject_ref: out.cid, facets: [GOOD[0], GOOD[0], GOOD[1], GOOD[2], GOOD[3]] }] }).code,
      paraphrase:    V({ characterPortfolios: [{ subject_ref: out.cid, facets: [
                        F('worldview','He cannot be bothered to pretend the ceremony deserves attention.','a','rite','b','step'),
                        F('insecurity','He cannot be bothered to pretend the ceremony deserves his attention.','a','rite','b','step'),
                        GOOD[2], GOOD[3], GOOD[4]] }] }).code,
      badPattern:    V({ characterPortfolios: [{ subject_ref: out.cid, facets: [
                        { category:'worldview', canonical_truth:'A truth long enough to pass the floor here.',
                          applicability_conditions:[{text:'x',evidence_requires:'([unclosed'},{text:'y',evidence_requires:'ok'}] },
                        GOOD[1], GOOD[2], GOOD[3], GOOD[4]] }] }).code,
      envelopeLift:  V({ scaffold: { characterPortfolios: [{ subject_ref: out.cid, facets: GOOD }] } }).code
    };

    // ── IDEMPOTENCY AND CONFLICT ──
    reset('acc-3');
    const vv = V({ characterPortfolios: [{ subject_ref: out.cid, facets: GOOD }] });
    out.first = window._attachPortfolio(out.cid, vv.facets, {});
    out.repeatIdentical = window._attachPortfolio(out.cid, vv.facets, {});
    // Realistic patterns: a single-letter alternative is rejected by the bounded grammar, since
    // it would match any word containing that letter.
    const CONFLICT = GOOD.slice(0, 4).concat([F('value',
      'A completely different fifth truth about him entirely.',
      'when he is owed something', 'owed|debt|owing', 'when nobody is watching', 'alone|unseen|private')]);
    const vc = V({ characterPortfolios: [{ subject_ref: out.cid, facets: CONFLICT }] });
    out.repeatConflicting = window._attachPortfolio(out.cid, vc.facets, {});

    // ── PRECEDENCE: a seed/manual profile is never overwritten ──
    reset('acc-4');
    const L4 = window._relLedger();
    L4.entities[out.cid].authorProfile = { provenance: 'seed', immutable: true, status: 'ready',
      cPlusFacets: [{ facet_id: 'seed_one', category: 'value', canonical_truth: 'authored by hand' }] };
    // Protection is enforced at VALIDATION now, not as a post-write conflict: a protected
    // subject is never on the roster, so a portfolio naming one is refused before any facet is
    // considered. The attachment-level check remains as a second line and is asserted too.
    const vp = V({ characterPortfolios: [{ subject_ref: out.cid, facets: GOOD }] });
    out.protectedValidation = { ok: vp.ok, code: vp.code };
    out.protectedAttach = window._attachPortfolio(out.cid, GOOD.map(function (f, i) {
      return { facet_id: 'x' + i, category: f.category, canonical_truth: f.canonical_truth,
               possible_pressures: [], forbidden_restatements: [] }; }), {});
    out.seedIntact = L4.entities[out.cid].authorProfile.cPlusFacets[0].facet_id === 'seed_one';

    // ── FAILED STATUS IS RETRYABLE, AND NOT PUBLISHED ──
    reset('acc-5');
    window._markPortfolioFailed(out.cid, 'paraphrase');
    const apF = window._relLedger().entities[out.cid].authorProfile;
    out.failed = { status: apF.status, code: apF.failureCode, retryable: apF.retryable,
      published: window._facetsForCharacter(rec(), s, { sceneNumber: 1 }).length };
    const vr = V({ characterPortfolios: [{ subject_ref: out.cid, facets: GOOD }] });
    out.retryAfterFail = window._attachPortfolio(out.cid, vr.facets, {});
    out.afterRetryPublished = window._facetsForCharacter(rec(), s, { sceneNumber: 1 }).length;

    // ── PENDING IS NOT PUBLISHED EITHER ──
    reset('acc-6');
    out.pendingPublished = window._facetsForCharacter(rec(), s, { sceneNumber: 1 }).length;
    out.pendingStatus = window._relLedger().entities[out.cid].authorProfile.status;
    return out;
  });

  console.log(' 1 · THE ACCEPTANCE PATH — uncovered → selectable');
  t('1a: the antagonist starts with ZERO facets and coverage FALSE',
    R.beforeFacets === 0 && R.beforeCoverage.uncovered.length === 1,
    JSON.stringify({ facets: R.beforeFacets, uncovered: R.beforeCoverage.uncovered }));
  t('1b: a valid five-facet portfolio validates', R.validated.ok && R.validated.n === 5,
    JSON.stringify(R.validated));
  t('1c: attachment is atomic and marks the record ready',
    R.attached.ok && R.attached.code === 'attached' && R.status === 'ready', JSON.stringify(R.attached));
  t('1d: THE PROVIDER EMITS ALL FIVE under the canonical id — persisted becomes SELECTABLE',
    R.afterFacets === 5, JSON.stringify({ before: R.beforeFacets, after: R.afterFacets }));
  t('1e: coverage flips to TRUE for that character',
    R.afterCoverage.uncovered.length === 0, JSON.stringify(R.afterCoverage.uncovered));
  t('1f: five DISTINCT categories reach the index', new Set(R.afterCats).size === 5, JSON.stringify(R.afterCats));
  t('1g: every facet carries ≥2 conditions with evidence requirements — the wrong-facet guard works',
    R.pressuresPresent, JSON.stringify(R.afterIds));

  console.log('\n 2 · IDS ARE BACKEND-OWNED');
  t('2a: facet ids are derived, never model-authored',
    R.afterIds.every(id => /^gen:.+:v1:[a-z_]+$/.test(id)), JSON.stringify(R.afterIds.slice(0, 2)));
  t('2b: …and are IDENTICAL after a reordered retry — novelty history cannot be reset by a reshuffle',
    JSON.stringify(R.afterIds.slice().sort()) === JSON.stringify(R.reorderIds),
    JSON.stringify([R.afterIds.slice().sort(), R.reorderIds]));

  console.log('\n 3 · REJECTIONS (each leaves the rest of the scaffold alone)');
  const expect = { absent:'absent', notArray:'malformed', invented:'invented_ref', duplicate:'duplicate',
    wrongCount:'wrong_count', dupCategory:'duplicate_category', paraphrase:'paraphrase',
    badPattern:'malformed', envelopeLift:'absent' };
  Object.keys(expect).forEach(k => {
    t(`3 · ${k} → ${expect[k]}`, R.rej[k] === expect[k], `got ${R.rej[k]}`);
  });

  console.log('\n 4 · IDEMPOTENCY, CONFLICT, PRECEDENCE');
  t('4a: an identical repeat is a NO-OP', R.repeatIdentical.code === 'noop_identical', JSON.stringify(R.repeatIdentical));
  t('4b: a CONFLICTING repeat is rejected, never merged',
    !R.repeatConflicting.ok && R.repeatConflicting.code === 'conflicting_repeat', JSON.stringify(R.repeatConflicting));
  t('4c: a protected subject is refused at VALIDATION — never a post-write precedence conflict',
    !R.protectedValidation.ok && R.protectedValidation.code === 'unauthorised_subject',
    JSON.stringify(R.protectedValidation));
  t('4c2: …and the attachment-level guard still refuses, with the seed profile intact',
    !R.protectedAttach.ok && R.protectedAttach.code === 'protected_subject' && R.seedIntact,
    JSON.stringify([R.protectedAttach, R.seedIntact]));

  console.log('\n 5 · STATUS');
  t('5a: a failed attempt records a code and stays retryable',
    R.failed.status === 'failed' && R.failed.code === 'paraphrase' && R.failed.retryable === true,
    JSON.stringify(R.failed));
  t('5b: …and publishes NOTHING to the selector while failed', R.failed.published === 0, String(R.failed.published));
  t('5c: a retry after failure attaches and becomes selectable',
    R.retryAfterFail.ok && R.afterRetryPublished === 5, JSON.stringify([R.retryAfterFail, R.afterRetryPublished]));
  t('5d: PENDING is the default and publishes nothing',
    R.pendingStatus === 'pending' && R.pendingPublished === 0, JSON.stringify([R.pendingStatus, R.pendingPublished]));

  // ══════════════════════════════════════════════════════════════════════════════════════
  // 7 · THE PRODUCTION SEAM — through the real parser path, not the helpers
  //
  // Every assertion above called _validatePortfolioResponse / _attachPortfolio directly. That is
  // precisely how a P0 hid: the handler was nested inside the JSON.parse RECOVERY branch, so a
  // clean response — the ordinary production path — skipped validation and attachment entirely
  // while the helper suite stayed green. These drive _handleScaffoldPortfolios, the one seam the
  // scaffold parser actually calls, for every response shape.
  // ══════════════════════════════════════════════════════════════════════════════════════
  const seam = await page.evaluate(() => {
    const s = window.state;
    const out = {};
    const F = (category, truth, w1, e1, w2, e2) => ({
      category, canonical_truth: truth,
      applicability_conditions: [{ text: w1, evidence_requires: e1 }, { text: w2, evidence_requires: e2 }],
      forbidden_restatements: [{ forbid: 'is ' + category, why: 'the truth stated, not shown' }] });
    const GOOD = [
      F('worldview','Routine ceremony rarely deserves his full attention, and he barely disguises it.','a rite performed many times','rite|liturgy|ceremon','a step nobody checks','order|step|clause'),
      F('insecurity','Public honour paid to a peer makes him newly attentive to rank and merit.','a peer the room defers to','defer|regard|watching','someone younger holding standing','younger|senior|standing'),
      F('habit','With children he turns mistakes and even play into lessons, always.','a youth doing a thing badly','youth|child|first time','an error he could still fix','error|wrong|mistake'),
      F('contradiction','In questions of sacrifice he assumes an authority others have not earned.','an offering named aloud','offering|memory|cost','a cost he judges too small','cost|price|paid'),
      F('value','With people who have little and cannot confer status he becomes unexpectedly kind.','someone who came with nothing','barefoot|nothing|guest','a person placed beneath the room','beneath|edge|apart')];
    const setup = (id) => {
      Object.assign(s, { storyId: id, _relationshipLedger: null, name: 'Lirael', playerName: 'Lirael',
        _characterDisclosureLedger: {} });
      const cid = window._relPlotRoleEntity('aplot:seam', 'primary_antagonist',
        { label: 'Marcus Vale', provenance: 'aplot_antagonist' });
      s.aPlot = { id: 'aplot:seam', antagonistOrAntiForce: 'Marcus Vale', antagonistShape: 'A',
        antagonistSubject: { kind: 'PERSON', reference_label: 'Marcus Vale', proper_name: 'Marcus Vale', canonicalId: cid } };
      return cid;
    };
    const rec = (cid) => ({ id: cid, label: 'Marcus Vale', aliases: ['Marcus Vale'] });

    let cid = setup('seam-clean');
    const clean = { issueArcs: [{ n: 1 }], characterIcebergs: { 'Marcus Vale': ['a', 'b'] },
                    characterPortfolios: [{ subject_ref: cid, facets: GOOD }] };
    const r1 = window._handleScaffoldPortfolios(clean);
    out.clean = { code: r1.code, attached: r1.attached,
      scrubbed: !('characterPortfolios' in clean),
      arcsIntact: Array.isArray(clean.issueArcs) && clean.issueArcs.length === 1,
      icebergsIntact: !!clean.characterIcebergs,
      selectable: window._facetsForCharacter(rec(cid), s, { sceneNumber: 1 }).length,
      status: window._relLedger().entities[cid].authorProfile.status };

    cid = setup('seam-object');
    const objResp = { characterPortfolios: [{ subject_ref: cid, facets: GOOD }] };
    window._handleScaffoldPortfolios(objResp);
    out.object = { selectable: window._facetsForCharacter(rec(cid), s, { sceneNumber: 1 }).length,
                   scrubbed: !('characterPortfolios' in objResp) };

    cid = setup('seam-bad');
    const bad = { issueArcs: [{ n: 1 }], motifBank: ['x'],
                  characterPortfolios: [{ subject_ref: cid, facets: GOOD.slice(0, 2) }] };
    const r3 = window._handleScaffoldPortfolios(bad);
    const ap3 = window._relLedger().entities[cid].authorProfile;
    out.malformed = { code: r3.code, scrubbed: !('characterPortfolios' in bad),
      arcsIntact: bad.issueArcs.length === 1 && bad.motifBank.length === 1,
      status: ap3.status, retryable: ap3.retryable, facets: (ap3.cPlusFacets || []).length,
      selectable: window._facetsForCharacter(rec(cid), s, { sceneNumber: 1 }).length };

    cid = setup('seam-dup');
    const dup = { characterPortfolios: [{ subject_ref: cid, facets: GOOD }],
                  nested: { deeper: { characterPortfolios: [{ subject_ref: cid, facets: GOOD }] } } };
    const r4 = window._handleScaffoldPortfolios(dup);
    out.nestedDuplicate = { code: r4.code,
      selectable: window._facetsForCharacter(rec(cid), s, { sceneNumber: 1 }).length,
      status: window._relLedger().entities[cid].authorProfile.status };

    cid = setup('seam-invent');
    const inv = { characterPortfolios: [{ subject_ref: 'plot:not:real', facets: GOOD }] };
    const r5 = window._handleScaffoldPortfolios(inv);
    out.invented = { code: r5.code,
      selectable: window._facetsForCharacter(rec(cid), s, { sceneNumber: 1 }).length };

    Object.assign(s, { storyId: 'seam-none', _relationshipLedger: null });
    s.aPlot = { id: 'aplot:none', antagonistSubject: { kind: 'INSTITUTION', reference_label: 'the Ministry' } };
    const none = { issueArcs: [{ n: 1 }], characterPortfolios: [{ subject_ref: 'plot:x:y', facets: GOOD }] };
    const r6 = window._handleScaffoldPortfolios(none);
    out.noSubject = { code: r6.code, scrubbed: !('characterPortfolios' in none),
                      arcsIntact: none.issueArcs.length === 1 };

    cid = setup('seam-retry');
    // A RETRY REUSES THE ROSTER CAPTURED BEFORE THE FIRST ATTEMPT — that is what an in-flight
    // retry of one scaffold call actually does. Recapturing afterwards would see status 'ready'
    // and correctly refuse to re-ask, which is a different scenario (the NEXT story beat), not
    // this one.
    const retryRoster = window._capturePortfolioRoster(s);
    window._handleScaffoldPortfolios({ characterPortfolios: [{ subject_ref: cid, facets: GOOD }] }, retryRoster);
    const shuffled = [GOOD[4], GOOD[1], GOOD[3], GOOD[0], GOOD[2]];
    const r7 = window._handleScaffoldPortfolios({ characterPortfolios: [{ subject_ref: cid, facets: shuffled }] }, retryRoster);
    out.reorderRetry = { code: r7.code,
      selectable: window._facetsForCharacter(rec(cid), s, { sceneNumber: 1 }).length };
    // …and the other scenario, stated separately: once ready, a FRESH capture refuses to re-ask.
    out.readyNotReasked = window._capturePortfolioRoster(s).eligible;
    out.origin = window._facetsForCharacter(rec(cid), s, { sceneNumber: 1 }).map(f => f.origin);
    return out;
  });

  console.log('\n 7 · THE PRODUCTION SEAM');
  t('7a: a CLEAN response is validated and attached — the branch the P0 skipped entirely',
    seam.clean.attached === true && seam.clean.status === 'ready' && seam.clean.selectable === 5,
    JSON.stringify(seam.clean));
  t('7b: characterPortfolios never survives on the scaffold object',
    seam.clean.scrubbed && seam.object.scrubbed, JSON.stringify([seam.clean.scrubbed, seam.object.scrubbed]));
  t('7c: the rest of the scaffold is untouched',
    seam.clean.arcsIntact && seam.clean.icebergsIntact, JSON.stringify(seam.clean));
  t('7d: an OBJECT response takes the same path', seam.object.selectable === 5, JSON.stringify(seam.object));
  t('7e: a MALFORMED portfolio leaves the scaffold intact, attaches NOTHING, stays retryable',
    seam.malformed.arcsIntact && seam.malformed.facets === 0 && seam.malformed.selectable === 0
      && seam.malformed.status === 'failed' && seam.malformed.retryable === true, JSON.stringify(seam.malformed));
  t('7f: a NESTED duplicate is rejected even when the root copy is valid',
    seam.nestedDuplicate.code === 'duplicate_location' && seam.nestedDuplicate.selectable === 0,
    JSON.stringify(seam.nestedDuplicate));
  t('7g: an INVENTED subject_ref attaches nothing',
    seam.invented.code === 'invented_ref' && seam.invented.selectable === 0, JSON.stringify(seam.invented));
  t('7h: with NO eligible subject a non-empty array is refused and scrubbed, scaffold intact',
    seam.noSubject.code === 'unauthorised_subject' && seam.noSubject.scrubbed && seam.noSubject.arcsIntact,
    JSON.stringify(seam.noSubject));
  t('7i: a REORDERED retry (same captured roster) is a no-op, not a conflict',
    seam.reorderRetry.code === 'noop_identical' && seam.reorderRetry.selectable === 5,
    JSON.stringify(seam.reorderRetry));
  t('7i2: …while a FRESH capture for an already-ready subject refuses to re-ask',
    seam.readyNotReasked === false, String(seam.readyNotReasked));
  t('7j: generated facets are labelled generated_cast, not seed',
    seam.origin.length === 5 && seam.origin.every(o => o === 'generated_cast'), JSON.stringify(seam.origin));

  // ══════════════════════════════════════════════════════════════════════════════════════
  // 8 · THE ACTUAL OUTGOING REQUEST — driven through _ensureCGScaffold
  //
  // Every earlier section called a handler directly, so none of them ever looked at what was
  // SENT. That is how the capture-order P0 survived: _pfRoster was read while building sysPrompt
  // but assigned hundreds of lines later, so the hoisted `undefined` threw, the catch returned
  // '', and the request went out with no roster and no empty-array instruction — while the
  // budget still expanded. These assertions inspect the captured request body and the attachment
  // that results from it, and they fail if the production handler invocation is removed.
  // ══════════════════════════════════════════════════════════════════════════════════════
  const FIVE = [
    { category:'worldview', canonical_truth:'Routine ceremony rarely deserves his full attention, and he barely disguises it.',
      applicability_conditions:[{text:'a rite performed often',evidence_requires:'rite|liturgy|ceremon'},{text:'a step nobody checks',evidence_requires:'order|step|clause'}],
      forbidden_restatements:[{forbid:'is bored',why:'the truth stated, not shown'}] },
    { category:'insecurity', canonical_truth:'Public honour paid to a peer makes him newly attentive to rank and merit.',
      applicability_conditions:[{text:'a peer deferred to',evidence_requires:'defer|regard|watching'},{text:'someone younger with standing',evidence_requires:'younger|senior|standing'}],
      forbidden_restatements:[{forbid:'is jealous',why:'named, not shown'}] },
    { category:'habit', canonical_truth:'With children he turns mistakes and even play into lessons, always.',
      applicability_conditions:[{text:'a youth doing badly',evidence_requires:'youth|child|first time'},{text:'a fixable error',evidence_requires:'error|wrong|mistake'}],
      forbidden_restatements:[{forbid:'is a teacher',why:'named, not shown'}] },
    { category:'contradiction', canonical_truth:'In questions of sacrifice he assumes an authority others have not earned.',
      applicability_conditions:[{text:'an offering named aloud',evidence_requires:'offering|memory|cost'},{text:'a cost judged small',evidence_requires:'cost|price|paid'}],
      forbidden_restatements:[{forbid:'is arrogant',why:'named, not shown'}] },
    { category:'value', canonical_truth:'With people who have little and cannot confer status he becomes unexpectedly kind.',
      applicability_conditions:[{text:'someone with nothing',evidence_requires:'barefoot|nothing|guest'},{text:'a person placed beneath',evidence_requires:'beneath|edge|apart'}],
      forbidden_restatements:[{forbid:'is kind',why:'named, not shown'}] }
  ];

  let scaffoldBody = null, scaffoldMaxTokens = null, respondWith = null;
  let scaffoldCalls = 0, scaffoldDispatches = 0, holdRelease = null, holdFor = null;
  let BASE_TOK = null;
  // Read from production rather than hardcoded, so a change to the allowance cannot leave this
  // assertion asserting a stale number while still passing.
  const PORTFOLIO_ALLOWANCE = await page.evaluate(() => window.__PORTFOLIO_MAX_TOKENS);
  let makePortfolio = null;         // responder derives subject_ref FROM THE REQUEST it received
  // ── EXACT NETWORK ACCOUNTING (2026-08-29) ──
  // "no paid call" is the weak claim: a catch-all that answers {"ok":true} to anything makes a
  // request we never anticipated indistinguishable from one we designed for. Every data request
  // is now classified into exactly one bucket, and anything unrecognised is ABORTED and counted,
  // so an unexpected dispatch fails the run instead of being quietly satisfied.
  const scaffoldReqs = [], plannerReqs = [], authorReqs = [], sheetReqs = [], otherModelReqs = [],
        unknownReqs = [], escapedReqs = [], staticReqs = [];
  const STATIC_API = /\/api\/(config|geo|csp-report|beta-events)\b/;
  page.on('request', r => {
    const u = r.url();
    if (/\/api\//.test(u) && !/localhost|127\.0\.0\.1/.test(u)) escapedReqs.push(u);
  });
  await page.route('**/api/**', async route => {
    const u = route.request().url();
    if (STATIC_API.test(u)) { staticReqs.push(u); return /* FULFILLED, NOT FORWARDED: a forwarded static endpoint spawns a @vercel/node runtime that is never reaped — they accumulate into gigabytes and wedge the dev server mid-suite. */ route.fulfill({ status:200, contentType:'application/json', body:'{}' }); }
    const body = route.request().postData() || '';
    let _sys = '';
    try { const _b = JSON.parse(body || '{}');
          _sys = String(((_b.messages || []).find(m => m.role === 'system') || {}).content || ''); } catch (_) {}
    const _isModel = /\/api\/(mistral-proxy|chatgpt-proxy|grok-proxy|xai-proxy|chat)\b/.test(u);
    const _isScaffold = /issueArcs|characterIcebergs|PORTFOLIO SUBJECTS|characterPortfolios/i.test(body);
    if (!_isModel && !_isScaffold) { unknownReqs.push(u); return route.abort(); }
    if (!_isScaffold) {
      if (/scene-structure planner for the OPENING scene/.test(_sys)) plannerReqs.push(u);
      else if (/ARCHITECTURE LAWS/.test(_sys)) authorReqs.push(u);
      else if (/DISTINGUISHING FEATURE \(anti-calcification ROTATION/.test(_sys)) sheetReqs.push(u);
      else otherModelReqs.push(u + ' :: ' + _sys.slice(0, 90).replace(/\s+/g, ' '));
      return route.fulfill({ status:200, contentType:'application/json', body:'{"ok":true}' });
    }
    scaffoldReqs.push(u);
    {
      scaffoldCalls++; scaffoldDispatches++;
      scaffoldBody = body;
      try { scaffoldMaxTokens = JSON.parse(body).max_tokens; } catch (_) {}
      // THE RESPONDER EXTRACTS THE BACKEND REF FROM THE REQUEST. Running the scaffold three times
      // to discover the id was itself unrealistic — production issues ONE call, and the model can
      // only echo what it was given.
      const seen = body.match(/plot:[A-Za-z0-9_]+:primary_antagonist/);
      let content = respondWith || '{"issueArcs":[{"n":1}],"characterIcebergs":{}}';
      if (makePortfolio && seen) content = JSON.stringify(makePortfolio(seen[0]));
      if (holdFor) {                      // genuinely in flight: released by the test
        await new Promise(res => { holdRelease = res; holdFor(); });
      }
      return route.fulfill({ status:200, contentType:'application/json',
        body: JSON.stringify({ ok:true, content, choices:[{ message:{ content } }] }) });
    }
  });

  const runScaffold = async (setup, responseObj) => {
    scaffoldBody = null; scaffoldMaxTokens = null;
    respondWith = responseObj === null ? null : JSON.stringify(responseObj);
    const cid = await page.evaluate(setup);
    await page.evaluate(async () => {
      window.state._cgScaffoldPromise = null; window.state.cgScaffold = null;
      try { if (typeof window._ensureCGScaffold === 'function') await window._ensureCGScaffold(window.state); } catch (_) {}
    });
    return cid;
  };

  const SETUP_PERSON = () => {
    const s = window.state;
    Object.assign(s, { storyId: 'req-person', _relationshipLedger: null, name: 'Lirael',
      playerName: 'Lirael', loveInterestName: 'Julian', world: 'modern', worldSubtype: 'city',
      storyLength: 'fling', tier: 'fling', _characterDisclosureLedger: {} });
    const cid = window._relPlotRoleEntity('aplot:req', 'primary_antagonist',
      { label: 'Marcus Vale', provenance: 'aplot_antagonist' });
    s.aPlot = { id: 'aplot:req', antagonistOrAntiForce: 'Marcus Vale', antagonistShape: 'A',
      antagonistSubject: { kind:'PERSON', reference_label:'Marcus Vale', proper_name:'Marcus Vale', canonicalId: cid } };
    return cid;
  };

  // BASELINE FIRST, measured not assumed: an identical fixture with no eligible subject, so the
  // expanded-ceiling assertion compares against this story's real baseline.
  const SETUP_NONE = () => {
    const s = window.state;
    Object.assign(s, { storyId: 'req-base', _relationshipLedger: null, name: 'Lirael',
      playerName: 'Lirael', loveInterestName: 'Julian', world: 'modern', worldSubtype: 'city',
      storyLength: 'fling', tier: 'fling', _characterDisclosureLedger: {} });
    s.aPlot = { id: 'aplot:base', antagonistOrAntiForce: 'the Ministry', antagonistShape: 'C',
      antagonistSubject: { kind: 'INSTITUTION', reference_label: 'the Ministry' } };
    return null;
  };
  await runScaffold(SETUP_NONE, { issueArcs: [{ n: 1 }] });
  BASE_TOK = scaffoldMaxTokens;

  // (1) eligible PERSON — ONE call; the responder echoes the ref it was given
  makePortfolio = (ref) => ({ issueArcs: [{ n: 1 }], characterIcebergs: {},
                              characterPortfolios: [{ subject_ref: ref, facets: FIVE }] });
  scaffoldCalls = 0;
  await runScaffold(SETUP_PERSON, null);
  makePortfolio = null;
  const realCid = await page.evaluate(() => (window.state.aPlot.antagonistSubject || {}).canonicalId);
  const personBody = scaffoldBody, personTok = scaffoldMaxTokens, personCalls = scaffoldCalls;
  const personOut = await page.evaluate((cid) => ({
    selectable: window._facetsForCharacter({ id: cid, label: 'Marcus Vale', aliases: ['Marcus Vale'] },
      window.state, { sceneNumber: 1 }).length,
    status: (window._relLedger().entities[cid].authorProfile || {}).status,
    onScaffold: !!(window.state.cgScaffold && window.state.cgScaffold.characterPortfolios)
  }), realCid);

  console.log('\n 8 · THE ACTUAL OUTGOING REQUEST');
  t('8a: the request carries the exact subject_ref EXACTLY once',
    !!personBody && (personBody.match(new RegExp(realCid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length === 1,
    personBody ? 'occurrences: ' + ((personBody.match(new RegExp(realCid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length) : 'NO REQUEST CAPTURED');
  t('8b: …and required_facet_count: 5 is stated by the backend, not chosen by the model',
    !!personBody && /required_facet_count:\s*5/.test(personBody), 'roster line missing');
  t('8a2: the acceptance path issues EXACTLY ONE scaffold call', personCalls === 1, String(personCalls));
  t('8c: the ceiling is EXACTLY the fixture baseline plus the declared allowance (a conservative\n      chars÷3 approximation over the measured worst-case response, not a token count)',
    personTok === BASE_TOK + PORTFOLIO_ALLOWANCE,
    'max_tokens=' + personTok + ' expected ' + (BASE_TOK + PORTFOLIO_ALLOWANCE));
  t('8d: the portfolio ATTACHES through the real scaffold call and becomes selectable',
    personOut.selectable === 5 && personOut.status === 'ready', JSON.stringify(personOut));
  t('8e: …and characterPortfolios never lands on the persisted scaffold',
    personOut.onScaffold === false, String(personOut.onScaffold));

  // (2) no eligible subject — explicit [] instruction, original ceiling
  await runScaffold(() => {
    const s = window.state;
    Object.assign(s, { storyId: 'req-none', _relationshipLedger: null, name: 'Lirael',
      playerName: 'Lirael', world: 'modern', worldSubtype: 'city', storyLength: 'fling', tier: 'fling' });
    s.aPlot = { id: 'aplot:none', antagonistOrAntiForce: 'the Ministry', antagonistShape: 'C',
      antagonistSubject: { kind: 'INSTITUTION', reference_label: 'the Ministry' } };
    return null;
  }, { issueArcs: [{ n:1 }] });
  const noneBody = scaffoldBody, noneTok = scaffoldMaxTokens;
  // (the baseline was measured before the person case; this run re-confirms it)
  // ── THE SCHEMA AND THE ROSTER APPEAR TOGETHER, OR NOT AT ALL (2026-08-29) ──
  // This asserted the old contract: the response schema always showed "characterPortfolios", so a
  // no-subject request needed a sentence telling the model to return []. That sentence was a rule
  // about a field with no subjects to fill it, printed beside a slot that said "COPY a subject_ref
  // from PORTFOLIO SUBJECTS below" when there was no such list — an instruction to invent one.
  // Now neither the key nor the rule is shown, so there is nothing to invent against.
  t('8f: a no-subject request is never shown the portfolio schema at all — no key, and no rule ' +
    'about a key the model cannot see',
    !!noneBody && !/characterPortfolios/.test(noneBody) && !/MUST be exactly \[\]/.test(noneBody),
    'the no-subject request still mentions characterPortfolios');
  t('8g: …carries no subject_ref, and preserves the ORIGINAL ceiling EXACTLY',
    !!noneBody && !/PORTFOLIO SUBJECTS — the ONLY/.test(noneBody) && noneTok === BASE_TOK,
    'max_tokens=' + noneTok + ' expected ' + BASE_TOK);

  // (3) a READY subject follows the same no-subject path
  await runScaffold(() => {
    const cid = (function () {
      const s = window.state;
      Object.assign(s, { storyId: 'req-ready', _relationshipLedger: null, name: 'Lirael',
        playerName: 'Lirael', world: 'modern', worldSubtype: 'city', storyLength: 'fling', tier: 'fling' });
      const c = window._relPlotRoleEntity('aplot:ready', 'primary_antagonist', { label: 'Marcus Vale' });
      const ap = window._relLedger().entities[c].authorProfile;
      ap.status = 'ready'; ap.cPlusFacets = [{ facet_id: 'x', category: 'value', canonical_truth: 'already authored' }];
      s.aPlot = { id: 'aplot:ready', antagonistOrAntiForce: 'Marcus Vale', antagonistShape: 'A',
        antagonistSubject: { kind:'PERSON', reference_label:'Marcus Vale', canonicalId: c } };
      return c;
    })();
    return cid;
  }, { issueArcs: [{ n:1 }] });
  t('8h: a READY subject is not re-requested — same no-subject path, EXACT original ceiling',
    !!scaffoldBody && !/PORTFOLIO SUBJECTS — the ONLY/.test(scaffoldBody) && scaffoldMaxTokens === BASE_TOK,
    'max_tokens=' + scaffoldMaxTokens + ' expected ' + BASE_TOK);

  await page.evaluate((f) => { window.__FIVE = f; }, FIVE);

  // (4) a story change in flight attaches nothing
  await runScaffold(SETUP_PERSON, null);
  const flightCid = await page.evaluate(() => (window.state.aPlot.antagonistSubject || {}).canonicalId);
  const flight = await page.evaluate(async (cid) => {
    const s = window.state;
    const roster = window._capturePortfolioRoster(s);
    s.storyId = 'somewhere-else';                      // the player moved on mid-flight
    const parsed = { characterPortfolios: [{ subject_ref: cid, facets: window.__FIVE }] };
    const r = window._handleScaffoldPortfolios(parsed, roster);
    return { code: r.code, attached: r.attached };
  }, flightCid);
  t('8i: a response arriving after a story change attaches NOTHING',
    flight.code === 'story_changed' && !flight.attached, JSON.stringify(flight));

  // ══════════════════════════════════════════════════════════════════════════════════════
  // 9 · THE REMAINING GATES — each drives the real call site, not the helper beside it
  // ══════════════════════════════════════════════════════════════════════════════════════

  // (1) VERIFICATION THAT THROWS MUST FAIL CLOSED
  await runScaffold(() => {
    const s = window.state;
    Object.assign(s, { storyId: 'req-throw', _relationshipLedger: null, name: 'Lirael',
      playerName: 'Lirael', world: 'modern', worldSubtype: 'city', storyLength: 'fling', tier: 'fling' });
    const cid = window._relPlotRoleEntity('aplot:throw', 'primary_antagonist', { label: 'Marcus Vale' });
    s.aPlot = { id: 'aplot:throw', antagonistOrAntiForce: 'Marcus Vale', antagonistShape: 'A',
      antagonistSubject: { kind: 'PERSON', reference_label: 'Marcus Vale', canonicalId: cid } };
    // Replacing window._relLedger does NOT reach the code: _capturePortfolioRoster calls the
    // module-scope binding. The ledger OBJECT is made to throw instead, which is also closer to
    // the real failure — a corrupted or partially restored store, not a missing function.
    const bad = { v: 1, storyId: 'req-throw', processed: {}, edges: {}, seq: 0 };
    Object.defineProperty(bad, 'entities', { get: function () { throw new Error('ledger unavailable'); } });
    s._relationshipLedger = bad;
    return cid;
  }, { issueArcs: [{ n: 1 }] });
  const throwBody = scaffoldBody, throwTok = scaffoldMaxTokens;
  const throwRoster = await page.evaluate(() => {
    const r = window._capturePortfolioRoster(window.state);
    window.state._relationshipLedger = null;             // restore a sane store
    return r;
  });
  console.log('\n 9 · REMAINING GATES');
  t('9a: a ledger that THROWS during verification yields an ineligible roster, with a reason',
    throwRoster.eligible === false && throwRoster.subject_ref === null
      && throwRoster.reason === 'roster_verification_failed', JSON.stringify(throwRoster));
  t('9b: …no portfolio roster in the request and NO expanded allowance',
    !!throwBody && !/PORTFOLIO SUBJECTS — the ONLY/.test(throwBody) && throwTok === BASE_TOK,
    'max_tokens=' + throwTok + ' expected ' + BASE_TOK);

  // (3) A PERSON-CLAIMED A-PLOT WHOSE REF RESOLVES TO A NON-PERSON
  await runScaffold(() => {
    const s = window.state;
    Object.assign(s, { storyId: 'req-nonperson', _relationshipLedger: null, name: 'Lirael',
      playerName: 'Lirael', world: 'modern', worldSubtype: 'city', storyLength: 'fling', tier: 'fling' });
    window._relSocialSlotEntity('pc', 'friend', { ord: 1, slotId: 'seedledger#1' });   // create the ledger
    const L = window._relLedger();
    L.entities['thing:the_ministry'] = { id: 'thing:the_ministry', kind: 'object',
      label: 'the Ministry', aliases: [] };
    s.aPlot = { id: 'aplot:np', antagonistOrAntiForce: 'the Ministry', antagonistShape: 'A',
      antagonistSubject: { kind: 'PERSON', reference_label: 'the Ministry',
                           canonicalId: 'thing:the_ministry' } };
    return 'thing:the_ministry';
  }, { issueArcs: [{ n: 1 }],
       characterPortfolios: [{ subject_ref: 'thing:the_ministry', facets: FIVE }] });
  const npBody = scaffoldBody, npTok = scaffoldMaxTokens;
  const npOut = await page.evaluate(() => ({
    facets: ((window._relLedger().entities['thing:the_ministry'] || {}).authorProfile || {}).cPlusFacets || [],
    roster: window._capturePortfolioRoster(window.state) }));
  t('9c: a PERSON-claimed ref resolving to a NON-PERSON emits no roster and keeps the baseline ceiling',
    !/PORTFOLIO SUBJECTS — the ONLY/.test(npBody) && npTok === BASE_TOK
      && npOut.roster.eligible === false && /not_a_person/.test(String(npOut.roster.reason)),
    JSON.stringify({ tok: npTok, base: BASE_TOK, reason: npOut.roster.reason }));
  t('9d: …and a forged portfolio for it attaches nothing',
    npOut.facets.length === 0, JSON.stringify(npOut.facets));

  // (2) THE REAL MID-FLIGHT RACE — the response is genuinely held, the story genuinely changes
  const race = await (async () => {
    makePortfolio = (ref) => ({ issueArcs: [{ n: 1 }],
                                characterPortfolios: [{ subject_ref: ref, facets: FIVE }] });
    let reached; const arrived = new Promise(r => { reached = r; });
    holdFor = () => reached();
    await page.evaluate(() => {
      const s = window.state;
      Object.assign(s, { storyId: 'race-A', _relationshipLedger: null, name: 'Lirael',
        playerName: 'Lirael', world: 'modern', worldSubtype: 'city', storyLength: 'fling', tier: 'fling',
        cgScaffold: null, _cgScaffoldPromise: null });
      const cid = window._relPlotRoleEntity('aplot:race', 'primary_antagonist', { label: 'Marcus Vale' });
      s.aPlot = { id: 'aplot:race', antagonistOrAntiForce: 'Marcus Vale', antagonistShape: 'A',
        antagonistSubject: { kind: 'PERSON', reference_label: 'Marcus Vale', canonicalId: cid } };
      window.__raceCid = cid;
      window.__racePromise = window._ensureCGScaffold(s);   // NOT awaited: it is in flight
    });
    await arrived;                                          // the request is now parked
    await page.evaluate(() => { window.state.storyId = 'race-B'; });   // the player moved on
    holdRelease && holdRelease(); holdFor = null;
    await page.evaluate(async () => { try { await window.__racePromise; } catch (_) {} });
    makePortfolio = null;
    return page.evaluate(() => ({
      facets: ((window._relLedger(true) && window._relLedger().entities[window.__raceCid] || {}).authorProfile || {}).cPlusFacets || [],
      storyNow: window.state.storyId,
      scaffoldHasPortfolios: !!(window.state.cgScaffold && window.state.cgScaffold.characterPortfolios) }));
  })();
  t('9e: a response released AFTER a story change attaches nothing',
    race.facets.length === 0, JSON.stringify(race));
  t('9f: …and no portfolio survives on the scaffold of the story that is now active',
    race.scaffoldHasPortfolios === false && race.storyNow === 'race-B', JSON.stringify(race));

  // (4) MUTATION CONTROL — does this harness judge the CALL SITE, or only the function beside it?
  // Every earlier "seam" test in this workstream passed while production was broken, because it
  // called the handler directly. The control is simple: delete the production invocation from the
  // source, serve THAT, and require the attachment assertion to fail. If it still passes, the
  // suite is not testing what it claims to test.
  const MUTANT = SRC.replace('_handleScaffoldPortfolios(parsed, _pfRoster);',
                             '/* MUTATION CONTROL: production invocation removed */');
  t('9g: the mutation actually changed the source (the control is not vacuous)',
    MUTANT !== SRC && MUTANT.indexOf('_handleScaffoldPortfolios(parsed, _pfRoster);') === -1,
    'the invocation string was not found — update the control');

  const mutantAttached = await (async () => {
    const mctx = await browser.newContext();
    try {
      const mp = await mctx.newPage();
      mp.setDefaultTimeout(90000); mp.setDefaultNavigationTimeout(90000);
      await mp.route('**/app.js*', r => r.fulfill({ status:200,
        contentType:'application/javascript; charset=utf-8', body: MUTANT }));
      await mp.route('**/api/**', async route => {
        const u = route.request().url();
        if (/\/api\/(config|geo|csp-report|beta-events)\b/.test(u)) return /* FULFILLED, NOT FORWARDED: a forwarded static endpoint spawns a @vercel/node runtime that is never reaped — they accumulate into gigabytes and wedge the dev server mid-suite. */ route.fulfill({ status:200, contentType:'application/json', body:'{}' });
        const body = route.request().postData() || '';
        if (/issueArcs|characterIcebergs|PORTFOLIO SUBJECTS/i.test(body)) {
          const seen = body.match(/plot:[A-Za-z0-9_]+:primary_antagonist/);
          const content = JSON.stringify({ issueArcs: [{ n: 1 }],
            characterPortfolios: seen ? [{ subject_ref: seen[0], facets: FIVE }] : [] });
          return route.fulfill({ status:200, contentType:'application/json',
            body: JSON.stringify({ ok:true, content, choices:[{ message:{ content } }] }) });
        }
        return route.fulfill({ status:200, contentType:'application/json', body:'{"ok":true}' });
      });
      await mp.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
      await mp.waitForFunction(() => typeof window._ensureCGScaffold === 'function'
        && typeof window._relPlotRoleEntity === 'function', { timeout:60000 });
      return await mp.evaluate(async () => {
        const s = window.state;
        Object.assign(s, { storyId: 'mutant', _relationshipLedger: null, name: 'Lirael',
          playerName: 'Lirael', world: 'modern', worldSubtype: 'city', storyLength: 'fling',
          tier: 'fling', cgScaffold: null, _cgScaffoldPromise: null });
        const cid = window._relPlotRoleEntity('aplot:mutant', 'primary_antagonist', { label: 'Marcus Vale' });
        s.aPlot = { id: 'aplot:mutant', antagonistOrAntiForce: 'Marcus Vale', antagonistShape: 'A',
          antagonistSubject: { kind: 'PERSON', reference_label: 'Marcus Vale', canonicalId: cid } };
        try { await window._ensureCGScaffold(s); } catch (_) {}
        return window._facetsForCharacter({ id: cid, label: 'Marcus Vale', aliases: ['Marcus Vale'] },
          s, { sceneNumber: 1 }).length;
      });
    } finally { await mctx.close().catch(() => {}); }
  })();
  t('9h: with the production invocation REMOVED, the attachment assertion FAILS — so the ' +
    'unmutated pass is evidence about the call site, not about the helper',
    mutantAttached === 0, 'mutant still attached ' + mutantAttached + ' facet(s)');

  console.log('\n 6 · COST — EXACT REQUEST ACCOUNTING');
  console.log('   scaffold=' + scaffoldReqs.length + ' planner=' + plannerReqs.length
    + ' author=' + authorReqs.length + ' characterSheet=' + sheetReqs.length
    + ' otherModel=' + otherModelReqs.length
    + ' unknown=' + unknownReqs.length + ' escaped=' + escapedReqs.length
    + ' staticApi=' + staticReqs.length + ' paid(sections1-7)=' + paid);
  t('6a: every scaffold dispatch is accounted for one-for-one, and there were exactly ' +
    scaffoldDispatches + ' of them',
    scaffoldReqs.length === scaffoldDispatches && scaffoldDispatches > 0,
    'routed=' + scaffoldReqs.length + ' counted=' + scaffoldDispatches);
  t('6b: this suite dispatched NO Scene-1 planner and NO author request',
    plannerReqs.length === 0 && authorReqs.length === 0,
    JSON.stringify({ planner: plannerReqs.slice(0, 2), author: authorReqs.slice(0, 2) }));
  // The character-sheet dispatches are ordinary story setup, not portfolio work. They are named
  // rather than swept into a catch-all so that a NEW kind of request cannot hide among them.
  t('6c: the only other model traffic is character-sheet setup, all of it intercepted',
    otherModelReqs.length === 0,
    JSON.stringify([...new Set(otherModelReqs)].slice(0, 3)));
  t('6d: every unrecognised data request was ABORTED, and there were none',
    unknownReqs.length === 0, JSON.stringify(unknownReqs.slice(0, 3)));
  t('6e: nothing escaped the harness', escapedReqs.length === 0,
    JSON.stringify(escapedReqs.slice(0, 3)));
  t('6f: zero paid calls — every request was intercepted or aborted; the only continued ones ' +
    'are the dev server\'s own static config endpoints',
    paid === 0 && staticReqs.every(u => STATIC_API.test(u)),
    'paid=' + paid + ' static=' + JSON.stringify(staticReqs.slice(0, 3)));
} finally { await ctx.close().catch(() => {}); }

console.log(`\n${'─'.repeat(88)}\n  ${pass} passed · ${fail} failed\n`);
await closeBrowser();
process.exit(fail ? 1 : 0);
