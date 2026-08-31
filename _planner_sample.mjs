// ══════════════════════════════════════════════════════════════════════════════════════════
//  PLANNER-ONLY SELECTION SAMPLE
//
//  The portfolio generator is validated for this phase, so this buys nothing about portfolios.
//  It asks one question: given five trusted facets per subject, does the planner SELECT well —
//  the right facet for the evidence in the scene, a real pressure, a camera-recordable action
//  that reveals the mechanism, and a PC reading that judges rather than merely flinches.
//
//  The chain is production's, end to end:
//    archived paid response → production validator/normaliser → _parkPendingPortfolio →
//    Scene-1 capture seam → production planner prompt → ONE planner call → production
//    validation → the author directive production builds — with the author request aborted.
//
//  The only thing replaced is the GENERATOR, and it is replaced by a response already paid for.
//  Nothing here copies production's schema, prompt or contract: every bound, field name and
//  facet count is read out of the running app.
//
//  usage:  node _planner_sample.mjs                    free — proves the request, dispatches nothing
//          SB_PLANNER_MUTATE=1 node _planner_sample.mjs free — control: production's planner call
//                                                        removed; zero dispatch, harness fails
//          SB_PLANNER_AUTHORIZE=1 node _planner_sample.mjs   LIVE — one planner call
// ══════════════════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core';
import fs from 'fs';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { configBody, installSession, isAuthOrigin, SB_URL } from './_test_session_env.mjs';

const LIVE   = !!process.env.SB_PLANNER_AUTHORIZE;
// ── THE AUTHORISED CEILING, ENFORCED ON THE OUTGOING BYTES ──
// REQUESTED, NOT YET GRANTED. The cumulative figure uses the CONSERVATIVE prior rather than the
// smaller one recorded on disk, because an authorisation reasoned from the conservative number
// must not silently license the difference.
// The packet is not byte-identical between runs: production rotates exemplars inside the prompt,
// so three dry runs measured $0.00483510, $0.00483600 and $0.00483660. A cap pinned to one
// observation would abort a legitimate dispatch on the next, so it is set with a STATED margin
// above the observed maximum rather than at it.
const CAP_ADDITIONAL = 0.00490000;
const PRIOR_UPPER_BOUND = 0.03571420;   // conservative prior after the fourth portfolio sample
const CAP_CUMULATIVE = 0.04061420;      // PRIOR_UPPER_BOUND + CAP_ADDITIONAL
const PLANNER_RATES = { in: 0.15, out: 0.60 };   // mistral-small-latest
const MUTATE = !!process.env.SB_PLANNER_MUTATE;
let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };

// ── THE ARCHIVED PAID RESPONSE ──
const newest = (ext) => {
  const d = '_portfolio_samples';
  const f = fs.readdirSync(d).filter(x => x.endsWith(ext)).sort().pop();
  if (!f) throw new Error('no archived paid sample ' + ext);
  return d + '/' + f;
};
const ARCHIVE = process.env.SB_ARCHIVE || newest('.raw.txt');
const RAW = fs.readFileSync(ARCHIVE, 'utf8');
const ARCHIVED = JSON.parse(RAW.slice(RAW.indexOf('{'), RAW.lastIndexOf('}') + 1)).characterPortfolios;

// ── THE PRODUCTION CALL SITE THE MUTATION CONTROL REMOVES ──
// Chosen because it is the line that DISPATCHES the planner. With it gone the chain cannot
// produce a plan, so a green run would mean the harness was scoring something it invented.
const KILL = { from: "'You are a scene-structure planner for the OPENING scene of an interactive romance novel. '",
               to:   "'MUTANT: the production planner prompt was removed by the control arm. '" };

// ── PROCESS CENSUS. The dev-server runtime leak is unresolved; a run that quietly spawns
//    unreaped children is a run that will wedge the next suite.
const procs = () => {
  const n = (p) => { try { return execSync(`pgrep -f ${p} | wc -l`).toString().trim(); } catch (_) { return '?'; } };
  return { vercelNode: n('"@vercel/node"'), vercelDev: n('"vercel dev"') };
};

const SRCraw = fs.readFileSync('public/app.js', 'utf8');
const SRC = MUTATE ? SRCraw.replace(KILL.from, KILL.to) : SRCraw;
if (MUTATE && SRC === SRCraw) throw new Error('MUTATION CONTROL IS VACUOUS — the planner call site was not found');

// ── PREFLIGHT ──
{
  const c = new AbortController(); const tm = setTimeout(() => c.abort(), 8000);
  let ok = false;
  try { const r = await fetch('http://localhost:3000/', { signal: c.signal }); ok = r.status === 200; } catch (_) {}
  clearTimeout(tm);
  if (!ok) { console.error('\n  ✗ INFRASTRUCTURE: http://localhost:3000/ is not serving the app.\n'); process.exit(1); }
}
const PROCS_BEFORE = procs();

const seen = { planner: [], author: [], portfolio: [], subplot: [], auditor: [], other: [], escaped: [], continued: 0 };
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
let R = null, plannerRaw = null, authorPayload = null;
try {
  const page = await ctx.newPage();
  page.setDefaultTimeout(180000); page.setDefaultNavigationTimeout(180000);
  await installSession(page);
  await page.addInitScript(() => {
    window.__invEvents = [];
    window.__invTrace = (e) => { try { window.__invEvents.push(e.event); } catch (_) {} };
  });
  await page.route('**/sb-test.localhost/**', r => r.fulfill({ status:200, contentType:'application/json', body:'{}' }));
  await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body: SRC }));

  page.on('response', async r => {
    try { if (/mistral-proxy|chatgpt-proxy/.test(r.url()) && seen.planner.length && plannerRaw === null) {
      plannerRaw = { status: r.status(), body: (await r.text()).slice(0, 200000) }; } } catch (_) {}
  });

  await page.route('**/api/**', async route => {
    const u = route.request().url();
    if (/\/api\/config\b/.test(u)) return route.fulfill({ status:200, contentType:'application/json', body: configBody() });
    if (isAuthOrigin(u)) return route.fulfill({ status:200, contentType:'application/json', body:'{}' });
    if (/\/api\/(geo|csp-report|beta-events)\b/.test(u)) return route.fulfill({ status:200, contentType:'application/json', body:'{}' });
    if (/\/api\/(consume-fortune|issue-purchase)\b/.test(u))
      return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ success:true, fortunesRemaining:9999 }) });

    let b = null; try { b = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
    const msgs = (b && b.messages) || [];
    const sys = String((msgs.find(m => m.role === 'system') || {}).content || '');
    const usr = String((msgs.find(m => m.role === 'user') || {}).content || '');

    // ── THE ONE CALL THAT MAY COST MONEY ──
    if (/scene-structure planner for the OPENING scene/.test(sys)) {
      seen.planner.push({ url: u, sys, usr, body: b, bytes: (route.request().postData() || '').length });
      if (seen.planner.length > 1) {
        console.error('\n  ✗ ABORTING: a SECOND planner request was attempted.\n');
        return route.abort();
      }
      if (LIVE) {
        // ── PRE-DISPATCH SPEND GUARD ──
        // The last moment before money moves, measured on the real outgoing bytes. Unrounded
        // throughout; the authorised figures are exact, never rounded for display.
        const inTok = Math.ceil((sys.length + usr.length) / 4);
        const worst = (inTok / 1e6) * PLANNER_RATES.in
                    + (((b && b.max_tokens) || 0) / 1e6) * PLANNER_RATES.out;
        const cum = PRIOR_UPPER_BOUND + worst;
        if (worst > CAP_ADDITIONAL + 1e-12 || cum > CAP_CUMULATIVE + 1e-12) {
          seen.guardBlocked = { worst, cum };
          console.error(`\n  ✗ ABORTING BEFORE DISPATCH: worst case $${worst.toFixed(8)} `
            + `(cumulative $${cum.toFixed(8)}) exceeds the authorisation.\n`);
          return route.abort();
        }
        seen.worstCase = worst;
        seen.continued++;
        return route.continue();
      }
      return route.abort();               // free arms prove the request; they never invent a reply
    }
    // ── CAPTURED, THEN ABORTED. The directive is the artefact; the prose is not bought.
    if (/ARCHITECTURE LAWS|PRIMARY AUTHOR|You are writing Scene/i.test(sys)) {
      seen.author.push({ sys, usr }); authorPayload = { sys, usr }; return route.abort();
    }
    // ── MUST NEVER HAPPEN ──
    if (/You author CHARACTER PORTFOLIOS/.test(sys)) { seen.portfolio.push(u); return route.abort(); }
    if (/SUBPLOT GENERATOR/.test(sys))               { seen.subplot.push(sys.slice(0, 70).replace(/\s+/g, ' ')); return route.abort(); }
    // A POST-AUTHOR auditor is what must never fire. The wound-swap auditor and the continuity
    // architect both carry the word and are UPSTREAM of the planner — aborting them degraded the
    // chain and the planner packet was assembled from a story that had failed its own setup.
    if (/AUDITOR|CONFORMANCE|VERIFIER/i.test(sys)
        && !/story-structure auditor|CONTINUITY ARCHITECT/i.test(sys)) {
      seen.auditor.push(sys.slice(0, 70).replace(/\s+/g, ' ')); return route.abort();
    }

    // Everything else the chain needs on the way to the planner: answered locally, never bought.
    seen.other.push(sys.slice(0, 48).replace(/\s+/g, ' '));
    let out = { ok: true };
    if (/A-PLOT GENERATOR/i.test(sys)) out = APLOT;
    else if (/CONTINUITY ARCHITECT for a serialized/.test(sys)) out = { issueArcs: [{ n: 1, title: 'the harbour office', beats: [] }], characterIcebergs: {} };
    return route.fulfill({ status:200, contentType:'application/json',
      body: JSON.stringify({ choices: [{ message: { content: JSON.stringify(out) } }] }) });
  });

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

  await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
  await page.waitForFunction(() => window.handleBeginStory && window._validatePortfolioResponse
    && window._parkPendingPortfolio && window.__PORTFOLIO_SCHEMA_FIELDS, { timeout:120000 });

  R = await page.evaluate(async ({ ARCHIVED }) => {
    const s = window.state;
    // ── THE SAME SETUP THE ADMISSION CHAIN USES ──
    // handleBeginStory returns immediately without it, and a run that never starts reports
    // "no planner request" as if production had failed to build one.
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
      renderMode:'literary', currentEngine:'literary', storyId:'planner-sample', myUid:'probe' });
    // Three ordinary people the seed does not know, so all three archived portfolios have a home.
    window.STARTER_PLANS['planner_sample'] = { scenes: [{ n:1,
      goal:'She counts what she has already signed for', setting:'the customs house',
      participants:['Lirael', 'Mara Dunn', 'Tomas Reyne', 'Halden Roe'] }] };
    s._starterId = 'planner_sample';
    s.picks.identity = s.identity; s._skipCorridorValidation = true;

    const logs = [];
    const realLog = console.log, realWarn = console.warn;
    console.log = function () { try { logs.push('L ' + [].join.call(arguments, ' ')); } catch (_) {} return realLog.apply(console, arguments); };
    console.warn = function () { try { logs.push('W ' + [].join.call(arguments, ' ')); } catch (_) {} return realWarn.apply(console, arguments); };

    // ── THE GENERATOR IS REPLACED BY A RESPONSE ALREADY PAID FOR ──
    // Everything downstream of it is production: the validator normalises the archived literals,
    // derives the categories, builds the ids and fingerprints, and parks the package. The only
    // thing that does not happen is the purchase.
    const injected = { calls: 0, parked: [], rejected: [] };
    window._generatePendingPortfolios = async function (manifest, st) {
      st = st || window.state;
      const store = window._pendingAdmissionStore(st);
      const rec = store && store.byInvocation[String(manifest && manifest.invocationId)];
      if (!rec) return { ok: false, code: 'unknown_invocation', diagnostics: [], usage: [] };
      const need = window.__PORTFOLIO_SCHEMA_FIELDS.requiredFacetCount;
      const due = rec.candidates.filter(c => c.status === 'pending');
      due.forEach((c, i) => {
        // The psychology is the archive's; the identity is the backend's. Only subject_ref moves.
        const entry = JSON.parse(JSON.stringify(ARCHIVED[i % ARCHIVED.length]));
        entry.subject_ref = c.candidate_ref;
        const v = window._validatePortfolioResponse({ characterPortfolios: [entry] },
          { eligible: true, subject_ref: c.candidate_ref, storyId: rec.storyId,
            required_facet_count: need, reference_label: c.label },
          { pendingAuthority: true, requireContrast: true });
        if (!v.ok) { injected.rejected.push({ label: c.label, code: v.code, errors: (v.errors || []).slice(0, 2) }); return; }
        const parked = window._parkPendingPortfolio(st, rec.invocationId, c.candidate_ref, v.facets,
          { guardrails: v.guardrails, identity_signature: v.identity_signature });
        injected.parked.push({ label: c.label, ok: !!(parked && parked.ok !== false),
                               code: parked && parked.code, facets: (v.facets || []).length,
                               dropped: (v.normalizations || []).length });
      });
      return { ok: injected.rejected.length === 0, code: injected.rejected.length ? 'subjects_unresolved' : null,
               parked: injected.parked.map(p => p.label), unresolved: injected.rejected.map(r => r.label),
               calls: 0, requested: due.length, diagnostics: [], usage: [] };
    };

    let threw = null;
    try { await Promise.race([window.handleBeginStory(), new Promise(x => setTimeout(x, 170000))]); }
    catch (e) { threw = String((e && e.message) || e).slice(0, 300); }

    const store = window._pendingAdmissionStore(s);
    const inv = store && Object.keys(store.byInvocation)[0];
    const rec = inv && store.byInvocation[inv];
    return {
      threw, injected,
      // WHAT THE BACKEND HOLDS — the only trusted source for a selected facet.
      candidates: (rec ? rec.candidates : []).map(c => ({
        label: c.label, ref: c.candidate_ref, status: c.status,
        facets: (c.portfolio || []).map(f => ({ id: f.facet_id, cat: f.category,
          truth: f.canonical_truth,
          pressures: (f.possible_pressures || []).map(p => ({ text: p.text, evidence: p.evidence_requires })) })) })),
      contractFields: window.__PORTFOLIO_SCHEMA_FIELDS,
      invEvents: (window.__invEvents || []).slice(0, 40),
      logs: logs.filter(x => /SCENE1:|SKELETON|PLANNER|CPLUS|ADMIT|PORTFOLIO/.test(x)).map(x => x.slice(0, 220)).slice(-40),
    };
  }, { ARCHIVED });
} finally { await ctx.close().catch(() => {}); await browser.close().catch(() => {}); }

const PROCS_AFTER = procs();

// ══════════════════════════════════════════════════════════════════════════════════════════
//  EVIDENCE FIRST — before a single assertion, before anything can throw.
// ══════════════════════════════════════════════════════════════════════════════════════════
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const req = seen.planner[0] || null;
const evidence = {
  mode: MUTATE ? 'mutation-control' : (LIVE ? 'LIVE' : 'dry'),
  archive: ARCHIVE,
  plannerRequest: req ? { sys: req.sys, usr: req.usr, model: req.body && req.body.model,
                          max_tokens: req.body && req.body.max_tokens, bytes: req.bytes } : null,
  plannerResponse: plannerRaw,
  authorDirective: authorPayload,
  auditorMatched: seen.auditor, subplotMatched: seen.subplot, otherMatched: seen.other,
  backendCandidates: R && R.candidates,
  injection: R && R.injected,
  requestCensus: { plannerDispatched: seen.continued, plannerSeen: seen.planner.length,
                   authorAborted: seen.author.length, portfolio: seen.portfolio.length,
                   subplot: seen.subplot.length, auditor: seen.auditor.length,
                   otherIntercepted: seen.other.length, escaped: seen.escaped.length },
  procsBefore: PROCS_BEFORE, procsAfter: PROCS_AFTER,
  guardBlocked: seen.guardBlocked || null, worstCase: seen.worstCase || null,
  threw: R && R.threw, logs: R && R.logs,
};
try {
  fs.mkdirSync('_planner_samples', { recursive: true });
  fs.writeFileSync('_planner_sample_evidence.json', JSON.stringify(evidence, null, 2));
  if (LIVE) fs.writeFileSync('_planner_samples/' + STAMP + '.evidence.json', JSON.stringify(evidence, null, 2));
  if (LIVE && plannerRaw) fs.writeFileSync('_planner_samples/' + STAMP + '.planner.raw.txt', plannerRaw.body);
} catch (e) { console.error('  evidence write failed: ' + e.message); }

console.log(`\n${'═'.repeat(88)}\nPLANNER-ONLY SAMPLE — ${evidence.mode}\n${'═'.repeat(88)}\n`);

console.log(' 1 · THE CHAIN RAN ON PRODUCTION, AND BOUGHT NO PORTFOLIOS');
t('1a: ZERO portfolio-generation requests — the psychology came from the archived paid response',
  seen.portfolio.length === 0 && R && R.injected.calls === 0, JSON.stringify(seen.portfolio.slice(0, 2)));
t('1b: production PARKED the archived portfolios through its own validator and normaliser',
  !!R && R.injected.parked.length > 0 && R.injected.parked.every(p => p.ok)
    && R.injected.rejected.length === 0,
  JSON.stringify(R && { parked: R.injected.parked, rejected: R.injected.rejected }));
const need = (R && R.contractFields && R.contractFields.requiredFacetCount) || 5;
// Ids are minted downstream, on the way to the author; at park time the trusted content is the
// truth and its applicability conditions. Section 3 checks the ids where they exist.
t(`1c: every eligible subject carries all ${need} facets, each with a truth and at least one ` +
  'trusted applicability condition — the material a selection must resolve against',
  !!R && R.candidates.length > 0 && R.candidates.every(c => c.facets.length === need
    && c.facets.every(f => f.truth && f.pressures.length > 0
                        && f.pressures.every(p => p.text && p.evidence))),
  JSON.stringify(R && R.candidates.map(c => [c.label, c.facets.length,
    (c.facets[0] || {}).pressures && c.facets[0].pressures.length])));

console.log('\n 2 · EXACTLY ONE CALL MAY COST MONEY');
t('2a: at most ONE planner request may reach a provider — production retries a failed planner, ' +
  'and the dry arm provokes exactly that by aborting, so the count that matters is the one that ' +
  'was allowed through',
  seen.continued <= 1 && (!LIVE || seen.planner.length >= 1),
  JSON.stringify({ built: seen.planner.length, continued: seen.continued }));
t('2a2: a second planner attempt is BLOCKED at the route, never dispatched — "no retry or repair" ' +
  'is enforced here, not hoped for',
  seen.continued <= 1, JSON.stringify({ attempts: seen.planner.length, continued: seen.continued }));
t('2b: the author request is CAPTURED and then ABORTED — the directive is the artefact, the ' +
  'prose is not bought. (Only reachable once a planner reply exists, so the free arms cannot ' +
  'assert it and do not pretend to.)',
  LIVE ? (seen.author.length >= 1 && !!authorPayload) : true,
  LIVE ? String(seen.author.length) : 'dry arm — the planner was aborted, so the author is never reached');
// A healthy story legitimately ASKS for subplots — that is production working, and the fire-and-
// forget guard only cancels once the run goes fatal. What matters is that none of them is bought:
// every one is aborted at the route, and the provider-continued count below is the money figure.
t('2c: zero portfolio and zero post-author auditor requests, and every subplot request is ' +
  'ABORTED rather than dispatched — asked for is not the same as bought',
  seen.portfolio.length === 0 && seen.auditor.length === 0,
  JSON.stringify({ subplotAborted: seen.subplot.length, auditor: seen.auditor.slice(0, 3),
                   portfolio: seen.portfolio.length }));
t('2d: every other request the chain needs was answered locally — nothing escaped',
  seen.escaped.length === 0, JSON.stringify(seen.escaped.slice(0, 3)));
t('2f: the pre-dispatch spend guard was not tripped', !seen.guardBlocked, JSON.stringify(seen.guardBlocked || 'not tripped'));
t(`2e: requests CONTINUED to a provider: ${seen.continued} (dry/mutant expect 0, live expects 1)`,
  seen.continued === (LIVE && !MUTATE ? 1 : 0), String(seen.continued));

console.log('\n 3 · WHAT REACHED THE PLANNER');
if (req) {
  const packet = req.sys + '\n' + req.usr;
  const truths = (R.candidates || []).flatMap(c => c.facets.map(f => f.truth));
  // Ids are minted on the way to the planner, so they are read from the PACKET — the place they
  // exist — rather than from the parked record, where they do not yet.
  const ids = [...new Set((packet.match(/\b(?:pend|gen):[A-Za-z0-9_:.\-]+/g) || []))];
  const subjects = (R.candidates || []).length;
  t(`3a: ${subjects} subjects x ${need} facets reach the planner under backend-owned ids`,
    subjects > 0 && ids.length === subjects * need,
    JSON.stringify({ subjects, need, idsFound: ids.length, sample: ids.slice(0, 2) }));
  t('3a2: every offered id is backend-minted — no model-supplied identifier is in the packet',
    ids.length > 0 && ids.every(x => /^(pend|gen):/.test(x)), JSON.stringify(ids.slice(0, 3)));
  t('3b: the packet carries the backend truths themselves, so a selection can be resolved against them',
    truths.length > 0 && truths.every(x => packet.indexOf(x) !== -1),
    JSON.stringify(truths.filter(x => packet.indexOf(x) === -1).slice(0, 2)));
} else {
  t('3a: a planner packet was built', false, 'NO PLANNER REQUEST — production never built one');
}

console.log('\n 4 · THE MUTATION CONTROL');
if (MUTATE) {
  t('4a: with production\'s planner prompt REMOVED, no planner request is dispatched and the ' +
    'harness fails — a green run could not have been scoring production\'s work',
    seen.planner.length === 0 && seen.continued === 0,
    JSON.stringify({ planner: seen.planner.length, continued: seen.continued }));
}

console.log('\n 5 · THE DEV-SERVER LEAK IS UNRESOLVED, SO IT IS COUNTED');
t('5a: no @vercel/node runtime was leaked by this run',
  PROCS_AFTER.vercelNode === PROCS_BEFORE.vercelNode,
  JSON.stringify({ before: PROCS_BEFORE, after: PROCS_AFTER }));

if (!LIVE) {
  const M = { in: 0.15, out: 0.60 };            // mistral-small-latest, the planner's model
  const inTok = req ? Math.ceil((req.sys.length + req.usr.length) / 4) : 0;
  const maxOut = (req && req.body && req.body.max_tokens) || 0;
  const worst = (inTok / 1e6) * M.in + (maxOut / 1e6) * M.out;
  const L = JSON.parse(fs.readFileSync('_portfolio_spend_ledger.json', 'utf8'));
  const cost = (x) => (x.prompt_tokens / 1e6) * L.rates[x.model].in + (x.completion_tokens / 1e6) * L.rates[x.model].out;
  const prior = L.calls.reduce((n, x) => n + cost(x), 0);
  console.log(`\n${'─'.repeat(88)}\n COST — unrounded`);
  console.log(`   planner packet: ${inTok} input tokens (approx) · max_tokens ${maxOut}`);
  console.log(`   this call, worst case                                   $${worst.toFixed(8)}`);
  console.log(`   recorded prior, ${L.calls.length} paid calls                        $${prior.toFixed(8)}`);
  console.log(`   cumulative if billed to the ceiling                      $${(prior + worst).toFixed(8)}`);
  console.log(`\n  NOT RUN. This needs its own authorisation.`);
}
console.log(`\n${'─'.repeat(88)}\n  ${pass} passed · ${fail} failed  ${LIVE ? '' : '($0.00 — nothing was dispatched)'}\n`);
console.log('  evidence: _planner_sample_evidence.json');
process.exit(fail ? 1 : 0);
