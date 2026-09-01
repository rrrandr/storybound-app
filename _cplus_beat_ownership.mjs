// ══════════════════════════════════════════════════════════════════════════════════════════
//  PER-BEAT OWNERSHIP — against the REAL seed and the REAL provider state
//
//  Attributing a whole multi-beat goal to two actors does not close cross-character leakage: it
//  relocates it. Seren could ground on the Dohkar's words because they shared one fact. Beats are
//  separate facts now, and this proves it with the seed's own scene and the seed's own facets —
//  not a synthetic stage and not an empty provider.
// ══════════════════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core';
import fs from 'fs';
import { configBody, installSession, isAuthOrigin } from './_test_session_env.mjs';

const SRC = fs.readFileSync('public/app.js', 'utf8');
let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
let R = null;
try {
  const page = await ctx.newPage();
  page.setDefaultTimeout(120000);
  await installSession(page);
  await page.route('**/sb-test.localhost/**', r => r.fulfill({ status:200, contentType:'application/json', body:'{}' }));
  await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: SRC }));
  await page.route('**/api/**', async route => {
    const u = route.request().url();
    if (/\/api\/config\b/.test(u)) return route.fulfill({ status:200, contentType:'application/json', body: configBody() });
    if (isAuthOrigin(u)) return route.fulfill({ status:200, contentType:'application/json', body:'{}' });
    return route.fulfill({ status:200, contentType:'application/json', body:'{}' });
  });
  await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
  await page.waitForFunction(() => window._cpFactManifest && window._seedFacetIndex && window.STARTER_STORIES, { timeout:120000 });

  R = await page.evaluate(() => {
    // REAL PROVIDER STATE. The seed must be ACTIVE for _seedFacetIndex to return anything; an
    // empty state returns nothing and an option count of zero then proves only that the probe
    // was empty. This is the same setup the delivery suite uses.
    const s = window.state;
    const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
    s.picks = s.picks || {};
    ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies']
      .forEach(k => { s.picks[k] = def[k]; });
    Object.assign(s, { world:def.world, worldSubtype:def.worldSubtype, flavor:def.flavor, dynamic:def.dynamic,
      archetype:{primary:def.archetype,modifier:null}, name:'Lirael', playerName:'Lirael',
      loveInterestName:'Julian', partnerName:'Julian', loveInterest:'Male', liGender:'male',
      playerMask:'OPEN_VEIN', storyLength:'fling', tier:'fling', pov:'first_person',
      identity:{ playerName:'Lirael', partnerName:'Julian' },
      _starterId: def.id, is_starter_story: true, storyId: 'beat-own' });

    // ── THE REAL STAGE CONTRACT, NOT A SYNTHETIC ONE ──
    // The first version of this built its own stage object and handed it the refs it expected to
    // see. That is a probe agreeing with itself: it proved per-beat ownership while the seed
    // metadata named a person who does not exist on the roster, and the Dohkar grounded nothing
    // in production. Production resolves the stage; this reads what it produced.
    const stage = window._scene1StageContract(s);
    const man = window._cpFactManifest(stage, s);

    // The seed's OWN facets, from production's seed index with the seed active.
    const idx = window._seedFacetIndex(s, {}) || {};
    const pick = (rx) => { const k = Object.keys(idx).find(x => rx.test(x)); return k ? { key: k, rec: idx[k] } : null; };
    const dohkar = pick(/dohkar/i), seren = pick(/seren/i), julian = pick(/julian/i);
    const facetsOf = (p) => p ? (p.rec.facets || p.rec.cPlusFacets || []) : [];
    const optsFor = (p, refOverride) => p ? window._cpBuildGroundedOptions(
      [{ label: p.rec.label, id: refOverride || p.key, facets: facetsOf(p) }], man.facts) : [];

    // Each candidate is addressed by the ref THE ROSTER emits for them — read from the stage,
    // never composed from a label.
    const rosterRef = (rx) => ((stage.onStage || []).find(r => rx.test(String(r.label || ''))) || {}).id || null;
    const dRef = rosterRef(/dohkar/i), sRef = rosterRef(/seren/i), jRef = rosterRef(/julian/i);
    const dOpts = optsFor(dohkar, dRef), sOpts = optsFor(seren, sRef), jOpts = optsFor(julian, jRef);

    // CROSS CONTROL: give Seren a pressure whose words exist ONLY in the Dohkar's beat, and vice
    // versa. Under one shared fact both would ground; under per-beat facts neither may.
    const cross = (ref, requires) => window._cpBuildGroundedOptions(
      [{ label: 'x', id: ref, facets: [{ facet_id:'X', category:'habit',
        canonical_truth:'She does a thing that would not be true of most people.',
        possible_pressures:[{ pressure_id:'p_x', text:'the condition', evidence_requires: requires }] }] }],
      man.facts);

    return {
      seedKeys: Object.keys(idx),
      roster: (stage.onStage || []).map(r => ({ id: r.id, label: r.label, kind: r.kind })),
      rosterRefs: { dohkar: dRef, seren: sRef, julian: jRef },
      facts: man.facts.map(f => ({ id: f.evidence_id, type: f.type, provenance: f.provenance,
        groundable: f.groundableRefs, eligible: f.pressureEligible, text: f.text.slice(0, 72) })),
      dohkar: { key: dohkar && dohkar.key, facets: facetsOf(dohkar).length,
                options: dOpts.map(o => ({ id:o.option_id, pressure:o.pressure_id, ev:o.evidence_ids })) },
      seren:  { key: seren && seren.key, facets: facetsOf(seren).length,
                options: sOpts.map(o => ({ id:o.option_id, pressure:o.pressure_id, ev:o.evidence_ids })) },
      julian: { key: julian && julian.key, facets: facetsOf(julian).length, options: jOpts.length },
      lirael: window._cpBuildGroundedOptions([{ label:'Lirael', id: rosterRef(/lirael/i),
        facets: facetsOf(pick(/^pc:/)) }], man.facts).length,
      serenOnDohkarWords: cross(sRef, 'prescribes|cost first'),
      dohkarOnSerenWords: cross(dRef, 'earliest memory|offering aloud'),
      refFaults: stage.refFaults,
      // ── UNKNOWN AND INVENTED REFS ──
      // Driven through the real stage contract, not the corpus builder, because validation lives
      // there: a ref nobody can resolve must be NAMED, never quietly become "grounds nobody",
      // which is indistinguishable from correct fail-closed behaviour.
      unknownRef: (() => {
        const plan = { scenes: [{ n: 1, goal: 'a thing happens', setting: 'the clearing',
          participants: ['Lirael', 'Seren'],
          eventFacts: [{ text: 'Someone Invented does something', participants: [
            { ref: 'named:someone_invented', role: 'actor' },
            { ref: 'named:seren', role: 'actor' } ] }] }] };
        window.STARTER_PLANS['ref_check'] = plan;
        const prev = s._starterId; s._starterId = 'ref_check';
        let st = null; try { st = window._scene1StageContract(s); } catch (_) {}
        s._starterId = prev;
        return st ? { faults: st.refFaults || [],
                      survivingParticipants: ((st.eventFacts || [])[0] || {}).participants || [] } : null;
      })(),
    };
  });
} finally { await ctx.close().catch(() => {}); await browser.close().catch(() => {}); }

console.log(`\n${'═'.repeat(88)}\nPER-BEAT OWNERSHIP — real seed, real provider state\n${'═'.repeat(88)}\n`);
console.log(' A · THE SEED SCENE, ONE FACT PER BEAT');
for (const f of R.facts) {
  console.log(`   ${f.id}  ${String(f.type).padEnd(8)} ${(f.eligible?'grounds':'—      ')}  ${(f.groundable.join(',')||'nobody').padEnd(34)} ${f.text}`);
}
console.log('\n B · OPTIONS FROM THE SEED\'S OWN FACETS');
console.log(`   the presiding Dohkar : ${R.dohkar.facets} facets → ${JSON.stringify(R.dohkar.options)}`);
console.log(`   Seren                : ${R.seren.facets} facets → ${JSON.stringify(R.seren.options)}`);
console.log(`   Julian               : ${R.julian.facets} facets → ${R.julian.options} options`);
console.log(`   Lirael (PC)          : ${R.lirael} options`);

console.log('\n C · PROOFS');
t('C1: the seed provider is REALLY loaded — facets exist, so a zero option count would mean ' +
  'something rather than an empty probe',
  R.dohkar.facets > 0 && R.seren.facets > 0,
  JSON.stringify({ keys: R.seedKeys.slice(0, 4), dohkar: R.dohkar.facets, seren: R.seren.facets }));
t('C2: Seren and the Dohkar receive DISTINCT evidence facts — no fact grounds both',
  R.facts.filter(f => f.eligible && f.groundable.length > 1).length === 0,
  JSON.stringify(R.facts.filter(f => f.groundable.length > 1).map(f => [f.id, f.groundable])));
t('C3: the real seed produces NONZERO options with exact ids and evidence ids',
  R.dohkar.options.length > 0 || R.seren.options.length > 0,
  JSON.stringify({ dohkar: R.dohkar.options, seren: R.seren.options }));
t('C4: every grounded option cites only facts eligible for ITS OWN subject',
  [...R.dohkar.options, ...R.seren.options].every(o => o.ev.every(e => {
    const f = R.facts.find(x => x.id === e);
    return f && f.eligible && f.groundable.length === 1;
  })),
  JSON.stringify([...R.dohkar.options, ...R.seren.options]));
t('C5: a SEREN pressure matching only DOHKAR text yields zero options',
  R.serenOnDohkarWords.length === 0, JSON.stringify(R.serenOnDohkarWords));
t('C6: …and a DOHKAR pressure matching only SEREN text likewise',
  R.dohkarOnSerenWords.length === 0, JSON.stringify(R.dohkarOnSerenWords));
t('C7: Lirael is the TARGET of the interaction beat and grounds nothing; Julian acts in no beat ' +
  'and grounds nothing',
  R.lirael === 0 && R.julian.options === 0,
  JSON.stringify({ lirael: R.lirael, julian: R.julian.options }));

t('C8: an UNKNOWN ref is reported as a named validation fault, not silently dropped — a ref that ' +
  'resolves to nobody is an authoring error, and it must not look like correct fail-closed behaviour',
  !!R.unknownRef && (R.unknownRef.faults || []).length === 1
    && R.unknownRef.faults[0].ref === 'named:someone_invented',
  JSON.stringify(R.unknownRef && R.unknownRef.faults));
t('C9: …and ONE bad ref poisons its whole fact — the valid sibling is dropped too, because ' +
  'keeping it would silently rewrite "A and B do this" into "B does this", a claim nobody authored',
  !!R.unknownRef && (R.unknownRef.survivingParticipants || []).length === 0,
  JSON.stringify(R.unknownRef && R.unknownRef.survivingParticipants));

fs.writeFileSync('_cplus_beat_ownership.json', JSON.stringify(R, null, 2));
console.log(`\n${'─'.repeat(88)}\n  ${pass} passed · ${fail} failed  ($0.00 — nothing dispatched)\n`);
process.exit(fail ? 1 : 0);
