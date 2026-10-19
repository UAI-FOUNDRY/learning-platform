import { apiClient } from './api';
export * from '../utils/courseReviews';

export const adminService = {
  /**
   * Lists courses currently awaiting Super Admin review.
   * Endpoint: GET /api/v1/admin/courses/pending
   */
  getApprovalsQueue: (params = {}) => apiClient('/admin/courses/pending', { params }),

  /**
   * Approves a course and publishes it.
   * Endpoint: POST /api/v1/admin/courses/{courseId}/approve
   */
  approveCourse: (courseId) => apiClient(`/admin/courses/${courseId}/approve`, { method: 'POST' }),

  /**
   * Requests changes on a pending course with feedback notes.
   * Endpoint: POST /api/v1/admin/courses/{courseId}/request-changes
   */
  requestChanges: (courseId, feedback) =>
    apiClient(`/admin/courses/${courseId}/request-changes`, {
      method: 'POST',
      body: { feedback: feedback || 'Please revise the course content.' }
    }),

  /**
   * Rejects a pending course with a justification reason.
   * Endpoint: POST /api/v1/admin/courses/{courseId}/reject
   */
  rejectCourse: (courseId, reason) =>
    apiClient(`/admin/courses/${courseId}/reject`, {
      method: 'POST',
      body: { reason: reason || 'Course does not meet platform criteria.' }
    }),

  /**
   * Unified review handler supporting existing frontend components.
   * Dispatches to the appropriate backend endpoint based on decision type.
   */
  reviewCourse: async (courseId, reviewData) => {
    const decision = reviewData.decision;
    if (decision === 'Approved' || decision === 'approve') {
      return adminService.approveCourse(courseId);
    }
    if (decision === 'Changes Requested' || decision === 'request_changes') {
      return adminService.requestChanges(courseId, reviewData.comments || reviewData.feedback);
    }
    return adminService.rejectCourse(courseId, reviewData.comments || reviewData.reason);
  },

  /**
   * Retrieves full approval history timeline for a course.
   * Endpoint: GET /api/v1/courses/{courseId}/approval-history
   */
  getApprovalHistory: (courseId) => apiClient(`/courses/${courseId}/approval-history`),

  /**
   * Retrieves high-level counts and metrics for Super Admin dashboard overview.
   * Endpoint: GET /api/v1/admin/overview
   */
  getOverview: () => apiClient('/admin/overview'),

  /**
   * Retrieves administrative audit logs.
   * Endpoint: GET /api/v1/admin/audit-logs
   */
  getAuditLogs: (params = {}) => apiClient('/admin/audit-logs', { params }),

  /**
   * Retrieves user login attempt security logs.
   * Endpoint: GET /api/v1/admin/login-history
   */
  getLoginHistory: (params = {}) => apiClient('/admin/login-history', { params }),

  /**
   * Retrieves system configuration status (email backend, storage backend).
   * Endpoint: GET /api/v1/admin/system
   */
  getSystemStatus: () => apiClient('/admin/system')
};
