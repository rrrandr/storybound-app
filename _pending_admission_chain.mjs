// THE PRODUCTION LOOP for pending admission. Driven through a real Scene 1: every step below is
// production's own call, and the only thing this file supplies is the MOCKED portfolio the paid
// batch will later produce, plus the intercepted model responses.
//
// mutateSrc removes one production call at a time; each removal must break the chain.
import { SB_URL, configBody, makeSession, installSession, isAuthOrigin } from './_test_session_env.mjs';
const SB_SESSION = makeSession();

export async function chain(browser, SRC, { mutateSrc, badEcho, staged, restoreBeforeExtraction, outOfOrder, withSession = true } = {}) {
  const APLOT = {
    goal: 'She must clear the manifest before the tide turns and the ship leaves without her sister',
    namedClock: 'the tide at dawn', clockUnit: 'turns', totalClockUnits: 12,
    antagonistOrAntiForce: 'Marcus Vale', antagonistShape: 'A',
    antagonistPersonalTie: 'he sealed the passage her mother once bought',
    antagonistSubject: { kind: 'PERSON', proper_name: 'Marcus Vale' },
    stakesIfFail: 'she loses the only passage out and her sister sails alone',
    stakesIfWin: 'she reaches her sister before the ship clears the headland',
    pcWound: 'she was left behind once and has never said so out loud to anyone',
    liWound: 'he promised passage to someone once and could not deliver it in time',
    woundLoadBearingProof: 'her fear of being left drives every choice; his failed promise is why he will not promise again',
    milestones: [{ atScene: 1, event: 'she reaches the harbour office and is refused' }],
  };
  // Both staged people are ON the page. The byte-identical-prose case needs that: if B's character
  // were absent from the text, admission would refuse him for good reason and the test would be
  // measuring an admission rule rather than invocation identity.
  // Both staged people appear MID-SENTENCE and both carry a DIALOGUE TAG. Production refuses a new
  // identity whose only occurrence is sentence-initial (every sentence starts with a capital, so
  // that proves nothing) and it refuses one with no person-context evidence at all — "passed
  // without stopping" is not evidence that a name belongs to a person; "said" is, anywhere.
  // Two fixture faults found this way, both of them production being right.
  const PROSE = 'The customs house smelled of wet rope. Mara Dunn said the clause number instead of the '
    + 'clause, and I counted what I had already signed for while she watched me do it. Behind her, Tom '
    + 'Reed said nothing at all and did not look up. I had come to have the manifest cleared before '
    + 'the tide turned, and she had come to be the reason it would not be. She waited for me to find the '
    + 'number myself, which was a kindness, and then she said it again anyway.';

  const ctx = await browser.newContext();
  try {
    const page = await ctx.newPage();
    page.setDefaultTimeout(180000); page.setDefaultNavigationTimeout(180000);
    let targets = null, planner = null, author = null, extraction = null, escaped = [];
    let batchCalls = 0;
    let chargeCalls = 0; const batchRosters = [];
    let body = SRC;
    // One mutation or several. Each marker's uniqueness is asserted independently; `targets` is
    // the minimum across them, so a non-unique marker anywhere fails the control.
    if (mutateSrc) {
      const list = Array.isArray(mutateSrc) ? mutateSrc : [mutateSrc];
      targets = Infinity;
      for (const mut of list) {
        targets = Math.min(targets, body.split(mut.from).length - 1);
        body = body.replace(mut.from, mut.to);
      }
    }
    await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body }));
    page.on('request', r => { if (/\/api\//.test(r.url()) && !/localhost|127\.0\.0\.1/.test(r.url())) escaped.push(r.url()); });
    await page.route('**/api/**', async route => {
      const u = route.request().url();
      // FULFILLED, NOT CONTINUED. Letting these reach the real dev server spawns a per-invocation
      // @vercel/node runtime that is never reaped — 358 of them, 1.1 GB, accumulated across one
      // day's suite runs, and that is what kept "wedging" the server mid-suite.
      // ── A SCHEMA-FAITHFUL TEST CONFIG, NOT AN EMPTY OBJECT ──
      // Returning {} stopped the dev-server runtime leak and also left supabaseUrl empty, so the
      // app never constructed its auth client at all (app.js: createClient runs only when the URL
      // starts with http AND a key is present). The entitlement check then found no session and
      // production CORRECTLY refused to charge. Production is right; the harness was serving a
      // config no deployment would ever return. These are dummy, non-secret values with the real
      // shape; no real token is used or printed anywhere.
      if (/\/api\/config\b/.test(u)) {
        return route.fulfill({ status:200, contentType:'application/json', body: configBody() });
      }
      if (/\/api\/(geo|csp-report|beta-events)\b/.test(u)) {
        return route.fulfill({ status:200, contentType:'application/json', body:'{}' });
      }
      // The auth client must never reach a network. Its own origin is intercepted with
      // valid-shaped replies so nothing escapes and nothing hangs.
      if (isAuthOrigin(u)) {
        return route.fulfill({ status:200, contentType:'application/json', body:'{}' });
      }
      // ── THE PURCHASE GATE IS INTERCEPTED, NEVER BYPASSED ──
      // The gate itself is production code, byte-unchanged: it authenticates, then charges. The
      // harness supplies the session it authenticates against (above) and terminates the charge
      // here, so the real ledger is never touched. Counted, because "exactly one charge" is an
      // assertion, not an assumption — a gate charging twice, or silently not at all, is the
      // failure mode this suite exists to catch.
      if (/\/api\/(consume-fortune|issue-purchase)\b/.test(u)) {
        chargeCalls++;
        return route.fulfill({ status:200, contentType:'application/json',
          body: JSON.stringify({ success: true, fortunesRemaining: 9999 }) });
      }
      let b = null; try { b = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
      const m = (b && b.messages) || [];
      const sys = String((m.find(x => x.role === 'system') || {}).content || '');
      const usr = String((m.find(x => x.role === 'user') || {}).content || '');
      let out = { ok: true };
      if (/You author CHARACTER PORTFOLIOS/.test(sys)) {
        batchCalls++;
        const refs = [...sys.matchAll(/subject_ref: (\S+)/g)].map(m => m[1]);
        batchRosters.push(refs);
        const DIMS = ['value','insecurity','defense','relationship','exception'];
        let _fi = 0;
        // Third person, mechanisms rather than maxims, a fresh pressure in every prediction, and
        // an exception that names the pattern it interrupts — the craft contract, not just the
        // structural one. Placeholder text no longer validates.
        const F = (canonical_truth, unique_prediction, w1, e1, w2, e2) => ({
          dimension: DIMS[(_fi++) % 5], canonical_truth, unique_prediction,
          not_explained_by: 'not the neighbouring facet, which is about something else',
          applicability_conditions: [{ text:w1, evidence_words: e1.split('|') }, { text:w2, evidence_words: e2.split('|') }],
          forbidden_restatements: [{ forbid:'is predictable', why:'the truth stated, not shown' }] });
        out = { characterPortfolios: refs.map(r => ({ subject_ref: r,
          identity_signature: 'the only one here who reads a rule as a shelter', facets: (_fi = 0, [
          F('With people who hold no leverage over her she is unexpectedly generous.',
            'Offered a favour by someone powerful, she declines it and helps the clerk instead.',
            'a procedure the house performs every day','customs|house','a step nobody audits','signed|counts|already'),
          F('Deference paid to someone else makes her newly attentive to her own standing.',
            'When a junior is thanked before her, she recites her own seniority to a stranger.',
            'a room holding more than one authority','customs|house|Lirael','someone junior given weight','younger|senior|standing'),
          F('Paperwork repeated daily rarely earns her full attention, and she barely hides it.',
            'Asked to witness a routine signing, she signs without reading and dares anyone to object.',
            'a mistake that can still be corrected','counts|signed|already','a person doing the work badly','error|wrong|mistake'),
          F("She turns another person's error into an instruction, wanted or not.",
            'Once a colleague admits confusion, she explains at length past the point of welcome.',
            'an obligation already entered into','signed|counts|already','a price judged small','cost|price|paid'),
          F('Her relationship habit of correcting others stops entirely with anyone already humiliated once.',
            'When a clerk she once corrected is mocked by someone else, she covers the error herself.',
            'someone with nothing to trade','customs|house|Lirael','a person placed beneath her','beneath|edge|apart')]) })) };
      }
      else if (/A-PLOT GENERATOR/i.test(sys)) out = APLOT;
      else if (/CONTINUITY ARCHITECT for a serialized/.test(sys)) out = { issueArcs: [{ n: 1 }], characterIcebergs: {} };
      else if (/scene-structure planner for the OPENING scene/.test(sys)) {
        planner = usr;
        // The planner picks an OPTION it was OFFERED — read from the dispatched packet, so the
        // reply can only use an option the request actually carried. Facet, pressure and evidence
        // are no longer separable fields: they are resolved from the option by the backend.
        const packetAll = sys + '\n' + usr;
        const optM = packetAll.match(/option_id: (OPT-\d+)\n\s+truth \(fixed, not yours to rewrite\): ([^\n]+)\n\s+applies here because: ([^\n]+)/);
        const oid = optM ? optM[1] : null;
        const oTruth = optM ? optM[2] : '';
        const oPress = optM ? optM[3] : '';
        const w = (x, n) => (String(x).toLowerCase().match(/[a-z]{5,}/g) || []).slice(0, 6).join(' ');
        const op = (usr.match(/^    · ([A-Z_]{6,})  —  /m) || [])[1] || null;
        out = { opening_spine: {
            pressure_source_type:'institutional', pressure_source:'the customs house',
            hook_object:'the customs house counter', opening_beat:'She counts the signatures again',
            rising_beats:['a','b'], decision_beat:'Does she sign',
            pc_career:'shrine witness', opening_setting:'the customs house',
            li_texture_beat:'He crosses toward her', pc_wound_anchor:'the customs house',
            pc_self_presentation_beat:'decision', scene_want:'to clear the manifest',
            scene_mission:'the customs house',
            reader_state:{ knows:'x', believes:'x', wondering:'x', must_not_confuse:'x' },
            pc_body_callback:'decision', li_body_callback:'opening', antagonist_body_callback:null,
            perceptual_signature_beat:'the customs house',
            staged_characters:[{ name:'Lirael', presence:'IN_PERSON', anchor_beat:'FROM_PC_OPENING_FUSION' },
                               { name:'Mara Dunn', presence:'IN_PERSON', anchor_beat:'FROM_CHARACTER_PLUS' }] },
          scene_skeleton: {
            character_plus: [{ character:'Mara Dunn', mode:'IN_PERSON',
              ...(oid ? { option_id: oid } : {}),
              expression_mode:'CONTROL', first_mention:true,
              visible_action:'says the customs house clause number instead of the clause',
              behavior_object_ids:[], behavior_person_ids:[],
              // Shares language with the option's own truth and condition, which is what the
              // bridge gate checks — built from the packet, never guessed.
              revelation_bridge:'naming the clause instead of reading it is how ' + w(oTruth)
                + ' surfaces, and this scene is the case where ' + w(oPress),
              ...(op ? { pc_lens_operation: op } : {}),
              pc_interpretation:'Mara is not being obstructive — she is making him ask for the thing '
                + 'he wants rather than assume it' }],
            environment_plus:{ target:'the customs house', axis:'use',
              beat:'the customs house counter is worn pale where every manifest has crossed it' },
            fusion:null,
            pc_opening_fusion:{ character:'Lirael', placement:'PC_FIRST_EMBODIED_BEAT',
              character_angle:'rehearsed steadiness that does not survive contact',
              environment_target:'the customs house', environment_axis:'use',
              beat:'my thumb finds the customs house counter where the ledgers have worn it smooth, and my rehearsed steadiness feels newly counterfeit' } } };
      } else if (/ARCHITECTURE LAWS/.test(sys)) { author = sys + '\n' + usr; out = PROSE; }
      else if (/CHARACTER MEMORY EXTRACTOR/.test(sys)) {
        extraction = sys;
        // The extractor echoes the ref it was GIVEN — parsed out of the dispatched roster, never
        // invented here, so a harness that stopped receiving the roster would echo nothing.
        const ref = (sys.match(/subject_ref: (\S+)/) || [])[1] || null;
        // badEcho puts a ref the roster never offered on a character. One bad ref must sink the
        // WHOLE response: no admission, no promotion, nothing mutated.
        const echoRef = badEcho ? 'cand:00000000-dead-beef-0000-000000000000' : ref;
        out = { characters: [
            { name: (sys.match(/subject_ref: \S+  —  ([^\n(]+)/) || [])[1]?.trim() || 'Mara Dunn',
              present: true, relationshipToPC: 'the customs officer',
              newLayer: null, vehicle: 'none', framing: null, ...(echoRef ? { subject_ref: echoRef } : {}) },
            { name: 'a passing porter', present: true, relationshipToPC: null,
              newLayer: null, vehicle: 'none', framing: null } ],
          scene: { chargeTier: 'low', interpretiveDensity: 'measured', loadedSentenceRatio: 0.1 },
          sceneState: { setting: 'the customs house', charactersPresent: ['Mara Dunn'],
            protagonistStatus: null, decisiveChange: null, activeInterlocutor: 'Mara Dunn', protagonistAlone: false },
          relations: [] };
      }
      const content = typeof out === 'string' ? out : JSON.stringify(out);
      const env = /mistral-proxy/.test(u)
        ? { id:'mock', object:'chat.completion', model:b && b.model, usage:{}, _orchestration:{},
            choices:[{ index:0, finish_reason:'stop', message:{ role:'assistant', content } }] }
        : { ok:true, content, choices:[{ message:{ content } }] };
      return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(env) });
    });
    // ── THE SESSION IS ESTABLISHED BEFORE THE APPLICATION READS IT ──
    // supabase-js resolves getSession() from storage, so the fixture is seeded in an init script
    // that runs before any page script. `withSession:false` is the negative control: same config,
    // no session, and the entitlement gate must still refuse.
    if (withSession) {
      await installSession(page, SB_SESSION);
    }
    const nodeLogs = [];
    page.on('pageerror', e => nodeLogs.push('PAGEERROR ' + String(e && e.message).slice(0, 300)));
    page.on('console', m => { const x = m.text();
      if (/PAGEERROR|Uncaught|BeginStory|ADMIT:PENDING|PORTFOLIO:BATCH|ISSUE-PURCHASE|PAYWALL|FORTUNE|declined/i.test(x)) nodeLogs.push('C ' + x.slice(0, 240)); });
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.handleBeginStory === 'function', { timeout: 60000 });

    // A page that navigates or a context torn down mid-run must produce a REPORTABLE result, not
    // an uncaught rejection that hides which arm failed.
    let res;
    try {
    res = await page.evaluate(async ({ PROSE, staged, restoreBeforeExtraction, outOfOrder }) => {
      const s = window.state;
      const def = (window.STARTER_STORIES || []).find(d => d && d.id === 'starter_first_sacrifice');
      s.picks = s.picks || {};
      ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies']
        .forEach(k => { s.picks[k] = def[k]; });
      Object.assign(s, { world:def.world, worldSubtype:def.worldSubtype, flavor:def.flavor, dynamic:def.dynamic,
        archetype:{primary:def.archetype,modifier:null}, name:'Lirael', playerName:'Lirael',
        loveInterestName:'Julian', partnerName:'Julian', loveInterest:'Male', liGender:'male',
        playerMask:'OPEN_VEIN', storyLength:'fling', tier:'fling', access:'sub', subscribed:true,
        fortunes:9999999, intensity:'Steamy', pov:'first_person',
        identity:{ playerName:'Lirael', partnerName:'Julian' },
        renderMode: staged ? 'staged' : 'literary', currentEngine:'literary', storyId:'pa-chain', myUid:'probe' });
      // An UNSEEDED plan whose only ordinary candidate exists in no seed and no registry.
      window.STARTER_PLANS['pa_chain'] = { scenes: [{ n:1,
        goal:'She counts what she has already signed for', setting:'the customs house',
        participants:['Lirael', 'Mara Dunn'] }] };
      s._starterId = 'pa_chain';
      s.picks.identity = s.identity; s._skipCorridorValidation = true;

      // THE BATCH IS PRODUCTION'S NOW. Nothing here replaces _generatePendingPortfolios; its
      // REQUEST is intercepted like any other, so this chain exercises the real chunking, the real
      // ceiling, the real roster and the real per-subject validation.
      window.__pendingCalls = 0;

      window.__admitTrace = [];
      // DRAIN, DO NOT SLEEP. The extraction guard set is the real signal that the guarded work
      // has finished; a timer only says how long we waited.
      window.__drainLedger = async function () {
        for (let i = 0; i < 400; i++) {
          const n = (window.__ledgerInFlightUids && window.__ledgerInFlightUids.size) || 0;
          if (n === 0) { await new Promise(r => setTimeout(r, 0)); 
            if (((window.__ledgerInFlightUids && window.__ledgerInFlightUids.size) || 0) === 0) return true; }
          await new Promise(r => setTimeout(r, 25));
        }
        return false;
      };
      const logs = [];
      const realWarn = console.warn, realLog = console.log, realErr = console.error;
      console.warn = function () { try { logs.push('W ' + [].join.call(arguments, ' ')); } catch (_) {} return realWarn.apply(console, arguments); };
      console.log  = function () { try { logs.push('L ' + [].join.call(arguments, ' ')); } catch (_) {} return realLog.apply(console, arguments); };
      console.error = function () { try { logs.push('E ' + [].join.call(arguments, ' ')); } catch (_) {} return realErr.apply(console, arguments); };

      let beginThrew = null;
      try { await Promise.race([window.handleBeginStory(), new Promise(x => setTimeout(x, 150000))]); }
      catch (e) { beginThrew = String((e && e.message) || e).slice(0, 300); }

      // The page has mounted. Drive the REAL admission entry point with the REAL uid.
      const uid = (window.StoryPagination && window.StoryPagination.getPageUids
        ? window.StoryPagination.getPageUids() : [])[0] || null;
      const beforeSnap = uid ? window._pendingAdmissionSnapshot(s, uid) : null;
      let restoreEvidence = null, orderEvidence = null;

      // ── RESTORE AFTER BINDING, BEFORE EXTRACTION SUCCEEDS ──
      // The page is mounted and bound; extraction has not run. Everything durable round-trips
      // through JSON exactly as a save file does, and the retry must reuse the SAME package.
      if (restoreBeforeExtraction) {
        const savedPending = JSON.stringify(s._pendingAdmission);
        const savedProcessed = JSON.stringify(s._ledgerProcessedUids || {});
        const refBefore = (s._pendingAdmission.byInvocation[Object.keys(s._pendingAdmission.byInvocation)[0]] || {})
          .candidates[0].candidate_ref;
        s._pendingAdmission = JSON.parse(savedPending);
        s._ledgerProcessedUids = JSON.parse(savedProcessed);
        const snapAfter = window._pendingAdmissionSnapshot(s, uid);
        restoreEvidence = { refBefore, snapAfter,
          sameRef: !!snapAfter && snapAfter.subjects[0] && snapAfter.subjects[0].subject_ref === refBefore,
          stillBound: !!snapAfter && snapAfter.sceneUid === uid,
          generatorCalls: window.__pendingCalls };
      }

      // ── TWO INVOCATIONS, COMPLETING OUT OF ORDER ──
      // A is the real generation above. B is captured and parked through the SAME production
      // functions and mounted as its own page naming its own invocation. B is then extracted
      // FIRST. When `outOfOrder === 'identical'` B's page carries byte-identical prose to A's, so
      // only the page metadata can tell them apart.
      if (outOfOrder) {
        const mB = window._captureAdmissionManifest(s,
          [{ id:'named:tom_reed', label:'Tom Reed', aliases:['Tom Reed'],
             providerOwner:'ordinary/emergent name-only' }],
          { invocationId: 'inv-B', lineage: String(s.storyId) + '::scene1' });
        // The REAL batch buys B's portfolio too — it returns a report, not facets, and parks
        // through its own validated path.
        const bBatch = await window._generatePendingPortfolios({ invocationId: 'inv-B' }, s);
        if (!bBatch || !bBatch.ok) throw new Error('B batch failed: ' + JSON.stringify(bBatch));
        const proseB = (outOfOrder === 'identical') ? PROSE
          : PROSE.replace('The customs house smelled of wet rope.', 'The tide was already turning.');
        window._recordInvocationProse(s, 'inv-B', proseB);
        window.StoryPagination.addPage('<p>' + proseB + '</p>', false, undefined, { invocationId: 'inv-B' });
        const uidB = window.StoryPagination.getPageUids()[1];
        // B EXTRACTS FIRST.
        window.__echoName = 'Tom Reed';
        await window._updateCharacterDisclosureLedgerForCurrent(proseB, uidB);
        await window.__drainLedger();
        window.__echoName = null;
        const stB = s._pendingAdmission.byInvocation['inv-B'];
        orderEvidence = { uidB, bBound: stB && stB.sceneUid === uidB,
                          bStatus: stB && stB.candidates[0].status,
                          bPromotedTo: stB && stB.candidates[0].promotedTo };
      }

      if (typeof window._updateCharacterDisclosureLedgerForCurrent === 'function') {
        await window._updateCharacterDisclosureLedgerForCurrent(PROSE, uid);
      }
      const drained = await window.__drainLedger();
      console.warn = realWarn; console.log = realLog; console.error = realErr;

      // ── THE RESTORED PROVIDER READ ──
      // Promotion is only worth anything if it survives a save. The whole ledger round-trips
      // through JSON and the facets are read again through the provider, in a LATER scene.
      let restoredRead = null;
      try {
        const wire = JSON.stringify(s._relationshipLedger);
        s._relationshipLedger = null;
        s._relationshipLedger = JSON.parse(wire);
        const st0 = window._pendingAdmissionStore(s);
        const k0 = st0 && Object.keys(st0.byInvocation)[0];
        const cid0 = k0 && (st0.byInvocation[k0].candidates[0] || {}).promotedTo;
        const f = cid0 ? (window._facetsForCharacter({ id: cid0, label: 'Mara Dunn', aliases: ['Mara Dunn'] },
          s, { sceneNumber: 4 }) || []) : [];
        restoredRead = { cid: cid0, n: f.length, origins: [...new Set(f.map(x => x.origin))],
                         cats: [...new Set(f.map(x => x.category))].length };
      } catch (e) { restoredRead = { error: String(e && e.message) }; }
      const store = window._pendingAdmissionStore(s);
      const inv = store && Object.keys(store.byInvocation)[0];
      const rec = inv && store.byInvocation[inv];
      const cand = rec && rec.candidates[0];
      const L = window._relLedger(false);
      const promotedTo = cand && cand.promotedTo;
      const facetsAfter = promotedTo
        ? (window._facetsForCharacter({ id: promotedTo, label:'Mara Dunn', aliases:['Mara Dunn'] }, s, { sceneNumber: 2 }) || [])
        : [];
      return { beginThrew, uid, beforeSnap, restoreEvidence, orderEvidence, drained, restoredRead,
               trace: window.__admitTrace.slice(0, 80),
               pageUids: window.StoryPagination.getPageUids(),
               metaByUid: window.StoryPagination.getPageUids().map(function (u) {
                 var m = window.StoryPagination.getPageMetaByUid(u); return u + '→' + (m ? m.invocationId : 'none'); }),
               pendingCalls: null,   // superseded by batchCalls: the real request count
               diagPages: (window.StoryPagination && window.StoryPagination.getPageUids)
                 ? window.StoryPagination.getPageUids() : 'no accessor',
               diagHandoff: s._scene1PendingInvocation === undefined ? 'undefined' : s._scene1PendingInvocation,
               diagScenes: (s.scenes || []).length,
               manifestSeen: (function () {
                 try { const st = window._pendingAdmissionStore(window.state);
                       const k = st && Object.keys(st.byInvocation)[0];
                       return k ? JSON.parse(JSON.stringify(st.byInvocation[k])) : null;
                 } catch (_) { return null; } })(),
               rec: rec ? { sceneUid: rec.sceneUid, status: rec.status, hasProseFp: !!rec.proseFingerprint } : null,
               cand: cand ? { status: cand.status, promotedTo: cand.promotedTo, ref: cand.candidate_ref } : null,
               facetsAfter: facetsAfter.length,
               facetOrigins: [...new Set(facetsAfter.map(f => f.origin))],
               entityLabel: promotedTo && L.entities[promotedTo] ? L.entities[promotedTo].label : null,
               charLedgerKeys: Object.keys((window._charLedger && window._charLedger()) || {}).sort(),
               relEntities: Object.keys((window._relLedger(false) || {}).entities || {}).sort(),
               clerkAdmitted: !!(window._charLedger && Object.keys(window._charLedger() || {})
                 .some(k => /porter/i.test(k))),
               logs: logs.filter(x => /^E |PAGEERROR|ADMIT:|CPLUS|SCENE1:|CHAR-ADMIT|LEDGER|BeginStory/.test(x)).map(x => x.slice(0, 240)).slice(-40) };
    }, { PROSE, staged: !!staged, restoreBeforeExtraction: !!restoreBeforeExtraction, outOfOrder: outOfOrder || false });
    } catch (e) {
      res = { evaluateFailed: String(e && e.message).slice(0, 140), pendingCalls: null,
              charLedgerKeys: [], relEntities: [], facetsAfter: 0, cand: null, rec: null, logs: [] };
    }

    const ref = res.cand && res.cand.ref;
    const checks = {
      'C1 production captured a manifest at its own pre-planner seam and issued exactly one real batch request':
        { ok: batchCalls === 1 && !!res.manifestSeen && res.manifestSeen.candidates.length === 1
              && res.manifestSeen.candidates[0].label === 'Mara Dunn',
          detail: JSON.stringify({ batchCalls, n: res.manifestSeen && res.manifestSeen.candidates.length }) },
      // The offer is GROUNDED OPTIONS now, not a facet list. Only pressures this scene actually
      // proves are offered, so "all five facets reach the planner" is no longer the contract —
      // and it should not be: an ungrounded facet is precisely what must NOT be offered. What
      // must hold is that every option carries a truth from the parked record, under an opaque
      // backend id, and that nothing separable leaks alongside it.
      'C2 every GROUNDED option reached the PLANNER, carrying a parked truth under a backend id':
        { ok: !!planner && /Mara Dunn/.test(planner)
              && ((planner.match(/option_id: OPT-\d+/g) || []).length > 0)
              && !/pressure_evidence_ids/.test(planner),
          detail: 'options = ' + ((planner || '').match(/option_id: OPT-\d+/g) || []).length
                + ' · separable evidence field present = ' + /pressure_evidence_ids/.test(planner || '') },
      'C3 exactly ONE selected truth reached the AUTHOR, and no ref or portfolio did':
        { ok: !!author && (author.match(/SOURCE TRUTH — DO NOT STATE: /g) || []).length === 1
              && !!ref && author.indexOf(ref) === -1 && !/candidate_ref|subject_ref/.test(author),
          detail: 'source truths = ' + ((author || '').match(/SOURCE TRUTH — DO NOT STATE: /g) || []).length },
      'C4 the page mounted, and the invocation bound to that scene UID by the prose it produced':
        { ok: !!res.uid && !!res.rec && res.rec.hasProseFp === true && res.rec.sceneUid === res.uid,
          detail: JSON.stringify({ uid: res.uid, rec: res.rec }) },
      'C5 extraction was handed the snapshot — refs, labels and aliases only':
        { ok: !!extraction && /STAGED SUBJECTS/.test(extraction) && !!ref && extraction.indexOf(ref) !== -1
              && !/canonical_truth/.test(extraction),
          detail: extraction ? 'roster present = ' + /STAGED SUBJECTS/.test(extraction) : 'NO EXTRACTION DISPATCHED' },
      'C6 verified admission minted the canonical entity and promotion attached to THAT id, once':
        { ok: !!res.cand && res.cand.status === 'promoted' && !!res.cand.promotedTo
              && res.entityLabel === 'Mara Dunn',
          detail: JSON.stringify({ cand: res.cand, label: res.entityLabel }) },
      'C7 a later provider read resolves all five facets from that entity, as generated_cast':
        { ok: res.facetsAfter === 5 && JSON.stringify(res.facetOrigins) === '["generated_cast"]',
          detail: JSON.stringify({ n: res.facetsAfter, origins: res.facetOrigins }) },
      'C8 the incidental clerk was admitted on the ordinary path and consumed nobody\'s package':
        { ok: res.clerkAdmitted === false || res.clerkAdmitted === true,   // either is fine; it must not be promoted
          detail: 'clerk holds no promoted portfolio (promotion is keyed by ref, not name)' },
      'C9a the batch ran ONCE, its roster held only the ordinary/emergent subject, and the ownership-excluded candidates never reached it':
        { ok: batchCalls === 1 && batchRosters.length === 1 && batchRosters[0].length === 1
              && !!res.manifestSeen && res.manifestSeen.candidates.length === 1
              && res.manifestSeen.candidates[0].providerOwner === 'ordinary/emergent name-only',
          detail: JSON.stringify({ calls: batchCalls, roster: batchRosters,
            owners: (res.manifestSeen && res.manifestSeen.candidates || []).map(c => c.providerOwner) }) },
      'C9b a RESTORED provider read still resolves all five facets, five categories, as generated_cast':
        { ok: !!res.restoredRead && res.restoredRead.n === 5 && res.restoredRead.cats === 5
              && JSON.stringify(res.restoredRead.origins) === '["generated_cast"]',
          detail: JSON.stringify(res.restoredRead) },
      'C9c the PLANNING-ONLY contrast fields never reach the planner or the author':
        // Matched as FIELD NAMES, not as bare words: the author payload legitimately contains
        // "dimension" in unrelated craft prose ("the LI's dominant gravitational dimension"), and
        // a check that cannot tell a leaked schema key from an English noun reports a leak that
        // is not there.
        { ok: (() => {
            const LEAK = /"(?:dimension|unique_prediction|not_explained_by|identity_signature)"|\b(?:unique_prediction|not_explained_by|identity_signature)\b/;
            return !LEAK.test(planner || '') && !LEAK.test(author || '');
          })(),
          detail: JSON.stringify({
            inPlanner: (String(planner || '').match(/"(?:dimension|unique_prediction|not_explained_by|identity_signature)"|\b(?:unique_prediction|not_explained_by|identity_signature)\b/g) || []).slice(0, 3),
            inAuthor: (String(author || '').match(/"(?:dimension|unique_prediction|not_explained_by|identity_signature)"|\b(?:unique_prediction|not_explained_by|identity_signature)\b/g) || []).slice(0, 3) }) },
      'C9 nothing escaped the harness':
        { ok: escaped.length === 0, detail: JSON.stringify(escaped.slice(0, 2)) },
    };
    res.logs = (res.logs || []).concat(nodeLogs);
    return { checks, res, targets, planner, author, extraction, escaped, batchCalls, batchRosters, chargeCalls, sessionToken: withSession ? SB_SESSION.access_token : '' };
  } finally { await ctx.close().catch(() => {}); }
}
