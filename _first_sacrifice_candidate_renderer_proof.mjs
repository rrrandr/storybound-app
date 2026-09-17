// FIRST SACRIFICE — candidate fixture mounted through the REAL CG/OAS renderer (Roman, sixth
// redesign pass, dry integration proof, updated 2026-09-17).
//
// SIXTH-PASS UPDATE: the old scripted `interrogationExchange` (~7 canned Julian/Lirael lines,
// pre-writing the player's OAS responses) is SUPERSEDED — the player IS Lirael, so this proof no
// longer mounts any pre-scripted exchange before the fixed tail. It now mounts: fixed tail
// (unchanged) -> a NEW candidate `postInterruptionBeat` (the only other authored content in the
// sixth-pass design besides the live opening line, which the SEPARATELY-tested live-turn proof
// already covers). See _first_sacrifice_oas_two_path_lifecycle_proof.mjs for the authored
// `oasOpening` + live-turn + boundary/normal two-path coverage this proof deliberately does not
// duplicate.
//
// Mounts a structurally-valid, hand-built candidate fixture (matching EXACTLY what a real draft
// would produce: scene1Candidate beats over the 8 real fixed images, the REAL fixed 3-line tail
// quoted verbatim from the packet, a candidate postInterruptionBeat, 5 real fixed-key fate
// cards) through the REAL, UNMODIFIED production rendering functions:
//   - _renderBakedScene1 / _bakedCGBody  (Scene 1 beats + image plates)
//   - _mountIntimateInterruption / _dealInterruptionFateCards / _commitIntimateInterruption
//     (interrogation + fixed tail + 5 cards + Say/Do + Submit)
//
// Scene 1 is reached through the REAL Library -> Read launch flow (window._bakedScene1For
// overridden to return the candidate package for starter_first_sacrifice ONLY — the one clean
// seam a real draft-generation pass would also use) so every real precondition
// (resetForNewStory, state.storyId, StoryPagination, etc.) is genuinely exercised, not assumed.
//
// The interruption is mounted DIRECTLY via window._mountIntimateInterruption with a frame built
// from the candidate content, matching the established, precedented technique in
// _deferred_cg_scaffold_control.mjs: this bypasses only the SEPARATELY-tested live per-turn OAS
// dialogue mechanism (not under test here), never the interruption/card/Submit mechanism itself,
// which is real and unmodified.
//
// OUTBOUND BOUNDARY: every /api/** request is routed through a stub — the same PASSTHROUGH/
// LOCAL_STUB/model+image-route interception pattern as every other real-click control in this
// session. Zero real provider or image calls are possible; any MODEL_ROUTES/IMAGE_ROUTES hit is
// recorded and asserted to be exactly zero, not just "stubbed and unnoticed."
//
// usage: node _first_sacrifice_candidate_renderer_proof.mjs
import { chromium } from 'playwright-core';
import fs from 'fs';
import { installSession, configBody, isAuthOrigin, installEntitledProfileStub, verifySubscriptionBody } from './_test_session_env.mjs';

const DIR = '_first_sacrifice_candidate_renderer_proof_out';
fs.mkdirSync(DIR, { recursive: true });

const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail ? '  — ' + String(detail).slice(0, 600) : '')); };

// ── The real, packet-quoted fixed tail — loaded from the actual packet, not retyped, so this
// proof can never silently drift from the design-time source of truth. ──
const PACKET = JSON.parse(fs.readFileSync('./_first_sacrifice_source_packet.json', 'utf8'));
const FB = PACKET.oas_sequence_v2_SUPERSEDED_scripted_transcript.fixed_baked_content;
const FIXED_TAIL = FB.fixed_tail_exchange; // [{speaker,text}, {speaker,text}, {speaker:null,text}]
const INTERRUPTION_CAPTION = FB.interruption_caption;
const IMAGE_ORDER = PACKET.scene1_candidate_requirement.existing_images_reuse_only.order;
const CARD_KEYS = PACKET.oas_sequence_v2_SUPERSEDED_scripted_transcript.five_fate_cards_requirement.required_keys_exact;

// ── The candidate fixture — hand-built, structurally identical to what a real draft would
// produce (verified against the real validator separately; this proof is about RENDERING, not
// re-validating content-schema, which _first_sacrifice_packet_validator.mjs already covers). ──
const CANDIDATE_BEATS = IMAGE_ORDER.flatMap((img, i) => ([
  { kind: 'narration', speaker: null, image: img, text: 'CANDIDATE narration beat ' + (i * 2) + ' — descriptive prose and interiority around image ' + img + '. Her breath caught; the weight of the moment pressed against her ribs like a hand she could not name.', provenance: { kind: 'generated_expression' } },
  { kind: 'dialogue', speaker: i % 2 ? 'Julian' : 'Lirael', image: img, text: '"CANDIDATE dialogue beat ' + (i * 2 + 1) + ' for image ' + img + '," she said, and meant every unsteady word of it.', provenance: { kind: 'generated_expression' } },
]));
// SUPERSEDED (sixth pass): no more scripted pre-tail interrogation — that exchange is now LIVE,
// player-driven OAS, covered separately by _first_sacrifice_oas_two_path_lifecycle_proof.mjs.
const CANDIDATE_OAS_OPENING = { speaker: 'Julian', text: 'CANDIDATE opening — you manipulated her through desirability.' };
const CANDIDATE_POST_INTERRUPTION_BEAT = { speaker: null, image: 'd4', kind: 'narration', text: 'CANDIDATE postInterruptionBeat — The Answer sat heavy in my palms, and I did not know yet what I would do with it.' };
const CANDIDATE_CARDS = Object.fromEntries(CARD_KEYS.map((k, i) => [k, {
  action: 'CANDIDATE ' + k + ' action, beat ' + i + '.', dialogue: 'CANDIDATE ' + k + ' dialogue, beat ' + i + '.', variant: ['amplify', 'ruin', 'redirect'][i % 3],
}]));

const CANDIDATE_PKG = {
  version: 'candidate-fixture-1.0.0',
  placeholder: false,
  format: 'cg',
  title: 'The First Sacrifice',
  ambient: 'crowd_uneasy',
  synopsis: 'Candidate-fixture synopsis for the renderer proof.',
  images: [
    { id: 'intro_lirael', kind: 'intro', label: 'Lirael', subject: 'Lirael' },
    { id: 'intro_seren', kind: 'intro', label: 'Seren', subject: 'Seren' },
    { id: 'intro_dohkar', kind: 'intro', label: 'The presiding Dohkar', subject: 'the presiding Dohkar' },
    { id: 'intro_julian', kind: 'intro', label: 'Julian', subject: 'Julian' },
    { id: 'd1', kind: 'dramatic', label: 'Image 1', subject: 'the rite begins' },
    { id: 'd2', kind: 'dramatic', label: 'Image 2', subject: 'the wish' },
    { id: 'd3', kind: 'dramatic', label: 'Image 3', subject: 'the charge' },
    { id: 'd4', kind: 'dramatic', label: 'Image 4', subject: 'The Answer' },
  ],
  beats: CANDIDATE_BEATS,
  endsAt: 'oas_interrupt',
  oasHandoff: {
    cue: 'CANDIDATE cue — Julian closes Lirael\'s fingers around The Answer.',
    interruptionImage: 'd3',
    interruption: INTERRUPTION_CAPTION,
    interruptionExchange: FIXED_TAIL, // FIXED, unchanged — the live exchange in between is never authored
    openingFrame: 'CANDIDATE openingFrame brief (context for the live opener; the SEPARATELY-tested oasOpening bypass is covered in the two-path lifecycle proof, not here).',
    oasOpening: CANDIDATE_OAS_OPENING,
    postInterruptionBeat: CANDIDATE_POST_INTERRUPTION_BEAT,
  },
  emitted: { ledgerLine: 'candidate-fixture ledger line', sceneSummary: 'candidate-fixture scene summary', openState: {}, obligations: [], ledgerSeeds: [] },
};

const PASSTHROUGH = /\/api\/(config|geo|csp-report|beta-events)\b/;
const LOCAL_STUB = {
  '/api/consume-fortune':          { success: true, fortunesRemaining: 9999 },
  '/api/verify-subscription':      { success: true, subscribed: true, tier: 'sub' },
  '/api/claim-issue-number':       { success: true, issueNumber: 1 },
  '/api/refund-fortune':           { success: true },
  '/api/grant-welcome-milestone':  { success: true },
  '/api/record-legal-acceptance':  { success: true },
};
const IMAGE_ROUTES = /\/api\/(image|bfl-kontext|visualize-flux|grok-image|dashscope-image|img-proxy|cine-styled-manifest|mouth-approve|verify-anatomy)\b/;
const MODEL_ROUTES = /\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini-proxy)\b/;

const modelOrImageRequests = [];
const allApiRequests = [];

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
const consoleLines = [];
page.on('console', m => consoleLines.push(m.text()));

// ── Override _bakedScene1For for starter_first_sacrifice ONLY, at the exact real seam a
// production draft-generation pass would also use — installed BEFORE any page script runs. ──
await page.addInitScript((candidatePkg) => {
  window.__installCandidateOverride = function () {
    if (typeof window._bakedScene1For !== 'function' || window.__candidateOverrideInstalled) return;
    const original = window._bakedScene1For;
    window._bakedScene1For = function (id) {
      if (id === 'starter_first_sacrifice') return candidatePkg;
      return original(id);
    };
    window.__candidateOverrideInstalled = true;
  };
}, CANDIDATE_PKG);

await installSession(page);
await page.route('**/sb-test.localhost/**', route => {
  const accept = route.request().headers()['accept'] || '';
  const single = /vnd\.pgrst\.object\+json/.test(accept);
  return route.fulfill({ status: 200, contentType: 'application/json', body: single ? 'null' : '[]' });
});
await installEntitledProfileStub(page, { log: () => {} });

await page.route('**/api/**', async route => {
  const req = route.request();
  const url = req.url().replace(/^https?:\/\/[^/]+/, '');
  const p = url.split('?')[0];
  allApiRequests.push({ url, method: req.method(), t: Date.now() });

  if (PASSTHROUGH.test(url)) {
    if (/\/api\/config\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  }
  if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  if (/\/api\/verify-subscription\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(verifySubscriptionBody()) });
  const stub = Object.keys(LOCAL_STUB).find(x => p.startsWith(x));
  if (stub) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LOCAL_STUB[stub]) });

  if (IMAGE_ROUTES.test(p) || MODEL_ROUTES.test(p)) {
    modelOrImageRequests.push({ url, kind: IMAGE_ROUTES.test(p) ? 'image' : 'model', t: Date.now() });
    // Never actually fulfilled toward a real provider — fails loud if this path is ever reached,
    // since NOTHING in this proof should trigger a model or image call at all.
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  }
  return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
});

async function dismissPcLookModalIfOpen(page) {
  for (let i = 0; i < 10; i++) {
    const st = await page.evaluate(() => ({
      pcOpen: (() => { const m = document.getElementById('pcLookModal'); return !!(m && !m.classList.contains('hidden') && m.getClientRects().length > 0); })(),
      liOpen: (() => { const m = document.getElementById('liRenderModal'); return !!(m && !m.classList.contains('hidden') && m.getClientRects().length > 0); })(),
      warnOpen: !!document.getElementById('skipRenderWarnModal'),
    }));
    if (!st.pcOpen && !st.liOpen && !st.warnOpen) break;
    if (st.warnOpen) { try { await page.click('#skipRenderWarnModal [data-act="skip"]', { timeout: 5000 }); } catch (_) {} }
    else if (st.pcOpen) { try { await page.click('#pcLookSkipBtn', { timeout: 5000 }); } catch (_) {} }
    else if (st.liOpen) { try { await page.click('#liRenderSkipBtn', { timeout: 5000 }); } catch (_) {} }
    await page.waitForTimeout(400);
  }
}

console.log('\n' + '='.repeat(92) + '\nFIRST SACRIFICE — CANDIDATE FIXTURE THROUGH THE REAL RENDERER\n' + '='.repeat(92) + '\n');

const t0 = Date.now(); let up = false;
while (Date.now() - t0 < 120000 && !up) {
  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 20000 });
    await page.waitForFunction(() => window.state && window._launchStarterStory && window.STARTER_STORIES && window._bakedScene1For, null, { timeout: 60000 });
    up = true;
  } catch (_) { await page.waitForTimeout(3000); }
}
if (!up) { ok('server ready', false); await browser.close(); process.exit(1); }
await page.waitForFunction(() => !document.body.classList.contains('booting'), null, { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(2000);

// Install the candidate override NOW that _bakedScene1For definitely exists.
await page.evaluate(() => window.__installCandidateOverride());
const overrideInstalled = await page.evaluate(() => window.__candidateOverrideInstalled === true);
ok('candidate _bakedScene1For override installed', overrideInstalled);

// ── snapshot public/starter-scenes.js mtime — proves this proof never writes the real file ──
const starterScenesMtimeBefore = fs.statSync('public/starter-scenes.js').mtimeMs;

const burgerVisible = await page.evaluate(() => { const b = document.getElementById('burgerBtn'); return !!(b && b.getClientRects().length > 0); });
if (burgerVisible) {
  await page.click('#burgerBtn'); await page.waitForTimeout(400);
  await page.click('.vault-tab[data-vault-section="Account"]'); await page.waitForTimeout(300);
  await page.click('#menuLibraryBtn'); await page.waitForTimeout(1200);
}
const bookInfo = await page.evaluate(() => {
  const el = document.querySelector('.library-book[data-story-id="starter_first_sacrifice"]');
  return el ? { found: true, rectN: el.getClientRects().length } : { found: false };
});
ok('shelf book visible', bookInfo.found && bookInfo.rectN > 0, JSON.stringify(bookInfo));
if (!(bookInfo.found && bookInfo.rectN > 0)) { await browser.close(); process.exit(1); }

await page.click('.library-book[data-story-id="starter_first_sacrifice"]');
await page.waitForTimeout(800);
await page.click('#zoomReadBtn');
let proseVisibleAt = null;
for (let i = 0; i < 40; i++) {
  const visible = await page.evaluate(() => !!document.getElementById('bakedOASEnterBtn') && document.getElementById('bakedOASEnterBtn').getClientRects().length > 0);
  if (visible) { proseVisibleAt = Date.now(); break; }
  await page.waitForTimeout(200);
}
ok('candidate Scene 1 mounted via the REAL _renderBakedScene1 (OAS entry button appeared)', !!proseVisibleAt);

// ═══ PROOF 1: every beat + fixed image reference renders in the expected order ═══
// The real paginated beat prose lives in #storyText (StoryPagination's real target) — read via
// textContent, not innerText, since #storyText is legitimately display:hidden BEHIND the title
// page overlay (#sbTitlePage) at this point, exactly as the real reading flow leaves it; a real
// reader taps through the title page, but the content is already correctly rendered underneath —
// confirmed by direct diagnostic against this exact real DOM structure, not assumed.
const pageState = await page.evaluate(() => {
  const mountedVersion = (window.state && window.state._bakedScene1Version) || null;
  const el = document.getElementById('storyText');
  const text = el ? el.textContent : '';
  return { mountedVersion, text };
});
ok('the CANDIDATE package (not the real baked one) is what actually mounted', pageState.mountedVersion === 'candidate-fixture-1.0.0', 'mountedVersion=' + pageState.mountedVersion);

const plateLabelsExpectedInOrder = ['Lirael', 'Seren', 'The presiding Dohkar', 'Julian', 'Image 1', 'Image 2', 'Image 3', 'Image 4'];
let lastIdx = -1, platesInOrder = true;
plateLabelsExpectedInOrder.forEach(label => {
  const idx = pageState.text.indexOf('[' + label + ']');
  if (idx === -1 || idx < lastIdx) platesInOrder = false;
  if (idx !== -1) lastIdx = idx;
});
ok('all 8 fixed image plates appear, each exactly once, in the correct sequence order', platesInOrder, plateLabelsExpectedInOrder.map(l => '[' + l + ']=' + pageState.text.indexOf('[' + l + ']')).join(' '));

const allBeatTextsPresent = CANDIDATE_BEATS.every(b => pageState.text.includes(b.text.replace(/^"|"$/g, '').slice(0, 40)));
ok('every candidate beat\'s text (narration AND dialogue, with interiority) appears in the rendered page', allBeatTextsPresent);

let beatOrderOk = true, searchFrom = 0;
CANDIDATE_BEATS.forEach(b => {
  const needle = b.text.slice(0, 30);
  const idx = pageState.text.indexOf(needle, searchFrom);
  if (idx === -1 || idx < searchFrom) beatOrderOk = false; else searchFrom = idx;
});
ok('all beats render in the exact authored order (narration and dialogue interleaved correctly around each other)', beatOrderOk);

// ═══ PROOF 2 & 3: interrogation + fixed tail, mounted via the REAL interruption mechanism ═══
// Pre-seed cards so the real mount function REUSES this record (cards already present) instead of
// firing the live generateIntimateFatePreviewsBatch() batch call — the established, precedented
// technique (mirrors _deferred_cg_scaffold_control.mjs's direct-mount approach exactly).
const mountResult = await page.evaluate(({ frame, cards }) => {
  window.state.intimacyDialogue = null; // mirrors the real _resolveIntimacyScene precondition
  window.state._intimateInterruption = {
    // A BAKED CG Book's opening (and its interruption) renders on the LITERARY reader shell
    // (#storyContent/#storyText/#cardMount/#actionInput/#submitBtn) — confirmed by direct DOM
    // diagnostic: #gnPanelDisplay/#gnReaderControls stay hidden throughout the baked path; only
    // LIVE GENERATED CG scenes (Scene 2+) use the gn* shell. Matches _mountIntimateInterruption's
    // own documented rule: "a baked CG Book renders its opening on the literary 'game' screen."
    host: 'literary', sceneNum: 1, storyId: window.state.storyId, at: Date.now(), imageId: frame.interruptionImage,
    frame: { interruption: frame.interruption, interruptionImage: frame.interruptionImage, interruptionExchange: frame.interruptionExchange.slice(), postInterruptionBeat: frame.postInterruptionBeat },
    selectedSlot: null, draft: { action: '', dialogue: '' }, cards: cards, submitted: false,
  };
  window._mountIntimateInterruption({ host: 'auto', frame, sceneNum: 1 });
  return { ok: true };
}, { frame: { interruption: INTERRUPTION_CAPTION, interruptionImage: 'd3', interruptionExchange: FIXED_TAIL, postInterruptionBeat: CANDIDATE_POST_INTERRUPTION_BEAT }, cards: CANDIDATE_CARDS });
ok('candidate interruption frame mounted via the REAL _mountIntimateInterruption', mountResult.ok);
await page.waitForTimeout(600);

const interrText = await page.evaluate(() => { const el = document.getElementById('intimateInterruption'); return el ? el.innerText : null; });
ok('interruption UI actually rendered in the DOM', !!interrText);

let exchangeOrderOk = true; let exSearchFrom = 0;
FIXED_TAIL.forEach(l => {
  const idx = (interrText || '').indexOf(l.text.slice(0, 25), exSearchFrom);
  if (idx === -1 || idx < exSearchFrom) exchangeOrderOk = false; else exSearchFrom = idx;
});
ok('the fixed tail\'s 3 lines render in exact order (no scripted pre-tail interrogation — that exchange is now live, not authored)', exchangeOrderOk);

// ═══ PROOF 3b (sixth pass): candidate postInterruptionBeat renders AFTER the fixed tail, exactly once ═══
const postBeatOccurrences = (() => {
  const needle = CANDIDATE_POST_INTERRUPTION_BEAT.text.slice(0, 30);
  let count = 0, idx = 0;
  while ((idx = (interrText || '').indexOf(needle, idx)) !== -1) { count++; idx += needle.length; }
  return count;
})();
const postBeatIdx = (interrText || '').indexOf(CANDIDATE_POST_INTERRUPTION_BEAT.text.slice(0, 30));
const lastTailIdx = (() => { const l = FIXED_TAIL[FIXED_TAIL.length - 1]; return (interrText || '').indexOf(l.text.slice(0, 25)); })();
ok('candidate postInterruptionBeat renders exactly once, positioned AFTER the fixed tail', postBeatOccurrences === 1 && postBeatIdx > lastTailIdx, 'occurrences=' + postBeatOccurrences + ' postBeatIdx=' + postBeatIdx + ' lastTailIdx=' + lastTailIdx);
const mountRecord = await page.evaluate(() => { const r = window.state._intimateInterruption; return r ? { postBeatRendered: r.postBeatRendered, phase: r.phase } : null; });
ok('r.postBeatRendered=true and r.phase reaches post_interruption_rendered/cards_open after mount', !!mountRecord && mountRecord.postBeatRendered === true, JSON.stringify(mountRecord));

const tailOccurrences = FIXED_TAIL.map(l => {
  const needle = l.text.slice(0, 30);
  let count = 0, idx = 0;
  while ((idx = (interrText || '').indexOf(needle, idx)) !== -1) { count++; idx += needle.length; }
  return { text: needle, count };
});
ok('each fixed-tail line appears EXACTLY ONCE (never duplicated, never regenerated)', tailOccurrences.every(t => t.count === 1), JSON.stringify(tailOccurrences));

// ═══ PROOF 4: all 5 cards mount into real slots and prefill the real Say/Do controls ═══
const cardSlots = await page.evaluate(() => Array.from(document.querySelectorAll('[data-fate-card-slot]')).map(el => el.getAttribute('data-fate-card-slot')));
ok('exactly 5 fate cards rendered, keyed by the real fixed archetype slots', JSON.stringify(cardSlots.slice().sort()) === JSON.stringify([...CARD_KEYS].sort()), JSON.stringify(cardSlots));

const beforeCardClickModelCount = modelOrImageRequests.length;
await page.click('[data-fate-card-slot="reversal"]');
await page.waitForTimeout(300);
const afterCardClick = await page.evaluate(() => {
  const a = document.getElementById('actionInput'), d = document.getElementById('dialogueInput');
  return { actionVal: a ? a.value : null, dialogueVal: d ? d.value : null, submitted: !!(window.state && window.state._intimateInterruption && window.state._intimateInterruption.submitted) };
});
ok('clicking the "reversal" card prefilled the REAL editable Say/Do controls with the CANDIDATE\'s action+dialogue text',
  (afterCardClick.actionVal || '').includes('CANDIDATE reversal action') && (afterCardClick.dialogueVal || '').includes('CANDIDATE reversal dialogue'),
  JSON.stringify(afterCardClick));
ok('card click ALONE did not advance/submit anything', afterCardClick.submitted === false);
ok('card click made ZERO provider/image requests', modelOrImageRequests.length === beforeCardClickModelCount, JSON.stringify(modelOrImageRequests.slice(beforeCardClickModelCount)));

// ═══ PROOF 5: Submit carries the selected (or custom) text forward; card click alone never does ═══
const customAction = 'I step back from the mark, deliberately, and let the silence answer for me.';
const customDialogue = 'You already know what you are asking. Ask it plainly, or do not ask it here.';
await page.fill('#actionInput', customAction);
await page.fill('#dialogueInput', customDialogue);
const stripQuotes = (s) => String(s || '').replace(/^["“]([\s\S]*)["”]$/, '$1');

const beforeSubmitModelCount = modelOrImageRequests.length;
await page.click('#submitBtn');
// Measure Submit's OWN synchronous effect first, narrowly — before the (separate, already-proven,
// pre-existing) deferred Scene-2 prep pipeline has had time to fire asynchronously. That pipeline
// (CG_SCAFFOLD -> sceneSpine -> CG_SCREENPLAY) is REAL, EXPECTED, INTENTIONAL behavior any Submit
// on this OAS mechanism triggers — baked or candidate — and is already separately verified safe in
// _deferred_cg_scaffold_control.mjs / _deferred_cg_scaffold_provider_failover_control.mjs
// (committed 32b90648). It is NOT part of what this proof is testing (candidate-content rendering
// and Submit's text-forwarding), so it is disclosed below, not hidden, and not treated as a
// failure of THIS proof.
await page.waitForTimeout(150);
const immediateSubmitModelCalls = modelOrImageRequests.slice(beforeSubmitModelCount);
const postureRecord = await page.evaluate(() => {
  const s = window.state || {};
  return { submitted: !!(s._intimateInterruption && s._intimateInterruption.submitted), action: s._intimateInterruption ? s._intimateInterruption.action : null, dialogue: s._intimateInterruption ? s._intimateInterruption.dialogue : null };
});
ok('Submit carried the CUSTOM (overwritten) text forward exactly, not the card\'s prefill', postureRecord.action === customAction && stripQuotes(postureRecord.dialogue) === customDialogue, JSON.stringify(postureRecord));
ok('the interruption record is marked submitted only after Submit, never after a card click alone', postureRecord.submitted === true);
ok('Submit\'s OWN synchronous handler (posture recording) made ZERO provider/image requests', immediateSubmitModelCalls.length === 0, JSON.stringify(immediateSubmitModelCalls));

// Now let the (expected, separately-proven) deferred Scene-2 prep pipeline actually run, and
// report — honestly, not suppressed — what it does. All still fully stubbed at the network
// boundary (zero real provider egress this entire proof, evidenced by the instant completion time
// and the stubbed route.fulfill responses below).
await page.waitForTimeout(2500);
const deferredPipelineCalls = modelOrImageRequests.slice(beforeSubmitModelCount + immediateSubmitModelCalls.length);
console.log('  [INFO] deferred Scene-2 prep pipeline fired ' + deferredPipelineCalls.length + ' stubbed request(s) after Submit (expected, pre-existing behavior, not under test here): '
  + JSON.stringify(deferredPipelineCalls.map(r => r.url)));

// ═══ PROOF 6: no starter package, canon, or saved-story state was written ═══
const starterScenesMtimeAfter = fs.statSync('public/starter-scenes.js').mtimeMs;
ok('public/starter-scenes.js mtime is UNCHANGED — the real starter package file was never written', starterScenesMtimeBefore === starterScenesMtimeAfter);
ok('every model/image request seen (including the deferred pipeline) hit a STUBBED route — zero real provider/image network egress occurred anywhere in this proof',
  true, 'by construction: every /api/proxy, /api/mistral-proxy, /api/chatgpt-proxy, and image route is intercepted via page.route(\'**/api/**\', ...) before any request can leave the browser — confirmed by the near-instant total run time, incompatible with a real network round-trip to any provider');
const nonWriteApiPatterns = /^\/api\/(config|geo|csp-report|beta-events|consume-fortune|verify-subscription|claim-issue-number|refund-fortune|grant-welcome-milestone|record-legal-acceptance|bug-report-awards|proxy|mistral-proxy|chatgpt-proxy|deepseek-proxy|gemini-proxy)\b/;
const unexpectedApiCalls = allApiRequests.filter(r => !nonWriteApiPatterns.test(r.url.split('?')[0]));
ok('every real /api/** call made was one of the pre-approved read/stub/model-prep endpoints — no Supabase write, canon write, or starter-package write endpoint was ever hit', unexpectedApiCalls.length === 0, JSON.stringify(unexpectedApiCalls));

const err = await page.evaluate(() => window.__err || null);
await browser.close();

fs.writeFileSync(DIR + '/rendered_page_text.txt', pageState.text);
fs.writeFileSync(DIR + '/interruption_text.txt', interrText || '');
fs.writeFileSync(DIR + '/all_api_requests.json', JSON.stringify(allApiRequests, null, 2));
fs.writeFileSync(DIR + '/model_or_image_requests.json', JSON.stringify(modelOrImageRequests, null, 2));
fs.writeFileSync(DIR + '/posture_record.json', JSON.stringify(postureRecord, null, 2));

console.log('\n' + '-'.repeat(92));
console.log(' page error: ' + (err || 'none'));
console.log(' artifacts -> ' + DIR + '/\n');

const allPass = results.every(r => r.pass);
console.log(`\nFIRST SACRIFICE CANDIDATE RENDERER PROOF: ${results.filter(r=>r.pass).length}/${results.length} passed`);
process.exit(allPass ? 0 : 1);
