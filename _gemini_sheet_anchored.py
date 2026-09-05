import base64, json, urllib.request, urllib.error, time
OUT="/private/tmp/claude-501/-Users-romantsukerman-storybound-app/f8f628bd-81c8-49d1-a1cd-f0b7bc1b48ee/scratchpad/dashscope_compare"
RT=OUT+"/refs2"
def b64(p): return base64.b64encode(open(p,"rb").read()).decode()

legend=("REFERENCE IMAGES (in THIS order — each is the LOCKED look of a character; match that character to their reference EXACTLY for face, colours, hair, wardrobe, weapon and body; do NOT copy the refs' pose or aspect): "
 "1) KAEL REFERENCE — Kael the First Favored: hooded Veilweave (a glowing filament-NET veil), silver-white hair, a DENSE OPAQUE net half-mask over nose+mouth with EYES visible, the veil going luminous-WHITE-opaque across the hips/thighs (modest) and sheer elsewhere, THE ANSWER polearm. "
 "2) THREXA REFERENCE — the FEMALE Kwisheen: burnt-orange papillae skin, teal-violet coral-dreadlocks, coral-and-shell harness, six waist tentacles, a tide-trident. "
 "3) ORUN REFERENCE — the MALE Kwisheen: deep-crimson skin with gold veining, ice-cyan coral-dreadlocks, coral-and-shell harness, six waist tentacles, an undertide blade. "
 "4) RYO TORO STYLE MASTER — match this linework, rendering density and shading.\n"
 "USE THE CHARACTER REFERENCES FOR IDENTITY ONLY — match each character's face structure, skin colour, hair colour+style, wardrobe, weapon and body plan to their reference. Do NOT copy the reference's calm standing pose, frontal framing, or neutral expression: every figure's POSE and EXPRESSION are set by the panel below (dynamic combat action + strong emotion).\n\n")

STYLE=("STYLE — Ryo Toro: lush, richly rendered manga illustration, angular ink linework with intricate fine detail, layered shading, dense ornament, high contrast, warm backlight. MAXIMISE detail — never a flat basic comic. NOT a photo, NOT 3D.\n\n")
COMP=("COMPOSITION: ONE SQUARE image = a 2x2 grid of four equal comic panels (top-left=1, top-right=2, bottom-left=3, bottom-right=4), thin gutters. NOT a vertical strip. No caption text, no SFX lettering, no speech bubbles, no watermark.\n\n")
SETTING=("SETTING (every panel): the VEILWOOD at dusk — white trees grown as MATED PAIRS (two pale-white trunks BRAIDED together into a double-helix, never one gnarled trunk), long white weeping-willow veil-fronds, ground of deep-CRIMSON grass growing in MATED BRAIDS (pairs of blades twisting around each other, NOT spiral coils), warm backlight, scattered glowing bokeh motes.\n\n")

KEYS=("KEY CHARACTER RULES (hold these in every panel):\n"
 "- KAEL wears the VEILWEAVE: the glowing filament-NET weave stays DENSE and VISIBLE across the whole veil (do not let it fade to smooth streaks); it is translucent but net-dense enough to be tastefully MODEST (never fully see-through / never explicit); luminous-WHITE-opaque gradient over the hips and thighs; a DENSE OPAQUE net half-mask hides his nose+mouth with EYES visible; hood up. He refracts into several overlapping WHOLE copies, and EVERY copy holds its own identical THE ANSWER.\n"
 "- THE ANSWER (Kael's weapon, every copy): a polearm with a DEEP QUESTION-MARK HOOK at each end (outer edge a blade, inner curve serrated to catch a limb/neck) — never a straight spear, trident, or plain sword, never shallow curves.\n"
 "- THREXA and ORUN are CLOTHED in their coral-and-shell harnesses (never nude), keep their DISTINCT skin/hair colours from their references, and use their TENTACLES TACTICALLY (gripping the polearm, snaking behind to backstab), not decoratively. ORUN ALWAYS has pale ICE-CYAN coral-dreadlocks in EVERY panel (never short, dark or plain hair).\n"
 "- KAEL is ALWAYS in DYNAMIC combat MOTION and OFF-CENTRE — leaping, dodging, twisting aside, lunging, striking, flanking — a DIFFERENT dynamic pose and screen position in every panel; NEVER standing still, NEVER serene, NEVER floating dead-centre. His refracted copies are EACH caught in a different action pose (one lunging, one mid-swing, one crouched to strike, one leaping), not a row of calm standing figures.\n"
 "- EVERY face shows STRONG EMOTION fitting the beat — snarling, yelling, teeth-gritted effort, alarm, fierce focus — NEVER blank, calm, serene or neutral. Kael's visible EYES (his only exposed feature) must still carry the emotion: narrowed, intense, focused.\n\n")

PANELS=("PANELS (dynamic action + strong expression in every one):\n"
 "1) [top-left] CLOSE-UP on ORUN mid-SNARL — teeth bared, eyes blazing, ice-cyan dreads whipping — his undertide blade cocked back to strike; ferocious, in motion.\n"
 "2) [top-right] KAEL mid-ACTION, OFF-CENTRE — twisting/lunging as he sweeps THE ANSWER (hooks) in a hard arc to parry, veil and hood streaming with the motion, silver eyes narrowed and fierce above the opaque half-mask; his armed refracted copies fanning out around him in DIFFERENT lunging/striking poses. NOT centred, NOT static.\n"
 "3) [bottom-left] DISORIENTATION: Threxa + Orun back-to-back in the centre, faces ALARMED and straining, SURROUNDED by about six refracted KAEL copies EACH in a different dynamic ACTION pose (one leaping in, one mid-swing, one crouched to strike, one lunging), all hooded/masked/armed — Threxa SNARLS and thrusts her trident THROUGH one illusory Kael (it passes harmlessly through the copy), Orun whirls wide-eyed to guard his back; tentacles lashing at phantoms.\n"
 "4) [bottom-right] KAEL LEAPS/DRIVES in from one side (dynamic, off-centre, mid-motion) and pins BOTH Threxa and Orun against a braided twin-trunk tree with THE ANSWER — the hooks catching them, Kael's eyes fierce; both Kwisheen STRAIN and struggle, faces gritted with effort, tentacles gripping the shaft. ORUN keeps his ice-cyan dreads. Clear: exactly two Kwisheen, one braided tree, one hooked polearm.\n\n")

AVOID=("AVOID: Kael standing still, serene, passive, symmetrical, or centred / 'floating dead-centre' (he is DYNAMIC, off-centre and mid-action in every panel, a different pose each time); blank, calm, serene or neutral faces on ANY character (all faces show strong emotion — snarl/yell/effort/alarm/fierce focus); Kael's refracted copies all standing in the same calm row (each is a distinct action pose); ORUN with short, dark or plain hair (he ALWAYS has pale ice-cyan coral-dreadlocks); Kael's veil fully see-through / body over-exposed (net stays dense + modest); the filament-net weave faint or missing; any Kael copy empty-handed (every copy holds The Answer); THE ANSWER as a straight spear/trident/plain sword or with shallow hooks; a sheer mask showing the nose/mouth; NUDE Kwisheen (they wear shell harnesses); Threxa and Orun off-model or looking alike or hair-colour matching skin; limp/ornamental tentacles; a Kwisheen vanishing from panel 3 or 4; illegible panel 4; single spiral-coil grass; a single un-braided tree; reptilian scales; a fish/mermaid tail; extra/missing arms; weapons changing shape; a vertical strip or stacked panels; caption text, lettering, watermark; flat low-detail rendering.")

full=legend+STYLE+COMP+SETTING+KEYS+PANELS+AVOID
refs=[{"b64":b64(OUT+"/kael_solo.png"),"label":"KAEL REFERENCE"},
      {"b64":b64(OUT+"/threxa_solo.png"),"label":"THREXA REFERENCE"},
      {"b64":b64(OUT+"/orun_solo.png"),"label":"ORUN REFERENCE"},
      {"b64":b64(RT+"/style_hi.jpg"),"label":"RYO TORO STYLE MASTER"}]
body=json.dumps({"provider":"gemini","model":"gemini-3.1-flash-image-preview","imageIntent":"scene",
  "prompt":full,"reference_images_b64":refs,"textFirst":True,"imageSize":"4K","aspect_ratio":"1:1","size":"4096x4096","n":1}).encode()
print("payload %.2fMB refs=%d chars=%d"%(len(body)/1048576,len(refs),len(full)))
for attempt in (1,2,3):
    req=urllib.request.Request("http://localhost:3000/api/image",data=body,headers={"Content-Type":"application/json"})
    t=time.time()
    try:
        d=json.loads(urllib.request.urlopen(req,timeout=300).read()); url=d.get("url","")
        if url.startswith("data:"):
            open(OUT+"/sheet_anchored.png","wb").write(base64.b64decode(url.split(",",1)[1])); print("OK %.1fs -> sheet_anchored.png"%(time.time()-t)); break
        elif url.startswith("http"):
            img=urllib.request.urlopen(url,timeout=180).read(); open(OUT+"/sheet_anchored.png","wb").write(img); print("OK %.1fs %dKB"%(time.time()-t,len(img)//1024)); break
        else: print("NO IMAGE:",json.dumps(d)[:300])
    except urllib.error.HTTPError as e: print("HTTP %s (attempt %d): %s"%(e.code,attempt,e.read()[:200]))
    except Exception as e: print("ERR (attempt %d): %s"%(attempt,e))
print("DONE")
