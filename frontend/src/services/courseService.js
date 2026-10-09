import { apiClient } from './api';

export const courseService = {
  getCourses: (params) => apiClient('/courses'),
  getCourseById: (id) => apiClient(`/courses/${id}`),
  createCourse: (data) => apiClient('/courses', { method: 'POST', body: data }),
  updateCourse: (id, data) => apiClient(`/courses/${id}`, { method: 'PUT', body: data })
};
