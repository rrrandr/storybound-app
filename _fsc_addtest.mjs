import fs from 'fs';
const F = '_fsc_slice1_control.mjs';
let s = fs.readFileSync(F, 'utf8');
const a = "t('custody_unremembered changes NO world fact', sil.delta === null);";
if (!s.includes(a)) throw new Error('ANCHOR MISSING');
s = s.replace(a, a + `

// REGRESSION LOCK: a player's apostrophe may be straight or curly (iOS autocorrect emits U+2019).
// Matching only the straight form silently dropped real submissions; both must reach the same outcome.
const silStraight = win._fscCompile("Don't bring that up.");
const silCurly    = win._fscCompile('Don\\u2019t bring that up.');
t('straight apostrophe reaches silence', silStraight.outcomeId === 'unm.the_custody_unremembered', silStraight.outcomeId + '/' + silStraight.error);
t('CURLY apostrophe reaches the same outcome', silCurly.outcomeId === 'unm.the_custody_unremembered', silCurly.outcomeId + '/' + silCurly.error);
const escCurly = win._fscCompile('I didn\\u2019t do anything.');
t('curly apostrophe classifies escape too', escCurly.askClass === 'escape', escCurly.askClass);`);
fs.writeFileSync(F, s);
console.log('regression lock added');
