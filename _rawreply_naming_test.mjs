// Proves two retained raw replies from two runs get DISTINCT timestamped filenames and neither is overwritten,
// using the same naming function the live harness imports. usage: node _rawreply_naming_test.mjs
import fs from 'node:fs';
import { runStamp, rawReplyPath } from './_measure_naming.mjs';
const dir = '_validate_out/_naming_test'; fs.mkdirSync(dir, { recursive: true });
const results = []; const ok = (n, p, d) => { results.push(p); console.log((p ? '  ✓ ' : '  ✗ ') + n + (p ? '' : '\n      ' + d)); };
const s1 = runStamp(new Date('2026-09-07T18:55:32.000Z')), s2 = runStamp(new Date('2026-09-07T21:01:22.000Z'));
const p1 = rawReplyPath(s1, 'OPENING_PLANNER', 1, dir), p2 = rawReplyPath(s2, 'OPENING_PLANNER', 1, dir);
fs.writeFileSync(p1, 'REPLY-ONE'); fs.writeFileSync(p2, 'REPLY-TWO');
ok('N1 two runs → two distinct filenames', p1 !== p2, p1 + ' vs ' + p2);
ok('N2 both files exist afterwards', fs.existsSync(p1) && fs.existsSync(p2), '');
ok('N3 neither was overwritten (contents intact)', fs.readFileSync(p1, 'utf8') === 'REPLY-ONE' && fs.readFileSync(p2, 'utf8') === 'REPLY-TWO', '');
const a1 = rawReplyPath(s2, 'NARRATIVE_AUTHOR_GROK_ONLY', 1, dir), a2 = rawReplyPath(s2, 'NARRATIVE_AUTHOR_GROK_ONLY', 2, dir);
ok('N4 within one run, planner and two author attempts are three distinct files', new Set([p2, a1, a2]).size === 3, [p2, a1, a2].join(' '));
const harness = fs.readFileSync('_scene1_planner_measure_live.mjs', 'utf8');
ok('N5 the live harness imports and uses this naming function (no inline counter-only name remains)', /from '\.\/_measure_naming\.mjs'/.test(harness) && /rawReplyPath\(/.test(harness) && !/scene1_measure_live\.rawreply\.' \+ \(rb\.role/.test(harness), '');
fs.rmSync(dir, { recursive: true, force: true });
const fails = results.filter(x => !x).length; console.log(`\n${results.length} checks · ${results.length - fails} passed · ${fails} failed`); process.exit(fails ? 1 : 0);
