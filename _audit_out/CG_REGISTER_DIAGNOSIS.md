# CG prose register — what the five live scenes demonstrate (2026-10-06)

Provider-free throughout. No generation. Diagnostics, not quotas.

## 1. Where the choppiness originates

**Not downstream.** Measured on the RAW author responses, before any processing:

| | beats | 1 sentence | words/beat (mean · median) | over the old cap |
|---|---:|---:|---:|---:|
| narration | 92 | **90 (98%)** | 11.0 · 10 | 2 |
| dialogue | 17 | 12 (71%) | 9.2 · 9 | 0 |
| exposition | 1 | 1 | 13.0 · 13 | 0 |

The author emits one-sentence narration 98% of the time. No `[STAGED:PARSE]` line appears in the
live console, so the splitter did not reshape these scenes. **The register is set upstream.**

**CORRECTION — the "processing contradiction" I reported does not exist.** I raised
`MAX_SENTENCES_PER_BEAT` from 2 to 4 to match the CG contract's "commonly two to four sentences".
That was wrong, and it is reverted.

`_splitOversizedBeats` is called from exactly one place: `_parseStagedAnalysis`, reached only from
`_runStagedAnalysis`, which prompts **gpt-4o-mini** with `_buildStagedSystemPrompt`. That is the
**staged prose-to-beats path**. The CG screenplay path emits the renderable plan directly — its own
prompt says *"No prose-to-beats analysis step downstream"* — and **never passes through the
splitter at all**. That, not "it didn't need to fire", is why the live scenes logged no
`[STAGED:PARSE]` line. And the staged prompt that *does* govern that path asks for **"1-2 sentences
per beat. ABSOLUTE MAXIMUM: 3"**, so a cap of 2 was already consistent with its own contract; 4
would have permitted beats that prompt forbids.

**What the cap actually does on its own path**, exercised through the shipped function
(`_splitter_path_control.mjs`, 13/13):

| input | result |
|---|---|
| 3-sentence narration beat | split into 2 pieces; **no word lost**; all pieces stay narration; only the first keeps the closeup |
| 4-sentence narration beat | split into 2 pieces; nothing dropped |
| deliberate 1-sentence beat | **passes through unchanged** |
| 3-sentence dialogue beat | split; every spoken piece keeps a speaker |

**Two is a hard maximum on that path**, and splitting raises the beat count, so the reader taps
more times to cross the same prose. "Commonly two to four" is the CG contract's phrasing and is
**not itself a hard maximum** — nothing enforces four anywhere; it is guidance to one author on a
different path.

**So one real finding remains for the CG register: the exemplars were one-sided.** The permission
to develop a beat carried **no example**, while the HARD rule immediately below it ("GRAMMATICAL
CAPTIONS") carries a GOOD example that is a single tight sentence, next to the words "Terse is
good". The only beat the author was ever SHOWN was one sentence. A paired exemplar now shows a
deliberate one-line beat AND a developed one, closing with "The second is not better than the
first", so neither reads as the target.

**The shared example is story-neutral.** The first version named Julian, the presiding Dohkar and
The Answer — First Sacrifice's cast and artifact — inside a prompt **every Book receives**. That was
a leak of one story's material into another's prose model. The example now uses no names, places or
objects, and says so in the prompt itself: *"These are ILLUSTRATIONS of pacing only: no names,
places or objects from them belong in your scene."*

What the contract already said, and still says, unchanged: *"do not settle into a uniform rhythm of
either"* and *"connect action, perception and character voice so the prose reads as someone living
it rather than a camera listing movements."* The instruction was there; the demonstration was not.

## 2. Qualitative reading, narration separate from dialogue

**Dialogue is the healthier channel.** 17 lines, mean 9.2 words, and they carry voice and pressure:
*"Let them see how aligned we really are, Julian."* · *"Her conduct is mine to answer."* ·
*"Ask me in front of them, then."* These are sharp one-liners doing real work — the target register
already, and nothing here should change them.

**Narration is where the register fails.** At 11 words and one sentence, 98% of the time, it reads
as a camera listing movements: each beat reports one isolated action, then stops. Sustained runs
show it plainly — in Scene 5, seven consecutive beats each move exactly one body part or object.

**Repeated atmospheric openings** across the five scenes:
`x4 "The scar on..."` · `x3 "The words land..."` · `x3 "Julian has not..."` ·
`x3 "The Answer lies..."` · `x3 "The clearing has..."` · `x3 "The presiding Dohkar..."`

**Generic reactions** recur as a closing move: a gaze that "stays fixed", "registering the shift
without stopping it" appears in both the Scene 2 and Scene 6 history notes as the summarised event.

## 3. Two editorial examples

**EDITORIAL EXAMPLES — hand-written ILLUSTRATIONS of direction only.** They are not generated
output, not a claim about what the model would produce, and not a claim of exact preservation of
every original detail. They add no plot, and they keep the events, choices, knowledge and canon of
the scenes they are drawn from.

### Example A — Scene 5, the handover

**As generated** (seven beats, each one action):
> The Answer is still in my hands when I step forward.
> I press it into Julian's palm before the Dohkar can speak again.
> LIRAEL: "Let them see how aligned we really are, Julian."
> The clearing holds its breath around us.
> Julian's fingers close over the Answer without hesitation.
> His wrist turns, the scar hidden again beneath the sash.
> The presiding Dohkar watches.

**Edited for register** (the dialogue line is untouched and stays its own beat):
> The Answer is still in my hands when I step forward, and I press it into Julian's palm before the
> Dohkar can speak again.
>
> LIRAEL: "Let them see how aligned we really are, Julian."
>
> His fingers close over it without hesitation — no question, no glance at the rings of watching
> faces. His wrist turns as he takes it, and the scar goes back under the sash where it lives.
>
> The presiding Dohkar watches.

Same seven events, same order, same canon. Two beats keep their single line because the moment is
complete at one; the handover and the concealment are joined because they are one movement.

### Example B — Scene 6, the step back

**As generated:**
> I step back from Julian, the space between us suddenly wider than the clearing itself.
> The Answer still rests in his palm, its weight no longer mine to carry.
> Seren stays kneeling on the grass, her small frame still as stone.
> Julian does not move to follow me.

**Edited for register:**
> I step back from Julian. The Answer stays in his palm, and I feel the lightness where its weight
> used to sit — I gave that away myself, in front of all of them.
>
> Seren is still kneeling on the grass, small and unmoving.
>
> Julian does not move to follow me.

The closing one-liner is deliberate and preserved. "Its weight no longer mine to carry" becomes
something Lirael notices in her body rather than a caption explaining the symbolism to the reader.

## 4. What is NOT claimed

The prompt permitted this register before today and the output did not show it, so **permission is
not the proof**. What changed is one real processing contradiction and one exemplar asymmetry —
both verified to reach the actual outgoing request (`_register_wiring_control.mjs`, 10/10, built
through the shipped `_buildCGScreenplaySystemPrompt`).

**Whether the author's rhythm actually changes needs a separately authorized live test.** Nothing
here demonstrates it, and the style is NOT fixed — the prompt permitted this register before today
and the output did not show it.

The wiring control now asserts **only against a request intercepted on its way out of the app**
(316,988 chars, captured at `/api/proxy`, driven through production's own `_runCGScreenplayGen`).
It calls no prompt builder directly and reads no source file; **if no request is captured, every
check is unproven and the control fails.** That stricter control immediately caught a real defect
the previous one missed: the new exemplar ran straight into the rule below it
(`"moment held more.- ACROSS THE SCENE"`), with no line break. Fixed, and now asserted.

No polishing model, blanket length rule or memory system was added. No minimum sentence count and
no per-beat interpretation requirement. Scene 1, the OAS register and projection paragraphing are
untouched. The canon leak and the competing wish references remain separate open work; the lane's
prohibition has NOT been turned into a global ban on mentioning names.
