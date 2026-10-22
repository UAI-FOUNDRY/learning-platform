import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function Register({ defaultRole }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setUser, setIsAuthenticated } = useAuth();

  // Determine initial role: prop, URL query param (?role=instructor), or default 'learner'
  const paramRole = searchParams.get('role');
  const initialRole = defaultRole || (paramRole === 'instructor' ? 'instructor' : 'learner');

  const [activeRole, setActiveRole] = useState(initialRole);

  // Instructor Registration Form State
  const [instFullName, setInstFullName] = useState('');
  const [instEmail, setInstEmail] = useState('');
  const [instDepartment, setInstDepartment] = useState('Computer Science & Engineering');
  const [instTitle, setInstTitle] = useState('Assistant Professor');
  const [instInstitution, setInstInstitution] = useState('');
  const [instPassword, setInstPassword] = useState('');
  const [instConfirmPassword, setInstConfirmPassword] = useState('');
  const [instAgreeTerms, setInstAgreeTerms] = useState(false);
  const [showInstPassword, setShowInstPassword] = useState(false);

  // Learner Registration Form State
  const [learnerFullName, setLearnerFullName] = useState('');
  const [learnerEmail, setLearnerEmail] = useState('');
  const [learnerInstitution, setLearnerInstitution] = useState('');
  const [learnerInterest, setLearnerInterest] = useState('Artificial Intelligence');
  const [learnerPassword, setLearnerPassword] = useState('');
  const [learnerConfirmPassword, setLearnerConfirmPassword] = useState('');
  const [learnerAgreeTerms, setLearnerAgreeTerms] = useState(false);
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

  // Helper for password strength indication
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: 'Empty', color: 'bg-stone-300' };
    if (pwd.length < 6) return { score: 1, label: 'Weak', color: 'bg-red-500' };
    if (pwd.length < 10) return { score: 2, label: 'Fair', color: 'bg-amber-500' };
    return { score: 3, label: 'Strong', color: 'bg-emerald-600' };
  };

  // Quick Demo Pre-fill for Instructor
  const fillInstructorDemo = () => {
    setInstFullName('Dr. Marcus Vance');
    setInstEmail('marcus.vance@stanford.edu');
    setInstDepartment('Cloud Engineering & Systems');
    setInstTitle('Associate Professor');
    setInstInstitution('Stanford University');
    setInstPassword('FacultyPass2026!');
    setInstConfirmPassword('FacultyPass2026!');
    setInstAgreeTerms(true);
  };

  // Quick Demo Pre-fill for Learner
  const fillLearnerDemo = () => {
    setLearnerFullName('Sarah Chen');
    setLearnerEmail('sarah.chen@stanford.edu');
    setLearnerInstitution('Stanford University');
    setLearnerInterest('Artificial Intelligence');
    setLearnerPassword('LearnerSecure2026!');
    setLearnerConfirmPassword('LearnerSecure2026!');
    setLearnerAgreeTerms(true);
  };

  // Submit Instructor Registration
  const handleInstructorRegister = (e) => {
    if (e) e.preventDefault();
    setError(null);

    if (!instFullName.trim()) {
      setError('Please provide your full legal name or academic title.');
      return;
    }
    if (!instEmail.trim()) {
      setError('Please provide a valid institutional or faculty email.');
      return;
    }
    if (instPassword.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }
    if (instPassword !== instConfirmPassword) {
      setError('Faculty passwords do not match.');
      return;
    }
    if (!instAgreeTerms) {
      setError('You must accept the LearnSpace Faculty Agreement & Code of Conduct.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const newFacultyUser = {
        name: instFullName.trim(),
        email: instEmail.trim(),
        role: 'Instructor',
        department: instDepartment.trim() || 'Computer Science',
        title: instTitle,
        institution: instInstitution.trim() || 'Academic Faculty Member',
        avatar: instFullName.trim().split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
      };

      if (setUser) setUser(newFacultyUser);
      if (setIsAuthenticated) setIsAuthenticated(true);
      try {
        localStorage.setItem('learnspace_active_user', JSON.stringify(newFacultyUser));
      } catch {
        // Safe fallback in mock
      }

      setIsLoading(false);
      navigate('/instructor/dashboard');
    }, 400);
  };

  // Submit Learner Registration
  const handleLearnerRegister = (e) => {
    if (e) e.preventDefault();
    setError(null);

    if (!learnerFullName.trim()) {
      setError('Please provide your full name.');
      return;
    }
    if (!learnerEmail.trim()) {
      setError('Please provide a valid email address.');
      return;
    }
    if (learnerPassword.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }
    if (learnerPassword !== learnerConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!learnerAgreeTerms) {
      setError('You must accept the LearnSpace Terms of Service & Honor Code.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const newStudentUser = {
        name: learnerFullName.trim(),
        email: learnerEmail.trim(),
        role: 'Learner',
        institution: learnerInstitution.trim() || 'Independent Scholar',
        interest: learnerInterest,
        avatar: learnerFullName.trim().split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
      };

      if (setUser) setUser(newStudentUser);
      if (setIsAuthenticated) setIsAuthenticated(true);
      try {
        localStorage.setItem('learnspace_active_user', JSON.stringify(newStudentUser));
      } catch {
        // Safe fallback in mock
      }

      setIsLoading(false);
      navigate('/learner/dashboard');
    }, 400);
  };

  const instStrength = getPasswordStrength(instPassword);
  const learnerStrength = getPasswordStrength(learnerPassword);

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 animate-fade-in font-sans">
      <div className="max-w-xl w-full space-y-6">
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
            Create your account to start teaching or learning on LearnSpace
          </p>
        </div>

        {/* Role Selector Tabs (Learner vs Instructor) */}
        <div className="p-1.5 bg-[#C8BBAA] border border-[#B6AA9A] rounded-2xl flex items-center gap-1.5 shadow-xs">
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
            LEARNER / STUDENT REGISTRATION CARD
           ======================================================== */}
        {activeRole === 'learner' ? (
          <div className="bg-white border-2 border-[#B6AA9A] rounded-2xl p-6 sm:p-8 shadow-md space-y-6 animate-slide-up">
            <div className="border-b border-[#B6AA9A]/50 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded bg-[#211E1A] text-white">
                  Student Enrollment
                </span>
                <span className="text-xs text-[#71675D] font-mono">
                  Role: LEARNER
                </span>
              </div>
              <h2 className="mt-2 text-xl font-extrabold text-[#211E1A]">
                Create Your Learner Account
              </h2>
              <p className="mt-1 text-xs text-[#514940] leading-relaxed">
                Join thousands of students accessing interactive courses, lecture-linked coding workspaces, quizzes, and verifiable certificates.
              </p>
            </div>

            <form onSubmit={handleLearnerRegister} className="space-y-4">
              {/* Full Name */}
              <div>
                <label htmlFor="learner-name" className="block text-xs font-bold text-[#211E1A] mb-1">
                  Full Name <span className="text-[#D92D2D]">*</span>
                </label>
                <div className="relative">
                  <input
                    id="learner-name"
                    type="text"
                    value={learnerFullName}
                    onChange={(e) => setLearnerFullName(e.target.value)}
                    placeholder="Sarah Chen"
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] placeholder-[#71675D] focus:outline-none focus:border-[#D92D2D] focus:ring-1 focus:ring-[#D92D2D]"
                    required
                  />
                  <span className="absolute left-3 top-3 text-[#71675D] text-xs">👤</span>
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label htmlFor="learner-email" className="block text-xs font-bold text-[#211E1A] mb-1">
                  Email Address <span className="text-[#D92D2D]">*</span>
                </label>
                <div className="relative">
                  <input
                    id="learner-email"
                    type="email"
                    value={learnerEmail}
                    onChange={(e) => setLearnerEmail(e.target.value)}
                    placeholder="sarah.chen@stanford.edu"
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] placeholder-[#71675D] focus:outline-none focus:border-[#D92D2D] focus:ring-1 focus:ring-[#D92D2D]"
                    required
                  />
                  <span className="absolute left-3 top-3 text-[#71675D] text-xs">✉️</span>
                </div>
              </div>

              {/* Institution / University & Primary Learning Track */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="learner-inst" className="block text-xs font-bold text-[#211E1A] mb-1">
                    University / College / Company
                  </label>
                  <input
                    id="learner-inst"
                    type="text"
                    value={learnerInstitution}
                    onChange={(e) => setLearnerInstitution(e.target.value)}
                    placeholder="Stanford University"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
                  />
                </div>

                <div>
                  <label htmlFor="learner-track" className="block text-xs font-bold text-[#211E1A] mb-1">
                    Primary Interest Track
                  </label>
                  <select
                    id="learner-track"
                    value={learnerInterest}
                    onChange={(e) => setLearnerInterest(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
                  >
                    <option value="Artificial Intelligence">Artificial Intelligence</option>
                    <option value="Cloud Engineering">Cloud Engineering</option>
                    <option value="Software Engineering">Software Engineering</option>
                    <option value="Cybersecurity">Cybersecurity</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Design & Accessibility">Design & Accessibility</option>
                  </select>
                </div>
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="learner-password" className="block text-xs font-bold text-[#211E1A] mb-1">
                    Password (8+ chars) <span className="text-[#D92D2D]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="learner-password"
                      type={showLearnerPassword ? 'text' : 'password'}
                      value={learnerPassword}
                      onChange={(e) => setLearnerPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] placeholder-[#71675D] focus:outline-none focus:border-[#D92D2D]"
                      required
                    />
                    <span className="absolute left-3 top-3 text-[#71675D] text-xs">🔒</span>
                    <button
                      type="button"
                      onClick={() => setShowLearnerPassword(prev => !prev)}
                      className="absolute right-2.5 top-2.5 text-[11px] text-[#71675D] hover:text-[#211E1A] font-semibold"
                    >
                      {showLearnerPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="learner-confirm" className="block text-xs font-bold text-[#211E1A] mb-1">
                    Confirm Password <span className="text-[#D92D2D]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="learner-confirm"
                      type={showLearnerPassword ? 'text' : 'password'}
                      value={learnerConfirmPassword}
                      onChange={(e) => setLearnerConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] placeholder-[#71675D] focus:outline-none focus:border-[#D92D2D]"
                      required
                    />
                    <span className="absolute left-3 top-3 text-[#71675D] text-xs">✔️</span>
                  </div>
                </div>
              </div>

              {/* Password Strength Bar */}
              {learnerPassword && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-stone-200 rounded-full overflow-hidden flex gap-1">
                    <div className={`h-full flex-1 ${learnerStrength.score >= 1 ? learnerStrength.color : 'bg-transparent'}`} />
                    <div className={`h-full flex-1 ${learnerStrength.score >= 2 ? learnerStrength.color : 'bg-transparent'}`} />
                    <div className={`h-full flex-1 ${learnerStrength.score >= 3 ? learnerStrength.color : 'bg-transparent'}`} />
                  </div>
                  <span className="text-[10px] font-bold text-[#514940]">
                    Strength: {learnerStrength.label}
                  </span>
                </div>
              )}

              {/* Terms Checkbox */}
              <div className="flex items-start gap-2 pt-1">
                <input
                  id="agree-learner"
                  type="checkbox"
                  checked={learnerAgreeTerms}
                  onChange={(e) => setLearnerAgreeTerms(e.target.checked)}
                  className="mt-0.5 rounded text-[#211E1A] focus:ring-[#211E1A] border-[#B6AA9A]"
                  required
                />
                <label htmlFor="agree-learner" className="text-xs text-[#514940] leading-snug select-none">
                  I agree to the LearnSpace <span className="font-bold text-[#211E1A]">Terms of Service</span>, <span className="font-bold text-[#211E1A]">Privacy Policy</span>, and Student Academic Integrity Code.
                </label>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-[#211E1A] hover:bg-black text-white font-extrabold text-sm transition-all shadow-md hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#211E1A] focus-visible:ring-offset-2 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span>Setting Up Student Account...</span>
                ) : (
                  <>
                    <span>Create Student Account</span>
                    <span>→</span>
                  </>
                )}
              </button>

              {/* Quick Demo Pre-fill */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={fillLearnerDemo}
                  className="w-full py-2 px-3 rounded-xl bg-[#EAE3DA] hover:bg-[#D6D0C8] text-[#211E1A] border border-[#B6AA9A] font-bold text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <span>⚡</span>
                  <span>Pre-fill Sample Student Info: Sarah Chen</span>
                </button>
              </div>
            </form>

            <div className="pt-3 border-t border-[#B6AA9A]/50 text-center">
              <p className="text-xs text-[#71675D]">
                Already have an account?{' '}
                <Link to="/login?role=learner" className="font-bold text-[#211E1A] hover:underline">
                  Sign In to Student Portal
                </Link>
              </p>
            </div>
          </div>
        ) : (
          /* ========================================================
             INSTRUCTOR / FACULTY REGISTRATION CARD
             ======================================================== */
          <div className="bg-white border-2 border-[#B6AA9A] rounded-2xl p-6 sm:p-8 shadow-md space-y-6 animate-slide-up">
            <div className="border-b border-[#B6AA9A]/50 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded bg-[#EAE3DA] text-[#D92D2D] border border-[#B6AA9A]">
                  Faculty Onboarding
                </span>
                <span className="text-xs text-[#71675D] font-mono">
                  Role: INSTRUCTOR
                </span>
              </div>
              <h2 className="mt-2 text-xl font-extrabold text-[#211E1A]">
                Join as Faculty & Course Creator
              </h2>
              <p className="mt-1 text-xs text-[#514940] leading-relaxed">
                Design curriculum hierarchies, author interactive coding challenges with automated test cases, and publish certified courses.
              </p>
            </div>

            <form onSubmit={handleInstructorRegister} className="space-y-4">
              {/* Full Name */}
              <div>
                <label htmlFor="inst-name" className="block text-xs font-bold text-[#211E1A] mb-1">
                  Full Name with Academic Title <span className="text-[#D92D2D]">*</span>
                </label>
                <div className="relative">
                  <input
                    id="inst-name"
                    type="text"
                    value={instFullName}
                    onChange={(e) => setInstFullName(e.target.value)}
                    placeholder="Prof. Elena Rostova or Dr. Marcus Vance"
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] placeholder-[#71675D] focus:outline-none focus:border-[#D92D2D] focus:ring-1 focus:ring-[#D92D2D]"
                    required
                  />
                  <span className="absolute left-3 top-3 text-[#71675D] text-xs">👨‍🏫</span>
                </div>
              </div>

              {/* Institutional Email */}
              <div>
                <label htmlFor="inst-reg-email" className="block text-xs font-bold text-[#211E1A] mb-1">
                  Institutional / University Email <span className="text-[#D92D2D]">*</span>
                </label>
                <div className="relative">
                  <input
                    id="inst-reg-email"
                    type="email"
                    value={instEmail}
                    onChange={(e) => setInstEmail(e.target.value)}
                    placeholder="marcus.vance@stanford.edu"
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] placeholder-[#71675D] focus:outline-none focus:border-[#D92D2D] focus:ring-1 focus:ring-[#D92D2D]"
                    required
                  />
                  <span className="absolute left-3 top-3 text-[#71675D] text-xs">✉️</span>
                </div>
              </div>

              {/* Department & Academic Position */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="inst-reg-dept" className="block text-xs font-bold text-[#211E1A] mb-1">
                    Academic Department
                  </label>
                  <input
                    id="inst-reg-dept"
                    type="text"
                    value={instDepartment}
                    onChange={(e) => setInstDepartment(e.target.value)}
                    placeholder="Computer Science & AI"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
                  />
                </div>

                <div>
                  <label htmlFor="inst-reg-title" className="block text-xs font-bold text-[#211E1A] mb-1">
                    Academic Rank / Position
                  </label>
                  <select
                    id="inst-reg-title"
                    value={instTitle}
                    onChange={(e) => setInstTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
                  >
                    <option value="Professor">Full Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="Assistant Professor">Assistant Professor</option>
                    <option value="Distinguished Lecturer">Distinguished Lecturer</option>
                    <option value="Adjunct Faculty">Adjunct Faculty</option>
                    <option value="Industry Fellow">Industry Specialist / Fellow</option>
                  </select>
                </div>
              </div>

              {/* Institution Name */}
              <div>
                <label htmlFor="inst-reg-org" className="block text-xs font-bold text-[#211E1A] mb-1">
                  Affiliated University or Research Institute
                </label>
                <input
                  id="inst-reg-org"
                  type="text"
                  value={instInstitution}
                  onChange={(e) => setInstInstitution(e.target.value)}
                  placeholder="Stanford University / MIT Department of EECS"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
                />
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="inst-reg-pwd" className="block text-xs font-bold text-[#211E1A] mb-1">
                    Faculty Password <span className="text-[#D92D2D]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="inst-reg-pwd"
                      type={showInstPassword ? 'text' : 'password'}
                      value={instPassword}
                      onChange={(e) => setInstPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] placeholder-[#71675D] focus:outline-none focus:border-[#D92D2D]"
                      required
                    />
                    <span className="absolute left-3 top-3 text-[#71675D] text-xs">🔒</span>
                    <button
                      type="button"
                      onClick={() => setShowInstPassword(prev => !prev)}
                      className="absolute right-2.5 top-2.5 text-[11px] text-[#71675D] hover:text-[#211E1A] font-semibold"
                    >
                      {showInstPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="inst-reg-pwd-conf" className="block text-xs font-bold text-[#211E1A] mb-1">
                    Confirm Password <span className="text-[#D92D2D]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="inst-reg-pwd-conf"
                      type={showInstPassword ? 'text' : 'password'}
                      value={instConfirmPassword}
                      onChange={(e) => setInstConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] placeholder-[#71675D] focus:outline-none focus:border-[#D92D2D]"
                      required
                    />
                    <span className="absolute left-3 top-3 text-[#71675D] text-xs">✔️</span>
                  </div>
                </div>
              </div>

              {/* Password Strength Bar */}
              {instPassword && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-stone-200 rounded-full overflow-hidden flex gap-1">
                    <div className={`h-full flex-1 ${instStrength.score >= 1 ? instStrength.color : 'bg-transparent'}`} />
                    <div className={`h-full flex-1 ${instStrength.score >= 2 ? instStrength.color : 'bg-transparent'}`} />
                    <div className={`h-full flex-1 ${instStrength.score >= 3 ? instStrength.color : 'bg-transparent'}`} />
                  </div>
                  <span className="text-[10px] font-bold text-[#514940]">
                    Strength: {instStrength.label}
                  </span>
                </div>
              )}

              {/* Faculty Agreement Checkbox */}
              <div className="flex items-start gap-2 pt-1">
                <input
                  id="agree-faculty"
                  type="checkbox"
                  checked={instAgreeTerms}
                  onChange={(e) => setInstAgreeTerms(e.target.checked)}
                  className="mt-0.5 rounded text-[#D92D2D] focus:ring-[#D92D2D] border-[#B6AA9A]"
                  required
                />
                <label htmlFor="agree-faculty" className="text-xs text-[#514940] leading-snug select-none">
                  I agree to the LearnSpace <span className="font-bold text-[#211E1A]">Faculty Agreement</span>, Curriculum Standards, and Course Moderation Guidelines.
                </label>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-[#D92D2D] hover:bg-[#B91C1C] text-white font-extrabold text-sm transition-all shadow-md hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] focus-visible:ring-offset-2 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span>Submitting Faculty Credentials...</span>
                ) : (
                  <>
                    <span>Apply for Faculty Account</span>
                    <span>→</span>
                  </>
                )}
              </button>

              {/* Quick Demo Pre-fill */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={fillInstructorDemo}
                  className="w-full py-2 px-3 rounded-xl bg-[#EAE3DA] hover:bg-[#D6D0C8] text-[#211E1A] border border-[#B6AA9A] font-bold text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <span>⚡</span>
                  <span>Pre-fill Sample Faculty: Dr. Marcus Vance</span>
                </button>
              </div>
            </form>

            <div className="pt-3 border-t border-[#B6AA9A]/50 text-center">
              <p className="text-xs text-[#71675D]">
                Already registered as faculty?{' '}
                <Link to="/login?role=instructor" className="font-bold text-[#D92D2D] hover:underline">
                  Sign In to Faculty Studio
                </Link>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
