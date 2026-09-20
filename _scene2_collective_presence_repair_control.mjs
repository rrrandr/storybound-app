// SCENE 2 PLANNER — COLLECTIVE SCENE PRESENCE MODELING (Roman, 2026-09-20, third pass)
//
// The prior repair pass found a real, disclosed content defect: the retained real planner
// response's `present[]` named "the assembly", which is not a member of the fixed-seed
// individual roster (Lirael/Seren/Julian/the presiding Dohkar) — _validateLocalObjective
// rejected the WHOLE objective for it. The previous control's Section C worked around this by
// stripping "the assembly" out of a test fixture. Roman flagged that as the wrong fix: the
// planner's output budget would still feed the author an unresolved scene entity in production.
//
// This is the real fix: "the assembly" is modeled as an explicit, seed-authored, structured
// COLLECTIVE scene presence (public/app.js STARTER_PLANS.starter_first_sacrifice.scenes[n=2]
// .collectives), distinct from the individual roster by construction — it can never enter
// `roster`/`stage.participants`, and _validateLocalObjective now enforces the two rules Roman
// specified: (1) present[] may resolve to EITHER a roster member OR a declared collective
// (never a freeform, undeclared string), and (2) local_objective_actor must ALWAYS resolve to
// an individual roster member — a collective is never eligible to be the actor, so it can never
// get dialogue attribution, a facet, or Character+/relationship grounding.
//
// Fully dry: zero network calls (this exercises _effectiveSceneRow/_validateLocalObjective
// directly, in-page — no planner/author call is made or stubbed).
//
// usage: node _scene2_collective_presence_repair_control.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 600) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

// ── Load the real retained (already-truncated, then completed) planner content, UNMODIFIED — no
// stripping of "the assembly" this time; that workaround is exactly what this repair replaces. ──
const REPLAY_LOG = path.join(__dirname, '_scene2_repair_replay_sample_out', 'run_1789881139272.jsonl');
const replayEvents = fs.readFileSync(REPLAY_LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const truncatedEvent = replayEvents.find((e) => e.kind === 'response' && e.roleTag === 'scene2-structural-author' && e.responseBody && e.responseBody.choices);
const REAL_TRUNCATED_CONTENT_RAW = truncatedEvent.responseBody.choices[0].message.content;
const strippedTruncated = REAL_TRUNCATED_CONTENT_RAW.replace(/^```json\s*/i, '');
const REAL_COMPLETED_CONTENT_UNMODIFIED = strippedTruncated + ' her own to bear.",\n  "branch_b": "Lirael turns the moment back onto Julian, naming his own hand in what the assembly is now calling judgment."\n}';
const realCompletedParsed = JSON.parse(REAL_COMPLETED_CONTENT_UNMODIFIED);
console.log('✓ loaded the real, retained completed planner content — present: ' + JSON.stringify(realCompletedParsed.present));

(async () => {
  let browser;
  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
  catch (e) { console.error('HARNESS BLOCKER: could not launch a real browser — ' + (e && e.message)); process.exit(2); }
  const page = await (await browser.newContext({ viewport: { width: 1100, height: 900 } })).newPage();

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => window.state && typeof window._effectiveSceneRow === 'function' && typeof window._validateLocalObjective === 'function', { timeout: 20000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready — ' + (e && e.message)); await browser.close(); process.exit(2); });

  // Minimal state — only what _activePlan(s) needs to resolve STARTER_PLANS.starter_first_sacrifice.
  // No OAS turn, no Fate Card, no scaffold, no network stubs: this is the validator's own logic,
  // isolated, matching how it is really invoked from the scene-spine planner dispatch.
  await page.evaluate(() => { window.state._starterId = 'starter_first_sacrifice'; });

  section('0. SEED DATA — the collective is declared, structural, and separate from the individual roster');
  const eff = await page.evaluate(() => window._effectiveSceneRow(window.state, 2));
  ok('scene 2 declares exactly one collective, "the assembly", with a stable id', Array.isArray(eff.collectives) && eff.collectives.length === 1 && eff.collectives[0].id === 'the_assembly' && eff.collectives[0].label === 'the assembly', JSON.stringify(eff.collectives));
  ok('the roster (individual cast) is the 4 named cast members ONLY — the collective is never in it', eff.roster.length === 4 && !eff.roster.some((r) => /assembly/i.test(r.label) || /assembly/i.test(r.ref)), JSON.stringify(eff.roster));

  section('A. present[] MAY resolve to a declared collective (the real defect this repairs)');
  const validReply = {
    local_objective: 'Lirael steps forward onto the dais as the assembly watches.',
    posture_read: 'The reader wants Lirael to meet the moment head-on.',
    local_objective_actor: 'Lirael',
    present: ['Lirael', 'Seren', 'Julian', 'the presiding Dohkar', 'the assembly'],
    reserved: { price_identified: 'untouched', inquiry_opened: 'untouched', julian_counter_wish: 'untouched', julian_obscuring_wishes: 'untouched' },
    aftermath: { twist_manifested: 'kept', interrogation_interrupted: 'kept', the_answer_institutional: 'kept', inquiry_authority_claimed: 'kept' },
  };
  const validResult = await page.evaluate(({ reply, eff }) => window._validateLocalObjective(reply, eff), { reply: validReply, eff });
  ok('a reply naming the declared collective in present[] is ACCEPTED (not rejected as "outside the seed roster")', validResult.ok === true, JSON.stringify(validResult));

  section('B. present[] must NOT accept an undeclared, freeform collective (negative control — this is not a blanket relaxation)');
  const freeformReply = Object.assign({}, validReply, { present: ['Lirael', 'Seren', 'Julian', 'the presiding Dohkar', 'the crowd'] });
  const freeformResult = await page.evaluate(({ reply, eff }) => window._validateLocalObjective(reply, eff), { reply: freeformReply, eff });
  ok('a reply naming an UNDECLARED collective ("the crowd") is still REJECTED', freeformResult.ok === false && freeformResult.why.some((w) => /outside the seed roster or declared collectives/.test(w)), JSON.stringify(freeformResult));

  section('C. local_objective_actor must NEVER resolve to a collective — never dialogue attribution, facets, or C+/relationship grounding');
  const collectiveActorReply = Object.assign({}, validReply, { local_objective_actor: 'the assembly' });
  const collectiveActorResult = await page.evaluate(({ reply, eff }) => window._validateLocalObjective(reply, eff), { reply: collectiveActorReply, eff });
  ok('a reply naming the collective as local_objective_actor is REJECTED', collectiveActorResult.ok === false && collectiveActorResult.why.some((w) => /collective presence, not an individual cast member/.test(w)), JSON.stringify(collectiveActorResult));

  section('D. the REAL retained completed content (unmodified — "the assembly" left in present[]) now validates cleanly');
  const realResult = await page.evaluate(({ reply, eff }) => window._validateLocalObjective(reply, eff), { reply: realCompletedParsed, eff });
  ok('the real completed content, UNMODIFIED, is ACCEPTED — no stripping needed', realResult.ok === true, JSON.stringify(realResult));

  section('E. structural non-leak — even when accepted, the collective never becomes a staged individual participant or eventFacts actor');
  const staged = await page.evaluate(({ reply, sceneNum }) => {
    window.state._sceneObjectives = window.state._sceneObjectives || {};
    window.state._sceneObjectives[String(sceneNum)] = { status: 'accepted', local_objective: reply.local_objective, actor: reply.local_objective_actor, present: reply.present, posture_read: reply.posture_read };
    var effAfter = window._effectiveSceneRow(window.state, sceneNum);
    return { stageParticipants: effAfter.stage && effAfter.stage.participants, eventFacts: effAfter.eventFacts, participants: effAfter.participants };
  }, { reply: realCompletedParsed, sceneNum: 2 });
  ok('stage.participants (who is actually staged as an individual) never includes "the assembly"', Array.isArray(staged.stageParticipants) && !staged.stageParticipants.some((p) => /assembly/i.test(p.label || p.ref || '')), JSON.stringify(staged.stageParticipants));
  ok('eventFacts (the attributed dramatic action) is grounded on the real actor (Lirael), never the collective', Array.isArray(staged.eventFacts) && staged.eventFacts.length > 0 && staged.eventFacts.every((f) => (f.participants || []).every((p) => !/assembly/i.test(p.label || p.ref || ''))), JSON.stringify(staged.eventFacts));

  await browser.close();

  console.log('\n' + '='.repeat(100));
  console.log('SCENE 2 COLLECTIVE PRESENCE REPAIR CONTROL: ' + results.filter(r => r.pass).length + '/' + results.length + ' passed');
  process.exitCode = results.every(r => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
