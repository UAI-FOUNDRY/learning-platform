import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { learnerService } from '../../services/learnerService';
import LeaderboardModal from '../../components/learner/LeaderboardModal';
import PracticeTestModal from '../../components/learner/PracticeTestModal';
import StreakBreakdownModal from '../../components/learner/StreakBreakdownModal';

/**
 * Animated Circular Progress Gauge
 */
function CircularProgress({ percent, size = 68, strokeWidth = 7, color = '#D92D2D', bgColor = '#EAE3DA' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={bgColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-xs font-black text-[#211E1A] leading-none">{percent}%</span>
      </div>
    </div>
  );
}

export default function LearnerDashboard() {
  const [profile, setProfile] = useState(() => learnerService.getProfile());
  const [courses, setCourses] = useState(() => learnerService.getEnrolledCourses());
  const [deadlines, setDeadlines] = useState(() => learnerService.getUpcomingDeadlines());

  // Modal triggers
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showPracticeTest, setShowPracticeTest] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);

  // Dashboard interactive state
  const [courseFilter, setCourseFilter] = useState('all'); // 'all', 'in-progress', 'completed'
  const [courseSearch, setCourseSearch] = useState('');
  const [expandedSyllabusId, setExpandedSyllabusId] = useState(null);

  // Daily Micro-Challenge Flashcard state
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [claimedDailyXP, setClaimedDailyXP] = useState(false);

  useEffect(() => {
    return learnerService.subscribe((state) => {
      setProfile(state.profile);
      setCourses(state.enrolledCourses || []);
      setDeadlines(state.assessments || []);
    });
  }, []);

  const continueCourse = courses.find(c => c.progressPercent < 100) || courses[0];
  const completedCourses = courses.filter(c => c.progressPercent >= 100);
  const inProgressCourses = courses.filter(c => c.progressPercent < 100);

  // Filtered courses
  const displayedCourses = courses.filter(c => {
    if (courseFilter === 'in-progress' && c.progressPercent >= 100) return false;
    if (courseFilter === 'completed' && c.progressPercent < 100) return false;
    if (courseSearch.trim()) {
      const q = courseSearch.toLowerCase();
      return c.title.toLowerCase().includes(q) || c.instructor.toLowerCase().includes(q);
    }
    return true;
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const handleSelectOption = (idx) => {
    if (selectedOption !== null) return;
    setSelectedOption(idx);
    setIsCardFlipped(true);
    if (!claimedDailyXP) {
      setClaimedDailyXP(true);
    }
  };

  // Weekly study days activity data
  const weekDays = [
    { day: 'Mon', hours: 1.5, active: true, topic: 'PyTorch Autograd & Tensors' },
    { day: 'Tue', hours: 1.2, active: true, topic: 'CUDA Fused Kernels' },
    { day: 'Wed', hours: 2.0, active: true, topic: 'Kubernetes Ingress & TLS' },
    { day: 'Thu', hours: 1.8, active: true, topic: 'Production Helm Charts' },
    { day: 'Fri', hours: 0, active: false, topic: 'Scheduled for tonight' },
    { day: 'Sat', hours: 0, active: false, topic: 'Weekend lab' },
    { day: 'Sun', hours: 0, active: false, topic: 'Weekend quiz review' }
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in font-sans">
      {/* ========================================================
          HERO BANNER & PERSONALIZED MOTIVATION
         ======================================================== */}
      <section className="bg-gradient-to-br from-[#EAE3DA] via-[#D6D0C8] to-[#C8BBAA] border-2 border-[#B6AA9A] rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        {/* Subtle decorative background circles */}
        <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-[#D92D2D]/5 pointer-events-none" />
        <div className="absolute right-36 -bottom-16 w-64 h-64 rounded-full bg-[#211E1A]/5 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowStreakModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white hover:bg-[#EAE3DA] border border-[#B6AA9A] text-[#211E1A] shadow-2xs transition-all hover:scale-102 cursor-pointer group"
                title="Click to view full streak calendar and multiplier"
              >
                <span className="text-sm group-hover:scale-110 transition-transform">🔥</span>
                <span>{profile?.stats?.streakDays || 12}-Day Study Streak Active</span>
                <span className="text-[#D92D2D] font-extrabold">• 1.2x Multiplier ↗</span>
              </button>

              <button
                type="button"
                onClick={() => setShowLeaderboard(true)}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#211E1A] text-white hover:bg-black transition-all hover:scale-102 shadow-2xs"
              >
                <span>🏆</span>
                <span>Rank #4 Global • {profile?.stats?.totalPoints || 1450} XP</span>
              </button>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-[#211E1A] tracking-tight">
              {getGreeting()}, {profile?.name?.split(' ')[0] || 'Sarah'}! 👋
            </h1>

            <p className="text-xs sm:text-sm text-[#514940] leading-relaxed">
              You've completed <span className="font-bold text-[#211E1A]">{profile?.learningGoal?.completedHoursThisWeek || 6.5} hours</span> of focused study this week. You're only 1.5 hours away from hitting your weekly milestone.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {continueCourse && (
              <Link
                to={`/learner/player/${continueCourse.id}`}
                className="px-5 py-3 rounded-xl bg-[#211E1A] hover:bg-black text-white font-extrabold text-xs sm:text-sm transition-all hover:scale-102 shadow-md flex items-center gap-2 group"
              >
                <span>Resume: {continueCourse.title.slice(0, 22)}...</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => setShowPracticeTest(true)}
              className="px-4 py-3 rounded-xl bg-white hover:bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] font-extrabold text-xs sm:text-sm transition-all shadow-2xs flex items-center gap-1.5 hover:scale-102"
            >
              <span>⚡</span>
              <span>Adaptive Practice</span>
            </button>

            <Link
              to="/courses"
              className="px-4 py-3 rounded-xl bg-white/80 hover:bg-white text-[#211E1A] border border-[#B6AA9A] font-extrabold text-xs sm:text-sm transition-colors shadow-2xs"
            >
              Catalog
            </Link>
          </div>
        </div>

        {/* Weekly Goal Progress Bar inside banner */}
        <div className="mt-6 pt-5 border-t border-[#B6AA9A]/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-bold text-[#211E1A]">
            <span>Weekly Target:</span>
            <span className="text-[#514940]">
              {profile?.learningGoal?.completedHoursThisWeek || 6.5}h / {profile?.learningGoal?.weeklyTargetHours || 8}h
            </span>
          </div>

          <div className="w-full sm:w-72 bg-white/80 h-3 rounded-full overflow-hidden border border-[#B6AA9A] p-0.5">
            <div
              className="bg-[#D92D2D] h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${Math.min(100, Math.round(((profile?.learningGoal?.completedHoursThisWeek || 6.5) / (profile?.learningGoal?.weeklyTargetHours || 8)) * 100))}%`
              }}
            />
          </div>

          <span className="text-[11px] font-black text-[#D92D2D] bg-white px-2 py-0.5 rounded-full border border-[#B6AA9A]/50">
            {Math.round(((profile?.learningGoal?.completedHoursThisWeek || 6.5) / (profile?.learningGoal?.weeklyTargetHours || 8)) * 100)}% Reached
          </span>
        </div>
      </section>

      {/* ========================================================
          KEY METRICS / STATS PIPELINE WITH ANIMATED GAUGES
         ======================================================== */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white border-2 border-[#B6AA9A] rounded-2xl p-4 sm:p-5 shadow-2xs hover-scale-card transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#71675D] uppercase tracking-wider">Enrolled Courses</span>
            <span className="p-2 rounded-xl bg-[#EAE3DA] text-[#211E1A] text-sm font-bold">📚</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-2xl sm:text-3xl font-black text-[#211E1A]">
              {courses.length}
            </p>
            <span className="text-[11px] font-extrabold text-[#D92D2D] bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
              {inProgressCourses.length} In Progress
            </span>
          </div>
          <p className="mt-2 text-[11px] font-semibold text-[#514940]">
            Stanford & UC Berkeley Curricula
          </p>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border-2 border-[#B6AA9A] rounded-2xl p-4 sm:p-5 shadow-2xs hover-scale-card transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#71675D] uppercase tracking-wider">Completed</span>
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800 text-sm font-bold">🏆</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-2xl sm:text-3xl font-black text-emerald-700">
              {completedCourses.length}
            </p>
            <Link
              to="/learner/certificates"
              className="text-[10px] font-bold text-emerald-800 hover:underline"
            >
              View Badges →
            </Link>
          </div>
          <p className="mt-2 text-[11px] font-semibold text-[#514940]">
            Verifiable digital credentials
          </p>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border-2 border-[#B6AA9A] rounded-2xl p-4 sm:p-5 shadow-2xs hover-scale-card transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#71675D] uppercase tracking-wider">Learning Time</span>
            <span className="p-2 rounded-xl bg-orange-100 text-orange-800 text-sm font-bold">⏱️</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-2xl sm:text-3xl font-black text-[#211E1A]">
              {profile?.stats?.hoursLearned || 48.5}<span className="text-base font-normal text-[#71675D]">h</span>
            </p>
            <span className="text-[10px] font-bold text-orange-800 bg-orange-50 px-2 py-0.5 rounded-full">
              +4.5h this wk
            </span>
          </div>
          <p className="mt-2 text-[11px] font-semibold text-[#514940]">
            Lectures, labs & coding runs
          </p>
        </div>

        {/* Metric 4 */}
        <div
          className="bg-white border-2 border-[#B6AA9A] rounded-2xl p-4 sm:p-5 shadow-2xs hover-scale-card transition-all cursor-pointer group"
          onClick={() => setShowLeaderboard(true)}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#71675D] uppercase tracking-wider">Mastery XP</span>
            <span className="p-2 rounded-xl bg-red-100 text-[#D92D2D] text-sm font-bold group-hover:scale-110 transition-transform">⭐</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-2xl sm:text-3xl font-black text-[#D92D2D]">
              {profile?.stats?.totalPoints || 1450}
            </p>
            <span className="text-[10px] font-bold text-[#D92D2D] group-hover:translate-x-0.5 transition-transform">
              Ranks #4 ↗
            </span>
          </div>
          <p className="mt-2 text-[11px] font-semibold text-[#514940]">
            {profile?.stats?.rankTitle || 'Advanced Scholar'} tier
          </p>
        </div>
      </section>

      {/* ========================================================
          DAILY MICRO-CHALLENGE / CONCEPT FLASHCARD (INTERACTIVE)
         ======================================================== */}
      <section className="bg-white border-2 border-[#B6AA9A] rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#B6AA9A]/50 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <h2 className="text-sm font-black uppercase tracking-wider text-[#211E1A] flex items-center gap-2">
              <span>⚡ Daily Concept Check</span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                +15 XP Reward
              </span>
            </h2>
          </div>
          <span className="text-xs text-[#71675D]">
            Interactive daily retention quiz • Flip card to test mastery
          </span>
        </div>

        <div className="bg-[#EAE3DA]/50 border border-[#B6AA9A] rounded-2xl p-5 relative overflow-hidden">
          {!isCardFlipped ? (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-[#D92D2D] tracking-wider">
                    PyTorch Systems Architecture
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-[#211E1A] mt-1">
                    Why does PyTorch's <code className="bg-white px-1.5 py-0.5 rounded border border-[#B6AA9A] font-mono text-xs text-[#D92D2D]">optimizer.zero_grad()</code> need to be called before <code className="bg-white px-1.5 py-0.5 rounded border border-[#B6AA9A] font-mono text-xs">loss.backward()</code>?
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCardFlipped(true)}
                  className="px-3 py-1.5 bg-white hover:bg-[#EAE3DA] border border-[#B6AA9A] rounded-xl text-xs font-bold text-[#211E1A] shrink-0"
                >
                  Reveal Hint 💡
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {[
                  { id: 0, text: 'A) To reset dynamic learning rate schedules' },
                  { id: 1, text: 'B) Because gradients accumulate in buffers by default', correct: true },
                  { id: 2, text: 'C) To flush intermediate activations from GPU VRAM' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectOption(opt.id)}
                    className="p-3 text-left bg-white hover:bg-[#EAE3DA] border-2 border-[#B6AA9A] hover:border-[#D92D2D] rounded-xl text-xs font-bold text-[#211E1A] transition-all hover:scale-101 shadow-2xs flex items-center justify-between"
                  >
                    <span>{opt.text}</span>
                    <span className="text-stone-400">→</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3 animate-scale-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎉</span>
                  <div>
                    <h4 className="text-sm font-black text-emerald-800">
                      {selectedOption === 1 ? 'Correct! Excellent Retention' : 'Concept Explanation'}
                    </h4>
                    <p className="text-xs text-[#514940]">
                      In PyTorch, <code className="font-mono text-xs">loss.backward()</code> accumulates (adds) gradients to existing <code className="font-mono text-xs">.grad</code> tensors rather than overwriting them. Calling <code className="font-mono text-xs">zero_grad()</code> resets them to avoid gradient pollution across mini-batches.
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                    +15 XP Earned!
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsCardFlipped(false);
                    setSelectedOption(null);
                  }}
                  className="px-3 py-1.5 bg-white border border-[#B6AA9A] rounded-xl text-xs font-bold text-[#211E1A] hover:bg-[#EAE3DA]"
                >
                  Reset Challenge ↺
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================
          CONTINUE LEARNING SPOTLIGHT CARD WITH CIRCULAR GAUGE
         ======================================================== */}
      {continueCourse && (
        <section className="bg-white border-2 border-[#B6AA9A] rounded-3xl p-6 shadow-sm space-y-4 hover-lift transition-all">
          <div className="flex items-center justify-between border-b border-[#B6AA9A]/50 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D92D2D] animate-ping" />
              <h2 className="text-sm font-black uppercase tracking-wider text-[#211E1A]">
                Jump Right Back In
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setExpandedSyllabusId(expandedSyllabusId === continueCourse.id ? null : continueCourse.id)}
                className="text-xs font-bold text-[#514940] hover:text-[#211E1A] hidden sm:inline"
              >
                {expandedSyllabusId === continueCourse.id ? 'Hide Syllabus ▲' : 'View Syllabus ▼'}
              </button>
              <Link
                to="/learner/my-learning"
                className="text-xs font-bold text-[#D92D2D] hover:underline"
              >
                All Enrolled Courses →
              </Link>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-full md:w-56 h-36 rounded-2xl overflow-hidden bg-[#C8BBAA] border border-[#B6AA9A] shrink-0 relative group">
              <img
                src={continueCourse.thumbnail}
                alt={continueCourse.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <Link
                  to={`/learner/player/${continueCourse.id}`}
                  className="w-12 h-12 rounded-full bg-white/95 text-[#211E1A] flex items-center justify-center shadow-lg hover:scale-110 transition-transform pl-1"
                  aria-label="Play lecture"
                >
                  ▶
                </Link>
              </div>
            </div>

            <div className="flex-1 space-y-2.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A]">
                  {continueCourse.category}
                </span>
                <span className="text-xs text-[#71675D]">
                  by {continueCourse.instructor}
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-black text-[#211E1A] truncate">
                {continueCourse.title}
              </h3>

              <p className="text-xs text-[#514940] line-clamp-1">
                Next Up: <span className="font-bold text-[#211E1A]">{continueCourse.lastLessonTitle || 'Next lecture in curriculum'}</span>
              </p>

              {/* Progress bar */}
              <div className="pt-1 space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-[#514940]">Curriculum Completed</span>
                  <span className="text-[#D92D2D] font-black">{continueCourse.progressPercent}%</span>
                </div>
                <div className="w-full bg-[#EAE3DA] h-2.5 rounded-full overflow-hidden border border-[#B6AA9A]/50">
                  <div
                    className="bg-[#D92D2D] h-full rounded-full transition-all duration-700"
                    style={{ width: `${continueCourse.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Circular Progress Gauge & CTA */}
            <div className="shrink-0 flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-[#B6AA9A]/40">
              <CircularProgress percent={continueCourse.progressPercent} />

              <Link
                to={`/learner/player/${continueCourse.id}`}
                className="px-6 py-3 bg-[#D92D2D] hover:bg-[#B91C1C] text-white rounded-xl text-xs sm:text-sm font-extrabold transition-all shadow-md hover:scale-102 flex items-center gap-2"
              >
                <span>Resume Lecture</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Expandable Syllabus Drawer inside Spotlight */}
          {expandedSyllabusId === continueCourse.id && (
            <div className="mt-4 pt-4 border-t border-[#B6AA9A]/50 space-y-2 animate-slide-down">
              <h4 className="text-xs font-extrabold text-[#211E1A]">Curriculum Syllabus Overview:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(continueCourse.modules || []).flatMap(m => m.lessons || []).map((les, i) => (
                  <Link
                    key={les.id || i}
                    to={`/learner/player/${continueCourse.id}`}
                    className="p-2.5 rounded-xl bg-[#EAE3DA]/60 hover:bg-[#EAE3DA] border border-[#B6AA9A] text-xs flex items-center justify-between transition-colors"
                  >
                    <span className="truncate pr-2 font-semibold text-[#211E1A]">
                      {i + 1}. {les.title}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${les.completed ? 'bg-emerald-100 text-emerald-800' : 'bg-white text-stone-600'}`}>
                      {les.completed ? '✓ Done' : les.duration || '15m'}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ========================================================
          TWO-COLUMN LAYOUT: ENROLLED CURRICULUM + DEADLINES
         ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left Column: My Courses & Weekly Activity (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Enrolled Courses Filter & Grid */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-[#211E1A]">Enrolled Curriculum</h2>
                <p className="text-xs text-[#514940]">Your active university courses and faculties</p>
              </div>

              {/* Quick Filter Tabs */}
              <div className="flex items-center gap-1 bg-[#EAE3DA] p-1 rounded-xl border border-[#B6AA9A] text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCourseFilter('all')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    courseFilter === 'all'
                      ? 'bg-white text-[#211E1A] shadow-2xs'
                      : 'text-[#514940] hover:text-[#211E1A]'
                  }`}
                >
                  All ({courses.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCourseFilter('in-progress')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    courseFilter === 'in-progress'
                      ? 'bg-white text-[#D92D2D] shadow-2xs'
                      : 'text-[#514940] hover:text-[#211E1A]'
                  }`}
                >
                  Active ({inProgressCourses.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCourseFilter('completed')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    courseFilter === 'completed'
                      ? 'bg-white text-emerald-800 shadow-2xs'
                      : 'text-[#514940] hover:text-[#211E1A]'
                  }`}
                >
                  Done ({completedCourses.length})
                </button>
              </div>
            </div>

            {/* Courses Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {displayedCourses.map((course) => (
                <div
                  key={course.id}
                  className="bg-white border-2 border-[#B6AA9A] rounded-2xl overflow-hidden shadow-2xs hover-scale-card flex flex-col justify-between transition-all"
                >
                  <div className="h-32 bg-[#C8BBAA] relative overflow-hidden group">
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2.5 left-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#EAE3DA]/90 text-[#211E1A] border border-[#B6AA9A] backdrop-blur-xs">
                        {course.category}
                      </span>
                    </div>
                    <div className="absolute bottom-2.5 right-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shadow-xs ${
                        course.progressPercent >= 100
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#211E1A]/85 text-white'
                      }`}>
                        {course.progressPercent}% Complete
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-extrabold text-sm text-[#211E1A] line-clamp-1">
                        {course.title}
                      </h3>
                      <p className="text-[11px] text-[#71675D] mt-0.5">
                        {course.instructor}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="w-full bg-[#EAE3DA] h-1.5 rounded-full overflow-hidden border border-[#B6AA9A]/50">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            course.progressPercent >= 100 ? 'bg-emerald-600' : 'bg-[#D92D2D]'
                          }`}
                          style={{ width: `${course.progressPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-[#71675D] font-semibold">
                        <span>{course.completedLessonsCount || 0} / {course.totalLessons || 6} lectures</span>
                        <span>{course.level}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#B6AA9A]/40 flex items-center justify-between">
                      <Link
                        to={`/learner/player/${course.id}`}
                        className="text-xs font-black text-[#D92D2D] hover:underline flex items-center gap-1"
                      >
                        <span>{course.progressPercent >= 100 ? 'Review Lectures' : 'Continue Player'}</span>
                        <span>→</span>
                      </Link>

                      {course.progressPercent >= 100 ? (
                        <Link
                          to="/learner/certificates"
                          className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded text-[10px] font-bold"
                        >
                          Certificate 🏆
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setExpandedSyllabusId(expandedSyllabusId === course.id ? null : course.id)}
                          className="text-[10px] font-bold text-[#514940] hover:text-[#211E1A]"
                        >
                          {expandedSyllabusId === course.id ? 'Hide ▲' : 'Syllabus ▼'}
                        </button>
                      )}
                    </div>

                    {/* Accordion inside card */}
                    {expandedSyllabusId === course.id && (
                      <div className="pt-2 border-t border-[#B6AA9A]/30 space-y-1.5 animate-slide-down">
                        {(course.modules || []).flatMap(m => m.lessons || []).slice(0, 4).map((les, idx) => (
                          <Link
                            key={les.id || idx}
                            to={`/learner/player/${course.id}`}
                            className="block text-[11px] text-[#514940] hover:text-[#211E1A] truncate"
                          >
                            • {les.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Activity Grid (PROJECT.md §23 & §24) */}
          <div className="bg-white border-2 border-[#B6AA9A] rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#B6AA9A]/50 pb-2">
              <h3 className="text-sm font-black text-[#211E1A] flex items-center gap-2">
                <span>📊</span>
                <span>Weekly Study Activity Rhythm</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowStreakModal(true)}
                className="text-[10px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-0.5 rounded-full transition-colors cursor-pointer"
              >
                Streak Calendar ↗
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center pt-1">
              {weekDays.map((d, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-xl border border-[#B6AA9A]/60 bg-[#EAE3DA]/40 space-y-1 hover:bg-[#EAE3DA] transition-colors group relative"
                  title={`${d.day}: ${d.hours}h (${d.topic})`}
                >
                  <span className="text-[11px] font-bold text-[#71675D] block">{d.day}</span>
                  <div className={`w-7 h-7 rounded-lg mx-auto flex items-center justify-center text-[10px] font-black transition-transform group-hover:scale-110 ${
                    d.active ? 'bg-[#D92D2D] text-white shadow-2xs' : 'bg-stone-200 text-stone-400'
                  }`}>
                    {d.active ? '✓' : '—'}
                  </div>
                  <span className="text-[9px] font-mono text-[#514940] block">{d.hours}h</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Upcoming Assessments & Achievements (1 col) */}
        <div className="space-y-6">
          {/* Upcoming Assessments */}
          <div className="bg-white border-2 border-[#B6AA9A] rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#B6AA9A]/50 pb-2">
              <h3 className="font-black text-sm text-[#211E1A] flex items-center gap-1.5">
                <span>🎯</span>
                <span>Upcoming Deadlines</span>
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A]">
                {deadlines.length} Due Soon
              </span>
            </div>

            <div className="space-y-3">
              {deadlines.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-[#EAE3DA]/60 border border-[#B6AA9A] rounded-xl space-y-2 hover:bg-[#EAE3DA] transition-all hover:scale-101 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[#211E1A] text-white">
                      {item.type}
                    </span>
                    <span className="text-[10px] font-bold text-[#D92D2D]">
                      {item.daysLeft} days remaining
                    </span>
                  </div>

                  <h4 className="text-xs font-black text-[#211E1A] line-clamp-1">
                    {item.title}
                  </h4>

                  <p className="text-[11px] text-[#71675D] line-clamp-1">
                    {item.courseTitle}
                  </p>

                  <div className="pt-1 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[#514940]">{item.points} pts</span>
                    {item.type === 'Assignment' ? (
                      <Link
                        to={`/learner/assignment/${item.id}`}
                        className="font-bold text-[#D92D2D] hover:underline"
                      >
                        Open Brief →
                      </Link>
                    ) : (
                      <Link
                        to={`/learner/quiz/${item.id}`}
                        className="font-bold text-[#D92D2D] hover:underline"
                      >
                        Start Challenge →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gamification Achievements & Leaderboard Jump */}
          <div className="bg-white border-2 border-[#B6AA9A] rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#B6AA9A]/50 pb-2">
              <h3 className="font-black text-sm text-[#211E1A] flex items-center gap-1.5">
                <span>🏅</span>
                <span>Recent Badges</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowLeaderboard(true)}
                className="text-xs font-bold text-[#D92D2D] hover:underline"
              >
                Leaderboard 🏆
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {(profile?.badges || []).slice(0, 4).map((badge) => (
                <div
                  key={badge.id}
                  className={`p-2.5 rounded-xl border text-center transition-all hover:scale-102 ${
                    badge.unlocked
                      ? 'bg-[#EAE3DA] border-[#B6AA9A] shadow-2xs'
                      : 'bg-stone-100 border-stone-200 opacity-50'
                  }`}
                >
                  <div className="text-2xl mb-1">{badge.icon}</div>
                  <h4 className="text-[11px] font-bold text-[#211E1A] truncate">{badge.title}</h4>
                  <p className="text-[9px] text-[#71675D] line-clamp-1">{badge.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <LeaderboardModal
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
      />

      <PracticeTestModal
        isOpen={showPracticeTest}
        onClose={() => setShowPracticeTest(false)}
      />

      <StreakBreakdownModal
        isOpen={showStreakModal}
        onClose={() => setShowStreakModal(false)}
        streakDays={profile?.stats?.streakDays || 12}
      />
    </div>
  );
}
