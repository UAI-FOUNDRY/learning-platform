import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { learnerService } from '../../services/learnerService';
import CodingWorkspace from '../../components/learner/CodingWorkspace';
import CourseReviewModal from '../../components/learner/CourseReviewModal';
import PracticeTestModal from '../../components/learner/PracticeTestModal';
import CertificateModal from '../../components/learner/CertificateModal';

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
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [bookmarkedLessons, setBookmarkedLessons] = useState({});

  // Interactive Video Player Enhancements
  const [videoProgressSeconds, setVideoProgressSeconds] = useState(255); // 04:15
  const [totalVideoDuration] = useState(1200); // 20:00 (1200s)
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Curriculum Filter & Search
  const [curriculumSearch, setCurriculumSearch] = useState('');
  const [curriculumTypeFilter, setCurriculumTypeFilter] = useState('all');

  // Interactive Discussion Q&A
  const [qaQuestions, setQaQuestions] = useState([
    {
      id: 'qa-1',
      author: 'Prof. Elena Rostova',
      role: 'Instructor',
      avatar: 'ER',
      question: 'Key Architectural Takeaway for Lesson 2',
      body: 'Remember to double check gradient accumulation when batch sizes exceed GPU memory capacity. We will benchmark this in the lab.',
      upvotes: 24,
      isPinned: true,
      timeAgo: '2 days ago',
      replies: 3
    },
    {
      id: 'qa-2',
      author: 'Marcus Vance',
      role: 'Student',
      avatar: 'MV',
      question: 'Difference between torch.no_grad() and model.eval()?',
      body: 'Do we still need model.eval() if torch.no_grad() disables backpropagation graph construction?',
      upvotes: 16,
      isPinned: false,
      timeAgo: '1 day ago',
      replies: 2
    }
  ]);
  const [newQuestionTitle, setNewQuestionTitle] = useState('');
  const [newQuestionBody, setNewQuestionBody] = useState('');
  const [showNewQuestionForm, setShowNewQuestionForm] = useState(false);

  // Modals state
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isPracticeOpen, setIsPracticeOpen] = useState(false);
  const [isCertificateOpen, setIsCertificateOpen] = useState(false);

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

  // Video playback simulation interval
  useEffect(() => {
    let timer;
    if (isPlaying) {
      timer = setInterval(() => {
        setVideoProgressSeconds(prev => {
          if (prev >= totalVideoDuration) {
            setIsPlaying(false);
            handleToggleComplete();
            return totalVideoDuration;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, totalVideoDuration]);

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
      setVideoProgressSeconds(currentLesson.completed ? totalVideoDuration : 0);
      setIsPlaying(false);
    }
  }, [currentLesson, totalVideoDuration]);

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
      setTimeout(() => setShowCelebration(false), 3500);

      // If autoplay next is enabled and there is a next lecture
      if (autoPlayNext && flatCurrentIndex < allLessons.length - 1) {
        setTimeout(() => {
          handleNextLesson();
        }, 1500);
      }
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

  const handleAppendMarkdown = (syntax) => {
    setLessonNotes(prev => prev + syntax);
  };

  const handleDownloadNotes = () => {
    const element = document.createElement('a');
    const file = new Blob([lessonNotes || `# Notes for ${currentLesson?.title}\n`], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `${currentLesson?.title || 'lecture'}-notes.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
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

  const handlePostQuestion = (e) => {
    e.preventDefault();
    if (!newQuestionTitle.trim() || !newQuestionBody.trim()) return;

    const newQ = {
      id: `qa-${Date.now()}`,
      author: 'Sarah Chen',
      role: 'Student',
      avatar: 'SC',
      question: newQuestionTitle.trim(),
      body: newQuestionBody.trim(),
      upvotes: 1,
      isPinned: false,
      timeAgo: 'Just now',
      replies: 0
    };

    setQaQuestions(prev => [newQ, ...prev]);
    setNewQuestionTitle('');
    setNewQuestionBody('');
    setShowNewQuestionForm(false);
  };

  const handleUpvoteQuestion = (qId) => {
    setQaQuestions(prev => prev.map(q => q.id === qId ? { ...q, upvotes: q.upvotes + 1 } : q));
  };

  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!course) {
    return (
      <div className="p-12 text-center space-y-4 font-sans">
        <p className="text-base font-bold text-[#211E1A]">Loading course player...</p>
        <Link to="/learner/my-learning" className="text-xs font-bold text-[#D92D2D] hover:underline">
          ← Return to My Learning
        </Link>
      </div>
    );
  }

  const isCurrentBookmarked = Boolean(currentLesson && bookmarkedLessons[currentLesson.id]);

  return (
    <div className={`space-y-4 animate-fade-in font-sans ${isTheaterMode ? 'max-w-7xl mx-auto' : ''}`}>
      {/* Top Header Bar */}
      <div className="bg-white border-2 border-[#B6AA9A] rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/learner/my-learning"
            className="p-2 rounded-xl bg-[#EAE3DA] hover:bg-[#D6D0C8] border border-[#B6AA9A] text-[#211E1A] text-xs font-bold transition-colors shrink-0"
            title="Back to My Learning"
          >
            ← My Learning
          </Link>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A]">
                {course.category}
              </span>
              <span className="text-xs text-[#71675D] hidden sm:inline">
                by {course.instructor}
              </span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {course.progressPercent}% Completed
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-black text-[#211E1A] truncate max-w-xl mt-0.5">
              {course.title}
            </h1>
          </div>
        </div>

        {/* Action Controls & Modal Triggers */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full md:w-auto justify-between md:justify-end">
          {/* Certificate Jump if 100% complete */}
          {course.progressPercent >= 100 && (
            <button
              type="button"
              onClick={() => setIsCertificateOpen(true)}
              className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-400 rounded-xl text-xs font-black transition-all shadow-2xs flex items-center gap-1.5 animate-pulse"
            >
              <span>🏆</span>
              <span>View Credential</span>
            </button>
          )}

          {/* Diagnostic Practice Test Trigger */}
          <button
            type="button"
            onClick={() => setIsPracticeOpen(true)}
            className="px-3 py-1.5 bg-[#EAE3DA] hover:bg-[#D6D0C8] text-[#211E1A] border border-[#B6AA9A] rounded-xl text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5"
            title="Launch Adaptive Diagnostic Test"
          >
            <span>🎯</span>
            <span className="hidden sm:inline">Practice Quiz</span>
          </button>

          {/* Course Review Trigger */}
          <button
            type="button"
            onClick={() => setIsReviewOpen(true)}
            className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-colors shadow-2xs flex items-center gap-1"
            title="Leave a Course Review"
          >
            <span>★</span>
            <span className="hidden sm:inline">Review</span>
          </button>

          {/* Bookmark Toggle */}
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
                : 'bg-[#211E1A] hover:bg-black text-white hover:scale-102'
            }`}
          >
            <span>{currentLesson?.completed ? '✓ Completed' : 'Mark as Complete'}</span>
          </button>

          {/* Theater Mode & Curriculum Syllabus Toggles */}
          <button
            type="button"
            onClick={() => setIsTheaterMode(prev => !prev)}
            className={`p-2 rounded-xl border text-xs font-bold transition-colors ${
              isTheaterMode
                ? 'bg-[#211E1A] text-white border-black'
                : 'bg-[#EAE3DA] hover:bg-[#D6D0C8] border-[#B6AA9A] text-[#211E1A]'
            }`}
            title={isTheaterMode ? 'Standard View' : 'Theater / Expand View'}
          >
            <span>⛶</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSidebarOpen(prev => !prev)}
            className={`p-2 rounded-xl border text-xs font-bold transition-colors ${
              isSidebarOpen
                ? 'bg-[#211E1A] text-white border-black'
                : 'bg-[#EAE3DA] hover:bg-[#D6D0C8] border-[#B6AA9A] text-[#211E1A]'
            }`}
            title={isSidebarOpen ? 'Hide Curriculum Syllabus' : 'Show Curriculum Syllabus'}
          >
            <span>📋</span>
          </button>
        </div>
      </div>

      {/* Main Learning Canvas Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Content Stage */}
        <div className={`${isSidebarOpen ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-4`}>
          {/* ========================================================
              LESSON STAGE RENDERER (VIDEO / CODING / ARTICLE / QUIZ)
             ======================================================== */}
          {currentLesson?.type === 'Coding Exercise' ? (
            /* Coding Exercise View */
            <CodingWorkspace
              lesson={currentLesson}
              onCompleteExercise={handleToggleComplete}
            />
          ) : currentLesson?.type === 'Video' ? (
            /* Realistic Animated Video Player Stage */
            <div className="bg-black rounded-3xl overflow-hidden border-2 border-[#B6AA9A] shadow-xl relative aspect-video flex flex-col justify-between select-none">
              {/* Simulated Video Stage Content */}
              <div className="flex-1 flex items-center justify-center relative group p-6">
                <div className="text-center space-y-3">
                  <button
                    type="button"
                    onClick={() => setIsPlaying(prev => !prev)}
                    className="w-16 h-16 rounded-full bg-[#D92D2D] hover:bg-[#B91C1C] text-white flex items-center justify-center text-2xl shadow-xl transition-transform hover:scale-110 pl-1 mx-auto"
                    aria-label={isPlaying ? 'Pause video' : 'Play video'}
                  >
                    {isPlaying ? '⏸' : '▶'}
                  </button>
                  <p className="text-stone-300 text-xs font-semibold">
                    {isPlaying ? 'Streaming 1080p high-definition lecture...' : 'Click to stream lecture with live subtitles'}
                  </p>
                </div>

                {/* Subtitles Overlay if Enabled */}
                {captionsEnabled && isPlaying && (
                  <div className="absolute bottom-16 inset-x-8 text-center pointer-events-none animate-fade-in">
                    <span className="bg-black/85 text-white px-3 py-1.5 rounded-lg text-xs font-medium border border-stone-800 shadow-md">
                      "...and when backpropagating through deep computation graphs, memory stride alignment is preserved."
                    </span>
                  </div>
                )}
              </div>

              {/* Scrubber Progress Bar */}
              <div className="px-4 pt-1 bg-black/90">
                <input
                  type="range"
                  min={0}
                  max={totalVideoDuration}
                  value={videoProgressSeconds}
                  onChange={(e) => setVideoProgressSeconds(Number(e.target.value))}
                  className="w-full h-1.5 bg-stone-700 accent-[#D92D2D] rounded-lg cursor-pointer"
                />
              </div>

              {/* Video Player Bottom Controls Bar */}
              <div className="bg-gradient-to-t from-black via-black/95 to-black/90 p-4 flex flex-wrap items-center justify-between text-white text-xs gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPlaying(prev => !prev)}
                    className="font-bold hover:text-[#D92D2D] transition-colors p-1"
                  >
                    {isPlaying ? 'Pause' : 'Play'}
                  </button>

                  <span className="text-stone-400 font-mono text-[11px]">
                    {formatSeconds(videoProgressSeconds)} / {formatSeconds(totalVideoDuration)}
                  </span>

                  {/* Volume Control */}
                  <div className="flex items-center gap-1.5 pl-2">
                    <button
                      type="button"
                      onClick={() => setIsMuted(prev => !prev)}
                      className="text-stone-300 hover:text-white"
                      title={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted || volume === 0 ? '🔇' : '🔊'}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={isMuted ? 0 : volume}
                      onChange={(e) => {
                        setVolume(Number(e.target.value));
                        if (isMuted) setIsMuted(false);
                      }}
                      className="w-16 h-1 bg-stone-700 accent-stone-300 rounded cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Captions Toggle */}
                  <button
                    type="button"
                    onClick={() => setCaptionsEnabled(prev => !prev)}
                    className={`px-2 py-0.5 rounded text-[10px] font-black border transition-colors ${
                      captionsEnabled
                        ? 'bg-stone-200 text-black border-white'
                        : 'bg-stone-800 text-stone-400 border-stone-700'
                    }`}
                    title="Toggle closed captions"
                  >
                    CC
                  </button>

                  {/* Playback speed selector */}
                  <div className="flex items-center gap-1 bg-stone-800/90 px-2 py-0.5 rounded-lg border border-stone-700">
                    {['0.75x', '1.0x', '1.25x', '1.5x'].map((spd) => (
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

                  {/* Autoplay Next Toggle */}
                  <label className="hidden sm:flex items-center gap-1.5 text-[11px] text-stone-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoPlayNext}
                      onChange={(e) => setAutoPlayNext(e.target.checked)}
                      className="rounded accent-[#D92D2D]"
                    />
                    <span>Autoplay Next</span>
                  </label>

                  <span className="text-stone-400 text-[10px] font-mono hidden md:inline">1080p HD</span>
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
                  Test your mastery of the concepts covered in this module. Quizzes feature multiple-choice and scenario-based evaluations with automated scoring.
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
                {currentLesson?.content || currentLesson?.summary || 'Review the core architectural takeaways outlined for this lecture.'}
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
              BELOW-PLAYER TABS: NOTES, RESOURCES, Q&A
             ======================================================== */}
          <div className="bg-white border-2 border-[#B6AA9A] rounded-3xl p-6 shadow-sm space-y-4">
            {/* Tabs Bar */}
            <div className="flex items-center justify-between border-b border-[#B6AA9A]/60 pb-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('notes')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    activeTab === 'notes'
                      ? 'bg-[#EAE3DA] text-[#D92D2D] border border-[#B6AA9A] shadow-2xs'
                      : 'text-[#514940] hover:text-[#211E1A]'
                  }`}
                >
                  📝 Study Notebook
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
                  💬 Q&A Discussion ({qaQuestions.length})
                </button>
              </div>

              {activeTab === 'notes' && (
                <button
                  type="button"
                  onClick={handleDownloadNotes}
                  className="text-[11px] font-bold text-[#514940] hover:text-[#211E1A] hidden sm:inline"
                >
                  Export Markdown (.md) ⤓
                </button>
              )}
            </div>

            {/* Tab: Notes with Markdown formatting toolbar */}
            {activeTab === 'notes' && (
              <div className="space-y-3 animate-fade-in">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[#EAE3DA]/60 border border-[#B6AA9A]/60 rounded-xl text-xs">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleAppendMarkdown('**Bold text** ')}
                      className="px-2 py-0.5 rounded bg-white font-bold border border-[#B6AA9A] hover:bg-stone-50"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAppendMarkdown('*Italic text* ')}
                      className="px-2 py-0.5 rounded bg-white italic border border-[#B6AA9A] hover:bg-stone-50"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAppendMarkdown('`code` ')}
                      className="px-2 py-0.5 rounded bg-white font-mono border border-[#B6AA9A] hover:bg-stone-50"
                    >
                      &lt;/&gt;
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAppendMarkdown('\n- Bullet point ')}
                      className="px-2 py-0.5 rounded bg-white border border-[#B6AA9A] hover:bg-stone-50"
                    >
                      • List
                    </button>
                  </div>

                  <span className="text-[11px] text-emerald-800 font-bold">
                    ✓ Autosaved to local storage
                  </span>
                </div>

                <textarea
                  value={lessonNotes}
                  onChange={handleSaveNotes}
                  placeholder="Type notes for this lecture... notes persist automatically across sessions and can be exported as markdown."
                  rows={5}
                  className="w-full p-3.5 bg-[#EAE3DA]/30 border border-[#B6AA9A] rounded-xl text-xs text-[#211E1A] focus:outline-none focus:border-[#D92D2D] focus:ring-1 focus:ring-[#D92D2D] leading-relaxed font-sans"
                />
              </div>
            )}

            {/* Tab: Resources */}
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
                    onClick={() => alert('Downloading official lecture slides PDF...')}
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

            {/* Tab: Interactive Q&A */}
            {activeTab === 'qa' && (
              <div className="space-y-4 animate-fade-in text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#514940]">Questions asked in this lecture:</span>
                  <button
                    type="button"
                    onClick={() => setShowNewQuestionForm(prev => !prev)}
                    className="px-3 py-1.5 bg-[#211E1A] hover:bg-black text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    {showNewQuestionForm ? 'Cancel' : '+ Ask Question'}
                  </button>
                </div>

                {showNewQuestionForm && (
                  <form onSubmit={handlePostQuestion} className="p-4 bg-[#EAE3DA]/60 border border-[#B6AA9A] rounded-2xl space-y-3 animate-slide-down">
                    <input
                      type="text"
                      value={newQuestionTitle}
                      onChange={(e) => setNewQuestionTitle(e.target.value)}
                      placeholder="Question Headline (e.g., How does backward() handle multiple loss tensors?)"
                      className="w-full p-2.5 bg-white border border-[#B6AA9A] rounded-xl text-xs text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
                      required
                    />
                    <textarea
                      value={newQuestionBody}
                      onChange={(e) => setNewQuestionBody(e.target.value)}
                      placeholder="Add detailed context or code snippet..."
                      rows={3}
                      className="w-full p-2.5 bg-white border border-[#B6AA9A] rounded-xl text-xs text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
                      required
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#D92D2D] hover:bg-[#B91C1C] text-white rounded-xl text-xs font-bold"
                      >
                        Post Question
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-3">
                  {qaQuestions.map((q) => (
                    <div
                      key={q.id}
                      className="p-4 bg-[#EAE3DA]/40 border border-[#B6AA9A] rounded-2xl space-y-2 hover:bg-[#EAE3DA]/70 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-[#211E1A] text-white flex items-center justify-center font-bold text-[10px]">
                            {q.avatar}
                          </div>
                          <span className="font-extrabold text-[#211E1A]">{q.author}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${q.role === 'Instructor' ? 'bg-amber-100 text-amber-900' : 'bg-white text-stone-600'}`}>
                            {q.role}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#71675D]">{q.timeAgo}</span>
                      </div>

                      <h4 className="font-extrabold text-xs text-[#211E1A]">{q.question}</h4>
                      <p className="text-xs text-[#514940] leading-relaxed">{q.body}</p>

                      <div className="pt-2 border-t border-[#B6AA9A]/30 flex items-center justify-between text-[11px]">
                        <button
                          type="button"
                          onClick={() => handleUpvoteQuestion(q.id)}
                          className="flex items-center gap-1 font-bold text-[#514940] hover:text-[#D92D2D] transition-colors"
                        >
                          <span>▲</span>
                          <span>{q.upvotes} Upvotes</span>
                        </button>
                        <span className="text-[#71675D]">{q.replies} Replies</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Curriculum Syllabus Drawer (Right Column) */}
        {isSidebarOpen && (
          <div className="lg:col-span-4 space-y-4 animate-slide-right">
            <div className="bg-white border-2 border-[#B6AA9A] rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#B6AA9A]/60 pb-3">
                <h3 className="font-black text-sm text-[#211E1A]">
                  Course Curriculum
                </h3>
                <span className="text-[10px] font-bold text-[#71675D]">
                  {allLessons.length} Lectures Total
                </span>
              </div>

              {/* Curriculum Search & Format Filter */}
              <div className="space-y-2">
                <input
                  type="text"
                  value={curriculumSearch}
                  onChange={(e) => setCurriculumSearch(e.target.value)}
                  placeholder="Filter curriculum..."
                  className="w-full px-3 py-1.5 text-xs bg-[#EAE3DA]/50 border border-[#B6AA9A] rounded-xl text-[#211E1A] placeholder-[#71675D] focus:outline-none focus:border-[#D92D2D]"
                />

                <div className="flex items-center gap-1 overflow-x-auto text-[10px] font-bold">
                  {['all', 'Video', 'Coding Exercise', 'Quiz'].map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setCurriculumTypeFilter(fmt)}
                      className={`px-2 py-0.5 rounded-lg border whitespace-nowrap transition-colors ${
                        curriculumTypeFilter === fmt
                          ? 'bg-[#211E1A] text-white border-black'
                          : 'bg-[#EAE3DA] text-[#514940] border-[#B6AA9A]'
                      }`}
                    >
                      {fmt === 'all' ? 'All Types' : fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Module & Lesson Accordions */}
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {(course.modules || []).map((module, modIdx) => {
                  const filteredLessons = (module.lessons || []).filter(les => {
                    if (curriculumTypeFilter !== 'all' && les.type !== curriculumTypeFilter) return false;
                    if (curriculumSearch.trim()) {
                      return les.title.toLowerCase().includes(curriculumSearch.toLowerCase());
                    }
                    return true;
                  });

                  if (filteredLessons.length === 0) return null;

                  return (
                    <div key={module.id || modIdx} className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-black text-[#514940] bg-[#EAE3DA]/60 p-2 rounded-xl">
                        <span className="truncate pr-2">{module.title}</span>
                        <span className="text-[10px] font-bold text-[#71675D] shrink-0">
                          {filteredLessons.filter(l => l.completed).length}/{filteredLessons.length}
                        </span>
                      </div>

                      <div className="space-y-1.5 pl-1">
                        {filteredLessons.map((lesson, lesIdx) => {
                          const isCurrent = currentModuleIndex === modIdx && currentLessonIndex === lesIdx;

                          return (
                            <button
                              key={lesson.id || lesIdx}
                              type="button"
                              onClick={() => handleSelectLesson(modIdx, lesIdx)}
                              className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-start gap-2.5 ${
                                isCurrent
                                  ? 'bg-[#211E1A] text-white border-black shadow-xs'
                                  : 'bg-[#EAE3DA]/30 hover:bg-[#EAE3DA] border-[#B6AA9A]/50 text-[#211E1A]'
                              }`}
                            >
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5 ${
                                lesson.completed
                                  ? 'bg-emerald-600 text-white'
                                  : isCurrent
                                  ? 'bg-[#D92D2D] text-white animate-pulse'
                                  : 'bg-stone-200 text-stone-500'
                              }`}>
                                {lesson.completed ? '✓' : isCurrent ? '▶' : lesIdx + 1}
                              </span>

                              <div className="flex-1 min-w-0">
                                <p className="font-bold truncate text-[11px] leading-tight">
                                  {lesson.title}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5 text-[9px] opacity-75">
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
                  );
                })}
              </div>
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
            <p className="text-[10px] text-stone-300">
              {course.progressPercent >= 100
                ? 'Course 100% finished! Your certificate is unlocked.'
                : 'Progress recorded in your university curriculum.'}
            </p>
          </div>
        </div>
      )}

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

      {/* Certificate Modal */}
      <CertificateModal
        isOpen={isCertificateOpen}
        onClose={() => setIsCertificateOpen(false)}
        certificate={{
          courseTitle: course?.title,
          instructor: course?.instructor,
          studentName: 'Sarah Chen',
          certificateNumber: `LS-${course?.id?.toUpperCase()}-2026`,
          issueDate: 'October 2026'
        }}
      />
    </div>
  );
}
