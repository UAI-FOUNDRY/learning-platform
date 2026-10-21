/**
 * Instructor Course Service
 * Provides full course management, curriculum organization, and submission workflow
 * for the Instructor Portal.
 *
 * Persists instructor courses locally in localStorage under 'learnspace_instructor_courses'
 * and seamlessly synchronizes with Super Admin review decisions via 'learnspace_admin_reviews'.
 */

import {
  mockInstructorProfile,
  initialInstructorCourses,
  mockLearnerStats,
  mockRecentActivity
} from '../data/mockInstructorData';
import { getStoredReview, saveStoredReview } from '../utils/courseReviews';

const INSTRUCTOR_COURSES_KEY = 'learnspace_instructor_courses';
const INSTRUCTOR_UPDATED_EVENT = 'learnspace_instructor_courses_updated';

function safeGetStoredCourses() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return initialInstructorCourses;
  }
  try {
    const raw = localStorage.getItem(INSTRUCTOR_COURSES_KEY);
    if (!raw) {
      localStorage.setItem(INSTRUCTOR_COURSES_KEY, JSON.stringify(initialInstructorCourses));
      return initialInstructorCourses;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : initialInstructorCourses;
  } catch {
    return initialInstructorCourses;
  }
}

function safeSaveCourses(courses) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(INSTRUCTOR_COURSES_KEY, JSON.stringify(courses));
    window.dispatchEvent(new CustomEvent(INSTRUCTOR_UPDATED_EVENT));
  } catch {
    // Ignore storage quota limits in demo mode
  }
}

function overlayAdminReview(course) {
  if (!course) return null;
  const adminReview = getStoredReview(course.id);
  if (!adminReview) return course;

  const decision = (adminReview.decision || adminReview.status || '').trim().toLowerCase();
  let updatedStatus = course.status;
  let feedback = course.feedback || '';

  if (decision === 'approved' || decision === 'published') {
    updatedStatus = 'Published';
    feedback = '';
  } else if (decision.includes('change') || decision.includes('reject')) {
    updatedStatus = 'Changes Requested';
    if (adminReview.comments || adminReview.feedback) {
      feedback = adminReview.comments || adminReview.feedback;
    }
  } else if (decision.includes('pending')) {
    updatedStatus = 'Pending Review';
  }

  return {
    ...course,
    status: updatedStatus,
    feedback: feedback || course.feedback
  };
}

export const instructorCourseService = {
  getProfile() {
    return { ...mockInstructorProfile };
  },

  getCourses(filters = {}) {
    const courses = safeGetStoredCourses().map(overlayAdminReview);
    const { search = '', status = 'all', category = 'all', sort = 'newest' } = filters;

    let filtered = [...courses];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(q) ||
        course.category.toLowerCase().includes(q) ||
        (course.description && course.description.toLowerCase().includes(q))
      );
    }

    if (status && status !== 'all') {
      filtered = filtered.filter(course => course.status.toLowerCase() === status.toLowerCase());
    }

    if (category && category !== 'all') {
      filtered = filtered.filter(course => course.category.toLowerCase() === category.toLowerCase());
    }

    if (sort === 'students') {
      filtered.sort((a, b) => (b.enrolledCount || 0) - (a.enrolledCount || 0));
    } else if (sort === 'rating') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'title') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      // Default: newest first
      filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    return filtered;
  },

  getCourse(id) {
    if (!id) return null;
    const courses = safeGetStoredCourses();
    const course = courses.find(c => String(c.id) === String(id));
    return overlayAdminReview(course);
  },

  createCourse(courseData) {
    const courses = safeGetStoredCourses();
    const newCourse = {
      id: `crs-inst-${Date.now()}`,
      title: (courseData.title || 'Untitled Course').trim(),
      description: (courseData.description || '').trim(),
      category: courseData.category || 'Software Engineering',
      level: courseData.level || 'Beginner',
      language: courseData.language || 'English',
      status: courseData.status || 'Draft',
      enrolledCount: 0,
      rating: 0,
      ratingCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      thumbnail: courseData.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80',
      learningObjectives: Array.isArray(courseData.learningObjectives) ? courseData.learningObjectives : [],
      prerequisites: Array.isArray(courseData.prerequisites) ? courseData.prerequisites : [],
      modules: Array.isArray(courseData.modules) && courseData.modules.length > 0 ? courseData.modules : [
        {
          id: `mod-${Date.now()}-1`,
          title: 'Module 1: Introduction & Fundamentals',
          lessons: [
            { id: `les-${Date.now()}-1`, title: 'Welcome and Course Overview', type: 'Video', duration: '10 min' }
          ]
        }
      ]
    };

    if (newCourse.status === 'Pending Review') {
      newCourse.submittedAt = new Date().toISOString();
    }

    const updatedList = [newCourse, ...courses];
    safeSaveCourses(updatedList);
    return newCourse;
  },

  updateCourse(id, changes) {
    const courses = safeGetStoredCourses();
    let updatedCourse = null;

    const nextCourses = courses.map(course => {
      if (String(course.id) === String(id)) {
        updatedCourse = {
          ...course,
          ...changes,
          updatedAt: new Date().toISOString()
        };
        return updatedCourse;
      }
      return course;
    });

    if (updatedCourse) {
      safeSaveCourses(nextCourses);
      return overlayAdminReview(updatedCourse);
    }
    return null;
  },

  deleteCourse(id) {
    const courses = safeGetStoredCourses();
    const filtered = courses.filter(c => String(c.id) !== String(id));
    safeSaveCourses(filtered);
    return true;
  },

  submitForReview(id) {
    const course = this.getCourse(id);
    if (!course) return null;

    const changes = {
      status: 'Pending Review',
      submittedAt: new Date().toISOString(),
      feedback: ''
    };

    // Update locally
    const updated = this.updateCourse(id, changes);

    // Synchronize review storage so Super Admin sees it as Pending Review
    try {
      saveStoredReview(id, {
        decision: 'Pending Review',
        status: 'Pending Review',
        feedback: '',
        comments: '',
        reviewedAt: new Date().toISOString()
      });
    } catch {
      // Ignore in demo
    }

    return updated;
  },

  getDashboardStats() {
    const courses = safeGetStoredCourses().map(overlayAdminReview);

    const totalCourses = courses.length;
    const publishedCourses = courses.filter(c => c.status === 'Published').length;
    const draftCourses = courses.filter(c => c.status === 'Draft').length;
    const pendingCourses = courses.filter(c => c.status === 'Pending Review').length;
    const changesRequested = courses.filter(c => c.status === 'Changes Requested').length;
    const awaitingApproval = pendingCourses + changesRequested;

    const totalStudents = courses.reduce((sum, c) => sum + (c.enrolledCount || 0), 0);
    const publishedList = courses.filter(c => c.status === 'Published' && c.rating > 0);
    const averageRating = publishedList.length > 0
      ? (publishedList.reduce((sum, c) => sum + c.rating, 0) / publishedList.length).toFixed(2)
      : mockLearnerStats.averageRating;

    return {
      totalCourses,
      publishedCourses,
      draftCourses,
      pendingCourses,
      changesRequested,
      awaitingApproval,
      totalStudents: totalStudents || mockLearnerStats.totalStudents,
      averageRating,
      totalRatingsCount: mockLearnerStats.totalRatingsCount,
      completionRate: mockLearnerStats.completionRate,
      activeInquiries: mockLearnerStats.activeInquiries,
      recentActivity: mockRecentActivity,
      monthlyEnrollments: mockLearnerStats.monthlyEnrollments,
      coursesNeedingAttention: courses.filter(c => c.status === 'Changes Requested' || c.status === 'Pending Review')
    };
  },

  subscribe(callback) {
    if (typeof window === 'undefined') return () => {};
    const handleUpdate = () => callback();
    window.addEventListener(INSTRUCTOR_UPDATED_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener(INSTRUCTOR_UPDATED_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  },

  resetToDefault() {
    safeSaveCourses(initialInstructorCourses);
  }
};
