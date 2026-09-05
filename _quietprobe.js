// QUIET-CRISIS PROBE (Roman 2026-07-25) — the crisis the archetype menus can't produce: interior,
// intimate, no crowd, no physical danger. Seeds pcBodyBible.current_crisis DIRECTLY (bypassing the
// hot-only _DEEP_TRIO_MENUS) so the A-plot + scene build from a quiet crisis. Tests whether the
// scene_mission + reader_state architecture handles a quiet emotional crisis (mission grammar should
// produce a non-countdown; orientation should pass on happening/goal/stakes, not danger).
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = process.env.OUT || '/tmp/quietprobe.json';
const log = (...a) => console.error(...a);
const ORIENT_SYS = 'You are a FIRST-TIME reader shown ONLY the OPENING (~first 200 words) of a scene — no other context. This is a QUIET, emotional scene, NOT a danger scene; it can still pass all three. Answer STRICTLY from what is shown, "yes" only if a new reader could CONFIDENTLY answer. Return ONLY JSON: {"happening":"yes|no","goal":"yes|no","stakes":"yes|no","one_line":"<one sentence: what is going on>"}. happening = can you say what is going on / the situation? goal = can you tell what the protagonist is trying to do or work through right now? stakes = can you tell what matters to her / what she stands to gain or lose?';

async function setup(page) {
  await page.evaluate(() => {
    window.__scenes = []; window.__cost = { calls: 0, usd: 0 };
    window._auditSceneEmotionalGravity = function (pr) { try { if (typeof pr === 'string' && pr.length > 120) window.__scenes.push(pr); } catch (_) {} return Promise.resolve(null); };
    ['_auditBannedPhraseLeakage', '_classifyArchetypeManifestation', '_auditArchetypeManifestation', '_classifyLITexture', '_auditLITextureSources', '_auditSceneAgainstRPlot', '_auditUnavailabilityManifestation'].forEach(fn => { try { window[fn] = function () { return Promise.resolve(null); }; } catch (_) {} });
    var _of = window.fetch; var PR = { 'grok-4.3': [1.25e-6, 2.5e-6], 'gpt-4o-mini': [1.5e-7, 6e-7], 'grok-4-1-fast-non-reasoning': [2e-7, 5e-7] };
    window.fetch = async function (url, opts) { var res = await _of.apply(this, arguments); try { var u = (typeof url === 'string' ? url : (url && url.url) || ''); if (/\/api\/(proxy|chatgpt-proxy|mistral-proxy)/.test(u)) { res.clone().json().then(function (j) { try { var us = (j && j.usage) || {}, m = (j && j.model) || '', p = PR[m] || PR['grok-4.3']; var pt = us.prompt_tokens || 0, ct = us.completion_tokens || 0; window.__cost.calls++; window.__cost.usd += pt * p[0] + ct * p[1]; } catch (_) {} }).catch(function () {}); } } catch (_) {} return res; };
    var s = window.state; window._devBypass = true; window._forceAudits = false; window._forceHotOpener = false; window._isBillionaireOnboarding = function () { return false; };
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; s._skipCorridorValidation = true;
    s.picks = s.picks || {};
    s.picks.world = 'billionaire'; s.world = 'billionaire'; s.picks.flavor = 'billionaire_modern'; s.worldSubtype = 'billionaire_modern'; s.flavor = 'billionaire_modern';
    s.picks.dynamic = 'second_chance'; s.dynamic = 'second_chance';
    s.loveInterest = 'Male'; s.loveInterestName = 'Daniel'; s.liGender = 'male';
    s.archetype = { primary: 'OPEN_VEIN', modifier: null, bound: false };
    s.storyLength = 'fling'; s.tier = 'fling'; s.intensity = 'Slow Burn';
    s.name = 'Elena'; s.playerName = 'Elena'; s.partnerName = 'Daniel';
    s.identity = { playerName: 'Elena', partnerName: 'Daniel', displayPlayerName: 'Elena', displayPartnerName: 'Daniel' };
    s.picks.identity = s.identity; s._pcLookSkipped = true; s.pcLookLocked = true;
    s.renderMode = 'literary'; s.storyModality = 'literary'; s.currentEngine = 'literary';
    s.picks.pov = 'First'; s.povMode = 'normal'; s.turnCount = 0;
    // ── SEED the QUIET crisis directly (short-circuits _generatePCBodyBible; A-plot obeys current_crisis) ──
    s.pcBodyBible = {
      age: '33', height: 'average', build: 'slight', hair: 'dark, always slipping loose from its pin', complexion: 'pale, sleepless', face: 'composed until you catch her eyes',
      signature_feature: 'her mother’s hands — she keeps catching them making her mother’s gestures', second_celebrated_feature: 'a low, careful voice that does not rise even when it should',
      stress_tic: 'she reads the same line twice when she cannot take it in', desire_tell: 'she goes still and listens too hard', impatience_tell: '', confidence_tell: '', vulnerability_tell: 'her thumb finds the edge of whatever she is holding and worries it',
      signature_habits: ['keeping other people’s secrets faithfully'], self_conscious_feature: '', li_keenly_aware_of: 'the way she holds herself very still when she is about to cry',
      emotional_weather: 'grief held very carefully still', core_contradiction: 'she keeps every secret she is trusted with, and has just learned her mother kept the biggest one from her', private_hope: 'to be able to trust that the people she loves are who she believes they are',
      wound: { core: 'the person she trusted most lied to her, gently and completely, for her whole life', category: 'betrayed-trust', surfacing_hint: 'anything that asks her to take someone at their word' },
      current_crisis: {
        event: 'Alone in her late mother’s house the night after the funeral, reading her mother’s diary for the first time, she reaches the entry — dated the year she was born — where her mother writes plainly about the bargain she made to keep her daughter, and the truth she chose never to tell her. The woman she just buried had been lying to her, gently, her whole life.',
        li_complication: 'the name in the entry is Daniel’s family',
        refusal: 'she does not want to become the kind of daughter who goes digging for the rest'
      }
    };
    s.pcAppearance = s.pcAppearance || {}; s.pcLookLocked = true;
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  for (const pat of ['**/api/image', '**/api/bfl-kontext', '**/api/replicate**', '**/api/fal**', '**/api/get-parent-images'])
    await page.route(pat, r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"blocked"}' }));
  let temp = '';
  page.on('console', c => { const t = c.text(); if (/OPENING:TEMP/i.test(t) && !temp) temp = t.slice(0, 90).replace(/\s+/g, ' '); });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && Object.keys(window.state).length > 100 && typeof window.handleBeginStory === 'function', { timeout: 40000 });
  await page.waitForTimeout(400);
  await setup(page);
  await page.evaluate(() => { try { window.handleBeginStory(); } catch (e) { console.log('BEGIN-ERR ' + (e && e.message)); } });
  const t0 = Date.now(); let text = '';
  while (Date.now() - t0 < 320000) {
    await page.waitForTimeout(3000);
    const st = await page.evaluate(() => { const a = window.__scenes || [], s = window.state; return { n: a.length, busy: !!(s._isAdvancingScene || s._stagedSubmitting || s._stagedAwaitingProse), last: (a[a.length - 1] || '').length }; });
    if (st.n >= 1 && st.last > 200 && (!st.busy || (Date.now() - t0) > 80000)) { text = await page.evaluate(() => { const a = window.__scenes || []; return a[a.length - 1] || ''; }); break; }
  }
  const plan = await page.evaluate(() => { const s = window.state || {}; return { mission: s._scene1Mission || null, reader_state: s._scene1ReaderState || null, crisisKept: !!(s.pcBodyBible && s.pcBodyBible.current_crisis && /diary/i.test(s.pcBodyBible.current_crisis.event || '')) }; });
  const cost = await page.evaluate(() => window.__cost || null);
  const clean = String(text).replace(/\[[A-Z_]+:[^\]]*\]/g, ' ').replace(/<<[^>]*>>/g, ' ').replace(/\s+/g, ' ').trim();
  const wc = (clean.match(/\b[\w']+\b/g) || []).length;
  let orient = {};
  if (clean) { const first200 = clean.split(/\s+/).slice(0, 200).join(' '); orient = await page.evaluate(async (payload) => { try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const j = await r.json(); const c = (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || ''; let o = null; try { o = JSON.parse(String(c).replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()); } catch (_) {} return o || { raw: String(c).slice(0, 160) }; } catch (e) { return { error: String(e.message) }; } }, { messages: [{ role: 'system', content: ORIENT_SYS }, { role: 'user', content: first200 }], role: 'SPECIALIST_RENDERER', preferredModel: 'grok-4-1-fast-non-reasoning', temperature: 0, max_tokens: 200 }); }
  fs.writeFileSync(OUT, JSON.stringify({ temp, words: wc, plan, orient, prose: clean, cost }, null, 1));
  log('\n═══ QUIET-CRISIS PROBE (mother’s diary; seeded, bypassing the hot-only crisis menus) ═══');
  log('  temp: ' + (temp || '?') + ' · words: ' + wc + ' · seeded-crisis kept: ' + plan.crisisKept + ' · $' + (cost ? cost.usd.toFixed(4) : '?'));
  log('  MISSION: ' + (plan.mission || '(none planned!)'));
  if (plan.reader_state) { log('  READER-STATE knows: ' + (plan.reader_state.knows || '—')); log('               must_not_confuse: ' + (plan.reader_state.must_not_confuse || '—')); }
  log('  ORIENT (first 200w): happening=' + (orient.happening || '?') + ' goal=' + (orient.goal || '?') + ' stakes=' + (orient.stakes || '?') + ' · reader: "' + (orient.one_line || '') + '"');
  log('  → prose saved to ' + OUT);
  await browser.close();
})().catch(e => { console.error('QUIET-ERR', e.message); process.exit(1); });
