// B0 DETERMINISTIC EQUIVALENCE.
//
// Cross-run byte comparison was meaningless because public/app.js makes 1,058 Math.random()
// calls, so prompt assembly differs every run. Here the harness seeds a deterministic PRNG
// before app init and serves BOTH sources in memory — baseline from `git show df5fd45:...`,
// candidate from the working tree — so neither the repository nor the user's dirty files are
// touched. Same seed, same fixtures, fresh context per run.
//
// usage: node _b0_deterministic.mjs
import { chromium } from 'playwright-core';
import { execFileSync } from 'child_process';
import fs from 'fs';

const BASELINE_SRC = execFileSync('git', ['show', 'df5fd45:public/app.js'], { encoding: 'utf8', maxBuffer: 1 << 30 });
const CANDIDATE_SRC = fs.readFileSync('public/app.js', 'utf8');
console.log(`  baseline  ${BASELINE_SRC.length.toLocaleString()} chars (df5fd45)`);
console.log(`  candidate ${CANDIDATE_SRC.length.toLocaleString()} chars (working tree)`);

const PASSTHROUGH = /\/api\/(config|geo|csp-report)\b/;
const LOCAL = { '/api/consume-fortune': { success: true, fortunesRemaining: 9999 } };
const MODEL = /\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini)\b/;
const L = 'she understands the wish has already begun to cost her something she cannot name';
const SCAFFOLD = { pressure_source_type: 'institutional', pressure_source: L,
  hook_object: 'the witness band', opening_beat: 'She sets the relic down', rising_beats: ['a','b'],
  decision_beat: 'Does she name the cost', pc_career: 'shrine witness', opening_setting: 'the hall',
  li_texture_beat: 'He crosses toward her', interlocutor_placement: 'The Dohkar stands between',
  pc_wound_anchor: L, pc_self_presentation_beat: 'decision', scene_want: L, scene_mission: L,
  reader_state: { knows: L }, mission_family: 'extraction', mission_attempt: L, immediate_result: L,
  pc_body_callback: 'decision', li_body_callback: 'opening', antagonist_body_callback: null,
  perceptual_signature_beat: L, staged_characters: [{ name: 'Lirael', anchor_beat: L }] };
const GENERIC = { goal: L, antagonistOrAntiForce: 'the assembly', milestones: [], scenes: [],
  timelineLength: 20, characters: [], name: 'Julian', distinguishing_feature: 'a burn scar',
  private_hope: L, defining_anecdote: L, attraction_manifestation: L, desire_register_exemplars: [L] };
const PROSE = (() => { const s=['Lirael','Seren','Julian','the Dohkar','the assembly'],
  v=['turned toward','considered','stepped past','reached for'], o=['the hearth','the relic','the gate'];
  const out=[]; for (let i=0;i<44;i++) out.push(`${s[i%5]} ${v[(i*3)%4]} ${o[(i*5)%3]} at ${i+3} breaths.`);
  return out.join(' '); })();

function classify(body) {
  const m = (body && body.messages) || [];
  const sys = String((m.find(x => x.role === 'system') || {}).content || '');
  const role = body && body.role;
  if (/ARCHITECTURE LAWS/.test(sys)) return 'AUTHOR';
  if (/scene-structure planner for the OPENING scene/.test(sys)) return 'SCAFFOLD';
  if (/ruthless line-editor/.test(sys) || /Fix ONLY mechanical/.test(sys)) return 'PROSE';
  if (role === 'SPECIALIST_RENDERER' || role === 'LINE_EDITOR' || role === 'INTIMACY_SPECIALIST') return 'PROSE';
  return 'JSON';
}

async function run(label, source) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();           // fresh context: clean localStorage
  // DETERMINISM — installed before any app code. Same seed both runs. Production randomness
  // is untouched; this only exists inside the isolated Playwright context.
  await ctx.addInitScript(() => {
    let s = 0x2f6e2b1 >>> 0;
    window.__randCalls = 0;
    Math.random = function () {
      window.__randCalls++;
      s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
      return (s >>> 0) / 4294967296;
    };
    // Date.now and randomUUID feed ids that can reach prompts; pin them too.
    const _fixed = 1756080000000;
    Date.now = () => _fixed;
    if (window.crypto) { let u = 0; window.crypto.randomUUID = () => `00000000-0000-4000-8000-${String(++u).padStart(12,'0')}`; }
  });
  const page = await ctx.newPage();
  const authorSeen = [], escaped = [];
  // Serve the chosen source in memory for any app.js request.
  await page.route('**/app.js*', route => route.fulfill({
    status: 200, contentType: 'application/javascript; charset=utf-8', body: source }));
  await page.route('**/api/**', async route => {
    const url = route.request().url().replace(/^https?:\/\/[^/]+/, '');
    if (PASSTHROUGH.test(url)) return route.continue();
    const k = Object.keys(LOCAL).find(x => url.startsWith(x));
    if (k) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LOCAL[k]) });
    let body = null; try { body = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
    if (!MODEL.test(url)) return route.abort();
    const kind = classify(body);
    if (kind === 'AUTHOR') {
      const mm = body.messages || [];
      authorSeen.push({
        system: String((mm.find(x => x.role === 'system') || {}).content || ''),
        user: String((mm.find(x => x.role === 'user') || {}).content || ''),
        wireTemp: body.temperature, wireMax: body.max_tokens
      });
    }
    const c = kind === 'SCAFFOLD' ? JSON.stringify(SCAFFOLD) : kind === 'JSON' ? JSON.stringify(GENERIC) : PROSE;
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ content: c, choices: [{ message: { content: c } }] }) });
  });
  page.on('request', r => { if (/\/api\//.test(r.url()) && !/localhost|127\.0\.0\.1/.test(r.url())) escaped.push(r.url()); });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_STORIES, { timeout: 40000 });
  const st = await page.evaluate(async () => {
    const s = window.state;
    const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
    s.picks = s.picks || {};
    ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies']
      .forEach(k => { s.picks[k] = def[k]; });
    Object.assign(s, { world: def.world, worldSubtype: def.worldSubtype, flavor: def.flavor,
      dynamic: def.dynamic, _starterId: def.id, is_starter_story: true, immutableTitle: def.title,
      archetype: { primary: def.archetype, modifier: null }, name: 'Lirael', playerName: 'Lirael',
      loveInterestName: 'Julian', partnerName: 'Julian', loveInterest: 'Male', liGender: 'male',
      playerMask: 'OPEN_VEIN', storyLength: 'fling', tier: 'fling', access: 'sub', subscribed: true,
      fortunes: 9999999, intensity: 'Steamy', pov: 'first_person',
      identity: { playerName: 'Lirael', partnerName: 'Julian' }, renderMode: 'literary',
      currentEngine: 'literary', storyId: 'b0det', myUid: 'probe' });
    s.picks.identity = s.identity;
    s._skipCorridorValidation = true;
    const randBefore = window.__randCalls;
    try { await Promise.race([window.handleBeginStory(), new Promise(r => setTimeout(r, 90000))]); } catch (_) {}
    s._skipCorridorValidation = false;
    const P = s._lastScene1AuditPrompt || null;
    return { randCalls: window.__randCalls - randBefore,
      fingerprint: window.__scene1RequestFingerprint || null,
      audit: P ? { variant: P.variant || null, capturedAt: P.capturedAt || null,
                   sysLen: (P.system||'').length, usrLen: (P.user||'').length,
                   maxTokens: P.maxTokens ?? null } : null };
  });
  await browser.close();
  return { label, author: authorSeen[0] || null, authorCount: authorSeen.length, escaped: escaped.length, ...st };
}

const base = await run('BASELINE df5fd45', BASELINE_SRC);
const cand = await run('CANDIDATE B0', CANDIDATE_SRC);

function firstDiff(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i;
  return a.length === b.length ? -1 : n;
}
let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };

console.log(`\n${'═'.repeat(86)}\nB0 DETERMINISTIC EQUIVALENCE\n${'═'.repeat(86)}`);
for (const r of [base, cand]) {
  console.log(`\n  ${r.label}`);
  console.log(`    Math.random calls during run : ${r.randCalls}`);
  console.log(`    author requests              : ${r.authorCount}`);
  console.log(`    author sys/usr               : ${r.author && r.author.system.length} / ${r.author && r.author.user.length}`);
  console.log(`    wire temp / max_tokens       : ${r.author && r.author.wireTemp} / ${r.author && r.author.wireMax}`);
  console.log(`    fingerprint                  : ${JSON.stringify(r.fingerprint)}`);
  console.log(`    audit                        : ${JSON.stringify(r.audit)}`);
}
console.log('');
t('determinism: identical Math.random call count', base.randCalls === cand.randCalls,
  `baseline=${base.randCalls} candidate=${cand.randCalls}`);
t('same author request count', base.authorCount === cand.authorCount);
if (base.author && cand.author) {
  const ds = firstDiff(base.author.system, cand.author.system);
  t('author SYSTEM byte-for-byte identical', ds === -1,
    ds === -1 ? '' : `first diff at offset ${ds}\n      base: ${JSON.stringify(base.author.system.slice(Math.max(0,ds-60), ds+60))}\n      cand: ${JSON.stringify(cand.author.system.slice(Math.max(0,ds-60), ds+60))}`);
  const du = firstDiff(base.author.user, cand.author.user);
  t('author USER byte-for-byte identical', du === -1,
    du === -1 ? '' : `first diff at offset ${du}\n      base: ${JSON.stringify(base.author.user.slice(Math.max(0,du-60), du+60))}\n      cand: ${JSON.stringify(cand.author.user.slice(Math.max(0,du-60), du+60))}`);
  t('wire temperature identical', base.author.wireTemp === cand.author.wireTemp);
  t('wire max_tokens identical', base.author.wireMax === cand.author.wireMax);
}
t('candidate audit is pre-dispatch', cand.audit && cand.audit.capturedAt === 'pre-dispatch', JSON.stringify(cand.audit));
t('candidate audit names its variant', !!(cand.audit && cand.audit.variant));
t('candidate audit lengths equal dispatched pair',
  cand.audit && cand.author && cand.audit.sysLen === cand.author.system.length
  && cand.audit.usrLen === cand.author.user.length,
  `audit=${cand.audit && cand.audit.sysLen}/${cand.audit && cand.audit.usrLen} dispatched=${cand.author && cand.author.system.length}/${cand.author && cand.author.user.length}`);
t('zero escaped requests', base.escaped === 0 && cand.escaped === 0);
console.log(`\n  variant exercised: ${cand.fingerprint ? cand.fingerprint.variant : '(none)'}`);
console.log(`\n${'─'.repeat(86)}\n  ${pass} passed · ${fail} failed\n`);
process.exit(fail ? 1 : 0);
