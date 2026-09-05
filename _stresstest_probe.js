// SCENE-1 ARCHITECTURE STRESS TEST (Roman 2026-07-25) — try to BREAK planner-side orientation.
// scene_mission + reader_state were validated on HIGH-PRESSURE wish openings. This attacks the weak
// spot: QUIET / emotional / first-meeting / social openings (hot-opener override OFF). If the planner
// still produces a sensible mission + reader_state and the opening still orients a cold reader, the
// abstraction is GENERAL, not a high-pressure trick. Captures planner output → first-200w orientation
// (generalized, NOT danger-specific) → prose.
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = process.env.OUT || '/tmp/stresstest.json';
const log = (...a) => console.error(...a);

// Configs chosen to be UN-detonating: no external danger, emotional/relational/social stakes.
const SEEDS = [
  { label: 'Billionaire·first-meeting', world: 'billionaire', flavor: 'billionaire_modern', dynamic: 'enemies_to_lovers', archetype: 'ARMORED_FOX', li: 'Roman', pc: 'Mara', witnessed: false, note: 'COLLISION pre-meet — no crisis' },
  { label: 'Billionaire·reunion',       world: 'billionaire', flavor: 'billionaire_modern', dynamic: 'second_chance',   archetype: 'ETERNAL_FLAME', li: 'Ethan', pc: 'Clara', witnessed: false, note: 'emotional/relational goal' },
  { label: 'Billionaire·fake-rel',      world: 'billionaire', flavor: 'billionaire_modern', dynamic: 'fake_relationship', archetype: 'SPELLBINDER', li: 'Marcus', pc: 'Nadia', witnessed: false, note: 'social / awkward stakes' },
  { label: 'Fantasy·FF-quiet',          world: 'Fantasy',     flavor: 'first_favored',      dynamic: 'forbidden',       archetype: 'HEART_WARDEN', li: 'Kael', pc: 'Sera', witnessed: true, note: 'non-wish fantasy (wish demo suppressed)' }
];

const ORIENT_SYS = 'You are a FIRST-TIME reader shown ONLY the OPENING (~first 200 words) of a scene — no other context. This is NOT necessarily a danger scene: a quiet, emotional, or social opening can pass all three. Answer STRICTLY from what is shown, "yes" only if a new reader could CONFIDENTLY answer. Return ONLY JSON: {"happening":"yes|no","goal":"yes|no","stakes":"yes|no","one_line":"<one sentence: what is going on>"}. happening = can you say in one sentence what is going on / the situation? goal = can you tell what the protagonist is trying to do or get right now? stakes = can you tell what matters to her / what she stands to gain or lose?';

async function setup(page, seed) {
  await page.evaluate((seed) => {
    window.__scenes = []; window.__cost = { calls: 0, usd: 0, byModel: {} };
    window._auditSceneEmotionalGravity = function (pr) { try { if (typeof pr === 'string' && pr.length > 120) window.__scenes.push(pr); } catch (_) {} return Promise.resolve(null); };
    ['_auditBannedPhraseLeakage', '_classifyArchetypeManifestation', '_auditArchetypeManifestation', '_classifyLITexture', '_auditLITextureSources', '_auditSceneAgainstRPlot', '_auditUnavailabilityManifestation'].forEach(fn => { try { window[fn] = function () { return Promise.resolve(null); }; } catch (_) {} });
    var PRICE = { 'grok-4-1-fast-non-reasoning': { in: 2e-7, out: 5e-7, cr: 3.2e-8 }, 'grok-4-1-fast-reasoning': { in: 5e-7, out: 1.5e-6, cr: 8e-8 }, 'grok-4.3': { in: 1.25e-6, out: 2.5e-6, cr: 2e-7 }, 'mistral-small-latest': { in: 1e-7, out: 3e-7, cr: 1e-7 }, 'gpt-4o': { in: 2.5e-6, out: 1e-5, cr: 1.25e-6 } };
    function _pf(m) { m = String(m || '').toLowerCase(); if (m.indexOf('mistral') >= 0) return PRICE['mistral-small-latest']; if (m.indexOf('gpt-4o') >= 0) return PRICE['gpt-4o']; if (m.indexOf('fast-reasoning') >= 0) return PRICE['grok-4-1-fast-reasoning']; if (m.indexOf('fast') >= 0) return PRICE['grok-4-1-fast-non-reasoning']; return PRICE['grok-4.3']; }
    var _of = window.fetch;
    window.fetch = async function (url, opts) { var res = await _of.apply(this, arguments); try { var u = (typeof url === 'string' ? url : (url && url.url) || ''); if (/\/api\/(proxy|chatgpt-proxy|mistral-proxy)/.test(u)) { res.clone().json().then(function (j) { try { var us = (j && j.usage) || {}, model = (j && j.model) || ''; var pt = us.prompt_tokens || 0, ct = us.completion_tokens || 0, cached = (us.prompt_tokens_details && us.prompt_tokens_details.cached_tokens) || 0; if (pt || ct) { var p = _pf(model), cost = Math.max(0, pt - cached) * p.in + cached * (p.cr || p.in) + ct * p.out; window.__cost.calls++; window.__cost.usd += cost; } } catch (_) {} }).catch(function () {}); } } catch (_) {} return res; };
    var s = window.state; window._devBypass = true; window._forceAudits = false;
    window._forceHotOpener = false;                       // ← THE KEY: let the natural classifier pick temperature (quiet openings possible)
    window._isBillionaireOnboarding = function () { return false; };
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
    try { if (seed.witnessed) localStorage.setItem('sb_witnessed_fatelands_wish_ritual', '1'); else localStorage.removeItem('sb_witnessed_fatelands_wish_ritual'); } catch (_) {}
    try { var fk = window._flavorVarietyKey ? window._flavorVarietyKey(s) : null; var h = {}; if (fk) h[fk] = ['a', 'b', 'c']; localStorage.setItem('sb_flavor_history', JSON.stringify(h)); } catch (_) {}
  }, seed);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (const seed of SEEDS) {
    const page = await (await browser.newContext()).newPage();
    for (const pat of ['**/api/image', '**/api/bfl-kontext', '**/api/replicate**', '**/api/fal**', '**/api/get-parent-images'])
      await page.route(pat, r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"blocked"}' }));
    let temp = '';
    page.on('console', c => { const t = c.text(); if (/OPENING:TEMP\]/i.test(t) && !temp) temp = (t.match(/HOT_CRISIS|WARM|COLD|REFLECTIVE|[A-Z_]{4,}/) || [''])[0]; });
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => window.state && Object.keys(window.state).length > 100 && typeof window.handleBeginStory === 'function', { timeout: 40000 });
    await page.waitForTimeout(400);
    await setup(page, seed);
    await page.evaluate(() => { try { window.handleBeginStory(); } catch (e) { console.log('BEGIN-ERR ' + (e && e.message)); } });
    const t0 = Date.now(); let text = '';
    while (Date.now() - t0 < 320000) {
      await page.waitForTimeout(3000);
      const st = await page.evaluate(() => { const a = window.__scenes || [], s = window.state; return { n: a.length, busy: !!(s._isAdvancingScene || s._stagedSubmitting || s._stagedAwaitingProse), last: (a[a.length - 1] || '').length }; });
      if (st.n >= 1 && st.last > 200 && (!st.busy || (Date.now() - t0) > 80000)) { text = await page.evaluate(() => { const a = window.__scenes || []; return a[a.length - 1] || ''; }); break; }
    }
    const plan = await page.evaluate(() => { const s = window.state || {}; return { mission: s._scene1Mission || null, reader_state: s._scene1ReaderState || null }; });
    const cost = await page.evaluate(() => window.__cost || null);
    if (!text) { log(seed.label + ': ✗ NO SCENE'); results.push({ seed: seed.label, error: 'no-scene', plan, cost }); await page.close(); continue; }
    const clean = String(text).replace(/\[[A-Z_]+:[^\]]*\]/g, ' ').replace(/<<[^>]*>>/g, ' ').replace(/\s+/g, ' ').trim();
    const wc = (clean.match(/\b[\w']+\b/g) || []).length;
    const first200 = clean.split(/\s+/).slice(0, 200).join(' ');
    const orient = await page.evaluate(async (payload) => { try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const j = await r.json(); const c = (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || ''; let o = null; try { o = JSON.parse(String(c).replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()); } catch (_) {} return o || { raw: String(c).slice(0, 160) }; } catch (e) { return { error: String(e.message) }; } }, { messages: [{ role: 'system', content: ORIENT_SYS }, { role: 'user', content: first200 }], role: 'SPECIALIST_RENDERER', preferredModel: 'grok-4-1-fast-non-reasoning', temperature: 0, max_tokens: 200 });
    results.push({ seed: seed.label, note: seed.note, temp, words: wc, plan, orient, prose: clean.slice(0, 4500), cost });
    log('\n' + seed.label + '  [' + (temp || 'temp?') + ']  ' + wc + 'w  · $' + (cost ? cost.usd.toFixed(4) : '?') + '  (' + seed.note + ')');
    log('  MISSION: ' + (plan.mission || '(none planned!)'));
    if (plan.reader_state) log('  READER-STATE knows: ' + (plan.reader_state.knows || '—'));
    log('  ORIENT (first 200w): happening=' + (orient.happening || '?') + ' goal=' + (orient.goal || '?') + ' stakes=' + (orient.stakes || '?') + ' · reader: "' + (orient.one_line || '') + '"');
    await page.close();
  }
  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
  const valid = results.filter(r => !r.error);
  const pass = valid.filter(r => r.orient && r.orient.happening === 'yes' && r.orient.goal === 'yes' && r.orient.stakes === 'yes').length;
  const missionOk = valid.filter(r => r.plan && r.plan.mission).length;
  log('\n═══ STRESS TEST (quiet/non-crisis openings; hot-override OFF — trying to BREAK the architecture) ═══');
  log('  valid: ' + valid.length + '/' + SEEDS.length + ' · missions planned: ' + missionOk + '/' + valid.length + ' · orientation 3/3: ' + pass + '/' + valid.length);
  log('  → if missions planned AND orientation passes on QUIET openings, scene_mission is a GENERAL abstraction, not a high-pressure trick.');
  log('  → prose saved to ' + OUT);
})().catch(e => { console.error('STRESS-ERR', e.message); process.exit(1); });
