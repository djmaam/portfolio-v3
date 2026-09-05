# AGENT_CONSOLE_SPEC — Consola interactiva (borrador)

> Estado: **idea aprobada, spec definitiva pendiente.** Marcos la va a specear con Claude Code. Este documento fija la intención de diseño y las restricciones; no el plan.

## Idea

La consola del hero hoy es decorativa (log de orquestación). La propuesta: que sea **interactiva**. Quien visita puede escribirle y un mini agente responde preguntas sobre Marcos, su experiencia, proyectos, forma de trabajar y cómo contactarlo, usando **solo la información del sitio** (`content.json`).

Es la metáfora del portfolio hecha literal: "orquesto agentes" → el visitante habla con uno.

## Experiencia

1. **Estado pasivo** (como hoy): log animado + métricas. Debajo del log, un input mono con placeholder `preguntale al agente ▸` (EN: `ask the agent ▸`). Al enfocarlo, el log deja de auto-avanzar.
2. **Al enviar**: la pregunta entra al log como línea `hh:mm:ss · you · …`. Aparece `agent · thinking` con el cursor parpadeando; la respuesta se **streamea** en el mismo formato de log (`agent · texto…`), máx. ~80 palabras, en el idioma activo del sitio.
3. **Expandir**: un botón `⤢` en el header de la consola la lleva a modo grande (ancho completo del hero, altura ~70vh) con el historial completo. `Esc` o `⤡` la devuelve. En mobile, la consola expandida ocupa la pantalla como una sheet.
4. **Sugerencias**: 3 chips iniciales, ej. `¿En qué trabaja hoy?` · `¿Cómo trabaja con agentes?` · `¿Qué construyó en Tplay?`.
5. **Cierre**: si la pregunta es sobre contratarlo o colaborar, la respuesta termina con el link a `hi@marcosarrieta.dev` o Telegram.
6. Estado offline / error: la línea dice `agent · sin conexión, escribile a hi@marcosarrieta.dev`.

## Restricciones de diseño

- Mismo lenguaje visual: mono 12.5–13px, líneas `time · key · value`, `key` en cian; las del usuario con `key = you` en dim.
- Nada de burbujas de chat. Es un log.
- La red de nodos reacciona: cada respuesta dispara un "comando" (pulso) igual que las líneas del log.
- Accesible: `role="log"` con `aria-live="polite"`; el input es un `<form>` real.

## Restricciones técnicas (para la spec)

- **La API key nunca va al cliente.** Endpoint propio (Cloudflare Worker o endpoint de Astro en modo `server`/hybrid desplegado en Cloudflare Pages) que llama a la API de Anthropic.
- Modelo económico (Claude Haiku). System prompt = persona + reglas + `content.json` serializado (~3–4 KB). Sin RAG: el contenido entra en el prompt.
- Reglas del prompt: responder solo con información del contexto; si no sabe, decirlo y ofrecer el email; tono de Marcos (directo, cercano, sin humo); mismo idioma que la pregunta o el del sitio; máx. 80 palabras; nunca inventar clientes, números ni fechas.
- Límites: 12–15 mensajes por sesión (contador en `sessionStorage`), rate limit por IP en el Worker (ej. 30/h), timeout 15s, streaming SSE.
- Costo estimado: ~US$0.001 por pregunta con Haiku. Presupuesto mensual tope configurable en el Worker (kill-switch → estado offline).
- Analítica mínima: contar preguntas y errores (sin guardar el texto de los usuarios salvo opt-in explícito).

## Fuera de alcance por ahora

Memoria entre sesiones, herramientas (tool use), acceso a repos o LinkedIn en vivo, voz.
