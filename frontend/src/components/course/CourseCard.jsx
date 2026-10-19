import React from 'react';
import { Link } from 'react-router-dom';

export default function CourseCard({ course }) {
  return (
    <div className="border border-[#B6AA9A] rounded-xl overflow-hidden bg-[#C8BBAA] shadow-xs hover:border-[#D92D2D]/60 transition-colors">
      <div className="h-40 bg-[#EAE3DA] flex items-center justify-center text-[#71675D] text-sm font-medium border-b border-[#B6AA9A]">
        Course Thumbnail
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg line-clamp-1 text-[#211E1A]">
          {course?.title || 'Course Title'}
        </h3>
        <p className="text-sm text-[#514940] mt-1 line-clamp-2">
          {course?.description || 'Course description placeholder.'}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] px-2 py-0.5 rounded-md font-medium">
            {course?.level || 'Beginner'}
          </span>
          <Link
            to={`/courses/${course?.id || 1}`}
            className="text-sm font-medium text-[#D92D2D] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] rounded"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}
