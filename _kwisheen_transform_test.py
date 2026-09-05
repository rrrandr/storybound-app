import base64, json, urllib.request, urllib.error, time
OUT="/private/tmp/claude-501/-Users-romantsukerman-storybound-app/f8f628bd-81c8-49d1-a1cd-f0b7bc1b48ee/scratchpad"
DC=OUT+"/dashscope_compare"
def b(p): return base64.b64encode(open(p,"rb").read()).decode()
style=b(DC+"/refs2/style_hi.jpg"); kael=b(DC+"/kael_solo.png"); kwi=b(DC+"/orun_solo.png")
answer=b("/Users/romantsukerman/storybound-app/public/assets/Fatelands/The_Answer_Anchor_v1.jpg")

P=("STYLE — Ryo Toro: a richly detailed manga-comic illustration, confident ink linework, layered shading, high detail, dramatic lighting. Match the RYO TORO STYLE reference. NOT a photo, NOT 3D.\n\n"
"DETAIL PRIORITY (important): spend the DETAIL and focus on the CENTRAL FIGURES — Kael and the Kwisheen — their faces, anatomy, the WEAPONS, the Veilweave, the tentacles, and the transformation. The CROWD is BACKGROUND: render it LOOSER, rougher and LESS detailed; it must NOT steal detail or focus from the two combatants. A simpler/rougher crowd is fine; unclear central figures or a missing weapon are NOT.\n\n"
"COMPOSITION: ONE SQUARE image = a 2x2 grid of four equal comic panels (top-left=1, top-right=2, bottom-left=3, bottom-right=4), thin gutters. NO lettering, captions, speech balloons or SFX text anywhere. Use STRONGLY DIFFERENT, DRAMATIC camera angles per panel (extreme low-angle, high overhead, over-the-shoulder, dutch tilt, extreme close) — not four similar eye-level shots.\n\n"
"SETTING (every panel): a rough DOCKSIDE BAR / tavern in the port of PULSE POINT at night — weathered wood, oil lanterns, barrels, a long bar; through the windows, ships' masts and dark water. A loose BACKGROUND CROWD of human onlookers (sailors, pirates, dock workers) rings the fight and reacts (shock, alarm, jeering) — kept simple, never more detailed than the combatants.\n\n"
"CHARACTERS:\n"
"- KAEL — a MALE First Favored (he/him): silver-white hair, athletic; wears the glowing white mesh VEILWEAVE (an open net weave over a bare body, refracting him into faint overlapping semi-transparent afterimages); WIELDS THE ANSWER in EVERY panel — a double-ended polearm with a DEEP question-mark HOOK at EACH end (match the WEAPON reference; it is prominent and clearly visible, NEVER a plain stick/staff, NEVER a spear/trident/sword). Match Kael to his REFERENCE.\n"
"- THE KWISHEEN — a tall Kwisheen (match the KWISHEEN reference): smooth CRIMSON papillae skin, coral-dreadlock hair, a coral-and-shell HARNESS (CLOTHED in every panel — NEVER nude), and about six boneless waist TENTACLES that are LONGER than its legs and ACTIVELY FIGHTING — coiling Kael's ankle / wrist / weapon-shaft, bracing against the floor, one snaking around to BACKSTAB — never idle or merely hanging. A SHAPESHIFTER, being overpowered.\n\n"
"PANELS — a TRANSFORMATION SEQUENCE. The Kwisheen's FORM deliberately CHANGES across panels (intentional, not a continuity error); Kael stays the same silver-haired First Favored in the mesh Veilweave, wielding The Answer, throughout:\n"
"1) [top-left] DRAMATIC LOW-ANGLE wide shot: Kael presses the attack with THE ANSWER (double-hook polearm, clearly visible), driving the CLOTHED Kwisheen back and winning; the Kwisheen's long tentacles lash tactically — one COILING Kael's ankle, one BRACING the floor, one reaching to hook his wrist. Loose background crowd.\n"
"2) [top-right] OVER-KAEL'S-SHOULDER medium shot: the Kwisheen SHAPESHIFTS — crimson papillae skin blanching and reshaping mid-change into a beautiful FEMALE First Favored (silver-white hair, smooth skin, pleading eyes, in a simple pale shift dress), hands raised to STAY Kael's hand; a tentacle still trails from the half-changed lower body. Kael's silver eyes WIDEN, his strike (The Answer) hesitating.\n"
"3) [bottom-left] EXTREME LOW-ANGLE / worm's-eye dynamic action: Kael is NOT fooled — he STRIKES, THE ANSWER's hooked end driving in hard with a flash of impact; the female-First-Favored mimic (pale shift) takes the blow. Fierce resolve on Kael's face.\n"
"4) [bottom-right] EXTREME CLOSE-UP, dutch tilt: the mimic LOSES COHERENCE mid-transformation — a HALF-First-Favored / HALF-Kwisheen hybrid split down the centre: one half a smooth silver-haired First Favored face, the other half crimson Kwisheen papillae with coral dreadlocks; its FINGERS dissolving into small writhing TENTACLES; face contorted in PAIN, mouth open. Background crowd recoils in horror.\n\n"
"EMOTION: every face high-intensity — Kael fierce/resolute (widening in panel 2), the Kwisheen desperate then pleading then agonized, the crowd shocked. No blank faces.\n"
"AVOID: any lettering/text/SFX; a photo look; a NUDE Kwisheen (it wears a shell harness); The Answer rendered as a plain stick/staff or missing (it is the prominent double-hook polearm in every panel); idle/hanging Kwisheen tentacles (they fight actively and are longer than the legs); the crowd rendered in more detail than the central combatants; Kael changing sex or losing the Veilweave; any character other than the Kwisheen changing form.")

refs=[{"b64":style,"label":"RYO TORO STYLE — match linework/rendering"},
      {"b64":kael,"label":"KAEL REFERENCE — male First Favored, silver hair, mesh Veilweave"},
      {"b64":kwi,"label":"KWISHEEN REFERENCE — crimson papillae skin, coral dreads, tentacles, shell harness"},
      {"b64":answer,"label":"THE ANSWER — weapon shape: double-ended polearm, question-mark hook at each end"}]
body=json.dumps({"provider":"gemini","model":"gemini-3.1-flash-image-preview","imageIntent":"scene",
  "prompt":P,"reference_images_b64":refs,"textFirst":True,"imageSize":"4K","aspect_ratio":"1:1","size":"4096x4096","n":1}).encode()
print("payload %.2fMB refs=%d chars=%d"%(len(body)/1048576,len(refs),len(P)))
req=urllib.request.Request("http://localhost:3000/api/image",data=body,headers={"Content-Type":"application/json"})
for attempt in (1,2,3):
    t=time.time()
    try:
        d=json.loads(urllib.request.urlopen(req,timeout=300).read()); url=d.get("url","")
        if url.startswith("data:"):
            open(OUT+"/transform_test2.png","wb").write(base64.b64decode(url.split(",",1)[1])); print("OK %.1fs -> transform_test2.png"%(time.time()-t)); break
        else: print("NO IMAGE:",json.dumps(d)[:200])
    except urllib.error.HTTPError as e: print("HTTP %s (try %d): %s"%(e.code,attempt,e.read()[:150]))
    except Exception as e: print("ERR (try %d): %s"%(attempt,e))
print("DONE")
