// CG CAUSAL LINK LEGIBILITY — DRY CONTROL (Roman, 2026-09-22, retuned same day after Silence
// attempt 2 exposed the precondition-only trigger as too narrow)
//
// History in this file:
//   v1 (after Silence attempt 1): _causalLinkPlanTrigger scanned precondition+event+tactical_move,
//      false-triggered on Temptation attempt 11's real tactical_move ("...concealing her personal
//      stake..."). Narrowed to precondition-only.
//   v2 (after Silence attempt 2, real paid data): precondition-only proved too narrow — the SAME
//      underlying silence-driven scene produced a precondition with no trigger vocabulary
//      ("No preliminary review date... has been announced"), even though tactical_move,
//      posture_read, and li_pressure_actor all still clearly described a silence-driven scene.
//      Roman: "make the trigger read the resolved event-frame / lane metadata first... The
//      safer rule is: use the accepted plan's lane/frame context plus fields that describe the
//      CAUSE of the event, not fields that describe the event's MANNER." This version.
//
// THIS FIX: _causalLinkFrameTrigger(s) resolves the story's own deterministic lane/event-frame
// (the SAME generic _effectiveSceneRow + _resolveStarterEventFrame mechanism the planner prompt
// and the lane-instantiation gate already use — not new machinery) and classifies its TEXT via
// the pure _causalLinkFrameTextTrigger(text). This is now the PRIMARY signal, checked before
// precondition. But the frame's own text is not automatically safe either: Temptation's real
// eventFrame contains "...she actively CONCEALS a SPECIFIC fact..." — non-action vocabulary again,
// in the exact field this fix now reads first. Re-checked directly (not assumed): Temptation's
// frame contains no causal-structure connector (prompts/causes/triggers/provokes/"in response to")
// anywhere, while Silence's frame explicitly says "...IS WHAT PROMPTS the presiding Dohkar...". So
// the frame-based trigger requires BOTH a non-action term AND a connector phrase in the SAME text —
// this is checking the starter designer's own small, finite, deliberately-authored lane text, not a
// live model's freeform output, so a connector requirement here is a materially different (and much
// less brittle) bar than the "no because/since in the model's own prose" rule that still governs
// the separate authored-beats diagnostic (_causalLinkBeatsCoOccurrence, unchanged this pass).
// precondition remains a fallback signal (never event/tactical_move — that regression stays fixed),
// used only when no frame resolves at all (a starter without the lane system, or a custom/no-card
// submission).
//
// Proves, fully dry, against REAL live app state wherever possible (not synthetic substitutes):
//   A. RED, END-TO-END — Silence attempt 1 AND attempt 2 both now trigger, via the REAL resolution
//      chain (window.state configured exactly as the live pipeline would: _starterId,
//      _intimateInterruption.selectedSlot — not hand-built fixture objects), even though attempt
//      2's own real precondition text carries no trigger vocabulary at all.
//   B. WIRING — the real _buildPlotContractDirective(), built with live state resolving Silence's
//      frame AND attempt 2's real (non-triggering) precondition, still contains CAUSAL LEGIBILITY —
//      proves the fix reaches the actual dispatched author prompt via the frame path specifically.
//   C. NO FALSE POSITIVE, END-TO-END, ALL FOUR OTHER REAL SLOTS — temptation/confession/boundary/
//      reversal, each resolved via the exact same live mechanism, do NOT trigger. Confession and
//      Boundary share Silence's own lane (dohkar_preliminary_review / family_accusation) but
//      correctly don't trigger because THEIR OWN eventFrame text isn't about a non-action.
//   D. GREEN beat fixture — same-beat co-occurrence passes with zero explicit causal wording.
//   E. GENERICITY — a synthetic non-First-Sacrifice row (different world, different lane ids)
//      proves _resolveStarterEventFrame itself is generic (pre-existing, unmodified code), and a
//      synthetic non-Fatelands frame TEXT (a council/tribunal world, zero shared vocabulary with
//      Fatelands) proves the NEW _causalLinkFrameTextTrigger classifier is generic too.
//   F. FALLBACK — when no frame resolves at all (synthetic sc, no live starter context),
//      precondition alone still triggers or doesn't correctly, preserving the prior fix.
//   G. Anti-gaming — non-action-only or response-only beats never satisfy co-occurrence.
//   H. Edge cases — no throw on null/empty/missing input anywhere in the chain.
//
// usage: node _cg_causal_link_legibility_control.mjs
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 900) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

// ── Silence attempt 2's REAL planner reply — read from its own persisted, already-paid log. ──
const SILENCE2_LOG = path.join(__dirname, '_scene2_repair_replay_sample_out', 'run_1790079294163.jsonl');
const silence2Lines = fs.readFileSync(SILENCE2_LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
function findRealJson(lines, markerKey) {
  for (const obj of lines) {
    const s = JSON.stringify(obj);
    if (s.includes(markerKey) && obj.kind !== 'dispatch') {
      const stack = [obj];
      while (stack.length) {
        const o = stack.pop();
        if (o && typeof o === 'object') {
          for (const k of Object.keys(o)) {
            const v = o[k];
            if (typeof v === 'string' && v.includes(markerKey)) { try { return JSON.parse(v); } catch (_) {} }
            if (v && typeof v === 'object') stack.push(v);
          }
        }
      }
    }
  }
  return null;
}
const REAL_SILENCE2_PLANNER = findRealJson(silence2Lines, 'tactical_move');
if (!REAL_SILENCE2_PLANNER) { console.error('HARNESS BLOCKER: could not extract Silence attempt 2\'s real planner JSON — re-derive the fixture.'); process.exit(2); }
console.log('✓ loaded Silence attempt 2\'s REAL planner reply verbatim: precondition="' + REAL_SILENCE2_PLANNER.state_change_precondition + '"');
const REAL_SILENCE2_SC = {
  precondition: REAL_SILENCE2_PLANNER.state_change_precondition,
  event: REAL_SILENCE2_PLANNER.state_change,
  tactical_move: REAL_SILENCE2_PLANNER.tactical_move,
  forces_choice: REAL_SILENCE2_PLANNER.forces_choice,
};

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(__dirname, '_cg_causal_link_legibility_control_out.jsonl') });
  // No stubs registered deliberately — this control only calls exposed window.* functions
  // directly; any /api/** call at all would be a genuine harness bug (fail-closed abort surfaces
  // it immediately).

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => window.state
    && typeof window._causalLinkPlanTrigger === 'function'
    && typeof window._causalLinkFrameTrigger === 'function'
    && typeof window._causalLinkFrameTextTrigger === 'function'
    && typeof window._causalLinkBeatsCoOccurrence === 'function'
    && typeof window._effectiveSceneRow === 'function'
    && typeof window._resolveStarterEventFrame === 'function'
    && typeof window._buildPlotContractDirective === 'function', { timeout: 20000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready or new functions not exposed — ' + (e && e.message)); await browser.close(); process.exit(2); });
  console.log('✓ real app reached, all new/touched functions exposed on window\n');

  // Helper: configure the live state exactly as the real pipeline would when the reader has
  // just selected a given Fate-card slot in First Sacrifice's scene 2 — no synthetic row/state,
  // the REAL STARTER_PLANS.starter_first_sacrifice data resolved through the real mechanism.
  async function frameTriggerForRealSlot(slot) {
    return page.evaluate((slot) => {
      window.state._starterId = 'starter_first_sacrifice';
      window.state.turnCount = 1; // -> _effectiveSceneRow resolves scene n=2, First Sacrifice's real Fate-card scene
      window.state._intimateInterruption = { selectedSlot: slot };
      return window._causalLinkFrameTrigger(window.state);
    }, slot);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('A. RED, END-TO-END — both real Silence attempts trigger via the real resolution chain');
  {
    const silenceFrame = await frameTriggerForRealSlot('silence');
    ok('Silence, resolved through the REAL live starter data (not a fixture), triggers the frame-based detector', silenceFrame === 'silence', JSON.stringify(silenceFrame));

    // Attempt 2's own real precondition, checked in isolation via the fallback path only (no
    // live frame context set), correctly does NOT trigger on its own -- proving the frame is
    // doing the real work for attempt 2, not the precondition fallback quietly saving it.
    // Pass an explicit non-resolving state object, NOT null/undefined -- _causalLinkFrameTrigger
    // treats a falsy s as "fall back to window.state," which at this point in the section still
    // carries Silence context from the assertion just above. {_starterId: null} genuinely
    // suppresses frame resolution instead.
    const attempt2PreconditionAlone = await page.evaluate((sc) => window._causalLinkPlanTrigger(sc, { _starterId: null }), REAL_SILENCE2_SC);
    ok('Silence attempt 2\'s own real precondition text, checked WITHOUT live frame context, does NOT trigger on its own (confirms the frame is what fixed this, not a quiet precondition match)', attempt2PreconditionAlone === null, JSON.stringify(attempt2PreconditionAlone));

    // Now the full, real call: _causalLinkPlanTrigger(sc, state) with the live state configured
    // for Silence -- this is exactly what _buildPlotContractDirective calls internally.
    const attempt2Full = await page.evaluate((sc) => {
      window.state._starterId = 'starter_first_sacrifice';
      window.state.turnCount = 1;
      window.state._intimateInterruption = { selectedSlot: 'silence' };
      return window._causalLinkPlanTrigger(sc, window.state);
    }, REAL_SILENCE2_SC);
    ok('Silence attempt 2\'s real stateChange, run through the REAL full _causalLinkPlanTrigger(sc, state) call, now triggers via the frame', attempt2Full === 'silence', JSON.stringify(attempt2Full));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('B. WIRING — the real _buildPlotContractDirective(), live-resolved for Silence, carries the fix from attempt 2\'s real (non-triggering-alone) data');
  {
    const r = await page.evaluate((sc) => {
      const savedContract = window.state._scenePlotContract;
      const savedRenderMode = window.state.renderMode;
      const savedKill = window._plotContractKill;
      const savedStarter = window.state._starterId;
      const savedTurn = window.state.turnCount;
      const savedIntr = window.state._intimateInterruption;
      try {
        window._plotContractKill = false;
        window.state.renderMode = 'staged_story_mode';
        window.state._starterId = 'starter_first_sacrifice';
        window.state.turnCount = 1;
        window.state._intimateInterruption = { selectedSlot: 'silence' };
        window.state._scenePlotContract = { sceneIndex: 1, stateChange: sc, hardBeats: [] };
        return window._buildPlotContractDirective();
      } finally {
        window.state._scenePlotContract = savedContract;
        window.state.renderMode = savedRenderMode;
        window._plotContractKill = savedKill;
        window.state._starterId = savedStarter;
        window.state.turnCount = savedTurn;
        window.state._intimateInterruption = savedIntr;
      }
    }, REAL_SILENCE2_SC);
    ok('directive built with attempt 2\'s real stateChange + live Silence frame context contains the CAUSAL LEGIBILITY block', /CAUSAL LEGIBILITY \(HARD/.test(r), 'directive length=' + r.length);
    ok('the directive still contains the ordinary "THE EVENT" line (coexistence)', /THE EVENT — stage THIS EXACT event/.test(r), 'directive length=' + r.length);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('C. NO FALSE POSITIVE, END-TO-END — all four other real Fate-card slots do not trigger');
  {
    for (const slot of ['temptation', 'confession', 'boundary', 'reversal']) {
      const t = await frameTriggerForRealSlot(slot);
      ok('real slot "' + slot + '", resolved through the REAL live starter data, does NOT trigger the frame-based detector', t === null, JSON.stringify(t));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('D. GREEN FIXTURE — causation legible via same-beat co-occurrence, with NO explicit causal wording');
  {
    const greenSc = { precondition: 'The hall holds silence after her refusal, with no ruling yet.' };
    const greenBeats = [
      { idx: 0, text: 'She says nothing, jaw set.' },
      { idx: 1, text: 'The magistrate watches the silence stretch, then speaks: a formal ruling, issued into the very quiet she left him.' },
      { idx: 2, text: 'The hall exhales.' },
    ];
    const r = await page.evaluate(({ sc, beats }) => window._causalLinkBeatsCoOccurrence(beats, sc, null), { sc: greenSc, beats: greenBeats });
    ok('GREEN — a beat pairing a non-action term with a response term in the SAME beat passes, no "because"/"since" anywhere', r.applicable === true && r.ok === true && r.evidenceBeatIdx === 1, JSON.stringify(r));
    ok('no literal causal connective appears anywhere in the fixture (confirms this isn\'t a disguised because/since check)', !/\b(because|since)\b/i.test(greenBeats.map((b) => b.text).join(' ')), 'fixture text: ' + greenBeats.map((b) => b.text).join(' | '));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('E. GENERICITY — non-First-Sacrifice, in two independent layers');
  {
    // E1: _resolveStarterEventFrame itself (pre-existing, unmodified) is generic -- a synthetic
    // row from a completely different world resolves correctly.
    const syntheticRow = {
      aftermathLanes: [{ id: 'tribunal_formal_inquiry', label: 'The tribunal opens a formal inquiry into the envoy\'s conduct.' }],
      eventFrameBySlot: { silence: { laneId: 'tribunal_formal_inquiry', eventFrame: 'The envoy\'s official silence toward the council is what triggers the tribunal\'s formal inquiry into his conduct.' } },
    };
    const syntheticState = { _intimateInterruption: { selectedSlot: 'silence' } };
    const e1 = await page.evaluate(({ row, st }) => window._resolveStarterEventFrame(row, st), { row: syntheticRow, st: syntheticState });
    ok('_resolveStarterEventFrame resolves a completely synthetic, non-Fatelands row/state correctly (pre-existing generic mechanism)', e1 && e1.laneId === 'tribunal_formal_inquiry' && /triggers the tribunal/.test(e1.eventFrame), JSON.stringify(e1));

    // E2: the NEW classifier, _causalLinkFrameTextTrigger, correctly fires on that resolved
    // synthetic frame's own text -- zero shared vocabulary with Fatelands (no "Dohkar",
    // "assembly", "Lirael" anywhere).
    const e2 = await page.evaluate((text) => window._causalLinkFrameTextTrigger(text), e1 ? e1.eventFrame : '');
    ok('the new frame-text classifier fires on a synthetic council/tribunal world\'s own eventFrame text ("silence"/"triggers")', e2 === 'silence', JSON.stringify(e2));

    // E3: a synthetic frame that uses non-action vocabulary WITHOUT a causal connector (the
    // Temptation-shaped case) correctly does NOT fire, even in this unrelated world -- proves
    // the connector gate generalizes, not just happens to work for these two specific stories.
    const e3 = await page.evaluate((text) => window._causalLinkFrameTextTrigger(text), 'The envoy actively conceals the treaty\'s true terms from the council, a deliberate act of diplomatic misdirection.');
    ok('a synthetic frame using non-action vocabulary as the MANNER of an active move (no connector) correctly does not trigger, in an unrelated world', e3 === null, JSON.stringify(e3));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('F. FALLBACK — precondition alone still governs when no frame resolves at all');
  {
    const noFrameState = null; // _causalLinkPlanTrigger(sc, null) -> _causalLinkFrameTrigger(null) -> no window.state fallback reachable in this call shape, forces the precondition path
    const scWithSilence = { precondition: 'The council has not yet acted on his restraint.' };
    const scWithoutTrigger = { precondition: 'the door is closed' };
    const r = await page.evaluate(({ sc1, sc2 }) => ({
      withTrigger: window._causalLinkPlanTrigger(sc1, { _starterId: null }),
      withoutTrigger: window._causalLinkPlanTrigger(sc2, { _starterId: null }),
    }), { sc1: scWithSilence, sc2: scWithoutTrigger });
    ok('when no frame resolves (no _starterId), a precondition containing non-action vocabulary ("restraint") still triggers via the fallback', r.withTrigger === 'restraint', JSON.stringify(r.withTrigger));
    ok('when no frame resolves and precondition has no trigger vocabulary either, correctly returns null', r.withoutTrigger === null, JSON.stringify(r.withoutTrigger));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('G. ANTI-GAMING — a non-action term alone, or a response term alone, does not satisfy co-occurrence');
  {
    const sc = { precondition: 'The hall holds her silence, with no ruling yet.' };
    const nonActionOnlyBeats = [{ idx: 0, text: 'She says nothing at all.' }, { idx: 1, text: 'The room is quiet.' }];
    const responseOnlyBeats = [{ idx: 0, text: 'The review convenes.' }, { idx: 1, text: 'Terms are announced to the hall.' }];
    const r = await page.evaluate(({ sc, a, b }) => ({
      nonActionOnly: window._causalLinkBeatsCoOccurrence(a, sc, { _starterId: null }),
      responseOnly: window._causalLinkBeatsCoOccurrence(b, sc, { _starterId: null }),
    }), { sc, a: nonActionOnlyBeats, b: responseOnlyBeats });
    ok('beats containing ONLY non-action vocabulary (no response term anywhere) do not satisfy co-occurrence', r.nonActionOnly.applicable === true && r.nonActionOnly.ok === false, JSON.stringify(r.nonActionOnly));
    ok('beats containing ONLY response vocabulary (no non-action term anywhere) do not satisfy co-occurrence', r.responseOnly.applicable === true && r.responseOnly.ok === false, JSON.stringify(r.responseOnly));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('H. EDGE CASES — no throw on missing/empty input anywhere in the chain');
  {
    // Cleanup: sections A/C set window.state._starterId + _intimateInterruption and never
    // restored them (deliberately, to chain live-state assertions). Clear them here so
    // nullFrameState below genuinely tests "no live story context," not leftover pollution
    // that would also happen to resolve to null for an unrelated reason.
    await page.evaluate(() => { window.state._starterId = null; window.state._intimateInterruption = null; });
    const r = await page.evaluate(() => ({
      nullSc: window._causalLinkPlanTrigger(null, { _starterId: null }),
      emptySc: window._causalLinkPlanTrigger({}, { _starterId: null }),
      nullFrameText: window._causalLinkFrameTextTrigger(null),
      nullFrameState: window._causalLinkFrameTrigger(null),
      nullBeats: window._causalLinkBeatsCoOccurrence(null, { precondition: 'her silence has gone unanswered' }, { _starterId: null }),
      emptyBeats: window._causalLinkBeatsCoOccurrence([], { precondition: 'her silence has gone unanswered' }, { _starterId: null }),
      notApplicable: window._causalLinkBeatsCoOccurrence([{ idx: 0, text: 'He crossed the room and opened the door.' }], { precondition: 'the door is closed' }, { _starterId: null }),
    }));
    ok('null stateChange never throws, returns null', r.nullSc === null, JSON.stringify(r.nullSc));
    ok('empty stateChange object never throws, returns null', r.emptySc === null, JSON.stringify(r.emptySc));
    ok('null frame text never throws, returns null', r.nullFrameText === null, JSON.stringify(r.nullFrameText));
    ok('null state passed to _causalLinkFrameTrigger never throws (falls back to window.state internally, no live starter set -> null)', r.nullFrameState === null, JSON.stringify(r.nullFrameState));
    ok('null beats array with a triggering sc never throws (applicable=true, ok=false)', r.nullBeats.applicable === true && r.nullBeats.ok === false, JSON.stringify(r.nullBeats));
    ok('empty beats array with a triggering sc never throws (applicable=true, ok=false)', r.emptyBeats.applicable === true && r.emptyBeats.ok === false, JSON.stringify(r.emptyBeats));
    ok('a plain landed-action scene (no non-action vocabulary anywhere) is correctly marked NOT applicable, not scored at all', r.notApplicable.applicable === false && r.notApplicable.ok === null, JSON.stringify(r.notApplicable));
  }

  await browser.close();

  console.log('\n' + '='.repeat(100));
  console.log('CG CAUSAL LINK LEGIBILITY CONTROL: ' + results.filter((r) => r.pass).length + '/' + results.length + ' passed');
  try { fs.unlinkSync(path.join(__dirname, '_cg_causal_link_legibility_control_out.jsonl')); } catch (_) {}
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
