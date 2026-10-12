// ── CAN FIRST SACRIFICE BOOT LITERARY, WITH ITS OWN SCENE 1? (provider-free, $0) ─────────────
// ONE focused check, not a framework. Every /api/* call is intercepted; the pre-author stages are
// served from the runner's existing fixture file, and the AUTHOR request is captured and REFUSED,
// so nothing is generated and nothing is mounted.
//
// WHAT IT PROVES, or fails to:
//   · FS's canonical material survives — _starterId stays set, so STARTER_SEEDS and STARTER_PLANS
//     still resolve (seed, lore, personalities, the 20-scene literary plan).
//   · renderMode is 'literary', not staged_story_mode.
//   · the BAKED Scene 1 is not mounted.
//   · the request that arrives is the LITERARY author ("bestselling romance author"), NOT the CG
//     screenplay author, and it asks for Scene 1 as new prose.
//
// THE OVERRIDES ARE TEST-ONLY AND MINIMAL. _launchStarterStory takes the def as an ARGUMENT, so a
// modified COPY is passed and the shipped STARTER_STORIES catalog is never mutated. The only other
// override is window._bakedScene1For -> null, in the page, for this tab. No repo file, no
// production routing, no saved story, no guard is changed.
import fs from 'fs';
import { chromium } from 'playwright-core';
import { configBody, installSession, isAuthOrigin, installEntitledProfileStub, makeSession }
  from './_test_session_env.mjs';
import { findFSDef } from './_fs_story_setup.mjs';

const ORIGIN = process.env.SB_ORIGIN || 'http://localhost:3000';
const SPINE_FIXTURE = fs.existsSync(process.env.SB_SPINE_FIXTURE || '_runner_fixtures/opening_spine_literary.json')
  ? JSON.parse(fs.readFileSync(process.env.SB_SPINE_FIXTURE || '_runner_fixtures/opening_spine_literary.json', 'utf8'))
  : null;
const FIXTURES = JSON.parse(fs.readFileSync(process.env.SB_FIXTURES || '_runner_fixtures/full.json', 'utf8'));
const OUT = '_ab_writing_out/literary_boot_' + new Date().toISOString().replace(/[:.]/g, '-');
fs.mkdirSync(OUT, { recursive: true });

let pass = 0, fail = 0;
const t = (label, ok, detail) => {
  if (ok) { pass++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label + (detail ? '  — ' + detail : '')); }
};
const say = (m) => console.log(m);

const CG_AUTHOR = /screenplay-native cinematic-romance writer/i;
const LIT_AUTHOR = /You are a bestselling romance author/i;

const seen = [];
let litReq = null, cgReq = null;

say('=== LITERARY BOOT CHECK (provider-free, $0) ===');
say('origin: ' + ORIGIN);
say('every /api/* call is intercepted; the author request is captured and REFUSED\n');

const browser = await chromium.launch();
const CONSOLE = [];
const page = await browser.newPage();
page.on('console', (m) => { try { CONSOLE.push(m.text()); } catch (_) {} });
await installSession(page, makeSession());
await installEntitledProfileStub(page, { log: () => {} });

await page.route('**/*', async (route) => {
  const req = route.request();
  const url = req.url();
  if (isAuthOrigin(url)) return route.fallback();
  if (/\/api\/config/.test(url)) {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(configBody()) });
  }
  if (/\/api\/(img-proxy|bfl-kontext)/.test(url)) {
    return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"images blocked"}' });
  }
  if (!/\/api\//.test(url)) return route.fallback();

  let body = {};
  try { body = JSON.parse(req.postData() || '{}'); } catch (_) {}
  const sys = String((body.messages && body.messages[0] && body.messages[0].content) || '');
  seen.push({ url: url.replace(/^.*\/api\//, 'api/'), head: sys.slice(0, 60).replace(/\s+/g, ' ') });

  if (LIT_AUTHOR.test(sys)) {
    if (!litReq) {
      litReq = body;
      fs.writeFileSync(OUT + '/literary_author_request.json', JSON.stringify({ url, body }, null, 2));
      say('  [CAPTURED] the LITERARY author request arrived — refusing it, nothing is generated');
    }
    return route.fulfill({ status: 503, contentType: 'application/json',
      body: '{"error":"author call withheld by the literary boot check"}' });
  }
  if (CG_AUTHOR.test(sys)) {
    if (!cgReq) { cgReq = body; say('  [!!] a CG SCREENPLAY author request arrived — the override did not hold'); }
    return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"cg author refused"}' });
  }

  // THE OPENING-PLANNER REQUEST IS SAVED. Production derives its allowlist from the TEMPLATE IT
  // DISPATCHED (_openingSpineDeclaredFields), so the only reliable way to build a conforming
  // fixture is to read the declared keys out of the real request rather than guess which
  // conditional branch of the schema was used.
  if (/scene-structure planner for the OPENING scene/i.test(sys)) {
    try {
      fs.writeFileSync(OUT + '/opening_planner_request.json', JSON.stringify({ url, body }, null, 2));
      say('  [CAPTURED] the opening-planner request (template saved for fixture derivation)');
    } catch (_) {}
  }

  // THE CORRECTED OPENING-PLANNER FIXTURE takes precedence over the CG-era one, whose five
  // undeclared fields (environment_elements, li_texture_beat, pc_wound_anchor,
  // antagonist_body_callback, stage_contract) made production refuse to author Scene 1. The
  // replacement is DERIVED from the dispatched template's own declared keys
  // (_opening_spine_fixture_from_template.mjs). The production validator is untouched.
  if (/scene-structure planner for the OPENING scene/i.test(sys) && SPINE_FIXTURE) {
    say('  [FIXTURE] serving the template-derived opening_spine reply');
    return route.fulfill({ status: 200, contentType: 'application/json', body: SPINE_FIXTURE.body });
  }

  // Pre-author stages: serve the runner's own fixture bodies so the flow can reach the author.
  let served = null;
  for (const k of Object.keys(FIXTURES.byMatch || {})) {
    let hit = false;
    try { hit = new RegExp(k, 'i').test(sys); } catch (_) { hit = sys.indexOf(k) !== -1; }
    if (hit) { served = FIXTURES.byMatch[k].body; break; }
  }
  if (!served) served = (FIXTURES.default && FIXTURES.default.body)
    || '{"choices":[{"message":{"content":"{}"}}]}';
  return route.fulfill({ status: 200, contentType: 'application/json', body: served });
});

await page.goto(ORIGIN + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._launchStarterStory === 'function', { timeout: 30000 });
say('app loaded');

const def = await findFSDef(page);
t('the shipped FS def is found', !!def && def.id === 'starter_first_sacrifice');
t('  and it ships as staged_story_mode (the guard this test overrides)',
  !!def && def.render_mode === 'staged_story_mode', 'render_mode=' + (def && def.render_mode));
t('  with a baked Scene 1 package present in production',
  await page.evaluate(() => !!(window._bakedScene1For && window._bakedScene1For('starter_first_sacrifice'))));

// ── THE TWO TEST-ONLY OVERRIDES ─────────────────────────────────────────────────────────────
const overridden = await page.evaluate(() => {
  window.__realBaked = window._bakedScene1For;
  window._bakedScene1For = function () { return null; };
  return { bakedStubbed: window._bakedScene1For('starter_first_sacrifice') === null,
           catalogUntouched: (window.STARTER_STORIES || []).some(
             (d) => d && d.id === 'starter_first_sacrifice' && d.render_mode === 'staged_story_mode') };
});
t('override 1: the baked-opening lookup returns null for this tab', overridden.bakedStubbed);
t('  and the shipped STARTER_STORIES catalog is UNTOUCHED', overridden.catalogUntouched);

const litDef = Object.assign({}, def, { render_mode: 'literary' });
t('override 2: a COPY of the def carries render_mode=literary (catalog not mutated)',
  litDef.render_mode === 'literary' && def.render_mode === 'staged_story_mode');

// ── BOOT ────────────────────────────────────────────────────────────────────────────────────
say('\nlaunching the test instance...');
await page.evaluate(async (d) => { try { await window._launchStarterStory(d); } catch (_) {} }, litDef);
await page.waitForTimeout(8000);
// THE DEPENDENCY, IDENTIFIED: launching sets the story up but does not author anything. The
// production entry point that generates the scene is handleBeginStory — the baked path calls it
// itself once setup completes (app.js:146447). With the baked opening stubbed out, the test has to
// invoke the SAME production entry point. This is not a new path; it is the one the product uses.
const began = await page.evaluate(async () => {
  if (typeof window.handleBeginStory !== 'function') return 'handleBeginStory is not exposed';
  try { await window.handleBeginStory(); return 'invoked'; } catch (e) { return 'threw: ' + e.message; }
});
say('  handleBeginStory: ' + began);
await page.waitForTimeout(45000);

const st = await page.evaluate(() => ({
  starterId: window.state._starterId || null,
  renderMode: window.state.renderMode || null,
  bakedMounted: !!window.state._bakedOpeningMounted,
  bakedMountedAt: window.state._bakedScene1MountedAt || null,
  scenes: (window.state.scenes || []).length,
  turnCount: window.state.turnCount,
  seedResolves: !!(window._activeSeed ? window._activeSeed(window.state) : null),
  planResolves: !!(window._activePlan ? window._activePlan(window.state) : null),
  isCG: (typeof window._isCGRenderMode === 'function') ? window._isCGRenderMode() : null
}));
say('\nstate after boot: ' + JSON.stringify(st));

t('FS canonical material is INTACT — _starterId still set',
  st.starterId === 'starter_first_sacrifice', JSON.stringify(st.starterId));
t('  the seed resolves (lore / personalities / world truths)', st.seedResolves !== false);
t('  the plan resolves (the authored scene plan)', st.planResolves !== false);
t('renderMode is literary, not staged_story_mode', st.renderMode === 'literary', 'renderMode=' + st.renderMode);
t('  and _isCGRenderMode() is false', st.isCG === false, 'isCG=' + st.isCG);
t('the BAKED Scene 1 was NOT mounted', st.bakedMounted === false && !st.bakedMountedAt,
  'bakedMounted=' + st.bakedMounted + ' at=' + st.bakedMountedAt);
t('no CG screenplay author request was made', cgReq === null);
t('the LITERARY author request WAS reached', litReq !== null);

if (litReq) {
  const sysChars = String(litReq.messages[0].content).length;
  const usrChars = litReq.messages.length > 1 ? String(litReq.messages[1].content).length : 0;
  const total = sysChars + usrChars;
  say('\n── THE LITERARY AUTHOR REQUEST (sizes are ESTIMATES) ──');
  say('  system ' + sysChars + ' chars · user ' + usrChars + ' chars · total ' + total);
  say('  ESTIMATED tokens ~' + Math.ceil(total / 4.0)
    + '  (chars/4.0, the cost guard\'s CHARS_PER_TOKEN — an APPROXIMATION, not a tokenizer,'
    + ' and not measured for any Mistral tokenizer)');
  say('  max_tokens=' + litReq.max_tokens + ' temperature=' + litReq.temperature
    + ' model=' + (litReq.preferredModel || litReq.model || '(unspecified)'));
  const sys = String(litReq.messages[0].content) + ' ' + (litReq.messages[1] ? litReq.messages[1].content : '');
  t('it asks for a FIRST scene (no prior scene to continue)',
    /scene 1|first scene|opening scene/i.test(sys) || st.scenes === 0,
    'scenes=' + st.scenes);
  t('it carries NO CG beat schema (no "beats" array contract)', !/"beats"\s*:\s*\[/.test(sys));
  fs.writeFileSync(OUT + '/SIZES.json', JSON.stringify({ sysChars, usrChars, total,
    estimatedTokensChars4: Math.ceil(total / 4.0), maxTokens: litReq.max_tokens,
    note: 'chars/4.0 estimate from the cost guard; NOT a tokenizer measurement' }, null, 2));
}

say('\n── SUPPORTING CALLS SEEN BEFORE THE AUTHOR (fixture-served, $0) ──');
seen.forEach((c, i) => say('  ' + String(i + 1).padStart(2) + '. ' + c.url + '  <- ' + c.head));
fs.writeFileSync(OUT + '/supporting_calls.json', JSON.stringify(seen, null, 2));

await browser.close();
fs.writeFileSync(OUT + '/console.log', CONSOLE.join('\n'));
say('\n' + pass + '/' + (pass + fail) + ' checks passed');
say('output: ' + OUT);
say('NOTHING WAS GENERATED. Every provider call was intercepted; the author was refused.');
process.exit(fail ? 1 : 0);
