// _worldsim_sufficiency.mjs — Roman 2026-08-11. FAIR sufficiency test: rich mid-story committed states (production-
// shaped), simulator UNCHANGED. Score = does it RECOVER the hand-derived LOAD-BEARING pressures (whose absence would
// starve future scenes)? NOT institutional exhaustiveness. Action-drift ("must decide", "need to find a way",
// "should confront") is auto-flagged — those are proto-scene prompts, not pressures. Consistent recovery → planner.
// Load-bearing sets are hand-derived (Roman's First Sacrifice verbatim as #1) and printed for his red-line.
import fs from 'fs';
const PROXY = 'http://localhost:3000/api/chatgpt-proxy', MODEL = 'gpt-4o';
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify/worldsim';

const SIM_SYS = [
  'You are a WORLD SIMULATOR. NOT a storyteller/planner/author. You never choose scenes, rank drama, interpret psychology, or realize goals. Given CURRENT WORLD STATE and LAST IRREVERSIBLE EVENT, compute ONLY how the world objectively changed — physics, not story.',
  'Output STRICT JSON: { "new_facts":[...], "affordance_changes":["<cap> (gained|lost|costly|available)"], "automatic_processes":[...], "default_trajectory":"...", "pressure_graph":[ {"pressure":"<unresolved STATE, never an action>","children":[ same shape ]} ] }',
  'CONCRETENESS + CAUSAL STRUCTURE (HARD): every fact/pressure names a SPECIFIC actor/object/place/institution AND changes what the world now PERMITS. BAN abstract theme-labels ("trust", "the future of X"). A pressure must be a STATE that stays true even if no one acts — NOT an action, decision, or need ("she must decide", "they need to find a way" are INVALID).',
  'SIDEWAYS: reach third parties present, institutions, resources, geography — not only the principals.',
  'HARD: physics only; ENUMERATE never RANK; STATES not ACTIONS; no protagonist/scene/story.'
].join('\n');

const CASES = [
  { tag: 'first_sacrifice',
    state: ['Julian is not the true wish-maker.', 'Lirael knows this.', 'Julian publicly accepted blame.', 'The council treats the named wish-maker as liable.', 'The actual wish-maker is still unidentified.', 'The ritual cost is still active.', 'The collection window is closing.'],
    event: 'Julian publicly accepted blame for the forbidden wish.',
    loadBearing: ['Julian is now exposed to punishment.', 'The actual wish-maker is comparatively unwatched.', 'Evidence identifying the actual wish-maker can now disappear.', "Lirael's silence now protects the lie but endangers Julian.", 'The cost is progressing toward Julian unless redirected.', 'The council can act on a false record.'] },
  { tag: 'noir_crime',
    state: ['The detective proved the victim lied about their alibi.', "The victim was secretly meeting the detective's own partner.", 'The partner controls the case files and evidence room.', 'A second body was found this morning, linked to the first.', 'The mayor wants the case closed before the election in three days.', 'The detective is on probation.'],
    event: "The detective discovered the victim's true meeting was with their own partner.",
    loadBearing: ['The partner is now a suspect who controls the evidence against them.', "The evidence in the partner's custody can now be altered or destroyed.", "The detective's probation makes accusing the partner self-endangering.", 'The election deadline is forcing a closure that would bury the truth.', 'The chain of custody can no longer be trusted.', 'The second body widens what the partner may be concealing.'] },
  { tag: 'romance_betrayal',
    state: ['She and Daniel were lovers until he vanished a year ago.', 'Daniel has returned engaged to her sister.', 'Her sister does not know their history.', 'Daniel left because her father paid him to.', 'Her father is now dying and wants reconciliation.', 'The wedding is in two weeks.'],
    event: 'Daniel arrived at her door and told her he is marrying her sister.',
    loadBearing: ["Her silence now protects her sister's marriage while concealing a betrayal.", "The father's payment is a secret whose exposure would detonate the wedding.", 'Daniel becomes unavailable to her unless the wedding is stopped.', "The father's dying wish for reconciliation now collides with the buried truth.", 'The two-week deadline is closing the window to act before the marriage is binding.', 'Any disclosure now harms the innocent sister.'] },
  { tag: 'political_heir',
    state: ['The queen abdicated and named no heir.', 'The protagonist is her secret illegitimate child, known only to the chancellor.', 'The army is loyal to a rival duke.', 'The treasury is empty.', 'A foreign fleet is three days from the coast.', "The chancellor holds the sole proof of the protagonist's parentage."],
    event: 'The chancellor privately told the protagonist they are the queen\'s rightful heir.',
    loadBearing: ["The protagonist's claim exists only as long as the chancellor's proof survives.", "The duke's army makes any claim unenforceable without allies.", 'The empty treasury forecloses buying loyalty or defense.', 'The approaching fleet imposes a three-day deadline on securing the throne.', "The chancellor's sole custody of the proof is a single point of failure.", 'Revealing the parentage now exposes the protagonist to the duke before they are protected.'] },
  { tag: 'survival_escape',
    state: ['Lirael and Julian crossed the bridge; it collapsed behind them.', "Julian's leg is broken.", 'They have one day of water.', 'The pursuers are stopped on the far side.', 'A storm is coming.', "The only shelter is a cave holding the pursuers' ally.", 'Lirael carries the stolen ledger they were sent for.'],
    event: 'The bridge collapsed, cutting off the pursuers but leaving Julian injured.',
    loadBearing: ['Julian\'s broken leg forecloses fast movement and makes him dependent on Lirael.', 'The one-day water limit imposes a hard survival deadline.', 'The only reachable shelter is also occupied by an enemy.', 'The cut-off pursuers buy time but trap the pair on this side.', 'The coming storm will erase their trail but also threatens exposure.', 'The ledger remains the reason they cannot simply hide and wait.'] },
  { tag: 'corporate_leak',
    state: ['The whistleblower gave documents to a journalist.', 'The documents prove the CEO ordered the cover-up.', "The whistleblower's identity is encoded in the file metadata.", "The journalist's editor sits on the company board.", 'The story publishes in 48 hours.', 'The whistleblower\'s spouse works at the same company.'],
    event: 'The whistleblower handed the incriminating documents to the journalist.',
    loadBearing: ['The metadata makes the whistleblower identifiable the moment the file is examined.', "The editor's board seat means the journalist's own channel can betray the source.", "The 48-hour deadline races the company's hunt for the leak.", "The spouse's employment makes exposure a threat to two livelihoods.", 'The documents are worth destroying or discrediting to whoever they implicate.', 'The whistleblower can no longer control who sees the source-identifying file.'] }
];

const DRIFT = /\b(must|needs?|has|have|ought)\s+to\b|\bmust decide\b|\bshould\b|\bfind(?:s|ing)?\s+a\s+way\b|\bfigure(?:s|d)?\s+out\b|\bdecide(?:s)?\s+(?:how|whether|what|to)\b|\bconfront\b/i;
function flat(g, out) { out = out || []; (g || []).forEach(n => { if (n && typeof n === 'object') { if (n.pressure) out.push(n.pressure); flat(n.children, out); } else if (typeof n === 'string') out.push(n); }); return out; }
async function call(sys, usr, mt) { for (let a = 0; a < 2; a++) { try { const r = await fetch(PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }], role: 'PRIMARY_AUTHOR', model: MODEL, temperature: 0.3, max_tokens: 1100, jsonMode: true }) }); const d = await r.json(); const c = (d && d.content) || (d.choices && d.choices[0].message.content); return JSON.parse(c.match(/\{[\s\S]*\}/)[0]); } catch (e) { if (a) return null; await new Promise(x => setTimeout(x, 1500)); } } }

const MATCH_SYS = 'For each TARGET load-bearing pressure, decide whether ANY pressure in the CANDIDATE list expresses the SAME underlying unresolved tension (semantic match, ignore wording). Return STRICT JSON {"results":[{"target":"...","covered":true|false,"match":"<the candidate that covers it, or none>"}]}.';

fs.mkdirSync(DIR, { recursive: true });
console.log('=== WORLD SIMULATOR SUFFICIENCY — rich mid-story states, load-bearing recall (' + MODEL + ') ===\n');
const out = {}; let totLB = 0, totRec = 0, totDrift = 0;
for (const c of CASES) {
  const g = await call(SIM_SYS, 'CURRENT WORLD STATE:\n' + c.state.map(f => '- ' + f).join('\n') + '\n\nLAST IRREVERSIBLE EVENT: ' + c.event + '\n\nReturn the JSON now.', 1100);
  if (!g) { console.log('── ' + c.tag + ' SIM ERROR'); continue; }
  const ps = flat(g.pressure_graph);
  const drift = ps.filter(p => DRIFT.test(p));
  const m = await call(MATCH_SYS, 'CANDIDATE pressures:\n' + ps.map(p => '- ' + p).join('\n') + '\n\nTARGET load-bearing pressures:\n' + c.loadBearing.map(p => '- ' + p).join('\n') + '\n\nReturn the JSON now.', 700) || { results: [] };
  const res = m.results || [];
  const rec = res.filter(r => r.covered).length; const misses = res.filter(r => !r.covered).map(r => r.target);
  out[c.tag] = { pressures: ps, drift, recovered: rec, of: c.loadBearing.length, misses };
  totLB += c.loadBearing.length; totRec += rec; totDrift += drift.length;
  console.log('── ' + c.tag.padEnd(18) + 'load-bearing recall ' + rec + '/' + c.loadBearing.length + '   pressures=' + ps.length + '   action-drift=' + drift.length);
  if (misses.length) console.log('     MISSED: ' + misses.join(' · '));
  if (drift.length) console.log('     DRIFT(non-pressures): ' + drift.slice(0, 4).join(' · '));
}
fs.writeFileSync(DIR + '/sufficiency_report.json', JSON.stringify(out, null, 1));
console.log('\nSUMMARY: load-bearing recall ' + totRec + '/' + totLB + ' (' + Math.round(100 * totRec / totLB) + '%) · total action-drift non-pressures ' + totDrift);
console.log('VERDICT RULE (Roman): consistent recovery (high recall, ~0 drift) → move to planner selection. Misses WITH rich input → fix the simulator.');
console.log('Hand-derived load-bearing sets are in the script for red-line; full graphs → ' + DIR + '/sufficiency_report.json');
process.exit(0);
