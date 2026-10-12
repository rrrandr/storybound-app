// ══════════════════════════════════════════════════════════════════════════════════════════════
// LIVE: First Sacrifice — Scene 1 (fixed) · OAS · Scenes 2-4
// AUTHORIZED by Roman 2026-10-04, ceiling $3.00, explicit go.
// ══════════════════════════════════════════════════════════════════════════════════════════════
// PROVIDER CALLS GO THROUGH FOR REAL. Only these are intercepted locally, none of which cost
// anything at a provider: /api/config, the entitlement/payment responses (SIMULATED — no
// purchase, no real account, no payment credential), and IMAGE generation, which is BLOCKED.
//
// Per-call this records: requested model, model actually served, input/output/CACHED tokens,
// the receipt if one comes back, and retries. Estimated exposure is NEVER counted as measured
// spend, and no cache reuse is assumed across the mid-sequence model change.
import fs from 'fs';
import { chromium } from 'playwright-core';
import { estimateUsd } from './_fsc_cost_guard.mjs';
import { makeSpendLedger } from './_live_spend_ledger.mjs';
import { canSubmit } from './_oas_submission_guard.mjs';
import { configBody, installSession, isAuthOrigin, installEntitledProfileStub }
  from './_test_session_env.mjs';
import { findFSDef, launchFS, enterOAS, advanceExpectingGate, chooseBranch }
  from './_fs_story_setup.mjs';

// NO SILENT DEFAULT. The ceiling IS the authorization, and inheriting a stale one is how a run
// spends against a number nobody approved — which is what happened on the first attempt of
// 2026-10-05, where $3.00 printed after Roman had approved $1.50.
// ── ENTRANCE-REPLY HOLD (test synchronisation) ──────────────────────────────────────────────
// The interceptor already holds the entrance reply. Instead of a blind sleep it now ANNOUNCES that
// the request arrived and waits to be released, so a test can drive Submit and the unlock
// confirmation normally and still act while the response is genuinely in flight. Every wait is
// bounded and the hold is always released, including on failure.
let _armWork = null;   // module scope, so teardown can actually wait for the concurrent arm
let _holdArm = false, _holdArrived = null, _holdGate = null, _holdReleased = false;
let _holdAtAuthorIdx = 1;   // which OAS author response to hold
let _holdArrivedAt = null;
function _armHold() {
  _holdArm = true; _holdReleased = false;
  let _ra, _rg;
  _holdArrived = new Promise((r) => { _ra = r; });
  _holdGate = new Promise((r) => { _rg = r; });
  _holdArrived._resolve = _ra; _holdGate._resolve = _rg;
}
function _releaseHold() {
  if (_holdReleased) return;
  _holdReleased = true;
  try { if (_holdGate && _holdGate._resolve) _holdGate._resolve(); } catch (_) {}
}

const CEILING = Number(process.env.SB_CEILING || 0);
// FIXTURE MODE EXERCISES THIS RUNNER, not a copy of its logic. Every gate, deadline, budget
// rule and sequencing decision below is the same code the paid run uses; only the provider
// response is served locally, and NO provider traffic leaves the process.
let boundaryCheck = null;
let scene2 = {};
const sceneLedger = [];
let laneContradiction = null;
let modelBackedReplies = 0, fallbackSeen = 0;
let infraFailure = null;
let scriptedExit = null;
let openingBranch = { requested: (process.env.SB_OPENING_BRANCH || 'run').toLowerCase(), control: null };
// ── WHAT WAS THIS CALL FOR? Read from the prompt's own self-identification ───────────────────
// (Codex 2026-10-05.) Role labels cannot establish function: this project also routes prose
// through STRUCTURE_GENERATOR, so "PRIMARY_AUTHOR vs everything else" does not say which calls
// wrote scenes. Each prompt names its own job in its opening line, and that is evidence.
// Anything that does not self-identify is reported as UNCLASSIFIED, never folded into a bucket.
function callFunction(sysPrompt) {
  const t = String(sysPrompt || '');
  if (/screenplay-native cinematic-romance writer|uninhibited romance fiction author/i.test(t)
      && !/Say\/Do previews|amplify\|ruin\|redirect/i.test(t)) return 'scene author';
  if (/Say\/Do previews|amplify\|ruin\|redirect|one per archetype/i.test(t)) return 'previews';
  if (/intensely intimate mouth-closeup|opening an intimate|li_face_state/i.test(t)) return 'OAS';
  if (/line editor for adult intimate dialogue/i.test(t)) return 'OAS line-edit';
  if (/SCENE-SPINE planner/i.test(t)) return 'scene planner';
  if (/CONTINUITY ARCHITECT/i.test(t)) return 'scaffold';
  if (/RUNTIME COMMIT verifier|editorial auditor|craft auditor|audit prose for BANNED/i.test(t))
    return 'verifier/audit';
  if (/CHARACTER MEMORY EXTRACTOR|canonicalization and normalization/i.test(t)) return 'memory/canon';
  if (/BODY BIBLE|A-PLOT GENERATOR|R-PLOT|SUBPLOT GENERATOR|architect of WHY THIS PAIR|Strategy Engine|WOUND/i.test(t))
    return 'setup (bibles/plots)';
  if (/ruthless line-editor/i.test(t)) return 'repair/cleanup';
  if (/"panels"|panel/i.test(t)) return 'image/panel';
  return 'UNCLASSIFIED';
}
// ── PREVIEW PROVENANCE BY EVIDENCE, NOT BY WORDING ──────────────────────────────────────────
// (Codex 2026-10-05.) The previous classifier called anything that did not look like a
// title+ellipsis fallback a "model preview" — including when previewCached was false. A populated
// input and the absence of an ellipsis prove nothing about authorship. These two record the
// PREVIEW RESPONSES THEMSELVES, keyed by card id, so a submitted suggestion can be matched
// against the reply that was actually served. What cannot be matched stays UNKNOWN.
const previewResponses = new Map();   // cardId -> [{ action, dialogue, at, callN, encounter, turn }]
// THE IDENTITY A PREVIEW REPLY WAS SERVED UNDER. Printing the CURRENT encounter/turn beside an
// OLD match is not provenance (Codex 2026-10-05): a stale record matched and was reported with the
// new identity in its evidence. The runner stamps this onto every record at the moment it serves
// the reply, and matching ENFORCES it.
let previewContext = { encounter: 'setup', turn: null };
function setPreviewContext(encounter, turn) { previewContext = { encounter, turn }; }
const norm = (t) => String(t == null ? '' : t).replace(/\s+/g, ' ').trim().toLowerCase();
// IS THIS A PREVIEW REQUEST? Needed at REQUEST time, before any reply exists.
function isPreviewPrompt(sysPrompt) {
  return /Say\/Do previews|amplify\|ruin\|redirect|one per archetype/i
    .test(String(sysPrompt || ''));
}

// THE IDENTITY A PREVIEW REQUEST WAS SENT UNDER — captured when the request is intercepted and
// passed through to the recorder, never re-read at response time. (Codex 2026-10-05: the recorder
// stamped replies with the runner's context AT RETURN, so an old reply arriving after a turn change
// was credited to the NEW turn. The 13/13 control inserted correctly-labelled records by hand and
// could not see that.)
//
// It carries the APP'S OWN generation key as well as the runner's phase, because a preview batch
// may legitimately be generated AHEAD of the selection that uses it. The app keys its preview cache
// by turnCount (_cacheFateCardPreview) and its OAS batch by turnCount (_grokIntimateFateCards), so
// that key — not the runner's loop counter — is what makes a preview "for" a selection.
async function capturePreviewIdentity(page) {
  let appKey = null;
  try {
    appKey = await page.evaluate(() => ({
      turnCount: window.state ? (window.state.turnCount || 0) : null,
      sceneFateKey: window.state ? (window.state._fateOptionsSceneKey || null) : null,
      oasBeat: (window.state && window.state.intimacyDialogue)
        ? (window.state.intimacyDialogue.beatCount ?? null) : null
    }));
  } catch (_) {}
  return { encounter: previewContext.encounter, turn: previewContext.turn, app: appKey };
}

function recordPreviewReply(sysPrompt, replyText, callN, identity) {
  try {
    const sys = String(sysPrompt || '');
    if (!isPreviewPrompt(sys)) return;
    let content = replyText;
    try { const j = JSON.parse(replyText);
      content = j?.choices?.[0]?.message?.content ?? j?.content ?? replyText; } catch (_) {}
    String(content).split(/\r?\n/).forEach((line) => {
      const parts = String(line).split('|||').map(x => x.trim());
      if (parts.length < 3) return;
      const id = parts[0].toLowerCase().replace(/[^a-z]/g, '');
      if (!id) return;
      // three fields: ARCHETYPE ||| action ||| dialogue
      // four fields:  ARCHETYPE ||| variant ||| action ||| dialogue
      const action = parts.length >= 4 ? parts[2] : parts[1];
      const dialogue = parts.length >= 4 ? parts[3] : parts[2];
      if (!previewResponses.has(id)) previewResponses.set(id, []);
      // THE REQUEST'S identity, passed in — not previewContext as it stands now.
      const ident = identity || { encounter: '(unknown: no request identity)', turn: null, app: null };
      previewResponses.get(id).push({ action, dialogue, at: Date.now(), callN,
        encounter: ident.encounter, turn: ident.turn, app: ident.app });
    });
  } catch (_) {}
}
// Classify a submitted suggestion against the recorded replies and the app's own cache.
//   matched-response : the exact text of a preview reply served for THIS card
//   matched-cache    : the app's cached preview for this card, written by some earlier reply
//   template-fallback: the card's own title (with or without an ellipsis)
//   UNKNOWN          : nothing links it to a model reply — reported as unknown, never as a preview
function classifyPreview(cardId, action, dialogue, cacheEntry, context) {
  const id = String(cardId || '').toLowerCase().replace(/[^a-z]/g, '');
  const a = norm(action), d = norm(dialogue);
  const ctx = context || {};
  const where = 'encounter=' + (ctx.encounter || '?') + ' turn=' + (ctx.turn == null ? '?' : ctx.turn)
    + ' card="' + (id || '(none)') + '"';
  if (!id) {
    return { provenance: 'UNKNOWN', evidence: 'no card id was recorded for the selection, so '
      + 'nothing can be traced to a preview record — ' + where };
  }
  if (!a && !d) return { provenance: 'EMPTY', evidence: 'no text was submitted — ' + where };

  // THE COMPLETE PAIR MUST MATCH ONE RECORD. (Codex 2026-10-05.) Matching EITHER field let a
  // repeated short line ("mm") earn "identical to the preview" while the other field differed
  // completely. Both submitted fields are now compared against the SAME record, and a legitimately
  // empty field is preserved: empty matches empty, and never matches text.
  const pairMatches = (rec) => norm(rec.action) === a && norm(rec.dialogue) === d;

  const titleish = (t) => !t || t === id || t.replace(/[….]+$/, '') === id;
  if (titleish(a) && titleish(d)) {
    return { provenance: 'template-fallback',
      evidence: 'both fields are the card id — the deck\'s own placeholder — ' + where };
  }

  const served = previewResponses.get(id) || [];
  // IDENTITY IS CHECKED, NOT DECORATED. A record only establishes provenance for the encounter and
  // turn it was actually served under.
  // IDENTITY MATCHING. A preview batch may legitimately be generated AHEAD of the selection that
  // uses it, so the runner's loop counter alone is the wrong test. The APP'S OWN generation key is
  // authoritative when both sides have one: a preview generated for turnCount N is "for" a
  // selection made at turnCount N, whatever the runner's iteration was. The phase labels are the
  // fallback when no app key was captured, and a record with NO identity never matches.
  const sameIdentity = (r) => {
    if (!r.encounter && !r.app) return false;
    const a = r.app, b = ctx.app;
    // WITHDRAWN: "one OAS batch serves every beat at the same turnCount — by design." That was
    // wrong (Codex 2026-10-05). The production turn handler CLEARS the preview generation after
    // every reply — d._fateCardPreviews = null (app.js:205729) and
    // state._grokIntimateFateCards = null (app.js:205743) — so the next selection is meant to get
    // a FRESH batch. Equal turnCount therefore does NOT establish the same preview generation,
    // and matching on it alone let a beat-1 reply vouch for a beat-5 selection.
    //
    // So the BEAT is part of the identity for OAS, and an ambiguous reuse is reported UNKNOWN
    // rather than matched. The count is not the objective: an honest UNKNOWN is the correct answer
    // when the observed replies cannot establish where a suggestion came from.
    if (a && b && a.sceneFateKey != null && b.sceneFateKey != null
        && a.oasBeat == null && b.oasBeat == null) {
      return a.sceneFateKey === b.sceneFateKey;      // scene decks are keyed by turn:page
    }
    if (a && b && a.turnCount != null && b.turnCount != null) {
      if (a.turnCount !== b.turnCount) return false;
      // Inside the OAS the generation is cleared per reply, so the beat must agree too. If either
      // side has no beat the generation cannot be established — UNKNOWN, not a match.
      if (a.oasBeat == null || b.oasBeat == null) return false;
      return a.oasBeat === b.oasBeat;
    }
    return false;   // no app-declared generation on one side: not establishable
  };
  const hit = served.find(r => pairMatches(r) && sameIdentity(r));
  if (hit) {
    return { provenance: 'matched-response',
      evidence: 'the COMPLETE action+dialogue pair is identical to the preview reply served for '
        + 'this card on call ' + hit.callN + ', requested under the SAME generation identity ('
        + (hit.app && hit.app.turnCount != null ? 'turnCount=' + hit.app.turnCount
            + (hit.app.oasBeat != null ? ' beat=' + hit.app.oasBeat : '')
            : 'encounter="' + hit.encounter + '" turn=' + hit.turn) + ') — ' + where };
  }
  // A pair that matches a record from ANOTHER encounter or turn is a stale match. It is named, with
  // the identity it really came from, and it does NOT count as this submission's provenance.
  const stale = served.find(pairMatches);
  if (stale) {
    return { provenance: 'UNKNOWN',
      evidence: 'the pair matches a preview reply REQUESTED under a DIFFERENT identity (encounter="'
        + stale.encounter + '" turn=' + stale.turn
        + (stale.app && stale.app.turnCount != null ? ' turnCount=' + stale.app.turnCount : '')
        + ', call ' + stale.callN + '), not under ' + where
        + ' — a stale record is not provenance for this submission' };
  }
  if (cacheEntry && pairMatches(cacheEntry)) {
    return { provenance: 'matched-cache',
      evidence: 'the COMPLETE pair is identical to the app\'s cached preview for this card, but no '
        + 'reply served in THIS run matches it — the writing model is not established — ' + where };
  }
  // A PARTIAL MATCH IS NOT A MATCH. It is named, so a near-miss is visible rather than silently
  // upgraded or silently dropped.
  const partial = served.find(r => (a && norm(r.action) === a) || (d && norm(r.dialogue) === d))
    || (cacheEntry && ((a && norm(cacheEntry.action) === a)
        || (d && norm(cacheEntry.dialogue) === d)) ? cacheEntry : null);
  if (partial) {
    return { provenance: 'UNKNOWN',
      evidence: 'ONE field matches a preview record and the other does not — a partial match does '
        + 'not establish authorship — ' + where };
  }
  return { provenance: 'UNKNOWN',
    evidence: 'no preview reply or cache entry for this card matches the submitted pair ('
      + served.length + ' repl' + (served.length === 1 ? 'y' : 'ies') + ' recorded) — ' + where };
}
// ── POSITIVE EVIDENCE THAT A MODEL REPLY WAS RECEIVED ────────────────────────────────────────
// (Codex 2026-10-06.) Counting "no fallback line appeared" is absence, not evidence: a missed log
// message still reads as success. A turn is model-backed only when an OAS-stage provider response
// was actually RECEIVED and PARSED for that encounter/turn and carried a usable reply — and then
// only if the app also rendered a new reply. A dollar receipt is not required to prove authorship;
// an unrelated successful provider call is not sufficient, which is why the record is keyed by
// identity rather than counted globally.
const oasRepliesReceived = new Map();   // "encounter|turn" -> [{ callN, dialogue, action }]

// Identity is CAPTURED AT DISPATCH and carried in — never re-read here. (Codex 2026-10-06
// reproduced a late response being credited to the CURRENT turn because this read the mutable
// previewContext at response time, exactly the defect already fixed for preview provenance.)
function noteOasReplyReceived(sysPrompt, replyText, callN, identity) {
  try {
    if (callFunction(sysPrompt) !== 'OAS') return;
    if (!identity || !identity.encounter || identity.turn == null) return;  // untraceable
    let content = null;
    try {
      const j = JSON.parse(replyText);
      content = j?.choices?.[0]?.message?.content ?? j?.content ?? null;
    } catch (_) { return; }                       // the envelope did not parse: not evidence
    if (typeof content !== 'string' || !content.trim()) return;
    // NO FIELD-NAME REGEX. Malformed content that merely MENTIONS li_dialogue is not a parsed
    // reply — that fallback accepted unparseable bodies as evidence.
    let parsed = null;
    try { parsed = JSON.parse(content); } catch (_) { return; }
    if (!parsed || typeof parsed !== 'object') return;
    const dialogue = (typeof parsed.li_dialogue === 'string') ? parsed.li_dialogue.trim() : '';
    const action = (typeof parsed.li_action === 'string') ? parsed.li_action.trim() : '';
    if (!dialogue && !action) return;             // typed fields required, and usable
    const key = identity.encounter + '|' + identity.turn;
    if (!oasRepliesReceived.has(key)) oasRepliesReceived.set(key, []);
    oasRepliesReceived.get(key).push({ callN, dialogue, action });
  } catch (_) {}
}

// ── THE CLEANUP PASS IS PART OF THE CHAIN, NOT A BREAK IN IT ─────────────────────────────────
// (Codex 2026-10-06.) Production runs an auxiliary line editor after the author
// (app.js:204930): _oasGptMiniCleanup(parsed.li_dialogue, parsed.li_action, overused). If it
// returns a usable line/beat the result REPLACES the author's text and is what renders; if not,
// "no usable result — raw turn shipped" and the original survives.
//
// My complete-pair matcher compared the rendered text to the AUTHOR's response only, so all five
// edited turns of the paid run read as unestablished, the scripted exit never reached six, and the
// run ended with no scenes. The fix is to TRACE THE WHOLE CHAIN, not to loosen the match:
//   author response -> cleanup request (must carry THAT turn's author text)
//     -> accepted cleanup output -> rendered pair
// all bound to the same encounter/turn. Matching "either response" is not enough: if the editor's
// result was rejected, the ORIGINAL must be what rendered.
const oasCleanups = new Map();   // "encounter|turn" -> { inDialogue, inAction, outLine, outBeat, callN }
function noteOasCleanup(sysPrompt, reqBody, replyText, callN, identity) {
  try {
    if (callFunction(sysPrompt) !== 'OAS line-edit') return;
    if (!identity || !identity.encounter || identity.turn == null) return;
    // DEFECT A (Codex 2026-10-06): the input check accepted EITHER author field appearing ANYWHERE
    // in the request, so an unrelated dialogue passed whenever the action happened to be identical.
    // The request carries a literal TURN object — `TURN: {"line":...,"beat":...}` — so parse it and
    // compare the COMPLETE pair.
    const userMsg = String((reqBody && reqBody.messages || [])[1]?.content || '');
    let turnObj = null;
    const m = userMsg.match(/TURN:\s*(\{[\s\S]*?\})\s*$/m) || userMsg.match(/(\{[\s\S]*"beat"[\s\S]*?\})/);
    if (m) { try { turnObj = JSON.parse(m[1]); } catch (_) { turnObj = null; } }
    let content = null;
    try {
      const j = JSON.parse(replyText);
      content = j?.choices?.[0]?.message?.content ?? j?.content ?? null;
    } catch (_) { content = null; }
    let outLine = null, outBeat = null;
    if (typeof content === 'string') {
      try {
        const o = JSON.parse(content.slice(content.indexOf('{'), content.lastIndexOf('}') + 1));
        if (o && typeof o === 'object') {
          // production: typeof === 'string', and EMPTY STRINGS ARE FALSY at `if (!nl && !nb)`
          outLine = (typeof o.line === 'string' && o.line) ? o.line : null;
          outBeat = (typeof o.beat === 'string' && o.beat) ? o.beat : null;
        }
      } catch (_) {}
    }
    oasCleanups.set(identity.encounter + '|' + identity.turn, {
      turnObj, outLine, outBeat, callN,
      // DEFECT B: acceptance is NOT inferred from nonempty output. production runs
      // _validateRepairOutput (metaOnly) after the emptiness check and can REJECT a nonempty edit
      // — logged [REPAIR:REJECTED_META] / "[OAS:CLEANUP] no usable result — raw turn shipped".
      // So acceptance is READ FROM PRODUCTION'S OWN SIGNAL, recorded separately below, and this
      // flag stays null until that signal is seen.
      accepted: null
    });
  } catch (_) {}
}

// PRODUCTION'S OWN ACCEPTANCE SIGNAL, per turn. "de-repeated vs N overused words" means the edit
// was applied; "no usable result — raw turn shipped" and [REPAIR:REJECTED_META] mean the original
// survived. Reading the app's decision beats re-implementing _validateRepairOutput.
function noteCleanupVerdict(encounter, turn, consoleLines, sinceIndex) {
  const seen = consoleLines.slice(sinceIndex);
  const applied = seen.some(l => /OAS:CLEANUP\] de-repeated vs \d+ overused words/.test(l));
  const shippedRaw = seen.some(l => /OAS:CLEANUP\] no usable result — raw turn shipped/.test(l)
    || /REPAIR:REJECTED_META\] pass=oas-decalc/.test(l));
  const rec = oasCleanups.get(encounter + '|' + turn);
  if (!rec) return null;
  if (applied && !shippedRaw) rec.accepted = true;
  else if (shippedRaw) rec.accepted = false;
  return rec.accepted;
}
// POSITIVE EVIDENCE THAT *THIS* RESPONSE BECAME *THIS* RENDERED TURN.
// (Codex 2026-10-06 reproduced two false positives in the first version, which accepted EITHER
// field and allowed substrings: completely different dialogue passed because both actions happened
// to say "He does not move.", and "the Duke" passed as a match for "I never told the Duke.")
//
// THE RULE NOW: the COMPLETE dialogue+action pair from ONE recorded response must equal the
// rendered turn's pair. Normalization is limited to what is justified — unicode quote/dash forms,
// collapsed whitespace, and case — because those are display-layer differences, not edits. No
// substrings, no single-field matches. A field that one side has and the other does not is a
// MISMATCH, not a free pass.
//
// If production edits the reply before rendering, this reports the attribution as UNESTABLISHED
// rather than loosening to accommodate it; the transformation would have to be traced first.
function oasReplyRenderedFor(encounter, turn, renderedEntry) {
  const recs = oasRepliesReceived.get(encounter + '|' + turn);
  if (!Array.isArray(recs) || !recs.length) return null;
  if (!renderedEntry) return null;
  const norm2 = (t) => String(t == null ? '' : t)
    .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201F\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2015]/g, '-')
    .replace(/[\u00A0\u2007\u202F]/g, ' ')
    .replace(/\s+/g, ' ').trim().toLowerCase();
  const rd = norm2(renderedEntry.dialogue || renderedEntry.li_dialogue || renderedEntry.text);
  const ra = norm2(renderedEntry.action || renderedEntry.li_action);
  if (!rd && !ra) return null;
  const clean = oasCleanups.get(encounter + '|' + turn) || null;

  for (const r of recs) {
    const ad = norm2(r.dialogue), aa = norm2(r.action);
    // (1) NO CLEANUP, OR CLEANUP REJECTED -> the author's own pair must be what rendered.
    // accepted === null means production's verdict was never observed — not traceable either way.
    if (clean && clean.accepted === null) continue;
    if (!clean || clean.accepted === false) {
      if (ad === rd && aa === ra) {
        return { ...r, matchedOn: 'the author pair, unedited'
          + (clean ? ' (cleanup ran and was rejected — original shipped)' : ''),
          chain: { author: r.callN, cleanup: clean ? clean.callN : null, cleanupAccepted: false } };
      }
      continue;
    }
    // (2) CLEANUP ACCEPTED -> its INPUT must be THIS turn's author text, and the rendered pair
    //     must equal what production accepted: the edited field where edited, the author's where
    //     the editor left it alone.
    // THE COMPLETE PAIR the editor was given must be THIS turn's author pair. An either-field
    // substring test let an unrelated dialogue through on a shared action.
    const ti = clean.turnObj;
    if (!ti) continue;                          // no parseable TURN object: not traceable
    if (norm2(ti.line) !== ad || norm2(ti.beat) !== aa) continue;
    const expectD = norm2(clean.outLine != null ? clean.outLine : r.dialogue);
    const expectA = norm2(clean.outBeat != null ? clean.outBeat : r.action);
    if (expectD === rd && expectA === ra) {
      return { ...r, matchedOn: 'the accepted cleanup of this turn\'s author pair',
        chain: { author: r.callN, cleanup: clean.callN, cleanupAccepted: true,
          inputVerified: true } };
    }
  }
  return null;
}
// ── ONE INFRASTRUCTURE DETECTOR, SHARED BY BOTH RESPONSE PATHS ───────────────────────────────
// (Codex 2026-10-06.) The first version of this check lived only inside the live-fetch branch, so
// the fixture path walked straight past it and the demonstration dispatched 84 calls. A guard that
// only one path reaches is not a guard.
function noteInfraFailure(text, resp, rec, url) {
  if (infraFailure) return true;
  const looksInfra = /NO_RESPONSE_FROM_FUNCTION|FUNCTION_INVOCATION_(TIMEOUT|FAILED)|An error occurred with this application/i
    .test(String(text || ''));
  if (!looksInfra) return false;
  let headers = {};
  try { headers = resp ? resp.headers() : {}; } catch (_) { headers = {}; }
  const ids = {};
  Object.keys(headers).forEach(k => {
    if (/x-vercel|x-request|x-amz|cf-ray|x-matched|server/i.test(k)) ids[k] = headers[k];
  });
  infraFailure = {
    at: new Date().toISOString(), call: rec ? rec.n : null,
    endpoint: String(url || '').replace(/^https?:\/\/[^/]+/, ''),
    httpStatus: (function () { try { return resp ? resp.status() : null; } catch (_) { return null; } })(),
    contentType: headers['content-type'] || null,
    ms: rec ? rec.ms : null,
    requested: rec ? rec.requested : null,
    served: rec ? (rec.served || null) : null,
    requestIds: ids,
    bodyHead: String(text || '').replace(/\s+/g, ' ').slice(0, 160),
    outstandingAtStop: outstanding.length,
    inFlightUsd: inFlight
  };
  halted = true;
  haltReason = 'INFRASTRUCTURE FAILURE — the local function did not return a usable response on '
    + 'call ' + infraFailure.call + ' (' + infraFailure.endpoint + ', HTTP '
    + infraFailure.httpStatus + ', ' + infraFailure.contentType + ', ' + infraFailure.ms + 'ms). '
    + 'The upstream call MAY ALREADY BE BILLED. Halting every further provider dispatch, '
    + 'fallbacks included.';
  try { write('infra_failure.json', infraFailure); } catch (_) {}
  say('');
  say('*** STOPPING — ' + haltReason + ' ***');
  say('    request identifiers: ' + JSON.stringify(infraFailure.requestIds));
  say('    body: ' + infraFailure.bodyHead.slice(0, 90));
  say('    ' + outstanding.length + ' reservation(s) still outstanding, $' + inFlight.toFixed(6)
    + ' in flight — RETAINED, not released.');
  return true;
}
const _bodySeq = {};          // per-fixture-key cursor for ordered bodies
let _replaySceneIdx = 0;
let _replayAuthorIdx = 0, _replayCleanupIdx = 0;
const _unmatched = new Set();
const FIXTURES = process.env.SB_FIXTURES ? JSON.parse(fs.readFileSync(process.env.SB_FIXTURES, 'utf8')) : null;
const LIVE = !FIXTURES;
const RUN = '_fs_live_out/run_' + new Date().toISOString().replace(/[:.]/g, '-');
fs.mkdirSync(RUN, { recursive: true });
const LOG = fs.createWriteStream(RUN + '/run.log');
const say = (m) => { const s = String(m); process.stdout.write(s + '\n'); LOG.write(s + '\n'); };
const write = (f, o) => fs.writeFileSync(RUN + '/' + f, typeof o === 'string' ? o : JSON.stringify(o, null, 2));

const ledger = makeSpendLedger(say);
const calls = [];
const cardLog = [];   // every hand dealt, the slot played, and what was actually submitted
let halted = false, haltReason = '';

// ── ATOMIC IN-FLIGHT RESERVATION (Roman/Codex 2026-10-05) ───────────────────────────────────
// The previous check read `calls`, which a request only enters AFTER it returns, so two
// concurrent dispatches could each pass the budget check without seeing the other.
// `reservedTotal` was incremented but never consulted. Exposure is now RESERVED BEFORE the
// request leaves and SETTLED when it comes back: a receipt replaces its reservation, and a call
// with no receipt KEEPS it, because no receipt is not no cost.
let inFlight = 0;          // reserved for requests currently out
let settled = 0;           // receipted spend
let retained = 0;          // reservations kept for calls that returned no receipt
// FIXTURE RUNS USE THEIR OWN LEDGER. Exercising the runner must never touch the ledger that
// records real authorization spend (Codex 2026-10-05).
const FIXTURE_BUDGET = process.env.SB_FIXTURE_BUDGET
  || '_fs_live_out/BUDGET.fixture.json';
const BUDGET_FILE = FIXTURES ? FIXTURE_BUDGET : '_fs_live_out/BUDGET.json';
const LOCK_FILE = FIXTURES ? (FIXTURE_BUDGET + '.lock') : '_fs_live_out/BUDGET.lock';

// ── THE BUDGET FAILS CLOSED ─────────────────────────────────────────────────────────────────
// A missing or malformed ledger must REFUSE a continuation run, not silently restart exposure
// at zero — that is how an authorization gets spent twice. Reservations are persisted BEFORE
// dispatch and settled after, so a crash leaves them on disk as unresolved exposure rather than
// evaporating. A lock stops two runner processes spending the same remaining authorization.
const PRIOR = (() => {
  if (!fs.existsSync(BUDGET_FILE)) {
    say('*** REFUSING TO RUN: ' + BUDGET_FILE + ' is missing. A continuation run cannot assume');
    say('    zero prior exposure. Seed it deliberately, or state that this is a fresh');
    say('    authorization and create it with zeros on purpose.');
    process.exit(2);
  }
  try {
    const j = JSON.parse(fs.readFileSync(BUDGET_FILE, 'utf8'));
    if (typeof j.receipted !== 'number' || typeof j.unresolved !== 'number') throw new Error('shape');
    return j;
  } catch (e) {
    say('*** REFUSING TO RUN: ' + BUDGET_FILE + ' is malformed (' + (e && e.message) + ').');
    say('    Exposure is unknown, so no dispatch is safe. Repair the ledger by hand.');
    process.exit(2);
  }
})();
// Outstanding reservations from a previous crash are STILL EXPOSURE.
const orphaned = Array.isArray(PRIOR.outstanding) ? PRIOR.outstanding : [];
if (orphaned.length) {
  const o = orphaned.reduce((n, x) => n + (x.estimate || 0), 0);
  say('*** ' + orphaned.length + ' reservation(s) from an earlier run never settled — $'
    + o.toFixed(6) + ' carried as unresolved exposure ***');
}
// EXCLUSIVE ACQUISITION. existsSync-then-write is check-then-act: two runners can both pass the
// check before either writes. 'wx' fails if the file exists, atomically, so only one wins.
try {
  fs.writeFileSync(LOCK_FILE, JSON.stringify({ pid: process.pid, run: RUN, at: Date.now() }),
    { flag: 'wx' });
} catch (e) {
  if (e && e.code === 'EEXIST') {
    let age = 0; try { age = Date.now() - fs.statSync(LOCK_FILE).mtimeMs; } catch (_) {}
    say('*** REFUSING TO RUN: ' + LOCK_FILE + ' is held (' + Math.round(age / 1000)
      + 's old). Another runner may be spending the same authorization.');
    say('    Remove it only after confirming no other run is live.');
    process.exit(3);
  }
  say('*** REFUSING TO RUN: could not acquire ' + LOCK_FILE + ': ' + (e && e.message));
  process.exit(3);
}
// BOTH OF THESE WERE REFERENCED AND NEVER DEFINED after the budget block was rewritten — the
// runner threw "exposure is not defined" the first time it was actually executed. Reading the
// file did not reveal it; running it did, which is the point of exercising the real runner.
const priorExposure = (PRIOR.receipted || 0) + (PRIOR.unresolved || 0)
  + orphaned.reduce((n, x) => n + (x.estimate || 0), 0);
const exposure = () => priorExposure + settled + retained + inFlight;

const releaseLock = () => { try { fs.unlinkSync(LOCK_FILE); } catch (_) {} };
process.on('exit', releaseLock);
process.on('SIGINT', () => { releaseLock(); process.exit(130); });

// Persisted reservation ledger — written before each dispatch, settled after.
let outstanding = orphaned.slice();
// PERSISTENCE IS MANDATORY BEFORE DISPATCH. Swallowing a failed write and continuing is the
// opposite of failing closed: the reservation would exist only in memory, and a crash would
// erase it. A write that fails halts the run.
const persistBudget = () => {
  try {
    fs.writeFileSync(BUDGET_FILE, JSON.stringify({
      receipted: (PRIOR.receipted || 0) + settled,
      unresolved: (PRIOR.unresolved || 0) + retained,
      outstanding,
      runs: (PRIOR.runs || []).concat([{ run: RUN, receipted: settled, unresolved: retained }]),
      note: PRIOR.note || null
    }, null, 2));
  } catch (e) {
    halted = true;
    haltReason = 'budget could not be persisted (' + (e && e.message) + ')';
    say('\n*** HALTING — ' + haltReason + '. A reservation that exists only in memory is not a');
    say('    reservation; refusing to dispatch further. ***');
    throw e;
  }
};

const REQUEST_TIMEOUT_MS = 180000;   // restored; a bare fetch previously hung author generation

if (!(CEILING > 0)) {
  console.error('*** REFUSING TO RUN: no ceiling set. Pass SB_CEILING with the approved amount. ***');
  process.exit(4);
}
say('=== FS SEQUENCE — ceiling $' + CEILING.toFixed(2) + (LIVE ? ' — LIVE' : ' — FIXTURES, no provider traffic') + ' ===');
say('Authorized by Roman with an explicit go, ceiling $' + CEILING.toFixed(2) + '.');
say('ENTITLEMENT/PAYMENT RESPONSES SIMULATED — no purchase, no real account. IMAGES BLOCKED.');
say('Scene 1 is the FIXED hand-authored opening and generates nothing.\n');

const browser = await chromium.launch();
const page = await browser.newPage();
const consoleLog = [];
page.on('console', m => consoleLog.push(m.text()));
page.on('pageerror', e => consoleLog.push('PAGEERROR: ' + (e && e.message)));

await page.addInitScript((armNoFallback) => {
  if (armNoFallback) window._sbAuthorArmNoFallback = true;
  const session = { access_token: 'harness-session-token', user: { id: 'harness-reader' } };
  window.supabase = { createClient: () => ({
    auth: { getSession: async () => ({ data: { session }, error: null }),
      getUser: async () => ({ data: { user: session.user }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInAnonymously: async () => ({ data: { session, user: session.user }, error: null }) },
    from: () => ({ select() { return this; }, eq() { return this; }, order() { return this; },
      limit() { return this; }, single: async () => ({ data: null, error: null }),
      insert: async () => ({ data: null, error: null }), upsert: async () => ({ data: null, error: null }),
      update: async () => ({ data: null, error: null }), then: (r) => r({ data: [], error: null }) }),
    channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel: () => {} }) };
}, process.env.SB_NO_AUTHOR_FALLBACK === '1');

await page.route('**/api/**', async (route) => {
  const req = route.request(); const url = req.url();

  if (/\/api\/config/.test(url)) {
    // THE SHARED FIXTURE'S CONFIG, so supabase-js is constructed against the fixture origin and
    // _isSignedIn becomes true. The old dummy supabaseUrl meant no session could ever exist, which
    // is why this route had to reach for _unlockBakedGenesis directly.
    return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  }
  // SIMULATED ENTITLEMENT — supplies the payment prerequisite only. No purchase occurs.
  if (/consume-fortune|fortune|charge|pricing|entitle|storypass|subscription/i.test(url)) {
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, success: true, charged: true, fortunesRemaining: 9999,
        balance: 9999, fortunes: 9999, entitled: true, eligible: true, storypassEligible: true }) });
  }
  // IMAGES BLOCKED — standing rule, and they are not what this run measures.
  if (/image|bfl|flux|dalle|kontext|visualize/i.test(url)) {
    return route.fulfill({ status: 503, contentType: 'application/json',
      body: JSON.stringify({ error: 'images blocked by the harness' }) });
  }
  // Anything that is not a model call: answer locally so nothing fails closed.
  if (!/\/api\/(proxy|chatgpt-proxy|mistral|grok|anthropic)/.test(url)) {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  }

  // ── A REAL MODEL CALL ──────────────────────────────────────────────────────────────────────
  let raw = null; try { raw = req.postData(); } catch (_) {}
  let body = {}; try { body = JSON.parse(raw || '{}'); } catch (_) {}
  const requested = body.preferredModel || body.model || body.grokModel || '(unspecified)';
  const chars = (body.messages || []).reduce((n, m) => n + String(m.content || '').length, 0);
  // PASS THE FIELDS RESOLUTION NEEDS, not just the two it used to. (Codex 2026-10-05: the helper
  // was repaired but this caller still rebuilt a stripped body, so an _sbModelOverride of
  // grok-4.7 was discarded here and priced as grok-4.3 — refused when the estimator was called
  // directly, allowed through the runner.) The override fields are what decide the effective
  // model on /api/proxy, so they travel with the messages.
  const quote = estimateUsd({
    messages: body.messages || [],
    max_tokens: body.max_tokens,
    model: body.model,
    _sbModelOverride: body._sbModelOverride,
    reasoningEffort: body.reasoningEffort
  }, requested, url);
  const est = quote.estimate;

  // ONCE AN INFRASTRUCTURE FAILURE IS SEEN, NOTHING ELSE IS DISPATCHED — not a retry, not a
  // fallback tier, not another turn's call. Requests already in flight keep their reservations.
  if (infraFailure) {
    say('  call refused after the infrastructure failure: ' + requested
      + ' (' + String(url || '').replace(/^https?:\/\/[^/]+/, '') + ')');
    return route.fulfill({ status: 503, contentType: 'application/json',
      body: JSON.stringify({ error: 'harness halted: infrastructure failure on call '
        + infraFailure.call }) });
  }

  // REFUSE A DISPATCH WHOSE COST CANNOT BE BOUNDED. (Codex 2026-10-05.) An unlisted model used to
  // fall to WORST_RATE — the Grok rate — so an expensive fallback was under-reserved and sent.
  // Now the guard resolves the effective model, including each proxy's own default, and says so.
  if (!quote.bounded) {
    halted = true;
    haltReason = 'UNBOUNDED DISPATCH REFUSED — ' + quote.refuseReason
      + '  [endpoint ' + url.replace(/^https?:\/\/[^/]+/, '') + ']';
    say('\n*** REFUSED BEFORE DISPATCH — ' + haltReason + ' ***');
    return route.fulfill({ status: 503, contentType: 'application/json',
      body: JSON.stringify({ error: 'harness refused an unpriceable dispatch' }) });
  }

  // THE IDENTITY THIS REQUEST IS SENT UNDER, frozen here. The reply may arrive after the runner
  // has moved on; it must keep the identity it was ASKED under, not the one in force when it lands.
  const sys0ForIdentity = (body.messages || [])[0]?.content;
  // Identity is captured for PREVIEW and OAS calls alike: both are credited to an encounter and
  // turn later, and both must carry the identity they were SENT under rather than whatever the
  // runner has moved on to. Capturing only preview prompts left every OAS reply untraceable.
  const _needsIdentity = isPreviewPrompt(sys0ForIdentity)
    || callFunction(sys0ForIdentity) === 'OAS'
    || callFunction(sys0ForIdentity) === 'OAS line-edit';
  const reqPreviewIdentity = _needsIdentity ? await capturePreviewIdentity(page) : null;

  // RESERVE ATOMICALLY, BEFORE THE REQUEST LEAVES.
  if (halted || exposure() + est > CEILING) {
    if (!halted) { halted = true;
      haltReason = 'ceiling: exposure $' + exposure().toFixed(6) + ' + next $' + est.toFixed(6)
        + ' would exceed $' + CEILING.toFixed(2)
        + ' (prior runs $' + priorExposure.toFixed(6) + ')';
      say('\n*** HALTED BEFORE DISPATCH — ' + haltReason + ' ***'); }
    return route.fulfill({ status: 503, contentType: 'application/json',
      body: JSON.stringify({ error: 'harness ceiling reached' }) });
  }
  inFlight += est;                       // held until this call settles
  const resv = { n: calls.length + 1, estimate: est, model: requested, at: Date.now() };
  outstanding.push(resv);
  try { persistBudget(); }                   // ON DISK BEFORE THE REQUEST LEAVES
  catch (_) {
    return route.fulfill({ status: 503, contentType: 'application/json',
      body: JSON.stringify({ error: 'harness: budget not persisted; dispatch refused' }) });
  }

  const t0 = Date.now();
  let resp = null, text = '', err = null;
  if (FIXTURES) {
    // Serve from the fixture table, honouring any scripted delay so slow-response behaviour is
    // exercised rather than described.
    const key = Object.keys(FIXTURES.byMatch || {}).find(k => new RegExp(k, 'i').test(
      (body.messages || []).map(m => m.content).join(' ').slice(0, 20000)));
    let f = (key && FIXTURES.byMatch[key]) || FIXTURES.default || { body: '{}' };
    if (f && Array.isArray(f.bodies) && f.bodies.length) {
      _bodySeq[key] = (_bodySeq[key] || 0);
      const _bi = Math.min(_bodySeq[key], f.bodies.length - 1);
      _bodySeq[key]++;
      console.log('  [fixture] ordered body ' + (_bi + 1) + '/' + f.bodies.length + ' for "'
        + String(key).slice(0, 34) + '"');
      f = { body: f.bodies[_bi], delayMs: f.delayMs };
    }

    // ── REPLAY MODE: serve the captured paid run's OWN author replies and cleanup edits in order,
    // so PRODUCTION does the parsing, the acceptance decision and the rendering. The runner never
    // constructs the rendered text; it reads what the app actually rendered. This is the only way
    // to exercise the ACCEPTED-CLEANUP path that defeated the paid evaluation.
    try {
      const sysR = String((body.messages || [])[0]?.content || '');
      const fn = callFunction(sysR);
            if (fn === 'scene author' && Array.isArray(FIXTURES._sceneAuthorSequence)
          && FIXTURES._sceneAuthorSequence.length) {
        const c = FIXTURES._sceneAuthorSequence[_replaySceneIdx % FIXTURES._sceneAuthorSequence.length];
        _replaySceneIdx++;
        f = { body: JSON.stringify({ model: 'grok-4.3', choices: [{ message: { content: c } }],
          usage: { prompt_tokens: 60000, completion_tokens: 4500, cached_tokens: 0,
            cost_in_usd_ticks: 1000000 } }) };
        console.log('  [replay] scene-author reply ' + _replaySceneIdx + ' of '
          + FIXTURES._sceneAuthorSequence.length + ' from the paid capture');
      } else if (fn === 'OAS' && Array.isArray(FIXTURES._authorSequence) && FIXTURES._authorSequence.length) {
        const c = FIXTURES._authorSequence[_replayAuthorIdx % FIXTURES._authorSequence.length];
        _replayAuthorIdx++;
        f = { body: JSON.stringify({ model: 'grok-4.3', choices: [{ message: { content: c } }],
          usage: { prompt_tokens: 1000, completion_tokens: 200, cached_tokens: 0,
            cost_in_usd_ticks: 1000000 } }) };
        console.log('  [replay] author reply ' + _replayAuthorIdx + ' from the paid capture');
      } else if (fn === 'OAS line-edit' && Array.isArray(FIXTURES._cleanupSequence)
                 && FIXTURES._cleanupSequence.length) {
        // ── MATCHED ON THE REQUEST'S OWN PAIR, NOT ON POSITION ──────────────────────────────
        // Both sequences used to be served by independent counters, so the moment the entrance
        // consumed an author entry the cleanup pairing slid out of alignment and turns 4-6 had no
        // parsed response. A captured edit is selected by comparing the INCOMING request's
        // complete dialogue/action pair against each captured edit's own line/beat; if nothing
        // matches well enough NOTHING is served, because a mis-paired edit is worse than none.
        const reqAll = (body.messages || []).slice(1)
          .map(m => String(m.content || '')).join('\n');
        const norm = (x) => String(x || '').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ')
          .split(/\s+/).filter(w => w.length > 3);
        const reqTok = new Set(norm(reqAll));
        let best = null, bestScore = 0;
        FIXTURES._cleanupSequence.forEach((cand, idx) => {
          let obj = cand;
          if (typeof cand === 'string') { try { obj = JSON.parse(cand); } catch (_) { obj = { line: cand }; } }
          const pair = norm(obj.line) .concat(norm(obj.beat));
          if (!pair.length) return;
          const hit = pair.filter(w => reqTok.has(w)).length;
          const score = hit / pair.length;
          if (score > bestScore) { bestScore = score; best = { cand, idx, score }; }
        });
        // The BEST match wins when it is clearly the best: an edit rewrites its line, so identity
        // is not expected. A tie or a weak field means nothing is served.
        if (false && best && bestScore >= 0.3) {   // see the note above: inputs are not captured
          _replayCleanupIdx++;
          f = { body: JSON.stringify({ ok: true, content: best.cand }) };
          console.log('  [replay] cleanup edit matched capture #' + (best.idx + 1)
            + ' on the request\'s own pair (overlap ' + bestScore.toFixed(2) + ')');
        } else {
          console.log('  [replay] no captured cleanup matches this request\'s pair (best overlap '
            + bestScore.toFixed(2) + ') — serving NONE rather than a mis-paired edit');
        }
      }
    } catch (_) {}

    // ── THE SCENE PLANNER'S LANE IS NOT A FIXTURE CONSTANT ──────────────────────────────────
    // (Codex 2026-10-06.) The reader's CARD SELECTION deterministically resolves the scene's
    // aftermath lane, and the planner prompt states it verbatim: 'MUST be EXACTLY "<lane>"'. A
    // fixture with one hardcoded lane passes only when the reader happens to pick that card —
    // which is why a different scripted exit flipped the requirement to dohkar_preliminary_review
    // and the plan was rejected. Production validation is NOT weakened and the reader's card is
    // NOT changed: the fixture answers the contract it was handed, exactly as a model would, and
    // the event is written to INSTANTIATE whichever lane is demanded (its own signalRx
    // vocabulary, app.js:133117 ff) rather than merely naming it.
    try {
      const sysP = String((body.messages || [])[0]?.content || '');
      // THE PROMPT HAS TWO VARIANTS, and the fixture must answer whichever it is handed:
      //   FORCED      '"chosen_aftermath_lane" (MUST be EXACTLY "<lane>"' — the card resolved it
      //   DISPLACED   'this is NOT forced to "<lane>" ... set it to null if her action deferred
      //               or replaced it' — the reader's action displaced the scheduled frame
      // A scripted reader exit DISPLACES the frame, so null is the honest answer there. Getting
      // this wrong is what produced 'declared family_accusation but ... resolved to
      // dohkar_preliminary_review': the fixture was answering a question it had not been asked.
      const forced = (sysP.match(/"chosen_aftermath_lane" \(MUST be EXACTLY "([a-z_]+)"/) || [])[1];
      const displaced = /NOT forced to "([a-z_]+)"/.test(sysP)
        && /set it to null if her action deferred or replaced it/.test(sysP);
      const want = forced || null;
      // A CONTRACT/VALIDATOR CONTRADICTION, FOUND HERE AND REPORTED, NOT PAPERED OVER:
      // the DISPLACED prompt says 'set it to null if her action deferred or replaced it', but the
      // gate rejects null unconditionally — app.js:9311 is
      //   else if (!chosenLaneId || !laneMatch) { reject 'no chosen_aftermath_lane' }
      // with no displaced exemption. A real model obeying the prompt would be rejected too. It is
      // reachable precisely because a READER-ENDED OAS displaces the scheduled frame.
      // So the fixture gives the one answer valid under BOTH: the named lane, with an event that
      // genuinely instantiates it — the prompt permits that when the frame survives alongside
      // what she did, and the Dohkar's review does survive her ending the questioning.
      const displacedLane = (sysP.match(/NOT forced to "([a-z_]+)"/) || [])[1];
      if (/SCENE-SPINE planner/.test(sysP) && displaced && !forced && displacedLane) {
        laneContradiction = { wasContradiction: 'the prompt permitted null while the gate rejected '
          + 'it unless a Tempt rupture was active',
          fixed: 'the gate now receives the same seed-declared displacement decision the prompt '
            + 'uses (_recordedChoiceDisplacesFrame)',
          nowAnswering: 'null, honestly — the frame was displaced by the recorded choice' };
      }
      if (/SCENE-SPINE planner/.test(sysP) && displaced && !forced) {
        const wrapper = JSON.parse(f.body);
        const base = JSON.parse(wrapper.choices[0].message.content);
        base.chosen_aftermath_lane = null;
        base.lane_posture_modulation = 'Her action REPLACED the scheduled frame: she ended the '
          + 'questioning herself, so the Dohkar\'s review is deferred and what stands in its place '
          + 'is her refusal to go on answering in public.';
        base.tactical_move = 'Lirael ends the questioning herself and steps back from The Answer '
          + 'before the Dohkar can call his review.';
        base.state_change = 'Lirael refuses to continue answering in the open, and the assembly '
          + 'sees her end it — the scheduled review is deferred rather than delivered.';
        base.forces_choice = 'The Dohkar must either force the review now against her refusal, or '
          + 'let the inquiry carry it.';
        base.local_objective_actor = 'Lirael';
        base.event_slots = Object.assign({}, base.event_slots || {}, {
          actor: 'Lirael', action: 'ends the questioning and steps back from The Answer',
          target: 'the presiding Dohkar',
          exit_state: 'The questioning is ended by Lirael and the review is deferred.' });
        wrapper.choices[0].message.content = JSON.stringify(base);
        f = Object.assign({}, f, { body: JSON.stringify(wrapper) });
        console.log('  [fixture] scene planner: the reader DISPLACED the frame — lane = null');
      } else if (want && /SCENE-SPINE planner/.test(sysP)) {
        const LANE_EVENT = {
          dohkar_preliminary_review: {
            tactical: 'The presiding Dohkar calls for a preliminary review of Lirael\'s conduct in the rite, before the assembly.',
            change: 'The Dohkar calls for a preliminary review and Lirael must answer for the wish; a review will follow whatever she says here.',
            forces: 'Lirael must answer for the rite now, or let the review proceed on the Dohkar\'s terms.',
            slotAction: 'calls for a preliminary review of her conduct',
            exit: 'A preliminary review of Lirael\'s conduct is now called and on the record.',
            actor: 'the presiding Dohkar'
          },
          family_accusation: {
            tactical: 'Seren\'s family step out of the assembly and publicly accuse Lirael, demanding remedy for what the wish cost Seren.',
            change: 'Seren\'s family publicly demands remedy for the twisted wish, and the Dohkar enters it as a formal complaint.',
            forces: 'Lirael must answer the family\'s demand for remedy herself, or let the Dohkar fold it into his inquiry.',
            slotAction: 'publicly accuses Lirael and demands remedy for the twisted wish',
            exit: 'A formal complaint with standing now sits against Lirael.',
            actor: 'the presiding Dohkar'
          },
          julian_jurisdiction_challenge: {
            tactical: 'Julian challenges the Dohkar\'s jurisdiction over the rite and reframes whose authority rules on Lirael.',
            change: 'Julian contests his authority before the assembly, and the question of jurisdiction is now open.',
            forces: 'Lirael must choose whose jurisdiction she answers to, here, in the open.',
            slotAction: 'challenges the Dohkar and contests his authority over the rite',
            exit: 'Jurisdiction over the ruling is contested and unresolved.',
            actor: 'Julian'
          },
          lirael_constrained: {
            tactical: 'The Dohkar has Lirael placed under watch and escorted away from The Answer, pending the inquiry.',
            change: 'Lirael is confined pending the inquiry and separated from The Answer she was holding.',
            forces: 'Lirael must submit to being watched, or say something now that changes the terms.',
            slotAction: 'has Lirael placed under watch pending the inquiry',
            exit: 'Lirael is constrained and watched pending the inquiry.',
            actor: 'the presiding Dohkar'
          },
          lirael_defensive_path: {
            tactical: 'Lirael submits to procedure and demands specific terms before she answers anything further.',
            change: 'Lirael commits to procedure and demands specific terms, gathering what proof the rite left her.',
            forces: 'Lirael must name her terms now, or lose the chance to set any.',
            slotAction: 'submits to procedure and demands specific terms',
            exit: 'Lirael has chosen the procedural path and her terms are on the record.',
            actor: 'Lirael'
          }
        }[want];
        if (LANE_EVENT) {
          const base = JSON.parse(JSON.parse(f.body).choices[0].message.content);
          base.chosen_aftermath_lane = want;
          base.tactical_move = LANE_EVENT.tactical;
          base.state_change = LANE_EVENT.change;
          base.forces_choice = LANE_EVENT.forces;
          base.local_objective_actor = LANE_EVENT.actor;
          base.event_slots = Object.assign({}, base.event_slots || {}, {
            actor: LANE_EVENT.actor, action: LANE_EVENT.slotAction,
            target: 'Lirael', exit_state: LANE_EVENT.exit });
          const wrapper = JSON.parse(f.body);
          wrapper.choices[0].message.content = JSON.stringify(base);
          f = Object.assign({}, f, { body: JSON.stringify(wrapper) });
          console.log('  [fixture] scene planner: lane = "' + want
            + '" (forced by the reader\'s card) — serving an event that instantiates it');
        }
      }
    } catch (_) {}
    // SAY WHICH MATCHER SERVED WHICH CALL. Two fixtures were being answered by the wrong matcher
    // — the scene planner's contract went to "CONTINUITY ARCHITECT", which is the SCAFFOLD call —
    // and that is invisible unless the mapping is printed.
    try { const h = String((body.messages || [])[0]?.content || '').slice(0, 56).replace(/\s+/g, ' ');
      console.log('  [fixture] ' + (key ? ('"' + key.slice(0, 34) + '"') : 'DEFAULT') + '  <-  ' + h);
    } catch (_) {}
    // NAME WHAT FELL THROUGH. An unmatched prompt silently served '{}', which is how the fate
    // previews ended up as the literal "{}" in the Do field. Log it instead of guessing later.
    // SAVE THE PLANNER REQUEST VERBATIM. Its system prompt carries the roster, the reserved
    // events and the aftermath truths the reply must account for — the things a fixture has to
    // match. Reading them beats guessing at the contract one rejection at a time.
    try {
      const sys0 = String((body.messages || [])[0]?.content || '');
      // THE SCENE PLANNER, not the scaffold architect. "CONTINUITY ARCHITECT" is the SCAFFOLD
      // call; the scene planner is identified by its own JSON schema, and it is the reply that
      // owes the continuation envelope, the aftermath lane and the objective fields.
      if (/"tactical_move"/.test(sys0)) {
        write('scene_planner_request.txt', sys0 + '\n\n===== USER =====\n'
          + String((body.messages || [])[1]?.content || ''));
      }
      if (/CONTINUITY ARCHITECT/.test(sys0)) {
        write('scaffold_request.txt', sys0.slice(0, 2000));
      }
    } catch (_) {}
    if (!key) { try { const head = String((body.messages || [])[0]?.content || '').slice(0, 110).replace(/\s+/g, ' ');
      if (head && !_unmatched.has(head)) { _unmatched.add(head);
        console.log('  [fixture] NO MATCHER — serving default for: ' + head); } } catch (_) {} }
    if (f.delayMs) await new Promise(r => setTimeout(r, f.delayMs));
    if (f.fail) {
      calls.push({ n: calls.length + 1, requested, chars, ms: Date.now() - t0, estimate: est,
        fn: callFunction((body.messages || [])[0]?.content),
      pricedAs: quote.model, resolvedBy: quote.resolvedBy,
        error: 'fixture failure', measured: null });
      inFlight -= est; retained += est;
      outstanding = outstanding.filter(x => x !== resv); persistBudget();
      say('  call ' + calls.length + '  ' + requested + '  FIXTURE FAILURE');
      return route.fulfill({ status: 500, contentType: 'application/json',
        body: JSON.stringify({ error: 'fixture failure' }) });
    }
    const textF = typeof f.body === 'string' ? f.body : JSON.stringify(f.body);
    const recF = { n: calls.length + 1, requested, chars, maxTokens: body.max_tokens || null,
      fn: callFunction((body.messages || [])[0]?.content),
      pricedAs: quote.model, resolvedBy: quote.resolvedBy,
      convId: body.convId || null, role: body.role || null, ms: Date.now() - t0, estimate: est };
    try { const j = JSON.parse(textF); const u = j.usage || {};
      recF.served = j.model || null; recF.inTok = u.prompt_tokens ?? null;
      recF.outTok = u.completion_tokens ?? null;
      recF.cachedTok = (u.prompt_tokens_details || {}).cached_tokens ?? null;
      recF.ticks = u.cost_in_usd_ticks ?? null;
      recF.measured = (typeof recF.ticks === 'number') ? recF.ticks * 1e-10 : null;
    } catch (_) { recF.measured = null; }
    inFlight -= est;
    if (recF.measured != null) settled += recF.measured; else retained += est;
    outstanding = outstanding.filter(x => x !== resv); persistBudget();
    recF.exposureAfter = exposure();
    calls.push(recF);
    say('  call ' + String(recF.n).padStart(2) + '  [fixture] ' + String(requested).padEnd(28)
      + (recF.measured != null ? ' $' + recF.measured.toFixed(6) : ' no receipt')
      + '  ' + recF.ms + 'ms');
    recordPreviewReply(sys0ForIdentity, textF, recF.n, reqPreviewIdentity);
    noteOasReplyReceived(sys0ForIdentity, textF, recF.n, reqPreviewIdentity);
    noteOasCleanup(sys0ForIdentity, body, textF, recF.n, reqPreviewIdentity);
    // THE FIXTURE PATH RUNS THE SAME DETECTOR. A fixture can carry the runtime's error page, and
    // the harness must stop on it exactly as it would live — that is how this guard is tested.
    if (noteInfraFailure(textF, null, recF, url)) {
      return route.fulfill({ status: 503, contentType: 'application/json',
        body: JSON.stringify({ error: 'harness halted: infrastructure failure' }) });
    }
    if (_holdArm && callFunction(sys0ForIdentity) === 'OAS'
        && _replayAuthorIdx === _holdAtAuthorIdx) {
      _holdArm = false;
      _holdArrivedAt = Date.now();
      console.log('  [hold] the entrance OAS author request ARRIVED — holding its response');
      try { if (_holdArrived && _holdArrived._resolve) _holdArrived._resolve(); } catch (_) {}
      await Promise.race([_holdGate, new Promise((r) => setTimeout(r, 120000))]);
      console.log('  [hold] released after ' + (Date.now() - _holdArrivedAt) + 'ms');
    }
    if (process.env.SB_DUMP_REQ) {
      try {
        const _dd = '_audit_out/req_dump';
        fs.mkdirSync(_dd, { recursive: true });
        fs.writeFileSync(_dd + '/' + String(recF.n).padStart(3, '0') + '_'
          + String(callFunction(sys0ForIdentity) || 'other').replace(/[^a-z0-9]+/gi, '-') + '.json',
          JSON.stringify({ n: recF.n, fn: callFunction(sys0ForIdentity), messages: body.messages },
            null, 1));
      } catch (_) {}
    }
    const _rd = Number(process.env.SB_REPLY_DELAY_MS || 0);
    if (_rd > 0 && callFunction(sys0ForIdentity) === 'OAS' && _replayAuthorIdx === 1) {
      console.log('  [replay] delaying the ENTRANCE OAS author response by ' + _rd
        + 'ms (previews and every other fixture response are untouched)');
      await new Promise((r) => setTimeout(r, _rd));
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: textF });
  }
  try {
    // EXPLICIT TIMEOUT RESTORED. A bare route.fetch() has no deadline, and an author generation
    // that hangs takes the whole run with it.
    // THE TIMEOUT GOES ON route.fetch ITSELF. Racing a bare fetch against a timer leaves
    // Playwright's own 30s default in place, which is the deadline that actually fires and is
    // what killed author generation before. The outer race remains only as a backstop.
    resp = await Promise.race([
      route.fetch({ timeout: REQUEST_TIMEOUT_MS }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('harness backstop after '
        + (REQUEST_TIMEOUT_MS + 15000) + 'ms')), REQUEST_TIMEOUT_MS + 15000))
    ]);
    text = await resp.text();
    recordPreviewReply(sys0ForIdentity, text, calls.length + 1, reqPreviewIdentity);
    noteOasReplyReceived(sys0ForIdentity, text, calls.length + 1, reqPreviewIdentity);
    noteOasCleanup(sys0ForIdentity, body, text, calls.length + 1, reqPreviewIdentity);
  } catch (e) { err = String(e && e.message); }
  const ms = Date.now() - t0;

  const rec = { n: calls.length + 1, requested, chars, maxTokens: body.max_tokens || null,
      fn: callFunction((body.messages || [])[0]?.content),
      pricedAs: quote.model, resolvedBy: quote.resolvedBy,
    convId: body.convId || null, role: body.role || null, ms, estimate: est };
  if (err || !resp) {
    rec.error = err || 'no response';
    rec.measured = null;
    inFlight -= est; retained += est;    // UNRESOLVED: the reservation is kept, not released
    outstanding = outstanding.filter(x => x !== resv); persistBudget();
    ledger.recordDispatchedNoResponse
      ? ledger.recordDispatchedNoResponse('call#' + rec.n, est, requested, rec.error)
      : null;
    say('  call ' + rec.n + '  ' + requested + '  ' + chars + 'c  DISPATCHED, NO RESPONSE: ' + rec.error);
    calls.push(rec);
    return route.fulfill({ status: 502, contentType: 'application/json',
      body: JSON.stringify({ error: rec.error }) });
  }
  try {
    const j = JSON.parse(text);
    rec.served = j.model || null;
    const u = j.usage || {};
    rec.inTok = u.prompt_tokens ?? null;
    rec.outTok = u.completion_tokens ?? null;
    rec.cachedTok = (u.prompt_tokens_details && u.prompt_tokens_details.cached_tokens) ?? null;
    rec.reasoningTok = (u.completion_tokens_details && u.completion_tokens_details.reasoning_tokens) ?? null;
    rec.ticks = u.cost_in_usd_ticks ?? null;
    rec.measured = (typeof rec.ticks === 'number') ? rec.ticks * 1e-10 : null;
  } catch (_) { rec.parseError = true; rec.measured = null; }

  // ── AN INFRASTRUCTURE FAILURE STOPS THE RUN. (Codex 2026-10-06.) ────────────────────────────
  // The previous version recorded the failed parse, retained the estimate, and PASSED THE ERROR
  // BACK TO THE APP — which then ran its fallback chain and kept taking turns. Twenty-nine calls
  // were dispatched against a response path that returned nothing usable, every one of them
  // reserving budget. The budget guard worked; an infrastructure stop was missing.
  //
  // NO_RESPONSE_FROM_FUNCTION is the local runtime failing to return a response the function may
  // already have completed — so the upstream call may ALREADY BE BILLED. On the first one: keep
  // the body, keep the exposure, refuse every further provider dispatch INCLUDING fallbacks, and
  // end the scenario. This is a HARNESS stop; it does not disable GPT/Mistral fallback in normal
  // production operation.
  noteInfraFailure(text, resp, rec, url);

  // SETTLE: a receipt replaces the reservation; no receipt retains it.
  inFlight -= est;
  if (rec.measured != null) settled += rec.measured; else retained += est;
  outstanding = outstanding.filter(x => x !== resv); persistBudget();
  rec.exposureAfter = exposure();
  calls.push(rec);
  // FULL request and response preserved — truncated console lines are not evidence.
  try {
    fs.mkdirSync(RUN + '/wire', { recursive: true });
    fs.writeFileSync(RUN + '/wire/' + String(rec.n).padStart(3, '0') + '_req.json', raw || '');
    fs.writeFileSync(RUN + '/wire/' + String(rec.n).padStart(3, '0') + '_res.json', text || '');
  } catch (_) {}
  say('  call ' + String(rec.n).padStart(2) + '  ' + String(requested).padEnd(30)
    + ' served=' + String(rec.served || '?').padEnd(30)
    + ' in=' + String(rec.inTok ?? '?').padStart(6)
    + ' cached=' + String(rec.cachedTok ?? '?').padStart(5)
    + ' out=' + String(rec.outTok ?? '?').padStart(5)
    + (rec.measured != null ? '  $' + rec.measured.toFixed(6) : '  NO RECEIPT (est $' + est.toFixed(6) + ')')
    + '  ' + ms + 'ms');
  write('calls.json', calls);
  return route.fulfill({ status: resp.status(), headers: resp.headers(), body: text });
});

// ── THE CORRECTED LIFECYCLE'S SESSION SETUP (2026-10-08) ──────────────────────────────────────
// Seeded BEFORE any page script runs: supabase-js resolves getSession() from storage at load, and
// the real gate refuses to charge without a session token.
// ── HARNESS INSTRUMENTATION: THE POLICY'S OWN RECORD ─────────────────────────────────────────
// _authorFullScenePolicy already returns { text, provider, model, attempts } with tier 1 = grok and
// tier 2 = ministral. Rather than infer the executed branch from payload sizes and model names,
// wrap it here and keep what it actually returned. No production logging is added and the fallback
// policy is untouched — this only observes.
await page.addInitScript(() => {
  window.__sbPolicyCalls = [];
  const install = () => {
    const orig = window._authorFullScenePolicy;
    if (typeof orig !== 'function' || orig.__sbWrapped) return false;
    const wrapped = async function (...args) {
      const started = Date.now();
      let out = null, threw = null;
      try { out = await orig.apply(this, args); }
      catch (e) { threw = String((e && e.message) || e); throw e; }
      finally {
        try {
          window.__sbPolicyCalls.push({
            at: started, ms: Date.now() - started, threw: threw,
            provider: out && out.provider, model: out && out.model,
            textLen: out && out.text ? String(out.text).length : 0,
            textHead: out && out.text ? String(out.text).slice(0, 90) : null,
            attempts: out && Array.isArray(out.attempts) ? out.attempts : null
          });
        } catch (_) {}
      }
      return out;
    };
    wrapped.__sbWrapped = true;
    window._authorFullScenePolicy = wrapped;
    return true;
  };
  if (!install()) {
    const iv = setInterval(() => { if (install()) clearInterval(iv); }, 50);
    setTimeout(() => clearInterval(iv), 60000);
  }
});
await page.addInitScript(() => {
  window.__sbAppend = { calls: [], snapshots: [] };
  const snap = (tag) => {
    try {
      const log = document.getElementById('oasHistoryLog');
      window.__sbAppend.snapshots.push({ tag, at: Date.now(),
        logExists: !!log,
        logParent: log && log.parentElement ? (log.parentElement.id || log.parentElement.className || '?') : null,
        logVisible: !!(log && log.getClientRects().length > 0),
        logChildren: log ? log.children.length : null,
        pendingBubbles: document.querySelectorAll('.oas-pc-bubble-pending').length,
        youRows: document.querySelectorAll('.oas-chat-you').length,
        logText: log ? String(log.innerText || log.textContent || '').slice(0, 300) : null });
    } catch (_) {}
  };
  window.__sbAppendSnap = snap;
  const installAppend = () => {
    const orig = window._appendUserInputToHistory;
    if (typeof orig !== 'function' || orig.__sbWrapped) return false;
    const wrapped = function (userSay, userDo) {
      const log = document.getElementById('oasHistoryLog');
      const before = { logExists: !!log,
        logChildren: log ? log.children.length : null,
        say: String(userSay || '').slice(0, 60), do: String(userDo || '').slice(0, 60) };
      let out;
      try { out = orig.apply(this, arguments); }
      finally {
        const log2 = document.getElementById('oasHistoryLog');
        window.__sbAppend.calls.push({ at: Date.now(), before,
          after: { logExists: !!log2,
                   logChildren: log2 ? log2.children.length : null,
                   pendingBubbles: document.querySelectorAll('.oas-pc-bubble-pending').length,
                   youRows: document.querySelectorAll('.oas-chat-you').length } });
      }
      return out;
    };
    wrapped.__sbWrapped = true;
    window._appendUserInputToHistory = wrapped;
    return true;
  };
  if (!installAppend()) {
    const iv2 = setInterval(() => { if (installAppend()) clearInterval(iv2); }, 25);
    setTimeout(() => clearInterval(iv2), 60000);
  }
  window.__sbRace = { rehydrations: [] };
  const install = () => {
    const orig = window._rehydrateOASUI;
    if (typeof orig !== 'function' || orig.__sbRaceWrapped) return false;
    const wrapped = function (...args) {
      const d = (window.state && window.state.intimacyDialogue) || {};
      const before = { pendingRequestId: d.pendingRequestId || null,
        awaitingResponse: !!d.awaitingResponse,
        ageMs: d.lastRequestStartedAt ? (Date.now() - d.lastRequestStartedAt) : null };
      const stack = String((new Error('rehydrate-caller')).stack || '')
        .split('\n').slice(1, 10).map((l) => l.trim());
      try { if (window.__sbAppendSnap) window.__sbAppendSnap('before-rehydrate'); } catch (_) {}
      let out;
      try { out = orig.apply(this, args); }
      finally {
        try { if (window.__sbAppendSnap) window.__sbAppendSnap('after-rehydrate'); } catch (_) {}
        const d2 = (window.state && window.state.intimacyDialogue) || {};
        window.__sbRace.rehydrations.push({ at: Date.now(), before,
          afterPendingRequestId: d2.pendingRequestId || null,
          replacedALiveRequest: before.awaitingResponse && before.ageMs !== null
            && before.ageMs < 5000
            && !!before.pendingRequestId
            && before.pendingRequestId !== ((window.state && window.state.intimacyDialogue
                 && window.state.intimacyDialogue.pendingRequestId) || null),
          preservedALiveRequest: before.awaitingResponse && !!before.pendingRequestId
            && before.pendingRequestId === ((window.state && window.state.intimacyDialogue
                 && window.state.intimacyDialogue.pendingRequestId) || null),
          stack });
      }
      return out;
    };
    wrapped.__sbRaceWrapped = true;
    window._rehydrateOASUI = wrapped;
    return true;
  };
  if (!install()) {
    const iv = setInterval(() => { if (install()) clearInterval(iv); }, 25);
    setTimeout(() => clearInterval(iv), 60000);
  }
});
await installSession(page);
// ── ROUTE PRECEDENCE MATTERS, AND I HAD IT BACKWARDS ─────────────────────────────────────────
// Playwright runs matching handlers NEWEST-FIRST. I registered the generic auth catch-all LAST,
// so it answered every sb-test request with {} and MASKED both the profiles stub and the zero-row
// purchase_intents handler — recreating the exact phantom-purchase fixture bug that cost hours.
// The passing control's order is: generic FIRST, then the profiles stub, then purchase_intents —
// so the most specific handler is the newest and therefore wins.
await page.route('**/sb-test.localhost/**', async (r) => {
  if (isAuthOrigin(r.request().url())) {
    try { await r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); } catch (_) {}
    return;
  }
  try { await r.fallback(); } catch (_) {}
});
await installEntitledProfileStub(page);
const _piSeen = [];
await page.route('**/sb-test.localhost/**', async (r) => {
  const q = r.request();
  if (q.method() === 'GET' && /\/rest\/v1\/purchase_intents(\?|$)/.test(q.url())) {
    _piSeen.push('served []');
    try { await r.fulfill({ status: 200, contentType: 'application/json',
      headers: { 'Content-Range': '*/0' }, body: '[]' }); } catch (_) {}
    return;
  }
  try { await r.fallback(); } catch (_) {}
});
// ORIGIN IS NOT ASSUMED. The dev server is not always on 3000 — on 2026-10-12 a second instance
// held 3000 while serving a function layer whose @vercel/node builder had failed to install, so
// every /api/* call there answered 502 while static files served normally. A paid run pointed at
// that instance would have spent its authorization on local failures. Default unchanged.
const SB_ORIGIN = process.env.SB_ORIGIN || 'http://localhost:3000';
say('origin: ' + SB_ORIGIN + (process.env.SB_ORIGIN ? ' (SB_ORIGIN)' : ' (default)'));
await page.goto(SB_ORIGIN + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._advanceStagedScene === 'function', { timeout: 30000 });
say('app loaded\n');
write('PLAN.md', '# FS live sequence\n\nCeiling $3.00, authorized 2026-10-04.\n'
  + 'Scene 1 fixed · live OAS · Scenes 2-4 generated.\n');

const snapshot = async (label) => page.evaluate((l) => {
  const cg = (window.state.scenes || []).filter(x => x && String(x.uid).startsWith('cg:'));
  return { label: l, scenes: cg.length,
    texts: cg.map(x => ({ uid: x.uid, text: x.text })),
    notes: (window.state._historyNotes || []).map(n => ({ ref: n.ref,
      quoted: (n.quoted || []).map(q => q.quote),
      summary: (n.summary || []).map(x => x.text),
      obligations: (n.obligations || []).map(o => o.id) })),
    oas: ((window.state._oasSceneSnapshots || {})['0'] || {}).beats || null };
}, label);

async function pageToGate(maxClicks = 14) {
  for (let i = 0; i < maxClicks; i++) {
    const st = await page.evaluate(() => {
      const a = window.state._stagedActive || null;
      return a ? { gateShown: !!a.gateShown, beat: a.currentBeatIdx,
        beats: a.plan && a.plan.beats ? a.plan.beats.length : null } : null;
    });
    if (st && st.gateShown) return { ...st, clicks: i };
    const ok = await page.evaluate(() => {
      const b = document.getElementById('gnNextPageBtn');
      if (b && !b.disabled) { b.click(); return true; }
      if (typeof window._advanceStagedBeat === 'function') { window._advanceStagedBeat(); return true; }
      return false;
    });
    if (!ok) break;
    await page.waitForTimeout(1200);
  }
  return await page.evaluate(() => {
    const a = window.state._stagedActive || null;
    return a ? { gateShown: !!a.gateShown, beat: a.currentBeatIdx } : { gateShown: false };
  });
}

try {
  say('── SETUP (live: bibles, plots, scaffold — the unpriced stage) ──');
  await page.evaluate(() => { window.state.profileId = 'harness-reader'; window.state.fortunes = 9999;
    window.state.storypassEligible = true; window.state.subscribed = true; });
  const def = await findFSDef(page);
  // THE READER HAS OPTED OUT OF PORTRAITS. Three overlays otherwise stand between the opening
  // and the OAS deck — pcLookModal, its "Skip anyway" confirmation, and liRenderModal — each
  // intercepting pointer events, and the look modal RE-OPENS after every dismissal. These are
  // the product's OWN opt-out flags (_pcLookSkipped is commented in app.js as 'user clicked
  // "skip"'), so this is the state a reader reaches by clicking Skip. Images are blocked anyway.
  // optOutPortraits REMOVED: writing _pcLookSkipped/_liRenderSkipped asserts the opt-out instead
  // of performing it, and this route now clicks the real Skip controls.
  /* portrait opt-out STATE WRITES removed on this route — clearOnboarding() uses the reader's own Skip controls */
  await launchFS(page, def);
  /* portrait opt-out STATE WRITES removed on this route — clearOnboarding() uses the reader's own Skip controls */
  // DETERMINISTIC CARD PICKING, shared by the OAS turns AND the scene loop. These were
  // declared inside the OAS block and used again in the scene loop, so scene 2 died on
  // "nextPick is not defined" the moment the OAS handoff finally succeeded — the same class
  // of defect as the deleted waitForHand(). One sequence now covers both phases.
  let pickSeed = 1013904223;
  const nextPick = (n) => { pickSeed = (1664525 * pickSeed + 1013904223) >>> 0; return pickSeed % n; };
  // ── NO UNLOCK SHORTCUT ON THIS ROUTE (2026-10-08) ───────────────────────────────────────────
  // unlockFS called _unlockBakedGenesis directly and finalizePreview skipped the preview flow, so
  // this runner never exercised the gate the reader meets, and it reached the OAS with Genesis
  // already unlocked. Both are gone. The reader's own path is: clear the onboarding overlays with
  // their real controls, turn the pages to a GENUINELY LOCKED, VISIBLE entrance, and let the gate
  // ask for payment at Submit.
  const ONBOARD_CTRLS = [
    { sel: '.skip-render-warn-btn[data-act="skip"]', what: '"Skip anyway"' },
    { sel: '#pcLookSkipBtn', what: 'look Skip' },
    { sel: '#liRenderSkipBtn', what: 'LI render Skip' }
  ];
  const clearOnboarding = async () => {
    for (let r = 0; r < 6; r++) {
      let acted = false;
      for (const o of ONBOARD_CTRLS) {
        const vis = await page.evaluate((q) => {
          const e = document.querySelector(q); return !!(e && e.getClientRects().length > 0); }, o.sel);
        if (!vis) continue;
        await page.click(o.sel, { timeout: 6000 }).catch(() => {});
        acted = true; await page.waitForTimeout(1200); break;
      }
      if (!acted) break;
    }
  };
  let _navLog = [];
  for (let i = 0; i < 25; i++) {
    const st = await page.evaluate(() => {
      const v = (id) => { const e = document.getElementById(id); return !!(e && e.getClientRects().length > 0); };
      return { entrance: v('bakedOASExamineBtn') && v('bakedOASSubmitBtn'),
               cover: v('coverNextBtn'), next: v('nextPageBtn'), front: !!window._frontispieceActive };
    });
    if (st.entrance) { _navLog.push('entrance on screen after ' + i + ' turns'); break; }
    await clearOnboarding();
    if (st.cover) { await page.click('#coverNextBtn', { timeout: 6000 }).catch(() => {}); _navLog.push('cover'); }
    else if (st.front) {
      await page.evaluate(() => { try { window.dismissFatelandsFrontispiece(); } catch (_) {} });
      _navLog.push('frontispiece');
      for (let w = 0; w < 12; w++) { if (await page.evaluate(() => !window._frontispieceActive)) break; await page.waitForTimeout(500); }
    } else if (st.next) { await page.click('#nextPageBtn', { timeout: 6000 }).catch(() => {}); _navLog.push('next'); }
    else { _navLog.push('no control'); break; }
    await page.waitForTimeout(1100);
  }
  const _atEntrance = await page.evaluate(() => {
    const v = (id) => { const e = document.getElementById(id); return !!(e && e.getClientRects().length > 0); };
    return { onScreen: v('bakedOASExamineBtn') && v('bakedOASSubmitBtn'),
             locked: !window.state._bakedGenesisUnlocked,
             setupComplete: !!window.state._bakedSetupComplete };
  });
  say('  navigation: ' + _navLog.join(' -> '));
  say('  at the entrance: ' + JSON.stringify(_atEntrance));
  if (!_atEntrance.onScreen) {
    halted = true;
    say('\n*** STOPPING — the locked entrance was never reachable; no provider dispatch attempted ***');
  } else if (!_atEntrance.locked) {
    halted = true;
    say('\n*** STOPPING — the entrance was reached ALREADY UNLOCKED, so the gate would not be '
      + 'exercised; no provider dispatch attempted ***');
  }
  say('  setup complete · exposure $' + exposure().toFixed(6) + '\n');
  const dumpPolicy = async (tag) => {
    try {
      const rec = await page.evaluate(() => window.__sbPolicyCalls || []);
      write('policy_calls.json', rec);
      say('  [policy] ' + tag + ' — ' + rec.length + ' invocation(s) recorded');
      rec.slice(0, 4).forEach((r, i) => say('    #' + (i + 1) + ' selected=' + r.provider + '/'
        + r.model + ' textLen=' + r.textLen + ' attempts='
        + JSON.stringify((r.attempts || []).map(a => a.tier + ':' + a.provider
          + (a.ok === false ? ':FAILED' + (a.status ? '(' + a.status + ')' : '')
             : a.skipped ? ':skipped' : ':ok')))));
    } catch (e) { say('  [policy] dump failed: ' + (e && e.message)); }
  };

  if (!halted) {
    say('── OAS (live) ──');
    /* portrait opt-out STATE WRITES removed on this route — clearOnboarding() uses the reader's own Skip controls */
    // THE REVISED OPENING ENTERS BY ANSWERING JULIAN, so that submission IS the first exchange.
    // enterOAS reports firstTurnConsumed for the new entrance (the legacy Continue button does
    // not), and the six are counted INCLUDING it.
    // THE ENTRANCE IS TURN 1. setPreviewContext only ran inside the loop, so the entrance's reply
    // was never NOTED under any turn and there was nothing for the attribution to match. Its
    // context is set before its dispatch; the loop therefore starts at turn 2.
    setPreviewContext('opening OAS', 1);
    const _scenario = String(process.env.SB_SCENARIO || '').toLowerCase();
    const _sres = { scenario: _scenario, checks: [] };
    const _sck = (label, ok, detail) => {
      _sres.checks.push({ label, ok: !!ok, detail: detail || null });
      say('    ' + (ok ? 'ok   ' : 'FAIL ') + label + (ok || !detail ? '' : '  - ' + detail));
    };
    _armWork = null;
    if (_scenario) {
      const _exp = exposure();
      const _head = CEILING ? (CEILING - _exp) : Infinity;
      say('    fixture ledger: ' + BUDGET_FILE);
      say('    admission: exposure USD ' + _exp.toFixed(6) + ' of ceiling USD ' + CEILING
        + ' - headroom USD ' + (isFinite(_head) ? _head.toFixed(6) : 'unbounded'));
      if (isFinite(_head) && _head <= 0.25) {
        say('*** NOT ADMITTED - the fixture ledger has USD ' + _head.toFixed(6)
          + ' of headroom against USD ' + CEILING + '. This is the SAME refusal the spending'
          + ' guard raises before dispatch; give this arm its own ledger via SB_FIXTURE_BUDGET.');
        halted = true;
        haltReason = 'fixture budget not admitted (headroom USD ' + _head.toFixed(6) + ')';
      } else {
        _armHold();
        _armWork = (async () => {
          let _arrived = false;
          try {
            await Promise.race([_holdArrived.then(() => { _arrived = true; }),
                                new Promise((r) => setTimeout(r, 120000))]);
            _sck('the entrance OAS request ARRIVED at the interceptor', _arrived,
              'no entrance author request within 120s');
            if (!_arrived) return;
            const _live = await page.evaluate(() => {
              const d = (window.state && window.state.intimacyDialogue) || {};
              return { awaiting: !!d.awaitingResponse, id: d.pendingRequestId || null };
            });
            say('      in flight: ' + JSON.stringify(_live));
            // Checked HERE: the entrance dispatches after the gate confirmation, so this report
            // does not exist until the request is actually in flight.
            const _disp = consoleLog.filter((l) => /submitting as the first turn/.test(l)).pop() || '';
            const _dm = _disp.match(/say=(\d+)c do=(\d+)c/);
            say('      entrance dispatch report: ' + JSON.stringify(_disp));
            _sck('a nonempty SAY was supplied and read at submit', !!_dm && Number(_dm[1]) > 0,
              'say length ' + (_dm ? _dm[1] : 'unreported'));
            _sck('a nonempty DO was supplied and read at submit', !!_dm && Number(_dm[2]) > 0,
              'do length ' + (_dm ? _dm[2] : 'unreported'));
            _sck('production reports awaitingResponse=true with a nonempty request id',
              _live.awaiting && !!_live.id && String(_live.id).trim() !== '',
              JSON.stringify(_live));

            if (_scenario === 'waiting') {
              const _dl = Date.now() + 25000;
              let _rehyd = [];
              while (Date.now() < _dl) {
                _rehyd = await page.evaluate(() => (window.__sbRace || { rehydrations: [] }).rehydrations);
                if (_rehyd.length > 0) break;
                await page.waitForTimeout(400);
              }
              _sck('the automatic rehydration occurred while the reply was held', _rehyd.length > 0,
                'no rehydration recorded within 25s');
              _sck('it PRESERVED the live request rather than replacing it',
                _rehyd.some((r) => r.preservedALiveRequest) && !_rehyd.some((r) => r.replacedALiveRequest),
                JSON.stringify(_rehyd.map((r) => ({ preserved: r.preservedALiveRequest, replaced: r.replacedALiveRequest }))));
              // Search the WHOLE document, not one panel: an 18-character sample from
              // gnPanelDisplay proved only that I was reading the wrong container.
              // THE ACTUAL CONTAINER, INSPECTED DIRECTLY.
              const _ap = await page.evaluate(() => {
                try { if (window.__sbAppendSnap) window.__sbAppendSnap('while-held'); } catch (_) {}
                return window.__sbAppend || { calls: [], snapshots: [] };
              });
              say('      _appendUserInputToHistory calls: ' + _ap.calls.length);
              _ap.calls.forEach((c, i) => say('        #' + (i + 1)
                + ' logExists(before)=' + c.before.logExists
                + ' say=' + JSON.stringify(c.before.say)
                + ' do=' + JSON.stringify(c.before.do)
                + ' -> logExists=' + c.after.logExists
                + ' children=' + c.after.logChildren
                + ' pendingBubbles=' + c.after.pendingBubbles
                + ' youRows=' + c.after.youRows));
              _ap.snapshots.forEach((sn) => say('        [' + sn.tag + '] logExists=' + sn.logExists
                + ' parent=' + JSON.stringify(sn.logParent) + ' visible=' + sn.logVisible
                + ' children=' + sn.logChildren + ' pending=' + sn.pendingBubbles
                + ' you=' + sn.youRows));
              // Production calls the INTERNAL _appendUserInputToHistory, so a wrapper on the
              // window property never sees it. The DOM it produces is the evidence.
              const _held = _ap.snapshots.filter((x) => x.tag === 'while-held').pop() || {};
              _sck('#oasHistoryLog exists while the reply is held', !!_held.logExists,
                JSON.stringify(_held));
              _sck('the player bubble was rendered into #oasHistoryLog',
                (_held.pendingBubbles || 0) > 0 || (_held.youRows || 0) > 0,
                'pending=' + _held.pendingBubbles + ' you=' + _held.youRows
                + ' children=' + _held.logChildren);
              _sck('the submitted SAY is inside #oasHistoryLog',
                String(_held.logText || '').indexOf('I shaped nothing') >= 0,
                'log text: ' + JSON.stringify(String(_held.logText || '').slice(0, 120)));
              _sck('the submitted DO is inside #oasHistoryLog',
                String(_held.logText || '').indexOf('keep my hand open') >= 0,
                'log text: ' + JSON.stringify(String(_held.logText || '').slice(0, 120)));
              const _lastSnap = _ap.snapshots[_ap.snapshots.length - 1] || {};
              _sck('#oasHistoryLog is mounted AND visible while the reply is held',
                !!_lastSnap.logExists && !!_lastSnap.logVisible,
                JSON.stringify({ exists: _lastSnap.logExists, visible: _lastSnap.logVisible,
                                 parent: _lastSnap.logParent }));
              const _visAll = await page.evaluate(() => {
                const panel = document.getElementById('gnPanelDisplay');
                const story = document.getElementById('storyContent');
                // Distinguish RENDERED-BUT-COVERED from NOT RENDERED: body.innerText excludes
                // hidden subtrees, and a Concierge overlay was dominating it.
                return { body: String(document.body.innerText || ''),
                         storyText: story ? String(story.innerText || story.textContent || '') : '',
                         panelText: panel ? String(panel.innerText || panel.textContent || '') : '',
                         panel: panel ? String(panel.innerText || '').length : null,
                         story: story ? String(story.innerText || '').length : null,
                         snippet: String(document.body.innerText || '').slice(0, 220) };
              });
              const _vis = _visAll.body;
              say('      visible text: body=' + _vis.length + ' panel=' + _visAll.panel
                + ' story=' + _visAll.story);
              say('      snippet: ' + JSON.stringify(_visAll.snippet));
              const _conv = _vis + '\n' + (_visAll.storyText || '') + '\n' + (_visAll.panelText || '');
              _sck('the submitted SAY is present in the conversation while the reply is held',
                _conv.indexOf('I shaped nothing') >= 0,
                'absent from body(' + _vis.length + ') + storyContent('
                + (_visAll.storyText || '').length + ') + panel('
                + (_visAll.panelText || '').length + ')');
              _sck('the submitted DO is present in the conversation while the reply is held',
                _conv.indexOf('keep my hand open') >= 0,
                'absent from the same three containers');
              _releaseHold();
              await page.waitForTimeout(18000);
              const _turns = await page.evaluate(() => {
                const d = (window.state && window.state.intimacyDialogue) || {};
                return (Array.isArray(d.liTurnHistory) ? d.liTurnHistory : []).length;
              });
              _sck('exactly ONE reply rendered after the hold was released', _turns === 1,
                'liTurnHistory length is ' + _turns);
              // DOES THE TRANSCRIPT EVER SHOW THE PLAYER'S WORDS? If they are absent AFTER the
              // reply too, nothing was lost by any rebuild — the conversation simply does not
              // display the player's submission, which is a different claim entirely.
              const _post = await page.evaluate(() => {
                const panel = document.getElementById('gnPanelDisplay');
                const story = document.getElementById('storyContent');
                return String(document.body.innerText || '') + '\n'
                  + (story ? String(story.innerText || story.textContent || '') : '') + '\n'
                  + (panel ? String(panel.innerText || panel.textContent || '') : '');
              });
              _sck('AFTER the reply, the submitted SAY appears in the transcript',
                _post.indexOf('I shaped nothing') >= 0,
                'still absent after the reply rendered - the transcript never shows it');
              _sck('AFTER the reply, the submitted DO appears in the transcript',
                _post.indexOf('keep my hand open') >= 0,
                'still absent after the reply rendered');
            }

            if (_scenario === 'reload') {
              const _persisted = await page.evaluate(() => {
                try {
                  const sn = (typeof window._loadPersistedOASState === 'function')
                    ? window._loadPersistedOASState() : null;
                  return sn ? { awaiting: !!sn.awaitingResponse, id: sn.pendingRequestId || null,
                                active: !!sn.active } : null;
                } catch (e) { return { error: String(e && e.message) }; }
              });
              say('      persisted snapshot: ' + JSON.stringify(_persisted));
              const _hadPending = !!(_persisted && _persisted.awaiting && _persisted.id);
              say('      OBSERVATION (not a pass/fail): this entrance checkpoint '
                + (_hadPending ? 'DID' : 'did NOT')
                + ' persist a pending request. That is a fact about this checkpoint only.');
              _sres.observations = _sres.observations || [];
              _sres.observations.push({ persistedPendingRequest: _hadPending, snapshot: _persisted });
              await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
              _releaseHold();
              await page.waitForTimeout(16000);
              const _post = await page.evaluate(() => {
                const d = (window.state && window.state.intimacyDialogue) || {};
                const el = document.getElementById('gnDialogueInput')
                  || document.getElementById('dialogueInput');
                return { awaiting: !!d.awaitingResponse, id: d.pendingRequestId || null,
                         active: !!d.active, inputUsable: !!(el && !el.disabled),
                         thinking: !!document.querySelector('.intimacy-thinking, #intimacyThinking') };
              });
              say('      after the reload: ' + JSON.stringify(_post));
              _sck('after a real reload the reader is not left waiting', !_post.awaiting,
                'awaitingResponse is still true after the reload');
              if (!_hadPending) {
                say('      NOTE: with no pending request persisted, this arm shows the entrance'
                  + ' reload behaviour only. Orphan CLEARING is covered by SB_SCENARIO=orphan,'
                  + ' which restores an explicitly labelled fixture snapshot.');
              }
              _sck('no stuck waiting state is left on screen', !_post.thinking,
                'a thinking indicator is still showing');
            }

            if (_scenario === 'orphan') {
              // Find the key production itself uses, then write a FIXTURE snapshot carrying a
              // pending request that no fetch will ever answer. Nothing in production changes.
              const _key = await page.evaluate(() => {
                const keys = [];
                for (let i = 0; i < localStorage.length; i++) {
                  const k = localStorage.key(i);
                  if (k && /oas|intimacy/i.test(k)) keys.push(k);
                }
                return keys;
              });
              say('      OAS storage keys production is using: ' + JSON.stringify(_key));
              _sck('production has an OAS snapshot key to restore from', _key.length > 0,
                'no oas/intimacy key in localStorage');
              if (_key.length > 0) {
                const _wrote = await page.evaluate((k) => {
                  try {
                    const raw = localStorage.getItem(k);
                    const snap = JSON.parse(raw);
                    snap.awaitingResponse = true;
                    snap.pendingRequestId = 'FIXTURE-ORPHAN-never-answered';
                    snap.lastRequestStartedAt = Date.now() - 30000;
                    snap.__fixture = 'explicitly labelled orphan written by the harness';
                    localStorage.setItem(k, JSON.stringify(snap));
                    return { ok: true, key: k };
                  } catch (e) { return { ok: false, error: String(e && e.message) }; }
                }, _key[0]);
                say('      fixture orphan written: ' + JSON.stringify(_wrote));
                _sck('the labelled orphan snapshot was stored', !!_wrote.ok, JSON.stringify(_wrote));
                _releaseHold();
                await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
                await page.waitForTimeout(16000);
                const _after = await page.evaluate(() => {
                  const d = (window.state && window.state.intimacyDialogue) || {};
                  const el = document.getElementById('gnDialogueInput')
                    || document.getElementById('dialogueInput');
                  return { awaiting: !!d.awaitingResponse, id: d.pendingRequestId || null,
                           inputUsable: !!(el && !el.disabled),
                           thinking: !!document.querySelector('.intimacy-thinking, #intimacyThinking') };
                });
                say('      after restoring the orphan and reloading: ' + JSON.stringify(_after));
                // PREREQUISITE: the encounter must actually be restored. A default-empty state
                // proves nothing about orphan handling.
                const _restored = await page.evaluate(() => {
                  const d = (window.state && window.state.intimacyDialogue) || null;
                  return { hasEncounter: !!d, active: !!(d && d.active),
                           storyId: (window.state && window.state.storyId) || null,
                           beat: (d && d.beatCount) || null };
                });
                say('      restored encounter: ' + JSON.stringify(_restored));
                const _setupMet = !!(_restored.hasEncounter && _restored.storyId);
                _sck('SETUP MET: the fixture story and encounter were restored after the reload',
                  _setupMet,
                  'the encounter did not come back, so nothing below can be asserted: '
                  + JSON.stringify(_restored));
                if (!_setupMet) {
                  say('      SETUP UNMET - orphan clearing is NOT tested by this run. The'
                    + ' default-empty state is not evidence of cleanup.');
                }
                const _dropped = consoleLog.filter((l) =>
                  /Rehydrate: dropping stale in-flight request/.test(l)
                  && String(l).indexOf('FIXTURE-ORPHAN') >= 0);
                _sck('production DROPPED the restored orphan on reload', _dropped.length > 0,
                  'no drop line naming the fixture orphan');
                if (_setupMet) {
                  _sck('awaitingResponse was cleared', !_after.awaiting,
                    'still awaiting after the reload');
                  _sck('the reader is not stuck behind a waiting indicator', !_after.thinking,
                    'a thinking indicator is still showing');
                }
              }
            }

            if (_scenario === 'supersede') {
              const _id1 = _live.id;
              const _before = await page.evaluate(() => {
                const d = (window.state && window.state.intimacyDialogue) || {};
                return (Array.isArray(d.liTurnHistory) ? d.liTurnHistory : []).length;
              });
              await page.evaluate(() => {
                try { window._intimacyDialogueConsumeInput('A second thing entirely.', 'I step back.'); }
                catch (e) { window.__sbSupersedeErr = String(e && e.message); }
              });
              await page.waitForTimeout(5000);
              const _id2 = await page.evaluate(() => {
                const d = (window.state && window.state.intimacyDialogue) || {};
                return d.pendingRequestId || null;
              });
              say('      ids: first=' + JSON.stringify(_id1) + ' now=' + JSON.stringify(_id2));
              _sck('production moved the request identity on the second submission',
                !!_id2 && !!_id1 && _id2 !== _id1, JSON.stringify([_id1, _id2]));
              _releaseHold();
              await page.waitForTimeout(18000);
              const _disc = consoleLog.filter((l) => /Stale response/.test(l)
                && String(l).indexOf(String(_id1)) >= 0);
              _sck('the SUPERSEDED reply was still discarded', _disc.length > 0,
                'no stale-response discard naming ' + JSON.stringify(_id1));
              const _after = await page.evaluate(() => {
                const d = (window.state && window.state.intimacyDialogue) || {};
                return (Array.isArray(d.liTurnHistory) ? d.liTurnHistory : []).length;
              });
              _sck('it did not append the superseded turn to history', _after <= _before + 1,
                'history grew from ' + _before + ' to ' + _after);
            }
          } catch (e) {
            _sck('the arm ran without throwing', false, String(e && e.message));
          } finally {
            _releaseHold();
          }
        })();
      }
    }
    const _ARM_SAY = 'I shaped nothing. Ask me properly.';
    const _ARM_DO = 'I keep my hand open and do not look away.';
    const _entry = _scenario
      ? await enterOAS(page, { settleMs: 9000, say: _ARM_SAY, doText: _ARM_DO })
      : await enterOAS(page, { settleMs: 9000 });

    say('  entered via ' + ((_entry && _entry.route) || '?'));
    // ENTRY FAILURE HALTS IMMEDIATELY. enterOAS now refuses rather than clicking a hidden
    // element, and a refusal means the reader never reached the OAS — so there is nothing to
    // measure and nothing to spend on.
    // THE GATE'S VISIBLE CONFIRMATION. Submit raises the real unlock modal because the reader is
    // locked; the run continues only through its own confirm control, and the charge request is
    // production's with a simulated response.
    if (_entry && _entry.ok !== false) {
      const _gate = await page.evaluate(() => {
        const m = document.getElementById('bakedUnlockModal');
        const v = (id) => { const e = document.getElementById(id); return !!(e && e.getClientRects().length > 0); };
        return { shown: !!(m && m.classList.contains('show')), go: v('buGoBtn') };
      });
      if (_gate.shown && _gate.go) {
        say('  the gate asked for payment — confirming through its own control');
        await page.click('#buGoBtn', { timeout: 15000 }).catch((e) => {
          say('  *** the gate confirm was not clickable: ' + String(e.message).split('\n')[0]);
        });
        await page.waitForTimeout(6000);
        const _unlocked = await page.evaluate(() => ({
          unlocked: !!window.state._bakedGenesisUnlocked,
          setupComplete: !!window.state._bakedSetupComplete,
          dialogue: !!window.state.intimacyDialogue }));
        say('  after the confirmation: ' + JSON.stringify(_unlocked));
        if (!_unlocked.dialogue) {
          halted = true;
          say('\n*** STOPPING — the gate was confirmed but the OAS did not open '
            + JSON.stringify(_unlocked) + ' ***');
        }
          // The entrance reply is attributed just before the turn loop, where oasState is in
          // scope — referencing it here hit its temporal dead zone and aborted the run.
      } else {
        say('  no unlock modal appeared at Submit: ' + JSON.stringify(_gate));
      }
    }
    if (!_entry || _entry.ok === false) {
      halted = true;
      say('\n*** STOPPING — the OAS entrance was not reachable: '
        + ((_entry && (_entry.why || _entry.route)) || 'enterOAS returned nothing')
        + ' — no provider dispatch attempted ***');
    }
    // A CLICK IS NOT AN EXCHANGE. firstTurnConsumed says a submission was made; it counts toward
    // the six only once its model reply is ATTRIBUTED AND RENDERED, by the same evidence chain
    // every other turn uses. Set below, not here.
    let _entryCounted = 0;
    // SUBMIT -> FIRST READABLE PROSE, measured separately from provider latency (which the
    // per-call roll-up already reports). This is what the reader actually waits through.
    // ── SUBMIT -> THE NEW REPLY'S FIRST APPEARANCE ────────────────────────────────────────
    // The previous stop condition accepted ANY visible container holding more than 80 characters,
    // which the authored opening text already satisfied — so it could "measure" prose that was on
    // screen before Submit. An observer is installed BEFORE Submit (inside the entrance helper's
    // pre-click window) and records when text that was NOT there first appears, with no fixed
    // settling delay in the measurement.
    let _submitToProseMs = _entry && _entry.proseAppearedMs != null ? _entry.proseAppearedMs : null;
    if (!halted && _submitToProseMs == null && _entry && _entry.submitAt) {
      const _t0 = _entry.submitAt;
      for (let w = 0; w < 240; w++) {
        const seen = await page.evaluate(() => (window.__sbProseAppearedAt || null)).catch(() => null);
        if (seen) { _submitToProseMs = seen - 0; break; }
        await page.waitForTimeout(250);
      }
      if (_submitToProseMs != null) _submitToProseMs = _submitToProseMs - _t0;
    }
    if (!halted) {
      say('  submit -> first NEW text on screen (NOT yet tied to an attributed reply): '
        + (_submitToProseMs == null ? 'NOT OBSERVED within 60s' : _submitToProseMs + 'ms'));
    }

    // EACH INPUT IS ACCEPTED AND ITS RESPONSE COMPLETED BEFORE THE NEXT ONE. The previous
    // version fired inputs nine seconds apart while calls were taking fifteen, never checked
    // that an input was consumed, and printed "OAS complete" regardless. Beat count is the
    // production signal that a turn landed.
    // beatCount IS INCREMENTED AT THE START of _handleIntimacyTurn (app.js:204238), BEFORE the
    // model is called, so waiting on it waits for a REQUEST, not a REPLY. The signal that a
    // reply actually landed is liTurnHistory gaining an entry whose liDialogue is populated —
    // that push happens after the response is parsed (app.js:205514).
    const oasState = () => page.evaluate(() => {
      const d = window.state.intimacyDialogue;
      if (!d) return null;
      const h = Array.isArray(d.liTurnHistory) ? d.liTurnHistory : [];
      const last = h[h.length - 1] || null;
      return { active: !!d.active, resolving: !!d._resolving,
        beats: d.beatCount || 0,
        replies: h.length,
        lastHasDialogue: !!(last && last.liDialogue),
        // THE RENDERED TURN'S OWN TEXT, so the recorded response can be shown to have SUPPLIED it
        // rather than merely to have arrived. "the history count grew" is not that evidence.
        lastRendered: last ? { dialogue: last.liDialogue || last.dialogue || '',
          action: last.liAction || last.action || '' } : null,
        acceptingInput: !!d.active && !d._resolving };
    });
    // ── THE READER PLAYS A FATE CARD, NOT A LINE I MADE UP ──────────────────────────────────
    // My scripted inputs were the contamination in the last run: nine deflections fed to a
    // character briefed to press one question until it is answered. He kept asking because
    // nobody ever answered — which is correct behaviour, not repetition.
    //
    // The five OAS cards are authored by Grok FOR THIS MOMENT (generateIntimateFatePreviewsBatch)
    // and carry {dialogue, action} — exactly the SAY and DO a reader submits. They know the
    // situation and are primed for the OAS register, so they are a far better probe than
    // anything I can invent, and they make the test reproducible instead of reflecting my
    // guesses about how a reader talks.
    //
    // The pick is SEEDED so a rerun plays the same hand; "random" here means reproducible
    // selection, not a model judgement.

    // ── PLAY A CARD THE WAY A READER PLAYS ONE ─────────────────────────────────────────────
    // Copying a card's text into the dialogue handler is not playing it: it skips the click that
    // records the selected slot, skips sanitization, and skips whatever the commit path enables.
    // This clicks the real .fate-card element and then submits, and records what was actually
    // sent rather than what was intended.
    //
    // PROVENANCE IS READ FROM THE GROK CACHE, NOT FROM _intimate. fatecards.js sets
    // _intimate: true on the TEMPLATE path too (line 1241), so that flag proves nothing about
    // authorship. The only authoritative test is whether this card id is in
    // state._grokIntimateFateCards.cards for THIS turn.
    // ── THE OAS DECK IS NOT THE GENERIC DECK ──────────────────────────────────────────────
    // The previous version read state.fateOptions and clicked any .fate-card in the document,
    // via page.evaluate(el.click()). Three things were wrong with that, all of which invalidate
    // the "nine template cards" finding:
    //   · the OAS deck lives in #gnCardMount as .intimacy-dev-fate-card[data-fate-card-slot];
    //   · its handler REJECTS untrusted events outright —
    //       app.js:210592  if (ev && ev.isTrusted === false) ... return;
    //     so a page-evaluated click was never accepted at all;
    //   · an accepted click runs _handleOASFateCardClick, which populates #gnActionInput and
    //     #gnDialogueInput — the preview I should be reading.
    // Playwright's own page.click() dispatches through CDP and IS trusted, so it is used here.
    const MOUNT_NAMES = '#gnCardMount, #cardMount, #intimacyDevCardMount, document';
    const readOasDeck = () => page.evaluate(() => {
      const mount = document.getElementById('gnCardMount');
      // FIND THE DECK WHERE IT ACTUALLY IS, and say which one was used. I guessed this surface
      // three times and was wrong each time: .intimacy-dev-fate-card is the DEV half only
      // (_populateDevFateCardsInGNMount runs solely under devMode); #gnCardMount was empty; a DOM
      // probe found the five cards in #cardMount. Rather than hard-code a fourth guess, the
      // runner now scans the known mounts, takes the one with VISIBLE cards, and records it.
      const MOUNTS = ['gnCardMount', 'cardMount', 'intimacyDevCardMount'];
      let mountId = null, els = [];
      for (const id of MOUNTS) {
        const host = document.getElementById(id);
        if (!host) continue;
        const found = [...host.querySelectorAll('.fate-card')]
          .filter(e => e.offsetParent !== null && !e.classList.contains('locked'));
        if (found.length) { mountId = id; els = found; break; }
      }
      if (!els.length) {
        const loose = [...document.querySelectorAll('.fate-card')]
          .filter(e => e.offsetParent !== null && !e.classList.contains('locked'));
        if (loose.length) { mountId = '(document)'; els = loose; }
      }
      const st = window.state || {};
      const cache = st._grokIntimateFateCards;
      const cacheFresh = !!(cache && cache.turnCount === st.turnCount && cache.cards);
      return {
        mounted: !!mount, mountId: mountId,
        count: els.length,
        revealed: els.filter(e => e.getAttribute('data-revealed') === '1').length,
        cacheFresh,
        cacheIds: cacheFresh ? Object.keys(cache.cards) : [],
        slots: els.map((e, i) => ({ idx: i, slot: e.getAttribute('data-fate-card-slot'),
          revealed: e.getAttribute('data-revealed') === '1' }))
      };
    });

    // Wait for the deck to mount and flip before choosing — the cards reveal on a timer.
    const waitForOasDeck = async (maxMs = 45000) => {
      const dl = Date.now() + maxMs;
      let last = null;
      while (Date.now() < dl) {
        last = await readOasDeck();
        if (last.count > 0 && last.revealed >= last.count) return last;
        await page.waitForTimeout(1000);
      }
      return last;
    };

    // SIX COMPLETED EXCHANGES, then the tested reader exit. Recorded as a scripted reader exit.
    await dumpPolicy('after the entrance submission, before any further input');
    // ── PENDING BUBBLE WITH COMPLETED HISTORY PRESENT ───────────────────────────────────
    // The replay marks every bubble it recreates as .oas-pc-bubble-pending, so with one turn
    // already completed that marker belongs to the OLD turn. The restore then declined the
    // genuinely pending submission, and a returning reply could swap the wrong bubble.
    if (String(process.env.SB_SCENARIO || '').toLowerCase() === 'pending2') {
      const _p2 = { scenario: 'pending2', checks: [] };
      const _p2ck = (label, ok, detail) => {
        _p2.checks.push({ label, ok: !!ok, detail: detail || null });
        say('    ' + (ok ? 'ok   ' : 'FAIL ') + label + (ok || !detail ? '' : '  - ' + detail));
      };
      const SAY2 = 'Then ask it plainly, and I will answer plainly.';
      const DO2 = 'I set the deck down between us.';
      // CAPTURE THE FIRST EXCHANGE AS ITS OWN ROWS, IN FULL. A 40-character prefix proved almost
      // nothing: it would pass even if the rest of the exchange were rewritten.
      const _rowSnap = () => page.evaluate(() => {
        const log = document.getElementById('oasHistoryLog');
        if (!log) return { rows: [], pendingCount: 0 };
        const rows = [...log.querySelectorAll('.oas-chat-you, .oas-chat-li')].map((el) => {
          const bubble = el.querySelector('.oas-chat-bubble');
          const cs = bubble ? getComputedStyle(bubble) : null;
          return {
            side: el.classList.contains('oas-chat-you') ? 'you' : 'li',
            pending: el.classList.contains('oas-pc-bubble-pending'),
            dots: !!el.querySelector('.oas-pc-polishing-dots'),
            opacity: cs ? cs.opacity : null,
            dialogue: String((el.querySelector('.oas-chat-dialogue') || {}).textContent || '').trim(),
            narration: String((el.querySelector('.oas-chat-narration') || {}).textContent || '').trim(),
            full: String(el.innerText || el.textContent || '').trim()
          };
        });
        return { rows, pendingCount: log.querySelectorAll('.oas-pc-bubble-pending').length };
      });
      const _snap1 = await _rowSnap();
      const _first = { text: _snap1.rows.map((x) => x.full).join('\n'),
                       children: _snap1.rows.length, pending: _snap1.pendingCount };
      const _exch1Rows = JSON.stringify(_snap1.rows.map((x) =>
        ({ side: x.side, dialogue: x.dialogue, narration: x.narration })));
      say('      exchange 1 rows: ' + _exch1Rows.slice(0, 200));
      _p2ck('every completed bubble has normal opacity and no polishing dots',
        _snap1.rows.length > 0 && _snap1.rows.every((x) => !x.dots && Number(x.opacity) === 1),
        JSON.stringify(_snap1.rows.map((x) => ({ side: x.side, dots: x.dots, opacity: x.opacity }))));
      say('      after exchange 1: children=' + _first.children + ' pending=' + _first.pending);
      _p2ck('one completed exchange is on the page before the second submission',
        _first.children > 0, 'children=' + _first.children);
      const _firstText = _first.text;

      _holdAtAuthorIdx = _replayAuthorIdx + 1;
      _armHold();
      await page.evaluate((v) => {
        try { window._intimacyDialogueConsumeInput(v.say, v.doText); }
        catch (e) { window.__sbP2Err = String(e && e.message); }
      }, { say: SAY2, doText: DO2 });
      let _arr2 = false;
      await Promise.race([_holdArrived.then(() => { _arr2 = true; }),
                          new Promise((r) => setTimeout(r, 90000))]);
      _p2ck('the SECOND response is held in flight', _arr2, 'no second author request arrived');

      if (_arr2) {
        // Force the rebuild that production defers automatically on entry.
        await page.evaluate(() => { try { window._rehydrateOASUI(); } catch (_) {} });
        await page.waitForTimeout(2500);
        const _mid = await page.evaluate((v) => {
          const log = document.getElementById('oasHistoryLog');
          const txt = log ? String(log.innerText || log.textContent || '') : '';
          const count = (h, n) => h.split(n).length - 1;
          const pend = log ? log.querySelectorAll('.oas-pc-bubble-pending') : [];
          return { text: txt, children: log ? log.children.length : 0,
                   pendingCount: pend.length,
                   pendingText: pend.length ? String(pend[pend.length - 1].innerText || '') : '',
                   say2: count(txt, v.saySnip), do2: count(txt, v.doSnip),
                   youRowsBefore: log ? log.querySelectorAll('.oas-chat-you').length : 0 };
        }, { saySnip: 'ask it plainly', doSnip: 'set the deck down' });
        say('      after rehydration: children=' + _mid.children
          + ' pending=' + _mid.pendingCount + ' say2x' + _mid.say2 + ' do2x' + _mid.do2);
        const _snap2 = await _rowSnap();
        const _exch1After = JSON.stringify(_snap2.rows.slice(0, _snap1.rows.length).map((x) =>
          ({ side: x.side, dialogue: x.dialogue, narration: x.narration })));
        _p2ck('the first exchange rows are byte-identical after rehydration',
          _exch1After === _exch1Rows,
          'before: ' + _exch1Rows.slice(0, 160) + '  after: ' + _exch1After.slice(0, 160));
        _p2ck('the completed bubbles still show no pending visuals after rehydration',
          _snap2.rows.slice(0, _snap1.rows.length).every((x) => !x.dots && Number(x.opacity) === 1),
          JSON.stringify(_snap2.rows.slice(0, _snap1.rows.length)
            .map((x) => ({ side: x.side, dots: x.dots, opacity: x.opacity }))));
        _p2ck('the second submitted SAY appears exactly once', _mid.say2 === 1,
          'occurrences: ' + _mid.say2);
        _p2ck('the second submitted DO appears exactly once', _mid.do2 === 1,
          'occurrences: ' + _mid.do2);
        _p2ck('exactly ONE bubble is pending', _mid.pendingCount === 1,
          'pending bubbles: ' + _mid.pendingCount);
        _p2ck('and the pending one is the SECOND submission',
          String(_mid.pendingText).indexOf('ask it plainly') >= 0,
          'pending bubble reads: ' + JSON.stringify(String(_mid.pendingText).slice(0, 80)));

        _releaseHold();
        await page.waitForTimeout(18000);
        const _post = await page.evaluate((v) => {
          const log = document.getElementById('oasHistoryLog');
          const txt = log ? String(log.innerText || log.textContent || '') : '';
          const count = (h, n) => h.split(n).length - 1;
          return { pendingCount: log ? log.querySelectorAll('.oas-pc-bubble-pending').length : -1,
                   text: txt, say2: count(txt, v.saySnip),
                   youRows: log ? log.querySelectorAll('.oas-chat-you').length : 0 };
        }, { saySnip: 'ask it plainly' });
        say('      after release: pending=' + _post.pendingCount + ' say2x' + _post.say2);
        _p2ck('releasing the response finalized the second bubble', _post.pendingCount === 0,
          'pending bubbles still: ' + _post.pendingCount);
        const _snap3 = await _rowSnap();
        const _exch1Final = JSON.stringify(_snap3.rows.slice(0, _snap1.rows.length).map((x) =>
          ({ side: x.side, dialogue: x.dialogue, narration: x.narration })));
        _p2ck('the first exchange rows are byte-identical after the second reply landed',
          _exch1Final === _exch1Rows,
          'before: ' + _exch1Rows.slice(0, 160) + '  after: ' + _exch1Final.slice(0, 160));
        _p2ck('no bubble is left with polishing dots once the reply has landed',
          _snap3.rows.every((x) => !x.dots), 'a polishing-dot node survives');
        _p2ck('the second turn is still exactly one player bubble, now finalized',
          _post.youRows === _mid.youRowsBefore && _post.pendingCount === 0,
          'you-rows ' + _mid.youRowsBefore + ' -> ' + _post.youRows
          + ', pending ' + _post.pendingCount);
        say('      (the literal phrase is gone by design: _swapPendingPCBubble replaces it with'
          + ' the transmuted text - the existing post-response swap, preserved)');
      }
      _releaseHold();
      write('scenario_pending2.json', _p2);
      const _pb = _p2.checks.filter((c) => !c.ok).length;
      say('    scenario "pending2": ' + (_p2.checks.length - _pb) + '/' + _p2.checks.length
        + ' checks passed');
      halted = true;
      haltReason = 'SB_SCENARIO=pending2 - bounded case only, no story work';
    }
    if (_armWork) {
      await Promise.race([_armWork, new Promise((r) => setTimeout(r, 180000))]);
      write('scenario_' + _scenario + '.json', _sres);
      const _bad = _sres.checks.filter((c) => !c.ok).length;
      say('    scenario "' + _scenario + '": '
        + (_sres.checks.length - _bad) + '/' + _sres.checks.length + ' checks passed');
      halted = true;
      haltReason = 'SB_SCENARIO=' + _scenario + ' - bounded arm only, no story work';
    }
    try {
      const _race = await page.evaluate(() => (window.__sbRace || { rehydrations: [] }).rehydrations);
      write('rehydrations.json', _race);
      say('  [rehydrate] ' + _race.length + ' rehydration(s) during the entrance');
      _race.forEach((r, i) => {
        say('    #' + (i + 1) + ' awaiting=' + r.before.awaitingResponse
          + ' age=' + r.before.ageMs + 'ms  ' + r.before.pendingRequestId
          + ' -> ' + r.afterPendingRequestId
          + (r.replacedALiveRequest ? '   *** REPLACED A LIVE REQUEST ***'
             : r.preservedALiveRequest ? '   (identity preserved)' : ''));
        if (r.replacedALiveRequest) r.stack.slice(0, 6).forEach((l) => say('        ' + l));
      });
    } catch (e) { say('  [rehydrate] dump failed: ' + (e && e.message)); }
    // ── THE ENTRANCE REPLY, ATTRIBUTED ON ITS OWN EVIDENCE ──────────────────────────────────
    // Through the same helper every other turn uses, counted at most once, and BEFORE the loop so
    // no later reply can be mistaken for it.
    if (!halted && _entry && _entry.firstTurnConsumed) {
      // WAIT FOR THE ENTRANCE'S ACTUAL REPLY, NOT FOR ANY NEW TEXT. Bounded; the strict
      // attribution chain (including the cleanup verdict when one applies) is untouched, and the
      // player's own submission is never counted as a reply.
      let _post0 = await oasState();
      let _ev0 = oasReplyRenderedFor('opening OAS', 1, _post0 && _post0.lastRendered);
      const _entranceDeadline = Date.now() + Number(process.env.SB_ENTRANCE_WAIT_MS || 90000);
      while (!_ev0 && Date.now() < _entranceDeadline) {
        await page.waitForTimeout(1000);
        noteCleanupVerdict('opening OAS', 1, consoleLog, 0);
        _post0 = await oasState();
        _ev0 = oasReplyRenderedFor('opening OAS', 1, _post0 && _post0.lastRendered);
      }
      if (!_ev0) {
        say('  *** the entrance reply did not arrive and attribute within '
          + Math.round(Number(process.env.SB_ENTRANCE_WAIT_MS || 90000) / 1000) + 's ***');
        say('      observed state: ' + JSON.stringify({
          turns: _post0 && _post0.turns,
          lastRendered: _post0 && _post0.lastRendered ? 'present' : null,
          modelBackedReplies: modelBackedReplies }));
        halted = true;
        haltReason = 'the entrance reply never attributed (bounded wait exhausted)';
      }
      if (_ev0) {
        _entryCounted = 1;
        modelBackedReplies++;
        say('  the entrance submission IS exchange 1 — author call ' + _ev0.callN
          + ' — ' + _ev0.matchedOn);
      } else {
        say('  the entrance submission produced no attributable rendered reply — it does NOT '
          + 'count toward the six');
      }
    }
    // THE PORTRAIT MODAL RE-OPENS AFTER UNLOCK and intercepts pointer events over the OAS deck —
    // the click error said so explicitly, with the card itself visible, enabled and stable. It is
    // cleared through its own controls before each interaction. Not force-clicked through, and no
    // opt-out state writes.
    const clearOverlaysNow = async () => {
      for (let r = 0; r < 6; r++) {
        let acted = false;
        for (const o of ONBOARD_CTRLS) {
          const vis = await page.evaluate((q) => {
            const e = document.querySelector(q); return !!(e && e.getClientRects().length > 0); }, o.sel);
          if (!vis) continue;
          await page.click(o.sel, { timeout: 6000 }).catch(() => {});
          acted = true; await page.waitForTimeout(1000); break;
        }
        if (!acted) return;
      }
    };
    await clearOverlaysNow();
    const EXIT_AFTER_EXCHANGES = Number(process.env.SB_EXIT_AFTER || 6);
    let turnsTaken = 0;
    for (let i = 0; i < 9 && !halted; i++) {
      const pre = await oasState();
      if (!pre || !pre.active || pre.resolving) { say('  OAS is no longer accepting input'); break; }
      // ONE EXCHANGE IDENTITY for dispatch, cleanup verdict, matching and reporting. These were
      // three separate expressions and the cleanup verdict was written to i + 1 while the reply was
      // matched under i + 2, so the verdict landed on the previous exchange and the correct one kept
      // accepted:null — which the strict matcher rejects, by design.
      const exchangeTurn = i + 2;   // the entrance was turn 1
      setPreviewContext('opening OAS', exchangeTurn);
      const consoleAtTurnStart = consoleLog.length;
      // Draw the OAS deck, wait for it to settle, and play one with a REAL click.
      await clearOverlaysNow();
      const deck = await waitForOasDeck();
      if (!deck || !deck.count) {
        halted = true;
        haltReason = 'the OAS deck never mounted at turn ' + (i + 1)
          + ' (checked ' + MOUNT_NAMES + '; none had visible cards)';
        say('  *** STOPPING — ' + haltReason + ' ***');
        break;
      }
      const slotIdx = nextPick(deck.count);
      const sel = (deck.mountId && deck.mountId !== '(document)')
        ? ('#' + deck.mountId + ' .fate-card:not(.locked)') : '.fate-card:not(.locked)';
      const slotName = (deck.slots[slotIdx] || {}).slot;
      const rejectedBefore = consoleLog.filter(l => /FATE-CLICK\] Rejected/.test(l)).length;
      // CLEAR THE PREVIEW FIRST, so a populated input can only have come from THIS click. The
      // previous version accepted any non-empty value, including last turn's stale text.
      await page.evaluate(() => {
        ['gnActionInput', 'gnDialogueInput'].forEach(id => {
          const el = document.getElementById(id);
          if (el) { el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); }
        });
      });
      // A FAILED CLICK IS A FAILURE. Swallowing the exception and carrying on is how a run
      // reports a card as played when nothing happened.
      let clickErr = null;
      await page.locator(sel).nth(slotIdx).click({ timeout: 15000 })
        .catch(e => { clickErr = (e && e.message) || 'click failed'; });
      if (clickErr) {
        halted = true;
        haltReason = 'OAS card click FAILED at turn ' + (i + 1) + ' slot ' + slotIdx
          + ': ' + clickErr;
        say('  *** STOPPING — ' + haltReason + ' ***');
        break;
      }
      // WAIT FOR THE PREVIEW TO POPULATE rather than sleeping a fixed interval.
      let preview = { action: '', dialogue: '' };
      // A USABLE SUGGESTION, NOT MERELY A POPULATED FIELD. (Codex 2026-10-06.) The old wait
      // accepted any non-empty input, so the live run submitted the card's own title —
      // SAY "Confession…" / DO "Confession…" — to the author as the player's words. Revealed
      // cards and non-empty inputs are both insufficient: the deck fills the fields with a
      // placeholder while the preview batch is still in flight.
      // ONE SHARED PREDICATE (_oas_submission_guard.mjs). The first version accepted EITHER
      // field as usable and then submitted BOTH, so DO "I step back." / SAY "Confession…" passed
      // with a placeholder still in the payload. The gate now requires one usable field AND no
      // non-empty placeholder in either, and the replay uses the very same module.
      const pvDeadline = Date.now() + 20000;
      while (Date.now() < pvDeadline) {
        preview = await page.evaluate(() => {
          const a = document.getElementById('gnActionInput');
          const d = document.getElementById('gnDialogueInput');
          // THE SELECTED CARD AND THE APP'S CACHE FOR IT, so provenance can be established
          // outside the page against the replies actually served. "An input is populated" was
          // the OAS loop's only test, and it proves nothing about who wrote the text.
          const sel = (window.state.fateOptions || [])[window.state.fateSelectedIndex];
          const cache = window.state._sceneFateCardPreviews || {};
          const grok = window.state._grokIntimateFateCards;
          const gc = (grok && grok.cards && sel) ? grok.cards[sel.id] : null;
          const cc = sel ? cache[sel.id] : null;
          const entry = gc || cc || null;
          return { action: a ? a.value : '', dialogue: d ? d.value : '',
            cardId: sel ? sel.id : null, selectedIndex: window.state.fateSelectedIndex,
            optionIds: (window.state.fateOptions || []).map(o => String(o.id || '')),
            appKey: { turnCount: window.state.turnCount || 0,
              sceneFateKey: window.state._fateOptionsSceneKey || null,
              oasBeat: window.state.intimacyDialogue
                ? (window.state.intimacyDialogue.beatCount ?? null) : null },
            cacheEntry: entry ? { action: entry.action || '', dialogue: entry.dialogue || '' } : null };
        });
        if (canSubmit(preview.action, preview.dialogue, preview.optionIds || []).ok) break;
        await page.waitForTimeout(400);
      }
      const rejectedAfter = consoleLog.filter(l => /FATE-CLICK\] Rejected/.test(l)).length;
      if (rejectedAfter > rejectedBefore) {
        halted = true;
        haltReason = 'the OAS handler REJECTED the click at turn ' + (i + 1) + ' (untrusted input)';
        say('  *** STOPPING — ' + haltReason + ' ***');
        break;
      }
      // NEVER SUBMIT A PLACEHOLDER. If no usable suggestion arrives through the production flow,
      // the run STOPS BEFORE THE AUTHOR CALL rather than sending the card title as the reader's
      // words — that wasted a live author dispatch on turn 1 and corrupted the exchange.
      {
        const gate = canSubmit(preview.action, preview.dialogue, preview.optionIds || []);
        if (!gate.ok) {
          halted = true;
          haltReason = 'OAS submission BLOCKED at turn ' + (i + 1) + ' slot "' + slotName
            + '": ' + gate.reason + '. STOPPING BEFORE THE AUTHOR CALL — DO='
            + JSON.stringify(String(preview.action || '').slice(0, 30)) + ' SAY='
            + JSON.stringify(String(preview.dialogue || '').slice(0, 30));
          say('  *** STOPPING — ' + haltReason + ' ***');
          break;
        }
      }
      if (!((preview.action && preview.action.trim()) || (preview.dialogue && preview.dialogue.trim()))) {
        halted = true;
        haltReason = 'OAS slot "' + slotName + '" populated NO preview at turn ' + (i + 1)
          + ' — the click was accepted but produced nothing to submit';
        say('  *** STOPPING — ' + haltReason + ' ***');
        break;
      }
      const say_ = (preview.dialogue || '').trim();
      const do_ = (preview.action || '').trim();
      const oasProv = classifyPreview(preview.cardId, preview.action, preview.dialogue,
        preview.cacheEntry, { encounter: 'opening OAS', turn: i + 1, app: preview.appKey });
      cardLog.push({ turn: i + 1, deck, chosenIdx: slotIdx, slot: slotName, preview,
        provenance: oasProv, cacheFresh: deck.cacheFresh, cacheIds: deck.cacheIds });
      say('  turn ' + (i + 1) + ' plays OAS slot "' + slotName + '" from ' + deck.mountId
        + ' (trusted click ACCEPTED, '
        + 'preview populated)  grokCache=' + (deck.cacheFresh ? deck.cacheIds.length + ' ids' : 'empty'));
      say('      provenance: ' + oasProv.provenance + ' — ' + oasProv.evidence);
      say('      SAY ' + JSON.stringify(say_.slice(0, 80)));
      say('      DO  ' + JSON.stringify(do_.slice(0, 80)));

      // SUBMIT THROUGH THE READER'S OWN CONTROL. #gnSubmitBtn is what a reader presses, and
      // the log confirms it routes here ("[STAGED:SUBMIT] Routed to intimacy dialogue turn
      // handler"). Calling the internal handler skipped whatever the button does first.
      let submitErr = null;
      await page.locator('#gnSubmitBtn').click({ timeout: 15000 })
        .catch(e => { submitErr = (e && e.message) || 'submit failed'; });
      if (submitErr) {
        halted = true;
        haltReason = 'the reader submit control failed at turn ' + (i + 1) + ': ' + submitErr;
        say('  *** STOPPING — ' + haltReason + ' ***');
        break;
      }

      // ── THE TESTED READER TEXT EXIT ──────────────────────────────────────────────────────
      // Proven in _oas_text_exit_control.mjs (27/27): a full-line exit word reaches
      // _isIntimacyExitInput -> _showIntimacyExitModal, and "End Abruptly" resolves via
      // user_pivot_end, which reaches the authored Dohkar interruption. Real inputs, the real
      // Submit control and the modal's own button — the resolver is never called directly.
      const readerTextExit = async (afterReplies) => {
        await page.evaluate(() => {
          const i2 = window._getActiveTurnInputs();
          if (i2.diaInput) { i2.diaInput.disabled = false; i2.diaInput.value = 'stop';
            i2.diaInput.dispatchEvent(new Event('input', { bubbles: true })); }
          if (i2.actInput) { i2.actInput.disabled = false; i2.actInput.value = '';
            i2.actInput.dispatchEvent(new Event('input', { bubbles: true })); }
        });
        let e1 = null;
        await page.locator('#gnSubmitBtn').click({ timeout: 15000 })
          .catch(e => { e1 = (e && e.message) || 'submit click failed'; });
        if (e1) return { taken: false, why: 'could not submit the exit word: ' + e1 };
        let aff = null;
        const dl0 = Date.now() + 20000;
        while (Date.now() < dl0) {
          aff = await exitAffordances();
          if (aff.modalUp) break;
          await page.waitForTimeout(500);
        }
        if (!aff || !aff.modalUp) {
          return { taken: false, why: 'the exit modal never became visible', aff };
        }
        let e2 = null;
        await page.locator('#intimacyExitAbrupt').click({ timeout: 15000 })
          .catch(e => { e2 = (e && e.message) || 'modal click failed'; });
        if (e2) return { taken: false, why: 'could not click End Abruptly: ' + e2, aff };
        const dl = Date.now() + 60000;
        while (Date.now() < dl) {
          const st = await page.evaluate(() => {
            const d = window.state.intimacyDialogue;
            const intr = window.state._intimateInterruption;
            return { active: !!(d && d.active),
              archive: Object.keys(window.state._oasSceneSnapshots || {}).length,
              interruptionPresent: !!intr };
          });
          if (st.interruptionPresent || (!st.active && st.archive > 0)) {
            return { taken: true, kind: 'scripted reader text exit', afterReplies,
              modalBox: aff.modalBox, state: st };
          }
          await page.waitForTimeout(1000);
        }
        return { taken: false, why: 'End Abruptly was clicked but the OAS never resolved', aff };
      };

      // ── THE SUPPORTED READER EXIT ────────────────────────────────────────────────────────
      // Production offers an EXIT RAMP at beats 6/13/17 — the log says "Exit ramp offered at
      // beat 6" — rendered as a "Drift to afterglow" control inside #intimacyStatus
      // (app.js:205906). The previous version watched only #intimacyExitModal, a DIFFERENT
      // affordance, then waited nine turns for a resolution nobody had asked for. Taking the
      // offered ramp is the supported way out, so it is taken when offered.
      const exitAffordances = async () => page.evaluate(() => {
        // offsetParent IS NULL FOR A position:fixed ELEMENT, so it is the wrong test for the exit
        // modal — the same mistake that made me report the modal as never opening. Use computed
        // style plus a real box, and keep offsetParent only for the in-flow ramp control.
        const shown = (el) => {
          if (!el) return false;
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        };
        const status = document.getElementById('intimacyStatus');
        const drift = status ? [...status.querySelectorAll('button,a,[role=button]')]
          .find(b => /drift|afterglow/i.test(b.innerText || '')) : null;
        const modal = document.getElementById('intimacyExitModal');
        return { driftOffered: !!(drift && drift.offsetParent !== null),
          driftText: drift ? (drift.innerText || '').trim().slice(0, 40) : null,
          modalUp: !!(modal && modal.classList.contains('active') && shown(modal)),
          modalBox: modal ? (function () { const r = modal.getBoundingClientRect();
            return { w: Math.round(r.width), h: Math.round(r.height) }; })() : null };
      });
      // TAKING AN EXIT IS AN OBSERVED OUTCOME, NOT AN ATTEMPTED ONE. The previous version
      // logged "TAKEN" after catching the click's failure, and when an exit appeared DURING the
      // reply wait it merely broke the loop — the next iteration then played another card at a
      // dialogue that was trying to end.
      const takeExit = async (why) => {
        // NEVER DRIFT TO AFTERGLOW IN AN AUTHORED-INTERRUPTION OPENING. First Sacrifice's opening
        // is a public interrogation the story ends with the Dohkar cutting it off; afterglow
        // would end it as though it had been sex and skip the interruption the run-or-remain
        // decision depends on. Production now suppresses the offer too — this is the harness
        // following the same rule rather than relying on it.
        // THE RULE BANS THE AFTERGLOW RAMP, NOT EVERY EXIT. (Codex 2026-10-06.) The early return
        // blocked the reader's own exit modal along with "Drift to afterglow", so the runner could
        // never take the path that actually reaches the authored interruption. Afterglow is still
        // refused for this encounter; the modal is not.
        const authored = await page.evaluate(() =>
          (typeof window._oasEndsInAuthoredInterruption === 'function')
            ? !!window._oasEndsInAuthoredInterruption() : false);
        const aff = await exitAffordances();
        if (authored && aff.driftOffered && !aff.modalUp) {
          return { taken: false, why: 'authored interruption — the afterglow ramp is refused' };
        }
        if (!aff.driftOffered && !aff.modalUp) return { taken: false, why: 'none offered' };
        let err = null;
        if (aff.modalUp) {
          // "End Abruptly" is the reader saying stop now; it resolves via user_pivot_end, which
          // reaches the authored interruption. Never #intimacyExitFade on an authored encounter —
          // that one resolves with reason 'cap' and reads as a fade-to-black.
          await page.locator('#intimacyExitAbrupt').click({ timeout: 10000 })
            .catch(e => { err = (e && e.message) || 'click failed'; });
        } else if (authored) {
          return { taken: false, why: 'authored interruption — the afterglow ramp is refused' };
        } else {
          await page.locator('#intimacyStatus button, #intimacyStatus a, #intimacyStatus [role=button]')
            .filter({ hasText: /drift|afterglow/i }).first().click({ timeout: 10000 })
            .catch(e => { err = (e && e.message) || 'click failed'; });
        }
        if (err) return { taken: false, why: 'click failed: ' + err };
        // VERIFY PRODUCTION STATE, not that a click was dispatched.
        const dl = Date.now() + 45000;
        while (Date.now() < dl) {
          const st = await page.evaluate(() => {
            const d = window.state.intimacyDialogue;
            return { active: !!(d && d.active), resolving: !!(d && d._resolving),
              archive: Object.keys(window.state._oasSceneSnapshots || {}).length };
          });
          if (!st.active || st.archive > 0) return { taken: true, state: st, via: why };
          await page.waitForTimeout(1500);
        }
        return { taken: false, why: 'clicked but the dialogue never left the active state' };
      };

      let exited = false;
      {
        const r = await takeExit('offered before this turn');
        if (r.taken) {
          say('  turn ' + (i + 1) + ': EXIT TAKEN and CONFIRMED — dialogue left the active state');
          exited = true;
        } else if (r.why !== 'none offered' && !/authored interruption/.test(r.why)) {
          halted = true;
          haltReason = 'an exit was offered at turn ' + (i + 1) + ' but could not be completed: ' + r.why;
          say('  *** STOPPING — ' + haltReason + ' ***');
          break;
        }
      }

      // WAIT FOR A RENDERED REPLY: one more liTurnHistory entry, carrying dialogue, and the
      // dialogue ready to take another input. Skipped when the exit path was taken, which
      // produces no reply by design.
      let landed = exited;
      const deadline = Date.now() + REQUEST_TIMEOUT_MS + 20000;   // tied to the request timeout
      while (!exited && Date.now() < deadline) {
        const now = await oasState();
        if (!now || !now.active) { landed = true; break; }
        if (now.replies > pre.replies && now.lastHasDialogue && !now.resolving) { landed = true; break; }
        const midAff = await exitAffordances();
        if (midAff.driftOffered || midAff.modalUp) {
          const r2 = await takeExit('appeared during the reply wait');
          if (r2.taken) {
            say('  turn ' + (i + 1) + ': exit appeared mid-wait, TAKEN and CONFIRMED');
            landed = true; exited = true; break;
          }
          if (/authored interruption/.test(r2.why)) { landed = true; break; }
          halted = true;
          haltReason = 'an exit appeared mid-wait at turn ' + (i + 1) + ' but could not be '
            + 'completed: ' + r2.why;
          say('  *** STOPPING — ' + haltReason + ' ***');
          landed = true; break;
        }
        await page.waitForTimeout(1500);
      }
      const post = await oasState();
      turnsTaken++;
      say('  turn ' + (i + 1) + ': replies ' + pre.replies + ' -> '
        + (post ? post.replies : 'ended') + ' (beats ' + pre.beats + ' -> '
        + (post ? post.beats : '-') + ')'
        + (landed ? '' : '  *** NO REPLY LANDED WITHIN 180s ***'));
      if (exited) { say('  OAS exited at turn ' + (i + 1) + '; no further dialogue turns.'); turnsTaken++; break; }
      // ── THE SCRIPTED READER EXIT, AFTER SIX COMPLETED EXCHANGES ─────────────────────────
      // (Codex 2026-10-06.) This is a SCRIPTED READER EXIT recorded as such — not a
      // model-selected resolution and not evidence of automatic story timing, which remains an
      // unimplemented editorial decision. Production interruption timing is untouched.
      //
      // COMPLETED, RENDERED REPLIES ONLY: post.replies is the length of d.liTurnHistory, which
      // production appends when a reply actually renders — not a count of requests, and the
      // authored opener is not one of them. A turn whose reply never landed does not count.
      // A RENDERED REPLY IS NOT A MODEL REPLY, AND AN ABSENT FALLBACK LOG IS NOT EVIDENCE.
      // (Codex 2026-10-06.) The previous counter incremented whenever its console pattern did not
      // match, so a missed log line read as success. A turn is model-backed only on POSITIVE
      // evidence: an OAS-stage response RECEIVED AND PARSED for THIS encounter and turn, carrying
      // a usable reply, AND the app rendering a new reply off the back of it.
      // THE RECORDED RESPONSE MUST BE THE ONE PRODUCTION RENDERED for this turn.
      const renderedGrew = !!(post && typeof post.replies === 'number'
        && post.replies > (pre.replies || 0));
      // PRODUCTION'S OWN CLEANUP VERDICT for this turn, read from the console lines emitted
      // since the turn began — never inferred from the editor's payload.
      noteCleanupVerdict('opening OAS', exchangeTurn, consoleLog, consoleAtTurnStart);
      const evidence = renderedGrew
        ? oasReplyRenderedFor('opening OAS', exchangeTurn, post && post.lastRendered) : null;
      const fallbackNow = consoleLog.filter(l =>
        /using .*fallback \(LLM call failed\)|soft-deflect fallback/i.test(l)).length;
      const fellBack = fallbackNow > fallbackSeen;
      fallbackSeen = fallbackNow;
      if (evidence && renderedGrew && !fellBack) {
        modelBackedReplies++;
        // NOTE: the entrance reply is attributed BEFORE this loop, on its own evidence. Setting
        // _entryCounted here would have credited the entrance because a LATER reply qualified,
        // which is not evidence about the entrance at all.
        say('      model reply RECEIVED AND RENDERED for turn ' + exchangeTurn + ' — author call '
          + evidence.callN
          + (evidence.chain && evidence.chain.cleanupAccepted
              ? ', cleanup call ' + evidence.chain.cleanup + ' (input verified)' : '')
          + ' — ' + evidence.matchedOn + ' — exchange '
          + modelBackedReplies + ' of ' + EXIT_AFTER_EXCHANGES);
      } else {
        say('      *** NOT A MODEL EXCHANGE — ' + (
          !renderedGrew ? 'the app rendered no new reply for this turn'
          : !evidence ? 'no parsed OAS response for THIS turn supplied the rendered reply'
          : 'the app logged its own fallback for this turn')
          + '. It does NOT count toward the six. ***');
      }
      const renderedReplies = modelBackedReplies;
      if (((post && post.replies) || 0) !== modelBackedReplies) {
        say('      rendered replies ' + ((post && post.replies) || 0)
          + ' vs MODEL-BACKED ' + modelBackedReplies);
      }

      // REPEATED FALLBACK IS NOT AN EVALUATION. If the model is not answering, the run has
      // nothing to measure and should not keep spending to find out.
      if (fallbackSeen >= 2 && modelBackedReplies === 0) {
        halted = true;
        haltReason = 'the app fell back ' + fallbackSeen + ' time(s) with ZERO model-backed '
          + 'replies — there is no live-model exchange to evaluate';
        say('  *** STOPPING — ' + haltReason + ' ***');
        break;
      }
      if (!exited && renderedReplies >= EXIT_AFTER_EXCHANGES) {
        const still = await page.evaluate(() => {
          const d = window.state.intimacyDialogue;
          return { active: !!(d && d.active), resolving: !!(d && d._resolving) };
        });
        if (!still.active || still.resolving) {
          // AN EARLIER LEGITIMATE RESOLUTION IS PRESERVED — the model, the cap or a reader
          // control already ended it, and the script does not override that.
          say('  the OAS had already resolved on its own after ' + renderedReplies
            + ' rendered replies — the scripted exit is NOT used');
        } else {
          say('  --- SCRIPTED READER EXIT after ' + renderedReplies
            + ' completed exchanges (rendered replies, opener excluded) ---');
          scriptedExit = await readerTextExit(renderedReplies);
          say('      ' + JSON.stringify(scriptedExit));
          if (!scriptedExit.taken) {
            halted = true;
            haltReason = 'the scripted reader exit did not complete: ' + scriptedExit.why;
            say('  *** STOPPING — ' + haltReason + ' ***');
          }
          break;
        }
      }
      if (!landed) {
        halted = true; haltReason = 'OAS turn ' + (i + 1) + ' produced no rendered reply';
        say('  *** STOPPING — ' + haltReason + ' ***');
        break;
      }
    }

    // RESOLUTION IS REQUIRED, NOT ASSUMED.
    let resolved = false;
    const dl = Date.now() + 120000;
    while (Date.now() < dl) {
      const st = await oasState();
      if (!st || (!st.active && !st.resolving)) { resolved = true; break; }
      await page.waitForTimeout(2000);
    }
    // ── THE AUTHORED INTERRUPTION IS ACTUALLY SUBMITTED ───────────────────────────────────
    // Production records submission on state._intimateInterruption.submitted, set by
    // _commitIntimateInterruption (app.js:208246). The previous gate read a field that does not
    // exist (_intimateInterruptionSubmitted) and never performed the interaction at all, so it
    // could never have been satisfied. The reader submits through the staged inputs
    // (#gnActionInput / #gnDialogueInput) and #gnSubmitBtn — app.js:173790 ff.
    const interruptionState = () => page.evaluate(() => {
      const r = window.state._intimateInterruption || null;
      return { present: !!r, submitted: !!(r && r.submitted),
        pending: (typeof window._intimateInterruptionPending === 'function')
          ? !!window._intimateInterruptionPending() : null };
    });
    let intr = await interruptionState();
    say('  interruption: ' + JSON.stringify(intr));
    if (intr.present && !intr.submitted) {
      for (let i = 0; i < 20 && !intr.submitted; i++) {
        // FILL THROUGH THE INPUTS, THEN CLICK THE CONTROL WITH A TRUSTED CLICK. The previous
        // version called b.click() inside page.evaluate — an UNTRUSTED event. The text-exit
        // control proved the submission works with a trusted Playwright click
        // (_oas_text_exit_control.mjs, 27/27), and with the untrusted one the interruption stayed
        // submitted=false and Scene 2 was never triggered.
        const did = await page.evaluate(() => {
          const a = document.getElementById('gnActionInput');
          const d = document.getElementById('gnDialogueInput');
          const b = document.getElementById('gnSubmitBtn');
          if (!b) return 'no #gnSubmitBtn';
          if (a) { a.disabled = false; if (!a.value) { a.value = 'I step back from him.';
            a.dispatchEvent(new Event('input', { bubbles: true })); } }
          if (d) { d.disabled = false; if (!d.value) { d.value = 'Ask me in front of them, then.';
            d.dispatchEvent(new Event('input', { bubbles: true })); } }
          return b.disabled ? 'submit disabled' : 'inputs filled';
        });
        if (did === 'inputs filled') {
          await page.locator('#gnSubmitBtn').click({ timeout: 15000 }).catch(() => {});
        }
        await page.waitForTimeout(3000);
        intr = await interruptionState();
        if (i === 0 || intr.submitted) say('    submit attempt: ' + did
          + ' (trusted click) -> submitted=' + intr.submitted);
        if (did === 'no #gnSubmitBtn') break;
      }
    }
    // ── CHECK-ONLY STOPPING POINT, AT THE PROMISED HANDOFF ───────────────────────────────
    // (Codex 2026-10-06.) The capped check's plan promised to stop at the interruption. It did
    // not: SB_EXIT_AFTER controls when the DIALOGUE exits, not when the RUN ends, so the runner
    // walked on into scene generation and only the CEILING prevented the author dispatch. That is
    // the ceiling doing the plan's job by accident.
    //
    // SB_STOP_AT=handoff ends the run HERE — after the OAS resolved, archived and its interruption
    // was submitted, and BEFORE the run-or-remain branch is serviced, since servicing that branch
    // is what triggers Scene 2.
    // ── THE HANDOFF IS VALIDATED ONCE, HERE, BEFORE THE BRANCH IS SERVICED ──────────────────
    // This is the ONLY lifecycle stage at which run-or-remain can legitimately be on screen:
    // production's _mountSceneDecisionPrompt REMOVES the prompt when a choice is clicked. The
    // post-selection gate used to re-assert decisionOnScreen, which rejected a SUCCESSFUL
    // continuation. One read, one predicate, retained for whichever path follows.
    const handoffState = await page.evaluate(() => {
      const r = window.state._intimateInterruption || {};
      const arch = (window.state.scenes || []).filter(x => x && x.oasArchive).length;
      const d = window.state.intimacyDialogue;
      const dp = document.getElementById('sceneDecisionPrompt');
      const vis = (el) => !!(el && el.getClientRects().length > 0);
      return { resolved: !!(!d || (!d.active && !d._resolving)), archive: arch,
               interruptionPresent: !!document.getElementById('intimateInterruption'),
               interruptionDone: !!(r.submitted || r.completedWithoutSubmission),
               decisionOnScreen: vis(dp),
               decisionOpen: (typeof window._sceneDecisionNeeded === 'function')
                 ? !!window._sceneDecisionNeeded() : null,
               branches: dp ? ['sceneDecisionA', 'sceneDecisionB']
                 .filter((id) => vis(document.getElementById(id))) : [] };
    });
    const handoffOk = handoffState.resolved && handoffState.archive > 0
      && handoffState.interruptionDone && handoffState.decisionOnScreen
      && handoffState.decisionOpen;
    say('  handoff (before the branch is serviced): ' + JSON.stringify(handoffState));

    if (String(process.env.SB_STOP_AT || '').toLowerCase() === 'handoff') {
      halted = true;
      const _hs = handoffState;
      const _hok = handoffOk;
      haltReason = 'SB_STOP_AT=handoff — stopping at the promised handoff, before the '
        + 'run-or-remain branch is serviced and before any scene work';
      say('');
      if (_hok) {
        say('*** STOPPING AS PLANNED — ' + haltReason + ' ***');
      } else {
        haltReason = 'SB_STOP_AT=handoff was requested, but THE HANDOFF DID NOT HAPPEN: '
          + JSON.stringify(_hs);
        say('*** STOPPING — NOT AS PLANNED — ' + haltReason + ' ***');
      }
      // READ THE STATE HERE. oasFinal is built further down, AFTER the decision is serviced —
      // referencing it from this earlier point threw "Cannot access 'oasFinal' before
      // initialization", which the provider-free verification caught.
      const reached = await page.evaluate(() => {
        const intr2 = window.state._intimateInterruption;
        return {
          archive: Object.keys(window.state._oasSceneSnapshots || {}).length,
          interruptionPresent: !!intr2,
          interruptionSubmitted: !!(intr2 && intr2.submitted),
          dialogueGone: !window.state.intimacyDialogue,
          decisionRecorded: ((window.state._sceneDecisions || {})['1'] || null)
        };
      });
      say('    reached: resolved=' + resolved + ' · archive=' + reached.archive
        + ' · interruptionPresent=' + reached.interruptionPresent
        + ' · interruptionSubmitted=' + reached.interruptionSubmitted);
      say('    model-backed exchanges: ' + modelBackedReplies
        + ' · scripted exit: ' + (scriptedExit ? scriptedExit.kind : 'not used'));
      say('    the run-or-remain branch was NOT serviced, so no scene work was triggered.');
      write('handoff_stop.json', { stoppedAt: 'handoff', resolved, reached,
        modelBackedReplies, scriptedExit, exposure: exposure() });
    }

    // ── SERVICE THE RUN-OR-REMAIN PROMPT IMMEDIATELY ──────────────────────────────────────
    // (Codex 2026-10-05.) This is what triggers Scene 2. Previously the runner only OBSERVED
    // the decision and then went looking for a Fate deck — and the deck it found was the
    // LINGERING INTERRUPTION DECK, whose handler returns at once while rec.submitted is true
    // (app.js:208194), so the click filled nothing. That empty preview was the symptom; the
    // unserviced decision was the cause. No card is drawn here.
    const readDecision = () => page.evaluate(() => {
      const prompt = document.getElementById('sceneDecisionPrompt');
      const btn = (id) => { const b = document.getElementById(id); return b ? {
        label: b.textContent, key: b.getAttribute('data-choice') } : null; };
      return {
        needed: (typeof window._sceneDecisionNeeded === 'function') ? !!window._sceneDecisionNeeded() : null,
        promptMounted: !!prompt,
        a: btn('sceneDecisionA'), b: btn('sceneDecisionB'),
        recorded: ((window.state._sceneDecisions || {})['1'] || null)
      };
    });
    let decision = halted ? { needed: null, promptMounted: false, recorded: null }
      : await readDecision();
    if (!halted) say('  axis decision (before servicing): ' + JSON.stringify({ needed: decision.needed,
      promptMounted: decision.promptMounted, recorded: decision.recorded && decision.recorded.choice }));

    if (!halted && decision.needed && decision.promptMounted) {
      // THE OPENING BRANCH IS A TEST PARAMETER, NOT A CONVENIENCE. An earlier run took "run";
      // this runner had started preferring "remain", which is a DIFFERENT test condition and must
      // never be presented as a directly comparable continuation. SB_OPENING_BRANCH names it
      // explicitly (default "run", the branch the earlier runs used), it is recorded in the run
      // artefacts, and a branch is NEVER chosen to suit a fixture.
      const wantKey = (process.env.SB_OPENING_BRANCH || 'run').toLowerCase();
      const matches = (b) => b && (String(b.key || '').toLowerCase() === wantKey
        || new RegExp(wantKey, 'i').test(String(b.label || '')));
      let want = matches(decision.a) ? 'sceneDecisionA'
        : matches(decision.b) ? 'sceneDecisionB' : null;
      if (!want) {
        halted = true;
        haltReason = 'the requested opening branch "' + wantKey + '" is not one the prompt offers'
          + ' (a=' + JSON.stringify(decision.a) + ' b=' + JSON.stringify(decision.b) + ')';
        say('  *** STOPPING — ' + haltReason + ' ***');
      }
      openingBranch = { requested: wantKey, control: want };
      const chosen = (want === 'sceneDecisionB') ? decision.b : decision.a;
      say('  opening branch (SB_OPENING_BRANCH=' + openingBranch.requested + '): "'
        + (chosen && chosen.label) + '" (key=' + (chosen && chosen.key) + ')');
      let decErr = want ? null : 'no matching branch control';
      if (want) {
        await page.locator('#' + want).click({ timeout: 15000 })
          .catch(e => { decErr = (e && e.message) || 'click failed'; });
      }
      if (decErr) {
        halted = true;
        haltReason = 'the run-or-remain prompt could not be serviced: ' + decErr;
        say('  *** STOPPING — ' + haltReason + ' ***');
      } else {
        const dl = Date.now() + 30000;
        while (Date.now() < dl) {
          decision = await readDecision();
          if (!decision.needed && decision.recorded) break;
          await page.waitForTimeout(1000);
        }
        const authoredKeys = [decision.a && decision.a.key, decision.b && decision.b.key]
          .filter(Boolean);
        const rec = decision.recorded || {};
        say('  recorded choice: ' + JSON.stringify({ choice: rec.choice, label: rec.label,
          source: rec.source }) + '  decisionNeeded=' + decision.needed);
        // CONFIRM IT MATCHES AN AUTHORED BRANCH and that the gate actually closed.
        if (decision.needed !== false) {
          halted = true;
          haltReason = 'the decision was recorded but decisionNeeded never became false';
          say('  *** STOPPING — ' + haltReason + ' ***');
        } else if (!rec.choice) {
          halted = true;
          haltReason = 'no choice was recorded after servicing the prompt';
          say('  *** STOPPING — ' + haltReason + ' ***');
        } else {
          say('  the choice matches an authored branch: '
            + (authoredKeys.length ? authoredKeys.indexOf(rec.choice) !== -1 : 'prompt gone (keys unavailable)'));
        }
      }
    } else if (decision.recorded && decision.needed === false) {
      say('  the decision was already recorded at interruption submit ("'
        + decision.recorded.choice + '") and the gate is closed — nothing to service');
    }

    // ── SCENE 2'S ACCEPTED IDENTITY, CAPTURED WHERE IT IS CREATED ─────────────────────────
    // (Codex 2026-10-05.) Servicing the opening branch is what GENERATES Scene 2 — not the first
    // pass of the scene loop. The loop's first snapshot therefore jumped "0 -> 2" and every label
    // after it was off by one: the pass that read Scene 2 and played its ending card created
    // Scene 3, while reporting "Scene 2 accepted". Scene 2 is recorded HERE, against the step
    // that actually produced it.
    if (!halted) {
      const dl2 = Date.now() + 240000;
      let quiet2 = 0;
      while (Date.now() < dl2) {
        scene2 = await page.evaluate(() => {
          const cg = (window.state.scenes || []).filter(x => x && String(x.uid).startsWith('cg:'));
          const last = cg.length ? cg[cg.length - 1] : null;
          return { cgScenes: cg.length, uid: last && last.uid,
            hasProjection: !!(last && last.projection && last.text),
            chars: last && last.text ? String(last.text).length : 0,
            notes: Object.keys((window.state._historyNotes || {})).length };
        });
        if (scene2.cgScenes >= 1 && scene2.hasProjection) break;
        if (quiet2 > 45 && inFlight === 0) break;   // ~90s with no dispatch and no scene
        quiet2 = (inFlight === 0) ? quiet2 + 1 : 0;
        await page.waitForTimeout(2000);
      }
      sceneLedger.push({ sceneNumber: 2, createdBy: 'opening branch "' + openingBranch.requested + '"',
        uid: scene2.uid, accepted: !!(scene2.cgScenes >= 1 && scene2.hasProjection),
        chars: scene2.chars, notesAfter: scene2.notes });
      say('  SCENE 2 created by the opening branch: ' + (scene2.hasProjection ? 'ACCEPTED' : 'NOT ACCEPTED')
        + ' · uid=' + String(scene2.uid).slice(0, 18) + ' · ' + scene2.chars + ' chars'
        + ' · cgScenes=' + scene2.cgScenes + ' · notes=' + scene2.notes);
      if (!scene2.hasProjection) {
        halted = true;
        haltReason = 'the opening branch did not produce an accepted Scene 2 ('
          + JSON.stringify(scene2) + ')';
        say('  *** STOPPING — ' + haltReason + ' ***');
      }
    }

    const oasFinal = await page.evaluate(() => ({
      dialogue: !!(window.state.intimacyDialogue && window.state.intimacyDialogue.active),
      archive: Object.keys(window.state._oasSceneSnapshots || {}).length,
      interruptionPresent: !!window.state._intimateInterruption,
      interruptionSubmitted: !!(window.state._intimateInterruption
        && window.state._intimateInterruption.submitted),
      interruptionDone: !!(window.state._intimateInterruption
        && (window.state._intimateInterruption.submitted
            || window.state._intimateInterruption.completedWithoutSubmission)),
      decisionOnScreen: (() => { const d = document.getElementById('sceneDecisionPrompt');
        return !!(d && d.getClientRects().length > 0); })(),
      decisionBranches: ['sceneDecisionA', 'sceneDecisionB'].filter((id) => {
        const e = document.getElementById(id); return !!(e && e.getClientRects().length > 0); })
    }));
    write('after_oas.json', { turnsTaken, resolved, oasFinal, interruption: intr, decision,
      scriptedExit, exitAfterExchanges: EXIT_AFTER_EXCHANGES, laneContradiction,
      entryRoute: (_entry && _entry.route) || null, entryCountedAsExchange: !!_entryCounted,
      submitToFirstReadableProseMs: _submitToProseMs,
      modelBackedReplies, fallbackCount: fallbackSeen, infraFailure,
      exitKind: scriptedExit ? 'SCRIPTED READER EXIT — not model resolution, not story timing' : null,
      snap: await snapshot('after_oas') });
    say('  turns ' + turnsTaken + ' · resolved=' + resolved + ' · archive=' + oasFinal.archive
      + ' · interruptionDone=' + oasFinal.interruptionDone
      + ' · run/remain on screen=' + oasFinal.decisionOnScreen
      + ' · branches=' + JSON.stringify(oasFinal.decisionBranches));

    // ── AFTER THE CHOICE, A DIFFERENT TRUTH HOLDS ───────────────────────────────────────────
    // The handoff itself was validated BEFORE the branch was serviced (handoffOk above). Here the
    // choice has been clicked, so production has REMOVED the prompt by design — requiring it to
    // still be visible would fail every successful continuation. What must be true now is that the
    // choice was RECORDED, the decision is CLOSED, and the handoff had passed beforehand.
    const _choiceRecorded = (decision && decision.recorded && decision.recorded.choice) || null;
    // IN STOP MODE THERE IS NO CHOICE TO CHECK. Stopping at the validated handoff means the branch
    // was deliberately NOT serviced, so recordedChoice is null and the prompt is still up — both
    // correct. Running the post-choice check anyway printed "STOPPING AS PLANNED" and then declared
    // the handoff incomplete for exactly the state that mode guarantees.
    const _stoppedAtHandoff = halted
      && String(process.env.SB_STOP_AT || '').toLowerCase() === 'handoff';
    const _postChoiceOk = _stoppedAtHandoff
      || (handoffOk && !!_choiceRecorded && !oasFinal.decisionOnScreen);
    if (_stoppedAtHandoff) {
      say('  post-choice check SKIPPED — stopped at the validated handoff, before any choice');
    } else {
      say('  after the choice: recorded=' + JSON.stringify(_choiceRecorded)
        + ' · prompt removed by production=' + (!oasFinal.decisionOnScreen)
        + ' · handoff had passed=' + handoffOk);
    }
    if (!_postChoiceOk) {
      halted = true;
      haltReason = 'OAS handoff incomplete (handoffOk=' + handoffOk
        + ', recordedChoice=' + JSON.stringify(_choiceRecorded)
        + ', promptRemoved=' + (!oasFinal.decisionOnScreen)
        + ', resolved=' + resolved + ', archive=' + oasFinal.archive
        + ', interruptionDone=' + oasFinal.interruptionDone + ')';
      say('\n*** STOPPING BEFORE SCENE GENERATION — ' + haltReason + ' ***');
      say('    No further call will be labelled "scene 2".');
    }
    say('  exposure $' + exposure().toFixed(6) + '\n');
  }

  // ── EACH PASS LEAVES ONE SCENE AND CREATES THE NEXT ─────────────────────────────────────
  // (Codex 2026-10-05.) `leaving` is the scene already on screen, whose beats are walked and
  // whose ending card is played; `creating` is the scene that card produces. The old loop used a
  // single counter for both, so the pass that read Scene 2 reported "Scene 2 accepted" while it
  // had actually created Scene 3 — and at the end it waited for a Scene 11 that the issue does
  // not contain. Scene 2 is already recorded above, by the step that created it, so the first
  // pass here leaves 2 and creates 3. The last pass leaves 9 and creates 10; there is no pass
  // that leaves 10, because the issue ends there.
  const LAST_SCENE = Number(process.env.SB_LAST_SCENE || 10);
  for (let leaving = 2; leaving <= LAST_SCENE - 1 && !halted; leaving++) {
    const creating = leaving + 1;
    const scene = leaving;   // the surface being read: deck, beats and card all belong to it
    setPreviewContext('scene ' + leaving + ' end', leaving);
    say('── LEAVING SCENE ' + leaving + ' -> CREATING SCENE ' + creating + ' (live) ──');

    // CAPTURE THE PRE-GENERATION IDENTITY *BEFORE* ANYTHING IS TRIGGERED. Reading the count
    // after the advance races the thing being measured.
    const before = await page.evaluate(() => {
      const cg = (window.state.scenes || []).filter(x => x && String(x.uid).startsWith('cg:'));
      return { count: cg.length, lastUid: cg.length ? cg[cg.length - 1].uid : null };
    });

    // THE SCENE'S OWN FATE CARDS — a SEPARATE surface from the OAS deck, and a separate
    // helper. The scene loop was still calling waitForHand(), which no longer exists: once the
    // OAS handoff succeeded, scene 2 would have died on a ReferenceError (Codex 2026-10-05).
    const readSceneDeck = () => page.evaluate(() => {
      // SCENE CARDS ARE ON THE ACTIVE READER, WHICH IS #gnCardMount HERE. I originally excluded
      // that mount to avoid mistaking OAS cards for scene cards — but on a staged Book the
      // staged reader IS gnReader, so its scene deck lands in the same mount the OAS used. By
      // this point the OAS has resolved and archived, so there is no ambiguity left to avoid.
      const mount = (typeof window._activeCardMount === 'function')
        ? window._activeCardMount() : document.getElementById('cardMount');
      // ONLY PLAYABLE CARDS. The deck greys out the cards past the unlock count, and clicking a
      // locked one does nothing — which is how scene 2 clicked card 3 and populated no preview.
      // A reader cannot play a locked card, so neither does the runner.
      const visible = mount
        ? [...mount.querySelectorAll('.fate-card')].filter(e => e.offsetParent !== null)
        : [];
      const els = visible.filter(e => !e.classList.contains('locked'));
      return { count: els.length, lockedOut: visible.length - els.length,
        mountId: mount && mount.id,
        inOAS: !!(window.state.intimacyDialogue && window.state.intimacyDialogue.active),
        // REPORT THE COMMIT STATE. A hand left committed from the last OAS turn ignores every
        // further click and populates nothing, which is exactly how turn 2 failed inside the OAS.
        fateCommitted: window.state.fateCommitted,
        fateSelectedIndex: window.state.fateSelectedIndex,
        sceneKey: window.state._fateOptionsSceneKey,
        // NO PREVIEW CALL FIRES AT ALL at the scene boundary, which points at a CACHE HIT
        // serving an empty entry. _cacheFateCardPreview writes (action || ''), and the cache is
        // keyed by turn — the OAS turns share that key — so an empty entry would be served
        // forever for this scene. Report the cache rather than infer it.
        // Were these dealt fresh, or are they the OAS hand still on screen?
        fromOasHand: visible.filter(e => e.getAttribute('data-oas-hand') === '1').length,
        previewCache: (function () {
          try {
            const c = window.state._sceneFateCardPreviews || {};
            const out = { _cacheKey: c._cacheKey };
            Object.keys(c).forEach(k => { if (k === '_cacheKey') return;
              out[k] = { a: (c[k].action || '').length, d: (c[k].dialogue || '').length }; });
            return out;
          } catch (_) { return null; }
        })(),
        labels: els.map(e => (e.getAttribute('data-fate-card-slot')
          || (e.innerText || '').trim().split('\n')[0] || '').slice(0, 30)) };
    });
    const waitForSceneDeck = async (maxMs = 45000) => {
      const dl = Date.now() + maxMs;
      let last = null;
      while (Date.now() < dl) {
        last = await readSceneDeck();
        if (last.count > 0) return last;
        await page.waitForTimeout(1000);
      }
      return last;
    };
    // ── THE SCENE MUST HAVE RENDERED BEFORE ANY CARD IS DRAWN ─────────────────────────────
    // (Codex 2026-10-05.) Ordinary scene-end card selection begins only after this scene has
    // rendered and its own decision gate is open. Drawing earlier meant drawing from the
    // lingering interruption deck, which ignores clicks once rec.submitted is true.
    const sceneRendered = async (maxMs = 180000) => {
      const dl = Date.now() + maxMs;
      let last = null;
      while (Date.now() < dl) {
        last = await page.evaluate((n) => {
          const cg = (window.state.scenes || []).filter(x => x && String(x.uid).startsWith('cg:'));
          const intr = window.state._intimateInterruption;
          return { cgScenes: cg.length,
            // the interruption deck must be GONE or inert before its cards could be mistaken
            // for a scene deck
            interruptionLive: !!(intr && !intr.submitted),
            mounted: !!document.getElementById('stagedBeatText')
              || !!(window.state._stagedActive && window.state._stagedActive.plan),
            hasProjection: !!(cg.length && cg[cg.length - 1].projection && cg[cg.length - 1].text) };
        }, scene);
        if (last.cgScenes >= (scene - 1) && last.mounted && last.hasProjection) return last;
        await page.waitForTimeout(2000);
      }
      return last;
    };
    const rendered = await sceneRendered();
    say('  scene ' + scene + ' render state: ' + JSON.stringify(rendered));
    if (!rendered || !rendered.mounted || !rendered.hasProjection) {
      halted = true;
      haltReason = 'scene ' + scene + ' never rendered, so no scene-end deck could be offered'
        + ' (' + JSON.stringify(rendered) + ')';
      say('  *** STOPPING — ' + haltReason + ' ***');
      break;
    }
    // ── WALK THE SCENE'S BEATS TO ITS END ─────────────────────────────────────────────────
    // A staged scene is READ beat by beat; the scene-end Fate deck and its decision gate only
    // open once the reader reaches the last beat. Clicking #stagedNextBtn is what a reader does,
    // and until it is done there is no scene-end deck to offer — which is what "no scene Fate
    // cards were offered" meant, with the scene itself rendered and mounted.
    let beatSteps = 0;
    // WAIT FOR THE WALK TO BE POSSIBLE. Scene 3 rendered, then the loop broke on its first pass
    // because #stagedNextBtn had not mounted yet — "walked 0 beat(s)" and no deck. Poll briefly
    // for either the advance control or the deck before deciding there is nothing to walk.
    {
      const dl0 = Date.now() + 30000;
      while (Date.now() < dl0) {
        const r0 = await page.evaluate(() => {
          const btn = document.getElementById('stagedNextBtn');
          const m = (typeof window._activeCardMount === 'function') ? window._activeCardMount() : null;
          return { ready: !!(btn && btn.offsetParent !== null && !btn.disabled),
            cards: m ? [...m.querySelectorAll('.fate-card')].filter(e => e.offsetParent !== null).length : 0 };
        });
        if (r0.ready || r0.cards > 0) break;
        await page.waitForTimeout(1000);
      }
    }
    for (let b = 0; b < 40; b++) {
      const st = await page.evaluate(() => {
        const btn = document.getElementById('stagedNextBtn');
        const mount = (typeof window._activeCardMount === 'function') ? window._activeCardMount() : null;
        return {
          nextVisible: !!(btn && btn.offsetParent !== null && !btn.disabled),
          cards: mount ? [...mount.querySelectorAll('.fate-card')]
            .filter(e => e.offsetParent !== null).length : 0,
          beatIdx: (window.state._stagedActive && window.state._stagedActive.beatIdx) ?? null
        };
      });
      if (st.cards > 0) break;
      if (!st.nextVisible) break;
      await page.locator('#stagedNextBtn').click({ timeout: 10000 }).catch(() => {});
      beatSteps++;
      await page.waitForTimeout(900);
    }
    say('  walked ' + beatSteps + ' beat(s) to the end of scene ' + scene);
    if (process.env.SB_BREAK_SCENE_HISTORY) {
      await page.evaluate(() => { try { delete window.state.scenes; } catch (_) {} });
      say('      [probe] state.scenes REMOVED - the opening guard must see UNKNOWN history');
    }
    if (process.env.SB_SEED_CANON_BLOCK) {
      await page.evaluate(() => {
        try {
          window.state._canonAuditBlocked = {
            at: Date.now(), sceneIndex: (window.state.turnCount || 0),
            proposal: { state_change: 'The Answer draws the memory of the one Lirael lost into visible form between her hands.' },
            packetIds: ['neg_0'],
            verdict: { source: 'audit', reason: 'new_metaphysics [neg_0]: Fate interventions leave no new visible magical trace.' } };
        } catch (_) {}
      });
      say('      [probe] seeded a canon-audit refusal for the next planner call');
    }
    const sDeck = await waitForSceneDeck();
    if (!sDeck || !sDeck.count) {
      halted = true;
      haltReason = 'no scene Fate cards were offered at scene ' + scene;
      say('  *** STOPPING — ' + haltReason + ' ***');
      break;
    }
    // SB_PREFER_CARD lets a bounded arm exercise ONE specific card through the real control
    // instead of whatever the rotation happens to offer. If that card is not on offer the arm says
    // so rather than substituting another and reporting it as the same test.
    let sIdx = nextPick(sDeck.count);
    if (process.env.SB_PREFER_CARD) {
      const want = String(process.env.SB_PREFER_CARD).toLowerCase();
      // THE IDS EXIST. Cards carry data-card-index, which indexes state.fateOptions - the mapping
      // fatecards.js itself uses (cardEl.dataset.cardIndex -> state.fateOptions[idx]). My earlier
      // probe looked for data-card-id/data-card, found blank strings, and wrongly concluded the
      // card was absent. Blank LABELS prove nothing about which cards are dealt.
      const found = await page.evaluate((w) => {
        const host = document.getElementById('gnCardMount') || document.getElementById('cardMount');
        const scope = (host && host.getClientRects().length > 0) ? host : document;
        const cards = [...scope.querySelectorAll('.fate-card, [data-card-index]')];
        const opts = (window.state && window.state.fateOptions) || [];
        const rows = cards.map((el, pos) => {
          const di = Number(el.dataset && el.dataset.cardIndex);
          const opt = Number.isFinite(di) ? opts[di] : null;
          return { pos, cardIndex: Number.isFinite(di) ? di : null,
                   id: String((opt && opt.id) || '').toLowerCase(),
                   title: String((opt && opt.title) || '') };
        });
        const hit = rows.find((r) => r.id === w);
        return { rows, idx: hit ? hit.pos : -1, optionCount: opts.length };
      }, want);
      say('      dealt cards (via data-card-index -> state.fateOptions): '
        + JSON.stringify(found.rows.map((r) => r.id || ('#' + r.cardIndex))));
      if (found.idx >= 0) {
        sIdx = found.idx;
        say('      SB_PREFER_CARD=' + want + ' resolved to deck position ' + sIdx);
      } else {
        // A MISSING CARD STOPS THE CASE. Continuing with a random card and reporting it as the
        // same test is exactly the substitution that makes a result worthless.
        halted = true;
        haltReason = 'SB_PREFER_CARD=' + want + ' was not dealt at scene ' + scene
          + ' (dealt: ' + JSON.stringify(found.rows.map((r) => r.id)) + ')';
        say('  *** STOPPING - ' + haltReason + ' ***');
        break;
      }
    }    await page.evaluate(() => {
      ['gnActionInput', 'gnDialogueInput', 'actionInput', 'dialogueInput'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); }
      });
    });
    let sClickErr = null;
    // SCOPE THE CLICK TO THE READER THE CARDS ARE ON. A bare '.fate-card' resolved nth() across
    // the whole document and picked a card inside the HIDDEN #cardMount, so the click waited
    // 15s on an invisible element. readSceneDeck() reports which mount it counted; click there.
    const sSel = (sDeck && sDeck.mountId)
      ? ('#' + sDeck.mountId + ' .fate-card:not(.locked)') : '.fate-card:not(.locked)';
    await page.locator(sSel).nth(sIdx).click({ timeout: 15000 })
      .catch(e => { sClickErr = (e && e.message) || 'click failed'; });
    if ((process.env.SB_TYPE_DURING_DELAY || process.env.SB_CLEAR_DURING_DELAY)
        && !global.__sbTypedOnce) {
      global.__sbTypedOnce = true;
      const typed = process.env.SB_TYPE_DURING_DELAY || '';
      await page.evaluate(async (v) => {
        const el = document.getElementById('gnDialogueInput')
          || document.getElementById('dialogueInput');
        if (!el) return;
        el.focus();
        el.value = v;                                   // '' for the deliberate-deletion case
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }, typed);
      say('      typed into Say DURING the pre-preview delay: ' + JSON.stringify(typed));
      await page.waitForTimeout(2500);                  // let the 600ms fill + preview land
      const held = await page.evaluate(() => {
        const el = document.getElementById('gnDialogueInput')
          || document.getElementById('dialogueInput');
        return el ? el.value : null;
      });
      say('      Say after the preview landed: ' + JSON.stringify(held));
    }
    if (sClickErr) {
      halted = true;
      haltReason = 'scene ' + scene + ' card click FAILED: ' + sClickErr;
      say('  *** STOPPING — ' + haltReason + ' ***');
      break;
    }
    let sSub = { action: '', dialogue: '' };
    // PREVIEW READINESS, carried over from the interaction control. A card clicked before the
    // preview batch returns submits the template placeholder; waiting for a real preview makes
    // the evaluation measure the product rather than a race. If it never arrives the run goes on
    // and the fallback is RECORDED, not hidden.
    {
      const rDl = Date.now() + 25000;
      while (Date.now() < rDl) {
        const r = await page.evaluate(() => {
          const v = (id) => { const e = document.getElementById(id); return e ? (e.value || '') : ''; };
          const t = (v('gnActionInput') + ' ' + v('gnDialogueInput')).trim()
            || (v('actionInput') + ' ' + v('dialogueInput')).trim();
          return { filled: !!t, template: /…\s*$/.test(t) };
        });
        if (r.filled && !r.template) break;
        await page.waitForTimeout(700);
      }
    }
    const sDl = Date.now() + 20000;
    while (Date.now() < sDl) {
      sSub = await page.evaluate(() => {
        // READ BOTH READERS. "gnActionInput || actionInput" picked the gn element merely because
        // it EXISTS, so an empty gn field masked text that had been written to the literary
        // inputs — the fallback could never fire. Take whichever actually holds the suggestion,
        // and say which one it came from.
        const val = (id) => { const e = document.getElementById(id); return e ? (e.value || '') : ''; };
        const gnA = val('gnActionInput'), gnD = val('gnDialogueInput');
        const litA = val('actionInput'), litD = val('dialogueInput');
        const gnHas = !!(gnA.trim() || gnD.trim());
        const action = gnHas ? gnA : litA, dialogue = gnHas ? gnD : litD;
        // WHICH CARD, AND WHAT THE APP HAS CACHED FOR IT. Classification happens OUTSIDE the
        // page, against the preview replies the runner actually served — the page cannot know
        // what was on the wire, and wording cannot establish authorship.
        const cache = window.state._sceneFateCardPreviews || {};
        const sel = (window.state.fateOptions || [])[window.state.fateSelectedIndex];
        const cached = sel ? cache[sel.id] : null;
        return { action: action, dialogue: dialogue,
          source: gnHas ? 'gn' : ((litA.trim() || litD.trim()) ? 'literary(HIDDEN)' : 'neither'),
          cardId: sel ? sel.id : null,
          selectedIndex: window.state.fateSelectedIndex,
          appKey: { turnCount: window.state.turnCount || 0,
            sceneFateKey: window.state._fateOptionsSceneKey || null,
            oasBeat: window.state.intimacyDialogue
              ? (window.state.intimacyDialogue.beatCount ?? null) : null },
          cacheEntry: cached ? { action: cached.action || '', dialogue: cached.dialogue || '' } : null,
          gn: { a: gnA.length, d: gnD.length }, lit: { a: litA.length, d: litD.length } };
      });
      if ((sSub.action && sSub.action.trim()) || (sSub.dialogue && sSub.dialogue.trim())) break;
      await page.waitForTimeout(400);
    }
    const prov = classifyPreview(sSub.cardId, sSub.action, sSub.dialogue, sSub.cacheEntry,
      { encounter: 'scene ' + leaving + ' end', turn: leaving, app: sSub.appKey });
    sSub.origin = prov.provenance;
    sSub.evidence = prov.evidence;
    cardLog.push({ scene, deck: sDeck, chosenIdx: sIdx, submitted: sSub, provenance: prov });
    say('  scene ' + scene + ' plays card ' + sIdx + ' "' + (sDeck.labels[sIdx] || '?') + '"'
      + ' from ' + sDeck.mountId + ' [preview: ' + sSub.origin + ']' + ' (playable=' + sDeck.count
      + ' locked=' + sDeck.lockedOut + ' committed=' + sDeck.fateCommitted
      + ' sel=' + sDeck.fateSelectedIndex + ' key=' + sDeck.sceneKey + ')'
      + ' via ' + sSub.source
      + (((sSub.action || '') + (sSub.dialogue || '')).trim() ? '' : ' [NO PREVIEW POPULATED]'));
    say('      provenance: ' + sSub.origin + ' — ' + sSub.evidence);
    if (!((sSub.action || '') + (sSub.dialogue || '')).trim()) {
      say('    preview cache: ' + JSON.stringify(sDeck.previewCache));
      say('    option ids   : ' + JSON.stringify(sDeck.labels));
      say('    cards still from the OAS hand: ' + sDeck.fromOasHand + ' of ' + sDeck.count);
      // THE PAGE'S OWN ACCOUNT of the click. Four hypotheses about this failure were wrong
      // (locked card, committed hand, stale OAS elements, text written to the hidden reader), so
      // read what the app actually logged instead of forming a fifth.
      const tail = consoleLog.slice(-40).filter(l =>
        /FATE|INTIMACY|fate|card|preview|Error|error|throw/.test(l));
      say('    page console (last ' + tail.length + ' relevant lines):');
      tail.slice(-14).forEach(l => say('      | ' + String(l).slice(0, 150)));
    }

    const g = await advanceExpectingGate(page, sSub.action || '', sSub.dialogue || '');
    if (g.promptMounted) await chooseBranch(page, 'A');

    // OBSERVED COMPLETION. A GAP BETWEEN PROVIDER CALLS IS NOT A REJECTION — the app may be
    // between stages or parsing a response. Only a sustained quiet period with no new scene,
    // or the overall deadline, ends the wait.
    const sceneDeadline = Date.now() + REQUEST_TIMEOUT_MS + 180000;
    let outcome = 'timeout', quietSince = null;
    while (Date.now() < sceneDeadline) {
      const st = await page.evaluate((prev) => {
        const cg = (window.state.scenes || []).filter(x => x && String(x.uid).startsWith('cg:'));
        const last = cg[cg.length - 1] || null;
        return { count: cg.length, grew: cg.length > prev.count,
          newUid: last && last.uid !== prev.lastUid,
          hasProjection: !!(last && last.projection && last.text),
          mounted: !!document.getElementById('stagedBeatText')
            || !!(window.state._stagedActive && window.state._stagedActive.plan) };
      }, before);
      if (st.grew && st.newUid && st.hasProjection && st.mounted) { outcome = 'accepted'; break; }
      if (inFlight > 0) { quietSince = null; }
      else if (quietSince == null) { quietSince = Date.now(); }
      else if (Date.now() - quietSince > 90000) { outcome = 'no-generation'; break; }
      await page.waitForTimeout(2000);
    }
    const snap = await snapshot('scene' + scene);
    sceneLedger.push({ sceneNumber: creating, createdBy: 'the ending card of scene ' + leaving,
      cardFrom: leaving, cardIdx: sIdx, cardLabel: (sDeck.labels[sIdx] || null),
      previewSource: sSub.source, previewOrigin: sSub.origin || null,
      accepted: outcome === 'accepted', notesAfter: snap.notes.length,
      cgScenesAfter: snap.scenes });
    write('scene' + creating + '.json', { outcome, creating, leaving, before, snap,
      openingBranch,
      cards: cardLog.filter(c => c.scene === scene) });
    say('  SCENE ' + creating + ' ' + outcome.toUpperCase() + ' (card played in scene ' + leaving
      + ') · cg scenes ' + before.count + ' -> ' + snap.scenes
      + ' · notes ' + snap.notes.length + ' · exposure $' + exposure().toFixed(6));
    if (outcome !== 'accepted') {
      halted = true;
      haltReason = 'scene ' + creating + ' did not complete (' + outcome + ')';
      say('  *** STOPPING — ' + haltReason + '. Not restarting; reporting as found. ***');
      break;
    }
    // Page to the next gate.
    for (let k = 0; k < 25; k++) {
      if (await page.evaluate(() => !!window.state._stagedActive)) break;
      await page.waitForTimeout(1500);
    }
    say('  paged to gate: ' + JSON.stringify(await pageToGate()));
    say('');
  }

  // ── THE ISSUE ENDS AT SCENE 10 — VERIFY IT, DO NOT ASK FOR AN ELEVENTH ──────────────────
  // (Codex 2026-10-05.) The old loop played a card in Scene 10 and then waited for a Scene 11
  // the issue does not contain, reporting "no-generation" for a product that had correctly
  // reached its boundary. The final error is not suppressed: Scene 10's own projection and the
  // production issue-ending state are CHECKED, and a failure of either is still a failure.
  if (!halted) {
    const endState = await page.evaluate((last) => {
      const cg = (window.state.scenes || []).filter(x => x && String(x.uid).startsWith('cg:'));
      const tenth = cg[cg.length - 1] || null;
      const st = window.state;
      return {
        cgScenes: cg.length,
        tenthUid: tenth && tenth.uid,
        tenthAccepted: !!(tenth && tenth.projection && tenth.text),
        tenthChars: tenth && tenth.text ? String(tenth.text).length : 0,
        // THE PRODUCTION ISSUE-ENDING STATE, read from the app's OWN helpers. My first attempt
        // guessed at _issueComplete / _issuePosition, which do not exist and returned
        // null/false — so I could not have claimed this was verified. The real signals are
        // _getSceneInIssue() (1..scenesPerIssue, resetting at each boundary) and the issue's
        // planned length from ISSUE_PRICING: the issue has ENDED when the position has wrapped
        // back to the start, or equals the planned length with no further scene pending.
        sceneInIssue: (typeof window._getSceneInIssue === 'function') ? window._getSceneInIssue() : null,
        // PRODUCTION'S OWN PREDICATE — the one that drives the issue-boundary Submit swap.
        isLastSceneOfIssue: (typeof window._isLastSceneOfIssue === 'function')
          ? !!window._isLastSceneOfIssue() : null,
        scenesPerIssue: (function () {
          try { return (window.ISSUE_PRICING || {})[window.state._storyMode === 'literary'
            ? 'literary' : 'cg'].scenesPerIssue; } catch (_) { return null; }
        })(),
        turnCount: st.turnCount || null,
        decisionNeeded: (typeof window._sceneDecisionNeeded === 'function')
          ? !!window._sceneDecisionNeeded() : null,
        nextGateOpen: !!(window.state._stagedActive && window.state._stagedActive.plan),
        notes: Object.keys(window.state._historyNotes || {}).length
      };
    }, LAST_SCENE);
    say('');
    say('── ISSUE BOUNDARY ──');
    say('  scene 10 accepted projection: ' + endState.tenthAccepted
      + ' · ' + endState.tenthChars + ' chars · uid=' + String(endState.tenthUid).slice(0, 18));
    say('  cg scenes: ' + endState.cgScenes + ' · history notes: ' + endState.notes);
    say('  production issue state: scene ' + endState.sceneInIssue + ' of '
      + endState.scenesPerIssue + ' (turnCount ' + endState.turnCount + ')'
      + ' · decisionNeeded=' + endState.decisionNeeded
      + ' · nextGateOpen=' + endState.nextGateOpen);
    boundaryCheck = { sceneNumber: LAST_SCENE, accepted: endState.tenthAccepted,
      chars: endState.tenthChars, uid: endState.tenthUid,
      sceneInIssue: endState.sceneInIssue, scenesPerIssue: endState.scenesPerIssue,
      turnCount: endState.turnCount };
    write('issue_boundary.json', endState);
    // ── TWO SEPARATE CLAIMS, ASSERTED SEPARATELY ─────────────────────────────────────────
    // (Codex 2026-10-05.) The previous version printed "ISSUE COMPLETE" after checking only that
    // a projection existed and that there were at least nine records. It COLLECTED the production
    // boundary values and never tested them, so a counter disagreement could not fail anything.
    //
    // CLAIM A — THE REQUESTED CORPUS: ten story scenes, the FIXED opening plus generated 2-10.
    //           This is the test scope and is entirely within the runner's knowledge.
    // CLAIM B — THE PRODUCTION ISSUE BOUNDARY: the app's own counter agrees the issue is done.
    //           This is the app's claim, and it is asserted, not merely logged.
    // THE CLAIM FOLLOWS THE REQUESTED SCOPE, NOT A FIXED TEN (corrected 2026-10-12).
    // This was `endState.cgScenes === 9`, i.e. scenes 2-10 hardcoded. An authorized run of
    // SB_LAST_SCENE=8 therefore reported "FAILED — the requested ten-scene corpus was not
    // generated" for producing exactly what was asked of it, and the response to that was to
    // extend the next run to ten scenes to satisfy the assertion. That is the harness dictating
    // scope to the person paying for it. The requested scope is SB_LAST_SCENE; story scene 1 is
    // the fixed opening and generates nothing, so the expected record count is LAST_SCENE - 1.
    const expectedRecords = LAST_SCENE - 1;
    const corpusOk = endState.tenthAccepted && endState.cgScenes === expectedRecords;
    // The fixed opening is story scene 1 and generates nothing, so a complete ten-scene issue
    // leaves nine generated records. Production's own position must therefore read
    // scenesPerIssue - 1 if (and only if) its counter excludes the opening the same way.
    // THE PRODUCTION PREDICATE, NOT A TOLERANT RANGE. (Codex 2026-10-05.) Accepting 9 OR 10 made
    // the test tolerate the counter defect instead of demonstrating a correct boundary.
    // Production's own predicate is _isLastSceneOfIssue(): _getSceneInIssue() === scenesPerIssue.
    // Nothing else passes.
    const boundaryOk = (endState.isLastSceneOfIssue === true);
    const expectedPos = endState.scenesPerIssue;
    // CLAIM B is only MEANINGFUL when the requested scope actually reaches the issue's last
    // scene. A run deliberately stopping short has not failed to reach a boundary it was never
    // asked to reach, and asserting it would be the same scope error as CLAIM A's.
    const boundaryInScope = (LAST_SCENE >= endState.scenesPerIssue);
    const boundaryAgrees = boundaryInScope ? boundaryOk : true;

    say('  CLAIM A — requested ' + LAST_SCENE + '-scene corpus (fixed opening + generated 2-'
      + LAST_SCENE + '): '
      + (corpusOk ? 'GENERATED' : 'NOT GENERATED')
      + '  (' + endState.cgScenes + ' generated records, expected ' + expectedRecords
      + ', scene ' + LAST_SCENE
      + ' projection ' + (endState.tenthAccepted ? 'accepted' : 'MISSING') + ')');
    say('  CLAIM B — production recognizes issue completion: '
      + (boundaryInScope ? (boundaryOk ? 'YES' : 'NO')
          : 'NOT IN SCOPE (this run requested scene ' + LAST_SCENE + ' of an issue of '
            + endState.scenesPerIssue + '; the boundary was never asked for)')
      + '  (_isLastSceneOfIssue()=' + endState.isLastSceneOfIssue
      + '; position ' + endState.sceneInIssue + ' of ' + endState.scenesPerIssue
      + ' — production requires exactly ' + expectedPos + ')');

    if (!corpusOk) {
      halted = true;
      haltReason = 'the requested ten-scene corpus was not generated: '
        + endState.cgScenes + ' generated records (expected 9), scene ' + LAST_SCENE
        + ' projection ' + (endState.tenthAccepted ? 'accepted' : 'MISSING');
      say('  *** FAILED — ' + haltReason + ' ***');
    } else if (!boundaryOk) {
      // A COUNTER DISAGREEMENT IS A FAILURE, not a footnote. It is reported as a counter problem
      // rather than as grounds to generate an extra scene.
      halted = true;
      haltReason = 'the ten-scene corpus is complete but PRODUCTION DOES NOT RECOGNIZE ISSUE '
        + 'COMPLETION: _isLastSceneOfIssue()=' + endState.isLastSceneOfIssue + ' at position '
        + endState.sceneInIssue + ' of ' + endState.scenesPerIssue + '. This is the counter '
        + 'defect, NOT grounds to generate an eleventh scene.';
      say('  *** FAILED — ' + haltReason + ' ***');
    }
    boundaryCheck.corpusOk = corpusOk;
    boundaryCheck.boundaryOk = boundaryOk;
    boundaryCheck.boundaryAgrees = boundaryAgrees;
    boundaryCheck.expectedPosition = expectedPos;
  }

  write('scene_ledger.json', { openingBranch, scenes: sceneLedger, boundaryCheck });
  say('');
  say('── SCENE LEDGER (each scene against the step that created it) ──');
  if (boundaryCheck) say('  (boundary check: scene ' + boundaryCheck.sceneNumber + ' projection '
    + (boundaryCheck.accepted ? 'accepted' : 'MISSING') + ', ' + boundaryCheck.chars + ' chars, '
    + 'production position ' + boundaryCheck.sceneInIssue + '/' + boundaryCheck.scenesPerIssue + ')');
  sceneLedger.forEach(r => say('  scene ' + r.sceneNumber + '  '
    + (r.accepted ? 'accepted' : 'NOT accepted') + '  <- ' + (r.createdBy || 'verified at boundary')
    + (r.previewSource ? '  [preview: ' + r.previewSource
        + (r.previewOrigin ? '/' + r.previewOrigin : '') + ']' : '')));
  write('final.json', await snapshot('final'));
} catch (e) {
  say('\n*** RUN ERROR: ' + (e && e.message) + ' ***');
  write('error.txt', String(e && e.stack || e));
}

if (process.env.SB_DUMP_READER_STATE) {
  try {
    const rs = await page.evaluate(() => {
      const st = window.state || {};
      const vis = (id) => { const e = document.getElementById(id); return !!(e && e.getClientRects().length > 0); };
      const en = (id) => { const e = document.getElementById(id); return !!(e && !e.disabled); };
      return {
        stagedSubmitting: st._stagedSubmitting === true,
        isAdvancingScene: st._isAdvancingScene === true,
        resumable: st._cgResumable || null,
        reduxRejected: (st._reduxRejectedScenes || []).map((x) => ({
          sceneIndex: x.sceneIndex, sharedBeats: x.sharedBeats, totalBeats: x.totalBeats,
          rawPlanBeats: (x.rawPlan && x.rawPlan.beats && x.rawPlan.beats.length) || 0 })),
        composingIndicatorVisible: vis('stagedComposingIndicator'),
        turnCount: st.turnCount,
        sceneAssignments: (st.scenes || []).filter((x) => x && x.assignedEvent).map((x) => ({
          uid: String(x.uid || '').slice(0, 18),
          event: String(x.assignedEvent.state_change || '').slice(0, 70),
          attemptId: x.assignedEvent.attemptId || null })),
        acceptedPlannerProposal: st._acceptedPlannerProposal
          ? { sceneNum: st._acceptedPlannerProposal.sceneNum,
              state_change: String(st._acceptedPlannerProposal.state_change || '').slice(0, 80) }
          : null,
        eventDeliveryDiagnostics: (st._eventDeliveryDiagnostics || []).map((d) => ({
          sceneNum: d.sceneNum, sceneUid: String(d.sceneUid || '').slice(0, 18),
          assignmentUid: String(d.assignmentUid || '').slice(0, 18),
          assignmentAttemptId: String(d.assignmentAttemptId || '').slice(0, 20),
          assignedEvent: String(d.assignedEvent || '').slice(0, 55),
          verdict: d.verdict, citationsAllFound: d.citationsAllFound,
          citations: (d.citations || []).map((c) => ({ found: c.foundInScene,
            passage: String(c.passage || '').slice(0, 42) })),
          assessedProse: d.assessedProse })),
        sayUsable: en('gnDialogueInput') || en('dialogueInput'),
        doUsable: en('gnActionInput') || en('actionInput'),
        submitUsable: en('gnSubmitBtn') || en('submitBtn')
      };
    });
    write('reader_state.json', rs);
    say('  [reader-state] ' + JSON.stringify(rs));
  } catch (e) { say('  [reader-state] dump failed: ' + (e && e.message)); }
}
write('console.log', consoleLog.join('\n'));
write('cards.json', cardLog);
write('calls.json', calls);
say('\n' + '='.repeat(78));
// THE STALE BANNER IS GONE. (Codex 2026-10-06.) ledger.spendReport keeps its OWN accumulator,
// which this runner never feeds — so it printed "MEASURED (receipts): $0.000000" and "UNMEASURED:
// none — every dispatch returned a receipt" while the per-call roll-up below showed $0.083266
// receipted and SEVEN receiptless calls. A contradictory banner is worse than no banner. The
// per-call accounting that follows is the real figure.
say('');
say('SPEND — from the runner\'s own per-call records (the only accounting fed by this run)');
const measured = calls.reduce((n, c) => n + (c.measured || 0), 0);
const noReceipt = calls.filter(c => c.measured == null);
say('\nPER-CALL ROLL-UP');
say('  model calls dispatched : ' + calls.length);
say('  MEASURED (receipts)    : $' + measured.toFixed(6));
say('  no receipt             : ' + noReceipt.length + ' call(s), estimated $'
  + noReceipt.reduce((n, c) => n + c.estimate, 0).toFixed(6) + ' — NOT counted as measured');
say('  retained (no receipt)  : $' + retained.toFixed(6) + ' — kept as exposure, NOT forgiven');
say('  prior runs             : $' + priorExposure.toFixed(6));
say('  TOTAL EXPOSURE         : $' + exposure().toFixed(6));
say('  ceiling                : $' + CEILING.toFixed(2) + (halted ? '  [HALTED: ' + haltReason + ']' : ''));
const cached = calls.filter(c => c.cachedTok != null);
if (cached.length) {
  const tc = cached.reduce((n, c) => n + c.cachedTok, 0), ti = cached.reduce((n, c) => n + (c.inTok || 0), 0);
  say('  CACHED TOKENS          : ' + tc + ' of ' + ti + ' input (' + (ti ? (tc / ti * 100).toFixed(1) : '0') + '%)');
}
write('SUMMARY.json', { calls: calls.length, receipted: settled, retainedUnresolved: retained,
  priorExposure, totalExposure: exposure(), ceiling: CEILING, halted, haltReason });
// CARRY THE BUDGET FORWARD. The next run under the same authorization starts from here, with
// unresolved exposure still counted — it is not forgiven by a new process.
try {
  // OUTSTANDING RESERVATIONS SURVIVE FINALIZATION. The previous version dropped them, which
  // reported $0.555713 when the run's own roll-up said $0.576715 — $0.021002 of exposure
  // forgiven by the save itself. They are carried as unresolved, not erased, and the file is
  // the SELECTED one so a fixture run cannot write the real ledger (Codex 2026-10-05).
  const stillOut = outstanding.reduce((n, x) => n + (x.estimate || 0), 0);
  const next = { receipted: (PRIOR.receipted || 0) + settled,
    unresolved: (PRIOR.unresolved || 0) + retained + stillOut,
    outstanding: [],
    runs: (PRIOR.runs || []).concat([{ run: RUN, receipted: settled,
      unresolved: retained, outstandingAtExit: stillOut }]),
    authorization: PRIOR.authorization || null, note: PRIOR.note || null };
  if (stillOut > 0) {
    say('  NOTE: $' + stillOut.toFixed(6) + ' of reservations were still outstanding at exit and');
    say('        are carried as UNRESOLVED exposure, not forgiven.');
  }
  fs.writeFileSync(BUDGET_FILE, JSON.stringify(next, null, 2));
  say('\nBUDGET CARRIED FORWARD -> ' + BUDGET_FILE);
  say('  receipted to date  $' + next.receipted.toFixed(6));
  say('  unresolved to date $' + next.unresolved.toFixed(6));
  say('  TOTAL vs ceiling   $' + (next.receipted + next.unresolved).toFixed(6)
    + ' of $' + CEILING.toFixed(2));
} catch (_) {}
say('\noutput: ' + RUN);
// The reload arm threw "Target page, context or browser has been closed" because teardown ran
// while it was still working. Teardown now waits for it, under a bound.
if (_armWork) {
  try { await Promise.race([_armWork, new Promise((r) => setTimeout(r, 120000))]); } catch (_) {}
}
await browser.close();
LOG.end();
