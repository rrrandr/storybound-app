// /api/mistral-proxy UPSTREAM-ATTEMPT CONTAINMENT — AST proof, not a source grep. $0, no dispatch.
//
// Injecting _noFallback only helps where the handler CONSUMES it, and "the tier is cheap" is not an
// answer to "how many upstream calls can one client request make?". /api/proxy needed the flag because
// it walks a ROLE_MODEL_CHAIN and `continue`s on error. This handler is a different shape: the question
// is whether it has any retry mechanism at all.
//
// The proof is structural: exactly one upstream fetch, and it is not inside any loop — so one client
// request can produce at most one upstream call, and no flag is required to contain it.
//
// usage: node _mistral_proxy_containment_proof.mjs

import * as acorn from 'acorn';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass: !!pass });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '\n        → ' + String(detail).slice(0, 400) : ''));
};
const LOOPS = new Set(['ForStatement', 'ForOfStatement', 'ForInStatement', 'WhileStatement', 'DoWhileStatement']);

// Returns every upstream fetch call with the loop ancestry above it.
function fetchSites(source) {
  const ast = acorn.parse(source, { ecmaVersion: 2022, sourceType: 'module' });
  const out = [];
  (function walk(node, loops) {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'CallExpression') {
      const c = node.callee;
      const name = (c && c.type === 'Identifier') ? c.name
        : (c && c.type === 'MemberExpression' && c.property && c.property.name) || null;
      if (name === 'fetch') out.push({ start: node.start, loops: loops.slice() });
    }
    const next = LOOPS.has(node.type) ? loops.concat([node.type]) : loops;
    for (const k of Object.keys(node)) {
      if (k === 'type' || k === 'start' || k === 'end' || k === 'loc') continue;
      const v = node[k];
      if (Array.isArray(v)) { for (const x of v) if (x && typeof x.type === 'string') walk(x, next); }
      else if (v && typeof v.type === 'string') walk(v, next);
    }
  })(ast, []);
  return out;
}

const SRC_PATH = path.join(__dirname, 'api', 'mistral-proxy.js');
const src = fs.readFileSync(SRC_PATH, 'utf8');
const sites = fetchSites(src);
const lineOf = (off) => src.slice(0, off).split('\n').length;

console.log('=== /api/mistral-proxy CONTAINMENT (AST, $0) ===\n');
console.log('    upstream fetch sites: ' + JSON.stringify(sites.map((s) => ({ line: lineOf(s.start), loops: s.loops }))));

ok('there is EXACTLY ONE upstream fetch in the handler', sites.length === 1,
  JSON.stringify(sites.map((s) => lineOf(s.start))));
ok('...and it is NOT inside any loop, so one request cannot become several upstream calls',
  sites.length === 1 && sites[0].loops.length === 0, JSON.stringify(sites[0] && sites[0].loops));
ok('the handler has NO model chain to walk', !/modelChain|ROLE_MODEL_CHAIN/.test(src));
ok('...and therefore does not consume _noFallback — it has no fallback to disable',
  !/_noFallback/.test(src));
ok('the upstream call is wrapped in try/catch so a failure RETURNS rather than repeating',
  /catch \(err\)|catch \(e\)/.test(src));
// A retry could also hide in an explicit recursive call of the handler.
ok('no self-recursive retry of the handler', (src.match(/module\.exports\s*=\s*async function (\w+)/) || [])[1]
  ? new RegExp('\\b' + (src.match(/module\.exports\s*=\s*async function (\w+)/) || [])[1] + '\\s*\\(').test(
      src.replace(/module\.exports\s*=\s*async function \w+\s*\(/, '')) === false
  : true);

// ── RED SELF-TEST: the walker must actually notice a looped fetch ──────────────────────────────
const LOOPED = 'export default async function h(){ for (const m of chain) { await fetch("x", {}); } }';
const CLEAN = 'export default async function h(){ await fetch("x", {}); }';
const lr = fetchSites(LOOPED), cr = fetchSites(CLEAN);
ok('RED — a fetch inside a for-loop IS detected as looped',
  lr.length === 1 && lr[0].loops.length === 1 && lr[0].loops[0] === 'ForOfStatement', JSON.stringify(lr));
ok('GREEN — and an unlooped fetch is not flagged, so the check is not refusing everything',
  cr.length === 1 && cr[0].loops.length === 0, JSON.stringify(cr));

const passed = results.filter((r) => r.pass).length;
console.log('\n' + '='.repeat(86));
console.log('  ' + passed + '/' + results.length + ' assertions passed');
console.log('  CONCLUSION: /api/mistral-proxy makes at most ONE upstream call per client request by');
console.log('  STRUCTURE, not by flag. No containment work is needed there; _noFallback is inert.');
if (passed !== results.length) console.log('  FAILED: ' + results.filter((r) => !r.pass).map((r) => r.name).join(' | '));
process.exit(passed === results.length ? 0 : 1);
