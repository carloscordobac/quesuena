import { getCollection } from 'astro:content';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import collectionDefs from '../content/collections.json';
import licenses from './licenses.json';

export type Origin = 'grabacion' | 'recreacion' | 'sintetico';

export interface Credit {
  title: string;
  author: string;
  license: keyof typeof licenses;
  url: string;
}

export interface CatalogSound {
  /** «animales/granja/vaca»: único en todo el catálogo. */
  id: string;
  collection: string;
  category: string;
  name: string;
  emoji: string;
  species?: string;
  file: string;
  duration: number;
  gain: number;
  hue: number;
  origin: Origin;
  credit: Credit;
}

export interface CatalogCategory {
  id: string;
  name: string;
  hue: number;
}

export interface CatalogCollection {
  id: string;
  name: string;
  emoji: string;
  categories: CatalogCategory[];
  sounds: CatalogSound[];
}

/** Desplazamiento de tono estable (−18…+18) para que dos animales de la misma categoría no sean idénticos. */
function hueOffset(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 37) - 18;
}

let cached: Promise<CatalogCollection[]> | null = null;

async function build(): Promise<CatalogCollection[]> {
  const entries = await getCollection('sounds');
  const problems: string[] = [];
  const audioRoot = join(process.cwd(), 'public', 'audio');
  // Si el audio vive en un bucket (PUBLIC_AUDIO_BASE), no se exige que esté en public/audio/.
  const remoteAudio = Boolean(import.meta.env.PUBLIC_AUDIO_BASE);

  const collections: CatalogCollection[] = collectionDefs.map((c) => ({
    id: c.id,
    name: c.name,
    emoji: c.emoji,
    categories: c.categories.map((k) => ({ id: k.id, name: k.name, hue: k.hue })),
    sounds: [],
  }));

  for (const entry of entries) {
    const id = entry.id; // «animales/granja/vaca»
    const [collectionId, categoryId, ...rest] = id.split('/');
    if (!collectionId || !categoryId || rest.length !== 1) {
      problems.push(`${id}: la ruta debe ser <coleccion>/<categoria>/<id>.json`);
      continue;
    }
    const collection = collections.find((c) => c.id === collectionId);
    if (!collection) {
      problems.push(`${id}: la colección «${collectionId}» no existe en src/content/collections.json`);
      continue;
    }
    const category = collection.categories.find((k) => k.id === categoryId);
    if (!category) {
      problems.push(`${id}: la categoría «${categoryId}» no existe en la colección «${collectionId}»`);
      continue;
    }
    const d = entry.data;
    if (!remoteAudio && !existsSync(join(audioRoot, d.file))) {
      problems.push(`${id}: falta el audio public/audio/${d.file}`);
      continue;
    }
    collection.sounds.push({
      id,
      collection: collectionId,
      category: categoryId,
      name: d.name,
      emoji: d.emoji,
      species: d.species,
      file: d.file,
      duration: d.duration,
      gain: d.gain,
      hue: d.hue ?? (((category.hue + hueOffset(id)) % 360) + 360) % 360,
      origin: d.origin,
      credit: d.credit as Credit,
    });
  }

  if (problems.length) {
    throw new Error('Catálogo de sonidos con errores:\n - ' + problems.join('\n - '));
  }

  // Orden estable: categorías en el orden de collections.json y nombres alfabéticos.
  for (const c of collections) {
    const order = new Map(c.categories.map((k, i) => [k.id, i]));
    c.sounds.sort(
      (a, b) =>
        (order.get(a.category) ?? 0) - (order.get(b.category) ?? 0) || a.name.localeCompare(b.name, 'es'),
    );
  }

  // Solo se muestran las colecciones que ya tienen sonidos.
  return collections.filter((c) => c.sounds.length > 0);
}

export function getCatalog(): Promise<CatalogCollection[]> {
  cached ??= build();
  return cached;
}

/** Lo mínimo que necesita la app en el navegador (sin créditos). */
export function toManifest(c: CatalogCollection) {
  return {
    id: c.id,
    name: c.name,
    emoji: c.emoji,
    categories: c.categories,
    sounds: c.sounds.map((s) => ({
      id: s.id,
      name: s.name,
      emoji: s.emoji,
      cat: s.category,
      hue: s.hue,
      gain: s.gain,
      dur: s.duration,
      file: s.file,
      origin: s.origin,
    })),
  };
}
