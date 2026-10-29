import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { localAudioPlugin } from './scripts/local-audio-plugin.mjs';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    localAudioPlugin(),
    {
      name: 'development-refresh-policy',
      apply: 'serve',
      transformIndexHtml: (html) =>
        html.replace("script-src 'self';", "script-src 'self' 'unsafe-inline';"),
    },
  ],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  build: { outDir: 'dist', target: 'chrome140' },
});
