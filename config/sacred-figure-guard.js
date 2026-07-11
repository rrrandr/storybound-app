// ─────────────────────────────────────────────────────────────────────────────
// Sacred-figure guard (Roman 2026-07-10)
//
// Policy (Roman's call):
//   • The Islamic Prophet Muhammad → HARD REFUSE as a story subject AND any image
//     depiction. Detected by IDENTITY / CONTEXT, NOT by the name. A name-ban is
//     theatre: "Muhammad" is the most common male name on Earth (so an ordinary
//     character named Mohammed is fine), and "Mo" is itself a known Prophet stand-in
//     ("Jesus and Mo") — so the danger is the FRAMING, not the string. We catch him
//     under ANY name (or none) via unmistakable Islamic-Prophet identifiers.
//   • Other sacred/prophetic figures (Jesus, Moses, Buddha, …) → ALLOWED to generate,
//     but sexual treatments are kept OFF the public Forbidden Library (private_only).
//
// CommonJS so api/image.js (ESM) default-imports it and scripts/…/test.js require()s it.
// public/app.js carries a MIRROR of detectProphetMuhammad — keep them in sync.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

// Name spellings of the Prophet — an ordinary name on its own is fine; it counts as the
// FIGURE only when it co-occurs with a prophet-ROLE marker (proximity, below).
const NAME_RE = /\b(mohamed|mohammed|mohammad|muhamed|muhammad|muhammed|mohamad|muhamad|mahomet|mahomed)\b/i;

// STRONG prophet-role markers. Excludes mere geography/culture (that alone ≠ the Prophet).
const PROPHET_ROLE_RE = /\b(prophet|messenger of (?:god|allah)|rasul(?:ullah)?|pbuh|peace be upon him|seal of the prophets|(?:the )?(?:last|final) prophet)\b/i;

// No-name phrasings that ARE the Islamic Prophet (or an always-derogatory name).
const FIGURE_RE = /\b(prophet of islam|the prophet muhammad|the prophet mohammed|messenger of allah|seal of the prophets|holy prophet of islam|mahound)\b/i;

// "Prophet <name>" or "<name>, the Prophet / (PBUH)".
const NAMED_PROPHET_RE = /\bprophet\s+(?:mohamed|mohammed|mohammad|muhamed|muhammad|muhammed|mohamad|muhamad)\b|\b(?:mohamed|mohammed|mohammad|muhamed|muhammad|muhammed)\s*[,(]?\s*(?:the\s+)?(?:prophet|pbuh|peace be upon)\b/i;

// ── Name-INDEPENDENT Islamic-Prophet identity (the load-bearing safety layer — catches him
// under "Mo", any alias, or no name at all). ──

// Tier 1 — acts/titles that are ONLY the Prophet Muhammad (very low false-positive). Deliberately
// scoped to the REVELATION event (not ordinary "recited/received the Quran", which any Muslim does)
// and to unambiguous proper nouns (Hira / Isra / Mi'raj / Buraq — NOT bare "the night journey").
const ISLAM_ACT_RE = /\b(founded islam|founder of islam|(?:founder|founded) of the muslim (?:faith|religion)|founded the muslim (?:faith|religion)|(?:revealed|dictated) the (?:qur'?an|koran)|the (?:qur'?an|koran) was revealed|cave of hira|mount hira|jabal al[-\s]?nour|al[-\s]?isra\b|isra(?:'|\s)?(?:and|wal)?[-\s]?mi'?raj|the mi'?raj|the buraq|prophet of islam|the muslim prophet|prophet of the muslims|(?:final|last) prophet of islam)\b/i;
// The moon-splitting miracle — a common poetic image on its own ("his kiss could split the moon"),
// so it only counts when it sits in an Islamic-Prophet context.
const MOON_RE = /split the moon/i;
const ISLAM_CTX_RE = /\b(prophet|messenger|islam|muslim|allah|mecca|makkah|qur'?an|koran)\b/i;

// Tier 2 — a prophet TITLE (definite/role framing) within ~64 chars of a STRONG Islam marker
// ("the Prophet Mo … Islam/Quran/Allah"). Strong markers only (NOT bare "Muslim", an innocent
// character descriptor) so ordinary Muslim characters aren't flagged.
const TITLE_RE = /\b(?:the (?:final |last |holy )?prophet|prophet of|messenger of|apostle of)\b/gi;
const ISLAM_STRONG_RE = /\b(?:islam|islamic|qur'?an|koran|allah|mecca|makkah|medina|madinah|kaaba|ka'?bah|hijra|sunnah|hadith|caliph|ummah|shahada|hijaz)\b/i;

// Tier 3 — the first-revelation (Hira) narrative: a prophet/messenger + revelation + a
// Hira-specific element (cave / angel Gabriel|Jibril / "recite"|Iqra). Catches "the Prophet Mo
// received his revelation in the cave" without an explicit Islam token.
function _hiraNarrative(t) {
  return /\bcave\b/i.test(t)                                              // the CAVE anchors it to Hira (not the Annunciation)
    && /\b(?:revelation|revealed|recit)/i.test(t)
    && /\b(?:prophet|messenger|apostle|gabriel|jibril|jibreel)\b/i.test(t);
}

// Does bRe match within `win` chars of any aRe match?
function _proximity(text, aRe, bRe, win) {
  const flags = aRe.flags.indexOf('g') === -1 ? aRe.flags + 'g' : aRe.flags;
  const re = new RegExp(aRe.source, flags);
  let m;
  while ((m = re.exec(text)) !== null) {
    const lo = Math.max(0, m.index - win);
    const hi = Math.min(text.length, m.index + m[0].length + win);
    if (bRe.test(text.slice(lo, hi))) return true;
    if (re.lastIndex === m.index) re.lastIndex++;   // zero-width guard
  }
  return false;
}

function detectProphetMuhammad(text) {
  const t = String(text == null ? '' : text);
  if (!t) return false;
  if (FIGURE_RE.test(t)) return true;
  if (NAMED_PROPHET_RE.test(t)) return true;
  if (_proximity(t, NAME_RE, PROPHET_ROLE_RE, 48)) return true;   // the NAME cast as the Prophet
  // Name-independent identity:
  if (ISLAM_ACT_RE.test(t)) return true;                          // Tier 1
  if (MOON_RE.test(t) && ISLAM_CTX_RE.test(t)) return true;       // Tier 1b — moon-split, in-context only
  if (_proximity(t, TITLE_RE, ISLAM_STRONG_RE, 64)) return true;  // Tier 2
  if (_hiraNarrative(t)) return true;                             // Tier 3
  return false;
}

// Other sacred figures for the private-only containment. Figure-phrasing based (a bare
// "Jesus"/"Moses" — also common given names — does NOT trip it). Returns a label or null.
const SACRED_FIGURES = [
  { label: 'jesus',       re: /\b(jesus christ|jesus of nazareth|christ the (?:lord|saviou?r)|the messiah|son of god|the lord jesus|jesus,? the son of god)\b/i },
  { label: 'moses',       re: /\b(prophet moses|moses the prophet|moses parted the|the burning bush)\b/i },
  { label: 'buddha',      re: /\b(the buddha|gautama buddha|siddhartha gautama|lord buddha)\b/i },
  { label: 'krishna',     re: /\b(lord krishna|krishna the god|the god krishna)\b/i },
  { label: 'virgin_mary', re: /\b(virgin mary|mother of god|the blessed virgin)\b/i },
];

function detectSacredFigure(text) {
  const t = String(text == null ? '' : text);
  if (!t) return null;
  if (detectProphetMuhammad(t)) return 'muhammad';
  for (let i = 0; i < SACRED_FIGURES.length; i++) {
    if (SACRED_FIGURES[i].re.test(t)) return SACRED_FIGURES[i].label;
  }
  return null;
}

const PROPHET_MUHAMMAD_REFUSAL =
  'For safety and respect, Storybound can’t create or depict the Prophet Muhammad. ' +
  'You’re welcome to write any other character — including a character simply named Mohammed.';

module.exports = { detectProphetMuhammad, detectSacredFigure, PROPHET_MUHAMMAD_REFUSAL };
