// TEMPT OUTCOME EXTRACTOR — RUNNER CORE
//
// Deliberately a SIDE-EFFECT-FREE module. Importing it dispatches nothing and runs nothing; the
// CLI entry point lives in _tempt_outcome_extractor_live_run.mjs, and the dry proof imports this
// same core. (The alternative — a live script that starts a paid run at import time — is a mistake
// this workstream has already made once, with _tempt_fate_scene_text.mjs.)
//
// Contract, per Roman 2026-09-24:
//   - reads the committed 09-24 fixture BYTE-FOR-BYTE
//   - invokes only the PRODUCTION extractor prompt/call path
//   - allows only the extractor's three declared tier endpoints; blocks every other text and image
//     request
//   - reserves cost BEFORE each dispatch, under a $0.02 ceiling
//   - validates, but never resolves pending state, commits a consequence, or mutates a story
//   - preserves each tier's raw request, response, validation result, citations, and cost
//   - stops after a structurally valid result, or after the declared cascade — NO validation retry
//
// THE DISTINCTION THAT MATTERS: a response that PARSES but fails citations/coverage is a useful
// validation FAILURE and stops. It does NOT fall through to another model. Only a transport
// failure or an unusable (empty/unparsable) response advances a tier. That asymmetry is enforced
// by the production path itself — _extractTemptOutcome passes no opts.validateContent, so
// _callTieredProvider cannot cascade on a semantic rejection — and is asserted, not assumed.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const FIXTURE_DIR = path.join(__dirname, '_tempt_fate_fixtures', 'run_2026-09-24_02-11-02_scene_a');

// ── SOURCED RATES — verbatim from public/app.js TEXT_PRICING (~4764-4811) ────────────────────
export const TEXT_PRICING = {
  'ministral-8b-2512':        { in: 0.00000015, out: 0.00000015 },
  'grok-4-1-fast-reasoning':  { in: 0.00000125, out: 0.0000025 },
  'gpt-4o-mini':              { in: 0.00000015, out: 0.0000006 }
};
// The censused worst case for this role (see _tempt_fate_memory_erasure_cost_audit.mjs).
// OUT RAISED 1400 -> 3200 (2026-09-26), tracking the extractor's own max_tokens. The live run hit 1400
// exactly and truncated mid-object; the limit was sized from that run's measured 4.11 chars/token
// (5,758 chars at 1,400) to ~2x a complete cited report. RESERVATION ACCOUNTING MUST TRACK THE LIMIT —
// leaving this at 1400 while the dispatch allows 3200 would under-reserve the worst case by design.
export const ROLE_TOKENS = { in: 3600, out: 3200 };
// The extractor's three declared tiers, in order. _callTieredProvider's default chain; the
// extractor passes no opts.tiers override.
export const DECLARED_TIERS = [
  { tier: 'primary',  model: 'ministral-8b-2512',       endpoint: '/api/mistral-proxy' },
  { tier: 'fallback', model: 'grok-4-1-fast-reasoning', endpoint: '/api/proxy' },
  { tier: 'terminal', model: 'gpt-4o-mini',             endpoint: '/api/chatgpt-proxy' }
];
export const ALLOWED_ENDPOINTS = DECLARED_TIERS.map((t) => t.endpoint);
export const CEILING_USD = 0.02;

export function tierCost(model) {
  const r = TEXT_PRICING[model];
  if (!r) return null;                       // unsourced model → refuse to price → refuse to dispatch
  return r.in * ROLE_TOKENS.in + r.out * ROLE_TOKENS.out;
}

// ── RESERVATION LEDGER — reserves BEFORE each dispatch, refuses past the ceiling ─────────────
export function makeLedger(ceilingUsd = CEILING_USD) {
  const entries = [];
  let total = 0;
  return {
    get entries() { return entries.slice(); },
    get totalUsd() { return total; },
    ceilingUsd,
    // Returns {ok, usd, runningTotalUsd, reason}. A refusal must ABORT the request, not warn.
    reserve(label, model) {
      const usd = tierCost(model);
      if (usd == null) {
        const e = { label, model, ok: false, reason: 'unsourced model — refusing to price, therefore refusing to dispatch' };
        entries.push(e); return e;
      }
      if (total + usd > ceilingUsd + 1e-12) {
        const e = { label, model, usd, ok: false, runningTotalUsd: total,
          reason: `reserving ${label} (${model}, $${usd.toFixed(6)}) would push total $${(total + usd).toFixed(6)} past the ceiling $${ceilingUsd.toFixed(6)}` };
        entries.push(e); return e;
      }
      total += usd;
      const e = { label, model, usd, ok: true, runningTotalUsd: total };
      entries.push(e); return e;
    }
  };
}

// ── THE IMMUTABLE CONTEXT, rebuilt from the committed fixture ────────────────────────────────
// Byte-for-byte: the raw author output is read verbatim and the PRODUCTION prose builder is run
// over it, so the extractor sees exactly what production would have handed it.
export function readFixture() {
  const rawPath = path.join(FIXTURE_DIR, 'scene_a_raw_output.txt');
  const outPath = path.join(FIXTURE_DIR, 'outcome_record.json');
  const rawBytes = fs.readFileSync(rawPath);
  const plan = JSON.parse(rawBytes.toString('utf8'));
  const outcome = JSON.parse(fs.readFileSync(outPath, 'utf8'));
  const owned = outcome.ownedProposal || {};
  const durable = (outcome.durableConsequences || [])[0] || {};
  return {
    rawBytes, rawSha: null, plan,
    proposalId: String(owned.id || durable.proposalId || ''),
    wishText: String(owned.wishText || durable.requestedRupture || ''),
    sceneIdx: (durable.sceneIdx != null) ? durable.sceneIdx : 1,
    // What the paid run itself committed — preserved for comparison, NEVER fed to the extractor.
    priorCommitted: durable
  };
}

// Builds the frozen context inside the page, using the REAL production builders.
export async function buildContextInPage(page, fx) {
  return page.evaluate((a) => {
    const s = window.state;
    s.storyId = 'extractor-only-' + Date.now();
    s.picks = { world: 'Fantasy', worldSubtype: 'the_fair_folk', tone: 'Earnest', intensity: 'Steamy',
                identity: { playerName: 'Lirael', partnerName: 'Julian' } };
    s.gender = 'Female'; s.loveInterest = 'Male';
    s.renderMode = 'staged_story_mode'; s.currentEngine = 'graphic';
    s._starterId = 'starter_first_sacrifice';
    s.turnCount = 0;
    const own = { sceneIndex: a.sceneIdx, wasInvokedAtStart: true,
      proposalEntry: { id: a.proposalId, wishText: a.wishText } };
    const ctx = window._tfoBuildExtractionContext(a.plan, own, window._extractCGSceneText(a.plan), 'fixture-2026-09-24');
    return {
      ctx,
      rosterDetail: window._temptOutcomeSceneRosterDetailed(a.plan, a.sceneIdx),
      proseLen: ctx.prose.length,
      frozen: Object.isFrozen(ctx)
    };
  }, { plan: fx.plan, proposalId: fx.proposalId, wishText: fx.wishText, sceneIdx: fx.sceneIdx });
}

// ── PER-DISPATCH RESERVATION ROUTE ───────────────────────────────────────────────────────────
// Registered AFTER the network gate so Playwright runs it FIRST; it reserves, then hands off via
// route.fallback() to the gate, which still owns allow/stub/abort. A refused reservation aborts
// here and the gate never sees the request — so the ceiling is enforced BEFORE dispatch, not
// reconciled afterwards.
// `holder` is read at REQUEST time ({ ledger, log }), so a caller running several scenarios can
// swap the ledger without re-registering the route — stacking routes would double-reserve, and
// re-installing the gate would orphan its stubs.
export async function installReservationRoute(page, holder) {
  await page.route('**/api/**', async (route) => {
    const ledger = holder.ledger;
    const log = holder.log;
    const req = route.request();
    let pathname;
    try { pathname = new URL(req.url()).pathname; } catch (_) { pathname = req.url(); }

    let body = null;
    try { body = JSON.parse(req.postData() || '{}'); } catch (_) { body = null; }
    const model = (body && (body.model || body.preferredModel)) || null;

    // Only the extractor's three declared endpoints may proceed at all.
    if (!ALLOWED_ENDPOINTS.some((p) => pathname.indexOf(p) === 0)) {
      log.push({ kind: 'blocked-endpoint', pathname, reason: 'not one of the extractor\'s three declared tier endpoints' });
      await route.abort('failed');
      return;
    }
    // And only its three declared models.
    if (!DECLARED_TIERS.some((t) => t.model === model)) {
      log.push({ kind: 'blocked-model', pathname, model, reason: 'model is not one of the extractor\'s declared tiers' });
      await route.abort('failed');
      return;
    }
    const r = ledger.reserve(pathname + ' :: ' + model, model);
    if (!r.ok) {
      log.push({ kind: 'blocked-ceiling', pathname, model, reason: r.reason });
      await route.abort('failed');
      return;
    }
    log.push({ kind: 'reserved', pathname, model, usd: r.usd, runningTotalUsd: r.runningTotalUsd });
    await route.fallback();
  });
}

// ── THE RUN ──────────────────────────────────────────────────────────────────────────────────
// Calls ONLY the production extractor path, then validates. It never touches pending state, never
// commits, and never mutates a story — proven by a before/after state snapshot, not by assertion.
export async function runExtractorOnly(page, ctx) {
  return page.evaluate(async (c) => {
    const snap = () => JSON.stringify({
      pending: Object.keys(window.state._temptOutcomePending || {}),
      durable: (window.state._temptFateDurableConsequences || []).length,
      committedProposals: Object.keys(window.state._temptOutcomeCommittedProposals || {}),
      scenes: (window.state.scenes || []).length,
      ledger: (window.state._temptFateLedger || []).length
    });
    const before = snap();
    const prompt = window._tfoBuildExtractorPrompt(c);
    let raw = null, error = null, attemptLog = null;
    try {
      raw = await window._extractTemptOutcome(c);
    } catch (e) {
      error = { message: (e && e.message) || String(e), code: (e && e.code) || null };
      attemptLog = (e && e.attemptLog) || null;
    }
    let validation = null, citations = null;
    if (raw) {
      validation = window._validateTemptFateOutcomeReport(raw, { presentRoster: c.rosterNames });
      citations = window._tfoVerifyCitations(raw, c.prose);
    }
    const after = snap();
    return {
      prompt, raw, error, attemptLog, validation, citations,
      stateBefore: before, stateAfter: after, stateUnchanged: before === after,
      structurallyValid: !!(raw && validation && validation.valid && citations && citations.length === 0)
    };
  }, ctx);
}

// The five questions the sheet says this run exists to answer, checked mechanically.
export function evaluateFindings(raw, rosterNames) {
  if (!raw) return null;
  const knowers = Array.isArray(raw.affectedKnowers) ? raw.affectedKnowers : [];
  const find = (n) => knowers.filter((k) => k && String(k.who || '').toLowerCase().indexOf(String(n).toLowerCase()) !== -1)[0] || null;
  const julian = find('julian');
  const inv = raw.invokerExemption || {};
  return {
    citationsPresent: knowers.filter((k) => k && k.disposition !== 'absent').every((k) => typeof k.evidenceQuote === 'string' && k.evidenceQuote.trim()),
    rosterCovered: rosterNames.filter((n) => !/lirael/i.test(n)).every((n) =>
      knowers.some((k) => k && String(k.who || '').toLowerCase().indexOf(String(n).toLowerCase()) !== -1)
      || (Array.isArray(raw.unaccountedParties) && raw.unaccountedParties.some((u) => String(u).toLowerCase().indexOf(String(n).toLowerCase()) !== -1))),
    invokerAnchor: inv.status === 'exempt' && inv.reason === 'invoker_anchor',
    scopeStated: !!(raw.requestedScope && raw.deliveredScope && raw.scopeMatch),
    julianResolved: !!(julian && julian.disposition && typeof julian.memoryAbsent === 'boolean' && typeof julian.suspicionFromResidue === 'boolean'),
    julianDisposition: julian ? julian.disposition : null,
    julianQuote: julian ? julian.evidenceQuote : null
  };
}
