// REPLAY THE TWO PLANNING LEGS BY EXACT OPERATION, BEFORE ANY RESERVATION (Roman 2026-11-18)
//
// The stub answered them AFTER the reservation and with the paid bodies' own receipts attached,
// so the runner settled $0.013944 for calls that never left the machine. And it matched BY ROLE,
// which cannot tell the two planning legs from the prose author — all three are PRIMARY_AUTHOR —
// so the author was handed the 14,611-byte scaffold reply in 5ms and no prose was written.
//
// These are two new SB_REUSE_* arms, which is the mechanism that already exists for exactly
// this: it claims a call by its DECLARED OPERATION, answers it before the request can leave, and
// records $0 with no hold. Each claims on the prompt, never on the role.
//
//   SB_REUSE_SCENE_PLANNER=<file>   the scene-spine planner, and nothing else
//   SB_REUSE_SCAFFOLD=<file>        the narrative-skeleton request, and nothing else
//
// Both are serve-once: a second call on either operation is a replan and is refused by name.
import fs from 'node:fs';

const F = '/Users/romantsukerman/storybound-app/_nf_literary_playthrough.mjs';
let s = fs.readFileSync(F, 'utf8');
const must = (x, l) => { const n = s.split(x).length - 1; if (n !== 1) { console.error('EXPECTED 1 ' + l + ', found ' + n); process.exit(2); } };

const ANCHOR = `  { env: 'SB_REUSE_AUTHOR',     label: 'SCENE 1 PROSE AUTHOR',
    claims: (t, b) => isScene1OpeningProse(b) },
];`;
must(ANCHOR, 'the reuse-arm table');
s = s.replace(ANCHOR, () => `  { env: 'SB_REUSE_AUTHOR',     label: 'SCENE 1 PROSE AUTHOR',
    claims: (t, b) => isScene1OpeningProse(b) },
  // ── THE TWO CONTINUATION PLANNING LEGS, BY OPERATION ──────────────────────────────────
  // Claimed on what the prompt ASKS FOR. Role cannot be used: the scene planner, the scaffold
  // and the prose author are all PRIMARY_AUTHOR, and a role match handed the author a scaffold
  // reply. These two patterns are the operations' own text and match nothing else in the turn.
  { env: 'SB_REUSE_SCENE_PLANNER', label: 'CONTINUATION SCENE PLANNER',
    claims: (t) => /You are the SCENE-SPINE planner|You are the SCENE planner/.test(String(t || '')) },
  { env: 'SB_REUSE_SCAFFOLD',      label: 'CONTINUATION SCAFFOLD',
    claims: (t) => /You define narrative skeletons for fiction scenes/.test(String(t || ''))
      && /causal_outline/.test(String(t || '')) },
];`);

fs.writeFileSync(F, s);
console.log('two operation-keyed reuse arms added: SB_REUSE_SCENE_PLANNER, SB_REUSE_SCAFFOLD');
console.log('both answer before reservation and record $0, like every other preserved arm');
