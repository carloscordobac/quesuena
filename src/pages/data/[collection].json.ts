import type { APIRoute, GetStaticPaths } from 'astro';
import { getCatalog, toManifest } from '../../lib/catalog';

// Un JSON por colección: /data/animales.json, /data/dinosaurios.json…
// La app solo descarga los de las colecciones que se usan.
export const getStaticPaths = (async () => {
  const catalog = await getCatalog();
  return catalog.map((c) => ({ params: { collection: c.id }, props: { manifest: toManifest(c) } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  new Response(JSON.stringify(props.manifest), { headers: { 'Content-Type': 'application/json' } });
