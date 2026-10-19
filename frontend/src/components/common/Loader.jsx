import React from 'react';

export default function Loader({ size = 'medium' }) {
  const sizeClasses = size === 'large' ? 'h-10 w-10 border-3' : size === 'small' ? 'h-5 w-5 border-2' : 'h-8 w-8 border-2';

  return (
    <div className="flex items-center justify-center p-4">
      <div
        className={`animate-spin rounded-full border-t-transparent border-r-transparent border-b-[#D92D2D] border-l-[#D92D2D] ${sizeClasses}`}
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
