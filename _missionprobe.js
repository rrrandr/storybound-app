// MISSION-GRAMMAR GENERALITY PROBE (Roman 2026-07-25) — the MEDIUM-confidence disproof. scene_mission
// held on physical (escape) and epistemic (understand) crises; does it produce a SEDUCTION mission and a
// NEGOTIATION mission — intent-shaped, not escape/countdown? Seeds each crisis directly (bypassing the
// hot-only crisis menus) and reads the mission the planner derives + first-200w orientation + prose.
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = process.env.OUT || '/tmp/missionprobe.json';
const log = (...a) => console.error(...a);
const ORIENT_SYS = 'You are a FIRST-TIME reader shown ONLY the OPENING (~first 200 words) of a scene. This is a charged social/romantic scene, NOT a danger scene; it can pass all three. Answer STRICTLY from what is shown, "yes" only if a new reader could CONFIDENTLY answer. Return ONLY JSON: {"happening":"yes|no","goal":"yes|no","stakes":"yes|no","one_line":"<one sentence: what is going on>"}. happening = the situation? goal = what is the protagonist trying to do/get? stakes = what she stands to gain or lose?';

const SEEDS = [
  { label: 'Seduction', world: 'billionaire', flavor: 'billionaire_modern', dynamic: 'forbidden', archetype: 'SPELLBINDER', intensity: 'Steamy', pc: 'Lena', li: 'Daniel',
    bible: {
      age: '29', height: 'tall', build: 'slim', hair: 'dark, worn loose tonight on purpose', complexion: 'warm', face: 'a face that knows exactly how it reads and is a little tired of it',
      signature_feature: 'the deliberate slowness of her hands when she wants to be watched', second_celebrated_feature: 'a mouth she uses like punctuation',
      stress_tic: '', desire_tell: 'she lets a silence run one beat too long', impatience_tell: '', confidence_tell: 'she stops performing and simply holds his eyes', vulnerability_tell: 'her breath changes the moment it stops being a game',
      signature_habits: ['reading a room for the one lever that moves it'], self_conscious_feature: '', li_keenly_aware_of: 'the moment her control slips and she means it',
      emotional_weather: 'a poised, deliberate heat with something real underneath', core_contradiction: 'she is about to use desire as a tool, and what she actually wants is for it to be real', private_hope: 'to be wanted for herself, not for what she can get someone to do',
      wound: { core: 'she has always had to earn closeness by being useful or desirable', category: 'conditional-love', surfacing_hint: 'whenever affection and advantage point the same way' },
      current_crisis: { event: 'Alone with Daniel in his study after the gala — the man who holds the one thing she came for, off-guard for once, a glass in his hand and his usual watchfulness gone soft. Everything depends on whether she can make him want her before he remembers who she is and what she is after. The first move is hers, right now, or the chance closes with the door.', li_complication: 'Daniel is the target AND the man she did not expect to actually want', refusal: 'she does not want to be the kind of woman who only knows how to get things this way' }
    } },
  { label: 'Negotiation', world: 'billionaire', flavor: 'billionaire_modern', dynamic: 'enemies_to_lovers', archetype: 'ARMORED_FOX', intensity: 'Slow Burn', pc: 'Nadia', li: 'Roman',
    bible: {
      age: '36', height: 'average', build: 'compact', hair: 'pulled back, precise', complexion: 'olive', face: 'a face built for not showing its hand',
      signature_feature: 'the way she goes very still in the half-second before she gives ground', second_celebrated_feature: 'a low, even voice that never rises',
      stress_tic: '', desire_tell: '', impatience_tell: 'she squares the papers she does not need to touch', confidence_tell: 'she lets the silence sit and makes him fill it', vulnerability_tell: 'her thumb finds her ring finger, bare now',
      signature_habits: ['finding the price of everything in a room'], self_conscious_feature: '', li_keenly_aware_of: 'the single tell she cannot suppress when it turns personal',
      emotional_weather: 'controlled, watchful, a fight she intends to win', core_contradiction: 'she negotiates for a living and has never once negotiated for what she actually wants', private_hope: 'to win one thing without having to trade away a piece of herself for it',
      wound: { core: 'every deal she has ever won cost her something she pretended not to need', category: 'self-erasure', surfacing_hint: 'when winning requires conceding the personal thing' },
      current_crisis: { event: 'Across the table from Roman, the contract between them and the room cleared for just the two of them, the negotiation live and the first move hers. She has to walk out with the deal and give away as little as she can — and he already knows the one concession she cannot afford, and is waiting, unhurried, for her to reach for it.', li_complication: 'Roman is the rival across the table AND the reason this is not only business', refusal: 'she will not let him see that this one is personal' }
    } }
];

async function setup(page, seed) {
  await page.evaluate((seed) => {
    window.__scenes = []; window.__cost = { calls: 0, usd: 0 };
    window._auditSceneEmotionalGravity = function (pr) { try { if (typeof pr === 'string' && pr.length > 120) window.__scenes.push(pr); } catch (_) {} return Promise.resolve(null); };
    ['_auditBannedPhraseLeakage', '_classifyArchetypeManifestation', '_auditArchetypeManifestation', '_classifyLITexture', '_auditLITextureSources', '_auditSceneAgainstRPlot', '_auditUnavailabilityManifestation'].forEach(fn => { try { window[fn] = function () { return Promise.resolve(null); }; } catch (_) {} });
    var _of = window.fetch, PR = { 'grok-4.3': [1.25e-6, 2.5e-6], 'gpt-4o-mini': [1.5e-7, 6e-7], 'grok-4-1-fast-non-reasoning': [2e-7, 5e-7] };
    window.fetch = async function (url, opts) { var res = await _of.apply(this, arguments); try { var u = (typeof url === 'string' ? url : (url && url.url) || ''); if (/\/api\/(proxy|chatgpt-proxy|mistral-proxy)/.test(u)) { res.clone().json().then(function (j) { try { var us = (j && j.usage) || {}, m = (j && j.model) || '', p = PR[m] || PR['grok-4.3']; window.__cost.calls++; window.__cost.usd += (us.prompt_tokens || 0) * p[0] + (us.completion_tokens || 0) * p[1]; } catch (_) {} }).catch(function () {}); } } catch (_) {} return res; };
    var s = window.state; window._devBypass = true; window._forceAudits = false; window._forceHotOpener = false; window._isBillionaireOnboarding = function () { return false; };
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; s._skipCorridorValidation = true;
    s.picks = s.picks || {};
    s.picks.world = seed.world; s.world = seed.world; s.picks.flavor = seed.flavor; s.worldSubtype = seed.flavor; s.flavor = seed.flavor;
    s.picks.dynamic = seed.dynamic; s.dynamic = seed.dynamic;
    s.loveInterest = 'Male'; s.loveInterestName = seed.li; s.liGender = 'male';
    s.archetype = { primary: seed.archetype, modifier: null, bound: false };
    s.storyLength = 'fling'; s.tier = 'fling'; s.intensity = seed.intensity;
    s.name = seed.pc; s.playerName = seed.pc; s.partnerName = seed.li;
    s.identity = { playerName: seed.pc, partnerName: seed.li, displayPlayerName: seed.pc, displayPartnerName: seed.li };
    s.picks.identity = s.identity; s._pcLookSkipped = true; s.pcLookLocked = true;
    s.renderMode = 'literary'; s.storyModality = 'literary'; s.currentEngine = 'literary';
    s.picks.pov = 'First'; s.povMode = 'normal'; s.turnCount = 0;
    s.pcBodyBible = seed.bible;   // seed the crisis directly (short-circuits generation; A-plot obeys current_crisis)
    s.pcAppearance = s.pcAppearance || {}; s.pcLookLocked = true;
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
    page.on('console', c => { const t = c.text(); if (/OPENING:TEMP/i.test(t) && !temp) temp = (t.match(/selected=([A-Z_]+)/) || [, '?'])[1]; });
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
    const clean = String(text).replace(/\[[A-Z_]+:[^\]]*\]/g, ' ').replace(/<<[^>]*>>/g, ' ').replace(/\s+/g, ' ').trim();
    const wc = (clean.match(/\b[\w']+\b/g) || []).length;
    let orient = {};
    if (clean) { const f200 = clean.split(/\s+/).slice(0, 200).join(' '); orient = await page.evaluate(async (payload) => { try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const j = await r.json(); const c = (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || ''; let o = null; try { o = JSON.parse(String(c).replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()); } catch (_) {} return o || { raw: String(c).slice(0, 160) }; } catch (e) { return { error: String(e.message) }; } }, { messages: [{ role: 'system', content: ORIENT_SYS }, { role: 'user', content: f200 }], role: 'SPECIALIST_RENDERER', preferredModel: 'grok-4-1-fast-non-reasoning', temperature: 0, max_tokens: 200 }); }
    results.push({ seed: seed.label, temp, words: wc, plan, orient, prose: clean, cost });
    log('\n──── ' + seed.label + '  [' + (temp || '?') + ']  ' + wc + 'w · $' + (cost ? cost.usd.toFixed(4) : '?') + ' ────');
    log('  MISSION: ' + (plan.mission || '(none planned!)'));
    if (plan.reader_state) log('  READER-STATE knows: ' + (plan.reader_state.knows || '—'));
    log('  ORIENT (first 200w): happening=' + (orient.happening || '?') + ' goal=' + (orient.goal || '?') + ' stakes=' + (orient.stakes || '?') + ' · reader: "' + (orient.one_line || '') + '"');
    await page.close();
  }
  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
  log('\n═══ MISSION-GRAMMAR GENERALITY (seduction + negotiation; seeded) ═══');
  log('  → does each mission read as its OWN intent (seduce / negotiate), not escape/countdown? prose saved to ' + OUT);
})().catch(e => { console.error('MISSION-ERR', e.message); process.exit(1); });
