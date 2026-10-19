import React from 'react';

export default function CourseHeader({ title, subtitle, instructor }) {
  return (
    <div className="bg-[#C8BBAA] border-b border-[#B6AA9A] text-[#211E1A] py-12 px-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold">{title}</h1>
        {subtitle && <p className="text-lg text-[#514940] mt-2">{subtitle}</p>}
        {instructor && <p className="text-sm text-[#71675D] mt-4">Instructor: {instructor}</p>}
      </div>
    </div>
  );
}
