import React from 'react';
import { Link } from 'react-router-dom';
import HeroIllustration from '../../components/home/HeroIllustration';
import CourseSearchSection from '../../components/home/CourseSearchSection';
import { Reveal } from '../../hooks/useReveal';

export default function Home() {
  return (
    <div className="w-full bg-mocha text-brown-soft">
      {/* ============================================================== */}
      {/* 1. HERO SECTION (Mocha Cream #E8DCC6, Balanced Proportions)    */}
      {/* ============================================================== */}
      <section
        id="hero"
        aria-label="Welcome to LearnSpace"
        className="relative overflow-hidden pt-8 pb-10 sm:pt-12 sm:pb-14 lg:pt-14 lg:pb-16 min-h-[auto] lg:min-h-[580px] xl:min-h-[640px] flex flex-col justify-center bg-mocha"
      >
        {/* Creative Ambient Background: Flowing Learning Path & Subtle Educational Accents */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none" aria-hidden="true">
          {/* Soft ambient aura behind right column */}
          <div className="absolute top-1/2 right-[8%] -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-cosmic/15 blur-3xl" />
          
          {/* Animated dashed curved learning journey weaving across the background */}
          <svg className="absolute top-10 left-0 w-full h-[90%] opacity-30" viewBox="0 0 1200 600" fill="none">
            <path
              d="M 80 200 C 260 90, 440 340, 680 180 S 1040 260, 1160 140"
              stroke="#722F37"
              strokeWidth="2.5"
              strokeDasharray="6 8"
              className="animate-dash-flow"
            />
            {/* Learning checkpoint nodes along the curve */}
            <circle cx="260" cy="120" r="4.5" fill="#722F37" className="animate-pulse-subtle" />
            <circle cx="680" cy="180" r="5.5" fill="#722F37" />
            <circle cx="940" cy="225" r="4" fill="#B7A89A" />
          </svg>

          {/* Elegant geometric grid pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(#B7A89A_1px,transparent_1px)] [background-size:24px_24px] opacity-20" />
        </div>

        <div className="max-w-[1200px] mx-auto px-6 w-full relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column (Balanced 50/50 on lg): Confident, vertically centered headline */}
            <div className="lg:col-span-6 text-center lg:text-left">
              {/* Category / Platform Tag with Creative Hero Entrance */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-4 sm:mb-5">
                <div className="animate-hero-1 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-cosmic/25 text-burgundy border border-cosmic shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-burgundy animate-pulse-subtle" />
                  <span>Open Learning Platform</span>
                </div>
                
                <span className="animate-hero-1 hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-mocha-surface border border-cosmic shadow-xs text-burgundy">
                  <span>🎓 6+ Guided Paths</span>
                </span>
              </div>

              {/* Headline - tight leading, Deep Burgundy underline with staggered entrance */}
              <h1 className="animate-hero-2 font-serif font-bold text-[clamp(2.25rem,4.4vw,4.1rem)] text-burgundy tracking-tight leading-[1.08] text-balance">
                Learn Something New.{' '}
                <span className="block mt-1 sm:mt-2 italic font-normal text-burgundy">
                  Build Something{' '}
                  <span className="relative inline-block not-italic font-bold text-burgundy">
                    Real.
                    {/* Deep Burgundy Hand-drawn SVG underline under ONE word: "Real." */}
                    <svg
                      className="absolute -bottom-2 sm:-bottom-2.5 left-0 w-full overflow-visible"
                      height="10"
                      viewBox="0 0 120 10"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        d="M3 7C35 2 85 2 117 6.5"
                        stroke="#722F37"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </span>
              </h1>

              {/* Plain, specific description */}
              <p className="animate-hero-3 mt-4 sm:mt-5 text-base sm:text-lg text-brown-soft max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Explore courses, practise with real exercises, and track your progress—all in one place.
              </p>

              {/* CTA Buttons */}
              <div className="animate-hero-4 mt-6 sm:mt-7 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link
                  to="/register"
                  className="btn-primary w-full sm:w-auto"
                >
                  Start Learning
                </Link>
                <Link
                  to="/courses"
                  className="btn-secondary w-full sm:w-auto"
                >
                  Explore Courses
                </Link>
              </div>

              {/* Verified Learning Benefits Indicators */}
              <div className="animate-hero-4 mt-4 flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-1.5 text-xs text-brown-soft/85 font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-burgundy font-bold">✓</span> Zero setup required
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-burgundy font-bold">✓</span> In-browser code exercises
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-burgundy font-bold">✓</span> Self-paced progress
                </span>
              </div>

              {/* 3 Colourful Feature Chips */}
              <div className="animate-hero-5 mt-6 sm:mt-7 pt-5 sm:pt-6 border-t border-cosmic/70 flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4 text-xs text-burgundy font-medium">
                {/* Chip 1: Video Lessons */}
                <div className="inline-flex items-center gap-2 bg-mocha-surface px-3 py-1.5 rounded-full border border-cosmic shadow-warm-sm hover:-translate-y-0.5 transition-transform duration-200">
                  <span className="w-5 h-5 rounded-full bg-mocha text-burgundy flex items-center justify-center shrink-0 border border-cosmic/50">
                    <svg className="w-3 h-3 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    </svg>
                  </span>
                  <span>Modular video lessons</span>
                </div>

                {/* Chip 2: Coding Practice */}
                <div className="inline-flex items-center gap-2 bg-mocha-surface px-3 py-1.5 rounded-full border border-cosmic shadow-warm-sm hover:-translate-y-0.5 transition-transform duration-200">
                  <span className="w-5 h-5 rounded-full bg-mocha text-burgundy flex items-center justify-center shrink-0 border border-cosmic/50">
                    <svg className="w-3 h-3 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </span>
                  <span>Practical code tasks</span>
                </div>

                {/* Chip 3: Progress Tracking */}
                <div className="inline-flex items-center gap-2 bg-mocha-surface px-3 py-1.5 rounded-full border border-cosmic shadow-warm-sm hover:-translate-y-0.5 transition-transform duration-200">
                  <span className="w-5 h-5 rounded-full bg-mocha text-burgundy flex items-center justify-center shrink-0 border border-cosmic/50">
                    <svg className="w-3 h-3 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </span>
                  <span>Progress dashboard</span>
                </div>
              </div>
            </div>

            {/* Right Column (Balanced 50/50 on lg): Enriched, prominent visual container */}
            <div className="lg:col-span-6 w-full">
              <HeroIllustration />
            </div>
          </div>
        </div>

        {/* Decorative Wave Transition Divider into Feature Strip */}
        <div className="w-full overflow-hidden leading-none select-none pointer-events-none mt-6 -mb-10 sm:-mb-14 lg:-mb-16" aria-hidden="true">
          <svg className="relative block w-full h-4 sm:h-5 text-mocha-surface fill-current" viewBox="0 0 1200 24" preserveAspectRatio="none">
            <path d="M0,0 C300,16 600,4 900,16 L1200,4 L1200,24 L0,24 Z" />
          </svg>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 2. COMPACT FULL-WIDTH FEATURE STRIP (Mocha Surface)             */}
      {/* ============================================================== */}
      <section
        aria-label="Core Feature Highlights"
        className="w-full bg-mocha-surface border-y border-cosmic py-5 sm:py-6 shadow-warm-sm relative z-20"
      >
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
            {/* Highlight 1: Video Lectures */}
            <Reveal delay={0}>
              <div className="flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 hover:bg-mocha/70 hover:-translate-y-0.5 group cursor-default">
                <div className="w-10 h-10 rounded-xl bg-mocha text-burgundy border border-cosmic flex items-center justify-center shrink-0 group-hover:border-burgundy/40 transition-colors shadow-xs">
                  <svg className="w-5 h-5 stroke-[2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-burgundy truncate group-hover:text-burgundy-hover transition-colors">Video Lectures</h3>
                  <p className="text-[11px] text-brown-soft truncate">Structured playlists</p>
                </div>
              </div>
            </Reveal>

            {/* Highlight 2: Code Exercises */}
            <Reveal delay={60}>
              <div className="flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 hover:bg-mocha/70 hover:-translate-y-0.5 group cursor-default">
                <div className="w-10 h-10 rounded-xl bg-mocha text-burgundy border border-cosmic flex items-center justify-center shrink-0 group-hover:border-burgundy/40 transition-colors shadow-xs">
                  <svg className="w-5 h-5 stroke-[2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-burgundy truncate group-hover:text-burgundy-hover transition-colors">Code Exercises</h3>
                  <p className="text-[11px] text-brown-soft truncate">Practical python tasks</p>
                </div>
              </div>
            </Reveal>

            {/* Highlight 3: Topic Quizzes */}
            <Reveal delay={120}>
              <div className="flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 hover:bg-mocha/70 hover:-translate-y-0.5 group cursor-default">
                <div className="w-10 h-10 rounded-xl bg-mocha text-burgundy border border-cosmic flex items-center justify-center shrink-0 group-hover:border-burgundy/40 transition-colors shadow-xs">
                  <svg className="w-5 h-5 stroke-[2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-burgundy truncate group-hover:text-burgundy-hover transition-colors">Topic Quizzes</h3>
                  <p className="text-[11px] text-brown-soft truncate">Recall checkpoints</p>
                </div>
              </div>
            </Reveal>

            {/* Highlight 4: Progress Tracking */}
            <Reveal delay={180}>
              <div className="flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 hover:bg-mocha/70 hover:-translate-y-0.5 group cursor-default">
                <div className="w-10 h-10 rounded-xl bg-mocha text-burgundy border border-cosmic flex items-center justify-center shrink-0 group-hover:border-burgundy/40 transition-colors shadow-xs">
                  <svg className="w-5 h-5 stroke-[2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-burgundy truncate group-hover:text-burgundy-hover transition-colors">Progress Tracking</h3>
                  <p className="text-[11px] text-brown-soft truncate">Personal dashboard</p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 3. FEATURED COURSES WITH LIVE SEARCH (Cosmic Latte Wash)       */}
      {/* ============================================================== */}
      <CourseSearchSection />

      {/* ============================================================== */}
      {/* 4. HOW IT WORKS (Cosmic Latte Secondary Section #DDD1C4)       */}
      {/* ============================================================== */}
      <section
        id="how-it-works"
        aria-label="How LearnSpace Works"
        className="py-16 sm:py-20 bg-[#DDD1C4] border-t border-cosmic"
      >
        <div className="max-w-[1200px] mx-auto px-6">
          <Reveal>
            <div className="max-w-2xl">
              <span className="inline-block text-xs font-semibold uppercase tracking-wider text-burgundy bg-mocha-surface border border-cosmic px-3 py-1 rounded-full mb-3">
                Platform Workflow
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-burgundy tracking-tight">
                How LearnSpace Works
              </h2>
              <p className="mt-2 text-base text-brown-soft">
                A straightforward path from discovering a course to practicing concepts and reviewing progress.
              </p>
            </div>
          </Reveal>

          {/* 4 Workflow Cards */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {/* Step 1: Find a Course */}
            <Reveal delay={40}>
              <div className="group card-hover h-full rounded-2xl bg-mocha-surface border border-cosmic p-6 flex flex-col justify-between shadow-warm-sm">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="w-10 h-10 rounded-xl bg-mocha text-burgundy border border-cosmic flex items-center justify-center">
                      <svg className="w-5 h-5 stroke-[2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </span>
                    <span className="text-xs font-semibold text-burgundy bg-mocha border border-cosmic px-2.5 py-0.5 rounded-md">
                      Discovery
                    </span>
                  </div>
                  <h3 className="font-serif font-bold text-xl text-burgundy mb-2">
                    Find a Course
                  </h3>
                  <p className="text-sm text-brown-soft leading-relaxed">
                    Search the course catalog by topic, title, or instructor. Filter by beginner, intermediate, or advanced experience level to find the right start.
                  </p>
                </div>
                <div className="mt-5 pt-4 border-t border-cosmic/50 text-xs font-semibold text-burgundy flex items-center gap-1">
                  <span>Browse catalog</span>
                  <span className="card-arrow-nudge">&rarr;</span>
                </div>
              </div>
            </Reveal>

            {/* Step 2: Watch Structured Lessons */}
            <Reveal delay={80}>
              <div className="group card-hover h-full rounded-2xl bg-mocha-surface border border-cosmic p-6 flex flex-col justify-between shadow-warm-sm">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="w-10 h-10 rounded-xl bg-mocha text-burgundy border border-cosmic flex items-center justify-center">
                      <svg className="w-5 h-5 stroke-[2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </span>
                    <span className="text-xs font-semibold text-burgundy bg-mocha border border-cosmic px-2.5 py-0.5 rounded-md">
                      Study
                    </span>
                  </div>
                  <h3 className="font-serif font-bold text-xl text-burgundy mb-2">
                    Watch the Lessons
                  </h3>
                  <p className="text-sm text-brown-soft leading-relaxed">
                    Follow modular video lectures divided into organized curriculum sections. Replay key explanations and navigate through lectures whenever you want.
                  </p>
                </div>
                <div className="mt-5 pt-4 border-t border-cosmic/50 text-xs font-semibold text-burgundy flex items-center gap-1">
                  <span>Curriculum outline</span>
                  <span className="card-arrow-nudge">&rarr;</span>
                </div>
              </div>
            </Reveal>

            {/* Step 3: Complete Practical Exercises */}
            <Reveal delay={120}>
              <div className="group card-hover h-full rounded-2xl bg-mocha-surface border border-cosmic p-6 flex flex-col justify-between shadow-warm-sm">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="w-10 h-10 rounded-xl bg-mocha text-burgundy border border-cosmic flex items-center justify-center">
                      <svg className="w-5 h-5 stroke-[2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                    </span>
                    <span className="text-xs font-semibold text-burgundy bg-mocha border border-cosmic px-2.5 py-0.5 rounded-md">
                      Practice
                    </span>
                  </div>
                  <h3 className="font-serif font-bold text-xl text-burgundy mb-2">
                    Complete the Practice
                  </h3>
                  <p className="text-sm text-brown-soft leading-relaxed">
                    Reinforce topics with hands-on coding exercises and assignments. Complete topic quizzes to test your understanding before moving forward.
                  </p>
                </div>
                <div className="mt-5 pt-4 border-t border-cosmic/50 text-xs font-semibold text-burgundy flex items-center gap-1">
                  <span>Hands-on tasks</span>
                  <span className="card-arrow-nudge">&rarr;</span>
                </div>
              </div>
            </Reveal>

            {/* Step 4: Track Your Dashboard */}
            <Reveal delay={160}>
              <div className="group card-hover h-full rounded-2xl bg-mocha-surface border border-cosmic p-6 flex flex-col justify-between shadow-warm-sm">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="w-10 h-10 rounded-xl bg-mocha text-burgundy border border-cosmic flex items-center justify-center">
                      <svg className="w-5 h-5 stroke-[2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </span>
                    <span className="text-xs font-semibold text-burgundy bg-mocha border border-cosmic px-2.5 py-0.5 rounded-md">
                      Completion
                    </span>
                  </div>
                  <h3 className="font-serif font-bold text-xl text-burgundy mb-2">
                    Track Your Progress
                  </h3>
                  <p className="text-sm text-brown-soft leading-relaxed">
                    Check your completion metrics on your personal learner dashboard. Pick up right where you paused and review completed courses.
                  </p>
                </div>
                <div className="mt-5 pt-4 border-t border-cosmic/50 text-xs font-semibold text-burgundy flex items-center gap-1">
                  <span>Learner dashboard</span>
                  <span className="card-arrow-nudge">&rarr;</span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 5. LEARN & PRACTISE SHOWCASE (Deep Burgundy #3A151A Section)   */}
      {/* ============================================================== */}
      <section
        id="showcase"
        aria-label="Learn and Practise Experience"
        className="py-16 sm:py-20 bg-[#3A151A] text-[#F3E8D7] border-t border-[#D8C2AC]/25"
      >
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Plain copy & Verified Feature Checklist */}
            <div className="lg:col-span-5">
              <Reveal>
                <span className="inline-block text-xs font-semibold uppercase tracking-wider text-[#F2C078] bg-[#4D1C23] border border-[#F2C078]/40 px-3 py-1 rounded-full mb-3 shadow-xs">
                  The Learning Environment
                </span>
                <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#FBF4E8] tracking-tight leading-tight">
                  Lessons and <span className="text-[#F2C078]">Hands-on Practice</span>, Together
                </h2>
                <p className="mt-3 text-base text-[#F3E8D7] leading-relaxed">
                  Watching a lecture is only part of learning. LearnSpace pairs video lectures with chapter checklists, quizzes, and code practice so you can apply ideas right away.
                </p>

                {/* Verified Feature Checklist */}
                <ul className="mt-6 space-y-3.5 text-sm text-[#F3E8D7] font-medium">
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#4D1C23] text-[#F2C078] flex items-center justify-center shrink-0 mt-0.5 border border-[#F2C078]/40 shadow-xs">
                      <svg className="w-3.5 h-3.5 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span>Curriculum drawer with step-by-step lecture outlines</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#4D1C23] text-[#F2C078] flex items-center justify-center shrink-0 mt-0.5 border border-[#F2C078]/40 shadow-xs">
                      <svg className="w-3.5 h-3.5 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span>Video player with pause, seek, and playback controls</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#4D1C23] text-[#F2C078] flex items-center justify-center shrink-0 mt-0.5 border border-[#F2C078]/40 shadow-xs">
                      <svg className="w-3.5 h-3.5 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span>Assignment prompts with code practice instructions</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#4D1C23] text-[#F2C078] flex items-center justify-center shrink-0 mt-0.5 border border-[#F2C078]/40 shadow-xs">
                      <svg className="w-3.5 h-3.5 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span>Knowledge check quizzes to test topic comprehension</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#4D1C23] text-[#F2C078] flex items-center justify-center shrink-0 mt-0.5 border border-[#F2C078]/40 shadow-xs">
                      <svg className="w-3.5 h-3.5 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span>Dashboard tracking completed lectures and progress</span>
                  </li>
                </ul>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Link
                    to="/register"
                    className="btn-primary-dark"
                  >
                    Start Learning Free
                  </Link>
                  <Link
                    to="/courses"
                    className="btn-secondary-dark"
                  >
                    Browse Course Catalog
                  </Link>
                </div>
              </Reveal>
            </div>

            {/* Right Column: Realistic UI Mock of Player & Curriculum */}
            <div className="lg:col-span-7">
              <Reveal delay={80}>
                <div className="rounded-2xl bg-[#2D1014] border border-[#D8C2AC]/30 shadow-warm-lg overflow-hidden">
                  {/* Top Bar */}
                  <div className="px-4 py-2.5 bg-[#200A0D] border-b border-[#D8C2AC]/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#E8A08A]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#F2C078]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#D8C2AC]" />
                      <span className="ml-2 font-medium text-[#FBF4E8] truncate max-w-[200px] sm:max-w-none">
                        Course Player &bull; Python Web Frameworks
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-[#F2C078] bg-[#4D1C23] px-2.5 py-0.5 rounded border border-[#F2C078]/40">
                      In Progress
                    </span>
                  </div>

                  {/* Player + Curriculum Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 min-h-[300px]">
                    {/* Video Player Display Area with Realistic Thumbnail Background (7 cols on sm) */}
                    <div className="relative sm:col-span-7 bg-[#1A070A] text-[#F3E8D7] p-4 flex flex-col justify-between overflow-hidden group">
                      {/* Realistic Lecture Photography Background */}
                      <img
                        src="/images/courses/lecture_preview.jpg"
                        alt="Lecture preview - Building Dynamic Route Handlers"
                        className="absolute inset-0 w-full h-full object-cover opacity-35 transition-transform duration-700 group-hover:scale-105 pointer-events-none"
                        loading="lazy"
                      />
                      {/* Rich gradient wash for high contrast and readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1A070A] via-[#1A070A]/75 to-[#1A070A]/45 pointer-events-none" />

                      {/* Video Top Controls */}
                      <div className="relative z-10 flex items-center justify-between text-[11px] text-[#D8C2AC]">
                        <span className="bg-black/60 px-2 py-0.5 rounded border border-[#D8C2AC]/30 backdrop-blur-xs font-medium">Lecture 3</span>
                        <span className="bg-black/60 px-2 py-0.5 rounded border border-[#D8C2AC]/30 backdrop-blur-xs font-medium">1080p HD</span>
                      </div>

                      {/* Video Center Play State */}
                      <div className="relative z-10 py-8 sm:py-12 flex flex-col items-center justify-center text-center">
                        <button
                          type="button"
                          aria-label="Play sample lecture"
                          className="w-13 h-13 rounded-full bg-[#722F37] text-[#FBF4E8] flex items-center justify-center shadow-warm-lg transition-all duration-300 hover:scale-110 hover:bg-[#8B3A44] active:scale-95 cursor-pointer border-2 border-[#F2C078] focus:outline-none focus:ring-2 focus:ring-[#F2C078]"
                        >
                          <svg className="w-5 h-5 ml-0.5 fill-current" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </button>
                        <h4 className="mt-3 font-serif text-sm sm:text-base font-semibold text-[#FBF4E8] max-w-[240px] drop-shadow-sm">
                          Building Dynamic Route Handlers
                        </h4>
                      </div>

                      {/* Video Control Bar with Animated Progress Fill */}
                      <div className="relative z-10 space-y-1.5 pt-2">
                        <div className="w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-[#F2C078] h-1.5 rounded-full animate-progress-fill"
                            style={{ '--progress-target': '60%' }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[#D8C2AC] font-mono font-medium">
                          <span>08:45 / 14:20</span>
                          <span>1.0x</span>
                        </div>
                      </div>
                    </div>

                    {/* Lecture Curriculum Sidebar (5 cols on sm) */}
                    <div className="sm:col-span-5 bg-[#250D11] border-t sm:border-t-0 sm:border-l border-[#D8C2AC]/30 p-3.5 sm:p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#D8C2AC]/30 text-xs">
                          <span className="font-semibold text-[#FBF4E8]">Curriculum</span>
                          <span className="text-[11px] text-[#D8C2AC] font-medium">3 of 4 done</span>
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="p-2 rounded-lg bg-[#331317] border border-[#D8C2AC]/20 flex items-center gap-2 text-[#D8C2AC] transition-colors hover:bg-[#3d181d]">
                            <svg className="w-4 h-4 text-[#F2C078] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="line-through truncate">1. Environment Setup</span>
                          </div>
                          <div className="p-2 rounded-lg bg-[#331317] border border-[#D8C2AC]/20 flex items-center gap-2 text-[#D8C2AC] transition-colors hover:bg-[#3d181d]">
                            <svg className="w-4 h-4 text-[#F2C078] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="line-through truncate">2. Request Pipeline</span>
                          </div>
                          <div className="p-2 rounded-lg bg-[#44191F] border border-[#F2C078]/70 shadow-xs flex items-center gap-2 text-[#FBF4E8] font-semibold">
                            <span className="w-2 h-2 rounded-full bg-[#F2C078] shrink-0 animate-pulse-subtle" />
                            <span className="text-[#FBF4E8] truncate">3. Route Handlers</span>
                          </div>
                          <div className="p-2 rounded-lg bg-[#1E090C] border border-[#D8C2AC]/20 flex items-center gap-2 text-[#D8C2AC] transition-colors hover:bg-[#280D11]">
                            <span className="w-2 h-2 rounded-full bg-[#D8C2AC]/40 shrink-0" />
                            <span className="truncate">4. Code Exercise</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 mt-3 border-t border-[#D8C2AC]/30 text-[11px] text-[#D8C2AC] flex flex-col gap-1.5 font-medium">
                        <div className="flex items-center justify-between">
                          <span>Course completion</span>
                          <span className="font-bold text-[#FBF4E8]">75%</span>
                        </div>
                        <div className="w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-[#F2C078] h-1.5 rounded-full animate-progress-fill"
                            style={{ '--progress-target': '75%' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 6. CLOSING CTA BAND (Mocha Surface with Burgundy Buttons)      */}
      {/* ============================================================== */}
      <section
        id="cta"
        aria-label="Start Learning Call to Action"
        className="py-16 sm:py-20 bg-[#F0E5D4] text-burgundy border-t border-cosmic"
      >
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <Reveal>
            <h2 className="text-3xl sm:text-5xl font-serif font-bold text-burgundy tracking-tight leading-snug">
              Ready to start learning?
            </h2>
            <p className="mt-3 text-base sm:text-lg text-brown-soft max-w-xl mx-auto leading-relaxed font-normal">
              Create an account to browse courses, complete coding exercises, and track your progress at your own pace.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="btn-primary w-full sm:w-auto"
              >
                Start Learning
              </Link>
              <Link
                to="/courses"
                className="btn-secondary w-full sm:w-auto"
              >
                Explore Courses
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
