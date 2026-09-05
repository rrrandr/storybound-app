// CONTINUATION NUMBERING PROBE — production path, all endpoints locally fulfilled.
//
// Question: after a real Scene 1, does the first continuation plan scene 2 or scene 3?
// _currentSceneNumber returns turnCount + 2, so the answer turns entirely on what Scene 1
// leaves the counter at. Two code comments say 0; three sites assign 1.
//
// Method: run the real handleBeginStory, assert Scene 1 actually completed, then drive the
// real #submitBtn continuation. Instrumented by (a) a property setter on turnCount that
// records EVERY write with its stack, and (b) the app's own console output — wrapping
// window._selectSceneAssignment does not intercept, because the call sites prefer the
// closure-local binding.
//
// Every /api/** is fulfilled locally with a structurally valid body; an unrecognised
// endpoint aborts the request AND is reported, so nothing can silently escape.
//
// usage: node _continuation_numbering_probe.mjs
import { chromium } from 'playwright-core';

const KNOWN = /\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini|image|bfl-kontext|replicate|fal|get-parent-images|save|load|vault|library|log|track|beta)/;
const fulfilled = [], unknown = [], escaped = [];
const PROSE = (() => {
  // Must exceed 1500 chars of RENDERED text AFTER [PROSE:DEDUP], which strips verbatim
  // duplicate sentences — so every sentence here is unique.
  const subj = ['Lirael','Seren','Julian','the presiding Dohkar','the assembly','the witness',
                'her mother','the ash','the shrine table','the gossamer band'];
  const verb = ['turned toward','considered','stepped past','spoke across','reached for',
                'measured','refused','remembered','counted','set down'];
  const obj  = ['the cold hearth','the relic','the north gate','the folded paper','the second bell',
                'the empty chair','the wish itself','the quiet','the open door','the long table'];
  const out = [];
  for (let i = 0; i < 44; i++) {
    out.push(`${subj[i % subj.length]} ${verb[(i * 3) % verb.length]} ${obj[(i * 7) % obj.length]}, and nothing in the hall moved for the space of ${i + 2} breaths.`);
  }
  return out.join(' ');
})();
// Structurally valid for every consumer we saw in the diagnostic: prose readers take
// .content, JSON readers parse it. A body that satisfies both is a JSON object in .content
// only when the caller asked for JSON — so we serve prose, and JSON callers fall back
// through their own repair paths, which is the production behaviour under a bad parse.
const BODY = JSON.stringify({ content: PROSE, choices: [{ message: { content: PROSE } }] });

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
await page.route('**/api/**', async route => {
  const u = route.request().url().replace(/^https?:\/\/[^/]+/, '');
  if (!KNOWN.test(u)) { unknown.push(u); return route.abort(); }
  fulfilled.push(u);
  return route.fulfill({ status: 200, contentType: 'application/json', body: BODY });
});
page.on('request', r => { if (/\/api\//.test(r.url()) && !r.url().includes('localhost')) escaped.push(r.url()); });

const logs = [];
page.on('console', m => { const t = m.text(); if (t.length < 300) logs.push(t); });

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_STORIES, { timeout: 40000 });

// ── instrument turnCount: every write, with origin ──
await page.evaluate(() => {
  const s = window.state;
  window.__tc = [];
  let v = s.turnCount || 0;
  Object.defineProperty(s, 'turnCount', {
    configurable: true,
    get() { return v; },
    set(n) {
      window.__tc.push({ from: v, to: n, at: (new Error().stack || '').split('\n')[2]?.trim().slice(0, 110) });
      v = n;
    }
  });
});

// ── Scene 1 (real entry point) ──
const s1 = await page.evaluate(async () => {
  const s = window.state;
  const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
  window._devBypass = true;
  window._forceDeckMandate = false;
  try { if (typeof window._forceMandateOff === 'function') window._forceMandateOff(); } catch (_) {}
  s.picks = s.picks || {};
  ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies']
    .forEach(k => { s.picks[k] = def[k]; });
  Object.assign(s, {
    world: def.world, worldSubtype: def.worldSubtype, flavor: def.flavor, dynamic: def.dynamic,
    _starterId: def.id, is_starter_story: true, immutableTitle: def.title,
    archetype: { primary: def.archetype, modifier: null },
    name: 'Lirael', playerName: 'Lirael', loveInterestName: 'Julian', partnerName: 'Julian',
    loveInterest: 'Male', liGender: 'male', playerMask: 'OPEN_VEIN',
    storyLength: 'fling', tier: 'fling', access: 'sub', subscribed: true, fortunes: 9999999,
    previewActive: false, _skipCorridorValidation: true, intensity: 'Steamy', pov: 'first_person',
    identity: { playerName: 'Lirael', partnerName: 'Julian' },
    _pcLookSkipped: true, pcLookLocked: true, renderMode: 'literary', currentEngine: 'literary',
    storyId: 'cont_probe'
  });
  s.picks.identity = s.identity;
  try { await Promise.race([window.handleBeginStory(), new Promise(r => setTimeout(r, 60000))]); } catch (_) {}
  const pages = window.StoryPagination.getPageCount();
  const text = (window.StoryPagination.getAllContent() || '').replace(/<[^>]*>/g, ' ');
  return {
    pages, scenes: (s.scenes || []).length, turnCount: s.turnCount,
    proseMounted: text.includes('gossamer band'),
    proseLen: text.length,
    writes: window.__tc.slice()
  };
});

console.log(`\n${'═'.repeat(84)}\nCONTINUATION NUMBERING PROBE\n${'═'.repeat(84)}`);
console.log('\n SCENE 1 COMPLETION ASSERTIONS');
console.log(`   pages mounted            : ${s1.pages}`);
console.log(`   rendered prose present   : ${s1.proseMounted} (${s1.proseLen} chars)`);
console.log(`   state.scenes length      : ${s1.scenes}`);
console.log(`   turnCount after Scene 1  : ${s1.turnCount}`);
console.log(`   writes to turnCount      : ${s1.writes.length}`);
s1.writes.forEach(w => console.log(`     ${w.from} → ${w.to}   ${w.at}`));

const scene1Ok = s1.pages >= 1 && s1.proseMounted;
if (!scene1Ok) {
  console.log('\n  ✗ Scene 1 did not complete — continuation not attempted.');
} else {
  // ── first continuation via the REAL submit button ──
  logs.length = 0;
  const before = await page.evaluate(() => window.state.turnCount);
  const clicked = await page.evaluate(async () => {
    const a = document.getElementById('actionInput') || document.querySelector('#gnActionInput, [id*="ction"][id*="nput"]');
    const d = document.getElementById('dialogueInput') || document.querySelector('#gnDialogueInput, [id*="ialogue"][id*="nput"]');
    if (a) a.value = 'I step toward the shrine table.';
    if (d) d.value = 'Tell me what the band is for.';
    const btn = document.getElementById('submitBtn');
    if (!btn) return { ok: false, why: 'no #submitBtn' };
    btn.click();
    return { ok: true, hadAction: !!a, hadDialogue: !!d };
  });
  await page.waitForTimeout(60000);
  const blocked = logs.filter(l => /SUBMIT|DECK|BLOCK|cliffhanger/i.test(l)).slice(0,6);
  const after = await page.evaluate(() => {
    const s = window.state;
    let matchedRow = null;
    try {
      const plan = (window.STARTER_PLANS || {})[s._starterId];
      const asg = s._sceneAssignment;
      if (plan && asg && asg.event) {
        const hit = (plan.scenes || []).find(p => p && p.goal && String(p.goal).slice(0, 40) === String(asg.event).slice(0, 40));
        matchedRow = hit ? hit.n : 'no-row-match';
      }
    } catch (_) {}
    return {
      turnCount: s.turnCount,
      currentSceneNumber: window._currentSceneNumber ? window._currentSceneNumber(s) : null,
      assignmentEvent: s._sceneAssignment && s._sceneAssignment.event ? String(s._sceneAssignment.event).slice(0, 60) : null,
      matchedRow,
      skeletonMetaScene: s._skeletonMeta && (s._skeletonMeta.generatedAt ?? s._skeletonMeta.scene) || null,
      writes: window.__tc.slice()
    };
  });

  console.log('\n FIRST CONTINUATION');
  console.log(`   submit clicked           : ${JSON.stringify(clicked)}`);
  console.log(`   turnCount before submit  : ${before}`);
  console.log(`   turnCount after          : ${after.turnCount}`);
  console.log(`   _currentSceneNumber()    : ${after.currentSceneNumber}`);
  console.log(`   selected assignment      : ${after.assignmentEvent || '(none)'}`);
  console.log(`   matched plan row n=      : ${after.matchedRow === null ? 'n/a' : after.matchedRow}`);
  console.log(`   skeleton meta scene      : ${after.skeletonMetaScene}`);
  console.log(`   total turnCount writes   : ${after.writes.length}`);
  after.writes.forEach(w => console.log(`     ${w.from} → ${w.to}   ${w.at}`));

  const rel = logs.filter(l => /SKELETON|SCENE-ASSIGNMENT|CHAR-LEDGER @scene|scene \d/.test(l)).slice(0, 12);
  console.log('\n   submit-gate log lines:');
  blocked.forEach(l => console.log('     ' + l.slice(0,120)));
  console.log('\n   app log lines naming a scene number:');
  rel.forEach(l => console.log('     ' + l.slice(0, 130)));

  console.log('\n VERDICT');
  if (after.matchedRow === 2) console.log('   ✓ first continuation planned SCENE 2 — numbering correct');
  else if (after.matchedRow === 3) console.log('   ✗ OFF BY ONE — first continuation planned SCENE 3');
  else console.log(`   ? inconclusive — matchedRow=${after.matchedRow}, assignment=${after.assignmentEvent}`);
}

await browser.close();
console.log(`\n NETWORK — ${fulfilled.length} fulfilled locally, ${unknown.length} unknown (aborted), ${escaped.length} escaped.`);
if (unknown.length) console.log('   unknown: ' + [...new Set(unknown)].slice(0, 8).join(', '));
console.log('');
