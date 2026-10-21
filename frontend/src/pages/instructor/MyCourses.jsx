import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import CourseStatusBadge from '../../components/instructor/CourseStatusBadge';
import { instructorCourseService } from '../../services/instructorCourseService';
import { mockCategories } from '../../data/mockCategories';

export default function MyCourses() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters & State
  const initialStatus = searchParams.get('status') || 'all';
  const [selectedStatus, setSelectedStatus] = useState(initialStatus);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  const [courses, setCourses] = useState(() => instructorCourseService.getCourses());
  const [allCourses, setAllCourses] = useState(() => instructorCourseService.getCourses());
  const [notification, setNotification] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [courseToSubmit, setCourseToSubmit] = useState(null);

  const loadCourses = useCallback(() => {
    const list = instructorCourseService.getCourses({
      search: searchQuery,
      status: selectedStatus,
      category: selectedCategory,
      sort: sortBy
    });
    setCourses(list);
    setAllCourses(instructorCourseService.getCourses());
  }, [searchQuery, selectedStatus, selectedCategory, sortBy]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    const unsubscribe = instructorCourseService.subscribe(loadCourses);
    return () => unsubscribe();
  }, [loadCourses]);

  // Update status filter if query param changes
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam && statusParam !== selectedStatus) {
      setSelectedStatus(statusParam);
    }
  }, [searchParams, selectedStatus]);

  const handleStatusChange = (status) => {
    setSelectedStatus(status);
    if (status === 'all') {
      searchParams.delete('status');
    } else {
      searchParams.set('status', status);
    }
    setSearchParams(searchParams);
  };

  // Status counts for filter pills
  const statusCounts = useMemo(() => {
    return {
      all: allCourses.length,
      Published: allCourses.filter(c => c.status === 'Published').length,
      'Pending Review': allCourses.filter(c => c.status === 'Pending Review').length,
      'Changes Requested': allCourses.filter(c => c.status === 'Changes Requested').length,
      Draft: allCourses.filter(c => c.status === 'Draft').length
    };
  }, [allCourses]);

  // Submission handler
  const handleConfirmSubmit = (courseId) => {
    setIsSubmitting(true);
    try {
      instructorCourseService.submitForReview(courseId);
      setNotification({
        type: 'success',
        message: 'Course submitted to Super Admin queue for quality review! (Simulated locally)'
      });
      setCourseToSubmit(null);
      loadCourses();
      setTimeout(() => setNotification(null), 5000);
    } catch {
      setNotification({
        type: 'error',
        message: 'Could not submit course. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCourse = (courseId, courseTitle) => {
    if (window.confirm(`Are you sure you want to remove "${courseTitle}"? This will delete the draft from local storage.`)) {
      instructorCourseService.deleteCourse(courseId);
      setNotification({
        type: 'info',
        message: `Course "${courseTitle}" removed.`
      });
      loadCourses();
      setTimeout(() => setNotification(null), 4000);
    }
  };

  return (
    <PageContainer>
      {/* Header */}
      <div className="pb-6 border-b border-[#B6AA9A] animate-slide-up">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded bg-[#EAE3DA] text-[#D92D2D] border border-[#B6AA9A] shadow-xs">
                Course Management
              </span>
              <span className="text-xs font-semibold text-[#71675D]">
                Instructor Portfolio
              </span>
            </div>
            <h1 className="mt-2 text-[26px] sm:text-[32px] font-extrabold tracking-tight text-[#211E1A] font-sans leading-tight">
              My Courses
            </h1>
            <p className="mt-1.5 text-[14px] leading-relaxed text-[#514940] max-w-3xl">
              Create, organize, and monitor your curriculum. Track administrative review states and resubmit courses when revisions are requested.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/instructor/courses/new"
              className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-bold rounded-lg bg-[#D92D2D] text-white hover:bg-[#B91C1C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Create New Course</span>
            </Link>
          </div>
        </div>

        {/* Global Notification Toast */}
        {notification && (
          <div
            role="status"
            className={`mt-4 p-4 rounded-xl border flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold animate-slide-down shadow-md ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-950 border-emerald-400'
                : notification.type === 'error'
                ? 'bg-red-50 text-red-950 border-red-400'
                : 'bg-[#EAE3DA] text-[#211E1A] border-[#B6AA9A]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span>{notification.type === 'success' ? '✓' : 'ℹ️'}</span>
              <span>{notification.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="font-bold text-sm px-2 py-0.5 hover:opacity-75"
            >
              ✕
            </button>
          </div>
        )}

        {/* Status Filter Tabs */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-[#B6AA9A]/50 pb-3">
          {[
            { id: 'all', label: 'All Courses', count: statusCounts.all },
            { id: 'Published', label: 'Published', count: statusCounts.Published },
            { id: 'Pending Review', label: 'Pending Review', count: statusCounts['Pending Review'] },
            { id: 'Changes Requested', label: 'Changes Requested', count: statusCounts['Changes Requested'] },
            { id: 'Draft', label: 'Drafts', count: statusCounts.Draft }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleStatusChange(tab.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                selectedStatus.toLowerCase() === tab.id.toLowerCase()
                  ? 'bg-[#211E1A] text-white shadow-md -translate-y-0.5'
                  : 'bg-[#EAE3DA] text-[#514940] border border-[#B6AA9A] hover:bg-[#D6D0C8] hover:text-[#211E1A]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                  selectedStatus.toLowerCase() === tab.id.toLowerCase()
                    ? 'bg-white/20 text-white'
                    : 'bg-[#C8BBAA] text-[#211E1A]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Filter Toolbar */}
        <div className="mt-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, topic, or description..."
              className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm bg-white border border-[#B6AA9A] rounded-lg text-[#211E1A] placeholder-[#71675D] focus:outline-none focus:border-[#D92D2D] focus:ring-1 focus:ring-[#D92D2D] shadow-2xs transition-colors"
              aria-label="Search your courses"
            />
            <svg
              className="w-4 h-4 text-[#71675D] absolute left-3 top-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-3 text-xs text-[#71675D] hover:text-[#211E1A]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category, Sort & View Mode */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs py-2.5 px-3 bg-white border border-[#B6AA9A] rounded-lg text-[#211E1A] focus:outline-none focus:border-[#D92D2D] shadow-2xs font-medium"
              aria-label="Filter by category"
            >
              <option value="all">All Categories</option>
              {mockCategories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs py-2.5 px-3 bg-white border border-[#B6AA9A] rounded-lg text-[#211E1A] focus:outline-none focus:border-[#D92D2D] shadow-2xs font-medium"
              aria-label="Sort courses"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="students">Sort: Most Students</option>
              <option value="rating">Sort: Highest Rating</option>
              <option value="title">Sort: Title (A-Z)</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg border border-[#B6AA9A] bg-[#EAE3DA] p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded text-xs font-semibold transition-all ${
                  viewMode === 'grid' ? 'bg-white text-[#211E1A] shadow-xs' : 'text-[#71675D] hover:text-[#211E1A]'
                }`}
                aria-label="Grid card view"
                title="Grid View"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-2 rounded text-xs font-semibold transition-all ${
                  viewMode === 'table' ? 'bg-white text-[#211E1A] shadow-xs' : 'text-[#71675D] hover:text-[#211E1A]'
                }`}
                aria-label="Table view"
                title="Table View"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Course List Content */}
      <div className="mt-8 animate-slide-up">
        {courses.length === 0 ? (
          <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-12 text-center shadow-xs">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#EAE3DA] border border-[#B6AA9A] flex items-center justify-center text-[#71675D]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="mt-4 text-base font-bold text-[#211E1A]">No courses matched your filters</h3>
            <p className="mt-1 text-xs text-[#514940] max-w-sm mx-auto">
              No courses matched your current filter criteria. Try clearing search filters or create a new course.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  handleStatusChange('all');
                  setSelectedCategory('all');
                }}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] hover:bg-[#D6D0C8]"
              >
                Reset All Filters
              </button>
              <Link
                to="/instructor/courses/new"
                className="px-4 py-2 text-xs font-bold rounded-lg bg-[#D92D2D] text-white hover:bg-[#B91C1C] shadow-xs"
              >
                Create New Course
              </Link>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          /* Animated Grid View Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => {
              const totalLessons = (course.modules || []).reduce(
                (sum, m) => sum + ((m.lessons || []).length),
                0
              );

              return (
                <div
                  key={course.id}
                  className="group bg-white border border-[#B6AA9A] rounded-xl overflow-hidden shadow-xs hover-lift interactive-card flex flex-col justify-between"
                >
                  <div>
                    {/* Thumbnail with Hover Zoom */}
                    <div className="relative h-44 bg-[#EAE3DA] overflow-hidden">
                      {course.thumbnail ? (
                        <img
                          src={course.thumbnail}
                          alt={course.title}
                          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500 ease-out"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : null}

                      {/* Overlaid Badges */}
                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/95 text-[#211E1A] shadow-xs backdrop-blur-xs">
                          {course.category}
                        </span>
                      </div>

                      <div className="absolute top-3 right-3">
                        <CourseStatusBadge status={course.status} />
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5">
                      <div className="flex items-center gap-2 text-[11px] font-bold text-[#71675D]">
                        <span>{course.level || 'All Levels'}</span>
                        <span>•</span>
                        <span>{(course.modules || []).length} Modules</span>
                        <span>•</span>
                        <span>{totalLessons} Lessons</span>
                      </div>

                      <h3 className="mt-2 text-base font-bold text-[#211E1A] line-clamp-2 leading-snug group-hover:text-[#D92D2D] transition-colors">
                        {course.title}
                      </h3>

                      <p className="mt-1.5 text-xs text-[#514940] line-clamp-2 leading-relaxed">
                        {course.description || 'No description provided.'}
                      </p>

                      {/* Admin Feedback Notice for Changes Requested */}
                      {course.status === 'Changes Requested' && course.feedback && (
                        <div className="mt-3 p-3 rounded-lg bg-[#FFF5F5] border border-[#D92D2D]/40 text-xs shadow-2xs">
                          <p className="font-bold text-[#B91C1C] flex items-center gap-1.5">
                            <span className="animate-bounce">⚠️</span>
                            <span>Admin Feedback Notice</span>
                          </p>
                          <p className="mt-1 text-[#8A2424] line-clamp-2 leading-relaxed">
                            {course.feedback}
                          </p>
                        </div>
                      )}

                      {/* Metrics: Enrolled & Rating */}
                      <div className="mt-4 pt-3 border-t border-[#B6AA9A]/40 flex items-center justify-between text-xs text-[#514940]">
                        <div className="flex items-center gap-1.5 font-medium">
                          <span>👥</span>
                          <span><strong>{course.enrolledCount || 0}</strong> students</span>
                        </div>
                        {course.status === 'Published' && course.rating > 0 ? (
                          <div className="flex items-center gap-1 text-amber-600 font-bold">
                            <span>★</span>
                            <span>{course.rating.toFixed(1)}</span>
                            <span className="text-[11px] text-[#71675D] font-normal">({course.ratingCount})</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#71675D] font-medium">
                            {course.status === 'Published' ? 'No reviews yet' : 'Not yet enrolled'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="p-4 bg-[#EAE3DA]/60 border-t border-[#B6AA9A]/50 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/instructor/courses/${course.id}/edit`}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#211E1A] text-white hover:bg-black transition-all shadow-xs"
                      >
                        Edit Curriculum
                      </Link>

                      <Link
                        to={`/instructor/courses/${course.id}/preview`}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white text-[#514940] border border-[#B6AA9A] hover:bg-[#D6D0C8] transition-colors"
                      >
                        Preview
                      </Link>
                    </div>

                    {/* Submission / Resubmission Buttons */}
                    {course.status === 'Changes Requested' ? (
                      <button
                        type="button"
                        onClick={() => setCourseToSubmit(course)}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#D92D2D] text-white hover:bg-[#B91C1C] transition-all shadow-xs hover:shadow"
                      >
                        Resubmit
                      </button>
                    ) : course.status === 'Draft' ? (
                      <button
                        type="button"
                        onClick={() => setCourseToSubmit(course)}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#D92D2D] text-white hover:bg-[#B91C1C] transition-all shadow-xs hover:shadow"
                      >
                        Submit for Review
                      </button>
                    ) : course.status === 'Pending Review' ? (
                      <span className="text-[11px] font-bold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-md border border-amber-300">
                        In Review Queue
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Animated Table View */
          <div className="bg-white border border-[#B6AA9A] rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#EAE3DA] border-b border-[#B6AA9A] text-[#211E1A] uppercase tracking-wider text-[11px]">
                  <tr>
                    <th scope="col" className="py-3 px-4 font-extrabold">Course Title</th>
                    <th scope="col" className="py-3 px-4 font-extrabold">Category</th>
                    <th scope="col" className="py-3 px-4 font-extrabold">Status</th>
                    <th scope="col" className="py-3 px-4 font-extrabold">Curriculum</th>
                    <th scope="col" className="py-3 px-4 font-extrabold">Students</th>
                    <th scope="col" className="py-3 px-4 font-extrabold">Rating</th>
                    <th scope="col" className="py-3 px-4 font-extrabold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#B6AA9A]/40 text-[#514940]">
                  {courses.map((course) => {
                    const totalLessons = (course.modules || []).reduce((s, m) => s + (m.lessons || []).length, 0);

                    return (
                      <tr key={course.id} className="hover:bg-[#EAE3DA]/40 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-[#211E1A] max-w-xs">
                          <Link
                            to={`/instructor/courses/${course.id}/edit`}
                            className="hover:text-[#D92D2D] hover:underline"
                          >
                            {course.title}
                          </Link>
                          {course.status === 'Changes Requested' && course.feedback && (
                            <p className="mt-1 text-[11px] font-medium text-[#B91C1C] truncate">
                              ⚠️ Feedback: {course.feedback}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap font-medium">{course.category}</td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <CourseStatusBadge status={course.status} size="sm" />
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                          {(course.modules || []).length} modules, {totalLessons} lessons
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap font-bold text-[#211E1A]">
                          {course.enrolledCount || 0}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {course.rating > 0 ? (
                            <span className="text-amber-600 font-bold">★ {course.rating.toFixed(1)}</span>
                          ) : (
                            <span className="text-[#71675D]">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-right space-x-2">
                          <Link
                            to={`/instructor/courses/${course.id}/edit`}
                            className="font-bold text-xs text-[#211E1A] hover:text-[#D92D2D]"
                          >
                            Edit
                          </Link>
                          {course.status === 'Draft' || course.status === 'Changes Requested' ? (
                            <button
                              type="button"
                              onClick={() => setCourseToSubmit(course)}
                              className="font-bold text-xs text-[#D92D2D] hover:underline"
                            >
                              {course.status === 'Changes Requested' ? 'Resubmit' : 'Submit'}
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Course Submission / Resubmission Confirmation Modal */}
      {courseToSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#EAE3DA] rounded-2xl shadow-2xl border border-[#B6AA9A] max-w-lg w-full overflow-hidden p-6 animate-scale-in">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#D92D2D]">
                  Course Submission Workflow
                </span>
                <h3 className="mt-1 text-lg font-extrabold text-[#211E1A]">
                  {courseToSubmit.status === 'Changes Requested'
                    ? 'Resubmit Course for Super Admin Review'
                    : 'Submit Course for Review'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCourseToSubmit(null)}
                className="text-[#71675D] hover:text-[#211E1A] text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="mt-3 text-xs sm:text-sm text-[#514940] leading-relaxed">
              You are about to submit <strong>"{courseToSubmit.title}"</strong> to the Super Admin review queue.
            </p>

            {courseToSubmit.status === 'Changes Requested' && (
              <div className="mt-3 p-3 rounded-lg bg-[#FFF5F5] border border-[#D92D2D]/40 text-xs text-[#8A2424] shadow-xs">
                <p className="font-extrabold">Addressing previous admin feedback:</p>
                <p className="mt-1 italic">{courseToSubmit.feedback}</p>
              </div>
            )}

            <div className="mt-4 p-3.5 bg-white rounded-xl border border-[#B6AA9A] text-xs text-[#514940] space-y-1.5 shadow-2xs">
              <p className="flex items-center gap-1.5">
                <span className="text-emerald-700 font-bold">✓</span>
                <span>Current curriculum: {(courseToSubmit.modules || []).length} sections configured</span>
              </p>
              <p className="flex items-center gap-1.5">
                <span className="text-emerald-700 font-bold">✓</span>
                <span>Status transition: from <strong className="text-[#211E1A]">{courseToSubmit.status}</strong> to <strong className="text-amber-800">Pending Review</strong></span>
              </p>
              <p className="flex items-center gap-1.5">
                <span className="text-emerald-700 font-bold">✓</span>
                <span>Admin reviewers will receive notification in Course Approvals</span>
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCourseToSubmit(null)}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-white text-[#514940] border border-[#B6AA9A] hover:bg-[#D6D0C8] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmSubmit(courseToSubmit.id)}
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold rounded-lg bg-[#D92D2D] text-white hover:bg-[#B91C1C] disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
              >
                {isSubmitting ? 'Submitting...' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
