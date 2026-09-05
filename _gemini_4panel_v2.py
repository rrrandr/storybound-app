import base64, json, urllib.request, urllib.error, time
OUT="/private/tmp/claude-501/-Users-romantsukerman-storybound-app/f8f628bd-81c8-49d1-a1cd-f0b7bc1b48ee/scratchpad/dashscope_compare"
RT=OUT+"/refs2"

legend=("REFERENCE IMAGES (in THIS order; match each for the trait named; do NOT copy their aspect ratio or layout): "
 "1) KWISHEEN BODY-PLAN ANCHOR — the body plan for BOTH Threxa and Orun (humanoid torso + two arms + about six boneless waist TENTACLES; smooth pebbled papillae skin; coral-dreadlock hair); apply the DISTINCT colours specified in the text below, not this ref's colours. "
 "2) RYO TORO STYLE MASTER — match this exact linework, angular contour, RENDERING DENSITY, shading and colour handling across the whole image; render at THIS level of fine detail. "
 "3) VEILWEAVE — the luminous iridescent filament-NET garment Kael wears (a glowing web of thread-lines + sparkling light-nodes over the body); use it for the GARMENT TEXTURE; Kael's face stays a shadowed distortion per Mystery Man.\n\n")

STYLE=("STYLE — Ryo Toro (match the RYO TORO STYLE MASTER ref): lush, RICHLY RENDERED manga illustration — confident angular ink linework WITH intricate fine detail; layered ink + painterly shading; rendered texture on skin, hair, fabric, metal and ornament; dense decorative detail throughout; dramatic high contrast, deep blacks, warm sepia backlight. A drawn full-colour illustration, NOT a photo, NOT 3D. MAXIMISE ornamental and textural detail in EVERY panel — a high-detail illustration, never a flat basic comic.\n\n")

COMP=("COMPOSITION: ONE SQUARE image = a 2x2 grid of four equal comic panels (top-left=1, top-right=2, bottom-left=3, bottom-right=4), thin clean gutters. NOT a vertical strip; do not stack the panels in a column. No caption text, no SFX lettering, no speech bubbles.\n\n")

SETTING=("SETTING (every panel): the VEILWOOD at dusk — pale WHITE spiral-twisted tree trunks draped with long WHITE weeping-willow veil-canopy fronds; ground of deep-CRIMSON spiralgrass that coils and braids together; warm backlight, drifting motes.\n\n")

CHARS=("CHARACTERS (keep each one's face/skin/hair/wardrobe/weapon IDENTICAL across all panels; three DISTINCT individuals):\n"
 "- THREXA — FEMALE Kwisheen: tall humanoid torso; humanoid face, lipped mouth, HORIZONTAL capsule pupils (NO fangs, not a monster); SMOOTH colour-shifting cephalopod skin with a fine pebbled papillae grain (NEVER reptilian scales) in BURNT-ORANGE iridescence; lower body = about six distinct boneless TENTACLES from the waist (NOT legs, NOT a fish/mermaid tail); coral-dreadlock hair in a CONTRASTING deep TEAL-VIOLET (clearly a DIFFERENT colour from her orange skin); wears a fitted CORAL-AND-SHELL harness/armour over the torso (NOT nude); weapon = a TIDE-TRIDENT (long shaft, three barbed prongs).\n"
 "- ORUN — MALE Kwisheen: same body plan; DEEP-CRIMSON skin with luminous GOLD veining; coral-dreadlock hair in a CONTRASTING pale ICE-CYAN (different from his crimson skin); a CORAL-AND-SHELL harness (NOT nude); a barbed undertide blade. He is a CLEARLY DIFFERENT individual from Threxa — different colours, build and face.\n"
 "- KAEL — a First Favored: tall, athletic, silver-white hair; wears the VEILWEAVE — a luminous iridescent FILAMENT-NET: a hooded translucent WEB of glowing thread-lines studded with sparkling light-NODES stretched over his bare body (the body reads through it) — NOT smooth cloth, NOT a plain tunic, NOT a robe. The Veilweave REFRACTS him into several overlapping misregistered COPIES of the same body (illusory selves drifting at different heights and depths). MYSTERY MAN — Kael's FACE is NEVER a readable face: where his face should be, the refraction leaves a SHIMMERING SHADOWED DISTORTION (a dark prismatic smear; NO clear eyes, nose or mouth) — on EVERY copy. Only Kael's face is concealed; the Kwisheen faces are fully visible and expressive. Weapon = THE ANSWER, a double-ended POLEARM (an inward crescent HOOK at one end, a straight leaf-shaped BLADE at the other, on a long shaft) — never a plain sword.\n\n")

PANELS=("PANELS:\n"
 "1) [top-left] CLOSE-UP on ORUN (a Kwisheen), his undertide blade drawn and raised, GLARING straight into camera — intense expression, richly detailed face, pebbled papillae skin with gold veining, coral dreadlocks and shell-harness rendered in fine detail; white weeping fronds behind.\n"
 "2) [top-right] CLOSE-UP on KAEL in the glowing Veilweave filament-net, THE ANSWER held UP DEFENSIVELY across his body; his face a SHIMMERING SHADOWED DISTORTION (no readable features); the luminous net-garment, its light-nodes, and a faint fan of refracted illusory selves rendered in rich detail.\n"
 "3) [bottom-left] WIDER shot: BOTH Kwisheen (Threxa + Orun) lunging in from opposite sides and striking at KAEL'S ILLUSORY FIGURES — the trident and the undertide blade passing through / landing on the shimmering refracted COPIES of Kael (each copy's face a shadowed distortion) so the true position is ambiguous; tentacles lashing; full Veilwood behind.\n"
 "4) [bottom-right] KAEL PINNING BOTH KWISHEEN to a white spiral tree trunk with THE ANSWER — the polearm catching both Threxa and Orun against the pale trunk, their tentacles splayed, both held fast; Kael (face still a shadowed distortion) leaning into the pin; his refracted echoes settling behind him.\n\n")

CONT=("CONTINUITY: the SAME Veilwood location in all four panels; Kael's face is ALWAYS the shimmering shadowed distortion; the Kwisheen keep their DISTINCT colours and readable faces; one fixed weapon per character.\n\n")

AVOID=("AVOID: smooth plain cloth or a plain tunic/robe on Kael; a readable face or visible eyes on Kael; NUDE or naked Kwisheen (they wear shell harnesses); Kwisheen hair the same colour as their skin; Threxa and Orun looking alike; reptilian scales; a fish or mermaid tail; extra or missing arms; weapons changing shape between panels; panels stacked in a vertical column; caption text, SFX lettering, speech bubbles, watermark; flat low-detail basic comic rendering.")

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
        open(OUT+"/gemini_4panel_v2.png","wb").write(base64.b64decode(url.split(",",1)[1]))
        print("OK %.1fs provider=%s -> gemini_4panel_v2.png"%(time.time()-t,d.get("provider")))
    elif url.startswith("http"):
        img=urllib.request.urlopen(url,timeout=180).read(); open(OUT+"/gemini_4panel_v2.png","wb").write(img)
        print("OK %.1fs %dKB"%(time.time()-t,len(img)//1024))
    else: print("NO IMAGE:",json.dumps(d)[:500])
except urllib.error.HTTPError as e: print("HTTP %s: %s"%(e.code,e.read()[:500]))
except Exception as e: print("ERR:",e)
print("DONE")
