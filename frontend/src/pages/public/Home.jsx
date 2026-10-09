import React from 'react';
import PageContainer from '../../components/layout/PageContainer';
import CourseGrid from '../../components/course/CourseGrid';
import { mockCourses } from '../../data/mockCourses';

export default function Home() {
  return (
    <PageContainer>
      <section className="text-center py-16 bg-blue-50 rounded-xl mb-12">
        <h1 className="text-4xl font-extrabold text-gray-900">Expand Your Horizons with Learning Platform</h1>
        <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
          Discover a wide variety of courses taught by expert instructors and university faculty.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-6">Featured Courses</h2>
        <CourseGrid courses={mockCourses} />
      </section>
    </PageContainer>
  );
}
