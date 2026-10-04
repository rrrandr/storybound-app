// A DISTINCT PRODUCT DEFECT, REGRESSION-TESTED ON ITS OWN. Provider-free, $0.
//
// orchestration-client.js referenced a bare `_smallAuthor` that is defined NOWHERE in the
// codebase. Any literary turn reaching the purple-lens step threw
//     ReferenceError: _smallAuthor is not defined
// which app.js:290972 rethrew as
//     "Story generation failed: … Grok cannot be used for story authoring."
// so the turn died and the message blamed the provider instead of naming the bug. This control
// exists so that identifier can never return, and so the symptom is recognisable if it does.
import fs from 'fs';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

console.log('=== _smallAuthor REFERENCE DEFECT (provider-free, $0) ===\n');

const files = ['public/orchestration-client.js', 'public/app.js'];
const sources = Object.fromEntries(files.map(f => [f, fs.readFileSync(f, 'utf8')]));
// Scan CODE, not prose. The fix's own explanatory comment names the broken identifier on
// purpose, and a check that cannot tell a comment from an expression would fail on the very
// documentation that explains it.
const codeOnly = (src) => src.split('\n')
  .map(l => l.replace(/\/\/.*$/, ''))
  .join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '');

// 1. THE BARE IDENTIFIER IS GONE. _smallAuthorEnabled is a real function and is allowed; a bare
//    _smallAuthor is not, because nothing defines it.
for (const f of files) {
  const bare = (codeOnly(sources[f]).match(/\b_smallAuthor\b(?!Enabled)/g) || []);
  t('no bare `_smallAuthor` reference in ' + f, bare.length === 0,
    bare.length + ' occurrence(s) — every one throws ReferenceError at runtime');
}

// 2. WHAT REPLACED IT IS ACTUALLY DEFINED. A fix that swaps one undefined name for another would
//    pass check 1 and still throw.
{
  const oc = sources['public/orchestration-client.js'];
  const used = [...new Set((oc.match(/\b_smallAuthorEnabled\b/g) || []))];
  t('_smallAuthorEnabled is referenced', used.length > 0);
  t('AND IT IS DEFINED, not merely referenced',
    /function\s+_smallAuthorEnabled\s*\(/.test(oc),
    'the replacement identifier is itself undefined');
}

// 3. THE CALL SITE IS DEFENSIVE. Even a correctly-named helper can be absent at load order, and
//    this line sits inside a turn whose failure is reported as a provider problem.
{
  const oc = sources['public/orchestration-client.js'];
  // Anchor on the GUARD itself, not the first mention of the lens anywhere in the file.
  const i = oc.indexOf('window._applyPurpleLens === ');
  const window_ = i < 0 ? '' : oc.slice(Math.max(0, i - 900), i + 200);
  t('the purple-lens guard resolves its predicate defensively',
    /typeof\s+_smallAuthorEnabled\s*===\s*'function'/.test(window_),
    'a missing helper would throw here again');
  t('and it is wrapped so a throw cannot escape into the turn',
    /try\s*\{[^}]*_smallAuthorEnabled/.test(window_));
}

// 4. THE MISLEADING RETHROW IS STILL THERE — documented, not silently changed. A ReferenceError
//    inside orchestration is still reported as "Grok cannot be used for story authoring", which
//    is how this defect stayed hidden. That wording is NOT this control's to change, but the
//    next person deserves to know the message can lie about the cause.
{
  const app = sources['public/app.js'];
  t('the rethrow that masked this is still present and still masks causes',
    /Grok cannot be used for story authoring/.test(app),
    'wording changed — update this note');
  console.log('     NOTE: that message reports ANY orchestration error as a provider problem.');
  console.log('     It is left as found; this control records the trap rather than hiding it.');
}

console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
