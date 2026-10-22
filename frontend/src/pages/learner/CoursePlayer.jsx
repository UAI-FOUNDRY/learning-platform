import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { learnerService } from '../../services/learnerService';
import CodingWorkspace from '../../components/learner/CodingWorkspace';
import AIAssistantDrawer from '../../components/learner/AIAssistantDrawer';
import CourseReviewModal from '../../components/learner/CourseReviewModal';
import PracticeTestModal from '../../components/learner/PracticeTestModal';

export default function CoursePlayer() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(() => learnerService.getCourseById(courseId));
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('notes'); // 'notes', 'resources', 'qa', 'overview'
  const [lessonNotes, setLessonNotes] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState('1.0x');
  const [isPlaying, setIsPlaying] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [bookmarkedLessons, setBookmarkedLessons] = useState({});

  // Modals state
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isPracticeOpen, setIsPracticeOpen] = useState(false);

  useEffect(() => {
    const loaded = learnerService.getCourseById(courseId);
    if (loaded) {
      setCourse(loaded);
    } else {
      const enrolled = learnerService.getEnrolledCourses();
      if (enrolled && enrolled.length > 0) {
        setCourse(enrolled[0]);
      }
    }
  }, [courseId]);

  // Flattened list of lessons for easy previous/next navigation
  const allLessons = [];
  if (course && course.modules) {
    course.modules.forEach((mod, modIdx) => {
      (mod.lessons || []).forEach((les, lesIdx) => {
        allLessons.push({
          ...les,
          moduleIndex: modIdx,
          lessonIndex: lesIdx,
          moduleTitle: mod.title
        });
      });
    });
  }

  const currentLesson = course?.modules?.[currentModuleIndex]?.lessons?.[currentLessonIndex] || allLessons[0];
  const flatCurrentIndex = allLessons.findIndex(
    l => l.moduleIndex === currentModuleIndex && l.lessonIndex === currentLessonIndex
  );

  useEffect(() => {
    if (currentLesson) {
      setLessonNotes(currentLesson.notes || '');
    }
  }, [currentLesson]);

  const handleSelectLesson = (modIdx, lesIdx) => {
    setCurrentModuleIndex(modIdx);
    setCurrentLessonIndex(lesIdx);
    setIsPlaying(false);
  };

  const handleToggleComplete = () => {
    if (!currentLesson || !course) return;
    const updatedCourse = learnerService.markLessonCompleted(course.id, currentLesson.id);
    if (updatedCourse) {
      setCourse(updatedCourse);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
    }
  };

  const handleToggleBookmark = () => {
    if (!currentLesson) return;
    setBookmarkedLessons(prev => ({
      ...prev,
      [currentLesson.id]: !prev[currentLesson.id]
    }));
  };

  const handleSaveNotes = (e) => {
    const text = e.target.value;
    setLessonNotes(text);
    if (currentLesson && course) {
      learnerService.saveLessonNotes(course.id, currentLesson.id, text);
    }
  };

  const handlePrevLesson = () => {
    if (flatCurrentIndex > 0) {
      const prev = allLessons[flatCurrentIndex - 1];
      setCurrentModuleIndex(prev.moduleIndex);
      setCurrentLessonIndex(prev.lessonIndex);
    }
  };

  const handleNextLesson = () => {
    if (flatCurrentIndex < allLessons.length - 1) {
      const next = allLessons[flatCurrentIndex + 1];
      setCurrentModuleIndex(next.moduleIndex);
      setCurrentLessonIndex(next.lessonIndex);
    }
  };

  if (!course) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-base font-bold text-[#211E1A]">Loading course player...</p>
        <Link to="/learner/my-learning" className="text-xs font-bold text-[#D92D2D] hover:underline">
          ← Return to My Learning
        </Link>
      </div>
    );
  }

  const isCurrentBookmarked = Boolean(currentLesson && bookmarkedLessons[currentLesson.id]);

  return (
    <div className={`space-y-4 animate-fade-in font-sans ${isFullscreen ? 'p-4 max-w-7xl mx-auto' : ''}`}>
      {/* Top Header Bar */}
      <div className="bg-white border-2 border-[#B6AA9A] rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/learner/my-learning"
            className="p-2 rounded-xl bg-[#EAE3DA] hover:bg-[#D6D0C8] border border-[#B6AA9A] text-[#211E1A] text-xs font-bold transition-colors"
            title="Back to My Learning"
          >
            ← My Learning
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A]">
                {course.category}
              </span>
              <span className="text-xs text-[#71675D] hidden sm:inline">
                by {course.instructor}
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-black text-[#211E1A] truncate max-w-xl">
              {course.title}
            </h1>
          </div>
        </div>

        {/* Action Controls & Modal Triggers */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto justify-between md:justify-end">
          {/* AI Scholar Assistant Button (PROJECT.md §25) */}
          <button
            type="button"
            onClick={() => setIsAIOpen(true)}
            className="px-3 py-1.5 bg-[#D92D2D]/10 hover:bg-[#D92D2D]/20 text-[#D92D2D] border border-[#D92D2D]/50 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-2xs hover:scale-102"
          >
            <span>🤖</span>
            <span>AI Scholar Assist</span>
          </button>

          {/* Diagnostic Practice Test Trigger (PROJECT.md §16) */}
          <button
            type="button"
            onClick={() => setIsPracticeOpen(true)}
            className="px-3 py-1.5 bg-[#EAE3DA] hover:bg-[#D6D0C8] text-[#211E1A] border border-[#B6AA9A] rounded-xl text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5"
          >
            <span>🎯</span>
            <span className="hidden sm:inline">Diagnostic Practice</span>
          </button>

          {/* Course Rating / Review Trigger (PROJECT.md §18) */}
          <button
            type="button"
            onClick={() => setIsReviewOpen(true)}
            className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-colors shadow-2xs flex items-center gap-1"
            title="Leave a Course Review"
          >
            <span>★</span>
            <span className="hidden sm:inline">Review</span>
          </button>

          {/* Bookmark Toggle (PROJECT.md §10) */}
          <button
            type="button"
            onClick={handleToggleBookmark}
            className={`p-2 rounded-xl text-xs font-bold border transition-colors ${
              isCurrentBookmarked
                ? 'bg-amber-100 border-amber-400 text-amber-800'
                : 'bg-[#EAE3DA] hover:bg-[#D6D0C8] border-[#B6AA9A] text-[#211E1A]'
            }`}
            title={isCurrentBookmarked ? 'Remove Bookmark' : 'Bookmark Lecture'}
          >
            {isCurrentBookmarked ? '🔖 Saved' : '📑 Bookmark'}
          </button>

          {/* Mark Complete Toggle */}
          <button
            type="button"
            onClick={handleToggleComplete}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-2xs ${
              currentLesson?.completed
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-400'
                : 'bg-[#211E1A] hover:bg-black text-white'
            }`}
          >
            <span>{currentLesson?.completed ? '✓ Completed' : 'Mark as Complete'}</span>
          </button>

          {/* Fullscreen & Curriculum Drawer Toggles */}
          <button
            type="button"
            onClick={() => setIsFullscreen(prev => !prev)}
            className="p-2 rounded-xl bg-[#EAE3DA] hover:bg-[#D6D0C8] border border-[#B6AA9A] text-[#211E1A] text-xs font-bold transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Player'}
          >
            <span>⛶</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSidebarOpen(prev => !prev)}
            className="p-2 rounded-xl bg-[#EAE3DA] hover:bg-[#D6D0C8] border border-[#B6AA9A] text-[#211E1A] text-xs font-bold transition-colors"
            title={isSidebarOpen ? 'Hide curriculum syllabus' : 'Show curriculum syllabus'}
          >
            <span>📋</span>
          </button>
        </div>
      </div>

      {/* Main Learning Canvas Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Content Stage (8 or 12 cols based on curriculum drawer) */}
        <div className={`${isSidebarOpen ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-4`}>
          {/* ========================================================
              LESSON STAGE RENDERER (VIDEO / CODING / ARTICLE / QUIZ)
             ======================================================== */}
          {currentLesson?.type === 'Coding Exercise' ? (
            /* Coding Exercise View */
            <CodingWorkspace
              lesson={currentLesson}
              onCompleteExercise={handleToggleComplete}
              onOpenAIAssistant={() => setIsAIOpen(true)}
            />
          ) : currentLesson?.type === 'Video' ? (
            /* Video Lecture View */
            <div className="bg-black rounded-3xl overflow-hidden border-2 border-[#B6AA9A] shadow-xl relative aspect-video flex flex-col justify-between">
              {/* Simulated Video Player */}
              <div className="flex-1 flex items-center justify-center relative group">
                <div className="text-center space-y-3 p-4">
                  <button
                    type="button"
                    onClick={() => setIsPlaying(prev => !prev)}
                    className="w-16 h-16 rounded-full bg-[#D92D2D] hover:bg-[#B91C1C] text-white flex items-center justify-center text-2xl shadow-xl transition-transform hover:scale-110 pl-1 mx-auto"
                    aria-label={isPlaying ? 'Pause video' : 'Play video'}
                  >
                    {isPlaying ? '⏸' : '▶'}
                  </button>
                  <p className="text-stone-300 text-xs font-semibold">
                    {isPlaying ? 'Streaming high-definition video lecture...' : 'Click to stream lecture with subtitles'}
                  </p>
                </div>
              </div>

              {/* Video Player Bottom Controls */}
              <div className="bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 flex items-center justify-between text-white text-xs select-none">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPlaying(prev => !prev)}
                    className="font-bold hover:text-[#D92D2D] transition-colors"
                  >
                    {isPlaying ? 'Pause' : 'Play'}
                  </button>
                  <span className="text-stone-400 font-mono text-[11px]">
                    04:15 / {currentLesson.duration || '20 min'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Playback speed selector (PROJECT.md §10) */}
                  <div className="flex items-center gap-1 bg-stone-800/80 px-2 py-0.5 rounded-lg border border-stone-700">
                    {['1.0x', '1.25x', '1.5x'].map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => setPlaybackSpeed(spd)}
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors ${
                          playbackSpeed === spd ? 'bg-[#D92D2D] text-white' : 'text-stone-400 hover:text-white'
                        }`}
                      >
                        {spd}
                      </button>
                    ))}
                  </div>

                  <span className="text-stone-400 text-[11px] font-mono">1080p HD</span>
                </div>
              </div>
            </div>
          ) : currentLesson?.type === 'Quiz' ? (
            /* Quiz Launcher View */
            <div className="bg-white border-2 border-[#B6AA9A] rounded-3xl p-8 text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 mx-auto flex items-center justify-center text-3xl shadow-xs">
                🎯
              </div>
              <div>
                <h3 className="text-xl font-black text-[#211E1A]">
                  {currentLesson.title}
                </h3>
                <p className="text-xs text-[#514940] max-w-md mx-auto mt-1">
                  Test your mastery of the concepts covered in this module. Quizzes feature multiple-choice and scenario-based evaluations.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  to={`/learner/quiz/${currentLesson.quizId || 'asm-101'}`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#D92D2D] hover:bg-[#B91C1C] text-white font-extrabold text-xs transition-all hover:scale-102 shadow-md"
                >
                  <span>Launch Interactive Quiz Assessment</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          ) : (
            /* Article Reading Mode */
            <div className="bg-white border-2 border-[#B6AA9A] rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#B6AA9A]/50 pb-3">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-[#EAE3DA] text-[#211E1A]">
                  📖 Article & Reading Material
                </span>
                <span className="text-xs text-[#71675D]">
                  Estimated read: {currentLesson?.duration || '15 min'}
                </span>
              </div>

              <h2 className="text-xl font-black text-[#211E1A]">
                {currentLesson?.title}
              </h2>

              <div className="prose prose-stone text-xs sm:text-sm leading-relaxed text-[#514940] whitespace-pre-line">
                {currentLesson?.content || currentLesson?.summary || 'Review the core takeaways outlined for this lecture.'}
              </div>
            </div>
          )}

          {/* Previous / Next Lesson Navigation Controls */}
          <div className="bg-white border-2 border-[#B6AA9A] rounded-2xl p-3 shadow-2xs flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handlePrevLesson}
              disabled={flatCurrentIndex <= 0}
              className="px-4 py-2 rounded-xl bg-[#EAE3DA] hover:bg-[#D6D0C8] disabled:opacity-40 text-[#211E1A] text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <span>←</span>
              <span>Previous Lecture</span>
            </button>

            <span className="text-xs font-bold text-[#514940] hidden sm:inline">
              Lecture {flatCurrentIndex + 1} of {allLessons.length}
            </span>

            <button
              type="button"
              onClick={handleNextLesson}
              disabled={flatCurrentIndex >= allLessons.length - 1}
              className="px-4 py-2 rounded-xl bg-[#211E1A] hover:bg-black disabled:opacity-40 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <span>Next Lecture</span>
              <span>→</span>
            </button>
          </div>

          {/* ========================================================
              BELOW-PLAYER TABS: NOTES, RESOURCES, OVERVIEW, Q&A
             ======================================================== */}
          <div className="bg-white border-2 border-[#B6AA9A] rounded-3xl p-6 shadow-sm space-y-4">
            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-[#B6AA9A]/60 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('notes')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  activeTab === 'notes'
                    ? 'bg-[#EAE3DA] text-[#D92D2D] border border-[#B6AA9A] shadow-2xs'
                    : 'text-[#514940] hover:text-[#211E1A]'
                }`}
              >
                📝 Lecture Notes
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('resources')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  activeTab === 'resources'
                    ? 'bg-[#EAE3DA] text-[#D92D2D] border border-[#B6AA9A] shadow-2xs'
                    : 'text-[#514940] hover:text-[#211E1A]'
                }`}
              >
                📎 Resources & Files
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('qa')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  activeTab === 'qa'
                    ? 'bg-[#EAE3DA] text-[#D92D2D] border border-[#B6AA9A] shadow-2xs'
                    : 'text-[#514940] hover:text-[#211E1A]'
                }`}
              >
                💬 Lecture Q&A
              </button>
            </div>

            {/* Tab Contents */}
            {activeTab === 'notes' && (
              <div className="space-y-2 animate-fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-[#514940]">
                  <span>Your Study Notebook (Autosaved locally):</span>
                  <span className="text-[11px] text-emerald-700">✓ Synchronized</span>
                </div>
                <textarea
                  value={lessonNotes}
                  onChange={handleSaveNotes}
                  placeholder="Type notes for this lecture... notes persist automatically across sessions."
                  rows={5}
                  className="w-full p-3 bg-[#EAE3DA]/40 border border-[#B6AA9A] rounded-xl text-xs text-[#211E1A] focus:outline-none focus:border-[#D92D2D] focus:ring-1 focus:ring-[#D92D2D]"
                />
              </div>
            )}

            {activeTab === 'resources' && (
              <div className="space-y-3 animate-fade-in text-xs">
                <div className="p-3 bg-[#EAE3DA]/50 rounded-xl border border-[#B6AA9A] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">📄</span>
                    <div>
                      <p className="font-extrabold text-[#211E1A]">Lecture Slides & Architectural Diagrams</p>
                      <p className="text-[10px] text-[#71675D]">PDF document • 4.2 MB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => alert('Downloading official course slides PDF...')}
                    className="px-3 py-1.5 bg-white border border-[#B6AA9A] rounded-lg text-xs font-bold text-[#211E1A] hover:bg-[#EAE3DA]"
                  >
                    Download
                  </button>
                </div>

                <div className="p-3 bg-[#EAE3DA]/50 rounded-xl border border-[#B6AA9A] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">💻</span>
                    <div>
                      <p className="font-extrabold text-[#211E1A]">GitHub Starter Repository & Test Cases</p>
                      <p className="text-[10px] text-[#71675D]">Source code repository</p>
                    </div>
                  </div>
                  <a
                    href="https://github.com/UAI-FOUNDRY/learning-platform"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-[#211E1A] text-white rounded-lg text-xs font-bold hover:bg-black"
                  >
                    View Repo
                  </a>
                </div>
              </div>
            )}

            {activeTab === 'qa' && (
              <div className="space-y-3 animate-fade-in text-xs">
                <div className="p-3 bg-[#EAE3DA]/50 rounded-xl border border-[#B6AA9A] space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-[#211E1A]">Prof. Elena Rostova</span>
                    <span className="text-[#71675D]">Faculty Note</span>
                  </div>
                  <p className="text-xs text-[#514940] leading-relaxed">
                    Remember to double check gradient accumulation when batch sizes exceed GPU memory capacity.
                  </p>
                </div>

                <div className="pt-2">
                  <input
                    type="text"
                    placeholder="Ask a question about this lecture..."
                    className="w-full px-3 py-2 bg-white border border-[#B6AA9A] rounded-xl text-xs text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        alert('Your question has been posted to the course Q&A board!');
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================
            RIGHT DRAWER: COURSE CURRICULUM ACCORDION (4 cols)
           ======================================================== */}
        {isSidebarOpen && (
          <div className="lg:col-span-4 bg-white border-2 border-[#B6AA9A] rounded-3xl p-4 sm:p-5 shadow-sm space-y-4 max-h-[750px] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#B6AA9A]/60 pb-3">
              <div>
                <h3 className="font-black text-sm text-[#211E1A]">Course Curriculum</h3>
                <p className="text-[11px] text-[#71675D]">
                  {course.completedLessonsCount || 0} of {allLessons.length} completed
                </p>
              </div>
              <span className="text-xs font-extrabold text-[#D92D2D]">
                {course.progressPercent}%
              </span>
            </div>

            <div className="space-y-4">
              {(course.modules || []).map((module, modIdx) => (
                <div key={module.id || modIdx} className="space-y-2">
                  <h4 className="text-xs font-extrabold text-[#211E1A] bg-[#EAE3DA]/80 px-2.5 py-1.5 rounded-lg border border-[#B6AA9A]/50">
                    {module.title}
                  </h4>

                  <div className="space-y-1 pl-1">
                    {(module.lessons || []).map((lesson, lesIdx) => {
                      const isCurrent = modIdx === currentModuleIndex && lesIdx === currentLessonIndex;
                      const isBookmarked = Boolean(bookmarkedLessons[lesson.id]);

                      return (
                        <button
                          key={lesson.id || lesIdx}
                          type="button"
                          onClick={() => handleSelectLesson(modIdx, lesIdx)}
                          className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-start gap-2.5 ${
                            isCurrent
                              ? 'bg-[#211E1A] text-white shadow-2xs font-extrabold'
                              : 'hover:bg-[#EAE3DA] text-[#514940] hover:text-[#211E1A]'
                          }`}
                        >
                          <span className={`mt-0.5 text-xs ${lesson.completed ? 'text-emerald-500 font-bold' : 'text-stone-400'}`}>
                            {lesson.completed ? '✓' : '○'}
                          </span>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="truncate text-xs">
                                {lesson.title}
                              </p>
                              {isBookmarked && (
                                <span className="text-[10px] text-amber-500">🔖</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] opacity-80">
                              <span>{lesson.type}</span>
                              <span>•</span>
                              <span>{lesson.duration}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Completion Toast Notification with Confetti Burst */}
      {showCelebration && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#211E1A] text-white border-2 border-emerald-500 rounded-2xl p-4 shadow-2xl flex items-center gap-3 animate-slide-up">
          <span className="text-3xl animate-bounce">🎉</span>
          <div>
            <p className="font-extrabold text-xs">Lecture Marked Complete!</p>
            <p className="text-[10px] text-stone-300">Progress recorded in your curriculum.</p>
          </div>
        </div>
      )}

      {/* AI Scholar Assistant Drawer */}
      <AIAssistantDrawer
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
        contextLesson={currentLesson}
      />

      {/* Course Review Modal */}
      <CourseReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        courseTitle={course?.title || 'This Course'}
      />

      {/* Practice Test Modal */}
      <PracticeTestModal
        isOpen={isPracticeOpen}
        onClose={() => setIsPracticeOpen(false)}
      />
    </div>
  );
}
