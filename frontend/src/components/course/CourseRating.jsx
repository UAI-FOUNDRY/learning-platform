import React from 'react';

export default function CourseRating({ rating = 0, count = 0 }) {
  return (
    <div className="flex items-center gap-1 text-sm text-yellow-600">
      <span className="font-bold">{rating.toFixed(1)}</span>
      <span>★</span>
      {count > 0 && <span className="text-gray-500 text-xs">({count})</span>}
    </div>
  );
}
