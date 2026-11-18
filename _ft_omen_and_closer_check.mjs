// THE OMEN CHANNEL AND THE CLOSER TENSE, AGAINST THE SAVED SCENE 3 (Roman 2026-11-18)
//
// Both fixes are judged on the page that actually published, not on invented text:
//   · Scene 3 was assigned category ANIMAL and delivered a SOUND omen. The audit must FLAG it.
//   · Scene 3 narrates in first-person PAST and closed in the PRESENT. The closer must now be
//     produced in the past, keeping the card, the image and the static shock.
//
// Controls are included because an audit that flags everything, or a detector that always says
// "past", would pass the headline test and be worthless.
import fs from 'node:fs';

const ROOT = '/Users/romantsukerman/storybound-app/';
let n = 0, bad = 0;
const ck = (nm, c, d) => { n += 1; if (!c) { bad += 1; console.log('  ✗ ' + nm + (d ? ('  — ' + String(d).slice(0, 280)) : '')); } else console.log('  ✓ ' + nm); };

// ── LIFT THE SHIPPED HELPERS ─────────────────────────────────────────────────────────────
const app = fs.readFileSync(ROOT + 'public/app.js', 'utf8');
const cut = (startMarker, endMarker) => {
  const i = app.indexOf(startMarker);
  const j = app.indexOf(endMarker, i);
  return (i === -1 || j === -1) ? null : app.slice(i, j);
};
const src = cut('  var _OMEN_CHANNELS = {', '  window._sbNarrationTense = _sbNarrationTense;');
if (!src) { console.error('could not lift the omen/tense helpers'); process.exit(2); }
const api = new Function(src.replace(/window\._sb\w+ = _sb\w+;/g, '')
  + '\nreturn { _sbOmenChannelAudit, _sbOmenWindow, _sbNarrationTense };')();
console.log('lifted _sbOmenChannelAudit and _sbNarrationTense from public/app.js\n');

const PAGE = fs.readFileSync(ROOT + '_FT_SCENE3_PUBLISHED.txt', 'utf8');
const assigned = (() => {
  const log = fs.readFileSync(ROOT + '_ft_scene3_paid/LATEST/console.log', 'utf8');
  const m = log.match(/\[OMEN\]\s*\{[^}]*category:\s*(\w+)/);
  return m ? m[1] : null;
})();
console.log('Scene 3’s assignment, from the run’s own log: category = ' + assigned);
ck('the run assigned a category', assigned === 'animal', String(assigned));

console.log('\n1. THE OMEN WINDOW, LOCATED IN THE PUBLISHED PAGE');
const win = api._sbOmenWindow(PAGE);
console.log('  ' + String(win || '(not found)').replace(/\s+/g, ' ').slice(0, 260));
ck('the omen window was found', !!win);
ck('it contains the delivered anomaly', !!win && /thinned to silence|quiet came on so suddenly/.test(win));

console.log('\n2. THE MISMATCH IS FLAGGED');
const verdict = api._sbOmenChannelAudit(PAGE, assigned);
console.log('  ' + JSON.stringify(verdict).slice(0, 330));
ck('the audit returns a FAILING verdict', verdict.ok === false, JSON.stringify(verdict));
ck('it names the assigned channel as animal', verdict.assigned === 'animal');
ck('it names the delivered channel as sound', verdict.detected === 'sound', verdict.detected);
ck('it quotes the evidence it judged on', !!verdict.evidence, JSON.stringify(verdict.evidence));
ck('and it explains the finding in words', /does not appear in it/.test(String(verdict.why)));

console.log('\n3. CONTROLS — THE AUDIT MUST NOT FLAG EVERYTHING');
const agree = api._sbOmenChannelAudit(PAGE, 'sound');
console.log('  assigned sound: ' + JSON.stringify(agree).slice(0, 200));
ck('an omen that MATCHES its channel passes', agree.ok === true, JSON.stringify(agree));
const nowhere = api._sbOmenChannelAudit('Nothing happened. She went home and slept.', 'animal');
ck('a page with no locatable omen is NOT judged', nowhere.ok === null, JSON.stringify(nowhere));
const noAssign = api._sbOmenChannelAudit(PAGE, '');
ck('with no assignment there is no verdict', noAssign.ok === null, JSON.stringify(noAssign));

console.log('\n4. THE NARRATION TENSE OF THE PUBLISHED SCENE 3');
const tn = api._sbNarrationTense(PAGE);
console.log('  ' + JSON.stringify(tn));
ck('Scene 3 reads as PAST tense', tn.tense === 'past', JSON.stringify(tn));
ck('and the reading is confident', tn.confident === true);
const presentSample = 'I realize the deck is still in my hand. I notice the light. '
  + 'I know what he wants. I take the card and I ask him for the answer.';
const tp = api._sbNarrationTense(presentSample);
console.log('  control, present-tense prose: ' + JSON.stringify(tp));
ck('present-tense prose is NOT called past', tp.tense === 'present', JSON.stringify(tp));
ck('empty text keeps the existing present default',
  api._sbNarrationTense('').tense === 'present');

console.log('\n5. THE CLOSER THE FIX NOW PRODUCES');
// Lift the two first-person variants straight out of the shipped selection block.
const block = cut("      if (_povS3 === '1st' || _povS3 === 'first') {", "      } else if (_povS3 === '2nd'");
const variants = (block.match(/'([^']*Tempt Fate[^']*)'/g) || []).map((x) => x.slice(1, -1));
ck('both first-person variants are present in the source', variants.length === 2, String(variants.length));
const past = variants.find((v) => /I realized/.test(v));
const present = variants.find((v) => /I realize /.test(v));
console.log('\n  PAST (used when the narration is past):');
console.log('  ' + String(past).replace(/\\u201c|\\u201d/g, '"'));
ck('a past-tense variant exists', !!past);
ck('it is in the past throughout',
  !!past && /I realized/.test(past) && /I slid/.test(past) && /I noticed/.test(past)
  && /reminded me/.test(past) && !/\bI realize\b|\bI slide\b|\bI notice\b|\breminds me\b/.test(past),
  past);
console.log('\n  the beats that had to survive the rewrite:');
[['the card is named', /“Tempt Fate\.”|"Tempt Fate\."/],
 ['Petition Fate goes back into the deck', /slid Petition Fate back in/],
 ['the red card in the gold stack', /flash of red in the otherwise gold stack/],
 ['the great-grandmother line', /Great-grandma never let me play with that one/],
 ['the sword and blood-red sky', /A sword raised to a blood-red sky/],
 ['the lightning, direction left open', /lightning arcing down from the clouds \(or maybe arcing up\?\)/],
 ['the static shock', /static shock/i],
 ['the trailing ellipsis the card continues', /present…$/]].forEach(([label, rx]) => {
  ck(label + ' survived', !!past && rx.test(past), label);
});
ck('the present-tense variant is untouched for present-tense stories',
  !!present && /I realize the deck is still in my hand/.test(present));

fs.writeFileSync(ROOT + '_FT_OMEN_AND_CLOSER.json', JSON.stringify({
  omen: { assigned, window: win, verdict, controls: { matching: agree, noOmen: nowhere, noAssignment: noAssign } },
  tense: { scene3: tn, presentControl: tp },
  closer: { past, present },
  checks: { total: n, failed: bad },
}, null, 2));
console.log('\n  ' + (n - bad) + '/' + n + ' checks passed');
console.log('  Static — shipped helpers against the published Scene 3. No network, no spend.');
process.exit(bad ? 1 : 0);
