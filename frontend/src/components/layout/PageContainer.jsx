import React from 'react';

export default function PageContainer({ title, children, className = '' }) {
  return (
    <main className={`max-w-7xl 2xl:max-w-[1536px] mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-6 w-full ${className}`}>
      {title && <h1 className="text-[28px] sm:text-[32px] font-bold text-[#211E1A] mb-8 leading-tight tracking-tight">{title}</h1>}
      {children}
    </main>
  );
}
