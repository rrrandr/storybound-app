import base64, json, urllib.request, urllib.error, time, sys
OUT="/private/tmp/claude-501/-Users-romantsukerman-storybound-app/f8f628bd-81c8-49d1-a1cd-f0b7bc1b48ee/scratchpad/dashscope_compare"
RT=OUT+"/refs"
prompt=open(OUT+"/compressed_prompt.txt").read()
neg=open(OUT+"/compressed_negative.txt").read().strip()
legend=("REFERENCE IMAGES (provided in THIS order — match each for the trait named; do NOT copy their layout): "
 "1) KWISHEEN BODY-PLAN ANCHOR — the exact body plan for BOTH Threxa and Orun: a humanoid torso with two arms and a LOWER BODY OF DISTINCT BONELESS TENTACLES replacing the legs (NOT legs, NOT a skirt or loincloth, NOT a fish tail), smooth pebbled cephalopod skin, coral-dreadlock hair. "
 "2) RYO TORO STYLE MASTER — match this exact ink linework, angular contour, shading and colour rendering across the whole image. "
 "3) VEILWEAVE GARMENT — the sheer hooded translucent refraction garment Kael wears, refracting him into overlapping echoes. "
 "4) FIRST FAVORED — Kael's build, face, and silver-white hair.\n\n")
def durl(p):
    return "data:image/jpeg;base64,"+base64.b64encode(open(p,"rb").read()).decode()
images=[durl(RT+"/kwisheen.jpg"), durl(RT+"/style.jpg"), durl(RT+"/veilweave.jpg"), durl(RT+"/ff.jpg")]
body=json.dumps({"model":"wan2.7-image-pro","prompt":legend+prompt,"negative_prompt":neg,"size":"2K","n":1,"images":images}).encode()
print("payload MB: %.2f, refs: %d"%(len(body)/1048576, len(images)))
req=urllib.request.Request("http://localhost:3000/api/dashscope-image",data=body,headers={"Content-Type":"application/json"})
t=time.time()
try:
    d=json.loads(urllib.request.urlopen(req,timeout=300).read()); url=d.get("url")
    if url:
        img=urllib.request.urlopen(url,timeout=180).read(); open(OUT+"/wan_WITH_REFS.png","wb").write(img)
        print("wan+refs OK %.1fs %dKB usage=%s"%(time.time()-t,len(img)//1024,json.dumps(d.get("usage"))))
    else: print("NO URL:",json.dumps(d)[:400])
except urllib.error.HTTPError as e: print("HTTP %s: %s"%(e.code,e.read()[:400]))
except Exception as e: print("ERR:",e)
