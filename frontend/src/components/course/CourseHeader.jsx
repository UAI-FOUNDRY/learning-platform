import React from 'react';

export default function CourseHeader({ title, subtitle, instructor }) {
  return (
    <div className="bg-gray-900 text-white py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold">{title}</h1>
        {subtitle && <p className="text-lg text-gray-300 mt-2">{subtitle}</p>}
        {instructor && <p className="text-sm text-gray-400 mt-4">Instructor: {instructor}</p>}
      </div>
    </div>
  );
}
