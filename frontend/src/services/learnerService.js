/**
 * Learner Service
 * Manages reactive learner state, enrollments, lesson progress,
 * coding evaluations, quiz attempts, assignments, and certificates.
 *
 * Persists locally under 'learnspace_learner_state' and broadcasts
 * custom events for instant cross-component synchronization.
 */

import {
  mockLearnerProfile,
  initialEnrolledCourses,
  mockLearnerCertificates,
  mockWishlistCourses,
  mockUpcomingAssessments
} from '../data/mockLearnerData';
import { mockAssessments } from '../data/mockAssessments';

const LEARNER_STORAGE_KEY = 'learnspace_learner_state';
const LEARNER_EVENT_KEY = 'learnspace_learner_state_updated';

function getStoredState() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      profile: mockLearnerProfile,
      enrolledCourses: initialEnrolledCourses,
      certificates: mockLearnerCertificates,
      wishlist: mockWishlistCourses,
      assessments: mockUpcomingAssessments,
      submissions: {}
    };
  }

  try {
    const raw = localStorage.getItem(LEARNER_STORAGE_KEY);
    if (!raw) {
      const initial = {
        profile: mockLearnerProfile,
        enrolledCourses: initialEnrolledCourses,
        certificates: mockLearnerCertificates,
        wishlist: mockWishlistCourses,
        assessments: mockUpcomingAssessments,
        submissions: {}
      };
      localStorage.setItem(LEARNER_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return {
      profile: mockLearnerProfile,
      enrolledCourses: initialEnrolledCourses,
      certificates: mockLearnerCertificates,
      wishlist: mockWishlistCourses,
      assessments: mockUpcomingAssessments,
      submissions: {}
    };
  }
}

function saveState(state) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(LEARNER_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(LEARNER_EVENT_KEY, { detail: state }));
  } catch {
    // Ignore storage errors in demo
  }
}

export const learnerService = {
  subscribe(callback) {
    if (typeof window === 'undefined') return () => {};
    const handler = () => callback(getStoredState());
    window.addEventListener(LEARNER_EVENT_KEY, handler);
    return () => window.removeEventListener(LEARNER_EVENT_KEY, handler);
  },

  getProfile() {
    return getStoredState().profile;
  },

  updateProfile(updates) {
    const state = getStoredState();
    state.profile = {
      ...state.profile,
      ...updates
    };
    saveState(state);
    return state.profile;
  },

  getEnrolledCourses(filter = 'all') {
    const courses = getStoredState().enrolledCourses || [];
    if (filter === 'completed') {
      return courses.filter(c => c.progressPercent >= 100);
    }
    if (filter === 'in-progress') {
      return courses.filter(c => c.progressPercent < 100);
    }
    return courses;
  },

  getCourseById(courseId) {
    const courses = getStoredState().enrolledCourses || [];
    return courses.find(c => String(c.id) === String(courseId)) || null;
  },

  enrollCourse(course) {
    if (!course || !course.id) return null;
    const state = getStoredState();
    const existing = state.enrolledCourses.find(c => String(c.id) === String(course.id));
    if (existing) return existing;

    const newEnrolled = {
      id: course.id,
      title: course.title,
      description: course.description || 'Master this comprehensive subject with hands-on practice.',
      instructor: course.instructor || 'LearnSpace Faculty',
      instructorTitle: course.instructorTitle || 'Course Instructor',
      category: course.category || 'Technology',
      level: course.level || 'All Levels',
      thumbnail: course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80',
      progressPercent: 0,
      enrolledAt: new Date().toISOString().split('T')[0],
      lastAccessedAt: new Date().toISOString(),
      lastLessonId: 'les-new-1',
      lastLessonTitle: 'Introduction & Course Syllabus',
      totalLessons: course.modulesCount ? course.modulesCount * 3 : 6,
      completedLessonsCount: 0,
      modules: [
        {
          id: `mod-${course.id}-1`,
          title: 'Module 1: Getting Started & Prerequisites',
          lessons: [
            {
              id: `les-${course.id}-1`,
              title: 'Welcome & Curriculum Overview',
              type: 'Video',
              duration: '12 min',
              completed: false,
              videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
              summary: 'Welcome to the course! In this introductory lecture, we outline all learning milestones and required setup tools.'
            },
            {
              id: `les-${course.id}-2`,
              title: 'Foundational Concepts & Architecture',
              type: 'Article',
              duration: '15 min',
              completed: false,
              content: `### Getting Started with ${course.title}\n\nWelcome to your learning journey! In this module, you will build core conceptual foundations.\n\nTake notes using the side panel and test your knowledge as you advance through the curriculum.`
            },
            {
              id: `les-${course.id}-3`,
              title: 'Module 1 Interactive Coding Exercise',
              type: 'Coding Exercise',
              duration: '25 min',
              completed: false,
              starterCode: `# Starter workspace for ${course.title}\ndef solve():\n    return "Ready to learn!"\n\nprint(solve())`,
              testCases: [
                { id: 'tc-gen-1', input: 'solve()', expected: '"Ready to learn!"', description: 'Execution check' }
              ]
            }
          ]
        }
      ]
    };

    state.enrolledCourses.unshift(newEnrolled);
    // Remove from wishlist if present
    state.wishlist = (state.wishlist || []).filter(w => String(w.id) !== String(course.id));
    saveState(state);
    return newEnrolled;
  },

  markLessonCompleted(courseId, lessonId) {
    const state = getStoredState();
    const courseIndex = state.enrolledCourses.findIndex(c => String(c.id) === String(courseId));
    if (courseIndex === -1) return null;

    const course = { ...state.enrolledCourses[courseIndex] };
    let totalLessons = 0;
    let completedCount = 0;

    course.modules = (course.modules || []).map(module => ({
      ...module,
      lessons: (module.lessons || []).map(lesson => {
        totalLessons += 1;
        if (String(lesson.id) === String(lessonId)) {
          const updated = { ...lesson, completed: true };
          completedCount += 1;
          return updated;
        }
        if (lesson.completed) completedCount += 1;
        return lesson;
      })
    }));

    course.completedLessonsCount = completedCount;
    course.totalLessons = Math.max(totalLessons, course.totalLessons || 1);
    course.progressPercent = Math.min(100, Math.round((completedCount / course.totalLessons) * 100));
    course.lastAccessedAt = new Date().toISOString();

    // Check if 100% completed and award certificate
    if (course.progressPercent === 100 && !course.certificateId) {
      const certId = `cert-${Date.now().toString().slice(-6)}`;
      course.certificateId = certId;
      course.completedAt = new Date().toISOString();

      const newCert = {
        id: certId,
        certificateNumber: `LS-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}-${course.category?.slice(0, 3).toUpperCase() || 'STD'}`,
        courseId: course.id,
        courseTitle: course.title,
        instructor: course.instructor,
        instructorTitle: course.instructorTitle || 'Course Instructor',
        organization: 'LearnSpace Institute of Technology',
        recipientName: state.profile.name,
        recipientEmail: state.profile.email,
        issueDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        gradeScore: 96,
        status: 'Verified',
        verificationUrl: `https://learnspace.org/verify/LS-${certId}`,
        skills: [course.category, 'Practical Problem Solving', 'Curriculum Mastery'],
        description: `Successfully completed all modules, lectures, and hands-on laboratory exercises for ${course.title}.`
      };

      state.certificates = [newCert, ...(state.certificates || [])];
      state.profile.stats.completedCourses = (state.profile.stats.completedCourses || 0) + 1;
    }

    state.enrolledCourses[courseIndex] = course;
    saveState(state);
    return course;
  },

  saveLessonNotes(courseId, lessonId, notes) {
    const state = getStoredState();
    const course = state.enrolledCourses.find(c => String(c.id) === String(courseId));
    if (!course) return;

    course.modules?.forEach(module => {
      module.lessons?.forEach(lesson => {
        if (String(lesson.id) === String(lessonId)) {
          lesson.notes = notes;
        }
      });
    });

    saveState(state);
  },

  getQuizById(quizId) {
    const mockFound = mockAssessments.find(a => String(a.id) === String(quizId) && a.type === 'Quiz');
    if (mockFound) return mockFound;

    // Default fallback quiz
    return {
      id: quizId,
      title: 'Course Concept Mastery Quiz',
      type: 'Quiz',
      totalMarks: 100,
      passingScore: 75,
      timeLimitMinutes: 20,
      questions: [
        {
          id: 'q-1',
          prompt: 'What is the primary benefit of automatic differentiation in neural network frameworks?',
          type: 'Multiple Choice',
          points: 25,
          options: [
            'Avoids computing mathematical gradients manually',
            'Decreases model parameter memory footprint',
            'Eliminates the requirement for GPU drivers',
            'Enforces deterministic random seed initialization'
          ],
          correctAnswer: 'Avoids computing mathematical gradients manually',
          explanation: 'Automatic differentiation constructs computational graphs dynamically to calculate gradients via reverse-mode autodiff, eliminating error-prone manual calculus.'
        },
        {
          id: 'q-2',
          prompt: 'PyTorch tensors require contiguous memory layout when applying views or certain reshapes.',
          type: 'True/False',
          points: 25,
          options: ['True', 'False'],
          correctAnswer: 'True',
          explanation: 'Applying stride-based slicing creates non-contiguous tensors. Calling .view() on them requires invoking .contiguous() first.'
        },
        {
          id: 'q-3',
          prompt: 'Which loss function is specifically matched with LogSoftmax for categorical classification?',
          type: 'Multiple Choice',
          points: 25,
          options: [
            'Negative Log-Likelihood Loss (NLLLoss)',
            'Mean Squared Error (MSELoss)',
            'Binary Cross-Entropy (BCELoss)',
            'Huber Loss'
          ],
          correctAnswer: 'Negative Log-Likelihood Loss (NLLLoss)',
          explanation: 'CrossEntropyLoss in PyTorch combines LogSoftmax and NLLLoss into a single numerically stable implementation.'
        },
        {
          id: 'q-4',
          prompt: 'Dropout layers are active during both training and evaluation phases.',
          type: 'True/False',
          points: 25,
          options: ['True', 'False'],
          correctAnswer: 'False',
          explanation: 'Dropout randomly zeroes neuron activations during training for regularization, but is deactivated during model.eval().'
        }
      ]
    };
  },

  submitQuizAttempt(quizId, answers) {
    const quiz = this.getQuizById(quizId);
    let correctCount = 0;
    let earnedPoints = 0;

    const breakdown = (quiz.questions || []).map(q => {
      const selected = answers[q.id];
      const isCorrect = String(selected || '').trim().toLowerCase() === String(q.correctAnswer || '').trim().toLowerCase();
      if (isCorrect) {
        correctCount += 1;
        earnedPoints += q.points || 20;
      }
      return {
        questionId: q.id,
        prompt: q.prompt,
        selected,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation || ''
      };
    });

    const scorePercent = Math.round((earnedPoints / (quiz.totalMarks || 100)) * 100);
    const passed = scorePercent >= (quiz.passingScore || 70);

    const result = {
      quizId,
      scorePercent,
      earnedPoints,
      totalMarks: quiz.totalMarks || 100,
      passed,
      correctCount,
      totalQuestions: quiz.questions?.length || 0,
      breakdown,
      submittedAt: new Date().toISOString()
    };

    const state = getStoredState();
    state.submissions[quizId] = result;
    if (passed) {
      state.profile.stats.totalPoints = (state.profile.stats.totalPoints || 0) + earnedPoints;
    }
    saveState(state);
    return result;
  },

  getAssignmentById(assignmentId) {
    const found = mockAssessments.find(a => String(a.id) === String(assignmentId) && a.type === 'Assignment');
    if (found) return found;

    return {
      id: assignmentId,
      title: 'Production Deployment & Architecture Deliverable',
      courseTitle: 'Kubernetes in Production: Zero to Hero',
      category: 'Cloud Engineering',
      status: 'Published',
      totalMarks: 100,
      passingScore: 70,
      description: 'Implement a complete production manifest or infrastructure bundle following industry best practices.',
      rubric: [
        { criterion: 'Architectural completeness and file hierarchy', points: 30 },
        { criterion: 'Configuration validation and automated checks', points: 30 },
        { criterion: 'Documentation and deployment README instructions', points: 20 },
        { criterion: 'Security configurations and least privilege principles', points: 20 }
      ]
    };
  },

  submitAssignment(assignmentId, submissionData) {
    const state = getStoredState();
    const submission = {
      assignmentId,
      ...submissionData,
      status: 'Submitted',
      submittedAt: new Date().toISOString(),
      grade: null,
      feedback: 'Your submission is queued for faculty grading. Review expected within 48 hours.'
    };

    state.submissions[assignmentId] = submission;
    saveState(state);
    return submission;
  },

  getCertificates() {
    return getStoredState().certificates || [];
  },

  getWishlist() {
    return getStoredState().wishlist || [];
  },

  addToWishlist(course) {
    if (!course || !course.id) return;
    const state = getStoredState();
    if (!state.wishlist.some(w => String(w.id) === String(course.id))) {
      state.wishlist.push({
        id: course.id,
        title: course.title,
        description: course.description,
        instructor: course.instructor,
        category: course.category,
        level: course.level,
        rating: course.rating || 4.8,
        ratingCount: course.ratingCount || 24,
        thumbnail: course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80',
        savedAt: new Date().toISOString().split('T')[0]
      });
      saveState(state);
    }
  },

  removeFromWishlist(courseId) {
    const state = getStoredState();
    state.wishlist = (state.wishlist || []).filter(w => String(w.id) !== String(courseId));
    saveState(state);
  },

  isInWishlist(courseId) {
    const wishlist = getStoredState().wishlist || [];
    return wishlist.some(w => String(w.id) === String(courseId));
  },

  getUpcomingDeadlines() {
    return getStoredState().assessments || [];
  }
};
