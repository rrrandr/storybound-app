// C+ SOURCE-FIDELITY PROBE — ONE real planner call, First Sacrifice Scene 1, against a2c3a0b.
//
// Exactly ONE paid network call: the opening planner (Mistral). Everything upstream is mocked.
// GROK IS HARD-BLOCKED — the author request is CAPTURED (so the exact compact block that would
// have reached it can be printed) and then ABORTED before it leaves.
//
// The question this exists to answer, and the only one no free test can: does the planner DERIVE
// the reading from the cited canonical truth, or cite the right ID and write generic psychology?
//
// usage: node _cplus_planner_probe.mjs
import { chromium } from 'playwright-core';
import fs from 'fs';

const DIR = '_cplus_planner_probe';
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
const page = await (await browser.newContext()).newPage();
page.setDefaultTimeout(200000); page.setDefaultNavigationTimeout(200000);
const planner = [], authorAttempts = [], escaped = [], logs = [];

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
  // ── GROK: CAPTURED, THEN BLOCKED. The bytes are read from the request that was about to go
  //    out, so what is printed below is what Grok would actually have received — not a
  //    reconstruction, and not a second call.
  if (AUTHOR_SIG.test(sys)) { authorAttempts.push({ url, system: sys, user: usr }); return route.abort(); }
  // ── THE ONE REAL CALL ──
  if (PLANNER_SIG.test(sys)) {
    const t0 = Date.now();
    const resp = await route.fetch({ timeout: 200000 });
    const text = await resp.text();
    planner.push({ url, model: b && b.model, system: sys, user: usr, status: resp.status(),
                   rawResponse: text, ms: Date.now() - t0 });
    return route.fulfill({ response: resp, body: text });
  }
  const out = JSON.stringify(GENERIC);
  const env = /mistral-proxy/.test(url)
    ? { id:'mock', object:'chat.completion', choices:[{ index:0, finish_reason:'stop', message:{ role:'assistant', content: out } }] }
    : { ok:true, content: out, choices:[{ message:{ content: out } }] };
  return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(env) });
});
page.on('request', r => { if (/\/api\//.test(r.url()) && !/localhost|127\.0\.0\.1/.test(r.url())) escaped.push(r.url()); });
page.on('console', m => { const x=m.text(); if (/SCENE1|CPLUS|SKELETON|PLANNER/.test(x)) logs.push(x.slice(0,400)); });
page.on('pageerror', e => logs.push('PAGEERROR ' + String(e.message).slice(0,200)));

await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
await page.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_STORIES, { timeout:150000 });

const R = await page.evaluate(async () => {
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
    renderMode:'literary', currentEngine:'literary', storyId:'cplusprobe', myUid:'probe',
    _starterId: def.id, is_starter_story: true, immutableTitle: def.title });
  s.picks.identity = s.identity; s._skipCorridorValidation = true;
  let threw = null;
  try { await Promise.race([window.handleBeginStory(), new Promise(x=>setTimeout(x,190000))]); }
  catch(e){ threw = String(e && e.message); }
  const stage = s._scene1StageResolved || (window._scene1StageContract ? window._scene1StageContract(s) : null);
  return { threw,
    fatal: s._scene1SkeletonFatal || null,
    attempts: s._scene1PlannerAttempts || null,
    retryReason: s._scene1PlannerRetryReason || null,
    pcMaskResolved: (s.picks && (s.picks.playermask || s.picks.playerMask)) || s.playerMask || s.playermask || '',
    liArchetype: (s.archetype && s.archetype.primary) || '',
    contract: window.__lastCPlusContract || null,
    groundText: s._scene1CPlusGroundText || '',
    staged: (s._scene1StagedCharacters || []).map(c => ({ name:c.name, presence_mode:c.presence_mode })),
    onStage: stage ? (stage.onStage||[]).map(c=>c.label) : null,
    setting: stage ? stage.setting : null,
    cp: s.sceneSkeleton ? (s.sceneSkeleton.character_plus || []) : null,
    pof: s.sceneSkeleton ? s.sceneSkeleton.pc_opening_fusion : null,
  };
});
await browser.close();

const P = planner[0] || null;
let usage = null; try { usage = JSON.parse(P.rawResponse).usage; } catch (_) {}
const cost = usage ? (usage.prompt_tokens*PRICE.in + usage.completion_tokens*PRICE.out) : null;

fs.writeFileSync(`${DIR}/planner_request.txt`, P ? (P.system + '\n\n===== USER =====\n\n' + P.user) : '(none)');
fs.writeFileSync(`${DIR}/planner_response.json`, P ? P.rawResponse : '(none)');
fs.writeFileSync(`${DIR}/grok_system_BLOCKED.txt`, authorAttempts[0] ? authorAttempts[0].system : '(no author attempt)');
fs.writeFileSync(`${DIR}/evidence.json`, JSON.stringify(R, null, 2));

const GENERIC_GESTURE = /breath (?:hitch|catch|snag)|catches? (?:her|his|their) breath|voice (?:drop|lower|fell|falter)|fingers? (?:flex|twitch|curl)|jaw (?:tight|harden|clench)|gaze (?:harden|sharpen)|eyes (?:harden|narrow)|shoulders? (?:stiffen|tense)|swallow(?:s|ed)? (?:hard|thickly)/i;
const line = s => String(s == null ? '' : s);
const STOPW = new Set('the a an and or of in on at to is was are were be been it its this that these those she her hers he his him they them their as for with from by but not no so than then into onto over under about what which who whom has have had can could would will does did do if when while because own'.split(' '));
const stem = w => w.replace(/(?:ations?|ings?|ness|ment|edly|ies|ied|ers?|est|ly|ed|es|s)$/,'');
const toks = t => String(t||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(w=>w.length>2&&!STOPW.has(w)).map(stem);
const overlap = (a,b) => { const B=[...new Set(toks(b))]; if(!B.length) return 0; const A=new Set(toks(a)); return B.filter(w=>A.has(w)).length/B.length; };
const IMPL = ['blade','knife','dagger','sword','bowl','chalice','cup','vial','censer','brazier','lamp','lantern','candle','bell','drum','horn','staff','rod','wand','orb','bead','scroll','tome','book','ledger','tablet','quill','pen','ink','seal','key','chain','rope','cord','whip','mask','crown','ring','amulet','mirror','glass','altar','torch','urn','box'];
const prop = (b,g) => { const B=String(b||'').toLowerCase(), G=String(g||'').toLowerCase();
  for (const w of IMPL) { const re=new RegExp('\\b'+w+'s?\\b','i'); if (re.test(B) && !re.test(G)) return '⚠ ' + w; } return null; };
const wrap = (s, w, pad) => { const out=[]; let cur='';
  line(s).split(/\s+/).forEach(t => { if ((cur+' '+t).trim().length > w) { out.push(cur.trim()); cur=t; } else cur += ' ' + t; });
  if (cur.trim()) out.push(cur.trim()); return out.map((l,i)=> (i?pad:'') + l).join('\n'); };

console.log(`\n${'═'.repeat(96)}\nC+ SOURCE-FIDELITY PROBE — one planner call, First Sacrifice Scene 1 @ a2c3a0b\n${'═'.repeat(96)}\n`);
console.log(` planner calls        : ${planner.length}${R.attempts ? `  (product attempts: ${R.attempts}${R.retryReason ? ', retry: ' + R.retryReason : ''})` : ''}`);
console.log(` model                : ${P ? P.model : '(none)'}   status ${P ? P.status : '—'}   ${P ? P.ms : '—'}ms`);
console.log(` tokens               : ${usage ? `${usage.prompt_tokens} in / ${usage.completion_tokens} out` : '(unreported)'}`);
console.log(` cost                 : ${cost != null ? '$' + cost.toFixed(5) : '(unknown)'}`);
console.log(` GROK CALLS ATTEMPTED : ${authorAttempts.length} — ALL BLOCKED (bytes captured, request aborted)`);
console.log(` escaped requests     : ${escaped.length}`);
console.log(` fatal                : ${R.fatal || 'none'}`);
console.log(` PC mask (the lens)   : ${R.pcMaskResolved}      LI archetype (NOT the lens): ${R.liArchetype}`);
console.log(` facet regime         : ${R.contract ? R.contract.regime : '(no contract)'}   populations: ${R.contract ? JSON.stringify(R.contract.populations) : '—'}`);
console.log(` on stage             : ${JSON.stringify(R.onStage)}`);
console.log(` staged in the plan   : ${JSON.stringify((R.staged||[]).map(c=>c.name))}`);

const cp = R.cp || [];
console.log(`\n${'─'.repeat(96)}\nC+ ASSIGNMENTS (${cp.length})\n${'─'.repeat(96)}`);
for (const c of cp) {
  if (c.fulfilled_by === 'pc_opening_fusion') {
    console.log(`\n▸ ${c.character}  —  ACCOUNTING ENTRY (beat owned by pc_opening_fusion, not an ordinary C+)`);
    continue;
  }
  const cand = R.contract && R.contract.byLabel ? R.contract.byLabel[String(c.character).trim().toLowerCase()] : null;
  const rec  = cand ? (cand.facets||[]).find(f => f.facet_id === c.facet_id) : null;
  const nrm = x => String(x||'').replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/\s+/g,' ').trim().toLowerCase();
  const evOk = c.pressure_evidence ? nrm(R.groundText).includes(nrm(c.pressure_evidence)) : null;
  console.log(`\n▸ ${c.character}   [mode: ${c.mode || '(none)'}${c.not_physically_present ? '  · NOT PHYSICALLY PRESENT' : ''}]`);
  console.log(`    facet_id           : ${c.facet_id || '(none)'}  ${c.facet_category ? '[' + c.facet_category + ']' : ''}  source=${c.facet_source || '(none)'}`);
  console.log(`    trusted truth      : ${wrap(c.facet_truth, 74, ' '.repeat(25))}`);
  console.log(`    pressure_id        : ${c.pressure_id || '(none)'}`);
  console.log(`    trusted pressure   : ${c.facet_pressure || '(none attached)'}`);
  console.log(`    pressure_evidence  : ${wrap(c.pressure_evidence, 74, ' '.repeat(25))}`);
  console.log(`    behavior           : ${wrap(c.behavior, 74, ' '.repeat(25))}`);
  console.log(`    reveals (them)     : ${wrap(c.character_revelation || c.psychological_read, 74, ' '.repeat(25))}`);
  console.log(`    PC reading (her)   : ${wrap(c.pc_archetype_reaction, 74, ' '.repeat(25))}`);
  console.log(`    source_bridge      : ${wrap(c.source_bridge, 74, ' '.repeat(25))}`);
  console.log(`    ── mechanical checks ──`);
  console.log(`    · cited facet belongs to them    : ${cand ? (cand.facet_ids.includes(c.facet_id) ? 'YES' : 'NO') : '(no candidate record)'}`);
  console.log(`    · pressure_id is one this facet lists: ${rec ? ((rec.pressures||[]).some(p => p.pressure_id === c.pressure_id) ? 'YES' : 'NO') : '(n/a)'}`);
  console.log(`    · evidence is VERBATIM scene material: ${evOk === null ? '(none quoted)' : (evOk ? 'YES' : '⚠ NOT FOUND IN THE SCENE')}`);
  console.log(`    · mode was offered to them       : ${cand ? (cand.modes.includes(c.mode) ? 'YES — ' + cand.modes.join('|') : 'NO') : '(n/a)'}`);
  console.log(`    · revelation ≠ restatement       : ${rec ? (Math.round(overlap(c.character_revelation||c.psychological_read, rec.canonical_truth)*100) + '% of the truth\'s content words') : '(n/a)'}`);
  console.log(`    · reaction reaches the narrator  : ${/\b(?:she|her|i|me|my)\b/i.test(line(c.pc_archetype_reaction)) ? 'YES' : '⚠ NO'}`);
  console.log(`    · ungrounded implement in behavior: ${prop(c.behavior, R.groundText) || 'none'}`);
  console.log(`    · generic-gesture detector       : ${GENERIC_GESTURE.test(line(c.behavior)) ? '⚠ MATCH — ' + (line(c.behavior).match(GENERIC_GESTURE)||[''])[0] : 'clean'}`);
  console.log(`    · absent recipient materialised  : ${c.not_physically_present ? ((R.staged||[]).some(x => String(x.name).toLowerCase() === String(c.character).toLowerCase()) ? '⚠ YES' : 'no — stays absent') : '(present by design)'}`);
  if (rec) console.log(`    · all conditions this facet lists: ${(rec.pressures||[]).map(x=>x.pressure_id).join(' · ')}`);
}

// ── the exact compact block that would have reached Grok ──
const gsys = authorAttempts[0] ? authorAttempts[0].system : '';
const blk = gsys.match(/\nCHARACTER\+ ASSIGNED THIS SCENE[\s\S]*?(?=\nENVIRONMENT\+ ASSIGNED|\n[A-Z][A-Z +]{6,}\n|$)/);
console.log(`\n${'─'.repeat(96)}\nTHE EXACT BLOCK THAT WOULD REACH GROK (captured from the aborted request)\n${'─'.repeat(96)}`);
console.log(blk ? blk[0].replace(/^/gm, '  ') : '  (no CHARACTER+ block found in the author system prompt)');
console.log(`\n  micro-bible leakage check — facet list in the author bytes : ${/AUTHORED PSYCHOLOGY/.test(gsys) ? '⚠ PRESENT' : 'absent (correct)'}`);
console.log(`  applicability conditions in the author bytes             : ${/applicability conditions/.test(gsys) ? '⚠ PRESENT' : 'absent (correct)'}`);
console.log(`\n  artifacts → ${DIR}/{planner_request.txt, planner_response.json, grok_system_BLOCKED.txt, evidence.json}\n`);
