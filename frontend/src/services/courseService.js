import { apiClient } from './api';
import { mockCourses } from '../data/mockCourses';
import { mockPendingApprovals } from '../data/mockDashboardData';
import { getStoredReview, applyCourseReview, applyCourseReviews } from '../utils/courseReviews';

export const courseService = {
  /**
   * Retrieves public catalog or filtered courses list.
   * Endpoint: GET /api/v1/courses (params: category_id, instructor_id, status, search, level, language, page, limit)
   */
  getCourses: async (params = {}) => {
    try {
      const data = await apiClient('/courses', { params });
      if (Array.isArray(data) && data.length > 0) {
        return applyCourseReviews(data);
      }
    } catch {
      // Backend not yet running; fallback to mock dataset with stored reviews
    }
    return applyCourseReviews(mockCourses);
  },

  /**
   * Retrieves details for a specific course by ID.
   * Endpoint: GET /api/v1/courses/{id} with graceful mock fallback and stored review overlay.
   */
  getCourseById: async (id) => {
    if (!id) return null;
    try {
      const data = await apiClient(`/courses/${id}`);
      if (data && typeof data === 'object' && data.id) {
        const review = getStoredReview(id);
        return applyCourseReview(data, review);
      }
    } catch {
      // Backend unavailable; fallback to local mock records
    }

    const fromMock = mockCourses.find(c => String(c.id) === String(id));
    const fromPending = mockPendingApprovals.find(c => String(c.id) === String(id));
    if (!fromMock && !fromPending) return null;

    const base = {
      ...(fromPending || {}),
      ...(fromMock || {}),
      modulesCount: fromMock?.modulesCount || fromPending?.modulesCount || 0
    };

    const review = getStoredReview(id);
    return applyCourseReview(base, review);
  },

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
