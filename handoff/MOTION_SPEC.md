# MOTION_SPEC — Portfolio v3

Filosofía: Apple. Sutil, con intención, una idea por sección. Curva base `cubic-bezier(.2,.8,.2,1)`. Nada rebota salvo los chips del stack. Todo detrás de `@media (prefers-reduced-motion: no-preference)`; con reduce, el contenido está visible desde el primer frame y el canvas se congela (o no se monta).

Implementación sugerida en Astro: un `motion.ts` con `IntersectionObserver` + `data-reveal` y un `scroll.ts` con un único listener rAF-throttled (el mock hace exactamente esto: ver `updateScrollFx`, `reveal`, `boot`, `scramble` en el `<script>` de `reference/Portfolio.dc.html`, son portables tal cual).

## 1. Nav

- **Marca "Marcos Arrieta"**: scramble tipo consola. Glifos `<>/_-=+*#%&{}[]|\01`. Resuelve de izquierda a derecha con easing cuadrático (`n = floor(p² · len)`), duración 1100ms al cargar (delay 300), 900ms cada 9s, 700ms en `mouseenter`. Espacios se respetan. `min-width: 9.2em` para que no salte el layout.
- **✳**: `@keyframes think` 2.6s infinite `cubic-bezier(.6,.05,.3,1)`: 0% `rotate(0) scale(1)` → 30% `rotate(90deg) scale(.72)` → 60% `rotate(200deg) scale(1.12)` → 100% `rotate(360deg) scale(1)`. Glow `text-shadow 0 0 10px accent`.
- **Scroll a anclas**: `scrollTo({behavior:'smooth'})` con offset 64px (nav). `#top` sin offset.

## 2. Hero — boot del sistema

Elementos con `data-boot="n"`: estado inicial `opacity:0; translateY(14px); blur(8px)`; transición 900ms curva base. Se revelan a `500 + n·170 ms`:

| n | Elemento |
|---|---|
| 0 | eyebrow (empieza a tipear a los 700ms, 28ms/carácter; cursor 7×12px `blink 1s steps(1)` permanente) |
| 1 | H1 |
| 2 | sub |
| 3 | CTAs |
| 4 | stats |
| 10 (=2200ms) | consola: `translateY(24px) scale(.96) blur(10px)` → normal, 1100ms. Una línea de escaneo (2px, gradiente cian, glow) recorre la tarjeta de arriba a abajo: `sweep 1.4s cubic-bezier(.4,0,.2,1)` delay 1.1s, una vez. |

**Log de la consola**: cada 1400ms entra una línea (`rise .35s`: `opacity 0 → 1, translateY(6px) → 0`), máximo 6 visibles, ciclo de 11 mensajes (`content.json → consoleLog`). Las métricas del footer varían con el tick (AGENTS 3–4, SPECS 12+, SHIPPED 41+).

## 3. Hero — red de nodos (canvas)

Canvas absoluto, `100vw × 100vh`, `mask-image: linear-gradient(180deg,#000 55%,transparent)`, 30–40 fps (`rAF` con throttle 24ms), `dpr ≤ 2`, debajo del contenido (`z-index` menor que `<main>`).

- **84 nodos** sobre un **elipsoide 3D** centrado cerca de la consola (RX = .56W, RY = .48H, RZ = .5·min(W,H)), proyección perspectiva `f = .9·max(W,H)`; escala `sc = f/(f+z)`; profundidad → `z ∈ [.3,1]` controla tamaño y alfa. Rotación global casi nula (`.00003 rad/frame`); cada nodo deriva en su órbita (`dθ ±.0005`, latitud oscila y rebota en ±1.4 rad, `sin` vertical ±9px).
- **Conexiones**: entre nodos a < 150px, alfa `(1-d/150)·.22` (dark) `.28` (light) × min(z).
- **Formación ✳** al cargar: 300→1200ms los nodos convergen (ease in-out cúbico) al asterisco de 6 brazos (R = .26·min(W,H)) centrado en la consola; hold hasta 1900; se disuelve 1900→2800 mientras la consola aparece (2200).
- **Consola como centro**: 4 anclajes en los bordes de la tarjeta (izq 25%, izq 62%, abajo 50%, arriba 30%) se conectan al nodo visible más cercano (< 280px, evitando los que están detrás de la tarjeta). Cada línea nueva del log dispara un **comando**: pulso desde el anclaje izq-62% al nodo más cercano y luego BFS de 3 saltos (`t = -(hop+1)·.55` de desfase, velocidad `.045/frame`, cola de .18). Al llegar, el nodo hace `flash = 1` (anillo que crece hasta 22px, decae ×.93/frame).
- **Cursor**: nodo violeta con glow; atrae nodos a < 200px (fuerza `(1-d/200)·1.4`, decae ×.9); líneas violeta a nodos < 170px; conexiones cercanas suben alfa +.35. El mouse inclina la cámara (`tilt` ±.25 rad, `rot` ±.15).
- **Colapso al scroll**: `collapse = clamp(scrollY / (.75·vh))`; radio ×`(1-.85·collapse)`, rotación ×`(1+5·collapse)`, `globalAlpha = 1-collapse`; los comandos se detienen con `collapse ≥ .6`.
- Mobile: mismo canvas pero N=48 y sin interacción de cursor (touch). Si el rendimiento cae (< 30fps), bajar a 40 nodos.

## 4. Aurora (fondo global)

Tres blobs `border-radius:50%`, `filter: blur(90–100px)`, `position: fixed`, `z-index:0`, colores accent@.16–.22 y violeta@.14. Animaciones `aur1` 16s / `aur2` 20s / `aur1` 24s alternate (`translate ±18–22%, scale .9–1.15`). Al scroll (rAF): `filter: hue-rotate(p·260deg) saturate(1+.4p)`, `opacity .45 → 1` en el primer 40% del documento, `translateY(-12vh·p)`. Con `p = scrollY / (scrollHeight - vh)`.

## 5. Reveals genéricos (`data-reveal`)

Estado inicial `opacity:0; translateY(18px); blur(6px)`; transición 800ms curva base. Disparo: `IntersectionObserver` threshold .15, `rootMargin: 0 0 -8% 0`, una sola vez. `data-delay` en ms para escalonar (principios 110·i; proyectos 90·(i%3)). Aplica a: párrafo y principios de "Sobre mí", headers de sección, ítems de experiencia, caja "también con", tarjetas de proyectos, filas del stack, tarjeta de contacto.

Regla: el reveal va en un **wrapper**, nunca en el mismo elemento que tiene `transform` en hover.

## 6. Sobre mí — texto que se ilumina

El lead se parte en palabras (`display:flex; flex-wrap; gap:0 .26em`). Cada palabra `opacity .16`, transición 350ms. En scroll: `p = clamp((.8·vh - top) / (.45·vh))`; palabra `i` de `N`: `opacity = clamp(p·(N+3) - i, .16, 1)`.

## 7. Cómo trabajo — diapositiva de pasos

Desktop (ancho ≥ 720px y el bloque entra en `vh`): la sección tiene un **track de 280vh** y un bloque `position: sticky; top:0; min-height:100vh` centrado verticalmente (padding 32px). Progreso `p = -track.top / (track.height - vh)`.

- `active = p < .06 ? -1 : min(4, floor((p-.06)/.84·5))`; `done = p ≥ .93`.
- Tarjeta futura: `opacity .22; translateY(10px) scale(.97)`; borde line.
- Tarjeta activa: `translateY(-6px) scale(1.03)`, borde y anillo (`0 0 0 1px`) de **su color de semáforo**, sombra `0 20px 60px`.
- Tarjeta completada: normal, dot encendido con su color (`scale(1.25)`, glow `0 0 12px`).
- **Done**: todas con borde cian@.65, fondo accent-soft, glow `0 0 44px accent@.2`, dots cian.
- Indicador en el header: `STAND BY · ESPERANDO INPUT` → `PENSANDO · 1/5`, `ESCRIBIENDO SPEC · 2/5`, `DISEÑANDO EL PLAN · 3/5`, `CODEANDO · 4/5`, `DEPLOYANDO · 5/5` → `✓ EN PRODUCCIÓN` (dot toma el color del paso; texto también). EN: `STAND BY · AWAITING INPUT`, `THINKING`, `WRITING SPEC`, `CRAFTING PLAN`, `CODING`, `SHIPPING`, `✓ LIVE IN PRODUCTION`.
- Transiciones 600ms curva base. Reversible al subir.
- Mobile / fallback: sin sticky; `p = (.85·vh - top) / (.9·height)`; misma lógica de pasos.

## 8. Experiencia

Cada ítem: reveal genérico. El nombre de la empresa hace **scramble** (1000ms) al entrar en viewport (misma función que la marca). El dot del ítem actual pulsa suave (opcional).

## 9. Proyectos

Reveal escalonado 90ms por columna. Sobre el preview, un **shimmer** diagonal (`skewX(-12deg)`, ancho 40%, gradiente accent@.12) `shimmer 2.8s ease-in-out infinite` (`translateX(-100% → 250%)`). Hover: `translateY(-4px)` + borde accent + sombra.

## 10. Stack — marquesina

Tres filas `width: max-content` con el contenido duplicado, `@keyframes marquee { to { translateX(-50%) } }` linear infinite: 70s, 85s (reverse), 78s. `animation-play-state: paused` en hover. Cada fila con `mask-image` lateral 8%. Fila completa con reveal genérico.

## 11. Contacto

- Borde: wrapper `padding:2px; border-radius:34px; overflow:hidden` con un div de `conic-gradient(from 0deg, accent@.1 0 50%, accent 76%, violet 86%, accent@.1 100%)` de 220% girando (`spin 7s linear infinite`). Halo: copia del gradiente por fuera (`inset:-2px`) con `blur(14px) opacity .55`.
- Grilla interna `48px` con `mask radial 60% 80% at 80% 50%`, `gridflow 6s linear infinite` (`background-position 0 → 48px 48px`).
- Email: hover gap 10→16px, color → ink.

## 12. Footer

- ✳ con `think`.
- ASCIImoji cambia cada 1000ms (lista en el mock: `(⌐■_■)`, `¯\_(ツ)_/¯`, `( ͡° ͜ʖ ͡°)`, `ʕ•ᴥ•ʔ`, `\(^o^)/`, `ᕕ( ᐛ )ᕗ`, `(~˘▾˘)~`, `(☞ﾟヮﾟ)☞`, `(づ｡◕‿‿◕｡)づ`, `(╯°□°)╯︵ ┻━┻`, `┬─┬ノ( º _ ºノ)`, `(•_•)>⌐■-■`, `[¬º-°]¬`, `(ง'̀-'́)ง`, `⊂(◉‿◉)つ`). `min-width: 9ch` para no saltar.

## 13. Presupuesto de rendimiento

- Canvas: ≤ 4ms/frame en un M1; en móvil, N=48 y sin cursor.
- Un solo listener de scroll (rAF) para aurora + about + método.
- `backdrop-filter` solo en nav y consola. En mobile, la aurora puede bajar a 2 blobs.
- Lighthouse Performance ≥ 90 en mobile con todo activo; si no, degradar en este orden: shimmer → aurora → nodos.
