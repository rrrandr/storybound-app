import base64, json, urllib.request, urllib.error, time
OUT="/private/tmp/claude-501/-Users-romantsukerman-storybound-app/f8f628bd-81c8-49d1-a1cd-f0b7bc1b48ee/scratchpad/dashscope_compare"
RT=OUT+"/refs2"
prompt=open(OUT+"/compressed_prompt.txt").read()
neg=open(OUT+"/compressed_negative.txt").read().strip()
SHEET="COMPOSITION: one SQUARE image, a 2x2 grid of four equal comic panels (top-left, top-right, bottom-left, bottom-right), thin gutters between them. Do NOT stack panels vertically; do NOT output a tall strip. "

def durl(p):
    return "data:image/jpeg;base64,"+base64.b64encode(open(p,"rb").read()).decode()

def legend3():
    return ("REFERENCE IMAGES (provided in THIS order — match each for the trait named; do NOT copy their aspect ratio or layout): "
     "1) KWISHEEN BODY-PLAN ANCHOR — body plan for BOTH Threxa and Orun: humanoid torso, two arms, a LOWER BODY OF DISTINCT BONELESS TENTACLES replacing legs (NOT legs, NOT skirt/loincloth, NOT fish tail), smooth pebbled cephalopod skin, coral-dreadlock hair. "
     "2) RYO TORO STYLE MASTER — match this ink linework, angular contour, shading and colour rendering. "
     "3) VEILWEAVE GARMENT — the sheer hooded translucent refraction garment Kael wears, refracting him into overlapping echoes. "
     "Kael is a First Favored: athletic build, silver-white hair.\n\n")

def legend4():
    return ("REFERENCE IMAGES (provided in THIS order — match each for the trait named; do NOT copy their aspect ratio or layout): "
     "1) KWISHEEN BODY-PLAN ANCHOR — body plan for BOTH Threxa and Orun: humanoid torso, two arms, a LOWER BODY OF DISTINCT BONELESS TENTACLES replacing legs, smooth pebbled cephalopod skin, coral-dreadlock hair. "
     "2) RYO TORO STYLE MASTER — match this ink linework, angular contour, shading and colour rendering. "
     "3) VEILWEAVE GARMENT — the sheer hooded translucent refraction garment Kael wears. "
     "4) FIRST FAVORED — Kael's build, face, and silver-white hair.\n\n")

def run(tag, images, legend, size, model="wan2.7-image-pro"):
    body=json.dumps({"model":model,"prompt":SHEET+legend+prompt,"negative_prompt":neg,"size":size,"n":1,"images":images}).encode()
    print("[%s] payload %.2fMB refs=%d size=%s"%(tag,len(body)/1048576,len(images),size))
    req=urllib.request.Request("http://localhost:3000/api/dashscope-image",data=body,headers={"Content-Type":"application/json"})
    t=time.time()
    try:
        d=json.loads(urllib.request.urlopen(req,timeout=300).read()); url=d.get("url")
        if url:
            img=urllib.request.urlopen(url,timeout=180).read(); fn=OUT+"/format_%s.png"%tag; open(fn,"wb").write(img)
            print("[%s] OK %.1fs %dKB usage=%s -> %s"%(tag,time.time()-t,len(img)//1024,json.dumps(d.get("usage")),fn))
        else: print("[%s] NO URL: %s"%(tag,json.dumps(d)[:400]))
    except urllib.error.HTTPError as e: print("[%s] HTTP %s: %s"%(tag,e.code,e.read()[:400]))
    except Exception as e: print("[%s] ERR: %s"%(tag,e))

kw=durl(RT+"/kwisheen.jpg"); st=durl(RT+"/style.jpg"); vw=durl(RT+"/veilweave.jpg"); ffsq=durl(RT+"/ff_sq.jpg")
run("A_3sq",      [kw,st,vw],      legend3(), "2K")
run("B_4sq",      [kw,st,vw,ffsq], legend4(), "2K")
print("DONE")
