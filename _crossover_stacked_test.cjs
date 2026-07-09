// STACKED-STEER harness (~80% of a full-stack run, no browser): assembles the REAL crossover steer BEHIND
// the competing directives the HEAVY continuation stacks — a deliberately LEAKY Logan-ish character framing
// (worst-case pressure), OML world-facts, and a gang steer — then authors a mid-run scene and JUDGES whether
// the crossover steer wins: Miles stays Miles, no skin-swap, world coherent. Real contract + 1 author + 1 judge.
const fs = require('fs'); const vm = require('vm');
const src = fs.readFileSync('/Users/romantsukerman/storybound-app/public/app.js', 'utf8');
const block = src.slice(src.indexOf('// ═══════════ FAMOUS-FATE CROSSOVER'), src.indexOf('\n', src.indexOf('[FF-CROSSOVER] harness ready')));
const BASE = 'http://localhost:3000';
let setup = 0, author = 0, judge = 0;
async function proxy(sys, usr, model, mt, t) { const r = await fetch(BASE + '/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }], role: 'SPECIALIST_RENDERER', preferredModel: model, temperature: t, max_tokens: mt, convId: 'xstack' }) }); if (!r.ok) throw new Error('HTTP ' + r.status); const d = await r.json(); return ((d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '').trim(); }
async function grok(sys, usr, o) { setup++; const raw = (await proxy(sys, usr, (o && o.reasoning) ? 'grok-4-1-fast-reasoning' : 'grok-4-1-fast-non-reasoning', (o && o.maxTokens) || 800, 0.2)).replace(/^\s*```[a-z]*\s*/i, '').replace(/\s*```\s*$/i, '').trim(); try { return JSON.parse(raw); } catch (_) { const a = raw.indexOf('{'), b = raw.lastIndexOf('}'); return a > -1 ? JSON.parse(raw.slice(a, b + 1).replace(/,\s*([}\]])/g, '$1')) : null; } }
const ctx = { Math, JSON, String, Number, Array, Boolean, Object, Promise, console: { log: () => {} }, _ffGrokJSON: (...a) => grok(...a), window: {} };
vm.createContext(ctx); vm.runInContext(block, ctx, { filename: 'x' }); const W = ctx.window;

(async () => {
  // real crossover contract + runtime, ticked to mid-run (pressureDebt + a divergence)
  const cls = await W._ffCrossoverClassify('Miles Morales in Old Man Logan');
  const contract = await W._ffBuildCrossoverContract(cls);
  const arc = await W._ffGenerateInsertedArc(contract);
  const cx = { cls, contract, arc };
  const rt = W._ffCrossoverRuntimeInit(cx, 24);
  W._ffCrossoverTick(rt, { sceneIdx: 0, collisionOutcome: null });
  W._ffCrossoverTick(rt, { sceneIdx: 1, playerAction: 'Miles collapses the staging tunnel', collisionOutcome: { outcome: 'diverged', note: 'eastern absorption stalled — off canon' } });
  W._ffCrossoverTick(rt, { sceneIdx: 2, collisionOutcome: null });
  const crossoverSteer = W._ffCrossoverDirectiveFromRT(cx, rt, 4);

  // ── COMPETING DIRECTIVES the real HEAVY path stacks (worst-case, realistic formats) ──
  // 1. LEAKY standard-embody character bible (what a naive OML-embody extraction might wrongly give "Miles"):
  const LEAKY_CHAR = 'PROTAGONIST BIBLE (period=canon, Old Man Logan): a grizzled, weathered survivor in a ruined America, hardened by decades of loss, who long ago swore off violence after a tragedy he can never take back; he carries the guilt of everyone he failed to save and speaks in terse, worn-down silences. His body is scarred; his hands know killing. He wants only to be left alone on his patch of dead earth.';
  // 2. WORLD canon-facts steer (real OML MUST/NEVER, representative):
  const WORLD_FACTS = 'CANON FACTS (HARD — the world of Old Man Logan): MUST — the villains carved up America; the Red Skull is President; heroes died decades ago; the Hulk Gang (Banner\'s cannibal grandchildren) rule California; Logan is a broken old man on a homestead. NEVER — do not resurrect the heroes; do not make this a functioning society.';
  // 3. GROUP-INDIVIDUATION steer (a gang is present):
  const GROUP = 'GROUP INDIVIDUATION (HARD — a gang is present): NAME + DESCRIBE at least 2-3 gang members individually (own name + a characterizing body); the rest stay an undifferentiated mass; never a faceless "the gang".';
  const CRAFT = '\n\nWrite ONE mid-run scene, ~450-550 words, literary first-person past. Concrete, sensory, in-motion. End on a live beat.';

  // Assemble in HEAVY-path order — competing steers first, crossover steer LAST (most authoritative):
  const SYS = LEAKY_CHAR + '\n\n' + WORLD_FACTS + '\n\n' + GROUP + '\n' + crossoverSteer + CRAFT;
  console.log('══ STACKED PROMPT ASSEMBLED ══ (leaky-Logan-bible + OML-facts + gang-steer + REAL crossover steer, in that order)\n');
  const scene = await proxy(SYS, 'CONTEXT: MID-RUN scene (not the opening). Honor the state-backed crossover directive. A Red Skull checkpoint gang is present. Write the scene.', 'grok-4-1-fast-reasoning', 1400, 0.92); author++;
  console.log('══ SCENE ══\n' + scene + '\n');

  // ── JUDGE: did the crossover steer WIN the conflict against the leaky character bible? ──
  const jsys = 'You audit a crossover scene for whether the INSERTED protagonist survived a COMPETING (leaky) character bible. The scene should embody MILES MORALES (young Brooklyn Spider-Man: web-shooters, venom-blast, camouflage, youth, hope, no killing) inside the Old Man Logan WORLD. A deliberately LEAKY bible tried to make the narrator a grizzled, scarred, pacifist-vow OLD KILLER (that is LOGAN, the world protagonist — a SKIN-SWAP the crossover steer must override). Output ONLY JSON {"narratorIsMiles":true|false,"leakedLoganTraits":["..."],"worldIsOML":true|false,"gangIndividuated":true|false,"skinSwap":true|false,"crossoverSteerWon":true|false,"verdict":"one line"}.';
  const jusr = 'SCENE:\n' + scene.slice(0, 3500);
  const v = await grok(jsys, jusr, { reasoning: true, maxTokens: 700 }); judge++;
  console.log('══ JUDGE ══');
  console.log(JSON.stringify(v, null, 1));
  const green = v && v.narratorIsMiles && v.worldIsOML && !v.skinSwap && v.crossoverSteerWon && (!v.leakedLoganTraits || v.leakedLoganTraits.length === 0);
  console.log('\n' + (green ? '✓ CROSSOVER STEER SURVIVES THE STACK (no leakage from the competing bible)' : '⚠ REVIEW — possible leakage: ' + JSON.stringify(v && v.leakedLoganTraits)));
  console.log('\n══ USAGE ══ setup ' + setup + ' · author ' + author + ' · judge ' + judge + ' · scenes ' + author);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
