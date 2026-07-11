// ─────────────────────────────────────────────────────────────────────────────
// Sacred-figure guard (Roman 2026-07-10)
//
// Policy (Roman's call):
//   • The Islamic Prophet Muhammad → HARD REFUSE as a story subject AND any image
//     depiction. Detected as a FIGURE/CONTEXT, NOT by the bare name — "Muhammad /
//     Mohammed / …" is the most common male name on Earth, so an ordinary character
//     named Mohammed is fine; only the Prophet himself is refused.
//   • Other sacred/prophetic figures (Jesus, Moses, Buddha, …) → ALLOWED to generate,
//     but sexual treatments are kept OFF the public Forbidden Library (stamped
//     private_only). That's detectSacredFigure()'s job — lower stakes, so it's
//     figure-phrasing based to avoid flagging a character merely named "Jesús".
//
// CommonJS so api/image.js (ESM) default-imports it and scripts/…/test.js require()s it.
// public/app.js carries a MIRROR of detectProphetMuhammad — keep them in sync.
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

// Name spellings of the Prophet. Ordinary names on their own → must co-occur with a
// prophet-ROLE marker (below) to count as the religious figure.
const NAME_RE = /\b(mohamed|mohammed|mohammad|muhamed|muhammad|muhammed|mohamad|muhamad|mahomet|mahomed)\b/i;

// STRONG prophet-role markers. Deliberately excludes mere geography/culture ("Mecca",
// "Muslim", "Islam") — those don't turn an ordinary Mohammed into the Prophet.
const PROPHET_ROLE_RE = /\b(prophet|messenger of (?:god|allah)|rasul(?:ullah)?|pbuh|peace be upon him|seal of the prophets|(?:the )?(?:last|final) prophet)\b/i;

// Phrasings that ARE the Islamic Prophet with no name needed (or an always-derogatory name).
const FIGURE_RE = /\b(prophet of islam|the prophet muhammad|the prophet mohammed|messenger of allah|seal of the prophets|holy prophet of islam|mahound)\b/i;

// Explicit "Prophet <name>" or "<name>, the Prophet / (PBUH)".
const NAMED_PROPHET_RE = /\bprophet\s+(?:mohamed|mohammed|mohammad|muhamed|muhammad|muhammed|mohamad|muhamad)\b|\b(?:mohamed|mohammed|mohammad|muhamed|muhammad|muhammed)\s*[,(]?\s*(?:the\s+)?(?:prophet|pbuh|peace be upon)\b/i;

// NAME within ~48 chars of a prophet-role marker → the figure, not an ordinary Mohammed.
function _proximityHit(text) {
  const re = new RegExp(NAME_RE.source, 'gi');
  let m;
  while ((m = re.exec(text)) !== null) {
    const lo = Math.max(0, m.index - 48);
    const hi = Math.min(text.length, m.index + m[0].length + 48);
    if (PROPHET_ROLE_RE.test(text.slice(lo, hi))) return true;
  }
  return false;
}

function detectProphetMuhammad(text) {
  const t = String(text == null ? '' : text);
  if (!t) return false;
  if (FIGURE_RE.test(t)) return true;
  if (NAMED_PROPHET_RE.test(t)) return true;
  if (_proximityHit(t)) return true;
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

// BARE-NAME block (Roman 2026-07-10, revised): block the NAME "Muhammad/Mohammed/…" as a
// character name outright — the one name people are murderously sensitive about. Roman's call,
// as a personal-safety measure; the false-positive (a real person named Muhammad can't use it as
// a character name) is accepted. Tuned to the Prophet's name spellings ONLY — Ahmed, Mahmoud,
// Muhannad, and other Muslim names are deliberately NOT matched. Also catches loose misspellings
// ("Mahammad") that a bare spelling-list would miss.
const MUHAMMAD_NAME_RE = /\bm[oua]h?a+m+[aeiou]+d\b/i;

function detectMuhammadName(text) {
  return MUHAMMAD_NAME_RE.test(String(text == null ? '' : text));
}

const PROPHET_MUHAMMAD_REFUSAL =
  'For safety and respect, Storybound can’t create or depict the Prophet Muhammad. ' +
  'You’re welcome to write any other character — including a character simply named Mohammed.';

const MUHAMMAD_NAME_REFUSAL =
  'That name can’t be used for a character in Storybound. Please choose a different name.';

module.exports = { detectProphetMuhammad, detectSacredFigure, detectMuhammadName, PROPHET_MUHAMMAD_REFUSAL, MUHAMMAD_NAME_REFUSAL };
