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

// THE OAS IS A REQUIRED PART OF THE OPENING, and the corpus run skipped it.
//
// _renderBakedScene1 mounts #bakedOASEnterBtn for a CG package that declares
// endsAt:'oas_interrupt'. Tapping it runs _bakedGenesisGate, whose onUnlocked callback is what
// calls _initIntimacyDialogue. My sequence called _unlockBakedGenesis DIRECTLY, so the gate never
// fired its callback and the one-on-one never opened: the issue began from a truncated opening,
// and Scene 2 never saw the OAS history. With Genesis already unlocked the gate returns false and
// the handler falls through to _initIntimacyDialogue, which is the production path post-unlock.
export const enterOAS = async (page, opts) => {
  const o = opts || {};
  // ── TWO ENTRANCES (2026-10-06) ───────────────────────────────────────────────────────────────
  // The First Sacrifice opening no longer has a standalone Continue: the authored page ends on
  // Julian's question, and the reader ENTERS BY ANSWERING IT — Examine the cards (optional), then
  // Say/Do, then Submit. That submission IS the first OAS turn. Every other package still mounts
  // #bakedOASEnterBtn, so both are handled here and the caller is told which it used, and whether
  // a first turn was consumed, since that shifts turn accounting by one.
  const which = await page.evaluate(() => ({
    legacy: !!document.getElementById('bakedOASEnterBtn'),
    entrance: !!document.getElementById('bakedOASSubmitBtn')
  }));
  if (!which.legacy && !which.entrance) {
    return { ok: false, why: 'neither #bakedOASEnterBtn nor #bakedOASSubmitBtn is mounted' };
  }
  let route = 'playwright';
  let firstTurnConsumed = false;
  let submitAt = null;
  if (!which.legacy) {
    const say = o.say != null ? String(o.say) : 'I shaped nothing. Ask me properly.';
    const doText = o.doText != null ? String(o.doText) : '';
    // EXAMINE BY TRUSTED CLICK, and the answer by REAL TYPING. Both used to go through
    // page.evaluate — an in-page click and a direct value assignment — which demonstrate handlers,
    // not that a reader can reach the control or type into the field.
    try {
      await page.click('#bakedOASExamineBtn', { timeout: 8000 });
    } catch (e) {
      return { ok: false, route: 'examine REFUSED',
               why: 'the Examine control was not clickable: ' + String(e.message).split('\n')[0],
               firstTurnConsumed: false, submitAt: null };
    }
    await page.waitForTimeout(o.examineMs || 1200);
    for (const [sel, text] of [['#bakedOASSay', say], ['#bakedOASDo', doText]]) {
      if (!text) continue;
      try {
        await page.click(sel, { timeout: 8000 });
        await page.keyboard.press('Meta+a');
        await page.keyboard.type(text, { delay: 4 });
      } catch (e) {
        return { ok: false, route: 'typing REFUSED',
                 why: sel + ' was not typable: ' + String(e.message).split('\n')[0],
                 firstTurnConsumed: false, submitAt: null };
      }
    }
    route = 'entrance submit (trusted click)';
    // STAMPED IMMEDIATELY BEFORE THE CLICK, so the caller can measure Submit -> visibly rendered
    // reply without any of this helper's settling delay.
    // THE OBSERVER GOES IN BEFORE THE CLICK, recording the first appearance of text that is not
    // already on screen — so the measurement cannot latch onto the authored opening.
    await page.evaluate(() => {
      try {
        window.__sbProseAppearedAt = null;
        const hosts = ['intimacyDialogueStage', 'gnPanelDisplay', 'storyContent']
          .map((id) => document.getElementById(id)).filter(Boolean);
        const baseline = new Set();
        hosts.forEach((h) => String(h.textContent || '').split(/\n+/)
          .forEach((l) => { const t = l.trim(); if (t.length > 20) baseline.add(t); }));
        const check = () => {
          for (const h of hosts) {
            if (!h || h.getClientRects().length === 0) continue;
            const lines = String(h.textContent || '').split(/\n+/);
            for (const l of lines) {
              const t = l.trim();
              if (t.length > 20 && !baseline.has(t)) {
                window.__sbProseAppearedAt = Date.now();
                if (window.__sbProseObs) { window.__sbProseObs.disconnect(); window.__sbProseObs = null; }
                return;
              }
            }
          }
        };
        window.__sbProseObs = new MutationObserver(check);
        hosts.forEach((h) => window.__sbProseObs.observe(h,
          { childList: true, subtree: true, characterData: true }));
      } catch (_) {}
    });
    submitAt = Date.now();
    try {
      await page.click('#bakedOASSubmitBtn', { timeout: 8000 });
    } catch (e) {
      return { ok: false, route: 'entrance submit REFUSED',
               why: 'the entrance Submit was not clickable: ' + String(e.message).split('\n')[0],
               firstTurnConsumed: false, submitAt: submitAt };
    }
    firstTurnConsumed = true;
  } else {
    await page.click('#bakedOASEnterBtn', { timeout: 8000 }).catch(async () => {
      route = 'in-page el.click() — host not rendered in this harness';
      await page.evaluate(() => { const b = document.getElementById('bakedOASEnterBtn'); if (b) b.click(); });
    });
  }
  await page.waitForTimeout(o.settleMs || 6000);
  return page.evaluate(() => ({
    ok: true,
    dialogueActive: !!(window.state._intimacyDialogue || window.state._intimacyActive
      || window.state.intimacyDialogue),
    consumeFn: typeof window._intimacyDialogueConsumeInput === 'function',
    interruptionRecord: !!window.state._intimateInterruption,
    oasPlanPending: !!window.state._bakedPendingOASPlan,
    sceneDecisionNeeded: typeof window._sceneDecisionNeeded === 'function'
      ? !!window._sceneDecisionNeeded() : null
  })).then(r => Object.assign(r, { route, firstTurnConsumed, submitAt }));
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
