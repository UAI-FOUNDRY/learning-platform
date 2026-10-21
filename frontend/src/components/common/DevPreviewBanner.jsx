import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function DevPreviewBanner() {
  const { isDevPreview, exitDevPreview } = useAuth();
  const navigate = useNavigate();

  // Strictly render nothing in production builds or when preview is inactive
  if (!import.meta.env.DEV || !isDevPreview) {
    return null;
  }

  const handleExit = () => {
    if (exitDevPreview) {
      exitDevPreview();
    }
    navigate('/login');
  };

  return (
    <div
      role="alert"
      aria-label="Development preview mode notice"
      className="mb-6 rounded-xl border-2 border-amber-500/80 bg-amber-50/95 p-4 text-amber-950 shadow-sm backdrop-blur-xs transition-all"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-amber-500/20 p-1.5 text-amber-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase bg-amber-200/90 text-amber-900 border border-amber-300">
                ⚡ Local Dev Preview Active
              </span>
              <span className="text-xs font-semibold text-amber-800">
                Super Admin Offline Mode
              </span>
            </div>
            <p className="mt-1 text-xs text-amber-900/90 leading-relaxed">
              You are inspecting the Super Admin portal in local frontend development mode. Real authentication and backend checks are bypassed for UI testing only. This mode is compile-time gated by <code className="bg-amber-200/60 px-1 py-0.5 rounded text-[11px] font-mono">import.meta.env.DEV</code> and is never enabled in production.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            type="button"
            onClick={handleExit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors shadow-xs"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Exit Preview</span>
          </button>
        </div>
      </div>
    </div>
  );
}
