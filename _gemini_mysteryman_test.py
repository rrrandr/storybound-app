import base64, json, urllib.request, urllib.error, time
OUT="/private/tmp/claude-501/-Users-romantsukerman-storybound-app/f8f628bd-81c8-49d1-a1cd-f0b7bc1b48ee/scratchpad/dashscope_compare"
RT=OUT+"/refs2"
prompt=open(OUT+"/compressed_prompt.txt").read()
neg=open(OUT+"/compressed_negative.txt").read().strip()

MM=("!!! MYSTERY MAN MODE — KAEL'S FACE IS WITHHELD (this OVERRIDES any later 'emotion reads on the face' "
 "instruction FOR KAEL ONLY). Kael's identity is a secret and the VEILWEAVE is the concealment device. "
 "Render ALL of Kael's ~six refraction copies — INCLUDING the central most-solid copy — with NO RESOLVABLE FACE: "
 "each face dissolved into overlapping translucent refraction planes AND/OR lost inside hood-forward interior shadow "
 "AND/OR turned away from camera. NO clear eyes, nose, mouth, or expression on ANY copy of Kael, in ANY panel. "
 "His silver-white hair, athletic build, the hooded Veilweave garment, and THE ANSWER polearm stay fully visible and "
 "consistent — ONLY the face is denied. Kael's emotion reads through POSTURE and MOTION, never the face. Frame the wide "
 "shots over-the-shoulder from behind Kael where natural. He must still read as a DYNAMIC, competent fighter mid-action "
 "(lunging, parrying, striking) — concealed, NOT static, NOT standing dead-center. The two KWISHEEN (Threxa & Orun) are "
 "FULLY visible with normal readable faces and shifting expressions — only KAEL is concealed.\n\n")

SHEET="COMPOSITION: one SQUARE image, a 2x2 grid of four equal comic panels (top-left, top-right, bottom-left, bottom-right), thin gutters between them. Do NOT stack panels vertically; do NOT output a tall strip. "
legend3=("REFERENCE IMAGES (provided in THIS order — match each for the trait named; do NOT copy their aspect ratio or layout): "
 "1) KWISHEEN BODY-PLAN ANCHOR — body plan for BOTH Threxa and Orun: humanoid torso, two arms, a LOWER BODY OF DISTINCT BONELESS TENTACLES replacing legs, smooth pebbled cephalopod skin, coral-dreadlock hair. "
 "2) RYO TORO STYLE MASTER — match this ink linework, angular contour, shading and colour rendering. "
 "3) VEILWEAVE GARMENT — the sheer hooded translucent refraction garment Kael wears (use for the GARMENT and his build; his FACE stays concealed per Mystery Man mode). "
 "Kael: tall, athletic, silver-white hair, face WITHHELD.\n\n")

def b64(p): return base64.b64encode(open(p,"rb").read()).decode()
refs=[{"b64":b64(RT+"/kwisheen.jpg"),"label":"KWISHEEN BODY-PLAN ANCHOR"},
      {"b64":b64(RT+"/style.jpg"),"label":"RYO TORO STYLE MASTER"},
      {"b64":b64(RT+"/veilweave.jpg"),"label":"VEILWEAVE GARMENT"}]
avoid=neg+", a clear or readable face on Kael, Kael's eyes visible, distinct facial features on any Veilweave echo, one echo showing a clear face while others are hidden"
full=MM+SHEET+legend3+prompt+"\n\nAVOID: "+avoid
body=json.dumps({"provider":"gemini","model":"gemini-3.1-flash-image-preview","imageIntent":"scene",
  "prompt":full,"reference_images_b64":refs,"textFirst":True,
  "imageSize":"2K","aspect_ratio":"1:1","size":"2048x2048","n":1}).encode()
print("payload %.2fMB refs=%d promptchars=%d"%(len(body)/1048576,len(refs),len(full)))
req=urllib.request.Request("http://localhost:3000/api/image",data=body,headers={"Content-Type":"application/json"})
t=time.time()
try:
    d=json.loads(urllib.request.urlopen(req,timeout=300).read()); url=d.get("url","")
    if url.startswith("data:"):
        open(OUT+"/gemini_mysteryman.png","wb").write(base64.b64decode(url.split(",",1)[1]))
        print("gemini MM OK %.1fs provider=%s -> gemini_mysteryman.png"%(time.time()-t,d.get("provider")))
    elif url.startswith("http"):
        img=urllib.request.urlopen(url,timeout=180).read(); open(OUT+"/gemini_mysteryman.png","wb").write(img)
        print("gemini MM OK %.1fs %dKB"%(time.time()-t,len(img)//1024))
    else: print("NO IMAGE:",json.dumps(d)[:500])
except urllib.error.HTTPError as e: print("HTTP %s: %s"%(e.code,e.read()[:500]))
except Exception as e: print("ERR:",e)
print("DONE")
