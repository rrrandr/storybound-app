// C+ MULTI-FACET PORTFOLIO — free, no model calls.
//
// The defect this exists to prevent: a person with ONE authored facet produces the same beat
// every time they are selected, because there is nothing else to select. The presiding Dohkar
// now carries FIVE truths that are all true at once, and the question this suite answers is the
// only one that matters about a portfolio — DOES DIFFERENT SCENE EVIDENCE SELECT A DIFFERENT
// FACET, or does the first one in the list win every time?
//
// It is free because it never asks a model anything. It drives the same predicate the skeleton
// validator drives, against the REAL authored canon, with scene material written per case.
//
// usage: node _cplus_multifacet.mjs   (needs vercel dev on :3000)
import { chromium } from 'playwright-core';
import fs from 'fs';

const SRC = fs.readFileSync('public/app.js', 'utf8');
const PASSTHROUGH = /\/api\/(config|geo|csp-report|beta-events)\b/;
let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };

console.log(`\n${'═'.repeat(88)}\nC+ MULTI-FACET — five truths, and the evidence that picks between them\n${'═'.repeat(88)}\n`);

const browser = await chromium.launch({ headless: true });
let _closing = false;
const closeBrowser = async () => { if (_closing) return; _closing = true; try { await browser.close(); } catch (_) {} };
process.on('uncaughtException', async (e) => { await closeBrowser(); console.error(e); process.exit(1); });
process.on('unhandledRejection', async (e) => { await closeBrowser(); console.error(e); process.exit(1); });
process.on('exit', () => { try { browser.close(); } catch (_) {} });

const ctx = await browser.newContext();
let R;
try {
  const page = await ctx.newPage();
  page.setDefaultTimeout(120000); page.setDefaultNavigationTimeout(120000);
  await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: SRC }));
  await page.route('**/api/**', r => PASSTHROUGH.test(r.request().url()) ? r.continue() : r.abort());
  await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
  await page.waitForFunction(() => window._facetsForCharacter && window._cpEvidenceEstablishes, { timeout:120000 });

  // ── THE FIVE SCENES ──
  // Each `facts` block is scene material of the kind _cpFactCorpus emits: sentences off the
  // seed's own setting/present/about-to-happen. Each establishes ONE of his conditions and not
  // the others. Written per case, deliberately, because a fixture that reuses one corpus proves
  // only that a regex matches itself.
  const CASES = [
    { facet: 'presiding_dohkar_ritual_contempt', label: 'ritual contempt',
      facts: ['The rite has a fixed order: invocation, then sacrifice, then desire.',
              'It has been performed the same way for generations.'] },
    { facet: 'presiding_dohkar_peer_jealousy', label: 'peer jealousy',
      facts: ['Julian stands at the edge of the gathering, perfectly still, here only as an observer.',
              'The assembly turns toward him when he moves.'] },
    { facet: 'presiding_dohkar_compulsive_pedagogy', label: 'compulsive pedagogy',
      facts: ['Seren, kneeling, is the youth making her First Sacrifice.',
              'She blurs the wording, and the imprecision is a mistake she could still be shown how to fix.'] },
    { facet: 'presiding_dohkar_sacrificial_arrogance', label: 'sacrificial arrogance',
      facts: ['Her offering is a memory, and she names it aloud before the assembly.',
              'The cost is spoken before the miracle so everyone hears what is being paid.'] },
    { facet: 'presiding_dohkar_kindness_to_the_poor', label: 'kindness to the poor',
      facts: ['The assembled First Favored stand barefoot in gossamer Veilweave.',
              'One guest waits at the edge, apart from the rest, noticed by nobody.'] },
  ];

  R = await page.evaluate((CASES) => {
    const s = window.state;
    Object.assign(s, { _starterId:'starter_first_sacrifice', is_starter_story:true,
      playerName:'Lirael', name:'Lirael', loveInterestName:'Julian' });
    const facets = window._facetsForCharacter(
      { id:'role:the_presiding_dohkar', label:'the presiding Dohkar', aliases:['the presiding Dohkar','Dohkar'] }, s);
    const rec = id => facets.filter(f => f.facet_id === id)[0] || null;
    // Every (facet, pressure) pair scored against every scene: the full matrix, so "the right
    // one matches" and "the wrong ones do not" are the same measurement.
    const matrix = CASES.map(c => ({
      facet: c.facet,
      scores: facets.map(f => ({
        facet_id: f.facet_id,
        hits: (f.pressures || []).map(p => window._cpEvidenceEstablishes(f, p.pressure_id, c.facts))
                                 .filter(x => x.checked && x.ok).length,
      })),
    }));
    const allFacets = {};
    [['named:julian','Julian'], ['named:seren','Seren'],
     ['role:first_sacrifice_presiding_dohkar','the presiding Dohkar']].forEach(([id, label]) => {
      allFacets[id] = window._facetsForCharacter({ id, label, aliases: [label] }, s, { sceneNumber: 1 });
    });
    return { facets, matrix, allFacets,
             ids: facets.map(f => f.facet_id), cats: facets.map(f => f.category),
             contemptPressures: (rec('presiding_dohkar_ritual_contempt') || {}).pressures || [] };
  }, CASES);

  console.log(' 1 · THE PORTFOLIO IS FIVE DISTINCT TRUTHS');
  t('1a: five facets resolve for the presiding Dohkar', R.facets.length === 5, JSON.stringify(R.ids));
  // A CATEGORY LABEL IS NOT EVIDENCE OF DISTINCTNESS. Five different labels can sit on five
  // rewordings of one truth; the label is a routing/novelty signal, nothing more. This asserts
  // the data property only. What actually establishes that these are five different truths is
  // section 2 — five scenes, written separately, each selecting a different one.
  t('1b: five distinct category labels (a data property, NOT proof of distinctness)',
    new Set(R.cats).size === 5, JSON.stringify(R.cats));
  t('1c: every facet carries at least two conditions and its own misreadings',
    R.facets.every(f => (f.pressures || []).length >= 2 && (f.forbidden_restatements || []).length >= 1),
    JSON.stringify(R.facets.map(f => [f.facet_id, (f.pressures||[]).length, (f.forbidden_restatements||[]).length])));
  // HEURISTIC REGRESSION GUARD, not a distinctness proof: a synonym-heavy paraphrase passes it
  // easily. It exists to catch the cheap failure — one truth pasted twice and lightly edited.
  t('1d: heuristic guard — no canonical truth is a lexical near-copy of another',
    (() => {
      const words = x => new Set(String(x).toLowerCase().match(/[a-z]{4,}/g) || []);
      for (let i = 0; i < R.facets.length; i++) for (let j = i + 1; j < R.facets.length; j++) {
        const a = words(R.facets[i].canonical_truth), b = words(R.facets[j].canonical_truth);
        const inter = [...a].filter(w => b.has(w)).length;
        if (inter / Math.min(a.size, b.size) > 0.5) return false;
      }
      return true;
    })(), 'two truths share more than half their content words');

  console.log('\n 2 · DIFFERENT SCENE EVIDENCE SELECTS A DIFFERENT FACET');
  for (const row of R.matrix) {
    const c = CASES.find(x => x.facet === row.facet);
    const mine = row.scores.find(x => x.facet_id === row.facet);
    t(`2 · ${c.label}: its own condition is established by this scene`, mine && mine.hits > 0,
      JSON.stringify(row.scores));
    // NOT "the only facet". Several of his truths can be in play in one clearing at once — that
    // is what a portfolio means, and demanding exclusivity would move SELECTION out of the
    // planner and into a regex, which is the one place it must never live. What has to hold is
    // that the evidence points hardest at the facet the scene was written for.
    t(`2 · ${c.label}: …and the evidence points at it more than at any other facet`,
      mine && row.scores.every(x => x.facet_id === row.facet || x.hits < mine.hits),
      JSON.stringify(row.scores.filter(x => x.hits > 0)));
  }

  console.log('\n 3 · CONTEMPT IS REJECTED WHEN THE REAL PRESSURE IS SOMETHING ELSE');
  // The named requirement: the first facet in the list may not be attached to any scene that
  // happens to contain a valid evidence id.
  for (const row of R.matrix.filter(x => x.facet !== 'presiding_dohkar_ritual_contempt')) {
    const c = CASES.find(x => x.facet === row.facet);
    const contempt = row.scores.find(x => x.facet_id === 'presiding_dohkar_ritual_contempt');
    t(`3 · boredom/contempt does NOT survive a ${c.label} scene`, contempt && contempt.hits === 0,
      JSON.stringify(contempt));
  }
  t('3e: …and the test is not vacuous — contempt DOES establish in its own scene',
    R.matrix.find(x => x.facet === 'presiding_dohkar_ritual_contempt')
      .scores.find(x => x.facet_id === 'presiding_dohkar_ritual_contempt').hits > 0);

  console.log('\n 4 · THE REQUIREMENT IS A CHECKING DEVICE, NEVER PROMPT MATERIAL');
  t('4a: every authored condition states what evidence must establish it',
    R.facets.every(f => (f.pressures || []).every(p => String(p.evidence_requires || '').trim().length > 0)),
    JSON.stringify(R.facets.map(f => (f.pressures||[]).map(p => [p.pressure_id, !!p.evidence_requires]))));
  // A requirement rendered into a prompt would hand the planner the answer key, and the check
  // would then be measuring its own instruction. Every read of the field is accounted for by
  // NAME: authoring it, normalising it, and the one predicate that consumes it. A new read is a
  // deliberate act and has to be re-justified here rather than appearing quietly.
  {
    const reads = [...SRC.matchAll(/[.\w]evidence_requires/g)].length;   // property reads only
    // Four reads, all accounted for: two normalising the authored field, two inside the one
    // predicate that consumes it. A fifth means someone found a new use — re-justify it here.
    t('4b: the requirement is read in exactly four places — normalise (2), guard (2), nowhere else',
      reads === 4, `reads=${reads} (expected 4 property reads; a fifth means a new consumer)`);
    t('4c: …and no prompt builder concatenates it into text a model could receive',
      !/evidence_requires[^\n]{0,80}(?:\+\s*'|directive|prompt|lines\.push)/.test(SRC),
      'a render site would put the answer key in the request');
  }

  // ══════════════════════════════════════════════════════════════════════════════════════
  // 5 · EVERY AUTHORED CONDITION, DRIVEN BOTH WAYS (2026-08-28)
  //
  // The wrong-facet guard only bites where a condition says what establishes it. Until now that
  // was the presiding Dohkar alone; Julian and Seren returned `checked:false` and any evidence
  // id passed. These requirements author NO psychology — each pattern is read off the condition's
  // own wording — so what has to be proven is exactly that: the condition fires on material that
  // matches it, and stays silent on material that does not.
  // ══════════════════════════════════════════════════════════════════════════════════════
  console.log('\n 5 · JULIAN AND SEREN — each condition, positively and negatively');
  const DRIVE = [
    ['named:julian', 'julian_status_without_display', 'p_gathering_where_standing_is',
      'Roughly two dozen First Favored are assembled, family and guests, in gossamer Veilweave.',
      'She blurs the wording to avoid naming the wound out loud.'],
    ['named:julian', 'julian_status_without_display', 'p_someone_competing_for_the',
      'The whole room turns toward whoever is speaking, and the attention moves with him.',
      'The carpet underfoot is braided mated-pair spiralgrass.'],
    ['named:julian', 'julian_notices_without_volunteering', 'p_consequential_moment_he_has',
      'Julian stands at the edge of the gathering, here only as an observer.',
      'Her offering is a memory, and she names it aloud.'],
    ['named:julian', 'julian_notices_without_volunteering', 'p_room_reaching_for_an',
      'Nobody in the clearing can explain what has just gone wrong.',
      'The veil-canopy hangs down from the pale mated-pair trees.'],
    ['named:seren', 'seren_goodness_needs_witness', 'p_observed_by_people_whose',
      'Her family and the assembled guests are watching her kneel.',
      'The rite has a fixed order that has not changed in generations.'],
    ['named:seren', 'seren_goodness_needs_witness', 'p_chance_to_be_visibly',
      'She spends her First Sacrifice on Lirael instead of on herself.',
      'Julian stands at the edge, perfectly still.'],
    ['named:seren', 'seren_trained_composure', 'p_public_correction',
      'She has been corrected in front of the others before, and held her composure.',
      'The floor is a deep-crimson carpet of spiralgrass.'],
    ['named:seren', 'seren_trained_composure', 'p_rehearsed_procedure_going_wrong',
      'She abandons the practised wish she rehearsed for months.',
      'The assembled First Favored are barefoot.'],
    ['named:seren', 'seren_delicacy_over_truth', 'p_someone_s_pain_becomes',
      'She asks that Lirael find the one she lost, and the grief is suddenly in the open.',
      'A gossamer band is tied across the officiant\'s mouth.'],
    ['named:seren', 'seren_delicacy_over_truth', 'p_precision_would_embarrass_a',
      'She blurs the wording rather than embarrass her by naming it.',
      'Two dozen First Favored stand in the clearing.'],
  ];
  const D = await page.evaluate((DRIVE) => {
    const s = window.state;
    const facetsOf = id => window._facetsForCharacter(
      { id, label: id.split(':')[1], aliases: [id.split(':')[1]] }, s, { sceneNumber: 1 });
    return DRIVE.map(row => {
      const [owner, fid, pid, pos, neg] = row;
      const f = facetsOf(owner).filter(x => x.facet_id === fid)[0] || null;
      if (!f) return { fid, pid, missing: true };
      return { fid, pid,
        knownPressure: (f.pressures || []).some(p => p.pressure_id === pid),
        pos: window._cpEvidenceEstablishes(f, pid, [pos]),
        neg: window._cpEvidenceEstablishes(f, pid, [neg]) };
    });
  }, DRIVE);
  D.forEach(r => {
    t(`5 · ${r.fid} / ${r.pid} — the pressure id exists as authored`,
      !r.missing && r.knownPressure, JSON.stringify(r));
    t(`5 · ${r.fid} / ${r.pid} — POSITIVE: matching material establishes it`,
      !r.missing && r.pos.checked && r.pos.ok, JSON.stringify(r.pos));
    t(`5 · ${r.fid} / ${r.pid} — NEGATIVE: unrelated scene material does NOT`,
      !r.missing && r.neg.checked && !r.neg.ok, JSON.stringify(r.neg));
  });
  t('5z: EVERY authored condition in the seed now states what establishes it',
    (() => {
      const all = ['named:julian', 'named:seren', 'role:first_sacrifice_presiding_dohkar'];
      return all.every(id => (R.allFacets[id] || []).every(f =>
        (f.pressures || []).every(p => String(p.evidence_requires || '').trim().length > 0)));
    })(), JSON.stringify(Object.keys(R.allFacets).map(k => [k, (R.allFacets[k] || []).length])));
} finally { await ctx.close().catch(() => {}); }

console.log(`\n${'─'.repeat(88)}\n  ${pass} passed · ${fail} failed\n`);
await closeBrowser();
process.exit(fail ? 1 : 0);
