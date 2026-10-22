import React, { useState } from 'react';

/**
 * Creative, Interactive Hero Visual Composition.
 * Features:
 * - Interactive Code Studio with Run Simulation and Solution Tab
 * - Dynamic Output Console with test assertions
 * - Dynamic Progress Bar animating from 0% -> 80% (and 100% on Run)
 * - Layered Floating Cards & Small Achievement Badges
 * - Warm Three-Color Palette: Mocha Cream (#E8DCC6), Cosmic Latte (#B7A89A), Deep Burgundy (#722F37)
 */
export default function HeroIllustration() {
  const [activeTab, setActiveTab] = useState('exercise'); // 'exercise' | 'solution'
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [progress, setProgress] = useState(80);

  const handleRunCode = () => {
    if (isRunning) return;
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      setHasRun(true);
      setProgress(100);
    }, 550);
  };

  const handleReset = () => {
    setHasRun(false);
    setProgress(80);
    setIsRunning(false);
  };

  return (
    <div className="relative w-full select-none">
      {/* Floating Accent Badge A: Code Studio Pill (Top Left) */}
      <div className="absolute -top-3.5 -left-2 sm:-top-5 sm:-left-4 z-20 hidden xs:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-mocha-surface border border-cosmic shadow-warm-md text-xs font-semibold text-burgundy animate-float-reverse">
        <span className="w-5 h-5 rounded-md bg-burgundy/15 text-burgundy flex items-center justify-center font-mono text-[11px] font-bold">
          {'{ }'}
        </span>
        <span className="tracking-tight">Python 3.11 Studio</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      </div>

      {/* Floating Accent Badge B: Achievement Pill (Bottom Right) */}
      <div className="absolute -bottom-3 -right-2 sm:-bottom-4 sm:-right-3 z-20 hidden xs:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#3A151A] border border-burgundy/50 shadow-warm-md text-xs font-semibold text-mocha animate-float-slow">
        <span className="text-amber-300">★</span>
        <span>{hasRun ? '100 XP Earned • Completed' : 'Hands-on Practice'}</span>
      </div>

      {/* Cosmic Latte Tinted Outer Panel with Subtle Float */}
      <div className="bg-[#DDD1C4] border border-cosmic rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-warm-md space-y-3 sm:space-y-4 animate-float-slow">
        
        {/* 1. Main Code Practice Window */}
        <div className="rounded-xl sm:rounded-2xl bg-mocha-surface border border-cosmic shadow-warm-sm overflow-hidden transition-all duration-300 hover:border-burgundy/60">
          
          {/* Window Titlebar with Interactive Tabs & Run Button */}
          <div className="flex items-center justify-between px-3.5 sm:px-4 py-2.5 bg-mocha border-b border-cosmic">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-burgundy" />
              <span className="w-2.5 h-2.5 rounded-full bg-cosmic" />
              <span className="w-2.5 h-2.5 rounded-full bg-burgundy/70" />

              {/* Interactive File Tabs */}
              <div className="ml-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('exercise')}
                  className={`px-2.5 py-0.5 rounded text-xs font-mono font-medium transition-colors ${
                    activeTab === 'exercise'
                      ? 'bg-mocha-surface text-burgundy border border-cosmic/80 shadow-xs'
                      : 'text-brown-soft/70 hover:text-burgundy'
                  }`}
                >
                  exercise.py
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('solution')}
                  className={`px-2.5 py-0.5 rounded text-xs font-mono font-medium transition-colors ${
                    activeTab === 'solution'
                      ? 'bg-mocha-surface text-burgundy border border-cosmic/80 shadow-xs'
                      : 'text-brown-soft/70 hover:text-burgundy'
                  }`}
                >
                  solution.py
                </button>
              </div>
            </div>
            
            {/* Run / Reset Action Controls */}
            <div className="flex items-center gap-2">
              {hasRun ? (
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-mocha text-burgundy border border-cosmic text-[11px] font-semibold hover:border-burgundy active:scale-95 transition-all cursor-pointer"
                >
                  <svg className="w-2.5 h-2.5 stroke-[2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Reset</span>
                </button>
              ) : null}

              <button
                type="button"
                onClick={handleRunCode}
                disabled={isRunning}
                title="Run Python snippet"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-burgundy text-white text-[11px] font-semibold hover:bg-burgundy-hover active:scale-95 transition-all shadow-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-burgundy disabled:opacity-75"
              >
                {isRunning ? (
                  <>
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Running...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    <span>{hasRun ? 'Run Again' : 'Run Code'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Module Banner */}
          <div className="px-3.5 sm:px-4 py-2 bg-mocha/60 border-b border-cosmic/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-burgundy shrink-0 animate-pulse-subtle" />
              <span className="font-semibold text-burgundy truncate">
                Lesson 4: Functions &amp; Data Structures
              </span>
            </div>
            <span className="text-[11px] font-medium text-burgundy bg-mocha-surface px-2 py-0.5 rounded border border-cosmic/50 shrink-0">
              {hasRun ? '✓ Completed' : 'Active Exercise'}
            </span>
          </div>

          {/* Code Editor Body */}
          <div className="p-3.5 sm:p-5 bg-mocha-surface font-mono text-xs sm:text-[13px] leading-relaxed text-brown-soft">
            {activeTab === 'exercise' ? (
              <>
                <div className="text-cosmic-dark/80 pb-1">
                  # Exercise: Compute course score average
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-cosmic-dark/60 select-none w-4 sm:w-5 text-right shrink-0">1</span>
                  <div>
                    <span className="text-burgundy font-semibold">def</span>{' '}
                    <span className="font-semibold text-burgundy">calculate_score</span>(grades):
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-cosmic-dark/60 select-none w-4 sm:w-5 text-right shrink-0">2</span>
                  <div className="pl-4">
                    total = <span className="text-burgundy font-semibold">sum</span>(grades)
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-cosmic-dark/60 select-none w-4 sm:w-5 text-right shrink-0">3</span>
                  <div className="pl-4">
                    <span className="text-burgundy font-semibold">return</span>{' '}
                    <span className="text-burgundy font-semibold">round</span>(total / <span className="text-burgundy font-semibold">len</span>(grades), 1)
                  </div>
                </div>
                <div className="flex items-start gap-2 pt-1">
                  <span className="text-cosmic-dark/60 select-none w-4 sm:w-5 text-right shrink-0">4</span>
                  <div>
                    scores = [88, 94, 91, 96]
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-cosmic-dark/60 select-none w-4 sm:w-5 text-right shrink-0">5</span>
                  <div className="flex items-center">
                    <span className="text-burgundy font-semibold">print</span>(calculate_score(scores))
                    {/* Blinking Typing Cursor */}
                    <span className="inline-block w-1.5 h-3.5 bg-burgundy align-middle ml-1 animate-cursor" aria-hidden="true" />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-cosmic-dark/80 pb-1">
                  # Reference Solution &mdash; Python 3.11
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-cosmic-dark/60 select-none w-4 sm:w-5 text-right shrink-0">1</span>
                  <div>
                    <span className="text-burgundy font-semibold">from</span> statistics <span className="text-burgundy font-semibold">import</span> fmean
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-cosmic-dark/60 select-none w-4 sm:w-5 text-right shrink-0">2</span>
                  <div>
                    <span className="text-burgundy font-semibold">def</span>{' '}
                    <span className="font-semibold text-burgundy">calculate_score</span>(grades: list[float]) -&gt; float:
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-cosmic-dark/60 select-none w-4 sm:w-5 text-right shrink-0">3</span>
                  <div className="pl-4">
                    <span className="text-burgundy font-semibold">return</span>{' '}
                    <span className="text-burgundy font-semibold">round</span>(fmean(grades), 1)
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Console / Output Tray with Smooth Output Reveal */}
          <div className="px-3.5 sm:px-4 py-2.5 bg-mocha border-t border-cosmic text-xs font-mono transition-colors">
            {isRunning ? (
              <div className="flex items-center gap-2 text-cosmic-dark italic animate-pulse">
                <span className="text-burgundy font-bold">&gt;</span>
                <span>Executing test suite against calculate_score()...</span>
              </div>
            ) : hasRun ? (
              <div className="space-y-1 animate-hero-1">
                <div className="flex items-center justify-between text-brown-soft">
                  <div className="flex items-center gap-2">
                    <span className="text-burgundy font-bold">&gt;</span>
                    <span>Output: <strong className="text-burgundy font-bold">92.3</strong></span>
                  </div>
                  <span className="text-[11px] font-semibold text-burgundy bg-burgundy/10 border border-burgundy/30 px-2 py-0.5 rounded">
                    Exit 0 &bull; Passed (14ms)
                  </span>
                </div>
                <div className="text-[11px] text-burgundy font-medium flex items-center gap-1.5">
                  <span className="text-emerald-700">✓</span>
                  <span>All 4 test assertions passed successfully</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-brown-soft">
                  <span className="text-burgundy font-bold">&gt;</span>
                  <span>Click <strong className="text-burgundy">Run Code</strong> to execute exercise</span>
                </div>
                <span className="text-[11px] font-semibold text-brown-soft/80 bg-mocha-surface border border-cosmic/70 px-2 py-0.5 rounded">
                  Ready
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 2. Structured Lower Cards: Progress and Next Lesson */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Card A: Animated Course Progress Card */}
          <div className="bg-mocha-surface rounded-xl p-3 sm:p-3.5 border border-cosmic shadow-warm-sm flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-warm-md hover:border-burgundy/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-burgundy/15 text-burgundy flex items-center justify-center animate-pulse-subtle">
                  <svg className="w-4 h-4 stroke-[2.2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                <span className="text-xs font-semibold text-burgundy">
                  Course Progress
                </span>
              </div>
              <span className="text-xs font-bold text-burgundy transition-all duration-500">
                {progress}%
              </span>
            </div>
            
            {/* Dynamic Progress Bar */}
            <div className="w-full bg-mocha rounded-full h-2 border border-cosmic/60 overflow-hidden">
              <div
                className="bg-burgundy h-2 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            <div className="text-[11px] text-brown-soft mt-1.5 flex justify-between">
              <span>{hasRun ? '5 of 5 modules done' : '4 of 5 modules done'}</span>
              <span className="font-semibold text-burgundy">
                {hasRun ? 'Module 100%' : '1 remaining'}
              </span>
            </div>
          </div>

          {/* Card B: Next Lesson Preview Card with Interactive Arrow */}
          <div className="group bg-mocha-surface rounded-xl p-3 sm:p-3.5 border border-cosmic shadow-warm-sm flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-warm-md hover:border-burgundy/50 cursor-pointer">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-burgundy uppercase tracking-wider">
                Up Next
              </span>
              <span className="text-[11px] text-brown-soft">12 min video</span>
            </div>
            <h4 className="text-xs sm:text-sm font-serif font-bold text-burgundy truncate group-hover:text-burgundy-hover transition-colors">
              5. Final Project &amp; Review
            </h4>
            <div className="mt-2 pt-1.5 border-t border-cosmic/60 flex items-center justify-between text-[11px] text-burgundy font-semibold">
              <span>Ready to start</span>
              <span className="group-hover:translate-x-1 transition-transform duration-200">&rarr;</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}


