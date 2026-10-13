// ── WISH-SLINGING + MAD JESSI LORE CONTROL (provider-free, $0) ───────────────────────────────
// Two questions, and the second matters more than the first:
//   1. Do the new directives FIRE where education / tactics / a contest is in play, and stay
//      SILENT otherwise? (A control that never goes red proves nothing, so the negative cases
//      are the point: an ordinary breakfast scene must pay zero tokens for tournament lore.)
//   2. Does MAD JESSI'S PRIVATE TRUTH stay out of every emission that was not explicitly asked
//      for tier 'planning'? He is alive; the world believes Fate erased him. If the author path
//      can see that, the reveal is already spent.
// Plus: the content must agree with the shipped wish laws it claims to obey, so the assertions
// below check the canon-reconciliation lines, not just that a block appeared.
import { chromium } from 'playwright-core';
import fs from 'fs';
import http from 'node:http';
import path from 'node:path';

const PUB = path.resolve('public');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
               '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
               '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp3': 'audio/mpeg',
               '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const statics = http.createServer((req, res) => {
  let p = decodeURIComponent(String(req.url || '/').split('?')[0]);
  if (p === '/' || p === '') p = '/index.html';
  const full = path.join(PUB, p);
  if (!full.startsWith(PUB) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
    res.statusCode = 404; return res.end('not found');
  }
  res.setHeader('content-type', MIME[path.extname(full).toLowerCase()] || 'application/octet-stream');
  res.end(fs.readFileSync(full));
});
await new Promise(r => statics.listen(0, '127.0.0.1', r));
const ORIGIN = 'http://127.0.0.1:' + statics.address().port;

let pass = 0, fail = 0;
const t = (label, ok, detail) => {
  if (ok) { pass++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label + (detail ? '\n         — ' + String(detail).slice(0, 400) : '')); }
};
const section = (n) => console.log('\n' + n);

console.log('=== WISH-SLINGING + MAD JESSI LORE CONTROL (provider-free, $0) ===');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
await page.goto(ORIGIN + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._buildFatelandsWishSlingingDirective === 'function'
  && typeof window._buildMadJessiDirective === 'function'
  && typeof window._buildWishcraftPlanningCheck === 'function', { timeout: 30000 });

const sling = (txt, opts) => page.evaluate(([t, o]) => window._buildFatelandsWishSlingingDirective(t, o) || '', [txt, opts || null]);
const jessi = (txt, opts) => page.evaluate(([t, o]) => window._buildMadJessiDirective(t, o) || '', [txt, opts || null]);

// ═══ 1. THE GATE MUST BITE BOTH WAYS ═════════════════════════════════════════════════════════
section('1. GATING — fires on education / tactics / contest, silent otherwise');
const FIRES = [
  ['a tournament registration', 'The tournament list was posted at dawn.'],
  ['a student being taught', 'Her student recited the formula back to her.'],
  ['a duel', 'He had never lost a duel.'],
  ['a repertoire', 'She kept a notebook of revised wordings.'],
  ['an emergency formula', 'Every child learns the emergency rhymes.'],
  ['the Institute', 'He had studied at Lytharyn.'],
];
for (const [label, txt] of FIRES) {
  const out = await sling(txt);
  t('FIRES on ' + label, out.length > 2000, 'len=' + out.length);
}
const SILENT = [
  ['an ordinary breakfast', 'She ate bread standing at the window and watched the rain.'],
  ['a quiet walk', 'The road curved north between two hedges and nobody spoke.'],
  ['grief with no craft in it', 'He sat with his hands open and did not look up when she came in.'],
];
for (const [label, txt] of SILENT) {
  const out = await sling(txt);
  t('*** SILENT on ' + label + ' (pays zero tokens)', out === '', 'len=' + out.length);
}

// ═══ 2. CONTENT AGREES WITH THE SHIPPED WISH LAWS ════════════════════════════════════════════
section('2. CANON RECONCILIATION inside the slinging block');
const full = await sling('', { force: true });
fs.writeFileSync('_audit_out/lore_wish_slinging.txt', full);
const has = (s) => full.includes(s);
t('rhyme is stated to grant NO magical bonus', has('GRANTS NO MAGICAL BONUS') && has('not a safety rating'));
t('the four repertoire tiers are all present',
  has('CHILDREN') && has('MOST ADULTS') && has('A BEGINNING STUDENT') && has('EXPERT SLINGERS'));
t('all six formulas are present', ['Warm my kettle', 'Steady feet upon this stair',
  'Let this little ember die', 'Let this shallow bleeding cease', 'Bring my missing key to sight',
  'Let my cry find someone near'].every(has));
t('formula 4 carries its own scope limit (not a mortal-wound treatment)',
  has('It says SHALLOW') && has('not a treatment for a mortal wound'));
t('formula 5 is explained as asking to SEE, not to RECEIVE (no-object-from-nothing)',
  has('asks to SEE, not to RECEIVE') && has('conjures and carries nothing'));
t('formula 6 cannot manufacture willingness (events, never consent)',
  has('never arrange that they CHOOSE TO HELP') && has('never says WHO'));
t('small prices are still real (conservation satisfied, not dodged)',
  has('GONE FROM THE GIVER'));
t('the First Favored register is memory/emotion, not hair',
  has('FIRST FAVORED INSTRUCTION RUNS ON MEMORY AND EMOTION'));
t("Roman's \"ward my health\" is assessed as unbounded, not endorsed",
  has('WARD MY HEALTH') && has('Both halves are unbounded'));
t("Roman's \"skill to win\" is assessed as WRONG IN LAW (circumstances-not-minds)",
  has('WRONG IN LAW') && has('FATE DOES NOT INSTALL SKILL')
  && has('start of an adventure and never a shortcut'));
t('the rescue formula\'s bracket is flagged as NOT literal spoken text',
  has('never words containing a literal placeholder') && has('THE BLANK IS THE SAFETY'));
t('tournaments do not pool sacrifices and are not free or reversible',
  has('teams do NOT pool sacrifices') && has('not free, not reversible and not harmless'));
t('and no visible wish-duels survive in the sporting context',
  has('no beams, no clash'));

// ═══ 3. MAD JESSI — THE TIER BOUNDARY ════════════════════════════════════════════════════════
section('3. MAD JESSI: public legend vs private truth');
const PRIVATE_MARKERS = ['JESSI DID NOT CEASE TO EXIST', 'HE IS ALIVE IN THE FATELANDS',
  'used it to cover a deliberate departure', 'HIS ANONYMITY IS CRAFT'];
const pub = await jessi('', { force: true });
const plan = await jessi('', { force: true, tier: 'planning' });
fs.writeFileSync('_audit_out/lore_mad_jessi_public.txt', pub);
fs.writeFileSync('_audit_out/lore_mad_jessi_planning.txt', plan);
t('the public legend is emitted', pub.length > 1500, 'len=' + pub.length);
t('*** BOUNDARY: NO private marker appears without tier "planning"',
  PRIVATE_MARKERS.every(m => !pub.includes(m)),
  PRIVATE_MARKERS.filter(m => pub.includes(m)).join(' | '));
t('the planning tier adds EVERY private marker', PRIVATE_MARKERS.every(m => plan.includes(m)));
t('the planning tier is strictly longer than the public one', plan.length > pub.length);
// Tier typos must fail CLOSED. 'plan', 'Planning', true — none of these may unlock the truth.
for (const bad of [{ tier: 'plan' }, { tier: 'Planning' }, { tier: true }, { tier: 'spine' }]) {
  const out = await jessi('', Object.assign({ force: true }, bad));
  t('*** FAIL-CLOSED on tier=' + JSON.stringify(bad.tier),
    PRIVATE_MARKERS.every(m => !out.includes(m)));
}
t('the legend is labelled BELIEF, not authoritative narration',
  pub.includes('this is BELIEF, not authoritative narration'));
t('the conflicting accounts are not to become separate atrocities',
  pub.includes('DO NOT turn each version into a separate historical atrocity')
  && pub.includes('the real sacrifice is NOT ESTABLISHED'));
t('benevolent wording is blocked as an assassination loophole',
  pub.includes('NOT an assassination loophole')
  && pub.includes('NEVER OVERRIDES A WILL'));
t('Jessi is blocked from being a solution to a protagonist\'s problem',
  pub.includes('Do not write Jessi as omnipotent'));
t('and the planning tier requires accounting for earlier search attempts',
  plan.includes('must account for the earlier attempts'));
t('Jessi fires on his own name', (await jessi('They still talked about Mad Jessi.')).length > 1500);
t('Jessi fires on his title', (await jessi('He wanted to face the undefeated.')).length > 1500);
t('Jessi fires on the institution that owns his story',
  (await jessi('She had trained at Lytharyn for six years.')).length > 1500);
// NEGATIVE CASES FOR THE NARROWED GATE. Each of these words was a trigger in the first draft, and
// each appears constantly in scenes that have nothing to do with him. A famous name injected into
// an unrelated scene is worse than a wasted token: the author will eventually use it.
for (const [label, txt] of [
  ['an ordinary scene', 'She set the bread down and opened the shutters.'],
  ['someone vanishing into a crowd', 'He disappeared into the crowd before she could follow.'],
  ['an ordinary retirement', 'Her father had retired to the coast years ago.'],
  ['the word "legend" used loosely', 'It was a local legend about a drowned bell.'],
  ['a superlative', 'It was the greatest harvest anyone remembered.'],
  ['an unrelated vanishing', 'The path simply vanished under the leaves.'],
]) {
  t('*** SILENT on ' + label, (await jessi(txt)) === '', 'leaked on: ' + txt);
}

// ═══ 4. THE PLANNING CHECK ═══════════════════════════════════════════════════════════════════
section('4. "WHY NOT JUST WISH IT SOLVED?" planning check');
const chk = await page.evaluate(() => window._buildWishcraftPlanningCheck() || '');
fs.writeFileSync('_audit_out/lore_planning_check.txt', chk);
t('the planning check is emitted', chk.length > 1200, 'len=' + chk.length);
t('it names all seven legitimate sources of difficulty',
  ['COST', 'CULTURAL PRACTICE', 'TRAINING', 'RISK', 'MISALIGNMENT', 'CONFLICTING WISHES',
   'INCOMPLETE KNOWLEDGE'].every(k => chk.includes(k)));
t('it forbids a blanket prohibition as an answer',
  /"Wishing cannot do that" is not an answer unless a law actually says so/.test(chk));
t('it requires accounting for the formulas ordinary people know',
  chk.includes('ACCOUNT FOR THE FORMULAS ORDINARY PEOPLE ACTUALLY KNOW')
  && chk.includes('IGNORING AN AVAILABLE REMEDY IS A PLOT HOLE UNLESS THE SCENE EXPLAINS IT'));
t('it keeps routine wishes routine', chk.includes('ROUTINE WISHES STAY ROUTINE'));
t('and it states the self-defeating shape of complex wishes',
  chk.includes('DEFEAT THE SHORTCUT’S OWN PURPOSE') || chk.includes("DEFEAT THE SHORTCUT'S OWN PURPOSE"));

// ═══ 5. THE SPINE ACTUALLY RECEIVES THEM ═════════════════════════════════════════════════════
section('5. DELIVERY: the spine request carries the planning check and Jessi\'s private truth');
const calls = [];
await page.route('**/api/**', async (route) => {
  let body = {}; try { body = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
  const joined = (body.messages || []).map(m => String(m.content || '')).join('\n');
  calls.push({ url: route.request().url(), role: body.role, joined, bytes: joined.length });
  return route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ model: 'constructed', choices: [{ message: { content: '{}' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 1, completion_tokens: 1, cost_in_usd_ticks: 0 } }) });
});
await page.evaluate(() => {
  const s = window.state;
  s.picks = s.picks || {}; s.picks.world = 'Fantasy';
  s._starterId = 'starter_first_sacrifice'; s.playerName = 'Lirael'; s.loveInterestName = 'Julian';
  s.storyLength = 'fling'; s.fantasyRegion = 'the_veilwood'; s.cgScaffold = null;
  s.currentCrisis = 'a wish-duel at the Lytharyn tournament and the legend of Mad Jessi';
});
await page.evaluate(() => window.__buildCGScaffold(window.state, {}));
const spineReq = calls.filter(c => /CONTINUITY ARCHITECT/i.test(c.joined)).pop();
t('a spine request was sent', !!spineReq);
if (spineReq) {
  fs.writeFileSync('_audit_out/lore_spine_request.txt', spineReq.joined);
  t('the spine request carries the "why not wish it solved" check',
    spineReq.joined.includes('WHY CAN NOBODY SIMPLY WISH IT SOLVED'));
  t('the spine request carries the ordinary-formulas requirement',
    spineReq.joined.includes('ACCOUNT FOR THE FORMULAS ORDINARY PEOPLE ACTUALLY KNOW'));
  t('*** the spine request carries Jessi\'s PRIVATE TRUTH (it is the only stage that may)',
    PRIVATE_MARKERS.every(m => spineReq.joined.includes(m)));
}
// NEGATIVE: a non-Fantasy story must receive neither.
await page.evaluate(() => { window.state.picks.world = 'Contemporary'; window.state.cgScaffold = null; });
calls.length = 0;
await page.evaluate(() => window.__buildCGScaffold(window.state, {}));
const modernReq = calls.filter(c => /CONTINUITY ARCHITECT/i.test(c.joined)).pop();
t('*** CONTROL: a non-Fantasy spine receives NEITHER the check NOR Jessi',
  !!modernReq && !modernReq.joined.includes('WHY CAN NOBODY SIMPLY WISH IT SOLVED')
  && PRIVATE_MARKERS.every(m => !modernReq.joined.includes(m)));

console.log('\n── wrote _audit_out/lore_*.txt');
console.log('\n=== ' + pass + ' passed, ' + fail + ' failed ===');
await browser.close();
await new Promise(r => statics.close(r));
process.exit(fail ? 1 : 0);
