// SCENE-1 CLOSURE INSTRUMENTER — shared, in-memory, AST-anchored.
//
// The Scene-1 repair cascade's predicates are NOT module-scope helpers. Per AST:
//
//   handleBeginStory                (FunctionDeclaration, app.js:242881, 1 occurrence)
//     ├─ _scene1ObjectTokenList     (FunctionDeclaration, :246147, depth 2)
//     ├─ _scene1HasConcreteHook     (FunctionDeclaration, :253898, depth 2)
//     └─ _evaluate                  (VariableDeclarator,  :255094, 1 occurrence)
//
// They are closure-locals of a function that only runs during a story. That is why every
// page-load probe of `window._scene1HasConcreteHook` returns undefined — the binding does
// not exist yet, and never exists on `window` at all.
//
// This exports them by rewriting the SERVED source at AST-derived byte offsets.
//
// PLACEMENT MATTERS. An export written at the head of handleBeginStory's body captures
// `undefined`: both function declarations sit inside a BLOCK, so under Annex B semantics
// the binding is hoisted to function scope but stays uninitialised until the block runs.
// (Observed directly: the head assignment succeeded — `__x_instrumented` was true — yet
// `typeof __x_hook` was "undefined".) Every export therefore goes immediately AFTER the
// statement that defines its target.
//
// Every anchor count is asserted. The on-disk file is never written.
import * as acorn from 'acorn';
import fs from 'fs';

const EXPORTS = [
  { name: '_scene1HasConcreteHook',  as: '__x_hook',     kind: 'fn' },
  { name: '_scene1ObjectTokenList',  as: '__x_tokens',   kind: 'fn' },
  { name: '_evaluate',               as: '__x_evaluate', kind: 'var' },
  { name: '_SCENE1_HOOK_SHAPE_TOKENS', as: '__x_shapeTokens', kind: 'var' },
];
const stmt = e => `try{window.${e.as}=${e.name};window.__x_instrumented=true;}catch(_){}`;

export function instrument(src) {
  const ast = acorn.parse(src, { ecmaVersion: 'latest', locations: true });
  const hits = new Map(EXPORTS.map(e => [e.name, []]));
  (function walk(n) {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'FunctionDeclaration' && n.id && hits.has(n.id.name)) hits.get(n.id.name).push(n);
    if (n.type === 'VariableDeclarator' && n.id && hits.has(n.id.name)) hits.get(n.id.name).push(n);
    for (const k in n) {
      const v = n[k];
      if (Array.isArray(v)) v.forEach(c => c && typeof c.type === 'string' && walk(c));
      else if (v && typeof v.type === 'string') walk(v);
    }
  })(ast);

  // LOOP-EXIT PROBE — the surgical-repair for-loop, anchored by the only ForStatement
  // whose test mentions _MAX_SCENE1_REGEN_ATTEMPTS. Captures `_currentText` the instant
  // the loop exits, independently of the downstream `text = _currentText` boundary.
  const loops = [];
  (function walk(n) {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'ForStatement' && n.test && src.slice(n.test.start, n.test.end).includes('_MAX_SCENE1_REGEN_ATTEMPTS')) loops.push(n);
    for (const k in n) {
      const v = n[k];
      if (Array.isArray(v)) v.forEach(c => c && typeof c.type === 'string' && walk(c));
      else if (v && typeof v.type === 'string') walk(v);
    }
  })(ast);
  if (loops.length !== 1) throw new Error(`repair loop: expected 1 ForStatement, found ${loops.length}`);

  const inserts = [{
    at: loops[0].end,
    text: `try{window.__x_loopExit=_currentText;window.__x_regenCount=_regenCount;window.__x_instrumented=true;}catch(_){}`,
  }];
  for (const e of EXPORTS) {
    const found = hits.get(e.name);
    if (found.length !== 1) throw new Error(`${e.name}: expected 1 definition, found ${found.length}`);
    let at = found[0].end;
    if (e.kind === 'var') {
      // A `var f = function(){}` statement ends at the first `;` at or after the declarator.
      const semi = src.indexOf(';', at);
      if (semi < 0) throw new Error(`${e.name}: no terminating semicolon found`);
      at = semi + 1;
    }
    inserts.push({ at, text: stmt(e) });
  }

  // Descending offsets so an earlier insert is not shifted by a later one.
  let out = src;
  for (const ins of inserts.sort((a, b) => b.at - a.at)) {
    out = out.slice(0, ins.at) + ins.text + out.slice(ins.at);
  }

  // Round-trip proof: the rewritten source must still parse, and must differ by exactly
  // the inserted strings and nothing else.
  acorn.parse(out, { ecmaVersion: 'latest' });
  const added = inserts.reduce((n, i) => n + i.text.length, 0);
  if (out.length !== src.length + added) throw new Error(`length drift: ${out.length} vs ${src.length + added}`);
  for (const ins of inserts) {
    if (out.split(ins.text).length - 1 !== 1) throw new Error(`export not inserted exactly once: ${ins.text}`);
  }

  return out;
}

export function instrumentedSource(path = 'public/app.js') {
  return instrument(fs.readFileSync(path, 'utf8'));
}

/** Attach the in-memory instrumented app.js to a Playwright page. */
export async function routeInstrumented(page, path = 'public/app.js') {
  const body = instrumentedSource(path);
  await page.route('**/app.js*', r => r.fulfill({
    status: 200, contentType: 'application/javascript; charset=utf-8', body,
  }));
  return body;
}
