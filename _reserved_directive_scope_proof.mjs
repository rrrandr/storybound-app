// RESERVED-CANON DIRECTIVE — LEXICAL SCOPE PROOF. AST, not regex. Zero dispatches, $0.
//
// The directive is DEFINED around line 193k and consumed at ~227k (CG author) and ~268k (literary
// introPrompt). Both call sites guard with `typeof _buildReservedContentAuthoringDirective ===
// 'function'`, which is exactly the shape that FAILS SILENTLY: if the name does not resolve at that
// site the guard is false, the interpolation contributes an empty string, and the prompt is built
// without the rule while a source grep still "proves" delivery. That is the
// feedback_delivered_to_wrong_layer failure, and it already bit this session once (the weak-turn
// restraint referenced act/dia names that were not in scope in the planner builder).
//
// A function declared in scope S is visible to every site lexically inside S, nested functions
// included. So the proof is: find the scope node S that CONTAINS the declaration, then assert each
// call site's offset lies inside S.
//
// usage: node _reserved_directive_scope_proof.mjs

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

const SRC_PATH = path.join(__dirname, 'public', 'app.js');
const src = fs.readFileSync(SRC_PATH, 'utf8');
const ast = acorn.parse(src, { ecmaVersion: 2022, sourceType: 'script', locations: true });

const DECL = '_buildReservedContentAuthoringDirective';
const SIBLING = '_buildSeedContextDirective';       // the proven-working delivery path for world truths

// Walk, carrying a stack of scope nodes (Program + every function). Record where each named
// FunctionDeclaration lives, and every CallExpression on the names we care about.
const declScopes = new Map();          // fn name -> enclosing scope node
const calls = [];                      // { name, start }
const SCOPE_TYPES = new Set(['Program', 'FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);

(function walk(node, scopeStack) {
  if (!node || typeof node.type !== 'string') return;
  if (node.type === 'FunctionDeclaration' && node.id && node.id.name) {
    // A declaration belongs to the scope ENCLOSING it, not to its own body.
    if (!declScopes.has(node.id.name)) declScopes.set(node.id.name, scopeStack[scopeStack.length - 1]);
  }
  if (node.type === 'CallExpression' && node.callee && node.callee.type === 'Identifier') {
    calls.push({ name: node.callee.name, start: node.start });
  }
  const nextStack = SCOPE_TYPES.has(node.type) ? scopeStack.concat([node]) : scopeStack;
  for (const k of Object.keys(node)) {
    if (k === 'type' || k === 'loc' || k === 'start' || k === 'end') continue;
    const v = node[k];
    if (Array.isArray(v)) { for (const c of v) if (c && typeof c.type === 'string') walk(c, nextStack); }
    else if (v && typeof v.type === 'string') walk(v, nextStack);
  }
})(ast, [ast]);

console.log('=== RESERVED-CANON DIRECTIVE — LEXICAL SCOPE PROOF (AST, $0) ===\n');

const S = declScopes.get(DECL);
ok('the directive is declared exactly once, as a function declaration', !!S,
  'no FunctionDeclaration named ' + DECL);
const sibScope = declScopes.get(SIBLING);
ok('the already-working world-truth builder is declared in the SAME scope',
  !!sibScope && !!S && sibScope.start === S.start,
  JSON.stringify({ directiveScope: S && S.start, siblingScope: sibScope && sibScope.start }));

const declCount = (src.match(new RegExp('function\\s+' + DECL + '\\s*\\(', 'g')) || []).length;
ok('...and only once — no shadowing copy in another scope', declCount === 1, String(declCount));

// The two real call sites.
const siteCalls = calls.filter((c) => c.name === DECL);
console.log('    call sites: ' + siteCalls.length + ' at offsets ' + JSON.stringify(siteCalls.map((c) => c.start)));
ok('there are exactly TWO call sites — the CG author builder and the literary introPrompt',
  siteCalls.length === 2, JSON.stringify(siteCalls));

const lineOf = (off) => src.slice(0, off).split('\n').length;
for (const c of siteCalls) {
  const inside = S && c.start > S.start && c.start < S.end;
  ok('call site at line ' + lineOf(c.start) + ' is lexically INSIDE the declaring scope, so the'
    + ' typeof guard cannot be silently false', !!inside,
    JSON.stringify({ site: c.start, scope: S && [S.start, S.end] }));
}

// Pin the two sites to the payloads they are supposed to be in, so a future move is caught.
const cgIdx = src.indexOf('function _buildCGScreenplaySystemPrompt');
const introIdx = src.indexOf('const introPrompt = `');
ok('one call site sits after the CG author builder opens', siteCalls.some((c) => c.start > cgIdx));
ok('the other sits inside the literary introPrompt template',
  siteCalls.some((c) => Math.abs(c.start - introIdx) < 400), JSON.stringify({ introIdx }));
ok('the literary call sits immediately after the seed-context directive that DELIVERS the reserved truth',
  /_buildSeedContextDirective\(\) : ''\)\}\$\{\(typeof _buildReservedContentAuthoringDirective/.test(src));

// ── RED SELF-TEST ────────────────────────────────────────────────────────────────────────────
// The logic above must be shown to FAIL on the very defect it exists to catch, or it is just nine
// green lines. Same walker, run over a synthetic file where the declaration is nested one scope too
// deep and the call site sits outside it — the exact shape of a silently-false typeof guard.
function scopeOf(source, fnName) {
  const tree = acorn.parse(source, { ecmaVersion: 2022, sourceType: 'script' });
  let found = null; const hits = [];
  (function w(node, stack) {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'FunctionDeclaration' && node.id && node.id.name === fnName && !found) {
      found = stack[stack.length - 1];
    }
    if (node.type === 'CallExpression' && node.callee && node.callee.type === 'Identifier'
        && node.callee.name === fnName) hits.push(node.start);
    const next = SCOPE_TYPES.has(node.type) ? stack.concat([node]) : stack;
    for (const k of Object.keys(node)) {
      if (k === 'type' || k === 'loc' || k === 'start' || k === 'end') continue;
      const v = node[k];
      if (Array.isArray(v)) { for (const c of v) if (c && typeof c.type === 'string') w(c, next); }
      else if (v && typeof v.type === 'string') w(v, next);
    }
  })(tree, [tree]);
  return { scope: found, calls: hits };
}
const BAD = `
  function outer() {
    function _theDirective() { return 'x'; }
  }
  function consumer() {
    return (typeof _theDirective === 'function' ? _theDirective() : '');
  }
`;
const GOOD = `
  function _theDirective() { return 'x'; }
  function consumer() {
    return (typeof _theDirective === 'function' ? _theDirective() : '');
  }
`;
const bad = scopeOf(BAD, '_theDirective');
const good = scopeOf(GOOD, '_theDirective');
ok('RED — the walker reports an out-of-scope call site as NOT inside the declaring scope',
  bad.calls.length === 1 && !(bad.calls[0] > bad.scope.start && bad.calls[0] < bad.scope.end),
  JSON.stringify({ call: bad.calls, scope: [bad.scope.start, bad.scope.end] }));
ok('GREEN — and the same walker accepts the in-scope version, so it is not simply refusing everything',
  good.calls.length === 1 && good.calls[0] > good.scope.start && good.calls[0] < good.scope.end,
  JSON.stringify({ call: good.calls, scope: [good.scope.start, good.scope.end] }));

const passed = results.filter((r) => r.pass).length;
console.log('\n' + '='.repeat(86));
console.log('  ' + passed + '/' + results.length + ' assertions passed');
if (passed !== results.length) console.log('  FAILED: ' + results.filter((r) => !r.pass).map((r) => r.name).join(' | '));
process.exit(passed === results.length ? 0 : 1);
