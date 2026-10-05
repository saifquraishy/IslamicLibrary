import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function decodeEncodedAmpersands() {
  const normalizePath = (url?: string) => {
    if (!url) return url;
    const queryIndex = url.indexOf('?');
    const pathname = queryIndex < 0 ? url : url.slice(0, queryIndex);
    const query = queryIndex < 0 ? '' : url.slice(queryIndex);
    return pathname.replace(/%26/gi, '&') + query;
  };
  return {
    name: 'decode-encoded-ampersands-in-static-paths',
    configureServer(server: { middlewares: { use: (middleware: (request: { url?: string }, response: unknown, next: () => void) => void) => void } }) {
      server.middlewares.use((request, _response, next) => {
        request.url = normalizePath(request.url);
        next();
      });
    },
    configurePreviewServer(server: { middlewares: { use: (middleware: (request: { url?: string }, response: unknown, next: () => void) => void) => void } }) {
      server.middlewares.use((request, _response, next) => {
        request.url = normalizePath(request.url);
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [decodeEncodedAmpersands(), react()],
  server: {
    allowedHosts: ['glorious-toad-current.ngrok-free.app'],
  },
});
