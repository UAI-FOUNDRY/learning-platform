import React from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../../common/EmptyState';

/**
 * PendingApprovalsPanel
 * Compact list of courses awaiting administrative review and approval.
 * Links directly to the complete approvals queue.
 */
export default function PendingApprovalsPanel({ pendingCourses = [] }) {
  const hasItems = pendingCourses.length > 0;

  return (
    <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-5 sm:p-6 shadow-xs flex flex-col">
      <div>
        {/* Header with Count */}
        <div className="pb-3 border-b border-[#B6AA9A]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[20px] sm:text-[22px] font-bold text-[#211E1A] leading-tight tracking-tight">
              Pending Approvals
            </h2>
            <span className="shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] sm:text-[12px] font-semibold bg-amber-100/70 text-amber-900 border border-amber-300">
              {pendingCourses.length} Pending
            </span>
          </div>
          <p className="text-[13px] text-[#514940] mt-0.5 leading-relaxed">
            Courses submitted by instructors awaiting review
          </p>
        </div>

        {/* List of Pending Courses */}
        {!hasItems ? (
          <div className="py-8">
            <EmptyState
              title="No Pending Approvals"
              description="All course submissions have been reviewed. New submissions will appear here."
            />
          </div>
        ) : (
          <ul className="divide-y divide-[#B6AA9A] mt-1" role="list">
            {pendingCourses.map((course) => (
              <li key={course.id} className="py-3 first:pt-2.5 last:pb-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/admin/review/${course.id}`}
                      className="text-[14px] sm:text-[15px] font-semibold text-[#211E1A] hover:text-[#D92D2D] focus:outline-none focus-visible:underline line-clamp-1 transition-colors"
                    >
                      {course.title}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] sm:text-[13px] text-[#514940]">
                      <span>By <strong className="font-medium text-[#211E1A]">{course.instructor}</strong></span>
                      <span>•</span>
                      <span>{course.category}</span>
                      <span>•</span>
                      <span>{course.modulesCount} modules</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end shrink-0 gap-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100/70 text-amber-900 border border-amber-300">
                      Pending
                    </span>
                    <span className="text-[11px] text-[#71675D] font-mono">
                      {course.submittedAt ? new Date(course.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recent'}
                    </span>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between text-[12px] sm:text-[13px]">
                  <span className="text-[#71675D] text-[11px] sm:text-[12px]">
                    Level: <strong className="font-normal text-[#514940]">{course.level}</strong>
                  </span>
                  <Link
                    to={`/admin/review/${course.id}`}
                    className="font-medium text-[#D92D2D] hover:text-[#B91C1C] focus:outline-none focus-visible:underline"
                    aria-label={`Review ${course.title}`}
                  >
                    Review course →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer Link to Complete Approvals Queue */}
      <div className="pt-3.5 mt-2 border-t border-[#B6AA9A]">
        <Link
          to="/admin/approvals"
          className="w-full flex items-center justify-center py-2 px-4 text-[12px] sm:text-[13px] font-semibold rounded-lg bg-[#EAE3DA] text-[#D92D2D] border border-[#B6AA9A] hover:border-[#D92D2D]/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
        >
          <span>View Complete Approvals Queue ({pendingCourses.length})</span>
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
