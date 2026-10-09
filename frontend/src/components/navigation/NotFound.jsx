import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
      <h1 className="text-4xl font-bold text-gray-900">404</h1>
      <p className="text-gray-600 mt-2">Page Not Found</p>
      <Link to="/" className="mt-4 text-blue-600 hover:underline">Return Home</Link>
    </div>
  );
}
