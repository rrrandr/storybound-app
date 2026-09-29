import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from '/Users/romantsukerman/storybound-app/_e2e_network_gate.mjs';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();
  const consoleLines = [];
  page.on('console', (msg) => { const t = msg.text(); consoleLines.push(t); });
  const gate = await installFailClosedNetworkGate(page, {});
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.state && typeof window._renderBakedScene1 === 'function' && typeof window._runCGScreenplayGen === 'function', { timeout: 30000 });

  gate.stub('/api/mistral-proxy', async () => ({ content: null }));
  gate.stub('/api/proxy', async (req) => {
    let b = null; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
    const sysMsg = (b.messages||[]).find(m=>m.role==='system');
    const sysText = sysMsg ? sysMsg.content : '';
    const wantsLO = /"reserved" MUST be an object containing EVERY ONE of these exact keys/.test(sysText);
    if (!wantsLO) {
      // author-ish or something else - return minimal beats
      return { content: JSON.stringify({ beats: [{idx:0,kind:'narration',text:'x',speaker:null,tension_state:'composed'}], visualState:{}, is_consummate_scene:false, hardBeats:[] }) };
    }
    // planner - just return empty to let it fall through / fail gracefully, we only care about the mint tracking here
    return { content: JSON.stringify({ hardBeats: [] }) };
  });

  await page.evaluate(() => {
    window.state.storyId = 'probe-stale-2';
    window.state.picks = { world: 'Fantasy', worldSubtype: 'the_fair_folk', tone: 'Earnest', intensity: 'Steamy', identity: { playerName: 'Lirael', partnerName: 'Julian' } };
    window.state.gender = 'Female'; window.state.loveInterest = 'Male'; window.state.authorPronouns = 'She/Her';
    window.state.renderMode = 'staged_story_mode'; window.state.currentEngine = 'graphic';
    window.state.turnCount = 0; window.state.scenes = [];
    window.state._starterId = 'starter_first_sacrifice';
    window.state._pcLookSkipped = true; window.state._bakedGenesisUnlocked = true;
    window._devBypass = true; window.state._intimacyDevMode = true;
    const pkg = window._bakedScene1For('starter_first_sacrifice');
    window._renderBakedScene1({ id: 'starter_first_sacrifice' }, pkg);

    window._plotContractKill = false;
    window.state.loveInterestName = 'Julian';
    window.state.playerName = 'Lirael';
    window.state.currentPrimaryLiId = 'julian';
    window.state._temptFateDurableConsequences = [];
    window.state._temptOutcomeCommittedProposals = {};
    window.state._cgDeliveredAssignments = null;
    window.state.volatility_window = { active: false, severity: 0, remaining_scenes: 0 };
    window.state.consecutive_tempt_fate_count = 0;
    window.state.aPlot = { goal: 'stub goal' };
    window.state._sceneStateCard = {};
    window.state.rPlot = {};
    window.state.cgScaffold = { _stub: true, storyId: window.state.storyId };
    window.state.pcBodyBible = { _stub: true };
    window.state.liBodyBible = { _stub: true };
    window.state.antagonistBodyBible = { _stub: true };

    // TRAP writes to state._cgDeliveredAssignments
    window.__mintWriteLog = [];
    let _backing = window.state._cgDeliveredAssignments;
    Object.defineProperty(window.state, '_cgDeliveredAssignments', {
      get() { return _backing; },
      set(v) {
        window.__mintWriteLog.push({ at: Date.now(), attemptId: v && v.attemptId, reason: v && v.reason, stack: (new Error()).stack.split('\n').slice(1,6).join(' | ') });
        _backing = v;
      },
      configurable: true
    });

    window.state.tempt_fate_invoked_this_turn = true;
    window.state.temptFateWish = 'everyone forgets the ceremony happened';
    window._recordTemptFateEvent('everyone forgets the ceremony happened');
  });

  const result = await page.evaluate((si) => window._runCGScreenplayGen(si, 'she steps back', ''), 1);
  const writeLog = await page.evaluate(() => window.__mintWriteLog);
  console.log('RESULT:', JSON.stringify(result).slice(0, 300));
  console.log('WRITE LOG (' + writeLog.length + ' writes):');
  writeLog.forEach((w,i) => { console.log('  #' + i, 'attemptId=' + w.attemptId, 'reason=' + w.reason, 'at=' + w.at); console.log('    ' + w.stack.replace(/\n/g,' | ')); });

  await browser.close();
})().catch(e => { console.error('ERR', e && e.stack || e); process.exit(1); });
