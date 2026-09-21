# CLAUDE.md · ¿Qué suena? (quesuena.es)

Contexto para trabajar en este repositorio con Claude Code.

## Qué es
Web estática en español. Un círculo grande: se toca y suena un sonido real al azar; la página se tiñe con el color de su categoría y muestra el nombre. Hay un modo «Adivinar antes de ver». Sin cuentas ni backend. El progreso se guarda solo en `localStorage`. Analítica (Google Analytics 4) únicamente con consentimiento previo.

## Stack y comandos
Astro (salida estática) + TypeScript + CSS propio (sin Tailwind, sin frameworks de UI). Web Audio para reproducir. Despliegue: GitHub → Cloudflare Pages.

- `npm run dev` · `npm run build` (valida el contenido) · `npm run preview`
- `npm run ingest` procesa `raw/` (necesita ffmpeg)
- `npm run check:seo` revisa `dist/` tras el build (títulos, descripciones, H1, canónicas, enlaces, JSON-LD, sitemap)
- No hay tests automáticos: la comprobación es que `npm run build` pase y probar en el navegador.

## Modelo de contenido (lo más importante)
- `src/content/collections.json`: colecciones → categorías (`id`, `name`, `hue`).
- Un sonido = `public/audio/<col>/<cat>/<id>.mp3` + `src/content/sounds/<col>/<cat>/<id>.json`. El id sale de la ruta.
- Esquema en `src/content.config.ts`; `src/lib/catalog.ts` hace fallar el build si falta el mp3, la categoría o si la licencia no está en `src/lib/licenses.json`.
- **No edites a mano `duration` ni `gain`**: los calcula `scripts/ingest.mjs`.
- La app pide `/data/<coleccion>.json` (un manifiesto por colección, sin créditos). Los créditos solo van en `/creditos`.

## Reglas de contenido
- Solo audio con licencia que permita uso comercial y redistribución (CC0, dominio público, CC BY, CC BY-SA, Pixabay). Nada de NC/ND, ni audio de películas, series, videojuegos o música comercial.
- Cada sonido lleva autor, título, licencia y URL de origen reales. Nunca inventes una atribución: si no se puede verificar, no se añade.
- `origin`: `grabacion` (real), `recreacion` o `sintetico`. Los dinosaurios nunca son grabaciones: van como `recreacion`.
- No incrustes audio en base64 ni en el HTML. Los mp3 viven en `public/audio/` (o en `PUBLIC_AUDIO_BASE`).

## Privacidad y analítica
- **Nada de scripts de terceros que carguen antes del consentimiento.** GA solo se carga desde `src/scripts/analytics.ts` tras un «Aceptar» explícito (`consent.ts`) y solo en los hostnames de `GA_HOSTS` (`src/lib/site.ts`). Nunca pegues un fragmento en el `<head>`.
- **El ID de medición nunca se escribe en el repositorio.** Solo existe como variable `PUBLIC_GA_ID` (Cloudflare Pages, solo Production, tipo texto). Sin ella, la analítica queda desactivada: `ANALYTICS_ENABLED` de `src/lib/site.ts` oculta el aviso y el botón «Cookies». Cambiarla exige relanzar el despliegue (Astro la incrusta al compilar).
- Sin señales de Google ni anuncios; los eventos no llevan datos personales ni identificadores propios (la web la puede usar gente menor de edad).
- Si añades eventos, cookies o terceros, actualiza `/privacidad`.

## Marca y estilo
- El pie es de ancho completo con fondo oscuro fijo (tokens `--foot-*`, independientes del tono del animal) y dos logotipos de otras marcas: Desarrollo Creativo (`public/img/desarrollo-creativo-oscuro.png`) y ccordoba (`public/img/ccordoba.png`, enlaza a ccordoba.es). Solo se usan esos ficheros; no se recolorean ni se usan los originales de `raw/`.
- **No quitar del pie el enlace a `/creditos/` ni el acceso a «Cookies»:** los exigen las licencias de los sonidos (atribución accesible) y la retirada del consentimiento.
- Colores: Tinta `#131A2B`, Papel `#F7F8FB` y un tono por categoría (ámbar `#F2A93B`, bermellón `#E8553D`, índigo `#5A5BD9`, cian `#1FA6D6`, verde `#45B36B`). Los tonos por categoría se definen en `collections.json` (`hue`), no en el CSS.
- Tipografía: DynaPuff 600 para títulos y el logotipo; Figtree para texto. Autoalojadas (Fontsource), sin Google Fonts.
- Copy en español de España, tono cercano y breve, sentence case (no MAYÚSCULAS). Una acción se llama igual en todo el flujo.
- El nombre de marca se escribe «¿Qué suena?» en texto y «¿qué suena?» en el logotipo.
- Accesibilidad: objetivos táctiles ≥ 44 px, foco visible, `prefers-reduced-motion` respetado, contraste AA. Todo es un `<button>` o `<a>` real.
- Logotipos y iconos ya generados en `brand/` (el texto está convertido a curvas). No los redibujes a mano.

## Al terminar un cambio
1. `npm run build` sin errores.
2. Si tocaste el contenido: revisa `/creditos` y que el sonido nuevo suene y se vea bien.
3. Commits pequeños y en español.
