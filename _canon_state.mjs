// CANON STATE — the proposal lifecycle: proposed → repeated → promoted → compressed.
//
// The repair pass notices things. It does not get to decide what is true. This layer does.
//
// THE GOVERNING RULE: the author does not see everything the system knows. It sees only what
// is safe to write from. A model cannot resist a fact once the fact is in its context, so
// access control — not smarter extraction — is the guardrail. Scene 12 says "he adjusted his
// cuff"; if that reaches the author, every later scene has cuff-adjusting Julian.
//
// THREE TIERS, and the tier decides who may see the belief:
//   observation  seen 1×    the AUTHOR NEVER SEES IT. Held only so a later scene can be
//                           recognised as a repeat. This is the whole anti-cuff mechanism.
//   pattern      seen 2-3×  offered to the author as AVAILABLE — usable, never required.
//   trait        seen 4×+   offered as ESTABLISHED — the character behaves this way.
//
// OBJECTS CLIMB A DIFFERENT LADDER: detail → history → (never meaning). A burned corner is a
// detail; "her father burned it making her birthday cake" is history; "the table represented
// her childhood" is interpretation and is refused. Events promote. Readings do not.
//
// MEMORY DECAYS. An observation nobody repeats is forgotten, or the store becomes an
// archaeological site of abandoned details. Patterns decay slowly. Traits are permanent
// unless contradicted.
//
// CONTRADICTIONS ARE KEPT, NOT RESOLVED. "Dohkar never raises his voice" plus "Dohkar
// screamed" is not an error to arbitrate — the exception is usually the character
// revelation. Both are stored, and the author is shown the rule AND the exception.
//
// usage: node _canon_state.mjs --show
//        node _canon_state.mjs --ingest=_canon_proposals.json
//        node _canon_state.mjs --render=Dohkar,Julian     (what the author would receive)
//        node _canon_state.mjs --consolidate              (belief management, cheap model)
import fs from 'fs';

export const STATE_FILE = '_canon_state.json';
export const tierOf = b => (b.seen.length >= 4 ? 'trait' : b.seen.length >= 2 ? 'pattern' : 'observation');
// Objects do not become more true by recurring; they accumulate history. A mention count
// means nothing for a table, so the ladder is driven by what is known, not how often.
export const stageOf = b => (b.significance && b.significance !== 'unknown' ? 'history' : 'detail');
export const isObject = b => b.type === 'object' || b.type === 'place';

// Scenes unseen before a belief fades. Observations go quickly; patterns are given a long
// leash because a habit shown twice and revisited forty scenes later is still a habit.
const OBS_TTL = 12, PAT_TTL = 40;

export const load = (p = STATE_FILE) => {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return { entities: {}, scenes: [] }; }
};
export const save = (s, p = STATE_FILE) => fs.writeFileSync(p, JSON.stringify(s, null, 1));

// Reinforcement detection. The extractor is shown existing belief ids and asked to declare
// "reinforces" or "contradicts" — an explicit claim beats a guess. The overlap test is only
// a fallback for near-duplicates it proposes without noticing, and it is deliberately
// conservative: a missed merge costs one extra observation, a wrong merge invents a pattern
// that never happened.
const STOP = new Set(('a an the of to in on at and or but for with when while he she they them his her their it '
  + 'is are was were be been as by not no nor do does did done has have had who whom that this these those').split(' '));
// Crude stemming, because the same behaviour gets restated with different inflections and the
// raw forms miss: "when giving orders / he addresses" vs "when he gives an order / he address"
// scored 0.417 against a 0.45 threshold — a clear repeat, filed as a new belief.
const stem = w => w.replace(/(?:ings?|ed|es|s)$/, '').replace(/e$/, '');
const toks = f => new Set(String(f).toLowerCase().replace(/[^a-z\s]/g, ' ')
  .split(/\s+/).filter(w => w.length > 2 && !STOP.has(w)).map(stem));
const overlap = (a, b) => { const i = [...a].filter(x => b.has(x)).length; return i / ((a.size + b.size - i) || 1); };
const MERGE_AT = 0.45;
// A declared reinforcement is trusted, but not blindly: the extractor will sometimes attach a
// genuinely different behaviour to an existing id. Below this the claim is refused and filed
// as its own observation rather than silently absorbing the belief it pointed at.
const DIVERGENT_BELOW = 0.15;

// Interpretation never becomes canon, for people or for things. Events promote; readings do
// not. This is the object ladder's ceiling — history is as far as the system will climb.
const INTERPRETATION = /\b(?:secretly|really feels?|deep down|is afraid|wants to be loved|hides? (?:his|her|their) (?:fear|pain)|represent\w*|symboli[sz]\w*|stands? for|stood for|embodie\w*|is a (?:metaphor|symbol|reminder)|reminder of (?:her|his|their))\b/i;
// Local contradiction fallback: same subject matter, opposite polarity. It catches
// "never raises his voice" against "raises his voice", and MISSES "screamed" — antonyms are
// semantic, not lexical. Semantic contradictions must come from the extractor's declaration.
const NEGATED = /\b(?:never|not|no|refuses?|refused|without|nobody|none|avoids?|won't|cannot)\b/i;

export function ingest(state, candidates, sceneLabel) {
  state.scenes ||= [];
  if (!state.scenes.includes(sceneLabel)) state.scenes.push(sceneLabel);
  const tick = state.scenes.length;
  const events = [];

  for (const c of candidates) {
    const name = String(c.entity || '').trim();
    if (!name || !c.fact) continue;
    const ent = (state.entities[name] ||= { beliefs: [] });
    const t = toks(c.fact);
    const find = id => ent.beliefs.find(b => b.id === id);

    // Interpretation is refused wherever it appears — as a fact or as an object's meaning.
    if (INTERPRETATION.test(c.fact) || INTERPRETATION.test(c.significance || '')) {
      events.push({ action: 'refused', entity: name, fact: c.fact,
        why: 'interpretation, not an event — the system stores what happened, never what it means' });
      continue;
    }

    // CONTRADICTION — stored beside the belief it breaks, never replacing it.
    let against = c.contradicts && find(c.contradicts);
    if (!against) {
      const flip = ent.beliefs.find(b => overlap(toks(b.fact), t) >= MERGE_AT
        && NEGATED.test(b.fact) !== NEGATED.test(c.fact));
      if (flip) against = flip;
    }
    if (against) {
      (against.exceptions ||= []).push({ fact: c.fact, scene: sceneLabel, tick });
      against.lastTick = tick;
      events.push({ action: 'exception', entity: name, id: against.id, fact: c.fact,
        rule: against.fact, n: against.exceptions.length });
      continue;
    }

    let hit = c.reinforces && find(c.reinforces);
    let how = hit ? 'declared' : null;
    if (hit && overlap(toks(hit.fact), t) < DIVERGENT_BELOW) {
      events.push({ action: 'refused', entity: name, id: hit.id, fact: c.fact,
        why: `declared reinforcement of ${hit.id} ("${hit.fact.slice(0, 50)}…") is a different behaviour` });
      hit = null; how = null;
    }
    if (!hit) {
      const near = ent.beliefs.filter(b => b.type === c.type)
        .map(b => ({ b, score: overlap(toks(b.fact), t) }))
        .sort((x, y) => y.score - x.score)[0];
      if (near && near.score >= MERGE_AT) { hit = near.b; how = `overlap ${near.score.toFixed(2)}`; }
    }

    if (hit) {
      const before = tierOf(hit), wasStage = stageOf(hit);
      hit.seen.push({ scene: sceneLabel, as: c.fact, origin: c.origin || 'observed' });
      hit.lastTick = tick;
      // The canonical phrasing NEVER changes on promotion. Letting the newest restatement
      // overwrite it lets a belief drift across scenes into something nobody observed —
      // generalising across observations is consolidation's job, and it reads all of them.
      if (isObject(hit) && c.significance && c.significance !== 'unknown' && hit.significance === 'unknown') {
        hit.significance = c.significance;
        events.push({ action: 'climbed', entity: name, id: hit.id,
          from: wasStage, to: stageOf(hit), fact: c.significance });
      }
      const after = tierOf(hit);
      if (!isObject(hit)) {
        events.push({ action: after !== before ? 'promoted' : 'reinforced', id: hit.id,
          entity: name, fact: hit.fact, from: before, to: after, how });
      }
    } else {
      const id = `${name.toLowerCase().replace(/\W+/g, '')}-${ent.beliefs.length + 1}`;
      // PROVENANCE. "observed" = the story showed it. "repaired" = an editor pass invented it
      // and the extractor then read it back, which is weaker evidence and must not masquerade
      // as the story having done it. "authored" = a human accepted it deliberately.
      const b = { id, type: c.type || 'behaviour', fact: c.fact, lastTick: tick,
        origin: c.origin || 'observed',
        seen: [{ scene: sceneLabel, as: c.fact, origin: c.origin || 'observed' }] };
      // Significance belongs to the object ladder only. The extractor fills the field for
      // every candidate, so a behaviour would otherwise carry a meaningless "unknown".
      if (isObject(b)) b.significance = c.significance || 'unknown';
      if (c.reinforces) b.note = `proposed as a repeat of ${c.reinforces}, refused as unrelated`;
      ent.beliefs.push(b);
      events.push({ action: 'new', id, entity: name, fact: c.fact, origin: b.origin,
        to: isObject(b) ? stageOf(b) : 'observation' });
    }
  }
  events.push(...decay(state, tick));
  return events;
}

// DECAY — a detail nobody returns to is not memory, it is clutter. Objects are exempt while
// their significance is unknown: an unexplained burned corner is a deliberate hook, and a
// hook that expires before the story reaches it is the opposite of what it is for.
export function decay(state, now) {
  const events = [];
  for (const [name, ent] of Object.entries(state.entities)) {
    ent.beliefs = ent.beliefs.filter(b => {
      const tier = tierOf(b), age = now - (b.lastTick || 0);
      if (tier === 'trait' || b.exceptions?.length) return true;
      if (isObject(b)) return true;
      if (tier === 'observation' && age > OBS_TTL) {
        events.push({ action: 'forgotten', entity: name, id: b.id, fact: b.fact, age });
        return false;
      }
      if (tier === 'pattern' && age > PAT_TTL) {
        b.seen.pop();  // slow decay: fall back a rung rather than vanishing outright
        b.lastTick = now;
        events.push({ action: 'faded', entity: name, id: b.id, fact: b.fact, to: tierOf(b), age });
      }
      return true;
    });
  }
  return events;
}

// ── SPENT-SLOT LEDGER ────────────────────────────────────────────────────────
// Character+ rotates through nine mechanisms and Environment+ through seven axes. The rule
// existed in the prompt and was delivered every scene, but nothing recorded WHICH slot a
// character had already spent, so "rotate" was an instruction the author had to satisfy from
// inside a single call with no memory. That is how one person ends up leading with her
// décolletage in scene 1, choosing a dress by its neckline in scene 2 and angling her bust in
// scene 3: three different sentences, one mechanism, no way to notice.
//
// What is stored is the SLOT, never a reading of the character. "Jess has spent A and D" is a
// fact about what is used up. "Jess uses sexuality to control perception" is a thesis the
// system would then bend every future scene toward, and it is exactly what this avoids.
export const SLOT_COOLDOWN = 5;

// STORY-LEVEL PROSE-PATTERN MEMORY, kept apart from the per-character mechanism ledger. The
// mechanism ledger governs WHAT is revealed; this governs HOW it is delivered. The 10-scene
// serial rotated mechanisms correctly (B, C, E, B) and still produced one sentence four
// times — "the way he always measured a debt", "the way he always did when he sensed me
// watching", "the way he always did when the work was about to", "the one she always used
// first" — because nothing remembered the delivery form. The author wrote that construction
// zero times in ten scenes; the repair pass introduced every instance.
export function recordShells(state, keys, sceneLabel, sample) {
  state.shells ||= {};
  for (const k of keys) if (!state.shells[k]) state.shells[k] = { scene: sceneLabel, sample: String(sample || '').slice(0, 70) };
}

export function recordSlot(state, entity, slot, sceneLabel) {
  if (!slot) return null;
  state.scenes ||= [];
  if (!state.scenes.includes(sceneLabel)) state.scenes.push(sceneLabel);
  const ent = (state.entities[entity] ||= { beliefs: [] });
  (ent.spent ||= []).push({ slot: String(slot), scene: sceneLabel, tick: state.scenes.length });
  return { entity, slot, tick: state.scenes.length };
}

// A slot comes back into play after the cooldown — the mechanism may return once it can
// DEEPEN rather than restate. Surface repetition is a separate guard; this one is about
// which lens the scene is allowed to look through.
export function slotStatus(state, entity, allSlots, now, cooldown = SLOT_COOLDOWN) {
  const ent = state.entities[entity];
  const hist = (ent && ent.spent) || [];
  const recent = new Set(hist.filter(x => now - x.tick < cooldown).map(x => x.slot));
  return {
    spent: [...recent],
    available: allSlots.filter(x => !recent.has(x)),
    everUsed: [...new Set(hist.map(x => x.slot))],
    history: hist.map(x => `${x.slot}@${String(x.scene).replace(/^.*\//, '')}`),
  };
}

// WHAT THE AUTHOR RECEIVES. Observations are withheld on purpose (see the header). Traits are
// stated as established; patterns are offered and explicitly marked optional, because a
// pattern the author MUST honour becomes a tic just as fast as a bad extraction.
export function renderForAuthor(state, entities) {
  const lines = [];
  for (const name of entities) {
    const ent = state.entities[name];
    if (!ent) continue;
    if (ent.compressed) { lines.push(`${name}: ${ent.compressed.summary}`); continue; }

    // An object earns the page once it has history. A bare detail is the author's to notice
    // or not; repeating it on instruction is how a burned corner becomes a motif nobody chose.
    const objects = ent.beliefs.filter(b => isObject(b) && stageOf(b) === 'history');
    const traits = ent.beliefs.filter(b => !isObject(b) && tierOf(b) === 'trait');
    const patterns = ent.beliefs.filter(b => !isObject(b) && tierOf(b) === 'pattern');
    const parts = [];
    for (const b of [...traits, ...patterns]) {
      const label = tierOf(b) === 'trait' ? 'ESTABLISHED' : 'SEEN BEFORE (available, not required)';
      // The rule and its exception travel together. Shown apart, the author gets either a
      // character who cannot break, or nonsense.
      if (b.exceptions?.length >= 2) {
        parts.push(`CONTESTED — ${b.fact}, but broken ${b.exceptions.length}× `
          + `(${b.exceptions.map(e => e.fact).join('; ')}). Do not treat as reliable.`);
      } else if (b.exceptions?.length) {
        parts.push(`${label} — usually ${b.fact}. EXCEPTION, once: ${b.exceptions[0].fact}`);
      } else parts.push(`${label} — ${b.fact}`);
    }
    for (const b of objects) parts.push(`HISTORY — ${b.fact}: ${b.significance}`);
    if (parts.length) lines.push(`${name}: ${parts.join(' | ')}`);
  }
  if (!lines.length) return '';
  return 'WHAT THIS STORY HAS ALREADY ESTABLISHED\n'
    + 'Honour what is established. What is merely SEEN BEFORE is available if the scene wants\n'
    + 'it; repeating it for its own sake turns a person into a tic. Where a rule has an\n'
    + 'exception, the exception is the more interesting fact.\n' + lines.map(l => '  ' + l).join('\n');
}

// WHAT THE EXTRACTOR RECEIVES — everything, ids included, so it can declare a repeat or a break.
export function renderForExtractor(state, entities) {
  const lines = [];
  for (const name of entities) {
    for (const b of state.entities[name]?.beliefs || []) {
      lines.push(`  ${b.id} [${b.type}, seen ${b.seen.length}×] ${b.fact}`
        + (b.significance ? `  (significance: ${b.significance})` : '')
        + (b.exceptions?.length ? `  (broken ${b.exceptions.length}×)` : ''));
    }
  }
  return lines.length
    ? 'ALREADY PROPOSED. If this scene shows the same thing again, return "reinforces":"<id>".\n'
      + 'If it shows the OPPOSITE, return "contradicts":"<id>" — an exception is valuable, and\n'
      + 'nothing is overwritten. Only write a new candidate for something genuinely new:\n' + lines.join('\n')
    : '';
}

// ── CLI ──────────────────────────────────────────────────────────────────────
const arg = k => (process.argv.find(a => a.startsWith(`--${k}=`)) || '=').split('=')[1];
export const describe = e => e.action === 'promoted' ? `  ↑ PROMOTED  ${e.entity}: ${e.from} → ${e.to}   ${e.fact}`
  : e.action === 'reinforced' ? `  + repeat    ${e.entity}: ${e.fact}   (${e.how})`
  : e.action === 'climbed'    ? `  ↑ ${e.from} → ${e.to}  ${e.entity}: ${e.fact}`
  : e.action === 'exception'  ? `  ⚡ EXCEPTION ${e.entity}: "${e.fact}" breaks "${e.rule}" (${e.n}×)`
  : e.action === 'forgotten'  ? `  ⌫ forgotten ${e.entity}: ${e.fact}   (unseen ${e.age} scenes)`
  : e.action === 'faded'      ? `  ↓ faded     ${e.entity}: → ${e.to}   (unseen ${e.age} scenes)`
  : e.action === 'refused'    ? `  ⚠ REFUSED   ${e.entity}: ${e.why}`
  : `  · new       ${e.entity}: ${e.fact}${e.origin && e.origin !== 'observed' ? `   [origin: ${e.origin}]` : ''}`;

if (import.meta.url === `file://${process.argv[1]}`) {
  const state = load();
  const ents = () => Object.entries(state.entities);

  if (arg('ingest')) {
    const q = JSON.parse(fs.readFileSync(arg('ingest'), 'utf8'));
    for (const e of ingest(state, q, q[0]?.scene || 'unknown')) console.log(describe(e));
    save(state);
    console.log(`\n  ingested → ${STATE_FILE}`);
  }

  if (process.argv.includes('--show') || !process.argv.slice(2).length) {
    console.log(`\n${'═'.repeat(78)}\nCANON STATE   (${(state.scenes || []).length} scene(s) seen)\n${'═'.repeat(78)}`);
    if (!ents().length) console.log('  (empty)');
    for (const [name, ent] of ents()) {
      console.log(`\n  ${name}${ent.compressed ? '   [compressed]' : ''}`);
      if (ent.compressed) console.log(`     ⇒ ${ent.compressed.summary}`);
      for (const b of ent.beliefs) {
        const rung = isObject(b) ? stageOf(b) : tierOf(b);
        console.log(`     ${{ trait: '●', pattern: '◐', observation: '○', history: '◆', detail: '◇' }[rung]} `
          + `${rung.padEnd(11)} ${b.fact}${b.significance && b.significance !== 'unknown' ? ` — ${b.significance}` : ''}`);
        console.log(`        ${b.id} · ${b.type} · ${b.origin || 'observed'} · seen ${b.seen.length}× · last tick ${b.lastTick || '?'}`
          + (b.significance === 'unknown' ? ' · significance unknown (open hook)' : ''));
        for (const x of b.exceptions || []) console.log(`        ⚡ exception: ${x.fact}  (${x.scene})`);
      }
      if (ent.spent && ent.spent.length) {
        console.log(`     ⟳ slots spent: ${ent.spent.map(x => `${x.slot}@tick${x.tick}`).join(', ')}`);
      }
    }
    const all = ents().flatMap(([, e]) => e.beliefs);
    const n = f => all.filter(f).length;
    console.log(`\n  ${all.length} belief(s) · ${n(b => !isObject(b) && tierOf(b) === 'trait')} trait`
      + ` · ${n(b => !isObject(b) && tierOf(b) === 'pattern')} pattern`
      + ` · ${n(b => !isObject(b) && tierOf(b) === 'observation')} observation (author never sees these)`
      + ` · ${n(b => isObject(b) && stageOf(b) === 'history')} object-history`
      + ` · ${n(b => isObject(b) && stageOf(b) === 'detail')} open hook(s)`
      + ` · ${n(b => b.exceptions?.length)} contested\n`);
  }

  if (arg('render')) {
    const names = arg('render').split(',').map(s => s.trim());
    console.log(`\n── AUTHOR VIEW ${'─'.repeat(62)}\n`
      + (renderForAuthor(state, names) || '  (nothing has earned the page yet)'));
    console.log(`\n── EXTRACTOR VIEW ${'─'.repeat(59)}\n`
      + (renderForExtractor(state, names) || '  (nothing proposed yet)') + '\n');
  }

  // CONSOLIDATION — not summarisation. Several observations about one person are collapsed
  // into the thing the author actually needs: how this person operates. Runs on a cheap
  // model; the author call is where the money goes.
  if (process.argv.includes('--consolidate')) {
    for (const [name, ent] of ents()) {
      if (ent.beliefs.length < 4) continue;
      const facts = ent.beliefs.map(b => `- ${b.fact} (seen ${b.seen.length}×)`
        + (b.exceptions?.length ? `  [broken once: ${b.exceptions[0].fact}]` : '')).join('\n');
      const r = await fetch('http://localhost:3000/api/mistral-proxy', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'mistral-small-latest', temperature: 0.3, max_tokens: 220,
          messages: [{ role: 'system', content:
            'Collapse observations about one character into how they OPERATE — the strategy '
            + 'underneath the behaviours. One or two sentences, plain, no psychoanalysis, no '
            + 'invented motive. Weight by how often each was seen. If a rule was broken, keep '
            + 'the exception: it is the most informative thing there.\n'
            + "Example in: addresses the space above a listener's head; never raises his voice "
            + '[broken once: screamed when Lirael was threatened]; pauses before answering.\n'
            + 'Example out: Controls a room through stillness rather than force, making others '
            + 'come to him — except where Lirael is threatened, which is the one thing that '
            + 'takes the control away from him.\nReturn the sentence only.' },
            { role: 'user', content: `${name}:\n${facts}` }] }),
      });
      const d = await r.json();
      const summary = String(d.content || d.choices?.[0]?.message?.content || '').trim();
      if (!summary) { console.log(`  (${name}: no summary returned)`); continue; }
      ent.compressed = { summary, from: ent.beliefs.length };
      console.log(`\n  ${name}  (${ent.beliefs.length} beliefs → 1)\n     ⇒ ${summary}`);
    }
    save(state);
    console.log(`\n  consolidated → ${STATE_FILE}. Raw beliefs kept; only the author view collapses.\n`);
  }
}
