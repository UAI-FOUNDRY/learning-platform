import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import CourseStatusBadge from '../../components/instructor/CourseStatusBadge';
import { instructorCourseService } from '../../services/instructorCourseService';

export default function CoursePreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(() => instructorCourseService.getCourse(id));

  useEffect(() => {
    setCourse(instructorCourseService.getCourse(id));
  }, [id]);

  if (!course) {
    return (
      <PageContainer>
        <div className="bg-white border border-[#B6AA9A] rounded-xl p-8 text-center max-w-md mx-auto my-12">
          <h2 className="text-lg font-bold text-[#211E1A]">Course Not Found</h2>
          <p className="mt-2 text-xs text-[#514940]">No course data found for ID {id}.</p>
          <Link
            to="/instructor/courses"
            className="mt-4 inline-block px-4 py-2 text-xs font-bold rounded-lg bg-[#D92D2D] text-white"
          >
            Back to My Courses
          </Link>
        </div>
      </PageContainer>
    );
  }

  const totalLessons = (course.modules || []).reduce((sum, m) => sum + (m.lessons || []).length, 0);

  return (
    <PageContainer>
      {/* Top Banner Notice */}
      <div className="mb-6 p-3.5 bg-[#211E1A] text-white rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2.5">
          <span className="px-2 py-0.5 rounded bg-[#D92D2D] text-white text-[10px] font-bold uppercase tracking-wider">
            Learner View Preview
          </span>
          <span className="text-xs text-[#D6D0C8]">
            This is how your course will appear to students on the public catalog.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to={`/instructor/courses/${course.id}/edit`}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#EAE3DA] text-[#211E1A] hover:bg-white transition-colors"
          >
            ← Back to Editor
          </Link>
        </div>
      </div>

      <div className="max-w-4xl space-y-8">
        {/* Course Header Banner */}
        <div className="bg-white border border-[#B6AA9A] rounded-xl p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-[#EAE3DA] text-[#D92D2D] border border-[#B6AA9A]">
                  {course.category}
                </span>
                <CourseStatusBadge status={course.status} />
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-[#211E1A] leading-tight">
                {course.title}
              </h1>

              <p className="mt-3 text-sm text-[#514940] leading-relaxed">
                {course.description}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-[#71675D]">
                <span>Instructor: <strong>Prof. Elena Rostova</strong></span>
                <span>•</span>
                <span>Level: <strong>{course.level || 'All Levels'}</strong></span>
                <span>•</span>
                <span>Language: <strong>{course.language || 'English'}</strong></span>
                <span>•</span>
                <span>{course.enrolledCount || 0} students enrolled</span>
              </div>
            </div>

            {course.thumbnail && (
              <div className="w-full sm:w-56 h-36 rounded-xl overflow-hidden border border-[#B6AA9A] bg-[#EAE3DA] shrink-0">
                <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>

        {/* Learning Objectives */}
        {course.learningObjectives && course.learningObjectives.length > 0 && (
          <div className="bg-white border border-[#B6AA9A] rounded-xl p-6 shadow-xs">
            <h2 className="text-base font-bold text-[#211E1A] mb-4">
              What you'll learn in this course
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {course.learningObjectives.map((obj, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#211E1A]">
                  <span className="text-emerald-700 font-bold">✓</span>
                  <span>{obj}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Course Curriculum Breakdown */}
        <div className="bg-white border border-[#B6AA9A] rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-[#B6AA9A]/50">
            <div>
              <h2 className="text-base font-bold text-[#211E1A]">
                Course Curriculum
              </h2>
              <p className="text-xs text-[#514940] mt-0.5">
                {(course.modules || []).length} Sections • {totalLessons} Lectures & Coding Exercises
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {(course.modules || []).map((module, mIndex) => (
              <div key={module.id} className="border border-[#B6AA9A] rounded-lg overflow-hidden">
                <div className="bg-[#EAE3DA] px-4 py-3 flex items-center justify-between font-bold text-xs sm:text-sm text-[#211E1A]">
                  <span>Section {mIndex + 1}: {module.title}</span>
                  <span className="text-xs font-normal text-[#71675D]">
                    {(module.lessons || []).length} lectures
                  </span>
                </div>

                <div className="divide-y divide-[#B6AA9A]/30 bg-white">
                  {(module.lessons || []).map((lesson, lIndex) => (
                    <div key={lesson.id} className="px-4 py-2.5 flex items-center justify-between text-xs text-[#514940]">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-[#71675D]">{lIndex + 1}.</span>
                        <span>{lesson.title}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#71675D]">
                        <span className="px-1.5 py-0.5 rounded bg-[#EAE3DA] text-[#211E1A] font-semibold">
                          {lesson.type}
                        </span>
                        <span>{lesson.duration || '15 min'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Prerequisites */}
        {course.prerequisites && course.prerequisites.length > 0 && (
          <div className="bg-white border border-[#B6AA9A] rounded-xl p-6 shadow-xs">
            <h2 className="text-base font-bold text-[#211E1A] mb-3">
              Requirements & Prerequisites
            </h2>
            <ul className="list-disc list-inside space-y-1.5 text-xs text-[#514940]">
              {course.prerequisites.map((req, i) => (
                <li key={i}>{req}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
