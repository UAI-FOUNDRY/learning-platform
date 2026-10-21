import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';

export default function Navbar({
  variant = 'public',
  isSidebarCollapsed = false,
  onToggleSidebar,
  onOpenMobileSidebar,
  pageTitle
}) {
  const { user, setUser, setIsAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPublicMobileMenuOpen, setIsPublicMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const profileRef = useRef(null);
  const notificationsRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdowns on click outside
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

  // Global Ctrl+K / Cmd+K listener for search
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsProfileOpen(false);
        setIsNotificationsOpen(false);
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

  const handleLogout = async () => {
    try {
      await authService.logout().catch(() => {});
    } finally {
      localStorage.removeItem('token');
      if (setUser) setUser(null);
      if (setIsAuthenticated) setIsAuthenticated(false);
      navigate('/login');
    }
  };

  // If Admin variant, render the Super Admin Top Bar
  if (variant === 'admin') {
    const defaultTitle = location.pathname.includes('/approvals')
      ? 'Course Approvals'
      : location.pathname.includes('/users')
      ? 'User Management'
      : location.pathname.includes('/categories')
      ? 'Category Management'
      : location.pathname.includes('/organizations')
      ? 'Organization Management'
      : location.pathname.includes('/reports')
      ? 'Reports & Analytics'
      : location.pathname.includes('/review')
      ? 'Course Quality Review'
      : 'Dashboard';

    const currentTitle = pageTitle || defaultTitle;

    const quickLinks = [
      { label: 'Admin Dashboard', to: '/admin/dashboard', desc: 'Platform overview and stats' },
      { label: 'Course Approvals Queue', to: '/admin/approvals', desc: 'Review pending course submissions' },
      { label: 'User Management', to: '/admin/users', desc: 'Manage learners, professors, and roles' },
      { label: 'Categories Taxonomy', to: '/admin/categories', desc: 'Browse course classification' },
      { label: 'Organizations', to: '/admin/organizations', desc: 'University and corporate partners' },
      { label: 'Reports & Analytics', to: '/admin/reports', desc: 'Platform usage & enrollment reports' }
    ].filter(item => item.label.toLowerCase().includes(searchQuery.toLowerCase()) || item.desc.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
      <header className="sticky top-0 z-30 h-16 bg-[#E2DCD4] border-b border-[#B6AA9A] px-4 sm:px-6 flex items-center justify-between transition-colors duration-200">
        {/* Left: Sidebar Toggle & Breadcrumbs */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Mobile drawer toggle */}
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

          {/* Desktop collapse toggle */}
          <button
            type="button"
            onClick={onToggleSidebar}
            className="hidden lg:flex p-2 rounded-lg text-[#514940] hover:bg-[#C8BBAA]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] transition-colors"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isSidebarCollapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              )}
            </svg>
          </button>

          {/* Location / Breadcrumbs */}
          <div className="flex items-center text-[15px] font-medium">
            <span className="text-[#71675D] hidden sm:inline">Super Admin</span>
            <span className="text-[#B6AA9A] mx-2 hidden sm:inline">/</span>
            <span className="text-[#211E1A] font-semibold truncate max-w-[180px] sm:max-w-xs md:max-w-md">
              {currentTitle}
            </span>
          </div>
        </div>

        {/* Right: Search, Notifications, Profile (Theme Toggle Removed) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Global Search Trigger */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#B6AA9A] bg-[#EAE3DA] text-[#514940] hover:border-[#D92D2D] text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] transition-colors shadow-2xs"
            aria-label="Open global search (Press Ctrl+K)"
          >
            <svg className="w-4 h-4 text-[#D92D2D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="hidden md:inline">Quick search...</span>
            <kbd className="hidden md:inline text-[10px] font-semibold uppercase tracking-wider bg-[#E2DCD4] text-[#71675D] px-1.5 py-0.5 rounded border border-[#B6AA9A]">
              Ctrl K
            </kbd>
          </button>

          {/* Notifications Trigger */}
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => setIsNotificationsOpen(prev => !prev)}
              className="relative p-2 rounded-lg text-[#514940] hover:bg-[#C8BBAA]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] transition-colors"
              aria-label="View notifications, 3 unread"
              aria-expanded={isNotificationsOpen}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {/* Alert Badge */}
              <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D92D2D] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#D92D2D]"></span>
              </span>
            </button>

            {/* Notifications Dropdown */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#EAE3DA] rounded-xl shadow-xl border border-[#B6AA9A] py-2 z-50 animate-fade-in">
                <div className="px-4 py-2 border-b border-[#B6AA9A] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[#211E1A]">Notifications</span>
                    <span className="text-[11px] font-medium bg-[#E2DCD4] text-[#D92D2D] px-2 py-0.5 rounded-full border border-[#B6AA9A]">
                      3 new
                    </span>
                  </div>
                  <span className="text-xs text-[#D92D2D] cursor-pointer hover:underline">
                    Mark all read
                  </span>
                </div>

                <div className="divide-y divide-[#B6AA9A]/50 max-h-72 overflow-y-auto">
                  <div className="px-4 py-3 hover:bg-[#C8BBAA]/40 transition-colors cursor-pointer">
                    <div className="flex items-start gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#B45309] mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-[#211E1A]">New Course Submitted</p>
                        <p className="text-xs text-[#514940] mt-0.5">
                          "Advanced Machine Learning" submitted by Dr. Sarah Chen.
                        </p>
                        <span className="text-[10px] text-[#71675D] mt-1 block">12 minutes ago</span>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-3 hover:bg-[#C8BBAA]/40 transition-colors cursor-pointer">
                    <div className="flex items-start gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#15803D] mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-[#211E1A]">Organization Registration</p>
                        <p className="text-xs text-[#514940] mt-0.5">
                          Global Tech Institute completed organizational verification.
                        </p>
                        <span className="text-[10px] text-[#71675D] mt-1 block">2 hours ago</span>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-3 hover:bg-[#C8BBAA]/40 transition-colors cursor-pointer">
                    <div className="flex items-start gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#D92D2D] mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-[#211E1A]">System Health Notice</p>
                        <p className="text-xs text-[#514940] mt-0.5">
                          Database connection pool stable. Daily automated snapshot verified.
                        </p>
                        <span className="text-[10px] text-[#71675D] mt-1 block">5 hours ago</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-2 border-t border-[#B6AA9A] text-center">
                  <Link
                    to="/admin/reports"
                    onClick={() => setIsNotificationsOpen(false)}
                    className="text-xs font-medium text-[#D92D2D] hover:underline"
                  >
                    View Activity Log & Reports
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Profile Menu */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setIsProfileOpen(prev => !prev)}
              className="flex items-center gap-2 p-1 sm:px-2 sm:py-1 rounded-lg hover:bg-[#C8BBAA]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] transition-colors"
              aria-label="User account menu"
              aria-expanded={isProfileOpen}
            >
              <div className="w-8 h-8 rounded-full bg-[#D92D2D] text-white flex items-center justify-center font-bold text-xs shadow-xs ring-1 ring-[#D92D2D]/30">
                SA
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-[#211E1A] leading-tight">
                  Super Admin
                </span>
                <span className="text-[10px] text-[#71675D] leading-tight">
                  Platform Admin
                </span>
              </div>
              <svg className="w-4 h-4 text-[#71675D] hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Profile Dropdown */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-[#EAE3DA] rounded-xl shadow-xl border border-[#B6AA9A] py-2 z-50 animate-fade-in">
                {/* User Identity Header */}
                <div className="px-4 py-3 border-b border-[#B6AA9A]">
                  <p className="text-xs font-medium text-[#71675D] uppercase tracking-wider">Signed in as</p>
                  <p className="text-sm font-semibold text-[#211E1A] mt-0.5 truncate">
                    {user?.name || 'Super Admin'}
                  </p>
                  <p className="text-xs text-[#514940] truncate">
                    {user?.email || 'superadmin@learnspace.org'}
                  </p>
                  <span className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[#E2DCD4] text-[#D92D2D] border border-[#B6AA9A]">
                    Super Administrator
                  </span>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      navigate('/learner/profile');
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-[#211E1A] hover:bg-[#C8BBAA]/50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-[#D92D2D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    My Profile
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      alert('Account settings page pending implementation.');
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-[#211E1A] hover:bg-[#C8BBAA]/50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-[#D92D2D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Account Settings
                  </button>
                </div>

                <div className="border-t border-[#B6AA9A] pt-1">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-[#B91C1C] hover:bg-red-50 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Global Search Dialog Modal */}
        {isSearchOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/40 backdrop-blur-xs animate-fade-in">
            <div className="bg-[#EAE3DA] rounded-xl shadow-2xl border border-[#B6AA9A] max-w-lg w-full overflow-hidden">
              <div className="p-3 border-b border-[#B6AA9A] flex items-center gap-3">
                <svg className="w-5 h-5 text-[#D92D2D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Jump to section or search portal..."
                  className="w-full bg-transparent border-none text-sm text-[#211E1A] placeholder-[#71675D] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="text-xs text-[#71675D] hover:text-[#211E1A] px-1.5 py-0.5 rounded border border-[#B6AA9A]"
                >
                  ESC
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto p-2">
                <p className="px-3 py-1.5 text-[11px] font-semibold text-[#71675D] uppercase tracking-wider">
                  Admin Destinations
                </p>
                {quickLinks.length === 0 ? (
                  <p className="px-3 py-4 text-xs text-center text-[#514940]">
                    No matching destinations found
                  </p>
                ) : (
                  quickLinks.map((link) => (
                    <button
                      key={link.to}
                      type="button"
                      onClick={() => {
                        setIsSearchOpen(false);
                        setSearchQuery('');
                        navigate(link.to);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#C8BBAA]/50 flex items-center justify-between group transition-colors"
                    >
                      <div>
                        <span className="text-xs font-medium text-[#211E1A] group-hover:text-[#D92D2D]">
                          {link.label}
                        </span>
                        <p className="text-[11px] text-[#71675D]">{link.desc}</p>
                      </div>
                      <svg className="w-4 h-4 text-[#71675D] group-hover:text-[#D92D2D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
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

  // Otherwise, render Public / Default Navbar with LearnSpace branding (No Theme Toggle)
  return (
    <nav className="border-b border-[#B6AA9A] bg-[#E2DCD4] px-4 sm:px-6 py-3 flex items-center justify-between transition-colors duration-200">
      {/* Brand & Logo */}
      <Link to="/" className="flex items-center gap-2 text-xl font-bold text-[#211E1A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] rounded-lg">
        {/* Education Cap Icon */}
        <div className="w-8 h-8 rounded-lg bg-[#D92D2D] text-white flex items-center justify-center shadow-xs">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
          </svg>
        </div>
        <span className="tracking-tight text-lg sm:text-xl font-extrabold">LearnSpace</span>
      </Link>

      {/* Center / Navigation Links (Desktop) */}
      <div className="hidden md:flex items-center gap-6 text-sm font-medium text-[#514940]">
        <Link to="/courses" className="hover:text-[#D92D2D] transition-colors">
          Explore Courses
        </Link>
        <Link to="/about" className="hover:text-[#D92D2D] transition-colors">
          About
        </Link>
        <Link to="/contact" className="hover:text-[#D92D2D] transition-colors">
          Contact
        </Link>
        <Link
          to="/instructor/dashboard"
          className="text-xs px-3 py-1.5 rounded-md bg-[#D92D2D] text-white font-bold hover:bg-[#B91C1C] transition-all shadow-xs"
        >
          Instructor Portal
        </Link>
        <Link
          to="/admin/dashboard"
          className="text-xs px-2.5 py-1.5 rounded-md bg-[#EAE3DA] text-[#D92D2D] border border-[#B6AA9A] font-semibold hover:border-[#D92D2D]/60 transition-colors"
        >
          Super Admin
        </Link>
      </div>

      {/* Right: Auth Buttons (Theme Toggle Removed) */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm font-medium text-[#514940] hover:text-[#211E1A] px-3 py-2 rounded-lg transition-colors"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="text-sm font-medium bg-[#D92D2D] text-white hover:bg-[#B91C1C] px-4 py-2 rounded-lg transition-colors shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
          >
            Register
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={() => setIsPublicMobileMenuOpen(prev => !prev)}
          className="md:hidden p-2 rounded-lg text-[#514940] hover:bg-[#C8BBAA]/50"
          aria-label="Toggle navigation menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Public Mobile Menu Drawer */}
      {isPublicMobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-16 bg-[#EAE3DA] border-b border-[#B6AA9A] p-4 flex flex-col gap-3 shadow-lg z-40">
          <Link
            to="/courses"
            onClick={() => setIsPublicMobileMenuOpen(false)}
            className="text-sm font-medium text-[#211E1A] py-1"
          >
            Explore Courses
          </Link>
          <Link
            to="/about"
            onClick={() => setIsPublicMobileMenuOpen(false)}
            className="text-sm font-medium text-[#211E1A] py-1"
          >
            About
          </Link>
          <Link
            to="/contact"
            onClick={() => setIsPublicMobileMenuOpen(false)}
            className="text-sm font-medium text-[#211E1A] py-1"
          >
            Contact
          </Link>
          <Link
            to="/instructor/dashboard"
            onClick={() => setIsPublicMobileMenuOpen(false)}
            className="text-sm font-bold text-[#D92D2D] py-1"
          >
            Instructor Portal
          </Link>
          <Link
            to="/admin/dashboard"
            onClick={() => setIsPublicMobileMenuOpen(false)}
            className="text-sm font-semibold text-[#514940] py-1"
          >
            Super Admin Portal
          </Link>
          <div className="border-t border-[#B6AA9A] pt-3 flex gap-2">
            <Link
              to="/login"
              onClick={() => setIsPublicMobileMenuOpen(false)}
              className="flex-1 text-center py-2 text-sm font-medium border border-[#B6AA9A] rounded-lg text-[#211E1A] bg-[#E2DCD4]"
            >
              Login
            </Link>
            <Link
              to="/register"
              onClick={() => setIsPublicMobileMenuOpen(false)}
              className="flex-1 text-center py-2 text-sm font-medium bg-[#D92D2D] text-white rounded-lg"
            >
              Register
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
