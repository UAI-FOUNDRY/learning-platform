import React from 'react';

export default function CourseThumbnail({ category = 'General', title = 'Course', className = '' }) {
  const gradients = {
    'Computer Science': 'from-indigo-600 via-indigo-700 to-purple-800',
    'Software Engineering': 'from-blue-600 via-cyan-600 to-teal-700',
    'Artificial Intelligence': 'from-violet-600 via-purple-700 to-fuchsia-800',
    'Data Science': 'from-emerald-600 via-teal-700 to-cyan-800',
    'Cybersecurity': 'from-slate-800 via-slate-900 to-indigo-950',
    'Design': 'from-rose-500 via-pink-600 to-purple-700',
    default: 'from-indigo-500 via-purple-600 to-blue-700',
  };

  const bgGradient = gradients[category] || gradients.default;

  return (
    <div className={`relative w-full h-full bg-gradient-to-br ${bgGradient} flex flex-col justify-between p-4 text-white overflow-hidden ${className}`}>
      {/* Decorative ambient shapes */}
      <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
      <div className="absolute -left-6 -top-6 w-28 h-28 rounded-full bg-white/10 blur-lg pointer-events-none" />
      
      <div className="flex items-center justify-between z-10">
        <span className="text-[11px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md">
          {category}
        </span>
        <div className="w-6 h-6 rounded-md bg-white/15 flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      <div className="z-10 mt-auto">
        <p className="text-sm font-semibold line-clamp-2 text-white/95 leading-snug drop-shadow-sm">
          {title}
        </p>
      </div>
    </div>
  );
}
