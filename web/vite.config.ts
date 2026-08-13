import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

function readProductVersion(): { version: string; codename: string } {
  const candidates = [
    path.resolve(rootDir, '../../PlayerHistory_Server/VERSION'),
    path.resolve(rootDir, 'package.json'),
  ];

  for (const filePath of candidates) {
    try {
      if (!fs.existsSync(filePath)) continue;
      if (filePath.endsWith('.json')) {
        const pkg = JSON.parse(fs.readFileSync(filePath, 'utf8')) as { version?: string };
        if (pkg.version) return { version: pkg.version, codename: '' };
        continue;
      }
      const lines = fs
        .readFileSync(filePath, 'utf8')
        .trim()
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines[0]) return { version: lines[0], codename: lines[1] ?? '' };
    } catch {
      // try next
    }
  }
  return { version: '0.0.0', codename: '' };
}

const { version: appVersion, codename: appCodename } = readProductVersion();

export default defineConfig({
  root: rootDir,
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __APP_CODENAME__: JSON.stringify(appCodename),
  },
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3847',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});