// ── NO CONCRETE DECISION EXEMPLAR REACHES THE PENULTIMATE-BEAT DIRECTIVE (provider-free, $0) ──
// A live First Sacrifice scene shipped "Tell Devorah about the email, or wait until morning?" to a
// reader - the first item of an example list in the shared instructions. Five prose sites were
// cleared; this covers the LAST consumer, _buildStagedSystemPrompt, which injected three ROTATING
// examples from window._DECISION_BEAT_POOL. Rotation only changes WHICH example can leak.
// _buildStagedSystemPrompt is not exposed on window, so the directive is checked where it is
// authored, against the pool it used to draw from. No story replay, no provider.
import fs from 'fs';

let pass = 0, fail = 0;
const t = (label, ok, detail) => {
  if (ok) { pass++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label + (detail ? '  — ' + detail : '')); }
};

console.log('=== DECISION-BEAT DIRECTIVE: NO CONCRETE EXEMPLARS (provider-free, $0) ===\n');
const src = fs.readFileSync('public/app.js', 'utf8');

// The pool's own contents are the leak surface. Read them from the shipped source.
const poolStart = src.indexOf('window._DECISION_BEAT_POOL = [');
t('window._DECISION_BEAT_POOL is still defined — the rotation machinery is untouched',
  poolStart > 0, 'the pool declaration is gone');
const poolBody = src.slice(poolStart, src.indexOf('];', poolStart));
const poolItems = [...poolBody.matchAll(/'"([^"]+)"'/g)].map((m) => m[1]);
t('the pool still carries its example shapes (not emptied by this fix)',
  poolItems.length >= 3, 'found ' + poolItems.length);
console.log('      pool items: ' + JSON.stringify(poolItems.slice(0, 5)));

// THE DIRECTIVE ITSELF.
const dirStart = src.indexOf("- WHEN THE MANDATED DECK-CLOSER IS PRESENT: the PENULTIMATE beat");
t('the penultimate-beat directive is still present', dirStart > 0, 'directive not found');
const directive = src.slice(dirStart, dirStart + 1800);

t('the directive no longer injects rotating pool examples',
  !/_rotatingExemplars\(\s*'decision_beat'/.test(directive),
  'it still calls _rotatingExemplars for decision_beat');
t('no pool example text appears in the directive',
  poolItems.every((it) => !directive.includes(it)),
  'leaked: ' + JSON.stringify(poolItems.filter((it) => directive.includes(it))));
t('the directive states the requirement STRUCTURALLY instead',
  /name the person, object or obligation already\s+present in it/.test(directive)
  && /two courses actually open to the protagonist/.test(directive),
  'the scene-grounded instruction is missing');
t('and it says why no example is supplied, naming rotation as insufficient',
  /NO EXAMPLES ARE GIVEN HERE\s+ON PURPOSE/.test(directive)
  && /rotating example only changes which one leaks/.test(directive),
  'the rationale is missing');

// NOTHING ELSE IN THE SHARED PROSE INSTRUCTIONS MAY CARRY A CONCRETE DILEMMA.
for (const needle of ['Tell Devorah about the email', 'Tell Devorah, or wait',
                      'Push for the byline, or hand it back?']) {
  // the pool itself is allowed to hold shapes; prose instructions are not
  const outsidePool = src.slice(0, poolStart) + src.slice(src.indexOf('];', poolStart));
  t('no prose instruction contains ' + JSON.stringify(needle),
    !outsidePool.includes(needle), 'still present outside the pool');
}

// THE CHECK MUST BITE: the pre-fix directive shape would fail the injection assertion.
const preFix = "Examples (a fresh seeded subset shows each scene — do NOT copy): ' + "
  + "window._rotatingExemplars('decision_beat', window._DECISION_BEAT_POOL, 3).join(' / ')";
t('THE CHECK BITES: the pre-fix directive shape is refused',
  /_rotatingExemplars\(\s*'decision_beat'/.test(preFix), 'the bite probe is wrong');

// The unrelated pools must be untouched by this fix.
const otherPools = (src.match(/window\._[A-Z_]+_POOL\s*=/g) || []).length;
t('other exemplar pools are untouched', otherPools > 5, 'only ' + otherPools + ' pools found');

console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
