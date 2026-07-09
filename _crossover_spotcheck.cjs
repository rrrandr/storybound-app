// ONE mid-run prose spot-check: real crossover contract + runtime ticked to carry pressureDebt + a
// divergenceFlag, then generate ONE scene and confirm the prose reflects STATE-BACKED consequence.
const fs = require('fs'); const vm = require('vm');
const src = fs.readFileSync('/Users/romantsukerman/storybound-app/public/app.js', 'utf8');
const block = src.slice(src.indexOf('// ═══════════ FAMOUS-FATE CROSSOVER'), src.indexOf('\n', src.indexOf('[FF-CROSSOVER] harness ready')));
const BASE = 'http://localhost:3000';
let setup = 0, authorC = 0;
async function proxy(sys, usr, model, mt, t) { const r = await fetch(BASE + '/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }], role: 'SPECIALIST_RENDERER', preferredModel: model, temperature: t, max_tokens: mt, convId: 'xspot' }) }); if (!r.ok) throw new Error('HTTP ' + r.status); const d = await r.json(); return ((d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '').trim(); }
async function grok(sys, usr, o) { setup++; const raw = (await proxy(sys, usr, (o && o.reasoning) ? 'grok-4-1-fast-reasoning' : 'grok-4-1-fast-non-reasoning', (o && o.maxTokens) || 800, 0.2)).replace(/^\s*```[a-z]*\s*/i, '').replace(/\s*```\s*$/i, '').trim(); try { return JSON.parse(raw); } catch (_) { const a = raw.indexOf('{'), b = raw.lastIndexOf('}'); return a > -1 ? JSON.parse(raw.slice(a, b + 1).replace(/,\s*([}\]])/g, '$1')) : null; } }
async function author(sys, usr) { authorC++; return proxy(sys, usr, 'grok-4-1-fast-reasoning', 1400, 0.92); }
const ctx = { Math, JSON, String, Number, Array, Boolean, Object, Promise, console: { log: () => {} }, _ffGrokJSON: (...a) => grok(...a), window: {} };
vm.createContext(ctx); vm.runInContext(block, ctx, { filename: 'x' }); const W = ctx.window;

(async () => {
  const cls = await W._ffCrossoverClassify('Miles Morales in Old Man Logan');
  const contract = await W._ffBuildCrossoverContract(cls);
  const arc = await W._ffGenerateInsertedArc(contract);
  const cx = { cls, contract, arc };
  const rt = W._ffCrossoverRuntimeInit(cx, 24);
  // Drive to mid-run: ignore the first collision a couple scenes (debt), then DIVERGE it, then ignore again.
  W._ffCrossoverTick(rt, { sceneIdx: 0, collisionOutcome: null });
  W._ffCrossoverTick(rt, { sceneIdx: 1, collisionOutcome: null });
  W._ffCrossoverTick(rt, { sceneIdx: 2, playerAction: 'Miles collapses the staging tunnel', collisionOutcome: { outcome: 'diverged', note: 'the eastern absorption timeline is stalled — off canon' } });
  W._ffCrossoverTick(rt, { sceneIdx: 3, collisionOutcome: null });
  W._ffCrossoverTick(rt, { sceneIdx: 4, collisionOutcome: null });
  const dir = W._ffCrossoverDirectiveFromRT(cx, rt, 5);
  console.log('══ MID-RUN STATE ══');
  console.log('beat ' + (rt.insertedArc.idx + 1) + '/' + rt.insertedArc.beats.length + ' · collision ' + rt.worldClock.idx + ' · pressureDebt ' + rt.worldClock.pressureDebt + ' · divergences ' + JSON.stringify(Object.keys(rt.divergenceFlags)));
  console.log('\n══ STATE-BACKED DIRECTIVE (tail) ══\n' + dir.slice(dir.indexOf('CURRENT INSERTED-ARC')));
  const cc = contract.characterCanon || {}, wc = contract.worldCanon || {};
  const BIBLE = 'FF CROSSOVER, first-person past tense, literary, ~450-550 words.\nPC (narrator): ' + contract.embodiedPC + '. VOICE: ' + (cc.voice || '') + ' POWERS: ' + (cc.powers || '') + ' MORAL: ' + (cc.moralCode || '') + '.\nWORLD: ' + wc.source + '. STATE: ' + (wc.worldState || '') + ' TONE: ' + (wc.tone || '') + '. World protagonist(s) stay separate: ' + JSON.stringify(wc.majorCanonCharacters || []) + '.';
  const CRAFT = '\n\nWrite ONE mid-run scene, ~450-550 words, literary first-person past. Concrete, sensory, in-motion. End on a live beat.';
  const scene = await author(BIBLE + dir + CRAFT, 'CONTEXT: this is a MID-RUN scene (not the opening). Honor the state-backed directive above — the pressure debt and the divergence already in effect. Write the scene.');
  console.log('\n══ MID-RUN SCENE ══\n' + scene);
  console.log('\n══ USAGE ══ setup ' + setup + ' · author ' + authorC + ' (1 scene)');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
