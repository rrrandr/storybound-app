// ══════════════════════════════════════════════════════════════════════════════════════════
//  CONSERVATIVE AUTHORIZATION BOUND — NOT A TOKENIZER MEASUREMENT
//
//  No Mistral tokenizer is installed and none will be: fetching one is a network call and a
//  local copy may not match the provider's deployed tokenizer version anyway. So the bound is
//  built from something that cannot drift — the actual UTF-8 BYTES of the constructed maximum
//  request — priced at ONE INPUT TOKEN PER BYTE.
//
//  Bytes, not characters. A tokenizer never emits more tokens than bytes, but it certainly can
//  emit more than CHARACTERS: one em-dash or curly quote is three bytes and this codebase's
//  prompts are full of them. Character-counting would have looked conservative and not been.
//
//  The response side is genuinely hard: max_tokens is enforced by the API.
// ══════════════════════════════════════════════════════════════════════════════════════════
import fs from 'fs';

const RATE_IN = 0.15, RATE_OUT = 0.60;          // mistral-small-latest, per 1M tokens
const PROTOCOL_OVERHEAD_TOKENS = 200;           // role wrappers, JSON envelope, chat scaffolding
const B = (s) => Buffer.byteLength(String(s || ''), 'utf8');

// ── THE CONSTRUCTED MAXIMA, from real artefacts where they exist ──
const insp = JSON.parse(fs.readFileSync('_audit_out/scene1_canon_inspection.json', 'utf8'));
const privView = insp.auditText || '';
const scene = fs.existsSync('_grok_isolated/04_grok_draft.md')
  ? fs.readFileSync('_grok_isolated/04_grok_draft.md', 'utf8') : '';

const SCENE_CAP_CHARS = 24000;                  // the auditor's own input cap
const scenePad = 'x'.repeat(SCENE_CAP_CHARS);   // a scene AT the cap
const AUDIT_INSTRUCTIONS = 1400;                // measured from the intercepted request
const REPAIR_INSTRUCTIONS = 1800;               // repair schema + constraints, generous
const REPAIR_PARAGRAPHS_CHARS = 6000;           // affected paragraphs + surrounding context

const calls = [
  { name: 'initial audit',      inBytes: B(privView) + B(scenePad) + B('y'.repeat(AUDIT_INSTRUCTIONS)),  outMax: 400 },
  { name: 'targeted repair',    inBytes: B(privView) + B('y'.repeat(REPAIR_PARAGRAPHS_CHARS + REPAIR_INSTRUCTIONS)), outMax: 900 },
  { name: 'verification audit', inBytes: B(privView) + B(scenePad) + B('y'.repeat(AUDIT_INSTRUCTIONS)),  outMax: 400 },
];

const measured = {
  privateViewBytes: B(privView),
  realSceneBytes: B(scene),
  sceneAtCapBytes: B(scenePad),
};

let perScene = 0;
const rows = calls.map(c => {
  const inTok = c.inBytes + PROTOCOL_OVERHEAD_TOKENS;      // 1 token per byte + overhead
  const cost = inTok / 1e6 * RATE_IN + c.outMax / 1e6 * RATE_OUT;
  perScene += cost;
  return { ...c, inTok, inCost: inTok / 1e6 * RATE_IN, outCost: c.outMax / 1e6 * RATE_OUT, cost };
});

const L = console.log;
L(`\n${'═'.repeat(84)}\nCONSERVATIVE AUTHORIZATION BOUND — NOT tokenizer-measured\n${'═'.repeat(84)}`);
L(` method : UTF-8 bytes of the constructed maximum request, priced at 1 input token per byte,`);
L(`          plus ${PROTOCOL_OVERHEAD_TOKENS} tokens protocol overhead. Response at its hard max_tokens.`);
L(`          Bytes, not characters — one em-dash is 3 bytes, so per-character would NOT be conservative.`);
L(`\n measured inputs`);
L(`   auditor_private view      : ${measured.privateViewBytes} bytes (real Scene-1 canon)`);
L(`   a real finished scene     : ${measured.realSceneBytes} bytes`);
L(`   scene AT the 24,000 cap   : ${measured.sceneAtCapBytes} bytes`);
L(`\n ${'call'.padEnd(20)} ${'in-tok bound'.padStart(13)} ${'in $'.padStart(12)} ${'out $'.padStart(11)} ${'per call $'.padStart(12)}`);
rows.forEach(r => L(`   ${r.name.padEnd(18)} ${String(r.inTok).padStart(13)} ${r.inCost.toFixed(8).padStart(12)} ${r.outCost.toFixed(8).padStart(11)} ${r.cost.toFixed(8).padStart(12)}`));
L(`\n per scene, ALL THREE (100% contradiction) : $${perScene.toFixed(8)}`);
L(` 20-scene issue, 100% contradiction rate   : $${(perScene * 20).toFixed(6)}`);
L(`\n for comparison, the no-contradiction path (audit only, all 20 scenes):`);
L(`   20 × initial audit                      : $${(rows[0].cost * 20).toFixed(6)}`);
L(`${'─'.repeat(84)}\n`);

fs.writeFileSync('_audit_out/cost_bound.json', JSON.stringify({
  method: 'utf8-byte bound, 1 input token per byte + protocol overhead; response at hard max_tokens',
  label: 'conservative authorization bound (NOT tokenizer-measured)',
  rateIn: RATE_IN, rateOut: RATE_OUT, protocolOverheadTokens: PROTOCOL_OVERHEAD_TOKENS,
  measured, calls: rows, perSceneAllThree: perScene, twentySceneWorstCase: perScene * 20,
  twentySceneAuditOnly: rows[0].cost * 20,
}, null, 2));
