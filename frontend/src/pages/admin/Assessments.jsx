import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useDebounce } from '../../hooks/useDebounce';
import {
  assessmentService,
  subscribeToAssessmentUpdates
} from '../../services/assessmentService';

/**
 * Short date formatting helper for table rows
 */
function formatShortDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

/**
 * Status Badge for assessments
 */
function StatusBadge({ status }) {
  const norm = (status || '').toLowerCase();
  if (norm === 'published') {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300">
        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-600 shrink-0" aria-hidden="true" />
        Published
      </span>
    );
  }
  if (norm === 'draft') {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-amber-600 shrink-0" aria-hidden="true" />
        Draft
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#EAE3DA] text-[#514940] border border-[#B6AA9A]">
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-stone-500 shrink-0" aria-hidden="true" />
      Archived
    </span>
  );
}

/**
 * Type Badge for assessments (Quiz vs Assignment) with ample breathing room
 */
function TypeBadge({ type }) {
  const isQuiz = type === 'Quiz';
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-bold tracking-wide uppercase shadow-2xs ${
        isQuiz
          ? 'bg-purple-100 text-purple-900 border border-purple-300'
          : 'bg-teal-100 text-teal-900 border border-teal-300'
      }`}
    >
      {type}
    </span>
  );
}

export default function Assessments() {
  const [assessments, setAssessments] = useState([]);
  const [kpis, setKpis] = useState({ total: 0, quizzes: 0, assignments: 0, published: 0, archived: 0 });
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 180);
  const isInitialLoad = useRef(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Selected assessment for details modal
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Action Confirmation State
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Action feedback notice
  const [statusNotice, setStatusNotice] = useState(null);

  // Fetch assessments from service
  const fetchAssessmentsData = useCallback(async () => {
    if (isInitialLoad.current) {
      setIsLoading(true);
    }
    try {
      const data = await assessmentService.getAssessments({
        search: debouncedSearch,
        type: typeFilter,
        status: statusFilter,
        sortBy,
        sortOrder,
        page: currentPage,
        limit: pageSize
      });

      setAssessments(data.items);
      setTotalCount(data.total);
      setTotalPages(data.totalPages);
      setKpis(data.kpis);
    } catch {
      setStatusNotice({
        type: 'error',
        message: 'Unable to load assessment records.'
      });
    } finally {
      if (isInitialLoad.current) {
        setIsLoading(false);
        isInitialLoad.current = false;
      }
    }
  }, [debouncedSearch, typeFilter, statusFilter, sortBy, sortOrder, currentPage]);

  useEffect(() => {
    fetchAssessmentsData();

    // Cross-tab and same-tab listener
    const unsubscribe = subscribeToAssessmentUpdates(() => {
      fetchAssessmentsData();
    });

    return () => unsubscribe();
  }, [fetchAssessmentsData]);

  // Open details modal
  const handleOpenDetails = (assessment) => {
    setSelectedAssessment(assessment);
    setIsDetailsOpen(true);
  };

  // Close details modal
  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    setSelectedAssessment(null);
  };

  // Prevent background-page scrolling and handle Escape key while modal is open
  useEffect(() => {
    if (!isDetailsOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsDetailsOpen(false);
        setSelectedAssessment(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDetailsOpen]);

  // Status Action (Publish, Draft, Archive, Restore)
  const handleStatusChange = (assessment, targetStatus) => {
    const isDestructive = targetStatus === 'Archived';
    const actionLabel = targetStatus === 'Archived' ? 'Archive' : targetStatus === 'Published' ? 'Publish' : 'Change status of';

    const executeChange = async () => {
      try {
        await assessmentService.updateAssessmentStatus(assessment.id, targetStatus);
        setStatusNotice({
          type: 'success',
          message: `Assessment "${assessment.title}" status changed to ${targetStatus}.`
        });
        if (selectedAssessment?.id === assessment.id) {
          setSelectedAssessment((prev) => (prev ? { ...prev, status: targetStatus, updatedAt: new Date().toISOString() } : null));
        }
        setConfirmState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
        fetchAssessmentsData();
      } catch {
        setStatusNotice({
          type: 'error',
          message: `Failed to update assessment status.`
        });
      }
    };

    if (isDestructive) {
      setConfirmState({
        isOpen: true,
        title: `Archive "${assessment.title}"?`,
        message: `Archiving this assessment will hide it from learners and prevent further submission attempts. Student grade history will be retained.`,
        onConfirm: executeChange
      });
    } else {
      executeChange();
    }
  };

  // Clear filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setStatusFilter('all');
    setSortBy('updatedAt');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  // Sort by column header toggle
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const isFiltered = Boolean(searchQuery.trim() || typeFilter !== 'all' || statusFilter !== 'all');

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
            Assessments Management
          </li>
        </ol>
      </nav>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#B6AA9A]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[28px] sm:text-[32px] font-bold text-[#211E1A] leading-tight tracking-tight">
              Assessments Management
            </h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#EAE3DA] text-[#514940] border border-[#B6AA9A]">
              Simulated Dev Mode
            </span>
          </div>
          <p className="mt-1 text-sm text-[#514940]">
            Platform-wide governance for quizzes, coding assignments, and module evaluations across all active and drafted courses.
          </p>
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
          role="alert"
        >
          <div className="flex items-center gap-2.5">
            <span className="font-semibold">{statusNotice.type === 'error' ? 'Notice:' : 'Success:'}</span>
            <span>{statusNotice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusNotice(null)}
            className="text-xs font-bold hover:underline ml-auto"
            aria-label="Dismiss notice"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mt-6">
        {/* Total Assessments */}
        <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-4 shadow-xs">
          <span className="text-xs font-medium text-[#514940] uppercase tracking-wider block">
            Total Assessments
          </span>
          <span className="text-2xl font-bold text-[#211E1A] mt-1 block">
            {kpis.total}
          </span>
          <span className="text-[11px] text-[#71675D] mt-0.5 block">
            Across all courses
          </span>
        </div>

        {/* Quizzes */}
        <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-4 shadow-xs">
          <span className="text-xs font-medium text-[#514940] uppercase tracking-wider block">
            Quizzes
          </span>
          <span className="text-2xl font-bold text-purple-900 mt-1 block">
            {kpis.quizzes}
          </span>
          <span className="text-[11px] text-[#71675D] mt-0.5 block">
            Auto-graded tests
          </span>
        </div>

        {/* Assignments */}
        <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-4 shadow-xs">
          <span className="text-xs font-medium text-[#514940] uppercase tracking-wider block">
            Assignments
          </span>
          <span className="text-2xl font-bold text-teal-900 mt-1 block">
            {kpis.assignments}
          </span>
          <span className="text-[11px] text-[#71675D] mt-0.5 block">
            Projects & rubric tasks
          </span>
        </div>

        {/* Published & Live */}
        <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-4 shadow-xs">
          <span className="text-xs font-medium text-[#514940] uppercase tracking-wider block">
            Published
          </span>
          <span className="text-2xl font-bold text-emerald-900 mt-1 block">
            {kpis.published}
          </span>
          <span className="text-[11px] text-emerald-800 mt-0.5 block">
            Live in student curriculum
          </span>
        </div>

        {/* Archived */}
        <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-4 shadow-xs">
          <span className="text-xs font-medium text-[#514940] uppercase tracking-wider block">
            Archived / Inactive
          </span>
          <span className="text-2xl font-bold text-[#514940] mt-1 block">
            {kpis.archived}
          </span>
          <span className="text-[11px] text-[#71675D] mt-0.5 block">
            Hidden from learners
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-6 bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <svg
              className="w-4 h-4 text-[#71675D] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (currentPage !== 1) setCurrentPage(1);
              }}
              placeholder="Search assessment, course, or instructor..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-[#B6AA9A] bg-[#EAE3DA] text-[#211E1A] placeholder-[#71675D] focus:outline-none focus:ring-2 focus:ring-[#D92D2D] transition-colors"
            />
          </div>

          {/* Filters & Sorting */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Type Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-[#514940]">Type:</span>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 rounded-lg border border-[#B6AA9A] text-xs font-medium text-[#211E1A] bg-[#EAE3DA] focus:outline-none focus:ring-2 focus:ring-[#D92D2D]"
              >
                <option value="all">All Types</option>
                <option value="quiz">Quizzes Only</option>
                <option value="assignment">Assignments Only</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-[#514940]">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 rounded-lg border border-[#B6AA9A] text-xs font-medium text-[#211E1A] bg-[#EAE3DA] focus:outline-none focus:ring-2 focus:ring-[#D92D2D]"
              >
                <option value="all">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Sort Options */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-[#514940]">Sort:</span>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="px-3 py-1.5 rounded-lg border border-[#B6AA9A] text-xs font-medium text-[#211E1A] bg-[#EAE3DA] focus:outline-none focus:ring-2 focus:ring-[#D92D2D]"
              >
                <option value="updatedAt-desc">Last Updated (Newest)</option>
                <option value="updatedAt-asc">Last Updated (Oldest)</option>
                <option value="title-asc">Title (A - Z)</option>
                <option value="title-desc">Title (Z - A)</option>
                <option value="totalMarks-desc">Total Marks (High to Low)</option>
                <option value="totalMarks-asc">Total Marks (Low to High)</option>
              </select>
            </div>

            {/* Clear Filters Button */}
            {isFiltered && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs font-semibold text-[#D92D2D] hover:underline px-2 py-1"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Results Counter */}
        <div className="text-xs text-[#71675D]">
          Showing {assessments.length} of {totalCount} assessment{totalCount === 1 ? '' : 's'}
        </div>
      </div>

      {/* Assessments Directory Table */}
      <div className="mt-6 bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader size="lg" />
            <p className="text-sm font-medium text-[#71675D] mt-3">Loading assessment records...</p>
          </div>
        ) : assessments.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No assessments found"
              message={
                isFiltered
                  ? 'No quizzes or assignments match your current search or filter criteria.'
                  : 'No course assessments are currently registered on the platform.'
              }
              actionLabel={isFiltered ? 'Reset Filters' : undefined}
              onAction={isFiltered ? handleClearFilters : undefined}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px] text-[13px]" role="table">
              <thead>
                <tr className="border-b border-[#B6AA9A] bg-[#BFB09D]/60 text-xs font-bold text-[#211E1A] uppercase tracking-wider">
                  {/* 1. Assessment & Course */}
                  <th
                    scope="col"
                    onClick={() => handleSort('title')}
                    className="py-3.5 px-4 sm:px-6 text-left cursor-pointer hover:bg-[#BFB09D]/90 transition-colors select-none group"
                    title="Sort by Assessment Title"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Assessment & Course</span>
                      <span className="text-[#71675D] group-hover:text-[#211E1A] text-[11px]">
                        {sortBy === 'title' ? (sortOrder === 'asc' ? '▲' : '▼') : '⇅'}
                      </span>
                    </div>
                  </th>

                  {/* 2. Type */}
                  <th scope="col" className="py-3.5 px-4 text-center select-none w-32">
                    Type
                  </th>

                  {/* 3. Instructor */}
                  <th scope="col" className="py-3.5 px-4 text-left select-none w-48">
                    Instructor
                  </th>

                  {/* 4. Status */}
                  <th scope="col" className="py-3.5 px-4 text-center select-none w-36">
                    Status
                  </th>

                  {/* 5. Actions */}
                  <th scope="col" className="py-3.5 px-4 sm:px-6 text-right select-none w-44">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#B6AA9A]/50 text-sm">
                {assessments.map((item) => (
                  <tr key={item.id} className="hover:bg-[#EAE3DA]/50 transition-colors">
                    {/* 1. Assessment & Course */}
                    <td className="py-4 px-4 sm:px-6 align-top">
                      <div>
                        {/* Assessment Title Prominently */}
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(item)}
                          className="font-bold text-[14px] sm:text-[15px] text-[#211E1A] hover:text-[#D92D2D] hover:underline text-left leading-snug line-clamp-2 block"
                          title={item.title}
                        >
                          {item.title}
                        </button>

                        {/* Associated Course & Category */}
                        <div className="text-[12px] text-[#514940] mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-[#3D372F]">{item.courseTitle}</span>
                          {item.category && (
                            <>
                              <span className="text-[#B6AA9A]">•</span>
                              <span className="text-[#71675D]">{item.category}</span>
                            </>
                          )}
                        </div>

                        {/* Compact Metadata Line: questions/tasks, marks, passing, ID */}
                        <div className="text-[11px] text-[#71675D] mt-1.5 flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-[#514940]">
                            {item.type === 'Quiz' ? `${item.questionsCount} questions` : `${item.tasksCount} tasks`}
                          </span>
                          <span className="text-[#B6AA9A]">·</span>
                          <span className="font-mono font-semibold text-[#211E1A]">
                            {item.totalMarks} pts
                          </span>
                          {item.passingScore != null && (
                            <>
                              <span className="text-[#B6AA9A]">·</span>
                              <span>Pass: {item.passingScore}%</span>
                            </>
                          )}
                          <span className="text-[#B6AA9A]">·</span>
                          <span className="font-mono">ID: {item.id}</span>
                        </div>
                      </div>
                    </td>

                    {/* 2. Type */}
                    <td className="py-4 px-4 text-center align-middle whitespace-nowrap">
                      <TypeBadge type={item.type} />
                    </td>

                    {/* 3. Instructor */}
                    <td className="py-4 px-4 align-middle">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                          {item.instructor.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </div>
                        <span className="text-[13px] text-[#211E1A] font-medium" title={item.instructor}>
                          {item.instructor}
                        </span>
                      </div>
                    </td>

                    {/* 4. Status */}
                    <td className="py-4 px-4 text-center align-middle whitespace-nowrap">
                      <StatusBadge status={item.status} />
                    </td>

                    {/* 5. Actions */}
                    <td className="py-4 px-4 sm:px-6 text-right align-middle whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => handleOpenDetails(item)}
                          className="text-xs px-3 py-1.5 whitespace-nowrap font-medium"
                        >
                          View Details
                        </Button>

                        {/* Quick Status Action Button */}
                        {item.status === 'Published' && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(item, 'Archived')}
                            className="p-1.5 rounded-lg text-[#71675D] hover:text-rose-700 hover:bg-rose-100/60 transition-colors"
                            title="Archive Assessment"
                            aria-label={`Archive ${item.title}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                          </button>
                        )}

                        {item.status === 'Archived' && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(item, 'Published')}
                            className="p-1.5 rounded-lg text-[#71675D] hover:text-emerald-700 hover:bg-emerald-100/60 transition-colors"
                            title="Restore & Publish"
                            aria-label={`Restore ${item.title}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalCount > pageSize && (
          <div className="p-4 border-t border-[#B6AA9A] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#514940]">
            <div>
              Showing <span className="font-semibold text-[#211E1A]">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-semibold text-[#211E1A]">{Math.min(currentPage * pageSize, totalCount)}</span> of{' '}
              <span className="font-semibold text-[#211E1A]">{totalCount}</span> assessments
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-md border border-[#B6AA9A] bg-[#EAE3DA] font-semibold text-[#211E1A] hover:bg-[#BFB09D] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>

              <span className="px-2 font-bold text-[#211E1A]">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-md border border-[#B6AA9A] bg-[#EAE3DA] font-semibold text-[#211E1A] hover:bg-[#BFB09D] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Assessment Inspection Modal */}
      {isDetailsOpen && selectedAssessment && (
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
            aria-labelledby="assessment-modal-title"
          >
            {/* 1. Fixed Header (Pinned at Top) */}
            <div className="px-5 py-4 border-b border-[#B6AA9A] bg-[#E2DCD4] flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0 pr-2">
                <h3
                  id="assessment-modal-title"
                  className="text-base sm:text-lg font-bold text-[#211E1A] truncate"
                  title={`Assessment Inspection: ${selectedAssessment.title}`}
                >
                  Assessment Inspection: {selectedAssessment.title}
                </h3>
                <span className="text-xs text-[#514940] block truncate">
                  Platform administrative governance and structural review
                </span>
              </div>
              <button
                type="button"
                onClick={handleCloseDetails}
                className="text-[#71675D] hover:text-[#211E1A] hover:bg-[#B6AA9A]/40 p-1.5 rounded-lg transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
                aria-label="Close dialog"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 2. Independently Scrollable Body */}
            <div className="p-4 sm:p-6 overflow-y-auto min-h-0 flex-1 space-y-6 overscroll-contain">
              {/* Header info badge summary */}
              <div className="p-4 rounded-xl bg-[#E2DCD4]/70 border border-[#B6AA9A] space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <TypeBadge type={selectedAssessment.type} />
                    <StatusBadge status={selectedAssessment.status} />
                  </div>
                  <span className="text-xs font-mono text-[#71675D] bg-[#EAE3DA] px-2 py-0.5 rounded border border-[#B6AA9A]/60">
                    ID: {selectedAssessment.id}
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-[#211E1A]">{selectedAssessment.title}</h4>
                  <p className="text-xs text-[#514940] mt-0.5 leading-relaxed">{selectedAssessment.description}</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-[#B6AA9A]/60 text-xs">
                  <div>
                    <span className="text-[10px] text-[#71675D] uppercase font-semibold block">Associated Course</span>
                    <span className="font-bold text-[#211E1A] truncate block" title={selectedAssessment.courseTitle}>
                      {selectedAssessment.courseTitle}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#71675D] uppercase font-semibold block">Course Instructor</span>
                    <span className="font-bold text-[#211E1A] block">{selectedAssessment.instructor}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#71675D] uppercase font-semibold block">Composition</span>
                    <span className="font-bold text-[#211E1A] block">
                      {selectedAssessment.type === 'Quiz' ? `${selectedAssessment.questionsCount} Questions` : `${selectedAssessment.tasksCount} Tasks`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#71675D] uppercase font-semibold block">Total Marks</span>
                    <span className="font-bold font-mono text-[#211E1A] block">{selectedAssessment.totalMarks} pts</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#71675D] uppercase font-semibold block">Passing Threshold</span>
                    <span className="font-bold text-emerald-900 block">{selectedAssessment.passingScore}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#71675D] uppercase font-semibold block">Last Updated</span>
                    <span className="font-medium text-[#514940] block">{formatShortDate(selectedAssessment.updatedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Assessment Blueprint Content Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-[#211E1A]">
                    {selectedAssessment.type === 'Quiz' ? 'Sample Questions Blueprint' : 'Assignment Deliverables & Rubric'}
                  </h4>
                  <span className="text-[11px] text-[#71675D]">Read-only administrative view</span>
                </div>

                {selectedAssessment.type === 'Quiz' ? (
                  <div className="space-y-2.5">
                    {(selectedAssessment.questions || []).map((q, idx) => (
                      <div key={q.id || idx} className="p-3.5 rounded-lg border border-[#B6AA9A] bg-[#E2DCD4]/40 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#211E1A]">Question {idx + 1} ({q.type})</span>
                          <span className="text-[11px] font-mono font-semibold text-[#D92D2D] bg-[#EAE3DA] px-2 py-0.5 rounded border border-[#B6AA9A]/50">
                            {q.points} pts
                          </span>
                        </div>
                        <p className="text-xs text-[#211E1A] leading-relaxed">{q.prompt}</p>
                        {q.options && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                            {q.options.map((opt, oIdx) => (
                              <div
                                key={oIdx}
                                className={`text-[11px] px-2.5 py-1.5 rounded border ${
                                  opt === q.correctAnswer
                                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold shadow-2xs'
                                    : 'bg-[#EAE3DA] text-[#514940] border-[#B6AA9A]/60'
                                }`}
                              >
                                {opt} {opt === q.correctAnswer && '✓ (Correct)'}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {(!selectedAssessment.questions || selectedAssessment.questions.length === 0) && (
                      <p className="text-xs text-[#71675D] italic">No sample questions preview available.</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="p-3 rounded-lg border border-[#B6AA9A] bg-[#E2DCD4]/50 text-xs">
                      <span className="font-semibold text-[#211E1A] block">Submission Format:</span>
                      <span className="text-[#514940]">{selectedAssessment.submissionType || 'Code repository or archive'}</span>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-[#211E1A] block">Grading Rubric Criteria</span>
                      {(selectedAssessment.rubric || []).map((r, rIdx) => (
                        <div key={rIdx} className="flex items-center justify-between p-2.5 rounded border border-[#B6AA9A]/60 bg-[#E2DCD4]/40 text-xs">
                          <span className="text-[#211E1A] pr-3">{r.criterion}</span>
                          <span className="font-mono font-bold text-[#D92D2D] shrink-0 bg-[#EAE3DA] px-2 py-0.5 rounded border border-[#B6AA9A]/50">
                            {r.points} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Author Governance Disclaimer */}
              <div className="p-3.5 rounded-lg bg-[#E2DCD4]/60 border border-[#B6AA9A] text-xs text-[#514940] leading-relaxed">
                <p>
                  <strong className="text-[#211E1A]">Author Governance:</strong> Question pools, answer keys, and grading rubrics are managed directly by course instructors. Super Admins govern publication status and platform-wide availability.
                </p>
              </div>
            </div>

            {/* 3. Fixed Footer (Pinned at Bottom) */}
            <div className="px-5 py-3.5 border-t border-[#B6AA9A] bg-[#E2DCD4] flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                {selectedAssessment.status === 'Published' && (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => handleStatusChange(selectedAssessment, 'Draft')}
                      className="text-xs px-3 py-1.5"
                    >
                      Unpublish to Draft
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleStatusChange(selectedAssessment, 'Archived')}
                      className="text-xs px-3 py-1.5"
                    >
                      Archive Assessment
                    </Button>
                  </>
                )}

                {selectedAssessment.status === 'Draft' && (
                  <>
                    <Button
                      variant="primary"
                      onClick={() => handleStatusChange(selectedAssessment, 'Published')}
                      className="text-xs px-3 py-1.5"
                    >
                      Publish Assessment
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleStatusChange(selectedAssessment, 'Archived')}
                      className="text-xs px-3 py-1.5"
                    >
                      Archive
                    </Button>
                  </>
                )}

                {selectedAssessment.status === 'Archived' && (
                  <>
                    <Button
                      variant="primary"
                      onClick={() => handleStatusChange(selectedAssessment, 'Published')}
                      className="text-xs px-3 py-1.5"
                    >
                      Restore & Publish
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleStatusChange(selectedAssessment, 'Draft')}
                      className="text-xs px-3 py-1.5"
                    >
                      Restore to Draft
                    </Button>
                  </>
                )}
              </div>

              <Button
                variant="secondary"
                onClick={handleCloseDetails}
                className="text-xs px-4 py-1.5 ml-auto font-medium"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Destructive Actions */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState({ isOpen: false, title: '', message: '', onConfirm: () => {} })}
      />
    </PageContainer>
  );
}
