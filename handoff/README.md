# portfolio-v3 · Marcos Arrieta — Handoff para Claude Code

Portfolio 2D de **Marcos Arrieta** (Software Engineer & AI Orchestrator). Este paquete es la fuente de verdad de diseño para construir `marcosarrieta.dev`.

## Qué hay acá

| Archivo | Para qué |
|---|---|
| `reference/Portfolio.dc.html` | Mock interactivo de referencia (abrilo en el navegador). Toda la lógica de animación está en su `<script>` final y es portable. |
| `reference/Portfolio Mobile.dc.html` | Composición mobile (dos iPhones). |
| `DESIGN_SPEC.md` | Tokens, tipografía, layout, componentes y estados. |
| `MOTION_SPEC.md` | Cada animación: qué, cuándo, duración, curva, reduced-motion. |
| `AGENT_CONSOLE_SPEC.md` | Idea de la consola interactiva con mini agente (borrador para specear junto a Claude Code). |
| `ARCHITECTURE.md` | Stack Astro + Bun, estructura de carpetas, decisiones. |
| `content.json` | Todo el copy ES/EN, experiencia, proyectos, stack, log de la consola, links. Fuente única de contenido. |

## Reglas no negociables

1. **Contenido desde `content.json`** (o su equivalente `src/lib/content.ts`). Nada de texto hardcodeado en componentes.
2. **Bilingüe ES/EN** con toggle en nav; ES por defecto. Persistir en `localStorage`.
3. **Tema claro/oscuro** con toggle; respetar `prefers-color-scheme` al primer load. Implementar con `color-scheme` + `light-dark()` o CSS variables equivalentes.
4. **Cero barras de porcentaje** de skills. El stack es una marquesina con dos niveles (diario / también).
5. **Todas las animaciones se apagan con `prefers-reduced-motion: reduce`** (contenido siempre visible).
6. Mobile: mismas secciones y animaciones salvo lo indicado en `MOTION_SPEC.md` (la sección "Cómo trabajo" no se fija; los pasos se destraban en flujo).
7. Assets pendientes del usuario: logos de empresas (hoy placeholders con abreviatura), previews de proyectos (iframe estático o screenshot), fuentes self-hosted.

## Cómo usar este handoff con Claude Code

Sugerencia de arranque (Spec-Driven): pedile a Claude Code que lea los cinco `.md` y `content.json`, y que proponga un plan por secciones: base (tokens, layout, i18n, tema) → hero → about → método → experiencia → proyectos → stack → contacto → motion → consola agente. Una PR por bloque.
