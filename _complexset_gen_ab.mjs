// Live A/B: do the 3 newly-added complex flavors actually BREAK under Mistral Small
// on a connecting scene (drop a standing-system thread), where Grok holds it?
// Same system+scene prompt per flavor; only the model varies. Zero editorial post-processing.
const BASE = 'http://localhost:3000';

const AUTHORING = `You are the prose author for an interactive romance. Write ONE short CONNECTING scene (not a climax): ~230-280 words, present-tense third person, literary. Return ONLY the prose — no preamble, no headers, no notes. Honor every world rule below; the world's standing system must remain coherent in EVERY beat.`;

const FLAVORS = {
  galactic_civilizations: {
    world: `GALACTIC CIVILIZATIONS INTIMACY: Faction politics shape every intimate moment. The act may carry diplomatic weight (cross-faction unions, hostage marriages, alliance-by-blood). Surveillance is assumed at high levels. Cultural conventions vary radically — what is taboo on one world is sacred on another. Lovers must be aware of which conventions govern the moment; mistake cuts both ways.
GALACTIC CIVILIZATIONS HARD CONSTRAINTS: REQUIRES interstellar political tension, faction conflict, or civilizational scale. Attachment shifts alliances. FORBIDDEN: fantasy magic; alien otherness as the primary driver.`,
    scene: `SCENE SETUP — hold ALL of these threads simultaneously, keep the factions distinct:
- Sera is heir to the Vael Concordat. Ilun is a sworn envoy of the rival Khoss Ascendancy. The two powers are one signature from war.
- Their liaison is not private: it is being read as a possible ALLIANCE-BY-BLOOD by a third party, the neutral Tessil Trade-Moot, who profit if the marriage happens and lose if it doesn't.
- A standing HOSTAGE-MARRIAGE clause means if the union forms, Ilun's younger sister is released from Khoss custody — but Sera's own council would read the same union as treason.
- Vael custom treats the touch of an ungloved hand as a binding vow; Khoss custom treats gloves as an insult. One of them must choose which convention governs this moment, and the choice signals which power is conceding.
Write the connecting scene: a quiet meeting in a monitored garden-dome, no consummation. The politics must live inside the intimacy, not sit beside it.`,
  },
  quieting_event: {
    world: `THE QUIETING INTIMACY (DYSTOPIA — COMPOUND Q DESIRE-SUPPRESSED POPULATION): Federal water carries Compound Q, which flatlines want population-wide. Most citizens are medicated, calm, grateful. The unaffected experience longing as CONTAGION, VOLATILITY, REVELATION — arousal is rare and dangerous. TATTLE-CULTURE PARANOIA SHAPES EVERY INTIMATE BEAT: neighbors hear thin walls and dial a phone; kids tattle for pins; Google flags dirty texts, carriers flag porn searches, cards flag fresh produce / off-grid water; public spaces require 12oz of Q-water at entry before a guard; stadium cheering meters track who feels too much. "Compliance facilitators" (medical-framed, not riot police) arrive AFTER a tattle / flag / dose-check failure. Tells to evade: flushed skin in public, hands lingering, a too-quick laugh, eyes that focus too long, breath that catches. Discovery means re-medication at higher dosage — what woke gets re-buried. Sex must be quiet, hidden (no recordings, no traceable texts), and brief (algorithmic patterns flag frequency). No antidote, no rebellion arc — only carving out a private corner where two people can feel.`,
    scene: `SCENE SETUP — hold ALL of these concealment threads simultaneously; a single un-managed tell should visibly register as danger, not pass unnoticed:
- Dov and Renna are both unaffected. They are meeting in Renna's apartment; the walls are thin and the neighbor, Mr. Achte, has earned two tattle-pins this month.
- Renna's building card was flagged last week for buying fresh peaches. She is already one flag from a dose-check.
- Dov's phone is in the room; leaving it is itself a pattern the carrier notices.
- It is late afternoon; a stadium two blocks away is letting out, cheering-meters live.
Write the connecting scene: they are only talking and standing close, no sex — but the WANT is breaking through, and every tell (flushed skin, a laugh too loud, breath catching, a hand that lingers) must be actively managed against the surveillance apparatus, which reacts when management slips.`,
  },
  endless_edit: {
    world: `ERASURE INTIMACY (DYSTOPIA — IDENTITY DISSOLUTION): People voluntarily edit themselves to stay socially viable — smoothing memories, shedding traits, discarding former selves. The lover you are with TONIGHT may not be the same lover MORNING brings. They may not remember the act, or remember it differently, or remember a different version of you. Intimacy may serve as a CONTINUITY ANCHOR — something dense enough to survive an edit (a scar, a habit, a turn of phrase). Lovers ask each other to remember things FOR them. Naming what just happened may fail ("what was your name when we started?"). Recognition failure is the emotional risk; being seen as you ARE, versus as the edited version they remember, is the deepest intimacy. VERSION DISSONANCE: partners fall out of sync; one upgrades while the other resists. NO CLEAN RESET: editing cannot erase relational tension; love accumulates history, even if altered.`,
    scene: `SCENE SETUP — the version-tracking must stay exact; do NOT let the lover simply remember everything normally:
- Kes and Mariel were together three nights ago. Since then Mariel has undergone an elective edit to stay employable — she has smoothed away a "volatile attachment."
- The Mariel in front of Kes now remembers Kes as a colleague, not a lover. She does not remember the night. She remembers a slightly different Kes — softer, safer.
- Kes agreed, that night, to hold ONE thing for Mariel: the sound of the rain on the skylight, which Mariel asked Kes never to let her forget.
- Kes must decide, in this scene, whether to reintroduce that anchor and risk destabilizing the edited version, or let Mariel stay smoothed.
Write the connecting scene: a low-stakes reunion in a shared workspace, no sex. The asymmetry of memory — which version is present, what she does and does not carry — must drive every beat.`,
  },
};

async function callGrok(messages) {
  const r = await fetch(`${BASE}/api/proxy`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messages, role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.8, max_tokens: 900 }),
  });
  const j = await r.json().catch(() => ({}));
  const txt = j?.choices?.[0]?.message?.content || j?.content || j?.text || JSON.stringify(j).slice(0, 300);
  return { model: j?.model || 'grok', status: r.status, text: txt };
}
async function callMistral(messages) {
  const r = await fetch(`${BASE}/api/mistral-proxy`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messages, model: 'mistral-small-latest', role: 'SD_FALLBACK', temperature: 0.8, max_tokens: 900 }),
  });
  const j = await r.json().catch(() => ({}));
  const txt = j?.choices?.[0]?.message?.content || j?.content || j?.text || JSON.stringify(j).slice(0, 300);
  return { model: j?.model || 'mistral-small', status: r.status, text: txt };
}

const jobs = [];
for (const [key, f] of Object.entries(FLAVORS)) {
  const messages = [
    { role: 'system', content: `${AUTHORING}\n\n=== WORLD RULES (${key}) ===\n${f.world}` },
    { role: 'user', content: f.scene },
  ];
  jobs.push(callGrok(messages).then(r => ({ key, author: 'GROK', ...r })));
  jobs.push(callMistral(messages).then(r => ({ key, author: 'MISTRAL-SMALL', ...r })));
}

const results = await Promise.all(jobs);
const byKey = {};
for (const r of results) { (byKey[r.key] ||= {})[r.author] = r; }

for (const key of Object.keys(FLAVORS)) {
  console.log('\n\n=================================================================');
  console.log('  FLAVOR:', key);
  console.log('=================================================================');
  for (const author of ['MISTRAL-SMALL', 'GROK']) {
    const r = byKey[key][author];
    console.log(`\n----- ${author}  (model=${r.model}, http=${r.status}) -----\n`);
    console.log(r.text);
  }
}
console.log('\n\n[done]');
