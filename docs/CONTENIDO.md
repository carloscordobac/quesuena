# Guía de contenido

Cómo añadir sonidos, categorías y colecciones sin tocar código.

## El modelo

```
colección   Animales            (src/content/collections.json)
  categoría   Granja, Mar…      (con su color: hue 0-359)
    sonido    Vaca              (mp3 + ficha JSON)
```

- Las colecciones que no tienen sonidos **no se muestran**. Ya están definidas `dinosaurios` y `objetos` (con categorías de ejemplo) esperando contenido.
- Con dos o más colecciones con sonidos, la app muestra automáticamente los filtros «Todo · Animales · …».
- Cada categoría tiene su propio color: es el que tiñe la página cuando suena uno de sus sonidos.

## Añadir un sonido (camino recomendado)

1. Consigue el original con una licencia válida (más abajo) y apunta autor, título y URL.
2. Colócalo en `raw/<coleccion>/<categoria>/<id>.<ext>`. El `id` va en minúsculas, sin tildes ni espacios (`pavo-real`, `aguila`).
3. Crea al lado la ficha `raw/<coleccion>/<categoria>/<id>.json`:

```json
{
  "name": "Águila",
  "emoji": "🦅",
  "species": "Águila real",
  "origin": "grabacion",
  "credit": {
    "title": "Golden Eagle (Aquila chrysaetos).ogg",
    "author": "British Library",
    "license": "CC-BY-SA-4.0",
    "url": "https://commons.wikimedia.org/wiki/File:…"
  }
}
```

   Campos opcionales para la página del sonido (ver «Páginas por sonido» más abajo): `article`, `sound`, `verb`, `onomatopoeia` y `description`.

4. `npm run ingest`. El script:
   - quita el silencio del principio y del final, pasa a mono y recorta a 8 s con fundido;
   - guarda `public/audio/<coleccion>/<categoria>/<id>.mp3`;
   - mide duración y volumen y crea `src/content/sounds/<coleccion>/<categoria>/<id>.json` con `duration` y `gain` calculados.
5. `npm run build` valida todo y `npm run dev` para escucharlo.

Opciones: `npm run ingest -- --force` rehace los ya procesados; `npm run ingest -- raw/objetos` procesa solo esa carpeta.

### Sin script

También puedes dejar tú el mp3 en `public/audio/…` y escribir la ficha en `src/content/sounds/…` (mismos campos más `file`, `duration` y `gain`). El build te dirá qué falta.

## Páginas por sonido

Cada sonido tiene su página `/<coleccion>/<id>/` (por ejemplo `/animales/vaca/`) y cada colección con sonidos, su concentrador `/<coleccion>/`. Se generan solas del catálogo. El nombre de fichero del sonido no puede repetirse dentro de la colección ni llamarse como una ruta fija del sitio (`creditos`, `privacidad`, `data`…): el build avisa.

Campos opcionales de la ficha, que enriquecen la página. **Si un dato no existe o no se puede verificar, se deja sin poner y la página no lo muestra. No se inventa nada.**

| Campo | Ejemplo | Para qué |
| --- | --- | --- |
| `article` | `"el"` (`el`, `la`, `los`, `las`) | Escribir «Sonido del gato», «Sonido de la vaca». Sin él, el título es «Gato: escucha su sonido». |
| `sound` | `"mugido"` | Cómo se llama el sonido. |
| `verb` | `"mugir"` | El verbo de la voz del animal. |
| `onomatopoeia` | `"muuu"` | Onomatopeya. |
| `description` | `"Las vacas…"` | 1-2 frases con un dato útil y cierto (máx. 280 caracteres). |

Para las voces de los animales, la fuente de referencia es el *Diccionario de la lengua española* (RAE); para el resto, enciclopedias o fuentes científicas. `npm run ingest` copia estos campos de la ficha de `raw/` a la del sonido. Después de un cambio de contenido, `npm run build` y `npm run check:seo` (títulos, descripciones, H1, canónicas, enlaces, JSON-LD y sitemap).

## Licencias válidas (`credit.license`)

`CC0-1.0`, `PD` (dominio público), `CC-BY-2.5`, `CC-BY-3.0`, `CC-BY-4.0`, `CC-BY-SA-2.5`, `CC-BY-SA-3.0`, `CC-BY-SA-4.0` y `PIXABAY`. La lista está en `src/lib/licenses.json`; si añades una, comprueba que permite uso comercial y redistribución.

**No valen**: NC (no comercial), ND (sin obras derivadas: aquí se recorta y se normaliza), audio de películas, series, videojuegos o música comercial, ni nada «encontrado en internet» sin licencia clara.

## Dónde buscar

- **Wikimedia Commons**: filtra por audio; las fichas indican autor y licencia. Es de donde salen los 50 animales.
- **Freesound**: filtra por licencia CC0 o CC BY (evita las «Attribution NonCommercial»).
- **OpenGameArt**, **BigSoundBank**: buena fuente de CC0 para objetos e instrumentos.
- **archive.org**: solo elementos marcados como dominio público o CC0.
- **Pixabay**: permitido por su licencia; ficha propia con `PIXABAY`.

Verifica la licencia en la página de **cada archivo**, no en la de la colección.

## Colecciones nuevas

Añade un bloque a `src/content/collections.json`:

```json
{
  "id": "instrumentos",
  "name": "Instrumentos",
  "emoji": "🎸",
  "categories": [
    { "id": "cuerda", "name": "Cuerda", "hue": 30 },
    { "id": "viento", "name": "Viento", "hue": 200 }
  ]
}
```

Reglas prácticas para los colores: `hue` es el matiz (0 rojo, 60 amarillo, 120 verde, 200 cian, 240 azul, 300 magenta). Usa matices distintos para categorías de una misma colección.

## Dinosaurios y sonidos que no son grabaciones

No existen grabaciones de dinosaurios. Solo hay recreaciones de diseño sonoro. Reglas:

- Usa recreaciones con licencia CC0 o CC BY (Freesound, OpenGameArt) y **nunca** sonidos de películas ni videojuegos.
- Pon `"origin": "recreacion"` (o `"sintetico"` si es generado). La página de créditos muestra la etiqueta «Recreación» y no presenta como real algo que no lo es.
- El nombre puede llevar una nota en `species`: «Recreación de un Tyrannosaurus rex».

## Cambios de nombre y borrados

- Cambiar el `id` (nombre de fichero) de un sonido hace que quien lo tenga marcado como escuchado lo vuelva a ver como nuevo. No es grave; conviene evitarlo.
- Para borrar un sonido: elimina su `.json` y su `.mp3`. Si lo eliminas por un problema de licencia, revisa también el historial de Git.

## Cuando el audio crezca

Con unos 65 KB por clip, 1.000 clips son ~65 MB y caben sin problema en Pages (límite de 20.000 ficheros de 25 MiB). Si te acercas a ~200 MB, mueve `public/audio/` a un bucket de Cloudflare R2 y define `PUBLIC_AUDIO_BASE` (ver `docs/DESPLIEGUE.md`). Los JSON y el código no cambian.
