// ══════════════════════════════════════════════════════════════════════════════════════════
// CURRENT-SOURCE CONTINUATION COVERAGE — a story created, saved and resumed by PRODUCTION.
//
// The preserved paid save is kept as a BACKWARD-COMPATIBILITY control: it carries a frozen
// `sysPrompt` built before these edits, so it cannot show them. This harness instead lets
// production build a story NOW, save it itself, and then resumes that save and captures the
// continuation — so the outgoing request's saved portion was built from current source.
//
// NOTHING IS HAND-BUILT: the snapshot is whatever `saveStorySnapshot()` wrote, and its
// `sysPrompt` is never edited or replaced. Every /api/** is intercepted; the opening planner,
// A-plot, scene skeleton, normalization and memory extractor are answered from labelled
// fixtures, and the author's prose request is answered with fixture prose so Scene 1 can
// complete and production can save. The CONTINUATION author request is captured and ABORTED.
//
// usage: node _nf_fresh_story_continuation.mjs
// ══════════════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import { chromium } from 'playwright-core';
import { configBody, isAuthOrigin, installSession, makeSession, installEntitledProfileStub }
  from './_test_session_env.mjs';

const OUT = '/Users/romantsukerman/storybound-app/_nf_fresh_continuation_out';
try { fs.rmSync(OUT, { recursive: true, force: true }); } catch (_) {}
fs.mkdirSync(OUT, { recursive: true });

const PC = 'Nadia', LI = 'Julian';
const CRISIS = 'her private photographs are going up on the venue screen while the room watches';
const BEAT = 'The photographs are on the venue screen and Nadia has not moved.';
const DECISION = 'Stay and face the room, or walk out while she still can?';

const PROSE = [
  'The photographs went up on the venue screen one after another, and I did not move.',
  'I had chosen that dress because it photographed badly. That was the joke I had made at the time, to someone who had laughed.',
  'Somebody behind me said my name the way you say a word you have just learned. The room did the arithmetic out loud.',
  'The screen changed again. I watched it the way you watch weather you have already been caught in.',
  'A caterer set a tray down too hard and the sound went through me, and I understood that I had been standing still long enough for it to count as an answer.',
  'My own face, enlarged, had the expression I use when I am about to apologise for something that is not mine.',
  'I thought about the door. I thought about the length of the room between me and it, and how many people would watch me measure it.',
].join('\n\n');

const SKEL = {
  environment_anchor: 'the venue screen above the long tables',
  structural_pacing: 'tightening', narrative_density: 'close', dialogue_ratio: 'sparse',
  beat_style: 'pressure then answer', tension_rhythm: 'rising',
  staged_characters: [{ name: PC, presence_mode: 'IN_PERSON', role: 'protagonist' }],
  interlocutor_placement: 'no one is addressing her yet; the room is',
  li_texture_beat: null, li_body_callback: null,
  pc_body_callback: 'beat 2 — signature_feature', antagonist_body_callback: null,
  environment_plus: { target: 'the venue screen above the long tables', axis: 'use',
    beat: 'the screen is the one thing in the room nobody is willing to turn off' },
  fusion: null,
  stage_contract: { v: 1, participants: [{ ref: 'pc:self', presence: 'IN_PERSON' }], event_facts: [] },
  causal_outline: [{ beat: 'the photographs appear and she does not move' },
    { beat: 'the room reads her stillness as an answer', link: 'therefore', from: 1 },
    { beat: 'she decides whether to stay in it', link: 'therefore', from: 2 }],
};

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const caps = [], doors = [], logs = [], faults = [], bibleRouting = [], failures = [];
let PHASE = 'OPENING';
const STATIC = /\/api\/(geo|csp-report|beta-events|bug-report-awards)\b/;
const LOCAL = { '/api/consume-fortune': { success: true, fortunesRemaining: 9999 },
                '/api/refund-fortune':  { success: true, fortunesRemaining: 9999 } };
// SET BEFORE ANY PAGE SCRIPT RUNS. The deck onboarding mandate arms during render, so assigning
// the flag after continueStory() was too late — the log still read "[DECK_MANDATE] ON". app.js:24098
// is the authoritative off switch; the onboarded count makes this a reader past deck onboarding
// rather than Story 1. Test setup only; no production behaviour is changed.
await page.addInitScript(() => {
  try { window._forceDeckMandate = false; } catch (_) {}
  try { localStorage.setItem('sb_stories_onboarded', '3'); } catch (_) {}
});
await installSession(page, makeSession());
await installEntitledProfileStub(page, {});

const envelope = (url, b, payload) => (/mistral-proxy|\/api\/proxy\b|deepseek-proxy/.test(url)
  ? { id: 'fx', object: 'chat.completion', model: b && b.model, usage: {},
      _orchestration: { role: b && b.role, model: b && b.model },
      choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: payload } }] }
  : { ok: true, content: payload, choices: [{ message: { content: payload } }] });

await page.route('**/api/**', async (route) => {
  const req = route.request();
  const url = req.url().replace(/^https?:\/\/[^/]+/, '');
  if (/\/api\/config\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  if (isAuthOrigin(req.url())) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (STATIC.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  const k = Object.keys(LOCAL).find((x) => url.startsWith(x));
  if (k) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LOCAL[k]) });
  let b = null; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
  const msgs = (b && b.messages) || [];
  const sys = String((msgs.find((m) => m.role === 'system') || {}).content || '');
  const usr = String((msgs.find((m) => m.role === 'user') || {}).content || '');
  const role = String((b && b.role) || '?');
  const both = sys + usr;
  const give = (payload, door) => { doors.push({ phase: PHASE, door, role, answered: true });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envelope(url, b, payload)) }); };

  if (/canonicalization and normalization engine for Storybound/.test(both)) {
    return give(JSON.stringify({ canonical_instruction: 'she asks him what he already knows',
      changed: false, rejection_reason: null }), 'NORMALIZATION');
  }
  if (/CHARACTER MEMORY EXTRACTOR/.test(both)) {
    return give(JSON.stringify({
      characters: [{ name: LI, present: false, relationshipToPC: null, newLayer: null, vehicle: 'none', framing: null }],
      scene: { chargeTier: 'high', interpretiveDensity: 'measured', loadedSentenceRatio: 0.3 },
      sceneState: { setting: 'the venue floor below the screen', charactersPresent: [PC],
        protagonistStatus: 'still standing where the photographs found her',
        decisiveChange: 'the room read her stillness as an answer',
        activeInterlocutor: null, protagonistAlone: true },
      relations: [] }), 'MEMORY_EXTRACTOR');
  }
  if (role === 'OPENING_PLANNER') {
    const refsBlock = (usr.match(/ISSUED REFS \(the complete set[^\n]*\n([\s\S]*?)(?:\n\s*\n|$)/) || [])[1] || '';
    const idRows = [...usr.matchAll(/^\s*([a-z]+:[a-z0-9_]+):\s*(.+)$/gm)].map((m) => ({ id: m[1], name: m[2].trim() }));
    const actorRow = idRows.find((r) => r.name === PC);
    const refs = refsBlock.split('\n').map((l) => (l.match(/^\s*·\s*(\S+)/) || [])[1]).filter(Boolean);
    // READ FROM THE REQUEST: the permitted lens operations, and a contact verb the affordance
    // table actually issues for the element the E+ target will name.
    const lensBlock = (usr.match(/"pc_lens_operation" MUST be exactly one of these[^\n]*\n([\s\S]*?)\n(?=[A-Z])/) || [])[1] || '';
    const lensOps = lensBlock.split('\n').map((l) => (l.match(/^\s*·\s*([A-Z][A-Z_]+)\s+—/) || [])[1]).filter(Boolean);
    const affRows = {};
    ((usr.match(/AFFORDANCE TABLE \(which verbs each affordance permits\): ([^\n]+)/) || ['', ''])[1])
      .split(';').forEach((row) => { const m = row.match(/\s*([A-Z_]+)\s*→\s*([A-Z_/]+)/); if (m) affRows[m[1]] = m[2].split('/'); });
    const firstAff = Object.keys(affRows)[0] || 'FIXTURE';
    // THE FACT BASE the request prints — the only ids `grounds` may cite.
    const factBlock = (usr.match(/FACT BASE — the ONLY ids "grounds" may cite[^\n]*\n([\s\S]*?)(?:\n\s*\n|$)/) || [])[1] || '';
    const factIds = factBlock.split('\n').map((l) => (l.match(/^\s*·\s*(\S+)\s*=/) || [])[1]).filter((x) => x && x !== 'env:axis');
    const contactVerb = (affRows[firstAff] || ['GRIP'])[0];
    const spine = {
      pressure_source_type: 'relational', pressure_source: CRISIS, hook_object: null,
      opening_actor_id: actorRow ? actorRow.id : (refs[0] || null),
      opening_beat: BEAT, rising_beats: ['she does not move', 'the room waits'],
      decision_beat: DECISION, pc_career: 'ceramicist', opening_setting: 'a venue floor below the screen',
      li_texture_beat: 'his name on somebody else\u2019s mouth, two tables away',
      pc_self_presentation_beat: 'I straighten a cuff that does not need straightening',
      scene_want: 'get out of the room with her name intact', scene_mission: CRISIS,
      reader_state: { knows: CRISIS, believes: 'she can still hold it', wondering: 'what she does next',
                      must_not_confuse: 'this is not about the photographs themselves' },
      pc_body_callback: 'decision',
      environment_elements: ['a drying rack of unfired cups', 'a bucket of slip going skinned'],
      staged_characters: [{ name: PC, presence: 'IN_PERSON', anchor_beat: 'is already in place as the scene opens' }],
    };
    if (/"stage_contract"/.test(usr) || /stage_contract/.test(sys)) {
      // EVERY environment element needs ONE issued affordance, or the contract is refused
      // ("stage_contract.elements missing"). The affordances are read from the request's own
      // AFFORDANCE TABLE so the pair is always one the planner was actually issued.
      const affTable = {};
      ((usr.match(/AFFORDANCE TABLE \(which verbs each affordance permits\): ([^\n]+)/) || ['', ''])[1])
        .split(';').forEach((row) => { const m = row.match(/\s*([A-Z_]+)\s*→\s*([A-Z_/]+)/); if (m) affTable[m[1]] = m[2].split('/'); });
      const AFFORD = Object.keys(affTable);
      const pick = (i) => AFFORD.length ? AFFORD[i % AFFORD.length] : (i === 0 ? 'FIXTURE' : 'GRASPABLE');
      spine.stage_contract = { v: 1,
        participants: [{ ref: (refs[0] || 'pc:self'), presence: 'IN_PERSON' }],
        elements: spine.environment_elements.map((nm, i) => ({ name: nm, affordance: pick(i) })),
        event_facts: [] };
    }
    // THE ENVELOPE IS { opening_spine, scene_skeleton } — not a bare spine.
    // Traced, not guessed: app.js:294417 sets `_skelRaw = _envelope.scene_skeleton : null`, and
    // app.js:295561 then reads `_skelRaw.environment_plus` WITHOUT a null guard, so an envelope
    // with no scene_skeleton threw "Cannot read properties of null (reading 'environment_plus')".
    // The malformed envelope was mine; production is not changed to accommodate it.
    const skel = {
      character_plus: [],
      environment_plus: { target: spine.environment_elements[0], axis: 'use',
        beat: spine.environment_elements[0] + ' is the one thing in the room nobody is willing to move' },
      // A null fusion is only permitted as a STRUCTURED DECLINE (app.js:295459). With one
      // character on stage and an E+ target named, NO_ONSTAGE_CHARACTER and
      // NO_ENVIRONMENT_TARGET are both self-contradictory, so the only honest code here is
      // TARGET_UNTOUCHABLE_THIS_SCENE.
      fusion: { impossible_because: 'TARGET_UNTOUCHABLE_THIS_SCENE' },
      // pc_opening_fusion is REQUIRED, not optional (app.js:295604), and v3 requires
      // pc_lens_operation / character_revelation / environment_pressure plus a STRUCTURED
      // contact whose verb is one the affordance table issued and whose object is the literal
      // {ENV_TARGET}. The lens and the verb are read from the request, never invented.
      pc_opening_fusion: {
        pc_lens_operation: (lensOps[0] || 'READS_INTENT'),
        character_revelation: 'she is the one who keeps working while the room decides about her',
        // environment_pressure is an OBJECT: { grounds: [ids from the request's FACT BASE], text }.
        // "env:axis" is always citable; any further ids are read from the FACT BASE the request
        // prints, never invented (free spine prose may not be cited).
        environment_pressure: { grounds: ['env:axis'].concat(factIds.slice(0, 1)),
          text: 'the rack is the only thing in the room still doing its job, and she cannot leave it unturned without the room noticing' },
        // The EXACT issued element name, not the placeholder — the validator rejects
        // "{ENV_TARGET}" with "contact_object is the placeholder".
        contact: { verb: contactVerb, object: 'a drying rack of unfired cups' },
      },
    };
    // A REPAIR MAY RETURN ONLY THE KEYS IT NAMES. Replying with the whole envelope produced
    // [SCENE1:SKELETON:REPAIR_SCOPE_VIOLATION] out-of-scope key(s): character_plus,
    // environment_plus — and then the abort. Same scoping the working opening harness uses.
    if (/Repair ONLY the named fields|NAMED FAILURES \(fix exactly these/i.test(usr)) {
      const keys = ((usr.match(/exactly these top-level keys, corrected: ([^\n.]+)/) || ['', ''])[1] || '')
        .split(',').map((x) => x.trim()).filter(Boolean);
      const only = {};
      keys.forEach((kk) => { if (kk in skel) only[kk] = skel[kk]; else if (kk in spine) only[kk] = spine[kk]; });
      return give(JSON.stringify(only), 'OPENING_PLANNER:repair(' + keys.join('|') + ')');
    }
    return give(JSON.stringify({ opening_spine: spine, scene_skeleton: skel }), 'OPENING_PLANNER');
  }
  if (/narrative skeletons for fiction scenes|CAUSAL_OUTLINE/.test(both)) {
    return give(JSON.stringify(SKEL), 'SKELETON');
  }
  const isAuthor = (b && b.author === true)
    || /THIS IS THE LAST PROSE IN THE SCENE|YOU ARE WRITING AS S\. TORY BOUND|STORYBOUND ARCHITECTURE LAWS/i.test(both);
  if (isAuthor && both.length > 40000) {
    if (PHASE === 'OPENING') {
      // ANSWERED so Scene 1 completes and PRODUCTION saves the story itself.
      doors.push({ phase: PHASE, door: 'AUTHOR(answered to let production save)', role, answered: true });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envelope(url, b, PROSE)) });
    }
    const n = caps.length + 1;
    const name = `fresh_continuation_author__${role}__${n}.txt`;
    fs.writeFileSync(OUT + '/' + name,
      `=== FRESH STORY · CONTINUATION · ROLE ${role} · MODEL ${b && b.model} · url=${url}\n\n`
      + `=== SYSTEM (${sys.length} chars) ===\n${sys}\n\n=== USER (${usr.length} chars) ===\n${usr}\n`);
    caps.push({ role, sys: sys.length, usr: usr.length, file: name });
    doors.push({ phase: PHASE, door: 'AUTHOR(captured)', role, answered: false });
    return route.abort();
  }
  if (/pcBodyBible|BODY BIBLE|body bible/i.test(both) || /signature_feature/.test(both)) {
    // DUMP BEFORE ANSWERING so the PC/LI discriminator is read from the real request instead of
    // guessed. The first guess (/love interest|\bLI\b/) matched BOTH prompts and classified every
    // bible as the LI, so the PC bible received the LI payload.
    try { fs.writeFileSync(OUT + `/bible_door__${doors.length}.txt`,
      `=== ROLE ${role} url=${url}\n\n=== SYSTEM ===\n${sys}\n\n=== USER ===\n${usr}\n`); } catch (_) {}
    // ── TWO-SIDED SHAPE ASSERTION; AMBIGUITY IS A FAULT, NOT A DEFAULT ──
    // max_tokens DID separate these two captured requests (2500 at app.js:280970 for
    // pcBodyBible, 3000 at app.js:282063 for liBodyBible) but it is a transport budget, not an
    // identity contract: either call site can be retuned without telling this harness, and the
    // old `: 'li'` tail meant any surprise silently became the LI. The IDENTITY used here is
    // each prompt's REQUIRED FIELD SET, which the fixture must satisfy anyway:
    // THERE ARE THREE BODY BIBLES, not two — the first version of this assertion found the
    // third. The marks below were chosen by reading the three captured prompts, because the
    // obvious field names are NOT exclusive: the LI prompt quotes the PC's "signature_habits"
    // and "surfacing_hint" while asking for its own fields, so those cannot discriminate.
    //   PC   (app.js:~280900, max_tokens 2500): "li_keenly_aware_of", the THREE DIFFERENT DANIS
    //        test, "self_conscious_feature", "wound".
    //   LI   (app.js:~281990, max_tokens 3000): "signature_kink", "desire_register_exemplars",
    //        the THREE-DIFFERENT-MEN test, "attraction_pattern".
    //   ANTAG(app.js:~282340, max_tokens 1100): "targeting_tell", "corrupted_warmth_tell",
    //        "softness_seam", "pc_keeps_noticing" — a bible the previous `: 'li'` fallback fed
    //        the LI's payload, silently, because it matched neither token budget.
    // Exactly one signature must match, and max_tokens must AGREE when it is recognised.
    // Anything else leaves the door UNANSWERED with a named fault, so a routing change surfaces
    // as a failure instead of a bible quietly receiving another character's body.
    const MARKS = {
      pc:    ['"li_keenly_aware_of"', 'THREE DIFFERENT DANIS', '"self_conscious_feature"', '"wound"'],
      li:    ['"signature_kink"', '"desire_register_exemplars"', 'THREE-DIFFERENT-MEN', '"attraction_pattern"'],
      antag: ['"targeting_tell"', '"corrupted_warmth_tell"', '"softness_seam"', '"pc_keeps_noticing"'],
    };
    const TOK = { 2500: 'pc', 3000: 'li', 1100: 'antag' };
    const hits = {}; for (const k of Object.keys(MARKS)) hits[k] = MARKS[k].filter((m) => both.includes(m)).length;
    const strong = Object.keys(MARKS).filter((k) => hits[k] >= 3);
    const byShape = strong.length === 1 ? strong[0] : null;
    const byTokens = TOK[b && b.max_tokens] || null;
    if (!byShape || (byTokens && byTokens !== byShape)) {
      faults.push({ door: 'BODY_BIBLE', role,
        fault: !byShape ? (strong.length ? 'SHAPE_MATCHED_MULTIPLE' : 'SHAPE_MATCHED_NONE')
                        : 'SHAPE_DISAGREES_WITH_MAX_TOKENS',
        byShape, byTokens, max_tokens: (b && b.max_tokens) || null, hits,
        dump: `bible_door__${doors.length}.txt` });
      doors.push({ phase: PHASE, door: 'BODY_BIBLE(UNRESOLVED — not answered)', role, answered: false });
      return route.abort();
    }
    const whose = byShape;
    const pcHits = hits.pc, liHits = hits.li;
    bibleRouting.push({ whose, hits, max_tokens: (b && b.max_tokens) || null,
      tokensAgree: byTokens === whose });
    if (whose === 'antag') {
      return give(JSON.stringify({
        signature_feature: 'a smile that arrives half a second late', build: 'heavy through the shoulders',
        height: 'tall', hair: 'cropped, going grey at the temples', eye_color: 'pale brown',
        eyes_register: 'patient', complexion: 'weathered', voice_quality: 'level, never raised',
        hands_quality: 'thick, very clean', visual_anchor: 'the late smile',
        archetype: 'CIVIL_PREDATOR', archetype_signature: 'courtesy used as leverage',
        proximity_default: 'one foot inside the conversational distance, and he does not adjust',
        targeting_tell: 'he says her full name when he wants the room to hear it',
        control_tell: 'he waits out an answer rather than asking twice',
        escalation_tell: 'he starts agreeing with her',
        pleasure_tell: 'he looks at whoever else is listening',
        corrupted_warmth_tell: 'he remembers what she told him once and returns it as a favour',
        softness_seam: 'he will not be the one to raise his voice first, and knows it costs him nothing',
        pc_keeps_noticing: 'the late smile, the clean hands, the full name',
        ex_romance_archetype: null, focus: 'the venue screen', detail: 'he does not look at it',
      }), 'BODY_BIBLE:antag (shape ' + hits.antag + '/4, max_tokens ' + (b && b.max_tokens) + ')');
    }
    return give(JSON.stringify(whose === 'li'
      ? { signature_feature: 'a scar through one eyebrow', build: 'tall, unhurried',
          voice_quality: 'low, unhurried', pc_keenly_notices: ['his hands flat on the rail'],
          hair: 'dark, pushed back', eyes: 'grey', hands: 'broad, careful' }
      : { signature_feature: 'a crooked eyetooth', build: 'narrow-shouldered',
          self_conscious_feature: 'the crooked eyetooth', hair: 'dark, pinned up',
          eyes: 'brown', hands: 'clay under the nails' }),
      'BODY_BIBLE:' + whose + ` (shape ${pcHits.length}pc/${liHits.length}li, max_tokens ${(b && b.max_tokens) || '?'})`);
  }

  // ── THE A-PLOT GENERATOR ──
  // Aborting this left "[A-PLOT] Init failed (story continues without A-plot)" and the scaffold
  // builder then threw on a null it expected the A-plot to fill. Shape copied from the opening
  // harness fixture that 99 captures already exercise.
  if (/antagonistOrAntiForce|namedClock|milestones/.test(both)) {   // body-bible door is handled ABOVE
    const miles = [1, 2, 3].map((i) => ({ atScene: i + 1, atPercent: i * 25,
      kind: i === 1 ? 'setup' : (i === 2 ? 'first_complication' : 'crisis'),
      event: 'another set of the photographs reaches somebody who matters',
      emotional_conductivity: 'it turns something she could still deny into something she must answer' }));
    return give(JSON.stringify({
      goal: 'get the photographs off the venue screen before the room finishes looking, and keep her name',
      namedClock: 'the forty minutes until the auction closes the room',
      clockUnit: 'days', totalClockUnits: 1,
      antagonistOrAntiForce: 'Rourke, the ex who kept the photographs',
      antagonistSubject: { kind: 'PERSON', proper_name: 'Rourke' },
      antagonistShape: 'A',
      antagonistPersonalTie: 'the ex she left, who kept everything she sent him',
      requiredSupportPerson: null, requiredSupportSubject: null,
      personalStakePC: 'the version of her the room will remember after tonight',
      personalStakeLI: 'the discretion he sells, which cannot survive being in this room',
      pcWound: 'she was photographed once before and told it was her own fault, at twenty-two',
      liWound: 'he was taught by his father that being seen wanting a thing is how you lose it',
      pcWoundCategory: 'PUBLIC', liWoundCategory: 'PARENTAL',
      stakesIfFail: 'the photographs become the thing she is, to everyone in the city who matters',
      stakesIfWin: 'she keeps her name and owes somebody something she cannot pay back',
      milestones: miles,
    }), 'A_PLOT');
  }

  // ── THE AMBIENT SOUNDSCAPE CLASSIFIER ──
  // Despite the INTIMACY_SPECIALIST role tag it returns EXACTLY one tag from a fixed enum, no
  // JSON. Aborting it stopped the continuation turn before the author was reached.
  if (/You classify the ambient soundscape/.test(both)) {
    return give('urban_room', 'AMBIENT_SOUNDSCAPE');
  }

  // Any other generator is aborted and RECORDED rather than answered with a placeholder, so no
  // downstream chain ever runs on a shape that is not a real one.
  doors.push({ phase: PHASE, door: 'OTHER', role, url, answered: false, chars: both.length });
  try { fs.writeFileSync(OUT + `/door__${PHASE}__${role.replace(/[^\w]/g, '_')}__${doors.length}.txt`,
    `=== ROLE ${role} url=${url}\n\n=== SYSTEM (${sys.length}) ===\n${sys}\n\n=== USER (${usr.length}) ===\n${usr}\n`); } catch (_) {}
  return route.abort();
});
await page.route('**/sb-test.localhost/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
page.on('console', (m) => { if (logs.length < 900) logs.push(PHASE + ' | ' + m.text().slice(0, 240)); });
page.on('pageerror', (e) => logs.push(PHASE + ' | PAGEERROR ' + String(e && e.message).slice(0, 200)));

await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 60000 });
await page.waitForFunction(() => window.state && window.handleBeginStory, null, { timeout: 180000 });

// ── PRODUCTION SETUP, THEN PRODUCTION'S OWN SAVE ──
await page.evaluate(({ pc, li }) => {
  const S = window.state;
  Object.assign(S, {
    world: 'Modern', worldSubtype: 'small_town', flavor: 'Billionaire', dynamic: 'Enemies',
    archetype: { primary: 'BEAUTIFUL_RUIN', modifier: null },
    name: pc, playerName: pc, loveInterestName: li, partnerName: li,
    loveInterest: 'Male', liGender: 'male', playerMask: 'OPEN_VEIN', pov: 'first_person',
    storyLength: 'taste', tier: 'novella', access: 'sub', subscribed: true, fortunes: 9999999,
    intensity: 'Steamy', identity: { playerName: pc, partnerName: li },
    renderMode: 'literary', currentEngine: 'literary', storyModality: 'literary',
    turnCount: 0, _skipCorridorValidation: true, storypassEligible: true,
  });
  S.picks = { world: S.world, worldSubtype: S.worldSubtype, flavor: S.flavor, dynamic: S.dynamic,
              tone: 'Earnest', pov: 'First', length: 'taste', identity: S.identity };
}, { pc: PC, li: LI });

try { await Promise.race([page.evaluate(() => window.handleBeginStory()),
                          new Promise((r) => setTimeout(r, 240000))]); } catch (_) {}

const saved = await page.evaluate(() => {
  try {
    const raw = localStorage.getItem('sb_saved_story');
    if (!raw) return { present: false };
    const s = JSON.parse(raw);
    const sp = String(s.sysPrompt || '');
    return { present: true, storyId: s.storyId || s.story_id || null,
      sysPromptLen: sp.length,
      turnCount: (s.stateSnapshot || {}).turnCount,
      sensoryListings: (sp.match(/· veilwood — rain on silk bark/g) || []).length,
      newSensoryWording: (sp.match(/sensory anchors listed (above|below)/g) || []).length,
      recurrenceRule: /Full sensory beat on first appearance only/.test(sp),
      factsNotOmens: /are FACTS, not omens/.test(sp),
      newRestrictionCaveat: (sp.match(/ON ANY RESTRICTION ABOVE WITH NO STRUCTURED BOUNDS/g) || []).length,
      oldRestrictionCaveat: (sp.match(/ANY LIMIT STATED IN THE REASON BELOW STILL APPLIES/g) || []).length };
  } catch (e) { return { present: false, threw: String(e && e.message) }; }
});
console.log('\nPRODUCTION SAVE AFTER SCENE 1: ' + JSON.stringify(saved));

// ── RESUME THAT FRESH SAVE AND CAPTURE ITS CONTINUATION ──
let resumed = null, submitted = 'not attempted';
if (saved.present && saved.storyId) {
  PHASE = 'CONTINUATION';
  resumed = await page.evaluate(async (id) => {
    try { await Promise.race([window.continueStory(id), new Promise((r) => setTimeout(r, 90000))]); }
    catch (e) { return { ok: false, threw: String(e && e.message) }; }
    const S = window.state || {};
    S.subscribed = true; S.tier = 'novella'; S.access = 'sub'; S.fortunes = 9999999; S.storypassEligible = true;
    // THE DECK ONBOARDING MANDATE blocks the literary Submit on an early story
    // ("[DECK:EMERGENCE] Submit blocked — re-zoom + toast"). app.js:24098 exposes the
    // authoritative off switch production itself uses; this is test setup, not a product change.
    window._forceDeckMandate = false;
    return { ok: true, storyId: S.storyId, turnCount: S.turnCount, renderMode: S.renderMode,
      hasSubmit: !!document.getElementById('submitBtn') };
  }, saved.storyId);
  console.log('RESUME OF THE FRESH SAVE: ' + JSON.stringify(resumed));
  if (resumed && resumed.ok && resumed.hasSubmit) {
    submitted = await page.evaluate(async () => {
      // IMMEDIATELY BEFORE THE CLICK. Profile hydration against the stubbed backend keeps
      // re-setting tier=free / fortunes=0 after resume, and the turn is then refused at the
      // paywall with no abort logged. Test setup only.
      const S = window.state;
      S.subscribed = true; S.tier = 'novella'; S.access = 'sub'; S.fortunes = 9999999;
      S.storypassEligible = true; S.storyLength = 'novella';
      window._forceDeckMandate = false;
      const a = document.getElementById('actionInput'); if (a) a.value = 'she walks toward the door';
      const d = document.getElementById('dialogueInput'); if (d) d.value = '';
      const btn = document.getElementById('submitBtn'); btn.disabled = false; btn.click();
      await new Promise((r) => setTimeout(r, 180000));
      return 'clicked';
    });
  }
}
await browser.close();
fs.writeFileSync(OUT + '/RESULT.json', JSON.stringify({ saved, resumed, submitted, caps, doors, logs }, null, 2));

const P = console.log;
P('SUBMIT: ' + submitted);
P('\nCONTINUATION AUTHOR REQUESTS CAPTURED: ' + caps.length);
caps.forEach((c) => P(`  ${(c.sys + c.usr).toLocaleString().padStart(9)} chars = sys ${c.sys.toLocaleString()} + usr ${c.usr.toLocaleString()}  role=${c.role}`));
if (caps.length) {
  const t = fs.readFileSync(OUT + '/' + caps[0].file, 'utf-8');
  const n = (s) => t.split(s).length - 1;

  // ── WHAT THE CONSOLIDATION ACTUALLY PROMISED, CHECKED ON THE DELIVERED REQUEST ──
  // Sensory markers alone only covered one of the edits. Every batch in this consolidation
  // made a claim of the form "this requirement survives, and is delivered once"; each claim
  // below is one assertion against the captured continuation request, so a regression in any
  // of them fails this harness rather than passing on the strength of the sensory counts.
  // `exp` is the expected count; `min` means at-least (the material may legitimately recur).
  const CHECKS = [
    // SENSORY CANON — one complete listing, both distinct rules, reference direction fixed.
    ['sensory', 'one sensory listing', { s: '· veilwood — rain on silk bark', exp: 1 }],
    ['sensory', 'recurrence rule kept', { s: 'Full sensory beat on first appearance only', min: 1 }],
    ['sensory', 'facts-not-omens kept', { s: 'are FACTS, not omens', min: 1 }],
    ['sensory', 'mean-nothing clause kept', { s: 'mean nothing by themselves', min: 1 }],
    ['sensory', 'anchors pointer says ABOVE', { s: 'sensory anchors listed above', min: 1 }],
    ['sensory', 'stale "listed below" gone', { s: 'sensory anchors listed below', exp: 0 }],

    // WITHHELD CORE — the locked variant contract was delivered byte-identically twice in one
    // request (once inside the carried state.sysPrompt, once re-emitted by the turn builder).
    // The static block is now delivered once and the turn adds a back-reference plus whatever
    // per-turn midpoint enforcement applies. This fixture sets a variant, so both must appear.
    ['lens', 'locked lens block delivered once', { s: 'WITHHELD CORE — ', exp: 1 }],
    ['lens', 'turn back-reference replaces the restatement',
      { s: 'the locked variant contract stated earlier in this prompt is still in force', min: 1 }],

    // SCENE-1 OWNERSHIP — one statement of the inversion, with every requirement intact.
    ['ownership', 'merged ownership paragraph once', { s: 'OWNERSHIP AND ORDER.', exp: 1 }],
    ['ownership', 'A-plot outputs are inputs, not substrate',
      { s: 'are INPUTS to the scene, never its substrate', min: 1 }],
    ['ownership', 'wrong order keeps its observed symptom', { s: 'finally surfaces in paragraph 6 or 7', min: 1 }],
    ['ownership', 'correct order kept', { s: 'present in the room of her mind from the FIRST paragraphs', min: 1 }],
    ['ownership', 'reader test ✓ kept verbatim', { s: 'Unfortunately, the plot is attached to him', min: 1 }],
    ['ownership', 'paragraph test + bulk requirement merged once',
      { s: "must occupy the paragraph's BULK", exp: 1 }],
    ['ownership', 'delete-last-sentence check kept', { s: 'Delete its last sentence', min: 1 }],
    ['ownership', 'person-not-information kept', { s: 'as a PERSON in her mind, not as INFORMATION about him', min: 1 }],
    ['ownership', 'decorative vs load-bearing stated once', { s: 'are LOAD-BEARING, and the scene needs those', exp: 1 }],
    ['ownership', 'moments-vs-biography kept', { s: 'Moments create desire. Summaries create biography.', min: 1 }],
    ['ownership', 'retired heading ORDER OF OPERATIONS gone', { s: 'ORDER OF OPERATIONS', exp: 0 }],
    ['ownership', 'retired heading THE READER TEST gone', { s: 'THE READER TEST', exp: 0 }],
    ['ownership', 'retired heading TAIL-PIVOT gone', { s: 'TAIL-PIVOT IS NOT OWNERSHIP', exp: 0 }],

    // WEIGHTING — the caller's contradictory 80/20 claim is gone; the helper owns the split.
    ['weighting', 'old 80/20 claim gone', { s: 'the 80/20 relationship-weighting applies', exp: 0 }],

    // E+ CONSOLIDATED PARAGRAPH — one copy, and each of the four required points present.
    ['eplus', 'consolidated paragraph delivered once',
      { s: 'ENVIRONMENT+ IS NOT SYMBOLISM, AND IT IS NOT A SUBJECT', exp: 1 }],
    ['eplus', 'point 1 — naming is not meaning', { s: 'does not make it mean anything', min: 1 }],
    ['eplus', 'point 1 — a spoon is usually a spoon', { s: 'a spoon is usually a spoon', min: 1 }],
    ['eplus', 'point 2 — all seven routes incl. CHANGES',
      { s: 'WANTS, FEARS, REMEMBERS, USES, AVOIDS, CHOOSES or CHANGES', min: 1 }],
    ['eplus', 'point 2 — history is only one route',
      { s: 'a history with it is one route, never the requirement', min: 1 }],
    ['eplus', 'point 3 — ordinary scale qualifies', { s: 'Scale is irrelevant', min: 1 }],
    ['eplus', 'point 3 — practical/social/habitual/funny',
      { s: 'practical, social, habitual or funny as readily as grave', min: 1 }],
    ['eplus', 'point 4 — do not manufacture', { s: 'Do not manufacture one', min: 1 }],
    ['eplus', 'point 4 — plain grounding stays valid',
      { s: 'ground the scene plainly and move on', min: 1 }],
    ['eplus', 'the gate sentence survives', { s: 'No relationship, no beat.', min: 1 }],
    ['eplus', 'retired heading 1 gone', { s: 'AND DO NOT MANUFACTURE IT', exp: 0 }],
    ['eplus', 'retired heading 2 gone', { s: 'IT DOES NOT HAVE TO BE ANCIENT, MAGICAL, OR TRAGIC', exp: 0 }],
    ['eplus', 'retired heading 3 gone', { s: 'THE RELATIONSHIP DOES NOT HAVE TO BE SYMBOLIC', exp: 0 }],
    // THE MERGE MUST NOT HAVE BECOME THE DEFINITION. The fuller E+ contract is still delivered
    // from its own site; if this went missing the paragraph would be overriding it, not qualifying it.
    ['eplus', 'fuller E+ contract still delivered', { s: 'ONE E+ ROUTE — CHAIN', min: 1 }],

    // PROTECTED EXEMPLARS — kept verbatim, and delivered once rather than restated.
    ['exemplars', 'worked-registers lead-in once', { s: 'PRACTICAL, SOCIAL, HABITUAL OR FUNNY — worked:', exp: 1 }],
    ['exemplars', 'register exemplar — lift', { s: 'the fourth lift stalled between floors', min: 1 }],
    ['exemplars', 'register exemplar — window chair', { s: 'the chair nearest the window', min: 1 }],
    ['exemplars', 'register exemplar — ugly fourth chair', { s: 'the ugly fourth chair', min: 1 }],
    // FUSION'S EXEMPLAR COMES FROM THE SHARED BANK ON THIS PATH, not from app.js.
    // essential-beat-check.js:2706 CP_FUSION.authorBlock() is what app.js:69053 pushes when
    // EssentialBeatCheck is present, which is the production case; the three "MORE FUSED"
    // sentences in app.js:69055/69058 are the else/catch fallback for when it is absent, so
    // asserting them here was wrong — only one of the three branches ever runs. What must hold
    // is that the author gets exactly ONE fusion demonstration, from the single source the
    // editor also reads, and that the fallback is not delivered alongside it.
    ['exemplars', 'shared fusion demonstration delivered once',
      { s: 'I kept my eyes on a mated pair of Veilwood trees', exp: 1 }],
    ['exemplars', 'its WHY IT WORKS kept', { s: 'reveal the OBSERVER — in the same description, not after it', min: 1 }],
    ['exemplars', 'its do-not-copy caution kept', { s: 'A LABELLED DEMONSTRATION OF THE TECHNIQUE', min: 1 }],
    ['exemplars', 'fallback exemplars not delivered too', { s: 'MORE FUSED, since this is the form to reach for', exp: 0 }],
    // THE CHAIRS DEDUPE: the hardcoded restatement was removed, the shared bank still renders it.
    ['exemplars', 'chairs exemplar delivered once', { s: 'Jess sat in the chair everyone else avoided', exp: 1 }],

    // THE FOUR OPPORTUNITY TRIGGERS — explicitly kept by the E+ rewrite.
    ['triggers', 'trigger header once', { s: 'WHEN TO LOOK FOR IT — four moments, not a quota:', exp: 1 }],
    ['triggers', 'trigger 1 — first significant mention', { s: '(1) FIRST SIGNIFICANT MENTION', min: 1 }],
    ['triggers', 'trigger 2 — first use', { s: '(2) FIRST USE', min: 1 }],
    ['triggers', 'trigger 3 — change', { s: '(3) CHANGE', min: 1 }],
    ['triggers', 'trigger 4 — relationship changes', { s: '(4) WHEN THE PROTAGONIST', min: 1 }],

    // GESTURE / FOOT RECONCILIATION — one availability rule, one justification rule, cross-referenced.
    ['gesture', 'availability rule stated once', { s: 'WHAT THE NARRATOR CAN ACTUALLY SEE (HARD)', exp: 1 }],
    ['gesture', 'availability covers perception AND felt body',
      { s: 'perceived from where she is, or felt in her own body', min: 1 }],
    ['gesture', 'feet named as the invention tell', { s: 'Feet are the tell of an author inventing detail', min: 1 }],
    ['gesture', 'foot is neither banned nor licensed',
      { s: 'not separately banned and not separately licensed', min: 1 }],
    ['gesture', 'foot defers to REFLEX TELLS instead of restating it', { s: 'under REFLEX TELLS', min: 1 }],
    ['gesture', 'reflex-tell justifications stated once',
      { s: 'when something in the scene has just caused it, or when another person notices it as a PATTERN', min: 1 }],
    ['gesture', 'narrator does not report her own micro-movements',
      { s: 'she does not report her own micro-movements', min: 1 }],
    ['gesture', 'pattern-reading is still subject to availability',
      { s: 'Both justifications are still subject to the availability rule above', min: 1 }],

    // CLARITY MERGE — two headings became one, with every named instance and qualification kept.
    ['clarity', 'clarity floor once', { s: 'CLARITY IS THE FLOOR, AND IT IS NOT NEGOTIABLE', exp: 1 }],
    ['clarity', 'the named shape once', { s: 'THE SHAPE TO WATCH FOR', exp: 1 }],
    ['clarity', 'conclusion vs sentence kept', { s: 'letting them draw the CONCLUSION', min: 1 }],
    ['clarity', 'instance 1', { s: 'the bend his to mend', min: 1 }],
    ['clarity', 'instance 2', { s: 'the burden became his to carry', min: 1 }],
    ['clarity', 'instance 3', { s: 'the wound was hers to heal', min: 1 }],
    ['clarity', 'instance 4', { s: 'the darkness in him answered', min: 1 }],
    ['clarity', 'the earns-its-place qualification kept', { s: 'Occasionally one earns its place', min: 1 }],
    ['clarity', 'paraphrase test kept', { s: 'THE PARAPHRASE TEST', exp: 1 }],
    ['clarity', 'compression/riddles/rhyme line kept', { s: 'they are a toll charged to the reader', min: 1 }],
    ['clarity', 'doubled desire-is-ATTENTION removed', { s: 'Desire is ATTENTION', exp: 1 }],
  ];

  P('\nIN THE FRESH-SOURCE CONTINUATION REQUEST — CONSOLIDATED REQUIREMENTS:');
  let group = null, pass = 0;
  for (const [g, label, rule] of CHECKS) {
    if (g !== group) { group = g; P(`  ${g.toUpperCase()}`); }
    const c = n(rule.s);
    const ok = ('exp' in rule) ? c === rule.exp : c >= rule.min;
    if (ok) pass++; else failures.push(`${g}: ${label} — found ${c}, expected ${'exp' in rule ? rule.exp : '>=' + rule.min}`);
    P(`    ${ok ? '✓' : '✗'} ${label.padEnd(52)} ${String(c).padStart(2)}`
      + ('exp' in rule ? ` (exactly ${rule.exp})` : ` (at least ${rule.min})`));
  }
  P(`\n  ${pass}/${CHECKS.length} consolidated-requirement checks passed on the delivered request.`);
} else {
  P('\nNO CONTINUATION AUTHOR REQUEST. Doors by phase:');
  const agg = {}; doors.forEach((d) => { const k = d.phase + ' ' + d.door + (d.door === 'OTHER' ? ':' + d.role : ''); agg[k] = (agg[k] || 0) + 1; });
  Object.entries(agg).forEach(([k, v]) => P(`    ${v}x  ${k}`));
  P('\n  recent relevant logs:');
  logs.filter((l) => /FAIL|ABORT|GUARD|refus|Error|SCENE-GEN|paywall|SKELET|save|SAVE|invalid|INVALID/i.test(l))
    .slice(-18).forEach((l) => P('    ' + l.slice(0, 155)));
}
// ── FIXTURE ROUTING, STATED RATHER THAN ASSUMED ──
// Printed every run so the labelling is visible evidence, not a comment. `tokensAgree` records
// that the stable field-set signature and the max_tokens budget reached the SAME conclusion;
// a run where they diverge never gets here, because the door is aborted and recorded in faults.
P('\nBIBLE FIXTURE ROUTING (identity = required field set; max_tokens only corroborates):');
if (!bibleRouting.length) P('    no body-bible door was opened');
bibleRouting.forEach((r) => P(`    ${r.whose.toUpperCase().padEnd(5)}  hits `
  + Object.entries(r.hits).map(([k, v]) => `${k}:${v}`).join(' ')
  + `  max_tokens ${r.max_tokens}  agree=${r.tokensAgree}`));
if (faults.length) {
  P('\nUNRESOLVED DOORS (aborted rather than answered with a guess):');
  faults.forEach((f) => P('    ' + JSON.stringify(f)));
  failures.push(`${faults.length} unresolved fixture door(s)`);
}
if (!caps.length) failures.push('no continuation author request was captured');

P('\n  written: ' + OUT);
if (failures.length) {
  P('\n  ' + failures.length + ' FAILURE(S):');
  failures.forEach((f) => P('    ✗ ' + f));
  process.exitCode = 1;
} else {
  P('\n  ALL CHECKS PASSED. Nothing was dispatched to a provider.');
}
