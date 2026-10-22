import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { learnerService } from '../../services/learnerService';

export default function Assignment() {
  const { assignmentId } = useParams();

  const [assignment, setAssignment] = useState(() =>
    learnerService.getAssignmentById(assignmentId || 'asm-102')
  );
  const [repoUrl, setRepoUrl] = useState('https://github.com/sarahchen/k8s-helm-production-challenge');
  const [studentNotes, setStudentNotes] = useState('Added HPA resource limits with metrics server and cert-manager Let\'s Encrypt cluster issuer annotations.');
  const [attachedFiles, setAttachedFiles] = useState(['helm-chart-values.yaml', 'architecture-diagram.png']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState('Submitted');
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  useEffect(() => {
    const loaded = learnerService.getAssignmentById(assignmentId || 'asm-102');
    setAssignment(loaded);
  }, [assignmentId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      learnerService.submitAssignment(assignment?.id || 'asm-102', {
        repoUrl,
        studentNotes,
        filesCount: attachedFiles.length
      });

      setIsSubmitting(false);
      setSubmissionStatus('Submitted');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3500);
    }, 500);
  };

  const handleAddSampleFile = () => {
    const fileName = `deployment-artifact-${Date.now().toString().slice(-4)}.yaml`;
    setAttachedFiles(prev => [...prev, fileName]);
  };

  const handleRemoveFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in font-sans">
      {/* Header Bar */}
      <div className="bg-white border-2 border-[#B6AA9A] rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded bg-[#211E1A] text-white">
              Course Assignment
            </span>
            <span className="text-xs text-[#71675D]">
              {assignment?.courseTitle || 'Kubernetes in Production: Zero to Hero'}
            </span>
          </div>

          <h1 className="text-xl font-black text-[#211E1A] mt-1">
            {assignment?.title || 'Production Helm Chart Deployment Challenge'}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold">
            Due in 4 days
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-[#EAE3DA] border border-[#B6AA9A] text-[#211E1A] text-xs font-black">
            {assignment?.totalMarks || 100} pts
          </div>
        </div>
      </div>

      {/* Main Grid: Assignment Brief on Left (7 cols), Submission Form on Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Instructions & Rubric (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Instructions Card */}
          <div className="bg-white border-2 border-[#B6AA9A] rounded-3xl p-6 shadow-sm space-y-4">
            <h2 className="text-base font-black text-[#211E1A] border-b border-[#B6AA9A]/50 pb-2">
              Deliverable Brief & Requirements
            </h2>

            <p className="text-xs sm:text-sm text-[#514940] leading-relaxed">
              {assignment?.description ||
                'Construct a reusable production-grade Helm v3 chart supporting horizontal pod autoscaling, ingress annotations for TLS termination, and readiness probes.'}
            </p>

            <div className="p-4 bg-[#EAE3DA]/50 rounded-2xl border border-[#B6AA9A] space-y-2 text-xs">
              <h3 className="font-extrabold text-[#211E1A]">Submission Guidelines:</h3>
              <ul className="list-disc list-inside space-y-1 text-[#514940]">
                <li>Commit your chart hierarchy to a public or institutional Git repository.</li>
                <li>Ensure all manifests pass `helm lint` and template dry-run validation.</li>
                <li>Include a concise README with installation values overrides.</li>
              </ul>
            </div>
          </div>

          {/* Grading Rubric Card */}
          <div className="bg-white border-2 border-[#B6AA9A] rounded-3xl p-6 shadow-sm space-y-4">
            <h2 className="text-base font-black text-[#211E1A] border-b border-[#B6AA9A]/50 pb-2">
              Evaluation Rubric Breakdown
            </h2>

            <div className="space-y-3">
              {(assignment?.rubric || [
                { criterion: 'Chart templating structure and values.yaml validation', points: 30 },
                { criterion: 'Horizontal Pod Autoscaler (HPA) resource metrics integration', points: 25 },
                { criterion: 'TLS Ingress configuration with cert-manager annotations', points: 25 },
                { criterion: 'Readiness & liveness probe parameterization', points: 20 }
              ]).map((r, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[#EAE3DA]/40 border border-[#B6AA9A] rounded-xl flex items-center justify-between text-xs"
                >
                  <span className="font-bold text-[#211E1A] max-w-xs">{r.criterion}</span>
                  <span className="font-black text-[#D92D2D] shrink-0 bg-white px-2 py-0.5 rounded border border-[#B6AA9A]">
                    {r.points} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Submission Form & Status (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Status Alert Banner */}
          <div className="bg-[#EAE3DA] border-2 border-[#B6AA9A] rounded-3xl p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#514940]">Submission State:</span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                {submissionStatus}
              </span>
            </div>
            <p className="text-xs text-[#514940]">
              Submitted deliverables are queued for faculty evaluation. You may update or resubmit until the deadline.
            </p>
          </div>

          {/* Submission Form Card */}
          <form
            onSubmit={handleSubmit}
            className="bg-white border-2 border-[#B6AA9A] rounded-3xl p-6 shadow-sm space-y-4"
          >
            <h3 className="text-base font-black text-[#211E1A] border-b border-[#B6AA9A]/50 pb-2">
              Submit Your Deliverables
            </h3>

            {/* Repo URL */}
            <div>
              <label htmlFor="repo-url" className="block text-xs font-bold text-[#211E1A] mb-1">
                Repository or Deliverable URL <span className="text-[#D92D2D]">*</span>
              </label>
              <input
                id="repo-url"
                type="url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/username/repository"
                required
                className="w-full px-3 py-2 text-xs bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
              />
            </div>

            {/* Attached Files */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-[#211E1A]">Attached Artifacts & Bundles</span>
                <button
                  type="button"
                  onClick={handleAddSampleFile}
                  className="text-xs font-bold text-[#D92D2D] hover:underline"
                >
                  + Add File
                </button>
              </div>

              <div className="space-y-1.5">
                {attachedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-[#EAE3DA]/60 border border-[#B6AA9A] rounded-xl flex items-center justify-between text-xs"
                  >
                    <span className="text-[#211E1A] font-mono truncate">{file}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      className="text-[#D92D2D] font-bold hover:text-[#B91C1C] px-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Student Notes */}
            <div>
              <label htmlFor="notes" className="block text-xs font-bold text-[#211E1A] mb-1">
                Submission Notes & Reviewer Commentary
              </label>
              <textarea
                id="notes"
                value={studentNotes}
                onChange={(e) => setStudentNotes(e.target.value)}
                rows={3}
                placeholder="Describe how to test or verify your implementation..."
                className="w-full p-2.5 text-xs bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-[#D92D2D] hover:bg-[#B91C1C] text-white rounded-xl text-xs font-extrabold transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Uploading Deliverables...</span>
              ) : (
                <>
                  <span>Submit Assignment for Grading</span>
                  <span>→</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Success Toast Notification */}
      {showSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#211E1A] text-white border-2 border-emerald-500 rounded-2xl p-4 shadow-2xl flex items-center gap-3 animate-slide-up">
          <span className="text-2xl">🎉</span>
          <div>
            <p className="font-extrabold text-xs">Assignment Submitted Successfully!</p>
            <p className="text-[10px] text-stone-300">Deliverables recorded for instructor evaluation.</p>
          </div>
        </div>
      )}
    </div>
  );
}
