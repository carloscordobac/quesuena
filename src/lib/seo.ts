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

/** Título único, palabra clave primero y ≤ 60 caracteres (se recorta por variantes, nunca a mitad de palabra). */
export function soundTitle(s: CatalogSound): string {
  const h = soundHeading(s);
  const hasWords = Boolean(s.sound || s.verb || s.onomatopoeia);
  const options = [hasWords ? `${h}: escúchalo y cómo se dice` : `${h}: escúchalo`, `${h}: escúchalo`, h];
  const titles = options.map((t) => `${t} | ${BRAND}`);
  return titles.find((t) => t.length <= 60) ?? titles.at(-1)!;
}

/** Primera frase (o el texto entero) recortada a `max` caracteres en un límite de frase. */
function firstSentence(text: string): string {
  const m = /^.*?[.!?](?=\s|$)/.exec(text.trim());
  return (m ? m[0] : text.trim()).trim();
}

/** Meta description única de 120-155 caracteres, montada con datos reales de la ficha. */
export function soundDescription(s: CatalogSound, categoryName: string): string {
  const de = ofName(s);
  const subject = de ? `el sonido ${de}` : `el sonido: ${s.name.toLocaleLowerCase('es')}`;
  const head = `Escucha ${subject}${s.sound || s.verb || s.onomatopoeia ? ' y descubre cómo se dice' : ''}.`;
  const extras = [
    s.description ? firstSentence(s.description) : '',
    `Grabación real con licencia abierta, categoría ${categoryName.toLocaleLowerCase('es')}.`,
    'Juega a adivinar en ¿Qué suena?',
  ].filter(Boolean);
  let out = head;
  for (const part of extras) {
    if ((out + ' ' + part).length <= 155) out += ' ' + part;
  }
  return out;
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
