import { apiClient } from './api';

export const progressService = {
  getProgress: (courseId) => apiClient(`/progress/${courseId}`),
  updateLectureProgress: (lectureId, data) => apiClient(`/progress/lecture/${lectureId}`, { method: 'POST', body: data })
};
