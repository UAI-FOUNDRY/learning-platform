import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import CourseStatusBadge from '../../components/instructor/CourseStatusBadge';
import AdminFeedbackBanner from '../../components/instructor/AdminFeedbackBanner';
import { instructorCourseService } from '../../services/instructorCourseService';
import { mockCategories } from '../../data/mockCategories';

const LESSON_TYPES = [
  { value: 'Video', label: '🎥 Video Lecture', color: 'bg-blue-100 text-blue-900 border-blue-200' },
  { value: 'Coding Exercise', label: '💻 Coding Exercise', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  { value: 'Article', label: '📄 Reading & Notes', color: 'bg-gray-100 text-gray-800 border-gray-300' },
  { value: 'Quiz', label: '📝 Practice Quiz', color: 'bg-purple-100 text-purple-900 border-purple-200' }
];

export default function CourseEditor() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [course, setCourse] = useState(() => instructorCourseService.getCourse(id));
  const [activeTab, setActiveTab] = useState('curriculum'); // 'curriculum' | 'settings'

  // Notification Toast
  const [notice, setNotice] = useState(location.state?.notice || null);

  // New Module & New Lesson inputs
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newLessonTitle, setNewLessonTitle] = useState({});
  const [newLessonType, setNewLessonType] = useState({});
  const [newLessonDuration, setNewLessonDuration] = useState({});

  // Accordion collapsed state per module ID
  const [collapsedModules, setCollapsedModules] = useState({});

  // Editing metadata
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editLevel, setEditLevel] = useState('Beginner');

  // Confirmation modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reloadCourse = useCallback(() => {
    const updated = instructorCourseService.getCourse(id);
    setCourse(updated);
    if (updated) {
      setEditTitle(updated.title || '');
      setEditDescription(updated.description || '');
      setEditCategory(updated.category || '');
      setEditLevel(updated.level || 'Beginner');
    }
  }, [id]);

  useEffect(() => {
    reloadCourse();
  }, [reloadCourse]);

  useEffect(() => {
    const unsubscribe = instructorCourseService.subscribe(reloadCourse);
    return () => unsubscribe();
  }, [reloadCourse]);

  if (!course) {
    return (
      <PageContainer>
        <div className="bg-white border border-[#B6AA9A] rounded-xl p-8 text-center max-w-xl mx-auto my-12 shadow-xs animate-scale-in">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#EAE3DA] flex items-center justify-center text-[#71675D]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="mt-4 text-lg font-extrabold text-[#211E1A]">Course Not Found</h2>
          <p className="mt-1 text-xs text-[#514940]">
            The requested course ID <span className="font-mono text-[#D92D2D]">{id}</span> does not exist in your local session records.
          </p>
          <div className="mt-6">
            <Link
              to="/instructor/courses"
              className="px-4 py-2 text-xs font-bold rounded-lg bg-[#D92D2D] text-white hover:bg-[#B91C1C]"
            >
              Back to My Courses
            </Link>
          </div>
        </div>
      </PageContainer>
    );
  }

  const persist = (changes, message = 'Curriculum changes saved in local session.') => {
    const updated = instructorCourseService.updateCourse(id, changes);
    setCourse(updated);
    setNotice(message);
    setTimeout(() => setNotice(null), 4000);
  };

  const toggleModuleCollapse = (moduleId) => {
    setCollapsedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  // Add a new section / module
  const handleAddModule = () => {
    if (!newModuleTitle.trim()) return;
    const modules = course.modules || [];
    const newMod = {
      id: `mod-${Date.now()}`,
      title: newModuleTitle.trim(),
      lessons: []
    };
    persist({ modules: [...modules, newMod] }, `Module "${newMod.title}" added successfully.`);
    setNewModuleTitle('');
  };

  // Move Module Up or Down
  const handleMoveModule = (index, direction) => {
    const modules = [...(course.modules || [])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= modules.length) return;

    const temp = modules[index];
    modules[index] = modules[targetIndex];
    modules[targetIndex] = temp;

    persist({ modules }, 'Curriculum section reordered.');
  };

  // Edit module title
  const handleUpdateModuleTitle = (moduleId, title) => {
    const modules = (course.modules || []).map((m) =>
      m.id === moduleId ? { ...m, title: title.trim() } : m
    );
    persist({ modules }, 'Module title updated.');
  };

  // Delete module
  const handleRemoveModule = (moduleId, moduleTitle) => {
    if (window.confirm(`Are you sure you want to remove "${moduleTitle}" and all its lessons?`)) {
      const modules = (course.modules || []).filter((m) => m.id !== moduleId);
      persist({ modules }, `Module "${moduleTitle}" removed.`);
    }
  };

  // Add lesson to module
  const handleAddLesson = (moduleId) => {
    const title = (newLessonTitle[moduleId] || '').trim();
    if (!title) return;

    const type = newLessonType[moduleId] || 'Video';
    const duration = (newLessonDuration[moduleId] || '15 min').trim();

    const newLesson = {
      id: `les-${Date.now()}`,
      title,
      type,
      duration
    };

    const modules = (course.modules || []).map((m) => {
      if (m.id === moduleId) {
        return {
          ...m,
          lessons: [...(m.lessons || []), newLesson]
        };
      }
      return m;
    });

    persist({ modules }, `Lesson "${title}" added.`);
    setNewLessonTitle(prev => ({ ...prev, [moduleId]: '' }));
    setNewLessonDuration(prev => ({ ...prev, [moduleId]: '' }));
  };

  // Update lesson title
  const handleUpdateLessonTitle = (moduleId, lessonId, newTitle) => {
    const modules = (course.modules || []).map((m) => {
      if (m.id === moduleId) {
        return {
          ...m,
          lessons: (m.lessons || []).map((l) =>
            l.id === lessonId ? { ...l, title: newTitle.trim() } : l
          )
        };
      }
      return m;
    });
    persist({ modules }, 'Lesson title updated.');
  };

  // Update lesson type
  const handleUpdateLessonType = (moduleId, lessonId, newType) => {
    const modules = (course.modules || []).map((m) => {
      if (m.id === moduleId) {
        return {
          ...m,
          lessons: (m.lessons || []).map((l) =>
            l.id === lessonId ? { ...l, type: newType } : l
          )
        };
      }
      return m;
    });
    persist({ modules }, `Lesson type updated to ${newType}.`);
  };

  // Remove lesson
  const handleRemoveLesson = (moduleId, lessonId) => {
    const modules = (course.modules || []).map((m) => {
      if (m.id === moduleId) {
        return {
          ...m,
          lessons: (m.lessons || []).filter((l) => l.id !== lessonId)
        };
      }
      return m;
    });
    persist({ modules }, 'Lesson removed.');
  };

  // Save general settings
  const handleSaveSettings = () => {
    if (!editTitle.trim()) {
      alert('Course title cannot be empty.');
      return;
    }
    persist(
      {
        title: editTitle.trim(),
        description: editDescription.trim(),
        category: editCategory,
        level: editLevel
      },
      'Course metadata settings updated.'
    );
  };

  // Submission workflow transition
  const handleWorkflowSubmit = () => {
    setIsSubmitting(true);
    try {
      const updated = instructorCourseService.submitForReview(course.id);
      setCourse(updated);
      setIsSubmitModalOpen(false);
      setNotice('Course submitted for Super Admin review! (Simulated locally)');
      setTimeout(() => setNotice(null), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalLessons = (course.modules || []).reduce(
    (sum, m) => sum + (m.lessons || []).length,
    0
  );

  return (
    <PageContainer>
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="mb-4 animate-fade-in">
        <ol className="flex items-center gap-2 text-xs text-[#71675D]">
          <li>
            <Link to="/instructor/courses" className="hover:text-[#211E1A] hover:underline">
              My Courses
            </Link>
          </li>
          <li>/</li>
          <li className="text-[#514940] truncate max-w-xs">{course.title}</li>
          <li>/</li>
          <li className="font-extrabold text-[#211E1A]">Curriculum Editor</li>
        </ol>
      </nav>

      {/* Course Header Banner */}
      <div className="pb-6 border-b border-[#B6AA9A] animate-slide-up">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-[#EAE3DA] text-[#D92D2D] border border-[#B6AA9A]">
                {course.category}
              </span>
              <CourseStatusBadge status={course.status} />
              <span className="text-xs font-semibold text-[#71675D]">
                {(course.modules || []).length} Sections • {totalLessons} Lectures & Coding Exercises
              </span>
            </div>

            <h1 className="mt-2 text-[24px] sm:text-[30px] font-extrabold tracking-tight text-[#211E1A] font-sans leading-tight">
              {course.title}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#514940] line-clamp-2 max-w-3xl">
              {course.description || 'No description provided.'}
            </p>
          </div>

          {/* Submission and Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to={`/instructor/courses/${course.id}/preview`}
              className="px-3.5 py-2 text-xs font-bold rounded-lg bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] hover:bg-[#D6D0C8] transition-colors"
            >
              Preview Course
            </Link>

            {course.status === 'Changes Requested' ? (
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(true)}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-[#D92D2D] text-white hover:bg-[#B91C1C] transition-all shadow-md hover:shadow-lg"
              >
                Resubmit Course
              </button>
            ) : course.status === 'Draft' ? (
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(true)}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-[#D92D2D] text-white hover:bg-[#B91C1C] transition-all shadow-md hover:shadow-lg"
              >
                Submit for Review
              </button>
            ) : course.status === 'Pending Review' ? (
              <span className="px-3.5 py-2 text-xs font-bold rounded-lg bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
                ⏳ In Admin Review Queue
              </span>
            ) : (
              <span className="px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs">
                ✓ Published Live
              </span>
            )}
          </div>
        </div>

        {/* Global Notice Toast */}
        {notice && (
          <div
            role="status"
            className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs sm:text-sm font-semibold flex items-center justify-between animate-slide-down shadow-xs"
          >
            <div className="flex items-center gap-2">
              <span>✓</span>
              <span>{notice}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-emerald-900 font-bold px-2 hover:opacity-75"
            >
              ✕
            </button>
          </div>
        )}

        {/* Admin Feedback Banner for Changes Requested */}
        {course.status === 'Changes Requested' && course.feedback && (
          <div className="mt-5">
            <AdminFeedbackBanner
              feedback={course.feedback}
              feedbackDate={course.feedbackDate}
              onResubmit={() => setIsSubmitModalOpen(true)}
              isSubmitting={isSubmitting}
            />
          </div>
        )}

        {/* Tabs: Curriculum vs Settings */}
        <div className="mt-6 flex items-center gap-3 border-b border-[#B6AA9A]/50">
          <button
            type="button"
            onClick={() => setActiveTab('curriculum')}
            className={`pb-2.5 px-2 text-xs sm:text-sm font-extrabold border-b-2 transition-all ${
              activeTab === 'curriculum'
                ? 'border-[#D92D2D] text-[#D92D2D]'
                : 'border-transparent text-[#514940] hover:text-[#211E1A]'
            }`}
          >
            Curriculum Hierarchy ({(course.modules || []).length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`pb-2.5 px-2 text-xs sm:text-sm font-extrabold border-b-2 transition-all ${
              activeTab === 'settings'
                ? 'border-[#D92D2D] text-[#D92D2D]'
                : 'border-transparent text-[#514940] hover:text-[#211E1A]'
            }`}
          >
            Course Metadata & Details
          </button>
        </div>
      </div>

      {/* Tab 1: Curriculum & Content Organization */}
      {activeTab === 'curriculum' && (
        <div className="mt-8 space-y-6 max-w-4xl animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-[#211E1A]">
                Course Curriculum Hierarchy
              </h2>
              <p className="text-xs text-[#514940] mt-0.5">
                Organize sections, lectures, and interactive coding exercises. Students write code alongside video lectures.
              </p>
            </div>

            <div className="text-xs text-[#71675D]">
              {(course.modules || []).length} Sections • {totalLessons} Lessons
            </div>
          </div>

          {/* Module List with Accordion and Reorder Controls */}
          <div className="space-y-5">
            {(course.modules || []).map((module, mIndex) => {
              const isCollapsed = collapsedModules[module.id];

              return (
                <div
                  key={module.id}
                  className="bg-white border border-[#B6AA9A] rounded-xl overflow-hidden shadow-xs hover:border-[#B6AA9A] transition-all"
                >
                  {/* Module Header Bar */}
                  <div className="p-4 sm:p-5 bg-[#EAE3DA] border-b border-[#B6AA9A] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Collapse Toggle Chevron */}
                      <button
                        type="button"
                        onClick={() => toggleModuleCollapse(module.id)}
                        className="text-[#514940] hover:text-[#211E1A] p-1 rounded hover:bg-[#C8BBAA]/50 transition-transform"
                        aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
                      >
                        <svg
                          className={`w-4 h-4 transform transition-transform duration-200 ${
                            isCollapsed ? '-rotate-90' : 'rotate-0'
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      <span className="w-7 h-7 rounded-lg bg-[#C8BBAA] border border-[#B6AA9A] text-[#211E1A] font-extrabold text-xs flex items-center justify-center shrink-0">
                        {mIndex + 1}
                      </span>

                      <input
                        type="text"
                        defaultValue={module.title}
                        onBlur={(e) => {
                          if (e.target.value.trim() && e.target.value !== module.title) {
                            handleUpdateModuleTitle(module.id, e.target.value);
                          }
                        }}
                        className="font-bold text-sm sm:text-base text-[#211E1A] bg-transparent hover:bg-white/70 focus:bg-white px-2 py-1 rounded border border-transparent focus:border-[#B6AA9A] outline-none flex-1 truncate transition-colors"
                        aria-label={`Module ${mIndex + 1} title`}
                      />
                    </div>

                    {/* Module Controls (Move, Lesson Count, Remove) */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Reorder Buttons */}
                      <div className="flex items-center rounded-lg border border-[#B6AA9A] bg-white overflow-hidden">
                        <button
                          type="button"
                          onClick={() => handleMoveModule(mIndex, 'up')}
                          disabled={mIndex === 0}
                          className="px-2 py-1 text-xs text-[#514940] hover:bg-[#EAE3DA] disabled:opacity-30 disabled:hover:bg-white"
                          title="Move module up"
                          aria-label="Move module up"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveModule(mIndex, 'down')}
                          disabled={mIndex === (course.modules || []).length - 1}
                          className="px-2 py-1 text-xs text-[#514940] hover:bg-[#EAE3DA] disabled:opacity-30 disabled:hover:bg-white"
                          title="Move module down"
                          aria-label="Move module down"
                        >
                          ▼
                        </button>
                      </div>

                      <span className="text-[11px] font-semibold text-[#71675D] px-2 py-1 rounded bg-[#EAE3DA] border border-[#B6AA9A]">
                        {(module.lessons || []).length} lessons
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemoveModule(module.id, module.title)}
                        className="text-xs text-[#D92D2D] hover:bg-red-50 font-bold px-2.5 py-1 rounded transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Lessons List in Module (Collapsible) */}
                  {!isCollapsed && (
                    <div className="p-4 sm:p-5 space-y-3 animate-fade-in">
                      {(module.lessons || []).length === 0 ? (
                        <p className="text-xs text-[#71675D] italic py-2">
                          No lessons added to this section yet. Add your first video, article, or coding exercise below.
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          {module.lessons.map((lesson, lIndex) => {
                            const typeMeta = LESSON_TYPES.find(t => t.value === lesson.type) || LESSON_TYPES[0];

                            return (
                              <div
                                key={lesson.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-[#F7F5F2] border border-[#B6AA9A]/60 hover:border-[#B6AA9A] hover:bg-white transition-all shadow-2xs"
                              >
                                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                  <span className="text-xs font-mono font-bold text-[#71675D] w-5">
                                    {lIndex + 1}.
                                  </span>

                                  {/* Type selector */}
                                  <select
                                    value={lesson.type || 'Video'}
                                    onChange={(e) => handleUpdateLessonType(module.id, lesson.id, e.target.value)}
                                    className={`text-[11px] font-bold py-1 px-2.5 rounded-lg border shadow-2xs ${typeMeta.color}`}
                                  >
                                    {LESSON_TYPES.map(t => (
                                      <option key={t.value} value={t.value}>
                                        {t.label}
                                      </option>
                                    ))}
                                  </select>

                                  {/* Lesson Title Inline Input */}
                                  <input
                                    type="text"
                                    defaultValue={lesson.title}
                                    onBlur={(e) => {
                                      if (e.target.value.trim() && e.target.value !== lesson.title) {
                                        handleUpdateLessonTitle(module.id, lesson.id, e.target.value);
                                      }
                                    }}
                                    className="text-xs sm:text-sm font-bold text-[#211E1A] bg-transparent hover:bg-[#EAE3DA]/50 focus:bg-white px-2 py-1 rounded border border-transparent focus:border-[#B6AA9A] outline-none flex-1 truncate transition-colors"
                                    aria-label={`Lesson ${lIndex + 1} title`}
                                  />
                                </div>

                                <div className="flex items-center justify-end gap-3 shrink-0">
                                  <span className="text-[11px] text-[#71675D] font-mono font-semibold px-2 py-0.5 rounded bg-white border border-[#B6AA9A]/50">
                                    {lesson.duration || '15 min'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveLesson(module.id, lesson.id)}
                                    className="text-xs text-[#D92D2D] hover:bg-red-50 p-1.5 rounded font-bold"
                                    aria-label="Delete lesson"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Add Lesson Inside Module Form */}
                      <div className="mt-4 pt-3.5 border-t border-[#B6AA9A]/40 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="text"
                          value={newLessonTitle[module.id] || ''}
                          onChange={(e) =>
                            setNewLessonTitle((prev) => ({ ...prev, [module.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddLesson(module.id);
                            }
                          }}
                          placeholder="New lesson or interactive coding exercise..."
                          className="flex-1 px-3 py-2 text-xs sm:text-sm bg-white border border-[#B6AA9A] rounded-lg text-[#211E1A] placeholder-[#71675D] focus:outline-none focus:border-[#D92D2D]"
                        />

                        <select
                          value={newLessonType[module.id] || 'Video'}
                          onChange={(e) =>
                            setNewLessonType((prev) => ({ ...prev, [module.id]: e.target.value }))
                          }
                          className="px-2.5 py-2 text-xs font-semibold bg-white border border-[#B6AA9A] rounded-lg text-[#211E1A]"
                        >
                          {LESSON_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => handleAddLesson(module.id)}
                          className="px-4 py-2 text-xs font-bold rounded-lg bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] hover:bg-[#D6D0C8] shrink-0 transition-colors"
                        >
                          + Add Lesson
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add New Section / Module Card */}
          <div className="p-5 sm:p-6 bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl shadow-xs">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#211E1A] mb-2">
              Add New Curriculum Section
            </h3>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={newModuleTitle}
                onChange={(e) => setNewModuleTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddModule();
                  }
                }}
                placeholder="e.g. Module 4 — Real-time Distributed Consensus and Raft"
                className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#B6AA9A] rounded-lg text-[#211E1A] placeholder-[#71675D] focus:outline-none focus:border-[#D92D2D]"
              />
              <button
                type="button"
                onClick={handleAddModule}
                className="px-5 py-2.5 text-xs font-bold rounded-lg bg-[#211E1A] text-white hover:bg-black shrink-0 transition-colors shadow-xs"
              >
                + Add Section
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Course Settings & Metadata */}
      {activeTab === 'settings' && (
        <div className="mt-8 space-y-6 max-w-3xl animate-slide-up">
          <div className="bg-white border border-[#B6AA9A] rounded-xl p-5 sm:p-7 shadow-xs space-y-5">
            <h2 className="text-base font-extrabold text-[#211E1A] border-b border-[#B6AA9A]/50 pb-3">
              Course Information & Settings
            </h2>

            <div>
              <label htmlFor="edit-title" className="block text-xs font-bold text-[#211E1A] mb-1">
                Course Title
              </label>
              <input
                id="edit-title"
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#B6AA9A] rounded-lg text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-cat" className="block text-xs font-bold text-[#211E1A] mb-1">
                  Category
                </label>
                <select
                  id="edit-cat"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-[#B6AA9A] rounded-lg text-[#211E1A]"
                >
                  {mockCategories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="edit-lvl" className="block text-xs font-bold text-[#211E1A] mb-1">
                  Skill Level
                </label>
                <select
                  id="edit-lvl"
                  value={editLevel}
                  onChange={(e) => setEditLevel(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-[#B6AA9A] rounded-lg text-[#211E1A]"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="All Levels">All Levels</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="edit-desc" className="block text-xs font-bold text-[#211E1A] mb-1">
                Description
              </label>
              <textarea
                id="edit-desc"
                rows={4}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#B6AA9A] rounded-lg text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-5 py-2.5 text-xs font-bold rounded-lg bg-[#D92D2D] text-white hover:bg-[#B91C1C] shadow-xs hover:shadow transition-all"
              >
                Save Metadata Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course Submission / Resubmission Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#EAE3DA] rounded-2xl shadow-2xl border border-[#B6AA9A] max-w-lg w-full overflow-hidden p-6 animate-scale-in">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#D92D2D]">
                  Course Submission
                </span>
                <h3 className="mt-1 text-lg font-extrabold text-[#211E1A]">
                  {course.status === 'Changes Requested'
                    ? 'Resubmit Course for Super Admin Review'
                    : 'Submit Course for Review'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="text-[#71675D] hover:text-[#211E1A] text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="mt-3 text-xs sm:text-sm text-[#514940] leading-relaxed">
              Confirm submission of <strong>"{course.title}"</strong>. The course curriculum containing {(course.modules || []).length} modules and {totalLessons} lessons will be sent to the Super Admin review queue.
            </p>

            {course.status === 'Changes Requested' && course.feedback && (
              <div className="mt-3 p-3.5 rounded-xl bg-[#FFF5F5] border border-[#D92D2D]/40 text-xs text-[#8A2424] shadow-xs">
                <p className="font-extrabold">Prior admin feedback being addressed:</p>
                <p className="mt-1 italic">{course.feedback}</p>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-white text-[#514940] border border-[#B6AA9A] hover:bg-[#D6D0C8] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleWorkflowSubmit}
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold rounded-lg bg-[#D92D2D] text-white hover:bg-[#B91C1C] disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
              >
                {isSubmitting ? 'Submitting...' : 'Confirm & Resubmit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      <div className="mt-10 pt-6 border-t border-[#B6AA9A]/50 flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/instructor/courses"
          className="text-xs font-bold text-[#514940] hover:text-[#211E1A] hover:underline"
        >
          ← Back to My Courses
        </Link>
        <p className="text-[11px] text-[#71675D]">
          Simulation Mode: Edits are persisted in local browser storage and seamlessly sync with Super Admin Course Approvals.
        </p>
      </div>
    </PageContainer>
  );
}
