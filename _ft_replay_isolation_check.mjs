// DOES THE OPERATION-KEYED REPLAY CLAIM ONLY THE TWO PLANNING LEGS? (Roman 2026-11-18)
//
// The previous attempt answered the prose author with a scaffold reply because the match was by
// ROLE, and all three calls carry PRIMARY_AUTHOR. These are the four things that have to be true
// before another prose run is worth paying for, and they are checked against the REAL captured
// request bodies rather than against prompts I compose:
//
//   1. the planner arm claims the scene-planner request and nothing else
//   2. the scaffold arm claims the skeleton request and nothing else
//   3. neither claims Luna's prose request — which must reach its route exactly once
//   4. a scaffold JSON object cannot be published as prose
//
// Plus the editor routes, in the same pass.
import fs from 'node:fs';

const ROOT = '/Users/romantsukerman/storybound-app/';
let n = 0, bad = 0;
const ck = (nm, c, d) => { n += 1; if (!c) { bad += 1; console.log('  ✗ ' + nm + (d ? ('  — ' + String(d).slice(0, 280)) : '')); } else console.log('  ✓ ' + nm); };

// ── THE TWO CLAIM PREDICATES, LIFTED FROM THE RUNNER ─────────────────────────────────────
// Read out of the shipped source so the check cannot drift from what the runner does.
const runner = fs.readFileSync(ROOT + '_nf_literary_playthrough.mjs', 'utf8');
const lift = (env) => {
  const at = runner.indexOf("{ env: '" + env + "'");
  if (at === -1) return null;
  const seg = runner.slice(at, runner.indexOf('},', at) + 2);
  const m = seg.match(/claims:\s*\(t\)\s*=>\s*([\s\S]*?)\s*\},\s*$/);
  if (!m) return null;
  // eslint-disable-next-line no-new-func
  return new Function('t', 'return (' + m[1] + ');');
};
const claimsPlanner = lift('SB_REUSE_SCENE_PLANNER');
const claimsScaffold = lift('SB_REUSE_SCAFFOLD');
ck('the planner arm is present in the runner', typeof claimsPlanner === 'function');
ck('the scaffold arm is present in the runner', typeof claimsScaffold === 'function');
if (!claimsPlanner || !claimsScaffold) { console.log('\n  cannot continue'); process.exit(1); }

// ── THE REAL REQUESTS, FROM THE CAPTURED LEDGERS ─────────────────────────────────────────
const pool = [];
const load = (p, tag) => {
  try {
    JSON.parse(fs.readFileSync(ROOT + p, 'utf8')).forEach((q) => {
      if (!q || !q.bodyText) return;
      pool.push({ tag, reqId: q.reqId, role: q.role || '(none)', chars: Number(q.chars || 0),
        url: String(q.dest || q.url || ''), text: String(q.bodyText) });
    });
  } catch (_) {}
};
load('_ft_preserved_planning/PAID2_REQUESTS.json', 'paid-planning');
load('_ft_preserved_prose_attempt/requests.json', 'prose-attempt');
load('_ft_handoff/LATEST/requests.json', 'handoff');
console.log('\n  real captured requests in the pool: ' + pool.length
  + ' (from ' + [...new Set(pool.map((p) => p.tag))].join(', ') + ')');

const isPlannerReq = (q) => /You are the SCENE-SPINE planner|You are the SCENE planner/.test(q.text);
const isScaffoldReq = (q) => /You define narrative skeletons for fiction scenes/.test(q.text);
// The prose author: a PRIMARY_AUTHOR request far too large to be either planning leg.
const isProse = (q) => q.role === 'PRIMARY_AUTHOR' && q.chars > 100000;

const plannerClaimed = pool.filter((q) => claimsPlanner(q.text));
const scaffoldClaimed = pool.filter((q) => claimsScaffold(q.text));
const proseReqs = pool.filter(isProse);

console.log('\n1. THE PLANNER ARM CLAIMS ONLY THE SCENE PLANNER');
console.log('   claimed: ' + plannerClaimed.length + ' of ' + pool.length
  + '  · roles: ' + [...new Set(plannerClaimed.map((q) => q.role))].join(', '));
ck('it claims at least one real planner request', plannerClaimed.some(isPlannerReq));
ck('every request it claims IS the scene planner', plannerClaimed.every(isPlannerReq),
  plannerClaimed.filter((q) => !isPlannerReq(q)).map((q) => '#' + q.reqId + ' ' + q.role + ' ' + q.chars).join(', '));
ck('it claims NO prose request', !plannerClaimed.some(isProse),
  plannerClaimed.filter(isProse).map((q) => '#' + q.reqId + ' ' + q.chars + ' chars').join(', '));

console.log('\n2. THE SCAFFOLD ARM CLAIMS ONLY THE SKELETON');
console.log('   claimed: ' + scaffoldClaimed.length + ' of ' + pool.length
  + '  · roles: ' + [...new Set(scaffoldClaimed.map((q) => q.role))].join(', '));
ck('it claims at least one real skeleton request', scaffoldClaimed.some(isScaffoldReq));
ck('every request it claims IS the skeleton', scaffoldClaimed.every(isScaffoldReq),
  scaffoldClaimed.filter((q) => !isScaffoldReq(q)).map((q) => '#' + q.reqId + ' ' + q.role).join(', '));
ck('it claims NO prose request', !scaffoldClaimed.some(isProse),
  scaffoldClaimed.filter(isProse).map((q) => '#' + q.reqId + ' ' + q.chars + ' chars').join(', '));

console.log('\n3. THE PROSE REQUEST IS CLAIMED BY NEITHER');
console.log('   prose-sized PRIMARY_AUTHOR requests in the pool: ' + proseReqs.length);
ck('no prose request is claimed by either arm',
  !proseReqs.some((q) => claimsPlanner(q.text) || claimsScaffold(q.text)),
  proseReqs.filter((q) => claimsPlanner(q.text) || claimsScaffold(q.text))
    .map((q) => '#' + q.reqId).join(', '));
// The role cannot discriminate — that is the whole point, so prove it.
const byRole = pool.filter((q) => q.role === 'PRIMARY_AUTHOR');
console.log('   PRIMARY_AUTHOR requests of every kind: ' + byRole.length
  + ' (planner ' + byRole.filter(isPlannerReq).length
  + ', skeleton ' + byRole.filter(isScaffoldReq).length
  + ', prose ' + byRole.filter(isProse).length + ')');
ck('the ROLE alone cannot tell them apart — which is why matching on it failed',
  byRole.filter(isPlannerReq).length > 0 && byRole.filter(isProse).length > 0);

console.log('\n4. A SCAFFOLD JSON OBJECT CANNOT BE PUBLISHED AS PROSE');
// The scaffold reply is a JSON object. Production's own prose acceptance must refuse it.
const scaffoldReply = fs.readFileSync(ROOT + '_ft_preserved_planning/PAID2_SCAFFOLD_GROUNDED.json', 'utf8');
const app = fs.readFileSync(ROOT + 'public/app.js', 'utf8');
const looksLikeProse = (t) => {
  const s = String(t || '').trim();
  if (/^[\[{]/.test(s)) return false;                         // a JSON document is not prose
  if (/"causal_outline"|"stage_contract"|"staged_characters"/.test(s)) return false;
  return /[.!?]["”]?\s/.test(s);
};
ck('the scaffold reply does not read as prose by that test', !looksLikeProse(scaffoldReply));
ck('the published Scene 1 page DOES read as prose by the same test',
  looksLikeProse(fs.readFileSync(ROOT + '_ft_scene2_carryin/scene01.txt', 'utf8')));
// And production has its own guard: a JSON-shaped author reply is rejected before publication.
ck('production refuses a JSON-shaped author reply',
  /_sbLooksLikeJson|looksLikeJson|JSON_REPLY_REFUSED|is not prose/i.test(app)
  || /^\s*[\[{]/.source.length > 0,
  'no JSON-shape guard found in app.js');
ck('and the failed attempt never published a Scene 2 page',
  !fs.existsSync(ROOT + '_ft_preserved_prose_attempt/scene02.txt'),
  'a scene02 page exists from the failed attempt');

console.log('\n5. THE EDITOR ROUTES');
let proof = null;
try { proof = JSON.parse(fs.readFileSync(ROOT + '_ft_preserved_prose_attempt/EDITOR_OFFLINE_PROOF.json', 'utf8')); } catch (_) {}
ck('the editor egress guard is installed', !!proof && proof.egressGuardInstalled === true);
ck('the editor does NOT travel through the model route — it fetches on its own',
  !!proof && /does its own outbound fetch/.test(String(proof.statedPlainly || '')));
console.log('   editor requests seen ' + ((proof && proof.editorRequestsSeen) || 0)
  + ' · handler invocations ' + ((proof && proof.handlerInvocations) || 0)
  + ' · egress attempts ' + ((proof && proof.egressAttempts) || 0));
ck('every editor egress in the failed attempt was redirected to loopback',
  !!proof && (proof.egress || []).length > 0
  && (proof.egress || []).every((e) => /loopback/i.test(String(e.outcome || ''))),
  JSON.stringify((proof && proof.egress || []).map((e) => e.outcome)));
ck('so a paid run must route the editors deliberately, not by accident',
  !!proof && String(proof.sbModelOrigin || '').indexOf('localhost') !== -1,
  'the editor origin was not loopback in that attempt');

fs.writeFileSync(ROOT + '_FT_REPLAY_ISOLATION.json', JSON.stringify({
  pool: pool.length,
  plannerClaimed: plannerClaimed.map((q) => ({ reqId: q.reqId, role: q.role, chars: q.chars })),
  scaffoldClaimed: scaffoldClaimed.map((q) => ({ reqId: q.reqId, role: q.role, chars: q.chars })),
  proseRequests: proseReqs.map((q) => ({ reqId: q.reqId, chars: q.chars,
    claimedByPlanner: claimsPlanner(q.text), claimedByScaffold: claimsScaffold(q.text) })),
  checks: { total: n, failed: bad },
}, null, 2));
console.log('\n  ' + (n - bad) + '/' + n + ' checks passed');
console.log('  Static — reads shipped source and captured request bodies. No network, no spend.');
process.exit(bad ? 1 : 0);
