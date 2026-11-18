// THE LI ADMIRATION MANDATE, OFFLINE (Roman 2026-11-18)
//
// Shows the two surfaces the mandate lands on and proves the ledger behaves:
//   1. the AUTHOR instructions, rendered from the shipped directive
//   2. the EDITOR obligations, as the craft plan would carry them
//   3. the coverage ledger: survival-gated credit, per issue, across a reopen
//   4. Scene 3's existing PHYSICAL beat credited from the published page
//
// The shipped functions are lifted, never re-implemented.
import fs from 'node:fs';

const ROOT = '/Users/romantsukerman/storybound-app/';
let n = 0, bad = 0;
const ck = (nm, c, d) => { n += 1; if (!c) { bad += 1; console.log('  ✗ ' + nm + (d ? ('  — ' + String(d).slice(0, 240)) : '')); } else console.log('  ✓ ' + nm); };

// ── LIFT THE LEDGER FROM THE SHIPPED SOURCE ──────────────────────────────────────────────
const app = fs.readFileSync(ROOT + 'public/app.js', 'utf8');
const grab = (startRx, endMarker) => {
  const i = app.search(startRx);
  if (i === -1) return null;
  const j = app.indexOf(endMarker, i);
  return j === -1 ? null : app.slice(i, j);
};
// Cut before the window exports: the lift runs without a DOM.
const ledgerSrc = grab(/var _LI_ADMIRE_AREAS = /, '  window._liAdmireLedger =');
if (!ledgerSrc) { console.error('could not lift the admiration ledger from app.js'); process.exit(2); }
const mk = new Function('state', ledgerSrc
  + '\nreturn { _liAdmireLedger, _liAdmireOwed, _liAdmireCredit, _liAdmireFirstPhysicalDone, _LI_ADMIRE_AREAS };');
console.log('lifted the admiration ledger from public/app.js\n');

const PAGE = fs.readFileSync(ROOT + '_FT_SCENE3_PUBLISHED.txt', 'utf8');
// Scene 3's real physical beat: the observation and the PC's response, in one passage.
// TAKE THE PASSAGE FROM THE PAGE, never retype it. Typing it by hand put a straight
// apostrophe in "producer's" where the page has a curly one, and the survival check correctly
// refused a passage that is plainly there. In production the passage arrives as the editor's
// verbatim KEEP, so it cannot drift this way.
const PHYS = (() => {
  const start = PAGE.indexOf('I had prepared myself to dislike');
  const end = PAGE.indexOf('finish the thought.', start);
  return start === -1 || end === -1 ? '' : PAGE.slice(start, end + 'finish the thought.'.length);
})();
const PHYS_ON_PAGE = PAGE.indexOf('My attention caught on his mouth before I could finish the thought.') !== -1;

console.log('1. THE LEDGER: OWED, CREDITED, AND SURVIVAL-GATED');
let st = { storyId: 'cde6f2e1', issueNumber: 1 };
let api = mk(st);
ck('a fresh issue owes all three areas',
  api._liAdmireOwed(st).join(',') === 'physical,social,capability', api._liAdmireOwed(st).join(','));
ck('the first-physical rule starts LIVE', api._liAdmireFirstPhysicalDone(st) === false);

// CONTROL: a passage that is not on the published page earns nothing.
const ghost = api._liAdmireCredit(st, 'physical',
  { passage: 'His hands were the kind she would have sketched if anyone had asked her to.',
    why: 'invented', scene: 3 }, PAGE);
console.log('   refused: ' + JSON.stringify(ghost));
ck('a passage absent from the page is REFUSED', ghost && ghost.status === 'refused'
  && /did not survive/.test(ghost.why), JSON.stringify(ghost));
ck('and the area is still owed after a refusal',
  api._liAdmireOwed(st).indexOf('physical') !== -1);

// CONTROL: too short to be evidence.
const shortOne = api._liAdmireCredit(st, 'social', { passage: 'She liked him.', scene: 3 }, PAGE);
ck('a fragment is REFUSED as evidence', shortOne && shortOne.status === 'refused'
  && /too short/.test(shortOne.why), JSON.stringify(shortOne));

console.log('\n2. SCENE 3’S EXISTING PHYSICAL BEAT, CREDITED FROM THE PUBLISHED PAGE');
ck('the passage really is on the published Scene 3 page', PHYS_ON_PAGE);
const credited = api._liAdmireCredit(st, 'physical', { passage: PHYS, scene: 3,
  why: 'his mouth interrupts the dislike she had prepared; the attraction contradicts her position' },
  PAGE);
console.log('   ' + JSON.stringify(credited).slice(0, 260));
ck('physical is DELIVERED', credited && credited.status === 'delivered', JSON.stringify(credited));
ck('the first-physical rule is now spent', api._liAdmireFirstPhysicalDone(st) === true);
const owedAfter = api._liAdmireOwed(st);
console.log('   still owed: ' + owedAfter.join(', '));
ck('social and capability remain owed', owedAfter.join(',') === 'social,capability', owedAfter.join(','));

console.log('\n3. COVERAGE SURVIVES A REOPEN, AND IS PER ISSUE');
const snapshot = JSON.parse(JSON.stringify(st._liAdmirationLedger));
let reopened = { storyId: 'cde6f2e1', issueNumber: 1, _liAdmirationLedger: snapshot };
const api2 = mk(reopened);
ck('a reopened save keeps the delivered area',
  api2._liAdmireOwed(reopened).join(',') === 'social,capability',
  api2._liAdmireOwed(reopened).join(','));
ck('and keeps the first-physical rule spent', api2._liAdmireFirstPhysicalDone(reopened) === true);
// COVERAGE IS KEYED ON issueIndexInRun, not the anthology issueNumber (server-allocated on
// completion, so it can change mid-issue). Both behaviours are asserted below.
let issue2 = { storyId: 'cde6f2e1', issueIndexInRun: 2, _liAdmirationLedger: snapshot };
const api3 = mk(issue2);
ck('advancing issueIndexInRun owes all three again',
  api3._liAdmireOwed(issue2).join(',') === 'physical,social,capability',
  api3._liAdmireOwed(issue2).join(','));
ck('and issue 2’s first-physical rule is live again',
  api3._liAdmireFirstPhysicalDone(issue2) === false);
let renum = { storyId: 'cde6f2e1', issueIndexInRun: 1, issueNumber: 4211,
  _liAdmirationLedger: snapshot };
ck('renumbering the anthology does NOT renew coverage',
  mk(renum)._liAdmireOwed(renum).join(',') === 'social,capability',
  mk(renum)._liAdmireOwed(renum).join(','));
let other = { storyId: 'OTHER-STORY', issueNumber: 1, _liAdmirationLedger: snapshot };
ck('a different story does not inherit coverage',
  mk(other)._liAdmireOwed(other).join(',') === 'physical,social,capability');

console.log('\n4. THE AUTHOR INSTRUCTIONS THIS PRODUCES');
// Render the module exactly as the directive builds it, for the two states that matter.
const modSrc = grab(/      M\.ADMIRATION_COVERAGE = \(function \(\) \{/, '      M.CADENCE =');
if (!modSrc) { console.error('could not lift the ADMIRATION_COVERAGE module'); process.exit(2); }
const render = (stateObj, liName) => {
  const a = mk(stateObj);
  const body = modSrc.replace('      M.ADMIRATION_COVERAGE = (function () {', 'return (function () {')
    .replace(/\}\)\(\);\s*$/, '})();');
  const f = new Function('s', '_liAdmireOwed', '_liAdmireFirstPhysicalDone', body);
  return f(Object.assign({ liName }, stateObj), a._liAdmireOwed, a._liAdmireFirstPhysicalDone);
};
const fresh = render({ storyId: 'x', issueNumber: 1 }, 'Roman Tusk');
console.log('─'.repeat(74));
console.log(fresh);
console.log('─'.repeat(74));
ck('the floor names all three areas',
  /PHYSICAL/.test(fresh) && /SOCIAL/.test(fresh) && /CAPABILITY/.test(fresh));
ck('the first physical description is bound to the SAME passage',
  /SAME passage/.test(fresh) && /not a paragraph later/.test(fresh));
ck('both halves are required of every beat',
  /BOTH halves/.test(fresh) && /privately finds compelling/.test(fresh));
ck('an inner response alone is allowed', /INNER response is sufficient/.test(fresh));
ck('admiration may coexist with anger or distrust', /coexist with anger, distrust/.test(fresh));
ck('capability must be demonstrated, not asserted',
  /Competence asserted in narration does not count/.test(fresh));
ck('it names what the issue still owes', /STILL OWED THIS ISSUE: PHYSICAL, SOCIAL, CAPABILITY/.test(fresh));
ck('it is kept separate from picturability', /SEPARATE FROM PICTURABILITY/.test(fresh));
ck('the exemplars are given as SHAPE and explicitly not to copy',
  /take the shape, never the words/.test(fresh));
ck('it refuses to stack all three in one scene', /Do NOT stack all three/.test(fresh));

// The storyId must MATCH the snapshot's, or the ledger correctly re-seats and reports
// everything owed again — which is the per-story isolation working, not the spent state.
const spent = render({ storyId: 'cde6f2e1', issueNumber: 1,
  _liAdmirationLedger: snapshot }, 'Roman Tusk');
console.log('\nONCE PHYSICAL HAS LANDED, the author is told so instead:');
console.log('  ' + (spent.match(/[^\n]*already landed[^\n]*/) || ['(missing)'])[0].trim());
console.log('  ' + (spent.match(/STILL OWED[^\n]*/) || ['(missing)'])[0].trim());
ck('no second "first physical description" is requested',
  /already landed/.test(spent) && !/FIRST PHYSICAL DESCRIPTION \(HARD\)/.test(spent));
ck('and the owed list has narrowed', /STILL OWED THIS ISSUE: SOCIAL, CAPABILITY/.test(spent));

console.log('\n5. THE EDITOR OBLIGATIONS THIS PRODUCES');
const obSrc = app.slice(app.indexOf('var _admOwed = (typeof _liAdmireOwed'),
  app.indexOf("console.log('[LI-ADMIRE:OBLIGATION] '"));
const liName = 'Roman Tusk';
const askF = new Function('_cpLiName', '_admOwed', obSrc.slice(obSrc.indexOf('var _admAsk'))
  .replace(/_cpPlan = Object[\s\S]*$/, '') + '\nreturn _admObs;');
const obs = askF(liName, ['physical', 'social', 'capability']);
obs.forEach((o) => {
  console.log('\n  id: ' + o.id + '   kind: ' + o.kind + '   due: ' + o.due);
  console.log('  ask: ' + o.ask.replace(/\s+/g, ' '));
});
ck('one obligation per owed area', obs.length === 3);
ck('each id is namespaced away from the C+ frame beats',
  obs.every((o) => /^liadmire:(physical|social|capability)$/.test(o.id)));
ck('each asks the editor to QUOTE the passage', obs.every((o) => /QUOTE the passage/.test(o.ask)));
ck('each asks what the PC finds compelling',
  obs.every((o) => /what the PC’s? ?finds compelling|what the PC finds compelling/.test(o.ask)));
ck('each requires BOTH the observation and the inner response',
  obs.every((o) => /BOTH the specific observation and the PC’s inner response/.test(o.ask)));
ck('each refuses to keep when the draft did not deliver it',
  obs.every((o) => /do NOT keep/.test(o.ask) && /stays owed/.test(o.ask)));
ck('capability is asked for as demonstrated in the draft',
  /demonstrated in action in this draft/.test(obs[2].ask));

fs.writeFileSync(ROOT + '_FT_LI_ADMIRATION.json', JSON.stringify({
  authorInstructions: fresh, authorInstructionsOncePhysicalLanded: spent,
  editorObligations: obs, scene3PhysicalCredited: credited,
  owedAfterScene3: owedAfter, checks: { total: n, failed: bad },
}, null, 2));
console.log('\n  ' + (n - bad) + '/' + n + ' checks passed');
console.log('  Static — shipped source + the published Scene 3 page. No network, no spend.');
process.exit(bad ? 1 : 0);
