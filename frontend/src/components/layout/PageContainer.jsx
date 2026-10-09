import React from 'react';

export default function PageContainer({ title, children }) {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {title && <h1 className="text-2xl font-bold text-gray-900 mb-6">{title}</h1>}
      {children}
    </main>
  );
}
