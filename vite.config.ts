import { defineConfig, type Plugin, type ViteDevServer } from 'vite';
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
export default defineConfig({
  plugins: [react(), releaseManifest()],
});
