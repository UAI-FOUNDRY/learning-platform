import React from 'react';
import CourseCard from './CourseCard';
import { useReveal } from '../../hooks/useReveal';

export default function CourseGrid({ courses = [] }) {
  // cards animate in (staggered) when the grid scrolls into view
  const [ref, visible] = useReveal({ threshold: 0.05 });
  return (
    <div
      ref={ref}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch w-full"
    >
      {courses.map((course, i) => (
        <CourseCard key={course.id || i} course={course} index={i} play={visible} />
      ))}
    </div>
  );
}
