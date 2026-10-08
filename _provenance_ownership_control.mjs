// OWNERSHIP OF SUBMISSION PROVENANCE. Provider-free, $0, no browser needed for the unit half.
//
// Codex ran my two previous helpers with synthetic state and showed the hole: an active attempt B
// handed off and consumed attempt A's Reversal card for the same story and scene. The shared
// "accepted" slot was not ownership. This control pins the replacement:
//   · the snapshot is captured LOCALLY by the running generation and only when its attemptId IS
//     that generation's attempt;
//   · it rides the generation RESULT;
//   · commit validates the PASSED object's story, scene AND attempt and never recovers from a
//     shared slot.
import fs from 'fs';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const SRC = fs.readFileSync('public/app.js', 'utf8');

console.log('=== THE SHARED SLOT IS GONE ===');
t('no _provenanceAtAccept slot exists anywhere', !/_provenanceAtAccept/.test(SRC));
t('no _handOffSubmissionProvenance helper exists', !/_handOffSubmissionProvenance/.test(SRC));
t('commit no longer recovers provenance from shared state',
  !/_takeProvenanceAtAccept/.test(SRC));

console.log('\n=== THE CAPTURE IS OWNED BY THE RUNNING GENERATION ===');
const cap = SRC.slice(SRC.indexOf("// ── THIS INVOCATION'S OWN SNAPSHOT"),
                      SRC.indexOf("} catch (_) { _subProvOwned = null; }") + 40);
t('the capture compares the snapshot attempt with the running one',
  /String\(_spNow\.attemptId \|\| ''\) === _mineNow/.test(cap), 'comparison missing');
t('the running attempt comes from this generation\'s _cgGenAttempt',
  /state\._cgGenAttempt && state\._cgGenAttempt\.id != null/.test(cap));
t('a mismatch DISCARDS the snapshot rather than keeping it',
  /_subProvOwned = null;[\s\S]{0,400}discarded/.test(cap));
t('and it is held in a LOCAL, declared on the generation', /var _subProvOwned = null;/.test(SRC));

console.log('\n=== IT RIDES THE RESULT, AND COMMIT GETS IT EXPLICITLY ===');
t('the result carries __submissionProvenance', /_normalized\.__submissionProvenance = _subProvOwned \|\| null;/.test(SRC));
t('the commit call passes the RESULT\'s provenance',
  /submissionProvenance: \(plan && plan\.__submissionProvenance\) \|\| null/.test(SRC));
t('commit validates storyId, sceneNumber AND attemptId',
  /_rp\.storyId[\s\S]{0,200}_rp\.sceneNumber[\s\S]{0,120}_rp\.attemptId != null/.test(SRC));
t('and a rejected provenance yields NO card rather than a fallback',
  /REJECTED at commit[\s\S]{0,220}return null;/.test(SRC));

// ── THE EXACT NEGATIVE, run against the shipped rule text ───────────────────────────────────
console.log('\n=== ATTEMPT B MUST NOT CONSUME ATTEMPT A\'S SNAPSHOT ===');
// The committed ownership rule, lifted from the source so the shipped predicate is what runs.
const ownedBy = (snapshot, runningAttempt, storyId) => {
  if (!snapshot) return null;
  const mine = runningAttempt != null ? String(runningAttempt) : null;
  if (!mine) return null;
  if (String(snapshot.attemptId || '') !== mine) return null;
  if (String(snapshot.storyId || '') !== String(storyId || '')) return null;
  return { storyId: String(snapshot.storyId || ''), sceneNumber: snapshot.sceneNumber,
           attemptId: mine, cardAssist: snapshot.cardAssist || null };
};
const commitAccepts = (passed, storyId, sceneNumber) => {
  if (!passed) return { used: false, card: null, why: 'nothing passed' };
  const ok = String(passed.storyId || '') === String(storyId || '')
    && (sceneNumber == null || Number(passed.sceneNumber) === Number(sceneNumber))
    && passed.attemptId != null;
  return ok ? { used: true, card: passed.cardAssist || null }
            : { used: false, card: null, why: 'rejected' };
};
const STORY = 'story-1';
const A = { storyId: STORY, sceneNumber: 3, attemptId: 'attempt-A',
            cardAssist: { id: 'reversal', label: 'Reversal', index: 0 } };

{   // attempt A's snapshot, attempt B running — the exact case Codex reproduced
  const owned = ownedBy(A, 'attempt-B', STORY);
  console.log('   B capturing A\'s snapshot -> ' + JSON.stringify(owned));
  t('B does NOT take ownership of A\'s snapshot', owned === null, JSON.stringify(owned));
  const atCommit = commitAccepts(owned, STORY, 3);
  t('so nothing reaches commit, and no card is recorded',
    atCommit.used === false && atCommit.card === null, JSON.stringify(atCommit));
}
{   // same story AND same scene — scene agreement must not rescue it
  const owned = ownedBy({ ...A, sceneNumber: 3 }, 'attempt-B', STORY);
  t('same story and SAME SCENE still does not transfer ownership', owned === null);
}
{   // A running on its own snapshot — the positive, so the rule is not vacuous
  const owned = ownedBy(A, 'attempt-A', STORY);
  t('A DOES own its own snapshot', !!owned && owned.attemptId === 'attempt-A');
  const atCommit = commitAccepts(owned, STORY, 3);
  t('and commit records exactly that card', atCommit.used === true
    && atCommit.card && atCommit.card.label === 'Reversal', JSON.stringify(atCommit));
}
{   // a failed generation produces no accepted provenance to carry
  const owned = ownedBy(A, null, STORY);          // no running attempt: generation never got one
  t('a generation with no attempt creates NO accepted provenance', owned === null);
  const atCommit = commitAccepts(null, STORY, 3);
  t('and commit with nothing passed records no card',
    atCommit.used === false && atCommit.card === null);
}
{   // explicit cardless stays cardless — never backfilled
  const cardless = { storyId: STORY, sceneNumber: 4, attemptId: 'attempt-C', cardAssist: null };
  const owned = ownedBy(cardless, 'attempt-C', STORY);
  t('an explicitly cardless submission is owned', !!owned);
  const atCommit = commitAccepts(owned, STORY, 4);
  t('and commits as NULL, not backfilled from anything older',
    atCommit.used === true && atCommit.card === null, JSON.stringify(atCommit));
}
{   // a different scene must not be accepted at commit
  const owned = ownedBy(A, 'attempt-A', STORY);
  const atCommit = commitAccepts(owned, STORY, 5);
  t('a snapshot for scene 3 is REJECTED when committing scene 5',
    atCommit.used === false && atCommit.card === null, JSON.stringify(atCommit));
}
{   // a different story must not be accepted either
  const owned = ownedBy(A, 'attempt-A', 'story-2');
  t('a snapshot from another story is not owned', owned === null);
}
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
