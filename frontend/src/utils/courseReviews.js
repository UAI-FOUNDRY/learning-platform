/**
 * Shared Helper for Admin Course Review Decisions (Dev Session Persistence)
 * Provides consistent access, overlaying, and reactive synchronization for course
 * approval decisions stored in localStorage under 'learnspace_admin_reviews'.
 */

export const REVIEWS_STORAGE_KEY = 'learnspace_admin_reviews';
export const REVIEWS_UPDATED_EVENT = 'learnspace_admin_reviews_updated';

/**
 * Safely reads all review decisions stored in browser localStorage.
 * Handles missing or malformed JSON gracefully.
 */
export function getStoredReviews() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return {};
    }
    const raw = localStorage.getItem(REVIEWS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Safely reads the review decision for a specific course ID.
 */
export function getStoredReview(courseId) {
  if (!courseId) return null;
  const map = getStoredReviews();
  return map[courseId] || null;
}

/**
 * Dispatches an event across the window to notify all mounted subscribers of storage changes.
 */
export function notifyReviewsChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(REVIEWS_UPDATED_EVENT));
  }
}

/**
 * Saves a review decision in localStorage and notifies subscribers.
 */
export function saveStoredReview(courseId, reviewData) {
  if (!courseId) return;
  try {
    const map = getStoredReviews();
    map[courseId] = reviewData;
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(map));
    notifyReviewsChanged();
  } catch {
    // Ignore storage quota errors in dev mode
  }
}

/**
 * Removes a specific course review decision from localStorage and notifies subscribers.
 */
export function deleteStoredReview(courseId) {
  if (!courseId) return;
  try {
    const map = getStoredReviews();
    if (courseId in map) {
      delete map[courseId];
      localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(map));
      notifyReviewsChanged();
    }
  } catch {
    // Ignore errors in dev mode
  }
}

/**
 * Clears all stored reviews from localStorage and notifies subscribers.
 */
export function clearStoredReviews() {
  try {
    localStorage.removeItem(REVIEWS_STORAGE_KEY);
    notifyReviewsChanged();
  } catch {
    // Ignore errors in dev mode
  }
}

/**
 * Subscribes a callback to review updates (both same-tab CustomEvent and cross-tab StorageEvent).
 * Returns an unsubscribe cleanup function.
 */
export function subscribeToReviewUpdates(callback) {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = () => {
    callback(getStoredReviews());
  };

  const handleStorageEvent = (event) => {
    if (!event || event.key === REVIEWS_STORAGE_KEY) {
      callback(getStoredReviews());
    }
  };

  window.addEventListener(REVIEWS_UPDATED_EVENT, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(REVIEWS_UPDATED_EVENT, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}

/**
 * Resolves a course's current status given its original record and any saved review decision.
 * Mapping rules:
 * - Approved / Published -> 'Published'
 * - Changes Requested / Rejected / Reject -> 'Changes Requested'
 * - Pending Review / Pending -> 'Pending Review'
 * - No saved decision -> retain original course status
 */
export function resolveCourseStatus(course, review) {
  if (!review) {
    return course?.status || 'Pending Review';
  }

  const decision = (review.decision || '').trim().toLowerCase();
  const status = (review.status || '').trim().toLowerCase();

  if (decision === 'approved' || status === 'approved' || status === 'published') {
    return 'Published';
  }

  if (
    decision === 'changes requested' ||
    decision === 'rejected' ||
    decision === 'reject' ||
    status === 'changes requested' ||
    status === 'rejected'
  ) {
    return 'Changes Requested';
  }

  if (decision === 'pending review' || decision === 'pending' || status === 'pending review' || status === 'pending') {
    return 'Pending Review';
  }

  return review.status || course?.status || 'Pending Review';
}

/**
 * Non-destructively overlays a saved review decision onto a course record.
 * Preserves all original mock properties and metadata.
 */
export function applyCourseReview(course, review) {
  if (!course) return course;
  if (!review) return course;

  const resolvedStatus = resolveCourseStatus(course, review);
  return {
    ...course,
    status: resolvedStatus,
    reviewDecision: review.decision,
    reviewFeedback: review.feedback,
    reviewedAt: review.timestamp
  };
}

/**
 * Maps an array of courses, overlaying any matching stored review by exact ID.
 */
export function applyCourseReviews(courses, reviewsMap) {
  if (!Array.isArray(courses)) return [];
  const map = reviewsMap && typeof reviewsMap === 'object' ? reviewsMap : getStoredReviews();
  return courses.map(course => applyCourseReview(course, map[course.id]));
}
