import React from 'react';
import PageContainer from '../../components/layout/PageContainer';
import CourseGrid from '../../components/course/CourseGrid';
import { mockCourses } from '../../data/mockCourses';

export default function CourseCatalog() {
  return (
    <PageContainer title="Course Catalog">
      <CourseGrid courses={mockCourses} />
    </PageContainer>
  );
}
