// SCENE-1 PRODUCER AUDIT — PASS 2, schema-correct fixtures.
//
// Pass 1 fed prose to JSON consumers, so four "JSON repair tool" calls fired and the marker
// that reached the page came from a body-bible generator via a parse-failure path. The
// lineage was therefore invalid. Here every signature gets a response of the RIGHT KIND:
// JSON consumers get JSON, the author gets marked prose, and each downstream prose stage
// preserves its upstream marker and adds its own — producing a verifiable chain rather than
// just a final identity.
//
// Only flag set: _skipCorridorValidation (one read, L243174, the validation early-return).
// Unknown signatures THROW. No generic prose fallback anywhere.
//
// usage: node _scene1_pass2.mjs
import { chromium } from 'playwright-core';
import fs from 'fs';

const PASSTHROUGH = /\/api\/(config|geo|csp-report)\b/;
const LOCAL = { '/api/consume-fortune': { success: true, fortunesRemaining: 9999 } };
const MODEL = /\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini)\b/;

const L = 'she understands the wish has already begun to cost her something she cannot name yet';
function prose(markers) {
  const s = ['Lirael','Seren','Julian','the Dohkar','the assembly','the witness','her mother'];
  const v = ['turned toward','considered','stepped past','reached for','measured','refused'];
  const o = ['the cold hearth','the relic','the north gate','the second bell','the long table'];
  const out = [markers.join(' ') + '.'];
  for (let i = 0; i < 44; i++) out.push(`${s[i%s.length]} ${v[(i*3)%v.length]} ${o[(i*5)%o.length]} and the hall held ${i+3} breaths.`);
  out.push(markers.join(' ') + '.');
  return out.join(' ');
}
// Maximally valid CURRENT-contract scaffold object (23 top-level fields) so the planner
// parses first time and its repair retry must not fire.
const SCAFFOLD = {
  pressure_source_type: 'institutional', pressure_source: L,
  hook_object: 'the gossamer witness band', opening_beat: 'She sets the relic down before the assembly and does not look at him',
  rising_beats: ['The band tightens as the wish turns', 'The Dohkar calls for a second witness'],
  decision_beat: 'Does she name the cost aloud or let the assembly decide it for her',
  pc_career: 'shrine witness', opening_setting: 'the shrine hall',
  li_texture_beat: 'He crosses the hall toward her before anyone else moves',
  interlocutor_placement: 'The Dohkar stands between her and the door',
  pc_wound_anchor: L, pc_self_presentation_beat: 'decision', scene_want: L, scene_mission: L,
  reader_state: { knows: L, suspects: L, misreads: L },
  mission_family: 'extraction', mission_attempt: L, immediate_result: L,
  pc_body_callback: L, li_body_callback: L, antagonist_body_callback: L,
  perceptual_signature_beat: L,
  staged_characters: [{ name: 'Lirael', anchor_beat: L }, { name: 'Seren', anchor_beat: L },
                      { name: 'Julian', anchor_beat: L }, { name: 'the presiding Dohkar', anchor_beat: L }]
};
// Generic-but-VALID JSON for the other structured consumers. Not exhaustively schema-
// complete — the point is to remove the prose-to-JSON-consumer confound, and any field a
// consumer misses degrades exactly as it does in production on a thin model response.
const GENERIC_JSON = {
  goal: L, antagonistOrAntiForce: 'the assembly', milestones: [], scenes: [],
  timelineLength: 20, currentTurn: 1, characters: [], name: 'Julian',
  distinguishing_feature: 'a burn scar along the left thumb', voice_quality: 'low and unhurried',
  hands_quality: 'ink-stained', mouth_quality: 'set', private_hope: L,
  defining_anecdote: L, attraction_manifestation: L, desire_register_exemplars: [L],
  scene: {}, sceneState: {}, relations: []
};

function incomingProse(body) {
  const m = (body && body.messages) || [];
  const u = String((m.find(x => x.role === 'user') || {}).content || '');
  // The prose under edit is the longest paragraph-ish block in the user message.
  const blocks = u.split(/\n{2,}/).sort((a, b) => b.length - a.length);
  return (blocks[0] || '').trim();
}
function classify(url, body) {
  const msgs = (body && body.messages) || [];
  const sys = String((msgs.find(m => m.role === 'system') || {}).content || '');
  const role = body && body.role;
  if (/ARCHITECTURE LAWS/.test(sys)) return 'AUTHOR';
  if (/ruthless line-editor/.test(sys)) return 'EDITOR';
  if (/Fix ONLY mechanical defects/.test(sys)) return /mistral-proxy/.test(url) ? 'MISTRAL_REPAIR' : 'REPAIR_FALLBACK';
  if (/scene-structure planner for the OPENING scene/.test(sys)) return 'SCAFFOLD';
  if (role === 'SPECIALIST_RENDERER') return 'SPECIALIST';
  if (role === 'LINE_EDITOR') return 'LINE_EDITOR';
  if (role === 'INTIMACY_SPECIALIST') return 'INTIMACY';
  if (/JSON repair tool/.test(sys)) return 'JSON_REPAIR';
  if (/canonicalization and normalization|A-PLOT GENERATOR|R-PLOT|CONTINUITY ARCHITECT|DISTINGUISHING FEATURE/.test(sys)) return 'JSON_OTHER';
  if (role === 'NARRATIVE_AUTHOR' || role === 'STRUCTURE_GENERATOR' || role === 'PRIMARY_AUTHOR') return 'JSON_OTHER';
  return 'UNKNOWN';
}

const fired = [], unknown = [];
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
await ctx.addInitScript(() => {
  window.__reqLog = [];
  const of = window.fetch;
  window.fetch = function (input, init) {
    try {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      if (/\/api\//.test(url)) {
        let b = null; try { b = JSON.parse((init && init.body) || '{}'); } catch (_) {}
        const m = (b && b.messages) || [];
        window.__reqLog.push({
          url: url.replace(/^https?:\/\/[^/]+/, ''), role: b && b.role, model: b && b.model,
          temperature: b && b.temperature, max_tokens: b && b.max_tokens,
          sysLen: String((m.find(x => x.role === 'system') || {}).content || '').length,
          usrLen: String((m.find(x => x.role === 'user') || {}).content || '').length,
          sysHead: String((m.find(x => x.role === 'system') || {}).content || '').slice(0, 60).replace(/\s+/g, ' '),
          // full system+user retained for the author only, to answer "exact payload"
          full: /ARCHITECTURE LAWS/.test(String((m.find(x => x.role === 'system') || {}).content || ''))
            ? { system: String((m.find(x => x.role === 'system') || {}).content || ''),
                user: String((m.find(x => x.role === 'user') || {}).content || '') } : null,
          stack: (new Error().stack || '').split('\n').slice(1, 7).map(x => x.trim().replace(/https?:\/\/[^ )]+\//g, '')).join(' << ')
        });
      }
    } catch (_) {}
    return of.apply(this, arguments);
  };
});
const page = await ctx.newPage();
await page.route('**/api/**', async route => {
  const req = route.request();
  const url = req.url().replace(/^https?:\/\/[^/]+/, '');
  if (PASSTHROUGH.test(url)) return route.continue();
  const k = Object.keys(LOCAL).find(x => url.startsWith(x));
  if (k) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LOCAL[k]) });
  let body = null; try { body = JSON.parse(req.postData() || '{}'); } catch (_) {}
  if (!MODEL.test(url)) { unknown.push(url); return route.abort(); }
  const kind = classify(url, body);
  fired.push(kind);
  let content;
  // Prose transformations ECHO their input and APPEND a marker: the opening is preserved
  // (the _valid() predicate in _mistralRepairPass checks it unless metaOnly), and upstream
  // markers survive by construction, so the page shows the true terminal lineage.
  const echoAppend = (tag) => {
    const inc = incomingProse(body);
    return (inc && inc.length > 200) ? (inc + ' ' + tag + '.') : prose(['AUTHOR_23', tag]);
  };
  if (kind === 'AUTHOR') content = prose(['AUTHOR_23']);
  else if (kind === 'EDITOR') content = echoAppend('EDITOR_24');
  else if (kind === 'MISTRAL_REPAIR') content = echoAppend('MISTRAL_25');
  else if (kind === 'REPAIR_FALLBACK') content = echoAppend('FALLBACK_26');
  else if (kind === 'SPECIALIST') content = echoAppend('SPECIALIST');
  else if (kind === 'LINE_EDITOR') content = echoAppend('LINEEDIT');
  else if (kind === 'INTIMACY') content = echoAppend('INTIMACY');
  else if (kind === 'SCAFFOLD') content = JSON.stringify(SCAFFOLD);
  else if (kind === 'JSON_REPAIR') content = JSON.stringify(SCAFFOLD);
  else if (kind === 'JSON_OTHER') content = JSON.stringify(GENERIC_JSON);
  else { unknown.push(url + ' :: ' + (body && body.role) + ' :: ' + kind); return route.abort(); }
  return route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ content, choices: [{ message: { content } }] }) });
});
const escaped = [];
page.on('request', r => { if (/\/api\//.test(r.url()) && !/localhost|127\.0\.0\.1/.test(r.url())) escaped.push(r.url()); });

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.state && window.handleBeginStory && window.STARTER_STORIES, { timeout: 40000 });

const res = await page.evaluate(async () => {
  const s = window.state;
  const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
  s.picks = s.picks || {};
  ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies']
    .forEach(k => { s.picks[k] = def[k]; });
  Object.assign(s, {
    world: def.world, worldSubtype: def.worldSubtype, flavor: def.flavor, dynamic: def.dynamic,
    _starterId: def.id, is_starter_story: true, immutableTitle: def.title,
    archetype: { primary: def.archetype, modifier: null },
    name: 'Lirael', playerName: 'Lirael', loveInterestName: 'Julian', partnerName: 'Julian',
    loveInterest: 'Male', liGender: 'male', playerMask: 'OPEN_VEIN', storyLength: 'fling',
    tier: 'fling', access: 'sub', subscribed: true, fortunes: 9999999, intensity: 'Steamy',
    pov: 'first_person', identity: { playerName: 'Lirael', partnerName: 'Julian' },
    renderMode: 'literary', currentEngine: 'literary', storyId: 'pass2', myUid: 'probe'
  });
  s.picks.identity = s.identity;
  s._skipCorridorValidation = true;
  const pre = { devBypass: typeof window._devBypass === 'undefined' ? 'undefined' : window._devBypass };
  let threw = null;
  try { await Promise.race([window.handleBeginStory(), new Promise(r => setTimeout(r, 90000))]); }
  catch (e) { threw = String(e.message).slice(0, 150); }
  s._skipCorridorValidation = false;
  const text = (window.StoryPagination.getAllContent() || '').replace(/<[^>]*>/g, ' ');
  return {
    pre, threw, flagCleared: s._skipCorridorValidation === false,
    pages: window.StoryPagination.getPageCount(), textLen: text.length,
    markers: ['AUTHOR_23','EDITOR_24','MISTRAL_25','FALLBACK_26','SPECIALIST','LINEEDIT','INTIMACY'].filter(m => text.includes(m)),
    terminalTail: text.slice(-160),
    skeletonVisible: !!(s.sceneSkeleton), skeletonMeta: !!(s._skeletonMeta),
    reqLog: window.__reqLog || []
  };
});
await browser.close();

const count = k => fired.filter(x => x === k).length;
console.log(`\n${'═'.repeat(88)}\nPASS 2 — SCHEMA-CORRECT FIXTURES\n${'═'.repeat(88)}`);
console.log(`\n  _devBypass: ${res.pre.devBypass}   flag cleared after run: ${res.flagCleared}   threw: ${res.threw || 'no'}`);
console.log(`  pages=${res.pages} textLen=${res.textLen}  requests=${res.reqLog.length}  escaped=${escaped.length}  unknown=${unknown.length}`);
console.log(`\n  STAGE FIRING COUNTS`);
['AUTHOR','EDITOR','MISTRAL_REPAIR','REPAIR_FALLBACK','SPECIALIST','LINE_EDITOR','INTIMACY','SCAFFOLD','JSON_REPAIR','JSON_OTHER'].forEach(k =>
  console.log(`    ${k.padEnd(16)} ×${count(k)}`));
console.log(`\n  MARKER LINEAGE ON PAGE: ${JSON.stringify(res.markers)}`);
console.log(`  terminal tail: ...${(res.terminalTail||'').slice(-110)}`);
console.log(`  state.sceneSkeleton present: ${res.skeletonVisible}   _skeletonMeta: ${res.skeletonMeta}`);
if (unknown.length) console.log(`\n  UNKNOWN (thrown): ${[...new Set(unknown)].join(', ')}`);

const author = res.reqLog.find(q => q.full);
if (author) {
  console.log(`\n  AUTHOR PAYLOAD (request #${res.reqLog.indexOf(author)+1})`);
  console.log(`    ${author.url} role=${author.role} t=${author.temperature} max=${author.max_tokens}`);
  console.log(`    system ${author.full.system.length} chars | user ${author.full.user.length} chars`);
  const u = author.full.user, sy = author.full.system;
  for (const probe of ['SCENE SKELETON','skeleton','character_plus','environment_plus','fusion',
                       'ASSIGNED EVENT','pressure_source','opening_beat','scene_want','staged_characters']) {
    const inS = sy.includes(probe), inU = u.includes(probe);
    if (inS || inU) console.log(`    contains "${probe}": ${inS ? 'SYSTEM' : ''}${inS && inU ? ' + ' : ''}${inU ? 'USER' : ''}`);
  }
  fs.writeFileSync('_scene1_author_payload.json', JSON.stringify(author.full, null, 1));
  console.log('    full payload → _scene1_author_payload.json');
}
fs.writeFileSync('_scene1_pass2.json', JSON.stringify({ fired, unknown, res: { ...res, reqLog: res.reqLog.map(q => ({ ...q, full: undefined })) } }, null, 1));
console.log('\n  record → _scene1_pass2.json\n');
