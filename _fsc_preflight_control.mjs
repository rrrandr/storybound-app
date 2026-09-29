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
      // TWO ARTIFACTS, harvested separately: the SPEC (never sent) and the BRIEF (the only Fate
      // material the author sees).
      spec: window._fscPromptBlock(),
      brief: window._fscAuthorBriefBlock(),
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

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // TWO ARTIFACTS. The author request must carry the BRIEF and must NOT carry the SPEC.
  //
  // Five paid runs established that adding prohibitions to a 258KB writer prompt stopped working:
  // every remaining failure had its rule present in the request, and the author began transcribing
  // the instruction stack into the prose. The strict rules did not go away — they moved into the
  // machine specification, which is persisted and scored against, and is never sent.
  // ══════════════════════════════════════════════════════════════════════════════════════════

  // ── 4a. THE BRIEF IS PRESENT, WHOLE ─────────────────────────────────────────────────────
  const briefLines = String(run.brief || '').split('\n').map(s => s.trim()).filter(s => s.length > 20);
  ok('an author brief was rendered', briefLines.length >= 3, briefLines.length + ' lines');
  ok('every line of the brief is in the author request',
    briefLines.length > 0 && briefLines.every(l => b.indexOf(l.slice(0, 60)) >= 0));
  // Generic, for every outcome: the brief must read as scene direction, not specification.
  ok('the brief names the permitted visible reactions',
    b.indexOf('none of them can name it') >= 0 || b.indexOf('cannot say why') >= 0
    || b.indexOf('can name the moment') >= 0);
  ok('the brief carries no price, debt or cost language',
    !/\b(cost|price|debt|toll|payment|uncounted)\b/i.test(run.brief || ''));
  ok('the brief carries no glow or wish-energy',
    !/\b(glow\w*|shimmer\w*|luminous|aura|wish-energy)\b/i.test(run.brief || ''));
  ok('the brief carries no replay, erasure or count',
    !/\b(replay\w*|erased|a second time|the first time|again\b)/i.test(run.brief || ''));

  // Outcome-specific, for the outcome actually under test.
  if (expect === 'unm.time_gives_way') {
    ok('the brief opens on present reality, not a count',
      b.indexOf('The rite concludes uninterrupted') >= 0);
    ok('the brief gives the ground its colour, not a glow',
      b.indexOf('dark with the colour of old offerings') >= 0);
    ok('the brief states Julian kept the Answer throughout',
      b.indexOf('Julian has kept the Answer in his hands throughout') >= 0);
    ok('the brief states no question was put, and the suspicion remains',
      b.indexOf('No one has put a question to Lirael') >= 0
      && b.indexOf('suspicion rests on her all the same') >= 0);
    ok('the brief names the live stakes without calling them a price',
      b.indexOf('standing is what is at stake in front of her now') >= 0);
    ok('the brief names the owed choice and where to end',
      b.indexOf('owes a choice she has not yet made') >= 0
      && b.indexOf('Bring the scene to that choice and end there') >= 0);
  }
  if (expect === 'unm.the_turning_forgotten') {
    ok('the brief opens on the present look, with no cause named',
      b.indexOf('Every eye in the clearing rests on Lirael') >= 0);
    ok('Lirael is not spared in the brief',
      b.indexOf('and Lirael cannot say either') >= 0);
    // The wish-causation clause was WITHDRAWN: the reader may understand the intervention, the
    // characters need not narrate it. The surviving twist fact is the loose note, which the
    // assembly actually heard.
    ok('the brief names the surviving twist fact without naming the wish as its cause',
      b.indexOf('The loose note was heard') >= 0
      && b.indexOf('came true where everyone could see how') < 0);
  }

  // ── 4b. THE MACHINE SPECIFICATION IS ABSENT FROM THE AUTHOR REQUEST ─────────────────────
  // Every heading, field name, gate name, atom id, audit phrase and forbidden-token list that
  // used to be shipped. Each of these is a string the writer must never see.
  const SPEC_TERMS = [
    'EFFECT BOUNDARY', 'PRESELECTED CONSEQUENCE', 'OUTCOME: ', 'READING: EXACT', 'READING: FATE-CHOSEN',
    'AFFECTED — exactly these people', 'NOT AFFECTED', 'LIRAEL IS AFFECTED', 'EFFECT LIMITED TO',
    'CANON CHANGE', 'CEASES:', 'NOW TRUE:', 'HISTORY:', 'MUST REMAIN TRUE', 'COST: ',
    'AFTERMATH BEAT', 'FORBIDDEN INVENTIONS', 'END ON THE CHOICE',
    'THE CHOICE RESTS ON ACTIVE CANON ONLY', 'IT MAY NOT REST ON',
    'WRITE FROM INSIDE THE REPLACEMENT', 'OPENING ORIENTATION',
    'active canon', 'invokerScope', 'temporalOperation',
    'historical_replacement', 'memory_perception', 'population.scene_present', 'aftermathBeat',
    'unm.time_gives_way', 'interr.julian_questioned_lirael', 'twist.assembly_turned',
    'played through a second time', 'audit language', 'the ledger',
    'the ONLY permitted trace', 'Feeling, never fact',
    'holds a price in reserve', 'DEFERRED cost'
  ];
  const leaked = SPEC_TERMS.filter(t => b.indexOf(t) >= 0);
  ok('NO machine-specification term reaches the author request',
    leaked.length === 0, 'leaked: ' + leaked.join(' | '));

  // NO LONGER EXEMPT. These two were previously recorded as "pre-existing, out of scope" because
  // they originate outside the Fate block. That was the wrong test: an internal label is a defect
  // wherever it comes from, and the model had already copied one into prose ("The decision gate
  // stands before me."). Both are now removed from author-visible material and ASSERTED absent:
  //   decisionGateBeatIdx — withdrawn from the CG author schema entirely. The engine already owned
  //                         the value: it defaults to the last beat and is then clamped to the true
  //                         last index, so nothing the model emitted ever survived.
  //   visible wish-energy — the seed's world truths now describe what the world LOOKS like instead
  //                         of listing effects to avoid. The prohibition itself lives on in the
  //                         machine spec and in the magical-residue scanner.
  const INTERNAL_LABELS = ['decisionGateBeatIdx', 'decision gate', 'visible wish-energy',
    'glowing ward-signs', 'warding gestures', 'responsive ceremonial fire'];
  const labelLeaks = INTERNAL_LABELS.filter(t => b.indexOf(t) >= 0);
  ok('NO internal schema label or prohibition vocabulary reaches the author request',
    labelLeaks.length === 0, 'leaked: ' + labelLeaks.join(' | '));
  ok('the world truths describe the world positively instead',
    b.indexOf('Fate works unseen') >= 0 && b.indexOf('THE RITE IS PROCEDURE AND CUSTOM') >= 0);

  // The forbidden-token lists must be gone as lists, not merely reworded.
  const FORBIDDEN_LIST_MARKERS = ['FORBIDDEN, in narration and dialogue alike',
    'the cost is uncounted / unnamed', '"a second time"', '"the first time"', '"what they lost"',
    '"he knows I know"'];
  const listLeaks = FORBIDDEN_LIST_MARKERS.filter(t => bDec.indexOf(t) >= 0);
  ok('NO forbidden-token list reaches the author request',
    listLeaks.length === 0, 'leaked: ' + listLeaks.join(' | '));

  // The scanner's own vocabulary must not be quoted at the writer either.
  const SCANNER_WORDS = ['remember nothing of', 'never happened"', 'the reckoning', 'a toll',
    'the bill', 'Fate will take something'];
  const scannerLeaks = SCANNER_WORDS.filter(t => b.indexOf(t) >= 0);
  ok('NO scanner vocabulary reaches the author request',
    scannerLeaks.length === 0, 'leaked: ' + scannerLeaks.join(' | '));

  // ── 4c. THE SPEC STILL EXISTS, INTACT, FOR THE ENGINE ───────────────────────────────────
  // Moving it out of the payload must not weaken it. It is still rendered and still complete.
  const spec = String(run.spec || '');
  ok('the machine specification is still rendered', spec.length > 400, spec.length + ' chars');
  ok('  it carries the outcome id', spec.indexOf('OUTCOME: ' + expect) >= 0);
  ok('  it carries the full roster scope', spec.indexOf('AFFECTED — exactly these people') >= 0);
  // Only a delta-bearing outcome has a canon change; memory_perception outcomes carry memory
  // effects instead, and the spec must show those.
  if (expectInsideReplacementPOV) {
    ok('  it carries the canon change and its atoms',
      spec.indexOf('CANON CHANGE') >= 0 && spec.indexOf('CEASES:') >= 0 && spec.indexOf('NOW TRUE:') >= 0);
  } else {
    ok('  it carries the sealed effect limits', spec.indexOf('EFFECT LIMITED TO') >= 0);
  }
  ok('  it carries the cost rule', spec.indexOf('COST: none') >= 0);
  ok('  it carries the aftermath beat', spec.indexOf('AFTERMATH BEAT') >= 0);
  ok('  it carries the forbidden inventions', spec.indexOf('FORBIDDEN INVENTIONS') >= 0);
  if (expectChoicePending) {
    ok('the compiled record opens a pending choice', run.opensChoicePending === true);
    ok('  the spec carries the choice-stop rule', spec.indexOf('END ON THE CHOICE') >= 0);
  }
  if (expectInsideReplacementPOV) {
    ok('  the spec carries the inside-the-replacement POV rule',
      spec.indexOf('WRITE FROM INSIDE THE REPLACEMENT') >= 0);
    ok('  the spec carries the absence clause',
      spec.indexOf('Do NOT narrate an erased event, its absence, its non-occurrence, or an') >= 0);
  }

  const allOk = checks.every(c => c.ok);
  return { ok: allOk, checks, body: b, bytes: terminal ? terminal.bytes : 0,
    compiled: { outcomeId: run.outcomeId, roster: run.roster, invokerScope: run.invokerScope,
                beat: run.beat, digest: run.digest },
    brief: run.brief, spec: run.spec, identity: launched };
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
