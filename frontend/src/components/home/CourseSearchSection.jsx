import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCourses } from '../../hooks/useCourses';
import { useDebounce } from '../../hooks/useDebounce';
import { Reveal } from '../../hooks/useReveal';
import CourseCard from '../course/CourseCard';

export default function CourseSearchSection() {
  const { courses, loading, error } = useCourses();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Debounce search input for performance
  const debouncedSearch = useDebounce(searchTerm, 250);

  // Derive unique categories dynamically from real course data
  const categories = useMemo(() => {
    if (!courses || courses.length === 0) return ['All'];
    const cats = new Set();
    courses.forEach((c) => {
      const name = typeof c.category === 'object' ? c.category?.name : c.category;
      if (name) cats.add(name);
    });
    return ['All', ...Array.from(cats)];
  }, [courses]);

  // Filter courses based on debounced search and selected category
  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    return courses.filter((course) => {
      const catName = typeof course.category === 'object' ? course.category?.name : course.category || '';
      const instructorName = typeof course.instructor === 'object' ? course.instructor?.full_name : course.instructor || '';

      const matchesCat = selectedCategory === 'All' || catName === selectedCategory;

      const q = debouncedSearch.trim().toLowerCase();
      const matchesSearch =
        q === '' ||
        (course.title && course.title.toLowerCase().includes(q)) ||
        (course.description && course.description.toLowerCase().includes(q)) ||
        catName.toLowerCase().includes(q) ||
        instructorName.toLowerCase().includes(q);

      return matchesCat && matchesSearch;
    });
  }, [courses, debouncedSearch, selectedCategory]);

  // Show up to 6 featured courses on the home page
  const displayedCourses = useMemo(() => {
    return filteredCourses.slice(0, 6);
  }, [filteredCourses]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
  };

  return (
    <section id="courses" className="py-12 sm:py-16 bg-[#DDD1C4]/40 border-t border-cosmic">
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Section Header with Reveal */}
        <Reveal>
          <div className="max-w-2xl">
            <span className="inline-block text-xs font-semibold uppercase tracking-wider text-burgundy bg-burgundy/10 border border-burgundy/20 px-3 py-1 rounded-full mb-3 shadow-xs">
              Course Catalog
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-burgundy tracking-tight">
              Explore Courses by Topic
            </h2>
            <p className="mt-2 text-base text-brown-soft">
              Find courses, practise code exercises, and build skills at your own pace.
            </p>
          </div>
        </Reveal>

        {/* Search Input & Controls with Reveal */}
        <Reveal delay={60}>
          <div className="mt-7 sm:mt-8 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              {/* Search Input Bar */}
              <div className="relative flex-1 max-w-xl">
                <label htmlFor="course-search-input" className="sr-only">
                  Search courses by title, topic, or instructor
                </label>
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-cosmic-dark">
                  <svg className="w-4 h-4 stroke-[2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  id="course-search-input"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by title, topic, or instructor..."
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-cosmic bg-mocha-surface text-burgundy text-sm placeholder:text-cosmic-dark/70 focus:outline-none focus:ring-2 focus:ring-burgundy/20 focus:border-burgundy transition-all shadow-warm-sm"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    aria-label="Clear search input"
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-cosmic-dark hover:text-burgundy transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Results Count */}
              {!loading && !error && (
                <div className="text-xs sm:text-sm text-brown-soft font-medium self-end sm:self-center">
                  {filteredCourses.length === 1
                    ? '1 course found'
                    : `${filteredCourses.length} courses found`}
                </div>
              )}
            </div>

            {/* Category Filter Chips Styled in Mocha / Cosmic / Burgundy */}
            <div
              className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none"
              role="tablist"
              aria-label="Filter courses by category"
            >
              {categories.map((category) => {
                const isSelected = selectedCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burgundy active:scale-95 ${
                      isSelected
                        ? 'bg-burgundy text-white border-burgundy shadow-warm-sm'
                        : 'bg-mocha-surface text-brown-soft border-cosmic hover:border-burgundy hover:text-burgundy'
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>
        </Reveal>

        {/* Loading State */}
        {loading && (
          <div className="py-16 text-center text-brown-soft">
            <div className="inline-block w-8 h-8 rounded-full border-2 border-burgundy border-t-transparent animate-spin mb-3" />
            <p className="text-sm">Loading course catalog...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="mt-8 p-6 rounded-xl bg-mocha-surface border border-cosmic text-center max-w-md mx-auto shadow-warm-sm">
            <p className="text-sm text-burgundy font-medium">Unable to load courses from the server.</p>
            <p className="text-xs text-brown-soft mt-1">Please try again or browse our full catalog.</p>
            <Link
              to="/courses"
              className="mt-4 inline-block text-xs font-semibold text-burgundy hover:underline"
            >
              Go to Courses Catalog &rarr;
            </Link>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredCourses.length === 0 && (
          <div className="mt-8 p-8 sm:p-12 rounded-xl bg-mocha-surface border border-cosmic text-center max-w-md mx-auto shadow-warm-sm">
            <div className="w-12 h-12 rounded-xl bg-mocha border border-cosmic text-cosmic-dark flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="font-serif font-bold text-burgundy text-base">
              {courses.length === 0 ? 'No courses published yet' : 'No courses match your search'}
            </h3>
            <p className="text-xs text-brown-soft mt-1.5 leading-relaxed">
              {courses.length === 0
                ? 'Check back soon as our instructors publish new courses, or browse our course catalog.'
                : 'Try adjusting your search terms or clearing your category filters.'}
            </p>
            {courses.length > 0 && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold text-burgundy bg-burgundy/10 hover:bg-burgundy/20 active:scale-95 transition-all cursor-pointer"
              >
                Reset search &amp; filters
              </button>
            )}
          </div>
        )}

        {/* Course Cards Grid with Progressive Staggered Reveal */}
        {!loading && !error && displayedCourses.length > 0 && (
          <div className="mt-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {displayedCourses.map((course, index) => (
                <Reveal key={course.id} delay={index * 60}>
                  <CourseCard course={course} />
                </Reveal>
              ))}
            </div>

            {/* View All Courses CTA */}
            <div className="mt-12 text-center">
              <Reveal delay={200}>
                <Link
                  to="/courses"
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  <span>View all courses ({courses.length})</span>
                  <svg className="w-4 h-4 card-arrow-nudge" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </Reveal>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

