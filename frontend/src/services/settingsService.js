import { apiClient } from './api';

export const SETTINGS_STORAGE_KEY = 'learnspace_admin_settings';
export const SETTINGS_UPDATED_EVENT = 'learnspace_admin_settings_updated';

/**
 * Standard default platform settings matching backend schema and platform conventions.
 */
export const defaultPlatformSettings = {
  // General platform settings
  'general.platform_name': 'LearnSpace',
  'general.platform_description': 'Learn, practice, code and get certified on the modern open learning platform.',
  'general.support_email': 'support@learnspace.org',
  'general.default_language': 'en',
  'general.default_timezone': 'UTC',
  'general.allow_public_registration': true,
  'general.allow_instructor_self_signup': true,

  // Notifications
  'notifications.course_approval_submissions': true,
  'notifications.user_registrations': true,
  'notifications.moderation_alerts': true,
  'notifications.system_announcements': true,
  'notifications.email_enabled': false,

  // Maintenance & System
  'system.maintenance_mode': false,
  'system.maintenance_message': 'LearnSpace is undergoing scheduled platform maintenance. Please check back shortly.'
};

/**
 * Reads local settings overrides from localStorage.
 */
export function getStoredSettings() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return {};
    }
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

import { recordAuditEvent } from './activityLogService';

/**
 * Saves settings overrides to localStorage and notifies active listeners.
 */
export function saveStoredSettings(values) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const current = getStoredSettings();
      const updated = { ...current, ...values };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      notifySettingsUpdates();

      // Audit log integration (best-effort)
      try {
        const isMaintenance = values && ('system.maintenance_mode' in values);
        recordAuditEvent({
          action: isMaintenance ? 'platform_settings.maintenance_toggled' : 'platform_settings.updated',
          category: 'settings',
          target: {
            type: 'Platform Settings',
            id: isMaintenance ? 'cfg_maintenance_mode' : 'cfg_general_settings',
            name: isMaintenance ? 'System Maintenance State' : 'Platform Configuration'
          },
          description: isMaintenance
            ? `Maintenance mode ${values['system.maintenance_mode'] ? 'enabled' : 'disabled'} by Super Admin.`
            : `Updated ${Object.keys(values || {}).length} platform setting parameters.`,
          status: 'success',
          changes: values
        });
      } catch {
        // Best-effort
      }

      return updated;
    }
  } catch {
    // Ignore storage quota errors in dev mode
  }
  return values;
}

/**
 * Clears local settings overrides from localStorage.
 */
export function clearStoredSettings() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
      notifySettingsUpdates();
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Dispatches a custom window event for settings synchronization within the current tab.
 */
export function notifySettingsUpdates() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SETTINGS_UPDATED_EVENT));
  }
}

/**
 * Subscribes a listener callback to settings changes (both same-tab CustomEvent and cross-tab StorageEvent).
 */
export function subscribeToSettingsUpdates(callback) {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = () => {
    callback(getStoredSettings());
  };

  const handleStorageEvent = (event) => {
    if (!event || event.key === SETTINGS_STORAGE_KEY) {
      callback(getStoredSettings());
    }
  };

  window.addEventListener(SETTINGS_UPDATED_EVENT, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(SETTINGS_UPDATED_EVENT, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}

export const settingsService = {
  /**
   * Retrieves platform settings.
   * Endpoint: GET /api/v1/settings (query: category)
   */
  getSettings: (params = {}) => apiClient('/settings', { params }),

  /**
   * Updates multiple settings at once.
   * Endpoint: PUT /api/v1/settings
   * Body: { values: Record<string, any> }
   */
  updateSettings: (values) => apiClient('/settings', { method: 'PUT', body: { values } }),

  /**
   * Updates a single setting by key.
   * Endpoint: PUT /api/v1/settings/{key}
   */
  updateSetting: (key, value) => apiClient(`/settings/${key}`, { method: 'PUT', body: { value } }),

  /**
   * Retrieves public settings safe for visitors.
   * Endpoint: GET /api/v1/settings/public
   */
  getPublicSettings: () => apiClient('/settings/public'),

  /**
   * Fetches all platform settings with fallback to defaults and localStorage overrides.
   * Returns: { settings: Record<string, any>, isLiveBackend: boolean }
   */
  async fetchAllSettings() {
    const localOverrides = getStoredSettings();
    const backendSettings = {};
    let isLiveBackend = false;

    try {
      const res = await apiClient('/settings');
      if (Array.isArray(res)) {
        res.forEach(item => {
          if (item?.key) {
            backendSettings[item.key] = item.value;
          }
        });
        isLiveBackend = true;
      }
    } catch {
      // Backend is offline or mock mode
      isLiveBackend = false;
    }

    const merged = {
      ...defaultPlatformSettings,
      ...backendSettings,
      ...localOverrides
    };

    return {
      settings: merged,
      isLiveBackend
    };
  },

  /**
   * Saves settings changes to backend if reachable and saves to localStorage.
   */
  async saveAllSettings(values) {
    let isLiveBackend = false;

    // Try backend update first
    try {
      await apiClient('/settings', {
        method: 'PUT',
        body: { values }
      });
      isLiveBackend = true;
    } catch {
      // Fallback to simulated offline/local mode
      isLiveBackend = false;
    }

    // Always persist to localStorage for cross-tab and reload durability
    const updated = saveStoredSettings(values);

    return {
      success: true,
      isLiveBackend,
      settings: { ...defaultPlatformSettings, ...updated }
    };
  },

  /**
   * Retrieves system configuration status (storage and email backends).
   * Safe: returns verified or honest unverified status without exposing secrets.
   */
  async getSystemStatus() {
    try {
      const data = await apiClient('/admin/system');
      if (data && typeof data === 'object' && (data.storage || data.email)) {
        return {
          isVerified: true,
          email: data.email || null,
          storage: data.storage || null
        };
      }
    } catch {
      // Backend not running or unreachable
    }

    return {
      isVerified: false,
      email: null,
      storage: null
    };
  }
};
