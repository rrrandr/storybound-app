// THE .vercelignore REGRESSION CHECK — /api/config STAYS SERVABLE, PRIVATE CONFIG STAYS OUT
// (Roman 2026-11-19)
//
// `.vercelignore` uses gitignore semantics, so the faithful oracle is git itself rather than a
// hand-rolled matcher: this builds a throwaway repository, installs the pattern file under test
// as its .gitignore, materialises each candidate path, and asks `git check-ignore`. Nothing here
// reimplements the matching, which is the one way a check like this quietly becomes wrong.
//
// It tests TWO pattern sets so the control bites:
//   CURRENT  — the corrected file in the working tree. Every assertion below must hold.
//   PREVIOUS — the same file with the bare `api/config` line restored. Reported, not asserted,
//              because what it does to api/config.js is exactly the question under review.
//
// No network by default. With SB_CHECK_HTTP=<origin> it also GETs /api/config and /api/config.json
// against a running server, which is the only check that proves the route is actually served.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = '/Users/romantsukerman/storybound-app/';
const SCRATCH = process.env.SB_SCRATCH
  || '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/79822a26-4953-4e0a-b337-9520e623604d/scratchpad';
let n = 0, bad = 0;
const ck = (nm, cond, detail) => {
  n += 1;
  if (!cond) { bad += 1; console.log('  x ' + nm + (detail ? ('  -- ' + detail) : '')); }
  else console.log('  + ' + nm);
};

// ── THE TWO PATTERN SETS ────────────────────────────────────────────────────────────────────
const CURRENT = fs.readFileSync(ROOT + '.vercelignore', 'utf8');
ck('the corrected .vercelignore carries no bare `api/config` line',
  !CURRENT.split('\n').some((l) => l.trim() === 'api/config'));
ck('the corrected .vercelignore still excludes api/config.json by its own line',
  CURRENT.split('\n').some((l) => l.trim() === 'api/config.json'));

// Reconstruct what aa08c7eb shipped by RE-ADDING the bare pattern, rather than by matching the
// prose that replaced it: a control that quietly disappears when someone rewords a comment is no
// control at all, which is why its availability is asserted rather than warned about.
const ANCHOR = 'api/config.json.save\n';
ck('the control anchor is present, so the previous pattern set is reconstructible',
  CURRENT.includes(ANCHOR));
const PREVIOUS = CURRENT.replace(ANCHOR, ANCHOR + 'api/config\n');
ck('the reconstructed previous pattern set actually differs from the current one',
  PREVIOUS !== CURRENT);

// ── WHAT PRODUCTION MUST CARRY, AND WHAT IT MUST NEVER CARRY ────────────────────────────────
// A deployment that drops any MUST_SHIP path is broken. A deployment that carries any
// MUST_NOT_SHIP path leaks local state, credentials or a diagnostic endpoint.
const MUST_SHIP = [
  'api/config.js',          // THE ROUTE AT ISSUE: the client reads supabaseUrl/anonKey from it,
                            // and without it no Supabase client is built and sign-in is impossible
  'api/_edition.js',
  'api/_request-auth.js',
  'api/cplus-editor.js',
  'api/consume-fortune.js',
  'api/proxy.js',
  'lib/edition.js',
  'config/pricing.json',
  'public/index.html',
  'public/app.js',
  'public/request-auth.js',
  'package.json',
  'package-lock.json',
  'vercel.json',
];
const MUST_NOT_SHIP = [
  'api/config.json',                       // real runtime values
  'api/config.json.save',
  'api/config.example.json',
  'api/diag-mock.js',                      // diagnostic endpoints, excluded by aa08c7eb
  'api/diag-slow.js',
  'api/sol-scene-test.js',
  'api/schema.sql',
  '.env.local',
  '.env',
  'public/.env.production',                // a dotfile beneath an ALLOWED folder
  'api/.env.local',
  'node_modules/playwright-core/index.js',
  '_nf_literary_playthrough.mjs',          // harnesses
  '_ft_qa_session.mjs',
  '_ft_scene1_live/LATEST/REQUESTS.jsonl', // saved runs and receipts
  'supabase/migrations/20261118220000_audit_boundaries.sql',
  '_ft_qa_profile/Default/Local Storage/leveldb/000003.log', // a QA session, if one ever lands here
];

// ── GIT AS THE ORACLE ───────────────────────────────────────────────────────────────────────
const evaluate = (label, patterns, paths) => {
  const dir = path.join(SCRATCH, 'vercelignore-' + label);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const git = (...args) => spawnSync('git', ['-C', dir, ...args], { encoding: 'utf8' });
  git('init', '-q');
  fs.writeFileSync(path.join(dir, '.gitignore'), patterns);
  for (const p of paths) {
    const full = path.join(dir, p);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, 'x');
  }
  // `git check-ignore` is the WRONG oracle here: it exits 0 whenever a pattern MATCHES, and a
  // negation pattern matches too, so every `!api/**` allowlisted file reads as excluded. The
  // unambiguous question is "what would be uploaded", and `ls-files --others --exclude-standard`
  // answers exactly that -- it lists the untracked files that survive the ignore rules, and
  // never descends into an ignored directory.
  const kept = new Set((git('ls-files', '--others', '--exclude-standard').stdout || '')
    .split('\n').map((s) => s.trim()).filter(Boolean));
  const out = new Map();
  for (const p of paths) {
    const ignored = !kept.has(p);
    // Only when a path IS excluded is `check-ignore` meaningful, and then it names the line.
    const why = ignored ? ((git('check-ignore', '-v', '--', p).stdout || '').trim()) : '';
    out.set(p, { ignored, why });
  }
  out.set('__kept__', { kept });
  return out;
};

console.log('\n  CURRENT .vercelignore (the corrected file in the working tree)');
const cur = evaluate('current', CURRENT, [...MUST_SHIP, ...MUST_NOT_SHIP]);

for (const p of MUST_SHIP) {
  const r = cur.get(p);
  ck('ships: ' + p, !r.ignored, r.ignored ? ('excluded by  ' + r.why) : '');
}
for (const p of MUST_NOT_SHIP) {
  const r = cur.get(p);
  ck('excluded: ' + p, r.ignored, r.ignored ? '' : 'NOT excluded -- it would be uploaded');
}

// ── THE CONTROL: WHAT THE BARE PATTERN ACTUALLY DID ─────────────────────────────────────────
// Reported rather than asserted. Under strict gitignore semantics `api/config` matches a path
// component named exactly `config`, NOT `config.js` -- so if git says api/config.js was never
// excluded by that line, the local 404 had another cause and the diagnosis needs correcting.
{
  console.log('\n  PREVIOUS .vercelignore (bare `api/config` restored) -- CONTROL, not asserted');
  const prev = evaluate('previous', PREVIOUS, ['api/config.js', 'api/config.json', 'api/config']);
  for (const p of ['api/config.js', 'api/config.json', 'api/config']) {
    const r = prev.get(p);
    console.log('    ' + p.padEnd(20) + (r.ignored ? ('EXCLUDED by  ' + r.why) : 'not excluded'));
  }
  const bare = prev.get('api/config.js');
  console.log('\n    VERDICT ON THE DIAGNOSIS: under gitignore semantics the bare line '
    + (bare.ignored ? 'DID' : 'did NOT') + ' exclude api/config.js.');
  if (!bare.ignored) {
    console.log('    So removing it cannot be the whole explanation for the local 404, and the');
    console.log('    `vercel dev` restart in the same step is an unseparated second variable.');
    console.log('    The correction still stands on its own terms -- the line protected nothing,');
    console.log('    since there is no api/config directory and api/config.json has its own line.');
  }
}

// ── THE ONLY CHECK THAT PROVES THE ROUTE IS SERVED ──────────────────────────────────────────
const ORIGIN = process.env.SB_CHECK_HTTP;
if (ORIGIN) {
  console.log('\n  HTTP against ' + ORIGIN);
  try {
    const r = await fetch(ORIGIN + '/api/config');
    const body = await r.json();
    ck('GET /api/config returns 200', r.status === 200, 'status ' + r.status);
    ck('it reports Supabase is configured',
      body.has_SUPABASE_URL === true && body.has_SUPABASE_ANON_KEY === true,
      'has_SUPABASE_URL=' + body.has_SUPABASE_URL + ' has_SUPABASE_ANON_KEY=' + body.has_SUPABASE_ANON_KEY);
    // The route publishes the ANON key by design (it ships in every page load). What it must
    // never publish is a server secret, and the shape is asserted by ABSENCE of any other key.
    const ALLOWED = new Set(['supabaseUrl', 'supabaseAnonKey', 'proxyUrl', 'imageProxyUrl',
      'has_SUPABASE_URL', 'has_SUPABASE_ANON_KEY', 'has_PROXY_URL', 'has_IMAGE_PROXY_URL',
      'has_XAI_API_KEY', 'edition', 'editionWhy', 'platform', 'platformWhy']);
    const extra = Object.keys(body).filter((k) => !ALLOWED.has(k));
    ck('it publishes no field beyond its documented shape', extra.length === 0,
      'unexpected: ' + extra.join(', '));
    ck('no secret VALUE is published, only has_* booleans',
      typeof body.has_XAI_API_KEY === 'boolean' && body.xaiApiKey === undefined
      && !Object.keys(body).some((k) => /key|secret|token/i.test(k) && k !== 'supabaseAnonKey'
        && !k.startsWith('has_')));
  } catch (e) {
    ck('GET /api/config', false, 'request failed: ' + e.message);
  }
  for (const p of ['/api/config.json', '/api/config.example.json', '/api/sol-scene-test',
    '/api/diag-mock']) {
    try {
      const r = await fetch(ORIGIN + p, { method: 'GET' });
      ck('private or diagnostic path is not served: ' + p, r.status === 404 || r.status === 403,
        'status ' + r.status);
    } catch (e) {
      ck('private or diagnostic path is not served: ' + p, true);
    }
  }
} else {
  console.log('\n  (set SB_CHECK_HTTP=<origin> to also prove the route is served there)');
}

console.log('\n  ' + (n - bad) + '/' + n + ' checks passed');
console.log('  Pattern matching delegated to git. No provider, no model, no spend.');
process.exit(bad ? 1 : 0);
