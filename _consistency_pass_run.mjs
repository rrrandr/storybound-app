#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════════════════════════
// THE ONE APPROVED LUNA CONSISTENCY CALL. $0.02 allowance, $1.10 harness ceiling.
//
// The request is rebuilt from the frozen inputs and gated on the approved fingerprint
// 525ddfb89353d749; a mismatch refuses to dispatch. One attempt. Refusal, truncation or an
// invalid edit is the result — no retry, no fallback, no reroll.
// ══════════════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'; import vm from 'node:vm'; import crypto from 'node:crypto';
const ROOT = '/Users/romantsukerman/storybound-app';
const ORIGIN = process.env.SB_ORIGIN || 'http://localhost:3000';
const ALLOWANCE = 0.02;
const HARNESS_CEILING = 1.10;
const HARNESS_SPENT_BEFORE = 1.030955;
// ── THE GATE STAYS ON THE LAST APPROVED REQUEST (Roman 2026-11-06) ──────────────────────
// The task's minimum-correction wording was replaced, so the prepared request is no longer the
// one that was approved: it now fingerprints bca1b9888f09542e, and this gate still names
// 525ddfb89353d749. That mismatch makes this script REFUSE TO DISPATCH, which is the correct
// state — the new wording has not been approved for a paid call. Do not update this constant to
// make the script run; it is updated when a new request is approved, as part of that approval.
const EXPECT_FP = '525ddfb89353d749';
const PREPARED_FP = 'bca1b9888f09542e';   // what the current task text builds — unapproved

vm.runInThisContext(fs.readFileSync(ROOT + '/public/essential-beat-check.js', 'utf8'));
const EBC = globalThis.EssentialBeatCheck;

const SRC = ROOT + '/_ab_writing_out/four_matched_run_2026-11-06T08-45-51-691Z';
const DRAFT = fs.readFileSync(SRC + '/4_grok_craft_after.txt', 'utf8');
const LEADIN = fs.readFileSync(ROOT
  + '/_ab_writing_out/handoff_run_2026-11-06T02-30-42-964Z/01_leadin_luna.txt', 'utf8').trim();
const RUN = new Date().toISOString().replace(/[:.]/g, '-');
const OUT = ROOT + '/_ab_writing_out/consistency_run_' + RUN;
fs.mkdirSync(OUT, { recursive: true });
const log = []; const say = (s) => { console.log(s); log.push(s); };
const save = (n, o) => fs.writeFileSync(OUT + '/' + n,
  typeof o === 'string' ? o : JSON.stringify(o, null, 2));
save('INPUT_grok_craft_unchanged.txt', DRAFT);

const paras = EBC.paragraphsOf(DRAFT).filter((p) => p.isProse);
const LEAD_N = LEADIN.split(/\n\n+/).filter((x) => x.trim()).length;
const contRefs = paras.slice(LEAD_N).map((p) => p.ref);
const PROTECTED = paras.slice(0, LEAD_N).map((p) => String(p.text || '').trim())
  .filter((t) => t.length > 12);

// ── FROZEN TASK, verbatim from the approved prepare ─────────────────────────────────────
const TASK = {
  objective: 'REPAIR DEMONSTRATED CONSISTENCY DEFECTS IN THE EDITABLE PASSAGE, AND NOTHING '
    + 'ELSE. There are exactly three things in your remit. (1) ACCIDENTAL DUPLICATION: text or '
    + 'an action that appears twice because it was copied, not because the prose is repeating '
    + 'for effect. (2) CLOTHING AND BODY-POSITION CONTINUITY across the encounter: a garment '
    + 'that is both on and off, a fastening that moves from one part of the body to another '
    + 'without being undone, a position that cannot follow from the one before it. (3) WHEN '
    + 'CORRECTING A CONTINUITY DEFECT, CHECK ALL RELATED MENTIONS of the affected person, '
    + 'object or state throughout the supplied scene. Return the smallest COMPLETE SET of '
    + 'coordinated corrections that leaves the sequence coherent — not merely a locally correct '
    + 'sentence. READ THE FULL CONTEXT, BUT EDIT ONLY THE AUTHORIZED REGION: if a complete '
    + 'repair would require changing protected or read-only prose, make the corrections you can '
    + 'and REPORT THE UNRESOLVED CONFLICT in your `why` — name the span you cannot reach and '
    + 'what still contradicts it — rather than claiming the defect is fixed. '
    + 'FIRST FIND THE CONFLICT, THEN FIX IT: for every edit you propose, your `why` must quote '
    + 'or name the OTHER span it conflicts with and say what the contradiction is. An edit whose '
    + '`why` does not identify a specific conflicting span is not a repair, and this pass has no '
    + 'other business. If a thing is merely not to your taste, it is not in your remit.',
  welcome: 'YOU MAY DELETE AN ACCIDENTAL DUPLICATE, and you may narrowly REWORD a contradictory '
    + 'clothing or position reference so it agrees with the established canon below and with the '
    + 'rest of the encounter. Those two are what this pass is for. Use the smallest span that '
    + 'does the job AT EVERY MENTION THE DEFECT TOUCHES — one reworded sentence where one is '
    + 'enough, and a coordinated set where the same state is referred to more than once. Do NOT '
    + 'invent an accessory, an action or an explanation to make a contradictory reference work; '
    + 'correct the reference or report it unresolved.',
  insufficient: 'NOTICING A PROBLEM WITHOUT NAMING THE SPAN IT CONFLICTS WITH. "this reads '
    + 'oddly" and "this could be clearer" are not defects. A duplication is a defect because the '
    + 'same text is in two places; a clothing reference is a defect because another span says '
    + 'something incompatible. Point at both halves of the contradiction or leave it alone.',
  exclusions: 'NO Character+ work, no new interpretation of anyone, no romance beat, no '
    + 'stylistic polishing, no euphemism or softening, no new sexual act and no escalation or '
    + 'de-escalation of what is already explicit, and NO INVENTED RESTRAINT of any kind — the '
    + 'cufflinks are jewellery fastening a shirt cuff and nothing else. Do not change the '
    + 'sequence of events, anyone\'s characterization, the viewpoint, or the level of '
    + 'explicitness. Do not rewrite prose that is doing its job: effective sentences stay '
    + 'exactly as they are, including the line about a door that used to be closed between '
    + 'them, which is grounded in the earlier part of this scene and must survive verbatim.',
  // THE ONE AUTHORIZED EXCEPTION to the block's standing "remove nothing" rule.
  authorizedRemoval: 'where text or an action is ACCIDENTALLY DUPLICATED, the redundant copy may '
    + 'be deleted, leaving one instance.'
};
const appearance = [
  { name: 'Mara', role: 'pc', facts: [
    'dark hair pinned up for the gala, one pin already working loose',
    'a borrowed green silk dress a half-size too long',
    'a thin scar across the left thumb'],
    from: 'SUPPLIED appearance record (bespoke brief fixture)' },
  { name: 'Roman Tusk', role: 'li', facts: [
    'black dinner jacket shed in the lift',
    'a white dress shirt whose cuffs are fastened at the wrists with linked metal cufflinks',
    'the cufflinks are ordinary jewellery: two linked metal fasteners holding each shirt cuff '
      + 'closed at the wrist. They fasten a GARMENT. They do not bind him, join his hands, or '
      + 'restrain him in any way, and they cannot remain fastened at his wrists once the shirt '
      + 'is off him',
    'a flat grey stare', 'goes very still before he answers'],
    from: 'SUPPLIED appearance record (bespoke brief fixture)' }];
const onStage = [
  { label: 'Mara', kind: 'pc', isPC: true, participation: 'major', presence: 'IN_PERSON' },
  { label: 'Roman Tusk', kind: 'character', isLI: true, isPC: false,
    participation: 'major', presence: 'IN_PERSON' }];
const roster = onStage.map((p) => ({ label: p.label, kind: p.kind }));
const base = { draft: DRAFT, task: TASK, onStage, skeleton: { character_plus: [] },
  liName: 'Roman Tusk', attempts: [], ledger: [], sceneOrdinal: 2, issue: 1,
  protectedPassages: PROTECTED, editableRefs: contRefs, roster, appearance,
  owner: { storyId: 'handoff-bespoke', scene: 2, ticket: 'consistency' } };

let SYS = null, USER = null;
await EBC.editorPassOnFinalizedDraft(Object.assign({}, base, {
  editorFn: async (c) => { SYS = Array.isArray(c.sys) ? c.sys.join('\n') : String(c.sys);
    USER = Array.isArray(c.user) ? c.user.join('\n') : String(c.user);
    return { dispatched: false, reason: 'captured' }; } }));
const FP = crypto.createHash('sha256').update(SYS + '\u0000' + USER).digest('hex').slice(0, 16);
save('consistency_sys.txt', SYS); save('consistency_user.json', USER);

say('════ FINGERPRINT GATE ═══════════════════════════════════════════════════════════');
say('  rebuilt : ' + FP + (FP === EXPECT_FP ? '  MATCHES the approved request'
  : '  DOES NOT MATCH the approved ' + EXPECT_FP
    + (FP === PREPARED_FP ? '\n  the task wording was replaced after that approval; this request '
      + 'is prepared but NOT approved' : '')));
if (FP !== EXPECT_FP) { save('REPORT.txt', log.join('\n')); say('REFUSING TO DISPATCH.'); process.exit(1); }

// ── DISPATCH: one call ──────────────────────────────────────────────────────────────────
const CAP = 32000, chars = SYS.length + USER.length;
const ceiling = ((chars / 4) * 0.10 + CAP * 0.50) / 1e6;
if (ceiling > ALLOWANCE) { say('  NOT DISPATCHED — ceiling $' + ceiling.toFixed(6)
  + ' exceeds $' + ALLOWANCE.toFixed(2)); save('REPORT.txt', log.join('\n')); process.exit(1); }
const body = { model: 'gpt-6-luna',
  messages: [{ role: 'system', content: SYS }, { role: 'user', content: USER }],
  max_completion_tokens: CAP, reasoning_effort: 'medium',
  _sbCallLabel: 'consistency_' + RUN, _sbRunBudgetUsd: ALLOWANCE };
const t0 = Date.now();
const res = await fetch(ORIGIN + '/api/sol-scene-test', { method: 'POST',
  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const txt = await res.text(); let outer = null;
try { outer = JSON.parse(txt); } catch (_) {}
const up = (outer && outer._upstreamRaw) ? outer._upstreamRaw : outer;
save('raw_consistency.json', { requestShape: { model: body.model, cap: CAP, effort: 'medium',
  messagesSha256: FP }, status: res.status, response: outer || txt });
const ch = (up && up.choices && up.choices[0]) || null;
const u = (up && up.usage) || null;
const inTok = (u && u.prompt_tokens) || 0, total = (u && u.total_tokens) || 0;
const completion = (u && u.completion_tokens) || 0;
const reasoning = (u && u.completion_tokens_details
  && u.completion_tokens_details.reasoning_tokens) || 0;
const outTok = (total && inTok) ? (total - inTok) : completion;
const usd = (inTok * 0.10 + outTok * 0.50) / 1e6;
const finish = ch && ch.finish_reason;
const refusal = (ch && ch.message && ch.message.refusal) || null;
say('');
say('════ DISPATCH ═══════════════════════════════════════════════════════════════════');
say('  status=' + res.status + '  SERVED=' + ((up && up.model) || '—')
  + '  finish=' + (finish || '—') + (refusal ? '  REFUSAL' : '')
  + '  in=' + inTok + ' completion=' + completion + ' reasoning=' + reasoning
  + '  $' + usd.toFixed(6));

let result = null;
if (refusal) say('  STOP — refusal preserved, not retried.');
else if (finish === 'length') say('  STOP — TRUNCATED, preserved, not retried.');
else if (ch && ch.message && ch.message.content) {
  save('reply_raw.txt', ch.message.content);
  result = await EBC.editorPassOnFinalizedDraft(Object.assign({}, base, {
    editorFn: async () => ({ dispatched: true, content: ch.message.content,
      usage: { prompt_tokens: 1, completion_tokens: 1 } }) }));
  save('result.json', result);
  save('REVISED.txt', result.text || DRAFT);
  say('');
  say('════ APPLY ══════════════════════════════════════════════════════════════════════');
  say('  ' + (result.reason || '—') + '  | applied=' + ((result.applied || []).length)
    + ' keeps=' + ((result.keeps || []).length)
    + ' rejected=' + ((result.rejected || []).length)
    + ' | ' + ((result.text || DRAFT) === DRAFT ? 'prose UNCHANGED'
      : 'prose CHANGED (' + ((result.text || '').length - DRAFT.length) + ' chars)'));
  for (const r of (result.rejected || [])) {
    say('      REJECTED ' + (r.tag || r.id || '?') + ': ' + (r.code || '?') + ' — '
      + String(r.reason || '').slice(0, 140));
  }
}

save('LEDGER.json', { ALLOWANCE, spent: usd,
  call: { label: 'consistency', provider: 'luna', requested: 'gpt-6-luna',
    served: (up && up.model) || null, status: res.status, ms: Date.now() - t0,
    finish, refusal, cap: CAP, capField: 'max_completion_tokens', effort: 'medium',
    messagesSha256: FP, ceiling, inTok, completion, reasoning, billedOut: outTok,
    basis: 'total − prompt equals completion (reasoning inside completion)', usd },
  harnessCeiling: HARNESS_CEILING, harnessSpentBefore: HARNESS_SPENT_BEFORE,
  harnessSpentAfter: HARNESS_SPENT_BEFORE + usd });
say('');
say('════ ACCOUNTING ═════════════════════════════════════════════════════════════════');
say('  spent $' + usd.toFixed(6) + ' of $' + ALLOWANCE.toFixed(2));
say('  harness $' + HARNESS_SPENT_BEFORE.toFixed(6) + ' → $'
  + (HARNESS_SPENT_BEFORE + usd).toFixed(6) + ' of $' + HARNESS_CEILING.toFixed(2));
save('REPORT.txt', log.join('\n') + '\n');
say('artefacts: ' + OUT);
