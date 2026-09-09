"""Writes the animated SVG header of the GitHub profile README, one per theme.

SVG rather than PNG because GitHub renders it through an `<img>`, where CSS and SMIL
animations run and scripts do not — the same reason the contribution snake moves. Fonts
are embedded as base64 for that reason too: an `<img>` loads no external resource.
"""

import base64, math, pathlib, random

root = pathlib.Path(__file__).resolve().parents[2]
out = pathlib.Path(__file__).resolve().parent
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

# Drawn once, outside the theme loop, so both SVGs get the identical cloud and the
# identical twinkle offsets.
jitter = [random.uniform(0.6, 1.0) for _ in nodes]
twinkle = [random.uniform(0, 7) for _ in nodes]

edges = []
for i, a in enumerate(nodes):
    for b in nodes[i + 1:]:
        dist = math.hypot(a['x'] - b['x'], a['y'] - b['y'])
        if dist < 92:
            edges.append((a, b, dist))

# The eight edges the pulses travel: the longest ones, spread across the cloud so two
# pulses never overlap on screen.
packets = sorted(edges, key=lambda e: -e[2])[:40][::5]

def net(accent, line_alpha, dot_alpha):
    svg = []
    for a, b, dist in edges:
        al = (1 - dist / 92) * line_alpha * (1 - 0.55 * max(a['d'], b['d']))
        svg.append(f'<line x1="{a["x"]:.1f}" y1="{a["y"]:.1f}" x2="{b["x"]:.1f}" y2="{b["y"]:.1f}" stroke="{accent}" stroke-opacity="{al:.3f}"/>')
    for a, j, t in zip(nodes, jitter, twinkle):
        r = 1.3 + 1.9 * a['k'] * j
        svg.append(f'<circle class="dot" cx="{a["x"]:.1f}" cy="{a["y"]:.1f}" r="{r:.2f}" fill="{accent}" fill-opacity="{dot_alpha - 0.6 * a["d"]:.2f}" style="animation-delay:-{t:.1f}s"/>')
    for n, (a, b, _) in enumerate(packets):
        svg.append(
            f'<circle r="2.4" fill="{accent}" opacity="0">'
            f'<animateMotion dur="5s" begin="-{n * 0.62:.2f}s" repeatCount="indefinite" '
            f'path="M{a["x"]:.1f} {a["y"]:.1f}L{b["x"]:.1f} {b["y"]:.1f}"/>'
            f'<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.15;.85;1" dur="5s" begin="-{n * 0.62:.2f}s" repeatCount="indefinite"/>'
            f'</circle>')
    return '\n'.join(svg)

# The two branches of every `light-dark()` token in src/styles/app.css.
THEMES = {
    'dark': dict(bg='#08090c', ink='#f3f5f9', dim='#8b94a7', accent='#3ee7ff', sweep='#ffffff',
                 surface='#ffffff' , surface_op='.035', line='#ffffff', line_op='.08',
                 grid='#ffffff', grid_op='.035', sep_op='.22',
                 a1='#3ee7ff', a1_op='.20', a2='#aa78ff', a2_op='.17', a3='#3ee7ff', a3_op='.10',
                 line_alpha=0.34, dot_alpha=0.85),
    'light': dict(bg='#f4f5f7', ink='#0b0d12', dim='#5e6675', accent='#0a8faf', sweep='#0b5f75',
                  surface='#ffffff', surface_op='.7', line='#000000', line_op='.08',
                  grid='#000000', grid_op='.05', sep_op='.18',
                  a1='#0a8faf', a1_op='.18', a2='#785aff', a2_op='.15', a3='#0a8faf', a3_op='.09',
                  line_alpha=0.30, dot_alpha=0.80),
}

EYEBROW = 'AI ENGINEER · ARGENTINA'
H1A, H1B = 'I think the product.', 'I ship it to production.'
STATS = [('7+', 'years building'), ('10+', 'products in production'), ('6', 'platforms')]

TPL = '''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-label="Marcos Arrieta — AI Engineer. I think the product. I ship it to production.">
<defs>
<style>
@font-face{{font-family:M;src:url(data:font/woff2;base64,{manrope}) format("woff2");font-weight:200 800}}
@font-face{{font-family:P;src:url(data:font/woff2;base64,{mono400}) format("woff2");font-weight:400}}
@font-face{{font-family:P;src:url(data:font/woff2;base64,{mono500}) format("woff2");font-weight:500}}
.h1{{font-family:M,sans-serif;font-size:48px;font-weight:600;letter-spacing:-1.9px}}
.eyebrow{{font-family:P,monospace;font-size:13px;font-weight:500;letter-spacing:2.1px;fill:{accent}}}
.stat{{font-family:P,monospace;font-size:13px;fill:{dim}}}
.stat .n{{fill:{ink};font-weight:500}}
.pill{{font-family:P,monospace;font-size:14px;fill:{ink};letter-spacing:.6px}}
/* Everything below is decoration: with `reduce` the header is the first frame, which is
   the finished layout. Same rule as the site (`DESIGN_SPEC` motion section). */
@media (prefers-reduced-motion:no-preference){{
  .blob{{transform-box:fill-box;transform-origin:50% 50%;animation:drift 26s ease-in-out infinite}}
  .blob.b{{animation-duration:31s;animation-direction:reverse}}
  .blob.c{{animation-duration:22s;animation-delay:-8s}}
  .dot{{animation:twinkle 7s ease-in-out infinite}}
  .in{{animation:fade .7s ease-out both}}
  .in2{{animation-delay:.12s}}
  .in3{{animation-delay:.24s}}
  .in4{{animation-delay:.36s}}
  .rule{{transform-box:fill-box;transform-origin:0 50%;animation:draw .6s ease-out both}}
}}
@keyframes drift{{0%,100%{{transform:translate(0,0) scale(1)}}50%{{transform:translate(-46px,20px) scale(1.09)}}}}
@keyframes twinkle{{0%,100%{{opacity:1}}50%{{opacity:.45}}}}
@keyframes fade{{from{{opacity:0;transform:translateY(8px)}}to{{opacity:1;transform:translateY(0)}}}}
@keyframes draw{{from{{transform:scaleX(0)}}to{{transform:scaleX(1)}}}}
</style>
<radialGradient id="g1"><stop offset="0" stop-color="{a1}" stop-opacity="{a1_op}"/><stop offset="1" stop-color="{a1}" stop-opacity="0"/></radialGradient>
<radialGradient id="g2"><stop offset="0" stop-color="{a2}" stop-opacity="{a2_op}"/><stop offset="1" stop-color="{a2}" stop-opacity="0"/></radialGradient>
<radialGradient id="g3"><stop offset="0" stop-color="{a3}" stop-opacity="{a3_op}"/><stop offset="1" stop-color="{a3}" stop-opacity="0"/></radialGradient>
<pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0v48" fill="none" stroke="{grid}" stroke-opacity="{grid_op}" stroke-width="1"/></pattern>
<radialGradient id="gridfade" cx=".2" cy=".45" r=".78"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>
<mask id="gridmask"><rect width="{W}" height="{H}" fill="url(#gridfade)"/></mask>
<linearGradient id="sg" gradientUnits="userSpaceOnUse" x1="-300" y1="0" x2="-40" y2="0">
  <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
  <animateTransform attributeName="gradientTransform" type="translate" values="0 0;1700 0;1700 0" keyTimes="0;.42;1" dur="11s" repeatCount="indefinite"/>
</linearGradient>
<mask id="sweep"><rect width="{W}" height="{H}" fill="url(#sg)"/></mask>
</defs>

<rect width="{W}" height="{H}" fill="{bg}"/>
<g>
  <ellipse class="blob a" cx="880" cy="-40" rx="380" ry="380" fill="url(#g1)"/>
  <ellipse class="blob b" cx="440" cy="290" rx="300" ry="300" fill="url(#g2)"/>
  <ellipse class="blob c" cx="1030" cy="270" rx="240" ry="240" fill="url(#g3)"/>
</g>
<rect width="{W}" height="{H}" fill="url(#grid)" mask="url(#gridmask)"/>
<g stroke-width="1">{net}</g>

<g class="in in4">
  <rect x="1012" y="44" width="196" height="38" rx="19" fill="{surface}" fill-opacity="{surface_op}" stroke="{line}" stroke-opacity="{line_op}"/>
  <text class="pill" x="1030" y="69"><tspan fill="{accent}">&#8250;</tspan> marcosarrieta.dev</text>
</g>

<g class="in">
  <rect class="rule" x="72" y="117" width="44" height="1" fill="{accent}" fill-opacity=".7"/>
  <text class="eyebrow" x="130" y="122">{eyebrow}</text>
</g>
<text class="h1 in in2" x="72" y="180" fill="{ink}">{h1a}</text>
<g class="in in3">
  <text class="h1" x="72" y="229" fill="{accent}">{h1b}</text>
  <text class="h1" x="72" y="229" fill="{sweep}" mask="url(#sweep)">{h1b}</text>
</g>
<text class="stat in in4" x="72" y="275">{stats}</text>
</svg>
'''

fkw = dict(manrope=b64('manrope-var.woff2'), mono400=b64('ibm-plex-mono-400.woff2'), mono500=b64('ibm-plex-mono-500.woff2'))
for name, t in THEMES.items():
    stats = f'<tspan fill-opacity="{t["sep_op"]}"> · </tspan>'.join(
        f'<tspan class="n">{n}</tspan> {label}' for n, label in STATS)
    svg = TPL.format(W=W, H=H, eyebrow=EYEBROW, h1a=H1A, h1b=H1B, stats=stats,
                     net=net(t['accent'], t['line_alpha'], t['dot_alpha']), **t, **fkw)
    (out / f'header-{name}.svg').write_text(svg, encoding='utf-8')
print('written', sorted(f'{p.name} {p.stat().st_size // 1024}KB' for p in out.glob('*.svg')))
