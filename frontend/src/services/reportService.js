import { apiClient } from './api';

export const reportService = {
  /**
   * Super Admin moderation queue.
   * Endpoint: GET /api/v1/reports (query: status, target_type, reason, page, limit, skip)
   */
  getReports: (params = {}) => apiClient('/reports', { params }),

  /**
   * Retrieves specific report details.
   * Endpoint: GET /api/v1/reports/{id}
   */
  getReportById: (id) => apiClient(`/reports/${id}`),

  /**
   * Resolves or updates a moderation report.
   * Endpoint: PATCH /api/v1/reports/{id}
   * Body: { status: 'reviewing' | 'resolved' | 'dismissed', action: 'hide' | 'remove' | 'restore', resolution_notes }
   */
  resolveReport: (id, resolutionData) =>
    apiClient(`/reports/${id}`, { method: 'PATCH', body: resolutionData }),

  /**
   * Files a content moderation report.
   * Endpoint: POST /api/v1/reports
   */
  createReport: (reportData) =>
    apiClient('/reports', { method: 'POST', body: reportData })
};
