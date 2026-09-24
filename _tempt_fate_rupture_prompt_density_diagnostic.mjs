// RUPTURE PROMPT DENSITY DIAGNOSTIC — why did the rupture scene come out at 867 chars / 17 beats,
// terse and romantically cold, when an ordinary continuation of the same scene does not?
//
// Roman, 2026-09-24: "The precedence fix should replace the scheduled event — not discard
// full-scene density, relational pressure, dialogue, interiority, and consequence requirements.
// Compare the real author prompt with a successful full continuation and identify what changed or
// disappeared."
//
// This is a DIAGNOSTIC, not a control: it asserts almost nothing and is not a pass/fail gate. Its
// job is to produce evidence. The one thing it does assert is its own validity (that it captured
// two comparable prompts at all) — a diagnostic that silently compared nothing would be worse than
// none.
//
// THREE PROMPTS, so that the rupture variable is actually isolated:
//   A  REAL PAID RUPTURE   — scene_a_system_prompt.txt / scene_a_user_prompt.txt, verbatim from the
//                            2026-09-24 paid run. Ground truth, nothing reconstructed.
//   B  DRY RUPTURE         — same UI order, same scene, Tempt sealed, all providers stubbed.
//   C  DRY ORDINARY        — identical in every respect EXCEPT the Tempt seal.
//
// diff(B, C) is the finding: same stub on both sides, so every difference is attributable to the
// rupture and not to the stub. A-vs-B is only a fidelity check — it tells us whether B is a
// faithful stand-in for the prompt that actually cost money.
//
// Zero provider dispatches.
//
// usage: node _tempt_fate_rupture_prompt_density_diagnostic.mjs

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import { buildScheduleAwareStubResponse } from './_tempt_fate_stub_plan_builder.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_tempt_fate_rupture_prompt_density_out');
const PAID_DIR = path.join(__dirname, '_tempt_fate_fixtures', 'run_2026-09-24_02-11-02_scene_a');
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass: !!pass });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '\n        → ' + String(detail).slice(0, 400) : ''));
};
function section(t) { console.log('\n=== ' + t + ' ==='); }

const SCENE1_DECISION = 'remain';
const WISH = 'everyone forgets the ceremony happened';

// ── BLOCK DECOMPOSITION ────────────────────────────────────────────────────────────────────────
// The author prompt is assembled from many directive builders, each of which opens with an
// ALL-CAPS header line. Splitting on those gives a comparable unit: "which directive blocks are
// present, and how big is each". Parenthetical lowercase is tolerated ("(HARD — before you write)").
function headerOf(line) {
  const i = line.indexOf(':');
  if (i < 4 || i > 110) return null;
  const head = line.slice(0, i);
  const outside = head.replace(/\([^)]*\)/g, '');
  if (!/[A-Z]{2}/.test(outside)) return null;
  if (/[a-z]/.test(outside)) return null;
  return head.trim();
}
function splitBlocks(text) {
  const out = [];
  let cur = { header: '(preamble)', lines: [] };
  String(text || '').split('\n').forEach((ln) => {
    const h = headerOf(ln);
    if (h) { out.push(cur); cur = { header: h, lines: [ln] }; }
    else cur.lines.push(ln);
  });
  out.push(cur);
  return out.filter((b) => b.lines.length).map((b) => ({
    header: b.header, chars: b.lines.join('\n').length, lineCount: b.lines.length
  }));
}
function blockMap(text) {
  const m = new Map();
  splitBlocks(text).forEach((b) => {
    const prev = m.get(b.header);
    if (prev) { prev.chars += b.chars; prev.lineCount += b.lineCount; prev.occurrences++; }
    else m.set(b.header, { ...b, occurrences: 1 });
  });
  return m;
}

(async () => {
  console.log('=== RUPTURE PROMPT DENSITY DIAGNOSTIC (dry; zero provider dispatches) ===');

  // ── A: the real paid rupture prompt, straight off disk ──────────────────────────────────────
  const paidSys = fs.readFileSync(path.join(PAID_DIR, 'scene_a_system_prompt.txt'), 'utf8');
  const paidUsr = fs.readFileSync(path.join(PAID_DIR, 'scene_a_user_prompt.txt'), 'utf8');
  const paidAll = paidSys + '\n' + paidUsr;
  // The paid run's PLANNER prompt, so planner-layer probes are compared like with like.
  const paidPlanner = (() => {
    try {
      const reqs = JSON.parse(fs.readFileSync(path.join(PAID_DIR, 'scene_a_planner_requests.json'), 'utf8'));
      return (Array.isArray(reqs) ? reqs : []).map((r) =>
        (((r.requestBody || {}).messages) || []).map((m) => m.content || '').join('\n')).join('\n');
    } catch (_) { return ''; }
  })();

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  await ctx.addInitScript(() => {
    window.__cap = { author: [], planner: [] };
    const orig = window.fetch;
    window.fetch = function (input, init) {
      try {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        let body = ''; try { body = (init && init.body) ? String(init.body) : ''; } catch (_) {}
        if (/\/api\//.test(url) && body) {
          // Layer classification uses Tempt-INDEPENDENT schema markers, so it cannot itself be
          // skewed by the variable under test.
          if (body.indexOf('decisionGateBeatIdx') !== -1) window.__cap.author.push(body);
          else if (body.indexOf('local_objective') !== -1 || body.indexOf('tactical_move') !== -1) window.__cap.planner.push(body);
        }
      } catch (_) {}
      return orig.apply(this, arguments);
    };
  });
  const page = await ctx.newPage();
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(OUT_DIR, 'gate.jsonl'), blockImagePreparation: true });
  const parse = (req) => { try { return JSON.parse(req.postData() || '{}'); } catch (_) { return {}; } };
  const planFor = (b) => {
    const sys = (b.messages || []).find((m) => m.role === 'system');
    const usr = (b.messages || []).find((m) => m.role === 'user');
    const sysText = (sys && sys.content) || '';
    return buildScheduleAwareStubResponse(sysText, usr && usr.content, sysText.indexOf('ACTIVE INVOCATION THIS SCENE') !== -1);
  };
  gate.stub('/api/mistral-proxy', async () => ({ content: null }));
  gate.stub('/api/proxy', async (req) => ({ content: JSON.stringify(planFor(parse(req))) }));
  gate.stub('/api/chatgpt-proxy', async (req) => {
    const b = parse(req);
    if (JSON.stringify(b).includes('classify whether a fate-card')) return { choices: [{ message: { content: JSON.stringify({ scope: 'out_of_scope', reason: 'stubbed' }) } }] };
    return { choices: [{ message: { content: JSON.stringify(planFor(b)) } }] };
  });

  // One scene generation through the real UI order. `seal` is the ONLY difference between runs.
  async function runScene(storyTag, seal) {
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForFunction(() => window.state && window._renderBakedScene1 && window._mountSceneDecisionPrompt, { timeout: 30000 });
    await page.evaluate((tag) => {
      window.__cap = { author: [], planner: [] };
      window.state.storyId = tag + '-' + Date.now();
      window.state.picks = { world: 'Fantasy', worldSubtype: 'the_fair_folk', tone: 'Earnest', intensity: 'Steamy', identity: { playerName: 'Lirael', partnerName: 'Julian' } };
      window.state.gender = 'Female'; window.state.loveInterest = 'Male'; window.state.authorPronouns = 'She/Her';
      window.state.renderMode = 'staged_story_mode'; window.state.currentEngine = 'graphic';
      window.state.turnCount = 0; window.state.scenes = [];
      window.state.subscribed = true; window.state.fortunes = 9999999; window.state.access = 'sub';
      window.state._starterId = 'starter_first_sacrifice';
      window.state._pcLookSkipped = true; window.state._bakedGenesisUnlocked = true;
      window._devBypass = true; window.state._intimacyDevMode = true;
      window._renderBakedScene1({ id: 'starter_first_sacrifice' }, window._bakedScene1For('starter_first_sacrifice'));
    }, storyTag);
    await page.waitForFunction(() => { const s = document.getElementById('splashOverlay'); return !s || s.classList.contains('splash-done'); }, { timeout: 15000 }).catch(() => {});
    await page.evaluate(() => window._mountSceneDecisionPrompt(null));
    const keys = await page.evaluate(() => ({ a: document.getElementById('sceneDecisionA').getAttribute('data-choice'), b: document.getElementById('sceneDecisionB').getAttribute('data-choice') }));
    await page.click(keys.a === SCENE1_DECISION ? '#sceneDecisionA' : '#sceneDecisionB', { timeout: 8000 });
    if (seal) {
      await page.click('.tempt-fate-card', { timeout: 8000 });
      await page.waitForSelector('.tempt-wish-columns', { timeout: 8000 });
      await page.click('.tempt-wish-columns', { timeout: 8000 });
      await page.fill('#temptZoomInput', WISH);
      await page.click('.tempt-proceed-btn', { timeout: 8000 });
      await page.waitForTimeout(3000);
    }
    await page.evaluate(() => { try { window.showScreen('gnReader'); } catch (_) {} });
    await page.waitForSelector('#gnActionInput', { state: 'visible', timeout: 10000 });
    await page.fill('#gnActionInput', 'Lirael closes her eyes for a long moment, then opens them again.');
    await page.fill('#gnDialogueInput', '');
    gate.setPhase(storyTag, 40);
    await page.click('#gnSubmitBtn', { timeout: 10000 });
    await page.waitForFunction(() => (window.state.scenes || []).length >= 1, { timeout: 90000 }).catch(() => {});
    await page.waitForFunction(() => !window.state._stagedSubmitting, { timeout: 60000 }).catch(() => {});
    gate.closePhase();
    return page.evaluate(() => window.__cap);
  }

  section('CAPTURE — the same scene, with and without the Tempt seal');
  const capRupture = await runScene('rupture', true);
  const capOrdinary = await runScene('ordinary', false);

  const textOf = (bodies) => {
    if (!bodies || !bodies.length) return '';
    try {
      const b = JSON.parse(bodies[0]);
      return (b.messages || []).map((m) => m.content || '').join('\n');
    } catch (_) { return bodies[0]; }
  };
  const dryRuptureAuthor = textOf(capRupture.author);
  const dryOrdinaryAuthor = textOf(capOrdinary.author);
  const dryRupturePlanner = textOf(capRupture.planner);
  const dryOrdinaryPlanner = textOf(capOrdinary.planner);

  fs.writeFileSync(path.join(OUT_DIR, 'dry_rupture_author.txt'), dryRuptureAuthor);
  fs.writeFileSync(path.join(OUT_DIR, 'dry_ordinary_author.txt'), dryOrdinaryAuthor);
  fs.writeFileSync(path.join(OUT_DIR, 'dry_rupture_planner.txt'), dryRupturePlanner);
  fs.writeFileSync(path.join(OUT_DIR, 'dry_ordinary_planner.txt'), dryOrdinaryPlanner);

  ok('captured a REAL author prompt for the RUPTURE run', dryRuptureAuthor.length > 5000, 'len=' + dryRuptureAuthor.length);
  ok('captured a REAL author prompt for the ORDINARY continuation', dryOrdinaryAuthor.length > 5000, 'len=' + dryOrdinaryAuthor.length);
  ok('the rupture run really did carry an ACTIVE INVOCATION (otherwise the two runs are the same test twice)',
    dryRuptureAuthor.indexOf('ACTIVE INVOCATION') !== -1 && dryOrdinaryAuthor.indexOf('ACTIVE INVOCATION') === -1,
    'rupture=' + (dryRuptureAuthor.indexOf('ACTIVE INVOCATION') !== -1) + ' ordinary=' + (dryOrdinaryAuthor.indexOf('ACTIVE INVOCATION') !== -1));

  // ── FIDELITY: is the dry rupture prompt a faithful stand-in for the paid one? ────────────────
  section('FIDELITY — dry rupture vs the REAL PAID rupture prompt');
  const paidBlocks = blockMap(paidAll);
  const dryRBlocks = blockMap(dryRuptureAuthor);
  const dryOBlocks = blockMap(dryOrdinaryAuthor);
  const sharedWithPaid = [...dryRBlocks.keys()].filter((h) => paidBlocks.has(h));
  const fidelity = paidBlocks.size ? sharedWithPaid.length / paidBlocks.size : 0;
  console.log(`    paid rupture: ${paidBlocks.size} blocks / ${paidAll.length} chars`);
  console.log(`    dry rupture:  ${dryRBlocks.size} blocks / ${dryRuptureAuthor.length} chars`);
  console.log(`    dry ordinary: ${dryOBlocks.size} blocks / ${dryOrdinaryAuthor.length} chars`);
  console.log(`    dry rupture reproduces ${(fidelity * 100).toFixed(1)}% of the paid prompt's block headers`);
  ok('the dry rupture prompt is a usable stand-in for the paid one (majority of blocks reproduced)',
    fidelity > 0.5, 'fidelity=' + fidelity.toFixed(3));

  // ── THE FINDING: what does the ordinary continuation have that the rupture does not? ─────────
  section('FINDING — directive blocks present in the ORDINARY continuation but MISSING under rupture');
  const lostUnderRupture = [...dryOBlocks.keys()]
    .filter((h) => !dryRBlocks.has(h))
    .map((h) => ({ header: h, ...dryOBlocks.get(h) }))
    .sort((a, b) => b.chars - a.chars);
  const gainedUnderRupture = [...dryRBlocks.keys()]
    .filter((h) => !dryOBlocks.has(h))
    .map((h) => ({ header: h, ...dryRBlocks.get(h) }))
    .sort((a, b) => b.chars - a.chars);
  const shrunk = [...dryOBlocks.keys()]
    .filter((h) => dryRBlocks.has(h))
    .map((h) => ({ header: h, ordinary: dryOBlocks.get(h).chars, rupture: dryRBlocks.get(h).chars }))
    .filter((d) => d.rupture < d.ordinary * 0.9)
    .sort((a, b) => (b.ordinary - b.rupture) - (a.ordinary - a.rupture));

  const lostChars = lostUnderRupture.reduce((n, b) => n + b.chars, 0);
  console.log(`    ${lostUnderRupture.length} block(s) LOST under rupture, totalling ${lostChars} chars:`);
  lostUnderRupture.slice(0, 40).forEach((b) => console.log(`      − [${String(b.chars).padStart(6)} ch] ${b.header}`));
  console.log(`    ${gainedUnderRupture.length} block(s) GAINED under rupture:`);
  gainedUnderRupture.slice(0, 20).forEach((b) => console.log(`      + [${String(b.chars).padStart(6)} ch] ${b.header}`));
  console.log(`    ${shrunk.length} shared block(s) materially SHRANK under rupture:`);
  shrunk.slice(0, 20).forEach((d) => console.log(`      ~ ${d.header}: ${d.ordinary} → ${d.rupture} ch`));

  // ── THE SAME QUESTION ONE LAYER UP: the planner decides beat count and structure ─────────────
  section('FINDING — the PLANNER prompt, which governs beat count and scene structure');
  const plO = blockMap(dryOrdinaryPlanner), plR = blockMap(dryRupturePlanner);
  const plLost = [...plO.keys()].filter((h) => !plR.has(h)).map((h) => ({ header: h, ...plO.get(h) })).sort((a, b) => b.chars - a.chars);
  console.log(`    planner ordinary: ${dryOrdinaryPlanner.length} chars / ${plO.size} blocks`);
  console.log(`    planner rupture:  ${dryRupturePlanner.length} chars / ${plR.size} blocks`);
  console.log(`    ${plLost.length} planner block(s) LOST under rupture:`);
  plLost.slice(0, 30).forEach((b) => console.log(`      − [${String(b.chars).padStart(6)} ch] ${b.header}`));

  // ── TARGETED PROBES for the four qualities Roman named ───────────────────────────────────────
  section('PROBE — the specific requirements that were supposed to survive the precedence fix');
  const PROBES = [
    { label: 'relational pressure (li_pressure_actor)', needle: 'li_pressure_actor' },
    { label: 'dialogue requirement', needle: 'DIALOGUE' },
    { label: 'interiority requirement', needle: 'INTERIORITY' },
    { label: 'consequence / stakes requirement', needle: 'DRAMATIC STAKES' },
    { label: 'beat distribution (silence budget)', needle: 'BEAT DISTRIBUTION' },
    { label: 'scene charge contract', needle: 'SCENE CHARGE' },
    { label: 'expression arc peaks', needle: 'EXPRESSION ARC' },
    { label: 'romance / intimacy phase directive', needle: 'INTIMACY' },
    { label: 'aftermath lane menu', needle: 'AFTERMATH LANE' },
    { label: 'plot contract', needle: 'PLOT CONTRACT' }
  ];
  // LAYER-MATCHED, deliberately. An earlier version of this probe compared dry AUTHOR+PLANNER text
  // against the paid AUTHOR prompt alone and "found" that li_pressure_actor and the aftermath lane
  // menu had vanished from the paid run. They had not — both are PLANNER directives, and the
  // planner prompt simply was not in the text being searched. Author is compared to author and
  // planner to planner below.
  const count = (hay, needle) => String(hay || '').split(needle).length - 1;
  const probeRows = PROBES.map((p) => ({
    ...p,
    authorOrdinary: count(dryOrdinaryAuthor, p.needle), authorRupture: count(dryRuptureAuthor, p.needle), authorPaid: count(paidAll, p.needle),
    plannerOrdinary: count(dryOrdinaryPlanner, p.needle), plannerRupture: count(dryRupturePlanner, p.needle), plannerPaid: count(paidPlanner, p.needle)
  }));
  console.log('                                               AUTHOR layer            PLANNER layer');
  console.log('    requirement                            ord  rupt  PAID       ord  rupt  PAID');
  probeRows.forEach((r) => {
    const lostAuthor = r.authorOrdinary > 0 && r.authorRupture === 0;
    const lostPlanner = r.plannerOrdinary > 0 && r.plannerRupture === 0;
    const paidGapA = r.authorRupture > 0 && r.authorPaid === 0;
    const paidGapP = r.plannerRupture > 0 && r.plannerPaid === 0;
    const flag = (lostAuthor || lostPlanner) ? '  ← LOST under rupture'
      : (paidGapA || paidGapP) ? '  ← present dry, ABSENT in the paid run' : '';
    console.log('    ' + r.label.padEnd(38)
      + String(r.authorOrdinary).padStart(4) + String(r.authorRupture).padStart(6) + String(r.authorPaid).padStart(6)
      + String(r.plannerOrdinary).padStart(10) + String(r.plannerRupture).padStart(6) + String(r.plannerPaid).padStart(6) + flag);
  });

  // ── WHAT THE RUPTURE ADDS, CHARACTERISED ─────────────────────────────────────────────────────
  // Nothing is removed, so the remaining mechanism is what the rupture ADDS. These 42 blocks are
  // overwhelmingly about BOUNDING the miracle. Measuring restraint-vs-expansion vocabulary turns
  // "the extra blocks feel restrictive" into a number.
  section('PROBE — the character of what the rupture ADDS');
  const RESTRAINT = ['ONLY', 'NEVER', 'DO NOT', 'MUST NOT', 'PROHIBITION', 'LIMIT', 'NO MORE THAN',
    'SINGLE', 'ONE MIRACLE', 'HOLDS', 'UNCHANGED', 'UNTOUCHED', 'MINIMAL', 'PRECISE', 'NARROW', 'EXACTLY'];
  const gainedText = gainedUnderRupture.map((b) => b.header).join('\n');
  const ruptureOnlyChars = gainedUnderRupture.reduce((n, b) => n + b.chars, 0);
  // Re-extract the full text of the rupture-only blocks for vocabulary counting.
  const rBlocksFull = (() => {
    const set = new Set(gainedUnderRupture.map((b) => b.header));
    const out = []; let cur = { header: '(preamble)', lines: [] };
    dryRuptureAuthor.split('\n').forEach((ln) => {
      const h = headerOf(ln);
      if (h) { if (set.has(cur.header)) out.push(cur.lines.join('\n')); cur = { header: h, lines: [ln] }; }
      else cur.lines.push(ln);
    });
    if (set.has(cur.header)) out.push(cur.lines.join('\n'));
    return out.join('\n');
  })();
  const restraintHits = RESTRAINT.map((w) => ({ word: w, n: count(rBlocksFull.toUpperCase(), w) })).filter((r) => r.n > 0).sort((a, b) => b.n - a.n);
  const restraintTotal = restraintHits.reduce((n, r) => n + r.n, 0);
  console.log(`    the rupture adds ${gainedUnderRupture.length} blocks / ${ruptureOnlyChars} chars that the ordinary scene never sees`);
  console.log(`    restraint/bounding vocabulary inside those added blocks: ${restraintTotal} hits per ${rBlocksFull.length} chars`
    + ` (1 per ${rBlocksFull.length ? Math.round(rBlocksFull.length / Math.max(restraintTotal, 1)) : 0} chars)`);
  console.log('      ' + restraintHits.slice(0, 12).map((r) => `${r.word}×${r.n}`).join('  '));
  const baseRestraint = RESTRAINT.reduce((n, w) => n + count(dryOrdinaryAuthor.toUpperCase(), w), 0);
  console.log(`    for comparison, the ENTIRE ordinary author prompt: ${baseRestraint} hits per ${dryOrdinaryAuthor.length} chars`
    + ` (1 per ${Math.round(dryOrdinaryAuthor.length / Math.max(baseRestraint, 1))} chars)`);

  // ── THE COMPARISON THAT ACTUALLY ISOLATES THE PRECEDENCE FIX ─────────────────────────────────
  // Both retained paid runs are RUPTURE runs of the same scene and the same wish, but the
  // 2026-09-23 run predates the event-frame precedence fix and the 2026-09-24 run follows it.
  // That is one data point per side — so diffing the two REAL author prompts is the only way to
  // say what the fix actually changed in production, rather than inferring it from a dry pair that
  // are both post-fix.
  section('DECISIVE — the REAL pre-fix rupture prompt vs the REAL post-fix rupture prompt');
  const preFixAuthor = (() => {
    try {
      const reqs = JSON.parse(fs.readFileSync(path.join(__dirname, '_tempt_fate_fixtures',
        'run_2026_09_23_scene_a_no_commit', 'scene_a_author_requests.json'), 'utf8'));
      return (Array.isArray(reqs) ? reqs : []).slice(0, 1).map((r) =>
        (((r.requestBody || {}).messages) || []).map((m) => m.content || '').join('\n')).join('\n');
    } catch (_) { return ''; }
  })();
  let preVsPost = null;
  if (preFixAuthor.length > 5000) {
    const preB = blockMap(preFixAuthor), postB = blockMap(paidAll);
    const lostByFix = [...preB.keys()].filter((h) => !postB.has(h)).map((h) => ({ header: h, ...preB.get(h) })).sort((a, b) => b.chars - a.chars);
    const addedByFix = [...postB.keys()].filter((h) => !preB.has(h)).map((h) => ({ header: h, ...postB.get(h) })).sort((a, b) => b.chars - a.chars);
    console.log(`    pre-fix  (2026-09-23, 38 beats / 2264 ch prose): ${preFixAuthor.length} chars / ${preB.size} blocks`);
    console.log(`    post-fix (2026-09-24, 18 beats /  796 ch prose): ${paidAll.length} chars / ${postB.size} blocks`);
    console.log(`    ${lostByFix.length} block(s) the PRE-FIX prompt had and the POST-FIX one does not:`);
    lostByFix.slice(0, 25).forEach((b) => console.log(`      − [${String(b.chars).padStart(6)} ch] ${b.header}`));
    console.log(`    ${addedByFix.length} block(s) added since:`);
    addedByFix.slice(0, 25).forEach((b) => console.log(`      + [${String(b.chars).padStart(6)} ch] ${b.header}`));
    preVsPost = { preChars: preFixAuthor.length, postChars: paidAll.length, lostByFix, addedByFix };
    ok('both real rupture prompts were recovered, so the pre/post comparison is real and not inferred',
      preB.size > 50 && postB.size > 50, `pre=${preB.size} post=${postB.size}`);
  } else {
    ok('both real rupture prompts were recovered, so the pre/post comparison is real and not inferred',
      false, 'the 2026-09-23 author request could not be read — pre/post comparison unavailable');
  }

  const report = {
    generatedAt: new Date().toISOString(),
    preFixVsPostFix: preVsPost,
    sizes: {
      paidRuptureChars: paidAll.length,
      dryRuptureAuthorChars: dryRuptureAuthor.length,
      dryOrdinaryAuthorChars: dryOrdinaryAuthor.length,
      dryRupturePlannerChars: dryRupturePlanner.length,
      dryOrdinaryPlannerChars: dryOrdinaryPlanner.length
    },
    fidelityToPaid: fidelity,
    authorBlocksLostUnderRupture: lostUnderRupture,
    authorBlocksGainedUnderRupture: gainedUnderRupture,
    authorBlocksShrunkUnderRupture: shrunk,
    plannerBlocksLostUnderRupture: plLost,
    probes: probeRows
  };
  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));

  section('CONTAINMENT');
  ok('ZERO real provider dispatches across the whole diagnostic', gate.realCalls().length === 0, 'realCalls=' + gate.realCalls().length);

  await browser.close();
  const passed = results.filter((r) => r.pass).length;
  console.log('\n' + '='.repeat(100));
  console.log('DIAGNOSTIC VALIDITY CHECKS: ' + passed + '/' + results.length + ' passed');
  console.log('Evidence written to ' + OUT_DIR);
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('DIAGNOSTIC ERROR:', e && e.stack || e); process.exit(2); });
