import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import {
  notificationService,
  getLocalNotifications,
  getLocalUnreadCount,
  markAsRead,
  markAllAsRead,
  resetNotificationsState,
  subscribeToNotifications,
  formatRelativeTime,
  formatFullDate
} from '../../services/notificationService';

export default function Notifications() {
  const navigate = useNavigate();

  // Core state
  const [notifications, setNotifications] = useState(() => getLocalNotifications());
  const [unreadCount, setUnreadCount] = useState(() => getLocalUnreadCount());
  const [isBackend, setIsBackend] = useState(false);

  // Filters state
  const [readStatusFilter, setReadStatusFilter] = useState('all'); // 'all' | 'unread'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // UI state
  const [selectedNoticeForModal, setSelectedNoticeForModal] = useState(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState(null);

  // Synchronize notifications from service
  const reloadData = useCallback(async () => {
    try {
      const res = await notificationService.getNotifications();
      if (res && Array.isArray(res.notifications)) {
        setNotifications(res.notifications);
        setIsBackend(Boolean(res.isBackend));
        setUnreadCount(res.notifications.filter(n => !n.is_read).length);
        return;
      }
    } catch {
      // Fallback to local storage
    }

    const fallback = getLocalNotifications();
    setNotifications(fallback);
    setIsBackend(false);
    setUnreadCount(fallback.filter(n => !n.is_read).length);
  }, []);

  // Subscribe to reactive updates (broadcast across tabs and components)
  useEffect(() => {
    reloadData();
    const unsubscribe = subscribeToNotifications(() => {
      reloadData();
    });
    return unsubscribe;
  }, [reloadData]);

  // Auto-dismiss feedback notice
  useEffect(() => {
    if (!feedbackNotice) return;
    const timer = setTimeout(() => setFeedbackNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [feedbackNotice]);

  // Handle Mark All Read
  const handleMarkAllRead = async () => {
    await markAllAsRead();
    reloadData();
    setFeedbackNotice({
      type: 'success',
      message: 'All notifications marked as read.'
    });
  };

  // Handle Mark Single Read
  const handleMarkRead = async (e, id) => {
    e.stopPropagation();
    await markAsRead(id);
    reloadData();
    setFeedbackNotice({
      type: 'success',
      message: 'Notification marked as read.'
    });
  };

  // Handle clicking a notification card
  const handleCardClick = async (item) => {
    if (!item.is_read) {
      await markAsRead(item.id);
      reloadData();
    }

    if (item.link_url) {
      navigate(item.link_url);
    } else {
      setSelectedNoticeForModal(item);
    }
  };

  // Handle Dev Reset
  const handleConfirmReset = () => {
    resetNotificationsState();
    setIsResetConfirmOpen(false);
    reloadData();
    setFeedbackNotice({
      type: 'info',
      message: 'Restored default prototype notification records.'
    });
  };

  // Available unique categories
  const categories = useMemo(() => {
    const set = new Set();
    notifications.forEach(n => {
      if (n.category) set.add(n.category);
    });
    return Array.from(set);
  }, [notifications]);

  // Derived filtered notifications list
  const filteredNotifications = useMemo(() => {
    return notifications.filter(item => {
      // 1. Read status filter
      if (readStatusFilter === 'unread' && item.is_read) {
        return false;
      }

      // 2. Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = (item.title || '').toLowerCase().includes(q);
        const matchesMsg = (item.message || '').toLowerCase().includes(q);
        const matchesCat = (item.category || '').toLowerCase().includes(q);
        const matchesType = (item.type || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesMsg && !matchesCat && !matchesType) {
          return false;
        }
      }

      return true;
    });
  }, [notifications, readStatusFilter, selectedCategory, searchQuery]);

  return (
    <PageContainer>
      {/* Breadcrumb Navigation matching Users / Organizations / ActivityLogs */}
      <nav className="flex text-xs text-[#514940] mb-3" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2">
          <li>
            <Link to="/admin/dashboard" className="text-[#514940] hover:text-[#D92D2D] transition-colors">
              Super Admin
            </Link>
          </li>
          <li className="text-[#71675D]">/</li>
          <li className="font-semibold text-[#211E1A]" aria-current="page">
            Notifications
          </li>
        </ol>
      </nav>

      {/* Page Heading & Action Bar matching ActivityLogs / Reports */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-[#B6AA9A]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[28px] sm:text-[32px] font-bold text-[#211E1A] leading-tight tracking-tight font-sans">
              Administrative Notifications
            </h1>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#EAE3DA] text-[#514940] border border-[#B6AA9A] shrink-0">
              {unreadCount > 0 ? `${unreadCount} Unread` : 'All Caught Up'}
            </span>
          </div>
          <p className="mt-1 text-sm text-[#514940]">
            Review platform alerts, course review requests, system health notices, and organizational events.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="flex items-center gap-2 text-sm shadow-xs"
            aria-label="Mark all notifications as read"
          >
            <svg className="w-4 h-4 text-[#D92D2D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>Mark all read</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsResetConfirmOpen(true)}
            className="text-xs text-[#71675D] hover:text-[#D92D2D]"
            title="Reset notifications to default mock data"
          >
            Reset (Test)
          </Button>
        </div>
      </div>

      {/* Data Source Transparency Banner matching Organizations / ActivityLogs */}
      <div className="mt-4 flex items-center justify-between text-xs text-[#514940] bg-[#EAE3DA]/60 border border-[#B6AA9A] px-3 py-2 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
          <span>
            Data Source:{' '}
            <strong className="text-[#211E1A]">
              {isBackend ? 'Live Platform Notifications API (/api/v1/notifications)' : 'Development Prototype (Local Storage Session)'}
            </strong>
          </span>
        </div>
        <span className="text-[11px] text-[#71675D]">
          {isBackend ? 'Live Sync' : 'Simulated data • Stored in browser localStorage'}
        </span>
      </div>

      {/* Feedback Toast Notification */}
      {feedbackNotice && (
        <div
          className={`mt-4 p-3 rounded-lg border flex items-center justify-between gap-2 text-xs font-medium transition-all ${
            feedbackNotice.type === 'info'
              ? 'bg-[#EAE3DA] text-[#211E1A] border-[#B6AA9A]'
              : 'bg-emerald-100/90 text-emerald-950 border-emerald-300'
          }`}
          role="status"
        >
          <div className="flex items-center gap-2">
            <span className="text-emerald-700 font-bold">✓</span>
            <span>{feedbackNotice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackNotice(null)}
            className="text-xs font-bold hover:underline ml-auto"
            aria-label="Dismiss feedback notice"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary KPI Cards matching ActivityLogs / Reports style */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6">
        {/* Total Notifications */}
        <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-[#514940] block">
            Total Notifications
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#211E1A]">
              {notifications.length}
            </span>
            <span className="text-xs font-medium text-[#71675D]">
              All records
            </span>
          </div>
        </div>

        {/* Unread Alerts */}
        <div className={`border rounded-xl p-4 shadow-xs transition-colors ${
          unreadCount > 0 ? 'bg-[#C8BBAA] border-[#D92D2D]' : 'bg-[#C8BBAA] border-[#B6AA9A]'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#D92D2D] block">
              Unread Alerts
            </span>
            {unreadCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#D92D2D] animate-ping" aria-hidden="true" />
            )}
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#D92D2D]">
              {unreadCount}
            </span>
            <span className="text-xs font-medium text-[#71675D]">
              {unreadCount > 0 ? 'Requires attention' : 'All caught up'}
            </span>
          </div>
        </div>

        {/* Processed / Read */}
        <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-[#514940] block">
            Processed Records
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-[#211E1A]">
              {notifications.length - unreadCount}
            </span>
            <span className="text-xs font-medium text-[#71675D]">
              Read notices
            </span>
          </div>
        </div>

        {/* Audit Log Reference */}
        <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#514940] block">
                Related Ledger
              </span>
              <Link to="/admin/activity-logs" className="text-xs font-bold text-[#D92D2D] hover:underline">
                View &rarr;
              </Link>
            </div>
            <span className="text-sm font-semibold text-[#211E1A] mt-1 block">
              Activity Logs
            </span>
          </div>
          <span className="text-[11px] text-[#71675D]">
            Audit trail records
          </span>
        </div>
      </div>

      {/* Control Toolbar: Interactive Filter Tabs, Search, and Category Select */}
      <div className="mt-6 bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-4 shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          {/* Read Status Filter Tabs - Entire button is clickable and state is strictly reactive */}
          <div
            className="flex items-center bg-[#E2DCD4] p-1 rounded-lg border border-[#B6AA9A] shrink-0"
            role="tablist"
            aria-label="Filter notifications by read status"
          >
            <button
              type="button"
              role="tab"
              id="filter-tab-all"
              aria-selected={readStatusFilter === 'all'}
              aria-controls="notifications-list"
              onClick={() => setReadStatusFilter('all')}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] ${
                readStatusFilter === 'all'
                  ? 'bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] shadow-xs'
                  : 'text-[#514940] hover:text-[#211E1A] hover:bg-[#EAE3DA]/50'
              }`}
            >
              <span>All Notifications</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#E2DCD4] text-[#514940] border border-[#B6AA9A] pointer-events-none">
                {notifications.length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              id="filter-tab-unread"
              aria-selected={readStatusFilter === 'unread'}
              aria-controls="notifications-list"
              onClick={() => setReadStatusFilter('unread')}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] ${
                readStatusFilter === 'unread'
                  ? 'bg-[#EAE3DA] text-[#D92D2D] border border-[#B6AA9A] shadow-xs'
                  : 'text-[#514940] hover:text-[#211E1A] hover:bg-[#EAE3DA]/50'
              }`}
            >
              <span>Unread</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] pointer-events-none font-bold ${
                unreadCount > 0
                  ? 'bg-[#D92D2D] text-white'
                  : 'bg-[#E2DCD4] text-[#71675D] border border-[#B6AA9A]'
              }`}>
                {unreadCount}
              </span>
            </button>
          </div>

          {/* Search Input and Category Selector */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 md:max-w-xl">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#71675D]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, message, or domain..."
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-lg bg-[#EAE3DA] border border-[#B6AA9A] text-[#211E1A] placeholder-[#71675D] focus:outline-none focus:ring-2 focus:ring-[#D92D2D] transition-colors"
                aria-label="Search notifications"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#71675D] hover:text-[#211E1A]"
                  aria-label="Clear search input"
                >
                  &times;
                </button>
              )}
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="py-2 px-3 text-xs sm:text-sm rounded-lg bg-[#EAE3DA] border border-[#B6AA9A] text-[#211E1A] focus:outline-none focus:ring-2 focus:ring-[#D92D2D] transition-colors shrink-0"
              aria-label="Filter notifications by category"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Notifications List Section */}
      <div className="mt-6 space-y-3" id="notifications-list" role="region" aria-live="polite">
        {filteredNotifications.length === 0 ? (
          <div className="bg-[#EAE3DA] rounded-xl border border-[#B6AA9A] p-8 shadow-xs">
            <EmptyState
              title={
                readStatusFilter === 'unread'
                  ? 'All Caught Up!'
                  : searchQuery || selectedCategory !== 'all'
                  ? 'No matching notifications found'
                  : 'No notifications available'
              }
              description={
                readStatusFilter === 'unread'
                  ? 'You currently have zero unread notifications in your queue.'
                  : searchQuery || selectedCategory !== 'all'
                  ? 'No notifications match your active search and category filters. Try clearing or relaxing your criteria.'
                  : 'No administrative notifications exist in the platform ledger at this time.'
              }
              actionLabel={
                readStatusFilter === 'unread'
                  ? 'View all notifications'
                  : searchQuery || selectedCategory !== 'all'
                  ? 'Clear filters'
                  : undefined
              }
              onAction={
                readStatusFilter === 'unread'
                  ? () => setReadStatusFilter('all')
                  : searchQuery || selectedCategory !== 'all'
                  ? () => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                    }
                  : undefined
              }
            />
          </div>
        ) : (
          filteredNotifications.map((item) => {
            const hasDestination = Boolean(item.link_url);

            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => handleCardClick(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardClick(item);
                  }
                }}
                className={`group w-full text-left bg-[#EAE3DA] rounded-xl border p-4.5 transition-all shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] cursor-pointer ${
                  item.is_read
                    ? 'border-[#B6AA9A] border-l-4 border-l-[#B6AA9A] opacity-85 hover:opacity-100 hover:border-[#D92D2D]'
                    : 'border-[#B6AA9A] border-l-4 border-l-[#D92D2D] hover:shadow-md'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Domain Indicator, Metadata, Title, and Message */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Status Dot */}
                    <div className="mt-1 shrink-0">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: item.indicatorColor || '#D92D2D' }}
                        aria-hidden="true"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Meta Tags: Category, Unread Badge, Relative Time */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {item.category && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#E2DCD4] text-[#514940] border border-[#B6AA9A]">
                            {item.category}
                          </span>
                        )}

                        {!item.is_read && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D92D2D] text-white">
                            Unread
                          </span>
                        )}

                        <span className="text-[11px] text-[#71675D] font-medium" title={formatFullDate(item.created_at)}>
                          {formatRelativeTime(item.created_at)}
                        </span>
                      </div>

                      {/* Title */}
                      <h2 className={`text-sm tracking-tight truncate ${
                        item.is_read ? 'text-[#211E1A] font-semibold' : 'text-[#211E1A] font-bold'
                      }`}>
                        {item.title}
                      </h2>

                      {/* Message Body */}
                      <p className="text-xs text-[#514940] mt-0.5 leading-relaxed">
                        {item.message}
                      </p>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-[#B6AA9A]/40 w-full sm:w-auto justify-between sm:justify-end">
                    {/* Navigation or Detail Button */}
                    {hasDestination ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#E2DCD4] text-[#211E1A] border border-[#B6AA9A] group-hover:border-[#D92D2D] group-hover:text-[#D92D2D] transition-colors">
                        <span>Open</span>
                        <span aria-hidden="true">&rarr;</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedNoticeForModal(item);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#E2DCD4] text-[#514940] border border-[#B6AA9A] hover:bg-[#D6D0C8] transition-colors"
                      >
                        <span>View Details</span>
                      </button>
                    )}

                    {/* Mark Read Quick Action */}
                    {!item.is_read ? (
                      <button
                        type="button"
                        onClick={(e) => handleMarkRead(e, item.id)}
                        className="p-1.5 rounded-lg text-[#71675D] hover:text-[#D92D2D] hover:bg-[#C8BBAA]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] transition-colors"
                        title="Mark as read"
                        aria-label={`Mark "${item.title}" as read`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    ) : (
                      <span className="text-[11px] font-medium text-[#71675D] px-2 py-1">
                        Read
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Notice Detail Modal */}
      {selectedNoticeForModal && (
        <Modal
          isOpen={Boolean(selectedNoticeForModal)}
          onClose={() => setSelectedNoticeForModal(null)}
          title={selectedNoticeForModal.title}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: selectedNoticeForModal.indicatorColor || '#D92D2D' }}
                aria-hidden="true"
              />
              <span className="text-xs font-semibold text-[#514940] uppercase tracking-wider">
                {selectedNoticeForModal.category || 'System Notice'}
              </span>
              <span className="text-xs text-[#71675D]">
                • {formatFullDate(selectedNoticeForModal.created_at)}
              </span>
            </div>

            <div className="bg-[#E2DCD4] p-3.5 rounded-lg border border-[#B6AA9A] text-xs text-[#211E1A] leading-relaxed">
              {selectedNoticeForModal.message}
            </div>

            <div className="text-[11px] text-[#71675D] space-y-1">
              <p>Notification ID: <code className="bg-[#E2DCD4] px-1 py-0.5 rounded border border-[#B6AA9A]">{selectedNoticeForModal.id}</code></p>
              <p>Classification: <code className="bg-[#E2DCD4] px-1 py-0.5 rounded border border-[#B6AA9A]">{selectedNoticeForModal.type}</code></p>
              <p>Destination: {selectedNoticeForModal.link_url || 'None (Informational platform notice)'}</p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#B6AA9A]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedNoticeForModal(null)}
              >
                Close Notice
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Dialog for Resetting Session State */}
      {isResetConfirmOpen && (
        <Modal
          isOpen={isResetConfirmOpen}
          onClose={() => setIsResetConfirmOpen(false)}
          title="Reset Notification Session Data?"
        >
          <div className="space-y-4">
            <p className="text-xs text-[#514940] leading-relaxed">
              This action will reset all notification read states stored in your local storage back to their default factory values (3 unread and 3 read).
            </p>
            <div className="flex justify-end gap-2 pt-3 border-t border-[#B6AA9A]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsResetConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmReset}
              >
                Confirm Reset
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </PageContainer>
  );
}
