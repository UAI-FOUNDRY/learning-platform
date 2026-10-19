import React from 'react';
import { Link } from 'react-router-dom';

/**
 * SummaryCard
 * Accessible metric card with restrained icon, readable values, subtle borders,
 * and keyboard-accessible navigation link to existing destination.
 * Avoids inventing trends or percentage changes.
 */
export default function SummaryCard({
  title,
  value,
  description,
  to,
  icon: Icon,
  badgeText
}) {
  const content = (
    <div className="p-5 sm:p-6 flex flex-col justify-between h-full bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl shadow-xs hover:border-[#D92D2D]/60 transition-colors focus-within:ring-2 focus-within:ring-[#D92D2D] focus-within:ring-offset-2">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <span className="text-[13px] sm:text-[14px] font-semibold text-[#514940] leading-snug">
            {title}
          </span>
          {Icon && (
            <div className="shrink-0 p-2 rounded-lg bg-[#EAE3DA] text-[#D92D2D] border border-[#B6AA9A]">
              <Icon className="w-5 h-5" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="flex items-baseline justify-between gap-2 mt-1">
          <span className="text-[28px] sm:text-[32px] font-bold tracking-tight text-[#211E1A] font-sans leading-none">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>
          {badgeText && (
            <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100/70 text-amber-900 border border-amber-300">
              {badgeText}
            </span>
          )}
        </div>

        {description && (
          <p className="mt-2 text-[12px] sm:text-[13px] leading-relaxed text-[#514940] line-clamp-2">
            {description}
          </p>
        )}
      </div>

      {to && (
        <div className="mt-4 pt-3 border-t border-[#B6AA9A] flex items-center justify-between text-[12px] sm:text-[13px] font-medium text-[#D92D2D] group-hover:text-[#B91C1C]">
          <span>View details</span>
          <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
        className="block group rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] focus-visible:ring-offset-2 transition-shadow"
        aria-label={`${title}: ${value}. Click to view details.`}
      >
        {content}
      </Link>
    );
  }

  return <div>{content}</div>;
}
