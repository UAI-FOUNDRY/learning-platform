import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

// High-quality SVG icons for navigation
function DashboardIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

function UsersIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
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

function ApprovalsIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CategoriesIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  );
}

function OrganizationsIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function AssessmentsIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4m-6-3h6" />
    </svg>
  );
}

function ReportsIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function LogsIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function SettingsIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

// Map route icons
const iconMap = {
  '/admin/dashboard': DashboardIcon,
  '/admin/users': UsersIcon,
  '/admin/courses': CoursesIcon,
  '/admin/approvals': ApprovalsIcon,
  '/admin/assessments': AssessmentsIcon,
  '/admin/categories': CategoriesIcon,
  '/admin/organizations': OrganizationsIcon,
  '/admin/reports': ReportsIcon,
  '/admin/activity-logs': LogsIcon,
  '/admin/settings': SettingsIcon
};

export default function Sidebar({
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
  links, // Fallback for simple link array
  groups // Custom nav groups
}) {
  const [activeTooltip, setActiveTooltip] = useState(null);

  // If a simple links array was passed, render basic sidebar (legacy fallback)
  if (links && !groups) {
    return (
      <aside className="w-64 border-r border-[#B6AA9A] bg-[#E2DCD4] min-h-screen p-4 transition-colors duration-200">
        <nav className="flex flex-col gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#EAE3DA] text-[#D92D2D] border border-[#B6AA9A] font-semibold'
                    : 'text-[#514940] hover:bg-[#C8BBAA]/50 hover:text-[#211E1A]'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    );
  }

  // Super Admin Navigation Groups (Appearance theme toggle removed)
  const navGroups = groups || [
    {
      title: 'Overview',
      items: [
        { to: '/admin/dashboard', label: 'Dashboard', icon: DashboardIcon, isExisting: true }
      ]
    },
    {
      title: 'Platform Management',
      items: [
        { to: '/admin/users', label: 'User Management', icon: UsersIcon, isExisting: true },
        { to: '/admin/courses', label: 'Course Management', icon: CoursesIcon, isExisting: true },
        { to: '/admin/approvals', label: 'Course Approvals', icon: ApprovalsIcon, isExisting: true },
        { to: '/admin/assessments', label: 'Assessments', icon: AssessmentsIcon, isExisting: true },
        { to: '/admin/categories', label: 'Categories', icon: CategoriesIcon, isExisting: true },
        { to: '/admin/organizations', label: 'Organizations', icon: OrganizationsIcon, isExisting: true }
      ]
    },
    {
      title: 'Insights',
      items: [
        { to: '/admin/reports', label: 'Reports & Analytics', icon: ReportsIcon, isExisting: true },
        { to: '/admin/activity-logs', label: 'Activity Logs', icon: LogsIcon, isExisting: true }
      ]
    },
    {
      title: 'System',
      items: [
        { to: '/admin/settings', label: 'Platform Settings', icon: SettingsIcon, isExisting: true }
      ]
    }
  ];

  const renderNavContent = (isMobile = false) => {
    const collapsed = isMobile ? false : isCollapsed;

    return (
      <div className="flex flex-col h-full select-none">
        {/* Brand & Platform Header */}
        <div className={`h-16 flex items-center border-b border-[#B6AA9A] px-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-3 overflow-hidden">
            {/* Education Cap Icon with brand red */}
            <div className="w-9 h-9 rounded-xl bg-[#D92D2D] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
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
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#EAE3DA] text-[#D92D2D] border border-[#B6AA9A]">
                    Super Admin
                  </span>
                </div>
                <span className="text-[12px] text-[#71675D] whitespace-nowrap">
                  Platform Control Center
                </span>
              </div>
            )}
          </div>

          {/* Close button for mobile drawer */}
          {isMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-[#514940] hover:bg-[#C8BBAA]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
              aria-label="Close navigation drawer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Navigation Groups List */}
        <nav
          className={`flex-1 px-3 py-5 space-y-7 ${collapsed ? 'overflow-visible' : 'overflow-y-auto'}`}
          aria-label="Sidebar Navigation"
        >
          {navGroups.map((group, groupIdx) => (
            <div key={group.title || groupIdx} className="space-y-1.5">
              {/* Group Heading (only when expanded) */}
              {!collapsed && (
                <h3 className="px-3 text-[12px] font-bold text-[#71675D] uppercase tracking-wider mb-1">
                  {group.title}
                </h3>
              )}

              {/* Group separator when collapsed */}
              {collapsed && groupIdx > 0 && (
                <div className="my-2 border-t border-[#B6AA9A]" />
              )}

              <div className="space-y-1.5">
                {group.items.map((item) => {
                  const Icon = item.icon || iconMap[item.to] || DashboardIcon;

                  return (
                    <div key={item.to} className="relative">
                      <NavLink
                        to={item.to}
                        onClick={isMobile ? onCloseMobile : undefined}
                        onMouseEnter={() => collapsed && setActiveTooltip(item.label)}
                        onMouseLeave={() => setActiveTooltip(null)}
                        onFocus={() => collapsed && setActiveTooltip(item.label)}
                        onBlur={() => setActiveTooltip(null)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-3 rounded-lg text-[15px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] ${
                            collapsed ? 'justify-center' : 'justify-between'
                          } ${
                            isActive
                              ? 'bg-[#EAE3DA] text-[#D92D2D] font-semibold shadow-xs border border-[#B6AA9A]'
                              : 'text-[#514940] hover:bg-[#C8BBAA]/50 hover:text-[#211E1A]'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <div className="flex items-center gap-3">
                              <Icon
                                className={`w-5 h-5 flex-shrink-0 transition-colors ${
                                  isActive
                                    ? 'text-[#D92D2D]'
                                    : 'text-[#71675D] group-hover:text-[#D92D2D]'
                                }`}
                              />
                              {!collapsed && (
                                <span className="whitespace-nowrap font-medium">{item.label}</span>
                              )}
                            </div>

                            {/* Status tag if route is missing */}
                            {!collapsed && !item.isExisting && (
                              <span
                                className="text-[11px] font-semibold flex-shrink-0 text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full"
                                title="Route not yet registered in router"
                              >
                                Pending
                              </span>
                            )}
                          </>
                        )}
                      </NavLink>

                      {/* Tooltip for collapsed sidebar */}
                      {collapsed && activeTooltip === item.label && (
                        <div
                          role="tooltip"
                          className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 px-2.5 py-1 text-xs font-semibold text-[#EAE3DA] bg-[#211E1A] rounded-md shadow-xl whitespace-nowrap pointer-events-none animate-fade-in border border-[#71675D]"
                        >
                          <div className="flex items-center gap-2">
                            <span>{item.label}</span>
                            {!item.isExisting && (
                              <span className="text-[9px] bg-amber-500/30 text-amber-200 px-1.5 py-0.2 rounded font-normal">
                                Unrouted
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer: Collapse/Expand action (Desktop) */}
        {!isMobile && (
          <div className="p-3 border-t border-[#B6AA9A]">
            <button
              type="button"
              onClick={onToggleCollapse}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg text-[#514940] hover:bg-[#C8BBAA]/50 hover:text-[#D92D2D] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] ${
                collapsed ? 'justify-center' : 'justify-start'
              }`}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {collapsed ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                )}
              </svg>
              {!collapsed && <span>Collapse Sidebar</span>}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-[#E2DCD4] border-r border-[#B6AA9A] transition-all duration-300 ease-in-out select-none flex-shrink-0 sticky top-0 h-screen ${
          isCollapsed ? 'w-20 overflow-visible' : 'w-72 overflow-hidden'
        }`}
      >
        {renderNavContent(false)}
      </aside>

      {/* Mobile Drawer (Overlay + Drawer) */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Slide-out Panel */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#E2DCD4] border-r border-[#B6AA9A] shadow-2xl z-50 animate-fade-in">
            {renderNavContent(true)}
          </div>
        </div>
      )}
    </>
  );
}
