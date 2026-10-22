import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { instructorCourseService } from '../../services/instructorCourseService';

export default function ContentUpload() {
  const { id } = useParams();
  const [courses, setCourses] = useState(() => instructorCourseService.getCourses());
  const [selectedCourseId, setSelectedCourseId] = useState(id || (courses[0]?.id || 'crs-inst-101'));
  const [activeCourse, setActiveCourse] = useState(null);

  const [selectedLecture, setSelectedLecture] = useState('les-101-1');
  const [videoFile, setVideoFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Resources state
  const [resources, setResources] = useState([
    { id: 'res-1', name: 'pytorch-fundamentals-cheatsheet.pdf', size: '2.4 MB', type: 'PDF Document' },
    { id: 'res-2', name: 'autograd-custom-graph-sample.py', size: '18 KB', type: 'Source Code' }
  ]);
  const [newResourceName, setNewResourceName] = useState('');
  const [newResourceType, setNewResourceType] = useState('PDF Document');

  useEffect(() => {
    const found = instructorCourseService.getCourseById(selectedCourseId);
    if (found) {
      setActiveCourse(found);
    }
  }, [selectedCourseId]);

  const handleSimulateUpload = () => {
    setIsUploading(true);
    setUploadProgress(10);

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          setUploadSuccess(true);
          setTimeout(() => setUploadSuccess(false), 3500);
          return 100;
        }
        return prev + 20;
      });
    }, 300);
  };

  const handleAddResource = (e) => {
    e.preventDefault();
    if (!newResourceName.trim()) return;

    const newRes = {
      id: `res-${Date.now().toString().slice(-4)}`,
      name: newResourceName.trim(),
      size: `${(Math.random() * 4 + 0.5).toFixed(1)} MB`,
      type: newResourceType
    };

    setResources(prev => [...prev, newRes]);
    setNewResourceName('');
  };

  const handleRemoveResource = (resId) => {
    setResources(prev => prev.filter(r => r.id !== resId));
  };

  const lectures = (activeCourse?.modules || []).flatMap(m => m.lessons || []);

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#B6AA9A]/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#EAE3DA] text-[#D92D2D] border border-[#B6AA9A]">
              Media Studio
            </span>
            <span className="text-xs text-[#71675D]">
              Video processing, stream transcoding & resource bundles
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#211E1A] tracking-tight mt-1">
            Lecture Content & Media Uploader
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="px-3.5 py-2 text-xs bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] font-bold focus:outline-none focus:border-[#D92D2D]"
          >
            {courses.map(c => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>

          <Link
            to={`/instructor/courses/${selectedCourseId}/curriculum`}
            className="px-4 py-2 bg-[#EAE3DA] hover:bg-[#D6D0C8] border border-[#B6AA9A] text-[#211E1A] text-xs font-bold rounded-xl transition-colors"
          >
            Curriculum Map →
          </Link>
        </div>
      </div>

      {/* Main 2-Col Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Video Uploader (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border-2 border-[#B6AA9A] rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
            <h2 className="text-base font-black text-[#211E1A] border-b border-[#B6AA9A]/50 pb-2">
              High-Definition Video Lecture Upload
            </h2>

            {/* Target Lecture Dropdown */}
            <div>
              <label htmlFor="lec-target" className="block text-xs font-bold text-[#211E1A] mb-1">
                Attach Media to Lecture <span className="text-[#D92D2D]">*</span>
              </label>
              <select
                id="lec-target"
                value={selectedLecture}
                onChange={(e) => setSelectedLecture(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] font-bold focus:outline-none focus:border-[#D92D2D]"
              >
                {lectures.map((l) => (
                  <option key={l.id} value={l.id}>
                    [{l.type}] {l.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Drag & Drop Dropzone */}
            <div
              onClick={() => handleSimulateUpload()}
              className="border-3 border-dashed border-[#B6AA9A] hover:border-[#D92D2D] bg-[#EAE3DA]/40 hover:bg-[#EAE3DA] rounded-3xl p-8 text-center cursor-pointer transition-all space-y-3"
            >
              <div className="w-16 h-16 rounded-2xl bg-white border border-[#B6AA9A] mx-auto flex items-center justify-center text-3xl shadow-2xs">
                📹
              </div>
              <div>
                <p className="font-extrabold text-sm text-[#211E1A]">
                  Click to select video or drag & drop MP4 / MOV file
                </p>
                <p className="text-xs text-[#71675D] mt-0.5">
                  Supports up to 4K resolution (H.264 / AV1) with automatic HLS adaptive streaming.
                </p>
              </div>
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold bg-white text-[#211E1A] border border-[#B6AA9A]">
                Maximum file size: 4.5 GB
              </span>
            </div>

            {/* Progress Bar Display */}
            {isUploading && (
              <div className="space-y-1.5 p-4 bg-[#EAE3DA] rounded-2xl border border-[#B6AA9A] animate-fade-in">
                <div className="flex justify-between text-xs font-bold text-[#211E1A]">
                  <span>Uploading video to LearnSpace CDN...</span>
                  <span className="text-[#D92D2D]">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-[#D6D0C8] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#D92D2D] h-full rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-[10px] text-[#71675D] text-right">Transcoding 1080p, 720p, 480p streams...</p>
              </div>
            )}

            {/* Video Player Preview */}
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-bold text-[#211E1A] uppercase tracking-wider">
                Video Playback Verification
              </h3>
              <div className="aspect-video bg-black rounded-2xl overflow-hidden relative flex items-center justify-center border border-[#B6AA9A]">
                <div className="text-center text-stone-300 space-y-2 p-4">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mx-auto text-xl">
                    ▶
                  </div>
                  <p className="text-xs font-bold">Tensors, Broadcasting, and Memory Layouts.mp4</p>
                  <span className="text-[10px] font-mono text-emerald-400">Status: Transcoded & Ready for Streaming</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Supplemental Resources & Downloads (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border-2 border-[#B6AA9A] rounded-3xl p-6 shadow-sm space-y-5">
            <h2 className="text-base font-black text-[#211E1A] border-b border-[#B6AA9A]/50 pb-2">
              Supplemental Downloadable Resources
            </h2>
            <p className="text-xs text-[#514940] leading-relaxed">
              Attach PDFs, cheatsheets, slide decks, and code archives that students can download inside the Course Player.
            </p>

            {/* Add Resource Form */}
            <form onSubmit={handleAddResource} className="space-y-3 p-4 bg-[#EAE3DA]/50 rounded-2xl border border-[#B6AA9A]">
              <div>
                <label htmlFor="res-name" className="block text-xs font-bold text-[#211E1A] mb-1">
                  Resource File Name
                </label>
                <input
                  id="res-name"
                  type="text"
                  value={newResourceName}
                  onChange={(e) => setNewResourceName(e.target.value)}
                  placeholder="e.g. pytorch-distributed-cheat-sheet.pdf"
                  required
                  className="w-full px-3 py-2 text-xs bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
                />
              </div>

              <div>
                <label htmlFor="res-type" className="block text-xs font-bold text-[#211E1A] mb-1">
                  Asset Category
                </label>
                <select
                  id="res-type"
                  value={newResourceType}
                  onChange={(e) => setNewResourceType(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
                >
                  <option value="PDF Document">PDF Document / Slides</option>
                  <option value="Source Code">Source Code Archive</option>
                  <option value="Dataset">Sample Dataset / CSV</option>
                  <option value="Cheatsheet">Summary Cheatsheet</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-[#211E1A] hover:bg-black text-white text-xs font-bold rounded-xl transition-colors shadow-2xs"
              >
                + Attach Supplemental Resource
              </button>
            </form>

            {/* List of Attached Resources */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#211E1A]">
                Current Course Attachments ({resources.length})
              </h3>

              <div className="space-y-2">
                {resources.map((res) => (
                  <div
                    key={res.id}
                    className="p-3 bg-[#EAE3DA]/60 border border-[#B6AA9A] rounded-xl flex items-center justify-between text-xs hover:bg-[#EAE3DA] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-lg">📄</span>
                      <div className="min-w-0">
                        <p className="font-bold text-[#211E1A] truncate">{res.name}</p>
                        <p className="text-[10px] text-[#71675D]">{res.type} • {res.size}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveResource(res.id)}
                      className="text-[#D92D2D] hover:text-[#B91C1C] font-bold text-xs px-2"
                      title="Remove attachment"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {uploadSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#211E1A] text-white border-2 border-emerald-500 rounded-2xl p-4 shadow-2xl flex items-center gap-3 animate-slide-up">
          <span className="text-2xl">✓</span>
          <div>
            <p className="font-extrabold text-xs">Video Uploaded & Transcoded Successfully!</p>
            <p className="text-[10px] text-stone-300">Ready for student streaming across all bandwidths.</p>
          </div>
        </div>
      )}
    </div>
  );
}
