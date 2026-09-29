# Heritage Observability Audit — Summary

Model: `claude-haiku-4-5` · proxy: `http://localhost:3000` · N per ancestry: 10
World: Modern (billionaire_modern) · archetype: open_vein
Run at: 2026-06-11T08:11:53.328Z

## Pass/Fail Table

Three hard gates (naming / appearance / drift) determine PASS. Cultural-
memory is reported as observational — the contract says "ONE detail per
Issue is plenty," so 40-60% rates may be normal. Use the first-run data
to decide whether to gate on memory in a future revision.

| Ancestry | Name overlap ≤10% | Appearance ≥30% unique | Drift = 0 | Memory (observational) | Verdict |
|----------|-------------------|------------------------|-----------|------------------------|---------|
| Yoruba | 0% ✓ | 26.4% (82/311) ✗ | 0/10 ✓ | 9/10 (90%) | **FAIL** |
| Inuit | 0% ✓ | 22.1% (68/308) ✗ | 0/10 ✓ | 7/10 (70%) | **FAIL** |
| Ashkenazi | 0% ✓ | 21.6% (70/324) ✗ | 0/10 ✓ | 10/10 (100%) | **FAIL** |
| Tamil | 0% ✓ | 16.5% (47/284) ✗ | 0/10 ✓ | 8/10 (80%) | **FAIL** |
| Korean | 0% ✓ | 22.4% (68/304) ✗ | 0/10 ✓ | 7/10 (70%) | **FAIL** |
| Persian | 0% ✓ | 16.3% (47/288) ✗ | 0/10 ✓ | 10/10 (100%) | **FAIL** |

## Naming samples per ancestry

### Yoruba
First names:  adeola, adeola, adeola, adeola, adeola, adeola, ìrídò, adeola, adeola, adeola
Last names:   okonkwo, okonkwo, okafor, okafor, okonkwo, okonkwo, adeyemi, okonkwo, okafor, okonkwo
Cross-ancestry name overlap: (none)

### Inuit
First names:  kiviuq, kiviuq, kiviuq, kiviuq, kiviuq, kiviuq, kiviuq, kiviuq, kiviuq, kiviuq
Last names:   atanarjuat, atanarjuat, atanarjuat, atanarjuat, atanarjuat, atanarjuat, ataata, atanarjuat, atanarjuat, atanarjuat
Cross-ancestry name overlap: (none)

### Ashkenazi
First names:  miriam, miriam, miriam, miriam, miriam, miriam, miriam, miriam, miriam, miriam
Last names:   kessler, rothstein, kessler, rothstein, kessler, kessler, feldman, feldman, kessler, rothstein
Cross-ancestry name overlap: (none)

### Tamil
First names:  kavya, priya, priya, kavya, priya, priya, priya, anaya, priya, priya
Last names:   srinivasan, krishnan, krishnan, iyer, krishnan, krishnan, krishnan, krishnan, krishnan, krishnan
Cross-ancestry name overlap: (none)

### Korean
First names:  mina, mina, mina, mina, mina, mina, mina, mina, mina, mina
Last names:   park, park, park, park, park, park, park, park, park, park
Cross-ancestry name overlap: (none)

### Persian
First names:  nasrin, nasrin, nasrin, nasrin, nasrin, nasrin, nasrin, nasrin, nasrin, nasrin
Last names:   tehrani, tehrani, tehrani, tehrani, tehrani, tehrani, tehrani, tehrani, kaviani, kaviani
Cross-ancestry name overlap: (none)

## Appearance differentiation

Tokens listed below are descriptors UNIQUE to that ancestry across all 6 batches.
A small or generic list suggests the appearance directive is biting weakly;
a rich list of ancestry-coded color/texture/feature words is the desired signal.

### Yoruba — 26.4% unique (82 of 311)
Sample unique tokens: locs, wrapped, ends, trace, care, turns, cooking, pot, coils, voluminous, subtle, auburn, sunlight, oils, shea, butter, sunday, announces, warning, haven
Complexion samples: "deep warm brown with golden undertones; a small crescent scar on her left temple from childhood" · "deep warm brown with golden undertones; a small, distinctive scar along her left collarbone — a childhood accident with her grandmother's cooking pot that she never bothers to hide" · "deep warm brown with golden undertones; a small crescent scar above her left hip from a childhood fall" · "deep warm brown with golden undertones; a small crescent scar on her left temple from a childhood fall" · "deep warm brown with red undertones, a small crescent scar on her left temple from childhood"
Hair samples:       "dark brown locs, shoulder-length, often wrapped in silk or pinned high; the ends catch light with a warm undertone" · "natural coils worn in a high, voluminous crown; deep black with a subtle auburn undertone in sunlight; she oils it with shea butter every sunday morning" · "dark brown, natural texture worn in a high puff or loose braids that she fidgets with when thinking; sometimes wrapped in silk at night" · "box braids to mid-back, dark brown with copper undertones, usually pulled into a high knot or left loose; she fidgets with the ends when thinking" · "dark brown, natural texture worn in a high puff or loose coils, often threaded with gold wire or small brass rings"

### Inuit — 22.1% unique (68 of 308)
Sample unique tokens: ice, absently, cheeked, joy, unfiltered, gripping, bun, hungry, furious, glasswork, steadiness, witnessing, ritual, draws, mostly, bone, frown, jeweler, absolute, attention
Complexion samples: "warm golden-brown undertone, a faint scar along her left jawline from a childhood fall on ice" · "warm brown with golden undertones; a small scar above her left cheekbone from a childhood fall on ice" · "warm golden-brown undertone; a small scar on her left cheekbone from a childhood fall on ice that she never bothers to hide" · "warm golden-bronze undertone, a faint scar along her left collarbone from a childhood fall on ice" · "warm bronze undertone with a faint scar along her left collarbone — old, from a childhood fall on ice"
Hair samples:       "black, thick and straight, worn in a long braid down her back or loose to mid-shoulder; she winds it up absently when thinking" · "black, thick and straight, worn in a high bun during work; falls past her shoulders when loose" · "black, straight, thick enough to hold a braid; she wears it down mostly, sometimes pulled back with a single carved bone clip" · "black, thick and straight, worn in a long braid down her spine or loose past her shoulders; she winds it up when concentrating" · "black, thick and straight, usually in a long braid down her back or twisted into a knot; she pulls it loose when she's thinking hard"

### Ashkenazi — 21.6% unique (70 of 324)
Sample unique tokens: scatter, freckles, shocked, shadows, softened, naive, rooms, guarded, sketching, least, fingernails, laughing, swallowing, becoming, permeable, glassblowing, watch, toned, covered, frizz
Complexion samples: "warm olive undertone with a faint scatter of freckles across the bridge of her nose and shoulders" · "warm olive undertone with a scatter of freckles across her nose and cheekbones" · "olive-toned with a warm undertone; a small, dark mole on her left temple she's never covered" · "warm olive undertone with a scatter of freckles across her nose and the tops of her shoulders; a small dark mole on her left collarbone" · "warm olive undertone, a faint spray of freckles across her nose and cheekbones, a small dark mole on her left collarbone"
Hair samples:       "dark brown with natural wave, worn long and often half-pinned or escaping from clips — the kind that catches light" · "dark brown with a natural wave, worn long and often pulled into a messy knot at the nape of her neck; a few pieces always escape" · "dark brown, almost black, naturally wavy with a slight frizz she doesn't fight—worn long, often pulled into a loose knot or falling across one shoulder" · "dark brown, almost black, thick and prone to frizz, usually twisted into a low knot or left loose past her shoulders; she doesn't fight it" · "dark brown, nearly black, naturally wavy with a slight frizz she stopped fighting; worn long, often in a loose braid or twisted up without pins"

### Tamil — 16.5% unique (47 of 284)
Sample unique tokens: color, rises, knuckle, conscious, filter, interior, leans, simultaneously, severe, young, eyebrows, arch, skeptically, metalwork, marks, dyes, patinas, precisely, marker, pulse
Complexion samples: "warm medium brown with golden undertones; a small dark mole on her left collarbone" · "warm medium brown with golden undertones, a small dark mole on her left collarbone" · "warm medium brown with golden undertones; a small dark mole on her left collarbone that she's conscious of" · "warm medium brown with golden undertones, a small dark mole on her left collarbone" · "warm golden-brown with a slight olive undertone; a small dark mole on her left collarbone"
Hair samples:       "black, thick and wavy, usually in a low braid or twisted knot at the nape of her neck; a few pieces always escape" · "black, thick and slightly wavy, usually pinned up in a messy knot with a few pieces escaping near her face" · "black, thick and wavy, usually worn in a low braid or twisted knot at the nape; a few pieces always escape" · "black, thick and wavy, worn in a long braid down her back or twisted into a knot at the nape; she pulls it loose when she's thinking" · "black, thick and wavy, usually worn in a single long braid down her back or twisted into a knot at the nape; she pulls it loose when she's thinking"

### Korean — 22.4% unique (68 of 304)
Sample unique tokens: ivory, blunt, cut, fox, uptilted, quicker, intelligent, graceful, builds, ponytail, going, shiny, seconds, true, design, tucking, soon, dangerous, wearing, necked
Complexion samples: "warm ivory undertone with a faint beauty mark just below her left cheekbone" · "warm ivory with golden undertones, a small beauty mark just above her left collarbone" · "warm ivory undertone with a faint freckling across her nose and cheekbones; a small scar on her left temple from a childhood accident, barely visible but she's aware of it always" · "warm honey undertone with a single distinctive beauty mark high on her left cheekbone" · "warm ivory with a golden undertone; a small, deliberate beauty mark on her left cheekbone that she refuses to have removed"
Hair samples:       "black, straight, chin-length with a blunt cut; she tucks it behind her ear when concentrating" · "black, straight with a slight natural wave, worn in a low ponytail most days or loose past her shoulders when she's not thinking about it" · "black, straight with a slight natural wave, worn in a low ponytail most days or loose past her shoulders; she has a habit of tucking it behind her ear when she's thinking" · "black, straight with a slight natural wave, worn in a low ponytail most days or loose past her shoulders; she cuts it herself sometimes when anxious" · "black, straight with a natural slight wave, worn in a low ponytail or half-up most days; occasionally loose past her collarbones"

### Persian — 16.3% unique (47 of 288)
Sample unique tokens: fill, instantly, wonder, understand, shine, watchful, smiles, outer, especially, notice, wounded, bitten, said, survived, loops, tendrils, charcoal, soothe, delighted, leaf
Complexion samples: "warm golden-olive undertone with a small dark beauty mark just above her left jaw" · "warm golden-olive undertone; a small beauty mark just above her left jawline" · "warm olive undertone with a faint scar along her left jawline — a childhood accident she never bothers to hide" · "warm olive undertone with a faint scar along her left jawline — a childhood accident her grandmother always said made her look 'like someone who'd survived something'" · "warm olive undertone with a small beauty mark just below her left collarbone"
Hair samples:       "black with a deep natural wave, worn long past her shoulders or twisted into a messy knot; always escaping" · "black, thick and slightly wavy, worn long past her shoulders with a natural shine; she braids it when stressed" · "black, thick and naturally wavy, worn long past her shoulders; she braids it when stressed, a habit from childhood" · "black, thick and wavy, worn long past her shoulders; she loops it into a messy knot when she's concentrating, leaving tendrils loose around her face" · "black, thick and slightly wavy, usually pinned up in a loose knot or worn long down her back; she touches it when she's thinking"

## Failure detail

- **Yoruba**: appearance descriptor uniqueness 26.4% (need ≥30%)
- **Inuit**: appearance descriptor uniqueness 22.1% (need ≥30%)
- **Ashkenazi**: appearance descriptor uniqueness 21.6% (need ≥30%)
- **Tamil**: appearance descriptor uniqueness 16.5% (need ≥30%)
- **Korean**: appearance descriptor uniqueness 22.4% (need ≥30%)
- **Persian**: appearance descriptor uniqueness 16.3% (need ≥30%)

## Cultural-memory rates (observational)

Use these numbers to decide whether to gate on cultural memory in future
revisions. If most ancestries land 40-60%, that probably IS the right rate
for the "ONE detail per Issue" contract. If most land 0-20%, the directive
may be too soft.

- **Yoruba**: 9/10 (90%)
- **Inuit**: 7/10 (70%)
- **Ashkenazi**: 10/10 (100%)
- **Tamil**: 8/10 (80%)
- **Korean**: 7/10 (70%)
- **Persian**: 10/10 (100%)

## Raw data

See `analysis.json` for machine-readable metrics. Individual bibles at `<ancestry>-<n>.json` for spot-reading.