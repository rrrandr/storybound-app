const fs = require('fs');
const P = 'public/app.js';
let lines = fs.readFileSync(P, 'utf8').split('\n');
const L = n => lines[n-1]; // 1-indexed accessor

// --- assert boundaries (1-indexed) ---
function assert(cond, msg){ if(!cond){ console.error('ASSERT FAIL:', msg); process.exit(1); } }
assert(/async function _generatePCBodyBible\(\)/.test(L(210566)), 'PC start 210566');
assert(/window\._generatePCBodyBible = _generatePCBodyBible;/.test(L(211100)), 'PC expose 211100');
assert(/async function _generateLIBodyBible\(\)/.test(L(211333)), 'LI start 211333');
assert(/window\._generateLIBodyBible = _generateLIBodyBible;/.test(L(212120)), 'LI expose 212120');
assert(/async function _generateAntagonistBodyBible\(\)/.test(L(215364)), 'Antag start 215364');
assert(/window\._generateAntagonistBodyBible = _generateAntagonistBodyBible;/.test(L(215548)), 'Antag expose 215548');
assert(/window\._deriveDeepTrio = _deriveDeepTrio;/.test(L(207181)), 'insertion anchor 207181');

// --- extract blocks (slice end is exclusive; 1-indexed a..b => slice(a-1,b)) ---
const pc    = lines.slice(210566-1, 211100);
const li    = lines.slice(211333-1, 212120);
const antag = lines.slice(215364-1, 215548);
console.error('extracted: pc='+pc.length+' li='+li.length+' antag='+antag.length);
assert(pc.length===535 && li.length===788 && antag.length===185, 'block sizes');

// --- remove bottom-up (so earlier indices stay valid) ---
lines.splice(215364-1, 185);   // antag
lines.splice(211333-1, 788);   // li
lines.splice(210566-1, 535);   // pc

// --- insert at module scope, after line 207182 (the blank after deriveDeepTrio expose) ---
const banner = [
  '',
  '  // ── Body-Bible generators HOISTED to module scope (audit fix R1, 2026-06-23) ──',
  '  // The CG screenplay-native path (_completeStagedSceneFromScreenplay) bypasses',
  '  // handleBeginStory, where these used to be defined+window-exposed. Defining them',
  '  // at module scope + exposing at init lets _ensureCGScaffold (181072) actually fire',
  '  // them, so CG gets the same PC/LI/Antagonist Bibles literary already had.',
];
const moved = banner.concat(pc, [''], li, [''], antag, ['']);
lines.splice(207182, 0, ...moved);

fs.writeFileSync(P, lines.join('\n'));
console.error('WROTE app.js, new line count='+lines.length);
