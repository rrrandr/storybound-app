// ── EVIDENCE-HANDLING CORRECTIONS, VERIFIED OFFLINE ($0) ─────────────────────────────────────
// Verifies the four bounded corrections against (A) the SAVED PAID judge reply, and (B) synthetic
// verdicts that answer the new contract, so the facet and occurrence paths are exercised too.
//
// WHAT THIS DOES NOT ESTABLISH: that a real judge answers the new contract correctly. Every
// verdict here is either the one saved paid reply or hand-written. Semantic accuracy is untested.
//
// TWO POSITIVE CONTROLS ARE MANDATORY and are asserted to PASS, because the withdrawn proposals
// would have failed them:
//   P1  one sentence carrying responder + recipient + response + interpretation  → must be FULFILLED
//   P2  a modal clause reporting a reaction that really happened                 → must be FULFILLED
import fs from 'fs';
import vm from 'node:vm';

const ROOT = '/Users/romantsukerman/storybound-app';
vm.runInThisContext(fs.readFileSync(ROOT + '/public/essential-beat-check.js', 'utf8'));
const EBC = globalThis.EssentialBeatCheck;

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS  ' + m); } else { fail++; console.log('  FAIL  ' + m); } };
const head = (s) => console.log('\n' + s + '\n' + '─'.repeat(Math.min(s.length, 78)));

// ══ THE SAVED DRAFT AND THE SAVED PAID REPLY ════════════════════════════════════════════════
const RAW = fs.readFileSync(ROOT + '/_ab_writing_out/two_author_2026-10-14T21-51-40-390Z/haiku_scene.txt', 'utf8');
const DRAFT = EBC.readerFacing(RAW);
const PAID_DIR = ROOT + '/_ab_writing_out/cplus_repair_2026-10-15T20-36-36-213Z';
const PAID_VERDICTS = JSON.parse(fs.readFileSync(PAID_DIR + '/judge_verdicts.json', 'utf8'));

// The obligations, through the production builder — the same construction the live test now uses.
const SKEL = {
  character_plus: [
    { character: 'Seren', first_mention: true, coverage: { kind: 'introduction' },
      facet_truth: 'Her compassion is genuine but requires an audience.',
      behavior: 'Seren kneels, fractures mid-phrase, and speaks a wish that is not the one they rehearsed.',
      pc_interpretation: 'Seren is kind, but her kindness requires an audience to feel true—she spent '
        + 'her binding wish on Lirael because the room is watching.' },
    { character: 'the presiding Dohkar', first_mention: true, coverage: { kind: 'introduction' },
      facet_truth: 'In questions of sacrifice he assumes an authority others have not earned.',
      behavior: 'He perceives the misalignment before the assembly registers it.',
      pc_interpretation: 'He believes his ear is the final measure and will not wait for Lirael to rule.' },
    { character: 'Julian', isLI: true, first_mention: true, coverage: { kind: 'introduction' },
      behavior: 'Another person responds to Julian and Lirael reads it.',
      // No prescribed emotional conclusion — grounded context only. The field previously carried
      // a test-authored feeling ("She distrusts the deference he draws without office"), which
      // both live repairs returned almost verbatim.
      pc_interpretation: null,
      pc_viewpoint_context: [
        'She is the supervising Sacrificiant, sealed and silenced by the gossamer band.',
        'She is trained to read alignment at this distance.',
        'She alone knows where Seren\'s wording came from.'],
      pc_interpretation_note: 'Do not write toward a predetermined feeling.',
      sealed: true, facet_truth: 'his concealed wish at the rite',
      social_proof_opportunities: [{ condition: 'a peer the assembly defers to in his presence' }] }
  ],
  pc_opening_fusion: {
    character: 'Lirael',
    beat: 'I pressed my palms flat against the gossamer band, grounding myself the way I always did.',
    reveals: 'A specific, non-obvious truth about her, read as her archetype reads.',
    through: 'the gossamer band' }
};
const CPLUS = EBC.characterPlusBeats(SKEL, { liName: 'Julian' });
const PLOT = [
  { id: 'plot:band', kind: 'essential', essential: true, evidenceKind: 'on_page_action',
    description: 'Lirael tears the gossamer mouth-band away and moves toward Seren.' },
  { id: 'plot:closing', kind: 'essential', essential: true, evidenceKind: 'on_page_action',
    region: 'closing', description: 'The scene ends on a forced decision that is still open.' }
];
const BEATS = CPLUS.concat(PLOT);
const ROSTER = [{ label: 'Lirael', kind: 'pc' }, { label: 'Seren' }, { label: 'Julian' },
                { label: 'the presiding Dohkar' }];
const evalWith = (draft, beats, verdicts) =>
  EBC.evaluate({ draft, alreadyExtracted: true, beats, verdicts, roster: ROSTER });

// ══ A — THE OBLIGATIONS THE BUILDER PRODUCES ════════════════════════════════════════════════
head('A — CONSTRUCTED THROUGH THE PRODUCTION BUILDER (correction 1)');
const ids = BEATS.map((b) => b.id);
console.log('  beats: ' + ids.join(', '));
ok(ids.length === 6, 'six obligations (4 Character+ incl. the PC, plus 2 plot) — ' + ids.length);
ok(CPLUS.length === 4, 'four Character+ obligations, where the previous run evaluated three — ' + CPLUS.length);
ok(ids.indexOf('cplus:lirael') !== -1, "the PC's obligation is present (cplus:lirael)");
const lir = BEATS.find((b) => b.id === 'cplus:lirael');
ok(lir && lir.isPC === true, 'the PC beat is marked isPC');
ok(lir && lir.fromFusion === true, 'it came from pc_opening_fusion, which the builder now reads');
ok(lir && !!lir.assignedFacet, 'the PC beat carries an assigned facet');
const jul = BEATS.find((b) => b.id === 'cplus:julian');
ok(jul && jul.evidenceKind === 'social_proof_with_pc_interpretation',
  'Julian takes the SOCIAL-PROOF rule, not the default — evidenceKind=' + (jul && jul.evidenceKind));
ok(jul && jul.disclosure && jul.disclosure.sealed === true, "Julian's sealed truth stays sealed");
const ser = BEATS.find((b) => b.id === 'cplus:seren');
ok(ser && /requires an audience/.test(ser.assignedFacet || ''),
  "Seren's assigned facet is the audience-dependence truth the request named");

head('A2 — THE JUDGE CONTRACT IS GENERATED FROM THOSE BEATS');
const contract = EBC.judgeContract(BEATS);
ok(contract.requires.socialProof.indexOf('cplus:julian') !== -1, 'Julian is listed as owing social proof');
ok(contract.requires.occurrence.length === 6, 'all six beats owe an occurrence answer — ' + contract.requires.occurrence.length);
// THREE, not four: Julian's facet is SEALED with no separately authored permitted depiction, so
// he owes NO delivery requirement. Deriving one from his private truth produced a request that
// demanded and forbade the same sentence in a live call.
ok(contract.requires.assignedFacet.length === 3,
  'only the three UNSEALED Character+ beats owe a facet answer — ' + contract.requires.assignedFacet.length);
ok(contract.requires.assignedFacet.indexOf('cplus:julian') === -1,
  'the sealed beat is not among them');
{
  const j = BEATS.find((x) => x.id === 'cplus:julian');
  ok(j.assignedFacet === null, 'the sealed beat carries NO assignedFacet');
  ok(/SEALED and no permitted on-page depiction/.test(j.assignedFacetAbsentBecause || ''),
    'and says why it is absent rather than leaving it unexplained');
  ok(j.disclosure.sealed === true && !!j.disclosure.sealedTruth,
    'while its disclosure restriction is unchanged');
  // An unsealed facet keeps the ordinary fallback.
  const plain = EBC.characterPlusBeats({ character_plus: [{ character: 'Seren',
    first_mention: true, facet_truth: 'Her compassion requires an audience.' }] }, {})[0];
  ok(plain.assignedFacet === 'Her compassion requires an audience.',
    'an UNSEALED facet still falls back to its truth — ordinary checks preserved');
  // A sealed facet WITH an authored permitted depiction keeps that depiction as the deliverable.
  const sealedWithPermitted = EBC.characterPlusBeats({ character_plus: [{ character: 'Julian',
    first_mention: true, sealed: true, facet_truth: 'his concealed wish',
    pc_interpretation: 'She reads the room reaching for him.' }] }, {})[0];
  ok(sealedWithPermitted.assignedFacet === 'She reads the room reaching for him.',
    'a sealed facet WITH a permitted depiction uses that depiction, not the secret');
  ok(sealedWithPermitted.assignedFacet.indexOf('concealed wish') === -1,
    'and the secret never becomes the deliverable');
}
ok(/responder/.test(contract.text) && /recipient/.test(contract.text)
  && /"response"/.test(contract.text) && /interpretation/.test(contract.text),
  'the contract names all four social-proof components');
ok(/BEING NAMED IN A LIST IS NOT A RESPONSE/.test(contract.text),
  'the contract rules out crediting a mention in a list');
ok(/Quotations MAY overlap/.test(contract.text), 'the contract states overlap is permitted');

// ══ B — THE SAVED PAID REPLY, REPLAYED ══════════════════════════════════════════════════════
head('B — REPLAY OF THE SAVED PAID REPLY (correction 2, on real data)');
const evPaid = evalWith(DRAFT, BEATS, PAID_VERDICTS);
evPaid.findings.forEach((f) => console.log('  ' + f.id.padEnd(30) + f.status
  + (f.evidenceProblems ? '  [' + f.evidenceProblems.map((p) => p.code).join(',') + ']' : '')));
const g = (id) => evPaid.byId[id];
ok(g('plot:band').status === 'unverified',
  'plot:band is no longer FULFILLED — it is ' + g('plot:band').status);
ok(!g('plot:band').material,
  'and it is NOT recorded as a story defect: an unevidenced verdict is a judge failure');
ok(g('cplus:julian').status === 'unverified',
  'cplus:julian is no longer FULFILLED — it is ' + g('cplus:julian').status);
const elided = evPaid.findings.filter((f) => (f.evidenceProblems || [])
  .some((p) => p.code === EBC.EVIDENCE_PROBLEM.ELIDED));
console.log('  elided composites caught: ' + elided.map((f) => f.id).join(', '));
ok(elided.length === 2, 'both elided "..." consequence passages are caught — ' + elided.length);
ok(elided.every((f) => f.evidenceProblems.some((p) => /supply each excerpt separately/.test(p.remedy || ''))),
  'each elision carries the remedy: supply the excerpts separately');
ok(evPaid.findings.every((f) => f.status !== 'fulfilled'),
  'nothing in the saved reply passes the corrected contract');
ok(evPaid.findings.every((f) => f.status === 'unverified'),
  'and every failure is UNVERIFIED — the replay asserts no story defect at all');
ok(evPaid.byId['cplus:lirael'].reasons.some((r) => /no verdict returned/.test(r)),
  "the PC beat reports that the paid judge was never asked about her");

// ══ C — POSITIVE CONTROLS. THESE MUST PASS. ═════════════════════════════════════════════════
head('C — POSITIVE CONTROLS (the withdrawn proposals would have failed these)');
const P_DRAFT = 'The hall thinned as the Dohkars filed out.\n\n'
  + 'I could hear the courtiers fall silent when Julian approached, and I resented how little the '
  + 'silence seemed to cost him.\n\n'
  + 'He said nothing about it, which was its own kind of answer.';
const ONE = 'I could hear the courtiers fall silent when Julian approached, and I resented how little '
  + 'the silence seemed to cost him.';
const P_BEATS = [BEATS.find((b) => b.id === 'cplus:julian')];
const sameSentence = [{
  id: 'cplus:julian', status: 'fulfilled', occurrence: 'performed',
  occurrenceEvidence: 'The courtiers go silent as he approaches; the silence is reported as having happened.',
  actionPassage: ONE, consequencePassage: ONE,
  characterPlusLanded: true, assignedFacetDelivered: true, facetQuote: ONE,
  socialProof: {
    responder:      { named: 'the courtiers', quote: ONE },
    recipient:      { named: 'Julian',        quote: ONE },
    response:       { named: 'they fall silent as he approaches', quote: ONE },
    interpretation: { named: 'she resents how little it costs him', quote: ONE } },
  note: 'All four components occupy one sentence.' }];
const evP1 = evalWith(P_DRAFT, P_BEATS, sameSentence);
const p1 = evP1.byId['cplus:julian'];
console.log('  P1 status: ' + p1.status + '  overlaps: ' + (p1.socialProof.overlaps || []).join(', '));
ok(p1.status === 'fulfilled',
  'P1 — ONE SENTENCE carrying all four components is FULFILLED (the substring prohibition is withdrawn)');
ok(p1.socialProof.overlaps.length === 6, 'all six component pairs are recorded as overlapping, penalty-free');
ok(!p1.material, 'P1 produces no material failure');
ok(p1.occurrenceAdvisory && /NOT a defect by itself/.test(p1.occurrenceAdvisory),
  'P2 — the modal clause ("I could hear...") is recorded as ADVISORY and did not change the status');
ok(p1.occurrence === 'performed', 'P2 — the judge\'s "performed" answer stands against a modal citation');

head('C2 — MULTIPLE GENUINE EXCERPTS, SUPPLIED SEPARATELY');
const TWO = ['I could hear the courtiers fall silent when Julian approached',
             'He said nothing about it, which was its own kind of answer.'];
const asList = JSON.parse(JSON.stringify(sameSentence));
asList[0].consequencePassage = TWO;
asList[0].socialProof.interpretation.quote = TWO;
const evP2 = evalWith(P_DRAFT, P_BEATS, asList);
ok(evP2.byId['cplus:julian'].status === 'fulfilled',
  'two separate verbatim excerpts as a LIST are accepted as evidence');
const joined = JSON.parse(JSON.stringify(sameSentence));
joined[0].consequencePassage = TWO[0] + ' ... ' + TWO[1];
const evP3 = evalWith(P_DRAFT, P_BEATS, joined);
ok(evP3.byId['cplus:julian'].status === 'unverified',
  'the SAME two excerpts joined by "..." are refused — an elided composite is not one passage');
ok(evP3.byId['cplus:julian'].evidenceProblems.some((p) => p.code === EBC.EVIDENCE_PROBLEM.ELIDED),
  'and the refusal names the elision');

// ══ D — NEGATIVE CONTROLS. THESE MUST BITE. ═════════════════════════════════════════════════
head('D — NEGATIVE CONTROLS (correction 3)');
const noComponents = [{ id: 'cplus:julian', status: 'fulfilled', occurrence: 'performed',
  actionPassage: ONE, consequencePassage: ONE, characterPlusLanded: true,
  assignedFacetDelivered: true, facetQuote: ONE,
  note: 'The room clearly defers to him.' }];
const evD1 = evalWith(P_DRAFT, P_BEATS, noComponents);
ok(evD1.byId['cplus:julian'].status === 'unverified',
  'social proof credited in a NOTE with no named components is unverified');
ok(evD1.byId['cplus:julian'].reasons.some((r) => /responder, recipient, response, interpretation/.test(r)),
  'and the reason names all four it failed to supply');

const selfResp = JSON.parse(JSON.stringify(sameSentence));
selfResp[0].socialProof.responder = { named: 'Julian', quote: ONE };
const evD2 = evalWith(P_DRAFT, P_BEATS, selfResp);
ok(evD2.byId['cplus:julian'].status === 'missed' && evD2.byId['cplus:julian'].material,
  'naming the LI as his own responder is a real MISS, not merely unverified');

head('D2 — THE MENTION-IN-A-LIST CASE, ON THE REAL DRAFT');
const LIST_SPAN = 'The trained ones—myself, the presiding Dohkar, Julian, standing too still at the '
  + 'edge of the clearing—would have felt it the instant her voice wavered.';
const mentionOnly = [{ id: 'cplus:julian', status: 'fulfilled', occurrence: 'performed',
  actionPassage: LIST_SPAN, consequencePassage: LIST_SPAN,
  characterPlusLanded: true, assignedFacetDelivered: true, facetQuote: LIST_SPAN,
  socialProof: {
    responder:      { named: 'the assembly', quote: LIST_SPAN },
    recipient:      { named: 'Julian',       quote: LIST_SPAN },
    response:       { named: 'they reach for his trained perception', quote: LIST_SPAN },
    interpretation: { named: 'she reads his posture as a peer others defer to', quote: LIST_SPAN } }}];
const evD3 = evalWith(DRAFT, P_BEATS, mentionOnly);
const d3 = evD3.byId['cplus:julian'];
console.log('  status: ' + d3.status + '  responder named: "' + d3.socialProof.components.responder.named + '"');
ok(d3.status === 'fulfilled',
  'HONEST LIMIT: a judge that names an invented responder and cites a verbatim span still PASSES '
  + 'the deterministic layer');
console.log('  ^ This is the remaining exposure, stated rather than papered over. The deterministic');
console.log('    layer can verify that all four were answered and quoted; it cannot establish that');
console.log('    "the assembly" responded to anyone. What changed is that the claim is now a named,');
console.log('    cited field instead of a prose note — wrong in the open rather than invisibly.');

// ══ E — OCCURRENCE IN CONTEXT ═══════════════════════════════════════════════════════════════
head('E — PERFORMED / CONTEMPLATED / NEGATED / ASSERTED (correction 3)');
const BAND_SPAN = 'The gossamer band was thin across my mouth, light as protocol, breakable. I could '
  + 'tear it away. I could speak. I could halt the rite before Fate answered.';
const mk = (occ) => [{ id: 'plot:band', status: 'fulfilled', occurrence: occ,
  occurrenceEvidence: 'The band is weighed and never torn; the scene ends with it still in place.',
  actionPassage: BAND_SPAN }];
['contemplated', 'negated', 'asserted'].forEach((occ) => {
  const e = evalWith(DRAFT, [PLOT[0]], mk(occ));
  const f = e.byId['plot:band'];
  ok(f.status === EBC.OCCURRENCE[occ].maps && f.material,
    occ + ' → ' + f.status + ', material (a real failure, correctly attributed)');
});
const perf = evalWith(DRAFT, [PLOT[0]], mk('performed'));
ok(perf.byId['plot:band'].status === 'fulfilled',
  'HONEST LIMIT: "performed" on the same modal span still passes — the judge decides, as agreed');
ok(perf.byId['plot:band'].occurrenceAdvisory !== null,
  'but the modal advisory is attached, so the inconsistency is visible');
const noOcc = evalWith(DRAFT, [PLOT[0]], [{ id: 'plot:band', status: 'fulfilled', actionPassage: BAND_SPAN }]);
ok(noOcc.byId['plot:band'].status === 'unverified' && !noOcc.byId['plot:band'].material,
  'omitting occurrence entirely is UNVERIFIED and asserts no story defect');

// ══ F — GOOD CHARACTER+ IS NOT THE ASSIGNED FACET ═══════════════════════════════════════════
head('F — CHARACTER+ LANDED vs ASSIGNED FACET DELIVERED (correction 4)');
const SEREN_ACT = 'Seren had abandoned the wish we\'d rehearsed for months—a self-directed '
  + 'transformation, something about her own becoming—and spent her First Sacrifice on me instead.';
const SEREN_INSIGHT = 'It was imprecision wearing the clothes of kindness.';
const mkSeren = (facetDelivered, quote) => [{ id: 'cplus:seren', status: 'fulfilled',
  occurrence: 'performed', actionPassage: SEREN_ACT, consequencePassage: SEREN_INSIGHT,
  characterPlusLanded: true, assignedFacetDelivered: facetDelivered,
  facetQuote: quote || undefined,
  note: 'Revealing, but about imprecision rather than audience-dependence.' }];
const evF1 = evalWith(DRAFT, [ser], mkSeren(false));
const f1 = evF1.byId['cplus:seren'];
console.log('  status: ' + f1.status + '  C+ landed: ' + f1.facet.characterPlusLanded
  + '  facet delivered: ' + f1.facet.delivered);
ok(f1.status === 'partial' && f1.material,
  'C+ landed and the assigned facet did not → PARTIAL and material, not fulfilled');
ok(f1.facet.characterPlusLanded === true && f1.facet.delivered === false,
  'both answers are recorded separately — the achievement is not erased and does not discharge the obligation');
ok(/ASSIGNED facet was not delivered/.test(f1.reasons.join(' ')), 'the reason names the assigned facet');

const evF2 = evalWith(DRAFT, [ser], mkSeren(true, SEREN_INSIGHT));
ok(evF2.byId['cplus:seren'].status === 'fulfilled' && evF2.byId['cplus:seren'].facet.delivered === true,
  'claimed delivered WITH a verbatim quote → fulfilled');
const evF3 = evalWith(DRAFT, [ser], mkSeren(true, 'her kindness needed an audience and she knew it'));
ok(evF3.byId['cplus:seren'].status === 'partial'
  && evF3.byId['cplus:seren'].facet.delivered === false,
  'claimed delivered with a FABRICATED quote → facet NOT recorded as delivered');
ok(evF3.byId['cplus:seren'].facet.judgeSaidDelivered === true,
  'and the judge\'s own unsupported claim is preserved beside it, not discarded');

// ══ G — EVERY MATERIAL BEAT GETS ITS OWN REGION ═════════════════════════════════════════════
head('G — REGION AUTHORIZATION NO LONGER DROPS BEATS BY ARRAY ORDER');
const allMissed = BEATS.map((b) => ({ id: b.id, status: 'missed', revisionId: EBC.revisionId(DRAFT) }));
const evG = evalWith(DRAFT, BEATS, allMissed);
const cPlusMaterial = evG.material.filter((f) => /^cplus:/.test(f.id));
const paras = EBC.paragraphsOf(DRAFT);
const byIdG = BEATS.reduce((m, b) => { m[b.id] = b; return m; }, {});
const authG = EBC.authorizeRepairRegions(Object.assign({}, evG, { material: cPlusMaterial }), byIdG, paras);
authG.slots.forEach((s) => console.log('  ' + s.ref + ' ' + s.op + ' → ' + s.beatId
  + '  (' + s.why.slice(0, 72) + ')'));
ok(authG.slots.length === 4, 'all four anchorless Character+ beats get a region — ' + authG.slots.length);
ok(authG.refused.length === 0, 'none is refused by array order — ' + authG.refused.length + ' refused');
const refs = authG.slots.map((s) => s.ref);
ok(new Set(refs).size === refs.length, 'every region is a DISTINCT paragraph: ' + refs.join(', '));
const julSlot = authG.slots.find((s) => s.beatId === 'cplus:julian');
ok(julSlot && /Julian/.test(paras.find((p) => p.ref === julSlot.ref).text),
  "Julian's region is the paragraph where Julian is actually on the page");
const closingRef = paras.filter((p) => p.isProse).slice(-1)[0].ref;
ok(refs.indexOf(closingRef) === -1,
  'no insertion is authorized at the closing paragraph, so nothing can land after the decision');
// ── ONE PARAGRAPH MAY SERVE SEVERAL CHARACTERS (corrected 2026-10-15) ───────────────────────
// Refusing the second claim dropped a necessary repair by array order whenever two characters
// shared a scene moment. One replacement now carries every applicable finding.
head('G2 — A SHARED PARAGRAPH IS REWRITTEN ONCE, OWING ALL OF ITS OBLIGATIONS');
const twoAnchored = [
  { id: 'cplus:seren', status: 'missed', revisionId: EBC.revisionId(DRAFT), actionPassage: SEREN_INSIGHT },
  { id: 'cplus:julian', status: 'missed', revisionId: EBC.revisionId(DRAFT), actionPassage: SEREN_INSIGHT }];
const evG2 = evalWith(DRAFT, [ser, jul], twoAnchored);
const authG2 = EBC.authorizeRepairRegions(evG2, byIdG, paras);
console.log('  slots: ' + authG2.slots.length + '  refused: ' + authG2.refused.length
  + '  beatIds: ' + JSON.stringify(authG2.slots[0].beatIds));
ok(authG2.slots.length === 1, 'ONE replacement slot for the shared paragraph — ' + authG2.slots.length);
ok(authG2.refused.length === 0, 'and NOTHING is refused — ' + authG2.refused.length);
ok(authG2.slots[0].beatIds.length === 2
  && authG2.slots[0].beatIds.indexOf('cplus:seren') !== -1
  && authG2.slots[0].beatIds.indexOf('cplus:julian') !== -1,
  'the slot carries BOTH findings, not just the first by array order');
ok(authG2.slots[0].shared === true, 'the slot is marked shared');
ok(/owing 2 obligations at the same moment/.test(authG2.slots[0].why)
  && /keep everything it already does/.test(authG2.slots[0].why),
  'and the reason states both obligations and that the paragraph keeps its other functions');
ok(authG2.slots.filter((s) => s.ref === authG2.slots[0].ref && s.op === 'replace').length === 1,
  'there are no competing replacements of the same paragraph');
ok(authG2.slots[0].ref === paras.find((p) => EBC.quotePresent(SEREN_INSIGHT, p.text)).ref,
  'and it was not relocated to an unrelated paragraph');
// One accepted replacement resolves BOTH, rather than leaving the second unresolved.
const sharedReply = JSON.stringify({ paragraphs: [{ ref: authG2.slots[0].ref, op: 'replace',
  text: 'A rewritten paragraph that delivers both obligations and keeps what it already did.' }] });
const sharedVal = EBC.validateRepairReply(sharedReply, authG2.slots, paras);
ok(sharedVal.items.length === 1 && (sharedVal.items[0].beatIds || []).length === 2,
  'the accepted edit addresses both obligations, so neither is reported unfilled');
// ADDRESSED ≠ FULFILLED. One replacement answering two obligations does not prove either landed.
ok(sharedVal.items[0].provesFulfilment === false,
  'and the accepted edit explicitly does NOT claim to prove fulfilment');
ok((sharedVal.items[0].addressed || []).length === 2,
  'it records which obligations were ADDRESSED, as a separate fact from whether they were met');
ok(/ADDRESSED, not that each was\s*'?\s*\+?\s*'?\s*FULFILLED|ADDRESSED, not that each was/.test(authG2.slots[0].addressedNotProven || ''),
  'the slot says plainly that addressed is not fulfilled');
ok(/coverage credit follows the\s*'?\s*\+?\s*'?\s*evidence|coverage credit follows the/.test(authG2.slots[0].addressedNotProven || ''),
  'and that coverage credit still follows the evidence for each obligation alone');

// ══ H — THE INTEGRATED-SENTENCE STYLE DEFAULT ═══════════════════════════════════════════════
head('H — CONCENTRATED CHARACTER+, NOT EXPLAINED AFTERWARDS');
const S = EBC.CP_STYLE;
ok(/one is often enough/.test(S.compression) && /not a word quota/.test(S.compression),
  'compression is the default AND explicitly not a quota');
ok(/two are\s*'?\s*\+?\s*'?\s*fine when the moment needs them|two are fine when the moment needs them/.test(S.compression),
  'two sentences are allowed when the moment needs them');
ok(/do not add a sentence explaining what it meant/.test(S.compression),
  'the explanatory aftermath is named and refused');
// ── THE OCTOBER WORDING AMPLIFIES THE AUGUST DOCTRINE, IT DOES NOT RESTATE IT ───────────────
ok(/doctrine's own bar/.test(S.compression) && /fuse them/i.test(S.compression),
  'and it is attributed to the doctrine\'s own bar rather than presented as a new rule');
ok(/IT NEED NOT BE AN ACTION/.test(S.breadth)
  && /remembered\s*'?\s*\+?\s*'?\s*pattern|remembered/.test(S.breadth)
  && /absence/.test(S.breadth) && /contrast/.test(S.breadth)
  && /corrected assumption/.test(S.breadth) && /dialogue/.test(S.breadth),
  'breadth is preserved: action is one channel among remembered pattern, absence, contrast, corrected assumption, dialogue');
// The permission moved FIELD, not meaning: `notChecklist` was replaced by `connection`
// (Roman 2026-11-06) and the permission is carried inside it, because the repair brief ships
// CP_STYLE with no doctrine attached and would otherwise lose it. Same question, new home.
ok(/NO BEAT OWES EVERY FUNCTION/.test(S.connection)
  && /revealing the observed is enough/i.test(S.connection)
  && S.notChecklist === undefined,
  'observed-only / observer-only / both are all permitted — no checklist');
ok(S.integration === undefined && S.noAftermath === undefined,
  'the competing October keys are GONE, not kept alongside the new ones');
ok(/does not have to declare what she felt/.test(S.implicitViewpoint),
  'the viewpoint may be implicit — carried by selection, comparison, diction or contrast');
ok(/Do NOT give a bystander a name/.test(S.noNewCast) && /continuity obligations/.test(S.noNewCast),
  'naming a bystander is forbidden, with the reason given');
ok(/two or three of them/.test(S.noNewCast),
  'already-authorized UNNAMED witnesses are offered as the alternative');

// ── THE DELIVERY GAP THE RECOVERY FOUND ─────────────────────────────────────────────────────
// The author received the whole August doctrine; the repair editor received none of it. This
// asserts the excerpt now reaches the brief, read from app.js so there is one source.
head('H1b — THE RECOVERED DOCTRINE REACHES THE REPAIR BRIEF');
{
  // app.js is not loaded in this process, so the excerpt function is sourced the way the browser
  // provides it. Executing the hoisted constant + the excerpt builder out of the shipped file is
  // the same discipline the control suite uses for app.js assertions.
  const src = fs.readFileSync(ROOT + '/public/app.js', 'utf8');
  const a = src.indexOf('var _CP_DOCTRINE = {');
  const b = src.indexOf('function _buildCharacterPlusShared(');
  ok(a > 0 && b > a, 'the doctrine constant is hoisted above the author block');
  vm.runInThisContext(src.slice(a, b).replace(/try \{ if \(typeof window[^\n]*\n/g, ''));
  const excerpt = globalThis._cpDoctrineExcerptForRepair();
  const liBeatD = BEATS.find((x) => x.id === 'cplus:julian');
  const briefD = EBC.buildBrief(
    evalWith(DRAFT, [liBeatD], [{ id: 'cplus:julian', status: 'missed', revisionId: EBC.revisionId(DRAFT) }]),
    { beatsById: { 'cplus:julian': liBeatD } });
  ok(typeof briefD.characterPlusDoctrine === 'string' && briefD.characterPlusDoctrine.length > 500,
    'the brief now carries the doctrine excerpt — ' + (briefD.characterPlusDoctrine || '').length + ' chars');
  ok(briefD.characterPlusDoctrine === excerpt, 'and it is byte-identical to app.js\'s excerpt (one source)');
  [['the compact framing', 'indirect characterization and close-POV filtering'],
   ['the Jess exemplar', 'Jess led with her décolletage'],
   ['the ring failure', 'Julian touched his ring, as usual'],
   ['the law separating them', 'A RECURRING BEHAVIOUR IS A CHARACTER TRAIT ONLY WHEN'],
   ['the governing principle', 'information CREATED BY a character'],
   ['the fusion bar', 'FUSE them into one'],
   ['not-a-checklist', 'NOT A FOUR-SLOT CHECKLIST'],
   ['the banned shape', 'Others saw X; I saw Y'],
   ['the mechanism clarification', 'JUDGE THE MECHANISM, NOT THE SURFACE PATTERN']
  ].forEach((p) => ok(briefD.characterPlusDoctrine.indexOf(p[1]) !== -1, 'it includes ' + p[0]));
  ok(briefD.characterPlusDoctrine.indexOf('NINE MECHANISMS') === -1,
    'and does NOT include the nine-mechanism table — a selection, not the whole author prompt');
  ok(/attention going one way while this person/.test(briefD.characterPlusDoctrine),
    'the clarification permits other people looking one way while this person looks elsewhere');

  head('H1c — NO PRESCRIBED EMOTIONAL CONCLUSION REACHES THE EDITOR');
  ok(!/distrust/i.test(JSON.stringify(briefD.items[0].pcInterpretation || '')),
    'the test-authored self-distrust prescription is gone from the beat\'s interpretation');
  ok(briefD.items[0].viewpoint && Array.isArray(briefD.items[0].viewpoint.context)
    && briefD.items[0].viewpoint.context.length >= 3,
    'grounded viewpoint context is supplied instead — '
      + ((briefD.items[0].viewpoint || {}).context || []).length + ' items');
  ok(/sealed and silenced/.test(((briefD.items[0].viewpoint || {}).context || []).join(' ')),
    'and it is situational fact (her sealed, silenced position), not a feeling');
  ok(/predetermined feeling/.test((briefD.items[0].viewpoint || {}).contextNote || ''),
    'with an explicit instruction not to write toward a predetermined feeling');
}

head('H2 — THE DESIGN REFERENCE NEVER REACHES A MODEL');
// A concrete exemplar handed to a model gets copied verbatim; rotation is not a guard. The
// reference sentence lives in a developer comment only. This asserts it across every
// model-facing surface at once.
const EXEMPLAR = /misalignment hit the gathering like a wave|crash upon the unmoving|gaze shot past their deference/i;
const liBeat = BEATS.find((b) => b.id === 'cplus:julian');
const surfaces = {
  'judgeContract.text': EBC.judgeContract(BEATS).text,
  'beat.socialProof': JSON.stringify(liBeat.socialProof),
  'beat.disclosure': JSON.stringify(liBeat.disclosure),
  'CP_STYLE (all strings)': JSON.stringify(S),
  'repair brief': JSON.stringify(EBC.buildBrief(
    evalWith(DRAFT, [liBeat], [{ id: 'cplus:julian', status: 'missed', revisionId: EBC.revisionId(DRAFT) }]),
    { beatsById: { 'cplus:julian': liBeat } }))
};
Object.keys(surfaces).forEach((k) => ok(!EXEMPLAR.test(surfaces[k]), 'no exemplar sentence in ' + k));
ok(/misalignment hit the gathering like a wave/.test(
  fs.readFileSync(ROOT + '/public/essential-beat-check.js', 'utf8')),
  'it IS recorded in the source as the design reference, in a comment');

head('H3 — THE STYLE REACHES THE AUTHOR REQUEST, NOT ONLY THE REPAIR');
const appSrc = fs.readFileSync(ROOT + '/public/app.js', 'utf8');
ok(/globalThis\.EssentialBeatCheck\s*\n?\s*&&\s*globalThis\.EssentialBeatCheck\.CP_STYLE/.test(appSrc)
  || /EssentialBeatCheck\.CP_STYLE/.test(appSrc),
  'the author directive reads the SAME CP_STYLE definition rather than restating it');
ok(/AND SHE READS IT IN THE SAME BREATH/.test(appSrc),
  'the author directive no longer says "THEN she interprets", which invited a second beat');
ok(/CONDITIONS, NOT LINES TO REUSE/.test(appSrc),
  'grounded opportunities are presented as conditions, not stock openers');
ok(/none is wording to\s*'\s*\+\s*'?\s*reproduce|none is wording to/.test(appSrc),
  'and the request says plainly they are not wording to reproduce');

// ── AVAILABILITY, NOT A STANDING INVITATION (corrected 2026-10-15) ──────────────────────────
// The first wording told every sealed character that a reaction toward the protagonist "IS
// permitted and is good material", which generalises one character's opportunity into a tic.
head('H4 — THE SEALED REACTION IS CONDITIONALLY AVAILABLE, NOT RECOMMENDED');
const d = liBeat.disclosure;
const A = d.relationalReactionAvailability || '';
ok(d.sealed === true && !!A, 'a sealed facet carries the availability clause');
ok(/CONDITIONAL, NOT RECOMMENDED/.test(A), 'it is stated as conditional and NOT recommended');
ok(/fits\s+who this person is/.test(A) && /the scene genuinely\s+affords the moment/.test(A)
  && /does not forbid signs of\s+recognition/.test(A),
  'all three conditions are named: the character, the scene, and this facet\'s own restriction');
ok(/not an expected feature of a sealed character/.test(A)
  && /shows nothing is often the better choice/.test(A),
  'it says plainly that showing nothing is often better — no flicker tic');
ok(/Do not reach for\s*'\s*\+\s*'?\s*it to satisfy a requirement|Do not reach for/.test(A),
  'and forbids reaching for it merely to satisfy a requirement');
ok(/BEING UNEXPLAINED IS NOT ENOUGH/.test(A) && /discloses it by timing/.test(A),
  'being unexplained is explicitly NOT sufficient — timing and context can disclose');
ok(/able to mean several things/.test(A), 'the test is multiple possible meanings, not a withheld word');
ok(/RELATIONALLY AMBIGUOUS/.test(A) && /identify its cause/.test(A) && /could be wrong about/.test(A),
  'if used: ambiguous, cause unidentified, and her reading one she could be wrong about');
ok(!/IS permitted and is\s*'?\s*\+?\s*'?\s*good material/.test(A),
  'the old "IS permitted and is good material" phrasing is gone');
const briefSealed = EBC.buildBrief(
  evalWith(DRAFT, [liBeat], [{ id: 'cplus:julian', status: 'missed', revisionId: EBC.revisionId(DRAFT) }]),
  { beatsById: { 'cplus:julian': liBeat } });
ok(/SEALED/.test(briefSealed.items[0].mustNotReveal || ''), 'the repair brief still carries the seal');
ok(!!briefSealed.items[0].relationalReactionAvailability,
  'and carries the conditional availability, with its conditions attached');

head('H4b — "FRESH" PERMITS A MEANINGFUL ECHO');
ok(/REVISITING THE ESTABLISHED IMPRESSION IS NOT ONLY ALLOWED BUT WANTED/.test(S.freshness),
  'revisiting the first impression is explicitly wanted, not merely tolerated');
ok(/new implication/.test(S.freshness) && /an exception/.test(S.freshness)
  && /a cost it has started to charge/.test(S.freshness) && /changed reading/.test(S.freshness),
  'all four echo moves are named: implication, exception, cost, changed reading');
ok(/an echo deepens/.test(S.freshness), 'an echo is framed as deepening, not repeating');
ok(/behaves as though the first never happened/.test(S.freshness),
  'and novelty that forgets the first depiction is named as the opposite failure');
ok(!/not a reprise of the first/.test(S.freshness), 'the novelty-demanding wording is gone');

head('H5 — REPAIR REGIONS PREFER INTEGRATION OVER APPENDING');
const integ = EBC.authorizeRepairRegions(
  evalWith(DRAFT, [liBeat], [{ id: 'cplus:julian', status: 'missed', revisionId: EBC.revisionId(DRAFT) }]),
  { 'cplus:julian': liBeat }, paras);
ok(integ.slots.length === 1 && integ.slots[0].op === 'replace',
  'an anchorless Character+ beat is authorized to REPLACE its person\'s paragraph, not insert after one');
ok(/tighten or integrate here rather than appending/.test(integ.slots[0].why),
  'and the reason says so');
const ghost = Object.assign({}, liBeat, { id: 'cplus:ghost', character: 'Nobodyhere' });
const ghostAuth = EBC.authorizeRepairRegions(
  evalWith(DRAFT, [ghost], [{ id: 'cplus:ghost', status: 'missed', revisionId: EBC.revisionId(DRAFT) }]),
  { 'cplus:ghost': ghost }, paras);
ok(ghostAuth.slots[0].op === 'insert_after',
  'insert_after survives as the fallback for a character nowhere on the page');

// ══ I — THE INTRODUCTION LIFECYCLE ══════════════════════════════════════════════════════════
// obligation → unresolved attempt → pacing → eligible again. Through the shipped functions only.
head('I — UNRESOLVED DELIVERY PACES AN INTRODUCTION WITHOUT CREDITING IT');
const PARTS = [{ id: 'e:julian', label: 'Julian', participation: 'major', isPC: false }];
const planAt = (ordinal, attempts, ledger) => EBC.cpCoveragePlan({
  issue: 1, ledger: ledger || [], attempts: attempts || [], sceneOrdinal: ordinal,
  participants: PARTS });

// 1 — never attempted: mandatory introduction, eligible, staged fresh.
{
  const o = planAt(3, [], []).obligations[0];
  ok(o.kind === 'introduction' && o.eligibleThisScene === true && o.firstEverAttempt === true,
    'never attempted → introduction, eligible, firstEverAttempt');
  ok(o.staging === 'fresh' && o.unresolvedNote === null, 'staged fresh, with no unresolved note');
}
// 2 — an attempt ran in scene 3 and did not verify. Scene 3 again: NOT eligible, still owed.
const attempt3 = [{ character: 'Julian', ordinal: 3, issue: 1, outcome: 'unverified',
  appearanceEvidenced: true, appearanceQuote: 'shifted aside without prompting' }];
{
  const p = planAt(3, attempt3, []);
  const o = p.obligations[0];
  ok(o.kind === 'introduction', 'after an unverified attempt it is STILL an introduction — not recurring');
  ok(o.eligibleThisScene === false && o.due === 'later_in_issue',
    'and not eligible in the same scene');
  ok(p.obligations.length === 1 && !(p.satisfied || []).length,
    'the obligation remains OUTSTANDING and nothing is counted as satisfied');
  ok(o.firstEverAttempt === false && o.priorAttempts === 1 && o.lastAttemptOrdinal === 3,
    'the attempt is recorded as an attempt, scene-relatively');
  ok(o.staging === 'resume' && /do not stage another entrance/.test(o.unresolvedNote),
    'staging is RESUME and the author is told not to stage another entrance');
  ok(o.mode === null, 'no echo or broaden mode is proposed from an unverified attempt');
}
// 3 — ONE INTERVENING SCENE. 3 → 4 deferred → 5 eligible. Gap 1 would have reassigned in 4,
// which is same-scene deduplication, not a cooldown.
{
  ok(EBC.CP_INTRO_RETRY_GAP === 2, 'the gap is 2 — one genuinely intervening scene');
  const s4 = planAt(4, attempt3, []).obligations[0];
  ok(s4.eligibleThisScene === false && s4.scenesSinceLastAttempt === 1,
    'scene 4, immediately after the attempt: DEFERRED');
  ok(s4.kind === 'introduction', 'and still an introduction while deferred');
  const s5 = planAt(5, attempt3, []).obligations[0];
  ok(s5.eligibleThisScene === true && s5.scenesSinceLastAttempt === 2,
    'scene 5, one intervening scene later: eligible again');
  ok(s5.staging === 'resume' && s5.kind === 'introduction',
    'still an introduction, resumed rather than re-staged');
}
// 4 — a cumulative threshold would have stayed deferred forever. Three attempts, latest scene 9.
{
  const many = [{ character: 'Julian', ordinal: 3, issue: 1 }, { character: 'Julian', ordinal: 5, issue: 1 },
                { character: 'Julian', ordinal: 9, issue: 1 }];
  ok(planAt(11, many, []).obligations[0].eligibleThisScene === true,
    'three prior attempts do not block scene 11 — eligibility follows the LAST attempt only');
  ok(planAt(10, many, []).obligations[0].eligibleThisScene === false,
    'and the most recent attempt still paces the scene immediately after it');
}
// 5 — APPEARANCE IS SEPARATE FROM DELIVERY.
{
  const noEvidence = [{ character: 'Julian', ordinal: 3, issue: 1, outcome: 'unavailable',
    appearanceEvidenced: false }];
  const o = planAt(4, noEvidence, []).obligations[0];
  ok(o.appearanceEvidenced === false, 'an unavailable judge leaves appearance unestablished');
  ok(/was NOT established/.test(o.unresolvedNote)
    && !/already present/.test(o.unresolvedNote),
    'and the author is NOT told the person is already present to the reader');
  const withEvidence = planAt(4, attempt3, []).obligations[0];
  ok(withEvidence.appearanceEvidenced === true && /already present/.test(withEvidence.unresolvedNote),
    'only evidenced appearance licenses "already present"');
}
// 6 — ATTEMPTS NEVER BECOME COVERAGE CREDIT.
{
  const o = planAt(9, [{ character: 'Julian', ordinal: 3, issue: 1 },
                       { character: 'Julian', ordinal: 5, issue: 1 }], []).obligations[0];
  ok(o.kind === 'introduction', 'two attempts still do not produce a recurring obligation');
  // and once something IS verified, the ordinary path takes over.
  const verified = [{ character: 'Julian', issue: 1, verification: 'verified', relation: 'reinforced',
    mode: 'echo_reinterpret' }];
  const o2 = planAt(9, attempt3, verified).obligations[0];
  ok(!o2 || o2.kind === 'recurring',
    'a VERIFIED record is what turns it recurring — ' + (o2 ? o2.kind : 'satisfied'));
}
// 7 — an attempt record is built, not inferred.
head('I2 — AN ATTEMPT IS EXPLICIT, NOT THE COMPLEMENT OF "VERIFIED"');
{
  const reader = 'He shifted aside without prompting, opening the sightline.';
  const r = EBC.cpAttemptRecord({ judgeUsable: true, revisionId: 'rX-100',
    appearanceQuote: 'shifted aside without prompting', reader });
  ok(r.ran === true && r.outcome === 'unverified', 'a usable judge that could not verify → ran, unverified');
  ok(r.appearanceEvidenced === true, 'a quotation verbatim in the published text evidences appearance');
  const r2 = EBC.cpAttemptRecord({ judgeUsable: false, revisionId: 'rX-100',
    appearanceQuote: 'shifted aside without prompting', reader });
  ok(r2.outcome === 'unavailable' && r2.appearanceEvidenced === false,
    'an UNAVAILABLE judge evidences nothing, even with a quote supplied');
  const r3 = EBC.cpAttemptRecord({ judgeUsable: true, revisionId: 'rX-100',
    appearanceQuote: 'a sentence that is not in the text at all', reader });
  ok(r3.appearanceEvidenced === false, 'a quotation absent from the text evidences nothing');
  // The app-side reader requires the explicit marker.
  const appSrcI = fs.readFileSync(ROOT + '/public/app.js', 'utf8');
  ok(/if \(!a \|\| a\.ran !== true\) return;/.test(appSrcI),
    '_cpAttemptsFlat requires assessment.ran === true — a directed-only row is not an attempt');
  ok(/dedupl|dedupe|REPLACES its row/.test(appSrcI.slice(appSrcI.indexOf('function _cpAttemptsFlat') - 1400,
    appSrcI.indexOf('function _cpAttemptsFlat'))),
    'and the reader documents that duplicate processing replaces rather than adds');
}
head('I3 — PACING BITES AT THE SELECTOR, NOT ONLY IN METADATA');
{
  const appSrcI = fs.readFileSync(ROOT + '/public/app.js', 'utf8');
  ok(/eligibleThisScene === false && x\.coverage\.firstEverAttempt !== true/.test(appSrcI),
    'the continuation selector filters on eligibility, so a deferral actually defers');
  ok(/out\.deferredIntroductions = /.test(appSrcI) && /stillOwed: true/.test(appSrcI),
    'and a deferred introduction is reported as still owed');
  ok(/firstEverAttempt keeps a mandatory first\s*\n?\s*\/\/ depiction unconditional|firstEverAttempt/.test(appSrcI),
    'a genuinely new character is never deferred');
  ok(/attempts: \(typeof _cpAttemptsFlat === 'function'\)/.test(appSrcI),
    'and the plan is given explicit attempts, not the non-verified complement');
}

// ══ J — RECEIPT FIELDS AND LOCAL REFUSAL ════════════════════════════════════════════════════
head('J — USAGE IS VALIDATED, NEVER COERCED; ABSENCE IS NOT ZERO');
{
  const V = EBC.ebValidateUsage;
  ok(V(null).ok === false && V(null).present === false, 'usage null → not usable, not present');
  ok(V(undefined).ok === false && V(undefined).present === false, 'usage undefined → same');
  ok(V({}).ok === false && V({}).present === false, 'empty usage object → fields missing');
  ok(V({ input_tokens: 10 }).ok === false, 'output_tokens missing → not usable');
  ok(V({ output_tokens: 10 }).ok === false, 'input_tokens missing → not usable');
  ok(V({ input_tokens: '10', output_tokens: 2 }).ok === false, 'a string count is not a number');
  ok(V({ input_tokens: NaN, output_tokens: 2 }).ok === false, 'NaN is rejected');
  ok(V({ input_tokens: Infinity, output_tokens: 2 }).ok === false, 'Infinity is rejected');
  ok(V({ input_tokens: -5, output_tokens: 2 }).ok === false, 'a negative count is rejected');
  // THE DISTINCTION THAT MATTERS: a genuine 0/0 reply is usable and settles at $0; an ABSENT
  // usage object is not usable and keeps its reservation. The old coercion made them identical.
  const zero = V({ input_tokens: 0, output_tokens: 0 });
  ok(zero.ok === true && zero.genuineZero === true && zero.inTok === 0,
    'a GENUINE zero-usage reply is usable and flagged as genuinely zero');
  ok(V(null).genuineZero !== true, 'while absent usage is NOT a genuine zero');
  const normal = V({ input_tokens: 100, output_tokens: 20 });
  ok(normal.ok === true && normal.genuineZero === false && normal.inTok === 100,
    'a normal reply reports its counts');
}

head('J2 — A LOCAL REFUSAL IS NOT A TRANSPORT FAILURE');
{
  const appSrcJ = fs.readFileSync(ROOT + '/public/app.js', 'utf8');
  ok(typeof EBC.EB_LOCAL_REFUSAL === 'string' && EBC.EB_LOCAL_REFUSAL.length > 3,
    'the refusal marker is defined once, in the module');
  ok(appSrcJ.indexOf('EssentialBeatCheck.EB_LOCAL_REFUSAL] === true') !== -1,
    'the adapter recognises the marker');
  ok(/_ebGuardSettle\(_reservation, 0, false\);   \/\/ release the hold; no exposure/.test(appSrcJ),
    'and RELEASES its local hold rather than retaining exposure');
  ok(/notDispatched: true, locallyRefused: true/.test(appSrcJ),
    'reporting notDispatched, so no attempt is recorded and no cooldown imposed');
  ok(/ebValidateUsage\(p\.usage\)/.test(appSrcJ),
    'the adapter uses the shared validator rather than coercing');
  ok(!/Number\(p\.usage && p\.usage\.input_tokens\)/.test(appSrcJ),
    'and the coercing expression is gone from app.js');
  const harnessJ = fs.readFileSync(ROOT + '/_cplus_repair_live.mjs', 'utf8');
  ok(!/Number\(p\.usage && p\.usage\.input_tokens\)/.test(harnessJ),
    'and from the scene wrapper');
  ok(/EBC\.ebValidateUsage\(p\.usage\)/.test(harnessJ),
    'which uses the same validator');
  ok(/const refuse = \(route, label, reason, reservation\)/.test(harnessJ)
    && /\[EBC\.EB_LOCAL_REFUSAL\]: true/.test(harnessJ),
    'the wrapper FULFILLS a refusal with the marker instead of aborting');
  ok(/nAttempted = 0, nRefused = 0, nForwarded = 0, nCrafted = 0/.test(harnessJ),
    'and keeps attempted / refused / forwarded / crafted counts apart');
}

// ══ K — repairable:false IS ENFORCED WHERE REGIONS ARE ISSUED ═══════════════════════════════
// The defect this closes: in the 2026-10-16 frozen-scene experiment the connected path authorized
// P10:replace for `plot:band`, an obligation designated non-repairable, and the editor changed it.
// The flag was read only by the harness's own mode.
head('K — A NON-REPAIRABLE OBLIGATION AUTHORIZES NO EDIT');
{
  const D = 'Alpha one.\n\nBravo two, where Julian stands apart.\n\nI could tear it away. I could speak.';
  const pr = EBC.paragraphsOf(D);
  const bJ = { id: 'cplus:julian', kind: 'character_plus', essential: true, character: 'Julian',
    evidenceKind: 'on_page_action', description: 'd', repairable: true };
  const bB = { id: 'plot:band', kind: 'essential', essential: true,
    evidenceKind: 'on_page_action', description: 'tears the band', repairable: false };
  const byId = { 'cplus:julian': bJ, 'plot:band': bB };
  const rev = EBC.revisionId(D);
  const ev = evalWith(D, [bJ, bB], [
    { id: 'cplus:julian', status: 'missed', revisionId: rev },
    { id: 'plot:band', status: 'contemplated', revisionId: rev, occurrence: 'contemplated',
      actionPassage: 'I could tear it away. I could speak.' }]);
  const auth = EBC.authorizeRepairRegions(ev, byId, pr);
  const forBand = auth.slots.filter((x) => (x.beatIds || [x.beatId]).indexOf('plot:band') !== -1);
  ok(forBand.length === 0, 'NO region is authorized for the non-repairable obligation');
  ok(auth.refused.some((r) => r.beatId === 'plot:band' && /repairable:false/.test(r.reason)),
    'and the refusal says why');
  ok(auth.slots.length === 1 && (auth.slots[0].beatIds || []).indexOf('cplus:julian') !== -1,
    'while the eligible obligation still gets its region');
}

head('K2 — PROTECTED CONTENT SURVIVES A SHARED PARAGRAPH, OR THE EDIT IS REJECTED');
{
  // One paragraph carries BOTH an eligible repair's anchor and a non-repairable obligation's.
  const SHARED = 'Alpha one.\n\nJulian stands apart. I could tear it away. I could speak.';
  const pr = EBC.paragraphsOf(SHARED);
  const bJ = { id: 'cplus:julian', kind: 'character_plus', essential: true, character: 'Julian',
    evidenceKind: 'on_page_action', description: 'd', repairable: true };
  const bB = { id: 'plot:band', kind: 'essential', essential: true,
    evidenceKind: 'on_page_action', description: 'tears the band', repairable: false };
  const byId = { 'cplus:julian': bJ, 'plot:band': bB };
  const rev = EBC.revisionId(SHARED);
  const ev = evalWith(SHARED, [bJ, bB], [
    { id: 'cplus:julian', status: 'missed', revisionId: rev },
    { id: 'plot:band', status: 'contemplated', revisionId: rev, occurrence: 'contemplated',
      actionPassage: 'I could tear it away. I could speak.' }]);
  const auth = EBC.authorizeRepairRegions(ev, byId, pr);
  const slot = auth.slots[0];
  ok(auth.slots.length === 1, 'the shared paragraph is still authorized for the eligible repair');
  ok((slot.protectedPassages || []).length === 1
    && /I could tear it away/.test(slot.protectedPassages[0]),
    'and carries the protected passage, so protection travels with the region');
  ok(/must appear VERBATIM/.test(slot.protectedNote || ''), 'with the requirement stated');
  // An edit that DROPS the protected content is rejected in full.
  const bad = JSON.stringify({ paragraphs: [{ ref: slot.ref, op: slot.op,
    text: 'Julian stands apart, and an attendant glanced toward him. I tore it away and moved.' }] });
  const vBad = EBC.validateRepairReply(bad, auth.slots, pr);
  ok(vBad.items.length === 0 && vBad.rejected.length === 1
    && vBad.rejected[0].code === EBC.CP_REJECT.PROTECTED,
    'dropping the protected passage rejects the edit — ' + JSON.stringify(vBad.rejected[0] || {}).slice(0, 110));
  // An edit that KEEPS it verbatim is accepted.
  const good = JSON.stringify({ paragraphs: [{ ref: slot.ref, op: slot.op,
    text: 'Julian stands apart, and an attendant glanced toward him. I could tear it away. I could speak.' }] });
  const vGood = EBC.validateRepairReply(good, auth.slots, pr);
  ok(vGood.items.length === 1 && vGood.rejected.length === 0,
    'keeping it verbatim is accepted, so a legitimate repair is not blocked');
  // And the brief tells the editor, rather than setting a trap.
  const brief = EBC.buildBrief(Object.assign({}, ev, { material: ev.material }), { beatsById: byId });
  const reg = (brief.regions || []).concat(auth.slots.map((x) => ({ ref: x.ref })))[0];
  ok(/must appear VERBATIM/.test(slot.protectedNote), 'the requirement is communicated, not only enforced');
}

// ══ L — THE DEDICATED EDITOR: KEEP IS A FIRST-CLASS ANSWER ══════════════════════════════════
head('L — KEEP OR ONE LOCALIZED EDIT');
{
  const D = 'Alpha one.\n\nIt was imprecision wearing the clothes of kindness.\n\nCharlie three.';
  const pr = EBC.paragraphsOf(D);
  const b = { id: 'cplus:seren', kind: 'character_plus', essential: true, character: 'Seren',
    evidenceKind: 'on_page_action', description: 'd', repairable: true };
  const ev = { reader: D, findings: [{ id: b.id, status: 'missed', material: true, reasons: [] }],
    material: [{ id: b.id, status: 'missed', material: true, reasons: [] }] };
  const auth = EBC.authorizeRepairRegions(ev, { 'cplus:seren': b }, pr);
  const contract = EBC.editorContract({ regions: auth.slots });
  ok(/"decision":"keep"/.test(contract) && /"decision":"edit"/.test(contract),
    'the contract offers BOTH decisions');
  ok(/Keeping is a real answer and is often the right one/.test(contract),
    'and says plainly that keeping is a real answer');
  ok(/PREFER ONE SHARP SENTENCE/.test(contract) && /never an explanatory paragraph/.test(contract),
    'with compression and no explanatory paragraph required of an edit');

  // A KEEP quoting real prose is accepted.
  const good = JSON.stringify({ decision: 'keep',
    keptPassage: 'It was imprecision wearing the clothes of kindness.', why: 'already works' });
  const vk = EBC.validateEditorReply(good, auth.slots, pr, D);
  ok(vk.decision === 'keep' && vk.ok === true && /imprecision/.test(vk.kept.passage),
    'a KEEP quoting the scene verbatim is accepted');
  // A KEEP quoting prose that is not there is refused — it cannot be a polite no-op.
  const fake = JSON.stringify({ decision: 'keep', keptPassage: 'a sentence nobody wrote here' });
  const vf = EBC.validateEditorReply(fake, auth.slots, pr, D);
  ok(vf.ok === false && vf.code === 'kept_passage_not_verbatim',
    'a KEEP that cites prose not in the scene is refused');
  const bare = JSON.stringify({ decision: 'keep' });
  ok(EBC.validateEditorReply(bare, auth.slots, pr, D).code === 'keep_without_passage',
    'and a KEEP with no passage at all is refused');
  // An edit still goes through the existing authorization machinery.
  const edit = JSON.stringify({ decision: 'edit', paragraphs: [{ ref: auth.slots[0].ref,
    op: auth.slots[0].op, text: 'It was imprecision wearing the clothes of kindness, and she '
      + 'checked the ring of faces before she let herself look relieved.' }] });
  const ve = EBC.validateEditorReply(edit, auth.slots, pr, D);
  ok(ve.decision === 'edit' && ve.ok === true && ve.items.length === 1,
    'an edit in an authorized region is accepted through the same validator');
  const unauth = JSON.stringify({ decision: 'edit',
    paragraphs: [{ ref: 'P99', op: 'replace', text: 'x'.repeat(40) }] });
  ok(EBC.validateEditorReply(unauth, auth.slots, pr, D).ok === false,
    'an unauthorized ref is still refused');
  ok(EBC.validateEditorReply('{"decision":"shrug"}', auth.slots, pr, D).code === 'unknown_decision',
    'an unknown decision is refused');
}

head('L2 — THE UNIVERSAL "PERFORMANCE WITH A COST" REQUIREMENT IS GONE');
{
  const appSrcL = fs.readFileSync(ROOT + '/public/app.js', 'utf8');
  ok(!/it is not yet Character\+, which additionally requires that the act be a PERFORMANCE/.test(appSrcL),
    'the line stating it as a REQUIREMENT is removed');
  ok(/A CHOSEN PERFORMANCE WITH A COST IS ONE AVAILABLE MECHANISM, NOT A REQUIREMENT AND NOT A PRIORITY/.test(appSrcL),
    'and is restated as ONE AVAILABLE mechanism with no priority');
  ok(/none of these ranks above another/.test(appSrcL),
    'with the no-ranking rule stated outright');
  ok(!/STRONGEST MECHANISM/.test(appSrcL),
    'and the "strongest" framing is gone — memory, absence, dialogue and contrast are equals');
  ok(/remembered PATTERN, an ABSENCE or CHANGE, a CONTRAST, or a CORRECTED ASSUMPTION/.test(appSrcL),
    'the other channels are named in the same breath');
  ok(/Do not reject a beat for lacking a performance it never needed/.test(appSrcL),
    'with the consequence spelled out');
}

console.log('\n' + '='.repeat(78));
console.log((fail === 0 ? 'ALL ' : '') + pass + '/' + (pass + fail) + ' PASS'
  + (fail ? '   ' + fail + ' FAIL' : ''));
console.log('UNTESTED: whether a real judge answers this contract correctly. $0 spent.');
console.log('='.repeat(78));
process.exit(fail ? 1 : 0);
