// BRINGING FIRST SACRIFICE UP TO ITS SCENE 1 → 2 SEAM. One implementation, used by the FS preflight
// and by the planner capture.
//
// Every step is a PRODUCTION function. The sequence was not guessed — it was found by driving the
// path with every /api/ call aborted and reading the app's own refusals:
//
//   _launchStarterStory(def)              displays the baked scene 1, UNCOMMITTED
//   _unlockBakedGenesis(how)              runs deferred setup, commits scene 1 as scenes[0],
//                                         unlocks Genesis. ZERO provider calls.
//   _finalizePreviewContinuation()        taste -> fling, previewActive -> false
//   _advanceStagedScene(act, dia)         REFUSES. On a baked Book with a declared axis it mounts
//                                         the decision prompt and requests NOTHING.
//   click #sceneDecisionA | #sceneDecisionB
//                                         the prompt's own handler records the choice through
//                                         _recordSceneDecision and fires the resume that
//                                         _advanceStagedScene handed it — so the continuation is
//                                         requested by production code
//
// The Fortune charge is the one thing skipped: it is in-app currency, not provider spend, and
// _unlockBakedGenesis is where both real unlock routes converge.
export const findFSDef = (page) => page.evaluate(() => {
  const list = window.STARTER_STORIES || {};
  const keys = Array.isArray(list) ? list.map((_, i) => i) : Object.keys(list);
  for (const k of keys) { const d = list[k]; if (d && d.id === 'starter_first_sacrifice') return d; }
  return null;
});

export const launchFS = async (page, def) => {
  await page.evaluate(async (d) => { try { await window._launchStarterStory(d); } catch (_) {} }, def);
  await page.waitForTimeout(6000);
  return page.evaluate(() => ({
    starterId: window.state._starterId || null,
    mountedAt: window.state._bakedScene1MountedAt || null,
    pendingText: (window.state._bakedPendingCommit || {}).text || null,
    turnCount: window.state.turnCount, sceneCount: (window.state.scenes || []).length,
    genesisUnlocked: !!window.state._bakedGenesisUnlocked,
    setupComplete: !!window.state._bakedSetupComplete,
    renderMode: window.state.renderMode || null, playerName: window.state.playerName || null
  }));
};

export const unlockFS = async (page, how) => {
  const r = await page.evaluate(async (h) => {
    try { return await window._unlockBakedGenesis(h); } catch (e) { return 'threw: ' + e.message; }
  }, how);
  await page.waitForTimeout(4000);
  const st = await page.evaluate(() => ({
    genesisUnlocked: !!window.state._bakedGenesisUnlocked,
    setupComplete: !!window.state._bakedSetupComplete,
    turnCount: window.state.turnCount, sceneCount: (window.state.scenes || []).length,
    scene0: String(((window.state.scenes || [])[0] || {}).text || '')
  }));
  return { returned: r, state: st };
};

export const finalizePreview = async (page) => {
  const before = await page.evaluate(() => ({
    previewActive: !!window.state.previewActive, storyLength: window.state.storyLength || null }));
  const ran = await page.evaluate(() => {
    if (typeof window._finalizePreviewContinuation !== 'function') return 'absent';
    try { window._finalizePreviewContinuation({ deferSave: true }); return true; }
    catch (e) { return 'threw: ' + e.message; }
  });
  const after = await page.evaluate(() => ({
    previewActive: !!window.state.previewActive, storyLength: window.state.storyLength || null }));
  return { ran, before, after };
};

export const readAxis = (page) => page.evaluate(() => {
  const ax = typeof window._sceneDecisionAxis === 'function' ? window._sceneDecisionAxis() : null;
  return ax ? { axis: ax.axis, a: { key: ax.a.key, label: ax.a.label },
    b: { key: ax.b.key, label: ax.b.label } } : null;
});

// The first advance, which is EXPECTED to refuse and mount the prompt. Returns what it mounted.
export const advanceExpectingGate = async (page, act, dia) => {
  await page.evaluate(({ a, d }) => {
    window._continuationProposalSchema = true;
    try { window._advanceStagedScene(a, d); }
    catch (e) { console.log('[STAGED] advance threw: ' + (e && e.message)); }
  }, { a: act, d: dia });
  await page.waitForTimeout(3000);
  return page.evaluate(() => {
    const el = document.getElementById('sceneDecisionPrompt');
    return { promptMounted: !!el,
      buttons: [!!document.getElementById('sceneDecisionA'), !!document.getElementById('sceneDecisionB')],
      resumed: !!(window.state._sceneDecisions || {})._resumed };
  });
};

// Click the real button. A playwright click is tried first; in a headless harness the host has no
// client rects (display:none — the baked opening is mounted without the reader chrome a real
// session has), so the fallback dispatches the SAME production handler in-page. Which route was
// taken is returned, never hidden.
export const chooseBranch = async (page, which) => {
  const id = which === 'B' ? '#sceneDecisionB' : '#sceneDecisionA';
  const diag = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    const host = document.getElementById('sceneDecisionPrompt');
    return { present: !!el, rects: el ? el.getClientRects().length : 0,
      hostDisplay: host ? getComputedStyle(host).display : null };
  }, id);
  let route = 'playwright';
  await page.click(id, { timeout: 8000 }).catch(async () => {
    route = 'in-page el.click() — host not rendered in this harness';
    await page.evaluate((sel) => { const b = document.querySelector(sel); if (b) b.click(); }, id);
  });
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => ({
    decision1: (window.state._sceneDecisions || {})['1'] || null,
    stillNeeded: typeof window._sceneDecisionNeeded === 'function'
      ? !!window._sceneDecisionNeeded() : 'absent',
    promptGone: !document.getElementById('sceneDecisionPrompt')
  }));
  return { route, diag, after };
};
