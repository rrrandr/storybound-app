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
    return { facets, matrix,
             ids: facets.map(f => f.facet_id), cats: facets.map(f => f.category),
             contemptPressures: (rec('presiding_dohkar_ritual_contempt') || {}).pressures || [] };
  }, CASES);

  console.log(' 1 · THE PORTFOLIO IS FIVE DISTINCT TRUTHS');
  t('1a: five facets resolve for the presiding Dohkar', R.facets.length === 5, JSON.stringify(R.ids));
  t('1b: five DISTINCT categories — a portfolio, not one truth said five ways',
    new Set(R.cats).size === 5, JSON.stringify(R.cats));
  t('1c: every facet carries at least two conditions and its own misreadings',
    R.facets.every(f => (f.pressures || []).length >= 2 && (f.forbidden_restatements || []).length >= 1),
    JSON.stringify(R.facets.map(f => [f.facet_id, (f.pressures||[]).length, (f.forbidden_restatements||[]).length])));
  t('1d: no canonical truth is a near-copy of another (paraphrase would fake a portfolio)',
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
    const authored = [...SRC.matchAll(/\{ text: '[^']+', evidence_requires:/g)].length;
    // Four reads, all accounted for: two normalising the authored field, two inside the one
    // predicate that consumes it. A fifth means someone found a new use — re-justify it here.
    t('4b: the requirement is read in exactly four places — normalise (2), guard (2), nowhere else',
      authored === 10 && reads === 4,
      `authored=${authored} reads=${reads} (expected 10 authored conditions, 4 property reads)`);
    t('4c: …and no prompt builder concatenates it into text a model could receive',
      !/evidence_requires[^\n]{0,80}(?:\+\s*'|directive|prompt|lines\.push)/.test(SRC),
      'a render site would put the answer key in the request');
  }
} finally { await ctx.close().catch(() => {}); }

console.log(`\n${'─'.repeat(88)}\n  ${pass} passed · ${fail} failed\n`);
await closeBrowser();
process.exit(fail ? 1 : 0);
