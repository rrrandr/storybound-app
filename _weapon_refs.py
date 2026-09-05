import base64, json, urllib.request, urllib.error, time
OUT="/private/tmp/claude-501/-Users-romantsukerman-storybound-app/f8f628bd-81c8-49d1-a1cd-f0b7bc1b48ee/scratchpad"
RT=OUT+"/dashscope_compare/refs2"
style=base64.b64encode(open(RT+"/style_hi.jpg","rb").read()).decode()

ORTHO=("A CLEAN ORTHOGRAPHIC WEAPON CONCEPT SHEET on a plain pale neutral background (no scene, no character, no text): "
 "THE ANSWER — a double-ended POLEARM shown full-length and horizontal, both ends clearly visible. BOTH ends are "
 "IDENTICAL DEEP QUESTION-MARK HOOKS: each end curls back on itself like a question mark / large fish-hook, deep "
 "enough to catch a limb or a neck. The OUTER edge of each hook is a sharp curved BLADE; the INNER curve of each "
 "hook is SERRATED with saw-teeth. A long weighted central SHAFT connects the two mirrored hooks. Symmetric, both "
 "ends the same. Ryo Toro ink style — crisp confident linework, clean rendering. Just the weapon, centered.")

CINE=("A DRAMATIC ACTION illustration: a silver-white-haired warrior mid-swing, wielding THE ANSWER — a double-ended "
 "polearm with a DEEP question-mark HOOK at each end (outer edge a blade, inner curve serrated), swung in a bold arc "
 "with motion energy, dramatic backlight, in a pale white Veilwood. Ryo Toro ink-and-colour style, high detail.")

def gen(tag, prompt):
    body=json.dumps({"provider":"gemini","model":"gemini-3.1-flash-image-preview","imageIntent":"scene",
      "prompt":prompt,"reference_images_b64":[{"b64":style,"label":"RYO TORO STYLE — match this linework/rendering"}],
      "textFirst":True,"imageSize":"2K","aspect_ratio":"1:1","size":"2048x2048","n":1}).encode()
    print("[%s] chars=%d"%(tag,len(prompt)))
    req=urllib.request.Request("http://localhost:3000/api/image",data=body,headers={"Content-Type":"application/json"})
    for attempt in (1,2,3):
        t=time.time()
        try:
            d=json.loads(urllib.request.urlopen(req,timeout=300).read()); url=d.get("url","")
            if url.startswith("data:"):
                open(OUT+"/weapon_%s.png"%tag,"wb").write(base64.b64decode(url.split(",",1)[1])); print("[%s] OK %.1fs -> weapon_%s.png"%(tag,time.time()-t,tag)); return
            else: print("[%s] NO IMAGE %s"%(tag,json.dumps(d)[:200]))
        except urllib.error.HTTPError as e: print("[%s] HTTP %s (try %d): %s"%(tag,e.code,attempt,e.read()[:150]))
        except Exception as e: print("[%s] ERR (try %d): %s"%(tag,attempt,e))
    print("[%s] FAILED"%tag)

gen("ortho", ORTHO)
gen("cine", CINE)
print("DONE")
