import base64, math, pathlib, random

root = pathlib.Path(__file__).resolve().parents[2]
fonts = root / 'public/fonts'
def b64(p): return base64.b64encode((fonts / p).read_bytes()).decode()

W, H = 1280, 360

# --- node cloud: same idea as src/lib/motion/network.ts (ellipsoid, projected, linked) ---
random.seed(7)
CX, CY = 1010, 180
RX, RY, RZ = 230, 140, 190
FOCAL = 620
nodes = []
for _ in range(72):
    th = random.uniform(0, 2 * math.pi)
    ph = math.acos(random.uniform(-1, 1))
    rad = random.uniform(0.55, 1.0)
    x = RX * rad * math.sin(ph) * math.cos(th)
    y = RY * rad * math.cos(ph)
    z = RZ * rad * math.sin(ph) * math.sin(th)
    k = FOCAL / (FOCAL + z)
    nodes.append({'x': CX + x * k, 'y': CY + y * k, 'k': k, 'd': (z + RZ) / (2 * RZ)})

# The radius jitter is drawn once, so both themes get the identical cloud.
jitter = [random.uniform(0.6, 1.0) for _ in nodes]

def cloud(accent, line_alpha, dot_alpha):
    out = []
    for i, a in enumerate(nodes):
        for b in nodes[i + 1:]:
            dist = math.hypot(a['x'] - b['x'], a['y'] - b['y'])
            if dist < 92:
                al = (1 - dist / 92) * line_alpha * (1 - 0.55 * max(a['d'], b['d']))
                out.append(f'<line x1="{a["x"]:.1f}" y1="{a["y"]:.1f}" x2="{b["x"]:.1f}" y2="{b["y"]:.1f}" stroke="{accent}" stroke-opacity="{al:.3f}" stroke-width="1"/>')
    for a, j in zip(nodes, jitter):
        r = 1.3 + 1.9 * a['k'] * j
        out.append(f'<circle cx="{a["x"]:.1f}" cy="{a["y"]:.1f}" r="{r:.2f}" fill="{accent}" fill-opacity="{dot_alpha - 0.6 * a["d"]:.2f}"/>')
    return '\n'.join(out)

# The two branches of every `light-dark()` token in src/styles/app.css.
THEMES = {
    'dark': dict(bg='#08090c', ink='#f3f5f9', dim='#8b94a7', accent='#3ee7ff',
                 surface='rgba(255,255,255,.035)', line='rgba(255,255,255,.08)',
                 grid='rgba(255,255,255,.035)', sep='rgba(255,255,255,.22)',
                 a1='rgba(62,231,255,.16)', a2='rgba(170,120,255,.14)', a3='rgba(62,231,255,.08)',
                 line_alpha=0.34, dot_alpha=0.85),
    'light': dict(bg='#f4f5f7', ink='#0b0d12', dim='#5e6675', accent='#0a8faf',
                  surface='rgba(255,255,255,.7)', line='rgba(0,0,0,.08)',
                  grid='rgba(0,0,0,.05)', sep='rgba(0,0,0,.18)',
                  a1='rgba(10,143,175,.14)', a2='rgba(120,90,255,.12)', a3='rgba(10,143,175,.07)',
                  line_alpha=0.30, dot_alpha=0.80),
}

EYEBROW = 'AI ENGINEER · ARGENTINA'
H1A, H1B = 'I think the product.', 'I ship it to production.'
STATS = [('7+', 'years building'), ('10+', 'products in production'), ('6', 'platforms')]

TPL = '''<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{{font-family:Manrope;src:url(data:font/woff2;base64,{manrope}) format("woff2");font-weight:200 800}}
@font-face{{font-family:"IBM Plex Mono";src:url(data:font/woff2;base64,{mono400}) format("woff2");font-weight:400}}
@font-face{{font-family:"IBM Plex Mono";src:url(data:font/woff2;base64,{mono500}) format("woff2");font-weight:500}}
*{{margin:0;padding:0;box-sizing:border-box}}
body{{width:{W}px;height:{H}px;overflow:hidden}}
.header{{position:relative;width:{W}px;height:{H}px;background:{bg};overflow:hidden;isolation:isolate;
  font-family:Manrope,sans-serif;color:{ink}}}
/* aurora — app.css .aurora blobs */
.aurora{{position:absolute;inset:0;overflow:hidden;z-index:0}}
.aurora i{{position:absolute;border-radius:50%;display:block}}
.aurora i:nth-child(1){{left:56%;top:-80%;width:760px;height:760px;filter:blur(90px);background:{a1}}}
.aurora i:nth-child(2){{left:10%;top:18%;width:600px;height:600px;filter:blur(100px);background:{a2}}}
.aurora i:nth-child(3){{left:72%;top:35%;width:480px;height:480px;filter:blur(90px);background:{a3}}}
.net{{position:absolute;inset:0;z-index:1}}
.grid{{position:absolute;inset:0;z-index:1;
  background-image:linear-gradient({grid} 1px,transparent 1px),linear-gradient(90deg,{grid} 1px,transparent 1px);
  background-size:48px 48px;
  -webkit-mask-image:radial-gradient(120% 90% at 20% 45%,#000 0%,transparent 72%)}}
.content{{position:relative;z-index:2;padding:0 72px;height:100%;display:flex;flex-direction:column;justify-content:center}}
.eyebrow{{display:flex;align-items:center;gap:14px;font-family:"IBM Plex Mono",monospace;font-weight:500;
  font-size:13px;letter-spacing:.16em;color:{accent};text-transform:uppercase}}
.eyebrow .rule{{width:44px;height:1px;background:{accent};opacity:.7;display:block}}
h1{{margin-top:20px;font-size:48px;font-weight:600;line-height:1.02;letter-spacing:-.04em}}
h1 .accent{{color:{accent}}}
.stats{{margin-top:26px;display:flex;gap:24px;font-family:"IBM Plex Mono",monospace;font-size:13px;
  letter-spacing:.02em;color:{dim}}}
.stats span b{{color:{ink};font-weight:500}}
.stats .sep{{color:{sep}}}
.domain{{position:absolute;right:72px;top:44px;z-index:2;font-family:"IBM Plex Mono",monospace;font-size:14px;
  letter-spacing:.04em;color:{ink};background:{surface};border:1px solid {line};
  border-radius:999px;padding:9px 18px}}
.domain b{{color:{accent};font-weight:400}}
</style></head><body>
<div class="header">
  <div class="aurora"><i></i><i></i><i></i></div>
  <div class="grid"></div>
  <svg class="net" width="{W}" height="{H}" viewBox="0 0 {W} {H}" fill="none">{cloud}</svg>
  <div class="domain"><b>&#8250;</b> marcosarrieta.dev</div>
  <div class="content">
    <p class="eyebrow"><span class="rule"></span>{eyebrow}</p>
    <h1>{h1a}<br><span class="accent">{h1b}</span></h1>
    <p class="stats">{stats}</p>
  </div>
</div></body></html>'''

fkw = dict(manrope=b64('manrope-var.woff2'), mono400=b64('ibm-plex-mono-400.woff2'), mono500=b64('ibm-plex-mono-500.woff2'))
stats = '<span class="sep">·</span>'.join(f'<span><b>{n}</b> {label}</span>' for n, label in STATS)
out = pathlib.Path(__file__).resolve().parent
for name, t in THEMES.items():
    html = TPL.format(W=W, H=H, eyebrow=EYEBROW, h1a=H1A, h1b=H1B, stats=stats,
                      cloud=cloud(t['accent'], t['line_alpha'], t['dot_alpha']), **t, **fkw)
    (out / f'header-{name}.html').write_text(html, encoding='utf-8')
print('written', sorted(p.name for p in out.iterdir() if p.suffix == '.html'))
