// ══════════════════════════════════════════════════════════════════════════════════════════
//  SCENE-1 PROMPT FINGERPRINT
//
//  The acceptance control for every refactor that touches the Scene-1 planning path: the
//  dispatched planner prompt must come out byte-identical. It runs the real chain with every
//  provider blocked, captures the planner request at the wire, and hashes it.
//
//  THE DETERMINISM CONTROL COMES FIRST. A fingerprint that changes on its own proves nothing
//  when it changes after an edit, so this records TWO runs of the same build and reports
//  whether they agree before any comparison against a baseline is worth making. Volatile
//  segments (ids, timestamps) are reported by name rather than silently normalised away —
//  a normaliser that hides a real difference is the failure this control exists to prevent.
//
//  usage:  node _scene1_prompt_fingerprint.mjs record <label>
//          node _scene1_prompt_fingerprint.mjs compare <baseline-label> <new-label>
// ══════════════════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core';
import fs from 'fs';
import crypto from 'crypto';
import { configBody, installSession, isAuthOrigin } from './_test_session_env.mjs';

const DIR = '_prompt_fingerprints';
fs.mkdirSync(DIR, { recursive: true });
const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await installSession(page);
  // ── PINNED VARIATION, NAMED OUT LOUD ──
  // The Scene-1 prompt is deliberately NOT deterministic, and it is worth being precise about
  // why, because a byte-identical claim is unmeasurable until this is held:
  //   · _pickCrisisCategory rotates the crisis taxonomy on a localStorage cursor that starts at
  //     Math.random() whenever the cursor is absent — which it is in every fresh context;
  //   · _rollLiDeferIntent decides LI-ARRIVAL = DEFERRED / FROM_START on a weighted Math.random(),
  //     and that flips whole blocks of the prompt, in both the system and user messages.
  // Both are anti-calcification variation doing its job. So the harness seeds a deterministic
  // PRNG and pins the cursor: the variation is held CONSTANT rather than removed, both runs take
  // the same branches, and any difference the refactor introduces still shows as a difference.
  // Nothing is normalised after capture — the bytes are compared exactly as they were sent.
  await page.addInitScript(() => {
    try { window.localStorage.setItem('sb_crisis_cat_cursor', '0'); } catch (_) {}
    try {
      var seed = 0x9e3779b9;                        // fixed; any constant would do
      Math.random = function () {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    } catch (_) {}
  });
  let planner = null;
  const blocked = [];
  await page.route('**/*', async route => {
    const url = route.request().url();
    const path = url.replace(/^https?:\/\/[^/]+/, '');
    if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (!/\/api\//.test(path)) return route.continue();
    if (/\/api\/config\b/.test(path)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
    const stub = { '/api/consume-fortune': { success: true, fortunesRemaining: 9999 },
                   '/api/verify-subscription': { success: true, subscribed: true, tier: 'sub' },
                   '/api/claim-issue-number': { success: true, issueNumber: 1 },
                   '/api/geo': {}, '/api/beta-events': {}, '/api/stories': { success: true, stories: [] } };
    const k = Object.keys(stub).find(x => path.startsWith(x));
    if (k) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(stub[k]) });
    let body = null; try { body = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
    const msgs = (body && body.messages) || [];
    const sys = String((msgs.find(m => m.role === 'system') || {}).content || '');
    const usr = String((msgs.find(m => m.role === 'user') || {}).content || '');
    if (/scene-structure planner for the OPENING scene/.test(sys) && !planner) {
      planner = { sys, usr, model: body && body.model, max_tokens: body && body.max_tokens };
    }
    blocked.push(path);
    return route.abort();                     // NOTHING may reach a provider
  });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_STORIES, { timeout: 60000 });
  await page.evaluate(async () => {
    const s = window.state;
    const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
    s.picks = s.picks || {};
    ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies']
      .forEach(k => { s.picks[k] = def[k]; });
    Object.assign(s, { world: def.world, worldSubtype: def.worldSubtype, flavor: def.flavor, dynamic: def.dynamic,
      _starterId: def.id, is_starter_story: true, immutableTitle: def.title,
      archetype: { primary: def.archetype, modifier: null },
      name: 'Lirael', playerName: 'Lirael', loveInterestName: 'Julian', partnerName: 'Julian',
      loveInterest: 'Male', liGender: 'male', playerMask: 'OPEN_VEIN',
      storyLength: 'fling', tier: 'fling', intensity: 'Steamy', pov: 'first_person',
      identity: { playerName: 'Lirael', partnerName: 'Julian' },
      renderMode: 'literary', currentEngine: 'literary',
      // A FIXED storyId: the prompt must be compared against itself, and a per-run id would
      // make every fingerprint differ for a reason that has nothing to do with the code.
      storyId: 'fingerprint-fixed', myUid: 'fingerprint',
      access: 'sub', subscribed: true, fortunes: 9999999 });
    s.picks.identity = s.identity;
    s._skipCorridorValidation = true;
    window.__run = window.handleBeginStory().catch(() => {});
  });
  const deadline = Date.now() + 300000;
  while (!planner && Date.now() < deadline) await new Promise(r => setTimeout(r, 500));
  await ctx.close().catch(() => {});
  await browser.close().catch(() => {});
  return planner;
}

const [cmd, a, b] = process.argv.slice(2);

if (cmd === 'record') {
  const label = a || 'run';
  const one = await capture();
  if (!one) { console.log('✗ no planner request captured — the chain did not reach the planner'); process.exit(2); }
  const two = await capture();
  if (!two) { console.log('✗ second capture failed'); process.exit(2); }
  const h = (p) => ({ sys: sha(p.sys), usr: sha(p.usr), sysLen: p.sys.length, usrLen: p.usr.length });
  const h1 = h(one), h2 = h(two);
  const stable = h1.sys === h2.sys && h1.usr === h2.usr;
  fs.writeFileSync(`${DIR}/${label}.json`, JSON.stringify({ label, ...h1, stable, model: one.model, max_tokens: one.max_tokens }, null, 2));
  fs.writeFileSync(`${DIR}/${label}.sys.txt`, one.sys);
  fs.writeFileSync(`${DIR}/${label}.usr.txt`, one.usr);
  if (!stable) {
    fs.writeFileSync(`${DIR}/${label}.b.sys.txt`, two.sys);
    fs.writeFileSync(`${DIR}/${label}.b.usr.txt`, two.usr);
  }
  console.log(`\n${'═'.repeat(74)}\nSCENE-1 PROMPT FINGERPRINT — ${label}\n${'═'.repeat(74)}`);
  console.log(` system : ${h1.sysLen} chars  ${h1.sys.slice(0, 16)}`);
  console.log(` user   : ${h1.usrLen} chars  ${h1.usr.slice(0, 16)}`);
  console.log(` pinned : seeded PRNG + sb_crisis_cat_cursor=0 (variation held constant, not removed)`);
  console.log(` DETERMINISM CONTROL (two runs, same build): ${stable ? '✓ IDENTICAL' : '✗ NOT STABLE'}`);
  if (!stable) console.log('   → a byte-identical claim is not measurable until this is stable; see the .b.* files');
  console.log(`${'─'.repeat(74)}\n`);
  process.exit(stable ? 0 : 1);
}

if (cmd === 'compare') {
  const base = JSON.parse(fs.readFileSync(`${DIR}/${a}.json`, 'utf8'));
  const next = JSON.parse(fs.readFileSync(`${DIR}/${b}.json`, 'utf8'));
  const same = base.sys === next.sys && base.usr === next.usr;
  console.log(`\n${'═'.repeat(74)}\nBYTE-IDENTICAL CHECK — ${a} vs ${b}\n${'═'.repeat(74)}`);
  console.log(` system : ${base.sysLen} → ${next.sysLen}  ${base.sys === next.sys ? '✓ identical' : '✗ CHANGED'}`);
  console.log(` user   : ${base.usrLen} → ${next.usrLen}  ${base.usr === next.usr ? '✓ identical' : '✗ CHANGED'}`);
  if (!same) {
    for (const part of ['sys', 'usr']) {
      if (base[part] === next[part]) continue;
      const A = fs.readFileSync(`${DIR}/${a}.${part}.txt`, 'utf8').split('\n');
      const B = fs.readFileSync(`${DIR}/${b}.${part}.txt`, 'utf8').split('\n');
      let i = 0; while (i < A.length && i < B.length && A[i] === B[i]) i++;
      console.log(`\n first differing ${part} line ${i + 1}:`);
      console.log(`   baseline: ${JSON.stringify((A[i] || '(eof)').slice(0, 150))}`);
      console.log(`   now     : ${JSON.stringify((B[i] || '(eof)').slice(0, 150))}`);
    }
  }
  console.log(`${'─'.repeat(74)}\n ${same ? '✓ BYTE-IDENTICAL' : '✗ THE SCENE-1 PROMPT CHANGED'}\n`);
  process.exit(same ? 0 : 1);
}

console.log('usage: record <label> | compare <a> <b>');
process.exit(2);
