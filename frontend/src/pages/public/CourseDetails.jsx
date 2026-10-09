import React from 'react';
import { useParams } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import CourseHeader from '../../components/course/CourseHeader';

export default function CourseDetails() {
  const { id } = useParams();
  return (
    <div>
      <CourseHeader title="Course Details" subtitle="Detailed information about the course curriculum" instructor="Instructor Name" />
      <PageContainer>
        <p className="text-gray-600">Course content, requirements, and curriculum view.</p>
      </PageContainer>
    </div>
  );
}
