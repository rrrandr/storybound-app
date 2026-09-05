// VERIFIER FALSE-POSITIVE PROBE — no image generation; verify calls only (~$0.002 each).
//
// The smoke gate burned 3/3 attempts in BOTH arms on one defect: "Mira is canon Human, but she is
// drawn with Kwisheen tentacle-dreadlocks." Visual inspection says Mira is human in both images. If
// that is a verifier false positive, the verifier — not the generator — is the dominant cost driver,
// and a screening run would measure verifier noise instead of the species references.
//
// Three questions, each with a distinguishing prediction:
//   Q1  Does the verifier EXPLAIN its reasoning, or only assert a conclusion?
//         → assertion-only suggests an underspecified spec; a stated observation suggests hallucination
//           OR a real feature we are misreading by eye.
//   Q2  Does the flag SURVIVE cropping to Mira alone?
//         → dies on crop  = CONTEXTUAL CONTAMINATION (tentacles elsewhere in frame bleed onto her)
//         → survives crop = the spec/prompt itself, or something genuinely present on her
//   Q3  Does it fire on a scene with NO Kwisheen present at all?
//         → yes = the human-contamination guard is trigger-happy independent of context
//
// Q2 is the load-bearing one: contextual contamination and spec error need OPPOSITE fixes.
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');

const DIR = process.env.DIR || '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5fdb04a6-8f19-429f-ad3e-6876acbb645f/scratchpad/structref_ab';
const IMAGES = ['kwisheen__kw_combat__refs_off.png', 'kwisheen__kw_combat__refs_on.png'];

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window._verifyPanelAnatomy === 'function'
    && typeof window._structuralIdentitySpec === 'function', { timeout: 40000 });

  // Show the exact spec the structural verifier is given — the text under suspicion.
  const spec = await page.evaluate(() => {
    window.state._playerSpecies = 'Human'; window.state._liSpecies = 'Kwisheen';
    return window._structuralIdentitySpec();
  });
  console.log('═'.repeat(78));
  console.log('THE SPEC THE VERIFIER IS GIVEN (structural mode)');
  console.log('═'.repeat(78));
  spec.split('\n').forEach(l => console.log('  ' + l.replace(/(.{110})/g, '$1\n    ')));

  const CANON_FULL = [
    { name: 'Mira', species: 'Human', position: 'left' },
    { name: 'Vael', species: 'Kwisheen', position: 'center' },
    { name: 'raider', species: 'Kwisheen', position: 'right' }
  ];

  for (const img of IMAGES) {
    const b64 = fs.readFileSync(path.join(DIR, img)).toString('base64');
    console.log('\n' + '═'.repeat(78));
    console.log(img);
    console.log('═'.repeat(78));

    // ── Q1: full frame, capture the COMPLETE raw verdict (not just the summary line) ────────────
    const full = await page.evaluate(async ({ b64, canon }) => {
      const v = await window._verifyPanelAnatomy('data:image/png;base64,' + b64, 'wide', false,
        { mode: 'structural', expectedPeople: 3, canon, authorized: null, wishAnchor: null });
      return v;
    }, { b64, canon: CANON_FULL });
    console.log('\n  [Q1] FULL FRAME — complete verdict:');
    console.log('    ' + JSON.stringify(full, null, 2).split('\n').join('\n    ').slice(0, 1400));

    // ── Q2: crop to Mira alone (left third) and re-verify as a SOLO HUMAN scene ─────────────────
    // If the flag dies here, the tentacles elsewhere in frame were bleeding onto her classification.
    const cropRes = await page.evaluate(async ({ b64 }) => {
      const crop = await new Promise(res => {
        const im = new Image();
        im.onload = () => {
          const c = document.createElement('canvas');
          const w = Math.floor(im.width * 0.38), h = im.height;
          c.width = w; c.height = h;
          c.getContext('2d').drawImage(im, 0, 0, w, h, 0, 0, w, h);
          res(c.toDataURL('image/png'));
        };
        im.src = 'data:image/png;base64,' + b64;
      });
      const v = await window._verifyPanelAnatomy(crop, 'medium', false, {
        mode: 'structural', expectedPeople: 1,
        canon: [{ name: 'Mira', species: 'Human', position: 'center' }], authorized: null, wishAnchor: null
      });
      return { verdict: v, cropB64: crop.split(',')[1] };
    }, { b64 });
    fs.writeFileSync(path.join(DIR, img.replace('.png', '__CROP_mira.png')), Buffer.from(cropRes.cropB64, 'base64'));
    console.log('\n  [Q2] CROPPED TO MIRA (left 38%, verified as a solo human scene):');
    console.log('    pass=' + (cropRes.verdict && cropRes.verdict.pass) + '  defect=' + (cropRes.verdict && cropRes.verdict.defect_type || '—'));
    console.log('    reason: ' + String((cropRes.verdict && cropRes.verdict.reason) || '—').slice(0, 300));
    const survived = cropRes.verdict && cropRes.verdict.pass === false;
    console.log('\n    → ' + (survived
      ? 'FLAG SURVIVED the crop — the spec/prompt itself, or something genuinely on her. Fix the SPEC.'
      : 'FLAG DIED on the crop — CONTEXTUAL CONTAMINATION: tentacles elsewhere in frame drove the'
        + '\n      classification of a character who is drawn correctly. Fix the verifier\'s ATTENTION, not the spec.'));
  }

  // ── Q3: does the human-contamination guard fire with NO Kwisheen in the scene? ────────────────
  // Uses the human-control sketch if one exists; otherwise skipped (it needs a generated image).
  console.log('\n' + '═'.repeat(78));
  console.log('[Q3] SKIPPED — needs a human-only sketch. The screening run\'s human control supplies it.');
  console.log('═'.repeat(78));

  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
