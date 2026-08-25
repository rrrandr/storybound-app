// HOOK FIXTURE BUILDER — free, fenced, no paid call.
//
// Builds the repair-cascade fixture MECHANICALLY, per the required procedure:
//   1. start from prose for which _evaluate returns ZERO failures
//   2. record that baseline
//   3. change only the smallest hook-specific substring
//   4. assert the typed failure array contains exactly one HARD `hook` failure
//   5. apply the production retention + hard filters and assert it survives both
//
// _scene1HasConcreteHook / _scene1ObjectTokenList / _evaluate are closure-locals of
// handleBeginStory, so they are reachable only during a run and only via the AST
// instrumenter. A full fenced story is run to create them, then probed.
//
// THE DETECTOR (app.js:253898-254068), every branch:
//   groupA = dialogue OR proper noun in the opening window (150 words; full text if HOT)
//   groupB = a world object token from _scene1ObjectTokenList()
//   baseHookPass = (A && B) || (B && (digit|currency|UI-noun|sender-marker))
//   PASS 1  baseHookPass && shapeMatch.ok        -> reason `<A>+object:<tok>+shape:<shape>`
//   PASS 2  shape-soft (financial+currency/proxy, technology+ui_noun) -> `...(soft:<k>)`
//   PASS 3  _isHotOpen && baseHookPass           -> `+hot:shape-waived`
//   PASS 4  _ffCanonShapeAuthoritative(state)    -> `+canon:hook-waived`
//   PASS 5  state._scene1HookObjectRequired===false && (groupA||baseHookPass)
//                                                -> `+pressure:<type>-waived`
//   FAIL    single return, reason = missing.join(','), codes:
//             no_dialogue_or_proper_noun   !groupA && !baseHookPass
//             no_object_token              !groupB
//             no_concrete_signal            groupB && !groupA && !baseHookPass
//             missing_hook_shape_signal     baseHookPass && !shapeMatch.ok && !_isHotOpen
//
// TARGET REASON: `no_object_token` alone — groupA true, groupB false, all waivers off.
//
// usage: node _hook_fixture.mjs
import { chromium } from 'playwright-core';
import fs from 'fs';
import { routeInstrumented } from './_scene1_instrument.mjs';
import { buildScene1Prose, TOKEN_WORD, NONTOKEN_A, SHAPE_SIGNAL } from './_hook_fixture_prose.mjs';

const PASSTHROUGH = /\/api\/(config|geo|csp-report)\b/;
const LOCAL = { '/api/consume-fortune': { success: true, fortunesRemaining: 9999 } };
const MODEL = /\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini)\b/;
const L = 'she understands the wish has already begun to cost her something she cannot name';
const SCAFFOLD = { pressure_source_type:'institutional', pressure_source:L, hook_object:'the band',
  opening_beat:'She sets the relic down', rising_beats:['a','b'], decision_beat:'Does she name it',
  pc_career:'shrine witness', opening_setting:'the hall', li_texture_beat:'He crosses toward her',
  interlocutor_placement:'The Dohkar stands between', pc_wound_anchor:L,
  pc_self_presentation_beat:'decision', scene_want:L, scene_mission:L, reader_state:{knows:L},
  mission_family:'extraction', mission_attempt:L, immediate_result:L, pc_body_callback:'decision',
  li_body_callback:'opening', antagonist_body_callback:null, perceptual_signature_beat:L,
  staged_characters:[{name:'Lirael', anchor_beat:L}] };
const GENERIC = { goal:L, antagonistOrAntiForce:'the assembly', milestones:[], scenes:[],
  timelineLength:20, characters:[], name:'Julian', distinguishing_feature:'a burn scar',
  private_hope:L, defining_anecdote:L, attraction_manifestation:L, desire_register_exemplars:[L] };
const PROSE = (() => { const s=['Lirael','Seren','Julian','the Dohkar'],v=['turned toward','considered','reached for'],o=['the hearth','the relic','the gate'];
  const out=[]; for(let i=0;i<44;i++) out.push(`${s[i%4]} ${v[(i*3)%3]} ${o[(i*5)%3]} at ${i+3} breaths.`); return out.join(' '); })();
function classify(body) {
  const m=(body&&body.messages)||[];
  const sys=String((m.find(x=>x.role==='system')||{}).content||'');
  const usr=String((m.find(x=>x.role==='user')||{}).content||'');
  if (usr === 'Begin the story. Write Scene 1.') return 'AUTHOR_LITE';
  if (/ARCHITECTURE LAWS/.test(sys)) return 'AUTHOR';
  if (/scene-structure planner for the OPENING scene/.test(sys)) return 'SCAFFOLD';
  return /ruthless line-editor|Fix ONLY mechanical/.test(sys) ? 'PROSE' : 'JSON';
}

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };
console.log(`\n${'═'.repeat(88)}\nHOOK FIXTURE BUILDER\n${'═'.repeat(88)}\n`);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
await routeInstrumented(page);
await page.route('**/api/**', async route => {
  const url = route.request().url().replace(/^https?:\/\/[^/]+/, '');
  if (PASSTHROUGH.test(url)) return route.continue();
  const k = Object.keys(LOCAL).find(x => url.startsWith(x));
  if (k) return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(LOCAL[k]) });
  let body=null; try { body = JSON.parse(route.request().postData()||'{}'); } catch(_){}
  if (!MODEL.test(url)) return route.abort();
  const kind = classify(body);
  const c = kind==='SCAFFOLD'?JSON.stringify(SCAFFOLD):kind==='JSON'?JSON.stringify(GENERIC):PROSE;
  return route.fulfill({ status:200, contentType:'application/json',
    body: JSON.stringify({ content:c, choices:[{message:{content:c}}] }) });
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.state && window.handleBeginStory, { timeout: 40000 });

// ── run a fenced story so the closure-locals come into existence ──
await page.evaluate(async () => {
  const s = window.state;
  const def = (window.STARTER_STORIES||[]).find(d=>d&&d.id==='starter_first_sacrifice');
  s.picks = s.picks||{};
  ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies']
    .forEach(k=>{ s.picks[k]=def[k]; });
  Object.assign(s,{ world:def.world, worldSubtype:def.worldSubtype, flavor:def.flavor, dynamic:def.dynamic,
    _starterId:def.id, is_starter_story:true, immutableTitle:def.title,
    archetype:{primary:def.archetype,modifier:null}, name:'Lirael', playerName:'Lirael',
    loveInterestName:'Julian', partnerName:'Julian', loveInterest:'Male', liGender:'male',
    playerMask:'OPEN_VEIN', storyLength:'fling', tier:'fling', access:'sub', subscribed:true,
    fortunes:9999999, intensity:'Steamy', pov:'first_person',
    identity:{playerName:'Lirael',partnerName:'Julian'}, renderMode:'literary',
    currentEngine:'literary', storyId:'hookfix', myUid:'probe' });
  s.picks.identity = s.identity;
  s._skipCorridorValidation = true;
  try { await Promise.race([window.handleBeginStory(), new Promise(r=>setTimeout(r,120000))]); } catch(_){}
  s._skipCorridorValidation = false;
});

const BASE = buildScene1Prose(TOKEN_WORD);   // step 1 — expected zero failures
const MUT  = buildScene1Prose(NONTOKEN_A);   // step 3 — ONLY the object word differs

const out = await page.evaluate(({ BASE, MUT, TOKEN_WORD, SHAPE_SIGNAL }) => {
  const R = { instrumented: !!window.__x_instrumented, hasHook: typeof window.__x_hook === 'function',
              hasEval: typeof window.__x_evaluate === 'function', tokens: null };
  if (!R.hasHook || !R.hasEval) return R;
  R.tokens = window.__x_tokens();
  R.shapeTable = window.__x_shapeTokens || null;

  // Waivers OFF so the object-token gate is the live rule (branches 3/4/5 above).
  const s = window.state;
  s._openingTemperature = 'COLD';
  s._scene1HookObjectRequired = true;
  s._postProseFlags = null;

  R.tokenWordIsToken = R.tokens.indexOf(TOKEN_WORD) !== -1;
  R.signalHasToken = R.tokens.some(t => new RegExp('\\b' + t + '\\b', 'i').test(SHAPE_SIGNAL));

  const ev = txt => { const r = window.__x_evaluate(txt); return (r && r.fails) || []; };
  const hk = txt => window.__x_hook(txt);

  R.shape = hk(BASE).shape;
  R.shapePatterns = (R.shapeTable && R.shapeTable[R.shape]) || null;
  R.baseline = { hook: hk(BASE), fails: ev(BASE), words: BASE.split(/\s+/).length };
  R.mutated  = { hook: hk(MUT),  fails: ev(MUT),  words: MUT.split(/\s+/).length };

  // The mutation must be hook-specific and minimal.
  R.diff = {
    sameLength: BASE.length === MUT.length,
    sameEnding: BASE.slice(BASE.lastIndexOf('\n\n')) === MUT.slice(MUT.lastIndexOf('\n\n')),
  };

  // ── step 5: the PRODUCTION filters, applied verbatim ──
  const retained = R.mutated.fails.filter(f => !(f && f.type === 'decision'));   // app.js:255617-255626
  const hard     = retained.filter(f => !f || !f.soft);                          // app.js:255647
  R.filters = { retained, hard };
  return R;
}, { BASE, MUT, TOKEN_WORD, SHAPE_SIGNAL });
await browser.close();

if (!out.hasHook || !out.hasEval) {
  console.log(`  instrumented=${out.instrumented} hook=${out.hasHook} evaluate=${out.hasEval}`);
  console.log('\n  FATAL: the run did not reach the cascade; closure exports never assigned.\n');
  process.exit(1);
}

const shortF = a => JSON.stringify((a||[]).map(f => ({ type:f.type, reason:f.reason, soft:!!f.soft })));
console.log(`  object tokens (${out.tokens.length}): ${JSON.stringify(out.tokens.slice(0,14))}`);
console.log(`  resolved shape: ${out.shape}`);
console.log(`  shape patterns: ${JSON.stringify(out.shapePatterns)}\n`);
console.log(`  BASELINE  words=${out.baseline.words}  hook=${JSON.stringify(out.baseline.hook.ok)} ${out.baseline.hook.reason}`);
console.log(`            fails=${shortF(out.baseline.fails)}`);
console.log(`  MUTATED   words=${out.mutated.words}  hook=${JSON.stringify(out.mutated.hook.ok)} ${out.mutated.hook.reason}`);
console.log(`            fails=${shortF(out.mutated.fails)}\n`);

t('TOKEN_WORD really is a live object token', out.tokenWordIsToken === true);
t('shape signal itself carries NO object token (would mask the mutation)', out.signalHasToken === false);
t('step 1 — baseline prose yields ZERO failures', out.baseline.fails.length === 0, shortF(out.baseline.fails));
t('step 3 — mutation is hook-specific: length preserved', out.diff.sameLength);
t('step 3 — mutation leaves the decision ending byte-identical', out.diff.sameEnding);
t('step 4 — mutated typed array has exactly ONE failure', out.mutated.fails.length === 1, shortF(out.mutated.fails));
t('step 4 — that failure is type `hook`', out.mutated.fails[0] && out.mutated.fails[0].type === 'hook', shortF(out.mutated.fails));
t('step 4 — it is HARD (no soft flag)', out.mutated.fails[0] && out.mutated.fails[0].soft !== true);
t('step 4 — reason is exactly `no_object_token`', out.mutated.fails[0] && out.mutated.fails[0].reason === 'no_object_token',
  out.mutated.fails[0] && out.mutated.fails[0].reason);
t('step 5 — survives the production retention filter (decision-strip)', out.filters.retained.length === 1, shortF(out.filters.retained));
t('step 5 — survives the hard filter (_hardInitialFails)', out.filters.hard.length === 1, shortF(out.filters.hard));

fs.writeFileSync('_hook_fixture.json', JSON.stringify({
  reason: 'no_object_token', shape: out.shape, baselineFails: out.baseline.fails,
  mutatedFails: out.mutated.fails, tokens: out.tokens, base: BASE, mutated: MUT }, null, 1));
console.log(`\n  -> _hook_fixture.json`);
console.log(`\n${'─'.repeat(88)}\n  ${pass} passed · ${fail} failed\n`);
process.exit(fail ? 1 : 0);
