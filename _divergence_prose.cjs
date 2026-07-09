// Prose test: real classifier (ambiguity check) + real author (Grok 4.3) running the REAL detour directive
// across hook→turn→return, chained. Not the full production stack, but exercises the directive + author.
const fs = require('fs'); const vm = require('vm');
const src = fs.readFileSync('/Users/romantsukerman/storybound-app/public/app.js', 'utf8');
const block = src.slice(src.indexOf('// ═══════════ ORIGINAL-STORY BOUNDED DIVERGENCE'), src.indexOf('\n', src.indexOf('[ORIG-DIVERGE] harness ready')));
const BASE = 'http://localhost:3000';
let classifyCalls = 0, authorCalls = 0;

async function proxy(sys, usr, model, maxTokens, temp) {
  const res = await fetch(BASE + '/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }], role: 'SPECIALIST_RENDERER', preferredModel: model, temperature: temp, max_tokens: maxTokens, convId: 'prose-test' }) });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + (await res.text()).slice(0, 120));
  const data = await res.json();
  return ((data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || data.content || '').trim();
}
async function classifyGrok(sys, usr, opts) { classifyCalls++; const raw = (await proxy(sys, usr, 'grok-4-1-fast-non-reasoning', (opts && opts.maxTokens) || 500, 0.2)).replace(/^\s*```[a-z]*\s*/i, '').replace(/\s*```\s*$/i, '').trim(); try { return JSON.parse(raw); } catch (_) { const a = raw.indexOf('{'), b = raw.lastIndexOf('}'); return JSON.parse(raw.slice(a, b + 1).replace(/,\s*([}\]])/g, '$1')); } }
async function author(sys, usr) { authorCalls++; return proxy(sys, usr, 'grok-4-1-fast-reasoning', 1400, 0.92); }

const ctx = { Math, JSON, String, Number, Array, Boolean, console: { log: () => {}, warn: () => {} }, _ffGrokJSON: (...a) => classifyGrok(...a), window: { __origDivergence: undefined, A_PLOT_TIER_CONFIG: { affair: { timelineLength: 60, milestoneCount: 8, climaxAtPercent: 90, resolutionAtPercent: 100 } } } };
vm.createContext(ctx); vm.runInContext(block, ctx, { filename: 'div' });
const W = ctx.window;
ctx.window.state = { fateMode: 'original', storyLength: 'affair', turnCount: 5, aPlot: { goal: "prove the stolen research is Maya's before Vance's patent lands", antagonistOrAntiForce: 'Cyrus Vance', milestones: [{ atScene: 30, kind: 'midpoint_reversal', event: 'mentor promised Vance the work', triggered: false }, { atScene: 52, kind: 'crisis', event: 'the hearing', triggered: false }, { atScene: 60, kind: 'resolution', event: 'joint release', triggered: false }] }, subplots: [{ title: 'a masked woman who watches the lab from the disused service tunnels', status: 'dormant' }] };

const BIBLE = `STORY: "The Vantage" — a contemporary romance-thriller, first-person PAST tense, literary register.
NARRATOR / PROTAGONIST: Maya Okonkwo, a forensic data scientist — sharp, controlled, allergic to being handled.
LOVE INTEREST: Elias Reyes, outside counsel on her case — reads her too easily, never says the obvious thing. The pull between them is a primary engine of this book; keep it alive where the scene allows.
MAIN PLOT (this is BACKGROUNDED during the detour, see the directive): Maya's late mentor's research was stolen; Cyrus Vance filed the patent under his own name; Maya has days to prove the work is hers before it lands.
SEEDED HOOK the player is chasing: a masked woman has been watching the lab from the disused service tunnels beneath the campus — no one else seems to have clocked her.
SETTING: a half-empty research campus at night, old infrastructure, rain.`;
const CRAFT = `\n\nWrite the NEXT scene as literary first-person past-tense prose, ~450-600 words. Concrete and sensory; the narrator in motion; real interiority without navel-gazing; dialogue that characterizes. End on a live beat or a small open choice, never a bow or a summary. Render the scene, do not summarize it.`;
const BG = `\n\nA-PLOT BACKGROUNDED (the player is on a bounded DETOUR this scene): do NOT hard-press the main goal (the patent/hearing) or force the scene to be about wanting Elias — let the main pressure HUM OFFSCREEN (time passing, the situation quietly worsening) while the detour plays; it returns to the foreground, heightened, when the detour resolves.`;

function setPhase(p, gen) { ctx.window.state._origDivergence = { detour: { size: 'side_thread', target: 'the masked woman in the tunnels', targetType: 'subplot', hookSource: 'a masked woman who watches the lab from the disused service tunnels', phase: p, span: 3, generated: gen, done: false }, pressureDebt: gen, veerStreak: 0, grantedThisStory: 1, returnDeltas: [], history: [] }; }

(async () => {
  console.log('════════ PART A — CLASSIFIER AMBIGUITY CHECK (real classifier) ════════\n');
  const probes = [
    { label: 'CLEAN veer (should be hard_veer)', move: "the hearing can wait — I leave the prep and go down into the tunnels after her, I have to know who she is" },
    { label: 'AMBIGUOUS literary hesitation (should be soft_drift / low-conf, NOT a clean grant)', move: "I hesitate at the mouth of the tunnel, thinking of the hearing, of everything I still have to prove — but the masked woman's warning keeps echoing, and I can't quite make myself turn back toward the lab" }
  ];
  for (const p of probes) {
    ctx.window.state._origDivergence = undefined; ctx.window.state.turnCount++;
    // call the real classifier via the real _origClassifyMove path (tick classifies when no active detour)
    const capture = []; const orig = ctx._ffGrokJSON; ctx._ffGrokJSON = async (s, u, o) => { const r = await classifyGrok(s, u, o); capture.push(r); return r; };
    await W._origDivergenceTick(p.move, {});
    ctx._ffGrokJSON = orig;
    const r = capture[0] || {};
    console.log('• ' + p.label);
    console.log('  move: "' + p.move + '"');
    console.log('  → ' + r.classification + ' (conf ' + r.confidence + ', size ' + r.suggestedDetourSize + ', target ' + (r.veerTarget || '—') + ')\n');
  }

  console.log('════════ PART B — DETOUR PROSE (real author, hook→turn→return, chained) ════════');
  console.log('Setup: Maya has just chosen (twice) to chase the masked woman into the tunnels; a side_thread was granted.\n');
  let recap = "Prior scene (on-track): Maya and Elias argued over the hearing timeline in the empty lab; she caught the masked woman watching again from the tunnel grate and, against Elias's warning, decided to go after her.";
  const phases = [{ p: 'hook', g: 1, act: "I go after the masked woman, down into the service tunnels." }, { p: 'turn', g: 2, act: "I press deeper, following her, refusing to lose her this time." }, { p: 'return', g: 3, act: "I stay with what she's shown me until it's done." }];
  const scenes = [];
  for (const ph of phases) {
    setPhase(ph.p, ph.g);
    const dir = W._buildOrigDivergenceDirective();
    const sys = BIBLE + BG + dir + CRAFT;
    const usr = 'CONTEXT SO FAR: ' + recap + '\n\nPLAYER ACTION THIS SCENE: "' + ph.act + '"\n\nWrite the next scene.';
    const scene = await author(sys, usr);
    scenes.push({ phase: ph.p, scene });
    console.log('\n──────── DETOUR SCENE ' + ph.g + '/3 · phase=' + ph.p + ' ────────\n' + scene + '\n');
    recap = 'Previous detour scene (' + ph.p + '): ' + scene.slice(-600);
  }
  console.log('\n════════ USAGE ════════');
  console.log('classifier calls: ' + classifyCalls + ' · author (prose scene) calls: ' + authorCalls);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
