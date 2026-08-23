// SEMANTIC DEAD CODE AUDIT — not "is this function called" but
// "can I prove this creative instruction has a live path to the model?"
//
//   1 authored-content delivery   DEFINED -> DELIVERED -> PROVEN in a real payload
//   2 spine field consumers       writer / consumer / payload
//   3 runtime payload coverage    expected canon vs actually present
//   4 stale canon vocabulary      old words outliving the mechanic they described
//
// usage: node _delivery_audit.mjs [_validate_out/RUNDIR]
import fs from 'fs';
import { DIRECTIVES, carries } from './_directive_registry.mjs';
const src = fs.readFileSync('public/app.js', 'utf8');
const dir = process.argv[2] || '_validate_out/testB';
let payloadFile = '(none)';
const payload = (() => {
  const found = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter(f => /^payload_\d+\.txt$/.test(f))
        .sort((a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10))
    : [];
  if (!found.length) return '';
  // The LARGEST payload, not the last: a run emits short auxiliary author calls too, and
  // auditing one of those reports every canon layer missing. The full scene prompt is the
  // biggest by a wide margin.
  found.sort((x, y) => fs.statSync(`${dir}/${x}`).size - fs.statSync(`${dir}/${y}`).size);
  payloadFile = found[found.length - 1];
  return fs.readFileSync(`${dir}/${payloadFile}`, 'utf8');
})();
const P = payload.toLowerCase();
// STALENESS GUARD. A payload captured before a rule was written cannot prove the rule
// is undelivered — it proves the capture is old. Without this the audit reports
// phantom gaps every time canon moves.
let stale = false;
try {
  const pf = payloadFile !== '(none)' ? `${dir}/${payloadFile}` : null;
  if (pf) stale = fs.statSync(pf).mtimeMs < fs.statSync('public/app.js').mtimeMs;
} catch (_) {}
const has = t => P.includes(String(t).toLowerCase());
// Every non-author payload concatenated: if a directive is here but not in the Author's,
// it was DELIVERED_TO_WRONG_LAYER — someone got it, just not the layer deciding.
const otherText = (() => {
  try {
    return fs.readdirSync(dir).filter(f => /^nonauthor_\d+\.txt$/.test(f))
      .map(f => fs.readFileSync(`${dir}/${f}`, 'utf8')).join('\n');
  } catch (_) { return ''; }
})();
const mark = b => (b ? 'yes' : 'NO ');
let issues = 0;

console.log(`\n${'='.repeat(76)}`);
console.log(`SEMANTIC DELIVERY AUDIT   ${dir}/${payloadFile} (${payload.length} chars)`);
console.log('='.repeat(76));

// 1. AUTHORED CONTENT — every creative instruction that MUST reach the Author
const AUTHORED = DIRECTIVES.map(d => [d.name, d.defined, d.probe]);
// A stub-based capture is ASYMMETRIC evidence: anything PRESENT genuinely reached the
// payload, but anything ABSENT may simply be a layer the stub never triggered. Say so
// loudly rather than letting a reader treat "NO" as a finding.
let meta = null;
try { meta = JSON.parse(fs.readFileSync(`${dir}/capture_meta.json`, 'utf8')); } catch (_) {}

console.log('\n1. AUTHORED CONTENT  (defined in app.js -> proven in payload)\n');
if (stale) console.log('   ** PAYLOAD PREDATES public/app.js — "NO" rows below may be staleness, not gaps **\n');
if (meta && meta.stubbed) {
  console.log('   ** STUB CAPTURE — "yes" is proof of delivery; "NO" is NOT proof of a gap. **');
  if (meta.canonGateFires === false)
    console.log('   ** The content gate (_ltScene) is EMPTY here, so every content-gated canon');
  console.log('   ** layer is absent BY CONSTRUCTION. Confirm those against a real payload. **\n');
}
console.log('   instruction                    defined  proven');
for (const [name, defRx, probe] of AUTHORED) {
  const defined = defRx.test(src);
  const proven = payload ? has(probe) : null;
  const bad = defined && proven === false;
  if (bad) issues++;
  const p = proven === null ? ' -  ' : mark(proven);
  console.log(`   ${name.padEnd(30)} ${mark(defined)}      ${p}${bad ? '  <- DECLARED, NOT DELIVERED' : ''}`);
}

// 1b. DELIVERED TO WRONG LAYER — the defect class this audit was blind to.
//     Unused: nobody got it.  Wrong layer: someone got it, but not the decision-maker.
console.log('\n1b. DELIVERED TO WRONG LAYER  (author vs other layers)\n');
if (!otherText) {
  console.log('   (no nonauthor_*.txt in ' + dir + ' — recapture with _payload_capture_free.mjs)');
} else {
  let wrong = 0;
  console.log('   directive                      author  other   verdict');
  for (const d of DIRECTIVES) {
    const inAuthor = carries(payload, d.probe);
    const inOther = carries(otherText, d.probe);
    if (inAuthor || !inOther) continue;                 // only the asymmetric case is news
    if (!d.expect.includes('author')) continue;         // author was never the target
    wrong++; issues++;
    console.log(`   ${d.name.padEnd(30)} NO      yes     <- WRONG LAYER`);
  }
  if (!wrong) console.log('   none — every directive the Author needs, the Author has');
}

// 2. SPINE FIELDS — a writer with no consumer is an unread container
console.log('\n2. SPINE FIELDS  (writer -> consumer -> payload)\n');
const planBlock = (() => {
  const i = src.indexOf('STARTER_PLANS = {');
  let d = 0, k = src.indexOf('{', i);
  for (; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) break; } }
  return src.slice(i, k + 1);
})();
const fields = [...new Set([...planBlock.matchAll(/\n\s{4,}([a-zA-Z_][\w]*)\s*:/g)].map(m => m[1]))]
  .filter(f => !['n', 'goal'].includes(f));
console.log('   field                        consumers  payload');
for (const f of fields) {
  const total = (src.match(new RegExp(`\\b${f}\\b`, 'g')) || []).length;
  const declared = (planBlock.match(new RegExp(`${f}\\s*:`, 'g')) || []).length;
  const consumers = total - declared;
  const sample = ((planBlock.match(new RegExp(`${f}:\\s*'([^']{12,50})`)) || [])[1] || '').trim();
  const inPayload = payload && sample ? has(sample) : null;
  const bad = consumers <= 0;
  if (bad) issues++;
  console.log(`   ${f.padEnd(28)} ${(bad ? 'NONE' : String(consumers)).padEnd(9)}  ${inPayload === null ? ' -  ' : mark(inPayload)}${bad ? '  <- UNREAD CONTAINER' : ''}`);
}

// 3. RUNTIME COVERAGE — what the Author actually received, by group
console.log('\n3. RUNTIME COVERAGE  (grouped)\n');
if (!payload) {
  console.log('   (no payload captured in ' + dir + ')');
} else {
  const groups = {
    'Fate physics': ['only what was offered', 'three channels', 'wish-twist sequence', 'exacting'],
    'Character':    ['rotate mechanisms', 'who gets character', 'attraction is a judgement'],
    'Spine':        ['must be present', 'forbidden inventions', 'player decision at the end'],
    'World':        ['dohkar', 'weave-script', 'spiralgrass', 'first favored'],
  };
  for (const [g, probes] of Object.entries(groups)) {
    const missing = probes.filter(p => !has(p));
    issues += missing.length;
    console.log(`   ${g.padEnd(15)} ${probes.length - missing.length}/${probes.length}   ${missing.map(m => 'missing:' + m).join('  ')}`);
  }
}

// 4. STALE CANON VOCABULARY — the danger is not Grok ignoring canon,
//    it is Grok faithfully obeying a contradictory fragment left behind.
const RETIRED = [
  // NOT retired globally: the blank check ("take whatever it costs") is a live, central
  // Fatelands mechanic for a desperate wisher. What was retired is narrower — an OPEN
  // price inside the FIRST SACRIFICE rite, which requires a named offering. Scope the
  // scan to the seed/spine, never to the general wish canon.
  ['open price in the First Sacrifice', /(?:First Sacrifice|starter_first_sacrifice)[\s\S]{0,900}?(?:OPEN, unspecified price|take whatever it costs)/i, 'the rite requires a NAMED offering (5f/5g)'],
  ['"an elder" as an office',  /\ban elder\b(?!\s*(?:Dohkar|Profer|Chayr))\s*(?:\w+\s+){0,2}(?:stepped|rose|presided|declared|pronounced|raised (?:his|her|their) hands?)/i, 'replaced by named offices (5l)'],
  ['Fate punishes / is cruel', /Fate (?:punish|mock|delight)|cruelty of Fate/i,   'Fate is exacting, not malicious (5h)'],
  // In-domain when the Order's declared currency IS beauty/ornament — that is the rule
  // working, not breaking. Only flag a colour-drain with no aesthetic currency near it.
  ['colour-drain off-domain',  /(?<!currency:[\s\S]{0,400})(?:colou?r (?:drained|drains|fled)|went bone-white)/i, 'price stays in the offered domain (5i/5n)'],
  ['seal / binding machinery', /broke the (?:seal|circle)|the binding (?:broke|failed)/i, 'the rite has no machinery'],
];
console.log('\n4. STALE CANON VOCABULARY  (old words outliving their mechanic)\n');
// Strip the canon's own worked negative examples before scanning — the rules TEACH by
// showing the wrong form, and counting those is how a linter flags its own textbook.
const teaching = /(?:\u2717|\bBAD:|FORBIDDEN:|\bNOT allowed|forbidden outright|banned|replaced by|never write|do NOT use)[^\n]{0,320}/gi;
const srcNoExamples = src.replace(teaching, ' ');
const payNoExamples = payload.replace(teaching, ' ');
for (const [name, rx, replacedBy] of RETIRED) {
  const inSrc = rx.test(srcNoExamples);
  const inPay = payload ? rx.test(payNoExamples) : false;
  const bad = inSrc || inPay;
  if (bad) issues++;
  const where = [inSrc ? 'app.js' : null, inPay ? 'payload' : null].filter(Boolean).join('+');
  console.log(`   ${name.padEnd(26)} ${bad ? 'FOUND' : 'clear'}${bad ? `  in ${where} — ${replacedBy}` : ''}`);
}

console.log(`\n${'='.repeat(76)}`);
console.log(`${issues} finding(s).  "Declared" is not "delivered"; "delivered" is not "obeyed".`);
console.log('Some hits are deliberate — feature flags, CG-mode blocks, famous_fate paths.');
console.log('This is a TRIAGE LIST, not a bug list.\n');
