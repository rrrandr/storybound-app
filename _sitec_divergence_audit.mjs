// SITE-C DIVERGENCE AUDIT (free — static, no API calls, no story gen).
//
// WHY: the speculative preload path (preloadNextScene, app.js ~289620) builds its OWN author
// payload (fullSys @~289884) and logs "[SPECULATIVE] Preload complete (byte-equivalent to real
// turn)". A committed speculative scene ships VERBATIM as the real Scene N+1
// (`raw = speculativeScene.text`, ~285289) with no regen. So if Site C is NOT byte-equivalent,
// clickthrough players silently receive prose authored by a DIFFERENT author than typing players.
//
// WHAT THIS MEASURES: the per-turn directive layer only. Both paths share `state.sysPrompt`
// (the 1h-cached base, built ~243178) — that shared base is NOT expanded here. The divergence
// reported is therefore in the TURN-SPECIFIC steer: precisely the layer that encodes what
// reality the scene is being written into.
//
// METHOD: extract both `const fullSys = ...` expressions with a balanced scanner, transitively
// expand rollup locals (`sceneDirectives`, `_persistentStableTail`, `_binl_*`, `spec*Block`),
// strip comments, then diff the set of terminal directive BUILDERS invoked on each path.
//
// Run: node _sitec_divergence_audit.mjs
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');

function rhsFrom(eqIdx) {
  let i = eqIdx + 1, tick = 0, paren = 0, brace = 0, bracket = 0;
  const out = [];
  while (i < src.length) {
    const c = src[i], prev = src[i - 1];
    if (c === '`' && prev !== '\\') tick ^= 1;
    if (!tick) {
      if (c === '(') paren++; else if (c === ')') paren--;
      else if (c === '{') brace++; else if (c === '}') brace--;
      else if (c === '[') bracket++; else if (c === ']') bracket--;
      else if (c === ';' && !paren && !brace && !bracket) break;
    }
    out.push(c); i++;
  }
  return out.join('');
}

const defRx = /\b(?:const|let|var)\s+(_binl_[A-Za-z0-9_]+|sceneDirectives|_persistentStableTail|spec[A-Za-z0-9_]*Block|spec[A-Za-z0-9_]*Directive|_spec[A-Za-z0-9_]+|_[A-Za-z0-9_]*Block|_[A-Za-z0-9_]*Directive)\s*=/g;
const defs = new Map();
let m;
while ((m = defRx.exec(src))) {
  const name = m[1];
  const eq = src.indexOf('=', m.index + m[0].length - 1);
  const rhs = rhsFrom(eq);
  if (!defs.has(name) || rhs.length > defs.get(name).length) defs.set(name, rhs);
}

const realIdx = src.indexOf('const fullSys = !_buildHeavy');
const specIdx = src.indexOf('const fullSys = state.sysPrompt + _specCacheSentinel');
if (realIdx < 0 || specIdx < 0) {
  console.error('FAIL: could not locate both fullSys assembly sites (app.js refactored?)');
  process.exit(1);
}
let real = rhsFrom(src.indexOf('=', realIdx));
let spec = rhsFrom(src.indexOf('=', specIdx));

function expand(txt) {
  for (let pass = 0; pass < 6; pass++) {
    let changed = false;
    for (const [name, rhs] of defs) {
      const rx = new RegExp('(?<![A-Za-z0-9_$])' + name.replace(/\$/g, '\\$') + '(?![A-Za-z0-9_$])', 'g');
      if (rx.test(txt) && !rhs.includes(name)) { txt = txt.replace(rx, ' ' + rhs + ' '); changed = true; }
    }
    if (!changed) break;
  }
  return txt;
}
const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
real = strip(expand(real)); spec = strip(expand(spec));

const BRX = /\b(build[A-Z][A-Za-z0-9_]*|_build[A-Z][A-Za-z0-9_]*)\s*\(/g;
const setOf = (t) => new Set((t.match(BRX) || []).map(s => s.replace(/\s*\($/, '')));
const R = setOf(real), S = setOf(spec);
const onlyReal = [...R].filter(k => !S.has(k)).sort();
const onlySpec = [...S].filter(k => !R.has(k)).sort();
const shared = [...R].filter(k => S.has(k));

console.log('── SITE-C DIVERGENCE (per-turn directive layer; shared state.sysPrompt base excluded) ──');
console.log('builders on REAL turn path : ' + R.size);
console.log('builders on SPECULATIVE path: ' + S.size);
console.log('shared                      : ' + shared.length);
console.log('');
console.log('ONLY on REAL (' + onlyReal.length + ') — the speculative author never receives these:');
onlyReal.forEach(k => console.log('  - ' + k));
console.log('');
console.log('ONLY on SPECULATIVE (' + onlySpec.length + '):');
onlySpec.forEach(k => console.log('  + ' + k));
console.log('');

// The disposability clauses: orders the speculative author gets that the real author never does.
const DISPOSABILITY = [
  'Do NOT advance storyturn state.',
  'Do NOT introduce irreversible events',
  'Do NOT commit narrative outcomes.',
  'This scene must be narratively disposable.'
];
const present = DISPOSABILITY.filter(c => spec.includes(c) || src.includes(c));
console.log('DISPOSABILITY CLAUSES in the speculative payload: ' + present.length + '/' + DISPOSABILITY.length);
present.forEach(c => console.log('  ! ' + c));
console.log('');
console.log(shared.length === R.size && R.size === S.size && present.length === 0
  ? 'PARITY: Site C is byte-equivalent to the real turn.'
  : 'NO PARITY: the "[SPECULATIVE] Preload complete (byte-equivalent to real turn)" log is FALSE.');
