// MISSION_ATTEMPT DIAGNOSTIC (Roman 2026-07-25) — the "tiny experiment" BEFORE any scaffold change.
// Calls ONLY the scaffold/planner (window._buildScene1Scaffold) — no Grok prose — so it is ~10× cheaper.
// Question: does the planner emit a concrete mission_attempt, or does it come back EMPTY? If empty across
// the sample, the planner literally isn't reasoning in ATTEMPTS, only DECISIONS. Same premise locks +
// mission-as-input + LI-onstage controls as the full locked probe. See feedback_scene1_decision_vs_attempt.
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = process.env.OUT || '/tmp/attempt.json';
const log = (...a) => console.error(...a);

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
    window.__cost = { calls: 0, usd: 0 };
    var _of = window.fetch, PR = { 'grok-4.3': [1.25e-6, 2.5e-6], 'gpt-4o-mini': [1.5e-7, 6e-7] };
    window.fetch = async function (url, opts) { var res = await _of.apply(this, arguments); try { var u = (typeof url === 'string' ? url : (url && url.url) || ''); if (/\/api\/(proxy|chatgpt-proxy|mistral-proxy)/.test(u)) { res.clone().json().then(function (j) { try { var us = (j && j.usage) || {}, m = (j && j.model) || '', p = PR[m] || PR['gpt-4o-mini']; window.__cost.calls++; window.__cost.usd += (us.prompt_tokens || 0) * p[0] + (us.completion_tokens || 0) * p[1]; } catch (_) {} }).catch(function () {}); } } catch (_) {} return res; };
    var s = window.state; window._devBypass = true; window._forceAudits = false; window._forceHotOpener = false; window._isBillionaireOnboarding = function () { return false; };
    window._lockedSceneMission = seed.mission;
    window._pickOpeningTemperature = function () { return 'COLD_DISRUPTION'; };
    window._liDeferred = function () { return false; };
    window._liOnPageThisScene = function () { return true; };
    window._forceDeckMandate = false; window._TEST_liOnstage = true;
    window._pickScene1LIPresence = function () { return true; };
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; s._skipCorridorValidation = true; s._scene1LIOnStage = true;
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
    s.pcBodyBible = seed._bible;
    s.liBodyBible = { age: '39', height: 'tall', build: 'broad', hair: 'dark, greying at the temple', complexion: 'olive', face: 'a face that gives away nothing on purpose', eye_color: 'grey', signature_feature: 'the stillness he holds before he answers', mouth_quality: 'a mouth that decides before it speaks', hands_quality: 'careful hands', voice_quality: 'low, unhurried', focus_tell: 'he stops doing anything else when she is talking', restraint_tell: 'his hand flattens slowly on the table', interest_tell: 'he stands a half-step closer to her than to the room', pc_keenly_notices: 'the way he watches her mouth when she is deciding whether to lie' };
    s.aPlot = { goal: seed.goal, antagonistOrAntiForce: '', antagonistShape: 'C', antagonistPersonalTie: '', current_crisis: seed._bible.current_crisis, li_complication: seed._bible.current_crisis.li_complication, romanceEngine: seed.engine, storyShape: 'first_meeting', readerQuestion: '', pcWound: seed._bible.wound.core, liWound: '', currentTurn: 0 };
    s.currentCrisis = seed._bible.current_crisis.event;
    s.romanceEnginePlan = { engine: seed.engine, acquaintance: 'KNOWN', scene1Presence: 'ONSTAGE' };
    s.pairDynamic = { romanceEngine: seed.engine, acquaintance: 'KNOWN', scene1Presence: 'ONSTAGE' };
    s._openingTemperature = 'COLD_DISRUPTION';
    s.pcAppearance = s.pcAppearance || {}; s.pcLookLocked = true;
    s._scene1Mission = null; s._scene1MissionAttempt = undefined;
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
    // Fire story init; the scaffold runs EARLY and sets state._scene1MissionAttempt before the Grok prose.
    await page.evaluate(() => { try { window.handleBeginStory(); } catch (e) { console.log('BEGIN-ERR ' + (e && e.message)); } });
    let out = null;
    const t0 = Date.now();
    while (Date.now() - t0 < 90000) {
      await page.waitForTimeout(1500);
      const st = await page.evaluate(() => { const s = window.state || {}; return { mset: s._scene1Mission !== null && s._scene1Mission !== undefined, aset: typeof s._scene1MissionAttempt !== 'undefined', mission: s._scene1Mission || null, attempt: (typeof s._scene1MissionAttempt === 'undefined' ? undefined : s._scene1MissionAttempt), family: (typeof s._scene1MissionFamily === 'undefined' ? undefined : s._scene1MissionFamily), cost: window.__cost }; });
      if (st.mset || st.aset) { out = st; break; }   // scaffold done → capture and ABORT before prose
    }
    results.push({ label: seed.label, missionLocked: seed.mission, missionSeen: (out && out.mission) || null, missionFamily: out ? out.family : undefined, missionAttempt: out ? out.attempt : undefined, cost: out && out.cost });
    log('──── ' + seed.label + (out && out.cost ? '  $' + out.cost.usd.toFixed(4) : '  (timeout)') + ' ────');
    log('  family: ' + ((out && out.family) || '—') + '  · MISSION_ATTEMPT: ' + (!out || out.attempt === undefined ? '(absent)' : (out.attempt ? '"' + out.attempt + '"' : '(EMPTY)')));
    await page.close();   // kill in-flight Grok prose → scaffold-only cost
  }
  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
  const filled = results.filter(r => r.missionAttempt && String(r.missionAttempt).trim()).length;
  const empty = results.filter(r => r.missionAttempt === '' || r.missionAttempt === null).length;
  const absent = results.filter(r => r.missionAttempt === undefined).length;
  log('\n═══ MISSION_ATTEMPT DIAGNOSTIC (scaffold-only; ' + SEEDS.length + ' mission types) ═══');
  log('  filled: ' + filled + '/' + SEEDS.length + ' · EMPTY: ' + empty + '/' + SEEDS.length + (absent ? ' · field-absent: ' + absent : ''));
  log('  → EMPTY across the sample ⇒ the planner reasons only in DECISIONS, not ATTEMPTS (introduce the attempt abstraction).');
})().catch(e => { console.error('ATTEMPT-ERR', e.message); process.exit(1); });
