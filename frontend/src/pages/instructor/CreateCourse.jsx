import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import { instructorCourseService } from '../../services/instructorCourseService';
import { mockCategories } from '../../data/mockCategories';

const THUMBNAIL_PRESETS = [
  { label: 'AI & Machine Learning', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80' },
  { label: 'Software Architecture', url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80' },
  { label: 'Cloud & Kubernetes', url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=600&q=80' },
  { label: 'Cybersecurity & Defense', url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80' }
];

export default function CreateCourse() {
  const navigate = useNavigate();

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(mockCategories[0]?.name || 'Software Engineering');
  const [level, setLevel] = useState('Beginner');
  const [language, setLanguage] = useState('English');
  const [thumbnail, setThumbnail] = useState(THUMBNAIL_PRESETS[0].url);

  // Dynamic Objectives & Prerequisites
  const [learningObjectives, setLearningObjectives] = useState([
    'Master core principles and industry best practices',
    'Write clean, test-driven code and solve complex architectural challenges'
  ]);
  const [newObjective, setNewObjective] = useState('');

  const [prerequisites, setPrerequisites] = useState([
    'Basic programming literacy and analytical thinking'
  ]);
  const [newPrerequisite, setNewPrerequisite] = useState('');

  // Active Wizard Section / Progress
  const [currentStep, setCurrentStep] = useState(1); // 1: Details, 2: Media, 3: Objectives

  // Validation & Submission
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate form
  const validateForm = () => {
    const errs = {};
    if (!title.trim()) {
      errs.title = 'Course title is required.';
    } else if (title.trim().length < 5) {
      errs.title = 'Course title must be at least 5 characters.';
    }

    if (!description.trim()) {
      errs.description = 'Course description is required.';
    } else if (description.trim().length < 20) {
      errs.description = 'Course description must be at least 20 characters.';
    }

    if (!category) {
      errs.category = 'Please select a course category.';
    }

    if (learningObjectives.length === 0) {
      errs.objectives = 'Please provide at least one learning objective.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddObjective = () => {
    if (!newObjective.trim()) return;
    setLearningObjectives([...learningObjectives, newObjective.trim()]);
    setNewObjective('');
    if (errors.objectives) {
      setErrors(prev => ({ ...prev, objectives: null }));
    }
  };

  const handleRemoveObjective = (index) => {
    setLearningObjectives(learningObjectives.filter((_, i) => i !== index));
  };

  const handleAddPrerequisite = () => {
    if (!newPrerequisite.trim()) return;
    setPrerequisites([...prerequisites, newPrerequisite.trim()]);
    setNewPrerequisite('');
  };

  const handleRemovePrerequisite = (index) => {
    setPrerequisites(prerequisites.filter((_, i) => i !== index));
  };

  const handleSave = (status) => {
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    try {
      const created = instructorCourseService.createCourse({
        title,
        description,
        category,
        level,
        language,
        thumbnail,
        learningObjectives,
        prerequisites,
        status // 'Draft' or 'Pending Review'
      });

      if (status === 'Pending Review') {
        navigate('/instructor/courses', {
          state: { notice: `Course "${created.title}" created and submitted to Super Admin review!` }
        });
      } else {
        navigate(`/instructor/courses/${created.id}/edit`, {
          state: { notice: `Course draft "${created.title}" created! You can now organize modules and lessons.` }
        });
      }
    } catch {
      setErrors({ form: 'An error occurred while creating the course. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <li className="font-bold text-[#211E1A]">Create New Course</li>
        </ol>
      </nav>

      {/* Header */}
      <div className="pb-6 border-b border-[#B6AA9A] animate-slide-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[26px] sm:text-[32px] font-extrabold tracking-tight text-[#211E1A] font-sans leading-tight">
              Create New Course
            </h1>
            <p className="mt-1.5 text-[14px] leading-relaxed text-[#514940] max-w-3xl">
              Configure course metadata, category taxonomy, media, and learning objectives. Once saved, you can structure modules and lessons.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/instructor/courses"
              className="px-4 py-2 text-xs font-bold rounded-lg bg-[#EAE3DA] text-[#514940] border border-[#B6AA9A] hover:bg-[#D6D0C8] hover:text-[#211E1A] transition-colors"
            >
              Cancel
            </Link>
          </div>
        </div>

        {/* Global Error Banner */}
        {Object.keys(errors).length > 0 && (
          <div
            role="alert"
            className="mt-4 p-4 rounded-xl bg-red-50 border border-red-300 text-red-950 text-xs sm:text-sm animate-slide-down shadow-xs"
          >
            <p className="font-extrabold">Please correct the highlighted errors before saving:</p>
            <ul className="mt-2 list-disc list-inside space-y-1">
              {Object.values(errors).filter(Boolean).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Interactive Progress Steps */}
        <div className="mt-6 flex items-center justify-between gap-2 max-w-2xl bg-[#EAE3DA] p-1.5 rounded-xl border border-[#B6AA9A]">
          {[
            { step: 1, label: '1. Basic Info' },
            { step: 2, label: '2. Media & Preview' },
            { step: 3, label: '3. Outcomes & Prerequisites' }
          ].map((item) => (
            <button
              key={item.step}
              type="button"
              onClick={() => setCurrentStep(item.step)}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all text-center ${
                currentStep === item.step
                  ? 'bg-[#211E1A] text-white shadow-sm'
                  : 'text-[#514940] hover:text-[#211E1A] hover:bg-[#C8BBAA]/50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Form & Live Preview Grid */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Form Body (2 cols on lg) */}
        <form onSubmit={(e) => e.preventDefault()} className="lg:col-span-2 space-y-8 animate-slide-up">
          {/* Section 1: Basic Information */}
          <section className="bg-white border border-[#B6AA9A] rounded-xl p-5 sm:p-7 shadow-xs space-y-6">
            <div className="border-b border-[#B6AA9A]/50 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-[#211E1A]">
                  1. Basic Course Details
                </h2>
                <p className="text-xs text-[#514940] mt-0.5">
                  General title, taxonomy classification, and target skill level.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-[#D92D2D] bg-[#FFF5F5] px-2 py-0.5 rounded border border-[#D92D2D]/30">
                Required
              </span>
            </div>

            {/* Title */}
            <div>
              <label htmlFor="course-title" className="block text-xs font-bold text-[#211E1A] mb-1">
                Course Title <span className="text-[#D92D2D]">*</span>
              </label>
              <input
                id="course-title"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title) setErrors(prev => ({ ...prev, title: null }));
                }}
                placeholder="e.g. Distributed Systems Architecture with Go & Kafka"
                className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-lg text-[#211E1A] placeholder-[#71675D] focus:outline-none focus:ring-2 ${
                  errors.title
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                    : 'border-[#B6AA9A] focus:border-[#D92D2D] focus:ring-[#D92D2D]/20'
                }`}
              />
              {errors.title && (
                <p className="mt-1.5 text-xs text-red-600 font-semibold">{errors.title}</p>
              )}
              <p className="mt-1 text-[11px] text-[#71675D]">
                A descriptive, professional course title. Minimum 5 characters.
              </p>
            </div>

            {/* Category, Level, Language */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label htmlFor="course-category" className="block text-xs font-bold text-[#211E1A] mb-1">
                  Category <span className="text-[#D92D2D]">*</span>
                </label>
                <select
                  id="course-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs sm:text-sm bg-white border border-[#B6AA9A] rounded-lg text-[#211E1A] focus:outline-none focus:border-[#D92D2D] font-medium"
                >
                  {mockCategories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="course-level" className="block text-xs font-bold text-[#211E1A] mb-1">
                  Difficulty Level
                </label>
                <select
                  id="course-level"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs sm:text-sm bg-white border border-[#B6AA9A] rounded-lg text-[#211E1A] focus:outline-none focus:border-[#D92D2D] font-medium"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="All Levels">All Levels</option>
                </select>
              </div>

              <div>
                <label htmlFor="course-language" className="block text-xs font-bold text-[#211E1A] mb-1">
                  Instruction Language
                </label>
                <select
                  id="course-language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs sm:text-sm bg-white border border-[#B6AA9A] rounded-lg text-[#211E1A] focus:outline-none focus:border-[#D92D2D] font-medium"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="course-desc" className="block text-xs font-bold text-[#211E1A] mb-1">
                Course Description & Syllabus Summary <span className="text-[#D92D2D]">*</span>
              </label>
              <textarea
                id="course-desc"
                rows={4}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errors.description) setErrors(prev => ({ ...prev, description: null }));
                }}
                placeholder="Detail what students will learn, coding exercises included, and what problems they will solve..."
                className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-lg text-[#211E1A] placeholder-[#71675D] focus:outline-none focus:ring-2 ${
                  errors.description
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                    : 'border-[#B6AA9A] focus:border-[#D92D2D] focus:ring-[#D92D2D]/20'
                }`}
              />
              <div className="flex items-center justify-between mt-1.5">
                {errors.description ? (
                  <p className="text-xs text-red-600 font-semibold">{errors.description}</p>
                ) : (
                  <p className="text-[11px] text-[#71675D]">Minimum 20 characters required.</p>
                )}
                <span className="text-[11px] text-[#71675D] font-mono">
                  {description.length} chars
                </span>
              </div>
            </div>
          </section>

          {/* Section 2: Media & Thumbnail Presets */}
          <section className="bg-white border border-[#B6AA9A] rounded-xl p-5 sm:p-7 shadow-xs space-y-6">
            <div className="border-b border-[#B6AA9A]/50 pb-3">
              <h2 className="text-base font-extrabold text-[#211E1A]">
                2. Course Thumbnail & Media
              </h2>
              <p className="text-xs text-[#514940] mt-0.5">
                Select a high-resolution stock artwork preset or provide a custom image URL.
              </p>
            </div>

            <div>
              <label htmlFor="thumb-input" className="block text-xs font-bold text-[#211E1A] mb-1">
                Thumbnail Image URL
              </label>
              <input
                id="thumb-input"
                type="url"
                value={thumbnail}
                onChange={(e) => setThumbnail(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#B6AA9A] rounded-lg text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
              />
            </div>

            <div>
              <span className="block text-xs font-bold text-[#514940] mb-2.5">
                Curated High-Definition Artwork Presets:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {THUMBNAIL_PRESETS.map((preset) => {
                  const isSelected = thumbnail === preset.url;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setThumbnail(preset.url)}
                      className={`group relative rounded-xl overflow-hidden border-2 transition-all p-1 text-left flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#D92D2D] shadow-md scale-102 bg-[#EAE3DA]'
                          : 'border-[#B6AA9A] hover:border-[#211E1A] bg-white'
                      }`}
                    >
                      <div className="h-16 w-full rounded-lg overflow-hidden bg-gray-200">
                        <img
                          src={preset.url}
                          alt={preset.label}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <span className={`text-[10px] font-bold mt-1.5 px-1 truncate block ${isSelected ? 'text-[#D92D2D]' : 'text-[#211E1A]'}`}>
                        {preset.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Section 3: Learning Objectives */}
          <section className="bg-white border border-[#B6AA9A] rounded-xl p-5 sm:p-7 shadow-xs space-y-6">
            <div className="border-b border-[#B6AA9A]/50 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-[#211E1A]">
                  3. Learning Objectives & Outcomes <span className="text-[#D92D2D]">*</span>
                </h2>
                <p className="text-xs text-[#514940] mt-0.5">
                  Clear, demonstrable learning objectives for prospective students.
                </p>
              </div>
              <span className="text-xs font-bold text-[#71675D]">
                {learningObjectives.length} configured
              </span>
            </div>

            {errors.objectives && (
              <p className="text-xs text-red-600 font-bold">{errors.objectives}</p>
            )}

            {/* Current Objectives List with Animations */}
            <div className="space-y-2.5">
              {learningObjectives.map((obj, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#EAE3DA]/50 border border-[#B6AA9A]/70 text-xs sm:text-sm text-[#211E1A] hover:border-[#B6AA9A] transition-colors"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="font-bold text-emerald-700 shrink-0">✓</span>
                    <span className="leading-snug">{obj}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveObjective(index)}
                    className="text-xs text-[#D92D2D] hover:underline font-bold px-2 py-1 shrink-0"
                    aria-label={`Remove objective ${index + 1}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {/* Add Objective Input */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <input
                type="text"
                value={newObjective}
                onChange={(e) => setNewObjective(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddObjective();
                  }
                }}
                placeholder="e.g. Design fault-tolerant microservices using gRPC and Kafka..."
                className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#B6AA9A] rounded-lg text-[#211E1A] placeholder-[#71675D] focus:outline-none focus:border-[#D92D2D]"
              />
              <button
                type="button"
                onClick={handleAddObjective}
                className="px-4 py-2.5 text-xs font-bold rounded-lg bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] hover:bg-[#D6D0C8] shrink-0 transition-colors"
              >
                + Add Objective
              </button>
            </div>
          </section>

          {/* Section 4: Prerequisites */}
          <section className="bg-white border border-[#B6AA9A] rounded-xl p-5 sm:p-7 shadow-xs space-y-6">
            <div className="border-b border-[#B6AA9A]/50 pb-3">
              <h2 className="text-base font-extrabold text-[#211E1A]">
                4. Prerequisites & Prior Knowledge
              </h2>
              <p className="text-xs text-[#514940] mt-0.5">
                Recommended background knowledge or tools needed prior to starting.
              </p>
            </div>

            <div className="space-y-2.5">
              {prerequisites.map((req, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#EAE3DA]/50 border border-[#B6AA9A]/70 text-xs sm:text-sm text-[#211E1A]"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="font-bold text-[#71675D]">•</span>
                    <span>{req}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemovePrerequisite(index)}
                    className="text-xs text-[#D92D2D] hover:underline font-bold px-2 py-1 shrink-0"
                    aria-label={`Remove prerequisite ${index + 1}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <input
                type="text"
                value={newPrerequisite}
                onChange={(e) => setNewPrerequisite(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddPrerequisite();
                  }
                }}
                placeholder="e.g. Working knowledge of Git and basic command-line commands..."
                className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#B6AA9A] rounded-lg text-[#211E1A] placeholder-[#71675D] focus:outline-none focus:border-[#D92D2D]"
              />
              <button
                type="button"
                onClick={handleAddPrerequisite}
                className="px-4 py-2.5 text-xs font-bold rounded-lg bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] hover:bg-[#D6D0C8] shrink-0 transition-colors"
              >
                + Add Requirement
              </button>
            </div>
          </section>

          {/* Form Bottom Submission Bar */}
          <div className="p-5 sm:p-6 bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div>
              <h3 className="text-sm font-extrabold text-[#211E1A]">
                Save as draft or submit for review?
              </h3>
              <p className="text-xs text-[#514940] mt-0.5">
                Saving as draft opens the Curriculum Editor to add sections, coding exercises, and lectures.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleSave('Draft')}
                disabled={isSubmitting}
                className="px-4 py-2.5 text-xs sm:text-sm font-bold rounded-lg bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] hover:bg-[#D6D0C8] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
              >
                Save as Draft & Open Editor
              </button>

              <button
                type="button"
                onClick={() => handleSave('Pending Review')}
                disabled={isSubmitting}
                className="px-5 py-2.5 text-xs sm:text-sm font-bold rounded-lg bg-[#D92D2D] text-white hover:bg-[#B91C1C] transition-all shadow-md hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
              >
                {isSubmitting ? 'Submitting...' : 'Submit for Admin Review'}
              </button>
            </div>
          </div>
        </form>

        {/* Live Course Preview Card (Right Column) */}
        <aside className="sticky top-6 space-y-5 animate-slide-up">
          <div className="bg-white border border-[#B6AA9A] rounded-xl overflow-hidden shadow-md">
            <div className="p-3 bg-[#211E1A] text-white text-xs font-bold flex items-center justify-between">
              <span>Live Card Preview</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/20">
                Student View
              </span>
            </div>

            <div className="h-44 bg-[#EAE3DA] relative overflow-hidden">
              {thumbnail ? (
                <img
                  src={thumbnail}
                  alt="Course Preview"
                  className="w-full h-full object-cover"
                />
              ) : null}
              <div className="absolute top-3 left-3">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-white/95 text-[#211E1A] shadow-xs">
                  {category}
                </span>
              </div>
              <div className="absolute top-3 right-3">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EAE3DA] text-[#514940] border border-[#B6AA9A]">
                  Draft Preview
                </span>
              </div>
            </div>

            <div className="p-5">
              <div className="flex items-center gap-2 text-[11px] font-bold text-[#71675D]">
                <span>{level}</span>
                <span>•</span>
                <span>{language}</span>
                <span>•</span>
                <span>1 Module (Starter)</span>
              </div>

              <h3 className="mt-2 text-base font-extrabold text-[#211E1A] line-clamp-2 leading-snug">
                {title.trim() || 'Untitled Course Title'}
              </h3>

              <p className="mt-1.5 text-xs text-[#514940] line-clamp-3 leading-relaxed">
                {description.trim() || 'Your course summary and problem statement will appear here as you type in the editor.'}
              </p>

              <div className="mt-4 pt-3 border-t border-[#B6AA9A]/50 flex items-center justify-between text-xs text-[#71675D]">
                <span>Instructor: Elena Rostova</span>
                <span className="font-bold text-[#211E1A]">New Course</span>
              </div>
            </div>
          </div>

          {/* Quick Help Card */}
          <div className="p-4 bg-[#EAE3DA] border border-[#B6AA9A] rounded-xl text-xs text-[#514940] space-y-2 shadow-xs">
            <h4 className="font-bold text-[#211E1A] flex items-center gap-1.5">
              <span>💡</span>
              <span>Approval Tip</span>
            </h4>
            <p className="leading-relaxed">
              Super Admin reviewers verify course titles, clear learning objectives, and curriculum module structure before approving a course for the live catalog.
            </p>
          </div>
        </aside>
      </div>
    </PageContainer>
  );
}
