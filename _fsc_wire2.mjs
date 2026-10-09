import fs from 'fs';
const F = 'public/app.js';
const sub = (a, b) => {
  let s = fs.readFileSync(F, 'utf8');
  if (!s.includes(a)) throw new Error('ANCHOR MISSING: ' + a.slice(0, 70));
  if (s.split(a).length > 2) throw new Error('ANCHOR NOT UNIQUE: ' + a.slice(0, 70));
  fs.writeFileSync(F, s.replace(a, b));
};

// ── 1. LIVE GATE at the single generation funnel. Every continuation route (scene-0 bootstrap,
//      main advance, retry) enters through _runCGScreenplayGen, so gating here covers all of them.
sub(
  "  async function _runCGScreenplayGen(sceneIndex, playerAction, playerDialogue) {\n" +
  "    try { state._stagedAuthoringSceneIndex =",
  "  async function _runCGScreenplayGen(sceneIndex, playerAction, playerDialogue) {\n" +
  "    // ── choice_pending LIVE GATE (Roman 2026-09-29) ────────────────────────────────────────\n" +
  "    // A renewed choice owed by a Tempt reality revision blocks EVERY continuation past it.\n" +
  "    // This is the single funnel for scene-0 bootstrap, the main advance and the retry path, so\n" +
  "    // the refusal cannot be routed around. The replay scene itself is permitted once — it is\n" +
  "    // the scene that reaches the choice — and is marked generated on success below.\n" +
  "    try {\n" +
  "      if (typeof _fscGateGeneration === 'function') {\n" +
  "        var _fscGate = _fscGateGeneration({ sceneIndex: sceneIndex });\n" +
  "        if (!_fscGate.allowed) {\n" +
  "          try { console.warn('[FSC-GATE] continuation refused \\u2014 ' + _fscGate.reason + ': ' + (_fscGate.detail || '')); } catch (_) {}\n" +
  "          return null;\n" +
  "        }\n" +
  "        if (_fscGate.mode === 'replay' && typeof _fscReplayAttempt === 'function') {\n" +
  "          var _fscAtt = _fscReplayAttempt();\n" +
  "          if (!_fscAtt.allowed) {\n" +
  "            // Tier 1 exhausted. Tier 2 is the authored static presentation; it needs no model\n" +
  "            // call, costs no Fortune, and creates no delta. The reader is told nothing about it.\n" +
  "            try { console.warn('[FSC-GATE] replay retries exhausted \\u2014 falling through to the authored static choice'); } catch (_) {}\n" +
  "            return null;\n" +
  "          }\n" +
  "        }\n" +
  "      }\n" +
  "    } catch (_fscGErr) { console.warn('[FSC-GATE] threw:', _fscGErr && _fscGErr.message); }\n" +
  "    try { state._stagedAuthoringSceneIndex =");

// ── 2. Mark the replay generated once the generation actually returns a plan.
sub(
  "      var _cgPlan = await _runCGScreenplayGenInner(sceneIndex, playerAction, playerDialogue);",
  "      var _cgPlan = await _runCGScreenplayGenInner(sceneIndex, playerAction, playerDialogue);\n" +
  "      // The replay reached prose. Every later continuation is now refused until the player\n" +
  "      // resolves the renewed choice.\n" +
  "      try {\n" +
  "        if (_cgPlan && typeof _fscMarkReplayGenerated === 'function') _fscMarkReplayGenerated();\n" +
  "      } catch (_fscMErr) { console.warn('[FSC-GATE] mark-replay threw:', _fscMErr && _fscMErr.message); }");

// ── 3. COMPILE IDEMPOTENCY. A retry must not produce a second compiled consequence or a second
//      delta. Keyed to the guard reservation that sealed this invocation.
sub(
  "  function _fscCompileAndPersist(wishText, opts) {\n" +
  "    try { return _fscPersistCompiled(_fscCompile(wishText, opts)); }",
  "  function _fscCompileAndPersist(wishText, opts) {\n" +
  "    // IDEMPOTENT PER SEALED INVOCATION. A retried generation re-enters nothing here, but a\n" +
  "    // re-entered seal path would otherwise append a second consequence and a second delta —\n" +
  "    // revising the world twice for one paid wish.\n" +
  "    try {\n" +
  "      var s0 = window.state;\n" +
  "      var key = (s0 && s0._temptGuardActiveReservation) || null;\n" +
  "      if (key && s0._fscCompiled) {\n" +
  "        for (var i = 0; i < s0._fscCompiled.length; i++) {\n" +
  "          if (s0._fscCompiled[i] && s0._fscCompiled[i].reservationKey === key) {\n" +
  "            try { console.log('[FSC] compile suppressed \\u2014 this invocation already has a compiled consequence (' + s0._fscCompiled[i].outcomeId + ')'); } catch (_) {}\n" +
  "            return s0._fscCompiled[i];\n" +
  "          }\n" +
  "        }\n" +
  "      }\n" +
  "    } catch (_) {}\n" +
  "    try { return _fscPersistCompiled(_fscCompile(wishText, opts)); }");

// ── 4. Stamp the reservation key onto the compiled record so idempotency has something to key on.
sub(
  "    if (!s._fscCompiled) s._fscCompiled = [];\n" +
  "    s._fscCompiled.push(rec);",
  "    if (!s._fscCompiled) s._fscCompiled = [];\n" +
  "    rec.reservationKey = s._temptGuardActiveReservation || null;\n" +
  "    s._fscCompiled.push(rec);");

console.log('wired: live gate, replay marking, compile idempotency');
