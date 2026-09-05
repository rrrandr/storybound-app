#!/usr/bin/env node
/**
 * verify-runtime-files — every file the app loads must exist IN THE COMMIT.
 *
 * Written because it did not. `public/starter-scenes.js` was referenced by
 * index.html and read by the verification suites while existing only as an
 * untracked file in one working tree. The suites passed there and could not
 * have passed anywhere else; a clean checkout of the pushed commit 404s the
 * script and silently routes every starter Book through the old path.
 *
 * Two questions per file, and the second is the one that was missed:
 *   1. does it exist on disk?      (does the app work here)
 *   2. is it in HEAD?              (does the app work for anyone else)
 *
 * Checks the executable surface — <script src> and stylesheet <link href> in
 * public/index.html — plus every project file the verification suites read or
 * import. Images and other assets are deliberately out of scope: they carry
 * pre-existing working-tree churn that has nothing to do with whether a commit
 * is self-contained.
 *
 * Run: node scripts/verify-runtime-files.mjs   (npm run verify:files)
 */

import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0, checks = 0;

function ok(cond, name, detail) {
  checks++;
  if (cond) { console.log(`  ok   ${name}`); return true; }
  failures++;
  console.log(`  FAIL ${name}${detail ? `\n       ${detail}` : ''}`);
  return false;
}

/** Is this path present in HEAD? (Not the index, not the working tree — HEAD.) */
function inHead(repoRelPath) {
  try {
    execFileSync('git', ['cat-file', '-e', `HEAD:${repoRelPath}`], { cwd: ROOT, stdio: 'ignore' });
    return true;
  } catch { return false; }
}

/** Local (non-CDN) script and stylesheet references from index.html. */
function runtimeRefsFromIndex() {
  const html = readFileSync(join(ROOT, 'public', 'index.html'), 'utf8');
  const refs = new Set();
  const add = (src) => {
    if (!src || /^(https?:)?\/\//.test(src) || src.startsWith('data:')) return;   // external or inline
    refs.add('public/' + src.replace(/^\//, '').split('?')[0]);
  };
  for (const m of html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)) add(m[1]);
  for (const m of html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi)) add(m[1]);
  for (const m of html.matchAll(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["']stylesheet["']/gi)) add(m[1]);
  return [...refs];
}

/** Project files the verification suites read or import at run time. */
function refsFromSuites() {
  const suites = ['verify-baked-scene1.mjs', 'verify-starter-economy.mjs', 'verify-runtime-files.mjs']
    .map(f => join(ROOT, 'scripts', f)).filter(existsSync);
  const refs = new Set();
  for (const file of suites) {
    // Comments stripped first: this file documents the pattern it searches for,
    // and matching its own example would invent a dependency on a path that
    // never existed.
    const src = readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    for (const m of src.matchAll(/join\(\s*ROOT\s*,\s*([^)]+)\)/g)) {
      const parts = [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]);
      if (!parts.length) continue;
      const ref = parts.join('/');
      // Only whole files. A join with a variable segment (join(ROOT,'scripts',f))
      // yields a directory, which is not a dependency this check can speak to.
      if (!/\.[a-z0-9]+$/i.test(ref)) continue;
      refs.add(ref);
    }
  }
  return [...refs];
}

console.log('\n── runtime files referenced by public/index.html ──');
const indexRefs = runtimeRefsFromIndex();
ok(indexRefs.length > 0, `found ${indexRefs.length} local script/stylesheet reference(s)`);
for (const ref of indexRefs) {
  const onDisk = existsSync(join(ROOT, ref));
  const tracked = inHead(ref);
  ok(onDisk, `${ref}: exists on disk`, 'index.html references a file that is not here — this is a 404 at runtime');
  ok(tracked, `${ref}: present in HEAD`,
    onDisk ? 'the file exists ONLY in this working tree — a clean checkout will 404 on it'
           : 'missing from disk AND from HEAD');
}

console.log('\n── project files the verification suites load ──');
const suiteRefs = refsFromSuites();
ok(suiteRefs.length > 0, `found ${suiteRefs.length} file(s) loaded by the suites`);
for (const ref of suiteRefs) {
  const onDisk = existsSync(join(ROOT, ref));
  const tracked = inHead(ref);
  ok(onDisk, `${ref}: exists on disk`, 'a suite reads a file that is not here');
  ok(tracked, `${ref}: present in HEAD`,
    'a suite reads a file that is not in the commit — its results cannot be reproduced from a clean checkout');
}

console.log('\n── the commit is self-contained ──');
const untrackedRuntime = [...new Set([...indexRefs, ...suiteRefs])]
  .filter(r => existsSync(join(ROOT, r)) && !inHead(r));
ok(untrackedRuntime.length === 0,
  'no runtime or test-fixture file is untracked',
  untrackedRuntime.length
    ? `untracked but depended upon:\n         - ${untrackedRuntime.join('\n         - ')}\n       Green suites here would NOT reproduce from a clean checkout.`
    : '');

console.log(`\n${failures ? `✗ ${failures} of ${checks} checks FAILED` : `✓ all ${checks} checks passed`}\n`);
process.exit(failures ? 1 : 0);
