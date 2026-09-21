import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import licenses from './lib/licenses.json';

const licenseIds = Object.keys(licenses) as [string, ...string[]];

/**
 * Un sonido = un JSON en src/content/sounds/<coleccion>/<categoria>/<id>.json
 * junto a su mp3 en public/audio/<coleccion>/<categoria>/<id>.mp3
 * La colección, la categoría y el id salen de la ruta del fichero.
 */
const sounds = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/sounds' }),
  schema: z.object({
    /** Nombre que se muestra: «Vaca». */
    name: z.string().min(1),
    emoji: z.string().min(1),
    /** Ruta del mp3 dentro de public/audio/ (o del bucket de audio). */
    file: z.string().regex(/\.mp3$/, 'El audio debe ser un mp3'),
    /** Segundos. Lo rellena `npm run ingest`. */
    duration: z.number().positive(),
    /** Ajuste de volumen en dB para igualar clips. Lo rellena `npm run ingest`. */
    gain: z.number().min(-24).max(24).default(0),
    /** Un aviso honesto sobre lo que se oye: grabación real, recreación o sintético. */
    origin: z.enum(['grabacion', 'recreacion', 'sintetico']).default('grabacion'),
    /** Especie o detalle: «Serpiente de cascabel». Opcional. */
    species: z.string().optional(),
    /** Artículo del nombre, para escribir «del gato», «de la vaca». Opcional. */
    article: z.enum(['el', 'la', 'los', 'las']).optional(),
    /** Cómo se llama el sonido («mugido»), su verbo («mugir») y su onomatopeya («muuu»). Opcionales: solo con datos verificados. */
    sound: z.string().min(1).optional(),
    verb: z.string().min(1).optional(),
    onomatopoeia: z.string().min(1).optional(),
    /** 1-2 frases con un dato útil y cierto sobre el sonido o cómo se comunica el animal. Opcional. */
    description: z.string().min(1).max(280).optional(),
    /** Solo para casos especiales: fuerza el tono (0-359) en lugar del de la categoría. */
    hue: z.number().min(0).max(359).optional(),
    credit: z.object({
      title: z.string().min(1),
      author: z.string().min(1),
      /** Solo licencias que permiten uso comercial y redistribución (ver src/lib/licenses.json). */
      license: z.enum(licenseIds),
      url: z.string().url(),
    }),
  }),
});

export const collections = { sounds };
