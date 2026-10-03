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
    resolves: []
  },
  knowledge: { 'the assembly': 'knows Julian secretly countered the wish' }
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

console.log('\n2. PARSE -> RENDER -> STORE, through the production persist');
let rendered = '';
{
  const r = await page.evaluate((resp) => {
    window.state.scenes = [];
    const rec = window._sbPersistSceneProjection({
      kind: 'beats', input: resp.beats, uid: 'cg:fullseq', title: '', synopsis: '',
      fateCard: null, historyNote: resp.history_note
    });
    return { text: rec ? rec.text : '', note: rec ? rec.historyNote : null };
  }, AUTHOR_RESPONSE);
  rendered = r.text;
  t('the scene rendered from the beats', /put it into Lirael's hands/.test(r.text));
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
  t('the sealed disclosure was DROPPED from every tier',
    !/secretly countered/.test(JSON.stringify(r.note)),
    'a sealed claim survived into the note');
  t('the false knowledge disclosure was not stored',
    (r.note.knowledge || []).length === 0);
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
    return { before, afterCount: after.length, afterIds: after.map(o => o.id) };
  });
  t('two obligations were open before', r.before === 2, 'before=' + r.before);
  t('THE RESOLVED ONE CLOSED', !r.afterIds.includes('ob-inquiry'), JSON.stringify(r.afterIds));
  t('and the unresolved one is still carried', r.afterIds.includes('ob-invented'));
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
    t('THE SEALED CLAIM NEVER REACHED IT', !/secretly countered/.test(body));
    t('the resolved obligation is NOT still being carried',
      !/answer for her conduct at the inquiry/.test(body));
    t('the open obligation IS carried, labelled proposed',
      /PROPOSED OBLIGATIONS/.test(body) && /surrender The Answer/.test(body));
  }
  fs.mkdirSync('_audit_out/fullseq', { recursive: true });
  fs.writeFileSync('_audit_out/fullseq/planner.txt', body);
}

await browser.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
