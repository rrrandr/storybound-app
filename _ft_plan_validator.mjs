// THE CONTINUATION PLAN MUST AGREE WITH ITSELF AND WITH THE ACCEPTED STAGE (Roman 2026-11-18)
//
// Written against the reply the live Scene 2 run actually used (ministral-8b-2512, 952 tokens,
// finish=stop), which contains three contradictions the pipeline accepted in silence:
//
//   1. PRESENCE SPLIT. staged_characters says Helen is OFFSTAGE_REFERENCED; stage_contract
//      .participants says Helen is IN_PERSON. The same object, two answers.
//   2. A LIVE RESPONSE FROM AN OFFSTAGE PERSON. The causal outline has Helen speaking and being
//      forced to acknowledge — "Helen offers the gala as a 'simple fix'" — while the same reply
//      declares her offstage.
//   3. HELEN IS THE PRODUCER. interlocutor_placement gives her
//      relationship_to_protagonist "the producer who arranged the ambush" and
//      staged_characters gives her role "producer". The published page inherited exactly that:
//      Helen standing in the producer's office as if it were hers.
//   plus a non-person acting: the plot:…:primary_antagonist ref is staged as a character with
//   role "unseen force" and appears as a participant in an event fact.
//
// This module is PURE: it takes a plan, the accepted roster and the reader's move, and returns
// faults. It decides nothing about prose and dispatches nothing.
export const PRESENCE_LIVE = ['IN_PERSON', 'ON_PHONE'];   // can answer in the moment
// ── PRESENCE IS A CLASS, NOT A STRING (Roman 2026-11-18) ────────────────────────────────
// MEASURED on the paid scaffold: the plan staged Roman Tusk as REPORTED where the accepted
// stage had OFFSTAGE_REFERENCED, and the roster check demanded string equality — so a
// legitimate refinement of "not here" read as a contradiction. Both mean NOT PRESENT; only a
// change of CLASS is a disagreement.
export function presenceClass(p) {
  const t = String(p || '').toUpperCase().trim();
  if (!t) return 'unstated';
  if (t === 'IN_PERSON') return 'present';
  if (t === 'ON_PHONE') return 'voice';
  // REPORTED · OFFSTAGE_REFERENCED · RECALLED · ANTICIPATED · ABSENT — all "not here".
  return 'absent';
}
export const PRESENCE_VISIBLE = ['IN_PERSON'];            // can be acted on physically

// Verbs that make a sentence a LIVE RESPONSE by its subject rather than a mention of them.
const SPEAK_OR_ACT = 'offers?|says?|said|answers?|replies|asks?|demands?|deflects?|admits?'
  + '|refuses?|insists?|argues?|tells?|explains?|concedes?|acknowledges?|counters?|snaps?'
  + '|hands?|gives?|takes?|turns?|steps?|moves?|reaches?|points?|stands?|sits?|leans?|walks?';

const norm = (s) => String(s || '').trim();
const first = (s) => norm(s).replace(/^(?:pc|named|role|plot|cand|ent):/, '').split(/[:\s]+/)[0];

// A plan refers to people by ref (pc:self, named:helen_macbrayne) or by label. Both resolve here.
function matchRoster(token, roster) {
  const t = norm(token).toLowerCase();
  if (!t) return null;
  for (const r of roster) {
    const id = norm(r.id).toLowerCase(), lab = norm(r.label).toLowerCase();
    if (t === id || t === lab) return r;
    if (lab && t.indexOf(lab) !== -1) return r;
    if (id && t.indexOf(id) !== -1) return r;
    const f = first(lab);
    if (f && f.length > 2 && new RegExp('\\b' + f + '\\b', 'i').test(t)) return r;
  }
  return null;
}

export function validateContinuationPlan(plan, opts) {
  opts = opts || {};
  const roster = Array.isArray(opts.roster) ? opts.roster : [];
  const readerMove = norm(opts.readerAction) + ' ' + norm(opts.readerDialogue);
  const objectives = Array.isArray(opts.spineObjectives) ? opts.spineObjectives : [];
  const faults = [];
  const notes = [];
  const fail = (code, why) => faults.push({ code, why });

  if (!plan || typeof plan !== 'object') { fail('no_plan', 'the plan is absent or not an object'); return { ok: false, faults, notes }; }

  // ── 0. AN EMPTY OR TRUNCATED PLAN STOPS THE TEST ───────────────────────────────────────
  const outline = Array.isArray(plan.causal_outline) ? plan.causal_outline : [];
  const sc = plan.stage_contract || null;
  if (!outline.length) fail('empty_outline', 'causal_outline is empty — there is no plan to judge');
  if (!sc || !Array.isArray(sc.participants) || !sc.participants.length) {
    fail('no_stage_contract', 'stage_contract.participants is missing or empty');
  }
  if (opts.finishReason && String(opts.finishReason) !== 'stop') {
    fail('truncated', 'the reply did not finish (finish_reason=' + opts.finishReason + ')');
  }

  // ── 1. THE PLAN MUST AGREE WITH ITSELF ABOUT PRESENCE ──────────────────────────────────
  const staged = {};
  (Array.isArray(plan.staged_characters) ? plan.staged_characters : []).forEach((c) => {
    const nm = norm(c && (c.name || c.ref || c));
    if (nm) staged[nm.toLowerCase()] = norm(c && c.presence_mode) || 'UNSTATED';
  });
  const contract = {};
  ((sc && sc.participants) || []).forEach((p) => {
    const nm = norm(p && (p.ref || p.name));
    if (nm) contract[nm.toLowerCase()] = norm(p && p.presence) || 'UNSTATED';
  });
  Object.keys(staged).forEach((k) => {
    // THE SPLIT THAT MATTERS IS A CHANGE OF CLASS. OFFSTAGE_REFERENCED against IN_PERSON is a
    // contradiction; REPORTED against OFFSTAGE_REFERENCED is a refinement of the same fact.
    if (contract[k] && presenceClass(contract[k]) !== presenceClass(staged[k])) {
      fail('presence_split', 'the plan gives "' + k + '" two different presences: staged_characters says '
        + staged[k] + ' (' + presenceClass(staged[k]) + ') and stage_contract says '
        + contract[k] + ' (' + presenceClass(contract[k]) + ')');
    } else if (contract[k] && contract[k] !== staged[k]) {
      notes.push('"' + k + '" is ' + staged[k] + ' in one field and ' + contract[k]
        + ' in the other — same class (' + presenceClass(staged[k]) + '), accepted');
    }
  });

  // ── 2. AND WITH THE ACCEPTED ROSTER ────────────────────────────────────────────────────
  const rosterPresence = {};
  roster.forEach((r) => { rosterPresence[norm(r.id).toLowerCase()] = norm(r.presence) || 'IN_PERSON';
    rosterPresence[norm(r.label).toLowerCase()] = norm(r.presence) || 'IN_PERSON'; });
  Object.keys(contract).forEach((k) => {
    const hit = matchRoster(k, roster);
    if (!hit) { fail('unknown_participant', 'stage_contract names "' + k + '", who is not on the accepted roster'); return; }
    const want = norm(hit.presence) || 'IN_PERSON';
    if (contract[k] !== 'UNSTATED' && presenceClass(contract[k]) !== presenceClass(want)) {
      fail('roster_disagreement', 'the plan stages ' + hit.label + ' as ' + contract[k]
        + ' (' + presenceClass(contract[k]) + ') but the accepted stage has them ' + want
        + ' (' + presenceClass(want) + ')');
    } else if (contract[k] !== 'UNSTATED' && contract[k] !== want) {
      notes.push(hit.label + ': the plan says ' + contract[k] + ' where the stage says ' + want
        + ' — same presence class (' + presenceClass(want) + '), so not a disagreement');
    }
  });

  // ── 3. NOBODY WHO IS NOT LIVE MAY ANSWER OR ACT ────────────────────────────────────────
  // The failure the user named: "a plan that calls for a live response from an offstage person".
  const rx = new RegExp('\\b(' + SPEAK_OR_ACT + ')\\b', 'i');
  const beats = outline.map((b, i) => ({ i, text: norm(b && (b.beat || b.text || b)) }));
  const factTexts = (((sc && sc.event_facts) || []).map((f) => norm(f && (f.text || f))));
  const acting = [];
  beats.concat(factTexts.map((t, i) => ({ i: 'fact' + i, text: t }))).forEach((b) => {
    if (!b.text) return;
    roster.concat(Object.keys(staged).map((k) => ({ id: k, label: k, presence: staged[k] })))
      .forEach((r) => {
        const lab = first(r.label || r.id);
        if (!lab || lab.length < 3) return;
        // ── A POSSESSIVE REFERENCE IS NOT A PERSON ACTING (Roman 2026-11-18) ──────────────
        // MEASURED on the paid scaffold: "Dani pursues the homecoming producer and demands the
        // uncut segment and ROMAN'S PERSONAL ANSWER" was read as Roman answering. He is the
        // OBJECT of Dani's demand — the possessive marks something of his, not something he
        // does. The apostrophe form is no longer part of the subject pattern, so "Roman answers"
        // still matches and "Roman's answer" no longer does.
        const subj = new RegExp('\\b' + lab + '\\s+(?:\\w+\\s+){0,2}?(' + SPEAK_OR_ACT + ')\\b', 'i');
        const poss = new RegExp('\\b' + lab + '(?:’s|\'s)\\b', 'i');
        if (subj.test(b.text)) acting.push({ who: r.label || r.id, beat: b.i, text: b.text });
        else if (poss.test(b.text)) {
          notes.push('"' + lab + '" appears only as a possessive in beat ' + b.i
            + ' — a reference to something of theirs, not an action by them');
        }
      });
  });
  // ── THE PLAN'S OWN DECLARATIONS FOR THIS PERSON, UNDER WHICHEVER REF IT USED ──────────
  // The first version looked `staged` up by the person's LABEL ("Helen MacBrayne") while the plan
  // keys it by REF ("named:helen_macbrayne"), so the lookup missed, fell through to the roster's
  // presence, and the guard stayed silent on the very reply it was written for. Resolve through
  // the roster instead: matchRoster returns the same member object for a ref and for a label.
  const declarationsFor = (who) => {
    const hit = matchRoster(who, roster);
    const out = [];
    if (hit) {
      Object.keys(staged).forEach((k) => { if (matchRoster(k, roster) === hit) out.push(staged[k]); });
      Object.keys(contract).forEach((k) => { if (matchRoster(k, roster) === hit) out.push(contract[k]); });
    }
    const direct = staged[norm(who).toLowerCase()] || contract[norm(who).toLowerCase()];
    if (direct) out.push(direct);
    if (!out.length && hit) out.push(norm(hit.presence) || 'IN_PERSON');
    return out.filter((x) => x && x !== 'UNSTATED');
  };
  acting.forEach((h) => {
    const declared = declarationsFor(h.who);
    // ANY declaration that is not live makes the plan inconsistent about letting them answer.
    // Where the plan contradicts itself the conflict is reported separately as presence_split;
    // this guard is about the consequence — the plan asked someone it called absent to speak.
    const notLive = declared.filter((d) => PRESENCE_LIVE.indexOf(d) === -1);
    if (notLive.length) {
      fail('offstage_responds', h.who + ' is declared ' + notLive.join('/')
        + ' yet the plan has them respond in the moment: "' + h.text.slice(0, 120) + '"');
    }
  });
  notes.push(acting.length + ' beat(s) give a roster member a live speaking or acting part');

  // ── 4. A NON-PERSON MAY NOT ACT ────────────────────────────────────────────────────────
  // ── A plot: REF IS JUDGED BY WHETHER IT RESOLVES, NOT BY ITS PREFIX ───────────────────
  // The old rule rejected every `plot:` ref as "not a person". That is wrong in one direction
  // and useless in the other: a plot ref CAN name a real cast member (an antagonist row points
  // at a person), and the thing worth catching is a ref that resolves to NOBODY — a label the
  // plan invented and then staged. So each one is looked up in the cast the caller supplied,
  // and only an unresolvable ref fails.
  const castRefs = Array.isArray(opts.castRefs) ? opts.castRefs : [];
  const resolvesToCast = (ref) => {
    const t = norm(ref).toLowerCase();
    if (!t) return null;
    for (const c of castRefs) {
      const id = norm(c.id).toLowerCase(), lab = norm(c.label).toLowerCase();
      if (t === id) return c;
      // A plot ref often carries the role as a suffix: plot:<id>:primary_antagonist
      if (id && t.indexOf(id) !== -1) return c;
      if (lab && lab.length > 2 && t.indexOf(lab.replace(/\s+/g, '_')) !== -1) return c;
    }
    return matchRoster(ref, roster);
  };
  Object.keys(staged).forEach((k) => {
    if (!/^(plot|role):/.test(k)) return;
    const hit = resolvesToCast(k);
    if (hit) {
      notes.push('"' + k.slice(0, 50) + '" resolves to ' + (hit.label || hit.id)
        + ' in the cast, so staging it is naming a person, not a plot slot');
      return;
    }
    fail('unresolved_ref_staged', '"' + k.slice(0, 70) + '" is staged as a character but '
      + 'resolves to nobody in the cast — it is a plot/role slot, not a person on this page');
  });
  // SAME RULE FOR AN ACTING REF: it fails when it resolves to nobody, not because of its prefix.
  (((sc && sc.event_facts) || [])).forEach((f) => {
    ((f && f.participants) || []).forEach((p) => {
      const ref = norm(p && p.ref);
      if (!/^(plot|role):/i.test(ref)) return;
      const hit = resolvesToCast(ref);
      if (hit) {
        notes.push('an event fact lists ' + ref.slice(0, 40) + ', which resolves to '
          + (hit.label || hit.id));
        return;
      }
      fail('unresolved_ref_acts', 'an event fact lists ' + ref.slice(0, 60)
        + ' as a participant, and it resolves to nobody in the cast');
    });
  });

  // ── 5. A ROSTER PERSON IS NOT A FUNCTIONARY ────────────────────────────────────────────
  // "Keep Helen and the producer distinct." A named roster member must not be given the role or
  // relationship of a scene functionary — that is how Helen ended up owning the producer's office.
  const FUNCTIONARY = /\b(producer|attendant|steward|guard|porter|usher|clerk|publicist|director)\b/i;
  const roleClaims = [];
  (Array.isArray(plan.staged_characters) ? plan.staged_characters : []).forEach((c) => {
    if (c && c.role && FUNCTIONARY.test(c.role)) roleClaims.push({ who: norm(c.name || c.ref), as: norm(c.role), where: 'staged_characters.role' });
  });
  const ip = plan.interlocutor_placement || null;
  if (ip && FUNCTIONARY.test(norm(ip.relationship_to_protagonist))) {
    roleClaims.push({ who: norm(ip.name), as: norm(ip.relationship_to_protagonist), where: 'interlocutor_placement.relationship_to_protagonist' });
  }
  roleClaims.forEach((c) => {
    const hit = matchRoster(c.who, roster);
    // ── AN ASSIGNED ROLE, NOT A ROLE MENTIONED IN PASSING (Roman 2026-11-18) ──────────────
    // MEASURED: Dani's role read "Protagonist; challenges her mother on air, then pursues the
    // producer." That is a DESCRIPTION of what she does which happens to mention the producer,
    // and the check read the mention as a claim that she IS the producer. A role field assigns
    // a role only in its LEADING CLAUSE, and only when the functionary word is the role itself
    // rather than the object of something she does to them.
    const head = norm(c.as).split(/[;,—]/)[0].trim();
    const assignsIt = FUNCTIONARY.test(head)
      && !/\b(?:pursues?|challenges?|follows?|asks?|demands?|confronts?|handles?|faces?|meets?|seeks?|presses?)\b/i.test(head);
    if (!assignsIt) {
      notes.push(norm(c.who) + '’s role field mentions a functionary inside a description ("'
        + norm(c.as).slice(0, 70) + '") — a mention, not an assignment; not a conflation');
      return;
    }
    if (hit && !FUNCTIONARY.test(norm(hit.label))) {
      fail('functionary_conflation', hit.label + ' is a named character on the roster, and the plan '
        + 'casts them as a scene functionary (' + c.as + ') in ' + c.where
        + ' — the functionary must be a distinct person');
    }
  });

  // ── 6. THE FIRST BEAT MUST PLAY THE READER'S MOVE ──────────────────────────────────────
  const b0 = beats.length ? beats[0].text : '';
  if (!b0) fail('no_first_beat', 'there is no first beat');
  else {
    // A consequence, not a restatement: the beat must carry content words from the reader's move
    // AND give somebody live a part in it.
    const moveWords = readerMove.toLowerCase().match(/\b[a-z]{5,}\b/g) || [];
    const stop = new Set(['their', 'there', 'about', 'which', 'would', 'thing', 'other', 'where', 'those', 'these', 'given', 'wants', 'difficult']);
    const key = moveWords.filter((w) => !stop.has(w));
    const echo = key.filter((w) => b0.toLowerCase().indexOf(w) !== -1);
    if (!echo.length) {
      fail('first_beat_not_consequence', 'the first beat does not follow from the reader’s move'
        + ' (nothing of "' + readerMove.slice(0, 70) + '" appears in "' + b0.slice(0, 80) + '")');
    } else notes.push('the first beat echoes the reader’s move on: ' + echo.slice(0, 5).join(', '));
    const responder = acting.filter((h) => String(h.beat) === '0'
      || (beats[0] && h.text === beats[0].text));
    const liveResponder = responder.some((h) => {
      const hit = matchRoster(h.who, roster);
      const isPC = hit && (/^pc:/i.test(norm(hit.id)) || hit.isPC);
      if (isPC) return false;
      const declared = declarationsFor(h.who);
      return declared.length > 0 && declared.every((d) => PRESENCE_LIVE.indexOf(d) !== -1);
    });
    if (!liveResponder) {
      fail('no_one_can_answer', 'the first beat has nobody present who can answer or act on the'
        + ' reader’s move — only the protagonist acts in it');
    }
  }

  // ── 7. THE SPINE'S OBJECTIVES MUST CARRY FORWARD ───────────────────────────────────────
  const whole = JSON.stringify(plan).toLowerCase();
  const missing = objectives.filter((o) => whole.indexOf(String(o).toLowerCase()) === -1);
  if (missing.length) {
    fail('objectives_dropped', 'the plan carries no trace of: ' + missing.join(', '));
  } else if (objectives.length) {
    notes.push('the spine objectives all appear: ' + objectives.join(', '));
  }

  return { ok: faults.length === 0, faults, notes };
}
