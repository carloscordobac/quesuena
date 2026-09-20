# ¿Qué suena?

**quesuena.es**: toca el círculo, escucha un sonido real al azar y adivina qué es.

Empieza con **50 animales** (granja, salvajes, aves, mar e insectos) y está pensado para crecer con más colecciones: dinosaurios, objetos, instrumentos…

- Sitio 100 % estático (Astro), sin servidor ni base de datos.
- Grabaciones reales con licencias abiertas; todas las atribuciones están en [/creditos](src/pages/creditos.astro).
- Se despliega en **Cloudflare Pages** conectado a GitHub, igual que ccordoba.es.

## Puesta en marcha

Requisitos: Node 22 o superior (`nvm use` lee `.nvmrc`) y, solo para añadir sonidos, [ffmpeg](https://ffmpeg.org/).

```bash
npm install
npm run dev        # http://localhost:4321
```

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con recarga. |
| `npm run build` | Genera `dist/`. **Falla si falta un audio, una categoría o una licencia permitida.** |
| `npm run preview` | Sirve `dist/` tal como lo verá Cloudflare. |
| `npm run ingest` | Procesa los originales de `raw/` y crea el mp3 y la ficha de cada sonido. |

## Cómo está organizado

```
quesuena/
├─ public/
│  ├─ audio/<coleccion>/<categoria>/<id>.mp3    los sonidos (≈65 KB cada uno)
│  ├─ favicon.svg · favicon.ico · apple-touch-icon.png · icon-*.png
│  ├─ og.png                                    imagen al compartir en redes (1200×630)
│  ├─ site.webmanifest · robots.txt
│  └─ _headers                                  caché y seguridad en Cloudflare Pages
├─ src/
│  ├─ content/
│  │  ├─ collections.json                       colecciones y categorías (nombre, emoji, color)
│  │  └─ sounds/<coleccion>/<categoria>/<id>.json   una ficha por sonido
│  ├─ content.config.ts                         esquema y validación (Zod)
│  ├─ lib/                                      catalog.ts (carga y valida) · licenses.json
│  ├─ pages/                                    index, creditos, 404 y /data/<coleccion>.json
│  ├─ scripts/                                  audio.ts · ring.ts · app.ts (navegador)
│  ├─ styles/global.css                         tokens de marca y estilos
│  ├─ components/ · layouts/
├─ scripts/ingest.mjs                           de original a mp3 + ficha
├─ brand/                                       logotipos, símbolo, iconos (SVG y PNG) y guía de marca
├─ docs/                                        CONTENIDO.md · DESPLIEGUE.md
├─ raw/                                         originales sin procesar (no se sube a Git)
└─ CLAUDE.md                                    contexto para trabajar con Claude Code
```

## Añadir sonidos o colecciones

Un sonido es **un mp3 + una ficha JSON** en la carpeta `<coleccion>/<categoria>/`. Para crearlos:

1. Deja el original en `raw/<coleccion>/<categoria>/<id>.ogg` junto a su ficha `<id>.json` (nombre, emoji, autor, licencia y enlace).
2. `npm run ingest`
3. `npm run build` para validar y `git push`.

Añadir una colección nueva es añadir un bloque a `src/content/collections.json`. No hay que tocar código: los filtros de la app aparecen solos cuando hay dos o más colecciones con sonidos. Guía completa, licencias válidas y dónde buscar sonidos: [`docs/CONTENIDO.md`](docs/CONTENIDO.md).

## Desplegar

Repositorio en GitHub → proyecto en Cloudflare Pages → dominio `quesuena.es`. Paso a paso en [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md). Resumen de ajustes de Pages:

- Framework preset: **Astro**
- Build command: `npm run build`
- Build output directory: `dist`
- Variable de entorno: `NODE_VERSION` = `22`

## Marca

Identidad «C · Colores»: cinco arcos (uno por categoría) y un punto central; títulos en DynaPuff y texto en Figtree, ambas autoalojadas con Fontsource. Colores, usos y ficheros en [`brand/README.md`](brand/README.md).

## Licencias

- **Código**: MIT ([LICENSE](LICENSE)).
- **Sonidos** (`public/audio/`): son grabaciones de terceros con su propia licencia, indicada en cada ficha y en `/creditos`. Ver [LICENSE-AUDIO.md](LICENSE-AUDIO.md).
- **Marca** (logotipo, símbolo, iconos): por defecto, todos los derechos reservados. Decide si quieres abrirla con otra licencia.
- **Fuentes**: DynaPuff y Figtree, SIL Open Font License.

## Hoja de ruta

- [ ] Publicar en quesuena.es y comprobar la vista previa al compartir.
- [ ] Colección de **Objetos** (grabaciones reales CC0: timbre, teclado, motor, campanas…).
- [ ] Colección de **Dinosaurios** como recreaciones de diseño sonoro, con la etiqueta «Recreación».
- [ ] Modo sin conexión (service worker) cuando haya más de una colección.
- [ ] Si el audio supera ~1.000 clips o ~200 MB: moverlo a Cloudflare R2 (`PUBLIC_AUDIO_BASE`).
