import React, { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { instructorCourseService } from '../../services/instructorCourseService';

// High-quality SVG icons
function DashboardIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

function CoursesIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function CreateCourseIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function SubmissionsIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function AnalyticsIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

export default function InstructorSidebar({
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile
}) {
  const profile = instructorCourseService.getProfile();
  const stats = instructorCourseService.getDashboardStats();

  const navGroups = [
    {
      title: 'Teaching Studio',
      items: [
        { to: '/instructor/dashboard', label: 'Dashboard', icon: DashboardIcon },
        { to: '/instructor/courses', label: 'My Courses', icon: CoursesIcon, badge: stats.totalCourses },
        { to: '/instructor/courses/new', label: 'Create Course', icon: CreateCourseIcon }
      ]
    },
    {
      title: 'Assessment & Analytics',
      items: [
        { to: '/instructor/submissions', label: 'Submissions', icon: SubmissionsIcon, badge: stats.activeInquiries },
        { to: '/instructor/analytics', label: 'Analytics', icon: AnalyticsIcon }
      ]
    }
  ];

  const renderNav = (isMobile = false) => {
    const collapsed = isMobile ? false : isCollapsed;

    return (
      <div className="flex flex-col h-full select-none justify-between">
        <div>
          {/* Header & Platform Identity */}
          <div className={`h-16 flex items-center border-b border-[#B6AA9A] px-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
            <Link to="/instructor/dashboard" className="flex items-center gap-3 overflow-hidden group">
              <div className="w-9 h-9 rounded-xl bg-[#D92D2D] text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
              </div>

              {!collapsed && (
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-[17px] tracking-tight text-[#211E1A] whitespace-nowrap">
                      LearnSpace
                    </span>
                    <span className="text-[10px] uppercase font-extrabold tracking-wider px-1.5 py-0.5 rounded bg-[#EAE3DA] text-[#D92D2D] border border-[#B6AA9A]">
                      Instructor
                    </span>
                  </div>
                  <span className="text-[11px] text-[#71675D] font-medium whitespace-nowrap">
                    Faculty Studio & Curriculum
                  </span>
                </div>
              )}
            </Link>

            {isMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-1.5 rounded-lg text-[#514940] hover:bg-[#C8BBAA]/50"
                aria-label="Close sidebar"
              >
                ✕
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <div className="p-3 space-y-6 overflow-y-auto">
            {navGroups.map((group, gIndex) => (
              <div key={gIndex} className="space-y-1.5">
                {!collapsed && (
                  <h4 className="px-3 text-[10px] uppercase font-extrabold tracking-wider text-[#71675D]">
                    {group.title}
                  </h4>
                )}

                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;

                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={isMobile ? onCloseMobile : undefined}
                        className={({ isActive }) =>
                          `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 relative ${
                            isActive
                              ? 'bg-[#EAE3DA] text-[#D92D2D] border border-[#B6AA9A] shadow-xs'
                              : 'text-[#514940] hover:bg-[#C8BBAA]/50 hover:text-[#211E1A]'
                          } ${collapsed ? 'justify-center px-2' : ''}`
                        }
                        title={collapsed ? item.label : undefined}
                      >
                        <Icon className="w-5 h-5 shrink-0 transition-transform group-hover:scale-110" />
                        {!collapsed && (
                          <div className="flex items-center justify-between flex-1 min-w-0">
                            <span className="truncate">{item.label}</span>
                            {item.badge !== undefined && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold bg-[#C8BBAA] text-[#211E1A]">
                                {item.badge}
                              </span>
                            )}
                          </div>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer: Instructor Profile & Role Switcher */}
        <div className="p-3 border-t border-[#B6AA9A] bg-[#EAE3DA]/40">
          {!collapsed ? (
            <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-white/70 border border-[#B6AA9A]/60 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#D92D2D] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  {profile.avatar || 'ER'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#211E1A] truncate">
                    {profile.name}
                  </p>
                  <p className="text-[10px] text-[#71675D] truncate">
                    Senior Faculty Member
                  </p>
                </div>
              </div>

              {onToggleCollapse && !isMobile && (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="p-1 rounded text-[#71675D] hover:text-[#211E1A] hover:bg-[#EAE3DA]"
                  title="Collapse sidebar"
                  aria-label="Collapse sidebar"
                >
                  ◀
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#D92D2D] text-white flex items-center justify-center font-bold text-xs shadow-2xs" title={profile.name}>
                {profile.avatar || 'ER'}
              </div>
              {onToggleCollapse && (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="p-1 rounded text-[#71675D] hover:text-[#211E1A]"
                  title="Expand sidebar"
                  aria-label="Expand sidebar"
                >
                  ▶
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-[#E2DCD4] border-r border-[#B6AA9A] transition-all duration-300 ease-in-out shrink-0 sticky top-0 h-screen ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {renderNav(false)}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex animate-fade-in"
          onClick={onCloseMobile}
        >
          <div
            className="w-72 bg-[#E2DCD4] h-full shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {renderNav(true)}
          </div>
        </div>
      )}
    </>
  );
}
