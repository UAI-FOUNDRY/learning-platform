import React, { useState, useEffect, useMemo } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import ActivityChart from '../../components/admin/dashboard/ActivityChart';
import {
  reportService,
  exportCourseAnalyticsToCSV
} from '../../services/reportService';
import { mockActivityTrends } from '../../data/mockDashboardData';
import {
  mockPlatformKPIs,
  mockCategoryDistribution,
  mockCourseAnalytics
} from '../../data/mockAnalyticsData';

/**
 * CompletionRateBadge
 * Semantic progress indicator badge:
 * - >= 75%: High Completion (Emerald)
 * - 50% - 74%: Moderate Completion (Amber)
 * - < 50%: Low / Needs Review (Rose)
 */
function CompletionRateBadge({ rate }) {
  const num = Number(rate) || 0;
  if (num >= 75) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100/80 text-emerald-900 border border-emerald-300 whitespace-nowrap">
        {num.toFixed(1)}% High
      </span>
    );
  }
  if (num >= 50) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100/80 text-amber-900 border border-amber-300 whitespace-nowrap">
        {num.toFixed(1)}% Moderate
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100/80 text-rose-900 border border-rose-300 whitespace-nowrap">
      {num.toFixed(1)}% Low
    </span>
  );
}

export default function Reports() {
  const [kpis, setKpis] = useState(mockPlatformKPIs);
  const [categoryDistribution, setCategoryDistribution] = useState(mockCategoryDistribution);
  const [coursesData, setCoursesData] = useState(mockCourseAnalytics);
  const [isLoading, setIsLoading] = useState(true);
  const [isSampleData, setIsSampleData] = useState(true);
  const [statusNotice, setStatusNotice] = useState(null);

  // Filters, Search, and Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [completionFilter, setCompletionFilter] = useState('ALL');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('enrollments-desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Load Reports & Analytics Dataset
  useEffect(() => {
    let isMounted = true;

    async function loadReportsData() {
      setIsLoading(true);
      try {
        const [kpisRes, catRes, coursesRes] = await Promise.all([
          reportService.getPlatformKPIs(),
          reportService.getCategoryDistribution(),
          reportService.getCourseAnalytics()
        ]);

        if (isMounted) {
          if (kpisRes) {
            setKpis(kpisRes);
            setIsSampleData(Boolean(kpisRes.isSample));
          }
          if (Array.isArray(catRes?.items) && catRes.items.length > 0) {
            setCategoryDistribution(catRes.items);
          }
          if (Array.isArray(coursesRes?.items) && coursesRes.items.length > 0) {
            setCoursesData(coursesRes.items);
          }
        }
      } catch {
        if (isMounted) {
          setIsSampleData(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadReportsData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter & Sort Pipeline
  const filteredCourses = useMemo(() => {
    let result = [...coursesData];

    // Search query matching title, instructor, or category
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(c => {
        const titleMatch = (c.title || '').toLowerCase().includes(q);
        const instructorMatch = (c.instructor || '').toLowerCase().includes(q);
        const categoryMatch = (c.category || '').toLowerCase().includes(q);
        return titleMatch || instructorMatch || categoryMatch;
      });
    }

    // Category filter
    if (categoryFilter !== 'ALL') {
      result = result.filter(c => c.category === categoryFilter);
    }

    // Level filter
    if (levelFilter !== 'ALL') {
      result = result.filter(c => c.level === levelFilter);
    }

    // Completion Rate Filter
    if (completionFilter === 'HIGH') {
      result = result.filter(c => Number(c.completionRate) >= 75);
    } else if (completionFilter === 'MODERATE') {
      result = result.filter(c => Number(c.completionRate) >= 50 && Number(c.completionRate) < 75);
    } else if (completionFilter === 'LOW') {
      result = result.filter(c => Number(c.completionRate) < 50);
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'enrollments-desc':
          return (b.enrollments || 0) - (a.enrollments || 0);
        case 'enrollments-asc':
          return (a.enrollments || 0) - (b.enrollments || 0);
        case 'completion-desc':
          return (b.completionRate || 0) - (a.completionRate || 0);
        case 'completion-asc':
          return (a.completionRate || 0) - (b.completionRate || 0);
        case 'rating-desc':
          return (b.rating || 0) - (a.rating || 0);
        case 'title-asc':
          return (a.title || '').localeCompare(b.title || '');
        default:
          return 0;
      }
    });

    return result;
  }, [coursesData, searchQuery, categoryFilter, levelFilter, completionFilter, sortBy]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, levelFilter, completionFilter, sortBy, pageSize]);

  // Pagination calculation
  const totalItems = filteredCourses.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedCourses = filteredCourses.slice(startIndex, startIndex + pageSize);

  // Available unique categories for filter dropdown
  const uniqueCategories = useMemo(() => {
    const set = new Set();
    coursesData.forEach(c => {
      if (c.category) set.add(c.category);
    });
    return Array.from(set).sort();
  }, [coursesData]);

  // Handle CSV Export
  const handleExportCSV = () => {
    if (filteredCourses.length === 0) {
      setStatusNotice({
        type: 'error',
        message: 'No courses match the current filter criteria to export.'
      });
      return;
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `learnspace-reports-analytics-${dateStr}.csv`;
    const success = exportCourseAnalyticsToCSV(filteredCourses, filename);

    if (success) {
      setStatusNotice({
        type: 'success',
        message: `Successfully generated and exported ${filteredCourses.length} course records to "${filename}".`
      });
    } else {
      setStatusNotice({
        type: 'error',
        message: 'Failed to generate CSV export file.'
      });
    }
  };

  return (
    <PageContainer>
      {/* Breadcrumb Navigation */}
      <nav className="flex text-xs text-[#514940] mb-3" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2">
          <li>
            <span className="text-[#514940]">Super Admin</span>
          </li>
          <li className="text-[#71675D]">/</li>
          <li className="font-semibold text-[#211E1A]" aria-current="page">
            Reports & Analytics
          </li>
        </ol>
      </nav>

      {/* Header & Primary Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-[#B6AA9A]">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-bold text-[#211E1A] leading-tight tracking-tight">
            Reports & Analytics
          </h1>
          <p className="mt-1 text-sm text-[#514940]">
            Platform-wide learning metrics, enrollment trends, completion benchmarks, and detailed course performance.
          </p>
        </div>

        <div className="flex flex-col items-start sm:items-end gap-1.5">
          <Button
            variant="primary"
            onClick={handleExportCSV}
            className="flex items-center gap-2 text-xs sm:text-sm shadow-xs"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Export CSV Report ({filteredCourses.length})</span>
          </Button>
          <span className="text-[11px] text-[#71675D] max-w-sm text-left sm:text-right">
            Note: CSV files store plain tabular data without spreadsheet column width styling. In Excel, use <strong>AutoFit Column Width</strong> (or double-click column dividers) to view wide dates cleanly.
          </span>
        </div>
      </div>

      {/* Feedback Notice Banner */}
      {statusNotice && (
        <div
          className={`mt-4 p-4 rounded-xl border flex items-center justify-between gap-3 text-sm transition-all ${
            statusNotice.type === 'error'
              ? 'bg-rose-100/90 text-rose-950 border-rose-300'
              : 'bg-emerald-100/90 text-emerald-950 border-emerald-300'
          }`}
          role="status"
        >
          <div className="flex items-center gap-2">
            <span className="text-base" aria-hidden="true">
              {statusNotice.type === 'error' ? '⚠️' : '✓'}
            </span>
            <span className="font-medium">{statusNotice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusNotice(null)}
            className="text-xs font-bold px-2 py-1 rounded hover:bg-black/10 focus:outline-none"
            aria-label="Dismiss notice"
          >
            &times;
          </button>
        </div>
      )}

      {/* Data Source Transparency Banner */}
      <div className="mt-4 flex items-center justify-between text-xs text-[#514940] bg-[#EAE3DA]/60 border border-[#B6AA9A] px-3 py-2 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
          <span>
            Data Source:{' '}
            <strong className="text-[#211E1A]">
              {isSampleData ? 'Development Analytics Provider (Offline Mock Snapshot)' : 'Live Platform Telemetry (/api/v1/admin/analytics)'}
            </strong>
          </span>
        </div>
        <span className="text-[11px] text-[#71675D]">Real-time course analytics and learning benchmarks</span>
      </div>

      {/* Platform-Wide Key Performance Indicators (KPIs) */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Users */}
        <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#514940]">Total Registered Users</span>
            <span className="text-[11px] font-semibold text-[#15803D] bg-emerald-100/70 border border-emerald-300 px-1.5 py-0.5 rounded">
              {kpis.userGrowthRate}
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-[#211E1A] tracking-tight">
              {kpis.totalUsers.toLocaleString()}
            </span>
            <span className="text-xs text-[#514940]">
              <strong className="text-[#211E1A]">{kpis.activeUsers.toLocaleString()}</strong> active
            </span>
          </div>
          <div className="mt-2 text-[11px] text-[#71675D]">
            85.5% platform participation rate
          </div>
        </div>

        {/* Total Enrollments */}
        <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-[#514940] block">Course Enrollments</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-[#211E1A] tracking-tight">
              {kpis.totalEnrollments.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-[#71675D]">Seats taken</span>
          </div>
          <div className="mt-2 text-[11px] text-[#71675D]">
            Across {kpis.publishedCourses} published catalog courses
          </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#514940]">Completion Rate</span>
            <span className="text-[11px] font-semibold text-[#15803D] bg-emerald-100/70 border border-emerald-300 px-1.5 py-0.5 rounded">
              Above avg
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-[#15803D] tracking-tight">
              {kpis.overallCompletionRate}%
            </span>
            <span className="text-xs text-[#514940]">Benchmark</span>
          </div>
          <div className="mt-2 text-[11px] text-[#71675D]">
            Learners completing all modules & quizzes
          </div>
        </div>

        {/* Average Course Rating */}
        <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-[#514940] block">Satisfaction Score</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-[#D92D2D] tracking-tight flex items-center gap-1">
              <span>★</span>
              <span>{kpis.averageCourseRating}</span>
            </span>
            <span className="text-xs font-medium text-[#71675D]">out of 5.0</span>
          </div>
          <div className="mt-2 text-[11px] text-[#71675D]">
            Derived from learner course evaluations
          </div>
        </div>

        {/* Certificates & Hours */}
        <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-4 shadow-xs">
          <span className="text-xs font-semibold text-[#514940] block">Certificates Issued</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold text-[#211E1A] tracking-tight">
              {kpis.certificatesIssued.toLocaleString()}
            </span>
            <span className="text-xs text-[#514940]">Credentials</span>
          </div>
          <div className="mt-2 text-[11px] text-[#71675D]">
            {(kpis.activeLearningHours / 1000).toFixed(1)}k cumulative learning hours
          </div>
        </div>
      </div>

      {/* Activity & Enrollment Trends Interactive Visualization */}
      <div className="mt-8">
        <div className="mb-3">
          <h2 className="text-[20px] font-bold text-[#211E1A] tracking-tight">
            Platform Activity & Enrollment Trends
          </h2>
          <p className="text-xs text-[#514940]">
            Multi-metric historical trajectory. Toggle metrics, change date intervals, or compare trends.
          </p>
        </div>
        <ActivityChart trendsData={mockActivityTrends} />
      </div>

      {/* Category Breakdown & Learning Distribution Visualizations */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Enrollment Share Breakdown */}
        <div className="lg:col-span-2 bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#B6AA9A]">
            <div>
              <h3 className="text-base font-bold text-[#211E1A]">Category Learning Distribution</h3>
              <p className="text-xs text-[#514940]">Distribution of student enrollments and course completions by academic discipline</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#EAE3DA] text-[#514940] border border-[#B6AA9A]">
              {categoryDistribution.length} Disciplines
            </span>
          </div>

          <div className="mt-4 space-y-4">
            {categoryDistribution.map((cat) => (
              <div key={cat.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} aria-hidden="true" />
                    <span className="font-semibold text-[#211E1A]">{cat.category}</span>
                    <span className="text-xs text-[#71675D]">({cat.coursesCount} courses)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-[#211E1A]">
                      {cat.enrollments.toLocaleString()} enrollments
                    </span>
                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-[#EAE3DA] text-[#514940] border border-[#B6AA9A]">
                      {cat.percentage}%
                    </span>
                  </div>
                </div>

                {/* Visual Proportion Bar */}
                <div className="h-2.5 w-full bg-[#EAE3DA] rounded-full overflow-hidden flex border border-[#B6AA9A]/50">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${cat.percentage}%`,
                      backgroundColor: cat.color
                    }}
                    role="progressbar"
                    aria-valuenow={cat.percentage}
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-label={`${cat.category} enrollment share`}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-[#71675D]">
                  <span>Avg Completion Rate: <strong className="text-[#211E1A]">{cat.completionRate}%</strong></span>
                  <span>Share of Total: {cat.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Completion Quality & Tier Overview */}
        <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-[#B6AA9A]">
              <h3 className="text-base font-bold text-[#211E1A]">Completion Health Tiers</h3>
              <p className="text-xs text-[#514940]">Cohort completion rate benchmarks across platform catalog</p>
            </div>

            <div className="mt-4 space-y-3">
              <div className="p-3 rounded-lg bg-[#EAE3DA] border border-[#B6AA9A]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    High Performance (&gt;75%)
                  </span>
                  <span className="text-xs font-bold text-[#211E1A]">4 courses (28.6%)</span>
                </div>
                <p className="text-[11px] text-[#514940] mt-1 leading-snug">
                  Excellent retention, engaging assignments, and high modular progression.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#EAE3DA] border border-[#B6AA9A]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-600" />
                    Moderate Performance (50–75%)
                  </span>
                  <span className="text-xs font-bold text-[#211E1A]">8 courses (57.1%)</span>
                </div>
                <p className="text-[11px] text-[#514940] mt-1 leading-snug">
                  Healthy completion pipeline; typical for rigorous multi-week engineering tracks.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#EAE3DA] border border-[#B6AA9A]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-600" />
                    Needs Optimization (&lt;50%)
                  </span>
                  <span className="text-xs font-bold text-[#211E1A]">2 courses (14.3%)</span>
                </div>
                <p className="text-[11px] text-[#514940] mt-1 leading-snug">
                  Drop-offs detected around mid-term coding challenges or long video lectures.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#B6AA9A] text-xs text-[#514940]">
            <span className="font-semibold text-[#211E1A]">Platform Target: </span>
            Maintain &gt;65% completion rate across all partner institutions.
          </div>
        </div>
      </div>

      {/* Detailed Course Performance Report Table */}
      <div className="mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-[20px] font-bold text-[#211E1A] tracking-tight">
              Course Performance & Learning Analytics
            </h2>
            <p className="text-xs text-[#514940]">
              Disaggregated course-by-course metrics including enrollments, completions, ratings, and active learners.
            </p>
          </div>

          <span className="text-xs text-[#71675D]">
            Showing <strong>{filteredCourses.length}</strong> evaluated courses
          </span>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#71675D]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, instructor, or category..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-lg bg-[#EAE3DA] border border-[#B6AA9A] text-[#211E1A] placeholder-[#71675D] focus:outline-none focus:ring-2 focus:ring-[#D92D2D] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#71675D] hover:text-[#211E1A]"
                aria-label="Clear search query"
              >
                &times;
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="py-2 px-2.5 text-xs sm:text-sm rounded-lg bg-[#EAE3DA] border border-[#B6AA9A] text-[#211E1A] focus:outline-none focus:ring-2 focus:ring-[#D92D2D]"
              aria-label="Filter by category"
            >
              <option value="ALL">All Categories</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Completion Filter */}
            <select
              value={completionFilter}
              onChange={(e) => setCompletionFilter(e.target.value)}
              className="py-2 px-2.5 text-xs sm:text-sm rounded-lg bg-[#EAE3DA] border border-[#B6AA9A] text-[#211E1A] focus:outline-none focus:ring-2 focus:ring-[#D92D2D]"
              aria-label="Filter by completion tier"
            >
              <option value="ALL">All Completion Rates</option>
              <option value="HIGH">High (&gt;75%)</option>
              <option value="MODERATE">Moderate (50–75%)</option>
              <option value="LOW">Low (&lt;50%)</option>
            </select>

            {/* Level Filter */}
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="py-2 px-2.5 text-xs sm:text-sm rounded-lg bg-[#EAE3DA] border border-[#B6AA9A] text-[#211E1A] focus:outline-none focus:ring-2 focus:ring-[#D92D2D]"
              aria-label="Filter by course difficulty level"
            >
              <option value="ALL">All Levels</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
              <option value="All Levels">All Levels</option>
            </select>

            {/* Sort Control */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="py-2 px-2.5 text-xs sm:text-sm rounded-lg bg-[#EAE3DA] border border-[#B6AA9A] text-[#211E1A] focus:outline-none focus:ring-2 focus:ring-[#D92D2D]"
              aria-label="Sort table"
            >
              <option value="enrollments-desc">Enrollments (High to Low)</option>
              <option value="enrollments-asc">Enrollments (Low to High)</option>
              <option value="completion-desc">Completion Rate (High to Low)</option>
              <option value="completion-asc">Completion Rate (Low to High)</option>
              <option value="rating-desc">Rating (High to Low)</option>
              <option value="title-asc">Course Title (A-Z)</option>
            </select>

            {/* Clear Filters */}
            {(searchQuery || categoryFilter !== 'ALL' || completionFilter !== 'ALL' || levelFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('ALL');
                  setCompletionFilter('ALL');
                  setLevelFilter('ALL');
                }}
                className="py-2 px-2.5 text-xs font-semibold rounded-lg text-[#D92D2D] hover:bg-[#EAE3DA] transition-colors focus:outline-none"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table Data Container */}
        <div className="mt-4 bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <Loader text="Loading course analytics records..." />
            </div>
          ) : paginatedCourses.length === 0 ? (
            <div className="py-16 px-4">
              <EmptyState
                title="No Courses Match Your Criteria"
                description="No courses found matching the selected search query and filter criteria. Try adjusting or clearing your filters."
              />
              <div className="mt-4 text-center">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('ALL');
                    setCompletionFilter('ALL');
                    setLevelFilter('ALL');
                  }}
                  className="text-xs"
                >
                  Reset All Filters
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#B6AA9A] text-left text-xs sm:text-sm">
                <thead className="bg-[#EAE3DA]/70 text-[#514940] font-semibold">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 sm:pl-6 pr-3">
                      Course & Discipline
                    </th>
                    <th scope="col" className="px-3 py-3.5">
                      Instructor
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-center">
                      Enrollments
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-center">
                      Active Learners
                    </th>
                    <th scope="col" className="px-3 py-3.5">
                      Completion Benchmark
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-center">
                      Rating
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-center hidden md:table-cell">
                      Avg Duration
                    </th>
                    <th scope="col" className="py-3.5 pl-3 pr-4 sm:pr-6 text-right hidden lg:table-cell">
                      Last Activity
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#B6AA9A]/60 bg-[#C8BBAA]/40 text-[#211E1A]">
                  {paginatedCourses.map((course) => (
                    <tr
                      key={course.id}
                      className="hover:bg-[#EAE3DA]/50 transition-colors"
                    >
                      {/* Course Title & Category */}
                      <td className="py-3.5 pl-4 sm:pl-6 pr-3">
                        <div className="min-w-0 max-w-[280px] sm:max-w-[340px]">
                          <span className="font-bold text-[#211E1A] block truncate">
                            {course.title}
                          </span>
                          <div className="flex items-center gap-2 text-xs text-[#514940] mt-0.5">
                            <span className="font-medium">{course.category}</span>
                            <span>•</span>
                            <span className="text-[11px] px-1.5 py-0.2 rounded bg-[#EAE3DA] border border-[#B6AA9A] text-[#514940]">
                              {course.level}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Instructor */}
                      <td className="px-3 py-3.5 whitespace-nowrap text-xs text-[#514940]">
                        <span className="font-medium text-[#211E1A]">{course.instructor}</span>
                      </td>

                      {/* Total Enrollments */}
                      <td className="px-3 py-3.5 text-center whitespace-nowrap">
                        <span className="font-bold text-[#211E1A]">
                          {(course.enrollments || 0).toLocaleString()}
                        </span>
                      </td>

                      {/* Active Learners */}
                      <td className="px-3 py-3.5 text-center whitespace-nowrap">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A]">
                          {course.activeLearners || 0}
                        </span>
                      </td>

                      {/* Completion Benchmark & Mini Progress Bar */}
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <div className="space-y-1 min-w-[130px]">
                          <div className="flex items-center justify-between">
                            <CompletionRateBadge rate={course.completionRate} />
                            <span className="text-xs text-[#71675D]">
                              {course.completions} passed
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-[#EAE3DA] rounded-full overflow-hidden border border-[#B6AA9A]/40">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, course.completionRate || 0)}%`,
                                backgroundColor:
                                  course.completionRate >= 75
                                    ? '#15803D'
                                    : course.completionRate >= 50
                                    ? '#B45309'
                                    : '#B91C1C'
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Rating */}
                      <td className="px-3 py-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 font-semibold text-xs text-[#211E1A]">
                          <span className="text-[#D92D2D]">★</span>
                          <span>{course.rating.toFixed(1)}</span>
                          <span className="text-[#71675D] font-normal">({course.ratingCount})</span>
                        </div>
                      </td>

                      {/* Avg Duration */}
                      <td className="px-3 py-3.5 text-center whitespace-nowrap hidden md:table-cell text-xs text-[#514940]">
                        <span>{course.avgHoursToComplete} hrs</span>
                      </td>

                      {/* Last Activity */}
                      <td className="py-3.5 pl-3 pr-4 sm:pr-6 text-right whitespace-nowrap hidden lg:table-cell text-xs text-[#71675D]">
                        {course.lastActivity
                          ? new Date(course.lastActivity).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })
                          : 'Recent'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {totalItems > 0 && (
            <div className="bg-[#EAE3DA]/80 px-4 sm:px-6 py-3 border-t border-[#B6AA9A] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#514940]">
              <div className="flex items-center gap-2">
                <span>
                  Showing <strong>{startIndex + 1}</strong> to{' '}
                  <strong>{Math.min(startIndex + pageSize, totalItems)}</strong> of{' '}
                  <strong>{totalItems}</strong> courses
                </span>
                <div className="ml-3 hidden sm:flex items-center gap-1">
                  <span>Per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="bg-[#C8BBAA] border border-[#B6AA9A] rounded px-1.5 py-0.5 text-xs text-[#211E1A] focus:outline-none"
                  >
                    <option value={8}>8</option>
                    <option value={16}>16</option>
                    <option value={24}>24</option>
                  </select>
                </div>
              </div>

              {/* Page Selector Buttons */}
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={safeCurrentPage === 1}
                  className="px-2.5 py-1.5 rounded-lg border border-[#B6AA9A] bg-[#C8BBAA] hover:bg-[#BFB09D] disabled:opacity-40 disabled:cursor-not-allowed font-medium text-[#211E1A] transition-colors focus:outline-none"
                >
                  Previous
                </button>

                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pageNumber = idx + 1;
                  if (
                    pageNumber === 1 ||
                    pageNumber === totalPages ||
                    (pageNumber >= safeCurrentPage - 1 && pageNumber <= safeCurrentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`min-w-[32px] px-2 py-1.5 rounded-lg text-xs font-semibold border transition-colors focus:outline-none ${
                          safeCurrentPage === pageNumber
                            ? 'bg-[#D92D2D] text-white border-[#D92D2D]'
                            : 'bg-[#C8BBAA] border-[#B6AA9A] text-[#211E1A] hover:bg-[#BFB09D]'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  }
                  if (pageNumber === 2 || pageNumber === totalPages - 1) {
                    return <span key={pageNumber} className="px-1 text-[#71675D]">...</span>;
                  }
                  return null;
                })}

                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={safeCurrentPage === totalPages}
                  className="px-2.5 py-1.5 rounded-lg border border-[#B6AA9A] bg-[#C8BBAA] hover:bg-[#BFB09D] disabled:opacity-40 disabled:cursor-not-allowed font-medium text-[#211E1A] transition-colors focus:outline-none"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
