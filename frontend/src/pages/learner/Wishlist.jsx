import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { learnerService } from '../../services/learnerService';

export default function Wishlist() {
  const navigate = useNavigate();
  const [wishlist, setWishlist] = useState(() => learnerService.getWishlist());
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    return learnerService.subscribe((state) => {
      setWishlist(state.wishlist || []);
    });
  }, []);

  const handleEnroll = (course) => {
    learnerService.enrollCourse(course);
    setToastMessage(`Enrolled in "${course.title}"! Redirecting to course player...`);
    setTimeout(() => {
      navigate(`/learner/player/${course.id}`);
    }, 1200);
  };

  const handleRemove = (courseId) => {
    learnerService.removeFromWishlist(courseId);
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#B6AA9A]/60 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#211E1A] tracking-tight">
            Saved Courses & Wishlist
          </h1>
          <p className="text-xs sm:text-sm text-[#514940] mt-1">
            Programs you’ve bookmarked for upcoming terms or independent study.
          </p>
        </div>

        <Link
          to="/courses"
          className="px-4 py-2.5 rounded-xl bg-[#211E1A] hover:bg-black text-white font-extrabold text-xs transition-colors flex items-center justify-center gap-2 self-start sm:self-auto shadow-2xs"
        >
          <span>Explore More Courses</span>
          <span>→</span>
        </Link>
      </div>

      {/* Wishlist Grid */}
      {wishlist.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlist.map((course) => (
            <div
              key={course.id}
              className="bg-white border-2 border-[#B6AA9A] rounded-3xl overflow-hidden shadow-sm hover-lift flex flex-col justify-between"
            >
              <div className="h-44 bg-[#C8BBAA] relative overflow-hidden group">
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A]">
                    {course.category}
                  </span>
                </div>
                <div className="absolute top-3 right-3">
                  <button
                    type="button"
                    onClick={() => handleRemove(course.id)}
                    className="w-8 h-8 rounded-full bg-white/90 text-red-600 hover:bg-white flex items-center justify-center text-xs shadow-xs transition-transform hover:scale-110"
                    title="Remove from wishlist"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-[#211E1A] line-clamp-1">
                    {course.title}
                  </h3>
                  <p className="text-xs text-[#514940] mt-1 line-clamp-2 leading-relaxed">
                    {course.description}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-[#71675D]">
                  <span className="font-bold text-[#211E1A]">{course.instructor}</span>
                  <span className="flex items-center gap-1 font-bold text-amber-800">
                    <span>★</span>
                    <span>{course.rating || 4.9}</span>
                  </span>
                </div>

                <div className="pt-2 border-t border-[#B6AA9A]/40 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleEnroll(course)}
                    className="flex-1 py-2.5 px-3 bg-[#D92D2D] hover:bg-[#B91C1C] text-white rounded-xl text-xs font-black transition-all shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <span>Enroll Now (Free)</span>
                    <span>→</span>
                  </button>

                  <Link
                    to={`/courses/${course.id}`}
                    className="p-2.5 bg-[#EAE3DA] hover:bg-[#D6D0C8] border border-[#B6AA9A] rounded-xl text-xs font-bold text-[#211E1A]"
                    title="View syllabus details"
                  >
                    👁️
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white border-2 border-[#B6AA9A] rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#EAE3DA] text-[#211E1A] mx-auto flex items-center justify-center text-3xl">
            💖
          </div>
          <h3 className="text-lg font-black text-[#211E1A]">
            Your Wishlist is Empty
          </h3>
          <p className="text-xs text-[#514940] max-w-sm mx-auto">
            Explore our comprehensive curriculum catalog to bookmark cutting-edge AI, Systems, and Engineering courses.
          </p>
          <div className="pt-2">
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#211E1A] hover:bg-black text-white text-xs font-black transition-colors shadow-sm"
            >
              <span>Discover Courses</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#211E1A] text-white border-2 border-emerald-500 rounded-2xl p-4 shadow-2xl flex items-center gap-3 animate-slide-up">
          <span className="text-2xl">⚡</span>
          <p className="font-extrabold text-xs">{toastMessage}</p>
        </div>
      )}
    </div>
  );
}
