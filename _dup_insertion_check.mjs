#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════════════════════════
// THE COPIED-ADJACENT-SOURCE CHECK, against the SAVED PAID REPLY. No dispatch, no cost.
//
// The input is the real Grok craft reply whose P29 insertion copied the sentence following its
// anchor. Everything here runs the production validator and splice; the controls below are the
// cases the check must NOT fire on.
// ══════════════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'; import vm from 'node:vm';
const ROOT = '/Users/romantsukerman/storybound-app';
vm.runInThisContext(fs.readFileSync(ROOT + '/public/essential-beat-check.js', 'utf8'));
const E = globalThis.EssentialBeatCheck;

const RUN = ROOT + '/_ab_writing_out/four_matched_run_2026-11-06T08-45-51-691Z';
const SCENE = fs.readFileSync(RUN + '/SCENE_original.txt', 'utf8');
const SAVED = fs.readFileSync(RUN + '/4_grok_craft_reply_raw.txt', 'utf8');
const paras = E.paragraphsOf(SCENE).filter((p) => p.isProse);
const contRefs = paras.slice(21).map((p) => p.ref);
const scope = E.cpEditorScope(paras, [], contRefs);
const ids = ['cplus:roman_tusk', 'cplus:mara'];
const ctx = { scope, ids, reader: SCENE, groundingIds: [], claimIds: ids,
  groundingCorpus: {}, historyComplete: false, enrichment: true };

let pass = 0; const fails = [];
const ok = (c, l, x) => { if (c) { pass++; console.log('  PASS  ' + l); }
  else { fails.push(l); console.log('  FAIL  ' + l + (x ? '\n        ' + x : '')); } };
const P29 = paras.find((p) => p.ref === 'P29').text;
const DUP = 'He groaned my name into my neck, one hand sliding between us to circle my clit with slick fingers.';

console.log('════ 1 · THE SAVED PAID REPLY, UNCHANGED ════════════════════════════════════════');
const v = E.validateSceneEditorReply(SAVED, ctx);
console.log('  accepted : ' + JSON.stringify(v.items.map((i) => i.ref + ':' + i.op)));
console.log('  rejected : ' + JSON.stringify(v.rejected.map((r) => ({ tag: r.tag, code: r.code }))));
ok(v.rejected.some((r) => r.tag === 'P29:insert_at_anchor' && r.code === 'insertion_copies_adjacent_source'),
  'the P29 insertion is rejected as copied adjacent source',
  JSON.stringify(v.rejected));
const rej = v.rejected.find((r) => r.code === 'insertion_copies_adjacent_source');
ok(rej && rej.copiedCount === 1 && String(rej.copied[0]).indexOf('groaned my name') !== -1,
  'the rejection names the copied sentence', rej && JSON.stringify(rej.copied));
ok(v.items.length === 1 && v.items[0].ref === 'P27',
  'the OTHER independently valid edit (P27) still applies', JSON.stringify(v.items));

const spl = E.spliceAuthorized(SCENE, paras, v.items);
const after = spl.text;
ok(E.unaffectedBytesPreserved(SCENE, after, spl.applied).ok, 'the byte check passes');
ok(after.split(DUP).length - 1 === 1, 'the sentence appears ONCE in the finished scene — not twice',
  'count=' + (after.split(DUP).length - 1));
ok(after.indexOf('The door he used to close between us stayed open') !== -1,
  'Grok\'s P27 addition is still published');
ok(after.indexOf('I had crossed the line I had named for years') === -1,
  'and the refused P29 addition is NOT published — the paragraph is retained as written');
ok(after.split(/\n\n+/).filter((x) => x.trim()).length === 30, 'still 30 paragraphs');
ok(after.indexOf(P29.replace(/\s+/g, ' ')) !== -1 || after.indexOf(P29) !== -1,
  'P29 is byte-identical to the source');

console.log('');
console.log('════ 2 · CONTROLS — the check must NOT fire on these ════════════════════════════');
const mk = (ref, anchor, text) => JSON.stringify({
  decisions: [{ id: 'cplus:roman_tusk', decision: 'edit', ref,
    perception: { passage: text.slice(0, 40), why: 'x' } }],
  edits: [{ ref, op: 'insert_at_anchor', anchor, text, forObligations: ['cplus:roman_tusk'] }] });
const run = (ref, anchor, text) => E.validateSceneEditorReply(mk(ref, anchor, text), ctx);
const fired = (r) => r.rejected.some((x) => x.code === 'insertion_copies_adjacent_source');

// C1 — an ordinary addition that repeats WORDS present nearby. Words are not the unit.
const c1 = run('P29', 'I dug my fingers into his shoulders, the scar on my thumb catching on his skin.',
  'My name in his neck was the only sound I wanted from him.');
ok(c1.items.length === 1 && !fired(c1),
  'C1: an addition reusing nearby WORDS ("name", "neck") is accepted',
  JSON.stringify(c1.rejected));

// C2 — the model's OWN rhythmic repetition: a full sentence written twice, in neither source span.
const c2 = run('P29', 'I dug my fingers into his shoulders, the scar on my thumb catching on his skin.',
  'I was not turning around. I was not turning around.');
ok(c2.items.length === 1 && !fired(c2),
  'C2: the model\'s own repeated sentence is accepted — rhythmic repetition is not the defect',
  JSON.stringify(c2.rejected));

// C3 — repeated dialogue. P23 is a line of dialogue; echoing a DIFFERENT line is fine.
const c3 = run('P23', '“Mara,” he said again, voice rougher now. “Tell me if—”',
  '“Tell me,” I said, and meant it as permission rather than a question.');
ok(c3.items.length === 1 && !fired(c3),
  'C3: an addition echoing a short dialogue fragment is accepted', JSON.stringify(c3.rejected));

// C4 — copying the ANCHOR itself back into the payload is also copied adjacent context.
const c4 = run('P29', 'I dug my fingers into his shoulders, the scar on my thumb catching on his skin.',
  'I dug my fingers into his shoulders, the scar on my thumb catching on his skin. '
  + 'The line I had named for years was behind me.');
ok(fired(c4) && c4.items.length === 0,
  'C4: copying the ANCHOR back is caught too', JSON.stringify(c4.rejected));

// C5 — a sentence from a DIFFERENT paragraph is not adjacent context: the check stays local
// and is not a scene-wide de-duplicator. P25's sentence inserted into P29 is accepted.
const c5 = run('P29', 'I dug my fingers into his shoulders, the scar on my thumb catching on his skin.',
  'The silk rode higher.');
ok(!fired(c5), 'C5: a sentence from another paragraph does NOT fire it — the check is local',
  JSON.stringify(c5.rejected));

// C6 — a short fragment under the existing MIN_QUOTE_CHARS floor cannot fire it.
const c6 = run('P27', 'I reached for his belt.', 'He let me. I had wanted exactly this.');
ok(!fired(c6), 'C6: a fragment under the quote floor does not fire it', JSON.stringify(c6.rejected));

console.log('');
console.log('════ 3 · THE PAYLOAD IS NOT REWRITTEN ══════════════════════════════════════════');
ok(v.items.every((i) => i.ref !== 'P29'),
  'the refused insertion is absent from the accepted items — nothing was silently stripped');
ok(!/insertion_copies_adjacent_source/.test(after),
  'and no diagnostic leaked into the prose');

console.log('');
console.log((fails.length ? 'FAIL' : 'PASS') + '  ' + pass + ' checks, ' + fails.length + ' failed');
for (const f of fails) console.log('  FAILED: ' + f);
fs.writeFileSync(ROOT + '/_ab_writing_out/DUP_INSERTION_CHECK.txt',
  'see stdout; ' + pass + ' pass / ' + fails.length + ' fail\n');
process.exit(fails.length ? 1 : 0);
