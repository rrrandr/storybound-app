// VISUAL-ANCHOR PROSE CHECK v2 (Roman 2026-07-26) — CORRECTED per the hard "no LI in Scene 1" rule.
// Scene 1 renders naturally (LI OFF). Then window._forceLiOnStageThisScene=true forces the LI IN_PERSON in
// Scene 2 (reusing the intimacy-staging override). We judge ONLY the LI's FIRST descriptive sentence in Scene 2:
// does it LEAD with the Bible's visual_anchor as a literal perceptible fact (see/hear/smell), before interpretation?
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = process.env.OUT || '/tmp/anchorprose2.json';
const PER_SCENE_TIMEOUT = 300000;
const log = (...a) => console.error(...a);

const TRIALS = [
  { label: 'HANDS', arch: 'SPELLBINDER', focus: 'the hands' },
  { label: 'VOICE', arch: 'ARMORED_FOX', focus: 'the voice' },   // audible — tests the "directly perceptible" fix
  { label: 'SCAR', arch: 'DARK_VICE', focus: 'a scar' }
];

function pcBible(crisisEvent) {
  return {
    age: '31', height: 'average', build: 'slim', hair: 'dark, worn simply', complexion: 'warm', face: 'expressive',
    signature_feature: 'the way she holds a room without raising her voice', second_celebrated_feature: 'a considering gaze',
    stress_tic: '', desire_tell: 'she goes still and listens too closely', confidence_tell: 'she lets a silence run', vulnerability_tell: 'her thumb finds the edge of whatever she is holding',
    signature_habits: ['reading the one thing a person is not saying'], emotional_weather: 'composed with something live underneath', core_contradiction: 'good at getting what she wants, unsure she wants it', private_hope: 'to be met as herself',
    wound: { core: 'she learned to win by never showing what she wants', category: 'guarded', surfacing_hint: 'when the thing she wants is the person across from her' },
    current_crisis: { event: crisisEvent, li_complication: 'he is the one person this cannot be managed with', refusal: 'she will not let it show that this one matters' }
  };
}

const JUDGE_SYS = (li, focus, detail) => 'A character named "' + li + '" appears on-stage in this scene. His Bible-established VISUAL ANCHOR is: focus="' + focus + '", detail="' + detail + '". Find the FIRST sentence that physically describes ' + li + ' (his body / appearance / voice / how he looks or sounds — NOT merely naming him or quoting his dialogue). Judge ONLY that first descriptive sentence. Return ONLY JSON {"first_desc_sentence":"<verbatim>","anchor_in_first_desc_sentence":"yes|no","fact_before_interpretation":"yes|no","renders_the_bible_fact_not_a_generic_substitute":"yes|no","natural_not_mechanical":"yes|no","no_abstraction_precedes_the_fact":"yes|no","overall_pass":"yes|no","note":"<one line>"}. overall_pass=yes ONLY IF the anchor detail ("' + detail + '") appears IN that first descriptive sentence as a literal perceptible fact (something you can see/hear/smell), BEFORE any personality summary / interpretation / atmosphere / metaphor / abstraction (a leading "magnetic presence / effortless grace / quiet confidence" = FAIL), rendered as the Bible fact (not swapped for a generic impression), in natural prose (voice/metaphor AROUND or AFTER the fact is fine).';

async function setupScene1(page, t) {
  await page.evaluate((t) => {
    window.__scenes = []; window.__cost = { calls: 0, usd: 0 };
    window._auditSceneEmotionalGravity = function (pr) { try { if (typeof pr === 'string' && pr.length > 120) window.__scenes.push(pr); } catch (_) {} return Promise.resolve(null); };
    ['_auditBannedPhraseLeakage', '_classifyArchetypeManifestation', '_auditArchetypeManifestation', '_classifyLITexture', '_auditLITextureSources', '_auditSceneAgainstRPlot', '_auditUnavailabilityManifestation'].forEach(fn => { try { window[fn] = function () { return Promise.resolve(null); }; } catch (_) {} });
    var _of = window.fetch, PR = { 'grok-4.3': [1.25e-6, 2.5e-6], 'gpt-4o-mini': [1.5e-7, 6e-7], 'grok-4-1-fast-non-reasoning': [2e-7, 5e-7] };
    window.fetch = async function (url) { var res = await _of.apply(this, arguments); try { var u = (typeof url === 'string' ? url : (url && url.url) || ''); if (/\/api\/(proxy|chatgpt-proxy|mistral-proxy)/.test(u)) { res.clone().json().then(function (j) { try { var us = (j && j.usage) || {}, m = (j && j.model) || '', p = PR[m] || PR['gpt-4o-mini']; window.__cost.calls++; window.__cost.usd += (us.prompt_tokens || 0) * p[0] + (us.completion_tokens || 0) * p[1]; } catch (_) {} }).catch(function () {}); } } catch (_) {} return res; };
    var s = window.state; window._devBypass = true; window._forceAudits = false;
    window._forcedVisualAnchorFocus = t.focus;   // force the LI's anchor channel
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; s._skipCorridorValidation = true;
    s.picks = s.picks || {};
    s.picks.world = 'billionaire'; s.world = 'billionaire'; s.picks.flavor = 'billionaire_modern'; s.worldSubtype = 'billionaire_modern';
    s.picks.dynamic = 'enemies_to_lovers'; s.dynamic = 'enemies_to_lovers';
    s.loveInterest = 'Male'; s.loveInterestName = 'Julian'; s.liGender = 'male';
    s.liArchetype = t.arch; s.loveInterestArchetype = t.arch; s.picks.liArchetype = t.arch;
    s.archetype = { primary: t.arch, modifier: null, bound: false }; s.picks.playermask = 'OPEN_VEIN';
    s.liArrival = 'FROM_START';   // he is available early; the Scene-1 hard rule still keeps him off Scene 1
    s.storyLength = 'fling'; s.tier = 'fling'; s.intensity = 'Slow Burn';
    s.name = 'Mara'; s.playerName = 'Mara'; s.partnerName = 'Julian';
    s.identity = { playerName: 'Mara', partnerName: 'Julian', displayPlayerName: 'Mara', displayPartnerName: 'Julian' };
    s.picks.identity = s.identity; s._pcLookSkipped = true; s.pcLookLocked = true;
    s.renderMode = 'literary'; s.storyModality = 'literary'; s.currentEngine = 'literary';
    s.picks.pov = 'First'; s.povMode = 'normal'; s.turnCount = 0;
    s.pcBodyBible = t._pcBible; s.liBodyBible = null;   // PC seeded (skip); LI GENERATED (real visual_anchor)
    s.aPlot = { goal: 'close the deal on her terms', antagonistOrAntiForce: '', antagonistShape: 'C', current_crisis: t._pcBible.current_crisis, li_complication: t._pcBible.current_crisis.li_complication, romanceEngine: 'COLLISION', storyShape: 'first_meeting', pcWound: t._pcBible.wound.core, liWound: '', currentTurn: 0 };
  }, t);
}

const snap = (page) => page.evaluate(() => { const s = window.state, arr = window.__scenes || []; return { n: arr.length, busy: !!(s._isAdvancingScene || s._stagedSubmitting || s._stagedAwaitingProse), lastLen: (arr[arr.length - 1] || '').length, head: String(arr[arr.length - 1] || '').slice(0, 80) }; });

async function waitFirst(page) { const t0 = Date.now(); let lastLen = -1, stable = 0; while (Date.now() - t0 < PER_SCENE_TIMEOUT) { await page.waitForTimeout(3000); const st = await snap(page); if (st.n >= 1 && !st.busy && st.lastLen > 120) { if (st.lastLen === lastLen) { stable += 3000; if (stable >= 6000) return st.head; } else { lastLen = st.lastLen; stable = 0; } } } return null; }

async function clickAdvance(page, a) {
  await page.evaluate((a) => {
    var s = window.state; s._isAdvancingScene = false; s._stagedSubmitting = false; s._stagedAwaitingProse = false;
    s._petitionEmergenceFired = true; s._petitionEmergenceArmed = false;
    try { if (typeof s._petitionEmergenceSubmitGateCleanup === 'function') { s._petitionEmergenceSubmitGateCleanup(); s._petitionEmergenceSubmitGateCleanup = null; } } catch (_) {}
    try { if (typeof window.closeZoomedCard === 'function') window.closeZoomedCard(); } catch (_) {}
    var ai = document.getElementById('actionInput'), di = document.getElementById('dialogueInput'), b = document.getElementById('submitBtn');
    if (ai) ai.value = a; if (di) di.value = '';
    if (b) { b.disabled = false; b.click(); }
  }, a);
}

async function advanceToScene2(page, a, prevHead) {
  const t0 = Date.now(); let lastClick = 0, lastLen = -1, stable = 0, busySince = 0;
  while (Date.now() - t0 < PER_SCENE_TIMEOUT) {
    const st = await snap(page); const now = Date.now();
    const isNew = st.n >= 2 && st.lastLen > 120 && st.head && st.head !== prevHead;
    if (isNew) { if (!st.busy) { if (st.lastLen === lastLen) { stable += 2500; if (stable >= 6000) return true; } else { lastLen = st.lastLen; stable = 0; } } await page.waitForTimeout(2500); continue; }
    if (st.busy) { if (!busySince) busySince = now; } else busySince = 0;
    const stuckBusy = busySince && (now - busySince > 75000);
    if ((!st.busy || stuckBusy) && (now - lastClick > 45000)) { lastClick = now; try { await clickAdvance(page, a); } catch (_) {} if (stuckBusy) busySince = 0; }
    await page.waitForTimeout(3000);
  }
  return false;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (const t of TRIALS) {
    t._pcBible = pcBible('Across the table from Julian with the revised contract between them; the first move is hers.');
    const page = await (await browser.newContext()).newPage();
    for (const pat of ['**/api/image', '**/api/bfl-kontext', '**/api/replicate**', '**/api/fal**', '**/api/get-parent-images'])
      await page.route(pat, r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"blocked"}' }));
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => window.state && Object.keys(window.state).length > 100 && typeof window.handleBeginStory === 'function', { timeout: 40000 });
    await page.waitForTimeout(400);
    await setupScene1(page, t);
    await page.evaluate(() => { try { window.handleBeginStory(); } catch (e) { console.log('BEGIN-ERR ' + (e && e.message)); } });
    const s1head = await waitFirst(page);
    // Force the LI on-stage for Scene 2, then advance.
    await page.evaluate(() => { window._forceLiOnStageThisScene = true; });
    const advanced = await advanceToScene2(page, 'I hold his gaze and wait to see what he does next.', s1head);
    const cap = await page.evaluate(() => { const a = window.__scenes || []; return { scene2: a.length >= 2 ? a[a.length - 1] : '', n: a.length, va: (window.state.liBodyBible || {}).visual_anchor || null }; });
    const cost = await page.evaluate(() => window.__cost);
    const clean = String(cap.scene2 || '').replace(/\[[A-Z_]+:[^\]]*\]/g, ' ').replace(/<<[^>]*>>/g, ' ').replace(/\s+/g, ' ').trim();
    let judge = {};
    if (clean && cap.va && cap.va.detail) {
      judge = await page.evaluate(async (p) => { try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }); const j = await r.json(); let c = (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || ''; try { return JSON.parse(String(c).replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()); } catch (_) { return { raw: String(c).slice(0, 160) }; } } catch (e) { return { error: e.message }; } }, { messages: [{ role: 'system', content: JUDGE_SYS('Julian', cap.va.focus || t.focus, cap.va.detail) }, { role: 'user', content: clean.slice(0, 7000) }], role: 'SPECIALIST_RENDERER', preferredModel: 'grok-4-1-fast-non-reasoning', temperature: 0, max_tokens: 400 });
    }
    results.push({ label: t.label, focus: t.focus, arch: t.arch, advanced, scenes: cap.n, visual_anchor: cap.va, judge, cost, scene2: clean.slice(0, 3500) });
    log('\n──── ' + t.label + ' [' + t.focus + ']  scenes=' + cap.n + ' advanced=' + advanced + ' $' + (cost ? cost.usd.toFixed(4) : '?') + ' ────');
    log('  anchor: ' + (cap.va ? '[' + cap.va.focus + '] ' + cap.va.detail : '(MISSING)'));
    log('  first LI-desc sentence (Scene 2): ' + (judge.first_desc_sentence || '(none found)'));
    log('  anchor-leads=' + (judge.anchor_in_first_desc_sentence || '?') + ' · fact-first=' + (judge.fact_before_interpretation || '?') + ' · renders-fact=' + (judge.renders_the_bible_fact_not_a_generic_substitute || '?') + ' · natural=' + (judge.natural_not_mechanical || '?'));
    log('  OVERALL PASS: ' + (judge.overall_pass || '?') + (judge.note ? ' · ' + judge.note : ''));
    await page.close();
  }
  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
  const pass = results.filter(r => r.judge && r.judge.overall_pass === 'yes').length;
  const adv = results.filter(r => r.advanced).length;
  const totalCost = results.reduce((a, r) => a + ((r.cost && r.cost.usd) || 0), 0);
  log('\n═══ VISUAL-ANCHOR PROSE CHECK v2 (Scene 2, LI forced on-stage) ═══');
  log('  advanced-to-Scene-2: ' + adv + '/' + TRIALS.length + ' · first-sentence leads with anchor (PASS): ' + pass + '/' + TRIALS.length + ' · $' + totalCost.toFixed(4));
})().catch(e => { console.error('ANCHOR2-ERR', e.message); process.exit(1); });
