import React, { useState, useEffect, useCallback } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import Loader from '../../components/common/Loader';
import ErrorMessage from '../../components/common/ErrorMessage';
import SummaryCard from '../../components/admin/dashboard/SummaryCard';
import ActivityChart from '../../components/admin/dashboard/ActivityChart';
import PendingApprovalsPanel from '../../components/admin/dashboard/PendingApprovalsPanel';
import RecentActivityPanel from '../../components/admin/dashboard/RecentActivityPanel';
import { dashboardService } from '../../services/dashboardService';

// Restrained SVG icons matching design system
function UsersIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function CoursesIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function ApprovalsIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function EnrollmentsIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}

function RefreshIcon({ className = 'w-4 h-4', isSpinning = false }) {
  return (
    <svg
      className={`${className} ${isSpinning ? 'animate-spin' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshNotice, setRefreshNotice] = useState(null);

  // Initial load
  const loadDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await dashboardService.getDashboardData();
      setData(res);
      setLastUpdated(res.lastUpdated || new Date());
    } catch (err) {
      setError('Unable to load initial dashboard dataset. Please check provider connection.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Dashboard-wide Refresh control
  const handleRefresh = async () => {
    if (isRefreshing) return;
    try {
      setIsRefreshing(true);
      setError(null);
      setRefreshNotice(null);

      const refreshed = await dashboardService.refreshDashboardData();
      // Keep existing data visible, update in place
      setData(refreshed);
      setLastUpdated(refreshed.lastUpdated || new Date());
      setRefreshNotice('Refreshed development sample snapshot. (Live API is not connected)');

      setTimeout(() => {
        setRefreshNotice(null);
      }, 4000);
    } catch (err) {
      setError('Live data is not connected. Unable to fetch server updates.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Freshness calculation (Stale only if older than 15 minutes)
  const calculateFreshness = () => {
    if (!lastUpdated) return { isStale: false, label: 'Connecting...', timeString: '' };
    const now = new Date();
    const diffMs = now.getTime() - new Date(lastUpdated).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const isStale = diffMins >= 15;

    const timeString = new Date(lastUpdated).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    return {
      isStale,
      diffMins,
      label: isStale ? 'Stale (> 15m)' : 'Fresh (< 15m)',
      timeString
    };
  };

  const freshness = calculateFreshness();

  return (
    <PageContainer>
      {/* Subtle Progress Bar during refresh (does not blank dashboard) */}
      {isRefreshing && (
        <div
          role="progressbar"
          aria-label="Refreshing dashboard data"
          aria-valuemin="0"
          aria-valuemax="100"
          className="fixed top-0 left-0 right-0 z-50 h-1 bg-[#EAE3DA] overflow-hidden"
        >
          <div className="h-full bg-[#D92D2D] w-full animate-pulse transition-all duration-300" />
        </div>
      )}

      {/* Page Heading & Refresh Controls */}
      <div className="pb-6 border-b border-[#B6AA9A]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-[26px] sm:text-[30px] font-bold tracking-tight text-[#211E1A] font-sans leading-tight">
              Platform Administration
            </h1>
            <p className="mt-1.5 text-[14px] leading-relaxed text-[#514940]">
              Centralized platform overview, metrics, activity monitoring, and pending administrative actions.
            </p>
          </div>

          {/* Refresh & Freshness Control */}
          <div className="flex flex-wrap items-center gap-3.5">
            {/* Freshness Badge */}
            <div className="flex items-center gap-2 text-[12px] sm:text-[13px]">
              <span className="text-[#71675D]">
                Snapshot: <span className="font-mono text-[#211E1A]">{freshness.timeString || 'Loading'}</span>
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                  freshness.isStale
                    ? 'bg-amber-100/70 text-amber-900 border-amber-300'
                    : 'bg-emerald-100/70 text-emerald-900 border-emerald-300'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 mr-1.5 rounded-full ${
                    freshness.isStale ? 'bg-amber-600' : 'bg-emerald-600'
                  }`}
                  aria-hidden="true"
                />
                {freshness.label}
              </span>
            </div>

            {/* Dashboard-wide Refresh Button */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-[13px] font-semibold rounded-lg bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] hover:bg-[#D6D0C8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Refresh dashboard metrics"
            >
              <RefreshIcon isSpinning={isRefreshing} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Development Sample Data Banner */}
        <div className="mt-4 p-3.5 bg-[#C8BBAA] border border-[#B6AA9A] rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-[13px]">
          <div className="flex items-center gap-2.5 text-[#211E1A]">
            <span className="shrink-0 font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-[#D92D2D] text-white">
              Dev Mode
            </span>
            <span>
              <strong>Sample Data Active:</strong> Backend API is currently in development. Metrics and trends are representative development records.
            </span>
          </div>

          {refreshNotice && (
            <span className="shrink-0 text-emerald-800 font-medium animate-fade-in text-[12px]">
              {refreshNotice}
            </span>
          )}
        </div>
      </div>

      {/* Error Message if refresh or load failed */}
      {error && (
        <div className="mt-4">
          <ErrorMessage message={error} />
        </div>
      )}

      {/* Initial Page Loading State */}
      {isLoading && !data ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader size="large" />
          <p className="mt-4 text-sm text-[#71675D]">
            Loading platform administration metrics...
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {/* Section 2: Four Summary Cards */}
          <section aria-label="Key Platform Metrics">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
              <SummaryCard
                title="Total Users"
                value={data?.summary?.totalUsers || 1280}
                description="Active learners, instructors, and admins"
                to="/admin/users"
                icon={UsersIcon}
              />
              <SummaryCard
                title="Total Courses"
                value={data?.summary?.totalCourses || 84}
                description="Published catalog & drafts in creation"
                to="/admin/approvals"
                icon={CoursesIcon}
              />
              <SummaryCard
                title="Pending Approvals"
                value={data?.summary?.pendingApprovals || 5}
                description="Awaiting administrative review"
                to="/admin/approvals"
                icon={ApprovalsIcon}
                badgeText="Action required"
              />
              <SummaryCard
                title="Total Enrollments"
                value={data?.summary?.totalEnrollments || 4320}
                description="Cumulative course student signups"
                to="/admin/reports"
                icon={EnrollmentsIcon}
              />
            </div>
          </section>

          {/* Section 3: Activity Chart (2 cols) & Pending Approvals (1 col) */}
          <section aria-label="Activity and Queue Overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
              <div className="lg:col-span-2">
                <ActivityChart trendsData={data?.trends || {}} />
              </div>
              <div className="lg:col-span-1">
                <PendingApprovalsPanel pendingCourses={data?.pendingApprovals || []} />
              </div>
            </div>
          </section>

          {/* Section 4: Recent Activity (Recent Users and Recent Courses side by side) */}
          <section aria-label="Recent Platform Records">
            <RecentActivityPanel
              users={data?.recentUsers || []}
              courses={data?.recentCourses || []}
            />
          </section>
        </div>
      )}
    </PageContainer>
  );
}
