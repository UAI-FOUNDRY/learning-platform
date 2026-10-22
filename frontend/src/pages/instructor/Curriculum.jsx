import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { instructorCourseService } from '../../services/instructorCourseService';

export default function Curriculum() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [courses, setCourses] = useState(() => instructorCourseService.getCourses());
  const [selectedCourseId, setSelectedCourseId] = useState(id || (courses[0]?.id || 'crs-inst-101'));
  const [activeCourse, setActiveCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [addingLectureToModuleId, setAddingLectureToModuleId] = useState(null);
  const [newLectureTitle, setNewLectureTitle] = useState('');
  const [newLectureType, setNewLectureType] = useState('Video');
  const [newLectureDuration, setNewLectureDuration] = useState('20 min');
  const [saveToast, setSaveToast] = useState(false);

  useEffect(() => {
    const found = instructorCourseService.getCourseById(selectedCourseId);
    if (found) {
      setActiveCourse(found);
      setModules(found.modules || []);
    }
  }, [selectedCourseId]);

  const handleAddSection = (e) => {
    e.preventDefault();
    if (!newSectionTitle.trim()) return;

    const newModule = {
      id: `mod-${Date.now().toString().slice(-4)}`,
      title: newSectionTitle.trim(),
      lessons: []
    };

    const updated = [...modules, newModule];
    setModules(updated);
    setNewSectionTitle('');
    setIsAddingSection(false);
    triggerAutoSave(updated);
  };

  const handleDeleteSection = (moduleId) => {
    if (window.confirm('Delete this section and all associated lectures?')) {
      const updated = modules.filter(m => m.id !== moduleId);
      setModules(updated);
      triggerAutoSave(updated);
    }
  };

  const handleMoveSection = (index, direction) => {
    const newIdx = index + direction;
    if (newIdx < 0 || newIdx >= modules.length) return;
    const reordered = [...modules];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIdx, 0, moved);
    setModules(reordered);
    triggerAutoSave(reordered);
  };

  const handleAddLecture = (moduleId) => {
    if (!newLectureTitle.trim()) return;

    const newLesson = {
      id: `les-${Date.now().toString().slice(-4)}`,
      title: newLectureTitle.trim(),
      type: newLectureType,
      duration: newLectureDuration.trim() || '15 min'
    };

    const updated = modules.map(m => {
      if (m.id === moduleId) {
        return {
          ...m,
          lessons: [...(m.lessons || []), newLesson]
        };
      }
      return m;
    });

    setModules(updated);
    setNewLectureTitle('');
    setAddingLectureToModuleId(null);
    triggerAutoSave(updated);
  };

  const handleDeleteLecture = (moduleId, lessonId) => {
    const updated = modules.map(m => {
      if (m.id === moduleId) {
        return {
          ...m,
          lessons: (m.lessons || []).filter(l => l.id !== lessonId)
        };
      }
      return m;
    });
    setModules(updated);
    triggerAutoSave(updated);
  };

  const handleMoveLecture = (moduleId, lessonIndex, direction) => {
    const updated = modules.map(m => {
      if (m.id === moduleId) {
        const lessons = [...(m.lessons || [])];
        const newIdx = lessonIndex + direction;
        if (newIdx < 0 || newIdx >= lessons.length) return m;
        const [moved] = lessons.splice(lessonIndex, 1);
        lessons.splice(newIdx, 0, moved);
        return { ...m, lessons };
      }
      return m;
    });
    setModules(updated);
    triggerAutoSave(updated);
  };

  const triggerAutoSave = (updatedModules) => {
    if (activeCourse) {
      instructorCourseService.updateCourse(activeCourse.id, {
        modules: updatedModules
      });
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2500);
    }
  };

  const totalLecturesCount = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#B6AA9A]/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#EAE3DA] text-[#D92D2D] border border-[#B6AA9A]">
              Curriculum Studio
            </span>
            <span className="text-xs text-[#71675D]">
              Structure modules, lectures, and laboratory exercises
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#211E1A] tracking-tight mt-1">
            Curriculum Builder & Sequencing
          </h1>
        </div>

        {/* Course Selector Dropdown */}
        <div className="flex items-center gap-3">
          <select
            value={selectedCourseId}
            onChange={(e) => {
              setSelectedCourseId(e.target.value);
              navigate(`/instructor/courses/${e.target.value}/curriculum`);
            }}
            className="px-3.5 py-2 text-xs bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] font-bold focus:outline-none focus:border-[#D92D2D] shadow-2xs"
          >
            {courses.map(c => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>

          <Link
            to={`/instructor/courses/${selectedCourseId}/content`}
            className="px-4 py-2 bg-[#211E1A] hover:bg-black text-white text-xs font-bold rounded-xl transition-colors shadow-2xs"
          >
            Upload Media →
          </Link>
        </div>
      </div>

      {/* Curriculum Summary Metric Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-[#B6AA9A] rounded-2xl p-4 shadow-2xs">
          <p className="text-xs font-bold text-[#71675D] uppercase">Total Sections</p>
          <p className="text-2xl font-black text-[#211E1A] mt-1">{modules.length}</p>
        </div>
        <div className="bg-white border-2 border-[#B6AA9A] rounded-2xl p-4 shadow-2xs">
          <p className="text-xs font-bold text-[#71675D] uppercase">Total Lectures</p>
          <p className="text-2xl font-black text-[#211E1A] mt-1">{totalLecturesCount}</p>
        </div>
        <div className="bg-white border-2 border-[#B6AA9A] rounded-2xl p-4 shadow-2xs">
          <p className="text-xs font-bold text-[#71675D] uppercase">Estimated Hours</p>
          <p className="text-2xl font-black text-[#211E1A] mt-1">{(totalLecturesCount * 0.4).toFixed(1)}h</p>
        </div>
        <div className="bg-white border-2 border-[#B6AA9A] rounded-2xl p-4 shadow-2xs">
          <p className="text-xs font-bold text-[#71675D] uppercase">Status</p>
          <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-black bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A]">
            {activeCourse?.status || 'Draft'}
          </span>
        </div>
      </div>

      {/* Sections & Lectures Hierarchy Canvas */}
      <div className="space-y-4">
        {modules.map((module, mIdx) => (
          <div
            key={module.id || mIdx}
            className="bg-white border-2 border-[#B6AA9A] rounded-3xl p-5 shadow-sm space-y-4 transition-all"
          >
            {/* Section Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#B6AA9A]/50 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#EAE3DA] text-[#211E1A] font-black text-xs flex items-center justify-center border border-[#B6AA9A]">
                  {mIdx + 1}
                </span>
                <h3 className="font-black text-sm sm:text-base text-[#211E1A]">
                  {module.title}
                </h3>
              </div>

              {/* Section Controls */}
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleMoveSection(mIdx, -1)}
                  disabled={mIdx === 0}
                  className="p-1.5 rounded-lg bg-[#EAE3DA] hover:bg-[#D6D0C8] disabled:opacity-30 text-[#211E1A] text-xs font-bold border border-[#B6AA9A]"
                  title="Move section up"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveSection(mIdx, 1)}
                  disabled={mIdx === modules.length - 1}
                  className="p-1.5 rounded-lg bg-[#EAE3DA] hover:bg-[#D6D0C8] disabled:opacity-30 text-[#211E1A] text-xs font-bold border border-[#B6AA9A]"
                  title="Move section down"
                >
                  ▼
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSection(module.id)}
                  className="px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                >
                  Delete Section
                </button>
              </div>
            </div>

            {/* Lectures List */}
            <div className="space-y-2 pl-2 sm:pl-4">
              {(module.lessons || []).map((lesson, lIdx) => (
                <div
                  key={lesson.id || lIdx}
                  className="p-3 bg-[#EAE3DA]/50 rounded-2xl border border-[#B6AA9A] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#EAE3DA] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-[#71675D]">
                      {mIdx + 1}.{lIdx + 1}
                    </span>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      lesson.type === 'Coding Exercise'
                        ? 'bg-amber-900 text-amber-200'
                        : lesson.type === 'Quiz'
                        ? 'bg-emerald-900 text-emerald-200'
                        : lesson.type === 'Article'
                        ? 'bg-blue-900 text-blue-200'
                        : 'bg-[#211E1A] text-white'
                    }`}>
                      {lesson.type}
                    </span>

                    <span className="font-bold text-xs sm:text-sm text-[#211E1A]">
                      {lesson.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <span className="text-xs text-[#71675D] font-mono">
                      ⏱️ {lesson.duration || '15 min'}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleMoveLecture(module.id, lIdx, -1)}
                      disabled={lIdx === 0}
                      className="p-1 rounded bg-white hover:bg-stone-100 disabled:opacity-30 text-xs text-[#211E1A] border border-[#B6AA9A]"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveLecture(module.id, lIdx, 1)}
                      disabled={lIdx === (module.lessons || []).length - 1}
                      className="p-1 rounded bg-white hover:bg-stone-100 disabled:opacity-30 text-xs text-[#211E1A] border border-[#B6AA9A]"
                    >
                      ▼
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteLecture(module.id, lesson.id)}
                      className="text-[#D92D2D] hover:text-[#B91C1C] font-bold text-xs px-1"
                      title="Remove lecture"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}

              {/* Add Lecture Button / Inline Form */}
              {addingLectureToModuleId === module.id ? (
                <div className="p-4 bg-white border-2 border-dashed border-[#B6AA9A] rounded-2xl space-y-3 animate-scale-in">
                  <h4 className="text-xs font-bold text-[#211E1A]">Add New Lecture to Section</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <input
                      type="text"
                      value={newLectureTitle}
                      onChange={(e) => setNewLectureTitle(e.target.value)}
                      placeholder="e.g. Distributed Training with FSDP"
                      className="sm:col-span-6 px-3 py-2 text-xs bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
                    />

                    <select
                      value={newLectureType}
                      onChange={(e) => setNewLectureType(e.target.value)}
                      className="sm:col-span-3 px-3 py-2 text-xs bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] font-bold focus:outline-none focus:border-[#D92D2D]"
                    >
                      <option value="Video">Video Lecture</option>
                      <option value="Coding Exercise">Coding Exercise</option>
                      <option value="Quiz">Quiz</option>
                      <option value="Article">Article / Reading</option>
                      <option value="Assignment">Assignment</option>
                    </select>

                    <input
                      type="text"
                      value={newLectureDuration}
                      onChange={(e) => setNewLectureDuration(e.target.value)}
                      placeholder="Duration (e.g. 25 min)"
                      className="sm:col-span-3 px-3 py-2 text-xs bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
                    />
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setAddingLectureToModuleId(null)}
                      className="px-3 py-1.5 text-xs font-bold text-[#514940] hover:text-[#211E1A]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddLecture(module.id)}
                      className="px-4 py-1.5 bg-[#D92D2D] hover:bg-[#B91C1C] text-white text-xs font-bold rounded-xl transition-colors shadow-2xs"
                    >
                      Add Lecture
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAddingLectureToModuleId(module.id);
                    setNewLectureTitle('');
                  }}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-[#B6AA9A] text-xs font-bold text-[#514940] hover:text-[#211E1A] hover:bg-[#EAE3DA]/50 transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>+</span>
                  <span>Add Lecture / Activity</span>
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Add New Section Action */}
        {isAddingSection ? (
          <form
            onSubmit={handleAddSection}
            className="bg-white border-2 border-[#B6AA9A] rounded-3xl p-6 shadow-sm space-y-4 animate-scale-in"
          >
            <h3 className="text-sm font-black text-[#211E1A]">Create New Curriculum Section</h3>
            <div>
              <label htmlFor="sec-title" className="block text-xs font-bold text-[#211E1A] mb-1">
                Section Name & Theme
              </label>
              <input
                id="sec-title"
                type="text"
                autoFocus
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                placeholder="e.g. Module 4: High-Performance GPU Inference & Quantization"
                required
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingSection(false)}
                className="px-4 py-2 text-xs font-bold text-[#514940] hover:text-[#211E1A]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#211E1A] hover:bg-black text-white text-xs font-bold rounded-xl transition-colors shadow-2xs"
              >
                Save Section
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsAddingSection(true)}
            className="w-full py-4 rounded-3xl border-2 border-dashed border-[#B6AA9A] bg-white/70 hover:bg-white text-xs sm:text-sm font-black text-[#211E1A] transition-all hover:scale-101 flex items-center justify-center gap-2 shadow-2xs"
          >
            <span>+</span>
            <span>Add New Section to Curriculum</span>
          </button>
        )}
      </div>

      {/* Auto-Save Toast Feedback */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#211E1A] text-white border-2 border-emerald-500 rounded-2xl p-4 shadow-2xl flex items-center gap-3 animate-slide-up">
          <span className="text-xl">✓</span>
          <p className="font-extrabold text-xs">Curriculum Changes Saved to Course!</p>
        </div>
      )}
    </div>
  );
}
