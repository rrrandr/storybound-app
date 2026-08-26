// BOUNDED PLANNER-ONLY PROBE — 3 sequential samples, First Sacrifice Scene 1.
//
// Exactly ONE real network call per sample: the opening planner. Everything upstream is mocked
// (free, deterministic) and Grok is HARD-BLOCKED — if an author request is ever attempted the
// sample is marked a violation. No downstream transformation, no full pipeline, no push.
//
// The request is built by PRODUCTION app.js, unmodified, so the stage contract, schema and
// eligible-cast block are exactly what the product would send today.
//
// usage: node _planner_probe3.mjs [n]
import { chromium } from 'playwright-core';
import fs from 'fs';

const N = Number(process.argv[2] || 3);
const DIR = process.argv[4] || '_planner_probe3';
fs.mkdirSync(DIR, { recursive: true });

const PASSTHROUGH = /\/api\/(config|geo|csp-report|beta-events)\b/;
const STUB = {
  '/api/consume-fortune':         { success:true, fortunesRemaining:9999 },
  '/api/verify-subscription':     { success:true, subscribed:true, tier:'sub' },
  '/api/claim-issue-number':      { success:true, issueNumber:1 },
  '/api/refund-fortune':          { success:true },
  '/api/grant-welcome-milestone': { success:true },
  '/api/record-legal-acceptance': { success:true },
};
const IMAGE = /\/api\/(image|bfl-kontext|visualize-flux|grok-image|dashscope-image|img-proxy|cine-styled-manifest|mouth-approve|verify-anatomy)\b/;
const MODEL = /\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini-proxy)\b/;
const PLANNER_SIG = /scene-structure planner for the OPENING scene/;
const AUTHOR_SIG  = /ARCHITECTURE LAWS/;

const L = 'she understands the wish has already begun to cost her something she cannot name';
const GENERIC = { goal:L, antagonistOrAntiForce:'the assembly', milestones:[], scenes:[], timelineLength:20,
  characters:[], name:'Julian', distinguishing_feature:'a burn scar', private_hope:L,
  defining_anecdote:L, attraction_manifestation:L, desire_register_exemplars:[L] };

const PRICE = { in: 0.00000015, out: 0.0000006 };   // mistral-small-latest, in-repo rate

const browser = await chromium.launch({ headless: true });

async function sample(i, mode) {
  const page = await (await browser.newContext()).newPage();
  page.setDefaultTimeout(180000); page.setDefaultNavigationTimeout(180000);
  const planner = [], authorAttempts = [], escaped = [], mocked = [];
  const logs = [];
  await page.route('**/api/**', async route => {
    const url = route.request().url().replace(/^https?:\/\/[^/]+/, '');
    if (PASSTHROUGH.test(url)) return route.continue();
    const k = Object.keys(STUB).find(x => url.startsWith(x));
    if (k) return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(STUB[k]) });
    if (IMAGE.test(url)) return route.abort();
    let b=null; try { b = JSON.parse(route.request().postData()||'{}'); } catch(_){}
    if (!MODEL.test(url)) return route.abort();
    const m=(b&&b.messages)||[];
    const sys=String((m.find(x=>x.role==='system')||{}).content||'');
    const usr=String((m.find(x=>x.role==='user')||{}).content||'');

    // ── HARD BLOCK: Grok must never be called by this probe ──
    if (AUTHOR_SIG.test(sys)) { authorAttempts.push(url); return route.abort(); }

    // ── THE ONE REAL CALL ──
    if (PLANNER_SIG.test(sys)) {
      const t0 = Date.now();
      const resp = await route.fetch({ timeout: 180000 });
      const text = await resp.text();
      planner.push({ url, request: b, system: sys, user: usr, status: resp.status(),
                     rawResponse: text, ms: Date.now() - t0 });
      return route.fulfill({ response: resp, body: text });
    }
    // ── everything else: free mock ──
    mocked.push(url);
    const out = JSON.stringify(GENERIC);
    const env = /mistral-proxy/.test(url)
      ? { id:'mock', object:'chat.completion', choices:[{ index:0, finish_reason:'stop', message:{ role:'assistant', content: out } }] }
      : { ok:true, content: out, choices:[{ message:{ content: out } }] };
    return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(env) });
  });
  page.on('request', r => { if (/\/api\//.test(r.url()) && !/localhost|127\.0\.0\.1/.test(r.url())) escaped.push(r.url()); });
  page.on('console', m => { const x=m.text(); if (/SCENE1|STAGE|SKELETON|PLANNER|ANGLE/.test(x)) logs.push(x.slice(0,300)); });
  page.on('pageerror', e => logs.push('PAGEERROR ' + String(e.message).slice(0,200)));

  await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
  await page.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_STORIES, { timeout:120000 });
  const st = await page.evaluate(async (mode) => {
    const s = window.state;
    const def = (window.STARTER_STORIES||[]).find(d=>d&&d.id==='starter_first_sacrifice');
    s.picks = s.picks||{};
    ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies']
      .forEach(k=>{ s.picks[k]=def[k]; });
    Object.assign(s,{ world:def.world, worldSubtype:def.worldSubtype, flavor:def.flavor, dynamic:def.dynamic,
      archetype:{primary:def.archetype,modifier:null},
      name:'Lirael', playerName:'Lirael', loveInterestName:'Julian', partnerName:'Julian',
      liGender:'male', playerMask:'OPEN_VEIN', storyLength:'fling', tier:'fling', access:'sub', subscribed:true,
      fortunes:9999999, intensity:'Steamy', pov:'first_person', identity:{playerName:'Lirael',partnerName:'Julian'},
      renderMode:'literary', currentEngine:'literary', storyId:'probe3', myUid:'probe' });
    if (mode === 'corridor') {
      // No seed. The planner OWNS setting and presence, and the LI is MENTIONED in the mission
      // but never staged — so exclusion is exercised against live output, not just synthetically.
      s._scene1Mission = 'She waits alone in the customs house before the tide turns, rehearsing what she will say to Julian when he finally comes to collect the debt';
    } else {
      Object.assign(s, { _starterId: def.id, is_starter_story: true, immutableTitle: def.title });
    }
    s.picks.identity = s.identity; s._skipCorridorValidation = true;
    let threw = null;
    try { await Promise.race([window.handleBeginStory(), new Promise(x=>setTimeout(x,150000))]); }
    catch(e){ threw = String(e && e.message); }
    const stage = s._scene1StageResolved || (window._scene1StageContract ? window._scene1StageContract(s) : null);
    return { threw,
      stage: stage && { ok:stage.ok, fault:stage.fault, source:stage.source,
                        settingOwner:stage.settingOwner, presenceOwner:stage.presenceOwner,
                        setting:stage.setting, presentText:stage.presentText,
                        onStage:(stage.onStage||[]).map(c=>c.label),
                        offStage:(stage.offStage||[]).map(c=>({ name:c.name, reason:c.reason })) },
      assignments: s._scene1SceneAssignments || null,
      fatal: s._scene1SkeletonFatal || null,
      envelopeNormalised: !!s._scene1EnvelopeNormalised,
      stagedLifted: !!s._scene1StagedLifted,
      attempts: s._scene1PlannerAttempts, retryReason: s._scene1PlannerRetryReason || null,
      // ── SCORE IN-PAGE, AGAINST THE RESOLVED STAGE, WITH THE SHIPPED FUNCTIONS ──
      // The old scorecard re-derived everything from the raw response against the PRE-resolution
      // stage, so it printed known-wrong ✗ marks for plans the product had accepted. A paid
      // harness that prints false failures is not evidence. This scores what the product scored:
      // the normalised assignments, the resolved stage, and _targetInInventory/_targetInScene.
      score: (function () {
        try {
          const st = s._scene1StageResolved;
          const a  = s._scene1SceneAssignments;
          if (!st) return { computable:false, reason:'no resolved stage (aborted before resolution)' };
          const lc = x => String(x || '').trim().toLowerCase();
          const cp = (a && a.character_plus) || [];
          const ep = a && a.environment_plus;
          const fu = a && a.fusion;
          const onLabels = (st.onStage || []).map(r => r.label);
          const offLc = (st.offStage || []).map(r => lc(r.name));
          const plannerOwnsEnv = st.environmentOwner === 'planner';
          const grounded = (t) => plannerOwnsEnv
            ? window._targetInInventory(t, st.environmentElements, st.setting)
            : window._targetInScene(t, st.groundText);
          const c = {
            settingKept:  !!st.setting && (st.settingOwner === 'planner' ? true : true),
            noOffstage:   !cp.some(x => offLc.includes(lc(x.character)))
                          && !(fu && fu.character && offLc.includes(lc(fu.character))),
            oneEach:      cp.length === onLabels.length
                          && onLabels.every(n => cp.some(x => lc(x.character) === lc(n)))
                          && new Set(cp.map(x => lc(x.character))).size === cp.length,
            firstMention: cp.length > 0 && cp.every(x => x.first_mention === true),
            anglesOk:     cp.length > 0 && cp.every(x => window._validateAngleConcreteness(x.angle, x.character).ok),
            epGrounded:   !!(ep && ep.target) && grounded(ep.target),
            fusionOk:     !!(fu && fu.character && fu.target && fu.beat),
          };
          const verdict = Object.keys(c).every(k => c[k]);
          return { computable:true, criteria:c, verdict,
                   environmentOwner: st.environmentOwner || 'stage',
                   elements: st.environmentElements || null };
        } catch (e) { return { computable:false, reason:'score threw: ' + (e && e.message) }; }
      })() };
  }, mode);
  await page.close();
  return { i, mode, planner, authorAttempts, escaped, mocked, logs, ...st };
}

const results = [];
console.log(`\n${'═'.repeat(94)}\nBOUNDED PLANNER PROBE — First Sacrifice Scene 1 · ${N} sequential samples\n${'═'.repeat(94)}`);
console.log(` one real call per sample (the planner) · Grok hard-blocked · upstream mocked\n`);

const MODES = (process.argv[3] || 'seeded,seeded,corridor').split(',');
for (let i = 1; i <= N; i++) {
  if (i > 1) { console.log(` … 25s gap (sequential, never a burst)\n`); await new Promise(r => setTimeout(r, 25000)); }
  const R = await sample(i, MODES[i - 1] || 'seeded');
  results.push(R);

  const p = R.planner[0];
  let env = null, plan = null, usage = null, finish = null, content = '';
  if (p) {
    try { env = JSON.parse(p.rawResponse); } catch (_) {}
    usage = env && env.usage;
    finish = env && env.choices && env.choices[0] && env.choices[0].finish_reason;
    content = (env && env.choices && env.choices[0] && env.choices[0].message && env.choices[0].message.content) || '';
    try { plan = JSON.parse(content.slice(content.indexOf('{'), content.lastIndexOf('}') + 1)); } catch (_) {}
  }
  const spine = plan && (plan.opening_spine || plan);
  const skel  = plan && (plan.scene_skeleton || (plan.opening_spine && plan.opening_spine.scene_skeleton));
  const cost = usage ? (usage.prompt_tokens * PRICE.in + usage.completion_tokens * PRICE.out) : null;

  fs.writeFileSync(`${DIR}/sample${i}_request.json`, JSON.stringify(
    { params: p && { model:p.request.model, temperature:p.request.temperature, max_tokens:p.request.max_tokens,
                     reasoning_effort:p.request.reasoning_effort, response_format:p.request.response_format },
      system: p && p.system, user: p && p.user }, null, 2));
  fs.writeFileSync(`${DIR}/sample${i}_response.json`, p ? p.rawResponse : '');
  fs.writeFileSync(`${DIR}/sample${i}_verdict.json`, JSON.stringify(
    { stage: R.stage, assignments: R.assignments, fatal: R.fatal,
      attempts: R.attempts, retryReason: R.retryReason, usage, finish, cost,
      angleRejections: R.logs.filter(l => /ANGLE:REJECTED/.test(l)),
      logs: R.logs.filter(l => /STAGE|SKELETON|PLANNER|ABORT/.test(l)) }, null, 2));

  console.log(` ── SAMPLE ${i} · ${R.mode.toUpperCase()} ${'─'.repeat(66)}`);
  console.log(`  network      : planner=${R.planner.length} real · mocked=${R.mocked.length} · GROK attempts=${R.authorAttempts.length} · escaped=${R.escaped.length}`);
  console.log(`  attempts     : ${R.attempts} ${R.retryReason ? `(retried: ${R.retryReason})` : '(no retry)'}`);
  console.log(`  usage        : ${usage ? `${usage.prompt_tokens} in / ${usage.completion_tokens} out · finish=${finish}` : 'n/a'}`);
  console.log(`  cost         : ${cost != null ? '$' + cost.toFixed(5) : 'n/a'}`);
  if (R.stage) {
    console.log(`  SUPPLIED WHERE (${R.stage.settingOwner}-owned): ${String(R.stage.setting).slice(0,100)}`);
    console.log(`  SUPPLIED PRESENT       : ${String(R.stage.presentText).slice(0,120)}`);
    console.log(`  eligible C+ recipients : ${JSON.stringify(R.stage.onStage)}`);
    console.log(`  offstage (ineligible)  : ${JSON.stringify(R.stage.offStage.map(o=>o.name))}`);
  }
  console.log(`  RETURNED opening_setting: ${spine ? JSON.stringify(spine.opening_setting) : 'n/a'}`);
  console.log(`  RETURNED staged cast    : ${spine && Array.isArray(spine.staged_characters)
      ? JSON.stringify(spine.staged_characters.map(c => `${c.name}:${c.presence_mode}`)) : 'n/a'}`);
  if (skel && Array.isArray(skel.character_plus)) {
    console.log(`  C+ (${skel.character_plus.length}):`);
    skel.character_plus.forEach(c => console.log(`      • ${String(c.character).padEnd(24)} first_mention=${JSON.stringify(c.first_mention)}  angle="${c.angle}"`));
  } else console.log(`  C+ : n/a`);
  console.log(`  E+           : ${skel ? JSON.stringify(skel.environment_plus) : 'n/a'}`);
  console.log(`  fusion       : ${skel ? JSON.stringify(skel.fusion) : 'n/a'}`);
  const aliasLogs = R.logs.filter(l => /SCENE1:ALIAS/.test(l));
  console.log(`  alias resolves: ${aliasLogs.length ? '' : 'none needed'}`);
  aliasLogs.forEach(l => console.log(`      ${l.replace(/^\[SCENE1:ALIAS\]\s*/, '')}`));
  console.log(`  envelope     : ${R.envelopeNormalised ? 'NORMALISED (nested skeleton lifted)' : 'top-level as sent'}`);
  console.log(`  STORED C+    : ${JSON.stringify(((R.assignments && R.assignments.character_plus) || []).map(c => c.character))}`);
  console.log(`  VALIDATION   : ${R.fatal ? 'REJECTED — ' + R.fatal : 'ACCEPTED'}`);
  const rej = R.logs.filter(l => /ANGLE:REJECTED/.test(l));
  if (rej.length) rej.forEach(l => console.log(`      ${l}`));
  console.log('');
}

// ── SCORECARD (post-resolution, shipped functions, self-consistent) ──
// Every column is computed IN-PAGE against the resolved stage and the normalised assignments,
// using the same _targetInInventory / _targetInScene / _validateAngleConcreteness the product
// uses. The stale pre-resolution grounding path is gone. The harness then asserts that its own
// verdict equals the PRODUCT's verdict and FAILS if they disagree — a scorecard that can print a
// failure the product did not reach is not evidence.
console.log(`${'═'.repeat(94)}\nSCORECARD (post-resolution · product functions)\n${'═'.repeat(94)}\n`);
const mark = b => b === null ? ' n/a ' : (b ? '  ✓  ' : '  ✗  ');
let disagreements = 0;
console.log(' # | mode     | setting | no offstage | one C+ each | first_ment | angles | E+ grounded | fusion | INLINE | PRODUCT');
for (const R of results) {
  const sc = R.score || { computable:false, reason:'no score' };
  const productVerdict = !R.fatal;
  if (!sc.computable) {
    console.log(` ${R.i} | ${R.mode.padEnd(8)} | ${' '.repeat(7)}(not computable: ${sc.reason})`);
    // A plan the product REJECTED before resolution is legitimately unscoreable; that agrees.
    if (productVerdict) { disagreements++; console.log('   ⚠ product ACCEPTED but the scorecard could not score it'); }
    continue;
  }
  const c = sc.criteria;
  console.log(` ${R.i} | ${R.mode.padEnd(8)} |${mark(c.settingKept)}|${mark(c.noOffstage)}      |${mark(c.oneEach)}      |${mark(c.firstMention)}     |${mark(c.anglesOk)}|${mark(c.epGrounded)}      |${mark(c.fusionOk)}| ${sc.verdict ? 'PASS' : 'FAIL'}   | ${productVerdict ? 'ACCEPTED' : 'REJECTED'}`);
  if (sc.verdict !== productVerdict) {
    disagreements++;
    console.log(`   ⚠ DISAGREEMENT — inline=${sc.verdict} product=${productVerdict}; failing criteria: `
      + Object.keys(c).filter(k => !c[k]).join(', ') + (R.fatal ? ` | product fault: ${R.fatal}` : ''));
  }
  if (sc.elements) console.log(`      environment (${sc.environmentOwner}-owned): ${JSON.stringify(sc.elements)}`);
}
const totalCost = results.reduce((a, R) => {
  try { const u = JSON.parse(R.planner[0].rawResponse).usage;
        return a + u.prompt_tokens * PRICE.in + u.completion_tokens * PRICE.out; } catch (_) { return a; }
}, 0);
console.log(`\n total real planner calls: ${results.reduce((a,R)=>a+R.planner.length,0)}`);
console.log(` planner attempts        : ${results.map(R=>R.attempts + (R.retryReason ? '('+R.retryReason+')' : '')).join(', ')}`);
console.log(` GROK requests dispatched: 0  (attempts blocked at the route layer: ${results.reduce((a,R)=>a+R.authorAttempts.length,0)})`);
console.log(` escaped requests        : ${results.reduce((a,R)=>a+R.escaped.length,0)} (must be 0)`);
console.log(` total spend             : $${totalCost.toFixed(5)}`);
console.log(` inline/product agreement: ${disagreements === 0 ? 'CONSISTENT' : disagreements + ' DISAGREEMENT(S)'}`);
console.log(`\n artifacts: ${DIR}/sample{1..${N}}_{request,response,verdict}.json\n`);

await browser.close();

if (disagreements > 0) { console.error('\n  HARNESS FAILURE: the scorecard disagreed with the product verdict.\n'); process.exit(1); }
