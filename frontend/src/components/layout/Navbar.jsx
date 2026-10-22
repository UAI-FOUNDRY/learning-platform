// frontend/src/components/layout/Navbar.jsx
import React, { useState, useRef, useEffect, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useAuth } from '../../hooks/useAuth';
import {
  getLocalNotifications,
  getLocalUnreadCount,
  markAsRead,
  markAllAsRead,
  subscribeToNotifications,
  formatRelativeTime
} from '../../services/notificationService';

export default function Navbar({
  variant = 'public',
  isSidebarCollapsed = false,
  onToggleSidebar,
  onOpenMobileSidebar,
  pageTitle
}) {
  const auth = useContext(AuthContext);
  const authHook = useAuth ? useAuth() : null;
  const user = auth?.user || authHook?.user || null;
  const logout = auth?.logout || authHook?.logoutSession || null;

  const navigate = useNavigate();
  const location = useLocation();

  // Admin Top Bar State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsList, setNotificationsList] = useState(() => {
    try { return getLocalNotifications(); } catch { return []; }
  });
  const [unreadCount, setUnreadCount] = useState(() => {
    try { return getLocalUnreadCount(); } catch { return 0; }
  });
  const [notificationToast, setNotificationToast] = useState(null);

  // Public Navbar State
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 12);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.hash]);

  // Notifications subscription
  useEffect(() => {
    const handleUpdate = () => {
      try {
        setNotificationsList(getLocalNotifications());
        setUnreadCount(getLocalUnreadCount());
      } catch {}
    };
    try {
      return subscribeToNotifications(handleUpdate);
    } catch {}
  }, []);

  const profileRef = useRef(null);
  const notificationsRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchModalRef = useRef(null);

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

  // Global Ctrl+K / Cmd+K listener for admin search
  useEffect(() => {
    if (variant !== 'admin') return;
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
  }, [variant]);

  const handleLogout = async () => {
    setIsProfileOpen(false);
    if (logout) {
      await logout();
    } else {
      localStorage.removeItem('access_token');
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
    navigate('/login');
  };

  // ==============================================================
  // 1. SUPER ADMIN VARIANT TOP BAR (Teammate implementation)
  // ==============================================================
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
      : location.pathname.includes('/activity-logs')
      ? 'Activity Logs'
      : location.pathname.includes('/assessments')
      ? 'Assessments Management'
      : location.pathname.includes('/review')
      ? 'Course Quality Review'
      : location.pathname.includes('/settings')
      ? 'Platform Settings'
      : location.pathname.includes('/notifications')
      ? 'Notifications'
      : 'Dashboard';

    const currentTitle = pageTitle || defaultTitle;

    const quickLinks = [
      { label: 'Admin Dashboard', to: '/admin/dashboard', desc: 'Platform overview and stats' },
      { label: 'Notifications', to: '/admin/notifications', desc: 'System alerts, approvals, and administrative notifications' },
      { label: 'Course Approvals Queue', to: '/admin/approvals', desc: 'Review pending course submissions' },
      { label: 'User Management', to: '/admin/users', desc: 'Manage learners, professors, and roles' },
      { label: 'Assessments Management', to: '/admin/assessments', desc: 'Quizzes, assignments, and test governance' },
      { label: 'Categories Taxonomy', to: '/admin/categories', desc: 'Browse course classification' },
      { label: 'Organizations', to: '/admin/organizations', desc: 'University and corporate partners' },
      { label: 'Reports & Analytics', to: '/admin/reports', desc: 'Platform usage & enrollment reports' },
      { label: 'Activity Logs', to: '/admin/activity-logs', desc: 'Audit trail of administrative actions and platform events' },
      { label: 'Platform Settings', to: '/admin/settings', desc: 'Configure platform parameters, notifications & maintenance' }
    ].filter(item => item.label.toLowerCase().includes(searchQuery.toLowerCase()) || item.desc.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
      <header className="sticky top-0 z-30 h-16 bg-[#E2DCD4] border-b border-[#B6AA9A] px-4 sm:px-6 flex items-center justify-between transition-colors duration-200">
        {/* Left: Sidebar Toggle & Breadcrumbs */}
        <div className="flex items-center gap-3 sm:gap-4">
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

          <div className="flex items-center text-[15px] font-medium">
            <span className="text-[#71675D] hidden sm:inline">Super Admin</span>
            <span className="text-[#B6AA9A] mx-2 hidden sm:inline">/</span>
            <span className="text-[#211E1A] font-semibold truncate max-w-[180px] sm:max-w-xs md:max-w-md">
              {currentTitle}
            </span>
          </div>
        </div>

        {/* Right: Search, Notifications, Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
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

          {/* Notifications Dropdown */}
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => setIsNotificationsOpen(prev => !prev)}
              className="relative p-2 rounded-lg text-[#514940] hover:bg-[#C8BBAA]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] transition-colors"
              aria-label={unreadCount > 0 ? `View notifications, ${unreadCount} unread` : 'View notifications, no unread'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D92D2D] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#D92D2D]"></span>
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#EAE3DA] rounded-xl shadow-xl border border-[#B6AA9A] py-2 z-50 animate-fade-in">
                <div className="px-4 py-2 border-b border-[#B6AA9A] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[#211E1A]">Notifications</span>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                      unreadCount > 0 ? 'bg-[#E2DCD4] text-[#D92D2D] border-[#B6AA9A]' : 'bg-[#E2DCD4] text-[#71675D] border-[#B6AA9A]'
                    }`}>
                      {unreadCount > 0 ? `${unreadCount} new` : 'All caught up'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await markAllAsRead();
                      setNotificationsList(getLocalNotifications());
                      setUnreadCount(0);
                    }}
                    className="text-xs text-[#D92D2D] hover:underline"
                  >
                    Mark all read
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-[#B6AA9A]/40">
                  {notificationsList.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#71675D]">No notifications</div>
                  ) : (
                    notificationsList.map(n => (
                      <div key={n.id} className={`p-3 text-xs ${n.is_read ? 'opacity-70' : 'bg-[#C8BBAA]/20'}`}>
                        <p className="font-semibold text-[#211E1A]">{n.title}</p>
                        <p className="text-[#514940] mt-0.5">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Admin Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setIsProfileOpen(prev => !prev)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[#C8BBAA]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-[#D92D2D] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'A'}
              </div>
              <span className="hidden sm:inline text-sm font-semibold text-[#211E1A]">
                {user?.full_name || 'Super Admin'}
              </span>
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-[#EAE3DA] rounded-xl shadow-xl border border-[#B6AA9A] py-1 z-50">
                <div className="px-4 py-2 border-b border-[#B6AA9A]">
                  <p className="text-xs font-semibold text-[#211E1A]">{user?.full_name || 'Super Admin'}</p>
                  <p className="text-[11px] text-[#71675D] truncate">{user?.email || 'admin@example.com'}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-[#D92D2D] hover:bg-[#C8BBAA]/50"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    );
  }

  // ==============================================================
  // 2. PUBLIC LEARNSPACE NAVBAR (fab3a6b warm landing theme)
  // ==============================================================
  const handleSectionNavigation = (e, sectionId) => {
    e.preventDefault();
    setMobileMenuOpen(false);

    if (location.pathname !== '/') {
      navigate(`/#${sectionId}`);
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        window.history.replaceState(null, '', `/#${sectionId}`);
      }
    }
  };

  const getDashboardRoute = () => {
    if (!user) return '/login';
    const role = String(user.role || '').toLowerCase();
    if (role.includes('admin')) return '/admin/dashboard';
    if (role.includes('instructor') || role.includes('professor')) return '/instructor/dashboard';
    return '/learner/dashboard';
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-200 ${
        isScrolled
          ? 'bg-mocha/95 backdrop-blur-md border-b border-cosmic shadow-warm-sm'
          : 'bg-mocha border-b border-cosmic/70'
      }`}
    >
      <nav
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between"
        aria-label="Global Navigation"
      >
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burgundy rounded-xl p-1"
          >
            <div className="w-9 h-9 rounded-xl bg-burgundy flex items-center justify-center text-mocha shadow-warm-sm group-hover:bg-burgundy-hover transition-colors">
              <svg
                className="w-5 h-5 text-mocha stroke-[2.2]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <span className="text-xl font-serif font-bold text-burgundy tracking-tight">
              Learn<span className="text-burgundy/80 italic ml-0.5">Space</span>
            </span>
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden lg:flex items-center gap-1.5 xl:gap-3">
          <Link
            to="/"
            className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
              location.pathname === '/' && !location.hash
                ? 'text-burgundy font-semibold border-b-2 border-burgundy bg-cosmic/10'
                : 'text-brown-soft hover:text-burgundy hover:bg-cosmic/15'
            }`}
          >
            Home
          </Link>
          <Link
            to="/courses"
            className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
              location.pathname.startsWith('/courses')
                ? 'text-burgundy font-semibold border-b-2 border-burgundy bg-cosmic/10'
                : 'text-brown-soft hover:text-burgundy hover:bg-cosmic/15'
            }`}
          >
            Explore Courses
          </Link>
          <a
            href="/#how-it-works"
            onClick={(e) => handleSectionNavigation(e, 'how-it-works')}
            className="px-3.5 py-1.5 text-sm font-medium rounded-lg text-brown-soft hover:text-burgundy hover:bg-cosmic/15 transition-all duration-200"
          >
            How It Works
          </a>
          <a
            href="/#showcase"
            onClick={(e) => handleSectionNavigation(e, 'showcase')}
            className="px-3.5 py-1.5 text-sm font-medium rounded-lg text-brown-soft hover:text-burgundy hover:bg-cosmic/15 transition-all duration-200"
          >
            Workspace
          </a>
          <Link
            to="/about"
            className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
              location.pathname === '/about'
                ? 'text-burgundy font-semibold border-b-2 border-burgundy bg-cosmic/10'
                : 'text-brown-soft hover:text-burgundy hover:bg-cosmic/15'
            }`}
          >
            About
          </Link>
        </div>

        {/* Desktop Auth Controls */}
        <div className="hidden lg:flex items-center gap-4">
          {user ? (
            <>
              <Link
                to={getDashboardRoute()}
                className="px-4 py-2 rounded-xl text-sm font-medium text-burgundy bg-mocha-surface border border-cosmic hover:border-burgundy hover:shadow-warm-sm active:scale-95 transition-all"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-2 rounded-xl text-sm font-medium text-brown-soft hover:text-burgundy active:scale-95 transition-all"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-brown-soft hover:text-burgundy transition-colors hover:underline underline-offset-4"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="nav-btn-primary active:scale-95"
              >
                Start Learning
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex lg:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
            className="p-2.5 rounded-xl text-burgundy hover:bg-mocha-surface border border-transparent hover:border-cosmic focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burgundy"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6 stroke-[2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6 stroke-[2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Accessible Mobile Menu */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden bg-mocha-surface border-b border-cosmic px-4 pt-3 pb-6 space-y-1 shadow-warm-md"
          role="region"
          aria-label="Mobile Navigation"
        >
          <Link
            to="/"
            className="block px-3 py-2.5 rounded-xl text-base font-medium text-burgundy hover:bg-mocha transition-colors"
          >
            Home
          </Link>
          <Link
            to="/courses"
            className="block px-3 py-2.5 rounded-xl text-base font-medium text-burgundy hover:bg-mocha transition-colors"
          >
            Explore Courses
          </Link>
          <a
            href="/#how-it-works"
            onClick={(e) => handleSectionNavigation(e, 'how-it-works')}
            className="block px-3 py-2.5 rounded-xl text-base font-medium text-burgundy hover:bg-mocha transition-colors"
          >
            How It Works
          </a>
          <a
            href="/#showcase"
            onClick={(e) => handleSectionNavigation(e, 'showcase')}
            className="block px-3 py-2.5 rounded-xl text-base font-medium text-burgundy hover:bg-mocha transition-colors"
          >
            Workspace
          </a>
          <Link
            to="/about"
            className="block px-3 py-2.5 rounded-xl text-base font-medium text-burgundy hover:bg-mocha transition-colors"
          >
            About
          </Link>

          <div className="pt-4 mt-3 border-t border-cosmic flex flex-col gap-2.5">
            {user ? (
              <>
                <Link
                  to={getDashboardRoute()}
                  className="w-full py-2.5 px-4 rounded-xl text-center text-sm font-semibold text-burgundy bg-mocha border border-cosmic"
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-2 px-4 rounded-xl text-center text-sm font-medium text-brown-soft hover:text-burgundy"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="w-full py-2.5 px-4 rounded-xl text-center text-sm font-semibold text-burgundy border border-cosmic bg-mocha hover:bg-mocha-surface transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="nav-btn-primary w-full text-center"
                >
                  Start Learning
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
