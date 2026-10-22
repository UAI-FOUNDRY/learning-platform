import React, { useState } from 'react';

export default function CourseReviewModal({ isOpen, onClose, courseTitle, onSubmitted }) {
  const [rating, setRating] = useState(5);
  const [headline, setHeadline] = useState('Outstanding course with realistic coding exercises!');
  const [reviewBody, setReviewBody] = useState(
    'The integrated coding workspace and test evaluation gave me immediate feedback. The explanations on autograd and computational graphs were crystal clear.'
  );
  const [selectedTags, setSelectedTags] = useState(['Rigorous Coding Challenges', 'Clear Theory']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const availableTags = [
    'Rigorous Coding Challenges',
    'Clear Theory',
    'Practical Examples',
    'Responsive Faculty',
    'Industry Relevant',
    'Great Subtitles'
  ];

  const handleToggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(prev => prev.filter(t => t !== tag));
    } else {
      setSelectedTags(prev => [...prev, tag]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setSuccess(true);
      if (onSubmitted) onSubmitted({ rating, headline, reviewBody, tags: selectedTags });
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in font-sans">
      <div className="bg-white border-2 border-[#B6AA9A] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-scale-in my-8">
        <div className="flex items-center justify-between border-b border-[#B6AA9A]/50 pb-3">
          <div>
            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded bg-[#EAE3DA] text-[#211E1A] border border-[#B6AA9A]">
              Course Evaluation
            </span>
            <h2 className="text-lg font-black text-[#211E1A] mt-1">
              Rate & Review: {courseTitle}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[#71675D] hover:text-[#211E1A] text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center space-y-3 animate-scale-in">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 mx-auto flex items-center justify-center text-3xl">
              ✓
            </div>
            <h3 className="text-lg font-black text-[#211E1A]">Thank You for Your Feedback!</h3>
            <p className="text-xs text-[#514940]">Your review has been published to help future scholars.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Star Rating Picker */}
            <div className="text-center space-y-1">
              <label className="block text-xs font-bold text-[#211E1A]">
                Your Overall Rating:
              </label>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="text-2xl transition-transform hover:scale-125 focus:outline-none"
                  >
                    <span className={star <= rating ? 'text-amber-500' : 'text-stone-300'}>
                      ★
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] font-bold text-[#71675D]">
                {rating === 5 ? '5.0 Stars (Exceptional)' : `${rating}.0 Stars`}
              </p>
            </div>

            {/* Review Headline */}
            <div>
              <label htmlFor="rev-headline" className="block text-xs font-bold text-[#211E1A] mb-1">
                Review Headline <span className="text-[#D92D2D]">*</span>
              </label>
              <input
                id="rev-headline"
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] font-semibold focus:outline-none focus:border-[#D92D2D]"
              />
            </div>

            {/* Review Body */}
            <div>
              <label htmlFor="rev-body" className="block text-xs font-bold text-[#211E1A] mb-1">
                Detailed Experience & Review
              </label>
              <textarea
                id="rev-body"
                value={reviewBody}
                onChange={(e) => setReviewBody(e.target.value)}
                rows={3}
                required
                className="w-full p-2.5 text-xs bg-white border border-[#B6AA9A] rounded-xl text-[#211E1A] focus:outline-none focus:border-[#D92D2D]"
              />
            </div>

            {/* Topic Chips */}
            <div>
              <label className="block text-xs font-bold text-[#211E1A] mb-1.5">
                Highlights:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {availableTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                        isSelected
                          ? 'bg-[#211E1A] text-white border-[#211E1A]'
                          : 'bg-[#EAE3DA] text-[#514940] border-[#B6AA9A] hover:text-[#211E1A]'
                      }`}
                    >
                      {isSelected ? `✓ ${tag}` : `+ ${tag}`}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-[#514940] hover:text-[#211E1A]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-[#D92D2D] hover:bg-[#B91C1C] text-white rounded-xl text-xs font-extrabold transition-all shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {isSubmitting ? 'Publishing Review...' : 'Submit Course Review'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
