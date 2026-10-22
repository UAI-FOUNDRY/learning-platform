import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { learnerService } from '../../services/learnerService';

export default function MyLearning() {
  const [courses, setCourses] = useState(() => learnerService.getEnrolledCourses());
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'in-progress', 'completed'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    return learnerService.subscribe((state) => {
      setCourses(state.enrolledCourses || []);
    });
  }, []);

  const categories = ['all', ...new Set(courses.map(c => c.category).filter(Boolean))];

  // Filtering
  const filteredCourses = courses.filter((course) => {
    // Tab filter
    if (activeTab === 'in-progress' && course.progressPercent >= 100) return false;
    if (activeTab === 'completed' && course.progressPercent < 100) return false;

    // Category filter
    if (selectedCategory !== 'all' && course.category !== selectedCategory) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = course.title?.toLowerCase().includes(q);
      const matchInstructor = course.instructor?.toLowerCase().includes(q);
      const matchCategory = course.category?.toLowerCase().includes(q);
      return matchTitle || matchInstructor || matchCategory;
    }

    return true;
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

        <Link
          to="/courses"
          className="px-4 py-2.5 rounded-xl bg-[#211E1A] hover:bg-black text-white font-extrabold text-xs transition-colors flex items-center justify-center gap-2 self-start sm:self-auto shadow-2xs"
        >
          <span>Browse Course Catalog</span>
          <span>→</span>
        </Link>
      </div>

      {/* Tabs & Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="p-1 bg-[#C8BBAA] border border-[#B6AA9A] rounded-2xl flex items-center gap-1 shadow-2xs w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === 'all'
                ? 'bg-[#EAE3DA] text-[#211E1A] shadow-xs scale-101 border border-[#B6AA9A]'
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
                ? 'bg-[#EAE3DA] text-[#D92D2D] shadow-xs scale-101 border border-[#B6AA9A]'
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
                ? 'bg-[#EAE3DA] text-emerald-800 shadow-xs scale-101 border border-[#B6AA9A]'
                : 'text-[#514940] hover:text-[#211E1A]'
            }`}
          >
            Completed ({completedCount})
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search enrolled courses..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] placeholder-[#71675D] focus:outline-none focus:border-[#D92D2D]"
            />
            <span className="absolute left-3 top-2.5 text-[#71675D] text-xs">🔍</span>
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-xs bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Disciplines' : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Courses Grid */}
      {filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              className="bg-white border-2 border-[#B6AA9A] rounded-2xl overflow-hidden shadow-sm hover-lift flex flex-col justify-between transition-all"
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
                    <Link
                      to="/learner/certificates"
                      className="py-2.5 px-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-black hover:bg-emerald-100 transition-colors shrink-0"
                      title="View Course Certificate"
                    >
                      Certificate 🏆
                    </Link>
                  ) : (
                    <span className="text-[11px] font-bold text-[#71675D] px-2">
                      {course.level}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
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
    </div>
  );
}
