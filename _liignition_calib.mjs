// _liignition_calib.mjs — LI desire-ignition detector CALIBRATION (Roman 2026-07-30). NO generation.
// Question: relaxing the desireCoded detector from SENTENCE scope → 2-ADJACENT-LI-SENTENCES scope,
// how many of the 3 existing stories now latch? Keeps the SEMANTIC requirement (body anchor AND
// wanting — never OR); relaxes ONLY scope. Logs WHY each scene fails so failures can be clustered.
// Regexes copied VERBATIM from _liDescriptionCheck (public/app.js ~238180-238215) for a faithful compare.
import fs from 'fs';

const OUT = process.env.OUT || '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/invariant_3story';
const stories = JSON.parse(fs.readFileSync(`${OUT}/all_stories.json`, 'utf8'));

// ── VERBATIM production regexes ──────────────────────────────────────────
const CATS = {
  hair: /\b(?:hair|hairline|bald|shaved|braid|braided|ponytail|bun|curls|curl|crew|cropped|disheveled|silver|grey|gray|graying|blonde|brunette|dark[- ]haired|auburn|red[- ]haired)\b/i,
  faceDescribed: /\b(?:scar(?! across his knuckles?)|mole|freckl\w*|dimple|stubble|bearded|beard|mustache|moustache|goatee|clean-shaven|salt-and-pepper|(?:dark|pale|light|deep-set|hooded|blue|green|grey|gray|brown|hazel|amber|black|golden|grey-)[- ]?(?:eyes|eyed)|(?:crooked|broken|sharp|aquiline|broad|hooked|straight|prominent|strong|square|heavy|hawk(?:ish)?) (?:nose|jaw|jawline|chin|brow|cheekbones?)|(?:high|sharp|hollow) cheekbones?|(?:thin|full|wide|cruel|chapped|generous) (?:lips|mouth))\b/i,
  build: /\b(?:tall|short|broad|broad-shouldered|narrow|lean|stocky|slim|slight|build|frame|shoulders?|chest|waist|hips?|thigh|leg|leggy|height|stature|musculature|muscled?|wiry|compact|heavy)\b/i,
  handsOther: /\b(?:forearms?|wrists?|fingers?|palm|palms|hands? (?!on the back of)(?:[a-z]+ )*(?:rough|callused|long|broad|careless|elegant|steady))\b/i
};
const BODY_FACE = ['hair', 'faceDescribed', 'build', 'handsOther'];
const ATTR_ADJ = /\b(?:beautiful|gorgeous|stunning|striking|handsome|devastating|hypnotic|mesmeri[sz]ing|sensual|sculpted|magnetic|alluring|breathtaking|captivating|exquisite|distracting|maddening|unfair(?:ly)?|ridiculous(?:ly)?|too good|good[- ]looking|stately|elegant)\b/i;
const WANT_CUE = /\b(?:want(?:ed|ing)?|could ?n'?t (?:look away|stop|help|breathe)|imagin(?:e|ed|ing)|ache[ds]?|aching|drawn to|pull(?:ed|ing)? (?:me|at me|toward)|hunger(?:ed)?|crav(?:e|ed|ing)|mouth went dry|breath (?:caught|snagged)|wanted to (?:touch|trace|feel|run|put)|fingers? (?:in|through|along|itch)|made me forget|undid me|kept (?:looking|staring|returning))\b/i;

const hasBody = s => BODY_FACE.some(c => CATS[c].test(s));
const hasWant = s => ATTR_ADJ.test(s) || WANT_CUE.test(s);
// LI-focused proxy: gendered 3rd-person pronoun (production scopes by LI-name-or-male-pronoun; we lack
// the stored LI name, so we use both genders — noted as a proxy; slightly over-scopes).
const LI_FOCUS = /\b(?:he|him|his|she|her|hers)\b/i;

const P = []; const out = (...a) => { P.push(a.join(' ')); console.log(...a); };
out('\n=== LI DESIRE-IGNITION DETECTOR CALIBRATION (sentence → 2-adjacent-LI-sentence scope) ===');
out('semantic requirement UNCHANGED: body anchor AND wanting. only SCOPE relaxed. LI-scope proxy = gendered pronoun.\n');

const agg = { current: 0, relaxed: 0, reasons: {} };
for (const st of stories) {
  const prose = (st.harvest && st.harvest.prose) || [];
  let curLatchScene = null, relLatchScene = null;
  const sceneRows = [];
  prose.forEach((scene, idx) => {
    const sents = scene.split(/(?<=[.!?])\s+/).filter(x => x.trim().length);
    const liSents = sents.map((s, i) => ({ s, i, li: LI_FOCUS.test(s) })).filter(x => x.li);
    // CURRENT (production): a single LI sentence with body AND want
    const sameSentence = liSents.some(x => hasBody(x.s) && hasWant(x.s));
    // RELAXED: two ADJACENT sentences (in prose order) whose LI-scoped text collectively has body AND want
    let adjacent = false;
    for (let i = 0; i < sents.length - 1; i++) {
      const w = [sents[i], sents[i + 1]].filter(s => LI_FOCUS.test(s));
      if (!w.length) continue;
      const wtxt = w.join(' ');
      if (hasBody(wtxt) && hasWant(wtxt)) { adjacent = true; break; }
    }
    const latch = sameSentence || adjacent;
    if (sameSentence && curLatchScene === null) curLatchScene = idx;
    if (latch && relLatchScene === null) relLatchScene = idx;
    // WHY (scene-level, when relaxed does NOT latch)
    let reason = 'LATCH';
    if (!latch) {
      const anyBody = liSents.some(x => hasBody(x.s));
      const anyWant = liSents.some(x => hasWant(x.s));
      if (!liSents.length) reason = 'offstage/absent (no LI-focused sentence)';
      else if (!anyBody && !anyWant) reason = 'abstract (LI present, no body + no wanting)';
      else if (!anyBody) reason = 'no-body (wanting but no physical anchor)';
      else if (!anyWant) reason = 'clinical (body anchor, NO wanting) ← feature-catalog';
      else reason = 'SCOPE (body + wanting both present but not within one beat)';
    }
    if (reason !== 'LATCH') agg.reasons[reason] = (agg.reasons[reason] || 0) + 1;
    sceneRows.push({ idx, sameSentence, adjacent, reason, liSents: liSents.length });
  });
  const curL = curLatchScene !== null, relL = relLatchScene !== null;
  if (curL) agg.current++; if (relL) agg.relaxed++;
  out(`STORY ${st.story} (${prose.length} scenes) — CURRENT latch: ${curL ? 'YES @s' + curLatchScene : 'no'}  ·  RELAXED latch: ${relL ? 'YES @s' + relLatchScene : 'no'}`);
  sceneRows.forEach(r => out(`    s${String(r.idx).padEnd(2)} liSents=${String(r.liSents).padEnd(2)} same=${r.sameSentence ? 'Y' : '·'} adj=${r.adjacent ? 'Y' : '·'}  ${r.reason}`));
  out('');
}

out('══════════════════════════════════════════════════════════');
out(`LATCH COUNT:  CURRENT ${agg.current}/3  →  RELAXED (2-adjacent) ${agg.relaxed}/3`);
out('FAILURE CLUSTERING (scene-level reasons across all stories):');
Object.entries(agg.reasons).sort((a, b) => b[1] - a[1]).forEach(([r, n]) => out(`    ${String(n).padStart(3)} × ${r}`));
out('');
const verdict = agg.relaxed === agg.current
  ? `0-delta → the detector scope is NOT the problem; the prose genuinely isn't desire-coding the LI → AUTHOR / opening-architecture problem.`
  : agg.relaxed > agg.current
    ? `+${agg.relaxed - agg.current} stories latch under relaxed scope → the detector was partly too strict (same-sentence); fix scope first, then re-evaluate the author.`
    : 'unexpected';
out('VERDICT: ' + verdict);
fs.writeFileSync(`${OUT}/LI_IGNITION_CALIB.txt`, P.join('\n'));
