# Fatelands — Regional Forms of Public Wishing (Bible Addendum)

> Canon reference. The code encoding lives in `public/app.js`:
> `_REGIONAL_WISH_FORMULAS` (data) + `_buildFormalPublicWishDirective(regionKey)` (author directive),
> wired into the wish-demo opener (`_buildFatelandsWishDemoOpenerDirective`) so **the first wish in a
> user's first Fatelands story is spoken in the full formal form** — a new reader senses at once it is
> not a throwaway musing. $0 test: `_wish_formula.js`.

A **private** wish may be spoken plainly ("I wish the door were open," and Fate may hear). But before a
crowd, court, congregation, ship's company, family line, or ritual witness, most cultures use a formal
regional declaration. These forms **do not compel Fate** and do not guarantee the offered sacrifice is
accepted; they make the bargain publicly **legible**: what is desired, what is claimed, what is offered,
who witnessed, and whether the wisher submitted honestly to Fate's judgment.

## The five elements of a formal wish
1. **Invocation** — the bargain is addressed to Fate.
2. **Standing** — the principle, identity, duty, or truth the speaker wishes *from*.
3. **Petition** — the desired outcome.
4. **Offering** — what the speaker is willing to surrender.
5. **Submission** — Fate chooses the answer and the actual price.

No regional formula overrides the Eight Orders, the cost bands, Personal Sacrifice, or Fate's right to
choose the payment. **The wisher declares. Fate decides.**

## Each region fears a different failure
| Region | Form | Central fear |
|---|---|---|
| **Vaelryn Reach** | The Witnessed Declaration | false standing / unwitnessed identity |
| **The Ashen Verge** | The Anchored Wish | returning as a self your oath-bound witness can't recognize (the Fold; **not** a martial society outside the Fold's guardians) |
| **Lytharyn** | The Stated Proposition | confusing desire with method |
| **The Thornwild** | The Cursed Asking | pretending the monster is separate from the self (a wish **cannot** lift a curse — only bind/dampen/delay) |
| **Gloamwater Bay** | The Tidal Asking | mistaking return for restoration without change |
| **Pulse Point / Meridian Coast** | The Open Ledger | hidden liability / unrecorded Debt |
| **The Shackle Isles** | The Unbound Claim | transferred identity / involuntary payment |
| **The Veilwood** | The First Favored Declaration | Fate answering the concealed desire (First Favored are **direct** — ornate but never evasive) |
| **Unmoored Isles** | The Provisional Wish | loss of continuity when place/memory shift |
| **Interregional** | The Open Form of Fate | the shared minimum (unwitnessed / transferable / Fate-compelling) |

## Regional formulas
Each region's **formal** form, **short** form, and a typical **witness response** are stored verbatim in
`_REGIONAL_WISH_FORMULAS`. Example — **Gloamwater Bay, The Tidal Asking** (the underwater Kwisheen enclave):

> **Formal:** "Fate beneath the turning tide, hear what I release and what I ask to return. I wish that
> [WISH]. I offer [SACRIFICE], not as a purchase but as that which I am willing to let the water carry
> from me. If the wish cannot return in the form I name, return the nearest truth of it. Take no more than
> its lawful depth, and leave the mark where the tide may show it."
>
> **Short:** "As the tide takes and returns: I wish [WISH]. I release [SACRIFICE]. Fate, return what the
> bargain allows."
>
> **Witness:** "What leaves is named. What returns is Fate's answer."

## Revised generation distinctions (authoritative for these three)
- **Ashen Verge** — the Fold (a tesseracting wound; two oath-bound people enter, face every possible self,
  return final or not at all). Central fear: *which self returns, and will the one bound to me recognize
  it?* Do **not** default to military language outside the Fold's permanent guardians.
- **Thornwild** — human-presenting monsters, each bearing a **deserved** curse. Wishes can only bind /
  dampen / delay, never cure. Distrustful, predatory, owns its monstrosity. Do **not** portray as gentle
  confessors seeking easy redemption.
- **Veilwood** — homeland of the First Favored: **direct, unsubtle, explicit about desire**, resistant to
  euphemism. Formal language may be ornate but is never evasive. Central fear: *Fate answering the desire I
  concealed beneath the wish I declared.* Do **not** portray as rustic, minimalist, or cryptically mystical.

## Generation guidance
- Use the regional formula as a **cultural structure**, not word-for-word every time; preserve its
  recognizable phrases and priorities.
- State the actual wish and any offered sacrifice **clearly**.
- **Never** phrase the offer as a completed trade; **never** imply the formula compels Fate.
- Let witnesses answer per regional custom when dramatically useful; let the ceremony reveal the culture's
  deepest anxiety about wishing; keep the governing desire legible beneath ceremony.
- Follow the declaration with the required **omen → answer → actual (adjacent) payment → reactions →
  consequences**.
- A character may shorten, corrupt, modernize, mock, or deliberately violate a formula when that reveals
  character — but **the first public wish a new reader sees is spoken in the full, weighty form.**
- Using another region's formula is culturally meaningful.
