// ── DOES THE ISSUE SPINE'S OUTPUT ALLOWANCE HOLD A COMPLETE REPLY? (provider-free, $0) ──────
// The live run of 2026-10-11 (_fs_live_out/run_2026-10-12T02-16-25-745Z) dispatched the spine
// FOURTEEN times and got finish_reason "length" at exactly 2,000 completion tokens every time,
// because the allowance was chosen by the serving model's identity rather than by the size of the
// schema the prompt demands. Nothing in the repo would have caught that: no test compared the
// allowance against the contract.
//
// This reads the SHIPPED window._spineOutputAllowance — the same function the live request uses —
// and measures it against a reply that fills the COMPLETE response contract: every required
// per-row field at full length, every per-issue block (cliffhanger, regimePhase, cliffShape,
// visualArc), and the top-level fields, for BOTH modes (cg 10 rows/issue, literary 20) at every
// tier in ISSUE_TIER_COUNT.
//
// HONESTY ABOUT UNITS: this is an ESTIMATE, not a measurement. No tokenizer is consulted; the
// char-per-token divisor below is deliberately pessimistic for JSON. The point is not to predict
// the exact token count but to fail loudly when the allowance is the wrong ORDER of size, which is
// the defect that actually shipped.
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (label, ok, detail) => {
  if (ok) { pass++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label + (detail ? '  — ' + detail : '')); }
};

// Pessimistic for JSON: punctuation, quoted keys and short tokens push the ratio DOWN toward 3.
const CHARS_PER_TOKEN = 3.2;
const HEADROOM = 1.25;   // the same 25% the verifier contract preflight requires

// A row with every REQUIRED field at full length. Optional blocks are added separately so their
// cost is visible rather than hidden in an average.
const row = (n, withRoutes, withDecision) => {
  const r = {
    n,
    accomplishes: 'The presiding Dohkar serves formal notice on Lirael before the full assembly and names the restrictions aloud, and Julian is forced to answer for having demanded the review in the first place.',
    follows_from: 'Lirael refused to finish answering in the open and the assembly watched her end it.',
    link: 'therefore',
    changes: 'Lirael is formally under investigation and bound by named restrictions she has acknowledged.',
    sets_up: 'Whether she defies the restrictions to reach Julian or complies and lets the inquiry carry it.',
    kind: 'convergence'
  };
  if (withRoutes) {
    r.depends_on = ['the inquiry has been convened and its restrictions are public knowledge'];
    r.routes = [
      { choice: 'she ran from the clearing', how: 'the notice follows her to the spiralgrass instead of being served in the open', carries: 'the assembly already reads her flight as refusal, so the restrictions land harder' },
      { choice: 'she stayed and answered', how: 'the notice is served where she stands, in front of the people she answered to', carries: 'a reputation for composure that makes the restrictions look like overreach' }
    ];
    r.routes_decided_by = 2;
  }
  if (withDecision) {
    r.player_decision = 'Defy the restrictions and reach Julian tonight, or comply and let the inquiry take its course.';
  }
  return r;
};

const issueBlock = (rows, startN) => ({
  issueNumber: 1,
  issueThesis: 'The rite she completed becomes the thing she must answer for, and the man who demanded the answer is the one she cannot reach.',
  sceneOutline: Array.from({ length: rows }, (_, i) =>
    row(startN + i, i % 3 === 0, i === rows - 1)),
  cliffhanger: {
    scene: startN + rows - 1,
    event: 'The Dohkar reads the second charge aloud and Julian does not deny authorship of it.',
    why_unresolved: 'The reader does not know whether Julian demanded the review to protect her or to bury what he did.',
    issue2Predicament: 'Lirael enters the next issue bound by restrictions she cannot break without proving the charge, and the only person who can clear her is the person who brought it.'
  },
  regimePhase: 'pressure_accumulation',
  cliffShape: {
    preferredFamilies: ['threshold_of_consequence', 'loyalty_test', 'revelation'],
    avoidFamilies: ['countdown', 'external_shock'],
    escalation: 'soft proximity and almost-confession early, hard reversal and identity rupture at the issue boundary'
  },
  visualArc: {
    tendencies: ['compressed interiors', 'reflections and glass barriers recur', 'environmental dominance over couple framing'],
    escalation: ['visual isolation increases scene to scene', 'eye contact stays interrupted until the issue final scene'],
    withhold: ['centered-couple composition', 'warm lighting until the first involuntary vulnerability']
  }
});

const fullReply = (issues, rowsPerIssue) => ({
  runThesis: 'A woman who completed a rite correctly is tried for it by the institution that ordered it, and the only witness who can clear her is the one who brought the charge.',
  issueArcs: Array.from({ length: issues }, (_, i) => issueBlock(rowsPerIssue, i * rowsPerIssue + 1)),
  motifBank: Array.from({ length: 8 }, (_, i) => 'a sparse recurring anchor image number ' + (i + 1) + ', kept under eighty chars'),
  voiceAnchors: { protagonist: 'dry, procedural, counts what things cost', loveInterest: 'answers sideways and a half-second early' },
  forbiddenDefaults: Array.from({ length: 6 }, (_, i) => 'a default this run must not fall back on, number ' + (i + 1))
});

console.log('=== ISSUE SPINE OUTPUT CONTRACT (provider-free, $0) ===\n');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', async (r) => {
  try { await r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); } catch (_) {}
});
await page.goto((process.env.SB_ORIGIN || (process.env.SB_ORIGIN || 'http://localhost:3000')) + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._spineOutputAllowance === 'function', { timeout: 30000 });
t('the shipped window._spineOutputAllowance is present', true);

const tiers = await page.evaluate(() => ({
  tierCount: window.ISSUE_TIER_COUNT,
  pricing: window.ISSUE_PRICING,
  tok: window.SPINE_TOK
}));
console.log('  SPINE_TOK = ' + JSON.stringify(tiers.tok));
console.log('  rows/issue: cg=' + tiers.pricing.cg.scenesPerIssue
  + ' literary=' + tiers.pricing.literary.scenesPerIssue + '\n');

// 1. THE ALLOWANCE FOLLOWS ROWS, NOT JUST ISSUES. A literary issue is twice a CG one.
const cg2 = await page.evaluate(() => window._spineOutputAllowance('cg', 2));
const lit2 = await page.evaluate(() => window._spineOutputAllowance('literary', 2));
console.log('  cg×2      -> ' + JSON.stringify(cg2));
console.log('  literary×2 -> ' + JSON.stringify(lit2));
t('cg reads 10 rows per issue and literary reads 20',
  cg2.rowsPerIssue === 10 && lit2.rowsPerIssue === 20,
  JSON.stringify({ cg2, lit2 }));
t('the SAME issue count yields a larger literary allowance',
  lit2.tokens > cg2.tokens, JSON.stringify({ cg: cg2.tokens, lit: lit2.tokens }));
t('the allowance is declared an ESTIMATE', cg2.isEstimate === true, JSON.stringify(cg2));

// 2. THE COMPLETE CONTRACT FITS, for every mode and tier that ships.
//    TWO DIFFERENT OUTCOMES, kept apart on purpose:
//      - NOT CLAMPED and short  => a real failure. The formula is wrong and a live run would
//                                  truncate exactly as 2026-10-11 did.
//      - CLAMPED                => the complete contract exceeds the largest single reply this
//                                  bound permits. That is not something the formula can fix, and
//                                  passing it silently would be the original defect again. It is
//                                  REPORTED here and warned about in production at request time.
const unservable = [];
for (const mode of ['cg', 'literary']) {
  const rowsPerIssue = tiers.pricing[mode].scenesPerIssue;
  for (const [tier, issues] of Object.entries(tiers.tierCount[mode])) {
    const allow = await page.evaluate(
      (a) => window._spineOutputAllowance(a.mode, a.issues), { mode, issues });
    const body = JSON.stringify(fullReply(issues, rowsPerIssue));
    const estTokens = Math.ceil(body.length / CHARS_PER_TOKEN);
    const needed = Math.ceil(estTokens * HEADROOM);
    console.log('  ' + mode + '/' + tier + ': ' + issues + ' issue(s) × ' + rowsPerIssue
      + ' rows = ' + (issues * rowsPerIssue) + ' rows · complete reply ' + body.length
      + ' chars ≈ ' + estTokens + ' tok · needs ' + needed + ' with headroom · allowance '
      + allow.tokens + (allow.clamped ? ' [CLAMPED at ' + tiers.tok.hardMax + ']' : ''));
    if (allow.clamped) {
      // PRECISION MATTERS HERE. `needed` INCLUDES the 25% margin. A clamp therefore means the
      // allowance no longer carries the intended MARGIN — not that the response cannot fit. Those
      // are different findings, and conflating them was my error: it would argue for per-issue
      // generation on evidence that only shows a thin margin.
      const fitsUnpadded = estTokens < tiers.tok.hardMax;
      unservable.push(mode + '/' + tier + ': constructed reply ≈' + estTokens
        + ' tok (fits the ' + tiers.tok.hardMax + ' bound' + (fitsUnpadded ? '' : ' — DOES NOT FIT')
        + '), but ' + needed + ' with the 25% margin exceeds it — margin ≈'
        + Math.round((1 - estTokens / allow.tokens) * 100) + '% instead of 25%');
      t('a CLAMPED ' + mode + '/' + tier + ' is reported as clamped, never silently accepted',
        allow.clamped === true && allow.need > allow.tokens, JSON.stringify(allow));
      t('  and the constructed ' + mode + '/' + tier + ' reply still fits the bound itself',
        fitsUnpadded, 'est ' + estTokens + ' vs bound ' + tiers.tok.hardMax);
    } else {
      t('a COMPLETE ' + mode + '/' + tier + ' reply fits the allowance', allow.tokens >= needed,
        'needs ' + needed + ', allowance ' + allow.tokens);
    }
  }
}

// 3. THE OLD RULE IS PROVEN RED. 2,000 tokens could not hold even the smallest complete reply —
//    this is the number that actually shipped and truncated 14/14.
{
  const rowsPerIssue = tiers.pricing.cg.scenesPerIssue;
  const body = JSON.stringify(fullReply(2, rowsPerIssue));
  const estTokens = Math.ceil(body.length / CHARS_PER_TOKEN);
  console.log('\n  the allowance that shipped on 2026-10-11 was 2000 tokens; the smallest complete'
    + ' reply is ≈' + estTokens + ' tok');
  t('2000 tokens could NOT hold the smallest complete reply (the shipped defect, reproduced)',
    estTokens > 2000, 'est ' + estTokens);
}

await browser.close();
if (unservable.length) {
  console.log('\n  OPEN FINDING — REDUCED MARGIN, not an unservable contract:');
  unservable.forEach((u) => console.log('    · ' + u));
  console.log('  The constructed reply fits the bound; what does not fit is the 25% safety margin'
    + '\n  the other tiers get. This is a thinner cushion against a verbose reply, NOT proof that one'
    + '\n  response cannot hold the outline, and NOT on its own a reason to generate per issue.'
    + '\n  Production warns at request time when the clamp binds.');
}
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
