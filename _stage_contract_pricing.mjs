// ══════════════════════════════════════════════════════════════════════════════════════════
//  DRY PRICING for the continuation planner's `stage_contract` extension.
//  MEASURES ONLY. Every /api/ route is fulfilled locally; nothing is dispatched, nothing is
//  enabled. The current request is captured byte-exact from the real production call, the
//  proposed delta is measured as authored text, and the ceiling is arithmetic on top.
// ══════════════════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core';
import fs from 'fs';
import { configBody, installSession, isAuthOrigin } from './_test_session_env.mjs';

const PLANNER_REPLY = JSON.stringify({
  environment_anchor: 'the salt-stiffened ledger rope across the harbour counter',
  structural_pacing: 'compressed', narrative_density: 'medium', dialogue_ratio: 'balanced',
  beat_style: 'escalating', tension_rhythm: 'rising', interlocutor_placement: 'across the counter',
  li_texture_beat: 'he squares the ledger without being asked',
  pc_body_callback: 'decision', li_body_callback: 'opening', antagonist_body_callback: null,
  staged_characters: [{ name: 'Julian', presence_mode: 'PHYSICALLY_PRESENT' }],
  environment_plus: { target: 'the harbour counter', axis: 'use' }, fusion: null });

// ── THE PROPOSED PROMPT DELTA ──
// It asks for a STAGE, not psychology. No character_plus, no facet_id, no option_id: the planner
// cannot select from grounded options because it has not been given any, and asking it to choose
// anyway is how a model invents a pairing no fact supports.
const DELTA = `
STAGE_CONTRACT (REQUIRED). Return a "stage_contract" object, versioned:
{ "v": 1,
  "participants": [ { "ref": "<COPIED VERBATIM from ISSUED REFS>", "presence": "IN_PERSON|ANTICIPATED|RECALLED|REPORTED" } ],
  "event_facts": [ { "text": "<one clause: what OCCURS in this scene>",
                     "participants": [ { "ref": "<issued ref>", "role": "actor|subject|speaker|target" } ] } ] }
RULES — a violation rejects the whole stage_contract, not just the offending row:
 · Every "ref" MUST be copied verbatim from ISSUED REFS below. A name you write yourself is NOT a
   ref, and a ref you have not been issued does not exist.
 · No ref may appear twice in "participants".
 · Only IN_PERSON is in the room. Do not give physical action to anyone else.
 · "event_facts" state what HAPPENS. Not psychology, not motive, not history, not what someone
   feels or believes — those are decided elsewhere and are not yours to assign.
 · Do NOT return character_plus, facet_id, option_id, or any per-character angle.
ISSUED REFS (the complete set; there are no others):
`;
const REFS_SAMPLE = ['pc:self', 'named:julian', 'role:first_sacrifice_presiding_dohkar',
                     'named:mara_dunn', 'named:tom_reed', 'plot:harbour_clerk']
  .map(r => `  · ${r}`).join('\n') + '\n';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const calls = [];
await installSession(page);
await page.addInitScript(() => { window.__ctNoAutoBegin = true; });
await page.route('**/*', async route => {
  const url = route.request().url();
  const path = url.replace(/^https?:\/\/[^/]+/, '');
  if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (!/\/api\//.test(path)) return route.continue();
  if (/\/api\/config\b/.test(path)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  let payload = ''; try { payload = route.request().postData() || ''; } catch (_) {}
  calls.push({ path, payload });
  return route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ ok: true, content: PLANNER_REPLY,
      choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: PLANNER_REPLY } }] }) });
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window.state && window.__generateSceneSkeleton, { timeout: 60000 });
await page.evaluate(async () => {
  const s = window.state;
  const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
  Object.assign(s, { _starterId: def.id, is_starter_story: true, world: def.world,
    worldSubtype: def.worldSubtype, name: 'Lirael', playerName: 'Lirael',
    loveInterestName: 'Julian', partnerName: 'Julian', pov: 'first_person',
    storyId: 'price-1', turnCount: 3, scenes: ['a', 'b', 'c'], sceneSkeleton: null, issueNumber: 1 });
  s._relationshipLedger = null;
  await window.__generateSceneSkeleton('she pushes past the clerk', 'I need the manifest cleared.', {});
});
await browser.close();

const skel = calls.filter(c => /PROMPT_PREPROCESSOR/.test(c.payload) && /narrative skeleton/i.test(c.payload));
const B = s => Buffer.byteLength(s, 'utf8');
const cur = skel.length ? B(skel[0].payload) : 0;
const deltaBytes = B(DELTA + REFS_SAMPLE);
const next = cur + deltaBytes;

// CONSERVATIVE AUTHORIZATION BOUND — 1 token per UTF-8 byte, plus protocol overhead. Deliberately
// not a tokenizer measurement: no dependency is installed and no provider tokenizer version is
// assumed. This over-counts, which is the correct direction for a ceiling.
const bound = n => Math.ceil(n) + 200;
const CUR_MAX = 1400;                 // app.js: max_tokens on this call today
const STAGE_RESP = 900;               // 6 participants + ~8 event_facts with role-tagged refs
const NEXT_MAX = CUR_MAX + STAGE_RESP;

console.log(`
══ DRY PRICING — continuation planner stage_contract ══════════════════════════════

  ROUTE (read from app.js, not assumed)
    role            PROMPT_PREPROCESSOR
    model           mistral-small-latest
    temperature     0.4
    reasoning       'none'  ← no hidden reasoning spend; the ceiling is real
    max_tokens      ${CUR_MAX}  (today)

  REQUEST (measured from the real intercepted call, byte-exact)
    current payload      ${cur} bytes
    prompt delta         ${deltaBytes} bytes  (contract text ${B(DELTA)} + issued refs ${B(REFS_SAMPLE)})
    projected payload    ${next} bytes   (+${(100 * deltaBytes / (cur || 1)).toFixed(1)}%)

  RESPONSE CEILING
    current              ${CUR_MAX} tokens
    stage_contract       +${STAGE_RESP} tokens  (hard cap, refs are short and enumerable)
    projected            ${NEXT_MAX} tokens

  CONSERVATIVE BOUND PER TURN (1 token/byte + 200 overhead; over-counts on purpose)
    input  ≤ ${bound(next)} tokens
    output ≤ ${NEXT_MAX} tokens
    delta vs today: input +${bound(next) - bound(cur)}, output +${STAGE_RESP}

  CALLS PER TURN
    unchanged — 1. The stage rides the planner call that already happens.

  RATES: not filled in here. Fill from the provider's published page at authorization time;
  no rate is asserted from memory.

  FAILURE BEHAVIOR
    unknown / duplicate / bare-name ref → the WHOLE generated stage is rejected
    rejected stage → no authoritative stage → C+ stays fail-closed, scene proceeds
    malformed stage_contract → same; the rest of the skeleton is unaffected

  requests observed: ${calls.length}   skeleton calls matched: ${skel.length}
══════════════════════════════════════════════════════════════════════════════════
`);
