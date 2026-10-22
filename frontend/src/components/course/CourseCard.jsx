import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function CourseCard({ course }) {
  const [imgFailed, setImgFailed] = useState(false);

  if (!course) return null;

  const categoryName = typeof course.category === 'object'
    ? course.category?.name
    : course.category || 'General';

  const instructorName = typeof course.instructor === 'object'
    ? course.instructor?.full_name
    : course.instructor;

  const levelText = course.level
    ? course.level.charAt(0).toUpperCase() + course.level.slice(1).replace('_', ' ')
    : null;

  // Intelligent local category photography matching
  const getThumbnailSrc = () => {
    if (course.thumbnail_url) return course.thumbnail_url;
    const cat = String(categoryName).toLowerCase();
    const t = String(course.title || '').toLowerCase();
    if (cat.includes('python') || t.includes('python') || cat.includes('computer')) return '/images/courses/python.jpg';
    if (cat.includes('web') || cat.includes('react') || cat.includes('software')) return '/images/courses/web_dev.jpg';
    if (cat.includes('data') || cat.includes('ai') || cat.includes('machine') || t.includes('learning')) return '/images/courses/ai_ml.jpg';
    if (cat.includes('algorithm') || t.includes('structure')) return '/images/courses/algorithms.jpg';
    if (cat.includes('cloud') || t.includes('container') || t.includes('docker')) return '/images/courses/cloud.jpg';
    if (cat.includes('security') || cat.includes('cyber')) return '/images/courses/cybersecurity.jpg';
    return '/images/courses/python.jpg';
  };

  const thumbnailSrc = getThumbnailSrc();

  return (
    <article className="group relative h-full flex flex-col rounded-2xl overflow-hidden bg-mocha-surface border border-cosmic/70 shadow-warm-sm hover:shadow-warm-md hover:-translate-y-1 transition-all duration-300 focus-within:ring-2 focus-within:ring-burgundy focus-within:ring-offset-2">
      {/* Deep Burgundy Top Accent Band */}
      <div className="h-1.5 w-full bg-burgundy group-hover:h-2 transition-all duration-200 shrink-0" />

      {/* Course Thumbnail Image with Gradient Overlay & Badges */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-mocha border-b border-cosmic/50 shrink-0">
        {!imgFailed ? (
          <>
            <img
              src={thumbnailSrc}
              alt={`${course.title} course preview`}
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
              loading="lazy"
              onError={() => setImgFailed(true)}
            />
            {/* Elegant dark gradient overlay for depth and high contrast readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#2D1014]/75 via-[#2D1014]/25 to-black/10 pointer-events-none transition-opacity duration-300 group-hover:opacity-90" />
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-mocha">
            <div className="w-12 h-12 rounded-xl bg-mocha-surface border border-cosmic/70 flex items-center justify-center mb-2 shadow-warm-sm">
              <svg
                className="w-6 h-6 text-burgundy stroke-[1.8]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <span className="text-xs font-semibold text-burgundy tracking-wider uppercase">
              {categoryName}
            </span>
          </div>
        )}

        {/* Level Badge (Top Left) - High contrast warm cream pill */}
        {levelText && (
          <span className="absolute top-3 left-3 text-[11px] font-semibold tracking-wide px-2.5 py-1 rounded-full bg-[#FAF6EE]/95 text-burgundy border border-cosmic/60 shadow-xs backdrop-blur-xs select-none">
            {levelText}
          </span>
        )}

        {/* Category Pill (Top Right on Image Overlay) - High contrast dark burgundy pill with light cream text */}
        <span className="absolute top-3 right-3 text-[11px] font-semibold tracking-wide px-2.5 py-1 rounded-full bg-[#2D1014]/90 text-[#FBF4E8] border border-[#D8C2AC]/30 shadow-xs backdrop-blur-xs select-none">
          {categoryName}
        </span>
      </div>

      {/* Card Body */}
      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
        <div>
          {/* Course Title with stretched link */}
          <h3 className="font-serif font-bold text-lg text-burgundy leading-snug line-clamp-2 group-hover:text-burgundy-hover transition-colors">
            <Link
              to={`/courses/${course.id}`}
              className="focus:outline-none after:absolute after:inset-0"
            >
              {course.title}
            </Link>
          </h3>

          {/* Description */}
          {course.description && (
            <p className="mt-2.5 text-xs sm:text-sm text-brown-soft line-clamp-2 leading-relaxed">
              {course.description}
            </p>
          )}
        </div>

        {/* Card Footer: Instructor and Action Link */}
        <div className="pt-4 mt-5 border-t border-cosmic/30 flex items-center justify-between text-xs">
          {instructorName ? (
            <div className="flex items-center gap-2 text-brown-soft font-medium truncate max-w-[170px]">
              <div className="w-6 h-6 rounded-full bg-mocha text-burgundy border border-cosmic/60 flex items-center justify-center shrink-0 text-[10px] font-bold">
                {instructorName.charAt(0)}
              </div>
              <span className="truncate">{instructorName}</span>
            </div>
          ) : (
            <div />
          )}

          <div
            className="inline-flex items-center gap-1 font-semibold text-burgundy group-hover:text-burgundy-hover transition-colors"
            aria-hidden="true"
          >
            <span>Learn More</span>
            <svg
              className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </article>
  );
}
