import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (mode === 'production' && !env.VITE_API_URL) {
    throw new Error(
      '❌ VITE_API_URL не задан в переменных окружения сборки. ' +
      'Настрой Environment Variables в Vercel (Settings → Environment Variables) перед деплоем.',
    );
  }

  return {
    plugins: [react()],
  };
});
