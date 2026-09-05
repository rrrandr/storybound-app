// ═══════════════════════════════════════════════════════════════════════════════════════════════
// MIXED-PANEL CONTAMINATION MATRIX — why does a human acquire Kwisheen anatomy?
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// OBSERVED (production scene, region contract present): "Mira's species is incorrect; canon requires
// a human, but she is drawn with a tentacle lower body and pointed ears." The verifier identified a
// real phenomenon; the CAUSE is what is in question. Two candidates needing opposite fixes:
//
//   A  GLOBAL CONTAMINATION — Gemini conditions on the whole canvas with no per-region reference
//      binding, so ANY Kwisheen anatomy sheet biases every figure in a mixed panel. If true, no
//      wording fixes it and the architecture has to change (scope refs to panels whose figures all
//      share a species, or use a less species-dominant crop).
//   B  ASSIGNMENT FAILURE — the model was simply never told WHICH figure the reference governs.
//      If true, explicit assignment language largely fixes it, for the price of a longer prompt.
//
// THE MATRIX (this is why solo-vs-mixed alone is not enough — it cannot separate A from B):
//   cell 1  SOLO Kwisheen, ref on               → is the ref harmless when no human shares the frame?
//   cell 2  MIXED human+Kwisheen, ref, NO assignment  → reproduce the failure
//   cell 3  MIXED human+Kwisheen, ref, ASSIGNMENT     → does wording rescue it?
//   cell 4  MIXED human+Kwisheen, NO ref (control)    → does contamination happen WITHOUT any ref?
//
// Cell 4 is the one that keeps the conclusion honest: if the human comes out tentacled with NO
// reference attached, the reference was never the cause and both hypotheses are wrong.
//
// READING IT:
//   cell 2 fails, cell 3 clean         → hypothesis B. Ship the assignment clause.
//   cells 2 AND 3 fail, cell 1 clean   → hypothesis A. Architectural change needed.
//   cell 4 also fails                  → neither; the contamination is in the scene text or the
//                                        model's prior, and references are a red herring.
//
// Images stubbed NOWHERE — every cell is a real generation. Interception (used only in the prompt-
// capture phase of the production harness) is at the NETWORK layer, because window-level monkeypatching
// does NOT intercept closure-local calls — the bug that made the last production run cost real money
// while capturing nothing.
//
// n=1 per cell. QUALITATIVE. Judge the images; no verdict is computed.
// PAID. Requires RUN=1.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');

const OUT = process.env.OUT || '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5fdb04a6-8f19-429f-ad3e-6876acbb645f/scratchpad/mixed_matrix';
const RUN = process.env.RUN === '1';
const MAX_ATTEMPTS = Number(process.env.MAX_ATTEMPTS || 2);   // 2 not 3: we want the FIRST-PASS behaviour, cheaply

const SOLO_CAST  = [{ name: 'Vael', species: 'Kwisheen', position: 'center' }];
const MIXED_CAST = [{ name: 'Mira', species: 'Human', position: 'left' },
                    { name: 'Vael', species: 'Kwisheen', position: 'right' }];

// Same staging in both, so the only differences are cast and reference configuration.
const SOLO_DESC = 'Underwater in the drowned coral ruins of Gloamwater Bay, silt-lit. Vael (Kwisheen) holds a lantern high in one hand, the other drawn back. Full body, floating clear of any ground plane, three-quarter angle. She wears a fitted shell-scale bodice and a studded wrap below.';
const MIXED_DESC = 'Underwater in the drowned coral ruins of Gloamwater Bay, silt-lit. Vael (Kwisheen) holds a lantern high in one hand and reaches toward Mira (human) with the other. Mira braces against a coral spur, blade up. Both full body, floating clear of any ground plane, three-quarter angle. Vael wears a fitted shell-scale bodice and a studded wrap; Mira wears a laced leather diving jerkin and breeches.';

const CELLS = [
  { id: 'cell1_solo_ref',           cast: SOLO_CAST,  desc: SOLO_DESC,  refs: true,  assignment: true,  label: 'SOLO Kwisheen + ref' },
  { id: 'cell2_mixed_ref_noassign', cast: MIXED_CAST, desc: MIXED_DESC, refs: true,  assignment: false, label: 'MIXED + ref, NO assignment' },
  { id: 'cell3_mixed_ref_assign',   cast: MIXED_CAST, desc: MIXED_DESC, refs: true,  assignment: true,  label: 'MIXED + ref + ASSIGNMENT' },
  { id: 'cell4_mixed_noref',        cast: MIXED_CAST, desc: MIXED_DESC, refs: false, assignment: false, label: 'MIXED, NO ref (control)' }
];

(async () => {
  console.log('─'.repeat(78));
  console.log('MIXED-PANEL CONTAMINATION MATRIX');
  console.log('─'.repeat(78));
  CELLS.forEach((c, i) => console.log(`  cell ${i + 1}  ${c.label}`));
  console.log(`  ceiling ${MAX_ATTEMPTS} attempts/cell`);
  console.log(`  ESTIMATED: ~$${(CELLS.length * 1.4 * 0.067).toFixed(2)}  (worst case ~$${(CELLS.length * MAX_ATTEMPTS * 0.067).toFixed(2)})`);
  console.log(`  output   : ${OUT}`);
  console.log('─'.repeat(78));
  if (!RUN) { console.log('DRY RUN — no API calls. Re-run with RUN=1 to spend.\n'); process.exit(0); }

  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
  page.on('console', m => { const t = m.text(); if (/\[STAGE-A-REFS|\[REGEN-LOOP|\[ASSET-INTEGRITY/i.test(t)) console.error('   >', t.slice(0, 175)); });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window._genStructuralLineArt === 'function'
    && typeof window._stageACanonRefs === 'function' && typeof window._verifyReferenceAssets === 'function', { timeout: 40000 });

  const assets = await page.evaluate(async () => await window._verifyReferenceAssets(['kwisheen']));
  console.log(`\nASSET INTEGRITY: ${assets.ok ? 'OK' : 'FAILED'} (${assets.checked} checked, ${assets.missing.length} missing)`);
  if (!assets.ok) { console.error('ABORTED — incomplete reference set.'); await browser.close(); process.exit(1); }

  const results = [];
  for (const cell of CELLS) {
    const t0 = Date.now();
    process.stdout.write(`\n  ${cell.label} … `);
    const r = await page.evaluate(async ({ cell, MAX_ATTEMPTS }) => {
      const s = window.state;
      s._playerSpecies = 'Human'; s._liSpecies = 'Kwisheen';
      window._stageARefs = cell.refs;
      window._structuralLineArtLog = [];
      const refs = cell.refs ? await window._stageACanonRefs(cell.cast, cell.desc) : [];
      let gens = 0; const defects = [];
      const loop = await window._structuralRegenLoop({
        maxAttempts: MAX_ATTEMPTS,
        generate: (fb) => { gens++; return window._genStructuralLineArt(cell.desc, fb, {
          refs: refs, cast: cell.cast, assignment: cell.assignment }); },
        verify: async (url) => {
          const v = await window._verifyPanelAnatomy(url, 'medium', false, {
            mode: 'structural', expectedPeople: cell.cast.length, canon: cell.cast, authorized: null, wishAnchor: null });
          if (v && v.pass === false) defects.push({ attempt: gens, type: v.defect_type || 'unclassified',
            who: v.defect_character || null, reason: String(v.reason || '').slice(0, 170) });
          return v;
        }
      });
      const req = (window._structuralLineArtLog || [])[0] || {};
      return { gens, resolved: !!loop.resolved, url: loop.url || null, defects,
               refCount: refs.length, hadAssignment: /REFERENCE ASSIGNMENT/.test(req.prompt || ''),
               promptChars: (req.prompt || '').length, requests: window._structuralLineArtLog };
    }, { cell, MAX_ATTEMPTS });

    if (r.url && r.url.startsWith('data:')) fs.writeFileSync(path.join(OUT, cell.id + '.png'), Buffer.from(r.url.split(',')[1], 'base64'));
    fs.writeFileSync(path.join(OUT, cell.id + '.request.json'), JSON.stringify({ cell, ...r, url: undefined }, null, 2));
    results.push({ id: cell.id, label: cell.label, ...r, url: undefined, requests: undefined });
    console.log(`gens=${r.gens} resolved=${r.resolved} refs=${r.refCount} assignmentInPrompt=${r.hadAssignment} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    r.defects.forEach(d => console.log(`      defect: ${d.type}${d.who ? ' (' + d.who + ')' : ''} — ${d.reason}`));
  }

  console.log('\n' + '═'.repeat(78));
  console.log('MATRIX');
  console.log('═'.repeat(78));
  results.forEach((r, i) => {
    const contaminated = r.defects.some(d => /species|contamin/i.test(d.type) && /mira/i.test(d.who || '') );
    console.log(`  cell ${i + 1} ${r.label.padEnd(30)} resolved=${String(r.resolved).padEnd(5)} humanContaminated=${contaminated ? 'YES' : 'no '}  gens=${r.gens}`);
  });
  console.log('\n  Read it against the decision table in this file\'s header — then LOOK AT THE IMAGES.');
  console.log('  n=1 per cell: this indicates a direction, it does not measure an effect.');
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
  console.log(`\nSaved → ${OUT}`);
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
