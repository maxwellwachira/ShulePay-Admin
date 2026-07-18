import { resolve } from 'node:path';
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';

// Three isolated build targets: the Electron main process (Node), the preload bridge
// (runs in an isolated context), and the renderer (the React UI, no Node access).
const sharedAlias = { '@shared': resolve('src/shared') };

export default defineConfig({
  main: {
    resolve: { alias: sharedAlias },
    build: { rollupOptions: { input: resolve('src/main/index.ts') } },
  },
  preload: {
    resolve: { alias: sharedAlias },
    build: { rollupOptions: { input: resolve('src/preload/index.ts') } },
  },
  renderer: {
    root: 'src/renderer',
    build: { rollupOptions: { input: resolve('src/renderer/index.html') } },
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/shared'),
      },
    },
    plugins: [react()],
  },
});
