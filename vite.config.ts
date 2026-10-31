import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

function releaseManifest(): Plugin {
  const getManifest = () => ({
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    environment: process.env.VERCEL_ENV ?? null,
  });
  return {
    name: 'averon-release-manifest',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/release.json', (_request: IncomingMessage, response: ServerResponse) => {
        response.setHeader('Content-Type', 'application/json');
        response.setHeader('Cache-Control', 'no-store');
        response.end(JSON.stringify(getManifest()));
      });
    },
    async closeBundle() {
      await mkdir(resolve('dist'), { recursive: true });
      await writeFile(resolve('dist/release.json'), `${JSON.stringify(getManifest(), null, 2)}\n`);
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const isLocalRuntime = env.VITE_AVERON_RUNTIME_TARGET === 'local';
  const apiTarget = isLocalRuntime
    ? env.VITE_AVERON_LOCAL_API_URL || 'http://127.0.0.1:8080'
    : env.VITE_API_URL || 'https://averon-backend-production.up.railway.app';

  return {
    plugins: [react(), releaseManifest()],
    build: {
      // The lazy Three.js runtime is 737 kB raw / 187 kB gzip; keep it below the tuned ceiling.
      chunkSizeWarningLimit: 800,
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              { name: 'three-core', test: /[\\/]node_modules[\\/]three[\\/]build[\\/]/ },
              { name: 'three-loaders', test: /[\\/]node_modules[\\/]three[\\/]examples[\\/]jsm[\\/]/ },
              { name: 'react-three', test: /[\\/]node_modules[\\/]@react-three[\\/]/ },
            ],
          },
        },
      },
    },
    server: {
      proxy: {
        '/api/backend': {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/backend/, ''),
          configure: (proxy) => {
            // TEMPORARY LOCAL DEV ONLY: do not add localhost to production CORS.
            // The backend receives a server-to-server request, not browser localhost Origin.
            proxy.on('proxyReq', (proxyRequest) => proxyRequest.removeHeader('origin'));
          },
        },
      },
    },
  };
});
