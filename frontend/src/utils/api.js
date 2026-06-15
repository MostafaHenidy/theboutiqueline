import axios from 'axios';

/* global __MISK_BACKEND_PORT__ */
/**
 * Resolves the API base URL:
 *
 * • localhost / 127.0.0.1  → always use Vite proxy `/api`
 *   (Vite proxies /api → backend port, so no CORS issue at all)
 *
 * • LAN IP (phone/tablet on same Wi-Fi, e.g. 192.168.x.x)
 *   → use direct http://<lan-ip>:<backend-port>/api
 *   (Vite proxy can't help here because the request comes from a different device)
 *
 * • Production → VITE_API_BASE_URL env var, fallback to `/api`
 */
function resolveApiBase() {
  const injPort = typeof __MISK_BACKEND_PORT__ !== 'undefined' ? __MISK_BACKEND_PORT__ : '';

  if (import.meta.env.DEV) {
    const host =
      typeof window !== 'undefined' && window.location?.hostname
        ? window.location.hostname
        : 'localhost';

    // On the dev machine itself → go through the Vite proxy (no CORS, port-agnostic)
    if (host === 'localhost' || host === '127.0.0.1') {
      return '/api';
    }

    // On a phone / tablet over LAN → direct connection (proxy won't reach backend)
    const port = injPort && String(injPort).trim() !== '' ? String(injPort).trim() : '5001';
    return `http://${host}:${port}/api`;
  }

  // Production
  const raw = typeof import.meta.env?.VITE_API_BASE_URL === 'string'
    ? import.meta.env.VITE_API_BASE_URL.trim()
    : '';
  if (!raw || raw === 'undefined' || raw === 'null') return '/api';
  const base = raw.replace(/\/+$/, '');
  const withApi = base.endsWith('/api') ? base : `${base}/api`;
  return withApi.replace(/\/api\/api\b/, '/api');
}

const apiBase = resolveApiBase();

const api = axios.create({
  baseURL: apiBase,
  timeout: 15000,
});

/** Longer timeout for multipart uploads (banners, products). */
export const apiUpload = axios.create({
  baseURL: apiBase,
  timeout: 120000,
});

function attachAuth(config) {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  /* FormData يجب ألا يُربط بـ application/json — وإلا يفسد multer ويصل الحقل كائن/مصفوفة */
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    const h = config.headers;
    if (h && typeof h.delete === 'function') {
      h.delete('Content-Type');
      h.delete('content-type');
    } else {
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
    }
  }
  return config;
}

function handleAuthError(error) {
  if (error.response?.status === 401) {
    const requestedWithBearer = !!(error.config?.headers?.Authorization);
    if (requestedWithBearer) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  }
  return Promise.reject(error);
}

api.interceptors.request.use(attachAuth);
apiUpload.interceptors.request.use(attachAuth);
api.interceptors.response.use((response) => response, handleAuthError);
apiUpload.interceptors.response.use((response) => response, handleAuthError);

export default api;
