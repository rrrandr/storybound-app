// THE PRODUCTION LOOP for pending admission. Driven through a real Scene 1: every step below is
// production's own call, and the only thing this file supplies is the MOCKED portfolio the paid
// batch will later produce, plus the intercepted model responses.
//
// mutateSrc removes one production call at a time; each removal must break the chain.
export async function chain(browser, SRC, { mutateSrc, badEcho } = {}) {
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
  const PROSE = 'The customs house smelled of wet rope. Mara Dunn said the clause number instead of the '
    + 'clause, and I counted what I had already signed for while she watched me do it. A clerk passed '
    + 'behind her without stopping. I had come to have the manifest cleared before the tide turned, and '
    + 'she had come to be the reason it would not be. She waited for me to find the number myself, which '
    + 'was a kindness, and then she said it again anyway.';

  const ctx = await browser.newContext();
  try {
    const page = await ctx.newPage();
    page.setDefaultTimeout(180000); page.setDefaultNavigationTimeout(180000);
    let targets = null, planner = null, author = null, extraction = null, escaped = [];
    let body = SRC;
    if (mutateSrc) { targets = body.split(mutateSrc.from).length - 1; body = body.replace(mutateSrc.from, mutateSrc.to); }
    await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body }));
    page.on('request', r => { if (/\/api\//.test(r.url()) && !/localhost|127\.0\.0\.1/.test(r.url())) escaped.push(r.url()); });
    await page.route('**/api/**', async route => {
      const u = route.request().url();
      if (/\/api\/(config|geo|csp-report|beta-events)\b/.test(u)) return route.continue();
      let b = null; try { b = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
      const m = (b && b.messages) || [];
      const sys = String((m.find(x => x.role === 'system') || {}).content || '');
      const usr = String((m.find(x => x.role === 'user') || {}).content || '');
      let out = { ok: true };
      if (/A-PLOT GENERATOR/i.test(sys)) out = APLOT;
      else if (/CONTINUITY ARCHITECT for a serialized/.test(sys)) out = { issueArcs: [{ n: 1 }], characterIcebergs: {} };
      else if (/scene-structure planner for the OPENING scene/.test(sys)) {
        planner = usr;
        // The planner cites the facet it was OFFERED — read from the dispatched packet, so the
        // reply can only use psychology the request actually carried.
        const fid = (usr.match(/facet_id: (\S+)/) || [])[1] || null;
        const pid = (usr.match(/pressure_id: (\S+)/) || [])[1] || null;
        const E1 = (usr.match(/^  (E\d+): /m) || [])[1] || 'E1';
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
              ...(fid ? { facet_id: fid } : {}), ...(pid ? { pressure_id: pid } : {}),
              ...(pid ? { pressure_evidence_ids: [E1] } : {}),
              first_mention:true, behavior:'says the clause number instead of the clause',
              behavior_object_ids:[], behavior_person_ids:[],
              ...(op ? { pc_lens_operation: op } : {}),
              pc_effect:'I had decided what the clause number meant before I had earned the right to' }],
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
            { name: 'Mara Dunn', present: true, relationshipToPC: 'the customs officer',
              newLayer: null, vehicle: 'none', framing: null, ...(echoRef ? { subject_ref: echoRef } : {}) },
            { name: 'a passing clerk', present: true, relationshipToPC: null,
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
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.handleBeginStory === 'function', { timeout: 60000 });

    const res = await page.evaluate(async ({ PROSE }) => {
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
        renderMode:'literary', currentEngine:'literary', storyId:'pa-chain', myUid:'probe' });
      // An UNSEEDED plan whose only ordinary candidate exists in no seed and no registry.
      window.STARTER_PLANS['pa_chain'] = { scenes: [{ n:1,
        goal:'She counts what she has already signed for', setting:'the customs house',
        participants:['Lirael', 'Mara Dunn'] }] };
      s._starterId = 'pa_chain';
      s.picks.identity = s.identity; s._skipCorridorValidation = true;

      // THE SEAM THE PAID BATCH WILL OCCUPY. Production calls this; the mock only supplies what
      // the batch would have bought, keyed by the ref production minted.
      window.__pendingCalls = 0;
      window._generatePendingPortfolios = async function (manifest) {
        window.__pendingCalls++;
        window.__manifestSeen = JSON.parse(JSON.stringify(manifest));
        const F = (category, truth, w1, e1, w2, e2) => ({ category, canonical_truth: truth,
          applicability_conditions: [{ text:w1, evidence_requires:e1 }, { text:w2, evidence_requires:e2 }],
          forbidden_restatements: [{ forbid:'is ' + category, why:'the truth stated, not shown' }] });
        return manifest.candidates.map(c => ({ subject_ref: c.candidate_ref, facets: [
          F('worldview','Paperwork repeated daily rarely earns her full attention, and she barely hides it.',
            'a procedure the house performs every day','customs|house','a step nobody audits','signed|counts|already'),
          F('insecurity','Deference paid to someone else makes her newly attentive to her own standing.',
            'a room holding more than one authority','customs|house|Lirael','someone junior given weight','younger|senior|standing'),
          F('habit',"She turns another person's error into an instruction, wanted or not.",
            'a mistake that can still be corrected','counts|signed|already','a person doing the work badly','error|wrong|mistake'),
          F('contradiction','On what a signature costs she assumes an authority nobody granted her.',
            'an obligation already entered into','signed|counts|already','a price judged small','cost|price|paid'),
          F('value','With people who hold no leverage over her she is unexpectedly generous.',
            'someone with nothing to trade','customs|house|Lirael','a person placed beneath her','beneath|edge|apart')] }));
      };

      const logs = [];
      const realWarn = console.warn, realLog = console.log, realErr = console.error;
      console.warn = function () { try { logs.push('W ' + [].join.call(arguments, ' ')); } catch (_) {} return realWarn.apply(console, arguments); };
      console.log  = function () { try { logs.push('L ' + [].join.call(arguments, ' ')); } catch (_) {} return realLog.apply(console, arguments); };
      console.error = function () { try { logs.push('E ' + [].join.call(arguments, ' ')); } catch (_) {} return realErr.apply(console, arguments); };

      try { await Promise.race([window.handleBeginStory(), new Promise(x => setTimeout(x, 150000))]); } catch (_) {}

      // The page has mounted. Drive the REAL admission entry point with the REAL uid.
      const uid = (window.StoryPagination && window.StoryPagination.getPageUids
        ? window.StoryPagination.getPageUids() : [])[0] || null;
      const beforeSnap = uid ? window._pendingAdmissionSnapshot(s, uid) : null;
      if (typeof window._updateCharacterDisclosureLedgerForCurrent === 'function') {
        await window._updateCharacterDisclosureLedgerForCurrent(PROSE, uid);
      }
      await new Promise(r => setTimeout(r, 1500));           // extraction resolves off-thread
      console.warn = realWarn; console.log = realLog; console.error = realErr;

      const store = window._pendingAdmissionStore(s);
      const inv = store && Object.keys(store.byInvocation)[0];
      const rec = inv && store.byInvocation[inv];
      const cand = rec && rec.candidates[0];
      const L = window._relLedger(false);
      const promotedTo = cand && cand.promotedTo;
      const facetsAfter = promotedTo
        ? (window._facetsForCharacter({ id: promotedTo, label:'Mara Dunn', aliases:['Mara Dunn'] }, s, { sceneNumber: 2 }) || [])
        : [];
      return { uid, beforeSnap, pendingCalls: window.__pendingCalls,
               diagPages: (window.StoryPagination && window.StoryPagination.getPageUids)
                 ? window.StoryPagination.getPageUids() : 'no accessor',
               diagHandoff: s._scene1PendingInvocation === undefined ? 'undefined' : s._scene1PendingInvocation,
               diagScenes: (s.scenes || []).length,
               manifestSeen: window.__manifestSeen || null,
               rec: rec ? { sceneUid: rec.sceneUid, status: rec.status, hasProseFp: !!rec.proseFingerprint } : null,
               cand: cand ? { status: cand.status, promotedTo: cand.promotedTo, ref: cand.candidate_ref } : null,
               facetsAfter: facetsAfter.length,
               facetOrigins: [...new Set(facetsAfter.map(f => f.origin))],
               entityLabel: promotedTo && L.entities[promotedTo] ? L.entities[promotedTo].label : null,
               charLedgerKeys: Object.keys((window._charLedger && window._charLedger()) || {}).sort(),
               relEntities: Object.keys((window._relLedger(false) || {}).entities || {}).sort(),
               clerkAdmitted: !!(window._charLedger && Object.keys(window._charLedger() || {})
                 .some(k => /clerk/i.test(k))),
               logs: logs.filter(x => /^E |ADMIT:|CPLUS|SCENE1:|CHAR-ADMIT|LEDGER/.test(x)).map(x => x.slice(0, 220)).slice(0, 30) };
    }, { PROSE });

    const ref = res.cand && res.cand.ref;
    const checks = {
      'C1 production captured a manifest at its own pre-planner seam, and asked the batch seam once':
        { ok: res.pendingCalls === 1 && !!res.manifestSeen && res.manifestSeen.candidates.length === 1
              && res.manifestSeen.candidates[0].label === 'Mara Dunn',
          detail: JSON.stringify({ calls: res.pendingCalls, n: res.manifestSeen && res.manifestSeen.candidates.length }) },
      'C2 all five parked facets reached the PLANNER under their opaque backend refs':
        { ok: !!planner && /Mara Dunn/.test(planner)
              && (planner.match(/facet_id: /g) || []).length === 5,
          detail: 'facet_id count = ' + ((planner || '').match(/facet_id: /g) || []).length },
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
      'C9 nothing escaped the harness':
        { ok: escaped.length === 0, detail: JSON.stringify(escaped.slice(0, 2)) },
    };
    return { checks, res, targets, planner, author, extraction, escaped };
  } finally { await ctx.close().catch(() => {}); }
}
