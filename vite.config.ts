import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build works on GitHub Pages under /devunra/ and on any other host.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'es2021', assetsInlineLimit: 0 },
});
