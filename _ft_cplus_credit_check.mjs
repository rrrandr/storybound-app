// DOES AN EDIT-DELIVERED BEAT GET CREDITED, AND ONLY WHEN IT EARNED IT? (Roman 2026-11-18)
//
// Scene 3 measured the defect: the editor answered Dani's `practiced-face` frame with an applied
// edit, the sentence published, and the ledger still said
//   status "still due" · why "the C+ editor accepted no passage for this beat"
//
// This lifts the SHIPPED markDeliveredFromPage and drives it with Scene 3's OWN editor report
// and published page. Four arms, two of which must come back RED, because a credit gate that
// says yes to everything is worse than the bug.
import fs from 'node:fs';

const ROOT = '/Users/romantsukerman/storybound-app/';
let n = 0, bad = 0;
const ck = (nm, c, d) => { n += 1; if (!c) { bad += 1; console.log('  ✗ ' + nm + (d ? ('  — ' + String(d).slice(0, 260)) : '')); } else console.log('  ✓ ' + nm); };

// ── THE SHIPPED MODULE, NOT A COPY ───────────────────────────────────────────────────────
const src = fs.readFileSync(ROOT + 'public/cplus-frames.js', 'utf8');
const sandbox = { window: {}, console: { log() {}, warn() {} } };
sandbox.window.SB_CPLUS_FRAMES = undefined;
const fn = new Function('window', 'console', src + '\n;return window.SB_CPLUS_FRAMES;');
const API = fn(sandbox.window, sandbox.console);
if (!API || typeof API.markDeliveredFromPage !== 'function') {
  console.error('could not lift markDeliveredFromPage from the shipped module'); process.exit(2);
}
console.log('lifted markDeliveredFromPage from public/cplus-frames.js\n');

// ── SCENE 3'S OWN EVIDENCE ───────────────────────────────────────────────────────────────
const report = (() => {
  const log = fs.readFileSync(ROOT + '_ft_scene3_paid/LATEST/console.log', 'utf8');
  const line = log.split('\n').find((l) => l.indexOf('[CPLUS:EDITOR:REPORT]') !== -1);
  return JSON.parse(line.slice(line.indexOf('{')));
})();
const page = fs.readFileSync(ROOT + '_FT_SCENE3_PUBLISHED.txt', 'utf8');
const daniEdit = report.appliedEdits.find((e) => (e.obligations || [])
  .some((o) => /cplusbeat:pc:self#1@practiced-face/.test(o)));
const romanKeep = report.keepClaims.find((k) => /roman_tusk#1@easier-thing/.test(k.id));
console.log('Scene 3: the editor applied an edit for Dani’s frame and kept a passage for Roman’s');
console.log('  Dani  (edit) : "' + String(daniEdit.after).slice(0, 86) + '"');
console.log('  Roman (keep) : "' + String(romanKeep.passage).slice(0, 86) + '"');
ck('both are on the published page', page.indexOf(daniEdit.after) !== -1
  && page.indexOf(romanKeep.passage) !== -1);

// SHAPE-FAITHFUL TO THE REAL LEDGER. _isAgentIn reads `rec.role` (it tests
// role.toLowerCase().indexOf('pc')), NOT an `isPC` flag — an invented `isPC: true` made the
// first-person test silently unreachable and refused a passage in which Dani plainly acts.
// The run's own log gives the real shape: "cast merged by stable ref: [pc:self=pc,
// named:roman_tusk=li]".
const ledger = () => ({ characters: {
  'pc:self': { name: 'Dani MacBrayne', role: 'pc',
    beats: [{ beatIndex: 1, frameId: 'practiced-face', status: 'offered', scene: 3 }] },
  'named:roman_tusk': { name: 'Roman Tusk', role: 'li',
    beats: [{ beatIndex: 1, frameId: 'easier-thing', status: 'offered', scene: 3 }] },
} });
const KEEPS = [{ characterId: 'named:roman_tusk', beatIndex: 1, frameId: 'easier-thing',
  passage: romanKeep.passage, reveals: romanKeep.why }];
const EDITS = [{ characterId: 'pc:self', beatIndex: 1, frameId: 'practiced-face',
  passage: daniEdit.after, reveals: null }];
const find = (out, name) => out.find((r) => r.character === name) || {};

console.log('\n1. THE DEFECT, WITH EDITS WITHHELD (what Scene 3 actually ran)');
const before = API.markDeliveredFromPage(ledger(), page, 3, KEEPS);
console.log('   Dani : ' + JSON.stringify(find(before, 'Dani MacBrayne')).slice(0, 180));
ck('Dani was reported still due when only keeps were passed',
  find(before, 'Dani MacBrayne').status === 'still due');
ck('Roman was credited from his kept passage', find(before, 'Roman Tusk').status === 'delivered');

console.log('\n2. WITH THE APPLIED EDITS PASSED IN');
const after = API.markDeliveredFromPage(ledger(), page, 3, KEEPS, EDITS);
const d = find(after, 'Dani MacBrayne'), r = find(after, 'Roman Tusk');
console.log('   Dani : ' + JSON.stringify(d).slice(0, 220));
console.log('   Roman: ' + JSON.stringify(r).slice(0, 180));
ck('Dani’s beat is now delivered', d.status === 'delivered', JSON.stringify(d));
ck('and it is labelled as the EDITOR’s pen, not the author’s', d.via === 'editor-edit', d.via);
ck('Roman stays delivered as an AUTHOR passage', r.status === 'delivered' && r.via === 'author-passage',
  r.via);
ck('the two routes are distinguishable in the ledger', d.via !== r.via);

console.log('\n3. CONTROL — AN EDIT THAT NEVER REACHED THE PAGE  (must be RED)');
const ghost = API.markDeliveredFromPage(ledger(), page, 3, KEEPS,
  [{ characterId: 'pc:self', beatIndex: 1, frameId: 'practiced-face',
    // first person, so agency PASSES; this sentence is simply not on the page.
    passage: 'I had kept my voice level with every producer I have ever worked with.', reveals: null }]);
const g = find(ghost, 'Dani MacBrayne');
console.log('   Dani : ' + JSON.stringify(g).slice(0, 200));
ck('an edit absent from the page is REFUSED', g.status === 'still due', JSON.stringify(g));
ck('and it is refused for ABSENCE, not for agency',
  /did not survive onto the published page/.test(String(g.why || '')), g.why);
ck('the reason names the editor\u2019s edit', /applied edit/.test(String(g.why || '')), g.why);

console.log('\n4. CONTROL — AN EDIT WHERE THE CHARACTER IS NOT THE AGENT  (must be RED)');
// A sentence about Dani in which she does nothing: a mention, not a Character+ beat.
const mention = 'The producer had learned to read the even tone of people like her.';
const pageWith = page + '\n\n' + mention;
const notAgent = API.markDeliveredFromPage(ledger(), pageWith, 3, KEEPS,
  [{ characterId: 'pc:self', beatIndex: 1, frameId: 'practiced-face', passage: mention, reveals: null }]);
const na = find(notAgent, 'Dani MacBrayne');
console.log('   Dani : ' + JSON.stringify(na).slice(0, 220));
ck('a mention is REFUSED even though it is on the page', na.status === 'still due', JSON.stringify(na));
ck('and the agency reason names the editor’s edit',
  /applied edit/.test(String(na.why || '')), na.why);

console.log('\n5. NEITHER ROUTE ANSWERED  (the honest "nothing happened" case)');
const none = API.markDeliveredFromPage(ledger(), page, 3, [], []);
const nn = find(none, 'Dani MacBrayne');
ck('reports that NEITHER a passage nor an edit was offered',
  nn.status === 'still due' && /neither accepted a passage nor applied an edit/.test(String(nn.why || '')),
  nn.why);
ck('semantic verification is never claimed by this pass',
  after.every((x) => x.status !== 'delivered' || x.semanticallyVerified !== true));

fs.writeFileSync(ROOT + '_FT_CPLUS_CREDIT.json', JSON.stringify({
  scene3: { daniEdit: daniEdit.after, romanKeep: romanKeep.passage },
  before: before, after: after, checks: { total: n, failed: bad },
}, null, 2));
console.log('\n  ' + (n - bad) + '/' + n + ' checks passed');
console.log('  Static — the shipped function driven by Scene 3’s own report. No network, no spend.');
process.exit(bad ? 1 : 0);
