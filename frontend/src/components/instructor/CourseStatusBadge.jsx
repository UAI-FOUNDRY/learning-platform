import React from 'react';

/**
 * CourseStatusBadge
 * Premium status badge with micro-animations and glowing indicators.
 * Consistent with the light greige & warm taupe LearnSpace palette.
 */
export default function CourseStatusBadge({ status, size = 'default', showDot = true, className = '' }) {
  const norm = (status || 'Draft').trim();

  let style = 'bg-[#EAE3DA] text-[#514940] border-[#B6AA9A]';
  let dotColor = 'bg-[#71675D]';
  let pulseClass = '';
  let label = norm;

  if (norm.toLowerCase() === 'published') {
    style = 'bg-emerald-100/90 text-emerald-900 border-emerald-300 shadow-xs';
    dotColor = 'bg-emerald-600';
    label = 'Published';
  } else if (norm.toLowerCase().includes('pending')) {
    style = 'bg-amber-100/90 text-amber-900 border-amber-300 shadow-xs';
    dotColor = 'bg-amber-500';
    pulseClass = 'animate-ping opacity-75';
    label = 'Pending Review';
  } else if (norm.toLowerCase().includes('change') || norm.toLowerCase().includes('reject')) {
    style = 'bg-red-100 text-red-900 border-red-300 shadow-xs pulse-glow-red';
    dotColor = 'bg-[#D92D2D]';
    pulseClass = 'animate-ping opacity-75';
    label = 'Changes Requested';
  } else if (norm.toLowerCase() === 'draft') {
    style = 'bg-[#EAE3DA] text-[#514940] border-[#B6AA9A]';
    dotColor = 'bg-[#71675D]';
    label = 'Draft';
  } else if (norm.toLowerCase() === 'archived') {
    style = 'bg-gray-200/80 text-gray-700 border-gray-300';
    dotColor = 'bg-gray-500';
    label = 'Archived';
  }

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-[11px]'
    : size === 'lg'
    ? 'px-3.5 py-1 text-sm'
    : 'px-2.5 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center font-bold tracking-tight rounded-full border transition-all duration-200 ${style} ${sizeClasses} ${className}`}
    >
      {showDot && (
        <span className="relative flex h-2 w-2 mr-1.5 shrink-0">
          {pulseClass && (
            <span
              className={`absolute inline-flex h-full w-full rounded-full ${dotColor} ${pulseClass}`}
            />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`} />
        </span>
      )}
      <span>{label}</span>
    </span>
  );
}
