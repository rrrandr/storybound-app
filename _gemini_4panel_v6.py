import base64, json, urllib.request, urllib.error, time
OUT="/private/tmp/claude-501/-Users-romantsukerman-storybound-app/f8f628bd-81c8-49d1-a1cd-f0b7bc1b48ee/scratchpad/dashscope_compare"
RT=OUT+"/refs2"

legend=("REFERENCE IMAGES (in THIS order; match each for the trait named; do NOT copy their aspect ratio or layout): "
 "1) KWISHEEN BODY-PLAN ANCHOR — body plan for BOTH Threxa and Orun (humanoid torso + two arms + about six boneless waist TENTACLES; smooth pebbled papillae skin; coral-dreadlock hair); apply the DISTINCT colours from the text. "
 "2) RYO TORO STYLE MASTER — match this exact linework, angular contour, RENDERING DENSITY, shading and colour handling; render at THIS level of fine detail. "
 "3) VEILWEAVE — THE EXACT garment look: a hooded, MANY-FOLDED sheer veil woven from a luminous iridescent FILAMENT-NET (a fine glowing web of thread-lines studded with sparkling light-NODES) draping in many soft folds over a NUDE, BAREFOOT body, refracting the wearer into several overlapping copies. Match this net-WEAVE, the many folds, the nude body visible through it, and the BARE FEET. NO plain opaque cloak, NO pants/boots.\n\n")

STYLE=("STYLE — Ryo Toro (match the RYO TORO STYLE MASTER ref): lush, RICHLY RENDERED manga illustration — confident angular ink linework WITH intricate fine detail; layered ink + painterly shading; rendered texture on skin, hair, fabric, metal and ornament; dense decorative detail throughout; dramatic high contrast, deep blacks, warm sepia backlight. A drawn full-colour illustration, NOT a photo, NOT 3D. MAXIMISE ornamental and textural detail — never a flat basic comic.\n\n")

COMP=("COMPOSITION: ONE SQUARE image = a 2x2 grid of four equal comic panels (top-left=1, top-right=2, bottom-left=3, bottom-right=4), thin clean gutters. NOT a vertical strip; do not stack panels in a column. No caption text, no SFX lettering, no speech bubbles.\n\n")

SETTING=("SETTING (every panel): the VEILWOOD at dusk — white trees grow as MATED PAIRS: TWO separate pale-WHITE trunks grown and BRAIDED around each other into a twisted double-helix (clearly TWO trees plaited together, NEVER one gnarled trunk), draped with long WHITE weeping-willow veil-fronds; ground of deep-CRIMSON spiralgrass that coils and braids; warm backlight, drifting motes.\n\n")

# THE ANSWER — canonical weapon shape, used everywhere
ANSWER=("THE ANSWER (Kael's weapon — ALWAYS this exact shape, identical in every panel and on every refracted copy): a long POLEARM with a BLADED HOOK at EACH end (both ends identical). Each hook's OUTER edge is a sharp curved BLADE; each hook's INNER curve is SERRATED with saw-teeth for GRAPPLING, trapping and controlling an opponent's weapon or limb. It is NEVER a straight spear, NEVER a trident, NEVER a plain sword, NEVER a single-ended scythe — always the double bladed-and-serrated-hook polearm")

CHARS=("CHARACTERS (keep each one's face/skin/hair/wardrobe/weapon IDENTICAL across panels; three DISTINCT individuals):\n"
 "- THREXA — FEMALE Kwisheen: tall humanoid torso; humanoid face, lipped mouth, HORIZONTAL capsule pupils (NO fangs); SMOOTH pebbled papillae skin (NEVER scales) in BURNT-ORANGE iridescence; lower body = about six boneless TENTACLES from the waist (NOT legs, NOT a fish/mermaid tail); coral-dreadlock hair in CONTRASTING deep TEAL-VIOLET; fitted CORAL-AND-SHELL harness (NOT nude); weapon = a TIDE-TRIDENT (three barbed prongs — this is THREXA's weapon only, NOT Kael's).\n"
 "- ORUN — MALE Kwisheen: same body plan; DEEP-CRIMSON skin with luminous GOLD veining; coral-dreadlock hair in CONTRASTING pale ICE-CYAN; CORAL-AND-SHELL harness (NOT nude); a barbed undertide blade. CLEARLY a different individual from Threxa.\n"
 "- KAEL — a First Favored: tall, athletic, silver-white hair, hood UP (consistent every panel). He wears the VEILWEAVE — a sheer, hooded, MANY-FOLDED veil woven from a luminous iridescent FILAMENT-NET: a fine glowing web of thread-lines studded with sparkling light-NODES, the net clearly VISIBLE as the veil's weave AND glinting over the skin beneath, draping in MANY soft folds (like the reference — NOT tattered, NOT ragged, NOT a plain smooth opaque cloak, NOT just a grid on skin). Under the sheer Veilweave he is NUDE and BAREFOOT — NO pants, NO shorts, NO boots, NO shoes, NO undergarment; the bare body reads THROUGH the translucent glowing net. GROIN: where the veil passes over his privates the SAME sheer filament-net simply DENSIFIES INTO AN OPAQUE PATCH of the identical veil fabric (the veil ITSELF turning opaque over that spot), blending seamlessly back into the translucent net around it — NOT a separate brief/loincloth/underwear, NO waistband, NO shorts outline, nothing that looks like worn white underwear, and NO glow or flare. FACE (Mystery Man): EYES VISIBLE and expressive (pale silver eyes) with NOSE and MOUTH behind a half-mask of the SAME glowing filament-net; identical on EVERY copy. The Veilweave REFRACTS him into several (about six) overlapping misregistered WHOLE copies. "+ANSWER+".\n\n")

PANELS=("PANELS:\n"
 "1) [top-left] CLOSE-UP on ORUN (a Kwisheen), his undertide blade drawn and raised, GLARING straight into camera — intense, richly detailed face, pebbled papillae skin with gold veining, ice-cyan dreadlocks and shell-harness in fine detail; braided white trees behind.\n"
 "2) [top-right] CLOSE-UP on KAEL, hood up, in the many-folded glowing net-veil (the luminous filament-net WEAVE and light-nodes clearly visible, draping in soft folds), NUDE and BAREFOOT beneath the sheer veil (the veil simply turning OPAQUE over the groin — not a brief), silver EYES visible above the net half-mask; THE ANSWER (double bladed-serrated-hook polearm) held UP DEFENSIVELY; a faint fan of refracted masked copies behind.\n"
 "3) [bottom-left] DISORIENTATION panel: BOTH Kwisheen (Threxa + Orun) stand close together in the CENTRE, RINGED and SURROUNDED on all sides by about six overlapping refracted images of KAEL (each in the glowing net-veil, hood up, net half-mask, each holding THE ANSWER), and they are CLEARLY DISORIENTED — Threxa THRUSTS her trident straight THROUGH one illusory Kael (prongs passing harmlessly through the copy), Orun whirls to guard his back, unable to tell which Kael is real; their tentacles lash at the phantoms. The real Kael is indistinguishable among the copies. Braided-tree Veilwood behind.\n"
 "4) [bottom-right] THE PIN (legible): the REAL Kael (most solid, copies thinning behind) has driven THE ANSWER across BOTH Threxa and Orun, pinning the two of them TOGETHER against a braided twin-trunk white tree — the SERRATED inner hooks catching and controlling them — BOTH Kwisheen clearly visible and held, tentacles gripping the shaft and straining; Kael (barefoot, net half-mask, glowing net-veil) leaning into the pin. Keep it CLEAR: exactly two Kwisheen, one braided tree, one double-hook polearm pinning them.\n\n")

CONT=("CONTINUITY: SAME Veilwood all four panels; THE ANSWER is ALWAYS the double bladed-serrated-hook polearm (never a spear/trident/sword, never changing shape); Kael's Veilweave is ALWAYS the glowing MANY-FOLDED filament-net veil (never a plain cloak, never a grid on skin, never tattered); Kael NUDE and BAREFOOT under it (never pants/boots), the veil itself turning opaque over the groin; hood UP every panel; eyes visible, nose+mouth masked; BOTH Kwisheen present and distinct in the wide panels; each character keeps their own fixed weapon.\n\n")

AVOID=("AVOID: THE ANSWER rendered as a straight spear, a trident, a plain sword, a single-ended scythe, or changing shape between panels/copies (it is ALWAYS a double bladed-and-serrated-hook polearm); a separate white brief, loincloth, underwear or waistband at Kael's groin, or anything that looks like worn underwear (the VEIL ITSELF just turns opaque there); pants, trousers, shorts, boots, shoes or footwear on Kael (BAREFOOT, nude under the sheer veil); a plain smooth opaque cloak with no visible glowing net-weave; a tattered/ragged veil (it is MANY-FOLDED); the Veilweave as just a grid printed on skin; a bright glow/flare at the groin; a fully visible nose or mouth on Kael (lower face behind the net half-mask); a blank/shadow-void face (eyes must show); EITHER Kwisheen vanishing from panel 3 or 4; illegible action in panel 4; NUDE Kwisheen (they wear shell harnesses); limp/ornamental tentacles; Kwisheen hair the same colour as skin; Threxa and Orun looking alike; a single gnarled tree (trees are TWO braided); reptilian scales; a fish/mermaid tail; extra or missing arms; panels stacked vertically; caption text, SFX lettering, speech bubbles, watermark; flat low-detail basic comic rendering.")

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
        open(OUT+"/gemini_4panel_v6.png","wb").write(base64.b64decode(url.split(",",1)[1]))
        print("OK %.1fs provider=%s -> gemini_4panel_v6.png"%(time.time()-t,d.get("provider")))
    elif url.startswith("http"):
        img=urllib.request.urlopen(url,timeout=180).read(); open(OUT+"/gemini_4panel_v6.png","wb").write(img)
        print("OK %.1fs %dKB"%(time.time()-t,len(img)//1024))
    else: print("NO IMAGE:",json.dumps(d)[:500])
except urllib.error.HTTPError as e: print("HTTP %s: %s"%(e.code,e.read()[:500]))
except Exception as e: print("ERR:",e)
print("DONE")
