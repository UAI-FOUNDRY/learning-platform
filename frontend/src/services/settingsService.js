import { apiClient } from './api';

export const settingsService = {
  /**
   * Retrieves platform settings.
   * Endpoint: GET /api/v1/settings (query: category)
   */
  getSettings: (params = {}) => apiClient('/settings', { params }),

  /**
   * Updates multiple settings at once.
   * Endpoint: PUT /api/v1/settings
   * Body: { values: Record<string, any> }
   */
  updateSettings: (values) => apiClient('/settings', { method: 'PUT', body: { values } }),

  /**
   * Updates a single setting by key.
   * Endpoint: PUT /api/v1/settings/{key}
   */
  updateSetting: (key, value) => apiClient(`/settings/${key}`, { method: 'PUT', body: { value } }),

  /**
   * Retrieves public settings safe for visitors.
   * Endpoint: GET /api/v1/settings/public
   */
  getPublicSettings: () => apiClient('/settings/public')
};
