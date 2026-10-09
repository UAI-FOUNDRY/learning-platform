import { apiClient } from './api';

export const quizService = {
  getQuiz: (quizId) => apiClient(`/quizzes/${quizId}`),
  submitQuizAttempt: (quizId, answers) => apiClient(`/quizzes/${quizId}/attempt`, { method: 'POST', body: { answers } })
};
