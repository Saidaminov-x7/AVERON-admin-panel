import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const releaseCommit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || 'local';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'averon-release-manifest',
      apply: 'build',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'release.json',
          source: JSON.stringify({ service: 'admin', commit: releaseCommit }),
        });
      },
    },
  ],
});
