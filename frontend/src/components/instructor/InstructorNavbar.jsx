import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { instructorCourseService } from '../../services/instructorCourseService';

export default function InstructorNavbar({ onOpenMobileSidebar }) {
  const navigate = useNavigate();
  const location = useLocation();
  const profile = instructorCourseService.getProfile();
  const courses = instructorCourseService.getCourses();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const profileRef = useRef(null);
  const notificationsRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Ctrl+K shortcut
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isSearchOpen]);

  // Determine page title
  const getPageTitle = () => {
    if (location.pathname.includes('/courses/new')) return 'Create New Course Studio';
    if (location.pathname.includes('/preview')) return 'Course Student View Preview';
    if (location.pathname.includes('/edit')) return 'Curriculum & Content Editor';
    if (location.pathname.includes('/courses')) return 'Course Catalog & Management';
    if (location.pathname.includes('/submissions')) return 'Student Submissions & Grading';
    if (location.pathname.includes('/analytics')) return 'Instructor Analytics & Engagement';
    return 'Teaching Dashboard & Overview';
  };

  const filteredCourses = courses.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#E2DCD4] border-b border-[#B6AA9A] px-4 sm:px-6 flex items-center justify-between transition-colors duration-200">
      {/* Left: Hamburger & Dynamic Page Title */}
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-lg text-[#514940] hover:bg-[#C8BBAA]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
          aria-label="Open mobile navigation"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-2.5">
          <h2 className="text-sm sm:text-base font-extrabold text-[#211E1A] tracking-tight">
            {getPageTitle()}
          </h2>
          <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#EAE3DA] text-[#D92D2D] border border-[#B6AA9A]">
            Faculty Mode
          </span>
        </div>
      </div>

      {/* Right Controls: Quick Search, Notifications, Profile Dropdown */}
      <div className="flex items-center gap-3">
        {/* Quick Search Shortcut Button */}
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#EAE3DA] border border-[#B6AA9A] text-xs font-semibold text-[#514940] hover:bg-[#D6D0C8] hover:text-[#211E1A] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
        >
          <svg className="w-3.5 h-3.5 text-[#71675D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="hidden sm:inline">Search courses...</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white rounded border border-[#B6AA9A] text-[#71675D]">
            ⌘K
          </kbd>
        </button>

        {/* Notifications Bell */}
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={() => setIsNotificationsOpen(prev => !prev)}
            className="p-2 rounded-lg text-[#514940] hover:bg-[#C8BBAA]/50 relative transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
            aria-label="View notifications"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#D92D2D] animate-ping" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#D92D2D]" />
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-[#EAE3DA] rounded-xl shadow-xl border border-[#B6AA9A] py-2 z-50 animate-scale-in">
              <div className="px-4 py-2.5 border-b border-[#B6AA9A] flex items-center justify-between">
                <span className="text-xs font-bold text-[#211E1A] uppercase tracking-wider">Faculty Notifications</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#D92D2D] text-white font-bold">3 new</span>
              </div>
              <div className="divide-y divide-[#B6AA9A]/50 text-xs">
                <div className="p-3 hover:bg-[#C8BBAA]/40 transition-colors">
                  <p className="font-bold text-[#211E1A]">Admin Revision Requested</p>
                  <p className="text-[#514940] mt-0.5">Super Admin requested updates on Computer Vision & Autonomous Agents.</p>
                  <span className="text-[10px] text-[#71675D] font-mono mt-1 block">Yesterday</span>
                </div>
                <div className="p-3 hover:bg-[#C8BBAA]/40 transition-colors">
                  <p className="font-bold text-[#211E1A]">Coding Exercise Passed</p>
                  <p className="text-[#514940] mt-0.5">Marcus Brody passed all test cases for Module 1 Exercise.</p>
                  <span className="text-[10px] text-[#71675D] font-mono mt-1 block">2 hours ago</span>
                </div>
                <div className="p-3 hover:bg-[#C8BBAA]/40 transition-colors">
                  <p className="font-bold text-[#211E1A]">New Course Review: 5.0 ★</p>
                  <p className="text-[#514940] mt-0.5">Sarah Chen left a 5-star review on Deep Learning with PyTorch.</p>
                  <span className="text-[10px] text-[#71675D] font-mono mt-1 block">3 days ago</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setIsProfileOpen(prev => !prev)}
            className="flex items-center gap-2 p-1 sm:px-2 sm:py-1 rounded-lg hover:bg-[#C8BBAA]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[#D92D2D] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {profile.avatar || 'ER'}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-[#211E1A] leading-tight">
                {profile.name}
              </span>
              <span className="text-[10px] text-[#71675D] leading-tight">
                Senior Instructor
              </span>
            </div>
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-[#EAE3DA] rounded-xl shadow-xl border border-[#B6AA9A] py-2 z-50 animate-scale-in">
              <div className="px-4 py-3 border-b border-[#B6AA9A]">
                <p className="text-xs font-bold text-[#71675D] uppercase tracking-wider">Faculty Account</p>
                <p className="text-sm font-extrabold text-[#211E1A] mt-0.5 truncate">{profile.name}</p>
                <p className="text-xs text-[#514940] truncate">{profile.email}</p>
              </div>

              <div className="py-1">
                <Link
                  to="/admin/dashboard"
                  onClick={() => setIsProfileOpen(false)}
                  className="w-full text-left px-4 py-2 text-xs text-[#211E1A] hover:bg-[#C8BBAA]/50 flex items-center gap-2 font-medium"
                >
                  <span>⚙️</span>
                  <span>Switch to Super Admin</span>
                </Link>
                <Link
                  to="/courses"
                  onClick={() => setIsProfileOpen(false)}
                  className="w-full text-left px-4 py-2 text-xs text-[#211E1A] hover:bg-[#C8BBAA]/50 flex items-center gap-2 font-medium"
                >
                  <span>🌐</span>
                  <span>View Public Catalog</span>
                </Link>
              </div>

              <div className="border-t border-[#B6AA9A] pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    navigate('/login');
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-bold text-[#B91C1C] hover:bg-red-50 flex items-center gap-2"
                >
                  <span>🚪</span>
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ctrl+K Search Modal */}
      {isSearchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/50 backdrop-blur-xs animate-fade-in"
          onClick={() => setIsSearchOpen(false)}
        >
          <div
            className="bg-[#EAE3DA] rounded-xl shadow-2xl border border-[#B6AA9A] max-w-lg w-full overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-[#B6AA9A] flex items-center gap-3">
              <svg className="w-5 h-5 text-[#D92D2D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Jump to any course or curriculum..."
                className="w-full bg-transparent text-sm text-[#211E1A] placeholder-[#71675D] outline-none font-medium"
              />
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="text-xs text-[#71675D] hover:text-[#211E1A] font-bold px-2 py-1"
              >
                ESC
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto p-2">
              {filteredCourses.length === 0 ? (
                <p className="text-center py-6 text-xs text-[#71675D]">No matching courses found.</p>
              ) : (
                filteredCourses.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setIsSearchOpen(false);
                      navigate(`/instructor/courses/${c.id}/edit`);
                    }}
                    className="w-full text-left p-2.5 rounded-lg hover:bg-[#C8BBAA]/50 flex items-center justify-between group transition-colors"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#211E1A] group-hover:text-[#D92D2D]">
                        {c.title}
                      </p>
                      <p className="text-[11px] text-[#71675D]">{c.category} • {c.status}</p>
                    </div>
                    <span className="text-xs text-[#71675D] group-hover:text-[#D92D2D] font-bold">
                      Open Editor →
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
