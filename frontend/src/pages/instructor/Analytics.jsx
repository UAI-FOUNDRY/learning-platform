import React from 'react';
import PageContainer from '../../components/layout/PageContainer';
import { instructorCourseService } from '../../services/instructorCourseService';

export default function InstructorAnalytics() {
  const stats = instructorCourseService.getDashboardStats();
  const courses = instructorCourseService.getCourses();

  const publishedCourses = courses.filter(c => c.status === 'Published');

  return (
    <PageContainer>
      {/* Header */}
      <div className="pb-6 border-b border-[#B6AA9A] animate-slide-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded bg-[#EAE3DA] text-[#D92D2D] border border-[#B6AA9A]">
                Faculty Insights
              </span>
              <span className="text-xs font-semibold text-[#71675D]">
                Learning Outcomes & Analytics
              </span>
            </div>
            <h1 className="mt-2 text-[26px] sm:text-[32px] font-extrabold tracking-tight text-[#211E1A] font-sans leading-tight">
              Course Analytics & Student Growth
            </h1>
            <p className="mt-1.5 text-[14px] leading-relaxed text-[#514940] max-w-3xl">
              Track student retention, lecture engagement, coding test completion rates, and curriculum rating distributions.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-8 animate-slide-up">
        {/* Top 4 Metric Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-5 bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl shadow-xs interactive-card hover-lift">
            <span className="text-xs font-bold text-[#514940] uppercase tracking-wider">
              Enrolled Learners
            </span>
            <p className="text-3xl font-extrabold text-[#211E1A] mt-1">
              {stats.totalStudents.toLocaleString()}
            </p>
            <p className="text-xs text-emerald-800 font-bold mt-1">
              ↑ 24% enrollment increase this term
            </p>
          </div>

          <div className="p-5 bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl shadow-xs interactive-card hover-lift">
            <span className="text-xs font-bold text-[#514940] uppercase tracking-wider">
              Curriculum Completion
            </span>
            <p className="text-3xl font-extrabold text-[#211E1A] mt-1">
              {stats.completionRate}%
            </p>
            <div className="w-full bg-[#EAE3DA] h-2 rounded-full overflow-hidden mt-2 border border-[#B6AA9A]">
              <div style={{ width: `${stats.completionRate}%` }} className="bg-emerald-700 h-full rounded-full" />
            </div>
          </div>

          <div className="p-5 bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl shadow-xs interactive-card hover-lift">
            <span className="text-xs font-bold text-[#514940] uppercase tracking-wider">
              Average Evaluation Score
            </span>
            <p className="text-3xl font-extrabold text-[#211E1A] mt-1">
              94.2%
            </p>
            <p className="text-xs text-[#514940] mt-1">
              Across automated coding & quizzes
            </p>
          </div>

          <div className="p-5 bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl shadow-xs interactive-card hover-lift">
            <span className="text-xs font-bold text-[#514940] uppercase tracking-wider">
              Student Sentiment
            </span>
            <p className="text-3xl font-extrabold text-amber-600 mt-1">
              ★ {stats.averageRating}
            </p>
            <p className="text-xs text-[#514940] mt-1">
              98.2% positive student feedback
            </p>
          </div>
        </div>

        {/* Course-by-Course Performance Breakdown */}
        <section className="bg-white border border-[#B6AA9A] rounded-xl overflow-hidden shadow-xs">
          <div className="p-5 bg-[#EAE3DA] border-b border-[#B6AA9A] flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-[#211E1A]">
                Published Course Performance Matrix
              </h2>
              <p className="text-xs text-[#514940] mt-0.5">
                Detailed retention, ratings, and active enrollment metrics per catalog course.
              </p>
            </div>
            <span className="text-xs font-bold text-[#71675D]">
              {publishedCourses.length} active courses
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#EAE3DA]/50 border-b border-[#B6AA9A]/50 text-[#211E1A] uppercase tracking-wider text-[11px]">
                <tr>
                  <th scope="col" className="py-3 px-4 font-extrabold">Course Title</th>
                  <th scope="col" className="py-3 px-4 font-extrabold">Students</th>
                  <th scope="col" className="py-3 px-4 font-extrabold">Sections</th>
                  <th scope="col" className="py-3 px-4 font-extrabold">Completion Rate</th>
                  <th scope="col" className="py-3 px-4 font-extrabold">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#B6AA9A]/40 text-[#514940]">
                {publishedCourses.map((course) => {
                  const rate = course.id === 'crs-inst-101' ? 82 : 74;
                  return (
                    <tr key={course.id} className="hover:bg-[#EAE3DA]/30 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[#211E1A]">
                        {course.title}
                        <span className="block text-[11px] font-normal text-[#71675D]">{course.category}</span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#211E1A]">
                        {course.enrolledCount} learners
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        {(course.modules || []).length} sections
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#211E1A]">{rate}%</span>
                          <div className="w-24 bg-[#EAE3DA] h-2 rounded-full overflow-hidden border border-[#B6AA9A]">
                            <div style={{ width: `${rate}%` }} className="bg-emerald-600 h-full" />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-amber-600">
                        ★ {course.rating.toFixed(1)} ({course.ratingCount})
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Coding Workspace vs Video Engagement Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl shadow-xs">
            <h3 className="text-base font-extrabold text-[#211E1A]">
              Integrated Coding Workspace Analytics
            </h3>
            <p className="text-xs text-[#514940] mt-0.5">
              Automated code evaluation and sandbox execution metrics
            </p>
            <div className="mt-5 space-y-4 text-xs">
              <div>
                <div className="flex justify-between mb-1 font-bold text-[#211E1A]">
                  <span>First-Attempt Pass Rate</span>
                  <span>78%</span>
                </div>
                <div className="w-full bg-[#EAE3DA] h-2.5 rounded-full overflow-hidden border border-[#B6AA9A]">
                  <div style={{ width: '78%' }} className="bg-[#D92D2D] h-full" />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1 font-bold text-[#211E1A]">
                  <span>Retry Success Rate (after automated feedback)</span>
                  <span>96%</span>
                </div>
                <div className="w-full bg-[#EAE3DA] h-2.5 rounded-full overflow-hidden border border-[#B6AA9A]">
                  <div style={{ width: '96%' }} className="bg-emerald-700 h-full" />
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl shadow-xs">
            <h3 className="text-base font-extrabold text-[#211E1A]">
              Student Rating Distribution
            </h3>
            <p className="text-xs text-[#514940] mt-0.5">
              Verified learner satisfaction across 102 reviews
            </p>
            <div className="mt-5 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-12 font-bold text-[#211E1A]">5 Stars</span>
                <div className="flex-1 bg-[#EAE3DA] h-2 rounded-full overflow-hidden border border-[#B6AA9A]">
                  <div style={{ width: '88%' }} className="bg-amber-500 h-full" />
                </div>
                <span className="font-mono text-[#71675D] w-8 text-right">88%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-12 font-bold text-[#211E1A]">4 Stars</span>
                <div className="flex-1 bg-[#EAE3DA] h-2 rounded-full overflow-hidden border border-[#B6AA9A]">
                  <div style={{ width: '10%' }} className="bg-amber-500 h-full" />
                </div>
                <span className="font-mono text-[#71675D] w-8 text-right">10%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-12 font-bold text-[#211E1A]">3 Stars</span>
                <div className="flex-1 bg-[#EAE3DA] h-2 rounded-full overflow-hidden border border-[#B6AA9A]">
                  <div style={{ width: '2%' }} className="bg-amber-500 h-full" />
                </div>
                <span className="font-mono text-[#71675D] w-8 text-right">2%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
