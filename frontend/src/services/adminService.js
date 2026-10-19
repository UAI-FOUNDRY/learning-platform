import { apiClient } from './api';
export * from '../utils/courseReviews';

export const adminService = {
  getApprovalsQueue: () => apiClient('/admin/approvals'),
  reviewCourse: (courseId, reviewData) => apiClient(`/admin/courses/${courseId}/review`, { method: 'POST', body: reviewData })
};

