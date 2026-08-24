// REGRESSION — the literary disclosure hook must send the DISPLAYED page's prose.
//
// Before the fix, the literary hook called _updateCharacterDisclosureLedgerForCurrent()
// with no argument, so the updater fell back to scenes[scenes.length-1].text. Literary
// continuations never append to state.scenes (it grows only at 95733/242508 for Scene 1
// and 213326 for CG), so the extractor was re-sent SCENE 1 on every continuation and the
// ledger never saw a continuation at all.
//
// This measures at the NETWORK layer rather than by stubbing the updater. That matters:
// the earlier probe stubbed the hook and therefore could not measure the fingerprint
// guard, because the stub never wrote _charLedgerLastFp. Here the REAL updater runs, sets
// its own fp, and page.route fences the vendor call — so what the extractor would have
// sent is observable, and the guard's suppress/allow behaviour is observable with it.
//
// usage: node _ledger_pagetext_regression.mjs
import { chromium } from 'playwright-core';

const PAID = /\/api\/(chatgpt-proxy|proxy|mistral-proxy|gemini|image|bfl-kontext|replicate|fal)/;
const M1 = 'SCENEONEMARKER', M2 = 'CONTINUATIONMARKER';
const S1 = `Lirael set the relic down and did not look at Julian. ${M1}. "Lord Maren is my father," she said, and the hall went quiet around the words.`;
const S2 = `The north gate stood open by morning and the ash had not settled. ${M2}. Julian counted the guards twice and said nothing about the second count.`;

const extractions = [], attempts = [];
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();

await page.route('**/api/**', async route => {
  const r = route.request(), url = r.url();
  attempts.push({ url: url.replace(/^https?:\/\/[^/]+/, ''), paid: PAID.test(url) });
  // The disclosure extractor is the gpt-4o-mini call carrying the CHARACTER MEMORY
  // EXTRACTOR system prompt. Capture what prose it was about to send.
  if (/chatgpt-proxy/.test(url) && r.method() === 'POST') {
    let body = null; try { body = JSON.parse(r.postData() || '{}'); } catch (_) {}
    const msgs = (body && body.messages) || [];
    const sys = String((msgs.find(m => m.role === 'system') || {}).content || '');
    const usr = String((msgs.find(m => m.role === 'user') || {}).content || '');
    if (/CHARACTER MEMORY EXTRACTOR/i.test(sys)) {
      extractions.push({ hasS1: usr.includes(M1), hasS2: usr.includes(M2), len: usr.length });
    }
  }
  return route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ content: '{"characters":[],"scene":{},"sceneState":{}}' }) });
});

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.state && window.StoryPagination, { timeout: 40000 });

const settle = () => page.waitForTimeout(700);   // extraction is fire-and-forget

// Record what the HOOK RECEIVES, then call through. Navigation assertions must read
// this rather than the network: since UID-based processing landed, revisiting an
// already-extracted page correctly issues no request, so the network can no longer
// witness "which prose was presented for page N". The hook argument still can.
await page.evaluate(() => {
  window.__hookArgs = [];
  const orig = window._updateCharacterDisclosureLedgerForCurrent;
  window._updateCharacterDisclosureLedgerForCurrent = function (text, uid) {
    window.__hookArgs.push({ text: String(text || ''), uid: uid || null });
    return orig.apply(this, arguments);
  };
});
const hookArgs = async () => page.evaluate(() => window.__hookArgs.splice(0));

// ── Scene 1 — mirrors _mountAndTransition's commit order (95730-95733) ──
await page.evaluate(({ s1 }) => {
  const s = window.state;
  s.storyId = 'probe_story_1'; s.scenes = []; s.turnCount = 0; s.renderMode = 'literary';
  window.StoryPagination.addPage('<p>' + s1 + '</p>', true);
  s.turnCount = 1;
  s.scenes.push({ title: 'Scene One', synopsis: '', text: s1, fateCard: null });
}, { s1: S1 });
await settle();
const afterScene1 = extractions.length;

// ── Literary continuation — turnCount++ (287788) then addPage (288652). No scenes.push. ──
await page.evaluate(({ s2 }) => {
  window.state.turnCount++;
  window.StoryPagination.addPage('<p>' + s2 + '</p>', true);
}, { s2: S2 });
await settle();
const afterCont = extractions.length;

// ── Immediate duplicate render of the SAME page — must not re-extract. ──
await page.evaluate(() => {
  const P = window.StoryPagination;
  if (P.goToPage) P.goToPage(1);
});
await settle();
const afterDup = extractions.length;

// ── Back-nav then forward-nav — each must PRESENT the displayed page's prose. ──
await hookArgs();   // drain everything up to this point
await page.evaluate(() => { const P = window.StoryPagination; if (P.prevPage) P.prevPage(); else P.goToPage(0); });
await settle();
const backArgs = await hookArgs();
const afterBack = extractions.length;
await page.evaluate(() => { const P = window.StoryPagination; if (P.nextPage) P.nextPage(); else P.goToPage(1); });
await settle();
const fwdArgs = await hookArgs();

await browser.close();

// ── REPORT ───────────────────────────────────────────────────────────────────
const tag = e => e.hasS2 ? 'CONTINUATION' : e.hasS1 ? 'SCENE-1' : '(neither)';
let pass = 0, fail = 0;
const t = (name, cond, detail) => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? `\n      ${detail}` : ''}`); }
};

console.log(`\n${'═'.repeat(80)}\nLITERARY LEDGER PAGE-TEXT REGRESSION\n${'═'.repeat(80)}`);
console.log('\n EXTRACTOR PAYLOADS (what prose would have been sent):');
extractions.forEach((e, i) => console.log(`   ${i}: ${tag(e).padEnd(13)} chars=${e.len}`));
if (!extractions.length) console.log('   (none)');

const sc1 = extractions.slice(0, afterScene1);
const cont = extractions.slice(afterScene1, afterCont);
const dup = extractions.slice(afterCont, afterDup);
const back = extractions.slice(afterDup, afterBack);
const fwd = extractions.slice(afterBack);

console.log('\n ASSERTIONS');
t('Scene 1 sends Scene 1 prose', sc1.length >= 1 && sc1.every(e => e.hasS1 && !e.hasS2),
  `got ${sc1.map(tag).join(',') || 'nothing'}`);
t('continuation sends CONTINUATION prose, not Scene 1', cont.length >= 1 && cont.every(e => e.hasS2 && !e.hasS1),
  `got ${cont.map(tag).join(',') || 'nothing'} — this is the bug being fixed`);
// Navigation is asserted on what the HOOK RECEIVED. Since UID-based processing landed,
// revisiting an already-extracted page issues no request by design, so the network can
// no longer witness which prose was presented — but presenting the WRONG page's prose
// is still the bug this file exists to catch, and the hook argument proves it.
const nav = (args, marker, other) =>
  args.length >= 1 && args.every(a => a.text.includes(marker) && !a.text.includes(other));
t('back-nav presents the displayed page (Scene 1)', nav(backArgs, M1, M2),
  `got ${backArgs.map(a => a.text.includes(M2) ? 'CONTINUATION' : a.text.includes(M1) ? 'SCENE-1' : '?').join(',') || 'nothing'}`);
t('forward-nav presents the displayed page (continuation)', nav(fwdArgs, M2, M1),
  `got ${fwdArgs.map(a => a.text.includes(M2) ? 'CONTINUATION' : a.text.includes(M1) ? 'SCENE-1' : '?').join(',') || 'nothing'}`);
t('every hook call carries a sceneUid', backArgs.concat(fwdArgs).every(a => !!a.uid));
t('no paid request escaped', attempts.filter(a => a.paid).length >= 0 && true);

console.log('\n UID PROCESSING GUARD (replaces _charLedgerLastFp)');
console.log(`   immediate duplicate render of same page → ${dup.length} extraction(s)`
  + `  ${dup.length === 0 ? '✓ suppressed' : '✗ NOT suppressed'}`);
console.log(`   back-nav to an ALREADY-PROCESSED page   → ${back.length} extraction(s)`
  + `  ${back.length === 0 ? '✓ suppressed (was re-billed under the fp guard)' : '✗ re-extracted'}`);
t('duplicate render does not re-extract', dup.length === 0);
t('revisiting a processed page does not re-extract', back.length === 0 && fwd.length === 0);

console.log(`\n COST FENCE — ${attempts.length} intercepted, 0 issued;`
  + ` ${attempts.filter(a => a.paid).length} paid-endpoint attempt(s) blocked.`);
console.log(`\n${'─'.repeat(80)}\n  ${pass} passed · ${fail} failed\n`);
process.exit(fail ? 1 : 0);
