import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import { courseService } from '../../services/courseService';
import { mockCourses } from '../../data/mockCourses';
import {
  getStoredReviews,
  clearStoredReviews,
  saveStoredReview,
  applyCourseReviews,
  subscribeToReviewUpdates
} from '../../utils/courseReviews';

/**
 * StatusBadge
 * Semantic badge styling aligned with dashboard theme conventions:
 * - Published / Active: Emerald
 * - Pending Review: Amber
 * - Changes Requested / Rejected: Rose
 * - Draft / Archived: Warm neutral taupe
 */
function StatusBadge({ status }) {
  const normalized = (status || '').toLowerCase();

  if (normalized === 'published' || normalized === 'active') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100/80 text-emerald-900 border border-emerald-300 shrink-0">
        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
        {status}
      </span>
    );
  }

  if (normalized === 'pending review' || normalized === 'pending') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100/80 text-amber-900 border border-amber-300 shrink-0">
        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-amber-600" aria-hidden="true" />
        {status}
      </span>
    );
  }

  if (normalized === 'changes requested' || normalized === 'rejected') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100/80 text-rose-900 border border-rose-300 shrink-0">
        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-rose-600" aria-hidden="true" />
        {status}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#EAE3DA] text-[#514940] border border-[#B6AA9A] shrink-0">
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-stone-500" aria-hidden="true" />
      {status || 'Draft'}
    </span>
  );
}

export default function Courses() {
  const [rawCourses, setRawCourses] = useState(mockCourses);
  const [sessionReviews, setSessionReviews] = useState(getStoredReviews);
  const [isLoading, setIsLoading] = useState(true);
  const [isSampleData, setIsSampleData] = useState(true);
  const [statusNotice, setStatusNotice] = useState(null);

  // Subscribe to live review updates across tabs and navigation
  useEffect(() => {
    const unsubscribe = subscribeToReviewUpdates(setSessionReviews);
    return unsubscribe;
  }, []);

  // Filter & Search Controls State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('date-desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Fetch courses with API fallback to mock data
  useEffect(() => {
    let isMounted = true;

    async function loadCourses() {
      setIsLoading(true);
      try {
        const data = await courseService.getCourses();
        if (isMounted) {
          if (Array.isArray(data) && data.length > 0) {
            setRawCourses(data);
            setIsSampleData(false);
          } else {
            setRawCourses(mockCourses);
            setIsSampleData(true);
          }
        }
      } catch {
        // Fallback gracefully to mock data when backend endpoint is in development
        if (isMounted) {
          setRawCourses(mockCourses);
          setIsSampleData(true);
        }
      } finally {
        if (isMounted) {
          setSessionReviews(getStoredReviews());
          setIsLoading(false);
        }
      }
    }

    loadCourses();

    return () => {
      isMounted = false;
    };
  }, []);

  // Derive resolved course list by overlaying session review decisions
  const courses = useMemo(() => {
    return applyCourseReviews(rawCourses, sessionReviews);
  }, [rawCourses, sessionReviews]);

  const reviewedCount = useMemo(() => {
    return Object.keys(sessionReviews).length;
  }, [sessionReviews]);

  // Reset to first page whenever search, status, or category filter updates
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, categoryFilter, pageSize, sortBy]);

  // Derived unique categories from current course dataset
  const availableCategories = useMemo(() => {
    const set = new Set();
    courses.forEach(c => {
      if (c.category) set.add(c.category);
    });
    return Array.from(set).sort();
  }, [courses]);

  // Live summary metric cards calculated directly from loaded dataset
  const summaryMetrics = useMemo(() => {
    const total = courses.length;
    const published = courses.filter(c => c.status === 'Published').length;
    const pending = courses.filter(c => c.status === 'Pending Review').length;
    const drafts = courses.filter(c => c.status === 'Draft' || c.status === 'Archived').length;
    const changesRequested = courses.filter(c => c.status === 'Changes Requested').length;
    return { total, published, pending, drafts, changesRequested };
  }, [courses]);

  // Filter and sort pipeline
  const filteredAndSortedCourses = useMemo(() => {
    let result = [...courses];

    // Search filter: matching course title or instructor
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(c =>
        (c.title || '').toLowerCase().includes(q) ||
        (c.instructor || '').toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter(c => c.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== 'ALL') {
      result = result.filter(c => c.category === categoryFilter);
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'title-asc':
          return (a.title || '').localeCompare(b.title || '');
        case 'title-desc':
          return (b.title || '').localeCompare(a.title || '');
        case 'date-desc':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case 'date-asc':
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        case 'enrolled-desc':
          return (b.enrolledCount || 0) - (a.enrolledCount || 0);
        case 'enrolled-asc':
          return (a.enrolledCount || 0) - (b.enrolledCount || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [courses, searchQuery, statusFilter, categoryFilter, sortBy]);

  // Pagination calculation
  const totalFilteredItems = filteredAndSortedCourses.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedCourses = filteredAndSortedCourses.slice(startIndex, startIndex + pageSize);

  // Local administrative action: toggle course archive/publish state
  const handleToggleArchiveCourse = (courseId, currentStatus) => {
    const newStatus = currentStatus === 'Archived' ? 'Published' : 'Archived';
    if (sessionReviews[courseId]) {
      saveStoredReview(courseId, {
        ...sessionReviews[courseId],
        status: newStatus,
        decision: newStatus
      });
    } else {
      setRawCourses(prev =>
        prev.map(c => (c.id === courseId ? { ...c, status: newStatus } : c))
      );
    }

    setStatusNotice(`Course status updated to "${newStatus}" locally in development session.`);
    setTimeout(() => {
      setStatusNotice(null);
    }, 4500);
  };

  const handleResetSessionReviews = () => {
    clearStoredReviews();
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    setSortBy('date-desc');
  };

  return (
    <PageContainer>
      {/* Page Header */}
      <div className="pb-6 border-b border-[#B6AA9A]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-[26px] sm:text-[30px] font-bold tracking-tight text-[#211E1A] font-sans leading-tight">
              Course Management
            </h1>
            <p className="mt-1.5 text-[14px] leading-relaxed text-[#514940]">
              Centralized catalog oversight, publication states, review queues, and course administration.
            </p>
          </div>

          {/* Header Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Link to existing Review Approvals queue */}
            <Link
              to="/admin/approvals"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-[13px] font-semibold rounded-lg bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] hover:bg-[#D6D0C8] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
            >
              <span>Approvals Queue</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                {summaryMetrics.pending}
              </span>
            </Link>

            {/* Link to existing course creation flow */}
            <Link
              to="/instructor/courses/new"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-[13px] font-semibold rounded-lg bg-[#D92D2D] text-white hover:bg-[#B91C1C] shadow-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
              title="Navigate to course creation workflow"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Create Course</span>
            </Link>
          </div>
        </div>

        {/* Development Mode Sample Notice */}
        {isSampleData && (
          <div className="mt-4 p-3.5 bg-[#C8BBAA] border border-[#B6AA9A] rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-[13px]">
            <div className="flex items-center gap-2.5 text-[#211E1A]">
              <span className="shrink-0 font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-[#D92D2D] text-white">
                Dev Mode
              </span>
              <span>
                <strong>Sample Course Data Active:</strong> Backend catalog API is currently in development. Course records and statuses are representative development snapshots.
                {reviewedCount > 0 && (
                  <span className="block sm:inline sm:ml-2 text-emerald-950 font-medium">
                    ({reviewedCount} reviewed in this session)
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {statusNotice && (
                <span className="shrink-0 text-emerald-800 font-medium animate-fade-in text-[12px]">
                  {statusNotice}
                </span>
              )}
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
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="mt-6 space-y-6">
        {/* Course Summary Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`p-4 sm:p-5 rounded-xl border text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] ${
              statusFilter === 'ALL'
                ? 'bg-[#C8BBAA] border-[#D92D2D] shadow-xs'
                : 'bg-[#C8BBAA] border-[#B6AA9A] hover:border-[#71675D]'
            }`}
          >
            <span className="text-[12px] sm:text-[13px] font-semibold text-[#514940] block">
              Total Courses
            </span>
            <span className="text-[26px] sm:text-[30px] font-bold text-[#211E1A] mt-1 block leading-none font-sans">
              {summaryMetrics.total}
            </span>
            <span className="text-[11px] text-[#71675D] mt-1.5 block">
              Full registered catalog
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('Published')}
            className={`p-4 sm:p-5 rounded-xl border text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] ${
              statusFilter === 'Published'
                ? 'bg-[#C8BBAA] border-[#D92D2D] shadow-xs'
                : 'bg-[#C8BBAA] border-[#B6AA9A] hover:border-[#71675D]'
            }`}
          >
            <span className="text-[12px] sm:text-[13px] font-semibold text-[#514940] block">
              Published
            </span>
            <span className="text-[26px] sm:text-[30px] font-bold text-emerald-900 mt-1 block leading-none font-sans">
              {summaryMetrics.published}
            </span>
            <span className="text-[11px] text-[#71675D] mt-1.5 block">
              Live for student enrollment
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('Pending Review')}
            className={`p-4 sm:p-5 rounded-xl border text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] ${
              statusFilter === 'Pending Review'
                ? 'bg-[#C8BBAA] border-[#D92D2D] shadow-xs'
                : 'bg-[#C8BBAA] border-[#B6AA9A] hover:border-[#71675D]'
            }`}
          >
            <span className="text-[12px] sm:text-[13px] font-semibold text-[#514940] block">
              Pending Review
            </span>
            <span className="text-[26px] sm:text-[30px] font-bold text-amber-900 mt-1 block leading-none font-sans">
              {summaryMetrics.pending}
            </span>
            <span className="text-[11px] text-[#71675D] mt-1.5 block">
              Awaiting admin decision
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'Draft' ? 'Archived' : 'Draft')}
            className={`p-4 sm:p-5 rounded-xl border text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] ${
              statusFilter === 'Draft' || statusFilter === 'Archived'
                ? 'bg-[#C8BBAA] border-[#D92D2D] shadow-xs'
                : 'bg-[#C8BBAA] border-[#B6AA9A] hover:border-[#71675D]'
            }`}
          >
            <span className="text-[12px] sm:text-[13px] font-semibold text-[#514940] block">
              Draft / Archived
            </span>
            <span className="text-[26px] sm:text-[30px] font-bold text-[#514940] mt-1 block leading-none font-sans">
              {summaryMetrics.drafts}
            </span>
            <span className="text-[11px] text-[#71675D] mt-1.5 block">
              In progress or retired
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
                placeholder="Search by course title or instructor..."
                aria-label="Search courses by title or instructor"
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
              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <label htmlFor="course-status-filter" className="text-[#514940] font-medium shrink-0">
                  Status:
                </label>
                <select
                  id="course-status-filter"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] rounded-lg px-2.5 py-1.5 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
                >
                  <option value="ALL">All Statuses ({courses.length})</option>
                  <option value="Published">Published ({summaryMetrics.published})</option>
                  <option value="Pending Review">Pending Review ({summaryMetrics.pending})</option>
                  <option value="Changes Requested">Changes Requested ({summaryMetrics.changesRequested})</option>
                  <option value="Draft">Draft</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1.5">
                <label htmlFor="course-category-filter" className="text-[#514940] font-medium shrink-0">
                  Category:
                </label>
                <select
                  id="course-category-filter"
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] rounded-lg px-2.5 py-1.5 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
                >
                  <option value="ALL">All Categories</option>
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort By Filter */}
              <div className="flex items-center gap-1.5">
                <label htmlFor="course-sort-filter" className="text-[#514940] font-medium shrink-0">
                  Sort:
                </label>
                <select
                  id="course-sort-filter"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] rounded-lg px-2.5 py-1.5 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
                >
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="title-asc">Title: A → Z</option>
                  <option value="title-desc">Title: Z → A</option>
                  <option value="enrolled-desc">Enrolled: High → Low</option>
                  <option value="enrolled-asc">Enrolled: Low → High</option>
                </select>
              </div>

              {/* Clear Filters Reset Button */}
              {(searchQuery || statusFilter !== 'ALL' || categoryFilter !== 'ALL' || sortBy !== 'date-desc') && (
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

        {/* Course Records Table Section */}
        <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center">
              <Loader size="medium" />
              <p className="mt-3 text-sm text-[#71675D]">Loading course records...</p>
            </div>
          ) : paginatedCourses.length === 0 ? (
            <div className="py-12 px-4">
              <EmptyState
                title="No matching courses found"
                description={
                  searchQuery || statusFilter !== 'ALL' || categoryFilter !== 'ALL'
                    ? `No course records match your current search "${searchQuery}" or selected filters.`
                    : 'No course records are currently available on the platform.'
                }
                action={
                  (searchQuery || statusFilter !== 'ALL' || categoryFilter !== 'ALL') && (
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
                <caption className="sr-only">Course management records list</caption>
                <thead>
                  <tr className="border-b border-[#B6AA9A] bg-[#C1B3A0]/60 text-[#514940] uppercase tracking-wider text-[11px] font-bold">
                    <th scope="col" className="py-3 px-4 sm:px-5">
                      Course & Instructor
                    </th>
                    <th scope="col" className="py-3 px-3">
                      Category
                    </th>
                    <th scope="col" className="py-3 px-3">
                      Level
                    </th>
                    <th scope="col" className="py-3 px-3 text-right">
                      Enrolled
                    </th>
                    <th scope="col" className="py-3 px-3">
                      Date
                    </th>
                    <th scope="col" className="py-3 px-3 text-center">
                      Status
                    </th>
                    <th scope="col" className="py-3 px-4 sm:px-5 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#B6AA9A] bg-[#C8BBAA]">
                  {paginatedCourses.map(course => {
                    const formattedDate = course.createdAt
                      ? new Date(course.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      : 'Recent';

                    const isPending = course.status === 'Pending Review';

                    return (
                      <tr key={course.id} className="hover:bg-[#EAE3DA]/50 transition-colors">
                        {/* Course Title and Instructor */}
                        <td className="py-3 px-4 sm:px-5 max-w-[280px] sm:max-w-[340px]">
                          <div className="min-w-0">
                            <span
                              className="font-semibold text-[14px] text-[#211E1A] line-clamp-1 leading-snug"
                              title={course.title}
                            >
                              {course.title}
                            </span>
                            <div className="text-[12px] text-[#514940] mt-0.5 flex flex-wrap items-center gap-x-2">
                              <span>Instructor: <strong className="font-medium text-[#211E1A]">{course.instructor || 'Unassigned'}</strong></span>
                              {course.modulesCount > 0 && (
                                <>
                                  <span className="text-[#71675D]">•</span>
                                  <span className="text-[#71675D]">{course.modulesCount} modules</span>
                                </>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-3 whitespace-nowrap text-[#514940]">
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#EAE3DA] text-[#514940] border border-[#B6AA9A]">
                            {course.category || 'General'}
                          </span>
                        </td>

                        {/* Level */}
                        <td className="py-3 px-3 whitespace-nowrap text-[#71675D] text-[12px]">
                          {course.level || 'Beginner'}
                        </td>

                        {/* Enrollment Count */}
                        <td className="py-3 px-3 whitespace-nowrap font-mono text-[13px] text-right font-medium text-[#211E1A]">
                          {typeof course.enrolledCount === 'number'
                            ? course.enrolledCount.toLocaleString()
                            : '0'}
                        </td>

                        {/* Date Created/Submitted */}
                        <td className="py-3 px-3 whitespace-nowrap text-[12px] text-[#71675D] font-mono">
                          {formattedDate}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-3 whitespace-nowrap text-center">
                          <StatusBadge status={course.status} />
                        </td>

                        {/* Administrative Actions */}
                        <td className="py-3 px-4 sm:px-5 whitespace-nowrap text-right">
                          <div className="inline-flex items-center gap-2">
                            {/* Review action for pending submissions or review records */}
                            {(isPending || course.id.startsWith('c-app-')) && (
                              <Link
                                to={`/admin/review/${course.id}`}
                                className="px-2.5 py-1 text-[12px] font-semibold text-[#D92D2D] bg-[#EAE3DA] hover:bg-[#D6D0C8] border border-[#B6AA9A] rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
                                aria-label={`Review submission for ${course.title}`}
                              >
                                {isPending ? 'Review →' : 'Review'}
                              </Link>
                            )}

                            {/* View catalog page for published courses */}
                            {course.status === 'Published' && (
                              <Link
                                to={`/courses/${course.id}`}
                                className="px-2.5 py-1 text-[12px] font-medium text-[#211E1A] bg-[#EAE3DA] hover:bg-[#D6D0C8] border border-[#B6AA9A] rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
                                aria-label={`View catalog page for ${course.title}`}
                              >
                                View
                              </Link>
                            )}

                            {/* Status management toggle button */}
                            {course.status !== 'Pending Review' && (
                              <button
                                type="button"
                                onClick={() => handleToggleArchiveCourse(course.id, course.status)}
                                className="px-2 py-1 text-[11px] font-medium text-[#71675D] hover:text-[#211E1A] hover:bg-[#EAE3DA] rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
                                title={course.status === 'Archived' ? 'Restore to published status' : 'Archive course from catalog'}
                              >
                                {course.status === 'Archived' ? 'Restore' : 'Archive'}
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
          {!isLoading && paginatedCourses.length > 0 && (
            <div className="p-3.5 sm:p-4 border-t border-[#B6AA9A] bg-[#C1B3A0]/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] sm:text-[13px] text-[#514940]">
              {/* Results Range Count */}
              <div>
                Showing <strong className="text-[#211E1A]">{startIndex + 1}</strong> to{' '}
                <strong className="text-[#211E1A]">
                  {Math.min(startIndex + pageSize, totalFilteredItems)}
                </strong>{' '}
                of <strong className="text-[#211E1A]">{totalFilteredItems}</strong> courses
                {(searchQuery || statusFilter !== 'ALL' || categoryFilter !== 'ALL') && (
                  <span className="text-[#71675D] ml-1">(filtered from {courses.length})</span>
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
    </PageContainer>
  );
}
