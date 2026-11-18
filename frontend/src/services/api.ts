import axios from 'axios';

export const AUTH_EXPIRED_EVENT = 'bright:auth-expired';
export const ROLE_CHANGED_EVENT = 'bright:role-changed';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bright_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url: string = error?.config?.url || '';
    const isLoginCall = url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/email-verification');
    if (status === 401 && !isLoginCall && localStorage.getItem('bright_token')) {
      // Token invalid/expired or account locked: force sign-out.
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    } else if (status === 403) {
      // Role may have been changed by an admin: let the auth context resync from /auth/me.
      window.dispatchEvent(new Event(ROLE_CHANGED_EVENT));
    }
    return Promise.reject(error);
  },
);

export default api;
