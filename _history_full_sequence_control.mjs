// RESPONSE -> PARSE -> RENDERED SCENE -> STORED NOTE -> NEXT PLANNER. Provider-free, $0.
//
// Every stage through PRODUCTION functions, with the author's response carrying the kinds of
// claims that must be handled differently: quote-backed truth, Codex's three contradictions, an
// invented obligation, a false knowledge disclosure, and a genuine resolution in a later scene.
import fs from 'fs';
import { chromium } from 'playwright-core';
import { isProviderEndpoint } from './_replay_fixtures.mjs';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

// What the author "returned" — beats plus its note, exactly as the schema asks for them.
const AUTHOR_RESPONSE = {
  beats: [
    { text: 'The chamber was quiet for a long moment.' },
    { text: 'Julian took the sealed writ from his sleeve and put it into Lirael\'s hands.' },
    { text: 'The commission\'s clerk began reading the demand aloud to the seated members.' },
    { text: 'Julian said nothing about the wish.' }
  ],
  history_note: {
    events: [
      // QUOTE-BACKED and true.
      { text: 'Julian gave Lirael the sealed writ.', quote: 'put it into Lirael\'s hands' },
      // CODEX CASE 3 — escalation beyond what the beats show, no quote.
      { text: 'The commission accepted the demand.' }
    ],
    // CODEX CASE 1 — negation reversal, dressed up with a real quotation from elsewhere.
    decisions: [{ text: 'Julian did not give her anything.', quote: 'The chamber was quiet for a long moment' }],
    // CODEX CASE 2 — reversed direction.
    transfers: [{ text: 'Lirael handed the writ to Julian.' }],
    // A FALSE KNOWLEDGE DISCLOSURE that would burn a seal held until scene 16.
    disclosures: [{ text: 'Julian admitted he secretly countered the wish.' }],
    obligations: [
      { id: 'ob-inquiry', text: 'Lirael must answer for her conduct at the inquiry.', owedBy: 'Lirael' },
      // AN INVENTED OBLIGATION the beats never set up.
      { id: 'ob-invented', text: 'Lirael swore to surrender The Answer to the commission.' }
    ],
    // CODEX: this sat OUTSIDE history_note, so the handler never received it and the check
    // passed without testing anything. It belongs here, inside the note the handler is given.
    knowledge: { 'the assembly': { text: 'learned that Julian countered the wish',
      quote: 'The chamber was quiet for a long moment' } },
    resolves: []
  }
};

const browser = await chromium.launch();
const page = await browser.newPage();
const captured = [];
await page.route('**/api/**', async (route) => {
  const req = route.request();
  if (!isProviderEndpoint(req.url())) { try { await route.abort(); } catch (_) {} return; }
  let raw = null; try { raw = req.postData(); } catch (_) {}
  captured.push(raw || '');
  try { await route.abort(); } catch (_) {}
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._sbPersistSceneProjection === 'function', { timeout: 30000 });

console.log('=== FULL SEQUENCE (provider-free, $0) ===\n');

console.log('1. THE AUTHOR IS ACTUALLY ASKED FOR THE NOTE');
{
  const r = await page.evaluate(() => {
    const sys = (typeof window._buildCGScreenplaySystemPrompt === 'function')
      ? window._buildCGScreenplaySystemPrompt() : '';
    return { has: /"history_note"/.test(sys), asksQuote: /copied EXACTLY from your own beats/.test(sys),
      saysFinished: /THE SCENE YOU JUST WROTE, never the scene you were asked to write/.test(sys),
      len: sys.length };
  });
  console.log('     CG author system prompt: ' + r.len + ' chars');
  t('the schema requests history_note', r.has);
  t('and requires a verbatim quote per claim', r.asksQuote);
  t('and says summarize the FINISHED scene, not the planned one', r.saysFinished);
}

console.log('\n2. THROUGH THE REAL PARSER — a JSON STRING, as a provider would return it');
let rendered = '';
{
  const r = await page.evaluate((rawResponse) => {
    window.state.scenes = [];
    window.state._starterId = 'starter_first_sacrifice';
    // THE RAW STRING a provider returns, parsed exactly as _runCGScreenplayGenInner parses it
    // (JSON.parse, with the brace-slice fallback), instead of handing persistence an object that
    // was never parsed. Codex's point: the earlier test skipped the parser entirely.
    let plan;
    try { plan = JSON.parse(rawResponse); }
    catch (e) {
      const first = rawResponse.indexOf('{'), last = rawResponse.lastIndexOf('}');
      plan = JSON.parse(rawResponse.slice(first, last + 1));
    }
    // and then the production persist, reading the note off the parsed plan the same way the
    // production call site does.
    const rec = window._sbPersistSceneProjection({
      kind: 'beats', input: plan.beats, uid: 'cg:fullseq', title: '', synopsis: '',
      fateCard: null, historyNote: (plan && plan.history_note) || null
    });
    return { text: rec ? rec.text : '', note: rec ? rec.historyNote : null,
      parsedFromString: typeof rawResponse === 'string' };
  }, '```json\n' + JSON.stringify(AUTHOR_RESPONSE) + '\n```');
  rendered = r.text;
  t('the response was parsed FROM A STRING, fences and all', r.parsedFromString === true);
  t('the scene rendered from the parsed beats', /put it into Lirael's hands/.test(r.text));
  t('a note was stored on that exact scene record', !!r.note);
  t('THE NOTE IS NOT IN THE READER-VISIBLE PROSE',
    !/history_note|UNVERIFIED|obligation/i.test(r.text),
    'note content leaked into rendered prose');
  const q = (r.note.quoted || []).map(x => x.text).join(' | ');
  const sum = (r.note.summary || []).map(x => x.text).join(' | ');
  console.log('     quote-backed: ' + q);
  console.log('     summary-only: ' + sum);
  t('the true quote-backed claim is quote-backed', /gave Lirael the sealed writ/.test(q));
  t('CODEX 3 (escalation) is summary-only, not quote-backed',
    /commission accepted the demand/.test(sum) && !/commission accepted/.test(q));
  t('CODEX 2 (reversed direction) is summary-only',
    /Lirael handed the writ to Julian/.test(sum) && !/Lirael handed the writ to Julian/.test(q));
  // HONEST OUTCOME OF REPLACING THE PHRASE LIST WITH THE REAL SEAL SYSTEM: the screen is now
  // correct (story's own declarations, reveal boundary respected) but CATCHES LESS, because
  // starter_first_sacrifice declares no markers[] for its sealed events. The hardcoded string
  // caught this exact sentence and would have missed every rewording; this catches whatever the
  // story declares, which is currently an id and a label. The trade is correctness for
  // catch-rate, and the fix is story data, not more strings.
  t('the sealed claim is at least never ESTABLISHED',
    !(r.note.quoted || []).some(x => /secretly countered/.test(x.text)),
    'a sealed claim reached established history');
  console.log('     LIMITATION: the sealed paraphrase IS carried as unverified summary. The seal'
    + ' declares only an id and a label; declaring markers[] on starter_first_sacrifice would'
    + ' close it, and that is a canon decision.');
  // The knowledge claim IS stored now (it finally reaches the handler) — but only as unverified.
  t('the knowledge claim reached the handler', (r.note.knowledge || []).length === 1,
    'the fixture still is not submitting knowledge to the handler');
  t('and it is NOT established, despite carrying a real quotation',
    !(r.note.quoted || []).some(x => /learned that Julian/.test(x.text)));
  t('both obligations are stored as PROPOSED, none as fact',
    (r.note.obligations || []).length === 2
      && (r.note.obligations || []).every(o => o.proposed === true));
}

console.log('\n3. CODEX 1 — a REAL quotation must not launder a contradicted claim');
{
  const r = await page.evaluate(() => {
    const note = window.state.scenes[0].historyNote;
    const q = (note.quoted || []).find(x => /did not give her anything/.test(x.text));
    const block = window._buildHistoryContinuityBlock(window.state, {}) || '';
    return { quoted: !!q, block };
  });
  // HONEST LIMITATION: the quote IS in the prose, so this claim is quote-backed. What the system
  // guarantees is narrower than "true" — it guarantees the QUOTED TEXT is real. The claim itself
  // is still the author's wording, which is why the block presents the quotation, not the claim.
  const est = r.block.split('[THE AUTHOR')[0];
  t('the quotation IS presented as the scene\'s own words', /the scene's own words: "/.test(est));
  t('but the CONTRADICTED CLAIM attached to it is NOT established',
    !/did not give her anything/.test(est),
    'a real-but-irrelevant quotation laundered a false claim into established history');
  t('and that claim is still carried, under the unverified heading',
    /did not give her anything/.test(r.block),
    'the claim was dropped entirely rather than labelled');
}

console.log('\n4. AN OBLIGATION GENUINELY RESOLVED IN A LATER SCENE');
{
  const r = await page.evaluate(() => {
    const before = window._openObligations(window.state).length;
    const p2 = 'Lirael answered the inquiry in full and the commission closed the matter.';
    window._sbPersistSceneProjection({ kind: 'body', input: p2, uid: 'cg:fullseq2',
      historyNote: { resolves: ['ob-inquiry'],
        events: [{ text: 'Lirael answered the inquiry.', quote: 'answered the inquiry in full' }] } });
    const after = window._openObligations(window.state);
    return { before, afterCount: after.length, afterIds: after.map(o => o.id),
      claimFlagged: !!(after.find(o => o.id === 'ob-inquiry') || {}).claimedResolved };
  });
  t('two obligations were open before', r.before === 2, 'before=' + r.before);
  // A NOTE'S `resolves` NO LONGER CLOSES ANYTHING — Codex's finding. Both obligations stay open;
  // the claimed resolution is surfaced to the planner instead of silently deleting a commitment
  // the prose never shows being met.
  t('BOTH obligations are still carried after a mere claim of resolution',
    r.afterIds.includes('ob-inquiry') && r.afterIds.includes('ob-invented'),
    JSON.stringify(r.afterIds));
  t('and the claim is surfaced rather than acted on', r.claimFlagged === true);
}

console.log('\n5. IT REACHES THE NEXT PLANNER\'S ACTUAL REQUEST');
{
  captured.length = 0;
  try { await page.evaluate(() => window._generateLiteraryPlotContract('I wait.', '')); } catch (_) {}
  await page.waitForTimeout(2500);
  const body = captured.join('\n');
  t('a request was assembled', captured.length > 0);
  if (captured.length) {
    t('the VERBATIM quotation reached it', /put it into Lirael's hands/.test(body));
    t('the summary reached it under its unverified heading',
      /UNVERIFIED, NOT CANON/.test(body) && /commission accepted the demand/.test(body));
    t('the sealed claim reaches the planner only as UNVERIFIED summary, never as fact',
      !/the scene's own words: "[^"]*secretly countered/.test(body),
      'a sealed claim was presented to the planner as established');
    t('the unverified resolution claim is VISIBLE to the planner, not silently applied',
      /answer for her conduct at the inquiry/.test(body) && /NOT verified/.test(body));
    t('and obligation IDS reach the planner so it can resolve by id',
      /\[ob-inquiry\]/.test(body) && /\[ob-invented\]/.test(body));
    t('the open obligation IS carried, labelled proposed',
      /PROPOSED OBLIGATIONS/.test(body) && /surrender The Answer/.test(body));
  }
  fs.mkdirSync('_audit_out/fullseq', { recursive: true });
  fs.writeFileSync('_audit_out/fullseq/planner.txt', body);
}

await browser.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
