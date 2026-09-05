import base64, json, urllib.request, urllib.error, time
OUT="/private/tmp/claude-501/-Users-romantsukerman-storybound-app/f8f628bd-81c8-49d1-a1cd-f0b7bc1b48ee/scratchpad/dashscope_compare"
RT=OUT+"/refs2"
def b64(p): return base64.b64encode(open(p,"rb").read()).decode()

STYLE=("STYLE — Ryo Toro (match the RYO TORO STYLE MASTER ref): lush, RICHLY RENDERED manga illustration — confident angular ink linework WITH intricate fine detail; layered ink + painterly shading; rendered texture on skin, hair, fabric and metal; dense decorative detail; dramatic high contrast, deep blacks, warm sepia backlight. A drawn full-colour illustration, NOT a photo, NOT 3D. MAXIMISE detail — a gallery-quality character portrait.\n\n")
FORMAT=("FORMAT: a SINGLE TALL PORTRAIT of ONE figure — a dramatic, gallery-quality CHARACTER-INTRODUCTION splash (full body or three-quarter length, a poised stance). ONE single image, NOT a grid, NOT multiple panels, NOT a comic page. No caption text, no lettering, no speech bubbles, no watermark.\n\n")
SETTING=("SETTING: the VEILWOOD at dusk behind the figure — white trees grown as MATED PAIRS (TWO pale-white trunks BRAIDED around each other into a twisted double-helix, never one single gnarled trunk); long white weeping-willow veil-fronds; the ground covered in deep-CRIMSON grass that grows in MATED BRAIDS — PAIRS of blades twisting AROUND each other like braided rope (the SAME mated-pair growth as the trees), NOT single spiral coils, NOT individual curls; warm backlight, scattered glowing motes / soft bokeh points of light in the air.\n\n")

KAEL=("SUBJECT — KAEL, a First Favored: tall, athletic, silver-white hair, HOOD UP; a poised, watchful heroic stance in the Veilwood, THE ANSWER held ready.\n"
 "VEILWEAVE: a sheer, hooded, MANY-FOLDED veil woven from a luminous iridescent FILAMENT-NET (a fine glowing web of thread-lines studded with sparkling light-nodes), the net clearly VISIBLE as the veil's weave and glinting over the skin, in MANY soft folds (like the reference — NOT tattered, NOT a plain cloak, NOT a grid on skin). Beneath the sheer veil he is NUDE and BAREFOOT — NO pants, NO boots, NO undergarment; the bare body reads through the translucent net. GROIN: over his privates the same net-fabric densifies into a MATTE, FLAT, OPAQUE patch — soft matte opaque white, or soft shadow — quietly turning solid there and blending into the sheer net around it. It is NOT sparkling, NOT glittering, NOT a bright crystalline or luminous patch, NOT a glow, NOT a brief/underwear/waistband — just a calm matte opaque area, easy to overlook. He refracts into about FIVE-to-SIX overlapping misregistered WHOLE copies drifting around him (his signature effect), each identical.\n"
 "FACE (Mystery Man): EYES VISIBLE and expressive (pale silver eyes). NOSE and MOUTH covered by a half-mask of the SAME filament-net, but over the face the weave is DENSE, PACKED and OPAQUE — a SOLID luminous mask that FULLY HIDES the nose and mouth (cannot be seen through). Only the eyes show, above the opaque mask. Same on every copy.\n"
 "THE ANSWER (Kael's weapon): a long POLEARM with a DEEP HOOK at EACH end (both ends identical), each hook curled like a QUESTION MARK — the curve wraps far enough around to physically CATCH and hold a limb or a neck (a true grappling hook, not a shallow curve). Each hook's OUTER edge is a sharp curved BLADE; each hook's INNER curve is SERRATED with saw-teeth to grip. NEVER a straight spear, trident, or plain sword.\n\n")
KAEL_AVOID=("a sheer/see-through mask revealing the nose or mouth (mask is DENSE and OPAQUE over the face); a visible nose or mouth; a blank/shadow-void face (eyes must show); a SPARKLING, glittering, bright or crystalline groin patch, or any glow there (the groin is MATTE, flat, opaque, calm); a brief/underwear/loincloth/waistband at the groin; pants, shorts, boots, shoes or footwear (BAREFOOT); a plain smooth cloak with no visible net-weave; a tattered/ragged veil; the veil as just a grid on skin; shallow or barely-curved hook ends on the weapon (they are DEEP question-mark hooks that can catch a neck); THE ANSWER as a straight spear/trident/plain sword; ")

THREXA=("SUBJECT — THREXA, a FEMALE Kwisheen warrior: full or three-quarter body, a proud poised stance in the Veilwood, her TIDE-TRIDENT held ready.\n"
 "Tall humanoid torso; a striking humanoid FACE fully VISIBLE and expressive (lipped mouth, HORIZONTAL capsule-shaped pupils, NO fangs — beautiful and fierce, NOT a monster); SMOOTH colour-shifting cephalopod skin with a fine pebbled papillae grain (NEVER reptilian scales) in BURNT-ORANGE iridescence; coral-dreadlock hair in a CONTRASTING deep TEAL-VIOLET (clearly a DIFFERENT colour from her orange skin); a fitted CORAL-AND-SHELL harness/armour over the torso (CLOTHED, NOT nude); lower body of about SIX distinct boneless TENTACLES from the waist (NOT legs, NOT a fish/mermaid tail), curling gracefully. Weapon = a TIDE-TRIDENT (long shaft ending in three barbed prongs).\n\n")
ORUN=("SUBJECT — ORUN, a MALE Kwisheen warrior: full or three-quarter body, a fierce aggressive stance in the Veilwood, his UNDERTIDE BLADE drawn.\n"
 "Same Kwisheen body plan; a humanoid FACE fully VISIBLE and intense (lipped mouth, HORIZONTAL capsule pupils, NO fangs); SMOOTH pebbled papillae skin (NEVER scales) in DEEP-CRIMSON with luminous GOLD VEINING tracing across his body; coral-dreadlock hair in a CONTRASTING pale ICE-CYAN (clearly a DIFFERENT colour from his crimson skin); a CORAL-AND-SHELL harness across the chest (CLOTHED, NOT nude); lower body of about SIX distinct boneless TENTACLES from the waist (NOT legs, NOT a fish tail). Weapon = a barbed UNDERTIDE BLADE (a curved, serrated single-edged blade). He is CLEARLY a DIFFERENT individual from Threxa — different colours, build and face.\n\n")
KW_AVOID=("reptilian scales; a fish or mermaid tail; legs instead of tentacles; a NUDE Kwisheen (they wear a coral-and-shell harness); hair the same colour as the skin; fangs or a monstrous/animal face; extra or missing arms; ")

BASE_AVOID=("multiple panels or a grid; more than one figure; caption text, lettering, speech bubbles, watermark; single spiral-coil grass (grass grows in MATED BRAIDS twisting around each other); a single un-braided tree trunk; flat low-detail basic rendering.")

def run(tag, subject, refs, extra_avoid):
    full=(("REFERENCE IMAGES (in THIS order; match the trait named; do NOT copy their aspect ratio): "+refs["legend"]+"\n\n")
          +STYLE+FORMAT+subject+SETTING+"AVOID: "+extra_avoid+BASE_AVOID)
    body=json.dumps({"provider":"gemini","model":"gemini-3.1-flash-image-preview","imageIntent":"scene",
      "prompt":full,"reference_images_b64":refs["imgs"],"textFirst":True,
      "imageSize":"4K","aspect_ratio":"3:4","size":"3072x4096","n":1}).encode()
    print("[%s] payload %.2fMB refs=%d chars=%d"%(tag,len(body)/1048576,len(refs["imgs"]),len(full)))
    for attempt in (1,2,3):
        req=urllib.request.Request("http://localhost:3000/api/image",data=body,headers={"Content-Type":"application/json"})
        t=time.time()
        try:
            d=json.loads(urllib.request.urlopen(req,timeout=300).read()); url=d.get("url","")
            if url.startswith("data:"):
                open(OUT+"/%s_solo.png"%tag,"wb").write(base64.b64decode(url.split(",",1)[1]))
                print("[%s] OK %.1fs -> %s_solo.png"%(tag,time.time()-t,tag)); return
            elif url.startswith("http"):
                img=urllib.request.urlopen(url,timeout=180).read(); open(OUT+"/%s_solo.png"%tag,"wb").write(img)
                print("[%s] OK %.1fs %dKB"%(tag,time.time()-t,len(img)//1024)); return
            else: print("[%s] NO IMAGE: %s"%(tag,json.dumps(d)[:300]))
        except urllib.error.HTTPError as e:
            print("[%s] HTTP %s (attempt %d): %s"%(tag,e.code,attempt,e.read()[:200]))
        except Exception as e:
            print("[%s] ERR (attempt %d): %s"%(tag,attempt,e))
    print("[%s] FAILED after retries"%tag)

style=b64(RT+"/style_hi.jpg"); veil=b64(RT+"/veilweave_net.jpg"); kw=b64(RT+"/kwisheen.jpg")
run("kael", KAEL,
    {"legend":"1) RYO TORO STYLE MASTER — match linework/rendering density/shading. 2) VEILWEAVE — the many-folded glowing filament-net veil over a nude barefoot body (the face-mask area is DENSE/OPAQUE per text).",
     "imgs":[{"b64":style,"label":"RYO TORO STYLE MASTER"},{"b64":veil,"label":"VEILWEAVE"}]},
    KAEL_AVOID)
run("threxa", THREXA,
    {"legend":"1) KWISHEEN BODY-PLAN ANCHOR — humanoid torso + two arms + ~six boneless waist TENTACLES; smooth papillae skin; coral-dreadlock hair (apply THREXA's colours from text). 2) RYO TORO STYLE MASTER — match linework/rendering density/shading.",
     "imgs":[{"b64":kw,"label":"KWISHEEN BODY-PLAN ANCHOR"},{"b64":style,"label":"RYO TORO STYLE MASTER"}]},
    KW_AVOID)
run("orun", ORUN,
    {"legend":"1) KWISHEEN BODY-PLAN ANCHOR — humanoid torso + two arms + ~six boneless waist TENTACLES; smooth papillae skin; coral-dreadlock hair (apply ORUN's colours from text). 2) RYO TORO STYLE MASTER — match linework/rendering density/shading.",
     "imgs":[{"b64":kw,"label":"KWISHEEN BODY-PLAN ANCHOR"},{"b64":style,"label":"RYO TORO STYLE MASTER"}]},
    KW_AVOID)
print("DONE")
