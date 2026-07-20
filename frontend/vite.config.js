import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/cryptoscamdb': {
        target: 'https://api.cryptoscamdb.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/cryptoscamdb/, ''),
        secure: false,
      },
    },
  },
});
