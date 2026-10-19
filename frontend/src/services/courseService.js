import { apiClient } from './api';

export const courseService = {
  /**
   * Retrieves public catalog or filtered courses list.
   * Endpoint: GET /api/v1/courses (params: category_id, instructor_id, status, search, level, language, page, limit)
   */
  getCourses: (params = {}) => apiClient('/courses', { params }),

  /**
   * Retrieves details for a specific course by ID.
   * Endpoint: GET /api/v1/courses/{id}
   */
  getCourseById: (id) => apiClient(`/courses/${id}`),

  /**
   * Creates a new course in draft status.
   * Endpoint: POST /api/v1/courses
   */
  createCourse: (data) => apiClient('/courses', { method: 'POST', body: data }),

  /**
   * Updates course metadata.
   * Endpoint: PUT /api/v1/courses/{id}
   */
  updateCourse: (id, data) => apiClient(`/courses/${id}`, { method: 'PUT', body: data }),

  /**
   * Deletes an unused course.
   * Endpoint: DELETE /api/v1/courses/{id}
   */
  deleteCourse: (id) => apiClient(`/courses/${id}`, { method: 'DELETE' }),

  /**
   * Submits a draft or changes_requested course for Super Admin review.
   * Endpoint: POST /api/v1/courses/{id}/submit
   */
  submitForApproval: (id) => apiClient(`/courses/${id}/submit`, { method: 'POST' }),

  /**
   * Reopens a published course back to draft for editing.
   * Endpoint: POST /api/v1/courses/{id}/reopen
   */
  reopenCourse: (id) => apiClient(`/courses/${id}/reopen`, { method: 'POST' }),

  /**
   * Retrieves full approval history timeline.
   * Endpoint: GET /api/v1/courses/{id}/approval-history
   */
  getApprovalHistory: (id) => apiClient(`/courses/${id}/approval-history`)
};
