// LIT-LITE DEPRECATION — every legacy activation mechanism must be inert.
//
// LIT-LITE omitted the systems that define the product (S. Tory Bound voice, A-50, authored
// spine, Character+/Environment+), so it is no longer a user-reachable rendering tier. It was
// only ever default-off, which meant a stale localStorage key or a restored story flag could
// still select it.
//
// Every former activation path is exercised here against the REAL predicate, plus an
// end-to-end check that Scene 1 selects HEAVY with the flags set.
//
// usage: node _litlite_deprecation.mjs
import { chromium } from 'playwright-core';

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
console.log(`\n${'═'.repeat(84)}\nLIT-LITE DEPRECATION\n${'═'.repeat(84)}\n`);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.state && window.handleBeginStory, { timeout: 40000 });

// ── the predicate itself, against every legacy mechanism ──
const probe = await page.evaluate(() => {
  const out = {};
  const call = () => { try { return window.__isLitLiteActiveProbe ? window.__isLitLiteActiveProbe() : null; } catch (_) { return null; } };
  // No probe export by design; drive the real thing through a Scene-1-shaped check instead.
  out.hasProductionToggle = typeof window._litLite === 'object' && !!window._litLite;
  // 1. window.__litLite = true
  window.__litLite = true;
  out.afterWindowFlag = window.__litLite;
  // 2. state._litLiteMode = true
  window.state._litLiteMode = true;
  // 3. localStorage
  try { localStorage.setItem('sb_lit_lite', '1'); } catch (_) {}
  out.lsBefore = (() => { try { return localStorage.getItem('sb_lit_lite'); } catch (_) { return null; } })();
  // 4. the dev toggle's enable()
  let enableReturn = null;
  try { enableReturn = window._litLite.enable(); } catch (e) { enableReturn = 'threw: ' + e.message; }
  out.enableReturn = enableReturn;
  out.lsAfterEnable = (() => { try { return localStorage.getItem('sb_lit_lite'); } catch (_) { return null; } })();
  return out;
});
t('dev toggle object still exists (no throw for old callers)', probe.hasProductionToggle);
t('enable() returns false — cannot activate', probe.enableReturn === false, String(probe.enableReturn));
t('enable() clears the stale localStorage key', probe.lsAfterEnable === null,
  `before=${probe.lsBefore} after=${probe.lsAfterEnable}`);

// ── end to end: all three flags set, Scene 1 must still select HEAVY ──
const authors = [];
await page.route('**/api/**', async route => {
  const url = route.request().url().replace(/^https?:\/\/[^/]+/, '');
  if (PASSTHROUGH.test(url)) return route.continue();
  const k = Object.keys(LOCAL).find(x => url.startsWith(x));
  if (k) return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(LOCAL[k]) });
  let body=null; try { body = JSON.parse(route.request().postData()||'{}'); } catch(_){}
  if (!MODEL.test(url)) return route.abort();
  const kind = classify(body);
  if (kind === 'AUTHOR' || kind === 'AUTHOR_LITE') authors.push(kind);
  const c = kind==='SCAFFOLD'?JSON.stringify(SCAFFOLD):kind==='JSON'?JSON.stringify(GENERIC):PROSE;
  return route.fulfill({ status:200, contentType:'application/json',
    body: JSON.stringify({ content:c, choices:[{message:{content:c}}] }) });
});
const res = await page.evaluate(async () => {
  const s = window.state;
  const def = (window.STARTER_STORIES||[]).find(d=>d&&d.id==='starter_first_sacrifice');
  // ALL THREE legacy activation mechanisms simultaneously set.
  window.__litLite = true; s._litLiteMode = true;
  try { localStorage.setItem('sb_lit_lite', '1'); } catch (_) {}
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
    currentEngine:'literary', storyId:'litdep', myUid:'probe' });
  s.picks.identity = s.identity;
  s._skipCorridorValidation = true;
  try { await Promise.race([window.handleBeginStory(), new Promise(r=>setTimeout(r,90000))]); } catch(_){}
  s._skipCorridorValidation = false;
  return { fingerprint: window.__scene1RequestFingerprint || null,
           mode: window._litLiteLastSceneMode || null };
});
await browser.close();

console.log('');
t('descriptor variant is NOT lite', res.fingerprint && res.fingerprint.variant !== 'lite',
  JSON.stringify(res.fingerprint));
t('descriptor variant is heavy', res.fingerprint && res.fingerprint.variant === 'heavy',
  JSON.stringify(res.fingerprint));
t('_litLiteLastSceneMode never set to lite', res.mode !== 'lite', String(res.mode));
t('no LITE-shaped author request was sent', !authors.includes('AUTHOR_LITE'), JSON.stringify(authors));
t('exactly one author request', authors.length === 1, JSON.stringify(authors));
console.log(`\n${'─'.repeat(84)}\n  ${pass} passed · ${fail} failed\n`);
process.exit(fail ? 1 : 0);
