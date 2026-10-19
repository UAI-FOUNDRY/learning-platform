import React from 'react';

export default function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label className="text-sm font-medium text-[#211E1A]">
          {label}
        </label>
      )}
      <input
        className={`px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#D92D2D] bg-[#EAE3DA] border-[#B6AA9A] text-[#211E1A] placeholder-[#71675D] transition-colors ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-[#B91C1C]">{error}</span>}
    </div>
  );
}
