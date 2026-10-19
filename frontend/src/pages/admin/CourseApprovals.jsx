import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import {
  adminService,
  getStoredReviews,
  clearStoredReviews,
  resolveCourseStatus,
  subscribeToReviewUpdates
} from '../../services/adminService';
import { mockPendingApprovals } from '../../data/mockDashboardData';

/**
 * StatusBadge
 * Semantic amber badge for courses awaiting administrative review
 */
function StatusBadge({ status }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100/80 text-amber-900 border border-amber-300 shrink-0">
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-amber-600" aria-hidden="true" />
      {status || 'Pending Review'}
    </span>
  );
}

/**
 * Helper to format date and relative age in queue
 */
function formatSubmissionDate(dateStr) {
  if (!dateStr) return { formatted: 'Recent', relative: 'Recent' };
  const date = new Date(dateStr);
  const formatted = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  // Calculate relative age based on current snapshot reference
  const now = new Date('2026-10-17T21:00:00Z');
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const relative = diffDays === 0 ? 'Today' : diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;

  return { formatted, relative };
}

export default function CourseApprovals() {
  const [rawCourses, setRawCourses] = useState(mockPendingApprovals);
  const [isLoading, setIsLoading] = useState(true);
  const [isSampleData, setIsSampleData] = useState(true);
  const [sessionReviews, setSessionReviews] = useState(getStoredReviews);

  // Subscribe to live review updates
  useEffect(() => {
    const unsubscribe = subscribeToReviewUpdates(setSessionReviews);
    return unsubscribe;
  }, []);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('date-asc'); // Default oldest first so urgent items are first

  // Load approvals queue with graceful mock fallback
  useEffect(() => {
    let isMounted = true;

    async function loadApprovalsQueue() {
      setIsLoading(true);
      try {
        const data = await adminService.getApprovalsQueue();
        if (isMounted) {
          if (Array.isArray(data) && data.length > 0) {
            setRawCourses(data);
            setIsSampleData(false);
          } else {
            setRawCourses(mockPendingApprovals);
            setIsSampleData(true);
          }
        }
      } catch {
        // Fallback to sample data when endpoint is not implemented
        if (isMounted) {
          setRawCourses(mockPendingApprovals);
          setIsSampleData(true);
        }
      } finally {
        if (isMounted) {
          setSessionReviews(getStoredReviews());
          setIsLoading(false);
        }
      }
    }

    loadApprovalsQueue();

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter out any courses that have been marked published or changes requested in local dev session
  const pendingCourses = useMemo(() => {
    return rawCourses.filter(c => {
      const decision = sessionReviews[c.id];
      const resolved = resolveCourseStatus(c, decision);
      return resolved === 'Pending Review';
    });
  }, [rawCourses, sessionReviews]);

  const reviewedCount = useMemo(() => {
    return rawCourses.filter(c => {
      const decision = sessionReviews[c.id];
      return decision && resolveCourseStatus(c, decision) !== 'Pending Review';
    }).length;
  }, [rawCourses, sessionReviews]);

  const handleResetSessionReviews = () => {
    clearStoredReviews();
  };

  // Dynamically derived categories from pending records
  const availableCategories = useMemo(() => {
    const set = new Set();
    pendingCourses.forEach(c => {
      if (c.category) set.add(c.category);
    });
    return Array.from(set).sort();
  }, [pendingCourses]);

  // Queue summary statistics
  const queueSummary = useMemo(() => {
    const count = pendingCourses.length;
    let oldestDate = null;

    pendingCourses.forEach(c => {
      const d = c.submittedAt || c.createdAt;
      if (d) {
        const time = new Date(d).getTime();
        if (!oldestDate || time < oldestDate) {
          oldestDate = time;
        }
      }
    });

    const oldestFormatted = oldestDate
      ? formatSubmissionDate(new Date(oldestDate).toISOString()).formatted
      : 'None';

    const oldestDaysAgo = oldestDate
      ? formatSubmissionDate(new Date(oldestDate).toISOString()).relative
      : '';

    return {
      count,
      oldestFormatted,
      oldestDaysAgo,
      categoryCount: availableCategories.length
    };
  }, [pendingCourses, availableCategories]);

  // Filtered and sorted submissions
  const filteredSubmissions = useMemo(() => {
    let result = [...pendingCourses];

    // Search query filter (title or instructor)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(c =>
        (c.title || '').toLowerCase().includes(q) ||
        (c.instructor || '').toLowerCase().includes(q)
      );
    }

    // Category filter
    if (categoryFilter !== 'ALL') {
      result = result.filter(c => c.category === categoryFilter);
    }

    // Sorting
    result.sort((a, b) => {
      const dateA = new Date(a.submittedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.submittedAt || b.createdAt || 0).getTime();

      switch (sortBy) {
        case 'date-asc':
          return dateA - dateB; // Oldest first (recommended for queues)
        case 'date-desc':
          return dateB - dateA; // Newest first
        case 'title-asc':
          return (a.title || '').localeCompare(b.title || '');
        case 'title-desc':
          return (b.title || '').localeCompare(a.title || '');
        default:
          return 0;
      }
    });

    return result;
  }, [pendingCourses, searchQuery, categoryFilter, sortBy]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('ALL');
    setSortBy('date-asc');
  };

  return (
    <PageContainer>
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="mb-2">
        <Link
          to="/admin/courses"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#514940] hover:text-[#D92D2D] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] rounded"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Course Management</span>
        </Link>
      </nav>

      {/* Page Heading & Header Controls */}
      <div className="pb-6 border-b border-[#B6AA9A]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[26px] sm:text-[30px] font-bold tracking-tight text-[#211E1A] font-sans leading-tight">
                Course Approvals
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                {queueSummary.count} Pending Review
              </span>
            </div>
            <p className="mt-1.5 text-[14px] leading-relaxed text-[#514940]">
              Review, inspect curriculum quality, and approve or request changes for course submissions from instructors.
            </p>
          </div>

          {/* Quick Navigation to Course Management */}
          <div className="flex items-center gap-3">
            <Link
              to="/admin/courses"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-[13px] font-semibold rounded-lg bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] hover:bg-[#D6D0C8] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
            >
              <span>View All Courses Catalog</span>
            </Link>
          </div>
        </div>

        {/* Development Mode Notice Banner */}
        {isSampleData && (
          <div className="mt-4 p-3.5 bg-[#C8BBAA] border border-[#B6AA9A] rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-[13px]">
            <div className="flex items-center gap-2.5 text-[#211E1A]">
              <span className="shrink-0 font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-[#D92D2D] text-white">
                Dev Mode
              </span>
              <span>
                <strong>Sample Approval Queue Active:</strong> Backend approval endpoints are currently in development. Submissions are representative development records.
                {reviewedCount > 0 && (
                  <span className="block sm:inline sm:ml-2 text-emerald-950 font-medium">
                    ({reviewedCount} reviewed in this session)
                  </span>
                )}
              </span>
            </div>
            {reviewedCount > 0 && (
              <button
                type="button"
                onClick={handleResetSessionReviews}
                className="text-xs font-semibold text-[#D92D2D] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] rounded shrink-0"
              >
                Reset session decisions
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="mt-6 space-y-6">
        {/* Restrained Queue Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
          {/* Card 1: Pending Queue Count */}
          <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-4 sm:p-5 shadow-xs">
            <span className="text-[12px] sm:text-[13px] font-semibold text-[#514940] block">
              Pending Submissions
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-[26px] sm:text-[30px] font-bold text-amber-900 leading-none font-sans">
                {queueSummary.count}
              </span>
              <span className="text-xs text-[#514940]">courses awaiting review</span>
            </div>
            <span className="text-[11px] text-[#71675D] mt-2 block">
              Directly actionable by administrators
            </span>
          </div>

          {/* Card 2: Oldest Pending Submission */}
          <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-4 sm:p-5 shadow-xs">
            <span className="text-[12px] sm:text-[13px] font-semibold text-[#514940] block">
              Oldest Submission
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-[20px] sm:text-[22px] font-bold text-[#211E1A] leading-none font-sans">
                {queueSummary.oldestFormatted}
              </span>
              {queueSummary.oldestDaysAgo && (
                <span className="text-xs font-medium text-[#D92D2D]">
                  ({queueSummary.oldestDaysAgo})
                </span>
              )}
            </div>
            <span className="text-[11px] text-[#71675D] mt-2 block">
              Longest waiting submission in queue
            </span>
          </div>

          {/* Card 3: Disciplines Represented */}
          <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-4 sm:p-5 shadow-xs">
            <span className="text-[12px] sm:text-[13px] font-semibold text-[#514940] block">
              Categories Represented
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-[26px] sm:text-[30px] font-bold text-[#211E1A] leading-none font-sans">
                {queueSummary.categoryCount}
              </span>
              <span className="text-xs text-[#514940]">disciplines</span>
            </div>
            <span className="text-[11px] text-[#71675D] mt-2 block">
              Across engineering, AI, and design
            </span>
          </div>
        </div>

        {/* Controls Bar: Search, Category Filter, and Sort */}
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
                placeholder="Search queue by course title or instructor..."
                aria-label="Search pending submissions by course title or instructor"
                className="w-full pl-9 pr-8 py-2 text-[13px] bg-[#EAE3DA] text-[#211E1A] placeholder-[#71675D] border border-[#B6AA9A] rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] focus-visible:bg-[#F3ECE4]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#71675D] hover:text-[#211E1A]"
                  aria-label="Clear search query"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-2.5 text-[13px]">
              {/* Category Filter */}
              <div className="flex items-center gap-1.5">
                <label htmlFor="approvals-category-filter" className="text-[#514940] font-medium shrink-0">
                  Category:
                </label>
                <select
                  id="approvals-category-filter"
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] rounded-lg px-2.5 py-1.5 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
                >
                  <option value="ALL">All Categories ({pendingCourses.length})</option>
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Order */}
              <div className="flex items-center gap-1.5">
                <label htmlFor="approvals-sort-filter" className="text-[#514940] font-medium shrink-0">
                  Sort:
                </label>
                <select
                  id="approvals-sort-filter"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] rounded-lg px-2.5 py-1.5 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
                >
                  <option value="date-asc">Oldest First (Priority)</option>
                  <option value="date-desc">Newest First</option>
                  <option value="title-asc">Title: A → Z</option>
                  <option value="title-desc">Title: Z → A</option>
                </select>
              </div>

              {/* Reset Filters Action */}
              {(searchQuery || categoryFilter !== 'ALL' || sortBy !== 'date-asc') && (
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

        {/* Approvals Queue Table */}
        <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center">
              <Loader size="medium" />
              <p className="mt-3 text-sm text-[#71675D]">Loading pending submissions queue...</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="py-12 px-4">
              <EmptyState
                title={
                  pendingCourses.length === 0
                    ? 'No courses pending review'
                    : 'No matching submissions found'
                }
                description={
                  pendingCourses.length === 0
                    ? 'All instructor course submissions have been reviewed and approved. New submissions will appear here automatically.'
                    : `No submissions match "${searchQuery}" with the selected category filter.`
                }
                action={
                  pendingCourses.length === 0 ? (
                    <Link
                      to="/admin/courses"
                      className="mt-3 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] hover:bg-[#D6D0C8] inline-block"
                    >
                      View All Courses
                    </Link>
                  ) : (
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
                <caption className="sr-only">Course approvals pending queue records</caption>
                <thead>
                  <tr className="border-b border-[#B6AA9A] bg-[#C1B3A0]/60 text-[#514940] uppercase tracking-wider text-[11px] font-bold">
                    <th scope="col" className="py-3 px-4 sm:px-5">
                      Course & Instructor
                    </th>
                    <th scope="col" className="py-3 px-3">
                      Category
                    </th>
                    <th scope="col" className="py-3 px-3">
                      Level & Scope
                    </th>
                    <th scope="col" className="py-3 px-3">
                      Submitted Date
                    </th>
                    <th scope="col" className="py-3 px-3 text-center">
                      Status
                    </th>
                    <th scope="col" className="py-3 px-4 sm:px-5 text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#B6AA9A] bg-[#C8BBAA]">
                  {filteredSubmissions.map(course => {
                    const dateInfo = formatSubmissionDate(course.submittedAt || course.createdAt);

                    return (
                      <tr key={course.id} className="hover:bg-[#EAE3DA]/50 transition-colors">
                        {/* Course Title and Instructor */}
                        <td className="py-3.5 px-4 sm:px-5 max-w-[280px] sm:max-w-[340px]">
                          <div className="min-w-0">
                            <span
                              className="font-semibold text-[14px] text-[#211E1A] line-clamp-1 leading-snug"
                              title={course.title}
                            >
                              {course.title}
                            </span>
                            <div className="text-[12px] text-[#514940] mt-0.5 flex flex-wrap items-center gap-x-2">
                              <span>Instructor: <strong className="font-medium text-[#211E1A]">{course.instructor || 'Unassigned'}</strong></span>
                              <span className="text-[#71675D] font-mono text-[11px]">ID: {course.id}</span>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-3 whitespace-nowrap text-[#514940]">
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#EAE3DA] text-[#514940] border border-[#B6AA9A]">
                            {course.category || 'General'}
                          </span>
                        </td>

                        {/* Level & Modules */}
                        <td className="py-3.5 px-3 whitespace-nowrap text-[#514940] text-[12px]">
                          <div>
                            <span className="font-medium text-[#211E1A]">{course.level || 'Beginner'}</span>
                            <span className="text-[#71675D] block text-[11px]">
                              {course.modulesCount ? `${course.modulesCount} modules` : 'Standard curriculum'}
                            </span>
                          </div>
                        </td>

                        {/* Submission Date & Wait Time */}
                        <td className="py-3.5 px-3 whitespace-nowrap text-[12px]">
                          <div>
                            <span className="font-mono text-[#211E1A]">{dateInfo.formatted}</span>
                            <span className="text-[#D92D2D] block text-[11px] font-medium">
                              {dateInfo.relative}
                            </span>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-3 whitespace-nowrap text-center">
                          <StatusBadge status={course.status} />
                        </td>

                        {/* Primary Review Action Button */}
                        <td className="py-3.5 px-4 sm:px-5 whitespace-nowrap text-right">
                          <Link
                            to={`/admin/review/${course.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-[#D92D2D] text-white hover:bg-[#B91C1C] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] shadow-2xs"
                            aria-label={`Review submission for ${course.title}`}
                          >
                            <span>Review Course</span>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Results Count Footer */}
          {!isLoading && filteredSubmissions.length > 0 && (
            <div className="p-3.5 sm:p-4 border-t border-[#B6AA9A] bg-[#C1B3A0]/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] sm:text-[13px] text-[#514940]">
              <div>
                Showing <strong className="text-[#211E1A]">{filteredSubmissions.length}</strong> of{' '}
                <strong className="text-[#211E1A]">{pendingCourses.length}</strong> pending submissions
                {(searchQuery || categoryFilter !== 'ALL') && (
                  <span className="text-[#71675D] ml-1">(filtered)</span>
                )}
              </div>
              <div className="text-[12px] text-[#71675D]">
                Select <strong className="text-[#211E1A]">Review Course</strong> to inspect syllabus details and render approval decision.
              </div>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
