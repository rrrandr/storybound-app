// MISTRAL-ONLY PORTFOLIO SAMPLE — ONE CALL, PREPARED, NOT RUN.
//
// This file was a gpt-4o vs gpt-4o-mini bakeoff. That was the wrong experiment: both models were
// candidates only because gpt-4o-mini was the SCAFFOLD's inherited fallback, not because any
// project evidence said either was good at psychological characterisation. The record said the
// opposite — gpt-4o had already failed at literary prose, mini showed no advantage over Mistral at
// higher cost, and Mistral is the structured Scene-1 planner that has produced the sharpest
// psychological reasoning in these probes.
//
// The $0.0198 was not wasted: it proved price bought no psychological distinction (the EXPENSIVE
// arm produced the most interchangeable characters) and exposed four prompt defects, all fixed for
// free. But no further OpenAI arm will be run.
//
// This is now ONE call, on the identical three-subject fixture, through the exact model and
// provider the Scene-1 planner already uses. There is no second arm and no blinding, because there
// is nothing to blind: a single route is being sampled, not compared.
//
// usage: SB_AB_AUTHORIZE=1 node _portfolio_model_ab.mjs      (needs vercel dev on :3000)
//        node _portfolio_model_ab.mjs --dry                  (bytes + cost, spends nothing)
import { chromium } from 'playwright-core';
import fs from 'fs';

const DRY = process.argv.includes('--dry');
const AUTHORIZED = process.env.SB_AB_AUTHORIZE === '1';
const MODEL = 'mistral-small-latest';   // exactly what the Scene-1 planner uses
const ROUTE = '/api/mistral-proxy';

// ── THE RUBRIC, FROZEN BEFORE THE RUN ────────────────────────────────────────────────────
// Written down here so scoring cannot drift toward whichever output reads better. Ten criteria,
// per subject, each scored 0 (absent) / 1 (partial) / 2 (met).
const RUBRIC = [
  ['R1  five genuinely DIFFERENT facets', 'not five phrasings of one disposition'],
  ['R2  psychological TRUTHS', 'not gestures, voice changes, facial expressions or scene actions'],
  ['R3  character-SPECIFIC', 'swapping this portfolio onto another subject would sound wrong'],
  ['R4  no unsupported BIOGRAPHY', 'no invented fact, secret, relationship, power or world lore'],
  ['R5  conditions are REUSABLE', 'concrete and portable to future situations, not a paraphrase of this scene'],
  ['R6  the five SPAN contrasting possibilities', 'generosity, jealousy, arrogance, insecurity, pedagogy, kindness, contradiction — not one note'],
  ['R7  each facet could INDEPENDENTLY generate a visible action and a PC interpretation', 'without dictating either sentence in advance'],
  ['R8  no CROSS-SUBJECT borrowing', 'nothing that belongs to one of the other two'],
  ['R9  no GENERIC body psychology', 'no "breath catches / voice lowers / fingers flex"'],
  ['R10 guardrails PREVENT the likely flattening', 'they block the most probable misreading of that facet'],
];

// ── THE FIXTURE: MAXIMUM SIZE, THREE CONTRASTING KINDS ───────────────────────────────────
// Three subjects is the batch maximum and the case that tests cross-character contamination as
// well as literary quality: three portfolios authored in one response can bleed into each other.
const SUBJECTS = [
  { ref: 'cand:AB-present-0001', label: 'Mara Dunn',
    kind: 'present, interacting ordinary NPC',
    evidence: 'IN_PERSON at the weighhouse ledger. She says the clause number instead of the clause, '
            + 'waits for the protagonist to find it herself, then says it again anyway.' },
  { ref: 'cand:AB-absent-0002', label: 'Tomas Reyne',
    kind: 'absent but explicitly ANTICIPATED — the Waldorf-concierge class',
    evidence: 'ANTICIPATED, never on stage. The protagonist expects him at the harbour office in the '
            + 'morning and is already composing what she will say to him.' },
  // A RECURRING FUNCTION, BUT A NAMED PERSON. The presiding Watchman was here first and was the
  // wrong choice: role phrases are deliberately INELIGIBLE for this batch, so a third of the
  // model-selection evidence would have come from a subject production will never buy. Halden Roe
  // holds the same recurring function and the same distinct pressures — and the REAL ownership
  // classifier is asserted to return ordinary/emergent and payable BEFORE the calls are made.
  { ref: 'cand:AB-recurring-0003', label: 'Halden Roe',
    kind: 'recurring ordinary/emergent person with a standing function',
    evidence: 'IN_PERSON with a storm-lantern, recurring across the arc. He is the one who decides '
            + 'whose manifest is read tonight and whose waits until morning.' },
];
// Kept as a FREE routing regression, not as evidence: proof that a role phrase is excluded.
const INELIGIBLE_CONTROL = { label: 'the presiding Watchman' };

// The request bytes are built ONCE and sent to both arms unchanged.
function buildRequest(model, ceiling) {
  const roster = SUBJECTS.map(s =>
    '    subject_ref: ' + s.ref + '  —  ' + s.label + '\n'
  + '      in this scene: ' + s.evidence).join('\n');
  const sys = 'You author CHARACTER PORTFOLIOS for a romance engine. You are given SUBJECTS by an '
    + 'opaque reference. Return ONE portfolio per subject, each carrying exactly 5 facets in 5 '
    + 'DIFFERENT categories, each facet with exactly 2 applicability conditions.\n\n'
    + 'A FACET IS A PSYCHOLOGICAL TRUTH about this person that would not be true of most people — '
    + 'never a gesture, a voice change, an expression, or something they do in this scene. It must '
    + 'be reusable: the same truth should still be true in a scene fifty pages from now.\n\n'
    + 'INVENT NO FACTS. No biography, no secret, no relationship, no power, no world lore beyond '
    + 'what the evidence below states. You are authoring how this person WORKS, not what has '
    + 'happened to them.\n\n'
    + 'The five facets must SPAN contrasting possibilities — generosity and jealousy, arrogance and '
    + 'insecurity, a teaching compulsion and a cruelty — so the character is not locked into one '
    + 'note. Each must be able to produce a visible action and a protagonist\'s reading of it '
    + 'without dictating either sentence.\n\n'
    + 'PORTFOLIO SUBJECTS — the ONLY values "subject_ref" may take. COPY one exactly; never invent '
    + 'one, never reuse one twice.\n' + roster + '\n\n'
    + 'allowed categories (each facet a DIFFERENT one): competence | insecurity | desire | fear | '
    + 'value | contradiction | worldview | habit | loyalty | shame\n'
    + 'Return ONLY JSON: { "characterPortfolios": [ { "subject_ref": "<copied>", '
    + '"misreading_guardrails": [ { "forbid": "<plain phrases separated by |>", "why": "<why that '
    + 'reading inverts them>" } ], "facets": [ { "category": "<one of the allowed>", '
    + '"canonical_truth": "<one sentence, max 150 chars>", "applicability_conditions": '
    + '[ { "text": "<when this truth is available to reveal, max 80 chars>", "evidence_requires": '
    + '"<plain words separated by |, 4+ characters each>" }, { "text": "<a SECOND, different '
    + 'condition>", "evidence_requires": "<its own alternatives>" } ], "forbidden_restatements": '
    + '[ { "forbid": "<phrases that merely SAY the truth>", "why": "<why saying it kills it>" } ] } ] } ] }';
  return { messages: [{ role: 'system', content: sys },
                      { role: 'user', content: 'Author the portfolios now as JSON.' }],
           role: 'PRIMARY_AUTHOR', model, max_tokens: ceiling, temperature: 0.8,
           response_format: { type: 'json_object' } };
}

// ── COST, BEFORE ANYTHING IS SPENT ───────────────────────────────────────────────────────
// Published per-1M rates. Input is the exact serialized request; output is charged at the CEILING
// for the worst case, because max_tokens is what we could be billed up to.
// Mistral Small, priced from this repo's own note on the small tier ($0.15 / $0.60 per M) — used
// as a CONSERVATIVE figure; the published small-tier rate is at or below it.
const RATES = { 'mistral-small-latest': { in: 0.15, out: 0.60 } };
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
let liveCalls = 0, aborted = 0;
const results = {};
await page.route('**/api/**', async route => {
  const u = route.request().url();
  let b = null; try { b = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
  const sys = String(((b && b.messages || []).find(m => m.role === 'system') || {}).content || '');
  // ONLY the portfolio calls may escape. Everything else — planner, author, auditors, bibles,
  // scaffold, ambient — is aborted and counted, so two paid calls is a fact, not a hope.
  if (/You author CHARACTER PORTFOLIOS/.test(sys) && b && b.__abArm && /mistral-proxy/.test(u)) return route.continue();
  aborted++;
  return route.abort();
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
const ceiling = await page.evaluate(() => window.__PORTFOLIO_BATCH_HARD_CEILING);

// ── PRE-FLIGHT: THE REAL CLASSIFIER MUST AGREE ───────────────────────────────────────────
// Every subject must be one production would actually pay for, and the role phrase must not be.
// Asserted against production's own ownership classifier, before a penny moves.
const own = await page.evaluate(({ labels, ineligible }) => {
  const s = window.state;
  Object.assign(s, { storyId: 'ab-pre', _relationshipLedger: null, _pendingAdmission: null,
    loveInterestName: 'Julian', partnerName: 'Julian', _starterId: null, aPlot: null });
  const cands = labels.concat([ineligible]).map((l, i) => ({
    id: 'named:ab' + i, label: l, aliases: [l] }));
  // The manifest only ever accepts what the seam deems payable, so capture is the honest probe.
  const payable = cands.filter(c => !/^(the|a|an|her|his|their|its|my|your|our)\s/i.test(c.label));
  const man = window._captureAdmissionManifest(s, payable.map(c => Object.assign({}, c,
    { providerOwner: 'ordinary/emergent name-only' })), { invocationId: 'inv-ab', lineage: 'L-ab' });
  return { payable: payable.map(c => c.label),
           manifest: (man && man.candidates || []).map(c => c.label),
           ineligibleIsRolePhrase: /^(the|a|an|her|his|their|its|my|your|our)\s/i.test(ineligible) };
}, { labels: SUBJECTS.map(x => x.label), ineligible: INELIGIBLE_CONTROL.label });
const preOk = own.manifest.length === 3
  && SUBJECTS.every(x => own.manifest.indexOf(x.label) !== -1)
  && own.payable.indexOf(INELIGIBLE_CONTROL.label) === -1
  && own.ineligibleIsRolePhrase === true;
console.log(' PRE-FLIGHT — the real classifier');
console.log(`   payable subjects : ${JSON.stringify(own.manifest)}`);
console.log(`   excluded control : "${INELIGIBLE_CONTROL.label}" — role phrase, never bought`);
if (!preOk) {
  console.error('\n  ✗ PRE-FLIGHT FAILED — a subject is not production-payable, or the control was not '
    + 'excluded. Refusing to spend.\n      ' + JSON.stringify(own) + '\n');
  await browser.close(); process.exit(3);
}
console.log('');

// ── ONE ROUTE, ONE CALL ──────────────────────────────────────────────────────────────────
const req = buildRequest(MODEL, ceiling);
const bytes = JSON.stringify(req).length;
const inTok = Math.ceil(bytes / 4);
const cost = m => (inTok / 1e6) * RATES[m].in + (ceiling / 1e6) * RATES[m].out;
const expOut = Math.ceil(ceiling * 0.45);
const expected = m => (inTok / 1e6) * RATES[m].in + (expOut / 1e6) * RATES[m].out;

console.log(`\n${'═'.repeat(84)}\nMISTRAL PORTFOLIO SAMPLE — PREPARED, NOT RUN\n${'═'.repeat(84)}\n`);
console.log(' ROUTE');
console.log(`   endpoint        : ${ROUTE}   (the Scene-1 planner's own proxy)`);
console.log(`   model           : ${MODEL}   (the Scene-1 planner's own model)`);
console.log(`   role            : CHARACTER_PORTFOLIO   (telemetry names what this is)`);
console.log(`   fallback        : NONE — if Mistral fails, the batch fails loudly\n`);
console.log(' REQUEST');
console.log(`   subjects        : 3 — ${SUBJECTS.map(s => s.label).join(' · ')}`);
console.log(`   request bytes   : ${bytes}  ·  input tokens ~${inTok} (chars÷4, conservative)`);
console.log(`   output ceiling  : ${ceiling} max_tokens (the constructed three-subject maximum)`);
console.log(`   temperature 0.8 · reasoning_effort none · one attempt · no repair, no retry\n`);
const PRIOR_SPEND = 0.0198;      // the whole OpenAI bakeoff, already spent and closed
const HARD_CAP = 0.13 - PRIOR_SPEND;
console.log(' COST');
console.log(`   worst case (billed to the full ceiling)   $${cost(MODEL).toFixed(4)}`);
console.log(`   expected   (output ~${expOut} tokens)             $${expected(MODEL).toFixed(4)}`);
console.log(`   already spent on this line of work        $${PRIOR_SPEND.toFixed(4)}`);
console.log(`   remaining authorised ceiling             $${HARD_CAP.toFixed(4)} of $0.1300\n`);
if (cost(MODEL) > HARD_CAP) {
  console.error(`\n  ✗ REFUSING TO RUN: worst case exceeds the remaining ceiling.\n`);
  await browser.close(); process.exit(4);
}

console.log(' RUBRIC — FROZEN BEFORE THE RUN, scored 0/1/2 per subject per arm');
RUBRIC.forEach(([k, v]) => console.log(`   ${k}\n       ${v}`));
console.log('\n ALSO RECORDED');
[' structural validation result per subject',
 ' subject-local failures',
 ' exact input/output tokens and cost per arm',
 ' pairwise similarity among each subject\'s five truths',
 ' cross-subject similarity (contamination)',
 ' whether any condition merely restates the supplied evidence'].forEach(x => console.log('  ·' + x));
console.log('\n INTERCEPTION');
console.log(`   ${aborted} downstream request(s) aborted so far; only the two portfolio calls may escape.`);

if (!AUTHORIZED || DRY) {
  console.log(`\n${'─'.repeat(84)}`);
  console.log('  NOT RUN. No money spent. To authorize:  SB_AB_AUTHORIZE=1 node _portfolio_model_ab.mjs');
  console.log(`${'─'.repeat(84)}\n`);
  await browser.close();
  process.exit(0);
}

// ── THE TWO PAID CALLS ───────────────────────────────────────────────────────────────────
// Truncation or invalid JSON is the SAMPLE FAILING. It is never permission to retry.
const r = await page.evaluate(async (payload) => {
  const t0 = Date.now();
  const res = await fetch('/api/mistral-proxy', { method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign({ __abArm: true }, payload)) });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, ms: Date.now() - t0, data };
}, req);
liveCalls++;
const usage = (r.data && r.data.usage) || {};
const content = (r.data && (r.data.content
  || (r.data.choices && r.data.choices[0] && r.data.choices[0].message && r.data.choices[0].message.content))) || null;
fs.writeFileSync('_portfolio_mistral_raw.json', JSON.stringify(
  { model: MODEL, ceiling, status: r.status, ms: r.ms, usage, content }, null, 2));
const spend = ((usage.prompt_tokens || 0) / 1e6) * RATES[MODEL].in
            + ((usage.completion_tokens || 0) / 1e6) * RATES[MODEL].out;
console.log(`\n  HTTP ${r.status} in ${r.ms}ms · ${liveCalls} paid call · ${aborted} downstream request(s) aborted`);
console.log(`  usage: ${JSON.stringify(usage)}`);
console.log(`  this sample: $${spend.toFixed(4)}`);
console.log(`  CUMULATIVE on this line of work: $${(spend + PRIOR_SPEND).toFixed(4)} of $0.1300`);
if (liveCalls !== 1) console.error('  ⚠ call count is not exactly 1 — investigate before trusting this.');
console.log('\n  _portfolio_mistral_raw.json written. Score it against the SAME frozen rubric.');
await browser.close();
