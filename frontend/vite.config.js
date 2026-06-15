import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** LAN IPv4 — avoids hitting another dev app bound only to 127.0.0.1 on the same port. */
function getDevApiHost() {
  const nets = os.networkInterfaces();
  for (const ifaces of Object.values(nets)) {
    if (!ifaces) continue;
    for (const net of ifaces) {
      const isIPv4 = net.family === 'IPv4' || net.family === 4;
      if (isIPv4 && !net.internal) return net.address;
    }
  }
  return '127.0.0.1';
}

function inferredBackendPort() {
  try {
    const envPath = path.resolve(__dirname, '../backend/.env');
    const t = fs.readFileSync(envPath, 'utf8');
    const m = t.match(/^\s*PORT\s*=\s*(\d+)/m);
    if (m) return m[1];
  } catch {
    /* noop */
  }
  return '5000';
}

function probeBackendHealth(host, port, timeoutMs = 2500) {
  return new Promise((resolve) => {
    const req = http.get(
      { host, port: Number(port), path: '/api/health', timeout: timeoutMs },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          resolve(false);
          return;
        }
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(body)?.status === 'ok');
          } catch {
            resolve(false);
          }
        });
      },
    );
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.on('error', () => resolve(false));
  });
}

async function resolveDevApiTarget(port, explicitTarget) {
  if (explicitTarget) return explicitTarget;

  const lanHost = getDevApiHost();
  /**
   * Cursor on Windows can bind 127.0.0.1:PORT and return another app's 404.
   * Our API listens on 0.0.0.0 — probe LAN first, then localhost.
   */
  const candidates = [];
  if (lanHost && lanHost !== '127.0.0.1') candidates.push(lanHost);
  candidates.push('127.0.0.1');

  for (const host of candidates) {
    if (await probeBackendHealth(host, port)) {
      return `http://${host}:${port}`;
    }
  }

  return lanHost && lanHost !== '127.0.0.1'
    ? `http://${lanHost}:${port}`
    : `http://127.0.0.1:${port}`;
}

/**
 * Proxy `/api` → backend. Optionally set `VITE_DEV_API_TARGET` or `VITE_BACKEND_PORT` in `.env.development.local`.
 * If unset, probes /api/health on LAN IP then localhost (Cursor can steal 127.0.0.1:PORT on Windows).
 */
export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const port = env.VITE_BACKEND_PORT?.trim() || inferredBackendPort();
  const explicitTarget = env.VITE_DEV_API_TARGET?.trim();
  const target = mode === 'development'
    ? await resolveDevApiTarget(port, explicitTarget)
    : explicitTarget || `http://127.0.0.1:${port}`;

  if (mode === 'development') {
    // eslint-disable-next-line no-console
    console.info(
      `[vite] proxy /api → ${target} │ من الهاتف على الويفاي: http://${getDevApiHost()}:5173 (الـAPI المباشر :${port})`,
    );
  }

  const injectedPort = mode === 'development' ? port : '';
  return {
    define: {
      __MISK_BACKEND_PORT__: JSON.stringify(injectedPort),
    },
    plugins: [react()],
    server: {
      host: true, /* listens on 0.0.0.0 — open from phone/tablet on same Wi‑Fi */
      port: 5173,
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              const isUpload = req.method === 'POST' || req.method === 'PUT';
              proxyReq.setTimeout(isUpload ? 120000 : 8000, () => proxyReq.destroy());
            });
            proxy.on('error', (err, _req, res) => {
              const lan = getDevApiHost();
              const hint = lan && lan !== '127.0.0.1'
                ? `http://${lan}:${port}`
                : `http://127.0.0.1:${port}`;
              if (res?.writeHead && !res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  success: false,
                  message: `Dev API proxy could not reach ${target}. Restart Vite or set VITE_DEV_API_TARGET=${hint}`,
                }));
              }
              // eslint-disable-next-line no-console
              console.warn(`[vite] proxy error (${target}):`, err.message);
            });
          },
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            ui: ['framer-motion', 'lucide-react'],
            state: ['@reduxjs/toolkit', 'react-redux'],
          },
        },
      },
    },
  };
});
