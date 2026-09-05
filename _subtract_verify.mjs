// _subtract_verify.mjs — FREE delivery proof for the 3-arm subtraction experiment.
// Captures the REAL continuation author payload for arms A/B/C and asserts each of the six
// subtracted clauses is present/absent as designed. Author is STUBBED — no Grok prose bought.
// Per-arm payload is written the moment it is captured (persistence lesson from _arms4).
import { chromium } from 'playwright-core';
import fs from 'fs';
const log = (...a) => console.error(...a);
const prior = JSON.parse(fs.readFileSync('/tmp/arm_gen.json', 'utf8')).scenes;
const isAuthor = (sys, usr, model) => /STORYBOUND ARCHITECTURE LAWS/.test(sys) || /grok-4\.3/.test(String(model || ''));

const ARMS = [
  { id: 'A', sub: false, ex: false, label: 'control' },
  { id: 'B', sub: true,  ex: false, label: 'subtraction' },
  { id: 'C', sub: true,  ex: true,  label: 'subtraction + exemplars' },
];

// The six clauses, by a verbatim fragment. want=1 present in control, 0 after subtraction.
const CLAUSES = [
  ['#1  embodied-response mandate',  'ONE embodied response in HER, in a SPECIFIC PLACE'],
  ['#1b body-response rewrite test', 'it is power-coded — rewrite'],
  ['#2  wanting:appreciating ratio', 'WANTING beats must equal or outnumber APPRECIATING'],
  ['#3  every-line desire-coding',   'EVERY line MUST be DESIRE-CODED'],
  ['#4  emotional barometer',        'THE EMOTIONAL BAROMETER'],
  ['#5  3:1 breath-paragraph ratio', 'SILENCE BUDGET'],
  ['#6  unconditional LI override',  'RELATIONAL A-PLOT GRAVITY (HARD — UNCONDITIONAL'],
];
const NARROWED = 'RELATIONSHIP PRESENCE, NOT RELATIONSHIP OVERRIDE';
const EXEMPLARS = 'WHAT GOOD LOOKS LIKE — PROSE EXEMPLARS';

fs.mkdirSync('_validate_out/subverify', { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

for (const arm of ARMS) {
  let cont = null;
  try {
    const page = await (await browser.newContext()).newPage();
    for (const p of ['**/api/image', '**/api/bfl-kontext', '**/api/get-parent-images', '**/api/replicate**', '**/api/fal**'])
      await page.route(p, r => r.fulfill({ status: 500, contentType: 'application/json', body: '{}' }));
    let payloads = [];
    await page.route('**/api/**', async route => {
      const r = route.request(); if (r.method() !== 'POST') return route.continue();
      let b = null; try { b = JSON.parse(r.postData() || '{}'); } catch (_) { return route.continue(); }
      const msgs = b.messages || [];
      const sys = String((msgs.find(m => m.role === 'system') || {}).content || '');
      const usr = String((msgs.find(m => m.role === 'user') || {}).content || '');
      if (isAuthor(sys, usr, b.model || b.preferredModel)) {
        payloads.push({ sys, usr });
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: '[stubbed]' }) });
      }
      return route.continue();
    });

    let ok = false;
    for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
      try {
        await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForFunction(() => window.state && window.StoryPagination && window.STARTER_STORIES, { timeout: 90000 });
        ok = true;
      } catch (e) { log(`  [${arm.id}] load attempt ${attempt} failed: ${e.message.slice(0, 60)}`); }
    }
    if (!ok) throw new Error('page never loaded');
    await page.waitForTimeout(600);

    await page.evaluate((cfg) => {
      const s = window.state;
      window._armSubtract = cfg.sub; window._armExemplars = cfg.ex;
      window._armA50 = false; window._armStaging = false;
      window._auditSceneEmotionalGravity = () => Promise.resolve(null);
      ['_auditBannedPhraseLeakage', '_classifyArchetypeManifestation', '_auditArchetypeManifestation', '_classifyLITexture',
       '_auditLITextureSources', '_auditSceneAgainstRPlot', '_auditUnavailabilityManifestation'].forEach(f => { try { window[f] = () => Promise.resolve(null); } catch (_) {} });
      window._devBypass = true; s.picks = s.picks || {};
      const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
      ['world', 'worldSubtype', 'pressure', 'flavor', 'tone', 'pov', 'length', 'dynamic', 'pcSpecies', 'liSpecies'].forEach(k => s.picks[k] = def[k]);
      s.world = def.world; s.worldSubtype = def.worldSubtype; s.flavor = def.flavor; s.dynamic = def.dynamic;
      s._starterId = def.id; s.is_starter_story = true; s.immutableTitle = def.title;
      s.archetype = { primary: def.archetype, modifier: null }; s.loveInterestName = 'Julian'; s.name = 'Lirael';
      s.playerName = 'Lirael'; s.partnerName = 'Julian';
      s.loveInterest = 'Male'; s.liGender = 'male'; s.playerMask = 'OPEN_VEIN';
      s.storyLength = 'fling'; s.tier = 'fling'; s.access = 'sub'; s.subscribed = true; s.fortunes = 9999999;
      s.previewActive = false; s._skipCorridorValidation = true; s.intensity = 'Steamy'; s.pov = 'first_person';
      s.identity = { playerName: s.playerName, partnerName: s.partnerName }; s.picks.identity = s.identity;
      s._pcLookSkipped = true; s.pcLookLocked = true; s.renderMode = 'literary'; s.currentEngine = 'literary';
    }, { sub: arm.sub, ex: arm.ex });

    log(`[${arm.id}] ${arm.label} — initializing (author stubbed)…`);
    await page.evaluate(() => window.handleBeginStory());
    for (let w = 0; w < 420000 && !payloads.length; w += 3000) await page.waitForTimeout(3000);

    payloads = [];
    await page.evaluate((cfg) => {
      const s = window.state; const SP = window.StoryPagination; try { SP.clear(); } catch (_) {}
      SP.addPage('<p>' + cfg.a.replace(/\n+/g, '</p><p>') + '</p>', true);
      SP.addPage('<p>' + cfg.b.replace(/\n+/g, '</p><p>') + '</p>', true);
      s._sceneTextRing = [{ text: cfg.a }, { text: cfg.b }]; s._priorSceneText = cfg.b;
      s.turnCount = 7; s._cliffhangerContinueAuthorized = true;
      s._petitionEmergenceFired = true; s._deckExamineFired = true; s._isAdvancingScene = false;
    }, { a: prior[5].text, b: prior[6].text });
    await page.evaluate(() => {
      document.getElementById('actionInput').value = 'I go to the market stall to pass the note.';
      document.getElementById('dialogueInput').value = '';
      const b = document.getElementById('submitBtn'); b.disabled = false; b.click();
    });
    for (let w = 0; w < 420000 && !payloads.length; w += 3000) await page.waitForTimeout(3000);
    cont = payloads[0] || null;
    if (cont) fs.writeFileSync(`_validate_out/subverify/payload_${arm.id}.txt`, cont.sys + '\n\n=====USER=====\n\n' + cont.usr);
    await page.close();
  } catch (e) { log(`  [${arm.id}] ERROR ${e.message.slice(0, 100)}`); }
  results.push({ arm, cont });
}
await browser.close();

console.log('\n════ SUBTRACTION DELIVERY PROOF ════');
let pass = true;
for (const { arm, cont } of results) {
  console.log(`\n──── arm ${arm.id} (${arm.label})  sub=${arm.sub} ex=${arm.ex}`);
  if (!cont) { console.log('   ❌ NO PAYLOAD CAPTURED — arm not verified'); pass = false; continue; }
  const hay = cont.sys + '\n' + cont.usr;
  console.log(`   payload sys=${cont.sys.length} usr=${cont.usr.length}`);
  for (const [name, frag] of CLAUSES) {
    const got = hay.includes(frag) ? 1 : 0;
    const want = arm.sub ? 0 : 1;
    if (got !== want) pass = false;
    console.log(`   ${got === want ? '✅' : '❌'}  ${want ? 'present' : 'absent '}  ${name}`);
  }
  const nar = hay.includes(NARROWED) ? 1 : 0, wantNar = arm.sub ? 1 : 0;
  if (nar !== wantNar) pass = false;
  console.log(`   ${nar === wantNar ? '✅' : '❌'}  ${wantNar ? 'present' : 'absent '}  narrowed #6 replacement`);
  const ex = hay.includes(EXEMPLARS) ? 1 : 0, wantEx = arm.ex ? 1 : 0;
  if (ex !== wantEx) pass = false;
  console.log(`   ${ex === wantEx ? '✅' : '❌'}  ${wantEx ? 'present' : 'absent '}  A/50 exemplars`);
}
const sizes = results.filter(r => r.cont).map(r => `${r.arm.id}=${r.cont.sys.length}`).join('  ');
console.log(`\n  payload sizes: ${sizes}`);
console.log('  ' + (pass ? '✅ ALL ARMS DELIVER AS DESIGNED' : '❌ DELIVERY FAILED — do not generate'));
process.exitCode = pass ? 0 : 2;
