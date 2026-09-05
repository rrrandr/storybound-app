// FATELANDS STRESS TEST (Roman 2026-07-24) — the heaviest Scene 1 in the system: hot crisis +
// environment + picturable PC + picturable NPC + WISH ONBOARDING + Fate + demand/hint (new window)
// + state change + decision + deck closer. After the fork-window (Phase 1) + description-collision
// (Phase 2) fixes. Scores each scene against the PAYLOAD CHECKLIST (not eyeballed) + captures
// word count, demand/hint position, state_change position, and real cost.
//   node _fatelands_probe.js   → /tmp/fatelands.json (prose saved)
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = process.env.OUT || '/tmp/fatelands.json';
const N = parseInt(process.env.N || '2', 10);
const log = (...a) => console.error(...a);
const CHECK_SYS = 'Score this FATELANDS (fantasy, wishcraft) Scene 1 against a payload checklist. For EACH, answer "yes" | "partial" | "no": hot_crisis (opens on a crisis in motion, not aftermath), environment (a vivid, specific fantasy setting is established), pc_picturable (the protagonist is rendered so a reader can SEE them, through action), npc_picturable (a key non-love-interest character is rendered visually), wish_onboarding (the world\'s WISH / wishcraft mechanic is DRAMATIZED or taught on-page — a wish invoked, its price/omen shown, or the mechanic demonstrated, not just named), fate_present (Fate as a force/presence/law is introduced), demand_hint (a mid-scene interpretive fork gives the player agency), state_change (an observable event changes the situation partway through), decision (ends on a meaningful unresolved decision the reader can act on), deck_closer (ends on the tarot deck / cards). Return ONLY JSON with those 10 keys plus "notes" (one sentence naming the weakest 1-2 boxes).';
// ORIENTATION judge — the reader-state test on the OPENING ONLY (Roman 2026-07-25). A cold first-time
// reader, shown only the first ~200 words, must be able to answer the three questions or the opening fails.
const ORIENT_SYS = 'You are a FIRST-TIME reader shown ONLY the OPENING (~first 200 words) of a scene — no other context. Answer STRICTLY from what is SHOWN; say "yes" only if a new reader could CONFIDENTLY answer. Return ONLY JSON: {"happening":"yes|no","goal":"yes|no","consequence":"yes|no","one_line":"<one sentence: what is happening>"}. happening = can you say what dangerous thing is happening right now? goal = can you tell what the protagonist is trying to achieve right now? consequence = can you tell what happens if she fails?';

async function setup(page) {
  await page.evaluate(() => {
    window.__scenes = []; window.__cost = { calls: 0, usd: 0, tokIn: 0, tokOut: 0, byModel: {} };
    window._auditSceneEmotionalGravity = function (pr) { try { if (typeof pr === 'string' && pr.length > 120) window.__scenes.push(pr); } catch (_) {} return Promise.resolve(null); };
    ['_auditBannedPhraseLeakage', '_classifyArchetypeManifestation', '_auditArchetypeManifestation', '_classifyLITexture', '_auditLITextureSources', '_auditSceneAgainstRPlot', '_auditUnavailabilityManifestation'].forEach(fn => { try { window[fn] = function () { return Promise.resolve(null); }; } catch (_) {} });
    var PRICE = { 'grok-4-1-fast-non-reasoning': { in: 0.0000002, out: 0.0000005, cr: 0.000000032 }, 'grok-4-1-fast-reasoning': { in: 0.0000005, out: 0.0000015, cr: 0.00000008 }, 'grok-4.3': { in: 0.00000125, out: 0.0000025, cr: 0.0000002 }, 'mistral-small-latest': { in: 1e-7, out: 3e-7, cr: 1e-7 }, 'gpt-4o': { in: 0.0000025, out: 0.00001, cr: 0.00000125 } };
    function _pf(m) { m = String(m || '').toLowerCase(); if (m.indexOf('mistral') >= 0) return PRICE['mistral-small-latest']; if (m.indexOf('gpt-4o') >= 0) return PRICE['gpt-4o']; if (m.indexOf('fast-reasoning') >= 0) return PRICE['grok-4-1-fast-reasoning']; if (m.indexOf('fast') >= 0 && m.indexOf('non') >= 0) return PRICE['grok-4-1-fast-non-reasoning']; return PRICE['grok-4.3']; }
    var _of = window.fetch;
    window.fetch = async function (url, opts) {
      var res = await _of.apply(this, arguments);
      try { var u = (typeof url === 'string' ? url : (url && url.url) || ''); if (/\/api\/(proxy|chatgpt-proxy|mistral-proxy|anthropic-proxy|chatgpt)/.test(u)) { res.clone().json().then(function (j) { try { var us = (j && j.usage) || {}, model = (j && j.model) || (j && j._orchestration && j._orchestration.model) || ''; var pt = us.prompt_tokens || us.input_tokens || 0, ct = us.completion_tokens || us.output_tokens || 0, cached = (us.prompt_tokens_details && us.prompt_tokens_details.cached_tokens) || us.cached_tokens || 0; if (pt || ct) { var p = _pf(model), fresh = Math.max(0, pt - cached), cost = fresh * p.in + cached * (p.cr || p.in) + ct * p.out; window.__cost.calls++; window.__cost.usd += cost; window.__cost.byModel[model || '?'] = (window.__cost.byModel[model || '?'] || 0) + cost; } } catch (_) {} }).catch(function () {}); } } catch (_) {}
      return res;
    };
    const s = window.state; window._devBypass = true; window._forceAudits = true;
    // FATELANDS: world=Fantasy, ancestry flavor the_inhuman (avoids the FF ≥650w floor). Keep HOT
    // (localhost dev-override forces HOT_CRISIS → the wish-onboarding demo fires). Do NOT mark the
    // wish ritual witnessed → wish onboarding stays active.
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; s._skipCorridorValidation = true;
    s.picks = s.picks || {};
    s.picks.world = 'Fantasy'; s.world = 'Fantasy'; s.picks.flavor = 'the_inhuman'; s.worldSubtype = 'the_inhuman'; s.flavor = 'the_inhuman';
    s.picks.dynamic = 'enemies_to_lovers'; s.dynamic = 'enemies_to_lovers';
    s.loveInterest = 'Male'; s.loveInterestName = 'Dorian'; s.liGender = 'male';
    s.archetype = { primary: 'DARK_VICE', modifier: null, bound: false };
    s.storyLength = 'fling'; s.tier = 'fling'; s.intensity = 'Steamy';
    s.name = 'Mara'; s.playerName = 'Mara'; s.partnerName = 'Dorian';
    s.identity = { playerName: 'Mara', partnerName: 'Dorian', displayPlayerName: 'Mara', displayPartnerName: 'Dorian' };
    s.picks.identity = s.identity; s._pcLookSkipped = true; s.pcLookLocked = true;
    s.renderMode = 'literary'; s.storyModality = 'literary'; s.currentEngine = 'literary';
    s.picks.pov = 'First'; s.povMode = 'normal'; s.turnCount = 0;
    try { localStorage.removeItem('sb_witnessed_fatelands_wish_ritual'); } catch (_) {}
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (let i = 0; i < N; i++) {
    const page = await (await browser.newContext()).newPage();
    for (const pat of ['**/api/image', '**/api/bfl-kontext', '**/api/replicate**', '**/api/fal**', '**/api/get-parent-images'])
      await page.route(pat, r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"blocked"}' }));
    const logs = [];
    page.on('console', c => { const t = c.text(); if (/STATE_CHANGE:MARKER|OPENING:TEMP\]|WISH.?DEMO|FATELANDS|SCENE1:PROMPT-SIZES/i.test(t)) logs.push(t.slice(0, 180)); });
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => window.state && Object.keys(window.state).length > 100 && typeof window.handleBeginStory === 'function', { timeout: 40000 });
    await page.waitForTimeout(400);
    await setup(page);
    await page.evaluate(() => { try { window.handleBeginStory(); } catch (e) { console.log('BEGIN-ERR ' + (e && e.message)); } });
    const t0 = Date.now(); let text = '';
    while (Date.now() - t0 < 320000) {
      await page.waitForTimeout(3000);
      const st = await page.evaluate(() => { const a = window.__scenes || [], s = window.state; return { n: a.length, busy: !!(s._isAdvancingScene || s._stagedSubmitting || s._stagedAwaitingProse), last: (a[a.length - 1] || '').length }; });
      if (st.n >= 1 && st.last > 200 && (!st.busy || (Date.now() - t0) > 70000)) { text = await page.evaluate(() => { const a = window.__scenes || []; return a[a.length - 1] || ''; }); break; }
    }
    const ir = await page.evaluate(() => { const a = window.state && window.state.aPlot; return a && a.scene1Compressed ? { state_change: a.scene1Compressed.state_change, precondition: a.scene1Compressed.state_change_precondition, forces: a.scene1Compressed.forces_choice } : null; });
    const plan = await page.evaluate(() => { const s = window.state || {}; return { mission: s._scene1Mission || null, reader_state: s._scene1ReaderState || null }; });
    const cost = await page.evaluate(() => window.__cost || null);
    if (!text) { log('[sample ' + (i + 1) + '] ✗ NO SCENE (stall) · $' + (cost ? cost.usd.toFixed(4) : '?')); results.push({ sample: i + 1, words: 0, error: 'no-scene', cost, logs }); await page.close(); continue; }
    const wcOf = (t) => (String(t || '').replace(/\[[A-Z_]+:[^\]]*\]/g, ' ').replace(/<<[^>]*>>/g, ' ').match(/\b[\w']+\b/g) || []).length;
    const wc = wcOf(text);
    const mm = text.match(/Is this[^?]*\?/i) || text.match(/[A-Z][^.?!\n]{3,}(?:—|–|--)\s*or\s+[^?\n]*\?/) || text.match(/[A-Z][^.?!\n]{4,}\bor\b[^?\n]{4,}\?/);
    const forkPct = mm ? Math.round(100 * wcOf(text.slice(0, mm.index)) / wc) : -1;
    const scM = logs.find(l => /STATE_CHANGE:MARKER.*wordPos=(\d+)/.test(l));
    const scPct = scM ? (() => { const m = scM.match(/wordPos=(\d+)/); const tot = scM.match(/total=(\d+)/); return (m && tot) ? Math.round(100 * (+m[1]) / (+tot[1])) : -1; })() : -1;
    const clean = String(text).replace(/\[[A-Z_]+:[^\]]*\]/g, ' ').replace(/<<[^>]*>>/g, ' ').replace(/\s+/g, ' ').trim();
    const check = await page.evaluate(async (payload) => { try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const j = await r.json(); const c = (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || ''; let o = null; try { o = JSON.parse(String(c).replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()); } catch (_) {} return o || { raw: String(c).slice(0, 200) }; } catch (e) { return { error: String(e.message) }; } }, { messages: [{ role: 'system', content: CHECK_SYS }, { role: 'user', content: clean.slice(0, 7000) }], role: 'SPECIALIST_RENDERER', preferredModel: 'grok-4-1-fast-non-reasoning', temperature: 0, max_tokens: 400 });
    const first200 = clean.split(/\s+/).slice(0, 200).join(' ');
    const orient = await page.evaluate(async (payload) => { try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const j = await r.json(); const c = (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || ''; let o = null; try { o = JSON.parse(String(c).replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()); } catch (_) {} return o || { raw: String(c).slice(0, 160) }; } catch (e) { return { error: String(e.message) }; } }, { messages: [{ role: 'system', content: ORIENT_SYS }, { role: 'user', content: first200 }], role: 'SPECIALIST_RENDERER', preferredModel: 'grok-4-1-fast-non-reasoning', temperature: 0, max_tokens: 200 });
    const wishFired = logs.some(l => /WISH.?DEMO|FATELANDS.*WISH|wish.demo/i.test(l));
    results.push({ sample: i + 1, words: wc, forkPct, scPct, check, orient, plan, ir, wishDirectiveFired: wishFired, prose: clean, cost, logs });
    if (ir) log('    IR.state_change: "' + ir.state_change + '"');
    const ck = check || {};
    log('[sample ' + (i + 1) + '] words=' + wc + ' · fork=' + (forkPct >= 0 ? forkPct + '%' : '—') + ' · stateChange=' + (scPct >= 0 ? scPct + '%' : '—') + ' · $' + (cost ? cost.usd.toFixed(4) : '?'));
    if (plan && plan.mission) log('    MISSION: "' + plan.mission + '"');
    if (plan && plan.reader_state) log('    READER-STATE: knows="' + (plan.reader_state.knows || '—') + '" · must_not_confuse="' + (plan.reader_state.must_not_confuse || '—') + '"');
    log('    ORIENT (first 200w): happening=' + (orient.happening || '?') + ' goal=' + (orient.goal || '?') + ' consequence=' + (orient.consequence || '?') + (orient.one_line ? ' · reader: "' + orient.one_line + '"' : ''));
    log('    checklist: ' + ['hot_crisis', 'environment', 'pc_picturable', 'npc_picturable', 'wish_onboarding', 'fate_present', 'demand_hint', 'state_change', 'decision', 'deck_closer'].map(k => k.split('_')[0] + '=' + (ck[k] || '?')).join(' '));
    await page.close();
  }
  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
  const valid = results.filter(r => r.words > 0);
  const totCost = results.reduce((a, r) => a + ((r.cost && r.cost.usd) || 0), 0);
  log('\n═══ FATELANDS STRESS TEST (heaviest Scene 1; after fork-window + desc-collision fixes) ═══');
  log('  valid scenes: ' + valid.length + '/' + N + ' · words: ' + valid.map(r => r.words).join(' / ') + (valid.length ? ' · avg=' + Math.round(valid.reduce((a, r) => a + r.words, 0) / valid.length) : ''));
  log('  fork position: ' + valid.map(r => r.forkPct >= 0 ? r.forkPct + '%' : '—').join(' / ') + ' · state-change: ' + valid.map(r => r.scPct >= 0 ? r.scPct + '%' : '—').join(' / '));
  log('  REAL COST: $' + totCost.toFixed(4) + ' total (' + N + ' attempts)');
  log('  → prose saved to ' + OUT + ' (read to judge coherence + wish onboarding)');
})().catch(e => { console.error('FATELANDS-ERR', e.message); process.exit(1); });
