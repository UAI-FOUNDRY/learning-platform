import React from 'react';

/**
 * AdminFeedbackBanner
 * High-visibility banner for 'Changes Requested' status.
 * Features animated badge pulse, structured commentary container,
 * and quick-action resubmit trigger.
 */
export default function AdminFeedbackBanner({ feedback, feedbackDate, onResubmit, isSubmitting }) {
  if (!feedback) return null;

  return (
    <div
      role="alert"
      className="rounded-xl border-2 border-[#D92D2D]/60 bg-gradient-to-r from-[#FFF5F5] via-white to-[#FFF5F5] p-5 sm:p-6 shadow-md transition-all animate-slide-up"
    >
      <div className="flex flex-col sm:flex-row items-start justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="shrink-0 p-2.5 rounded-xl bg-[#D92D2D] text-white shadow-sm flex items-center justify-center">
            <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase font-extrabold tracking-wider px-2 py-0.5 rounded bg-red-100 text-[#B91C1C] border border-red-300">
                Action Required
              </span>
              <h4 className="text-sm sm:text-base font-bold text-[#211E1A]">
                Super Admin Reviewer Notes
              </h4>
              {feedbackDate && (
                <span className="text-xs text-[#71675D]">
                  • Logged {new Date(feedbackDate).toLocaleDateString()}
                </span>
              )}
            </div>

            <div className="mt-3 p-4 rounded-xl bg-white border border-[#D92D2D]/30 shadow-xs">
              <p className="text-xs sm:text-sm leading-relaxed text-[#211E1A] font-medium whitespace-pre-wrap">
                "{feedback}"
              </p>
            </div>

            <p className="mt-3 text-xs text-[#514940] flex items-center gap-1.5">
              <span>💡</span>
              <span>Edit your curriculum or course details below to address these notes, then click <strong>Resubmit Course</strong>.</span>
            </p>
          </div>
        </div>

        {onResubmit && (
          <div className="shrink-0 sm:self-center w-full sm:w-auto">
            <button
              type="button"
              onClick={onResubmit}
              disabled={isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold rounded-lg bg-[#D92D2D] text-white hover:bg-[#B91C1C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] focus-visible:ring-offset-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
            >
              <svg className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{isSubmitting ? 'Resubmitting...' : 'Resubmit Course Now'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
