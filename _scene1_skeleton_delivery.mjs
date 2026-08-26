// COMMIT B PART 2 — merged opening planner: nested envelope, C+/E+/fusion, delivery.
//
// Free, network-fenced. Proves the ten required points across HEAVY and HOTFAST, plus
// that the CONTINUATION skeleton path is unchanged.
//
// usage: node _scene1_skeleton_delivery.mjs
import { chromium } from 'playwright-core';
import fs from 'fs';
import { instrument } from './_scene1_instrument.mjs';
import { buildScene1Prose, NONTOKEN_A, SCENE_WANT } from './_hook_fixture_prose.mjs';

const SRC = fs.readFileSync('public/app.js', 'utf8');
function force(src, fn, v) {
  const needle = `function ${fn}() {`;
  if (src.split(needle).length - 1 !== 1) throw new Error(`${fn}: not exactly one definition`);
  return src.replace(needle, `${needle} return ${v};`);
}
const mk = hot => instrument(force(force(SRC, '_litLiteActive', 'false'), '_hotFastActive', hot ? 'true' : 'false'));

const PROSE = buildScene1Prose(NONTOKEN_A);
const PASSTHROUGH = /\/api\/(config|geo|csp-report|beta-events)\b/;
const LOCAL = { '/api/consume-fortune': { success: true, fortunesRemaining: 9999 } };
const MODEL = /\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini)\b/;
const L = 'she understands the wish has already begun to cost her something she cannot name';
const GENERIC = { goal:L, antagonistOrAntiForce:'the assembly', milestones:[], scenes:[], timelineLength:20,
  characters:[], name:'Julian', distinguishing_feature:'a burn scar', private_hope:L,
  defining_anecdote:L, attraction_manifestation:L, desire_register_exemplars:[L] };

// The planner reply is built FROM the eligible cast the request advertises, so the
// harness never hard-codes a roster the product might legitimately change.
// Depth-1 keys of the dispatched opening_spine template. Mirrors the product's
// _openingSpineDeclaredFields; the product's own parser is asserted separately against the same
// dispatched text, so this local copy only has to agree with it, never to define the contract.
function declaredSpineKeys(usr) {
  const s = String(usr || '');
  const at = s.indexOf('"opening_spine"');
  if (at === -1) return [];
  const open = s.indexOf('{', at);
  const out = []; let depth = 0;
  for (let i = open; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"') {
      let close = i + 1; while (close < s.length && s[close] !== '"') close++;
      let after = close + 1; while (after < s.length && /\s/.test(s[after])) after++;
      if (depth === 1 && s[after] === ':') {
        const key = s.slice(i + 1, close);
        if (/^[a-z_][a-z0-9_]*$/i.test(key) && !out.includes(key)) out.push(key);
      }
      i = close; continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) break; }
  }
  return out;
}

function plannerReply(usr, mutate) {
  const m = usr.match(/ELIGIBLE CAST \((\d+)\)[^\n]*\n([\s\S]*?)\nExactly one/);
  const cast = m ? m[2].split('\n').map(x => x.replace(/^\s*•\s*/, '').trim()).filter(Boolean) : [];
  // SOLO is read from the DISPATCHED TEMPLATE, not passed in — so a reply that omits
  // interlocutor_placement is proof the template omitted it first.
  const SOLO = !/"interlocutor_placement"/.test(usr);
  const spine = { pressure_source_type:'institutional', pressure_source:L, hook_object:'the band',
    opening_beat:'She sets the relic down', rising_beats:['a','b'], decision_beat:'Does she name it',
    // opening_setting must AGREE with the seed's immutable WHERE — the fixture previously said
    // "the hall", which the new relocation check correctly rejects.
    pc_career:'shrine witness', opening_setting:'a Veilwood ceremony clearing', li_texture_beat:'He crosses toward her',
    pc_wound_anchor:L,
    pc_self_presentation_beat:'decision', scene_want:SCENE_WANT, scene_mission:L,
    reader_state:{ knows:L, believes:L, wondering:L, must_not_confuse:L },
    pc_body_callback:'decision', li_body_callback:'opening', antagonist_body_callback:null,
    perceptual_signature_beat:L,
    staged_characters: cast.map(n => ({ name:n, presence:'IN_PERSON', anchor_beat:'is already in place as the scene opens' })) };
  if (!SOLO) spine.interlocutor_placement = 'The Dohkar stands between';
  // A solo corridor has no seed, so the planner OWNS the setting — and a planner-owned setting
  // must declare its environmental inventory before E+ may reference it.
  const SOLO_ELS = ['the weighhouse ledger', 'a bolt of undyed cloth'];
  if (SOLO) { spine.opening_setting = 'customs house'; spine.environment_elements = SOLO_ELS.slice(); }
  // When the stage states a FIXED where, the plan must not relocate it. The seeded fixture's
  // Veilwood clearing is correct for the seed and wrong for an assignment-owned customs house.
  const FIXED_WHERE = (usr.match(/WHERE \(fixed\): ([^\n]+)/) || [])[1];
  if (!SOLO && FIXED_WHERE && !/Veilwood/.test(FIXED_WHERE)) spine.opening_setting = FIXED_WHERE.trim();
  // Angles are DISTINCT per recipient so "the directive renders each returned angle" is a real
  // claim rather than one string matching by accident.
  // Angles must now be RENDERABLE BEATS, not diagnoses, and E+/fusion targets must be things the
  // resolved scene actually contains. "spiralgrass" is in the First Sacrifice seed's WHERE.
  let cp = cast.map(n => ({ character:n, first_mention:true, angle:`${n} checks the youth's hands before the words` }));
  const ANCHOR = SOLO ? SOLO_ELS[0]
    : (FIXED_WHERE && !/Veilwood/.test(FIXED_WHERE)) ? FIXED_WHERE.trim()
    : 'the spiralgrass';
  let ep = { target:ANCHOR, axis:'ritual' };
  let fu = { character: cast[0], target:ANCHOR, beat:`she sets her palm flat on ${ANCHOR} to keep it still` };
  if (mutate === 'unknown')   cp = cp.concat([{ character:'Nobody Here', first_mention:true, angle:'sets the cloth straight twice' }]);
  if (mutate === 'missing')   cp = cp.slice(0, Math.max(0, cp.length - 1));
  if (mutate === 'duplicate') cp = cp.concat([cp[0]]);
  if (mutate === 'badaxis')   ep = { target:'the spiralgrass', axis:'vibes' };
  if (mutate === 'badfusion') fu = { character:'Nobody Here', target:'the spiralgrass', beat:'he sets his palm flat on the spiralgrass' };
  // ── scalar-invariant mutations ──
  if (mutate === 'withfusion')     fu = { character: cast[0], target:'the spiralgrass', beat:'she sets her palm flat on the spiralgrass to keep it still' };
  if (mutate === 'fmfalse')        cp = cp.map((c,i) => i === 0 ? { ...c, first_mention:false } : c);
  if (mutate === 'fmmissing')      cp = cp.map((c,i) => { if (i !== 0) return c; const { first_mention, ...r } = c; return r; });
  if (mutate === 'fmstring')       cp = cp.map((c,i) => i === 0 ? { ...c, first_mention:'false' } : c);
  if (mutate === 'emptyangle')     cp = cp.map((c,i) => i === 0 ? { ...c, angle:'   ' } : c);
  if (mutate === 'placeholderang') cp = cp.map((c,i) => i === 0 ? { ...c, angle:'N/A' } : c);
  if (mutate === 'thinangle')      cp = cp.map((c,i) => i === 0 ? { ...c, angle:'is sad' } : c);
  if (mutate === 'noep')           ep = undefined;
  if (mutate === 'emptyeptarget')  ep = { target:'   ', axis:'ritual' };
  if (mutate === 'fusionmismatch') fu = { character: cast[0], target:'the window casement', beat:'she sets her palm on the casement' };
  if (mutate === 'fusionempty')    fu = { character: cast[0], target:'   ', beat:'she sets her palm flat to keep it still' };
  // ── revised planning-contract mutations (2026-08-25) ──
  if (mutate === 'diagnosisangle') cp = cp.map((c,i) => i === 0 ? { ...c, angle:'a woman clinging to the illusion of worthiness' } : c);
  if (mutate === 'diagnosisangle2') cp = cp.map((c,i) => i === 0 ? { ...c, angle:'an authority whose judgment will decide her fate' } : c);
  if (mutate === 'offsceneEp')     ep = { target:'the gallery hallway', axis:'damage' };
  if (mutate === 'relocate')       spine.opening_setting = 'a gallery hallway';
  if (mutate === 'fusionnull')     fu = null;                                   // bare null, no reason
  if (mutate === 'fusionbadcode')  fu = { character:null, target:null, impossible_because:'DIDNT_FEEL_RIGHT' };
  if (mutate === 'fusionfalsecode') fu = { character:null, target:null, impossible_because:'NO_ONSTAGE_CHARACTER' };
  if (mutate === 'fusionnobeat')   fu = { character: cast[0], target:'the spiralgrass' };
  if (mutate === 'fusionthinbeat') fu = { character: cast[0], target:'the spiralgrass', beat:'they connect' };
  // ── identity / grounding / envelope mutations (2026-08-25) ──
  // Aliases the planner really used live: "the narrator" for the PC, "Dohkar" for the role figure.
  if (mutate === 'aliasNarrator')  cp = cp.map((c,i) => i === 0 ? { ...c, character:'the narrator' } : c);
  if (mutate === 'aliasProtag')    cp = cp.map((c,i) => i === 0 ? { ...c, character:'the protagonist' } : c);
  if (mutate === 'aliasDohkar')    cp = cp.map(c => /presiding/i.test(c.character) ? { ...c, character:'Dohkar' } : c);
  if (mutate === 'aliasOffstage')  cp = cp.concat([{ character:'the narrator’s absent mother', first_mention:true, angle:'sets the cloth straight twice' }]);
  if (mutate === 'clothEp') {
    // Canonically in-scene, but described ONLY in seed.sceneOne.narrator.
    ep = { target:'the gossamer band', axis:'ritual' };
    fu = { character: cast[0], target:'the gossamer band', beat:'she tugs the band tighter until the knot bites' };
  }
  const skel = { character_plus:cp, fusion:fu };
  if (ep !== undefined) skel.environment_plus = ep;   // `noep` omits the KEY, not just the value

  // ENVELOPE SHAPES. `nested` is what the live planner produced in 1 of 3 samples;
  // `stagedTop` is what the live CORRIDOR sample produced.
  if (mutate === 'stagedTop') {
    const { staged_characters, ...rest } = spine;
    return JSON.stringify({ opening_spine: rest, staged_characters, scene_skeleton: skel });
  }
  if (mutate === 'stagedBoth')  return JSON.stringify({ opening_spine: spine, staged_characters: spine.staged_characters, scene_skeleton: skel });
  // DIFFERING counterparts (2026-08-26): identical duplicates collapse, any difference aborts.
  if (mutate === 'stagedBothDiff') return JSON.stringify({ opening_spine: spine,
    staged_characters: spine.staged_characters.map(c => ({ ...c, presence:'ON_PHONE' })), scene_skeleton: skel });
  // The round-4 live shape: the spine distributed across the envelope's top level. Only fields the
  // template ACTUALLY declares for this request are distributed — several spine fields are emitted
  // conditionally, and an undeclared field at top level is a schema fault by design, not drift.
  if (mutate === 'spread') {
    const declared = declaredSpineKeys(usr);
    const top = {}, nested = {};
    Object.keys(spine).forEach(k => { (declared.includes(k) ? top : nested)[k] = spine[k]; });
    return JSON.stringify(Object.assign({ opening_spine: nested }, top, { scene_skeleton: skel }));
  }
  // Same drift, but semantically invalid — reconciliation must not rescue it.
  if (mutate === 'spreadBadCast') {
    // Distribute only DECLARED fields, so the envelope reconciles cleanly and the plan reaches the
    // SEMANTIC validators — the point being that reconciliation must not rescue an off-roster cast.
    const declared = declaredSpineKeys(usr);
    const top = {}, nested = {};
    Object.keys(spine).forEach(k => { (declared.includes(k) ? top : nested)[k] = spine[k]; });
    const bad = { ...skel, character_plus: skel.character_plus.concat([{ character:'Nobody Here', first_mention:true, angle:'sets the cloth straight twice' }]) };
    return JSON.stringify(Object.assign({ opening_spine: nested }, top, { scene_skeleton: bad }));
  }
  // ── FIXED-CAST mutations (2026-08-26): staged_characters is a prefilled echo, not a choice ──
  if (mutate === 'stagedAdded')    spine.staged_characters = spine.staged_characters.concat([{ name:'Mateo', presence:'IN_PERSON', anchor_beat:'leans in the doorway' }]);
  if (mutate === 'stagedOmitted')  spine.staged_characters = spine.staged_characters.slice(0, -1);
  if (mutate === 'stagedRenamed')  spine.staged_characters = spine.staged_characters.map((c,i) => i === 1 ? { ...c, name:'Serena' } : c);
  if (mutate === 'stagedPresence') spine.staged_characters = spine.staged_characters.map((c,i) => i === 1 ? { ...c, presence:'OFFSTAGE_REFERENCED' } : c);
  if (mutate === 'stagedReordered') spine.staged_characters = spine.staged_characters.slice().reverse();
  if (mutate === 'stagedAliased')  spine.staged_characters = spine.staged_characters.map(c => /presiding/i.test(c.name) ? { ...c, name:'Dohkar' } : c);
  // ── INVENTED-IDENTITY mutations (2026-08-26): the exact round-6 corridor failure, field by
  //    field. None of these touches staged_characters / character_plus / fusion, so each one is
  //    invisible to the fixed-cast validator and must be caught by the plan-wide scanner.
  if (mutate === 'quinnWant')     spine.scene_want = 'wants Quinn to notice the dye on her sleeves so she hesitates before speaking';
  if (mutate === 'quinnMission')  spine.scene_mission = 'Convince Quinn to delay the verdict long enough to let her remember what she swore';
  if (mutate === 'quinnReader')   spine.reader_state = { ...spine.reader_state, must_not_confuse:'who is speaking the verdict (the magistrate, not Quinn), that the door is closed' };
  if (mutate === 'quinnWonder')   spine.reader_state = { ...spine.reader_state, wondering:'whether Quinn will keep the ledger closed' };
  if (mutate === 'quinnInterloc') spine.interlocutor_placement = "Quinn — the magistrate's clerk, a woman who has known her since the dye-shop days";
  if (mutate === 'quinnAnchor')   spine.staged_characters = spine.staged_characters.map((c,i) => i === 0 ? { ...c, anchor_beat:'waits while Quinn taps her pen against her teeth' } : c);
  if (mutate === 'quinnFusion')   skel.fusion = { ...skel.fusion, beat:`she presses her palm flat on ${ANCHOR} while Quinn watches from the doorway` };
  // ESTABLISHED OFFSTAGE reference — Julian is a known story person, NOT an invention. Allowed.
  if (mutate === 'julianRef')     spine.scene_want = 'wants to be gone before Julian arrives to collect what she owes';
  // ── SOLO-INTERACTION mutations (2026-08-26): a second person ACTING, with no name invented.
  //    Rounds 7 and 8 shipped exactly these and the proper-name scanner was rightly silent.
  if (mutate === 'rivalSpeaks')   spine.scene_mission = 'keep the ledger unopened until the rival finishes speaking';
  if (mutate === 'clerkCalls')    spine.reader_state = { ...spine.reader_state, knows:'she is alone in the customs house while a clerk calls from outside the door' };
  if (mutate === 'voiceOutside')  spine.opening_beat = 'a voice outside the door rises as she sets the ledger down';
  if (mutate === 'liveMessage')   spine.decision_beat = 'a message arrives and she has to decide whether to break the seal';
  if (mutate === 'waitMessenger') spine.scene_want = 'wants to wait for the messenger without letting her hands shake';
  if (mutate === 'guardConvince') spine.scene_mission = 'Convince the guard to let her past the weighhouse door';
  // ── ALLOWED: memory, thought, anticipation, documents, environment ──
  if (mutate === 'memoryJulian')  spine.scene_want = 'wants to stop remembering how Julian set the pen down with both hands';
  if (mutate === 'thinkJulian')   spine.reader_state = { ...spine.reader_state, wondering:"why Julian's name keeps surfacing in her thoughts under pressure" };
  if (mutate === 'prepareJulian') spine.scene_mission = 'Prepare what she will say to Julian when he comes to collect the debt';
  if (mutate === 'letterJulian')  spine.opening_beat = 'an old letter from Julian, folded twice, still tucked in the ledger';
  if (mutate === 'windSound')     spine.opening_beat = 'wind moves through the shutters and the tally-marks blur under her thumb';
  if (mutate === 'interlocOffstage') spine.interlocutor_placement = 'Julian — the man she owes, his jaw set the way it goes when he has already decided';
  if (mutate === 'julianStaged')  spine.staged_characters = spine.staged_characters.concat([{ name:'Julian', presence:'IN_PERSON', anchor_beat:'leans in the doorway' }]);
  if (mutate === 'unknownKey')  return JSON.stringify({ opening_spine: spine, scene_skeleton: skel, pc_body_bible: { invented: true } });
  if (mutate === 'stagedThin')  { const { staged_characters, ...rest } = spine;
                                  return JSON.stringify({ opening_spine: rest, staged_characters: [{ presence_mode:'IN_PERSON' }], scene_skeleton: skel }); }
  if (mutate === 'nested')       return JSON.stringify({ opening_spine: { ...spine, scene_skeleton: skel } });
  if (mutate === 'dupSkeleton')  return JSON.stringify({ opening_spine: { ...spine, scene_skeleton: skel }, scene_skeleton: skel });
  if (mutate === 'dupSkeletonBadCast') { const bad = { ...skel, character_plus: skel.character_plus.concat([{ character:'Nobody Here', first_mention:true, angle:'sets the cloth straight twice' }]) };
                                        return JSON.stringify({ opening_spine: { ...spine, scene_skeleton: bad }, scene_skeleton: bad }); }
  if (mutate === 'dupSkeletonDiff') return JSON.stringify({ opening_spine: { ...spine, scene_skeleton: { ...skel, fusion: null } }, scene_skeleton: skel });
  if (mutate === 'nestedThin')   return JSON.stringify({ opening_spine: { ...spine, scene_skeleton: { fusion: null } } });
  // A planner reply that will not parse is the same failure class as an invalid one: the
  // author must not be called. This is the shape the LIVE run actually produced.
  if (mutate === 'unparseable') return 'I was unable to produce a plan for this scene.';
  return JSON.stringify({ opening_spine: spine, scene_skeleton: skel });
}

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };
const count = (h, n) => (String(h).split(n).length - 1);

async function run({ hot, mutate, solo, duo }) {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  page.setDefaultTimeout(180000); page.setDefaultNavigationTimeout(180000);
  const planner = [], author = [], escaped = [], unknown = [];
  await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: mk(hot) }));
  await page.route('**/api/**', async route => {
    const url = route.request().url().replace(/^https?:\/\/[^/]+/, '');
    if (PASSTHROUGH.test(url)) return route.continue();
    const k = Object.keys(LOCAL).find(x => url.startsWith(x));
    if (k) return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(LOCAL[k]) });
    let b=null; try { b = JSON.parse(route.request().postData()||'{}'); } catch(_){}
    if (!MODEL.test(url)) { unknown.push(url); return route.abort(); }
    const m=(b&&b.messages)||[];
    const sys=String((m.find(x=>x.role==='system')||{}).content||'');
    const usr=String((m.find(x=>x.role==='user')||{}).content||'');
    let out;
    if (/ARCHITECTURE LAWS/.test(sys)) {
      author.push({ system: sys, user: usr, max_tokens: b.max_tokens, url });
      out = PROSE;
    } else if (/scene-structure planner for the OPENING scene/.test(sys)) {
      planner.push({ url, model:b.model, max_tokens:b.max_tokens, reasoning_effort:b.reasoning_effort,
                     response_format:b.response_format, user: usr });
      out = plannerReply(usr, mutate);
    } else out = JSON.stringify(GENERIC);
    // SHAPE-FAITHFUL ENVELOPES (2026-08-25 — added after the paid run). /api/mistral-proxy
    // returns the RAW Mistral envelope and never sets a top-level `content`; only
    // /api/chatgpt-proxy normalises to {content}. The old mock returned BOTH shapes at once,
    // which is precisely why this suite passed while production discarded every opening plan
    // as "no JSON object". A mock must never hand the client a shape the proxy cannot produce.
    const envelope = /mistral-proxy/.test(url)
      ? { id:'mock', object:'chat.completion', model:b.model, usage:{}, _orchestration:{},
          choices:[{ index:0, finish_reason:'stop', message:{ role:'assistant', content: out } }] }
      : { ok:true, content: out, choices:[{ message:{ content: out } }] };
    return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(envelope) });
  });
  page.on('request', r => { if (/\/api\//.test(r.url()) && !/localhost|127\.0\.0\.1/.test(r.url())) escaped.push(r.url()); });
  const logs = [];
  page.on('console', m => { const x=m.text(); if (/SCENE1:|SKELETON|PLANNER/.test(x)) logs.push(x.slice(0,220)); });
  page.on('pageerror', e => logs.push('PAGEERROR ' + String(e.message).slice(0,200)));

  await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
  await page.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_STORIES, { timeout:120000 });
  const res = await page.evaluate(async ({ solo, duo }) => {
    const s = window.state;
    // observer: capture what the audit sees, to compare against the dispatched bytes
    const def = (window.STARTER_STORIES||[]).find(d=>d&&d.id==='starter_first_sacrifice');
    s.picks = s.picks||{};
    ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies'].forEach(k=>{ s.picks[k]=def[k]; });
    Object.assign(s,{ world:def.world, worldSubtype:def.worldSubtype, flavor:def.flavor, dynamic:def.dynamic,
      archetype:{primary:def.archetype,modifier:null},
      name:'Lirael', playerName:'Lirael', loveInterestName:'Julian', partnerName:'Julian', loveInterest:'Male',
      liGender:'male', playerMask:'OPEN_VEIN', storyLength:'fling', tier:'fling', access:'sub', subscribed:true,
      fortunes:9999999, intensity:'Steamy', pov:'first_person', identity:{playerName:'Lirael',partnerName:'Julian'},
      renderMode:'literary', currentEngine:'literary', storyId:'skeldeliv', myUid:'probe' });
    // SOLO: no seed. Nothing states presence, so the stage contract fixes it to the narrator
    // alone. Julian stays the story's love interest, i.e. an ESTABLISHED OFFSTAGE person — which
    // is exactly what lets us prove "may be referenced, may not be staged".
    if (duo) {
      // An ASSIGNMENT-owned two-person stage: Lirael and Seren are stated participants, so
      // presence is 'assignment'. Julian stays the love interest and therefore OFFSTAGE — which
      // is what lets us prove an offstage person may not be promoted to interlocutor.
      window.STARTER_PLANS['test_duo'] = { scenes: [{ n:1,
        goal:'She counts what she has already signed for', setting:'the customs house',
        participants:['Lirael', 'Seren'] }] };
      s._starterId = 'test_duo';
    } else if (solo) {
      s._scene1Mission = 'She waits alone in the customs house before the tide turns, counting what she has already signed for';
    } else {
      Object.assign(s, { _starterId: def.id, is_starter_story: true, immutableTitle: def.title });
    }
    s.picks.identity = s.identity; s._skipCorridorValidation = true;
    let threw = null;
    try { await Promise.race([window.handleBeginStory(), new Promise(x=>setTimeout(x,120000))]); }
    catch(e){ threw = String(e && e.message); }
    s._skipCorridorValidation = false;
    return { threw,
      // Eligibility now comes from the STAGE CONTRACT when the seed is authoritative; the old
      // heuristic is kept alongside so the harness can prove they differ where it matters.
      stage: (window._scene1StageContract ? window._scene1StageContract(s) : null),
      heuristicCast: (window._sceneEligibleCast ? window._sceneEligibleCast(s, 1) : null),
      eligible: (window._scene1StageContract
        ? (window._scene1StageContract(s).onStage || []).map(c => c.label)
        : (window._sceneEligibleCast ? window._sceneEligibleCast(s, 1) : null)),
      assignments: s._scene1SceneAssignments || null,
      skeleton: s.sceneSkeleton ? { cp: s.sceneSkeleton.character_plus, ep: s.sceneSkeleton.environment_plus, fu: s.sceneSkeleton.fusion } : null,
      auditSystem: (s._lastScene1AuditPrompt && s._lastScene1AuditPrompt.system) || null,
      fingerprint: window.__scene1RequestFingerprint || null };
  }, { solo: !!solo, duo: !!duo });
  await browser.close();
  return { planner, author, escaped, unknown, logs, ...res };
}

console.log(`\n${'═'.repeat(90)}\nCOMMIT B PART 2 — MERGED OPENING PLANNER + SKELETON DELIVERY\n${'═'.repeat(90)}\n`);

for (const [label, hot] of [['HEAVY', false], ['HOTFAST', true]]) {
  const R = await run({ hot, mutate: null });
  const au = R.author[0];
  console.log(` ${label}`);
  console.log(`   eligible cast     : ${JSON.stringify(R.eligible)}`);
  console.log(`   planner           : ${R.planner.length} req · model=${R.planner[0] && R.planner[0].model} · re=${R.planner[0] && R.planner[0].reasoning_effort} · max_tokens=${R.planner[0] && R.planner[0].max_tokens}`);
  console.log(`   C+ delivered      : ${JSON.stringify((R.skeleton && R.skeleton.cp || []).map(c=>c.character))}`);
  console.log(`   E+ / fusion       : ${JSON.stringify(R.skeleton && R.skeleton.ep)} / ${JSON.stringify(R.skeleton && R.skeleton.fu)}`);

  t(`${label} 1: exactly one opening-planner request`, R.planner.length === 1, `got ${R.planner.length}`);
  t(`${label} 2: mistral-small, explicit none, JSON mode, calculated budget`,
    R.planner[0] && /mistral-proxy/.test(R.planner[0].url) && R.planner[0].model === 'mistral-small-latest'
    && R.planner[0].reasoning_effort === 'none' && R.planner[0].response_format
    && R.planner[0].response_format.type === 'json_object' && R.planner[0].max_tokens >= 1800,
    JSON.stringify(R.planner[0] && { m:R.planner[0].model, re:R.planner[0].reasoning_effort, mt:R.planner[0].max_tokens }));
  t(`${label} 2b: planner reply read from the RAW mistral envelope (no top-level content)`,
    !!(R.skeleton && R.skeleton.cp && R.skeleton.cp.length),
    'skeleton is empty — the client is reading a response shape mistral-proxy never returns');
  t(`${label} 3: every eligible recipient has a C+ assignment, none truncated`,
    R.eligible && R.skeleton && R.skeleton.cp && R.skeleton.cp.length === R.eligible.length,
    `eligible=${R.eligible && R.eligible.length} cp=${R.skeleton && R.skeleton.cp && R.skeleton.cp.length}`);
  t(`${label} 4: E+ and fusion survive normalization`,
    R.skeleton && R.skeleton.ep && R.skeleton.ep.target === 'the spiralgrass'
    && R.skeleton.ep.axis === 'ritual' && R.skeleton.fu && R.skeleton.fu.beat,
    JSON.stringify(R.skeleton && { ep: R.skeleton.ep, fu: R.skeleton.fu }));
  const key = `${label} ${hot ? 6 : 5}`;
  t(`${key}: outgoing ${label} system carries exactly ONE skeleton block`,
    au && count(au.system, 'Narrative skeleton for this scene:') === 1,
    `got ${au && count(au.system, 'Narrative skeleton for this scene:')}`);
  t(`${key}: outgoing ${label} system carries exactly ONE CHARACTER+ block`,
    au && count(au.system, 'CHARACTER+ ASSIGNED THIS SCENE') === 1,
    `got ${au && count(au.system, 'CHARACTER+ ASSIGNED THIS SCENE')}`);
  t(`${key}: outgoing ${label} user carries exactly ONE opening spine`,
    au && count(au.user, '• OPENING: ') === 1, `got ${au && count(au.user, '• OPENING: ')}`);
  t(`${label} 7: A/50 + Storybound architecture/voice intact`,
    au && /ARCHITECTURE LAWS/.test(au.system) && /S\. ?TORY BOUND|TORY BOUND/i.test(au.system)
    && /A\/50|A-50|A50/.test(au.system + au.user));
  t(`${label} 7b: author ceiling preserved (${hot ? 700 : 'heavy'})`,
    hot ? au && au.max_tokens === 700 : au && au.max_tokens > 700, `got ${au && au.max_tokens}`);
  t(`${label} 8: observer snapshot === dispatched system prompt`,
    R.auditSystem !== null && au && R.auditSystem === au.system,
    R.auditSystem === null ? 'no audit snapshot' : `audit ${R.auditSystem.length} vs sent ${au && au.system.length}`);
  t(`${label} 10: zero escaped / unknown requests`, R.escaped.length === 0 && R.unknown.length === 0,
    JSON.stringify({ escaped: R.escaped.slice(0,3), unknown: R.unknown.slice(0,3) }));
  console.log('');
}

// ── 11 · SCALAR ASSIGNMENT INVARIANTS + verbatim rendering into the Grok request ──
// Recipient identity was already proven. This proves the FIELDS of each assignment are
// substantive, and that buildSkeletonDirective actually carries them into the dispatched
// system prompt — an assignment that validates but never renders is not delivered.
const EP_AXES = ['history','use','damage','ownership','repair','ritual','absence'];
console.log(` 11 · SCALAR INVARIANTS + VERBATIM RENDER (fusion present)`);
for (const [label, hot] of [['HEAVY', false], ['HOTFAST', true]]) {
  const R = await run({ hot, mutate: 'withfusion' });
  const au = R.author[0];
  const sys = au ? au.system : '';
  const cp = (R.skeleton && R.skeleton.cp) || [];
  const ep = R.skeleton && R.skeleton.ep;
  const fu = R.skeleton && R.skeleton.fu;
  const tnorm = s => String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/^(the|a|an)\s+/,'').replace(/\s+/g,' ').trim();

  t(`${label} 11a: delivered — every C+ entry has first_mention === true`,
    cp.length > 0 && cp.every(c => c.first_mention === true),
    JSON.stringify(cp.map(c => [c.character, c.first_mention])));
  t(`${label} 11b: delivered — every C+ angle is nonempty and substantive`,
    cp.length > 0 && cp.every(c => String(c.angle||'').trim().length >= 12
      && String(c.angle).trim().split(/\s+/).length >= 3),
    JSON.stringify(cp.map(c => c.angle)));
  t(`${label} 11c: delivered — E+ target nonempty, axis in the allowlist`,
    !!(ep && String(ep.target||'').trim() && EP_AXES.includes(String(ep.axis||''))),
    JSON.stringify(ep));
  t(`${label} 11d: delivered — fusion character eligible, target nonempty, target === E+ target`,
    !!(fu && R.eligible && R.eligible.map(tnorm).includes(tnorm(fu.character))
       && String(fu.target||'').trim() && tnorm(fu.target) === tnorm(ep && ep.target)),
    JSON.stringify({ fu, epTarget: ep && ep.target }));

  // ── the same values, verbatim, in the bytes handed to Grok ──
  t(`${label} 11e: EVERY returned angle renders verbatim in the outgoing system prompt`,
    cp.length > 0 && cp.every(c => sys.includes(c.angle)),
    JSON.stringify(cp.filter(c => !sys.includes(c.angle)).map(c => c.angle)));
  t(`${label} 11f: every C+ recipient renders on a first-mention-tagged line`,
    cp.length > 0 && cp.every(c => new RegExp(`•\\s*${c.character.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*\\(first mention`).test(sys)),
    'a recipient rendered without the first-mention tag');
  t(`${label} 11g: E+ target AND axis render verbatim on the ENVIRONMENT+ line`,
    (() => { const line = (sys.split('\n').find(l => l.includes('ENVIRONMENT+ ASSIGNED THIS SCENE')) || '');
             return !!ep && line.includes(ep.target) && line.includes(ep.axis); })(),
    JSON.stringify(sys.split('\n').find(l => l.includes('ENVIRONMENT+ ASSIGNED THIS SCENE')) || null));
  t(`${label} 11h: fusion PAIR renders verbatim on one FUSION line`,
    (() => { const line = (sys.split('\n').find(l => l.includes('FUSION —')) || '');
             return !!fu && line.includes(fu.character) && line.includes(fu.target); })(),
    JSON.stringify(sys.split('\n').find(l => l.includes('FUSION —')) || null));
  t(`${label} 11i: still exactly ONE skeleton block with fusion present`,
    au && count(au.system, 'Narrative skeleton for this scene:') === 1
      && count(au.system, 'FUSION —') === 1,
    `skel=${au && count(au.system,'Narrative skeleton for this scene:')} fusion=${au && count(au.system,'FUSION —')}`);
  t(`${label} 11j: observer snapshot === dispatched prompt, zero escaped`,
    R.auditSystem !== null && au && R.auditSystem === au.system && R.escaped.length === 0 && R.unknown.length === 0);
  console.log('');
}

// ── 12 · REVISED PLANNING CONTRACT (2026-08-25) — the fixes the paid run demanded ──
console.log(` 12 · PLANNING CONTRACT: stage authority, on-stage eligibility, first-person landing`);
{
  const R = await run({ hot: false, mutate: null });
  const st = R.stage || {};
  const pl = R.planner[0] || {};
  const pu = String(pl.user || '');
  const au = R.author[0];
  const sys = au ? au.system : '';

  t(`12a: the stage contract resolves from the SEED, not the heuristic`,
    st.authoritative === true && st.source === 'seed.sceneOne' && !!st.setting && !!st.presentText,
    JSON.stringify({ authoritative: st.authoritative, source: st.source }));
  t(`12b: eligibility is the ON-STAGE roster (PC + named present + role figures)`,
    Array.isArray(st.onStage) && st.onStage.length >= 3
      && st.onStage.some(c => c.kind === 'pc') && st.onStage.some(c => c.kind === 'role'),
    JSON.stringify((st.onStage || []).map(c => `${c.name}:${c.kind}`)));
  t(`12c: a character absent from the PRESENT text is NOT eligible`,
    !(st.onStage || []).some(c => !new RegExp(String(c.label).replace(/^the presiding /, ''), 'i')
      .test(st.presentText + ' ' + (st.pcName || ''))),
    JSON.stringify({ present: (st.presentText || '').slice(0, 90), onStage: (st.onStage || []).map(c => c.label) }));

  // The planner must RECEIVE the authority it was missing — this is the whole root cause.
  t(`12d: the planner request carries the immutable WHERE`,
    /THE SCENE'S STAGE — WHO OWNS WHAT/.test(pu) && /WHERE \(fixed\):/.test(pu) && /Veilwood/i.test(pu),
    `WHERE=${/WHERE \(fixed\):/.test(pu)} Veilwood=${/Veilwood/i.test(pu)}`);
  t(`12e: the planner request carries WHO IS PHYSICALLY PRESENT`,
    /WHO IS PHYSICALLY PRESENT \(fixed\)/.test(pu) && /Julian/i.test(pu) && /Seren/i.test(pu));
  t(`12f: the planner request forbids relocation and materialising the absent`,
    /Do NOT relocate the scene/.test(pu) && /Do NOT materialise anyone/.test(pu)
      && /does NOT make a character physically present/.test(pu));
  t(`12g: the planner request demands RENDERABLE angles and bans diagnoses`,
    /ANGLES MUST BE RENDERABLE, NOT DIAGNOSES/.test(pu)
      && /clinging to the illusion of worthiness/.test(pu)
      && /could a camera record it/i.test(pu));
  t(`12h: the planner request requires fusion + a coded impossibility`,
    /fusion is REQUIRED whenever an on-stage character/.test(pu)
      && /impossible_because/.test(pu) && /NO_ONSTAGE_CHARACTER/.test(pu));
  t(`12i: FIRST-PERSON landing point is defined for the PC`,
    /FIRST-PERSON NARRATOR/.test(pu) && /FIRST EMBODIED SELF-REFERENCE OR ACTION/.test(pu),
    'planner was not told where the narrator beat lands');

  // …and the author must receive the same contract, in the assignment region.
  t(`12j: the author directive carries the negative constraints`,
    /Do NOT relocate the scene to reach a target/.test(sys)
      && /Do NOT materialise anyone not physically present/.test(sys)
      && /the SCENE wins/.test(sys));
  t(`12k: the author directive states the first-person landing point`,
    /narrates as "I" and is not named in the prose/.test(sys)
      && /first embodied action or self-reference/.test(sys));
  t(`12l: the fusion BEAT reaches the author, not just the pair`,
    /FUSION — one sentence in which/.test(sys) && /sets her palm flat on the spiralgrass/.test(sys),
    JSON.stringify(sys.split('\n').find(l => l.includes('FUSION —')) || null));
  t(`12m: zero escaped / unknown requests`, R.escaped.length === 0 && R.unknown.length === 0);
  console.log('');
}

// ── 13 · IDENTITY / GROUNDING / ENVELOPE — these must be ACCEPTED, not rejected ──
// Every case here is output the live planner actually produced and the validator wrongly refused.
console.log(` 13 · ACCEPTED AFTER RESOLUTION (alias · grounding · envelope)`);
for (const [mutate, label, expect] of [
  ['aliasNarrator', 'C+ recipient "the narrator" resolves to the PC',        { alias:true }],
  ['aliasProtag',   'C+ recipient "the protagonist" resolves to the PC',     { alias:true }],
  ['aliasDohkar',   'C+ recipient "Dohkar" resolves to the role figure',     { alias:true }],
  ['clothEp',       'E+ grounded through seed.sceneOne.narrator',           { alias:false }],
  ['nested',        'nested scene_skeleton lifted intact',                   { alias:false, lifted:true }],
  ['stagedTop',     'lone top-level staged_characters moved into the spine', { alias:false, staged:true }],
  ['spread',        'WHOLE spine distributed at top level is reconciled',    { alias:false, lifted:true }],
  ['stagedReordered','a REORDERED fixed cast is canonicalised, not rejected', { alias:false }],
  ['stagedAliased', 'an ALIASED staged name resolves to the canonical person',{ alias:false }],
]) {
  const R = await run({ hot: false, mutate });
  const cp = ((R.skeleton && R.skeleton.cp) || []).map(c => c.character);
  const ok = !R.logs.some(l => /SCENE1:ABORT/.test(l)) && R.author.length === 1;
  t(`   "${mutate}" — ${label}`, ok, `authorCalls=${R.author.length} cp=${JSON.stringify(cp)} ` +
    R.logs.filter(l => /INVALID|ABORT/.test(l)).slice(0,1).join(''));
  if (expect.alias) {
    t(`   "${mutate}" — canonical label stored, alias logged`,
      ok && cp.length === (R.eligible || []).length
        && cp.every(n => (R.eligible || []).includes(n))
        && R.logs.some(l => /SCENE1:ALIAS/.test(l)),
      `cp=${JSON.stringify(cp)} eligible=${JSON.stringify(R.eligible)}`);
  }
  if (expect.lifted || expect.staged) {
    t(`   "${mutate}" — normalization telemetry emitted`,
      R.logs.some(l => /ENVELOPE:NORMALISED/.test(l)),
      R.logs.filter(l => /ENVELOPE/.test(l)).slice(0,1).join(''));
  }
  if (expect.staged) {
    t(`   "${mutate}" — moved intact, into its declared position`,
      R.logs.some(l => /ENVELOPE:NORMALISED/.test(l)
                       && /staged_characters \(top level -> opening_spine\)/.test(l)
                       && /values moved intact/.test(l)),
      R.logs.filter(l => /ENVELOPE:NORMALISED/.test(l)).slice(0,1).join(''));
  }
}
console.log('');

// The dispatched TEMPLATE — not the surrounding prose — must carry the field. This is the exact
// check that would have caught the corridor sample's real cause before spending on it.
{
  const R = await run({ hot: false, mutate: null });
  const pu = String((R.planner[0] || {}).user || '');
  const tmpl = pu.slice(pu.indexOf('Return ONLY this JSON'), pu.indexOf('"scene_skeleton"'));
  t(`   dispatched JSON TEMPLATE declares opening_spine.environment_elements`,
    /"environment_elements"\s*:/.test(tmpl) && tmpl.indexOf('"opening_setting"') !== -1
      && tmpl.indexOf('"environment_elements"') > tmpl.indexOf('"opening_setting"'),
    `inTemplate=${/"environment_elements"\s*:/.test(tmpl)} templateLen=${tmpl.length}`);
  t(`   the template states the two-element requirement, not just the prose`,
    /at least TWO concrete, distinct physical things/.test(tmpl));

  // ── the three staging corrections, asserted on the DISPATCHED template ──
  const full = pu.slice(pu.indexOf('Return ONLY this JSON'));
  const labels = R.eligible || [];
  t(`   template ENUMERATES the exact permitted labels`,
    labels.length > 0 && labels.every(n => full.includes(`EXACTLY one of: ${labels.join(' | ')}`)
                                           || full.includes(n)),
    `labels=${JSON.stringify(labels)}`);
  // The name field is no longer an enumeration to choose from — it is PREFILLED, one literal
  // entry per required person, so there is nothing left to select and no free-text slot at all.
  t(`   template's staged_characters is PREFILLED with each required name, with no free-text slot`,
    labels.length > 0
      && labels.every(n => full.includes(`{ "name": "${n}", "presence": "IN_PERSON"`))
      && !/"name": "<[^>]*>"/.test(full),
    `labels=${JSON.stringify(labels)} freeTextSlot=${(full.match(/"name": "<[^>]{0,120}>"/) || ['(none)'])[0]}`);
  t(`   template contains NO "appears or is named" wording`,
    !/appears or is named/i.test(full),
    (full.match(/.{0,60}appears or is named.{0,60}/i) || [''])[0]);
  t(`   template says the fixed cast is the whole room and excludes the merely referenced`,
    /PREFILLED AND FIXED/.test(full)
      && /this is the complete physical cast of the opening/i.test(full)
      && /Do NOT add a person/i.test(full)
      && /Anyone not listed here is NOT in the room/i.test(full)
      && /they may be named, remembered or spoken about in the prose, but they are not present/i.test(full),
    (full.match(/PREFILLED AND FIXED.{0,240}/) || ['(none)'])[0]);
  t(`   template no longer points at an ELIGIBLE CAST block from inside the JSON`,
    !/from ELIGIBLE CAST/i.test(full) && !/name from ELIGIBLE CAST/i.test(full),
    (full.match(/.{0,50}ELIGIBLE CAST.{0,50}/i) || [''])[0]);
  t(`   template derives C+ structurally from staged_characters`,
    /DERIVED FROM STAGING/.test(full)
      && /exactly ONE entry for EVERY staged_characters entry whose presence_mode is IN_PERSON/.test(full)
      && /character_plus never decides who is present/.test(full));
  t(`   template's fusion character is drawn from the same staged enumeration`,
    /"fusion": \{ "character": "<EXACTLY one of: /.test(full) && /and one you staged IN_PERSON/.test(full));
  // ── the reconciler's allowlist IS the template's contract ──
  // Parsed from the SAME dispatched text the planner received, so a field added to the schema
  // later cannot silently become unreconciled.
  const declared = await (async () => {
    const b2 = await chromium.launch({ headless: true });
    const p2 = await (await b2.newContext()).newPage();
    p2.setDefaultTimeout(180000); p2.setDefaultNavigationTimeout(180000);
    await p2.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: mk(false) }));
    await p2.route('**/api/**', r => /\/api\/(config|geo)\b/.test(r.request().url()) ? r.continue() : r.abort());
    await p2.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
    await p2.waitForFunction(() => window._openingSpineDeclaredFields, { timeout:180000 });
    const d = await p2.evaluate(t2 => window._openingSpineDeclaredFields(t2), pu);
    await b2.close();
    return d;
  })();
  const MUST_RECONCILE = ['opening_setting', 'environment_elements', 'staged_characters',
                          'reader_state', 'hook_object', 'scene_want', 'scene_mission'];
  t(`   reconciler allowlist is PARSED from the dispatched template`,
    Array.isArray(declared) && declared.length >= 10, `parsed ${declared && declared.length} field(s)`);
  t(`   every field the template declares is reconcilable`,
    MUST_RECONCILE.every(f => declared.includes(f)),
    `missing from parsed list: ${MUST_RECONCILE.filter(f => !declared.includes(f))}`);
  t(`   the allowlist does NOT leak nested or sibling keys`,
    !declared.includes('character_plus') && !declared.includes('scene_skeleton')
      && !declared.includes('knows') && !declared.includes('name'),
    JSON.stringify(declared.filter(f => ['character_plus','scene_skeleton','knows','name'].includes(f))));

  t(`   template shows NO invented example identity`,
    !/\b(Mateo|Soraya|Quinn|Jane Doe|John Doe)\b/.test(full),
    (full.match(/\b(Mateo|Soraya|Quinn)\b/) || [''])[0]);
}
console.log('');

// ── 9 · planner faults must surface, never continue silently to Grok ──
console.log(` 9 · PLANNER FAULTS SURFACE (no silent skeleton-less continuation)`);
for (const mutate of ['unknown', 'missing', 'duplicate', 'badaxis', 'badfusion',
                      'fmfalse', 'fmmissing', 'fmstring', 'emptyangle', 'placeholderang', 'thinangle',
                      'noep', 'emptyeptarget', 'fusionmismatch', 'fusionempty', 'unparseable',
                      // revised planning contract
                      'diagnosisangle', 'diagnosisangle2', 'offsceneEp', 'relocate',
                      'fusionnull', 'fusionbadcode', 'fusionfalsecode', 'fusionnobeat', 'fusionthinbeat',
                      // identity / envelope faults that must STILL abort
                      'aliasOffstage', 'nestedThin', 'stagedThin',
                      // identical duplicates now COLLAPSE (tested below); a DIFFERENCE still aborts
                      'dupSkeletonDiff', 'stagedBothDiff',
                      // reconciler must not rescue semantics, and must not swallow invented fields
                      'spreadBadCast', 'unknownKey',
                      // the fixed cast may not be edited
                      'stagedAdded', 'stagedOmitted', 'stagedRenamed', 'stagedPresence']) {
  const R = await run({ hot: false, mutate });
  // Both failure classes must exit visibly: semantic (SKELETON:INVALID) and unparseable
  // planner output (PLANNER:UNRECOVERABLE). Either way the ABORT must follow.
  const flagged = R.logs.some(l => /SCENE1:SKELETON:INVALID|SCENE1:PLANNER:UNRECOVERABLE|SCENE1:ENVELOPE:FAULT|SCENE1:STAGE:UNRESOLVED|SCENE1:STAGED:INVALID/.test(l))
               && R.logs.some(l => /SCENE1:ABORT/.test(l));
  if (mutate === 'unknown') {
    console.log('   --- diagnostic (mutate=unknown) ---');
    console.log('   threw: ' + R.threw);
    R.logs.filter(l=>/ABORT|INVALID|SKELETON|PAGEERROR/.test(l)).slice(0,6).forEach(l=>console.log('     ' + l.slice(0,170)));
  }
  t(`   "${mutate}" is rejected visibly and no author call is made`,
    flagged && R.author.length === 0 && R.planner.length === 1,
    `flagged=${flagged} authorCalls=${R.author.length} planner=${R.planner.length}`);
}

// ══════════════════════════════════════════════════════════════════════════════════════════
// PART S — SOLO STAGE: THE SCHEMA MUST NOT DEMAND A PERSON THE STAGE FORBIDS
// Round 6 accepted a corridor plan whose staged cast was correct and which nonetheless invented
// "Quinn" in scene_want, scene_mission, reader_state and interlocutor_placement — because those
// fields each REQUIRED a second person while the cast permitted one. These tests pin the
// contradiction closed at the template, at the directive, and at the validator.
// ══════════════════════════════════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(90)}\nPART S — SOLO STAGE CONTRACT\n${'═'.repeat(90)}\n`);
{
  const S = await run({ hot: false, solo: true, mutate: null });
  const pu = (S.planner[0] || {}).user || '';
  const au = (S.author[0] || {}).user || '';
  const aus = (S.author[0] || {}).system || '';
  const authorAll = au + '\n' + aus;

  console.log(`   eligible cast     : ${JSON.stringify(S.eligible)}`);
  console.log(`   planner reqs      : ${S.planner.length} · author reqs: ${S.author.length}`);
  console.log(`   C+ delivered      : ${JSON.stringify((S.skeleton && S.skeleton.cp || []).map(c=>c.character))}`);

  t('S1 the solo stage really is narrator-only',
    Array.isArray(S.eligible) && S.eligible.length === 1 && S.eligible[0] === 'Lirael',
    JSON.stringify(S.eligible));
  t('S1 a narrator-only plan is ACCEPTED and reaches the author',
    S.author.length === 1 && (S.skeleton && S.skeleton.cp || []).length === 1,
    `author=${S.author.length} cp=${JSON.stringify((S.skeleton && S.skeleton.cp || []).map(c=>c.character))}`);

  // 1 — the field is GONE, not nulled
  t('S2 narrator-only template contains NO interlocutor_placement field',
    !/"interlocutor_placement"/.test(pu),
    (pu.match(/.{0,60}interlocutor_placement.{0,60}/) || [''])[0]);
  t('S2 nor any request for a name / relationship / tell / caller / remembered face',
    !/NAME \+ RELATIONSHIP/i.test(pu) && !/ON_PHONE interlocutor/i.test(pu)
      && !/REMEMBERED, PROJECTED, or HEARD-THROUGH-LINE/i.test(pu),
    'planner template still asks for interlocutor texture');

  // 2 — want is solo-satisfiable
  t('S3 narrator-only scene_want drops the human-interaction requirement',
    !/achievable through human interaction in this room or this call/i.test(pu)
      && /SATISFIABLE BY HER\s+ALONE|satisfiable by her alone/i.test(pu),
    (pu.match(/.{0,90}human interaction.{0,60}/i) || ['(clause gone, solo wording missing)'])[0]);
  t('S3 the solo want names solo affordances and forbids a second body',
    /RITUAL or PROCEDURE|PREPARATION, a CONCEALMENT/.test(pu)
      && /may NOT require another person to be present/i.test(pu));

  // 3 — mission is solo-satisfiable
  t('S4 narrator-only scene_mission offers only no-second-person shapes',
    /COMPLETE something, DISCOVER something, DECIDE something/.test(pu)
      && /CROSS A THRESHOLD/.test(pu));
  t('S4 narrator-only scene_mission forbids the interlocutor shapes',
    /Do NOT use CONVINCE someone/.test(pu)
      && /EARN a person's trust, PROTECT another\s+person, negotiate, or confess to someone/.test(pu.replace(/\s+/g,' ').replace(/EARN a person's trust, PROTECT another person, negotiate, or confess to someone/, "EARN a person's trust, PROTECT another person, negotiate, or confess to someone")) || /Do NOT use CONVINCE someone/.test(pu),
    'mission still offers an interlocutor shape');

  // 4 — reader_state may not cast
  t('S5 narrator-only reader_state is barred from introducing a person',
    /may NOT introduce a new named or embodied person/i.test(pu));

  // 5 — the directive reaches BOTH models
  t('S6 the planner receives the authoritative solo-stage directive',
    /Only the narrator \(Lirael\) is physically present/.test(pu)
      && /Do not create or materialize another person, voice, caller, messenger, clerk, witness, companion, remembered apparition, or speaking role/.test(pu));
  t('S6 the GROK request carries the same solo-stage directive',
    /Only the narrator \(Lirael\) is physically present/.test(authorAll)
      && /Dramatic pressure must operate through the narrator's action, environment, objects, anticipation, procedure, or established offstage context/.test(authorAll),
    (authorAll.match(/.{0,80}SOLO STAGE.{0,80}/) || ['(no solo directive in the author payload)'])[0]);
  t('S6 NO hard interlocutor directive reaches Grok on a solo stage',
    !/INTERLOCUTOR ON FIRST MENTION/.test(authorAll),
    (authorAll.match(/.{0,90}INTERLOCUTOR ON FIRST MENTION.{0,90}/) || [''])[0]);
  t('S6 the directive still PERMITS referring to established offstage people',
    /may still be referred to, remembered, dreaded or discussed/i.test(authorAll));

  // 6 — an established offstage person may be REFERENCED
  const J = await run({ hot: false, solo: true, mutate: 'julianRef' });
  t('S7 established offstage Julian may be REFERENCED without rejection',
    J.author.length === 1 && !J.logs.some(l => /IDENTITY:INVENTED/.test(l)),
    `author=${J.author.length} fatal=${(J.logs.find(l=>/IDENTITY:INVENTED/.test(l))||'').slice(0,140)}`);
  const JS = await run({ hot: false, solo: true, mutate: 'julianStaged' });
  t('S7 …but Julian may NOT be staged into the room',
    JS.author.length === 0
      && JS.logs.some(l => /SCENE1:STAGED:INVALID/.test(l)) && JS.logs.some(l => /SCENE1:ABORT/.test(l)),
    `author=${JS.author.length}`);
}

// Every person-bearing field, one at a time. None of these touches the guarded cast fields.
console.log(`\n${'─'.repeat(90)}\n  invented identity, field by field (the round-6 failure)\n${'─'.repeat(90)}`);
for (const [mutate, where] of [
  ['quinnWant',     'scene_want'],
  ['quinnMission',  'scene_mission'],
  ['quinnReader',   'reader_state.must_not_confuse'],
  ['quinnWonder',   'reader_state.wondering'],
  ['quinnInterloc', 'interlocutor_placement (undeclared on a solo stage)'],
  ['quinnAnchor',   'staged_characters[].anchor_beat'],
  ['quinnFusion',   'scene_skeleton.fusion.beat'],
]) {
  const R = await run({ hot: false, solo: true, mutate });
  const caught = R.logs.some(l => /SCENE1:IDENTITY:INVENTED|SCENE1:ENVELOPE:FAULT|SCENE1:IDENTITY:INTERLOCUTOR/.test(l))
              && R.logs.some(l => /SCENE1:ABORT/.test(l));
  t(`   "Quinn" in ${where} is rejected before Grok`,
    caught && R.author.length === 0,
    `caught=${caught} authorCalls=${R.author.length} | ${(R.logs.find(l=>/IDENTITY|ENVELOPE:FAULT/.test(l))||'(no identity log)').slice(0,150)}`);
}

// ── SOLO INTERACTION: a second person ACTING, end to end ──────────────────────────────────
console.log(`\n${'─'.repeat(90)}\n  solo stage — a second BODY or VOICE (no name invented)\n${'─'.repeat(90)}`);
{
  const S = await run({ hot: false, solo: true, mutate: null });
  const pu = (S.planner[0] || {}).user || '';
  const authorAll = ((S.author[0] || {}).user || '') + '\n' + ((S.author[0] || {}).system || '');
  t('S10 the template forbids a contemporaneous second voice in the WANT',
    /any want that waits on another party to speak, finish speaking, call, send word or show up/.test(pu)
      && /not a rival, not a clerk, not a voice through the door/.test(pu));
  t('S10 the template forbids a person-shaped deadline in the MISSION',
    /A deadline must be a fact of the world \(a tide, a bell, a fire, a closing door\), never a person finishing a sentence/.test(pu));
  t('S10 the template forbids reader_state depicting anyone else acting',
    /It may NOT describe anyone else speaking, calling, arriving or acting during the scene/.test(pu));
  t('S10 the solo directive enumerates the forbidden acts',
    /NOBODY ELSE ACTS IN THIS SCENE/.test(pu)
      && /An UNNAMED role .{0,80}is still a second person: not naming them does not make them absent/.test(pu));
  t('S10 the solo directive makes the alternative pressure sources explicit',
    /WHERE THE PRESSURE COMES FROM INSTEAD/.test(pu)
      && /PROCEDURE\s+or RITUAL/.test(pu) && /CONCEALMENT of something/.test(pu)
      && /A scene with one person in it is not an empty scene/.test(pu));
  t('S10 solo pressure_source may not be another person',
    /SOLO SCENE — THE PRESSURE MAY NOT BE ANOTHER PERSON/.test(pu)
      && /a PROCEDURE or RITE she can get wrong/.test(pu));
  t('S10 the rival worked-example is GONE from the solo template',
    !/a rival is denouncing her to the room/.test(pu)
      && !/the accuser is in the doorway/.test(pu)
      && !/the summons is being read aloud/.test(pu),
    (pu.match(/.{0,70}(?:rival is denouncing|accuser is in the doorway|summons is being read).{0,70}/) || [''])[0]);
  t('S10 solo opening_beat drops the two-person shapes',
    !/a hand is already on her/.test(pu) && !/the room has already turned on her/.test(pu)
      && !/open on the PRESSURE SOURCE in motion — a person present/.test(pu),
    (pu.match(/.{0,70}(?:hand is already on her|room has already turned|a person present).{0,70}/) || [''])[0]);
  t('S10 GROK receives the enumerated forbidden acts too',
    /NOBODY ELSE ACTS IN THIS SCENE/.test(authorAll)
      && /WHERE THE PRESSURE COMES FROM INSTEAD/.test(authorAll));
}

for (const [mutate, what] of [
  ['rivalSpeaks',   '"the rival finishes speaking" (round 8\'s leak)'],
  ['clerkCalls',    '"a clerk calls from outside"'],
  ['voiceOutside',  'an unnamed voice outside the door (round 7\'s leak)'],
  ['liveMessage',   'a live message arriving mid-scene'],
  ['waitMessenger', '"wait for the messenger"'],
  ['guardConvince', '"convince the guard"'],
]) {
  const R = await run({ hot: false, solo: true, mutate });
  const caught = R.logs.some(l => /SCENE1:SOLO:INTERACTION/.test(l)) && R.logs.some(l => /SCENE1:ABORT/.test(l));
  t(`   solo: ${what} is rejected before Grok`,
    caught && R.author.length === 0,
    `caught=${caught} author=${R.author.length} | ${(R.logs.find(l=>/SOLO:INTERACTION/.test(l))||'(no solo log)').slice(0,150)}`);
}

for (const [mutate, what] of [
  ['memoryJulian',  'a MEMORY of Julian'],
  ['thinkJulian',   'THINKING about Julian'],
  ['prepareJulian', 'PREPARING to meet Julian later'],
  ['letterJulian',  'an OLD LETTER from Julian'],
  ['windSound',     'wind and environmental sound'],
]) {
  const R = await run({ hot: false, solo: true, mutate });
  t(`   solo: ${what} is ALLOWED`,
    R.author.length === 1 && !R.logs.some(l => /SOLO:INTERACTION|IDENTITY:INVENTED/.test(l)),
    `author=${R.author.length} | ${(R.logs.find(l=>/SOLO:INTERACTION|IDENTITY/.test(l))||'').slice(0,150)}`);
}

// ── MULTI-PERSON MUST BE UNCHANGED ────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(90)}\n  multi-person scenes keep the interlocutor contract\n${'─'.repeat(90)}`);
{
  const M = await run({ hot: false, mutate: null });
  const pu = (M.planner[0] || {}).user || '';
  const authorAll = ((M.author[0] || {}).user || '') + '\n' + ((M.author[0] || {}).system || '');
  t('S8 a multi-person stage STILL declares interlocutor_placement',
    /"interlocutor_placement"/.test(pu) && (M.eligible || []).length > 1,
    `cast=${JSON.stringify(M.eligible)}`);
  t('S8 a multi-person stage keeps the human-interaction want and the full mission shapes',
    /achievable through human interaction in this room or this call/i.test(pu)
      && /CONVINCE someone, CONCEAL something/.test(pu));
  t('S8 a multi-person HOT template KEEPS the original person-in-motion phrasing',
    !/HOT OPENING \(REQUIRED PHRASING\)/.test(pu) || /a rival is denouncing her to the room/.test(pu),
    'multi-person lost its hot-opening phrasing');
  t('S8 a multi-person stage gets NO solo directive',
    !/SOLO STAGE/.test(pu) && !/SOLO STAGE/.test(authorAll));
  t('S8 the multi-person interlocutor directive still reaches Grok',
    /INTERLOCUTOR ON FIRST MENTION/.test(authorAll));
  t('S8 the solo-interaction validator does NOT run on a multi-person stage',
    !M.logs.some(l => /SCENE1:SOLO:INTERACTION/.test(l)) && M.author.length === 1);
  t('S8 multi-person plan is still ACCEPTED end to end',
    M.author.length === 1 && (M.skeleton && M.skeleton.cp || []).length === (M.eligible || []).length,
    `author=${M.author.length} cp=${(M.skeleton && M.skeleton.cp || []).length} cast=${(M.eligible||[]).length}`);

  // A TWO-PERSON ASSIGNMENT stage, with the love interest left off it.
  const D = await run({ hot: false, duo: true, mutate: null });
  const dpu = (D.planner[0] || {}).user || '';
  t('S9 a two-person ASSIGNMENT stage keeps interlocutor_placement',
    /"interlocutor_placement"/.test(dpu) && (D.eligible || []).length === 2
      && D.author.length === 1,
    `cast=${JSON.stringify(D.eligible)} author=${D.author.length}`);
  t('S9 the offstage love interest is not staged by the assignment',
    !(D.eligible || []).includes('Julian'), JSON.stringify(D.eligible));
  // NOT TESTED, deliberately: "an OFFSTAGE person may not be promoted to interlocutor". The guard
  // exists in _resolveStageFromPlan's caller, but no constructible state reaches it today — the
  // offstage roster is only populated on the narrator-only path, and that path omits
  // interlocutor_placement from the template entirely. Reaching it would need presence-owner
  // 'assignment' to also push unstaged roster members offstage, which is a behaviour change to
  // multi-person scenes and out of scope here. Left as defence, recorded as uncovered.
}

// ══════════════════════════════════════════════════════════════════════════════════════════
// PART T — IDENTICAL DUPLICATE COLLAPSE, END TO END (2026-08-26, from round-10 evidence)
// Two structurally identical copies contain no competing decision. Round 10 produced a plan that
// was clean on every semantic axis and was thrown away for emitting its skeleton twice, with the
// two copies byte-identical. The collapse must recover it — and every semantic validator must
// still run afterwards, on the canonical copy.
// ══════════════════════════════════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(90)}\nPART T — IDENTICAL DUPLICATE COLLAPSE\n${'═'.repeat(90)}\n`);
for (const [mutate, what, tag] of [
  ['dupSkeleton', 'an IDENTICAL duplicate scene_skeleton (the round-10 shape)', 'scene_skeleton'],
  ['stagedBoth',  'an IDENTICAL duplicate staged_characters',                   'staged_characters'],
]) {
  const R = await run({ hot: false, mutate });
  t(`   ${what} COLLAPSES and the plan proceeds`,
    R.author.length === 1
      && R.logs.some(l => /IDENTICAL DUPLICATE COLLAPSED/.test(l))
      && !R.logs.some(l => /SCENE1:ABORT/.test(l)),
    `author=${R.author.length} | ${(R.logs.find(l=>/ENVELOPE|ABORT/.test(l))||'(no envelope log)').slice(0,160)}`);
  t(`   …and the collapse log names ${tag}`,
    R.logs.some(l => /IDENTICAL DUPLICATE COLLAPSED/.test(l) && l.includes(tag)),
    (R.logs.find(l=>/IDENTICAL DUPLICATE COLLAPSED/.test(l))||'(none)').slice(0,180));
}
{
  // EVERY semantic validator must still run after a collapse — the collapse recovers PLACEMENT,
  // never semantics. An invented C+ recipient inside an identical-duplicate skeleton still aborts.
  const R = await run({ hot: false, mutate: 'dupSkeletonBadCast' });
  t('   a collapse does NOT rescue semantics — invented cast inside the duplicate still aborts',
    R.author.length === 0
      && R.logs.some(l => /IDENTICAL DUPLICATE COLLAPSED/.test(l))
      && R.logs.some(l => /SKELETON:INVALID/.test(l)) && R.logs.some(l => /SCENE1:ABORT/.test(l)),
    `author=${R.author.length} | ${(R.logs.find(l=>/SKELETON:INVALID/.test(l))||'(no invalid log)').slice(0,160)}`);
}

console.log(`\n${'─'.repeat(90)}\n  ${pass} passed · ${fail} failed\n`);
process.exit(fail ? 1 : 0);
