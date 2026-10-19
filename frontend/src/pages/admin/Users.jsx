import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import {
  userService,
  getStoredUserOverrides,
  clearStoredUserOverrides,
  applyUserOverrides,
  subscribeToUserUpdates
} from '../../services/userService';
import { mockUsers } from '../../data/mockUsers';

/**
 * Semantic StatusBadge for user account standing
 * - Active: Emerald
 * - Pending: Amber
 * - Suspended: Rose / Danger
 */
function StatusBadge({ status }) {
  const normalized = (status || '').toLowerCase();

  if (normalized === 'active') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100/80 text-emerald-900 border border-emerald-300 shrink-0">
        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
        Active
      </span>
    );
  }

  if (normalized === 'pending') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100/80 text-amber-900 border border-amber-300 shrink-0">
        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-amber-600" aria-hidden="true" />
        Pending
      </span>
    );
  }

  if (normalized === 'suspended') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100/80 text-rose-900 border border-rose-300 shrink-0">
        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-rose-600" aria-hidden="true" />
        Suspended
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#EAE3DA] text-[#514940] border border-[#B6AA9A] shrink-0">
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-stone-500" aria-hidden="true" />
      {status || 'Unknown'}
    </span>
  );
}

/**
 * Semantic RoleBadge for administrative taxonomy
 */
function RoleBadge({ role }) {
  const normalized = (role || '').toLowerCase();

  if (normalized.includes('admin')) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#211E1A] text-[#EAE3DA] border border-[#71675D] shrink-0">
        Super Admin
      </span>
    );
  }

  if (normalized.includes('instructor')) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100/80 text-blue-900 border border-blue-300 shrink-0">
        Instructor
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#EAE3DA] text-[#514940] border border-[#B6AA9A] shrink-0">
      Learner
    </span>
  );
}

/**
 * Format timestamp into standard readable calendar date and relative age
 */
function formatUserDate(dateStr) {
  if (!dateStr) return { formatted: 'Recent', relative: '' };
  const d = new Date(dateStr);
  const formatted = d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const now = new Date('2026-10-19T20:00:00Z');
  const diffMs = Math.max(0, now.getTime() - d.getTime());
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const relative = diffDays === 0 ? 'Today' : diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;

  return { formatted, relative };
}

/**
 * Generate 2-letter initials for avatar badge
 */
function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Users() {
  const [rawUsers, setRawUsers] = useState(mockUsers);
  const [sessionOverrides, setSessionOverrides] = useState(getStoredUserOverrides);
  const [isLoading, setIsLoading] = useState(true);
  const [isSampleData, setIsSampleData] = useState(true);
  const [statusNotice, setStatusNotice] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('date-desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Modal inspection & confirmation dialog states
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionConfirm, setActionConfirm] = useState(null); // { user, type: 'activate' | 'suspend' }
  const [actionReason, setActionReason] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Subscribe to live user overrides from session storage
  useEffect(() => {
    const unsubscribe = subscribeToUserUpdates(setSessionOverrides);
    return unsubscribe;
  }, []);

  // Fetch users with graceful fallback
  useEffect(() => {
    let isMounted = true;

    async function loadUsers() {
      setIsLoading(true);
      try {
        const res = await userService.getUsers();
        if (isMounted) {
          if (Array.isArray(res.items) && res.items.length > 0) {
            setRawUsers(res.items);
            setIsSampleData(res.isSample);
          } else {
            setRawUsers(mockUsers);
            setIsSampleData(true);
          }
        }
      } catch {
        if (isMounted) {
          setRawUsers(mockUsers);
          setIsSampleData(true);
        }
      } finally {
        if (isMounted) {
          setSessionOverrides(getStoredUserOverrides());
          setIsLoading(false);
        }
      }
    }

    loadUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  // Overlay session updates onto users list
  const users = useMemo(() => {
    return applyUserOverrides(rawUsers, sessionOverrides);
  }, [rawUsers, sessionOverrides]);

  const reviewedCount = useMemo(() => {
    return Object.keys(sessionOverrides).length;
  }, [sessionOverrides]);

  // Reset to first page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, statusFilter, pageSize, sortBy]);

  // Summary Metrics calculated directly from resolved users dataset
  const summaryMetrics = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.status === 'Active').length;
    const instructors = users.filter(u => u.role === 'Instructor').length;
    const learners = users.filter(u => u.role === 'Learner').length;
    const pending = users.filter(u => u.status === 'Pending').length;
    const suspended = users.filter(u => u.status === 'Suspended').length;
    return { total, active, instructors, learners, pending, suspended };
  }, [users]);

  // Filter and sort pipeline
  const filteredAndSortedUsers = useMemo(() => {
    let result = [...users];

    // Search query: matching name or email
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(u =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.id || '').toLowerCase().includes(q)
      );
    }

    // Role filter
    if (roleFilter !== 'ALL') {
      result = result.filter(u => u.role === roleFilter);
    }

    // Status filter
    if (statusFilter === 'SUSPENDED_OR_PENDING') {
      result = result.filter(u => u.status === 'Suspended' || u.status === 'Pending');
    } else if (statusFilter !== 'ALL') {
      result = result.filter(u => u.status === statusFilter);
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.joinedAt || 0).getTime() - new Date(a.joinedAt || 0).getTime();
        case 'date-asc':
          return new Date(a.joinedAt || 0).getTime() - new Date(b.joinedAt || 0).getTime();
        case 'name-asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'name-desc':
          return (b.name || '').localeCompare(a.name || '');
        default:
          return 0;
      }
    });

    return result;
  }, [users, searchQuery, roleFilter, statusFilter, sortBy]);

  // Pagination calculation
  const totalFilteredItems = filteredAndSortedUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedUsers = filteredAndSortedUsers.slice(startIndex, startIndex + pageSize);

  // Execute Activate / Suspend action
  const handleExecuteStatusAction = async () => {
    if (!actionConfirm || !actionConfirm.user) return;
    const { user, type } = actionConfirm;
    const newStatus = type === 'activate' ? 'Active' : 'Suspended';

    setIsSubmittingAction(true);
    try {
      await userService.updateUserStatus(user.id, newStatus, actionReason);
      setStatusNotice(
        `User "${user.name}" has been ${newStatus.toLowerCase()} (simulated in development session).`
      );

      // If user details modal is open for this user, refresh selected user reference
      if (selectedUser && selectedUser.id === user.id) {
        setSelectedUser(prev => ({ ...prev, status: newStatus }));
      }
    } catch {
      setStatusNotice(`Failed to update status for "${user.name}".`);
    } finally {
      setIsSubmittingAction(false);
      setActionConfirm(null);
      setActionReason('');

      setTimeout(() => {
        setStatusNotice(null);
      }, 4500);
    }
  };

  // Reset session overrides
  const handleResetSessionOverrides = () => {
    clearStoredUserOverrides();
    setStatusNotice('Restored original mock user statuses.');
    if (selectedUser) {
      const orig = mockUsers.find(u => u.id === selectedUser.id);
      if (orig) setSelectedUser(orig);
    }
    setTimeout(() => {
      setStatusNotice(null);
    }, 4000);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
    setSortBy('date-desc');
  };

  return (
    <PageContainer>
      {/* Page Heading & Header Controls */}
      <div className="pb-6 border-b border-[#B6AA9A]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[26px] sm:text-[30px] font-bold tracking-tight text-[#211E1A] font-sans leading-tight">
                User Management
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EAE3DA] text-[#514940] border border-[#B6AA9A] shrink-0">
                {summaryMetrics.total} Total Registered
              </span>
            </div>
            <p className="mt-1.5 text-[14px] leading-relaxed text-[#514940]">
              Oversee account lifecycles, monitor learner and instructor standing, inspect profile details, and enforce activation or suspension.
            </p>
          </div>

          {/* Quick Header Navigation */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/admin/courses"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-[13px] font-semibold rounded-lg bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] hover:bg-[#D6D0C8] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
            >
              <span>Course Catalog</span>
            </Link>
            <Link
              to="/admin/approvals"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-[13px] font-semibold rounded-lg bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] hover:bg-[#D6D0C8] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
            >
              <span>Approvals Queue</span>
            </Link>
          </div>
        </div>

        {/* Development Mode Notice Banner */}
        {isSampleData && (
          <div className="mt-4 p-3.5 bg-[#C8BBAA] border border-[#B6AA9A] rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-[13px] min-w-0">
            <div className="flex items-start sm:items-center gap-2.5 text-[#211E1A] min-w-0 flex-1">
              <span className="shrink-0 font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-[#D92D2D] text-white mt-0.5 sm:mt-0">
                Dev Mode
              </span>
              <div className="min-w-0 break-words leading-relaxed">
                <strong>Sample User Data Active:</strong> Backend user administration APIs are currently in development. User accounts and status modifications are simulated locally in this browser session.
                {reviewedCount > 0 && (
                  <span className="inline-block sm:inline sm:ml-2 text-emerald-950 font-medium">
                    ({reviewedCount} status {reviewedCount === 1 ? 'change' : 'changes'} saved)
                  </span>
                )}
              </div>
            </div>

            {(statusNotice || reviewedCount > 0) && (
              <div className="flex flex-wrap items-center justify-start md:justify-end gap-2.5 sm:gap-3 min-w-0 max-w-full md:max-w-[48%] shrink-0">
                {statusNotice && (
                  <span className="text-emerald-950 font-medium animate-fade-in text-[12px] break-words min-w-0">
                    {statusNotice}
                  </span>
                )}
                {reviewedCount > 0 && (
                  <button
                    type="button"
                    onClick={handleResetSessionOverrides}
                    className="text-xs font-semibold text-[#D92D2D] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] rounded shrink-0 whitespace-nowrap"
                  >
                    Reset session changes
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="mt-6 space-y-6">
        {/* User Summary Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Card 1: Total Users */}
          <button
            type="button"
            onClick={() => { setRoleFilter('ALL'); setStatusFilter('ALL'); }}
            className={`p-4 sm:p-5 rounded-xl border text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] ${
              roleFilter === 'ALL' && statusFilter === 'ALL'
                ? 'bg-[#C8BBAA] border-[#D92D2D] shadow-xs'
                : 'bg-[#C8BBAA] border-[#B6AA9A] hover:border-[#71675D]'
            }`}
          >
            <span className="text-[12px] sm:text-[13px] font-semibold text-[#514940] block">
              Total Accounts
            </span>
            <span className="text-[26px] sm:text-[30px] font-bold text-[#211E1A] mt-1 block leading-none font-sans">
              {summaryMetrics.total}
            </span>
            <span className="text-[11px] text-[#71675D] mt-1.5 block">
              Registered across platform
            </span>
          </button>

          {/* Card 2: Active Users */}
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'Active' ? 'ALL' : 'Active')}
            className={`p-4 sm:p-5 rounded-xl border text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] ${
              statusFilter === 'Active'
                ? 'bg-[#C8BBAA] border-[#D92D2D] shadow-xs'
                : 'bg-[#C8BBAA] border-[#B6AA9A] hover:border-[#71675D]'
            }`}
          >
            <span className="text-[12px] sm:text-[13px] font-semibold text-[#514940] block">
              Active Users
            </span>
            <span className="text-[26px] sm:text-[30px] font-bold text-emerald-900 mt-1 block leading-none font-sans">
              {summaryMetrics.active}
            </span>
            <span className="text-[11px] text-[#71675D] mt-1.5 block">
              Good standing & authorized
            </span>
          </button>

          {/* Card 3: Instructors */}
          <button
            type="button"
            onClick={() => setRoleFilter(roleFilter === 'Instructor' ? 'ALL' : 'Instructor')}
            className={`p-4 sm:p-5 rounded-xl border text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] ${
              roleFilter === 'Instructor'
                ? 'bg-[#C8BBAA] border-[#D92D2D] shadow-xs'
                : 'bg-[#C8BBAA] border-[#B6AA9A] hover:border-[#71675D]'
            }`}
          >
            <span className="text-[12px] sm:text-[13px] font-semibold text-[#514940] block">
              Instructors
            </span>
            <span className="text-[26px] sm:text-[30px] font-bold text-blue-900 mt-1 block leading-none font-sans">
              {summaryMetrics.instructors}
            </span>
            <span className="text-[11px] text-[#71675D] mt-1.5 block">
              Faculty & content creators
            </span>
          </button>

          {/* Card 4: Action Required (Suspended & Pending) */}
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'SUSPENDED_OR_PENDING' ? 'ALL' : 'SUSPENDED_OR_PENDING')}
            className={`p-4 sm:p-5 rounded-xl border text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] ${
              statusFilter === 'SUSPENDED_OR_PENDING'
                ? 'bg-[#C8BBAA] border-[#D92D2D] shadow-xs'
                : 'bg-[#C8BBAA] border-[#B6AA9A] hover:border-[#71675D]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] sm:text-[13px] font-semibold text-[#514940] block">
                Suspended / Pending
              </span>
              {(summaryMetrics.suspended > 0 || summaryMetrics.pending > 0) && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  Audit
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-[26px] sm:text-[30px] font-bold text-rose-900 leading-none font-sans">
                {summaryMetrics.suspended}
              </span>
              <span className="text-xs text-[#514940]">suspended</span>
              <span className="text-xs text-[#71675D]">/</span>
              <span className="text-[18px] sm:text-[20px] font-bold text-amber-900 font-sans">
                {summaryMetrics.pending}
              </span>
              <span className="text-xs text-[#514940]">pending</span>
            </div>
            <span className="text-[11px] text-[#71675D] mt-1.5 block">
              Requires administrative review
            </span>
          </button>
        </div>

        {/* Filter and Search Controls Bar */}
        <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#71675D]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search users by name, email, or user ID..."
                aria-label="Search users by name, email, or user ID"
                className="w-full pl-9 pr-8 py-2 text-[13px] bg-[#EAE3DA] text-[#211E1A] placeholder-[#71675D] border border-[#B6AA9A] rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] focus-visible:bg-[#F3ECE4]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#71675D] hover:text-[#211E1A]"
                  aria-label="Clear search input"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-2.5 text-[13px]">
              {/* Role Filter */}
              <div className="flex items-center gap-1.5">
                <label htmlFor="user-role-filter" className="text-[#514940] font-medium shrink-0">
                  Role:
                </label>
                <select
                  id="user-role-filter"
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className="bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] rounded-lg px-2.5 py-1.5 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
                >
                  <option value="ALL">All Roles ({users.length})</option>
                  <option value="Super Admin">Super Admin</option>
                  <option value="Instructor">Instructor ({summaryMetrics.instructors})</option>
                  <option value="Learner">Learner ({summaryMetrics.learners})</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <label htmlFor="user-status-filter" className="text-[#514940] font-medium shrink-0">
                  Status:
                </label>
                <select
                  id="user-status-filter"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] rounded-lg px-2.5 py-1.5 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
                >
                  <option value="ALL">All Statuses ({users.length})</option>
                  <option value="Active">Active ({summaryMetrics.active})</option>
                  <option value="Pending">Pending ({summaryMetrics.pending})</option>
                  <option value="Suspended">Suspended ({summaryMetrics.suspended})</option>
                  <option value="SUSPENDED_OR_PENDING">
                    Suspended or Pending ({summaryMetrics.suspended + summaryMetrics.pending})
                  </option>
                </select>
              </div>

              {/* Sort By Filter */}
              <div className="flex items-center gap-1.5">
                <label htmlFor="user-sort-filter" className="text-[#514940] font-medium shrink-0">
                  Sort:
                </label>
                <select
                  id="user-sort-filter"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] rounded-lg px-2.5 py-1.5 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
                >
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="name-asc">Name: A → Z</option>
                  <option value="name-desc">Name: Z → A</option>
                </select>
              </div>

              {/* Clear Filters Reset Button */}
              {(searchQuery || roleFilter !== 'ALL' || statusFilter !== 'ALL' || sortBy !== 'date-desc') && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-2.5 py-1.5 text-xs font-semibold text-[#D92D2D] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] rounded"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Users Records Table Section */}
        <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center">
              <Loader size="medium" />
              <p className="mt-3 text-sm text-[#71675D]">Loading user records...</p>
            </div>
          ) : paginatedUsers.length === 0 ? (
            <div className="py-12 px-4">
              <EmptyState
                title="No matching users found"
                description={
                  searchQuery || roleFilter !== 'ALL' || statusFilter !== 'ALL'
                    ? searchQuery
                      ? `No user accounts match "${searchQuery}" with the current role and status filters.`
                      : 'No user accounts match the current role and status filters.'
                    : 'No user accounts are currently registered on the platform.'
                }
                action={
                  (searchQuery || roleFilter !== 'ALL' || statusFilter !== 'ALL') && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="mt-3 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#EAE3DA] text-[#D92D2D] border border-[#B6AA9A] hover:bg-[#D6D0C8]"
                    >
                      Clear Search & Filters
                    </button>
                  )
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[13px]">
                <caption className="sr-only">Platform user accounts management records list</caption>
                <thead>
                  <tr className="border-b border-[#B6AA9A] bg-[#C1B3A0]/60 text-[#514940] uppercase tracking-wider text-[11px] font-bold">
                    <th scope="col" className="py-3 px-4 sm:px-5">
                      User Profile
                    </th>
                    <th scope="col" className="py-3 px-3">
                      Role
                    </th>
                    <th scope="col" className="py-3 px-3">
                      Organization
                    </th>
                    <th scope="col" className="py-3 px-3">
                      Registered Date
                    </th>
                    <th scope="col" className="py-3 px-3 text-center">
                      Account Status
                    </th>
                    <th scope="col" className="py-3 px-4 sm:px-5 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#B6AA9A] bg-[#C8BBAA]">
                  {paginatedUsers.map(user => {
                    const dateInfo = formatUserDate(user.joinedAt);
                    const isActive = user.status === 'Active';

                    return (
                      <tr key={user.id} className="hover:bg-[#EAE3DA]/50 transition-colors">
                        {/* User Profile & Contact */}
                        <td className="py-3 px-4 sm:px-5 max-w-[260px] sm:max-w-[320px]">
                          <div className="flex items-center gap-3">
                            {/* Avatar Badge with Initials */}
                            <div className="w-8 h-8 rounded-full bg-[#EAE3DA] border border-[#B6AA9A] flex items-center justify-center font-bold text-xs text-[#211E1A] shrink-0">
                              {getInitials(user.name)}
                            </div>
                            <div className="min-w-0">
                              <span
                                className="font-semibold text-[14px] text-[#211E1A] line-clamp-1 leading-snug cursor-pointer hover:text-[#D92D2D] transition-colors"
                                onClick={() => setSelectedUser(user)}
                                title={`Inspect ${user.name}`}
                              >
                                {user.name}
                              </span>
                              <div className="text-[12px] text-[#514940] mt-0.5 flex flex-wrap items-center gap-x-2">
                                <span className="truncate">{user.email}</span>
                                <span className="text-[#71675D] font-mono text-[11px]">ID: {user.id}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <RoleBadge role={user.role} />
                        </td>

                        {/* Organization */}
                        <td className="py-3 px-3 whitespace-nowrap text-[#514940] text-[12px]">
                          <span className="line-clamp-1" title={user.organization || 'Independent'}>
                            {user.organization || 'Independent'}
                          </span>
                        </td>

                        {/* Registration Date */}
                        <td className="py-3 px-3 whitespace-nowrap text-[12px]">
                          <div>
                            <span className="font-mono text-[#211E1A]">{dateInfo.formatted}</span>
                            {dateInfo.relative && (
                              <span className="text-[#71675D] block text-[11px]">
                                {dateInfo.relative}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-3 whitespace-nowrap text-center">
                          <StatusBadge status={user.status} />
                        </td>

                        {/* Administrative Action Buttons */}
                        <td className="py-3 px-4 sm:px-5 whitespace-nowrap text-right">
                          <div className="inline-flex items-center gap-2">
                            {/* View Details Action */}
                            <button
                              type="button"
                              onClick={() => setSelectedUser(user)}
                              className="px-2.5 py-1 text-[12px] font-medium text-[#211E1A] bg-[#EAE3DA] hover:bg-[#D6D0C8] border border-[#B6AA9A] rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
                              aria-label={`View details for ${user.name}`}
                            >
                              Inspect
                            </button>

                            {/* Activate / Suspend Action */}
                            {isActive ? (
                              <button
                                type="button"
                                onClick={() => setActionConfirm({ user, type: 'suspend' })}
                                disabled={user.role === 'Super Admin'}
                                className="px-2.5 py-1 text-[12px] font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                                title={user.role === 'Super Admin' ? 'Super Admins cannot be suspended' : `Suspend ${user.name}`}
                              >
                                Suspend
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setActionConfirm({ user, type: 'activate' })}
                                className="px-2.5 py-1 text-[12px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                                title={`Activate ${user.name}`}
                              >
                                Activate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls Footer */}
          {!isLoading && paginatedUsers.length > 0 && (
            <div className="p-3.5 sm:p-4 border-t border-[#B6AA9A] bg-[#C1B3A0]/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] sm:text-[13px] text-[#514940]">
              {/* Results Range Count */}
              <div>
                Showing <strong className="text-[#211E1A]">{startIndex + 1}</strong> to{' '}
                <strong className="text-[#211E1A]">
                  {Math.min(startIndex + pageSize, totalFilteredItems)}
                </strong>{' '}
                of <strong className="text-[#211E1A]">{totalFilteredItems}</strong> accounts
                {(searchQuery || roleFilter !== 'ALL' || statusFilter !== 'ALL') && (
                  <span className="text-[#71675D] ml-1">(filtered from {users.length})</span>
                )}
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center gap-2">
                {/* Page Size Selector */}
                <div className="flex items-center gap-1.5 mr-2">
                  <span className="text-[#71675D] text-[11px]">Show:</span>
                  <select
                    value={pageSize}
                    onChange={e => setPageSize(Number(e.target.value))}
                    className="bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] rounded px-1.5 py-0.5 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
                  >
                    <option value={5}>5</option>
                    <option value={8}>8</option>
                    <option value={12}>12</option>
                    <option value={20}>20</option>
                  </select>
                </div>

                {/* Previous Page Button */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safeCurrentPage <= 1}
                  className="px-2.5 py-1 rounded bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#D6D0C8] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
                  aria-label="Previous page"
                >
                  ‹ Prev
                </button>

                {/* Page Number Indicator */}
                <span className="px-2 text-xs font-mono text-[#514940]">
                  Page <strong className="text-[#211E1A]">{safeCurrentPage}</strong> of{' '}
                  <strong className="text-[#211E1A]">{totalPages}</strong>
                </span>

                {/* Next Page Button */}
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  className="px-2.5 py-1 rounded bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#D6D0C8] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
                  aria-label="Next page"
                >
                  Next ›
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Details Inspection Modal */}
      <Modal
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        title="User Account Details"
      >
        {selectedUser && (
          <div className="space-y-5 text-[13px] text-[#514940]">
            {/* User Profile Header */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-[#C8BBAA] border border-[#B6AA9A]">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-[#EAE3DA] border border-[#B6AA9A] flex items-center justify-center font-bold text-base text-[#211E1A] shrink-0">
                  {getInitials(selectedUser.name)}
                </div>
                <div>
                  <h4 className="text-[16px] font-bold text-[#211E1A] leading-snug">
                    {selectedUser.name}
                  </h4>
                  <p className="text-[12px] text-[#514940]">{selectedUser.email}</p>
                  <span className="font-mono text-[11px] text-[#71675D]">ID: {selectedUser.id}</span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <StatusBadge status={selectedUser.status} />
                <RoleBadge role={selectedUser.role} />
              </div>
            </div>

            {/* Profile Data Grid */}
            <div className="grid grid-cols-2 gap-3.5 pt-1">
              <div className="p-3 rounded-lg bg-[#EAE3DA] border border-[#B6AA9A]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#71675D] block">
                  Organization / Affiliation
                </span>
                <span className="font-semibold text-[#211E1A] text-[13px] mt-1 block">
                  {selectedUser.organization || 'Independent Account'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[#EAE3DA] border border-[#B6AA9A]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#71675D] block">
                  Registration Date
                </span>
                <span className="font-semibold text-[#211E1A] text-[13px] mt-1 block font-mono">
                  {formatUserDate(selectedUser.joinedAt).formatted}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[#EAE3DA] border border-[#B6AA9A]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#71675D] block">
                  Platform Activity Scope
                </span>
                <span className="font-semibold text-[#211E1A] text-[13px] mt-1 block">
                  {selectedUser.role === 'Instructor'
                    ? `${selectedUser.coursesCount || 0} Published Courses`
                    : selectedUser.role === 'Learner'
                    ? `${selectedUser.enrollmentsCount || 0} Enrolled Courses`
                    : 'Platform Governance & Audit'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[#EAE3DA] border border-[#B6AA9A]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#71675D] block">
                  Last Active Timestamp
                </span>
                <span className="font-semibold text-[#211E1A] text-[13px] mt-1 block font-mono">
                  {formatUserDate(selectedUser.lastActive).formatted}
                </span>
              </div>
            </div>

            {/* Administrative Action Footer */}
            <div className="pt-4 border-t border-[#B6AA9A] flex items-center justify-between gap-3">
              <div>
                {selectedUser.status === 'Active' ? (
                  <Button
                    variant="danger"
                    disabled={selectedUser.role === 'Super Admin'}
                    onClick={() => {
                      const target = selectedUser;
                      setSelectedUser(null);
                      setActionConfirm({ user: target, type: 'suspend' });
                    }}
                    className="text-xs py-1.5 px-3"
                  >
                    Suspend User Account
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    onClick={() => {
                      const target = selectedUser;
                      setSelectedUser(null);
                      setActionConfirm({ user: target, type: 'activate' });
                    }}
                    className="text-xs py-1.5 px-3 bg-emerald-700 hover:bg-emerald-800"
                  >
                    Activate User Account
                  </Button>
                )}
              </div>

              <Button
                variant="secondary"
                onClick={() => setSelectedUser(null)}
                className="text-xs py-1.5 px-4"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmation Dialog: Suspend / Activate User */}
      <Modal
        isOpen={Boolean(actionConfirm)}
        onClose={() => !isSubmittingAction && setActionConfirm(null)}
        title={actionConfirm?.type === 'activate' ? 'Confirm User Activation' : 'Confirm User Suspension'}
      >
        {actionConfirm && (
          <div className="space-y-4 text-xs sm:text-sm text-[#514940]">
            <p>
              Are you sure you want to {actionConfirm.type === 'activate' ? 'activate' : 'suspend'}{' '}
              <strong className="text-[#211E1A]">"{actionConfirm.user.name}"</strong> (
              <span className="font-mono text-xs">{actionConfirm.user.email}</span>)?
            </p>

            {actionConfirm.type === 'suspend' ? (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-xs space-y-1.5 text-rose-950">
                <p>
                  • <strong>Account Access:</strong> User will be blocked from platform login, curriculum access, and communications.
                </p>
                <p>
                  • <strong>Enrollments & Content:</strong> Course records and progress history will be retained but inaccessible.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs space-y-1.5 text-emerald-950">
                <p>
                  • <strong>Account Access:</strong> User will immediately regain authorization to log in and participate on the platform.
                </p>
                <p>
                  • <strong>Standing:</strong> Account status will be marked as <strong className="text-emerald-800">Active</strong>.
                </p>
              </div>
            )}

            <div>
              <label
                htmlFor="user-action-reason"
                className="block text-xs font-semibold text-[#211E1A] mb-1"
              >
                Administrative Audit Note (Optional)
              </label>
              <textarea
                id="user-action-reason"
                rows="2"
                value={actionReason}
                onChange={e => setActionReason(e.target.value)}
                placeholder="Enter justification for compliance or audit records..."
                className="w-full p-2 text-xs bg-[#EAE3DA] text-[#211E1A] placeholder-[#71675D] border border-[#B6AA9A] rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
              />
            </div>

            <p className="text-[11px] text-[#71675D]">
              Note: This action records a development session status override in your browser.
            </p>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-[#B6AA9A]">
              <Button
                variant="secondary"
                onClick={() => setActionConfirm(null)}
                disabled={isSubmittingAction}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant={actionConfirm.type === 'activate' ? 'primary' : 'danger'}
                onClick={handleExecuteStatusAction}
                disabled={isSubmittingAction}
                className={`text-xs ${actionConfirm.type === 'activate' ? 'bg-emerald-700 hover:bg-emerald-800' : ''}`}
              >
                {isSubmittingAction
                  ? 'Processing...'
                  : actionConfirm.type === 'activate'
                  ? 'Confirm Activation'
                  : 'Confirm Suspension'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}
