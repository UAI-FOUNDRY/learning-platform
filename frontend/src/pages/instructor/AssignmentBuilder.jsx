import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function AssignmentBuilder() {
  const [title, setTitle] = useState('Production Microservice & Ingress Deployment Project');
  const [description, setDescription] = useState(
    'Construct a modular production deployment with horizontal pod autoscaling, zero-trust network policies, and TLS certificate automated issuance.'
  );
  const [submissionFormat, setSubmissionFormat] = useState('Git Repository');
  const [dueDate, setDueDate] = useState('2026-11-15');
  const [maxMarks, setMaxMarks] = useState(100);
  const [passingScore, setPassingScore] = useState(70);

  const [rubric, setRubric] = useState([
    { id: 'rb-1', criterion: 'Manifest structure, Helm linting, and valid values schema', points: 30 },
    { id: 'rb-2', criterion: 'Horizontal Pod Autoscaler (HPA) integration with metrics server', points: 25 },
    { id: 'rb-3', criterion: 'Cert-manager TLS ingress with Let\'s Encrypt annotations', points: 25 },
    { id: 'rb-4', criterion: 'Deployment verification and README setup instructions', points: 20 }
  ]);

  const [newCriterion, setNewCriterion] = useState('');
  const [newPoints, setNewPoints] = useState(20);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleAddCriterion = (e) => {
    e.preventDefault();
    if (!newCriterion.trim()) return;

    const item = {
      id: `rb-${Date.now().toString().slice(-4)}`,
      criterion: newCriterion.trim(),
      points: Number(newPoints) || 10
    };

    setRubric(prev => [...prev, item]);
    setNewCriterion('');
    setNewPoints(15);
  };

  const handleRemoveCriterion = (id) => {
    setRubric(prev => prev.filter(r => r.id !== id));
  };

  const totalRubricPoints = rubric.reduce((sum, r) => sum + (Number(r.points) || 0), 0);

  const handleSaveAssignment = (e) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in font-sans">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#B6AA9A]/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#EAE3DA] text-[#D92D2D] border border-[#B6AA9A]">
              Project Studio
            </span>
            <span className="text-xs text-[#71675D]">
              Configure deliverables, grading rubrics, and automated deadlines
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#211E1A] tracking-tight mt-1">
            Assignment & Rubric Builder
          </h1>
        </div>

        <button
          type="button"
          onClick={handleSaveAssignment}
          className="px-6 py-2.5 bg-[#D92D2D] hover:bg-[#B91C1C] text-white font-extrabold text-xs rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <span>Save Assignment Specs</span>
          <span>✓</span>
        </button>
      </div>

      {/* Main 2-Col Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Assignment Details (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border-2 border-[#B6AA9A] rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
            <h2 className="text-base font-black text-[#211E1A] border-b border-[#B6AA9A]/50 pb-2">
              Deliverable Specifications
            </h2>

            <div>
              <label htmlFor="asg-title" className="block text-xs font-bold text-[#211E1A] mb-1">
                Project / Assignment Title <span className="text-[#D92D2D]">*</span>
              </label>
              <input
                id="asg-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3.5 py-2 text-xs bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] font-bold focus:outline-none focus:border-[#D92D2D]"
              />
            </div>

            <div>
              <label htmlFor="asg-desc" className="block text-xs font-bold text-[#211E1A] mb-1">
                Deliverable Instructions & Student Guidelines
              </label>
              <textarea
                id="asg-desc"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 text-xs bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] leading-relaxed focus:outline-none focus:border-[#D92D2D]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="asg-fmt" className="block text-xs font-bold text-[#211E1A] mb-1">
                  Submission Format
                </label>
                <select
                  id="asg-fmt"
                  value={submissionFormat}
                  onChange={(e) => setSubmissionFormat(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
                >
                  <option value="Git Repository">Git Repository URL</option>
                  <option value="ZIP Archive">ZIP Archive Bundle</option>
                  <option value="PDF Document">PDF Report</option>
                </select>
              </div>

              <div>
                <label htmlFor="asg-due" className="block text-xs font-bold text-[#211E1A] mb-1">
                  Submission Due Date
                </label>
                <input
                  id="asg-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
                />
              </div>

              <div>
                <label htmlFor="asg-pass" className="block text-xs font-bold text-[#211E1A] mb-1">
                  Passing Score (pts)
                </label>
                <input
                  id="asg-pass"
                  type="number"
                  value={passingScore}
                  onChange={(e) => setPassingScore(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Grading Rubric Builder (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border-2 border-[#B6AA9A] rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-[#B6AA9A]/50 pb-2">
              <h2 className="text-base font-black text-[#211E1A]">
                Grading Rubric
              </h2>
              <span className="text-xs font-black text-[#D92D2D] bg-[#EAE3DA] px-2.5 py-0.5 rounded-full border border-[#B6AA9A]">
                Total: {totalRubricPoints} pts
              </span>
            </div>

            {/* List of Rubric Criteria */}
            <div className="space-y-2">
              {rubric.map((r) => (
                <div
                  key={r.id}
                  className="p-3 bg-[#EAE3DA]/50 rounded-xl border border-[#B6AA9A] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#211E1A] truncate">{r.criterion}</p>
                    <p className="text-[10px] text-[#D92D2D] font-black">{r.points} marks</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveCriterion(r.id)}
                    className="text-[#71675D] hover:text-[#D92D2D] text-xs font-bold px-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Add Criterion Form */}
            <form onSubmit={handleAddCriterion} className="space-y-3 pt-2 border-t border-[#B6AA9A]/40">
              <h3 className="text-xs font-bold text-[#211E1A]">Add Rubric Criterion</h3>
              <div>
                <input
                  type="text"
                  value={newCriterion}
                  onChange={(e) => setNewCriterion(e.target.value)}
                  placeholder="e.g. Test coverage >= 85%"
                  required
                  className="w-full px-3 py-2 text-xs bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={newPoints}
                  onChange={(e) => setNewPoints(e.target.value)}
                  placeholder="Points"
                  className="w-24 px-3 py-2 text-xs bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
                />
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#211E1A] hover:bg-black text-white text-xs font-bold rounded-xl transition-colors shadow-2xs"
                >
                  + Add to Rubric
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {saveSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#211E1A] text-white border-2 border-emerald-500 rounded-2xl p-4 shadow-2xl flex items-center gap-3 animate-slide-up">
          <span className="text-2xl">✓</span>
          <div>
            <p className="font-extrabold text-xs">Assignment Specifications Saved!</p>
            <p className="text-[10px] text-stone-300">Rubric linked to course evaluation schedule.</p>
          </div>
        </div>
      )}
    </div>
  );
}
