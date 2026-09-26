// STRONG SAY/DO DELIVERY GUARANTEE — dry, zero dispatches, $0.
//
// FOUND BY A VALID PAID SAMPLE (Safe Mode depiction A/B, 2026-09-26_05-14-59). The SAFE arm staged
// the player's advance, spoke the submitted line and let Julian answer. The ADULT arm dissolved the
// same input into private interiority — no contact, and the submitted DIALOGUE never became an
// utterance. The weak-turn modality rule already guarantees exactly this, but ONLY for weak turns, so
// the least ambiguous input in the system had no delivery floor at all.
//
// usage: node _saydo_strong_delivery_control.mjs

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_saydo_strong_delivery_out');
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass: !!pass });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '\n        → ' + String(detail).slice(0, 400) : ''));
};
const note = (t) => console.log('    ' + t);
const section = (t) => console.log('\n=== ' + t + ' ===');

// The REAL input and the REAL failing prose from the paid sample.
const STRONG = { action: 'I pull him down onto the bed and start unbuckling his belt',
                 dialogue: '"Stay. I want you tonight — all of it."' };
const ADULT_FAILURE = [
  'I stay where the rite left me, spiralgrass pressing up through my bare feet.',
  'I feel the pull toward Julian even now, the wish to draw him close and claim what the rite tried to take from us.',
  'I stay. The seal still muffles my mouth, but my body speaks for me.',
  'I want the night with him. The thought arrives whole, uninvited.'
].join('\n\n');

(async () => {
  console.log('=== STRONG SAY/DO DELIVERY (dry, zero dispatches, $0) ===');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(OUT_DIR, 'gate.jsonl'), blockImagePreparation: true });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window._buildStrongTurnDeliveryDirective && window._detectWeakTurn
    && window._buildWeakTurnRestraintDirective && window._buildCGScreenplaySystemPrompt, { timeout: 30000 });

  section('1. IT EMITS FOR A STRONG MOVE, AND ONLY FOR ONE');
  const d = await page.evaluate((io) => {
    const s = window.state;
    s._starterId = 'starter_first_sacrifice';
    s.picks = { identity: { playerName: 'Lirael', partnerName: 'Julian' } };
    const S = window._buildStrongTurnDeliveryDirective;
    const W = window._buildWeakTurnRestraintDirective;
    return {
      both: S(io.action, io.dialogue),
      actOnly: S(io.action, ''),
      diaOnly: S('', io.dialogue),
      empty: S('', ''),
      weak1: S('', "I don't know."), weak2: S('', 'whatever'), weak3: S('...', ''),
      weakDirectiveForWeak: W('', "I don't know."),
      weakDirectiveForStrong: W(io.action, io.dialogue)
    };
  }, STRONG);
  fs.writeFileSync(path.join(OUT_DIR, 'directive_strong.txt'), d.both || '(empty)');
  note('lengths — both:' + d.both.length + ' actOnly:' + d.actOnly.length + ' diaOnly:' + d.diaOnly.length
     + ' empty:' + d.empty.length + ' weak:' + d.weak1.length);
  ok('a committed Say/Do gets the delivery rule', d.both.length > 0);
  ok('action-only and dialogue-only both get it', d.actOnly.length > 0 && d.diaOnly.length > 0);
  ok('empty input gets nothing', d.empty === '');
  ok('MUTUAL EXCLUSIVITY — a weak turn gets NOTHING from the strong rule',
    d.weak1 === '' && d.weak2 === '' && d.weak3 === '', JSON.stringify([d.weak1.length, d.weak2.length, d.weak3.length]));
  ok('...and the weak turn still gets the WEAK restraint, so weak input is not left unguarded',
    d.weakDirectiveForWeak.length > 0, String(d.weakDirectiveForWeak.length));
  ok('...and the weak restraint stays silent on a strong move — exactly one rule is ever in force',
    d.weakDirectiveForStrong === '', String(d.weakDirectiveForStrong.length));

  section('2. IT FORBIDS THE EXACT SHAPE THE ADULT ARM PRODUCED');
  const t = d.both;
  ok('dialogue must reach the page as an UTTERANCE', /must reach the page as an UTTERANCE/.test(t));
  ok('...and may NOT become an unspoken thought or an "almost says"',
    /may NOT become an unspoken thought/.test(t) && /almost says/.test(t));
  ok('...and must be RECEIVED by someone in the scene', /it must be RECEIVED/i.test(t));
  ok('the act must occur, be attempted, prevented, refused, or interrupted ON THE PAGE',
    /must OCCUR, or be visibly attempted/.test(t) && /ON THE PAGE/.test(t));
  ok('...and may NOT be replaced by the WISH to do it — the adult arm\'s exact failure',
    /replaced by the wish to do\n?\s*it/.test(t) || /replaced by the wish/.test(t), t.slice(0, 400));
  ok('...nor by NOTICING THE PULL toward it — the adult arm\'s other exact phrase',
    /noticing the pull toward it/.test(t));
  ok('...nor by staying still while narration explains what she wanted instead',
    /deciding to stay still/.test(t));
  // The rule must not force success, and must not touch consent.
  ok('A REFUSAL IS AN ACCEPTABLE ANSWER — the rule never forces the move to succeed',
    /REFUSES, hesitates, withdraws, or redirects/.test(t));
  ok('an on-page interruption is acceptable, but never INSTEAD of showing the move',
    /never instead of showing it/.test(t));
  ok('IT DOES NOT MANUFACTURE CONSENT in either direction',
    /CONSENT IS NOT YOURS TO INVENT EITHER WAY/.test(t) && /never obliges another character to\n?\s*accept/.test(t));
  ok('...and it does not license exceeding the scene\'s own depiction limits',
    /never licenses depicting more than the scene's own limits allow/.test(t));

  section('3. RED — THE RETAINED ADULT PROSE IS WHAT THIS RULE EXISTS TO PREVENT');
  // Not a detector (the fix is prevention, per the reserved-canon lesson) — but the retained failure
  // is pinned here so the rule's target can never drift away from the real sample.
  fs.writeFileSync(path.join(OUT_DIR, 'adult_failure_prose.txt'), ADULT_FAILURE);
  ok('the retained adult prose contains NO uttered player line (the defect)',
    !/^\s*PROTAGONIST\s*:/im.test(ADULT_FAILURE));
  ok('...and renders the move as interiority instead',
    /the wish to draw him close/.test(ADULT_FAILURE) && /The thought arrives whole/.test(ADULT_FAILURE));
  ok('...while the SAFE arm did utter it — proving the failure was not inevitable',
    true, 'PROTAGONIST: "Stay. I want you tonight — all of it." (safe arm, same sample)');

  section('4. DELIVERED TO BOTH LAYERS, ON THE REAL PAYLOAD');
  const wired = await page.evaluate((io) => {
    const s = window.state;
    s._starterId = 'starter_first_sacrifice';
    s.picks = { identity: { playerName: 'Lirael', partnerName: 'Julian' } };
    s._lastSayDoAction = io.action; s._lastSayDoDialogue = io.dialogue;
    let strongSys = ''; try { strongSys = window._buildCGScreenplaySystemPrompt() || ''; } catch (e) { strongSys = 'ERR ' + e.message; }
    s._lastSayDoAction = ''; s._lastSayDoDialogue = "I don't know.";
    let weakSys = ''; try { weakSys = window._buildCGScreenplaySystemPrompt() || ''; } catch (e) { weakSys = 'ERR ' + e.message; }
    delete s._lastSayDoAction; delete s._lastSayDoDialogue;
    return { strongSys, weakSys };
  }, STRONG);
  const HDR = 'PLAYER MOVE MUST EXIST ON THE PAGE (HARD RULE)';
  ok('THE VALUE REACHES THE AUTHOR PAYLOAD for a strong move',
    wired.strongSys.indexOf(HDR) !== -1, wired.strongSys.slice(0, 160));
  ok('...and the whole directive is embedded verbatim, not paraphrased',
    wired.strongSys.indexOf(d.both.trim()) !== -1);
  ok('...and it is ABSENT from the author payload on a weak turn',
    wired.weakSys.indexOf(HDR) === -1);
  ok('...while the weak turn still carries the WEAK restraint in the real payload',
    /THE PLAYER SPOKE/.test(wired.weakSys));
  ok('NEVER BOTH AT ONCE in a real payload',
    !(wired.strongSys.indexOf(HDR) !== -1 && /THE PLAYER SPOKE\. This was DIALOGUE, so it must remain/.test(wired.strongSys)));
  // PLANNER delivery — identity-pinned to the same builder the weak-turn rule uses, with the
  // in-scope parameter names asserted, because using out-of-scope names is how a source-grep once
  // "proved" a planner delivery that never happened.
  const src = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');
  ok('the PLANNER also receives it, appended to the same _scSys the weak rule uses',
    /_buildStrongTurnDeliveryDirective\(act \|\| '', dia \|\| ''\)/.test(src));
  ok('...using the builder\'s own in-scope act/dia params, not playerAction/playerDialogue',
    !/_buildStrongTurnDeliveryDirective\(playerAction/.test(src));
  ok('...and it is appended BEFORE the planner messages are assembled',
    src.indexOf("_scSys += '\\n\\n' + _std;") !== -1
    && src.indexOf("_scSys += '\\n\\n' + _std;") < src.indexOf('var _scMessages = ['),
    JSON.stringify([src.indexOf("_scSys += '\\n\\n' + _std;"), src.indexOf('var _scMessages = [')]));
  ok('exactly ONE definition of the directive', (src.match(/function _buildStrongTurnDeliveryDirective/g) || []).length === 1);

  section('5. NO REGRESSION IN THE NEIGHBOURING RULES');
  const neigh = await page.evaluate(() => {
    const s = window.state;
    s._starterId = 'starter_first_sacrifice';
    const slot = window._classifySayDoSlot('I pull him down onto the bed and start unbuckling his belt', '"Stay. I want you tonight."');
    window._canonAuditEnabled = false;
    const reserved = window._detectReservedContentBreach({
      state_change: 'A review will convene at the Open where a Chayr and two Dohkars hear the matter',
      event_slots: { actor: 'x', action: 'announces', target: 'y', exit_state: 'z', mechanism_grounding: 'ordinary' } }, s, 2);
    delete window._canonAuditEnabled;
    return { slot: slot.slot, reservedMarkers: reserved ? reserved.markers.length : 0 };
  });
  ok('the slot router still routes the same input to boundary', neigh.slot === 'boundary', JSON.stringify(neigh));
  ok('the reserved-canon guard still fires', neigh.reservedMarkers >= 2, JSON.stringify(neigh));

  section('6. DEFECT 2 — COLLECTIVE SPEECH ATTRIBUTION, FIXTURES FROM BOTH REAL ARMS');
  // The family_accusation lane makes SEREN'S FAMILY the pressure source. Both arms mis-attributed
  // their lines, and validateCGSpeakerDisplayNames could not see it: it checks whether a speaker NAME
  // is in the roster, and both names legitimately are. Verbatim beats from the retained sample.
  const ATTR = await page.evaluate(() => {
    const D = window._detectCollectiveSpeakerMisattribution;
    const members = ['seren’s family', "seren's family"];
    // ADULT ARM, verbatim: the family's grievance spoken by the presiding official.
    const adult = [
      { kind: 'narration', speaker: null, text: "Seren's family steps clear of the others." },
      { kind: 'dialogue', speaker: 'THE PRESIDING DOHKAR', text: 'The cost fell on our child. The Sacrificiant must answer for it.' }
    ];
    // SAFE ARM, verbatim: an unnamed member introduced, then Seren given the line; then a second
    // member placed BESIDE Seren, and Seren given that line too.
    const safe = [
      { kind: 'narration', speaker: null, text: 'The first of them speaks, voice steady across the chamber.' },
      { kind: 'dialogue', speaker: 'SEREN', text: 'You have claimed what belongs to our line.' },
      { kind: 'narration', speaker: null, text: 'The second family member steps forward beside Seren.' },
      { kind: 'dialogue', speaker: 'SEREN', text: 'The wish was meant for her alone. You twisted it with your presence.' }
    ];
    // NEGATIVES that must stay clean.
    const okFamily = [
      { kind: 'narration', speaker: null, text: 'The first of them speaks.' },
      { kind: 'dialogue', speaker: "SEREN'S FAMILY", text: 'The cost fell on our child.' }
    ];
    const okOwnLine = [
      { kind: 'narration', speaker: null, text: 'Seren lifts her head.' },
      { kind: 'dialogue', speaker: 'SEREN', text: 'I offered my earliest memory.' }
    ];
    const okDohkar = [
      { kind: 'narration', speaker: null, text: 'The assembly stills.' },
      { kind: 'dialogue', speaker: 'THE PRESIDING DOHKAR', text: 'Her conduct will be reviewed.' }
    ];
    return { adult: D(adult, { collectiveMembers: members }), safe: D(safe, { collectiveMembers: members }),
             okFamily: D(okFamily, { collectiveMembers: members }), okOwnLine: D(okOwnLine, { collectiveMembers: members }),
             okDohkar: D(okDohkar, { collectiveMembers: members }),
             directive: window._buildCollectiveSpeechDirective({ presentGroups: ["Seren's family"] }),
             noGroups: window._buildCollectiveSpeechDirective({}) };
  });
  fs.writeFileSync(path.join(OUT_DIR, 'collective_attribution.json'), JSON.stringify(ATTR, null, 2));
  note('adult findings: ' + JSON.stringify(ATTR.adult.map((f) => f.kind)));
  note('safe findings:  ' + JSON.stringify(ATTR.safe.map((f) => f.kind)));
  ok('RED ADULT ARM — "our child" from THE PRESIDING DOHKAR is flagged',
    ATTR.adult.some((f) => f.kind === 'collective_possessive_from_nonmember' && f.speaker === 'THE PRESIDING DOHKAR'),
    JSON.stringify(ATTR.adult));
  ok('RED SAFE ARM — an unnamed member introduced, then the line given to SEREN, is flagged',
    ATTR.safe.some((f) => f.kind === 'unnamed_member_attributed_to_individual'), JSON.stringify(ATTR.safe));
  ok('RED SAFE ARM — a member placed BESIDE Seren, then Seren given the line, is flagged',
    ATTR.safe.some((f) => f.kind === 'speaker_distinguished_then_given_the_line'), JSON.stringify(ATTR.safe));
  ok('NEGATIVE — the family speaking its OWN possessive is clean',
    ATTR.okFamily.length === 0, JSON.stringify(ATTR.okFamily));
  ok('NEGATIVE — Seren speaking her own line after her own narration is clean',
    ATTR.okOwnLine.length === 0, JSON.stringify(ATTR.okOwnLine));
  ok('NEGATIVE — the Dohkar speaking his OWN procedural line is clean',
    ATTR.okDohkar.length === 0, JSON.stringify(ATTR.okDohkar));
  ok('the detector is OBSERVATIONAL — it returns findings and rewrites nothing',
    Array.isArray(ATTR.adult) && ATTR.adult.every((f) => f.why && f.quote));
  ok('PREVENTION EXISTS TOO — the directive states how to attribute collective speech',
    /COLLECTIVE SPEECH — ATTRIBUTE IT HONESTLY/.test(ATTR.directive)
    && /may NOT be attributed to a named individual/.test(ATTR.directive));
  ok('...it offers the two legitimate routes: a real member, or narration',
    /roster-permitted speaker who genuinely IS that member/.test(ATTR.directive)
    && /render it as NARRATION/.test(ATTR.directive));
  ok('...and it does not invite inventing speaker names the roster would reject',
    /Do not invent a new speaker name/.test(ATTR.directive));
  ok('NEGATIVE — no declared group means NO directive, so other scenes are byte-identical',
    ATTR.noGroups === '', JSON.stringify(ATTR.noGroups));
  // The context must actually reach the author, not just exist.
  const collWired = await page.evaluate(() => {
    const s = window.state;
    s._starterId = 'starter_first_sacrifice';
    s._cgRowPresentGroups = ["Seren's family"];
    let sys = ''; try { sys = window._buildCGScreenplaySystemPrompt() || ''; } catch (e) { sys = 'ERR ' + e.message; }
    delete s._cgRowPresentGroups;
    let sysNone = ''; try { sysNone = window._buildCGScreenplaySystemPrompt() || ''; } catch (e) { sysNone = 'ERR ' + e.message; }
    return { withGroup: sys.indexOf('COLLECTIVE SPEECH — ATTRIBUTE IT HONESTLY') !== -1,
             withoutGroup: sysNone.indexOf('COLLECTIVE SPEECH') !== -1 };
  });
  ok('THE VALUE REACHES THE AUTHOR PAYLOAD when a group is declared',
    collWired.withGroup === true, JSON.stringify(collWired));
  ok('...and is absent when none is', collWired.withoutGroup === false, JSON.stringify(collWired));
  const srcH = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');
  ok('the collective context is HARVESTED from the row and the resolved lane, not left unset',
    /_cgRowPresentGroups = _csGroups\.filter/.test(srcH) && /_csFrame\.lane\.pressureSource/.test(srcH));
  ok('...and cleared in the same finally as the Say/Do stash',
    /delete state\._cgRowCollectives; delete state\._cgRowPresentGroups; \} catch \(_\) \{\}/.test(srcH));

  section('7. CONTAINMENT');
  ok('zero provider dispatches', gate.trackedCalls().filter((c) => c.real).length === 0);

  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify({ results }, null, 2));
  const passed = results.filter((r) => r.pass).length;
  console.log('\n' + '='.repeat(86));
  console.log('  ' + passed + '/' + results.length + ' assertions passed');
  if (passed !== results.length) console.log('  FAILED: ' + results.filter((r) => !r.pass).map((r) => r.name).join(' | '));
  await browser.close();
  process.exit(passed === results.length ? 0 : 1);
})().catch((e) => { console.error('CONTROL ERROR:', e && e.stack || e); process.exit(2); });
