import { apiClient } from './api';

export const authService = {
  login: (credentials) => apiClient('/auth/login', { body: credentials }),
  register: (data) => apiClient('/auth/register', { body: data }),
  logout: () => apiClient('/auth/logout', { method: 'POST' }),
  getCurrentUser: () => apiClient('/auth/me')
};
