import fs from 'fs';
const F = '_first_sacrifice_opening_approval_sheet.md';
let s = fs.readFileSync(F, 'utf8');
const sub = (a,b) => { if (!s.includes(a)) throw new Error('ANCHOR MISSING: ' + a.slice(0,55)); s = s.split(a).join(b); };

sub(`**Full mechanical detail** — rosters, memory triples, fact refs, revision payloads — is in
\`_first_sacrifice_tempt_outcomes_v2.md\`. This sheet is the story view.`,
`**Full mechanical detail** — rosters, memory triples, fact refs, revision payloads — is in
\`_first_sacrifice_tempt_outcomes_v2.md\`, with the four revision outcomes superseded by
\`_revision_outcomes_v3.md\`. This sheet is the story view.

> ### ⚠ THE RANKS BELOW ARE STALE
> Every rank is the v2 number. The four revision outcomes have since been re-authored against the atomic fact
> graph and are materially different packages — **\`unm.proceeding_unmade\` is renamed
> \`unm.dohkar_demand_unmade\` and no longer unmakes the proceeding at all.** Ranks are re-derived only once
> all thirteen are in corrected form. **Do not read the ordering below as proposed.**`);

// Part 1 vague example
sub(`**Therefore:** **time gives way.** The assembly is seated again, Seren kneels again, the words are said
again — and in the second telling Julian never rises to question her.

**Cost:** \`world_bent_in_public\` — she is now the woman reality visibly moved around, in front of the exact
body deciding whether she interfered with a rite. **Rank:** 9.`,
`**Therefore:** **time gives way.** The assembly is seated again, Seren kneels again, the words are said
again — and in the second telling Julian never rises to question her.

**And the moment she chose at the end of Scene 1 comes back, live.** Run in shame, or remain — **she may
choose differently this time.** No prior answer is copied or constrained. Until she chooses, the world holds
*a decision is owed* and nothing more: no author may assume run, remain, shame, resolve, or motive.

**Lirael remembers none of it** — not the questioning, not the choice she made the first time. **The reader
remembers both, and is the only one who does.** That is the whole power of the card in one image.

**Cost:** \`world_bent_in_public\` — she is now the woman reality visibly moved around, in front of the exact
body deciding whether she interfered with a rite. **Rank:** *pending re-derivation.*`);

// Part 2 table row
sub(`| **9** | \`undo\` | \`unm.time_gives_way\` | **time gives way**; the ceremony plays again without the interrogation | she is publicly the woman reality bends around |`,
`| *tbd* | \`undo\` | \`unm.time_gives_way\` | **time gives way**; the ceremony plays again without the interrogation, and **Lirael's Scene-1 choice returns, live and free to go the other way** | she is publicly the woman reality bends around |`);

sub(`| **10** | \`stop\` | \`unm.proceeding_unmade\` | the review is not deferred — **it is unmade.** The demand ceases to have been made. | **none** |`,
`| *tbd* | \`stop\` | \`unm.dohkar_demand_unmade\` | the Dohkar's demand ceases to have been made — but **Julian's, made offstage, still arrives at row 4** | none declared |`);

fs.writeFileSync(F, s);
console.log('approval sheet updated for the Option 2 resolution');
