// WHO EXISTS WHEN THE ROSTER IS CAPTURED?
//
// The portfolio roster is built inside the CG scaffold call, and the Scene-1 STAGE contract
// resolves LATER (_ensureCGScaffold is awaited at the top of the prompt build; the stage log fires
// inside _buildScene1Scaffold, further down). So "who is on stage" is NOT available at roster time,
// and an eligibility rule written against staging would be reading a value that does not exist yet.
//
// This reports what IS knowable at that moment, for a seeded and an unseeded story: every ledger
// identity, its kind, whether it carries a proper name, and whether it already has a profile. The
// eligibility predicate for ordinary NPCs has to be built out of these, or out of a later moment.
//
// usage: node _npc_roster_audit.mjs   (needs vercel dev on :3000) — no paid calls
import { chromium } from 'playwright-core';
import fs from 'fs';

const SRC = fs.readFileSync('public/app.js', 'utf8');
async function preflight(url = 'http://localhost:3000/') {
  try {
    const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 8000);
    const res = await fetch(url, { signal: ctl.signal }); clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!/<\s*script|<\s*html/i.test(await res.text())) throw new Error('not the app shell');
  } catch (e) {
    console.error(`\n  ✗ INFRASTRUCTURE: ${url} not serving the app (${e.message}).`);
    process.exit(2);
  }
}
await preflight();

const APLOT_VALID = {
  goal: 'She must clear the manifest before the tide turns and the ship leaves without her sister',
  namedClock: 'the tide at dawn', clockUnit: 'turns', totalClockUnits: 12,
  antagonistOrAntiForce: 'Marcus Vale', antagonistShape: 'A',
  antagonistPersonalTie: 'he sealed the passage her mother once bought',
  antagonistSubject: { kind: 'PERSON', proper_name: 'Marcus Vale' },
  stakesIfFail: 'she loses the only passage out and her sister sails alone',
  stakesIfWin: 'she reaches her sister before the ship clears the headland',
  pcWound: 'she was left behind once and has never said so out loud to anyone',
  liWound: 'he promised passage to someone once and could not deliver it in time',
  woundLoadBearingProof: 'her fear of being left drives every choice; his failed promise is why he will not promise again',
  milestones: [{ atScene: 1, event: 'she reaches the harbour office and is refused' },
               { atScene: 2, event: 'she finds the sealed manifest' },
               { atScene: 3, event: 'the crisis: the tide turns', crisis: true }],
};

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
page.setDefaultTimeout(180000); page.setDefaultNavigationTimeout(180000);
await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: SRC }));
await page.route('**/api/**', async route => {
  const u = route.request().url();
  if (/\/api\/(config|geo|csp-report|beta-events)\b/.test(u)) return route.continue();
  let b = null; try { b = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
  const sys = String(((b && b.messages || []).find(m => m.role === 'system') || {}).content || '');
  let out = { ok: true };
  if (/A-PLOT GENERATOR/i.test(sys)) out = APLOT_VALID;
  else if (/CONTINUITY ARCHITECT for a serialized/.test(sys)) out = { issueArcs: [{ n: 1 }], characterIcebergs: {} };
  const content = JSON.stringify(out);
  return route.fulfill({ status:200, contentType:'application/json',
    body: JSON.stringify({ ok:true, content, choices:[{ message:{ content } }] }) });
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window._capturePortfolioRoster === 'function', { timeout: 60000 });

const snap = await page.evaluate(async () => {
  const s = window.state;
  Object.assign(s, { storyId: 'audit-' + Math.random().toString(36).slice(2, 7),
    _relationshipLedger: null, aPlot: null, famousFate: null,
    playerName: 'Lirael', loveInterestName: 'Julian',
    world: 'modern', worldSubtype: 'city',
    picks: Object.assign({}, s.picks, { identity: { playerName: 'Lirael', playerGender: 'Female' }, world: 'Modern' }) });
  // Capture the ledger AT THE MOMENT the roster is built, by wrapping the real function.
  const real = window._capturePortfolioRoster;
  let atRosterTime = null;
  window._capturePortfolioRoster = function (st) {
    try {
      const L = window._relLedger(false);
      atRosterTime = Object.keys((L && L.entities) || {}).map(id => {
        const e = L.entities[id];
        return { id, kind: e.kind, label: e.label || null, properName: e.properName || null,
                 aliases: (e.aliases || []).length, anchorRole: e.anchorRole || null,
                 superseded: !!e.supersededBy,
                 profile: e.authorProfile ? (e.authorProfile.status + '/' + e.authorProfile.provenance) : null };
      });
    } catch (err) { atRosterTime = [{ error: String(err && err.message) }]; }
    return real.apply(this, arguments);
  };
  try { await window.initAPlot({ tier: 'fling' }); } catch (_) {}
  try { await window._ensureCGScaffold(s); } catch (_) {}
  const roster = real.call(window, s);
  return { atRosterTime, roster,
           stageFnExists: typeof window._scene1StageContract === 'function',
           stagedNow: (function () { try { return (window._scene1StageContract(s) || {}).onStage || null; } catch (_) { return 'threw — the stage is not resolvable yet'; } })() };
});

console.log(`\n${'═'.repeat(88)}\nWHO EXISTS WHEN THE PORTFOLIO ROSTER IS CAPTURED\n${'═'.repeat(88)}\n`);
console.log(' LEDGER IDENTITIES AT ROSTER TIME');
for (const e of snap.atRosterTime || []) console.log('   ' + JSON.stringify(e));
console.log('\n ROSTER AS BUILT TODAY');
console.log('   ' + JSON.stringify(snap.roster));
console.log('\n IS THE STAGE RESOLVABLE AT THAT MOMENT?');
console.log('   stageFn=' + snap.stageFnExists + ' onStage=' + JSON.stringify(snap.stagedNow));
// ══════════════════════════════════════════════════════════════════════════════════════════
// SECTION 2 — THE SEAM THE BATCH WOULD USE
//
// TERMINOLOGY (Roman 2026-08-29): a candidate's `identityStatus: 'canonical'` means canonical
// INSIDE THE STAGE CONTRACT. It is not a durable identity, and `named:julian` is still
// name-derived. Everything a candidate carries before a ledger entity is resolved is called a
// STAGE-SCOPED candidate id here, and nothing else.
//
// The batch has to fire at C+ CANDIDATE-SET RESOLUTION, before the planner request. Three things
// must hold, and none can be taken from the source alone:
//   1. the candidate set is resolved BEFORE the planner is dispatched;
//   2. each uncovered candidate RESOLVES to a durable ledger entity — resolution only, never
//      creation: a bare name-derived candidate must not mint a permanent person from a plan that
//      may be retried, changed, or never finalized;
//   3. the uncovered ones are identifiable at that moment, so a batch has a subject list.
// ══════════════════════════════════════════════════════════════════════════════════════════
const ctx2 = await browser.newContext();
const page2 = await ctx2.newPage();
page2.setDefaultTimeout(180000); page2.setDefaultNavigationTimeout(180000);
// The prompt builder calls _cPlusEligibleCandidates through its CLOSURE-LOCAL binding, so
// wrapping window._cPlusEligibleCandidates intercepts nothing — the same trap that hid a
// throwing-ledger regression earlier. The capture is injected at the real call site instead, in
// the SERVED source, so what is reported is production's own candidate set at production's own
// moment. The marker is asserted unique before use.
const CP_ANCHOR = "        var _cpCandidates = (_cpSel && _cpSel.ok && Array.isArray(_cpSel.candidates)) ? _cpSel.candidates : [];";
const cpHits = SRC.split(CP_ANCHOR).length - 1;
if (cpHits !== 1) { console.error(`\n  ✗ capture marker is not unique (${cpHits} occurrences) — refusing to inject.\n`); process.exit(3); }
const SRC2 = SRC.replace(CP_ANCHOR, CP_ANCHOR +
  "\n        try { if (!window.__cpSnapshot) window.__cpSnapshot = JSON.parse(JSON.stringify(_cpCandidates)); } catch (_) {}");
await page2.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: SRC2 }));
let plannerAt = null, candidatesAt = null, seq = 0;
await page2.route('**/api/**', async route => {
  const u = route.request().url();
  if (/\/api\/(config|geo|csp-report|beta-events)\b/.test(u)) return route.continue();
  let b = null; try { b = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
  const sys = String(((b && b.messages || []).find(m => m.role === 'system') || {}).content || '');
  seq++;
  if (/scene-structure planner for the OPENING scene/.test(sys) && plannerAt === null) plannerAt = seq;
  let out = { ok: true };
  if (/A-PLOT GENERATOR/i.test(sys)) out = APLOT_VALID;
  else if (/CONTINUITY ARCHITECT for a serialized/.test(sys)) out = { issueArcs: [{ n: 1 }], characterIcebergs: {} };
  const content = JSON.stringify(out);
  return route.fulfill({ status:200, contentType:'application/json',
    body: JSON.stringify({ ok:true, content, choices:[{ message:{ content } }] }) });
});
await page2.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
await page2.waitForFunction(() => typeof window.handleBeginStory === 'function', { timeout: 60000 });
// RESOLUTION ONLY. Every path here READS the ledger; none of them creates an entity.
// _relEntityForName(create) is deliberately absent: minting a permanent person from a bare plan
// name would manufacture ghost identities out of plans that may be retried, changed, or never
// finalized, and ordinary name-only NPCs are admitted only at verified finalized-scene admission.
const RESOLVER = `(function (c, s) {
  const L = window._relLedger(false);
  const ents = (L && L.entities) || {};
  const out = { ledgerId: null, via: null, requiredName: false, ambiguity: 'n/a' };
  // 1 · an id the candidate already carries that IS a live ledger key
  const structured = c.role_instance_id || c.id;
  if (structured && ents[structured] && !ents[structured].supersededBy) {
    out.ledgerId = structured; out.via = 'verified ledger id on the candidate'; return out;
  }
  // 2 · source-specific identity paths — plot role, social slot, FF/seed cast
  const ap = (s.aPlot || {}), sub = ap.antagonistSubject || {};
  if (sub.canonicalId && ents[sub.canonicalId]
      && (c.label || '').trim().toLowerCase() === String(sub.reference_label || ap.antagonistOrAntiForce || '').trim().toLowerCase()) {
    out.ledgerId = sub.canonicalId; out.via = 'a-plot antagonist subject'; return out;
  }
  const pcId = window._relPcId && window._relPcId();
  if (c.kind === 'pc' && pcId && ents[pcId]) { out.ledgerId = pcId; out.via = 'pc anchor'; return out; }
  const liId = window._relLiId && window._relLiId();
  if (liId && ents[liId]) {
    const liNames = [String(s.loveInterestName || ''), String(ents[liId].label || '')]
      .map(x => x.trim().toLowerCase()).filter(Boolean);
    if (liNames.indexOf(String(c.label || '').trim().toLowerCase()) !== -1) {
      out.ledgerId = liId; out.via = 'li anchor'; return out;
    }
  }
  // 3 · a unique verified alias — NON-CREATING, and ambiguity is a refusal, not a guess
  try {
    const m = window._relMatchByName(c.label, {});
    out.ambiguity = (m && m.status) || 'none';
    if (m && m.status === 'unique' && m.id && ents[m.id]) {
      out.ledgerId = m.id; out.via = 'unique verified alias'; out.requiredName = true; return out;
    }
  } catch (_) { out.ambiguity = 'threw'; }
  return out;                                   // 4 · unresolved
})`;

// ── PROVIDER OWNERSHIP IS NOT C+ ELIGIBILITY (Roman 2026-08-29) ──
// `availableForOrdinaryCPlus` answers "may the planner assign this person a C+ beat?" and keeps
// exactly that meaning. `providerOwner` answers a different question — "which authority owns this
// person's psychology, and therefore which provider may ever pay to generate it?" The love
// interest is the regression case: eligible for ordinary C+ DELIVERY, but LI-owned, so he must
// never enter an ordinary-NPC generation batch. Seed, FF cast, authored role instance, social
// slot and kinship slot are kept APART: they carry different identity authority, and collapsing
// them hides which materialisation route (if any) could establish a durable entity.
const PROVIDER_OWNER = `(function (c, s) {
  const L = window._relLedger(false); const ents = (L && L.entities) || {};
  const nm = String(c.label || '').trim().toLowerCase();
  const eq = x => nm && nm === String(x || '').trim().toLowerCase();
  if (c.kind === 'pc') return 'PC bible';
  if (eq(s.loveInterestName) || eq(s.partnerName)) return 'LI bible';
  const liId = window._relLiId && window._relLiId();
  if (liId && ents[liId] && eq(ents[liId].label)) return 'LI bible';
  const ap = (s.aPlot || {}), sub = ap.antagonistSubject || {};
  if (eq(sub.reference_label) || eq(ap.antagonistOrAntiForce)) return 'A-plot antagonist';
  // An AUTHORED ROLE INSTANCE carries a stable role id written into a seed — distinct from a
  // social slot, which is minted from the social ecosystem, and from a bare name.
  if (c.kind === 'role' && c.role_instance_id) return 'authored role instance';
  // Ledger-resident slot kinds, when the candidate already resolves to one.
  const resolved = ents[c.role_instance_id || c.id];
  if (resolved && resolved.kind === 'social_slot') {
    const prov = String((resolved.authorProfile && resolved.authorProfile.provenance) || '');
    return prov.indexOf('kinship') !== -1 ? 'canonical kinship slot' : 'canonical social slot';
  }
  try {
    if (s.famousFate && s.famousFate.cast
        && s.famousFate.cast.some(x => eq((x && (x.canonicalName || x.name)) || ''))) return 'generated FF cast';
  } catch (_) {}
  try {
    const seed = (window.STARTER_SEEDS || {})[s._starterId] || {};
    const inSeed = JSON.stringify(seed.present || seed.cast || seed.characters || '');
    if (nm && inSeed.toLowerCase().indexOf(nm) !== -1) return 'seed';
  } catch (_) {}
  return 'ordinary/emergent name-only';
})`;
// Only these classes may ever be paid for by an ordinary-NPC batch.
const PAYABLE = ['ordinary/emergent name-only', 'canonical social slot', 'canonical kinship slot'];

async function measure(label, seeded) {
  const c2 = await browser.newContext();
  const pg = await c2.newPage();
  pg.setDefaultTimeout(180000); pg.setDefaultNavigationTimeout(180000);
  let plannerSeq = null, seq = 0;
  await pg.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: SRC2 }));
  await pg.route('**/api/**', async route => {
    const u = route.request().url();
    if (/\/api\/(config|geo|csp-report|beta-events)\b/.test(u)) return route.continue();
    let b = null; try { b = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
    const sys = String(((b && b.messages || []).find(m => m.role === 'system') || {}).content || '');
    seq++;
    if (/scene-structure planner for the OPENING scene/.test(sys) && plannerSeq === null) plannerSeq = seq;
    let out = { ok: true };
    if (/A-PLOT GENERATOR/i.test(sys)) out = APLOT_VALID;
    else if (/CONTINUITY ARCHITECT for a serialized/.test(sys)) out = { issueArcs: [{ n: 1 }], characterIcebergs: {} };
    const content = JSON.stringify(out);
    return route.fulfill({ status:200, contentType:'application/json',
      body: JSON.stringify({ ok:true, content, choices:[{ message:{ content } }] }) });
  });
  await pg.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => typeof window.handleBeginStory === 'function', { timeout: 60000 });
  const rows = await pg.evaluate(async ({ seeded, RESOLVER, PROVIDER_OWNER }) => {
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
      renderMode:'literary', currentEngine:'literary',
      storyId: (seeded ? 'seeded-' : 'unseeded-') + Math.random().toString(36).slice(2, 7), myUid:'probe' });
    if (seeded) Object.assign(s, { _starterId: def.id, is_starter_story: true, immutableTitle: def.title });
    else {
      // UNSEEDED: an assignment-owned two-person stage with a plan-named ordinary NPC who exists
      // in no seed and no registry — the exact population the provider is being built for.
      window.STARTER_PLANS['audit_unseeded'] = { scenes: [{ n:1,
        goal:'She counts what she has already signed for', setting:'the customs house',
        participants:['Lirael', 'Mara Dunn'] }] };
      s._starterId = 'audit_unseeded';
    }
    s.picks.identity = s.identity; s._skipCorridorValidation = true;
    try { await Promise.race([window.handleBeginStory(), new Promise(x => setTimeout(x, 150000))]); } catch (_) {}
    const raw = window.__cpSnapshot || [];
    const resolve = eval(RESOLVER), providerOwner = eval(PROVIDER_OWNER);
    return raw.map(c => {
      let facets = [];
      try { facets = window._facetsForCharacter(c, s, { sceneNumber: 1 }) || []; } catch (_) {}
      const r = resolve(c, s);
      return { stageCandidateId: c.id, label: c.label, kind: c.kind,
               providerOwner: providerOwner(c, s),
               structuredSourceId: c.role_instance_id || null,
               ledgerId: r.ledgerId, resolvedVia: r.via, requiredName: r.requiredName,
               ambiguity: r.ambiguity,
               ordinaryFlag: c.availableForOrdinaryCPlus !== false,
               facets: facets.length,
               provider: facets.length ? [...new Set(facets.map(f => f.origin || '?'))].join(',') : null };
    });
  }, { seeded, RESOLVER, PROVIDER_OWNER });
  await c2.close();
  return { rows, plannerSeq };
}

for (const [label, seeded] of [['SEEDED (First Sacrifice)', true], ['UNSEEDED (plan-named cast)', false]]) {
  const { rows, plannerSeq } = await measure(label, seeded);
  console.log(`\n${'═'.repeat(88)}\n${label} — the C+ candidate set at the pre-planner seam\n${'═'.repeat(88)}\n`);
  for (const r of rows) console.log('   ' + JSON.stringify(r));
  const payable = rows.filter(r => PAYABLE.indexOf(r.providerOwner) !== -1);
  const uncovered = payable.filter(r => r.facets === 0);
  const unresolved = uncovered.filter(r => !r.ledgerId);
  console.log('');
  console.log('   planner dispatched as request #' + plannerSeq + ' (the capture ran before it)');
  console.log('   candidates                       : ' + rows.length);
  console.log('   the batch could ever pay for     : ' + payable.length + ' ' + JSON.stringify(payable.map(r => r.label)));
  console.log('   …of those, UNCOVERED             : ' + uncovered.length + ' ' + JSON.stringify(uncovered.map(r => r.label)));
  console.log('   …of those, UNRESOLVED (no ledger): ' + unresolved.length + ' ' + JSON.stringify(unresolved.map(r => r.label)));
  // ── THE PINNED REGRESSION ──
  // Julian is eligible for ordinary C+ delivery and his psychology is LI-owned. A batch keyed on
  // `availableForOrdinaryCPlus` would have paid to generate an ordinary-NPC portfolio for the
  // love interest; a batch keyed on providerOwner cannot.
  const jl = rows.filter(r => /julian/i.test(r.label))[0];
  if (jl) {
    const ok = jl.ordinaryFlag === true && jl.providerOwner === 'LI bible'
            && PAYABLE.indexOf(jl.providerOwner) === -1;
    console.log('   ' + (ok ? '✓' : '✗') + ' JULIAN REGRESSION: eligible for ordinary C+ delivery ('
      + jl.ordinaryFlag + '), psychology owned by ' + jl.providerOwner
      + ', payable by an ordinary batch = ' + (PAYABLE.indexOf(jl.providerOwner) !== -1));
  }
}
console.log('');
await browser.close();
