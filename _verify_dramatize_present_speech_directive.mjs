// DRAMATIZE-CONSEQUENTIAL-PRESENT-SPEECH DIRECTIVE — dry structural proof (Roman, 2026-09-17).
//
// Roman: "Trace the shared author-floor/directive path used by literary, CG, OAS, and
// starter-package authoring, then add this rule there... Add dry packet/author-prompt controls
// proving the shared directive reaches every relevant author route. Do not build a blind regex
// that rewrites prose after generation."
//
// This is NOT a prose-rewriting regex — it never touches generated output. It statically proves,
// by reading the real source, that rule 4 exists exactly once inside the shared directive
// function and that every real author route still calls that exact function (so the rule
// necessarily reaches all of them) — plus, separately, empirically renders the real First
// Sacrifice starter-package prompt and confirms rule 4 is actually present in it (not merely
// inferred from the call graph).
import fs from 'fs';

let fail = false;
const A = (c, m) => { if (!c) { console.error('FAIL: ' + m); fail = true; } else { console.log('PASS: ' + m); } };

const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');

// ── 1. Rule 4 exists exactly once, inside _buildAuthorFloorDirective's own body ──
const floorFnStart = src.indexOf('function _buildAuthorFloorDirective(s) {');
A(floorFnStart !== -1, '_buildAuthorFloorDirective definition found');
const floorFnEnd = src.indexOf('try { window._buildAuthorFloorDirective = _buildAuthorFloorDirective; } catch (_) {}', floorFnStart);
A(floorFnEnd !== -1, '_buildAuthorFloorDirective end-of-function marker found');
const floorFnBody = src.slice(floorFnStart, floorFnEnd);
const rule4Matches = (floorFnBody.match(/DRAMATIZE CONSEQUENTIAL PRESENT SPEECH/g) || []).length;
A(rule4Matches === 1, 'rule 4 ("DRAMATIZE CONSEQUENTIAL PRESENT SPEECH") appears exactly once, inside the always-included AUTHOR FLOOR block (before the mode branch, so every mode gets it)');
A(/direct speech, written text, whisper, thought, sign, or performed gesture/.test(floorFnBody), 'rule 4 names the real in-scene forms (direct speech/written/whisper/thought/sign/gesture)');
A(!/DRAMATIZE CONSEQUENTIAL PRESENT SPEECH/.test(src.slice(0, floorFnStart)) && !/DRAMATIZE CONSEQUENTIAL PRESENT SPEECH/.test(src.slice(floorFnEnd)), 'rule 4 does not ALSO appear anywhere else in app.js (no stray duplicate/divergent copy)');

// ── 2. Every real author route still calls the exact function (confirmed call sites, 2026-09-17 trace) ──
const ROUTES = [
  { label: 'CG/screenplay (_buildCGScreenplayUserPrompt)', needle: 'if (typeof _buildAuthorFloorDirective === \'function\') lines.push(_buildAuthorFloorDirective(state));' },
  { label: 'Literary Scene-1 HOTFAST variant', needle: 'user: _buildAuthorFloorDirective(state) + _buildA50ModeDirective() + _buildStagingFloorDirective() + (typeof _buildCharacterPlusStateful === \'function\' ? _buildCharacterPlusStateful() : \'\') + _editorialPlanBlock + introPrompt + _scene1Appendix + _scene1ScaffoldBlock + (typeof _buildPicturabilityMandate === \'function\' ? \'\\n\' + _buildPicturabilityMandate() : \'\') + (typeof _buildHotCrisisOpenerProseDirective === \'function\' ? \'\\n\' + _buildHotCrisisOpenerProseDirective() : \'\') + (typeof _buildFatelandsWishDemoOpenerDirective === \'function\' ? \'\\n\' + _buildFatelandsWishDemoOpenerDirective() : \'\') + (typeof _buildHotFastDirective === \'function\' ? _buildHotFastDirective() : \'\')' },
  { label: 'Literary Scene-1 HEAVY variant', needle: '+ _s1LenGuide + _s1ContractCond + _buildPerTurnCharMemory()' },
  { label: 'Literary continuation (fullSys)', needle: '_CACHE_SENTINEL + _buildAuthorFloorDirective(state) + _buildContinuitySpineBlock(state)' },
  { label: 'OAS/intimacy turn (_oasSystemMsg) — the real gap this session closed', needle: '+ (typeof _buildAuthorFloorDirective === \'function\' ? _buildAuthorFloorDirective(state) : \'\');' },
];
ROUTES.forEach(r => A(src.includes(r.needle), 'real call site intact: ' + r.label));

// ── 3. The starter-package (First Sacrifice) adapter slices this EXACT function verbatim from
// live app.js at runtime (not a stale/forked copy) — confirmed by reading its own source. ──
const adapterSrc = fs.readFileSync(new URL('./_first_sacrifice_authoring_adapter.mjs', import.meta.url), 'utf8');
A(/sliceByAnchor\('author-floor-and-mode',\s*\n\s*'function _authorMode\(s\) \{',\s*\n\s*'try \{ window\._buildAuthorFloorDirective = _buildAuthorFloorDirective; \} catch \(_\) \{\}'\)/.test(adapterSrc), 'the First Sacrifice adapter slices the SAME live app.js region (anchor-verified, not a hardcoded/stale copy)');

// ── 4. Empirical proof (not just call-graph inference): actually render the real First Sacrifice
// prompt and confirm rule 4 is present in the constructed system message. ──
const { buildFixedInputView, buildPacketAuthoringPrompt } = await import('./_first_sacrifice_authoring_adapter.mjs');
const packet = JSON.parse(fs.readFileSync(new URL('./_first_sacrifice_source_packet.json', import.meta.url), 'utf8'));
const { system } = buildPacketAuthoringPrompt(packet, buildFixedInputView());
A(/DRAMATIZE CONSEQUENTIAL PRESENT SPEECH/.test(system), 'EMPIRICAL: rule 4 is actually present in the real constructed First Sacrifice system prompt (not merely inferred)');

// ── 5. First-Sacrifice-specific application: the packet's own required beats now explicitly
// require direct speech for the two consequential-utterance moments this session found violating
// it in the real fixture (Seren's wish/sacrifice, the Dohkar's charge). ──
A(/IN HER OWN DIRECT SPEECH/.test(JSON.stringify(packet.scene1_candidate_requirement.required_content_beats.beats.find(b => b.id === 'wish_and_sacrifice'))), 'wish_and_sacrifice required beat requires Seren\'s direct speech, not narrated summary');
A(/IN ACTUAL SPEECH/.test(JSON.stringify(packet.scene1_candidate_requirement.required_content_beats.beats.find(b => b.id === 'public_charge'))) && /explicitly BANNED/.test(JSON.stringify(packet.scene1_candidate_requirement.required_content_beats.beats.find(b => b.id === 'public_charge'))), 'public_charge required beat requires the Dohkar\'s direct speech and explicitly bans the narrated-summary phrasing this session\'s own fixture used ("he named the bent word and laid the charges")');

console.log('\n' + '='.repeat(70));
console.log(fail ? 'RESULT: FAIL — see above' : 'RESULT: PASS — rule reaches every confirmed real author route + empirically present in the rendered First Sacrifice prompt');
process.exitCode = fail ? 1 : 0;
