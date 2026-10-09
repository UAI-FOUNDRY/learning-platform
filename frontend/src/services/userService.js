import { apiClient } from './api';

export const userService = {
  getProfile: () => apiClient('/users/profile'),
  updateProfile: (data) => apiClient('/users/profile', { method: 'PUT', body: data })
};
