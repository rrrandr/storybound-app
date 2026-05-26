#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// RELATIONAL-ECOLOGY SIMULATION HARNESS
// ═══════════════════════════════════════════════════════════════════════════
// WHAT THIS IS:  an ARCHITECTURE STRESS TEST for the relational-attraction
//               telemetry (see project_relational_attraction_architecture.md).
//               Drives synthetic ARCHETYPAL INTERACTION PATTERNS through the
//               shared classifier over long (Issue 1-12) runs and aggregates
//               ecology distributions.
//
// WHAT THIS IS NOT (read twice):
//   • NOT gender realism — archetypes are INTERACTION STYLES, not demographics.
//   • NOT dating/outcome prediction; does NOT model attachment or romance success.
//   • NOT a retention/engagement predictor. Simulated retention is a trap.
//   It answers ONE question: "does the architecture behave COHERENTLY under
//   varied interaction styles?"
//
// SINGLE AUTHORITY: the classifier is IMPORTED from
//   public/relational-shape-classifier.js (the same file the browser app loads).
//   There is NO mirrored copy — app + sim cannot drift.
//
// CONTEXT-AWARE BEFORE/AFTER: runs every archetype twice — v0 (ctx=null, lexical
//   only) and v1 (ctx synthesized = what the LI just did). The synthetic ctx
//   stress-tests the classifier's context LOGIC; it does NOT prove the live app
//   can produce accurate ctx (that's the future scene-relational extractor).
//
// USAGE:
//   node scripts/relational-ecology-sim.mjs
//   node scripts/relational-ecology-sim.mjs --scenes=12 --seed=7
//   node scripts/relational-ecology-sim.mjs --dist=irony_deflecting:50,assertive_attuned:30
// ═══════════════════════════════════════════════════════════════════════════

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { classifyRelationalShape, VECTORS } = require('../public/relational-shape-classifier.js');

// ── synthetic archetypal interaction patterns (STYLES, not demographics) ─────
// Each line is a [do, say] pair authored to EXHIBIT the pattern.
const ARCHETYPES = {
  hesitant_yearning: { prior: { pc: 'male', li: 'female' }, lines: [
    ['', "uh, maybe we could get a drink sometime? i don't know, forget it."],
    ['I almost speak, then look away', ''],
    ['', "i keep wanting to say something but i lose my nerve. maybe later."],
    ['', "would you want to, sometime? if that's okay i guess."],
    ['I shift in my seat', "i mean, perhaps? sorry, nevermind."],
    ['', "i think about telling her how i feel. i don't."],
  ]},
  assertive_attuned: { prior: { pc: 'male', li: 'female' }, lines: [
    ['I take her hand, slow', "I saw the way you looked at me. Tell me to stop and I will."],
    ['', "I want you. I've wanted you since the rooftop."],
    ['I step closer, watching her face', "You keep glancing at my mouth. I noticed."],
    ['I lean in', "I'm going to kiss you unless you say no."],
    ['', "You said you weren't ready. I can wait. I'm not going anywhere."],
    ['I hold her gaze', "Come here."],
  ]},
  irony_deflecting: { prior: { pc: 'female', li: 'male' }, lines: [
    ['', "yeah right, like you actually mean that. anyway."],
    ['', "oh how romantic. lol."],
    ['', "haha sure, sure. let's not make it weird."],
    ['', "wow, okay. real smooth."],
    ['', "as if. don't flatter yourself."],
    ['', "gee thanks. moving on."],
  ]},
  approval_seeking: { prior: { pc: 'male', li: 'female' }, lines: [
    ['', "is that okay? only if you want."],
    ['', "i hope that's alright, i didn't want to assume."],
    ['', "do you mind if i stay? is this ok?"],
    ['', "if you want me to i can, only if you want me to."],
    ['', "would that be ok with you? i don't want to overstep."],
    ['', "i guess, if that's alright? sorry."],
  ]},
  emotionally_armored: { prior: { pc: 'female', li: 'male' }, lines: [
    ['I keep my voice level', "It's fine. I'm fine."],
    ['I put the walls up and step back', ''],
    ['', "I don't need anything from you."],
    ['I stay composed', "Don't read into it."],
    ['I create distance', "Let's keep this professional."],
    ['', "I keep my guard up. Always."],
  ]},
  playful_but_avoidant: { prior: { pc: 'male', li: 'female' }, lines: [
    ['I make a joke to break the tension', ''],
    ['', "haha anyway — let's change the subject."],
    ['I tease her then laugh it off', "real smooth of me, forget it."],
    ['', "lol, never mind, it's nothing."],
    ['I deflect with a grin', "no big deal."],
    ['', "wow okay, brush it off."],
  ]},
  vulnerable_but_retreating: { prior: { pc: 'female', li: 'male' }, lines: [
    ['', "honestly? this scares me. — never mind, forget i said that."],
    ['I tell him the truth then step back', "i shouldn't have said anything."],
    ['', "the truth is i— no. nothing."],
    ['', "i'm afraid of this. i don't even know why i said that."],
    ['I expose something real then withdraw', "forget it."],
    ['', "i've never told anyone that. i shouldn't have."],
  ]},
  decisive_but_tone_deaf: { prior: { pc: 'male', li: 'female' }, lines: [
    ['I grab her and kiss her', ''],
    ['', "We're doing this. Let's go."],
    ['I take charge, I don\'t wait for an answer', ''],
    ['I pull her in', "I don't ask."],
    ['I move toward her', "I've decided. Come on."],
    ['I lead, no hesitation', "Don't overthink it."],
  ]},
  receptive_but_self_silencing: { prior: { pc: 'female', li: 'male' }, lines: [
    ['I want to say yes but I stay quiet', ''],
    ['', "it's probably nothing, forget i said anything."],
    ['I feel it too but I don\'t tell him', ''],
    ['I look away instead of letting him see', "say nothing."],
    ['', "i don't even know why i'm like this."],
    ['I go quiet', "i shouldn't want this."],
  ]},
};

// ── seeded RNG (reproducible) ────────────────────────────────────────────────
function makeRng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// ── arg parsing ──────────────────────────────────────────────────────────────
const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)=(.*)$/); return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true]; }));
const SCENES = parseInt(args.scenes, 10) || 12;
const SEED = parseInt(args.seed, 10) || 42;
const DEFAULT_DIST = {
  hesitant_yearning: 40, assertive_attuned: 25, irony_deflecting: 20, approval_seeking: 15,
  emotionally_armored: 12, playful_but_avoidant: 12, vulnerable_but_retreating: 12,
  decisive_but_tone_deaf: 12, receptive_but_self_silencing: 12,
};
let DIST = DEFAULT_DIST;
if (typeof args.dist === 'string') { DIST = {}; for (const part of args.dist.split(',')) { const [k, n] = part.split(':'); if (ARCHETYPES[k]) DIST[k] = parseInt(n, 10) || 1; } }

function modalSignature(reads) {
  const sig = {};
  for (const v of VECTORS) {
    const counts = {};
    for (const r of reads) counts[r[v]] = (counts[r[v]] || 0) + 1;
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    sig[v] = sorted.length ? { mode: sorted[0][0], frac: sorted[0][1] / reads.length } : { mode: 'na', frac: 0 };
  }
  return sig;
}
function rate(reads, vector, vals) { let d = 0; for (const r of reads) if (vals.includes(r[vector])) d++; return reads.length ? d / reads.length : 0; }
function pct(x) { return Math.round(x * 100) + '%'; }

// Build an ecology for one mode. A FRESH seeded rng per call makes the line/ctx
// draws identical across v0 and v1, so the before/after comparison is fair.
function buildEcologySeeded(useCtx) {
  const localRng = makeRng(SEED);
  const localPick = arr => arr[Math.floor(localRng() * arr.length)];
  const localCtx = () => ({ li_signaled: localRng() < 0.7, li_revealed: localRng() < 0.35, li_offered: localRng() < 0.35 });
  const eco = {};
  for (const [archKey, count] of Object.entries(DIST)) {
    const all = [];
    for (let i = 0; i < count; i++) {
      const arch = ARCHETYPES[archKey];
      for (let scene = 1; scene <= SCENES; scene++) {
        const [d, s] = localPick(arch.lines);
        const r = classifyRelationalShape(d, s, arch.prior, useCtx ? localCtx() : null);
        if (r) all.push(r);
      }
    }
    eco[archKey] = all;
  }
  return eco;
}

const v0 = buildEcologySeeded(false);
const v1 = buildEcologySeeded(true);
const total = Object.values(v1).flat().length;

// ═══ REPORT ══════════════════════════════════════════════════════════════════
const line = '─'.repeat(78);
console.log('\n' + '═'.repeat(78));
console.log('RELATIONAL-ECOLOGY SIMULATION — architecture stress test (v0 vs context-aware)');
console.log('═'.repeat(78));
console.log(`Runs: ${Object.entries(DIST).map(([k, n]) => `${n}×${k}`).join('  ')}`);
console.log(`Scenes/run: ${SCENES}   seed: ${SEED}   total reads/mode: ${total}`);
console.log('Archetypes are INTERACTION STYLES, not demographics. Tests classifier coherence');
console.log('— NOT psychology, dating outcomes, or retention.');

// 1. v1 archetype signatures
console.log('\n' + line + '\n1. ARCHETYPE SIGNATURES (context-aware) — does each style read coherently?\n' + line);
for (const [k, reads] of Object.entries(v1)) {
  const sig = modalSignature(reads);
  console.log(`\n• ${k}\n    ${VECTORS.map(v => `${v.split('_')[0]}=${sig[v].mode}(${pct(sig[v].frac)})`).join(' ')}`);
}

// 2. Ironic-family co-firing (v1)
console.log('\n' + line + '\n2. IRONIC-FAMILY CO-FIRING — does ironic distance cluster as ONE failure?\n' + line);
const ir = v1.irony_deflecting || [];
if (ir.length) {
  const fam = ir.filter(r => r.register_shape === 'ironic' && r.receptivity === 'deflected' && r.desire_ownership === 'ironized' && r.presence_after_contact === 'retreated_ironic' && r.vulnerability === 'guarded');
  console.log(`irony_deflecting: ${pct(fam.length / ir.length)} of reads fire the FULL ironic family together.`);
} else console.log('(no irony_deflecting runs)');

// 3. BEFORE/AFTER — the attunement-vs-boldness canary
console.log('\n' + line + '\n3. ATTUNEMENT-vs-BOLDNESS CANARY — BEFORE (v0) vs AFTER (context-aware)\n' + line);
function canary(eco) {
  const a = eco.assertive_attuned || [], t = eco.decisive_but_tone_deaf || [];
  if (!a.length || !t.length) return null;
  return {
    attunedNoticed: rate(a, 'reciprocity_recognition', ['noticed']),
    attunedMissed: rate(a, 'reciprocity_recognition', ['missed']),
    toneNoticed: rate(t, 'reciprocity_recognition', ['noticed']),
    toneMissed: rate(t, 'reciprocity_recognition', ['missed']),
    shared: VECTORS.filter(v => modalSignature(a)[v].mode === modalSignature(t)[v].mode).length,
  };
}
const c0 = canary(v0), c1 = canary(v1);
if (c0 && c1) {
  console.log('                          attuned                 tone-deaf');
  console.log(`  v0  reciprocity:   noticed=${pct(c0.attunedNoticed)} missed=${pct(c0.attunedMissed)}    noticed=${pct(c0.toneNoticed)} missed=${pct(c0.toneMissed)}   (shared modal vectors: ${c0.shared}/9)`);
  console.log(`  v1  reciprocity:   noticed=${pct(c1.attunedNoticed)} missed=${pct(c1.attunedMissed)}    noticed=${pct(c1.toneNoticed)} missed=${pct(c1.toneMissed)}   (shared modal vectors: ${c1.shared}/9)`);
  // The real discriminator is NOT attuned's noticed-rate (it can drop as ctx
  // reclassifies un-acknowledged lines to 'missed') — it's that tone-deaf's
  // IGNORING becomes VISIBLE: in v0 reciprocity is just silent (can't tell
  // "ignored a signal" from "no signal"); in v1 'missed' is detectable, and
  // attuned's noticed-rate materially exceeds tone-deaf's.
  const noticedGap = c1.attunedNoticed - c1.toneNoticed;
  const missedEmerged = c1.toneMissed - c0.toneMissed;
  const resolved = noticedGap >= 0.2 && missedEmerged >= 0.2;
  console.log(`  → ${resolved ? 'RESOLVED' : 'NOT resolved'}: attuned noticed-rate exceeds tone-deaf by ${Math.round(noticedGap * 100)}pts;`);
  console.log(`    tone-deaf 'missed' became detectable (+${Math.round(missedEmerged * 100)}pts vs v0 — ignoring a present signal is now VISIBLE).`);
  console.log("    NOTE: modal-vector overlap is a red herring here — both can read modal 'missed' while their");
  console.log('    RATES differ sharply. Synthetic ctx proves the LOGIC separates them; live ctx accuracy is the next slice.');
}

// 4. BEFORE/AFTER — blind spots
console.log('\n' + line + '\n4. BLIND SPOTS (scene-relational % silent) — BEFORE (v0) vs AFTER (context-aware)\n' + line);
const a0 = Object.values(v0).flat(), a1 = Object.values(v1).flat();
for (const v of ['reciprocity_recognition', 'receptivity', 'presence_after_contact']) {
  console.log(`  ${v}: v0=${pct(rate(a0, v, ['na']))} silent  →  v1=${pct(rate(a1, v, ['na']))} silent`);
}
console.log('  (desire_ownership/vulnerability stay lexical — not ctx-driven — so unchanged.)');

// 5. Stagnation (v1)
console.log('\n' + line + '\n5. LONG-RUN STAGNATION (context-aware) — near-monotone shapes\n' + line);
for (const [k, reads] of Object.entries(v1)) {
  const sig = modalSignature(reads);
  const dom = VECTORS.map(v => ({ v, ...sig[v] })).filter(x => x.frac >= 0.8 && x.mode !== 'na');
  if (dom.length) console.log(`• ${k}: ${dom.map(d => `${d.v}=${d.mode} ${pct(d.frac)}`).join(', ')}`);
}
console.log('→ structural only: a near-monotone vector would stagnate the FUTURE charge system.');

// 6. PENDING
console.log('\n' + line + '\n6. PENDING — NOT MEASURED (systems do not exist yet)\n' + line);
[
  'live ctx accuracy — can the app actually detect what the LI just did? (scene-relational extractor — NOT built)',
  'charge level + does irony COLLAPSE charge (conductivity charge scalar — not built)',
  'LI adaptive escalation (close-the-gap / exposure-and-hold tables — not built)',
  'glow gameability (the glow — not built)',
  'attunement OUTPERFORMS boldness in chemistry (charge wiring — not built; §3 shows separability only)',
  'prior self-correction (emphasis weighting that consumes observed shape — not built)',
  'retention / engagement / attachment — OUT OF SCOPE. Human beta + real telemetry only.',
].forEach(s => console.log('  ⏳ ' + s));

console.log('\n' + '═'.repeat(78));
console.log('Architecture stress-testing, NOT market/psychology prediction.');
console.log('Maturation: Claude sim → trusted human beta → real telemetry → commercial tuning.');
console.log('═'.repeat(78) + '\n');
