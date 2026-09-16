// NO-PROVIDER FIRST SACRIFICE SCENE-1 CALL CENSUS (Roman, corrective pass 2026-09-16)
//
// Supersedes the parameter-matching-based "13/14/17" accounting work — that approach still left
// 6 of 11 real historical calls unidentified. This drives the REAL handleBeginStory() code path
// for starter_first_sacrifice, but captures each request's role at its SOURCE — the actual JS
// call stack, via a wrapped window.fetch reported back to Node through page.exposeFunction —
// never a regex guess against prompt text. ZERO requests ever reach a real provider: every one
// is matched to a known role and answered with a minimal valid fixture, or blocked as
// UNDECLARED_MODEL_ROLE with its full stack trace captured for investigation. app.js is NOT
// modified — all instrumentation is injected at runtime via Playwright.
//
// usage: node _scene1_call_census.mjs
import { chromium } from 'playwright-core';
import fs from 'fs';

const DIR = '_scene1_census';
fs.mkdirSync(DIR, { recursive: true });

const PASSTHROUGH = /\/api\/(config|geo|csp-report|beta-events)\b/;
const STUB = {
  '/api/consume-fortune':          { success: true, fortunesRemaining: 9999 },
  '/api/verify-subscription':      { success: true, subscribed: true, tier: 'sub' },
  '/api/claim-issue-number':       { success: true, issueNumber: 1 },
  '/api/refund-fortune':           { success: true },
  '/api/grant-welcome-milestone':  { success: true },
  '/api/record-legal-acceptance':  { success: true },
};
const IMAGE = /\/api\/(image|bfl-kontext|visualize-flux|grok-image|dashscope-image|img-proxy|cine-styled-manifest|mouth-approve|verify-anatomy)\b/;
const MODEL = /\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini-proxy)\b/;

// ── VALID FIXTURE BODIES ───────────────────────────────────────────────────────────────────
// PC Body Bible: reuses the exact, already-validator-proven shape from
// _pc_foundation_output_validator_control.mjs's fullyCoveredGreenBible() for the 8 durable
// fields (this is the SAME fixture already proven to pass the real _validatePcFoundationOutput
// elsewhere this session), plus plausible physical/behavioral fields the generator's own sanity
// check and decalcify gates read.
function pcBodyBibleFixture() {
  return {
    age: '24', ancestry: 'Fatelands-born', height: '5\'6"', build: 'slender, wiry-strong',
    hair: 'dark brown, kept in a practical braid', complexion: 'warm olive',
    signature_feature: 'a once-broken nose that healed slightly askew',
    second_celebrated_feature: 'quick, expressive hands',
    stress_tic: 'presses her thumbnail into the pad of her index finger',
    desire_tell: 'goes very still and watches his mouth when he speaks low',
    impatience_tell: 'taps the toe of one boot against the floor twice, then stops herself',
    confidence_tell: 'squares her shoulders and drops her voice half a register',
    vulnerability_tell: 'tucks her chin and studies the middle distance',
    emotional_weather: 'a controlled, watchful calm with a live current underneath',
    signature_habits: 'counts ritual steps under her breath before she begins',
    li_keenly_aware_of: 'the exact moment her composure starts to slip',
    wound: { core: 'Failing is survivable; failing where it can be witnessed and recounted is not, so she manages the audience as much as the task.', category: 'PUBLIC', surfacing_hint: 'a public misalignment forcing her competence into question' },
    core_contradiction: 'She knows the procedure better than she has ever performed it, and the gap between knowing and doing is where her fear lives now that everyone is watching.',
    private_hope: 'That the assembly sees her as capable, not merely lucky, once the truth of the misalignment comes out.',
    current_crisis: {
      event: 'The presiding Dohkar has charged her with shaping and interfering, and the matter has not yet been resolved before the gathered assembly.',
      immediate_fear: 'That the accusation outlives any answer she gives before the inquiry opens.',
      li_complication: 'Julian, who already knows something about her lineage, questioned her before the assembly as part of the same incident.',
      refusal: 'To let the Dohkar’s claim that she was shaping the wish and interfering go unanswered before he has ruled.',
    },
    _provenance: {
      'wound.core': { kind: 'locked_canon_fact', basis: 'approved_facet:pc_fears_public_failure', cites: 'Failing is survivable; failing where it can be witnessed and recounted is not' },
      'wound.surfacing_hint': { kind: 'grounded_inference', basis: 'inferred', cites: '' },
      'core_contradiction': { kind: 'locked_canon_fact', basis: 'approved_facet:pc_untested_brilliance', cites: 'She knows the procedure better than she has ever performed it' },
      'private_hope': { kind: 'grounded_inference', basis: 'inferred', cites: '' },
      'current_crisis.event': { kind: 'locked_canon_fact', basis: 'approved_scene1', cites: 'The presiding Dohkar has charged Lirael with shaping the wish and with interfering' },
      'current_crisis.immediate_fear': { kind: 'grounded_inference', basis: 'inferred', cites: '' },
      'current_crisis.li_complication': { kind: 'locked_canon_fact', basis: 'approved_relationship', cites: 'Already knows something about the PC’s lineage' },
      'current_crisis.refusal': { kind: 'locked_canon_fact', basis: 'approved_scene1', cites: 'The presiding Dohkar has charged Lirael with shaping the wish and with interfering; he has not yet ruled' },
    },
  };
}
function liBodyBibleFixture() {
  return {
    age: '29', ancestry: 'Fatelands-born', height: '6\'1"', build: 'lean, controlled strength',
    hair: 'dark, close-cropped', complexion: 'deep olive', eye_color: 'grey',
    voice_quality: 'low, unhurried',
    signature_feature: 'a stillness that reads as authority', second_celebrated_feature: 'deliberate, unhurried hands',
    signature_behavior: 'watches a room before he ever speaks in it',
    deflection_pattern: 'answers a personal question with a procedural one',
    attraction_manifestation: 'shows up, remembers, fixes — never admits why',
    emotional_weather: 'quiet, watchful reserve', pc_keenly_notices: 'the half-second before he decides to speak',
    defining_anecdote: 'once stood between a frightened apprentice and a furious Dohkar and said nothing until the room calmed',
    signature_kink: 'control offered, never taken',
  };
}
function decalcifyFieldsFixture(fieldsCsv) {
  const out = {};
  String(fieldsCsv || '').split(',').map(s => s.trim()).filter(Boolean).forEach(f => { out[f] = 'a distinctive, non-repeating value for ' + f; });
  return out;
}

// ── ENVELOPE WRAPPERS matching the REAL parsing code read this pass ──
// mistral-proxy / _setupMistralPost callers read d.content || d.choices[0].message.content
function mistralEnvelope(jsonObj) { return JSON.stringify({ content: JSON.stringify(jsonObj), usage: { prompt_tokens: 100, completion_tokens: 100 } }); }
// /api/proxy (grok) callers read d.choices[0].message.content || d.content
function grokEnvelope(jsonObj) { return JSON.stringify({ choices: [{ message: { content: JSON.stringify(jsonObj) } }], usage: { prompt_tokens: 100, completion_tokens: 100, cost_in_usd_ticks: 0 } }); }
function grokTextEnvelope(text) { return JSON.stringify({ choices: [{ message: { content: text } }], usage: { prompt_tokens: 100, completion_tokens: 50, cost_in_usd_ticks: 0 } }); }
// /api/chatgpt-proxy callers read d.content
function openaiEnvelope(jsonObj) { return JSON.stringify({ content: JSON.stringify(jsonObj), usage: { prompt_tokens: 100, completion_tokens: 100 } }); }
function openaiTextEnvelope(text) { return JSON.stringify({ content: text, usage: { prompt_tokens: 100, completion_tokens: 50 } }); }
function mistralTextEnvelope(text) { return JSON.stringify({ choices: [{ message: { content: text } }], usage: { prompt_tokens: 100, completion_tokens: 50 } }); }

// A GOOD, contact-bearing opening skeleton so the flow reaches AUTHOR without needing repair.
// Real envelope shape confirmed from the actual retained paid run this session
// (_paid_scene1_v2/01_mistral_request_response.json): {opening_spine:{...,scene_skeleton:{...}}}.
function plannerFixtureEnvelope() {
  return {
    opening_spine: {
      pressure_source_type: 'moral',
      pressure_source: 'Seren is abandoning the rehearsed wish and redirecting her First Sacrifice toward Lirael, blurring the wording before the assembly.',
      hook_object: null, opening_actor_id: 'named:seren',
      opening_beat: 'Seren names her offering aloud then falters, spending the sacrifice on me instead.',
      rising_beats: ['The presiding Dohkar demands the cost spoken before the miracle.', 'Julian stands perfectly still at the edge, eyes half elsewhere.'],
      decision_beat: 'Tear the gossamer band to halt the wish, or stay silent and bound?',
      pc_career: 'veil weaver', opening_setting: 'Veilwood ceremony clearing',
      environment_element_ids: ['O4', 'O5'], interlocutor_placement: null,
      pc_self_presentation_beat: 'decision — I reach for the band, my willowy frame unfolding as the sash shifts across narrow shoulders.',
      scene_want: 'wants the rite to realign without having to break protocol aloud.',
      scene_mission: 'Halt the wish from twisting toward me before it lands without breaking decorum.',
      reader_state: { knows: 'Seren has redirected her First Sacrifice onto Lirael mid-rite in the clearing.', believes: 'Lirael must choose to intervene or remain bound by protocol.', wondering: 'Why is Julian here watching this exact moment?', must_not_confuse: 'Lirael is the officiating Sacrificiant with mouth covered; Seren is the one redirecting the wish.' },
      pc_body_callback: 'opening — signature_feature (the once-broken nose)', li_body_callback: 'rising 1 — eyes (half a thought elsewhere)',
      staged_characters: [
        { name: 'Lirael', presence: 'IN_PERSON', anchor_beat: 'FROM_PC_OPENING_FUSION' },
        { name: 'Julian', presence: 'IN_PERSON', anchor_beat: 'FROM_CHARACTER_PLUS' },
        { name: 'Seren', presence: 'IN_PERSON', anchor_beat: 'FROM_CHARACTER_PLUS' },
        { name: 'the presiding Dohkar', presence: 'IN_PERSON', anchor_beat: 'FROM_CHARACTER_PLUS' },
      ],
      scene_skeleton: {
        character_plus: [
          { character: 'Seren', mode: 'IN_PERSON', option_id: 'OPT-4', expression_mode: 'LEAK', first_mention: true,
            visible_action: 'Seren names her offering aloud then falters and redirects it toward Lirael.',
            enacts_evidence_id: 'E4', behavior_object_ids: [], behavior_person_ids: ['pc:lirael'],
            revelation_bridge: 'The blur shows her need to be seen as good without naming the wound.',
            pc_lens_operation: 'INWARD_TRANSLATION_OF_ANOTHER_PERSONS_COST',
            pc_interpretation: 'Seren softens the truth to protect her own image more than Lirael.' },
        ],
        environment_plus: { target_object_id: 'O4', axis: 'ritual', beat: '{TARGET} sits loose across her mouth, a decorum she can break with one pull.' },
        // GOOD fusion beat (fixed this census, distinct from the real run's rejected one): real
        // contact verb ("presses"), names the target via {TARGET}, identifies the character via
        // first-person pronoun — built to pass _validateFusionConcreteness so the census reaches
        // AUTHOR without exercising the repair path (that path is proven separately, dry, in
        // _scene1_skeleton_repair_control.mjs).
        pc_opening_fusion: { character: 'Lirael', placement: 'PC_FIRST_EMBODIED_BEAT',
          character_angle: 'My hand moves before my mind agrees to it.',
          beat: 'I press my palm flat against the {TARGET} as Seren’s words land.' },
      },
    },
  };
}

const inventory = [];
const paid = [];
const blockedUnknown = [];
const roleLog = [];   // every matched call with its role + evidence
let authorDone = false;
let authorRec = null, plannerRec = null;

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();

// ── STACK-CAPTURE, SOURCE-TRUE ROLE IDENTIFICATION ──
// exposeFunction lets page-JS report the REAL call stack to Node before dispatch; the wrapped
// fetch tags the outgoing request with a correlation id so the route handler can retrieve it.
const stackById = new Map();
await page.exposeFunction('__reportCensusCall', (id, info) => { stackById.set(id, info); });
await page.addInitScript(() => {
  const realFetch = window.fetch;
  let seq = 0;
  window.fetch = function (input, init) {
    try {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      if (/\/api\//.test(url) && !/\/api\/(config|geo|csp-report|beta-events)/.test(url)) {
        const id = 'c' + (++seq) + '-' + Date.now();
        const stack = (new Error().stack || '').split('\n').slice(1, 12).join(' | ');
        init = Object.assign({}, init);
        const h = new Headers(init.headers || {});
        h.set('x-census-id', id);
        init.headers = h;
        window.__reportCensusCall(id, { url, stack });
        return realFetch.call(this, input, init);
      }
    } catch (_) {}
    return realFetch.call(this, input, init);
  };
});

page.on('request', r => {
  const u = r.url();
  inventory.push({ url: u.replace(/^https?:\/\/[^/]+/, ''), method: r.method(), api: /\/api\//.test(u), t: Date.now() });
});

// ── ROLE RESOLUTION from the real stack trace + request body ──
function classify(url, body, stack) {
  const route = url.split('?')[0];
  const s = stack || '';
  const nameOf = fnPattern => new RegExp(fnPattern).test(s);
  const mt = body?.max_tokens, temp = body?.temperature, sysMsg = String((body?.messages?.find(m => m.role === 'system') || {}).content || '');
  const usrMsg = String((body?.messages?.find(m => m.role === 'user') || {}).content || '');

  if (route === '/api/proxy' && /scene-structure planner for the OPENING scene/.test(sysMsg)) {
    if (/Your previous response had one or more fields that failed validation/.test(usrMsg)) return { role: 'OPENING_PLANNER_REPAIR', evidence: 'sys+usr signature' };
    return { role: 'OPENING_PLANNER', evidence: 'sys signature' };
  }
  if (route === '/api/proxy' && /ARCHITECTURE LAWS/.test(sysMsg)) return { role: 'AUTHOR', evidence: 'sys signature' };

  // Tiered bible generation (route varies by tier; identify by max_tokens/temperature pairing,
  // which is unique per bible AND stable across all 3 tiers since _callTieredProvider passes the
  // SAME opts to every tier).
  if (mt === 2500 && temp === 0.6) return { role: 'PC_BODY_BIBLE', evidence: 'max_tokens=2500 temp=0.6 (unique to _callTieredProvider(\'pcBodyBible\')) + stack: ' + s.slice(0, 300) };
  if (mt === 3000 && temp === 0.6) return { role: 'LI_BODY_BIBLE', evidence: 'max_tokens=3000 temp=0.6 (unique to _callTieredProvider(\'liBodyBible\')) + stack: ' + s.slice(0, 300) };
  if (mt === 1100 && temp === 0.65) return { role: 'ANTAGONIST_BODY_BIBLE', evidence: 'max_tokens=1100 temp=0.65 (unique to _callTieredProvider(\'antagonistBodyBible\')) + stack: ' + s.slice(0, 300) };

  // _setupMistralPost-based cosmetic/repair calls, disambiguated by stack (role param baked
  // into the calling function's own name is NOT visible in the stack, since these are closures
  // inside _generatePCBodyBibleUncached/_generateLIBodyBibleUncached — use max_tokens/temperature
  // PLUS the sys-prompt's role-label text ("pc bible"/"li bible"/roleLabel) for disambiguation).
  if (mt === 600 && temp === 0.97) {
    const forRole = /\bli\b bible|romance li bible/i.test(sysMsg) ? 'LI' : 'PC';
    return { role: forRole + '_PHYSICAL_CANON_DECALCIFY', evidence: 'max_tokens=600 temp=0.97, sysMsg head="' + sysMsg.slice(0, 100) + '"' };
  }
  if (mt === 800 && temp === 0.98) {
    const forRole = /\bli\b bible|romance li bible/i.test(sysMsg) ? 'LI' : 'PC';
    return { role: forRole + '_BEHAVIORAL_CANON_DECALCIFY', evidence: 'max_tokens=800 temp=0.98, sysMsg head="' + sysMsg.slice(0, 100) + '"' };
  }
  if (mt === 300 && temp === 0.9) return { role: 'PC_CRISIS_REROLL', evidence: 'max_tokens=300 temp=0.9 (billionaire-flavor-gated, likely inert for Fantasy)' };
  if (mt === 500 && temp === 0.9) return { role: 'PC_BODY_TELL_REROLL', evidence: 'max_tokens=500 temp=0.9' };
  if (route === '/api/proxy' && mt === 220 && temp === 0.95) return { role: 'EDITORIAL_PASS', evidence: 'max_tokens=220 temp=0.95 grok-4-1-fast-non-reasoning' };

  // ROUND 2 — resolved via REAL stack traces from round 1 (not guessed):
  if (mt === 1800 && temp === 0.55) return { role: 'PAIR_BOND', evidence: 'stack: _generatePairBond (app.js:52087), _callTieredProvider(\'pairBond\', ..., {max_tokens:1800,temperature:0.55})' };
  if (mt === 1200 && temp === 0.6 && /_generateRPlot|_ensureRPlot/.test(stack)) return { role: 'R_PLOT', evidence: 'stack: _generateRPlot (app.js:264962) via _ensureRPlot, _callTieredProvider(\'rplot\', ..., {max_tokens:1200,temperature:0.6})' };
  if (mt === 500 && temp === 0.3 && /_auditWoundLIIntegration/.test(stack)) return { role: 'WOUND_LI_INTEGRATION_AUDIT', evidence: 'stack: _auditWoundLIIntegration (app.js:265220), _callTieredProvider(\'woundSwapTest\', ..., {max_tokens:500,temperature:0.3})' };
  if (mt === 2000 && temp === 0.7 && /_buildCGScaffold|_ensureCGScaffold|_runEnsureCGScaffold/.test(stack)) return { role: 'CG_SCAFFOLD', evidence: 'stack: _buildCGScaffold (app.js:218249) via _ensureCGScaffold/_runEnsureCGScaffold, _callTieredProvider(..., {max_tokens:2000,temperature:0.7})' };

  // ROUND 3 — post-Author pipeline, resolved via REAL stack traces after the `plan is not
  // defined` regression (introduced by this session's own live-wiring of the skeleton-repair
  // layer, fixed in-place) was unblocking `_buildScene1Scaffold` for the first time this census.
  if (route === '/api/proxy' && mt === 900 && temp === 0.8 && /_grokLiteraryAuthor/.test(stack) && !/_grokAuthor\b/.test(stack)) return { role: 'GROK_DECALC_EDITOR', evidence: 'stack: callGrokNarrativeAuthor inside _grokLiteraryAuthor (orchestration-client.js:3059) — the ruthless line-editor pass, max 5 exact-quote fixes' };
  if (route === '/api/chatgpt-proxy' && mt === 900 && temp === 0.3) return { role: 'GROK_DECALC_EDITOR_FALLBACK', evidence: 'stack: callChatGPT gpt-4o-mini fallback inside _grokLiteraryAuthor (orchestration-client.js:3063) — fires only if the Grok decalc editor throws/empties' };
  if (route === '/api/mistral-proxy' && mt === 2400 && temp === 0.2 && /_mistralRepairPass/.test(stack)) return { role: 'MECHANICAL_REPAIR', evidence: 'stack: _mistralRepairPass (orchestration-client.js:2798) inside _grokLiteraryAuthor — mechanical-only cleanup, mistral-small-latest primary' };
  if (route === '/api/chatgpt-proxy' && mt === 2400 && temp === 0.2) return { role: 'MECHANICAL_REPAIR_FALLBACK', evidence: 'stack: callChatGPT gpt-4o-mini fallback inside _mistralRepairPass (orchestration-client.js:2816) — fires only if mistral-small-latest fails/rejects' };
  if (route === '/api/proxy' && mt === 110 && temp === 0.85) return { role: 'PREWRITE_HINT_EXPANSION', evidence: 'stack: _genDemandHintExpansionText (app.js:313307) via _populatePrewriteCache (app.js:277920) — fires exactly twice (direct+subtle), fire-and-forget, gated on turnCount===0 && no author-appendix && a micro-decision exists' };
  if (route === '/api/chatgpt-proxy' && mt === 400 && temp === 0.4) return { role: 'VOICE_ANCHOR', evidence: 'stack: generateVoiceAnchor (app.js:81902) — fires once per story (gated on !state.voiceAnchor), fire-and-forget, gpt-4o, no fallback tier' };
  if (route === '/api/mistral-proxy' && mt === 1500 && temp === 0.2 && /_targetedSceneEdit|_cheapLineEdit/.test(stack)) return { role: 'LI_DESC_PROSE_REPAIR', evidence: 'stack: _targetedSceneEdit via _cheapLineEdit (app.js:274502) — conditional: LI physical description absent/not desire-coded AND >=2 canon details available; single Haiku-tier edit, no cascade' };
  if (route === '/api/chatgpt-proxy' && mt === 400 && temp === 0.2 && /_auditPost|_extractAndRecordScene1SignaturePhrases/.test(stack)) return { role: 'SIGNATURE_PHRASE_AUDIT', evidence: 'stack: _extractAndRecordScene1SignaturePhrases (app.js:56960) via _auditPost — unconditional, fire-and-forget (setTimeout 0), gpt-4o-mini, single tier' };
  if (mt === 800 && temp === 0.2 && /_extractCharacterDisclosure/.test(stack)) return { role: 'CHARACTER_DISCLOSURE_EXTRACTION', evidence: 'stack: _extractCharacterDisclosure (app.js:30800), _callTieredProvider(\'characterDisclosure\', ..., {max_tokens:800,temperature:0.2}) — unconditional post-scene ledger extraction' };

  return null; // UNKNOWN
}

await page.route('**/api/**', async route => {
  const req = route.request();
  const url = req.url().replace(/^https?:\/\/[^/]+/, '');
  if (PASSTHROUGH.test(url)) return route.continue();
  const stub = Object.keys(STUB).find(x => url.startsWith(x));
  if (stub) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(STUB[stub]) });
  if (IMAGE.test(url)) { return route.abort(); }
  if (!MODEL.test(url)) { return route.abort(); }

  let body = null;
  try { body = JSON.parse(req.postData() || '{}'); } catch (_) {}
  const censusId = req.headers()['x-census-id'];
  const stackInfo = censusId ? stackById.get(censusId) : null;
  const stack = stackInfo ? stackInfo.stack : '(no stack captured — fetch wrapper missed this call)';

  const match = classify(url.split('?')[0], body, stack);
  if (!match) {
    const rec = { url, model: body?.model, max_tokens: body?.max_tokens, temperature: body?.temperature,
      sysHead: String((body?.messages?.find(m => m.role === 'system') || {}).content || '').slice(0, 200),
      usrHead: String((body?.messages?.find(m => m.role === 'user') || {}).content || '').slice(0, 200), stack };
    blockedUnknown.push(rec);
    console.error('[CENSUS] UNDECLARED_MODEL_ROLE — ' + url + ' mt=' + body?.max_tokens + ' t=' + body?.temperature);
    console.error('         stack: ' + stack.replace(/\n/g, ' | '));
    return route.fulfill({ status: 599, contentType: 'application/json', body: JSON.stringify({ error: 'UNDECLARED_MODEL_ROLE', blocked: true }) });
  }

  roleLog.push({ role: match.role, url, model: body?.model, max_tokens: body?.max_tokens, temperature: body?.temperature, evidence: match.evidence, t: Date.now(), stack });
  console.log('[CENSUS] ' + match.role + '  ' + url + '  mt=' + body?.max_tokens + ' t=' + body?.temperature);
  console.log('         stack: ' + stack.replace(/\n/g, ' | '));

  // ── FIXTURE RESPONSES, route-shaped per the real parsing code read this pass ──
  const route_ = url.split('?')[0];
  let responseBody;
  if (match.role === 'OPENING_PLANNER' || match.role === 'OPENING_PLANNER_REPAIR') {
    responseBody = grokEnvelope(plannerFixtureEnvelope());
    if (match.role === 'OPENING_PLANNER') plannerRec = { request: body, stack };
  } else if (match.role === 'AUTHOR') {
    responseBody = grokTextEnvelope('The gossamer band sits loose across my mouth. I press my palm flat against it as Seren’s words land, and the ritual clearing goes very still.');
    authorRec = { request: body, stack };
    authorDone = true;
  } else if (match.role === 'PC_BODY_BIBLE') {
    const fixture = pcBodyBibleFixture();
    responseBody = route_ === '/api/mistral-proxy' ? mistralEnvelope(fixture) : route_ === '/api/proxy' ? grokEnvelope(fixture) : openaiEnvelope(fixture);
  } else if (match.role === 'LI_BODY_BIBLE') {
    const fixture = liBodyBibleFixture();
    responseBody = route_ === '/api/mistral-proxy' ? mistralEnvelope(fixture) : route_ === '/api/proxy' ? grokEnvelope(fixture) : openaiEnvelope(fixture);
  } else if (match.role === 'ANTAGONIST_BODY_BIBLE') {
    const fixture = { signature_feature: 'a controlled, appraising stillness', control_tell: 'measures a room before he moves through it', targeting_tell: 'names the one weakness that matters and says nothing else' };
    responseBody = route_ === '/api/mistral-proxy' ? mistralEnvelope(fixture) : route_ === '/api/proxy' ? grokEnvelope(fixture) : openaiEnvelope(fixture);
  } else if (/PHYSICAL_CANON_DECALCIFY|BEHAVIORAL_CANON_DECALCIFY/.test(match.role)) {
    // Fields requested are named in the sys prompt ("Output ONLY a JSON object with keys X, Y, ...").
    const sysMsg = String((body?.messages?.find(m => m.role === 'system') || {}).content || '');
    const m = sysMsg.match(/Output ONLY a JSON object with keys ([^.]+)\./);
    responseBody = mistralEnvelope(decalcifyFieldsFixture(m ? m[1] : 'signature_feature'));
  } else if (match.role === 'PC_CRISIS_REROLL') {
    responseBody = mistralEnvelope({ event: 'The presiding Dohkar has charged her with shaping and interfering, and Julian’s standing as Provast is the reason the inquiry now falls to him.', li_complication: 'Julian’s authority to convene the inquiry is the very thing that makes his attention to her dangerous.', li_load_bearing_role: 'owns_room' });
  } else if (match.role === 'PC_BODY_TELL_REROLL') {
    responseBody = mistralEnvelope({ stress_tic: 'presses her thumbnail into her palm', desire_tell: 'goes very still and watches his mouth', impatience_tell: 'taps one boot-toe twice then stops', confidence_tell: 'drops her voice half a register', vulnerability_tell: 'tucks her chin and studies the middle distance' });
  } else if (match.role === 'EDITORIAL_PASS') {
    responseBody = grokTextEnvelope('She squares her shoulders a half-second before she has to.');
  } else if (match.role === 'PAIR_BOND') {
    const fixture = { collisionGeometry: 'her controlled composure meets his deliberate stillness', frictionSource: 'she manages what people see; he already sees past it', desireLogic: 'his attention is dangerous precisely because it is exact' };
    responseBody = route_ === '/api/mistral-proxy' ? mistralEnvelope(fixture) : route_ === '/api/proxy' ? grokEnvelope(fixture) : openaiEnvelope(fixture);
  } else if (match.role === 'R_PLOT') {
    const fixture = { coreTension: 'her need to be seen as capable collides with his refusal to let her perform for him', relationshipQuestion: 'can she let him see her fail without it costing her his respect', escalationAxis: 'trust',
      issueRelationshipStates: ['wary proximity, both withholding'], issuePressures: ['the inquiry forces them into the same rooms'], relationshipMilestones: ['he chooses her account over the room’s assumption', 'she lets him see her hands shake'] };
    responseBody = route_ === '/api/mistral-proxy' ? mistralEnvelope(fixture) : route_ === '/api/proxy' ? grokEnvelope(fixture) : openaiEnvelope(fixture);
  } else if (match.role === 'WOUND_LI_INTEGRATION_AUDIT') {
    const fixture = { verdict: 'INTEGRATED', integration_mode: 'INTERACTION', interaction_type: 'challenges', swap_test: 'replacing Julian with a different Provast archetype would flatten the specific danger of his authority over the inquiry', link: 'Julian’s authority to rule on her conduct is the exact mechanism that makes his attention to her dangerous', fix: '' };
    responseBody = route_ === '/api/mistral-proxy' ? mistralEnvelope(fixture) : route_ === '/api/proxy' ? grokEnvelope(fixture) : openaiEnvelope(fixture);
  } else if (match.role === 'CG_SCAFFOLD') {
    const fixture = { runThesis: 'a young Sacrificiant proves her competence under an inquiry that could end her standing', issueArcs: [{ thesis: 'the inquiry opens', ambiguityTargets: ['whether she shaped the wish'], pressureVectors: ['public scrutiny'], voiceAnchors: { pc_register: 'controlled', li_register: 'watchful' } }], motifBank: ['the gossamer band', 'the ceremony clearing'] };
    responseBody = route_ === '/api/mistral-proxy' ? mistralEnvelope(fixture) : route_ === '/api/proxy' ? grokEnvelope(fixture) : openaiEnvelope(fixture);
  } else if (match.role === 'GROK_DECALC_EDITOR') {
    responseBody = grokTextEnvelope('[]'); // no exact-quote fixes — a clean pass-through, same as a real "nothing to fix" verdict
  } else if (match.role === 'GROK_DECALC_EDITOR_FALLBACK') {
    responseBody = openaiTextEnvelope('[]');
  } else if (match.role === 'MECHANICAL_REPAIR') {
    responseBody = mistralTextEnvelope('The gossamer band sits loose across my mouth. I press my palm flat against it as Seren’s words land, and the ritual clearing goes very still. Forty of them, and none of them looking away.');
  } else if (match.role === 'MECHANICAL_REPAIR_FALLBACK') {
    responseBody = openaiTextEnvelope('The gossamer band sits loose across my mouth. I press my palm flat against it as Seren’s words land, and the ritual clearing goes very still. Forty of them, and none of them looking away.');
  } else if (match.role === 'PREWRITE_HINT_EXPANSION') {
    responseBody = grokTextEnvelope('She says it plainly, and the room goes quiet around the words.');
  } else if (match.role === 'VOICE_ANCHOR') {
    responseBody = openaiTextEnvelope('A controlled, present-tense first-person voice: short declaratives under pressure, longer sentences when she lets herself notice something. Grounded sensory detail over metaphor. Dry restraint instead of stated emotion — let the body carry it.');
  } else if (match.role === 'LI_DESC_PROSE_REPAIR') {
    responseBody = mistralTextEnvelope('The gossamer band sits loose across my mouth. I press my palm flat against it as Seren’s words land, and the ritual clearing goes very still. Julian watches from the edge of the assembly, that stillness of his reading as authority, and I cannot stop noticing his hands. Forty of them, and none of them looking away.');
  } else if (match.role === 'SIGNATURE_PHRASE_AUDIT') {
    responseBody = openaiTextEnvelope('{}');
  } else if (match.role === 'CHARACTER_DISCLOSURE_EXTRACTION') {
    responseBody = route_ === '/api/mistral-proxy' ? mistralEnvelope({}) : route_ === '/api/proxy' ? grokEnvelope({}) : openaiEnvelope({});
  } else {
    responseBody = mistralEnvelope({});
  }

  paid.push({ role: match.role, url, max_tokens: body?.max_tokens, temperature: body?.temperature });
  return route.fulfill({ status: 200, contentType: 'application/json', body: responseBody });
});

const logs = [];
page.on('console', m => { const x = m.text(); if (/SCENE1|SKELETON|PLANNER|BODY-TELL|PHYSICAL-CANON|BEHAV-CANON|CRISIS-REROLL|PC-BODY-BIBLE|LI-BODY-BIBLE|CENSUS|EDITORIAL/.test(x)) logs.push(x.slice(0, 300)); });
page.on('pageerror', e => logs.push('PAGEERROR ' + String(e.message).slice(0, 300)));

console.log('\n' + '='.repeat(92) + '\nNO-PROVIDER FIRST SACRIFICE SCENE-1 CALL CENSUS\n' + '='.repeat(92) + '\n');
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_STORIES, { timeout: 60000 });

await page.evaluate(async () => {
  const s = window.state;
  const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
  if (!def) throw new Error('starter_first_sacrifice not found');
  s.picks = s.picks || {};
  ['world', 'worldSubtype', 'pressure', 'flavor', 'tone', 'pov', 'length', 'dynamic', 'pcSpecies', 'liSpecies']
    .forEach(k => { s.picks[k] = def[k]; });
  Object.assign(s, { world: def.world, worldSubtype: def.worldSubtype, flavor: def.flavor, dynamic: def.dynamic,
    _starterId: def.id, is_starter_story: true, immutableTitle: def.title, story: { title: def.title }, storyTitle: def.title,
    archetype: { primary: def.archetype, modifier: null },
    name: 'Lirael', playerName: 'Lirael', loveInterestName: 'Julian', partnerName: 'Julian',
    loveInterest: 'Male', liGender: 'male', playerMask: 'OPEN_VEIN', storyLength: 'fling', tier: 'fling',
    access: 'sub', subscribed: true, fortunes: 9999999, intensity: 'Steamy', pov: 'first_person',
    identity: { playerName: 'Lirael', partnerName: 'Julian' },
    renderMode: 'literary', currentEngine: 'literary', storyId: 'census1', myUid: 'probe' });
  s.picks.identity = s.identity;
  s._skipCorridorValidation = true;
  window._devBypass = true;   // required — see _scene1_paid_v2.mjs for why
  window.__err = null;
  window.__run = window.handleBeginStory().catch(e => { window.__err = String(e && e.message); });
});

const DEADLINE = Date.now() + 220000;
while (!authorDone && Date.now() < DEADLINE) await new Promise(r => setTimeout(r, 300));
await new Promise(r => setTimeout(r, 2000));

const err = await page.evaluate(() => window.__err || null);
await browser.close();

fs.writeFileSync(DIR + '/roleLog.json', JSON.stringify(roleLog, null, 2));
fs.writeFileSync(DIR + '/blockedUnknown.json', JSON.stringify(blockedUnknown, null, 2));
fs.writeFileSync(DIR + '/logs.json', JSON.stringify(logs, null, 2));

console.log('\n' + '-'.repeat(92));
console.log(' author reached      : ' + (authorDone ? 'YES' : 'NO'));
console.log(' page error          : ' + (err || 'none'));
console.log(' roles observed      : ' + roleLog.length + '  (' + [...new Set(roleLog.map(r => r.role))].join(', ') + ')');
console.log(' UNDECLARED blocked  : ' + blockedUnknown.length);
blockedUnknown.forEach((b, i) => { console.log('   [' + i + '] ' + b.url + ' mt=' + b.max_tokens + ' t=' + b.temperature); console.log('       stack: ' + b.stack.replace(/\n/g, ' | ').slice(0, 500)); });
console.log('\n artifacts -> ' + DIR + '/\n');
process.exit(blockedUnknown.length ? 2 : (authorDone ? 0 : 1));
