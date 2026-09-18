// BAKED IMAGE OCCURRENCE — structured renderer control (Roman, 2026-09-19)
//
// CORRECTION under test: baked scene images must NEVER reach the DOM as raw <img> markup embedded
// in story prose, even though formatStory() does not escape HTML by default. A dedicated structured
// renderer must build every <img> node itself from validated occurrence data (asset id, camera/crop
// declaration) — a model or prose field must never supply markup, a URL, or crop geometry.
//
// Proves, by REAL invocation of the production functions against the REAL First Sacrifice package
// (public/starter-scenes.js), never a hand-rolled substitute:
//   1. the real _bakedCGBody() text (what StoryPagination.addPage/formatStory actually receive) NEVER
//      contains an <img> tag or a `src=`/`http`/`data:` URL — no markup channel exists in the prose;
//   2. _validateImageOccurrence REJECTS an occurrence carrying a smuggled url/src field, or an
//      unapproved treatment value — the schema boundary actually bites;
//   3. the real First Sacrifice imageOccurrences table: asset identity, occurrence identity, and
//      quadrant are three distinct namespaces (9 occurrences over 5 assets — no ninth asset for the
//      Dohkar's interruption reuse);
//   4. with FAKE (test-only, locally-generated, zero-network) asset URLs seeded onto imageAssets,
//      _mountImageOccurrence produces a REAL <img> DOM node per occurrence, whose .src always traces
//      back to the resolved ASSET (never to occurrence/beat text), making ZERO /api/image requests
//      for the whole baked opening — including the quadrant crops (via the real _splitSheetQuadrants)
//      and the Dohkar's reused-asset close crop (via the real _deriveFromFrame);
//   5. an occurrence key with no url-bearing asset yet (today's real, unrendered state) mounts
//      nothing — no placeholder image, no markup fallback.
//
// usage: node _baked_image_occurrence_control.mjs
import { chromium } from 'playwright-core';
import fs from 'fs';
import { installSession, configBody, isAuthOrigin, installEntitledProfileStub, verifySubscriptionBody } from './_test_session_env.mjs';

const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail ? '  — ' + String(detail).slice(0, 900) : '')); };

const PASSTHROUGH = /\/api\/(config|geo|csp-report|beta-events)\b/;
const LOCAL_STUB = {
  '/api/consume-fortune':          { success: true, fortunesRemaining: 9999 },
  '/api/verify-subscription':      { success: true, subscribed: true, tier: 'sub' },
  '/api/claim-issue-number':       { success: true, issueNumber: 1 },
  '/api/refund-fortune':           { success: true },
  '/api/grant-welcome-milestone':  { success: true },
  '/api/record-legal-acceptance':  { success: true },
};
const imageRequests = [];

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
const consoleLines = [];
page.on('console', m => consoleLines.push(m.text()));

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
  if (PASSTHROUGH.test(url)) {
    if (/\/api\/config\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  }
  if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  if (/\/api\/verify-subscription\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(verifySubscriptionBody()) });
  const stub = Object.keys(LOCAL_STUB).find(x => p.startsWith(x));
  if (stub) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LOCAL_STUB[stub]) });
  if (/\/api\/image\b/.test(p)) {
    imageRequests.push({ url, t: Date.now() });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":false}' });
  }
  return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
});

console.log('\n' + '='.repeat(96) + '\nBAKED IMAGE OCCURRENCE — structured renderer control\n' + '='.repeat(96) + '\n');

const t0 = Date.now(); let up = false;
while (Date.now() - t0 < 120000 && !up) {
  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 20000 });
    await page.waitForFunction(() => window.state && window._mountImageOccurrence && window._validateImageOccurrence &&
      window._resolveImageOccurrenceUrl && window._mountBakedImageOccurrences && window._bakedCGBody &&
      window._bakedScene1For, null, { timeout: 60000 });
    up = true;
  } catch (_) { await page.waitForTimeout(3000); }
}
if (!up) { ok('server ready with real structured-renderer functions exposed', false); await browser.close(); process.exit(1); }
await page.waitForFunction(() => !document.body.classList.contains('booting'), null, { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(1000);

// ═══ PROOF 1: the real starter_first_sacrifice package's real _bakedCGBody() text carries no markup ═══
const bodyCheck = await page.evaluate(() => {
  const pkg = window._bakedScene1For && window._bakedScene1For("starter_first_sacrifice");
  if (!pkg) return { error: 'starter_first_sacrifice not found on window._bakedScene1For' };
  const displayBody = window._bakedCGBody(pkg, true);
  const contextBody = window._bakedCGBody(pkg, false);
  return {
    displayLen: displayBody.length, contextLen: contextBody.length,
    hasImgTag: /<img\b/i.test(displayBody) || /<img\b/i.test(contextBody),
    hasSrcAttr: /\bsrc\s*=/i.test(displayBody) || /\bsrc\s*=/i.test(contextBody),
    hasHttpUrl: /https?:\/\//i.test(displayBody) || /https?:\/\//i.test(contextBody),
    hasDataUrl: /data:image\//i.test(displayBody) || /data:image\//i.test(contextBody),
    sampleBracket: (displayBody.match(/\[[^\]]+\]/g) || []).slice(0, 3),
  };
});
ok('the real starter_first_sacrifice package is reachable on window._bakedScene1For', !bodyCheck.error, JSON.stringify(bodyCheck));
ok('the real _bakedCGBody() reading-copy text contains NO <img> tag (display and context bodies)', !bodyCheck.hasImgTag, JSON.stringify(bodyCheck));
ok('the real _bakedCGBody() text contains NO src= attribute', !bodyCheck.hasSrcAttr, JSON.stringify(bodyCheck));
ok('the real _bakedCGBody() text contains NO http(s) URL', !bodyCheck.hasHttpUrl, JSON.stringify(bodyCheck));
ok('the real _bakedCGBody() text contains NO data: image URL', !bodyCheck.hasDataUrl, JSON.stringify(bodyCheck));
ok('the reading copy still carries its existing bracket-label TEXT plates (unchanged, harmless plain text)', Array.isArray(bodyCheck.sampleBracket) && bodyCheck.sampleBracket.length > 0, JSON.stringify(bodyCheck.sampleBracket));

// ═══ PROOF 2: schema boundary — smuggled url/src field or unapproved treatment is REJECTED ═══
const schemaChecks = await page.evaluate(() => {
  const assetsById = { intro_dohkar: { id: 'intro_dohkar', kind: 'intro', url: 'data:image/png;base64,AAAA' } };
  const injected = window._validateImageOccurrence('x', { assetId: 'intro_dohkar', treatment: 'full', url: 'https://evil.example/steal.png' }, assetsById);
  const injectedSrc = window._validateImageOccurrence('x', { assetId: 'intro_dohkar', treatment: 'full', src: '<script>alert(1)</script>' }, assetsById);
  const badTreatment = window._validateImageOccurrence('x', { assetId: 'intro_dohkar', treatment: 'javascript:alert(1)' }, assetsById);
  const unknownAsset = window._validateImageOccurrence('x', { assetId: 'not_a_real_asset', treatment: 'full' }, assetsById);
  const quadrantOnIntro = window._validateImageOccurrence('x', { assetId: 'intro_dohkar', treatment: 'quadrant', quadrant: 0 }, assetsById);
  const goodOne = window._validateImageOccurrence('x', { assetId: 'intro_dohkar', treatment: 'full' }, assetsById);
  return { injected, injectedSrc, badTreatment, unknownAsset, quadrantOnIntro, goodOne };
});
ok('an occurrence carrying a smuggled `url` field is REJECTED (unapproved_occurrence_field)', !schemaChecks.injected.ok && /unapproved_occurrence_field/.test(schemaChecks.injected.reason), JSON.stringify(schemaChecks.injected));
ok('an occurrence carrying a smuggled `src` field is REJECTED (unapproved_occurrence_field)', !schemaChecks.injectedSrc.ok && /unapproved_occurrence_field/.test(schemaChecks.injectedSrc.reason), JSON.stringify(schemaChecks.injectedSrc));
ok('an occurrence with an unapproved treatment string is REJECTED', !schemaChecks.badTreatment.ok, JSON.stringify(schemaChecks.badTreatment));
ok('an occurrence pointing at an unknown assetId is REJECTED', !schemaChecks.unknownAsset.ok, JSON.stringify(schemaChecks.unknownAsset));
ok('a "quadrant" treatment on a non-sheet (intro) asset is REJECTED — quadrant only valid on a sheet asset', !schemaChecks.quadrantOnIntro.ok, JSON.stringify(schemaChecks.quadrantOnIntro));
ok('a genuinely valid occurrence is ACCEPTED', schemaChecks.goodOne.ok, JSON.stringify(schemaChecks.goodOne));

// ═══ PROOF 3: real First Sacrifice imageOccurrences — asset/occurrence/quadrant are 3 distinct namespaces ═══
const fsShape = await page.evaluate(() => {
  const pkg = window._bakedScene1For("starter_first_sacrifice");
  const assets = pkg.imageAssets || [];
  const occ = pkg.imageOccurrences || {};
  const occKeys = Object.keys(occ);
  const sheetOcc = occKeys.filter(k => occ[k].treatment === 'quadrant');
  const quadrants = sheetOcc.map(k => occ[k].quadrant).sort();
  return {
    assetCount: assets.length,
    occurrenceCount: occKeys.length,
    sheetAssetIds: [...new Set(sheetOcc.map(k => occ[k].assetId))],
    quadrants,
    dohkarReuse: pkg.oasHandoff && pkg.oasHandoff.interruptionPortrait,
    dohkarReuseAssetId: occ[pkg.oasHandoff && pkg.oasHandoff.interruptionPortrait] && occ[pkg.oasHandoff.interruptionPortrait].assetId,
  };
});
ok('First Sacrifice declares exactly 5 assets (4 intro + 1 shared sheet) — not 8 independent images', fsShape.assetCount === 5, JSON.stringify(fsShape));
ok('First Sacrifice declares exactly 9 occurrences over those 5 assets (4 intro + 4 quadrants + 1 Dohkar reuse)', fsShape.occurrenceCount === 9, JSON.stringify(fsShape));
ok('all 4 "quadrant" occurrences (d1-d4) point at the SAME single sheet asset — one asset, four occurrences', fsShape.sheetAssetIds.length === 1, JSON.stringify(fsShape));
ok('the 4 quadrant occurrences cover quadrants 0,1,2,3 exactly once each', JSON.stringify(fsShape.quadrants) === JSON.stringify([0, 1, 2, 3]), JSON.stringify(fsShape));
ok('the Dohkar interruption reuses his EXISTING intro_dohkar asset — no ninth asset created for it', fsShape.dohkarReuse === 'dohkar_interruption' && fsShape.dohkarReuseAssetId === 'intro_dohkar', JSON.stringify(fsShape));

// ═══ PROOF 4: with fake local asset URLs seeded, the structured mount produces real <img> nodes — ZERO /api/image requests ═══
const FAKE_SHEET_PNG = await page.evaluate(() => {
  const c = document.createElement('canvas'); c.width = 200; c.height = 200;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#e11'; ctx.fillRect(0, 0, 100, 100);
  ctx.fillStyle = '#1e1'; ctx.fillRect(100, 0, 100, 100);
  ctx.fillStyle = '#11e'; ctx.fillRect(0, 100, 100, 100);
  ctx.fillStyle = '#ee1'; ctx.fillRect(100, 100, 100, 100);
  return c.toDataURL('image/png');
});
const beforeMount = imageRequests.length;
const mountResult = await page.evaluate(async (fakeSheet) => {
  const pkg = JSON.parse(JSON.stringify(window._bakedScene1For("starter_first_sacrifice")));
  // Seed FAKE, locally-generated (zero-network) URLs onto the assets — simulating "art has been
  // baked" without any real generation call, so the full resolve+crop+mount pipeline can be
  // exercised end-to-end (this is exactly what happens once art is authored for real).
  pkg.imageAssets.forEach(a => { a.url = a.kind === 'sheet' ? fakeSheet : fakeSheet; });
  const host = document.createElement('div'); host.id = 'testBakedImages'; document.body.appendChild(host);
  const mounted = await window._mountBakedImageOccurrences(pkg, host);
  const imgs = Array.from(host.querySelectorAll('img')).map(im => ({ occ: im.dataset.occurrenceKey, asset: im.dataset.assetId, srcLen: im.src.length, srcIsDataUrl: im.src.indexOf('data:') === 0 }));
  // Also mount the Dohkar's reuse occurrence directly (not part of the beat sequence walk above).
  const portraitHost = document.createElement('div'); document.body.appendChild(portraitHost);
  const portraitEl = await window._mountImageOccurrence(portraitHost, pkg.oasHandoff.interruptionPortrait, pkg);
  return { mounted, imgs, portrait: portraitEl ? { occ: portraitEl.dataset.occurrenceKey, asset: portraitEl.dataset.assetId, srcIsDataUrl: portraitEl.src.indexOf('data:') === 0 } : null };
}, FAKE_SHEET_PNG);
const mountRequests = imageRequests.slice(beforeMount);
ok('mounting all real First Sacrifice beat-sequence occurrences (with seeded local asset urls) makes ZERO /api/image requests', mountRequests.length === 0, JSON.stringify(mountRequests));
ok('9 distinct occurrence keys walked from the real beat sequence + the Dohkar reuse all mounted a real <img> DOM node', mountResult.imgs.length === 8 && !!mountResult.portrait, JSON.stringify(mountResult));
ok('every mounted <img>.src is a real data: URL resolved from the ASSET registry (never equal to any occurrence/beat text)', mountResult.imgs.every(i => i.srcIsDataUrl) && mountResult.portrait && mountResult.portrait.srcIsDataUrl, JSON.stringify(mountResult));
ok('the Dohkar interruption portrait mounts from asset "intro_dohkar" under occurrence key "dohkar_interruption" (occurrence != asset)', mountResult.portrait && mountResult.portrait.occ === 'dohkar_interruption' && mountResult.portrait.asset === 'intro_dohkar', JSON.stringify(mountResult.portrait));

// ═══ PROOF 5: with NO asset urls (today's real, unrendered state) — nothing mounts, no placeholder markup ═══
const beforeUnrendered = imageRequests.length;
const unrenderedResult = await page.evaluate(async () => {
  const pkg = window._bakedScene1For("starter_first_sacrifice"); // real package, url:null on every asset today
  const host = document.createElement('div'); document.body.appendChild(host);
  const mounted = await window._mountBakedImageOccurrences(pkg, host);
  return { mounted, imgCount: host.querySelectorAll('img').length, innerHTML: host.innerHTML };
});
const unrenderedRequests = imageRequests.slice(beforeUnrendered);
ok('mounting the REAL, today-unrendered First Sacrifice package (every asset url:null) makes ZERO /api/image requests', unrenderedRequests.length === 0, JSON.stringify(unrenderedRequests));
ok('an unrendered package mounts ZERO <img> nodes — no placeholder image, no markup fallback', unrenderedResult.imgCount === 0 && unrenderedResult.innerHTML === '', JSON.stringify(unrenderedResult));

const err = await page.evaluate(() => window.__err || null);
await browser.close();

console.log('\n' + '-'.repeat(96));
console.log(' page error: ' + (err || 'none'));
console.log(' total /api/image requests observed this run: ' + imageRequests.length);
console.log('\nBAKED IMAGE OCCURRENCE CONTROL: ' + results.filter(r => r.pass).length + '/' + results.length + ' passed');
const allPass = results.every(r => r.pass);
process.exitCode = allPass ? 0 : 1;
