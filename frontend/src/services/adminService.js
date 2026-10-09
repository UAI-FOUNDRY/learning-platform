import { apiClient } from './api';

export const adminService = {
  getApprovalsQueue: () => apiClient('/admin/approvals'),
  reviewCourse: (courseId, reviewData) => apiClient(`/admin/courses/${courseId}/review`, { method: 'POST', body: reviewData })
};
