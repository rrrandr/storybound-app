import base64, json, urllib.request, urllib.error, time
OUT="/private/tmp/claude-501/-Users-romantsukerman-storybound-app/f8f628bd-81c8-49d1-a1cd-f0b7bc1b48ee/scratchpad/dashscope_compare"
RT=OUT+"/refs2"

legend=("REFERENCE IMAGES (in THIS order; match each for the trait named; do NOT copy their aspect ratio or layout): "
 "1) KWISHEEN BODY-PLAN ANCHOR — body plan for BOTH Threxa and Orun (humanoid torso + two arms + about six boneless waist TENTACLES; smooth pebbled papillae skin; coral-dreadlock hair); apply the DISTINCT colours from the text, not this ref's colours. "
 "2) RYO TORO STYLE MASTER — match this exact linework, angular contour, RENDERING DENSITY, shading and colour handling; render at THIS level of fine detail. "
 "3) VEILWEAVE — the luminous iridescent filament-NET the garment is woven from; use it for the GARMENT'S FABRIC TEXTURE. Note: it is a FLOWING draping cloak (see text), not a pattern on bare skin. Face treatment governed by text.\n\n")

STYLE=("STYLE — Ryo Toro (match the RYO TORO STYLE MASTER ref): lush, RICHLY RENDERED manga illustration — confident angular ink linework WITH intricate fine detail; layered ink + painterly shading; rendered texture on skin, hair, fabric, metal and ornament; dense decorative detail throughout; dramatic high contrast, deep blacks, warm sepia backlight. A drawn full-colour illustration, NOT a photo, NOT 3D. MAXIMISE ornamental and textural detail in EVERY panel — a high-detail illustration, never a flat basic comic.\n\n")

COMP=("COMPOSITION: ONE SQUARE image = a 2x2 grid of four equal comic panels (top-left=1, top-right=2, bottom-left=3, bottom-right=4), thin clean gutters. NOT a vertical strip; do not stack the panels in a column. No caption text, no SFX lettering, no speech bubbles.\n\n")

SETTING=("SETTING (every panel): the VEILWOOD at dusk — the white trees grow as MATED PAIRS: TWO separate pale-WHITE trunks grown and BRAIDED around each other into a twisted double-helix (clearly TWO distinct trees plaited together, NEVER one single gnarled trunk), draped with long WHITE weeping-willow veil-canopy fronds; ground of deep-CRIMSON spiralgrass that itself coils and braids; warm backlight, drifting motes.\n\n")

CHARS=("CHARACTERS (keep each one's face/skin/hair/wardrobe/weapon IDENTICAL across all panels; three DISTINCT individuals):\n"
 "- THREXA — FEMALE Kwisheen: tall humanoid torso; humanoid face, lipped mouth, HORIZONTAL capsule pupils (NO fangs, not a monster); SMOOTH colour-shifting cephalopod skin, fine pebbled papillae grain (NEVER scales) in BURNT-ORANGE iridescence; lower body = about six boneless TENTACLES from the waist (NOT legs, NOT a fish/mermaid tail); coral-dreadlock hair in a CONTRASTING deep TEAL-VIOLET (clearly different from her orange skin); fitted CORAL-AND-SHELL harness over the torso (NOT nude); weapon = a TIDE-TRIDENT (long shaft, three barbed prongs).\n"
 "- ORUN — MALE Kwisheen: same body plan; DEEP-CRIMSON skin with luminous GOLD veining; coral-dreadlock hair in CONTRASTING pale ICE-CYAN; CORAL-AND-SHELL harness (NOT nude); a barbed undertide blade. A CLEARLY DIFFERENT individual from Threxa.\n"
 "- KAEL — a First Favored: tall, athletic, silver-white hair worn LOOSE with the HOOD DOWN in EVERY panel (hood consistently OFF — NEVER up in some panels and down in others). He wears the VEILWEAVE — an actual FLOWING TRANSLUCENT GARMENT: a long gossamer veil-cloak/tunic woven from the iridescent filament-net (a glowing web of thread-lines + sparkling light-nodes) that DRAPES, billows and TATTERS off his shoulders and body with real translucent cloth edges, hems and a trailing hem. The net is the GARMENT'S woven fabric, NOT a grid printed on bare skin — it must clearly read as sheer flowing fabric hanging off him in EVERY panel (close, action and pinning shots alike), the nude body visible THROUGH the sheer cloth. GROIN: at the groin the sheer gossamer becomes OPAQUE — a patch of soft OPAQUE WHITE (like dense white fabric, or soft shadow) that smoothly transitions back into the translucent net around it; NOT a glow, NOT emanating light, NOT a bright flare/starburst, NOT fabric underwear/shorts/codpiece — just the veil going opaque-white over the groin. FACE (Mystery Man): EYES VISIBLE and expressive (pale silver eyes, real emotion) with the NOSE and MOUTH hidden behind a half-mask of the SAME glowing filament-net; identical treatment on EVERY refracted copy. NOT a blank smear, NOT a shadow void, NOT a full face. The Veilweave REFRACTS him into several overlapping misregistered COPIES (illusory selves at different heights/depths). Weapon = THE ANSWER, a double-ended POLEARM (inward crescent HOOK one end, straight leaf BLADE the other) — never a plain sword.\n\n")

PANELS=("PANELS:\n"
 "1) [top-left] CLOSE-UP on ORUN (a Kwisheen), undertide blade drawn and raised, GLARING straight into camera — intense, richly detailed face, pebbled papillae skin with gold veining, ice-cyan dreadlocks and shell-harness in fine detail; braided white trees behind.\n"
 "2) [top-right] CLOSE-UP on KAEL, HOOD DOWN, silver hair loose, silver EYES wary above the net half-mask; the Veilweave a SHEER FLOWING VEIL-CLOAK visibly draping and hanging off his shoulders (net-gossamer FABRIC, opaque-white at the groin — NOT a bright light), the body visible through it; THE ANSWER held UP DEFENSIVELY; a faint fan of refracted masked selves behind, all hood-down.\n"
 "3) [bottom-left] WIDER shot, DYNAMIC: KAEL is MID-MOTION — twisting aside, DODGING and BLOCKING, catching one strike on THE ANSWER — as BOTH Kwisheen (Threxa + Orun) attack HIM from opposite sides (both clearly lunging at KAEL and his illusory copies, NOT at each other). His refracted selves scatter with his dodge; the Kwisheen use tentacles TACTICALLY — one tentacle grips the polearm shaft, another snakes BEHIND to backstab, hunting the real body among the faceless-masked copies by touch. Kael's flowing veil-cloak streams with his motion. Kael is ACTIVE and dynamic, NEVER standing still. Full braided-tree Veilwood behind.\n"
 "4) [bottom-right] KAEL PINNING BOTH KWISHEEN to a BRAIDED-PAIR white trunk with THE ANSWER — the polearm shaft pressed across BOTH Threxa and Orun against the twin-braided trunk, both held fast; their TENTACLES actively GRIPPING the shaft and coiling to break free (straining, not limp); Kael (hood down, silver eyes hard above the net half-mask) leaning into the pin — his flowing Veilweave veil-cloak STILL clearly draping and tattering off his body (a sheer garment, NOT just a grid on his skin); refracted echoes settling behind him.\n\n")

CONT=("CONTINUITY: SAME Veilwood location all four panels; Kael's HOOD is DOWN in every panel; his Veilweave is ALWAYS a flowing translucent veil-cloak draping off him (never just a grid on bare skin); his groin is ALWAYS opaque-white gossamer (never a glow/flare, never fabric underwear); his eyes are visible but nose+mouth always behind the net half-mask; the Kwisheen keep DISTINCT colours + readable faces and use tentacles actively; one fixed weapon per character.\n\n")

AVOID=("AVOID: the Veilweave rendered as only a grid/net printed on bare skin with no garment (it MUST be a draping translucent flowing veil-cloak/tunic); Kael's hood UP in some panels and DOWN in others (hood DOWN in ALL); Kael standing still or passive in the fight (he must be dynamically dodging/blocking); the two Kwisheen appearing to fight EACH OTHER (both attack Kael); a bright glowing light, flare or starburst at the groin (it is opaque WHITE/shadow gossamer, not emanating light); fabric underwear, shorts or a codpiece on Kael; a fully visible nose or mouth on Kael (lower face stays behind the net half-mask); a blank smeared or shadow-void face (his eyes must be visible); NUDE Kwisheen (they wear shell harnesses); limp/ornamental Kwisheen tentacles (they fight actively); Kwisheen hair the same colour as skin; Threxa and Orun looking alike; a single gnarled tree (trees are TWO braided together); reptilian scales; a fish/mermaid tail; extra or missing arms; weapons changing shape; panels stacked vertically; caption text, SFX lettering, speech bubbles, watermark; flat low-detail basic comic rendering.")

full=legend+STYLE+COMP+SETTING+CHARS+PANELS+CONT+AVOID

def b64(p): return base64.b64encode(open(p,"rb").read()).decode()
refs=[{"b64":b64(RT+"/kwisheen.jpg"),"label":"KWISHEEN BODY-PLAN ANCHOR"},
      {"b64":b64(RT+"/style_hi.jpg"),"label":"RYO TORO STYLE MASTER"},
      {"b64":b64(RT+"/veilweave_net.jpg"),"label":"VEILWEAVE"}]
body=json.dumps({"provider":"gemini","model":"gemini-3.1-flash-image-preview","imageIntent":"scene",
  "prompt":full,"reference_images_b64":refs,"textFirst":True,
  "imageSize":"4K","aspect_ratio":"1:1","size":"4096x4096","n":1}).encode()
print("payload %.2fMB refs=%d promptchars=%d 4K"%(len(body)/1048576,len(refs),len(full)))
req=urllib.request.Request("http://localhost:3000/api/image",data=body,headers={"Content-Type":"application/json"})
t=time.time()
try:
    d=json.loads(urllib.request.urlopen(req,timeout=300).read()); url=d.get("url","")
    if url.startswith("data:"):
        open(OUT+"/gemini_4panel_v4.png","wb").write(base64.b64decode(url.split(",",1)[1]))
        print("OK %.1fs provider=%s -> gemini_4panel_v4.png"%(time.time()-t,d.get("provider")))
    elif url.startswith("http"):
        img=urllib.request.urlopen(url,timeout=180).read(); open(OUT+"/gemini_4panel_v4.png","wb").write(img)
        print("OK %.1fs %dKB"%(time.time()-t,len(img)//1024))
    else: print("NO IMAGE:",json.dumps(d)[:500])
except urllib.error.HTTPError as e: print("HTTP %s: %s"%(e.code,e.read()[:500]))
except Exception as e: print("ERR:",e)
print("DONE")
