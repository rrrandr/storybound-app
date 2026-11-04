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

// Control mode writes to its OWN directory: both modes clear their output at startup, so running
// them concurrently had the ordinary run's rmSync delete the control run's captures mid-flight
// (seen as an ENOENT on a file the control had just written).
// UNIQUE PER RUN. Separate ordinary/control directories still let a later run of the same mode
// delete an earlier run's captures, which is how a control run lost files it had just written.
// A run id makes every run's artifacts immutable once written; LATEST is a convenience pointer.
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-') + '_' + process.pid;
const OUT_ROOT = '/Users/romantsukerman/storybound-app/'
  + (process.env.NF_CG === '1' ? '_nf_cg_delivery_out'
    : process.env.NF_SCAFFOLD_V2 === '1' ? '_nf_scaffold_control_out' : '_nf_fresh_continuation_out');
const OUT = OUT_ROOT + '/run_' + RUN_ID;
fs.mkdirSync(OUT, { recursive: true });
try {
  const latest = OUT_ROOT + '/LATEST';
  try { fs.unlinkSync(latest); } catch (_) {}
  fs.symlinkSync(OUT, latest, 'dir');
} catch (_) {}

// ── STALE-PREFIX vs CURRENT-PLAN CONTROL (NF_SCAFFOLD_V2=1) ──
// In control mode the scaffold door answers with V1-marked values, production saves a prefix
// carrying V1, and after the resume the plan is replaced with V2 before the turn is submitted.
// The question is whether suppression discards the CURRENT plan just because a scaffold heading
// already exists in the frozen prefix. Off by default, so the ordinary run is unchanged.
const CTRL = process.env.NF_SCAFFOLD_V2 === '1';
// ── ORDINARY CG MODE (NF_CG=1) ──
// Launches through handleBeginGraphicNovel — the production entry the corridor's
// #beginGraphicNovelBtn invokes (app.js:179323 / 181797) — instead of the baked OAS showcase,
// which is the only staged STARTER and routes its first turn into the intimacy dialogue. Reuses
// this harness's whole fixture chain so the doors are already answered correctly.
const CG = process.env.NF_CG === '1';
const SEEDED = process.env.NF_SEEDED === '1';
// ── LATER CONTINUATION (NF_LATER=1) ──
// Drives TWO turns on the fresh story: the first is answered so the scene completes, the second
// is captured. Verifies that a later scene — not just the first continuation — receives the
// corrected instructions, which an exact-text transform's failure to match can never show.
const LATER = process.env.NF_LATER === '1';
let firstContinuationAnswered = 0, laterArmed = false;
const TAG = CTRL ? 'V1 ' : '';
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


// ── SHAPE-FAITHFUL PC-BODY-BIBLE FIXTURE (test data, clearly labelled) ────────────────────
// The production consumer is _generatePCBodyBibleUncached: it dispatches
// _callTieredProvider('pcBodyBible', …) and reads `data.content` as a JSON STRING, then parses
// the fields below. This fixture returns exactly that envelope and exactly those fields, so the
// reply travels the REAL creation → merge → persistence path. Nothing is planted into state and
// no completion flag is forced.
//
// EVERY VALUE BELOW IS INVENTED TEST DATA. It is not canon, not a player choice and not a
// model's portrait; it exists only to prove the wiring carries individual appearance through.
const PC_BIBLE_FIXTURE = {
  age: '31', ancestry: '',
  height: '[FIXTURE] a little above average height',
  build: '[FIXTURE] narrow-shouldered, long through the forearms',
  hair: '[FIXTURE] dark coral, coarse and heavy, worn twisted up off the neck for work',
  complexion: '[FIXTURE] deep teal with a colder cast along the jaw',
  face: '[FIXTURE] a long, serious face that reads older in profile than head-on',
  signature_feature: '[FIXTURE] the flat of her left hand, burn-marked pale from years of kiln work',
  visual_anchor: { focus: 'the hands', detail: '[FIXTURE] she keeps them half-closed when she is not using them' },
  second_celebrated_feature: '[FIXTURE] a low, unhurried voice that does not rise when she is contradicted',
  stress_tic: '[FIXTURE] turns a ring once around her finger',
  desire_tell: '[FIXTURE] goes still instead of leaning in',
  impatience_tell: '[FIXTURE] answers the question before it finishes',
  confidence_tell: '[FIXTURE] sets both hands flat and waits',
  vulnerability_tell: '[FIXTURE] looks at her own hands',
  emotional_weather: '[FIXTURE] contained, with the weather showing late',
};
const isPcBibleRequest = (both) => /"signature_feature": "<the ONE thing worth celebrating/.test(both)
  || /PC BODY BIBLE/i.test(both) && /"complexion":/.test(both);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const caps = [], doors = [], logs = [], faults = [], bibleRouting = [], failures = [], calls = [];
let PHASE = 'OPENING';
// Which continuation turn a call belongs to. Without this, turn 1's calls and turn 2's calls
// both read as 'CONTINUATION' and a per-continuation cost cannot be derived from the inventory.
let TURN_NO = 0;
const STATIC = /\/api\/(geo|csp-report|beta-events|bug-report-awards)\b/;
const IMAGE = /\/api\/(image|bfl-kontext|visualize-flux|grok-image|dashscope-image|img-proxy|cine-styled-manifest|mouth-approve|verify-anatomy)\b/;
const imageCalls = [];
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
  // ── IMAGE PROVIDERS ARE BLOCKED, NOT FORWARDED ──
  // CG is image-heavy. These are answered locally with a 1x1 data URL so the render can proceed
  // without any image-provider call leaving the browser, and every such call is recorded.
  if (IMAGE.test(url)) {
    imageCalls.push({ phase: PHASE, url });
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
        images: [{ url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==' }] }) });
  }
  const k = Object.keys(LOCAL).find((x) => url.startsWith(x));
  if (k) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LOCAL[k]) });
  let b = null; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
  const msgs = (b && b.messages) || [];
  const sys = String((msgs.find((m) => m.role === 'system') || {}).content || '');
  const usr = String((msgs.find((m) => m.role === 'user') || {}).content || '');
  const role = String((b && b.role) || '?');
  const both = sys + usr;
  // The author door is identified by the prompt's own content, never by a role label: the
  // opening prose call arrives as role=STRUCTURE_GENERATOR without author:true.
  const isAuthorRequestShape = (b && b.author === true)
    || /THIS IS THE LAST PROSE IN THE SCENE|YOU ARE WRITING AS S\. TORY BOUND|STORYBOUND ARCHITECTURE LAWS/i.test(both);
  // ── COST INVENTORY: EVERY MODEL-ROUTE REQUEST, WITH ITS REAL PAYLOAD ──
  // Priced later by the harness's own estimateUsd (chars + max_tokens + model), not by call
  // counts: 34 opening calls versus 10 continuation calls says nothing about relative cost,
  // because the payloads differ by an order of magnitude. `answered` separates a call that
  // completed normally from one this harness deliberately ABORTS to capture it — an abort makes
  // production retry across provider tiers, so those extra attempts are capture-induced and must
  // not be billed to a normal run.
  const callRec = { phase: PHASE, turn: TURN_NO, role, url, chars: both.length,
    sys: sys.length, usr: usr.length,
    max_tokens: (b && b.max_tokens) || null, model: (b && b.model) || null,
    author: !!isAuthorRequestShape, answered: false, door: null };
  calls.push(callRec);
  const give = (payload, door) => { doors.push({ phase: PHASE, door, role, answered: true });
    callRec.answered = true; callRec.door = door;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envelope(url, b, payload)) }); };

  if (isPcBibleRequest(both)) {
    return give(JSON.stringify(PC_BIBLE_FIXTURE), 'PC_BODY_BIBLE(shape-faithful FIXTURE)', 'gpt-4o-mini');
  }
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

  if (isAuthorRequestShape && both.length > 40000) {
    if (PHASE === 'OPENING') {
      // ANSWERED so Scene 1 completes and PRODUCTION saves the story itself.
      doors.push({ phase: PHASE, door: 'AUTHOR(answered to let production save)', role, answered: true });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envelope(url, b, PROSE)) });
    }
    // ── LATER-CONTINUATION MODE (NF_LATER=1) ──
    // A no-match on the preserved save proves nothing about later scenes, so this answers the
    // FIRST continuation's author instead of capturing it, letting the turn complete and
    // turnCount advance. The SECOND continuation is the one captured, and the scope assertions
    // then run against a genuinely later scene of the fresh, current-source story.
    if (LATER && PHASE === 'CONTINUATION' && !laterArmed) {
      firstContinuationAnswered++;
      // ONE call per turn when it is ANSWERED: a captured-and-aborted request makes production
      // retry across all three provider tiers, which is why earlier runs showed three. Arming
      // after the first answered call means the SECOND turn is the one captured.
      laterArmed = true;
      doors.push({ phase: PHASE, door: 'AUTHOR(answered to advance to a later scene)', role, answered: true });
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify(envelope(url, b, PROSE)) });
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
  // ── THE CG SCREENPLAY DOOR: THE DELIVERY THIS MODE EXISTS TO CAPTURE ──
  // app.js:242586's system prompt opens "You are a screenplay-native cinematic-romance writer",
  // built by _buildCGScreenplaySystemPrompt and dispatched from _runCGScreenplayGen
  // (app.js:252309) during a staged scene advance. Captured and ABORTED — this is the outgoing
  // request, not a builder render.
  if (/screenplay-native cinematic-romance writer/.test(both)) {
    const name = `cg_screenplay_request__${role}__${caps.length + 1}.txt`;
    fs.writeFileSync(OUT + '/' + name,
      `=== ORDINARY CG SCREENPLAY REQUEST (captured at the transport, aborted)\n`
      + `=== role=${role} model=${b && b.model} url=${url}\n\n`
      + `=== SYSTEM (${sys.length} chars) ===\n${sys}\n\n=== USER (${usr.length} chars) ===\n${usr}\n`);
    caps.push({ role, sys: sys.length, usr: usr.length, file: name, kind: 'CG_SCREENPLAY' });
    doors.push({ phase: PHASE, door: 'CG_SCREENPLAY(captured)', role, answered: false });
    return route.abort();
  }

  // ── THE FATE-CARD DOOR, IN ITS OWN DELIMITER FORMAT ──
  // generateFatePreviewsBatch does NOT parse JSON: app.js:324076 splits the reply by line and by
  // '|||', taking the card label then action then dialogue for the five cards at app.js:324050.
  // Blocking it produced "[FATE:BATCH] Failed … UNDECLARED_MODEL_ROLE" and stalled the turn.
  if (/\|\|\|/.test(both) && /temptation|boundary|confession|reversal|silence/i.test(both)) {
    return give([
      'temptation|||she lets the silence run one beat too long|||"Say that again."',
      'boundary|||she puts the glass down between them|||"Not here."',
      'confession|||she admits she read the message|||"I saw it before you did."',
      'reversal|||she asks him the question he was about to ask|||"Why did you stay?"',
      'silence|||she answers nothing and holds his look|||""',
    ].join('\n'), 'FATE_BATCH');
  }

  // ── THE STORY-SCAFFOLD DOOR, ANSWERED WITH A POPULATED FIXTURE ──
  // app.js:239234 _buildCGScaffold asks a CONTINUITY ARCHITECT for the run's gravity and the
  // per-issue plan, then app.js:240597 stores the parsed result on state.cgScaffold and
  // _renderCGScaffoldBlock renders it. Answering HERE means production does the parsing, the
  // storing and the rendering — the same transport-boundary interception every other door in
  // this harness uses. Nothing is written onto application state by hand, which is why an
  // earlier attempt to set state.cgScaffold directly was simply overwritten by this generator.
  // The values are distinctive strings so the checks can assert that each one REACHES the
  // outgoing request, rather than only that nothing is duplicated.
  if (/CONTINUITY ARCHITECT for a serialized/.test(both)) {
    return give(JSON.stringify({
      runThesis: CTRL ? 'V1 she STAYS in the room and makes the room answer for it'
        : 'a woman who keeps choosing the room she was humiliated in',
      thematicDirection: CTRL ? 'V1 the story resolves INSIDE this venue; she never leaves it'
        : 'exposure stops being done to her and becomes something she does',
      visualThesis: 'screens and glass give way to paper and hands',
      worldPhysics: 'reputation moves faster than correction',
      hiddenPressure: 'who sent the photographs, never resolved on the page',
      socialGeometry: 'public rooms are safer for her than private ones',
      permittedAnomalyStyle: 'coincidence is allowed once and never explained',
      issueArcs: [
        { issueLabel: 'Issue 1 — opening orbit',
          thesis: 'she stays in the room and makes the room answer for it',
          ambiguityTargets: ['who benefited from the leak', 'whether Julian knew'],
          pressureVectors: ['the guest list narrowing', 'her own silence becoming a position'] },
        { issueLabel: 'Issue 2 — the correction',
          thesis: 'the correction costs more than the exposure did',
          ambiguityTargets: ['what she traded for the retraction'],
          pressureVectors: ['favours called in'] },
      ],
    }), 'STORY_SCAFFOLD');
  }
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
await page.evaluate(({ pc, li, cg, seeded }) => {
  const S = window.state;
  Object.assign(S, {
    // In SEEDED mode the world must match the authored seed. An earlier run set a Modern story's
    // picks and then activated the Fatelands seed by key, so Lirael (seed PC) and Nadia (fixture
    // PC) arrived in the same request with both worlds present — that verifies a receiving path,
    // not a representative story.
    ...(seeded
      ? { world: 'Fantasy', worldSubtype: 'the_veilwood', flavor: 'Fatelands', dynamic: 'SHARED_HISTORY',
          _starterSeedId: 'starter_first_sacrifice', _starterId: 'starter_first_sacrifice' }
      : { world: 'Modern', worldSubtype: 'small_town', flavor: 'Billionaire', dynamic: 'Enemies' }),
    archetype: { primary: 'BEAUTIFUL_RUIN', modifier: null },
    name: pc, playerName: pc, loveInterestName: li, partnerName: li,
    loveInterest: 'Male', liGender: 'male', playerMask: 'OPEN_VEIN', pov: 'first_person',
    storyLength: 'taste', tier: 'novella', access: 'sub', subscribed: true, fortunes: 9999999,
    intensity: 'Steamy', identity: { playerName: pc, partnerName: li },
    // In CG mode the pre-launch state stays LITERARY: handleBeginGraphicNovel sets
    // currentEngine='graphic' and renderMode='staged_story_mode' itself (app.js:181816), and a
    // guard asserts the literary engine on the way in — presetting graphic tripped it with
    // "[GN:GUARD] Engine mismatch — expected: literary actual: graphic" and no door ever opened.
    renderMode: 'literary', currentEngine: 'literary', storyModality: 'literary',
    turnCount: 0, _skipCorridorValidation: true, storypassEligible: true,
  });
  S.picks = { world: S.world, worldSubtype: S.worldSubtype, flavor: S.flavor, dynamic: S.dynamic,
              tone: 'Earnest', pov: 'First', length: 'taste', identity: S.identity };
}, { pc: SEEDED ? 'Lirael' : PC, li: LI, cg: CG, seeded: SEEDED });

// ── SEEDED CG (NF_CG=1 NF_SEEDED=1) ──
// The restriction caveat is driven by the ACTIVE SEED's cast: _apprSourcesFor reads
// `(seed && seed.cast)` and then `entry.cPlusForbiddenImplications` (app.js:282595/282698). A
// fresh Modern story has no seed, so zero appearance rows and no caveat is CORRECT there and
// proves nothing about the delivery condition. The First Sacrifice starter's cast carries real
// cPlusForbiddenImplications (app.js:136941/136989/137164), so launching that starter through
// production's own _launchStarterStory activates the seed and exercises the condition.
if (CG && process.env.NF_SEEDED === '1') {
  const seeded = await page.evaluate(async () => {
    // _activeSeed is a FUNCTION of state (app.js:282593 calls _activeSeed(st)), and production
    // resolves the seed by key from state (app.js:230959: STARTER_SEEDS[state._starterSeedId]).
    // Reading window._activeSeed as a value returned a function, whose .cast is undefined — which
    // is why an earlier run reported castCount 0 and looked like a seed without restrictions.
    const S = window.state;
    S._starterSeedId = 'starter_first_sacrifice';
    S._starterId = S._starterId || 'starter_first_sacrifice';
    const seed = (typeof window._activeSeed === 'function') ? window._activeSeed(S) : null;
    const cast = (seed && seed.cast) || [];
    return { ok: true, seedPresent: !!seed, castCount: cast.length,
      withRestrictions: cast.filter((c) => c && (c.cPlusForbiddenImplications || c.forbidden)).length,
      seedKeys: Object.keys(window.STARTER_SEEDS || {}) };
  });
  console.log('SEEDED CG LAUNCH: ' + JSON.stringify(seeded));
  if (!seeded.ok) failures.push('seeded CG launch failed: ' + seeded.why);
  else if (!seeded.withRestrictions) failures.push('the active seed carries no cast restrictions — '
    + 'the caveat condition cannot be exercised by this fixture');
}
try { await Promise.race([page.evaluate((cg) => (cg && typeof window.handleBeginGraphicNovel === 'function')
                            ? window.handleBeginGraphicNovel() : window.handleBeginStory(), CG),
                          new Promise((r) => setTimeout(r, 240000))]); } catch (_) {}

// ── DRIVE THE DOCUMENTED CG PIPELINE ──
// app.js:179324 states the contract: handleBeginGraphicNovel() → #gnStyleSelector → #gnCoverView
// → #gnReader, and app.js:179333 that currentEngine ('graphic') is the ONLY field routing it.
// An earlier attempt clicked whatever buttons happened to be visible and found an identity/auth
// screen; this follows the declared screens instead, selecting the FIRST offered style card
// (app.js:182050 binds '#gnStyleSelector .gn-selector-card') as a normal fixture option.
if (CG) {
  const screenState = () => page.evaluate(() => {
    const vis = (id) => { const el = document.getElementById(id); return !!(el && el.getClientRects().length > 0); };
    return { engine: (window.state || {}).currentEngine, renderMode: (window.state || {}).renderMode,
      styleSel: vis('gnStyleSelector'), coverView: vis('gnCoverView'), reader: vis('gnReader'),
      authGate: vis('btn-auth-submit'),
      styleCards: document.querySelectorAll('#gnStyleSelector .gn-selector-card').length };
  });
  console.log('  [CG-SCREENS] after entry: ' + JSON.stringify(await screenState()));
  // The style selector mounts asynchronously: immediately after the entry it reported
  // styleSel:false with four cards already in the DOM, and was visible one step later. Waiting
  // for the declared screen rather than sampling once.
  try {
    await page.waitForFunction(() => {
      const el = document.getElementById('gnStyleSelector');
      return !!(el && el.getClientRects().length > 0
        && document.querySelector('#gnStyleSelector .gn-selector-card'));
    }, null, { timeout: 60000 });
    console.log('  [CG-SCREENS] #gnStyleSelector is up');
  } catch (_) { console.log('  [CG-SCREENS] #gnStyleSelector never became visible'); }
  for (let step = 1; step <= 8; step++) {
    if (caps.some((c) => c.kind === 'CG_SCREENPLAY')) break;
    const did = await page.evaluate(() => {
      const vis = (el) => !!(el && el.getClientRects().length > 0);
      // ── THE PC LOOK MODAL IS THE INPUT THE PIPELINE WAITS ON ──
      // The trace named it exactly: "[CG:SCREENPLAY] PC Look modal opened — waiting for user".
      // Until it is answered, _runCGScreenplayGen never dispatches, which is why the reader
      // mounted empty and no model door opened. Answered with a normal fixture description and
      // the modal's own Skip control as a fallback (app.js:52280-52281).
      // Skip opens a CONFIRMATION first (_confirmSkipRender → #skipRenderWarnModal), so the
      // confirm has to be answered before the PC Look modal closes. Clicking Skip repeatedly
      // without it just re-opened the same warning. "Skip anyway" keeps this a no-render fixture.
      const warn = document.querySelector('#skipRenderWarnModal [data-act="skip"]');
      if (vis(warn)) { warn.click(); return 'pc-look:skip-confirmed'; }
      const lookGen = document.getElementById('pcLookGenerateBtn');
      const lookSkip = document.getElementById('pcLookSkipBtn');
      if (vis(lookGen) || vis(lookSkip)) {
        const ta = document.getElementById('pcLookInput');
        if (ta) { ta.value = 'dark hair pinned up, clay under the nails, a crooked eyetooth';
          ta.dispatchEvent(new Event('input', { bubbles: true })); }
        if (vis(lookSkip)) { lookSkip.click(); return 'pc-look:skip'; }
        lookGen.click(); return 'pc-look:generate';
      }
      const card = [...document.querySelectorAll('#gnStyleSelector .gn-selector-card')].filter(vis)[0];
      if (card) { card.click(); return 'style-card'; }
      const inCover = document.getElementById('gnCoverView');
      if (vis(inCover)) {
        // The cover's control is #gnBeginReading, labelled "Open" — read off the DOM, since a
        // begin/read/start/continue/enter text filter does not match it.
        const go = (vis(document.getElementById('gnBeginReading')) && document.getElementById('gnBeginReading'))
          || [...inCover.querySelectorAll('button')].filter(vis)
            .find((b) => /begin|read|start|continue|enter|open/i.test((b.textContent || '')));
        if (go) { go.click(); return 'cover:' + (go.textContent || '').trim().slice(0, 24); }
      }
      const rd = document.getElementById('gnReader');
      if (vis(rd)) {
        const btn = document.getElementById('submitBtn');
        if (vis(btn)) { const a = document.getElementById('actionInput');
          if (a) a.value = 'she turns to face him'; btn.disabled = false; btn.click(); return 'reader-submit'; }
        // The GN reader has its own controls; report them rather than assuming #submitBtn.
        const rinv = [...rd.querySelectorAll('button,[role="button"],input,textarea')].filter(vis)
          .slice(0, 16).map((b) => (b.id ? '#' + b.id : '') + (b.className ? '.' + String(b.className).split(' ')[0] : '')
            + '«' + (b.textContent || b.placeholder || '').trim().slice(0, 18) + '»');
        return 'READER ' + JSON.stringify(rinv);
      }
      // Nothing matched: report what IS on the current declared screen so the next step is read
      // off the real DOM instead of guessed.
      const host = vis(document.getElementById('gnCoverView')) ? document.getElementById('gnCoverView')
        : vis(document.getElementById('gnReader')) ? document.getElementById('gnReader') : document.body;
      const inv = [...host.querySelectorAll('button,[role="button"],a[href="#"],input[type="submit"]')]
        .filter(vis).slice(0, 14).map((b) => (b.id ? '#' + b.id : '') + (b.className ? '.' + String(b.className).split(' ')[0] : '')
          + '«' + (b.textContent || '').trim().slice(0, 20) + '»');
      return 'NONE ' + JSON.stringify(inv);
    });
    console.log('  [CG-STEP ' + step + '] ' + (did || 'no declared control available')
      + '  screens=' + JSON.stringify(await screenState()));
    if (!did || String(did).startsWith('NONE')) break;
    // A bare reader with no controls is expected until the PC Look modal is answered; keep going.
    await page.waitForTimeout(10000);
  }
  const cgCap = caps.filter((c) => c.kind === 'CG_SCREENPLAY');
  console.log('  [CG] screenplay requests captured: ' + cgCap.length
    + '   image-provider calls blocked locally: ' + imageCalls.length);
  cgCap.forEach((c) => console.log('      ' + c.file + '  sys ' + c.sys + ' + usr ' + c.usr));
}

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
  // ── CONTROL: the prefix now holds V1; make the CURRENT plan V2 ──
  // Installed through production's own authoritative home for the spine (app.js:69733 assigns
  // st.cgScaffold from an adopted handoff), after the resume has finished restoring state. This
  // is the divergence the suppression has to survive: same heading, different plan.
  if (CTRL) {
    const ctl = await page.evaluate(() => {
      const S = window.state;
      // INCOMPATIBLE WITH V1, not a reworded version of it. V1 says she stays inside the venue
      // and the story resolves there; V2 says she leaves before the room finishes looking and the
      // venue is never returned to. Both cannot be current requirements, so an outgoing request
      // that presents them as equally in force is a defect the sentinel-value version could not
      // detect.
      const v2 = {
        runThesis: 'V2 she LEAVES before the room finishes looking and never returns to the venue',
        thematicDirection: 'V2 the story resolves ANYWHERE BUT this venue; the room is abandoned in scene two',
        worldPhysics: 'V2 a correction outruns the rumour exactly once',
        hiddenPressure: 'V2 who kept the second copy, never resolved',
        issueArcs: [{ issueLabel: 'Issue 1', thesis: 'V2 she refuses the room and the room loses its hold',
          ambiguityTargets: ['V2 what she traded for the retraction'] }],
      };
      try { S.cgScaffold = v2; } catch (_) {}
      const sp = String(S.sysPrompt || '');
      return { currentIsV2: String((S.cgScaffold || {}).runThesis || '').indexOf('V2 ') === 0,
        prefixHasV1: sp.indexOf('V1 she STAYS in the room') !== -1,
        prefixHasV2: sp.indexOf('V2 she LEAVES before the room') !== -1 };
    });
    console.log('CONTROL — stale prefix vs current plan: ' + JSON.stringify(ctl));
    if (!ctl.prefixHasV1) failures.push('control: the saved prefix does not carry V1');
    if (!ctl.currentIsV2) failures.push('control: V2 is not the current plan');
  }
  if (resumed && resumed.ok && resumed.hasSubmit) {
    TURN_NO = 1;
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
    // ── SECOND TURN, so the captured request belongs to a LATER scene ──
    if (LATER) {
      TURN_NO = 2;
      const second = await page.evaluate(async () => {
        const S = window.state;
        S.subscribed = true; S.tier = 'novella'; S.access = 'sub'; S.fortunes = 9999999;
        S.storypassEligible = true; window._forceDeckMandate = false;
        const before = S.turnCount;
        const btn = document.getElementById('submitBtn');
        if (!btn || !btn.getClientRects().length) return { ok: false, why: 'no submit control', before };
        const a = document.getElementById('actionInput'); if (a) a.value = 'she asks him the question she has been saving';
        btn.disabled = false; btn.click();
        await new Promise((r) => setTimeout(r, 180000));
        return { ok: true, before, after: window.state.turnCount };
      });
      console.log('LATER-SCENE TURN: ' + JSON.stringify(second));
      if (!second.ok) failures.push('later-scene turn not submitted: ' + second.why);
      // turnCount CANNOT advance here: the later turn's author request is captured and aborted,
      // so the turn never completes. What establishes "later scene" is that the FIRST turn did
      // complete — turnCount was already >= 1 when this submit was made.
      else if (!(second.before >= 1)) {
        failures.push(`the first continuation did not complete (turnCount ${second.before}), so the `
          + 'captured request is not a later scene');
      }
    }
  }
}
await browser.close();
fs.writeFileSync(OUT + '/COST_INVENTORY.json', JSON.stringify(calls, null, 2));
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

    // ── C+ REGIONS: ONE COPY EACH, COMPLETE ──
    // Per-path ownership replaced three emitters of the same teaching spine. Each region is
    // asserted BY ITS CONTENT as well as its heading, because a region carrying extra
    // scene-specific material is not interchangeable with a generic copy: if ownership ever
    // resolves to the wrong emitter, the heading count stays right while the content goes
    // missing, and only these content assertions would catch it.
    ['cplus', 'spine: WHO GETS CHARACTER+ once', { s: '═══ WHO GETS CHARACTER+', exp: 1 }],
    ['cplus', 'spine: not-a-love-interest-feature kept', { s: 'This is NOT a love-interest feature', min: 1 }],
    ['cplus', 'spine: EMOTIONAL PHYSICS once', { s: '═══ EMOTIONAL PHYSICS: REACTIONS HAVE CAUSES ═══', exp: 1 }],
    ['cplus', 'spine: its three ✓ exemplars kept', { s: 'His hand tightened around the glass because he', min: 1 }],
    ['cplus', 'spine: gesture-is-never-the-point kept', { s: 'The gesture is never the point', min: 1 }],
    ['cplus', 'spine: REFLEX TELLS once', { s: 'REFLEX TELLS (a hand tightening', exp: 1 }],
    ['cplus', 'spine: its ✗/✓ heel pair kept', { s: 'My heel lifted once from the packed earth', min: 1 }],
    ['cplus', 'spine: OBJECT TELLS kept', { s: 'OBJECT TELLS (a ring, a scar, a weapon, a coat)', min: 1 }],
    ['cplus', 'spine: WHEN IT FIRES AGAIN once', { s: 'WHEN IT FIRES AGAIN (not every mention', exp: 1 }],
    ['cplus', 'spine: RECURRENCE BUDGET kept', { s: 'RECURRENCE BUDGET', min: 1 }],
    ['cplus', 'spine: NEVER RESTATE AN INSIGHT kept', { s: 'NEVER RESTATE AN INSIGHT — BUT DO RETURN TO ONE', min: 1 }],
    ['cplus', 'povLens: BEHAVIORAL DEMONSTRATION once', { s: '═══ BEHAVIORAL DEMONSTRATION (HARDEST', exp: 1 }],
    ['cplus', 'povLens: the brutal test kept', { s: 'The brutal test: did the archetype DO SOMETHING', min: 1 }],
    ['cplus', 'povLens: no-live-interaction qualification kept',
      { s: 'archetype manifestation does NOT require live present-time interaction', min: 1 }],
    ['cplus', 'visFloor: CHARACTER VISIBILITY once',
      { s: 'CHARACTER VISIBILITY (HARD): EVERY named character', exp: 1 }],
    ['cplus', 'visFloor: WHAT COUNTS kept', { s: 'WHAT COUNTS (HARD): within 1–2 sentences', min: 1 }],
    ['cplus', 'visFloor: PC OWNS HER BODY kept', { s: 'PC OWNS HER BODY', min: 1 }],
    ['cplus', 'visFloor: GOLD STANDARD exemplar kept',
      { s: 'GOLD STANDARD = relational + physical together', min: 1 }],

    // ── CONTINUATION SCOPE: OPENING-ONLY OUT, ENDURING TEACHING IN ──
    // Each of these was judged by what the section REQUIRES, not by whether it says "Scene 1".
    // The enduring half is asserted present; the opening-scoped half is asserted gone. If the
    // re-scope ever over-reaches, the "kept" rows fail — which is the direction that matters.
    ...(LATER ? [['scope', 'the Scene-1 contract block is absent on a later scene',
      { s: 'SCENE 1 OPENING CONTRACT', exp: 0 }]] : []),
    ['scope', 'opening hook timing removed',
      { s: 'Within the first 150–200 words, the protagonist must FACE A DECISION', exp: 0 }],
    ['scope', 'the decision requirement itself is KEPT',
      { s: 'the protagonist must FACE A DECISION (not merely feel tension)', min: 1 }],
    ['scope', 'DECISION QUALITY floor KEPT', { s: 'DECISION QUALITY (stakes floor — HARD)', min: 1 }],
    ['scope', 'risk-of-loss criterion KEPT', { s: 'RISK OF LOSS (relational, reputational, material, physical)', min: 1 }],
    ['scope', 'irreversibility criterion KEPT', { s: 'IRREVERSIBLE CONSEQUENCE', min: 1 }],
    ['scope', 'DECISION VISIBILITY KEPT', { s: 'DECISION VISIBILITY (HARD)', min: 1 }],
    ['scope', 'opening beat-order passage removed',
      { s: 'CORRECT PATTERN — what Scene 1 should sound like', exp: 0 }],
    ['scope', 'its "plot enters AFTERWARD" instruction removed',
      { s: 'The plot enters AFTERWARD', exp: 0 }],
    ['scope', 'the ANTI-PATTERN failure shape KEPT',
      { s: 'ANTI-PATTERN — the observed failure shape', min: 1 }],
    ['scope', 'the reader question KEPT', { s: 'What is going to happen with THEM?', min: 1 }],
    ['scope', 'its NOT-form KEPT', { s: 'What is going to happen with the trust', min: 1 }],
    ['scope', 'reader-question heading re-scoped',
      { s: 'THE QUESTION THE READER MUST KEEP ASKING:', min: 1 }],
    ['scope', 'old opening-deliverable heading gone',
      { s: 'BY END OF SCENE 1 THE READER SHOULD BE WONDERING', exp: 0 }],
    ['scope', 'reality consistency KEPT in full',
      { s: 'Respect real-world constraints: weight, strength, timing, spatial geometry', min: 1 }],
    ['scope', 'its implausible-action rule KEPT',
      { s: 'rewrite it realistically rather than asking the reader to suspend disbelief', min: 1 }],
    ['scope', 'reality-consistency heading re-scoped', { s: 'REALITY CONSISTENCY (HARD):', min: 1 }],
    ['scope', 'its false Scene-1 scope gone', { s: 'REALITY CONSISTENCY (SCENE 1 — HARD)', exp: 0 }],
    ['scope', 'world-specificity invariant KEPT', { s: 'GENERIC FAILURE RULE (GLOBAL INVARIANT', min: 1 }],
    ['scope', 'its test re-scoped to this scene', { s: 'If this scene could exist UNCHANGED', min: 1 }],

    // ── SCAFFOLD: WHAT SUPPRESSING THE TAIL COPY MUST NOT COST ──
    // Checking "one header and one END marker" only proved the orphan was gone, not that the
    // scaffold's CONTENT survived. These assert the fields the author actually needs from it:
    // the run's gravity, the per-issue plan, and the world-behaviour rules. Each is checked for
    // presence AND for being delivered once, so neither the suppression nor the stale-needle fix
    // can quietly take the plan with it. A scaffold with no populated fields renders nothing at
    // all now, so an empty-scaffold fixture legitimately reports 0 — which is why the harness
    // reports the count rather than demanding one blindly.
    ['scaffold', 'banner count', { s: '═══ STORY SCAFFOLD', max: CTRL ? 2 : 1 }],
    ['scaffold', 'END marker count', { s: '═══ END SCAFFOLD ═══', max: CTRL ? 2 : 1 }],
    // In control mode a second scaffold block is required, and each keeps its own authority
    // instruction — that is the structural-boundary fix, not duplication.
    ['scaffold', 'authority sentence count',
      { s: 'SCAFFOLD AUTHORITY: GRAVITATIONAL, NOT PRESCRIPTIVE', max: CTRL ? 2 : 1 }],
    // POSITIVE PRESERVATION, BY VALUE. "At most once" is only a duplication check and passes
    // when everything is lost, so every populated field is asserted to arrive EXACTLY once: its
    // actual value must reach the outgoing request (preservation) and must not be repeated
    // (the tail copy really was suppressed). The scaffold is supplied through the production
    // _buildCGScaffold door above, so these values travelled the real parse/store/render path.
    ...(CTRL ? [] : [['scaffold', 'run thesis value reaches the request',
      { s: 'keeps choosing the room she was humiliated in', exp: 1 }]]),
    ...(CTRL ? [] : [['scaffold', 'thematic direction value reaches the request',
      { s: 'exposure stops being done to her and becomes something she does', exp: 1 }]]),
    ['scaffold', 'visual thesis value reaches the request',
      { s: 'screens and glass give way to paper and hands', exp: 1 }],
    ['scaffold', 'world physics value reaches the request',
      { s: 'reputation moves faster than correction', exp: 1 }],
    ['scaffold', 'hidden pressure value reaches the request',
      { s: 'who sent the photographs, never resolved on the page', exp: 1 }],
    ['scaffold', 'social geometry value reaches the request',
      { s: 'public rooms are safer for her than private ones', exp: 1 }],
    ['scaffold', 'issue 1 plan reaches the request',
      { s: 'she stays in the room and makes the room answer for it', exp: 1 }],
    ['scaffold', 'issue 1 ambiguity target reaches the request', { s: 'whether Julian knew', exp: 1 }],
    ['scaffold', 'issue 2 plan reaches the request',
      { s: 'the correction costs more than the exposure did', exp: 1 }],
    ['scaffold', 'issue 2 ambiguity target reaches the request',
      { s: 'what she traded for the retraction', min: 1 }],
    ['scaffold', 'ISSUE ARCS header count', { s: 'ISSUE ARCS:', max: CTRL ? 2 : 1 }],
    ['scaffold', 'WORLD BEHAVIOR rules count',
      { s: 'WORLD BEHAVIOR (ambient rules shaping how characters feel + act', max: CTRL ? 2 : 1 }],
    ['scaffold', 'no banner without its authority sentence', { pairedWith: true }],

    // ── THE COGNITIVE-INTERFERENCE LADDER: COMMON TEACHING ONCE, QUALIFICATIONS IN PLACE ──
    // The offstage doctrine and the Scene-1 contract shared LEVEL 1/2/3 and THE TEST verbatim;
    // the ON-STAGE callback doctrine has its own exemplars and its own TEST and is NOT a copy.
    // So the shared five are asserted ONCE, the on-stage set is asserted as still present and
    // distinct, and each scope-specific qualification is asserted against the circumstance it
    // belongs to — a saving that detached a qualification from its scope would pass a count check
    // and fail these.
    ['ladder', 'shared rung LEVEL 1 delivered once',
      { s: '✗ LEVEL 1 — EXPOSITION: "He was attentive."', exp: 1 }],
    ['ladder', 'shared rung LEVEL 2 delivered once',
      { s: '⚠ LEVEL 2 — NEUTRAL MICRO-SCENE: "I remembered how kind he was to the waiter."', exp: 1 }],
    ['ladder', 'shared rung LEVEL 3 delivered once',
      { s: '✓ LEVEL 3 — ATTRACTION-PRESENT: "I remembered the way he', exp: 1 }],
    ['ladder', 'shared THE TEST delivered once',
      { s: 'THE TEST: read your remembered moment.', exp: 1 }],
    ['ladder', 'the offstage site cross-references instead of repeating',
      { s: 'LEVELS 1–3 of the ladder are stated once earlier in this prompt', min: 1 }],
    ['ladder', 'and points at the same TEST', { s: 'THE TEST is the one stated with the ladder above.', min: 1 }],
    // SCOPE-SPECIFIC MATERIAL — each must survive, attached to its own circumstance.
    ['ladder', 'offstage: memory LEVEL 4 variant for SHARED_HISTORY',
      { s: 'LEVEL 4 — COGNITIVE INTERFERENCE (memory variant — for SHARED_HISTORY)', min: 1 }],
    ['ladder', 'offstage: stranger variant for COLLISION / LOOMING_PRESENCE',
      { s: 'STRANGER-COMPATIBLE VARIANT', min: 1 }],
    ['ladder', 'offstage: the fake-history failure mode named',
      { s: 'Level-4-by-fake-history failure mode', min: 1 }],
    ['ladder', 'on-stage: its own LEVEL 1 exemplar kept',
      { s: 'LEVEL 1 — EXPOSITION: "He had elegant hands."', min: 1 }],
    ['ladder', 'on-stage: its own TEST kept', { s: 'cause her to MISS something', min: 1 }],
    ['ladder', 'on-stage: its acquaintance LEVEL 4 variant kept',
      { s: 'COGNITIVE INTERFERENCE (acquaintance variant)', min: 1 }],
    ['ladder', 'Scene-1: ATTRACTION-PATTERN ANCHORING kept',
      { s: 'ATTRACTION-PATTERN ANCHORING', min: 1 }],

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
    // `pairedWith` is the scaffold's orphan check: a banner must never ship without the authority
    // sentence that belongs under it, which is exactly the defect the stale guard produced.
    if (rule.pairedWith) {
      const banners = n('═══ STORY SCAFFOLD');
      const authority = n('SCAFFOLD AUTHORITY: GRAVITATIONAL, NOT PRESCRIPTIVE');
      const ok2 = banners === authority;
      if (ok2) pass++; else failures.push(`${g}: ${label} — ${banners} banner(s) but ${authority} authority sentence(s)`);
      P(`    ${ok2 ? '✓' : '✗'} ${label.padEnd(52)} ${banners}/${authority} (must match)`);
      continue;
    }
    // ── LATER CONTINUATIONS DO NOT RECEIVE THIS BLOCK AT ALL ──
    // Measured on turn 2 of the fresh story: every row of this group reads 0, including
    // requirements this work never touched (risk-of-loss, ANTI-PATTERN). So the Scene-1 contract
    // block is emitted on the FIRST continuation only — where turnCount is still 0 and the
    // builder reads it as scene 1 — and never on later scenes. The "KEPT" rows therefore cannot
    // be asserted on a later scene; they are reported for the record, while the opening-only rows
    // stay hard assertions because their absence is still required.
    if (LATER && (g === 'ownership'
        || (g === 'ladder' && /Scene-1|cross-references|points at the same TEST/.test(label)))) {
      const cb = n(rule.s);
      P(`    ·  ${label.padEnd(52)} ${String(cb).padStart(2)} (inside the Scene-1 block, absent on later scenes)`);
      pass++;
      continue;
    }
    if (LATER && g === 'scope' && !('exp' in rule)) {
      const c0 = n(rule.s);
      P(`    ·  ${label.padEnd(52)} ${String(c0).padStart(2)} (not delivered on later scenes at all)`);
      pass++;
      continue;
    }
    const c = n(rule.s);
    const ok = ('exp' in rule) ? c === rule.exp
      : ('max' in rule) ? c <= rule.max : c >= rule.min;
    if (ok) pass++; else failures.push(`${g}: ${label} — found ${c}, expected ${'exp' in rule ? rule.exp : 'max' in rule ? '<=' + rule.max : '>=' + rule.min}`);
    P(`    ${ok ? '✓' : '✗'} ${label.padEnd(52)} ${String(c).padStart(2)}`
      + ('exp' in rule ? ` (exactly ${rule.exp})`
        : 'max' in rule ? ` (at most ${rule.max})` : ` (at least ${rule.min})`));
  }
  P(`\n  ${pass}/${CHECKS.length} consolidated-requirement checks passed on the delivered request.`);

  // ── CONTROL VERDICT ──
  // V1 may legitimately still appear: it is frozen into the saved prompt and cannot be rewritten.
  // What must not happen is V2 — the CURRENT plan — being dropped because a scaffold heading
  // already exists in that prefix. A heading-only guard fails exactly here.
  if (CTRL) {
    P('\n  STALE-PREFIX vs CURRENT-PLAN CONTROL (incompatible assignments):');
    const cfails = [];
    const C = (label, ok, detail) => { if (!ok) cfails.push('control: ' + label + (detail ? ' — ' + detail : ''));
      P(`    ${ok ? '✓' : '✗'} ${label.padEnd(52)}${detail ? ' ' + detail : ''}`); };

    // 1. The CURRENT plan must reach the author.
    C('V2 run thesis (current) reaches the author', n('V2 she LEAVES before the room') >= 1,
      String(n('V2 she LEAVES before the room')));
    C('V2 thematic direction reaches the author', n('V2 the story resolves ANYWHERE BUT this venue') >= 1,
      String(n('V2 the story resolves ANYWHERE BUT this venue')));
    C('V2 issue plan reaches the author', n('V2 she refuses the room') >= 1, String(n('V2 she refuses the room')));

    // 2. The author must be able to tell which plan governs. V1 is frozen into the saved prompt
    //    and cannot be removed, so the requirement is that it is explicitly marked obsolete.
    const v1n = n('V1 she STAYS in the room');
    const supersede = n('SUPERSEDES THE EARLIER SCAFFOLD');
    const governs = n('THE PLAN BELOW IS THE CURRENT ONE AND GOVERNS');
    C('the current plan is declared to govern', governs >= 1, String(governs));
    C('the earlier one is named a SUPERSEDED PLAN', n('is a SUPERSEDED PLAN') >= 1,
      String(n('is a SUPERSEDED PLAN')));
    // Supersession must replace PLANNING INSTRUCTIONS only. A planned event is not an event, so it
    // must not read as invalidating published story events, lore or character facts.
    C('supersession scope is confined to planning', n('this replaces PLANNING INSTRUCTIONS ONLY') >= 1,
      String(n('this replaces PLANNING INSTRUCTIONS ONLY')));
    C('published events are protected', n('does not invalidate anything that has already happened') >= 1,
      String(n('does not invalidate anything that has already happened')));
    C('lore and character facts are protected', n('does not touch established lore, world facts or character facts') >= 1,
      String(n('does not touch established lore, world facts or character facts')));
    C('a plan is not an event', n('never an event that did not occur') >= 1,
      String(n('never an event that did not occur')));
    C('the word "obsolete history" is gone', n('OBSOLETE history') === 0, String(n('OBSOLETE history')));
    C('a supersession banner is present when V1 is', v1n === 0 || supersede >= 1, `V1×${v1n} supersede×${supersede}`);
    C('both assignments are NOT presented as current', !(v1n >= 1 && governs === 0),
      `V1×${v1n} governs×${governs}`);

    // 3. Structural boundaries: every scaffold banner must have its own authority + END, so the
    //    author can see where each plan starts and stops.
    const banners = n('═══ STORY SCAFFOLD');
    const authority = n('SCAFFOLD AUTHORITY: GRAVITATIONAL');
    const ends = n('═══ END SCAFFOLD ═══');
    C('every banner keeps its authority instruction', banners === authority, `${banners} banner(s) / ${authority} authority`);
    C('every banner keeps its closing marker', banners === ends, `${banners} banner(s) / ${ends} END`);

    // 4. Nothing unrelated may be swallowed into a scaffold block: between a banner and its END
    //    there must be no instruction that belongs to another section.
    const FOREIGN = ['SCENE LENGTH GUIDANCE', 'SCENE 1 OPENING CONTRACT', 'WITHHELD CORE',
                     'CHARACTER VISIBILITY (HARD)', 'EMOTIONAL PHYSICS'];
    let swallowed = [];
    let idx = 0;
    for (let k = 0; k < banners; k++) {
      const bAt = t.indexOf('═══ STORY SCAFFOLD', idx);
      if (bAt === -1) break;
      const eAt = t.indexOf('═══ END SCAFFOLD ═══', bAt);
      idx = (eAt === -1 ? bAt + 1 : eAt + 1);
      if (eAt === -1) { swallowed.push('block ' + (k + 1) + ' has no END'); continue; }
      const inner = t.slice(bAt, eAt);
      for (const f of FOREIGN) if (inner.indexOf(f) !== -1) swallowed.push(`block ${k + 1} contains "${f}"`);
    }
    C('no unrelated instruction inside a scaffold block', swallowed.length === 0, swallowed.join('; ') || 'clean');

    cfails.forEach((f) => failures.push(f));
    P(`    ·  V1 (stale, frozen into the saved prompt)         ${v1n}`);
  }
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
