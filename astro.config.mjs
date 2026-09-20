import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Sitio 100 % estático: Cloudflare Pages sirve la carpeta dist/.
export default defineConfig({
  site: 'https://quesuena.es',
  integrations: [sitemap()],
  build: { assets: '_astro' },
});
