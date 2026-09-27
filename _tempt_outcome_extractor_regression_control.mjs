// EXTRACTOR REGRESSION — the three retained live responses, run through the REAL validator. $0.
//
// Each fixture is a real response from an authorized run. Two must be refused. The third must be
// ACCEPTED — and is still semantically wrong, which is the point: verbatim-quote validation proves a
// quote EXISTS in the prose, never that it SUPPORTS the claim. Pinning that here stops the gap being
// mistaken for closed.
//
// usage: node _tempt_outcome_extractor_regression_control.mjs

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const F = path.join(__dirname, '_tempt_fate_fixtures', 'extractor_regression');
const CTX = path.join(__dirname, '_tempt_fate_fixtures', 'extractor_only_2026-09-27_01-35-36', 'extraction_context.json');
const results = [];
const ok = (n, p, d) => { results.push({ n, p: !!p }); console.log((p ? '  ✓ ' : '  ✗ ') + n + (!p && d ? '\n        → ' + String(d).slice(0, 300) : '')); };

(async () => {
  console.log('=== EXTRACTOR REGRESSION — three retained responses, real validator ($0) ===\n');
  const ctxFile = JSON.parse(fs.readFileSync(CTX, 'utf8'));
  const prose = (ctxFile.ctx || {}).prose || '';
  const roster = (ctxFile.ctx || {}).rosterNames || [];

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(__dirname, '_tempt_outcome_extractor_regression_out.jsonl'), blockImagePreparation: true });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window._validateTemptFateOutcomeReport, { timeout: 25000 });

  // 01 — truncated: cannot even become an object on the extractor's own parse chain.
  const raw01 = fs.readFileSync(path.join(F, '01_truncated_uncited.txt'), 'utf8');
  const chain = (body) => { try { JSON.parse(body); return true; } catch (_) {}
    const m = String(body).match(/\{[\s\S]*\}/); if (!m) return false;
    try { JSON.parse(m[0]); return true; } catch (_) { return false; } };
  ok('01 TRUNCATED — unparseable on the extractor\'s parse chain, so it can never reach the validator',
    chain(raw01) === false, 'parsed=' + chain(raw01));

  const validate = async (obj) => page.evaluate(([o, p, r]) => {
    try { const res = window._validateTemptFateOutcomeReport(o, { prose: p, rosterNames: r });
      return { ok: !!(res && (res.ok === true || (res.errors || []).length === 0)), errors: (res && res.errors) || [] }; }
    catch (e) { return { ok: false, errors: ['threw: ' + String(e && e.message)] }; }
  }, [obj, prose, roster]);

  // 02 — parses, but no citations and a disposition value in state.
  const f02 = JSON.parse(fs.readFileSync(path.join(F, '02_parsed_uncited_badstate.json'), 'utf8'));
  const v02 = await validate(f02);
  console.log('    02 errors: ' + JSON.stringify(v02.errors).slice(0, 220));
  ok('02 UNCITED + INVALID STATE — refused by the real validator', v02.ok === false, JSON.stringify(v02));
  ok('...and the refusal names the invalid state', /knowledgeStates/.test(JSON.stringify(v02.errors)));
  // CITATIONS ARE A SEPARATE PASS. _validateTemptFateOutcomeReport does structure; _tfoVerifyCitations
  // checks quotes against the prose. A first version of this control expected one combined result and
  // was wrong about the architecture, not about the outcome — both passes must refuse 02.
  const cites = async (obj) => page.evaluate(([o, p]) => {
    try { const r = window._tfoVerifyCitations(o, p); return Array.isArray(r) ? r : (r && r.errors) || []; }
    catch (e) { return ['threw: ' + String(e && e.message)]; }
  }, [obj, prose]);
  const c02 = await cites(f02);
  console.log('    02 citation errors: ' + JSON.stringify(c02).slice(0, 200));
  ok('...and the SEPARATE citation pass refuses it for missing quotes',
    JSON.stringify(c02).indexOf('evidenceQuote') !== -1, JSON.stringify(c02));

  // 03 — parses, cited verbatim, valid states. ACCEPTED, and still wrong.
  const f03 = JSON.parse(fs.readFileSync(path.join(F, '03_parsed_cited_ungrounded.json'), 'utf8'));
  const v03 = await validate(f03);
  console.log('    03 errors: ' + JSON.stringify(v03.errors));
  ok('03 CITED AND SCHEMA-VALID — ACCEPTED by the real validator', v03.ok === true, JSON.stringify(v03));
  const c03 = await cites(f03);
  console.log('    03 citation errors: ' + JSON.stringify(c03));
  ok('...and the citation pass ACCEPTS it too — both gates satisfied', c03.length === 0, JSON.stringify(c03));
  ok('...every citation is genuinely verbatim in the prose',
    (f03.affectedKnowers || []).every((k) => k.evidenceQuote && prose.indexOf(k.evidenceQuote) !== -1));
  // And yet the claims are not supported. Pinned to the exact quotes.
  const byWho = (w) => (f03.affectedKnowers || []).find((k) => String(k.who).indexOf(w) !== -1) || {};
  const julian = byWho('Julian'), seren = byWho('Seren');
  ok('...yet JULIAN is claimed `retained` on a quote about a GAZE — memory not established',
    julian.disposition === 'retained' && /gaze finds mine/.test(String(julian.evidenceQuote)),
    JSON.stringify({ d: julian.disposition, q: julian.evidenceQuote }));
  ok('...and SEREN is claimed `retained` on a quote about an INTENDED rite, not one recalled',
    seren.disposition === 'retained' && /We were to begin the rite/.test(String(seren.evidenceQuote)),
    JSON.stringify({ d: seren.disposition, q: seren.evidenceQuote }));
  ok('...so scopeMatch "narrower" rests on exceptions the prose does not establish',
    f03.scopeMatch === 'narrower', String(f03.scopeMatch));
  ok('THE GAP IS OPEN AND THIS FIXTURE PINS IT: verbatim citation does NOT prove semantic support',
    v03.ok === true && julian.disposition === 'retained');

  ok('zero provider dispatches', gate.trackedCalls().filter((c) => c.real).length === 0);
  const passed = results.filter((r) => r.p).length;
  console.log('\n' + '='.repeat(86));
  console.log('  ' + passed + '/' + results.length + ' assertions passed');
  if (passed !== results.length) console.log('  FAILED: ' + results.filter((r) => !r.p).map((r) => r.n).join(' | '));
  await browser.close();
  process.exit(passed === results.length ? 0 : 1);
})().catch((e) => { console.error('CONTROL ERROR:', e && e.stack || e); process.exit(2); });
