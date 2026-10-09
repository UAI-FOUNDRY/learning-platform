import { apiClient } from './api';

export const assignmentService = {
  getAssignment: (id) => apiClient(`/assignments/${id}`),
  submitAssignment: (id, submission) => apiClient(`/assignments/${id}/submit`, { method: 'POST', body: submission })
};
