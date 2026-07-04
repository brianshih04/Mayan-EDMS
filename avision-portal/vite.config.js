import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const allowedHosts = ['mayan-portal.avision-gb10.org'];

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5174,
    allowedHosts
  },
  preview: {
    host: '0.0.0.0',
    port: 5174,
    allowedHosts
  }
});
