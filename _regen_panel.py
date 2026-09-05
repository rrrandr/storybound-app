#!/usr/bin/env python3
# REGEN EXECUTOR — the structural repair path. Regenerates the WHOLE target PANEL (not a tight box),
# conditioned on clean SIBLING panels (passed as continuity references) so the cast / style / setting match,
# then pastes ONLY that panel's quadrant back — so the OTHER panels stay byte-identical (contract §3 for
# siblings). Used when Klein escalates, or for structural defects Klein can't reach. Stateless like execution.
import sys, json, base64, time, io, urllib.request, urllib.parse
from PIL import Image, ImageFilter, ImageDraw

BASE='http://localhost:3000'
def _post(path,data):
    req=urllib.request.Request(BASE+path,data=json.dumps(data).encode(),headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(req,timeout=120) as r: return json.load(r)
def _get(path):
    with urllib.request.urlopen(BASE+path,timeout=120) as r: return json.load(r)
def _b64(img):
    b=io.BytesIO(); img.save(b,'PNG'); return base64.b64encode(b.getvalue()).decode()

QUAD={1:(0,0,700,700),2:(700,0,1400,700),3:(0,700,700,1400),4:(700,700,1400,1400)}

def regen_panel(input_path, panel, instruction, sibling_panels, out_path):
    img=Image.open(input_path).convert('RGB')
    tq=QUAD[panel]; target=img.crop(tq)
    payload={'prompt':instruction,'input_image':_b64(target),'output_format':'png'}
    for i,sp in enumerate(sibling_panels[:3]):                      # continuity references (cast/style/setting)
        payload['input_image_%d'%(i+2)]=_b64(img.crop(QUAD[sp]))
    create=_post('/api/bfl-kontext',payload)
    pid=create.get('polling_url'); tid=create.get('id')
    if not pid and not tid: sys.exit('no task: '+json.dumps(create)[:200])
    pollqs='/api/bfl-kontext?polling_url='+urllib.parse.quote(pid) if pid else '/api/bfl-kontext?id='+urllib.parse.quote(tid)
    t0=time.time(); regen=None
    for _ in range(90):
        time.sleep(2); d=_get(pollqs); st=(d.get('status') or '').lower()
        if st=='succeeded':
            f=d.get('image') or ''
            if f.startswith('data:'): regen=Image.open(io.BytesIO(base64.b64decode(f.split(',',1)[1]))).convert('RGB')
            else:
                with urllib.request.urlopen(BASE+f,timeout=120) as r: regen=Image.open(io.BytesIO(r.read())).convert('RGB')
            break
        if st in ('failed','error'): sys.exit('BFL failed: '+json.dumps(d)[:200])
    if regen is None: sys.exit('timeout')
    dt=round(time.time()-t0,1)
    # paste the regenerated panel back into ONLY the target quadrant (feathered edges → clean gutter blend)
    w,h=tq[2]-tq[0],tq[3]-tq[1]; regen=regen.resize((w,h))
    mask=Image.new('L',(w,h),0); ImageDraw.Draw(mask).rectangle([8,8,w-8,h-8],fill=255); mask=mask.filter(ImageFilter.GaussianBlur(6))
    cand=img.copy(); cand.paste(regen,(tq[0],tq[1]),mask); cand.save(out_path)
    return {'candidate':out_path,'task':tid or pid,'poll_s':dt,'panel':panel,'siblings':sibling_panels[:3]}

if __name__=='__main__':
    inp=sys.argv[1]; panel=int(sys.argv[2]); out=sys.argv[3]; instr=sys.argv[4]
    sibs=[int(x) for x in sys.argv[5].split(',')] if len(sys.argv)>5 and sys.argv[5] else []
    print(json.dumps(regen_panel(inp,panel,instr,sibs,out)))
