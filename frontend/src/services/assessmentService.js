import { mockAssessments } from '../data/mockAssessments.js';
import { recordAuditEvent } from './activityLogService';

export const ASSESSMENTS_STORAGE_KEY = 'learnspace_admin_assessments';
export const ASSESSMENTS_UPDATED_EVENT = 'learnspace_admin_assessments_updated';

/**
 * Reads local assessment status overrides from localStorage.
 * Format: { updated: Record<string, Partial<Assessment>> }
 */
export function getStoredAssessmentsOverrides() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { updated: {} };
    }
    const raw = localStorage.getItem(ASSESSMENTS_STORAGE_KEY);
    if (!raw) return { updated: {} };
    const parsed = JSON.parse(raw);
    return {
      updated: parsed?.updated && typeof parsed.updated === 'object' ? parsed.updated : {}
    };
  } catch {
    return { updated: {} };
  }
}

/**
 * Saves assessment overrides to localStorage and notifies subscribers.
 */
export function saveStoredAssessmentsOverrides(overrides) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(ASSESSMENTS_STORAGE_KEY, JSON.stringify(overrides));
      notifyAssessmentUpdates();
    }
  } catch {
    // Ignore storage quota errors in dev mode
  }
}

/**
 * Clears stored overrides from localStorage.
 */
export function clearStoredAssessmentsOverrides() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(ASSESSMENTS_STORAGE_KEY);
      notifyAssessmentUpdates();
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Dispatches an event across the window for same-tab subscribers.
 */
export function notifyAssessmentUpdates() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ASSESSMENTS_UPDATED_EVENT));
  }
}

/**
 * Subscribes a callback to assessment changes (same-tab CustomEvent and cross-tab StorageEvent).
 */
export function subscribeToAssessmentUpdates(callback) {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = () => {
    callback(getStoredAssessmentsOverrides());
  };

  const handleStorageEvent = (event) => {
    if (!event || event.key === ASSESSMENTS_STORAGE_KEY) {
      callback(getStoredAssessmentsOverrides());
    }
  };

  window.addEventListener(ASSESSMENTS_UPDATED_EVENT, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(ASSESSMENTS_UPDATED_EVENT, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}

/**
 * Applies local storage status overrides to base mock assessments.
 */
export function applyAssessmentOverrides(baseList = mockAssessments, overrides = getStoredAssessmentsOverrides()) {
  const { updated = {} } = overrides || {};
  return (baseList || []).map((item) => {
    if (updated[item.id]) {
      return { ...item, ...updated[item.id] };
    }
    return item;
  });
}

export const assessmentService = {
  /**
   * Retrieves paginated, filtered, and sorted assessments.
   */
  async getAssessments(params = {}) {
    const {
      search = '',
      type = 'all',
      status = 'all',
      sortBy = 'updatedAt',
      sortOrder = 'desc',
      page = 1,
      limit = 8
    } = params;

    // Simulate async network latency
    await new Promise((resolve) => setTimeout(resolve, 80));

    const all = applyAssessmentOverrides(mockAssessments);

    // Filter
    let filtered = all.filter((item) => {
      // Search filter
      if (search && search.trim()) {
        const query = search.trim().toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesCourse = item.courseTitle.toLowerCase().includes(query);
        const matchesInstructor = item.instructor.toLowerCase().includes(query);
        const matchesCategory = (item.category || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesCourse && !matchesInstructor && !matchesCategory) {
          return false;
        }
      }

      // Type filter
      if (type && type !== 'all' && item.type.toLowerCase() !== type.toLowerCase()) {
        return false;
      }

      // Status filter
      if (status && status !== 'all' && item.status.toLowerCase() !== status.toLowerCase()) {
        return false;
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toLowerCase();
        const comp = valA.localeCompare(valB);
        return sortOrder === 'desc' ? -comp : comp;
      }

      if (typeof valA === 'number') {
        const comp = valA - (valB || 0);
        return sortOrder === 'desc' ? -comp : comp;
      }

      return 0;
    });

    // Compute KPIs across all assessments
    const totalCount = all.length;
    const quizzesCount = all.filter((i) => i.type === 'Quiz').length;
    const assignmentsCount = all.filter((i) => i.type === 'Assignment').length;
    const publishedCount = all.filter((i) => i.status === 'Published').length;
    const archivedCount = all.filter((i) => i.status === 'Archived').length;

    // Pagination
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const safePage = Math.max(1, Math.min(page, totalPages));
    const offset = (safePage - 1) * limit;
    const items = filtered.slice(offset, offset + limit);

    return {
      items,
      total,
      page: safePage,
      limit,
      totalPages,
      kpis: {
        total: totalCount,
        quizzes: quizzesCount,
        assignments: assignmentsCount,
        published: publishedCount,
        archived: archivedCount
      },
      isSimulated: true
    };
  },

  /**
   * Retrieves single assessment by ID with complete blueprint questions / tasks.
   */
  async getAssessmentById(id) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    const all = applyAssessmentOverrides(mockAssessments);
    const item = all.find((a) => a.id === id);
    if (!item) {
      throw new Error(`Assessment with ID "${id}" was not found.`);
    }
    return item;
  },

  /**
   * Updates an assessment's status (Published, Draft, Archived).
   */
  async updateAssessmentStatus(id, newStatus) {
    await new Promise((resolve) => setTimeout(resolve, 60));
    const currentOverrides = getStoredAssessmentsOverrides();
    const existingUpdate = currentOverrides.updated[id] || {};

    const updatedRecord = {
      ...existingUpdate,
      status: newStatus,
      updatedAt: new Date().toISOString()
    };

    currentOverrides.updated[id] = updatedRecord;
    saveStoredAssessmentsOverrides(currentOverrides);

    // Audit log integration (best-effort)
    try {
      const isArchived = newStatus === 'Archived';
      recordAuditEvent({
        action: isArchived ? 'assessment.archived' : 'assessment.published',
        category: 'assessments',
        target: {
          type: 'Assessment',
          id,
          name: `Assessment #${id}`
        },
        description: `Assessment status updated to "${newStatus}" by Super Admin.`,
        status: isArchived ? 'info' : 'success',
        changes: { status: newStatus }
      });
    } catch {
      // Best-effort
    }

    return {
      success: true,
      id,
      status: newStatus
    };
  },

  /**
   * Archives an assessment.
   */
  async archiveAssessment(id) {
    return this.updateAssessmentStatus(id, 'Archived');
  },

  /**
   * Restores an archived assessment to Published (or Draft).
   */
  async restoreAssessment(id, targetStatus = 'Published') {
    return this.updateAssessmentStatus(id, targetStatus);
  }
};
