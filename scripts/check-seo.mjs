#!/usr/bin/env node
/**
 * npm run check:seo   (después de `npm run build`)
 *
 * Revisa dist/: títulos y descripciones (duplicados y longitud), un único <h1>, canónicas y og:url,
 * JSON-LD parseable, enlaces internos rotos, sitemap contra las páginas reales y que toda página
 * indexable se alcance en 2 clics desde la portada. Sale con código 1 si hay errores.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'dist');
const SITE = 'https://quesuena.es';
const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const pathOf = (f) => {
  const rel = '/' + relative(DIST, f).replace(/\\/g, '/');
  return rel.endsWith('/index.html') ? rel.slice(0, -'index.html'.length) : rel;
};

const pages = walk(DIST).filter((f) => f.endsWith('.html')).map((f) => {
  const html = readFileSync(f, 'utf8');
  const path = pathOf(f);
  const pick = (re) => (re.exec(html)?.[1] !== undefined ? decode(re.exec(html)[1]) : null);
  const body = /<body[\s\S]*<\/body>/.exec(html)?.[0] ?? '';
  return {
    path,
    html,
    title: pick(/<title>([\s\S]*?)<\/title>/),
    description: pick(/<meta name="description" content="([^"]*)"/),
    canonical: pick(/<link rel="canonical" href="([^"]*)"/),
    ogUrl: pick(/<meta property="og:url" content="([^"]*)"/),
    noindex: /<meta name="robots" content="[^"]*noindex/.test(html),
    lang: pick(/<html lang="([^"]*)"/),
    h1: [...body.matchAll(/<h1[\s>]/g)].length,
    ld: [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]),
    links: [...body.matchAll(/<a [^>]*href="([^"]+)"/g)].map((m) => decode(m[1])),
    refs: [...html.matchAll(/(?:src|href)="(\/[^"/][^"]*)"/g)].map((m) => decode(m[1])),
  };
});
const byPath = new Map(pages.map((p) => [p.path, p]));
const indexable = pages.filter((p) => !p.noindex);

// (a) títulos y descripciones
for (const [field, min, max] of [['title', 10, 65], ['description', 120, 155]]) {
  const seen = new Map();
  for (const p of indexable) {
    const v = p[field];
    if (!v) { err(`${p.path}: falta ${field}`); continue; }
    if (seen.has(v)) err(`${p.path}: ${field} repetido con ${seen.get(v)}`);
    seen.set(v, p.path);
    if (v.length > max) err(`${p.path}: ${field} de ${v.length} caracteres (máx. ${max})`);
    else if (v.length < min) (field === 'description' ? err : warn)(`${p.path}: ${field} de ${v.length} caracteres (mín. ${min})`);
  }
}
// (b) H1 y lang
for (const p of pages) {
  if (p.h1 !== 1) err(`${p.path}: ${p.h1} etiquetas <h1> (debe haber una)`);
  if (p.lang !== 'es') err(`${p.path}: <html lang="${p.lang}"> (debe ser «es»)`);
}
// (c) canónicas y og:url
for (const p of pages) {
  if (p.noindex) {
    if (p.canonical) err(`${p.path}: página noindex con canónica`);
    continue;
  }
  const want = SITE + p.path;
  if (p.canonical !== want) err(`${p.path}: canónica «${p.canonical}» (esperada ${want})`);
  if (p.ogUrl !== p.canonical) err(`${p.path}: og:url «${p.ogUrl}» no coincide con la canónica`);
}
// (d) enlaces internos rotos
const exists = (href) => {
  const clean = href.split('#')[0].split('?')[0];
  if (!clean) return true;
  const target = join(DIST, decodeURI(clean));
  if (clean.endsWith('/')) return existsSync(join(target, 'index.html'));
  return existsSync(target) || existsSync(join(target, 'index.html'));
};
for (const p of pages) {
  for (const href of new Set([...p.links.filter((h) => h.startsWith('/') && !h.startsWith('//')), ...p.refs])) {
    if (!exists(href)) err(`${p.path}: enlace o recurso roto → ${href}`);
  }
}
// (e) JSON-LD
for (const p of pages) {
  for (const raw of p.ld) {
    try {
      const d = JSON.parse(raw);
      if (!d['@context'] || !d['@type']) err(`${p.path}: JSON-LD sin @context o @type`);
    } catch (e) {
      err(`${p.path}: JSON-LD no parseable (${e.message})`);
    }
  }
}
// (f) sitemap contra las páginas reales
const sitemapFile = join(DIST, 'sitemap-0.xml');
if (!existsSync(sitemapFile)) err('falta sitemap-0.xml');
else {
  const locs = [...readFileSync(sitemapFile, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const want = new Set(indexable.map((p) => SITE + p.path));
  for (const l of locs) if (!want.has(l)) err(`sitemap: ${l} no es una página indexable real`);
  for (const w of want) if (!locs.includes(w)) err(`sitemap: falta ${w}`);
  console.log(`Sitemap: ${locs.length} URL, páginas indexables: ${want.size}`);
}
// (g) alcance en 2 clics desde la portada
const depth = new Map([['/', 0]]);
let frontier = ['/'];
for (let d = 1; d <= 2; d++) {
  const next = [];
  for (const path of frontier) {
    for (const href of byPath.get(path)?.links ?? []) {
      const t = href.split('#')[0].split('?')[0];
      if (t.startsWith('/') && !t.startsWith('//') && byPath.has(t) && !depth.has(t)) { depth.set(t, d); next.push(t); }
    }
  }
  frontier = next;
}
for (const p of indexable) if (!depth.has(p.path)) err(`${p.path}: no se alcanza en 2 clics desde la portada`);

console.log(`Páginas: ${pages.length} (${indexable.length} indexables, ${pages.length - indexable.length} noindex)`);
for (const w of warnings) console.log('AVISO ', w);
for (const e of errors) console.log('ERROR ', e);
console.log(errors.length ? `\n${errors.length} error(es).` : '\nTodo correcto.');
process.exit(errors.length ? 1 : 0);
