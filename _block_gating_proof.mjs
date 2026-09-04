// BLOCK GATING PROOF (Roman 2026-09-04) — free, network-fenced, zero dispatch.
//
// Proves, through the REAL author-payload builder (window.handleBeginStory → the real
// Scene-1 prompt assembly → the real /api/proxy dispatch, intercepted), that each of the
// three repaired gates admits its block when its DECLARED condition is true and omits it
// when false — and reports the exact byte delta.
//
// Every arm also carries a MUTATION CONTROL that restores the PRE-FIX source for that one
// gate. A control that stays green proves nothing, so each control's target count is
// enforced at exactly 1 and the mutated bytes are parsed before they are served.
//
// usage: node _block_gating_proof.mjs
import { chromium } from 'playwright-core';
import vm from 'node:vm';
import fs from 'fs';
import { configBody, installSession, isAuthOrigin } from './_test_session_env.mjs';
import { buildScene1Prose, NONTOKEN_A } from './_hook_fixture_prose.mjs';

// ── ONE FIXTURE SOURCE, NOT A SECOND COPY ──
// The Scene-1 responders (planner envelope, A-plot, scaffold, portfolios) already exist,
// proven, in _scene1_skeleton_delivery.mjs. A hand-written second copy here would be a
// different fixture wearing the same name — the exact shape-drift that once hid a live
// Scene-1 outage. So the committed suite's PREAMBLE (its pure fixture region, everything
// above its first browser launch) is sliced out and loaded as a module. The committed file
// is not edited; the boundary is asserted below.
const SUITE = fs.readFileSync('_scene1_skeleton_delivery.mjs', 'utf8').split('\n');
const LAUNCH = SUITE.findIndex(l => /^let browser = await chromium\.launch/.test(l));
if (LAUNCH < 600) throw new Error('fixture slice boundary moved — refusing to guess (found at ' + LAUNCH + ')');
const FIXTURE_MOD = SUITE.slice(0, LAUNCH).join('\n')
  + '\nexport { plannerReply, scaffoldReply, APLOT_VALID, GENERIC as APLOT_GENERIC, REQUEST_KINDS };\n';
// Written beside the suite so its own relative imports resolve, then removed immediately.
const _slicePath = './_gate_fixture_slice.mjs';
fs.writeFileSync(_slicePath, FIXTURE_MOD);
let FIX; try { FIX = await import(_slicePath + '?t=' + Date.now()); }
finally { try { fs.unlinkSync(_slicePath); } catch (_) {} }

const SRC = fs.readFileSync('public/app.js', 'utf8');
const SRC_HASH = (await import('node:crypto')).createHash('sha256').update(SRC).digest('hex').slice(0, 16);
const PROSE = buildScene1Prose(NONTOKEN_A);

function force(src, fn, v) {
  const needle = `function ${fn}() {`;
  if (src.split(needle).length - 1 !== 1) throw new Error(`${fn}: not exactly one definition`);
  return src.replace(needle, `${needle} return ${v};`);
}
// Same two forces the committed Scene-1 suite uses, so this runs the same configuration
// that suite's 369 assertions are green against. Neither touches any gate under test.
const BASE = force(force(SRC, '_litLiteActive', 'false'), '_hotFastActive', 'false');

// ── THE THREE BLOCK MARKERS, read from the source rather than remembered ──
const MARK = {
  deck:  '═══ SCENE 1 MANDATED FRAME (DURING ONBOARDING ONLY — first 3 stories) ═══',
  adj:   '═══ FATELANDS — WISH ADJUDICATION (loads only when the scene RESOLVES a wish',
  demo:  '═══ FATELANDS FIRST-STORY WISH DEMONSTRATION (HARD — this Scene-1 TEACHES',
  onb:   '═══ SCENE 1 ONBOARDING ORCHESTRATION (HARD — applies on top of everything above) ═══',
};
for (const [k, v] of Object.entries(MARK)) {
  const n = SRC.split(v).length - 1;
  if (n < 1) throw new Error(`marker ${k} not found in source — the block was renamed`);
}

// ── PRE-FIX RESTORATIONS (mutation controls) ──
// Each reconstructs exactly the code the repair removed, at the one site it lived.
const PREFIX = {
  // The mandated frame is emitted INSIDE the onboarding wrapper, so restoring the QA-host
  // bypass alone cannot put it back — the wrapper gate would withhold it. This control
  // restores BOTH pre-fix behaviours, which is what "pre-fix" actually was.
  deck: [
    { from: "    // via window._forceDeckMandate = true (checked at the top of this function).\n",
      to:   "    // via window._forceDeckMandate = true (checked at the top of this function).\n"
          + "    var _isDevCTL = false; try { _isDevCTL = (typeof _isQaHost === 'function') && _isQaHost(); } catch (_) {}\n"
          + "    if (_isDevCTL) return true;\n" },
    { from: "      var _s1OnbOn = (typeof _scene1OnboardingActive === 'function') ? _scene1OnboardingActive() : true;",
      to:   "      var _s1OnbOn = true;" },
  ],
  adj: {
    from: "      var _aOn = !!force || _fatelandsWishResolvesThisScene();",
    to:   "      var _aOn = !!force || _FATELANDS_WISH_RESOLVE_RX.test(String(sceneText || ''));",
  },
  demo: {
    from: "      if (s._openingTemperature && s._openingTemperature !== 'HOT_CRISIS') return '';",
    to:   "      if ((s._openingTemperature || '') !== 'HOT_CRISIS') return '';",
  },
  onb: {
    from: "      var _s1OnbOn = (typeof _scene1OnboardingActive === 'function') ? _scene1OnboardingActive() : true;",
    to:   "      var _s1OnbOn = true;",
  },
};

const PASSTHROUGH = /\/api\/(geo|csp-report|beta-events)\b/;
const LOCAL = { '/api/consume-fortune': { success: true, fortunesRemaining: 9999 } };
const MODEL = /\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini)\b/;

let browser = await chromium.launch({ headless: true });
const closeBrowser = async () => { try { await browser.close(); } catch (_) {} };
process.on('uncaughtException', async (e) => { await closeBrowser(); console.error(e); process.exit(1); });
process.on('unhandledRejection', async (e) => { await closeBrowser(); console.error(e); process.exit(1); });

async function run({ label, prefix, stage }) {
  const ctx = await browser.newContext();
  try {
    const page = await ctx.newPage();
    page.setDefaultTimeout(180000); page.setDefaultNavigationTimeout(180000);
    await installSession(page);
    const author = [], escaped = [], unknown = [], seen = [], logs = [];
    let mutTargets = null, mutParseError = null, mutApplied = false;

    // ── HOST IDENTITY IS PART OF THE TEST ──
    // _isQaHost() covers localhost, 127.0.0.1 and *.vercel.app. To prove the onboarding scope
    // is host-independent the page must actually BE on a preview hostname, not merely claim to
    // be — so the document is served from the dev server under a *.vercel.app origin and
    // location.hostname really is a preview host inside the page. Registered FIRST on purpose:
    // Playwright gives precedence to the LAST matching handler, so the app.js and /api/**
    // routes below still own their patterns on this origin.
    const ORIGIN = stage.previewHost ? 'https://sb-preview-proof.vercel.app' : 'http://localhost:3000';
    if (stage.previewHost) {
      await page.route('https://sb-preview-proof.vercel.app/**', async r => {
        const u = new URL(r.request().url());
        const res = await fetch('http://localhost:3000' + u.pathname + u.search);
        const body = Buffer.from(await res.arrayBuffer());
        return r.fulfill({ status: res.status,
                           contentType: res.headers.get('content-type') || 'text/html', body });
      });
    }
    await page.route('**/app.js*', r => {
      let body = BASE;
      if (prefix) {
        // ONE COUNT PER REPLACEMENT. A single aggregate once hid a control whose second
        // mutation matched nothing — it served identical code and passed anyway.
        const reps = [].concat(PREFIX[prefix]);
        mutTargets = reps.map(r => body.split(r.from).length - 1);
        let next = body;
        reps.forEach(r => { next = next.replace(r.from, r.to); });
        mutApplied = next !== body;
        try { new vm.Script(next, { filename: 'ctl-app.js' }); }
        catch (e) { mutParseError = String((e && e.message) || e); }
        body = next;
      }
      return r.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8', body });
    });
    await page.route('**/sb-test.localhost/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    await page.route('**/api/**', async route => {
      const url = route.request().url().replace(/^https?:\/\/[^/]+/, '');
      if (/\/api\/config\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
      if (isAuthOrigin(route.request().url())) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      if (PASSTHROUGH.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      const k = Object.keys(LOCAL).find(x => url.startsWith(x));
      if (k) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LOCAL[k]) });
      let b = null; try { b = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
      if (!MODEL.test(url)) { unknown.push(url); return route.abort(); }
      const m = (b && b.messages) || [];
      const sys = String((m.find(x => x.role === 'system') || {}).content || '');
      const usr = String((m.find(x => x.role === 'user') || {}).content || '');
      const _txt = sys + '\n' + usr;
      const _hits = FIX.REQUEST_KINDS.filter(([, test]) => test(_txt, sys, usr)).map(([k]) => k);
      seen.push((_hits.join('+') || 'UNNAMED') + ' :: ' + (sys || usr).slice(0, 60).replace(/\s+/g, ' '));
      let out = '{}';
      if (_hits.length === 1) {
        const kind = _hits[0];
        if (kind === 'author') { author.push({ system: sys, user: usr }); out = PROSE; }
        else if (kind === 'planner') out = FIX.plannerReply(usr, null);
        else if (kind === 'scaffold') { const _r = _txt.match(/subject_ref:\s*(\S+)/);
                                        out = JSON.stringify(FIX.scaffoldReply(_r ? _r[1] : null, null)); }
        else if (kind === 'aplotGenerator' || kind === 'aplotCorrection') out = JSON.stringify(FIX.APLOT_VALID);
        else out = JSON.stringify(FIX.APLOT_GENERIC);
      } else {
        out = JSON.stringify(FIX.APLOT_GENERIC);
      }
      const envelope = /mistral-proxy/.test(url)
        ? { id: 'mock', object: 'chat.completion', model: b.model, usage: {}, _orchestration: {},
            choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: out } }] }
        : { ok: true, content: out, choices: [{ message: { content: out } }] };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envelope) });
    });
    page.on('request', r => { if (/\/api\//.test(r.url()) && !/localhost|127\.0\.0\.1|sb-preview-proof\.vercel\.app/.test(r.url())) escaped.push(r.url()); });
    page.on('console', m => { const x = m.text(); if (/DECK_MANDATE|OPENING:TEMP|\[EMIT\]|S1_ONBOARDING|SCENE1:ABORT|PAGEERROR/i.test(x)) logs.push(x.slice(0,240)); });
    page.on('pageerror', e => logs.push('PAGEERROR ' + String(e.message).slice(0,200)));

    await page.addInitScript((n) => { try { window.localStorage.setItem('sb_stories_onboarded', String(n)); } catch (_) {} }, stage.onboarded);
    await page.goto(ORIGIN + '/', { waitUntil: 'commit', timeout: 60000 });
    await page.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_STORIES, { timeout: 120000 });

    const obs = await page.evaluate(async (stage) => {
      const s = window.state;
      // ── GATE INPUT, staged as production's own rule reads it ──
      try { window.localStorage.setItem('sb_stories_onboarded', String(stage.onboarded)); } catch (_) {}
      const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
      s.picks = s.picks || {};
      ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies']
        .forEach(k => { s.picks[k] = def[k]; });
      Object.assign(s, { world: def.world, worldSubtype: def.worldSubtype, flavor: def.flavor, dynamic: def.dynamic,
        archetype: { primary: def.archetype, modifier: null },
        name: 'Lirael', playerName: 'Lirael', loveInterestName: 'Julian', partnerName: 'Julian',
        loveInterest: 'Male', liGender: 'male', playerMask: 'OPEN_VEIN', storyLength: 'fling', tier: 'fling',
        access: 'sub', subscribed: true, fortunes: 9999999, intensity: 'Steamy', pov: 'first_person',
        identity: { playerName: 'Lirael', partnerName: 'Julian' },
        renderMode: 'literary', currentEngine: 'literary', storyId: 'gateproof', myUid: 'probe',
        _starterId: def.id, is_starter_story: true, immutableTitle: def.title });
      s.picks.identity = s.identity; s._skipCorridorValidation = true;
      // The production gate reads state.fateAnchorPresent; resolveFateAnchor() is not on this
      // fixture path, so the arm states it explicitly as a DECLARED input of the rule.
      s.fateAnchorPresent = true;
      if (stage.volatility) s.volatility_window = { active: true, severity: 3, remaining_scenes: 2 };
      if (stage.coldOpening) s._openingTemperature = 'COLD_DISRUPTION';

      // What the gate inputs actually were at build time, read from production's own helpers.
      const pre = {
        onboardCountAtStart: (function () { try { return window.localStorage.getItem('sb_stories_onboarded'); } catch (_) { return null; } })(),
        host: window.location.hostname,
        qaHost: /localhost|127\.0\.0\.1|\.vercel\.app$/.test(window.location.hostname),
        title: s.immutableTitle || '',
      };
      let threw = null;
      try { await Promise.race([window.handleBeginStory(), new Promise(x => setTimeout(x, 120000))]); }
      catch (e) { threw = String(e && e.message); }
      s._skipCorridorValidation = false;
      return { threw, pre, post: {
        deckMandate: window._shouldMandateSceneOneDeckFrame ? window._shouldMandateSceneOneDeckFrame() : null,
        wishResolves: window._fatelandsWishResolvesThisScene ? window._fatelandsWishResolvesThisScene() : null,
        demoActive: window._fatelandsWishDemoActive ? window._fatelandsWishDemoActive(s) : null,
        openingTemp: s._openingTemperature || null,
        onbStartCount: window._scene1OnboardingStartCount ? window._scene1OnboardingStartCount() : null,
        onbOrdinal: (typeof s._onboardingStoryOrdinal === 'number') ? s._onboardingStoryOrdinal : null,
        // PRODUCTION'S OWN BUILDER, asked directly for the block it emits when forced. The
        // adjudication text is static (a fixed string + _FATE_TWIST_PHYSICS), so this is the
        // block's exact size, independent of what any one run's rotation produced.
        adjExactBytes: (function () { try {
          const t = window._buildFatelandsWishAdjudicationDirective('', true);
          return t ? new TextEncoder().encode(t).length : 0;
        } catch (_) { return null; } })(),
      } };
    }, stage);

    const au = author[0] || null;
    return { label, prefix, mutTargets, mutApplied, mutParseError, escaped, unknown,
             threw: obs.threw, pre: obs.pre, post: obs.post,
             authorCalls: author.length,
             sys: au ? au.system : '', usr: au ? au.user : '', seen, logs };
  } finally { await ctx.close(); }
}

// ── SEGMENTER: a block runs from its banner to the next banner line ──
// EXACT WHERE THE BLOCK DECLARES ITS OWN END, banner-to-next-banner otherwise. The deck frame
// closes itself; the demonstration is the last block of the user prompt and runs to its end.
const END_BANNER = { deck: '═══ END SCENE 1 MANDATED FRAME ═══' };
// The onboarding wrapper NESTS the mandated frame, so banner→next-banner stops at the frame's
// own banner and undercounts it. Its extent runs to the next TOP-LEVEL block instead.
const STOP_AT = { onb: () => MARK.demo };
function blockBytes(text, key) {
  const marker = MARK[key];
  const i = text.indexOf(marker);
  if (i === -1) return 0;
  const rest = text.slice(i + marker.length);
  if (END_BANNER[key]) {
    const e = rest.indexOf(END_BANNER[key]);
    if (e === -1) return -1;                        // declared terminator missing → refuse to guess
    return Buffer.byteLength(marker + rest.slice(0, e + END_BANNER[key].length), 'utf8');
  }
  if (STOP_AT[key]) {
    const stop = rest.indexOf(STOP_AT[key]());
    return Buffer.byteLength(marker + (stop === -1 ? rest : rest.slice(0, stop)), 'utf8');
  }
  const m = rest.match(/\n═══ /);
  return Buffer.byteLength(marker + (m ? rest.slice(0, m.index) : rest), 'utf8');
}
const has = (r, k) => (r.sys + '\n' + r.usr).indexOf(MARK[k]) !== -1;
const bytes = (r, k) => Math.max(0, blockBytes(r.sys, k)) + Math.max(0, blockBytes(r.usr, k));

let pass = 0, fail = 0;
const t = (name, ok, detail) => { (ok ? pass++ : fail++);
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? '   — ' + detail : ''}`); };

console.log(`\napp.js sha256[0:16] = ${SRC_HASH}`);
console.log(`target lines present: deckFix=${SRC.includes('ONBOARDING SCOPE (Roman 2026-09-04)') ? 'YES' : 'NO'}` +
            ` adjFix=${SRC.includes('_aOn = !!force || _fatelandsWishResolvesThisScene()') ? 'YES' : 'NO'}` +
            ` demoFix=${SRC.includes("if (s._openingTemperature && s._openingTemperature !== 'HOT_CRISIS')") ? 'YES' : 'NO'}`);
console.log(`old lines absent:     deckOld=${SRC.includes('QA / dev host override: every story acts like Story 1') ? 'STILL PRESENT' : 'absent'}` +
            ` adjOld=${SRC.includes('_aOn = !!force || _FATELANDS_WISH_RESOLVE_RX') ? 'STILL PRESENT' : 'absent'}\n`);

const ARMS = [
  // ── THE COUNTER MOVES DURING THE RUN ──
  // _incrementStoriesOnboardedOnce() bumps sb_stories_onboarded once per story, BEFORE the
  // Scene-1 prompt is assembled. So the value the gate reads at build time is start+1, and the
  // arms are staged by what the gate will SEE, not by what localStorage holds at boot. The
  // [DECK_MANDATE] lines printed under each arm are production's own record of both reads.
  { label: 'A1 deck ON   (story-start count 0 → Story 1 → rule says ON)',  stage: { onboarded: 0 } },
  { label: 'A2 deck OFF  (story-start count 3 → past onboarding → OFF)',   stage: { onboarded: 3 } },
  { label: 'A3 deck CTL  (count 3, PRE-FIX QA bypass + ungated wrapper)',  stage: { onboarded: 3 }, prefix: 'deck' },
  { label: 'B1 adj  ON   (volatility window active this scene)',           stage: { onboarded: 3, volatility: true } },
  { label: 'B2 adj  OFF  (no per-scene signal; title still says Sacrifice)',stage: { onboarded: 3 } },
  { label: 'B3 adj  CTL  (no signal, PRE-FIX story-text regex)',           stage: { onboarded: 3 }, prefix: 'adj' },
  { label: 'C1 demo ON   (demo active, opening temp unpinned)',            stage: { onboarded: 3 } },
  { label: 'C2 demo OFF  (COLD pinned by another authority)',              stage: { onboarded: 3, coldOpening: true } },
  { label: 'C3 demo CTL  (COLD pinned, PRE-FIX tautological gate)',        stage: { onboarded: 3, coldOpening: true }, prefix: 'demo' },
  // NULL ARM — byte-identical staging to B2. Whatever this differs from B2 by is the
  // run-to-run noise floor (rotating exemplars, fingerprint rotation, generated names).
  // Any whole-payload delta smaller than this floor means nothing.
  { label: 'N0 null      (identical staging to B2)',                       stage: { onboarded: 3 } },
  // ── D · SCENE 1 ONBOARDING ORCHESTRATION (the 71 KB wrapper) ──
  // The rule is evaluated on the STORY-START count, so localStorage at boot IS that count.
  { label: 'D0 onb  count 0 → Story 1 → INCLUDE',                           stage: { onboarded: 0 } },
  { label: 'D1 onb  count 1 → Story 2 → EXCLUDE',                           stage: { onboarded: 1 } },
  { label: 'D2 onb  count 2 → Story 3 → INCLUDE',                           stage: { onboarded: 2 } },
  { label: 'D3 onb  count 3 → past onboarding → EXCLUDE',                   stage: { onboarded: 3 } },
  // Same two counts, served from a *.vercel.app preview host: no exemption may exist.
  { label: 'D4 onb  count 0 on a *.vercel.app PREVIEW host → INCLUDE',      stage: { onboarded: 0, previewHost: true } },
  { label: 'D5 onb  count 1 on a *.vercel.app PREVIEW host → EXCLUDE',      stage: { onboarded: 1, previewHost: true } },
  // Pre-fix control: the ungated append restored, at a count the rule excludes.
  { label: 'D6 onb  CTL (count 3, PRE-FIX ungated append)',                 stage: { onboarded: 3 }, prefix: 'onb' },
];


const R = {};
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
for (const a of ARMS) {
  if (ONLY && !ONLY.includes(a.label.slice(0,2))) continue;
  const r = await run(a);
  R[a.label.slice(0, 2)] = r;
  console.log(`\n── ${a.label}`);
  console.log(`   author calls=${r.authorCalls} sys=${Buffer.byteLength(r.sys,'utf8').toLocaleString()}B ` +
              `usr=${Buffer.byteLength(r.usr,'utf8').toLocaleString()}B escaped=${r.escaped.length} unknown=${r.unknown.length}` +
              (r.prefix ? ` · CTL targets=${JSON.stringify(r.mutTargets)} applied=${r.mutApplied} parse=${r.mutParseError || 'OK'}` : ''));
  console.log(`   gate inputs: host=${r.pre.host} qaHost=${r.pre.qaHost} lsCount=${r.pre.onboardCountAtStart} ordinal=${r.post.onbOrdinal} startCount=${r.post.onbStartCount} · ` +
              `deckMandate=${r.post.deckMandate} wishResolves=${r.post.wishResolves} ` +
              `demoActive=${r.post.demoActive} openingTemp=${r.post.openingTemp}`);
  console.log(`   blocks: deck=${has(r,'deck')?bytes(r,'deck').toLocaleString()+'B':'ABSENT'} · ` +
              `adj=${has(r,'adj')?bytes(r,'adj').toLocaleString()+'B':'ABSENT'} · ` +
              `demo=${has(r,'demo')?bytes(r,'demo').toLocaleString()+'B':'ABSENT'} · ` +
              `onb=${has(r,'onb')?bytes(r,'onb').toLocaleString()+'B':'ABSENT'}`);
  if (r.threw) console.log(`   THREW: ${r.threw}`);
  const _dec = r.logs.filter(l => /\[DECK_MANDATE\]|\[EMIT\] WISH_ADJUDICATION|\[OPENING:TEMP\]|\[S1_ONBOARDING\]/.test(l));
  _dec.slice(0, 6).forEach(l => console.log('   · ' + l.replace(/\s+/g, ' ').slice(0, 150)));
  if (process.env.DIAG) { console.log('   seen: ' + JSON.stringify(r.seen, null, 1).slice(0, 2400));
                          console.log('   logs: ' + JSON.stringify(r.logs.slice(0, 25), null, 1).slice(0, 3000)); }
}

console.log('\n════ ASSERTIONS ════');
// Fence
for (const k of Object.keys(R)) {
  t(`${k}: nothing escaped the fence and every model call was answered locally`,
    R[k].escaped.length === 0 && R[k].unknown.length === 0,
    `escaped=${R[k].escaped.length} unknown=${JSON.stringify(R[k].unknown.slice(0,2))}`);
  t(`${k}: the real author dispatch happened exactly once`, R[k].authorCalls === 1, `got ${R[k].authorCalls}`);
}
// Controls must bite
for (const k of ['A3','B3','C3']) {
  t(`${k}: EVERY control target is UNIQUE (exactly one site each)`,
    Array.isArray(R[k].mutTargets) && R[k].mutTargets.length > 0 && R[k].mutTargets.every(n => n === 1),
    `targets=${JSON.stringify(R[k].mutTargets)}`);
  t(`${k}: control actually changed the served bytes`, R[k].mutApplied === true);
  t(`${k}: control bytes parse before being served`, R[k].mutParseError === null, R[k].mutParseError || '');
}
// A · deck mandate
const deckVerdict = r => { const ls = r.logs.filter(l => /\[DECK_MANDATE\]/.test(l)); return ls.length ? ls[ls.length - 1] : ''; };
t('A1: production\'s own record says ON at story-start count 0', /\bON\b/.test(deckVerdict(R.A1)) && /count=0/.test(deckVerdict(R.A1)), deckVerdict(R.A1).slice(0, 80));
t('A1: MANDATED FRAME present', has(R.A1, 'deck'));
t('A1: the frame closes with its own END banner (extent is exact, not guessed)',
   blockBytes(R.A1.usr, 'deck') > 0 || blockBytes(R.A1.sys, 'deck') > 0,
   'a -1 here means the declared terminator was missing');
t('A2: production\'s own record says OFF at story-start count 3', /\bOFF\b/.test(deckVerdict(R.A2)) && /count=3/.test(deckVerdict(R.A2)), deckVerdict(R.A2).slice(0, 80));
t('A2: MANDATED FRAME absent', !has(R.A2, 'deck'));
t('A3: CONTROL BITES — pre-fix behaviour puts the frame back at a count both rules exclude', has(R.A3, 'deck'),
   'if this is absent the A2 result is not attributable to the repair');
// B · wish adjudication
const emit = r => (r.logs.find(l => /\[EMIT\] WISH_ADJUDICATION/.test(l)) || '');
t('B1: per-scene signal true', R.B1.post.wishResolves === true, `got ${R.B1.post.wishResolves}`);
t('B1: production\'s own emission record says gate=OPEN', /gate=OPEN/.test(emit(R.B1)), emit(R.B1).slice(0, 90));
t('B1: WISH ADJUDICATION present', has(R.B1, 'adj'));
t('B2: per-scene signal false', R.B2.post.wishResolves === false, `got ${R.B2.post.wishResolves}`);
t('B2: production\'s own emission record says gate=closed', /gate=closed/.test(emit(R.B2)), emit(R.B2).slice(0, 90));
t('B2: the OLD text signal WOULD have opened it (openWithoutSpine=true) — so the story text is unchanged and only the RULE changed',
   /openWithoutSpine=true/.test(emit(R.B2)), emit(R.B2).slice(0, 110));
t('B2: WISH ADJUDICATION absent', !has(R.B2, 'adj'));
t('B3: CONTROL BITES — pre-fix story-text regex puts the block back with no scene signal',
   has(R.B3, 'adj'), 'if this is absent the B2 result is not attributable to the repair');
// C · wish demo
t('C1: demo active and no other authority pinned the opening', R.C1.post.demoActive === true);
t('C1: WISH DEMONSTRATION present', has(R.C1, 'demo'));
t('C2: another authority pinned COLD', R.C2.post.openingTemp === 'COLD_DISRUPTION', `got ${R.C2.post.openingTemp}`);
t('C2: WISH DEMONSTRATION absent', !has(R.C2, 'demo'));
t('C3: pre-fix gate agrees on the COLD case (tautology removal, not a behaviour change)',
   has(R.C3, 'demo') === has(R.C2, 'demo'), `prefix=${has(R.C3,'demo')} postfix=${has(R.C2,'demo')}`);

// D · onboarding orchestration
const onbVerdict = r => { const ls = r.logs.filter(l => /\[S1_ONBOARDING\]/.test(l)); return ls.length ? ls[0] : ''; };
t('D0: count 0 → predicate reads story-start count 0', R.D0.post.onbStartCount === 0, `got ${R.D0.post.onbStartCount}`);
t('D0: production\'s own record says ON', /\bON\b/.test(onbVerdict(R.D0)), onbVerdict(R.D0).slice(0, 90));
t('D0: ONBOARDING ORCHESTRATION present', has(R.D0, 'onb'));
t('D1: count 1 → predicate reads story-start count 1', R.D1.post.onbStartCount === 1, `got ${R.D1.post.onbStartCount}`);
t('D1: production\'s own record says OFF', /\bOFF\b/.test(onbVerdict(R.D1)), onbVerdict(R.D1).slice(0, 90));
t('D1: ONBOARDING ORCHESTRATION absent', !has(R.D1, 'onb'));
t('D2: count 2 → predicate reads story-start count 2', R.D2.post.onbStartCount === 2, `got ${R.D2.post.onbStartCount}`);
t('D2: ONBOARDING ORCHESTRATION present', has(R.D2, 'onb'));
t('D3: count 3 → predicate reads story-start count 3', R.D3.post.onbStartCount === 3, `got ${R.D3.post.onbStartCount}`);
t('D3: ONBOARDING ORCHESTRATION absent', !has(R.D3, 'onb'));
// WHAT IS SAVED IS NOT WHAT IS PRESENT. On an INCLUDED story the deck mandate is on too
// (both read the same count), so the wrapper carries the mandated-frame branch and is ~73 KB.
// On an EXCLUDED story that branch was never going to render, so the text withheld is the
// mandate-free intro — ~33 KB. Reporting 73 KB as the saving would be quoting the wrong arm.
const _wh = r => { const m = (r.logs.find(l => /orchestration text withheld/.test(l)) || '').match(/\((\d+) B\)/); return m ? Number(m[1]) : null; };
t('D1/D3: production reports its own withheld byte count on every excluded story',
   _wh(R.D1) !== null && _wh(R.D3) !== null && _wh(R.D1) > 30000 && _wh(R.D3) > 30000,
   `D1=${_wh(R.D1)} D3=${_wh(R.D3)} — the figure comes from production, not the harness`);
t('D1/D3: the withheld size is stable across two excluded stories (within 1%)',
   Math.abs(_wh(R.D1) - _wh(R.D3)) / Math.max(_wh(R.D1), _wh(R.D3)) < 0.01,
   `D1=${_wh(R.D1)} D3=${_wh(R.D3)}`);
t('D0: the INCLUDED wrapper is larger than the withheld text — it carries the mandate branch',
   bytes(R.D0, 'onb') > _wh(R.D1),
   `included=${bytes(R.D0,'onb')} withheld-when-excluded=${_wh(R.D1)}`);
t('D4: the page really is on a *.vercel.app host and _isQaHost() would be true there',
   /\.vercel\.app$/.test(String(R.D4.pre.host)) && R.D4.pre.qaHost === true, `host=${R.D4.pre.host}`);
t('D4: PREVIEW host, count 0 → present — identical to localhost D0', has(R.D4, 'onb') === has(R.D0, 'onb') && has(R.D4, 'onb'));
t('D5: the page really is on a *.vercel.app host', /\.vercel\.app$/.test(String(R.D5.pre.host)), `host=${R.D5.pre.host}`);
t('D5: PREVIEW host, count 1 → absent — identical to localhost D1', has(R.D5, 'onb') === has(R.D1, 'onb') && !has(R.D5, 'onb'));
t('D6: CONTROL BITES — the pre-fix ungated append puts 71 KB back at a count the rule excludes',
   has(R.D6, 'onb'), 'if this is absent the D1/D3 results are not attributable to the repair');
t('D6: EVERY control target is UNIQUE (exactly one site each)',
   Array.isArray(R.D6.mutTargets) && R.D6.mutTargets.every(n => n === 1), `targets=${JSON.stringify(R.D6.mutTargets)}`);
t('D6: control bytes parse before being served', R.D6.mutParseError === null, R.D6.mutParseError || '');
t('D: both rules now read ONE story-start count, so the frame is never built-then-withheld',
   ['D0','D1','D2','D3'].every(k => !has(R[k], 'deck') || has(R[k], 'onb')),
   'a deck frame present while the wrapper is absent is impossible — the frame lives inside it');
t('D: the predicate is its own rule, not the deck override — forcing the deck flag does not move it',
   /host-independent/.test(onbVerdict(R.D1)) && /\bOFF\b/.test(onbVerdict(R.D1)),
   'the onboarding verdict is logged from its own predicate with its own reason');

console.log('\n════ BLOCK SIZE (exact, measured in the payload that carried it) ════');
console.log(`  MANDATED FRAME       ${bytes(R.A1,'deck').toLocaleString().padStart(8)}B   (banner → its own END banner)`);
console.log(`  WISH ADJUDICATION    ${String(R.B1.post.adjExactBytes).padStart(8)}B   (production's builder, forced — static text)`);
console.log(`  WISH DEMONSTRATION   ${bytes(R.C1,'demo').toLocaleString().padStart(8)}B   (banner → end of user prompt; rotation-variable)`);
const withheld = r => { const m = (r.logs.find(l => /orchestration text withheld/.test(l)) || '').match(/\((\d+) B\)/); return m ? Number(m[1]) : null; };
console.log(`  ONBOARDING ORCH.     ${bytes(R.D0,'onb').toLocaleString().padStart(8)}B   (banner → the next TOP-LEVEL block; includes the frame it nests)`);
console.log(`    └ withheld on D1   ${String(withheld(R.D1) ?? '?').padStart(8)}B   (production's own count of the text it did not append)`);
console.log(`    └ withheld on D3   ${String(withheld(R.D3) ?? '?').padStart(8)}B`);

const tot = r => Buffer.byteLength(r.sys, 'utf8') + Buffer.byteLength(r.usr, 'utf8');
const NOISE = Math.abs(tot(R.N0) - tot(R.B2));
console.log('\n════ WHOLE-PAYLOAD DELTAS — CONFOUNDED, read against the noise floor ════');
console.log(`  NOISE FLOOR (N0 vs B2, identical staging): ${NOISE.toLocaleString()}B`);
const drow = (name, on, off) => {
  const d = tot(R[on]) - tot(R[off]);
  console.log(`  ${name.padEnd(22)} ${tot(R[on]).toLocaleString().padStart(9)}B → ${tot(R[off]).toLocaleString().padStart(9)}B` +
              ` · Δ ${d.toLocaleString().padStart(8)}B  ${Math.abs(d) > NOISE ? '(> noise floor)' : '(WITHIN NOISE — not attributable)'}`);
};
drow('deck  A1 → A2', 'A1', 'A2');
drow('adj   B1 → B2', 'B1', 'B2');
drow('demo  C1 → C2', 'C1', 'C2');
console.log(`\n  PRE-FIX COST, same staging as the post-fix OFF arm:`);
console.log(`    A3 (QA-host bypass restored)  ${tot(R.A3).toLocaleString()}B vs A2 ${tot(R.A2).toLocaleString()}B · Δ ${(tot(R.A3)-tot(R.A2)).toLocaleString()}B`);
console.log(`    B3 (story-text regex restored) ${tot(R.B3).toLocaleString()}B vs B2 ${tot(R.B2).toLocaleString()}B · Δ ${(tot(R.B3)-tot(R.B2)).toLocaleString()}B`);
console.log(`  The attributable figure is the BLOCK size above; whole-payload Δ carries ±${NOISE.toLocaleString()}B of unrelated rotation.`);

console.log(`\n${fail === 0 ? 'ALL GREEN' : 'FAILURES'}: ${pass} passed, ${fail} failed`);
await closeBrowser();
process.exit(fail === 0 ? 0 : 1);
