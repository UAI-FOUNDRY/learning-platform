import React from 'react';

export default function Button({ children, type = 'button', variant = 'primary', className = '', ...props }) {
  const base = 'px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-[#D92D2D] text-white hover:bg-[#B91C1C] focus-visible:ring-[#D92D2D] focus-visible:ring-offset-[#E2DCD4]',
    secondary: 'bg-[#EAE3DA] text-[#211E1A] hover:bg-[#C8BBAA] border border-[#B6AA9A] focus-visible:ring-[#D92D2D]',
    outline: 'border border-[#B6AA9A] text-[#211E1A] hover:bg-[#EAE3DA] focus-visible:ring-[#D92D2D]',
    danger: 'bg-[#B91C1C] text-white hover:bg-[#991B1B] focus-visible:ring-[#B91C1C]'
  };

  return (
    <button type={type} className={`${base} ${variants[variant] || variants.primary} ${className}`} {...props}>
      {children}
    </button>
  );
}
