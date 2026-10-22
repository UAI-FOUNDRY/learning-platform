import React from 'react';
import { Link } from 'react-router-dom';

/**
 * CourseHeader
 * Renders the primary header banner for course details with rich metadata,
 * breadcrumbs, category and level badges, instructor information, and catalog stats.
 */
export default function CourseHeader({
  title,
  subtitle,
  instructor,
  category,
  level,
  modulesCount,
  rating,
  ratingCount,
  enrolledCount,
  status
}) {
  const isPublished = status === 'Published';
  const hasMetadata = category || level || instructor || modulesCount || enrolledCount || rating;

  return (
    <div className="bg-[#C8BBAA] border-b border-[#B6AA9A] text-[#211E1A] py-10 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-4">
          <div className="flex items-center gap-2 text-xs font-medium text-[#514940]">
            <Link
              to="/courses"
              className="hover:text-[#D92D2D] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] rounded"
            >
              Course Catalog
            </Link>
            {category && (
              <>
                <span>/</span>
                <span className="text-[#211E1A] font-semibold">{category}</span>
              </>
            )}
          </div>
        </nav>

        {/* Badges Bar */}
        {hasMetadata && (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {category && (
              <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-[#EAE3DA] text-[#514940] border border-[#B6AA9A]">
                {category}
              </span>
            )}
            {level && (
              <span className="px-2.5 py-0.5 rounded text-[11px] font-medium bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A]">
                {level}
              </span>
            )}
            {status && !isPublished && (
              <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-amber-100/80 text-amber-900 border border-amber-300">
                {status}
              </span>
            )}
            {isPublished && (
              <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-100/80 text-emerald-900 border border-emerald-300">
                Published
              </span>
            )}
          </div>
        )}

        {/* Main Title */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#211E1A] font-sans leading-tight">
          {title || 'Course Details'}
        </h1>

        {/* Subtitle / Description */}
        {subtitle && (
          <p className="text-sm sm:text-base text-[#514940] mt-3 max-w-3xl leading-relaxed">
            {subtitle}
          </p>
        )}

        {/* Meta Stats Row */}
        {hasMetadata && (
          <div className="mt-6 pt-5 border-t border-[#B6AA9A] flex flex-wrap items-center gap-y-2 gap-x-5 text-xs sm:text-sm text-[#514940]">
            {/* Instructor */}
            {instructor && (
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#EAE3DA] border border-[#B6AA9A] flex items-center justify-center font-bold text-[11px] text-[#211E1A]">
                  {instructor.charAt(0)}
                </span>
                <span>
                  Instructor: <strong className="font-semibold text-[#211E1A]">{instructor}</strong>
                </span>
              </div>
            )}

            {/* Modules Count */}
            {typeof modulesCount === 'number' && modulesCount > 0 && (
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-[#71675D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span>{modulesCount} Learning Units</span>
              </div>
            )}

            {/* Enrolled Count */}
            {typeof enrolledCount === 'number' && enrolledCount > 0 && (
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-[#71675D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>{enrolledCount.toLocaleString()} learners enrolled</span>
              </div>
            )}

            {/* Rating */}
            {typeof rating === 'number' && rating > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-amber-700 font-bold">★ {rating.toFixed(1)}</span>
                {ratingCount ? (
                  <span className="text-[#71675D]">({ratingCount} ratings)</span>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
