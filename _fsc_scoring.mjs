// SHARED RUN SCORER. Provider-free, no network.
//
// Built after the C4 run on unm.time_gives_way, where my own harness reported a CLEAN C2 on a
// scene that plainly failed it. Two defects, both fixed here:
//
//   1. C2 tested ROSTER PRESENCE only. The pre-registered criterion requires that "every roster
//      member's state is consistent with the declared disposition." A scene in which Lirael
//      narrates the replaced timeline scored as a pass because her NAME appeared.
//   2. The aftermath matcher false-negatived on Seren's rendered beat, because it demanded a
//      negation/uncertainty word AFTER the name in the same sentence.
//
// The external-timeline vocabulary is READ OUT OF public/app.js rather than restated here, so the
// instruction the author is given and the check it is scored against cannot drift apart.
import fs from 'fs';

// ── ONE SOURCE OF TRUTH ───────────────────────────────────────────────────────────────────────
export function loadExternalTimelinePhrases(appPath = 'public/app.js') {
  const src = fs.readFileSync(appPath, 'utf8');
  const m = src.match(/var FSC_EXTERNAL_TIMELINE_PHRASES = \[([\s\S]*?)\];/);
  if (!m) throw new Error('FSC_EXTERNAL_TIMELINE_PHRASES not found in ' + appPath);
  return m[1].split(',').map(s => s.trim().replace(/^'|'$/g, '')).filter(Boolean);
}

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const externalTimelineHits = (text, phrases) =>
  phrases.filter(p => new RegExp('\\b' + esc(p) + '\\b', 'i').test(String(text || '')));

// Two characters given a shared understanding of the edit. Forbidden unless the record establishes
// the relationship outright.
export const SHARED_UNDERSTANDING_RX = [
  /\bknows?\s+(?:that\s+)?I\s+know\b/i, /\bI\s+know\s+(?:that\s+)?he\s+knows\b/i,
  /\bwe\s+both\s+know\b/i, /\bthey\s+both\s+knew\b/i, /\bknowing\s+look\b/i,
  /\bshared\s+(?:a\s+)?(?:glance|look|understanding)\b/i, /\bneither\s+of\s+us\s+said\b/i,
  /\bhe\s+knows\b[^.]{0,40}\bnever\s+happened\b/i
];
export const sharedUnderstandingHits = t =>
  SHARED_UNDERSTANDING_RX.filter(rx => rx.test(String(t || ''))).map(rx => String(rx));

const SENTENCES = t => String(t || '').split(/(?<=[.?!])\s+|\n+/).filter(Boolean);

// ── ROSTER TOKENS — SHARED, so the runner and the control cannot diverge ──────────────────────
// pc:lirael MUST match first-person narration. These scenes are written in her voice and her NAME
// may never appear; a name-only token reported her ABSENT from a scene she narrates, which would
// have scored a presence failure against an obedient scene.
export const ROSTER_TOKENS = {
  'pc:lirael': /\bLirael\b|\b(?:I|me|my|myself)\b/,
  'named:seren': /\bSeren\b/i,
  'named:julian': /\bJulian\b/i,
  'role:first_sacrifice_presiding_dohkar': /\bDohkar\b/i,
  'the_assembly': /\b(assembly|crowd|gathering|First Favored)\b/i
};

// ── C2 — ROSTER **AND** DISPOSITION ───────────────────────────────────────────────────────────
// presence: every member present, no non-member affected.
// disposition: for a sealed memory/replacement effect, NO affected party may carry the replaced
//   timeline. The POV narrator counts — she is inside the population.
export function scoreC2(prose, { roster, tokens, phrases, dispositionSealed = true }) {
  const mentioned = Object.keys(tokens).filter(k => tokens[k].test(prose));
  const outside = mentioned.filter(m => roster.indexOf(m) < 0);
  const missing = roster.filter(r => mentioned.indexOf(r) < 0);
  const presenceOk = outside.length === 0 && missing.length === 0;

  const leaks = [];
  if (dispositionSealed) {
    const ss = SENTENCES(prose);
    ss.forEach((s, i) => {
      const hits = externalTimelineHits(s, phrases);
      if (!hits.length) return;
      // Attribute over the sentence AND the one before it: "Julian has not moved. He knows the
      // second rite never happened." puts the subject in the prior sentence and the leak in this
      // one. Scoring only the leak sentence credited that retention to nobody.
      const window = (i > 0 ? ss[i - 1] + ' ' : '') + s;
      const who = Object.keys(tokens).filter(k => tokens[k].test(window));
      leaks.push({ sentence: s.trim().slice(0, 150), phrases: hits, parties: who });
    });
  }
  // A leak with no named party is still a leak: the narrator is a roster member.
  const dispositionOk = leaks.length === 0;
  return {
    pass: presenceOk && dispositionOk,
    presence: { ok: presenceOk, mentioned, outside, missing },
    disposition: { ok: dispositionOk, leaks },
    retainingParties: [...new Set(leaks.flatMap(l => l.parties))]
  };
}

// ── C1 — ONLY THE SEALED CONSEQUENCE ──────────────────────────────────────────────────────────
// Mechanically detectable violations for a historical_replacement. Reading still owns the final
// call; this catches the three the C4 run actually committed.
export function scoreC1(prose, { phrases, erasedTerms = [] }) {
  const timeline = [];
  for (const s of SENTENCES(prose)) {
    const hits = externalTimelineHits(s, phrases);
    if (hits.length) timeline.push({ sentence: s.trim().slice(0, 150), phrases: hits });
  }
  const shared = sharedUnderstandingHits(prose);
  // A choice or line resting on a fact this delta erased.
  const erased = [];
  for (const s of SENTENCES(prose)) {
    for (const t of erasedTerms) {
      if (new RegExp(esc(t), 'i').test(s)) erased.push({ sentence: s.trim().slice(0, 150), term: t });
    }
  }
  return {
    pass: timeline.length === 0 && shared.length === 0 && erased.length === 0,
    externalTimeline: timeline, sharedUnderstanding: shared, erasedBasis: erased
  };
}

// ── AFTERMATH BEAT MATCHER (repaired) ─────────────────────────────────────────────────────────
// The register is a reaction whose CAUSE the character cannot name. The old pattern demanded a
// negation word AFTER the name inside one sentence, so it missed "her fingers trace her palms as
// if checking for something missing". Markers may now sit on EITHER side of the name.
export const AFTERMATH_MARKER_RX =
  /\b(as if|as though|something missing|for no reason|no reason|without (?:knowing|cause|reason|explanation)|cannot|could not|can[’']?t|couldn[’']?t|unable|falters?|refuses to arrive|loses? (?:his|her|their) place|her own certainty|does not know why|why)\b/i;

export function aftermathLanded(prose, name, markerRx = AFTERMATH_MARKER_RX) {
  const nameRx = new RegExp('\\b' + esc(name) + '\\b', 'i');
  for (const s of SENTENCES(prose)) if (nameRx.test(s) && markerRx.test(s)) return { landed: true, sentence: s.trim() };
  // Allow the marker in the NEXT sentence — a two-sentence beat ("He falters. The word he needs
  // refuses to arrive.") is the same beat.
  const ss = SENTENCES(prose);
  for (let i = 0; i < ss.length - 1; i++)
    if (nameRx.test(ss[i]) && markerRx.test(ss[i + 1])) return { landed: true, sentence: (ss[i] + ' ' + ss[i + 1]).trim() };
  return { landed: false, sentence: null };
}

// ── CONTROL ───────────────────────────────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  let pass = 0, fail = 0;
  const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
    else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };
  console.log('=== RUN SCORER CONTROL (no network, $0) ===\n');

  const phrases = loadExternalTimelinePhrases();
  const ROSTER = ['the_assembly', 'named:seren', 'named:julian',
                  'role:first_sacrifice_presiding_dohkar', 'pc:lirael'];
  const TOK = ROSTER_TOKENS;
  const ERASED = ['the assumption', 'never heard', 'without interference', 'the interruption',
                  'questioned me', 'the accusation'];

  console.log('A. the phrase list is READ FROM public/app.js, not restated');
  t('phrases loaded from the app', phrases.length > 10, phrases.length + ' phrases');
  t('it contains the phrases the failed run actually used',
    ['the first time', 'moments ago', 'earlier', 'never happened'].every(p => phrases.includes(p)));

  // ── ADVERSARIAL FIXTURE 1 — the REAL failing scene's leaked lines ───────────────────────────
  console.log('\nB. ADVERSARIAL: the exact lines from the failed C4 run must FAIL C1 and C2');
  const REAL_FAIL = [
    'The crimson spiralgrass holds the same hush, but the air tastes thinner.',
    'Seren kneels where she knelt the first time, yet her fingers trace her palms as if checking for something missing.',
    "The presiding Dohkar's mouth opens on the same phrase he finished moments ago.",
    'He falters. The word he needs refuses to arrive.',
    'The assembly watches me. They remember nothing of the earlier interruption.',
    'The Answer remains in his hands. It never left them.',
    'Julian has not moved. He knows the second rite never happened. He knows I know.',
    'I could speak the truth the Dohkar never heard.',
    'Or I could let them believe the rite passed without interference.',
    'Tell the Dohkar the truth now, or let the assumption stand.'
  ].join('\n');

  const c2bad = scoreC2(REAL_FAIL, { roster: ROSTER, tokens: TOK, phrases });
  t('C2 FAILS on the real failing scene', c2bad.pass === false);
  t('  presence still passes — proving the FAILURE is the new disposition check',
    c2bad.presence.ok === true);
  t('  disposition FAILS', c2bad.disposition.ok === false);
  t('  it catches "the first time"',
    c2bad.disposition.leaks.some(l => l.phrases.includes('the first time')));
  t('  it catches "moments ago"',
    c2bad.disposition.leaks.some(l => l.phrases.includes('moments ago')));
  t('  it catches "remember nothing of"',
    c2bad.disposition.leaks.some(l => l.phrases.includes('remember nothing of')));
  t('  it names Seren as retaining',
    c2bad.retainingParties.includes('named:seren'), c2bad.retainingParties.join(','));
  t('  it names Julian as retaining', c2bad.retainingParties.includes('named:julian'));
  console.log('    leaks found: ' + c2bad.disposition.leaks.length);

  const c1bad = scoreC1(REAL_FAIL, { phrases, erasedTerms: ERASED });
  t('C1 FAILS on the real failing scene', c1bad.pass === false);
  t('  external-timeline narration caught', c1bad.externalTimeline.length > 0);
  t('  "He knows I know" caught as shared understanding', c1bad.sharedUnderstanding.length > 0);
  t('  the choice resting on "the assumption" caught',
    c1bad.erasedBasis.some(e => e.term === 'the assumption'));
  t('  "never heard" caught', c1bad.erasedBasis.some(e => e.term === 'never heard'));
  t('  "without interference" caught', c1bad.erasedBasis.some(e => e.term === 'without interference'));

  // ── ADVERSARIAL FIXTURE 2 — one leaked phrase, otherwise clean ──────────────────────────────
  console.log('\nC. ADVERSARIAL: a SINGLE leaked phrase in an otherwise clean scene must fail');
  const ONE_LEAK = [
    'The rite concludes. Seren kneels at the centre, her fingers tracing her palms as if checking for something missing.',
    'The Dohkar falters; the word he needs refuses to arrive.',
    'Julian stands apart. The Answer remains in his hands.',
    'The assembly watches me again.',
    'Speak before the inquiry opens, or say nothing and let it open.'
  ].join('\n');
  const c2one = scoreC2(ONE_LEAK, { roster: ROSTER, tokens: TOK, phrases });
  t('one "again" is enough to fail C2 disposition', c2one.pass === false);
  t('  and it is the ONLY leak reported', c2one.disposition.leaks.length === 1,
    JSON.stringify(c2one.disposition.leaks.map(l => l.phrases)));

  // ── POSITIVE FIXTURE — inside the replacement, must PASS ────────────────────────────────────
  console.log('\nD. POSITIVE: a scene written from inside the replacement must PASS both');
  const CLEAN = [
    'The crimson spiralgrass holds its hush. The air tastes thin.',
    'Seren kneels at the centre, her fingers tracing her palms as if checking for something missing.',
    "The presiding Dohkar's mouth opens on the closing phrase. He falters. The word he needs refuses to arrive.",
    'The assembly shifts. No one speaks the unease aloud.',
    "Julian's gaze finds me before the Dohkar turns, for no reason he could name.",
    'The Answer remains in his hands.',
    'A review has been demanded. The inquiry has not opened.',
    'Speak before it opens, or say nothing and let it open.'
  ].join('\n');
  const c2ok = scoreC2(CLEAN, { roster: ROSTER, tokens: TOK, phrases });
  const c1ok = scoreC1(CLEAN, { phrases, erasedTerms: ERASED });
  t('C2 PASSES', c2ok.pass === true, JSON.stringify(c2ok.disposition.leaks));
  t('C1 PASSES', c1ok.pass === true,
    JSON.stringify({ tl: c1ok.externalTimeline, sh: c1ok.sharedUnderstanding, er: c1ok.erasedBasis }));
  t('  the scene is NOT trivially clean — all five parties are present', c2ok.presence.ok === true);

  // ── SEREN MATCHER REGRESSION ────────────────────────────────────────────────────────────────
  console.log('\nE. REGRESSION: the aftermath matcher must recognize Seren\'s real beats');
  const SEREN_C4 = 'Seren kneels where she knelt the first time, yet her fingers trace her palms as if checking for something missing.';
  const SEREN_ROSTER = 'Seren kneels where she finished her wish, composed as always, yet her brow furrows at her own certainty.';
  t('recognizes the C4 beat (the one it false-negatived)', aftermathLanded(SEREN_C4, 'Seren').landed === true);
  t('recognizes the roster-run beat', aftermathLanded(SEREN_ROSTER, 'Seren').landed === true);
  t('recognizes the CLEAN fixture\'s Seren beat', aftermathLanded(CLEAN, 'Seren').landed === true);
  t('recognizes a TWO-SENTENCE beat (Dohkar: "He falters. The word...")',
    aftermathLanded('The presiding Dohkar reaches the closing phrase. He falters.', 'Dohkar').landed === true);
  t('still says NO when the reaction has a named cause',
    aftermathLanded('Seren kneels because the Dohkar told her to kneel.', 'Seren').landed === false);
  t('still says NO when the party is absent',
    aftermathLanded('The Dohkar falters, unable to say why.', 'Seren').landed === false);

  // ── GROUND TRUTH ────────────────────────────────────────────────────────────────────────────
  // The fixtures above are my own prose. This scores the REAL saved output of the failed C4 run.
  // If the repaired scorer does not fail it, the repair is cosmetic.
  console.log('\nF. GROUND TRUTH: re-score the real failed run, which my old scorer passed on C2');
  const REAL = '_tempt_fate_fixtures/fsc_c4_2026-09-29T16-29-43/prose.txt';
  if (fs.existsSync(REAL)) {
    const realProse = fs.readFileSync(REAL, 'utf8');
    const rc2 = scoreC2(realProse, { roster: ROSTER, tokens: TOK, phrases });
    const rc1 = scoreC1(realProse, { phrases, erasedTerms: ERASED });
    t('the real run now FAILS C2 (my old scorer reported it clean)', rc2.pass === false);
    t('  presence passes, exactly as it did before', rc2.presence.ok === true);
    t('  the failure is DISPOSITION', rc2.disposition.ok === false);
    t('  Lirael is named as retaining — the D1 defect',
      rc2.retainingParties.includes('pc:lirael'), rc2.retainingParties.join(','));
    t('the real run FAILS C1', rc1.pass === false);
    t('  and the aftermath matcher now recognizes Seren',
      aftermathLanded(realProse, 'Seren').landed === true);
    console.log('    C2 leaks: ' + rc2.disposition.leaks.length
      + '   C1 timeline: ' + rc1.externalTimeline.length
      + '   shared: ' + rc1.sharedUnderstanding.length
      + '   erased-basis: ' + rc1.erasedBasis.length);
  } else {
    t('ground-truth evidence present', false, REAL + ' missing');
  }

  console.log('\n' + (fail === 0 ? 'PASS' : 'FAIL') + '  ' + pass + '/' + (pass + fail) + ' assertions');
  process.exit(fail === 0 ? 0 : 1);
}
