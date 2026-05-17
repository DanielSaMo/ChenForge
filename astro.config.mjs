import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import svelte from '@astrojs/svelte';

export default defineConfig({
  site: 'https://danielsamo.github.io',
  base: '/ChenForge/',

  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [svelte()]
});
