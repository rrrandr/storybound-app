// LOCKED-PREMISE MISSION PROBE (Roman 2026-07-25) — the STRICT mission test. The florist probe failed
// because A-plot GENERATION rewrote the seeded premise. This LOCKS the premise physically: pre-set
// state.aPlot.goal (→ generateAPlot short-circuits, 59223/59598), no antagonist (→ antagonist bible
// skips), seeded bibles, and window._lockedSceneMission (forces the mission). The premise is now
// IMMUTABLE; the planner may only elaborate it. Tests whether the architecture (reader_state + author)
// PLAYS six genuinely different mission types — entice / persuade / negotiate / investigate / reconcile
// / confess — into coherent Scene 1s. If yes, scene_mission is a GENERAL dramatic primitive.
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = process.env.OUT || '/tmp/lockedmission.json';
const log = (...a) => console.error(...a);
const ORIENT_SYS = 'You are a FIRST-TIME reader shown ONLY the OPENING (~first 200 words). It may be a quiet charged two-person scene, not a danger scene; it can pass all three. STRICTLY from what is shown, "yes" only if a new reader could CONFIDENTLY answer. Return ONLY JSON: {"happening":"yes|no","goal":"yes|no","stakes":"yes|no","one_line":"<one sentence: what is going on>"}. happening=the situation? goal=what is she trying to do/get? stakes=what she stands to gain or lose?';

const SEEDS = [
  { label: 'ENTICE', pc: 'Mara', li: 'Roman', dynamic: 'forbidden', engine: 'COLLISION', mission: 'Make Roman want to continue the conversation.', goal: 'draw Roman into wanting more of her company', crisis: 'A gallery afterparty has emptied to just the two of them; she has this one unhurried window to make Roman want to keep talking — no deal on the table, only whether he stays.' },
  { label: 'PERSUADE', pc: 'Elena', li: 'Roman', dynamic: 'enemies_to_lovers', engine: 'COLLISION', mission: 'Persuade Roman to say yes before he decides it is not worth his time.', goal: 'win Roman\'s yes on funding her restoration', crisis: 'Ten minutes alone with Roman before his car comes; she has to make the case for her project — his yes or nothing — and he is already half out the door.' },
  { label: 'NEGOTIATE', pc: 'Nadia', li: 'Roman', dynamic: 'enemies_to_lovers', engine: 'COLLISION', mission: 'Secure better terms without conceding the one thing she cannot lose.', goal: 'close the deal on her terms', crisis: 'Across the table from Roman with the revised contract between them; the negotiation is live, the first move is hers, and he already knows the concession she cannot afford.' },
  { label: 'INVESTIGATE', pc: 'Sera', li: 'Roman', dynamic: 'forbidden', engine: 'COLLISION', mission: 'Find out what Roman is concealing without letting him see her looking.', goal: 'learn what Roman is hiding', crisis: 'A quiet dinner where every answer Roman gives is a half-answer; she has to find the shape of what he is not saying without tipping him off that she is hunting for it.' },
  { label: 'RECONCILE', pc: 'Clara', li: 'Roman', dynamic: 'second_chance', engine: 'SHARED_HISTORY', mission: 'Get Roman to lower his guard enough to hear her out.', goal: 'mend the rift with Roman', crisis: 'The first time she and Roman have been in a room since it ended; the old anger is right there, and she has this one chance to get past his guard before he leaves for good.' },
  { label: 'CONFESS', pc: 'Lena', li: 'Roman', dynamic: 'forbidden', engine: 'LOOMING_PRESENCE', mission: 'Tell Roman the thing she has hidden, and stay in the room for his reaction.', goal: 'tell Roman the truth she has hidden', crisis: 'Alone with Roman, the truth she has kept for a year finally unavoidable; she has to say it out loud and not flee the moment his face changes.' }
];

function bible(pc, li, crisisEvent) {
  return {
    age: '32', height: 'average', build: 'slim', hair: 'dark, worn simply', complexion: 'warm', face: 'expressive, harder to read the closer you look',
    signature_feature: 'the way she holds a room without raising her voice', second_celebrated_feature: 'a considering, unhurried gaze',
    stress_tic: '', desire_tell: 'she goes still and listens too closely', impatience_tell: '', confidence_tell: 'she lets a silence run and makes him fill it', vulnerability_tell: 'her thumb finds the edge of whatever she is holding',
    signature_habits: ['reading the one thing a person is not saying'], self_conscious_feature: '', li_keenly_aware_of: 'the moment her composure turns into real feeling',
    emotional_weather: 'composed, with something live underneath', core_contradiction: 'she is good at getting what she wants and unsure she wants what she gets', private_hope: 'to be met as herself, not as what she can do',
    wound: { core: 'she learned to win by never showing what she wants', category: 'guarded', surfacing_hint: 'when the thing she wants is the person across from her' },
    current_crisis: { event: crisisEvent, li_complication: li + ' is the one person this cannot simply be managed with', refusal: 'she will not let it show that this one matters' }
  };
}

async function setup(page, seed) {
  await page.evaluate((seed) => {
    window.__scenes = []; window.__cost = { calls: 0, usd: 0 };
    window._auditSceneEmotionalGravity = function (pr) { try { if (typeof pr === 'string' && pr.length > 120) window.__scenes.push(pr); } catch (_) {} return Promise.resolve(null); };
    ['_auditBannedPhraseLeakage', '_classifyArchetypeManifestation', '_auditArchetypeManifestation', '_classifyLITexture', '_auditLITextureSources', '_auditSceneAgainstRPlot', '_auditUnavailabilityManifestation'].forEach(fn => { try { window[fn] = function () { return Promise.resolve(null); }; } catch (_) {} });
    var _of = window.fetch, PR = { 'grok-4.3': [1.25e-6, 2.5e-6], 'gpt-4o-mini': [1.5e-7, 6e-7], 'grok-4-1-fast-non-reasoning': [2e-7, 5e-7] };
    window.fetch = async function (url, opts) { var res = await _of.apply(this, arguments); try { var u = (typeof url === 'string' ? url : (url && url.url) || ''); if (/\/api\/(proxy|chatgpt-proxy|mistral-proxy)/.test(u)) { res.clone().json().then(function (j) { try { var us = (j && j.usage) || {}, m = (j && j.model) || '', p = PR[m] || PR['grok-4.3']; window.__cost.calls++; window.__cost.usd += (us.prompt_tokens || 0) * p[0] + (us.completion_tokens || 0) * p[1]; } catch (_) {} }).catch(function () {}); } } catch (_) {} return res; };
    var s = window.state; window._devBypass = true; window._forceAudits = false; window._forceHotOpener = false; window._isBillionaireOnboarding = function () { return false; };
    window._lockedSceneMission = seed.mission;   // ← LOCK the mission (now injected UPSTREAM into the plan prompt)
    // Freeze the layers ABOVE the mission: stage the LI ON-PAGE (these are two-handers) and
    // prevent the HOT-crisis / deck-mandate machinery from forcing the LI offstage. The scaffold
    // reads state._scene1LIOnStage (NOT scene1Presence) — that is the flag that actually gates
    // the "OFF-STAGE LI — must NOT appear" rule; pin it directly + kill the deck mandate.
    window._pickOpeningTemperature = function () { return 'COLD_DISRUPTION'; };
    window._liDeferred = function () { return false; };
    window._liOnPageThisScene = function () { return true; };
    window._forceDeckMandate = false;      // deck mandate force-offstages the LI (137345)
    window._TEST_liOnstage = true;          // built-in pre-scaffold LI-onstage ablation (initAPlot 59217)
    window._pickScene1LIPresence = function () { return true; };  // survive any reset that wipes the flag (75916/137332)
    s._scene1LIOnStage = true;              // the flag the scaffold ACTUALLY reads (242480)
    window._missionEnactmentChain = true;   // ← THE SCAFFOLD SPLIT: action → result → decision, injected to author
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; s._skipCorridorValidation = true;
    s.picks = s.picks || {};
    s.picks.world = 'billionaire'; s.world = 'billionaire'; s.picks.flavor = 'billionaire_modern'; s.worldSubtype = 'billionaire_modern'; s.flavor = 'billionaire_modern';
    s.picks.dynamic = seed.dynamic; s.dynamic = seed.dynamic;
    s.loveInterest = 'Male'; s.loveInterestName = seed.li; s.liGender = 'male';
    s.archetype = { primary: 'ARMORED_FOX', modifier: null, bound: false };
    s.storyLength = 'fling'; s.tier = 'fling'; s.intensity = 'Slow Burn';
    s.name = seed.pc; s.playerName = seed.pc; s.partnerName = seed.li;
    s.identity = { playerName: seed.pc, partnerName: seed.li, displayPlayerName: seed.pc, displayPartnerName: seed.li };
    s.picks.identity = s.identity; s._pcLookSkipped = true; s.pcLookLocked = true;
    s.renderMode = 'literary'; s.storyModality = 'literary'; s.currentEngine = 'literary';
    s.picks.pov = 'First'; s.povMode = 'normal'; s.turnCount = 0;
    s.pcBodyBible = seed._bible;                   // seed bibles (skip generation)
    s.liBodyBible = { age: '39', height: 'tall', build: 'broad', hair: 'dark, greying at the temple', complexion: 'olive', face: 'a face that gives away nothing on purpose', eye_color: 'grey', signature_feature: 'the stillness he holds before he answers', mouth_quality: 'a mouth that decides before it speaks', hands_quality: 'careful hands', voice_quality: 'low, unhurried', focus_tell: 'he stops doing anything else when she is talking', restraint_tell: 'his hand flattens slowly on the table', interest_tell: 'he stands a half-step closer to her than to the room', pc_keenly_notices: 'the way he watches her mouth when she is deciding whether to lie' };
    // LOCK THE PREMISE: pre-set aPlot.goal → generateAPlot short-circuits; no antagonist → antagonist bible skips.
    s.aPlot = { goal: seed.goal, antagonistOrAntiForce: '', antagonistShape: 'C', antagonistPersonalTie: '', current_crisis: seed._bible.current_crisis, li_complication: seed._bible.current_crisis.li_complication, romanceEngine: seed.engine, storyShape: 'first_meeting', readerQuestion: '', pcWound: seed._bible.wound.core, liWound: '', currentTurn: 0 };
    s.currentCrisis = seed._bible.current_crisis.event;
    // LI ONSTAGE (mission target must be present); COLD so no hot-crisis deferral.
    s.romanceEnginePlan = { engine: seed.engine, acquaintance: 'KNOWN', scene1Presence: 'ONSTAGE' };
    s.pairDynamic = { romanceEngine: seed.engine, acquaintance: 'KNOWN', scene1Presence: 'ONSTAGE' };
    s._openingTemperature = 'COLD_DISRUPTION';
    s.pcAppearance = s.pcAppearance || {}; s.pcLookLocked = true;
  }, seed);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (const seed of SEEDS) {
    seed._bible = bible(seed.pc, seed.li, seed.crisis);
    const page = await (await browser.newContext()).newPage();
    for (const pat of ['**/api/image', '**/api/bfl-kontext', '**/api/replicate**', '**/api/fal**', '**/api/get-parent-images'])
      await page.route(pat, r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"blocked"}' }));
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
    const plan = await page.evaluate(() => { const s = window.state || {}; return { mission: s._scene1Mission || null, goal: s.aPlot && s.aPlot.goal, attempt: (typeof s._scene1MissionAttempt === 'undefined' ? undefined : s._scene1MissionAttempt) }; });
    const cost = await page.evaluate(() => window.__cost || null);
    const clean = String(text).replace(/\[[A-Z_]+:[^\]]*\]/g, ' ').replace(/<<[^>]*>>/g, ' ').replace(/\s+/g, ' ').trim();
    const wc = (clean.match(/\b[\w']+\b/g) || []).length;
    let orient = {}, enact = {};
    if (clean) {
      const f200 = clean.split(/\s+/).slice(0, 200).join(' ');
      orient = await page.evaluate(async (p) => { try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }); const j = await r.json(); let c = (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || ''; try { return JSON.parse(String(c).replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()); } catch (_) { return {}; } } catch (e) { return { error: e.message }; } }, { messages: [{ role: 'system', content: ORIENT_SYS }, { role: 'user', content: f200 }], role: 'SPECIALIST_RENDERER', preferredModel: 'grok-4-1-fast-non-reasoning', temperature: 0, max_tokens: 200 });
      const ENACT_SYS = 'The scene\'s intended mission is: "' + seed.mission + '". Score it on FIVE measures (the first three test the dramatic architecture; the last two protect story quality). Return ONLY JSON {"action":"yes|partial|no","causality":"yes|partial|no","continuity":"yes|partial|no","character":"yes|partial|no","naturalness":"yes|partial|no","enacts":"yes|partial|no","drifted_to":"<if it drifted, what it became; else empty>","note":"<one short sentence>"}. DEFINITIONS — action: does the protagonist COMPLETE a concrete action that advances the mission (a thing DONE, not prepared-for or deliberated)? causality: does a real RESULT follow from that action — the situation/facts/relationship change, NOT just a facial reaction (frown/blush/silence)? continuity: does the scene\'s closing decision arise BECAUSE of that result (a choice she could not have faced before acting)? character: does the action reveal something about who the protagonist is? naturalness: does the prose read as organic, or mechanically scaffolded / on-rails? enacts: overall, does the scene actively PLAY the mission (vs. deliberate toward it)?';
      enact = await page.evaluate(async (p) => { try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }); const j = await r.json(); let c = (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || ''; try { return JSON.parse(String(c).replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()); } catch (_) { return {}; } } catch (e) { return { error: e.message }; } }, { messages: [{ role: 'system', content: ENACT_SYS }, { role: 'user', content: clean.slice(0, 6000) }], role: 'SPECIALIST_RENDERER', preferredModel: 'grok-4-1-fast-non-reasoning', temperature: 0, max_tokens: 200 });
    }
    results.push({ label: seed.label, missionLocked: seed.mission, missionSeen: plan.mission, missionAttempt: plan.attempt, goalKept: plan.goal, words: wc, orient, enact, prose: clean.slice(0, 4500), cost });
    log('\n──── ' + seed.label + '  ' + wc + 'w · $' + (cost ? cost.usd.toFixed(4) : '?') + ' ────');
    log('  mission locked→seen: "' + (plan.mission || '—') + '"  · goalKept: "' + (plan.goal || '—') + '"');
    log('  MISSION_ATTEMPT (planner-emitted): ' + (plan.attempt === undefined ? '(field absent)' : (plan.attempt ? '"' + plan.attempt + '"' : '(EMPTY — no attempt)')));
    log('  ORIENT: happening=' + (orient.happening || '?') + ' goal=' + (orient.goal || '?') + ' stakes=' + (orient.stakes || '?') + ' · "' + (orient.one_line || '') + '"');
    log('  5-MEASURE: action=' + (enact.action || '?') + ' causality=' + (enact.causality || '?') + ' continuity=' + (enact.continuity || '?') + ' character=' + (enact.character || '?') + ' naturalness=' + (enact.naturalness || '?'));
    log('  ENACTS MISSION: ' + (enact.enacts || '?') + (enact.drifted_to ? ' · drifted→ ' + enact.drifted_to : '') + (enact.note ? ' · ' + enact.note : ''));
    await page.close();
  }
  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
  const enacted = results.filter(r => r.enact && r.enact.enacts === 'yes').length;
  const oriented = results.filter(r => r.orient && r.orient.happening === 'yes' && r.orient.goal === 'yes' && r.orient.stakes === 'yes').length;
  const attemptEmpty = results.filter(r => r.missionAttempt === '' || r.missionAttempt === null).length;
  const attemptFilled = results.filter(r => r.missionAttempt && String(r.missionAttempt).trim()).length;
  const attemptAbsent = results.filter(r => r.missionAttempt === undefined).length;
  const m = k => results.filter(r => r.enact && r.enact[k] === 'yes').length;
  log('\n═══ LOCKED-PREMISE MISSION TEST — ENACTMENT CHAIN ON (6 mission types; premise IMMUTABLE) ═══');
  log('  mission ENACTED (yes): ' + enacted + '/' + SEEDS.length + ' · orientation 3/3: ' + oriented + '/' + SEEDS.length);
  log('  5-MEASURE (yes counts) — architecture:  action ' + m('action') + '/' + SEEDS.length + ' · causality ' + m('causality') + '/' + SEEDS.length + ' · continuity ' + m('continuity') + '/' + SEEDS.length);
  log('  5-MEASURE (yes counts) — story quality:  character ' + m('character') + '/' + SEEDS.length + ' · naturalness ' + m('naturalness') + '/' + SEEDS.length);
  log('  → HEADLINE: did enactment move OFF 0/6? action-yes is the architecture signal; naturalness guards against on-rails prose.');
})().catch(e => { console.error('LOCKED-ERR', e.message); process.exit(1); });
