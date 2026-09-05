#!/usr/bin/env python3
# EXECUTION — stateless Klein repair.  RepairAttempt {input_image, box(=mask), repair_instruction} -> candidate.
# Klein = crop a CONTEXT region around the box -> FLUX Kontext edit (instruction) -> paste ONLY the tight box
# back (feathered).  Paste-tight MECHANICALLY guarantees Repair Contract §3 (nothing outside the box changes)
# and §1.3 (minimal intervention) — regardless of what the editor does.  This component knows NOTHING of
# confidence / severity / economics / retry — those are the planner's.  It just returns the best candidate.
import sys, json, base64, time, io, urllib.request, urllib.parse
from PIL import Image, ImageFilter, ImageDraw

BASE='http://localhost:3000'
def _post(path, data):
    req=urllib.request.Request(BASE+path, data=json.dumps(data).encode(),
                               headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(req, timeout=90) as r: return json.load(r)
def _get(path):
    with urllib.request.urlopen(BASE+path, timeout=90) as r: return json.load(r)

def execute_repair(input_path, box, instruction, out_path):
    x0,y0,x1,y1 = box
    img=Image.open(input_path).convert('RGB'); W,H=img.size
    bw,bh=x1-x0,y1-y0
    # context crop: pad ~0.9x each side so the editor sees the arm/table around the hand
    px,py=int(bw*0.9),int(bh*0.9)
    cx0,cy0,cx1,cy1=max(0,x0-px),max(0,y0-py),min(W,x1+px),min(H,y1+py)
    ctx=img.crop((cx0,cy0,cx1,cy1))
    buf=io.BytesIO(); ctx.save(buf,'PNG'); b64=base64.b64encode(buf.getvalue()).decode()
    # 1) create Kontext edit task
    create=_post('/api/bfl-kontext', {'prompt':instruction, 'input_image':b64, 'output_format':'png'})
    pid=create.get('polling_url'); tid=create.get('id')
    if not pid and not tid: sys.exit('no task id: '+json.dumps(create)[:200])
    pollqs='/api/bfl-kontext?polling_url='+urllib.parse.quote(pid) if pid else '/api/bfl-kontext?id='+urllib.parse.quote(tid)
    # 2) poll
    t0=time.time(); edited=None
    for _ in range(60):
        time.sleep(2)
        d=_get(pollqs); st=(d.get('status') or '').lower()
        if st=='succeeded':
            imgfield=d.get('image') or ''
            if imgfield.startswith('data:'):
                edited=Image.open(io.BytesIO(base64.b64decode(imgfield.split(',',1)[1]))).convert('RGB')
            else:  # /api/img-proxy?url=...
                with urllib.request.urlopen(BASE+imgfield, timeout=90) as r:
                    edited=Image.open(io.BytesIO(r.read())).convert('RGB')
            break
        if st in ('failed','error'): sys.exit('BFL failed: '+json.dumps(d)[:200])
    if edited is None: sys.exit('timed out polling')
    dt=round(time.time()-t0,1)
    # 3) map edited-context back; extract the tight box; feathered paste into ONLY the box region
    edited=edited.resize((cx1-cx0, cy1-cy0))
    tx0,ty0,tx1,ty1=x0-cx0,y0-cy0,x1-cx0,y1-cy0
    edited_tight=edited.crop((tx0,ty0,tx1,ty1))
    mask=Image.new('L',(bw,bh),0)
    ImageDraw.Draw(mask).rectangle([6,6,bw-6,bh-6],fill=255)
    mask=mask.filter(ImageFilter.GaussianBlur(5))
    cand=img.copy(); cand.paste(edited_tight,(x0,y0),mask); cand.save(out_path)
    return {'candidate':out_path,'task':tid or pid,'poll_s':dt,'ctx_px':[cx1-cx0,cy1-cy0]}

if __name__=='__main__':
    inp=sys.argv[1]; box=[int(v) for v in sys.argv[2:6]]; out=sys.argv[6]; instr=sys.argv[7]
    print(json.dumps(execute_repair(inp,box,instr,out)))
