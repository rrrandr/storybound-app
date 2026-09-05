// ═══════════════════════════════════════════════════════════════════════════════════════════════
// STRUCTURAL REFERENCE BENCHMARK (A/B)
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// HYPOTHESIS (architecture-level, not implementation-level):
//   Attaching SPECIES ANATOMY references to the stage that DECIDES topology reduces STRUCTURAL
//   REGENERATION and raises SPECIES UTILIZATION, without increasing REFERENCE POSE COPYING.
//
// Metrics are deliberately named for the ARCHITECTURE, not for today's pipeline. If the stages merge,
// the model changes, or Gemini is replaced, these still measure the behaviour we care about:
//   structural_regeneration  — mean generations per panel (COST endpoint; includes unresolved panels)
//   resolution_rate          — % of panels reaching structural PASS within the regen ceiling (QUALITY)
//   species_utilization      — % of outputs exhibiting the species' DEFINING structural features
//   identity_utilization     — same, for individual-identity references (needs injected masters)
//   reference_availability   — was the treatment ACTUALLY delivered? (guards against a false null)
//   pose_copy                — scored manually off saved images (see POSE COPY below)
//
// WHY structural_regeneration ALONE IS NOT ENOUGH: the regen loop has a hard ceiling and can exit
// UNRESOLVED, so the metric is RIGHT-CENSORED — a panel needing 5 attempts records as 3, and a panel
// that never resolves still costs its full attempts. Refs can improve quality with FLAT attempt counts.
// Always read structural_regeneration and resolution_rate TOGETHER.
//
// WHY species_utilization NEEDS ITS OWN INSTRUMENT: the structural verifier is DELIBERATELY blind to
// limb counts ("DO NOT check in this mode: exact tentacle COUNT..." — app.js _structuralIdentitySpec),
// because counting was the false-positive that poisoned the earlier benchmark. So a run scored only by
// regen rate CANNOT see the improvement species sheets are supposed to buy. Utilization is therefore
// measured by a SEPARATE full-mode verify against the species' own strict identityBlock.
//
// ── WHAT THIS RUN IS POWERED TO ANSWER ─────────────────────────────────────────────────────────
// The primary endpoint MOVED once the power analysis was done, and the honest statement of purpose is:
//   POWERED (readable from a handful of images + the defect log):
//     P1/P2  did the expected structural failure CLASSES disappear?   ← failure-class composition
//     P3     did species_utilization rise?
//     P5     did over-constraint (reference pose-copying) appear?
//   UNDERPOWERED, reported as DIRECTIONAL ONLY:
//     P4     generations/panel — statistically mute at this n (see DETECTION FLOOR in the report),
//            but still printed, because a favourable direction is what justifies paying for the
//            confirmatory run. Directional economics inform the NEXT decision; they are not evidence.
// A LATER factorial (neither / species-only / identity-only / both) would separate the two reference
// kinds' individual contributions. Deliberately NOT done here — it doubles the arms for a question
// that only matters if this screening run comes back promising.
//
// ── PRE-REGISTERED PREDICTIONS (write down BEFORE running; score explicitly) ────────────────────
//   P1  Extra-manipulator-arm errors DECREASE with species refs.            [species sheet]
//   P2  Human-legs-on-a-mantle-species errors DECREASE with species refs.   [species sheet]
//   P3  species_utilization INCREASES (target: a large jump, not a nudge).  [species sheet]
//   P4  structural_regeneration DECREASES (the cost endpoint).              [species sheet]
//   P5  pose_copy does NOT increase beyond an acceptable threshold.         [over-constraint guard]
//   P6  The HUMAN control shows NO material change on any endpoint.         [specificity check —
//       humans get no species reference, so a shift here means something ELSE moved, not the refs.]
//
// ── PRE-REGISTERED INTERPRETATIONS (written BEFORE any data exists) ────────────────────────────
// Fixing the reading of each outcome in advance is what stops a post-hoc story being fitted to it.
//
// (i) MOST LIKELY OUTCOME — high species_utilization gain, ~flat structural_regeneration.
//     This is expected BY CONSTRUCTION, not a surprise: the structural verifier is deliberately told
//     not to check limb counts, and limb counts are the main thing species sheets fix. The two metrics
//     are measuring different things on purpose. Correct reading: the references work AND the verifier
//     cannot see it. That is a signal to revisit the VERIFIER's pass criteria — NOT to abandon the
//     reference strategy. It also means the cost win would land downstream (fewer canon repairs at the
//     rendering stage) rather than in Stage A retries, so the 7-8c path may not run through retries.
//
// (ii) FAILURE CLASSES ELIMINATED but generations/panel UNCHANGED.
//     WRONG reading:  "references do not reduce cost."
//     RIGHT reading:  "references removed one class of structural failure; a different class became
//                      the limiting factor, so total retry cost did not improve UNDER THE CURRENT
//                      VERIFIER AND PROMPT." The next engineering target is the new dominant class
//                      (see the bottleneck line), not the reference architecture.
//
// (iii) OVER-CONSTRAINT (pose copying) present — this one DOES indict the approach, and it is the only
//     outcome that should stop the programme rather than redirect it. Inspect the saved sketches
//     before any further spend; the prompt contract's staging-vs-anatomy precedence rule is what failed.
//
// ── POSE COPY ──────────────────────────────────────────────────────────────────────────────────
// Not auto-scored: detecting "the output copied the reference's pose" requires knowing the reference's
// pose, and the answer differs by reference KIND (an anatomy plate has little pose to copy; a full-body
// casting crop has a lot). Every sketch is saved with its ref manifest so this is scored by eye, and
// the report stratifies by ref kind so the risk is not pooled away.
//
// PAID. Prints a cost estimate and requires RUN=1 to spend anything.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');

const OUT = process.env.OUT || '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/5fdb04a6-8f19-429f-ad3e-6876acbb645f/scratchpad/structref_ab';
const SCENES_PER_SPECIES = Number(process.env.SCENES || 3);
const MAX_ATTEMPTS = Number(process.env.MAX_ATTEMPTS || 3);
const RUN = process.env.RUN === '1';
// ONLY=kwisheen restricts to one species. Combined with SCENES=1 this is the SMOKE GATE: 2 runs, ~22c.
// Worth doing FIRST, because the one outcome that should stop this programme — over-constraint, i.e.
// the reference's pose stamped onto the panel — is qualitatively obvious in a SINGLE image and needs
// no statistics. Only spend on the screening run once the smoke gate says the mechanism is sane.
const ONLY = (process.env.ONLY || '').toLowerCase();

// ── CHALLENGE SET ──────────────────────────────────────────────────────────────────────────────
// The unit is a HARD CASE, not a scene. Each species declares its OWN expected failure classes, so
// this grows with the world instead of becoming "the Kwisheen benchmark". `control: true` species get
// no species reference by design — they test SPECIFICITY (did anything move that shouldn't have?).
const CHALLENGE_SET = [
  {
    speciesKey: 'kwisheen',
    label: 'Kwisheen',
    control: false,
    failureClasses: ['extra_manipulator_arms', 'human_legs', 'mantle_topology', 'silhouette_reads_human'],
    setup: { playerSpecies: 'Human', liSpecies: 'Kwisheen' },
    // Deliberately underwater/true-form: a DISGUISED Kwisheen legitimately withholds the species sheet,
    // which would silently turn arm B into arm A.
    scenes: [
      { id: 'kw_combat', camera: 'wide', expectedPeople: 3,
        canon: [{ name: 'Mira', species: 'Human', position: 'left' }, { name: 'Vael', species: 'Kwisheen', position: 'center' }, { name: 'raider', species: 'Kwisheen', position: 'right' }],
        desc: 'Underwater in the drowned coral ruins of Gloamwater Bay. A hostile KWISHEEN raider ambushes Mira (human) and Vael (Kwisheen), fighting the Many-Tide way — a spear-tentacle high, a cutlass-tentacle low, a hidden dagger held back for the killing thrust. Vael answers tentacle against tentacle. Mira braces against a coral spur, blade up. Three figures, full body, mid-combat, strong diagonal action.' },
      { id: 'kw_reach', camera: 'medium', expectedPeople: 2,
        canon: [{ name: 'Vael', species: 'Kwisheen', position: 'left' }, { name: 'Mira', species: 'Human', position: 'right' }],
        desc: 'Underwater, silt-lit. Vael (Kwisheen) reaches toward Mira (human) with one tentacle-arm extended, the other drawn back holding a lantern. Both full body, floating clear of any ground plane. Vael\'s lower body fans wide beneath her; Mira\'s legs trail. Low angle looking up.' },
      { id: 'kw_crowd', camera: 'wide', expectedPeople: 5,
        canon: [{ name: 'Vael', species: 'Kwisheen', position: 'center' }, { name: 'Mira', species: 'Human', position: 'left' }],
        desc: 'A Kwisheen market terrace beneath the tide. Vael (Kwisheen) at centre among three other Kwisheen traders, with Mira (human) at the left edge. Five figures total, varied heights and postures, full body, some turned away. Crowded composition, deep space.' }
    ]
  },
  {
    speciesKey: 'first_favored',
    label: 'First Favored',
    control: false,
    failureClasses: ['silhouette_drift', 'body_proportions', 'limb_count'],
    setup: { playerSpecies: 'Human', liSpecies: 'First Favored' },
    scenes: [
      { id: 'ff_duel', camera: 'wide', expectedPeople: 2,
        canon: [{ name: 'Kesh', species: 'First Favored', position: 'right' }, { name: 'Mira', species: 'Human', position: 'left' }],
        desc: 'A veilwood clearing at dusk. Kesh (First Favored) stands in a duelling guard, blade low and back, weight on the rear foot. Mira (human) faces her across the clearing. Both full body, wide shot, strong silhouette against pale sky.' },
      { id: 'ff_kneel', camera: 'medium', expectedPeople: 2,
        canon: [{ name: 'Kesh', species: 'First Favored', position: 'center' }, { name: 'Mira', species: 'Human', position: 'right' }],
        desc: 'Inside a ruined hall. Kesh (First Favored) kneels to examine something on the flagstones, one hand braced, head turned up toward Mira (human) who stands over her. Both full body visible, three-quarter angle from behind Kesh.' },
      { id: 'ff_crowd', camera: 'wide', expectedPeople: 4,
        canon: [{ name: 'Kesh', species: 'First Favored', position: 'center' }],
        desc: 'A market street. Kesh (First Favored) walks through a press of three ordinary human traders, taller than them, moving against the crowd. Four figures, full body, varied postures and directions.' }
    ]
  },
  {
    speciesKey: null,
    label: 'Human (control)',
    control: true,
    failureClasses: ['species_contamination'],
    setup: { playerSpecies: 'Human', liSpecies: 'Human' },
    scenes: [
      { id: 'hu_combat', camera: 'wide', expectedPeople: 3,
        canon: [{ name: 'Mira', species: 'Human', position: 'left' }, { name: 'Dain', species: 'Human', position: 'center' }, { name: 'raider', species: 'Human', position: 'right' }],
        desc: 'A raider ambushes Mira and Dain in a rain-slicked stone courtyard — a spear high, a shortsword low, a hidden dagger held back. Dain answers blade against blade. Mira braces against a pillar. Three figures, full body, mid-combat, strong diagonal action.' },
      { id: 'hu_reach', camera: 'medium', expectedPeople: 2,
        canon: [{ name: 'Dain', species: 'Human', position: 'left' }, { name: 'Mira', species: 'Human', position: 'right' }],
        desc: 'A silt-lit cellar. Dain reaches toward Mira with one arm extended, the other drawn back holding a lantern. Both full body. Low angle looking up.' },
      { id: 'hu_crowd', camera: 'wide', expectedPeople: 5,
        canon: [{ name: 'Dain', species: 'Human', position: 'center' }, { name: 'Mira', species: 'Human', position: 'left' }],
        desc: 'A market terrace. Dain at centre among three other traders, with Mira at the left edge. Five figures total, varied heights and postures, full body, some turned away. Crowded composition, deep space.' }
    ]
  }
];

const ARMS = [
  { key: 'refs_off', label: 'A — no structural references (baseline)', refsOn: false },
  { key: 'refs_on',  label: 'B — species + identity references',       refsOn: true  }
];

function mean(xs) { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0; }
function pct(n, d) { return d ? +(100 * n / d).toFixed(1) : null; }

(async () => {
  const SET = ONLY ? CHALLENGE_SET.filter(s => (s.speciesKey || 'human').toLowerCase().includes(ONLY)) : CHALLENGE_SET;
  if (!SET.length) { console.error(`No species matches ONLY="${ONLY}". Available: ` + CHALLENGE_SET.map(s => s.speciesKey || 'human').join(', ')); process.exit(1); }
  const cases = SET.flatMap(sp => sp.scenes.slice(0, SCENES_PER_SPECIES).map(sc => ({ sp, sc })));
  const isSmoke = cases.length <= 2;
  const totalRuns = cases.length * ARMS.length;
  // Cost model: one generation per attempt + one structural verify per attempt + one utilization verify.
  const GEN = 0.067, VER = 0.002, EXPECTED_ATTEMPTS = 1.67;
  const est = totalRuns * (EXPECTED_ATTEMPTS * (GEN + VER) + VER);

  console.log('─'.repeat(78));
  console.log('STRUCTURAL REFERENCE BENCHMARK (A/B) — sketch stage only, no rendering pass');
  console.log('─'.repeat(78));
  console.log(`  mode              : ${isSmoke ? 'SMOKE GATE — qualitative only, no statistics' : 'SCREENING RUN'}`);
  console.log(`  hard cases        : ${cases.length}  (${SET.map(s => s.label + '×' + Math.min(SCENES_PER_SPECIES, s.scenes.length)).join(', ')})`);
  console.log(`  arms              : ${ARMS.length}  → ${totalRuns} runs, ceiling ${MAX_ATTEMPTS} attempts`);
  console.log(`  ESTIMATED COST    : ~$${est.toFixed(2)}  (at ~${EXPECTED_ATTEMPTS} gens/panel; worst case ~$${(totalRuns * (MAX_ATTEMPTS * (GEN + VER) + VER)).toFixed(2)})`);
  console.log(`  output            : ${OUT}`);
  console.log('─'.repeat(78));
  if (!RUN) {
    console.log('DRY RUN — no API calls made.');
    if (!isSmoke) {
      console.log('\n  START CHEAPER. The only outcome that should STOP this work — over-constraint (the');
      console.log('  reference\'s pose stamped onto the panel) — is obvious in ONE image and needs no stats:');
      console.log('    RUN=1 ONLY=kwisheen SCENES=1 node _structural_ref_ab.js     # 2 runs, ~$0.22');
      console.log('  Then, only if that looks sane, pay for the full screening run:');
      console.log('    RUN=1 node _structural_ref_ab.js                            # 18 runs, ~$2.11');
    } else {
      console.log('\n  SMOKE GATE: look at the two PNGs side by side. Judge ONLY:');
      console.log('    1. did the refs attach at all?           (precondition pass reports this)');
      console.log('    2. is the species topology right?        (mantle not legs, two manipulator arms)');
      console.log('    3. did it COPY the reference\'s pose?     ← the one result that stops the programme');
      console.log('  Ignore every number this prints at n=1 — the metrics need the full screening run.');
    }
    console.log('');
    process.exit(0);
  }

  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
  page.on('console', m => { const t = m.text(); if (/\[STAGE-A-REFS|\[REGEN-LOOP|\[ID-CARD/.test(t)) console.error('   >', t.slice(0, 170)); });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window._genStructuralLineArt === 'function'
    && typeof window._structuralRegenLoop === 'function' && typeof window._verifyPanelAnatomy === 'function'
    && typeof window._stageACanonRefs === 'function', { timeout: 40000 });

  // ── PRECONDITION GATE ────────────────────────────────────────────────────────────────────────
  // The previous benchmark burned two paid runs and measured NOTHING because the treatment arm never
  // received the treatment (opportunities=0). Prove refs actually resolve for every non-control
  // species BEFORE spending. $0 — resolution only, no generation.
  console.log('\nPRECONDITION — verifying the treatment arm actually receives a treatment ($0):');
  let gateFailed = false;
  for (const sp of SET) {
    const probe = await page.evaluate(async ({ setup, canon, desc }) => {
      const s = window.state;
      s._playerSpecies = setup.playerSpecies; s._liSpecies = setup.liSpecies;
      window._stageARefs = true;
      const refs = await window._stageACanonRefs(canon, desc);
      return refs.map(r => ({ label: r.label, kind: /SPECIES ANATOMY/.test(r.label) ? 'species' : 'identity', bytes: r.b64.length }));
    }, { setup: sp.setup, canon: sp.scenes[0].canon, desc: sp.scenes[0].desc });
    const species = probe.filter(r => r.kind === 'species').length;
    const identity = probe.filter(r => r.kind === 'identity').length;
    const ok = sp.control ? true : species > 0;
    if (!ok) gateFailed = true;
    console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${sp.label.padEnd(18)} species=${species} identity=${identity}` +
      (sp.control ? '  (control — species refs correctly absent)' : (species ? '' : '  ← arm B == arm A; this species would produce a FALSE NULL')));
  }
  if (gateFailed) {
    console.error('\nABORTED before spending: at least one treatment species resolves NO structural reference.');
    console.error('Fix resolution first — a run in this state cannot distinguish "refs do not help" from "refs were never delivered".');
    await browser.close(); process.exit(1);
  }
  console.log('  → treatment confirmed deliverable.\n');

  // ── RUN ──────────────────────────────────────────────────────────────────────────────────────
  const results = [];
  for (const { sp, sc } of cases) {
    for (const arm of ARMS) {
      const t0 = Date.now();
      process.stdout.write(`  ${sp.label} / ${sc.id} / ${arm.key} … `);
      const r = await page.evaluate(async ({ setup, sc, refsOn, MAX_ATTEMPTS }) => {
        const s = window.state;
        s._playerSpecies = setup.playerSpecies; s._liSpecies = setup.liSpecies;
        window._stageARefs = refsOn;
        window._structuralPass = true;
        let refManifest = [];
        try {
          refManifest = refsOn
            ? (await window._stageACanonRefs(sc.canon, sc.desc)).map(x => ({ label: x.label, kind: /SPECIES ANATOMY/.test(x.label) ? 'species' : 'identity' }))
            : [];
        } catch (_) {}
        const refs = refsOn ? await window._stageACanonRefs(sc.canon, sc.desc) : [];
        window._structuralLineArtLog = [];   // scope the forensic log to THIS run
        let gens = 0;
        // FAILURE-CLASS CAPTURE: record WHICH structural class caused each regeneration, not just how
        // many. The COMPOSITION of failures is more actionable than the count — if extra-arm defects
        // vanish while figure-count becomes dominant, the references solved one bottleneck and a
        // different one is now limiting. Free: the verifier already returns defect_type per attempt.
        const defects = [];
        const loop = await window._structuralRegenLoop({
          maxAttempts: MAX_ATTEMPTS,
          generate: (feedback) => { gens++; return window._genStructuralLineArt(sc.desc, feedback, { refs }); },
          verify: async (url) => {
            const v = await window._verifyPanelAnatomy(url, sc.camera, false, {
              mode: 'structural', expectedPeople: sc.expectedPeople, canon: sc.canon, authorized: null, wishAnchor: null
            });
            if (v && v.pass === false) defects.push({
              attempt: gens,
              type: v.defect_type || 'unclassified',
              character: v.defect_character || null,
              reason: String(v.reason || '').slice(0, 140)
            });
            return v;
          }
        });
        // Drain the forensic log for THIS run only (cleared before the loop, below) — one entry per
        // generation attempt, holding the exact prompt + ref manifest the model was sent.
        const requests = (window._structuralLineArtLog || []).slice();
        return { gens, resolved: !!loop.resolved, attempts: loop.attempts, url: loop.url || null, refManifest, defects, requests };
      }, { setup: sp.setup, sc, refsOn: arm.refsOn, MAX_ATTEMPTS });

      // Save the sketch for manual POSE COPY scoring + a SIDECAR holding the complete forensic record:
      // every prompt sent, every reference (by source asset), and the resulting defects. A PNG alone
      // cannot answer "what exactly did the model see?" once the code has moved on.
      const stem = `${sp.speciesKey || 'human'}__${sc.id}__${arm.key}`;
      let file = null;
      if (r.url && r.url.startsWith('data:')) {
        file = path.join(OUT, stem + '.png');
        fs.writeFileSync(file, Buffer.from(r.url.split(',')[1], 'base64'));
      }
      fs.writeFileSync(path.join(OUT, stem + '.request.json'), JSON.stringify({
        species: sp.label, speciesKey: sp.speciesKey, scene: sc.id, arm: arm.key, control: !!sp.control,
        sceneDescription: sc.desc, camera: sc.camera, expectedPeople: sc.expectedPeople, canon: sc.canon,
        refsRequested: r.refManifest, generations: r.gens, resolved: r.resolved, defects: r.defects || [],
        requests: r.requests || []
      }, null, 2));
      results.push({ species: sp.label, speciesKey: sp.speciesKey, control: !!sp.control, scene: sc.id, arm: arm.key,
        gens: r.gens, resolved: r.resolved, refs: r.refManifest, defects: r.defects || [], file, ms: Date.now() - t0, url: r.url });
      const dsum = (r.defects || []).map(d => d.type).join(',') || 'none';
      console.log(`gens=${r.gens} resolved=${r.resolved} refs=${r.refManifest.length} defects=[${dsum}] (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    }
  }

  // ── SPECIES UTILIZATION ──────────────────────────────────────────────────────────────────────
  // Scored SEPARATELY from the regen loop, because the structural verifier is deliberately blind to
  // the counts this measures. Uses mode:'full' with the species' OWN strict identityBlock as the spec,
  // so "utilization" means: does the output exhibit the defining structural features of the species?
  console.log('\nSPECIES UTILIZATION — conformance to each species\' strict canon spec:');
  for (const res of results) {
    if (!res.url) { res.utilization = null; continue; }
    res.utilization = await page.evaluate(async ({ url, speciesKey, canon, camera, expectedPeople }) => {
      try {
        const spec = speciesKey && window._STAGED_SPECIES_CONTRACTS && window._STAGED_SPECIES_CONTRACTS[speciesKey];
        const tokens = spec ? spec.identityBlock : '(all figures are ordinary humans — no non-human structure permitted)';
        const r = await fetch('/api/verify-anatomy', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_b64: url.split(',')[1], identity_tokens: tokens, species: speciesKey || 'human',
            expected_people: expectedPeople, canon, mode: 'full'
          })
        });
        if (!r.ok) return null;
        const j = await r.json();
        return { conforms: j.pass !== false, defect: j.defect_type || null, reason: (j.reason || '').slice(0, 160) };
      } catch (_) { return null; }
    }, { url: res.url, speciesKey: res.speciesKey, canon: [], camera: 'wide', expectedPeople: 0 });
    delete res.url; // keep the JSON small; the PNG is on disk
    console.log(`  ${res.species.padEnd(18)} ${res.scene.padEnd(12)} ${res.arm.padEnd(9)} ` +
      (res.utilization ? (res.utilization.conforms ? 'CONFORMS' : 'DEVIATES — ' + (res.utilization.defect || '?')) : 'unscored'));
  }

  // ── REPORT ───────────────────────────────────────────────────────────────────────────────────
  const report = { generatedFor: 'structural reference A/B', scenesPerSpecies: SCENES_PER_SPECIES, ceiling: MAX_ATTEMPTS, bySpecies: {}, overall: {} };
  for (const sp of SET) {
    const row = {};
    for (const arm of ARMS) {
      const rs = results.filter(r => r.species === sp.label && r.arm === arm.key);
      row[arm.key] = {
        n: rs.length,
        structural_regeneration: +mean(rs.map(r => r.gens)).toFixed(2),
        resolution_rate: pct(rs.filter(r => r.resolved).length, rs.length),
        species_utilization: pct(rs.filter(r => r.utilization && r.utilization.conforms).length, rs.filter(r => r.utilization).length),
        reference_availability: pct(rs.filter(r => r.refs.some(x => x.kind === 'species')).length, rs.length)
      };
    }
    report.bySpecies[sp.label] = { control: !!sp.control, failureClasses: sp.failureClasses, arms: row };
  }
  for (const arm of ARMS) {
    const rs = results.filter(r => r.arm === arm.key && !r.control);
    report.overall[arm.key] = {
      n: rs.length,
      structural_regeneration: +mean(rs.map(r => r.gens)).toFixed(2),
      resolution_rate: pct(rs.filter(r => r.resolved).length, rs.length),
      species_utilization: pct(rs.filter(r => r.utilization && r.utilization.conforms).length, rs.filter(r => r.utilization).length)
    };
  }

  console.log('\n' + '═'.repeat(78));
  console.log('RESULTS  (treatment species only in "overall"; control reported separately)');
  console.log('═'.repeat(78));
  for (const [label, d] of Object.entries(report.bySpecies)) {
    console.log(`\n${label}${d.control ? '  [CONTROL — expects NO material change]' : ''}`);
    for (const arm of ARMS) {
      const a = d.arms[arm.key];
      console.log(`  ${arm.key.padEnd(9)} n=${a.n}  structural_regeneration=${a.structural_regeneration}  ` +
        `resolution_rate=${a.resolution_rate}%  species_utilization=${a.species_utilization}%  ref_availability=${a.reference_availability}%`);
    }
  }
  const off = report.overall.refs_off, on = report.overall.refs_on;
  const gensOf = k => results.filter(r => r.arm === k && !r.control).map(r => r.gens);
  const sd = xs => { if (xs.length < 2) return 0; const m = mean(xs); return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1)); };
  const gOff = gensOf('refs_off'), gOn = gensOf('refs_on');
  // MDD = the smallest difference this sample could distinguish from noise (~2 SE of the difference).
  const mdd = 2 * Math.sqrt((sd(gOff) ** 2 / Math.max(1, gOff.length)) + (sd(gOn) ** 2 / Math.max(1, gOn.length)));
  const dGens = off.structural_regeneration - on.structural_regeneration;      // >0 = fewer generations
  const dUtil = (on.species_utilization ?? 0) - (off.species_utilization ?? 0); // >0 = better conformance
  const centsPerPanel = dGens * 0.067 * 100;

  // ── FAILURE-CLASS COMPOSITION ────────────────────────────────────────────────────────────────
  // Where P1/P2 are actually scored. The aggregate retry count can stay flat while the MIX of causes
  // shifts completely — that shift is the actionable result: which bottleneck the references removed,
  // and which one became limiting in its place.
  const classHist = key => {
    const h = {};
    results.filter(r => r.arm === key && !r.control).forEach(r => (r.defects || []).forEach(d => { h[d.type] = (h[d.type] || 0) + 1; }));
    return h;
  };
  const hOff = classHist('refs_off'), hOn = classHist('refs_on');
  const allClasses = [...new Set([...Object.keys(hOff), ...Object.keys(hOn)])]
    .sort((a, b) => ((hOff[b] || 0) + (hOn[b] || 0)) - ((hOff[a] || 0) + (hOn[a] || 0)));
  console.log('\n' + '═'.repeat(78));
  console.log('FAILURE-CLASS COMPOSITION (treatment species) — what actually caused each regeneration');
  console.log('═'.repeat(78));
  if (!allClasses.length) {
    console.log('  no structural failures in either arm — every panel passed first attempt');
  } else {
    console.log(`  ${'class'.padEnd(28)} ${'refs_off'.padEnd(10)} ${'refs_on'.padEnd(10)} shift`);
    for (const c of allClasses) {
      const a = hOff[c] || 0, b = hOn[c] || 0;
      const shift = b === 0 && a > 0 ? 'ELIMINATED' : b > a ? 'now dominant ↑' : b < a ? 'reduced' : 'flat';
      console.log(`  ${c.padEnd(28)} ${String(a).padEnd(10)} ${String(b).padEnd(10)} ${shift}`);
    }
    const domOff = allClasses.filter(c => (hOff[c] || 0) > 0).sort((x, y) => hOff[y] - hOff[x])[0];
    const domOn = allClasses.filter(c => (hOn[c] || 0) > 0).sort((x, y) => hOn[y] - hOn[x])[0];
    console.log(`\n  bottleneck: ${domOff || 'none'} → ${domOn || 'none'}` +
      (domOff && domOn && domOff !== domOn ? '   ← the limiting factor MOVED; references solved one class and exposed another' : ''));
  }
  report.failureClasses = { refs_off: hOff, refs_on: hOn };

  console.log('\n' + '─'.repeat(78));
  console.log(`PRE-REGISTERED ENDPOINTS — SCREENING RUN (n=${gOn.length}/arm, treatment species only)`);
  console.log('─'.repeat(78));
  console.log(`  P4 structural_regeneration : ${off.structural_regeneration} → ${on.structural_regeneration}   (Δ ${dGens >= 0 ? '-' : '+'}${Math.abs(dGens).toFixed(2)} gens/panel)`);
  console.log(`  P3 species_utilization     : ${off.species_utilization}% → ${on.species_utilization}%   (Δ ${dUtil >= 0 ? '+' : ''}${dUtil.toFixed(1)} pp)`);
  console.log(`     resolution_rate         : ${off.resolution_rate}% → ${on.resolution_rate}%`);
  console.log(`  P1/P2 failure classes      : score from saved sketches + DEVIATES reasons in results.json`);
  console.log(`  P5 pose_copy               : score by eye from ${OUT} (stratified by ref kind)`);
  console.log(`  P6 control specificity     : see the [CONTROL] block above — expect FLAT`);

  // ── SCREENING VERDICT ────────────────────────────────────────────────────────────────────────
  // A screening run has THREE outcomes, not two. "We did not detect a large effect" is NOT the same
  // claim as "there is no economically meaningful effect" — at this sample size the cost endpoint is
  // statistically mute for any achievable effect, so a null here is uninformative about the economics
  // and the correct response to ambiguity is MORE SAMPLE, never abandonment.
  console.log('\n  DETECTION FLOOR: this sample can only distinguish a difference of ' +
    `~${mdd.toFixed(2)} gens/panel from noise.`);
  if (mdd > 0.4) {
    console.log('  ⚠ That floor is LARGER than most economically meaningful effects. A 0.17 gens/panel');
    console.log('    reduction is worth ~1.1c/panel — real money against a 7-8c target — and would be');
    console.log('    INVISIBLE here. Do not read a null on P4 as "refs do not help".');
  }
  let verdict, action;
  const overConstrained = (dUtil < -10) || (dGens < -mdd);
  // DEGENERATE-SAMPLE GUARD: at n<3 the SD is 0 or meaningless, so mdd collapses toward 0 and the
  // comparison `dGens >= mdd` becomes `0 >= 0` — which printed a confident PROCEED on a run where
  // NOTHING moved. A harness built to prevent over-reading must not over-read first. Observed live on
  // the smoke gate (n=1): "Δ -0.00 gens/panel → PROCEED". No verdict is issued below n=3.
  if (gOn.length < 3 || gOff.length < 3 || !(mdd > 0)) {
    verdict = 'NO VERDICT — smoke gate';
    action = 'Sample too small for ANY quantitative verdict. Judge the saved sketches by eye against the three smoke questions (refs delivered / topology correct / pose copied), then decide whether to fund the screening run.';
  }
  else if (dUtil >= 25 || dGens >= mdd) { verdict = 'PROCEED'; action = 'Large positive signal. Move to the rendering-stage channel (Klein rate) and a confirmatory run.'; }
  else if (overConstrained)        { verdict = 'RETHINK'; action = 'Clear negative signal or over-constraint. Inspect saved sketches for reference pose-copying BEFORE any further spend.'; }
  else                             { verdict = 'INCREASE SAMPLE'; action = `Direction ${dGens > 0 || dUtil > 0 ? 'favourable but' : ''} unresolved at this n. Re-run with SCENES=6 (~$${(est * 2).toFixed(2)}) — do NOT conclude "no effect".`; }
  console.log(`\n  SCREENING VERDICT: ${verdict}`);
  console.log(`  → ${action}`);
  console.log('─'.repeat(78));
  console.log(`\n  Structural-stage cost/panel : $${(off.structural_regeneration * 0.067).toFixed(3)} → $${(on.structural_regeneration * 0.067).toFixed(3)}` +
    `  (${centsPerPanel >= 0 ? 'saves' : 'costs'} ${Math.abs(centsPerPanel).toFixed(1)}c/panel)`);
  console.log('  NOTE: economics and statistics are reported separately ON PURPOSE — an effect can be');
  console.log('  financially material and statistically unresolvable at the same time.');
  report.screening = { n_per_arm: gOn.length, mdd: +mdd.toFixed(2), delta_gens: +dGens.toFixed(2), delta_utilization_pp: +dUtil.toFixed(1), cents_per_panel: +centsPerPanel.toFixed(1), verdict, action };

  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ report, results }, null, 2));
  console.log(`\nSaved ${results.length} sketches + results.json → ${OUT}`);
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
