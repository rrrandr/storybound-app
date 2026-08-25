// B0 — Scene-1 canonical request boundary, byte-equivalence.
//
// Branches are identified by the APP-LEVEL callChat arguments, not by upstream temperature:
// callGrokNarrativeAuthor hardcodes temperature 0.8 (oc:2389), which is what made an earlier
// audit wrongly conclude the HEAVY branch never ran.
//
// Baseline is captured BEFORE the edit and compared after — no stash, so the user's dirty
// working tree is never touched.
//
// usage: node _scene1_b0_equiv.mjs --baseline    (run first, pre-change)
//        node _scene1_b0_equiv.mjs               (run after the edit)
import { chromium } from 'playwright-core';
import fs from 'fs';

const BASE = '_scene1_b0_baseline_v2.json';
const WRITE = process.argv.includes('--baseline');
const PASSTHROUGH = /\/api\/(config|geo|csp-report)\b/;
const LOCAL = { '/api/consume-fortune': { success: true, fortunesRemaining: 9999 } };
const MODEL = /\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini)\b/;
const L = 'she understands the wish has already begun to cost her something she cannot name';
const SCAFFOLD = {
  pressure_source_type: 'institutional', pressure_source: L, hook_object: 'the witness band',
  opening_beat: 'She sets the relic down before the assembly', rising_beats: ['a', 'b'],
  decision_beat: 'Does she name the cost aloud', pc_career: 'shrine witness',
  opening_setting: 'the shrine hall', li_texture_beat: 'He crosses the hall toward her',
  interlocutor_placement: 'The Dohkar stands between her and the door', pc_wound_anchor: L,
  pc_self_presentation_beat: 'decision', scene_want: L, scene_mission: L,
  reader_state: { knows: L }, mission_family: 'extraction', mission_attempt: L,
  immediate_result: L, pc_body_callback: 'decision', li_body_callback: 'opening',
  antagonist_body_callback: null, perceptual_signature_beat: L,
  staged_characters: [{ name: 'Lirael', anchor_beat: L }, { name: 'Julian', anchor_beat: L }]
};
const GENERIC = { goal: L, antagonistOrAntiForce: 'the assembly', milestones: [], scenes: [],
  timelineLength: 20, characters: [], name: 'Julian', distinguishing_feature: 'a burn scar',
  private_hope: L, defining_anecdote: L, attraction_manifestation: L, desire_register_exemplars: [L] };
function proseFor(n) {
  const s = ['Lirael','Seren','Julian','the Dohkar','the assembly','the witness'];
  const v = ['turned toward','considered','stepped past','reached for','measured'];
  const o = ['the cold hearth','the relic','the north gate','the second bell'];
  const out = [];
  for (let i = 0; i < 44; i++) out.push(`${s[i%s.length]} ${v[(i*3)%v.length]} ${o[(i*5)%o.length]} at ${i+n} breaths.`);
  return out.join(' ');
}
function classify(url, body) {
  const m = (body && body.messages) || [];
  const sys = String((m.find(x => x.role === 'system') || {}).content || '');
  const role = body && body.role;
  if (/ARCHITECTURE LAWS/.test(sys)) return 'AUTHOR';
  if (/ruthless line-editor/.test(sys)) return 'EDITOR';
  if (/Fix ONLY mechanical defects/.test(sys)) return 'REPAIR';
  if (/scene-structure planner for the OPENING scene/.test(sys)) return 'SCAFFOLD';
  if (role === 'SPECIALIST_RENDERER' || role === 'LINE_EDITOR' || role === 'INTIMACY_SPECIALIST') return 'PROSE';
  return 'JSON';
}
const hash = t => { let h = 7; for (let i = 0; i < t.length; i++) h = ((h * 31 + t.charCodeAt(i)) >>> 0); return h.toString(36) + ':' + t.length; };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
// Capture the APP-LEVEL callChat arguments — the authoritative descriptor.
await ctx.addInitScript(() => {
  window.__ccLog = [];
  const install = () => {
    if (typeof window.callChat !== 'function' || window.__ccWrapped) return;
    const orig = window.callChat;
    window.callChat = function (messages, temp, options) {
      try {
        const sys = String(((messages || []).find(m => m && m.role === 'system') || {}).content || '');
        const usr = String(((messages || []).find(m => m && m.role === 'user') || {}).content || '');
        window.__ccLog.push({ sysLen: sys.length, usrLen: usr.length, temp,
          options: JSON.parse(JSON.stringify(options || {})),
          sysH: sys.length, usrH: usr.length, sysHead: sys.slice(0, 50), usrHead: usr.slice(0, 50) });
      } catch (_) {}
      return orig.apply(this, arguments);
    };
    window.__ccWrapped = true;
  };
  const iv = setInterval(install, 50); setTimeout(() => clearInterval(iv), 20000);
});
const page = await ctx.newPage();
let n = 0; const escaped = []; const authorSeen = [];
await page.route('**/api/**', async route => {
  const url = route.request().url().replace(/^https?:\/\/[^/]+/, '');
  if (PASSTHROUGH.test(url)) return route.continue();
  const k = Object.keys(LOCAL).find(x => url.startsWith(x));
  if (k) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LOCAL[k]) });
  let body = null; try { body = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
  if (!MODEL.test(url)) return route.abort();
  const kind = classify(url, body); n++;
  if (kind === 'AUTHOR') {
    const mm = (body && body.messages) || [];
    const sy = String((mm.find(x => x.role === 'system') || {}).content || '');
    const us = String((mm.find(x => x.role === 'user') || {}).content || '');
    authorSeen.push({ sysLen: sy.length, usrLen: us.length, sysH: hash(sy), usrH: hash(us),
      sysHead: sy.slice(0, 50), usrHead: us.slice(0, 50),
      wireTemp: body.temperature, wireMax: body.max_tokens, model: body.model || null });
  }
  const c = kind === 'SCAFFOLD' ? JSON.stringify(SCAFFOLD)
    : kind === 'JSON' ? JSON.stringify(GENERIC)
    : proseFor(n);
  return route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ content: c, choices: [{ message: { content: c } }] }) });
});
page.on('request', r => { if (/\/api\//.test(r.url()) && !/localhost|127\.0\.0\.1/.test(r.url())) escaped.push(r.url()); });

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_STORIES, { timeout: 40000 });
const out = await page.evaluate(async () => {
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
    currentEngine: 'literary', storyId: 'b0v2', myUid: 'probe' });
  s.picks.identity = s.identity;
  s._skipCorridorValidation = true;
  try { await Promise.race([window.handleBeginStory(), new Promise(r => setTimeout(r, 90000))]); } catch (_) {}
  s._skipCorridorValidation = false;
  const P = s._lastScene1AuditPrompt || null;
  return { cc: window.__ccLog || [], pages: window.StoryPagination.getPageCount(),
    audit: P ? { variant: P.variant || null, capturedAt: P.capturedAt || null,
                 sysLen: (P.system || '').length, usrLen: (P.user || '').length,
                 maxTokens: P.maxTokens ?? null } : null };
});
await browser.close();

// The Scene-1 author call is the callChat invocation with the largest user content.
const author = authorSeen[0] || null;
const snap = { authorCall: author, authorCalls: authorSeen.length, callCount: out.cc.length, pages: out.pages, audit: out.audit };

if (WRITE) {
  fs.writeFileSync(BASE, JSON.stringify(snap, null, 1));
  console.log(`\n  baseline written → ${BASE}`);
  console.log(`  callChat invocations: ${snap.callCount}`);
  console.log(`  author calls: ${snap.authorCalls}  sysLen=${author && author.sysLen} usrLen=${author && author.usrLen}`
    + ` wireTemp=${author && author.wireTemp} wireMax=${author && author.wireMax}`);
  process.exit(0);
}
let pass = 0, fail = 0;
const t = (nm, c, d) => { if (c) { pass++; console.log(`  ✓ ${nm}`); } else { fail++; console.log(`  ✗ ${nm}${d ? `\n      ${d}` : ''}`); } };
console.log(`\n${'═'.repeat(84)}\nB0 EQUIVALENCE (app-level descriptor)\n${'═'.repeat(84)}`);
console.log(`\n  callChat invocations: ${snap.callCount}   pages=${snap.pages}`);
console.log(`  author calls: ${snap.authorCalls}  sysLen=${author && author.sysLen} usrLen=${author && author.usrLen}`
  + ` wireTemp=${author && author.wireTemp} wireMax=${author && author.wireMax}`);
console.log(`  audit record: ${JSON.stringify(snap.audit)}`);
t('escaped requests', escaped.length === 0, JSON.stringify(escaped.slice(0, 3)));
if (fs.existsSync(BASE)) {
  const b = JSON.parse(fs.readFileSync(BASE, 'utf8'));
  const ba = b.authorCall || {};
  t('callChat invocation count unchanged', b.callCount === snap.callCount, `pre=${b.callCount} post=${snap.callCount}`);
  t('exactly one author request', snap.authorCalls === 1, `got ${snap.authorCalls}`);
  t('author system BYTE-identical (hash)', ba.sysH === (author && author.sysH), `pre=${ba.sysH} post=${author && author.sysH}`);
  t('author user BYTE-identical (hash)', ba.usrH === (author && author.usrH), `pre=${ba.usrH} post=${author && author.usrH}`);
  t('wire temperature unchanged', ba.wireTemp === (author && author.wireTemp), `pre=${ba.wireTemp} post=${author && author.wireTemp}`);
  t('wire max_tokens unchanged', ba.wireMax === (author && author.wireMax), `pre=${ba.wireMax} post=${author && author.wireMax}`);
  t('author system head unchanged', ba.sysHead === (author && author.sysHead));
  t('author user head unchanged', ba.usrHead === (author && author.usrHead));
  t('audit record is pre-dispatch', snap.audit && snap.audit.capturedAt === 'pre-dispatch', JSON.stringify(snap.audit));
  t('audit lengths equal the dispatched pair',
    snap.audit && author && snap.audit.sysLen === author.sysLen && snap.audit.usrLen === author.usrLen,
    JSON.stringify(snap.audit));
} else console.log(`\n  (no ${BASE} — run --baseline first)`);
console.log(`\n${'─'.repeat(84)}\n  ${pass} passed · ${fail} failed\n`);
process.exit(fail ? 1 : 0);
