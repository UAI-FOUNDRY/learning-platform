import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { learnerService } from '../../services/learnerService';

export default function LearnerNavbar({ onOpenMobileSidebar }) {
  const { user, logoutSession } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(() => learnerService.getProfile());
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showStreakModal, setShowStreakModal] = useState(false);

  const profileRef = useRef(null);

  useEffect(() => {
    return learnerService.subscribe((state) => {
      setProfile(state.profile);
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsProfileMenuOpen(false);
    if (logoutSession) await logoutSession();
    navigate('/login?role=learner');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsSearchOpen(false);
      navigate(`/courses?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#E2DCD4]/95 backdrop-blur-md border-b border-[#B6AA9A] px-4 sm:px-6 py-3 transition-colors">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Mobile Toggle & Welcome Pill */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenMobileSidebar}
              className="lg:hidden p-2 rounded-xl text-[#514940] hover:text-[#211E1A] hover:bg-[#D6D0C8] border border-[#B6AA9A] transition-colors focus:outline-none focus:ring-2 focus:ring-[#D92D2D]"
              aria-label="Open mobile menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                Active Student Session
              </span>
              <span className="text-xs font-semibold text-[#514940] hidden md:inline">
                {profile?.institution || 'LearnSpace Scholar'}
              </span>
            </div>
          </div>

          {/* Center: Search Trigger Input */}
          <div className="flex-1 max-w-md mx-2 hidden md:block">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="w-full flex items-center justify-between px-3.5 py-1.5 bg-[#EAE3DA] hover:bg-white text-[#71675D] border border-[#B6AA9A] rounded-xl text-xs transition-colors shadow-2xs group"
            >
              <span className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-[#514940] group-hover:text-[#D92D2D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Search courses, lectures, or topics...</span>
              </span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-[#B6AA9A] rounded text-[#514940]">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right: Gamification Badges & Profile Dropdown */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Streak Counter Pill */}
            <button
              type="button"
              onClick={() => setShowStreakModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EAE3DA] hover:bg-[#D6D0C8] border border-[#B6AA9A] rounded-xl text-xs font-extrabold text-[#211E1A] transition-all hover:scale-102 shadow-2xs"
              title="Click to view your study streak"
            >
              <span className="text-sm">🔥</span>
              <span>{profile?.stats?.streakDays || 12}d</span>
              <span className="hidden sm:inline text-[#71675D] font-normal text-[11px]">streak</span>
            </button>

            {/* Total Points / XP */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-[#EAE3DA] border border-[#B6AA9A] rounded-xl text-xs font-bold text-[#211E1A]">
              <span>⭐</span>
              <span>{profile?.stats?.totalPoints || 1450}</span>
              <span className="text-[#71675D] font-normal text-[10px]">XP</span>
            </div>

            {/* Browse Catalog Quick CTA */}
            <Link
              to="/courses"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#211E1A] hover:bg-black text-white text-xs font-bold rounded-xl transition-colors shadow-2xs"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>Catalog</span>
            </Link>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen(prev => !prev)}
                className="flex items-center gap-2 p-1 pl-2 bg-[#EAE3DA] hover:bg-[#D6D0C8] border border-[#B6AA9A] rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-[#D92D2D]"
                aria-label="User menu"
                aria-expanded={isProfileMenuOpen}
              >
                <div className="w-7 h-7 rounded-lg bg-[#211E1A] text-white flex items-center justify-center font-bold text-xs">
                  {profile?.avatar || 'SC'}
                </div>
                <span className="hidden sm:inline text-xs font-bold text-[#211E1A]">
                  {profile?.name || 'Sarah Chen'}
                </span>
                <svg className="w-3.5 h-3.5 text-[#514940] mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border-2 border-[#B6AA9A] rounded-2xl shadow-xl py-2 z-50 animate-scale-in">
                  <div className="px-4 py-2 border-b border-[#B6AA9A]/40">
                    <p className="text-xs font-extrabold text-[#211E1A] truncate">{profile?.name || 'Sarah Chen'}</p>
                    <p className="text-[11px] text-[#71675D] truncate">{profile?.email || 'sarah.chen@stanford.edu'}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#EAE3DA] text-[#211E1A]">
                      {profile?.stats?.rankTitle || 'Advanced Scholar'}
                    </span>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/learner/dashboard"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-[#211E1A] hover:bg-[#EAE3DA]"
                    >
                      <span>📊</span>
                      <span>Dashboard</span>
                    </Link>
                    <Link
                      to="/learner/my-learning"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-[#211E1A] hover:bg-[#EAE3DA]"
                    >
                      <span>📚</span>
                      <span>My Enrolled Courses</span>
                    </Link>
                    <Link
                      to="/learner/certificates"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-[#211E1A] hover:bg-[#EAE3DA]"
                    >
                      <span>🏆</span>
                      <span>Earned Certificates</span>
                    </Link>
                    <Link
                      to="/learner/wishlist"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-[#211E1A] hover:bg-[#EAE3DA]"
                    >
                      <span>💖</span>
                      <span>Saved Wishlist</span>
                    </Link>
                    <Link
                      to="/learner/profile"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-[#211E1A] hover:bg-[#EAE3DA]"
                    >
                      <span>⚙️</span>
                      <span>Profile & Goals</span>
                    </Link>
                  </div>

                  <div className="pt-1 border-t border-[#B6AA9A]/40">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-[#D92D2D] hover:bg-red-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Streak Info Modal */}
      {showStreakModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border-2 border-[#B6AA9A] rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4 animate-scale-in">
            <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 border border-orange-300 mx-auto flex items-center justify-center text-3xl shadow-xs">
              🔥
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-[#211E1A]">
                {profile?.stats?.streakDays || 12}-Day Study Streak!
              </h3>
              <p className="mt-1 text-xs text-[#514940] leading-relaxed">
                You’ve logged in, completed lectures, or practiced code for {profile?.stats?.streakDays || 12} consecutive days.
              </p>
            </div>
            <div className="p-3 bg-[#EAE3DA] rounded-xl border border-[#B6AA9A] text-xs space-y-1.5">
              <div className="flex justify-between font-bold text-[#211E1A]">
                <span>Weekly Goal:</span>
                <span>{profile?.learningGoal?.completedHoursThisWeek || 6.5}h / {profile?.learningGoal?.weeklyTargetHours || 8}h</span>
              </div>
              <div className="w-full bg-[#D6D0C8] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#D92D2D] h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round(((profile?.learningGoal?.completedHoursThisWeek || 6.5) / (profile?.learningGoal?.weeklyTargetHours || 8)) * 100))}%` }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowStreakModal(false)}
              className="w-full py-2.5 px-4 bg-[#211E1A] hover:bg-black text-white rounded-xl text-xs font-bold transition-colors"
            >
              Keep Learning
            </button>
          </div>
        </div>
      )}

      {/* Quick Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-start justify-center pt-20 p-4 animate-fade-in">
          <div className="bg-white border-2 border-[#B6AA9A] rounded-2xl max-w-lg w-full p-4 shadow-2xl space-y-3 animate-scale-in">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across courses, PyTorch, Kubernetes, WCAG..."
                className="w-full pl-10 pr-10 py-3 text-sm bg-[#EAE3DA]/50 border border-[#B6AA9A] rounded-xl text-[#211E1A] focus:outline-none focus:border-[#D92D2D] focus:ring-1 focus:ring-[#D92D2D]"
              />
              <span className="absolute left-3.5 top-3.5 text-[#514940]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="absolute right-3 top-3 text-xs text-[#71675D] hover:text-[#211E1A] px-1.5 py-0.5 rounded border border-[#B6AA9A]"
              >
                ESC
              </button>
            </form>

            <div className="text-xs text-[#71675D] flex items-center justify-between px-1">
              <span>Press <kbd className="font-mono bg-[#EAE3DA] px-1 rounded">Enter</kbd> to view results</span>
              <button
                type="button"
                onClick={() => {
                  setIsSearchOpen(false);
                  navigate('/courses');
                }}
                className="font-bold text-[#D92D2D] hover:underline"
              >
                Browse All Courses →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
