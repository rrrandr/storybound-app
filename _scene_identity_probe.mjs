// SCENE IDENTITY PROBE — does an immutable persisted scene id exist, and do the two
// finalized hooks agree on scene identity? Everything below is FREE and provably so:
//
//   1. page.route('**/api/**') fences at the NETWORK layer — an intercepted request is
//      never issued, so no key is ever charged regardless of which JS path calls it.
//      Every attempt is RECORDED and reported; a paid-endpoint attempt is a loud failure.
//   2. window._updateCharacterDisclosureLedgerForCurrent is stubbed, so the paid
//      gpt-4o-mini extractor (_extractCharacterDisclosure) is never reached on EITHER
//      hook — literary calls it with no args, CG with plan-beat prose.
//   3. _charLedgerLastFp is recorded but NEVER relied on to suppress billing. It is a
//      single last-value, not a set, so back/forward nav defeats it — that is one of the
//      things this probe measures.
//
// usage: node _scene_identity_probe.mjs
import { chromium } from 'playwright-core';
import fs from 'fs';

const PAID = /\/api\/(chatgpt-proxy|proxy|mistral-proxy|gemini|image|bfl-kontext|replicate|fal)/;
const attempts = [];

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();

// ── NETWORK FENCE. Nothing reaches a vendor. Author/skeleton get canned prose long
//    enough to clear the ledger hook's 40-char floor so finalization still runs.
const STUB = 'Lirael set the relic down on the shrine table and did not look at Julian. '
  + 'The hall smelled of cold ash. "Lord Maren is my father," she said, "and he sent me here to take it." '
  + 'Julian said nothing for a long moment, and the silence did the arguing for him.';
await page.route('**/api/**', async route => {
  const r = route.request();
  const url = r.url();
  attempts.push({ url: url.replace(/^https?:\/\/[^/]+/, ''), method: r.method(), paid: PAID.test(url) });
  return route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ content: STUB, choices: [{ message: { content: STUB } }] }),
  });
});

const consoleLogs = [];
page.on('console', m => {
  const t = m.text();
  if (/PROBE|HONEY-POT|CHARACTER LEDGER|GN:SCENE|STAGED/.test(t)) consoleLogs.push(t.slice(0, 180));
});

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.state && window.StoryPagination, { timeout: 40000 });

// ── HOOK INTERCEPT. Captures every identifier in scope at each finalized hook and
//    deliberately does NOT call through — that is what keeps the extractor unreached.
await page.evaluate(() => {
  window.__rows = [];
  window.__origHook = window._updateCharacterDisclosureLedgerForCurrent;
  window._updateCharacterDisclosureLedgerForCurrent = function (explicitText) {
    const s = window.state || {};
    const P = window.StoryPagination;
    const pages = (P && P.getPages) ? P.getPages() : null;
    const raw = explicitText || ((s.scenes && s.scenes.length) ? (s.scenes[s.scenes.length - 1] || {}).text : '');
    const plain = String(raw || '');
    const scene = (s.scenes && s.scenes.length) ? s.scenes[s.scenes.length - 1] : null;
    window.__rows.push({
      hook: explicitText ? 'CG' : 'LITERARY',
      scenesLen: (s.scenes || []).length,
      turnCount: s.turnCount,
      derived: Math.max((s.scenes || []).length || 0, s.turnCount || 0) || 1,
      storyId: s.storyId || null,
      storyturn: s.storyturn || s._storyturn || null,
      gnSceneIndex: (typeof window._gnSceneIndex !== 'undefined') ? window._gnSceneIndex : null,
      renderMode: s.renderMode || null,
      pageIndex: (P && P.getCurrentPageIndex) ? P.getCurrentPageIndex() : null,
      pagesLen: pages ? pages.length : null,
      // does the persisted scene record carry ANY id of its own?
      sceneKeys: scene ? Object.keys(scene).join(',') : null,
      fpDup: s._charLedgerLastFp === (plain.length + '::' + plain.slice(0, 48) + '::' + plain.slice(-48)),
      textLen: plain.length,
    });
    console.log('[PROBE] ' + JSON.stringify(window.__rows[window.__rows.length - 1]));
  };
});

// ── DRIVE. Seed a literary story, then exercise finalization + navigation directly.
//    We call the render path rather than clicking through the corridor: the question is
//    which identifiers exist AT THE HOOK, not whether the UI reaches it.
await page.evaluate(({ stub }) => {
  const s = window.state;
  s.storyId = 'probe_story_1';
  s.scenes = [];
  s.turnCount = 0;
  s.renderMode = 'literary';
  // Scene 1, mirroring _mountAndTransition's commit order (95730-95734)
  window.StoryPagination.addPage('<p>' + stub + '</p>', true);
  s.turnCount = 1;
  s.scenes.push({ title: 'Scene One', synopsis: '', text: stub, fateCard: null });
  window._updateCharacterDisclosureLedgerForCurrent();
  // Literary continuation, mirroring 287788 (turnCount++) then 288652 (addPage).
  // NOTE the asymmetry under test: no scenes.push on this path.
  s.turnCount++;
  window.StoryPagination.addPage('<p>' + stub + ' The second scene.</p>', true);
  window._updateCharacterDisclosureLedgerForCurrent();
}, { stub: STUB });

// Back-nav then forward-nav — does the hook re-fire, and does the weak fp guard hold?
await page.evaluate(() => {
  const P = window.StoryPagination;
  if (P.prevPage) P.prevPage(); else if (P.goToPage) P.goToPage(0);
});
await page.waitForTimeout(400);
await page.evaluate(() => {
  const P = window.StoryPagination;
  if (P.nextPage) P.nextPage(); else if (P.goToPage) P.goToPage(1);
});
await page.waitForTimeout(400);

// CG-shaped finalization: the hook as _renderStagedScene calls it (198584) — explicit
// plan-beat prose, and note _renderStagedScene does NOT receive sceneIndex.
await page.evaluate(({ stub }) => {
  const s = window.state;
  s.renderMode = 'staged_story_mode';
  s.turnCount = 5;                       // CG assigns (217917), it does not increment
  s.scenes.push({ title: '', synopsis: '', text: stub, fateCard: null });
  window._updateCharacterDisclosureLedgerForCurrent(stub + ' A CG beat.');
}, { stub: STUB });

const rows = await page.evaluate(() => window.__rows);
await page.evaluate(() => { window._updateCharacterDisclosureLedgerForCurrent = window.__origHook; });
await browser.close();

// ── REPORT ────────────────────────────────────────────────────────────────────
const paid = attempts.filter(a => a.paid);
console.log(`\n${'═'.repeat(88)}\nSCENE IDENTITY PROBE\n${'═'.repeat(88)}`);
console.log(`\n COST FENCE — ${attempts.length} request(s) intercepted at the network layer, 0 issued.`);
console.log(`   paid-endpoint attempts blocked: ${paid.length}`);
for (const a of paid) console.log(`     · ${a.method} ${a.url}`);
if (!attempts.length) console.log('   (none attempted)');

console.log('\n HOOK FIRINGS\n');
console.log('  # hook      scenesLen turnCount derived page pagesLen mode                fpDup');
console.log('  ' + '─'.repeat(84));
rows.forEach((r, i) => {
  console.log(`  ${i} ${r.hook.padEnd(9)} ${String(r.scenesLen).padStart(9)} ${String(r.turnCount).padStart(9)}`
    + ` ${String(r.derived).padStart(7)} ${String(r.pageIndex).padStart(4)} ${String(r.pagesLen).padStart(8)}`
    + ` ${String(r.renderMode).padEnd(19)} ${r.fpDup}`);
});

console.log('\n PERSISTED SCENE RECORD FIELDS (does an immutable id exist?):');
const keysets = [...new Set(rows.map(r => r.sceneKeys).filter(Boolean))];
for (const k of keysets) console.log(`   ${k}`);
console.log(`   → immutable id present: ${keysets.some(k => /\bid\b|uid|sceneId/.test(k)) ? 'YES' : 'NO'}`);

console.log('\n COLLISION CHECK — distinct scenes sharing a derived key:');
const byDerived = {};
rows.forEach((r, i) => (byDerived[r.derived] = byDerived[r.derived] || []).push(i));
const collisions = Object.entries(byDerived).filter(([, v]) => v.length > 1);
if (!collisions.length) console.log('   none');
for (const [k, v] of collisions) console.log(`   ✗ derived=${k} shared by firings ${v.join(', ')}`);

fs.writeFileSync('_scene_identity_probe.json', JSON.stringify({ rows, attempts }, null, 1));
console.log(`\n rows → _scene_identity_probe.json\n`);
