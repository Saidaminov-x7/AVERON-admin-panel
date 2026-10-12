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
  const apiTarget = env.VITE_API_URL || 'https://averon-backend-production.up.railway.app';

  return {
    plugins: [react(), releaseManifest()],
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
