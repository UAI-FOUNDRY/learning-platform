import React from 'react';
import { Link } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import CourseGrid from '../../components/course/CourseGrid';
import { mockCourses } from '../../data/mockCourses';

export default function Home() {
  return (
    <PageContainer>
      <section className="text-center py-16 px-4 bg-[#C8BBAA] border border-[#B6AA9A] rounded-2xl mb-12 shadow-xs transition-colors duration-200">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EAE3DA] text-[#D92D2D] border border-[#B6AA9A] mb-4">
          Empowering Higher Learning
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-[#211E1A] tracking-tight">
          Expand Your Horizons with <span className="text-[#D92D2D]">LearnSpace</span>
        </h1>
        <p className="mt-4 text-base sm:text-lg text-[#514940] max-w-2xl mx-auto">
          Discover a wide variety of courses taught by expert instructors and university faculty.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/courses"
            className="px-5 py-2.5 rounded-lg bg-[#211E1A] text-white font-bold text-sm hover:bg-black transition-colors"
          >
            Explore Catalog
          </Link>
          <Link
            to="/instructor/dashboard"
            className="px-5 py-2.5 rounded-lg bg-[#D92D2D] text-white font-bold text-sm hover:bg-[#B91C1C] transition-colors shadow-xs"
          >
            Open Instructor Portal →
          </Link>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#211E1A]">Featured Courses</h2>
            <p className="text-sm text-[#514940]">Hand-picked courses from top universities and institutions.</p>
          </div>
        </div>
        <CourseGrid courses={mockCourses} />
      </section>
    </PageContainer>
  );
}
