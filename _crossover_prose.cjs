// Crossover prose playthrough: runs the REAL crossover pipeline (classify→two-canon contract→inserted arc→
// directive) then generates the opening scenes through the real author (Grok 4.3), chained. Not the full
// production stack, but exercises the actual crossover setup output → prose.
const fs = require('fs'); const vm = require('vm');
const src = fs.readFileSync('/Users/romantsukerman/storybound-app/public/app.js', 'utf8');
const block = src.slice(src.indexOf('// ═══════════ FAMOUS-FATE CROSSOVER'), src.indexOf('\n', src.indexOf('[FF-CROSSOVER] harness ready')));
const BASE = 'http://localhost:3000';
let classifyCalls = 0, authorCalls = 0;
async function proxy(sys, usr, model, maxTokens, temp) {
  const res = await fetch(BASE + '/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }], role: 'SPECIALIST_RENDERER', preferredModel: model, temperature: temp, max_tokens: maxTokens, convId: 'xprose' }) });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const d = await res.json();
  return ((d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '').trim();
}
async function ffGrokJSON(sys, usr, opts) { classifyCalls++; const raw = (await proxy(sys, usr, (opts && opts.reasoning) ? 'grok-4-1-fast-reasoning' : 'grok-4-1-fast-non-reasoning', (opts && opts.maxTokens) || 800, 0.2)).replace(/^\s*```[a-z]*\s*/i, '').replace(/\s*```\s*$/i, '').trim(); try { return JSON.parse(raw); } catch (_) { const a = raw.indexOf('{'), b = raw.lastIndexOf('}'); return a > -1 ? JSON.parse(raw.slice(a, b + 1).replace(/,\s*([}\]])/g, '$1')) : null; } }
async function author(sys, usr) { authorCalls++; return proxy(sys, usr, 'grok-4-1-fast-reasoning', 1400, 0.92); }
const ctx = { Math, JSON, String, Number, Array, Boolean, Promise, console: { log: () => {} }, _ffGrokJSON: (...a) => ffGrokJSON(...a), window: {} };
vm.createContext(ctx); vm.runInContext(block, ctx, { filename: 'x' });
const W = ctx.window;

(async () => {
  console.log('════ CROSSOVER SETUP (real pipeline) — "Miles Morales in Old Man Logan" ════\n');
  const cls = await W._ffCrossoverClassify('Miles Morales in Old Man Logan');
  const contract = await W._ffBuildCrossoverContract(cls);
  const arc = await W._ffGenerateInsertedArc(contract);
  const dir = W._buildCrossoverDirective(contract);
  const cc = contract.characterCanon || {}, wc = contract.worldCanon || {}, fp = contract.fusionPolicy || {};
  console.log('PC: ' + contract.embodiedPC + ' | worldCanon: ' + wc.source + ' | mode: ' + contract.mode);
  console.log('insertion: ' + JSON.stringify(fp.insertionPremise));
  console.log('pcWant: ' + arc.pcWant);
  console.log('beats: ' + (arc.beats || []).map((b, i) => (i + 1) + '.' + (b.kind || '') + ':' + b.beat).join(' | ') + '\n');

  const BIBLE = 'STORY: a Famous-Fate CROSSOVER. First-person PAST tense, literary register, ~450-600 words per scene.\n'
    + 'EMBODIED PC (narrator): ' + contract.embodiedPC + '. IDENTITY: ' + (cc.identity || '') + ' POWERS: ' + (cc.powers || '') + ' VOICE: ' + (cc.voice || '') + ' MORAL CODE: ' + (cc.moralCode || '') + ' DRIVE: ' + (cc.coreWoundOrDrive || '') + '\n'
    + 'MUST NOT INVENT/OVERWRITE about the PC: ' + JSON.stringify(cc.mustNotInventOrOverwrite || []) + '\n'
    + 'WORLD: ' + wc.source + '. STATE: ' + (wc.worldState || '') + ' TONE: ' + (wc.tone || '') + ' GEOGRAPHY: ' + (wc.geography || '') + ' FACTIONS: ' + JSON.stringify(wc.factions || []) + ' ANTAGONISTS: ' + JSON.stringify(wc.antagonistForces || []) + '\n'
    + 'THE WORLD\'S OWN PROTAGONIST + major canon figures (SEPARATE — they keep their own arcs, the PC does NOT replace them): ' + JSON.stringify(wc.majorCanonCharacters || []) + '\n'
    + 'CANON CLOCK (moving offscreen): ' + (wc.canonClock || '');
  const CRAFT = '\n\nWrite the NEXT scene as literary first-person past-tense prose, ~450-600 words. Concrete + sensory; the narrator in motion; real interiority; dialogue that characterizes. End on a live beat or small choice, never a bow or summary. Render, do not summarize.';

  console.log('════ PROSE PLAYTHROUGH (opening 3 beats, real author, chained) ════');
  const beats = (arc.beats || []).slice(0, 3);
  let recap = 'OPENING — insertion: ' + JSON.stringify(fp.insertionPremise);
  for (let i = 0; i < beats.length; i++) {
    const b = beats[i];
    const sys = BIBLE + dir + CRAFT;
    const usr = 'CONTEXT SO FAR: ' + recap + '\n\nTHIS SCENE\'S BEAT (' + (b.kind || '') + '): ' + b.beat + '\nPC WANT: ' + arc.pcWant + '\n\nWrite the scene.';
    const scene = await author(sys, usr);
    console.log('\n──────── SCENE ' + (i + 1) + '/3 · beat=' + (b.kind || '') + ' ────────\n' + scene + '\n');
    recap = 'Previous scene (' + (b.kind || '') + '): ' + scene.slice(-600);
  }
  console.log('\n════ USAGE ════\nsetup/classify calls: ' + classifyCalls + ' · author (prose) calls: ' + authorCalls);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
