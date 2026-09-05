// $0 headless check: CG beat-count floor + Therefore/But causal spine + reconciled ceiling
// + Scene-1 Direct-vs-Subtle bespoke axis injection (matching literary). No generation.
const { chromium } = require('playwright-core');
const BLOCK = ['**/api/image**', '**/api/bfl-kontext**', '**/api/gemini-proxy**', '**/api/chatgpt-proxy**', '**/api/anthropic-proxy**', '**/api/mistral-proxy**', '**/api/deepseek-proxy**', '**/api/proxy**', '**/api/orchestrator**', '**/api/grok-image**', '**/api/visualize-flux**'];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  for (const p of BLOCK) await page.route(p, r => r.fulfill({ status: 500, body: '{}' }));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window._buildCGScreenplaySystemPrompt === 'function' && typeof window._buildCGScreenplayUserPrompt === 'function', { timeout: 40000 });

  const R = await page.evaluate(async () => {
    const out = [];
    const t = (name, fn) => { try { const [p, d] = fn(); out.push({ name, pass: !!p, detail: d || '' }); } catch (e) { out.push({ name, pass: false, detail: 'THREW ' + e.message }); } };
    const s = window.state;
    s.picks = { world: 'Fantasy', worldSubtype: 'the_inhuman', identity: { playerName: 'Mira', partnerName: 'Vael' }, tone: 'Charged', intensity: 'Steamy', pov: '1st' };
    s.world = 'Fantasy'; s.gender = 'Female'; s.loveInterest = 'Male'; s.tone = 'Charged';
    s.storyLength = 'affair'; s.contentMode = 'explicit'; s.renderMode = 'staged_story_mode'; s.currentEngine = 'graphic';
    s.pcName = 'Mira'; s.loveInterestName = 'Vael'; s.fantasyRegion = 'gloamwater_bay';
    s._playerSpecies = 'Human'; s._liSpecies = 'Kwisheen'; s.turnCount = 0;

    const sys = window._buildCGScreenplaySystemPrompt() || '';

    // (A) Beat-count floor + reconciled ceiling in system prompt.
    t('BEAT COUNT hard floor present (20–30, sub-18 = FAILURE)', () => [/BEAT COUNT \(HARD FLOOR\)[\s\S]*20–30 beats[\s\S]*under ~18 beats is a FAILURE/.test(sys), '']);
    // (B) Causal spine THEREFORE/BUT at beat level.
    t('CAUSAL SPINE (THEREFORE/BUT, never "and then") present', () => [/CAUSAL SPINE \(HARD — THEREFORE \/ BUT[\s\S]*never "and then"/.test(sys), '']);
    t('causal spine forbids stacked ungrounded ultimatums (names the exact failure)', () => [/stacking climactic ultimatums[\s\S]*This changes everything/.test(sys), '']);
    t('PHASE COUNT hard floor: aim for 5, <4 = FAILURE (fixes the 2-image scene)', () => [/PHASE COUNT \(HARD FLOOR\)[\s\S]*aim for FIVE[\s\S]*fewer than 4 is a FAILURE/.test(sys), '']);
    t('phase-image count reconciled to ~5 (was ~3–4)', () => [/Only ~5 phase IMAGES render per scene/.test(sys) && !/Only ~3–4 phase IMAGES render/.test(sys), '']);
    t('OBJECT-PLACEMENT CONSISTENCY: prose-named location must match wardrobe field (talisman)', () => [/OBJECT-PLACEMENT CONSISTENCY \(HARD\)[\s\S]*talisman at her throat[\s\S]*wardrobe field MUST place it in the SAME spot/.test(sys), '']);

    // (A) Reconciled ceiling in USER prompt (word ceiling ≠ beat ceiling).
    // Ceiling is gated to fling/taste/starter/default tiers at ST1/2 — set a tier that triggers it.
    s.storyLength = 'fling';
    const usr0 = window._buildCGScreenplayUserPrompt(0, '', '') || '';
    t('LENGTH CEILING reconciled: word ceiling, NOT a beat ceiling; coexists with 20–30 floor', () => [/WORD ceiling, NOT a beat ceiling[\s\S]*20–30 beat FLOOR/.test(usr0), '']);
    t('ceiling: "NEVER cut the beat count"', () => [/NEVER cut the beat count/.test(usr0), '']);

    // (C) Scene-1 probe = demand_hint, and the bespoke axis is injected when present.
    t('CG Scene-1 probe kind resolves to demand_hint', () => [window._cgProbeKindForScene ? window._cgProbeKindForScene(0) === 'demand_hint' : /DEMAND\/HINT/.test(usr0), window._cgProbeKindForScene ? window._cgProbeKindForScene(0) : '(helper missing)']);
    t('demand_hint directive present in Scene-1 user prompt', () => [/MICRODECISION FOR THIS SCENE: DEMAND\/HINT/.test(usr0), '']);
    // Without a bespoke axis → generic examples.
    t('no bespoke axis set → generic examples used', () => [/Say it plainly, or let it show\?/.test(usr0) && !/USE THIS EXACT FORK/.test(usr0), '']);
    // With a bespoke axis set → the embodied fork is injected verbatim.
    s._bespokeScene1Axis = 'Name the wish aloud — or let the dimming thread say it?';
    const usr0b = window._buildCGScreenplayUserPrompt(0, '', '') || '';
    t('bespoke axis set → CG injects the SAME embodied fork (matches literary)', () => [/USE THIS EXACT FORK[\s\S]*Name the wish aloud — or let the dimming thread say it\?/.test(usr0b), '']);
    t('bespoke axis set → generic examples suppressed', () => [!/Say it plainly, or let it show\?/.test(usr0b), '']);

    // (WARDROBE) General station+circumstances rule + peer-register guard (in the CG analyzer prompt).
    // _buildStagedAnalyzerPrompt or the schema builder carries it; probe via the exposed builder if present,
    // else scan the system prompt which embeds the schema/wardrobe directives.
    const wardrobeCarrier = (typeof window._buildStagedAnalyzerSystemPrompt === 'function' ? (window._buildStagedAnalyzerSystemPrompt() || '') : '') + sys + usr0b;
    t('WARDROBE = STATION + CIRCUMSTANCES rule present', () => [/WARDROBE = STATION \+ CIRCUMSTANCES/.test(wardrobeCarrier), wardrobeCarrier.indexOf('WARDROBE = STATION') !== -1 ? 'found' : 'NOT in sys/usr — check analyzer prompt']);
    t('peer-register guard present (fixes rags-vs-robes drift)', () => [/PEER-REGISTER GUARD[\s\S]*one in fine robes, one in rags/.test(wardrobeCarrier), '']);

    // (WARDROBE) Manta-poncho underwater canon in the Scene-1 user prompt (gloamwater + human).
    t('UNDERWATER HUMAN WARDROBE (manta-poncho) directive present', () => [/UNDERWATER HUMAN WARDROBE \(HARD — Gloamwater canon/.test(usr0b), '']);
    t('manta-poncho: brief visitor → surface clothing', () => [/BRIEFLY VISITING[\s\S]*NORMAL SURFACE CLOTHING/.test(usr0b), '']);
    t('manta-poncho: long resident → triangular robe, arm-undulation swim', () => [/MANTA-PONCHO: a triangular robe[\s\S]*UNDULATING THE ARMS/.test(usr0b), '']);
    t('manta-poncho: latent wingsuit canon (fall from height)', () => [/glider \/ wingsuit[\s\S]*falls from a great height/.test(usr0b), '']);

    // (WISH PRICE LADDER) fires when a wish is in play (underwater human) — usr0b is gloamwater+human.
    t('WISH PRICE LADDER present when a wish is in play (underwater human)', () => [/FATELANDS — THE PRICE OF A WISH \(HARD canon/.test(usr0b), '']);
    t('ladder has all four tiers T1–T4', () => [/T1 TRIVIAL/.test(usr0b) && /T2 USEFUL/.test(usr0b) && /T3 GRAVE/.test(usr0b) && /T4 WORLD-BENDING/.test(usr0b), '']);
    t('ladder has the six sacrifice currencies', () => [/BODY:/.test(usr0b) && /TIME:/.test(usr0b) && /MEMORY:/.test(usr0b) && /SENSE \/ FACULTY:/.test(usr0b) && /BOND:/.test(usr0b) && /FORTUNE \/ FATE:/.test(usr0b), '']);
    t('water-breathing anchored to T2 (consistency)', () => [/water-breathing talisman lives HERE/.test(usr0b) && /Sustained water-breathing is a T2 boon/.test(usr0b), '']);
    // Three Laws of Sacrifice + hair economy + currency personalities (Roman 2026-07-15).
    t('THREE LAWS OF SACRIFICE present (still-yours / yours-to-lose / diminish-you)', () => [/THREE LAWS OF SACRIFICE[\s\S]*STILL BE YOURS[\s\S]*BE TRULY YOURS TO LOSE[\s\S]*DIMINISH YOU/.test(usr0b), '']);
    t('sacrifice rule is qualitative not quantitative (has this changed who you are)', () => [/Qualitative, never a count[\s\S]*has this permanently changed who you are/.test(usr0b), '']);
    t('currency-personalities concept REMOVED (per Roman)', () => [!/CURRENCIES HAVE PERSONALITIES/.test(usr0b), '']);
    t('HAIR economy: FOLLICLE not strand, never regrows, follicle/patch/head tiers', () => [/THE EVERYDAY COIN[\s\S]*FOLLICLE, not the strand[\s\S]*NEVER regrows[\s\S]*SINGLE FOLLICLE[\s\S]*PATCH[\s\S]*HEAD of hair buys something real/.test(usr0b), '']);
    t('HAIR: cost written on the body (bald heavy wishers) + never meaningful transformation', () => [/WRITTEN ON THE BODY/.test(usr0b) && /NEVER meaningful transformation/.test(usr0b), '']);
    t('ladder enforces same-boon-same-price consistency', () => [/SAME boon always costs the SAME tier/.test(usr0b), '']);
    // Synced canon (2026-07-15): T3 free-will reframe, T4 rewrite limits, open debts, conservation, FF consent.
    t('T3 fix: "clear the barriers" + free will load-bearing (no manufacturing love)', () => [/CLEAR THE BARRIERS[\s\S]*FREE WILL IS LOAD-BEARING[\s\S]*NEVER manufacture love/.test(usr0b), '']);
    t('T4 limit: rewriting a person only works UNGUARDED + granter must consent', () => [/REWRITING A PERSON has hard limits[\s\S]*UNGUARDED self[\s\S]*must CONSENT/.test(usr0b), '']);
    t('OPEN DEBTS trimmed to 4 immutable rules (Fate-timed, inheritable, assumable, unescapable)', () => [/OPEN DEBTS[\s\S]*FOUR immutable rules[\s\S]*MAXIMUM dramatic weight[\s\S]*INHERITABLE[\s\S]*ASSUMED by another[\s\S]*ESCAPED except by PAYMENT/.test(usr0b), '']);
    t('OPEN DEBTS: no longer canonizes storm-magnets / trade / insurance', () => [!/STORM MAGNETS/.test(usr0b) && !/grey market/.test(usr0b) && !/COMPOUNDS while unpaid/.test(usr0b), '']);
    t('NORTH STAR present: reveal CHARACTER before power', () => [/NORTH STAR — REVEAL CHARACTER BEFORE POWER[\s\S]*a sacrifice says who you are[\s\S]*a granter's refusal says what they believe/.test(usr0b), '']);
    t('THE HOOK present: addiction, every wish works, escalation', () => [/THE HOOK[\s\S]*ADDICTION[\s\S]*EVERY WISH WORKS[\s\S]*FINGER to save a child[\s\S]*can no longer stop/.test(usr0b), '']);
    t('HOOK deepening: addiction × alignment feedback loop (experienced ≠ unstoppable)', () => [/FEEDS ON ITSELF \(addiction × alignment\)[\s\S]*ALIGNMENT decays[\s\S]*spiritually UNSTABLE/.test(usr0b), '']);
    t('FF granters are ARTISANS famous for philosophy (which-granter matters)', () => [/GRANTERS ARE ARTISANS, NOT SHOPS[\s\S]*never grants revenge[\s\S]*WHICH granter you seek matters as much as the coin/.test(usr0b), '']);
    t('LAW OF CONSERVATION present (spend something real to you)', () => [/LAW OF CONSERVATION[\s\S]*REAL TO YOU[\s\S]*permanently removed/.test(usr0b), '']);
    t('FF consent gate: pays sacrifice for you, but REFUSES undeserved wishes', () => [/WHO PAYS WHAT[\s\S]*GRANTOR\'S CONSENT IS A GATE[\s\S]*REFUSE/.test(usr0b), '']);
    // (WISH LAWS) companion directive rides the same gate.
    t('LAWS OF WISHING present when a wish is in play', () => [/FATELANDS — THE LAWS OF WISHING \(HARD canon/.test(usr0b), '']);
    t('law: alignment to truth — doubt/deceit WARPS (comic or catastrophic)', () => [/ALIGNMENT TO TRUTH[\s\S]*WARPS the result[\s\S]*comically[\s\S]*catastrophically/.test(usr0b), '']);
    t('alignment EXTENDS to everyone the wish changes (help clean, control warps — agency w/o shield)', () => [/LAW EXTENDS TO EVERYONE THE WISH CHANGES[\s\S]*HELP lands clean[\s\S]*CONTROL corrodes[\s\S]*must RAISE, lovers must EARN/.test(usr0b), '']);
    t('FATE PERCEIVES NOT JUDGES + NEVER IMPROVES (distortion not correction; magic has no wisdom)', () => [/FATE PERCEIVES BUT NEVER JUDGES OR IMPROVES[\s\S]*WISH MAGIC HAS NO WISDOM; ONLY PEOPLE DO[\s\S]*FATE NEVER IMPROVES A WISH[\s\S]*DISTORTION, not correction[\s\S]*gravity, not a physician/.test(usr0b), '']);
    t('guardrail: never write a wish smarter or kinder than its wording', () => [/NEVER write a wish that is smarter or kinder than its wording/.test(usr0b), '']);
    // Scene-1 solo-scene root fix: interlocutor now HARD-required; axis needs an addressee.
    t('Scene-1 INTERLOCUTOR REQUIRED (HARD) — solo monologue is a FAILURE', () => [/INTERLOCUTOR REQUIRED \(HARD[\s\S]*fully solo scene of the protagonist alone with her interior monologue is a FAILURE/.test(usr0b), '']);
    t('interlocutor fix names the exact cascade (dialogue, axis addressee, cloned twin)', () => [/starves the scene of dialogue[\s\S]*NO ONE for her to be direct-or-subtle WITH[\s\S]*CLONING the protagonist/.test(usr0b), '']);
    t('interlocutor fix demands present-tense purpose (why here, what doing), not just backstory', () => [/WHY she is in this place and WHAT she is doing here, not only what happened to her before/.test(usr0b), '']);
    t('demand/hint axis now requires an ADDRESSEE (no speaking to an empty room)', () => [/ADDRESSEE REQUIRED[\s\S]*meets the INTERLOCUTOR present[\s\S]*NEVER frame it as her deciding whether to speak aloud to an empty room/.test(usr0b), '']);
    t('BACKSTORY-FOR-CONTEXT exception: ~50 words to orient a load-bearing name/place', () => [/BACKSTORY-FOR-CONTEXT[\s\S]*UP TO ~50 words[\s\S]*unexplained LOAD-BEARING name[\s\S]*FLASHBACK-INSERT opportunity/.test(usr0b), '']);
    t('axis DISTINCT+EARLY: not the final dilemma / deck closer; do not reuse its wording (1b-sub)', () => [/DISTINCT \+ EARLY \(HARD\)[\s\S]*NOT the deck-mandate closer[\s\S]*Do NOT reuse the closing dilemma/.test(usr0b), '']);
    t('law: stacking multiplies (couple + city-of-mages moon-void)', () => [/STACKING[\s\S]*MULTIPLIES[\s\S]*moon-sized void/.test(usr0b), '']);
    t('law: non-humans pay less, get stronger results', () => [/THE ANOMALOUS PAY LESS[\s\S]*LOWER tier[\s\S]*STRONGER result/.test(usr0b), '']);
    t('law: guarding — wish-away + tattle-on-tamper + wish-guards', () => [/GUARDING[\s\S]*WISHED AWAY[\s\S]*wish-guard[\s\S]*TATTLE/.test(usr0b), '']);
    t('law: society — marriage-as-warding, war-of-wishes, sowing doubt', () => [/MARRIAGE[\s\S]*GIFT wishes of protection[\s\S]*WAR is half bloodshed[\s\S]*SOWING DOUBT/.test(usr0b), '']);
    t('law: sacrifice magic is UNIVERSAL (every resident uses it)', () => [/EVERY resident uses it when they must/.test(usr0b), '']);
    t('law: WISH MARKET — pay a First Favored in Fortunes vs bleed yourself', () => [/A WISH MARKET[\s\S]*PAY a First Favored \(in Fortunes/.test(usr0b), '']);
    t('law: REGIONAL VARIATION is the only thing that changes by place', () => [/REGIONAL VARIATION[\s\S]*accepted currencies of THIS region/.test(usr0b), '']);
    t('law: THE ANTI-WISH CULT reframed around addiction + Wishing Age', () => [/THE ANTI-WISH CULT[\s\S]*sees wishing as an ADDICTION[\s\S]*WISHING AGE[\s\S]*only ones who remember how this ends/.test(usr0b), '']);
    // Personal Sacrifice law (Roman 2026-07-15) — foundational; fires on every Fatelands scene.
    t('PERSONAL SACRIFICE: the wisher is always the one who pays (one account, same person)', () => [/PERSONAL SACRIFICE[\s\S]*wisher is ALWAYS the one who pays[\s\S]*must be the SAME person/.test(usr0b), '']);
    t('Personal Sacrifice: no substitutions / batteries / sacrificial slaves', () => [/No substitutions, proxies, magical batteries, or sacrificial slaves/.test(usr0b), '']);
    t('Personal Sacrifice: coercion is PSYCHOLOGICAL, villains never spend others\' sacrifices', () => [/COERCION still exists but changes form[\s\S]*villains NEVER spend other people's sacrifices directly[\s\S]*PSYCHOLOGICAL, never mechanical/.test(usr0b), '']);
    t('Personal Sacrifice: WISH-LOCKS deny alignment (not turn magic off)', () => [/WISH-LOCKS do not turn magic off[\s\S]*a clean ALIGNED wish cannot form/.test(usr0b), '']);
    t('Personal Sacrifice: hero pays their OWN price (Fate knows only truth + sacrifice)', () => [/Fate recognizes neither ownership nor authority — only truth and sacrifice[\s\S]*paying their OWN price/.test(usr0b), '']);
    // and it fires on EVERY Fatelands scene (Veilwood, no wish in play) since it is in the Laws directive.

    // Gate: LAWS are broadened to ALL Fatelands scenes; PRICE ladder stays gated to wish-in-play.
    s.fantasyRegion = 'the_veilwood'; s._liSpecies = 'first_favored';
    s.volatility_window = null; // ensure a truly dry scene (no live Fate act)
    const usrDry = window._buildCGScreenplayUserPrompt(0, '', '') || '';
    t('LAWS fire on ANY Fatelands scene (Veilwood, no wish in play)', () => [/THE LAWS OF WISHING/.test(usrDry), '']);
    t('PRICE ladder does NOT fire when no wish is in play (Veilwood)', () => [!/FATELANDS — THE PRICE OF A WISH \(HARD canon/.test(usrDry), '']);

    return out;
  });

  await browser.close();
  let pass = 0, fail = 0;
  console.log('\n  CG BEATS + CAUSAL SPINE + SCENE-1 AXIS  ($0)\n  ' + '─'.repeat(58));
  for (const r of R) { r.pass ? pass++ : fail++; console.log('  ' + (r.pass ? '✓' : '✗') + ' ' + r.name + (r.detail ? '  · ' + r.detail : '')); }
  console.log('  ' + '─'.repeat(58) + '\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
