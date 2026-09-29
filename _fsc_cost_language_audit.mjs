// COST-LANGUAGE AUDIT of the ENTIRE terminal author payload. Provider-free, no network.
//
// A run closed on "The cost of either path remains uncounted" against a sealed COST: none, and the
// Fate brief never mentions cost. Before calling that model variance, the other ~250KB of the author
// request has to be cleared. Every occurrence is traced back to a source line in public/app.js.
import fs from 'fs';
import { preflight } from './_fsc_preflight_control.mjs';

const TERMS = [
  ['cost',        /\bcosts?\b|\bcostly\b/gi],
  ['price',       /\bprices?\b/gi],
  ['debt',        /\bdebts?\b/gi],
  ['toll',        /\btolls?\b/gi],
  ['payment',     /\bpay(?:ment|ments|s|ing)?\b/gi],
  ['pay for',     /\bpay(?:s|ing)? for\b/gi],
  ['tradeoff',    /\btrade[- ]?offs?\b/gi],
  ['sacrifice',   /\bsacrific\w+/gi],
  ['consequence', /\bconsequenc\w+/gi],
  ['reckoning',   /\breckoning\b/gi],
  ['what it takes', /\bwhat it takes\b/gi],
  ['at stake',    /\bat stake\b|\bstakes?\b/gi],
  ['owe',         /\bowe[sd]?\b|\bowing\b/gi],
  ['forfeit',     /\bforfeit\w*/gi],
  ['penalty',     /\bpenalt\w+/gi],
  ['uncounted',   /\buncounted\b|\bunnamed cost\b/gi]
];

// Story-intrinsic uses that are NOT cost directives: the rite is literally named a First Sacrifice,
// its participant a Sacrificiant, and "stakes" is the app-wide dramatic-pressure vocabulary.
const INTRINSIC = [
  /First Sacrifice/i, /Sacrificiant/i, /\bsacrifice (?:day|rite|ground|site)\b/i,
  /structural_stakes_engine/i, /sceneCharge/i, /high[- ]stakes/i
];

const pre = await preflight({ wish: 'I want this to have never happened.',
  expect: 'unm.time_gives_way', expectChoicePending: true, expectInsideReplacementPOV: true });
const raw = pre.body;
const text = raw.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\u2019/g, '’');
const src = fs.readFileSync('public/app.js', 'utf8').split('\n');

// Locate a payload snippet's source line in app.js by matching a distinctive fragment.
function sourceOf(snippet) {
  const probe = snippet.replace(/\s+/g, ' ').trim().slice(0, 46);
  if (probe.length < 14) return null;
  for (let i = 0; i < src.length; i++) {
    if (src[i].replace(/\s+/g, ' ').indexOf(probe) >= 0) return i + 1;
  }
  // second chance on a shorter fragment
  const short = probe.slice(0, 26);
  for (let i = 0; i < src.length; i++) {
    if (short.length > 12 && src[i].replace(/\s+/g, ' ').indexOf(short) >= 0) return i + 1;
  }
  return null;
}

const lines = text.split('\n');
const findings = [];
for (const [label, rx] of TERMS) {
  for (const ln of lines) {
    rx.lastIndex = 0;
    if (!rx.test(ln)) continue;
    const intrinsic = INTRINSIC.some(i => i.test(ln));
    findings.push({ label, line: ln.trim(), intrinsic });
  }
}
// De-duplicate identical payload lines, keeping every term that matched.
const byLine = new Map();
for (const f of findings) {
  const k = f.line;
  if (!byLine.has(k)) byLine.set(k, { line: f.line, terms: new Set(), intrinsic: f.intrinsic });
  byLine.get(k).terms.add(f.label);
}
const rows = [...byLine.values()].map(r => ({ ...r, terms: [...r.terms], src: sourceOf(r.line) }));

console.log('=== COST-LANGUAGE AUDIT — FULL TERMINAL AUTHOR PAYLOAD (no network, $0) ===\n');
console.log('payload: ' + raw.length + ' bytes, ' + lines.length + ' lines\n');

const directive = rows.filter(r => !r.intrinsic);
const intrinsic = rows.filter(r => r.intrinsic);

console.log('── A. NOT story-intrinsic — these are the ones that can prime a cost line ──\n');
directive.sort((a, b) => (a.src || 0) - (b.src || 0)).forEach(r => {
  console.log('  [' + r.terms.join(',') + ']  app.js:' + (r.src || '?'));
  console.log('      ' + r.line.slice(0, 200) + (r.line.length > 200 ? ' …' : ''));
});
console.log('\n  ' + directive.length + ' non-intrinsic payload lines carry cost-shaped language.');

console.log('\n── B. story-intrinsic (First Sacrifice / Sacrificiant / stakes vocabulary) ──');
console.log('  ' + intrinsic.length + ' lines, not listed in full. Sample sources: '
  + [...new Set(intrinsic.map(r => r.src).filter(Boolean))].slice(0, 12).join(', '));

fs.writeFileSync('_fsc_cost_audit.json', JSON.stringify({ bytes: raw.length,
  nonIntrinsic: directive, intrinsicCount: intrinsic.length }, null, 2));
console.log('\n  full record: _fsc_cost_audit.json');
