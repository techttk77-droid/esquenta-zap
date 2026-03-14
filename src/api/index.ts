import axios from 'axios';

// Em dev: URL relativa → proxy Vite encaminha para Railway sem CORS
// Em prod (Vercel): URL absoluta direta para Railway
const apiBase = import.meta.env.DEV
  ? '/api'
  : 'https://api-esquenta-zap-production.up.railway.app/api';

const api = axios.create({ baseURL: apiBase });

// ─── Machine ID (único por navegador/máquina) ───────────────────────────────
export function getMachineId(): string {
  let id = localStorage.getItem('machineId');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('machineId', id);
  }
  return id;
}

// ─── Token management ───────────────────────────────────────────────────────
export function getToken(): string | null {
  return localStorage.getItem('token');
}
export function setToken(token: string) {
  localStorage.setItem('token', token);
}
export function clearToken() {
  localStorage.removeItem('token');
}

// ─── Axios interceptors ─────────────────────────────────────────────────────
// Attach Bearer token to every request
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global 401 handler — force logout
let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(cb: () => void) {
  onUnauthorized = cb;
}
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && onUnauthorized) {
      onUnauthorized();
    }
    return Promise.reject(err);
  }
);

export default api;

// ─── Auth ────────────────────────────────────────────────────────────────────

export const register = (username: string, password: string, name?: string) =>
  api.post('/auth/register', { username, password, name }).then((r) => r.data);

export const login = (username: string, password: string) =>
  api.post('/auth/login', { username, password, machineId: getMachineId() }).then((r) => r.data);

export const getMe = () => api.get('/auth/me').then((r) => r.data);

export const logout = () =>
  api.post('/auth/logout').then((r) => r.data).catch(() => {});

// ─── Numbers ────────────────────────────────────────────────────────────────

export const getNumbers = () => api.get('/numbers').then((r) => r.data);
export const createNumber = (data: any) => api.post('/numbers', data).then((r) => r.data);
export const deleteNumber = (id: string) => api.delete(`/numbers/${id}`).then((r) => r.data);
export const connectNumber = (id: string) => api.post(`/numbers/${id}/connect`).then((r) => r.data);
export const disconnectNumber = (id: string) => api.post(`/numbers/${id}/disconnect`).then((r) => r.data);
export const switchEngine = (id: string, engine: string) =>
  api.post(`/numbers/${id}/switch-engine`, { engine }).then((r) => r.data);
export const sendText = (id: string, to: string, text: string) =>
  api.post(`/numbers/${id}/send-text`, { to, text }).then((r) => r.data);
export const getRecentLogs = (limit = 100) =>
  api.get(`/numbers/logs/recent?limit=${limit}`).then((r) => r.data);

// ─── Groups ─────────────────────────────────────────────────────────────────

export const getGroups = () => api.get('/groups').then((r) => r.data);
export const createGroup = (name: string) => api.post('/groups', { name }).then((r) => r.data);
export const deleteGroup = (id: string) => api.delete(`/groups/${id}`).then((r) => r.data);
export const addMember = (groupId: string, numberId: string) =>
  api.post(`/groups/${groupId}/members`, { numberId }).then((r) => r.data);
export const removeMember = (groupId: string, numberId: string) =>
  api.delete(`/groups/${groupId}/members/${numberId}`).then((r) => r.data);

// ─── Scheduler ──────────────────────────────────────────────────────────────

export const getTasks = () => api.get('/scheduler').then((r) => r.data);
export const createTask = (data: any) => api.post('/scheduler', data).then((r) => r.data);
export const updateTask = (id: string, data: any) => api.put(`/scheduler/${id}`, data).then((r) => r.data);
export const deleteTask = (id: string) => api.delete(`/scheduler/${id}`).then((r) => r.data);
export const triggerTask = (id: string) => api.post(`/scheduler/${id}/trigger`).then((r) => r.data);

// ─── Settings ────────────────────────────────────────────────────────────────

export const getSettings = () => api.get('/settings').then((r) => r.data);
export const updateSettings = (data: any) => api.put('/settings', data).then((r) => r.data);

// ─── Media ───────────────────────────────────────────────────────────────────

export const getMedia = (type?: string) =>
  api.get(`/media${type ? `?type=${type}` : ''}`).then((r) => r.data);
export const deleteMedia = (id: string) => api.delete(`/media/${id}`).then((r) => r.data);
export const uploadAudio = (formData: FormData) =>
  api.post('/media/audio', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
export const uploadSticker = (formData: FormData) =>
  api.post('/media/sticker', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
export const uploadImage = (formData: FormData) =>
  api.post('/media/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
export const uploadVideo = (formData: FormData) =>
  api.post('/media/video', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);
