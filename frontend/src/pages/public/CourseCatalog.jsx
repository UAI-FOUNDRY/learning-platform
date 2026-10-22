import React, { useState, useMemo } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import CourseGrid from '../../components/course/CourseGrid';
import { useCourses } from '../../hooks/useCourses';

export default function CourseCatalog() {
  const { courses, loading, error } = useCourses();

  // Discovery toolbar states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('All');
  const [sortBy, setSortBy] = useState('title-asc');

  // Derive unique categories dynamically from real course data
  const categories = useMemo(() => {
    if (!courses || courses.length === 0) return [];
    const set = new Set();
    courses.forEach((c) => {
      const name = typeof c.category === 'object' ? c.category?.name : c.category;
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [courses]);

  // Combined filtering & sorting
  const filteredAndSortedCourses = useMemo(() => {
    if (!courses) return [];

    // 1. Filter
    const filtered = courses.filter((course) => {
      const catName = typeof course.category === 'object' ? course.category?.name : course.category || '';
      const instructorName = typeof course.instructor === 'object' ? course.instructor?.full_name : course.instructor || '';
      const level = course.level || '';

      // Category matching
      const matchesCategory =
        selectedCategory === 'All' ||
        catName.toLowerCase() === selectedCategory.toLowerCase();

      // Level matching
      const matchesLevel =
        selectedLevel === 'All' ||
        level.toLowerCase() === selectedLevel.toLowerCase();

      // Search keyword matching (title, description, category, instructor)
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        q === '' ||
        (course.title && course.title.toLowerCase().includes(q)) ||
        (course.description && course.description.toLowerCase().includes(q)) ||
        catName.toLowerCase().includes(q) ||
        instructorName.toLowerCase().includes(q);

      return matchesCategory && matchesLevel && matchesSearch;
    });

    // 2. Sort
    return [...filtered].sort((a, b) => {
      if (sortBy === 'title-asc') {
        return (a.title || '').localeCompare(b.title || '');
      }
      if (sortBy === 'title-desc') {
        return (b.title || '').localeCompare(a.title || '');
      }
      if (sortBy === 'level-asc') {
        const order = { beginner: 1, intermediate: 2, advanced: 3 };
        const orderA = order[(a.level || '').toLowerCase()] || 99;
        const orderB = order[(b.level || '').toLowerCase()] || 99;
        return orderA - orderB;
      }
      if (sortBy === 'level-desc') {
        const order = { beginner: 1, intermediate: 2, advanced: 3 };
        const orderA = order[(a.level || '').toLowerCase()] || 99;
        const orderB = order[(b.level || '').toLowerCase()] || 99;
        return orderB - orderA;
      }
      return 0;
    });
  }, [courses, searchTerm, selectedCategory, selectedLevel, sortBy]);

  // Check if any filter is active
  const isFiltered =
    searchTerm.trim() !== '' ||
    selectedCategory !== 'All' ||
    selectedLevel !== 'All' ||
    sortBy !== 'title-asc';

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
    setSelectedLevel('All');
    setSortBy('title-asc');
  };

  return (
    <PageContainer
      title="Course Catalog"
      subtitle="Explore courses, develop practical skills, and find your next learning opportunity."
    >
      {/* ============================================================== */}
      {/* COURSE DISCOVERY TOOLBAR                                       */}
      {/* ============================================================== */}
      <div className="bg-mocha-surface border border-cosmic/70 rounded-2xl p-4 sm:p-5 shadow-warm-sm mb-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-center">
          {/* Search Input (5 cols on md) */}
          <div className="md:col-span-5 relative">
            <label htmlFor="catalog-search" className="sr-only">
              Search courses by title, topic, or instructor
            </label>
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cosmic-dark">
              <svg className="w-4 h-4 stroke-[2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              id="catalog-search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title, topic, or instructor..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-cosmic bg-[#FAF6EE] text-burgundy text-sm placeholder:text-cosmic-dark/70 focus:outline-none focus:ring-2 focus:ring-burgundy/20 focus:border-burgundy transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search query"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-cosmic-dark hover:text-burgundy transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Category Filter (3 cols on md) */}
          <div className="md:col-span-3">
            <label htmlFor="catalog-category" className="sr-only">
              Filter by category
            </label>
            <div className="relative">
              <select
                id="catalog-category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-cosmic bg-[#FAF6EE] text-burgundy text-sm font-medium focus:outline-none focus:ring-2 focus:ring-burgundy/20 focus:border-burgundy transition-all appearance-none cursor-pointer pr-9"
              >
                <option value="All">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-cosmic-dark">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Difficulty Level Filter (2 cols on md) */}
          <div className="md:col-span-2">
            <label htmlFor="catalog-level" className="sr-only">
              Filter by difficulty level
            </label>
            <div className="relative">
              <select
                id="catalog-level"
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-cosmic bg-[#FAF6EE] text-burgundy text-sm font-medium focus:outline-none focus:ring-2 focus:ring-burgundy/20 focus:border-burgundy transition-all appearance-none cursor-pointer pr-9"
              >
                <option value="All">All Levels</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-cosmic-dark">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Sort By Field (2 cols on md) */}
          <div className="md:col-span-2">
            <label htmlFor="catalog-sort" className="sr-only">
              Sort courses
            </label>
            <div className="relative">
              <select
                id="catalog-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-cosmic bg-[#FAF6EE] text-burgundy text-sm font-medium focus:outline-none focus:ring-2 focus:ring-burgundy/20 focus:border-burgundy transition-all appearance-none cursor-pointer pr-9"
              >
                <option value="title-asc">Title: A to Z</option>
                <option value="title-desc">Title: Z to A</option>
                <option value="level-asc">Level: Beginner first</option>
                <option value="level-desc">Level: Advanced first</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-cosmic-dark">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Results Counter & Active Filter Reset Bar */}
        <div className="mt-3.5 pt-3.5 border-t border-cosmic/40 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="text-brown-soft font-medium">
            Showing <span className="font-bold text-burgundy">{filteredAndSortedCourses.length}</span> of {courses ? courses.length : 0} courses
          </div>

          {isFiltered && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 font-semibold text-burgundy hover:text-burgundy-hover hover:underline cursor-pointer transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Reset all filters</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* LOADING STATE                                                  */}
      {/* ============================================================== */}
      {loading && (
        <div className="py-20 text-center text-brown-soft">
          <div className="inline-block w-8 h-8 rounded-full border-2 border-burgundy border-t-transparent animate-spin mb-3" />
          <p className="text-sm font-medium">Loading course catalog...</p>
        </div>
      )}

      {/* ============================================================== */}
      {/* EMPTY RESULTS STATE                                            */}
      {/* ============================================================== */}
      {!loading && filteredAndSortedCourses.length === 0 && (
        <div className="p-8 sm:p-12 rounded-2xl bg-mocha-surface border border-cosmic/70 text-center max-w-md mx-auto shadow-warm-sm">
          <div className="w-12 h-12 rounded-xl bg-mocha border border-cosmic text-burgundy flex items-center justify-center mx-auto mb-3 shadow-xs">
            <svg className="w-6 h-6 stroke-[1.8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="font-serif font-bold text-burgundy text-lg">No matching courses found</h3>
          <p className="text-xs sm:text-sm text-brown-soft mt-1.5 leading-relaxed">
            We couldn't find any courses matching your current search or filters. Try adjusting your criteria or reset your filters.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="mt-5 px-5 py-2.5 rounded-full text-xs font-semibold text-white bg-burgundy hover:bg-burgundy-hover active:scale-95 transition-all shadow-warm-sm cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* COURSE GRID (Responsive 3-column layout on desktop)            */}
      {/* ============================================================== */}
      {!loading && filteredAndSortedCourses.length > 0 && (
        <CourseGrid courses={filteredAndSortedCourses} />
      )}
    </PageContainer>
  );
}
