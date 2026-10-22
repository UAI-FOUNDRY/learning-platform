import React from 'react';

export default function PageContainer({ title, subtitle, className = '', children }) {
  return (
    <main className={`max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 w-full ${className}`}>
      {title && (
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-burgundy tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-base sm:text-lg text-brown-soft leading-relaxed max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </main>
  );
}
