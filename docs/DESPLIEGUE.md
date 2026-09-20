# Despliegue: GitHub → Cloudflare Pages → quesuena.es

Mismo flujo que ccordoba.es: cada `git push` a `main` publica; cada rama o PR recibe una URL de prueba.

## 1. Subir el proyecto a GitHub

Desde la carpeta del proyecto, en la terminal de VS Code:

```bash
git init -b main
git add .
git commit -m "Primera versión de ¿Qué suena?"
# Crea antes un repositorio vacío «quesuena» en github.com (sin README ni .gitignore)
git remote add origin git@github.com:TU_USUARIO/quesuena.git
git push -u origin main
```

`node_modules/`, `dist/`, `.astro/` y `raw/` ya están en `.gitignore`. El audio (~4 MB) sí se sube: no hace falta Git LFS.

## 2. Crear el proyecto en Cloudflare Pages

Cloudflare → *Workers & Pages* → *Create* → *Pages* → *Connect to Git* → elige el repositorio `quesuena`. (Los nombres de los menús de Cloudflare cambian de vez en cuando; busca «Pages» y «Connect to Git».)

| Ajuste | Valor |
| --- | --- |
| Production branch | `main` |
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Variable de entorno | `NODE_VERSION` = `22` |

Pulsa *Save and Deploy*. En un par de minutos tendrás una URL `quesuena.pages.dev` para comprobarlo.

## 3. Conectar el dominio quesuena.es

En el proyecto de Pages → *Custom domains* → *Set up a custom domain* → `quesuena.es`.

- Para un dominio raíz (sin `www`), Pages necesita gestionar el DNS: añade `quesuena.es` como sitio en Cloudflare y, en tu registrador, cambia los **servidores de nombres** por los dos que te indique Cloudflare. La propagación puede tardar hasta un día.
- Añade también `www.quesuena.es` como dominio personalizado y crea una regla de redirección (*Rules → Redirect Rules*) de `www` a `https://quesuena.es`.
- Activa *Always Use HTTPS* en *SSL/TLS → Edge Certificates*.

`astro.config.mjs` ya tiene `site: 'https://quesuena.es'`, así que las URLs canónicas, el sitemap y las etiquetas para compartir apuntan al dominio final.

## 4. Comprobaciones tras publicar

- [ ] `https://quesuena.es/` suena en el móvil (en iPhone, con el interruptor de silencio activado y desactivado).
- [ ] `https://quesuena.es/creditos/` lista los 50 sonidos con su licencia.
- [ ] Vista previa al compartir: pega la URL en WhatsApp, LinkedIn o el [depurador de Facebook](https://developers.facebook.com/tools/debug/).
- [ ] `https://quesuena.es/sitemap-index.xml` y `/robots.txt` responden.
- [ ] Lighthouse en móvil: rendimiento y accesibilidad por encima de 90.

## 5. Día a día

```bash
npm run dev        # trabajar en local
git checkout -b nueva-coleccion-objetos
# … cambios …
git push -u origin nueva-coleccion-objetos   # Pages crea una URL de prueba de la rama
# Abre un Pull Request, revísalo en la URL de prueba y fusiona a main
```

## Opcional

- **Estadísticas sin cookies**: Cloudflare → *Web Analytics* → añade el sitio. Con Pages basta activarlo desde el propio proyecto (*Metrics → Enable Web Analytics*), sin tocar el código.
- **Audio en R2**: cuando el audio crezca, crea un bucket, súbelo (`rclone sync public/audio r2:quesuena-audio`), conéctalo a `audio.quesuena.es` con CORS abierto para `https://quesuena.es` y define en Pages `PUBLIC_AUDIO_BASE=https://audio.quesuena.es/`. Con esa variable definida (en Pages y en tu `.env` local) el build deja de exigir los mp3 en `public/audio/`, así que puedes sacarlos del repositorio. Guarda los originales en otro sitio: el repo dejaría de ser su copia de seguridad.
- **Content-Security-Policy**: no está activada. Si la quieres, añade una línea a `public/_headers` y pruébala en una rama.
