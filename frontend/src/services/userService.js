import { apiClient } from './api';
import { mockUsers } from '../data/mockUsers';

export const USERS_STORAGE_KEY = 'learnspace_admin_users';
export const USERS_UPDATED_EVENT = 'learnspace_admin_users_updated';

/**
 * Safely reads all user overrides saved in development session storage.
 */
export function getStoredUserOverrides() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return {};
    }
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Saves a user status update override to development session storage and notifies subscribers.
 */
export function saveStoredUserOverride(userId, data) {
  if (!userId) return;
  try {
    const map = getStoredUserOverrides();
    map[userId] = {
      ...(map[userId] || {}),
      ...data,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(map));
    notifyUserUpdates();
  } catch {
    // Ignore quota errors in dev mode
  }
}

/**
 * Clears all user session overrides.
 */
export function clearStoredUserOverrides() {
  try {
    localStorage.removeItem(USERS_STORAGE_KEY);
    notifyUserUpdates();
  } catch {
    // Ignore errors
  }
}

/**
 * Dispatches an event across the window to notify all mounted subscribers of user changes.
 */
function notifyUserUpdates() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(USERS_UPDATED_EVENT));
  }
}

/**
 * Subscribes a callback to user updates (both same-tab CustomEvent and cross-tab StorageEvent).
 */
export function subscribeToUserUpdates(callback) {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = () => {
    callback(getStoredUserOverrides());
  };

  const handleStorageEvent = (event) => {
    if (!event || event.key === USERS_STORAGE_KEY) {
      callback(getStoredUserOverrides());
    }
  };

  window.addEventListener(USERS_UPDATED_EVENT, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(USERS_UPDATED_EVENT, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}

/**
 * Non-destructively overlays saved session modifications onto an array of user records.
 */
export function applyUserOverrides(users, overridesMap) {
  if (!Array.isArray(users)) return [];
  const map = overridesMap && typeof overridesMap === 'object' ? overridesMap : getStoredUserOverrides();
  return users.map(user => {
    const override = map[user.id];
    if (!override) return user;
    return {
      ...user,
      ...override,
      status: override.status || user.status
    };
  });
}

export const userService = {
  /**
   * Retrieves authenticated user's profile.
   * Endpoint: GET /api/v1/users/me
   */
  getProfile: () => apiClient('/users/me'),

  /**
   * Updates authenticated user's own profile (full_name).
   * Endpoint: PUT /api/v1/users/me
   */
  updateProfile: (data) => apiClient('/users/me', { method: 'PUT', body: data }),

  /**
   * Retrieves user catalog with graceful development fallback to mockUsers.
   * Endpoint: GET /api/v1/users (query params: search, role, page, limit)
   */
  async getUsers(params = {}) {
    try {
      const data = await apiClient('/users', { params });
      // Backend returns UserListResponse: { users: UserResponse[], total, page, limit, total_pages }
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.users)
        ? data.users
        : Array.isArray(data?.items)
        ? data.items
        : null;

      if (list && list.length > 0) {
        return { items: list, isSample: false, total: data?.total || list.length };
      }
      return { items: mockUsers, isSample: true };
    } catch {
      return { items: mockUsers, isSample: true };
    }
  },

  /**
   * Retrieves single user details with mock fallback.
   * Endpoint: GET /api/v1/users/{id}
   */
  async getUserById(id) {
    try {
      const data = await apiClient(`/users/${id}`);
      if (data && data.id) {
        return { user: data, isSample: false };
      }
    } catch {
      // fallback
    }
    const found = mockUsers.find(u => u.id === id);
    return { user: found || null, isSample: true };
  },

  /**
   * Updates user status or role with development fallback persistence.
   * Endpoint: PUT /api/v1/users/{id} (body: AdminUserUpdate { status: 'active' | 'inactive' | 'suspended' })
   */
  async updateUserStatus(id, newStatus, reason = '') {
    const normalizedStatus = (newStatus || '').toLowerCase();
    try {
      await apiClient(`/users/${id}`, {
        method: 'PUT',
        body: { status: normalizedStatus }
      });
    } catch {
      // Backend endpoint fallback: simulate successful local decision
    }

    // Persist to development session storage
    saveStoredUserOverride(id, { status: newStatus, statusReason: reason });
    return { success: true, status: newStatus };
  },

  /**
   * Deletes a user safely.
   * Endpoint: DELETE /api/v1/users/{id}
   */
  async deleteUser(id) {
    return apiClient(`/users/${id}`, { method: 'DELETE' });
  }
};
