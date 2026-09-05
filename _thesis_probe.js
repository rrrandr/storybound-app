// CHARACTER INTRODUCTION THESIS — necessity probe (Roman 2026-07-26). Generates 6 REAL bibles via the app's
// own generators (directly callable), DEEP_TRIO rotation ACTIVE (one context, sequential = realistic).
// Tests whether the observable behaviors DETERMINE a governing interpretive lens, or collapse to generic.
// Conditions per bible: (A) behaviors-only → one-sentence thesis; (B) full bible → thesis + FIELD CITATIONS
// (necessity: canonical owner vs ad-hoc). PRIMARY metric = pairwise swap test ("swap without a reader noticing?").
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = process.env.OUT || '/tmp/thesis.json';
const log = (...a) => console.error(...a);

const CHARS = [
  { label: 'SEDUCTIVE-A', kind: 'LI', arch: 'SPELLBINDER', focus: 'the hands' },
  { label: 'SEDUCTIVE-B', kind: 'LI', arch: 'SPELLBINDER', focus: 'the voice' },
  { label: 'PROTECTIVE-A', kind: 'LI', arch: 'HEART_WARDEN', focus: 'the gait / the way they walk' },
  { label: 'PROTECTIVE-B', kind: 'LI', arch: 'HEART_WARDEN', focus: 'the hair' },
  { label: 'DANGEROUS', kind: 'LI', arch: 'DARK_VICE', focus: 'a scar' },
  { label: 'GLAMOROUS', kind: 'LI', arch: 'BEAUTIFUL_RUIN', focus: 'the clothing' }
];

const BEHAV_FIELDS = ['visual_anchor', 'age', 'height', 'build', 'hair', 'complexion', 'face', 'eye_color', 'voice_quality', 'hands_quality', 'mouth_quality', 'holding_style', 'signature_feature', 'second_celebrated_feature', 'focus_tell', 'restraint_tell', 'interest_tell', 'frustration_tell', 'desire_tell', 'signature_habits', 'signature_behavior', 'deflection_pattern', 'attraction_manifestation', 'defining_anecdote', 'secondary_anecdote_different_register', 'stress_tic', 'impatience_tell', 'confidence_tell', 'vulnerability_tell', 'proximity_default', 'targeting_tell', 'control_tell', 'pleasure_tell', 'escalation_tell', 'softness_seam', 'archetype_signature', 'corrupted_warmth_tell', 'eyes_register'];

function behaviorsOnly(bible) {
  const o = {};
  for (const k of BEHAV_FIELDS) if (bible[k] !== undefined && bible[k] !== null && bible[k] !== '') o[k] = bible[k];
  return o;
}

const A_SYS = 'You just met this character across ONE scene, seeing ONLY how they look and behave (their observable actions, tells, habits, the way they move and hold themselves). In ONE sentence, state the CHARACTER INTRODUCTION THESIS: the single governing LENS through which a reader would interpret everything this person does. It is the organizing idea, e.g. "She manipulates attention instinctively" or "He takes care of everyone so no one takes care of him." NOT a list of adjectives, NOT a physical description — the one interpretive idea. Then give ONE "Still Wonder" question that stays alive. Return ONLY JSON {"thesis":"<one sentence>","still_wonder":"<one question>","confidence":"high|med|low"}.';

const B_SYS = 'You see this character\'s observable behavior AND their inner psychology (emotional weather, core contradiction, wound, what they crave). In ONE sentence, state the CHARACTER INTRODUCTION THESIS (the single governing LENS a reader would use to interpret everything they do — the organizing idea, not adjectives). Then ONE "Still Wonder" question. THEN cite which information drove your thesis. Return ONLY JSON {"thesis":"<one sentence>","still_wonder":"<one question>","confidence":"high|med|low","cited":{"observable_behaviors":true|false,"physical":true|false,"emotional_weather":true|false,"core_contradiction":true|false,"wound":true|false,"signature_kink":true|false,"anecdotes":true|false,"attraction_manifestation":true|false,"signature_behavior":true|false}}. Set cited.X true ONLY for information that genuinely determined the lens.';

const PAIR_SYS = 'Here are TWO characters, described only by their observable behavior. Judge: are they GENUINELY DISTINCT people, or the SAME TYPE in different clothes — could you SWAP them between two different stories without a reader noticing? Return ONLY JSON {"swappable":"yes|no","thesis_a":"<one-sentence governing lens for A>","thesis_b":"<one-sentence governing lens for B>","reason":"<one sentence>"}.';

async function judge(page, sys, userObj) {
  return page.evaluate(async (p) => {
    try {
      const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
      const j = await r.json();
      let c = (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '';
      try { return JSON.parse(String(c).replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()); } catch (_) { return { raw: String(c).slice(0, 200) }; }
    } catch (e) { return { error: e.message }; }
  }, { messages: [{ role: 'system', content: sys }, { role: 'user', content: JSON.stringify(userObj) }], role: 'SPECIALIST_RENDERER', preferredModel: 'grok-4-1-fast-non-reasoning', temperature: 0, max_tokens: 400 });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof window._generateLIBodyBible === 'function' && typeof window._generateAntagonistBodyBible === 'function', { timeout: 40000 });
  await page.evaluate((tc) => {
    var s = window.state; window._devBypass = true; window._forceAudits = false;
    var _of = window.fetch, PR = { 'gpt-4o-mini': [1.5e-7, 6e-7], 'grok-4-1-fast-non-reasoning': [2e-7, 5e-7] };
    window.__cost = { calls: 0, usd: 0 };
    window.fetch = async function (u, o) { var res = await _of.apply(this, arguments); try { var url = (typeof u === 'string' ? u : (u && u.url) || ''); if (/\/api\/(proxy|chatgpt-proxy|mistral-proxy)/.test(url)) { res.clone().json().then(function (j) { try { var us = (j && j.usage) || {}, m = (j && j.model) || '', p = PR[m] || PR['gpt-4o-mini']; window.__cost.calls++; window.__cost.usd += (us.prompt_tokens || 0) * p[0] + (us.completion_tokens || 0) * p[1]; } catch (_) {} }).catch(function () {}); } } catch (_) {} return res; };
    s.subscribed = true; s.access = 'sub'; s.world = 'billionaire'; s.flavor = 'billionaire_modern'; s.worldSubtype = 'billionaire_modern';
    s.loveInterest = 'Male'; s.loveInterestName = 'the man'; s.liGender = 'male';
    s.playerName = 'Mara'; s.name = 'Mara';
    s.picks = s.picks || {}; s.picks.playermask = 'OPEN_VEIN';   // constant PC archetype — vary only the LI register
    if (tc) window._tellConditioningExperiment = true;   // ← the intervention under test
  }, process.env.TELLCOND === '1');

  const bibles = [];
  for (const c of CHARS) {
    const out = await page.evaluate(async (c) => {
      var s = window.state;
      if (c.focus) window._forcedVisualAnchorFocus = c.focus;   // force a distinct camera-visible channel per character
      // Force the LI's OWN register via the fields the LI bible gen actually reads (232091).
      s.liArchetype = c.arch; s.loveInterestArchetype = c.arch; s.picks = s.picks || {}; s.picks.liArchetype = c.arch;
      s.archetype = { primary: c.arch, modifier: null, bound: false };
      s.pcBodyBible = null; s.liBodyBible = null; s.antagonistBodyBible = null;
      try {
        await window._generateLIBodyBible();
        return { bible: window.state.liBodyBible || { _err: 'no liBodyBible' }, liArchSeen: s.liArchetype };
      } catch (e) { return { bible: { _err: e.message } }; }
    }, c);
    const bible = out.bible;
    bibles.push({ label: c.label, kind: c.kind, requestedArch: c.arch, forcedFocus: c.focus, bible });
    var _va = bible.visual_anchor || {};
    log('  generated ' + c.label + ' (' + c.arch + ')' + (bible._err ? ' ERR:' + bible._err : '  · anchor[' + (_va.focus || '?') + ']: ' + (_va.detail || '(MISSING)')));
  }

  // VISUAL_ANCHOR check (Roman 2026-07-26) — is the detail CAMERA-VISIBLE (drawable) or an abstraction?
  const ABSTRACT = /magnetic|commanding|confident|warm|presence|aura|effortless|grace|intensity|charisma|charm|stillness|attentive|striking|arresting|captivating|poised|self-|menacing|cold|cruel|danger|piercing|calculating|predatory|air of|sense of|quietly|understated/i;
  const vas = bibles.filter(b => !b.bible._err).map(b => ({ label: b.label, focus: (b.bible.visual_anchor || {}).focus || '?', detail: String((b.bible.visual_anchor || {}).detail || '(MISSING)') }));
  const abstractHits = vas.filter(v => ABSTRACT.test(v.detail));
  const present = vas.filter(v => v.detail !== '(MISSING)').length;
  const distinctDetails = new Set(vas.map(v => v.detail.toLowerCase())).size;
  log('\n═══ VISUAL_ANCHOR (camera-visible fact? distinct? drawable?) ═══');
  vas.forEach(v => log('  ' + v.label.padEnd(13) + '[' + v.focus + '] ' + (ABSTRACT.test(v.detail) ? '⚠ ABSTRACT: ' : '✓ ') + v.detail));
  log('  present: ' + present + '/' + vas.length + ' · contains an ABSTRACTION: ' + abstractHits.length + '/' + vas.length + ' · distinct details: ' + distinctDetails + '/' + vas.length);

  // Conditions A + B + citations
  for (const b of bibles) {
    if (b.bible._err) { b.A = { skip: true }; b.B = { skip: true }; continue; }
    b.A = await judge(page, A_SYS, behaviorsOnly(b.bible));
    b.B = await judge(page, B_SYS, b.bible);
    log('\n──── ' + b.label + ' (' + b.emergentArch + ') ────');
    log('  A/behaviors-only THESIS: ' + (b.A.thesis || '?') + '  [' + (b.A.confidence || '?') + ']');
    log('  B/full-bible   THESIS: ' + (b.B.thesis || '?') + '  [' + (b.B.confidence || '?') + ']');
    log('  B still_wonder: ' + (b.B.still_wonder || '?'));
    log('  B cited fields: ' + (b.B.cited ? Object.keys(b.B.cited).filter(k => b.B.cited[k]).join(', ') : '?'));
  }

  // Pairwise swap tests (PRIMARY) — same-register pairs + the killer cross-pair
  const byLabel = {}; bibles.forEach(b => byLabel[b.label] = b);
  const PAIRS = [
    ['SEDUCTIVE-A', 'SEDUCTIVE-B', 'same-register collapse (SPELLBINDER×2)'],
    ['PROTECTIVE-A', 'PROTECTIVE-B', 'same-register collapse (HEART_WARDEN×2)'],
    ['SEDUCTIVE-A', 'DANGEROUS', 'KILLER: charming (SPELLBINDER) vs dangerous-charming (DARK_VICE) — same seductive surface, opposite thesis?'],
    ['SEDUCTIVE-A', 'PROTECTIVE-A', 'cross-register discrimination (SPELLBINDER vs HEART_WARDEN — should be distinct)']
  ];
  const pairResults = [];
  log('\n═══ PAIRWISE SWAP TESTS (primary metric) ═══');
  for (const [x, y, desc] of PAIRS) {
    const bx = byLabel[x], by = byLabel[y];
    if (!bx || !by || bx.bible._err || by.bible._err) { log('  ' + desc + ' — SKIP (missing bible)'); continue; }
    const r = await judge(page, PAIR_SYS, { character_A: behaviorsOnly(bx.bible), character_B: behaviorsOnly(by.bible) });
    pairResults.push({ pair: [x, y], desc, result: r });
    log('  [' + desc + ']  swappable=' + (r.swappable || '?'));
    log('     A→ ' + (r.thesis_a || '?'));
    log('     B→ ' + (r.thesis_b || '?'));
    log('     ∴ ' + (r.reason || '?'));
  }

  const cost = await page.evaluate(() => window.__cost);
  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify({ bibles, pairs: pairResults, cost }, null, 1));

  // Necessity summary (Condition C aggregate)
  const cites = bibles.filter(b => b.B && b.B.cited).map(b => b.B.cited);
  const fieldCounts = {};
  cites.forEach(c => Object.keys(c).forEach(k => { if (c[k]) fieldCounts[k] = (fieldCounts[k] || 0) + 1; }));
  const swapYes = pairResults.filter(p => p.result && p.result.swappable === 'yes').length;
  log('\n═══ NECESSITY SUMMARY ═══');
  log('  Field-citation frequency (how often each drove the thesis, /' + cites.length + '): ' + Object.entries(fieldCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + '=' + v).join(' · '));
  log('  → canonical owner (few fields always cited) ⇒ SURFACE existing; ad-hoc scatter (many fields, varying) ⇒ NEW object.');
  log('  Pairwise SWAPPABLE (collapse): ' + swapYes + '/' + pairResults.length + ' — same-archetype pairs swappable ⇒ Bible under-determines the thesis.');
  log('  cost: $' + (cost ? cost.usd.toFixed(4) : '?'));
})().catch(e => { console.error('THESIS-ERR', e.message); process.exit(1); });
