import base64, json, urllib.request, urllib.error, time
OUT="/private/tmp/claude-501/-Users-romantsukerman-storybound-app/f8f628bd-81c8-49d1-a1cd-f0b7bc1b48ee/scratchpad/dashscope_compare"
RT=OUT+"/refs2"

legend=("REFERENCE IMAGES (in THIS order; match each for the trait named; do NOT copy their aspect ratio or layout): "
 "1) KWISHEEN BODY-PLAN ANCHOR — the body plan for BOTH Threxa and Orun (humanoid torso + two arms + about six boneless waist TENTACLES; smooth pebbled papillae skin; coral-dreadlock hair); apply the DISTINCT colours specified in the text, not this ref's colours. "
 "2) RYO TORO STYLE MASTER — match this exact linework, angular contour, RENDERING DENSITY, shading and colour handling across the whole image; render at THIS level of fine detail. "
 "3) VEILWEAVE — the luminous iridescent filament-NET garment Kael wears (a glowing web of thread-lines + sparkling light-nodes over the body); use it for the GARMENT TEXTURE. Kael's face treatment is governed by the text (net half-mask), not this ref.\n\n")

STYLE=("STYLE — Ryo Toro (match the RYO TORO STYLE MASTER ref): lush, RICHLY RENDERED manga illustration — confident angular ink linework WITH intricate fine detail; layered ink + painterly shading; rendered texture on skin, hair, fabric, metal and ornament; dense decorative detail throughout; dramatic high contrast, deep blacks, warm sepia backlight. A drawn full-colour illustration, NOT a photo, NOT 3D. MAXIMISE ornamental and textural detail in EVERY panel — a high-detail illustration, never a flat basic comic.\n\n")

COMP=("COMPOSITION: ONE SQUARE image = a 2x2 grid of four equal comic panels (top-left=1, top-right=2, bottom-left=3, bottom-right=4), thin clean gutters. NOT a vertical strip; do not stack the panels in a column. No caption text, no SFX lettering, no speech bubbles.\n\n")

SETTING=("SETTING (every panel): the VEILWOOD at dusk — the white trees grow as MATED PAIRS: TWO separate pale-WHITE trunks that have grown and BRAIDED around each other into a twisted double-helix (clearly TWO distinct trees intertwined and plaited together, NEVER one single gnarled trunk), draped with long WHITE weeping-willow veil-canopy fronds; ground of deep-CRIMSON spiralgrass that itself coils and braids together; warm backlight, drifting motes.\n\n")

CHARS=("CHARACTERS (keep each one's face/skin/hair/wardrobe/weapon IDENTICAL across all panels; three DISTINCT individuals):\n"
 "- THREXA — FEMALE Kwisheen: tall humanoid torso; humanoid face, lipped mouth, HORIZONTAL capsule pupils (NO fangs, not a monster); SMOOTH colour-shifting cephalopod skin with a fine pebbled papillae grain (NEVER reptilian scales) in BURNT-ORANGE iridescence; lower body = about six distinct boneless TENTACLES from the waist (NOT legs, NOT a fish/mermaid tail); coral-dreadlock hair in a CONTRASTING deep TEAL-VIOLET (clearly a DIFFERENT colour from her orange skin); wears a fitted CORAL-AND-SHELL harness/armour over the torso (NOT nude); weapon = a TIDE-TRIDENT (long shaft, three barbed prongs).\n"
 "- ORUN — MALE Kwisheen: same body plan; DEEP-CRIMSON skin with luminous GOLD veining; coral-dreadlock hair in a CONTRASTING pale ICE-CYAN (different from his crimson skin); a CORAL-AND-SHELL harness (NOT nude); a barbed undertide blade. A CLEARLY DIFFERENT individual from Threxa — different colours, build and face.\n"
 "- KAEL — a First Favored: tall, athletic, silver-white hair; wears the VEILWEAVE — a luminous iridescent FILAMENT-NET: a hooded translucent WEB of glowing thread-lines studded with sparkling light-NODES over his bare body (the body reads through it) — NOT smooth cloth, NOT a plain tunic, NOT a robe. GROIN: over the HIPS down to the UPPER THIGHS the net FADES INTO OPAQUE LUMINOUS WHITE — a clean brief of pure light ('underwear made of light') that conceals the groin; NO fabric underwear, NO shorts, NO codpiece, NO bright dot — just a soft solid glow of white light from hip to upper-thigh. FACE (Mystery Man): Kael's EYES are VISIBLE and expressive (pale silver eyes, real emotion) — but the LOWER HALF of his face, the NOSE and MOUTH, is hidden behind a MASK made of the SAME glowing Veilweave filament-net/light (a luminous mesh half-mask across nose and mouth). Identity stays hidden while the eyes still carry expression. This face treatment is the SAME on EVERY refracted copy. NOT a blank smear, NOT a shadow void, NOT a full face — eyes clear, nose+mouth behind the net-light mask. The Veilweave REFRACTS him into several overlapping misregistered COPIES of the same body (illusory selves at different heights and depths). Weapon = THE ANSWER, a double-ended POLEARM (an inward crescent HOOK at one end, a straight leaf-shaped BLADE at the other, on a long shaft) — never a plain sword.\n\n")

PANELS=("PANELS:\n"
 "1) [top-left] CLOSE-UP on ORUN (a Kwisheen), his undertide blade drawn and raised, GLARING straight into camera — intense expression, richly detailed face, pebbled papillae skin with gold veining, coral dreadlocks and shell-harness in fine detail; braided white trees behind.\n"
 "2) [top-right] CLOSE-UP on KAEL in the glowing Veilweave filament-net (fading to a white light-brief at the hips); his silver EYES visible and wary ABOVE a glowing net half-mask over nose and mouth; THE ANSWER held UP DEFENSIVELY across his body; the luminous net-garment, its light-nodes, and a faint fan of refracted illusory selves in rich detail.\n"
 "3) [bottom-left] WIDER shot: BOTH Kwisheen (Threxa + Orun) striking at KAEL'S ILLUSORY FIGURES and USING THEIR TENTACLES TACTICALLY — one of Threxa's tentacles whips out and GRIPS the real polearm shaft to trap it; an Orun tentacle snakes BEHIND the figures to grapple and BACKSTAB — hunting the true Kael among the shimmering faceless-masked copies BY TOUCH (continuous tentacle contact is how they find the real body among the illusions). Tentacles actively gripping, coiling, lashing — NOT decorative. Full braided-tree Veilwood behind.\n"
 "4) [bottom-right] KAEL PINNING BOTH KWISHEEN to a BRAIDED-PAIR white trunk with THE ANSWER — the polearm shaft pressed horizontally across BOTH Threxa and Orun against the twin-braided trunk, both held fast; their TENTACLES actively GRIPPING the shaft and coiling to break free (tactical, straining, not limp); Kael (silver eyes hard above the net half-mask) leaning into the pin; his refracted echoes settling behind him.\n\n")

CONT=("CONTINUITY: the SAME Veilwood location in all four panels; Kael's eyes are visible but his nose+mouth are ALWAYS behind the glowing net half-mask, and his groin is ALWAYS a white light-brief (never fabric); the Kwisheen keep their DISTINCT colours and readable faces and use their tentacles actively; one fixed weapon per character.\n\n")

AVOID=("AVOID: a fully visible nose or mouth on Kael (his lower face must stay behind the glowing net half-mask); a blank smeared or shadow-void face on Kael (his EYES must be visible and expressive); fabric underwear, shorts, or a codpiece on Kael (the groin fades to WHITE LIGHT instead); smooth plain cloth or a plain tunic/robe on Kael; NUDE or naked Kwisheen (they wear shell harnesses); Kwisheen tentacles that are limp, ornamental or merely decorative (they must be actively fighting — gripping the weapon, grappling, backstabbing); Kwisheen hair the same colour as their skin; Threxa and Orun looking alike; a SINGLE gnarled tree trunk (the trees are TWO braided together); reptilian scales; a fish or mermaid tail; extra or missing arms; weapons changing shape between panels; panels stacked in a vertical column; caption text, SFX lettering, speech bubbles, watermark; flat low-detail basic comic rendering.")

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
        open(OUT+"/gemini_4panel_v3.png","wb").write(base64.b64decode(url.split(",",1)[1]))
        print("OK %.1fs provider=%s -> gemini_4panel_v3.png"%(time.time()-t,d.get("provider")))
    elif url.startswith("http"):
        img=urllib.request.urlopen(url,timeout=180).read(); open(OUT+"/gemini_4panel_v3.png","wb").write(img)
        print("OK %.1fs %dKB"%(time.time()-t,len(img)//1024))
    else: print("NO IMAGE:",json.dumps(d)[:500])
except urllib.error.HTTPError as e: print("HTTP %s: %s"%(e.code,e.read()[:500]))
except Exception as e: print("ERR:",e)
print("DONE")
