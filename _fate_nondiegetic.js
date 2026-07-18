// $0 FATELANDS LAW — Fate's visual language is NON-DIEGETIC (authorial notation for the reader;
// characters never perceive it) + the Fate VISUAL LEXICON (primitive alphabet) + the Fate Perspective
// Lint. Runs against localhost:3000, no paid calls.
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window._fatePerspectiveLint === 'function' && window._FATE_VISUAL_LEXICON && typeof window._buildStoryDirector === 'function', { timeout: 15000 });

  const R = await page.evaluate(() => {
    const G = window._VISUAL_GRAMMAR_V1;
    const LX = window._FATE_VISUAL_LEXICON;

    // ── the NON-DIEGETIC clause rides every Fate symbol (burst + sacrifice) ──
    const clauseInClean = /NON-DIEGETIC/i.test(G.wish) && /NO character sees/i.test(G.wish);
    const clauseInTwisted = /NON-DIEGETIC/i.test(G.wishTwisted);
    const clauseInRejected = /NON-DIEGETIC/i.test(G.wishRejected);
    const clauseInSacrifice = /NON-DIEGETIC/i.test(window._sacrificeHandGrammar('Fate takes her eye'));
    const lawExists = /NON-DIEGETIC/i.test(window._FATE_NONDIEGETIC_LAW) && /Characters NEVER perceive/i.test(window._FATE_NONDIEGETIC_LAW);

    // ── the VISUAL LEXICON: primitive alphabet, all non-diegetic, composable into sentences ──
    const lexKeys = Object.keys(LX);
    const hasCorePrimitives = ['acceptance', 'corruption', 'binding', 'taking', 'refusal'].every(k => LX[k] && LX[k].motifs);
    const allNonDiegetic = lexKeys.every(k => LX[k].diegesis === 'non-diegetic');
    const acceptanceIsStars = /sparkle stars|straight radiant/i.test(LX.acceptance.motifs);
    const bindingIsRings = /rings|chains|threads|circles/i.test(LX.binding.motifs);
    const takingIsShadow = /shadow|hand|draining/i.test(LX.taking.motifs);
    // a Tempt = binding + acceptance composes into ONE sentence carrying both alphabets + the clause
    const temptClean = window._fateVisualSentence(['binding', 'acceptance']);
    const composes = /rings|circles/i.test(temptClean) && /sparkle stars|straight radiant/i.test(temptClean) && /NON-DIEGETIC/i.test(temptClean);
    const brokenContract = window._fateVisualSentence(['severing', 'corruption']);
    const composesBroken = /frayed|cut threads|snapped/i.test(brokenContract) && /jagged|broken|scribbled/i.test(brokenContract);
    const emptyComposeSafe = window._fateVisualSentence([]) === '' && window._fateVisualSentence(['nonsense']) === '';

    // ── FATE PERSPECTIVE LINT ──
    const l1 = window._fatePerspectiveLint('She saw the golden burst bloom around his hands.');
    const catchesPerceive = l1.errors.some(e => /perceives\/reacts to a NON-DIEGETIC/i.test(e));
    const l2 = window._fatePerspectiveLint('"The rays turned red," she whispered, backing away.');
    const catchesDialogue = l2.errors.some(e => /dialogue names Fate/i.test(e));
    const l3 = window._fatePerspectiveLint('The golden burst lit the cavern walls and cast long shadows.');
    const catchesIllum = l3.warnings.some(w => /lighting the environment/i.test(w));
    const l4 = window._fatePerspectiveLint('He spoke the words. The wish twisted. He did not yet know.');
    const catchesPrematureConfirm = l4.warnings.some(w => /confirms Fate’s judgment before/i.test(w));
    // CLEAN prose that obeys the law → no flags
    const l5 = window._fatePerspectiveLint('He spoke the wish. Nothing happened. A long moment passed — then, far off, the water began to warm.');
    const cleanProsePasses = l5.errors.length === 0 && l5.warnings.length === 0;
    // a character naming an OBSERVABLE consequence is fine (not a symbol)
    const l6 = window._fatePerspectiveLint('"Look — the river," she said. "It\'s rising."');
    const observableOk = l6.errors.length === 0;

    // ── INTEGRATION: the burst grammar reaches the panel WITH the non-diegetic clause; doc exposes irony ──
    const s = window.state || (window.state = {});
    s.storyId = 'e2e-nd'; s._playerSpecies = 'human'; s._liSpecies = ''; s._openFateBargains = [];
    const plan = {
      visualState: { background: 'coral ruins', other_characters_present: [{ name: 'Kesh', species: 'kwisheen', position: 'a raider' }] },
      phases: [{ phaseIdx: 0, startBeat: 0, label: 'x', characters_present: ['protagonist', 'Kesh'], props_present: [], li_visibility_phase: 'absent' }],
      beats: [
        { idx: 0, kind: 'narration', text: 'The raider corners me.' },
        { idx: 1, kind: 'narration', text: '"Fate beneath the turning tide." He voices the wish, tide-light gathering.' },
        { idx: 2, kind: 'narration', text: 'The water warms and the passage opens.' }
      ]
    };
    window._buildStoryDirector(plan, 0);
    const tPhase = (plan.phases || []).find(p => p._readerLearning === 'Transformation');
    const tCues = (tPhase && tPhase._panel && tPhase._panel.grammarCues || []).join(' ');
    const panelHasNonDiegetic = /NON-DIEGETIC/i.test(tCues) && /NO character sees/i.test(tCues);
    const doc = tPhase && tPhase._storyboardDoc;
    const ironyExposed = !!(doc && doc.readerKnowledge && doc.characterKnowledge && /NO visible sign/i.test(doc.characterKnowledge));
    s._stagedRegionContract = window._buildStagedRegionContract({ visualState: plan.visualState, phases: [] });
    const pvs = window._resolvePhaseVisualState(plan.visualState, tPhase, plan.phases, plan.beats);
    const hero = window._buildStagedHeroPrompt(pvs, 0, plan) || '';

    // ── PERSPECTIVE CONTRACT: the three-way split (reader / characters / physical), outcome-aware ──
    const pcClean = window._buildPerspectiveContract('Transformation', 'clean', 'he voices the wish');
    const pcTwisted = window._buildPerspectiveContract('Transformation', 'twisted', 'he voices the wish');
    const pcRejected = window._buildPerspectiveContract('Transformation', 'rejected', 'he voices the wish');
    const contractThreeWay = !!(pcClean.readerLearns && pcClean.charactersLearn && pcClean.observableReality);
    const contractOutcomeAware = /ACCEPTED/i.test(pcClean.readerLearns) && /WARPED/i.test(pcTwisted.readerLearns) && /REFUSED/i.test(pcRejected.readerLearns);
    const charactersLearnNothing = /Nothing/i.test(pcClean.charactersLearn) && /NO visible sign/i.test(pcClean.charactersLearn);
    const physicalDelayed = /Nothing yet|lands later/i.test(pcClean.observableReality);
    const pcConsequence = window._buildPerspectiveContract('Consequence', null, 'the coral seam splits into a passage');
    const consequenceObservable = /observable change|passage/i.test(pcConsequence.observableReality) && /INFER Fate/i.test(pcConsequence.charactersLearn);
    const nonFateBeatNoContract = window._buildPerspectiveContract('Threat', null, 'the raider lunges') === null;
    // attached to the panel + emitted in the hero prompt
    const panelHasContract = !!(tPhase && tPhase._panel && tPhase._panel.perspectiveContract && tPhase._panel.perspectiveContract.readerLearns);
    const heroEmitsContract = /PERSPECTIVE CONTRACT \(three separate truths/.test(hero) && /READER learns →/.test(hero);

    // ── KNOWLEDGE-LEAK LINT (softer): a character forebodes right after a wish with no observable cue ──
    const leak = window._fateKnowledgeLeakLint('"I wish for rain." ... Bob narrowed his eyes. "I have a bad feeling about this."');
    const catchesLeak = leak.warnings.some(w => /KNOWLEDGE-LEAK/i.test(w));
    // an OBSERVABLE cue between the wish and the reaction defuses it (intuition after a real sign is fine)
    const noLeak = window._fateKnowledgeLeakLint('"I wish for rain." The sky darkened and the wind rose. "I have a bad feeling about this."');
    const observableDefusesLeak = noLeak.warnings.length === 0;
    // no wish → no leak flag
    const noWishNoLeak = window._fateKnowledgeLeakLint('Bob narrowed his eyes. "I have a bad feeling about this."').warnings.length === 0;

    // ── LEXICON SPARSENESS GUARD (Roman's caution): a constrained alphabet stays learnable ──
    const lexiconStaysSparse = Object.keys(LX).length <= 12;

    // ── the world-law directive carries the rule into PROSE generation ──
    const proseLaw = window._buildFatelandsWishLawDirective();
    const proseLawHasRule = /NON-DIEGETIC/i.test(proseLaw) && /NOTHING visibly happens/i.test(proseLaw);
    // #17b: INFERENCE dialogue allowed — a character may conclude from OBSERVABLE consequences (not the symbol)
    const law = window._FATE_NONDIEGETIC_LAW;
    const inferenceAllowed = /INFERENCE IS ALLOWED/i.test(law) && /Fate turns against you|the currents reject your bargain|your wish is fighting you/i.test(law) && /inferred from observable reality/i.test(law);
    const inferenceStillGuarded = /never from seeing the reader-only burst|follow the observable change/i.test(law);

    return {
      contractThreeWay, contractOutcomeAware, charactersLearnNothing, physicalDelayed,
      consequenceObservable, nonFateBeatNoContract, panelHasContract, heroEmitsContract,
      catchesLeak, observableDefusesLeak, noWishNoLeak, lexiconStaysSparse, inferenceAllowed, inferenceStillGuarded,
      clauseInClean, clauseInTwisted, clauseInRejected, clauseInSacrifice, lawExists,
      hasCorePrimitives, allNonDiegetic, acceptanceIsStars, bindingIsRings, takingIsShadow,
      composes, composesBroken, emptyComposeSafe,
      catchesPerceive, catchesDialogue, catchesIllum, catchesPrematureConfirm, cleanProsePasses, observableOk,
      panelHasNonDiegetic, ironyExposed, proseLawHasRule
    };
  });

  await browser.close();

  const checks = [
    ['NON-DIEGETIC clause rides the CLEAN burst grammar', R.clauseInClean],
    ['NON-DIEGETIC clause rides the TWISTED burst', R.clauseInTwisted],
    ['NON-DIEGETIC clause rides the REJECTED burst', R.clauseInRejected],
    ['NON-DIEGETIC clause rides the SACRIFICE shadow-hand', R.clauseInSacrifice],
    ['the world law states characters NEVER perceive Fate symbols', R.lawExists],
    ['LEXICON: has the core primitives (acceptance/corruption/binding/taking/refusal)', R.hasCorePrimitives],
    ['LEXICON: every primitive is non-diegetic', R.allNonDiegetic],
    ['LEXICON: acceptance=stars, binding=rings, taking=shadow-hand', R.acceptanceIsStars && R.bindingIsRings && R.takingIsShadow],
    ['LEXICON: a Tempt (binding+acceptance) composes ONE sentence from the alphabet', R.composes],
    ['LEXICON: a broken Contract (severing+corruption) composes correctly', R.composesBroken],
    ['LEXICON: composing nothing / unknown primitives is safe (empty)', R.emptyComposeSafe],
    ['LINT: catches a character perceiving a Fate symbol', R.catchesPerceive],
    ['LINT: catches dialogue naming a reader-only symbol/judgment', R.catchesDialogue],
    ['LINT: catches a Fate symbol lighting the environment', R.catchesIllum],
    ['LINT: catches prose confirming Fate’s judgment before the consequence', R.catchesPrematureConfirm],
    ['LINT: law-abiding prose (spoken wish → nothing → later consequence) passes clean', R.cleanProsePasses],
    ['LINT: a character naming an OBSERVABLE consequence is allowed', R.observableOk],
    ['INTEGRATION: the wish panel carries the non-diegetic clause', R.panelHasNonDiegetic],
    ['INTEGRATION: the storyboard doc exposes reader-vs-character knowledge (irony)', R.ironyExposed],
    ['INTEGRATION: the Fatelands wish-law directive carries the rule into prose', R.proseLawHasRule],
    ['CONTRACT: every Fate beat carries the three-way split (reader/characters/physical)', R.contractThreeWay],
    ['CONTRACT: "reader learns" is outcome-aware (accepted/warped/refused)', R.contractOutcomeAware],
    ['CONTRACT: characters learn NOTHING (no visible sign of Fate)', R.charactersLearnNothing],
    ['CONTRACT: the physical world change is DELAYED on the wish beat', R.physicalDelayed],
    ['CONTRACT: a Consequence beat names the observable change + "infer, don\'t see" Fate', R.consequenceObservable],
    ['CONTRACT: a non-Fate beat carries no perspective contract', R.nonFateBeatNoContract],
    ['CONTRACT: the wish panel carries it, and the hero prompt emits it', R.panelHasContract && R.heroEmitsContract],
    ['KNOWLEDGE-LEAK: catches foreboding right after a wish with no observable cue', R.catchesLeak],
    ['KNOWLEDGE-LEAK: an observable cue between wish and reaction defuses the flag', R.observableDefusesLeak],
    ['KNOWLEDGE-LEAK: no wish → no leak flag (plain suspicion is fine)', R.noWishNoLeak],
    ['LEXICON stays deliberately SPARSE (≤12 primitives — learnable alphabet)', R.lexiconStaysSparse],
    ['#17b INFERENCE: a character may conclude from OBSERVABLE consequences ("Fate turns against you")', R.inferenceAllowed],
    ['#17b INFERENCE stays guarded: from the observable change, never the reader-only burst', R.inferenceStillGuarded]
  ];

  let pass = 0, fail = 0;
  console.log('\n  FATELANDS LAW — Fate\'s visual language is NON-DIEGETIC + Visual Lexicon  ($0)\n  ' + '─'.repeat(66));
  for (const [name, ok] of checks) { ok ? pass++ : fail++; console.log('  ' + (ok ? '✓' : '✗') + ' ' + name); }
  if (errors.length) console.log('  · pageerrors: ' + errors.join(' | '));
  console.log('  ' + '─'.repeat(66) + '\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
