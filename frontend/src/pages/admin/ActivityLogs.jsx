import React, { useState, useEffect, useCallback, useRef } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import { useDebounce } from '../../hooks/useDebounce';
import {
  activityLogService,
  subscribeToActivityLogUpdates,
  recordAuditEvent
} from '../../services/activityLogService';

/**
 * Format timestamp nicely into date and time
 */
function formatEventDate(dateStr) {
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

/**
 * Calculate relative time (e.g., '2 hours ago', 'Yesterday')
 */
function getRelativeTime(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
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
    return '';
  }
}

/**
 * Action Type Badge categorized by domain, matching TypeBadge in Organizations/Assessments
 */
function ActionTypeBadge({ action, category }) {
  let badgeStyles = 'bg-[#EAE3DA] text-[#514940] border-[#B6AA9A]';

  if (category === 'courses' || action.startsWith('course.')) {
    badgeStyles = 'bg-blue-100/80 text-blue-900 border-blue-300 font-medium';
  } else if (category === 'users' || action.startsWith('user.')) {
    badgeStyles = 'bg-emerald-100/80 text-emerald-900 border-emerald-300 font-medium';
  } else if (category === 'assessments' || action.startsWith('assessment.')) {
    badgeStyles = 'bg-purple-100/80 text-purple-900 border-purple-300 font-medium';
  } else if (category === 'organizations' || action.startsWith('organization.')) {
    badgeStyles = 'bg-amber-100/80 text-amber-900 border-amber-300 font-medium';
  } else if (category === 'security' || action.startsWith('auth.') || action.startsWith('certificate.')) {
    badgeStyles = 'bg-rose-100/80 text-rose-900 border-rose-300 font-medium';
  } else if (category === 'settings' || action.startsWith('platform_settings.')) {
    badgeStyles = 'bg-[#EAE3DA] text-[#514940] border-[#B6AA9A] font-medium';
  } else if (category === 'categories' || action.startsWith('category.')) {
    badgeStyles = 'bg-indigo-100/80 text-indigo-900 border-indigo-300 font-medium';
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono border shrink-0 ${badgeStyles}`}
      title={action}
    >
      {action}
    </span>
  );
}

/**
 * Outcome Badge matching StatusBadge in Organizations
 */
function OutcomeBadge({ status }) {
  const norm = (status || '').toLowerCase();

  if (norm === 'success') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100/80 text-emerald-900 border border-emerald-300 shrink-0">
        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
        Success
      </span>
    );
  }
  if (norm === 'warning') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100/80 text-amber-900 border border-amber-300 shrink-0">
        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-amber-600" aria-hidden="true" />
        Warning
      </span>
    );
  }
  if (norm === 'failed') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100/80 text-rose-900 border border-rose-300 shrink-0">
        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-rose-600" aria-hidden="true" />
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#EAE3DA] text-[#514940] border border-[#B6AA9A] shrink-0">
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-stone-500" aria-hidden="true" />
      Info
    </span>
  );
}

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [kpis, setKpis] = useState({ total: 0, security: 0, courses: 0, users: 0, settings: 0 });
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isSimulated, setIsSimulated] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Search, Filtering & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 180);
  const isInitialLoad = useRef(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Selected Log for Details Modal
  const [selectedLog, setSelectedLog] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [sessionToast, setSessionToast] = useState(null);

  // Fetch data
  const fetchLogs = useCallback(async () => {
    if (isInitialLoad.current) {
      setIsLoading(true);
    }
    try {
      const res = await activityLogService.getActivityLogs({
        search: debouncedSearch,
        category: categoryFilter,
        status: statusFilter,
        dateRange: dateRangeFilter,
        sortBy,
        sortOrder,
        page: currentPage,
        limit: pageSize
      });

      setLogs(res.logs);
      setTotalCount(res.totalCount);
      setTotalPages(res.totalPages);
      setKpis(res.kpis);
      setIsSimulated(res.isSimulated);
    } catch {
      setLogs([]);
      setTotalCount(0);
    } finally {
      if (isInitialLoad.current) {
        setIsLoading(false);
        isInitialLoad.current = false;
      }
    }
  }, [debouncedSearch, categoryFilter, statusFilter, dateRangeFilter, sortBy, sortOrder, currentPage]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Subscribe to live log updates
  useEffect(() => {
    const unsubscribe = subscribeToActivityLogUpdates(() => {
      fetchLogs();
    });
    return () => unsubscribe();
  }, [fetchLogs]);

  // Modal scroll-lock & Escape listener
  useEffect(() => {
    if (!isDetailsOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsDetailsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDetailsOpen]);

  const handleOpenDetails = (log) => {
    setSelectedLog(log);
    setCopiedPayload(false);
    setIsDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    setSelectedLog(null);
    setCopiedPayload(false);
  };

  const handleCopyPayload = () => {
    if (!selectedLog) return;
    const payloadStr = JSON.stringify(selectedLog, null, 2);
    navigator.clipboard?.writeText(payloadStr);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setDateRangeFilter('all');
    setSortBy('timestamp');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  const handleExportCSV = () => {
    activityLogService.exportLogsToCSV(logs);
  };

  // Test interactive event generator for prototype evaluation
  const handleSimulateAdminEvent = () => {
    const sampleActions = [
      {
        action: 'course.approved',
        category: 'courses',
        target: { type: 'Course', id: 'crs_test_101', name: 'Applied Neural Networks & Vision' },
        description: 'Super Admin manual quality sign-off completed for catalog release.',
        status: 'success',
        changes: { status: 'published', approvedBy: 'Rohan Mehta' }
      },
      {
        action: 'user.role_updated',
        category: 'users',
        target: { type: 'User', id: 'usr_inst_demo', name: 'Marcus Sterling' },
        description: 'Granted content reviewer permissions for Computer Science track.',
        status: 'success',
        changes: { role: 'reviewer', track: 'Computer Science' }
      },
      {
        action: 'platform_settings.updated',
        category: 'settings',
        target: { type: 'Platform Settings', id: 'cfg_sec_session', name: 'Session Inactivity Timeout' },
        description: 'Adjusted admin idle token expiration threshold to 45 minutes.',
        status: 'info',
        changes: { idleTimeoutMinutes: 45, enforced: true }
      }
    ];

    const chosen = sampleActions[Math.floor(Math.random() * sampleActions.length)];
    recordAuditEvent(chosen);

    setSessionToast('New administrative audit event appended to current session log.');
    setTimeout(() => setSessionToast(null), 3500);
    fetchLogs();
  };

  return (
    <PageContainer>
      {/* Breadcrumb Navigation matching other admin pages */}
      <nav className="flex text-xs text-[#514940] mb-3" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2">
          <li>
            <span className="text-[#514940]">Super Admin</span>
          </li>
          <li className="text-[#71675D]">/</li>
          <li className="font-semibold text-[#211E1A]" aria-current="page">
            Activity Logs
          </li>
        </ol>
      </nav>

      {/* Header & Primary Action Bar matching Organizations / Reports */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-[#B6AA9A]">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-bold text-[#211E1A] leading-tight tracking-tight">
            Activity Logs
          </h1>
          <p className="mt-1 text-sm text-[#514940]">
            Immutable platform audit ledger tracking administrative decisions, security events, course governance, and configuration changes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            onClick={handleExportCSV}
            disabled={isLoading || logs.length === 0}
            className="flex items-center gap-2 text-sm shadow-xs"
          >
            <svg className="w-4 h-4 text-[#71675D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Export CSV</span>
          </Button>

          <Button
            variant="primary"
            onClick={handleSimulateAdminEvent}
            className="flex items-center gap-2 text-sm shadow-xs"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Record Action</span>
          </Button>
        </div>
      </div>

      {/* Compact Transparency Notice matching Organizations / Reports */}
      <div className="mt-4 flex items-center justify-between text-xs text-[#514940] bg-[#EAE3DA]/60 border border-[#B6AA9A] px-3 py-2 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
          <span>
            Data Source:{' '}
            <strong className="text-[#211E1A]">
              {isSimulated ? 'Development Mock Provider (Deterministic Sample)' : 'Live Platform Audit Ledger (/api/v1/admin/audit-logs)'}
            </strong>
          </span>
        </div>
        <span className="text-[11px] text-[#71675D]">
          {isSimulated ? 'Simulated data • No sensitive credentials exposed' : 'Live Sync'}
        </span>
      </div>

      {/* Session action toast notification */}
      {sessionToast && (
        <div className="mt-4 p-3 rounded-lg bg-emerald-100/90 border border-emerald-300 text-emerald-950 text-xs font-medium flex items-center justify-between transition-all">
          <div className="flex items-center gap-2">
            <span className="text-emerald-700 font-bold">✓</span>
            <span>{sessionToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSessionToast(null)}
            className="text-xs font-bold hover:underline ml-auto"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary KPI Cards matching Organizations / Reports style */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Events */}
        <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-[#514940] block">Total Events</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#211E1A]">{kpis.total}</span>
            <span className="text-xs font-medium text-[#71675D]">All records</span>
          </div>
        </div>

        {/* Security & Auth */}
        <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-[#514940] block">Security & Auth</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#211E1A]">{kpis.security}</span>
            <span className="text-xs font-medium text-[#71675D]">Auth & access</span>
          </div>
        </div>

        {/* Course Actions */}
        <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-[#514940] block">Course Decisions</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#211E1A]">{kpis.courses}</span>
            <span className="text-xs font-medium text-[#71675D]">Approvals & reviews</span>
          </div>
        </div>

        {/* User Governance */}
        <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-[#514940] block">User Governance</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#211E1A]">{kpis.users}</span>
            <span className="text-xs font-medium text-[#71675D]">Roles & status</span>
          </div>
        </div>

        {/* Platform Settings */}
        <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-[#514940] block">System & Settings</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#211E1A]">{kpis.settings}</span>
            <span className="text-xs font-medium text-[#71675D]">Config updates</span>
          </div>
        </div>
      </div>

      {/* Control Toolbar matching Organizations and Reports */}
      <div className="mt-6 bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#71675D]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (currentPage !== 1) setCurrentPage(1);
            }}
            placeholder="Search logs by actor, action type, resource, or description..."
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-lg bg-[#EAE3DA] border border-[#B6AA9A] text-[#211E1A] placeholder-[#71675D] focus:outline-none focus:ring-2 focus:ring-[#D92D2D] transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                if (currentPage !== 1) setCurrentPage(1);
              }}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#71675D] hover:text-[#211E1A]"
              aria-label="Clear search query"
            >
              &times;
            </button>
          )}
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs sm:text-sm rounded-lg bg-[#EAE3DA] border border-[#B6AA9A] text-[#211E1A] font-medium focus:outline-none focus:ring-2 focus:ring-[#D92D2D] transition-colors"
            aria-label="Filter by category"
          >
            <option value="all">All Categories</option>
            <option value="courses">Courses Governance</option>
            <option value="users">User Management</option>
            <option value="assessments">Assessments</option>
            <option value="organizations">Organizations</option>
            <option value="settings">Platform Settings</option>
            <option value="security">Security & Auth</option>
            <option value="categories">Curriculum Taxonomy</option>
          </select>

          {/* Outcome Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs sm:text-sm rounded-lg bg-[#EAE3DA] border border-[#B6AA9A] text-[#211E1A] font-medium focus:outline-none focus:ring-2 focus:ring-[#D92D2D] transition-colors"
            aria-label="Filter by outcome"
          >
            <option value="all">All Outcomes</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="failed">Failed</option>
            <option value="info">Info</option>
          </select>

          {/* Date Range Filter */}
          <select
            value={dateRangeFilter}
            onChange={(e) => {
              setDateRangeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs sm:text-sm rounded-lg bg-[#EAE3DA] border border-[#B6AA9A] text-[#211E1A] font-medium focus:outline-none focus:ring-2 focus:ring-[#D92D2D] transition-colors"
            aria-label="Filter by date range"
          >
            <option value="all">All Time</option>
            <option value="today">Past 24 Hours</option>
            <option value="7d">Past 7 Days</option>
            <option value="30d">Past 30 Days</option>
          </select>

          {/* Sort Dropdown */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order);
            }}
            className="px-3 py-2 text-xs sm:text-sm rounded-lg bg-[#EAE3DA] border border-[#B6AA9A] text-[#211E1A] font-medium focus:outline-none focus:ring-2 focus:ring-[#D92D2D] transition-colors"
            aria-label="Sort activity logs"
          >
            <option value="timestamp-desc">Newest First</option>
            <option value="timestamp-asc">Oldest First</option>
            <option value="actor-asc">Actor (A-Z)</option>
            <option value="action-asc">Action (A-Z)</option>
            <option value="status-asc">Outcome</option>
          </select>

          {/* Clear Filters Button */}
          {(searchQuery || categoryFilter !== 'all' || statusFilter !== 'all' || dateRangeFilter !== 'all' || sortBy !== 'timestamp' || sortOrder !== 'desc') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="py-2 px-2.5 text-xs font-semibold rounded-lg text-[#D92D2D] hover:bg-[#EAE3DA] transition-colors focus:outline-none"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Directory Table / Content View */}
      <div className="mt-6 bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader text="Loading activity logs..." />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 px-4">
            <EmptyState
              title="No Activity Events Found"
              description="No audit log entries matched your current filter criteria or search query."
            />
            <div className="mt-4 text-center">
              <Button variant="secondary" onClick={handleResetFilters} className="text-xs">
                Reset Search & Filters
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#B6AA9A] text-left text-xs sm:text-sm">
              <thead className="bg-[#EAE3DA]/70 text-[#514940] font-semibold">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 sm:pl-6 pr-3 whitespace-nowrap">
                    Timestamp
                  </th>
                  <th scope="col" className="px-3 py-3.5 whitespace-nowrap">
                    Actor
                  </th>
                  <th scope="col" className="px-3 py-3.5 whitespace-nowrap">
                    Action Type
                  </th>
                  <th scope="col" className="px-3 py-3.5 whitespace-nowrap">
                    Affected Resource
                  </th>
                  <th scope="col" className="px-3 py-3.5">
                    Description
                  </th>
                  <th scope="col" className="px-3 py-3.5 whitespace-nowrap">
                    Outcome
                  </th>
                  <th scope="col" className="py-3.5 pl-3 pr-4 sm:pr-6 text-right whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#B6AA9A]/60 bg-[#C8BBAA]/40 text-[#211E1A]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#EAE3DA]/40 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3.5 pl-4 sm:pl-6 pr-3 whitespace-nowrap align-top">
                      <div className="font-semibold text-[#211E1A]">
                        {formatEventDate(log.timestamp)}
                      </div>
                      <div className="text-[11px] text-[#71675D] mt-0.5">
                        {getRelativeTime(log.timestamp)}
                      </div>
                    </td>

                    {/* Actor */}
                    <td className="px-3 py-3.5 whitespace-nowrap align-top">
                      <div className="font-semibold text-[#211E1A] truncate max-w-[150px]">
                        {log.actor?.name || 'Unknown'}
                      </div>
                      <div className="text-[11px] text-[#71675D] truncate max-w-[150px] mt-0.5">
                        {log.actor?.role || 'Admin'} • {log.actor?.ip || '—'}
                      </div>
                    </td>

                    {/* Action Type */}
                    <td className="px-3 py-3.5 whitespace-nowrap align-top">
                      <ActionTypeBadge action={log.action} category={log.category} />
                    </td>

                    {/* Affected Resource */}
                    <td className="px-3 py-3.5 align-top">
                      <div
                        className="font-semibold text-[#211E1A] truncate max-w-[180px] sm:max-w-[210px]"
                        title={log.target?.name || log.target?.id}
                      >
                        {log.target?.name || log.target?.id || '—'}
                      </div>
                      <div className="text-[11px] text-[#71675D] truncate max-w-[180px] mt-0.5">
                        {log.target?.type || 'Resource'} {log.target?.id ? `• ${log.target.id}` : ''}
                      </div>
                    </td>

                    {/* Description */}
                    <td className="px-3 py-3.5 align-top min-w-[200px] max-w-sm">
                      <p className="text-xs text-[#514940] line-clamp-2 leading-relaxed">
                        {log.description}
                      </p>
                    </td>

                    {/* Outcome */}
                    <td className="px-3 py-3.5 whitespace-nowrap align-top">
                      <OutcomeBadge status={log.status} />
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 pl-3 pr-4 sm:pr-6 text-right whitespace-nowrap align-top">
                      <button
                        type="button"
                        onClick={() => handleOpenDetails(log)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#EAE3DA] hover:bg-[#BFB09D] text-[#211E1A] border border-[#B6AA9A] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
                        aria-label={`Inspect event ${log.id}`}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalCount > 0 && (
          <div className="px-4 sm:px-6 py-3.5 border-t border-[#B6AA9A] bg-[#EAE3DA]/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
            <span className="text-[#514940]">
              Showing page <strong className="text-[#211E1A]">{currentPage}</strong> of{' '}
              <strong className="text-[#211E1A]">{totalPages}</strong> ({totalCount} total events)
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || isLoading}
                className="px-3 py-1.5 text-xs rounded-lg border border-[#B6AA9A] bg-[#EAE3DA] font-semibold text-[#211E1A] hover:bg-[#BFB09D] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>

              {/* Numbered page buttons */}
              {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                .map((page, pIdx, arr) => {
                  const prev = arr[pIdx - 1];
                  const hasGap = prev && page - prev > 1;

                  return (
                    <React.Fragment key={page}>
                      {hasGap && <span className="px-1 text-[#71675D]">…</span>}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border text-xs font-bold transition-colors ${
                          currentPage === page
                            ? 'bg-[#D92D2D] text-white border-[#D92D2D] shadow-2xs'
                            : 'border-[#B6AA9A] bg-[#EAE3DA] text-[#211E1A] hover:bg-[#BFB09D]'
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages || isLoading}
                className="px-3 py-1.5 text-xs rounded-lg border border-[#B6AA9A] bg-[#EAE3DA] font-semibold text-[#211E1A] hover:bg-[#BFB09D] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Inspection Modal */}
      {isDetailsOpen && selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseDetails();
          }}
          role="presentation"
        >
          <div
            className="relative w-full max-w-2xl bg-[#EAE3DA] border border-[#B6AA9A] rounded-xl shadow-2xl flex flex-col text-[#211E1A] overflow-hidden"
            style={{
              maxHeight: 'min(calc(100dvh - 32px), calc(100vh - 32px), 860px)'
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="audit-modal-title"
          >
            {/* 1. Pinned Header */}
            <div className="px-5 py-4 border-b border-[#B6AA9A] bg-[#E2DCD4] flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-[#71675D] uppercase tracking-wider">
                    Audit Event Entry
                  </span>
                  <ActionTypeBadge action={selectedLog.action} category={selectedLog.category} />
                  <OutcomeBadge status={selectedLog.status} />
                </div>
                <h3
                  id="audit-modal-title"
                  className="text-base sm:text-lg font-bold text-[#211E1A] truncate mt-1"
                  title={`Log: ${selectedLog.id}`}
                >
                  {selectedLog.description}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseDetails}
                className="text-[#71675D] hover:text-[#211E1A] hover:bg-[#B6AA9A]/40 p-1.5 rounded-lg transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
                aria-label="Close details dialog"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 2. Independently Scrollable Body */}
            <div className="p-4 sm:p-6 overflow-y-auto min-h-0 flex-1 space-y-5 overscroll-contain">
              {/* Event Metadata Banner */}
              <div className="p-4 rounded-xl bg-[#E2DCD4]/70 border border-[#B6AA9A] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-[#71675D] uppercase font-bold block">Event ID</span>
                    <span className="font-mono font-semibold text-[#211E1A]">{selectedLog.id}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#71675D] uppercase font-bold block">Timestamp (UTC)</span>
                    <span className="font-mono font-semibold text-[#211E1A]">{selectedLog.timestamp}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#B6AA9A]/60 text-xs">
                  {/* Actor details */}
                  <div className="p-3 rounded-lg bg-[#EAE3DA] border border-[#B6AA9A]/60 space-y-1">
                    <span className="text-[10px] text-[#71675D] uppercase font-bold block">Actor & Session</span>
                    <div className="font-bold text-[#211E1A]">{selectedLog.actor?.name || 'Administrator'}</div>
                    <div className="text-[#514940] text-[11px]">Role: {selectedLog.actor?.role || 'Super Admin'}</div>
                    <div className="text-[#514940] text-[11px] font-mono">IP: {selectedLog.actor?.ip || '—'}</div>
                    {selectedLog.actor?.userAgent && (
                      <div className="text-[10px] text-[#71675D] truncate pt-0.5" title={selectedLog.actor.userAgent}>
                        Agent: {selectedLog.actor.userAgent}
                      </div>
                    )}
                  </div>

                  {/* Target resource details */}
                  <div className="p-3 rounded-lg bg-[#EAE3DA] border border-[#B6AA9A]/60 space-y-1">
                    <span className="text-[10px] text-[#71675D] uppercase font-bold block">Target Resource</span>
                    <div className="font-bold text-[#211E1A]">{selectedLog.target?.name || 'Platform Entity'}</div>
                    <div className="text-[#514940] text-[11px]">Type: {selectedLog.target?.type || 'Resource'}</div>
                    <div className="text-[#514940] text-[11px] font-mono">Entity ID: {selectedLog.target?.id || '—'}</div>
                    <div className="text-[#71675D] text-[11px]">Domain: {selectedLog.category}</div>
                  </div>
                </div>
              </div>

              {/* State Changes / Modification Payload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#211E1A] uppercase tracking-wider">
                    Modifications & Data Changes
                  </h4>
                  <button
                    type="button"
                    onClick={handleCopyPayload}
                    className="text-[11px] font-semibold text-[#D92D2D] hover:underline flex items-center gap-1"
                  >
                    <span>{copiedPayload ? '✓ Copied JSON' : 'Copy JSON'}</span>
                  </button>
                </div>

                {selectedLog.changes && typeof selectedLog.changes === 'object' && Object.keys(selectedLog.changes).length > 0 ? (
                  <div className="space-y-3">
                    {/* Before vs After comparison if present */}
                    {selectedLog.changes.before && selectedLog.changes.after && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-lg border border-amber-300 bg-amber-50/60 text-[#211E1A] space-y-1.5">
                          <span className="text-[10px] font-bold uppercase text-amber-900 block">State Before</span>
                          <pre className="text-[11px] font-mono overflow-x-auto whitespace-pre-wrap leading-tight text-amber-950">
                            {JSON.stringify(selectedLog.changes.before, null, 2)}
                          </pre>
                        </div>
                        <div className="p-3 rounded-lg border border-emerald-300 bg-emerald-50/60 text-[#211E1A] space-y-1.5">
                          <span className="text-[10px] font-bold uppercase text-emerald-900 block">State After</span>
                          <pre className="text-[11px] font-mono overflow-x-auto whitespace-pre-wrap leading-tight text-emerald-950">
                            {JSON.stringify(selectedLog.changes.after, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Raw formatted changes JSON */}
                    <div className="rounded-lg border border-[#B6AA9A] bg-[#211E1A] text-[#EAE3DA] p-3 text-xs overflow-x-auto font-mono">
                      <pre className="leading-relaxed">
                        {JSON.stringify(selectedLog.changes, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg border border-[#B6AA9A] bg-[#E2DCD4]/40 text-xs text-[#71675D] italic">
                    No field-level delta recorded for this event.
                  </div>
                )}
              </div>

              {/* Immutable Ledger Verification Notice */}
              <div className="p-3.5 rounded-lg bg-[#E2DCD4]/60 border border-[#B6AA9A] text-xs text-[#514940] leading-relaxed">
                <p>
                  <strong className="text-[#211E1A]">Audit Trail Integrity:</strong> All administrative log entries in LearnSpace are append-only. They are retained according to educational data retention and compliance policies.
                </p>
              </div>
            </div>

            {/* 3. Pinned Footer */}
            <div className="px-5 py-3.5 border-t border-[#B6AA9A] bg-[#E2DCD4] flex items-center justify-end gap-3 shrink-0">
              <Button
                variant="secondary"
                onClick={handleCopyPayload}
                className="text-xs"
              >
                {copiedPayload ? 'Copied to Clipboard' : 'Copy Full Entry'}
              </Button>
              <Button
                variant="primary"
                onClick={handleCloseDetails}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
