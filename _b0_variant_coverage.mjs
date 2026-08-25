// B0 VARIANT COVERAGE — deterministic byte-equivalence for LITE, HOTFAST and HEAVY.
//
// HEAVY was proven in ab9136e. LITE and HOTFAST select through closure-local predicates
// (_litLiteActive L68600, _hotFastActive L68614) that cannot be toggled from outside the
// page, so this harness forces them by transforming the SERVED source in memory. The exact
// same transformation is applied to baseline and candidate, and the replacement count is
// asserted to be 1 — a silent 0 or 2 would invalidate the comparison.
//
// The on-disk production source is never modified; the repository is never stashed.
//
// usage: node _b0_variant_coverage.mjs
import { chromium } from 'playwright-core';
import { execFileSync } from 'child_process';
import fs from 'fs';

const BASE_SRC = execFileSync('git', ['show', 'ab9136e~1:public/app.js'], { encoding: 'utf8', maxBuffer: 1 << 30 });
const CAND_SRC = fs.readFileSync('public/app.js', 'utf8');

// Force a predicate by injecting a return as its first statement. Exactly one hit required.
function force(src, fnName, value) {
  const needle = `function ${fnName}() {`;
  const n = src.split(needle).length - 1;
  if (n !== 1) throw new Error(`${fnName}: expected exactly 1 definition, found ${n}`);
  return src.replace(needle, `${needle} return ${value};`);
}
const VARIANTS = {
  lite:    s => force(force(s, '_litLiteActive', 'true'),  '_hotFastActive', 'false'),
  hotfast: s => force(force(s, '_litLiteActive', 'false'), '_hotFastActive', 'true'),
  heavy:   s => force(force(s, '_litLiteActive', 'false'), '_hotFastActive', 'false'),
};

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
  const role=body&&body.role;
  // LITE's system comes from _buildLitLitePrompt and carries no architecture laws, so it
  // must be recognised by its fixed one-line user instruction instead.
  const usr = String((m.find(x=>x.role==='user')||{}).content||'');
  if (usr === 'Begin the story. Write Scene 1.') return 'AUTHOR';
  if (/ARCHITECTURE LAWS/.test(sys)) return 'AUTHOR';
  if (/scene-structure planner for the OPENING scene/.test(sys)) return 'SCAFFOLD';
  if (/ruthless line-editor/.test(sys)||/Fix ONLY mechanical/.test(sys)) return 'PROSE';
  if (role==='SPECIALIST_RENDERER'||role==='LINE_EDITOR'||role==='INTIMACY_SPECIALIST') return 'PROSE';
  return 'JSON';
}

async function run(source) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => {
    let s = 0x2f6e2b1 >>> 0; window.__randCalls = 0;
    Math.random = function () { window.__randCalls++;
      s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s >>> 0) / 4294967296; };
    Date.now = () => 1756080000000;
    if (window.crypto) { let u = 0; window.crypto.randomUUID = () => `00000000-0000-4000-8000-${String(++u).padStart(12,'0')}`; }
  });
  const page = await ctx.newPage();
  const authors = [], escaped = [];
  await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: source }));
  await page.route('**/api/**', async route => {
    const url = route.request().url().replace(/^https?:\/\/[^/]+/, '');
    if (PASSTHROUGH.test(url)) return route.continue();
    const k = Object.keys(LOCAL).find(x => url.startsWith(x));
    if (k) return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(LOCAL[k]) });
    let body=null; try { body = JSON.parse(route.request().postData()||'{}'); } catch(_){}
    if (!MODEL.test(url)) return route.abort();
    const kind = classify(body);
    if (kind === 'AUTHOR') { const mm=body.messages||[];
      authors.push({ system:String((mm.find(x=>x.role==='system')||{}).content||''),
                     user:String((mm.find(x=>x.role==='user')||{}).content||''),
                     wireMax: body.max_tokens, wireTemp: body.temperature }); }
    const c = kind==='SCAFFOLD'?JSON.stringify(SCAFFOLD):kind==='JSON'?JSON.stringify(GENERIC):PROSE;
    return route.fulfill({ status:200, contentType:'application/json',
      body: JSON.stringify({ content:c, choices:[{message:{content:c}}] }) });
  });
  page.on('request', r => { if (/\/api\//.test(r.url()) && !/localhost|127\.0\.0\.1/.test(r.url())) escaped.push(r.url()); });
  await page.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await page.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_STORIES, { timeout:40000 });
  const st = await page.evaluate(async () => {
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
      currentEngine:'literary', storyId:'b0cov', myUid:'probe' });
    s.picks.identity = s.identity;
    s._skipCorridorValidation = true;
    try { await Promise.race([window.handleBeginStory(), new Promise(r=>setTimeout(r,90000))]); } catch(_){}
    s._skipCorridorValidation = false;
    const P = s._lastScene1AuditPrompt||null;
    return { randCalls: window.__randCalls, fingerprint: window.__scene1RequestFingerprint||null,
      audit: P?{ variant:P.variant||null, capturedAt:P.capturedAt||null,
                 sysLen:(P.system||'').length, usrLen:(P.user||'').length, maxTokens:P.maxTokens??null }:null };
  });
  await browser.close();
  return { author: authors[0]||null, authorCount: authors.length, escaped: escaped.length, ...st };
}
const firstDiff = (a,b) => { const n=Math.min(a.length,b.length);
  for (let i=0;i<n;i++) if (a[i]!==b[i]) return i; return a.length===b.length?-1:n; };

let pass=0, fail=0;
const t=(n,c,d)=>{ if(c){pass++;console.log(`    ✓ ${n}`);} else {fail++;console.log(`    ✗ ${n}${d?`\n        ${d}`:''}`);} };
console.log(`\n${'═'.repeat(88)}\nB0 VARIANT COVERAGE (deterministic)\n${'═'.repeat(88)}`);

for (const [name, transform] of Object.entries(VARIANTS)) {
  console.log(`\n  ── ${name.toUpperCase()} ──`);
  let b, c;
  try { b = await run(transform(BASE_SRC)); c = await run(transform(CAND_SRC)); }
  catch (e) { fail++; console.log(`    ✗ forcing transform failed: ${e.message}`); continue; }
  console.log(`    baseline  rand=${b.randCalls} authors=${b.authorCount} sys/usr=${b.author&&b.author.system.length}/${b.author&&b.author.user.length} max=${b.author&&b.author.wireMax}`);
  console.log(`    candidate rand=${c.randCalls} authors=${c.authorCount} sys/usr=${c.author&&c.author.system.length}/${c.author&&c.author.user.length} max=${c.author&&c.author.wireMax}  variant=${c.fingerprint&&c.fingerprint.variant}`);
  t('identical Math.random call count', b.randCalls === c.randCalls, `base=${b.randCalls} cand=${c.randCalls}`);
  t('same author request count', b.authorCount === c.authorCount);
  if (b.author && c.author) {
    const ds = firstDiff(b.author.system, c.author.system);
    t('SYSTEM byte-for-byte identical', ds === -1,
      ds===-1?'':`first diff @${ds}\n        base: ${JSON.stringify(b.author.system.slice(Math.max(0,ds-50),ds+50))}\n        cand: ${JSON.stringify(c.author.system.slice(Math.max(0,ds-50),ds+50))}`);
    const du = firstDiff(b.author.user, c.author.user);
    t('USER byte-for-byte identical', du === -1,
      du===-1?'':`first diff @${du}\n        base: ${JSON.stringify(b.author.user.slice(Math.max(0,du-50),du+50))}\n        cand: ${JSON.stringify(c.author.user.slice(Math.max(0,du-50),du+50))}`);
    t('wire max_tokens identical', b.author.wireMax === c.author.wireMax, `base=${b.author.wireMax} cand=${c.author.wireMax}`);
    // variant-specific contract
    if (name === 'lite') {
      t('descriptor variant is lite', c.fingerprint && c.fingerprint.variant === 'lite', JSON.stringify(c.fingerprint));
      t('user is the 31-char opening instruction', c.author.user === 'Begin the story. Write Scene 1.', JSON.stringify(c.author.user.slice(0,60)));
      t('LITE telemetry equals dispatched pair',
        c.audit && c.audit.sysLen === c.author.system.length && c.audit.usrLen === c.author.user.length,
        JSON.stringify(c.audit));
    }
    if (name === 'hotfast') {
      t('descriptor variant is hotfast', c.fingerprint && c.fingerprint.variant === 'hotfast', JSON.stringify(c.fingerprint));
      t('ceiling is 700', c.author.wireMax === 700, `got ${c.author.wireMax}`);
    }
    if (name === 'heavy') {
      t('descriptor variant is heavy', c.fingerprint && c.fingerprint.variant === 'heavy', JSON.stringify(c.fingerprint));
      t('ceiling is 2400', c.author.wireMax === 2400, `got ${c.author.wireMax}`);
    }
    t('audit is pre-dispatch and equals dispatch',
      c.audit && c.audit.capturedAt === 'pre-dispatch'
      && c.audit.sysLen === c.author.system.length && c.audit.usrLen === c.author.user.length,
      JSON.stringify(c.audit));
  } else t('author request captured', false, `base=${!!b.author} cand=${!!c.author}`);
  t('zero escaped requests', b.escaped === 0 && c.escaped === 0);
}
console.log(`\n${'─'.repeat(88)}\n  ${pass} passed · ${fail} failed\n`);
process.exit(fail ? 1 : 0);
