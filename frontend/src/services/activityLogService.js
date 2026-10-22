import { adminService } from './adminService';
import { mockActivityLogs } from '../data/mockActivityLogs';

export const ACTIVITY_LOGS_STORAGE_KEY = 'learnspace_admin_activity_logs';
export const ACTIVITY_LOGS_UPDATED_EVENT = 'learnspace_admin_activity_logs_updated';

/**
 * Reads locally appended session logs from localStorage.
 */
export function getStoredSessionLogs() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = localStorage.getItem(ACTIVITY_LOGS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Appends a new session audit event (e.g. from course approvals or settings changes)
 * into localStorage and notifies active subscribers.
 */
export function recordAuditEvent(eventData) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const existing = getStoredSessionLogs();
    const newLog = {
      id: eventData.id || `log_sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: eventData.timestamp || new Date().toISOString(),
      actor: eventData.actor || {
        id: 'usr_admin_super_01',
        name: 'Rohan Mehta',
        role: 'Super Admin',
        ip: '192.168.1.104',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'LearnSpace-Admin-Client'
      },
      action: eventData.action || 'system.action',
      category: eventData.category || 'general',
      target: eventData.target || {
        type: 'Resource',
        id: 'res_001',
        name: 'Platform Resource'
      },
      description: eventData.description || 'Administrative platform action completed.',
      status: eventData.status || 'success',
      changes: eventData.changes || {},
      isSessionCreated: true
    };

    const updated = [newLog, ...existing].slice(0, 50); // keep recent 50 session logs
    localStorage.setItem(ACTIVITY_LOGS_STORAGE_KEY, JSON.stringify(updated));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(ACTIVITY_LOGS_UPDATED_EVENT, { detail: newLog }));
    }
    return newLog;
  } catch {
    return null;
  }
}

/**
 * Subscribes to audit log updates.
 */
export function subscribeToActivityLogUpdates(callback) {
  if (typeof window === 'undefined') return () => {};

  const handleCustom = () => callback();
  const handleStorage = (e) => {
    if (!e || e.key === ACTIVITY_LOGS_STORAGE_KEY) callback();
  };

  window.addEventListener(ACTIVITY_LOGS_UPDATED_EVENT, handleCustom);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(ACTIVITY_LOGS_UPDATED_EVENT, handleCustom);
    window.removeEventListener('storage', handleStorage);
  };
}

/**
 * Maps backend AuditLogResponse object to standard UI log item
 */
function mapBackendLogToUI(r) {
  let category = 'system';
  const action = r.action || '';
  if (action.startsWith('course.')) category = 'courses';
  else if (action.startsWith('user.')) category = 'users';
  else if (action.startsWith('assessment.')) category = 'assessments';
  else if (action.startsWith('organization.')) category = 'organizations';
  else if (action.startsWith('platform_settings.') || action.startsWith('settings.')) category = 'settings';
  else if (action.startsWith('auth.') || action.startsWith('certificate.')) category = 'security';
  else if (action.startsWith('category.')) category = 'categories';

  return {
    id: r.id || `log_api_${Math.random()}`,
    timestamp: r.created_at || new Date().toISOString(),
    actor: {
      id: r.actor_id || 'usr_unknown',
      name: r.actor_name || 'Administrator',
      role: 'Super Admin',
      ip: r.ip_address || '—',
      userAgent: 'LearnSpace API Client'
    },
    action: r.action || 'system.event',
    category,
    target: {
      type: r.entity_type ? r.entity_type.charAt(0).toUpperCase() + r.entity_type.slice(1) : 'Resource',
      id: r.entity_id || '—',
      name: r.entity_id ? `${r.entity_type || 'Resource'} #${r.entity_id}` : 'Platform Resource'
    },
    description: `Administrative update performed on ${r.entity_type || 'resource'}.`,
    status: 'success',
    changes: r.changes || {}
  };
}

/**
 * Core activity log service
 */
export const activityLogService = {
  /**
   * Fetches activity logs with support for search, filtering, sorting, and pagination.
   */
  async getActivityLogs(params = {}) {
    const {
      search = '',
      category = 'all',
      actionType = 'all',
      status = 'all',
      dateRange = 'all',
      sortBy = 'timestamp',
      sortOrder = 'desc',
      page = 1,
      limit = 10
    } = params;

    let allLogs = [];
    let isSimulated = false;

    // Try backend API first
    try {
      const backendLogs = await adminService.getAuditLogs({ limit: 100 });
      if (Array.isArray(backendLogs) && backendLogs.length > 0) {
        allLogs = backendLogs.map(mapBackendLogToUI);
        isSimulated = false;
      } else {
        throw new Error('Empty backend audit log dataset');
      }
    } catch {
      // Gracefully fall back to deterministic mock activity logs + locally stored session logs
      const sessionLogs = getStoredSessionLogs();
      allLogs = [...sessionLogs, ...mockActivityLogs];
      isSimulated = true;
    }

    // 1. Filter by text search
    let filtered = allLogs.filter((log) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      const actorName = (log.actor?.name || '').toLowerCase();
      const actorRole = (log.actor?.role || '').toLowerCase();
      const actorIp = (log.actor?.ip || '').toLowerCase();
      const action = (log.action || '').toLowerCase();
      const targetName = (log.target?.name || '').toLowerCase();
      const targetType = (log.target?.type || '').toLowerCase();
      const targetId = (log.target?.id || '').toLowerCase();
      const desc = (log.description || '').toLowerCase();
      const statusStr = (log.status || '').toLowerCase();

      return (
        actorName.includes(q) ||
        actorRole.includes(q) ||
        actorIp.includes(q) ||
        action.includes(q) ||
        targetName.includes(q) ||
        targetType.includes(q) ||
        targetId.includes(q) ||
        desc.includes(q) ||
        statusStr.includes(q)
      );
    });

    // 2. Filter by Category
    if (category && category !== 'all') {
      filtered = filtered.filter((log) => log.category === category);
    }

    // 3. Filter by Action Type prefix if specified
    if (actionType && actionType !== 'all') {
      filtered = filtered.filter((log) => log.action === actionType || log.action.startsWith(actionType));
    }

    // 4. Filter by Status
    if (status && status !== 'all') {
      filtered = filtered.filter((log) => log.status === status);
    }

    // 5. Filter by Date Range
    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      filtered = filtered.filter((log) => {
        const logDate = new Date(log.timestamp);
        if (isNaN(logDate.getTime())) return true;
        const diffDays = (now - logDate) / (1000 * 60 * 60 * 24);

        if (dateRange === 'today') return diffDays <= 1;
        if (dateRange === '7d') return diffDays <= 7;
        if (dateRange === '30d') return diffDays <= 30;
        return true;
      });
    }

    // 6. Sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'timestamp') {
        const timeA = new Date(a.timestamp).getTime() || 0;
        const timeB = new Date(b.timestamp).getTime() || 0;
        comparison = timeA - timeB;
      } else if (sortBy === 'actor') {
        comparison = (a.actor?.name || '').localeCompare(b.actor?.name || '');
      } else if (sortBy === 'action') {
        comparison = (a.action || '').localeCompare(b.action || '');
      } else if (sortBy === 'status') {
        comparison = (a.status || '').localeCompare(b.status || '');
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // 7. Calculate KPI aggregates on allLogs (unfiltered platform metrics)
    const kpis = {
      total: allLogs.length,
      security: allLogs.filter((l) => l.category === 'security' || l.action.startsWith('auth.')).length,
      courses: allLogs.filter((l) => l.category === 'courses' || l.action.startsWith('course.')).length,
      users: allLogs.filter((l) => l.category === 'users' || l.action.startsWith('user.')).length,
      settings: allLogs.filter((l) => l.category === 'settings' || l.action.startsWith('platform_settings.')).length
    };

    // 8. Pagination
    const totalCount = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const startIndex = (safePage - 1) * limit;
    const paginatedLogs = filtered.slice(startIndex, startIndex + limit);

    return {
      logs: paginatedLogs,
      totalCount,
      totalPages,
      currentPage: safePage,
      kpis,
      isSimulated
    };
  },

  /**
   * Generates and triggers download of CSV export
   */
  exportLogsToCSV(logs, filename = 'learnspace-activity-audit-log.csv') {
    if (!logs || !logs.length) return false;

    const headers = [
      'Timestamp (UTC)',
      'Log ID',
      'Actor Name',
      'Actor Role',
      'IP Address',
      'Action Type',
      'Category',
      'Target Resource Type',
      'Target Resource Name',
      'Outcome Status',
      'Description'
    ];

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = logs.map((log) => [
      escapeCsv(log.timestamp),
      escapeCsv(log.id),
      escapeCsv(log.actor?.name || '—'),
      escapeCsv(log.actor?.role || '—'),
      escapeCsv(log.actor?.ip || '—'),
      escapeCsv(log.action),
      escapeCsv(log.category),
      escapeCsv(log.target?.type || '—'),
      escapeCsv(log.target?.name || '—'),
      escapeCsv(log.status),
      escapeCsv(log.description)
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  }
};
