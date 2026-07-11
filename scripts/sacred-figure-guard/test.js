// Deterministic sacred-figure-guard tests. No network, no models.
//   node scripts/sacred-figure-guard/test.js
'use strict';
const G = require('../../config/sacred-figure-guard.js');

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) pass++; else { fail++; console.error('  ✗ FAIL:', msg); } }

// ── Prophet Muhammad: SHOULD BLOCK (figure/context) ──
[
  'the Prophet Muhammad',
  'Prophet Mohammed',
  'a portrait of the Prophet Muhammad (PBUH)',
  'Muhammad, peace be upon him, stood at the gate',
  'Muhammad, the final prophet, addressed the crowd',
  'the Messenger of Allah',
  'the prophet of Islam',
  'Mahound',                                  // always-derogatory reference to the Prophet
  'the seal of the prophets',
  'depict Mohammed the prophet in a garden',
].forEach((s) => ok(G.detectProphetMuhammad(s) === true, `should BLOCK: "${s}"`));

// ── Ordinary Mohammed: SHOULD ALLOW (bare name, no prophet-role context) ──
[
  'Mohammed the detective lit a cigarette',
  'Muhammad Ali floated like a butterfly',
  'a man named Mohammed in Cairo',
  'Mohammed Salah scored in the 90th minute',
  'Mohammed and his friend flew to Mecca for the weekend',   // Mecca is geography, not a prophet-role marker
  'CEO Mohammed al-Rashid signed the deal',
  'her love interest, a doctor named Muhammad',
  '',
  null,
  undefined,
].forEach((s) => ok(G.detectProphetMuhammad(s) === false, `should ALLOW: "${s}"`));

// ── detectSacredFigure: other figures (containment) ──
ok(G.detectSacredFigure('the Prophet Muhammad') === 'muhammad', 'muhammad routed through sacred detector');
ok(G.detectSacredFigure('Jesus Christ walked the shore') === 'jesus', 'Jesus Christ → jesus');
ok(G.detectSacredFigure('the story of Moses parted the sea') === 'moses', 'Moses figure → moses');
ok(G.detectSacredFigure('the Buddha sat beneath the tree') === 'buddha', 'the Buddha → buddha');
ok(G.detectSacredFigure('Lord Krishna played his flute') === 'krishna', 'Krishna → krishna');
ok(G.detectSacredFigure('the Virgin Mary appeared') === 'virgin_mary', 'Virgin Mary → virgin_mary');

// ── detectSacredFigure: ordinary names SHOULD NOT trip (allow) ──
ok(G.detectSacredFigure('a boy named Jesús from Madrid') === null, 'ordinary Jesús not flagged');
ok(G.detectSacredFigure('Moses the accountant filed taxes') === null, 'ordinary Moses not flagged');
ok(G.detectSacredFigure('a normal romance with no figures') === null, 'no figure → null');

// ── detectMuhammadName: bare-name block (character-name field) ──
['Muhammad','Mohammed','Mohamed','Mohammad','Muhammed','Mohamad','Muhamad','Mahammad','Muhammad Ali','the boy Mohammed']
  .forEach((s) => ok(G.detectMuhammadName(s) === true, `name SHOULD block: "${s}"`));
// Other Muslim names + lookalikes must NOT be caught (Roman: only the one name).
['Ahmed','Ahmad','Nassim','Mahmoud','Muhannad','Hamid','Mohsen','Ali','Omar','Yusuf','Amir','Mamad','']
  .forEach((s) => ok(G.detectMuhammadName(s) === false, `name should ALLOW: "${s}"`));

// ── refusal messages present ──
ok(typeof G.PROPHET_MUHAMMAD_REFUSAL === 'string' && G.PROPHET_MUHAMMAD_REFUSAL.length > 20, 'prophet refusal exported');
ok(typeof G.MUHAMMAD_NAME_REFUSAL === 'string' && G.MUHAMMAD_NAME_REFUSAL.length > 10, 'name refusal exported');

console.log(`\nSACRED-FIGURE-GUARD: ${pass} passed, ${fail} failed`);
if (fail) { console.error('RESULT: ✗ FAIL'); process.exit(1); }
console.log('RESULT: ✓ PASS — Prophet-figure blocked, ordinary Mohammed allowed, other figures detected for containment.');
