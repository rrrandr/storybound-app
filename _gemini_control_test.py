import base64, json, urllib.request, urllib.error, time
OUT="/private/tmp/claude-501/-Users-romantsukerman-storybound-app/f8f628bd-81c8-49d1-a1cd-f0b7bc1b48ee/scratchpad/dashscope_compare"
RT=OUT+"/refs2"
prompt=open(OUT+"/compressed_prompt.txt").read()
neg=open(OUT+"/compressed_negative.txt").read().strip()
SHEET="COMPOSITION: one SQUARE image, a 2x2 grid of four equal comic panels (top-left, top-right, bottom-left, bottom-right), thin gutters between them. Do NOT stack panels vertically; do NOT output a tall strip. "
legend4=("REFERENCE IMAGES (provided in THIS order — match each for the trait named; do NOT copy their aspect ratio or layout): "
 "1) KWISHEEN BODY-PLAN ANCHOR — body plan for BOTH Threxa and Orun: humanoid torso, two arms, a LOWER BODY OF DISTINCT BONELESS TENTACLES replacing legs, smooth pebbled cephalopod skin, coral-dreadlock hair. "
 "2) RYO TORO STYLE MASTER — match this ink linework, angular contour, shading and colour rendering. "
 "3) VEILWEAVE GARMENT — the sheer hooded translucent refraction garment Kael wears. "
 "4) FIRST FAVORED — Kael's build, face, and silver-white hair.\n\n")
def b64(p): return base64.b64encode(open(p,"rb").read()).decode()
refs=[{"b64":b64(RT+"/kwisheen.jpg"),"label":"KWISHEEN BODY-PLAN ANCHOR"},
      {"b64":b64(RT+"/style.jpg"),"label":"RYO TORO STYLE MASTER"},
      {"b64":b64(RT+"/veilweave.jpg"),"label":"VEILWEAVE GARMENT"},
      {"b64":b64(RT+"/ff_sq.jpg"),"label":"FIRST FAVORED"}]
full=SHEET+legend4+prompt+"\n\nAVOID: "+neg
body=json.dumps({"provider":"gemini","model":"gemini-3.1-flash-image-preview","imageIntent":"scene",
  "prompt":full,"reference_images_b64":refs,"textFirst":True,
  "imageSize":"2K","aspect_ratio":"1:1","size":"2048x2048","n":1}).encode()
print("payload %.2fMB refs=%d promptchars=%d"%(len(body)/1048576,len(refs),len(full)))
req=urllib.request.Request("http://localhost:3000/api/image",data=body,headers={"Content-Type":"application/json"})
t=time.time()
try:
    d=json.loads(urllib.request.urlopen(req,timeout=300).read())
    url=d.get("url","")
    if url.startswith("data:"):
        open(OUT+"/gemini_control.png","wb").write(base64.b64decode(url.split(",",1)[1]))
        print("gemini OK %.1fs provider=%s -> gemini_control.png"%(time.time()-t,d.get("provider")))
    elif url.startswith("http"):
        img=urllib.request.urlopen(url,timeout=180).read(); open(OUT+"/gemini_control.png","wb").write(img)
        print("gemini OK %.1fs %dKB provider=%s"%(time.time()-t,len(img)//1024,d.get("provider")))
    else:
        print("NO IMAGE:",json.dumps(d)[:500])
except urllib.error.HTTPError as e: print("HTTP %s: %s"%(e.code,e.read()[:500]))
except Exception as e: print("ERR:",e)
print("DONE")
