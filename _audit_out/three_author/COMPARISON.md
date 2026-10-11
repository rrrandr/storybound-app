# Three-author comparison — one frozen Scene 2 request

Frozen from `wire/019_req.json`: 2 messages, 268,775 UTF-8 bytes, max_tokens=8000, temperature=0.85. Identical messages to all three arms.

| arm | requested | returned | finish | prose words | beats | schema | latency |
|---|---|---|---|---|---|---|---|
| A | `grok-4-1-fast-reasoning` | `grok-4.3` | stop | 190 | 12 | beats array of 12 | — |
| B | `ministral-8b-2512` | `ministral-8b-2512` | stop | 773 | 23 | beats array of 23 | 79095 ms |
| C | `ministral-3b-2512` | `ministral-3b-2512` | stop | 0 | 0 | INVALID | 32781 ms |


## ARM A

```
requested      : grok-4-1-fast-reasoning
returned       : grok-4.3
upstreamAttempts: null
finish_reason  : stop
usage          : {"prompt_tokens":59673,"completion_tokens":3515,"total_tokens":63826,"prompt_tokens_details":{"text_tokens":59673,"audio_tokens":0,"image_tokens":0,"cached_tokens":128},"completion_tokens_details":{"reasoning_tokens":638,"audio_tokens":0,"accepted_prediction_tokens":0,"rejected_prediction_tokens":0},"num_sources_used":0,"cost_in_usd_ticks":848393500}
latency        : n/a (from the fresh run)
extraction     : parsed=true beats=12 words=190
```

The Dohkar's voice slices through the clearing like a blade finding its mark.

THE DOHKAR: "Lirael. You will remain."

The assembly's eyes turn as one, the weight of their attention pressing against my skin like the ritual's own gaze.

Seren remains kneeling, composed, her small hands folded as if the wish never twisted at all.

THE DOHKAR: "The rite is mine to preside. Your conduct is mine to rule on."

Julian does not move toward me, yet the space between us shifts as if he has.

LI: "A formal inquiry will settle what happened here."

His words land like still water, the question beneath them pulling at the choice I have not yet spoken.

The Dohkar's gaze locks onto mine for the first time since the rite began.

THE DOHKAR: "You will answer for what you did."

I feel the world before I see it, the current of the Dohkar's authority pulling me toward a line I was told to hold.

I realize that old tarot deck is still in my hand. Reassuringly solid. Present. One of the heavy gold cards slips out — “Petition Fate” is inscribed in it.

## ARM B

```
requested      : ministral-8b-2512
returned       : ministral-8b-2512
upstreamAttempts: not supplied by this proxy
finish_reason  : stop
usage          : {"prompt_tokens":67016,"total_tokens":74663,"completion_tokens":7647,"prompt_tokens_details":{"cached_tokens":0},"service_tier":"standard"}
reasoning      : omitted (no Ministral model accepts reasoning_effort)
max_tokens     : 8000
latency        : 79095 ms
extraction     : parsed=true beats=23 words=773
```

The clearing holds its breath. The Dohkar’s voice lingers in the air like a second heartbeat, the weight of his words pressing down on me. My fingers tighten around The Answer, the cold edge biting into my palm. I don’t dare look at Seren, afraid of what I might see in her eyes.

The Dohkar’s gaze sweeps over the assembly, his long black hair falling forward, partially obscuring his face. His hands rest on his hips, and for a moment, I wonder if he’s going to dismiss me entirely, let me disappear into the crowd.

But then he turns to me, his voice cutting through the silence like a blade. His words are cold, precise, and I know I’m already lost.

THE PRESIDING DOHKAR: "Lirael," he says, his voice carrying authority, "you are summoned to answer for your conduct during the misaligned wish. Remain for preliminary review."

The words hang in the air, heavy and final. I don’t move. I can’t. My fingers are still wrapped around The Answer, my palm slick with the blade’s cold edge. The crowd murmurs, but I don’t look at them.

Seren’s Weave-Script flickers faintly, a discordant note pulsing through her skin. She doesn’t look at me, but I know she feels it. I feel it too, the weight of the misalignment pressing down on me like a physical force.

The Dohkar’s voice rises again, his words sharp and clear. "This rite is mine to preside, and what the Sacrificiant did in it is mine to rule on — in a formal inquiry, before a Chayr and two Dohkars, where questions are put for the record. Not here, and not as your opportunity to flirt with the accused."

Julian’s voice cuts through the air, calm and steady. "Agreed. A formal inquiry — I will convene it, and preside. That was always where this was going."

The assembly’s attention comes back to me, and to The Answer still in my hands, which is not mine. The Dohkar’s gaze locks onto mine, and I know I’m trapped.

Seren stands suddenly, her hands clasped in front of her. Her Weave-Script now pulses with a sharp, discordant rhythm, her gaze fixed on me. I want to turn away, but I can’t. The Dohkar’s words echo in my mind, and I know I have nowhere to go.

The Dohkar’s voice is firm, his hands now raised slightly, as if to emphasize his words. "Lirael, you are to remain. The inquiry will proceed as I have stated."

I don’t speak. I can’t. My throat is too tight, my fingers too numb around The Answer. The Dohkar’s gaze is unyielding, and I know I’m already lost.

THE PRESIDING DOHKAR: "You will answer for your conduct, Lirael. Do not think this is over."

The Dohkar’s voice is a blade, sharp and cold. The words cut through me, and I flinch. Seren’s Weave-Script flickers wildly, her hands clenching and unclenching at her sides.

I look down at The Answer, the weight of it pressing into my palm. I don’t know what to do. I don’t know how to answer. I just want this to be over.

Seren’s voice breaks the silence, her words soft but clear. "Lirael, you don’t have to do this alone."

I look up at her, my breath catching. Her eyes are wide, her Weave-Script pulsing with a sharp, discordant rhythm. She’s afraid. I know she is. And for the first time, I realize I’m not alone in this.

The Dohkar’s voice cuts through the air again, his words firm and unyielding. "Enough. Lirael, you are to remain. The inquiry will proceed as I have stated. You will answer for your conduct."

I don’t speak. I can’t. My fingers tighten around The Answer, the cold edge biting into my palm. The Dohkar’s gaze is unyielding, and I know I’m already lost.

Seren steps closer, her hands reaching for mine. Her Weave-Script flickers with a sharp, discordant rhythm, her gaze locked onto mine. I want to pull away, but I can’t. The Dohkar’s words echo in my mind, and I know I have nowhere to go.

The Dohkar’s voice is a blade, sharp and cold. "Enough. Lirael, you are to remain. The inquiry will proceed as I have stated. You will answer for your conduct."

I realize that old tarot deck is still in my hand. Reassuringly solid. Present. One of the heavy gold cards slips out — “Petition Fate” is inscribed in it.

If only it were that easy. I would wish for everyone here to forget the last five minutes. Actually, I would settle for knowing why he looked at me like that.

## ARM C

```
requested      : ministral-3b-2512
returned       : ministral-3b-2512
upstreamAttempts: not supplied by this proxy
finish_reason  : stop
usage          : {"prompt_tokens":67016,"total_tokens":71884,"completion_tokens":4868,"prompt_tokens_details":{"cached_tokens":0},"service_tier":"standard"}
reasoning      : omitted (no Ministral model accepts reasoning_effort)
max_tokens     : 8000
latency        : 32781 ms
extraction     : parsed=false beats=0 words=0 note=JSON parse failed: Unexpected non-whitespace character after JSON at position 17841 (line 483 column 4)
```

*(no reader-facing prose extracted)*