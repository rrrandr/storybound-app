// B0 VERIFICATION — structural equivalence + same-run dispatch invariant.
//
// Cross-run byte comparison was shown invalid for this path (three determinism regimes all
// failed self-control), so B0 is proven two ways that do not depend on scheduling:
//
//   PART 1 — STRUCTURAL: every expression that produced an old branch-local callChat argument
//            is byte-identical to the new descriptor field, branch laziness preserved, three
//            branch-local dispatches collapsed to exactly one common dispatch.
//   PART 2 — SAME-RUN INVARIANT: inside ONE execution, descriptor === callChat arguments ===
//            upstream request. No second builder invocation, no post-dispatch reconstruction,
//            no comparison across runs.
//
// usage: node _b0_verification.mjs
import { chromium } from 'playwright-core';
import { execFileSync } from 'child_process';
import fs from 'fs';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };
const norm = s => String(s).replace(/\s+/g, ' ').trim();

// ───────────────────────── PART 1 — STRUCTURAL ─────────────────────────
console.log(`\n${'═'.repeat(86)}\nB0 VERIFICATION\n${'═'.repeat(86)}\n\n PART 1 — STRUCTURAL EQUIVALENCE (df5fd45 -> ab9136e)`);
{
  const get = c => execFileSync('git', ['show', `${c}:public/app.js`], { encoding: 'utf8', maxBuffer: 1 << 30 }).split('\n');
  const region = lines => {
    const i = lines.findIndex(l => l.includes('Dead Scene-1 Grok-candidate call-site REMOVED'));
    let depth = 0, started = false; const out = [];
    for (let k = i; k < i + 140; k++) {
      const l = lines[k]; out.push(l); depth += (l.match(/\{/g) || []).length - (l.match(/\}/g) || []).length;
      if (l.includes('{')) started = true;
      if (started && depth <= 0 && k > i + 3) break;
    }
    return out.join('\n');
  };
  const bl = region(get('df5fd45')), cl = region(get('ab9136e'));
  const bSys = [...bl.matchAll(/role\s*:\s*'system'\s*,\s*content\s*:\s*([^\n]+?)\}/g)].map(m => m[1]);
  const bUsr = [...bl.matchAll(/role\s*:\s*'user'\s*,\s*content\s*:\s*([\s\S]*?)\}\s*\n\s*\]/g)].map(m => m[1]);
  const bOpt = [...bl.matchAll(/\]\s*,\s*([0-9.]+)\s*,\s*(\{[^}]*\})/g)].map(m => [m[1], m[2]]);
  const desc = [...cl.matchAll(/_s1Req\s*=\s*\{([\s\S]*?)\};/g)].map(m => m[1]);
  const field = (d, n) => { const m = d.match(new RegExp(n + "\\s*:\\s*([\\s\\S]*?)(?:,\\s*\\n|,\\s*[a-z_]+\\s*:|$)")); return m ? norm(m[1]).replace(/,$/, '') : '(none)'; };
  const names = ['lite', 'hotfast', 'heavy'];
  let m12 = 0;
  for (let i = 0; i < 3; i++) {
    const d = desc[i] || '';
    const pairs = [['system', bSys[i], field(d, 'system')], ['user', bUsr[i], field(d, 'user')],
                   ['temperature', bOpt[i] && bOpt[i][0], field(d, 'temperature')],
                   ['opts', bOpt[i] && norm(bOpt[i][1]), field(d, 'opts')]];
    for (const [lab, bv, cv] of pairs) {
      const same = norm(bv || '').replace(/,$/, '') === cv;
      if (same) m12++; else console.log(`      ${names[i]}.${lab} DIFFERS\n        base: ${norm(bv||'').slice(0,90)}\n        cand: ${cv.slice(0,90)}`);
    }
  }
  t('12/12 expressions byte-identical across lite/hotfast/heavy', m12 === 12, `matched ${m12}/12`);
  const before = cl.slice(0, cl.indexOf('var _s1Req = null;'));
  const codeLines = s => s.split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
  t('no builder hoisted above the branch chain (comments excluded)',
    !/_buildAuthorFloorDirective\s*\(|_buildHotFastDirective\s*\(/.test(codeLines(before)));
  t('HOTFAST tail evaluated exactly once in code', (codeLines(cl).match(/_buildHotFastDirective\s*\(/g) || []).length === 1);
  t('HEAVY-only tail evaluated exactly once in code', (codeLines(cl).match(/_s1LenGuide/g) || []).length === 1);
  t('baseline had 3 branch-local dispatches', (bl.match(/callChat\(/g) || []).length === 3);
}

// ───────────────────────── PART 2 — SAME-RUN INVARIANT ─────────────────────────
const SRC = fs.readFileSync('public/app.js', 'utf8');
const PROBE_ANCHOR = `            text = await callChat([
                { role: 'system', content: _s1Frozen.system },
                { role: 'user', content: _s1Frozen.user }
            ], _s1Frozen.temperature, _s1Req.opts);`;
if (!SRC.includes(PROBE_ANCHOR)) { console.log('\n  ✗ probe anchor not found — dispatch shape changed'); process.exit(1); }
const PROBED = SRC.replace(PROBE_ANCHOR, `            var __probeMsgs = [
                { role: 'system', content: _s1Frozen.system },
                { role: 'user', content: _s1Frozen.user }
            ];
            var __probeTemp = _s1Frozen.temperature, __probeOpts = _s1Req.opts;
            try { window.__b0Probe = { variant: _s1Frozen.variant,
                descSystem: _s1Frozen.system, descUser: _s1Frozen.user,
                descTemp: _s1Frozen.temperature, descMax: _s1Frozen.maxTokens,
                ccSystem: __probeMsgs[0].content, ccUser: __probeMsgs[1].content,
                ccTemp: __probeTemp, ccOpts: JSON.parse(JSON.stringify(__probeOpts)),
                driftSeen: (_s1Req.system !== _s1Frozen.system || _s1Req.user !== _s1Frozen.user
                            || _s1Req.opts.max_tokens !== _s1Frozen.maxTokens) }; } catch (_) {}
            text = await callChat(__probeMsgs, __probeTemp, __probeOpts);`);
function force(src, fn, v) {
  const needle = `function ${fn}() {`;
  if (src.split(needle).length - 1 !== 1) throw new Error(`${fn}: not exactly one definition`);
  return src.replace(needle, `${needle} return ${v};`);
}
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
const GENERIC = { goal:L, antagonistOrAntiForce:'the assembly', milestones:[], scenes:[], timelineLength:20,
  characters:[], name:'Julian', distinguishing_feature:'a burn scar', private_hope:L,
  defining_anecdote:L, attraction_manifestation:L, desire_register_exemplars:[L] };
const PROSE = (() => { const s=['Lirael','Seren','Julian','the Dohkar'],v=['turned toward','considered','reached for'],o=['the hearth','the relic','the gate'];
  const out=[]; for(let i=0;i<44;i++) out.push(`${s[i%4]} ${v[(i*3)%3]} ${o[(i*5)%3]} at ${i+3} breaths.`); return out.join(' '); })();

async function sameRun(label, source) {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  const upstream = [];
  await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: source }));
  await page.route('**/api/**', async route => {
    const url = route.request().url().replace(/^https?:\/\/[^/]+/, '');
    if (PASSTHROUGH.test(url)) return route.continue();
    const k = Object.keys(LOCAL).find(x => url.startsWith(x));
    if (k) return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(LOCAL[k]) });
    let body=null; try { body = JSON.parse(route.request().postData()||'{}'); } catch(_){}
    if (!MODEL.test(url)) return route.abort();
    const m=(body&&body.messages)||[];
    const sys=String((m.find(x=>x.role==='system')||{}).content||'');
    const usr=String((m.find(x=>x.role==='user')||{}).content||'');
    const isAuthor = usr === 'Begin the story. Write Scene 1.' || /ARCHITECTURE LAWS/.test(sys);
    if (isAuthor) upstream.push({ system: sys, user: usr, temperature: body.temperature, max_tokens: body.max_tokens });
    const c = /scene-structure planner for the OPENING scene/.test(sys) ? JSON.stringify(SCAFFOLD)
      : (/ruthless line-editor|Fix ONLY mechanical/.test(sys) || body.role === 'SPECIALIST_RENDERER'
         || body.role === 'LINE_EDITOR' || body.role === 'INTIMACY_SPECIALIST' || isAuthor) ? PROSE
      : JSON.stringify(GENERIC);
    return route.fulfill({ status:200, contentType:'application/json',
      body: JSON.stringify({ content:c, choices:[{message:{content:c}}] }) });
  });
  await page.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await page.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_STORIES, { timeout:40000 });
  const r = await page.evaluate(async () => {
    const s = window.state;
    const def = (window.STARTER_STORIES||[]).find(d=>d&&d.id==='starter_first_sacrifice');
    s.picks = s.picks||{};
    ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies'].forEach(k=>{ s.picks[k]=def[k]; });
    Object.assign(s,{ world:def.world, worldSubtype:def.worldSubtype, flavor:def.flavor, dynamic:def.dynamic,
      _starterId:def.id, is_starter_story:true, immutableTitle:def.title, archetype:{primary:def.archetype,modifier:null},
      name:'Lirael', playerName:'Lirael', loveInterestName:'Julian', partnerName:'Julian', loveInterest:'Male',
      liGender:'male', playerMask:'OPEN_VEIN', storyLength:'fling', tier:'fling', access:'sub', subscribed:true,
      fortunes:9999999, intensity:'Steamy', pov:'first_person', identity:{playerName:'Lirael',partnerName:'Julian'},
      renderMode:'literary', currentEngine:'literary', storyId:'b0ver', myUid:'probe' });
    s.picks.identity = s.identity; s._skipCorridorValidation = true;
    try { await Promise.race([window.handleBeginStory(), new Promise(x=>setTimeout(x,90000))]); } catch(_){}
    s._skipCorridorValidation = false;
    const P = s._lastScene1AuditPrompt||null;
    return { probe: window.__b0Probe||null,
      audit: P?{ variant:P.variant, capturedAt:P.capturedAt, system:P.system, user:P.user, maxTokens:P.maxTokens }:null };
  });
  await browser.close();
  return { ...r, upstream };
}

for (const [label, src, expect] of [
  ['production HEAVY', PROBED, 'heavy'],
  ['forced HOTFAST', force(force(PROBED, '_litLiteActive', 'false'), '_hotFastActive', 'true'), 'hotfast'],
]) {
  console.log(`\n PART 2 — SAME-RUN INVARIANT · ${label}`);
  const r = await sameRun(label, src);
  const p = r.probe, up = r.upstream[0], a = r.audit;
  if (!p) { t(`${label}: probe captured`, false, 'no probe — dispatch not reached'); continue; }
  t(`${label}: descriptor variant is ${expect}`, p.variant === expect, `got ${p.variant}`);
  t(`${label}: descriptor system === callChat system`, p.descSystem === p.ccSystem);
  t(`${label}: descriptor user === callChat user`, p.descUser === p.ccUser);
  t(`${label}: descriptor temperature === callChat temperature`, p.descTemp === p.ccTemp, `${p.descTemp} vs ${p.ccTemp}`);
  t(`${label}: descriptor max_tokens === callChat options`, p.descMax === p.ccOpts.max_tokens, `${p.descMax} vs ${JSON.stringify(p.ccOpts)}`);
  t(`${label}: drift guard saw no mutation`, p.driftSeen === false);
  t(`${label}: exactly one primary author dispatch`, r.upstream.length === 1, `got ${r.upstream.length}`);
  if (up) {
    t(`${label}: callChat system === upstream system`, p.ccSystem === up.system);
    t(`${label}: callChat user === upstream user`, p.ccUser === up.user);
    t(`${label}: max_tokens survives to upstream`, up.max_tokens === p.descMax, `${up.max_tokens} vs ${p.descMax}`);
    t(`${label}: temperature override is the only transformation`,
      up.temperature !== p.ccTemp && up.temperature === 0.8, `app=${p.ccTemp} wire=${up.temperature}`);
  }
  t(`${label}: audit capturedAt pre-dispatch`, a && a.capturedAt === 'pre-dispatch');
  t(`${label}: audit === descriptor`, a && a.system === p.descSystem && a.user === p.descUser && a.maxTokens === p.descMax);
}
console.log(`\n${'─'.repeat(86)}\n  ${pass} passed · ${fail} failed`);
console.log(`  Cross-run Scene-1 prompt nondeterminism remains a SEPARATE unresolved observation.\n`);
process.exit(fail ? 1 : 0);
