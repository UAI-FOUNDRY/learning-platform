import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import CourseHeader from '../../components/course/CourseHeader';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import { courseService } from '../../services/courseService';
import { subscribeToReviewUpdates } from '../../utils/courseReviews';

/**
 * StatusBadge
 * Semantic status indicator matching admin design tokens
 */
function StatusBadge({ status }) {
  const normalized = (status || '').toLowerCase();

  if (normalized === 'published' || normalized === 'active') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100/80 text-emerald-900 border border-emerald-300">
        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
        Published
      </span>
    );
  }

  if (normalized === 'pending review' || normalized === 'pending') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100/80 text-amber-900 border border-amber-300">
        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-amber-600" aria-hidden="true" />
        Pending Review
      </span>
    );
  }

  if (normalized === 'changes requested') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100/80 text-rose-900 border border-rose-300">
        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-rose-600" aria-hidden="true" />
        Changes Requested
      </span>
    );
  }

  if (normalized === 'rejected') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100/80 text-rose-900 border border-rose-300">
        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-rose-600" aria-hidden="true" />
        Rejected
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#EAE3DA] text-[#514940] border border-[#B6AA9A]">
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-stone-500" aria-hidden="true" />
      {status || 'Draft'}
    </span>
  );
}

export default function CourseDetails() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load course details by route param ID
  useEffect(() => {
    let isMounted = true;

    async function loadCourse() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await courseService.getCourseById(id);
        if (isMounted) {
          setCourse(data);
        }
      } catch (err) {
        if (isMounted) {
          setError('Unable to load course details from data provider.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadCourse();

    // Subscribe to session review updates in real time
    const unsubscribe = subscribeToReviewUpdates(async () => {
      if (isMounted && id) {
        const updated = await courseService.getCourseById(id);
        if (isMounted) {
          setCourse(updated);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [id]);

  // Loading State
  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center">
        <Loader size="large" />
        <p className="mt-4 text-sm text-[#71675D]">Loading course information...</p>
      </div>
    );
  }

  // Not Found or Error State
  if (error || !course) {
    return (
      <PageContainer>
        <div className="py-12">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-4">
            <Link
              to="/courses"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#514940] hover:text-[#D92D2D] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] rounded"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back to Course Catalog</span>
            </Link>
          </nav>

          <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-8 sm:p-12 shadow-xs">
            <EmptyState
              title="Course Not Found"
              description={
                id
                  ? `No course matching identifier "${id}" could be located in the platform catalog or review queue.`
                  : 'No course identifier was provided in the request URL.'
              }
              action={
                <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                  <Link
                    to="/courses"
                    className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-[#D92D2D] text-white hover:bg-[#B91C1C] transition-colors shadow-2xs"
                  >
                    Browse Course Catalog
                  </Link>
                  <Link
                    to="/admin/courses"
                    className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] hover:bg-[#D6D0C8] transition-colors"
                  >
                    Back to Course Management
                  </Link>
                </div>
              }
            />
          </div>
        </div>
      </PageContainer>
    );
  }

  const formattedDate = course.createdAt
    ? new Date(course.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : 'Recent';

  const isPublished = course.status === 'Published';
  const isPending = course.status === 'Pending Review';

  return (
    <div>
      {/* Course Header Banner */}
      <CourseHeader
        title={course.title}
        subtitle={course.description}
        instructor={course.instructor}
        category={course.category}
        level={course.level}
        modulesCount={course.modulesCount}
        rating={course.rating}
        ratingCount={course.ratingCount}
        enrolledCount={course.enrolledCount}
        status={course.status}
      />

      {/* Main Details Body */}
      <PageContainer>
        <div className="py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left Column: Course Overview & Curriculum (2 cols) */}
            <div className="lg:col-span-2 space-y-8">
              {/* Card 1: Course Overview */}
              <section
                aria-label="Course Overview"
                className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-6 shadow-xs"
              >
                <h2 className="text-[20px] font-bold text-[#211E1A] tracking-tight">
                  About This Course
                </h2>
                <p className="mt-3 text-[14px] leading-relaxed text-[#514940]">
                  {course.description ||
                    'Comprehensive curriculum registered with LearnSpace. Review syllabus modules below for learning topics and prerequisites.'}
                </p>

                {/* Course Highlights Pill Grid */}
                <div className="mt-6 pt-5 border-t border-[#B6AA9A] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-[#71675D] uppercase tracking-wider font-semibold block text-[10px]">
                      Discipline
                    </span>
                    <span className="font-semibold text-[#211E1A] mt-1 block text-[13px]">
                      {course.category || 'General'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#71675D] uppercase tracking-wider font-semibold block text-[10px]">
                      Difficulty
                    </span>
                    <span className="font-semibold text-[#211E1A] mt-1 block text-[13px]">
                      {course.level || 'All Levels'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#71675D] uppercase tracking-wider font-semibold block text-[10px]">
                      Curriculum
                    </span>
                    <span className="font-semibold text-[#211E1A] mt-1 block text-[13px]">
                      {course.modulesCount || 0} Modules
                    </span>
                  </div>

                  <div>
                    <span className="text-[#71675D] uppercase tracking-wider font-semibold block text-[10px]">
                      Catalog Status
                    </span>
                    <span className="mt-1 block">
                      <StatusBadge status={course.status} />
                    </span>
                  </div>
                </div>
              </section>

              {/* Card 2: Curriculum Structure & Module Breakdown */}
              <section
                aria-label="Course Curriculum"
                className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-6 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#B6AA9A]">
                  <div>
                    <h2 className="text-[20px] font-bold text-[#211E1A] tracking-tight">
                      Curriculum Structure
                    </h2>
                    <p className="text-xs text-[#514940] mt-0.5">
                      {course.modulesCount > 0
                        ? `${course.modulesCount} registered learning units by ${course.instructor}`
                        : 'Curriculum breakdown awaiting instructor module registration'}
                    </p>
                  </div>
                  <span className="self-start sm:self-auto px-2.5 py-1 rounded bg-[#EAE3DA] text-[#514940] border border-[#B6AA9A] text-xs font-mono font-medium">
                    {course.modulesCount || 0} Learning Units
                  </span>
                </div>

                {/* Modules List */}
                {course.modulesCount > 0 ? (
                  <div className="mt-4 divide-y divide-[#B6AA9A] text-[13px]">
                    {Array.from({ length: course.modulesCount }).map((_, idx) => (
                      <div key={idx} className="py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-[#EAE3DA] border border-[#B6AA9A] flex items-center justify-center font-mono text-[11px] font-bold text-[#514940] shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-medium text-[#211E1A]">
                            Module {idx + 1}: {course.category} Learning Unit {idx + 1}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#71675D] font-mono shrink-0">
                          {isPublished ? 'Available' : 'Staged'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-6 text-xs text-[#71675D] italic text-center">
                    No curriculum modules are currently registered for this course.
                  </p>
                )}

                {/* Staging & Stream Callout */}
                <div className="mt-6 p-3.5 rounded-lg bg-[#EAE3DA] border border-[#B6AA9A] text-xs text-[#514940] leading-relaxed">
                  <strong className="text-[#211E1A] block mb-1">
                    Media Stream Status:
                  </strong>
                  Full lesson video streaming, coding workspaces, and downloadable student assets are staged in instructor cloud storage. Video player streaming is accessible upon platform enrollment.
                </div>
              </section>

              {/* Card 3: Instructor Information */}
              <section
                aria-label="Instructor Information"
                className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-6 shadow-xs"
              >
                <h2 className="text-[20px] font-bold text-[#211E1A] tracking-tight mb-4">
                  Instructor Profile
                </h2>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#EAE3DA] border border-[#B6AA9A] flex items-center justify-center font-bold text-lg text-[#211E1A] shrink-0">
                    {course.instructor ? course.instructor.charAt(0) : 'I'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-[15px] text-[#211E1A]">
                      {course.instructor || 'Unassigned Faculty'}
                    </h3>
                    <p className="text-xs text-[#71675D] mt-0.5 font-mono">
                      Instructor ID: {course.instructor_id || 'inst-accredited'}
                    </p>
                    <p className="text-xs text-[#514940] mt-2 leading-relaxed">
                      Accredited educator providing specialized curriculum tracks in {course.category}. Instructors maintain curriculum materials, answer student discussions, and evaluate module assessments.
                    </p>
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column: Course Metadata Sidebar (1 col) */}
            <div className="lg:col-span-1 space-y-6">
              {/* Sidebar Card 1: Course Quick Details */}
              <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-5 sm:p-6 shadow-xs">
                <h3 className="text-[17px] font-bold text-[#211E1A] pb-3 border-b border-[#B6AA9A]">
                  Course Summary
                </h3>

                <dl className="mt-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <dt className="text-[#514940]">Course ID:</dt>
                    <dd className="font-mono font-medium text-[#211E1A]">{course.id}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-[#514940]">Catalog Status:</dt>
                    <dd>
                      <StatusBadge status={course.status} />
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-[#514940]">Level:</dt>
                    <dd className="font-medium text-[#211E1A]">{course.level || 'Beginner'}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-[#514940]">Category:</dt>
                    <dd className="font-medium text-[#211E1A]">{course.category || 'General'}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-[#514940]">Modules:</dt>
                    <dd className="font-medium text-[#211E1A]">{course.modulesCount || 0} units</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-[#514940]">Enrolled Students:</dt>
                    <dd className="font-mono font-medium text-[#211E1A]">
                      {typeof course.enrolledCount === 'number'
                        ? course.enrolledCount.toLocaleString()
                        : '0'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-[#514940]">Published Date:</dt>
                    <dd className="font-mono text-[#211E1A]">{formattedDate}</dd>
                  </div>
                </dl>

                {/* Primary Action Button */}
                <div className="mt-6 pt-5 border-t border-[#B6AA9A] space-y-3">
                  {isPublished ? (
                    <Link
                      to={`/learner/player/${course.id}`}
                      className="w-full flex items-center justify-center py-2.5 px-4 text-xs font-semibold rounded-lg bg-[#D92D2D] text-white hover:bg-[#B91C1C] transition-colors shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
                    >
                      <span>Start Learning Course →</span>
                    </Link>
                  ) : isPending ? (
                    <Link
                      to={`/admin/review/${course.id}`}
                      className="w-full flex items-center justify-center py-2.5 px-4 text-xs font-semibold rounded-lg bg-[#D92D2D] text-white hover:bg-[#B91C1C] transition-colors shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
                    >
                      <span>Open Review Console →</span>
                    </Link>
                  ) : (
                    <div className="p-3 rounded-lg bg-[#EAE3DA] border border-[#B6AA9A] text-xs text-[#514940] text-center">
                      <span className="font-semibold text-[#211E1A] block">
                        Preview Mode
                      </span>
                      This course is currently in <strong className="text-[#211E1A]">{course.status}</strong> status.
                    </div>
                  )}

                  <Link
                    to="/admin/courses"
                    className="w-full flex items-center justify-center py-2 px-3 text-xs font-semibold rounded-lg bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] hover:bg-[#D6D0C8] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
                  >
                    Back to Course Management
                  </Link>

                  <Link
                    to="/courses"
                    className="w-full flex items-center justify-center text-xs font-medium text-[#71675D] hover:text-[#D92D2D] transition-colors py-1"
                  >
                    ← Browse Public Catalog
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}

