// B0 — Scene-1 canonical request boundary. Byte-equivalence against pre-B0.
//
// The three Scene-1 author branches are mutually exclusive, so exactly one request is ever
// dispatched. Before B0 each branch called callChat itself and the "audit prompt" was
// rebuilt AFTER dispatch from _s1StructTail — a synthetic string that could drift from what
// was sent. Now each branch builds a descriptor and one boundary captures, validates,
// records and dispatches it.
//
// This harness intercepts the ACTUAL request body at the network layer and compares it
// byte-for-byte between the pre-B0 checkout and HEAD.
//
// usage: node _scene1_b0_equivalence.mjs            (captures HEAD)
//        node _scene1_b0_equivalence.mjs --baseline  (writes the pre-B0 baseline)
import { chromium } from 'playwright-core';
import fs from 'fs';

const BASELINE = '_scene1_b0_baseline.json';
const writeBaseline = process.argv.includes('--baseline');

const PROSE = (() => {
  const s = ['Lirael','Seren','Julian','the Dohkar','the assembly'];
  const v = ['turned toward','considered','stepped past','reached for','measured'];
  const o = ['the cold hearth','the relic','the north gate','the second bell','the long table'];
  const out = [];
  for (let i = 0; i < 44; i++) out.push(`${s[i%5]} ${v[(i*3)%5]} ${o[(i*7)%5]}, and nothing moved for ${i+2} breaths.`);
  return out.join(' ');
})();
const KNOWN = /\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini|image|bfl-kontext|replicate|fal|get-parent-images|save|load|vault|library|log|track|beta)/;

async function capture(label) {
  const authorCalls = [], other = [];
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  await page.route('**/api/**', async route => {
    const u = route.request().url().replace(/^https?:\/\/[^/]+/, '');
    if (!KNOWN.test(u)) return route.abort();
    let body = null; try { body = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
    const msgs = (body && body.messages) || [];
    const sys = String((msgs.find(m => m.role === 'system') || {}).content || '');
    const usr = String((msgs.find(m => m.role === 'user') || {}).content || '');
    // The Scene-1 author call is the one whose user content carries the opening scaffold,
    // or LITE's fixed opening instruction.
    const isAuthor = /Begin the story\. Write Scene 1\./.test(usr)
      || (usr.length > 2000 && /Open the story|Scene 1|opening/i.test(sys + usr));
    (isAuthor ? authorCalls : other).push({
      url: u, model: body && body.model, temperature: body && body.temperature,
      max_tokens: body && body.max_tokens,
      sysLen: sys.length, usrLen: usr.length,
      sysHash: hash(sys), usrHash: hash(usr),
      sysHead: sys.slice(0, 90), usrHead: usr.slice(0, 90)
    });
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ content: PROSE, choices: [{ message: { content: PROSE } }] }) });
  });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_STORIES, { timeout: 40000 });
  const res = await page.evaluate(async () => {
    const s = window.state;
    const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
    window._devBypass = true; window._forceDeckMandate = false;
    s.picks = s.picks || {};
    ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies']
      .forEach(k => { s.picks[k] = def[k]; });
    Object.assign(s, {
      world: def.world, worldSubtype: def.worldSubtype, flavor: def.flavor, dynamic: def.dynamic,
      _starterId: def.id, is_starter_story: true, immutableTitle: def.title,
      archetype: { primary: def.archetype, modifier: null },
      name: 'Lirael', playerName: 'Lirael', loveInterestName: 'Julian', partnerName: 'Julian',
      loveInterest: 'Male', liGender: 'male', playerMask: 'OPEN_VEIN', storyLength: 'fling',
      tier: 'fling', access: 'sub', subscribed: true, fortunes: 9999999, previewActive: false,
      _skipCorridorValidation: true, intensity: 'Steamy', pov: 'first_person',
      identity: { playerName: 'Lirael', partnerName: 'Julian' },
      _pcLookSkipped: true, pcLookLocked: true, renderMode: 'literary', currentEngine: 'literary',
      storyId: 'b0'
    });
    s.picks.identity = s.identity;
    try { await Promise.race([window.handleBeginStory(), new Promise(r => setTimeout(r, 60000))]); } catch (_) {}
    const P = s._lastScene1AuditPrompt || null;
    return {
      audit: P ? {
        variant: P.variant || null, capturedAt: P.capturedAt || null,
        sysLen: (P.system || '').length, usrLen: (P.user || '').length,
        hasStructuralTail: !!P.structuralTail, hasReconstructed: !!P.reconstructedSystem
      } : null,
      fingerprint: window.__scene1RequestFingerprint || null
    };
  });
  await browser.close();
  return { label, authorCalls, otherCount: other.length, ...res };
}
function hash(t) { let h = 7; for (let i = 0; i < t.length; i++) h = ((h * 31 + t.charCodeAt(i)) >>> 0); return h.toString(36) + ':' + t.length; }

const cur = await capture(writeBaseline ? 'pre-B0' : 'HEAD');
if (writeBaseline) {
  fs.writeFileSync(BASELINE, JSON.stringify(cur, null, 1));
  console.log(`\n baseline written → ${BASELINE}`);
  console.log(`   author calls: ${cur.authorCalls.length}`);
  cur.authorCalls.forEach((c, i) => console.log(`   ${i}: sys=${c.sysHash} usr=${c.usrHash} max_tokens=${c.max_tokens} temp=${c.temperature}`));
  process.exit(0);
}

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };
console.log(`\n${'═'.repeat(84)}\nB0 BYTE-EQUIVALENCE\n${'═'.repeat(84)}`);
console.log('\n HEAD capture');
console.log(`   author calls           : ${cur.authorCalls.length}`);
cur.authorCalls.forEach((c, i) => console.log(`   ${i}: sys=${c.sysHash} usr=${c.usrHash} max_tokens=${c.max_tokens} temp=${c.temperature}`));
console.log(`   audit record           : ${JSON.stringify(cur.audit)}`);
console.log(`   request fingerprint    : ${JSON.stringify(cur.fingerprint)}`);

t('exactly one primary author call', cur.authorCalls.length === 1, `got ${cur.authorCalls.length}`);
t('audit record captured PRE-dispatch', cur.audit && cur.audit.capturedAt === 'pre-dispatch',
  JSON.stringify(cur.audit));
t('audit record names its variant', !!(cur.audit && cur.audit.variant));
t('structural reconstruction kept, clearly named', !!(cur.audit && cur.audit.hasReconstructed));
t('structuralTail preserved for the QA tools', !!(cur.audit && cur.audit.hasStructuralTail));
if (cur.authorCalls.length === 1 && cur.audit) {
  const c = cur.authorCalls[0];
  t('captured system length == intercepted system length', cur.audit.sysLen === c.sysLen,
    `audit=${cur.audit.sysLen} intercepted=${c.sysLen}`);
  t('captured user length == intercepted user length', cur.audit.usrLen === c.usrLen,
    `audit=${cur.audit.usrLen} intercepted=${c.usrLen}`);
}

if (fs.existsSync(BASELINE)) {
  const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
  console.log('\n VS PRE-B0 BASELINE');
  t('same author call count', base.authorCalls.length === cur.authorCalls.length,
    `pre=${base.authorCalls.length} post=${cur.authorCalls.length}`);
  const n = Math.min(base.authorCalls.length, cur.authorCalls.length);
  for (let i = 0; i < n; i++) {
    const b = base.authorCalls[i], c = cur.authorCalls[i];
    t(`call ${i}: system byte-identical`, b.sysHash === c.sysHash, `pre=${b.sysHash} post=${c.sysHash}`);
    t(`call ${i}: user byte-identical`, b.usrHash === c.usrHash, `pre=${b.usrHash} post=${c.usrHash}`);
    t(`call ${i}: max_tokens preserved`, b.max_tokens === c.max_tokens, `pre=${b.max_tokens} post=${c.max_tokens}`);
    t(`call ${i}: temperature preserved`, b.temperature === c.temperature, `pre=${b.temperature} post=${c.temperature}`);
    t(`call ${i}: model preserved`, String(b.model) === String(c.model), `pre=${b.model} post=${c.model}`);
  }
} else {
  console.log(`\n  (no ${BASELINE} — run with --baseline on the pre-B0 checkout first)`);
}

console.log(`\n${'─'.repeat(84)}\n  ${pass} passed · ${fail} failed\n`);
process.exit(fail ? 1 : 0);
