import React from 'react';

export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs">
      <div className="bg-[#EAE3DA] border border-[#B6AA9A] rounded-xl p-6 max-w-lg w-full shadow-xl text-[#211E1A] transition-colors">
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#B6AA9A]">
          <h3 className="text-lg font-semibold text-[#211E1A]">{title}</h3>
          <button
            onClick={onClose}
            className="text-[#71675D] hover:text-[#211E1A] text-xl font-bold p-1 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D]"
            aria-label="Close dialog"
          >
            &times;
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
