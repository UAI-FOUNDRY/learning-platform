import { apiClient } from './api';
import { mockOrganizations } from '../data/mockOrganizations';

export const ORGANIZATIONS_STORAGE_KEY = 'learnspace_admin_organizations';
export const ORGANIZATIONS_UPDATED_EVENT = 'learnspace_admin_organizations_updated';

/**
 * Reads local development session organization overrides from localStorage.
 * Format: { added: Organization[], updated: Record<string, Partial<Organization>>, deleted: string[] }
 */
export function getStoredOrganizationsState() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { added: [], updated: {}, deleted: [] };
    }
    const raw = localStorage.getItem(ORGANIZATIONS_STORAGE_KEY);
    if (!raw) return { added: [], updated: {}, deleted: [] };
    const parsed = JSON.parse(raw);
    return {
      added: Array.isArray(parsed?.added) ? parsed.added : [],
      updated: parsed?.updated && typeof parsed.updated === 'object' ? parsed.updated : {},
      deleted: Array.isArray(parsed?.deleted) ? parsed.deleted : []
    };
  } catch {
    return { added: [], updated: {}, deleted: [] };
  }
}

/**
 * Saves the current organization overrides state to localStorage and dispatches an update event.
 */
function saveStoredOrganizationsState(state) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(ORGANIZATIONS_STORAGE_KEY, JSON.stringify(state));
      notifyOrganizationUpdates();
    }
  } catch {
    // Ignore quota errors in development mode
  }
}

/**
 * Dispatches an event across the window to notify all mounted subscribers of organization changes.
 */
export function notifyOrganizationUpdates() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ORGANIZATIONS_UPDATED_EVENT));
  }
}

/**
 * Clears all organization overrides and restores the default mock organizations.
 */
export function clearStoredOrganizations() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(ORGANIZATIONS_STORAGE_KEY);
      notifyOrganizationUpdates();
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Subscribes a callback to organization updates (both same-tab CustomEvent and cross-tab StorageEvent).
 */
export function subscribeToOrganizationUpdates(callback) {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = () => {
    callback(getStoredOrganizationsState());
  };

  const handleStorageEvent = (event) => {
    if (!event || event.key === ORGANIZATIONS_STORAGE_KEY) {
      callback(getStoredOrganizationsState());
    }
  };

  window.addEventListener(ORGANIZATIONS_UPDATED_EVENT, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(ORGANIZATIONS_UPDATED_EVENT, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}

/**
 * Applies added, updated, and deleted organization session overrides to an array of base organizations.
 */
export function applyOrganizationOverrides(baseOrganizations = mockOrganizations, overrides = getStoredOrganizationsState()) {
  const { added = [], updated = {}, deleted = [] } = overrides || {};
  const deletedSet = new Set(deleted);

  // 1. Filter out deleted base organizations and apply updates
  const modifiedBase = (baseOrganizations || [])
    .filter(org => !deletedSet.has(org.id))
    .map(org => {
      const patch = updated[org.id];
      return patch ? { ...org, ...patch } : org;
    });

  // 2. Filter deleted out of newly added, apply updates to newly added
  const modifiedAdded = (added || [])
    .filter(org => !deletedSet.has(org.id))
    .map(org => {
      const patch = updated[org.id];
      return patch ? { ...org, ...patch } : org;
    });

  // Return combined list with newly added organizations prepended
  return [...modifiedAdded, ...modifiedBase];
}

/**
 * Generates an alphanumeric hyphenated URL slug from organization name.
 */
export function generateOrganizationSlug(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const organizationService = {
  /**
   * Lists organizations for Super Admin.
   * Endpoint: GET /api/v1/organizations (params: search, org_type, status, page, limit)
   */
  async getOrganizations(params = {}) {
    try {
      const data = await apiClient('/organizations', { params });
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.organizations)
        ? data.organizations
        : null;

      if (list && list.length > 0) {
        return { items: list, isSample: false, total: data?.total || list.length };
      }
      return { items: mockOrganizations, isSample: true, total: mockOrganizations.length };
    } catch {
      return { items: mockOrganizations, isSample: true, total: mockOrganizations.length };
    }
  },

  /**
   * Retrieves organization details.
   * Endpoint: GET /api/v1/organizations/{id}
   */
  async getOrganizationById(id) {
    try {
      const data = await apiClient(`/organizations/${id}`);
      if (data && data.id) {
        return { organization: data, isSample: false };
      }
    } catch {
      // Fallback to local session
    }
    const currentList = applyOrganizationOverrides(mockOrganizations, getStoredOrganizationsState());
    const found = currentList.find(o => o.id === id);
    return { organization: found || null, isSample: true };
  },

  /**
   * Creates a new organization with development session persistence fallback.
   * Endpoint: POST /api/v1/organizations
   */
  async createOrganization(data) {
    const newOrg = {
      id: `org-${Date.now()}`,
      name: data.name || 'New Organization',
      slug: data.slug || generateOrganizationSlug(data.name || 'org'),
      orgType: data.orgType || 'University',
      status: data.status || 'Active',
      domain: data.domain || '',
      contactEmail: data.contactEmail || '',
      contactPhone: data.contactPhone || '',
      adminName: data.adminName || 'Admin Coordinator',
      icon: data.icon || '🏛️',
      description: data.description || '',
      memberCount: Number(data.memberCount) || 0,
      courseCount: Number(data.courseCount) || 0,
      subscriptionTier: data.subscriptionTier || 'Standard',
      location: data.location || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await apiClient('/organizations', { method: 'POST', body: data });
    } catch {
      // Backend not yet ready, graceful development fallback
    }

    // Persist to session storage
    const state = getStoredOrganizationsState();
    state.added = [newOrg, ...state.added];
    saveStoredOrganizationsState(state);

    return { organization: newOrg, success: true };
  },

  /**
   * Updates organization details with development session persistence fallback.
   * Endpoint: PUT /api/v1/organizations/{id}
   */
  async updateOrganization(id, data) {
    try {
      await apiClient(`/organizations/${id}`, { method: 'PUT', body: data });
    } catch {
      // Backend fallback
    }

    const state = getStoredOrganizationsState();
    const existingPatch = state.updated[id] || {};
    state.updated[id] = {
      ...existingPatch,
      ...data,
      updatedAt: new Date().toISOString()
    };

    saveStoredOrganizationsState(state);
    return { success: true };
  },

  /**
   * Deletes an organization with development session persistence fallback.
   * Endpoint: DELETE /api/v1/organizations/{id}
   */
  async deleteOrganization(id) {
    try {
      await apiClient(`/organizations/${id}`, { method: 'DELETE' });
    } catch {
      // Backend fallback
    }

    const state = getStoredOrganizationsState();
    if (!state.deleted.includes(id)) {
      state.deleted = [...state.deleted, id];
    }
    // Also remove from added if created this session
    state.added = state.added.filter(org => org.id !== id);
    delete state.updated[id];

    saveStoredOrganizationsState(state);
    return { success: true };
  },

  /**
   * Retrieves organization statistics.
   * Endpoint: GET /api/v1/organizations/{id}/stats
   */
  async getOrganizationStats(id) {
    try {
      return await apiClient(`/organizations/${id}/stats`);
    } catch {
      return {
        totalMembers: 120,
        activeCourses: 5,
        completionRate: '78%'
      };
    }
  },

  /**
   * Lists members of an organization.
   * Endpoint: GET /api/v1/organizations/{id}/members
   */
  async getMembers(id, params = {}) {
    try {
      return await apiClient(`/organizations/${id}/members`, { params });
    } catch {
      return { items: [], total: 0 };
    }
  },

  /**
   * Adds a member to an organization.
   * Endpoint: POST /api/v1/organizations/{id}/members
   */
  addMember: (id, memberData) => apiClient(`/organizations/${id}/members`, { method: 'POST', body: memberData }),

  /**
   * Lists courses linked to an organization.
   * Endpoint: GET /api/v1/organizations/{id}/courses
   */
  getCourses: (id) => apiClient(`/organizations/${id}/courses`)
};
