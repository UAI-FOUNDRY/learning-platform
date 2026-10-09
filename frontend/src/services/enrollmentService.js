import { apiClient } from './api';

export const enrollmentService = {
  getEnrollments: () => apiClient('/enrollments'),
  enrollCourse: (courseId) => apiClient('/enrollments', { method: 'POST', body: { course_id: courseId } })
};
