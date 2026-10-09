import React from 'react';
import { Link } from 'react-router-dom';

export default function CourseCard({ course }) {
  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm hover:shadow transition-shadow">
      <div className="h-40 bg-gray-200 flex items-center justify-center text-gray-400">
        Course Thumbnail
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg line-clamp-1">{course?.title || 'Course Title'}</h3>
        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{course?.description || 'Course description placeholder.'}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">{course?.level || 'Beginner'}</span>
          <Link to={`/courses/${course?.id || 1}`} className="text-sm font-medium text-blue-600 hover:underline">
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}
