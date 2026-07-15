# Fatelands Canon — Wish Magic & Gloamwater Bay

*Reference sheet, established 2026-07-15. Source of truth for the wish-cost ladder, the
laws of wishing, and Gloamwater/underwater rules. The live directives that inject this into
the author prompt live in `public/app.js`: `_buildFatelandsWishPriceDirective`,
`_buildFatelandsWishLawDirective`, and the underwater-survival + manta-poncho blocks in
`_buildCGScreenplayUserPrompt`.*

> **How to evolve this document (read before adding anything).** This holds the *foundational laws
> only*, and it is considered **frozen**. Resist adding new rules — at this point almost every new
> rule trades away mystery or constrains future stories. Evolve the world through **fiction**
> instead: introduce a legendary granter with unusual ethics, reveal an inherited debt generations
> later, show a three-woven guard broken in an unforgettable heist, let readers meet regional customs
> through characters rather than encyclopedia entries. A phenomenon graduates *into* this canon only
> if it recurs across multiple stories **and** readers keep asking "how does that work?" Until then,
> the world stays surprising.

## The Premise: Sacrifice Magic

Fatelands runs on **sacrifice magic**. It is **ordinary, not exotic** — *every* resident uses
it when they must. Anyone can wish for anything, but **every boon is bought**, and **Fate keeps
exact accounts**. Nothing is free, nothing is forgotten, and no price ever comes back.

### Law of Conservation (why Fate requires payment)

A wish **cannot create** — it can only **trade**. To bend reality you must spend something that is
**real to you**: a piece of your own life, body, memory, bond, or fortune, **permanently removed
from the world**. This is *why* every price is personal and why it must be truly yours to give —
you are not paying a toll, you are feeding the wish with a part of your own reality. It also unifies
the system: the sacrifice must be real to you *(conservation)* and aligned to your truth
*(first law, below)* — the same requirement seen from two sides. Sacrifices feel inevitable rather
than punitive because a miracle is, literally, made of something that was yours.

---

## NORTH STAR: everything magical reveals CHARACTER before it reveals power

The single lens for putting wish magic on the page — for authors and for the Storybound generation
pipeline alike: **magic is a window into people, not a special effect.**

- A **sacrifice** says who you are.
- A **ward** says what you fear.
- A **wish** says what you truly desire.
- A **talisman** says what you've already paid.
- A **granter's refusal** says what they believe.

Deploy every wish, price, guard, and artifact so it discloses a *character* first and a *capability*
second. If a magical moment isn't telling us about someone, it's decoration — cut it or recast it.

---

## THE PRICE OF A WISH (cost ladder)

**Scaling law:** a wish's cost scales with **Power × Permanence × how much it serves only the
wisher.** The *same* boon always costs the *same* tier — a water-breathing talisman that cost a
year of life never later costs a fingernail. A mismatch (a life-saving miracle bought for a
hangnail; a parlor trick that costs your firstborn) means a world with no rules.

**The four tiers (boon → cost band):**

- **T1 — Trivial** *(a parlor trick; breathe water for minutes; a lucky toss)* → a fingernail, a
  lock of hair, an hour of life, a trivial memory. Often pay-per-use.
- **T2 — Useful** *(breathe water for a season/indefinitely via a talisman; heal a bad wound;
  always land on your feet; a night of borrowed beauty)* → **a year of life**, a
  survivable-but-cherished memory, a finger, one color from your sight, a run of your luck.
- **T3 — Grave** *(survive certain death; **clear the barriers so someone can genuinely see you**;
  undo a real mistake; speak with the drowned)* → a decade of life, **a formative memory (your
  mother's face)**, your fertility, your voice or an eye, your true name, being forgotten by one you
  love.
  - **NOTE (free will is load-bearing):** you cannot *manufacture* love or loyalty — that would
    rewrite another person's agency, which is a **T4** effect (see below). What T3 buys is the
    removal of obstacles between you and an *honest* response: it clears noise, undoes a
    misunderstanding, buys you the moment or the courage. The other person still chooses. Bought
    devotion isn't love; it's a puppet, and per the first law a wish made against another's truth
    tends to **warp**.
- **T4 — World-bending** *(cheat death for good; **rewrite who someone is**; become other than
  human; unmake an event)* → the capacity to love or feel joy, your whole childhood, your reflection
  or shadow, your firstborn, most of your remaining years — or an open debt Fate names later.
  - **Rewriting a person — the hard limits (why the world isn't ruled by identity-thieves):** an
    identity can only be rewritten if it is **unguarded**. A warded self *resists* in proportion to
    the strength of its wards — which is exactly why rulers, spouses, and anyone of consequence go
    **warded** (see Guarding), and why a beloved ruler, warded by their people's stacked protective
    wishes, is nearly untouchable. On top of that: the cost is **ruinous** (top-of-band T4); a
    **First Favored granter must consent** and will refuse to help you overwrite a rival; and per
    the first law a rewrite that fights the target's **deep truth warps**. So identity-rewriting is
    real, dreaded, and rare — expensive, resistible, and refused — not a tyrant's routine tool.

**The six currencies of sacrifice** (cheapest → dearest within each):

- **Body:** hair / fingernails → blood → a finger → an eye, your voice, your fertility → a hand,
  your own face
- **Time:** an hour → a day → a year → a decade → most of the years you had left
- **Memory:** last week's supper → a learned skill → a first kiss → a childhood / your mother's
  face → who you are
- **Sense / Faculty:** one color → the taste of your favorite food → music → your dreams → the
  ability to feel joy or to love
- **Bond:** a stranger's goodwill → your good name → being forgotten by one person you love → a
  whole relationship → being unknown to everyone
- **Fortune / Fate:** a run of small luck → a future windfall → your child's luck → an open debt
  Fate collects at the worst possible time

### The Three Laws of Sacrifice (what Fate will and won't accept)

Metaphysics does the work here — no ban-list. An offering must pass all three:

1. **It must still be yours.** A *living, attached* part of you — hair on the scalp, blood in the
   vein. Once your body has discarded it, it is no longer yours in Fate's eyes: hair clippings, nail
   clippings, shed skin, voided waste, a baby tooth, an amputated limb are all just matter.
2. **It must be truly yours to lose.** Not what disease has already taken from you (a tumor, an
   infection, a parasite, necrotic tissue — those are injuries, not possessions) and not what the
   body is actively ejecting (earwax, sweat, pus, stool). The universe doesn't recognize those as
   sacrifices.
3. **It must diminish you.** Sacrifice isn't about removing *mass* — it's about *reducing your
   life*. A finger, an eye, a year, your singing voice, your mother's face, your fertility each make
   you permanently *less than you were*. One skin cell, one eyelash, one freckle do not; they're
   beneath the threshold. **Qualitative, never quantitative** — Fate isn't counting atoms, it's
   asking *"has this permanently changed who you are?"*

> **The rule, in one line:** *Fate accepts only living, meaningful sacrifices — the offering must
> still belong to the giver, be truly theirs to lose, and permanently diminish them in some
> significant way. It refuses what the body has already discarded, what disease has already taken,
> what nature is already removing, or what is too trivial to matter.*

Borderline cases the rule resolves cleanly: a **scar** — no (already a loss; you don't get paid
twice). A **mole** — no (beneath significance). A **tattoo** — *maybe* (you chose it; it's part of
your identity, so a *meaningful* one can be spent). **One beard hair** — no; **the ability to ever
grow a beard again** — yes, where that's culturally significant. **Singing voice only** (you can
still speak, never sing) — a beautiful T2.

### Hair — the everyday coin (this is what makes Fatelands feel unique)

Tiny wishing is woven into daily life, and it runs on hair. Two rules make it work:

- **The unit is the FOLLICLE, not the strand — and a spent follicle never regrows.** This is the
  anti-exploit: you can't shave, wait a month, and harvest 20,000 fresh wishes. What's spent is gone.
- **A lifetime of casual wishing is written on the body.** A human has ~100,000 follicles spread
  across the body; spend them freely and by fifty you're visibly sparse, by eighty nearly hairless.
  You can *read* a person's wish-history in their thinning hair — which makes a **barber** half
  accountant, half confessor ("you've lost a lot around the temples lately"). Different cultures
  spend different hair: a noble sheds leg-hair first, a dwarf never touches the beard, a monk shaves
  anyway.

The scale (Roman's ruling):

- **A single follicle → a tiny favor:** keep the tea hot, perfect makeup for an evening, breathe
  water for a few minutes, keep ink from smudging, seal a tamper-tell on a contract, a lucky coin
  toss.
- **A thumb-sized patch → a bigger one:** land a good catch, hold a seam perfectly straight all day.
- **Your whole head of hair → something real:** luck carried through a battle.

Hair buys the *ephemeral / cosmetic / precise / convenient* — **never meaningful transformation**
(that costs blood, years, memory, a name). It's the electricity of Fatelands: small miracles
everywhere, cumulative cost etched into the body.

**Rules:**

1. A paid price never returns, and deferred/unpaid debts **compound**.
2. *What* a character agrees to pay **characterizes** them — payment is a story beat, never
   bookkeeping.
3. A wish spent to help **another** may be discounted a tier or paid in a gentler currency; a
   purely selfish or reality-cheating wish pays **top-of-band**.
4. Once a boon's price is set, it stays.

---

## OPEN DEBTS (deferred price)

When a wish is too large to pay at once, or the wisher defers, Fate opens a **debt**: the boon is
granted now, the price collected later. A debt is a loaded gun the reader knows will fire — only the
timing is hidden. **Four immutable rules; everything else is discovered through stories, not
canonized in advance** (keep the terror simple — the danger is "they took an open debt," not a
commodities market):

- **Fate chooses the moment of collection.** Never on a schedule — always the moment of maximum
  weight (the wedding, the child's first breath, the eve of victory).
- **A debt is inheritable.** Unpaid at death, it passes down the bloodline; most "family curses" are
  an ancestor's deferred wish, and a protagonist can inherit a debt they never made.
- **A debt may be voluntarily assumed by another.** A parent for a child, a lover for a lover — one
  of the setting's great sacrificial gestures.
- **A debt cannot be escaped except by payment.** No ward, no trade, no clever exit clears it. Only
  paying does.

---

## THE LAWS OF WISHING (how wishes behave)

- **Alignment to truth (first law):** a wish lands cleanly *only* when aligned to what the wisher
  truthfully wants and believes. **Doubt, a divided heart, self-deception, or a lie in the wording
  warps the result** — sometimes comically (a wish for "respect" from someone who secretly
  despises themselves returns as hollow, mocking deference), sometimes catastrophically (a
  half-hearted wish for safety opens the very door it meant to bar). Wishing against your own truth
  is the most dangerous thing a person can do.
  - **The law extends to *everyone the wish changes*.** A wish lands cleanest when it serves the
    deepest truth of everyone it touches; the more it must **fight another person's truth**, the more
    **expensive, unstable, or warped** it becomes. This is why the world protects agency with **no
    special shield**: **help** lands clean (*heal her, let him breathe, give him courage*) because it
    serves the target's truth; **control** corrodes (*make him obey, make her love me*) because
    control is a rewrite, and a rewrite fights another's truth. You don't get loyalty — you get
    terror; you don't get love — you get a hollow, obsessive simulacrum. Parents must *raise*, lovers
    must *earn*, kings must *deserve* — not because a kind wish redirects them, but because the
    coercive wish **warps**.

- **Fate perceives, but never judges or improves — the deepest law: *wish magic has no wisdom; only
  people do*.** Fate *perceives* everything Alignment requires — whether you're lying to yourself,
  whether two people are truly aligned, whether you're fighting another's truth — because those are
  what the first law runs on. But it never *judges*: it does not decide "you actually wanted this,"
  offer a healthier version, or solve the underlying problem. **Fate never improves a wish** — when a
  wish conflicts with truth, Fate does not reinterpret, repair, or rescue it; it grants the wish by
  its laws and the contradiction resolves through **distortion, not correction.** Fate is not
  benevolent, not malicious, not a lawyer, not a therapist — it is **indifferent: gravity, not a
  physician.** (A mother who wishes *"stop my baby crying"* over a starving child gets exactly that —
  the crying stops, the hunger doesn't. The tragedy is her misunderstanding, never Fate's malice, and
  the wisdom she needed had to be *hers*.)

- **Stacking (wishes multiply):** two or more wishers aligned to the *same* truth pool their
  wishes and the power **multiplies, not adds** — a couple's shared wish outstrips either alone; a
  whole city of mages, wishing as one, once split and warped a **moon-sized void** out of the sky.
  **Numbers + alignment beat raw individual sacrifice.**

- **The anomalous pay less → a wish market:** First Favored, Kwisheen, and other non-humans pay a
  **lower tier** and get a **stronger result** — their anomalous nature bends Fate more cheaply (a
  boon costing a human a year of life might cost a First Favored a night's sleep). So a **trade**
  exists: rather than lose a finger or a year of their own, most people **pay a First Favored (in
  Fortunes — coin)** to grant a larger boon at that cheaper rate. Professional wish-granting is a
  respected, lucrative craft; a First Favored granter is a fixture of any real town.
  - **Who pays what:** the human pays only **Fortunes** (coin); the **First Favored pays the actual
    sacrifice** out of their own cheaper anomalous nature. The human's flesh, years, and memory stay
    intact — that's the whole appeal.
  - **The grantor's consent is a gate (and a character):** a First Favored will only grant a wish
    they **want** you to have. If they judge it undeserved, petty, or cruel — *"that's a shitty
    wish," "you don't deserve that"* — they simply **refuse**. So a First Favored granter is a moral
    filter on the setting's power, a gatekeeper with taste and opinions, and a natural source of
    conflict: the boon you need may hinge on convincing someone who finds you wanting.
  - **Granters are artisans, not shops — famous for their *philosophy*, not their power.** Every
    First Favored is anomalously efficient, so power isn't what distinguishes a renowned granter —
    their **ethics** are. Reputations precede them: *"She never grants revenge wishes." "He'll save
    any child, even if you can't pay." "She always asks for the truth first." "Don't go to Old Brine —
    he'll grant anything if the coin is good."* This makes **which granter you seek as important as
    the payment you bring**: a protagonist with the coin may still be turned away, or have to journey
    to the one granter whose principles fit their wish (or, worse, to the one who has none).

- **Guarding (wishes are attackable):** an unguarded wish can be **wished away**. Important
  wishes — a contract, a bond, a life — are guarded with *other* wishes (warded personally, or by
  a paid professional **wish-guard**). A guard can also be set to **tattle**: to reveal,
  unmistakably, if anyone tampered with the wish beneath it. Anything valuable and unguarded is
  vulnerable.
  - **Guards can be guarded — but the real art isn't a taller stack.** A guard on a guard on a guard
    just raises the cost and can always be out-spent. The master craft is the **three-woven guard**:
    three wishes bound so that each continuously alters the other two. The threads never rest and
    never repeat, and no thief can predict which one protects the heart at any given instant — to
    breach it you would have to be right about all three at once, in the same breath. Cracking a
    three-woven guard is a genuine feat, and a great heist.

- **Regional variation** (the *only* thing that changes by place): the system is universal, but
  *which* sacrifices are **acceptable** is local — one court abhors paying in memory, another in
  blood; the tidal Kwisheen of Gloamwater reckon in tides and salt.

- **The anti-wish cult** (secret faction — antagonist / uneasy ally / dread): a hidden order that
  sees wishing for what it really is — an **addiction** (see The Hook, below) that hollows out
  people one sacrifice at a time and, at scale, hollows out the world. They swear **never** to use
  the power and work — quietly, sometimes violently — to stop others. To them a wish-granter is a
  dealer and a warded marriage is a relapse.
  - **They may be right.** They aren't wrong that every wish costs and every wisher escalates; their
    scripture points to a **Wishing Age** when a whole civilization, unable to stop, wished at a
    scale that **tore something real out of the world** — the wound Fate's Favor is still slowly
    healing. The live question isn't *"are they villains?"* but *"are they the only ones who remember
    how this ends?"*

- **Society runs on all of this:**
  - **Marriage / naming / coronation** is not only a celebration — it's the community gathering to
    **gift wishes of protection** onto the couple/child/ruler, warding off evil eyes and enemies'
    wishes. More guests, truer and more powerful = a stronger ward.
  - **War** is half bloodshed and half a **war of wishes**, decided by how much each side will
    sacrifice and how many *true, aligned* allies they can muster.
  - So the quiet art of war, business, **and love** alike is **sowing doubt** — unsettle an
    enemy's certainty and their own wishes warp and fail from within.

### Institutions (a civilization built on wishes)

A full professional and civic layer grows on top of the laws — a wish-society feels different at
every level:

- **Banks** that store warded Fortunes and hold guarded wish-contracts in escrow.
- **Alignment validators** — official witnesses whose job is to confirm a wish (or an oath, or a
  marriage vow) is *truly aligned* before it's cast, so it won't warp.
- **Professional ward-builders** (including marriage ward-builders), **wish-guards**, and
  **anti-tampering inspectors**.
- **Wish auditors** and **forensic wish investigators** who reconstruct what was wished, by whom,
  and whether a tamper or a warp is behind a disaster.
- **Inheritance wards**, **election wishes**, and **harbor wishes**.

*(These are the universal shapes. Specific, named institutions — a particular kingdom's academy,
guild, or court of wishing — belong in that setting's own regional lore, not in these world laws.)*

---

## THE HOOK (why wishing is dangerous — it's an addiction)

Wishing is **psychologically addictive** — not chemically. The trap is simple: **every wish works.**
Once you've learned you can solve a problem by sacrificing, it becomes very hard to solve one any
other way.

Watch the escalation in a single life: someone loses a **finger** to save their child; a year later,
an **eye** to save their marriage; then **ten years**; then **memories** — until they no longer
remember solving problems any other way. The most frightening wish-granters aren't the greedy ones —
they're the quiet ones who fix everything with *one more sacrifice*, because it has always worked
before.

**For the pipeline / the page:** write heavy wishers not as villains but as people who can no longer
stop — the horror is that the magic never fails them. *Every wish works. That's why it's dangerous.*

### The trap tightens itself (Addiction × Alignment)

The two laws feed each other into a spiral, and this is the most important interaction in the whole
system. Because wishing is addictive, a heavy wisher slowly stops confronting reality on its own
terms — and grows more **self-deceptive, desperate, divided, and afraid**. But those are exactly the
states that break **Alignment (the first law)**. So the curve isn't simply *more wishes → higher
prices*; it's:

> more wishes → less honest with yourself → worse alignment → more warped wishes → another wish to
> fix the last one → …

The tragic payoff: experienced wishers are **not** automatically unstoppable. The more they've
leaned on the power, the more **spiritually unstable** they become and the more their own wishes
betray them. A veteran at the height of their dependence is more dangerous to *themselves* than any
novice — which is why the truly formidable wishers in a story are often the disciplined ones who
wish *rarely*, and the truly doomed ones are those who've solved everything this way for years.

And note what this *isn't*: it is **not Fate punishing** the wisher. Fate is indifferent (see the
first law). It is the inevitable cost of leaning on an immense tool without growing wiser — the tool
has no wisdom to lend, it only ever spends what you already are. *Wish magic has no wisdom; only
people do.*

---

## GLOAMWATER BAY (the Kwisheen tidal enclave — underwater)

- **Humans can't survive the depths by nature.** A human at depth must have breathing/movement
  **purchased and explained on the page** — never just floating and talking with no reason. It's
  always either a **wish paid in sacrifice** or a **magic artifact** (a water-breathing talisman,
  gilled charm, bargain-token). **Sustained water-breathing = a T2 boon** (a year of life or
  equivalent); a single brief dip may be T1.
  - *Flavor lines:* "You sacrificed a **year of your life** to breathe water — for him." / "I'll
    tear that water-breathing talisman off your neck myself."

- **Human wardrobe underwater depends on how long they stay:**
  - **Briefly visiting** (a diver, a guest, a first descent) → their **normal surface clothing**,
    which drifts and billows in the current.
  - **Living there a long time** (resident, captive, long embed) → the Kwisheen make them a
    **manta-poncho**: a triangular robe reaching to both wrists and ankles, so the human swims like
    a **manta ray by undulating the arms** in slow waves instead of kicking and flailing. On land
    it simply reads as a triangle-cut robe.
  - **Latent property (don't force it):** the manta cut also works as a **glider / wingsuit** — if
    the wearer ever falls from a great height, it catches the air and they can plane down. *(A fun
    plot twist to deploy only if a fall actually happens.)*

---

## Related general rule (all worlds, not only Fatelands)

A character's wardrobe should read their **station** (rank, wealth, class, profession) and
**circumstances** (activity, setting, weather, duration). Two peers in the same setting dress at a
similar register — never one in finery and one in rags unless the story establishes why.
