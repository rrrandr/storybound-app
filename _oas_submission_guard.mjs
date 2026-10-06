// THE ONE PREDICATE THAT DECIDES WHETHER AN OAS SUBMISSION MAY BE SENT. Provider-free, no network.
//
// Three defects this closes, each previously real:
//   1. the live run sent SAY "Confession…" / DO "Confession…" to the author as the reader's words;
//   2. the first fix accepted EITHER field as usable and then submitted BOTH, so
//      DO "I step back." / SAY "Confession…" passed with a placeholder still in the payload;
//   3. the replay and the live runner had SEPARATE copies of the rule, so one could drift.
//
// The rule: at least one field must be usable, and NO non-empty field may be a placeholder.
// An intentionally EMPTY field stays allowed — the SILENCE archetype's dialogue is a single sound
// or nothing at all, by contract.

// A placeholder is the deck's own card title, with or without a trailing ellipsis — what the deck
// writes into the inputs while the preview batch is still in flight.
// A DEGENERATE value is non-blank but carries no words — the residue of a failed parse. The
// no-preview arm produced DO = "{}" (an unparsed JSON object) alongside a real fallback SAY, and
// the first version of this gate PASSED it, so "{}" would have gone to the author as the reader's
// action. Found by testing the timeout path rather than by reading (Codex 2026-10-06).
export function isDegenerate(value) {
  const v = String(value == null ? '' : value).trim();
  if (!v) return false;                        // empty is empty, not degenerate
  if (/^(\{\s*\}|\[\s*\]|null|undefined|NaN|true|false)$/i.test(v)) return true;
  if (/^[\s\p{P}\p{S}]+$/u.test(v)) return true;   // punctuation or symbols only
  if (!/[\p{L}\p{N}]/u.test(v)) return true;        // no letter or digit anywhere
  return false;
}

export function isPlaceholder(value, optionIds) {
  const v = String(value == null ? '' : value).trim();
  if (!v) return false;                       // empty is not a placeholder; it is empty
  if (isDegenerate(v)) return true;           // "{}", "[]", "null", punctuation-only
  const bare = v.replace(/[….]+$/, '').trim().toLowerCase();
  if (!bare) return true;                     // "…" alone
  const ids = (optionIds || []).map(x => String(x || '').trim().toLowerCase()).filter(Boolean);
  if (ids.indexOf(bare) !== -1) return true;  // exactly a card title
  // a one-or-two-word fragment that trails off is the deck's truncated title, not a suggestion
  if (/[…]\s*$/.test(v) && bare.split(/\s+/).length <= 2) return true;
  return false;
}

export function isUsable(value, optionIds) {
  const v = String(value == null ? '' : value).trim();
  if (!v) return false;
  return !isPlaceholder(v, optionIds);
}

// THE GATE. Returns { ok, reason, fields } — ok only when something real is present and nothing
// placeholder-shaped would be sent.
export function canSubmit(action, dialogue, optionIds) {
  const a = String(action == null ? '' : action).trim();
  const d = String(dialogue == null ? '' : dialogue).trim();
  const fields = {
    action: { text: a, empty: !a, placeholder: isPlaceholder(a, optionIds), usable: isUsable(a, optionIds) },
    dialogue: { text: d, empty: !d, placeholder: isPlaceholder(d, optionIds), usable: isUsable(d, optionIds) }
  };
  if (!a && !d) return { ok: false, reason: 'both fields are empty — nothing to submit', fields };
  // ANY non-empty placeholder blocks the submission, even alongside a valid field.
  const bad = [];
  if (fields.action.placeholder) bad.push('DO=' + JSON.stringify(a.slice(0, 32)));
  if (fields.dialogue.placeholder) bad.push('SAY=' + JSON.stringify(d.slice(0, 32)));
  if (bad.length) {
    return { ok: false, fields,
      reason: 'a non-empty field holds a placeholder or degenerate value (' + bad.join(' ')
        + ') — it would be sent to the author as the reader\'s words' };
  }
  if (!fields.action.usable && !fields.dialogue.usable) {
    return { ok: false, fields, reason: 'no usable suggestion in either field' };
  }
  return { ok: true, fields, reason: 'at least one usable field and no placeholder in either' };
}

// The same rule, as a string that can be evaluated inside the page.
export const IN_PAGE_PREDICATE = `(function (action, dialogue, optionIds) {
  var deg = function (v) {
    var s = String(v == null ? '' : v).trim();
    if (!s) return false;
    if (/^(\\{\\s*\\}|\\[\\s*\\]|null|undefined|NaN|true|false)$/i.test(s)) return true;
    if (/^[\\s\\p{P}\\p{S}]+$/u.test(s)) return true;
    return !/[\\p{L}\\p{N}]/u.test(s);
  };
  var ph = function (v) {
    var s = String(v == null ? '' : v).trim();
    if (!s) return false;
    if (deg(s)) return true;
    var bare = s.replace(/[\\u2026.]+$/, '').trim().toLowerCase();
    if (!bare) return true;
    var ids = (optionIds || []).map(function (x) { return String(x || '').trim().toLowerCase(); });
    if (ids.indexOf(bare) !== -1) return true;
    if (/[\\u2026]\\s*$/.test(s) && bare.split(/\\s+/).length <= 2) return true;
    return false;
  };
  var a = String(action == null ? '' : action).trim();
  var d = String(dialogue == null ? '' : dialogue).trim();
  if (!a && !d) return false;
  if (ph(a) || ph(d)) return false;
  return (!!a && !ph(a)) || (!!d && !ph(d));
})`;
