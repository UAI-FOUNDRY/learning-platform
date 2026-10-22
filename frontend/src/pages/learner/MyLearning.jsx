import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { learnerService } from '../../services/learnerService';
import CertificateModal from '../../components/learner/CertificateModal';
import CourseReviewModal from '../../components/learner/CourseReviewModal';

export default function MyLearning() {
  const [courses, setCourses] = useState(() => learnerService.getEnrolledCourses());
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'in-progress', 'completed'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('recent'); // 'recent', 'progress-desc', 'progress-asc', 'title'
  const [expandedSyllabusId, setExpandedSyllabusId] = useState(null);

  // Modals state
  const [selectedCertCourse, setSelectedCertCourse] = useState(null);
  const [reviewCourseTitle, setReviewCourseTitle] = useState(null);

  useEffect(() => {
    return learnerService.subscribe((state) => {
      setCourses(state.enrolledCourses || []);
    });
  }, []);

  const categories = ['all', ...new Set(courses.map(c => c.category).filter(Boolean))];

  // Filtering & Sorting
  let filteredCourses = courses.filter((course) => {
    if (activeTab === 'in-progress' && course.progressPercent >= 100) return false;
    if (activeTab === 'completed' && course.progressPercent < 100) return false;
    if (selectedCategory !== 'all' && course.category !== selectedCategory) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = course.title?.toLowerCase().includes(q);
      const matchInstructor = course.instructor?.toLowerCase().includes(q);
      const matchCategory = course.category?.toLowerCase().includes(q);
      return matchTitle || matchInstructor || matchCategory;
    }

    return true;
  });

  // Sorting
  filteredCourses = [...filteredCourses].sort((a, b) => {
    if (sortBy === 'progress-desc') return b.progressPercent - a.progressPercent;
    if (sortBy === 'progress-asc') return a.progressPercent - b.progressPercent;
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    return 0; // default recent
  });

  const inProgressCount = courses.filter(c => c.progressPercent < 100).length;
  const completedCount = courses.filter(c => c.progressPercent >= 100).length;

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#B6AA9A]/60 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#211E1A] tracking-tight">
            My Learning
          </h1>
          <p className="text-xs sm:text-sm text-[#514940] mt-1">
            Track your curriculum progress, resume ongoing courses, and review certified credentials.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/courses"
            className="px-4 py-2.5 rounded-xl bg-[#211E1A] hover:bg-black text-white font-extrabold text-xs transition-colors flex items-center justify-center gap-2 shadow-2xs"
          >
            <span>Explore Catalog</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {/* Tabs & Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="p-1 bg-[#C8BBAA] border border-[#B6AA9A] rounded-2xl flex items-center gap-1 shadow-2xs w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === 'all'
                ? 'bg-[#EAE3DA] text-[#211E1A] shadow-xs border border-[#B6AA9A]'
                : 'text-[#514940] hover:text-[#211E1A]'
            }`}
          >
            All Courses ({courses.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('in-progress')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === 'in-progress'
                ? 'bg-[#EAE3DA] text-[#D92D2D] shadow-xs border border-[#B6AA9A]'
                : 'text-[#514940] hover:text-[#211E1A]'
            }`}
          >
            In Progress ({inProgressCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === 'completed'
                ? 'bg-[#EAE3DA] text-emerald-800 shadow-xs border border-[#B6AA9A]'
                : 'text-[#514940] hover:text-[#211E1A]'
            }`}
          >
            Completed ({completedCount})
          </button>
        </div>

        {/* Search, Category, Sorting & View Toggle Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-56">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search enrolled..."
              className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] placeholder-[#71675D] focus:outline-none focus:border-[#D92D2D]"
            />
            <span className="absolute left-2.5 top-2.5 text-[#71675D] text-xs">🔍</span>
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Disciplines' : cat}
              </option>
            ))}
          </select>

          {/* Sort By Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
          >
            <option value="recent">Recently Accessed</option>
            <option value="progress-desc">Progress: High to Low</option>
            <option value="progress-asc">Progress: Low to High</option>
            <option value="title">Course Title (A-Z)</option>
          </select>

          {/* View Mode Toggle: Grid vs List */}
          <div className="flex items-center gap-1 bg-white border border-[#B6AA9A] rounded-xl p-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[#211E1A] text-white'
                  : 'text-[#514940] hover:text-[#211E1A]'
              }`}
              title="Grid View"
            >
              ⊞
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === 'list'
                  ? 'bg-[#211E1A] text-white'
                  : 'text-[#514940] hover:text-[#211E1A]'
              }`}
              title="List View"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* Courses Display: Grid or List */}
      {filteredCourses.length > 0 ? (
        viewMode === 'grid' ? (
          /* Grid View Mode */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="bg-white border-2 border-[#B6AA9A] rounded-2xl overflow-hidden shadow-sm hover-scale-card flex flex-col justify-between transition-all"
              >
                {/* Thumbnail Container */}
                <div className="h-44 bg-[#C8BBAA] relative overflow-hidden group">
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] shadow-xs">
                      {course.category}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                    <span className="font-bold flex items-center gap-1 drop-shadow-sm">
                      <span>👨‍🏫</span>
                      <span className="truncate max-w-[160px]">{course.instructor}</span>
                    </span>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black drop-shadow-sm ${
                      course.progressPercent >= 100
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#D92D2D] text-white'
                    }`}>
                      {course.progressPercent}% Complete
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-extrabold text-base text-[#211E1A] line-clamp-1">
                      {course.title}
                    </h3>
                    <p className="text-xs text-[#514940] mt-1 line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>
                  </div>

                  {/* Progress Tracking Widget */}
                  <div className="space-y-1.5 p-3 bg-[#EAE3DA]/50 rounded-xl border border-[#B6AA9A]/50">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-[#514940]">Curriculum Completed</span>
                      <span className="text-[#211E1A]">
                        {course.completedLessonsCount || 0} / {course.totalLessons || 6} lectures
                      </span>
                    </div>
                    <div className="w-full bg-[#D6D0C8] h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          course.progressPercent >= 100 ? 'bg-emerald-600' : 'bg-[#D92D2D]'
                        }`}
                        style={{ width: `${course.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Card Action Buttons */}
                  <div className="pt-2 border-t border-[#B6AA9A]/40 flex items-center justify-between gap-2">
                    <Link
                      to={`/learner/player/${course.id}`}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-[#211E1A] hover:bg-black text-white text-xs font-black text-center transition-colors shadow-2xs flex items-center justify-center gap-1.5"
                    >
                      <span>{course.progressPercent >= 100 ? 'Review Lectures' : 'Continue Player'}</span>
                      <span>→</span>
                    </Link>

                    {course.progressPercent >= 100 ? (
                      <button
                        type="button"
                        onClick={() => setSelectedCertCourse(course)}
                        className="py-2.5 px-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-black hover:bg-emerald-100 transition-colors shrink-0"
                        title="View Course Certificate"
                      >
                        Certificate 🏆
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setExpandedSyllabusId(expandedSyllabusId === course.id ? null : course.id)}
                        className="py-2.5 px-3 rounded-xl bg-[#EAE3DA] hover:bg-[#D6D0C8] border border-[#B6AA9A] text-xs font-bold text-[#211E1A] shrink-0"
                        title="Preview Curriculum Syllabus"
                      >
                        {expandedSyllabusId === course.id ? 'Hide ▲' : 'Syllabus ▼'}
                      </button>
                    )}
                  </div>

                  {/* Expandable Syllabus Drawer inside Grid Card */}
                  {expandedSyllabusId === course.id && (
                    <div className="mt-2 pt-3 border-t border-[#B6AA9A]/40 space-y-1.5 animate-slide-down">
                      <p className="text-[10px] font-bold text-[#71675D] uppercase">Curriculum Lessons:</p>
                      {(course.modules || []).flatMap(m => m.lessons || []).map((les, i) => (
                        <Link
                          key={les.id || i}
                          to={`/learner/player/${course.id}`}
                          className="flex items-center justify-between p-1.5 rounded-lg bg-[#EAE3DA]/60 hover:bg-[#EAE3DA] text-xs transition-colors"
                        >
                          <span className="truncate pr-2 font-medium text-[#211E1A]">{i + 1}. {les.title}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ${les.completed ? 'bg-emerald-100 text-emerald-800' : 'bg-white text-stone-500'}`}>
                            {les.completed ? '✓' : les.duration || '15m'}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View Mode */
          <div className="bg-white border-2 border-[#B6AA9A] rounded-3xl overflow-hidden shadow-sm divide-y divide-[#B6AA9A]/50">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="p-5 hover:bg-[#FAF8F5] transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-20 h-14 rounded-xl bg-[#C8BBAA] overflow-hidden shrink-0 border border-[#B6AA9A]">
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.2 rounded text-[10px] font-black bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A]">
                        {course.category}
                      </span>
                      <span className="text-xs text-[#71675D]">by {course.instructor}</span>
                    </div>
                    <h3 className="font-extrabold text-sm text-[#211E1A] truncate">
                      {course.title}
                    </h3>
                  </div>
                </div>

                {/* Progress in List View */}
                <div className="w-full md:w-56 space-y-1 shrink-0">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-[#514940]">{course.completedLessonsCount || 0}/{course.totalLessons || 6} lectures</span>
                    <span className="text-[#D92D2D] font-black">{course.progressPercent}%</span>
                  </div>
                  <div className="w-full bg-[#EAE3DA] h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${course.progressPercent >= 100 ? 'bg-emerald-600' : 'bg-[#D92D2D]'}`}
                      style={{ width: `${course.progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 w-full md:w-auto justify-end shrink-0">
                  <button
                    type="button"
                    onClick={() => setReviewCourseTitle(course.title)}
                    className="p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold"
                    title="Review Course"
                  >
                    ★
                  </button>

                  {course.progressPercent >= 100 && (
                    <button
                      type="button"
                      onClick={() => setSelectedCertCourse(course)}
                      className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold"
                    >
                      Certificate 🏆
                    </button>
                  )}

                  <Link
                    to={`/learner/player/${course.id}`}
                    className="px-4 py-2 bg-[#211E1A] hover:bg-black text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
                  >
                    Resume Player →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Empty State */
        <div className="bg-white border-2 border-[#B6AA9A] rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#EAE3DA] text-[#211E1A] mx-auto flex items-center justify-center text-3xl">
            📚
          </div>
          <h3 className="text-lg font-black text-[#211E1A]">
            No courses match your filter
          </h3>
          <p className="text-xs text-[#514940] max-w-sm mx-auto">
            {searchQuery
              ? `No courses found matching "${searchQuery}". Try a different keyword.`
              : 'You have no courses in this section yet. Discover exciting new programs in our catalog!'}
          </p>
          <div className="pt-2">
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D92D2D] hover:bg-[#B91C1C] text-white text-xs font-black transition-colors shadow-sm"
            >
              <span>Explore Course Catalog</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      )}

      {/* Certificate Modal Trigger */}
      {selectedCertCourse && (
        <CertificateModal
          isOpen={Boolean(selectedCertCourse)}
          onClose={() => setSelectedCertCourse(null)}
          certificate={{
            courseTitle: selectedCertCourse.title,
            instructor: selectedCertCourse.instructor,
            studentName: 'Sarah Chen',
            certificateNumber: `LS-${selectedCertCourse.id?.toUpperCase()}-2026`,
            issueDate: 'October 2026'
          }}
        />
      )}

      {/* Course Review Modal Trigger */}
      {reviewCourseTitle && (
        <CourseReviewModal
          isOpen={Boolean(reviewCourseTitle)}
          onClose={() => setReviewCourseTitle(null)}
          courseTitle={reviewCourseTitle}
        />
      )}
    </div>
  );
}
