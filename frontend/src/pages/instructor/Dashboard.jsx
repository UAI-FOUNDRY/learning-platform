import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import CourseStatusBadge from '../../components/instructor/CourseStatusBadge';
import { instructorCourseService } from '../../services/instructorCourseService';

// Custom SVG Icons
function CoursesIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function PublishedIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function DraftIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function AwaitingIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function StudentsIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function StarIcon({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

function MetricCard({ title, value, description, to, icon: Icon, badgeText, badgeColor = 'amber', trend }) {
  const content = (
    <div className="group p-5 sm:p-6 flex flex-col justify-between h-full bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl shadow-xs interactive-card hover-lift relative overflow-hidden">
      {/* Subtle background glow accent */}
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/20 rounded-full blur-xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />

      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <span className="text-[13px] sm:text-[14px] font-bold text-[#514940] leading-snug">
            {title}
          </span>
          {Icon && (
            <div className="shrink-0 p-2.5 rounded-xl bg-[#EAE3DA] text-[#D92D2D] border border-[#B6AA9A] group-hover:bg-[#D92D2D] group-hover:text-white transition-colors duration-200">
              <Icon className="w-5 h-5" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="flex items-baseline justify-between gap-2 mt-2">
          <span className="text-[30px] sm:text-[34px] font-extrabold tracking-tight text-[#211E1A] font-sans leading-none">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>
          {badgeText && (
            <span
              className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border transition-transform duration-200 group-hover:scale-105 ${
                badgeColor === 'red'
                  ? 'bg-red-100 text-[#B91C1C] border-red-300'
                  : 'bg-amber-100 text-amber-900 border-amber-300'
              }`}
            >
              {badgeText}
            </span>
          )}
        </div>

        {description && (
          <p className="mt-2.5 text-[12px] sm:text-[13px] leading-relaxed text-[#514940]">
            {description}
          </p>
        )}

        {trend && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800">
            <span>↑</span>
            <span>{trend}</span>
          </div>
        )}
      </div>

      {to && (
        <div className="mt-4 pt-3 border-t border-[#B6AA9A] flex items-center justify-between text-[12px] sm:text-[13px] font-bold text-[#D92D2D] group-hover:text-[#B91C1C]">
          <span>View courses</span>
          <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </div>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="block group rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
        aria-label={`${title}: ${value}. Click to view.`}
      >
        {content}
      </Link>
    );
  }

  return <div>{content}</div>;
}

export default function InstructorDashboard() {
  const navigate = useNavigate();
  const [profile] = useState(() => instructorCourseService.getProfile());
  const [stats, setStats] = useState(() => instructorCourseService.getDashboardStats());
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);

  const loadData = useCallback(() => {
    const updatedStats = instructorCourseService.getDashboardStats();
    setStats(updatedStats);
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    const unsubscribe = instructorCourseService.subscribe(loadData);
    return () => unsubscribe();
  }, [loadData]);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRefreshNotice(null);

    // Simulate reactive refresh
    setTimeout(() => {
      loadData();
      setIsRefreshing(false);
      setRefreshNotice('Refreshed instructor metrics & review states from local session.');
      setTimeout(() => setRefreshNotice(null), 3500);
    }, 400);
  };

  const timeString = lastUpdated.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <PageContainer>
      {/* Top Subtle Progress Bar during refresh */}
      {isRefreshing && (
        <div
          role="progressbar"
          aria-label="Refreshing instructor dashboard"
          className="fixed top-0 left-0 right-0 z-50 h-1 bg-[#EAE3DA] overflow-hidden"
        >
          <div className="h-full bg-[#D92D2D] w-full animate-pulse transition-all duration-300" />
        </div>
      )}

      {/* Header & Quick Action Controls */}
      <div className="pb-6 border-b border-[#B6AA9A] animate-slide-up">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded bg-[#EAE3DA] text-[#D92D2D] border border-[#B6AA9A] shadow-xs">
                Instructor Portal
              </span>
              <span className="text-xs font-semibold text-[#71675D]">
                {profile.department}
              </span>
            </div>
            <h1 className="mt-2 text-[26px] sm:text-[32px] font-extrabold tracking-tight text-[#211E1A] font-sans leading-tight">
              Welcome back, {profile.name}
            </h1>
            <p className="mt-1.5 text-[14px] leading-relaxed text-[#514940] max-w-3xl">
              Centralized teaching command center. Create coding-integrated courses, monitor student performance, and track administrative review status.
            </p>
          </div>

          {/* Action Buttons & Refresh */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-[12px] sm:text-[13px] bg-[#EAE3DA] px-3 py-1.5 rounded-lg border border-[#B6AA9A]">
              <span className="text-[#71675D]">
                Snapshot: <span className="font-mono text-[#211E1A] font-bold">{timeString}</span>
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Live Demo
              </span>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-[13px] font-bold rounded-lg bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] hover:bg-[#D6D0C8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] transition-colors"
              aria-label="Refresh dashboard data"
            >
              <svg className={`w-4 h-4 text-[#514940] ${isRefreshing ? 'animate-spin text-[#D92D2D]' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            <Link
              to="/instructor/courses/new"
              className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-bold rounded-lg bg-[#D92D2D] text-white hover:bg-[#B91C1C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Create Course</span>
            </Link>
          </div>
        </div>

        {/* Development Sample Data Banner */}
        <div className="mt-4 p-3.5 bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-[13px] shadow-xs">
          <div className="flex items-center gap-2.5 text-[#211E1A]">
            <span className="shrink-0 font-extrabold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-[#D92D2D] text-white shadow-xs">
              Simulation Active
            </span>
            <span>
              <strong>Instructor Demo Session:</strong> Local course persistence with real-time synchronization to Super Admin course approval decisions.
            </span>
          </div>

          {refreshNotice && (
            <span className="shrink-0 text-emerald-900 font-bold animate-fade-in text-[12px] bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300">
              {refreshNotice}
            </span>
          )}
        </div>
      </div>

      <div className="mt-8 space-y-8 animate-slide-up">
        {/* Section 1: Course Lifecycle Metrics (4 Cards) */}
        <section aria-label="Course Lifecycle Metrics">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[17px] font-bold text-[#211E1A]">
              Course Lifecycle Pipeline
            </h2>
            <Link
              to="/instructor/courses"
              className="text-xs font-bold text-[#D92D2D] hover:underline flex items-center gap-1 group"
            >
              <span>View all courses</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
            <MetricCard
              title="Total Courses"
              value={stats.totalCourses}
              description="Authoring catalog under your account"
              to="/instructor/courses"
              icon={CoursesIcon}
              trend="+2 this quarter"
            />
            <MetricCard
              title="Published Courses"
              value={stats.publishedCourses}
              description="Live and accepting learner enrollments"
              to="/instructor/courses?status=Published"
              icon={PublishedIcon}
              trend="100% catalog rating"
            />
            <MetricCard
              title="Draft Courses"
              value={stats.draftCourses}
              description="In active development / curriculum authoring"
              to="/instructor/courses?status=Draft"
              icon={DraftIcon}
            />
            <MetricCard
              title="Awaiting Approval"
              value={stats.awaitingApproval}
              description={
                stats.changesRequested > 0
                  ? `${stats.changesRequested} requires revisions from admin`
                  : 'In Super Admin review queue'
              }
              to="/instructor/courses?status=Pending Review"
              icon={AwaitingIcon}
              badgeText={stats.changesRequested > 0 ? `${stats.changesRequested} Action Required` : (stats.pendingCourses > 0 ? 'Pending Review' : null)}
              badgeColor={stats.changesRequested > 0 ? 'red' : 'amber'}
            />
          </div>
        </section>

        {/* Section 2: Student & Engagement Statistics */}
        <section aria-label="Learner Performance and Engagement">
          <h2 className="text-[17px] font-bold text-[#211E1A] mb-4">
            Learner Engagement & Academic Performance
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Total Students */}
            <div className="p-5 bg-[#EAE3DA] border border-[#B6AA9A] rounded-xl flex items-center gap-4 interactive-card hover-lift shadow-xs">
              <div className="p-3.5 rounded-xl bg-[#C8BBAA] text-[#211E1A] border border-[#B6AA9A] shrink-0">
                <StudentsIcon className="w-6 h-6 text-[#D92D2D]" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#71675D] uppercase tracking-wider">
                  Enrolled Students
                </p>
                <p className="text-2xl font-extrabold text-[#211E1A] mt-0.5">
                  {stats.totalStudents.toLocaleString()}
                </p>
                <p className="text-[11px] text-emerald-800 font-semibold mt-0.5 flex items-center gap-1">
                  <span>↑ 18%</span>
                  <span className="text-[#514940] font-normal">vs last month</span>
                </p>
              </div>
            </div>

            {/* Average Rating */}
            <div className="p-5 bg-[#EAE3DA] border border-[#B6AA9A] rounded-xl flex items-center gap-4 interactive-card hover-lift shadow-xs">
              <div className="p-3.5 rounded-xl bg-[#C8BBAA] text-[#211E1A] border border-[#B6AA9A] shrink-0">
                <StarIcon className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#71675D] uppercase tracking-wider">
                  Average Rating
                </p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-2xl font-extrabold text-[#211E1A]">
                    {stats.averageRating}
                  </span>
                  <span className="text-xs text-[#71675D] font-bold">/ 5.0</span>
                </div>
                <p className="text-[11px] text-[#514940] mt-0.5">
                  From {stats.totalRatingsCount} student reviews
                </p>
              </div>
            </div>

            {/* Course Completion Rate */}
            <div className="p-5 bg-[#EAE3DA] border border-[#B6AA9A] rounded-xl flex items-center gap-4 interactive-card hover-lift shadow-xs">
              <div className="p-3.5 rounded-xl bg-[#C8BBAA] text-[#211E1A] border border-[#B6AA9A] shrink-0">
                <svg className="w-6 h-6 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-[#71675D] uppercase tracking-wider">
                  Completion Rate
                </p>
                <p className="text-2xl font-extrabold text-[#211E1A] mt-0.5">
                  {stats.completionRate}%
                </p>
                <p className="text-[11px] text-emerald-800 font-semibold mt-0.5">
                  Top 5% platform benchmark
                </p>
              </div>
            </div>

            {/* Active Student Inquiries */}
            <div className="p-5 bg-[#EAE3DA] border border-[#B6AA9A] rounded-xl flex items-center gap-4 interactive-card hover-lift shadow-xs">
              <div className="p-3.5 rounded-xl bg-[#C8BBAA] text-[#211E1A] border border-[#B6AA9A] shrink-0">
                <svg className="w-6 h-6 text-[#514940]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-[#71675D] uppercase tracking-wider">
                  Active Q&A Inquiries
                </p>
                <p className="text-2xl font-extrabold text-[#211E1A] mt-0.5">
                  {stats.activeInquiries}
                </p>
                <p className="text-[11px] text-amber-800 font-semibold mt-0.5">
                  Needs instructor feedback
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Dual Column (Courses Needing Attention / Trends & Recent Activity) */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          {/* Left Column (2 Cols): Courses Needing Attention & Interactive Enrollment Growth */}
          <div className="lg:col-span-2 space-y-6">
            {/* Courses Needing Attention (Changes Requested or Pending Review) */}
            <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-[#B6AA9A]">
                <div>
                  <h3 className="text-base font-extrabold text-[#211E1A] flex items-center gap-2">
                    <span>Review Status & Action Queue</span>
                    {stats.changesRequested > 0 && (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#D92D2D] animate-ping" />
                    )}
                  </h3>
                  <p className="text-xs text-[#514940] mt-0.5">
                    Courses currently awaiting Super Admin review or requiring curriculum adjustments
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-[#EAE3DA] text-[#D92D2D] border border-[#B6AA9A]">
                  {stats.coursesNeedingAttention.length} active
                </span>
              </div>

              {stats.coursesNeedingAttention.length === 0 ? (
                <div className="py-8 text-center text-sm text-[#71675D]">
                  <p className="font-bold text-[#211E1A]">All courses are in good standing!</p>
                  <p className="text-xs mt-1">No courses currently waiting for review or requested changes.</p>
                </div>
              ) : (
                <div className="mt-4 divide-y divide-[#B6AA9A]/60">
                  {stats.coursesNeedingAttention.map((course) => (
                    <div
                      key={course.id}
                      className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <CourseStatusBadge status={course.status} size="sm" />
                          <span className="text-xs font-bold text-[#71675D]">
                            {course.category}
                          </span>
                        </div>
                        <h4 className="mt-1.5 text-sm font-bold text-[#211E1A] group-hover:text-[#D92D2D] transition-colors">
                          {course.title}
                        </h4>
                        {course.status === 'Changes Requested' && course.feedback && (
                          <div className="mt-2.5 p-3 rounded-lg bg-[#FFF5F5] border border-[#D92D2D]/30 text-xs text-[#8A2424] shadow-xs">
                            <span className="font-extrabold">Admin Revision Request: </span>
                            {course.feedback}
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <Link
                          to={`/instructor/courses/${course.id}/edit`}
                          className="px-4 py-2 text-xs font-bold rounded-lg bg-[#D92D2D] text-white hover:bg-[#B91C1C] transition-all shadow-xs hover:shadow-md"
                        >
                          {course.status === 'Changes Requested' ? 'Edit & Resubmit' : 'Open Curriculum'}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Monthly Enrollment Trend Bar Representation */}
            <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-[#B6AA9A]">
                <div>
                  <h3 className="text-base font-extrabold text-[#211E1A]">
                    Monthly Enrollment Velocity
                  </h3>
                  <p className="text-xs text-[#514940] mt-0.5">
                    Student registrations across all your courses over the past 6 months
                  </p>
                </div>
                {selectedMonth ? (
                  <span className="text-xs font-bold text-[#211E1A] bg-[#EAE3DA] px-2.5 py-1 rounded border border-[#B6AA9A]">
                    {selectedMonth.month}: <strong>{selectedMonth.count} students</strong>
                  </span>
                ) : (
                  <span className="text-xs text-[#71675D]">
                    Hover over bars for stats
                  </span>
                )}
              </div>

              <div className="mt-6 flex items-end justify-between gap-3 h-40 px-2">
                {stats.monthlyEnrollments.map((item) => {
                  const maxCount = Math.max(...stats.monthlyEnrollments.map(m => m.count));
                  const heightPercent = Math.round((item.count / maxCount) * 100);
                  const isHovered = selectedMonth?.month === item.month;

                  return (
                    <div
                      key={item.month}
                      className="flex-1 flex flex-col items-center gap-2 cursor-pointer group"
                      onMouseEnter={() => setSelectedMonth(item)}
                      onMouseLeave={() => setSelectedMonth(null)}
                    >
                      <span className={`text-[11px] font-bold transition-all ${isHovered ? 'text-[#D92D2D] scale-110' : 'text-[#211E1A]'}`}>
                        {item.count}
                      </span>
                      <div className="w-full bg-[#EAE3DA] rounded-t-md h-28 flex items-end overflow-hidden border border-[#B6AA9A] group-hover:border-[#D92D2D] transition-colors">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full transition-all duration-300 rounded-t-xs ${
                            isHovered ? 'bg-[#B91C1C]' : 'bg-[#D92D2D]'
                          }`}
                        />
                      </div>
                      <span className={`text-xs font-bold transition-colors ${isHovered ? 'text-[#D92D2D]' : 'text-[#514940]'}`}>
                        {item.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column (1 Col): Recent Activity Timeline & Course Creation Standard */}
          <div className="space-y-6">
            {/* Recent Activity */}
            <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3.5 border-b border-[#B6AA9A]">
                <h3 className="text-sm font-extrabold text-[#211E1A]">
                  Student Interaction Stream
                </h3>
                <span className="text-[11px] text-[#71675D] font-semibold">
                  Live Feed
                </span>
              </div>

              <div className="mt-4 space-y-4">
                {stats.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 group">
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-[#EAE3DA] border border-[#B6AA9A] flex items-center justify-center text-sm shadow-2xs group-hover:scale-110 transition-transform">
                      {activity.icon === 'user' ? '👤' : activity.icon === 'code' ? '💻' : activity.icon === 'star' ? '★' : activity.icon === 'review' ? '📋' : '💬'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#211E1A] group-hover:text-[#D92D2D] transition-colors">
                        {activity.title}
                      </p>
                      <p className="text-xs text-[#514940] leading-snug mt-0.5">
                        {activity.description}
                      </p>
                      <span className="text-[10px] text-[#71675D] mt-1 block font-mono">
                        {activity.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Curriculum Checklist & Guidelines based on PROJECT.md */}
            <div className="bg-[#EAE3DA] border border-[#B6AA9A] rounded-xl p-5 shadow-xs interactive-card hover-lift">
              <div className="flex items-center gap-2 mb-2">
                <span className="p-1 rounded bg-[#D92D2D] text-white">
                  <CoursesIcon className="w-4 h-4" />
                </span>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#211E1A]">
                  Curriculum Authoring Standard
                </h3>
              </div>
              <p className="text-xs text-[#514940] leading-relaxed">
                Per <strong>PROJECT.md</strong> guidelines, high-impact courses feature:
              </p>
              <ul className="mt-3 space-y-2 text-xs text-[#514940]">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-700 font-bold">✓</span>
                  <span>Sequential sections with bite-sized lectures</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-700 font-bold">✓</span>
                  <span>Integrated Python coding workspace with unit tests</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-700 font-bold">✓</span>
                  <span>Formative assessment quizzes after core topics</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-700 font-bold">✓</span>
                  <span>Prerequisites and clear skill objectives</span>
                </li>
              </ul>
              <div className="mt-4 pt-3 border-t border-[#B6AA9A]">
                <button
                  type="button"
                  onClick={() => navigate('/instructor/courses/new')}
                  className="w-full py-2.5 text-xs font-bold rounded-lg bg-[#C8BBAA] hover:bg-[#BFB09D] text-[#211E1A] border border-[#B6AA9A] transition-all shadow-xs hover:shadow"
                >
                  Start New Course Draft
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
