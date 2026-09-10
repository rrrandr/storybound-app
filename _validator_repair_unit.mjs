// Direct unit controls for the 2026-09-09 validator repair pass, against the SERVED app (window functions), no story flow.
// usage: node _validator_repair_unit.mjs   (dev server on :3000). Exits explicitly.
import { chromium } from 'playwright-core';
const results = []; const ok = (n, p, d) => { results.push(p); console.log((p ? 'PASS ' : 'FAIL ') + n + (p ? '' : '  — ' + d)); };
const browser = await chromium.launch({ headless: true }); const page = await browser.newPage();
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window._validateSoloStageInteraction && window._v3ResolveWordingMentions && window._v3PermittedVerbs, null, { timeout: 60000 });
const solo = (t) => page.evaluate((t) => window._validateSoloStageInteraction({ opening_spine: { pc_self_presentation_beat: t } }, { narrator: 'Testa' }), t);
const S = {
  simile: await solo('opening: I shove my sleeves higher with one forearm, the motion too quick, like someone who already knows she will lose this round'),
  asIf: await solo('I keep my back to the wall as if somebody were standing behind me'),
  asThough: await solo('I breathe as though someone was counting each breath'),
  theWay: await solo('I fold the cloth the way a stranger folds a letter'),
  real: await solo('Someone steps into the doorway behind me before I can turn'),
  asGuard: await solo('I square my shoulders as the guard steps closer'),
  realRole: await solo('I count the till while a clerk stands at the far counter, watching me'),
  capArticle: await solo('A clerk stands at the far counter, watching me'),
  realLike: await solo('I like the quiet. Someone steps in and ruins it'),
};
ok('U-SB1 simile "like someone who already knows…" → no violation', S.simile.ok, JSON.stringify(S.simile.violations));
ok('U-SB2 "as if somebody were standing…" → no violation', S.asIf.ok, JSON.stringify(S.asIf.violations));
ok('U-SB3 "as though someone was counting…" → no violation', S.asThough.ok, JSON.stringify(S.asThough.violations));
ok('U-SB4 "the way a stranger folds…" → no violation', S.theWay.ok, JSON.stringify(S.theWay.violations));
ok('U-SB5 RED "Someone steps into the doorway" → SOLO_BODY', !S.real.ok && S.real.violations.some(v => v.code === 'SOLO_BODY'), JSON.stringify(S.real));
ok('U-SB6 RED "as the guard steps closer" → SOLO_BODY (bare "as" is not comparative)', !S.asGuard.ok && S.asGuard.violations.some(v => v.code === 'SOLO_BODY'), JSON.stringify(S.asGuard));
ok('U-SB7 RED "…while a clerk stands at the far counter" → SOLO_BODY', !S.realRole.ok, JSON.stringify(S.realRole));
ok('U-SB9 RED sentence-initial "A clerk stands at the far counter, watching me" → SOLO_BODY (article case-insensitive, 2026-09-09)', !S.capArticle.ok && S.capArticle.violations.some(v => v.code === 'SOLO_BODY'), JSON.stringify(S.capArticle));
const S2 = { capThe: await solo('The stranger leans against the doorframe and waits'), capAnother: await solo('Another guard steps into the light'), capVoice: await solo('A voice outside called my name twice'),
  greenKettle: await solo('The kettle stands cold on the ring and the flour has gone grey'), greenMorning: await solo('Another morning waits for nobody in this kitchen'), greenAn: await solo('An hour holds more than I can carry today'), greenSome: await solo('Some ledgers hold nothing but rain damage') };
ok('U-SB10 RED "The stranger leans against the doorframe" → SOLO_BODY', !S2.capThe.ok, JSON.stringify(S2.capThe));
ok('U-SB11 RED "Another guard steps into the light" → SOLO_BODY', !S2.capAnother.ok, JSON.stringify(S2.capAnother));
ok('U-SB12 RED "A voice outside called my name" → SOLO_VOICE', !S2.capVoice.ok && S2.capVoice.violations.some(v => v.code === 'SOLO_VOICE'), JSON.stringify(S2.capVoice));
ok('U-SB13 GREEN innocuous capitalized sentences (no role noun / no second body) do not trigger: kettle, morning, hour, ledgers', S2.greenKettle.ok && S2.greenMorning.ok && S2.greenAn.ok && S2.greenSome.ok, JSON.stringify(S2));
ok('U-SB8 RED "I like the quiet. Someone steps in" → SOLO_BODY ("like" is a verb here, sentence away)', !S.realLike.ok, JSON.stringify(S.realLike));
const res = (t, els) => page.evaluate(([t, els]) => window._v3ResolveWordingMentions(t, els), [t, els]);
const one = ['oven door', 'steel prep table'];
const two = ['oven door', 'back door', 'steel prep table'];
const r1 = await res('shove the door wider with my elbow', one);
ok('U-CR1 "the door" with one door element → resolves to "oven door"', r1.mentions.length === 1 && r1.mentions[0].element === 'oven door' && !r1.mentions[0].ambiguous, JSON.stringify(r1));
const r2 = await res('shove the door wider with my elbow', two);
ok('U-CR2 "the door" with two door elements → AMBIGUOUS, both candidates listed', r2.mentions.length === 1 && r2.mentions[0].ambiguous && r2.mentions[0].candidates.length === 2, JSON.stringify(r2));
const r3 = await res('shove the back door wider with my elbow', two);
ok('U-CR3 "the back door" → resolves to "back door" (distinguishing word)', r3.mentions.length === 1 && r3.mentions[0].element === 'back door', JSON.stringify(r3));
const r4 = await res('shove the heavy oven door wider', two);
ok('U-CR4 "the heavy oven door" → resolves to "oven door" through an intervening adjective', r4.mentions.length === 1 && r4.mentions[0].element === 'oven door', JSON.stringify(r4));
const r5 = await res('I set my palm flat on the old weighing book', ['the weighhouse ledger', 'the customs bench']);
ok('U-CR5 a paraphrase whose head noun no element carries → resolves to NOTHING', r5.mentions.length === 0, JSON.stringify(r5));
const r6 = await res('wipe my hands on the table and lean on its door', one);
ok('U-CR6 two mentions: "the table" → prep table, "its door" → oven door (possessive determiner)', r6.mentions.length === 2 && r6.mentions.map(m => m.element).sort().join('|') === 'oven door|steel prep table', JSON.stringify(r6));
const r7 = await res('the doors bang shut', one);
ok('U-CR7 plural "the doors" resolves to the door element', r7.mentions.length === 1 && r7.mentions[0].element === 'oven door', JSON.stringify(r7));
const r8 = await res('a door somewhere bangs shut', one);
ok('U-CR8 indefinite "a door" is not a co-reference (no determiner of identity) → no mention', r8.mentions.length === 0, JSON.stringify(r8));
const pv = (el) => page.evaluate((el) => window._v3PermittedVerbs(el), el);
ok('U-CS1 FIXTURE permits PUSH and PULL, not LIFT', (await pv({ affordance: 'FIXTURE' })).includes('PUSH') && (await pv({ affordance: 'FIXTURE' })).includes('PULL') && !(await pv({ affordance: 'FIXTURE' })).includes('LIFT'), '');
ok('U-CS2 [PORTAL, FIXTURE] = union (OPEN from PORTAL, TURN from FIXTURE, no LIFT)', (await pv({ affordances: ['PORTAL', 'FIXTURE'] })).includes('OPEN') && (await pv({ affordances: ['PORTAL', 'FIXTURE'] })).includes('TURN') && !(await pv({ affordances: ['PORTAL', 'FIXTURE'] })).includes('LIFT'), '');
ok('U-CS3 AMBIENT permits nothing', (await pv({ affordance: 'AMBIENT' })).length === 0, '');
ok('U-CS4 an unknown label permits nothing (closed values only)', (await pv({ affordance: 'PUSHABLE' })).length === 0, '');
await browser.close();
const fails = results.filter(x => !x).length; console.log(`\n${results.length} checks · ${results.length - fails} passed · ${fails} failed`); process.exit(fails ? 1 : 0);
