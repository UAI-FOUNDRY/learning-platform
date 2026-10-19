import { apiClient } from './api';

export const organizationService = {
  /**
   * Lists organizations for Super Admin.
   * Endpoint: GET /api/v1/organizations (params: search, org_type, status, page, limit)
   */
  getOrganizations: (params = {}) => apiClient('/organizations', { params }),

  /**
   * Retrieves organization details.
   * Endpoint: GET /api/v1/organizations/{id}
   */
  getOrganizationById: (id) => apiClient(`/organizations/${id}`),

  /**
   * Creates a new organization.
   * Endpoint: POST /api/v1/organizations
   */
  createOrganization: (data) => apiClient('/organizations', { method: 'POST', body: data }),

  /**
   * Updates organization details.
   * Endpoint: PUT /api/v1/organizations/{id}
   */
  updateOrganization: (id, data) => apiClient(`/organizations/${id}`, { method: 'PUT', body: data }),

  /**
   * Deletes an organization.
   * Endpoint: DELETE /api/v1/organizations/{id}
   */
  deleteOrganization: (id) => apiClient(`/organizations/${id}`, { method: 'DELETE' }),

  /**
   * Retrieves organization statistics.
   * Endpoint: GET /api/v1/organizations/{id}/stats
   */
  getOrganizationStats: (id) => apiClient(`/organizations/${id}/stats`),

  /**
   * Lists members of an organization.
   * Endpoint: GET /api/v1/organizations/{id}/members
   */
  getMembers: (id, params = {}) => apiClient(`/organizations/${id}/members`, { params }),

  /**
   * Adds a member to an organization.
   * Endpoint: POST /api/v1/organizations/{id}/members
   */
  addMember: (id, memberData) => apiClient(`/organizations/${id}/members`, { method: 'POST', body: memberData }),

  /**
   * Lists courses linked to an organization.
   * Endpoint: GET /api/v1/organizations/{id}/courses
   */
  getCourses: (id) => apiClient(`/organizations/${id}/courses`)
};
