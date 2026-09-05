# DESIGN_SPEC — Portfolio v3

Referencia viva: `reference/Portfolio.dc.html`. Los valores de abajo son los del mock.

## 1. Identidad

Concepto: **"Pienso el producto. Orquesto cómo se construye."** Mezcla 50/50 de lenguaje Apple (tipografía grande, aire, vidrio, radios suaves) y cyberpunk contenido (cian neón, labels mono, consola en vivo, red de nodos). Una sola familia de acento (cian) + violeta como secundario solo en interacciones (cursor de la red, haz de contacto).

## 2. Tokens

### Color (usar `light-dark(light, dark)`; el root lleva `color-scheme`)

| Token | Light | Dark | Uso |
|---|---|---|---|
| bg | `#F4F5F7` | `#08090C` | fondo de página |
| ink | `#0B0D12` | `#F3F5F9` | texto principal |
| dim | `#5E6675` | `#8B94A7` | texto secundario, labels |
| line | `rgba(0,0,0,.08)` | `rgba(255,255,255,.08)` | separadores, bordes |
| surface | `rgba(255,255,255,.7)` | `rgba(255,255,255,.035)` | tarjetas (con `border: 1px solid` line a .06/.07) |
| glass | `rgba(244,245,247,.72)` | `rgba(8,9,12,.6)` | nav (`backdrop-filter: blur(18px) saturate(1.4)`) |
| accent | `#0A8FAF` | `#3EE7FF` | cian |
| accent-soft | `rgba(10,143,175,.08)` | `rgba(62,231,255,.08)` | fondos de chips destacados |
| violet | `rgb(120,90,255)` | `rgb(170,120,255)` | solo interacciones |
| console-bg | `rgba(255,255,255,.75)` | `rgba(14,16,22,.85)` | tarjeta consola (`blur(20px)`) |
| contact-card | `#0B0D12` (invertida) | `#F3F5F9` (invertida) | la tarjeta de contacto invierte el tema |
| semáforo pasos | `#FF5C5C` `#FF9F43` `#FFD64D` `#9BE15D` `#3DDC84` | idem | dots de "Cómo trabajo" |

Glow del acento: `0 0 12px accent` en dots; `text-shadow: 0 0 40px accent@.3–.45` en la segunda línea del H1.

### Tipografía

- **Sans**: Geist (300–700). Alternativa aprobada para probar: Manrope. Fallback `-apple-system, "Helvetica Neue", sans-serif`.
- **Mono**: Geist Mono (400–500). Alternativa: IBM Plex Mono.
- Self-hosted, woff2 variable, `font-display: swap`.

Escala (fluida, con `cqw` sobre el contenedor de 1200px; en Astro usar `clamp(..., vw, ...)` equivalente):

| Rol | Tamaño | Peso | Tracking | Línea |
|---|---|---|---|---|
| H1 hero | `clamp(36px, 4.9cqw, 76px)` | 600 | -.04em | 1.0, `text-wrap: balance` |
| H2 sección | `clamp(32px, 4cqw, 56px)` | 600 | -.035em | 1.02 |
| H2 stack | `clamp(32px, 4cqw, 48px)` | 600 | -.035em | 1.05 |
| H2 contacto | `clamp(34px, 4.5cqw, 64px)` | 600 | -.04em | 1.0 |
| Lead "Sobre mí" | `clamp(26px, 3cqw, 40px)` | 500 | -.025em | 1.2 |
| Sub hero | `clamp(16px, 1.3cqw, 19px)` | 400 | 0 | 1.55 |
| Body | 17px (15–18 en tarjetas) | 400 | 0 | 1.5 |
| Título tarjeta | 19–22px | 500 | -.02em | 1.15 |
| Label sección mono | 12px | 400 | .14em | — (`02 / CÓMO TRABAJO`) |
| Label mono chico | 10–11px | 400–500 | .1–.12em | — |
| Botón pill | 15px sans / 12px mono `.06em` | 500 | — | — |

### Espaciado y forma

- Contenedor: `max-width: 1200px; padding: 0 clamp(20px, 4vw, 48px)`.
- Padding vertical de sección: `clamp(56px, 7vw, 100px)`; hero `clamp(72px,10vw,140px)` arriba / `clamp(64px,8vw,110px)` abajo.
- Separador entre secciones: `border-top: 1px solid line`.
- Radios: pills `999px`; chips `8px`; tarjetas `18–24px`; consola `28px`; contacto `32px`; logos `16px`.
- Sombras: solo la consola (`0 30px 80px rgba(0,0,0,.12/.6)`) y tarjetas en hover (`0 20px 60px`).
- Grids: siempre `repeat(auto-fit, minmax(min(100%, Xpx), 1fr))` con X = 380 (hero), 300 (about, stack header, proyectos), 260 (experiencia), 220 (skills), 200 (principios), 150 (pasos: 5 en una fila desde ~850px).

## 3. Estructura de página (orden)

1. **Nav** sticky, glass. Izquierda: ✳ animado + "Marcos Arrieta" (scramble). Derecha: links (Sobre mí · Experiencia · Proyectos · Contacto), toggle idioma `ES / en`, toggle tema (círculo half-fill). En mobile los links se ocultan (menú no diseñado: usar solo toggles + scroll natural, o un menú simple).
2. **Hero** 2 columnas. Izq: eyebrow mono tipeado con cursor, H1 en dos líneas (segunda en cian), sub, 2 CTAs (primario relleno ink, secundario outline), stats mono (`8+ años · 5 empresas principales · 6 plataformas`). Der: **consola** (header con 3 puntos + "orchestrator — session 0x4D41" + LIVE; log de 6 líneas `hh:mm:ss · key · value` con scanlines sutiles; footer 3 métricas AGENTS / SPECS / SHIPPED). Fondo: canvas de red de nodos (ver MOTION) + aurora fija.
3. **01 / Sobre mí**: label a la izquierda, contenido 2/3 a la derecha: lead grande (palabras que se iluminan al scroll), párrafo, 3 principios en tarjetas.
4. **02 / Cómo trabajo**: header + indicador de estado (dot + texto mono) + 5 tarjetas (número, dot, título, texto, herramienta al pie con `border-top: dashed`). Sección **pinned** en desktop (ver MOTION).
5. **03 / Experiencia**: timeline vertical: riel 1px + dot (el actual en cian con glow), logo 56px (placeholder rayado con abreviatura), empresa + período mono, rol en cian, nota, chips de alcance (mono 11px, radio 8px). Debajo, caja dashed "TAMBIÉN CON" con nombres.
6. **04 / Proyectos**: grid de tarjetas: preview 16:11 (iframe estático o screenshot) con etiqueta tipo `AGTECH · WEB + MOBILE` arriba a la izquierda y shimmer; fila inferior: nombre + descripción de una línea + `↗`. Sin stack.
7. **05 / Stack**: header + 3 filas marquesina (velocidades 70/85/78s, la del medio invertida, pausa en hover, máscara de desvanecimiento en los bordes) + leyenda `● USO A DIARIO / ○ TAMBIÉN HABLO`. Chips destacados en cian; el resto outline gris.
8. **06 / Contacto**: tarjeta invertida con grilla fluida de fondo, haz de luz cian→violeta girando en el borde (2px) + halo exterior difuso. Izq: label, H2, sub. Der: email grande subrayado con `↗`, pills GitHub / LinkedIn / Telegram con ícono monocromo (máscara sobre `currentColor`).
9. **Footer**: `© 2026 Marcos Arrieta · @djmaam` · ✳ + "Diseñado con criterio, construido con agentes." + ASCIImoji rotativo.

## 4. Estados

- Links nav: dim → ink en hover. CTA primario: `translateY(-1px)` en hover. Outline: borde → accent.
- Tarjetas hover: `translateY(-4px)`, borde accent@.45, sombra.
- Toggle idioma/tema: borde → accent en hover.
- Email: color → ink en hover, gap con la flecha crece 10→16px.
- Pills contacto: borde y texto → accent (el ícono hereda).
- Focus visible: anillo `2px accent` con offset 2px en todo lo interactivo (no está en el mock; agregarlo).

## 5. Responsive

- Todo fluido; sin breakpoints duros salvo: nav links ocultos < ~720px; "Cómo trabajo" no se fija si ancho < 720px o si el bloque no entra en la altura de la ventana.
- Hero pasa a una columna (consola debajo del texto). H1 mínimo 36px.
- Contacto: una columna; email puede partir en dos líneas.
- Mobile mock: `reference/Portfolio Mobile.dc.html` (dark/ES y light/EN).

## 6. Accesibilidad

- Contraste: dim sobre bg ≥ 4.5:1 en ambos temas (verificado). Cian como color de texto solo en tamaños ≥ 15px o peso 500.
- Íconos decorativos con `aria-hidden`; toggles con `aria-label` y `aria-pressed`.
- Canvas del hero `aria-hidden`, `pointer-events: none`.
