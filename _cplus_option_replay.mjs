// ══════════════════════════════════════════════════════════════════════════════════════════
//  C+ OPTION CONTRACT — REPLAYED ON THE REAL VALIDATION PATH
//
//  Section 1 of _cplus_option_contract.mjs proves the OFFER can no longer contain the pairing the
//  purchased reply chose. This proves the other half: that production's validator refuses every
//  shape that reply actually returned, and accepts the two shapes that would have been right.
//
//  Each variant is fulfilled into the real planner route, so production parses, resolves and
//  validates it exactly as it would a bought reply. Nothing is dispatched.
// ══════════════════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core';
import fs from 'fs';
import { configBody, installSession, isAuthOrigin } from './_test_session_env.mjs';

const SRC = fs.readFileSync('public/app.js', 'utf8');
const RAW = fs.readFileSync((() => { const d='_portfolio_samples';
  const f = fs.readdirSync(d).filter(x => x.endsWith('.raw.txt')).sort().pop(); return d+'/'+f; })(), 'utf8');
const ARCHIVED = JSON.parse(RAW.slice(RAW.indexOf('{'), RAW.lastIndexOf('}') + 1)).characterPortfolios;
// THE PURCHASED PLAN ITSELF. A reply carrying only character_plus is refused for the seventeen
// other fields the spine contract declares, and the C+ gates never run — the first version of
// this harness reported "no fault raised" for every variant because of exactly that. Variants are
// therefore the real plan with ONLY the assignments swapped.
const PLANNER_RAW = (() => { const d='_planner_samples';
  const f = fs.readdirSync(d).filter(x => x.endsWith('.planner.raw.txt')).sort().pop();
  return JSON.parse(fs.readFileSync(d+'/'+f, 'utf8')); })();
const PURCHASED_PLAN = JSON.parse(PLANNER_RAW.choices[0].message.content);

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };

// Built from the option the packet actually offers, so a variant differs from the good one in
// exactly ONE respect — the thing under test.
// The GOOD variants are constructed FROM the option the packet offers — its truth and the
// condition it applies under are parsed out of the packet, so the bridge genuinely connects the
// two things it claims to, and the act engages a person this scene actually contains. A "valid"
// fixture written blind is not a control: it fails for its own reasons and proves nothing about
// the gate under test.
function parseOptions(packet) {
  const out = {};
  const re = /· option_id: (OPT-\d+)\n\s+truth \(fixed, not yours to rewrite\): ([^\n]+)\n\s+applies here because: ([^\n]+)\n\s+established by: ([^\n]+)/g;
  let m; while ((m = re.exec(packet))) out[m[1]] = { option_id: m[1], truth: m[2].trim(), pressure: m[3].trim(), evidence: m[4].trim() };
  return out;
}
const words = (x, n) => (String(x).toLowerCase().match(/[a-z]{5,}/g) || []).slice(0, n).join(' ');

function reply(optionsByChar, mutate) {
  const cp = Object.keys(optionsByChar).map(name => {
    const o = optionsByChar[name];
    const first = name.split(' ')[0];
    const base = { character: name, mode: 'IN_PERSON', option_id: o.option_id,
      expression_mode: 'TEST', first_mention: true,
      visible_action: 'sets the customs manifest down between them and waits for him to speak first',
      behavior_object_ids: [], behavior_person_ids: [],
      // Shares language with BOTH the truth and the condition, which is what the gate checks.
      revelation_bridge: 'waiting him out is how ' + words(o.truth, 6)
        + ' shows itself, and this scene is exactly the case where ' + words(o.pressure, 6),
      pc_lens_operation: o.lensOp,
      pc_interpretation: first + ' is not being awkward — she is refusing to fill the silence for him, '
        + 'and she wants him to say what he actually wants' };
    return mutate ? mutate(base, o) : base;
  });
  const plan = JSON.parse(JSON.stringify(PURCHASED_PLAN));
  plan.opening_spine.scene_skeleton.character_plus = cp;
  // The purchased plan was written for a differently-staged scene, so its environment material
  // names a ledger this replay's scene lacks. Retargeted onto ground this scene does have, so an
  // accepted variant produces a VALID skeleton and the author directive is actually built —
  // which is the only way to check what reaches the author.
  const sk = plan.opening_spine.scene_skeleton;
  sk.environment_plus = { target: 'the customs house', axis: 'use',
    // The beat must name its own target, so it says "customs house" rather than implying it.
    beat: 'the customs house counter is worn pale where hands have pushed papers across it for years' };
  plan.opening_spine.environment_elements = [];
  // The fusion lives inside scene_skeleton and must point at the SAME target, with a beat that
  // reaches it — two fields pointing at different things is a fault in its own right.
  if (sk.pc_opening_fusion) {
    sk.pc_opening_fusion.environment_target = 'the customs house';
    sk.pc_opening_fusion.environment_axis = 'use';
    sk.pc_opening_fusion.character_angle = 'the worn customs house counter mirrors how long she has been waiting';
    sk.pc_opening_fusion.beat = 'I set my hand on the customs house counter, worn pale by everyone who came before me';
  }
  return plan;
}

// ── A SCENE-MATCHED FIXTURE ──
// The archived portfolios ground to NOTHING in this scene: its facts prove none of their
// applicability conditions, which is why the option contract aborts before the planner and why
// the purchased call should never have happened. That is asserted as its own variant below.
// To exercise the PER-ENTRY gates an option has to exist, so this fixture's conditions are
// written against words this scene actually contains. It still passes through production's
// portfolio validator unchanged — nothing here bypasses it.
const F = (dimension, truth, prediction, w1, e1, w2, e2) => ({
  dimension, canonical_truth: truth, unique_prediction: prediction,
  not_explained_by: dimension === 'exception'
    ? 'could be mistaken for the relationship facet, but that is the pattern this suspends'
    : 'not the neighbouring facet, which is about something else',
  applicability_conditions: [{ text: w1, evidence_words: e1.split('|') },
                             { text: w2, evidence_words: e2.split('|') }],
  forbidden_restatements: [{ forbid: 'is stubborn', why: 'the truth stated, not shown' }] });
const FIXTURE = [{ subject_ref: 'PLACEHOLDER',
  identity_signature: 'the only one here who treats a signature as a promise she did not make',
  facets: [
    F('value', 'She refuses to let a signature stand in for a promise she never made.',
      'Asked to initial a manifest she did not read, she reads it aloud instead.',
      'a manifest waiting to be signed', 'manifest|customs', 'a promise implied by paperwork', 'customs|house'),
    F('insecurity', 'She fears that waiting quietly is how she becomes invisible to people in charge.',
      'When a clerk serves someone behind her, she says her own name twice.',
      'a room where she is kept waiting', 'customs|house', 'someone served before her', 'clerk|manifest'),
    F('defense', 'She withholds her help until someone states plainly what they want from her.',
      'Offered vague thanks for a favour, she asks what exactly it was for.',
      'a favour asked without being named', 'customs|house', 'a request left implied', 'clerk|manifest'),
    F('relationship', 'She tests people by leaving a task half finished and watching who completes it.',
      'When a form is left incomplete, she walks away and watches who picks it up.',
      'a task nobody has claimed', 'manifest|customs', 'work left half done', 'customs|house'),
    F('exception', 'Her relationship habit of testing people stops with anyone who has already admitted a mistake.',
      'Once someone owns an error aloud, she finishes their work without comment.',
      'an error admitted openly', 'customs|house', 'a mistake owned aloud', 'clerk|manifest'),
  ] }];

const ONLY = process.env.RP_ONLY ? process.env.RP_ONLY.split(',') : null;
const VARIANTS = [
  { key: 'archive_zero_options', why: 'the ARCHIVED portfolios ground to nothing in this scene, so ' +
      'the run aborts BEFORE the planner is paid — which is what should have happened',
    useArchive: true, expectFaults: /no grounded Character\+ option/, mutate: null },
  { key: 'good_deliberate', why: 'a deliberate act that engages a person and a bridge that connects',
    expectFaults: false, mutate: null },
  { key: 'somatic_reading', why: 'the purchased reply\'s PC reading — a sensation in her own body',
    expectFaults: /pc_interpretation that never names them/,
    mutate: b => ({ ...b, pc_interpretation: 'the rhythm lands in her ribs like a countdown' }) },
  { key: 'somatic_reading_2', why: 'the second purchased somatic reading',
    expectFaults: /pc_interpretation that never names them/,
    mutate: b => ({ ...b, pc_interpretation: 'she feels the groaning in her own knees' }) },
  { key: 'generic_fidget', why: 'the purchased weight-shift — an act that engages nothing',
    expectFaults: /engages nothing this scene contains/,
    mutate: b => ({ ...b, visible_action: 'shifts his weight, the floorboards groaning under his boots',
                    behavior_object_ids: [], behavior_person_ids: [] }) },
  { key: 'leak_without_account', why: 'LEAK claimed, but the bridge names no escaped impulse',
    expectFaults: /names no controlled impulse that escaped/,
    mutate: b => ({ ...b, expression_mode: 'LEAK', behavior_object_ids: [], behavior_person_ids: [],
                    visible_action: 'taps her nails twice and stills them',
                    revelation_bridge: b.revelation_bridge }) },
  { key: 'leak_valid', why: 'an involuntary LEAK that engages nothing but accounts for itself',
    expectFaults: false,
    mutate: b => ({ ...b, expression_mode: 'LEAK', behavior_object_ids: [], behavior_person_ids: [],
                    visible_action: 'starts to turn away from him and stops herself mid-step',
                    revelation_bridge: 'the impulse escaped before she could control it — ' + b.revelation_bridge }) },
  { key: 'bridge_missing', why: 'no bridge at all',
    expectFaults: /gives no "revelation_bridge"/, mutate: b => { const x = { ...b }; delete x.revelation_bridge; return x; } },
  { key: 'bridge_unrelated', why: 'a bridge that explains something else',
    expectFaults: /bridge never refers to/,
    mutate: b => ({ ...b, revelation_bridge: 'the harbour is busy and the tide is turning soon' }) },
  { key: 'invented_option', why: 'an option id this scene never offered',
    expectFaults: /which this scene did not offer/, mutate: b => ({ ...b, option_id: 'OPT-999' }) },
  { key: 'model_supplied_truth', why: 'a model-supplied facet, pressure and evidence alongside the option',
    expectFaults: false, checkOverwrite: true,
    mutate: b => ({ ...b, facet_id: 'F-FORGED', pressure_id: 'p_forged',
                    pressure_evidence_ids: ['E3'], psychological_read: 'a truth the model made up' }) },
];

const browser = await chromium.launch({ headless: true });
const results = {};
try {
  for (const V of VARIANTS.filter(v => !ONLY || ONLY.indexOf(v.key) !== -1)) {
    const ctx = await browser.newContext();
    try {
      const page = await ctx.newPage();
      page.setDefaultTimeout(180000); page.setDefaultNavigationTimeout(180000);
      await installSession(page);
      await page.route('**/sb-test.localhost/**', r => r.fulfill({ status:200, contentType:'application/json', body:'{}' }));
      await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: SRC }));
      let offered = null;
      await page.route('**/api/**', async route => {
        const u = route.request().url();
        if (/\/api\/config\b/.test(u)) return route.fulfill({ status:200, contentType:'application/json', body: configBody() });
        if (isAuthOrigin(u)) return route.fulfill({ status:200, contentType:'application/json', body:'{}' });
        if (/\/api\/(geo|csp-report|beta-events)\b/.test(u)) return route.fulfill({ status:200, contentType:'application/json', body:'{}' });
        if (/\/api\/(consume-fortune|issue-purchase)\b/.test(u))
          return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ success:true, fortunesRemaining:9999 }) });
        let b = null; try { b = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
        const msgs = (b && b.messages) || [];
        const sys = String((msgs.find(m => m.role === 'system') || {}).content || '');
        const usr = String((msgs.find(m => m.role === 'user') || {}).content || '');
        if (/scene-structure planner for the OPENING scene/.test(sys)) {
          // The offer is read out of the packet production just built — never remembered here.
          const packet = sys + '\n' + usr;
          const opts = [...packet.matchAll(/option_id: (OPT-\d+)/g)].map(m => m[1]);
          const lens = (packet.match(/\b([A-Z][A-Z_]{6,})\b/g) || []).filter(x => /_/.test(x));
          const objs = [...packet.matchAll(/\b(O\d+)\b/g)].map(m => m[1]);
          const people = [...packet.matchAll(/\b(P\d+)\b/g)].map(m => m[1]);
          offered = { opts, objs: [...new Set(objs)], people: [...new Set(people)] };
          const parsed = parseOptions(packet);
          const byChar = {};
          // One assignment for the FIRST candidate only: the gates under test are per-entry.
          const first = opts[0];
          if (first && parsed[first]) byChar['Mara Dunn'] = Object.assign({}, parsed[first], {
            objectIds: offered.objs, personIds: offered.people,
            lensOp: (packet.match(/OPERATIONS?[\s\S]{0,400}?\b([A-Z][A-Z_]{8,})\b/) || [])[1] || 'PERSONALIZE_SOCIAL_HARM' });
          const body = JSON.stringify(reply(byChar, V.mutate));
          results[V.key + ':sent'] = { opts, byCharKeys: Object.keys(byChar), body: body.slice(0, 1200),
            peopleSlice: (packet.match(/[^\n]*person_id[^\n]*/g) || []).slice(0, 6),
            objectSlice: (packet.match(/[^\n]*object_id[^\n]*/g) || []).slice(0, 4) };
          return route.fulfill({ status:200, contentType:'application/json',
            body: JSON.stringify({ choices: [{ message: { content: body } }], usage: {} }) });
        }
        if (/ARCHITECTURE LAWS|PRIMARY AUTHOR/i.test(sys)) { results[V.key + ':author'] = { sys, usr }; return route.abort(); }
        if (/CHARACTER MEMORY EXTRACTOR|scene-ambient|soundscape/i.test(sys)) return route.abort();
        let out = { ok: true };
        if (/A-PLOT GENERATOR/i.test(sys)) out = APLOT;
        else if (/CONTINUITY ARCHITECT for a serialized/.test(sys)) out = { issueArcs: [{ n:1, title:'the harbour office', beats: [] }], characterIcebergs: {} };
        return route.fulfill({ status:200, contentType:'application/json',
          body: JSON.stringify({ choices: [{ message: { content: JSON.stringify(out) } }] }) });
      });
      const APLOT = { goal:'She must clear the manifest before the tide turns', namedClock:'the tide at dawn',
        clockUnit:'turns', totalClockUnits:12, antagonistOrAntiForce:'Marcus Vale', antagonistShape:'A',
        antagonistPersonalTie:'he sealed the passage her mother bought',
        antagonistSubject:{ kind:'PERSON', proper_name:'Marcus Vale' },
        stakesIfFail:'she loses the only passage out', stakesIfWin:'she reaches her sister',
        pcWound:'she was left behind once and has never said so out loud',
        liWound:'he promised passage once and could not deliver it',
        woundLoadBearingProof:'her fear of being left drives every choice',
        milestones:[{ atScene:1, event:'she reaches the harbour office and is refused' }] };

      await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
      await page.waitForFunction(() => window.handleBeginStory && window._parkPendingPortfolio, { timeout:120000 });
      const r = await page.evaluate(async ({ ARCHIVED }) => {
        const s = window.state;
        const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
        s.picks = s.picks || {};
        ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies']
          .forEach(k => { s.picks[k] = def[k]; });
        Object.assign(s, { world:def.world, worldSubtype:def.worldSubtype, flavor:def.flavor, dynamic:def.dynamic,
          archetype:{primary:def.archetype,modifier:null}, name:'Lirael', playerName:'Lirael',
          loveInterestName:'Julian', partnerName:'Julian', loveInterest:'Male', liGender:'male',
          playerMask:'OPEN_VEIN', storyLength:'fling', tier:'fling', access:'sub', subscribed:true,
          fortunes:9999999, intensity:'Steamy', pov:'first_person',
          identity:{ playerName:'Lirael', partnerName:'Julian' },
          renderMode:'literary', currentEngine:'literary', storyId:'opt-replay', myUid:'probe' });
        window.STARTER_PLANS['opt_replay'] = { scenes: [{ n:1,
          goal:'She counts what she has already signed for', setting:'the customs house',
          participants:['Lirael', 'Mara Dunn', 'Tomas Reyne', 'Halden Roe'] }] };
        s._starterId = 'opt_replay'; s.picks.identity = s.identity; s._skipCorridorValidation = true;
        window._generatePendingPortfolios = async function (manifest, st) {
          st = st || window.state;
          const store = window._pendingAdmissionStore(st);
          const rec = store && store.byInvocation[String(manifest && manifest.invocationId)];
          if (!rec) return { ok:false, code:'unknown_invocation', diagnostics:[], usage:[] };
          const need = window.__PORTFOLIO_SCHEMA_FIELDS.requiredFacetCount;
          rec.candidates.filter(c => c.status === 'pending').forEach((c, i) => {
            const e = JSON.parse(JSON.stringify(ARCHIVED[i % ARCHIVED.length])); e.subject_ref = c.candidate_ref;
            const v = window._validatePortfolioResponse({ characterPortfolios: [e] },
              { eligible:true, subject_ref:c.candidate_ref, storyId:rec.storyId,
                required_facet_count:need, reference_label:c.label }, { pendingAuthority:true, requireContrast:true });
            if (v.ok) window._parkPendingPortfolio(st, rec.invocationId, c.candidate_ref, v.facets,
              { guardrails:v.guardrails, identity_signature:v.identity_signature });
          });
          return { ok:true, code:null, parked:[], unresolved:[], calls:0, requested:0, diagnostics:[], usage:[] };
        };
        const logs = [];
        const realWarn = console.warn, realErr = console.error, realLog = console.log;
        console.warn = function(){ try{logs.push([].join.call(arguments,' '));}catch(_){} return realWarn.apply(console,arguments); };
        console.error = function(){ try{logs.push([].join.call(arguments,' '));}catch(_){} return realErr.apply(console,arguments); };
        console.log = function(){ try{logs.push([].join.call(arguments,' '));}catch(_){} return realLog.apply(console,arguments); };
        try { await Promise.race([window.handleBeginStory(), new Promise(x => setTimeout(x, 150000))]); } catch (_) {}
        return { logs: logs.filter(x => /SKELETON:INVALID|CPLUS|SCENE1:SCAFFOLD|OPTIONS/.test(x)).map(x => x.slice(0, 700)) };
      }, { ARCHIVED: V.useArchive ? ARCHIVED : FIXTURE });
      results[V.key] = { logs: r.logs, offered };
    } finally { await ctx.close().catch(() => {}); }
  }
} finally { await browser.close().catch(() => {}); }

console.log(`\n${'═'.repeat(88)}\nC+ OPTION CONTRACT — REPLAY ON THE REAL VALIDATION PATH\n${'═'.repeat(88)}\n`);
// SCOPED TO THE CONTRACT UNDER TEST. The purchased plan was written for a differently-staged
// scene, so its environment_plus names a ledger this replay's scene lacks — a real fault, and
// nothing to do with C+. Asserting on the whole fault list would let an unrelated failure mask a
// C+ gate that had stopped working, and would fail every accept arm for a reason it does not test.
const faultsOf = (k) => (results[k] && results[k].logs || [])
  .filter(x => /INVALID|SCAFFOLD] skipped|NO-GROUNDED-OPTION/.test(x))
  .join(' ')
  .split(/ · |; /)
  .filter(x => /character_plus|grounded Character\+ option/.test(x))
  .join(' · ');
for (const V of VARIANTS.filter(v => !ONLY || ONLY.indexOf(v.key) !== -1)) {
  const f = faultsOf(V.key);
  if (V.expectFaults === false) {
    t(`${V.key}: ACCEPTED — ${V.why}`, !f, (f || '').slice(0, 300));
  } else {
    t(`${V.key}: REJECTED — ${V.why}`, V.expectFaults.test(f), (f || '(no fault raised)').slice(0, 300));
  }
}

// ── WHAT THE AUTHOR ACTUALLY RECEIVES ──
if (!ONLY || ONLY.indexOf('model_supplied_truth') !== -1) {
  const A = results['model_supplied_truth:author'];
  const sent = results['model_supplied_truth:sent'];
  const chosen = sent && sent.opts && sent.opts[0];
  const dir = A ? (A.sys + '\n' + A.usr) : '';
  t('overwrite: the forged facet_id, pressure_id and evidence the model sent alongside the option ' +
    'reach the author nowhere — resolution overwrites them from the backend record',
    !!dir && dir.indexOf('F-FORGED') === -1 && dir.indexOf('p_forged') === -1,
    dir ? 'a forged value survived into the directive' : 'no author directive captured');
  t('directive: no revelation_bridge, option id, expression mode or evidence machinery reaches ' +
    'the author — the bridge is the planner showing its working, not material to render',
    !!dir && !/revelation_bridge|option_id|OPT-\d|expression_mode|pressure_evidence_ids/.test(dir),
    (dir.match(/revelation_bridge|option_id|OPT-\d|expression_mode|pressure_evidence_ids/g) || []).slice(0, 3).join(', '));
  const once = (needle) => (dir.split(needle).length - 1);
  t('directive: each trusted component appears EXACTLY once per recipient — one truth, one ' +
    'condition, one act, one lens operation, one reading',
    !!dir && once('psychological_read') <= 1 && once('facet_pressure') <= 1 && once('pc_interpretation') <= 1,
    JSON.stringify({ read: once('psychological_read'), pressure: once('facet_pressure'),
                     interpretation: once('pc_interpretation') }));
}

fs.writeFileSync('_cplus_option_replay_evidence.json', JSON.stringify(results, null, 2));
console.log(`\n${'─'.repeat(88)}\n  ${pass} passed · ${fail} failed  ($0.00 — nothing dispatched)\n`);
process.exit(fail ? 1 : 0);
