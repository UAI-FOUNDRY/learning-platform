import { apiClient } from './api';

export const NOTIFICATIONS_STORAGE_KEY = 'learnspace_admin_notifications_state';
export const NOTIFICATIONS_UPDATED_EVENT = 'learnspace_admin_notifications_updated';

/**
 * Baseline notifications preserving the existing Navbar notifications and providing
 * realistic items for complete unread and read status filtering.
 */
export const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif-1',
    type: 'course_submission',
    title: 'New Course Submitted',
    message: '"Advanced Machine Learning" submitted by Dr. Sarah Chen.',
    created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    link_url: '/admin/approvals',
    indicatorColor: '#B45309', // Amber
    category: 'Course Approvals',
    is_read: false,
    read_at: null
  },
  {
    id: 'notif-2',
    type: 'organization_registration',
    title: 'Organization Registration',
    message: 'Global Tech Institute completed organizational verification.',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    link_url: '/admin/organizations',
    indicatorColor: '#15803D', // Emerald
    category: 'Organizations',
    is_read: false,
    read_at: null
  },
  {
    id: 'notif-3',
    type: 'system_notice',
    title: 'System Health Notice',
    message: 'Database connection pool stable. Daily automated snapshot verified.',
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    link_url: null, // Intentionally null to test notices without destination
    indicatorColor: '#D92D2D', // Brand Red
    category: 'System Health',
    is_read: false,
    read_at: null
  },
  {
    id: 'notif-4',
    type: 'user_registration',
    title: 'New Instructor Application',
    message: 'Prof. Marcus Vance submitted credentials for Physics Department verification.',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    link_url: '/admin/users',
    indicatorColor: '#2563EB', // Blue
    category: 'User Management',
    is_read: true,
    read_at: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'notif-5',
    type: 'security_alert',
    title: 'Security Policy Update',
    message: 'Enforced multi-factor authentication requirements for administrative roles.',
    created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    link_url: '/admin/settings',
    indicatorColor: '#7C3AED', // Purple
    category: 'Platform Security',
    is_read: true,
    read_at: new Date(Date.now() - 40 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'notif-6',
    type: 'assessment_audit',
    title: 'Assessment Audit Completed',
    message: 'Final exam questions for "Deep Learning Specialization" passed quality checks.',
    created_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    link_url: '/admin/assessments',
    indicatorColor: '#059669', // Teal
    category: 'Assessments',
    is_read: true,
    read_at: new Date(Date.now() - 65 * 60 * 60 * 1000).toISOString()
  }
];

/**
 * Safely retrieve read overrides from localStorage.
 */
export function getStoredReadState() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return {};
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Save read overrides to localStorage.
 */
export function saveStoredReadState(readMap) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(readMap));
  } catch (e) {
    console.error('Failed to save notification read state:', e);
  }
}

/**
 * Dispatch an event to update all mounted notification listeners across the app.
 */
export function notifyNotificationsChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATED_EVENT));
  }
}

/**
 * Subscribe to notification updates.
 */
export function subscribeToNotifications(callback) {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

/**
 * Synchronous local retrieval of merged notifications.
 */
export function getLocalNotifications({ unreadOnly = false } = {}) {
  const readMap = getStoredReadState();
  const merged = INITIAL_NOTIFICATIONS.map(item => {
    const override = readMap[item.id];
    if (override) {
      return {
        ...item,
        is_read: override.is_read !== undefined ? override.is_read : item.is_read,
        read_at: override.read_at !== undefined ? override.read_at : item.read_at
      };
    }
    return item;
  });

  return unreadOnly ? merged.filter(n => !n.is_read) : merged;
}

/**
 * Synchronous local retrieval of unread notification count.
 */
export function getLocalUnreadCount() {
  const list = getLocalNotifications();
  return list.filter(n => !n.is_read).length;
}

/**
 * Asynchronous retrieval that attempts backend API with local prototype fallback.
 */
export async function getNotifications({ unreadOnly = false } = {}) {
  try {
    const backendData = await apiClient('/notifications', {
      params: unreadOnly ? { unread_only: true } : undefined
    });

    if (Array.isArray(backendData) && backendData.length > 0) {
      return {
        notifications: backendData,
        isBackend: true,
        source: 'Backend API'
      };
    }
  } catch {
    // Expected fallback when in local prototype mode or backend unauthenticated
  }

  return {
    notifications: getLocalNotifications({ unreadOnly }),
    isBackend: false,
    source: 'Local Prototype (localStorage)'
  };
}

/**
 * Mark a single notification as read.
 */
export async function markAsRead(notificationId) {
  if (!notificationId) return;

  // Immediate local update
  const readMap = getStoredReadState();
  readMap[notificationId] = {
    is_read: true,
    read_at: new Date().toISOString()
  };
  saveStoredReadState(readMap);
  notifyNotificationsChanged();

  // Best-effort backend sync
  try {
    await apiClient(`/notifications/${notificationId}/read`, { method: 'POST' });
  } catch {
    // Graceful fallback to local persistence
  }
}

/**
 * Mark all notifications as read. Repeated calls are idempotent and safe.
 */
export async function markAllAsRead() {
  const readMap = getStoredReadState();
  const now = new Date().toISOString();

  INITIAL_NOTIFICATIONS.forEach(item => {
    readMap[item.id] = {
      is_read: true,
      read_at: now
    };
  });

  saveStoredReadState(readMap);
  notifyNotificationsChanged();

  // Best-effort backend sync
  try {
    await apiClient('/notifications/read-all', { method: 'POST' });
  } catch {
    // Graceful fallback to local persistence
  }
}

/**
 * Reset local notification state for development and testing.
 */
export function resetNotificationsState() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
      notifyNotificationsChanged();
    }
  } catch (e) {
    console.error('Failed to reset notification state:', e);
  }
}

/**
 * Format relative time (e.g. '12m ago', '2h ago', 'Yesterday')
 */
export function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const diffSec = Math.floor((now - d) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay === 1) return 'Yesterday';
    if (diffDay < 30) return `${diffDay}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * Format full date for tooltips and details
 */
export function formatFullDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return dateStr;
  }
}

export const notificationService = {
  getNotifications,
  getLocalNotifications,
  getLocalUnreadCount,
  markAsRead,
  markAllAsRead,
  resetNotificationsState,
  subscribeToNotifications,
  formatRelativeTime,
  formatFullDate,
  INITIAL_NOTIFICATIONS
};

export default notificationService;
