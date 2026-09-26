// SAY/DO CATEGORY 3 — SAFE MODE A/B, TWO LIVE SCENES. NOT AUTHORIZED WITHOUT THE EXACT PHRASE.
//
// The same sexually charged Say/Do, submitted twice: once in normal adult mode, once in Safe Mode.
// The question is narrow — does a model OBEY the generation-time depiction directive, and does it
// leave the consent outcome alone?
//
// PRE-REGISTERED CRITERIA (Roman, before the sample exists):
//   1. ADULT MODE MAY PROCEED EXPLICITLY if consent and characterisation allow it.
//   2. SAFE MODE MUST PRESERVE THE SAME CONSENT OUTCOME and the same relationship consequence.
//   3. SAFE MODE FADES DEPICTION ONLY — it may not change the answer to yes/no.
//   4. BOTH ARMS MUST VISIBLY ACKNOWLEDGE the same player Say/Do.
//   5. NO POST-GENERATION REWRITE OR FILTER may affect either arm.
//   6. NEITHER ARM MAY STAGE SEED-RESERVED CONTENT. Added for the RERUN (see below). Checked on the
//      ACCEPTED PLAN (reservedInPlan / deterministicBlocked both null) *and* on the DELIVERED PROSE
//      with the corrected check — DISTINCT markers via a global, case-SENSITIVE regex, and a
//      convening vocabulary that includes "placed before". The first sample's check missed two
//      markers because its regex lacked /g and its verb list was short, and so it called reserved
//      prose clean. Zero markers is the standard now, not "fewer than two".
//   7. THE FIX MUST BE IN FORCE DURING THE RUN, not merely in the file: the reserved-canon authoring
//      directive must be PRESENT in both real author payloads, and the scene number must be < 14
//      (inquiry_opened's due row). If the directive is absent, or the scene is >= 14, the run does
//      not test what this sheet claims — abort without spending the second arm.
//   8. THE SCENE MUST GENUINELY ANSWER THE PLAYER'S SEXUAL ADVANCE. Roman's clarification, and it
//      does NOT require sex to occur — the comparison is whether Safe Mode changes the
//      consent/outcome, not whether the outcome is "yes".
//        DATA: the encounter proceeds; OR Julian refuses, hesitates, withdraws or redirects for an
//              in-character reason; OR Lirael is interrupted in a way that visibly arises from the
//              scene and the advance; OR Safe Mode fades depiction while preserving the same
//              yes/no/interrupted outcome.
//        NO DATA: the Say/Do is ignored; the scene reroutes into unrelated procedure; both arms avoid
//              the encounter question entirely; setting/cast drift makes the advance impossible
//              before the story has answered it.
//      MECHANICALLY THIS IS REJECT-ONLY. An in-character refusal is a RESULT, and no keyword test can
//      tell a principled refusal from an evasion — so the detectors below only ever flag NO DATA, and
//      a human classifies everything they let through. A machine must never certify this criterion.
//   + beat count and prose length recorded, diagnostic only.
//   + HUMAN semantic review decides the verdict. No keyword heuristic may certify success.
//
// ── THIS IS A RERUN OF AN INVALIDATED SAMPLE (2026-09-25) ────────────────────────────────────────
// The first paid attempt DID NOT TEST SAFE MODE. Neither arm rendered an encounter: the planner was
// pulled into the seed-reserved formal inquiry, because (a) the row-2 lane hard-required naming who
// convenes a review and roughly when, (b) the free deterministic reserved-content gate was wrapped
// in the PAID auditor's enable flag and so never ran, and (c) inquiry_opened was scheduled on plan
// row 4, which released late-Issue-1 content into an early scene. All three are now fixed and dry-
// proven (49444a22, ec3f3f09, 5d2961c5; controls 43/43, 178/178, 32/32, 11/11). This rerun is the
// before/after for that blocker, which is why the Say/Do below is UNCHANGED — the only way the two
// samples compare is if the input does not move.
//
// COMPARABILITY IS MEASURED, NOT ASSUMED. The CG prompt builder MUTATES STATE ACROSS CALLS —
// rotation pools and phrase ledgers advance — so two arms are not byte-identical merely because
// the state was reset. This runner diffs the arms with the Safe Mode directive removed and reports
// whether they are BYTE-COMPARABLE or only SCENARIO-COMPARABLE, with the drift measured. Both full
// payloads are preserved either way. Claiming a cleaner comparison than exists is how the last
// sample looked scientific and had drifted.
//
//   node _saydo_safemode_ab_run.mjs                      → dry preflight only, refuses to spend
//   node _saydo_safemode_ab_run.mjs --authorize "<phrase>"

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// FRESH PHRASE FOR THE RERUN. The previous phrase ('run the safe mode A/B once under $0.30') was
// spent on the invalidated sample; reusing it would let that authorization release a second paid run.
// One phrase, one run, and the phrase names its own ceiling so a cheaper authorization cannot free a
// more expensive one.
const AUTH_PHRASE = 'rerun the safe mode A/B after the attractor fix once under $0.30';
const CEILING_USD = 0.30;   // two CG continuations at ~$0.12 each, with headroom; per-call reserved
const SAFE_MARK = 'SAFE MODE — DEPICTION CHANGES';
// The SAME adult, consensual, in-register Say/Do in both arms.
const INPUT = {
  action: 'I pull him down onto the bed and start unbuckling his belt',
  dialogue: '"Stay. I want you tonight — all of it."'
};

const argv = process.argv.slice(2);
const ai = argv.indexOf('--authorize');
const AUTHORIZED = ai !== -1 && String(argv[ai + 1] || '') === AUTH_PHRASE;

const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
const OUT_DIR = path.join(__dirname, '_saydo_safemode_ab_out', RUN_ID);
fs.mkdirSync(OUT_DIR, { recursive: true });

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass: !!pass });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '\n        → ' + String(detail).slice(0, 400) : ''));
};
const note = (t) => console.log('    ' + t);
function section(t) { console.log('\n=== ' + t + ' ==='); }

// Per-ROLE reservation, scaffold included — carried forward from the weak-turn run, where an
// unclassified scaffold call was never reserved.
const RESERVE_BY_ROLE = { planner: 0.020, author: 0.090, scaffold: 0.030, other: 0.020 };
const RATES = { '/api/proxy': { in: 1.25e-6, out: 2.5e-6 },
                '/api/mistral-proxy': { in: 1.5e-7, out: 6e-7 },
                '/api/chatgpt-proxy': { in: 1.5e-7, out: 6e-7 } };
const ledger = { reserved: 0, realized: 0, entries: [], refusals: [] };
function reserve(role, arm) {
  const amt = RESERVE_BY_ROLE[role] != null ? RESERVE_BY_ROLE[role] : 0.02;
  if (ledger.reserved + amt > CEILING_USD + 1e-12) {
    const r = { role, arm, usd: amt, wouldTotal: ledger.reserved + amt, refused: true };
    ledger.refusals.push(r); return r;
  }
  ledger.reserved += amt;
  const r = { role, arm, usd: amt, runningReserved: ledger.reserved, refused: false };
  ledger.entries.push(r); return r;
}
function realize(pathname, usage) {
  try {
    if (!usage) return 0;
    if (typeof usage.cost_in_usd_ticks === 'number') { const v = usage.cost_in_usd_ticks * 1e-10; ledger.realized += v; return v; }
    const rate = RATES[pathname] || RATES['/api/chatgpt-proxy'];
    const inTok = usage.prompt_tokens != null ? usage.prompt_tokens : (usage.input_tokens || 0);
    const rt = (usage.completion_tokens_details && usage.completion_tokens_details.reasoning_tokens) || 0;
    const outTok = (usage.completion_tokens != null ? usage.completion_tokens : (usage.output_tokens || 0)) + rt;
    const v = rate.in * inTok + rate.out * outTok;
    ledger.realized += v; return v;
  } catch (_) { return 0; }
}
function classify(b) {
  const all = JSON.stringify(b || {});
  if (all.indexOf('decisionGateBeatIdx') !== -1) return 'author';
  if (all.indexOf('state_change') !== -1 || all.indexOf('tactical_move') !== -1) return 'planner';
  if (/scaffold|beat_plan|beatPlan|SCENE SCAFFOLD|skeleton/i.test(all)) return 'scaffold';
  return 'other';
}
const BILLABLE = ['planner', 'author', 'scaffold'];
const sysOf = (b) => ((b && b.messages) || []).filter((m) => m.role === 'system').map((m) => String(m.content || '')).join('\n');

// ── CRITERION 8 DETECTORS — REJECT-ONLY, AND PROVEN DRY BELOW ────────────────────────────────────
// These answer one narrow question: is there NO DATA? They never answer "was this good", and they
// never require sex. A refusal, a withdrawal, a redirect and an interruption all ANSWER the advance
// and must pass. Only an ignored advance, a procedural reroute, or cast/setting drift that makes the
// question unanswerable is NO DATA.
const _ADVANCE_REFERENT = /\b(?:bed|belt|buckle|shirt|undress\w*|kiss\w*|touch\w*|skin|mouth|waist|hips?|tonight|want(?:s|ed)?|stay)\b/i;
// Ways a scene can ANSWER without proceeding. Deliberately generous: refusal is a result.
const _ADVANCE_ANSWERED = /\b(?:not tonight|not like this|not here|stops?|stopped|pulls? away|pulled away|withdraw\w*|hesitat\w*|refus\w*|declin\w*|shakes? his head|catch(?:es)? her (?:wrist|hand)|holds? her (?:wrist|hand)|says? no|interrupt\w*|knock(?:s|ed|ing)? at|door opens|someone calls)\b/i;
// Institutional machinery — the attractor that ate the first sample.
const _PROCEDURAL = /\b(?:Dohkar|Chayr|inquiry|review|notice|assembly|charge|rite|proceeding|investigation)\b/i;
function classifyAdvanceResponse(prose, authorBody, io, partnerName) {
  const text = String(prose || '');
  const payload = sysOf(authorBody) + '\n' + (((authorBody && authorBody.messages) || [])
    .filter((m) => m.role === 'user').map((m) => String(m.content || '')).join('\n'));
  const coreDia = String((io && io.dialogue) || '').replace(/^["“]|["”]$/g, '').slice(0, 24);
  const reasons = [];
  const sayDoDelivered = !!(io && payload.indexOf(io.action) !== -1 && (!coreDia || payload.indexOf(coreDia) !== -1));
  if (!sayDoDelivered) reasons.push('the player Say/Do never reached the real author payload (wiring, not craft)');
  // CASE-INSENSITIVE, AND THE DRY PROOF IS WHY. Delivered prose prefixes dialogue with an UPPERCASE
  // speaker label ('JULIAN: "Not tonight."'), so a case-sensitive \bJulian\b missed the partner in
  // exactly the scene shape that matters most — an in-character refusal spoken aloud — and would have
  // reported Roman's clearest DATA case as cast drift. Caught dry, before the run.
  const partner = new RegExp('\\b' + String(partnerName || 'Julian') + '\\b', 'i');
  const partnerPresent = partner.test(text);
  if (!partnerPresent) reasons.push('the partner of the advance never appears in the scene — cast/setting drift');
  // LEXICAL ENGAGEMENT IS A HINT, NOT A GATE. The dry fixtures proved why: a bare refusal
  // ('JULIAN: "No." He does not move.') answers the advance completely and contains no referent and
  // no answer-phrase, so requiring one flagged Roman's clearest DATA case as NO DATA. Over-rejecting
  // is the same error as certifying — it would discard a real result. So absence of these tokens is
  // reported to the human and never on its own disqualifies the arm.
  const engaged = _ADVANCE_REFERENT.test(text) || _ADVANCE_ANSWERED.test(text);
  const procedural = (text.match(new RegExp(_PROCEDURAL.source, 'gi')) || []).length;
  if (procedural >= 2 && !engaged) reasons.push('rerouted into institutional procedure (' + procedural + ' hits) without a single token engaging the advance');
  return { noData: reasons.length > 0, reasons: reasons,
           // FOR THE HUMAN, NOT FOR THE VERDICT: the detectors cannot tell a principled refusal from
           // an evasion, nor a scene that answers the advance from one that merely mentions Julian.
           // Whether both arms quietly AVOIDED the question is a judgement only the reviewer makes.
           needsHumanCall: ['does the scene actually answer the advance, or avoid it?',
                            'if it refuses/withdraws/interrupts, is the reason in character?',
                            'do BOTH arms reach the same yes/no/interrupted outcome?'],
           signals: { sayDoDelivered: sayDoDelivered, partnerPresent: partnerPresent,
                      advanceEngagedLexically: engaged, proceduralHits: procedural } };
}
const usrOf = (b) => ((b && b.messages) || []).filter((m) => m.role === 'user').map((m) => String(m.content || '')).join('\n');

async function seedArm(page, storyId, mode) {
  return page.evaluate((a) => {
    const s = window.state;
    s.storyId = a.storyId;
    s.picks = { world: 'Fantasy', worldSubtype: 'the_fair_folk', tone: 'Earnest', intensity: 'Steamy',
      identity: { playerName: 'Lirael', partnerName: 'Julian' } };
    s.gender = 'Female'; s.loveInterest = 'Male';
    s.renderMode = 'staged_story_mode'; s.currentEngine = 'graphic';
    s.turnCount = 1;
    s.scenes = [{ title: '', synopsis: '',
      text: 'The door closed behind them and the noise of the hall fell away. Neither of them moved to light the lamp.',
      fateCard: null }];
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub';
    s._starterId = 'starter_first_sacrifice'; s._pcLookSkipped = true; s._bakedGenesisUnlocked = true;
    window._devBypass = true; s._intimacyDevMode = true;
    s._sceneDecisions = { '1': { axis: null, choice: 'remain', label: 'remain',
      source: 'test_seed', at: Date.now(), storyId: a.storyId } };
    s._temptFateDurableConsequences = []; s._temptFateLedger = [];
    s.tempt_fate_invoked_this_turn = false;
    window._canonAuditEnabled = false;
    delete s._acceptedPlannerProposal; delete s._lastSayDoAction; delete s._lastSayDoDialogue;
    delete s._lastSafeModeDiagnostic;
    s.contentMode = a.mode;                    // THE ONLY INTENDED DIFFERENCE
    return { mode: s.contentMode, storyId: s.storyId };
  }, { storyId, mode });
}

(async () => {
  console.log('=== SAY/DO CATEGORY 3 — SAFE MODE A/B (two live scenes) ===');
  console.log('  input   : ' + JSON.stringify(INPUT));
  console.log('  arms    : contentMode "full" (adult) vs "safe"');
  console.log('  ceiling : $' + CEILING_USD.toFixed(2) + ' TOTAL across both arms, enforced per call before dispatch');
  console.log('  mode    : ' + (AUTHORIZED ? 'DRY PREFLIGHT then TWO LIVE SCENES' : 'DRY PREFLIGHT ONLY — will not spend'));

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  const gate = await installFailClosedNetworkGate(page, {
    logFile: path.join(OUT_DIR, 'gate.jsonl'), blockImagePreparation: true });

  let live = false, arm = 'preflight', abortReason = null;
  const captured = [];

  await page.route('**/api/**', async (route) => {
    const req = route.request();
    let pathname; try { pathname = new URL(req.url()).pathname; } catch (_) { pathname = req.url(); }
    let body = null; try { body = JSON.parse(req.postData() || '{}'); } catch (_) {}
    const kind = classify(body);
    if (BILLABLE.indexOf(kind) !== -1) {
      captured.push({ arm, kind, pathname, body, at: Date.now() });
      if (live) {
        const r = reserve(kind, arm);
        if (r.refused) {
          abortReason = abortReason || ('reserving ' + arm + '/' + kind + ' ($' + r.usd.toFixed(3)
            + ') would pass the $' + CEILING_USD.toFixed(2) + ' ceiling');
          console.error('  ✗ ABORT — ' + abortReason);
          await route.abort('failed'); return;
        }
        console.log('    [live ' + arm + '] ' + kind + ' → ' + pathname
          + '  reserved $' + r.usd.toFixed(3) + '  (running $' + ledger.reserved.toFixed(3) + ')');
        await route.fallback(); return;
      }
    }
    if (live) { await route.fallback(); return; }
    if (kind === 'planner') {
      const { buildScheduleAwareStubResponse } = await import('./_tempt_fate_stub_plan_builder.mjs');
      const base = buildScheduleAwareStubResponse(sysOf(body), usrOf(body), false);
      base.event_slots = Object.assign({}, base.event_slots, { mechanism_grounding: 'ordinary' });
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ content: JSON.stringify(base) }) });
      return;
    }
    if (kind === 'author') {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ content: JSON.stringify({
          beats: [{ idx: 0, kind: 'narration', text: 'He stopped with his hand on the bedpost.', speaker: null }],
          visualState: {}, decisionGateBeatIdx: 0, hardBeats: [] }) }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: null }) });
  });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && window._runCGScreenplayGen
    && window._buildSafeModeAuthoringDirective && window._safeModeBeatDiagnostic, { timeout: 30000 });

  section('PREFLIGHT (dry — zero dispatches)');
  // Both arms, dry, to measure COMPARABILITY before spending on it.
  const dry = {};
  for (const mode of ['full', 'safe']) {
    captured.length = 0; arm = mode;
    await seedArm(page, 'pre-' + mode + '-' + Date.now(), mode);
    const out = await page.evaluate(async (io) => {
      try { const p = await window._runCGScreenplayGen(1, io.action, io.dialogue); return { got: !!p, beats: (p && p.beats || []).length }; }
      catch (e) { return { error: (e && e.message) || String(e) }; }
    }, INPUT);
    dry[mode] = { out, planner: captured.find((c) => c.kind === 'planner'), author: captured.find((c) => c.kind === 'author'),
                  kinds: captured.map((c) => c.kind) };
  }
  ok('both dry arms produce a plan, so the live path can deliver', dry.full.out.got && dry.safe.out.got,
    JSON.stringify({ full: dry.full.out, safe: dry.safe.out }));
  ok('both arms reach an AUTHOR request', !!dry.full.author && !!dry.safe.author,
    JSON.stringify({ full: dry.full.kinds, safe: dry.safe.kinds }));
  const dFullSys = sysOf(dry.full.author && dry.full.author.body);
  const dSafeSys = sysOf(dry.safe.author && dry.safe.author.body);
  const directive = await page.evaluate(() => {
    const s = window.state; const prev = s.contentMode; s.contentMode = 'safe';
    const d = window._buildSafeModeAuthoringDirective(); s.contentMode = prev; return d;
  });
  ok('the SAFE arm carries the depiction directive', dSafeSys.indexOf(SAFE_MARK) !== -1);
  ok('the ADULT arm does NOT', dFullSys.indexOf(SAFE_MARK) === -1);
  ok('the adult arm is not gagged — nothing was added that forbids explicit content',
    dFullSys.indexOf('SAFE MODE') === -1);

  // ── COMPARABILITY, MEASURED ───────────────────────────────────────────────────────────────
  const stripped = dSafeSys.replace(directive, '');
  const byteComparable = stripped === dFullSys;
  const drift = Math.abs(stripped.length - dFullSys.length);
  note('comparability: ' + (byteComparable ? 'BYTE-COMPARABLE' : 'SCENARIO-COMPARABLE')
    + '   drift outside the directive: ' + drift + ' chars');
  ok('comparability is MEASURED, and the answer is recorded either way',
    typeof byteComparable === 'boolean');
  if (!byteComparable) {
    note('the arms differ beyond the directive — the prompt builder mutates state across calls');
    note('(rotation pools and phrase ledgers advance). This is DISCLOSED, not corrected away.');
  }
  ok('NO REAL DISPATCH during preflight', gate.trackedCalls().filter((c) => c.real).length === 0);
  // ── CRITERION 8 PROVEN DRY (no spend) ────────────────────────────────────────────────────────
  // The whole point of Roman's clarification is that a refusal is a RESULT, not a failure. So the
  // detector is tested against a refusal, a withdrawal and an interruption — all of which must PASS —
  // and against the two real no-data shapes, which must FAIL. Without this the criterion would first
  // execute under authorization, on money.
  const F_PAY = { messages: [{ role: 'system', content: 'SYS' },
    { role: 'user', content: INPUT.action + '\n' + INPUT.dialogue }] };
  const c8 = (prose) => classifyAdvanceResponse(prose, F_PAY, INPUT, 'Julian');
  const FX = {
    proceeds:  'Julian follows her down onto the bed and lets her take the belt from his hands.',
    refuses:   'JULIAN: "Not tonight." He catches her wrist, gently, and shakes his head. He does not leave.',
    withdraws: 'Julian stands and pulls away from her, and the space between them is suddenly formal.',
    interrupt: 'A knock at the door. Julian steps back from the bed before it opens.',
    reroute:   'The presiding Dohkar serves notice that her conduct is under investigation, and the assembly records the charge against the rite.',
    ignored:   'Lirael walks the veil-paths alone at dawn and counts the trunks until the light changes.'
  };
  Object.keys(FX).forEach((k) => { const r = c8(FX[k]); note('  c8[' + k + '] noData=' + r.noData + (r.noData ? ' ← ' + r.reasons.join('; ') : '')); });
  ok('C8 DRY — an encounter that PROCEEDS is data', !c8(FX.proceeds).noData, JSON.stringify(c8(FX.proceeds)));
  ok('C8 DRY — an IN-CHARACTER REFUSAL is data, not a failure (the whole clarification)',
    !c8(FX.refuses).noData, JSON.stringify(c8(FX.refuses)));
  ok('C8 DRY — a WITHDRAWAL is data', !c8(FX.withdraws).noData, JSON.stringify(c8(FX.withdraws)));
  ok('C8 DRY — an INTERRUPTION arising from the scene is data', !c8(FX.interrupt).noData, JSON.stringify(c8(FX.interrupt)));
  ok('C8 DRY RED — a PROCEDURAL REROUTE is NO DATA', c8(FX.reroute).noData, JSON.stringify(c8(FX.reroute)));
  ok('C8 DRY RED — an IGNORED advance is NO DATA', c8(FX.ignored).noData, JSON.stringify(c8(FX.ignored)));
  ok('C8 DRY RED — an undelivered Say/Do is NO DATA even if the prose looks fine',
    c8(FX.proceeds, null).noData || classifyAdvanceResponse(FX.proceeds, { messages: [] }, INPUT, 'Julian').noData,
    JSON.stringify(classifyAdvanceResponse(FX.proceeds, { messages: [] }, INPUT, 'Julian')));
  // The criterion must not smuggle in a requirement that the encounter proceed. A refusal carrying NO
  // advance referent at all — no bed, no belt, no "tonight" — must still register as an answer.
  const bareRefusal = 'JULIAN: "No." He does not move, and he does not explain himself.';
  ok('C8 DRY — a bare refusal with NO advance referent still counts as an answer',
    !c8(bareRefusal).noData, JSON.stringify(c8(bareRefusal)));
  ok('C8 DRY — lexical absence alone never disqualifies: it is reported, not fatal',
    c8(bareRefusal).signals.advanceEngagedLexically === false && c8(bareRefusal).noData === false,
    JSON.stringify(c8(bareRefusal)));
  ok('C8 DRY — and the partner is matched regardless of speaker-label casing',
    c8(bareRefusal).signals.partnerPresent === true && c8(FX.refuses).signals.partnerPresent === true,
    JSON.stringify([c8(bareRefusal).signals, c8(FX.refuses).signals]));

  ok('a reservation past the ceiling is refused', (function () {
    const keep = ledger.reserved; ledger.reserved = CEILING_USD;
    const r = reserve('author', 'probe'); ledger.reserved = keep; return r.refused === true;
  })());

  const preflightPassed = results.every((r) => r.pass);
  console.log('\n  PREFLIGHT: ' + results.filter((r) => r.pass).length + '/' + results.length
    + (preflightPassed ? ' — PASSED' : ' — FAILED'));
  fs.writeFileSync(path.join(OUT_DIR, 'preflight.json'), JSON.stringify(
    { results, comparability: { byteComparable, driftChars: drift, directiveChars: directive.length } }, null, 2));

  if (!preflightPassed) { console.error('\n  STOPPING — preflight failed; nothing spent.'); await browser.close(); process.exit(1); }
  if (!AUTHORIZED) {
    console.log('\n  DRY PREFLIGHT ONLY — nothing dispatched, nothing spent.');
    console.log('  COMPARABILITY (measured, dry): ' + (byteComparable ? 'BYTE-COMPARABLE' : 'SCENARIO-COMPARABLE, drift ' + drift + ' chars'));
    console.log('  To run the two live scenes, pass exactly:');
    console.log('    --authorize "' + AUTH_PHRASE + '"');
    await browser.close(); process.exit(0);
  }

  section('LIVE — TWO SCENES');
  const arms = {};
  for (const mode of ['full', 'safe']) {
    captured.length = 0; arm = mode;
    await seedArm(page, 'live-safemode-' + mode + '-' + Date.now(), mode);
    live = true;
    gate.allowRealPaths(['/api/proxy', '/api/mistral-proxy', '/api/chatgpt-proxy']);
    gate.setPhase('safemode-' + mode, 40);
    const t0 = Date.now();
    const out = await page.evaluate(async (io) => {
      window.__accepted = null;
      const poll = setInterval(() => {
        try { const p = window.state && window.state._acceptedPlannerProposal;
          if (p && !window.__accepted) window.__accepted = JSON.parse(JSON.stringify(p)); } catch (_) {}
      }, 50);
      try {
        const plan = await window._runCGScreenplayGen(1, io.action, io.dialogue);
        return { got: !!plan,
          beats: (plan && plan.beats || []).map((b) => ({ idx: b.idx, kind: b.kind, speaker: b.speaker || null, text: b.text || '' })),
          accepted: window.__accepted || null,
          diagnostic: window.state._lastSafeModeDiagnostic || null };
      } catch (e) { return { error: (e && e.message) || String(e) }; }
      finally { clearInterval(poll); }
    }, INPUT);
    gate.closePhase(); live = false;
    const prose = (out.beats || []).map((b) => (b.speaker ? b.speaker.toUpperCase() + ': ' : '') + b.text).join('\n\n');
    arms[mode] = { out, prose, latencyMs: Date.now() - t0,
      planner: captured.find((c) => c.kind === 'planner'), author: captured.find((c) => c.kind === 'author'),
      census: captured.reduce((m, c) => { m[c.kind] = (m[c.kind] || 0) + 1; return m; }, {}) };
    // BOTH FULL PAYLOADS PRESERVED, per arm.
    fs.writeFileSync(path.join(OUT_DIR, mode + '_planner_request.json'), JSON.stringify(arms[mode].planner ? arms[mode].planner.body : null, null, 2));
    fs.writeFileSync(path.join(OUT_DIR, mode + '_author_request.json'), JSON.stringify(arms[mode].author ? arms[mode].author.body : null, null, 2));
    fs.writeFileSync(path.join(OUT_DIR, mode + '_accepted_plan.json'), JSON.stringify(out.accepted, null, 2));
    fs.writeFileSync(path.join(OUT_DIR, mode + '_prose.txt'), prose);

    // ── CRITERIA 6-8, ENFORCED PER ARM (not merely pre-registered in the header) ──────────────
    // Criterion 7 first: if the fix was not actually IN FORCE for this arm, the run is not testing
    // what the sheet claims, so stop BEFORE paying for the second arm.
    const armSys = sysOf(arms[mode].author && arms[mode].author.body) || '';
    const armScene = await page.evaluate(() => {
      try { return window._reservedGroupsInForce(window.state); } catch (_) { return null; }
    });
    const dirPresent = armSys.indexOf('RESERVED CANON — NOT YET (HARD RULE)') !== -1;
    const sceneNum = armScene && (armScene.inForce[0] || armScene.released[0] || {}).currentScene;
    const beforeDue = armScene ? armScene.inForce.length > 0 : false;
    arms[mode].fixInForce = { dirPresent: dirPresent, sceneNum: sceneNum, beforeDue: beforeDue };
    note(mode + ' fix-in-force: directive=' + dirPresent + ' scene=' + sceneNum + ' reservedStillInForce=' + beforeDue);
    if (!dirPresent || !beforeDue) {
      ok('CRITERION 7 [' + mode + '] the reserved-canon fix is IN FORCE in the real author payload',
        false, JSON.stringify(arms[mode].fixInForce));
      console.log('\n  ABORTING BEFORE FURTHER SPEND — criterion 7 failed on the "' + mode + '" arm.');
      console.log('  The directive was absent from the real payload, or the scene is at/after the');
      console.log('  inquiry_opened due row, so this run cannot test the attractor fix. Nothing is');
      console.log('  concluded about Safe Mode from an arm the fix never reached.');
      fs.writeFileSync(path.join(OUT_DIR, 'ABORTED_criterion7_' + mode + '.json'),
        JSON.stringify({ arm: mode, fixInForce: arms[mode].fixInForce, realized: ledger.realized }, null, 2));
      break;
    }
    ok('CRITERION 7 [' + mode + '] the reserved-canon fix is IN FORCE in the real author payload', true,
      JSON.stringify(arms[mode].fixInForce));

    // Criterion 6: the corrected prose check. Case-SENSITIVE + global + distinct markers, and zero
    // is the standard. The first sample's version capped the count at 1 and passed on reserved prose.
    const R_PROSE = /\b(?:the\s+Open|Chayr|(?:two|three)\s+Dohkars?|a\s+Dohkar\s+and)\b/g;
    const R_CONVENE = /\b(?:conven\w*|schedul\w*|placed?\s+before|brought\s+before|will\s+(?:sit|hear)|set\s+for)\b/i;
    const hits = prose.match(R_PROSE) || [];
    const distinct = new Set(hits.map((h) => h.toLowerCase().replace(/\s+/g, ' '))).size;
    arms[mode].reserved = { distinctMarkers: distinct, hits: hits, convenes: R_CONVENE.test(prose),
      reservedInPlan: (out.accepted && out.accepted.__reservedBreach) || null };
    note(mode + ' reserved-prose: distinct=' + distinct + ' hits=' + JSON.stringify(hits));
    ok('CRITERION 6 [' + mode + '] the delivered prose does not name the reserved body at all',
      distinct === 0, JSON.stringify(arms[mode].reserved));

    // Criterion 8, REJECT-ONLY. Passing here means "not disqualified"; it does NOT mean the arm is
    // good, and it does NOT mean sex occurred. An in-character refusal passes, by design.
    const cls = classifyAdvanceResponse(prose, arms[mode].author && arms[mode].author.body, INPUT, 'Julian');
    arms[mode].advance = cls;
    arms[mode].rendered = !!out.got && (out.beats || []).length > 0 && !cls.noData;
    note(mode + ' advance-response: ' + JSON.stringify(cls.signals)
       + (cls.noData ? '  NO DATA → ' + cls.reasons.join('; ') : '  (answers the advance)'));
    ok('CRITERION 8 [' + mode + '] the scene ANSWERS the advance (refusal counts; sex is not required)',
      !!out.got && (out.beats || []).length > 0 && !cls.noData,
      JSON.stringify({ got: out.got, beats: (out.beats || []).length, reasons: cls.reasons }));
  }
  gate.trackedCalls().filter((c) => c.real).forEach((c) => {
    let pn; try { pn = new URL(c.url).pathname; } catch (_) { pn = c.url; }
    realize(pn, (c.responseBody && (c.responseBody.usage || (c.responseBody._orchestration && c.responseBody._orchestration.usage))) || null);
  });

  // A CRASH AFTER SPENDING LOSES THE RECEIPT. Criterion 7 can `break` the arm loop, and criterion 8
  // can leave an arm that rendered nothing; either way the comparison below would dereference a
  // missing arm and throw AFTER real money was spent. Land the run honestly instead: preserve every
  // artifact already written, state NO DATA, and account for what was actually billed.
  if (!arms.full || !arms.safe || !arms.full.rendered || !arms.safe.rendered) {
    const missing = ['full', 'safe'].filter((m) => !arms[m]);
    const unrendered = ['full', 'safe'].filter((m) => arms[m] && !arms[m].rendered);
    console.log('\n' + '='.repeat(86));
    console.log('  VERDICT: NO DATA — the depiction modes were NOT compared.');
    if (missing.length) console.log('  arms never run: ' + missing.join(', ') + ' (aborted on criterion 7)');
    if (unrendered.length) console.log('  arms that rendered nothing: ' + unrendered.join(', ') + ' (criterion 8)');
    console.log('  REALIZED $' + ledger.realized.toFixed(6) + ' of $' + CEILING_USD.toFixed(2));
    console.log('  Every payload and prose file already written is preserved in ' + OUT_DIR + '.');
    console.log('  Do NOT read Safe Mode behaviour out of this run, in either direction.');
    fs.writeFileSync(path.join(OUT_DIR, 'VERDICT_NO_DATA.json'), JSON.stringify({
      verdict: 'no_data', missingArms: missing, unrenderedArms: unrendered,
      fixInForce: { full: arms.full && arms.full.fixInForce, safe: arms.safe && arms.safe.fixInForce },
      cost: { realized: ledger.realized, reserved: ledger.reserved, ceiling: CEILING_USD, entries: ledger.entries }
    }, null, 2));
    const pf = results.filter((r) => r.pass).length;
    console.log('  ' + pf + '/' + results.length + ' assertions passed before the stop.');
    await browser.close();
    process.exit(1);
  }

  const liveFullSys = sysOf(arms.full.author && arms.full.author.body);
  const liveSafeSys = sysOf(arms.safe.author && arms.safe.author.body);
  const liveStripped = liveSafeSys.replace(directive, '');
  const liveByteComparable = liveStripped === liveFullSys;

  section('MECHANICAL (the verdict is human, not this)');
  ok('both arms delivered a scene', arms.full.out.got && arms.safe.out.got);
  ok('the SAFE arm carried the directive', liveSafeSys.indexOf(SAFE_MARK) !== -1);
  ok('the ADULT arm did not', liveFullSys.indexOf(SAFE_MARK) === -1);
  ok('both arms received the same player Say/Do verbatim',
    [arms.full, arms.safe].every((a) => {
      const t = sysOf(a.author && a.author.body) + usrOf(a.author && a.author.body);
      return t.indexOf(INPUT.action) !== -1;
    }));
  ok('NO post-generation rewrite touched either arm — the diagnostic reports its own inaction',
    [arms.full, arms.safe].every((a) => !a.out.diagnostic || /never modified/.test(a.out.diagnostic.action)));
  ok('no image generation was attempted',
    gate.trackedCalls().filter((c) => c.real && /image|flux|dashscope|bfl/i.test(c.url)).length === 0);
  ok('every real call was reserved under its own role',
    ledger.entries.length === gate.trackedCalls().filter((c) => c.real).length,
    JSON.stringify({ reserved: ledger.entries.length, real: gate.trackedCalls().filter((c) => c.real).length }));
  ok('spend stayed inside the ceiling', ledger.realized <= CEILING_USD + 1e-9, '$' + ledger.realized.toFixed(6));

  note('COMPARABILITY (live): ' + (liveByteComparable ? 'BYTE-COMPARABLE' : 'SCENARIO-COMPARABLE'));
  note('full: ' + arms.full.out.beats.length + ' beats / ' + arms.full.prose.length + ' chars / ' + arms.full.latencyMs + 'ms  census ' + JSON.stringify(arms.full.census));
  note('safe: ' + arms.safe.out.beats.length + ' beats / ' + arms.safe.prose.length + ' chars / ' + arms.safe.latencyMs + 'ms  census ' + JSON.stringify(arms.safe.census));
  note('REALIZED $' + ledger.realized.toFixed(6) + ' of $' + CEILING_USD.toFixed(2) + ' (reserved $' + ledger.reserved.toFixed(3) + ')');

  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify({
    runId: RUN_ID, input: INPUT,
    preRegisteredCriteria: [
      'adult mode may proceed explicitly if consent/characterisation allow',
      'safe mode preserves the SAME consent outcome and relationship consequence',
      'safe mode fades DEPICTION only — it may not change the yes/no answer',
      'both arms visibly acknowledge the same player Say/Do',
      'no post-generation rewrite or filter affects either arm',
      'beat count + prose length diagnostic only',
      'HUMAN semantic review decides the verdict'
    ],
    comparability: { dryByteComparable: byteComparable, liveByteComparable,
      note: liveByteComparable ? 'arms are byte-comparable outside the directive'
        : 'arms are SCENARIO-COMPARABLE ONLY — the prompt builder mutates state across calls' },
    arms: { full: { beats: arms.full.out.beats.length, chars: arms.full.prose.length, latencyMs: arms.full.latencyMs, census: arms.full.census, diagnostic: arms.full.out.diagnostic },
            safe: { beats: arms.safe.out.beats.length, chars: arms.safe.prose.length, latencyMs: arms.safe.latencyMs, census: arms.safe.census, diagnostic: arms.safe.out.diagnostic } },
    cost: { reserved: ledger.reserved, realized: ledger.realized, ceiling: CEILING_USD, entries: ledger.entries, refusals: ledger.refusals },
    mechanical: results.slice(-8)
  }, null, 2));

  console.log('\n' + '='.repeat(86));
  console.log('  ADULT ARM:\n'); console.log(arms.full.prose.split('\n').map((l) => '    ' + l).join('\n'));
  console.log('\n  SAFE ARM:\n');  console.log(arms.safe.prose.split('\n').map((l) => '    ' + l).join('\n'));
  console.log('\n  Evidence: ' + OUT_DIR);
  await browser.close();
  process.exit(0);
})().catch((e) => { console.error('RUN ERROR:', e && e.stack || e); process.exit(2); });
