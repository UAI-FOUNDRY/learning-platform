import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { learnerService } from '../../services/learnerService';

export default function LearnerSidebar({
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile
}) {
  const [courses, setCourses] = useState(() => learnerService.getEnrolledCourses());

  useEffect(() => {
    return learnerService.subscribe((state) => {
      setCourses(state.enrolledCourses || []);
    });
  }, []);

  const activeCourse = courses.find(c => c.progressPercent < 100) || courses[0];

  const navLinks = [
    {
      to: '/learner/dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      to: '/learner/my-learning',
      label: 'My Learning',
      badge: courses.length > 0 ? String(courses.length) : null,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    {
      to: '/learner/certificates',
      label: 'Certificates',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      )
    },
    {
      to: '/learner/wishlist',
      label: 'Wishlist',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      )
    },
    {
      to: '/learner/profile',
      label: 'Profile & Goals',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    }
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#E2DCD4] border-r border-[#B6AA9A] select-none">
      {/* Brand & Portal Badge */}
      <div className="p-4 border-b border-[#B6AA9A] flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-[#D92D2D] text-white flex items-center justify-center font-black text-lg shadow-sm group-hover:scale-105 transition-transform">
            LS
          </div>
          {!isCollapsed && (
            <div>
              <div className="font-extrabold text-base tracking-tight text-[#211E1A] leading-none">
                LearnSpace
              </div>
              <div className="text-[10px] font-bold text-[#D92D2D] tracking-wider uppercase mt-1">
                Learner Studio
              </div>
            </div>
          )}
        </Link>

        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg text-[#514940] hover:text-[#211E1A] hover:bg-[#D6D0C8] border border-transparent hover:border-[#B6AA9A] transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg className={`w-4 h-4 transform transition-transform ${isCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Primary Navigation Links */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {navLinks.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onCloseMobile}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-[#211E1A] text-white shadow-xs'
                  : 'text-[#514940] hover:text-[#211E1A] hover:bg-[#EAE3DA]'
              } ${isCollapsed ? 'justify-center px-2' : ''}`
            }
            title={isCollapsed ? item.label : undefined}
          >
            <span className="shrink-0">{item.icon}</span>
            {!isCollapsed && (
              <span className="flex-1 truncate">{item.label}</span>
            )}
            {!isCollapsed && item.badge && (
              <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A]">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}

        <div className="pt-2 border-t border-[#B6AA9A]/50">
          <Link
            to="/courses"
            onClick={onCloseMobile}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-[#514940] hover:text-[#211E1A] hover:bg-[#EAE3DA] transition-colors ${
              isCollapsed ? 'justify-center px-2' : ''
            }`}
            title={isCollapsed ? 'Explore All Courses' : undefined}
          >
            <svg className="w-5 h-5 shrink-0 text-[#D92D2D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {!isCollapsed && <span>Explore Catalog</span>}
          </Link>
        </div>
      </nav>

      {/* Active Course Resume Mini-Widget */}
      {!isCollapsed && activeCourse && (
        <div className="p-3 m-3 bg-[#EAE3DA] border border-[#B6AA9A] rounded-2xl shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#71675D]">
            <span>IN PROGRESS</span>
            <span className="text-[#D92D2D] font-extrabold">{activeCourse.progressPercent}%</span>
          </div>

          <h4 className="text-xs font-extrabold text-[#211E1A] line-clamp-1">
            {activeCourse.title}
          </h4>

          <div className="w-full bg-[#D6D0C8] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#D92D2D] h-full rounded-full transition-all duration-300"
              style={{ width: `${activeCourse.progressPercent}%` }}
            />
          </div>

          <Link
            to={`/learner/player/${activeCourse.id}`}
            onClick={onCloseMobile}
            className="w-full mt-1 py-1.5 px-2 bg-[#211E1A] hover:bg-black text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
          >
            <span>Resume Lecture</span>
            <span>→</span>
          </Link>
        </div>
      )}

      {/* User Status Bar */}
      <div className="p-3 border-t border-[#B6AA9A] bg-[#D6D0C8]/50 flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-[#211E1A] text-white flex items-center justify-center font-bold text-xs shrink-0">
          SC
        </div>
        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-[#211E1A] truncate">Sarah Chen</p>
            <p className="text-[10px] text-[#71675D] truncate">Stanford University</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-200 z-20 sticky top-0 h-screen ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#E2DCD4] z-10 animate-slide-right">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
