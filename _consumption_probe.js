// CONSUMPTION FUNNEL PROBE v2 — Opportunity → Mentioned → Performed → Memorable (Roman 2026-07-25)
// ─────────────────────────────────────────────────────────────────────────────
// Diagnoses the ungrounded/flat-character problem as PAYLOAD (planner emits nothing) vs SPENDING
// (emitted, author ignores) vs EXECUTION (mentioned, not dramatized) vs MEMORABILITY (performed, but
// forgettable). The real product goal is a character the reader REMEMBERS tomorrow — not "hook utilization."
//
// TWO-PASS, BLINDED (avoids confirmation bias):
//   PASS A (BLIND, scene only, NO bible): a first-time reader lists the 3 things they'll REMEMBER about
//          PC and LI + the distinctive behaviours actually displayed. This is the reader-experience ground truth.
//   PASS B (hook-aware): scores each emitted planner hook on OPPORTUNITY + a 4-level scale, and marks whether
//          it landed in the reader's Pass-A memory. Passing Pass-A's blind list in as ground truth is fine —
//          the blinding only had to happen when CAPTURING the reader experience.
//   4-LEVEL: 0 MISSED (opp existed, never referenced) · 1 MENTIONED (flat: "Jessi wore rings") ·
//            2 PERFORMED (through action) · 3 MEMORABLE (performed AND sticks — the theatrical-fan sentence).
//
// SEED SPLIT — answers "author-global vs Fatelands-specific." NOTE: 'contemporary' ≈ 'billionaire' in this
// codebase (contemporary token is near-vestigial). Default = 2 Fatelands + 3 modern-realistic (billionaire).
// A genuinely distinct contemporary/small_town seed needs token verification first (see SEEDS).
// BUILD ONLY — does NOT run until greenlit.
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = process.env.OUT || '/tmp/consumption.json';
const MANIFEST = process.env.MANIFEST === '1';  // A/B: v1 Scene Manifestation attention experiment
const PAIRED = process.env.PAIRED === '1';      // run BOTH conditions per seed + blind distinctiveness ranking

const SEEDS = [
  { label: 'Fatelands·inhuman', world: 'Fantasy', flavor: 'the_inhuman', archetype: 'DARK_VICE', dynamic: 'enemies_to_lovers', li: 'Dorian', pc: 'Mara' },
  { label: 'Fatelands·FF',      world: 'Fantasy', flavor: 'first_favored', archetype: 'SPELLBINDER', dynamic: 'forbidden', li: 'Kael', pc: 'Sera' },
  { label: 'Billionaire·1',     world: 'billionaire', flavor: 'billionaire_modern', archetype: 'DARK_VICE', dynamic: 'enemies_to_lovers', li: 'Roman', pc: 'Mara' },
  { label: 'Billionaire·2',     world: 'billionaire', flavor: 'billionaire_modern', archetype: 'ARMORED_FOX', dynamic: 'second_chance', li: 'Ethan', pc: 'Clara' },
  { label: 'Billionaire·3',     world: 'billionaire', flavor: 'billionaire_modern', archetype: 'HEART_WARDEN', dynamic: 'fake_relationship', li: 'Marcus', pc: 'Nadia' }
  // To swap a slot to a genuine contemporary seed, verify the world/flavor token first (e.g. small_town).
];

const log = (...a) => console.error(...a);

const JUDGE_A_SYS =
  'You are a FIRST-TIME READER of the scene below. You have NO character notes — judge ONLY from what the prose shows. ' +
  'The protagonist is named {PC} and the love interest is named {LI}. For EACH of them, based solely on the prose:\n' +
  '(1) "remember": the THREE things you would most REMEMBER about this character tomorrow — specific, concrete, in your own words (if the prose gives you fewer than three memorable things, list fewer and leave the rest empty). ' +
  'EXCLUDE from this list: the great-grandmother\'s tarot deck and the closing "let the cards decide" ritual; any generic story-framing PROP; and pure PLOT events (a leaked letter, a projected email, notifications). We are measuring what you remember about the CHARACTER\'S NATURE and BEHAVIOUR — how this person acts and who they are — NOT the plot device, the closing ritual, or what merely happened to them. If the only memorable things are plot/prop, list fewer.\n' +
  '(2) "traits": the distinctive BEHAVIOURAL traits they actually DISPLAY through action (not static appearance labels like "tall" or "brown hair").\n' +
  'Return ONLY JSON: {"PC":{"remember":["","",""],"traits":[]},"LI":{"remember":["","",""],"traits":[]}}. No prose.';

const JUDGE_B_SYS =
  'Score how the PROSE consumed each planner EXECUTION HOOK. For EACH hook return: ' +
  '"opportunity" (yes/no — did the scene contain a moment this trait could NATURALLY surface? a "hides fear by joking" hook needs a frightening beat; a "jeweled vanity" hook needs the character on-page and observed. If NO such moment, opportunity="no", score=0 — this is NOT the author\'s failure); and ' +
  '"score" 0-3: 0 MISSED (opportunity existed but the trait is never referenced) · 1 MENTIONED (referenced but flat/informational — "Jessi wore rings") · 2 PERFORMED (expressed through behaviour or action so the tell does real work in motion) · 3 MEMORABLE (performed AND creates characterization a reader will clearly remember — "Jessi fanned herself with theatrical languor, making certain the gems crusting her thick fingers flashed before anyone noticed the sweat on her brow"). ' +
  'Also "in_memory" (yes/no): does this hook correspond to something in the READER-REMEMBERED list provided (a blind first-read of the same scene)? ' +
  'Return ONLY a JSON array in hook order: [{"i":0,"opportunity":"yes|no","score":0,"in_memory":"yes|no"}]. No prose.';

const HOOK_FIELDS = ['signature_feature', 'second_celebrated_feature', 'self_conscious_feature', 'core_contradiction', 'emotional_weather', 'signature_behavior', 'deflection_pattern', 'holding_style', 'mouth_quality', 'hands_quality', 'voice_quality', 'attraction_manifestation', 'focus_tell', 'restraint_tell', 'interest_tell', 'frustration_tell', 'desire_tell', 'private_hope'];
const HOOK_ARRAY_FIELDS = ['signature_habits', 'tells', 'pc_keenly_notices', 'li_keenly_aware_of'];

async function setup(page, seed) {
  await page.evaluate((seed) => {
    window.__scenes = [];
    window._auditSceneEmotionalGravity = function (pr) { try { if (typeof pr === 'string' && pr.length > 120) window.__scenes.push(pr); } catch (_) {} return Promise.resolve(null); };
    ['_auditBannedPhraseLeakage', '_classifyArchetypeManifestation', '_auditArchetypeManifestation', '_classifyLITexture', '_auditLITextureSources', '_auditSceneAgainstRPlot', '_auditUnavailabilityManifestation'].forEach(function (fn) { try { window[fn] = function () { return Promise.resolve(null); }; } catch (_) {} });
    // PER-PASS COST CAPTURE — group story-pipeline model calls by pass (role|sys-head). __costPaused is set
    // true right after the scene is captured, so the probe's own judge calls are NOT counted as pipeline cost.
    window.__passes = {}; window.__costPaused = false;
    var PRICE = { 'grok-4-1-fast-non-reasoning': { in: 2e-7, out: 5e-7, cr: 3.2e-8 }, 'grok-4-1-fast-reasoning': { in: 5e-7, out: 1.5e-6, cr: 8e-8 }, 'grok-4.3': { in: 1.25e-6, out: 2.5e-6, cr: 2e-7 }, 'mistral-small-latest': { in: 1e-7, out: 3e-7, cr: 1e-7 }, 'gpt-4o': { in: 2.5e-6, out: 1e-5, cr: 1.25e-6 }, 'gpt-4o-mini': { in: 1.5e-7, out: 6e-7, cr: 7.5e-8 } };
    function _priceFor(m) { m = String(m || '').toLowerCase(); if (m.indexOf('mini') >= 0) return PRICE['gpt-4o-mini']; if (m.indexOf('mistral') >= 0) return PRICE['mistral-small-latest']; if (m.indexOf('gpt-4o') >= 0) return PRICE['gpt-4o']; if (m.indexOf('fast-reasoning') >= 0) return PRICE['grok-4-1-fast-reasoning']; if (m.indexOf('fast') >= 0) return PRICE['grok-4-1-fast-non-reasoning']; return PRICE['grok-4.3']; }
    var _of = window.fetch;
    window.fetch = async function (url, opts) {
      var u = (typeof url === 'string' ? url : (url && url.url) || '');
      var isProxy = /\/api\/(proxy|chatgpt-proxy|mistral-proxy|anthropic-proxy|chatgpt)/.test(u);
      var role = '', sysHead = '';
      if (isProxy && opts && opts.body) { try { var b = JSON.parse(opts.body); role = b.role || (b.model || ''); var msgs = b.messages || []; var sysM = msgs.filter(function (m) { return m.role === 'system'; })[0] || msgs[0] || {}; var c = sysM.content; if (Array.isArray(c)) c = c.map(function (x) { return x.text || ''; }).join(' '); sysHead = String(c || '').replace(/\s+/g, ' ').trim().slice(0, 70); } catch (_) {} }
      var t0 = Date.now(); var res = await _of.apply(this, arguments); var lat = Date.now() - t0;
      if (isProxy && !window.__costPaused) {
        res.clone().json().then(function (j) {
          try {
            var usage = (j && j.usage) || {}; var model = (j && j.model) || (j && j._orchestration && j._orchestration.model) || '';
            var pt = usage.prompt_tokens || usage.input_tokens || 0, ct = usage.completion_tokens || usage.output_tokens || 0;
            var cached = (usage.prompt_tokens_details && usage.prompt_tokens_details.cached_tokens) || usage.cache_read_input_tokens || usage.cached_tokens || 0;
            var p = _priceFor(model), fresh = Math.max(0, pt - cached), cost = fresh * p.in + cached * (p.cr || p.in) + ct * p.out;
            var key = (role || '?') + ' | ' + (sysHead || '(no-sys)');
            var e = window.__passes[key] || (window.__passes[key] = { role: role, sysHead: sysHead, model: model, count: 0, promptTok: 0, complTok: 0, cost: 0, latMs: 0 });
            e.count++; e.promptTok += pt; e.complTok += ct; e.cost += cost; e.latMs += lat; e.model = model;
          } catch (_) {}
        }).catch(function () {});
      }
      return res;
    };
    var s = window.state; window._devBypass = true; window._forceAudits = false; window._forceHotOpener = false; window._isBillionaireOnboarding = function () { return false; };
    window._sceneManifestExperiment = !!(seed && seed._manifest);  // A/B flag (v1 attention experiment)
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; s._skipCorridorValidation = true;
    s.picks = s.picks || {};
    s.picks.world = seed.world; s.world = seed.world; s.picks.flavor = seed.flavor; s.worldSubtype = seed.flavor; s.flavor = seed.flavor;
    s.picks.dynamic = seed.dynamic; s.dynamic = seed.dynamic;
    s.loveInterest = 'Male'; s.loveInterestName = seed.li; s.liGender = 'male';
    s.archetype = { primary: seed.archetype, modifier: null, bound: false };
    s.storyLength = 'fling'; s.tier = 'fling'; s.intensity = 'Steamy';
    s.name = seed.pc; s.playerName = seed.pc; s.partnerName = seed.li;
    s.identity = { playerName: seed.pc, partnerName: seed.li, displayPlayerName: seed.pc, displayPartnerName: seed.li };
    s.picks.identity = s.identity; s._pcLookSkipped = true; s.pcLookLocked = true;
    s.renderMode = 'literary'; s.storyModality = 'literary'; s.currentEngine = 'literary';
    s.picks.pov = 'First'; s.povMode = 'normal'; s.turnCount = 0;
    try { var fk = window._flavorVarietyKey ? window._flavorVarietyKey(s) : null; var h = {}; if (fk) h[fk] = ['a', 'b', 'c']; localStorage.setItem('sb_flavor_history', JSON.stringify(h)); } catch (_) {}
  }, seed);
}

function pullHooks(bible, who) {
  var out = [];
  if (!bible || typeof bible !== 'object') return out;
  HOOK_FIELDS.forEach(function (k) { var v = bible[k]; if (typeof v === 'string' && v.trim().length > 4) out.push({ who: who, field: k, tell: v.trim().slice(0, 220) }); });
  HOOK_ARRAY_FIELDS.forEach(function (k) { if (Array.isArray(bible[k])) bible[k].slice(0, 5).forEach(function (t, i) { if (typeof t === 'string' && t.trim().length > 4) out.push({ who: who, field: k + '[' + i + ']', tell: t.trim().slice(0, 220) }); }); });
  return out;
}

async function judge(page, sys, user, maxTok) {
  return page.evaluate(async (payload) => {
    try {
      const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await r.json(); let c = (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '';
      c = String(c).replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      return JSON.parse(c);
    } catch (e) { return { error: String(e.message) }; }
  }, { messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], role: 'SPECIALIST_RENDERER', preferredModel: 'grok-4-1-fast-non-reasoning', temperature: 0, max_tokens: maxTok });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (const seed of SEEDS) {
   for (const _cond of (PAIRED ? [false, true] : [MANIFEST])) {
    seed._manifest = _cond;
    const page = await (await browser.newContext()).newPage();
    for (const pat of ['**/api/image', '**/api/bfl-kontext', '**/api/replicate**', '**/api/fal**', '**/api/get-parent-images'])
      await page.route(pat, r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"blocked"}' }));
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => window.state && Object.keys(window.state).length > 100 && typeof window.handleBeginStory === 'function', { timeout: 40000 });
    await page.waitForTimeout(400);
    await setup(page, seed);
    await page.evaluate(() => { try { window.handleBeginStory(); } catch (e) { console.log('BEGIN-ERR ' + (e && e.message)); } });
    const t0 = Date.now(); let prose = '';
    while (Date.now() - t0 < 300000) {
      await page.waitForTimeout(3000);
      const st = await page.evaluate(() => { const a = window.__scenes || [], s = window.state; return { n: a.length, busy: !!(s._isAdvancingScene || s._stagedSubmitting || s._stagedAwaitingProse), last: (a[a.length - 1] || '').length }; });
      if (st.n >= 1 && st.last > 200 && (!st.busy || (Date.now() - t0) > 80000)) { prose = await page.evaluate(() => { const a = window.__scenes || []; return a[a.length - 1] || ''; }); break; }
    }
    // Freeze pipeline-cost accounting BEFORE the probe's own judge calls, let trailing usage settle, snapshot.
    await page.evaluate(() => { window.__costPaused = true; });
    await page.waitForTimeout(1500);
    const passes = await page.evaluate(() => window.__passes || {});
    const payload = await page.evaluate(() => { var s = window.state || {}; return { pc: s.pcBodyBible || null, li: s.liBodyBible || null, manifest: s._sceneManifest || null }; });
    const hooks = [].concat(pullHooks(payload.pc, 'PC'), pullHooks(payload.li, 'LI'));
    let passA = {}, passB = [];
    if (prose) {
      passA = await judge(page, JUDGE_A_SYS.replace('{PC}', seed.pc).replace('{LI}', seed.li), prose.slice(0, 8000), 700);
      if (hooks.length) {
        const remembered = JSON.stringify(passA && !passA.error ? passA : {});
        const bUser = 'READER-REMEMBERED (blind):\n' + remembered + '\n\nPROSE:\n' + prose.slice(0, 8000) + '\n\nHOOKS (score each, in order):\n' + hooks.map((h, i) => i + '. [' + h.who + '] ' + h.tell).join('\n');
        passB = await judge(page, JUDGE_B_SYS, bUser, 1600);
      }
    }
    const scored = hooks.map((h, i) => { const v = (Array.isArray(passB) ? passB.find(x => x && x.i === i) : null) || {}; return { who: h.who, field: h.field, tell: h.tell.slice(0, 80), opportunity: v.opportunity || '?', score: (typeof v.score === 'number' ? v.score : -1), in_memory: v.in_memory || '?' }; });
    const seedCost = Object.keys(passes).reduce((a, k) => a + (passes[k].cost || 0), 0);
    results.push({ seed: seed.label, world: seed.world, manifestOn: _cond, manifest: payload.manifest, prose: String(prose).slice(0, 4500), words: (prose.match(/\b[\w']+\b/g) || []).length, nHooks: hooks.length, remember: passA, scored, passes, cost: seedCost });
    const opp = scored.filter(s => s.opportunity === 'yes');
    const f = (lvl) => opp.filter(s => s.score >= lvl).length;
    log(seed.label + ': ' + hooks.length + ' hooks · opp ' + opp.length + ' → mentioned ' + f(1) + ' → performed ' + f(2) + ' → memorable ' + f(3) + (opp.length ? '  (perform ' + Math.round(100 * f(2) / opp.length) + '%, memorable ' + Math.round(100 * f(3) / opp.length) + '%)' : ''));
    if (passA && passA.PC && Array.isArray(passA.PC.remember)) log('   ↳ [' + (_cond ? 'ON ' : 'OFF') + '] reader remembers PC: ' + passA.PC.remember.filter(Boolean).join(' | '));
    await page.close();
   }
  }
  fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
  const rows = results.flatMap(r => r.scored.map(s => Object.assign({ world: r.world, on: r.manifestOn }, s)));
  const agg = (rs) => { const o = rs.filter(s => s.opportunity === 'yes'); const g = (l) => o.filter(s => s.score >= l).length; const mem = o.filter(s => s.in_memory === 'yes').length; return { n: rs.length, opp: o.length, m1: g(1), m2: g(2), m3: g(3), inMem: mem }; };
  const line = (name, a) => name.padEnd(20) + ' hooks ' + String(a.n).padStart(3) + ' · opp ' + String(a.opp).padStart(3) + ' → mentioned ' + String(a.m1).padStart(3) + ' → performed ' + String(a.m2).padStart(3) + ' → memorable ' + String(a.m3).padStart(3) + (a.opp ? '  (perform ' + Math.round(100 * a.m2 / a.opp) + '%, mem ' + Math.round(100 * a.m3 / a.opp) + '%, in-reader-memory ' + Math.round(100 * a.inMem / a.opp) + '%)' : '');
  log('\n═══ CONSUMPTION FUNNEL — Opportunity → Mentioned → Performed → Memorable ═══');
  log(line('ALL', agg(rows)));
  log(line('Fatelands', agg(rows.filter(s => s.world === 'Fantasy'))));
  log(line('Modern (billionaire)', agg(rows.filter(s => s.world !== 'Fantasy'))));
  log('\n  DIAGNOSIS: opp-but-low-mentioned ⇒ SPENDING gap · mentioned-but-low-performed ⇒ EXECUTION gap · performed-but-low-memorable ⇒ MEMORABILITY gap.');
  if (PAIRED) {
    log('\n  ── PAIRED SPLIT (same decontaminated judge — isolates v2 from the judge change) ──');
    log(line('OFF baseline', agg(rows.filter(s => !s.on))));
    log(line('ON  manifest', agg(rows.filter(s => s.on))));
    log(line('OFF Modern', agg(rows.filter(s => !s.on && s.world !== 'Fantasy'))));
    log(line('ON  Modern', agg(rows.filter(s => s.on && s.world !== 'Fantasy'))));
  }

  // ── COST (story pipeline only; probe judge calls excluded) ──
  const passAgg = {};
  results.forEach(r => Object.keys(r.passes || {}).forEach(k => { const p = r.passes[k]; const e = passAgg[k] || (passAgg[k] = { role: p.role, sysHead: p.sysHead, model: p.model, count: 0, cost: 0, promptTok: 0, complTok: 0 }); e.count += p.count; e.cost += p.cost; e.promptTok += p.promptTok; e.complTok += p.complTok; e.model = p.model; }));
  const passRows = Object.keys(passAgg).map(k => passAgg[k]).sort((a, b) => b.cost - a.cost);
  const grand = passRows.reduce((a, r) => a + r.cost, 0) || 1e-9;
  const nScenes = results.length || 1;
  const byModel = {}; passRows.forEach(r => { const m = r.model || '?'; byModel[m] = (byModel[m] || 0) + r.cost; });
  const isAuthor = (r) => String(r.model || '').toLowerCase().indexOf('grok') >= 0 && /write|scene|story|prose/i.test(r.sysHead || '');
  const authorCost = passRows.filter(isAuthor).reduce((a, r) => a + r.cost, 0);
  const setupCost = grand - authorCost;
  log('\n═══ REAL PER-SCENE COST (audits OFF; each run is a fresh Scene 1 = full setup) ═══');
  log('  $' + (grand / nScenes).toFixed(4) + '/scene avg · $' + grand.toFixed(4) + ' over ' + nScenes + ' scenes · setup≈$' + (setupCost / nScenes).toFixed(4) + '/scene, author≈$' + (authorCost / nScenes).toFixed(4) + '/scene');
  log('  by model (total): ' + Object.keys(byModel).sort((a, b) => byModel[b] - byModel[a]).map(m => m + ' $' + byModel[m].toFixed(4)).join(' · '));
  log('  ── setup passes, most-expensive first (total across ' + nScenes + ' scenes) ──');
  passRows.slice(0, 16).forEach(r => log('    $' + r.cost.toFixed(4) + '  ' + String(Math.round(100 * r.cost / grand)).padStart(3) + '%  x' + String(r.count).padStart(2) + '  ' + String(r.model || '?').slice(0, 12).padEnd(12) + '  ' + (r.role || '?') + ' | ' + r.sysHead));

  // ── BLIND DISTINCTIVENESS RANKING (paired only) — baseline vs manifest, per seed, blind to condition ──
  if (PAIRED) {
    const RANK_SYS = 'You are comparing two Scene-1 openings, each featuring a DIFFERENT protagonist. Judge ONLY the prose. Pick the protagonist whose BEHAVIOUR most REVEALS WHO THEY ARE — a stable identity (a habit, ritual, compulsion, social strategy, worldview), not merely that they are stressed or nervous. TWO TESTS: (1) FIVE-CHARACTER — if five completely different characters (Batman, Elizabeth Bennet, Sherlock Holmes, Walter White, Frodo) could ALL plausibly do the behaviour, it reveals nothing; discount it. (2) INEVITABILITY (the higher bar) — after seeing it once, does the behaviour feel INEVITABLE for this person, the way Sherlock noticing cigar ash, House stealing your lunch, or Monk aligning the salt shakers feels inevitable in hindsight? Reward the opening whose character does something only THAT person would do AND that feels inevitable. FORCED CHOICE — you MUST pick A or B; ties are NOT allowed. Return ONLY JSON {"winner":"A"|"B","why":"<one short sentence naming the behaviour>"}.';
    const bySeed = {};
    results.forEach(r => { bySeed[r.seed] = bySeed[r.seed] || {}; bySeed[r.seed][r.manifestOn ? 'on' : 'off'] = r.prose || ''; });
    const rpage = await (await browser.newContext()).newPage();
    let onW = 0, offW = 0, tie = 0;
    for (const sd of Object.keys(bySeed)) {
      const pr = bySeed[sd]; if (!pr.on || !pr.off) continue;
      const flip = Math.random() < 0.5;
      const A = (flip ? pr.on : pr.off).slice(0, 4000), B = (flip ? pr.off : pr.on).slice(0, 4000);
      const v = await judge(rpage, RANK_SYS, 'OPENING A:\n' + A + '\n\nOPENING B:\n' + B, 200);
      const w = v && v.winner;
      const real = (w === 'A') ? (flip ? 'on' : 'off') : (w === 'B') ? (flip ? 'off' : 'on') : 'tie';
      if (real === 'on') onW++; else if (real === 'off') offW++; else tie++;
      log('  rank ' + sd + ': ' + real.toUpperCase() + (v && v.why ? ' — ' + v.why : ''));
    }
    await rpage.close();
    log('\n  ═══ BLIND DISTINCTIVENESS (manifest vs baseline, per seed, judge blind to condition) ═══');
    log('  manifest wins ' + onW + ' · baseline wins ' + offW + ' · tie ' + tie);
  }
  await browser.close();
})().catch(e => { console.error('CONSUMPTION-ERR', e.message); process.exit(1); });
