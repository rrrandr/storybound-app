// ══════════════════════════════════════════════════════════════════════════════════════════
// THE OPENING'S LI EXCLUSION MUST NOT REACH LATER SCENES.
//
// The Scene-1 presence gate added to _cpIngestGeneratedStage serves the CONTINUATION skeleton
// too. Scoped wrongly, it read Scene-1 presence settings for every scene, so an otherwise valid
// "Julian IN_PERSON" contract for scene 2 or 3 was rejected whenever scene1Presence was ABSENT —
// and the continuation caller stores null when ingestion rejects.
//
// TWO LEVELS OF EVIDENCE, LABELLED:
//   A · THE REAL CALLER. window.__generateSceneSkeleton (the continuation path, app.js:100454)
//       is driven for scenes 2 and 3 with the planner reply intercepted and the stage contract
//       declaring Julian IN_PERSON. What is read afterwards is what PRODUCTION STORED:
//       state._cpGeneratedStage[sceneN] and state._cpGeneratedStageReport.
//   B · COMPONENT. window._cpIngestGeneratedStage called directly with the SAME contract at
//       sceneNum 1 and 2, to show the scene-1 restriction is intact and is scene-scoped.
//
// Every /api/** request is aborted except the intercepted skeleton call. Nothing is dispatched.
//
// usage: node _nf_continuation_presence_check.mjs
// ══════════════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import { chromium } from 'playwright-core';
import { configBody, isAuthOrigin, installSession, makeSession, installEntitledProfileStub }
  from './_test_session_env.mjs';

const OUT = '/Users/romantsukerman/storybound-app/_nf_continuation_presence_out';
try { fs.rmSync(OUT, { recursive: true, force: true }); } catch (_) {}
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
const blocked = [], skeletonReqs = [], logs = [];
const STATIC = /\/api\/(geo|csp-report|beta-events|bug-report-awards)\b/;
const LOCAL = { '/api/consume-fortune': { success: true, fortunesRemaining: 9999 },
                '/api/refund-fortune':  { success: true, fortunesRemaining: 9999 } };
await installSession(page, makeSession());
await installEntitledProfileStub(page, {});
await page.route('**/api/**', async (route) => {
  const req = route.request();
  const url = req.url().replace(/^https?:\/\/[^/]+/, '');
  if (/\/api\/config\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  if (isAuthOrigin(req.url())) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (STATIC.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  const k = Object.keys(LOCAL).find((x) => url.startsWith(x));
  if (k) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LOCAL[k]) });
  let b = null; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
  const msgs = (b && b.messages) || [];
  const sys = String((msgs.find((m) => m.role === 'system') || {}).content || '');
  const usr = String((msgs.find((m) => m.role === 'user') || {}).content || '');
  // THE CONTINUATION SKELETON REQUEST, answered with a labelled fixture whose stage_contract
  // declares the love interest IN_PERSON. Refs are copied from the request's own ISSUED REFS.
  if (/narrative skeletons for fiction scenes|CAUSAL_OUTLINE/.test(sys + usr)) {
    // ANCHOR ON THE REAL LIST, not the schema's mention of it. The prompt says
    // `"ref": "<COPIED VERBATIM from ISSUED REFS>"` inside the response schema long before it
    // prints the actual roster, and a bare /ISSUED REFS/ matched that first — so the fixture
    // declared no love interest at all and the arm silently tested a PC-only contract.
    // THE ROSTER IS IN THE SYSTEM MESSAGE, not the user message. Parsing `usr` alone found
    // nothing, so liRef stayed null and the arm silently tested a PC-only contract — which the
    // gate would have accepted either way, making the pass meaningless.
    const both = sys + '\n' + usr;
    const refsBlock = (both.match(/ISSUED REFS \(the complete set[^\n]*\n([\s\S]*?)(?:\n(?!\s*·)|$)/) || [])[1] || '';
    const refs = refsBlock.split('\n').map((l) => (l.match(/^\s*·\s*(\S+)/) || [])[1]).filter(Boolean);
    const liRef = refs.filter((r) => /julian/i.test(r))[0] || null;
    const pcRef = refs.filter((r) => /^pc:/.test(r))[0] || 'pc:self';
    skeletonReqs.push({ chars: (sys + usr).length, refs, liRef });
    try { fs.writeFileSync(OUT + '/skeleton_request_' + skeletonReqs.length + '.txt',
      '=== SYSTEM ===\n' + sys + '\n\n=== USER ===\n' + usr); } catch (_) {}
    const reply = {
      environment_anchor: 'the long window above the stairwell',
      structural_pacing: 'tightening', narrative_density: 'close', dialogue_ratio: 'balanced',
      beat_style: 'pressure then answer', tension_rhythm: 'rising',
      staged_characters: [{ name: 'Nadia', presence_mode: 'IN_PERSON', role: 'protagonist' }]
        .concat(liRef ? [{ name: 'Julian', presence_mode: 'IN_PERSON', role: 'love interest' }] : []),
      interlocutor_placement: 'Julian — the man who owns the building she works in, who answers a question slower than it was asked',
      li_texture_beat: null, pc_body_callback: 'beat 2 — signature_feature (the crooked eyetooth)',
      li_body_callback: 'beat 1 — pc_keenly_notices: his hands flat on the rail',
      antagonist_body_callback: null,
      environment_plus: { target: 'the long window above the stairwell', axis: 'use',
        beat: 'the long window above the stairwell is the one place in the building nobody has thought to claim' },
      fusion: null,
      stage_contract: { v: 1,
        participants: [{ ref: pcRef, presence: 'IN_PERSON' }]
          .concat(liRef ? [{ ref: liRef, presence: 'IN_PERSON' }] : []),
        event_facts: [{ text: 'Julian answers her question slower than she asked it',
                        participants: [{ ref: liRef || pcRef, role: 'speaker' }] }] },
      causal_outline: [
        { beat: 'Nadia asks him what he already knows about the photographs' },
        { beat: 'he answers slower than she asked, and the delay is the answer', link: 'therefore', from: 1 },
        { beat: 'she decides what to do with what the delay told her', link: 'therefore', from: 2 },
      ],
    };
    const payload = JSON.stringify(reply);
    const env = /mistral-proxy|\/api\/proxy\b|deepseek-proxy/.test(url)
      ? { id: 'fixture', object: 'chat.completion', model: b.model, usage: {},
          _orchestration: { role: b.role, model: b.model },
          choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: payload } }] }
      : { ok: true, content: payload, choices: [{ message: { content: payload } }] };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(env) });
  }
  blocked.push(url + ' role=' + String((b && b.role) || '?'));
  return route.abort();
});
await page.route('**/sb-test.localhost/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
page.on('request', (r) => { if (/\/api\//.test(r.url()) && !/localhost|127\.0\.0\.1/.test(r.url())) blocked.push('ESCAPED ' + r.url()); });
page.on('console', (m) => { const t = m.text();
  if (/CPLUS:STAGE|SKELETON|STAGE|barred from physical presence/.test(t)) logs.push(t.slice(0, 400)); });

await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 60000 });
await page.waitForFunction(() => window.state && window.__generateSceneSkeleton
  && window._cpIngestGeneratedStage && window._relLedger, null, { timeout: 180000 });

const result = await page.evaluate(async () => {
  const out = { real: [], component: [] };
  const S = window.state;
  const setup = () => {
    Object.keys(S).forEach((k) => { try { delete S[k]; } catch (_) {} });
    Object.assign(S, {
      world: 'Modern', worldSubtype: 'small_town', flavor: 'Billionaire', dynamic: 'Enemies',
      archetype: { primary: 'BEAUTIFUL_RUIN', modifier: null },
      name: 'Nadia', playerName: 'Nadia', loveInterestName: 'Julian', partnerName: 'Julian',
      loveInterest: 'Male', liGender: 'male', playerMask: 'OPEN_VEIN', pov: 'first_person',
      storyLength: 'taste', tier: 'taste', access: 'sub', subscribed: true, fortunes: 9999999,
      intensity: 'Steamy', identity: { playerName: 'Nadia', partnerName: 'Julian' },
      renderMode: 'literary', currentEngine: 'literary', storyModality: 'literary',
      storyId: 'cont-presence', myUid: 'probe',
      // THE OPENING EXCLUDED HIM. This is the setting the gate was wrongly reading for every scene.
      _scene1LIOnStage: false,
      romanceEnginePlan: { engine: 'SHARED_HISTORY', scene1Presence: 'ABSENT', acquaintance: 'KNOWN' },
      aPlot: { goal: 'keep her name', antagonist: 'the ex who kept the photographs',
               antagonistShape: 'PERSON', namedClock: 'the auction closing' },
      pcBodyBible: { signature_feature: 'a crooked eyetooth' },
      liBodyBible: { signature_feature: 'a scar through one eyebrow', voice_quality: 'low, unhurried',
                     pc_keenly_notices: ['his hands flat on the rail'] },
      // A MID-STORY STATE: the opening is published, so these are continuations.
      turnCount: 1, scenes: [{ text: 'the opening, already published' }],
      storyPages: ['the opening, already published'],
      _relationshipLedger: { v: 1, storyId: 'cont-presence', processed: {}, edges: {}, seq: 0,
        entities: {
          'named:julian': { id: 'named:julian', kind: 'named', label: 'Julian', aliases: ['julian'],
                            provenance: 'harness-fixture', anchorRole: 'li' },
        } },
    });
    S.picks = { world: S.world, worldSubtype: S.worldSubtype, flavor: S.flavor, dynamic: S.dynamic,
                tone: 'Earnest', pov: 'First', length: 'taste', identity: S.identity };
  };

  // ── A · THE REAL CALLER, FOR SCENES 2 AND 3 ──
  for (const n of [2, 3]) {
    setup();
    let threw = null;
    try {
      await Promise.race([
        window.__generateSceneSkeleton('she asks him what he already knows', '', { sceneNumber: n }),
        new Promise((r) => setTimeout(r, 120000)),
      ]);
    } catch (e) { threw = String((e && e.message) || e); }
    const stored = (S._cpGeneratedStage || {})[String(n)];
    const report = S._cpGeneratedStageReport || null;
    out.real.push({ scene: n, threw,
      storedIsNull: stored === null, storedPresent: !!stored,
      onStage: stored && Array.isArray(stored.participants)
        ? stored.participants.map((p) => p.ref + ':' + p.presence) : null,
      report: report ? { sceneNumber: report.sceneNumber, ok: report.ok,
                         rejected: (report.rejected || []).slice(0, 4) } : null });
  }

  // ── B · COMPONENT: THE SAME CONTRACT AT SCENE 1 AND SCENE 2 ──
  setup();
  const contract = { v: 1,
    participants: [{ ref: 'pc:self', presence: 'IN_PERSON' },
                   { ref: 'named:julian', presence: 'IN_PERSON' }],
    event_facts: [{ text: 'Julian answers her question slower than she asked it',
                    participants: [{ ref: 'named:julian', role: 'speaker' }] }] };
  [1, 2, 3].forEach((n) => {
    const r = window._cpIngestGeneratedStage(contract, ['pc:self', 'named:julian'], 'cont-presence', n,
      (typeof window._relPcId === 'function') ? window._relPcId() : 'pc');
    out.component.push({ sceneNum: n, ok: !!r.ok, code: r.code || null,
      rejected: (r.rejected || []).map((x) => (x.ref || '') + ':' + (x.why || '')).slice(0, 3) });
  });
  return out;
});
await browser.close();
fs.writeFileSync(OUT + '/RESULT.json', JSON.stringify({ result, skeletonReqs, blocked, logs }, null, 2));

const P = (x) => console.log(x);
let fails = 0;
const chk = (name, ok, detail) => { if (!ok) fails++; P('  ' + (ok ? '✓' : '✗') + ' ' + name + (detail ? '   — ' + detail : '')); };
P('\nTHE OPENING EXCLUSION MUST NOT REACH LATER SCENES\n');
P('  skeleton requests intercepted: ' + skeletonReqs.length
  + (skeletonReqs[0] ? '   (issued refs seen: ' + JSON.stringify(skeletonReqs[0].refs) + ')' : ''));
P('  /api/** aborted: ' + blocked.length
  + (blocked.some((b) => /^ESCAPED/.test(b)) ? '  ⚠ ESCAPED' : '  (none escaped)'));

P('\nA · THROUGH THE REAL CONTINUATION CALLER (window.__generateSceneSkeleton)');
result.real.forEach((r) => {
  P('\n  scene ' + r.scene + (r.threw ? '   threw: ' + r.threw : ''));
  P('    production stored: ' + (r.storedPresent ? JSON.stringify(r.onStage) : (r.storedIsNull ? 'null (REJECTED)' : 'nothing')));
  P('    report: ' + JSON.stringify(r.report));
  chk('scene ' + r.scene + ': the LI IN_PERSON contract was ACCEPTED, not stored as null',
    r.storedPresent && !r.storedIsNull,
    r.report && r.report.rejected && r.report.rejected.length ? JSON.stringify(r.report.rejected) : '');
  chk('scene ' + r.scene + ': the love interest is on the stored stage',
    !!(r.onStage || []).some((x) => /julian/i.test(x) && /IN_PERSON/.test(x)), JSON.stringify(r.onStage));
});

P('\nB · COMPONENT — THE SAME CONTRACT, SCENE BY SCENE');
result.component.forEach((c) => P('    sceneNum ' + c.sceneNum + ' → ok=' + c.ok
  + ' code=' + c.code + ' rejected=' + JSON.stringify(c.rejected)));
const s1 = result.component.filter((c) => c.sceneNum === 1)[0];
chk('scene 1 still REFUSES the offstage LI IN_PERSON', s1 && !s1.ok && /li_is_offstage/.test(JSON.stringify(s1.rejected)),
  JSON.stringify(s1));
result.component.filter((c) => c.sceneNum !== 1).forEach((c) => {
  chk('scene ' + c.sceneNum + ' ACCEPTS it', c.ok, 'code=' + c.code + ' ' + JSON.stringify(c.rejected));
});
P('\n  written: _nf_continuation_presence_out/RESULT.json   '
  + (fails ? fails + ' CHECK(S) FAILED' : 'all checks passed'));
P('  NOTHING WAS DISPATCHED TO A PROVIDER.');
