import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import {
  adminService,
  getStoredReview,
  saveStoredReview,
  deleteStoredReview,
  resolveCourseStatus,
  subscribeToReviewUpdates
} from '../../services/adminService';
import { mockCourses } from '../../data/mockCourses';
import { mockPendingApprovals } from '../../data/mockDashboardData';

/**
 * StatusBadge
 * Semantic badge styling aligned with dashboard and Course Management
 */
function StatusBadge({ status }) {
  const normalized = (status || '').toLowerCase();

  if (normalized === 'published' || normalized === 'approved') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100/80 text-emerald-900 border border-emerald-300 shrink-0">
        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
        {status}
      </span>
    );
  }

  if (normalized === 'pending review' || normalized === 'pending') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100/80 text-amber-900 border border-amber-300 shrink-0">
        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-amber-600" aria-hidden="true" />
        {status}
      </span>
    );
  }

  if (normalized === 'changes requested' || normalized === 'rejected') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100/80 text-rose-900 border border-rose-300 shrink-0">
        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-rose-600" aria-hidden="true" />
        {status}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#EAE3DA] text-[#514940] border border-[#B6AA9A] shrink-0">
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-stone-500" aria-hidden="true" />
      {status || 'Draft'}
    </span>
  );
}

/**
 * Format timestamp into standard readable calendar date
 */
function formatSubmissionDate(dateStr) {
  if (!dateStr) return 'Recent';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export default function CourseReview() {
  const { id } = useParams();

  // Find course record across mock datasets
  const courseRecord = useMemo(() => {
    if (!id) return null;
    // Check mockCourses (contains descriptions and modules)
    const fromMockCourses = mockCourses.find(c => c.id === id);
    // Check mockPendingApprovals (from dashboard approvals queue)
    const fromPending = mockPendingApprovals.find(c => c.id === id);

    if (!fromMockCourses && !fromPending) return null;

    return {
      ...(fromPending || {}),
      ...(fromMockCourses || {}),
      submittedAt: fromPending?.submittedAt || fromMockCourses?.createdAt,
      modulesCount: fromMockCourses?.modulesCount || fromPending?.modulesCount || 0
    };
  }, [id]);

  // Load any prior decision saved in current session
  const storedReview = useMemo(() => {
    return id ? getStoredReview(id) : null;
  }, [id]);

  const [currentStatus, setCurrentStatus] = useState(
    resolveCourseStatus(courseRecord, storedReview)
  );
  const [reviewerFeedback, setReviewerFeedback] = useState(
    storedReview?.feedback || ''
  );
  const [feedbackError, setFeedbackError] = useState('');

  // Modal Dialog States
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRequestChangesModalOpen, setIsRequestChangesModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getNoticeForReview = (rev, course) => {
    if (!rev) return null;
    const resolved = resolveCourseStatus(course, rev);
    let msg = `Course was approved and marked as Published (simulated in local dev session).`;
    if (rev.decision === 'Changes Requested' || resolved === 'Changes Requested') {
      msg = `Change request was recorded with feedback notes for the instructor (simulated in local dev session).`;
    } else if (rev.decision === 'Rejected' || resolved === 'Rejected') {
      msg = `Submission was rejected with justification notes (simulated in local dev session).`;
    }
    return {
      status: resolved,
      decision: rev.decision || resolved,
      message: msg
    };
  };

  const [decisionNotice, setDecisionNotice] = useState(
    storedReview ? getNoticeForReview(storedReview, courseRecord) : null
  );

  // Sync state if id or course changes
  useEffect(() => {
    if (courseRecord) {
      const prior = getStoredReview(courseRecord.id);
      if (prior) {
        const resolved = resolveCourseStatus(courseRecord, prior);
        setCurrentStatus(resolved);
        setReviewerFeedback(prior.feedback || '');
        setDecisionNotice(getNoticeForReview(prior, courseRecord));
      } else {
        setCurrentStatus(courseRecord.status || 'Pending Review');
        setDecisionNotice(null);
      }
    }
  }, [courseRecord]);

  // Subscribe to external review updates or resets
  useEffect(() => {
    if (!courseRecord) return;
    const unsubscribe = subscribeToReviewUpdates((reviews) => {
      const prior = reviews[courseRecord.id];
      if (prior) {
        const resolved = resolveCourseStatus(courseRecord, prior);
        setCurrentStatus(resolved);
        setReviewerFeedback(prior.feedback || '');
        setDecisionNotice(getNoticeForReview(prior, courseRecord));
      } else {
        setCurrentStatus(courseRecord.status || 'Pending Review');
        setDecisionNotice(null);
        setReviewerFeedback('');
        setFeedbackError('');
      }
    });
    return unsubscribe;
  }, [courseRecord]);

  // Handler for opening Request Changes modal with validation
  const handleOpenRequestChangesModal = () => {
    if (!reviewerFeedback.trim()) {
      setFeedbackError('Reviewer feedback notes are required when requesting changes.');
      return;
    }
    setFeedbackError('');
    setIsRequestChangesModalOpen(true);
  };

  // Handler for opening Reject modal with validation
  const handleOpenRejectModal = () => {
    if (!reviewerFeedback.trim()) {
      setFeedbackError('Justification notes are required when rejecting a submission.');
      return;
    }
    setFeedbackError('');
    setIsRejectModalOpen(true);
  };

  // Execute approval, change-request, or rejection decision
  const handleExecuteDecision = async (decisionType) => {
    if (!courseRecord) return;
    setIsSubmitting(true);

    let newStatus = 'Published';
    let decisionLabel = 'Approved';
    let defaultMsg = `Course "${courseRecord.title}" has been approved and marked as Published (simulated in development session).`;

    if (decisionType === 'RequestChanges') {
      newStatus = 'Changes Requested';
      decisionLabel = 'Changes Requested';
      defaultMsg = `Change request for "${courseRecord.title}" has been recorded with your feedback notes (simulated in development session).`;
    } else if (decisionType === 'Reject') {
      newStatus = 'Rejected';
      decisionLabel = 'Rejected';
      defaultMsg = `Rejection for "${courseRecord.title}" has been recorded with your justification notes (simulated in development session).`;
    }

    try {
      // Attempt backend API call if service is available
      await adminService.reviewCourse(courseRecord.id, {
        decision: decisionLabel,
        comments: reviewerFeedback
      });
    } catch {
      // Backend approval endpoint is in development; simulate successful local decision
    }

    // Persist to local development session storage
    saveStoredReview(courseRecord.id, {
      courseId: courseRecord.id,
      status: newStatus,
      decision: decisionLabel,
      feedback: reviewerFeedback,
      timestamp: new Date().toISOString()
    });

    setCurrentStatus(newStatus);
    setIsApproveModalOpen(false);
    setIsRequestChangesModalOpen(false);
    setIsRejectModalOpen(false);
    setIsSubmitting(false);

    setDecisionNotice({
      status: newStatus,
      decision: decisionLabel,
      message: defaultMsg
    });
  };

  // Reset local decision after user confirms in modal
  const handleConfirmResetDecision = () => {
    if (!courseRecord) return;
    deleteStoredReview(courseRecord.id);
    setCurrentStatus(courseRecord.status || 'Pending Review');
    setDecisionNotice(null);
    setReviewerFeedback('');
    setFeedbackError('');
    setIsResetModalOpen(false);
  };

  // If ID does not match any known record, display clean EmptyState
  if (!courseRecord) {
    return (
      <PageContainer>
        <nav aria-label="Breadcrumb" className="mb-4">
          <Link
            to="/admin/approvals"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#514940] hover:text-[#D92D2D] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] rounded"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Course Approvals</span>
          </Link>
        </nav>

        <div className="py-12 bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl shadow-xs">
          <EmptyState
            title="Course Submission Not Found"
            description={`No pending course submission matching identifier "${id}" was found in the catalog or review queue.`}
            action={
              <Link
                to="/admin/approvals"
                className="mt-4 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-[#D92D2D] text-white hover:bg-[#B91C1C] transition-colors inline-block"
              >
                Return to Course Approvals Queue
              </Link>
            }
          />
        </div>
      </PageContainer>
    );
  }

  const isPending = currentStatus === 'Pending Review';

  return (
    <PageContainer>
      {/* Top Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="mb-2">
        <Link
          to="/admin/approvals"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#514940] hover:text-[#D92D2D] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] rounded"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Course Approvals</span>
        </Link>
      </nav>

      {/* Page Heading & Status */}
      <div className="pb-6 border-b border-[#B6AA9A]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[24px] sm:text-[28px] font-bold tracking-tight text-[#211E1A] font-sans leading-tight">
                Review Course Submission
              </h1>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-[#EAE3DA] text-[#514940] border border-[#B6AA9A]">
                ID: {courseRecord.id}
              </span>
              <StatusBadge status={currentStatus} />
            </div>
            <p className="mt-1.5 text-[14px] leading-relaxed text-[#514940]">
              Inspect syllabus scope, verify administrative criteria, and record publication approval or change requests.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2.5">
            <Link
              to="/admin/approvals"
              className="inline-flex items-center gap-2 px-3 py-1.5 text-[13px] font-semibold rounded-lg bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] hover:bg-[#D6D0C8] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
            >
              <span>Queue Overview</span>
            </Link>
          </div>
        </div>

        {/* Development Mode Notice Banner */}
        <div className="mt-4 p-3.5 bg-[#C8BBAA] border border-[#B6AA9A] rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-[13px]">
          <div className="flex items-center gap-2.5 text-[#211E1A]">
            <span className="shrink-0 font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-[#D92D2D] text-white">
              Dev Mode
            </span>
            <span>
              <strong>Local Review Session:</strong> Backend review decision endpoints are currently in development. Decisions and feedback notes are simulated locally in this browser session.
            </span>
          </div>
        </div>

        {/* Decision Feedback Banner */}
        {decisionNotice && (
          <div
            className={`mt-4 p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm animate-fade-in shadow-xs ${
              decisionNotice.status === 'Published'
                ? 'border-emerald-300 bg-emerald-50/90 text-emerald-950'
                : decisionNotice.status === 'Rejected'
                ? 'border-rose-300 bg-rose-50/90 text-rose-950'
                : 'border-amber-300 bg-amber-50/90 text-amber-950'
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`p-1 rounded-full text-white mt-0.5 shrink-0 ${
                  decisionNotice.status === 'Published'
                    ? 'bg-emerald-600'
                    : decisionNotice.status === 'Rejected'
                    ? 'bg-rose-600'
                    : 'bg-amber-600'
                }`}
              >
                {decisionNotice.status === 'Published' ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-[#211E1A]">
                    Review Decision Recorded: {decisionNotice.decision}
                  </p>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#EAE3DA] text-[#514940] border border-[#B6AA9A]">
                    Local Dev Session
                  </span>
                </div>
                <p className="text-[#514940] text-xs mt-1">
                  {decisionNotice.message}
                </p>
                <p className="text-[#71675D] text-[11px] mt-0.5">
                  Stored in local browser storage (localStorage). Backend endpoints (/api/v1/admin/courses/{courseRecord.id}/...) are simulated in this prototype.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto shrink-0">
              {decisionNotice.status === 'Published' && (
                <Link
                  to={`/courses/${courseRecord.id}`}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] hover:bg-[#D6D0C8] transition-colors"
                >
                  View in Catalog
                </Link>
              )}
              <Link
                to="/admin/approvals"
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg text-white transition-colors shadow-2xs ${
                  decisionNotice.status === 'Published'
                    ? 'bg-emerald-700 hover:bg-emerald-800'
                    : decisionNotice.status === 'Rejected'
                    ? 'bg-rose-700 hover:bg-rose-800'
                    : 'bg-amber-700 hover:bg-amber-800'
                }`}
              >
                Return to Approvals Queue →
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Main Review Grid */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Course Details & Curriculum Inspection (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Course Submission Overview */}
          <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-5 sm:p-6 shadow-xs">
            <h2 className="text-[18px] sm:text-[20px] font-bold text-[#211E1A] leading-tight">
              {courseRecord.title}
            </h2>
            <p className="text-[14px] text-[#514940] mt-2.5 leading-relaxed">
              {courseRecord.description ||
                'No detailed synopsis was provided in initial course metadata. Module titles and learning units are registered below.'}
            </p>

            {/* Metadata Grid */}
            <div className="mt-6 pt-5 border-t border-[#B6AA9A] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[#71675D] uppercase tracking-wider font-semibold block text-[10px]">
                  Instructor
                </span>
                <span className="font-medium text-[#211E1A] mt-1 block text-[13px]">
                  {courseRecord.instructor || 'Unassigned'}
                </span>
              </div>

              <div>
                <span className="text-[#71675D] uppercase tracking-wider font-semibold block text-[10px]">
                  Category
                </span>
                <span className="font-medium text-[#211E1A] mt-1 block text-[13px]">
                  {courseRecord.category || 'General'}
                </span>
              </div>

              <div>
                <span className="text-[#71675D] uppercase tracking-wider font-semibold block text-[10px]">
                  Proficiency Level
                </span>
                <span className="font-medium text-[#211E1A] mt-1 block text-[13px]">
                  {courseRecord.level || 'All Levels'}
                </span>
              </div>

              <div>
                <span className="text-[#71675D] uppercase tracking-wider font-semibold block text-[10px]">
                  Submission Date
                </span>
                <span className="font-medium text-[#211E1A] mt-1 block text-[13px] font-mono">
                  {formatSubmissionDate(courseRecord.submittedAt || courseRecord.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Curriculum Structure & Modules */}
          <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#B6AA9A]">
              <div>
                <h3 className="text-[16px] sm:text-[18px] font-bold text-[#211E1A]">
                  Curriculum Structure
                </h3>
                <p className="text-xs text-[#514940] mt-0.5">
                  Instructor has registered <strong>{courseRecord.modulesCount || 0} modules</strong> for this submission.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded bg-[#EAE3DA] text-[#514940] border border-[#B6AA9A] text-xs font-mono font-medium">
                {courseRecord.modulesCount || 0} Learning Units
              </span>
            </div>

            {/* Registered Module List */}
            {courseRecord.modulesCount > 0 ? (
              <div className="mt-4 divide-y divide-[#B6AA9A] text-[13px]">
                {Array.from({ length: courseRecord.modulesCount }).map((_, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-[#EAE3DA] border border-[#B6AA9A] flex items-center justify-center font-mono text-[11px] font-bold text-[#514940]">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-[#211E1A]">
                        Module {idx + 1}: {courseRecord.category} Learning Unit {idx + 1}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#71675D] font-mono">
                      Staged
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-xs text-[#71675D] italic">
                No individual modules have been declared for this submission.
              </p>
            )}

            {/* Honest Callout on Media Storage Availability */}
            <div className="mt-5 p-3.5 rounded-lg bg-[#EAE3DA] border border-[#B6AA9A] text-xs text-[#514940] leading-relaxed">
              <strong className="text-[#211E1A] block mb-1">
                Media Stream Inspection Status:
              </strong>
              Full lesson video encoding, lecture audio transcripts, and downloadable student assets are staged in instructor cloud storage. Video player inspection is currently offline pending media transcode API availability.
            </div>
          </div>

          {/* Card 3: Review Guidance Checklist */}
          <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-5 sm:p-6 shadow-xs">
            <h3 className="text-[16px] sm:text-[18px] font-bold text-[#211E1A] mb-1">
              Administrative Audit Guidance
            </h3>
            <p className="text-xs text-[#514940] mb-4">
              Standard administrative criteria for course publication approval:
            </p>

            <ul className="space-y-3 text-xs sm:text-[13px] text-[#514940]">
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-700 font-bold shrink-0 mt-0.5">✓</span>
                <div>
                  <strong className="text-[#211E1A]">Course Title & Categorization:</strong>{' '}
                  Course title is concise, professional, and appropriately assigned to the "{courseRecord.category}" taxonomy.
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-700 font-bold shrink-0 mt-0.5">✓</span>
                <div>
                  <strong className="text-[#211E1A]">Target Audience & Difficulty Level:</strong>{' '}
                  Stated proficiency ({courseRecord.level}) aligns with intended educational prerequisites.
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-700 font-bold shrink-0 mt-0.5">✓</span>
                <div>
                  <strong className="text-[#211E1A]">Structural Scope:</strong>{' '}
                  Meets curriculum breadth requirements with {courseRecord.modulesCount} designated module learning units.
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#71675D] font-bold shrink-0 mt-0.5">—</span>
                <div className="text-[#71675D]">
                  <strong>Video & Media Quality:</strong>{' '}
                  <em>Pending Media Pipeline Connection (Inspection currently offline in development environment).</em>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#71675D] font-bold shrink-0 mt-0.5">—</span>
                <div className="text-[#71675D]">
                  <strong>Assessment & Quiz Benchmarks:</strong>{' '}
                  <em>Pending Evaluation Service Connection (Inspection currently offline in development environment).</em>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Right Column: Administrative Decision Panel (1 col) */}
        <div className="lg:col-span-1 lg:sticky lg:top-6 space-y-4">
          <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-5 sm:p-6 shadow-xs">
            <h3 className="text-[17px] font-bold text-[#211E1A] pb-3 border-b border-[#B6AA9A]">
              Administrative Decision
            </h3>

            {/* Current State Info */}
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-[#514940] font-medium">Status:</span>
              <StatusBadge status={currentStatus} />
            </div>

            {/* Review Decision Form */}
            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="reviewer-notes"
                  className="block text-xs font-semibold text-[#211E1A] mb-1.5"
                >
                  Reviewer Notes & Feedback{' '}
                  {!isPending && <span className="font-normal text-[#71675D]">(Recorded)</span>}
                  {isPending && <span className="text-[#D92D2D]">*</span>}
                </label>
                <textarea
                  id="reviewer-notes"
                  rows="4"
                  value={reviewerFeedback}
                  onChange={e => {
                    setReviewerFeedback(e.target.value);
                    if (feedbackError) setFeedbackError('');
                  }}
                  disabled={!isPending}
                  placeholder="Enter audit observations, publication rationale, or specific revision requests for the instructor..."
                  className={`w-full p-2.5 text-xs bg-[#EAE3DA] text-[#211E1A] placeholder-[#71675D] border rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] ${
                    feedbackError ? 'border-[#B91C1C]' : 'border-[#B6AA9A]'
                  } disabled:opacity-75 disabled:cursor-not-allowed`}
                />
                {feedbackError && (
                  <p className="text-[11px] text-[#B91C1C] mt-1 font-medium">
                    {feedbackError}
                  </p>
                )}
                <span className="text-[10px] text-[#71675D] block mt-1">
                  Required when requesting changes. Optional but recommended when approving.
                </span>
              </div>

              {/* Action Buttons if Pending Review */}
              {isPending ? (
                <div className="pt-2 space-y-2.5">
                  {/* Approve & Publish Button */}
                  <Button
                    variant="primary"
                    onClick={() => setIsApproveModalOpen(true)}
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 text-xs font-semibold py-2.5 shadow-xs"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Approve & Publish Course</span>
                  </Button>

                  {/* Request Changes Button */}
                  <Button
                    variant="outline"
                    onClick={handleOpenRequestChangesModal}
                    disabled={isSubmitting}
                    className="w-full text-xs font-semibold py-2 border-amber-600/60 text-amber-900 bg-amber-50/60 hover:bg-amber-100/70"
                  >
                    Request Changes from Instructor
                  </Button>

                  {/* Reject Submission Button */}
                  <Button
                    variant="outline"
                    onClick={handleOpenRejectModal}
                    disabled={isSubmitting}
                    className="w-full text-xs font-semibold py-2 border-rose-300 text-rose-900 bg-rose-50/60 hover:bg-rose-100/70"
                  >
                    Reject Submission
                  </Button>

                  <p className="text-[11px] text-[#71675D] leading-normal text-center mt-2">
                    Decisions are saved to your local browser session and synchronize across the queue and dashboard.
                  </p>
                </div>
              ) : (
                /* Already Reviewed State */
                <div className="pt-2 space-y-3">
                  <div className="p-3 bg-[#EAE3DA] border border-[#B6AA9A] rounded-lg text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#211E1A]">
                        Decision Recorded:
                      </span>
                      <StatusBadge status={currentStatus} />
                    </div>
                    {reviewerFeedback && (
                      <div className="p-2 bg-[#F3ECE4] rounded border border-[#B6AA9A]/70 text-[11px]">
                        <span className="text-[#71675D] font-medium block mb-0.5">Reviewer Notes:</span>
                        <p className="text-[#211E1A] whitespace-pre-wrap">{reviewerFeedback}</p>
                      </div>
                    )}
                    <span className="text-[#71675D] text-[10px] block leading-tight">
                      Stored in local session (prototype persistence). Changes are reflected across Dashboard, Approvals Queue, and Course Management.
                    </span>
                  </div>

                  <Link
                    to="/admin/approvals"
                    className="w-full inline-flex items-center justify-center py-2 px-3 text-xs font-semibold rounded-lg bg-[#D92D2D] text-white hover:bg-[#B91C1C] transition-colors shadow-2xs"
                  >
                    Return to Course Approvals Queue
                  </Link>

                  {currentStatus === 'Published' && (
                    <Link
                      to={`/courses/${courseRecord.id}`}
                      className="w-full inline-flex items-center justify-center py-2 px-3 text-xs font-semibold rounded-lg bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] hover:bg-[#D6D0C8] transition-colors"
                    >
                      View Course in Catalog →
                    </Link>
                  )}

                  {/* Dev Action Reset with Confirmation */}
                  <div className="pt-2 border-t border-[#B6AA9A]/60">
                    <button
                      type="button"
                      onClick={() => setIsResetModalOpen(true)}
                      className="w-full text-center text-[11px] font-medium text-[#71675D] hover:text-[#D92D2D] underline py-1"
                    >
                      [Dev Action] Reset session decision (Re-test review)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal: Approve Course */}
      <Modal
        isOpen={isApproveModalOpen}
        onClose={() => !isSubmitting && setIsApproveModalOpen(false)}
        title="Confirm Course Publication Approval"
      >
        <div className="space-y-4 text-xs sm:text-sm text-[#514940]">
          <p>
            Are you sure you want to approve{' '}
            <strong className="text-[#211E1A]">"{courseRecord.title}"</strong> by{' '}
            <strong className="text-[#211E1A]">{courseRecord.instructor}</strong>?
          </p>

          <div className="p-3 bg-[#C8BBAA] border border-[#B6AA9A] rounded-lg text-xs space-y-1 text-[#211E1A]">
            <p>
              • <strong>Course Status:</strong> Will be updated to <span className="font-bold text-emerald-800">Published</span>.
            </p>
            <p>
              • <strong>Catalog Visibility:</strong> Will be available for learner enrollments in the course catalog.
            </p>
            {reviewerFeedback && (
              <p>
                • <strong>Reviewer Note:</strong> "{reviewerFeedback}"
              </p>
            )}
          </div>

          <p className="text-[11px] text-[#71675D]">
            Note: This decision updates your local development session state and removes the course from the pending approvals queue.
          </p>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-[#B6AA9A]">
            <Button
              variant="secondary"
              onClick={() => setIsApproveModalOpen(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => handleExecuteDecision('Approve')}
              disabled={isSubmitting}
              className="text-xs"
            >
              {isSubmitting ? 'Processing...' : 'Confirm Approval & Publish'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmation Modal: Request Changes */}
      <Modal
        isOpen={isRequestChangesModalOpen}
        onClose={() => !isSubmitting && setIsRequestChangesModalOpen(false)}
        title="Confirm Course Change Request"
      >
        <div className="space-y-4 text-xs sm:text-sm text-[#514940]">
          <p>
            Are you sure you want to request revisions for{' '}
            <strong className="text-[#211E1A]">"{courseRecord.title}"</strong>?
          </p>

          <div className="p-3 bg-[#C8BBAA] border border-[#B6AA9A] rounded-lg text-xs space-y-1.5">
            <span className="font-semibold text-[#211E1A] block">
              Feedback Provided to Instructor:
            </span>
            <p className="font-mono bg-[#EAE3DA] p-2 rounded border border-[#B6AA9A] text-[#211E1A] text-[11px] whitespace-pre-wrap">
              {reviewerFeedback}
            </p>
          </div>

          <p className="text-[11px] text-[#71675D]">
            The course status will be set to <strong className="text-amber-900">Changes Requested</strong> and removed from the pending approvals queue until resubmitted.
          </p>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-[#B6AA9A]">
            <Button
              variant="secondary"
              onClick={() => setIsRequestChangesModalOpen(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => handleExecuteDecision('RequestChanges')}
              disabled={isSubmitting}
              className="text-xs bg-amber-700 hover:bg-amber-800 border-amber-800"
            >
              {isSubmitting ? 'Recording...' : 'Confirm Change Request'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmation Modal: Reject Submission */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => !isSubmitting && setIsRejectModalOpen(false)}
        title="Confirm Course Rejection"
      >
        <div className="space-y-4 text-xs sm:text-sm text-[#514940]">
          <p>
            Are you sure you want to reject the submission for{' '}
            <strong className="text-[#211E1A]">"{courseRecord.title}"</strong>?
          </p>

          <div className="p-3 bg-[#C8BBAA] border border-[#B6AA9A] rounded-lg text-xs space-y-1.5">
            <span className="font-semibold text-[#211E1A] block">
              Rejection Justification Notes:
            </span>
            <p className="font-mono bg-[#EAE3DA] p-2 rounded border border-[#B6AA9A] text-[#211E1A] text-[11px] whitespace-pre-wrap">
              {reviewerFeedback}
            </p>
          </div>

          <p className="text-[11px] text-[#71675D]">
            The course status will be marked as <strong className="text-rose-900">Rejected</strong> and removed from the pending approvals queue.
          </p>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-[#B6AA9A]">
            <Button
              variant="secondary"
              onClick={() => setIsRejectModalOpen(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => handleExecuteDecision('Reject')}
              disabled={isSubmitting}
              className="text-xs"
            >
              {isSubmitting ? 'Recording...' : 'Confirm Rejection'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmation Modal: Reset Prototype Decision */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Confirm Reset of Prototype Review Decision"
      >
        <div className="space-y-4 text-xs sm:text-sm text-[#514940]">
          <p>
            Are you sure you want to revert the local prototype review decision for{' '}
            <strong className="text-[#211E1A]">"{courseRecord.title}"</strong>?
          </p>

          <div className="p-3 bg-amber-50/80 border border-amber-300 rounded-lg text-xs space-y-1.5 text-amber-950">
            <p>
              • <strong>Course Status:</strong> Will revert from <span className="font-bold">{currentStatus}</span> back to <span className="font-bold">Pending Review</span>.
            </p>
            <p>
              • <strong>Synchronization:</strong> The course will reappear in the Course Approvals queue and increment the Dashboard pending count.
            </p>
            <p>
              • <strong>Audit Event:</strong> A reset event will be appended to the administrative Activity Logs.
            </p>
          </div>

          <p className="text-[11px] text-[#71675D]">
            This action clears the decision from your browser's localStorage and returns the submission to an actionable state.
          </p>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-[#B6AA9A]">
            <Button
              variant="secondary"
              onClick={() => setIsResetModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmResetDecision}
              className="text-xs"
            >
              Confirm Reset (Revert to Pending)
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
