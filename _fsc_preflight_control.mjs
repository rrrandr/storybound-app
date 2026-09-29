// ZERO-COST PREFLIGHT + CONTROL for the First Sacrifice roster-compliance run.
// Every network call is ABORTED. Nothing is spent. Nothing is dispatched from this file.
//
// Proves, before any paid run is possible:
//   1. a real First Sacrifice story loads through the NORMAL launch path (window._launchStarterStory
//      with the catalog entry from window.STARTER_STORIES) — not a default story plus an injection;
//   2. the story identity is asserted STRUCTURALLY (state._starterId, the seed/plan registry key),
//      not by prose keywords;
//   3. the terminal author payload is harvested with every call aborted;
//   4. BOTH First Sacrifice identity AND the exact sealed boundary are present in that payload.
//
// Exported for the paid runner as a hard gate: preflight() resolves to { ok, body, ... } and the
// runner may not dispatch unless ok === true.
import fs from 'fs';
import { chromium } from 'playwright-core';

const STARTER_ID = 'starter_first_sacrifice';
const WISH = 'I want to disappear.';
const EXPECT = 'unm.the_turning_forgotten';
const MARKERS = [/FORBIDDEN INVENTIONS/i, /SCENE DIRECTIVES/i, /DIRECTIVE/, /write the scene/i,
  /screenplay-native|cinematic-romance writer|prose author/i];

export async function preflight(opts = {}) {
  const verbose = !!opts.verbose;
  // The wish and the outcome it must compile to are parameters so the SAME proven gate serves every
  // outcome. Defaults keep the standalone control and the roster runner unchanged.
  const wish = opts.wish || WISH;
  const expect = opts.expect || EXPECT;
  const expectChoicePending = !!opts.expectChoicePending;
  const expectInsideReplacementPOV = !!opts.expectInsideReplacementPOV;
  const say = (...a) => { if (verbose) console.log(...a); };
  const checks = [];
  const ok = (n, c, d) => { checks.push({ name: n, ok: !!c, detail: d }); return !!c; };

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const calls = [];
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    let body = null; try { body = req.postData(); } catch (_) {}
    calls.push({ bytes: body ? body.length : 0, body });
    if (body && body.length > 50000) { try { page.evaluate(() => { window.__preflightSawAuthor = true; }); } catch (_) {} }
    try { await route.abort(); } catch (_) {}
  });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof window._launchStarterStory === 'function'
    && Array.isArray(window.STARTER_STORIES), { timeout: 20000 });

  // ── 1+2. Launch through the normal path; assert STRUCTURED identity. ────────────────────
  const launched = await page.evaluate(async (id) => {
    const def = window.STARTER_STORIES.find(s => s.id === id);
    if (!def) return { found: false };
    await window._launchStarterStory(def);
    await new Promise(r => setTimeout(r, 1500));
    const s = window.state || {};
    return { found: true, defId: def.id,
      starterId: s._starterId,                       // structured registry key
      hasSeed: !!(window.STARTER_SEEDS && window.STARTER_SEEDS[id]),
      hasPlan: !!(window.STARTER_PLANS && window.STARTER_PLANS[id]),
      pcName: s.playerName || null, liName: s.loveInterestName || null,
      tone: s.picks && s.picks.tone };
  }, STARTER_ID);

  ok('starter catalog entry exists', launched.found);
  ok('story launched through the normal path', !!launched.starterId);
  ok('STRUCTURED identity: state._starterId === ' + STARTER_ID,
    launched.starterId === STARTER_ID, 'got ' + launched.starterId);
  ok('the id resolves in STARTER_SEEDS', launched.hasSeed);
  ok('the id resolves in STARTER_PLANS', launched.hasPlan);
  say('  identity   : _starterId=' + launched.starterId + '  pc=' + launched.pcName
    + '  li=' + launched.liName);

  // ── 3. Compile the consequence and harvest the terminal author payload. ────────────────
  const run = await page.evaluate(async (wish) => {
    const rec = window._fscCompileAndPersist(wish, { source: 'preflight' });
    const o = { outcomeId: rec && rec.outcomeId,
      roster: rec && rec.population && rec.population.roster,
      invokerScope: rec && rec.invokerScope,
      beat: rec && rec.aftermathBeat && rec.aftermathBeat.text,
      opensChoicePending: !!(rec && rec.opensChoicePending),
      block: window._fscPromptBlock(),
      digest: window._fscBoundaryDigest(window._fscPromptBlock()) };
    // First Sacrifice ships a BAKED Scene 1 — no author call is made for it. Walk forward to
    // the first index that actually generates. Costs nothing: every call is aborted.
    o.tried = [];
    for (const idx of [2, 3, 1]) {
      o.tried.push(idx);
      try { await Promise.race([window._runCGScreenplayGen(idx, '', ''), new Promise(r => setTimeout(r, 35000))]); }
      catch (e) { o.err = String(e && e.message); }
      if (window.__preflightSawAuthor) break;
    }
    o.deliveryFailure = window.state._fscDeliveryFailure || null;
    return o;
  }, wish);
  await browser.close();

  ok('consequence compiled: ' + expect, run.outcomeId === expect, run.outcomeId);
  ok('roster is all five present', (run.roster || []).length === 5, (run.roster || []).join(','));
  ok('invokerScope in_population', run.invokerScope === 'in_population', run.invokerScope);
  ok('an aftermath beat is present', !!(run.beat && run.beat.length > 40));
  ok('no delivery failure recorded', run.deliveryFailure === null, JSON.stringify(run.deliveryFailure));

  const authored = calls.filter(c => c.body).map(c => {
    let msgs = null; try { msgs = (JSON.parse(c.body).messages || []).length; } catch (_) {}
    return { ...c, msgs, marks: MARKERS.reduce((n, rx) => n + (rx.test(c.body) ? 1 : 0), 0) };
  }).filter(r => r.marks >= 2 && r.msgs === 2).sort((a, b) => b.bytes - a.bytes);
  const terminal = authored[0] || null;
  ok('a terminal author request was captured', !!terminal);
  say('  harvest    : ' + calls.length + ' calls attempted, all aborted ($0)');

  // ── 4. BOTH identity AND the sealed boundary must be in that payload. ──────────────────
  const b = terminal ? terminal.body : '';
  // The harvested body is JSON, so a double quote inside the prompt arrives as \". Assertions that
  // quote the prompt's own text match against this decoded copy.
  const bDec = b.replace(/\\"/g, '"').replace(/\\n/g, '\n');
  // Story identity in the payload, asserted on First Sacrifice's own structural markers.
  const FS_MARKERS = ['Veilwood', 'Sacrificiant', 'First Favored'];
  const idHits = FS_MARKERS.filter(m => b.indexOf(m) >= 0);
  ok('payload carries First Sacrifice story identity', idHits.length >= 2, 'hits=' + idHits.join(','));
  ok('payload does NOT carry the default corporate story',
    !/Veyne Tower|skyscraper|floor-to-ceiling glass/i.test(b));
  // The sealed boundary, exactly.
  ok('payload carries OUTCOME: ' + expect, b.indexOf('OUTCOME: ' + expect) >= 0);
  ok('payload carries EFFECT BOUNDARY', b.indexOf('EFFECT BOUNDARY') >= 0);
  ok('payload carries AFFECTED scope', b.indexOf('AFFECTED — exactly these people') >= 0);
  ok('payload carries LIRAEL IS AFFECTED', b.indexOf('LIRAEL IS AFFECTED') >= 0);
  ok('payload carries the AFTERMATH BEAT', b.indexOf('AFTERMATH BEAT') >= 0);
  ok('payload carries the authored beat text', !!(run.beat && b.indexOf(run.beat.slice(0, 48)) >= 0));
  ok('payload carries FORBIDDEN INVENTIONS', b.indexOf('FORBIDDEN INVENTIONS') >= 0);
  ok('payload forbids visible wish-energy', b.indexOf('visible wish-energy') >= 0);
  // C4 is only reachable if the STOP instruction is actually in the request. Without these the
  // run could "fail C4" on an instruction the author was never given — an untestable run.
  if (expectChoicePending) {
    ok('the compiled record opens a pending choice', run.opensChoicePending === true);
    ok('payload carries END ON THE CHOICE', b.indexOf('END ON THE CHOICE') >= 0);
    ok('payload forbids authoring past the choice',
      b.indexOf('Author nothing past it') >= 0 && b.indexOf('imply nothing about which way she goes') >= 0);
    // The renewed choice must be derivable from post-replacement canon only. The C4 run ended on
    // "let the assumption stand", resting on a questioning the same delta erased.
    ok('payload derives the choice from ACTIVE CANON',
      b.indexOf('THE CHOICE RESTS ON ACTIVE CANON ONLY') >= 0);
    ok('payload names what the choice MAY NOT rest on', b.indexOf('IT MAY NOT REST ON') >= 0);
    ok('payload rejects an option that ONLY makes sense under the replaced history',
      b.indexOf('An option is wrong if it ONLY makes sense under the replaced history') >= 0);
    // CORRECTED: the payload previously asserted "There is no standing assumption to let stand".
    // That was false — twist.assembly_turned and twist.loose_note_heard survive the replacement.
    ok('payload does NOT carry the withdrawn false claim about the assumption',
      b.indexOf('There is no standing assumption to let stand') < 0);
    ok('payload states unlisted facts remain available to the choice',
      b.indexOf('is untouched and remains fully available to the') >= 0);
    ok('payload permits a standing assumption resting on active facts',
      b.indexOf('A standing assumption that') >= 0
      && b.indexOf('rests on the ACTIVE facts above may remain, and she may address it') >= 0);
  }
  // ── THE HISTORY-REWRITE POV RULE MUST BE IN THE REAL PAYLOAD ────────────────────────────────
  // Asserted here because the C4 failure was an instruction gap, and an instruction that does not
  // reach the author is not a fix. These check the FINAL assembled request, not the renderer.
  if (expectInsideReplacementPOV) {
    ok('payload carries WRITE FROM INSIDE THE REPLACEMENT',
      b.indexOf('WRITE FROM INSIDE THE REPLACEMENT') >= 0);
    ok('payload states the affected have NO memory of the replaced timeline',
      b.indexOf('have NO memory, NO knowledge and NO narration of the') >= 0);
    ok('payload states it is not something they forgot',
      b.indexOf('It is not a thing they forgot. For them it never occurred.') >= 0);
    ok('payload requires the replay be their ONLY experienced version',
      b.indexOf('their ONLY experienced version of events') >= 0);
    // Scoped to the FORBIDDEN list itself, with whitespace collapsed — the list wraps across
    // prompt lines, so a raw substring match on a quoted phrase can straddle a newline.
    const flat = bDec.replace(/\s+/g, ' ');
    const fStart = flat.indexOf('FORBIDDEN, in narration and dialogue alike:');
    const fEnd = flat.indexOf('If a line only makes sense', fStart);
    const forbiddenList = (fStart >= 0 && fEnd > fStart) ? flat.slice(fStart, fEnd) : '';
    ok('the payload contains the forbidden-vocabulary list', !!forbiddenList);
    ok('payload forbids the external-timeline vocabulary',
      ['"again"', '"a second time"', '"the first time"', '"what they lost"',
       'remember nothing of', '"never happened"'].every(p => forbiddenList.indexOf(p) >= 0),
      forbiddenList.slice(0, 120));
    ok('payload states the record is the READER’S, not character knowledge',
      b.indexOf('are the READER’S record') >= 0
      && b.indexOf('NOT character knowledge') >= 0);
    ok('payload forbids an unestablished shared understanding',
      bDec.indexOf('no "he knows I know"') >= 0
      && bDec.indexOf('NOW TRUE lines above establish that relationship outright') >= 0);
    ok('payload names the aftermath beat as the ONLY permitted trace',
      b.indexOf('the ONLY permitted trace') >= 0 && b.indexOf('Feeling, never fact') >= 0);
    // THE ABSENCE CLAUSE — the rerun's only genuine violation.
    ok('payload forbids narrating an erased event’s absence or echo',
      b.indexOf('Do NOT narrate an erased event, its absence, its non-occurrence, or an') >= 0);
    ok('payload denies the non-event any perceptible trace',
      b.indexOf('There is no silence where it was') >= 0
      && b.indexOf('no echo of it in the air') >= 0);
    ok('payload states a non-event leaves nothing to perceive',
      b.indexOf('It did not happen, so it leaves NOTHING to perceive, miss or mark') >= 0);
    ok('payload limits rendering to active canon + the sealed beat',
      b.indexOf('Render ONLY (a) active canon and (b) the sealed aftermath beat') >= 0);
    // ── AUDIT LANGUAGE MUST NOT REACH THE WRITER ────────────────────────────────────────────
    // The final run's one violation was the model echoing its own NOW TRUE line, which read
    // "The rite played through a second time".
    ok('NOW TRUE uses writer language, not the ledger’s counting frame',
      b.indexOf('The rite proceeds uninterrupted') >= 0);
    ok('the audit phrase "played through a second time" is ABSENT from the payload',
      b.indexOf('played through a second time') < 0);
    // ── THE OPENING RULE, AND ITS POSITION ──────────────────────────────────────────────────
    const iOpen = b.indexOf('OPENING ORIENTATION — HISTORICAL REPLACEMENT');
    const iBeats = b.indexOf('\\"beats\\": [ {') >= 0
      ? b.indexOf('\\"beats\\": [ {') : b.indexOf('"beats": [ {');
    ok('payload carries the OPENING ORIENTATION rule', iOpen >= 0);
    ok('it sits BEFORE the beats schema, not only in the later boundary block',
      iOpen >= 0 && iBeats > 0 && iOpen < iBeats, 'open@' + iOpen + ' beats@' + iBeats);
    ok('it says to begin inside the only timeline the characters know',
      b.indexOf('Begin inside the ONLY timeline the characters know') >= 0);
    ok('it names the permitted orientation: place, body, stakes, present action',
      b.indexOf('immediate place, body,') >= 0 && b.indexOf('active stakes and present action') >= 0);
    ok('it forbids numbering / repetition / replacement / comparison',
      b.indexOf('NOT by numbering, repetition, replacement, or') >= 0);
    ok('it separates ledger language from writer language',
      b.indexOf('That is audit') >= 0 && b.indexOf('language and it is never writer language') >= 0);
  }

  const allOk = checks.every(c => c.ok);
  return { ok: allOk, checks, body: b, bytes: terminal ? terminal.bytes : 0,
    compiled: { outcomeId: run.outcomeId, roster: run.roster, invokerScope: run.invokerScope,
                beat: run.beat, digest: run.digest },
    identity: launched };
}

// Run standalone as a control.
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('=== ZERO-COST PREFLIGHT CONTROL (all network aborted, $0) ===\n');
  const r = await preflight({ verbose: true });
  r.checks.forEach(c => console.log('  ' + (c.ok ? 'ok  ' : 'FAIL') + ' ' + c.name
    + (c.ok || !c.detail ? '' : '  — ' + c.detail)));
  console.log('\n  terminal author payload: ' + r.bytes + ' bytes');
  console.log('  boundary digest        : ' + (r.compiled.digest || '-'));
  const p = r.checks.filter(c => c.ok).length;
  console.log('\n' + (r.ok ? 'PASS' : 'FAIL') + '  ' + p + '/' + r.checks.length + ' checks');
  if (r.ok) fs.writeFileSync('_fsc_preflight_ok.json', JSON.stringify(
    { at: new Date().toISOString(), bytes: r.bytes, compiled: r.compiled }, null, 2));
  process.exit(r.ok ? 0 : 1);
}
