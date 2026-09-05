#!/usr/bin/env python3
# IMPROVED KLEIN for HANDS (success-rate optimization — correctness stays with the oracle; safe under rollback).
# Levers vs the baseline execute: (1) larger CONTEXT crop, (2) UPSCALE the crop to ~1024 before editing (FLUX
# draws far better detail near 1MP — the baseline fed it a ~460px crop), (3) anatomy/pose-aware PROMPT,
# (4) a per-candidate SEED so multiple shots vary (hands are stochastic → generate several, oracle picks).
# Same paste-tight locality guarantee as baseline execution.
import sys, json, base64, time, io, urllib.request, urllib.parse
from PIL import Image, ImageFilter, ImageDraw

BASE='http://localhost:3000'
def _post(p,d):
    r=urllib.request.Request(BASE+p,data=json.dumps(d).encode(),headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(r,timeout=120) as x: return json.load(x)
def _get(p):
    with urllib.request.urlopen(BASE+p,timeout=120) as x: return json.load(x)

PROMPT=("Fix ONLY the malformed hand in this comic panel. Redraw it as a single anatomically-correct human hand "
        "with EXACTLY five fingers — one thumb and four fingers — with no extra, missing, fused or webbed fingers, "
        "natural knuckles and proportions. Keep the same gesture and pose, the same skin tone, and the same bold "
        "black-ink comic art style, line weight and cel shading as the surrounding drawing. Change nothing but the hand.")

def klein_hand(input_path, box, out_path, seed=1, upscale=1024, pad=1.2):
    img=Image.open(input_path).convert('RGB'); W,H=img.size
    x0,y0,x1,y1=box; bw,bh=x1-x0,y1-y0
    px,py=int(bw*pad),int(bh*pad)
    cx0,cy0,cx1,cy1=max(0,x0-px),max(0,y0-py),min(W,x1+px),min(H,y1+py)
    ctx=img.crop((cx0,cy0,cx1,cy1)); cw,ch=ctx.size
    # UPSCALE context to ~`upscale` long side so FLUX has detail to work with
    s=upscale/max(cw,ch); up=ctx.resize((max(1,round(cw*s)),max(1,round(ch*s))), Image.LANCZOS)
    buf=io.BytesIO(); up.save(buf,'PNG'); b64=base64.b64encode(buf.getvalue()).decode()
    create=_post('/api/bfl-kontext',{'prompt':PROMPT,'input_image':b64,'output_format':'png','seed':seed})
    pid=create.get('polling_url'); tid=create.get('id')
    if not pid and not tid: sys.exit('no task: '+json.dumps(create)[:180])
    q='/api/bfl-kontext?polling_url='+urllib.parse.quote(pid) if pid else '/api/bfl-kontext?id='+urllib.parse.quote(tid)
    t0=time.time(); ed=None
    for _ in range(90):
        time.sleep(2); d=_get(q); st=(d.get('status') or '').lower()
        if st=='succeeded':
            f=d.get('image') or ''
            if f.startswith('data:'): ed=Image.open(io.BytesIO(base64.b64decode(f.split(',',1)[1]))).convert('RGB')
            else:
                with urllib.request.urlopen(BASE+f,timeout=120) as r: ed=Image.open(io.BytesIO(r.read())).convert('RGB')
            break
        if st in ('failed','error'): sys.exit('BFL failed: '+json.dumps(d)[:180])
    if ed is None: sys.exit('timeout')
    dt=round(time.time()-t0,1)
    ed=ed.resize((cw,ch))                                   # back to context size
    tx0,ty0,tx1,ty1=x0-cx0,y0-cy0,x1-cx0,y1-cy0            # tight box within context
    tight=ed.crop((tx0,ty0,tx1,ty1))
    m=Image.new('L',(bw,bh),0); ImageDraw.Draw(m).rectangle([6,6,bw-6,bh-6],fill=255); m=m.filter(ImageFilter.GaussianBlur(5))
    cand=img.copy(); cand.paste(tight,(x0,y0),m); cand.save(out_path)
    return {'candidate':out_path,'seed':seed,'poll_s':dt,'ctx_px':[cw,ch],'upscaled_to':up.size}

if __name__=='__main__':
    inp=sys.argv[1]; box=[int(v) for v in sys.argv[2:6]]; out=sys.argv[6]; seed=int(sys.argv[7]) if len(sys.argv)>7 else 1
    print(json.dumps(klein_hand(inp,box,out,seed)))
