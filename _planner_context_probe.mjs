// _planner_context_probe.mjs — FREE planner-only sufficiency probe.
// Keeps the corrected authored-spine routing. Adds ONLY (a) the real named scene cast and
// (b) three ALREADY-AUTHORED worldTruths, verbatim, to the scene-planner's user message.
// No causation rule, no style instruction, no schema change, no prose Author call.
// The injection is HARNESS-SIDE (request body rewritten in flight) so nothing ships to prod.
// QUESTION: does correct milestone + real cast + minimal canon produce a good scene event
// with no further planner instruction?
import { chromium } from 'playwright-core';
import fs from 'fs';
const log = (...a) => console.error(...a);

const OUTDIR = '_validate_out/plannerctx';
fs.mkdirSync(OUTDIR, { recursive: true });
fs.writeFileSync(OUTDIR + '/.writetest', 'ok'); fs.unlinkSync(OUTDIR + '/.writetest');
log('[preflight] output dir writable: ' + OUTDIR);

// ── the injected context (hand-selected for THIS scene; verbatim from STARTER_SEEDS) ──
const CAST = `\nSCENE CAST — the named people physically available in this scene (use THESE; do not invent additional people):
  • Lirael (PC) — a young First Favored apprentice. Today is her first time SUPERVISING another person's First Sacrifice: responsible for the rite being conducted correctly, NOT for the wish itself. Brilliant but untested; terrified of failing publicly.
  • The youth — a First Favored GIRL, sixteen, making her own First Sacrifice. Earnest, frightened, emotionally overwhelmed.
  • Julian — an older First Favored: calm, quietly respected. Already knows something about Lirael's lineage. Present at the rite ONLY as an observer.
  • The watching public — the rite is held publicly; families and onlookers are present but unnamed.`;

const TRUTHS = `\nRELEVANT WORLD FACTS (canon — already true; do not contradict or re-invent):
  • A First Sacrifice is a COMING-OF-AGE RITE — closest analogue a Bar Mitzvah / quinceanera / confirmation / graduation, NOT a death ritual and NOT a wedding. At 16 a youth, after long study, publicly makes their first wish and offers its price to Fate. When it goes well it ENDS IN CELEBRATION; catastrophe is UNUSUAL.
  • The supervisor is a SACRIFICIANT (the role); Lirael is an apprentice Sacrificiant. Because a supervisor bolstering the youth's sacrifice with a wish of their OWN would be a ruinous breach, every Sacrificiant is ceremonially SEALED for the rite — a gossamer band drawn across the mouth and tied behind the head — so they cannot cleanly voice a wish while officiating. A sealed Sacrificiant's speech is MUFFLED behind the cloth.
  • The rite is PUBLIC partly because anyone present who wishes the youth ILL can twist the outcome — which is exactly what the supervising First Favored guards against.`;

const isAuthor = (sys, usr, model) => /STORYBOUND ARCHITECTURE LAWS/.test(sys) || /grok-4\.3/.test(String(model || ''));
const isScenePlanner = sys => /You are the SCENE-?SPINE planner|You are the SCENE planner for an interactive story engine/.test(sys);
const STUB = 'The stall smelled of wet rope and cold iron. She said my name once. I did not say hers.';

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
for (const p of ['**/api/image', '**/api/bfl-kontext', '**/api/get-parent-images', '**/api/replicate**', '**/api/fal**'])
  await page.route(p, r => r.fulfill({ status: 500, contentType: 'application/json', body: '{}' }));

const planner = [];
await page.route('**/api/**', async route => {
  const r = route.request(); if (r.method() !== 'POST') return route.continue();
  let b = null; try { b = JSON.parse(r.postData() || '{}'); } catch (_) { return route.continue(); }
  const msgs = b.messages || [];
  const sysMsg = msgs.find(m => m.role === 'system'), usrMsg = msgs.find(m => m.role === 'user');
  const sys = String((sysMsg || {}).content || ''), usr = String((usrMsg || {}).content || '');
  if (isAuthor(sys, usr, b.model || b.preferredModel))
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: STUB }) });
  if (isScenePlanner(sys) && usrMsg) {
    const before = usr;
    usrMsg.content = usr + '\n' + CAST + '\n' + TRUTHS;   // ← the ONLY variable
    const resp = await route.fetch({ timeout: 0, postData: JSON.stringify(b) });
    const body = await resp.text();
    let out = null;
    try { const j = JSON.parse(body); out = j.content || (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || null; } catch (_) {}
    planner.push({ before, injected: usrMsg.content, out });
    fs.writeFileSync(`${OUTDIR}/planner_${planner.length}.json`, JSON.stringify(planner[planner.length - 1], null, 2));
    log(`  [planner ${planner.length}] usr ${before.length} → ${usrMsg.content.length} chars`);
    return route.fulfill({ response: resp, body });
  }
  return route.continue();
});

let loaded = false;
for (let a = 1; a <= 3 && !loaded; a++) {
  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => window.state && window.StoryPagination && window.STARTER_STORIES, { timeout: 90000 });
    loaded = true;
  } catch (e) { log('  load attempt ' + a + ' failed: ' + e.message.slice(0, 60)); }
}
if (!loaded) { await browser.close(); throw new Error('page never loaded'); }
await page.waitForTimeout(600);

await page.evaluate(() => {
  const s = window.state;
  window._devBypass = true; s.picks = s.picks || {};
  const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
  ['world', 'worldSubtype', 'pressure', 'flavor', 'tone', 'pov', 'length', 'dynamic', 'pcSpecies', 'liSpecies'].forEach(k => s.picks[k] = def[k]);
  s.world = def.world; s.worldSubtype = def.worldSubtype; s.flavor = def.flavor; s.dynamic = def.dynamic;
  s._starterId = def.id; s.is_starter_story = true; s.immutableTitle = def.title;
  s.archetype = { primary: def.archetype, modifier: null };
  s.name = 'Lirael'; s.playerName = 'Lirael'; s.loveInterestName = 'Julian'; s.partnerName = 'Julian';
  s.loveInterest = 'Male'; s.liGender = 'male'; s.playerMask = 'OPEN_VEIN';
  s.storyLength = 'fling'; s.tier = 'fling'; s.access = 'sub'; s.subscribed = true; s.fortunes = 9999999;
  s.previewActive = false; s._skipCorridorValidation = true; s.intensity = 'Steamy'; s.pov = 'first_person';
  s.identity = { playerName: 'Lirael', partnerName: 'Julian' }; s.picks.identity = s.identity;
  s._pcLookSkipped = true; s.pcLookLocked = true; s.renderMode = 'literary'; s.currentEngine = 'literary';
  if (typeof window.scheduleSpeculativePreload === 'function') window.scheduleSpeculativePreload = function () {};
});

log('[probe] begin story…');
await page.evaluate(() => window.handleBeginStory());
for (let w = 0; w < 480000; w += 3000) { await page.waitForTimeout(3000); if (planner.length) break; }
await page.waitForTimeout(8000);
await page.evaluate(() => {
  const s = window.state;
  s._cliffhangerContinueAuthorized = true; s._isAdvancingScene = false;
  s._petitionEmergenceFired = true; s._deckExamineFired = true;
});
const n0 = planner.length;
await page.evaluate(() => {
  document.getElementById('actionInput').value = 'I try to explain what happened.';
  document.getElementById('dialogueInput').value = '';
  const b = document.getElementById('submitBtn'); b.disabled = false; b.click();
});
for (let w = 0; w < 480000; w += 3000) { await page.waitForTimeout(3000); if (planner.length > n0) break; }
await page.waitForTimeout(4000);
await browser.close();

if (!planner.length) { console.log('❌ PLANNER NEVER RAN'); process.exit(2); }
const P = planner[planner.length - 1];
console.log('\n════ PLANNER SUFFICIENCY PROBE — cast + minimal canon ════');
console.log('  authored goal in input: ' + (P.injected.includes('The ceremony collapses into accusations') ? '✅' : '❌'));
console.log('  cast supplied:          ' + (P.injected.includes('SCENE CAST') ? '✅ Lirael / the youth / Julian / public' : '❌'));
console.log('  canon supplied:         ' + (P.injected.includes('COMING-OF-AGE RITE') ? '✅ rite-definition + Sacrificiant seal + public-interference' : '❌'));

console.log('\n──── SELECTED EVENT ────');
let o = null;
try { o = JSON.parse(String(P.out).replace(/```json?/gi, '').replace(/```/g, '').trim()); } catch (_) {}
if (o) for (const k of Object.keys(o)) console.log('  ' + k + ' = ' + JSON.stringify(o[k]).slice(0, 260));
else console.log(String(P.out).slice(0, 1000));

console.log('\n──── CANON / INVENTION CHECK ────');
const txt = JSON.stringify(o || P.out);
const bad = [['wedding framing ("couple"/"bride"/"groom"/"guests")', /\bcouple\b|\bbride\b|\bgroom\b|\bguests?\b/i],
             ['unnamed generic agent ("a guest"/"someone"/"a figure"/"a voice")', /\ba (?:guest|figure|voice|stranger|man|woman)\b|\bsomeone\b/i],
             ['visible magic (canon says a wish shows NO sign)', /glow|light|sigil|shimmer|surge|blaze|rune/i],
             ['non-canon institution/person', /council|elder|warden|priest|magistrate|court/i]];
for (const [n, re] of bad) console.log('  ' + (re.test(txt) ? '⚠ PRESENT' : '✅ clean  ') + '   ' + n);
const good = [['names a real cast member', /Lirael|Julian|youth|girl/i],
              ['agent-driven (a person acts)', /\b(accus|shout|step|stand|seize|strike|tear|point|name|denounc|grab|pull|block)/i]];
for (const [n, re] of good) console.log('  ' + (re.test(txt) ? '✅ yes' : '❌ no ') + '      ' + n);
console.log('\nfull record → ' + OUTDIR + '/planner_' + planner.length + '.json');
