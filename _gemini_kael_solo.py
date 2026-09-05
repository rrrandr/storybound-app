import base64, json, urllib.request, urllib.error, time
OUT="/private/tmp/claude-501/-Users-romantsukerman-storybound-app/f8f628bd-81c8-49d1-a1cd-f0b7bc1b48ee/scratchpad/dashscope_compare"
RT=OUT+"/refs2"

legend=("REFERENCE IMAGES (in THIS order; match each for the trait named; do NOT copy their aspect ratio): "
 "1) RYO TORO STYLE MASTER — match this exact linework, angular contour, RENDERING DENSITY, shading and colour handling; render at THIS level of fine detail. "
 "2) VEILWEAVE — THE EXACT garment: a hooded, MANY-FOLDED sheer veil woven from a luminous iridescent FILAMENT-NET (glowing web of thread-lines + sparkling light-nodes) over a NUDE, BAREFOOT body, refracting the wearer into overlapping copies. Match the net-WEAVE, the many folds, and the bare feet. Note: the FACE-MASK area is DENSE/OPAQUE (see text), unlike the sheer body veil.\n\n")

STYLE=("STYLE — Ryo Toro (match the RYO TORO STYLE MASTER ref): lush, RICHLY RENDERED manga illustration — confident angular ink linework WITH intricate fine detail; layered ink + painterly shading; rendered texture on skin, hair, fabric and metal; dense decorative detail; dramatic high contrast, deep blacks, warm sepia backlight. A drawn full-colour illustration, NOT a photo, NOT 3D. MAXIMISE detail — a gallery-quality character portrait.\n\n")

FORMAT=("FORMAT: a SINGLE TALL PORTRAIT of ONE figure — a dramatic, gallery-quality CHARACTER-INTRODUCTION splash illustration (full body or three-quarter length, a poised heroic stance). This is ONE single image, NOT a grid, NOT multiple panels, NOT a comic page. No caption text, no lettering, no speech bubbles, no watermark.\n\n")

SUBJECT=("SUBJECT — KAEL, a First Favored: tall, athletic, silver-white hair, HOOD UP; a poised, watchful heroic stance in the Veilwood, THE ANSWER held ready.\n"
 "VEILWEAVE: he wears a sheer, hooded, MANY-FOLDED veil woven from a luminous iridescent FILAMENT-NET (a fine glowing web of thread-lines studded with sparkling light-NODES), the net clearly VISIBLE as the veil's weave AND glinting over the skin, draping in MANY soft folds (like the reference — NOT tattered, NOT a plain smooth cloak, NOT just a grid on skin). Beneath the sheer veil he is NUDE and BAREFOOT — NO pants, NO shorts, NO boots, NO shoes, NO undergarment; the bare body reads THROUGH the translucent net. GROIN: where the veil passes over his privates the SAME net-fabric simply DENSIFIES INTO AN OPAQUE PATCH of the identical veil (the veil ITSELF turning opaque there), blending seamlessly into the translucent net around it — NOT a separate brief/loincloth/underwear, NO waistband, NO shorts outline, NOTHING that looks like worn underwear, and NO glow/flare. He refracts into about FIVE-to-SIX overlapping, misregistered WHOLE copies of the same body drifting around him (his signature effect), each identical.\n"
 "FACE (Mystery Man): his EYES are VISIBLE and expressive (pale silver eyes, real emotion). His NOSE and MOUTH are covered by a half-mask of the SAME filament-net, but over the face the weave is DENSE, PACKED and OPAQUE — a SOLID luminous mask across the nose and mouth that FULLY HIDES those features (you CANNOT see the nose or mouth through it). Only the eyes are exposed, above the opaque mask. Same treatment on every refracted copy. NOT a sheer see-through mesh over the face — the mask is OPAQUE where it covers.\n"
 "THE ANSWER (Kael's weapon): a long POLEARM with a BLADED HOOK at EACH end (both ends identical) — each hook's OUTER edge a sharp curved BLADE, each hook's INNER curve SERRATED with saw-teeth for grappling. NEVER a straight spear, trident, or plain sword.\n\n")

SETTING=("SETTING: the VEILWOOD at dusk behind him — white trees grown as MATED PAIRS (TWO pale-white trunks BRAIDED together into a twisted double-helix, never one gnarled trunk), long white weeping-willow veil-fronds, deep-CRIMSON spiralgrass coiling underfoot, warm backlight, drifting motes.\n\n")

AVOID=("AVOID: a sheer or see-through mask that reveals the nose or mouth (the mask is DENSE and OPAQUE over the face); a fully visible nose or mouth; a blank/shadow-void face (the eyes MUST be visible); a separate brief, loincloth, underwear or waistband at the groin, or anything resembling worn underwear (the VEIL ITSELF turns opaque there); pants, trousers, shorts, boots, shoes or footwear (he is BAREFOOT and nude under the sheer veil); a plain smooth opaque cloak with no visible glowing net-weave; a tattered/ragged veil (it is MANY-FOLDED); the Veilweave as just a grid printed on skin; a bright glow/flare at the groin; THE ANSWER as a straight spear/trident/plain sword; a grid of panels or multiple separate panels; caption text, lettering, speech bubbles, watermark; flat low-detail basic comic rendering.")

full=legend+STYLE+FORMAT+SUBJECT+SETTING+AVOID

def b64(p): return base64.b64encode(open(p,"rb").read()).decode()
refs=[{"b64":b64(RT+"/style_hi.jpg"),"label":"RYO TORO STYLE MASTER"},
      {"b64":b64(RT+"/veilweave_net.jpg"),"label":"VEILWEAVE"}]
body=json.dumps({"provider":"gemini","model":"gemini-3.1-flash-image-preview","imageIntent":"scene",
  "prompt":full,"reference_images_b64":refs,"textFirst":True,
  "imageSize":"4K","aspect_ratio":"3:4","size":"3072x4096","n":1}).encode()
print("payload %.2fMB refs=%d promptchars=%d portrait 3:4 4K"%(len(body)/1048576,len(refs),len(full)))
req=urllib.request.Request("http://localhost:3000/api/image",data=body,headers={"Content-Type":"application/json"})
t=time.time()
try:
    d=json.loads(urllib.request.urlopen(req,timeout=300).read()); url=d.get("url","")
    if url.startswith("data:"):
        open(OUT+"/kael_solo.png","wb").write(base64.b64decode(url.split(",",1)[1]))
        print("OK %.1fs provider=%s -> kael_solo.png"%(time.time()-t,d.get("provider")))
    elif url.startswith("http"):
        img=urllib.request.urlopen(url,timeout=180).read(); open(OUT+"/kael_solo.png","wb").write(img)
        print("OK %.1fs %dKB"%(time.time()-t,len(img)//1024))
    else: print("NO IMAGE:",json.dumps(d)[:500])
except urllib.error.HTTPError as e: print("HTTP %s: %s"%(e.code,e.read()[:500]))
except Exception as e: print("ERR:",e)
print("DONE")
