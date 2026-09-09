import base64, json, math, pathlib, random

root = pathlib.Path('/Users/djmaam/Projects/Marcos/portfolio-v3')
fonts = root / 'public/fonts'
def b64(p): return base64.b64encode((fonts/p).read_bytes()).decode()

W, H = 1584, 396

# --- node cloud: same idea as src/lib/motion/network.ts (ellipsoid, projected, linked) ---
random.seed(7)
CX, CY = 1180, 198
RX, RY, RZ = 260, 150, 200
FOCAL = 620
nodes = []
for _ in range(78):
    th = random.uniform(0, 2*math.pi)
    ph = math.acos(random.uniform(-1, 1))
    rad = random.uniform(0.55, 1.0)
    x = RX*rad*math.sin(ph)*math.cos(th)
    y = RY*rad*math.cos(ph)
    z = RZ*rad*math.sin(ph)*math.sin(th)
    k = FOCAL/(FOCAL+z)
    depth = (z+RZ)/(2*RZ)                       # 0 near -> 1 far
    nodes.append({'x': CX+x*k, 'y': CY+y*k, 'k': k, 'd': depth})

def esc(v): return f'{v:.1f}'
lines, dots = [], []
for i, a in enumerate(nodes):
    for b in nodes[i+1:]:
        dist = math.hypot(a['x']-b['x'], a['y']-b['y'])
        if dist < 92:
            al = (1-dist/92)*0.34*(1-0.55*max(a['d'], b['d']))
            lines.append(f'<line x1="{esc(a["x"])}" y1="{esc(a["y"])}" x2="{esc(b["x"])}" y2="{esc(b["y"])}" stroke="#3ee7ff" stroke-opacity="{al:.3f}" stroke-width="1"/>')
    r = (1.3+1.9*a['k']*random.uniform(0.6, 1.0))
    op = 0.85-0.6*a['d']
    dots.append(f'<circle cx="{esc(a["x"])}" cy="{esc(a["y"])}" r="{r:.2f}" fill="#3ee7ff" fill-opacity="{op:.2f}"/>')
cloud = '\n'.join(lines+dots)

COPY = {
 'es': dict(eyebrow='AI ENGINEER · ARGENTINA', h1a='Pienso el producto.', h1b='Lo llevo a producción.',
            stats=['7+ años construyendo', '10+ productos en producción', '6 plataformas']),
 'en': dict(eyebrow='AI ENGINEER · ARGENTINA', h1a='I think the product.', h1b='I ship it to production.',
            stats=['7+ years building', '10+ products in production', '6 platforms']),
}

TPL = '''<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{{font-family:Manrope;src:url(data:font/woff2;base64,{manrope}) format("woff2");font-weight:200 800}}
@font-face{{font-family:"IBM Plex Mono";src:url(data:font/woff2;base64,{mono400}) format("woff2");font-weight:400}}
@font-face{{font-family:"IBM Plex Mono";src:url(data:font/woff2;base64,{mono500}) format("woff2");font-weight:500}}
*{{margin:0;padding:0;box-sizing:border-box}}
body{{width:{W}px;height:{H}px;overflow:hidden}}
.banner{{position:relative;width:{W}px;height:{H}px;background:#08090c;overflow:hidden;isolation:isolate;
  font-family:Manrope,sans-serif;color:#f3f5f9}}
/* aurora — app.css .aurora blobs */
.aurora{{position:absolute;inset:0;overflow:hidden;z-index:0}}
.aurora i{{position:absolute;border-radius:50%;display:block}}
.aurora i:nth-child(1){{left:58%;top:-70%;width:820px;height:820px;filter:blur(90px);background:rgba(62,231,255,.16)}}
.aurora i:nth-child(2){{left:14%;top:20%;width:640px;height:640px;filter:blur(100px);background:rgba(170,120,255,.14)}}
.aurora i:nth-child(3){{left:74%;top:35%;width:520px;height:520px;filter:blur(90px);background:rgba(62,231,255,.08)}}
.net{{position:absolute;inset:0;z-index:1}}
.grid{{position:absolute;inset:0;z-index:1;
  background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);
  background-size:48px 48px;
  -webkit-mask-image:radial-gradient(120% 90% at 20% 40%,#000 0%,transparent 72%)}}
.content{{position:relative;z-index:2;padding:44px 88px 148px;height:100%;display:flex;flex-direction:column;justify-content:center}}
.eyebrow{{display:flex;align-items:center;gap:14px;font-family:"IBM Plex Mono",monospace;font-weight:500;
  font-size:13px;letter-spacing:.16em;color:#3ee7ff;text-transform:uppercase}}
.eyebrow .rule{{width:44px;height:1px;background:#3ee7ff;opacity:.7;display:block}}
h1{{margin-top:20px;font-size:50px;font-weight:600;line-height:1.02;letter-spacing:-.04em}}
h1 .accent{{color:#3ee7ff}}
.stats{{margin-top:22px;display:flex;gap:26px;font-family:"IBM Plex Mono",monospace;font-size:13px;
  letter-spacing:.02em;color:#8b94a7}}
.stats span b{{color:#f3f5f9;font-weight:500}}
.stats .sep{{color:rgba(255,255,255,.22)}}
.domain{{position:absolute;right:88px;top:56px;z-index:2;font-family:"IBM Plex Mono",monospace;font-size:14px;
  letter-spacing:.04em;color:#f3f5f9;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.08);
  border-radius:999px;padding:9px 18px}}
.domain b{{color:#3ee7ff;font-weight:400}}
</style></head><body>
<div class="banner">
  <div class="aurora"><i></i><i></i><i></i></div>
  <div class="grid"></div>
  <svg class="net" width="{W}" height="{H}" viewBox="0 0 {W} {H}" fill="none">{cloud}</svg>
  <div class="domain"><b>›</b> marcosarrieta.dev</div>
  <div class="content">
    <p class="eyebrow"><span class="rule"></span>{eyebrow}</p>
    <h1>{h1a}<br><span class="accent">{h1b}</span></h1>
    <p class="stats">{stats}</p>
  </div>
</div></body></html>'''

fkw = dict(manrope=b64('manrope-var.woff2'), mono400=b64('ibm-plex-mono-400.woff2'), mono500=b64('ibm-plex-mono-500.woff2'))
out = root/'assets/linkedin'
for lang, c in COPY.items():
    stats = '<span class="sep">·</span>'.join(f'<span><b>{s.split(" ")[0]}</b> {s.split(" ",1)[1]}</span>' for s in c['stats'])
    html = TPL.format(W=W, H=H, cloud=cloud, eyebrow=c['eyebrow'], h1a=c['h1a'], h1b=c['h1b'], stats=stats, **fkw)
    (out/f'banner-{lang}.html').write_text(html, encoding='utf-8')
print('written', [p.name for p in out.iterdir()])
