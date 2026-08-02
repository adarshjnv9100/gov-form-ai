import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: false,
    proxy: {
      // Dev proxy: routes /api/* to local handler equivalents.
      // In production, Vercel serves these from the /api directory directly.
      // During local dev, we proxy OCR and recommendation requests through the
      // Gemini AI endpoint using the GEMINI_API_KEY from .env.local (no VITE_ prefix).
      '/api/ocr': {
        target: 'http://localhost:3000',
        rewrite: () => '/api/ocr',
        // Handled by Vercel dev CLI; in pure vite dev, requests will 404
        // unless running `vercel dev`. See README for setup instructions.
      },
      '/api/nemotron': {
        target: 'http://localhost:3000',
        rewrite: () => '/api/nemotron',
      },
    },
  },
});
