// $0 GATE REGRESSION SUITE — validates the LAYERED WISH CANON activation contracts.
// Extracts the ACTUAL directive functions + gate regexes verbatim from public/app.js and runs seeds through them.
// No LLM, no story-gen. Tests: does each layer fire exactly when its contract says it should (and stay silent otherwise)?
const fs = require('fs');
const lines = fs.readFileSync('public/app.js', 'utf8').split('\n');

function fnSrc(name) {
  const s = lines.findIndex(l => l.includes('function ' + name + '('));
  if (s < 0) throw new Error('fn not found: ' + name);
  let e = s;
  for (let i = s; i < lines.length; i++) { if (lines[i].includes('window.' + name + ' =')) { e = i; break; } }
  return lines.slice(s, e + 1).join('\n');
}
function rxSrc(name) {
  const l = lines.find(l => l.includes('var ' + name + ' = /'));
  if (!l) throw new Error('rx not found: ' + name);
  return l.trim();
}

const RXES = ['_FATELANDS_WISH_PRESENT_RX','_FATELANDS_WISH_RESOLVE_RX','_FATELANDS_COMPOSITE_RX','_FATELANDS_GRANTER_RX','_FATELANDS_WISHSOCIETY_RX','_WISH_LIMITS_RX','_CRAFT_PARABLE_RX'];
const FNS = ['_buildFatelandsWishCoreDirective','_buildFatelandsWishAdjudicationDirective','_buildFatelandsCompositeDirective','_buildFatelandsGrantersDirective','_buildFatelandsWishFactionsDirective','_buildFatelandsWishLimitsDirective','_buildFatelandsCraftParableDirective'];

// Build an isolated sandbox with only what these functions touch (window stub + the extracted defs).
const preamble = 'var window = {};\n';
const src = preamble + RXES.map(rxSrc).join('\n') + '\n' + FNS.map(fnSrc).join('\n') + '\n' +
  'module.exports = { core:_buildFatelandsWishCoreDirective, adj:_buildFatelandsWishAdjudicationDirective, composite:_buildFatelandsCompositeDirective, granters:_buildFatelandsGrantersDirective, factions:_buildFatelandsWishFactionsDirective, limits:_buildFatelandsWishLimitsDirective, parable:_buildFatelandsCraftParableDirective };\n';
const mod = { exports: {} };
new Function('module', src)(mod);
const D = mod.exports;

const LAYERS = ['core','adj','composite','granters','factions','limits','parable'];
function fired(seed) {
  return {
    core: !!D.core(seed, false),
    adj: !!D.adj(seed, false),
    composite: !!D.composite(seed),
    granters: !!D.granters(seed),
    factions: !!D.factions(seed),
    limits: !!D.limits(seed),
    parable: !!D.parable(seed),
  };
}
const m = b => b ? '✓' : '✗';
const row = o => LAYERS.map(k => k[0].toUpperCase()+k.slice(1).replace('Adj','Adj') + ' ' + m(o[k])).join('  ');

// name, seed, expected. Expected encodes the CONTRACT (what SHOULD fire), incl. negative-specialist checks.
const CASES = [
  { n:'1a Mention — warning', seed:'"Never wish for revenge," the old witch warned him.',
    exp:{core:1,adj:0,composite:0,granters:0,factions:0,limits:0,parable:0} },
  { n:'1b Mention — memory of a past wish', seed:"She still remembered the wish she'd made years ago, in the flooded chapel.",
    exp:{core:1,adj:0,composite:0,granters:0,factions:0,limits:0,parable:0} },
  { n:'2 Wish made & resolved in-scene', seed:'"I wish he would stay," she said aloud to the empty chapel, and Fate took the warmth from her hands as the price.',
    exp:{core:1,adj:1,composite:0,granters:0,factions:0,limits:0,parable:0} },
  { n:'3a Specialist — Veilweave (composite) + negative checks', seed:'"I wish this cloak were Veilweave," he told the artificer, offering a year of his sight.',
    exp:{core:1,adj:1,composite:1,granters:0,factions:0,limits:0,parable:0} },
  { n:'3b Specialist — resurrection (explicit wish)', seed:'"I wish you could bring her back," he begged Fate beside the grave.',
    exp:{core:1,adj:1,composite:0,granters:0,factions:0,limits:1,parable:0} },
  { n:'3c Specialist — granter transaction', seed:'She counted out a fistful of Fortunes and asked the First Favored to grant her wish.',
    exp:{core:1,adj:1,composite:0,granters:1,factions:0,limits:0,parable:0} },
  { n:'3d Specialist — scholar mention (no adjudication)', seed:'The Lytharyn scholar cited three centuries of wish-precedent over dinner.',
    exp:{core:1,adj:0,composite:0,granters:0,factions:1,limits:0,parable:0} },
  { n:'3e Specialist — grandiose formulation (parable)', seed:'"I wish to be king!" the boy declared, and the old wish-witch shook her head.',
    exp:{core:1,adj:1,composite:0,granters:0,factions:0,limits:0,parable:1} },
  // ── OVER-EAGER GUARDS (the class the suite caught in Limits): topic word present, NO wish → module must stay silent.
  { n:'4a Over-eager guard — funeral, no wish (Limits silent)', seed:'They buried him beside his father and mourned at the grave for three days.',
    exp:{core:0,adj:0,composite:0,granters:0,factions:0,limits:0,parable:0} },
  { n:'4b Over-eager guard — crowd, no wish (Limits silent)', seed:'The whole village gathered in the square for the harvest festival.',
    exp:{core:0,adj:0,composite:0,granters:0,factions:0,limits:0,parable:0} },
  { n:'4c Over-eager guard — repetition, no wish (Limits silent)', seed:'Every day she walked the same path to the shore and back.',
    exp:{core:0,adj:0,composite:0,granters:0,factions:0,limits:0,parable:0} },
  { n:'4d Positive — genuine memory-WISH (Limits fires)', seed:'"I wish I could forget her face," she whispered into the dark.',
    exp:{core:1,adj:1,composite:0,granters:0,factions:0,limits:1,parable:0} },
];

let pass = 0;
for (const c of CASES) {
  const act = fired(c.seed);
  const exp = {}; LAYERS.forEach(k => exp[k] = !!c.exp[k]);
  const ok = LAYERS.every(k => exp[k] === act[k]);
  if (ok) pass++;
  console.log('\n' + c.n);
  console.log('  seed:     ' + JSON.stringify(c.seed));
  console.log('  Expected: ' + row(exp));
  console.log('  Actual:   ' + row(act));
  if (!ok) {
    const diff = LAYERS.filter(k => exp[k] !== act[k]).map(k => k + ' (exp ' + m(exp[k]) + ' got ' + m(act[k]) + ')');
    console.log('  MISMATCH: ' + diff.join(', '));
  }
  console.log('  Result: ' + (ok ? 'PASS' : 'FAIL'));
}

// Diagnostic probe (NOT pass/fail): does the CORE gate cover a resurrection wish phrased WITHOUT a wish-word?
const bare = 'Bring her back, he begged, kneeling by the grave.';
const ba = fired(bare);
console.log('\n── DIAGNOSTIC (coverage probe, not scored) ──');
console.log('  seed: ' + JSON.stringify(bare));
console.log('  ' + row(ba));
console.log('  Note: Limits fires (resurrection), but Core fires=' + ba.core + '. If false, the CORE _FATELANDS_WISH_PRESENT_RX');
console.log('        does not include death/resurrect/bring-back tokens — a resurrection wish phrased without "wish/sacrifice/bargain"');
console.log('        would get the Limits module but NOT the Core honesty rules. Coverage question for Roman, NOT auto-fixed (freeze).');

console.log('\n════════════════════════════════════════');
console.log('SUITE: ' + pass + '/' + CASES.length + ' PASS');
process.exit(pass === CASES.length ? 0 : 1);
