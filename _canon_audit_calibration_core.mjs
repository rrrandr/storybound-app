// CANON AUDIT CALIBRATION — CORE (side-effect-free; importing it dispatches nothing).
//
// Measures ONE thing: can the primary auditor model actually judge canon, using the REAL
// production prompt (_buildCanonAuditPrompt), the REAL packet (_buildCanonPacket) and the REAL
// validator (_validateCanonAuditResponse)? No scene generation, no story mutation, no author.
//
// TWO CORRECTIONS to the proposed shape, both deliberate:
//
// 1. PRIMARY TIER ONLY. The point is to measure ministral-8b-2512. A transport failure that
//    cascades to grok-4-1-fast-reasoning would silently measure a DIFFERENT model and report the
//    result as Mistral's — contaminating the only number this exercise exists to produce. A
//    primary-tier failure is therefore recorded as 'unavailable' for that fixture, not retried
//    elsewhere.
// 2. THE ARITHMETIC. Eight fixtures at the primary tier is $0.003960. A FULL 3-tier cascade on all
//    eight would be $0.050440 — above the ~$0.03 worst case in the proposal, because
//    grok-4-1-fast-reasoning alone is $0.005 per fixture. Pinning to the primary tier makes the
//    worst case equal the expected case and removes the discrepancy entirely.
//
// THE FAILURE THAT MATTERS MOST: a VALID but incorrect "pass" on a red fixture. It passes
// validation, triggers no tier fallback, and would let the plan through in production. It is
// scored separately and loudly.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// CANDIDATE MODELS. One is measured per run, pinned — never a chain (see correction 1 above).
// Rates are verbatim from public/app.js TEXT_PRICING, and for mistral-small-2603 from Mistral's
// own published pricing (mistral.ai/pricing/api and docs.mistral.ai/inference/pricing, both read
// 2026-09-24: $0.15/M in, $0.60/M out).
//
// ── mistral-small-2603 (Mistral Small 4) — VERIFIED AGAINST OFFICIAL DOCS, NOT INFERRED ───────
//  · The id exists and is CURRENT. docs.mistral.ai/models/mistral-small-4-0-26-03 gives the API
//    id `mistral-small-2603`, v26.03, 256k context. Every earlier Small snapshot (-2506, -2503,
//    -2501, -2409, -2402) is listed DEPRECATED in the models-overview table.
//  · The PINNED SNAPSHOT is used deliberately, never `mistral-small-latest`. Mistral's own
//    lifecycle page warns that an alias "may expose you to silent updates in model behavior and
//    pricing" and tells you to pin for precise control. A calibration whose model can change
//    underneath it measures nothing.
//  · reasoning_effort is a REAL parameter on chat completions, confirmed in the official OpenAPI
//    schema (docs.mistral.ai/openapi.yaml): ChatCompletionRequest.reasoning_effort, enum
//    none|minimal|low|medium|high|xhigh. 'high' is one of only two values the prose docs actually
//    describe, and is the one they recommend. This is NOT inferred from the model's name.
//  · The separate reasoning family is GONE: Magistral is deprecated and its retirement dates
//    (2026-07-31) have passed. Reasoning is a parameter on Small 4, not a model.
//
// TOKEN BUDGET AND THE $0.02 CEILING. Reasoning tokens bill as OUTPUT and Mistral does NOT break
// them out — chat usage exposes only prompt/completion/total, with no reasoning_tokens field. So
// thinking is invisible in the usage object and can only be bounded by max_tokens. The measured
// gpt-4o-mini run used ~2,200 input tokens per fixture; a prior in-repo probe measured thinking
// inflating completion by 2.0–2.7x. max_tokens is therefore raised to 2000 for this candidate (at
// 700 the thinking blocks could consume the entire budget and truncate the JSON answer), and the
// reservation is priced at that FULL ceiling rather than an expected value:
//   in  3000 x $0.15/M = $0.00045      out 2000 x $0.60/M = $0.00120
//   per call $0.00165  x 8 fixtures   = $0.01320, inside a $0.02 ceiling.
// $0.02 is kept rather than tightened to ~$0.014 precisely because thinking-token billing is
// undocumented; a tighter bound would be asserting something Mistral does not state.
export const CANDIDATES = {
  'ministral-8b-2512':  { provider: 'mistral', endpoint: '/api/mistral-proxy',  rate: { in: 1.5e-7, out: 1.5e-7 } },
  'gpt-4o-mini':        { provider: 'openai',  endpoint: '/api/chatgpt-proxy',  rate: { in: 1.5e-7, out: 6e-7 } },
  'mistral-small-2603': { provider: 'mistral', endpoint: '/api/mistral-proxy',  rate: { in: 1.5e-7, out: 6e-7 },
                          reasoningEffort: 'high', maxTokens: 2000, tokens: { in: 3000, out: 2000 },
                          ceilingUsd: 0.02 }
};
export const DEFAULT_MODEL = 'gpt-4o-mini';
export function candidate(model) {
  const c = CANDIDATES[model];
  if (!c) throw new Error('unpriced/unknown calibration model: ' + model);
  const tk = c.tokens || { in: 2600, out: 700 };
  return Object.assign({
    model: model,
    perCallUsd: c.rate.in * tk.in + c.rate.out * tk.out,
    maxTokens: c.maxTokens || 700,
    reasoningEffort: c.reasoningEffort || null,
    ceilingUsd: (typeof c.ceilingUsd === 'number') ? c.ceilingUsd : CEILING_USD
  }, c);
}
export const PRIMARY_MODEL = 'ministral-8b-2512';
export const PRIMARY_ENDPOINT = '/api/mistral-proxy';
export const TOKENS = { in: 2600, out: 700 };
export const RATE = { in: 1.5e-7, out: 1.5e-7 };            // public/app.js TEXT_PRICING
export const PER_CALL_USD = RATE.in * TOKENS.in + RATE.out * TOKENS.out;   // $0.000495
export const CEILING_USD = 0.01;

const SCENE_B = path.join(__dirname, '_tempt_fate_fixtures', 'scene_b_2026-09-24_08-41-30');
const SCENE_A = path.join(__dirname, '_tempt_fate_fixtures', 'run_2026-09-24_02-11-02_scene_a');
// Retained under _tempt_fate_fixtures, NOT under a control's output directory — control outputs
// are wiped on every run, and a fixture that vanishes when a test runs is not a fixture.
const CORPUS = path.join(__dirname, '_tempt_fate_fixtures', 'known_good_planner_corpus.json');

export function loadFixtures() {
  const redB = JSON.parse(fs.readFileSync(path.join(SCENE_B, 'scene_b_planner_response.json'), 'utf8'));
  const durable = JSON.parse(fs.readFileSync(path.join(SCENE_A, 'outcome_record.json'), 'utf8')).durableConsequences[0];
  const corpus = JSON.parse(fs.readFileSync(CORPUS, 'utf8'));
  // The retained corpus plan that asserts a visible magical effect — found during the
  // false-positive probe, against this story's own "a wish produces NO visible magical effect".
  const glow = corpus.find((p) => /\bglow\w*\b|\bvisible burn\b/i.test(String(p.state_change || ''))) || corpus[0];

  const ord = (slots) => Object.assign({ mechanism_grounding: 'ordinary' }, slots || {});

  return {
    durable,
    fixtures: [
      // ── REDS: each must be caught ────────────────────────────────────────────────────────
      { id: 'red_memory_extraction', expect: 'violation', hard: true,
        // A catch must pair an APPROPRIATE category with a fact of a kind that actually supports it.
        expectCategories: ['unsupported_capability','new_metaphysics'], supportingFactKinds: ['neg'],
        why: 'the retained failed Scene B proposal, relabelled ordinary — mind-extraction no canon grants',
        plan: Object.assign({}, redB, { event_slots: Object.assign({}, redB.event_slots, { mechanism_grounding: 'ordinary' }) }) },
      { id: 'red_visible_glow', expect: 'violation', hard: true,
        // A catch must pair an APPROPRIATE category with a fact of a kind that actually supports it.
        expectCategories: ['unsupported_capability','new_metaphysics'], supportingFactKinds: ['neg'],
        why: 'a REAL retained corpus plan asserting a visible magical effect, against "a wish produces NO visible magical effect"',
        plan: Object.assign({}, glow, { event_slots: ord(glow.event_slots) }) },
      { id: 'red_contradicted_knowledge', expect: 'violation', hard: true,
        // A catch must pair an APPROPRIATE category with a fact of a kind that actually supports it.
        expectCategories: ['contradicted_knowledge'], supportingFactKinds: ['know','dc'],
        why: 'the committed rupture left the assembly unaware; this plan has the Dohkar act on detailed knowledge of the forgotten accusation',
        plan: { tactical_move: 'press the accusation formally',
          state_change_precondition: 'The Dohkar has not yet named the accusation aloud.',
          state_change: 'The presiding Dohkar recounts the accusation in detail and names Lirael as its subject',
          forces_choice: 'forces Lirael to choose between denying it and conceding it',
          branch_a: 'deny it', branch_b: 'concede it',
          event_slots: ord({ precondition: 'the Dohkar and the assembly are present', actor: 'the presiding Dohkar',
            action: 'recounts in detail', target: 'the accusation nobody remembers',
            exit_state: 'the assembly now hears the accusation restated by the Dohkar' }) } },
      { id: 'red_invalidated_objective', expect: 'violation', hard: true,
        // A catch must pair an APPROPRIATE category with a fact of a kind that actually supports it.
        expectCategories: ['invalidated_objective'], supportingFactKinds: ['inv'],
        why: 'the committed record invalidated the formal inquiry; this plan convenes it anyway',
        plan: { tactical_move: 'open the scheduled proceeding',
          state_change_precondition: 'The formal inquiry has not yet been convened.',
          state_change: 'The formal inquiry into the ceremony is convened and its terms are read out',
          forces_choice: 'forces Lirael to choose between testifying and refusing',
          branch_a: 'testify', branch_b: 'refuse',
          event_slots: ord({ precondition: 'the Dohkar council is present', actor: 'the presiding Dohkar',
            action: 'convenes the formal inquiry', target: 'the ceremony',
            exit_state: 'the formal inquiry into the ceremony is now open' }) } },

      // ── GREENS: each must pass; any violation here is a false positive ───────────────────
      { id: 'green_confusion_records', expect: 'pass', hard: true,
        why: 'unexplained confusion and a contradictory ledger — ordinary, invents no metaphysics',
        plan: { tactical_move: 'let the record contradict the room',
          state_change_precondition: 'The registrar has not yet read the ledger aloud.',
          state_change: "The registrar reads a rite from the ledger that nobody present remembers attending",
          forces_choice: 'forces Lirael to choose between correcting the record and letting it stand',
          branch_a: 'correct the record', branch_b: 'let it stand',
          event_slots: ord({ precondition: 'the registrar and the assembly are present', actor: 'the registrar',
            action: 'reads the ledger aloud', target: 'the assembly',
            exit_state: 'the assembly now knows the ledger and their memories disagree' }) } },
      { id: 'green_alignment_sense', expect: 'pass', hard: true,
        why: 'alignment-sense is EXPLICITLY established canon for First Favored',
        plan: { tactical_move: 'use what she actually is',
          state_change_precondition: 'Lirael has not yet named the misalignment aloud.',
          state_change: 'Lirael senses the misalignment in the Dohkar and says so before the assembly',
          forces_choice: 'forces Lirael to choose between pressing the claim and withdrawing it',
          branch_a: 'press it', branch_b: 'withdraw it',
          event_slots: { precondition: 'Lirael and the Dohkar are present', actor: 'Lirael',
            action: 'senses misalignment and names it', target: 'the presiding Dohkar',
            exit_state: 'the assembly has heard a Sacrificiant accuse the Dohkar of misalignment',
            mechanism_grounding: 'ALIGNMENT-SENSE (the First Favored gift): they perceive ALIGNMENT, how far a person’s desire, intention, sacrifice, and deepest self all point at one truth' } } },
      { id: 'green_tempt_history_rewrite', expect: 'pass', hard: true,
        why: 'a committed history_rewrite rupture legitimately changed the past; building on it is not an invention',
        // A GENUINE, INTERNALLY CONSISTENT record (Roman 2026-09-24). The earlier version mutated
        // the memory-erasure consequence's ruptureClass and bolted on priorHistoryReplaced, leaving
        // a record whose requestedRupture and deliveredScope still described a forgetting — and
        // _buildCanonPacket did not emit class detail at all, so the authorising fact never reached
        // the auditor. Mistral would have been asked to approve a plan resting on a fact it was
        // never shown, and condemned for a packet defect. This is a whole coherent consequence.
        durableOverride: {
          id: 'tfc_hist_1', source: 'tempt', proposalId: 'tfl_hist_1',
          requestedRupture: 'let Seren never have stood for the rite at all',
          sceneIdx: 1, bargainId: null,
          changed: [{ subject: 'Seren', whatChanged: 'never stood for the rite; the ceremony had no graduant' }],
          durability: [{ aspect: 'the rewritten history', status: 'persists' }],
          knowledgeStates: [{ character: 'the assembly', state: 'believes', note: 'that no graduant was ever called' }],
          establishedEvidence: ["the registrar's ledger has no entry against Seren's name"],
          openPossibilities: ['someone could find the older copy of the ledger'],
          requestedScope: 'let Seren never have stood for the rite at all',
          deliveredScope: 'Seren never stood for the rite; the ceremony convened with no graduant',
          scopeMatch: 'full', scopeNote: '',
          ruptureClass: 'history_rewrite',
          invalidatedPlans: ["Seren's sacrifice cannot be taken — there was no sacrifice to take"],
          classDetail: {
            priorHistoryReplaced: 'Seren never stood for the rite; the ceremony convened with no graduant at all',
            survivingContradictions: ['the ceremonial sash cut to her measure is still folded in the vestry']
          },
          permanent: true
        },
        plan: { tactical_move: 'act from the history that now holds',
          state_change_precondition: 'Seren has not yet been addressed as someone who never stood for the rite.',
          state_change: 'The assembly addresses Seren as a youth who never stood for the rite at all',
          forces_choice: 'forces Lirael to choose between confirming the new history and contradicting it',
          branch_a: 'confirm it', branch_b: 'contradict it',
          event_slots: ord({ precondition: 'Seren and the assembly are present', actor: 'the assembly',
            action: 'addresses', target: 'Seren',
            exit_state: 'Seren is now treated as someone who never stood for the rite' }) } },
      { id: 'green_mundane_invention', expect: 'pass', hard: true,
        why: 'invented dialogue, movement and consequence within established capability — the planner\'s job',
        plan: { tactical_move: 'force the question into the open',
          state_change_precondition: 'Julian has not yet produced the torn band.',
          state_change: 'Julian lifts the torn mouth-band before the assembly and asks whose it is',
          forces_choice: 'forces Lirael to choose between claiming it and letting the question stand',
          branch_a: 'claim it', branch_b: 'let it stand',
          event_slots: ord({ precondition: 'Julian and the assembly are present', actor: 'Julian',
            action: 'lifts and asks', target: 'the assembly',
            exit_state: 'the assembly now knows a torn band exists and nobody claims it' }) } }
    ]
  };
}

// ── EXTRAPOLATION FIXTURES — DRY ONLY, DELIBERATELY NOT IN THE PAID SET ──────────────────────
// These distinguish CAPABILITY-ROOTED EXTRAPOLATION from both failure modes: demanding a
// precedent for the exact act, and permitting anything canon fails to mention. They are exported
// SEPARATELY and are NOT returned by loadFixtures(), so the paid calibration keeps its original
// eight-result comparison intact. Adding them to a paid run would change the request count and the
// ceiling, and must be priced and authorized on its own terms — see EXTRAPOLATION_PAID_COST below.
//
// They carry their OWN capability facts, because First Sacrifice canon establishes no disguise
// ability. The dry control injects these through the REAL character ledger so they reach the
// auditor as real cap_ facts from the REAL packet builder — never as a hand-built packet.
export function extrapolationFixtures() {
  const ord = (slots) => Object.assign({ mechanism_grounding: 'ordinary' }, slots || {});
  // One established capability, stated once, shared by every fixture below. The RED cases differ
  // from the GREEN ones ONLY in the category of effect they require — not in how exotic they look.
  const DISGUISE = 'Sath (Kwisheen): established ability — may alter their own APPEARANCE at will, '
    + 'taking on any outward form or likeness. The change is appearance only: it confers no strength, '
    + 'no mass, no new organs, and no ability the wearer did not already have.';
  const TWELVE = 'The Kwisheen delegation (twelve): each holds the same established appearance-'
    + 'altering ability; they are practised at working in concert.';
  const LIMIT = 'Kwisheen appearance-change CANNOT be held while unconscious, and collapses the '
    + 'moment its holder loses consciousness.';
  return [
    // ── GREEN: extraordinary-LOOKING, but every extraordinary effect traces to the capability ──
    { id: 'x_green_dragon_appearance', expect: 'pass', hard: true, capabilityFacts: [DISGUISE],
      why: 'an established appearance ability applied to a form canon never names — novel application, same KIND of effect',
      plan: { tactical_move: 'frighten the crowd without touching anyone',
        state_change_precondition: 'Sath has not yet taken a form larger than a person.',
        state_change: 'Sath takes on the outward appearance of a dragon and looms over the square, gaining no dragon abilities',
        forces_choice: 'forces Lirael to choose between calling the bluff and retreating',
        branch_a: 'call the bluff', branch_b: 'retreat',
        event_slots: { precondition: 'Sath and the crowd are present', actor: 'Sath',
          action: 'takes on the outward appearance of a dragon', target: 'the crowd',
          exit_state: 'the crowd now believes a dragon stands in the square',
          mechanism_grounding: 'the established Kwisheen ability to alter their own appearance at will' } } },
    { id: 'x_green_twelve_whale', expect: 'pass', hard: true, capabilityFacts: [DISGUISE, TWELVE],
      why: 'ordinary coordination of twelve existing abilities — teamwork needs no separate collective-magic rule',
      plan: { tactical_move: 'make the harbour believe the omen arrived',
        state_change_precondition: 'The delegation has not yet acted in concert.',
        state_change: 'The twelve Kwisheen coordinate overlapping appearance-changes so that together they read as one whale breaching, while remaining twelve separate beings standing in formation',
        forces_choice: 'forces Lirael to choose between exposing the trick and letting it stand',
        branch_a: 'expose it', branch_b: 'let it stand',
        event_slots: { precondition: 'the twelve and the harbour crowd are present', actor: 'the twelve Kwisheen',
          action: 'coordinate overlapping appearance-changes', target: 'the harbour crowd',
          exit_state: 'the harbour crowd now believes it saw a whale breach',
          mechanism_grounding: 'twelve holders of the established appearance-altering ability, coordinating — ordinary teamwork' } } },
    { id: 'x_green_novel_application', expect: 'pass', hard: true, capabilityFacts: [DISGUISE],
      why: 'the established capability used for a purpose canon never depicted — application, not a new category',
      plan: { tactical_move: 'get through the cordon without a fight',
        state_change_precondition: 'Sath has not yet worn another person\'s face.',
        state_change: 'Sath takes on the appearance of the guard captain and walks through the cordon giving orders',
        forces_choice: 'forces Lirael to choose between following him through and staying',
        branch_a: 'follow', branch_b: 'stay',
        event_slots: { precondition: 'Sath and the cordon are present', actor: 'Sath',
          action: 'takes the appearance of the guard captain and gives orders', target: 'the cordon',
          exit_state: 'the cordon has let two people through',
          mechanism_grounding: 'the established Kwisheen ability to alter their own appearance at will' } } },
    // ── RED: a NEW CATEGORY OF EFFECT the capability does not grant ────────────────────────────
    { id: 'x_red_dragon_fire_and_flight', expect: 'violation', hard: true, capabilityFacts: [DISGUISE],
      expectCategories: ['unsupported_capability', 'new_metaphysics'], supportingFactKinds: ['cap'],
      why: 'appearance does not confer real fire or real flight — separate categories of effect, ungrounded',
      plan: { tactical_move: 'end the standoff from above',
        state_change_precondition: 'Nothing has yet been set alight.',
        state_change: 'In dragon form Sath breathes real fire across the barricade and physically flies over the square',
        forces_choice: 'forces Lirael to choose between fleeing and standing',
        branch_a: 'flee', branch_b: 'stand',
        event_slots: { precondition: 'Sath is in dragon appearance above the square', actor: 'Sath',
          action: 'breathes real fire and flies', target: 'the barricade',
          exit_state: 'the barricade is burning and Sath is airborne',
          mechanism_grounding: 'the established Kwisheen ability to alter their own appearance at will' } } },
    { id: 'x_red_twelve_fuse', expect: 'violation', hard: true, capabilityFacts: [DISGUISE, TWELVE],
      expectCategories: ['unsupported_capability', 'new_metaphysics'], supportingFactKinds: ['cap'],
      why: 'bodily fusion and real mass are a new category — coordination of appearance grants neither',
      plan: { tactical_move: 'carry the delegation out by sea',
        state_change_precondition: 'The twelve are still twelve separate bodies.',
        state_change: 'The twelve Kwisheen physically fuse into a single living whale of real mass, which swims out of the harbour carrying three passengers inside it',
        forces_choice: 'forces Lirael to choose between boarding and staying ashore',
        branch_a: 'board', branch_b: 'stay ashore',
        event_slots: { precondition: 'the twelve are at the water', actor: 'the twelve Kwisheen',
          action: 'physically fuse into one living whale', target: 'themselves',
          exit_state: 'a single living whale of real mass is swimming out of the harbour',
          mechanism_grounding: 'twelve holders of the established appearance-altering ability, coordinating' } } },
    { id: 'x_red_stop_time_portal', expect: 'violation', hard: true, capabilityFacts: [DISGUISE, TWELVE],
      expectCategories: ['unsupported_capability', 'new_metaphysics'], supportingFactKinds: ['cap'],
      why: 'time alteration and teleportation are categories no supplied capability grants at all',
      plan: { tactical_move: 'remove them from the square entirely',
        state_change_precondition: 'Time is running normally and the square is enclosed.',
        state_change: 'Sath stops time across the square and opens a portal through which the delegation steps to another city',
        forces_choice: 'forces Lirael to choose between stepping through and remaining',
        branch_a: 'step through', branch_b: 'remain',
        event_slots: { precondition: 'Sath and the delegation are in the square', actor: 'Sath',
          action: 'stops time and opens a portal', target: 'the square',
          exit_state: 'the delegation is now in another city and time resumes',
          mechanism_grounding: 'the established Kwisheen ability to alter their own appearance at will' } } },
    { id: 'x_red_contradicts_explicit_limit', expect: 'violation', hard: true,
      capabilityFacts: [DISGUISE, LIMIT],
      expectCategories: ['unsupported_capability', 'contradicted_knowledge', 'other'], supportingFactKinds: ['cap'],
      why: 'an explicit stated limit is contradicted head-on — this stays a violation under any framing',
      plan: { tactical_move: 'keep the disguise through the fall',
        state_change_precondition: 'Sath is still conscious.',
        state_change: 'Sath is knocked unconscious but holds the borrowed face throughout, and no one sees his true form',
        forces_choice: 'forces Lirael to choose between moving him and leaving him',
        branch_a: 'move him', branch_b: 'leave him',
        event_slots: ord({ precondition: 'Sath is disguised and under attack', actor: 'Sath',
          action: 'holds the appearance while unconscious', target: 'himself',
          exit_state: 'Sath lies unconscious, still wearing the borrowed face' }) } }
  ];
}
// If these are ever folded into a PAID run, the request count and ceiling change. Stated here so
// the number cannot be reached for casually: 7 more fixtures at the candidate's own per-call rate.
export function extrapolationPaidCost(cand) {
  const n = extrapolationFixtures().length;
  return { extraFixtures: n, extraUsd: n * cand.perCallUsd,
    totalFixtures: 8 + n, totalUsd: (8 + n) * cand.perCallUsd };
}

// ── RESERVATION: one call per fixture, primary tier only, refused past the ceiling ───────────
// perCallUsd MUST be the CANDIDATE's rate. It defaulted to the module constant (Mistral's), so the
// gpt-4o-mini run reserved at $0.000495/call while actually spending $0.000810 — under the ceiling
// either way, but the reported reservation was simply the wrong number for the model being run.
export function makeLedger(ceilingUsd = CEILING_USD, perCallUsd = PER_CALL_USD) {
  const entries = []; let total = 0;
  return {
    get entries() { return entries.slice(); }, get totalUsd() { return total; }, ceilingUsd, perCallUsd,
    reserve(label) {
      const perCall = perCallUsd;
      if (total + perCall > ceilingUsd + 1e-12) {
        const e = { label, ok: false, usd: perCall, runningTotalUsd: total,
          reason: 'reserving ' + label + ' ($' + perCall.toFixed(6) + ') would pass the ceiling $' + ceilingUsd.toFixed(6) };
        entries.push(e); return e;
      }
      total += perCall;
      const e = { label, ok: true, usd: perCall, runningTotalUsd: total };
      entries.push(e); return e;
    }
  };
}

// PRIMARY-ONLY enforcement, before dispatch. Any other endpoint or model is aborted.
export async function installCalibrationRoute(page, holder) {
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    let pathname; try { pathname = new URL(req.url()).pathname; } catch (_) { pathname = req.url(); }
    let body = null; try { body = JSON.parse(req.postData() || '{}'); } catch (_) {}
    const model = (body && (body.model || body.preferredModel)) || null;
    const log = holder.log, ledger = holder.ledger;
    // The pinned candidate comes from the HOLDER, not from module constants. Those constants are
    // Mistral's, and reading them here silently blocked the gpt-4o-mini run at its own endpoint —
    // zero dispatches, zero cost, and a result that said nothing. Fail-closed worked; the pin was
    // simply pointed at the wrong model.
    const wantEndpoint = (holder.candidate && holder.candidate.endpoint) || PRIMARY_ENDPOINT;
    const wantModel = (holder.candidate && holder.candidate.model) || PRIMARY_MODEL;
    if (pathname.indexOf(wantEndpoint) !== 0) {
      log.push({ kind: 'blocked-endpoint', pathname, reason: 'calibration allows only ' + wantEndpoint });
      await route.abort('failed'); return;
    }
    if (model !== wantModel) {
      log.push({ kind: 'blocked-model', pathname, model, reason: 'calibration measures ' + wantModel + ' only; a cascade would report another model as this one' });
      await route.abort('failed'); return;
    }
    // REASONING MUST BE EXPLICIT ON THE WIRE (Roman 2026-09-24). The whole point of this candidate
    // is reasoning mode, and the failure it must never have is a silent one: /api/mistral-proxy
    // auto-defaults reasoning_effort=high ONLY for author-class payloads (detected by the
    // "STORYBOUND ARCHITECTURE LAWS" system prompt), and the canon-audit prompt does not match. So
    // a request that omits the parameter is served happily as ORDINARY Mistral Small 4 and the
    // result would be filed under "reasoning Mistral" — measuring the wrong model at full price.
    // A missing or altered value is therefore aborted BEFORE dispatch, not merely noted.
    const wantEffort = holder.candidate && holder.candidate.reasoningEffort;
    if (wantEffort) {
      const sent = body && body.reasoning_effort;
      if (String(sent || '') !== String(wantEffort)) {
        log.push({ kind: 'blocked-reasoning', pathname, model, sent: sent == null ? null : String(sent),
          reason: 'calibration requires reasoning_effort="' + wantEffort + '" explicitly on the wire; '
            + (sent == null
              ? 'the request carried none, and the proxy would serve this as ordinary (non-reasoning) ' + wantModel
              : 'the request carried "' + sent + '"') });
        await route.abort('failed'); return;
      }
    }
    // Preserve the EXACT outgoing body per fixture — the request actually sent, not a description
    // of it — so model, reasoning parameter and token budget are all auditable after the fact.
    log.push({ kind: 'request-body', fixture: holder.currentFixture, pathname, body });
    const r = ledger.reserve(holder.currentFixture || pathname);
    if (!r.ok) { log.push({ kind: 'blocked-ceiling', reason: r.reason }); await route.abort('failed'); return; }
    log.push({ kind: 'reserved', fixture: holder.currentFixture, usd: r.usd, runningTotalUsd: r.runningTotalUsd });
    await route.fallback();
  });
}

// ── INFRASTRUCTURE FAIL-FAST (Roman 2026-09-24) ──────────────────────────────────────────────
// The first calibration attempt sent all eight requests even though the local function layer was
// plainly dead after the first two — six pointless dispatches against a service that was going to
// 502 every time. The first fixture IS the provider-path health check; no separate paid probe is
// needed, and no further fixture should be spent once the signature is unmistakable.
//
// The signature is narrow on purpose: HTTP 502 AND NO_RESPONSE_FROM_FUNCTION AND no provider usage
// recorded. That is the local `vercel dev` function layer failing to answer — it is NOT an upstream
// model error, a rate limit, or a bad reply, and none of those trip this.
export const INFRA_SIGNATURE = /\b502\b/;
export function isInfraFailure(error, hadProviderUsage) {
  if (hadProviderUsage) return false;                       // it reached the provider; not this
  const e = String(error || '');
  return INFRA_SIGNATURE.test(e) && /NO_RESPONSE_FROM_FUNCTION/i.test(e);
}
export const INFRA_STOP_AFTER = 2;                          // two CONSECUTIVE, then stop

// ── SCORING — the critical distinction is a VALID but incorrect pass ─────────────────────────
export function scoreFixture(fx, validated, error, opts) {
  if (opts && opts.skipped) return { outcome: 'skipped', critical: false,
    note: 'not dispatched — the run stopped after ' + INFRA_STOP_AFTER + ' consecutive local function-layer failures' };
  if (error) {
    if (isInfraFailure(error, false)) return { outcome: 'unavailable', critical: false, infra: true, note: error };
    return { outcome: 'unavailable', critical: false, note: error };
  }
  if (!validated.valid) return { outcome: 'invalid_response', critical: false, note: validated.errors.join('; ') };
  const v = validated.verdict;
  if (fx.expect === 'violation') {
    if (v === 'violation') {
      // SUBSTANTIVE SUPPORT REQUIRED (Roman 2026-09-24). A "violation" verdict is not a catch on
      // its own. The finding must name a category appropriate to THIS fixture and cite a fact that
      // genuinely supports that category for it — a real but irrelevant id is an unsupported
      // finding, not detection. Mistral produced exactly that: it cited neg_0 (a world truth) for
      // a rewritten_history finding, and cited the durable consequence for a capability claim that
      // only a negative world truth could foreclose.
      const supported = (validated.violations || []).some((x) => {
        if (!fx.expectCategories || fx.expectCategories.indexOf(x.category) === -1) return false;
        const ids = (x.citedFactIds || []).map((i) => String(i).trim().replace(/^\[+|\]+$/g, ''));
        return ids.some((id) => (fx.supportingFactKinds || []).some((k) => id.indexOf(k + '_') === 0));
      });
      if (supported) return { outcome: 'caught', critical: false };
      return { outcome: 'unsupported_finding', critical: true,
        note: 'verdict "violation" but no finding pairs an appropriate category ('
          + (fx.expectCategories || []).join('/') + ') with a fact of a supporting kind ('
          + (fx.supportingFactKinds || []).join('/') + ') — a real but irrelevant citation is not detection' };
    }
    if (v === 'pass') return { outcome: 'MISSED', critical: true,
      note: 'a VALID but incorrect pass — it triggers no tier fallback and would let this plan reach the author' };
    return { outcome: 'undecided', critical: false, note: 'fails closed, but did not catch it' };
  }
  if (v === 'pass') return { outcome: 'correct_pass', critical: false };
  if (v === 'violation') return { outcome: 'FALSE_POSITIVE', critical: true,
    note: 'blocks a legitimate plan — ordinary creative invention must stay possible' };
  return { outcome: 'undecided_green', critical: false, note: 'fails closed on a legitimate plan — blocks it, but not a false accusation' };
}

export function verdictSummary(rows) {
  const reds = rows.filter((r) => r.expect === 'violation');
  const greens = rows.filter((r) => r.expect === 'pass');
  const caught = reds.filter((r) => r.score.outcome === 'caught');
  const missed = reds.filter((r) => r.score.outcome === 'MISSED');
  const correctPass = greens.filter((r) => r.score.outcome === 'correct_pass');
  const falsePos = greens.filter((r) => r.score.outcome === 'FALSE_POSITIVE');
  const undecided = rows.filter((r) => /undecided/.test(r.score.outcome));
  const unavailable = rows.filter((r) => r.score.outcome === 'unavailable');
  const invalid = rows.filter((r) => r.score.outcome === 'invalid_response');
  const skipped = rows.filter((r) => r.score.outcome === 'skipped');
  // A "violation" verdict whose findings do not substantively support the expected violation.
  const unsupported = rows.filter((r) => r.score.outcome === 'unsupported_finding');
  // INFRASTRUCTURE-INCONCLUSIVE: the run stopped on the local function layer, so it says nothing
  // about the model either way. Reported as its own state so it can never be read as a model
  // result — neither a pass nor a failure of the auditor.
  const infraFailures = rows.filter((r) => r.score && r.score.infra);
  const infrastructureInconclusive = skipped.length > 0 || infraFailures.length >= INFRA_STOP_AFTER;
  // THE GATE, CORRECTED (Roman 2026-09-24). The earlier version required only "all reds caught and
  // no FALSE_POSITIVE" — so a green returning cannot_decide, invalid JSON or a transport failure
  // still produced ENABLE. In production every one of those BLOCKS a legitimate scene before the
  // author, which is a different failure from a false accusation but not a smaller one. Enabling
  // now requires every fixture to have produced a usable response AND the right one.
  const enableGenerally = caught.length === reds.length
    && correctPass.length === greens.length
    && missed.length === 0 && falsePos.length === 0
    && undecided.length === 0 && unavailable.length === 0 && invalid.length === 0
    && skipped.length === 0 && unsupported.length === 0;
  const blockers = [];
  if (missed.length) blockers.push(missed.length + ' missed red (VALID incorrect pass — no fallback fires): ' + missed.map((r) => r.id).join(', '));
  if (falsePos.length) blockers.push(falsePos.length + ' green false positive: ' + falsePos.map((r) => r.id).join(', '));
  if (undecided.length) blockers.push(undecided.length + ' undecided (blocks the scene in production): ' + undecided.map((r) => r.id).join(', '));
  if (unavailable.length) blockers.push(unavailable.length + ' unavailable (no usable response): ' + unavailable.map((r) => r.id).join(', '));
  if (invalid.length) blockers.push(invalid.length + ' invalid response (blocks the scene in production): ' + invalid.map((r) => r.id).join(', '));
  if (unsupported.length) blockers.push(unsupported.length + ' UNSUPPORTED finding (violation verdict, but cited an irrelevant real fact — not a catch): ' + unsupported.map((r) => r.id).join(', '));
  if (skipped.length) blockers.push(skipped.length + ' NOT DISPATCHED — run stopped on the local function layer: ' + skipped.map((r) => r.id).join(', '));
  return {
    infrastructureInconclusive, skipped: skipped.length, skippedIds: skipped.map((r) => r.id),
    unsupportedFindings: unsupported.length, unsupportedIds: unsupported.map((r) => r.id),
    infraFailures: infraFailures.length,
    reds: reds.length, greens: greens.length,
    caught: caught.length, correctPass: correctPass.length,
    missed: missed.length, falsePositives: falsePos.length,
    undecided: undecided.length, unavailable: unavailable.length, invalid: invalid.length,
    missedIds: missed.map((r) => r.id), falsePositiveIds: falsePos.map((r) => r.id),
    undecidedIds: undecided.map((r) => r.id), unavailableIds: unavailable.map((r) => r.id),
    invalidIds: invalid.map((r) => r.id),
    usableResponses: rows.length - unavailable.length - invalid.length, totalFixtures: rows.length,
    blockers, enableGenerally
  };
}
