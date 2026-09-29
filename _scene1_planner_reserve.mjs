// SCENE-1 PLANNER RESERVE — measurement only (no dispatch). Reuses the dry suite's shape-faithful role
// fixtures VERBATIM (sliced from _scene1_skeleton_delivery.mjs at generation time) so the setup passes
// succeed and production actually BUILDS and dispatches the Scene-1 opening planner request. That request
// is captured (bytes of all messages + max_tokens = the governor's conservative reservation) and answered
// with the generic fixture, after which the flow aborts at the stage contract by design. Nothing reaches a
// provider. usage: node _scene1_planner_reserve.mjs
import { chromium } from 'playwright-core';
import fs from 'fs';
import { configBody, installSession, isAuthOrigin } from './_test_session_env.mjs';
const PASSTHROUGH = /\/api\/(geo|csp-report|beta-events)\b/;
const LOCAL = { '/api/consume-fortune': { success: true, fortunesRemaining: 9999 } };
const MODEL = /\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini)\b/;
const L = 'she understands the wish has already begun to cost her something she cannot name';
// ── THE PORTFOLIO THE SCAFFOLD RETURNS (2026-08-29) ──
// Written FOR THIS STORY, so every applicability condition is grounded in evidence the customs
// house scene actually offers. A rite-flavoured condition was correctly rejected here by the
// evidence gate — that gate is why these belong to the scene rather than to the seed.
const _pfF = (dimension, truth, w1, e1, w2, e2) => ({ dimension, canonical_truth: truth,
  applicability_conditions: [{ text:w1, evidence_words: e1.split('|') }, { text:w2, evidence_words: e2.split('|') }],
  forbidden_restatements: [{ forbid:'is ' + dimension, why:'the truth stated, not shown' }] });
const PORTFOLIO_FACETS = [
  _pfF('value','With people who hold no leverage over him he is unexpectedly generous.',
    'someone with nothing to trade','customs|house|Lirael','a person placed beneath him','beneath|edge|apart'),
  _pfF('insecurity','Deference paid to someone else makes him newly attentive to his own standing.',
    'a room holding more than one authority','customs|house|Lirael','someone junior given weight','younger|senior|standing'),
  _pfF('defense','Paperwork repeated daily rarely earns his full attention, and he barely hides it.',
    'a procedure the house performs every day','customs|house','a step nobody audits','signed|counts|already'),
  _pfF('relationship',"He turns another person's error into an instruction, wanted or not.",
    'a mistake that can still be corrected','counts|signed|already','a person doing the work badly','error|wrong|mistake'),
  _pfF('exception','On what a signature costs he assumes an authority nobody granted him.',
    'an obligation already entered into','signed|counts|already','a price judged small','cost|price|paid')];

// The responder can only echo the subject_ref THE REQUEST CARRIED — exactly what a model can do.
// A run that is not a portfolio run gets an ordinary scaffold, so the marker cannot leak sideways.
function scaffoldReply(refFromRequest, genPortfolio) {
  const base = { issueArcs: [{ n: 1, title: 'the customs house', beats: [] }], characterIcebergs: {} };
  if (!genPortfolio || !refFromRequest) return base;
  const pf = { subject_ref: refFromRequest, facets: PORTFOLIO_FACETS };
  // Guardrails are scoped by SLOT in the response — ids and categories are both backend-owned, so
  // a model can name neither. Attachment resolves slot → category → facet ids.
  if (genPortfolio.guards) pf.misreading_guardrails = genPortfolio.guards;
  base.characterPortfolios = [pf];
  return base;
}

// ══════════════════════════════════════════════════════════════════════════════════════════
// EVERY MODEL REQUEST HAS A NAME (2026-08-29)
//
// A catch-all that answers GENERIC to anything makes an unanticipated dispatch indistinguishable
// from one the harness designed for — so "unknown=0" only ever meant "no unknown API URL". These
// are the SANCTIONED request kinds, each identified by its own prompt signature. In the portfolio
// arms anything that matches none of them is ABORTED and counted as unknownModel, so a new or
// duplicated call changes the accounting instead of hiding inside a generic reply.
// ══════════════════════════════════════════════════════════════════════════════════════════
// ── THE A-PLOT FIXTURE MUST BE VALID (2026-08-29) ──
// GENERIC has no namedClock, no stakesIfFail and no stakesIfWin, so production REJECTED it and
// ran its self-correction pass. That is where "the A-plot generator fires twice" came from: the
// harness's own invalid fixture, described as production behaviour. _antagonist_identity.mjs had
// already established the true baseline — one generator, zero corrections, one compression — and
// this mirrors the shape it proved. Marcus Vale is the PERSON antagonist, so identity minting,
// the scaffold roster and the whole portfolio chain follow from a plot that VALIDATES.
const APLOT_VALID = {
  goal: 'She must clear the manifest before the tide turns and the ship leaves without her sister',
  namedClock: 'the tide at dawn', clockUnit: 'turns', totalClockUnits: 12,
  antagonistOrAntiForce: 'Marcus Vale', antagonistShape: 'A',
  antagonistPersonalTie: 'he sealed the passage her mother once bought',
  // ONLY what the schema offers the model: kind and proper_name. reference_label is derived by
  // the backend from antagonistOrAntiForce, and a fixture that supplies it hands the model back
  // authority the schema deliberately took away — even where the value is then ignored.
  antagonistSubject: { kind: 'PERSON', proper_name: 'Marcus Vale' },
  stakesIfFail: 'she loses the only passage out and her sister sails alone',
  stakesIfWin: 'she reaches her sister before the ship clears the headland',
  pcWound: 'she was left behind once and has never said so out loud to anyone',
  liWound: 'he promised passage to someone once and could not deliver it in time',
  woundLoadBearingProof: 'her fear of being left drives every choice; his failed promise is why he will not promise again',
  milestones: [{ atScene: 1, event: 'she reaches the harbour office and is refused' },
               { atScene: 2, event: "she finds the sealed manifest with her mother's name" },
               { atScene: 3, event: 'the crisis: the tide turns and she must choose', crisis: true }],
};

// AN ANTAGONIST BODY BIBLE THE AUTHOR CAN ACTUALLY USE. Production requires signature_feature,
// softness_seam and at least one of control_tell / pleasure_tell, and DISCARDS anything else — so
// answering this request with GENERIC left state.antagonistBodyBible empty, every later call site
// tried again, and the resulting count measured the fixture rather than production. The archetype
// must be one of the declared keys or it is stripped.
// Clearing the validator is not the same as reproducing a normal author context: visual_anchor is
// what the author is told to OPEN a character's first description on, so a fixture without one
// hands Grok a payload no successful production run would produce. The two SPURNED_EX-only fields
// are deliberately absent — production nulls them for every other archetype.
const ANTAGONIST_BIBLE = {
  archetype: 'BUREAUCRATIC_COLD',
  archetype_signature: 'he makes the rule do the cruelty so his own hands stay clean',
  height: 'tall', build: 'spare', hair: 'iron-grey, cut close', complexion: 'winter-pale',
  eye_color: 'pale grey',
  signature_feature: 'an inkstain worn permanently into the side of his right middle finger',
  voice_quality: 'quiet and unhurried, pitched to make the room lean in',
  hands_quality: 'dry, precise, always squaring what is already square',
  eyes_register: 'they arrive at a person last, after the paperwork',
  proximity_default: 'one step further away than the conversation warrants',
  pc_keeps_noticing: 'that he never raises his voice and never has to',
  targeting_tell: 'he says her full name where a first name would do',
  control_tell: 'he sets a document down and does not let go of it',
  pleasure_tell: 'the pause before he grants something, held a beat too long',
  escalation_tell: 'he begins to quote the clause number instead of the clause',
  softness_seam: 'he cannot throw away a letter someone hand-delivered, and keeps them in order',
  visual_anchor: { focus: 'the hands', detail: 'an inkstain worn into the side of one finger' },
};

// ── EVERY MODEL REQUEST HAS EXACTLY ONE NAME ──
// One bucket per kind, no residual "everything else" bucket, and matching is EXCLUSIVE: the
// signatures are collected and exactly one must match. `find()` would silently assign the first
// of several overlapping classifiers, which is the same fail-open shape as a generic catch-all.
// A correction is distinguished from an initial generation by the retry note production actually
// sends — the validation errors, handed back — not by a substring both requests happen to carry.
const REQUEST_KINDS = [
  // The bounded portfolio batch. It fires whenever a scene stages an ordinary, uncovered,
  // name-only candidate — which every UNSEEDED fixture here does — and production refuses to plan
  // a scene whose due subject has no psychology. A harness that left it unanswered would be
  // testing its own silence.
  ['portfolioBatch',   (t, sys) => /You author CHARACTER PORTFOLIOS/.test(sys)],
  ['scaffold',         (t, sys) => /CONTINUITY ARCHITECT for a serialized/.test(sys)],
  ['author',           (t, sys) => /ARCHITECTURE LAWS/.test(sys)],
  ['planner',          (t, sys) => /scene-structure planner for the OPENING scene/.test(sys)],
  // The retry note is appended to the SYSTEM message (callOneProvider's extraSystemNote), not to
  // the user message — checked in the source rather than assumed, after a first version of this
  // split matched nothing and quietly left every correction filed as a generation.
  ['aplotCorrection',  (t, sys) => /A-PLOT GENERATOR/i.test(sys)
                          && /previous attempt failed validation/i.test(sys)],
  ['aplotGenerator',   (t, sys) => /A-PLOT GENERATOR/i.test(sys)
                          && !/previous attempt failed validation/i.test(sys)],
  ['aplotCompression', t => /compressing the procedural A-plot/.test(t)],
  ['canonicalizer',    t => /canonicalization and normalization engine/.test(t)],
  ['rplot',            t => /designing an R-PLOT/.test(t)],
  ['subplots',         t => /SUBPLOT GENERATOR/.test(t)],
  ['characterSheet',   t => /DISTINGUISHING FEATURE \(anti-calcification ROTATION/.test(t)],
  // These two appear ONLY once the A-plot validates: a PERSON antagonist with full wound
  // architecture is what makes production generate an antagonist body bible and run the
  // wound→LI swap test. The invalid fixture had been suppressing them.
  ['antagonistBodyBible', t => /generating an ANTAGONIST BODY BIBLE/.test(t)],
  ['woundSwapTest',       t => /WOUND→LI SWAP TEST/.test(t)],
  ['pa_lineEditor',    t => /ruthless line-editor for romance prose/.test(t)],
  ['pa_mechanicalFix', t => /Fix ONLY mechanical defects in this scene/.test(t)],
  ['pa_continuation',  t => /same narrator continuing THIS exact scene/.test(t)],
  ['pa_gravity',       t => /editorial auditor measuring EMOTIONAL GRAVITY/.test(t)],
  ['pa_bannedPhrase',  t => /audit prose for BANNED-phrase reuse/.test(t)],
  ['pa_archetype',     t => /craft auditor measuring ARCHETYPE MANIFESTATION COLLAPSE/.test(t)],
  ['pa_liBibleField',  t => /audit WHICH love-interest Bible field/.test(t)],
  ['pa_reparagraph',   t => /copy editor\. Re-paragraph the SCENE/.test(t)],
  ['pa_perception',    t => /PERCEPTION EDITOR/.test(t)],
  ['pa_calcification', t => /calcification detector for a serial-fiction engine/.test(t)],
  ['pa_voiceAnchor',   t => /generate a VOICE ANCHOR/.test(t)],
  ['pa_preciseEditor', t => /precise line-editor, not a writer/.test(t)],
  ['pa_soundscape',    t => /classify the ambient soundscape/.test(t)],
  ['pa_memory',        t => /CHARACTER MEMORY EXTRACTOR/.test(t)],
];

const GENERIC = { goal:L, antagonistOrAntiForce:'the assembly', milestones:[], scenes:[], timelineLength:20,
  characters:[], name:'Julian', distinguishing_feature:'a burn scar', private_hope:L,
  defining_anecdote:L, attraction_manifestation:L, desire_register_exemplars:[L] };

// The planner reply is built FROM the eligible cast the request advertises, so the
// harness never hard-codes a roster the product might legitimately change.

const TPM_SMALL = 20000;
const utf8 = s => Buffer.byteLength(String(s == null ? '' : s), 'utf8');
async function measure(label, seedFn) {
  const browser = await chromium.launch({ headless: true }); const page = await (await browser.newContext()).newPage();
  const rows = []; const planner = []; const logs = [];
  page.on('console', m => { const t = m.text(); if (/SCENE1|STAGE|BeginStory|Gap-2|BAKED|PLANNER|fatal|Fatal|abort|Abort|refus|already|in progress|isBackground|\[STARTER\]|\[SCENE-ASSIGNMENT\]|error|Error/.test(t)) logs.push(t.replace(/\s+/g,' ').slice(0, 200)); });
  page.on('pageerror', e => logs.push('PAGEERROR ' + String(e && e.message).slice(0, 200)));
  await installSession(page);
  await page.route('**/sb-test.localhost/**', r => r.fulfill({ status:200, contentType:'application/json', body:'{}' }));
  await page.route('**/api/**', async route => {
    const url = route.request().url().replace(/^https?:\/\/[^/]+/, '');
    if (/\/api\/config\b/.test(url)) return route.fulfill({ status:200, contentType:'application/json', body: configBody() });
    if (isAuthOrigin(route.request().url())) return route.fulfill({ status:200, contentType:'application/json', body:'{}' });
    if (PASSTHROUGH.test(url)) return route.fulfill({ status:200, contentType:'application/json', body:'{}' });
    const k = Object.keys(LOCAL).find(x => url.startsWith(x));
    if (k) return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(LOCAL[k]) });
    let b=null; try { b = JSON.parse(route.request().postData()||'{}'); } catch(_){ b = {}; }
    if (!MODEL.test(url)) return route.fulfill({ status:200, contentType:'application/json', body:'{}' });
    const m=(b&&b.messages)||[]; const sys=String((m.find(x=>x.role==='system')||{}).content||''); const usr=String((m.find(x=>x.role==='user')||{}).content||'');
    const _txt = sys + '\n' + usr; const _hits = REQUEST_KINDS.filter(([, test]) => test(_txt, sys, usr)).map(([k]) => k);
    let bytes = 0; for (const mm of m) bytes += utf8(mm && mm.content);
    rows.push({ url, role: b.role || null, model: b.model || b.preferredModel || null, kind: _hits.join('+') || 'unclassified', bytes, max_tokens: Number(b.max_tokens||0)||0, reserve: bytes + (Number(b.max_tokens||0)||0) });
    let out;
    const kind = _hits.length === 1 ? _hits[0] : null;
    if (kind === 'portfolioBatch') {
        const refs = [...sys.matchAll(/subject_ref: (\S+)/g)].map(m => m[1]);
        // The five NAMED SLOTS the contract now requires, plus the per-facet contrast fields and
        // the per-subject signature. A harness that kept the old shape would be testing a schema
        // production no longer accepts.
        const DIMS = ['value','insecurity','defense','relationship','exception'];
        let _fi = 0;
        // Third person, mechanisms rather than maxims, a named pressure in every prediction, and
        // an exception that says which slot it complicates and when. Placeholder predictions no
        // longer validate — the gates they would fail are the ones the live sample failed.
        const F = (canonical_truth, unique_prediction, w1, e1, w2, e2) => ({
          dimension: DIMS[(_fi++) % DIMS.length], canonical_truth, unique_prediction,
          not_explained_by: 'not the neighbouring facet, which is about something else entirely',
          applicability_conditions: [{ text:w1, evidence_words: e1.split('|') }, { text:w2, evidence_words: e2.split('|') }],
          forbidden_restatements: [{ forbid:'is predictable', why:'the truth stated, not shown' }] });
        out = JSON.stringify({ characterPortfolios: refs.map(r => ({ subject_ref: r,
          identity_signature: 'the only one here who reads a rule as a shelter rather than a weapon',
          facets: (_fi = 0, [
          F('With people who hold no leverage over her she is unexpectedly generous.',
            'Offered a favour by someone powerful, she declines it and helps the clerk instead.',
            'a procedure the house performs every day','customs|house','a step nobody audits','signed|counts|already'),
          F('Deference paid to someone else makes her newly attentive to her own standing.',
            'When a junior is thanked before her, she recites her own seniority to a stranger.',
            'a room holding more than one authority','customs|house|Lirael','someone junior given weight','younger|senior|standing'),
          F('Paperwork repeated daily rarely earns her full attention, and she barely hides it.',
            'Asked to witness a routine signing, she signs without reading and dares anyone to object.',
            'a mistake that can still be corrected','counts|signed|already','a person doing the work badly','error|wrong|mistake'),
          F("She turns another person's error into an instruction, wanted or not.",
            'Once a colleague admits confusion, she explains at length past the point of welcome.',
            'an obligation already entered into','signed|counts|already','a price judged small','cost|price|paid'),
          F('Her relationship habit of correcting others stops with anyone already humiliated once.',
            'When a clerk she once corrected is mocked by someone else, she covers the error herself.',
            'someone with nothing to trade','customs|house|Lirael','a person placed beneath her','beneath|edge|apart')]) })) });
      } else if (kind === 'scaffold') {
        // The roster line the request carries is the ONLY source of the ref the responder echoes
    } else if (kind === 'scaffold') {
      const _ref = _txt.match(/subject_ref:\s*(\S+)/);
      out = JSON.stringify(scaffoldReply(_ref ? _ref[1] : null, true));
    } else if (kind === 'planner') {
      planner.push({ url, model: b.model, role: b.role, reasoningEffort: b.reasoningEffort, max_tokens: b.max_tokens, reasoning_effort: b.reasoning_effort, response_format: b.response_format,
                     sysBytes: utf8(sys), usrBytes: utf8(usr), bytes, reserve: bytes + (Number(b.max_tokens||0)||0), sysHead: sys.slice(0, 80), plannerOwned: /\"stage_contract\": \\{|STAGE_CONTRACT RULES|STAGE_CONTRACT \\(REQUIRED\\)/.test(usr), missionRule: /SCENE MISSION \(REQUIRED in this mode\)/.test(usr) });
      out = JSON.stringify(GENERIC);                    // measurement ends here; the stage contract aborts by design
    } else if (kind === 'aplotGenerator' || kind === 'aplotCorrection') {
      out = JSON.stringify(APLOT_VALID);
    } else if (kind === 'antagonistBodyBible') {
      out = JSON.stringify(ANTAGONIST_BIBLE);
    } else out = JSON.stringify(GENERIC);
    const envelope = /mistral-proxy/.test(url)
      ? { id:'mock', object:'chat.completion', model:b.model, usage:{}, _orchestration:{}, choices:[{ index:0, finish_reason:'stop', message:{ role:'assistant', content: out } }] }
      : { ok:true, content: out, choices:[{ message:{ content: out } }] };
    return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(envelope) });
  });
  const t0 = Date.now(); let ok = false;
  while (Date.now() - t0 < 240000 && !ok) { try { await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout:20000 }); await page.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_STORIES, { timeout:60000 }); ok = true; } catch (_) { await new Promise(r => setTimeout(r, 3000)); } }
  if (!ok) throw new Error('server never answered');
  await page.evaluate(seedFn); await page.waitForTimeout(6000); await page.evaluate(seedFn); // seed again after the async profile/wallet restore settles
  let threw = null; try { await page.evaluate(() => Promise.race([window.handleBeginStory(), new Promise(x => setTimeout(x, 150000))])); } catch (e) { threw = String(e && e.message).slice(0, 160); }
  await page.waitForTimeout(3000);
  const st = await page.evaluate(() => ({ fatal: window.state._scene1SkeletonFatal || null, quotaBusy: window.state._scene1QuotaBusy || null, pages: window.StoryPagination.getPageCount(), world: window.state.picks && window.state.picks.world, starter: window.state._starterId || null }));
  await browser.close();
  const p = planner[0] || null;
  // 2026-09-07: the planner authors on the direct-Grok route (/api/proxy), which the Mistral governor does not see.
  const verdict = p ? (/\/api\/proxy\b/.test(String(p.url || '')) ? ('UNGOVERNED — direct Grok route (' + p.model + ', effort ' + (p.reasoningEffort || p.reasoning_effort || '?') + '); Mistral reserve comparison moot (would be ' + (p.reserve <= TPM_SMALL ? 'ADMITTED' : 'OVERSIZED') + ')') : (p.reserve <= TPM_SMALL ? 'ADMITTED' : 'OVERSIZED (refused before dispatch)')) : 'planner request NOT REACHED';
  console.log(`\n=== ${label} ===`);
  console.log(`planner: ${p ? `model=${p.model} sysBytes=${p.sysBytes} usrBytes=${p.usrBytes} bytes=${p.bytes} max_tokens=${p.max_tokens} reserve=${p.reserve} plannerOwned=${p.plannerOwned} missionRule=${p.missionRule} vs ${TPM_SMALL} → ${verdict}` : verdict}`);
  console.log(`state after: ${JSON.stringify(st)}${threw ? ' threw=' + threw : ''}`);
  console.log('dispatches (kind · model · reserve): ' + rows.map(r => `${r.kind}·${r.model}·${r.reserve}`).join(' | '));
  console.log('console (filtered, last 25): ' + logs.slice(-25).join(' ⏎ '));
  return { label, planner: p, rows, st, threw, logs: logs.slice(-60) };
}
const modern = () => { const s = window.state; window.__disableSpeculativePreload = true;
  s.picks = Object.assign(s.picks||{}, { world:'Modern', worldSubtype:'small_town', tone:'Earnest', flavor:'Billionaire', dynamic:'Enemies', pov:'first_person', length:'fling', intensity:'low', archetype:{ primary:'BEAUTIFUL_RUIN' }, playerMask:'OPEN_VEIN', loveInterest:'Male', identity:{ playerName:'Testa', partnerName:'Rook' } });
  Object.assign(s, { world:'Modern', worldSubtype:'small_town', flavor:'Billionaire', dynamic:'Enemies', archetype:{ primary:'BEAUTIFUL_RUIN', modifier:null }, name:'Testa', playerName:'Testa', loveInterestName:'Rook', partnerName:'Rook', loveInterest:'Male', liGender:'male', playerMask:'OPEN_VEIN', storyLength:'fling', tier:'fling', access:'sub', subscribed:true, fortunes:9999999, intensity:'low', pov:'first_person', identity:{ playerName:'Testa', partnerName:'Rook' }, renderMode:'literary', currentEngine:'literary', storyId:'plannerreserve-modern', myUid:'probe', _skipCorridorValidation:true });
  s.picks.identity = s.identity; };
const seeded = () => { const s = window.state; window.__disableSpeculativePreload = true;
  const def = (window.STARTER_STORIES||[]).find(d=>d&&d.id==='starter_first_sacrifice'); s.picks = s.picks||{};
  ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies'].forEach(k=>{ s.picks[k]=def[k]; });
  Object.assign(s,{ world:def.world, worldSubtype:def.worldSubtype, flavor:def.flavor, dynamic:def.dynamic, archetype:{primary:def.archetype,modifier:null}, name:'Lirael', playerName:'Lirael', loveInterestName:'Julian', partnerName:'Julian', loveInterest:'Male', liGender:'male', playerMask:'OPEN_VEIN', storyLength:'fling', tier:'fling', access:'sub', subscribed:true, fortunes:9999999, intensity:'Steamy', pov:'first_person', identity:{playerName:'Lirael',partnerName:'Julian'}, renderMode:'literary', currentEngine:'literary', storyId:'plannerreserve-seeded', myUid:'probe', _starterId: def.id, is_starter_story: true, immutableTitle: def.title, _skipCorridorValidation:true });
  s.picks.identity = s.identity; };
const results = [];
if (process.env.ONLY_MODERN === '1') { results.push(await measure('MODERN CORRIDOR (pilot config, no mission) — console trace', modern)); fs.writeFileSync('_validate_out/scene1_planner_reserve_modern_trace.json', JSON.stringify(results, null, 2)); process.exit(0); }
results.push(await measure('MODERN CORRIDOR (pilot config)', modern));
results.push(await measure('SEEDED FIRST SACRIFICE (consistency check; prior measurement 92,980)', seeded));
const modernMission = () => { const s = window.state; window.__disableSpeculativePreload = true;
  s.picks = Object.assign(s.picks||{}, { world:'Modern', worldSubtype:'small_town', tone:'Earnest', flavor:'Billionaire', dynamic:'Enemies', pov:'first_person', length:'fling', intensity:'low', archetype:{ primary:'BEAUTIFUL_RUIN' }, playerMask:'OPEN_VEIN', loveInterest:'Male', identity:{ playerName:'Testa', partnerName:'Rook' } });
  Object.assign(s, { world:'Modern', worldSubtype:'small_town', flavor:'Billionaire', dynamic:'Enemies', archetype:{ primary:'BEAUTIFUL_RUIN', modifier:null }, name:'Testa', playerName:'Testa', loveInterestName:'Rook', partnerName:'Rook', loveInterest:'Male', liGender:'male', playerMask:'OPEN_VEIN', storyLength:'fling', tier:'fling', access:'sub', subscribed:true, fortunes:9999999, intensity:'low', pov:'first_person', identity:{ playerName:'Testa', partnerName:'Rook' }, renderMode:'literary', currentEngine:'literary', storyId:'plannerreserve-modern-mission', myUid:'probe', _skipCorridorValidation:true });
  s.picks.identity = s.identity;
  // the dry suite's own unseeded ('solo') arm seeds a corridor mission this way so the stage resolves before the planner
  s._scene1Mission = 'She waits alone at the gala bar before the stranger arrives, counting what the invitation already cost her'; };
results.push(await measure('MODERN CORRIDOR + seeded scene mission (stage resolves via scene-mission source)', modernMission));
fs.writeFileSync('_validate_out/scene1_planner_reserve.json', JSON.stringify(results, null, 2));
