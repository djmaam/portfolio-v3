# LinkedIn — banner and profile copy

Source: `handoff/content.json` (the same copy as marcosarrieta.dev). Design tokens:
background `#08090c`, accent `#3ee7ff`, violet `#aa78ff`, Manrope + IBM Plex Mono.

## 1. Banner

| File            | Use                                                    |
| --------------- | ------------------------------------------------------ |
| `banner-es.png` | 3168×792 (1584×396 @2x) — the one to upload            |
| `banner-en.png` | English version                                        |
| `banner-*.html` | editable source (fonts embedded, opens in any browser) |

Regenerate with `python3 gen-banner.py && bun shot.mjs` (see `README.md`).
Content sits top-left: the profile photo covers the lower-left corner.

---

## 2. Headline — 220 characters max

**ES**

```
AI Engineer · Pienso el producto y lo llevo a producción · 7+ años, 10+ productos en producción, 6 plataformas · Spec-Driven Development con equipos de agentes
```

**EN**

```
AI Engineer · I think the product and ship it to production · 7+ years, 10+ products in production, 6 platforms · Spec-Driven Development with agent teams
```

---

## 3. About — 2,600 characters max

**ES**

```
Pienso el producto. Lo llevo a producción.

Siete años como ingeniero de software llevando productos a producción en agro, streaming y salud: 12.000 productores, 500.000 hectáreas, seis plataformas. Hoy construyo con equipos de agentes de IA, sobre specs claras y arquitectura que aguanta.

Me importa menos qué tecnología usar y más qué problema resolver, para quién y con qué arquitectura.

Cómo trabajo
· Idea — entender el problema, a quién afecta y qué significa resolverlo bien.
· Spec — definir el qué y el porqué, con criterios de aceptación verificables.
· Plan — arquitectura, tareas y qué agente ejecuta cada una.
· Código — los agentes ejecutan; yo reviso, decido y sostengo la vara.
· Producción — tests, deploy y medición.

La spec es el contrato. Los agentes ejecutan. Yo diseño la arquitectura, reviso el output y tomo las decisiones.

Principios
· Criterio sobre herramientas: el stack cambia cada año, saber qué construir y por qué no.
· Arquitectura primero: un buen plano permite que cualquier equipo, humano o agente, construya bien.
· Producto antes que features: cada decisión técnica responde a una necesidad concreta de una persona real.

Stack: TypeScript, React Native, React, Next.js, Astro, Node.js, NestJS, PostgreSQL, MongoDB, AWS, Google Cloud, Claude Code, MCP, orquestación de agentes, Spec-Driven Development.

¿Tienes algo que construir? Hablemos.
marcosarrieta.dev · hi@marcosarrieta.dev
```

**EN**

```
I think the product. I ship it to production.

Seven years as a software engineer shipping products to production in agtech, streaming and health: 12,000 farmers, 500,000 hectares, six platforms. Today I build with teams of AI agents, on clear specs and architecture that holds.

I care less about which technology to use and more about which problem to solve, for whom, and with what architecture.

How I work
· Idea — understand the problem, who it affects and what solving it well means.
· Spec — define the what and the why, with verifiable acceptance criteria.
· Plan — architecture, tasks, and which agent owns each one.
· Code — agents execute; I review, decide and hold the bar.
· Production — tests, deploy and measurement.

The spec is the contract. Agents execute. I design the architecture, review the output and make the calls.

Principles
· Judgment over tooling: the stack changes every year, knowing what to build and why does not.
· Architecture first: a good blueprint lets any team, human or agent, build well.
· Product before features: every technical decision answers a concrete need of a real person.

Stack: TypeScript, React Native, React, Next.js, Astro, Node.js, NestJS, PostgreSQL, MongoDB, AWS, Google Cloud, Claude Code, MCP, agent orchestration, Spec-Driven Development.

Got something to build? Let's talk.
marcosarrieta.dev · hi@marcosarrieta.dev
```

---

## 4. Experience

### Spanish

**Nera — AI Engineer · Apr 2023 – present**

```
Fintech que digitaliza pagos y financiamiento para el agro: 12.000+ productores y US$ 1.000M+ financiados.

· Uno de los ingenieros con más recorrido del equipo: estuve en cada etapa del producto, de la primera versión a la plataforma actual.
· Mobile, web, backend y cloud, de punta a punta.
· Hoy construyo con agentes de IA bajo Spec-Driven Development, con la misma vara de review, tests y arquitectura de siempre.

Stack: TypeScript · React Native · React · Node.js · PostgreSQL · AWS · Claude Code · orquestación de agentes
```

**Telecentro (Tplay) — Full Stack Engineer Sr · Jul 2022 – Apr 2023**

```
App de streaming con TV en vivo y on demand, en seis plataformas desde una sola base de código.

· Impulsé la nueva versión: rediseño técnico y visual completo que revirtió las reseñas de la app.
· Mobile, web y Smart TV (Android TV, Tizen, webOS).

Stack: TypeScript · React Native · React · Android TV · Tizen · webOS
```

**AgroPro — Mobile Engineer Ssr · Feb 2021 – Jul 2022**

```
Gestión agrícola en más de 500.000 hectáreas.

· Construí la app móvil desde cero, con sincronización offline del campo a la oficina.
· Desarrollé el core de órdenes de trabajo.

Stack: React Native · React · Node.js · MongoDB · offline sync
```

**DePC Suite — Freelance · Full Stack Engineer · Nov 2020 – Feb 2021**

```
Software factory con presencia en cuatro países.

· Construí +Ushuaia de punta a punta (app móvil y backend), tarjeta de beneficios de la Municipalidad de Ushuaia: 10.000+ descargas.
· Otros productos para clientes, mobile y web.

Stack: React Native · Node.js · Firebase
```

**Ucosmos — Full Stack Engineer · Feb 2020 – Feb 2021**

```
Software factory de productos con IA y salud digital.

· Demedis: salud en tiempo real.
· Hashme: analítica de Instagram.

Stack: React Native · React · Node.js · integraciones · realtime
```

### English

**Nera — AI Engineer · Apr 2023 – present**

```
Fintech digitizing payments and financing for agriculture: 12,000+ farmers, US$1B+ financed.

· One of the longest-tenured engineers on the team: I have been in every stage of the product, from the first version to today's platform.
· Mobile, web, backend and cloud, end to end.
· I build it with AI agents now, under Spec-Driven Development, held to the same bar of review, tests and architecture as always.

Stack: TypeScript · React Native · React · Node.js · PostgreSQL · AWS · Claude Code · agent orchestration
```

**Telecentro (Tplay) — Full Stack Engineer Sr · Jul 2022 – Apr 2023**

```
Streaming app with live TV and on demand, on six platforms from a single codebase.

· Drove the new version: a full technical and visual redesign that turned the app's reviews around.
· Mobile, web and Smart TV (Android TV, Tizen, webOS).

Stack: TypeScript · React Native · React · Android TV · Tizen · webOS
```

**AgroPro — Mobile Engineer Ssr · Feb 2021 – Jul 2022**

```
Farm management across 500,000+ hectares.

· Built the mobile app from scratch, with offline sync from field to office.
· Built the work-order core.

Stack: React Native · React · Node.js · MongoDB · offline sync
```

**DePC Suite — Freelance · Full Stack Engineer · Nov 2020 – Feb 2021**

```
Software factory present in four countries.

· Built +Ushuaia end to end (mobile app and backend), the City of Ushuaia's benefits card: 10,000+ downloads.
· Other client products, mobile and web.

Stack: React Native · Node.js · Firebase
```

**Ucosmos — Full Stack Engineer · Feb 2020 – Feb 2021**

```
Software factory for AI and digital health products.

· Demedis: realtime health.
· Hashme: Instagram analytics.

Stack: React Native · React · Node.js · integrations · realtime
```

---

## 5. Rest of the profile

- **Website (contact info):** `https://marcosarrieta.dev`, labeled "Portfolio".
- **Custom URL:** already `linkedin.com/in/djmaam`.
- **Featured:** links to `nera-agro.com`, `telecentro.com.ar`, `agropro.ag`, `masushuaia.com` and `marcosarrieta.dev`.
- **Skills, top 3 pinned:** `Spec-Driven Development`, `AI Agent Orchestration`, `TypeScript`.
  Then React Native, React, Next.js, Node.js, NestJS, PostgreSQL, AWS, Astro, Software Architecture.
- **Open to:** AI Engineer, Software Engineer, Tech Lead; remote.
- **Photo:** neutral background. It lands on the lower-left corner of the banner, left empty for it.

## 6. Second profile language

LinkedIn keeps one profile with translated text fields. Add the English version from
_Add profile in another language_: headline, about, job titles and descriptions,
education. Everything else — banner, photo, skills, featured links, recommendations,
dates — is shared, so the banner above is the one both versions show. Spanish stays the
default; visitors whose LinkedIn is in English get the English text.
