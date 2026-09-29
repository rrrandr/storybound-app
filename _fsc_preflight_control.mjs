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
  }, WISH);
  await browser.close();

  ok('consequence compiled: ' + EXPECT, run.outcomeId === EXPECT, run.outcomeId);
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
  // Story identity in the payload, asserted on First Sacrifice's own structural markers.
  const FS_MARKERS = ['Veilwood', 'Sacrificiant', 'First Favored'];
  const idHits = FS_MARKERS.filter(m => b.indexOf(m) >= 0);
  ok('payload carries First Sacrifice story identity', idHits.length >= 2, 'hits=' + idHits.join(','));
  ok('payload does NOT carry the default corporate story',
    !/Veyne Tower|skyscraper|floor-to-ceiling glass/i.test(b));
  // The sealed boundary, exactly.
  ok('payload carries OUTCOME: ' + EXPECT, b.indexOf('OUTCOME: ' + EXPECT) >= 0);
  ok('payload carries EFFECT BOUNDARY', b.indexOf('EFFECT BOUNDARY') >= 0);
  ok('payload carries AFFECTED scope', b.indexOf('AFFECTED — exactly these people') >= 0);
  ok('payload carries LIRAEL IS AFFECTED', b.indexOf('LIRAEL IS AFFECTED') >= 0);
  ok('payload carries the AFTERMATH BEAT', b.indexOf('AFTERMATH BEAT') >= 0);
  ok('payload carries the authored beat text', !!(run.beat && b.indexOf(run.beat.slice(0, 48)) >= 0));
  ok('payload carries FORBIDDEN INVENTIONS', b.indexOf('FORBIDDEN INVENTIONS') >= 0);
  ok('payload forbids visible wish-energy', b.indexOf('visible wish-energy') >= 0);

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
