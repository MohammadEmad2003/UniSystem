// Axios-based API client wired to the backend (Node/Express).
// Auth token is read from the persisted Zustand auth store.
import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

// Recursively lowercase all object keys so backend PascalCase (Dept_ID, F_Name…)
// matches the frontend's snake_case type definitions (dept_id, f_name…).
const normalizeKeys = (val: unknown): unknown => {
  if (Array.isArray(val)) return val.map(normalizeKeys);
  if (val !== null && typeof val === 'object') {
    return Object.fromEntries(
      Object.entries(val as Record<string, unknown>).map(([k, v]) => [
        k.toLowerCase(), normalizeKeys(v),
      ])
    );
  }
  return val;
};

apiClient.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('capital-uni-auth');
    if (raw) {
      const parsed = JSON.parse(raw);
      const token = parsed?.state?.token;
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // ignore — request goes out unauthenticated
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => {
    if (res.data) res.data = normalizeKeys(res.data) as typeof res.data;
    return res;
  },
  (err) => {
    const msg =
      err?.response?.data?.message?.msg ||
      err?.response?.data?.message ||
      err?.message ||
      'Request failed';
    return Promise.reject(new Error(typeof msg === 'string' ? msg : JSON.stringify(msg)));
  }
);

export const AI_BASE_URL = (import.meta.env.VITE_AI_BASE_URL || 'http://localhost:9000').replace(/\/+$/, '');

// Normalize backend payloads where role / account_status come capitalized from SQLite.
export const normalizeUser = <T extends { role?: string; account_status?: string } | undefined>(u: T): T => {
  if (!u) return u;
  const out = { ...u } as { role?: string; account_status?: string };
  if (out.role) out.role = out.role.toLowerCase();
  if (out.account_status) out.account_status = out.account_status.toLowerCase();
  return out as T;
};
