import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { learnerService } from '../../services/learnerService';
import LeaderboardModal from '../../components/learner/LeaderboardModal';
import PracticeTestModal from '../../components/learner/PracticeTestModal';
import AIAssistantDrawer from '../../components/learner/AIAssistantDrawer';

export default function LearnerDashboard() {
  const [profile, setProfile] = useState(() => learnerService.getProfile());
  const [courses, setCourses] = useState(() => learnerService.getEnrolledCourses());
  const [deadlines, setDeadlines] = useState(() => learnerService.getUpcomingDeadlines());

  // Modal triggers
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showPracticeTest, setShowPracticeTest] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  useEffect(() => {
    return learnerService.subscribe((state) => {
      setProfile(state.profile);
      setCourses(state.enrolledCourses || []);
      setDeadlines(state.assessments || []);
    });
  }, []);

  const continueCourse = courses.find(c => c.progressPercent < 100) || courses[0];
  const completedCourses = courses.filter(c => c.progressPercent >= 100);

  // Weekly study days activity data
  const weekDays = [
    { day: 'Mon', hours: 1.5, active: true },
    { day: 'Tue', hours: 1.2, active: true },
    { day: 'Wed', hours: 2.0, active: true },
    { day: 'Thu', hours: 1.8, active: true },
    { day: 'Fri', hours: 0, active: false },
    { day: 'Sat', hours: 0, active: false },
    { day: 'Sun', hours: 0, active: false }
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in font-sans">
      {/* ========================================================
          HERO BANNER & PERSONALIZED MOTIVATION
         ======================================================== */}
      <section className="bg-gradient-to-br from-[#EAE3DA] to-[#C8BBAA] border-2 border-[#B6AA9A] rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-[#D92D2D]/5 pointer-events-none" />
        <div className="absolute right-32 -bottom-16 w-64 h-64 rounded-full bg-[#211E1A]/5 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/80 border border-[#B6AA9A] text-[#211E1A] shadow-2xs">
                <span className="text-sm">🔥</span>
                <span>{profile?.stats?.streakDays || 12}-Day Study Streak Active</span>
                <span className="text-[#D92D2D] font-extrabold">• Keep it up!</span>
              </span>

              <button
                type="button"
                onClick={() => setShowLeaderboard(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#211E1A] text-white hover:bg-black transition-colors shadow-2xs"
              >
                <span>🏆</span>
                <span>Rank #4 Global</span>
              </button>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-[#211E1A] tracking-tight">
              Welcome back, {profile?.name?.split(' ')[0] || 'Sarah'}! 👋
            </h1>

            <p className="text-xs sm:text-sm text-[#514940] leading-relaxed">
              You've completed <span className="font-bold text-[#211E1A]">{profile?.learningGoal?.completedHoursThisWeek || 6.5} hours</span> of study this week. You're only 1.5 hours away from hitting your weekly target.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {continueCourse && (
              <Link
                to={`/learner/player/${continueCourse.id}`}
                className="px-5 py-3 rounded-xl bg-[#211E1A] hover:bg-black text-white font-extrabold text-xs sm:text-sm transition-all hover:scale-102 shadow-md flex items-center gap-2"
              >
                <span>Resume: {continueCourse.title.slice(0, 24)}...</span>
                <span>→</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => setShowAIAssistant(true)}
              className="px-4 py-3 rounded-xl bg-[#D92D2D]/15 hover:bg-[#D92D2D]/25 text-[#D92D2D] border border-[#D92D2D]/60 font-extrabold text-xs sm:text-sm transition-all shadow-2xs flex items-center gap-1.5"
            >
              <span>🤖</span>
              <span>AI Scholar</span>
            </button>

            <Link
              to="/courses"
              className="px-4 py-3 rounded-xl bg-white hover:bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] font-extrabold text-xs sm:text-sm transition-colors shadow-2xs"
            >
              Explore Catalog
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

          <div className="w-full sm:w-64 bg-white/70 h-2.5 rounded-full overflow-hidden border border-[#B6AA9A]">
            <div
              className="bg-[#D92D2D] h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, Math.round(((profile?.learningGoal?.completedHoursThisWeek || 6.5) / (profile?.learningGoal?.weeklyTargetHours || 8)) * 100))}%`
              }}
            />
          </div>

          <span className="text-[11px] font-bold text-[#D92D2D]">
            {Math.round(((profile?.learningGoal?.completedHoursThisWeek || 6.5) / (profile?.learningGoal?.weeklyTargetHours || 8)) * 100)}% Reached
          </span>
        </div>
      </section>

      {/* ========================================================
          KEY METRICS / STATS PIPELINE
         ======================================================== */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white border-2 border-[#B6AA9A] rounded-2xl p-4 sm:p-5 shadow-2xs hover-lift transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#71675D] uppercase tracking-wider">Enrolled Courses</span>
            <span className="p-2 rounded-xl bg-[#EAE3DA] text-[#211E1A] text-sm font-bold">📚</span>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-black text-[#211E1A]">
            {courses.length}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-[#514940]">
            {courses.filter(c => c.progressPercent < 100).length} in progress
          </p>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border-2 border-[#B6AA9A] rounded-2xl p-4 sm:p-5 shadow-2xs hover-lift transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#71675D] uppercase tracking-wider">Completed</span>
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800 text-sm font-bold">🏆</span>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-black text-emerald-700">
            {completedCourses.length}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-[#514940]">
            With certified credentials
          </p>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border-2 border-[#B6AA9A] rounded-2xl p-4 sm:p-5 shadow-2xs hover-lift transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#71675D] uppercase tracking-wider">Learning Time</span>
            <span className="p-2 rounded-xl bg-orange-100 text-orange-800 text-sm font-bold">⏱️</span>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-black text-[#211E1A]">
            {profile?.stats?.hoursLearned || 48.5}<span className="text-base font-normal text-[#71675D]">h</span>
          </p>
          <p className="mt-1 text-[11px] font-semibold text-[#514940]">
            Across lectures & coding
          </p>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border-2 border-[#B6AA9A] rounded-2xl p-4 sm:p-5 shadow-2xs hover-lift transition-all cursor-pointer" onClick={() => setShowLeaderboard(true)}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#71675D] uppercase tracking-wider">Mastery XP</span>
            <span className="p-2 rounded-xl bg-red-100 text-[#D92D2D] text-sm font-bold">⭐</span>
          </div>
          <p className="mt-3 text-2xl sm:text-3xl font-black text-[#D92D2D]">
            {profile?.stats?.totalPoints || 1450}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-[#514940] flex items-center justify-between">
            <span>{profile?.stats?.rankTitle || 'Advanced Scholar'}</span>
            <span className="text-[#D92D2D] font-bold">Ranks →</span>
          </p>
        </div>
      </section>

      {/* ========================================================
          CONTINUE LEARNING SPOTLIGHT CARD
         ======================================================== */}
      {continueCourse && (
        <section className="bg-white border-2 border-[#B6AA9A] rounded-3xl p-6 shadow-sm space-y-4">
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
                onClick={() => setShowPracticeTest(true)}
                className="text-xs font-bold text-[#514940] hover:text-[#211E1A] hidden sm:inline"
              >
                🎯 Adaptive Diagnostic
              </button>
              <Link
                to="/learner/my-learning"
                className="text-xs font-bold text-[#D92D2D] hover:underline"
              >
                View All Enrolled Courses →
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
                  className="w-12 h-12 rounded-full bg-white/90 text-[#211E1A] flex items-center justify-center shadow-lg hover:scale-110 transition-transform pl-1"
                  aria-label="Play lecture"
                >
                  ▶
                </Link>
              </div>
            </div>

            <div className="flex-1 space-y-2 min-w-0">
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
                Current Lecture: <span className="font-bold text-[#211E1A]">{continueCourse.lastLessonTitle || 'Next up in curriculum'}</span>
              </p>

              {/* Progress bar */}
              <div className="pt-2 space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-[#514940]">Overall Progress</span>
                  <span className="text-[#D92D2D] font-black">{continueCourse.progressPercent}%</span>
                </div>
                <div className="w-full bg-[#EAE3DA] h-2 rounded-full overflow-hidden border border-[#B6AA9A]/50">
                  <div
                    className="bg-[#D92D2D] h-full rounded-full transition-all duration-500"
                    style={{ width: `${continueCourse.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="shrink-0 w-full md:w-auto">
              <Link
                to={`/learner/player/${continueCourse.id}`}
                className="w-full md:w-auto px-6 py-3 bg-[#D92D2D] hover:bg-[#B91C1C] text-white rounded-xl text-xs sm:text-sm font-extrabold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <span>Resume Player</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================
          TWO-COLUMN LAYOUT: IN-PROGRESS COURSES + DEADLINES
         ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left Column: My Courses & Weekly Activity (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Enrolled Courses Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-[#211E1A]">Enrolled Curriculum</h2>
                <p className="text-xs text-[#514940]">Your active university & faculty courses</p>
              </div>
              <Link
                to="/learner/my-learning"
                className="text-xs font-bold text-[#D92D2D] hover:underline"
              >
                All Courses ({courses.length})
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="bg-white border-2 border-[#B6AA9A] rounded-2xl overflow-hidden shadow-2xs hover-lift flex flex-col justify-between"
                >
                  <div className="h-32 bg-[#C8BBAA] relative overflow-hidden">
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover"
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
                        <span>{course.completedLessonsCount || 0} / {course.totalLessons || 6} lessons</span>
                        <span>{course.level}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#B6AA9A]/40 flex items-center justify-between">
                      <Link
                        to={`/learner/player/${course.id}`}
                        className="text-xs font-black text-[#D92D2D] hover:underline flex items-center gap-1"
                      >
                        <span>{course.progressPercent >= 100 ? 'Review Course' : 'Continue'}</span>
                        <span>→</span>
                      </Link>

                      {course.progressPercent >= 100 && (
                        <Link
                          to="/learner/certificates"
                          className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded text-[10px] font-bold"
                        >
                          Certificate 🏆
                        </Link>
                      )}
                    </div>
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
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                Streak Maintained
              </span>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center pt-1">
              {weekDays.map((d, i) => (
                <div key={i} className="p-2.5 rounded-xl border border-[#B6AA9A]/60 bg-[#EAE3DA]/40 space-y-1">
                  <span className="text-[11px] font-bold text-[#71675D] block">{d.day}</span>
                  <div className={`w-6 h-6 rounded-lg mx-auto flex items-center justify-center text-[10px] font-black ${
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
                  className="p-3 bg-[#EAE3DA]/60 border border-[#B6AA9A] rounded-xl space-y-2 hover:bg-[#EAE3DA] transition-colors"
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
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    badge.unlocked
                      ? 'bg-[#EAE3DA] border-[#B6AA9A]'
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

      <AIAssistantDrawer
        isOpen={showAIAssistant}
        onClose={() => setShowAIAssistant(false)}
        contextLesson={{ title: 'Deep Learning with PyTorch 2.0' }}
      />
    </div>
  );
}
