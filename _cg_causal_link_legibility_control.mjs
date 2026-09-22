// CG CAUSAL LINK LEGIBILITY — DRY CONTROL (Roman, 2026-09-22)
//
// Roman, after Silence attempt 1 (real, paid): "the planner appears to have carried the intended
// Silence frame... The failure is in the authored beats: the procedure happens after the silence,
// but the prose does not make it legible that it happens because of the silence." Instruction:
// diagnose whether the author prompt currently carries an explicit causal-legibility obligation;
// if not, add a GENERIC (not First-Sacrifice-only, not Silence-only) author-side directive for
// consequence-driving non-action (silence/refusal/restraint/concealment/non-answer); add a
// lightweight diagnostic ONLY if it can be structural and honest, never a brittle
// "because"/"since" phrase regex; prove against Silence attempt 1 as the red fixture, plus a
// green fixture where causation is legible without explicit causal wording. No provider calls, no
// retry, no prose edits.
//
// TRACE (dry): the CG author's actual planner→author delivery channel is
// state._scenePlotContract.stateChange, rendered by _buildPlotContractDirective (public/app.js,
// called from BOTH the literary and CG author prompt roots). Confirmed via full-function-body
// read: this directive delivers precondition/event/forces_choice/EVENT-CONTRACT slots to the
// author, but — before this fix — NEVER told the author to make a causal link (vs. mere sequence)
// LEGIBLE when the underlying event is framed as a consequence of a non-action. Separately
// confirmed the CG screenplay author's own user-prompt builder (_buildCGScreenplayUserPrompt, the
// ~31k-line function) never references tactical_move/state_change/aftermath_obligations/eventFrame
// at all — _buildPlotContractDirective is genuinely the ONLY structured channel for this content.
//
// Fixed, both in public/app.js, both dry:
//   1. _buildPlotContractDirective now injects a HARD "CAUSAL LEGIBILITY" directive line
//      immediately after "THE EVENT" line, gated by _causalLinkPlanTrigger(sc) — a pure detector
//      reading ONLY the accepted plan's own generic stateChange fields (precondition/event/
//      tactical_move), never a story-specific eventFrame or lane id. Fires for ANY starter/slot
//      whose own accepted plan is framed around a non-action.
//   2. _causalLinkBeatsCoOccurrence(beats, sc) — a NEW, diagnostic-only (never rejects, never
//      rewrites) structural check on the FINAL AUTHORED BEATS: does any single beat's text contain
//      BOTH a non-action term (silence/withheld/refuse/restraint/conceal/etc.) and a generic
//      institutional/social-response term (review/hearing/ruling/orders/etc.)? This is explicitly
//      NOT a "because"/"since" phrase check — it is a coarse, honest, necessary-but-not-sufficient
//      proxy: presence doesn't prove dramatized causation, but total absence across every beat is
//      strong evidence the two threads were never bound together at all (Silence attempt 1's real
//      failure: beats 0-1 establish the silence, beats 4/6/10 are pure procedure, zero overlap).
//
// Proves, fully dry:
//   A. RED — Silence attempt 1's OWN real, captured stateChange (precondition/event/tactical_move)
//      triggers _causalLinkPlanTrigger; its OWN real, captured authored beats FAIL
//      _causalLinkBeatsCoOccurrence (no single beat co-occurs) — exactly reproducing the real,
//      already-diagnosed failure.
//   B. GENERATION-TIME FIX REACHES THE PAYLOAD — the real _buildPlotContractDirective(), built
//      with Silence attempt 1's real stateChange, now contains the new CAUSAL LEGIBILITY directive
//      text, source-traced (not a paraphrase check).
//   C. NO FALSE POSITIVE — Temptation attempt 11's real stateChange (a landed defensive action,
//      not framed around a non-action) does NOT trigger the detector; _buildPlotContractDirective
//      built from it does NOT contain the CAUSAL LEGIBILITY block — proves this doesn't fire
//      indiscriminately on every scene.
//   D. GREEN FIXTURE — a synthetic beat set where a non-action term and a response term co-occur
//      in the SAME beat, with NO "because"/"since"/explicit-causal wording anywhere, PASSES
//      _causalLinkBeatsCoOccurrence.
//   E. Genericity — a non-First-Sacrifice, non-Silence synthetic stateChange (different world,
//      different lane id, "restraint" instead of "silence", "orders" instead of "review") still
//      triggers the SAME generic mechanism — proves this is not hardcoded to Silence's specific
//      vocabulary or First Sacrifice's specific lane ids.
//   F. Anti-gaming — a beat containing a non-action term ALONE (no response term anywhere in the
//      scene) does not satisfy co-occurrence; a beat containing a response term ALONE (no
//      non-action term) does not either — the check requires genuine co-occurrence in one beat,
//      not a scene-wide OR.
//   G. COEXIST — the rest of _buildPlotContractDirective's block (BEFORE line, forces_choice,
//      event contract) is unaffected by this addition.
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

// ── Silence attempt 1's REAL planner reply + REAL authored beats — read from the committed,
// already-paid artifacts, not re-typed or paraphrased. ──
const SILENCE_LOG = path.join(__dirname, '_scene2_repair_replay_sample_out', 'run_1790076441341.jsonl');
const silenceLines = fs.readFileSync(SILENCE_LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
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
const REAL_SILENCE_PLANNER = findRealJson(silenceLines, 'tactical_move');
const REAL_SILENCE_AUTHOR = findRealJson(silenceLines, 'decisionGateBeatIdx');
if (!REAL_SILENCE_PLANNER || !REAL_SILENCE_AUTHOR) { console.error('HARNESS BLOCKER: could not extract Silence attempt 1\'s real planner/author JSON from the log — re-derive the fixture.'); process.exit(2); }
console.log('✓ loaded Silence attempt 1\'s REAL planner reply verbatim: chosen_aftermath_lane="' + REAL_SILENCE_PLANNER.chosen_aftermath_lane + '"');
console.log('✓ loaded Silence attempt 1\'s REAL authored beats verbatim: ' + REAL_SILENCE_AUTHOR.beats.length + ' beats, decisionGateBeatIdx=' + REAL_SILENCE_AUTHOR.decisionGateBeatIdx);

const REAL_SILENCE_SC = {
  precondition: REAL_SILENCE_PLANNER.state_change_precondition,
  event: REAL_SILENCE_PLANNER.state_change,
  tactical_move: REAL_SILENCE_PLANNER.tactical_move,
  forces_choice: REAL_SILENCE_PLANNER.forces_choice,
};
const REAL_SILENCE_BEATS = REAL_SILENCE_AUTHOR.beats;

// ── Temptation attempt 11's REAL planner reply — read the same way, for the no-false-positive proof. ──
const TEMPTATION_LOG = path.join(__dirname, '_scene2_repair_replay_sample_out', 'run_1790069845012.jsonl');
const temptationLines = fs.readFileSync(TEMPTATION_LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const REAL_TEMPTATION_PLANNER = findRealJson(temptationLines, 'tactical_move');
if (!REAL_TEMPTATION_PLANNER) { console.error('HARNESS BLOCKER: could not extract Temptation attempt 11\'s real planner JSON — re-derive the fixture.'); process.exit(2); }
console.log('✓ loaded Temptation attempt 11\'s REAL planner reply verbatim: chosen_aftermath_lane="' + REAL_TEMPTATION_PLANNER.chosen_aftermath_lane + '"');
const REAL_TEMPTATION_SC = {
  precondition: REAL_TEMPTATION_PLANNER.state_change_precondition,
  event: REAL_TEMPTATION_PLANNER.state_change,
  tactical_move: REAL_TEMPTATION_PLANNER.tactical_move,
  forces_choice: REAL_TEMPTATION_PLANNER.forces_choice,
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
    && typeof window._causalLinkBeatsCoOccurrence === 'function'
    && typeof window._buildPlotContractDirective === 'function', { timeout: 20000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready or new functions not exposed — ' + (e && e.message)); await browser.close(); process.exit(2); });
  console.log('✓ real app reached, all new/touched functions exposed on window\n');

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('A. RED — Silence attempt 1\'s own real stateChange + real authored beats reproduce the real failure');
  {
    const r = await page.evaluate(({ sc, beats }) => ({
      planTrigger: window._causalLinkPlanTrigger(sc),
      coOcc: window._causalLinkBeatsCoOccurrence(beats, sc),
    }), { sc: REAL_SILENCE_SC, beats: REAL_SILENCE_BEATS });
    ok('the real accepted plan triggers the non-action detector (planTrigger is truthy)', !!r.planTrigger, JSON.stringify(r.planTrigger));
    ok('planTrigger correctly identifies "silence" as the matched term', r.planTrigger && r.planTrigger.toLowerCase() === 'silence', JSON.stringify(r.planTrigger));
    ok('the real authored beats FAIL co-occurrence (applicable=true, ok=false) — reproduces the real diagnosed failure', r.coOcc.applicable === true && r.coOcc.ok === false, JSON.stringify(r.coOcc));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('B. WIRING — the real _buildPlotContractDirective(), built from Silence attempt 1\'s real stateChange, now carries the fix');
  {
    const r = await page.evaluate((sc) => {
      const savedContract = window.state._scenePlotContract;
      const savedRenderMode = window.state.renderMode;
      const savedKill = window._plotContractKill;
      try {
        window._plotContractKill = false;
        window.state.renderMode = 'staged_story_mode';
        window.state._scenePlotContract = { sceneIndex: 5, stateChange: sc, hardBeats: [] };
        return window._buildPlotContractDirective();
      } finally {
        window.state._scenePlotContract = savedContract;
        window.state.renderMode = savedRenderMode;
        window._plotContractKill = savedKill;
      }
    }, REAL_SILENCE_SC);
    ok('directive built from Silence attempt 1\'s real stateChange contains the new CAUSAL LEGIBILITY block (source-traced, not paraphrased)', /CAUSAL LEGIBILITY \(HARD/.test(r), 'directive length=' + r.length);
    ok('the causal directive names the real matched trigger term ("silence") in context', /framed around someone.s silence/.test(r), 'directive length=' + r.length);
    ok('the directive explicitly does not require the literal word "because" from the model', /even without the word "because\./.test(r), 'directive length=' + r.length);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('C. NO FALSE POSITIVE — Temptation attempt 11\'s real stateChange (a landed action, not a non-action) does not trigger this');
  {
    const r = await page.evaluate((sc) => ({
      planTrigger: window._causalLinkPlanTrigger(sc),
    }), REAL_TEMPTATION_SC);
    ok('Temptation attempt 11\'s real stateChange does NOT trigger the non-action detector', r.planTrigger === null, JSON.stringify(r.planTrigger));

    const directive = await page.evaluate((sc) => {
      const savedContract = window.state._scenePlotContract;
      const savedRenderMode = window.state.renderMode;
      const savedKill = window._plotContractKill;
      try {
        window._plotContractKill = false;
        window.state.renderMode = 'staged_story_mode';
        window.state._scenePlotContract = { sceneIndex: 5, stateChange: sc, hardBeats: [] };
        return window._buildPlotContractDirective();
      } finally {
        window.state._scenePlotContract = savedContract;
        window.state.renderMode = savedRenderMode;
        window._plotContractKill = savedKill;
      }
    }, REAL_TEMPTATION_SC);
    ok('directive built from Temptation attempt 11\'s real stateChange does NOT contain the CAUSAL LEGIBILITY block', !/CAUSAL LEGIBILITY \(HARD/.test(directive), 'directive length=' + directive.length);
    ok('but the directive still contains the ordinary "THE EVENT" line (coexistence — the rest of the block is unaffected)', /THE EVENT — stage THIS EXACT event/.test(directive), 'directive length=' + directive.length);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('D. GREEN FIXTURE — causation legible via same-beat co-occurrence, with NO explicit causal wording');
  {
    const greenSc = { precondition: 'The hall holds silence after her refusal, with no ruling yet.', event: 'The magistrate responds to the silence.', tactical_move: 'the magistrate answers her silence with a ruling' };
    const greenBeats = [
      { idx: 0, text: 'She says nothing, jaw set.' },
      { idx: 1, text: 'The magistrate watches the silence stretch, then speaks: a formal ruling, issued into the very quiet she left him.' },
      { idx: 2, text: 'The hall exhales.' },
    ];
    const r = await page.evaluate(({ sc, beats }) => window._causalLinkBeatsCoOccurrence(beats, sc), { sc: greenSc, beats: greenBeats });
    ok('GREEN — a beat pairing a non-action term with a response term in the SAME beat passes, no "because"/"since" anywhere', r.applicable === true && r.ok === true && r.evidenceBeatIdx === 1, JSON.stringify(r));
    ok('no literal causal connective appears anywhere in the fixture (confirms this isn\'t a disguised because/since check)', !/\b(because|since)\b/i.test(greenBeats.map((b) => b.text).join(' ')), 'fixture text: ' + greenBeats.map((b) => b.text).join(' | '));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('E. GENERICITY — a non-First-Sacrifice, non-Silence synthetic scene still triggers the same generic mechanism');
  {
    const genericSc = { precondition: 'The council has not yet acted on his restraint.', event: 'The council issues formal sanctions against the delegation.', tactical_move: 'the council converts his public restraint into a sanction' };
    const genericBeatsFail = [{ idx: 0, text: 'He holds his tongue before the council.' }, { idx: 1, text: 'The council issues its sanctions the following morning.' }];
    const genericBeatsPass = [{ idx: 0, text: 'He holds his tongue before the council.' }, { idx: 1, text: 'His silence is answer enough — the council issues its sanctions before he leaves the chamber.' }];
    const r = await page.evaluate(({ sc, beatsFail, beatsPass }) => ({
      trigger: window._causalLinkPlanTrigger(sc),
      fail: window._causalLinkBeatsCoOccurrence(beatsFail, sc),
      pass: window._causalLinkBeatsCoOccurrence(beatsPass, sc),
    }), { sc: genericSc, beatsFail: genericBeatsFail, beatsPass: genericBeatsPass });
    ok('a completely different world/lane ("council"/"sanctions"/"restraint" — no Fatelands or Silence-specific vocabulary) still triggers the generic detector', !!r.trigger, JSON.stringify(r.trigger));
    ok('the same generic mechanism correctly fails a sequenced-not-bound version of this unrelated scene', r.fail.applicable === true && r.fail.ok === false, JSON.stringify(r.fail));
    ok('the same generic mechanism correctly passes a bound version of this unrelated scene', r.pass.applicable === true && r.pass.ok === true, JSON.stringify(r.pass));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('F. ANTI-GAMING — a non-action term alone, or a response term alone, does not satisfy co-occurrence');
  {
    const sc = { precondition: 'The hall holds her silence, with no ruling yet.', event: 'the review is set', tactical_move: 'the silence prompts a review' };
    const nonActionOnlyBeats = [{ idx: 0, text: 'She says nothing at all.' }, { idx: 1, text: 'The room is quiet.' }];
    const responseOnlyBeats = [{ idx: 0, text: 'The review convenes.' }, { idx: 1, text: 'Terms are announced to the hall.' }];
    const r = await page.evaluate(({ sc, a, b }) => ({
      nonActionOnly: window._causalLinkBeatsCoOccurrence(a, sc),
      responseOnly: window._causalLinkBeatsCoOccurrence(b, sc),
    }), { sc, a: nonActionOnlyBeats, b: responseOnlyBeats });
    ok('beats containing ONLY non-action vocabulary (no response term anywhere) do not satisfy co-occurrence', r.nonActionOnly.applicable === true && r.nonActionOnly.ok === false, JSON.stringify(r.nonActionOnly));
    ok('beats containing ONLY response vocabulary (no non-action term anywhere) do not satisfy co-occurrence', r.responseOnly.applicable === true && r.responseOnly.ok === false, JSON.stringify(r.responseOnly));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('G. EDGE CASES — no throw on missing/empty input');
  {
    const r = await page.evaluate(() => ({
      nullSc: window._causalLinkPlanTrigger(null),
      emptySc: window._causalLinkPlanTrigger({}),
      nullBeats: window._causalLinkBeatsCoOccurrence(null, { precondition: 'her silence has gone unanswered', event: 'the review is set' }),
      emptyBeats: window._causalLinkBeatsCoOccurrence([], { precondition: 'her silence has gone unanswered', event: 'the review is set' }),
      notApplicable: window._causalLinkBeatsCoOccurrence([{ idx: 0, text: 'He crossed the room and opened the door.' }], { event: 'he opens the door', precondition: 'the door is closed', tactical_move: 'he acts decisively' }),
    }));
    ok('null stateChange never throws, returns null', r.nullSc === null, JSON.stringify(r.nullSc));
    ok('empty stateChange object never throws, returns null', r.emptySc === null, JSON.stringify(r.emptySc));
    ok('null beats array with a triggering sc never throws (applicable=true, ok=false)', r.nullBeats.applicable === true && r.nullBeats.ok === false, JSON.stringify(r.nullBeats));
    ok('empty beats array with a triggering sc never throws (applicable=true, ok=false)', r.emptyBeats.applicable === true && r.emptyBeats.ok === false, JSON.stringify(r.emptyBeats));
    ok('a plain landed-action scene (no non-action vocabulary) is correctly marked NOT applicable, not scored at all', r.notApplicable.applicable === false && r.notApplicable.ok === null, JSON.stringify(r.notApplicable));
  }

  await browser.close();

  console.log('\n' + '='.repeat(100));
  console.log('CG CAUSAL LINK LEGIBILITY CONTROL: ' + results.filter((r) => r.pass).length + '/' + results.length + ' passed');
  try { fs.unlinkSync(path.join(__dirname, '_cg_causal_link_legibility_control_out.jsonl')); } catch (_) {}
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
