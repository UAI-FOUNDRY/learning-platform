import React, { useState } from 'react';

export default function CertificateModal({ certificate, onClose, isOpen = true }) {
  const [copied, setCopied] = useState(false);

  if (!certificate || isOpen === false) return null;

  const handleCopyUrl = () => {
    navigator.clipboard?.writeText(certificate.verificationUrl || `https://learnspace.org/verify/${certificate.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in font-sans">
      <div className="bg-white border-2 border-[#B6AA9A] rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-scale-in my-8">
        {/* Certificate Formal Canvas */}
        <div className="relative border-8 border-double border-[#B6AA9A] p-8 sm:p-12 rounded-2xl bg-gradient-to-br from-[#FAF8F5] via-[#F4EFEA] to-[#EAE3DA] text-center space-y-6 shadow-inner">
          {/* Top Emblem */}
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#D92D2D] text-white flex items-center justify-center font-black text-xl shadow-md">
              LS
            </div>
            <div className="text-left">
              <span className="font-extrabold text-lg tracking-tight text-[#211E1A] block leading-none">
                LearnSpace
              </span>
              <span className="text-[10px] uppercase font-bold text-[#71675D] tracking-widest">
                Academic Credential & Certification
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs uppercase font-extrabold tracking-widest text-[#71675D]">
              This is to certify that
            </p>
            <h2 className="text-2xl sm:text-4xl font-black text-[#211E1A] tracking-tight font-serif italic py-1 border-b border-[#B6AA9A]/50 max-w-md mx-auto">
              {certificate.recipientName || 'Sarah Chen'}
            </h2>
            <p className="text-xs text-[#514940] pt-2">
              has successfully fulfilled all curriculum, laboratory, and examination standards for
            </p>
          </div>

          {/* Course Title Spotlight */}
          <div className="py-2">
            <h3 className="text-xl sm:text-2xl font-black text-[#211E1A] max-w-xl mx-auto">
              {certificate.courseTitle}
            </h3>
            <p className="text-xs text-[#71675D] mt-1">
              Issued on {certificate.issueDate} • Grade Score: {certificate.gradeScore}% (Distinction)
            </p>
          </div>

          {/* Skills Acquired Chips */}
          {certificate.skills && certificate.skills.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
              {certificate.skills.map((skill, sIdx) => (
                <span
                  key={sIdx}
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/80 border border-[#B6AA9A] text-[#211E1A]"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}

          {/* Signature & Seal Footer */}
          <div className="pt-6 border-t border-[#B6AA9A]/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="text-center sm:text-left">
              <p className="font-serif italic font-bold text-base text-[#211E1A] border-b border-stone-400 pb-0.5 inline-block">
                {certificate.instructor}
              </p>
              <p className="text-[10px] font-bold text-[#71675D] uppercase mt-0.5">
                {certificate.instructorTitle || 'Course Instructor'}
              </p>
            </div>

            {/* Official Seal Badge */}
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#D92D2D] flex flex-col items-center justify-center text-[9px] font-extrabold text-[#D92D2D] bg-red-50/50 shadow-2xs">
              <span>★ OFFICIAL ★</span>
              <span>VERIFIED</span>
            </div>

            <div className="text-center sm:text-right">
              <p className="font-mono text-xs font-bold text-[#211E1A]">
                {certificate.certificateNumber || 'LS-2026-98142-ACC'}
              </p>
              <p className="text-[10px] font-bold text-[#71675D] uppercase mt-0.5">
                Credential Identifier
              </p>
            </div>
          </div>
        </div>

        {/* Modal Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-[#211E1A] hover:bg-black text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <span>🖨️</span>
              <span>Print / Save PDF</span>
            </button>

            <button
              type="button"
              onClick={handleCopyUrl}
              className="px-4 py-2 bg-white hover:bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A] text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <span>🔗</span>
              <span>{copied ? 'Copied Verification Link!' : 'Copy Verification Link'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#EAE3DA] hover:bg-[#D6D0C8] text-[#211E1A] text-xs font-bold rounded-xl transition-colors border border-[#B6AA9A]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
