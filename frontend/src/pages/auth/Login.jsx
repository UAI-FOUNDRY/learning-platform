import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function Login({ defaultRole }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setUser, setIsAuthenticated } = useAuth();

  // Determine initial role: prop, URL query param (?role=instructor), or default 'instructor' / 'learner'
  const paramRole = searchParams.get('role');
  const initialRole = defaultRole || (paramRole === 'instructor' ? 'instructor' : paramRole === 'learner' ? 'learner' : 'instructor');

  const [activeRole, setActiveRole] = useState(initialRole);

  // Instructor credentials state
  const [instructorEmail, setInstructorEmail] = useState('elena.rostova@learnspace.org');
  const [instructorPassword, setInstructorPassword] = useState('FacultySecure2026!');
  const [facultyDepartment, setFacultyDepartment] = useState('Computer Science & AI');
  const [showInstructorPassword, setShowInstructorPassword] = useState(false);

  // Learner credentials state
  const [learnerEmail, setLearnerEmail] = useState('sarah.chen@stanford.edu');
  const [learnerPassword, setLearnerPassword] = useState('LearnerPassword123!');
  const [showLearnerPassword, setShowLearnerPassword] = useState(false);

  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (paramRole === 'instructor' || paramRole === 'learner') {
      setActiveRole(paramRole);
    }
  }, [paramRole]);

  const handleRoleChange = (role) => {
    setActiveRole(role);
    setError(null);
    setSearchParams({ role });
  };

  // Submit Instructor Login
  const handleInstructorLogin = (e) => {
    if (e) e.preventDefault();
    setError(null);

    if (!instructorEmail.trim() || !instructorPassword.trim()) {
      setError('Please provide both institutional email and faculty password.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const facultyUser = {
        name: 'Prof. Elena Rostova',
        email: instructorEmail.trim(),
        role: 'Instructor',
        department: facultyDepartment || 'Computer Science & AI',
        institution: 'Stanford Department of Computer Science',
        avatar: 'ER'
      };

      if (setUser) setUser(facultyUser);
      if (setIsAuthenticated) setIsAuthenticated(true);
      try {
        localStorage.setItem('learnspace_active_user', JSON.stringify(facultyUser));
      } catch {
        // Ignore in demo
      }

      setIsLoading(false);
      navigate('/instructor/dashboard');
    }, 300);
  };

  // Submit Learner Login
  const handleLearnerLogin = (e) => {
    if (e) e.preventDefault();
    setError(null);

    if (!learnerEmail.trim() || !learnerPassword.trim()) {
      setError('Please provide your student email address and password.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const studentUser = {
        name: 'Sarah Chen',
        email: learnerEmail.trim(),
        role: 'Learner',
        avatar: 'SC'
      };

      if (setUser) setUser(studentUser);
      if (setIsAuthenticated) setIsAuthenticated(true);
      try {
        localStorage.setItem('learnspace_active_user', JSON.stringify(studentUser));
      } catch {
        // Ignore in demo
      }

      setIsLoading(false);
      navigate('/learner/dashboard');
    }, 300);
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 animate-fade-in font-sans">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-[#D92D2D] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-[#211E1A]">
              LearnSpace
            </span>
          </Link>
          <p className="mt-2 text-xs font-semibold text-[#514940]">
            Sign in to access your customized academic portal
          </p>
        </div>

        {/* Role Selector Tabs (Learner vs Instructor) */}
        <div className="p-1.5 bg-[#C8BBAA] border border-[#B6AA9A] rounded-2xl flex items-center gap-1.5 shadow-xs">
          <button
            type="button"
            onClick={() => handleRoleChange('instructor')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-200 ${
              activeRole === 'instructor'
                ? 'bg-[#EAE3DA] text-[#D92D2D] border border-[#B6AA9A] shadow-md scale-101'
                : 'text-[#514940] hover:text-[#211E1A] hover:bg-[#EAE3DA]/50'
            }`}
          >
            <span>👨‍🏫</span>
            <span>Instructor / Faculty</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleChange('learner')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-200 ${
              activeRole === 'learner'
                ? 'bg-[#211E1A] text-white shadow-md scale-101'
                : 'text-[#514940] hover:text-[#211E1A] hover:bg-[#EAE3DA]/50'
            }`}
          >
            <span>🎓</span>
            <span>Student / Learner</span>
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-red-950 text-xs font-bold animate-slide-down flex items-center gap-2"
          >
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* ========================================================
            INSTRUCTOR / FACULTY LOGIN CARD
           ======================================================== */}
        {activeRole === 'instructor' ? (
          <div className="bg-white border-2 border-[#B6AA9A] rounded-2xl p-6 sm:p-8 shadow-md space-y-6 animate-slide-up">
            <div className="border-b border-[#B6AA9A]/50 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded bg-[#EAE3DA] text-[#D92D2D] border border-[#B6AA9A]">
                  Faculty Studio Access
                </span>
                <span className="text-xs text-[#71675D] font-mono">
                  Role: INSTRUCTOR
                </span>
              </div>
              <h2 className="mt-2 text-xl font-extrabold text-[#211E1A]">
                Instructor & Course Author Portal
              </h2>
              <p className="mt-1 text-xs text-[#514940] leading-relaxed">
                Manage curriculum hierarchies, author coding exercises, review student submissions, and monitor admin approval pipelines.
              </p>
            </div>

            <form onSubmit={handleInstructorLogin} className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="inst-email" className="block text-xs font-bold text-[#211E1A] mb-1">
                  Institutional / Faculty Email <span className="text-[#D92D2D]">*</span>
                </label>
                <div className="relative">
                  <input
                    id="inst-email"
                    type="email"
                    value={instructorEmail}
                    onChange={(e) => setInstructorEmail(e.target.value)}
                    placeholder="elena.rostova@learnspace.org"
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] placeholder-[#71675D] focus:outline-none focus:border-[#D92D2D] focus:ring-1 focus:ring-[#D92D2D]"
                    required
                  />
                  <span className="absolute left-3 top-3 text-[#71675D] text-xs">✉️</span>
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="inst-password" className="block text-xs font-bold text-[#211E1A]">
                    Faculty Password <span className="text-[#D92D2D]">*</span>
                  </label>
                  <Link to="/forgot-password" className="text-xs font-semibold text-[#D92D2D] hover:underline">
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="inst-password"
                    type={showInstructorPassword ? 'text' : 'password'}
                    value={instructorPassword}
                    onChange={(e) => setInstructorPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-12 py-2.5 text-xs sm:text-sm bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] placeholder-[#71675D] focus:outline-none focus:border-[#D92D2D] focus:ring-1 focus:ring-[#D92D2D]"
                    required
                  />
                  <span className="absolute left-3 top-3 text-[#71675D] text-xs">🔒</span>
                  <button
                    type="button"
                    onClick={() => setShowInstructorPassword(prev => !prev)}
                    className="absolute right-3 top-2.5 text-xs text-[#71675D] hover:text-[#211E1A] font-semibold"
                  >
                    {showInstructorPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Department */}
              <div>
                <label htmlFor="inst-dept" className="block text-xs font-bold text-[#211E1A] mb-1">
                  Academic Department / Institute
                </label>
                <input
                  id="inst-dept"
                  type="text"
                  value={facultyDepartment}
                  onChange={(e) => setFacultyDepartment(e.target.value)}
                  placeholder="Department of Computer Science & AI"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
                />
              </div>

              {/* Remember Workstation */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  id="remember-inst"
                  type="checkbox"
                  defaultChecked
                  className="rounded text-[#D92D2D] focus:ring-[#D92D2D] border-[#B6AA9A]"
                />
                <label htmlFor="remember-inst" className="text-xs text-[#514940] select-none">
                  Remember this academic teaching workstation
                </label>
              </div>

              {/* Primary Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-[#D92D2D] hover:bg-[#B91C1C] text-white font-extrabold text-sm transition-all shadow-md hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] focus-visible:ring-offset-2 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span>Signing in to Faculty Studio...</span>
                ) : (
                  <>
                    <span>Enter Instructor Portal</span>
                    <span>→</span>
                  </>
                )}
              </button>

              {/* Quick Demo Login Option */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleInstructorLogin()}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#EAE3DA] hover:bg-[#D6D0C8] text-[#211E1A] border border-[#B6AA9A] font-bold text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <span>⚡</span>
                  <span>Instant Demo: Prof. Elena Rostova</span>
                </button>
              </div>
            </form>

            <div className="pt-3 border-t border-[#B6AA9A]/50 text-center space-y-1.5">
              <p className="text-xs text-[#514940]">
                New faculty member?{' '}
                <Link to="/register?role=instructor" className="font-bold text-[#D92D2D] hover:underline">
                  Create Faculty Account
                </Link>
              </p>
              <p className="text-xs text-[#71675D]">
                Are you a learner looking for courses?{' '}
                <button
                  type="button"
                  onClick={() => handleRoleChange('learner')}
                  className="font-bold text-[#D92D2D] hover:underline"
                >
                  Switch to Student Login
                </button>
              </p>
            </div>
          </div>
        ) : (
          /* ========================================================
             LEARNER / STUDENT LOGIN CARD
             ======================================================== */
          <div className="bg-white border-2 border-[#B6AA9A] rounded-2xl p-6 sm:p-8 shadow-md space-y-6 animate-slide-up">
            <div className="border-b border-[#B6AA9A]/50 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded bg-[#211E1A] text-white">
                  Student Portal Access
                </span>
                <span className="text-xs text-[#71675D] font-mono">
                  Role: LEARNER
                </span>
              </div>
              <h2 className="mt-2 text-xl font-extrabold text-[#211E1A]">
                Student & Learner Sign In
              </h2>
              <p className="mt-1 text-xs text-[#514940] leading-relaxed">
                Resume course playback, practice with lecture-linked Python coding exercises, and take module quizzes.
              </p>
            </div>

            <form onSubmit={handleLearnerLogin} className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="learner-email" className="block text-xs font-bold text-[#211E1A] mb-1">
                  Student Email Address <span className="text-[#D92D2D]">*</span>
                </label>
                <div className="relative">
                  <input
                    id="learner-email"
                    type="email"
                    value={learnerEmail}
                    onChange={(e) => setLearnerEmail(e.target.value)}
                    placeholder="sarah.chen@stanford.edu"
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] placeholder-[#71675D] focus:outline-none focus:border-[#211E1A] focus:ring-1 focus:ring-[#211E1A]"
                    required
                  />
                  <span className="absolute left-3 top-3 text-[#71675D] text-xs">🎓</span>
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="learner-password" className="block text-xs font-bold text-[#211E1A]">
                    Password <span className="text-[#D92D2D]">*</span>
                  </label>
                  <Link to="/forgot-password" className="text-xs font-semibold text-[#514940] hover:underline">
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="learner-password"
                    type={showLearnerPassword ? 'text' : 'password'}
                    value={learnerPassword}
                    onChange={(e) => setLearnerPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-12 py-2.5 text-xs sm:text-sm bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] placeholder-[#71675D] focus:outline-none focus:border-[#211E1A] focus:ring-1 focus:ring-[#211E1A]"
                    required
                  />
                  <span className="absolute left-3 top-3 text-[#71675D] text-xs">🔒</span>
                  <button
                    type="button"
                    onClick={() => setShowLearnerPassword(prev => !prev)}
                    className="absolute right-3 top-2.5 text-xs text-[#71675D] hover:text-[#211E1A] font-semibold"
                  >
                    {showLearnerPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  id="remember-learner"
                  type="checkbox"
                  defaultChecked
                  className="rounded text-[#211E1A] focus:ring-[#211E1A] border-[#B6AA9A]"
                />
                <label htmlFor="remember-learner" className="text-xs text-[#514940] select-none">
                  Keep me signed in to my courses
                </label>
              </div>

              {/* Primary Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-[#211E1A] hover:bg-black text-white font-extrabold text-sm transition-all shadow-md hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#211E1A] focus-visible:ring-offset-2 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span>Signing in to Learner Portal...</span>
                ) : (
                  <>
                    <span>Enter Student Portal</span>
                    <span>→</span>
                  </>
                )}
              </button>

              {/* Quick Demo Login Option */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleLearnerLogin()}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#EAE3DA] hover:bg-[#D6D0C8] text-[#211E1A] border border-[#B6AA9A] font-bold text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <span>⚡</span>
                  <span>Instant Demo: Sarah Chen (Student)</span>
                </button>
              </div>
            </form>

            <div className="pt-3 border-t border-[#B6AA9A]/50 text-center space-y-1.5">
              <p className="text-xs text-[#514940]">
                Don't have a student account yet?{' '}
                <Link to="/register?role=learner" className="font-bold text-[#211E1A] hover:underline">
                  Create Student Account
                </Link>
              </p>
              <p className="text-xs text-[#71675D]">
                Are you an instructor or faculty member?{' '}
                <button
                  type="button"
                  onClick={() => handleRoleChange('instructor')}
                  className="font-bold text-[#D92D2D] hover:underline"
                >
                  Switch to Faculty Login
                </button>
              </p>
            </div>
          </div>
        )}

        {/* Security / System Footer Note */}
        <p className="text-center text-[11px] text-[#71675D]">
          Protected by LearnSpace Security • Session data managed locally in compliance with project workflow standards.
        </p>
      </div>
    </div>
  );
}
