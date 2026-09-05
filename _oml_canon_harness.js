// Old Man Logan — Famous Fate 5-scene canon-fidelity harness.
// Drives the REAL FF classifier + generation pipeline headless (partner=canonical, period=canon).
// Verifies: LI casts to Maureen (not "raider widow"), opening villain stays Hulk Gang (not Ultron),
// axis expansion is 1st-person, closing decision intact, length >= ~650w, no non-canon drift.
// Image APIs are blocked (not under test). Costs real LLM $ across ~5 scenes.
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = '/tmp/oml_result.json';
const LOG = '/tmp/oml_console.log';
const N_SCENES = parseInt(process.env.N || '5', 10);
function log(...a){ console.error(...a); }

// Say/Do inputs — restrained + canon-consistent so we test whether the ENGINE holds canon (not force it).
const INPUTS = [
  // DIVERGENCE FIRST — the vow (claws_sheathed) is now live at beat 1, so popping the claws here flips it →
  // the causal engine must react (pivot). The [FF-CAUSAL] resolution logs on SUBMIT, before prose renders,
  // so a flaky scene-2 capture can't hide it. This is the live divergence test.
  { say: "No. Not this time. No more running.", do: "I unsheathe my claws and tear into the Hulk Gang, killing them where they stand in the yard." },
  { say: "It's done.",                          do: "I stand over the bodies in the ruined yard, claws still out." },
  { say: "We move.",                            do: "I gather my family to flee before Banner sends more." },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  // Block image gen — not under test, saves $ + time.
  for (const pat of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images','**/api/replicate**','**/api/fal**'])
    await page.route(pat, r => r.fulfill({ status:500, contentType:'application/json', body:'{"error":"blocked"}' }));

  const all = [];
  const KEEP = /\[(FF-CAUSAL|FF-CANON|FF-CASTING|FF-ROMANCE-PROFILE|FF-WORLDARC|FF-CRISIS|FF-CONTRACT|FF-LOC|AXIS|SCENE1|OPENING:TEMP|PROSE:CANONICAL:FAST|CALCIFIED-MOVE|PACING AUDIT|PASS4|STRATEGY_PASS|A-PLOT|SOCIAL-ECO|R-PLOT|SCENE-AUDIT|PREWRITE|MODEL:SERVED|ADAPTIVE LENGTH|PHRASE-MARKER|BeginStory|FAMOUS-FATE)/i;
  page.on('console', m => {
    const t = m.text();
    all.push(t);
    if (KEEP.test(t)) log('  >', t.slice(0, 200));
  });
  page.on('pageerror', e => { all.push('PAGEERR ' + e.message); log('  !! PAGEERR', e.message.slice(0,160)); });

  log('[H] loading…');
  await page.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await page.waitForFunction(() => window.state && typeof window.handleBeginStory==='function'
    && typeof window._classifyFamousFate==='function', { timeout:45000 });
  await page.waitForTimeout(800);

  // Dev bypass + entitlements + scene-prose capture hook.
  await page.evaluate(() => {
    const s = window.state;
    window._devBypass = true; window._forceAudits = true;
    s.subscribed = true; s.access = 'sub'; s.fortunes = 9999999; s.tier = 'free';
    // Robust capture (deduped): the gravity-audit hook fires reliably for scene 1 but is skipped on scene 2+
    // (the capture gap), so ALSO poll state.scenes[] (the canonical per-scene store) for 2+. Dedup by prose head.
    window.__scenes = []; window.__seen = {};
    window.__cap = function (text, tc) { try { text = String(text || ''); if (text.length < 150) return; var key = text.slice(0, 90); if (window.__seen[key]) return; window.__seen[key] = 1; window.__scenes.push({ text: text, tc: (tc || 0) }); } catch (_) {} };
    window._auditSceneEmotionalGravity = function (pr) { try { window.__cap(pr, window.state.turnCount || 0); } catch (_) {} return Promise.resolve(null); };
    setInterval(function () { try { ((window.state && window.state.scenes) || []).forEach(function (sc) { window.__cap(sc && sc.text, 0); }); } catch (_) {} }, 1000);
  });

  // Leave library-first onboarding → authorship corridor (where the FF card lives).
  log('[H] → authorship (showScreen setup) …');
  await page.evaluate(() => { try { window.showScreen('setup'); } catch(e){ console.log('SHOWSCREEN-ERR '+(e&&e.message)); } });
  await page.waitForTimeout(1500);

  // Open the Famous Fate form directly (the card click gates behind an acknowledgement modal;
  // set the ack flag + unhide the overlay — the Begin handler reads the fields directly).
  log('[H] opening Famous Fate form …');
  await page.evaluate(() => {
    try { window.state.famousFateAcknowledged = true; } catch(_){}
    document.getElementById('famousFateForm')?.classList.remove('hidden');
  });
  await page.waitForFunction(() => {
    const w = document.getElementById('famousFateWorld');
    return w && w.offsetParent !== null; // form visible
  }, { timeout: 15000 }).catch(()=>log('  .. FF form never became visible'));
  await page.waitForTimeout(500);

  // Fill the FF form + select canon period + canonical partner, then Begin.
  log('[H] submitting Famous Fate: Old Man Logan / Logan / canon / canonical partner …');
  await page.evaluate(() => {
    const set = (id, v) => { const el = document.getElementById(id); if (el){ el.focus(); el.value = v; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); } };
    set('famousFateWorld', 'Old Man Logan');
    set('famousFateEmbody', 'Logan');
    set('famousFateStoryWish', 'Revenge');
    document.querySelector('.famous-fate-period-btn[data-period="canon"]')?.click();
    const pm = document.querySelector('input[name="ffPartnerMode"][value="canonical"]'); if (pm){ pm.checked = true; pm.dispatchEvent(new Event('change',{bubbles:true})); }
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => { document.getElementById('famousFateBegin')?.click(); });

  // Wait for the FF classifier to resolve → fateMode flips to famous_fate + picks become PostApocalyptic.
  log('[H] awaiting FF classify + resolve (up to 120s) …');
  await page.waitForFunction(() => {
    const s = window.state;
    return s && s.fateMode === 'famous_fate' && s.picks && /postapoc/i.test(String(s.picks.world||''));
  }, { timeout: 120000 }).catch(()=>log('  .. FF resolve wait TIMED OUT'));
  const rez = await page.evaluate(()=>({ mode:window.state.fateMode, world:window.state.picks&&window.state.picks.world, partner:window.state.partnerName, li:window.state.loveInterestName }));
  log('[H] resolved:', JSON.stringify(rez));

  // FF auto-plays the corridor after resolve; wait for it to complete, then begin.
  log('[H] awaiting corridor autoplay complete …');
  await page.waitForFunction(() => document.body.classList.contains('corridor-complete')
    || (window.state && window.state._corridorComplete), { timeout: 60000 }).catch(()=>log('  .. corridor-complete not observed (continuing)'));
  await page.waitForTimeout(1500);

  log('[H] begin story …');
  await page.evaluate(() => { try { if (!(window.state && window.state.turnCount > 0)) window.handleBeginStory(); } catch(e){ console.log('BEGIN-ERR ' + (e&&e.message)); } });

  const snap = () => page.evaluate(()=>{ const s=window.state, arr=window.__scenes||[], last=arr[arr.length-1]||{}, fc=s.ffContract||{};
    return { n:arr.length, busy:!!(s._isAdvancingScene||s._stagedSubmitting||s._stagedAwaitingProse||s._beginStoryInProgress),
             lastLen:(last.text||'').length, tc:s.turnCount||0,
             partner:s.partnerName||s.loveInterestName||'', antag:(s.aPlot&&s.aPlot.antagonistOrAntiForce)||'',
             split:!!fc.canonActSplit, act:fc.canonAct||1, actBounds:fc.canonActBounds||{}, beat:s._ffCanonBeatIndex||1,
             atBoundary:!!(typeof window._ffAtActBoundary==='function' && window._ffAtActBoundary()), issue:s.issueIndexInRun||1 }; });

  // Poll until scene N is captured + stable.
  async function waitScene(targetN, budgetMs){
    const t0=Date.now(); let lastLen=-1, stable=0;
    while (Date.now()-t0 < budgetMs){
      const st = await snap();
      if (st.n>=targetN && !st.busy && st.lastLen>150){
        if (st.lastLen===lastLen){ stable+=3000; if (stable>=9000) return st; }
        else { lastLen=st.lastLen; stable=0; }
      }
      await page.waitForTimeout(3000);
    }
    return null;
  }

  log('[H] awaiting scene 1 (up to 6min) …');
  let ok = await waitScene(1, 360000);
  if (!ok){ log('[H] SCENE 1 NEVER LANDED'); }
  else log('[H] scene 1 landed:', JSON.stringify(ok));

  // Advance scenes 2..N via say/do.
  for (let t=2; ok && t<=N_SCENES; t++){
    // At an ACT boundary (Act N canon complete) → advance to the next act/issue BEFORE submitting,
    // so canon continues into the next act (dev-bypass makes the continuation free).
    const boundary = await page.evaluate(()=>{
      try {
        if (typeof window._ffAtActBoundary==='function' && window._ffAtActBoundary()){
          const adv = (typeof window._ffAdvanceToNextAct==='function') && window._ffAdvanceToNextAct();
          if (adv){ const s=window.state; s.issueIndexInRun=(Number.isInteger(s.issueIndexInRun)&&s.issueIndexInRun>0?s.issueIndexInRun:1)+1;
            return { advanced:true, act:(s.ffContract&&s.ffContract.canonAct), issue:s.issueIndexInRun, beat:s._ffCanonBeatIndex }; }
        }
      } catch(e){ return { err:e.message }; }
      return { advanced:false };
    });
    if (boundary.advanced) log(`  [H][ACT-BOUNDARY] Act 1 canon complete → advanced to ACT ${boundary.act} / issue ${boundary.issue} (beat cursor ${boundary.beat})`);
    else if (boundary.err) log(`  [H][ACT-BOUNDARY] check threw: ${boundary.err}`);

    const inp = INPUTS[(t-2) % INPUTS.length];
    log(`[H] → scene ${t} (say="${inp.say.slice(0,40)}") …`);
    await page.evaluate((a)=>{
      const setV=(id,v)=>{ const el=document.getElementById(id); if(el){ el.value=v; el.dispatchEvent(new Event('input',{bubbles:true})); } };
      setV('actionInput', a.do); setV('dialogueInput', a.say);
      document.getElementById('submitBtn')?.click();
    }, inp);
    ok = await waitScene(t, 300000);
    if (!ok){ log(`[H] scene ${t} FAILED to land`); break; }
    log(`[H] scene ${t} landed:`, JSON.stringify(ok));
  }

  const scenes = await page.evaluate(()=> (window.__scenes||[]).map(s=>({ text:s.text, tc:s.tc })));
  fs.writeFileSync(OUT, JSON.stringify({ scenes, ts:Date.now() }, null, 2));
  fs.writeFileSync(LOG, all.join('\n'));
  log(`[H] DONE — ${scenes.length} scene(s). result=${OUT} console=${LOG}`);
  await browser.close();
  process.exit(0);
})().catch(e => { log('[H] FATAL', e && e.stack || e); try{ fs.writeFileSync(LOG, (e&&e.stack||String(e))); }catch(_){}; process.exit(1); });
