// REVELATORY FORCED-CHOICE RE-RANK (Roman 2026-07-25) — tests the hypothesis that the blind ties
// disappear under a REVELATORY criterion (does the behaviour reveal WHO the person is) instead of
// "distinctiveness". Re-judges the ALREADY-SAVED paired prose (consumption_paired.json) — NO new
// generations. Forced choice (no tie), grok-fast judge, multiple reps with alternating A/B order to
// cancel position bias. Also re-judges v2-vs-baseline; the v2 prose is actable-not-revelatory, so a
// near-tie here would confirm v2 needs the v3 selector upgrade to actually clear the revelatory bar.
const fs = require('fs');
const IN = process.env.IN || '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/consumption_paired.json';
const REPS = parseInt(process.env.REPS || '4', 10);
const d = JSON.parse(fs.readFileSync(IN, 'utf8'));
const bySeed = {};
d.forEach(r => { bySeed[r.seed] = bySeed[r.seed] || {}; bySeed[r.seed][r.manifestOn ? 'on' : 'off'] = r.prose || ''; });

const REV_SYS = 'You are comparing two Scene-1 openings, each featuring a DIFFERENT protagonist. Judge ONLY the prose. Which protagonist\'s BEHAVIOUR REVEALS MORE about WHO THEY ARE — a stable IDENTITY (a habit, ritual, compulsion, social strategy, worldview) — as opposed to merely showing they are stressed, nervous, or upset? Apply the FIVE-CHARACTER TEST: if five completely different characters (Batman, Elizabeth Bennet, Sherlock Holmes, Walter White, Frodo) could ALL plausibly perform the behaviour, it reveals nothing about identity. Reward the opening whose protagonist does something only THAT kind of person would do. FORCED CHOICE — you MUST pick A or B; ties are NOT allowed. Return ONLY JSON {"winner":"A"|"B","why":"<one short sentence>"}.';

async function judge(user) {
  const r = await fetch('http://localhost:3000/api/proxy', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'system', content: REV_SYS }, { role: 'user', content: user }], role: 'SPECIALIST_RENDERER', preferredModel: 'grok-4-1-fast-non-reasoning', temperature: 0, max_tokens: 200 })
  });
  const j = await r.json();
  let c = (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '';
  c = String(c).replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  try { return JSON.parse(c); } catch (_) { return { raw: c.slice(0, 120) }; }
}

(async () => {
  let onW = 0, offW = 0, bad = 0;
  const perSeed = {};
  for (const sd of Object.keys(bySeed)) {
    const pr = bySeed[sd]; if (!pr.on || !pr.off) { console.error('  ' + sd + ': missing a side, skip'); continue; }
    perSeed[sd] = { on: 0, off: 0 };
    for (let k = 0; k < REPS; k++) {
      const flip = (k % 2 === 0);                       // alternate which condition is "A"
      const A = (flip ? pr.on : pr.off).slice(0, 4000), B = (flip ? pr.off : pr.on).slice(0, 4000);
      const v = await judge('OPENING A:\n' + A + '\n\nOPENING B:\n' + B);
      const w = v && v.winner;
      const real = (w === 'A') ? (flip ? 'on' : 'off') : (w === 'B') ? (flip ? 'off' : 'on') : '?';
      if (real === 'on') { onW++; perSeed[sd].on++; } else if (real === 'off') { offW++; perSeed[sd].off++; } else bad++;
    }
    console.error('  ' + sd.padEnd(20) + ' manifest ' + perSeed[sd].on + ' / baseline ' + perSeed[sd].off + '  (of ' + REPS + ')');
  }
  console.error('\n═══ REVELATORY FORCED-CHOICE (existing v2 prose vs baseline; no tie allowed) ═══');
  console.error('  manifest ' + onW + ' · baseline ' + offW + (bad ? ' · unparsed ' + bad : '') + '  (' + (onW + offW) + ' decisions across ' + Object.keys(perSeed).length + ' seeds × ' + REPS + ' reps)');
  const seedsWonByManifest = Object.keys(perSeed).filter(s => perSeed[s].on > perSeed[s].off).length;
  console.error('  seed-level: manifest won ' + seedsWonByManifest + ' of ' + Object.keys(perSeed).length + ' seeds (majority of reps)');
})().catch(e => { console.error('REVRANK-ERR', e.message); process.exit(1); });
