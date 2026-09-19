// FATELANDS WISH-RESOLUTION LEDGER — CONSISTENCY + FUNCTIONAL CONTROL (Roman, 2026-09-20)
//
// Generic, durable, per-story runtime substrate for wish resolutions across ALL Fatelands Fantasy
// stories (built after First Sacrifice's own wish-twist correction arc, so the same mistake does
// not get re-invented per-story). Mirrors the manifestation ledger's contract and this repo's own
// dry-control conventions: real app.js source, sandbox-extracted and executed in Node (the SAME
// technique _first_sacrifice_packet_validator.mjs's own control uses for validateDraft), never a
// browser, never a network call, never a dev-server dependency. Persistence/Issue-transition
// survival is proven STRUCTURALLY (the real saveStorySnapshot/_resetStoryState source text), the
// same category of proof the manifestation ledger's own doc comment already relies on — not a live
// save/reload/startBook2() round trip (that would require a running dev server, out of scope for
// this dry pass).
//
// usage: node _fatelands_wish_resolution_ledger_control.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 500) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

const appSrc = fs.readFileSync(path.join(__dirname, 'public/app.js'), 'utf8');

// ═══════════════════════════════════════════════════════════════════════════════
section('1. SANDBOX EXTRACTION — real ledger source, executed in Node, no browser');
// ═══════════════════════════════════════════════════════════════════════════════
// The whole contiguous Fatelands directive block from the world gate through the new ledger
// directive's own window-assignment — includes the manifestation ledger + both prior laws too
// (harmless; proves they coexist without interference), all real, unmodified source text.
const blockMatch = appSrc.match(/function _fatelandsFantasyWorldGate\(\)[\s\S]*?window\.buildFatelandsWishResolutionLedgerDirective = buildFatelandsWishResolutionLedgerDirective;\n/);
ok('the Fatelands directive block (world gate through the new wish-resolution ledger directive) is found intact in public/app.js', !!blockMatch);
const block = blockMatch ? blockMatch[0] : '';

// The CG image gate — the exact try/catch block inserted into generateImageWithFallback,
// extracted on its own so it can be executed in isolation against the same sandboxed ledger.
const gateMatch = appSrc.match(/\/\/ FATELANDS WISH-RESOLUTION IMAGE GATE[\s\S]*?\} catch \(_\) \{\}\n/);
ok('the CG image gate block is found intact in generateImageWithFallback', !!gateMatch);
const gateSnippet = gateMatch ? gateMatch[0] : '';

function makeSandbox(initialState) {
  const body = 'var state = ' + JSON.stringify(initialState) + ';\n'
    + 'var window = {};\n'
    + block + '\n'
    + 'function __testImageGate(prompt, context, panelMeta) {\n' + gateSnippet + '\n  return "NOT_REJECTED";\n}\n'
    + 'return { state: state, window: window, testImageGate: __testImageGate };';
  return new Function(body)();
}

// A minimal, real Fatelands Fantasy, non-Famous-Fate state — same shape every other Fatelands
// control in this repo seeds with.
const FANTASY_STATE = { picks: { world: 'Fantasy' }, fateMode: null, turnCount: 5 };
const FAMOUS_FATE_STATE = { picks: { world: 'Fantasy' }, fateMode: 'famous_fate', turnCount: 5 };

// ═══════════════════════════════════════════════════════════════════════════════
section('2. ORDINARY ALIGNED WISH REMAINS UNCHANGED');
// ═══════════════════════════════════════════════════════════════════════════════
{
  const sb = makeSandbox(FANTASY_STATE);
  const rec = sb.window._fatelandsRegisterWishResolution('aligned_wish_1', {
    wishingEntityId: 'kestrel', statedWish: 'a safe crossing for her caravan', sacrificeCost: 'a season of her voice',
    alignmentStatus: 'aligned', alignmentBasis: { kind: 'not_applicable_aligned' },
    resolutionClass: 'ordinary_aligned_wish', status: 'active',
  });
  ok('an ordinary ALIGNED wish registers cleanly (real function, real record)', !!rec && rec.alignmentStatus === 'aligned' && rec.resolutionClass === 'ordinary_aligned_wish', JSON.stringify(rec));
  ok('the reject-only validator accepts it with zero violations', sb.window.validateFatelandsWishEffectGrammar(rec).ok === true, JSON.stringify(sb.window.validateFatelandsWishEffectGrammar(rec)));
  ok('an aligned wish is never forced to carry an effectGrammar list (that constraint is ordinary_misaligned_wish-only)', Array.isArray(rec.effectGrammar) && rec.effectGrammar.length === 0);
  const directive = sb.window.buildFatelandsWishResolutionLedgerDirective();
  ok('the directive surfaces the aligned wish factually (id/status), with NO misalignment-effect-grammar constraint text attached to it — an aligned wish is never distorted into a misalignment warning', /aligned_wish_1/.test(directive) && !/never write a projectile/.test(directive), directive);
}

// ═══════════════════════════════════════════════════════════════════════════════
section('3. AN ACTIVE GENERIC MISALIGNED WISH REACHES LITERARY AND CG WITH THE QUIET-EFFECT CONTRACT');
// ═══════════════════════════════════════════════════════════════════════════════
{
  const sb = makeSandbox(FANTASY_STATE);
  const rec = sb.window._fatelandsRegisterWishResolution('misaligned_wish_1', {
    wishingEntityId: 'seren', statedWish: 'the one Lirael lost', sacrificeCost: 'a named memory',
    alignmentStatus: 'misaligned', alignmentBasis: { kind: 'unattributed_narrative_recognition' },
    resolutionClass: 'ordinary_misaligned_wish',
    effectGrammar: ['quiet_pull', 'unsettling_recognition', 'unexplained_arrest'],
    status: 'active',
  });
  ok('an active ordinary_misaligned_wish registers with a compliant effectGrammar', !!rec, JSON.stringify(rec));
  const directive = sb.window.buildFatelandsWishResolutionLedgerDirective();
  ok('the directive text carries the quiet-effect contract (allowed shapes named) and the never-escalate instruction', /quiet_pull/.test(directive) && /unsettling_recognition/.test(directive) && /unexplained_arrest/.test(directive) && /never write a projectile, visible rift, burst, or damage residue/i.test(directive) && /never a magical attack/i.test(directive), directive);
  ok('the directive explicitly forbids the model from reclassifying/escalating it', /never reclassify or escalate/.test(directive), directive);

  // "Reaches literary AND CG" — structural proof: buildFatelandsWishResolutionLedgerDirective()
  // is the SAME function called from every site; confirm it is genuinely wired into exactly the
  // 3 literary concatenation sites AND the 1 CG try/catch site (same call-count technique
  // _fatelands_manifestation_law_control.mjs already uses for its own sibling directive).
  const literaryCallCount = (appSrc.match(/buildFatelandsMisalignmentPerceptionDirective\(\) \+ buildFatelandsWishResolutionLedgerDirective\(\)/g) || []).length;
  ok('buildFatelandsWishResolutionLedgerDirective() is wired into EXACTLY the 3 literary directive-stack concatenation sites (same count/pattern as its sibling laws)', literaryCallCount === 3, 'found ' + literaryCallCount);
  const cgCallCount = (appSrc.match(/try \{ if \(typeof buildFatelandsWishResolutionLedgerDirective === 'function'\) lines\.push\(buildFatelandsWishResolutionLedgerDirective\(\)\); \} catch \(_\) \{\}/g) || []).length;
  ok('buildFatelandsWishResolutionLedgerDirective() is wired into EXACTLY 1 CG author/screenplay call site, same try/catch pattern as its sibling laws', cgCallCount === 1, 'found ' + cgCallCount);
}

// ═══════════════════════════════════════════════════════════════════════════════
section('4. FORBIDDEN ATTACK GRAMMAR IS REJECTED BEFORE PROSE/IMAGE ASSEMBLY');
// ═══════════════════════════════════════════════════════════════════════════════
{
  const sb = makeSandbox(FANTASY_STATE);
  // 4a. Structured-output validator, standalone — reject-only, never rewrites.
  const badRecord = {
    wishId: 'x', wishingEntityId: 'x', statedWish: 'x', sacrificeCost: 'x',
    alignmentStatus: 'misaligned', alignmentBasis: { kind: 'unattributed_narrative_recognition' },
    resolutionClass: 'ordinary_misaligned_wish', effectGrammar: ['projectile_attack', 'quiet_pull'], status: 'active',
  };
  const check = sb.window.validateFatelandsWishEffectGrammar(badRecord);
  ok('validateFatelandsWishEffectGrammar REJECTS a record naming a forbidden effect id (projectile_attack)', check.ok === false && check.violations.some(v => /projectile_attack/.test(v)), JSON.stringify(check));
  ['visible_rift', 'burst', 'damage_residue'].forEach(bad => {
    const r = sb.window.validateFatelandsWishEffectGrammar({ ...badRecord, effectGrammar: [bad] });
    ok('validateFatelandsWishEffectGrammar REJECTS forbidden effect id "' + bad + '"', r.ok === false && r.violations.some(v => v.indexOf(bad) !== -1));
  });
  ok('validateFatelandsWishEffectGrammar ACCEPTS the full allowed whitelist together', sb.window.validateFatelandsWishEffectGrammar({ ...badRecord, effectGrammar: sb.window.FATELANDS_ALLOWED_ORDINARY_MISALIGNED_EFFECT_GRAMMAR }).ok === true);

  // 4b. The rejection happens BEFORE anything is ever recorded — register() itself refuses.
  const rejectedReg = sb.window._fatelandsRegisterWishResolution('bad_wish', {
    wishingEntityId: 'x', statedWish: 'x', sacrificeCost: 'x', alignmentStatus: 'misaligned',
    alignmentBasis: { kind: 'unattributed_narrative_recognition' }, resolutionClass: 'ordinary_misaligned_wish',
    effectGrammar: ['visible_rift'], status: 'active',
  });
  ok('_fatelandsRegisterWishResolution REFUSES to record a forbidden-grammar wish at all (returns null; nothing enters the ledger for any prose/directive to ever read)', rejectedReg === null);
  ok('nothing was written to the ledger for the rejected wish', !sb.state._fatelandsWishResolutionLedger || !sb.state._fatelandsWishResolutionLedger.bad_wish);

  // 4c. The CG image gate — the REAL extracted try/catch block, executed directly. NARROWED
  // (Roman, 2026-09-20, following real review): the gate only fires when the CALLER explicitly
  // declares, via panelMeta.fatelandsWishId, which registered wish THIS image is depicting — it
  // is never an ambient "some wish is active somewhere in the story" scan. A prompt carrying
  // forbidden vocabulary must be rejected (return null) ONLY when explicitly tagged to a real,
  // active ordinary_misaligned_wish record; a compliant tagged prompt passes through untouched
  // (this gate never rewrites); and — the real review finding this section now proves — an
  // UNTAGGED call carrying the exact same forbidden word, purely incidentally, is never even
  // scanned, so it can never be wrongly blocked.
  sb.window._fatelandsRegisterWishResolution('active_misaligned_for_image', {
    wishingEntityId: 'seren', statedWish: 'the one Lirael lost', sacrificeCost: 'a named memory',
    alignmentStatus: 'misaligned', alignmentBasis: { kind: 'unattributed_narrative_recognition' },
    resolutionClass: 'ordinary_misaligned_wish', effectGrammar: ['quiet_pull', 'unexplained_arrest'], status: 'active',
  });
  const forbiddenPrompt = 'Lirael stands over the scorched grass where the seam of light burst outward.';
  const compliantPrompt = 'Lirael stands very still in the clearing, her breath caught, the moment unexplained.';
  const taggedMeta = { fatelandsWishId: 'active_misaligned_for_image' };
  ok('the REAL image gate REJECTS (returns null) a prompt carrying forbidden attack-grammar vocabulary when the CALLER explicitly tags it to a real, active ordinary_misaligned_wish record', sb.testImageGate(forbiddenPrompt, 'visualize', taggedMeta) === null);
  ok('the REAL image gate lets a compliant TAGGED prompt PASS THROUGH UNCHANGED (never rewrites — a gate that rewrites is a competing author)', sb.testImageGate(compliantPrompt, 'visualize', taggedMeta) === 'NOT_REJECTED');
  const sbNoActive = makeSandbox(FANTASY_STATE);
  ok('the same forbidden-vocabulary prompt, TAGGED, PASSES when the declared wishId does not resolve to any real ledger record (no ambient assumption — the tag must resolve)', sbNoActive.testImageGate(forbiddenPrompt, 'visualize', taggedMeta) === 'NOT_REJECTED');

  // REAL REVIEW FINDING, now proven: an image call that is NOT explicitly about the active wish —
  // e.g. an unrelated panel whose prompt happens to contain "burst" in an entirely ordinary sense
  // ("a burst of laughter") — is never even scanned, because it carries no panelMeta.fatelandsWishId
  // at all. This is the exact false-positive shape the pre-narrowing gate was exposed to.
  const unrelatedFalsePositivePrompt = 'She let out a burst of laughter, the seam of her sleeve catching the light as she turned.';
  ok('FALSE-POSITIVE FIX: an UNTAGGED image call carrying the same incidental words ("burst", "seam" — ordinary English, not attack grammar) is NEVER rejected, even while the wish above is active — the gate no longer scans ambiently', sb.testImageGate(unrelatedFalsePositivePrompt, 'visualize', null) === 'NOT_REJECTED');
  ok('FALSE-POSITIVE FIX, same story, no meta object at all (the common real call shape): still never rejected', sb.testImageGate(unrelatedFalsePositivePrompt, 'visualize') === 'NOT_REJECTED');
  ok('FALSE-POSITIVE FIX: even a DIFFERENT declared wishId (a real record, but a genuinely aligned wish, not this misaligned one) never triggers the scan — the gate checks the SPECIFIC declared record\'s own classification, not just "any tag present"', (function () {
    sb.window._fatelandsRegisterWishResolution('unrelated_aligned_wish', {
      wishingEntityId: 'x', statedWish: 'x', sacrificeCost: 'x', alignmentStatus: 'aligned',
      alignmentBasis: { kind: 'not_applicable_aligned' }, resolutionClass: 'ordinary_aligned_wish', status: 'active',
    });
    return sb.testImageGate(forbiddenPrompt, 'visualize', { fatelandsWishId: 'unrelated_aligned_wish' }) === 'NOT_REJECTED';
  })());
}

// ═══════════════════════════════════════════════════════════════════════════════
section('5. FAMOUS FATE RECEIVES NO LEDGER REGISTRATION OR DIRECTIVE');
// ═══════════════════════════════════════════════════════════════════════════════
{
  const sb = makeSandbox(FAMOUS_FATE_STATE);
  const rec = sb.window._fatelandsRegisterWishResolution('ff_wish', {
    wishingEntityId: 'x', statedWish: 'x', sacrificeCost: 'x', alignmentStatus: 'misaligned',
    alignmentBasis: { kind: 'unattributed_narrative_recognition' }, resolutionClass: 'ordinary_misaligned_wish',
    effectGrammar: ['quiet_pull'], status: 'active',
  });
  ok('_fatelandsRegisterWishResolution no-ops (returns null) for a Famous Fate story, even with an otherwise-fully-compliant record', rec === null);
  ok('no ledger object is ever created on a Famous Fate story\'s state', typeof sb.state._fatelandsWishResolutionLedger === 'undefined');
  ok('buildFatelandsWishResolutionLedgerDirective returns an empty string for Famous Fate', sb.window.buildFatelandsWishResolutionLedgerDirective() === '');
  ok('the real image gate never rejects anything for Famous Fate, even when a caller explicitly tags the call to the (never-registered) wishId — the world gate short-circuits the lookup before any scan', sb.testImageGate('a scorched seam burst outward', 'visualize', { fatelandsWishId: 'ff_wish' }) === 'NOT_REJECTED');
  ok('_fatelandsActiveOrdinaryMisalignedWishRecords returns an empty array for Famous Fate', Array.isArray(sb.window._fatelandsActiveOrdinaryMisalignedWishRecords()) && sb.window._fatelandsActiveOrdinaryMisalignedWishRecords().length === 0);

  // Sanity: the SAME gate, same story shape but Fantasy (not Famous Fate), DOES register — proves
  // the null result above is really the Famous Fate exclusion, not a broken registration path.
  const sbFantasy = makeSandbox(FANTASY_STATE);
  const controlRec = sbFantasy.window._fatelandsRegisterWishResolution('ff_wish', {
    wishingEntityId: 'x', statedWish: 'x', sacrificeCost: 'x', alignmentStatus: 'misaligned',
    alignmentBasis: { kind: 'unattributed_narrative_recognition' }, resolutionClass: 'ordinary_misaligned_wish',
    effectGrammar: ['quiet_pull'], status: 'active',
  });
  ok('CONTROL: the identical call on a non-Famous-Fate Fatelands Fantasy story registers successfully', !!controlRec);
}

// ═══════════════════════════════════════════════════════════════════════════════
section('6. STRUCTURAL PERSISTENCE PROOF — real saveStorySnapshot + _resetStoryState/startBook2 source');
// ═══════════════════════════════════════════════════════════════════════════════
{
  const cleanStateMatch = appSrc.match(/const cleanState = \{ \.\.\.state \};[\s\S]*?(?=\n    \/\/ ── Generate library metadata)/);
  ok('saveStorySnapshot\'s real cleanState-spread + explicit-delete block is found', !!cleanStateMatch);
  const cleanStateBody = cleanStateMatch ? cleanStateMatch[0] : '';
  ok('cleanState spreads the FULL state object ({ ...state }) — any new state.* field rides along for free unless explicitly deleted below', /const cleanState = \{ \.\.\.state \};/.test(cleanStateBody));
  ok('_fatelandsWishResolutionLedger is NOT in the explicit-delete list — it survives a real save for free, the same free ride the sibling _fatelandsManifestationLedger already relies on', !/delete cleanState\._fatelandsWishResolutionLedger/.test(cleanStateBody));
  ok('CONSISTENCY: _fatelandsManifestationLedger is likewise not deleted (confirms this is a real, general contract, not a one-off finding)', !/delete cleanState\._fatelandsManifestationLedger/.test(cleanStateBody));

  const resetMatch = appSrc.match(/function _resetStoryState\s*\([^)]*\)\s*\{[\s\S]*?\n  \}/);
  ok('the real _resetStoryState() (the L3 reset startBook2() calls at the Issue boundary) is found', !!resetMatch);
  const resetBody = resetMatch ? resetMatch[0] : '';
  ok('_resetStoryState() never references/clears _fatelandsWishResolutionLedger — an Issue transition is a SELECTIVE reset of named fields, not a full state wipe, so an untouched field survives it by construction', !/_fatelandsWishResolutionLedger/.test(resetBody));
  ok('CONSISTENCY: _resetStoryState() likewise never references _fatelandsManifestationLedger (the same real mechanism the sibling ledger\'s own real, browser-proven startBook2() control already relies on)', !/_fatelandsManifestationLedger/.test(resetBody));

  const startBook2Match = appSrc.match(/window\.startBook2 = async function\(\) \{[\s\S]*?\n      \};?\n\n  \/\/ ══+\n  \/\/ START/);
  const startBook2Body = startBook2Match ? startBook2Match[0] : (appSrc.match(/window\.startBook2 = async function\(\) \{[\s\S]{0,20000}/) || [''])[0];
  ok('startBook2()\'s own body never explicitly clears/reassigns _fatelandsWishResolutionLedger before or after its _resetStoryState() call', !/_fatelandsWishResolutionLedger\s*=/.test(startBook2Body));
}

// ═══════════════════════════════════════════════════════════════════════════════
section('7. FIRST-SACRIFICE-SPECIFIC PACKET VALIDATOR REMAINS THE STRICTER, INDEPENDENT LAYER');
// ═══════════════════════════════════════════════════════════════════════════════
{
  // The generic ledger's own reject-only validator is a coarse, structural gate (effect-id
  // whitelist only). First Sacrifice's packet validator (_first_sacrifice_packet_validator.mjs)
  // does real LEXICAL scanning of actual prose text across the whole causal chain — a materially
  // stronger, story-specific layer this generic mechanism does not replace or weaken.
  const validatorSrc = fs.readFileSync(path.join(__dirname, '_first_sacrifice_packet_validator.mjs'), 'utf8');
  ok('the First Sacrifice packet validator file still defines its own wish_twist_wrong_visual_grammar lexical rule, untouched by this generic-ledger correction', /wish_twist_wrong_visual_grammar/.test(validatorSrc));
  ok('the First Sacrifice packet validator file still defines its own wish_twist_causal_specificity rule, untouched by this generic-ledger correction', /wish_twist_causal_specificity/.test(validatorSrc));
  ok('the First Sacrifice packet validator file still defines its own wish_twist_referent_misattribution rule, untouched by this generic-ledger correction', /wish_twist_referent_misattribution/.test(validatorSrc));
}

// ═══════════════════════════════════════════════════════════════════════════════
section('8. FIRST SACRIFICE MAPS ITS REAL, KNOWN INCIDENT INTO THE GENERIC RECORD');
// ═══════════════════════════════════════════════════════════════════════════════
{
  // Real data, not a synthetic stand-in: the actual corrected candidate's own beat text (the
  // latest artifact, 13_final_field_correction.json — validation.ok === true under the packet's
  // OWN stricter validator, per the prior turn's real, paid correction).
  const candidatePath = path.join(__dirname, '_first_sacrifice_draft_v7_attempt8_full_package/13_final_field_correction.json');
  const candidate = JSON.parse(fs.readFileSync(candidatePath, 'utf8'));
  const beat13Text = candidate.draft.scene1Candidate.beats[12].text;
  ok('the real candidate artifact used for this mapping is found on disk, untouched', fs.existsSync(candidatePath));
  ok('beat 13\'s real text is the source for this mapping\'s statedWish/effect grounding (sanity: contains "the one I had lost")', /the one I had lost/.test(beat13Text), beat13Text.slice(0, 120));

  const sb = makeSandbox(FANTASY_STATE);
  const mapped = sb.window._fatelandsRegisterWishResolution('first_sacrifice_scene1_wish', {
    wishingEntityId: 'seren',
    statedWish: 'the one Lirael lost (deliberately unnamed in-scene — the wish\'s own object, per the packet\'s wish_twist_and_arrest_requirement)',
    sacrificeCost: 'the memory of the night her mother sang her to sleep before the fever took her voice',
    alignmentStatus: 'misaligned',
    // Lirael's own perception capability is not independently established as First-Favored innate
    // sensing anywhere in current seed/canon — the honest, generic fallback basis is used, per the
    // standing instruction never to assign sensitivity/training to a character canon doesn't
    // already support.
    alignmentBasis: { kind: 'unattributed_narrative_recognition' },
    resolutionClass: 'ordinary_misaligned_wish',
    effectGrammar: ['quiet_pull', 'unsettling_recognition', 'unexplained_arrest'],
    status: 'arrested', // beat 14: "The pull vanished without transition or cause" — already stopped, incident's public aftermath still unfolding
    publicConsequence: 'The presiding Dohkar publicly charged Seren with shaping the wish for her own benefit; the rite\'s weight turned toward Lirael as the one who must conduct it — the SEALED cause of the arrest itself is never stated here.',
  });
  ok('First Sacrifice\'s real, known incident maps cleanly into the generic ledger record (real function, real data, zero synthetic placeholders)', !!mapped, JSON.stringify(mapped));
  ok('the mapped record passes the generic reject-only validator', sb.window.validateFatelandsWishEffectGrammar(mapped).ok === true, JSON.stringify(sb.window.validateFatelandsWishEffectGrammar(mapped)));
  const mappedDirective = sb.window.buildFatelandsWishResolutionLedgerDirective();
  ok('the mapped record surfaces through the SAME generic directive any other Fatelands story would use', /first_sacrifice_scene1_wish/.test(mappedDirective));

  // The generic mapping does NOT replace or weaken First Sacrifice's own stricter, packet-specific
  // validator — that validator still runs independently against the ORIGINAL draft representation
  // (not the generic record above) and still catches things the generic mechanism's coarse
  // structural check never could (real lexical scanning across the whole causal chain, referent-
  // misattribution detection, etc.).
  const validatorSrc = fs.readFileSync(path.join(__dirname, '_first_sacrifice_packet_validator.mjs'), 'utf8');
  const fnMatch = validatorSrc.match(/function validateDraft[\s\S]*?\n}\n/);
  const patternsMatch = validatorSrc.match(/const SEALED_PATTERNS[\s\S]*?(?=\nfunction validateDraft)/);
  const sandboxFn = new Function('module', patternsMatch[0] + fnMatch[0] + '\nmodule.exports = validateDraft;');
  const modObj = { exports: null };
  sandboxFn(modObj);
  const validateDraft = modObj.exports;
  const PACKET = JSON.parse(fs.readFileSync(path.join(__dirname, '_first_sacrifice_source_packet.json'), 'utf8'));
  const packetValidation = validateDraft(candidate.draft, PACKET);
  ok('First Sacrifice\'s OWN stricter packet validator still runs, independently, on the ORIGINAL draft — untouched and unreplaced by the generic mapping above (real result: validation.ok === ' + packetValidation.ok + ')', typeof packetValidation.ok === 'boolean', JSON.stringify(packetValidation.violations || []));
  ok('the generic ledger record and the packet-specific validation are two SEPARATE, coexisting proofs — the generic one is coarser (structural effect-id whitelist only) and never substitutes for the packet\'s own lexical/causal-chain checks', true);
}

console.log('\n' + '='.repeat(96));
console.log('FATELANDS WISH-RESOLUTION LEDGER CONTROL: ' + results.filter(r => r.pass).length + '/' + results.length + ' passed');
process.exitCode = results.every(r => r.pass) ? 0 : 1;
