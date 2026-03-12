import axios from 'axios';

// point directly to the remote backend service instead of proxying
const api = axios.create({ baseURL: 'https://api-esquenta-zap-production.up.railway.app/api' });

export default api;

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
