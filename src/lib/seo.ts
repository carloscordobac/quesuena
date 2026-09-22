import type { CatalogSound } from './catalog';

const BRAND = '¿Qué suena?';
const OF = { el: 'del', la: 'de la', los: 'de los', las: 'de las' } as const;

/** «del gato», «de la vaca». Sin artículo verificado no se inventa: devuelve null. */
export function ofName(s: Pick<CatalogSound, 'name' | 'article'>): string | null {
  return s.article ? `${OF[s.article]} ${s.name.toLocaleLowerCase('es')}` : null;
}

/** Encabezado de la ficha: «Sonido del gato» o, sin artículo, «Sonido: Gato». */
export function soundHeading(s: Pick<CatalogSound, 'name' | 'article'>): string {
  const de = ofName(s);
  return de ? `Sonido ${de}` : `Sonido: ${s.name}`;
}

/** Título único, palabra clave primero y ≤ 60 caracteres (se acorta por variantes, nunca a mitad de palabra). */
export function soundTitle(s: CatalogSound): string {
  const hasWords = Boolean(s.sound || s.verb || s.onomatopoeia);
  const de = ofName(s);
  // Sin artículo verificado no se escribe «del/de la»: se usa el nombre tal cual.
  const options = de
    ? [hasWords ? `Sonido ${de}: escúchalo y cómo se dice` : `Sonido ${de}: escúchalo`, `Sonido ${de}: escúchalo`, `Sonido ${de}`]
    : [`${s.name}: escucha su sonido`, s.name];
  const titles = options.map((t) => `${t} | ${BRAND}`);
  return titles.find((t) => t.length <= 60) ?? titles.at(-1)!;
}

/** Primera frase (o el texto entero) de una descripción. */
function firstSentence(text: string): string {
  const m = /^.*?[.!?](?=\s|$)/.exec(text.trim());
  return (m ? m[0] : text.trim()).trim();
}

/** Meta description única de 120-155 caracteres, montada con datos reales de la ficha.
 *  - Con `description`: usa su primera frase; si se pasa de 155, la recorta por palabra
 *    entera y añade «…» (nunca se corta el encabezado, que es lo esencial).
 *  - Sin `description`: rellena con una cola de la categoría/marca, probando de la más
 *    larga a la más corta, hasta que el total cae en el hueco de 120-155. */
export function soundDescription(s: CatalogSound, categoryName: string, collectionName: string): string {
  const de = ofName(s);
  const subject = de ? `el sonido ${de}` : `el sonido de «${s.name}»`;
  const head = `Escucha ${subject}${s.sound || s.verb || s.onomatopoeia ? ' y descubre cómo se dice' : ''}.`;
  const catLower = categoryName.toLocaleLowerCase('es');
  const collLower = collectionName.toLocaleLowerCase('es');

  const tails = [
    `Grabación real con licencia abierta de la categoría ${catLower}. Juega a adivinar ${collLower} por su sonido en ¿Qué suena?.`,
    `Es una grabación real con licencia abierta, de la categoría ${catLower}. Escúchala en ¿Qué suena? y aprende a reconocerla.`,
    `Grabación real con licencia abierta, categoría ${catLower}. Escúchala en ¿Qué suena?.`,
    `Grabación real de la categoría ${catLower}, en ¿Qué suena?.`,
    `Categoría ${catLower}, en ¿Qué suena?.`,
    `En ¿Qué suena?.`,
  ];

  if (!s.description) {
    for (const tail of tails) {
      const candidate = `${head} ${tail}`;
      if (candidate.length >= 120 && candidate.length <= 155) return candidate;
    }
    const fits = tails.map((t) => `${head} ${t}`).find((c) => c.length <= 155);
    return fits ?? head;
  }

  const sentence = firstSentence(s.description);
  let candidate = `${head} ${sentence}`;
  if (candidate.length > 155) {
    // Deja hueco para el espacio y la elipsis, y corta por la última palabra entera.
    const budget = 155 - head.length - 2;
    let cut = sentence.slice(0, Math.max(0, budget));
    const lastSpace = cut.lastIndexOf(' ');
    if (lastSpace > 30) cut = cut.slice(0, lastSpace);
    cut = cut.replace(/[,;:.\s]+$/, '');
    return `${head} ${cut}…`;
  }
  if (candidate.length < 120) {
    for (const tail of tails) {
      const padded = `${candidate} ${tail}`;
      if (padded.length >= 120 && padded.length <= 155) return padded;
    }
  }
  return candidate;
}

/** Duración en ISO 8601 para schema.org: 8.05 s → «PT8.05S». */
export const isoDuration = (seconds: number) => `PT${seconds}S`;

/** Migas de pan en JSON-LD (las URL, absolutas). */
export function breadcrumbLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url })),
  };
}
