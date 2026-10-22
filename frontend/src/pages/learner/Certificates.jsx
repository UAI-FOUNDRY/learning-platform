import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { learnerService } from '../../services/learnerService';
import CertificateModal from '../../components/learner/CertificateModal';

export default function Certificates() {
  const [certificates, setCertificates] = useState(() => learnerService.getCertificates());
  const [selectedCertificate, setSelectedCertificate] = useState(null);

  useEffect(() => {
    return learnerService.subscribe((state) => {
      setCertificates(state.certificates || []);
    });
  }, []);

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#B6AA9A]/60 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#211E1A] tracking-tight">
            Certified Credentials
          </h1>
          <p className="text-xs sm:text-sm text-[#514940] mt-1">
            Official verifiable credentials issued upon 100% completion of course lectures and assessments.
          </p>
        </div>

        <div className="px-4 py-2 rounded-xl bg-white border border-[#B6AA9A] text-xs font-bold text-[#211E1A] shadow-2xs">
          Total Credentials Earned: <span className="text-[#D92D2D] font-black">{certificates.length}</span>
        </div>
      </div>

      {/* Certificates Gallery */}
      {certificates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificates.map((cert) => (
            <div
              key={cert.id}
              className="bg-white border-2 border-[#B6AA9A] rounded-3xl p-6 shadow-sm hover-lift flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center text-xl shadow-2xs">
                    🏆
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                    {cert.status || 'Verified'}
                  </span>
                </div>

                <div>
                  <h3 className="font-black text-base text-[#211E1A] line-clamp-2">
                    {cert.courseTitle}
                  </h3>
                  <p className="text-xs text-[#71675D] mt-1">
                    Instructed by {cert.instructor}
                  </p>
                </div>

                <div className="p-3 bg-[#EAE3DA]/50 rounded-xl border border-[#B6AA9A]/60 text-xs space-y-1">
                  <div className="flex justify-between font-mono text-[11px] text-[#211E1A]">
                    <span className="text-[#71675D]">ID:</span>
                    <span className="font-bold">{cert.certificateNumber}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-[#211E1A]">
                    <span className="text-[#71675D]">Date:</span>
                    <span className="font-bold">{cert.issueDate}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#B6AA9A]/50 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCertificate(cert)}
                  className="flex-1 py-2.5 px-3 bg-[#211E1A] hover:bg-black text-white rounded-xl text-xs font-black transition-colors shadow-2xs text-center"
                >
                  View Credential 👁️
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(cert.verificationUrl || `https://learnspace.org/verify/${cert.id}`);
                    alert('Verification link copied to clipboard!');
                  }}
                  className="p-2.5 bg-[#EAE3DA] hover:bg-[#D6D0C8] border border-[#B6AA9A] rounded-xl text-xs font-bold text-[#211E1A]"
                  title="Copy verification link"
                >
                  🔗
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white border-2 border-[#B6AA9A] rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#EAE3DA] text-[#211E1A] mx-auto flex items-center justify-center text-3xl">
            🏆
          </div>
          <h3 className="text-lg font-black text-[#211E1A]">
            No Certificates Earned Yet
          </h3>
          <p className="text-xs text-[#514940] max-w-sm mx-auto">
            Complete all modules, lectures, and coding challenges in an enrolled course to automatically unlock your verified certificate.
          </p>
          <div className="pt-2">
            <Link
              to="/learner/my-learning"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D92D2D] hover:bg-[#B91C1C] text-white text-xs font-black transition-colors shadow-sm"
            >
              <span>Continue My Courses</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      )}

      {/* Formal Certificate Modal */}
      {selectedCertificate && (
        <CertificateModal
          certificate={selectedCertificate}
          onClose={() => setSelectedCertificate(null)}
        />
      )}
    </div>
  );
}
