import { apiClient } from './api';

export const authService = {
  /**
   * Authenticates user with email and password.
   * Endpoint: POST /api/v1/auth/login
   */
  login: (credentials) => apiClient('/auth/login', { body: credentials }),

  /**
   * Registers a new user account (learner or instructor).
   * Endpoint: POST /api/v1/auth/register
   */
  register: (data) => apiClient('/auth/register', { body: data }),

  /**
   * Logs out user.
   * Endpoint: POST /api/v1/auth/logout
   */
  logout: () => apiClient('/auth/logout', { method: 'POST' }),

  /**
   * Retrieves authenticated user's profile.
   * Endpoint: GET /api/v1/users/me
   */
  getCurrentUser: () => apiClient('/users/me')
};
